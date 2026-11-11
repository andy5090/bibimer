# iOS 앱 검증 기록

## 2026-11-12 — TestFlight 0.1.0(9) 재시도·연결 진단 검증

- 소스 `f1f905e13ee80cdbb4287043c4aff95b74231136`를 Xcode27.2의 기기/Simulator SDK로 컴파일했다. 반복 재시도의 실패 시간/횟수 보존·실제 활성 화면의 stale backgrounded 조정, guest 종료 잠금의 제한된 대기, 연결 진단의 상태 전용64개 기록/수동 native 복사를 포함한다.
- 전용 **Bibimer TestFlight QA**의 실제 WKWebView/내장 Linux **32개·29.13초·JS오류0·fatal0·진단실패0**이다. manual_reconnect_failure_window·connection_diagnostics_status_only와 기존 두 차례 실제 서비스 재시작/새 bridge instance/파일·화면 유지/이전 세션 lost/자동 실행 없음 검사를 통과했다. 백그라운드 정책20개는 모의 scheduler 검사이며 기존 syscall151/152 경고4개는 유지했다. 증빙 `dist/ios-app/diagnostics-nov12-smoke/`.
- 앱 Python30개와 iOS 브리지56개·Node16파일·Chromium20개 모바일/언어 배치·터미널 부분 복사/검토 붙여넣기를 통과했다. Python의 C 경합 검사는 실제 RuntimeSupport.c를 host mutex 대역과 컴파일해 PID/sighand/group/waiting-cond 경합 timeout·재시도 성공·PID1 보존·native proxy 거절을 확인했다. main/BackgroundExecution/RuntimeSupport의 Clang 정적분석 진단은0이며 기존 미사용 매개변수 컴파일 경고16개는 남아 있다.
- archive의 arm64/Scene/SDK/dSYM·기존 팀/번들 App Store 배포 서명과 현재 소스·IPA 자산(웹64·게스트18·네이티브11자산/13소스·현지화20·rootfs426) 일치를 확인했다. BGTask 식별자와 processing mode도 유지한다. IPA `dist/ios-testflight/0.1.0-9-export-nov12-diagnostics/export/Bibimer.ipa`, **8,567,543 bytes**, SHA-256 `2717e25be3c9791933cb5d8c5457ea1ebd2c54312d0a02fead4e1442d5252347`. 비공개 업로드 증빙 `dist/ios-testflight/upload-0.1.0-9-nov12/`.
- 실제 iPhone 앱 전환/잠금·반복 재연결 및 실패 원인 로그는 아직 미확보다. QA 성공으로 과거 실기기 실패 원인이나 해결을 확정하지 않는다. 재현 직후 또는 앱 재실행 뒤 설정 → 연결 진단 → 진단 로그 복사로 상태를 확인한다. PID1 종료/커널 교착·무기한 백그라운드 실행은 보장하지 않는다. 사용자 앱/Runtime Lab/브리지·세션은 재시작하지 않았다. Apple 제공 결과는 [TestFlight 기록](TESTFLIGHT.md)을 따른다.

## 2026-11-12 — TestFlight 0.1.0(8) Linux 서비스 재시작 검증

- 업로드 후보 소스 `23168f5f6ce26d9d005b1e979fb59e39f5dec6bb`는 c648ec0의 Linux supervisor/서비스 복구와 054527e의 Claude 대화형 `/login`을 포함한다. self-test snapshot에 누락된 bridge instance와 필수 smoke 검사 목록만 보완했다. 최초 검사에서 실제 복구는 됐지만 ID 비교가 timeout된 실패 증빙은 `dist/ios-app/history/`에 보존했다.
- Xcode27.2 양 SDK 컴파일·기기용 arm64/Scene/archive/dSYM·기존 팀/번들 App Store 배포 서명을 확인했다. 실제 전용 **Bibimer TestFlight QA**의 WKWebView/내장 Linux **30개·26.83초·JS오류0·fatal0·진단실패0**이다. 사용자 프로세스2회 종료/재시작·새 bridge instance·동일 WKWebView/파일·이전 세션 lost/출력 없음·자동 재실행 없음과 기존 transport/초안 검사를 통과했다. 백그라운드 정책20개는 모의 scheduler 검사이며 기존 syscall151/152 경고4개는 유지했다. 증빙 `dist/ios-app/recovery-nov12-smoke/`.
- 앱 Python29개·iOS 브리지56개·Node16파일·Chromium20개 모바일/언어 배치/터미널 부분 선택/검토 붙여넣기를 통과했다. self-test 수정 뒤 앱 Python29·Node 재연결/화면 설정을 재확인했다. main/BackgroundExecution/RuntimeSupport Clang 정적분석은0이며 기존 미사용 매개변수 컴파일 경고16개는 남아 있다.
- IPA `dist/ios-testflight/0.1.0-8-export-nov12-recovery/export/Bibimer.ipa`, **8,555,777 bytes**, SHA-256 `95e2d0abb3a01e8310c45f9e7aa19f05c3fa165f3b72aa310fe8402e02c1cca1`. 현재 소스에서 재생성한 웹64·게스트18(supervisor 포함), 네이티브11자산/13소스·현지화20·rootfs426 manifest와 IPA 일치를 확인했다. BGTask 식별자·processing mode도 유지한다. 비공개 서명/업로드 증빙 `dist/ios-testflight/upload-0.1.0-8-nov12/`.
- 실제 iPhone 잠금/앱 전환·복구 시 인증 유지·Claude 수동 코드 로그인과 OS 백그라운드 허가/지속 시간은 별도 확인이다. 서비스 재시작은 기존 실행 중 작업을 종료하며 미저장 대기열/PTY 출력은 복원하지 않는다. PID1 종료/커널 교착이나 무기한 상주를 보장하지 않는다. 사용자 Runtime Lab·앱/브리지/세션은 재시작하지 않았다. Apple 제공 결과는 [배포 기록](TESTFLIGHT.md)을 따른다.

