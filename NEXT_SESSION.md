# Bibimer 다음 세션 시작점

## 작업 폴더

`/data/data/com.termux/files/home/projects/bibimer`

## GitHub 저장소

- 비공개 저장소: [andy5090/bibimer](https://github.com/andy5090/bibimer).
- 로컬 `origin`: `https://github.com/andy5090/bibimer.git`.
- 기본 작업 브랜치: `main`, 원격 추적 브랜치: `origin/main`.
- 2026-09-13 사용자 요청으로 저장소 생성·로컬 연결. GitHub에서 `isPrivate: true` 및 소유 계정 확인.
- 소스·문서를 Git으로 관리하며 APK·도구 캐시·서명 키·환경 변수 파일은 제외한다. Git 작성자는 이 저장소에만 설정하고 GitHub 비공개 이메일을 사용한다.

## 원래 요청

Android에서 Termux와 연동해 여러 프로젝트와 Codex·Claude 같은 코딩 에이전트를 관리·오케스트레이션하는 앱을 구상하고, 가제로 프로젝트 폴더를 만든 뒤 그 폴더를 기준으로 개발을 시작한다.

이름 검토 후 사용자가 Bibimer로 프로젝트 폴더를 다시 설정하도록 요청했다. 이후 작업은 위 경로를 기준으로 진행한다.

사용자는 Android 앱으로 사용할 수 있어야 하며, 폰에서 직접 개발 과정을 진행하는 것이 핵심이라고 명확히 했다. Orca·Paseo는 프로젝트·에이전트 관리 경험의 벤치마킹 대상으로 둔다.

## 정리한 방향

- 확정한 프로젝트 이름: Bibimer(비비머). ‘비빔 + -er’에서 유래한다.
- 제품 소개 문구: ‘한 손으로 지휘하는 코딩 에이전트’.
- 웹사이트 후보: `bibimer.app`. 아직 도메인을 확보하지 않았다.
- 휴대폰에 설치하는 Android 앱이 개발 작업의 주 사용 화면을 제공하고, 같은 휴대폰의 Termux에서 프로젝트 파일·에이전트 CLI·개발 명령을 다룬다.
- 별도의 개발 PC나 원격 개발 호스트를 기본 사용 흐름의 전제로 삼지 않는다.
- Orca·Paseo의 프로젝트·에이전트 관리 경험을 참고해, 작업 지시부터 실행 결과 확인과 후속 입력까지 폰에서 이어가는 흐름을 설계한다.
- 먼저 프로젝트 하나·에이전트 하나의 실행, 입출력, 재접속을 검증한다.
- 첫 마일스톤은 같은 휴대폰에 설치한 실제 Android 앱과 Termux로 검증한다. 첫 연결 실험에서 브리지는 수동으로 시작해도 된다.
- 실제 기기 검증 결과에 따라 구현 구조를 조정한다.
- Termux와 개발 도구가 없는 사용자를 위해 앱 내 설치 안내·설정 파일·실행 명령 가이드를 제공한다. 새 기기에서 설치부터 실행까지 완주하는지는 나중에 실제 확인한다.
- 첫 구현 스택: Java Android 앱 + 앱에 포함한 WebView/xterm.js 화면, Python 표준 라이브러리 HTTP 브리지, PTY. 현재 기기에서 APK를 직접 빌드하는 경로를 확보했다.
- 기본 표시 언어는 영어이며 한국어를 추가 지원한다. 기기 언어와 관계없이 영어로 시작하고 **Setup → Language → 한국어**에서 선택한 언어를 저장한다. 사용자와의 설명·프로젝트 문서는 한국어를 유지한다.

## 0.2.0 변경 (2026-09-14)

사용자가 PTY 외에 Paseo와 같은 텍스트 서식·자체 입력 UI, PTY의 ASCII·색상 지원을 요청했다.

- `ChatSession`: Codex App Server(stdio) 대화. 메시지·도구 실행·파일 변경·계획, 승인·추가 질문 응답, 현재 응답 중단, 같은 실행 세션 재접속을 구현했다.
- `conversation.js`: DOM 기반 Markdown 부분 지원(제목·목록·표·코드·굵기), 코드 복사, 도구·변경 상세, 직접 입력·선택지·승인 버튼. HTML과 외부 콘텐츠를 실행하지 않는다.
- Chat과 Terminal을 세션 시작 전에 선택한다. 현재 Chat은 Codex만 지원하며 Claude와 셸은 PTY다. 한 프로젝트·한 실행 세션 범위는 유지한다.
- PTY는 ANSI 16색·256색·트루컬러·굵기·ASCII 도형을 실제 브리지→xterm 화면에서 검증했다.
- `restart` CLI와 종료 API를 추가했다. 활성 세션이 있으면 거부하고, 이전 버전은 소유권·상태 잠금·pidfd를 확인한 해당 브리지만 종료한다. 관련 절차는 `docs/setup.md`에 있다.
- 브리지 테스트 25개 통과: 기존 PTY·인증 테스트와 Chat 메시지·중복 방지·승인 복구·거절·질문·중단 실패·메모리 상한·유실·출력 미저장, 새/이전 버전 브리지 종료 및 무관한 프로세스 유지.
- 모의 Codex와 실제 브리지의 두 언어 UI 테스트 통과. 좁은 화면의 답변 버튼, 재접속, 언어 변경 시 입력 유지, 악성 HTML 비실행, 코드 복사도 확인했다.
- 설치된 Codex의 실제 PTY 및 App Server 대화 초기화·UI 재접속·종료를 `--probe-codex`로 확인했다. 실제 모델 응답·도구 실행·모델이 보낸 승인 요청은 미검증이다.
- 앱/브리지 버전 0.2.0, APK versionCode 3. 빌드·v2/v3 서명·내장 소스 체크섬 검증 통과. 파일: `dist/bibimer-debug.apk`, `dist/bibimer-setup.sh`, 다운로드 폴더의 `Bibimer-0.2.0.apk` 및 `bibimer-setup-0.2.0.sh`.
- 새 기능 구현 직후에는 앱 0.1.0과 실행 중인 브리지 0.1.0을 유지했다. 이후 업데이트 상태는 아래에 기록한다.

## 브리지 업데이트 (2026-09-14)

- 사용자 요청으로 브리지 0.2.0을 `~/.local/share/bibimer/bibimer_bridge.py`에 설치하고 `~/.local/bin/bibimer-bridge` 실행 파일을 만들었다. 두 파일은 권한 `0700`으로 원자적으로 설치했으며, 배포 설정 파일의 내장 소스·SHA-256과 저장소 소스가 일치함을 확인했다.
- 설치한 실행 파일의 `status` 명령으로 기존 브리지 연결을 확인했다. 인증 토큰과 프로젝트 설정은 변경하지 않았다.
- `pm list packages --show-versioncode --user 0 app.bibimer` 결과, 사용자가 앱 0.2.0(versionCode 3) 설치를 완료했다. 실제 앱 화면 동작 검증과는 구분한다.
- Formatted 비활성화의 원인은 실행 중인 브리지가 0.1.0이라 에이전트의 `modes`를 전달하지 않기 때문이었다. 후속 확인에서 기존 Codex 세션이 `exited` 상태인 것을 확인한 뒤 브리지 0.2.0으로 재시작·적용을 완료했다. 실행 중인 세션을 강제 종료하지 않았다.
- 실제 `127.0.0.1:8765/v1/health`에서 버전 0.2.0, Codex 설치 및 `modes: ["terminal", "chat"]`를 확인했다. 재시작 전후 인증 토큰과 프로젝트 설정이 동일하고, 설치 소스가 저장소 소스와 일치함을 검증했다.
- 앱에서 **Reconnect(다시 연결)** 후 프로그램을 **Codex**로 선택하면 **Chat · formatted text**를 선택할 수 있다. 셸·Claude는 현재 PTY만 지원한다. 실제 Android 화면에서 선택·대화 실행 확인은 아래의 남은 검증에 포함한다.

## 앞선 완료 내용

- 프로젝트 디렉터리를 `bibimer`로 변경하고 기존 Git 저장소를 유지.
- README.md에 제품 개념과 초기 범위 작성.
- AGENTS.md 및 docs/bootstrap.md에 작업 지침과 검증 계획 작성.
- 문서의 프로젝트 이름·작업 경로 및 브랜드 설명을 Bibimer 기준으로 갱신.
- README.md, AGENTS.md, docs/bootstrap.md와 이 문서에 Android 앱 제공 및 같은 폰에서 직접 개발하는 요구사항과 검증 기준을 반영.
- `bridge/bibimer_bridge.py`: 루프백 인증, 8자리 일회용 코드 연결, 프로젝트 경로 검증·생성, 셸/Codex/Claude 탐지·실행, PTY 입출력·크기 변경, 출력 재생·재접속, 명시적 종료 및 실제 반환값 표시.
- `android/app/src/main/`: Android 앱, 영어 기본·한국어 준비 가이드·프로젝트·터미널 화면, 특수 키·한글 입력창, 연결/실행 상태 분리, Android Keystore 토큰 보관, 설치 파일 내보내기.
- `scripts/build_apk.py`: API 36 플랫폼·xterm 배포본 체크섬 검증, Termux AAPT2/javac/D8/APK 서명, 자체 포함 `bibimer-setup.sh` 생성.
- `bridge/tests/test_bridge.py`, `scripts/smoke_ui.cjs`: 실제 PTY·HTTP 및 화면 연결 검증.
- `docs/setup.md`, `docs/development.md`, `docs/architecture.md`: 설치 안내, 빌드·검증 결과, 공식 문서 근거, API·제약 기록.
- 0.1.1: `i18n.js`의 화면·상태·오류 번역, Setup 언어 선택, `AppLanguage`의 별도 Android 환경 설정 저장 및 네이티브 문구 리소스. 언어 전환 시 세션과 입력을 유지한다.
- 브리지 오류에 안정적인 `code`와 영어 기본 문구를 추가했다. 새 앱은 코드가 없는 0.1.0 브리지 오류도 번역하며 기존 실행을 재시작할 필요가 없다. CLI·설정 스크립트는 영어 기본, `BIBIMER_LANGUAGE=ko` 또는 CLI의 `--language ko`로 한국어 안내를 선택한다.
- GitHub 비공개 저장소 `andy5090/bibimer` 생성 및 로컬 `origin` 연결. README.md에 저장소 링크 추가.

## 이전 버전 검증 기록과 남은 제약

2026-09-13 현재 기기: Android 16 / API 36 / arm64, Termux 0.118.3 F-Droid, Python 3.14.6, OpenJDK 21.

- 0.1.1(versionCode 2) APK 빌드와 v2/v3 서명 검증 통과. 결과: `dist/bibimer-debug.apk`와 `dist/bibimer-setup.sh`. 현재 폰에서 찾을 설치 파일: `/storage/emulated/0/Download/Bibimer-0.1.1.apk`.
- 실제 Termux PTY·HTTP 통합 테스트 17개 통과: 인증, 연결 코드 만료·시도 제한, 경로 검증, 중복 방지, 한글 입출력, 재접속, resize, Ctrl+C, 종료 코드, 전경·배경 작업 중지 및 무관한 프로세스 유지, 유실 상태, 출력 미저장, CLI 영어 기본·한국어 선택.
- 현재 기기의 Chromium에서 영어 기본(한국어 로캘)·한국어 전환·오류 번역·기존 브리지 응답 호환·언어 변경 시 실행 세션 및 작성 중인 입력 유지·코드 연결·프로젝트 생성·입출력·재접속·명시적 종료 검증. Android 네이티브 연결과 설정 저장은 테스트 어댑터로 대체했으므로 APK 실기기 검증과 구분한다.
- 393×780 및 360×460 화면에서 등록·전송 버튼 확인. 주기적 상태 갱신이 작성 중인 프로젝트 경로를 지우던 문제 수정.
- 현재 설치된 `@mmmbuto/codex-cli-termux` 0.153.3을 PTY에서 실행하고, xterm 화면 연결·같은 세션 재접속·명시적 종료까지 확인. 실제 모델 요청·코드 변경은 수행하지 않았다. Claude Code 실행 검증은 하지 않았다.
- APK에 포함된 설정 파일과 별도 설정 파일이 동일하며, 설정 파일이 담은 브리지 소스가 현재 소스와 일치함을 확인. 설정 스크립트 셸 문법 검사 및 터미널 의존성 라이선스 포함 여부 확인.
- `pm list packages --show-versioncode --user 0 app.bibimer`로 기존 0.1.0(versionCode 1) 설치 확인. 0.1.1은 같은 개발용 키로 서명한 업데이트 파일이며 실제 업데이트 설치·실행은 남아 있다.
- 사용자 요청으로 기존 브리지 시작 명령을 실행했다. 언어 추가 작업 중에는 실행 중인 브리지·사용자 세션을 재시작하거나 종료하지 않았다. 테스트는 별도 임시 폴더·포트를 사용한다.

남은 검증: 실제 모델 대화·도구 및 승인 요청, 실제 Android WebView·Keystore·언어 저장·네이티브 안내·Termux 로컬 연결, 앱 닫기·재실행·화면 잠금, OS에 의한 브리지 종료, Termux·Python·에이전트가 없는 새 사용자의 전체 설정, 에이전트 로그인·모델 작업. 첫 마일스톤은 아직 완료로 표시하지 않는다.

제약: 프로젝트 하나·살아 있는 세션 하나, 고정 포트 8765, 수동 브리지 시작, PTY 최근 1MiB·Chat 최대 1MiB/200항목 메모리 보관, 브리지 재시작 후 실행 중 메타데이터를 `lost`로 표시. 별도 POSIX 세션으로 분리한 데몬은 추적하지 않는다. 앱의 토큰 초기화는 Termux 세션 종료를 의미하지 않는다.

## 다음 작업

1. 앱과 브리지 0.2.0 업데이트·브리지 재시작까지 완료했다. 앱에서 **Reconnect → Codex → Chat · formatted text → Start session**으로 대화를 시작한다.
2. 기존 인증 토큰을 유지하므로 새 연결 코드가 필요한 경우에만 Termux에서 `~/.local/bin/bibimer-bridge pair`를 실행한다. 코드나 토큰은 저장소·일반 로그에 남기지 않는다.
3. 실제 APK에서 Chat·PTY 선택, 영어·한국어, 모델 응답·코드 서식·승인·질문·응답 중단·재접속을 검증한다. 브리지/대화 기록은 메모리만 유지하며 프로세스 종료 후 복원되지 않는다.
4. Termux가 없는 기기에서 설치 안내 → 설정 파일 저장 → Python·브리지 설치 → 앱 연결을 별도로 검증한다.

빌드 및 테스트 명령은 `docs/development.md`를 따른다. 변경 내용은 `main`에서 커밋하고 `origin/main`과 동기화한다. 빌드 결과·도구 캐시·로컬 서명 키는 Git에서 제외되어 있다.
