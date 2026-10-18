# Termux에서 코딩 에이전트 준비하기

[English](termux-agents.en.md)

Bibimer와 **같은 휴대폰의 Termux**에서 진행한다. 별도 PC나 원격 호스트는 필요하지 않다. 먼저 Bibimer의 Setup에서 Termux와 브리지를 연결하고 터미널의 `pwd` 입력을 확인한다.

아래는 **2026-10-19 현재 Android 16·arm64 휴대폰에 설치된 구성**을 확인해 정리한 안내다. 버전 확인은 모델을 호출하지 않는다. 다른 기기의 새 환경에서 처음부터 설치·인증하는 전체 흐름은 아직 검증하지 않았다. 이미 동작하는 에이전트가 있으면 재설치할 필요가 없다.

| 에이전트 | 확인한 실행 구성 | 확인 결과 |
| --- | --- | --- |
| Codex | `@mmmbuto/codex-cli-termux@0.160.0-termux.3` | `codex --version` → `codex-cli 0.160.0` |
| Claude Code | Bibimer 전용 런타임 2.1.283 + Agent SDK 0.3.283 | 전용 런처 `--version` 성공. 전역 npm 설치본 2.1.263의 `claude`는 실행 실패 |
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

현재 폰은 전역 `claude` 명령이 고장 나 있어 **Bibimer 전용 런타임**을 사용한다. 일반 `npm install -g @anthropic-ai/claude-code`만으로 이 구성이 재현된다고 안내하지 않는다.

1. **arm64 Termux**, `$PREFIX/glibc/lib/ld-linux-aarch64.so.1`에 있는 glibc 로더, `ripgrep`을 먼저 준비한다. glibc가 없다면 [glibc 패키지 프로젝트](https://github.com/termux-pacman/glibc-packages)의 요구사항을 확인한다. Bibimer 설정 파일은 glibc를 설치하지 않는다. 이 선행 환경을 처음 설치하는 과정은 별도 검증 대상이다.
2. Bibimer의 **Setup → Save setup file**에서 최신 파일을 Download 폴더에 `bibimer-setup.sh`로 저장한다. 다운로드 접근이 없으면 먼저 `termux-setup-storage`를 실행하고 권한 허용을 마친다.
3. Termux에서 ripgrep과 전용 런타임을 준비한다. 런타임 설치 명령이 Chat SDK 준비도 포함한다.

```sh
pkg install ripgrep
BIBIMER_CLAUDE_TERMUX=1 bash ~/storage/downloads/bibimer-setup.sh
```

런타임 설치기는 고정된 공식 Claude 2.1.283 패키지의 SHA-512와 실행 결과를 확인하며, 기존 전역 CLI나 로그인 정보를 바꾸지 않는다. 같은 명령이 필요한 Node.js와 공식 Agent SDK 0.3.283도 Bibimer 전용 폴더에 설치한다. 기존 CLI가 정상이고 Chat 어댑터만 필요하면 대신 `BIBIMER_CLAUDE=1 bash ~/storage/downloads/bibimer-setup.sh`를 사용한다.

설치 후 **전용 실행 파일**로 버전을 확인하고 로그인한다. 고장 난 전역 `claude` 명령을 대신 실행하지 않는다.

```sh
~/.local/share/bibimer/claude-runtime/claude --version
~/.local/share/bibimer/claude-runtime/claude
```

화면의 로그인 안내를 같은 폰에서 완료한다. 정상 전역 CLI가 없거나 실행에 실패하면 브리지가 이 전용 런처를 사용한다. 이미 정상인 CLI 또는 `BIBIMER_CLAUDE_EXECUTABLE`을 명시한 환경은 기존 선택 규칙을 따른다. [Claude 공식 설치 안내](https://code.claude.com/docs/en/setup)는 계정·일반 사용법 참고이며, Android/Termux 전용 설치 절차를 대신하지 않는다.

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
