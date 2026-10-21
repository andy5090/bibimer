#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <resolv.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include <unistd.h>
#include <TargetConditionals.h>
#include "embed/ffi.h"
#include "RuntimeSupport.h"

extern int bibimer_create_directory(const char *path);

@interface BibimerController : UIViewController <WKScriptMessageHandler, WKNavigationDelegate, NSURLSessionTaskDelegate>
@property WKWebView *web;
@property UILabel *status;
@property UITextView *bootstrapOutput;
@property NSString *token;
@property NSInteger port;
@property NSURLSession *http;
@property NSMutableSet<NSURLSessionDataTask *> *polls;
@property BOOL exited;
@property BOOL ready;
@property NSUInteger healthAttempts;
@property NSMutableData *utf8Pending;
@property NSMutableArray<NSString *> *javascriptErrors;
@property NSString *smokeScript;
@property NSString *smokeResultName;
@property NSString *testClipboard;
@property NSURL *documents;
@property(nonatomic,strong) dispatch_queue_t runtimeQueue;
@property BOOL openingFile;
@property NSURL *exportDirectory;
@property NSURL *exportFile;
@property NSFileHandle *exportStream;
@property NSString *exportTransfer;
@property NSString *exportRequest;
@property unsigned long long exportSize;
@property unsigned long long exportOffset;
- (void)boot;
- (void)checkHealth;
- (void)fail:(NSString *)message;
@end

static BibimerController *activeController;

static NSData *packedStrings(NSArray<NSString *> *strings) {
    NSMutableData *data = [NSMutableData data];
    for (NSString *string in strings) {
        [data appendData:[string dataUsingEncoding:NSUTF8StringEncoding]];
        [data appendBytes:"" length:1];
    }
    [data appendBytes:"" length:1];
    return data;
}

static NSString *jsonString(id object) {
    NSData *data = [NSJSONSerialization dataWithJSONObject:object options:NSJSONWritingFragmentsAllowed error:nil];
    return data ? [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] : @"null";
}

static NSString *systemLanguage(void) {
    for (NSString *language in NSLocale.preferredLanguages) {
        if ([language hasPrefix:@"zh"]) {
            if ([language containsString:@"Hans"]) return @"zh-Hans";
            return ([language containsString:@"Hant"] || [language containsString:@"TW"] || [language containsString:@"HK"] || [language containsString:@"MO"]) ? @"zh-Hant" : @"zh-Hans";
        }
        if ([language hasPrefix:@"pt"]) return @"pt-BR";
        for (NSString *supported in @[@"en",@"ko",@"es",@"id",@"ja",@"fr",@"de"])
            if ([language isEqual:supported] || [language hasPrefix:[supported stringByAppendingString:@"-"]]) return supported;
    }
    return @"en";
}

static NSString *dnsConfiguration(void) {
    struct __res_state resolver = {0};
    NSMutableString *text = [NSMutableString new];
    if (res_ninit(&resolver) == 0) {
        union res_sockaddr_union servers[NI_MAXSERV];
        int count = res_getservers(&resolver, servers, NI_MAXSERV);
        for (int i = 0; i < count; i++) {
            char address[NI_MAXHOST];
            struct sockaddr *socket = (struct sockaddr *)&servers[i];
            if (socket->sa_len && getnameinfo(socket,socket->sa_len,address,sizeof(address),NULL,0,NI_NUMERICHOST) == 0)
                [text appendFormat:@"nameserver %s\n",address];
        }
        res_ndestroy(&resolver);
    }
    return text;
}

static NSInteger availablePort(void) {
    int fd = socket(AF_INET,SOCK_STREAM,0);
    if (fd < 0) return 0;
    struct sockaddr_in address = {.sin_len = sizeof(struct sockaddr_in),.sin_family = AF_INET,.sin_addr.s_addr = htonl(INADDR_LOOPBACK)};
    socklen_t length = sizeof(address);
    NSInteger result = 0;
    if (bind(fd,(struct sockaddr *)&address,sizeof(address)) == 0 && getsockname(fd,(struct sockaddr *)&address,&length) == 0) result = ntohs(address.sin_port);
    close(fd);
    return result;
}

static void guestExit(int status) {
    int code = WIFEXITED(status) ? WEXITSTATUS(status) : 128 + WTERMSIG(status);
    dispatch_async(dispatch_get_main_queue(), ^{
        activeController.exited = YES;
        [activeController fail:[NSString stringWithFormat:@"Local Linux stopped (code %d). Reopen Bibimer to start it again. Saved project files are kept.",code]];
    });
}

