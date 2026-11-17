# iOS 개인정보 신고 검토

기준 소스 `7741191`, 확인일 2026-11-18. 이 문서는 App Privacy 응답 초안이며 신고·게시 완료 기록이 아니다. 앱의 privacy manifest와 스토어 수집 신고는 서로 다른 자료다.

## 확인한 데이터 흐름

| 경로 | 기기 안 처리 | 기기 밖 처리와 신고 판단 |
| --- | --- | --- |
| 프로젝트·세션·파일·대화·대기열 | 앱 전용 Linux rootfs와 브리지. 실행 출력/대기열과 저장 대화의 보관 방식은 구분 | 연결한 에이전트가 프롬프트·맥락·코드·파일을 외부 제공자/도구로 보낼 수 있음. `Other User Content` 등 해당 항목의 보관·계정 연결·기능 제공 목적을 확인 |
| 제공자 로그인 | SFSafariViewController, 네이티브 보안 입력, CLI 자격 증명 저장. 앱 자체 회원 계정은 없음 | 제공자의 실제 계정·OAuth 처리. 계정 식별자 등 실제 전달·보관 항목을 인증 방식별로 확인. 자체 회원 계정이 없다는 이유로 제공자 계정 데이터를 제외하지 않음 |
| Claude 복사 코드 수신 | 명시적으로 시작한 검토된 수동 인증 작업에서만 새 클립보드 변경을 검사. 현재 작업/state/활성 인증 창·10분 기한 확인. WebKit·일반 로그로 원문 반환하지 않음 | 인증 코드가 CLI/인증 제공자로 전달됨. iOS 붙여넣기 허용과 수동 보안 입력 경로 유지. 일반 앱 사용 중 클립보드 상시 감시로 설명하지 않음 |
| 기기 음성 인식 | 네이티브 Apple Speech. 결과는 초안에만 반영 | Apple 서비스의 네트워크 사용 가능. Apple 자체 수집과 앱이 통합한 외부 제공자 처리를 구분 |
| OpenAI/ElevenLabs 음성 입력 | 녹음·전송 확인·제공자별 네이티브 키 보관·임시 파일 정리 | 오디오를 선택한 제공자에 전송. `Audio Data` 후보. 보관을 확인하기 전 실시간 처리 후 폐기라고 단정하지 않음 |
| 답변 읽기 | 기기 음성 또는 로컬 핵심 문장 추출 | ElevenLabs 선택 시 답변/요약 텍스트 전송. `Other User Content` 후보. 음성 입력과 별도 경로 |
| API 키 | 음성 키는 Keychain, 에이전트 키/계정은 해당 CLI의 앱 전용 환경 | 선택한 서비스의 인증에 사용. 앱 운영자에게 자동 전송하는 경로와 구분 |
| 디버그 진단 | 기본 꺼짐. 고정 이벤트·숫자/Boolean만 제한된 로컬 보관. 끄면 삭제 | 사용자가 복사한 뒤 지원 문의로 직접 전달하는 경우와 앱의 자동 업로드를 구분 |
| 파일 공유·브라우저 | 사용자가 파일 공유를 실행. 별도 WKWebView의 캡처/스크롤은 실행별 허용 필요 | 사용자가 고른 앱/사이트·에이전트 도구가 처리할 수 있음. 인증 브라우저는 에이전트 제어와 분리 |
| 지원 문의 | 앱에서 공개 문의 웹사이트 열기 | Cloudflare/D1 및 지원 처리 경로는 공개 정책과 대조. 앱 대화를 자동 업로드하는 기능으로 신고하지 않음 |

코드 근거: `ios/app/Sources/AccountBrowser.m`, `AccountInput.m`, `VoiceService.m`, `BrowserService.m`, `CompletionNotifications.m`, `main.m`, `ios/bridge/run.py`, 공통 에이전트/음성 UI.

## 제출 전 확정할 응답

- 현재 근거만으로 **Data Not Collected를 확정하지 않는다.** 운영자의 서버 유무와 통합한 제3자 코드/서비스의 처리·보관을 별도로 조사한다.
- 제공자별로 데이터 종류, 기능 제공 목적, 보관 기간/실시간 처리 여부, 계정 연결 여부, 추적 사용 여부를 채운다. ChatGPT/Codex 계정과 API, Claude 구독과 Console 등 서로 다른 계정 조건을 합치지 않는다.
- 사용자 프롬프트/코드/첨부 파일/대화 맥락/오디오/TTS 본문을 제공자별로 공개하고 **전송 전 명시적 허락이 실제 화면에서 어떻게 이뤄지는지** 증빙한다. 안내 문구·계정 로그인·OS 마이크 허가만으로 모든 AI 전송 동의가 완료됐다고 표시하지 않는다.
- 추적 SDK가 없다는 소스 근거와 외부 제공자의 데이터 처리 조건을 구분한다. ATT가 필요 없는 기능 동의와 추적 허가를 혼동하지 않는다.
- 최종 신고는 공개 전 내용을 재확인한다. 현재 `listing.json.appPrivacyStatus`는 미완료다.

근거: [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/), [App Privacy 관리](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/), [심사 지침 5.1.2(i)](https://developer.apple.com/app-store/review/guidelines/#privacy).

## 공개 정책의 실제 보완점

기존 https://bibimer.app/privacy/ 및 한국어 정책은 Android·Termux·Android Keystore·Android TTS 중심이다. iOS 공개 전 다음 내용을 정책에 반영하고, 앱과 스토어가 실제 게시된 같은 정책으로 연결되는지 확인한다.

1. 번들 ID `app.bibimer.ios`, 앱 내부 Linux rootfs, iOS 앱 제거 시 로컬 파일 삭제와 외부 제공자 데이터의 별도 삭제.
2. 음성 Keychain·CLI 자격 증명 저장·SFSafari 인증·제한된 Claude 복사 코드 수신과 iOS 붙여넣기 권한.
3. Apple Speech/AVSpeechSynthesizer·OpenAI/ElevenLabs의 선택적 전송·키/임시 녹음 정리.
4. iOS 알림은 일반 완료 문구이며 Android의 답변 미리보기/포그라운드 서비스 설명과 구분.
5. 디버그의 기본 꺼짐·로컬 제한 보관·사용자 수동 복사, 브라우저 실행별 허용과 외부 사이트 처리.

아래 `privacy-supplement.md`는 영문/국문 보완 원고다. 기존 공개 10언어 정책의 내용 일치·시행일·실제 게시를 확인하기 전 `privacyPolicyReadyForIOS`를 true로 바꾸지 않는다.
