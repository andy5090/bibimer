# 첫 버전 구조와 API

## 실행 경계

Bibimer 앱은 입력·상태·터미널 화면을 제공한다. 프로젝트 경로 검증, 폴더 생성, 프로그램 탐색, 프로세스 실행과 제어는 같은 기기의 Termux 브리지가 담당한다. Android 앱이 Termux 전용 파일 경로를 직접 읽지 않는다.

Python 브리지는 `127.0.0.1`에만 바인드하고, Host가 해당 주소·포트와 일치해야 한다. 브라우저 Origin 헤더가 있는 요청은 거절한다. Android 네이티브 HTTP 클라이언트는 고정 주소만 사용하며 프록시와 리다이렉트를 사용하지 않는다.

## 연결과 인증

`start` 또는 `pair`를 Termux 터미널에서 실행하면 일회용 코드가 표시된다. 코드의 해시·만료 시간·시도 횟수만 상태 폴더에 기록한다. 5분 또는 실패 5회 뒤 무효이며 성공 시 즉시 폐기한다.

앱이 `POST /v1/pair`로 연결 코드를 보내면 인증 토큰을 받는다. 토큰은 Android 네이티브 코드에서 보관하고 나머지 API의 `Authorization: Bearer …` 헤더에 사용한다. 토큰과 세션 출력은 URL, 일반 로그, 저장소에 넣지 않는다.

## API

요청·응답은 JSON이고, 입력·출력 바이트는 base64로 전달한다. 페어링 외 모든 API에 인증이 필요하다.

0.1.1 이상의 오류 응답은 안정적인 `code`와 영어 기본 `error` 문구를 포함한다. 앱은 `code`에 대응하는 영어·한국어 문구를 표시한다. 실행 중인 0.1.0 브리지도 재시작 없이 사용할 수 있도록 코드가 없는 기존 한국어 오류를 대응 문구로 변환한다. 터미널 출력은 이 번역 경로를 거치지 않는다.

| 메서드·경로 | 역할 | 주요 요청 값 |
| --- | --- | --- |
| `POST /v1/pair` | 일회용 연결 코드 교환 | `code` |
| `GET /v1/health` | 인스턴스, 전체 프로젝트·세션 상태, 선택 프로젝트, 프로그램 탐지 | 없음 |
| `POST /v1/project` | 폴더 추가·선택 | 추가: `path`, `create`, `add: true`; 전환: `project_id` |
| `POST /v1/folders` | Termux 하위 폴더 탐색, 상태 변경 없음 | `path` (기본 `~`), `hidden` (기본 false), `after` (다음 페이지의 이름 커서) |
| `POST /v1/session-history` | 현재 프로젝트의 저장된 에이전트 세션 조회 | `project_id`, `agent` (`codex` 기본 / `opencode` / `claude`), `search` (제목), `cursor` |
| `POST /v1/sessions` | 지정 프로젝트의 세션 시작·가져오기 | `project_id`, `agent` (`shell`, `codex`, `claude`, `opencode`), `mode` (`terminal` 기본 / `chat`), `request_id`, `cols`, `rows`, `options` (0.8.0); 가져오기: `source_thread_id`, `import_mode` (`fork` / `resume`), `mode: chat` |
| `GET /v1/sessions/{id}/events` | 출력 및 실제 프로세스 상태 | `cursor` (PTY 바이트 위치 / Chat 변경 번호), `wait` (0~20초) |
| `POST /v1/sessions/{id}/input` | 입력 바이트 전송 | `data` (base64), `request_id` (UUID) |
| `POST /v1/sessions/{id}/resize` | PTY 크기 변경 | `cols` (20~300), `rows` (4~200) |
| `POST /v1/sessions/{id}/options` | Chat의 다음 입력 설정 변경·보관 (0.8.1) | `options` (권한·Codex Fast의 부분 변경), `request_id` |
| `POST /v1/sessions/{id}/message` | Chat의 새 메시지 | `text`, `request_id`, Codex 전용 `fast` (boolean, 선택) |
| `POST /v1/sessions/{id}/queue` | Chat 대기열 추가·개별 취소·재개 (빌드 대기) | `action` (`add` / `remove` / `resume`), `request_id`; 추가: `text`, 취소: `entry_id` |
| `POST /v1/sessions/{id}/steer` | 진행 중 Codex 턴에 추가 입력 (빌드 대기) | `text`, `turn_id` (현재 턴), `request_id` |
| `POST /v1/sessions/{id}/respond` | 대기 중인 승인·질문에 응답 | `prompt_id`, `request_id`, `decision` 또는 `answers` |
| `POST /v1/sessions/{id}/interrupt` | Chat의 현재 응답만 중단 | 빈 객체 |
| `POST /v1/shutdown` | CLI 업데이트용 브리지 종료, 실행 세션이 있으면 거부 | 빈 객체 |
| `POST /v1/sessions/{id}/stop` | 해당 실행 세션 중지 | 빈 객체 |

