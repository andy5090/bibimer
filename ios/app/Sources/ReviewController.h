#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
@interface BibimerReviewController : UIViewController <WKScriptMessageHandler, WKNavigationDelegate>
@property NSString *language;
@property NSString *systemLanguage;
@property(copy) void (^exited)(void);
- (void)closeReview;
@end
