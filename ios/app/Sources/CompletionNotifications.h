#import <Foundation/Foundation.h>
#import <UserNotifications/UserNotifications.h>
@interface BibimerCompletionNotifications : NSObject <UNUserNotificationCenterDelegate>
@property(nonatomic,copy) NSURLSessionDataTask *(^fetch)(NSString *,void (^)(NSDictionary *));
@property(nonatomic,copy) void (^changed)(void);
@property(nonatomic,copy) void (^opened)(void);
- (NSDictionary *)environment;
- (void)configure:(BOOL)enabled;
- (void)connected:(BOOL)supported;
- (void)resume;
- (void)pause;
- (NSString *)takeTarget;
- (NSString *)pendingTarget;
- (void)openSettings;
@end
