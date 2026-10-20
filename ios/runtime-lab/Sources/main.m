#import <UIKit/UIKit.h>
#include <TargetConditionals.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <resolv.h>
#include <sys/wait.h>
#include <unistd.h>
#include "embed/ffi.h"
#include "RuntimeSupport.h"

@interface LabController : UIViewController
@property UITextView *output;
@property UITextField *input;
@property UILabel *status;
@property UIButton *sendButton;
@property int inputFD;
@property(nonatomic, strong) dispatch_queue_t inputQueue;
@property BOOL probe;
@property BOOL guestExited;
@property BOOL outputEnded;
@property int exitCode;
@property NSString *tier;
@property NSURL *documents;
@property NSFileHandle *capture;
@property NSTimeInterval started;
- (void)finishIfReady;
@end

static LabController *controller;

static void guestExit(int status) {
    int code = WIFEXITED(status) ? WEXITSTATUS(status) : 128 + WTERMSIG(status);
    dispatch_async(dispatch_get_main_queue(), ^{
        controller.guestExited = YES;
        controller.exitCode = code;
        [controller finishIfReady];
    });
}

static int installText(NSString *path, NSData *data) {
    return ish_ffi_install_executable(path.UTF8String, data.bytes, data.length);
}

static NSData *packedStrings(NSArray<NSString *> *strings) {
    NSMutableData *packed = [NSMutableData data];
    for (NSString *string in strings) {
        [packed appendData:[string dataUsingEncoding:NSUTF8StringEncoding]];
        [packed appendBytes:"" length:1];
    }
    [packed appendBytes:"" length:1];
    return packed;
}

static NSString *resolverConfiguration(void) {
    struct __res_state resolver = {0};
    NSMutableString *configuration = [NSMutableString new];
    if (res_ninit(&resolver) == 0) {
        union res_sockaddr_union servers[NI_MAXSERV];
        int count = res_getservers(&resolver, servers, NI_MAXSERV);
        for (int i = 0; i < count; i++) {
            char address[NI_MAXHOST];
            struct sockaddr *socket = (struct sockaddr *)&servers[i];
            if (socket->sa_len && getnameinfo(socket, socket->sa_len, address, sizeof(address),
                                              NULL, 0, NI_NUMERICHOST) == 0) {
                [configuration appendFormat:@"nameserver %s\n", address];
            }
        }
        res_ndestroy(&resolver);
    }
    return configuration;
}

