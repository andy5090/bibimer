#include <sys/stat.h>
#include "kernel/calls.h"
#include "fs/path.h"
#include "RuntimeSupport.h"

int bibimer_create_directory(const char *path) {
    int result = generic_mkdirat(AT_PWD, path, 0700);
    return result == _EEXIST ? 0 : result;
}
