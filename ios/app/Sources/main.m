#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#import "VoiceService.h"
#import "CompletionNotifications.h"
#import "BrowserService.h"
#import "BackgroundExecution.h"
#import "SocketSupport.h"
#include <arpa/inet.h>
#include <netdb.h>
#include <resolv.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include <unistd.h>
#include <fcntl.h>
#include <TargetConditionals.h>
#include "embed/ffi.h"
#include "RuntimeSupport.h"

extern int bibimer_create_directory(const char *path);

static BOOL usesDesktopInput(void) {
#if TARGET_OS_MACCATALYST
    return YES;
#else
    if (@available(iOS 14.0,*)) return [NSProcessInfo.processInfo isiOSAppOnMac];
    return NO;
#endif
}

@interface BibimerWorkspaceWebView : WKWebView
@end

@implementation BibimerWorkspaceWebView
- (UIView *)inputAccessoryView {
    // WebKit forwards the focused HTML field's accessory request here.
    // Mac typing must not raise the iOS form toolbar over workspace controls.
    return usesDesktopInput() ? nil : [super inputAccessoryView];
}

- (UITextInputAssistantItem *)inputAssistantItem {
    UITextInputAssistantItem *item = [super inputAssistantItem];
    if (usesDesktopInput()) {
        item.leadingBarButtonGroups = @[];
        item.trailingBarButtonGroups = @[];
    }
    return item;
}
@end

@interface BibimerController : UIViewController <WKScriptMessageHandler, WKNavigationDelegate, NSURLSessionTaskDelegate, UIScrollViewDelegate>
@property WKWebView *web;
@property BibimerVoiceService *voice;
@property BibimerBrowserService *browser;
@property BOOL browserPolling;
@property NSUInteger browserEpoch;
@property NSURLSessionDataTask *browserPoll;
@property BibimerCompletionNotifications *completionNotifications;
@property BibimerBackgroundExecution *backgroundExecution;
@property UILabel *status;
@property UITextView *bootstrapOutput;
@property NSString *token;
@property NSInteger port;
@property NSURLSession *http;
@property NSMutableSet<NSURLSession *> *retiredHTTP;
@property NSMutableSet<NSURLSessionDataTask *> *polls;
@property BOOL exited;
@property BOOL ready;
@property NSUInteger healthAttempts;
@property NSURLSessionDataTask *healthTask;
@property BOOL runtimeStarted;
@property BOOL startupFailed;
@property int runtimeControlFD;
@property BOOL hasConnected;
@property BOOL recoveryAttempted;
@property BOOL recoveryAllowed;
@property BOOL recovering;
@property BOOL recoveryFailed;
@property BOOL recoveryTimedOut;
@property NSUInteger recoverySerial;
@property NSTimeInterval connectionStartedAt;
@property NSTimeInterval recoveryBootDeadline;
@property NSInteger healthHTTPStatus;
@property NSInteger healthNetworkError;
@property NSInteger healthErrorCategory;
@property NSMutableArray<NSDictionary *> *connectionLog;
@property NSURL *connectionLogURL;
@property(nonatomic,strong) dispatch_queue_t connectionLogQueue;
@property BOOL backgrounded;
@property NSUInteger connectionEpoch;
@property BOOL testConnectionOffline;
@property WKWebView *testRecoveryWorkspace;
@property NSURLSession *testRecoveryTransport;
@property NSURLSessionDataTask *testRecoveryRead;
@property NSURLSessionDataTask *testRecoveryWrite;
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
- (void)nativeEvent:(NSString *)callback arguments:(NSArray *)arguments;
- (NSMutableURLRequest *)request:(NSString *)method path:(NSString *)path body:(NSString *)body;
- (void)pollBrowser:(NSUInteger)epoch;
- (void)startBrowserPolling;
- (void)boot;
- (void)checkHealth;
- (void)retryConnection;
- (void)becameInactive;
- (void)replaceHTTPTransport;
- (void)expireHealthTask:(NSURLSessionDataTask *)task epoch:(NSUInteger)epoch;
- (void)recoverLinux;
- (BOOL)startLinuxServices;
- (void)recordConnection:(NSString *)event code:(NSInteger)code;
- (void)loadConnectionLog;
- (void)requestReconnect;
- (BOOL)shouldRecoverAfterHealthFailure;
- (NSURLSession *)newHTTPTransport;
- (void)applyScreenBehavior;
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

