#import <Foundation/Foundation.h>
#include <errno.h>
#include <limits.h>
#include <stdint.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <sys/un.h>

// Guest Unix sockets are mapped to real Darwin paths, including PID and ID.
static inline NSString *BibimerSocketPrefix(NSString *temporary, BOOL simulator, NSError **error) {
    NSString *directory = temporary;
    if (simulator) {
        // Simulator container paths exceed sun_path. Each run gets a private
        // directory; device builds must stay inside their own app container.
        char pattern[] = "/tmp/bibimer-ios-socket-XXXXXX";
        char *created = mkdtemp(pattern);
        if (!created) {
            if (error) *error = [NSError errorWithDomain:NSPOSIXErrorDomain code:errno userInfo:nil];
            return nil;
        }
        directory = [NSString stringWithUTF8String:created];
    } else if ([directory hasPrefix:@"/private/var/"]) {
        NSString *shorter = [directory substringFromIndex:@"/private".length];
        struct stat original, alias;
        if (stat(directory.fileSystemRepresentation, &original) == 0 &&
            stat(shorter.fileSystemRepresentation, &alias) == 0 &&
            original.st_dev == alias.st_dev && original.st_ino == alias.st_ino)
            directory = shorter;
    }
    NSString *prefix = [directory stringByAppendingPathComponent:@"s"];
    NSString *longest = [prefix stringByAppendingFormat:@"%d.%u", INT_MAX, UINT32_MAX];
    struct stat attributes;
    if (!directory.isAbsolutePath || stat(directory.fileSystemRepresentation, &attributes) != 0 ||
            !S_ISDIR(attributes.st_mode) || strlen(longest.fileSystemRepresentation) >= sizeof(((struct sockaddr_un *)0)->sun_path)) {
        if (error) *error = [NSError errorWithDomain:NSPOSIXErrorDomain code:ENAMETOOLONG userInfo:nil];
        return nil;
    }
    return prefix;
}
