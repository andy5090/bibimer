#include <sys/stat.h>
#include <errno.h>
#include <time.h>
#include <stdatomic.h>
#include <signal.h>
#include <stdlib.h>
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

static atomic_int recovery_stage;
static atomic_int recovery_remaining;
int bibimer_recovery_stage(void) { return atomic_load(&recovery_stage); }
int bibimer_recovery_remaining(void) { return atomic_load(&recovery_remaining); }

// Recovery must not hold the process table forever while waiting for a guest
// signal/condition lock. This queues the same task-directed termination signal
// as deliver_signal_unlocked, but retries contended locks on the next pass.
// Caller holds pids_lock, so task, group and sighand cannot be freed here.
static int try_terminate_guest_task(struct task *task, int sig) {
    if (task->is_native_proxy) return -ENOTSUP;
    if (!task->group || !task->sighand || task->exiting) return 0;
    if (trylock(&task->group->lock) != 0) return 0;
    if (trylock(&task->sighand->lock) != 0) { unlock(&task->group->lock); return 0; }
    if (trylock(&task->waiting_cond_lock) != 0) {
        unlock(&task->sighand->lock); unlock(&task->group->lock); return 0;
    }
    if (!sigset_has(task->pending, sig)) {
        struct sigqueue *entry = malloc(sizeof(*entry));
        if (!entry) {
            unlock(&task->waiting_cond_lock); unlock(&task->sighand->lock); unlock(&task->group->lock);
            return -ENOMEM;
        }
        entry->info = SIGINFO_NIL; entry->info.sig = sig;
        sigset_add(&task->pending, sig);
        list_add_tail(&task->queue, &entry->queue);
    }
    if (sig == SIGKILL_) {
        task->group->stopped = false;
        notify(&task->group->stopped_cond);
    }
    notify(&task->pause);
    if (task->waiting_cond) notify(task->waiting_cond);
    unlock(&task->waiting_cond_lock); unlock(&task->sighand->lock); unlock(&task->group->lock);
    pthread_kill(task->thread, SIGUSR1);
    cpu_poke(&task->cpu);
    return 0;
}

int bibimer_stop_guest_children(void) {
    // The app's fixed supervisor is PID 1 and only starts a new bridge after
    // the host writes its private control pipe. Never rerun become_init().
    for (unsigned attempt = 0; attempt < 100; attempt++) {
        atomic_store(&recovery_stage, 1);
        if (trylock(&pids_lock) == 0) {
            struct task *init = pid_get_task(1);
            if (!init || init->exiting || init->parent) {
                unlock(&pids_lock);
                atomic_store(&recovery_stage, 6);
                return -ESRCH;
            }
            unsigned live = 0;
            for (unsigned pid = 2; pid <= MAX_PID; pid++) {
                struct task *task = pid_get_task(pid);
                if (!task) continue;
                live++;
                atomic_store(&recovery_remaining, live);
                if (!task->exiting) {
                    atomic_store(&recovery_stage, 2);
                    int rc = try_terminate_guest_task(task, attempt < 10 ? SIGTERM_ : SIGKILL_);
                    if (rc < 0) { unlock(&pids_lock); atomic_store(&recovery_stage, 5); return rc; }
                }
            }
            unlock(&pids_lock);
            atomic_store(&recovery_remaining, live);
            if (!live) { atomic_store(&recovery_stage, 4); return 0; }
        }
        atomic_store(&recovery_stage, 3);
        struct timespec delay = {0, 100000000};
        nanosleep(&delay, NULL);
    }
    atomic_store(&recovery_stage, 5);
    return -ETIMEDOUT;
}