static BOOL startsBackgroundWork(NSString *method, NSString *path, NSString *payload) {
    if (![method isEqual:@"POST"]) return NO;
    NSDictionary *body = [NSJSONSerialization JSONObjectWithData:[payload dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
    if (![body isKindOfClass:NSDictionary.class]) return NO;
    if ([path isEqual:@"/v1/ios/agents"])
        return [@[@"install",@"version"] containsObject:body[@"action"] ?: @""];
    if ([path isEqual:@"/v1/sessions"])
        return [body[@"mode"] isEqual:@"chat"] && [body[@"initial_message"] isKindOfClass:NSDictionary.class] && [body[@"initial_message"][@"text"] isKindOfClass:NSString.class] && [body[@"initial_message"][@"text"] length] > 0;
    if ([path rangeOfString:@"^/v1/sessions/[a-f0-9-]{36}/(message|steer|respond)$" options:NSRegularExpressionSearch].location != NSNotFound) return YES;
    if ([path hasSuffix:@"/queue"]) return [@[@"add",@"resume",@"steer"] containsObject:body[@"action"] ?: @""];
    return [path hasSuffix:@"/handoff"] && [body[@"action"] isEqual:@"start"];
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
        [activeController recordConnection:@"runtime_exit" code:code];
        if (activeController.runtimeControlFD >= 0) close(activeController.runtimeControlFD);
        activeController.runtimeControlFD = -1;
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
    [self loadConnectionLog];
    NSURL *staleExports = [[NSURL fileURLWithPath:NSTemporaryDirectory() isDirectory:YES] URLByAppendingPathComponent:@"bibimer-exports" isDirectory:YES];
    [NSFileManager.defaultManager removeItemAtURL:staleExports error:nil];
    self.polls = [NSMutableSet new]; self.retiredHTTP = [NSMutableSet new]; self.javascriptErrors = [NSMutableArray new];
    self.utf8Pending = [NSMutableData new];
    self.runtimeQueue = dispatch_queue_create("app.bibimer.ios.runtime",DISPATCH_QUEUE_SERIAL);
    self.runtimeControlFD = -1;
    self.port = availablePort();
    NSMutableData *random = [NSMutableData dataWithLength:32];
    arc4random_buf(random.mutableBytes,random.length);
    NSMutableString *token = [NSMutableString new];
    for (NSUInteger i = 0; i < random.length; i++) [token appendFormat:@"%02x",((unsigned char *)random.bytes)[i]];
    self.token = token;
    self.http = [self newHTTPTransport];
    [self recordConnection:@"launch" code:0];
    NSArray *args = NSProcessInfo.processInfo.arguments;
    BOOL agentTest = [args containsObject:@"--agent-self-test"];
    if (agentTest || [args containsObject:@"--self-test"]) {
        self.smokeResultName = agentTest ? @"agent-test.json" : @"ui-test.json";
        self.smokeScript = [NSString stringWithContentsOfURL:[NSBundle.mainBundle URLForResource:agentTest ? @"agents-smoke" : @"smoke" withExtension:@"js"] encoding:NSUTF8StringEncoding error:nil];
        [NSFileManager.defaultManager removeItemAtURL:[self.documents URLByAppendingPathComponent:self.smokeResultName] error:nil];
        [NSFileManager.defaultManager removeItemAtURL:[self.documents URLByAppendingPathComponent:@"test-progress.json"] error:nil];
    }
    self.voice=[BibimerVoiceService new];self.voice.presenter=self;
    self.browser=[BibimerBrowserService new];self.browser.presenter=self;
    self.completionNotifications=[BibimerCompletionNotifications new];
    self.backgroundExecution = BibimerBackgroundExecution.shared;
    __weak typeof(self) weak=self;
    self.browser.visibility=^(BOOL visible){
        if(visible)[weak.voice pause];
        [weak.web evaluateJavaScript:visible ? @"window.BibimerPause?.()" : @"window.BibimerResume?.()" completionHandler:nil];
    };
    self.voice.emit=^(NSString *callback,NSArray *arguments){[weak nativeEvent:callback arguments:arguments];};
    self.completionNotifications.changed=^{[weak nativeEvent:@"BibimerNotificationStatus" arguments:@[]];};
    self.completionNotifications.opened=^{[weak nativeEvent:@"BibimerOpenNotification" arguments:@[]];};
    self.completionNotifications.fetch=^NSURLSessionDataTask *(NSString *path,void (^done)(NSDictionary *)){
        if(!weak.ready || weak.exited){dispatch_async(dispatch_get_main_queue(),^{done(nil);});return nil;}
        NSURLSessionDataTask *task=[weak.http dataTaskWithRequest:[weak request:@"GET" path:path body:@"{}"] completionHandler:^(NSData *data,NSURLResponse *response,NSError *error){
            NSDictionary *json=!error && [(NSHTTPURLResponse *)response statusCode]==200 && data.length<4*1024*1024 ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
            dispatch_async(dispatch_get_main_queue(),^{done([json isKindOfClass:NSDictionary.class] ? json : nil);});
        }];[task resume];return task;
    };
    self.backgroundExecution.changed = ^{
        if (!weak.backgrounded) [weak nativeEvent:@"BibimerBackgroundChanged" arguments:@[]];
    };
    self.backgroundExecution.fetch = ^NSURLSessionDataTask *(NSString *path,void (^done)(NSDictionary *)) {
        // The read-only worker remains usable while foreground UI is paused.
        if (weak.exited || !weak.runtimeStarted) { dispatch_async(dispatch_get_main_queue(),^{ done(nil); }); return nil; }
        NSMutableURLRequest *request = [weak request:@"GET" path:path body:nil]; request.timeoutInterval = 5;
        NSURLSessionDataTask *task = [weak.http dataTaskWithRequest:request completionHandler:^(NSData *data,NSURLResponse *response,NSError *error) {
            id value = !error && [(NSHTTPURLResponse *)response statusCode] == 200 && data.length < 4*1024*1024 ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
            dispatch_async(dispatch_get_main_queue(),^{ done([value isKindOfClass:NSDictionary.class] ? value : nil); });
        }]; [task resume]; return task;
    };
    dispatch_async(self.runtimeQueue, ^{ [self boot]; });
}

- (void)loadConnectionLog {
    self.connectionLog = [NSMutableArray new];
    self.connectionLogQueue = dispatch_queue_create("app.bibimer.ios.connection-log",DISPATCH_QUEUE_SERIAL);
    NSURL *cache = [NSFileManager.defaultManager URLsForDirectory:NSCachesDirectory inDomains:NSUserDomainMask].firstObject;
    [NSFileManager.defaultManager createDirectoryAtURL:cache withIntermediateDirectories:YES attributes:nil error:nil];
    self.connectionLogURL = [cache URLByAppendingPathComponent:@"connection-diagnostics.json"];
    NSData *data = [NSData dataWithContentsOfURL:self.connectionLogURL];
    id rows = data.length <= 65536 ? [NSJSONSerialization JSONObjectWithData:data ?: [NSData data] options:0 error:nil] : nil;
    NSSet *events = [NSSet setWithArray:@[@"launch",@"inactive",@"background",@"active",@"probe_start",@"probe_ok",@"probe_failed",@"probe_watchdog",@"retry",@"retry_blocked_recovery",@"retry_blocked_runtime",@"retry_blocked_inactive",@"reconnect_button",@"service_start",@"recovery_start",@"recovery_watchdog",@"recovery_boot_timeout",@"recovery_stopped",@"diagnostics_copy",@"js_delivery_failed",@"message_rejected",@"runtime_exit"]];
    NSSet *numbers = [NSSet setWithArray:@[@"time",@"uptime",@"build",@"code",@"application",@"scene",@"backgrounded",@"ready",@"started",@"exited",@"startupFailed",@"recovering",@"timedOut",@"attempts",@"epoch",@"shutdownStage",@"observedChildren",@"httpStatus",@"networkError",@"errorCategory"]];
    if (![rows isKindOfClass:NSArray.class]) return;
    for (id row in rows) {
        if (![row isKindOfClass:NSDictionary.class] || ![row[@"event"] isKindOfClass:NSString.class] || ![events containsObject:row[@"event"]]) continue;
        NSMutableDictionary *safe = [NSMutableDictionary dictionaryWithObject:row[@"event"] forKey:@"event"];
        for (NSString *key in numbers) if ([row[key] isKindOfClass:NSNumber.class]) safe[key] = row[key];
        [self.connectionLog addObject:safe];
        if (self.connectionLog.count > 64) [self.connectionLog removeObjectAtIndex:0];
    }
}

- (void)recordConnection:(NSString *)event code:(NSInteger)code {
    if (!self.connectionLog) return;
    NSDictionary *row = @{@"event":event,@"time":@(NSDate.date.timeIntervalSince1970),@"uptime":@(NSProcessInfo.processInfo.systemUptime),
        @"build":@([[NSBundle.mainBundle objectForInfoDictionaryKey:@"CFBundleVersion"] integerValue]),@"code":@(code),
        @"application":@(UIApplication.sharedApplication.applicationState),@"scene":@(self.view.window.windowScene ? self.view.window.windowScene.activationState : -1),
        @"backgrounded":@(self.backgrounded),@"ready":@(self.ready),@"started":@(self.runtimeStarted),@"exited":@(self.exited),@"startupFailed":@(self.startupFailed),
        @"recovering":@(self.recovering),@"timedOut":@(self.recoveryTimedOut),@"attempts":@(self.healthAttempts),@"epoch":@(self.connectionEpoch),
        @"shutdownStage":@(bibimer_recovery_stage()),@"observedChildren":@(bibimer_recovery_remaining()),
        @"httpStatus":@(self.healthHTTPStatus),@"networkError":@(self.healthNetworkError),@"errorCategory":@(self.healthErrorCategory)};
    [self.connectionLog addObject:row];
    if (self.connectionLog.count > 64) [self.connectionLog removeObjectAtIndex:0];
    NSData *data = [NSJSONSerialization dataWithJSONObject:self.connectionLog options:0 error:nil];
    NSURL *destination = self.connectionLogURL;
    dispatch_async(self.connectionLogQueue, ^{
        [data writeToURL:destination options:NSDataWritingAtomic | NSDataWritingFileProtectionCompleteUntilFirstUserAuthentication error:nil];
        [NSFileManager.defaultManager setAttributes:@{NSFilePosixPermissions:@0600} ofItemAtPath:destination.path error:nil];
    });
}

- (void)becameInactive {
    if (self.backgrounded) return;
    self.backgrounded = YES; self.ready = NO; self.connectionEpoch++;
    [self recordConnection:@"inactive" code:0];
    [self applyScreenBehavior];
    [self.healthTask cancel]; self.healthTask = nil;
    for (NSURLSessionDataTask *task in self.polls) [task cancel];
    [self.polls removeAllObjects];
    [self.completionNotifications pause];
    self.browserEpoch++;self.browserPolling=NO;[self.browserPoll cancel];self.browserPoll=nil;
    [self nativeEvent:@"BibimerPause" arguments:@[]];
}
- (void)enteredBackground {
    [self becameInactive];
    [self.voice pause];
    [self.backgroundExecution setForeground:NO];
    [self recordConnection:@"background" code:0];
}
- (void)pollBrowser:(NSUInteger)epoch {
    if(epoch!=self.browserEpoch || !self.browserPolling || self.exited || UIApplication.sharedApplication.applicationState!=UIApplicationStateActive)return;
    self.browserPoll=[self.http dataTaskWithRequest:[self request:@"GET" path:@"/v1/ios/browser/commands" body:@"{}"] completionHandler:^(NSData *data,NSURLResponse *response,NSError *error){
        NSDictionary *json=!error && data.length<65536 ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
        dispatch_async(dispatch_get_main_queue(),^{
            if(epoch!=self.browserEpoch || !self.browserPolling)return;self.browserPoll=nil;
            NSDictionary *command=[json isKindOfClass:NSDictionary.class] ? json[@"command"] : nil;
            void (^again)(void)=^{dispatch_after(dispatch_time(DISPATCH_TIME_NOW,NSEC_PER_SEC/3),dispatch_get_main_queue(),^{[self pollBrowser:epoch];});};
            if(![command isKindOfClass:NSDictionary.class]){again();return;}
            [self.browser command:command completion:^(NSDictionary *result){
                NSDictionary *body=@{@"id":command[@"id"] ?: @"",@"launch_id":command[@"launch_id"] ?: @"",@"result":result};
                [[self.http dataTaskWithRequest:[self request:@"POST" path:@"/v1/ios/browser/results" body:jsonString(body)] completionHandler:^(NSData *bytes,NSURLResponse *reply,NSError *failure){dispatch_async(dispatch_get_main_queue(),again);}] resume];
            }];
        });
    }];[self.browserPoll resume];
}
- (void)startBrowserPolling {
    if(!self.ready || self.exited || self.browserPolling || UIApplication.sharedApplication.applicationState!=UIApplicationStateActive)return;
    self.browserPolling=YES;[self pollBrowser:self.browserEpoch];
}
- (void)nativeEvent:(NSString *)callback arguments:(NSArray *)arguments {
    if(!self.web || (self.exited && ![@[@"BibimerIOSRuntimeChanged",@"BibimerIOSDiagnosticsCopied"] containsObject:callback]))return;
    NSString *script=[NSString stringWithFormat:@"(()=>{Object.assign(window.__bibimerEnvironment ||= {},%@);const callback=window[%@];if(typeof callback!=='function')return false;callback(...%@);return true;})()",jsonString([self environment]),jsonString(callback),jsonString(arguments)];
    [self.web evaluateJavaScript:script completionHandler:^(id result,NSError *error) {
        if ((error || ![result isKindOfClass:NSNumber.class] || ![result boolValue]) && [@[@"BibimerResume",@"BibimerPause",@"BibimerIOSRuntimeChanged"] containsObject:callback])
            [self recordConnection:@"js_delivery_failed" code:error ? error.code : -1];
    }];
}
- (void)becameActive {
    self.backgrounded = NO;
    // This begins a new foreground probe window. Manual retries within it keep
    // the original window so repeated taps cannot postpone recovery forever.
    self.healthAttempts = 0; self.connectionStartedAt = NSProcessInfo.processInfo.systemUptime;
    if (self.recoveryBootDeadline > 0) self.recoveryBootDeadline = self.connectionStartedAt + 15;
    [self recordConnection:@"active" code:0];
    [self.backgroundExecution setForeground:YES];
    [self nativeEvent:@"BibimerBackgroundChanged" arguments:@[]];
    [self applyScreenBehavior];
    // Preserve the failed operation and its visible retry action. Foregrounding
    // must not turn a bounded failure back into an indefinite connecting state.
    if (self.recoveryFailed) { [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]]; return; }
    self.recoveryAllowed = self.hasConnected && !self.recoveryAttempted;
    [self retryConnection];
}

- (void)replaceHTTPTransport {
    // Manual retries and inactive-only transitions need fresh sockets too.
    NSURLSession *previous = self.http;
    self.http = [self newHTTPTransport];
    if (!previous) return;
    [self.retiredHTTP addObject:previous];
    [previous getAllTasksWithCompletionHandler:^(NSArray<NSURLSessionTask *> *tasks) {
        // Reads can be repeated. Let already submitted writes finish without
        // cancelling or replaying a command whose delivery may be unknown.
        dispatch_async(dispatch_get_main_queue(), ^{
            for (NSURLSessionTask *task in tasks)
                if ([task.originalRequest.HTTPMethod isEqual:@"GET"]) [task cancel];
            if ([self.retiredHTTP containsObject:previous]) [previous finishTasksAndInvalidate];
        });
    }];
}

- (void)URLSession:(NSURLSession *)session didBecomeInvalidWithError:(NSError *)error {
    (void)error;
    dispatch_async(dispatch_get_main_queue(), ^{ [self.retiredHTTP removeObject:session]; });
}

- (NSURLSession *)newHTTPTransport {
    NSURLSessionConfiguration *configuration = NSURLSessionConfiguration.ephemeralSessionConfiguration;
    configuration.timeoutIntervalForRequest = 33; configuration.timeoutIntervalForResource = 180;
    configuration.HTTPMaximumConnectionsPerHost = 12;
    configuration.requestCachePolicy = NSURLRequestReloadIgnoringLocalCacheData;
    return [NSURLSession sessionWithConfiguration:configuration delegate:self delegateQueue:nil];
}

- (void)applyScreenBehavior {
    UIApplication.sharedApplication.idleTimerDisabled = !usesDesktopInput() && !self.backgrounded &&
        UIApplication.sharedApplication.applicationState == UIApplicationStateActive &&
        [NSUserDefaults.standardUserDefaults boolForKey:@"iosKeepAwake"];
    [self setNeedsUpdateOfScreenEdgesDeferringSystemGestures];
}

- (UIRectEdge)preferredScreenEdgesDeferringSystemGestures {
    return !usesDesktopInput() && [NSUserDefaults.standardUserDefaults boolForKey:@"iosDeferHomeGesture"] ? UIRectEdgeBottom : UIRectEdgeNone;
}

- (void)fail:(NSString *)message {
    dispatch_async(dispatch_get_main_queue(), ^{
        self.ready = NO;
        if (!self.runtimeStarted) self.startupFailed = YES;
        [self.healthTask cancel]; self.healthTask = nil;
        self.connectionEpoch++;
        [self.backgroundExecution runtimeStopped];
        [self.voice pause];[self.completionNotifications pause];[self.browser revokeAll];self.browserEpoch++;self.browserPolling=NO;[self.browserPoll cancel];self.browserPoll=nil;
        self.status.text = message;
        // Keep navigation, Settings and drafts accessible after a runtime failure.
        if (!self.web) [self loadWorkspace];
        self.web.hidden = NO;
        self.bootstrapOutput.hidden = YES; self.status.hidden = YES;
        [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]];
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
        NSString *socketPrefix = BibimerSocketPrefix(NSTemporaryDirectory(), TARGET_OS_SIMULATOR, &error);
        if (!socketPrefix) { [self fail:@"Could not prepare private Linux socket paths."]; return; }
        sock_tmp_prefix = strdup(socketPrefix.UTF8String);
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
        // PID 1 keeps this private control pipe. It accepts only "start".
        self.runtimeControlFD = input[1];
        fcntl(self.runtimeControlFD, F_SETFL, O_NONBLOCK);
        fcntl(self.runtimeControlFD, F_SETFD, FD_CLOEXEC);
        if (rc < 0) { [self fail:@"Could not install Linux I/O."]; return; }
        ish_ffi_chdir("/root");
        NSArray *args = @[@"/bin/sh",@"/opt/bibimer/ios/supervisor.sh"];
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
        dispatch_async(dispatch_get_main_queue(), ^{
            self.runtimeStarted = YES;
            if (![self startLinuxServices]) { [self fail:@"Could not start local Linux services."]; return; }
            [self checkHealth];
        });
    }
}

- (NSMutableURLRequest *)request:(NSString *)method path:(NSString *)path body:(NSString *)body {
    NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:@"http://127.0.0.1:%ld%@",(long)self.port,path]];
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
    request.HTTPMethod = method;
    if ([@[@"/v1/agent-connections",@"/v1/agent-updates",@"/v1/models",@"/v1/commands",@"/v1/session-history"] containsObject:path]) request.timeoutInterval = 150;
    [request setValue:[@"Bearer " stringByAppendingString:self.token] forHTTPHeaderField:@"Authorization"];
    if ([method isEqual:@"POST"]) {
        request.HTTPBody = [body dataUsingEncoding:NSUTF8StringEncoding];
        [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    }
    return request;
}

