# iOS 기능 반영 현황

2026-11-09 소스와 TestFlight 0.1.0(4) 기준이다. 양 SDK 네이티브 컴파일·실제 Simulator의 공통 UI/Linux21개 검사 후 기존 내부 그룹에 제공했다. iOS27 Scene 시작 충돌·소켓 경로 수정도 포함한다. 아래 음성/알림/브라우저 등 실제 기기·계정 기능 검증은 각각 남아 있으며 빌드·제공 성공과 구분한다.

| 기능 | 현재 소스 | 남은 확인 |
| --- | --- | --- |
| 터미널 전체 화면·PgUp/PgDn·셸 종료 시 입력 차단 | 최신 공통 UI·브리지를 패키징 | 실제 WKWebView·키보드·작은 화면 |
| 프롬프트·응답 복사 아이콘 | 공통 UI의 32px 버튼·6px 패딩·복사 완료 체크(11월8일 소스) | 실제 WKWebView·네이티브 클립보드·작은 화면 |
| 중지한 마지막 질문 수정 | 공통 UI에서 입력창으로 복원 후 명시적 새 메시지 전송(11월8일 소스) | 실제 WKWebView·세션 전환·초안 보존 |
| 응답 중 대기열/Steer 기본 설정 | iOS 저장과 공통 전송 경로 유지 | Codex 네이티브 접수·세션 왕복. Claude/Gemini의 미검증 Steer는 계속 비활성 |
| Git Commit·Push·Pull·Sync | 공통 Git UI/API 및 iOS 프록시 허용 목록 | 내장 Linux에서 실제 저장소·원격 인증 |
| 작업 화면 기본·상단 설정·선택 UI | 최신 공통 웹 자산 | 실제 화면·접근성 |
| 음성 입력 | Apple Speech 또는 OpenAI gpt-transcribe/ElevenLabs scribe_v2 | 실기기 권한·마이크·실제 API |
| 답변 읽기·답변별 재생/정지 | AVSpeechSynthesizer 또는 ElevenLabs, 로컬 추출 요약 | 실제 음성·손쉬운 사용 설정·오디오 포커스 |
| 완료 알림 | 네이티브 구조화된 완료 feed 구독과 세션 열기 | OS 권한·기기 알림·탭 이동 |
| 브라우저 | 별도 WKWebView, 로그인 잠금, 허용 후 네이티브 캡처/스크롤, 허용 완료 알림 | 실제 로그인·캡처·프로필·Steer/Queue |

## 음성 처리

마이크를 눌렀을 때만 음성/마이크 권한을 요청한다. Apple Speech의 최종 결과만 초안에 넣고 자동 전송하지 않는다. 외부 제공자는 앱 전용 임시 M4A로 최대60초 녹음하고 업로드 확인 뒤 고정 HTTPS 목적지로 전송한다. 녹음·취소·실패·완료 후 임시 파일을 삭제하며 다음 시작 때 잔여 파일도 정리한다. 기기 음성 인식도 Apple 네트워크를 사용할 수 있다고 안내한다.

입력/출력·제공자별 API 키는 별도 Keychain 항목이다. 키는 네이티브 보안 입력창에서만 받고 WebView에는 존재 여부만 제공한다. 일반 파일·브리지·로그에는 저장하지 않는다. 요청은 ephemeral URLSession, 쿠키/캐시/리다이렉트 없음, 제한된 응답 크기, 실패 시 다른 제공자로 재시도 없음으로 처리한다. 연결 확인은 모델 메타데이터/사용자 조회만 사용하며 녹음/유료 합성을 하지 않는다.

자동 읽기는 기본 꺼짐이다. 공통 완료 이벤트 판별과 답변별 버튼을 재사용하고 현재 세션/화면의 명시적인 완료 답변만 읽는다. 전체/로컬 핵심 문장 요약을 지원하며 요약에 모델을 호출하지 않는다. 외부 음성은 청크별로 받아 메모리에서 재생한다. 앱 숨김·컨텍스트/설정 변경·오디오 중단/출력 장치 분리·새 음성 입력에서 취소하고 자동 재개하지 않는다. iOS는 Android 속도/피치 설정을 복제하지 않고 발화마다 `prefersAssistiveTechnologySettings`를 사용한다. 기기별 실제 적용은 미검증이다.

## 알림 범위

알림은 사용자가 설정을 켜고 OS 권한을 허용했을 때만 사용한다. 모든 프로젝트의 `/v1/completions`에서 구조화된 완료만 받고 중복·초기 기록·브리지 인스턴스 교체를 구분한다. 알림 본문은 일반 완료 문구이고 답변 미리보기는 넣지 않는다. 눌렀을 때 해당 프로젝트/세션을 여는 기존 경로만 호출하며 메시지 전송/재개·승인을 하지 않는다.

