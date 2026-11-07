#import <Foundation/Foundation.h>
// App-selected language applies to our native labels; OS permission sheets use OS localization.
static inline NSString *BibimerLocalized(NSString *key) {
    NSString *language=[NSUserDefaults.standardUserDefaults stringForKey:@"languagePreference"];
    NSBundle *bundle=NSBundle.mainBundle;
    if(language.length && ![language isEqual:@"system"]){
        NSString *path=[bundle pathForResource:language ofType:@"lproj"];
        if(path)bundle=[NSBundle bundleWithPath:path];
    }
    return [bundle localizedStringForKey:key value:key table:nil];
}
