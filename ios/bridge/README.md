# iOS 게스트 브리지

앱에 내장한 Alpine Linux 안에서 기존 Bibimer 브리지와 에이전트 CLI를 실행한다. Android 브리지 원본은 변경하지 않는다. 이 디렉터리의 코드·검사는 iOS 연결 계층이며, 실제 에이전트 실행의 최종 검증 결과는 상위 iOS 앱 검증 기록을 따른다.

## 네이티브 앱 계약

- 기존 `bridge/{bibimer_bridge.py,provider_claude.mjs,provider_opencode.py}`를 게스트 `/opt/bibimer/bridge/`에 넣는다.
- 이 디렉터리의 `bootstrap.sh`, `install-agents.sh`, `opencode_compat.py`, `LICENSE.OPENCODE`, `run.py`, `provider_gemini.py`를 `/opt/bibimer/ios/`에 넣는다. `tests/`는 에이전트나 제품 리소스로 설치하지 않는다.
- 고정 ios-linuxkit 소스의 `app/RootfsPatch.bundle/files/lib/wasm-polyfill.js`를 `/opt/bibimer/runtime/wasm-polyfill.js`에 넣는다. bootstrap은 Node/npm 실행 전에 고정 경로 `/lib/wasm-polyfill.js`로 복사한다. 런타임이 이 파일을 jitless Node에 preload한다. `fetch-polyfill.js`는 복사하지 않는다.
- 네이티브가 게스트 초기 환경에 `HOME`, `BIBIMER_PORT`, 32바이트 난수의 소문자 hex `BIBIMER_TOKEN`을 제공하고 `/bin/sh /opt/bibimer/ios/bootstrap.sh`를 실행한다.
- `run.py`는 토큰을 환경에서 제거하고 `~/.local/state/bibimer/token.json`에 비공개 모드로 저장한다. 자식 에이전트 환경·일반 로그·JS 응답에 토큰을 전달하지 않는다.
- HTTP는 IPv4 loopback에만 바인딩한다. 네이티브는 `Authorization: Bearer …`를 붙여 요청한다. 원래 브리지와 동일하게 `Origin` 헤더가 있는 웹 요청은 거절한다.
- 기존 `/v1/health`, 프로젝트·워크트리·세션·입출력·Chat API를 그대로 사용한다. 상태 목록의 프로세스 복원 표시는 기존 브리지의 `lost` 규칙을 유지한다.

GitHub 연결 확인은 내장 Alpine 3.21의 `gh 2.63.0`도 지원한다. 이 버전은 `auth status --json`이 없어 해당 옵션 거절 시에만 기존 인증 상태 명령의 종료 코드와 `gh api user`의 구조화된 `login` 필드로 확인한다. 인증 상태의 일반 출력은 전달하거나 저장하지 않는다. 2026-10-27 실제 CLI와 iOS 적응 계층에서 계정·저장소 조회를 확인했으며, 수정된 TestFlight 빌드의 설치본 UI 검증은 남아 있다.

추가 엔드포인트:

```http
POST /v1/ios/agents
Content-Type: application/json
Authorization: Bearer <native-only-token>

{"agent":"codex","action":"install","project_id":"…","request_id":"<uuid>"}
```

`agent`: `codex`, `claude`, `opencode`, `gemini`. `action`: `install`, `login`, `version`. 임의 명령 문자열을 받지 않으며, 검증된 선택값을 고정 argv로 실행한다. 응답은 `{ "session": <기존 PTY 세션 snapshot> }`이다. 네이티브는 해당 세션을 선택하고 터미널을 표시한다. 같은 요청 ID 재시도는 같은 세션을 반환하며 다른 작업에 재사용하면 거절한다. 첫 프로젝트 등록 전 명시적으로 setup을 실행하면 `~/projects`를 등록한다.

설치와 로그인 출력은 해당 PTY 세션에서만 다룬다. 로그인은 각 CLI의 원래 인증 흐름을 연다. 브라우저 URL·코드·API 키 입력과 인증 성공 여부는 네이티브 앱 및 실제 CLI에서 확인해야 한다. 개발 Mac의 인증 파일은 복사하지 않는다.

## 도구 설치

