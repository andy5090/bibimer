# 첫 버전 구조와 API

## Firefox · Termux:X11 기본 개발 브라우저 (2026-10-23, 별도 워크트리·미배포)

Android와 같은 폰의 Termux에서 일반 Firefox 창을 실행하고, 사용자가 직접 로그인한 뒤 연결된 에이전트가 같은 창을 조작한다. `feat/termux-x11-browser`에 구현했으며 APK에 반영하지 않았다. 기본 연결은 켜짐이고 브라우저는 첫 요청 때 실행한다.

- 설정 → **Firefox · Termux:X11**에서 에이전트 연결을 켜거나 끈다. 브리지 메타데이터에 공통 선택을 저장한다. 새 Codex·Claude·OpenCode Chat에 도구 경로와 사용 안내를 전달한다. 기존 프로세스·PTY에는 명령을 주입하지 않는다. 연결을 끄면 기존 도구 접근도 차단하며 브라우저 창을 임의 종료하지 않는다.
- **Termux에서 준비**는 기존 RUN_COMMAND 권한 흐름으로 새 Termux 터미널에 고정 설치 명령만 전달한다. `x11-repo`, `termux-x11-nightly`, `firefox`, `openbox`, `xdotool`, `xclip`, `imagemagick`, `libc++`를 준비하고 Firefox 버전을 확인한다. Termux:X11 Android 앱은 공식 릴리스에서 사용자가 설치한다. 외부 앱 연동 설정/Android 설치 승인을 임의 변경하지 않는다. 명령 복사와 공식 링크도 유지한다.
- 인증된 `POST /v1/browser`는 `status`, `start`, `configure`, `manual`, `allow`만 받는다. 등록 프로젝트/실제 Git 워크트리 경로를 검증하고 시작 UUID와 URL 해시로 재시도를 처리한다. HTTP(S)만 허용하며 URL의 자격증명·제어 문자·잘못된 포트·다른 스킴은 거절한다. 실행 중인 같은 프로젝트 창을 재사용하며 재사용 요청의 URL로 이동시키지 않는다. 다른 프로젝트는 별도 창/프로필이다.
- 프로필은 `browser-profiles/<프로젝트 ID SHA256>`에0700으로 보존하고 워크트리들이 공유한다. 기존 실험의 작업 폴더별 프로필과 저장소 밖 배포용 프로필은 자동 이동/복사하지 않는다. 삭제·등록 해제·종료로 프로필을 지우지 않으며 사이트의 로그인 만료 정책은 따른다.
- `BrowserSession(kind: browser)`은 이름/보관/종료/목록과 유지보수 종료 대상을 재사용한다. 전용 POSIX 세션·display lock·기존 socket 확인을 사용한다. 시작 신호는 PTY와 분리한 파이프로 받고 진단 출력은 폐기한다. X11에 `-nolisten tcp`, UUID tag와 MIT-MAGIC-COOKIE-1을 적용한다. Xorg의 인자 길이 제한 때문에 실행용 인증 파일은 짧은 비공개 임시 폴더의0600 파일로 만들고 종료 후 삭제한다.
- Openbox를 실행하고 `firefox --no-remote --new-instance --profile … --new-window …`를 연다. Firefox 계열 자식에서만 `LD_LIBRARY_PATH`·`LD_PRELOAD`와 X11 시작/진단 변수를 정리한다. 에이전트 런타임·전역 셸 환경은 바꾸지 않는다. 브라우저 디버깅 포트/자동화 플래그·UA 변경·VNC·ADB를 사용하지 않는다.
- 새 창은 **직접 로그인 모드**다. 브리지의 잠금 안에서 화면 캡처·클릭·입력을 거절하고 앱의 **로그인 완료 · 에이전트 제어 허용**으로만 해제한다. 에이전트 도구는 잠금을 해제할 수 없다. 다시 **직접 로그인**을 선택하면 진행 중인 조작을 마친 뒤 새 조작을 막고 창을 앞으로 가져온다. 이때 기존 캡처와 도구가 소유한 클립보드 프로세스를 정리한다. Google 인증 성공을 보장하거나 제한을 우회하지 않는다.
- `browser_tools.py`는0700 임시 폴더의0600 Unix socket과 실행 세션별 메모리 capability를 사용한다. 브리지의 범용 인증 토큰은 에이전트에 넘기지 않는다. `bibimer-browser help`와 stdin JSON으로 `open/status/screenshot/click/type/key/scroll/release`를 제공한다. Codex는 네이티브 developer instructions, Claude SDK는 system prompt append, OpenCode는 prompt의 추가 system 필드로 안내한다. 전역 설정·프로젝트 AGENTS 파일을 변경하지 않는다. PTY에는 도구 환경만 제공하며 안내 문구를 강제로 입력하지 않는다.
- 조작은 해당 프로젝트의 전용 display와 활성 Firefox 창만 사용하며, 파일 선택창 같은 modal에서 부모 창을 재활성화하지 않는다. 클릭 좌표는 매번 현재 display 크기로 검증한다. 한글은 소유한 foreground xclip에 쓰고 붙여넣으며 클립보드를 읽지 않는다. 한 번에 한 에이전트가 창을 점유하고 `release`·직접 로그인 전환·프로세스 종료로 넘긴다. read-only/plan 권한은 입력을 거절하며 에이전트의 기존 도구 승인 처리를 자동 승인하지 않는다.
- 캡처는 에이전트별 최신 한 장을0600 임시 파일로 제공하며 수동 모드 전환/연결 끄기/브라우저 도구 서비스 종료에 정리한다. capability·원본 URL·페이지·키 입력·쿠키·브라우저 진단을 일반 로그/브리지 메타데이터에 저장하지 않는다. 사용자가 제어를 넘긴 뒤 에이전트가 캡처를 읽어 작업 맥락에 사용하는 흐름과 Firefox 자체의 사이트 기록은 구분한다.
- 화면 이동은 실행을 유지한다. 종료는 소유 프로세스만 처리하고 Firefox 뒤 X 서버를 정리한다. 브리지 재시작은 목록을 유지하되 `lost`로 표시하고 실행/PTY 출력을 복원했다고 표시하지 않는다. Android native는 고정 X11 component와 UUID tag만 허용하며 Demo·구형 브리지·iOS에는 진입을 숨긴다.

같은 폰의 실제 X11·Firefox에서 임시 프로필/로컬 페이지로 한글 입력·화면 캡처·마우스 클릭·스크롤·파일 선택창 focus/Escape·로그인 모드 캡처 차단을 검사했다. 별도 배포 작업에서 실제 Google 로그인/Play 게시도 성공했지만 새 APK의 설치 안내부터 로그인까지 전체 흐름을 검증한 것은 아니다. 새 설치·Android WebView·절전/백그라운드·패스키·여러 실제 모델의 도구 호출은 후속 검증이다.

