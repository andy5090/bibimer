# Termux에서 코딩 에이전트 준비하기

[English](termux-agents.en.md)

Bibimer와 **같은 휴대폰의 Termux**에서 진행한다. 별도 PC나 원격 호스트는 필요하지 않다. 먼저 Bibimer의 Setup에서 Termux와 브리지를 연결하고 터미널의 `pwd` 입력을 확인한다.

아래는 **2026-10-19 현재 Android 16·arm64 휴대폰에 설치된 구성**을 확인해 정리한 안내다. 버전 확인은 모델을 호출하지 않는다. 다른 기기의 새 환경에서 처음부터 설치·인증하는 전체 흐름은 아직 검증하지 않았다. 이미 동작하는 에이전트가 있으면 재설치할 필요가 없다.

| 에이전트 | 확인한 실행 구성 | 확인 결과 |
| --- | --- | --- |
| Codex | `@mmmbuto/codex-cli-termux@0.160.0-termux.3` | `codex --version` → `codex-cli 0.160.0` |
| Claude Code | Bibimer 전용 런타임 2.1.283 + Agent SDK 0.3.283 | 전용 런처와 현재 폰의 일반 `claude` 명령 모두 `--version` 성공. 원래 npm2.1.263 진입점은 백업 |
| OpenCode | 1.17.13, OpenClaw Android의 glibc·proot·Bun 바이너리 래퍼 | `opencode --version` → `1.17.13` |
| Gemini CLI | 공식 npm `@google/gemini-cli@0.58.0`, Node.js로 진입 파일 직접 실행 | `--version` → `0.58.0`. Bibimer 에이전트 목록·Chat 연동은 미구현 |

Bibimer 앱의 최소 Android 버전과 각 에이전트의 요구사항은 다르다. 이 폰의 Termux Node.js는 26.4.0, npm은 11.19.0, glibc는 2.42-0, glibc-runner는 2.0-3이다. 모두 같은 버전으로 바꿔야 한다는 뜻은 아니다.

## Codex

