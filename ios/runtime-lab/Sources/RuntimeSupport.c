#include <sys/stat.h>
#include "kernel/calls.h"
#include "fs/dev.h"
#include "fs/devices.h"
#include "fs/path.h"
#include "RuntimeSupport.h"

int bibimer_prepare_devices(void) {
    const struct { const char *name; int minor; } devices[] = {
        {"/dev/null", DEV_NULL_MINOR}, {"/dev/zero", DEV_ZERO_MINOR},
        {"/dev/full", DEV_FULL_MINOR}, {"/dev/random", DEV_RANDOM_MINOR},
        {"/dev/urandom", DEV_URANDOM_MINOR},
    };
    for (unsigned i = 0; i < sizeof(devices) / sizeof(devices[0]); i++) {
        int rc = generic_mknodat(AT_PWD, devices[i].name, S_IFCHR | 0666,
                                dev_make(MEM_MAJOR, devices[i].minor));
        if (rc < 0 && rc != _EEXIST) return rc;
    }
    generic_mkdirat(AT_PWD, "/dev/shm", 01777);
    generic_mkdirat(AT_PWD, "/tmp", 01777);
    return 0;
}