기본 Python·Bash·Git·Node·npm·CA·ripgrep을 동일한 서명 검증 Alpine APK 채널에서 준비한 후 브리지를 시작한다. 기존 rootfs에 다른 도구가 설치되어 있어도 `rg`가 없으면 설치를 수행한다. CLI 설치는 사용자가 Setup의 설치 작업을 선택할 때 수행하므로 첫 화면을 모든 npm 설치 완료까지 막지 않는다. TLS·APK 서명·npm 레지스트리 검증을 끄지 않는다.

| 에이전트 | 고정 패키지 |
| --- | --- |
| Codex | `@openai/codex@0.163.0` |
| Claude Code | Node 진입점의 `@anthropic-ai/claude-code@2.1.112` |
| Claude Chat SDK | `@anthropic-ai/claude-agent-sdk@0.2.112` |
| OpenCode | `opencode-linux-arm64-musl@1.19.3`와 고정 iOS 출력 수집 호환 패치 |
| Gemini CLI | `@google/gemini-cli@0.64.0` |

CLI의 `--version`이 성공한 뒤 `~/.local/bin`에 래퍼를 게시한다. 버전 실행 성공과 인증된 모델 작업 성공은 구분한다. Claude는 원본 CLI·SDK의 고정 버전, 실행 경로, 파일 속성과 실제 버전 실행 결과를 비공개 설치 기록에 남긴다. 이후 상태 조회는 해당 기록과 현재 파일을 비교해 느린 버전 명령을 매번 실행하지 않는다. 파일이나 SDK가 바뀌면 설치 확인은 무효가 되며, 이 기록이 인증·모델 사용 가능 여부를 보증하지 않는다.

OpenCode는 Alpine용 musl ARM64 패키지를 직접 설치하고 postinstall을 실행하지 않는다. 래퍼는 `JSC_useJIT=0`, 고정 버전 유지를 위한 `OPENCODE_DISABLE_AUTOUPDATE=true`, `OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER=true`만 지정한다. 현재 ARM64 커널은 inotify 변경 이벤트를 생성하지 않으므로 외부 파일·Git 변경 자동 감시는 제공하지 않는다. FFF 검색·모델 목록 갱신·터미널 제목은 원본 설정을 유지한다. 원본 `glob`·`grep` 도구는 Ripgrep 서비스를 직접 사용하며 FFF의 파일 검색 경로와 구분한다. Alpine 시스템 `rg`를 제공해 원본의 PATH 우선 선택을 따르며, ARM64 GNU용 자동 다운로드가 Alpine에서도 동작한다고 간주하지 않는다. FFF 자체는 별도 검증 대상이다.