## 2026-11-11 — TestFlight 0.1.0(7) 재연결 빌드 검증

- 소스 `9358f8a409699e8ed4e9a93d46572be9bfbaf305`를 Xcode 27.2의 기기/Simulator SDK로 컴파일했다. 비활성 복귀·수동 다시 연결에서 새 ephemeral transport를 사용하고 health 조회에 5초 감시를 적용한다. iOS 27 Scene, 공식 백그라운드 작업 API와 최신 공통 UI를 함께 패키징했다.
- 전용 **Bibimer TestFlight QA**의 실제 WKWebView/내장 Linux **29개·19.04초·JS 오류0·fatal0·진단실패0**이다. 비활성만 거친 복귀/반복 복귀/수동 재연결/멈춘 health/오래된 감시 무시와 동일 bridge·session·draft 및 미전송 POST 유지 검사가 포함된다. 백그라운드 정책20개는 모의 scheduler 검사다. 기존 syscall151/152 경고4개는 보존했다. 증빙 `dist/ios-app/reconnect-nov11-smoke/`.
- 앱 Python25개·Node16파일(앱11/공통5)·Chromium20개 모바일/언어 배치와 터미널 부분 복사/검토 붙여넣기 검사를 통과했다. main/BackgroundExecution의 Clang 정적 분석 진단은0이다. 기기 컴파일의 기존 미사용 매개변수 경고16개는 남아 있다.
- `0.1.0-7-unsigned-nov11-reconnect/Bibimer.xcarchive`의 SDK/Scene/dSYM과 export의 기존 팀·번들·App Store 배포 서명을 검증했다. IPA **8,547,418 bytes**, SHA-256 `8f2be311809f483e98cd060ce1132b9e6b7c2cc0c9accc76eaf15bb839990515`. 현재 소스에서 재생성한 웹64·게스트17 및 네이티브11자산/13소스·현지화20·rootfs426의 manifest와 IPA 일치를 확인했다. `BGTaskSchedulerPermittedIdentifiers=app.bibimer.ios.work.*`, `UIBackgroundModes=processing`도 확인했다. 비공개 증빙 `dist/ios-testflight/upload-0.1.0-7-nov11/upload-receipt.json`.
- 실제 iPhone 앱 전환·잠금 후 복구/장시간 실행과 OS 백그라운드 허가는 별도 확인이다. 살아 있는 Linux의 transport 복구 검사이며 init 종료/교착 복구나 무기한 실행 성공을 뜻하지 않는다. 사용자 Runtime Lab·앱/브리지/세션은 재시작하지 않았다. Apple 업로드/내부 제공 결과는 [TestFlight 기록](TESTFLIGHT.md)을 따른다.

## iOS 0.1.0(6) TestFlight 내부 배포 완료 (2026-11-10)