@implementation LabController
- (void)viewDidLoad {
    [super viewDidLoad];
    self.inputFD = -1;
    self.inputQueue = dispatch_queue_create("app.bibimer.runtime-lab.input", DISPATCH_QUEUE_SERIAL);
    self.view.backgroundColor = UIColor.systemBackgroundColor;
    self.title = @"Bibimer Runtime Lab";
    self.status = [UILabel new];
    self.status.text = @"Preparing local Linux…";
    self.status.font = [UIFont preferredFontForTextStyle:UIFontTextStyleFootnote];
    self.status.numberOfLines = 0;
    self.output = [UITextView new];
    self.output.editable = NO;
    self.output.font = [UIFont monospacedSystemFontOfSize:12 weight:UIFontWeightRegular];
    self.output.accessibilityIdentifier = @"runtimeOutput";
    self.input = [UITextField new];
    self.input.borderStyle = UITextBorderStyleRoundedRect;
    self.input.placeholder = @"Linux command";
    self.input.autocorrectionType = UITextAutocorrectionTypeNo;
    self.input.autocapitalizationType = UITextAutocapitalizationTypeNone;
    self.input.accessibilityIdentifier = @"commandInput";
    self.sendButton = [UIButton buttonWithType:UIButtonTypeSystem];
    [self.sendButton setTitle:@"Run" forState:UIControlStateNormal];
    [self.sendButton addTarget:self action:@selector(sendCommand) forControlEvents:UIControlEventTouchUpInside];
    self.sendButton.enabled = NO;
    UIStackView *row = [[UIStackView alloc] initWithArrangedSubviews:@[self.input, self.sendButton]];
    row.spacing = 12;
    [self.sendButton setContentHuggingPriority:UILayoutPriorityRequired forAxis:UILayoutConstraintAxisHorizontal];
    UIStackView *stack = [[UIStackView alloc] initWithArrangedSubviews:@[self.status, self.output, row]];
    stack.axis = UILayoutConstraintAxisVertical;
    stack.spacing = 12;
    stack.translatesAutoresizingMaskIntoConstraints = NO;
    [self.view addSubview:stack];
    [NSLayoutConstraint activateConstraints:@[
        [stack.topAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.topAnchor constant:12],
        [stack.leadingAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.leadingAnchor constant:16],
        [stack.trailingAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.trailingAnchor constant:-16],
        [stack.bottomAnchor constraintEqualToAnchor:self.view.keyboardLayoutGuide.topAnchor constant:-12],
        [row.heightAnchor constraintGreaterThanOrEqualToConstant:44]
    ]];
    NSArray *arguments = NSProcessInfo.processInfo.arguments;
    self.probe = [arguments containsObject:@"--probe"];
    NSUInteger tierIndex = [arguments indexOfObject:@"--tier"];
    self.tier = tierIndex != NSNotFound && tierIndex + 1 < arguments.count ? arguments[tierIndex + 1] : @"basic";
    self.documents = [NSFileManager.defaultManager URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask].firstObject;
    if (self.probe) {
        [NSFileManager.defaultManager removeItemAtURL:[self.documents URLByAppendingPathComponent:@"probe-result.json"] error:nil];
        NSURL *path = [self.documents URLByAppendingPathComponent:@"probe-output.txt"];
        [NSFileManager.defaultManager createFileAtPath:path.path contents:nil attributes:nil];
        self.capture = [NSFileHandle fileHandleForWritingToURL:path error:nil];
    }
    self.started = NSProcessInfo.processInfo.systemUptime;
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{ [self boot]; });
}

- (void)failBoot:(NSString *)message {
    dispatch_async(dispatch_get_main_queue(), ^{
        self.status.text = message;
        self.output.text = [self.output.text stringByAppendingFormat:@"\n%@\n", message];
        self.guestExited = YES;
        self.outputEnded = YES;
        self.exitCode = 125;
        [self finishIfReady];
    });
}

