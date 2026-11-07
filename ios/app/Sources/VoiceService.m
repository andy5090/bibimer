#import "VoiceService.h"
#import <AVFoundation/AVFoundation.h>
#import <Speech/Speech.h>
#import <Security/Security.h>

static BOOL textValue(id value, NSUInteger limit) { return [value isKindOfClass:NSString.class] && [value length] <= limit; }
static NSString *statusCode(NSInteger status) { return status == 401 ? @"voice_auth" : status == 403 ? @"voice_forbidden" : status == 429 ? @"voice_limit" : @"voice_failed"; }
static NSData *secret(NSString *purpose, NSString *provider, NSString *value, BOOL remove) {
    NSDictionary *query = @{(__bridge id)kSecClass:(__bridge id)kSecClassGenericPassword,
        (__bridge id)kSecAttrService:@"app.bibimer.ios.voice",(__bridge id)kSecAttrAccount:[purpose stringByAppendingFormat:@"/%@",provider]};
    if (value || remove) {
        if (remove) { SecItemDelete((__bridge CFDictionaryRef)query); return nil; }
        NSData *bytes = [value dataUsingEncoding:NSUTF8StringEncoding];
        OSStatus updated = SecItemUpdate((__bridge CFDictionaryRef)query,(__bridge CFDictionaryRef)@{(__bridge id)kSecValueData:bytes});
        if (updated == errSecItemNotFound) {
            NSMutableDictionary *item = [query mutableCopy]; item[(__bridge id)kSecValueData] = bytes;
            item[(__bridge id)kSecAttrAccessible] = (__bridge id)kSecAttrAccessibleWhenUnlockedThisDeviceOnly;
            updated = SecItemAdd((__bridge CFDictionaryRef)item,NULL);
        }
        return updated == errSecSuccess ? bytes : nil;
    }
    NSMutableDictionary *read = [query mutableCopy];read[(__bridge id)kSecReturnData]=@YES;
    CFTypeRef result = NULL;
    if (SecItemCopyMatching((__bridge CFDictionaryRef)read,&result) != errSecSuccess) return nil;
    return CFBridgingRelease(result);
}

// Bounded, ephemeral, fixed-endpoint requests. Redirects, cookies and retries are disabled.
@interface BibimerVoiceRequest : NSObject <NSURLSessionDataDelegate>
@property NSURLSession *session;
@property NSURLSessionDataTask *task;
@property NSMutableData *data;
@property NSUInteger limit;
@property NSInteger status;
@property NSString *mime;
@property(copy) void (^done)(NSData *,NSInteger,NSString *);
- (void)start:(NSURLRequest *)request limit:(NSUInteger)limit done:(void (^)(NSData *,NSInteger,NSString *))done;
- (void)cancel;
@end
@implementation BibimerVoiceRequest
- (void)start:(NSURLRequest *)request limit:(NSUInteger)limit done:(void (^)(NSData *,NSInteger,NSString *))done {
    self.limit=limit;self.done=done;self.data=[NSMutableData new];
    NSURLSessionConfiguration *config=NSURLSessionConfiguration.ephemeralSessionConfiguration;
    config.HTTPCookieStorage=nil;config.HTTPShouldSetCookies=NO;config.URLCache=nil;
    config.requestCachePolicy=NSURLRequestReloadIgnoringLocalCacheData;config.timeoutIntervalForRequest=60;config.timeoutIntervalForResource=90;
    self.session=[NSURLSession sessionWithConfiguration:config delegate:self delegateQueue:NSOperationQueue.mainQueue];
    self.task=[self.session dataTaskWithRequest:request];[self.task resume];
}
- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task willPerformHTTPRedirection:(NSHTTPURLResponse *)response newRequest:(NSURLRequest *)request completionHandler:(void (^)(NSURLRequest *))completionHandler { completionHandler(nil); }
- (void)URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)task didReceiveResponse:(NSURLResponse *)response completionHandler:(void (^)(NSURLSessionResponseDisposition))completionHandler {
    self.status=[(NSHTTPURLResponse *)response statusCode];self.mime=response.MIMEType;
    completionHandler(response.expectedContentLength > (int64_t)self.limit ? NSURLSessionResponseCancel : NSURLSessionResponseAllow);
}
- (void)URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)task didReceiveData:(NSData *)data {
    if (data.length > self.limit-self.data.length) { [task cancel];return; } [self.data appendData:data];
}
- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *)error {
    void (^done)(NSData *,NSInteger,NSString *)=self.done;self.done=nil;
    [session finishTasksAndInvalidate];self.session=nil;self.task=nil;
    if (done) done(error ? nil : self.data,self.status,self.mime);self.data=nil;
}
- (void)cancel { self.done=nil;[self.session invalidateAndCancel];self.session=nil;self.task=nil;self.data=nil; }
@end

