#ifndef BIBIMER_REVIEW_ACCESS_H
#define BIBIMER_REVIEW_ACCESS_H
#include <stddef.h>
int bibimer_review_configured(const char *digest);
int bibimer_review_verify(const char *digest, const unsigned char *code, size_t length);
#endif
