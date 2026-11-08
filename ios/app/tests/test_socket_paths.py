"""Exercise the actual native path helper and Darwin bind/connect limits."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


@unittest.skipUnless(sys.platform == 'darwin', 'Darwin Unix socket boundary')
class SocketPathTests(unittest.TestCase):
    def test_private_absolute_paths_bind_after_cwd_changes_and_reject_long_device_paths(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / 'socket-test.m'
            source.write_text(r'''
#import "SocketSupport.h"
#include <assert.h>
#include <sys/socket.h>
#include <unistd.h>
int main(void) { @autoreleasepool {
    NSError *error = nil;
    NSString *longPath = [NSProcessInfo.processInfo.arguments[1] stringByAppendingPathComponent:[@"x" stringByPaddingToLength:180 withString:@"x" startingAtIndex:0]];
    assert([NSFileManager.defaultManager createDirectoryAtPath:longPath withIntermediateDirectories:YES attributes:nil error:&error]);
    assert(BibimerSocketPrefix(longPath, NO, &error) == nil);
    assert(error.code == ENAMETOOLONG);
    NSString *prefix = BibimerSocketPrefix(longPath, YES, &error);
    assert(prefix != nil);
    NSString *other = BibimerSocketPrefix(longPath, YES, &error);
    assert(![prefix isEqual:other]);
    struct stat st;
    assert(stat(prefix.stringByDeletingLastPathComponent.fileSystemRepresentation, &st) == 0);
    assert((st.st_mode & 0777) == 0700);
    assert(st.st_uid == getuid());
    for (NSString *candidate in @[prefix, BibimerSocketPrefix(NSTemporaryDirectory(), NO, &error)]) {
        NSString *path = [candidate stringByAppendingFormat:@"%d.%u", INT_MAX, UINT32_MAX];
        struct sockaddr_un address = {.sun_family = AF_UNIX};
        assert(strlen(path.fileSystemRepresentation) < sizeof(address.sun_path));
        strcpy(address.sun_path, path.fileSystemRepresentation);
        int server = socket(AF_UNIX, SOCK_STREAM, 0), client = socket(AF_UNIX, SOCK_STREAM, 0);
        unlink(address.sun_path);
        assert(bind(server, (struct sockaddr *)&address, sizeof(address)) == 0);
        assert(listen(server, 1) == 0);
        assert(chdir("/") == 0);
        assert(connect(client, (struct sockaddr *)&address, sizeof(address)) == 0);
        close(client); close(server); unlink(address.sun_path);
    }
    [NSFileManager.defaultManager removeItemAtPath:prefix.stringByDeletingLastPathComponent error:nil];
    [NSFileManager.defaultManager removeItemAtPath:other.stringByDeletingLastPathComponent error:nil];
    [NSFileManager.defaultManager removeItemAtPath:longPath error:nil];
} return 0; }
''')
            binary = root / 'socket-test'
            subprocess.run(['clang', '-fobjc-arc', '-framework', 'Foundation',
                '-I', str(Path(__file__).parents[1] / 'Sources'), str(source), '-o', str(binary)],
                check=True, capture_output=True)
            subprocess.run([str(binary), str(root)], check=True, capture_output=True)
