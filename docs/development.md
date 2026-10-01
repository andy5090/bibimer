# 개발 및 검증

## 소스 구조

```text
android/app/src/main/
    java/app/bibimer/       Android Activity, 고정 로컬 HTTP 클라이언트, 토큰 보관
    assets/                대화·터미널 화면, conversation.js/rich-text.js, brand.svg, 영어·한국어 i18n.js 문구
    res/                   앱 아이콘·테마·네트워크 정책, 영어·한국어 네이티브 문구
bridge/bibimer_bridge.py    Python 표준 라이브러리 브리지
bridge/provider_opencode.py OpenCode 로컬 HTTP 서버 어댑터
bridge/provider_claude.mjs  Claude Agent SDK 어댑터
bridge/tests/              PTY·HTTP, 세 에이전트 프로토콜 대역, 업데이트 통합 테스트
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

설정 스크립트는 브리지와 두 어댑터 소스를 체크섬과 함께 내장하고 설치 시 각각 검증한다. `BIBIMER_CLAUDE=1`로 실행하면 필요한 Node.js와 SDK 0.3.283을 별도 설치한다. SDK와 Claude CLI는 APK에 포함하지 않으며 설정 스크립트가 기존 CLI를 교체하지 않는다.

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
node --check bridge/provider_claude.mjs
node --check android/app/src/main/assets/app.js
node --check android/app/src/main/assets/i18n.js
node --check android/app/src/main/assets/conversation.js
node --check android/app/src/main/assets/rich-text.js
python -m py_compile bridge/bibimer_bridge.py bridge/provider_opencode.py scripts/build_apk.py
bash -n dist/bibimer-setup.sh
```

브리지 테스트의 Claude SDK 대역에는 Node.js가 필요하고, 화면 검증에는 Chromium도 필요하다. Android 앱 자체는 이 도구들을 사용하지 않지만 Claude Chat 어댑터는 Termux의 Node.js가 필요하다.

```sh
pkg install nodejs
npm install --prefix .tools/ui --ignore-scripts --no-fund --no-audit playwright-core@1.55.1
node scripts/smoke_ui.cjs
node scripts/smoke_rendering.cjs
```

현재 기기에 설치된 Codex의 시작·재접속·종료까지 추가 확인하려면 `node scripts/smoke_ui.cjs --probe-codex`를 실행한다. 이 선택 검증은 Codex 설치가 필요하고 모델 작업은 전송하지 않는다. 기본 화면 테스트는 실제 셸과 통제된 Codex·OpenCode·Claude 프로토콜 대역으로 동작하며 에이전트 계정이나 모델 요청이 필요하지 않다. `--probe-codex`는 실제 Codex의 PTY 시작 및 App Server 대화 초기화·재접속·종료를 확인한다.

현재 기기에서는 기존 Termux X11 Chromium의 `headless_shell`을 사용했다. 다른 경로의 Chromium을 사용하려면 `BIBIMER_CHROMIUM`을 지정한다. Playwright의 플랫폼 검사에 맞춰 테스트 프로세스에서만 Android를 Linux로 식별하고, 실제 실행 파일은 Termux용 Chromium을 지정한다. 이는 Playwright나 앱의 Android 지원을 검증하는 방법이 아니다.

UI 테스트는 임시 폴더의 실제 브리지에 연결하며 Android 네이티브 API를 명시적인 테스트 어댑터로 대체한다. 한국어 브라우저 로캘에서도 영어로 시작하는지, 한국어 전환·저장값 복원, 오류 번역과 0.1.0 응답 호환, 언어 전환 시 세션·입력 유지까지 확인한다. 어댑터의 설정 저장은 브라우저 테스트용이며 실제 앱의 Android 환경 설정 저장을 검증한 것은 아니다. 화면 캡처는 통제된 셸 출력과 모의 대화만 포함하고 `dist/screenshots/*-en.png`, `*-ko.png`에 저장한다. 실제 앱의 Keystore, WebView 리소스 로딩, 기기 간 앱 격리 경계는 APK로 따로 확인해야 한다.

