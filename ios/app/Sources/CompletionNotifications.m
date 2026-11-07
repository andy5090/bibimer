#import "Localization.h"
#import "CompletionNotifications.h"
#import <UIKit/UIKit.h>

@interface BibimerCompletionNotifications ()
@property BOOL allowed;
@property BOOL supported;
@property BOOL visible;
@property BOOL running;
@property NSUInteger generation;
@property long long cursor;
@property NSString *instance;
@property NSString *target;
@property NSURLSessionDataTask *task;
@end
@implementation BibimerCompletionNotifications
- (instancetype)init {
    if((self=[super init])){self.instance=@"none";UNUserNotificationCenter.currentNotificationCenter.delegate=self;[self resume];}return self;
}
- (BOOL)enabled { return [NSUserDefaults.standardUserDefaults boolForKey:@"responseNotifications"]; }
- (NSDictionary *)environment { return @{@"enabled":@([self enabled]),@"allowed":@(self.allowed),@"state":!self.supported ? @"unsupported" : self.running ? @"listening" : @"stopped"}; }
- (void)signal { if(self.changed)self.changed(); }
- (void)configure:(BOOL)enabled {
    [self pause];[NSUserDefaults.standardUserDefaults setBool:enabled forKey:@"responseNotifications"];
    if(enabled)[UNUserNotificationCenter.currentNotificationCenter requestAuthorizationWithOptions:UNAuthorizationOptionAlert|UNAuthorizationOptionSound completionHandler:^(BOOL granted,NSError *error){dispatch_async(dispatch_get_main_queue(),^{[self resume];});}];
    else { [UNUserNotificationCenter.currentNotificationCenter removeAllPendingNotificationRequests];[self signal]; }
}
- (void)connected:(BOOL)supported { self.supported=supported;[self resume]; }
- (void)resume {
    self.visible=UIApplication.sharedApplication.applicationState==UIApplicationStateActive;
    [UNUserNotificationCenter.currentNotificationCenter getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings *settings){dispatch_async(dispatch_get_main_queue(),^{
        self.allowed=settings.authorizationStatus==UNAuthorizationStatusAuthorized || settings.authorizationStatus==UNAuthorizationStatusProvisional;
        if(self.visible && self.allowed && self.supported && [self enabled] && !self.running){self.running=YES;[self poll:self.generation];}[self signal];
    });}];
}
- (void)pause {
    self.visible=NO;self.generation++;self.running=NO;[self.task cancel];self.task=nil;
    // Resuming establishes a fresh cursor: no replay of completions missed while suspended.
    self.instance=@"none";self.cursor=0;[self signal];
}
- (void)poll:(NSUInteger)generation {
    if(generation!=self.generation || !self.running || !self.visible || ![self enabled] || !self.allowed || !self.fetch)return;
    NSString *path=[NSString stringWithFormat:@"/v1/completions?cursor=%lld&instance=%@&wait=20",self.cursor,self.instance];
    self.task=self.fetch(path,^(NSDictionary *data){
        if(generation!=self.generation || !self.running)return;self.task=nil;
        NSString *instance=data[@"instance"];NSNumber *cursor=data[@"cursor"];
        BOOL valid=[instance isKindOfClass:NSString.class] && [[NSUUID alloc] initWithUUIDString:instance] && [cursor isKindOfClass:NSNumber.class] && cursor.longLongValue>=0;
        if(valid){
            BOOL reset=[data[@"reset"] boolValue] || ![self.instance isEqual:instance];
            if(!reset && cursor.longLongValue>=self.cursor && [data[@"events"] isKindOfClass:NSArray.class]){
                for(id event in data[@"events"]){
                    if(![event isKindOfClass:NSDictionary.class] || ![event[@"id"] isKindOfClass:NSNumber.class])continue;
                    long long identifier=[event[@"id"] longLongValue];
                    if(identifier<=self.cursor || identifier>cursor.longLongValue)continue;
                    NSString *project=event[@"project_id"],*session=event[@"session_id"];
                    if(![project isKindOfClass:NSString.class] || ![session isKindOfClass:NSString.class] || ![[NSUUID alloc] initWithUUIDString:project] || ![[NSUUID alloc] initWithUUIDString:session])continue;
                    UNMutableNotificationContent *content=[UNMutableNotificationContent new];content.title=@"BIBIMER";
                    // Generic body prevents answer text from being persisted by Notification Center.
                    content.body=BibimerLocalized(@"Chat response completed.");content.sound=UNNotificationSound.defaultSound;
                    content.userInfo=@{@"project_id":project,@"session_id":session};
                    NSString *key=[NSString stringWithFormat:@"bibimer-completion/%@/%lld",instance,identifier];
                    [UNUserNotificationCenter.currentNotificationCenter addNotificationRequest:[UNNotificationRequest requestWithIdentifier:key content:content trigger:nil] withCompletionHandler:nil];
                    self.cursor=identifier;
                }
            }
            self.instance=instance;self.cursor=MAX(self.cursor,cursor.longLongValue);
            if(reset)self.cursor=cursor.longLongValue;
        }
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW,(valid ? 1 : 5)*NSEC_PER_SEC),dispatch_get_main_queue(),^{[self poll:generation];});
    });
}
- (NSString *)pendingTarget { return self.target ?: @"{}"; }
- (NSString *)takeTarget { NSString *target=self.target ?: @"{}";self.target=nil;return target; }
- (void)openSettings { [UIApplication.sharedApplication openURL:[NSURL URLWithString:UIApplicationOpenNotificationSettingsURLString] options:@{} completionHandler:nil]; }
- (void)userNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler { completionHandler(UNNotificationPresentationOptionBanner|UNNotificationPresentationOptionSound); }
- (void)userNotificationCenter:(UNUserNotificationCenter *)center didReceiveNotificationResponse:(UNNotificationResponse *)response withCompletionHandler:(void (^)(void))completionHandler {
    if([response.actionIdentifier isEqual:UNNotificationDefaultActionIdentifier]){
        NSDictionary *target=response.notification.request.content.userInfo;
        if([target[@"project_id"] isKindOfClass:NSString.class] && [target[@"session_id"] isKindOfClass:NSString.class]){
            NSData *data=[NSJSONSerialization dataWithJSONObject:target options:0 error:nil];self.target=[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];if(self.opened)self.opened();
        }
    }completionHandler();
}
@end
