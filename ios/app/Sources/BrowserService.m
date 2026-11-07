#import "Localization.h"
#import "BrowserService.h"

@interface BibimerBrowserWindow : UIViewController <WKNavigationDelegate,WKUIDelegate>
@property WKWebView *web;
@property BOOL manual;
@property NSString *sessionID;
@property NSString *launchID;
@property NSString *projectID;
@property(nonatomic,copy) void (^closed)(void);
@end
@implementation BibimerBrowserWindow
- (void)viewDidLoad {
    [super viewDidLoad];self.view.backgroundColor=UIColor.systemBackgroundColor;
    self.web.frame=self.view.bounds;self.web.autoresizingMask=UIViewAutoresizingFlexibleWidth|UIViewAutoresizingFlexibleHeight;
    [self.view addSubview:self.web];self.web.navigationDelegate=self;self.web.UIDelegate=self;
    self.navigationItem.title=BibimerLocalized(@"Browser");
    self.navigationItem.leftBarButtonItem=[[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemDone target:self action:@selector(done)];
    self.navigationItem.rightBarButtonItems=@[[[UIBarButtonItem alloc] initWithTitle:@"↻" style:UIBarButtonItemStylePlain target:self.web action:@selector(reload)],[[UIBarButtonItem alloc] initWithTitle:@"←" style:UIBarButtonItemStylePlain target:self.web action:@selector(goBack)]];
}
- (void)done { [self dismissViewControllerAnimated:YES completion:^{if(self.closed)self.closed();}]; }
- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)action decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    NSURL *url=action.request.URL;BOOL allowed=[@[@"http",@"https"] containsObject:url.scheme.lowercaseString] && url.host.length && !url.user.length && !url.password.length;
    decisionHandler(allowed ? WKNavigationActionPolicyAllow : WKNavigationActionPolicyCancel);
}
- (WKWebView *)webView:(WKWebView *)webView createWebViewWithConfiguration:(WKWebViewConfiguration *)configuration forNavigationAction:(WKNavigationAction *)action windowFeatures:(WKWindowFeatures *)features {
    // Keep popups in the owned visible window; never inherit the workspace message handler.
    if(!action.targetFrame && [@[@"http",@"https"] containsObject:action.request.URL.scheme.lowercaseString])[webView loadRequest:action.request];return nil;
}
@end

