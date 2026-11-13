#import "AccountInput.h"

@interface BibimerAccountInput ()
@property UITextField *field;
@property UIButton *save;
@end

@implementation BibimerAccountInput
- (void)viewDidLoad {
    [super viewDidLoad];
    self.view.backgroundColor = [UIColor colorWithWhite:0 alpha:0.65];
    UIView *panel = [UIView new];
    panel.backgroundColor = [UIColor colorWithRed:0.055 green:0.071 blue:0.082 alpha:1];
    panel.layer.cornerRadius = 14;
    panel.layer.borderWidth = 1;
    panel.layer.borderColor = [UIColor colorWithWhite:0.3 alpha:1].CGColor;
    UILabel *title = [UILabel new];
    title.text = self.labels[@"title"]; title.textColor = UIColor.whiteColor;
    title.font = [UIFont preferredFontForTextStyle:UIFontTextStyleHeadline];
    title.adjustsFontForContentSizeCategory = YES;
    self.field = [UITextField new];
    self.field.secureTextEntry = YES;
    self.field.accessibilityLabel = title.text;
    self.field.textColor = UIColor.whiteColor;
    self.field.font = [UIFont preferredFontForTextStyle:UIFontTextStyleBody];
    self.field.adjustsFontForContentSizeCategory = YES;
    self.field.autocorrectionType = UITextAutocorrectionTypeNo;
    self.field.autocapitalizationType = UITextAutocapitalizationTypeNone;
    self.field.spellCheckingType = UITextSpellCheckingTypeNo;
    self.field.borderStyle = UITextBorderStyleRoundedRect;
    self.field.backgroundColor = [UIColor colorWithWhite:0.12 alpha:1];
    self.field.textContentType = nil;
    [self.field addTarget:self action:@selector(changed) forControlEvents:UIControlEventEditingChanged];
    UIButton *cancel = [UIButton buttonWithType:UIButtonTypeSystem];
    [cancel setTitle:self.labels[@"cancel"] forState:UIControlStateNormal];
    [cancel addTarget:self action:@selector(cancel) forControlEvents:UIControlEventTouchUpInside];
    self.save = [UIButton buttonWithType:UIButtonTypeSystem];
    [self.save setTitle:self.labels[@"save"] forState:UIControlStateNormal];
    [self.save addTarget:self action:@selector(submit) forControlEvents:UIControlEventTouchUpInside];
    for (UIButton *button in @[cancel, self.save]) {
        button.tintColor = [UIColor colorWithRed:0.843 green:0.91 blue:0.667 alpha:1];
        button.layer.borderWidth = 1; button.layer.cornerRadius = 8;
        button.layer.borderColor = [UIColor colorWithWhite:0.3 alpha:1].CGColor;
        [button.heightAnchor constraintGreaterThanOrEqualToConstant:44].active = YES;
    }
    UIStackView *buttons = [[UIStackView alloc] initWithArrangedSubviews:@[cancel, self.save]];
    buttons.axis = UILayoutConstraintAxisHorizontal; buttons.spacing = 10;
    buttons.distribution = UIStackViewDistributionFillEqually;
    UIStackView *content = [[UIStackView alloc] initWithArrangedSubviews:@[title, self.field, buttons]];
    content.axis = UILayoutConstraintAxisVertical; content.spacing = 16;
    panel.translatesAutoresizingMaskIntoConstraints = NO;
    content.translatesAutoresizingMaskIntoConstraints = NO;
    [self.view addSubview:panel]; [panel addSubview:content];
    [NSLayoutConstraint activateConstraints:@[
        [panel.leadingAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.leadingAnchor constant:20],
        [panel.trailingAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.trailingAnchor constant:-20],
        [panel.bottomAnchor constraintEqualToAnchor:self.view.keyboardLayoutGuide.topAnchor constant:-20],
        [content.topAnchor constraintEqualToAnchor:panel.topAnchor constant:20],
        [content.leadingAnchor constraintEqualToAnchor:panel.leadingAnchor constant:20],
        [content.trailingAnchor constraintEqualToAnchor:panel.trailingAnchor constant:-20],
        [content.bottomAnchor constraintEqualToAnchor:panel.bottomAnchor constant:-20],
        [self.field.heightAnchor constraintGreaterThanOrEqualToConstant:44]
    ]];
    [self changed];
    [NSNotificationCenter.defaultCenter addObserver:self selector:@selector(cancel) name:UIApplicationWillResignActiveNotification object:nil];
    [NSNotificationCenter.defaultCenter addObserver:self selector:@selector(captureChanged) name:UIScreenCapturedDidChangeNotification object:nil];
}
- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
    if (UIScreen.mainScreen.isCaptured) [self cancel]; else [self.field becomeFirstResponder];
}
- (void)viewDidDisappear:(BOOL)animated {
    [super viewDidDisappear:animated];
    [self finish:nil];
}
- (void)captureChanged { if (UIScreen.mainScreen.isCaptured) [self cancel]; }
- (BOOL)valid {
    NSString *key = self.field.text;
    return key.length > 0 && key.length <= (self.limit ?: 8192) &&
        [key rangeOfCharacterFromSet:NSCharacterSet.controlCharacterSet].location == NSNotFound;
}
- (void)changed { self.save.enabled = [self valid]; }
- (void)submit { if ([self valid]) [self finish:self.field.text]; }
- (void)cancel { [self finish:nil]; }
- (void)finish:(NSString *)key {
    void (^done)(NSString *) = self.completion;
    self.completion = nil; self.field.text = @"";
    [self.field resignFirstResponder];
    if (done) {
        [self dismissViewControllerAnimated:YES completion:nil];
        done(key);
    }
}
- (void)dealloc { [NSNotificationCenter.defaultCenter removeObserver:self]; }
@end
