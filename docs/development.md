# 개발 및 검증

## 소스 구조

```text
android/app/src/main/
    java/app/bibimer/       Android Activity, 고정 로컬 HTTP 클라이언트, 토큰 보관
    assets/                대화·터미널 화면, conversation.js/rich-text.js, brand.svg, 영어·한국어 i18n.js 문구
    res/                   앱 아이콘·테마·네트워크 정책, 영어·한국어 네이티브 문구
bridge/bibimer_bridge.py    Python 표준 라이브러리 브리지
bridge/tests/              PTY·HTTP, Codex 프로토콜 대역, 업데이트 통합 테스트
scripts/build_apk.py        Termux에서 APK 빌드 및 설치 스크립트 생성
scripts/smoke_ui.cjs        화면 + 실제 브리지 연결 검증
scripts/smoke_rendering.cjs GFM·코드·diff·계획·스크롤·안전한 출력과 UI 검증
```

첫 버전은 같은 폰에서 APK까지 빌드할 수 있도록 Java와 Android 플랫폼 API를 사용한다. 화면과 xterm.js는 APK에 포함하고 WebView의 외부 네트워크 로딩과 탐색을 막는다. 로컬 HTTP 요청은 Android 네이티브 코드가 수행하며, UI JavaScript에 인증 토큰을 전달하지 않는다.

## 빌드

```sh
pkg install python openjdk-21 aapt2 d8 apksigner
python scripts/build_apk.py
```

빌드 스크립트는 다음 파일을 다운로드하고 고정 체크섬을 확인한다.

- Google Android SDK Platform 36 revision 2: 공식 저장소 메타데이터의 SHA-1.
- `@xterm/xterm` 5.5.0, `@xterm/addon-fit` 0.10.0, `marked` 15.0.12, `@highlightjs/cdn-assets` 11.11.1: npm 배포본의 SHA-512. 라이선스를 APK에 함께 포함한다.

출력은 `dist/bibimer-debug.apk`, `dist/bibimer-setup.sh`, `dist/checksums.json`이다. 로컬 서명 키는 `.tools/bibimer-debug.keystore`에 만들며 Git에서 제외한다. 같은 설치본을 업데이트하려면 이 키를 유지한다. 개발용 키이므로 배포용 서명·출시 절차는 별도 작업이다.

자바 8 바이트코드와 API 26 이상을 대상으로 빌드하고 target SDK는 36이다. 이는 빌드 설정이며, Android 8~15에서의 실제 실행 검증을 뜻하지 않는다. Gradle이나 Android Studio 빌드는 아직 구성하지 않았다.

## 브리지 개발 실행

```sh
python bridge/bibimer_bridge.py start
python bridge/bibimer_bridge.py pair
python bridge/bibimer_bridge.py status
# 작업 중인 세션을 종료한 뒤 브리지를 업데이트할 때만 실행
python bridge/bibimer_bridge.py restart
```

기본 상태 폴더는 `~/.local/state/bibimer/`다. 테스트용으로 `--state-dir`와 `--port`를 지정할 수 있으며, 현재 Android 앱은 `127.0.0.1:8765`에 고정되어 있다. `serve`는 포그라운드 실행용이고 `start`는 분리된 프로세스로 실행한다.

상태 폴더는 0700, 토큰 및 메타데이터 파일은 0600으로 만든다. 출력이나 입력 내용은 파일로 저장하지 않는다. 실제 세션을 검사할 때도 출력·계정 정보·연결 코드를 테스트 로그나 화면 캡처에 남기지 않는다.

CLI와 설정 스크립트는 영어가 기본이다. `BIBIMER_LANGUAGE=ko` 환경 변수로 한국어 안내를 선택할 수 있고 CLI는 `--language ko`도 지원한다. 앱 언어는 기기 언어와 독립적이며 `AppLanguage`가 Android 환경 설정에 저장하고 명시적 로캘로 네이티브 리소스를 읽는다. `values/strings.xml`이 영어 기본, `values-ko/strings.xml`이 한국어다.

## 검증 명령

```sh
python -m unittest discover -s bridge/tests -v
node --check android/app/src/main/assets/app.js
node --check android/app/src/main/assets/i18n.js
node --check android/app/src/main/assets/conversation.js
node --check android/app/src/main/assets/rich-text.js
python -m py_compile bridge/bibimer_bridge.py scripts/build_apk.py
bash -n dist/bibimer-setup.sh
```

화면 검증에는 Chromium과 Node.js가 추가로 필요하다. 앱 사용에는 이 두 도구가 필요하지 않다.

```sh
pkg install nodejs
npm install --prefix .tools/ui --ignore-scripts --no-fund --no-audit playwright-core@1.55.1
node scripts/smoke_ui.cjs
node scripts/smoke_rendering.cjs
```

