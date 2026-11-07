#import <UIKit/UIKit.h>

// All methods and callbacks run on the main queue. Secrets never enter WKWebView.
@interface BibimerVoiceService : NSObject
@property(nonatomic,copy) void (^emit)(NSString *callback, NSArray *arguments);
@property(nonatomic,weak) UIViewController *presenter;
- (NSDictionary *)environment;
- (void)handle:(NSDictionary *)message;
- (void)pause;
@end
