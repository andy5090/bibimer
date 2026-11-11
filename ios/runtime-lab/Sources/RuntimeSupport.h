#pragma once
int bibimer_prepare_devices(void);
// Stops guest tasks except PID 1. Returns zero only after none remain alive.
// Does not unmount, reset the kernel, start a process, or send host signals.
int bibimer_stop_guest_children(void);
// Lock-free status only: 0 idle, 1 PID lock, 2 signal delivery, 3 waiting,
// 4 stopped, 5 failed, 6 init unavailable. Never exposes task names/output.
int bibimer_recovery_stage(void);
int bibimer_recovery_remaining(void);
