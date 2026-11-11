#include <sys/stat.h>
#include <errno.h>
#include <time.h>
#include "kernel/calls.h"
#include "kernel/task.h"
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

int bibimer_stop_guest_children(void) {
    // The app's fixed supervisor is PID 1 and only starts a new bridge after
    // the host writes its private control pipe. Never rerun become_init().
    for (unsigned attempt = 0; attempt < 100; attempt++) {
        if (trylock(&pids_lock) == 0) {
            struct task *init = pid_get_task(1);
            if (!init || init->exiting || init->parent) {
                unlock(&pids_lock);
                return -ESRCH;
            }
            unsigned live = 0;
            for (unsigned pid = 2; pid <= MAX_PID; pid++) {
                struct task *task = pid_get_task(pid);
                if (!task) continue;
                live++;
                if (!task->exiting)
                    send_signal(task, attempt < 10 ? SIGTERM_ : SIGKILL_, SIGINFO_NIL);
            }
            unlock(&pids_lock);
            if (!live) return 0;
        }
        struct timespec delay = {0, 100000000};
        nanosleep(&delay, NULL);
    }
    return -ETIMEDOUT;
}
