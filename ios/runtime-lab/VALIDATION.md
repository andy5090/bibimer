# iOS 실행 환경 검증 기록

## 2026-10-20 앱 통합 후 추가 검사 (진행 중)

이 절은 아래 초기25개 검사와 다른 후속 빌드의 기록이다. OpenCode 버전·Node/WASM 초기 증거를 제외한 핵심 회귀는 승인 patch `16ed4d36061fb35ff5c898336ebfc23575aa9607bc4ba3054b20f8a74abd09bc`에서 다시 실행했다. 최종 앱 검사는 `../app/VALIDATION.md`를 함께 본다. 원본 에이전트 CLI를 내장 Linux에서 실행하며, 모델 응답만 같은 게스트의 합성 HTTP 서버가 제공한다. 실제 계정 인증·실제 모델 응답·실기기 성능을 증명하지 않는다.

| 검사 | 실제 결과 | 증거 경로 (`dist/ios-runtime-lab/`) |
| --- | --- | --- |
| 부모 사망 신호·스레드 공유 pending | trace 없는 게스트5회 성공 | `kernel-repeats/1`…`5` |
| controlling-terminal·echo·poll | 3회 반복 성공, 최종 엔진2.48초 | `bridge-pty` |
| compute-only ARM64 중단·죽은 leader·그룹 분리 | 총21개 게스트 작업, 최종 엔진1.40초·경고0 | `compute-signal` |
| epoll 복제FD·개별 mask/data·닫기/재사용·ONESHOT·경합 | 성공1.03초, 경고0 | `epoll-runtime` |
| Node22 HTTP·fetch | 성공5.59초, 경고0 | `node-network` |
| 진짜 guest WASM + HTTP·fetch + Gemini 원본 버전 | 성공44.79초, 경고0 | `node-wasm` |
| signal SA_ONSTACK·정상/대체 스택·중첩·SS_DISABLE | 실제 ARM64 핸들러 SP6개 경우 성공0.73초·경고0, patchff19b3b1 | `signal-stack` |
| 동시 lazy-page·COW·SIGUSR1 |8개 경우/각1024페이지 및 부모 격리 성공1.35초·경고0, patch16ed4d36 | `memory-fault` |
| ARM64 FP 즉시값·변환 | 명령1920개 성공1.16초·경고0 | `arm64-fp` |
| 원본 Node22·Bun1.3.10/1.3.14 수학 | 각18개 검사 성공2.42초·경고0 | `bun-math` |
| 원본 Bun1.3.14 자식 프로세스 | interpreter/baseline JIT 각6개, sync/async·종료 후 읽기·lazy stream 병합·실제 Bash 읽기/쓰기 성공9.77초·경고0 | `bun-process` |
| OpenCode1.19.3 원본 버전 | 성공16.77초, 경고0 | `opencode-version` |
| Codex0.163.0 app-server + 셸 읽기/쓰기 + 완료/종료0 | patch ff19에서 성공6.01초, connect errno65 2건 경고 | `codex-external` |
| Claude2.1.112 + SDK0.2.112 + 원본 provider + 일회 승인 + 읽기/쓰기 + 완료/종료0 | 초기 설치 포함109.20초 성공. patch ff19에서49.43초·connect errno65 25건 경고 | `claude-sdk` |
| Gemini0.64.0 ACP + native 권한 정책 | 승인과 거절 두 경우 patch ff19에서63.99초 성공. 승인 후 실제 읽기/쓰기, 거절 후 파일 미생성·native 거절 결과·end_turn·종료0 확인. connect errno65 17건 경고 | `gemini-acp` |
| OpenCode1.19.3 + 고정 ShellTool 출력 수집 호환 패치 | 성공259.12초(설치·패치 포함), 원본 provider218.16초. 원본 glob/grep·명시적 승인3회·Bash 실제 읽기/쓰기·출력 전달·native 완료·종료0. connect errno65 13건 경고 | `opencode-compat-search` |
| OpenCode 출력 수집의 종료 예외 | 네 경우 성공261.85초: stdout/stderr+exit7, 큰 출력131076바이트 전체 파일, native timeout, 사용자 interrupt. timeout/abort 후 소유 PID 종료·후속 명령 미실행. connect errno65 4건 경고 | `opencode-shell-edges` |

