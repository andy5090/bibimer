# iOS 공개 정책 보완 원고

2026-11-19: 아래 보완 내용을 `release/website/public/`의 영어·한국어 및 나머지8개 언어 정책에 반영했다. 공개 URL 게시·실제 원본 일치 검증은 배포 단계에서 확인해야 하며 이 문서만으로 게시 완료를 주장하지 않는다. 기존 Android·문의·삭제·연령·호스팅 조항을 유지하고 적용 범위를 구분했다. 최종 제공자별 App Privacy 신고를 대신하지 않는다.

## English

### Bibimer on iPhone and iPad

The iOS application (app.bibimer.ios) uses a Linux environment within its own app container. A separate Termux installation is not needed on iOS. Project files, local session metadata and agent records are kept in this app's environment. App preferences use app-private storage. Removing the iOS app removes its local container, subject to your device's backup and restore settings; it does not delete data held by an external provider.

Agents can send instructions, conversation context, code, files and tool requests to their configured services. The provider, account, agent permissions and settings affect this processing. Keeping the development environment on the device does not make provider-backed AI processing offline. Review the selected provider's policy and the app's data-sharing information before connecting and sending work.

Provider authentication can open a native Safari authentication view and use native secure code or key entry. During a supported Claude manual-code sign-in that you start, the app can read a newly copied authentication code while the authentication view is visible and the app is active. It checks the current authentication challenge before submitting the code through the native authentication path. iOS controls paste permission, and manual secure entry remains available. The authentication view is separate from agent browser control. Codes and secret values are not returned to the app's web interface or ordinary diagnostic logs. The app does not clear your clipboard. Agent credentials remain under the chosen CLI's storage rules within the app environment.

Optional iOS speech input uses Apple Speech or the API provider you choose. Apple Speech may use Apple's network services. External transcription sends the recording to the selected OpenAI or ElevenLabs service after the app's recording and transmission confirmation flow. Read-aloud uses the device voice or ElevenLabs; external read-aloud sends the selected answer or locally extracted summary text to ElevenLabs. Provider charges and retention practices depend on your account and service configuration. Transcripts enter a draft and are not sent as agent messages automatically.

Voice API keys are stored in iOS Keychain and can be removed in Settings. Temporary recordings are removed after completion, cancellation or failure, with leftover cleanup at the next app start. Local summary extraction does not make an additional model request. These rules do not erase a recording or text that a provider has already received.

Completion notifications on iOS use a general completion message. Display and background delivery depend on device permissions and operating-system limits. Optional debug diagnostics are off by default; when enabled they keep a bounded local history of fixed status events and numeric or Boolean values. Turning debugging off clears that diagnostic history. The app does not automatically upload it. A diagnostic copy or support inquiry you choose to send is handled through the support process described in this policy.

### Local files and your choices

Removing a project registration or an ended session listing does not erase the underlying project, Git worktree or agent record. Delete those files in the local environment when you intend to remove them. Use the external provider's own controls or request process to delete data held by that provider. Never include passwords, authentication codes, API keys or private project files in a support inquiry.

## 한국어

### iPhone·iPad의 Bibimer

iOS 앱(app.bibimer.ios)은 앱 전용 저장 공간 안의 Linux 환경을 사용하며 별도의 Termux 설치가 필요하지 않습니다. 프로젝트 파일, 로컬 세션 정보, 에이전트 기록은 이 환경에 보관하고 앱 설정은 앱 전용 저장소에 보관합니다. iOS 앱을 제거하면 기기의 백업·복원 설정에 따른 예외를 제외하고 앱의 로컬 저장 공간도 제거되지만, 외부 제공자가 보유한 데이터까지 삭제되지는 않습니다.

에이전트는 지시, 대화 맥락, 코드, 파일, 도구 요청을 설정된 서비스에 전송할 수 있습니다. 처리 방식은 제공자, 계정, 에이전트 권한과 설정에 따라 달라집니다. 개발 환경을 기기에 둔다고 해서 AI 제공자의 처리까지 오프라인이라는 뜻은 아닙니다. 연결하고 작업을 보내기 전에 선택한 제공자의 정책과 앱의 데이터 전송 안내를 확인해 주세요.

