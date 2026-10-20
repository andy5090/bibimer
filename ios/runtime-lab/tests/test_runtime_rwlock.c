// Native Darwin regression for the exact runtime lock wrappers. No guest code.
// clang -O2 -pthread -DBIBIMER_EMBEDDED -I<ios-linuxkit> this.c -o test-rwlock
// Run normally for the fixed wrappers, or --raw for the pthread baseline.
#include <stdarg.h>
#include <signal.h>
#include <unistd.h>
#include <sched.h>
#include <string.h>
#include <time.h>
#include "util/sync.h"

#define THREADS 12
static wrlock_t rw;
static atomic_bool done;
static atomic_ulong progress;
static atomic_int holders;
static bool raw;
static unsigned protected_value;

int current_pid(void) { return 0; }
static void wake_signal(int signal) { (void)signal; }
static void deadline_signal(int signal) { (void)signal; _exit(3); }

static void acquire_read(void) {
    if (raw) {
        if (pthread_rwlock_rdlock(&rw.l)) abort();
    } else {
        read_wrlock(&rw);
    }
    atomic_fetch_add(&holders, 1);
}

static void release_read(void) {
    atomic_fetch_sub(&holders, 1);
    if (raw) {
        if (pthread_rwlock_unlock(&rw.l)) abort();
    } else {
        read_wrunlock(&rw);
    }
}

static void *worker(void *argument) {
    unsigned long iteration = (uintptr_t)argument;
    sigset_t before, after;
    pthread_sigmask(SIG_SETMASK, NULL, &before);
    while (!atomic_load(&done)) {
        acquire_read();
        unsigned observed = protected_value;
        if ((++iteration & 127) == 0) {
            release_read();
            bool acquired;
            if (iteration & 128) {
                acquired = raw ? pthread_rwlock_trywrlock(&rw.l) == 0 : write_wrtrylock(&rw);
            } else {
                if (raw) {
                    if (pthread_rwlock_wrlock(&rw.l)) abort();
                } else {
                    write_wrlock(&rw);
                }
                acquired = true;
            }
            if (acquired) {
                if (atomic_load(&holders)) abort();
                protected_value++;
                if (raw) {
                    if (pthread_rwlock_unlock(&rw.l)) abort();
                } else {
                    write_wrunlock(&rw);
                }
                acquire_read();
            } else {
                // Same failed JIT upgrade/reacquisition pattern as mem_ptr.
                while (!(raw ? pthread_rwlock_tryrdlock(&rw.l) == 0 : read_wrtrylock(&rw)))
                    sched_yield();
                atomic_fetch_add(&holders, 1);
            }
            observed = protected_value;
        }
        if (protected_value != observed) abort();
        release_read();
        atomic_fetch_add(&progress, 1);
    }
    pthread_sigmask(SIG_SETMASK, NULL, &after);
    for (int sig = 1; sig < NSIG; sig++)
        if (sigismember(&before, sig) != sigismember(&after, sig)) abort();
    return NULL;
}

static atomic_bool mask_waiter_started;
static void *check_blocked_mask(void *unused) {
    (void)unused;
    sigset_t blocked, original, after;
    sigemptyset(&blocked);
    sigaddset(&blocked, SIGUSR1);
    sigaddset(&blocked, SIGUSR2);
    pthread_sigmask(SIG_BLOCK, &blocked, &original);
    atomic_store(&mask_waiter_started, true);
    read_wrlock(&rw);
    pthread_sigmask(SIG_SETMASK, NULL, &after);
    if (!sigismember(&after, SIGUSR1) || !sigismember(&after, SIGUSR2)) abort();
    read_wrunlock(&rw);
    pthread_sigmask(SIG_SETMASK, &original, NULL);
    return NULL;
}

static double now(void) {
    struct timespec value;
    clock_gettime(CLOCK_MONOTONIC, &value);
    return value.tv_sec + value.tv_nsec / 1e9;
}

int main(int argc, char **argv) {
    raw = argc == 2 && strcmp(argv[1], "--raw") == 0;
    struct sigaction action = {.sa_handler = wake_signal};
    sigemptyset(&action.sa_mask);
    sigaction(SIGUSR1, &action, NULL);
    signal(SIGALRM, deadline_signal);
    alarm(20); // Bounded even if worker joins cannot complete.
    wrlock_init(&rw);
    if (!raw) {
        write_wrlock(&rw);
        pthread_t mask_waiter;
        if (pthread_create(&mask_waiter, NULL, check_blocked_mask, NULL)) abort();
        while (!atomic_load(&mask_waiter_started)) sched_yield();
        usleep(20000);
        write_wrunlock(&rw);
        if (pthread_join(mask_waiter, NULL)) abort();
    }
    pthread_t threads[THREADS];
    for (uintptr_t index = 0; index < THREADS; index++)
        if (pthread_create(&threads[index], NULL, worker, (void *)index)) abort();
    unsigned long previous = 0;
    double started = now(), last_progress = started;
    while (now() - started < 10) {
        usleep(5000);
        for (int index = 0; index < THREADS; index++)
            pthread_kill(threads[index], SIGUSR1);
        unsigned long current = atomic_load(&progress);
        if (current != previous) last_progress = now();
        previous = current;
        if (now() - last_progress > 2) {
            fprintf(stderr, "rwlock STALLED mode=%s operations=%lu holders=%d\n",
                    raw ? "raw" : "runtime", current, atomic_load(&holders));
            return 2;
        }
    }
    atomic_store(&done, true);
    for (int index = 0; index < THREADS; index++)
        if (pthread_join(threads[index], NULL)) abort();
    wrlock_destroy(&rw);
    alarm(0);
    printf("rwlock PASS mode=%s operations=%lu\n", raw ? "raw" : "runtime", atomic_load(&progress));
}
