# iOS 제공자 데이터 처리 근거

2026-11-19 공식 문서와 현재 소스 확인. App Privacy 신고를 위한 근거·판단이며, Console 신고 완료나 모든 사용자 제공자의 설정 확인을 의미하지 않는다. 사용자 계정·키·모델 요청은 사용하지 않았다.

## Apple 기준과 신고안

Apple은 개발자뿐 아니라 앱에 통합한 제3자의 처리까지 포함한다. 실시간 응답에 필요한 기간을 넘어 기기 밖에 보관하면 수집에 해당한다. 자유 입력의 모든 가능한 개인정보 유형을 열거하지 않고 일반 텍스트는 **Other User Content**, 녹음은 **Audio Data**로 신고한다. 계정과 연결된 요청은 익명 처리의 증거가 없는 한 **Linked to the User**로 판단한다. 인증·기능·보안 목적은 App Functionality다. 광고 목적의 제3자 데이터 결합/데이터 브로커 공유가 Apple의 Tracking이다. 일반 모델 학습과 Tracking은 같은 개념이 아니다. [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)

| 데이터 유형 | 현재 제안 | 목적·근거 |
| --- | --- | --- |
| Other User Content | 수집, 사용자 연결 | 프롬프트·코드·프로젝트 파일·대화 맥락·외부 TTS 본문. App Functionality. 사용자 제공자의 모델 개선 동의가 허용되면 Other Purposes도 포함하는 보수적 신고가 적절 |
| Audio Data | 수집, 사용자 연결 | ElevenLabs 선택 시 실제 녹음 업로드·기본 보관. App Functionality. 해당 계정의 모델 개선 설정에 따라 Other Purposes도 적용 가능 |
| Photos or Videos | 수집, 사용자 연결 권장 | 허용된 브라우저 실행의 전용 Screenshot API가 실제 PNG를 생성해 에이전트가 외부 모델에 이미지 입력으로 보낼 수 있음. 일반 자유 입력 텍스트가 아닌 전용 이미지 경로. App Functionality, 제공자 학습 허용 시 Other Purposes도 검토 |
| User ID | 수집, 사용자 연결 | 제공자 계정/조직/API 키 인증으로 요청을 특정 계정에 연결. App Functionality. 토큰 자체를 앱 로그에 저장한다는 뜻은 아님 |
| Email Address | 인증 흐름 최종 대조 필요 | Bibimer 자체 이메일 입력은 없지만 제공자 로그인 웹 화면에서 이메일을 입력/보관할 수 있음. 실제 로그인 경로가 앱에 통합된 수집인지, 외부 제공자 계정 관리인지를 구분. 단순히 프롬프트에 이메일이 포함될 수 있다는 이유로 추가하지 않음 |
| Product Interaction / Performance Data | 비필수 CLI telemetry 비활성화 또는 Analytics 신고 검토 | Gemini/Claude 원본 CLI의 기본 통계 경로는 Bibimer 자체 로컬 진단과 다름. 아래 확인 사항 참고 |
| 위치·연락처 목록·결제·건강 등 | 앱이 요청/추출/업로드하는 별도 기능이 확인되지 않으면 신고하지 않음 | 자유 입력 내용에 들어갈 수 있다는 이유만으로 모든 유형을 선택하지 않음 |

**Data Not Collected는 선택하지 않는다.** 현재 기능은 외부 제공자의 기본 보관을 포함한다. **Tracking 미사용**은 앱의 광고/추적 SDK 부재와 실제 API 경로를 근거로 판단하되, 소비자 서비스 전체 개인정보처리방침의 광범위한 광고 조항을 앱 API의 추적 구현으로 단정하지 않는다. 반대로 제공자 이름만 보고 자동으로 미사용이라고 확정하지도 않는다.

## 서비스별 확인

