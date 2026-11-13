#import "AccountBrowser.h"

@interface BibimerAccountBrowser ()
@property SFSafariViewController *browser;
@property NSString *job;
@end

@implementation BibimerAccountBrowser
- (BOOL)open:(NSString *)value job:(NSString *)job {
    NSURL *url = [value isKindOfClass:NSString.class] ? [NSURL URLWithString:value] : nil;
    if (!url || ![url.scheme.lowercaseString isEqual:@"https"] || !url.host.length ||
        url.user.length || url.password.length || value.length > 8192 ||
        ![job isKindOfClass:NSString.class] || ![[NSUUID alloc] initWithUUIDString:job] ||
        UIApplication.sharedApplication.applicationState != UIApplicationStateActive) return NO;
    if (self.browser) return [self.job isEqual:job] && self.presenter.presentedViewController == self.browser;
    if (self.presenter.presentedViewController) return NO;
    SFSafariViewController *browser = [[SFSafariViewController alloc] initWithURL:url];
    browser.modalPresentationStyle = UIModalPresentationFullScreen;
    browser.delegate = self;
    browser.dismissButtonStyle = SFSafariViewControllerDismissButtonStyleDone;
    browser.preferredControlTintColor = [UIColor colorWithRed:0.843 green:0.91 blue:0.667 alpha:1];
    self.browser = browser; self.job = job;
    [self.presenter presentViewController:browser animated:YES completion:nil];
    return YES;
}
- (void)close:(NSString *)job {
    if (![self.job isEqual:job]) return;
    SFSafariViewController *browser = self.browser;
    self.browser = nil; self.job = nil;
    if (self.presenter.presentedViewController == browser) [browser dismissViewControllerAnimated:YES completion:nil];
}
- (void)safariViewControllerDidFinish:(SFSafariViewController *)controller {
    if (self.browser == controller) { self.browser = nil; self.job = nil; }
    [controller dismissViewControllerAnimated:YES completion:nil];
}
@end
