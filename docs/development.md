# 개발 및 검증

## 소스 구조

```text
android/app/src/main/
    java/app/bibimer/       Android Activity, 고정 로컬 HTTP 클라이언트, 토큰 보관
    assets/                영어 기본·한국어 화면과 터미널, i18n.js 문구
    res/                   앱 아이콘·테마·네트워크 정책, 영어·한국어 네이티브 문구
bridge/bibimer_bridge.py    Python 표준 라이브러리 브리지
bridge/tests/              실제 PTY·HTTP 통합 테스트
scripts/build_apk.py        Termux에서 APK 빌드 및 설치 스크립트 생성
scripts/smoke_ui.cjs        화면 + 실제 브리지 연결 검증
```

첫 버전은 같은 폰에서 APK까지 빌드할 수 있도록 Java와 Android 플랫폼 API를 사용한다. 화면과 xterm.js는 APK에 포함하고 WebView의 외부 네트워크 로딩과 탐색을 막는다. 로컬 HTTP 요청은 Android 네이티브 코드가 수행하며, UI JavaScript에 인증 토큰을 전달하지 않는다.

## 빌드

```sh
pkg install python openjdk-21 aapt2 d8 apksigner
python scripts/build_apk.py
```

빌드 스크립트는 다음 파일을 다운로드하고 고정 체크섬을 확인한다.

- Google Android SDK Platform 36 revision 2: 공식 저장소 메타데이터의 SHA-1.
- `@xterm/xterm` 5.5.0, `@xterm/addon-fit` 0.10.0: npm 배포본의 SHA-512.

출력은 `dist/bibimer-debug.apk`, `dist/bibimer-setup.sh`, `dist/checksums.json`이다. 로컬 서명 키는 `.tools/bibimer-debug.keystore`에 만들며 Git에서 제외한다. 같은 설치본을 업데이트하려면 이 키를 유지한다. 개발용 키이므로 배포용 서명·출시 절차는 별도 작업이다.

자바 8 바이트코드와 API 26 이상을 대상으로 빌드하고 target SDK는 36이다. 이는 빌드 설정이며, Android 8~15에서의 실제 실행 검증을 뜻하지 않는다. Gradle이나 Android Studio 빌드는 아직 구성하지 않았다.

## 브리지 개발 실행

```sh
python bridge/bibimer_bridge.py start
python bridge/bibimer_bridge.py pair
python bridge/bibimer_bridge.py status
```

기본 상태 폴더는 `~/.local/state/bibimer/`다. 테스트용으로 `--state-dir`와 `--port`를 지정할 수 있으며, 현재 Android 앱은 `127.0.0.1:8765`에 고정되어 있다. `serve`는 포그라운드 실행용이고 `start`는 분리된 프로세스로 실행한다.

상태 폴더는 0700, 토큰 및 메타데이터 파일은 0600으로 만든다. 출력이나 입력 내용은 파일로 저장하지 않는다. 실제 세션을 검사할 때도 출력·계정 정보·연결 코드를 테스트 로그나 화면 캡처에 남기지 않는다.

CLI와 설정 스크립트는 영어가 기본이다. `BIBIMER_LANGUAGE=ko` 환경 변수로 한국어 안내를 선택할 수 있고 CLI는 `--language ko`도 지원한다. 앱 언어는 기기 언어와 독립적이며 `AppLanguage`가 Android 환경 설정에 저장하고 명시적 로캘로 네이티브 리소스를 읽는다. `values/strings.xml`이 영어 기본, `values-ko/strings.xml`이 한국어다.

## 검증 명령

```sh
python -m unittest discover -s bridge/tests -v
node --check android/app/src/main/assets/app.js
node --check android/app/src/main/assets/i18n.js
python -m py_compile bridge/bibimer_bridge.py scripts/build_apk.py
bash -n dist/bibimer-setup.sh
```

화면 검증에는 Chromium과 Node.js가 추가로 필요하다. 앱 사용에는 이 두 도구가 필요하지 않다.

```sh
pkg install nodejs
npm install --prefix .tools/ui --ignore-scripts --no-fund --no-audit playwright-core@1.55.1
node scripts/smoke_ui.cjs
```

현재 기기에 설치된 Codex의 시작·재접속·종료까지 추가 확인하려면 `node scripts/smoke_ui.cjs --probe-codex`를 실행한다. 이 선택 검증은 Codex 설치가 필요하고 모델 작업은 전송하지 않는다. 기본 화면 테스트는 에이전트가 없어도 셸로 검증한다.

현재 기기에서는 기존 Termux X11 Chromium의 `headless_shell`을 사용했다. 다른 경로의 Chromium을 사용하려면 `BIBIMER_CHROMIUM`을 지정한다. Playwright의 플랫폼 검사에 맞춰 테스트 프로세스에서만 Android를 Linux로 식별하고, 실제 실행 파일은 Termux용 Chromium을 지정한다. 이는 Playwright나 앱의 Android 지원을 검증하는 방법이 아니다.