## 2026-10-02 Settings·Enter 동작 검증 (소스 반영 / 빌드 대기)

- 별도 Settings와 언어 선택 이동, Enter 기본 줄바꿈·보내기 선택 및 저장 실패 시 이전 선택 유지를 구현했다. `InputPreferences`의 Android 저장값은 `newline`/`send`만 허용하며 기본값은 `newline`이다. 인증·프로젝트·세션과 독립적이다.
- `node scripts/smoke_ui.cjs` 통과. 연결 전 설정, 영어/한국어, 두 선택의 재로드 복원, PTY·Chat 선택 영역 줄바꿈, IME 보호, 설정 왕복 후 초안·실행 세션 유지, 응답 중 Enter 오전송 없음과 Queue 버튼·보내기 선택 후 Enter 추가를 검증했다. 기존 멀티 프로젝트·가져오기·세 제공자·승인·대기열·Steer 검증도 통과했다.
- 기존 렌더러 검증 통과. 320/360/393×460 Settings에서 가로 넘침 없이 두 선택 메뉴와 하단 내비게이션이 표시되고, 저장값 누락·알 수 없는 값은 줄바꿈으로 처리되는지 추가 확인했다.
- Android API 36 jar와 기존 생성 R.java를 이용한 Java 소스 컴파일 통과. APK 패키징·빌드·설치, 운영 브리지 재시작은 하지 않았다. 브라우저 설정 저장은 네이티브 API 대역이므로 실제 Android SharedPreferences·WebView·소프트 키보드/IME 검증은 다음 요청 빌드 후 필요하다.

## 2026-10-01 Queue·Steer 검증 (소스 반영 / 빌드 대기)

- Python 통합 67개 통과. 대기열 FIFO·취소·용량·중복·프로젝트 격리·승인 보존·실패/중단 후 재개·내용 미저장·Claude/OpenCode 연속 실행과 Codex Steer 응답 확인·거절·시간 초과 검증 포함. 최종 대기열 테스트 6개로 응답 유실 후 후속 작업 재개도 확인했다.
- UI 통합·렌더러 검증 통과. Project Add·Full Access 표기, 응답 중 Enter→Queue, 프로젝트 왕복·앱 재로드 후 대기 복원, 취소·재개, 거절된 Steer 초안 유지, 이전 브리지 안내, 영어/한국어와 360×460의 입력/내비게이션 배치를 확인했다. Android 네이티브 연결은 브라우저 대역이다.
- 실제 Codex 0.156.1은 통제된 로컬 HTTP 응답 대역을 사용했다. 외부 모델 호출 없이 같은 턴 Steer 수락·중복 억제와 Queue 대기·interrupt 후 일시정지·취소를 확인했다. 실제 모델의 지시 반영과 Android WebView·키보드는 별도 검증이다.
- 사용자 요청에 따라 APK를 빌드하지 않았고 운영 브리지·사용자 세션도 변경하지 않았다. 배포 파일은 계속 0.8.2이며 새 기능은 다음 요청 빌드에 포함한다.

## 2026-10-01 검증 결과 (0.8.1)