@implementation BibimerController
- (void)viewDidLoad {
    [super viewDidLoad];
    self.view.backgroundColor = [UIColor colorWithRed:14/255.0 green:18/255.0 blue:21/255.0 alpha:1];
    self.status = [UILabel new]; self.status.numberOfLines = 0;
    self.status.textColor = UIColor.whiteColor;
    self.status.text = [systemLanguage() isEqual:@"ko"] ? @"BIBIMER · 내장 Linux 환경 준비 중…\n처음 실행할 때는 개발 도구를 내려받습니다." : @"BIBIMER · Preparing local Linux…\nDevelopment tools download on first launch.";
    self.bootstrapOutput = [UITextView new]; self.bootstrapOutput.editable = NO;
    self.bootstrapOutput.backgroundColor = UIColor.clearColor; self.bootstrapOutput.textColor = UIColor.lightGrayColor;
    self.bootstrapOutput.font = [UIFont monospacedSystemFontOfSize:11 weight:UIFontWeightRegular];
    UIStackView *stack = [[UIStackView alloc] initWithArrangedSubviews:@[self.status,self.bootstrapOutput]];
    stack.axis = UILayoutConstraintAxisVertical; stack.spacing = 16; stack.translatesAutoresizingMaskIntoConstraints = NO;
    [self.view addSubview:stack];
    [NSLayoutConstraint activateConstraints:@[
        [stack.topAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.topAnchor constant:24],
        [stack.bottomAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.bottomAnchor constant:-16],
        [stack.leadingAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.leadingAnchor constant:20],
        [stack.trailingAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.trailingAnchor constant:-20]
    ]];
    self.documents = [NSFileManager.defaultManager URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask].firstObject;
    NSURL *staleExports = [[NSURL fileURLWithPath:NSTemporaryDirectory() isDirectory:YES] URLByAppendingPathComponent:@"bibimer-exports" isDirectory:YES];
    [NSFileManager.defaultManager removeItemAtURL:staleExports error:nil];
    self.polls = [NSMutableSet new]; self.javascriptErrors = [NSMutableArray new];
    self.utf8Pending = [NSMutableData new];
    self.runtimeQueue = dispatch_queue_create("app.bibimer.ios.runtime",DISPATCH_QUEUE_SERIAL);
    self.port = availablePort();
    NSMutableData *random = [NSMutableData dataWithLength:32];
    arc4random_buf(random.mutableBytes,random.length);
    NSMutableString *token = [NSMutableString new];
    for (NSUInteger i = 0; i < random.length; i++) [token appendFormat:@"%02x",((unsigned char *)random.bytes)[i]];
    self.token = token;
    NSURLSessionConfiguration *configuration = NSURLSessionConfiguration.ephemeralSessionConfiguration;
    configuration.timeoutIntervalForRequest = 33; configuration.timeoutIntervalForResource = 180;
    configuration.HTTPMaximumConnectionsPerHost = 12;
    configuration.requestCachePolicy = NSURLRequestReloadIgnoringLocalCacheData;
    self.http = [NSURLSession sessionWithConfiguration:configuration delegate:self delegateQueue:nil];
    NSArray *args = NSProcessInfo.processInfo.arguments;
    BOOL agentTest = [args containsObject:@"--agent-self-test"];
    if (agentTest || [args containsObject:@"--self-test"]) {
        self.smokeResultName = agentTest ? @"agent-test.json" : @"ui-test.json";
        self.smokeScript = [NSString stringWithContentsOfURL:[NSBundle.mainBundle URLForResource:agentTest ? @"agents-smoke" : @"smoke" withExtension:@"js"] encoding:NSUTF8StringEncoding error:nil];
        [NSFileManager.defaultManager removeItemAtURL:[self.documents URLByAppendingPathComponent:self.smokeResultName] error:nil];
        [NSFileManager.defaultManager removeItemAtURL:[self.documents URLByAppendingPathComponent:@"test-progress.json"] error:nil];
    }
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(becameActive) name:UIApplicationDidBecomeActiveNotification object:nil];
    dispatch_async(self.runtimeQueue, ^{ [self boot]; });
}

- (void)becameActive {
    if (self.ready && !self.exited) [self.web evaluateJavaScript:@"window.BibimerResume?.()" completionHandler:nil];
}

- (void)fail:(NSString *)message {
    dispatch_async(dispatch_get_main_queue(), ^{
        self.status.text = message; self.web.hidden = YES;
        self.bootstrapOutput.hidden = NO; self.status.hidden = NO;
        if (self.smokeScript) [self writeSmoke:@{@"ok":@NO,@"error":message,@"checks":@[]}];
    });
}

