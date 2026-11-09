#import "BackgroundExecution.h"
#import "Localization.h"
#import <BackgroundTasks/BackgroundTasks.h>
#import <UIKit/UIKit.h>
#include <TargetConditionals.h>

static NSString *const taskPrefix = @"app.bibimer.ios.work.";
static long long number(id value) { return [value isKindOfClass:NSNumber.class] ? [value longLongValue] : 0; }

@protocol BibimerBackgroundTask <NSObject>
@property(nonatomic,copy) void (^expirationHandler)(void);
@property(nonatomic,readonly) NSProgress *progress;
- (void)setTaskCompletedWithSuccess:(BOOL)success;
@end

static BOOL activeWork(NSDictionary *row) {
    if (![row isKindOfClass:NSDictionary.class] || ![row[@"state"] isEqual:@"running"]) return NO;
    NSDictionary *setup = [row[@"setup_action"] isKindOfClass:NSDictionary.class] ? row[@"setup_action"] : nil;
    if (setup) return [@[@"install",@"version"] containsObject:setup[@"action"]];
    if (![row[@"mode"] isEqual:@"chat"]) return NO;
    return [@[@"sending",@"running"] containsObject:row[@"turn_state"]] ||
        ([@[@"initializing",@"ready"] containsObject:row[@"turn_state"]] && number(row[@"queued_count"]) > 0 && !number(row[@"queue_paused"]));
}

@interface BibimerBackgroundExecution ()
@property(nonatomic) BOOL foreground;
@property BOOL registered;
@property BOOL testMode;
@property NSUInteger epoch;
@property NSUInteger failures;
@property long long progressUnits;
@property NSString *state;
@property NSString *requestIdentifier;
@property NSString *instance;
@property NSTimeInterval startupUntil;
@property NSMutableDictionary<NSString *,NSMutableDictionary *> *observed;
@property NSMutableDictionary<NSString *,NSNumber *> *pendingRequests;
@property NSUInteger activitySerial;
@property id<BibimerBackgroundTask> workTask;
@property NSURLSessionDataTask *readTask;
- (BOOL)supported;
- (void)submit;
- (void)acceptTask:(id<BibimerBackgroundTask>)task;
- (void)poll;
- (void)receiveHealth:(NSDictionary *)health;
- (void)finish:(BOOL)success state:(NSString *)state;
- (void)later:(void (^)(void))block;
- (void)verifyChats:(NSArray<NSString *> *)chats index:(NSUInteger)index epoch:(NSUInteger)epoch;
- (BOOL)hasPendingRequests;
- (void)recordActiveSession:(NSDictionary *)row;
- (void)confirmCompletion:(NSUInteger)epoch serial:(NSUInteger)serial;
@end

#if TARGET_OS_SIMULATOR
@interface BibimerBackgroundTestTask : NSObject <BibimerBackgroundTask>
@property(nonatomic,copy) void (^expirationHandler)(void);
@property(nonatomic,strong) NSProgress *progress;
@property BOOL success;
@property NSUInteger completions;
@end
@implementation BibimerBackgroundTestTask
- (instancetype)init { if((self=[super init]))_progress=[NSProgress progressWithTotalUnitCount:-1];return self; }
- (void)setTaskCompletedWithSuccess:(BOOL)success { self.success=success;self.completions++; }
@end

