# Bibimer iOS 앱

Android 앱과 같은 프로젝트·워크트리·세션·Chat·PTY 터미널 UI를 iOS `WKWebView`에서 사용한다. 명령과 에이전트는 **앱에 내장한 ARM64 Linux 해석기** 안에서 실행한다. 별도 Termux 앱이나 SSH 개발 서버는 필요하지 않다.

## 구성

- `Sources/main.m`: UIKit 앱, 영속 Linux rootfs, 번들 브리지 설치, 시스템 DNS, 인증된 loopback HTTP 연결, WKWebView 호스트와 파일 공유.
- `Resources/native.js`: 기존 UI의 동기 `Bibimer` 인터페이스를 iOS 메시지 브리지로 연결한다. 연결 토큰은 JavaScript 환경·요청 본문·로그에 노출하지 않는다.
- `Resources/platform.js`: iOS 설치 안내, 네 가지 CLI의 설치·버전·로그인 작업, iOS의 실행 제약을 표시한다.
- `Resources/ui-hooks.js`: 공유 UI 내부의 세션 탐색과 iOS 설치 작업을 연결한다.
- `build.py`: 기존 Android assets를 빌드 산출물에 복사해 iOS 코드만 적용한다. 원본 Android assets는 수정하지 않는다.
- 고정 런타임의 `wasm-polyfill.js`를 게스트에 포함해 jitless Node의 HTTP 파서 경로를 연결한다. 일반적인 WASM 실행 지원을 의미하지 않으며 `fetch-polyfill.js`는 포함하지 않는다.
- OpenCode의 고정 ARM64-musl 1.19.3 payload에는 검증한 출력 수집 호환 패처를 별도 복사본에 적용한다. npm 원본은 유지하고 실제 버전 검사를 통과한 뒤 게시한다. `opencode_compat.py`·공식 MIT notice는 필수 자산이며 CJS preload는 포함하지 않는다.
- `run_simulator.py`와 `Resources/smoke.js`: 전용 시뮬레이터에 앱을 설치하고 실제 DOM 이벤트·native HTTP·게스트 파일/PTY를 통해 UI 동작을 검사한다. 에이전트 계정·모델 호출은 사용하지 않는다.

게스트 브리지·설치·Gemini ACP 구현은 [ios/bridge](../bridge/README.md), 고정 런타임과 라이선스는 [runtime-lab](../runtime-lab/README.md)을 따른다.

## 빌드와 실행

저장소 루트에서 Apple Silicon Mac과 Xcode 환경을 사용한다. 도구 준비 조건은 runtime-lab README와 같다.

```sh
python3 ios/app/build.py
python3 ios/app/run_simulator.py --timeout 900
```

네 가지 CLI를 이 앱의 별도 rootfs에 실제로 설치하고 Setup의 버전 확인까지 검사하려면 다음을 실행한다. 네트워크 다운로드와 해석기 실행 때문에 수 분 이상 걸릴 수 있으며 로그인·모델 요청은 하지 않는다.

```sh
python3 ios/app/run_simulator.py --agents --timeout 4000
```

이미 검증해 빌드한 엔진을 재사용할 때:

```sh
python3 ios/app/build.py --skip-runtime-build
```

산출물은 `.tools/ios-app/iphonesimulator/Bibimer.app`, bundle ID는 `app.bibimer.ios`다. 기존 실험 앱 `app.bibimer.runtime-lab`과 별도 sandbox를 사용한다. `run_simulator.py`는 `.tools/ios-runtime/simulator-id.txt`에 기록된 `Bibimer Runtime Lab` 시뮬레이터만 사용하고 해당 Bibimer iOS 앱만 종료·재실행한다.

