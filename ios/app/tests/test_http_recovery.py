"""Exercise the actual cancellation barrier against Foundation HTTP tasks."""
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
RECOVERY_SOURCE
@interface DeferredSession : NSObject
@property NSURLSession *session;
@property NSMutableArray *callbacks;
- (void)getAllTasksWithCompletionHandler:(void (^)(NSArray<NSURLSessionTask *> *))callback;
- (void)invalidateAndCancel;
- (void)complete:(NSUInteger)index;
@end
@implementation DeferredSession
- (void)getAllTasksWithCompletionHandler:(void (^)(NSArray<NSURLSessionTask *> *))callback { [self.callbacks addObject:[callback copy]]; }
- (void)invalidateAndCancel { [self.session invalidateAndCancel]; }
- (void)complete:(NSUInteger)index { [self.session getAllTasksWithCompletionHandler:self.callbacks[index]]; }
@end
int main(int argc, const char *argv[]) {
    (void)argv;
    BOOL delayed = argc > 1;
    @autoreleasepool {
        NSURLSessionConfiguration *config = NSURLSessionConfiguration.ephemeralSessionConfiguration;
        config.protocolClasses = @[BibimerTestHeldWrite.class];
        NSURLSession *retired = [NSURLSession sessionWithConfiguration:config];
        NSURLSession *current = [NSURLSession sessionWithConfiguration:config];
        NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:@"http://127.0.0.1:1/never-delivered"]];
        request.HTTPMethod = @"POST";
        [request setValue:@"1" forHTTPHeaderField:@"X-Bibimer-Test-Held-Write"];
        NSURLSessionDataTask *oldWrite = [retired dataTaskWithRequest:request];
        NSURLSessionDataTask *newWrite = [current dataTaskWithRequest:request];
        [BibimerTestHeldWrite onStart:^{
            [BibimerTestHeldWrite onStart:^{
                if (delayed) {
                    DeferredSession *proxy = [DeferredSession new];
                    proxy.session = retired; proxy.callbacks = [NSMutableArray new];
                    NSURLSession *old = (NSURLSession *)proxy;
                    NSMutableSet *pending = [NSMutableSet new];
                    __block BOOL firstDone = NO, secondDone = NO;
                    __block NSURLSession *newer;
                    cancelHTTPTransports(@[old], pending, ^{
                        firstDone = YES;
                        assert(secondDone && [pending containsObject:newer]);
                        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 100*NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
                            assert(BibimerTestHeldWrite.stopCount == 2);
                            [newer invalidateAndCancel]; exit(0);
                        });
                    });
                    // The first enumeration is withheld, representing a timed-out
                    // attempt. Its old write must remain owned by the next attempt.
                    assert(!firstDone && [pending containsObject:old]);
                    NSArray *next = [pending.allObjects arrayByAddingObject:current];
                    cancelHTTPTransports(next, pending, ^{
                        secondDone = YES;
                        assert(!firstDone);
                        assert(oldWrite.state == NSURLSessionTaskStateCanceling || oldWrite.state == NSURLSessionTaskStateCompleted);
                        assert(newWrite.state == NSURLSessionTaskStateCanceling || newWrite.state == NSURLSessionTaskStateCompleted);
                        newer = [NSURLSession sessionWithConfiguration:config];
                        [pending addObject:newer];
                        [proxy complete:0];
                    });
                    assert(!secondDone && [pending containsObject:old]);
                    [proxy complete:1];
                    return;
                }
                [retired getAllTasksWithCompletionHandler:^(NSArray *tasks) {
                    assert([tasks containsObject:oldWrite]);
                    [retired finishTasksAndInvalidate];
                    // A second invalidation alone leaves draining tasks alive on
                    // current Foundation. The production barrier must cancel both.
                    [retired invalidateAndCancel];
                    cancelHTTPTransports(@[retired, current], [NSMutableSet new], ^{
                        assert(oldWrite.state == NSURLSessionTaskStateCanceling || oldWrite.state == NSURLSessionTaskStateCompleted);
                        assert(newWrite.state == NSURLSessionTaskStateCanceling || newWrite.state == NSURLSessionTaskStateCompleted);
                        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 100*NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
                            assert(BibimerTestHeldWrite.stopCount == 2);
                            exit(0);
                        });
                    });
                }];
            }];
            [newWrite resume];
        }];
        [oldWrite resume];
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 3*NSEC_PER_SEC), dispatch_get_main_queue(), ^{ exit(2); });
    }
    dispatch_main();
}
'''


@unittest.skipUnless(sys.platform == 'darwin' and shutil.which('xcrun'), 'Apple Foundation required')
class HTTPRecoveryTests(unittest.TestCase):
    def run_harness(self, *arguments):
        source = (Path(__file__).parents[1] / 'Sources/main.m').read_text()
        helper = source.split('static void cancelHTTPTransports(', 1)[1].split('static BOOL usesDesktopInput', 1)[0]
        helper = 'static void cancelHTTPTransports(' + helper
        environment = os.environ.copy()
        environment.setdefault('DEVELOPER_DIR', '/Applications/Xcode.app/Contents/Developer')
        with tempfile.TemporaryDirectory(prefix='bibimer-http-recovery-') as folder:
            root = Path(folder)
            harness, executable = root / 'recovery.m', root / 'recovery'
            harness.write_text(HARNESS.replace('RECOVERY_SOURCE', helper))
            subprocess.run(['xcrun', 'clang', '-fobjc-arc', '-fblocks', '-framework', 'Foundation',
                            str(harness), '-o', str(executable)], env=environment,
                           capture_output=True, text=True, check=True)
            subprocess.run([str(executable), *arguments], timeout=5, check=True)

    def test_current_and_gracefully_retired_posts_are_cancelled_before_barrier(self):
        self.run_harness()

    def test_delayed_enumeration_stays_owned_until_a_later_attempt_cancels_it(self):
        self.run_harness('delayed')


if __name__ == '__main__':
    unittest.main()