@interface BibimerVoiceService () <AVSpeechSynthesizerDelegate,AVAudioPlayerDelegate>
@property AVSpeechSynthesizer *synth;
@property AVSpeechUtterance *utterance;
@property AVAudioEngine *engine;
@property SFSpeechRecognizer *recognizer;
@property SFSpeechRecognitionTask *recognition;
@property SFSpeechAudioBufferRecognitionRequest *recognitionRequest;
@property AVAudioRecorder *recorder;
@property AVAudioPlayer *player;
@property NSURL *recordURL;
@property UIAlertController *dialog;
@property NSString *inputID;
@property NSString *context;
@property NSString *readContext;
@property NSString *messageID;
@property NSString *status;
@property NSString *voicePage;
@property NSArray *remoteVoices;
@property NSArray<NSString *> *chunks;
@property NSUInteger chunk;
@property NSUInteger generation;
@property BOOL reading;
@property BOOL busy;
@property BOOL tapInstalled;
@property BOOL more;
@property BibimerVoiceRequest *request;
@property NSDictionary *labels;
@end
@implementation BibimerVoiceService
- (instancetype)init {
    if ((self=[super init])) {
        self.synth=[AVSpeechSynthesizer new];self.synth.delegate=self;self.context=@"";self.remoteVoices=@[];
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(pause) name:UIApplicationDidEnterBackgroundNotification object:nil];
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(interrupted:) name:AVAudioSessionInterruptionNotification object:nil];
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(routeChanged:) name:AVAudioSessionRouteChangeNotification object:nil];
        NSURL *directory=[NSURL fileURLWithPath:NSTemporaryDirectory()];
        for (NSURL *url in [NSFileManager.defaultManager contentsOfDirectoryAtURL:directory includingPropertiesForKeys:nil options:0 error:nil])
            if ([url.lastPathComponent hasPrefix:@"bibimer-voice-"]) [NSFileManager.defaultManager removeItemAtURL:url error:nil];
    } return self;
}
- (void)dealloc { [NSNotificationCenter.defaultCenter removeObserver:self]; }
- (NSString *)preference:(NSString *)key fallback:(NSString *)fallback { return [NSUserDefaults.standardUserDefaults stringForKey:key] ?: fallback; }
- (BOOL)enabled { return [NSUserDefaults.standardUserDefaults boolForKey:@"ttsEnabled"]; }
- (void)signal:(NSString *)callback arguments:(NSArray *)arguments { if (self.emit) self.emit(callback,arguments); }
- (void)changed:(NSString *)status {
    self.status=status ?: @"";[self signal:@"BibimerSpeechOutputChanged" arguments:@[self.status]];
}
- (NSDictionary *)environment {
    NSMutableArray *voices=[NSMutableArray new];
    for (AVSpeechSynthesisVoice *voice in AVSpeechSynthesisVoice.speechVoices)
        [voices addObject:@{@"id":voice.identifier,@"label":[NSString stringWithFormat:@"%@ · %@",voice.name,voice.language],@"network":@NO}];
    NSString *provider=[self preference:@"ttsProvider" fallback:@"android"];
    return @{@"voiceInput":@{@"provider":[self preference:@"voiceProvider" fallback:@"device"],@"language":[self preference:@"voiceLanguage" fallback:@""],
        @"openaiKey":@(secret(@"input",@"openai",nil,NO)!=nil),@"elevenlabsKey":@(secret(@"input",@"elevenlabs",nil,NO)!=nil)},
        @"speechOutput":@{@"enabled":@([self enabled]),@"provider":provider,@"mode":[self preference:@"ttsMode" fallback:@"full"],@"engine":@"",@"engines":@[],
        @"voice":[self preference:[@"ttsVoice/" stringByAppendingString:provider] fallback:@""],@"voices":[provider isEqual:@"android"] ? voices : self.remoteVoices,
        @"voicesLoaded":@([provider isEqual:@"android"] || self.voicePage!=nil),@"more":@(self.more),@"elevenlabsKey":@(secret(@"output",@"elevenlabs",nil,NO)!=nil),
        @"busy":@(self.busy),@"reading":@(self.reading),@"readContext":self.readContext ?: @"",@"messageId":self.messageID ?: @"",@"status":self.status ?: @""}};
}
- (NSString *)label:(NSString *)key { return textValue(self.labels[key],2000) ? self.labels[key] : key; }
- (BOOL)active { return UIApplication.sharedApplication.applicationState==UIApplicationStateActive && self.presenter.view.window!=nil; }
- (void)deactivateAudio {
    [AVAudioSession.sharedInstance setActive:NO withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation error:nil];
}
- (void)stopOutput {
    self.generation++;self.reading=NO;self.busy=NO;self.messageID=nil;self.readContext=nil;self.chunks=nil;self.utterance=nil;
    [self.request cancel];self.request=nil;[self.synth stopSpeakingAtBoundary:AVSpeechBoundaryImmediate];[self.player stop];self.player.delegate=nil;self.player=nil;
    [self deactivateAudio];[self changed:@""];
}
- (void)cleanupInput {
    [self.engine stop];if(self.tapInstalled){[self.engine.inputNode removeTapOnBus:0];self.tapInstalled=NO;}
    [self.recognitionRequest endAudio];[self.recognition cancel];self.recognition=nil;self.recognitionRequest=nil;self.engine=nil;self.recognizer=nil;
    [self.recorder stop];self.recorder=nil;
    if(self.recordURL)[NSFileManager.defaultManager removeItemAtURL:self.recordURL error:nil];self.recordURL=nil;
    for(UITextField *field in self.dialog.textFields)field.text=@"";
    if(self.dialog.presentingViewController)[self.dialog dismissViewControllerAnimated:NO completion:nil];self.dialog=nil;
    [self deactivateAudio];
}
- (void)finishInput:(NSString *)status text:(NSString *)text {
    NSString *identifier=self.inputID;self.inputID=nil;[self cleanupInput];
    if(identifier)[self signal:@"BibimerVoiceResult" arguments:@[identifier,status,text ?: @""]];
}
- (void)pause { [self.request cancel];self.request=nil;[self finishInput:@"cancelled" text:nil];[self stopOutput];[self signal:@"BibimerVoiceSettingsChanged" arguments:@[@""]]; }
- (void)interrupted:(NSNotification *)event { if([event.userInfo[AVAudioSessionInterruptionTypeKey] integerValue]==AVAudioSessionInterruptionTypeBegan)[self pause]; }
- (void)routeChanged:(NSNotification *)event { if([event.userInfo[AVAudioSessionRouteChangeReasonKey] integerValue]==AVAudioSessionRouteChangeReasonOldDeviceUnavailable)[self pause]; }
- (void)showRecording {
    self.dialog=[UIAlertController alertControllerWithTitle:[self label:@"voice_recording"] message:[self label:@"voice_record_hint"] preferredStyle:UIAlertControllerStyleAlert];
    __weak typeof(self) weak=self;
    [self.dialog addAction:[UIAlertAction actionWithTitle:[self label:@"voice_cancel"] style:UIAlertActionStyleCancel handler:^(UIAlertAction *action){[weak pause];}]];
    [self.dialog addAction:[UIAlertAction actionWithTitle:[self label:@"voice_stop_recording"] style:UIAlertActionStyleDefault handler:^(UIAlertAction *action){
        if(weak.recorder){[weak.recorder stop];weak.recorder=nil;[weak.dialog dismissViewControllerAnimated:YES completion:^{[weak confirmUpload];}];}
        else { [weak.engine stop];[weak.recognitionRequest endAudio]; }
    }]];
    [self.presenter presentViewController:self.dialog animated:YES completion:nil];
}
- (void)startCapture:(NSString *)identifier {
    if(![self.inputID isEqual:identifier])return;
    if(![self active]){[self finishInput:@"cancelled" text:nil];return;}
    NSError *error=nil;AVAudioSession *session=AVAudioSession.sharedInstance;
    if(![session setCategory:AVAudioSessionCategoryRecord mode:AVAudioSessionModeMeasurement options:0 error:&error] || ![session setActive:YES error:&error]){[self finishInput:@"voice_failed" text:nil];return;}
    if([[self preference:@"voiceProvider" fallback:@"device"] isEqual:@"device"]){
        NSString *language=[self preference:@"voiceLanguage" fallback:@""];NSLocale *locale=language.length ? [NSLocale localeWithLocaleIdentifier:language] : NSLocale.currentLocale;
        self.recognizer=[[SFSpeechRecognizer alloc] initWithLocale:locale];
        if(!self.recognizer.available){[self finishInput:@"unavailable" text:nil];return;}
        self.engine=[AVAudioEngine new];self.recognitionRequest=[SFSpeechAudioBufferRecognitionRequest new];self.recognitionRequest.shouldReportPartialResults=NO;
        AVAudioFormat *format=[self.engine.inputNode outputFormatForBus:0];
        if(format.sampleRate<=0 || format.channelCount==0){[self finishInput:@"unavailable" text:nil];return;}
        SFSpeechAudioBufferRecognitionRequest *request=self.recognitionRequest;
        [self.engine.inputNode installTapOnBus:0 bufferSize:1024 format:format block:^(AVAudioPCMBuffer *buffer,AVAudioTime *time){[request appendAudioPCMBuffer:buffer];}];self.tapInstalled=YES;
        __weak typeof(self) weak=self;
        self.recognition=[self.recognizer recognitionTaskWithRequest:request resultHandler:^(SFSpeechRecognitionResult *result,NSError *failure){
            dispatch_async(dispatch_get_main_queue(),^{
                if(![weak.inputID isEqual:identifier])return;
                if(result.final){NSString *text=result.bestTranscription.formattedString;[weak finishInput:text.length ? @"ok" : @"voice_empty" text:text];}
                else if(failure)[weak finishInput:@"voice_failed" text:nil];
            });
        }];
        [self.engine prepare];if(![self.engine startAndReturnError:&error]){[self finishInput:@"voice_failed" text:nil];return;}
    }else{
        self.recordURL=[[NSURL fileURLWithPath:NSTemporaryDirectory()] URLByAppendingPathComponent:[@"bibimer-voice-" stringByAppendingFormat:@"%@.m4a",NSUUID.UUID.UUIDString]];
        self.recorder=[[AVAudioRecorder alloc] initWithURL:self.recordURL settings:@{AVFormatIDKey:@(kAudioFormatMPEG4AAC),AVSampleRateKey:@16000,AVNumberOfChannelsKey:@1,AVEncoderBitRateKey:@64000} error:&error];
        [NSFileManager.defaultManager setAttributes:@{NSFileProtectionKey:NSFileProtectionComplete} ofItemAtPath:self.recordURL.path error:nil];
        if(![self.recorder recordForDuration:60]){[self finishInput:@"voice_failed" text:nil];return;}
    }
    [self showRecording];
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW,60*NSEC_PER_SEC),dispatch_get_main_queue(),^{
        if(![self.inputID isEqual:identifier])return;
        if(self.recorder){[self.recorder stop];self.recorder=nil;[self.dialog dismissViewControllerAnimated:NO completion:^{[self confirmUpload];}];}
        else if(self.engine){[self.engine stop];[self.recognitionRequest endAudio];}
    });
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW,75*NSEC_PER_SEC),dispatch_get_main_queue(),^{if([self.inputID isEqual:identifier]&&!self.request)[self finishInput:@"voice_failed" text:nil];});
}
- (void)startInput:(NSString *)identifier {
    if(![self active] || self.presenter.presentedViewController){[self signal:@"BibimerVoiceResult" arguments:@[identifier,@"unavailable",@""]];return;}
    [self pause];self.inputID=identifier;
    NSString *provider=[self preference:@"voiceProvider" fallback:@"device"];
    if(![provider isEqual:@"device"]&&!secret(@"input",provider,nil,NO)){[self finishInput:@"voice_key_required" text:nil];return;}
    void (^microphone)(void)=^{
        [AVAudioSession.sharedInstance requestRecordPermission:^(BOOL allowed){dispatch_async(dispatch_get_main_queue(),^{
            if(![self.inputID isEqual:identifier])return;
            if(!allowed){[self finishInput:@"voice_permission" text:nil];return;}[self startCapture:identifier];
        });}];
    };
    if([provider isEqual:@"device"])[SFSpeechRecognizer requestAuthorization:^(SFSpeechRecognizerAuthorizationStatus status){dispatch_async(dispatch_get_main_queue(),^{
        if(![self.inputID isEqual:identifier])return;
        if(status!=SFSpeechRecognizerAuthorizationStatusAuthorized)[self finishInput:@"voice_permission" text:nil];else microphone();
    });}];else microphone();
}
- (NSMutableURLRequest *)api:(NSString *)purpose provider:(NSString *)provider path:(NSString *)path {
    NSString *key=[[NSString alloc] initWithData:secret(purpose,provider,nil,NO) encoding:NSUTF8StringEncoding];if(!key.length)return nil;
    NSString *base=[provider isEqual:@"openai"] ? @"https://api.openai.com/" : @"https://api.elevenlabs.io/";
    NSMutableURLRequest *request=[NSMutableURLRequest requestWithURL:[NSURL URLWithString:[base stringByAppendingString:path]]];
    [request setValue:[provider isEqual:@"openai"] ? [@"Bearer " stringByAppendingString:key] : key forHTTPHeaderField:[provider isEqual:@"openai"] ? @"Authorization" : @"xi-api-key"];
    return request;
}
- (void)confirmUpload {
    if(!self.inputID || ![self active]){[self finishInput:@"cancelled" text:nil];return;}
    self.dialog=[UIAlertController alertControllerWithTitle:[self label:@"voice_upload"] message:[self label:@"voice_upload_hint"] preferredStyle:UIAlertControllerStyleAlert];
    __weak typeof(self) weak=self;
    [self.dialog addAction:[UIAlertAction actionWithTitle:[self label:@"voice_cancel"] style:UIAlertActionStyleCancel handler:^(UIAlertAction *action){[weak pause];}]];
    [self.dialog addAction:[UIAlertAction actionWithTitle:[self label:@"voice_upload"] style:UIAlertActionStyleDefault handler:^(UIAlertAction *action){[weak upload];}]];
    dispatch_async(dispatch_get_main_queue(),^{if(self.inputID && [self active] && !self.presenter.presentedViewController)[self.presenter presentViewController:self.dialog animated:YES completion:nil];});
}
- (void)upload {
    NSString *identifier=self.inputID,*provider=[self preference:@"voiceProvider" fallback:@"device"];
    NSData *audio=[NSData dataWithContentsOfURL:self.recordURL options:NSDataReadingMappedIfSafe error:nil];
    if(!identifier || !audio.length || audio.length>12*1024*1024){[self finishInput:@"voice_failed" text:nil];return;}
    NSMutableURLRequest *request=[self api:@"input" provider:provider path:[provider isEqual:@"openai"] ? @"v1/audio/transcriptions" : @"v1/speech-to-text"];
    if(!request){[self finishInput:@"voice_key_required" text:nil];return;}
    NSString *boundary=[@"bibimer-" stringByAppendingString:NSUUID.UUID.UUIDString];NSMutableData *body=[NSMutableData new];
    void (^field)(NSString *,NSString *)=^(NSString *name,NSString *value){[body appendData:[[NSString stringWithFormat:@"--%@\r\nContent-Disposition: form-data; name=\"%@\"\r\n\r\n%@\r\n",boundary,name,value] dataUsingEncoding:NSUTF8StringEncoding]];};
    field([provider isEqual:@"openai"] ? @"model" : @"model_id",[provider isEqual:@"openai"] ? @"gpt-transcribe" : @"scribe_v2");
    NSString *language=[self preference:@"voiceLanguage" fallback:@""];if(language.length)field([provider isEqual:@"openai"] ? @"languages[]" : @"language_code",language);
    if([provider isEqual:@"elevenlabs"]){field(@"tag_audio_events",@"false");field(@"timestamps_granularity",@"none");}
    [body appendData:[[NSString stringWithFormat:@"--%@\r\nContent-Disposition: form-data; name=\"file\"; filename=\"speech.m4a\"\r\nContent-Type: audio/mp4\r\n\r\n",boundary] dataUsingEncoding:NSUTF8StringEncoding]];[body appendData:audio];
    [body appendData:[[NSString stringWithFormat:@"\r\n--%@--\r\n",boundary] dataUsingEncoding:NSUTF8StringEncoding]];
    request.HTTPMethod=@"POST";request.HTTPBody=body;[request setValue:[@"multipart/form-data; boundary=" stringByAppendingString:boundary] forHTTPHeaderField:@"Content-Type"];
    self.request=[BibimerVoiceRequest new];[self.request start:request limit:1024*1024 done:^(NSData *data,NSInteger status,NSString *mime){
        self.request=nil;if(![self.inputID isEqual:identifier])return;
        NSDictionary *json=data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;id text=[json isKindOfClass:NSDictionary.class] ? json[@"text"] : nil;
        if(status!=200 || !data){[self finishInput:statusCode(status) text:nil];return;}
        if(!textValue(text,65536)){[self finishInput:@"voice_failed" text:nil];return;}
        [self finishInput:[text length] ? @"ok" : @"voice_empty" text:text];
    }];
}
- (void)keyAction:(NSDictionary *)message {
    NSString *purpose=[message[@"purpose"] isEqual:@"output"] ? @"output" : @"input",*provider=message[@"provider"],*action=message[@"operation"];
    if(![@[@"openai",@"elevenlabs"] containsObject:provider] || ([purpose isEqual:@"output"]&&![provider isEqual:@"elevenlabs"]))return;
    if(self.inputID || self.reading || self.busy || ![self active])return;
    NSString *callback=[purpose isEqual:@"output"] ? @"BibimerSpeechOutputChanged" : @"BibimerVoiceSettingsChanged";
    if([action isEqual:@"remove"]){secret(purpose,provider,nil,YES);self.voicePage=nil;self.remoteVoices=@[];self.more=NO;[self signal:callback arguments:@[@""]];return;}
    if([action isEqual:@"check"] && [purpose isEqual:@"input"]){
        NSMutableURLRequest *request=[self api:purpose provider:provider path:[provider isEqual:@"openai"] ? @"v1/models/gpt-transcribe" : @"v1/user"];
        if(!request){[self signal:callback arguments:@[@"voice_key_required"]];return;}
        self.busy=YES;self.request=[BibimerVoiceRequest new];[self.request start:request limit:1024*1024 done:^(NSData *data,NSInteger status,NSString *mime){self.request=nil;self.busy=NO;[self signal:callback arguments:@[data && status==200 ? @"voice_checked" : statusCode(status)]];}];return;
    }
    if(![action isEqual:@"edit"] || self.presenter.presentedViewController)return;
    UIAlertController *dialog=[UIAlertController alertControllerWithTitle:[self label:@"voice_key"] message:[self label:@"voice_key_hint"] preferredStyle:UIAlertControllerStyleAlert];
    __weak UIAlertController *weakDialog=dialog;
    [dialog addTextFieldWithConfigurationHandler:^(UITextField *field){field.secureTextEntry=YES;field.autocorrectionType=UITextAutocorrectionTypeNo;field.autocapitalizationType=UITextAutocapitalizationTypeNone;field.textContentType=nil;}];
    [dialog addAction:[UIAlertAction actionWithTitle:[self label:@"voice_cancel"] style:UIAlertActionStyleCancel handler:^(UIAlertAction *action){weakDialog.textFields.firstObject.text=@"";self.dialog=nil;}]];
    [dialog addAction:[UIAlertAction actionWithTitle:[self label:@"voice_save"] style:UIAlertActionStyleDefault handler:^(UIAlertAction *action){
        NSString *key=weakDialog.textFields.firstObject.text;NSCharacterSet *invalid=[[NSCharacterSet characterSetWithRange:NSMakeRange(33,94)] invertedSet];
        BOOL valid=key.length>0 && key.length<=512 && [key rangeOfCharacterFromSet:invalid].location==NSNotFound;
        BOOL stored=valid && secret(purpose,provider,key,NO)!=nil;weakDialog.textFields.firstObject.text=@"";self.dialog=nil;
        [self signal:callback arguments:@[stored ? @"" : @"voice_failed"]];
    }]];self.dialog=dialog;[self.presenter presentViewController:dialog animated:YES completion:nil];
}
- (void)refreshVoices:(BOOL)more {
    if(![self enabled] || self.inputID || self.reading || self.busy)return;
    if(![[self preference:@"ttsProvider" fallback:@"android"] isEqual:@"elevenlabs"]){[self changed:@""];return;}
    NSString *page=more ? self.voicePage : @"";if(more && (!self.more || !page.length))return;
    NSString *escaped=[page stringByAddingPercentEncodingWithAllowedCharacters:[NSCharacterSet characterSetWithCharactersInString:@"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"]];
    NSMutableURLRequest *request=[self api:@"output" provider:@"elevenlabs" path:[@"v2/voices?page_size=100" stringByAppendingFormat:@"%@",page.length ? [@"&next_page_token=" stringByAppendingString:escaped] : @""]];
    if(!request){[self changed:@"voice_key_required"];return;}self.busy=YES;[self changed:@""];
    self.request=[BibimerVoiceRequest new];[self.request start:request limit:2*1024*1024 done:^(NSData *data,NSInteger status,NSString *mime){
        self.request=nil;self.busy=NO;NSDictionary *json=data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
        if(status!=200 || ![json isKindOfClass:NSDictionary.class] || ![json[@"voices"] isKindOfClass:NSArray.class]){[self changed:statusCode(status)];return;}
        NSMutableArray *rows=more ? [self.remoteVoices mutableCopy] : [NSMutableArray new];
        for(id row in json[@"voices"]){if(![row isKindOfClass:NSDictionary.class])continue;NSString *identifier=row[@"voice_id"],*name=row[@"name"];
            if(textValue(identifier,128) && [identifier rangeOfString:@"^[A-Za-z0-9_-]{1,128}$" options:NSRegularExpressionSearch].location!=NSNotFound && rows.count<1000)
                [rows addObject:@{@"id":identifier,@"label":textValue(name,200) ? name : identifier}];}
        self.remoteVoices=rows;self.voicePage=textValue(json[@"next_page_token"],1024) ? json[@"next_page_token"] : @"";self.more=[json[@"has_more"] boolValue] && self.voicePage.length>0;[self changed:@""];
    }];
}
- (void)nextChunk {
    if(!self.reading || ![self active] || ![self.context isEqual:self.readContext]){[self stopOutput];return;}
    if(self.chunk>=self.chunks.count){[self stopOutput];return;}
    NSString *text=self.chunks[self.chunk++],*provider=[self preference:@"ttsProvider" fallback:@"android"];
    if([provider isEqual:@"android"]){
        AVSpeechUtterance *utterance=[AVSpeechUtterance speechUtteranceWithString:text];NSString *identifier=[self preference:@"ttsVoice/android" fallback:@""];
        NSString *language=[self preference:@"languagePreference" fallback:@"system"];
        if([language isEqual:@"system"])language=NSLocale.preferredLanguages.firstObject;
        utterance.voice=identifier.length ? [AVSpeechSynthesisVoice voiceWithIdentifier:identifier] : [AVSpeechSynthesisVoice voiceWithLanguage:language];
        if(identifier.length&&!utterance.voice){[self stopOutput];[self changed:@"tts_unavailable"];return;}
        utterance.rate=AVSpeechUtteranceDefaultSpeechRate;utterance.prefersAssistiveTechnologySettings=YES;self.utterance=utterance;[self.synth speakUtterance:utterance];return;
    }
    NSString *voice=[self preference:@"ttsVoice/elevenlabs" fallback:@""];
    if([voice rangeOfString:@"^[A-Za-z0-9_-]{1,128}$" options:NSRegularExpressionSearch].location==NSNotFound){[self stopOutput];[self changed:@"tts_unavailable"];return;}
    NSMutableURLRequest *request=[self api:@"output" provider:@"elevenlabs" path:[NSString stringWithFormat:@"v1/text-to-speech/%@?output_format=mp3_44100_128",voice]];
    if(!request){[self stopOutput];[self changed:@"voice_key_required"];return;}
    request.HTTPMethod=@"POST";request.HTTPBody=[NSJSONSerialization dataWithJSONObject:@{@"text":text,@"model_id":@"eleven_multilingual_v2"} options:0 error:nil];[request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];[request setValue:@"audio/mpeg" forHTTPHeaderField:@"Accept"];
    NSUInteger generation=self.generation;self.request=[BibimerVoiceRequest new];
    [self.request start:request limit:16*1024*1024 done:^(NSData *data,NSInteger status,NSString *mime){
        self.request=nil;if(generation!=self.generation || !self.reading)return;
        if(status!=200 || !data.length || !([mime hasPrefix:@"audio/"] || [mime isEqual:@"application/octet-stream"])) {[self stopOutput];[self changed:statusCode(status)];return;}
        self.player=[[AVAudioPlayer alloc] initWithData:data error:nil];self.player.delegate=self;
        if(![self.player play]){[self stopOutput];[self changed:@"tts_failed"];}
    }];
}
- (void)speechSynthesizer:(AVSpeechSynthesizer *)synth didFinishSpeechUtterance:(AVSpeechUtterance *)utterance { if(self.reading && utterance==self.utterance)[self nextChunk]; }
- (void)speechSynthesizer:(AVSpeechSynthesizer *)synth didCancelSpeechUtterance:(AVSpeechUtterance *)utterance { if(self.reading && utterance==self.utterance)[self stopOutput]; }
- (void)audioPlayerDecodeErrorDidOccur:(AVAudioPlayer *)player error:(NSError *)error { if(player==self.player){[self stopOutput];[self changed:@"tts_failed"];} }
- (void)audioPlayerDidFinishPlaying:(AVAudioPlayer *)player successfully:(BOOL)flag { if(player!=self.player)return;if(flag)[self nextChunk];else{[self stopOutput];[self changed:@"tts_failed"];} }
- (void)read:(NSDictionary *)message {
    NSString *context=message[@"context"],*text=message[@"text"],*identifier=message[@"messageID"];
    if(![self enabled] || ![self active] || self.inputID || !textValue(text,65536) || !text.length || ![context isEqual:self.context] || !textValue(identifier,256))return;
    [self stopOutput];self.reading=YES;self.readContext=context;self.messageID=identifier;
    NSMutableArray *chunks=[NSMutableArray new];NSUInteger offset=0;
    while(offset<text.length){NSRange range=[text rangeOfComposedCharacterSequencesForRange:NSMakeRange(offset,MIN((NSUInteger)1800,text.length-offset))];if(range.length>2000){[self stopOutput];[self changed:@"tts_failed"];return;}[chunks addObject:[text substringWithRange:range]];offset=NSMaxRange(range);}self.chunks=chunks;self.chunk=0;
    NSError *error=nil;
    if(![AVAudioSession.sharedInstance setCategory:AVAudioSessionCategoryPlayback mode:AVAudioSessionModeSpokenAudio options:AVAudioSessionCategoryOptionDuckOthers error:&error] || ![AVAudioSession.sharedInstance setActive:YES error:&error]){[self stopOutput];[self changed:@"tts_failed"];return;}
    [self changed:@"tts_reading"];[self nextChunk];
}
- (void)handle:(NSDictionary *)message {
    NSString *action=message[@"action"];
    if(textValue(message[@"labels"],16000)){
        id labels=[NSJSONSerialization JSONObjectWithData:[message[@"labels"] dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];if([labels isKindOfClass:NSDictionary.class])self.labels=labels;
    }
    NSUserDefaults *preferences=NSUserDefaults.standardUserDefaults;
    if([action isEqual:@"voiceStart"] && textValue(message[@"id"],200))[self startInput:message[@"id"]];
    else if([action isEqual:@"voiceCancel"] && [message[@"id"] isEqual:self.inputID])[self pause];
    else if([action isEqual:@"voiceConfigure"]){
        if(![@[@"device",@"openai",@"elevenlabs"] containsObject:message[@"provider"]] || ![@[@"",@"en",@"ko",@"pt",@"es",@"id",@"zh",@"ja",@"fr",@"de"] containsObject:message[@"language"]])return;
        [self pause];[preferences setObject:message[@"provider"] forKey:@"voiceProvider"];[preferences setObject:message[@"language"] forKey:@"voiceLanguage"];[self signal:@"BibimerVoiceSettingsChanged" arguments:@[@""]];
    }else if([action isEqual:@"voiceKey"])[self keyAction:message];
    else if([action isEqual:@"speechContext"] && textValue(message[@"context"],1024)){
        if(![self.context isEqual:message[@"context"]])[self pause];self.context=message[@"context"];
    }else if([action isEqual:@"speechStop"])[self stopOutput];
    else if([action isEqual:@"speechRead"])[self read:message];
    else if([action isEqual:@"speechVoices"])[self refreshVoices:[message[@"more"] boolValue]];
    else if([action isEqual:@"speechConfigure"] && [message[@"settings"] isKindOfClass:NSDictionary.class]){
        NSDictionary *settings=message[@"settings"];
        for(NSString *key in settings){id value=settings[key];
            if([key isEqual:@"enabled"] && CFGetTypeID((__bridge CFTypeRef)value)==CFBooleanGetTypeID())continue;
            if([key isEqual:@"provider"] && [@[@"android",@"elevenlabs"] containsObject:value])continue;
            if([key isEqual:@"mode"] && [@[@"full",@"summary"] containsObject:value])continue;
            if([key isEqual:@"voice"] && textValue(value,256))continue;
            if([key isEqual:@"engine"] && [value isEqual:@""])continue;return;
        }
        [self pause];
        for(NSString *key in @[@"enabled",@"provider",@"mode"])if(settings[key])[preferences setObject:settings[key] forKey:[@"tts" stringByAppendingString:[key capitalizedString]]];
        if(settings[@"voice"])[preferences setObject:settings[@"voice"] forKey:[@"ttsVoice/" stringByAppendingString:[self preference:@"ttsProvider" fallback:@"android"]]];
        [self changed:@""];
    }
}
@end