여러 프로젝트를 등록하며 프로젝트당 실행 세션 하나를 허용한다. 프로젝트는 UUID로 식별하고 정규화한 폴더 경로가 같으면 기존 항목을 반환한다. 프로젝트 추가·전환은 다른 프로젝트의 실행을 종료하지 않는다. 새 앱은 실행 요청에 `project_id`를 명시하고 입력·응답·종료는 세션 ID로 전달한다. 실행 명령은 허용된 프로그램 ID에서 선택하고 셸 문자열로 조합하지 않는다.

0.3.1은 `features` 배열의 `browse_folders` 항목으로 폴더 탐색 지원을 알린다. 폴더 API도 인증·로컬 Host·Origin 검사를 거치며 Android는 고정된 `/v1/folders` 경로만 허용한다. `path`·`parent`·`entries`(이름/경로)·`next`·`writable`을 반환한다. 한 단계의 폴더를 이름순으로 최대 100개씩 반환하고 스캔 메모리는 한 페이지로 제한한다. 파일 내용을 열거나 하위 폴더를 재귀 탐색하지 않는다. 심볼릭 링크는 열 때 실제 경로로 정규화하며 Termux가 접근 가능한 경로를 사용한다. 페이지 사이 폴더 변경은 새로 탐색할 때 반영된다. 선택 후 기존 프로젝트 등록 API에서 접근 권한을 다시 확인한다.

`health.projects`는 각 프로젝트와 해당 세션 메타데이터를, `active_sessions`는 모든 프로젝트의 실행 중·종료 중 세션 수를 반환한다. `features`의 `multiple_projects`로 기능을 확인한다. 기존 앱용 `project`·`session` 필드를 유지하고 프로젝트 ID가 없는 실행은 마지막 선택 프로젝트를 사용한다. 기존 앱의 폴더 교체 요청(`add` 없음)은 현재 세션 실행 중 거절한다.

메타데이터 형식 2는 전체 프로젝트·마지막 선택 ID·프로젝트별 마지막 세션을 저장한다. 이전 단일 프로젝트 상태 파일은 최초 시작 시 UUID를 부여해 이동하며 인증 토큰을 유지한다. 실행 프로세스에 다시 붙지 않으며 모든 프로젝트에서 이전의 `running`·`stopping` 상태를 재시작 시 `lost`로 바꾼다.

시작 요청은 프로젝트·프로그램·방식과 `request_id`가 같으면 같은 세션을 반환하며 다른 프로젝트의 실행 ID 재사용은 거절한다. 입력은 최근 512개 요청 ID를 기억하고 중복 전달을 막는다. 입력은 요청당 최대 16KiB다. 부분 전송이나 응답 유실 시 앱은 자동으로 재전송하지 않고 사용자가 출력을 확인하도록 안내한다.

## 상태와 재접속

- 화면 연결: `Connected` / `Disconnected`(한국어: `기기 연결됨` / `연결 끊김`). 연결되지 않은 동안 프로세스 상태는 마지막 확인 값이다.
- 프로세스: `running`, `stopping`, `exited`, `lost`. 종료 코드는 실제 자식 프로세스의 반환값이며 신호로 종료되면 음수일 수 있다.
- 브리지 `instance`는 실행마다 바뀐다. 새 브리지는 이전의 `running`·`stopping` 메타데이터를 `lost`로 바꾸고 기존 PID에 재접속하거나 명령을 보내지 않는다.
- 0.2.1부터 재시작 직후 남은 마지막 세션의 `events` 조회는 종료·유실 상태와 빈 출력을 반환한다. 커서는 0으로 초기화되며 이전 커서가 전달되면 `gap`을 알린다. 이 기록에는 입력·종료 등의 조작을 허용하지 않으며 새 세션을 시작하면 이전 ID는 더 이상 조회하지 않는다. 종료 기록 조회가 연결 오류로 처리되어 새 세션 시작을 막는 문제를 방지한다.
- 화면 비활성·Activity 파괴는 출력 폴링을 중단한다. 세션 종료 API를 호출하지 않는다.
- 프로젝트 전환 시 현재 폴링을 취소하고 요청 세대를 바꾼다. 지연된 출력·전송 응답이 다른 프로젝트의 화면이나 입력을 변경하지 않게 확인한다. 프로젝트별 입력 초안·프로그램 선택·질문 답변 초안은 화면 메모리에만 보관하며 앱 프로세스 종료 후에는 복원하지 않는다. 최근 출력은 브리지에서 다시 읽는다.
- 언어는 Android의 별도 `appearance` 환경 설정에 저장한다. 기본은 영어이며 언어 전환은 화면 문구만 갱신한다. 인증 토큰 초기화와 언어 설정은 독립적이다.