- (void)boot {
    @autoreleasepool {
        NSFileManager *manager = NSFileManager.defaultManager;
        NSURL *support = [manager URLsForDirectory:NSApplicationSupportDirectory inDomains:NSUserDomainMask].firstObject;
        NSURL *root = [support URLByAppendingPathComponent:@"linux-rootfs"];
        NSError *error = nil;
        if (![manager createDirectoryAtURL:support withIntermediateDirectories:YES attributes:nil error:&error]) { [self fail:error.localizedDescription]; return; }
        if (![manager fileExistsAtPath:root.path]) {
            NSURL *staging = [support URLByAppendingPathComponent:@"rootfs-installing"];
            [manager removeItemAtURL:staging error:nil];
            if (![manager copyItemAtURL:[NSBundle.mainBundle URLForResource:@"rootfs" withExtension:nil] toURL:staging error:&error] || ![manager moveItemAtURL:staging toURL:root error:&error]) { [self fail:error.localizedDescription]; return; }
        }
        [root setResourceValue:@YES forKey:NSURLIsExcludedFromBackupKey error:nil];
        int rc = ish_ffi_mount_fakefs([root URLByAppendingPathComponent:@"data"].fileSystemRepresentation);
        if (rc == 0) rc = ish_ffi_become_init();
        if (rc == 0) rc = bibimer_prepare_devices();
        if (rc == 0) rc = ish_ffi_mount_procfs();
        if (rc == 0) rc = ish_ffi_mount_devpts();
        if (rc < 0) { [self fail:[NSString stringWithFormat:@"Linux initialization failed: %d",rc]]; return; }
        extern const char *sock_tmp_prefix;
        sock_tmp_prefix = strdup([NSTemporaryDirectory() stringByAppendingPathComponent:@"linux-socket"].UTF8String);
        for (NSString *directory in @[@"/opt",@"/opt/bibimer",@"/opt/bibimer/bridge",@"/opt/bibimer/ios"]) {
            rc = bibimer_create_directory(directory.UTF8String);
            if (rc < 0) { [self fail:[NSString stringWithFormat:@"Could not prepare %@ (code %d).",directory,rc]]; return; }
        }
        NSString *dns = dnsConfiguration();
        if (rc == 0 && dns.length) { NSData *data = [dns dataUsingEncoding:NSUTF8StringEncoding]; rc = ish_ffi_install_executable("/etc/resolv.conf",data.bytes,data.length); }
        NSURL *resources = [NSBundle.mainBundle URLForResource:@"Guest" withExtension:nil];
        NSDirectoryEnumerator *files = [manager enumeratorAtURL:resources includingPropertiesForKeys:@[NSURLIsDirectoryKey] options:0 errorHandler:nil];
        for (NSURL *file in files) {
            BOOL directory = NO;
            [manager fileExistsAtPath:file.path isDirectory:&directory];
            NSString *relative = [file.path substringFromIndex:resources.path.length];
            while ([relative hasPrefix:@"/"]) relative = [relative substringFromIndex:1];
            NSString *guest = [@"/opt/bibimer/" stringByAppendingString:relative];
            if (directory) rc = bibimer_create_directory(guest.UTF8String);
            else { NSData *data = [NSData dataWithContentsOfURL:file]; rc = data ? ish_ffi_install_executable(guest.UTF8String,data.bytes,data.length) : -2; }
            if (rc < 0) { [self fail:[NSString stringWithFormat:@"Could not install bundled resource %@ (code %d).",relative,rc]]; return; }
        }
        if (rc < 0 || !self.port) { [self fail:[NSString stringWithFormat:@"Could not prepare local bridge (code %d, port %ld).",rc,(long)self.port]]; return; }
        int input[2], output[2];
        if (pipe(input) || pipe(output)) { [self fail:@"Could not prepare Linux I/O."]; return; }
        rc = ish_ffi_install_pipe_stdio(input[0],output[1],dup(output[1]));
        close(input[1]);
        if (rc < 0) { [self fail:@"Could not install Linux I/O."]; return; }
        ish_ffi_chdir("/root");
        NSArray *args = @[@"/bin/sh",@"/opt/bibimer/ios/bootstrap.sh"];
        NSArray *env = @[@"HOME=/root",@"PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",@"TERM=xterm-256color",@"LANG=C.UTF-8",@"OPENSSL_armcap=0",@"PYTHONMALLOC=malloc",@"PYTHONDONTWRITEBYTECODE=1",@"GODEBUG=asyncpreemptoff=1",[@"BIBIMER_TOKEN=" stringByAppendingString:self.token],[@"BIBIMER_PORT=" stringByAppendingFormat:@"%ld",(long)self.port]];
        NSData *argv = packedStrings(args), *envp = packedStrings(env);
        rc = ish_ffi_execve("/bin/sh",args.count,argv.bytes,env.count,envp.bytes);
        if (rc < 0) { [self fail:[NSString stringWithFormat:@"Linux start failed: %d",rc]]; return; }
        ish_ffi_register_exit_hook(guestExit);
        int outputFD = output[0];
        dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY,0), ^{
            char bytes[4096]; ssize_t count;
            while ((count = read(outputFD,bytes,sizeof(bytes))) != 0) {
                if (count < 0) { if (errno == EINTR) continue; break; }
                NSData *data = [NSData dataWithBytes:bytes length:(NSUInteger)count];
                dispatch_async(dispatch_get_main_queue(), ^{
                    if (self.ready) return;
                    [self.utf8Pending appendData:data];
                    NSString *text = [[NSString alloc] initWithData:self.utf8Pending encoding:NSUTF8StringEncoding];
                    if (!text && self.utf8Pending.length < 16384) return;
                    if (!text) text = [[NSString alloc] initWithData:self.utf8Pending encoding:NSISOLatin1StringEncoding];
                    [self.utf8Pending setLength:0];
                    NSString *combined = [self.bootstrapOutput.text stringByAppendingString:text ?: @""];
                    if (combined.length > 24000) combined = [combined substringFromIndex:combined.length - 24000];
                    self.bootstrapOutput.text = combined;
                    [self.bootstrapOutput scrollRangeToVisible:NSMakeRange(combined.length,0)];
                });
            }
            close(outputFD);
        });
        ish_ffi_task_start();
        dispatch_async(dispatch_get_main_queue(), ^{ [self checkHealth]; });
    }
}

- (NSMutableURLRequest *)request:(NSString *)method path:(NSString *)path body:(NSString *)body {
    NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:@"http://127.0.0.1:%ld%@",(long)self.port,path]];
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
    request.HTTPMethod = method;
    if ([@[@"/v1/models",@"/v1/commands",@"/v1/session-history"] containsObject:path]) request.timeoutInterval = 150;
    [request setValue:[@"Bearer " stringByAppendingString:self.token] forHTTPHeaderField:@"Authorization"];
    if ([method isEqual:@"POST"]) {
        request.HTTPBody = [body dataUsingEncoding:NSUTF8StringEncoding];
        [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    }
    return request;
}

