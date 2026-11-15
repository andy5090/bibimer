#import <UIKit/UIKit.h>
#import <SafariServices/SafariServices.h>

// Authentication pages have no workspace bridge or agent control capability.
@interface BibimerAccountBrowser : NSObject <SFSafariViewControllerDelegate>
@property(nonatomic,weak) UIViewController *presenter;
- (void)open:(NSString *)url job:(NSString *)job completion:(void (^)(NSInteger))completion;
- (void)close:(NSString *)job;
- (void)cancelOpening:(NSString *)job;
@end
