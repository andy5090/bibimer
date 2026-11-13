#import <UIKit/UIKit.h>

// Secrets stay in UIKit and are submitted directly to the local CLI store.
@interface BibimerAccountInput : UIViewController
@property NSDictionary<NSString *, NSString *> *labels;
@property(copy) void (^completion)(NSString *key);
- (void)cancel;
@end
