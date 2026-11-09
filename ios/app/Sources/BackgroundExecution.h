#import <Foundation/Foundation.h>

@interface BibimerBackgroundExecution : NSObject
@property(nonatomic,copy) NSURLSessionDataTask *(^fetch)(NSString *, void (^)(NSDictionary *));
@property(nonatomic,copy) void (^changed)(void);
+ (instancetype)shared;
- (void)registerAtLaunch;
- (void)configure:(BOOL)enabled;
- (NSDictionary *)environment;
- (void)userInitiatedWork;
- (NSString *)beginUserRequest;
- (void)endUserRequest:(NSString *)token;
- (void)runtimeStopped;
- (void)setForeground:(BOOL)foreground;
// Runs with a fake scheduler and metadata only; never submits an OS task.
- (void)runSelfTestsWithCompletion:(void (^)(NSDictionary *))completion;
@end
