# iOS 앱 검증 기록

검증 환경은 전용 `Bibimer Runtime Lab` 시뮬레이터의 iPhone 17 Pro / iOS 26.5 / ARM64다. 기기용 SDK는 iPhoneOS 27.1이며 실제 iPhone의 설치·실행 결과와 구분한다.

## 2026-10-21 입력창·Codex HTTPS 수정 반영

`build.py`의 iOS 전용 스타일에서 텍스트 input·textarea를16px로 지정했다. 공유 UI의 기본14px와 대화 전달 본문의12px 우선 규칙을 모두 덮어쓰며, Android 원본·체크박스·라디오·viewport의 사용자 확대 설정은 유지한다. Chromium320/393/852px에서 패키징한14개 입력 필드의 계산 글꼴이 모두16px임을 확인했다. `.tools/ios-input-focus/computed-style-verification.json`.

Codex 인증 서버의 TLS 전송 실패는 내장 ARM64 halfword lane 인덱스 해석 오류였다. 승인 런타임 patch `29dabdb385b105b31c58b5d2d1d5958a216028d2113448eaa8b185233b09c0c8`을 반영했다. 원본 Codex·provider assertion·CA/DNS·인증서 검증은 유지했고, 실제1440개 CPU 회귀와 원본 Codex의 다섯 HTTPS 대조 및 네 CLI 도구 회귀가 통과했다. 실제 계정 인증 완료·모델 응답은 별도 단계다. 자세한 전후 증거는 [런타임 검증 기록](../runtime-lab/VALIDATION.md)을 따른다.

이 조합으로 양 SDK 앱을 빌드하고, 실제 Simulator 앱의 **UI20 성공13.89초·JavaScript 오류0개·fatal0개**를 확인했다. 미지원 syscall 경고4개를 보존한 `PASS_WITH_WARNINGS`다. `dist/ios-app/smoke/`의 시작 전 설치 바이너리 SHA는 `cb17e923944a5a6e6931c11738ff5ff15680cc00569e673a8c3b1508e8c80a8b`이며 manifest의 런타임도29dab이다. 이전 ff19 증거는 runner가 history에 보존했다. 공유52자산·고정 OpenCode 패처/notice 일치와 CJS0개도 확인했다(`.tools/ios-input-focus/package-verification-29dabdb3.json`). 기존 앱 Python6검사·터미널링크5경우·권한/설정 회귀가 통과했다.

사용자가 앱 재실행을 명시 승인한 뒤 설치·검사를 진행했고, 마지막에는 self-test 인자·출력 수집 없이 일반 모드로 실행해 Connected 화면을 확인했다(PID48701, `.tools/ios-input-focus/normal-screen.png`). 재시작 전 실행 프로세스를 복원했다고 표시하지 않으며 사용자 파일·저장 목록·인증 파일은 유지한다. CUA의 native pipe가 연결되지 않아 실제 터치 포커스 전후 확대율·키보드 동작은 사용자의 직접 확인이 남아 있다.

아래 ff19·364a 빌드의 세부 기록은 당시 증거이며 새29 엔진의 재검증으로 취급하지 않는다.

## 공유 UI와 실제 게스트 연결

2026-10-20 최종 제품 조합에서 **20개 UI·실행 검사 성공, JavaScript 오류 0개, 12.82초**를 확인했다. 런타임은 `ff19b3b1`이며 아래 고정 OpenCode 호환 패처와 설치 스크립트를 포함한다. Bash의 미지원 syscall 진단을 포함해 runner 판정은 `PASS_WITH_WARNINGS`다. 테스트는 복제된 Android UI의 실제 DOM 이벤트 → WKScriptMessageHandler → 인증된 native HTTP → 앱 내부 Linux → 기존 브리지/PTY 경로를 사용했다.

- 실제 프로젝트 폴더 생성과 등록, Bash PTY 실행, 입력창 명령 전송과 출력, Git 초기화/커밋.
- 프로젝트·세션 사이드바, 이름 변경, 실행 중 세션 보관과 복원.
- 설정 페이지의 자체 선택 시트, 한국어 변경, Enter 동작 저장.
- 폴더 탐색, 파일 탐색기, native 청크 파일 전송과 iOS 공유 화면 표시.
- Git 워크트리 생성과 해당 경로의 새 PTY 세션, 사용자 확인을 거친 세션 종료.
- pairing 경로 별칭을 포함한 native API 경계, 파일 공유 중 중복 요청 거절과 기존 파일 보존, 종료 뒤 지연된 health 응답의 실패 상태 보존.
- 원래 실행 중 세션으로 돌아온 뒤 실제 PTY 출력 유지.

