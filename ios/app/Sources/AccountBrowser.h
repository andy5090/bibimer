#import <UIKit/UIKit.h>
#import <SafariServices/SafariServices.h>

// Authentication pages have no workspace bridge or agent control capability.
@interface BibimerAccountBrowser : NSObject <SFSafariViewControllerDelegate>
@property(nonatomic,weak) UIViewController *presenter;
- (BOOL)open:(NSString *)url job:(NSString *)job;
- (void)close:(NSString *)job;
@end