- (void)checkHealth {
    if (self.exited || self.ready) return;
    self.healthAttempts++;
    NSMutableURLRequest *request = [self request:@"GET" path:@"/v1/health" body:nil]; request.timeoutInterval = 2;
    [[self.http dataTaskWithRequest:request completionHandler:^(NSData *data,NSURLResponse *response,NSError *error) {
        NSDictionary *json = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
        dispatch_async(dispatch_get_main_queue(), ^{
            [self handleHealthJSON:json response:(NSHTTPURLResponse *)response error:error];
        });
    }] resume];
}

- (void)handleHealthJSON:(NSDictionary *)json response:(NSHTTPURLResponse *)response error:(NSError *)error {
    // A request started before init exited must never resurrect the workspace.
    if (self.exited) return;
    if (!error && response.statusCode == 200 && [json isKindOfClass:NSDictionary.class] && [json[@"protocol"] integerValue] == 1) { self.ready = YES; [self loadWorkspace]; }
    else if (self.healthAttempts < 600) {
        if (self.healthAttempts > 5) self.status.text = [NSString stringWithFormat:@"BIBIMER · Waiting for local Linux…\n%@ (HTTP %ld)",error.localizedDescription ?: @"Starting bridge",(long)response.statusCode];
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW,NSEC_PER_SEC),dispatch_get_main_queue(), ^{ [self checkHealth]; });
    } else [self fail:@"Local setup did not finish. Check the installation output, then reopen Bibimer to retry. Existing files are kept."];
}

- (NSDictionary *)environment {
    NSUserDefaults *preferences = NSUserDefaults.standardUserDefaults;
    NSString *preference = [preferences stringForKey:@"languagePreference"] ?: @"system";
    NSString *language = [preference isEqual:@"system"] ? systemLanguage() : preference;
    return @{@"selfTest":@(self.smokeScript != nil),@"paired":@YES,@"termuxInstalled":@YES,@"platform":@"ios",@"notifications":@{@"enabled":@NO,@"allowed":@NO,@"state":@"unsupported"},@"language":language,@"systemLanguage":systemLanguage(),@"languagePreference":preference,@"agentOptions":[preferences dictionaryForKey:@"agentOptions"] ?: @{},@"enterBehavior":[preferences stringForKey:@"enterBehavior"] ?: @"newline",@"contextDisplay":[[preferences stringForKey:@"contextDisplay"] isEqual:@"remaining"] ? @"remaining" : @"used",@"lastProjectParent":[preferences stringForKey:@"lastProjectParent"] ?: @"/root/projects",@"lastProjectFolder":[preferences stringForKey:@"lastProjectFolder"] ?: @"/root/projects",@"quickSetup":@{@"phase":@"connected",@"id":@"embedded"},@"bundledBridgeVersion":@"0.18.0",@"version":@"0.1.0-ios"};
}

- (void)loadWorkspace {
    if (self.exited) return;
    WKWebViewConfiguration *configuration = [WKWebViewConfiguration new];
    [configuration.userContentController addScriptMessageHandler:self name:@"bibimer"];
    NSString *shim = [NSString stringWithContentsOfURL:[NSBundle.mainBundle URLForResource:@"native" withExtension:@"js"] encoding:NSUTF8StringEncoding error:nil];
    NSString *source = [[@"window.__bibimerEnvironment=" stringByAppendingString:jsonString([self environment])] stringByAppendingFormat:@";\n%@",shim];
    [configuration.userContentController addUserScript:[[WKUserScript alloc] initWithSource:source injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:YES]];
    self.web = [[WKWebView alloc] initWithFrame:CGRectZero configuration:configuration];
    self.web.navigationDelegate = self; self.web.opaque = NO; self.web.backgroundColor = self.view.backgroundColor;
    self.web.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    self.web.accessibilityIdentifier = @"bibimerWorkspace"; self.web.translatesAutoresizingMaskIntoConstraints = NO;
#if TARGET_OS_SIMULATOR
    if (@available(iOS 16.4,*)) self.web.inspectable = YES;
#endif
    [self.view addSubview:self.web];
    [NSLayoutConstraint activateConstraints:@[
        [self.web.topAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.topAnchor],
        [self.web.leadingAnchor constraintEqualToAnchor:self.view.leadingAnchor],
        [self.web.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor],
        [self.web.bottomAnchor constraintEqualToAnchor:self.view.keyboardLayoutGuide.topAnchor]
    ]];
    NSURL *ui = [NSBundle.mainBundle URLForResource:@"Web" withExtension:nil];
    [self.web loadFileURL:[ui URLByAppendingPathComponent:@"index.html"] allowingReadAccessToURL:ui];
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    if (self.exited) { webView.hidden = YES; return; }
    self.status.hidden = YES; self.bootstrapOutput.hidden = YES;
    if (self.smokeScript) [webView evaluateJavaScript:[self.smokeScript stringByAppendingString:@"\n;undefined;"] completionHandler:^(id result,NSError *error) {
        (void)result;
        if (error) [self writeSmoke:@{@"ok":@NO,@"error":error.localizedDescription}];
    }];
}

- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)action decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    NSURL *url = action.request.URL;
    NSString *root = [[[NSBundle.mainBundle URLForResource:@"Web" withExtension:nil] URLByResolvingSymlinksInPath].path stringByAppendingString:@"/"];
    NSString *path = url.URLByStandardizingPath.URLByResolvingSymlinksInPath.path;
    BOOL local = url.isFileURL && [path hasPrefix:root];
    if (action.targetFrame.mainFrame) local = local && [path isEqual:[root stringByAppendingString:@"index.html"]];
    decisionHandler(local || [url.absoluteString isEqual:@"about:blank"] ? WKNavigationActionPolicyAllow : WKNavigationActionPolicyCancel);
    if (!local && action.navigationType == WKNavigationTypeLinkActivated) [self openLink:url.absoluteString];
}

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task willPerformHTTPRedirection:(NSHTTPURLResponse *)response newRequest:(NSURLRequest *)request completionHandler:(void (^)(NSURLRequest *))completionHandler {
    (void)session; (void)task; (void)response; (void)request;
    completionHandler(nil);
}

- (BOOL)allowedMethod:(NSString *)method path:(NSString *)path {
    if (![method isKindOfClass:NSString.class] || ![path isKindOfClass:NSString.class] || path.length > 8192) return NO;
    NSURLComponents *components = [NSURLComponents componentsWithString:path];
    if (!components || components.scheme || components.host || components.fragment) return NO;
    NSString *route = components.percentEncodedPath;
    if (![route hasPrefix:@"/v1/"]) return NO;
    if ([method isEqual:@"GET"]) {
        if ([@[@"/v1/health",@"/v1/completions"] containsObject:route]) return YES;
        return [route rangeOfString:@"^/v1/sessions/[a-f0-9-]{36}/(events|title)$" options:NSRegularExpressionSearch].location != NSNotFound;
    }
    if (![method isEqual:@"POST"] || components.query) return NO;
    if ([@[@"/v1/project",@"/v1/project/manage",@"/v1/github",@"/v1/inspect",@"/v1/folders",@"/v1/session-history",@"/v1/commands",@"/v1/models",@"/v1/project-agent",@"/v1/project-session",@"/v1/worktrees/manage",@"/v1/worktrees",@"/v1/sessions",@"/v1/ios/agents"] containsObject:route]) return YES;
    return [route rangeOfString:@"^/v1/sessions/[a-f0-9-]{36}/(manage|handoff|input|resize|stop|message|respond|interrupt|options|queue|steer)$" options:NSRegularExpressionSearch].location != NSNotFound;
}

- (void)webViewWebContentProcessDidTerminate:(WKWebView *)webView {
    if (!self.exited) [webView reload];
}

- (void)reply:(NSString *)identifier status:(NSInteger)status data:(id)data {
    NSDictionary *response = @{@"ok":@(status >= 200 && status < 300),@"status":@(status),@"data":data ?: @{}};
    NSString *script = [NSString stringWithFormat:@"window.BibimerNativeReply?.(%@,%@)",jsonString(identifier),jsonString(response)];
    dispatch_async(dispatch_get_main_queue(), ^{ [self.web evaluateJavaScript:script completionHandler:nil]; });
}

- (BOOL)isCurrentClipboardWorkspace:(WKWebView *)web {
    if (!web || web != self.web || self.exited) return NO;
    NSURL *index = [[NSBundle.mainBundle URLForResource:@"Web" withExtension:nil] URLByAppendingPathComponent:@"index.html"];
    return web.URL.isFileURL && [web.URL.URLByStandardizingPath.URLByResolvingSymlinksInPath.path isEqual:index.URLByResolvingSymlinksInPath.path];
}

- (void)readClipboard:(NSString *)identifier webView:(WKWebView *)web {
    if (![self isCurrentClipboardWorkspace:web] || UIApplication.sharedApplication.applicationState != UIApplicationStateActive) return;
    // This is called only by the explicit Paste action. Let iOS apply its paste privacy policy.
    NSDictionary *response;
    @try {
        NSString *raw = self.smokeScript ? self.testClipboard : UIPasteboard.generalPasteboard.string;
        NSString *text = [[raw stringByReplacingOccurrencesOfString:@"\r\n" withString:@"\n"] stringByReplacingOccurrencesOfString:@"\r" withString:@"\n"];
        if (!text.length) response = @{@"ok":@NO,@"code":@"clipboard_empty"};
        else if ([text lengthOfBytesUsingEncoding:NSUTF8StringEncoding] > 16384) response = @{@"ok":@NO,@"code":@"clipboard_large"};
        else response = @{@"ok":@YES,@"text":text};
    } @catch (__unused NSException *exception) { response = @{@"ok":@NO,@"code":@"clipboard_failed"}; }
    NSString *script = [NSString stringWithFormat:@"window.BibimerClipboardReply?.(%@,%@)",jsonString(identifier),jsonString(response)];
    // Never route a delayed clipboard reply into a replacement WebView.
    dispatch_async(dispatch_get_main_queue(), ^{
        if ([self isCurrentClipboardWorkspace:web]) [web evaluateJavaScript:script completionHandler:nil];
    });
}