현재 폰은 OpenAI의 일반 Linux 바이너리가 아닌 **커뮤니티 Termux 전용 배포본**을 사용한다. 확인한 패키지는 **Android 10 이상·arm64**가 필요하다. [배포본 소스와 요구사항](https://github.com/DioNanos/codex-termux)을 확인한다. OpenAI 공식 Termux 배포본으로 표현하지 않는다.

Termux에서 Node.js와 npm이 아직 없을 때만 준비한다. 기존 `node --version`과 `npm --version`이 정상이라면 건너뛴다.

```sh
pkg install nodejs-lts npm
```

확인한 패키지 버전을 설치하고 실행을 확인한다. `@latest`로 버전을 자동 변경하지 않는다.

```sh
npm install -g @mmmbuto/codex-cli-termux@0.160.0-termux.3
codex --version
codex login
```

Termux에 안내된 주소를 같은 폰의 브라우저에서 열어 로그인을 완료한다. 브라우저 반환이 안 되면 `codex login --device-auth`를 사용할 수 있다. 이 방식은 계정/워크스페이스에서 기기 코드 로그인이 허용되어야 한다. API 키를 사용하는 경우도 Bibimer 입력창이 아닌 Termux에서 CLI 인증을 진행한다. [OpenAI 공식 인증 안내](https://learn.chatgpt.com/docs/auth).

## Claude Code

현재 폰은 기존 npm 진입점의 `claude native binary not installed` 오류 때문에 **Bibimer 전용 런타임**을 사용한다. 2026-10-19 일반 `claude` 명령도 이 런타임으로 연결해 버전 출력과 SDK 초기화를 확인했다. 원래 npm 연결은 `$PREFIX/bin/claude.npm-before-bibimer`에 백업했다. 이는 현재 폰에 직접 적용한 연결 수정이며 일반 복구 설치기는 기존 전역 CLI를 교체하지 않는다. 일반 `npm install -g @anthropic-ai/claude-code`만으로 이 구성이 재현된다고 안내하지 않는다.

개발 소스의 **Setup → Claude Code · Termux**에는 **Termux에서 복구 / Termux에서 어댑터 준비 / Termux에서 로그인 / 로그인 상태 확인 / 버전 확인** 버튼이 있다. 각 버튼은 같은 폰의 새 Termux 터미널에 해당 고정 작업만 요청한다. 로그인·상태·버전은 Bibimer 전용 런처가 있으면 우선 사용하고, 없으면 설치된 `claude`를 사용한다. 복구·어댑터는 앱에 포함된 독립 스크립트를 전달하므로 다운로드 폴더의 파일에 의존하지 않는다. 기존 브리지·에이전트 세션은 재시작하지 않는다.

이 실행 버튼에는 Termux 0.118 이상과 Android의 **BIBIMER → Termux 환경에서 명령 실행** 권한, Termux의 `allow-external-apps=true` 설정이 필요하다. 권한 요청을 허용하면 선택했던 작업만 실행하며 초기 브리지 설치로 바뀌지 않는다. 권한과 설정은 사용자가 허용한다. [Termux 공식 RUN_COMMAND 안내](https://github.com/termux/termux-app/wiki/RUN_COMMAND-Intent)에 따르면 Android의 백그라운드 화면 열기 제한 때문에 Termux 알림을 직접 눌러야 할 수 있다. 실행 요청 표시는 설치·로그인 성공 확인이 아니며 진행·오류·결과는 Termux에서 확인한다. 로그인은 사용자가 브라우저에서 완료하고, 인증 출력은 Bibimer로 가져오지 않는다. 버튼이 동작하지 않으면 아래 명령 복사를 사용한다.

**다음 APK 빌드·설치 후 적용된다.** 현재 배포 앱에는 실행 버튼이 없으며 새 버튼의 실제 기기 권한 요청·Termux 화면 전환·브라우저 복귀는 아직 검증하지 않았다.

1. **arm64 Termux**, `$PREFIX/glibc/lib/ld-linux-aarch64.so.1`에 있는 glibc 로더, `ripgrep`을 먼저 준비한다. glibc가 없다면 [glibc 패키지 프로젝트](https://github.com/termux-pacman/glibc-packages)의 요구사항을 확인한다. Bibimer 설정 파일은 glibc를 설치하지 않는다. 이 선행 환경을 처음 설치하는 과정은 별도 검증 대상이다.
2. Bibimer의 **Setup → Claude Code · Termux → Claude 복구 명령 복사**를 누른다. 앱에 내장된 독립 설치 내용 전체를 복사하므로 설정 파일 저장·다운로드 폴더 접근이 필요하지 않다. 이번 소스 변경은 다음 APK 빌드/설치 후 적용되며 구형 배포 앱의 버튼은 여전히 저장 파일을 참조한다.
3. Termux에서 ripgrep을 준비한 뒤 복사한 명령을 붙여 넣어 실행한다. 런타임 복구에 Chat SDK 준비도 포함된다.

```sh
pkg install ripgrep
```

런타임 설치기는 고정된 공식 Claude 2.1.283 패키지의 SHA-512와 실행 결과를 확인하며, 기존 전역 CLI나 로그인 정보를 바꾸지 않는다. 같은 명령이 필요한 Node.js/npm과 공식 Agent SDK 0.3.283도 Bibimer 전용 폴더에 설치한다. 기존 CLI가 정상이고 Chat 어댑터만 필요하면 **Claude 어댑터 설정 명령 복사**를 사용한다. 두 명령 모두 브리지를 설치하거나 재시작하지 않는다. 현재 개발 폰용 독립 파일 명령은 [설정 문서](setup.md#이-폰의-claude-실행-파일-복구)에 있다.

설치 후 **전용 실행 파일**로 버전을 확인하고 로그인한다. 고장 난 전역 `claude` 명령을 대신 실행하지 않는다.

```sh
~/.local/share/bibimer/claude-runtime/claude --version
~/.local/share/bibimer/claude-runtime/claude auth status
~/.local/share/bibimer/claude-runtime/claude auth login
```

화면의 로그인 안내를 같은 폰에서 완료한다. 정상 전역 CLI가 없거나 실행에 실패하면 브리지가 이 전용 런처를 사용한다. 이미 정상인 CLI 또는 `BIBIMER_CLAUDE_EXECUTABLE`을 명시한 환경은 기존 선택 규칙을 따른다. [Claude 공식 설치 안내](https://code.claude.com/docs/en/setup)는 계정·일반 사용법 참고이며, Android/Termux 전용 설치 절차를 대신하지 않는다.

### 인증 만료 오류가 반복될 때

2026-10-19 이 폰의 전용 glibc 런타임은 버전 출력과 실제 Agent SDK의 제어 초기화·모델 목록5개 조회에 성공했다. 하지만 `auth status`는 `loggedIn: false`를 반환했고, 격리된 작업 폴더에서 도구·프로젝트 설정·기록 저장을 끈 단일 요청은 **`Failed to authenticate: OAuth session expired and could not be refreshed`**로 실패했다. 버전 확인만으로 대화 가능 상태라고 판단하면 안 된다.

이 오류에서는 Termux에서 위 **`auth login`**을 실행해 같은 폰의 브라우저로 재로그인을 완료한 뒤 `auth status`를 다시 확인한다. 이어 Bibimer에서 다시 연결하고 입력을 재시도한다. 설치기 재실행이나 브리지 재시작으로 만료된 인증이 갱신되지는 않는다. Bibimer가 대신 계정을 고르거나 인증 코드를 처리하지 않는다.

### Termux 전용 대안 조사

[Aarstad/claude-code-termux-musl](https://github.com/Aarstad/claude-code-termux-musl)은 공식 `linux-arm64-musl` 빌드에 Termux용 실행 경로와 DNS 프록시를 제공하는 커뮤니티 프로젝트다. Anthropic의 공식 Android 지원은 아니다. 소스 확인 기준 커밋은 `efd767cacdfdfccbfc94bc5b5628149f0d44a4d3`다.

이 폰에서 기존 설치와 분리한 `.tools/claude-diagnosis/musl-probe/`에 공식 `@anthropic-ai/claude-code-linux-arm64-musl@2.1.283`의 npm SHA-512를 검증하고, SHA-256이 고정된 Alpine musl 로더를 준비해 ELF 실행 경로만 수정했다. 버전2.1.283 출력, 기존 Agent SDK0.3.283의 제어 초기화와모델목록5개조회가성공했다. **이것은 대안 실행 방식의 초기화 검증이며, 커뮤니티 설치기 전체·DNS 프록시·도구 실행·인증된 모델 응답을 검증한 것은 아니다.** 사용자 로그인·전역CLI·운영브리지·실행중세션은교체하지않았다.

glibc 방식도 [Termux 전용 런처 프로젝트](https://github.com/gtbuchanan/claude-code-termux)에서 로더·내장 도구 재실행·DNS를 보완한다. 이 설치기는 이번 폰에 적용하지 않았다. 현재 재현한 인증 만료 오류를 먼저 해결하고, 실제 Bash·검색 도구·네트워크 호환성까지 비교한 뒤 기본 설치 경로를 선택한다.

분리한 musl 실행본으로 같은 제한된 요청을 보내도 동일한 인증 만료 오류가 재현됐다(모델 입력/출력 토큰0). 이 비교에서는 런타임 교체가 인증 문제를 해결하지 못했다. 새 실행본을 기본값으로 전환하기 전에 사용자 재로그인과 실제 동작 검증이 필요하다.

## OpenCode

현재 폰은 [OpenClaw Android 커뮤니티 설치기](https://github.com/AidanPark/openclaw-android)의 **OpenCode 전용 설치 스크립트**가 만든 환경을 사용한다. 일반 npm 설치나 일반 Linux 설치 스크립트만으로 동일하게 동작한다고 안내하지 않는다. Bibimer를 사용하기 위해 OpenClaw 에이전트까지 설치할 필요는 없다.

- **선행 조건:** arm64 Termux, glibc 로더, OpenClaw Android의 glibc 준비 표시 `~/.openclaw-android/.glibc-arch`. 설치 스크립트는 proot와 Bun을 준비하고 OpenCode 패키지를 받아 최소 proot 루트와 실행 래퍼를 만든다. glibc가 없거나 준비 표시가 없으면 OpenCode 설치를 건너뛴다. 빈 환경에 스크립트 하나만 실행하는 전체 설치 경로는 아니다.
- **설치 소스:** [이 폰의 설치기와 바이트가 같은 고정 소스](https://github.com/AidanPark/openclaw-android/blob/a2ac938e4f746c0bd052adc2c7e40e8d18359032/scripts/install-opencode.sh). SHA-256: `a7fe7e92ca90c9065a5b0a7094d617927fb14aa8fe6f830f8414ab9e5dadbf95`. 외부 커뮤니티 소스이며 OpenCode 공식 Termux 설치기로 표현하지 않는다.

위 선행 환경이 이미 준비되어 있고 OpenCode를 아직 설치하지 않은 경우, 소스를 파일로 받아 내용을 확인한 뒤 실행한다. **소스를 고정해도 스크립트 내부의 Bun·OpenCode 다운로드 버전은 고정되지 않는다.** 따라서 새 설치가 확인 버전 1.17.13과 같다고 보장하지 않으며 설치 후 버전과 Bibimer 연결을 확인한다. 이미 정상 실행되는 현재 폰에서 다시 실행할 필요는 없다.

```sh
curl -fL https://raw.githubusercontent.com/AidanPark/openclaw-android/a2ac938e4f746c0bd052adc2c7e40e8d18359032/scripts/install-opencode.sh -o ~/bibimer-install-opencode.sh
less ~/bibimer-install-opencode.sh
bash ~/bibimer-install-opencode.sh
```

설치기의 성공 문구만으로 완료 판단하지 않고, 실제 명령 실행을 확인한 다음 제공자에 로그인한다.

```sh
opencode --version
opencode auth login
```

이 폰의 `opencode`는 `$PREFIX/bin/opencode`의 래퍼다. 래퍼는 `~/.openclaw-android/proot-root`와 `~/.openclaw-android/bin/ld.so.opencode`, Bun 캐시의 OpenCode 바이너리를 사용한다. 일반 npm 업데이트로 이 래퍼를 덮어쓰거나 연결된 캐시를 지우면 동작하지 않을 수 있다. 제공자·모델 설정은 [OpenCode 공식 문서](https://opencode.ai/docs/)를 참고한다.

## Gemini CLI

이 폰에는 **`@google/gemini-cli@0.58.0`**도 전역 설치되어 있다. 패키지와 [공식 설치 문서](https://geminicli.com/docs/get-started/installation/)의 Node.js 요구사항은 **20 이상**이다. 아직 설치하지 않은 경우 Termux의 Node.js와 npm을 준비하고 다음을 실행한다. 기존 정상 설치본이 있으면 재설치하지 않는다.

```sh
npm install -g @google/gemini-cli@0.58.0
```

현재 검사 환경에서는 `gemini`의 진입 파일이 `#!/usr/bin/env node`를 사용해 직접 실행에 실패했다. 같은 설치본을 **Termux의 Node.js로 직접 실행**하면 버전 확인이 성공한다. 사용자 설치 파일을 수정하거나 전역 명령을 교체하지 않고 다음 경로를 안내한다.

```sh
node "$(npm root -g)/@google/gemini-cli/bundle/gemini.js" --version
```

출력이 `0.58.0`인지 확인한다. 직접 실행·로그인은 Termux 또는 Bibimer의 **Terminal** 세션에서 아래 명령으로 시작하고 같은 폰의 브라우저에서 안내를 따른다. [공식 인증 안내](https://geminicli.com/docs/get-started/authentication/)를 참고한다.

```sh
node "$(npm root -g)/@google/gemini-cli/bundle/gemini.js"
```

**설치·버전 확인과 Bibimer 통합 지원은 별개다.** Gemini는 현재 Bibimer의 에이전트 선택 목록, 구조화된 Chat, 저장된 세션 가져오기, 모델/권한 선택 및 완료 알림에 연결되어 있지 않다. 위 명령은 일반 Terminal에서 직접 실행하는 경로다. 이번에는 Node.js를 통한 버전 출력만 검증했으며 실제 대화형 로그인·모델 응답·도구 사용·새 환경 설치는 검증하지 않았다. Gemini 전용 세션 관리와 Chat 지원은 별도의 구현이 필요하다.

## Bibimer로 돌아오기

Codex·Claude Code·OpenCode의 설치·로그인을 마치면 Bibimer의 **Reconnect(다시 연결)** 후 에이전트 준비 상태를 확인하고 프로젝트에서 세션을 시작한다. CLI 버전 확인 성공과 실제 로그인·모델 응답 성공은 별개다. API 키나 로그인 코드를 Bibimer 프로젝트 설정이나 대화 입력창에 넣지 않는다.

최신 브리지 설치가 필요한 경우에만 설정 파일로 업데이트한다. 실행 중인 세션이 있으면 먼저 작업을 마친 뒤 [브리지 업데이트 절차](setup.md)에 따라 재시작한다. 설치 안내를 보거나 앱 화면을 이동하는 것만으로 브리지나 에이전트를 재시작하지 않는다.