수정하지 않은 OpenCode1.19.3은 patch ff19에서 원본 glob/grep 결과와 Bash의 정확한 파일 생성·종료0까지 확인했지만, 구조화된 Bash 결과가 `(no output)`이어서 도구 왕복 검사는 실패했다. 실험용 stdio 보존 모듈은 일반 Bun 모드에서 지연 구독·종료 후 읽기까지 성공했으나, 원본 compiled ELF는 `BUN_OPTIONS --preload`를 무시했다. 별도 `BUN_INSPECT_PRELOAD`는 실제 main 이전 로드에 성공했지만 Bash 결과는 여전히 실패했다. trace에서 실제 Bash stdout31바이트가 보존 버퍼에 남고 소비자 read 반환은0인 상태로 child close가 발생함을 확인했다. 이 실험 모듈은 제품에 적용하지 않는다.

실제 v1 경로인 `ShellTool.run`의 출력 fiber를 즉시 시작하고, 정상 exit contender 안에서 수집 완료를 기다리도록 수정한 별도 실행 파일은 위 도구 왕복·종료 예외 검사를 통과했다. abort·timeout과 경쟁을 유지하며 출력 오류도 숨기지 않도록 `raceAllFirst`를 사용한다. 원본 ELF SHA256·크기·유일한2310바이트 영역을 확인하고 동일 길이로 수정하므로 다른 모듈과 파일 offset은 유지한다. 원본 SHA는 `37c7de554c2ba7bf456e4fe6faf7705141b0ccb3a7b1dd6e1046d52cd8269ecd`, 검증한 패치 SHA는 `04023b8024bdab3cde5c84ca509c7a9ec9492b7a308175740449fd62e6e438d6`이다. 임의 버전에는 적용하지 않는다. 제품 설치는 별도 임시 복사본의 실제 버전 실행 성공 뒤에만 stable 실행 파일과 wrapper를 게시한다. 최종 앱 설치 검사는 `../app/VALIDATION.md`를 따른다.

HTTP 파서는 llhttp ABI만 구현한다. 임의 WASM 모듈을 성공한 것처럼 대체하지 않는다. 응답 조각·chunked SSE·본문 스트리밍·오류/중단 등 host17개 검사와 별도4개 회귀를 사용한다. HTTP OWS는 SP/HTAB만 허용하며 NBSP가 들어간 Content-Length를 거절한다. Gemini는 이 대체 파서를 쓰지 않고 JavaScript Ignition + 진짜 V8 Liftoff WASM의 guest ARM64 코드를 외부 해석기로 실행한다.

Codex의 `externalSandbox`는 **명시적으로 선택한 Chat 턴 정책**이다. thread의 `sandbox_mode="external-sandbox"`는 지원하지 않는다. 실제 turn의 `sandboxPolicy`에 전달했다. 앱 전체 Linux 파일/네트워크 접근이며 프로젝트별 Linux namespace 격리를 제공하지 않는다. 기존 read-only/workspace-write 선택을 자동으로 바꾸지 않는다.

최신 Claude2.1.303 Bun판의 실제 실행 실패, OpenCode의 초기 epoll 오류와 느린 JSC interpreter 작업/종료 시간 초과는 `failures/`와 각 실행 기록에 보존했다. 버전 확인과 모델 도구 왕복 성공을 구분한다. 진행 중 새 설정의 재검사 결과가 생기면 이 표를 갱신한다.


## 초기 실험 기록 (과거 빌드)

이하25개 검사는 초기 실험 당시의 범위와 제약이다. 현재 앱 통합 상태와 후속 CLI 도구 검사는 위 절을 따른다.


검증일: 2026-10-20 (Asia/Seoul)

**독립 iOS 앱에 Linux 실행 환경을 내장하고 일반 CLI 및 원본 Codex·Claude Code를 설치·시작하는 경로를 Simulator에서 확인했다.** 실제 iPhone 실행이나 인증 후 에이전트 작업을 완료한 결과는 아니다.

## 환경과 범위