- (void)boot {
    @autoreleasepool {
        NSFileManager *manager = NSFileManager.defaultManager;
        NSURL *support = [manager URLsForDirectory:NSApplicationSupportDirectory inDomains:NSUserDomainMask].firstObject;
        NSURL *root = [support URLByAppendingPathComponent:@"rootfs"];
        NSError *error;
        if (![manager createDirectoryAtURL:support withIntermediateDirectories:YES attributes:nil error:&error]) {
            [self failBoot:error.localizedDescription]; return;
        }
        if (![manager fileExistsAtPath:root.path]) {
            NSURL *staging = [support URLByAppendingPathComponent:@"rootfs-staging"];
            [manager removeItemAtURL:staging error:nil];
            if (![manager copyItemAtURL:[NSBundle.mainBundle URLForResource:@"rootfs" withExtension:nil] toURL:staging error:&error] ||
                ![manager moveItemAtURL:staging toURL:root error:&error]) {
                [self failBoot:error.localizedDescription]; return;
            }
        }
        [root setResourceValue:@YES forKey:NSURLIsExcludedFromBackupKey error:nil];
        int rc = ish_ffi_mount_fakefs([root URLByAppendingPathComponent:@"data"].fileSystemRepresentation);
        if (rc == 0) rc = ish_ffi_become_init();
        if (rc == 0) rc = bibimer_prepare_devices();
        if (rc == 0) rc = ish_ffi_mount_procfs();
        if (rc == 0) rc = ish_ffi_mount_devpts();
        if (rc < 0) { [self failBoot:[NSString stringWithFormat:@"Linux initialization failed: %d", rc]]; return; }
        extern const char *sock_tmp_prefix;
        sock_tmp_prefix = strdup([NSTemporaryDirectory() stringByAppendingPathComponent:@"guest-socket"].UTF8String);
        NSString *dns = resolverConfiguration();
        if (!dns.length) { [self failBoot:@"No system DNS configuration available"]; return; }
        rc = installText(@"/etc/resolv.conf", [dns dataUsingEncoding:NSUTF8StringEncoding]);
        if (rc == 0) {
            NSData *nodeHTTP = [NSData dataWithContentsOfURL:[NSBundle.mainBundle URLForResource:@"wasm-polyfill" withExtension:@"js"]];
            rc = nodeHTTP ? installText(@"/lib/wasm-polyfill.js", nodeHTTP) : -2;
        }
        if (rc == 0 && self.probe) {
            NSData *script = [NSData dataWithContentsOfURL:[NSBundle.mainBundle URLForResource:@"probe" withExtension:@"sh"]];
            rc = script ? installText(@"/bibimer-probe.sh", script) : -2;
            for (NSString *name in @[@"agent-runtime", @"extra-agents", @"kernel-runtime", @"bridge-pty", @"node-network", @"provider_gemini", @"probe-gemini-acp", @"epoll-runtime", @"compute-signal", @"bun-math", @"arm64-fp", @"memory-fault", @"signal-stack", @"probe-bun-process", @"probe-claude-sdk", @"probe-opencode-provider", @"probe-opencode-shell-edges", @"opencode-compat", @"provider_opencode"]) {
                if (rc != 0) break;
                NSData *agentProbe = [NSData dataWithContentsOfURL:[NSBundle.mainBundle URLForResource:name withExtension:@"py"]];
                rc = agentProbe ? installText([NSString stringWithFormat:@"/%@.py", name], agentProbe) : -2;
            }
        }
        if (rc == 0 && self.probe) {
            NSData *provider = [NSData dataWithContentsOfURL:[NSBundle.mainBundle URLForResource:@"provider_claude" withExtension:@"mjs"]];
            rc = provider ? installText(@"/provider_claude.mjs", provider) : -2;
        }
        if (rc == 0 && self.probe) {
            NSData *retention = [NSData dataWithContentsOfURL:[NSBundle.mainBundle URLForResource:@"experimental-stdio-retention" withExtension:@"cjs"]];
            rc = retention ? installText(@"/experimental-stdio-retention.cjs", retention) : -2;
        }
        if (rc == 0 && self.probe) {
            NSData *trace = [NSData dataWithContentsOfURL:[NSBundle.mainBundle URLForResource:@"stdio-retention-trace" withExtension:@"cjs"]];
            rc = trace ? installText(@"/stdio-retention-trace.cjs", trace) : -2;
        }
        int input[2] = {-1, -1}, output[2] = {-1, -1};
        if (rc < 0 || pipe(input) || pipe(output)) { [self failBoot:@"Could not prepare guest I/O"]; return; }
        rc = ish_ffi_install_pipe_stdio(input[0], output[1], dup(output[1]));
        if (rc < 0) { [self failBoot:@"Could not install guest I/O"]; return; }
        self.inputFD = input[1];
        ish_ffi_chdir("/root");
        NSArray *args = @[@"/bin/sh"];
        NSArray *env = @[@"HOME=/root", @"PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
                        @"TERM=dumb", @"LANG=C.UTF-8", @"OPENSSL_armcap=0", @"NO_COLOR=1",
                        @"PYTHONMALLOC=malloc", @"PYTHONDONTWRITEBYTECODE=1", @"GODEBUG=asyncpreemptoff=1",
                        [@"BIBIMER_PROBE_TIER=" stringByAppendingString:self.tier]];
        NSData *argv = packedStrings(args), *envp = packedStrings(env);
        rc = ish_ffi_execve("/bin/sh", args.count, argv.bytes, env.count, envp.bytes);
        if (rc < 0) { [self failBoot:[NSString stringWithFormat:@"Guest exec failed: %d", rc]]; return; }
        ish_ffi_register_exit_hook(guestExit);
        int outputFD = output[0];
        dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
            char bytes[4096];
            ssize_t count;
            while ((count = read(outputFD, bytes, sizeof(bytes))) != 0) {
                if (count < 0) { if (errno == EINTR) continue; break; }
                NSData *data = [NSData dataWithBytes:bytes length:(NSUInteger)count];
                dispatch_async(dispatch_get_main_queue(), ^{
                    [self.capture writeData:data];
                    NSString *text = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                    if (!text) text = [[NSString alloc] initWithData:data encoding:NSISOLatin1StringEncoding];
                    NSString *combined = [self.output.text stringByAppendingString:text ?: @""];
                    if (combined.length > 100000) combined = [combined substringFromIndex:combined.length - 100000];
                    self.output.text = combined;
                    [self.output scrollRangeToVisible:NSMakeRange(self.output.text.length, 0)];
                });
            }
            close(outputFD);
            dispatch_async(dispatch_get_main_queue(), ^{ self.outputEnded = YES; [self finishIfReady]; });
        });
        ish_ffi_task_start();
        // Exercise the same native stdin transport used by the Run button.
        if (self.probe) [self enqueueCommand:@"exec /bin/sh /bibimer-probe.sh"];
        dispatch_async(dispatch_get_main_queue(), ^{
            self.status.text = self.probe ? [@"Running probe: " stringByAppendingString:self.tier] : @"Local ARM64 Linux · command runner (no PTY)";
            self.sendButton.enabled = !self.probe;
        });
    }
}