@interface BibimerBrowserService ()
@property NSMutableDictionary<NSString *,BibimerBrowserWindow *> *windows;
@property NSMutableDictionary<NSString *,WKWebsiteDataStore *> *stores;
@end
@implementation BibimerBrowserService
- (instancetype)init { if((self=[super init])){self.windows=[NSMutableDictionary new];self.stores=[NSMutableDictionary new];}return self; }
- (BOOL)active { return UIApplication.sharedApplication.applicationState==UIApplicationStateActive && (self.presenter.viewIfLoaded.window!=nil || self.presenter.presentedViewController.viewIfLoaded.window!=nil); }
- (BOOL)show:(BibimerBrowserWindow *)window {
    if(![self active])return NO;
    if(self.presenter.presentedViewController){return self.presenter.presentedViewController==window.navigationController;}
    UINavigationController *navigation=[[UINavigationController alloc] initWithRootViewController:window];navigation.modalPresentationStyle=UIModalPresentationFullScreen;
    __weak typeof(self) weak=self;window.closed=^{if(weak.visibility)weak.visibility(NO);};
    if(self.visibility)self.visibility(YES);[self.presenter presentViewController:navigation animated:NO completion:nil];[window.view layoutIfNeeded];return YES;
}
- (void)revokeAll { for(BibimerBrowserWindow *window in self.windows.allValues)window.manual=YES; }
- (void)showTag:(NSString *)tag {
    for(BibimerBrowserWindow *window in self.windows.allValues)if([tag isEqual:[@"ios-" stringByAppendingString:window.launchID]]){[self show:window];return;}
}
- (void)command:(NSDictionary *)command completion:(void (^)(NSDictionary *))completion {
    NSDictionary *error=@{@"error":@"error_browser_control"};
    if(![self active] || ![command isKindOfClass:NSDictionary.class]){completion(error);return;}
    if(![command[@"expires_at"] isKindOfClass:NSNumber.class] || [command[@"expires_at"] doubleValue]<NSDate.date.timeIntervalSince1970){completion(error);return;}
    NSString *identifier=command[@"session_id"],*launch=command[@"launch_id"],*project=command[@"project_id"],*action=command[@"action"];
    if(![identifier isKindOfClass:NSString.class] || ![launch isKindOfClass:NSString.class] || ![project isKindOfClass:NSString.class] || ![[NSUUID alloc] initWithUUIDString:identifier] || ![[NSUUID alloc] initWithUUIDString:launch] || ![[NSUUID alloc] initWithUUIDString:project]){completion(error);return;}
    BibimerBrowserWindow *window=self.windows[identifier];
    if([action isEqual:@"open"]){
        NSDictionary *data=command[@"data"];NSString *value=[data isKindOfClass:NSDictionary.class] ? data[@"url"] : nil;
        NSURL *url=[value isKindOfClass:NSString.class] ? [NSURL URLWithString:value] : nil;
        if(window || !url.host.length || ![@[@"http",@"https"] containsObject:url.scheme.lowercaseString] || url.user.length || url.password.length || self.windows.count>=8){completion(error);return;}
        WKWebViewConfiguration *configuration=[WKWebViewConfiguration new];WKWebsiteDataStore *store=self.stores[project];
        if(!store){
            if(@available(iOS 17.0,*))store=[WKWebsiteDataStore dataStoreForIdentifier:[[NSUUID alloc] initWithUUIDString:project]];
            else store=WKWebsiteDataStore.nonPersistentDataStore;
            self.stores[project]=store;
        }
        configuration.websiteDataStore=store;window=[BibimerBrowserWindow new];window.web=[[WKWebView alloc] initWithFrame:CGRectZero configuration:configuration];window.manual=YES;
        window.sessionID=identifier;window.launchID=launch;window.projectID=project;
        if(![self show:window]){completion(error);return;}
        self.windows[identifier]=window;[window.web loadRequest:[NSURLRequest requestWithURL:url]];completion(@{@"ok":@YES});return;
    }
    if(!window || ![window.launchID isEqual:launch] || ![window.projectID isEqual:project]){completion(error);return;}
    if([action isEqual:@"allow"] || [action isEqual:@"manual"]){window.manual=[action isEqual:@"manual"];completion(@{@"ok":@YES});return;}
    if([action isEqual:@"close"]){
        window.manual=YES;[window.web stopLoading];
        if(window.navigationController.presentingViewController)[window done];
        [self.windows removeObjectForKey:identifier];completion(@{@"ok":@YES});return;
    }
    if([action isEqual:@"show"]){completion([self show:window] ? @{@"ok":@YES} : error);return;}
    if(window.manual || ![self show:window] || !window.web.window){completion(error);return;}
    if([action isEqual:@"scroll"]){
        id steps=command[@"data"][@"steps"];
        if(![steps isKindOfClass:NSNumber.class] || [steps integerValue]==0 || labs([steps integerValue])>20){completion(error);return;}
        UIScrollView *scroll=window.web.scrollView;CGFloat y=MAX(0,MIN(scroll.contentSize.height-scroll.bounds.size.height,scroll.contentOffset.y+[steps integerValue]*80));
        [scroll setContentOffset:CGPointMake(scroll.contentOffset.x,y) animated:NO];completion(@{@"ok":@YES});return;
    }
    if([action isEqual:@"screenshot"]){
        WKSnapshotConfiguration *configuration=[WKSnapshotConfiguration new];configuration.snapshotWidth=@(MIN(1024,window.web.bounds.size.width));
        [window.web takeSnapshotWithConfiguration:configuration completionHandler:^(UIImage *image,NSError *failure){
            if(failure || window.manual || ![self active] || !window.web.window || self.presenter.presentedViewController!=window.navigationController){completion(error);return;}
            NSData *png=UIImagePNGRepresentation(image);if(!png.length || png.length>16*1024*1024){completion(error);return;}
            completion(@{@"png":[png base64EncodedStringWithOptions:0]});
        }];return;
    }
    completion(error); // No DOM extraction, injected JavaScript, or private touch/key APIs.
}
@end
