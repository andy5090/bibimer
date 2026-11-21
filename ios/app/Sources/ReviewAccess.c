#include "ReviewAccess.h"
#include <CommonCrypto/CommonDigest.h>
#include <string.h>
static int nibble(char c) { return c>='0'&&c<='9'?c-'0':c>='a'&&c<='f'?c-'a'+10:c>='A'&&c<='F'?c-'A'+10:-1; }
int bibimer_review_configured(const char *digest) {
    if (!digest || strlen(digest)!=64) return 0;
    for (size_t i=0;i<64;i++) if(nibble(digest[i])<0)return 0;
    return 1;
}
int bibimer_review_verify(const char *digest,const unsigned char *code,size_t length) {
    if(!bibimer_review_configured(digest)||!code||!length||length>128)return 0;
    int nonspace=0;for(size_t i=0;i<length;i++){if(code[i]<32||code[i]==127)return 0;if(code[i]!=' ')nonspace=1;}
    if(!nonspace)return 0;
    unsigned char actual[CC_SHA256_DIGEST_LENGTH];CC_SHA256(code,(CC_LONG)length,actual);
    unsigned int different=0;for(size_t i=0;i<sizeof(actual);i++)different|=actual[i]^((nibble(digest[i*2])<<4)|nibble(digest[i*2+1]));
    memset(actual,0,sizeof(actual));return different==0;
}