- Apple Silicon Mac, Xcode 27.1 (`27A9275`).
- 전용 `Bibimer Runtime Lab` 시뮬레이터: iPhone 17 Pro / iOS 26.5 / ARM64.
- 이 Mac의 Xcode 경로에는 `Simulator.app` GUI가 없어 `simctl`로 설치·실행·스크린샷을 수집했다. GUI 창을 열었다고 간주하지 않는다.
- iOS Simulator 27.1 SDK로 컴파일, deployment target iOS 16.0. 최소 지원 버전 자체의 동작은 시험하지 않았다.
- 기기용 iPhoneOS 27.1 SDK의 ARM64 컴파일·링크도 성공. 개발자 서명·실제 설치는 수행하지 않았다. `devicectl list devices`에서 실제 기기는 연결되어 있지 않았다.
- ios-linuxkit commit 및 적용 패치는 [README](README.md) 참고. runtime 소스는 고정 commit에 승인된 diff만 있는 상태를 확인한다.
- 명령은 iOS 앱 프로세스에 링크한 해석기 안의 Linux guest에서 실행했다. Mac 셸이나 SSH 서버로 위임하지 않았다. iPhoneOS 바이너리의 undefined symbols에서도 host `fork`/`execve`/`posix_spawn` 참조는 발견하지 않았다.

## 실제 실행 결과

| 검사 단계 | 결과 | 시간 | 확인한 내용 |
|---|---|---:|---|
| basic | **8/8 PASS** | 1.245초 | ARM64, 파일 읽기/쓰기, 파이프, 자식 종료 코드, 병렬 자식, proc/dev, 영속 파일 기록 |
| persistence | **1/1 PASS** | 0.070초 | 앱 종료·재실행·재설치 후 같은 sandbox의 파일 유지 |
| shutdown | **1/1 PASS** | 1.244초 | sleep 중인 자식과 TERM 무시 자식을 남긴 init 종료, guest 정리와 UIKit 생존 |
| packages | **10/10 PASS_WITH_WARNINGS** | 9.234초 | apk, Git commit/worktree, HTTPS, jq, Python subprocess/PTY/signals, Node streaming subprocess, SQLite, FFmpeg |
| agents | **5/5 PASS_WITH_WARNINGS** | 166.049초 | Node/npm, Codex 설치/버전, Claude Code 설치/버전 |

총 **25개 기능 검사**를 완료했다. `python_signals` 한 항목 안에서는 즉시 TERM·준비 확인 후 TERM·준비 확인 후 KILL을 각각 3회 검사한다. 프로세스 종료 코드를 실제 신호에 맞는 음수 값으로 확인했다. PTY 검사는 빠르게 종료한 자식의 마지막 출력과 종료 코드 7을 함께 검증한다.

시간은 Mac에서 실행한 Simulator 측정값이다. 실제 휴대폰 속도·발열·배터리·메모리 한도를 추정하는 벤치마크로 사용하지 않는다. packages 최종 실행은 이미 설치된 패키지를 재검증한 시간이다. 앞선 빈 rootfs에서 공식 HTTPS apk 설치도 성공했지만 당시 전체 probe는 발견된 PTY 결함 때문에 실패했다. 해당 결함 수정 뒤 위 결과를 얻었다.

확인한 도구 예:

- Node.js `22.23.2`, npm `10.9.1`, Python `3.12.15`, Git `2.47.3`, jq `1.7.1`, SQLite `3.48.0`.
- `codex-cli 0.163.0`: npm의 Linux ARM64 패키지를 guest에 설치하고 원본 실행 파일 시작 성공.
- `2.1.303 (Claude Code)`: guest npm 설치 후 원본 CLI 버전 실행 성공.
- FFmpeg로 짧은 음원 파일을 생성하고 FFprobe로 `pcm_s16le` 확인.

에이전트 계정·API 키를 읽거나 복사하지 않았고, 모델 호출·과금·사용자 프로젝트 코딩은 수행하지 않았다. `--version` 성공은 로그인, structured app-server/SDK 이벤트, 실제 도구 호출과 작업 완료를 보장하지 않는다. OpenCode는 이번 범위에 포함하지 않았다.

## 발견하고 수정한 결함

1. **내장 앱 종료:** upstream은 init 종료 후 `_exit(0)`을 호출하고, 남은 guest 자식을 host SIGTERM으로 종료하려 했다. 내장용 경로는 guest TERM/KILL을 사용하며 `pids_lock`을 풀어 자식의 종료를 허용한다. 종료가 불완전하면 mount를 유지하고 실패 표식을 남긴다.
2. **PTY 마지막 출력 유실:** slave hangup을 먼저 처리해 master에 쌓인 출력이 읽히지 않았다. buffered output을 먼저 읽도록 수정했고 같은 실패 검사에서 PASS를 확인했다.
3. **잠든 자식 중단 실패:** guest pthread가 GCD의 host SIGUSR1 차단을 상속할 수 있었고, signal pending 확인과 host sleep 진입도 동기화되지 않았다. guest thread에서 SIGUSR1을 허용하고 `pselect`로 대기 경계를 동기화한 뒤 반복 신호 검사와 shutdown이 통과했다.
4. **증거 혼합 방지:** 재실행 시 이전 완료/타임아웃/screenshot을 제거한다. 실제 init 종료와 출력 EOF가 모두 확인된 뒤에만 native 완료 JSON을 쓴다. 프로세스 소실·시간 초과·필수 결과 누락은 실패다.

