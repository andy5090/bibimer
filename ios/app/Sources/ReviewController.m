#import "ReviewController.h"
@interface BibimerReviewController ()
@property WKWebView *web;
@property BOOL closed;
@end
@implementation BibimerReviewController
- (void)viewDidLoad {
    [super viewDidLoad];
    self.view.backgroundColor=[UIColor colorWithRed:14/255.0 green:18/255.0 blue:21/255.0 alpha:1];
    WKWebViewConfiguration *config=[WKWebViewConfiguration new];
    config.websiteDataStore=WKWebsiteDataStore.nonPersistentDataStore;
    [config.userContentController addScriptMessageHandler:self name:@"bibimerReview"];
    NSDictionary *env=@{@"demo":@YES,@"paired":@YES,@"platform":@"ios",@"language":self.language ?: @"en",@"systemLanguage":self.systemLanguage ?: @"en",@"languagePreference":self.language ?: @"en",@"agentOptions":@{},@"enterBehavior":@"newline",@"contextDisplay":@"used",@"responseDelivery":@"queue",@"notifications":@{@"enabled":@NO,@"allowed":@NO,@"state":@"unsupported"},@"voiceInput":@{},@"speechOutput":@{},@"backgroundWork":@{@"supported":@NO},@"screenBehavior":@{@"supported":@NO}};
    NSData *data=[NSJSONSerialization dataWithJSONObject:env options:0 error:nil];
    NSString *shim=[NSString stringWithContentsOfURL:[NSBundle.mainBundle URLForResource:@"review-native" withExtension:@"js"] encoding:NSUTF8StringEncoding error:nil];
    NSString *script=[NSString stringWithFormat:@"window.__bibimerEnvironment=%@;\n%@",[[NSString alloc]initWithData:data encoding:NSUTF8StringEncoding],shim];
    [config.userContentController addUserScript:[[WKUserScript alloc]initWithSource:script injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:YES]];
    self.web=[[WKWebView alloc]initWithFrame:CGRectZero configuration:config];self.web.navigationDelegate=self;
    self.web.opaque=NO;self.web.backgroundColor=self.view.backgroundColor;self.web.translatesAutoresizingMaskIntoConstraints=NO;
    self.web.scrollView.bounces=NO;self.web.scrollView.contentInsetAdjustmentBehavior=UIScrollViewContentInsetAdjustmentNever;
    [self.view addSubview:self.web];
    [NSLayoutConstraint activateConstraints:@[[self.web.topAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.topAnchor],[self.web.leadingAnchor constraintEqualToAnchor:self.view.leadingAnchor],[self.web.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor],[self.web.bottomAnchor constraintEqualToAnchor:self.view.keyboardLayoutGuide.topAnchor]]];
    NSURL *root=[NSBundle.mainBundle URLForResource:@"Web" withExtension:nil];
    [self.web loadFileURL:[root URLByAppendingPathComponent:@"review.html"] allowingReadAccessToURL:root];
}
- (void)userContentController:(WKUserContentController *)controller didReceiveScriptMessage:(WKScriptMessage *)message {
    (void)controller;
    NSURL *index=[[NSBundle.mainBundle URLForResource:@"Web" withExtension:nil]URLByAppendingPathComponent:@"review.html"];
    if(self.closed||message.webView!=self.web||!message.frameInfo.mainFrame||!message.frameInfo.request.URL.isFileURL||![message.frameInfo.request.URL.URLByStandardizingPath.path isEqual:index.URLByStandardizingPath.path]||![message.body isKindOfClass:NSDictionary.class])return;
    // No real request, preference, credential, file, voice or browser dispatcher.
    if([message.body[@"action"] isEqual:@"exitReview"])[self closeReview];
}
- (void)closeReview {
    if(self.closed)return;self.closed=YES;
    [self.web evaluateJavaScript:@"window.BibimerReviewDispose?.()" completionHandler:nil];
    [self.web.configuration.userContentController removeScriptMessageHandlerForName:@"bibimerReview"];
    [self.web stopLoading];self.web.navigationDelegate=nil;
    void (^done)(void)=self.exited;self.exited=nil;
    [self dismissViewControllerAnimated:NO completion:done];
}
- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)action decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    (void)webView;
    NSURL *root=[NSBundle.mainBundle URLForResource:@"Web" withExtension:nil],*url=action.request.URL;
    NSString *prefix=[root.URLByResolvingSymlinksInPath.path stringByAppendingString:@"/"];
    BOOL allowed=url.isFileURL&&[url.URLByResolvingSymlinksInPath.path hasPrefix:prefix];
    if(action.targetFrame.mainFrame)allowed=allowed&&[url.URLByResolvingSymlinksInPath.path isEqual:[root URLByAppendingPathComponent:@"review.html"].URLByResolvingSymlinksInPath.path];
    decisionHandler(allowed?WKNavigationActionPolicyAllow:WKNavigationActionPolicyCancel);
}
- (void)webViewWebContentProcessDidTerminate:(WKWebView *)webView {(void)webView;[self closeReview];}
@end