- (void)openLink:(NSString *)value {
    if (value.length > 8192) return;
    NSURL *url = [NSURL URLWithString:value];
    if (!url.host.length || ![@[@"https",@"http"] containsObject:url.scheme.lowercaseString]) return;
    [UIApplication.sharedApplication openURL:url options:@{} completionHandler:nil];
}

- (void)writeSmoke:(NSDictionary *)result {
    NSMutableDictionary *evidence = [result mutableCopy];
    evidence[@"javascriptErrors"] = self.javascriptErrors;
    evidence[@"execution"] = @"embedded-arm64-linux";
    NSData *data = [NSJSONSerialization dataWithJSONObject:evidence options:NSJSONWritingPrettyPrinted error:nil];
    [data writeToURL:[self.documents URLByAppendingPathComponent:self.smokeResultName ?: @"ui-test.json"] options:NSDataWritingAtomic error:nil];
}

- (void)fileCall:(NSDictionary *)body completion:(void (^)(NSDictionary *,NSInteger))completion {
    [[self.http dataTaskWithRequest:[self request:@"POST" path:@"/v1/files" body:jsonString(body)] completionHandler:^(NSData *data,NSURLResponse *response,NSError *error) {
        NSDictionary *json = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
        dispatch_async(dispatch_get_main_queue(), ^{ completion([json isKindOfClass:NSDictionary.class] ? json : @{},error ? 503 : [(NSHTTPURLResponse *)response statusCode]); });
    }] resume];
}

- (void)cleanupExport {
    [self.exportStream closeFile]; self.exportStream = nil;
    if (self.exportDirectory) [NSFileManager.defaultManager removeItemAtURL:self.exportDirectory error:nil];
    self.exportDirectory = nil; self.exportFile = nil; self.exportTransfer = nil; self.exportRequest = nil;
    self.exportSize = 0; self.exportOffset = 0; self.openingFile = NO;
}

- (void)finishFile:(NSString *)code {
    if (self.exportTransfer) [self fileCall:@{@"action":@"release",@"id":self.exportTransfer} completion:^(NSDictionary *data,NSInteger status) { (void)data; (void)status; }];
    self.exportTransfer = nil;
    [self.exportStream closeFile]; self.exportStream = nil;
    if (!code && (self.presentedViewController || UIApplication.sharedApplication.applicationState != UIApplicationStateActive)) code = @"error_file_cancelled";
    if (code) {
        [self reply:self.exportRequest status:400 data:@{@"code":code}];
        [self cleanupExport];
    } else {
        NSURL *directory = self.exportDirectory;
        UIActivityViewController *share = [[UIActivityViewController alloc] initWithActivityItems:@[self.exportFile] applicationActivities:nil];
        share.popoverPresentationController.sourceView = self.view;
        share.popoverPresentationController.sourceRect = CGRectMake(CGRectGetMidX(self.view.bounds),CGRectGetMaxY(self.view.bounds)-20,1,1);
        share.completionWithItemsHandler = ^(UIActivityType type,BOOL completed,NSArray *items,NSError *error) {
            (void)type; (void)completed; (void)items; (void)error;
            if ([self.exportDirectory isEqual:directory]) [self cleanupExport];
        };
        NSString *identifier = self.exportRequest;
        [self presentViewController:share animated:YES completion:^{
            [self reply:identifier status:200 data:@{}]; self.exportRequest = nil;
        }];
    }
}

- (void)readFileChunk {
    if (UIApplication.sharedApplication.applicationState != UIApplicationStateActive) { [self finishFile:@"error_file_cancelled"]; return; }
    if (self.exportOffset == self.exportSize) { [self finishFile:nil]; return; }
    [self fileCall:@{@"action":@"read",@"id":self.exportTransfer,@"offset":@(self.exportOffset)} completion:^(NSDictionary *data,NSInteger status) {
        NSData *bytes = [data[@"data"] isKindOfClass:NSString.class] ? [[NSData alloc] initWithBase64EncodedString:data[@"data"] options:0] : nil;
        unsigned long long next = [data[@"next"] unsignedLongLongValue];
        if (status != 200 || !bytes || !bytes.length || bytes.length > 256*1024 || [data[@"offset"] unsignedLongLongValue] != self.exportOffset || next != self.exportOffset + bytes.length || next > self.exportSize || [data[@"done"] boolValue] != (next == self.exportSize)) { [self finishFile:@"error_file_changed"]; return; }
        NSError *error;
        if (![self.exportStream writeData:bytes error:&error]) { [self finishFile:@"error_file_open"]; return; }
        self.exportOffset = next; [self readFileChunk];
    }];
}