- (void)checkHealth {
    if (self.exited || self.backgrounded || self.ready || self.healthTask || self.recovering || self.recoveryFailed) return;
    self.healthAttempts++;
    [self recordConnection:@"probe_start" code:0];
    NSMutableURLRequest *request = [self request:@"GET" path:@"/v1/health" body:nil]; request.timeoutInterval = 2;
    __block NSURLSessionDataTask *task;
    task = [self.http dataTaskWithRequest:request completionHandler:^(NSData *data,NSURLResponse *response,NSError *error) {
        NSDictionary *json = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
        dispatch_async(dispatch_get_main_queue(), ^{
            if (self.healthTask != task) return;
            self.healthTask = nil;
            [self handleHealthJSON:json response:(NSHTTPURLResponse *)response error:error];
        });
    }];
    self.healthTask = task; [task resume];
    // URLSession's request timeout alone may wait on a suspended connection.
    // Bound each probe independently, without replaying any write requests.
    NSUInteger epoch = self.connectionEpoch;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW,2*NSEC_PER_SEC),dispatch_get_main_queue(), ^{
        [self expireHealthTask:task epoch:epoch];
    });
}

- (void)expireHealthTask:(NSURLSessionDataTask *)task epoch:(NSUInteger)epoch {
    if (!task || epoch != self.connectionEpoch || self.healthTask != task || self.backgrounded || self.exited || self.ready) return;
    self.healthTask = nil; [task cancel];
    [self recordConnection:@"probe_watchdog" code:NSURLErrorTimedOut];
    [self replaceHTTPTransport];
    [self handleHealthJSON:nil response:nil error:[NSError errorWithDomain:NSURLErrorDomain code:NSURLErrorTimedOut userInfo:nil]];
}