출력은 세션마다 최대 1MiB의 메모리 버퍼와 바이트 커서를 사용한다. 클라이언트가 마지막 커서부터 읽거나 0부터 다시 재생할 수 있다. 오래된 출력이 버퍼에서 제거되면 `gap`을 반환한다. 잘린 ANSI 상태나 과거 전체 터미널 화면의 완전한 복원은 보장하지 않는다. 출력은 브리지 재시작 후 유지하지 않는다.

## 구조화된 대화

`ChatSession`은 `provider_command`가 선택한 프로그램과 stdio로 연결한다. Codex는 App Server를 직접 사용하며 `initialize → initialized → thread/start` 순서로 초기화한다. OpenCode·Claude 어댑터는 해당 내부 프로토콜의 허용된 메서드와 구조화된 이벤트를 구현해 기존 대화 렌더러를 사용한다. 이는 OpenCode·Claude의 공개 API 이름을 뜻하지 않는다. 0.7.0부터 Codex는 `ephemeral: false`로 새 대화를 만들며 사용자 모델·권한 설정과 기존 `CODEX_HOME`을 상속한다. 별도 Codex 저장소나 이중 세션 색인을 만들지 않는다. 원격 주소나 임의 JSON-RPC 메서드를 앱에서 전달할 수 없으며, 입력과 승인 응답은 한 스레드·현재 턴으로 제한한다.

프로세스의 `state`와 응답의 `turn_state`(준비·전송·응답·사용자 대기·실패)를 분리한다. `turn/interrupt`는 응답만 중단한다. 명령·파일 승인은 한 번 승인 또는 거절만 지원하며, 질문에는 단일·복수 선택과 요청이 허용한 자유 입력을 제공한다. 미지원 서버 요청은 오류로 응답하고 승인하지 않는다. 종료·해결된 요청에 대한 늦은 응답을 거부하고 재전송 ID로 중복을 막는다. 프로젝트 전환·언어 변경 시 복수 선택 초안도 유지한다.


응답 중 입력은 `chat_queue`·`codex_steer` 기능 플래그로 알린다(소스 반영, 배포 대기). 새 앱은 Chat 입력을 `queue`의 `action: add` 동작으로 전송하고, 비어 있는 준비 상태에서는 곧바로 실행한다. 대기열은 세션별 최대 16건·건당 UTF-8 16KiB이며 `events.queue`와 queue API 응답으로만 내용을 전달한다. snapshot에는 건수·일시정지 상태·현재 턴 ID만 넣는다. 정상 완료 후 FIFO로 보내며, 중단/실패/시작 거절 시 후속 입력을 일시정지한다. 시작이 거절된 항목은 실패 상태로 남겨 취소·명시적 재개를 지원한다. 실제 전송 시점의 세션 권한·Fast를 적용한다.

대기열은 브리지 메모리에 있으므로 앱 재실행·프로젝트 전환에는 유지되지만 에이전트 종료·브리지 종료에는 유지하지 않는다. 브리지 재시작 시 이전 건수·턴 ID도 초기화하고 앱은 미전송 대기열 유실을 알린다. 대기열 내용은 디스크 메타데이터·로그에 기록하지 않는다. 추가·취소·재개의 요청 ID도 기존 중복 처리 한도와 내용 충돌 검사를 사용하며, 변경 번호가 지난 응답은 현재 목록을 덮어쓰지 않는다.