변경은 `patches/embedded-runtime.patch`로 보관하며 원본 전체를 별도로 vendoring하지 않는다. 현재 patch 외 외부 런타임 수정이 있으면 빌더가 거절한다.

## 남은 진단과 제약

- packages host console에 **연결 errno 65 진단 3건**과 FFmpeg·FFprobe의 **미지원 syscall 236 각 1건**이 있다. agents에는 연결 errno 65 진단 **24건**이 있다. 모든 필수 기능은 성공했으므로 결과는 깨끗한 PASS가 아닌 `PASS_WITH_WARNINGS`다.
- Darwin errno 65는 `EHOSTUNREACH`다. 클라이언트가 연결 실패 후 다른 시도로 성공한 상태다. 동일 Mac에서 IPv6 curl 연결도 실패했으므로 주소 선택/라우팅과 관련됐을 가능성이 있으나, guest 진단에 목적지 주소가 없어 IPv6로 원인을 확정하지 않는다.
- syscall 236은 `get_mempolicy`이며 해당 FFmpeg 작업에서는 기능 완료에 영향을 주지 않았다. 일반적인 NUMA 기능 지원으로 해석하지 않는다.
- 검증기는 위 형태와 정확히 일치하는 errno 65 연결 진단만 packages/agents 전체 성공 이후 경고로 분류한다. 다른 NETDIAG, SAFETY-VALVE, assertion, crash, 불완전 shutdown 진단은 계속 실패다.
- upstream이 Node 실행에 `--jitless` 등을 추가한다. WASM을 포함한 임의 npm 패키지나 모든 native addon의 호환성을 보장하지 않는다.
- 실기기의 sandbox·메모리 압박·발열·배터리·백그라운드·화면 잠금·OS 종료를 시험하지 않았다. guest의 모든 대기/신호 경쟁과 crash 복구를 해결한 것도 아니다. 절대 CLOCK_REALTIME sleep 중 시스템 시각 변경은 현재 런타임이 추적하지 않는다.
- 화면은 파이프 기반 명령 실행기이며 ANSI/TUI 터미널, 프로젝트/워크트리/세션 UI, 인증·승인·구조화된 에이전트 대화, 장기 세션 복구는 후속 범위다.
- GPL 의무와 App Store 배포 형태는 별도 검토가 필요하다. 테스트 바이너리는 외부 배포하지 않았다.

## 개발 검증과 증거 위치

- 판정기 단위 검사 **24개 통과**. 누락·중복·잘린 출력·비정상 종료·경고 위장·오래된 결과와 오류 진단을 검사한다.
- Python 구문, shell 구문, 새 파일/patch whitespace 검사를 수행했다.
- 자체 `main.m`·`RuntimeSupport.c`의 Clang `--analyze -Wall -Wextra`: 진단 **0개**. upstream 컴파일에는 함수 포인터 변환·deprecated API 경고가 남아 있으며 전체 upstream을 warning-free로 수정하지 않았다.
- 시뮬레이터·기기용 빌드 성공. 독립 코드 검토에서 실험 범위 내 차단 결함 없음 확인.
- 원본 증거: `dist/ios-runtime-lab/{basic,persistence,shutdown,packages,agents}/`.
- 합산 판정: `dist/ios-runtime-lab/summary.json`.
- 실패 재현 기록: `dist/ios-runtime-lab/failures/`의 signal 수정 이전 packages/shutdown.
- 빌드·단위 검사·정적 분석 로그: `.tools/ios-runtime/`.

다음 단계는 실제 iPhone에서 서명·설치해 같은 기능 검사를 반복하고, 그 다음 계정 인증과 실제 에이전트 한 턴을 검증하는 것이다. 이 조건을 충족한 뒤 Bibimer 공통 UI와 세션 규약을 연결한다.