- (void)retryConnection {
    if (self.recovering) { [self recordConnection:@"retry_blocked_recovery" code:0]; [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]]; return; }
    if (self.exited || self.startupFailed) { [self recordConnection:@"retry_blocked_runtime" code:0]; [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]]; return; }
    if (!self.runtimeStarted || self.backgrounded) { [self recordConnection:@"retry_blocked_inactive" code:0]; [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]]; return; }
    self.connectionEpoch++;
    [self.healthTask cancel]; self.healthTask = nil;
    self.ready = NO;
    self.recoveryFailed = NO;
    if (!self.connectionStartedAt) self.connectionStartedAt = NSProcessInfo.processInfo.systemUptime;
    [self recordConnection:@"retry" code:0];
    self.browserEpoch++; self.browserPolling = NO;
    [self.browserPoll cancel]; self.browserPoll = nil;
    [self replaceHTTPTransport];
    [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]];
    [self checkHealth];
}

- (void)requestReconnect {
    [self recordConnection:@"reconnect_button" code:0];
    UIWindowScene *scene = self.view.window.windowScene;
    if (UIApplication.sharedApplication.applicationState == UIApplicationStateActive ||
        (scene && scene.activationState == UISceneActivationStateForegroundActive)) self.backgrounded = NO;
    // A second tap joins the active operation instead of restarting its probe
    // or running another shutdown while the new services are still starting.
    if (self.recovering || (self.recoveryAttempted && !self.hasConnected && !self.recoveryFailed)) {
        [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]];
        return;
    }
    self.recoveryAllowed = YES; self.recoveryAttempted = NO;
    if (self.healthTask && !self.recoveryFailed) {
        [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]];
        return;
    }
    self.recoveryBootDeadline = 0;
    [self retryConnection];
}

- (BOOL)shouldRecoverAfterHealthFailure {
    // This failure follows a probe on fresh sockets. No elapsed-time or probe
    // count gate: a live bridge reconnects; an unavailable bridge recovers now.
    return self.recoveryAllowed && !self.recoveryAttempted && self.runtimeStarted && self.runtimeControlFD >= 0 &&
        !self.exited && !self.startupFailed && !self.backgrounded && !self.recovering && !self.recoveryFailed;
}

- (void)handleHealthJSON:(NSDictionary *)json response:(NSHTTPURLResponse *)response error:(NSError *)error {
    // A request started before init exited must never resurrect the workspace.
    if (self.exited || self.backgrounded || self.recovering || self.recoveryFailed) return;
    self.healthHTTPStatus = response.statusCode; self.healthNetworkError = error.code;
    self.healthErrorCategory = !error ? 0 : [error.domain isEqual:NSURLErrorDomain] ? 1 : [error.domain isEqual:NSPOSIXErrorDomain] ? 2 : 3;
    if (!error && response.statusCode == 200 && [json isKindOfClass:NSDictionary.class] && [json[@"protocol"] integerValue] == 1) {
        self.ready = YES;
        self.hasConnected = YES;
        self.recoveryAttempted = NO;
        self.recoveryBootDeadline = 0;
        self.healthAttempts = 0; self.connectionStartedAt = 0;
        [self recordConnection:@"probe_ok" code:response.statusCode];
        if (!self.web) [self loadWorkspace];
        else [self nativeEvent:@"BibimerResume" arguments:@[]];
        [self.completionNotifications resume];
        [self startBrowserPolling];
    }
    else {
        [self recordConnection:@"probe_failed" code:error ? error.code : response.statusCode];
        if ([self shouldRecoverAfterHealthFailure] && !self.smokeScript) {
            [self recoverLinux];
        }
        else if (self.recoveryBootDeadline > 0 && NSProcessInfo.processInfo.systemUptime >= self.recoveryBootDeadline) {
            self.recoveryFailed = YES;
            [self recordConnection:@"recovery_boot_timeout" code:NSURLErrorTimedOut];
            [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]];
        }
        else if (self.healthAttempts < 600) {
            if (self.healthAttempts > 5) self.status.text = [NSString stringWithFormat:@"BIBIMER · Waiting for local Linux…\n%@ (HTTP %ld)",error.localizedDescription ?: @"Starting bridge",(long)response.statusCode];
            NSUInteger epoch = self.connectionEpoch;
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW,NSEC_PER_SEC),dispatch_get_main_queue(), ^{
                if (epoch == self.connectionEpoch) [self checkHealth];
            });
        } else [self fail:@"Local setup did not finish. Check the installation output, then reopen Bibimer to retry. Existing files are kept."];
    }
}