Codex [공식 `turn/steer`](https://learn.chatgpt.com/docs/app-server#steer-an-active-turn)에 `expectedTurnId`를 전달하고 네이티브 응답의 `turnId`가 일치한 뒤 성공 처리한다. 새 턴·interrupt·권한 변경 RPC로 대체하지 않는다. 거절 시 초안을 유지하며 응답 유실/시간 초과는 전달 여부 불명으로 처리해 자동 재전송하지 않는다. 확인이 끝나지 않은 Steer가 이후 대기열을 영구 차단하지 않도록 제한 시간 후 수신 대기를 해제한다. Claude·OpenCode에는 브리지 FIFO만 제공한다.

대화 이벤트는 `items`, `retained`, `requests`, `queue`를 반환한다. 항목은 변경 번호를 가지며 전체 항목은 최대 1MiB·200개, 항목별 텍스트는 32768자로 제한한다. 오래된 내용이 제거되면 `gap`을 알리고 남은 항목으로 복구한다. 승인·질문은 별도 메모리 상태로 유지해 재접속 시 다시 표시한다. 디스크 메타데이터에는 대화·질문·답변을 저장하지 않는다.

`conversation.js`는 DOM 노드로 제목·목록·표·코드 블록·굵은 글씨를 렌더링한다. HTML을 실행하지 않고 외부 링크·이미지를 로드하지 않는다. 터미널 화면을 파싱해 사용자·에이전트 메시지로 추정하지 않는다.

## 프로세스 제어

자식 런처를 새 POSIX 세션으로 실행한 뒤 PTY를 제어 터미널로 설정하고 실제 프로그램으로 교체한다. 멀티스레드 HTTP 서버에서 Python `preexec_fn`을 사용하지 않는다.

종료는 해당 POSIX 세션에 속한 프로세스 그룹에 SIGTERM을 보내고, 3초 안에 종료되지 않으면 SIGKILL로 정리한다. 대화형 셸의 전경·배경 작업도 같은 세션 ID에 속하는 범위에서 정리한다. 독립적인 `setsid()` 등으로 명시적으로 이 세션을 벗어난 데몬까지 추적하지는 않는다. 프로세스 이름으로 전역 종료하지 않는다.

브리지는 Android 포그라운드 서비스를 직접 생성하지 않는다. Termux·OS의 프로세스 생존 제약은 그대로 적용된다. 화면 잠금·강제 종료 후의 실제 복구 경험은 다음 실기기 검증에서 확인한다.

`restart` CLI는 실행 세션이 있으면 거부한다. 0.2.0 이상의 종료 API는 세션 시작과 같은 잠금 아래에서 종료 상태를 설정한다. 0.1.x 호환 경로는 같은 사용자·Python 실행 파일·브리지 실행 인수·상태 파일 잠금을 확인하고 pidfd로 확인한 프로세스만 종료한다. 이전 API에는 시작/종료를 함께 잠글 수 없으므로 업데이트 중 다른 클라이언트에서 새 세션을 시작하지 않아야 한다. pidfd 지원이나 소유권 확인이 불가능하면 자동 종료하지 않는다.

## 응답 표시 (0.4.0)

Chat 이벤트의 파일 변경에는 `changes: [{path, diff}]`와 `truncated`, 계획에는 `steps: [{step, status}]`와 `explanation`을 전달한다. 이전 UI용 `text`도 유지한다. 파일별 diff 미리보기는 경로·변경 문자열을 합쳐 약 32Ki 문자로 제한하며 잘림을 표시한다. 에이전트가 제공한 요약에는 `summary: true`를 붙여 계획과 표시를 구분한다. 이 내용은 기존 메모리 출력 한도에 포함되며 디스크 메타데이터에는 저장하지 않는다.

`rich-text.js`는 고정 버전 marked의 lexer 토큰을 DOM 요소로 바꾸고 코드만 highlight.js로 강조한다. HTML·이미지·외부 콘텐츠는 대화 DOM에서 실행하거나 자동 로드하지 않는다. 명시적인 HTTP(S) 링크 클릭은 URL 형식을 JavaScript와 네이티브에서 확인한 뒤 외부 브라우저로 전달한다. 내부 WebView의 탐색 차단과 고정 asset 허용 목록은 유지한다. 파일 경로 링크는 복사 기능만 제공한다.

## OpenCode·Claude 어댑터 (0.6.0)

`provider_opencode.py`는 설치된 `opencode serve`를 세션별 별도 자식 프로세스로 시작한다. 임의 루프백 포트와 메모리에서 생성한 Basic 인증 비밀번호를 사용하며 HTTP 프록시·리다이렉트를 금지한다. 비밀번호는 자식 환경으로만 전달하고 로그·명령 인수에 넣지 않는다. 자동 업데이트·자동 공유를 끄고 기존 모델·권한 설정을 사용한다.

OpenCode의 공개 서버 API로 세션 생성·조회·복사·메시지·권한·질문을 처리한다. 사용자 전송에서만 `prompt_async`를 호출하며 활성 응답 동안 메시지·상태를 약 350ms 간격으로 확인한다. 동일 세션의 권한·질문만 앱에 전달하며 한 번 승인과 거절을 대응시킨다. 응답 전송 여부가 불확실하면 재전송하지 않고 안내한다. 반복 통신 실패 또는 자식 서버 종료 시 해당 어댑터를 종료한다. 종료·목록 조회 완료 시 소유한 서버만 정리한다. PTY는 서버 어댑터를 거치지 않고 `opencode`를 직접 실행한다.

`provider_claude.mjs`는 Node.js와 공식 `@anthropic-ai/claude-agent-sdk` 0.3.283을 사용한다. SDK는 `~/.local/share/bibimer/claude/`에 별도로 설치하며 개발 테스트에서만 `BIBIMER_CLAUDE_SDK_PATH`로 경로를 대체할 수 있다. 새 대화는 첫 입력에서 SDK `query`를 시작하고 이후 입력은 같은 세션 ID로 재개한다. 사용자·프로젝트·로컬 설정을 읽으며 권한 우회 옵션을 설정하지 않는다. `canUseTool`과 `AskUserQuestion`을 앱의 승인·질문으로 전달하고 명시적인 답변을 기다린다. 응답 종료·중단 시 남은 대기 요청은 거절 처리한다. 텍스트·Bash·파일 편집·TodoWrite를 구조화된 항목으로 바꾸며 내부 추론과 하위 에이전트 기록은 표시하지 않는다.

Claude의 명령 존재와 실제 실행 가능 여부를 구분한다. `claude --version`을 제한 시간 2초로 확인하고 결과를 60초 캐시한다. 명령 실패와 SDK 누락을 health 및 준비 화면에 각각 알린다. SDK 설치는 Claude CLI 설치·Android 호환성을 보장하지 않는다.

프로토콜 근거: [OpenCode 서버 API](https://opencode.ai/docs/server/), [OpenCode CLI](https://opencode.ai/docs/cli/), [Claude SDK 세션](https://code.claude.com/docs/en/agent-sdk/sessions), [Claude SDK 사용자 입력](https://code.claude.com/docs/en/agent-sdk/user-input). 설치된 OpenCode 1.17.13의 `/doc` 스키마와 SDK 0.3.283의 타입 정의도 대조했다.

## 저장된 에이전트 세션 (0.5.0 / 0.6.0 확장)

`import_agent_session` 기능을 health에 광고하며 이전 앱용 `import_codex_session`도 유지한다. `HistoryClient`는 프로젝트 cwd에서 해당 에이전트의 별도 App Server 또는 어댑터를 열고 초기화한 뒤 `thread/list` 또는 `thread/read`만 호출하며 끝나면 소유한 프로세스 그룹을 정리한다. 전역 세션 잠금을 보유하지 않아 목록 조회가 다른 프로젝트의 입력·상태 폴링을 막지 않는다. 조회는 동시에 하나만 허용하고 RPC당 8초·응답 2MiB로 제한한다.

목록은 cwd 일치·비보관·비임시 세션을 최근 수정 순 25개와 다음 커서로 반환한다. Codex는 CLI·VS Code·App Server 출처와 모든 모델 제공자를 포함한다. OpenCode는 `directory` 필터와 정규화한 실제 경로를 확인한다(`path` 필드는 작업 폴더와 다름). Claude는 공식 SDK `listSessions`·`getSessionInfo`·`getSessionMessages`를 사용하며 worktree·숨김 기록을 제외한다. OpenCode·Claude 목록은 최대 10,000건으로 제한하며 Claude의 64MiB 초과 기록은 CLI 사용 안내로 거절한다. 제목은 240자로 제한하고 내용은 저장하지 않는다. 시작 시 목록의 경로나 제목을 신뢰하지 않고 `thread/read(includeTurns: false)`로 ID·cwd·저장 여부를 재검증한다. 조회 전후에 해당 프로젝트의 실행 상태·요청 중복을 확인하므로 동시에 시작한 세션을 덮어쓰지 않는다. 가져오는 동안 프로젝트가 변경되어도 원래 프로젝트로 실행한다.

가져오기 ChatSession은 `thread/resume` 또는 `thread/fork`를 `excludeTurns: true`로 호출하고 모델·권한·cwd 설정을 덮어쓰지 않는다. 실제 응답의 cwd도 다시 확인한다. 이후 `thread/items/list(limit: 50, sortDirection: desc)`를 읽어 시간 순으로 표시한다. 기록의 `inProgress` 항목은 중단 상태로 표시하고 승인 RPC로 재구성하지 않는다. 미리보기만 실패하면 안내 후 입력을 허용하며, 복원이 실패하면 이번에 만든 프로세스만 종료한다. 초기화·미리보기까지 20초 안에 완료되지 않으면 오류로 종료한다.

`source_thread_id`, `import_mode`, `external_thread_id`만 기존 세션 메타데이터에 추가한다. 새 Codex Chat을 포함한 각 대화는 에이전트의 영속 기록이다. `history_persisted`는 thread 초기화 응답의 `ephemeral: false` 확인 결과로 메타데이터에 보관한다. Claude 복사는 SDK `forkSession`, OpenCode 복사는 공개 서버의 fork API를 사용하고 가져오기만으로 모델 턴을 시작하지 않는다. Bibimer의 대화 미리보기·새 출력은 기존 메모리 한도만 유지한다. 원본 이어하기가 기본이며 외부 CLI 활성 상태를 완전히 탐지할 수 없으므로 다른 클라이언트에서 작업을 마친 뒤 이어가거나 복사를 선택하도록 안내한다. 실행 중인 PTY 연결·전체 기록 탐색은 구현하지 않았다.

프로토콜 근거: [Codex App Server 공식 문서](https://learn.chatgpt.com/docs/app-server). 현재 폰의 Codex 0.156.1 생성 JSON Schema와 실제 RPC로 목록·읽기·복사·원본 이어하기를 확인했다. 실제 프로브는 새로 만든 테스트 스레드에 통제된 항목만 주입하고 모델 턴을 시작하지 않았으며 해당 테스트 기록만 보관 처리했다.

## 0.7.0 저장 통합과 이전 작업 복구

health의 `persistent_codex_sessions`는 새 Codex 대화의 영구 저장을 알린다. 새 앱은 이 기능이 없는 브리지에서 Codex 새 Chat 시작을 막고 업데이트를 안내한다. 기존 세션 관찰·PTY·저장된 기록 가져오기는 유지한다. CLI 이어하기 버튼은 저장이 확인된 Codex 대화만 표시하며 같은 thread ID와 셸 이스케이프한 작업 폴더를 복사한다. 실제 명령을 자동 실행하지 않는다.

설치된 Codex 0.156.1은 첫 사용자 입력이 있는 저장 세션을 기본 목록에 노출한다. 구조화된 항목 주입만으로는 목록에 나타나지 않으므로, 실제 검증에서는 임시 폴더와 로컬 HTTP 응답 대역으로 사용자 턴 하나를 생성했다. 외부 모델은 호출하지 않았으며 기본 목록·별도 프로세스의 읽기·같은 ID 재개와 기록 복원을 확인했다.

0.6.0의 기존 임시 대화는 메모리에서 찾았고 사용자 요청에 따라 남아 있는 UI 이벤트만 별도로 보존했다. `~/.local/state/bibimer/recovery/`는 0700, 파일은 0600이며 저장소·일반 로그에 포함하지 않는다. 이는 일회성 복구 작업이며 앱의 새로운 대화를 이 경로에 저장하는 기능이 아니다. 임시 대화에 대한 네이티브 `thread/fork`는 통제된 실험에서 거절되었으며 전체 모델 맥락을 복원했다고 표시하지 않는다.

Claude 실행 경로는 정상 사용자 CLI → Bibimer 전용 복구 런처 순서로 찾는다. 명시적인 `BIBIMER_CLAUDE_EXECUTABLE`은 이 선택보다 우선하며 HTTP 클라이언트에서 지정할 수 없다. 확인 캐시는 에이전트와 실행 경로별로 분리한다. `repair_claude_termux.py`는 공식 고정 패키지의 무결성·예상 일반 파일·실행 성공을 확인한 뒤 런처를 원자적으로 교체하고 이전 런처를 실패 시 유지한다. glibc 선행 설치나 사용자 로그인은 자동으로 처리하지 않는다.

## 0.8.0 권한·속도 설정 / 0.8.1 대화 중 변경

`options.permission`은 에이전트별 허용된 열거값만 받는다. `options.fast`는 Codex의 boolean만 허용한다. 임의 CLI 인수·설정 파일·환경 변수나 RPC를 앱에 개방하지 않는다. 값 생략은 기존 도구 설정을 상속하며 새 앱의 Codex Fast 기본값은 false다. `agent_options` 기능 표시가 없는 브리지에서는 새 앱의 에이전트 실행·가져오기를 막고 업데이트를 안내한다.

- Codex Chat: 0.8.1은 `thread/start`·`thread/resume`·`thread/fork`에서 네이티브 기본 `approvalPolicy`·`approvalsReviewer`·`sandbox`를 받아 보관한다. 명시한 권한은 첫 입력부터 매번 `turn/start.approvalPolicy/approvalsReviewer/sandboxPolicy`에 전달하고 기본값 선택 시 보관한 정책을 복원한다. 기본 정책을 받지 못하면 시작을 실패 처리한다. YOLO는 `dangerFullAccess`/`never`, 읽기·프로젝트 쓰기는 해당 sandbox와 `on-request`/사용자 승인이다. Fast는 `features.fast_mode=true`, `fast`/`default` tier를 사용하며 각 입력에서 적용한다. 설치된 0.156.1의 Fast는 `priority`로 정규화된다.
- Codex PTY: 고정 인수로 sandbox/approval 또는 `--dangerously-bypass-approvals-and-sandbox`를 구성하고 프로세스 범위의 `-c service_tier=...`를 사용한다. 사용자의 `config.toml`은 편집하지 않는다.
- Claude Chat: SDK의 `permissionMode`를 선택하고 bypass일 때만 `allowDangerouslySkipPermissions=true`를 추가한다. PTY는 `--permission-mode` 및 bypass의 `--dangerously-skip-permissions`를 사용한다.
- OpenCode: PTY 프로세스에만 `OPENCODE_PERMISSION`을 설정한다. Chat은 세션 API의 규칙을 사용한다. Chat 새 세션은 생성 시 wildcard permission을 전달한다. 이어하기·복사는 원본 확인 후 해당 세션에 PATCH하며, 네이티브가 규칙을 추가하므로 마지막 일치 규칙이 선택된다. 복사에 적용한 규칙은 원본에 쓰지 않는다. 상속은 규칙을 덮어쓰지 않는다.

Android `AgentPreferences`는 에이전트별 마지막 선택만 `SharedPreferences`에 저장한다. 프로젝트별 입력 초안·실행 세션과 별개다. `options`는 세션의 다음 입력 설정, `launch_options`는 처음 실행한 설정이며 실행 요청 중복 판정에는 후자를 사용한다. Fast 메시지의 중복 판정에 속도를 포함한다. 다른 프로젝트의 세션·대기 승인에는 전달하지 않는다. 도구가 실제로 전달한 승인·질문 요청은 기존 명시적 응답 UI를 따른다.

0.8.1의 `options` API는 현재 Chat의 **다음 입력** 설정을 메타데이터에 보관하고 변경 revision을 올린다. 진행 중인 응답의 네이티브 설정을 바꾸거나 대기 승인에 응답하지 않는다. 새 입력이 실제 전송될 때 선택한 정책을 적용한다. Claude는 각 SDK query의 permissionMode, OpenCode는 다음 prompt 전의 세션 permission PATCH로 전환한다. OpenCode PATCH는 기존 규칙을 병합하므로 상속으로 되돌리는 요청은 거절하고 새 세션을 안내한다. 값과 요청 ID를 검증하고 같은 요청의 재전송은 다시 적용하지 않는다. 종료 세션·PTY에는 이 API를 허용하지 않는다.

`live_agent_options`가 있는 브리지에서만 현재 Chat의 하단 컨트롤을 활성화한다. 앱은 현재 세션 설정과 새 세션 기본값을 구분하고 입력창 아래에 다음 입력/다음 세션 적용 범위를 표시한다. 변경 요청은 선택한 세션 ID에 고정하며 응답 도착 전에 프로젝트가 바뀌면 다른 세션 화면을 덮어쓰지 않는다. 선택한 값을 브리지에 반영한 뒤 Android 기본값을 저장하고 실패를 표시한다.