증거는 `dist/ios-app/smoke/`의 `ui-test.json`, `verification.json`, `screen.png`, `execution.json`, `build-manifest.json`, `host-console.txt`다. 설치된 앱의 manifest와 실행 파일 해시는 시작 전에 수집했다. 실제 시뮬레이터 화면에서 공유 BIBIMER UI·연결 상태·실행 중 Bash와 `BIBIMER_UI_PTY_OK`·`BIBIMER_GIT_OK` 출력을 확인했다.

host console에는 Bash의 미지원 `setfsuid`·`setfsgid` syscall 151·152 진단이 남았다. 기능 검사가 성공한 것과 해당 syscall의 일반적인 지원을 구분한다.

## 발견한 결함과 경계

처음 통합 실행에서 PTY 입력이 echo·poll 잠금에 걸리고 자식 Python의 PTY `fstat`도 대기했다. 실제 native stack을 `.tools/ios-app-stack.txt`에 수집해 런타임 담당에게 전달했다. `tty_echo` 잠금 수정 후 같은 앱의 실제 UI 입력/출력과 별도 controlling-terminal 회귀 검사가 성공했다. 런타임 패치는 `ios/runtime-lab/patches/embedded-runtime.patch`에서 관리한다.

초기 native 디렉터리 생성에서 Linux 음수 `_EEXIST` 비교를 잘못 처리한 문제, 자동 UI 검사가 비동기 선택 변경 직후 disabled 실행 버튼을 누른 문제, WebKit의 Promise 반환 값을 native 결과로 읽으려던 문제를 수정했다. 이 실패를 성공 증거로 사용하지 않는다.

후속으로 native IPC의 canonical index 경로, API route allowlist, pairing alias 거절과 HTTP redirect 거절을 보강했다. 파일 공유 상태는 실제 공유 화면이 닫힐 때까지 유지하며 완료 후 임시 파일·열린 스트림·소유 상태를 정리한다. 지연된 health/navigation 응답은 종료 상태를 덮어쓰지 못한다. 해당 회귀를 포함한 20개 검사를 승인 런타임 `ff19b3b11d76dfe4c9893b2b4b8d9ee99d6e6f68a6f2ca762aab0006836f3518`에서도 모두 성공했다.

## CLI·실기기·배포

첫 UI 검증 시 이 앱의 rootfs에는 네 에이전트 CLI를 설치하지 않았다. 이후 `364a851b` 런타임에서 별도 `--agent-self-test`가 실제 Setup 설치 버튼과 버전 버튼으로 이 앱의 rootfs에 네 CLI를 처음 설치·실행했다. **10개 검사 전부 성공, JavaScript 오류 0개, 406.61초**이며 각 설치·독립 버전 명령의 종료 코드가 0이었다.

| 에이전트 | 실제 버전 출력 |
| --- | --- |
| Codex | `codex-cli 0.163.0` |
| Claude Code | `2.1.112 (Claude Code)` |
| OpenCode | `1.19.3` |
| Gemini CLI | `0.64.0` |

마지막 health에서 네 CLI 모두 `installed=true`를 확인했다. `dist/ios-app/agents-364a851b/`에 이 초기 설치의 원본 결과·실제 화면·실행 바이너리 해시·리소스 manifest를 보존했다. host console의 `NETDIAG connect ... errno=65` 복구 경고를 포함해 결과는 `PASS_WITH_WARNINGS`다. 확장한 V8/native crash 패턴으로도 해당 console에 crash 진단이 없음을 확인했다. 이 결과는 인증이나 실제 코딩 성공을 뜻하지 않으며 OpenCode의 별도 도구 실행 호환성은 런타임 검증 기록을 따른다.

초기 설치의 실제 화면에서 완료 직후 agent 선택 목록에 이전 `install first` 문구가 남는 문제를 발견했다. 완료한 설치 세션에서 health의 agent 목록만 갱신하고 선택 세션·agent·mode·작성 중 입력을 유지하도록 수정했다. 중복 요청 억제·선택/초안 유지 회귀 검사는 성공했다.

패처 도입 전 `ff19b3b1` 앱에서도 캐시를 유지한 실제 Setup 설치·버전 10개가 213.40초로 성공했다. 각 설치 완료 뒤 UI가 보유한 agent catalog의 설치·사용 가능 상태까지 기다리는 조건을 추가했다. 실제 Gemini 화면에서 `install first`가 제거되고 Start session 버튼이 활성화된 것을 확인했다. 이 실행은 Alpine ripgrep 업그레이드 경로를 포함하며, JavaScript 오류 0개와 연결 `errno=65` 경고 61개를 보존했다. 이전 증거는 `dist/ios-app/{smoke,agents}-ff19-precompat/`에 구분해 남겼다.