현재 기기에 설치된 Codex의 시작·재접속·종료까지 추가 확인하려면 `node scripts/smoke_ui.cjs --probe-codex`를 실행한다. 이 선택 검증은 Codex 설치가 필요하고 모델 작업은 전송하지 않는다. 기본 화면 테스트는 실제 셸과 통제된 Codex 프로토콜 대역으로 동작하며 에이전트 계정이나 모델 요청이 필요하지 않다. `--probe-codex`는 실제 Codex의 PTY 시작 및 App Server 대화 초기화·재접속·종료를 확인한다.

현재 기기에서는 기존 Termux X11 Chromium의 `headless_shell`을 사용했다. 다른 경로의 Chromium을 사용하려면 `BIBIMER_CHROMIUM`을 지정한다. Playwright의 플랫폼 검사에 맞춰 테스트 프로세스에서만 Android를 Linux로 식별하고, 실제 실행 파일은 Termux용 Chromium을 지정한다. 이는 Playwright나 앱의 Android 지원을 검증하는 방법이 아니다.

UI 테스트는 임시 폴더의 실제 브리지에 연결하며 Android 네이티브 API를 명시적인 테스트 어댑터로 대체한다. 한국어 브라우저 로캘에서도 영어로 시작하는지, 한국어 전환·저장값 복원, 오류 번역과 0.1.0 응답 호환, 언어 전환 시 세션·입력 유지까지 확인한다. 어댑터의 설정 저장은 브라우저 테스트용이며 실제 앱의 Android 환경 설정 저장을 검증한 것은 아니다. 화면 캡처는 통제된 셸 출력과 모의 대화만 포함하고 `dist/screenshots/*-en.png`, `*-ko.png`에 저장한다. 실제 앱의 Keystore, WebView 리소스 로딩, 기기 간 앱 격리 경계는 APK로 따로 확인해야 한다.

## 2026-09-28 검증 결과

| 항목 | 결과 |
| --- | --- |
| 현재 환경 | Android 16 / API 36 / arm64, Termux 0.118.3 F-Droid, Python 3.14.6, OpenJDK 21 |
| APK 빌드 | 0.4.0 / versionCode 7 성공, 영어·한국어 리소스 포함 및 APK v2/v3 서명 검증 통과 |
| 브리지 테스트 | 38개 통과: 구조화된 계획·파일별 diff·잘림·미저장 검증 추가, 폴더 탐색의 인증·권한·페이지·숨김·링크·세션 유지 4개 추가, 기존 인증·PTY·Chat·재시작 검증, 여러 프로젝트의 경로·입력·출력·종료 분리, 두 Chat 메시지·승인 분리, 다른 프로젝트 실행 중 재시작 거절, 전체 메타데이터 복원·단일 프로젝트 이동 |
| 화면 + 실제 브리지 | 영어·한국어 안내, 언어 전환 시 세션·입력 유지, 오류 번역·기존 브리지 호환, 코드 연결·프로젝트 생성·한글 입출력·재접속·명시적 종료, Markdown·표·코드·복사, 승인 복구·거절·질문, HTML 비실행, 응답 중단, PTY/Chat 종료 후 브리지 재시작·Start session 활성 유지·새 Chat 시작 통과 |
| 폴더 탐색 | 실제 임시 브리지·폴더로 기존 프로젝트 등록, 홈 대체·상위 이동·숨김·100개 단위 목록·빈 폴더·접근 오류·재시도·취소·지연 응답 분리, 이전 브리지 안내, 영어·한국어 검증 통과 |
| 응답 렌더러 | GFM 중첩·체크리스트·표·링크, 코드 강조·복사·줄바꿈, 파일 diff·줄 번호·계획, 스트리밍/스크롤 유지·접기 상태, HTML 비실행·이미지 자동 요청 없음 검증 통과 |
| 아이콘 | 새 B 벡터·SVG, 적응형/테마 아이콘 리소스 포함·컴파일, 브라우저 크기별 미리보기 확인. 실제 런처는 미검증 |
| 작은 화면 | 393×780과 360×460에서 대화·PTY 전송·질문 응답·폴더 선택 버튼 확인. 언어 변경 시 일반 입력·질문 답변 유지 |
| 프로젝트 전환 | 두 프로젝트 동시 실행, 초안 복원, 지연된 전송 응답 분리, 다른 프로젝트 실행 유지, 승인·질문 대기 복구 통과 |
| 입력 키 | Enter 전송, Shift/Ctrl/Meta+Enter 줄바꿈, 선택 영역 치환, 합성 IME·키 반복·응답 중 전송 방지 통과. 실제 Android 키보드 입력은 미검증 |
| PTY 표시 | 실제 PTY → xterm에서 ANSI 16색·256색·RGB 트루컬러·굵기 및 ASCII 도형 확인 |
| 설치된 Codex | PTY 시작 및 App Server 대화 초기화·재접속·명시적 종료 확인. 모델 요청·실제 코드 수정은 수행하지 않음 |
| 설정 파일 | APK asset·별도 설치 파일·브리지 원본 일치, 셸 문법 검사 통과, 터미널 라이선스 포함 확인 |
| Android 설치 | 앱 0.3.0(versionCode 5) 설치 확인. 실행 세션 0개 확인 후 브리지 0.4.0 적용, 토큰·전체 프로젝트 설정 유지와 운영 상태 API 확인. 최신 APK는 `Download/Bibimer-0.4.0.apk`; APK 업데이트·실제 화면 확인은 남음 |
| 새 사용자 준비 | 설치 가이드·설정 파일 생성 구현. Termux·Python이 없는 기기의 전체 과정은 미검증 |