| 서비스/인증 | 공식 문서의 처리·설정 | Bibimer에 대한 결론 |
| --- | --- | --- |
| Codex + 개인 ChatGPT | 개인 ChatGPT의 모델 개선 설정이 Codex 작업에도 적용된다. 끄면 이후 작업의 학습 사용을 중단하지만 기존 저장 대화를 삭제하는 것은 아니다. Codex 환경 맥락에는 별도 설정도 있다. [Data controls](https://help.openai.com/en/articles/7730893) | 개인 계정 경로와 API/Business 경로를 같다고 설명하지 않는다. 사용자의 학습 차단 또는 영구 무보관을 앱이 보장하지 않는다 |
| OpenAI API / Codex API | 기본 API 학습 사용은 하지 않으며 일반 모델 endpoint의 abuse logs는 통상 최대30일. Responses는 기본 application-state 보관 조건이 별도로 있다. ZDR은 자격/계정/endpoint 조건이 있다. **`/v1/audio/transcriptions`는 현재 표에서 학습 없음·abuse retention 없음·application-state retention 없음**이다. [API Data controls](https://developers.openai.com/api/docs/guides/your-data) | 모든 OpenAI 음성을 일괄30일 보관이라고 쓰지 않는다. 음성 단독이 실시간 처리여도 다른 Chat/ElevenLabs 경로 때문에 앱 전체 무수집은 아님 |
| Claude Code 개인 구독 | 소비자 모델 개선 허용 시5년, 비허용 시30일이라고 CLI 문서가 설명한다. 상용 경로는 별도 조건이며 기본30일, ZDR은 별도 적격 조직 활성화다. `/feedback` 등의 사용자 제출은 별도 보관 경로다. [Claude Code data usage](https://code.claude.com/docs/en/data-usage), [ZDR](https://code.claude.com/docs/en/zero-data-retention) | 계정 종류·동의에 따라 달라지는 조건을 공개한다. 일반 구독을 ZDR이라고 표시하지 않음 |
| Gemini CLI | Google 계정(Code Assist), 유료/무료 Developer API 키, Vertex 경로가 서로 다른 약관/정책을 적용한다. [Terms/privacy](https://geminicli.com/docs/resources/tos-privacy/) | 임의의 단일 보관 기간이나 모든 계정 학습 미사용을 보장하지 않음 |
| OpenCode | 연결한 제공자를 선택하는 클라이언트이며 모델/제공자 목록과 사용자 자격 증명으로 동작한다. [Providers](https://opencode.ai/docs/providers/) | OpenCode 자체의 이름만으로 데이터 목적지·보관 기간을 확정할 수 없음. 실제 선택한 제공자/endpoint와 그 조건 적용 |
| ElevenLabs STT/TTS | 기본적으로 입력·출력을 보관한다. ZRM은 일부 Enterprise 고객의 적격 endpoint에 요청별 `enable_logging=false`가 필요하다. STT/TTS 모두 적격이지만 기본은 아님. [Zero retention](https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode) | 현재 iOS 요청에 그 옵션이 없고 사용자 Enterprise 자격도 강제하지 않으므로 무보관을 보장하지 않음. 사용자 키 계정과 요청이 연결됨 |

ElevenLabs 개인정보처리방침은 계정, 입력·출력, 서비스 사용, 보안, 서비스 개선·학습 등을 구분하고 계약상 처리자 관계에는 별도 고객 계약을 적용한다고 한다. 웹 쿠키 기반 광고까지 iOS의 직접 API 요청에 모두 적용됐다고 추정하지 말고, 선택한 계정의 계약·설정을 따른다. [ElevenLabs Privacy Policy, 2026-10-09](https://elevenlabs.io/privacy-policy)

## 실제 iOS 연결 경로

- `ios/app/Sources/VoiceService.m`: OpenAI `/v1/audio/transcriptions`, ElevenLabs `/v1/speech-to-text`, `/v1/text-to-speech/…`를 HTTPS로 직접 호출한다. 음성 API 키는 iOS Keychain에서 읽고 Authorization/xi-api-key로 인증한다. 현재 소스에서 ElevenLabs 무보관 query 옵션은 확인되지 않는다.
- `ios/bridge/run.py` 및 공통 provider: 실제 설치한 CLI/SDK가 Chat 프롬프트·도구 맥락·인증 통신을 소유한다. 앱 전용 rootfs에 보관된 자격 증명과 원격 제공자 보관을 구분한다.
- `ios/bridge/provider_gemini.py`: 원본 CLI executable을 `--experimental-acp`로 실행하고 stdio JSON-RPC로 대화한다. 이 어댑터에 Google OAuth 토큰 추출이나 Google 서비스 HTTP 직접 호출은 없다.
- `bridge/bibimer_bridge.py:launch_environment`는 기본적으로 환경 복사다. 테스트/probe의 `DISABLE_TELEMETRY=1`만으로 운영 CLI 통계까지 차단됐다고 간주하지 않는다.

## CLI 통계·인증 범위의 최종 확인

Claude 공식 문서는 direct API 경로의 사용 metrics가 기본 켜짐이며 별도 환경 변수로 끌 수 있다고 한다. Gemini 공식 설정의 `privacy.usageStatisticsEnabled`도 기본 true다. Gemini 통계는 도구명·성공/실패·시간·모델/요청 시간 등의 통계를 포함하며 프롬프트/파일 내용과 PII는 통계 항목에서 제외한다고 설명한다. **새 iOS 자식 실행에서 비필수 telemetry를 명시적으로 끄고 검증하거나**, 해당 사용/성능 데이터를 Analytics 목적으로 신고해야 한다. 사용자 원본 설정/이력을 임의 삭제할 필요는 없다. [Claude telemetry](https://code.claude.com/docs/en/data-usage#telemetry-services), [Gemini configuration](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md#usage-statistics)

Gemini 공식 약관 안내는 제3자 소프트웨어의 서비스 직접 접근(OAuth 활용 예시 포함)을 제한한다. 반면 공식 ACP 문서는 IDE/개발 도구가 원본 CLI를 stdio로 제어하는 통합을 지원한다. 현 소스는 후자 구조다. 따라서 **원본 CLI/ACP 사용을 토큰 추출·별도 endpoint 호출과 구분**하며 위반이라고 확정하지 않는다. 향후 직접 OAuth 토큰을 재사용하는 구조로 바꾸면 별도 약관 검토가 필요하다. [Terms/privacy](https://geminicli.com/docs/resources/tos-privacy/), [ACP mode](https://geminicli.com/docs/cli/acp-mode/), [IDE integration](https://geminicli.com/docs/ide-integration/)

이 문서의 상태를 최종 신고로 바꾸기 전에는 빌드16의 실제 전송 동의·CLI 환경·provider 설정·외부 음성 동작을 대조하고, Console 각 데이터 유형의 목적·연결·추적 질문을 저장한 결과를 별도로 기록한다.

## 브라우저 Screenshot 이미지 분류 추가 확인

**신고 판단: Photos or Videos를 추가하는 것이 적절하다.** Apple 공식 표는 이 유형을 사용자의 사진·영상으로 정의하고, 별도 미디어 유형을 업로드하는 기능이 있으면 그 유형을 신고하도록 안내한다. 공식 안내에는 `WKWebView.takeSnapshot` PNG 스크린샷을 명시한 예시는 없으므로, 이 분류는 정의와 실제 이미지 업로드 경로를 대조한 판단이다. 사진 보관함/카메라 권한이 없다는 사실은 외부로 보내는 이미지의 신고 면제를 뜻하지 않는다. [Apple 데이터 유형 및 자유 입력/미디어 지침](https://developer.apple.com/app-store/app-privacy-details/)

- 실제 경로: `ios/app/Sources/BrowserService.m`의 screenshot 처리 → `takeSnapshotWithConfiguration` → `UIImagePNGRepresentation` → base64 PNG 응답 → `ios/bridge/browser_native.py`의 PNG 검증과0600 파일 생성 → 에이전트 도구에 이미지 경로 제공. 지원 에이전트가 이 PNG를 모델 입력으로 전송할 수 있는 기능이므로 Other User Content 하나로 모든 미디어를 대신하지 않는다.
- 로컬 PNG 생성·임시 저장만 하고 외부 전달하지 않는 실행 자체는 Apple의 원격 수집이 아니다. 그러나 기능 전체는 외부 제공자에게 이미지 전달을 허용하며, 제공자의 기본 보관/계정 연결이 있으므로 전체 앱 신고에서는 이미지 수집·사용자 연결을 포함하는 보수적 판단이 맞다.
- 이 기능은 브라우저 실행별 명시적 허용 뒤 사용되며 인증 전용 Safari 화면과 분리되어 있다. 명시적 허용이 있다는 이유로 자동 신고 면제가 되지 않는다. 지속적인 에이전트 브라우저 작업은 매번 사용자 제출이 발생하는 비핵심·드문 지원 양식과 같지 않다.
- 목적은 브라우저 화면 이해·작업 수행인 App Functionality다. 모델 개선 허용 계정의 조건은 Other Purposes에 반영할 수 있다. 이미지 내용이 이름·건강 정보 등을 포함할 수 있다는 이유로 모든 가능한 민감 정보 유형을 추가하는 것은 별도 문제다. URL/방문 이력을 실제로 원격 수집하는 기능이 있다면 Browsing History를 별도로 대조하되, 이미지 분류만으로 방문 이력 수집을 자동 확정하지 않는다.