최종 제품은 installer SHA-256 `1d3d755e986c3cb76b478fda8e574b51efe66f01272402380d2649fb0d7f46ce`와 고정 OpenCode ELF 호환 patcher `868ccf404c63aaf40d2e482f931a969ace799a32584ae7b2a0f05d07de8122b2`를 포함한다. 해당 조합으로 **실제 Setup10도 234.52초로 성공**했다. 네 CLI 설치·버전 종료 코드 0, 설치 완료 catalog 반영, JavaScript 오류 0개, crash·미허용 NETDIAG 0개를 확인했다. 연결 `errno=65` 경고 60개는 보존했다.

OpenCode 설치 출력 receipt의 고정 원본·수정 SHA와 크기, `alreadyPatched=false`를 필수 검사했다. 실제 앱 rootfs의 npm 원본 ELF SHA `37c7de554c2ba7bf456e4fe6faf7705141b0ccb3a7b1dd6e1046d52cd8269ecd`가 유지되고, 별도 게시된 `opencode-ios`의 SHA가 `04023b8024bdab3cde5c84ca509c7a9ec9492b7a308175740449fd62e6e438d6`이며 양쪽 모두 195014520바이트인 것도 읽기 전용으로 확인했다. wrapper는 해당 게시본을 실행하고 JSC JIT·자동 업데이트·미지원 파일 감시를 끄며 preload를 사용하지 않는다. 남은 staging 파일은 0개다. 이 증거는 `opencode-install-verification.json`에 저장했다.

최종 증거는 `dist/ios-app/smoke/`, `agents/` 및 별도 보존본 `{smoke,agents}-ff19-compat868ccf40/`다. 마지막 UI 검증 뒤 실제 Bash 세션 출력이 보이는 앱 화면을 유지했다. 두 검사에 사용한 설치 바이너리 SHA는 `1cb3c9394b4c4c2b9c0b7b3b464e617627d8eb16ad39c7a8a6f505b982e93c3b`로 같다.

실제 계정 인증·유료 모델 요청·사용자 프로젝트 코딩은 수행하지 않았다. 실제 iPhone의 성능·메모리 압박·백그라운드 실행·화면 잠금·iOS 종료를 검증하지 않았고 App Store 심사나 공개 배포도 하지 않았다.

## 소스 검증

자체 native 코드의 `-Wall -Wextra` 빌드와 Clang static analyzer에서 진단 0개를 확인했다. Python/JavaScript 구문 검사와 terminal sign-in URL의 줄바꿈·한국어 열 위치·비HTTP URI 거절 등 5개 동작 검사를 수행했다. 런타임/브리지 전체의 검증 기록과는 별도다.

Python 회귀 6개는 필수 patcher·notice 누락 거절, notice 보존·미등록 텍스트 제외, native crash 거절과 이전 실행 증거 보존을 검사한다. CJS preload 복사·필수 검사와 실험용 회귀는 제거했다.

Codex 권한 회귀 검사에서는 기존 `read-only`·`workspace-write`·`inherit` 선택을 유지하고, 명시적인 `app-sandbox`는 Chat에만 허용하며 Terminal·워크트리의 미지원 조합을 막는 동작을 확인했다. 앱 샌드박스의 전체 Linux 파일·네트워크 접근 및 프로젝트별 격리 부재 안내는 지원하는 10개 언어에 제공한다.

승인 패치 SHA-256 `ff19b3b11d76dfe4c9893b2b4b8d9ee99d6e6f68a6f2ca762aab0006836f3518`과 catalog 갱신 수정·고정 OpenCode patcher/notice·Alpine ripgrep bootstrap으로 양 SDK를 빌드·패키징했다. 두 Guest·manifest의 고정 installer/patcher 바이트가 일치하고 CJS 자산은 0개다. 의도적으로 iOS 연결 코드를 추가한 `index.html`·`app.js` 외 공유 Android 자산 52개가 원본과 같았다. 최종 빌드 해시는 `dist/ios-app/final-package-verification.json`에 기록했다. 시뮬레이터의 실제 설치 바이너리 해시와 manifest는 각각의 검사 시작 전에 수집했으며, unsigned 기기용 빌드 성공을 실제 iPhone 검증으로 해석하지 않는다.

```sh
node ios/app/tests/test_terminal_links.cjs
node ios/app/tests/test_permissions.cjs
python3 -m py_compile ios/app/build.py ios/app/run_simulator.py
python3 -m unittest discover -s ios/app/tests -p 'test_*.py'
```
