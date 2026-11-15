"""Compile the production challenge parser and receiver against fake UIKit.

No real clipboard, browser, network, account or token is used.
"""
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
static NSInteger UIApplicationStateActive = 0;
@interface UIApplication : NSObject
@property NSInteger applicationState;
+ (instancetype)sharedApplication;
@end
@implementation UIApplication
+ (instancetype)sharedApplication { static UIApplication *app; if (!app) app=[self new]; return app; }
@end
@interface UIScreen : NSObject
@property BOOL isCaptured;
+ (instancetype)mainScreen;
@end
@implementation UIScreen
+ (instancetype)mainScreen { static UIScreen *screen; if (!screen) screen=[self new]; return screen; }
@end
@interface UIPasteboard : NSObject
@property NSInteger changeCount;
@property NSString *stored;
@property NSUInteger reads;
@property(copy) void (^duringRead)(void);
+ (instancetype)generalPasteboard;
- (NSString *)string;
@end
@implementation UIPasteboard
+ (instancetype)generalPasteboard { static UIPasteboard *board; if (!board) board=[self new]; return board; }
- (NSString *)string { self.reads++; if(self.duringRead)self.duringRead(); return self.stored; }
@end
@interface TestView : NSObject
@property NSObject *window;
@end
@implementation TestView @end
@interface SFSafariViewController : NSObject
@property TestView *viewIfLoaded;
@end
@implementation SFSafariViewController @end
PARSER
DECLARATION
- (void)close:(NSString *)job;
@end
@implementation BibimerAccountBrowser
RECEIVER
- (void)close:(NSString *)job { if([self.job isEqual:job]) { self.job=nil; self.browser=nil; self.clipboardJob=nil; } }
@end
int main(void) { @autoreleasepool {
    NSString *state=@"fictional_challenge_123456789";
    NSString *url=[NSString stringWithFormat:@"https://claude.com/cai/oauth/authorize?state=%@&response_type=code&code_challenge_method=S256&redirect_uri=https%%3A%%2F%%2Fplatform.claude.com%%2Foauth%%2Fcode%%2Fcallback",state];
    assert([claudeChallengeState(url) isEqual:state]);
    for (NSString *bad in @[
        [url stringByReplacingOccurrencesOfString:@"https://claude.com/" withString:@"http://claude.com/"],
        [url stringByReplacingOccurrencesOfString:@"https://claude.com/" withString:@"https://claude.com.evil.test/"],
        [url stringByReplacingOccurrencesOfString:@"https://claude.com/" withString:@"https://user@claude.com/"],
        [url stringByReplacingOccurrencesOfString:@"/cai/oauth/authorize" withString:@"/other"],
        [url stringByAppendingString:@"&state=duplicate"],
        [url stringByReplacingOccurrencesOfString:@"code_challenge_method=S256" withString:@"code_challenge_method=plain"],
        [url stringByReplacingOccurrencesOfString:@"platform.claude.com" withString:@"evil.test"],
        [url stringByAppendingString:@"#fragment"]]) assert(claudeChallengeState(bad)==nil);
    NSString *valid=[@"fictional_code#" stringByAppendingString:state];
    assert([claudeClipboardCode(valid,state) isEqual:valid]);
    assert([claudeClipboardCode([NSString stringWithFormat:@" \n%@\n",valid],state) isEqual:valid]);
    for (NSString *bad in @[@"code#another_state",@"plain_text",@"#fictional_challenge_123456789",[@"code\n#" stringByAppendingString:state],[valid stringByAppendingString:@"#extra"]]) assert(claudeClipboardCode(bad,state)==nil);
    BibimerAccountBrowser *owner=[BibimerAccountBrowser new];
    UIPasteboard *board=UIPasteboard.generalPasteboard; board.stored=valid;
    NSString *job=@"00000000-0000-4000-8000-000000000001";
    __block NSUInteger accepted=0;
    void (^receive)(NSString *)=^(NSString *code){ if(code)accepted++; };
    assert([owner watchCodeForURL:url job:job completion:receive]);
    owner.job=job; owner.browser=[SFSafariViewController new]; owner.browser.viewIfLoaded=[TestView new]; owner.browser.viewIfLoaded.window=[NSObject new];
    [owner checkClipboard]; assert(board.reads==0 && accepted==0); // No old clipboard read.
    board.changeCount++; board.stored=@"unrelated text"; [owner checkClipboard]; [owner checkClipboard];
    assert(board.reads==1 && accepted==0); // Once per new copy, no guessing.
    UIScreen.mainScreen.isCaptured=YES; board.changeCount++; board.stored=valid;
    [owner checkClipboard]; assert(board.reads==1); UIScreen.mainScreen.isCaptured=NO;
    UIApplication.sharedApplication.applicationState=1; [owner checkClipboard]; assert(board.reads==1);
    UIApplication.sharedApplication.applicationState=0;
    [owner stopCodeWatch]; // Connection epoch changed while inactive.
    assert([owner watchCodeForURL:url job:job completion:receive]);
    [owner checkClipboard]; [owner checkClipboard]; assert(accepted==1 && board.reads==2);
    // Cancellation during an OS paste permission prompt cannot submit a code.
    assert([owner watchCodeForURL:url job:job completion:receive]);
    owner.job=job; owner.browser=[SFSafariViewController new]; owner.browser.viewIfLoaded=[TestView new]; owner.browser.viewIfLoaded.window=[NSObject new];
    board.changeCount++; board.duringRead=^{[owner stopCodeWatch];};
    [owner checkClipboard]; assert(accepted==1); board.duringRead=nil;
    assert([owner watchCodeForURL:url job:job completion:receive]);
    owner.codeDeadline=[NSDate dateWithTimeIntervalSinceNow:-1]; [owner checkClipboard];
    assert(owner.codeCompletion==nil && accepted==1);
    return 0;
} }
'''


@unittest.skipUnless(sys.platform == 'darwin' and shutil.which('xcrun'), 'Apple Foundation required')
class AccountClipboardTests(unittest.TestCase):
    def test_real_parser_and_scoped_single_delivery_receiver(self):
        source = (Path(__file__).parents[1] / 'Sources/AccountBrowser.m').read_text()
        parser = source.split('// Only the reviewed', 1)[1].split('@interface', 1)[0]
        parser = '// Only the reviewed' + parser
        declaration = source.split('@interface BibimerAccountBrowser ()', 1)[1].split('@end', 1)[0]
        declaration = '@interface BibimerAccountBrowser : NSObject' + declaration
        receiver = source.split('@implementation BibimerAccountBrowser', 1)[1].split('- (void)open:', 1)[0]
        harness = HARNESS.replace('PARSER', parser).replace('DECLARATION', declaration).replace('RECEIVER', receiver)
        environment = os.environ.copy()
        environment.setdefault('DEVELOPER_DIR', '/Applications/Xcode.app/Contents/Developer')
        with tempfile.TemporaryDirectory(prefix='bibimer-code-copy-') as folder:
            file, binary = Path(folder)/'receiver.m', Path(folder)/'receiver'
            file.write_text(harness)
            subprocess.run(['xcrun','clang','-fobjc-arc','-fblocks','-framework','Foundation',str(file),'-o',str(binary)],
                           env=environment,capture_output=True,text=True,check=True)
            subprocess.run([str(binary)],check=True,timeout=5)


if __name__ == '__main__':
    unittest.main()
