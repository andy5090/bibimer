/* Host-only fakefs converter logging; never linked into the iOS app. */
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
void ish_printk(const char *format, ...) {
    va_list args;
    va_start(args, format);
    vfprintf(stderr, format, args);
    va_end(args);
}
_Noreturn void die(const char *format, ...) {
    va_list args;
    va_start(args, format);
    vfprintf(stderr, format, args);
    va_end(args);
    abort();
}
