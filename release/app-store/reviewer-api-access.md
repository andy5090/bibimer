# App Review API 키 접근 경로

2026-11-19. 사용자는 Bibimer가 자체 계정을 발급하는 서비스가 아니므로 별도 제공자 계정 대신 비용이 발생하는 API 키 제공 방식을 검토하도록 요청했다. 아직 제공자·허용 비용·키 전달은 확정되지 않았고 실제 키나 유료 호출은 사용하지 않았다.

## 확인한 전달 수단

Apple의 App Review Information은 고객에게 공개되지 않는다. Notes에는 앱을 테스트하는 데 필요한 설정/계정 상세 정보를 기재할 수 있다. API 키 전용 필드는 없으므로 **심사 전용 API 키 + 앱 내 연결 절차를 Notes에 제공하는 방식**을 사용하려 한다. 이는 Apple의 일반적인 테스트 접근 정보 안내에 근거한 적용 방안이지, 이 앱에 대한 API 키 방식 사전 승인이나 심사 통과 보장이 아니다.

- 전달 경로: App Store Connect → Bibimer → iOS1.0.0 → 앱 심사 정보 → 메모.
- 이 메모는 비공개 심사 자료다. 공개 설명·스크린샷·웹사이트·Git 저장소·배포 바이너리에 키를 포함하지 않는다. 별도의 비밀 보관함 또는 개발자에게도 안 보이는 암호 필드라고 설명하지 않는다.
- 부모가 키 없는 최종 안내문을 먼저 준비한다. 사용자가 App Store Connect의 메모에 심사 전용 키를 직접 추가하도록 할 수 있다. 이후 자동화에서 메모 원문을 출력하거나 공개 원고를 다시 덮어써 키를 지우지 않는다.
- Bibimer 서비스용 사용자 이름/비밀번호를 꾸며 넣지 않는다. '로그인 필요' 여부와 관련 필드에는 실제 선택한 접근 방식을 사실대로 반영한다.
- 심사가 진행되는 동안 접근을 유지한다. 심사가 끝나고 테스트 접근이 더 필요하지 않은 시점에 전용 키를 폐기/교체한다. 제출 직후나 고정 단기 만료로 심사 접근을 끊지 않는다.

## 현 소스에서 확인한 앱 연결 경로

Settings → 에이전트 관리 → 관리 열기 → 선택한 에이전트/제공자 → API key → 연결. 정확한 표시·제공 모델은 설치된 CLI의 목록에 따른다.

- Codex: `apiKey` 연결을 원래 account/login/start API로 전달한다. OpenAI API 키용이며 ChatGPT 웹 로그인과 구분한다.
- OpenCode: 원래 provider catalog에 지원되는 `api` 방식이 있으면 해당 제공자 인증 API로 전달한다. Anthropic 등 제공자 선택은 실제 목록/지원 여부를 확인한다.
- 현재 Claude Code의 자체 연결 UI는 Claude.ai/Console 로그인 방식이다. 원문 Anthropic 키를 이 로그인란에 넣는 안내를 하지 않는다. API 키만 제공하는 경우 지원되는 OpenCode 경로부터 검증한다.
- iOS 키 입력은 자체 스타일의 마스킹된 네이티브 입력을 사용하며 WebView에는 키 원문을 반환하지 않는다. 키는 계정 관리의 네이티브 전송으로 처리한다. CLI의 원래 자격 증명 저장 방식과 음성 키의 Keychain 저장을 혼동하지 않는다.
- 아직 실제 심사용 키로 로그인/추론을 검증하지 않았다. 소스의 지원 경로 확인과 실제 제공자 호출 성공은 구분한다.

## 비용 및 다음 결정

1. 제공자와 사용할 모델, 사용자가 승인한 테스트 비용 상한을 확정한다.
2. 운영 자원과 분리된 심사용 프로젝트/워크스페이스와 전용 키를 준비한다. 관리자 권한은 제공하지 않는다.
3. 제공자 문서/실제 Console에서 한도가 알림만 주는 예산인지 실제 차단 한도인지 확인한다. 키 하나의 권한 제한과 프로젝트 전체의 지출 한도는 별개다.
4. 사용자 승인 범위 안에서 연결과 작은 실제 요청을 검증하고, 예상하지 못한 반복 실행/유료 호출은 하지 않는다. 결제·충전·자동충전·기존 운영 한도는 별도 사용자 지시 없이 변경하지 않는다.
5. 작동하는 연결 절차와 비공개 키 전달을 완료한 뒤 심사 제출한다. 키 제공만으로 다른 에이전트/음성 제공자 계정까지 검증했다고 표시하지 않는다.

Anthropic을 선택할 경우 공식 문서는 별도 워크스페이스의 월 지출/요청 제한과 워크스페이스 범위 키를 지원한다. Default Workspace 한도에는 일부 사용이 빠질 수 있으므로 별도 워크스페이스를 구분한다. 제공자가 정해지기 전에 이 설정을 다른 서비스에도 동일하게 적용한다고 가정하지 않는다.

## 공식 근거

- [Apple: Platform version information — App Review information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/)
- [Apple: App Review guidelines, Before You Submit 및2.1](https://developer.apple.com/app-store/review/guidelines/)
- [Claude: Workspaces — scope, spending and rate limits](https://platform.claude.com/docs/en/manage-claude/workspaces)
- [Claude: API rate/spend limits](https://platform.claude.com/docs/en/api/rate-limits)

소스 근거: `android/app/src/main/assets/agent-connections.js`, `bridge/bibimer_bridge.py`의 `AgentConnections.validate_start/start_native`, `ios/app/Resources/native.js`의 `requestAccountSecret`, `ios/app/Sources/AccountInput.m`.