현재 구현은 **앱이 전경에서 실행 중인 동안** 확인한다. 백그라운드 전환 시 구독을 취소하고 복귀 시 새 기준점을 잡아 놓친 과거 완료를 재알림하지 않는다. iOS 정지·강제 종료 중 완료 전달이나 지속 실행은 지원 완료로 표시하지 않는다. 백그라운드 실행 모드·APNs·외부 서버·상시 오디오를 추가하지 않았다.

## 브라우저 범위

에이전트는 기존 세션별 capability Unix socket을 사용하고 호스트는 인증된 전용 명령/응답 API로만 요청을 받는다. 이 API는 작업 WebView의 범용 프록시 허용 목록에 넣지 않는다. 외부 WKWebView에는 작업 화면의 메시지 핸들러를 설치하지 않는다. 쿠키·DOM·인증 화면·브리지 토큰을 에이전트에 제공하지 않는다.

새 창은 직접 로그인 모드다. 사용자가 작업 화면의 허용 버튼을 눌러 프로젝트/브라우저 실행을 명시적으로 허용한 뒤에만 보이는 창을 캡처하거나 스크롤한다. 허용 완료 알림은 기존 nonce·Chat 세션/턴 검증과 Steer/후속 메시지/대기열 경로를 재사용한다. 캡처 파일은 게스트의0600 임시 파일로만 제공하고 수동 모드 전환 시 정리한다. 만료된 명령·다른 실행의 응답·중복 응답을 거절한다.

**click/type/key는 미지원**이다. JavaScript 이벤트나 비공개 터치 API를 이용해 실제 입력인 것처럼 처리하지 않는다. CLI help에도 open/status/screenshot/scroll/release만 제공한다. 로그인과 실제 입력은 사용자가 직접 한다. iOS17 이상은 프로젝트 ID의 WebKit 영속 프로필, iOS16은 프로젝트별 메모리 프로필을 사용한다. 일부 사이트는 WKWebView 로그인을 거절할 수 있으며 실제 계정 로그인을 보장하지 않는다.

## 검증과 배포

현재 Termux에서 iOS 앱 Python22개·새 네이티브 JS 경계·기존 컨텍스트/붙여넣기/권한/터미널 제어·공통 음성 UI/완료 선택·914키×10언어·실제 웹 자산 패키징·새 브라우저 전송4개를 검사했다. Objective-C4파일은 tree-sitter 문법 오류0이다. 이는 **Apple SDK 컴파일 또는 실제 네이티브 실행 검증이 아니다**.

기존 iOS 브리지 전체 검사는 Termux에서 고정 `/usr/bin/env python3` 및 Linux PATH를 사용하는 모의 실행 파일 때문에 실패했다. 원본 실패 로그 `.tools/ios-port-bridge.log`와 추가 경계 검사 `.tools/ios-native-browser-tests-final.log`를 구분한다. 고정 shebang을 임시 복사본에서 보정한 추가 실행도 fixture 경로/PATH 차이로4개 실패했다(`.tools/ios-port-bridge-portable.log`). 전체 성공으로 표시하지 않는다. Xcode/macOS에서 네이티브 컴파일·기존 전체 검사·Simulator WKWebView·iPhone 마이크/음성/알림/브라우저를 확인한 후 별도 배포한다. 유료 API·실제 계정·모델·사용자 세션은 호출/재시작하지 않았다.

공식 근거: [Apple Speech](https://developer.apple.com/documentation/speech/sfspeechaudiobufferrecognitionrequest), [Speech 권한](https://developer.apple.com/documentation/speech/sfspeechrecognizer/requestauthorization(_:)), [음성 발화 설정](https://developer.apple.com/documentation/avfaudio/avspeechutterance), [WebKit 캡처](https://developer.apple.com/documentation/webkit/wkwebview/takesnapshot(with:completionhandler:)), [WebKit 프로필](https://developer.apple.com/documentation/webkit/wkwebsitedatastore/init(foridentifier:)), [알림](https://developer.apple.com/documentation/usernotifications/unusernotificationcenter), [OpenAI 녹음 파일 변환](https://developers.openai.com/api/docs/guides/speech-to-text).

2026-11-09 Mac 후속 검증: 앱Python25개·기존 iOS 브리지55개·네이티브 양 SDK 컴파일과 실제 WKWebView/Linux21개가 통과했다. 위 Termux의 host fixture 제약과 구분하며, 실제 iPhone 기능 검증을 대체하지 않는다. 배포·충돌 근거는 `TESTFLIGHT.md`와 `VALIDATION.md`를 따른다.
