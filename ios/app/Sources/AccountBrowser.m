#import "AccountBrowser.h"

// Only the reviewed Claude manual challenge may enable clipboard collection.
static NSString *claudeChallengeState(NSString *value) {
    if (![value isKindOfClass:NSString.class] || value.length > 8192) return nil;
    NSURLComponents *url = [NSURLComponents componentsWithString:value];
    if (![url.scheme isEqual:@"https"] || url.user || url.password || url.port || url.fragment) return nil;
    BOOL trusted = ([url.host isEqual:@"claude.com"] && [url.path isEqual:@"/cai/oauth/authorize"]) ||
        ([url.host isEqual:@"claude.ai"] && [url.path isEqual:@"/oauth/authorize"]) ||
        ([url.host isEqual:@"platform.claude.com"] && [url.path isEqual:@"/oauth/authorize"]);
    if (!trusted) return nil;
    NSMutableDictionary *query = [NSMutableDictionary new];
    for (NSURLQueryItem *item in url.queryItems) {
        if (query[item.name] || !item.value) return nil;
        query[item.name] = item.value;
    }
    NSString *state = query[@"state"];
    if (![query[@"redirect_uri"] isEqual:@"https://platform.claude.com/oauth/code/callback"] ||
        ![query[@"response_type"] isEqual:@"code"] || ![query[@"code_challenge_method"] isEqual:@"S256"] ||
        !state || [state rangeOfString:@"\\A[A-Za-z0-9_-]{16,256}\\z" options:NSRegularExpressionSearch].location == NSNotFound) return nil;
    return state;
}
static NSString *claudeClipboardCode(NSString *raw, NSString *state) {
    if (![raw isKindOfClass:NSString.class] || !state.length || raw.length > 4096) return nil;
    NSString *code = [raw stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
    NSArray *parts = [code componentsSeparatedByString:@"#"];
    if (parts.count != 2 || ![parts[1] isEqual:state] ||
        [parts[0] rangeOfString:@"\\A[A-Za-z0-9_-]{1,2048}\\z" options:NSRegularExpressionSearch].location == NSNotFound) return nil;
    return code;
}

@interface BibimerAccountBrowser ()
@property SFSafariViewController *browser;
@property NSString *job;
@property(copy) void (^completion)(NSInteger);
@property(copy) void (^codeCompletion)(NSString *);
@property NSString *codeJob;
@property NSString *codeState;
@property NSDate *codeDeadline;
@property NSInteger clipboardCount;
@property NSString *clipboardJob;
@property NSTimer *clipboardTimer;
@end

@implementation BibimerAccountBrowser
- (BOOL)watchCodeForURL:(NSString *)url job:(NSString *)job completion:(void (^)(NSString *))completion {
    NSString *state = claudeChallengeState(url);
    if (!state || ![job isKindOfClass:NSString.class] || ![[NSUUID alloc] initWithUUIDString:job] || self.codeCompletion) return NO;
    self.codeState = state; self.codeJob = job; self.codeCompletion = completion;
    if (![self.clipboardJob isEqual:job] || ![self.job isEqual:job]) self.clipboardCount = UIPasteboard.generalPasteboard.changeCount;
    self.clipboardJob = job;
    self.codeDeadline = [NSDate dateWithTimeIntervalSinceNow:600];
    __weak typeof(self) weak = self;
    self.clipboardTimer = [NSTimer scheduledTimerWithTimeInterval:0.5 repeats:YES block:^(NSTimer *timer) { [weak checkClipboard]; }];
    return YES;
}
- (void)stopCodeWatch {
    [self.clipboardTimer invalidate]; self.clipboardTimer = nil;
    self.codeCompletion = nil; self.codeJob = nil; self.codeState = nil; self.codeDeadline = nil;
}
- (void)checkClipboard {
    if (!self.codeCompletion) return;
    if (self.codeDeadline.timeIntervalSinceNow <= 0) {
        void (^done)(NSString *) = self.codeCompletion; [self stopCodeWatch]; done(nil); return;
    }
    if (![self.job isEqual:self.codeJob] || !self.browser.viewIfLoaded.window ||
        UIApplication.sharedApplication.applicationState != UIApplicationStateActive || UIScreen.mainScreen.isCaptured) return;
    NSInteger count = UIPasteboard.generalPasteboard.changeCount;
    if (count == self.clipboardCount) return;
    // Read once per new copy, only during this explicit authentication flow.
    // iOS retains control of paste permission. Never clear the user's clipboard.
    void (^done)(NSString *) = self.codeCompletion;
    NSString *job = self.codeJob, *state = self.codeState;
    NSString *code = claudeClipboardCode(UIPasteboard.generalPasteboard.string, state);
    // A paste permission prompt may have changed the document/connection.
    if (self.codeCompletion != done || ![self.codeJob isEqual:job]) return;
    self.clipboardCount = count;
    if (!code) return;
    [self stopCodeWatch]; [self close:job]; done(code);
}
- (void)open:(NSString *)value job:(NSString *)job completion:(void (^)(NSInteger))completion {
    NSURL *url = [value isKindOfClass:NSString.class] ? [NSURL URLWithString:value] : nil;
    if (!url || ![url.scheme.lowercaseString isEqual:@"https"] || !url.host.length ||
        url.user.length || url.password.length || value.length > 8192 ||
        ![job isKindOfClass:NSString.class] || ![[NSUUID alloc] initWithUUIDString:job]) { completion(1); return; }
    if (UIApplication.sharedApplication.applicationState != UIApplicationStateActive) { completion(2); return; }
    if (self.browser && self.presenter.presentedViewController == self.browser) {
        completion([self.job isEqual:job] && self.browser.viewIfLoaded.window ? 0 : 3); return;
    }
    if (self.completion) { completion(3); return; }
    // A dismissed or rejected presentation must not occupy the browser slot.
    self.browser = nil; self.job = nil;
    if (self.presenter.presentedViewController) { completion(3); return; }
    if (!self.presenter.viewIfLoaded.window) { completion(4); return; }
    SFSafariViewController *browser = [[SFSafariViewController alloc] initWithURL:url];
    browser.modalPresentationStyle = UIModalPresentationFullScreen;
    browser.delegate = self;
    browser.dismissButtonStyle = SFSafariViewControllerDismissButtonStyleDone;
    browser.preferredControlTintColor = [UIColor colorWithRed:0.843 green:0.91 blue:0.667 alpha:1];
    self.browser = browser; self.job = job;
    self.completion = completion;
    __weak typeof(self) weak = self;
    [self.presenter presentViewController:browser animated:YES completion:^{
        if (weak.browser != browser || !weak.completion) return;
        [weak finish:weak.presenter.presentedViewController == browser && browser.viewIfLoaded.window ? 0 : 5];
    }];
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 2*NSEC_PER_SEC), dispatch_get_main_queue(), ^{
        if (weak.browser != browser || !weak.completion) return;
        [weak finish:weak.presenter.presentedViewController == browser && browser.viewIfLoaded.window ? 0 : 5];
    });
}
- (void)finish:(NSInteger)reason {
    void (^done)(NSInteger) = self.completion; self.completion = nil;
    if (reason) [self close:self.job];
    if (done) done(reason);
}
- (void)close:(NSString *)job {
    if ([self.codeJob isEqual:job]) {
        void (^copied)(NSString *) = self.codeCompletion; [self stopCodeWatch]; if (copied) copied(nil);
    }
    if (![self.job isEqual:job]) return;
    SFSafariViewController *browser = self.browser;
    void (^done)(NSInteger) = self.completion; self.completion = nil;
    self.browser = nil; self.job = nil;
    self.clipboardJob = nil;
    if (self.presenter.presentedViewController == browser) [browser dismissViewControllerAnimated:YES completion:nil];
    if (done) done(6);
}
- (void)safariViewControllerDidFinish:(SFSafariViewController *)controller {
    if (self.browser != controller) { [controller dismissViewControllerAnimated:YES completion:nil]; return; }
    [self checkClipboard];
    if (self.browser == controller) [self close:self.job];
}
- (void)cancelOpening:(NSString *)job {
    if (self.completion && !self.browser.viewIfLoaded.window) [self close:job];
}
- (void)dealloc { [self.clipboardTimer invalidate]; }
@end
