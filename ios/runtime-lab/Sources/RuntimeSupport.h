#pragma once
int bibimer_prepare_devices(void);
// Stops guest tasks except PID 1. Returns zero only after none remain alive.
// Does not unmount, reset the kernel, start a process, or send host signals.
int bibimer_stop_guest_children(void);
