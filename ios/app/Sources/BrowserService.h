#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
@interface BibimerBrowserService : NSObject
@property(nonatomic,weak) UIViewController *presenter;
@property(nonatomic,copy) void (^visibility)(BOOL);
- (void)command:(NSDictionary *)command completion:(void (^)(NSDictionary *))completion;
- (void)revokeAll;
- (void)showTag:(NSString *)tag;
@end
