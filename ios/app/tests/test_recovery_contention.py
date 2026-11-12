"""Run the actual recovery helper against contended host mutexes, without iOS."""
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


MOCK = r'''
#pragma once
#include <pthread.h>
#include <stdbool.h>
#include <stdint.h>
#include <sys/stat.h>
typedef pthread_mutex_t lock_t;
typedef pthread_cond_t cond_t;
#define trylock(p) pthread_mutex_trylock(p)
#define unlock(p) pthread_mutex_unlock(p)
#define notify(p) pthread_cond_broadcast(p)
#define MAX_PID 4
#define SIGTERM_ 15
#define SIGKILL_ 9
struct list { struct list *next, *prev; };
static inline void list_add_tail(struct list *head, struct list *item) {
 item->next=head; item->prev=head->prev; head->prev->next=item; head->prev=item;
}
struct siginfo_ { int sig, code; };
static const struct siginfo_ SIGINFO_NIL = {0};
struct sigqueue { struct list queue; struct siginfo_ info; };
struct sighand { lock_t lock; };
struct tgroup { lock_t lock; bool stopped; cond_t stopped_cond; };
struct task {
 bool is_native_proxy, exiting; struct task *parent; struct tgroup *group;
 struct sighand *sighand; lock_t waiting_cond_lock; uint64_t pending;
 struct list queue; cond_t pause; cond_t *waiting_cond; pthread_t thread; int cpu;
};
#define sigset_has(set,sig) ((set) & (1ULL << (sig)))
#define sigset_add(set,sig) (*(set) |= (1ULL << (sig)))
static lock_t pids_lock = PTHREAD_MUTEX_INITIALIZER;
static struct task *pids[MAX_PID+1];
static inline struct task *pid_get_task(unsigned pid) { return pids[pid]; }
static inline void cpu_poke(int *cpu) { ++*cpu; }
#define AT_PWD 0
#define DEV_NULL_MINOR 0
#define DEV_ZERO_MINOR 1
#define DEV_FULL_MINOR 2
#define DEV_RANDOM_MINOR 3
#define DEV_URANDOM_MINOR 4
#define MEM_MAJOR 1
#define _EEXIST 17
#define dev_make(a,b) ((a)+(b))
static inline int generic_mknodat(int a,const char *b,int c,int d) { (void)a;(void)b;(void)c;(void)d;return 0; }
static inline int generic_mkdirat(int a,const char *b,int c) { (void)a;(void)b;(void)c;return 0; }
'''

HARNESS = r'''
#include <assert.h>
#include <errno.h>
#include <stdlib.h>
#include <time.h>
#include "mock.h"
static int sends;
static int fixture_kill(pthread_t thread, int signal) { (void)thread;(void)signal; sends++;return 0; }
static int fixture_sleep(const struct timespec *delay, struct timespec *remaining) {
 (void)delay;(void)remaining;
 if (pids[2] && sigset_has(pids[2]->pending,SIGKILL_)) pids[2]=NULL;
 return 0;
}
#define nanosleep fixture_sleep
#define pthread_kill fixture_kill
#include "RECOVERY_SOURCE"
static struct task init, child;
static struct sighand sighand;
static struct tgroup group;
static void reset(void) {
 child.pending=0; child.exiting=false; child.is_native_proxy=false;
 child.queue.next=child.queue.prev=&child.queue; child.sighand=&sighand; child.group=&group;
 pids[1]=&init; pids[2]=&child; sends=0;
}
static void contended(lock_t *held) {
 reset(); pthread_mutex_lock(held);
 assert(bibimer_stop_guest_children()==-ETIMEDOUT);
 assert(pids[1]==&init && pids[2]==&child && sends==0);
 assert(pthread_mutex_trylock(&pids_lock)==0); pthread_mutex_unlock(&pids_lock);
 pthread_mutex_unlock(held);
 assert(bibimer_stop_guest_children()==0);
 assert(pids[1]==&init && pids[2]==NULL && sends>0);
 assert(bibimer_recovery_stage()==4);
}
int main(void) {
 pthread_mutex_init(&sighand.lock,NULL); pthread_mutex_init(&group.lock,NULL);
 pthread_mutex_init(&child.waiting_cond_lock,NULL); pthread_cond_init(&child.pause,NULL);
 pthread_cond_init(&group.stopped_cond,NULL);
 contended(&sighand.lock); contended(&group.lock); contended(&child.waiting_cond_lock);
 reset(); pthread_mutex_lock(&pids_lock);
 assert(bibimer_stop_guest_children()==-ETIMEDOUT); pthread_mutex_unlock(&pids_lock);
 reset(); child.is_native_proxy=true;
 assert(bibimer_stop_guest_children()==-ENOTSUP && sends==0 && pids[1]==&init);
 reset(); pids[1]=NULL;
 assert(bibimer_stop_guest_children()==-ESRCH && sends==0);
 return 0;
}
'''


class RecoveryContentionTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which('cc') or shutil.which('clang'), 'host C compiler required')
    def test_contended_guest_locks_return_and_allow_another_attempt(self):
        compiler = shutil.which('cc') or shutil.which('clang')
        source = Path(__file__).parents[2] / 'runtime-lab/Sources/RuntimeSupport.c'
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root/'mock.h').write_text(MOCK)
            for relative in ['kernel/calls.h','kernel/task.h','fs/dev.h','fs/devices.h','fs/path.h']:
                path = root/relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('#include "mock.h"\n')
            harness = root/'harness.c'
            harness.write_text(HARNESS.replace('RECOVERY_SOURCE',str(source.resolve())))
            binary = root/'recovery-test'
            subprocess.run([compiler,'-std=gnu11','-pthread','-I',str(root),'-I',str(source.parent),
                            str(harness),'-o',str(binary)],check=True,capture_output=True,text=True)
            subprocess.run([str(binary)],check=True,timeout=5)


if __name__ == '__main__':
    unittest.main()