- (void)openFile:(NSString *)identifier payload:(NSString *)payload {
    if (self.exited) { [self reply:identifier status:503 data:@{@"code":@"error_connection_failed"}]; return; }
    if (self.openingFile || self.presentedViewController) { [self reply:identifier status:409 data:@{@"code":@"error_file_busy"}]; return; }
    NSDictionary *body = [NSJSONSerialization JSONObjectWithData:[payload dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
    if (![body isKindOfClass:NSDictionary.class]) { [self reply:identifier status:400 data:@{@"code":@"error_file_link"}]; return; }
    NSMutableDictionary *prepare = [body mutableCopy]; prepare[@"action"] = @"prepare";
    self.openingFile = YES; self.exportRequest = identifier;
    [self fileCall:prepare completion:^(NSDictionary *data,NSInteger status) {
        if (status != 200 || ![data[@"id"] isKindOfClass:NSString.class] || ![data[@"name"] isKindOfClass:NSString.class] || ![data[@"size"] isKindOfClass:NSNumber.class] || [data[@"size"] longLongValue] < 0 || [data[@"size"] unsignedLongLongValue] > 64*1024*1024) { [self finishFile:data[@"code"] ?: @"error_file_open"]; return; }
        self.exportTransfer = data[@"id"]; self.exportSize = [data[@"size"] unsignedLongLongValue]; self.exportOffset = 0;
        NSString *name = [data[@"name"] lastPathComponent];
        if (!name.length || [name isEqual:@"."] || [name isEqual:@".."]) { [self finishFile:@"error_file_link"]; return; }
        NSURL *exports = [[NSURL fileURLWithPath:NSTemporaryDirectory() isDirectory:YES] URLByAppendingPathComponent:@"bibimer-exports" isDirectory:YES];
        self.exportDirectory = [exports URLByAppendingPathComponent:NSUUID.UUID.UUIDString isDirectory:YES];
        if (![NSFileManager.defaultManager createDirectoryAtURL:self.exportDirectory withIntermediateDirectories:YES attributes:@{NSFileProtectionKey:NSFileProtectionComplete} error:nil]) { [self finishFile:@"error_file_open"]; return; }
        self.exportFile = [self.exportDirectory URLByAppendingPathComponent:name];
        [NSFileManager.defaultManager createFileAtPath:self.exportFile.path contents:nil attributes:@{NSFileProtectionKey:NSFileProtectionComplete}];
        self.exportStream = [NSFileHandle fileHandleForWritingToURL:self.exportFile error:nil];
        if (!self.exportStream) { [self finishFile:@"error_file_open"]; return; }
        [self readFileChunk];
    }];
}

- (void)userContentController:(WKUserContentController *)controller didReceiveScriptMessage:(WKScriptMessage *)message {
    NSURL *source = message.frameInfo.request.URL;
    NSURL *index = [[NSBundle.mainBundle URLForResource:@"Web" withExtension:nil] URLByAppendingPathComponent:@"index.html"];
    if (message.webView != self.web || !message.frameInfo.mainFrame || !source.isFileURL || ![source.URLByStandardizingPath.URLByResolvingSymlinksInPath.path isEqual:index.URLByResolvingSymlinksInPath.path] || ![message.body isKindOfClass:NSDictionary.class]) return;
    NSDictionary *body = message.body;
    NSString *action = body[@"action"];
    if ([action isEqual:@"readClipboard"]) {
        NSString *identifier = body[@"id"];
        if (![identifier isKindOfClass:NSString.class] || [identifier rangeOfString:@"^[a-f0-9]{32}:[0-9]{1,16}$" options:NSRegularExpressionSearch].location == NSNotFound) return;
        [self readClipboard:identifier webView:message.webView];
    } else if ([action isEqual:@"request"]) {
        NSString *identifier = body[@"id"], *method = body[@"method"], *path = body[@"path"], *payload = body[@"body"];
        if (![identifier isKindOfClass:NSString.class] || identifier.length > 80) return;
        if (self.smokeScript && [method isEqual:@"GET"] && [path isEqual:@"/native/test-late-health"]) {
            BOOL exited = self.exited, ready = self.ready, statusHidden = self.status.hidden, outputHidden = self.bootstrapOutput.hidden, webHidden = self.web.hidden;
            WKWebView *workspace = self.web;
            self.exited = YES; self.ready = NO; self.status.hidden = NO; self.bootstrapOutput.hidden = NO;
            NSHTTPURLResponse *late = [[NSHTTPURLResponse alloc] initWithURL:[NSURL URLWithString:@"http://127.0.0.1/"] statusCode:200 HTTPVersion:@"HTTP/1.1" headerFields:nil];
            [self handleHealthJSON:@{@"protocol":@1} response:late error:nil];
            BOOL ignored = !self.ready && self.web == workspace;
            [self webView:workspace didFinishNavigation:nil];
            BOOL failureVisible = !self.status.hidden && self.web.hidden;
            self.exited = exited; self.ready = ready; self.status.hidden = statusHidden; self.bootstrapOutput.hidden = outputHidden; self.web.hidden = webHidden;
            [self reply:identifier status:200 data:@{@"ignoredLateHealth":@(ignored),@"preservedFailure":@(failureVisible)}]; return;
        }
        if (self.smokeScript && [method isEqual:@"GET"] && [path isEqual:@"/native/share-state"]) {
            NSDictionary *attributes = self.exportFile ? [NSFileManager.defaultManager attributesOfItemAtPath:self.exportFile.path error:nil] : nil;
            [self reply:identifier status:200 data:@{@"busy":@(self.openingFile),@"presented":@([self.presentedViewController isKindOfClass:UIActivityViewController.class]),@"exists":@(attributes != nil),@"size":attributes[NSFileSize] ?: @0}]; return;
        }
        if (self.smokeScript && [path isEqual:@"/native/test-clipboard"]) {
            if ([method isEqual:@"POST"] && [payload isKindOfClass:NSString.class] && [payload lengthOfBytesUsingEncoding:NSUTF8StringEncoding] <= 65536) {
                NSDictionary *fixture = [NSJSONSerialization JSONObjectWithData:[payload dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
                if ([fixture isKindOfClass:NSDictionary.class] && [fixture[@"text"] isKindOfClass:NSString.class]) self.testClipboard = fixture[@"text"];
                else { [self reply:identifier status:400 data:@{}]; return; }
            } else if (![method isEqual:@"GET"]) { [self reply:identifier status:400 data:@{}]; return; }
            [self reply:identifier status:200 data:@{@"text":self.testClipboard ?: @""}]; return;
        }
        if ([method isEqual:@"POST"] && [path isEqual:@"/native/open-file"] && [payload isKindOfClass:NSString.class] && payload.length < 16384) { [self openFile:identifier payload:payload]; return; }
        if (![self allowedMethod:method path:path] || [path rangeOfCharacterFromSet:[NSCharacterSet characterSetWithCharactersInString:@"\r\n#\\"]].location != NSNotFound || ![payload isKindOfClass:NSString.class] || [payload lengthOfBytesUsingEncoding:NSUTF8StringEncoding] > 65536) {
            [self reply:identifier status:400 data:@{@"code":@"error_invalid_json"}]; return;
        }
        if (self.exited) { [self reply:identifier status:503 data:@{@"code":@"error_connection_failed"}]; return; }
        NSMutableURLRequest *request = [self request:method path:path body:payload];
        __block NSURLSessionDataTask *task;
        task = [self.http dataTaskWithRequest:request completionHandler:^(NSData *data,NSURLResponse *response,NSError *error) {
            dispatch_async(dispatch_get_main_queue(), ^{ [self.polls removeObject:task]; });
            NSDictionary *json = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
            NSInteger status = [(NSHTTPURLResponse *)response statusCode];
            [self reply:identifier status:error ? 503 : status data:json ?: @{@"code":@"error_connection_failed"}];
        }];
        if ([path containsString:@"/events?"]) [self.polls addObject:task];
        [task resume];
    } else if ([action isEqual:@"preference"]) {
        NSString *key = body[@"key"];
        id value = body[@"value"];
        if ([key isEqual:@"contextDisplay"] && (![value isKindOfClass:NSString.class] || ![@[@"used", @"remaining"] containsObject:value])) return;
        BOOL validType = [key isEqual:@"agentOptions"] ? [value isKindOfClass:NSDictionary.class] : [value isKindOfClass:NSString.class];
        if (validType && [@[@"languagePreference",@"enterBehavior",@"contextDisplay",@"lastProjectParent",@"lastProjectFolder",@"agentOptions"] containsObject:key] && [NSPropertyListSerialization propertyList:value isValidForFormat:NSPropertyListBinaryFormat_v1_0] && jsonString(value).length < 32768)
            [NSUserDefaults.standardUserDefaults setObject:value forKey:key];
    } else if ([action isEqual:@"copy"] && [body[@"text"] isKindOfClass:NSString.class]) {
        if (self.smokeScript) self.testClipboard = body[@"text"];
        else UIPasteboard.generalPasteboard.string = body[@"text"];
    }
    else if ([action isEqual:@"link"] && [body[@"url"] isKindOfClass:NSString.class]) [self openLink:body[@"url"]];
    else if ([action isEqual:@"cancelPoll"]) { for (NSURLSessionDataTask *task in self.polls) [task cancel]; [self.polls removeAllObjects]; }
    else if ([action isEqual:@"javascriptError"] && [body[@"message"] isKindOfClass:NSString.class] && self.smokeScript) [self.javascriptErrors addObject:body[@"message"]];
    else if ([action isEqual:@"smokeResult"] && self.smokeScript && [body[@"result"] isKindOfClass:NSDictionary.class]) [self writeSmoke:body[@"result"]];
    else if ([action isEqual:@"smokeProgress"] && self.smokeScript && [body[@"progress"] isKindOfClass:NSDictionary.class]) {
        NSData *progress = [NSJSONSerialization dataWithJSONObject:body[@"progress"] options:0 error:nil];
        [progress writeToURL:[self.documents URLByAppendingPathComponent:@"test-progress.json"] options:NSDataWritingAtomic error:nil];
    }
    else if ([action isEqual:@"dismissShare"] && self.smokeScript && [self.presentedViewController isKindOfClass:UIActivityViewController.class]) {
        NSURL *directory = self.exportDirectory;
        [self dismissViewControllerAnimated:NO completion:^{ if ([self.exportDirectory isEqual:directory]) [self cleanupExport]; }];
    }
    else if ([action isEqual:@"guide"]) [self openLink:[body[@"guide"] isEqual:@"privacy"] ? @"https://bibimer.app/privacy/" : @"https://github.com/andy5090/bibimer"];
}
@end

@interface AppDelegate : UIResponder <UIApplicationDelegate>
@property(nonatomic,strong) UIWindow *window;
@end
@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)options {
    self.window = [[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];
    activeController = [BibimerController new];
    self.window.rootViewController = activeController;
    [self.window makeKeyAndVisible];
    return YES;
}
@end

int main(int argc,char *argv[]) { @autoreleasepool { return UIApplicationMain(argc,argv,nil,NSStringFromClass(AppDelegate.class)); } }
