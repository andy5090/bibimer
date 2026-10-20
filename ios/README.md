# Bibimer iOS 개발

Android와 같은 프로젝트·워크트리·세션·Chat·터미널 UI를 iOS 앱과 내장 Linux 실행 환경에 연결하는 작업이다. 별도의 터미널 앱이나 원격 개발 호스트를 기본 사용 흐름으로 요구하지 않는다.

- `app/`: 기존 Bibimer 웹 UI를 재사용하는 WKWebView 앱, 네이티브 연결·설정·파일 내보내기, Simulator 빌더와 실제 화면 검사.
- `bridge/`: 내장 Alpine 게스트의 초기 설정, CLI 설치·로그인 작업, Gemini ACP 연결. 기존 Android 브리지 원본을 재사용하고 iOS 연결 계층만 추가한다.
- `runtime-lab/`: ARM64 Linux 실행 환경과 CLI의 격리 검증, 런타임 패치 및 재현용 검사.

현재 개발·검증 중이며 공개 배포판은 아니다. 각 에이전트의 설치·버전 출력·도구 실행·실제 모델 연결은 별도 단계로 검증한다. 원본 CLI 실행과 로컬 응답 서버를 이용한 검사는 실제 계정 인증이나 모델 응답의 증거가 아니다. 최종 검증 기록은 `app/`과 `runtime-lab/VALIDATION.md`를 따른다.

현재 연결 대상은 다음 네 가지다. 성공 항목은 Simulator의 내장 Linux에서 원본 CLI와 합성 로컬 API를 사용한 결과다. 2026-10-20의 Setup 설치·버전10개 검사(234.52초)에 이어, 2026-10-21 Codex HTTPS 전송 오류를 고친29dab 엔진에서도 네 CLI 도구 회귀와 실제 앱 UI20개 검사(13.89초)를 통과했다. JavaScript 오류는0개이며 미지원 syscall·복구 연결 진단을 보존한 결과는 `PASS_WITH_WARNINGS`다. iOS 입력창16px 수정도 반영했고, 실제 포커스 확대율과 계정 로그인 완료는 사용자의 직접 확인이 남아 있다.

| 에이전트 | 제품에 고정한 버전 | 도구 실행 검증 |
| --- | --- | --- |
| Codex | 0.163.0 | app-server·실제 셸 읽기/쓰기·구조화된 완료·종료0 성공 |
| Claude Code | Node CLI2.1.112 / SDK0.2.112 | 원본 provider·일회 승인·실제 Bash 읽기/쓰기·완료·종료0 성공 |
| OpenCode | musl ARM64 1.19.3 + iOS 출력 수집 호환 패치 | glob/grep·승인·Bash 읽기/쓰기와 출력·완료/종료0 성공. 큰 출력·exit7·timeout·abort도 성공. 최종 앱 설치와 게시 파일 해시 검증 완료 |
| Gemini CLI | 0.64.0 | native ACP·승인/거절·실제 파일 읽기/쓰기·완료·종료0 성공 |

CLI와 런타임은 검증한 조합을 사용한다. 특히 Claude 최신 Bun판의 버전 출력만 성공한 결과를 실제 작업 지원으로 취급하지 않는다. 원본 Android 브리지와 UI를 재사용하되 iOS 설정·권한·연결은 이 폴더에 격리한다.