공식 근거: [Termux:X11 설치와 tag별 창](https://github.com/termux/termux-x11#readme), [Termux Firefox 패키지](https://github.com/termux/termux-packages/blob/master/x11-packages/firefox/build.sh), [Codex app-server](https://developers.openai.com/codex/app-server), [Claude SDK system prompt append](https://platform.claude.com/cookbook/claude-agent-sdk-06-the-vulnerability-detection-agent), [OpenCode 서버 API](https://opencode.ai/docs/server/), [Google 로그인 안내](https://support.google.com/accounts/answer/7675428?hl=ko). Codex 필드는 설치된 CLI의 `app-server generate-json-schema`에서도 대조했다.

## 구독 한도 수집 (2026-10-21, 미배포)

선택한 Chat 네이티브 실행의 계정 사용 한도를 `subscription_usage: {state, windows, updated_at}`로 전달한다. `windows`는 최대16개로 ID·기간/이름·사용률·초기화 시각·선택적 상태·보고 시각만 포함한다. 토큰/비용/계정명/이메일/자격증명/크레딧 정보와 원본 응답은 전달하지 않으며 메타데이터에도 저장하지 않는다. 서로 다른 실행/계정의 전역 캐시를 만들거나 세션 토큰을 합산하지 않는다. `used_percent: null`과 실제0%를 구분한다. 공유 Chat snapshot/events를 쓰므로 새 Android HTTP 허용 경로나 자산 파일은 없다.

- **Codex:** thread 초기화 뒤 같은 app-server의 읽기 전용 `account/rateLimits/read`를 요청하고 선택한 세션의 기존 events 폴링에서 최소60초 간격으로 갱신한다. 요청은10초 지나면 폐기하며 실패/미지원/형식 오류가 Chat 시작·응답·대기열을 실패시키지 않는다. 응답 중에도 네이티브 계정 조회만 수행하고 모델 입력/PTY 명령을 주입하지 않는다. [공식 App Server 계정 API](https://developers.openai.com/codex/app-server#6-rate-limits-chatgpt).
- `rateLimitsByLimitId`가 있으면 그 뷰를 사용하고, 없으면 구형 `rateLimits`를 사용한다. 네이티브 `limitId`와 primary/secondary로 구분하고 `windowDurationMins`를 보존한다. `account/rateLimits/updated`는 희소 보고라 없는/null 값을0으로 덮지 않고 기존 기간에 병합한다. 초기화 시각만 다음 기간으로 바뀌면 이전 비율은 지운다. 더 최신 push가 도착한 뒤 늦게 반환한 read는 덮어쓰지 않는다. `account/updated`는 캐시/대기 응답을 무효화하고 새 계정에서 읽는다. 크레딧 소비/한도 초기화/구매/안내 이메일 요청은 하지 않는다.
- **Claude:** 주 실행의 `rate_limit_event.rate_limit_info`에서 선택적 `unifiedWindows` 또는 구형 최상위 utilization을 읽는다. 이 경로는 **소수 비율**(0.35→35%, 1→100%)이고 `/usage`의 구조화된 `usage_report.rate_limits`는 **퍼센트**(1→1%)이므로 별도 변환한다. 알려진5시간/7일/Opus/Sonnet/추가 사용 구간만 받아 상태/시각만 온 경우 비율을 만들지 않는다. 하위 에이전트 이벤트는 제외한다. `unifiedWindows`는 모든 SDK 타입에 선언된 안정 계약이 아니므로 형태를 확인하고 실제 값이 있을 때만 사용한다. [공식 저장소의 CLI 보고 형태/제약](https://github.com/anthropics/claude-code/issues/91857), [배포된 SDK 계약](https://unpkg.com/@anthropic-ai/claude-agent-sdk@0.3.301/sdk.d.ts).
- 사용자가 직접 실행한 명령에서 구조화된 `usage_report`가 오면 기간별 값을 받을 수 있지만, 표시를 위해 `/usage`나 모델 턴을 자동 전송하지 않고 실험적 SDK 조회 메서드도 호출하지 않는다. 새 SDK query나 auth_status는 이전 계정 창을 지운 후 새 보고를 기다린다. 다른 활성 turn의 지연 보고도 무시한다. 지원하지 않는 CLI/SDK/로그인은 확인 불가이며 OpenCode/Gemini의 별도 구독 조회는 미구현이다.

UI는 사용량/남은 양 설정을 적용하고 위험한 기간을 접근 권한 설정 줄의 원형 게이지에 우선 표시한다. `details/summary`와 기존 수치 renderer를 재사용하고 SVG의 정규화된 원형 호에 선택한 비율을 전달한다. 접힌 요약에는 원형만 표시하고, 상세 팝업에는 컨텍스트의 가로 meter와 구독 기간별 가로 meter를 표시한다. 막대도 같은 사용량/남은 양 기준과 경고색을 적용하며 미제공·만료 값은 숨긴다. 구독 기간별 마지막 확인 상태와 경고 수준은 해당 기간의 보고를 따른다. 상세는 입력부 높이를 늘리지 않는 위쪽 팝업이며 바깥 터치/Escape/Android Back·탭/세션 전환으로 닫힌다. 초기화 시각이 지나면 새 보고 전까지 갱신 대기로 표시하며0%로 추정하지 않는다. 연결 끊김·종료·조회 실패 또는 보고 후5분이 지나면 마지막 확인 값으로 구분한다. 상대 초기화 시간과 기기의 현지 시각을 제공한다. 기존 snapshot/events·표시 설정을 그대로 쓰며 새 브리지 조회·네이티브 권한·자산·의존성은 없다. 이 기능의 추가 네트워크 조회는 Codex CLI가 담당하며 Bibimer가 인증 토큰을 읽어 비공개 계정 API를 직접 호출하지 않는다.

## OpenCode·Gemini 계정 한도 조사 (2026-10-21, 연동 미구현)

공식 문서와 Bibimer iOS에 고정한 OpenCode1.19.3·Gemini CLI0.64.0 소스를 기준으로 조사했다. Termux의 설치된 OpenCode는1.17.13이며 Gemini 실행 경로는 존재하지만 실제 실행은 `No such file or directory`로 실패했다. 실제 로그인 계정의 quota 조회나 모델 실행은 하지 않았으므로 다음은 **수집 경로의 확인과 구현 방향**이며 지원 완료가 아니다.

| 대상 | 확인된 계정 데이터 경로 | 현재 Bibimer 연결에서의 제약 |
| --- | --- | --- |
| OpenCode Go/Go Plus | Go API의 사용률·초기화 시각. 현재 문서는 모델별5시간/주간/월간 한도를 설명한다. | 로컬 OpenCode HTTP API의 provider 목록/인증 메서드/메시지 토큰만으로는 계정 quota를 받을 수 없다. Go 계정에 별도로 인증한 읽기 경로가 필요하다. |
| OpenCode의 다른 제공자 | 연결한 제공자별 계정 API에 따라 다름. | Go 한도를 다른 제공자 모델에 표시하거나 별도 Codex·Claude 실행의 계정을 대신 사용할 수 없다. API 과금/잔액도 구독 사용률로 바꾸지 않는다. |
| Gemini Google 로그인 | Code Assist `retrieveUserQuota`의 모델별 잔여 비율·선택적 잔여량·초기화 시각. | Gemini0.64.0의 ACP는 이 계정 보고를 전달하지 않는다. 같은 네이티브 인증 문맥을 사용하는 별도 구조화 조회 통로가 필요하다. |
| Gemini API 키·Vertex AI | 로그인 방식/프로젝트별 서비스 quota. | Google 로그인 quota와 같다고 가정할 수 없으며 위 경로를 모든 로그인에 적용하지 않는다. |

### OpenCode Go

- [공식 Go 문서](https://opencode.ai/v2/docs/console/go/)는 Go를 선택적 제공자로 설명하고 모델별5시간·주간·월간 한도 및 Console 조회를 안내한다. OpenCode 자체에 로그인한 모든 제공자의 구독 한도가 하나 있는 구조가 아니다.
- [OpenCode1.19.3의 Go 사용량 GET 구현](https://github.com/anomalyco/opencode/blob/v1.19.3/packages/console/app/src/routes/zen/go/v1/usage.ts)은 `Authorization: Bearer`로 키를 검증하고 `usage.rolling/weekly/monthly` 각각의 `percent`, `resetsAt`, `status`를 반환한다. 이 구형 구현은 계정 단위3개 창이며 최신 문서의 모델별 한도와 범위가 같다고 단정하지 않는다. [같은 버전의 inference 이관 코드](https://github.com/anomalyco/opencode/blob/v1.19.3/packages/console/app/src/lib/inference-proxy.ts)는 `GET /zen/go/v1/usage`를 새 inference의 `/go/v1/usage`로 전달한다.
- 조사 시 `https://opencode.ai/zen/go/v1/usage`와 `https://opencode.ai/inference/go/v1/usage`에 **자격증명 없는 GET**을 각각 한 번 보내 두 경로 모두 HTTP401·JSON 응답임을 확인했다. 인증 후200 응답의 현재 스키마/모델별 범위/구독 종류는 미검증이다. 응답 본문이나 사용자 자격증명을 읽거나 저장하지 않았다.
- 확인한 [provider API 정의](https://github.com/anomalyco/opencode/blob/v1.19.3/packages/opencode/src/server/routes/instance/httpapi/groups/provider.ts)와 배포 SDK에는 범용 계정 quota 조회가 없다. 기존 `bridge/provider_opencode.py`도 세션 메시지/상태와 모델 목록만 읽는다. 메시지 비용·토큰·컨텍스트 사용량을 Go 사용률로 계산하지 않는다.
- 후속 구현은 **활성 모델의 제공자가 Go인 경우**부터 한정한다. CLI가 실제 사용한 키/환경/설정과 일치하는지 확인하는 경로가 선행돼야 한다. 키는 네이티브 측에서만 다루고 고정 공식 origin의 GET에만 사용한다. 임의 base URL/리다이렉트로 키를 보내지 않으며 상태 파일·로그·WebView에는 허용한 수치만 전달한다. 제공자/키/모델 변경 뒤 이전 창을 무효화하고 최신 응답이 모델별이면 모델별로 분리한다. 별도 플러그인 설치·Console 쿠키 추출은 이 조사에서 수행하지 않았다.

### Gemini CLI

- [공식 명령 문서](https://geminicli.com/docs/reference/commands/#stats)의 `/stats model`은 모델 토큰 통계와 quota를 구분해 보여준다. [0.64.0의 stats 구현](https://github.com/google-gemini/gemini-cli/blob/v0.64.0/packages/cli/src/ui/commands/statsCommand.ts)은 `config.refreshUserQuota()`를 호출한다. 이 UI 함수는 크레딧 조회도 병행하므로 사용량 연동을 위해 통째로 실행하지 않는다.
- [Code Assist 서버 구현](https://github.com/google-gemini/gemini-cli/blob/v0.64.0/packages/core/src/code_assist/server.ts)은 기본적으로 Google의 `https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota`에 현재 로그인 문맥과 `project`를 담아 POST한다. 이는 모델 생성이 아닌 조회지만 **Google 내부 API**이며 Bibimer용 안정 공개 API로 보장된 것은 아니다. [공식 타입](https://github.com/google-gemini/gemini-cli/blob/v0.64.0/packages/core/src/code_assist/types.ts)의 bucket에는 `modelId`, `remainingFraction`, `remainingAmount`, `resetTime`, `tokenType`이 선택 필드로 있다.
- 유효한 `remainingFraction`이 있으면 남은 비율은 `100 × remainingFraction`, 사용률은 `100 × (1 - remainingFraction)`로 변환할 수 있다. `remainingAmount`가 없거나0이어도 잔여 비율을 버리지 않는다. 필드 부재를0/소진으로 추정하거나 모델 bucket들을 임의 합산하지 않으며 초기화 시각도 고정된24시간으로 만들지 않는다. 이 값은 Gemini CLI/Code Assist 서비스의 한도이지 Gemini 앱 전체 구독 사용량이 아니다.
- [0.64.0 ACP 세션 구현](https://github.com/google-gemini/gemini-cli/blob/v0.64.0/packages/cli/src/acp/acpSession.ts)의 `usage_update.used/size`는 컨텍스트 수치다. PromptResponse의 `usage`와 `_meta.quota.token_count/model_usage`는 **해당 턴의 모델 토큰 통계**다. `quota`라는 이름만 보고 잔여 구독 한도로 처리하지 않는다. 이 버전 소스에서 컨텍스트 `usage_update` 발행은 확인했지만 실제 계정 실행 검증을 대신하지 않는다.
- [ACP 명령 등록](https://github.com/google-gemini/gemini-cli/blob/v0.64.0/packages/cli/src/acp/acpCommandHandler.ts)에 `/stats`는 없고 [ACP RPC 구현](https://github.com/google-gemini/gemini-cli/blob/v0.64.0/packages/cli/src/acp/acpRpcDispatcher.ts)에도 계정 quota 조회가 없다. `/stats model`을 ACP prompt로 자동 전송하면 일반 모델 입력으로 넘어갈 수 있으므로 조회 수단으로 사용하지 않는다.
- 후속 구현은 동일 Gemini 프로세스의 Config/CodeAssistServer에서 quota만 읽어 제한한 필드를 전달하는 버전 고정 확장 또는 공식 ACP 확장을 검토한다. 별도 helper를 쓰면 현재 인증 방식·프로젝트·계정과 일치하는지 및 자동 로그인/브라우저 실행·토큰 갱신·API 호스트를 먼저 검증해야 한다. 현재 iOS Gemini 어댑터에 이 기능을 구현하지 않았으며 Android의 정식 Gemini 지원 여부와도 별개다.

두 제공자 모두 후속 연동 시 기존 `subscription_usage`와 **사용량(기본)/남은 양** 선택을 재사용할 수 있다. 조회는 최소60초 간격·중복 방지·유한 대기 시간을 두고 계정 변경·기간 만료·오래된 값·실패를 Codex/Claude와 같은 규칙으로 다룬다. 조회 실패는 Chat/승인/대기열을 실패시키지 않는다. 이번 조사는 제품 코드·의존성·CLI 설치·운영 세션을 변경하지 않았다.

## 컨텍스트 수치 전달 (2026-10-21, 미배포)

Chat snapshot/events의 선택 필드 `context_usage`는 `{used_tokens, limit_tokens, estimated, updated_at}` 또는 `null`이다. 한도가 없으면 `limit_tokens: null`이며 사용량 0과 보고 없음은 다르다. JSON 안전 정수만 받고 음수·불리언·문자열 수치는 거절한다. 에이전트의 실제 네이티브 thread ID가 일치해야 하며 다른 활성 turn의 늦은 보고는 무시한다. 갱신은 revision을 올려 기존 폴링/재접속으로 전달하고, 수치를 브리지 메타데이터에 저장하지 않는다. 따라서 브리지 재시작 후 유실 세션의 수치를 현재 값처럼 복원하지 않는다.

- **Codex:** 공식 `thread/tokenUsage/updated`의 `tokenUsage.last.totalTokens`와 `modelContextWindow`를 사용한다. `total`은 누적값이므로 사용하지 않는다. 캐시/추론은 네이티브 total에 다시 더하지 않는다. `contextCompaction`/구형 `thread/compacted`는 이전 값을 무효화하고 다음 사용량 보고를 기다린다. 설치된 CLI의 `generate-json-schema` 계약도 확인했다. [공식 App Server 이벤트](https://developers.openai.com/codex/app-server#turn-events).
- **Claude:** 주 실행의 최신 assistant `message.usage`에서 input/cache read/cache creation/output을 합산한다. 하위 에이전트 보고를 제외하고 메시지를 합산하지 않는다. result의 `modelUsage`에서는 정확히 일치하는 모델의 `contextWindow`만 취하며 누적 토큰은 사용하지 않는다. assistant 출력 수치는 placeholder일 수 있어 전체를 근사치로 표시한다. CLI가 `/context`의 구조화된 `context_usage`를 보내면 이를 사용하되 명령은 자동 실행하지 않는다. compact boundary/reset은 이전 값을 무효화한다. [공식 SDK 사용량 범위](https://code.claude.com/docs/en/agent-sdk/cost-tracking).
- **OpenCode:** 현재 세션 메시지 중 마지막 유효 assistant 토큰의 input/output/reasoning/cache read/cache write를 한 번만 합산한다. 진행 중인 0 placeholder는 직전 보고를 지우지 않는다. 그 메시지의 providerID/modelID로 로컬 `/provider` 메타데이터의 `limit.context`를 찾고 한도가 없거나 조회 실패해도 대화를 실패시키지 않는다. 캐시와 메시지 비교로 중복 보고를 줄인다. [공식 모델 한도](https://docs.opencode.ai/docs/providers/#custom-provider).
- **Gemini(iOS):** ACP `usage_update`의 `used`/`size`를 정규화한다. CLI가 해당 이벤트를 보내지 않는 버전에서는 확인 불가를 유지하며 `_meta.quota`나 모델 이름에서 컨텍스트를 추측하지 않는다. 실제 CLI의 이벤트 발행 여부는 별도 검증이 필요하다. [공식 저장소의 ACP 사용량 보고 이슈](https://github.com/google-gemini/gemini-cli/issues/29389).

UI는 한도가 있을 때만 사용/남은 비율을 계산하며 100%를 넘어선 원본 사용량도 보존한다. 앱 공통 `contextDisplay: used | remaining`을 Android `InputPreferences`의 `context_display` 및 iOS UserDefaults의 `contextDisplay`에 저장한다. 기본/잘못된 저장 값은 `used`다. Android는 commit 성공 뒤 메모리 값을 바꾸며 저장 실패 시 기존 표시를 유지한다. 비율·막대·토큰 상세는 선택한 기준 하나만 표시한다. 사용량 모드는 100% 초과 비율도 표시하고 막대는 100%에서 제한한다. 남은 양은 비율/토큰 0을 하한으로 하며, 한도가 없으면 계산하지 않고 확인 불가를 표시한다. 색의 주의 단계는 어느 모드든 사용률로 결정한다. 이 설정은 브리지에 보내지 않으며 프로세스/모델/초안/대기열/승인을 변경하지 않는다. 요청 후 마지막 보고이므로 작성 중인 초안이나 아직 보고되지 않은 도구 출력까지 실시간으로 포함한다고 보장하지 않는다. PTY·대화 문자 수·누적 청구 토큰 기반의 추정은 하지 않는다.

## 실행 경계

Bibimer 앱은 입력·상태·터미널 화면을 제공한다. 프로젝트 경로 검증, 폴더 생성, 프로그램 탐색, 프로세스 실행과 제어는 같은 기기의 Termux 브리지가 담당한다. Android 앱이 Termux 전용 파일 경로를 직접 읽지 않는다.

Python 브리지는 `127.0.0.1`에만 바인드하고, Host가 해당 주소·포트와 일치해야 한다. 브라우저 Origin 헤더가 있는 요청은 거절한다. Android 네이티브 HTTP 클라이언트는 고정 주소만 사용하며 프록시와 리다이렉트를 사용하지 않는다.

## 연결과 인증

`start` 또는 `pair`를 Termux 터미널에서 실행하면 일회용 코드가 표시된다. 코드의 해시·만료 시간·시도 횟수만 상태 폴더에 기록한다. 5분 또는 실패 5회 뒤 무효이며 성공 시 즉시 폐기한다.

앱이 `POST /v1/pair`로 연결 코드를 보내면 인증 토큰을 받는다. 토큰은 Android 네이티브 코드에서 보관하고 나머지 API의 `Authorization: Bearer …` 헤더에 사용한다. 토큰과 세션 출력은 URL, 일반 로그, 저장소에 넣지 않는다.

## 앱에서 시작하는 Termux 준비 (미배포 소스)

`TermuxSetup`은 명시적인 사용자 버튼 조작으로 `com.termux.app.RunCommandService`의 `RUN_COMMAND`를 요청한다. Android의 `com.termux.permission.RUN_COMMAND` 권한과 Termux `allow-external-apps=true`가 필요하며, 허용 설정은 사용자에게 안내한다. 실행 경로는 Termux bash로 고정하고 APK에 포함한 `quick-setup.sh`·설치 스크립트·`setup-connect.py`를 stdin으로 전달한다. WebView에서 임의 실행 파일·명령·주소를 받을 수 없다. 공유 저장소 접근이나 추가 Termux 플러그인을 사용하지 않는다.

Python이 없으면 패키지 설치를 요청하고, 준비 도우미는 전용 설치 잠금 아래 누락된 브리지만 설치한다. 기존 브리지 파일은 교체하지 않으며 살아 있는 세션을 종료하지 않는다. 백그라운드에는 `/dev/tty`가 없으므로 대화형 `start` 출력에 의존하지 않고 동일한 `serve` 데몬을 시작한다. 인증된 health 확인 후 기존 5분·1회 코드 발급을 사용한다.

결과는 명시적 대상·고유 URI·`FLAG_ONE_SHOT`·`FLAG_MUTABLE`인 PendingIntent를 통해 비공개 `TermuxSetupReceiver`로 돌아온다. 진행 중 작업 ID·만료·결과 형식을 확인하고 네이티브 `LocalBridge`가 코드를 교환해 Android Keystore로 토큰을 저장한다. 결과 원문·코드·토큰은 JavaScript·로그·URL·공유 파일에 보내지 않는다. Termux 백그라운드 작업의 로그 수준도 0으로 지정한다. 콜백을 받을 수 있도록 PendingIntent만 변경 가능하며 수신 컴포넌트는 exported=false다.

앱 전용 설정에는 작업 ID·시작 시각·단계만 보관한다. 화면 재생성 후 진행 상태를 복원하고, 연결 정보 지우기는 진행 중 콜백도 무효화한다. 콜백 처리와 연결 초기화는 같은 잠금으로 직렬화한다. HTTP 코드 교환은 연결 2초·읽기 4초 제한을 둔다. 스크립트는 Android Intent 크기 제한을 고려해 UTF-16 440KB 이하로 제한한다. 15분 만료 후 자동 재실행하지 않으며 사용자가 Termux 상태를 확인한다. 기존 수동 경로는 계속 제공한다.

근거: [Termux RUN_COMMAND·권한·결과 전달](https://github.com/termux/termux-app/wiki/RUN_COMMAND-Intent), [설치 대상 0.118.3 서비스 구현](https://github.com/termux/termux-app/blob/v0.118.3/app/src/main/java/com/termux/app/RunCommandService.java), [결과 상수](https://github.com/termux/termux-app/blob/v0.118.3/termux-shared/src/main/java/com/termux/shared/termux/TermuxConstants.java), [Android PendingIntent](https://developer.android.com/guide/components/intents-filters#PendingIntent). 실제 Android 권한 창·프로세스 재생성·결과 수신과 기기별 백그라운드 제약은 다음 빌드 설치 후 검증한다.

## API

요청·응답은 JSON이고, 입력·출력 바이트는 base64로 전달한다. 페어링 외 모든 API에 인증이 필요하다.

0.1.1 이상의 오류 응답은 안정적인 `code`와 영어 기본 `error` 문구를 포함한다. 앱은 `code`에 대응하는 영어·한국어 문구를 표시한다. 실행 중인 0.1.0 브리지도 재시작 없이 사용할 수 있도록 코드가 없는 기존 한국어 오류를 대응 문구로 변환한다. 터미널 출력은 이 번역 경로를 거치지 않는다.

| 메서드·경로 | 역할 | 주요 요청 값 |
| --- | --- | --- |
| `POST /v1/github` | GitHub 계정·저장소·클론 작업 | `action`: status/poll/login/cancel_login/repositories/clone/cancel_clone |
| `POST /v1/pair` | 일회용 연결 코드 교환 | `code` |
| `GET /v1/health` | 인스턴스, 전체 프로젝트·세션 상태, 선택 프로젝트, 프로그램 탐지 | 없음 |
| `POST /v1/project` | 폴더 추가·선택 | 추가: `path`, `create`, `add: true`; 전환: `project_id` |
| `POST /v1/project/manage` | 프로젝트 이름 변경·등록 해제·순서 변경 | `project_id`, `action`: `rename`(+ `name`) 또는 `delete`; 실행 세션이 있으면 삭제 거절. 파일·워크트리·원본 기록 유지. `project_management` 기능 표시 필요. `project_ordering`이 있으면 `move_up`/`move_down`으로 인접 프로젝트와 위치 교환하며 `project_order` ID 배열 반환. `project_drag_ordering`이 있으면 `move_to`(+ 0부터 시작하는 정수 `position`)로 한 번에 삽입 이동하고 같은 `project_order`를 반환. 범위/타입 오류는 400, 저장 실패 시 메모리 순서도 롤백. 기존 프로젝트 배열 순서로 저장/복원하고 현재 프로젝트·세션은 유지 |
| `POST /v1/project-agent` | 프로젝트의 선택 에이전트 변경·기존 세션 복원 (0.10.0) | `project_id`, `agent`; 프로세스를 시작/종료하지 않음 |
| `POST /v1/project-session` | 목록의 세션 선택·새 시작 화면 (0.10.0) | `project_id`, `session_id`; null이면 `agent`의 새 시작 화면. 프로세스 변경 없음 |
| `POST /v1/worktrees` | 실제 Git 워크트리 조회 (0.10.0) | `project_id`; 프로젝트 폴더·연결 경로·branch·available 반환 |
| `POST /v1/worktrees/manage` | 워크트리 생성·진행 조회·세션 시작 (미배포 소스) | `worktree_creation` 기능 필요. `action`: `options` / `status` / `create` / `launch`, `project_id` 필수. `create`: UUID `request_id`, `branch`, 전체 커밋 해시 `base`, `agent`, `mode`, `options`. `launch`: 생성 작업의 `request_id`. 생성과 실행의 중복 방지 영수증을 각각 유지 |
| `POST /v1/inspect` | 등록 프로젝트·워크트리의 읽기 전용 파일/Git 조회 (0.14.0) | `project_id` 필수, `worktree_path` 선택, `action`: `files` / `file` / `status` / `history` / `diff` / `commit`. `workspace_inspector` 기능 표시 필요 |
| `POST /v1/sessions/{id}/manage` | 세션 이름·보관·목록 삭제 (0.10.0) | `action`: `rename`(+ `title`), `archive`, `restore`, `delete`. 삭제는 실행 중 거절 |
| `POST /v1/models` | 프로젝트·에이전트별 네이티브 모델/추론 목록 (0.10.0) | `project_id`, `agent`, `refresh` (선택) |
| `POST /v1/folders` | Termux 하위 폴더 탐색, 상태 변경 없음 | `path` (기본 `~`), `hidden` (기본 false), `after` (다음 페이지의 이름 커서) |
| `POST /v1/session-history` | 현재 프로젝트의 저장된 에이전트 세션 조회 | `project_id`, `agent` (`codex` 기본 / `opencode` / `claude`), `search` (제목), `cursor` |
| `POST /v1/sessions` | 지정 프로젝트의 세션 시작·가져오기 | `project_id`, `agent` (`shell`, `codex`, `claude`, `opencode`), `mode` (`terminal` 기본 / `chat`), `request_id`, `cols`, `rows`, `options` (0.8.0); 가져오기: `source_thread_id`, `import_mode` (`fork` / `resume`), `mode: chat` |
| `GET /v1/sessions/{id}/events` | 출력 및 실제 프로세스 상태 | `cursor` (PTY 바이트 위치 / Chat 변경 번호), `wait` (0~20초) |
| `POST /v1/sessions/{id}/input` | 입력 바이트 전송 | `data` (base64), `request_id` (UUID) |
| `POST /v1/sessions/{id}/resize` | PTY 크기 변경 | `cols` (20~300), `rows` (4~200) |
| `POST /v1/sessions/{id}/options` | Chat의 다음 입력 설정 변경·보관 (0.8.1) | `options` (권한·Codex Fast, 0.10.0: `model`·`effort`), `request_id` |
| `POST /v1/sessions/{id}/message` | Chat의 새 메시지 | `text`, `request_id`, Codex 전용 `fast` (boolean, 선택) |
| `POST /v1/sessions/{id}/queue` | Chat 대기열 추가·개별 취소·재개·Steer (대기 항목 Steer는 0.10.0) | `action` (`add` / `remove` / `resume` / `steer`), `request_id`; 추가: `text`, 취소: `entry_id`, Steer: `entry_id`·`turn_id` |
| `POST /v1/sessions/{id}/steer` | 진행 중 Codex 턴에 추가 입력 (0.9.0) | `text`, `turn_id` (현재 턴), `request_id` |
| `POST /v1/sessions/{id}/respond` | 대기 중인 승인·질문에 응답 | `prompt_id`, `request_id`, `decision` 또는 `answers` |
| `POST /v1/sessions/{id}/interrupt` | Chat의 현재 응답만 중단 | 빈 객체 |
| `POST /v1/shutdown` | CLI 업데이트용 브리지 종료, 실행 세션이 있으면 거부 | 빈 객체 |
| `POST /v1/sessions/{id}/stop` | 해당 실행 세션 중지 | 빈 객체 |

여러 프로젝트를 등록하며 0.10.0 브리지는 **동일 에이전트의 여러 세션**을 허용한다. 실행·이전 상태를 세션 UUID로 분리하고 `selected_agents`와 `selected_sessions[project_id][agent]`에 마지막 선택을 보관한다. `new_session: true`를 명시하면 기존 실행을 유지한 채 추가하며 구형 클라이언트의 기본 실행은 같은 에이전트가 실행 중이면 거절한다. 새 시작 화면은 선택 포인터만 null로 바꾼다. 프로젝트·에이전트 전환은 기존 프로세스를 종료하지 않는다. 입력·응답·종료는 세션 ID로 전달하고 실행 명령은 허용된 프로그램 ID에서 선택한다. 이전 0.9.0 브리지는 프로젝트당 세션 하나다.

0.3.1은 `features` 배열의 `browse_folders` 항목으로 폴더 탐색 지원을 알린다. 폴더 API도 인증·로컬 Host·Origin 검사를 거치며 Android는 고정된 `/v1/folders` 경로만 허용한다. `path`·`parent`·`entries`(이름/경로)·`next`·`writable`을 반환한다. 한 단계의 폴더를 이름순으로 최대 100개씩 반환하고 스캔 메모리는 한 페이지로 제한한다. 파일 내용을 열거나 하위 폴더를 재귀 탐색하지 않는다. 심볼릭 링크는 열 때 실제 경로로 정규화하며 Termux가 접근 가능한 경로를 사용한다. 페이지 사이 폴더 변경은 새로 탐색할 때 반영된다. 선택 후 기존 프로젝트 등록 API에서 접근 권한을 다시 확인한다.

`health.projects`는 각 프로젝트와 선택 에이전트 `agent`, 해당 `session`, 모든 `sessions` 메타데이터를 반환한다. `active_sessions`는 보관된 세션까지 포함한 전체 실행 중·종료 중 수다. `features`의 `multiple_projects`·`agent_sessions`·`session_library`·`git_worktrees`로 기능을 확인한다. 기존 앱용 `project`·`session` 필드를 유지하고 프로젝트 ID가 없는 실행은 마지막 선택 프로젝트를 사용한다. 기존 앱의 폴더 교체 요청(`add` 없음)은 현재 세션 실행 중 거절한다.

메타데이터 형식 4는 전체 프로젝트·세션·선택 포인터·사용자 지정 이름·보관 상태를 저장한다. 형식 3·2·단일 프로젝트 파일에서 기존 세션을 보존하며 인증 토큰을 유지한다. 실제 작업 경로도 유지해 워크트리 세션을 프로젝트 루트로 바꾸지 않는다. 실행 프로세스에 다시 붙지 않으며 이전 `running`·`stopping` 상태는 재시작 시 `lost`로 바꾼다. 대기열 내용·입력/질문 초안·대화 출력은 메타데이터에 저장하지 않는다. 목록 삭제는 원본 CLI 기록·프로젝트 파일을 건드리지 않고, 최근 삭제 1,024건의 실행 요청 ID를 기억해 지연된 재시도가 새 프로세스를 만들지 않게 한다.

보관·복원은 메타데이터만 변경하며 실행 중인 요청·대기열·프로세스를 유지한다. 같은 원본 세션을 중복 이어하기하면 기존 실행/초기화 중인 세션까지 확인해 거절한다. 종료·유실된 Chat의 이어하기는 기존 가져오기 API에 네이티브 ID와 실제 작업 경로를 전달한다.

`worktree_path`는 실행·원본 기록 조회·모델 목록에서 선택 가능하다. 프로젝트의 등록 경로 또는 `git worktree list --porcelain -z`가 반환한 사용 가능한 경로만 받는다. 폴더명 공백·유니코드·줄바꿈을 보존하며 Git 조회는 별도 프로세스에서 3초 제한으로 수행한다. 모델 목록 캐시는 프로젝트·작업 경로·에이전트로 분리한다. 근거: [Git worktree 공식 문서](https://git-scm.com/docs/git-worktree).

미배포 소스의 `WorktreeCreation`은 커밋이 있는 Git 프로젝트에 `git worktree add`를 실행한다. 로컬 브랜치가 없으면 선택한 고정 커밋에서 `-b`로 만들고, 있으면 해당 브랜치 tip을 그대로 사용한다. 이미 체크아웃된 브랜치·기존 폴더·심볼릭 링크를 거절하고 force/reset·fetch·파일 복사·후크 실행은 하지 않는다. 경로는 브리지 상태 폴더의 `worktrees/<project-id>/<branch-slug>-<hash>`로 정하며 외부 입력 경로를 받지 않는다. 생성 중 실제 Git 목록의 경로는 실행 불가로 표시한다.

Git 생성은 최대 5분의 별도 프로세스에서 처리하고 `worktree-jobs.json`에 먼저 요청 영수증을 저장한다. 동시에 1개, 누적 작업 128개·프로젝트의 실제 워크트리 120개로 제한한다. 화면을 닫아도 생성은 유지하고 진행 중에는 프로젝트 등록 해제와 정상 브리지 종료를 거절한다. 강제 종료 후에는 Git의 실제 경로·브랜치·잠금 상태를 확인해 완성된 작업만 복구하며 프로세스나 세션을 자동 복원하지 않는다. 세션 시작은 고정된 별도 실행 ID를 재사용하고 선택 포인터를 바꾸지 않으며 앱의 명시적 세션 열기로 이동한다. 실행 실패 시 워크트리·브랜치를 보존한다. 워크트리·브랜치 삭제 기능은 제공하지 않는다.

시작 요청은 프로젝트·프로그램·방식과 `request_id`가 같으면 같은 세션을 반환하며 다른 프로젝트의 실행 ID 재사용은 거절한다. 입력은 최근 512개 요청 ID를 기억하고 중복 전달을 막는다. 입력은 요청당 최대 16KiB다. 부분 전송이나 응답 유실 시 앱은 자동으로 재전송하지 않고 사용자가 출력을 확인하도록 안내한다.

## 파일·Git 조회 (0.14.0, 운영 브리지 적용 대기)

`/v1/inspect`는 인증·Host·Origin 검사 후 등록 프로젝트와 실제 Git 워크트리를 검증한다. `files`는 상대 `path`, `hidden`, `offset`을 받고 200개씩 반환한다(한 폴더 스캔 최대 20,000개). `file`은 상대 `path`의 UTF-8 내용 앞 128KiB를 반환한다. 경로 구성 요소마다 디렉터리 fd 기준 `O_NOFOLLOW`로 열며 절대 경로·상위 이동·`.git`·심볼릭 링크·일반 파일이 아닌 내용 읽기를 거절한다. `status`는 NUL 구분 porcelain v2로 파일명·rename·충돌을 읽고 200개씩 반환한다. `history`는 `offset` 및 고정된 전체 해시 `revision`으로 50개씩 반환한다. `diff`는 `path`와 `area`(`staged`/`worktree`), `commit`은 전체 해시 `revision`을 받는다.

Git 조회는 셸 없이 고정 인수로 실행하며 각 명령 5초·출력 256KiB를 제한한다. 인덱스 갱신을 피하도록 optional locks를 끄고 hooks·fsmonitor·external diff·textconv·clean/process 필터를 실행하지 않는다. 필터를 사용하는 저장소의 표시 결과는 필터가 적용된 CLI 결과와 다를 수 있다. diff/커밋 상세는 잘림을 명시하고 목록은 초과 시 오류를 반환한다. 조회는 세션 잠금 밖에서 수행하고 Android에서도 별도 제한된 executor를 사용해 입력 요청과 분리한다. 결과는 응답/화면 메모리에만 있으며 일반 로그·메타데이터에 저장하지 않는다. 공식 형식: [Git status](https://git-scm.com/docs/git-status), [Git log](https://git-scm.com/docs/git-log), [Git diff](https://git-scm.com/docs/git-diff).

## 응답 완료 이벤트와 Android 알림 (0.11.0)

`response_notifications` 기능 플래그와 인증된 `GET /v1/completions?cursor=N&instance=UUID|none&wait=0..20`를 제공한다. 현재 턴 ID와 일치하는 명시적 `turn/completed(status=completed)`에서만 전역 증가 ID를 발행한다. 별도 condition/deque에 최근 512개 `{id,session_id,project_id,agent,completed_at}`를 메모리에 저장한다. **0.11.1의 답변 미리보기**는 `preview` 필드를 추가하며, 현재 턴의 완료된 assistant 메시지만 최대 180자로 발췌한다. 명시적 `final_answer`를 우선하고 `commentary`는 제외한다. phase가 없는 제공자는 현재 턴에서 마지막으로 완료된 assistant 메시지를 사용한다. 미리보기는 메모리에만 유지하고 메타데이터 파일·로그에는 기록하지 않는다. 초기 ready·과거 대화·실패·중단·중복 완료·PTY는 발행하지 않는다. 보관 상태와 선택 프로젝트는 필터가 아니다.

응답은 `{instance,cursor,reset,gap,events}`다. OpenCode의 native parent message ID와 브리지 turn ID는 다르므로 어댑터가 현재 prompt에 속한 항목에만 `responseTurnId`를 붙인다. 과거 메시지는 미리보기 후보에서 제외하며 기존 대화 화면의 native 그룹 ID는 유지한다. 턴별 미리보기는 최대 200개 대화 항목이 잘려도 유지되고, 턴 종료/다음 시작에서 초기화한다. 원문 발췌의 Markdown·링크·ANSI·제어 문자를 정리하고 긴 답변에는 말줄임표를 붙인다.

처음 연결·인스턴스 변경·범위 밖 미래 cursor에는 `reset:true`와 현재 cursor, 빈 events를 반환해 과거 완료를 재생하지 않는다. 범위 내 재접속은 cursor 이후를 반환하고 보존 범위가 넘으면 `gap:true`와 남은 이벤트를 반환한다. 기다리는 동안 Bridge/Session 잠금을 잡지 않는다. 반환 전에 현재 프로젝트·세션 별칭을 추가하고 목록에서 삭제된 대상은 제외한다. 완료 목록은 메타데이터 파일에 영속화하지 않는다.

Android `ResponseNotificationService`는 UI와 별개 `LocalBridge`/TokenStore로 loopback long poll한다. foreground Activity의 연결 확인/사용자 토글에서만 서비스를 시작한다. POST_NOTIFICATIONS·앱/채널 차단을 검사하고 활성 서비스는 끌 수 있는 지속 알림을 표시한다. `specialUse` 타입·권한·세부 사유를 Manifest에 선언했다. 일반 dataSync나 외부 기기 연결로 분류하지 않는다. 근거: [서비스 타입](https://developer.android.com/develop/background-work/services/fgs/service-types), [백그라운드 시작 제약](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start).

앱은 처리한 인스턴스/cursor만 private preferences에 저장하며 알림 비활성/권한 해제/연결 삭제 시 지운다. 세대 번호와 잠금으로 진행 중 poll의 늦은 결과가 초기화한 cursor를 복원하지 못하게 한다. 완료 이벤트 ID별 고정 tag·OnlyAlertOnce와 게시 후 checkpoint로 일반 재접속 중복 알림을 방지한다. 알림 게시와 디스크 기록은 원자적 트랜잭션이 아니므로 강제 종료 시 정확히 한 번 전달을 보장하지 않는다. 완료 알림은 최근 40건을 유지한다.

알림은 immutable explicit Activity PendingIntent로 프로젝트/세션 ID만 전달한다. 앱이 이미 열렸으면 onNewIntent, 새로 열렸으면 첫 연결 후 대상 세션을 선택하고 삭제된 대상은 안내한다. 앱의 초안/대기열/승인과 프로세스를 유지하며 자동 실행하지 않는다. 구현 근거: [알림에서 Activity 열기](https://developer.android.com/develop/ui/views/notifications/navigation). 잠금 화면 공개 버전에는 프로젝트·세션 이름도 제외한다.

서비스는 START_NOT_STICKY이며 강제 종료/시스템 서비스 중지 후 앱을 열어 다시 연결한다. Boot receiver·자동 권한 변경·배터리 예외 신청은 하지 않는다. 화면 잠금/Doze/OEM 절전에서 전달 시점·지속성은 아직 실기기 검증 전이다. 0.11.0 앱 설치·운영 브리지 적용은 확인했다. 답변 미리보기는 0.11.1 APK에 포함했으며 운영 브리지 적용·앱 설치는 대기 중이다.

## 상태와 재접속

- 화면 연결: `Connected` / `Disconnected`(한국어: `기기 연결됨` / `연결 끊김`). 연결되지 않은 동안 프로세스 상태는 마지막 확인 값이다.
- 프로세스: `running`, `stopping`, `exited`, `lost`. 종료 코드는 실제 자식 프로세스의 반환값이며 신호로 종료되면 음수일 수 있다.
- 브리지 `instance`는 실행마다 바뀐다. 새 브리지는 이전의 `running`·`stopping` 메타데이터를 `lost`로 바꾸고 기존 PID에 재접속하거나 명령을 보내지 않는다.
- 0.2.1부터 재시작 직후 남은 마지막 세션의 `events` 조회는 종료·유실 상태와 빈 출력을 반환한다. 커서는 0으로 초기화되며 이전 커서가 전달되면 `gap`을 알린다. 이 기록에는 입력·종료 등의 조작을 허용하지 않으며 새 세션을 시작하면 이전 ID는 더 이상 조회하지 않는다. 종료 기록 조회가 연결 오류로 처리되어 새 세션 시작을 막는 문제를 방지한다.
- 화면 비활성·Activity 파괴는 출력 폴링을 중단한다. 세션 종료 API를 호출하지 않는다.
- 프로젝트·에이전트 전환 시 현재 폴링을 취소하고 요청 세대를 바꾼다. 지연된 출력·전송 응답이 다른 세션의 화면이나 입력을 변경하지 않게 확인한다. 프로젝트·에이전트별 입력 초안·프로그램 선택·질문 답변 초안은 화면 메모리에만 보관하며 앱 프로세스 종료 후에는 복원하지 않는다. 최근 출력과 대기열은 해당 세션의 브리지 메모리에서 다시 읽는다.
- 앱의 별도 Settings 페이지는 연결 전에도 사용할 수 있다. Enter 설정은 `InputPreferences`가 Android `input` 환경 설정의 `enter_behavior`에 `newline` 또는 `send`로 저장하고 성공한 저장만 화면에 반영한다. 기본·알 수 없는 값은 `newline`이다. 네이티브 `environment().enterBehavior`와 검증된 `setEnterBehavior`로 연결하며 Chat/PTY 공통 입력창에만 적용한다. 줄바꿈 설정에서는 Ctrl+Enter로 전송/대기열 추가, 보내기 설정에서는 Ctrl+Enter로 줄바꿈하며 Shift/Meta/Alt+Enter는 항상 줄바꿈한다. IME 조합 중 전송과 키 반복 전송을 막는다. 프로젝트·세션·인증 토큰과 독립적이고 `enterkeyhint`도 선택에 맞춰 바뀐다.
- 언어는 Settings에서 선택하며 Android의 별도 `appearance` 환경 설정에 저장한다. 기본은 영어이며 언어 전환은 화면 문구만 갱신한다. 인증 토큰 초기화와 언어 설정은 독립적이다.

출력은 세션마다 최대 1MiB의 메모리 버퍼와 바이트 커서를 사용한다. 클라이언트가 마지막 커서부터 읽거나 0부터 다시 재생할 수 있다. 오래된 출력이 버퍼에서 제거되면 `gap`을 반환한다. 잘린 ANSI 상태나 과거 전체 터미널 화면의 완전한 복원은 보장하지 않는다. 출력은 브리지 재시작 후 유지하지 않는다.

## 구조화된 대화

`ChatSession`은 `provider_command`가 선택한 프로그램과 stdio로 연결한다. Codex는 App Server를 직접 사용하며 `initialize → initialized → thread/start` 순서로 초기화한다. OpenCode·Claude 어댑터는 해당 내부 프로토콜의 허용된 메서드와 구조화된 이벤트를 구현해 기존 대화 렌더러를 사용한다. 이는 OpenCode·Claude의 공개 API 이름을 뜻하지 않는다. 0.7.0부터 Codex는 `ephemeral: false`로 새 대화를 만들며 사용자 모델·권한 설정과 기존 `CODEX_HOME`을 상속한다. 별도 Codex 저장소나 이중 세션 색인을 만들지 않는다. 원격 주소나 임의 JSON-RPC 메서드를 앱에서 전달할 수 없으며, 입력과 승인 응답은 한 스레드·현재 턴으로 제한한다.

프로세스의 `state`와 응답의 `turn_state`(준비·전송·응답·사용자 대기·실패)를 분리한다. `turn/interrupt`는 응답만 중단한다. 명령·파일 승인은 한 번 승인 또는 거절만 지원하며, 질문에는 단일·복수 선택과 요청이 허용한 자유 입력을 제공한다. 미지원 서버 요청은 오류로 응답하고 승인하지 않는다. 종료·해결된 요청에 대한 늦은 응답을 거부하고 재전송 ID로 중복을 막는다. 프로젝트 전환·언어 변경 시 복수 선택 초안도 유지한다.


응답 중 입력은 `chat_queue`·`queue_batch`·`codex_steer`·`claude_steer` 기능 플래그로 알린다(소스 반영, 배포 대기). 새 앱은 Chat 입력을 `queue`의 `action: add` 동작으로 전송하고, 비어 있는 준비 상태에서는 곧바로 실행한다. 대기열은 세션별 최대 16건·건당 UTF-8 16KiB이며 `events.queue`와 queue API 응답으로만 내용을 전달한다. snapshot에는 건수·일시정지 상태·현재 턴 ID만 넣는다. 정상 완료 후 현재 대기 중인 일반 메시지를 순서대로 줄바꿈 두 개로 연결해 하나의 입력으로 보낸다. 전송할 ID 묶음을 고정하고 네이티브 수락 후 해당 묶음만 함께 제거한다. 그 사이 추가된 메시지는 다음 묶음으로 남긴다. 시작 거절/전달 여부 불명은 묶음 전체를 보존하고 일시정지한다. Codex 스킬의 텍스트와 구조화된 첨부는 함께 유지하며 Claude·OpenCode의 네이티브 슬래시 명령은 단독 전송해 명령 실행을 보존한다. 중단/실패 시 후속 입력을 일시정지한다. 시작이 거절된 항목은 실패 상태로 남겨 취소·명시적 재개를 지원한다. 실제 전송 시점의 세션 권한·Fast를 적용한다.

대기열은 브리지 메모리에 있으므로 앱 재실행·프로젝트 전환에는 유지되지만 에이전트 종료·브리지 종료에는 유지하지 않는다. 브리지 재시작 시 이전 건수·턴 ID도 초기화하고 앱은 미전송 대기열 유실을 알린다. 대기열 내용은 디스크 메타데이터·로그에 기록하지 않는다. 추가·취소·재개의 요청 ID도 기존 중복 처리 한도와 내용 충돌 검사를 사용하며, 변경 번호가 지난 응답은 현재 목록을 덮어쓰지 않는다.

Codex [공식 `turn/steer`](https://learn.chatgpt.com/docs/app-server#steer-an-active-turn)에 `expectedTurnId`를 전달하고 네이티브 응답의 `turnId`가 일치한 뒤 성공 처리한다. 새 턴·interrupt·권한 변경 RPC로 대체하지 않는다. 거절 시 초안을 유지하며 응답 유실/시간 초과는 전달 여부 불명으로 처리해 자동 재전송하지 않는다. 확인이 끝나지 않은 Steer가 이후 대기열을 영구 차단하지 않도록 제한 시간 후 수신 대기를 해제한다. Claude도 같은 Steer API/UI를 제공하되 어댑터의 `initialize.capabilities.steer` 확인과 `claude_steer` 기능 표시가 필요하다. 현재 실행의 열린 SDK 입력 스트림에 UUID를 붙인 사용자 메시지를 넣고, 같은 UUID의 네이티브 `command_lifecycle` queued/started 또는 `--replay-user-messages` 이벤트 뒤에만 현재 Bibimer 턴 ID로 수락 응답한다. SDK에 쓰기만 한 상태는 성공으로 보지 않는다. 실제 반영 시점은 Claude가 결정하며 이미 실행한 도구를 중단하거나 승인을 자동 처리하지 않는다. Claude의 슬래시 명령은 Steer로 받지 않고 일반 대기열에서 실행한다. 네이티브 `queued_turn_count` 또는 미확인 입력이 남으면 첫 result에서 스트림을 닫지 않고 후속 처리가 끝날 때까지 같은 Bibimer 실행을 유지한다. 정상적으로 비워진 뒤 최종 답변의 완료 이벤트를 보낸다. 명시적 중단은 SDK interrupt 뒤 해당 query를 닫아 후속 네이티브 처리를 정리한다. 입력 내용/UUID 상태는 메모리만 사용한다. OpenCode에는 대기열만 제공한다. 근거는 [Claude 중간 입력 처리](https://code.claude.com/docs/en/interactive-mode#when-claude-code-sends-what-you-queued), [CLI replay 확인](https://code.claude.com/docs/en/cli-reference), [SDK 0.3.206 네이티브 lifecycle](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md#03206)이다.

대기 항목의 Steer는 `queue_steer` 기능 표시와 `queue`의 `action: steer`로 제공한다(앱·브리지 0.10.0). 세션 ID·항목 ID·현재 턴 ID를 고정하고 텍스트는 브리지 대기열에서 읽는다. 조건 잠금 안에서 항목을 `steering`으로 바꿔 새 FIFO 턴·해당 항목 삭제·재전송을 막는다. 현재 턴이 먼저 끝나도 확인 전에는 후속 대기열을 실행하지 않는다. 수락 확인 시 해당 항목만 제거하며 다른 항목의 순서를 유지한다. 거절은 `failed`, 응답 유실·잘못된 턴 확인은 `uncertain`으로 보존하고 대기열을 일시정지한다. `uncertain` 항목은 재개·Steer 재전송을 금지하며 사용자가 대화를 확인하고 취소한 뒤 재개한다. 요청 ID 중복 확인은 제거된 항목에도 적용한다. 앱은 작성 중인 입력을 건드리지 않고, 늦게 도착한 결과로 다른 프로젝트·에이전트 화면을 바꾸지 않는다.

대화 이벤트는 `items`, `retained`, `requests`, `queue`를 반환한다. 항목은 변경 번호를 가지며 전체 항목은 최대 1MiB·200개, 항목별 텍스트는 32768자로 제한한다. 오래된 내용이 제거되면 `gap`을 알리고 남은 항목으로 복구한다. 승인·질문은 별도 메모리 상태로 유지해 재접속 시 다시 표시한다. 디스크 메타데이터에는 대화·질문·답변을 저장하지 않는다.

`conversation.js`는 DOM 노드로 제목·목록·표·코드 블록·굵은 글씨를 렌더링한다. HTML을 실행하지 않고 외부 링크·이미지를 로드하지 않는다. 터미널 화면을 파싱해 사용자·에이전트 메시지로 추정하지 않는다.

## 프로세스 제어

자식 런처를 새 POSIX 세션으로 실행한 뒤 PTY를 제어 터미널로 설정하고 실제 프로그램으로 교체한다. 멀티스레드 HTTP 서버에서 Python `preexec_fn`을 사용하지 않는다.

종료는 해당 POSIX 세션에 속한 프로세스 그룹에 SIGTERM을 보내고, 3초 안에 종료되지 않으면 SIGKILL로 정리한다. 대화형 셸의 전경·배경 작업도 같은 세션 ID에 속하는 범위에서 정리한다. 독립적인 `setsid()` 등으로 명시적으로 이 세션을 벗어난 데몬까지 추적하지는 않는다. 프로세스 이름으로 전역 종료하지 않는다.

브리지는 Android 포그라운드 서비스를 직접 생성하지 않는다. Termux·OS의 프로세스 생존 제약은 그대로 적용된다. 화면 잠금·강제 종료 후의 실제 복구 경험은 다음 실기기 검증에서 확인한다.

앱 설정의 브리지 업데이트·재시작은 `BridgeMaintenance`가 고정된 `bridge-maintenance.py` asset을 Termux RUN_COMMAND의 stdin으로 전달한다. 설치기 생성 단계에서 `bridge/maintain_bridge.py`에 브리지·어댑터 압축 payload와 SHA-256을 결합한다. WebView는 `update`/`restart` 두 동작만 요청하고 경로·명령·payload·포트를 지정하지 못한다. 권한 요청 코드26은 자동 연결24·에이전트 작업25와 분리하고 메모리의 단일 대기 동작·Demo epoch·Activity 생명주기를 검사한다. 비공개 일회용 PendingIntent 수신기는 작업 ID·정해진 상태 코드·종료 코드를 검증하며 출력 원문·토큰을 WebView/로그에 넘기지 않는다. 공유 환경설정에는 작업 ID·시작 시각·상태 코드만 남긴다.

유지보수는 별도 flock으로 중복 실행을 막고, 전체 payload 검증·Python 문법 확인 후 인증된 health와 종료 API를 사용한다. 실행/종료 중 세션이 하나라도 있거나 상태를 확인할 수 없는 잠금이 있으면 거절한다. 상태 잠금 아래 파일을 교체하고 서버를 `serve`로 시작해 새 instance/version을 확인한다. 새 자식의 종료로 시작 실패가 확인되면 이전 파일을 복구하고 이전 설치본을 다시 시작한다. 상태 폴더·연결 토큰·네이티브 기록은 교체하지 않으며 페어링 코드를 만들지 않는다. 종료된 대화의 이어가기는 기존 원본 가져오기 경로를 사용하고 PTY 버퍼를 복원했다고 표시하지 않는다. Android에 의해 유지보수 프로세스 자체가 강제 종료되는 경우의 자동 복구는 보장하지 않는다.

미배포 소스의 `bridge-maintenance.js`는 연결 세션이 있는 경우 명시적인 종료 확인을 먼저 받는다. 인증된 최신 health에서 전체 프로젝트·보관/워크트리/PTY 세션 ID를 고정하고, 실행 직전 같은 instance와 ID 집합인지 재확인한다. 목록이 달라지면 새 목록을 표시해 다시 확인받는다. 기존 `/v1/sessions/<id>/stop`을 순서대로 요청하고 health에서 모든 대상이 실제로 종료됐는지 최대 20초 확인한다(각 HTTP 요청의 별도 제한 적용). 종료 요청 수락만으로 유지보수를 시작하지 않는다. 도중 새 ID·실패·확인 불가·앱 pause/브리지 교체가 발생하면 중단하고 자동 재개하지 않는다. 유지보수 직전 도착한 새 세션은 기존 Termux 도우미의 실행 세션 검사로 거절하며 임의 종료하지 않는다. 별도 강제 종료 API·원격 명령·자동 승인·자동 모델 재개를 추가하지 않는다. 확인 창은 중복 클릭/처리 중 Back을 막고 기존 네이티브 고정 `update`/`restart`만 호출한다.

`restart` CLI는 실행 세션이 있으면 거부한다. 0.2.0 이상의 종료 API는 세션 시작과 같은 잠금 아래에서 종료 상태를 설정한다. 0.1.x 호환 경로는 같은 사용자·Python 실행 파일·브리지 실행 인수·상태 파일 잠금을 확인하고 pidfd로 확인한 프로세스만 종료한다. 이전 API에는 시작/종료를 함께 잠글 수 없으므로 업데이트 중 다른 클라이언트에서 새 세션을 시작하지 않아야 한다. pidfd 지원이나 소유권 확인이 불가능하면 자동 종료하지 않는다.

## 응답 표시 (0.4.0)

Chat 이벤트의 파일 변경에는 `changes: [{path, diff}]`와 `truncated`, 계획에는 `steps: [{step, status}]`와 `explanation`을 전달한다. 이전 UI용 `text`도 유지한다. 파일별 diff 미리보기는 경로·변경 문자열을 합쳐 약 32Ki 문자로 제한하며 잘림을 표시한다. 에이전트가 제공한 요약에는 `summary: true`를 붙여 계획과 표시를 구분한다. 이 내용은 기존 메모리 출력 한도에 포함되며 디스크 메타데이터에는 저장하지 않는다.

`rich-text.js`는 고정 버전 marked의 lexer 토큰을 DOM 요소로 바꾸고 코드만 highlight.js로 강조한다. HTML·이미지·외부 콘텐츠는 대화 DOM에서 실행하거나 자동 로드하지 않는다. 명시적인 HTTP(S) 링크 클릭은 URL 형식을 JavaScript와 네이티브에서 확인한 뒤 외부 브라우저로 전달한다. 내부 WebView의 탐색 차단과 고정 asset 허용 목록은 유지한다. 파일 경로 링크는 아래 읽기 전용 외부 앱 열기 경로를 사용한다(0.15.0 APK 포함, 앱 설치·브리지 적용 대기).

2026-10-12 파일 뷰어 소스는 `file-viewer.js`에서 기존 `/v1/inspect`의 `file` 조회와 `/native/open-file`을 사용한다. 파일 탐색기는 목록을 유지하고 파일 내용을 전체 화면 dialog로 전달한다. 프로젝트·워크트리·브리지 인스턴스를 캡처해 결과를 구분하고 변경 시 닫는다. Office·이미지·PDF의 선택은 텍스트 조회를 거치지 않고 기존 네이티브 파일 전송을 호출한다. 일반 텍스트는 GFM/구문 강조/원본을 DOM으로 표시한다.

HTML과 Mermaid SVG는 `sandbox=""` srcdoc iframe으로 표시한다. 문서에서 실행 요소·이벤트 속성·자원/탐색 URL을 제거한 뒤, 스크립트·네트워크·프레임·폼을 차단하는 CSP를 문서 맨 앞에 넣는다. Android의 JavascriptInterface는 하위 프레임에도 노출될 수 있으므로 iframe의 스크립트 실행 차단을 유지하며 `allow-scripts`나 `allow-same-origin`을 추가하지 않는다. 최상위 CSP의 frame-src는 self로 한정하고 Android의 asset 허용 목록·네트워크 차단·탐색 차단도 유지한다. Mermaid 12.1.0은 SHA-512/라이선스를 고정한 로컬 UMD 번들로 지연 로드하고 strict·htmlLabels false·설정/마크업 제한을 적용한다. 0.17.0 개발 APK에 포함했으며 출시 서명 AAB도 검증했고 WebView 실기기 검증·Play 배포는 남아 있다. [Mermaid 보안 설정](https://mermaid.js.org/config/schema-docs/config-properties-securitylevel.html), [Android 파일 읽기 권한 전달](https://developer.android.com/training/secure-file-sharing/share-file)을 참고한다.

## OpenCode·Claude 어댑터 (0.6.0)

`provider_opencode.py`는 설치된 `opencode serve`를 세션별 별도 자식 프로세스로 시작한다. 임의 루프백 포트와 메모리에서 생성한 Basic 인증 비밀번호를 사용하며 HTTP 프록시·리다이렉트를 금지한다. 비밀번호는 자식 환경으로만 전달하고 로그·명령 인수에 넣지 않는다. 자동 업데이트·자동 공유를 끄고 기존 모델·권한 설정을 사용한다.

OpenCode의 공개 서버 API로 세션 생성·조회·복사·메시지·권한·질문을 처리한다. 사용자 전송에서만 `prompt_async`를 호출하며 활성 응답 동안 메시지·상태를 약 350ms 간격으로 확인한다. 동일 세션의 권한·질문만 앱에 전달하며 한 번 승인과 거절을 대응시킨다. 응답 전송 여부가 불확실하면 재전송하지 않고 안내한다. 반복 통신 실패 또는 자식 서버 종료 시 해당 어댑터를 종료한다. 종료·목록 조회 완료 시 소유한 서버만 정리한다. PTY는 서버 어댑터를 거치지 않고 `opencode`를 직접 실행한다.

`provider_claude.mjs`는 Node.js와 공식 `@anthropic-ai/claude-agent-sdk` 0.3.283을 사용한다. SDK는 `~/.local/share/bibimer/claude/`에 별도로 설치하며 개발 테스트에서만 `BIBIMER_CLAUDE_SDK_PATH`로 경로를 대체할 수 있다. 새 대화는 첫 입력에서 SDK `query`를 시작하고 이후 입력은 같은 세션 ID로 재개한다. 사용자·프로젝트·로컬 설정을 읽으며 권한 우회 옵션을 설정하지 않는다. `canUseTool`과 `AskUserQuestion`을 앱의 승인·질문으로 전달하고 명시적인 답변을 기다린다. 응답 종료·중단 시 남은 대기 요청은 거절 처리한다. 텍스트·Bash·파일 편집·TodoWrite를 구조화된 항목으로 바꾸며 내부 추론과 하위 에이전트 기록은 표시하지 않는다.

Claude의 명령 존재와 실제 실행 가능 여부를 구분한다. `claude --version`을 제한 시간 2초로 확인하고 결과를 60초 캐시한다. 명령 실패와 SDK 누락을 health 및 준비 화면에 각각 알린다. SDK 설치는 Claude CLI 설치·Android 호환성을 보장하지 않는다.

프로토콜 근거: [OpenCode 서버 API](https://opencode.ai/docs/server/), [OpenCode CLI](https://opencode.ai/docs/cli/), [Claude SDK 세션](https://code.claude.com/docs/en/agent-sdk/sessions), [Claude SDK 사용자 입력](https://code.claude.com/docs/en/agent-sdk/user-input). 설치된 OpenCode 1.17.13의 `/doc` 스키마와 SDK 0.3.283의 타입 정의도 대조했다.

## 저장된 에이전트 세션 (0.5.0 / 0.6.0 확장)

`import_agent_session` 기능을 health에 광고하며 이전 앱용 `import_codex_session`도 유지한다. `HistoryClient`는 프로젝트 cwd에서 해당 에이전트의 별도 App Server 또는 어댑터를 열고 초기화한 뒤 `thread/list` 또는 `thread/read`만 호출하며 끝나면 소유한 프로세스 그룹을 정리한다. 전역 세션 잠금을 보유하지 않아 목록 조회가 다른 프로젝트의 입력·상태 폴링을 막지 않는다. 조회는 동시에 하나만 허용하고 RPC당 8초·응답 2MiB로 제한한다. 사이드바 제목 조회와 목록·가져오기 검증이 겹치면 즉시 실패하지 않고 최대 5초간 조회 슬롯을 기다린다. 대기 중에도 입력·승인·상태 조회는 처리하며, 시간이 지나도 슬롯을 얻지 못하면 기존 조회 오류를 반환한다.

목록은 cwd 일치·비보관·비임시 세션을 최근 수정 순 25개와 다음 커서로 반환한다. Codex는 CLI·VS Code·App Server 출처와 모든 모델 제공자를 포함한다. OpenCode는 `directory` 필터와 정규화한 실제 경로를 확인한다(`path` 필드는 작업 폴더와 다름). Claude는 공식 SDK `listSessions`·`getSessionInfo`·`getSessionMessages`를 사용하며 worktree·숨김 기록을 제외한다. OpenCode·Claude 목록은 최대 10,000건으로 제한하며 Claude의 64MiB 초과 기록은 CLI 사용 안내로 거절한다. 제목은 240자로 제한하고 내용은 저장하지 않는다. 시작 시 목록의 경로나 제목을 신뢰하지 않고 `thread/read(includeTurns: false)`로 ID·cwd·저장 여부를 재검증한다. 조회 전후에 해당 프로젝트의 실행 상태·요청 중복을 확인하므로 동시에 시작한 세션을 덮어쓰지 않는다. 가져오는 동안 프로젝트가 변경되어도 원래 프로젝트로 실행한다.

가져오기 ChatSession은 `thread/resume` 또는 `thread/fork`를 `excludeTurns: true`로 호출하고 모델·권한·cwd 설정을 덮어쓰지 않는다. 실제 응답의 cwd도 다시 확인한다. 이후 `thread/items/list(limit: 50, sortDirection: desc)`를 읽어 시간 순으로 표시한다. 기록의 `inProgress` 항목은 중단 상태로 표시하고 승인 RPC로 재구성하지 않는다. 미리보기만 실패하면 안내 후 입력을 허용하며, 복원이 실패하면 이번에 만든 프로세스만 종료한다. 초기화·미리보기까지 20초 안에 완료되지 않으면 오류로 종료한다.

`source_thread_id`, `import_mode`, `external_thread_id`만 기존 세션 메타데이터에 추가한다. 새 Codex Chat을 포함한 각 대화는 에이전트의 영속 기록이다. `history_persisted`는 thread 초기화 응답의 `ephemeral: false` 확인 결과로 메타데이터에 보관한다. Claude 복사는 SDK `forkSession`, OpenCode 복사는 공개 서버의 fork API를 사용하고 가져오기만으로 모델 턴을 시작하지 않는다. Bibimer의 대화 미리보기·새 출력은 기존 메모리 한도만 유지한다. 원본 이어하기가 기본이며 외부 CLI 활성 상태를 완전히 탐지할 수 없으므로 다른 클라이언트에서 작업을 마친 뒤 이어가거나 복사를 선택하도록 안내한다. 실행 중인 PTY 연결·전체 기록 탐색은 구현하지 않았다.

프로토콜 근거: [Codex App Server 공식 문서](https://learn.chatgpt.com/docs/app-server). 현재 폰의 Codex 0.156.1 생성 JSON Schema와 실제 RPC로 목록·읽기·복사·원본 이어하기를 확인했다. 실제 프로브는 새로 만든 테스트 스레드에 통제된 항목만 주입하고 모델 턴을 시작하지 않았으며 해당 테스트 기록만 보관 처리했다.

## 0.7.0 저장 통합과 이전 작업 복구

health의 `persistent_codex_sessions`는 새 Codex 대화의 영구 저장을 알린다. 새 앱은 이 기능이 없는 브리지에서 Codex 새 Chat 시작을 막고 업데이트를 안내한다. 기존 세션 관찰·PTY·저장된 기록 가져오기는 유지한다. CLI 이어하기 버튼은 저장이 확인된 Codex 대화만 표시하며 같은 thread ID와 셸 이스케이프한 작업 폴더를 복사한다. 실제 명령을 자동 실행하지 않는다.

설치된 Codex 0.156.1은 첫 사용자 입력이 있는 저장 세션을 기본 목록에 노출한다. 구조화된 항목 주입만으로는 목록에 나타나지 않으므로, 실제 검증에서는 임시 폴더와 로컬 HTTP 응답 대역으로 사용자 턴 하나를 생성했다. 외부 모델은 호출하지 않았으며 기본 목록·별도 프로세스의 읽기·같은 ID 재개와 기록 복원을 확인했다.

0.6.0의 기존 임시 대화는 메모리에서 찾았고 사용자 요청에 따라 남아 있는 UI 이벤트만 별도로 보존했다. `~/.local/state/bibimer/recovery/`는 0700, 파일은 0600이며 저장소·일반 로그에 포함하지 않는다. 이는 일회성 복구 작업이며 앱의 새로운 대화를 이 경로에 저장하는 기능이 아니다. 임시 대화에 대한 네이티브 `thread/fork`는 통제된 실험에서 거절되었으며 전체 모델 맥락을 복원했다고 표시하지 않는다.

Claude 실행 경로는 정상 사용자 CLI → Bibimer 전용 복구 런처 순서로 찾는다. 명시적인 `BIBIMER_CLAUDE_EXECUTABLE`은 이 선택보다 우선하며 HTTP 클라이언트에서 지정할 수 없다. 확인 캐시는 에이전트와 실행 경로별로 분리한다. `repair_claude_termux.py`는 공식 고정 패키지의 무결성·예상 일반 파일·실행 성공을 확인한 뒤 런처를 원자적으로 교체하고 이전 런처를 실패 시 유지한다. glibc 선행 설치나 사용자 로그인은 자동으로 처리하지 않는다.

Claude 준비 명령은 `bridge/claude_setup.sh`와 기존 복구 소스로 빌드 시 생성한 `claude-adapter-setup.sh`/`claude-repair-setup.sh`를 앱에 내장한다. Native `ClaudeSetup`은 크기·구분자·언어 값을 제한하고 인용된 here-document로 감싼 내용을 클립보드에 복사한다. 사용자가 Termux에 붙여 넣어 실행하며, WebView에서 설치기 소스나 임의 명령을 지정할 수 없다. 두 파일은 WebView asset 허용 목록에 노출하지 않는다. 복구 명령은 압축한 복구 소스와 SHA-256을 포함하므로 Downloads·브리지 설치·기존 복구 파일 없이 실행할 수 있다. 명령 실행은 SDK/전용 런타임 준비만 하며 브리지 시작·재시작·페어링을 하지 않는다. 수동 전체 설정 파일의 선택적 Claude 경로도 같은 생성 함수를 재사용한다.

## 모델·추론 수준 (앱·브리지 0.10.0)

`model_options` 기능 표시와 `/v1/models`는 선택한 프로젝트에서 에이전트의 모델 목록을 조회한다. Codex `model/list`, Claude SDK의 입력을 보내지 않는 `query().supportedModels()`, OpenCode `/provider`의 연결된 제공자·모델·variant를 읽는다. 모델 작업을 시작하지 않으며 자격 증명/제공자 설정은 전달하지 않는다. 최대 1,000개 모델·모델별 64개 수준, 120초 메모리 캐시와 명시적 새로고침을 사용한다. 조회 과정은 브리지·세션 잠금 밖에서 실행한다.

`options.model`·`options.effort`는 선택 문자열이며 빈 문자열은 기본값이다. effort는 명시한 모델에서만 선택하고 모델/effort 조합을 실제 목록으로 검증한다. 모델 이름은 하드코딩하지 않는다. 기존 `AgentPreferences`에 마지막 값을 에이전트별로 저장하며 세션의 다음 입력 설정은 브리지 메타데이터에 보관한다. 모델 변경 시 UI는 effort를 초기화한다. 시작·가져오기·설정 변경에서 조합을 검증하고 대기열은 실제 전송 시 해당 세션의 선택을 전달한다.

- Codex: `turn/start.model`·`effort`로 매번 전달하고 기본값 복원은 시작/가져오기 응답의 모델·추론 설정을 사용한다. PTY에는 `--model`, `-c model_reasoning_effort=...`를 전달한다.
- Claude: 각 다음 SDK `query`의 `model`·`effort` 옵션으로 전달한다. 기본 모델 복원은 CLI의 `default` 값이다. PTY는 `--model`·`--effort`를 사용한다.
- OpenCode: `prompt_async`의 `model: {providerID, modelID}`·`variant`에 전달한다. 세션이 마지막 모델을 기억하므로 명시 선택 후 기본 모델 복원은 새 세션에서만 제공한다. PTY는 `--model`만 지원하고 추론 값은 거절한다. 실행 중 CLI에 UI가 명령을 임의 주입하지 않는다.

근거: [Codex App Server 모델 목록·턴 설정](https://learn.chatgpt.com/docs/app-server), 설치된 Codex 0.156.1 JSON 스키마, Claude Agent SDK 0.3.283의 `ModelInfo`/`Options`, [Claude 모델·effort 설정](https://code.claude.com/docs/en/model-config), [OpenCode 서버 API](https://opencode.ai/docs/server/), [OpenCode 1.17.13 입력 설정 처리](https://github.com/anomalyco/opencode/blob/v1.17.13/packages/opencode/src/session/prompt.ts). CLI 지원 항목은 실제 설치본의 목록과 help도 확인했다.

## 0.8.0 권한·속도 설정 / 0.8.1 대화 중 변경

`options.permission`은 에이전트별 허용된 열거값만 받는다. `options.fast`는 Codex의 boolean만 허용한다. 임의 CLI 인수·설정 파일·환경 변수나 RPC를 앱에 개방하지 않는다. 값 생략은 기존 도구 설정을 상속하며 새 앱의 Codex Fast 기본값은 false다. `agent_options` 기능 표시가 없는 브리지에서는 새 앱의 에이전트 실행·가져오기를 막고 업데이트를 안내한다.

- Codex Chat: 0.8.1은 `thread/start`·`thread/resume`·`thread/fork`에서 네이티브 기본 `approvalPolicy`·`approvalsReviewer`·`sandbox`를 받아 보관한다. 명시한 권한은 첫 입력부터 매번 `turn/start.approvalPolicy/approvalsReviewer/sandboxPolicy`에 전달하고 기본값 선택 시 보관한 정책을 복원한다. 기본 정책을 받지 못하면 시작을 실패 처리한다. YOLO는 `dangerFullAccess`/`never`, 읽기·프로젝트 쓰기는 해당 sandbox와 `on-request`/사용자 승인이다. Fast는 `features.fast_mode=true`, `fast`/`default` tier를 사용하며 각 입력에서 적용한다. 설치된 0.156.1의 Fast는 `priority`로 정규화된다.
- Codex PTY: 고정 인수로 sandbox/approval 또는 `--dangerously-bypass-approvals-and-sandbox`를 구성하고 프로세스 범위의 `-c service_tier=...`를 사용한다. 사용자의 `config.toml`은 편집하지 않는다.
- Claude Chat: SDK의 `permissionMode`를 선택하고 bypass일 때만 `allowDangerouslySkipPermissions=true`를 추가한다. PTY는 `--permission-mode` 및 bypass의 `--dangerously-skip-permissions`를 사용한다.
- OpenCode: PTY 프로세스에만 `OPENCODE_PERMISSION`을 설정한다. Chat은 세션 API의 규칙을 사용한다. Chat 새 세션은 생성 시 wildcard permission을 전달한다. 이어하기·복사는 원본 확인 후 해당 세션에 PATCH하며, 네이티브가 규칙을 추가하므로 마지막 일치 규칙이 선택된다. 복사에 적용한 규칙은 원본에 쓰지 않는다. 상속은 규칙을 덮어쓰지 않는다.

Android `AgentPreferences`는 에이전트별 마지막 선택만 `SharedPreferences`에 저장한다. 프로젝트별 입력 초안·실행 세션과 별개다. `options`는 세션의 다음 입력 설정, `launch_options`는 처음 실행한 설정이며 실행 요청 중복 판정에는 후자를 사용한다. Fast 메시지의 중복 판정에 속도를 포함한다. 다른 프로젝트의 세션·대기 승인에는 전달하지 않는다. 도구가 실제로 전달한 승인·질문 요청은 기존 명시적 응답 UI를 따른다.

0.8.1의 `options` API는 현재 Chat의 **다음 입력** 설정을 메타데이터에 보관하고 변경 revision을 올린다. 진행 중인 응답의 네이티브 설정을 바꾸거나 대기 승인에 응답하지 않는다. 새 입력이 실제 전송될 때 선택한 정책을 적용한다. Claude는 각 SDK query의 permissionMode, OpenCode는 다음 prompt 전의 세션 permission PATCH로 전환한다. OpenCode PATCH는 기존 규칙을 병합하므로 상속으로 되돌리는 요청은 거절하고 새 세션을 안내한다. 값과 요청 ID를 검증하고 같은 요청의 재전송은 다시 적용하지 않는다. 종료 세션·PTY에는 이 API를 허용하지 않는다.

`live_agent_options`가 있는 브리지에서만 현재 Chat의 하단 컨트롤을 활성화한다. 앱은 현재 세션 설정과 새 세션 기본값을 구분하고 입력창 아래에 다음 입력/다음 세션 적용 범위를 표시한다. 변경 요청은 선택한 세션 ID에 고정하며 응답 도착 전에 프로젝트가 바뀌면 다른 세션 화면을 덮어쓰지 않는다. 선택한 값을 브리지에 반영한 뒤 Android 기본값을 저장하고 실패를 표시한다.

## GitHub 가져오기 (2026-10-09 소스)

`github_import` 기능 플래그와 인증된 `POST /v1/github`를 제공한다. Android는 고정 로컬 경로만 호출하고 GitHub 네트워크·파일·프로세스는 Termux에서 처리한다. `status`는 `gh auth status`의 활성 계정/상태만, `repositories`는 `gh api user/repos`의 이름·설명·비공개/보관 여부만 전달한다. 임의 호스트·URL·Git 인수·셸 명령은 API에서 받지 않는다.

`login`은 독립 `gh auth login --hostname github.com --git-protocol https --web` 프로세스를 만든다. 비대화형 stderr에서 정해진 코드 형식만 추출하고 URL은 `https://github.com/login/device`로 고정한다. 토큰을 읽거나 출력 원문을 API·파일·로그에 저장하지 않는다. `poll`로 코드·상태를 확인하고 `cancel_login`으로 해당 로그인 프로세스 그룹만 종료한다. 완료·실패·취소 뒤 코드를 지우며 브리지 재시작에 로그인 프로세스를 복원하지 않는다.

`clone`은 `request_id`, `repository`(owner/repository), `parent`(기존 절대/홈 경로), `name`(새 폴더명)을 검증한다. mkdir로 경로를 독점 예약하고 한 번에 하나의 클론만 실행한다. 셸 문자열 대신 Git 인수 배열, 고정 HTTPS URL, 호출 범위의 gh credential helper를 사용한다. 전역/시스템 Git 설정·주입된 Git 환경 설정·추적·askpass, 파일 프로토콜·리다이렉트·템플릿/후크를 배제해 이 클론을 수행한다. CLI 자격 증명 환경은 유지하고 기존 설정 파일은 수정하지 않는다. stdout는 폐기하고 `git clone --progress`의 stderr는 제한된 메모리에서 소비한다. CR/LF로 구분한 고정 Git 진행 형식에서 허용한 단계와 0~100의 정수만 추출해 실행 중 작업에 `progress: {phase, percent}`를 제공한다. 한 번에 16KiB를 읽고 미완성 행은 4KiB까지만 유지하며 원문은 API·로그·메타데이터에 전달하지 않는다. 진행률은 메모리 전용으로 종료/취소/재시작 뒤 복원하지 않고, 단계 100%를 전체 완료로 사용하지 않는다. 성공 후 예약한 폴더의 동일성을 확인하고 기존 등록 로직으로 추가하되 현재 프로젝트·세션 선택은 유지한다.

`github-imports.json`(0600, 상태 폴더 0700)은 최근 32개의 요청 ID·입력 digest·저장소·경로·단계·등록 ID·오류 코드만 보관한다. 같은 ID/본문 재요청은 같은 작업을 반환하고 다른 본문은 거절한다. HTTP 응답 유실·앱 재실행 후 `poll`로 결과를 회수한다. 취소는 클론 그룹만 종료하고 브리지에서 대상 파일을 삭제하지 않는다. 재시작 때 실행 중 기록을 `interrupted`로 바꾸며 자동 재실행·등록하지 않는다. 완료 직전 장애 시 남은 Git 폴더와 프로젝트 목록을 확인해 기존 폴더 등록으로 복구한다.


## Android 앱으로 파일 링크 열기 (0.15.0 APK 포함)

`rich-text.js` → 앱의 현재 프로젝트/워크트리 문맥 → 네이티브 전용 `/native/open-file` → 인증된 `/v1/files` prepare/read/release → Android 비공개 캐시 → `LinkedFileProvider`의 `content://` URI → `ACTION_VIEW` 순서다. Android가 Termux 전용 경로를 직접 읽는 구조가 아니다. 일반 WebView 요청으로 `/v1/files`를 호출하는 것은 거절하며 바이너리·base64·인증 토큰을 JavaScript에 반환하지 않는다. shell 명령·에이전트 실행을 사용하지 않는다.

브리지는 프로젝트/실제 Git 워크트리와 Download 루트만 허용하며 FD 기반 `O_NOFOLLOW` 탐색으로 내부 심볼릭 링크를 거절한다. 일반 파일·64MiB 상한을 확인하고 열린 FD의 device/inode/size/mtime/ctime을 각 읽기 전후 비교한다. 256KiB 조각, 최대 8개 전송 핸들, 마지막 사용 후 120초 만료로 제한하고 release/다음 요청의 만료 회수/종료에서 FD를 닫는다. 파일 내용이나 전송 핸들은 메타데이터 파일에 저장하지 않는다.

네이티브는 전용 단일 작업 스레드에서 검증된 조각을 임시 파일로 저장하고 완료 후 캐시 파일로 옮긴다. 전송은 90초 제한을 검사하며 연결 해제/Activity 종료 때 취소한다. 앱이 포그라운드일 때만 외부 뷰어를 실행한다. 공급자는 `exported=false`, `grantUriPermissions=true`이며 완료된 UUID별 파일 URI에만 임시 읽기 권한을 부여한다. 쓰기·임의 경로·메타데이터·미완성 파일을 제공하지 않는다. 캐시는 최대 128MiB이며 1시간 지난 URI는 거절한다. 앱 시작/다음 열기 때 만료·용량 초과 파일을 정리하고 연결 해제 때 전체를 정리한다. 외부 앱이 자체 저장한 사본이나 이미 연 FD까지 회수한다고 보장하지 않는다.

[Android의 안전한 파일 공유 안내](https://developer.android.com/training/secure-file-sharing)의 content URI와 임시 읽기 권한 방식에 맞췄다. 리소스·Java 컴파일 및 브리지/브라우저 검증을 마쳤지만 실제 Android 앱 간 URI 접근·기본 앱 선택·복귀 동작은 APK 설치 후 검증한다.
