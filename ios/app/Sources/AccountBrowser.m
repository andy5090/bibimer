#import "AccountBrowser.h"

@interface BibimerAccountBrowser ()
@property SFSafariViewController *browser;
@property NSString *job;
@property(copy) void (^completion)(NSInteger);
@end

@implementation BibimerAccountBrowser
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
    if (![self.job isEqual:job]) return;
    SFSafariViewController *browser = self.browser;
    void (^done)(NSInteger) = self.completion; self.completion = nil;
    self.browser = nil; self.job = nil;
    if (self.presenter.presentedViewController == browser) [browser dismissViewControllerAnimated:YES completion:nil];
    if (done) done(6);
}
- (void)safariViewControllerDidFinish:(SFSafariViewController *)controller {
    if (self.browser == controller) [self close:self.job];
    else [controller dismissViewControllerAnimated:YES completion:nil];
}
- (void)cancelOpening:(NSString *)job {
    if (self.completion && !self.browser.viewIfLoaded.window) [self close:job];
}
@end