- (BOOL)startLinuxServices {
    BOOL started = self.runtimeControlFD >= 0 && write(self.runtimeControlFD,"start\n",6) == 6;
    [self recordConnection:@"service_start" code:started ? 0 : self.runtimeControlFD < 0 ? EBADF : errno];
    return started;
}

- (void)recoverLinux {
    if (self.recovering || self.exited || !self.runtimeStarted || self.runtimeControlFD < 0) return;
    self.recovering = YES; self.ready = NO; self.recoveryAttempted = YES;
    self.recoveryFailed = NO; self.recoveryTimedOut = NO;
    self.connectionEpoch++;
    NSUInteger recovery = ++self.recoverySerial;
    [self recordConnection:@"recovery_start" code:0];
    [self.healthTask cancel]; self.healthTask = nil;
    [self.backgroundExecution runtimeStopped];
    // This recovery abandons old executions. Unlike transport-only reconnect,
    // cancel queued writes too, before a new server can accept them at this port.
    [self.http invalidateAndCancel];
    // Earlier transport-only retries may still contain submitted writes. They
    // must also be cancelled before the replacement server uses the same port.
    for (NSURLSession *transport in self.retiredHTTP.allObjects) [transport invalidateAndCancel];
    [self.retiredHTTP removeAllObjects];
    self.http = [self newHTTPTransport];
    [self.completionNotifications pause]; [self.voice pause]; [self.browser revokeAll];
    self.browserEpoch++; self.browserPolling = NO; [self.browserPoll cancel]; self.browserPoll = nil;
    [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]];
    // Shutdown runs away from UIKit. A new bridge is started only after every
    // old guest task except the fixed PID 1 supervisor is confirmed stopped.
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW,15*NSEC_PER_SEC),dispatch_get_main_queue(), ^{
        if (!self.recovering || recovery != self.recoverySerial) return;
        self.recoveryTimedOut = YES; self.recoveryFailed = YES;
        [self recordConnection:@"recovery_watchdog" code:0];
        [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]];
    });
    dispatch_async(self.runtimeQueue, ^{
        int result = bibimer_stop_guest_children();
        dispatch_async(dispatch_get_main_queue(), ^{
            if (recovery != self.recoverySerial) return;
            self.recovering = NO;
            [self recordConnection:@"recovery_stopped" code:result];
            if (result != 0 || self.recoveryTimedOut || self.exited) {
                self.recoveryFailed = YES;
                [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]];
                return;
            }
            self.hasConnected = NO; self.recoveryAllowed = NO; self.healthAttempts = 0;
            self.recoveryBootDeadline = NSProcessInfo.processInfo.systemUptime + 15;
            self.recoveryFailed = ![self startLinuxServices];
            [self replaceHTTPTransport];
            [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]];
            [self checkHealth];
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW,15*NSEC_PER_SEC),dispatch_get_main_queue(), ^{
                if (recovery != self.recoverySerial || self.ready || self.recoveryFailed || self.exited || self.backgrounded ||
                    self.recoveryBootDeadline == 0 || NSProcessInfo.processInfo.systemUptime < self.recoveryBootDeadline) return;
                self.recoveryFailed = YES;
                [self recordConnection:@"recovery_boot_timeout" code:NSURLErrorTimedOut];
                [self.healthTask cancel]; self.healthTask = nil;
                [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]];
            });
        });
    });
}