제공자 인증에는 네이티브 Safari 인증 화면과 보안 코드·키 입력창을 사용할 수 있습니다. 사용자가 시작한 지원되는 Claude 수동 코드 로그인에서는 인증 화면이 보이고 앱이 활성 상태일 때 새로 복사한 인증 코드를 읽을 수 있습니다. 현재 인증 작업의 challenge와 일치하는지 확인한 뒤 네이티브 인증 경로로 제출합니다. 붙여넣기 허용은 iOS가 관리하며 수동 보안 입력도 제공됩니다. 인증 화면은 에이전트 브라우저 제어와 분리됩니다. 코드·비밀 값은 앱의 웹 화면이나 일반 진단 로그에 반환하지 않고 사용자의 클립보드를 지우지 않습니다. 에이전트 자격 증명은 앱 내부 환경에서 선택한 CLI의 저장 규칙을 따릅니다.

선택적 iOS 음성 입력은 Apple Speech 또는 사용자가 선택한 API 제공자를 사용합니다. Apple Speech는 Apple의 네트워크 서비스를 사용할 수 있습니다. 외부 음성 인식은 앱의 녹음·전송 확인 과정을 거쳐 선택한 OpenAI 또는 ElevenLabs 서비스에 녹음을 보냅니다. 답변 읽기는 기기 음성 또는 ElevenLabs를 사용하며 외부 읽기는 선택한 답변이나 기기에서 추출한 요약문을 ElevenLabs에 보냅니다. 제공자 요금과 보관 방식은 계정과 서비스 설정에 따라 달라집니다. 인식 결과는 초안에 들어가며 에이전트 메시지로 자동 전송하지 않습니다.

음성 API 키는 iOS Keychain에 보관하며 설정에서 삭제할 수 있습니다. 임시 녹음은 완료·취소·실패 뒤 삭제하고 다음 앱 시작 때 남은 파일도 정리합니다. 로컬 요약 추출은 추가 모델을 호출하지 않습니다. 이 정리로 외부 제공자가 이미 받은 녹음이나 텍스트까지 삭제되지는 않습니다.

iOS 완료 알림은 일반 완료 문구를 사용합니다. 표시와 백그라운드 전달은 기기 권한과 운영체제 제약을 받습니다. 선택적 디버그 진단은 기본 꺼짐이며 켰을 때만 고정 상태 이벤트와 숫자·Boolean 값의 제한된 이력을 기기에 보관합니다. 끄면 해당 진단 이력을 지우고 자동 업로드하지 않습니다. 사용자가 직접 보내는 진단 사본이나 지원 문의는 이 정책의 문의 처리 절차를 따릅니다.

### 로컬 파일과 삭제

프로젝트 등록 해제나 종료된 세션 목록 삭제는 실제 프로젝트, Git 워크트리, 에이전트 원본 기록을 지우지 않습니다. 실제 파일을 없애려면 로컬 환경에서 별도로 삭제해 주세요. 외부 제공자가 보유한 데이터는 해당 제공자의 관리 기능이나 요청 절차를 이용해야 합니다. 지원 문의에 비밀번호, 인증 코드, API 키, 비공개 프로젝트 파일을 포함하지 마세요.

## 제공자 정책 확인 (2026-11-19)

공개10언어 본문에 다음 공식 정책 링크를 넣었다. 소비자 계정·상업용 API·지역별 조건은 같지 않을 수 있으므로 특정 보관 기간이나 학습 미사용을 일괄 보장하지 않는다. 사용자가 실행하는 명령·외부 도구의 자체 네트워크 전송도 고지했다.

- [OpenAI](https://openai.com/policies/privacy-policy/)
- [Anthropic](https://www.anthropic.com/legal/privacy)
- [Google](https://policies.google.com/privacy)
- [ElevenLabs](https://elevenlabs.io/privacy-policy)
- [Apple](https://www.apple.com/legal/privacy/)

코드 대조: `AccountBrowser.m`의 현재 challenge/새 복사/활성 인증 화면 제한, `VoiceService.m`의 Keychain·임시 파일 정리, `BrowserService.m`의 WKWebView 데이터 저장소·실행별 캡처/스크롤 허용을 확인했다. 새 AI 전송 동의 UI의 최종 제출 후보 검증과 실제 App Privacy 응답은 별도 준비 작업이다.