- **02:13 Asia/Seoul**, Apple 처리·기존 암호화 응답(Apple OS 외/병행 표준 암호화·프랑스 미배포)과 한/영 테스트 안내1139자 저장을 완료했다. 기존 **Bibimer Internal** 그룹에서 **0.1.0(6)·테스트 중·90일 후 만료**, 내부 테스터1명·빌드6개를 직접 확인했다. 기존1–5번·그룹/테스터·자동 배포OFF를 유지하고 새 초대·외부 베타·정식 App Store 제출은 하지 않았다.
- 빌드 ID `bef07861-a51e-4284-a1d2-fd166de145ca`, 업로드 소스 `a80bf35be9d9b83927d641b833a879b3aa742533`. 검증한 로컬 export IPA **8,545,477 bytes**, SHA-256 `46c9119eec914ffa15c21847e699b62b88b000b00b8d292bc12c931ae4a9a7c8`. 최종 background-final 아카이브에서 **02:04:29 Asia/Seoul Xcode 업로드 성공/exit0/EXPORT SUCCEEDED**를 확인했다. 비공개 증빙은 dist/ios-testflight/upload-0.1.0-6-nov10/의 upload-receipt.json·xcode-upload.log·test-notes.txt다. 앞선 미수정 로컬 후보는 업로드하지 않았다.
- 잠금 복귀 재연결·자동 잠금 방지/하단 홈 제스처 완화 설정과 원격75936f5의 답변 하단 재생/복사를 포함한다. 새 BackgroundExecution은 **iOS26+의 실제 설치/버전 확인과 진행 중 Chat/비정지 대기열**에 공식 백그라운드 API를 연결한다(지원 기기 기본 켜짐). 유휴 터미널·로그인·무기한 Linux 상주는 대상이 아니며 OS 허가/지속 시간은 보장하지 않는다. 만료·거절·설정 해제로 세션을 임의 종료하거나 명령/승인/대기열을 재전송하지 않는다. 화면 유지 두 옵션은 각각 기본 꺼짐이다.
- 양 SDK 컴파일·아카이브/dSYM·배포 서명·현재 소스와 IPA 자산(웹64·게스트17·네이티브11자산/13소스·현지화20) 일치를 확인했다. 실제 QA WKWebView/Linux **29개·15.96초·JS오류0**, 네이티브 모의 정책20개·Python25·Node11파일·공통 답변/음성/중단 질문3검사·Chromium20배치·main/서비스 정적분석0을 통과했다. 기존 syscall151/152 경고4개는 보존했다.
- **TestFlight에서0.1.0(6)로 업데이트한다. 실제 iPhone의 OS 백그라운드 허가·Live Activity·잠금 후 장시간 실행은 아직 미검증**이다. Simulator의 모의 스케줄러 성공을 실기기 상시 실행 성공으로 표시하지 않는다. Codex 폰 설치 성공은 사용자 확인이며 Claude 폰 설치 결과는 미확정이다. Android/웹사이트 배포나 사용자 브리지/앱 재시작은 수행하지 않았다. 아래 준비/미배포 기록은 당시 상태이며 이번6번에 포함됐다.

## iOS 백그라운드 작업 이어가기·TestFlight6 준비 (2026-11-10, 당시 제공 확인 전)