- (NSDictionary *)environment {
    NSUserDefaults *preferences = NSUserDefaults.standardUserDefaults;
    NSString *preference = [preferences stringForKey:@"languagePreference"] ?: @"system";
    NSString *language = [preference isEqual:@"system"] ? systemLanguage() : preference;
    NSMutableDictionary *environment=[@{@"selfTest":@(self.smokeScript != nil),@"paired":@YES,@"termuxInstalled":@YES,@"platform":@"ios",@"notifications":@{@"enabled":@NO,@"allowed":@NO,@"state":@"unsupported"},@"language":language,@"systemLanguage":systemLanguage(),@"languagePreference":preference,@"agentOptions":[preferences dictionaryForKey:@"agentOptions"] ?: @{},@"enterBehavior":[preferences stringForKey:@"enterBehavior"] ?: @"newline",@"responseDelivery":[[preferences stringForKey:@"responseDelivery"] isEqual:@"steer"] ? @"steer" : @"queue",@"contextDisplay":[[preferences stringForKey:@"contextDisplay"] isEqual:@"remaining"] ? @"remaining" : @"used",@"lastProjectParent":[preferences stringForKey:@"lastProjectParent"] ?: @"/root/projects",@"lastProjectFolder":[preferences stringForKey:@"lastProjectFolder"] ?: @"/root/projects",@"quickSetup":@{@"phase":@"connected",@"id":@"embedded"},@"bundledBridgeVersion":[NSBundle.mainBundle objectForInfoDictionaryKey:@"BibimerBridgeVersion"] ?: @"unknown",@"version":@"0.1.0-ios"} mutableCopy];
    [environment addEntriesFromDictionary:[self.voice environment] ?: @{}];
    environment[@"localRuntime"] = @{@"state":self.exited ? @"stopped" : self.startupFailed ? @"restart-required" : self.recoveryFailed ? @"recovery-failed" : (self.recovering || (self.recoveryAttempted && !self.hasConnected)) ? @"restarting" : self.ready ? @"connected" : @"connecting", @"foreground":@(!self.backgrounded), @"phase":self.recovering ? @"stopping" : (self.recoveryAttempted && !self.hasConnected) ? @"starting" : self.ready ? @"connected" : @"checking", @"busy":@(!self.recoveryFailed && (self.recovering || (!self.exited && !self.startupFailed && !self.backgrounded && !self.ready)))};
    environment[@"screenBehavior"] = @{@"keepAwake":@([preferences boolForKey:@"iosKeepAwake"]),@"deferHomeGesture":@([preferences boolForKey:@"iosDeferHomeGesture"]),@"supported":@(!usesDesktopInput())};
    environment[@"backgroundWork"] = [self.backgroundExecution environment] ?: @{};
    environment[@"termuxX11Installed"]=@YES;
    environment[@"notifications"]=[self.completionNotifications environment] ?: @{};
    environment[@"notificationTarget"]=[NSJSONSerialization JSONObjectWithData:[[self.completionNotifications pendingTarget] dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil] ?: @{};
    return environment;
}

- (void)loadWorkspace {
    if (self.web) return;
    WKWebViewConfiguration *configuration = [WKWebViewConfiguration new];
    configuration.ignoresViewportScaleLimits = NO;
    [configuration.userContentController addScriptMessageHandler:self name:@"bibimer"];
    NSString *shim = [NSString stringWithContentsOfURL:[NSBundle.mainBundle URLForResource:@"native" withExtension:@"js"] encoding:NSUTF8StringEncoding error:nil];
    NSString *source = [[@"window.__bibimerEnvironment=" stringByAppendingString:jsonString([self environment])] stringByAppendingFormat:@";\n%@",shim];
    [configuration.userContentController addUserScript:[[WKUserScript alloc] initWithSource:source injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:YES]];
    self.web = [[BibimerWorkspaceWebView alloc] initWithFrame:CGRectZero configuration:configuration];
    self.web.navigationDelegate = self; self.web.opaque = NO; self.web.backgroundColor = self.view.backgroundColor;
    self.web.allowsBackForwardNavigationGestures = NO;
    self.web.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    self.web.scrollView.delegate = self;
    self.web.scrollView.bounces = NO;
    self.web.scrollView.alwaysBounceHorizontal = NO;
    self.web.scrollView.pinchGestureRecognizer.enabled = NO;
    if (usesDesktopInput()) {
        self.web.scrollView.alwaysBounceVertical = NO;
    }
    self.web.accessibilityIdentifier = @"bibimerWorkspace"; self.web.translatesAutoresizingMaskIntoConstraints = NO;
#if TARGET_OS_SIMULATOR
    if (@available(iOS 16.4,*)) self.web.inspectable = YES;
#endif
    [self.view addSubview:self.web];
    // Desktop input must not reserve space for an iOS onscreen keyboard.
    NSLayoutYAxisAnchor *bottom = usesDesktopInput() ? self.view.safeAreaLayoutGuide.bottomAnchor : self.view.keyboardLayoutGuide.topAnchor;
    [NSLayoutConstraint activateConstraints:@[
        [self.web.topAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.topAnchor],
        [self.web.leadingAnchor constraintEqualToAnchor:self.view.leadingAnchor],
        [self.web.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor],
        [self.web.bottomAnchor constraintEqualToAnchor:bottom]
    ]];
    NSURL *ui = [NSBundle.mainBundle URLForResource:@"Web" withExtension:nil];
    [self.web loadFileURL:[ui URLByAppendingPathComponent:@"index.html"] allowingReadAccessToURL:ui];
}

- (void)restoreWorkspaceOrigin {
    if (!self.web) return;
    UIScrollView *scroll = self.web.scrollView;
    CGFloat scale = scroll.zoomScale, minimum = scroll.minimumZoomScale;
    // Keep the app shell fixed horizontally. DOM panels keep their own scroll;
    // leave temporary native scale transitions alone while layout settles.
    if (scroll.isZooming || scale < minimum - 0.001 || scale > minimum + 0.001) return;
    CGPoint origin = scroll.contentOffset;
    origin.x = -scroll.adjustedContentInset.left;
    if (usesDesktopInput() && scroll.contentSize.height <= scroll.bounds.size.height + 1)
        origin.y = -scroll.adjustedContentInset.top;
    if (fabs(origin.x - scroll.contentOffset.x) <= 0.5 && fabs(origin.y - scroll.contentOffset.y) <= 0.5) return;
    [scroll setContentOffset:origin animated:NO];
}

- (void)scrollViewDidScroll:(UIScrollView *)scrollView {
    if (scrollView == self.web.scrollView) [self restoreWorkspaceOrigin];
}

- (void)viewDidLayoutSubviews {
    [super viewDidLayoutSubviews];
    [self restoreWorkspaceOrigin];
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    self.status.hidden = YES; self.bootstrapOutput.hidden = YES;
    webView.hidden = NO;
    [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]];
    if (self.exited) return;
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
    if ([@[@"/v1/browser",@"/v1/project",@"/v1/project/manage",@"/v1/github",@"/v1/inspect",@"/v1/git",@"/v1/folders",@"/v1/session-history",@"/v1/commands",@"/v1/models",@"/v1/project-agent",@"/v1/project-session",@"/v1/worktrees/manage",@"/v1/worktrees",@"/v1/sessions",@"/v1/agent-connections",@"/v1/agent-updates",@"/v1/ios/agents"] containsObject:route]) return YES;
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
    NSUInteger rejected = (message.webView != self.web ? 1 : 0) | (!message.frameInfo.mainFrame ? 2 : 0) |
        (!source.isFileURL ? 4 : 0) | (![source.URLByStandardizingPath.URLByResolvingSymlinksInPath.path isEqual:index.URLByResolvingSymlinksInPath.path] ? 8 : 0) |
        (![message.body isKindOfClass:NSDictionary.class] ? 16 : 0);
    if (rejected) { [self recordConnection:@"message_rejected" code:rejected]; return; }
    NSDictionary *body = message.body;
    NSString *action = body[@"action"];
    if ([action isEqual:@"backgroundConfigure"]) {
        id value = body[@"enabled"];
        if (![value isKindOfClass:NSNumber.class] || CFGetTypeID((__bridge CFTypeRef)value) != CFBooleanGetTypeID()) return;
        [self.backgroundExecution configure:[value boolValue]];
        if ([value boolValue] && !self.smokeScript) [self.backgroundExecution userInitiatedWork];
    }
    else if ([action isEqual:@"screenPreference"]) {
        NSDictionary *keys = @{@"keepAwake":@"iosKeepAwake",@"deferHomeGesture":@"iosDeferHomeGesture"};
        NSString *key = [body[@"key"] isKindOfClass:NSString.class] ? keys[body[@"key"]] : nil;
        id value = body[@"value"];
        if (!key || ![value isKindOfClass:NSNumber.class] || CFGetTypeID((__bridge CFTypeRef)value) != CFBooleanGetTypeID()) return;
        [NSUserDefaults.standardUserDefaults setBool:[value boolValue] forKey:key];
        [self applyScreenBehavior];
    }
    else if ([action isEqual:@"reconnect"]) {
        [self requestReconnect];
    }
    else if ([action isEqual:@"connectionDiagnostics"]) {
        [self recordConnection:@"diagnostics_copy" code:0];
        NSData *data = [NSJSONSerialization dataWithJSONObject:@{@"schema":@1,@"events":self.connectionLog ?: @[]} options:NSJSONWritingPrettyPrinted error:nil];
        NSString *text = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
        if (self.smokeScript) self.testClipboard = text;
        else UIPasteboard.generalPasteboard.string = text;
        [self nativeEvent:@"BibimerIOSDiagnosticsCopied" arguments:@[]];
    }
    else if ([@[@"voiceStart",@"voiceCancel",@"voiceConfigure",@"voiceKey",@"speechContext",@"speechStop",@"speechRead",@"speechVoices",@"speechConfigure"] containsObject:action]) {
        if(!self.smokeScript)[self.voice handle:body];
    } else if([action isEqual:@"browserWindow"] && [body[@"tag"] isKindOfClass:NSString.class]) { [self.browser showTag:body[@"tag"]];
    } else if([action isEqual:@"notificationConfigure"] && [body[@"enabled"] isKindOfClass:NSNumber.class]) {
        if(!self.smokeScript)[self.completionNotifications configure:[body[@"enabled"] boolValue]];
    } else if([action isEqual:@"notificationConnected"]) {
        if(!self.smokeScript)[self.completionNotifications connected:[body[@"supported"] boolValue]];
    } else if([action isEqual:@"notificationSettings"]){if(!self.smokeScript)[self.completionNotifications openSettings];}
    else if([action isEqual:@"notificationTaken"]){[self.completionNotifications takeTarget];}
    else if ([action isEqual:@"readClipboard"]) {
        NSString *identifier = body[@"id"];
        if (![identifier isKindOfClass:NSString.class] || [identifier rangeOfString:@"^[a-f0-9]{32}:[0-9]{1,16}$" options:NSRegularExpressionSearch].location == NSNotFound) return;
        [self readClipboard:identifier webView:message.webView];
    } else if ([action isEqual:@"request"]) {
        NSString *identifier = body[@"id"], *method = body[@"method"], *path = body[@"path"], *payload = body[@"body"];
        if (![identifier isKindOfClass:NSString.class] || identifier.length > 80) return;
        if (self.smokeScript && [method isEqual:@"GET"] && [path isEqual:@"/native/test-background-work"]) {
            [self.backgroundExecution runSelfTestsWithCompletion:^(NSDictionary *result) {
                NSString *base = @"/v1/sessions/00000000-0000-4000-8000-000000000001/";
                BOOL boundary = startsBackgroundWork(@"POST",@"/v1/ios/agents",@"{\"action\":\"install\"}") &&
                    startsBackgroundWork(@"POST",[base stringByAppendingString:@"message"],@"{\"text\":\"test\"}") &&
                    !startsBackgroundWork(@"GET",@"/v1/health",@"{}") &&
                    !startsBackgroundWork(@"POST",@"/v1/ios/agents",@"{\"action\":\"login\"}") &&
                    !startsBackgroundWork(@"POST",[base stringByAppendingString:@"input"],@"{\"data\":\"test\"}") &&
                    !startsBackgroundWork(@"POST",[base stringByAppendingString:@"queue"],@"{\"action\":\"pause\"}") &&
                    !startsBackgroundWork(@"POST",@"/v1/sessions",@"{\"mode\":\"terminal\"}");
                NSMutableDictionary *checked = [result mutableCopy]; checked[@"requestBoundary"] = @(boundary);
                checked[@"ok"] = @([result[@"ok"] boolValue] && boundary);
                [self reply:identifier status:200 data:checked];
            }]; return;
        }
        if (self.smokeScript && [method isEqual:@"GET"] && [path isEqual:@"/native/test-screen"]) {
            [self reply:identifier status:200 data:@{@"idleTimerDisabled":@(UIApplication.sharedApplication.idleTimerDisabled),@"homeDeferred":@(self.preferredScreenEdgesDeferringSystemGestures == UIRectEdgeBottom),@"supported":@(!usesDesktopInput())}]; return;
        }
        if (self.smokeScript && [method isEqual:@"GET"] && [path isEqual:@"/native/test-scroll-lock"]) {
            UIScrollView *scroll = self.web.scrollView;
            CGPoint original = scroll.contentOffset;
            [scroll setContentOffset:CGPointMake(48, original.y) animated:NO];
            [self restoreWorkspaceOrigin];
            BOOL locked = fabs(scroll.contentOffset.x + scroll.adjustedContentInset.left) < 0.5;
            [scroll setContentOffset:original animated:NO];
            [self reply:identifier status:200 data:@{@"horizontalLocked":@(locked),@"historyGesturesDisabled":@(!self.web.allowsBackForwardNavigationGestures),@"pinchEnabled":@(scroll.pinchGestureRecognizer.enabled)}]; return;
        }
        if (self.smokeScript && [method isEqual:@"POST"] && [path isEqual:@"/native/test-connection"]) {
            NSDictionary *fixture = [NSJSONSerialization JSONObjectWithData:[payload dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
            NSString *mode = [fixture isKindOfClass:NSDictionary.class] ? fixture[@"mode"] : nil;
            if ([mode isEqual:@"offline"]) { self.testRecoveryWorkspace = self.web; self.testConnectionOffline = YES; }
            else if ([mode isEqual:@"online"]) self.testConnectionOffline = NO;
            else if (![mode isEqual:@"observe"]) { [self reply:identifier status:400 data:@{}]; return; }
            [self reply:identifier status:200 data:@{@"sameWorkspace":@(self.web == self.testRecoveryWorkspace),@"ready":@(self.ready),@"visible":@(!self.web.hidden)}]; return;
        }
        if (self.smokeScript && [method isEqual:@"POST"] && [path isEqual:@"/native/test-lifecycle"]) {
            NSDictionary *fixture = [NSJSONSerialization JSONObjectWithData:[payload dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
            NSString *mode = [fixture isKindOfClass:NSDictionary.class] ? fixture[@"mode"] : nil;
            if ([@[@"background",@"inactive",@"manual",@"stalled-health"] containsObject:mode ?: @""]) {
                self.testRecoveryWorkspace = self.web; self.testRecoveryTransport = self.http;
                [self.healthTask cancel];
                // Hold an unfinished probe, a paused read and an unsent write.
                // No fixture write is ever resumed or delivered to the bridge.
                self.healthTask = [self.http dataTaskWithRequest:[self request:@"GET" path:@"/v1/health" body:nil]];
                NSURLSessionDataTask *heldHealth = self.healthTask;
                self.testRecoveryRead = [self.http dataTaskWithRequest:[self request:@"GET" path:@"/v1/health" body:nil]];
                [self.testRecoveryRead resume]; [self.testRecoveryRead suspend];
                self.testRecoveryWrite = [self.http dataTaskWithRequest:[self request:@"POST" path:@"/v1/health" body:@"{}"]];
                if ([mode isEqual:@"manual"]) [self retryConnection];
                else if ([mode isEqual:@"stalled-health"]) {
                    self.ready = NO;
                    [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]];
                    [self expireHealthTask:self.healthTask epoch:self.connectionEpoch];
                }
                else if ([mode isEqual:@"inactive"]) [self becameInactive];
                else [self enteredBackground];
                BOOL cleared = self.healthTask != heldHealth;
                [self checkHealth];
                NSURLSessionDataTask *currentHealth = self.healthTask;
                NSURLSession *currentTransport = self.http;
                [self expireHealthTask:heldHealth epoch:self.connectionEpoch];
                BOOL staleIgnored = self.healthTask == currentHealth && self.http == currentTransport;
                [self reply:identifier status:200 data:@{@"pendingHealthCleared":@(cleared),@"staleWatchdogIgnored":@(staleIgnored),@"ready":@(self.ready),@"freshTransport":@(self.http != self.testRecoveryTransport),@"sameWorkspace":@(self.web == self.testRecoveryWorkspace)}]; return;
            }
            if ([mode isEqual:@"active"]) {
                [self becameActive];
                [self reply:identifier status:200 data:@{@"freshTransport":@(self.http != self.testRecoveryTransport),@"sameWorkspace":@(self.web == self.testRecoveryWorkspace)}]; return;
            }
            if ([mode isEqual:@"observe"]) {
                BOOL readCancelled = self.testRecoveryRead.state == NSURLSessionTaskStateCanceling || self.testRecoveryRead.state == NSURLSessionTaskStateCompleted;
                BOOL writeUnsent = self.testRecoveryWrite.state == NSURLSessionTaskStateSuspended;
                [self reply:identifier status:200 data:@{@"oldReadCancelled":@(readCancelled),@"writeUnsent":@(writeUnsent),@"ready":@(self.ready),@"readState":@(self.testRecoveryRead.state),@"writeState":@(self.testRecoveryWrite.state)}];
                [self.testRecoveryWrite cancel]; self.testRecoveryWrite = nil; self.testRecoveryRead = nil; self.testRecoveryTransport = nil;
                return;
            }
            [self reply:identifier status:400 data:@{}]; return;
        }
        if (self.smokeScript && [method isEqual:@"POST"] && [path isEqual:@"/native/test-retry-window"]) {
            self.backgrounded = YES; self.ready = NO; self.healthAttempts = 0;
            NSTimeInterval start = NSProcessInfo.processInfo.systemUptime;
            self.connectionStartedAt = start;
            [self requestReconnect];
            BOOL immediate = [self shouldRecoverAfterHealthFailure];
            NSURLSessionDataTask *probe = self.healthTask;
            [self requestReconnect];
            BOOL joined = self.healthTask == probe && self.healthAttempts == 1;
            self.recoveryAttempted = YES;
            BOOL bounded = ![self shouldRecoverAfterHealthFailure];
            self.recoveryAttempted = NO;
            [self reply:identifier status:200 data:@{@"foregroundReconciled":@(!self.backgrounded),@"windowKept":@(self.connectionStartedAt == start),@"immediateRecovery":@(immediate),@"joinedProbe":@(joined),@"automaticAttemptBounded":@(bounded)}];
            return;
        }
        if (self.smokeScript && [method isEqual:@"POST"] && [path isEqual:@"/native/test-linux-recovery"]) {
            self.testRecoveryWorkspace = self.web;
            self.testRecoveryWrite = [self.http dataTaskWithRequest:[self request:@"POST" path:@"/v1/health" body:@"{}"]];
            [self replaceHTTPTransport];
            [self reply:identifier status:200 data:@{@"accepted":@YES}];
            dispatch_async(dispatch_get_main_queue(), ^{ [self recoverLinux]; });
            return;
        }
        if (self.smokeScript && [method isEqual:@"GET"] && [path isEqual:@"/native/test-linux-recovery"]) {
            BOOL writeCancelled = self.testRecoveryWrite.state == NSURLSessionTaskStateCanceling || self.testRecoveryWrite.state == NSURLSessionTaskStateCompleted;
            [self reply:identifier status:200 data:@{@"sameWorkspace":@(self.testRecoveryWorkspace == self.web),@"ready":@(self.ready),@"failed":@(self.recoveryFailed),@"oldWriteCancelled":@(writeCancelled)}];
            return;
        }
        if (self.smokeScript && [method isEqual:@"GET"] && [path isEqual:@"/native/test-late-health"]) {
            BOOL exited = self.exited, ready = self.ready, statusHidden = self.status.hidden, outputHidden = self.bootstrapOutput.hidden, webHidden = self.web.hidden;
            WKWebView *workspace = self.web;
            self.exited = YES; self.ready = NO; self.status.hidden = NO; self.bootstrapOutput.hidden = NO;
            NSHTTPURLResponse *late = [[NSHTTPURLResponse alloc] initWithURL:[NSURL URLWithString:@"http://127.0.0.1/"] statusCode:200 HTTPVersion:@"HTTP/1.1" headerFields:nil];
            [self handleHealthJSON:@{@"protocol":@1} response:late error:nil];
            BOOL ignored = !self.ready && self.web == workspace;
            [self webView:workspace didFinishNavigation:nil];
            BOOL failureVisible = self.exited && !self.ready && !self.web.hidden && self.web == workspace;
            self.exited = exited; self.ready = ready; self.status.hidden = statusHidden; self.bootstrapOutput.hidden = outputHidden; self.web.hidden = webHidden;
            [self nativeEvent:@"BibimerIOSRuntimeChanged" arguments:@[]];
            if (ready && !exited) [self nativeEvent:@"BibimerResume" arguments:@[]];
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
        if (self.exited || self.backgrounded || self.recovering || self.recoveryFailed || self.testConnectionOffline) { [self reply:identifier status:503 data:@{@"code":@"error_connection_failed"}]; return; }
        BOOL workRequest = !self.smokeScript && startsBackgroundWork(method,path,payload);
        NSString *backgroundToken = workRequest ? [self.backgroundExecution beginUserRequest] : nil;
        NSMutableURLRequest *request = [self request:method path:path body:payload];
        if ([path isEqual:@"/v1/health"]) request.timeoutInterval = 2;
        NSUInteger requestEpoch = self.connectionEpoch;
        __block NSURLSessionDataTask *task;
        task = [self.http dataTaskWithRequest:request completionHandler:^(NSData *data,NSURLResponse *response,NSError *error) {
            dispatch_async(dispatch_get_main_queue(), ^{ [self.polls removeObject:task]; });
            NSDictionary *json = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
            NSInteger status = [(NSHTTPURLResponse *)response statusCode];
            if (backgroundToken)
                dispatch_async(dispatch_get_main_queue(),^{ [self.backgroundExecution endUserRequest:backgroundToken]; });
            [self reply:identifier status:error ? 503 : status data:json ?: @{@"code":@"error_connection_failed"}];
            // Visible connection loss also enters the native recovery path;
            // returning from the background and tapping Retry are not required.
            if (error && error.code != NSURLErrorCancelled && [method isEqual:@"GET"] &&
                ([path isEqual:@"/v1/health"] || [path containsString:@"/events?"])) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    if (requestEpoch != self.connectionEpoch || !self.ready || self.backgrounded || self.exited || self.recovering) return;
                    self.recoveryAllowed = self.hasConnected && !self.recoveryAttempted;
                    [self retryConnection];
                });
            }
        }];
        if ([path containsString:@"/events?"]) [self.polls addObject:task];
        [task resume];
    } else if ([action isEqual:@"preference"]) {
        NSString *key = body[@"key"];
        id value = body[@"value"];
        if ([key isEqual:@"contextDisplay"] && (![value isKindOfClass:NSString.class] || ![@[@"used", @"remaining"] containsObject:value])) return;
        if ([key isEqual:@"responseDelivery"] && (![value isKindOfClass:NSString.class] || ![@[@"queue", @"steer"] containsObject:value])) return;
        BOOL validType = [key isEqual:@"agentOptions"] ? [value isKindOfClass:NSDictionary.class] : [value isKindOfClass:NSString.class];
        if (validType && [@[@"languagePreference",@"enterBehavior",@"responseDelivery",@"contextDisplay",@"lastProjectParent",@"lastProjectFolder",@"agentOptions"] containsObject:key] && [NSPropertyListSerialization propertyList:value isValidForFormat:NSPropertyListBinaryFormat_v1_0] && jsonString(value).length < 32768)
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

@interface BibimerSceneDelegate : UIResponder <UIWindowSceneDelegate>
@property(nonatomic,strong) UIWindow *window;
@end
@implementation BibimerSceneDelegate
- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)session options:(UISceneConnectionOptions *)options {
    if (![scene isKindOfClass:UIWindowScene.class]) return;
    self.window = [[UIWindow alloc] initWithWindowScene:(UIWindowScene *)scene];
    // Reconnecting the single scene must not start a second Linux runtime.
    if (!activeController) activeController = [BibimerController new];
    self.window.rootViewController = activeController;
    [self.window makeKeyAndVisible];
}
- (void)sceneDidEnterBackground:(UIScene *)scene { [activeController enteredBackground]; }
- (void)sceneWillResignActive:(UIScene *)scene { [activeController becameInactive]; }
- (void)sceneDidBecomeActive:(UIScene *)scene { [activeController becameActive]; }
@end

@interface AppDelegate : UIResponder <UIApplicationDelegate>
@end
@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)options {
    [BibimerBackgroundExecution.shared registerAtLaunch];
    return YES;
}
- (UISceneConfiguration *)application:(UIApplication *)application configurationForConnectingSceneSession:(UISceneSession *)session options:(UISceneConnectionOptions *)options {
    UISceneConfiguration *configuration = [[UISceneConfiguration alloc] initWithName:@"Bibimer" sessionRole:session.role];
    configuration.delegateClass = BibimerSceneDelegate.class;
    return configuration;
}
@end

int main(int argc,char *argv[]) { @autoreleasepool { return UIApplicationMain(argc,argv,nil,NSStringFromClass(AppDelegate.class)); } }