- Python 통합 테스트 60개와 UI·렌더러 검증 통과. 입력창 아래 직접 권한/Fast 변경, 대기 승인 보존, 다음 입력 적용, 기본 정책 복원, 재로드/프로젝트별 격리와 기존 기능을 확인했다. 360×460에서도 하단 컨트롤이 입력창과 내비게이션 사이에 표시된다.
- 실제 Codex의 설정 변경 알림으로 YOLO→읽기→프로젝트 쓰기→기본값 복원을 확인했다. 로컬 HTTP 대역만 사용해 실제 모델 호출 없이 네이티브 정책과 Fast 설정 전달·저장/재개를 검증했다. 실제 모델 도구 실행은 별도 검증이다. OpenCode 기본값 복원 제약은 [1.17.13 세션 PATCH 구현](https://github.com/anomalyco/opencode/blob/v1.17.13/packages/opencode/src/server/routes/instance/httpapi/handlers/session.ts)의 기존 규칙 병합을 기준으로 확인했다.
- 0.8.1/code 14 APK 빌드·서명·이전 인증서 일치·내장 파일·설치 추출 검증 완료. `Download/Bibimer-0.8.1.apk`와 설정 파일을 준비했다.
- 운영 브리지 0.8.1 적용. 아직 입력하지 않은 준비 상태의 빈 Codex 세션만 같은 프로젝트·설정으로 다시 열고 인증·프로젝트를 유지했다. 앱은 마지막 확인 기준 0.8.0/code 13이어서 새 APK 설치가 필요하다. Android 실기기 조작 검증은 남는다.

## 2026-10-01 검증 결과 (0.8.0)

- Python 통합 테스트 58개 통과. 권한·속도의 새/원본/복사 매핑, 잘못된 설정 거절, PTY argv/환경, Fast on/off·중복 처리·다른 프로젝트 격리 포함.
- UI 및 기존 응답 렌더러 테스트 통과. Android 설정 저장 API의 브라우저 대역을 통해 마지막 선택/재로드/에이전트 분리, 가져오기, 실행 중 권한 잠금·Fast 전환, 영어·한국어와 360×460 설정 팝업을 확인했다. 실제 Android 저장 검증과 구분한다.
- 실제 Codex App Server 설정 수락과 로컬 HTTP 대역의 Fast on/off tier 전달을 확인했다. 실제 Claude SDK bypass 초기화, OpenCode 새/원본/복사 permission 규칙도 확인했다. 실제 모델 작업은 보내지 않았다.
- 0.8.0/versionCode 13 빌드, v2/v3 서명 및 이전 인증서 일치, APK 내장 UI·설치 스크립트·네 소스와 격리 설치/0700 권한 검증. 배포: `Download/Bibimer-0.8.0.apk`, `Download/bibimer-setup-0.8.0.sh`.
- 사용자 재시작 요청 후 실제 앱 0.8.0/code 13과 운영 브리지 0.8.0 적용 확인. 실행 세션 0개에서 표시 기록 65개를 비공개 보존한 뒤 재시작했고 기존 인증·프로젝트 3개·이전 세션 상태 조회 및 새 기능 플래그가 유지됨을 확인했다. 모델 도구 정책·Fast 계정별 제공·Android 실기기 UI/저장 검증은 남는다.
- 근거: [Codex App Server](https://learn.chatgpt.com/docs/app-server), [Codex Fast](https://learn.chatgpt.com/docs/agent-configuration/speed), [Claude 권한](https://code.claude.com/docs/en/permissions), 설치된 Claude SDK `sdk.d.ts`, [OpenCode 권한](https://opencode.ai/docs/permissions/), [OpenCode CLI 환경 변수](https://opencode.ai/docs/cli/)와 설치된 서버 `/doc` 스키마.

## 2026-10-01 검증 결과 (0.7.0)

- Codex 저장 통합: 실제 Codex 0.156.1과 임시 프로젝트·로컬 HTTP 오류 대역으로 첫 사용자 턴을 생성했다. 외부 모델 요청 없이 기본 세션 목록 노출, `ephemeral: false`, 프로세스 종료 후 같은 ID와 사용자 입력 복원을 확인했다. 테스트에서 만든 기록만 보관 처리했다.
- Claude 복구: 기존 앱 세션에서 남긴 변경 사항을 이어받아 공식 2.1.283 실행 파일을 전용 폴더에 설치했다. 설치된 glibc를 사용하는 현재 arm64 Termux에서 버전, 실제 SDK 초기화, Bibimer Chat 준비 및 PTY 출력을 확인했다. 실제 모델 요청은 보내지 않았다.
- 브리지 테스트 **53개 통과**. UI 통합·렌더러 검증 통과. 브리지 회귀 검증은 저장소 공유·브리지 재시작 후 같은 세션 재개와 복구 런처 선택·무결성 오류·실행 실패 시 기존 파일 보존을 포함한다. UI 검증은 원본 이어하기 기본값, 명시적 복사, CLI 명령 복사, 이전 브리지의 새 Codex Chat 차단을 포함한다.
- APK 0.7.0 / versionCode 12 빌드·v2/v3 서명 통과. 내장 UI·설정 스크립트와 네 소스(브리지·두 어댑터·Claude 복구 도구) 일치, 격리 설치 추출과 0700 권한을 확인했다. 설치 파일은 `Download/Bibimer-0.7.0.apk`다.
- 현재 설치 앱은 0.6.1 / code 10. 이전 앱 세션의 남은 표시 기록은 저장소 밖에 비공개 보존했다. 운영 브리지 재시작은 이 세션을 마친 뒤 진행해야 하며 실제 Android 화면·키보드·모델 응답 검증은 남는다.

## 2026-09-28 검증 결과

0.6.1은 입력창 아래 마진만 조정했다. 기존 렌더러·모바일 레이아웃 검증과 APK 빌드·서명·CSS/JS 포함 검증을 다시 수행했다. 아래 브리지·에이전트 검증은 0.6.0 결과이며 브리지 코드는 변경하지 않았다.

| 항목 | 결과 |
| --- | --- |
| 현재 환경 | Android 16 / API 36 / arm64, Termux 0.118.3 F-Droid, Python 3.14.6, OpenJDK 21 |
| APK 빌드 | 0.6.1 / versionCode 10 성공, 영어·한국어 리소스 포함 및 APK v2/v3 서명 검증 통과, 기존 서명 인증서 일치 |
| 브리지 테스트 | 48개 통과: 기존 45개와 OpenCode·Claude의 새 대화·가져오기·프로젝트 경로 검증·자동 승인 없음·명시적 승인/거절·복수 선택 질문·중복 응답·중단·CLI/SDK 오류 검증 3개 추가 |
| 화면 + 실제 브리지 | 영어·한국어 안내, 언어 전환 시 세션·입력 유지, 오류 번역·기존 브리지 호환, 코드 연결·프로젝트 생성·한글 입출력·재접속·명시적 종료, Markdown·표·코드·복사, 승인 복구·거절·질문, HTML 비실행, 응답 중단, PTY/Chat 종료 후 브리지 재시작·Start session 활성 유지·새 Chat 시작 통과 |
| 폴더 탐색 | 실제 임시 브리지·폴더로 기존 프로젝트 등록, 홈 대체·상위 이동·숨김·100개 단위 목록·빈 폴더·접근 오류·재시도·취소·지연 응답 분리, 이전 브리지 안내, 영어·한국어 검증 통과 |
| 세션 가져오기 | 임시 브리지·세 에이전트 대역으로 에이전트 선택·검색·페이지·오류·제목 HTML 비실행·복사 기본값·기록 서식·자동 실행/승인 없음·후속 입력·닫은 창의 늦은 응답 분리·영어/한국어 검증 통과 |
| 새 에이전트 대화 | OpenCode·Claude 대역의 새 Chat, 재접속 후 에이전트·승인 유지, 복수 선택 초안·프로젝트/언어 전환, 360×460 질문 제출, 명시적 종료 및 OpenCode PTY 입력 통과 |
| 응답 렌더러 | GFM 중첩·체크리스트·표·링크, 코드 강조·복사·줄바꿈, 파일 diff·줄 번호·계획, 스트리밍/스크롤 유지·접기 상태, HTML 비실행·이미지 자동 요청 없음 검증 통과 |
| 아이콘 | 새 B 벡터·SVG, 적응형/테마 아이콘 리소스 포함·컴파일, 브라우저 크기별 미리보기 확인. 실제 런처는 미검증 |
| 작은 화면 | 393×780과 360×460에서 세션 가져오기·대화·PTY 전송·질문 응답·폴더 선택 버튼 확인. 언어 변경 시 일반 입력·질문 답변 유지 |
| 프로젝트 전환 | 두 프로젝트 동시 실행, 초안 복원, 지연된 전송 응답 분리, 다른 프로젝트 실행 유지, 승인·질문 대기 복구 통과 |
| 입력 키 | Enter 전송, Shift/Ctrl/Meta+Enter 줄바꿈, 선택 영역 치환, 합성 IME·키 반복·응답 중 전송 방지 통과. 실제 Android 키보드 입력은 미검증 |
| PTY 표시 | 실제 PTY → xterm에서 ANSI 16색·256색·RGB 트루컬러·굵기 및 ASCII 도형 확인 |
| 설치된 Codex | PTY 시작 및 App Server 대화 초기화·재접속·명시적 종료 확인. 모델 요청·실제 코드 수정은 수행하지 않음 |
| 실제 OpenCode | 1.17.13: 새 Chat 초기화·목록·복사·원본 이어하기·통제된 기록 표시·PTY 시작·재접속·명시적 종료 확인. 모델 요청 없음 |
| 실제 Claude SDK | 0.3.283: 격리한 설정 폴더의 통제된 기록 조회·읽기·복사, 원본 유지 확인. 현재 설치 CLI는 네이티브 실행 파일 누락으로 실행 실패, 실제 모델 대화 미검증 |
| 설정 파일 | APK asset·별도 설치 파일·브리지/두 어댑터 원본 일치, 셸 문법 및 격리된 설치 추출·체크섬·0700 권한 검증 통과 |
| Android 설치 | 앱 0.4.0(versionCode 7) 설치 확인. 실행 세션 0개 확인 후 브리지 0.6.0 적용, 토큰·전체 프로젝트 설정 유지와 운영 세 에이전트 목록 API 확인. 최신 APK는 `Download/Bibimer-0.6.1.apk`; APK 업데이트·실제 화면 확인은 남음 |
| 새 사용자 준비 | 설치 가이드·설정 파일 생성 구현. Termux·Python이 없는 기기의 전체 과정은 미검증 |

현재 설치된 CLI는 `codex-cli 0.156.1`이다. 0.5.0 작업에서는 현재 프로젝트의 읽기 전용 목록·항목 조회와 별도로 만든 통제된 테스트 기록의 복사·원본 이어하기를 실제 App Server로 확인했다. 테스트 기록 생성·주입은 모델 턴을 시작하지 않았으며 사용자 기록은 이어가거나 변경하지 않았다. 이전 PTY·Chat 초기화 검증의 패키지는 `@mmmbuto/codex-cli-termux` 0.153.3이었다. 일반 Codex 배포본이나 Claude Code의 Android 동작을 확인한 것으로 확대하지 않는다.

0.6.0에서는 OpenCode의 전용 테스트 폴더에 세션을 만들고 공개 API의 `noReply` 입력으로 통제된 기록을 주입했다. 실제 어댑터의 새 세션·fork·resume·history를 확인한 뒤 이번 검증에서 생성한 세션만 삭제했다. Claude SDK는 임시 `CLAUDE_CONFIG_DIR` 안의 합성 기록으로 SDK 파일 API를 검증했다. 두 검증 모두 사용자 대화·자격 증명을 출력하거나 실제 모델 작업을 실행하지 않았다. Claude의 실제 CLI 실행과 세 에이전트의 실제 모델 응답·도구·승인은 별도 검증이 남는다.

## 공식 문서 확인 근거

응답 렌더러·아이콘의 설계와 Marked/highlight.js·Android 적응형 아이콘 근거는 [화면 설계](interface.md)에 기록했다.

- [Android 앱 샌드박스](https://source.android.com/docs/security/app-sandbox): 앱마다 UID·권한을 분리하므로 앱이 Termux 전용 데이터를 직접 읽는 것으로 가정하지 않는다. 폴더 목록은 인증된 로컬 브리지가 Termux 권한으로 읽는다. 이 경계의 실제 WebView 동작은 APK로 별도 확인한다.

- [MDN keydown과 IME](https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event#keydown_events_with_ime): 조합 시작·종료 경계에서는 `isComposing`과 IME 키 코드 229를 함께 확인한다. 구현은 브라우저 합성 이벤트로 확인했으며 기기의 실제 조합 동작은 별도 검증한다.
- [MDN enterkeyhint](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/enterkeyhint): 공통 입력창의 가상 키보드 동작 힌트는 기본 `enter`이며 보내기 설정을 선택하면 `send`로 바뀐다. 표시 방식은 키보드와 사용자 언어에 따라 달라질 수 있다.
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