@interface BibimerBackgroundTestService : BibimerBackgroundExecution
@property BibimerBackgroundTestTask *testTask;
@property BOOL reject;
@property BOOL expire;
@property BOOL disableAfterGrant;
@property BOOL forceUnsupported;
@property BOOL savedOff;
@property NSUInteger submissions;
@property NSString *pendingToken;
@property BOOL endOnActive;
@property BOOL expirePending;
@property BOOL requestRace;
@property BOOL raceInjected;
@property NSDictionary *lastHealth;
@property NSMutableArray<NSString *> *paths;
@property NSMutableArray *responses;
@property long long maxObservedProgress;
@end
@implementation BibimerBackgroundTestService
- (BOOL)supported { return !self.forceUnsupported; }
- (BOOL)enabled { return YES; }
- (void)submit {
    self.submissions++;
    if(self.reject){[self finish:NO state:@"unavailable"];return;}
    self.testTask=[BibimerBackgroundTestTask new];[self acceptTask:self.testTask];
    if(self.expire) {
        void (^expired)(void)=self.testTask.expirationHandler;
        expired();
    }
    if(self.disableAfterGrant) {
        NSUserDefaults *preferences=NSUserDefaults.standardUserDefaults;
        id previous=[preferences objectForKey:@"iosBackgroundWork"];
        [self configure:NO];self.savedOff=![preferences boolForKey:@"iosBackgroundWork"];
        if(previous)[preferences setObject:previous forKey:@"iosBackgroundWork"];else [preferences removeObjectForKey:@"iosBackgroundWork"];
    }
}
@end
#endif

@implementation BibimerBackgroundExecution
+ (instancetype)shared { static id instance; static dispatch_once_t once; dispatch_once(&once,^{ instance=[self new]; }); return instance; }
- (instancetype)init { if((self=[super init])) { _foreground=YES; _state=@"ready"; _observed=[NSMutableDictionary new];_pendingRequests=[NSMutableDictionary new]; } return self; }
- (BOOL)supported {
#if TARGET_OS_MACCATALYST
    return NO;
#else
    if (@available(iOS 26.0,*)) return !NSProcessInfo.processInfo.isiOSAppOnMac;
    return NO;
#endif
}
- (BOOL)enabled { id value=[NSUserDefaults.standardUserDefaults objectForKey:@"iosBackgroundWork"]; return value ? [value boolValue] : YES; }
- (NSDictionary *)environment { return @{@"enabled":@([self enabled]),@"supported":@([self supported]),@"state":![self supported] ? @"unsupported" : ![self enabled] ? @"off" : self.state}; }
- (void)signal { if(self.changed)self.changed(); }
- (void)registerAtLaunch {
    if(self.registered || ![self supported])return;
#if !TARGET_OS_MACCATALYST
    if(@available(iOS 26.0,*)) {
        __weak typeof(self) weak=self;
        self.registered=[BGTaskScheduler.sharedScheduler registerForTaskWithIdentifier:[taskPrefix stringByAppendingString:@"*"] usingQueue:dispatch_get_main_queue() launchHandler:^(BGTask *task){
            if(![task isKindOfClass:BGContinuedProcessingTask.class] || ![task.identifier isEqual:weak.requestIdentifier]) { [task setTaskCompletedWithSuccess:NO];return; }
            [weak acceptTask:(id<BibimerBackgroundTask>)task];
        }];
        if(!self.registered)self.state=@"unavailable";
    }
#endif
}
- (void)configure:(BOOL)enabled {
    [NSUserDefaults.standardUserDefaults setBool:enabled forKey:@"iosBackgroundWork"];
    if(!enabled)[self finish:NO state:@"off"];
    else { if(!self.requestIdentifier)self.state=self.registered ? @"ready" : @"unavailable";[self signal]; }
}
- (void)setForeground:(BOOL)foreground { _foreground=foreground; }
- (BOOL)hasPendingRequests {
    NSTimeInterval now=NSProcessInfo.processInfo.systemUptime;
    for(NSString *token in self.pendingRequests.allKeys)if(self.pendingRequests[token].doubleValue<=now)[self.pendingRequests removeObjectForKey:token];
    return self.pendingRequests.count>0;
}
- (NSString *)beginUserRequest {
    if(![self supported] || ![self enabled] || !self.foreground || (!self.testMode && UIApplication.sharedApplication.applicationState!=UIApplicationStateActive))return nil;
    NSString *token=NSUUID.UUID.UUIDString;
    self.pendingRequests[token]=@(NSProcessInfo.processInfo.systemUptime+180);
    self.activitySerial++;[self userInitiatedWork];return token;
}
- (void)endUserRequest:(NSString *)token {
    if(!token || !self.pendingRequests[token])return;
    [self.pendingRequests removeObjectForKey:token];self.activitySerial++;
    if(!self.observed.count)self.startupUntil=NSProcessInfo.processInfo.systemUptime+2;
}
- (void)userInitiatedWork {
    if(![self supported] || ![self enabled] || !self.foreground || (!self.testMode && UIApplication.sharedApplication.applicationState!=UIApplicationStateActive))return;
    self.startupUntil=NSProcessInfo.processInfo.systemUptime+10;
    self.activitySerial++;
    if(self.requestIdentifier)return;
    if(!self.registered){ self.state=@"unavailable";[self signal];return; }
    self.epoch++;self.failures=0;self.progressUnits=0;self.instance=nil;[self.observed removeAllObjects];
    self.requestIdentifier=[taskPrefix stringByAppendingString:NSUUID.UUID.UUIDString];
    NSUInteger epoch=self.epoch;
    self.state=@"pending";[self signal];[self submit];
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW,10*NSEC_PER_SEC),dispatch_get_main_queue(),^{
        if(epoch==self.epoch && self.requestIdentifier && !self.workTask)[self finish:NO state:@"unavailable"];
    });
}
- (void)submit {
#if !TARGET_OS_MACCATALYST
    if(@available(iOS 26.0,*)) {
        NSString *identifier=self.requestIdentifier;
        BGContinuedProcessingTaskRequest *request=[[BGContinuedProcessingTaskRequest alloc] initWithIdentifier:identifier title:@"BIBIMER" subtitle:BibimerLocalized(@"Background work")];
        request.strategy=BGContinuedProcessingTaskRequestSubmissionStrategyFail;
        void (^submitted)(NSError *)=^(NSError *error){ dispatch_async(dispatch_get_main_queue(),^{
            if(error && [identifier isEqual:self.requestIdentifier])[self finish:NO state:@"unavailable"];
        }); };
        dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY,0),^{
            if(@available(iOS 27.0,*)) [BGTaskScheduler.sharedScheduler submitTaskRequest:request completionHandler:submitted];
            else { NSError *error=nil;[BGTaskScheduler.sharedScheduler submitTaskRequest:request error:&error];submitted(error); }
        });
    }
