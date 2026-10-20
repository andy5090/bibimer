# OpenCode · Gemini CLI 실행 검증

`Resources/extra-agents.py`는 **번들에 내장한 ARM64 Alpine 게스트 안에서만** 실행하는 검증 도구다. macOS에 설치된 CLI나 원격 개발 호스트를 호출하지 않는다.

공개 npm registry에서 확인한 버전을 고정했다.

| 에이전트 | 공식 패키지 | 버전 | 실행 파일 |
| --- | --- | --- | --- |
| OpenCode | `opencode-linux-arm64-musl` | `1.19.3` | 패키지에 포함된 Linux ARM64 musl 실행 파일 |
| Gemini CLI | `@google/gemini-cli` | `0.64.0` | 패키지에 포함된 `bundle/gemini.js`, 게스트 Node.js |

설치 위치는 `/root/bibimer-probe/opencode`, `/root/bibimer-probe/gemini`다. 검증 파일과 설정은 별도 `runtime-opencode`, `runtime-gemini` 폴더에 생성한다. 실제 사용자 프로젝트나 자격 증명을 사용하지 않는다. `npm`은 HTTPS registry와 패키지 무결성 검증을 사용하며 TLS를 끄지 않는다.

## 실행 단계

게스트에서 아래 명령을 각각 실행한다. 설치·버전·도구 실행을 구분해 결과를 기록해야 한다.

```sh
python3 /extra-agents.py opencode-install
python3 /extra-agents.py opencode-version
python3 /extra-agents.py opencode-runtime
python3 /extra-agents.py gemini-install
python3 /extra-agents.py gemini-version
python3 /extra-agents.py gemini-runtime
```

각 단계는 실패 시 0이 아닌 종료 코드를 반환한다. 내부 제한 시간은 설치 900초, 버전 180초, 실행 240초다. 호출하는 probe의 제한 시간은 정리 시간을 포함해 더 길게 설정한다. 타임아웃 시 해당 CLI의 게스트 프로세스 그룹을 정리한다.

OpenCode는 공식 메타 패키지의 별도 `postinstall` 실행 대신 정확한 musl ARM64 패키지를 설치하고 원본 실행 파일을 직접 호출한다. `.bin/opencode` 심볼릭 링크도 제공한다. Gemini는 Node.js 20 이상을 요구한다. 선택적인 PTY·키체인 네이티브 모듈은 설치하지 않는다. 이 선택으로 전체 PTY·키체인 기능을 검증했다고 볼 수 없다.

## 실제 런타임 검사 범위

버전 확인 다음 단계는 CLI를 정상 시작하고 **같은 Linux 게스트의 loopback HTTP 서버**에 연결한다. 서버는 미리 정한 테스트용 추론 응답을 보낸다.

- OpenCode: 공식 OpenAI 호환 provider 설정 → 원본 `opencode run --format json` → 네이티브 `bash` 도구로 입력 읽기와 출력 파일 작성 → 네이티브 `step_finish` 완료 이벤트.
- Gemini: 공식 `GOOGLE_GEMINI_BASE_URL` 설정 → 원본 `gemini -p --output-format stream-json` → 네이티브 `read_file`과 `write_file` → 네이티브 `result` 성공 이벤트.

검증은 입력 파일 내용이 CLI의 도구 결과를 거쳐 서버로 돌아오는지, 실제 출력 파일 내용이 일치하는지, 프로세스가 0으로 종료하는지까지 요구한다. 서버의 응답만으로 성공을 만들지 않는다.

이 검사가 통과하면 원본 CLI의 초기화·API 전송·도구 실행·완료 이벤트 경로가 해당 iOS 게스트에서 작동한다는 근거가 된다. **실제 서비스 인증, 유료 모델 호출, 모델의 코딩 능력, 대화형 TUI, 모든 확장 기능을 검증하는 것은 아니다.** 게스트 실행 결과는 별도의 probe 증거와 함께 판단한다. 호스트에서 수행한 Python 문법 검사나 합성 API 프로토콜 검사만으로 CLI 실행 성공을 주장하지 않는다.

## 공식 근거

- [OpenCode CLI 문서](https://docs.opencode.ai/docs/cli/): `run`과 JSON 이벤트 출력.
- [OpenCode provider 문서](https://docs.opencode.ai/docs/providers/): OpenAI 호환 provider와 로컬 `baseURL`.
- [OpenCode 1.19.3 소스](https://github.com/anomalyco/opencode/tree/v1.19.3): 고정 버전의 실행·설정 구현.
- [공식 OpenCode ARM64 musl npm 메타데이터](https://registry.npmjs.org/opencode-linux-arm64-musl/1.19.3).
- [Gemini CLI 0.64.0 headless 문서](https://github.com/google-gemini/gemini-cli/blob/v0.64.0/docs/cli/headless.md): JSONL 이벤트와 종료 코드.
- [Gemini CLI 0.64.0 설정 문서](https://github.com/google-gemini/gemini-cli/blob/v0.64.0/docs/reference/configuration.md): 별도 설정 디렉터리와 `GOOGLE_GEMINI_BASE_URL`.
- [공식 Gemini CLI npm 메타데이터](https://registry.npmjs.org/@google/gemini-cli/0.64.0).