- (void)sendCommand {
    if (self.inputFD < 0 || !self.input.text.length) return;
    NSString *command = self.input.text;
    self.input.text = @"";
    self.output.text = [self.output.text stringByAppendingFormat:@"$ %@\n", command];
    [self enqueueCommand:command];
}

- (void)enqueueCommand:(NSString *)command {
    NSData *data = [[command stringByAppendingString:@"\n"] dataUsingEncoding:NSUTF8StringEncoding];
    int fd = self.inputFD;
    dispatch_async(self.inputQueue, ^{
        const char *bytes = data.bytes;
        size_t offset = 0;
        while (offset < data.length) {
            ssize_t count = write(fd, bytes + offset, data.length - offset);
            if (count < 0 && errno == EINTR) continue;
            if (count <= 0) break;
            offset += (size_t)count;
        }
    });
}

- (void)finishIfReady {
    if (!self.guestExited || !self.outputEnded) return;
    self.sendButton.enabled = NO;
    if (self.inputFD >= 0) {
        int fd = self.inputFD;
        self.inputFD = -1;
        dispatch_async(self.inputQueue, ^{ close(fd); });
    }
    [self.capture synchronizeFile];
    [self.capture closeFile];
    self.capture = nil;
    self.status.text = [NSString stringWithFormat:@"Linux exited: %d · relaunch app to restart", self.exitCode];
    if (self.probe) {
        NSDictionary *result = @{@"exitCode": @(self.exitCode), @"tier": self.tier,
                                 @"durationSeconds": @(NSProcessInfo.processInfo.systemUptime - self.started),
                                 @"execution": @"embedded-arm64-linux",
                                 @"host": TARGET_OS_SIMULATOR ? @"ios-simulator" : @"ios-device"};
        NSData *json = [NSJSONSerialization dataWithJSONObject:result options:NSJSONWritingPrettyPrinted error:nil];
        [json writeToURL:[self.documents URLByAppendingPathComponent:@"probe-result.json"] atomically:YES];
    }
}
@end

@interface AppDelegate : UIResponder <UIApplicationDelegate>
@property(nonatomic, strong) UIWindow *window;
@end
@implementation AppDelegate
- (BOOL)application:(UIApplication *)app didFinishLaunchingWithOptions:(NSDictionary *)options {
    self.window = [[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];
    controller = [LabController new];
    self.window.rootViewController = [[UINavigationController alloc] initWithRootViewController:controller];
    [self.window makeKeyAndVisible];
    return YES;
}
@end

int main(int argc, char **argv) {
    @autoreleasepool { return UIApplicationMain(argc, argv, nil, NSStringFromClass(AppDelegate.class)); }
}