일반 실행:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl launch --terminate-running-process <전용-시뮬레이터-ID> app.bibimer.ios
```

첫 실행에는 공식 Alpine HTTPS 저장소에서 Python·Git·Node.js 등 기본 개발 도구를 설치하므로 인터넷과 저장 공간이 필요하다. 이후 파일은 `Library/Application Support/linux-rootfs`에 유지된다. Setup의 각 CLI 설치 버튼은 고정된 설치 작업을 실제 PTY 세션으로 연다. 인증은 사용자가 앱 터미널의 CLI 안내와 브라우저에서 직접 수행한다. 설치나 버전 확인만으로 인증·모델 접근이 확인됐다고 표시하지 않는다.

해석기에서 CLI를 처음 시작할 때 수십 초가 걸릴 수 있다. 모델·명령·저장 이력의 native HTTP 요청 제한은 150초다. Codex·OpenCode·Gemini의 읽기 전용 조회는 초기화와 페이지 조회를 합해 125초 안에 끝나야 하며, Codex Chat 시작 대기는 135초다. 일반 연결 확인·입력·이벤트 조회의 제한 시간을 함께 늘리지는 않는다.

터미널 세션은 화면에 직접 입력하며 하단의 Chat 입력창은 숨긴다(Android 공유 UI에도 적용). 특수 키·에이전트 선택은 유지한다. 터미널 상단의 ‘텍스트 선택’은 현재 출력의 사본을 읽기 전용 선택 창으로 열어 일부 또는 전체를 복사한다. ‘붙여넣기’는 명시적으로 누를 때만 클립보드를 읽어 별도의 편집 가능한 검토 창을 연다. ‘터미널로 전송’을 눌러야 명령을 전송하며 줄바꿈·Enter가 실제 터미널에서 실행된다. 클립보드를 읽거나 미리보기만 열어서는 전송하지 않는다. 세션·프로젝트·탭이 바뀌면 검토 창을 비우고 닫으며, 숨긴 Chat 초안·커서는 유지한다. 읽는 동안 세션·프로젝트·초안·커서가 바뀌면 붙이지 않고 다시 시도하도록 안내한다. iOS의 붙여넣기 접근 허용 절차를 따른다.

기기용 빌드:

```sh
python3 ios/app/build.py --sdk iphoneos
```

기기용 산출물은 서명·프로비저닝되지 않았다. 실제 iPhone 설치에는 별도 개발자 서명이 필요하다.

TestFlight용 Xcode 아카이브와 서명·IPA export 경로는 [TestFlight 배포 준비](TESTFLIGHT.md)를 따른다. 아카이브 생성과 App Store Connect 업로드·테스터 제공 여부는 구분한다.

## 실행 경계

- HTTP 서버는 `127.0.0.1`의 앱 실행마다 고른 포트에만 바인딩한다. 256비트 임의 토큰을 native 메모리와 private guest 상태에 보관하며 게스트 브리지는 에이전트 자식 환경에서 제거한다. 앱의 HTTP 프록시는 고정 loopback 주소와 `/v1/` 경로만 사용한다.
- WebView는 번들 UI만 로드하고 외부 탐색을 제한한다. 웹 CSP의 직접 네트워크 연결 금지를 유지한다. 외부 링크는 사용자가 연 경우 시스템 브라우저로 전달한다. Safari 검사 기능은 Simulator 빌드에만 켠다.
- 파일 열기는 게스트 브리지의 경로 범위·파일 변경 확인과 최대 64MiB 제한을 유지한다. 검증한 청크를 보호된 임시 파일로 옮겨 iOS 공유 화면을 제공하고 공유를 마치면 삭제한다. 게스트 전체 파일 시스템을 WebView에 노출하지 않는다.
- 앱 화면 전환은 실행 중 세션을 종료하지 않는다. iOS는 백그라운드 앱을 정지하거나 종료할 수 있다. 이 빌드는 백그라운드 완료 알림과 장시간 실행을 보장하지 않는다. 앱 프로세스가 종료된 뒤 저장된 프로젝트·대화 목록은 유지하되 실행 프로세스를 복원했다고 표시하지 않는다.
- CLI와 모델별 호환성은 실제 실행 검사 결과를 따른다. Gemini는 native ACP 이벤트를 사용하며 저장 이력·Steer는 지원한다고 표시하지 않는다. Docker·모든 Linux 패키지·임의 native addon 호환성을 보장하지 않는다.
- Codex Chat의 `iOS 앱 샌드박스`는 사용자가 직접 선택할 때만 사용한다. 앱의 Linux 환경 전체 파일·네트워크에 접근하며 프로젝트 폴더별 격리는 제공하지 않는다. 기존 `inherit`·읽기 전용·작업 폴더 쓰기 설정을 자동 변경하지 않는다. Linux namespace가 필요한 읽기 전용·작업 폴더 쓰기와 Terminal의 앱 샌드박스 선택은 새 실행을 막고 지원하는 선택을 직접 지정하도록 안내한다.
- 공개 배포·App Store 심사·실기기 실행 검증을 완료한 상태는 아니다.

## 검증 증거

`dist/ios-app/smoke/`에 최종 UI 검사 JSON, 화면, 실제 바이너리 해시, 리소스/런타임 manifest와 host console을 모은다. 네 CLI의 실제 Setup 검사는 `dist/ios-app/agents/`에 별도로 모은다. `--self-test`·`--agent-self-test`에서만 테스트용 상태 조회와 결과 저장 기능을 사용하며 일반 실행에서는 사용자 대화·터미널 출력을 증거 파일에 기록하지 않는다. 재실행 전에 이전 결과를 `dist/ios-app/history/`에 보존한다. 필수 검사 실패·JavaScript 오류·시간 초과·V8 및 native crash 진단을 성공으로 처리하지 않는다. 허용한 런타임 경고가 있으면 성공 검사도 `PASS_WITH_WARNINGS`로 구분한다.

구체적인 검증 결과는 [앱 검증 기록](VALIDATION.md), 루트 `NEXT_SESSION.md`와 런타임 검증 기록을 함께 확인한다.