#endif
}
- (void)acceptTask:(id<BibimerBackgroundTask>)task {
    if(!self.requestIdentifier || ![self enabled]){[task setTaskCompletedWithSuccess:NO];return;}
    self.workTask=task;task.progress.totalUnitCount=-1;task.progress.completedUnitCount=0;
    NSUInteger epoch=self.epoch;__weak typeof(self) weak=self;
    task.expirationHandler=^{dispatch_async(dispatch_get_main_queue(),^{if(epoch==weak.epoch)[weak finish:NO state:@"expired"];});};
    self.state=@"running";[self signal];[self poll];
}
- (void)later:(void (^)(void))block { dispatch_after(dispatch_time(DISPATCH_TIME_NOW,self.testMode ? 0 : NSEC_PER_SEC),dispatch_get_main_queue(),block); }
- (void)poll {
    if(!self.workTask)return;
    if(!self.fetch){[self finish:NO state:@"unavailable"];return;}
    NSUInteger epoch=self.epoch;
    self.readTask=self.fetch(@"/v1/health",^(NSDictionary *health){
        if(epoch!=self.epoch || !self.workTask)return;self.readTask=nil;
        [self receiveHealth:health];
    });
}
- (void)receiveHealth:(NSDictionary *)health {
    NSString *instance=[health isKindOfClass:NSDictionary.class] ? health[@"instance"] : nil;
    if(![instance isKindOfClass:NSString.class] || ![[NSUUID alloc] initWithUUIDString:instance] || number(health[@"protocol"])!=1 || ![health[@"projects"] isKindOfClass:NSArray.class]) {
        if(++self.failures>=3 && ![self hasPendingRequests]){[self finish:NO state:@"unavailable"];return;}
        NSUInteger epoch=self.epoch;[self later:^{if(epoch==self.epoch)[self poll];}];return;
    }
    if(self.instance && ![self.instance isEqual:instance]){[self finish:NO state:@"ended"];return;}
    self.instance=instance;self.failures=0;
    NSMutableDictionary *rows=[NSMutableDictionary new];BOOL active=NO;
    for(id project in health[@"projects"]) {
        if(![project isKindOfClass:NSDictionary.class] || ![project[@"sessions"] isKindOfClass:NSArray.class])continue;
        for(id row in project[@"sessions"]) {
            NSString *key=[row isKindOfClass:NSDictionary.class] ? row[@"id"] : nil;
            if(![key isKindOfClass:NSString.class] || ![[NSUUID alloc] initWithUUIDString:key])continue;
            rows[key]=row;
            if(!activeWork(row))continue;active=YES;
            [self recordActiveSession:row];
        }
    }
    self.workTask.progress.completedUnitCount=self.progressUnits;
    if(active || [self hasPendingRequests] || (!self.observed.count && self.startupUntil>NSProcessInfo.processInfo.systemUptime)) {
        NSUInteger epoch=self.epoch;[self later:^{if(epoch==self.epoch)[self poll];}];return;
    }
    if(!self.observed.count){[self finish:NO state:@"ended"];return;}
    NSMutableArray *chats=[NSMutableArray new];
    for(NSString *key in self.observed) {
        NSDictionary *row=rows[key],*record=self.observed[key];
        if([row[@"turn_state"] isEqual:@"waiting"]){[self finish:NO state:@"waiting"];return;}
        if([record[@"setup"] boolValue]) {
            if(![row[@"state"] isEqual:@"exited"] || ![row[@"exit_code"] isKindOfClass:NSNumber.class]){[self finish:NO state:@"ended"];return;}
            if([row[@"exit_code"] integerValue]!=0){[self finish:NO state:@"failed"];return;}
        } else {
            if(![row[@"mode"] isEqual:@"chat"] || ![record[@"turns"] count]){[self finish:NO state:@"ended"];return;}
            [chats addObject:key];
        }
    }
    [self verifyChats:chats index:0 epoch:self.epoch];
}
- (void)recordActiveSession:(NSDictionary *)row {
    NSString *key=row[@"id"];NSMutableDictionary *record=self.observed[key];
    long long revision=MAX(0,number(row[@"output_end"]));
    if(!record){record=[@{@"setup":@([row[@"setup_action"] isKindOfClass:NSDictionary.class]),@"turns":[NSMutableSet new],@"startRevision":@(revision),@"revision":@(revision)} mutableCopy];self.observed[key]=record;self.activitySerial++;}
    else if(revision>[record[@"revision"] longLongValue]){self.progressUnits+=revision-[record[@"revision"] longLongValue];record[@"revision"]=@(revision);self.activitySerial++;}
    if([row[@"active_turn_id"] isKindOfClass:NSString.class] && [row[@"active_turn_id"] length]) {
        NSMutableSet *turns=record[@"turns"];if(![turns containsObject:row[@"active_turn_id"]])self.activitySerial++;
        [turns addObject:row[@"active_turn_id"]];
    }
}
- (void)verifyChats:(NSArray<NSString *> *)chats index:(NSUInteger)index epoch:(NSUInteger)epoch {
    if(epoch!=self.epoch || !self.workTask)return;
    if([self hasPendingRequests]){[self poll];return;}
    if(index==chats.count){[self confirmCompletion:epoch serial:self.activitySerial];return;}
    NSString *key=chats[index],*path=[NSString stringWithFormat:@"/v1/sessions/%@/events?cursor=0&wait=0",key];
    NSUInteger serial=self.activitySerial;
    self.readTask=self.fetch(path,^(NSDictionary *events){
        if(epoch!=self.epoch || !self.workTask)return;self.readTask=nil;
        if(serial!=self.activitySerial || [self hasPendingRequests]){[self poll];return;}
        NSDictionary *session=[events[@"session"] isKindOfClass:NSDictionary.class] ? events[@"session"] : nil;
        if(![session[@"id"] isEqual:key]){[self finish:NO state:@"ended"];return;}
        if(activeWork(session)){[self recordActiveSession:session];[self poll];return;}
        if([session[@"turn_state"] isEqual:@"waiting"]){[self finish:NO state:@"waiting"];return;}
        NSMutableDictionary *status=[NSMutableDictionary new];
        for(id item in [events[@"items"] isKindOfClass:NSArray.class] ? events[@"items"] : @[]) {
            if([item isKindOfClass:NSDictionary.class] && [item[@"kind"] isEqual:@"turn"] && number(item[@"revision"])>number(self.observed[key][@"startRevision"]) && ![item[@"status"] isEqual:@"completed"]) {
                [self finish:NO state:@"failed"];return;
            }
            if([item isKindOfClass:NSDictionary.class] && [item[@"kind"] isEqual:@"turn"] && [item[@"id"] isKindOfClass:NSString.class] && [item[@"status"] isKindOfClass:NSString.class])status[item[@"id"]]=item[@"status"];
        }
        for(NSString *turn in self.observed[key][@"turns"]) {
            NSString *value=status[[@"turn-" stringByAppendingString:turn]];
            if(![value isEqual:@"completed"]){[self finish:NO state:value ? @"failed" : @"ended"];return;}
        }
        self.observed[key][@"verifiedRevision"]=@(number(session[@"output_end"]));
        [self verifyChats:chats index:index+1 epoch:epoch];
    });
}
- (void)confirmCompletion:(NSUInteger)epoch serial:(NSUInteger)serial {
    self.readTask=self.fetch(@"/v1/health",^(NSDictionary *health){
        if(epoch!=self.epoch || !self.workTask)return;self.readTask=nil;
        if(serial!=self.activitySerial || [self hasPendingRequests]){[self poll];return;}
        if(![health[@"instance"] isEqual:self.instance]){[self finish:NO state:@"ended"];return;}
        NSMutableDictionary *rows=[NSMutableDictionary new];
        for(id project in [health[@"projects"] isKindOfClass:NSArray.class] ? health[@"projects"] : @[]) {
            if(![project isKindOfClass:NSDictionary.class])continue;
            for(id row in [project[@"sessions"] isKindOfClass:NSArray.class] ? project[@"sessions"] : @[]) {
                if(![row isKindOfClass:NSDictionary.class] || ![row[@"id"] isKindOfClass:NSString.class])continue;
                rows[row[@"id"]]=row;
                if(activeWork(row)){[self recordActiveSession:row];[self poll];return;}
            }
        }
        for(NSString *key in self.observed) {
            NSDictionary *row=rows[key],*record=self.observed[key];
            if([row[@"turn_state"] isEqual:@"waiting"]){[self finish:NO state:@"waiting"];return;}
            if([record[@"setup"] boolValue]) {
                if(![row[@"state"] isEqual:@"exited"] || ![row[@"exit_code"] isKindOfClass:NSNumber.class] || number(row[@"exit_code"])!=0){[self finish:NO state:@"ended"];return;}
            } else if(![row[@"turn_state"] isEqual:@"ready"] || number(row[@"output_end"])!=number(record[@"verifiedRevision"])) {
                [self finish:NO state:@"ended"];return;
            }
        }
        [self finish:YES state:@"completed"];
    });
}
- (void)finish:(BOOL)success state:(NSString *)state {
    self.epoch++;[self.readTask cancel];self.readTask=nil;
    NSString *identifier=self.requestIdentifier;self.requestIdentifier=nil;
    id<BibimerBackgroundTask> task=self.workTask;self.workTask=nil;
    task.expirationHandler=nil;
    if(success){task.progress.totalUnitCount=MAX(1,self.progressUnits);task.progress.completedUnitCount=task.progress.totalUnitCount;}
    [task setTaskCompletedWithSuccess:success];
#if !TARGET_OS_MACCATALYST
    if(identifier && !self.testMode && [self supported])[BGTaskScheduler.sharedScheduler cancelTaskRequestWithIdentifier:identifier];
#endif
    self.instance=nil;[self.observed removeAllObjects];[self.pendingRequests removeAllObjects];self.state=state;[self signal];
}
- (void)runtimeStopped { [self finish:NO state:@"ended"]; }