Codex 확인에 사용한 현재 기기의 패키지는 `@mmmbuto/codex-cli-termux` 0.153.3이다. 일반 Codex 배포본이나 Claude Code의 Android 동작을 확인한 것으로 확대하지 않는다.

## 공식 문서 확인 근거

응답 렌더러·아이콘의 설계와 Marked/highlight.js·Android 적응형 아이콘 근거는 [화면 설계](interface.md)에 기록했다.

- [Android 앱 샌드박스](https://source.android.com/docs/security/app-sandbox): 앱마다 UID·권한을 분리하므로 앱이 Termux 전용 데이터를 직접 읽는 것으로 가정하지 않는다. 폴더 목록은 인증된 로컬 브리지가 Termux 권한으로 읽는다. 이 경계의 실제 WebView 동작은 APK로 별도 확인한다.

- [MDN keydown과 IME](https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event#keydown_events_with_ime): 조합 시작·종료 경계에서는 `isComposing`과 IME 키 코드 229를 함께 확인한다. 구현은 브라우저 합성 이벤트로 확인했으며 기기의 실제 조합 동작은 별도 검증한다.
- [MDN enterkeyhint](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/enterkeyhint): 공통 입력창의 가상 키보드 동작 힌트를 `send`로 설정한다. 표시 방식은 키보드와 사용자 언어에 따라 달라질 수 있다.
- [Termux RUN_COMMAND Intent](https://github.com/termux/termux-app/wiki/RUN_COMMAND-Intent): 외부 실행에는 별도 권한과 `allow-external-apps` 설정이 필요하다. 첫 버전은 수동 설정 파일 실행을 사용하며 해당 권한을 요구하지 않는다.
- [Android 앱 내 콘텐츠 로드](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content): 앱에 포함한 리소스를 사용한다. 이 구현은 허용 목록의 리소스만 `shouldInterceptRequest`로 제공한다.
- [Android WebView 네이티브 브리지](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges): 외부 콘텐츠가 JavaScript 인터페이스에 접근하지 못하도록 탐색·파일 접근·외부 리소스를 차단한다.
- [Android 네트워크 보안 설정](https://developer.android.com/privacy-and-security/security-config): 일반 cleartext를 차단하고 `127.0.0.1`에만 예외를 둔다.
- [Android 로컬 네트워크 권한](https://developer.android.com/privacy-and-security/local-network-permission): OS·target SDK에 따른 권한 변화는 향후 기기 검증에 포함한다.
- [Termux 공식 저장소](https://github.com/termux/termux-app): Android의 프로세스 제한 및 설치 배포처 안내를 확인했다. 화면 잠금·백그라운드 생존은 별도 실기기 검증 항목이다.
- [xterm.js API](https://xtermjs.org/docs/api/terminal/classes/terminal/): 터미널 입출력과 크기 변경에 사용한다. 의존성의 MIT 라이선스를 APK의 vendor assets에 포함한다.
- [Android 지역화](https://developer.android.com/guide/topics/resources/localization), [문자열 리소스](https://developer.android.com/guide/topics/resources/string-resource), [로캘을 지정한 Context](https://developer.android.com/reference/android/content/Context#createConfigurationContext(android.content.res.Configuration)): 영어 기본 리소스·한국어 대체 리소스를 제공하고 앱에서 선택한 언어로 네이티브 안내를 읽는다.

- [Codex App Server](https://learn.chatgpt.com/docs/app-server): stdio의 초기화·스레드·턴·항목·승인·질문 이벤트에 사용한다. 설치된 CLI에서 생성한 JSON 스키마로 실제 필드도 확인했다. 스키마 캐시는 `.tools/`에만 둔다.
- [Paseo 제공자 구조](https://github.com/getpaseo/paseo/blob/main/docs/providers.md): 에이전트별 구조화된 연결을 공통 대화 화면으로 제공하는 방식의 참고 자료다.
- [xterm.js 터미널 시퀀스](https://xtermjs.org/docs/api/vtfeatures/): SGR 색상·문자 속성 등 PTY 렌더링 근거다.
- [Android Bionic pidfd 헤더](https://android.googlesource.com/platform/bionic/+/refs/heads/main/libc/include/sys/pidfd.h): Android API 31에 추가된 libc 래퍼를 확인했다. 현재 Termux Python에서 직접 노출하지 않는 pidfd는 공개 libc 래퍼로 호출하고, 실제 테스트용 프로세스에 한정해 종료를 검증했다. 지원하지 않는 기기에서는 이전 버전 브리지 자동 종료를 거부한다.