- 사용자가 레포 싱크 후 TestFlight 배포와 백그라운드 상시 실행 구현을 요청했다. 기존 잠금 복귀/화면 옵션을 dbb9435로 원격 main에 동기화했고, 그 과정에 원격75936f5의 답변 하단 재생·복사 변경도 보존했다. 이번 후보는 **0.1.0(6)**이며 기존 **Bibimer Internal** 그룹을 유지한다.
- 새 BackgroundExecution은 iPhone/iPad iOS26+의 공식 BGContinuedProcessingTask를 사용한다(iOS27 비동기 제출/26 폴백). 지원 기기는 기본 켜짐이며 설정에서 저장/해제할 수 있다. 이전 iOS와 Mac 실행에서는 비활성화한다. launch당 한 번 wildcard handler를 등록하고 고유 요청 ID·즉시 실행 실패 전략을 사용한다. processing mode·허용 식별자·BackgroundTasks 링크와 네이티브/웹10언어를 포함한다. GPU나 무관한 오디오/위치 기능으로 상주하지 않는다.
- 사용자가 명시적으로 시작한 CLI 설치/버전 확인과 진행 중인 Chat/실제 비정지 대기열만 유지한다. 같은 세션의 PID 존재만으로 유휴 터미널을 실행 중 작업으로 추측하지 않으며 로그인·단순 조회/화면 열기로 시작하지 않는다. **무기한 Linux 상주나 OS의 실행 허가·지속 시간은 보장하지 않는다.** 작업 완료/승인·질문 대기/시스템 만료·거절·사용자 설정 해제 시 권한을 끝낸다. 이 기능은 세션 종료·승인·명령/대기열 재전송을 실행하지 않는다. 실제 프로세스의 OS suspend/종료는 별개다.
- 읽기 전용 worker가 기존 health/events에서 브리지 instance·세션/턴 ID·revision·완료 상태만 메모리에 보관한다. 느린 POST는 begin/end 토큰과 단조 시간 최대180초로 추적하고 이전 요청/만료 뒤 늦은 응답은 재개하지 않는다. 새 턴·새 요청·poll 사이에 끝난 실패/중단 턴을 구조화된 revision과 최종 health로 재확인한다. 실제 변화만 불확정 progress로 보고하며 가짜 퍼센트/남은 시간을 만들지 않는다. 시스템 작업 표시에는 BIBIMER와 번역한 일반 작업 문구만 사용하며 대화/프로젝트/명령/인증정보를 표시·저장하지 않는다.
- 최종 양 SDK 컴파일, Python25개·iOS Node11파일·관련 공통 답변/음성/중단 질문3검사·구문/diff 검사 통과. main/BackgroundExecution Clang 분석 진단0개다. 전용 QA Simulator 실제 WKWebView/Linux **29개·15.96초·JS오류0·fatal0·진단실패0**, 기존 syscall151/152 경고4개만 남는 PASS_WITH_WARNINGS다. 내부20개 모의 정책 검사는 허가/거절·만료·설정 해제·유휴/로그인 제외·느린 요청/health 실패·인스턴스 변경·새 턴·미관측 실패/중단·늦은 응답·가짜 진행 없음 등을 확인했다. 모의 스케줄러만 제출했으며 **실제 iPhone OS 허가/Live Activity/잠금 후 장시간 실행은 미검증**이다.
- Chromium20언어/폭 조합에서 화면/백그라운드 카드·자체 토글·번역/넘침·부분 복사/검토 후 붙여넣기를 검증했다. visual-verdict97/pass(.omx/state/ios-background-work/ralph-progress.json). 실제 native 증거 dist/ios-app/background-smoke/, .tools/ios-background-release-*; 백그라운드 정책 검사는 각 결과 JSON의 background_execution_policy 항목을 따른다. 제품 installer/고정 버전은 변경하지 않았고 Codex 폰 설치 성공은 사용자 확인, Claude 폰 결과는 아직 미확정이다.
- 최종 아카이브는 dist/ios-testflight/0.1.0-6-unsigned-nov10-background-final/Bibimer.xcarchive, export는 0.1.0-6-export-nov10-background-final을 사용한다. 앞선 background 경로의 로컬 후보는 SUPERSEDED.json으로 표시했으며 업로드하지 않는다. **Apple 업로드·처리·암호화·내부 그룹 제공 확인 전**이며 실제 제공은 아직5번이다. Android/웹사이트 배포나 사용자 브리지/앱 재시작은 하지 않는다.

## iOS 잠금 복귀·화면 유지 옵션과 CLI 설치 재검증 (2026-11-10, 구현 당시 미배포)