UI 테스트는 임시 폴더의 실제 브리지에 연결하며 Android 네이티브 API를 명시적인 테스트 어댑터로 대체한다. 한국어 브라우저 로캘에서도 영어로 시작하는지, 한국어 전환·저장값 복원, 오류 번역과 0.1.0 응답 호환, 언어 전환 시 세션·입력 유지까지 확인한다. 어댑터의 설정 저장은 브라우저 테스트용이며 실제 앱의 Android 환경 설정 저장을 검증한 것은 아니다. 화면 캡처는 통제된 셸 출력만 포함하고 `dist/screenshots/*-en.png`, `*-ko.png`에 저장한다. 실제 앱의 Keystore, WebView 리소스 로딩, 기기 간 앱 격리 경계는 APK로 따로 확인해야 한다.

## 2026-09-13 검증 결과

| 항목 | 결과 |
| --- | --- |
| 현재 환경 | Android 16 / API 36 / arm64, Termux 0.118.3 F-Droid, Python 3.14.6, OpenJDK 21 |
| APK 빌드 | 0.1.1 / versionCode 2 성공, 영어·한국어 리소스 포함 및 APK v2/v3 서명 검증 통과 |
| PTY·HTTP 테스트 | 17개 통과: 인증, 페어링 만료·시도 제한, 경로 검증, 입출력·재접속, 중복 실행·입력 방지, resize, Ctrl+C, 종료 코드, 대상 작업만 중지, 유실 상태, 출력 미저장, 영어 기본·한국어 CLI 선택 |
| 화면 + 실제 브리지 | 영어·한국어 안내, 언어 전환 시 세션·입력 유지, 오류 번역·기존 브리지 호환, 코드 연결·프로젝트 생성·한글 입출력·재접속·명시적 종료 통과 |
| 작은 화면 | 393×780과 360×460에서 출력·전송·프로젝트 등록 버튼 확인. 자동 갱신 시 입력 중 경로 유지 |
| 설치된 Codex | PTY 실행·xterm 화면 연결·같은 세션 재접속·명시적 종료 확인. 모델 요청·코드 수정 작업은 수행하지 않음 |
| 설정 파일 | APK asset·별도 설치 파일·브리지 원본 일치, 셸 문법 검사 통과, 터미널 라이선스 포함 확인 |
| Android 설치 | `pm list packages --show-versioncode --user 0 app.bibimer`로 기존 versionCode 1 설치 확인. 0.1.1 업데이트 파일은 `Download/Bibimer-0.1.1.apk`; 새 버전 설치·실제 화면 확인은 남음 |
| 새 사용자 준비 | 설치 가이드·설정 파일 생성 구현. Termux·Python이 없는 기기의 전체 과정은 미검증 |

Codex 확인에 사용한 현재 기기의 패키지는 `@mmmbuto/codex-cli-termux` 0.153.3이다. 일반 Codex 배포본이나 Claude Code의 Android 동작을 확인한 것으로 확대하지 않는다.

## 공식 문서 확인 근거

- [Termux RUN_COMMAND Intent](https://github.com/termux/termux-app/wiki/RUN_COMMAND-Intent): 외부 실행에는 별도 권한과 `allow-external-apps` 설정이 필요하다. 첫 버전은 수동 설정 파일 실행을 사용하며 해당 권한을 요구하지 않는다.
- [Android 앱 내 콘텐츠 로드](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content): 앱에 포함한 리소스를 사용한다. 이 구현은 허용 목록의 리소스만 `shouldInterceptRequest`로 제공한다.
- [Android WebView 네이티브 브리지](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges): 외부 콘텐츠가 JavaScript 인터페이스에 접근하지 못하도록 탐색·파일 접근·외부 리소스를 차단한다.
- [Android 네트워크 보안 설정](https://developer.android.com/privacy-and-security/security-config): 일반 cleartext를 차단하고 `127.0.0.1`에만 예외를 둔다.
- [Android 로컬 네트워크 권한](https://developer.android.com/privacy-and-security/local-network-permission): OS·target SDK에 따른 권한 변화는 향후 기기 검증에 포함한다.
- [Termux 공식 저장소](https://github.com/termux/termux-app): Android의 프로세스 제한 및 설치 배포처 안내를 확인했다. 화면 잠금·백그라운드 생존은 별도 실기기 검증 항목이다.
- [xterm.js API](https://xtermjs.org/docs/api/terminal/classes/terminal/): 터미널 입출력과 크기 변경에 사용한다. 의존성의 MIT 라이선스를 APK의 vendor assets에 포함한다.
- [Android 지역화](https://developer.android.com/guide/topics/resources/localization), [문자열 리소스](https://developer.android.com/guide/topics/resources/string-resource), [로캘을 지정한 Context](https://developer.android.com/reference/android/content/Context#createConfigurationContext(android.content.res.Configuration)): 영어 기본 리소스·한국어 대체 리소스를 제공하고 앱에서 선택한 언어로 네이티브 안내를 읽는다.