- (void)runSelfTestsWithCompletion:(void (^)(NSDictionary *))completion {
#if TARGET_OS_SIMULATOR
    NSString *instance=@"00000000-0000-4000-8000-000000000001",*session=@"00000000-0000-4000-8000-000000000002";
    NSDictionary *(^health)(NSDictionary *)=^NSDictionary *(NSDictionary *row){return @{@"protocol":@1,@"instance":instance,@"projects":@[@{@"sessions":row ? @[row] : @[]}]};};
    NSDictionary *install=@{@"id":session,@"state":@"running",@"setup_action":@{@"agent":@"codex",@"action":@"install"},@"output_end":@10};
    NSDictionary *exit=@{@"id":session,@"state":@"exited",@"exit_code":@0};
    NSDictionary *chat=@{@"id":session,@"mode":@"chat",@"state":@"running",@"turn_state":@"running",@"active_turn_id":@"test-turn",@"output_end":@4};
    NSDictionary *ready=@{@"id":session,@"mode":@"chat",@"state":@"running",@"turn_state":@"ready",@"output_end":@5};
    NSDictionary *events=@{@"session":ready,@"items":@[@{@"kind":@"turn",@"id":@"turn-test-turn",@"revision":@5,@"status":@"completed"}]};
    NSDictionary *newChat=@{@"id":session,@"mode":@"chat",@"state":@"running",@"turn_state":@"running",@"active_turn_id":@"new-turn",@"output_end":@6};
    NSDictionary *newReady=@{@"id":session,@"mode":@"chat",@"state":@"running",@"turn_state":@"ready",@"output_end":@7};
    NSArray *bothTurns=@[@{@"kind":@"turn",@"id":@"turn-test-turn",@"revision":@5,@"status":@"completed"},@{@"kind":@"turn",@"id":@"turn-new-turn",@"revision":@7,@"status":@"completed"}];
    NSDictionary *waiting=@{@"id":session,@"mode":@"chat",@"state":@"running",@"turn_state":@"waiting"};
    NSDictionary *login=@{@"id":session,@"state":@"running",@"setup_action":@{@"action":@"login"}};
    NSDictionary *terminal=@{@"id":session,@"state":@"running",@"mode":@"terminal"};
    NSDictionary *initial=@{@"id":session,@"state":@"running",@"mode":@"chat",@"turn_state":@"initializing",@"queued_count":@1,@"queue_paused":@NO};
    BOOL policy=activeWork(install) && activeWork(chat) && activeWork(initial) && !activeWork(login) && !activeWork(terminal) && !activeWork(ready) && !activeWork(waiting);
    NSArray *cases=@[
        @{@"name":@"scheduler_rejection",@"reject":@YES,@"pending":@YES,@"state":@"unavailable",@"responses":@[]},
        @{@"name":@"installer_completion",@"state":@"completed",@"success":@YES,@"responses":@[health(install),health(exit)]},
        @{@"name":@"no_synthetic_progress",@"state":@"completed",@"success":@YES,@"progress":@0,@"responses":@[health(install),health(install),health(exit)]},
        @{@"name":@"installer_failure",@"state":@"failed",@"responses":@[health(install),health(@{@"id":session,@"state":@"exited",@"exit_code":@1})]},
        @{@"name":@"structured_chat_completion",@"state":@"completed",@"success":@YES,@"responses":@[health(chat),health(ready),events]},
        @{@"name":@"unknown_chat_outcome",@"state":@"ended",@"responses":@[health(chat),health(ready),@{@"session":ready,@"items":@[]}]},
        @{@"name":@"new_turn_in_completion_snapshot",@"state":@"completed",@"success":@YES,@"responses":@[health(chat),health(ready),@{@"session":newChat,@"items":events[@"items"]},health(newChat),health(newReady),@{@"session":newReady,@"items":bothTurns}]},
        @{@"name":@"new_request_during_old_completion",@"race":@YES,@"state":@"completed",@"success":@YES,@"responses":@[health(chat),health(ready),events,health(newChat),health(newReady),@{@"session":newReady,@"items":bothTurns}]},
        @{@"name":@"fast_unobserved_failed_turn",@"state":@"failed",@"responses":@[health(chat),health(newReady),@{@"session":newReady,@"items":@[@{@"kind":@"turn",@"id":@"turn-test-turn",@"revision":@5,@"status":@"completed"},@{@"kind":@"turn",@"id":@"turn-unobserved",@"revision":@7,@"status":@"failed"}]}]},
        @{@"name":@"fast_unobserved_interrupted_turn",@"state":@"failed",@"responses":@[health(chat),health(newReady),@{@"session":newReady,@"items":@[@{@"kind":@"turn",@"id":@"turn-test-turn",@"revision":@5,@"status":@"completed"},@{@"kind":@"turn",@"id":@"turn-unobserved",@"revision":@7,@"status":@"interrupted"}]}]},
        @{@"name":@"pending_post_survives_idle_and_health_failures",@"pending":@YES,@"endActive":@YES,@"state":@"completed",@"success":@YES,@"responses":@[health(nil),NSNull.null,NSNull.null,NSNull.null,health(install),health(exit)]},
        @{@"name":@"pending_request_hard_limit",@"pending":@YES,@"expirePending":@YES,@"state":@"unavailable",@"responses":@[NSNull.null,NSNull.null,NSNull.null]},
        @{@"name":@"waiting_is_not_completion",@"state":@"waiting",@"responses":@[health(chat),health(waiting)]},
        @{@"name":@"idle_does_not_keep_running",@"state":@"ended",@"responses":@[health(terminal)]},
        @{@"name":@"instance_change",@"state":@"ended",@"responses":@[health(install),@{@"protocol":@1,@"instance":@"00000000-0000-4000-8000-000000000003",@"projects":@[]}]},
        @{@"name":@"failed_health_not_completion",@"state":@"unavailable",@"responses":@[NSNull.null,NSNull.null,NSNull.null]},
        @{@"name":@"expiry_rejects_late_read",@"expire":@YES,@"pending":@YES,@"state":@"expired",@"responses":@[health(install)]},
        @{@"name":@"configure_off_cancels_watcher",@"disable":@YES,@"pending":@YES,@"state":@"off",@"responses":@[health(install)]}
    ];
    NSMutableArray *checks=[NSMutableArray arrayWithObject:@{@"name":@"active_work_policy",@"ok":@(policy)}];
    BibimerBackgroundTestService *guard=[BibimerBackgroundTestService new];guard.testMode=YES;guard.registered=YES;[guard setForeground:NO];[guard userInitiatedWork];
    BOOL foregroundGuard=!guard.requestIdentifier && !guard.testTask && [guard beginUserRequest]==nil;
    [guard setForeground:YES];guard.forceUnsupported=YES;[guard userInitiatedWork];
    [checks addObject:@{@"name":@"foreground_and_support_guards",@"ok":@(foregroundGuard && !guard.requestIdentifier && !guard.testTask && ![guard.environment[@"supported"] boolValue] && [guard beginUserRequest]==nil)}];
    __block void (^next)(NSUInteger);
    next=^(NSUInteger index){
        if(index==cases.count){ BOOL ok=YES;for(NSDictionary *check in checks)ok=ok && [check[@"ok"] boolValue];completion(@{@"ok":@(ok),@"checks":checks,@"realSchedulerSubmitted":@NO});next=nil;return; }
        NSDictionary *test=cases[index];BibimerBackgroundTestService *service=[BibimerBackgroundTestService new];
        service.testMode=YES;service.registered=YES;service.reject=[test[@"reject"] boolValue];service.expire=[test[@"expire"] boolValue];service.disableAfterGrant=[test[@"disable"] boolValue];service.paths=[NSMutableArray new];service.responses=[test[@"responses"] mutableCopy];
        service.endOnActive=[test[@"endActive"] boolValue];service.expirePending=[test[@"expirePending"] boolValue];service.requestRace=[test[@"race"] boolValue];
        __weak BibimerBackgroundTestService *weak=service;
        service.fetch=^NSURLSessionDataTask *(NSString *path,void (^done)(NSDictionary *)){
            weak.maxObservedProgress=MAX(weak.maxObservedProgress,weak.testTask.progress.completedUnitCount);
            [weak.paths addObject:path];id result=weak.responses.count ? weak.responses.firstObject : ([path isEqual:@"/v1/health"] && weak.lastHealth ? weak.lastHealth : NSNull.null);if(weak.responses.count)[weak.responses removeObjectAtIndex:0];
            if([result isKindOfClass:NSDictionary.class] && number(result[@"protocol"])==1)weak.lastHealth=result;
            if(weak.expirePending)for(NSString *token in weak.pendingRequests.allKeys)weak.pendingRequests[token]=@0;
            if(weak.requestRace && !weak.raceInjected && [path containsString:@"/events?"]) {
                weak.raceInjected=YES;NSString *token=[weak beginUserRequest];[weak endUserRequest:token];
            }
            dispatch_async(dispatch_get_main_queue(),^{
                weak.startupUntil=0;
                if(weak.endOnActive && [result isKindOfClass:NSDictionary.class])for(NSDictionary *project in result[@"projects"])for(NSDictionary *row in project[@"sessions"])if(activeWork(row)){[weak setForeground:NO];[weak endUserRequest:weak.pendingToken];}
                done(result==NSNull.null ? nil : result);
            });return nil;
        };
        __block BOOL finished=NO;
        service.changed=^{
            BibimerBackgroundTestService *current=weak;
            if(finished || ![@[@"completed",@"ended",@"failed",@"waiting",@"unavailable",@"expired",@"off"] containsObject:current.state])return;
            finished=YES;
            dispatch_async(dispatch_get_main_queue(),^{
                BOOL ok=[current.state isEqual:test[@"state"]] && (!current.testTask || (current.testTask.completions==1 && current.testTask.success==[test[@"success"] boolValue]));
                for(NSString *path in current.paths)ok=ok && ([path isEqual:@"/v1/health"] || [path hasPrefix:@"/v1/sessions/"]);
                if(test[@"progress"])ok=ok && current.maxObservedProgress==[test[@"progress"] longLongValue];
                if(current.expire)ok=ok && [current.state isEqual:@"expired"] && current.requestIdentifier==nil;
                if(current.disableAfterGrant)ok=ok && current.savedOff && current.requestIdentifier==nil;
                NSString *before=current.requestIdentifier;NSUInteger submissions=current.submissions;
                [current endUserRequest:current.pendingToken];
                ok=ok && current.requestIdentifier==before && current.submissions==submissions && ![current hasPendingRequests];
                [checks addObject:@{@"name":test[@"name"],@"ok":@(ok)}];current.changed=nil;current.fetch=nil;next(index+1);
            });
        };
        if([test[@"pending"] boolValue])service.pendingToken=[service beginUserRequest];else [service userInitiatedWork];
    };
    next(0);
#else
    completion(@{@"ok":@NO,@"unsupported":@YES,@"realSchedulerSubmitted":@NO});
#endif
}
@end
