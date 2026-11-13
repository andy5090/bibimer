"""Exercise native account ownership with real Foundation tasks, no accounts."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


HARNESS = r'''
#import <Foundation/Foundation.h>
#include <assert.h>
OPERATION_SOURCE
@interface HeldProtocol : NSURLProtocol @end
@implementation HeldProtocol
+ (BOOL)canInitWithRequest:(NSURLRequest *)request { (void)request; return YES; }
+ (NSURLRequest *)canonicalRequestForRequest:(NSURLRequest *)request { return request; }
- (void)startLoading {} // No request bytes ever leave the test process.
- (void)stopLoading {}
@end
@interface WKWebView : NSObject
@property NSMutableArray *replies;
- (void)evaluateJavaScript:(NSString *)script completionHandler:(id)handler;
@end
@implementation WKWebView
- (void)evaluateJavaScript:(NSString *)script completionHandler:(id)handler { (void)handler; [self.replies addObject:script]; }
@end
@interface BibimerAccountInput : NSObject
@property BOOL cancelled;
- (void)cancel;
@end
@implementation BibimerAccountInput
- (void)cancel { self.cancelled = YES; }
@end
static NSString *jsonString(id value) {
    NSData *data = [NSJSONSerialization dataWithJSONObject:value options:NSJSONWritingFragmentsAllowed error:nil];
    return [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
}
@interface Controller : NSObject
@property WKWebView *web;
@property BOOL exited;
@property NSUInteger workspaceGeneration;
@property NSUInteger connectionEpoch;
@property BibimerAccountOperation *accountOperation;
@property BibimerAccountInput *accountInput;
- (BOOL)isCurrentClipboardWorkspace:(WKWebView *)web;
- (void)accountReply:(BibimerAccountOperation *)operation status:(NSInteger)status data:(NSDictionary *)data;
- (void)cancelAccountOperation:(NSString *)identifier error:(NSString *)code;
- (void)invalidateAccountDocument;
- (void)finishAccountOperation:(BibimerAccountOperation *)operation task:(NSURLSessionDataTask *)task status:(NSInteger)status data:(NSDictionary *)data;
@end
@implementation Controller
- (BOOL)isCurrentClipboardWorkspace:(WKWebView *)web { return web == self.web; }
LIFECYCLE_SOURCE
@end
static BOOL cancelled(NSURLSessionTask *task) {
    return task.state == NSURLSessionTaskStateCanceling || task.state == NSURLSessionTaskStateCompleted;
}
static BibimerAccountOperation *begin(Controller *owner, NSURLSessionDataTask *task, NSString *identifier) {
    BibimerAccountOperation *operation = [BibimerAccountOperation new];
    operation.identifier = identifier; operation.document = owner.web;
    operation.generation = owner.workspaceGeneration; operation.epoch = owner.connectionEpoch;
    operation.task = task; owner.accountOperation = operation;
    return operation;
}
int main(void) {
    @autoreleasepool {
        Controller *owner = [Controller new];
        WKWebView *web = [WKWebView new]; web.replies = [NSMutableArray new]; owner.web = web;
        owner.workspaceGeneration = 1; owner.connectionEpoch = 1;
        NSURLSessionConfiguration *config = NSURLSessionConfiguration.ephemeralSessionConfiguration;
        config.protocolClasses = @[HeldProtocol.class];
        NSURLSession *session = [NSURLSession sessionWithConfiguration:config];
        NSMutableArray<NSURLSessionDataTask *> *tasks = [NSMutableArray new];
        for (int i=0; i<7; i++) {
            NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:@"http://127.0.0.1:1/account-fixture"]];
            request.HTTPMethod = @"POST";
            NSURLSessionDataTask *task = [session dataTaskWithRequest:request];
            [tasks addObject:task]; [task resume];
        }
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 100*NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
            NSDictionary *saved = @{@"job":@{@"status":@"saved"}};
            BibimerAccountOperation *old = begin(owner,tasks[0],@"document:1");
            BibimerAccountInput *input = [BibimerAccountInput new]; owner.accountInput = input;
            [owner cancelAccountOperation:@"wrong-id" error:nil];
            assert(owner.accountOperation == old && !input.cancelled && !cancelled(tasks[0]));
            [owner cancelAccountOperation:old.identifier error:nil];
            assert(!owner.accountOperation && !owner.accountInput && input.cancelled && cancelled(tasks[0]));
            BibimerAccountOperation *next = begin(owner,tasks[1],@"document:2");
            [owner finishAccountOperation:old task:tasks[0] status:200 data:saved];
            [owner finishAccountOperation:next task:tasks[0] status:200 data:saved];
            assert(owner.accountOperation == next && next.task == tasks[1] && web.replies.count == 0);
            [owner invalidateAccountDocument];
            assert(cancelled(tasks[1]) && !owner.accountOperation);
            BibimerAccountOperation *replacement = begin(owner,tasks[2],@"document:3");
            [owner finishAccountOperation:next task:tasks[1] status:200 data:saved];
            assert(owner.accountOperation == replacement && web.replies.count == 0);
            owner.connectionEpoch++;
            [owner finishAccountOperation:replacement task:tasks[2] status:200 data:saved];
            assert(!owner.accountOperation && web.replies.count == 0);
            BibimerAccountOperation *sameWebNewDocument = begin(owner,tasks[3],@"document:4");
            owner.workspaceGeneration++;
            [owner finishAccountOperation:sameWebNewDocument task:tasks[3] status:200 data:saved];
            assert(!owner.accountOperation && web.replies.count == 0);
            BibimerAccountOperation *timeout = begin(owner,tasks[4],@"document:5");
            [owner cancelAccountOperation:timeout.identifier error:@"error_timeout"];
            assert(cancelled(tasks[4]) && web.replies.count == 1);
            assert([web.replies.lastObject containsString:@"error_timeout"]);
            BibimerAccountOperation *current = begin(owner,tasks[5],@"document:6");
            [owner finishAccountOperation:timeout task:tasks[4] status:200 data:saved];
            assert(owner.accountOperation == current && web.replies.count == 1);
            [owner finishAccountOperation:current task:tasks[5] status:200 data:saved];
            assert(!owner.accountOperation && web.replies.count == 2);
            BibimerAccountOperation *oldView = begin(owner,tasks[6],@"document:7");
            WKWebView *newWeb = [WKWebView new]; newWeb.replies = [NSMutableArray new]; owner.web = newWeb;
            [owner finishAccountOperation:oldView task:tasks[6] status:200 data:saved];
            assert(newWeb.replies.count == 0 && web.replies.count == 2);
            for (NSURLSessionTask *task in tasks) [task cancel];
            [session invalidateAndCancel];
            exit(0);
        });
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 3*NSEC_PER_SEC), dispatch_get_main_queue(), ^{ exit(2); });
    }
    dispatch_main();
}
'''


@unittest.skipUnless(sys.platform == 'darwin' and shutil.which('xcrun'), 'Apple Foundation required')
class AccountLifecycleTests(unittest.TestCase):
    def test_owned_cancel_document_epoch_and_late_completion_boundaries(self):
        source = (Path(__file__).parents[1] / 'Sources/main.m').read_text()
        operation = '@interface BibimerAccountOperation' + source.split('@interface BibimerAccountOperation', 1)[1].split('static BOOL usesDesktopInput', 1)[0]
        lifecycle = source.split('- (void)accountReply:', 1)[1].split('- (void)requestAccountSecret:', 1)[0]
        harness = HARNESS.replace('OPERATION_SOURCE', operation).replace('LIFECYCLE_SOURCE', '- (void)accountReply:' + lifecycle)
        environment = os.environ.copy()
        environment.setdefault('DEVELOPER_DIR', '/Applications/Xcode.app/Contents/Developer')
        with tempfile.TemporaryDirectory(prefix='bibimer-account-lifecycle-') as folder:
            root = Path(folder)
            file, executable = root / 'account.m', root / 'account'
            file.write_text(harness)
            subprocess.run(['xcrun','clang','-fobjc-arc','-fblocks','-framework','Foundation',str(file),'-o',str(executable)],
                           env=environment,capture_output=True,text=True,check=True)
            subprocess.run([str(executable)],check=True,timeout=5)


if __name__ == '__main__':
    unittest.main()