`opencode_compat.py`는 실제 v1 Bash 경로인 [ShellTool.run](https://github.com/anomalyco/opencode/blob/v1.19.3/packages/opencode/src/tool/shell.ts#L486)이 `forkScoped`로 시작한 출력 수집 fiber를 join하지 않고 scope를 종료하는 문제를 수정한다. 실제 trace에서 native pipe에 들어온 31 bytes가 공개 stream에 남아 있지만 소비되지 않은 상태를 확인했다. 수집 fiber를 바로 시작하고 실제 출력 EOF까지 기다리는 작업을 기존 abort·timeout 경쟁 안에 둔다. 명령·승인·출력 내용·exit code를 만들거나 바꾸지 않으며, 수집 실패도 정상 완료로 바꾸지 않는다. 원본 전체 SHA256 `37c7de554c2ba7bf456e4fe6faf7705141b0ccb3a7b1dd6e1046d52cd8269ecd`, 크기 195,014,520 bytes, offset 92,462,036의 유일한 2,310-byte 영역을 검사한다. 정확한 세 교체와 공백 padding 후 파일 길이를 유지하고, 결과 전체 SHA256 `04023b8024bdab3cde5c84ca509c7a9ec9492b7a308175740449fd62e6e438d6`까지 확인한다. 다른 빌드는 명시적으로 거절하며 같은 패치를 반복 적용해도 바이트를 추가 변경하지 않는다. MIT 고지는 `LICENSE.OPENCODE`에 포함한다.

설치는 npm 원본을 유지하고 임시 호환 복사본을 만든 뒤 그 파일의 실제 `--version`이 성공해야 `opencode-ios`와 공개 래퍼를 차례로 원자 게시한다. 패치 거절·버전 실패 시 이전 호환 실행 파일과 래퍼를 유지하며 임시 파일을 제거한다. 호환 복사본은 약 195MB를 추가 사용하고 업데이트 중에는 같은 크기의 임시 공간도 필요하다. 래퍼는 stdio preload나 inspector 환경을 설정하지 않고 기존 `BUN_OPTIONS`를 그대로 전달한다. 실제 게스트의 제품 동등 설정에서 이 호환 ELF만 사용해 원본 glob·grep·Bash 읽기/쓰기, 명시적 승인 3회, 구조화된 정상 완료와 exit 0을 확인했다. 검사 전체 약 259초였으며 경고 13건은 별도 검증 로그에 보존했다. 실제 계정·유료 모델·사용자 프로젝트는 사용하지 않았다.

같은 `04023…` 호환 ELF로 원본 제공자를 실행한 경계 검사 4개도 모두 통과했다. 전체 261.85초, `PASS_WITH_WARNINGS`이며 복구된 연결 진단 경고 4건을 [검증 기록](../../dist/ios-runtime-lab/opencode-shell-edges/verification.json)에 보존했다. 원본 npm ELF는 변경하지 않았고 preload는 사용하지 않았다.

| 실제 ShellTool 검사 | 확인 결과 |
| --- | --- |
| 종료 코드 7 | stdout·stderr 모두 수집, 네이티브 exit code 7 유지 |
| 큰 출력 | stdout 65,537 + stderr 65,539 = 131,076 bytes의 전체 파일 확인 |
| timeout | 약 9.25초 후 실제 명령 PID 종료, 지연된 후속 파일 쓰기 없음 |
| abort | 약 3.39초 후 네이티브 interrupted, 실제 명령 PID 종료, 후속 파일 쓰기 없음 |

호환 패치는 제품 installer에 반영했으며 host 검사 44개와 양 SDK 빌드를 통과했다. 최신 네이티브 앱의 실제 Setup 검사 10개도 234.52초에 통과해 npm 원본 `37c7…` 보존, 호환 실행 파일 `04023…`, 래퍼의 실제 실행 대상과 CJS preload 미사용을 확인했다. 전체 UI 최종 판정과 실기기·실제 계정 검증 범위는 상위 iOS 앱 검증 기록을 따른다.

원본 서버 시작 제한 7초는 실제 게스트 초기 실행보다 짧으므로 iOS 비공개 복사본에서 120초로 변경한다. 실제 원본 서버가 첫 모델 요청을 준비하는 동안 관찰용 HTTP 요청이 5초 제한에 반복 도달했으므로, 새 턴의 네 가지 관찰 요청은 총 180초의 초기 예산을 공유한다. 요청마다 남은 예산을 사용하고 이후 원래 5초 제한으로 돌아가며 재시도로 예산을 갱신하지 않는다. 다른 API 요청·연속 5회 실패 처리·승인·완료 판정은 변경하지 않는다. Chat 초기 준비는 135초, read-only 메타데이터의 전체 수명은 125초로 제한한다. 느린 모델·도구 작업을 성공으로 간주하거나 통신 실패를 무시하지 않는다.

Claude Steer는 iOS에서 네이티브 접수까지 검증하기 전에는 제공하지 않는다. 원본 어댑터를 비공개 파일로 원자적으로 복사하면서 capability 한 항목만 비활성화하며, Android 어댑터 원본을 변경하지 않는다. CLI와 SDK는 게스트에서 구조화된 승인·도구 실행·완료까지 확인한 대응 버전을 함께 사용한다.

Codex의 `read-only`·`workspace-write`는 Linux namespace 격리가 필요한 선택이므로 iOS 새 실행에서 명시적으로 거절한다. 저장된 값을 다른 권한으로 자동 변경하지 않는다. 사용자가 Chat에서 `app-sandbox`를 직접 선택하면 초기 스레드는 `read-only`·`on-request`로 열고, 실제 입력의 네이티브 `sandboxPolicy`에만 `externalSandbox`·네트워크 허용을 전달한다. iOS 앱의 격리 범위에 있는 모든 게스트 파일과 네트워크에 접근할 수 있으며 프로젝트 폴더별 격리를 제공하지 않는다. 승인은 `on-request`·사용자 처리로 유지한다. 이 정책의 Terminal 실행은 지원하지 않으며 `inherit`는 원본 CLI 설정을 그대로 따른다.

Gemini 래퍼는 검증한 Node 실행 프로필을 사용한다: `ISH_NODE_NO_ARG_INJECTION=1`, `--no-opt --no-sparkplug --single-threaded --no-wasm-tier-up --liftoff-only --no-lazy --max-old-space-size=512`. JavaScript는 Ignition에서 실행하고, 실제 WebAssembly가 만든 게스트 ARM64 코드는 바깥 iOS 해석기가 실행한다. Gemini에 임의 Wasm을 흉내 낸 HTTP parser shim을 적용하지 않는다. 패키지의 원본 `node_modules/.bin/gemini` 진입점을 Node로 실행하며 공개 래퍼 `~/.local/bin/gemini`를 재귀 호출하지 않는다.

`wasm-polyfill.js`는 HTTP 응답용 llhttp 파서의 JavaScript 구현이다. 일반 WebAssembly 지원을 의미하지 않는다. 실제 CLI의 streaming 응답·도구 왕복은 별도로 검증해야 하며, 누락되거나 잘못된 결과를 성공으로 판정하지 않는다. 응답 전체를 버퍼링하는 별도 fetch shim은 에이전트 SSE를 대체하지 않는다.

## Gemini Chat

Gemini는 `--experimental-acp`의 [공식 ACP v1](https://agentclientprotocol.com/protocol/v1/prompt-turn) JSON 메시지를 사용한다. 터미널 텍스트를 대화로 추측하지 않는다.

- 네이티브 `session/new`와 `session/prompt`를 사용하고, 모델 목록은 네이티브 `availableModels`에서 가져온다.
- `agent_message_chunk`, 도구 호출·결과, 파일 diff, 계획을 기존 Bibimer 대화 이벤트로 변환한다. 원본 thought chunk는 전달하지 않는다.
- 권한 요청은 실제 네이티브 선택지 중 `allow_once`·`reject_once`만 연결한다. 사용자의 명시적 승인 전 실행하지 않으며 영구 승인 선택지를 대신 고르지 않는다.
- `session/prompt`의 명시적 `stopReason: end_turn`만 정상 완료다. 취소·토큰 한도·오류·통신 중단은 정상 완료 알림을 만들지 않는다.
- Steer와 저장 대화 가져오기는 아직 제공하지 않는다. 세션을 임시 대화로 표시하고 해당 capability를 false로 노출한다. 지원하지 않는 추론 옵션·슬래시 명령 목록을 만들어 내지 않는다.
- 측정한 원본 CLI 초기 실행 시간이 약 35초이므로 ACP 초기화·세션 생성은 각각 최대 120초, read-only 메타데이터 클라이언트는 전체 125초로 제한한다. Chat 초기 준비는 두 초기 요청을 포함해 최대 245초다. 일반 RPC와 명시적 완료 판정은 기존 제한을 유지한다.

## 검사

```sh
python3 -m unittest discover -s ios/bridge/tests -v
python3 -m py_compile ios/bridge/run.py ios/bridge/provider_gemini.py
/bin/sh -n ios/bridge/bootstrap.sh
/bin/sh -n ios/bridge/install-agents.sh
```

검사는 인증·Origin 거절·고정 작업·재시도·실제 로컬 PTY, 모의 ACP peer와 실제 브리지 Chat 연결, 명시적 완료·취소·승인·거절·모델 목록을 확인한다. Codex 정책의 명시적 선택·스레드와 입력별 정책·저장 상태, Claude 설치 기록의 실측 버전·변조 거절·상태 조회 시 자식 실행 방지도 검사한다. 모의 peer 검사는 변환 계약을 검증하며 iOS 시뮬레이터에서 원본 CLI를 실행한 증거를 대신하지 않는다.

`tests/probe_claude_runtime.py`, `tests/probe_gemini_runtime.py`, `tests/probe_opencode_runtime.py`는 **게스트 전용** 통합 검사다. 원본 CLI·SDK·제공자 어댑터를 실행하고, 게스트 안의 합성 HTTP 모델이 요청한 일회 승인·파일 읽기/쓰기·명시적 완료를 확인한다. 실제 계정·유료 모델·사용자 프로젝트를 사용하지 않는다. 검사 파일을 준비했다는 사실과 실제 통과 증거는 구분한다.

Gemini ACP 검사는 격리된 네이티브 `policyPaths`의 TOML에서 읽기를 허용하고 `write_file`을 `ask_user`로 지정한 뒤 승인·거절을 각각 실행한다. 0.64.0의 `tools.core`는 명시적 허용 정책도 만들기 때문에 이 검사에서는 사용하지 않는다. 제품의 `inherit`나 사용자 정책을 검사 목적으로 변경하지 않는다. OpenCode 게스트 검사는 제품과 동일한 제한 변경을 적용하며 첫 턴 전체 제한은 420초다.

OpenCode 제공자 검사에서 `BIBIMER_TEST_OPENCODE_PRODUCT_FLAGS=1`을 지정하면 lab 기본 환경의 FFF·모델 갱신·터미널 제목 비활성화 플래그를 제거한다. 이때도 사용자 설정과 인증을 분리하고 합성 게스트 loopback 추론만 사용한다. JSC는 fixture의 선택을 보존한다. 제품 기본은 JSC0이며 baseline JIT 실험을 지정한 결과는 제품 검증과 구분한다. 모델 목록의 공개 HTTP 갱신은 원본 동작을 따른다.

`BIBIMER_TEST_OPENCODE_SEARCH=1`은 lab의 합성 모델이 요청한 원본 `glob`·`grep` 도구 결과가 모두 검증되었는지도 요구한다. 도구 단계가 추가되므로 이 검사의 턴 전체 제한만 600초로 늘리고 기본 검사는 420초를 유지한다. 제품의 180초 초기 관찰 예산은 변경하지 않는다. 해당 검사에 성공한 경우에만 결과 JSON에 `nativeSearch: {glob: true, grep: true}`를 기록한다. FFF 검색은 실제 통과 전까지 미검증이며, 기본 Bash 검사를 검색 지원의 증거로 간주하지 않는다.

호환 설정의 근거는 고정 OpenCode 1.19.3의 [inotify 선택·watcher 비활성화 경로](https://github.com/anomalyco/opencode/blob/v1.19.3/packages/core/src/filesystem/watcher.ts#L38), [FFF와 ripgrep 선택 경로](https://github.com/anomalyco/opencode/blob/v1.19.3/packages/core/src/filesystem/search.ts#L236), [ARM64 Linux ripgrep 다운로드 대상](https://github.com/anomalyco/opencode/blob/v1.19.3/packages/core/src/ripgrep/binary.ts#L16)이다. 내장 커널의 `kernel/arch/arm64/calls.c`는 inotify syscall을 `kernel/inotify.c`로 연결하며, 현재 구현은 watch ID만 반환하고 변경 이벤트를 생성하지 않는다.

`tests/probe_bun_process.py`는 원본 OpenCode ELF의 `BUN_BE_BUN=1` 모드에서 별도 출력·빠른 종료·종료 후 읽기·spawn 접수 후 지연된 pull 병합·Bash 파일 작업을 격리하여 진단한다. 기본은 JSC0이고 `--profile baseline`은 실험용이다. 각 프로세스는 45초 제한과 소유 그룹 정리를 사용한다. `--read-delay-ms 25` 또는 `250`은 lazy 구독 타이밍을 바꾸는 진단이며, 실패만으로 커널 결함을 단정하지 않는다. `--effect-prefix <게스트 검사 경로>`는 이미 준비된 공식 `effect@4.0.0-beta.83`, `@effect/platform-node@4.0.0-beta.83`, `cross-spawn@7.0.6`으로 `NodeStream.fromReadable → Stream.merge → Stream.runFold`와 종료 대기의 동시 실행 패턴을 검사한다. 이는 [AppProcess.run](https://github.com/anomalyco/opencode/blob/v1.19.3/packages/core/src/process.ts#L134)과 [출력 stream 구성](https://github.com/anomalyco/opencode/blob/v1.19.3/packages/core/src/cross-spawn-spawner.ts#L247)을 참고한 일반적인 optional Effect 진단 모형이다. 실제 v1 Bash 실행 경로는 별도의 [ShellTool.run](https://github.com/anomalyco/opencode/blob/v1.19.3/packages/opencode/src/tool/shell.ts#L486)이며, 조기 scope 종료 원인과 실제 패치 검증은 위 제품 호환 패치 설명을 따른다. 이 fixture는 패키지를 설치하거나 제품 의존성을 추가하지 않는다.

`experimental-stdio-retention.cjs`는 늦은 구독에서 실제 pipe 출력이 사라지는 경로를 조사하는 **선택적 실험**이며 제품 bootstrap·래퍼에서 로드하지 않는다. `ChildProcess.prototype.spawn` 직후 원본 stdout·stderr를 별도 PassThrough에 연결하고 공개 속성만 바꾸며, 런타임의 자동 drain에 사용하는 원본 `child.stdio`와 Bun 내부 stream은 유지한다. 명령·승인·종료 상태·출력 내용을 변경하지 않는다. 표준 backpressure와 원본 오류 전달을 유지하고 소비자 취소 시 원본 pipe도 닫는다. 진입 시 자신의 고정 `--preload <절대 경로>` 접미사만 `BUN_OPTIONS`에서 제거하고, `BUN_INSPECT_PRELOAD`도 자기 파일의 정확한 경로일 때만 제거해 사용자 Bun 하위 명령으로 전파하지 않는다. 다른 사용자 preload 값과 기존 옵션은 보존한다. helper 자체는 로그·파일을 남기지 않는다.

호스트 검사는 `tests/stdio_retention_regression.cjs`로 미적용 시 실제 유실과 적용 후 보존을 비교하고, 양쪽 출력·stdout 단독·큰 출력·신호·ENOENT·원본 pipe 오류·소비자 취소·리소스 정리·옵션 상속을 확인한다. 게스트에서는 `--stdio-preload /experimental-stdio-retention.cjs`로 이미 배치된 고정 파일을 선택하고 메모리 marker와 지연 읽기를 추가 검사한다. 원본 CLI 검사는 `BIBIMER_TEST_OPENCODE_STDIO_PRELOAD=1`로 같은 고정 파일을 선택한다. 이 실험 결과는 제품 기본 환경의 검증과 구분한다. 합성 서버가 잘못된 원본 도구 결과를 거절하면 fixture는 즉시 실패하고 자신이 만든 프로세스를 정리한다.

`BIBIMER_TEST_OPENCODE_STDIO_TRACE=1`은 별도 `tests/stdio-retention-trace.cjs` 진단 loader를 선택한다. 고정된 합성 프로젝트의 `stdio-trace.jsonl`에 helper marker, spawn 호출, 실행 파일 basename, stream 동일성, `.read()` 반환 byte 수와 close 상태만 최대 128KiB 기록한다. 명령 인수·환경·출력 본문은 기록하지 않고 새 `data`/`readable` listener도 추가하지 않는다. native flowing push는 `.read()` 반환을 거치지 않을 수 있으므로 이 수치를 전체 pipe 전달량으로 해석하지 않는다. fixture는 시작 전 이전 trace를 지우고 종료 정리 후 고정 파일만 제한된 크기로 출력한다. 제품에서 이 진단을 로드하지 않는다.

`--compiled-preload-only --stdio-preload /experimental-stdio-retention.cjs`는 `BUN_BE_BUN`을 제거하고 원본 ELF `--version`을 실행한다. 별도 loader가 helper와 메모리 marker를 확인한 다음 고유 sentinel 오류를 발생시키며, 예상한 비정상 종료와 실제 오류 메시지가 모두 있어야 main 실행 전 로드를 입증한다. Bun의 오류 소스 문맥만으로 성공을 오판하지 않도록 sentinel 전체 문자열은 loader 코드에 그대로 넣지 않는다. 결과에는 검사한 helper의 SHA256도 기록한다.

HTTP 파서 자체는 다음 검사로 온전한 응답·바이트 단위 분할·chunked SSE의 종료 전 전달을 검증한다. 일반 Wasm 모듈을 가정하지 않고 Node에 포함된 실제 llhttp 바이트를 사용한다. 이 검사의 실패를 허용하거나 무시해 CLI 실행 성공으로 표시하면 안 된다.

```sh
node --jitless ios/bridge/tests/http_parser_regression.cjs \
  .tools/ios-runtime/ios-linuxkit/app/RootfsPatch.bundle/files/lib/wasm-polyfill.js
```