- 사용자가 iPhone 잠금 후 브리지가 끊기고 재연결되지 않으며 **앱 전환 화면에서 완전히 종료한 뒤 열면 연결됨**을 확인했다. 기기의 정확한 현재 빌드/실패 메시지는 아직 확인되지 않았다. 코드에서는 기존 ready일 때만 JS를 재개하고 이전 health task/HTTP 연결을 그대로 두던 복귀 경로를 확인했다. 이것이 실제 기기에서 유일한 원인이라고 단정하지 않는다.
- 백그라운드 진입 시 ready를 해제하고 health/event 조회를 취소한다. 복귀 시 새 ephemeral HTTP transport에서 네이티브 health → JS 연결을 순서대로 확인한다. 이전 transport의 GET만 취소하고 이미 보낸 POST는 완료를 기다려 전달 여부가 불명인 명령을 취소/자동 재전송하지 않는다. 수동 재연결도 이전 health task를 교체하며 task identity와 connection epoch로 늦은 응답·재시도 타이머를 거절한다. 기존 WKWebView·프로젝트/세션·초안은 유지하고 Linux boot를 다시 호출하거나 종료된 init을 되살리지 않는다.
- 사용자가 선택한 **자동 잠금 방지 + 하단 홈 제스처 완화**를 iOS 설정의 **앱 사용 중 화면** 카드에 독립 토글로 추가했다. 둘 다 기본은 꺼짐이며 선택을 UserDefaults에 저장한다. 전자는 앱이 활성일 때만 idleTimerDisabled를 적용하고 백그라운드에서 해제·복귀 후 복원한다. 후자는 공개 preferredScreenEdgesDeferringSystemGestures의 bottom을 선택한다. 직접 잠금/앱 전환/반복 홈 스와이프를 막는 잠금 모드가 아니며 배터리 사용·동작 범위를 안내한다. Mac 실행에서는 두 토글을 비활성화한다. 기존 자체 settings-switch/44px·10언어를 재사용하고 네이티브 입력은 허용된 두 키와 실제 Boolean만 받는다.
- 최종 전용 QA Simulator(iOS26.5)의 실제 WKWebView/내장 ARM64 Linux **27개·15.99초·JS오류0·fatal0·진단실패0**, 기존 syscall151/152 경고4개를 보존한 PASS_WITH_WARNINGS다. 미완료 health·일시정지 GET·미전송 POST를 둔 두 번의 background/active 복귀, 새 transport·동일 브리지/세션/초안·POST 미전송, 네이티브 화면 옵션 적용/해제·백그라운드 해제/복귀 복원까지 확인했다. 이는 lifecycle callback fixture이며 실제 기기의 잠금/장시간 OS suspend를 대신하지 않는다. 현재 환경에 Simulator GUI 앱이 없어 실제 잠금 UI 조작은 수행하지 못했다.
- Python25개·Node10파일·Clang main 정적 분석 진단0·구문/diff 검사 통과. Chromium20언어/폭 조합에서 자체 토글·번역/넘침·부분 복사/검토 후 붙여넣기를 확인했다. visual-verdict97/pass이며 기존 알림 카드와 비교한 증거는 .omx/state/ios-lock-return/ralph-progress.json이다. native 검증은 dist/ios-app/lock-return-smoke/, 로그는 .tools/ios-lock-return-* 에 보존한다.
- Codex0.163.0과 Claude Code2.1.112/SDK0.2.112의 실제 게스트 설치는 모두 exit0, 별도 버전 확인과 설치됨/사용 가능 목록까지 통과했다. Codex 설치6→111초, Claude141→279초, 두 에이전트 설치/버전과 초기 연결5검사를309초까지 확인했다. 기존 agents-smoke.js의 삭제된 tab-setup 선택자를 Settings→설치 안내로 갱신했다. 다른 두 에이전트의 전체 성공을 주장하지 않으며 검증 runner/QA 앱만 종료했다. 비공개 증거 dist/ios-app/install-diagnosis/codex-claude-proof.json 및 partial-progress.json. 사용자가 이후 **폰에서도 Codex 설치 성공**을 확인했다. Claude Code의 폰 설치 결과와 실패 시 마지막 문구는 아직 확인되지 않았다. Simulator에서는 두 CLI 모두 설치/버전 확인에 성공했으며 폰의 Claude 실패 원인을 단정하지 않는다. 제품 installer/고정 패키지 버전은 추측으로 변경하지 않았다.
- 백그라운드 상시 Linux 실행은 구현하지 않았다. Apple의 [긴 작업 API](https://developer.apple.com/documentation/backgroundtasks/performing-long-running-tasks-on-ios-and-ipados)는 iOS26+에서 전경의 명시적 사용자 동작으로 시작한 유한 작업에 진행률/완료/취소·만료 처리를 연결해야 하며 무기한 브리지 유지를 보장하지 않는다. 별도 작업 수명 설계와 실기기 검증이 필요하다. 화면 옵션은 백그라운드 실행 권한을 부여하지 않는다. 완전한 단일 앱 사용 제한은 사용자가 iOS 사용법 유도를 직접 설정하는 영역이다.
- **이번 변경은 Simulator 빌드/소스 검증 상태이며 TestFlight0.1.0(5)에 미포함**이다. 새 기기용 IPA·TestFlight/Android/웹사이트 배포나 사용자 앱/브리지 재시작은 수행하지 않았다. 다음 명시적 배포 요청에서 현재 소스를 새 빌드 번호로 검증/배포해야 한다. 실제 iPhone의 긴 잠금·메모리 압박·홈 제스처와 설치 실패 원인은 남은 확인 사항이다.

## 0.1.0(5) 배포 검증 (2026-11-09)

기존 Simulator25개/JS오류0의 검증 소스를 iphoneos27.2/arm64로 컴파일했다. 아카이브/dSYM·배포 서명·IPA 내 자산 hash와 현재 소스(웹64·게스트17·네이티브11자산/11소스)가 일치한다. IPA8,499,702bytes·SHA-256 `e9afeb9bd3d7b8f9c19af532565ec16d811adf4a63b34bc3afb0ba149acb6013`, 소스 `0bcbbd4c19bb46dd9551f01da7127940facdcfb9`다. Xcode 업로드22:54:18/exit0/EXPORT SUCCEEDED 뒤 Apple 처리·테스트 안내737자 저장·암호화 응답을 완료하고 **22:59 Asia/Seoul 기존 Bibimer Internal에서0.1.0(5)·테스트 중·90일 후 만료·1테스터/5빌드**를 확인했다. 아래 미배포 기록은 구현 당시 상태이며 이번 빌드에 포함됐다. 실제 iPhone 손가락 제스처/장시간 단절·Linux 실제 종료 후 재실행 검증은 남아 있다. 상세 배포 근거는 `TESTFLIGHT.md`와 비공개 `dist/ios-testflight/upload-0.1.0-5-nov09/upload-receipt.json`을 따른다.

## iOS 연결 끊김 탐색·재연결·영역별 글자 확대 수정 (2026-11-09, 미배포)

- 사용자가 Linux 연결이 끊긴 뒤 상단 버튼이 가려지고 설정에서 Chat/프로젝트 화면으로 돌아가지 못하며, 재연결도 동작하지 않고 별도 메시지가 없다고 보고했다. 전체 화면의 자격 조건에 연결 상태가 없어 오프라인에도 상단/공지 영역을 숨기던 경로를 수정했다. 연결이 끊기면 전체 화면을 해제하고 탐색/오류 안내를 표시한다. iOS의 `tab` 래퍼가 `{replace:true}`를 누락해 설정↔설치 안내를 Back으로 반복하던 것도 모든 인자를 전달하도록 고쳤다. 세션/초안/대기열을 변경하지 않는다.
- 네이티브 `fail`이 기존 WKWebView 전체를 숨기던 처리를 없애고 기존 화면을 유지한다(초기 실패도 같은 로컬 UI로 안내). 재연결/초기 연결 버튼은 네이티브에 상태 확인을 요청하며 health task 하나만 실행한다. 성공해도 WebView를 다시 만들지 않고 JS 연결만 재개한다. 취소된/오래된 health 작업은 객체 일치로 거절한다. 실제 init 종료/시작 불가를 연결 오류와 구분해10언어로 완전 종료 후 재실행을 안내한다. 현재 런타임은 프로세스당 init1회이고 종료 시 게스트 작업을 정리하므로, `exited`를 해제하거나 `boot`를 다시 호출해 복원한 척하지 않는다. 복구 이벤트에는 상태 코드만 전달하고 토큰/대화/출력을 추가하지 않는다.
- 사용자 최종 지시에 따라 **더블 탭·두 손가락의 앱 전체 확대를 끄고, Chat·터미널 영역에서 두 손가락으로 해당 영역의 글자만 조절**한다. iOS 패키지에만 viewport scale1·루트 touch-action·네이티브 pinch 비활성·좌우 bounce/히스토리 이동 방지·기본 배율 X원점 고정을 적용했다. Settings/상단/입력창의 크기는 유지하고 Chat 본문/Markdown/코드의 상대 크기와 xterm fontSize만 바꾼다. 글자 크기는 현재 앱 실행 동안 Chat/터미널별로 유지한다. 새 전역 저장 설정은 추가하지 않았다.
- `text-gestures.js`는 같은 패널 안에서 시작한 두 터치 ID만 처리하고10–26 기준 크기로 제한한다. 한 손가락 스크롤/텍스트 선택·내부 코드/표/터미널 가로 스크롤은 유지한다. 세 손가락·영역 밖 시작·터치 ID 소실·탭/프로젝트/세션 전환·숨김은 취소하며, 실제 핀치 뒤 같은 터치 위치의 잘못 생성된 클릭만 억제한다. API/모델/터미널 입력을 전송하지 않고 xterm의 창 크기만 맞춘다. 전체 화면 간 스와이프로 Settings/Chat을 전환하지 않으며 루트 화면을 고정하는 쪽을 선택했다.
- 검증: 기존 사용자 환경과 분리된 `Bibimer TestFlight QA`의 실제 WKWebView/내장 Linux **25개·14.02초·JS오류0·fatal0·진단실패0**, 기존 syscall151/152 경고4개만 남는 PASS_WITH_WARNINGS다. 네이티브503 차단 뒤 전체 화면 해제·Settings→안내→Settings→Work 왕복·일시정지 후 네이티브 재연결·동일 WKWebView/세션/초안 보존과, 네이티브 가로 고정/페이지 확대 제한·합성 TouchEvent의 터미널 글자 확대/복원·Chat CSS 크기 및 고정 UI 폰트를 확인했다. 증거 `dist/ios-app/reconnection-smoke/`, `.tools/ios-reconnection-{qa,simulator-build,main-analysis}.log`.
- 앱 Python25개·관련 Node11파일·917키×10언어·패키징/구문/diff 검사·Clang 정적 분석 진단0개 통과. 기존 Chromium terminal-tools 검사의 숨겨진 버튼 치수/과거 초안 삽입 기대를 현재의 검토 후 전송 양식으로 갱신했고20언어/너비 조합·부분 복사·CRLF/초안 race·자동 전송 없음 검사도 통과했다(`dist/ios-app/terminal-tools-browser/`). `visual-verdict`98/pass: 기존 기본 글꼴·상단/터미널 배치 유지(`.omx/state/ios-reconnection-gestures/ralph-progress.json`).
- **검증용 Simulator만 새로 빌드했으며 TestFlight0.1.0(4)·기기용 IPA/Android APK·운영 브리지/사용자 세션은 변경하지 않았다.** 이번 수정은 다음 요청 빌드에 포함해야 한다. 실제 iPhone의 손가락 더블 탭/핀치·장시간/백그라운드 네트워크 단절과 실제 Linux 종료 후 재실행은 별도 확인이며 합성 터치/HTTP차단 검사가 이를 대신하지 않는다.

## iOS 0.1.0(4) TestFlight 빌드 준비 (2026-11-09)

- Mac에서 기존 Xcode27.2/Apple SDK로 최신 기능을 컴파일했다. Xcode 업데이트로 남은27.1 SDK 경로의 Meson 캐시는 별도 보존 후 재생성했다. 사용자가 Xcode 필수 구성 요소 설치와 기존 Chrome의 Apple 로그인을 직접 완료했다. Console의 최신 iOS 빌드가3임을 확인하고4를 후보로 사용한다.
- Xcode Organizer가 받은0.1.0(3)/iPhone13/iOS27.0.1의 충돌5개는 모두 `___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption_block_invoke`에서 SIGTRAP이다. 기존3번 dSYM의 UUID `B4D12620-2BFC-3393-AFB4-C1CA16A8239C`도 충돌 바이너리와 일치한다. Apple의 iOS27 Scene 필수화에 맞춰 `UIApplicationSceneManifest`·단일 `BibimerSceneDelegate`·`UIWindow(windowScene:)`로 전환했다. Scene 재연결은 기존 컨트롤러/런타임을 재사용하고 전경/배경 처리를 유지한다. 상세 원본 충돌은 Xcode의 비공개 캐시에만 두며 저장소에 복사하지 않는다.
- 최신 브라우저 서비스를 시작할 때 Simulator의 긴 호스트 소켓 경로가 Darwin104바이트 제한에 걸려 Linux가 exit1하던 별도 오류도 재현/수정했다. Simulator는 매 실행0700 전용 임시 폴더, 기기는 앱 컨테이너의 짧은 절대 경로를 사용한다. `/private/var` 별칭은 inode/device 일치를 확인하고, PID/소켓ID 최대 길이까지 검사한다. 프로세스 CWD 변경·기기 공용 `/tmp`·런타임 패치 변경으로 우회하지 않는다.
- 앱 Python25개(기존22+Scene 배포 거절2+실제 Darwin 소켓 회귀1), iOS 브리지55개, 런타임 판정32개, 관련 Node8개·917키×10언어·구문/diff 검사 통과. 두 SDK 컴파일 성공이며 새 main의 Clang 정적 분석 진단0개다. 소켓 검사는0700/고유 경로·긴 기기 경로 거절·최대 식별자·CWD 변경 후 실제 bind/connect를 확인한다. 배포 도구는 Scene 설정 없는 앱/아카이브를 거절한다.
- 기존 사용자 Simulator와 분리한 `Bibimer TestFlight QA`(iOS26.5)의 실제 WKWebView/내장 Linux21개가14.00초에 성공했다. JS오류0·fatal0·진단실패0, 기존 syscall151/152 경고4개만 보존한 PASS_WITH_WARNINGS다. `dist/ios-app/testflight-smoke/`, `.tools/ios-testflight-nov09-{qa,simulator-scene-build,device-scene-build,main-analysis}.log`. 화면 검사의 옛 하단 탭 선택자는 현재 상단 설정/뒤로 가기로 갱신했다.
- 수정본 아카이브 `dist/ios-testflight/0.1.0-4-unsigned-nov09-scene/Bibimer.xcarchive`, 배포 export `dist/ios-testflight/0.1.0-4-export-nov09-scene/`를 사용한다. 앞선 Scene 미수정 후보는 로컬 이력으로만 보존하며 업로드하지 않는다. **업로드/Apple 처리/내부 그룹 제공 확인 전**이다. 실제 iOS27 iPhone 콜드 실행·마이크/알림 권한·음성·브라우저 로그인·백그라운드 복귀/장시간 실행은 별도 검증이며 Simulator 성공으로 해결 완료를 보장하지 않는다. Android/운영 브리지·사용자 세션은 변경하지 않았다.

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

## 2026-10-21 사용자 Codex 확인

사용자가 iOS 앱에서 Codex의 실제 계정 인증 후 동작 성공을 직접 확인했다고 보고했다. 위 자동 설치·버전 및 모의 모델 도구 검사와 구분되는 사용자 확인이다. 인증 파일·모델명·답변·세션 로그는 수집하지 않았으며, 다른 세 CLI의 실제 계정 인증·모델 사용은 이 보고로 확인되지 않았다.

## 2026-10-21 터미널 텍스트 선택·붙여넣기

xterm 출력은 일반 페이지 DOM 선택으로 복사할 수 없어 iOS 전용 ‘텍스트 선택’ 창과 ‘붙여넣기’ 버튼을 추가했다. 기존 dialog 스타일과 읽기 전용 textarea를 사용하며 UI의 16px 입력 글꼴을 유지한다. 스냅샷은 xterm의 공개 buffer/cell API를 사용해 soft-wrap만 합치고 ANSI 표시 속성 대신 실제 표시 문자를 추출한다. 명시적 공백·빈 줄·한국어·emoji를 보존하고 CJK 줄바꿈의 null padding은 가짜 공백으로 넣지 않는다. 닫으면 출력 사본과 선택 참조를 비우고 원래 포커스로 돌아간다. 출력 사본을 앱 파일이나 별도 로그에 저장하지 않는다.

붙여넣기는 버튼 클릭 때만 native RPC로 읽어 초안의 선택 범위에 삽입한다. CRLF·CR을 LF로 맞춘 뒤 UTF-8 16KiB 제한과 커서를 계산하며 자동 PTY 전송·개행 실행은 하지 않는다. 세션·프로젝트·브리지 인스턴스·generation·초안/선택 revision이 달라지면 A→B→A로 되돌아와도 거절한다. 문서별 임의 nonce와 단발 request ID·타임아웃 정리로 이전 문서·지연·중복 응답을 무시하고, native는 현재 canonical WKWebView에만 JSON으로 응답한다. 별도 clipboard 원문 로그·저장소는 만들지 않으며 삽입한 초안은 기존 초안 동작을 따른다.

새 의존성 없이 기존 xterm 번들을 실제 실행한 host 회귀에서 ANSI·CJK 마지막 열·soft-wrap URL·emoji·명시 공백/공백행·끝 빈 행·scrollback 경계를 확인했다. 부분/전체 복사·닫기 정리, 명시적 읽기만 수행, CRLF/caret, 자동 전송 0, 세션/초안/커서 경합과 전체 UTF-8 크기 거절 검사도 성공했다. 기존 Playwright/Chromium 도구로 패키징한 실제 Web 자산의 320/393px × 10언어 20개 레이아웃과 touch 이벤트 부분 복사, 실제 textarea의 선택 범위·CRLF/LF·caret6·초안 경합을 검증했다. 결과와 화면은 `dist/ios-app/terminal-tools-browser/verification.json` 및 PNG에 있다. 시각 검토는 1차 88점 뒤 한국어 버튼 줄바꿈·44px 누름 영역을 수정해 2차 95/pass를 받았다.

설치 전 읽기 전용 집계 상태에서 실행 중 프로세스4개를 확인했다. 사용자의 **‘수정본 설치 후 재실행’** 승인 후 해당 앱을 종료·업데이트하고 실제 WKWebView 검사를 실행했다. 새 필수 검사 `terminal_text_copy_and_draft_paste`를 포함한 **21개 성공14.01초·JS 오류0·fatal0**, 기존 syscall151/152 경고4개를 보존했다. native self-test의 복사·읽기는 모두 private fake clipboard만 사용하며 사용자 인증 파일 내용·대화·PTY 원문·실제 clipboard를 조회하지 않았다. 재설정·앱 삭제·CLI 재설치는 하지 않았다. `dist/ios-app/smoke/verification.json`과 시작 전 수집한29dab manifest가 증거이며 이전 결과는 history에 보존했다. iOS의 길게 누르기 선택 제스처·붙여넣기 권한창의 직접 조작 검증은 CUA 연결 실패로 남아 있다. Chromium touch 이벤트와 native RPC 검사로 실제 제스처·OS 권한창까지 검증했다고 표시하지 않는다.

런타임 패치 `29dabdb385b105b31c58b5d2d1d5958a216028d2113448eaa8b185233b09c0c8`를 그대로 사용한 양 SDK 최종 빌드는 경고·오류 0개로 성공했고 native static analyzer도 진단 0개였다. 공유 16px 입력 규칙과 새 terminal 자산의 번들 바이트 일치를 확인했다. 빌드 준비 시점의 해시는 `dist/ios-app/terminal-tools-browser/package-verification.json`에 있다. 승인 후 설치된 바이너리·터미널 자산이 검사 패키지와 같음을 확인했고, 출력 수집·self-test 인자 없이 일반 모드 PID19249로 열었다. 실제 화면에서 Connected와 Select text/Paste 버튼을 확인했다. `.tools/ios-terminal-tools/applied-verification.json`과 `normal-screen.png`에 적용 결과를 기록했다. 이전 실행 프로세스는 승인된 재시작으로 종료됐으며 현재 Session lost 표시를 실행 복원으로 가장하지 않는다.

```sh
node ios/app/tests/test_terminal_tools.cjs
node ios/app/tests/test_clipboard_bridge.cjs
node ios/app/tests/browser_terminal_tools.cjs .tools/ios-app/iphonesimulator/Bibimer.app/Web
```
