# Bibimer 다음 세션 시작점

## 레포 동기화와 Android·iOS 통합 검증 (2026-10-28)

- 사용자 요청으로 미커밋 iOS TestFlight 배포 도구·아이콘/개인정보 manifest와10월27일 사이드바·터미널 직접 입력·Codex 초기화 수정 사항을 보존해6개 논리 커밋으로 나눴다. `4a3dccd`(아이콘/개인정보), `95b41c0`(배포 도구/회귀/안내), `cf93f44`(프로젝트 폼 폭), `c13f0b4`(터미널 입력/검토 붙여넣기), `dffeabf`(Codex 기한), `81a0047`(검증/사용 안내)다.
- `origin/main`의11개 커밋을 받아 Android **0.30.0(52)·브리지0.23.0** 게시 기록·첫 메시지로 Chat 시작·에이전트 연결 관리·좁은 폼 수정을 `52cc312`로 병합했다. main 재배치나 강제 push 없이 양쪽 이력을 보존한다. `NEXT_SESSION.md`의 양쪽 추가 기록을 모두 유지했고, `app.js`의 충돌은 원격 `newChat/chatDisplay`와 입력 활성 조건을 유지하면서 `input-form.hidden = !chatDisplay`를 적용해 새 Chat 초안은 표시하고 Terminal은 숨겼다. 기존 원격 작업 기록194개 제목을 모두 보존했다.
- 통합 후 iOS 브리지 **51개**, 앱 Python **20개**, 실제 공유 UI **80개 배치**, 에이전트 연결/브라우저 진입/iOS 권한·설정/터미널 도구 검사가 통과했다. 새 Chat 검사 대역의 `agentConnections.render`와 전체 UI 검사의 기본 에이전트 선택 기대값은 원격의 새 동작에 맞춰 테스트 전용으로 보정했다. 새 Chat 검사에서 새 초안 표시·Terminal 입력창 숨김도 통과했고, 전체 격리 UI 회귀가 최종 **PASS/exit0**이다(`.tools/repo-sync-oct28-ui.log`). 소스 구문·diff·로컬 변경24개 파일의 비밀/산출물 검사도 통과했고 `dist/`·`.tools/`·인증 파일은 커밋하지 않았다.
- 이번 작업은 저장소 소스 통합이다. **Android 내부0.30.0(52), iOS TestFlight0.1.0(1) 배포본은 그대로**이며 새 앱 빌드·설치·배포·운영 브리지/사용자 세션/인증 브라우저 재시작을 하지 않았다. Terminal 입력/사이드바/Codex 수정은 새 배포 빌드 전까지 설치본에 미반영이다. 실제 iPhone·업데이트된 Android WebView 검증도 별도다.

## macOS TestFlight 보고: 사이드바·Codex 조회·터미널 입력 UI (2026-10-27, 소스 수정·미배포)

- 사용자 macOS TestFlight **0.1.0(1)**에서 프로젝트 추가 폼의 가로 스크롤·왼쪽 잘림과 Codex 조회 실패/기존 Chat 시작 실패를 실제 확인했다. 공유 CSS grid의 auto 최소 너비를 `minmax(0,1fr)`와 자식 `min-width:0`으로 보정하고 버튼 행 줄바꿈을 허용해 폼이 사이드바 너비 안에 맞도록 했다.
- 사용자 후속 요청으로 **Android/iOS Terminal에서는 하단 Chat 입력창을 숨기고 직접 xterm 입력·특수 키·에이전트/다음 실행 설정을 유지**한다. Chat 입력·초안/커서는 그대로 유지한다. iOS 붙여넣기는 기존 복사 창을 편집 가능한 검토 창으로 재사용하고 **터미널로 전송**을 명시적으로 눌러야 전송한다. 읽기/미리보기만으로 실행하지 않으며 세션·프로젝트·탭 전환 시 창·내용을 비운다.
- 같은 macOS TestFlight 앱에서 모델 호출 없이 실제 Codex0.163.0의 `initialize`·`model/list`를 진단했다. 직접 RPC 초기화1.77초·모델7개2.10초, 실제 HistoryClient 초기화1.53초·모델7개가 성공했고, 기존 앱 UI에도 모델7개가 다시 표시됐다. 최초 실패의 단일 원인은 미확정이다. 기존 브리지의 Codex 조회8초·Chat 시작20초가 iOS interpreter cold start에 짧은 점을 확인해 **조회 총125초(초기화/페이지 공유), Chat 시작135초**로 보정했다. Android 제한·권한·인증 설정을 바꾸거나 실패를 성공으로 취급하지 않는다.
- 지연된 초기화/모델 응답, 조회 총시간 초과, 조회 전용 메서드·모델 턴 미실행, 소유 프로세스 그룹 정리, Chat 시작 기한을 검사하는 회귀4개를 추가했다. 기존8초 구현이 같은9초 지연 회귀에 실패함을 확인했고 수정 후 통과했다. iOS 브리지 전체 **49개 통과**. 실제 UI의 10언어×4너비×Android/iOS **80개 배치**와 xterm 직접 입력/특수 Enter·Chat 초안/커서·iOS 붙여넣기 검토/명시 전송을 통과했다. 증빙 `dist/ios-terminal-ui/`, 실제 앱 모델 목록 `.tools/ios-testflight-fixes/codex-models-recovered.png`.
- 사용자 TestFlight 앱·기존 인증/프로젝트·사용자 Simulator를 교체하거나 재시작하지 않았다. 진단용 터미널 하나를 따로 열어 검사 후 해당 셸만 `exit`로 종료하고 기존 Codex 화면으로 돌아왔다. 모델 응답·사용량 소비 검증은 하지 않았다. 이번 소스는 **TestFlight0.1.0(1)/Android 배포본에 미반영**이며 새 배포 빌드·실기기 재검증이 필요하다. 별도 `Bibimer TestFlight QA` Simulator 최신 소스에서 native WKWebView→guest **21개 검사 통과**,11.93초·fatal0·진단실패0, 기존 syscall151/152 경고4개를 보존한 `PASS_WITH_WARNINGS`다(`dist/ios-app/testflight-fix-smoke/`). 최종 빌드의 terminal-tools/smoke/guest run.py가 현재 소스와 같음을 확인했다. 공유 전체 `scripts/smoke_ui.cjs`도 실제 PTY 직접 입력·프로젝트 격리·Chat/모델/승인/대기열/Steer/Claude/OpenCode 회귀를 통과했다(`.tools/ui-terminal-composer-smoke.log`, `TMPDIR=/private/tmp`, macOS의 X11 유틸리티 존재 검사는 명시적 fixture). 앱 Python20개·iOS JS4종·구문/diff 검사도 통과했다.

## iOS TestFlight 내부 테스트 제공 완료 (2026-10-25)

- 사용자가 실기기 구매 전 **TestFlight까지 진행**하도록 요청했다. 첫 iOS 후보는 `app.bibimer.ios`·**0.1.0(1)**이며 Android 공개/내부 트랙과 구분한다. 최신 소스의 기기용/Simulator 컴파일을 완료했고 사용자 기존 Simulator·Linux 파일·인증·세션을 교체하거나 종료하지 않았다.
- `ios/app/distribute.py`에 기존 device `.app`를 정상 Xcode 타깃으로 감싼 archive·명시적 자동 프로비저닝·로컬 App Store Connect IPA export 경로를 추가했다. 새 의존성·업로드/인증키 수집 옵션은 없다. 다른 팀/시뮬레이터/변조 실행 파일/심볼 불일치/기존 archive 덮어쓰기를 거절한다. 빌드·서명 로그는 무시되는0700출력 폴더의0600파일에만 둔다.
- `ios/app/Assets.xcassets`에 기존 브랜드 아이콘의1024px 불투명AppIcon, `Resources/PrivacyInfo.xcprivacy`에 실제 네이티브/런타임의4개 API 사유를 준비했다. `dist/ios-testflight/0.1.0-1-unsigned-final/Bibimer.xcarchive`의 Xcode archive·iPhoneOS27.1/arm64·SDK metadata·일치dSYM·507개manifest자산·privacy·iPhone/iPad아이콘을 확인했다. 이 아카이브 자체는 unsigned이며, 아래 별도 export에서 배포 서명·IPA·업로드를 완료했다.
- 별도 `Bibimer TestFlight QA` 시뮬레이터를 만들어 실제 최신 앱 WKWebView→native→내장Linux **21개 UI검사 통과**,34.08초·JS오류0·fatal0·진단실패0을 확인했다. 기존 syscall151/152경고4개와 APK네트워크복구경고1개를 보존한 `PASS_WITH_WARNINGS`다. 앱 Python20개(배포경계14개 포함), 권한/설정/클립보드/터미널 Node검사 통과. `dist/ios-app/testflight-smoke/`, `.tools/ios-testflight-{device-final-build,simulator-build,qa,app-tests-final}.log`.
- 사용자가 Apple 이중 인증과 새 Developer Program License Agreement 동의를 직접 완료했다. 실제 계정 배너가 사라진 뒤 App Store Connect에 **Bibimer / app.bibimer.ios / SKU bibimer-ios / 기본언어 en-US / Apple ID6826729307**을 등록했다. 유료 앱 계약 안내도 있지만 이번 무료 앱 등록·업로드를 막지 않았으므로 별도 계약 동의는 하지 않았다. 인증 정보·계약 화면의 개인정보는 기록하지 않는다.
- 자동서명 archive의 최초 시도는 등록 실기기가 없어 개발용 프로파일 생성에 실패했다(`dist/ios-testflight/0.1.0-1-signed/xcodebuild.log`). **unsigned archive에서 App Store Connect export를 직접 실행**하면 개발 프로파일 단계 없이 성공한다. `distribute.py --archive ... --export`에 이 경로를 반영했다. 가짜UDID/기기등록·인증서폐기는 없다.
- 배포용 IPA `dist/ios-testflight/export-unsigned-probe/export/Bibimer.ipa`: **8,275,988bytes**, SHA-256 **`33d0032b1eb815d352363a992b7614de3b244157cd29253ad77b2e76bec6e504`**. codesign strict·App Store 프로파일·팀/번들ID·만료·get-task-allow=false·기기목록없음을 검증했다. **2026-10-25 11:23 Asia/Seoul**, Xcode `destination=upload`에서 `Upload succeeded`/exit0을 확인했다. `.tools/ios-testflight-upload-0.1.0-1.log`, `dist/ios-testflight/upload-0.1.0-1/upload-receipt.json`. 이후 Apple 처리·암호화 응답·내부 제공까지 완료했다(아래 기록).
- App Store Connect 처리 완료 후 암호화 질문에서 **표준 암호화 사용(Apple OS 외 구현 포함)**·**프랑스 배포 안 함**을 선택했다. 이번 한국 계정 소유자용 첫 내부 테스트 범위이며 프랑스/외부 배포 확대 전 신고를 재검토한다. `ITSAppUsesNonExemptEncryption=false`를 임의 추가하지 않았다.
- **Bibimer Internal** 그룹에 검증된 **0.1.0(1)** 하나를 추가하고 계정 소유자 한 명만 초대했다. 실제 화면에서 **내부 그룹·테스터1명·빌드1개 / 테스트 중 / 테스터 초대됨 / 90일 후 만료**를 확인했다. 자동 배포는 꺼져 있어 이후 빌드는 직접 추가한다. 다른 테스터·외부 그룹·공개 링크·정식 App Store 출시는 없다.
- 베타 앱 설명·공개 지원 이메일·마케팅URL은 저장 후 재방문하여 유지됨을 확인했다. 심사용 추가 정보는 연락처 필수값 부족으로 저장되지 않았고, 내부 테스트에 불필요한 외부 베타 심사 연락처는 입력하지 않았다. Chrome 팝업 차단은 해소됐다. 실제 iPhone에서 같은 Apple 계정의 초대 메일을 열고 TestFlight에서 수락·설치해야 한다. 초대 수락/설치/실기기 실행은 아직 미확인이다.
- 증빙: `dist/ios-testflight/upload-0.1.0-1/{upload-receipt.json,internal-testing.jpg}`. 내부 그룹 `https://appstoreconnect.apple.com/teams/de8119d6-cda7-41ce-b0e1-5d1f49c57367/apps/6826729307/testflight/groups/05c12695-3fe4-411f-acf8-53bce8a31aac/builds`. 후속은 실제 iPhone 초기 준비·파일/인증 Safari 왕복·잠금 복귀·메모리/발열·최신 네 CLI 실제 모델 검증과 라이선스/다운로드 코드 심사 적합성 검토다. 상세 명령·한계는 `ios/app/TESTFLIGHT.md`.
## 내부52 게시 전 실제 Firefox 모바일 배치 보정 (2026-10-27)

- 사용자 제어 허용 뒤 같은 폰의 일반 Firefox·Termux:X11에서 합성 앱 화면으로 버튼 간격300배치(320/360/393/600/1024px×10언어×설치/설정/브라우저×상태2종)를 확인했다. 변경 전300개에서 간격 부족을 재현했고 현재 소스는300개 모두 통과했다. 영 높이의 빈 상태 문구를 실제 간격으로 판단하던 검사 오탐은 제외하고 실제 문구가 있는 상태도 확인했다. `dist/action-gaps/{results.json,mobile-settings.png}`.
- 실제 새 연결 관리 코드/선택기를 사용하는 API 키·OAuth·네이티브 안내300배치에서 좁은 화면의 form 기본 grid 열이 입력창의 최소 내용 폭을 따르는 넘침56개를 발견했다. `minmax(0,1fr)`와 최소 폭0을 적용해 **300개 전부 통과**했다. `dist/account-layout/{results.json,mobile-account.png}`. 실제 계정·키·인증 화면·쿠키는 사용하지 않았다. 앞선 기능 제어 함수 검사도 재통과했다.
- 화면 캡처 도구의 libOpenEXR3.5 의존성 누락을 확인해 호스트 `openexr`만3.4.4→3.5.2로 맞췄다. 다른 패키지195개·운영 브리지·사용자 세션·인증 Firefox는 재시작하지 않았다. 이미지 도구 버전 확인과 Bibimer 네이티브 캡처가 다시 동작한다.
- **폼 수정0f3e096을 포함해 같은0.30.0(52)을 재빌드하고 아래 기록대로 게시했다.** 미업로드 이전 초안은 `dist/history/0.30.0-before-account-layout/`에 보존했다. 최종 SHA는 아래 게시 기록을 따른다.

## 0.30.0(52) 내부 테스트 게시 완료 (2026-10-27)

**2026-10-27 22:24 Asia/Seoul**, 같은 폰의 Termux:X11·Firefox에서 사용자 제어 허용 후 **Android0.30.0/code52 · 브리지0.23.0**을 게시했다. **새로고침 후 활성 / 내부 테스터에게 제공됨**을 재확인했다. 새52만 포함·51제외·버전 코드1개·EN/KO노트2/2·오류0·기존 가독화 매핑 파일 경고1·확인한7개 기기 유형의 지원 변화0이다. 기존 트랙/테스터 설정은 유지했다.

설정의 **에이전트 계정 및 프로바이더 → 연결 관리**, Setup 공통 연결/상태/버전 조회, 지원되는 API 키 입력·브라우저 인증, 모바일 버튼 줄바꿈 간격과 좁은 입력 폼 보정을 포함한다. Claude 로그인·Gemini 인증 및 추가 양식이 필요한 OpenCode 인증은 명시적 Termux 경로를 유지한다. **앱 업데이트 후 설정에서 Termux 브리지0.23.0 업데이트**가 필요하다.

구현 `79c455a`와 배포 준비를 main에 동기화하고 실제 Firefox에서 발견한 폼 넘침 수정 `0f3e096`까지 push한 뒤 최종 재빌드했다. 기존 업로드 키의 AAB `dist/play/bibimer-0.30.0-52-release.aab`, SHA-256 `9dd4915bbbfd9ae6d7a7e6309b3bf4923c1f81b2709c57b3c8198f22c1bc9d5c`. 실제 리소스/Java/D8·bundletool·서명/기존 인증서·55assets 원본·연결 native 경로·브리지0.23.0·6payload 원본/해시·설치 구문/격리 추출/0700·심사 digest/비밀 원문 미포함 검증 통과. 새 키·개발 APK 생성 없음.

전체 브리지229개(앱 버전 변경 전 같은 백엔드)·버전 변경 후 scripts39개·801키×10언어·연결 제어 함수/브라우저/심사/Demo/iOS 권한 검사를 통과했다. 같은 폰의 일반 Firefox 합성 화면에서 버튼 간격300개와 연결 폼300개, 총600개 배치를 통과했다(320/360/393/600/1024px·10언어). 실제 계정·인증 화면·쿠키·모델 요청은 사용하지 않았다.

증빙 `dist/play-0.30.0/`의 검토·최종 확인·새로고침 후 게시 화면과 `published.json`, `.tools/aab-0.30.0-52-{build.log,verification.json,final-verify.log}`, `.tools/release-0.30.0-scripts.log`, `.tools/agent-connections-bridge-final.log`. EN/KO노트 `release/google-play/release-notes/0.30.0.txt`는365/209자다. 빌드 검증 JSON은 게시 전 기록이고 실제 게시 여부는 별도 게시 증빙/listing에 기록했다. 미업로드 이전 초안은 `dist/history/0.30.0-before-account-layout/`에 보존했다.

**새 실제 계정 로그인/키 저장·Play 업데이트 수신/설치·Android WebView/IME/브라우저 복귀·iOS 네이티브 빌드/배포는 미검증**이다. iOS 연결 관리 기능은 검증 전 비활성 상태다. 운영 브리지·사용자 세션·인증 Firefox를 재시작하지 않았다. 프로덕션·웹사이트 배포는 변경하지 않았고 프로덕션 마지막 확인(10월23일50심사 중/공개43)도 갱신하지 않았다.

## 에이전트 계정·프로바이더의 앱 내 관리 (2026-10-27, 이후 내부0.30.0 반영)

- 사용자 요청으로 설정의 **에이전트 계정 및 프로바이더 → 연결 관리**와 Setup의 연결/상태/버전 버튼을 공통 자체 UI로 연결했다. 해당 조회·연결 버튼은 Termux로 자동 이동하지 않는다. 브리지 미연결/구형은 안내를 표시하고 **Termux에서 직접 설정**을 선택할 때만 기존 동작을 실행한다. 설치·Claude 복구/어댑터 준비는 기존 명시적 Termux 경로다. 직전 모바일 버튼 간격 수정도 유지했다.
- 브리지 소스 **0.23.0**에 인증된 `POST /v1/agent-connections`와 `agent_connections` capability를 추가했다. Codex는 account 전용 App Server의 계정 설정·인증 종류/ChatGPT 로그인/API 키, Claude는 `auth status` JSON, OpenCode는 네이티브 제공자/인증 방식/API 키/OAuth 코드 및 자동 callback, 각 에이전트는 고정 `--version`으로 조회한다. Gemini는 설치/버전 외 인증 상태를 추측하지 않고 npm 진입 파일에 필요한 경우 Node를 쓴다. OpenCode 추가 플러그인 양식은 비활성 설명/Termux 경로로 둔다. Codex 완료는 일치하는 login ID 이벤트로 확인하며 기존 계정 조회를 새 로그인 성공으로 보지 않는다.
- 에이전트별 로그인용 프로세스/작업은 메모리에서 최대10분만 유지하고 UUID/입력 digest로 중복을 구분한다. 취소/만료/브리지 종료 시 소유한 로그인용 프로세스만 정리한다. API 키/코드/인증 URL·원본 상태/CLI 출력은 앱 설정·대화·일반 로그·브리지 메타데이터에 저장하지 않는다. 민감 입력은 전송/화면 닫기/백그라운드/브리지·프로젝트·워크트리 전환 시 비우며 늦은 응답을 적용하지 않는다. 브라우저는 사이트 출처를 표시하고 명시적 버튼으로만 연다. 기존 세션/승인/초안은 바꾸지 않고 모델 요청을 인증 검사로 보내지 않는다. 저장 뒤 모델 카탈로그 캐시만 무효화한다.
- 검증: 새 임시 네이티브 연결 **8개**(상태/버전·허용 필드·키 네이티브 저장만·중복·완료·취소/만료·범위·미지원 양식·URL·종료), UI 제어 함수의 입력 마스킹/즉시 삭제·명시적 브라우저/Termux 실행·구형 브리지·데모·브리지/프로젝트/워크트리 늦은 응답 차단, **801키×10언어**, Demo 전송/언어·브라우저 진입·심사 진입·iOS 권한 검사 통과. Python scripts **39개**(19.114초), 최종 전체 브리지 **229개**(202.967초) 통과. 최초 전체229개는 scripts import 경로 오류1/기존 PTY 출력 대기 실패1이었으며, `PYTHONPATH=bridge/tests:scripts`로 해당2개 개별 재통과 후 전체를 재실행했다. 로그 `.tools/agent-connections-{backend,scripts,bridge,regression-recheck,bridge-final}.log`.
- Android Java25개 소스/타입 검사는 격리한 R/심사 설정 대역으로 통과했다(`.tools/agent-connections-java/compile.log`). 처음에는 기존 생성 R/심사 설정이 테스트 대역이라 BRIDGE_VERSION/기존 리소스 필드2개가 없어 실패했으며 운영 파일을 바꾸지 않고 격리 대역을 보완했다. 실제 리소스/D8/APK 검증으로 보지 않는다. iOS 소스 적응·OpenCode rewrite 계약도 통과했고 공유 UI/네이티브 요청 경로는 준비했지만 iOS `agent_connections` 표시는 실제 런타임 검증 전까지 끈다.
- **이 소스 구현 단계에서는 빌드/배포하지 않았고 이후 위 내부0.30.0(52)에 반영했다.** 당시 내부0.29.0(51)에는 이번 기능이 없었다. 사용자는 새 앱 설치 후 설정의 확인 절차로 브리지0.23.0을 업데이트해야 한다. 실제 계정으로 새 키 저장/로그인·설치본 Android WebView/브라우저 복귀·iOS 네이티브 빌드/배포 검증은 후속이다. 당시 Firefox는 직접 로그인 모드였고 이후 사용자 허용 뒤 위 합성 배치 검사를 완료했다. 인증 화면/쿠키를 읽지 않았다. 기존 로그인 유지 개선·보관 기간 설정은 여전히 미구현이다.

## 모바일 버튼 줄바꿈·묶음 사이 간격 보정 (2026-10-27, 이후 내부0.30.0 반영)

- 공통 `.button-row` 안의 간격은 있었지만 연속된 버튼 행끼리, `.hint` 뒤의 버튼, 일반 인라인으로 놓인 버튼은 별도의 세로 간격이 없었다. 공통 행은 줄 사이8px·가로6px, 기본120px 줄바꿈 기준·같은 줄 높이 정렬·긴 번역의 단어 줄바꿈을 적용했다. 설치/에이전트 안내·설정의 버튼 행, 설정 단독 버튼·브라우저 설치의 전체 폭 버튼에8px 간격을 추가했다. 재접속 안내의 재시작/연결 해제, 설정 하단 개인정보/심사 진입은 공통 행으로 묶었다. 입력창의 모델/권한 간격·중단 버튼·터미널 키 스타일은 변경하지 않았다.
- HTML 중첩·ID 중복 없음, **770키×10언어**, 브라우저 설정 진입/제어 비변경·심사 진입 UI 검사와 diff 검사가 통과했다. 이 소스 구현 당시 Firefox는 직접 로그인 모드여서 화면 검증은 수행하지 않았다. 로컬 합성 미리보기 `.tools/action-gaps-preview.cjs`를 준비했으며 `dist/action-gaps/url.txt`의 페이지에서320/360/393/600/1024px×10언어×설치/설정/브라우저 화면×상태2종의 변경 전후를 비교하도록 했다. 이후 사용자 허용 뒤 위 게시 전 기록대로300개 배치 검사를 완료했다.
- **이 소스 구현 단계에서는 빌드/배포하지 않았고 이후 위 내부0.30.0(52)에 반영했다.** 당시 내부0.29.0(51)에는 이번 간격 수정이 없었다. Android/iOS 공유 HTML/CSS 소스에 반영했으며 설치본 WebView/WKWebView 확인은 후속이다. 운영 브리지·사용자 세션·Firefox 프로필/인증은 변경하거나 재시작하지 않았다.

## 브라우저 로그인·제어의 설정 진입 명확화 (2026-10-26, 이후 내부0.29.0 반영)

- 사용자 피드백으로 설정의 Firefox · Termux:X11 영역에 **로그인 및 에이전트 제어**를 주요 버튼으로 표시했다. 기존 설정 창의 직접 로그인/제어 허용 상태와 사용자 확인 동작을 유지한다. 지구본은 실행 중인 창을 바로 열고, 창이 없으면 시작 안내를 연다. 상태 조회 뒤 프로젝트가 바뀌거나 연결이 끊기면 늦은 응답으로 창을 열지 않는다. 창 열기가 제어를 자동 허용하지 않는다.
- `test_browser_entry.cjs`에서 설정 진입/직접 창 열기·권한 비변경·미실행 안내·변경된 프로젝트/오프라인 차단을 검증했다. **770키×10언어**·새 대화 검사·기존 패키징 검사도 통과했다. 이 변경까지 같은0.29.0(51)에 재빌드했으며 최종 번들 SHA는 아래 게시 완료 항목을 따른다. 브리지 소스는 그대로0.22.0이며 실제 운영 세션/권한은 바꾸지 않았다.

## 0.29.0(51) 내부 테스트 게시 완료 (2026-10-26)

**2026-10-26 23:58 Asia/Seoul**, 같은 폰의 Termux:X11·Firefox에서 사용자 로그인과 명시적 제어 허용 후 **0.29.0/code51 · 브리지0.22.0**을 내부 테스트에 게시했다. **새로고침 후 활성 / 내부 테스터에게 제공됨**을 재확인했다. 새51만 포함·50제외·버전 코드1개·EN/KO노트2/2·오류0·기존 가독화 매핑 파일 경고1·확인한7개 기기 유형의 지원 변화0이다. 기존 트랙/테스터 설정은 유지했다.

새 메시지를 보내 대화 시작, 에이전트 우선 선택/라벨, 가용 작업 폭에 맞춘 데스크톱 새 세션 배치와 **설정 → Firefox · Termux:X11 → 로그인 및 에이전트 제어**를 포함한다. 지구본은 실행 중인 브라우저 창을 열며 제어를 자동 허용하지 않는다. 첫 메시지 시작 기능은 **앱 업데이트 후 설정에서 Termux 브리지0.22.0 업데이트**가 필요하다.

소스 준비 `9de2454`, 기존 업로드 키로 서명한 AAB `dist/play/bibimer-0.29.0-51-release.aab`, SHA-256 `52403c9b6629913e9ea4abba30a5bd278937ffbcf86f9adef305a36caadf5e41`. 전체 Java/D8·bundletool·기존 서명/업로드 인증서·54assets 원본·6payload 원본/해시·설치 구문/격리 추출/0700·심사 digest/비밀 원문 미포함을 검증했다. scripts39개·770키×10언어·새 대화 renderer/전송/재시도/초안·브라우저 설정 진입/창 열기/권한 비변경·컨텍스트/구독·iOS 권한 검사가 통과했다. 전체 브리지 **221개** 통과(198.893초). 실제 Firefox520배치 검사는 버전 변경 전 같은 배치 소스의 기록이다.

증빙 `dist/play-0.29.0/`의 검토/최종 확인/새로고침 후 게시 화면과 `published.json`, 빌드/검증 `.tools/aab-0.29.0-51-{build.log,verification.json}`, 회귀 `.tools/release-0.29.0-{python,bridge}.log`, 한·영 출시노트 `release/google-play/release-notes/0.29.0.txt`(415/222자). 미업로드 이전 초안은 `dist/history/0.29.0-before-browser-settings/`에 보존했다. 빌드 검증 JSON은 게시 전 검증 결과이며 실제 게시 여부는 별도 게시 증빙과 listing에 기록했다.

**Play 업데이트 수신·실제 앱 설치·Android WebView/IME·iOS 네이티브 빌드/배포는 미검증**이다. 운영 브리지·에이전트·사용자 세션은 재시작하지 않았다. 프로덕션·iOS·웹사이트 배포는 변경하지 않았고, 프로덕션의 마지막 확인 기록(10월23일50심사 중/공개43)을 이번 내부 게시로 갱신하지 않았다.

## 새 세션 데스크톱 배치 보정 (2026-10-26, 미빌드)

- 넓은 화면에서도 시작 선택기가 세로로 쌓이고 설정과 첫 입력이 분리되던 배치를 수정했다. `#work`의 실제 가용 폭을 container query로 확인해 **760px 이상**이면 에이전트/표시 방식 라벨·선택기와 시작/가져오기 버튼을 가로로 정렬한다. 새 대화는 안내·설정·입력·모델·권한을 최대760px의 중앙 열에 모은다. 양쪽 패널을 펼쳐 좁아지면 기존 세로 배치를 사용하며, 높이650px 미만에서는 중앙 여백을 제거해 스크롤한다. 세션 유무에 따른 `new-session` 클래스 외 실행/전송 로직은 변경하지 않았다. 기존 대화·종료된 기록을 새 대화의 빈 화면 배치로 처리하지 않는다.
- 같은 폰의 **실제 일반 Firefox·Termux:X11**에서 공유 HTML/CSS/번역/선택기를 사용하는 로컬 페이지 자체 검사를 실행해 **520배치**(320/393/760/800/1024/1280/1440/1920px·짧은 창·양쪽 패널·10언어·새 대화/새 터미널/실행 중/종료 기록)의 가로 넘침 없음·실제 가용 폭에 따른 줄 배치·버튼 정렬/폭·라벨 비겹침·설정/입력 거리 검사를 통과했다. `.tools/launch-layout-preview.cjs`, `dist/new-session-layout/results.json`. Firefox의 일반 로컬 페이지가 자체 합성 DOM의 치수를 보고하는 방식이며 브라우저 디버깅/헤드리스·인증 화면·사용자 쿠키/프로필 내용은 사용하지 않았다.
- 기존 새 대화 renderer/첫 메시지·중복·재시도·초안·워크트리 선택 검사와 JS 구문/diff 검사가 통과했다. 이번 변경은 공유 UI여서 iOS 웹 패키징에도 포함된다. **APK/AAB/iOS 네이티브 빌드·설치·배포·운영 브리지/에이전트 재시작은 하지 않았다.** 실제 Android WebView·iOS WKWebView/DeX의 설치본·키보드/IME 검증은 후속이며, Firefox 캡처는 사용자가 직접 제어를 허용한 뒤 가능하다.

## 에이전트 중심 새 세션과 첫 메시지로 시작 (2026-10-26, 미빌드)

- **실행할 에이전트** 라벨을 선택기 위에 표시하고 표시 방식은 아래에 배치했다. 사용 가능한 마지막 코딩 에이전트/대화 에이전트를 우선하며, 없으면 설치 필요 상태로 둔다. **터미널 (셸)**은 마지막 보조 선택이며 별도 설명을 제공한다. 워크트리 생성 선택기도 같은 순서/라벨이다. 새 세션의 에이전트 변경은 기존 대상 세션을 열지 않고 해당 폴더의 새 초안으로 이동한다. 실행 중 에이전트 전환과 원본 세션은 유지한다.
- 세션 없는 대화 화면의 입력창을 허용했다. 보내기 시 `/v1/sessions`에 선택한 폴더·모델·권한과 `initial_message`를 함께 전달한다. `initial_chat_message` 기능을 제공하는 브리지만 허용하며, 구형은 초안 작성/수동 시작을 유지하고 전송을 막아 업데이트를 안내한다. 브리지는 첫 메시지를 네이티브 초기화 전에 메모리 대기열에 넣고 준비 후 한 번 전송한다. 명시적 네이티브 슬래시 명령은 기존 catalog 검증을 거친다. 처음 전송한 본문/receipt digest는 메타데이터에 저장하지 않는다. 같은 launch UUID/내용 재시도는 같은 세션을 반환하고 변경된 내용/재시작 뒤 확인 불가는 거절한다.
- 전송 중 중복 생성·설정 변경을 막고 실패 시 초안을 보존한다. 응답을 잃으면 같은 인스턴스의 health에서 launch ID를 확인하며, 확인 못 하면 같은 요청 ID로 명시적으로 재시도한다. 다른 화면/브리지 인스턴스의 늦은 응답은 입력을 지우거나 세션을 바꾸지 않는다. 재시작/실패한 응답·승인·큐를 자동 재전송하지 않는다. iOS 공유 UI와 권한 hook에도 적용했고 Demo는 실제 입력을 보관하지 않는 가상 응답을 시작한다.
- 검증: 새 브리지 **6개**(Codex/Claude/OpenCode 첫 메시지·중복·입력 검증·기존 승인 유지·네이티브 명령·재시작 비재생), 기존 library/queue/handoff **28개**, iOS 적응 계층 Codex/Gemini **2개**, 실제 UI 함수의 새 대화 renderer/전송/재시도/초안 검사, 기존 Demo 전송 계약과 iOS 권한/설정 검사, **769키×10언어** 통과. Demo Java **106개 단언/12시나리오**와 비접근 검사도 통과했다. `.tools/initial-message-{bridge,regression,ios-focused,demo}.log`. 실제 iOS `package_web()`의 공유52개 자산 원본 일치·새 입력 동작/권한 hook·app.js 구문을 확인했다.
- 기존 iOS 전체35개 검사 시도는 Termux에서 `/usr/bin/env python3` fixture 실행과 고정 PATH의 Python 탐색 등 환경 차이로 **실패5/오류9**였다(`.tools/initial-message-ios-bridge.log`). 이 결과를 성공으로 처리하지 않았고, 새 기능은 절대 Python 경로를 쓰는 임시 원본 peer로 iOS 적응 계층을 집중 검증했다. 기존 전체 회귀는 Mac/iOS 환경에서 후속 확인한다. 테스트 코드 작성 중 fixture 중복 등록 실패는 수정 후 최종6개에 포함해 재통과했다.
- **APK/AAB/iOS 네이티브 빌드·설치·배포·버전 변경·운영 브리지/사용자 세션 재시작은 하지 않았다.** 다음 명시적 빌드에서 Android 앱과 새 브리지 payload를 함께 반영하고 설정의 확인 절차로 브리지를 업데이트해야 한다. 실제 Android WebView/iOS WKWebView의 화면·키보드/IME·설치 후 첫 메시지 전체 흐름은 미검증이다. 이전 UI 문구/iOS 확인은 `493f03d`로 main 동기화했으며 이번 소스 수정도 사용자 레포 싱크 요청에 이어 반영한다.

## iOS 공유 UI 반영 확인 (2026-10-23, 미빌드)

- 사용자 요청에 따라 iOS의 새 세션 선택기와 최근 공통 UI 수정을 확인했다. iOS `package_web()`가 현재 Android assets를 가져오므로 **실행할 도구 / 터미널 (셸) / 표시 방식 / 대화 · UI 포맷팅**과 셀렉터 아웃라인·패딩·모델/권한 간격·원형 사용량/상세 막대·중단 버튼 여백이 함께 반영된다. iOS 전용 중복 UI 소스는 필요하지 않으며 `ios/app/README.md`에 공유 범위와 검증 경계를 기록했다.
- 실제 `package_web()`만 `.tools/ios-ui-sync/Web`에 실행해 의도적인 통합 대상 `index.html`/`app.js` 외 **52개 공유 자산의 원본 일치**와 새 라벨·기본 셸을 확인했다. 패키징된 iOS `platform.js`를 적용한6개 문구×10언어의 번역/DOM 적용이 통과했고 iOS 샌드박스 문구가 유지된다. 패키징된 app.js 구문·기존 iOS 권한/설치 catalog 검사·컨텍스트 표시 기준 저장 검사도 통과했다. 16px 입력창·터미널 도구·권한 hook·메타데이터 조회 제한시간을 유지한다.
- **iOS 네이티브 빌드·Simulator/실기기 설치·WKWebView 화면 검증·배포는 하지 않았다.** 다음 iOS 빌드 시 포함되며 기기 화면 확인은 후속이다. Android 빌드·운영 브리지·사용자 세션도 변경하지 않았다.

## 새 세션 선택기 구분과 UI 포맷팅 문구 (2026-10-23, 미배포)

- 새 세션의 숨겨진 실행 도구 라벨을 **실행할 도구**로 표시하고 기본 셸 이름을 **터미널 (셸)**로 바꿔 모델 선택과 구분했다. 라벨과 선택기를 각각 전체 너비 행에 배치하고 시작/가져오기 버튼은 다음 행에 유지한다. 화면 방식은 **표시 방식**, 대화 옵션은 **대화 · UI 포맷팅**으로 변경하고 메시지·도구·승인을 UI로 정리한다는 설명을 적용했다. 기존6키를10언어에서 수정했으며 모델 선택·기본값·실행 로직은 변경하지 않았다.
- 검증: **766키×10언어**, 기존 공유 선택기 smoke, 실제 HTML/CSS/선택기 소스의320/393/1024px×10언어 **30배치** 통과. 보이는 도구 라벨·선택창 제목·기본 셸·표시 방식 선택·버튼 행 정렬·넘침/겹침 없음을 확인했다. `.tools/session-copy-layout.cjs`, `.tools/session-copy-select.log`, 시각 확인한 `dist/screenshots/new-session-labels-393-ko.png`가 증빙이다. 격리 UI 검사이며 실제 모델/운영 브리지/사용자 세션은 실행하거나 변경하지 않았다.
- **APK/AAB 빌드·배포는 하지 않았다.** 내부 게시 및 정식 심사 제출된0.28.1(50)에는 이 변경이 포함되지 않는다. 다음 명시적 빌드 요청 때 반영하고 설치된 Android WebView에서 확인해야 한다.

## 0.28.1(50) 정식 배포 심사 제출 (2026-10-23)

- **2026-10-23 12:06 Asia/Seoul**, 검증된 내부0.28.1(50)을 같은 번들로 프로덕션 승급해 변경 **1개** 전송을 확정했다. 기존178개 국가/지역 **100% 전체 출시**, 새50만 포함·43제외. 새 빌드/업로드/버전/키 변경 없음. SHA-256 **`c532b23e457ec85241f119e86d9e55250154b1c5c3d4a1c2bb001974191f1939`** 재확인.
- 새로고침 후 게시 개요에 **in_review** 및 이번 프로덕션50/전체 출시 시작을 확인했다. 관리형 게시가 꺼져 있어 **Google 승인 후 자동 게시**한다. **새50 정식 공개 완료가 아니다.** 현재 공개 **0.25.0(43)**이10월22일22:33 게시·Google Play 제공됨을 재확인했다. 이전43 기록과 currentPublicVersion을 갱신했다.
- 정식 EN/KO누적 노트 `release/google-play/release-notes/0.28.1-production.txt`: 사용량/구독 표시·Firefox/X11·업데이트 후 다시 열기·설정 간격·브리지0.21.0 안내. 오류0·기존 가독화 매핑 파일 경고1·지원기기 변화0. 내부50 및 기존 테스터/공개 대상국/관리형 게시 설정은 유지한다.
- 증빙 `dist/production-0.28.1/` (`previous-release`, `review-bundle`, `review-notes`, `review-warning`, `review-devices`, `review-rollout`, `submission-confirmation`, `submitted` 화면 및 `submitted.json`). 실제 같은 폰의 기존 X11 Firefox에서 일반 UI로 처리했고 비공개 Console API/브라우저 디버깅 프로토콜을 사용하지 않았다. 프로덕션 `https://play.google.com/console/u/0/developers/5778023895269243113/app/4975090737012022496/tracks/4697502344481526582`, 게시개요 `https://play.google.com/console/u/0/developers/5778023895269243113/app/4975090737012022496/publishing`.
- **후속: Google 검사/심사 결과와 승인 후 공개 버전50 상태 확인.** 현재 실제 기기 Play 업데이트 수신/설치와 새 APK의 브라우저/복구 전체 흐름은 미검증이다. 사용자 운영 브리지/에이전트/인증 Firefox·내부 트랙·웹사이트 배포·iOS는 재시작/변경하지 않았다.

## 0.28.1(50) 내부 테스트 게시 완료 (2026-10-23)

- **2026-10-23 11:11 Asia/Seoul**, 같은 폰의 기존 Termux:X11·Firefox에서 게시하고 **새로고침 후 활성 / 내부 테스터에게 제공됨**을 확인했다. 새50만 포함·49제외·버전 코드1개·EN/KO노트2/2·오류0·기존 가독화 매핑 파일 경고1·확인한 기기 유형의 지원 변화0. 기존 트랙/테스터 설정 유지. 출시 이름 `0.28.1 (50) - Compact model and permission spacing`.
- 준비 커밋 `5a1cf19`, AAB `dist/play/bibimer-0.28.1-50-release.aab`, SHA-256 **`c532b23e457ec85241f119e86d9e55250154b1c5c3d4a1c2bb001974191f1939`**. 기존 키·심사 digest로 전체 Java/D8·bundletool·업로드 인증서·54assets 원본·6payload·설치 구문/격리 추출/0700·비밀 원문 미포함 검증 통과. 이전49에서 변경된 패키지 asset은 **app.css 하나**다. 새 키·Doppler 재조회·개발 APK 생성 없음.
- 내장 브리지 **0.21.0 유지**. 모델/권한 줄의 상단 중복 마진4px를 없애 실제 간격10→6px를 반영했으며 터치 영역과 아래 여백은 유지한다. 이번 간격 수정을 위한 추가 브리지 업데이트는 필요하지 않다.
- 버전 변경 후 scripts39개·실제 UI1,600배치·권한 시트 선택·766키×10언어·전체 격리 Chromium UI 통과. `.tools/release-0.28.1-{python,layout,i18n,ui}.log`, 빌드/검증 `.tools/aab-0.28.1-50-{build.log,verification.json}`. 공개 브라우저 프로토콜/비공개 Console API 없이 실제 X11 화면·키보드·마우스·일반 파일 선택창을 사용했다.
- 증빙 `dist/play-0.28.1/{review-warning,review-devices,review-bundle,review-notes,published-before-refresh,published}.png`, `published.json`. README EN/KO·출시 JSON·개발/배포 문서를 갱신했다. **Play 업데이트 수신·새 앱 설치·실제 WebView 간격은 미검증**이다. 사용자 운영 브리지·에이전트·인증 Firefox·프로덕션·iOS·웹사이트 배포는 재시작/변경하지 않았다.

## 모델·권한 선택 줄 간격 소스 보정 (2026-10-23, 이후 내부0.28.1 반영)

- 사용자 보고: 두 설정 줄 사이가 다른 영역보다 여전히 넓음. 권한 줄의44px 터치 영역에서32px 셀렉터를 가운데 정렬하면서 생긴6px에 `.composer-options`의 상단 마진4px가 더해져 실제 테두리 간격이10px임을 확인했다. 상단 마진만0으로 바꿔 실제 간격을6px로 줄였다. 셀렉터32px·사용량/정보 버튼44px 터치 영역·아래 여백은 유지한다.
- 실제 소스 CSS·선택 UI로320/393/600/1024px,10언어,권한10종,Fast/사용량 표시 조합 **1,600개 배치**에서 실제 간격6px·비겹침·높이를 확인하고 권한 하단 시트에서 실제 선택까지 통과했다. 변경 전1,200개 배치의 실제 간격10px도 확인했다. 무시된 검사 `.tools/composer-gap-check.cjs`, 화면 `dist/screenshots/composer-gap-393-ko.png`를 시각 확인했다.
- 이 소스 보정 단계에서는 빌드하지 않았으며 이후 사용자 요청으로 위 내부0.28.1/code50에 반영했다. 실제 Android 설치본 검증은 후속이다. 에이전트/브리지 실행·사용자 세션은 변경하지 않았다.

## 0.28.0(49) 내부 테스트 게시 완료 (2026-10-23)

- **2026-10-23 09:36 Asia/Seoul**, 같은 폰의 기존 Termux:X11·Firefox에서 내부0.28.0/code49를 게시하고 **새로고침 후 활성 / 내부 테스터에게 제공됨**을 재확인했다. 새49만 포함·48제외·버전 코드1개·EN/KO노트2/2·오류0·기존 가독화 매핑 파일 경고1·확인한 기기 유형의 지원 변화0. 기존 트랙/테스터 설정 유지. 출시 이름 `0.28.0 (49) - Reopen sessions after bridge updates`.
- 준비 커밋 `2bc21e2`, AAB `dist/play/bibimer-0.28.0-49-release.aab`, SHA-256 **`a504742899a885586424fc9daa20f5032beb693d897bce43b56ab52e6e3d5268`**. 기존 업로드 키·심사 digest로 빌드해 서명/인증서·bundletool·54assets 원본·새 native API·브리지0.21.0·6payload·설치 구문/격리 추출/0700·비밀 원문 미포함 검증을 통과했다. `.tools/aab-0.28.0-49-{build.log,verification.json}`. 새 키·Doppler 재조회·개발 APK 생성 없음.
- 버전 변경 후 scripts **39개**, 복구/유지보수/브라우저 **32개**, **전체 격리 Chromium UI**, 실제 임시 브리지 내장 업데이트의 기본 다시 열기, **766키×10언어** 통과. `.tools/release-0.28.0-{python,bridge,ui,reopen,i18n}.log`. 이전 버전 전체213개와 추가 경계 검사는 아래 기록과 구분한다. 공개 브라우저 프로토콜/비공개 Console API 없이 실제 X11 화면·키보드·마우스·일반 파일 선택창만 사용했다.
- 증빙 `dist/play-0.28.0/{review-warning,review-devices,review-bundle,review-notes,published-before-refresh,published}.png`, `published.json`. README EN/KO·출시 JSON·개발/배포/구조/UI 문서를 갱신했다.
- **앱 업데이트 후 설정에서 Termux 브리지를0.21.0으로 업데이트**하면 확인한 종료 세션을 기본으로 다시 연다. Chat은 저장 네이티브 대화, 터미널은 새 실행, Firefox는 기존 프로필의 직접 로그인 모드다. 중단 응답·명령·승인·대기열·PTY 출력은 복원하지 않는다. 사용자 운영 브리지·실행 중 에이전트·인증 Firefox는 재시작하지 않았다. **Play 업데이트 수신·새 앱 설치·새 APK의 전체 업데이트/복구 및 Android 강제 종료/절전 복구는 미검증**. iOS·프로덕션·웹사이트 배포는 변경하지 않았다.

## 브리지 업데이트 후 세션 다시 열기 소스 구현 (2026-10-23, 이후 내부0.28.0 반영)

- 사용자 요청: 브리지 업데이트 때문에 종료한 세션을 완료 후 복구. 업데이트 종료 확인 창의 **업데이트 후 세션 다시 열기**를 기본 선택으로 추가했다. 기존 전체 프로젝트/워크트리/보관함/터미널 대상 확인·실제 종료 확인·instance 변경/새 세션 차단을 유지하며, 일반 재시작·옵션 해제·업데이트 실패는 자동으로 다시 열지 않는다. 기존 Android 앱에는 새 메서드가 없어 기존 동작을 유지한다.
- Chat은 저장이 확인된 **같은 Codex·Claude·OpenCode 네이티브 대화**를 resume하고, 터미널은 같은 폴더·설정으로 새 실행을 연다. Firefox는 기존 프로젝트 프로필의 직접 로그인 모드로 열어 제어 권한을 다시 확인한다. Bibimer 논리 세션 ID·이름·보관·선택·작성 중 초안을 유지한다. 중단된 응답·명령·승인·대기열·PTY 출력은 재전송/복원하지 않는다.
- 새 `bridge/maintenance_recovery.py`: 최대128 대상·0600 원자적 기록·allowlist 메타데이터·flock·파생 launch UUID·새 instance의 명시적 startup flag. 기존 브리지가 새 API를 몰라도 새 유지보수 도우미가 종료 후 인증된 health에서 계획을 만든다. 일반 startup은 기록이 있어도 자동 실행하지 않으며 업데이트 롤백의 이전 브리지에는 새 flag를 전달하지 않는다. 실패/저장 없음/실행 여부 불명을 구분해 설정에 표시하고 확인된 실패/미시작만 명시적으로 재시도한다. 복구 중에는 추가 유지보수를 막는다. 입력 본문·터미널 명령·큐·브라우저 URL·자격 증명은 복구 파일에 저장하지 않는다.
- Android native에 UUID 전용 `maintainBridgeWithRecovery`와 제한된 `/v1/maintenance/recovery` GET/POST를 추가했다. EN/KO 및 나머지8개 카탈로그9키 추가(총766키×10언어). 설치기·유지보수 payload에 새 모듈을 포함해 **6payload**가 된다.
- 검증: 전체 브리지 **213테스트**, 최종 소스의 복구/유지보수/브라우저 집중 **32테스트**, scripts **39테스트**, 전체 격리 UI smoke와 **766키×10언어** 통과. 실제 임시 브리지+앱 소스+내장 업데이트 도우미로 기본 다시 열기/옵션 해제/이전 네이티브 경로를 확인했다. Chat native ID·턴 수 불변, 승인/큐 미재실행, 보관된 워크트리 터미널·세션 ID·선택·초안 유지, Firefox 같은 프로필/직접 모드, 부분 실패/재시도/실행 불명 차단, 유효기간/손상 기록/변경된 영수증, 실패 롤백을 검증했다. 320px 10언어 확인 창과 결과/오류/재시도 UI도 통과했다. 증거는 무시된 `.tools/recovery-*-tests*.log`, `.tools/recovery-focused-final.log`, `dist/screenshots/bridge-maintenance-end-320-{en,ko}.png`. 임시 상태 폴더·가짜 에이전트/브라우저만 사용했으며 현재 사용자 브리지·실행 중 에이전트·실제 로그인 프로필은 재시작/종료하지 않았다.
- **이 소스 구현 단계에서는 APK/AAB 빌드·배포를 하지 않았다.** 이후 사용자 요청으로 위 내부0.28.0/code49·브리지0.21.0에 반영했다. 새 Android 앱에서 RUN_COMMAND→업데이트→다시 열기까지의 실제 설치본 검증, Android 강제 종료/절전 중 복구는 미검증이다.

## 0.27.0(48) 내부 테스트 게시 완료 (2026-10-23)

- **08:25 Asia/Seoul**, 같은 폰의 기존 Termux:X11·Firefox에서 사용자 요청대로 내부0.27.0/code48을 게시했다. Console **활성 / 내부 테스터에게 제공됨**, 새48만 포함·47제외·버전 코드1개·EN/KO노트2/2·오류0·기존 가독화 매핑 파일 경고1·확인한 기기 유형의 지원 변화0을 확인했고 **페이지 새로고침 뒤 상태를 재확인**했다. 출시 이름 `0.27.0 (48) - Firefox browser integration`. 기존 내부 트랙/테스터 설정을 유지했다.
- 준비 커밋 `f3239b7`의 서명 AAB `dist/play/bibimer-0.27.0-48-release.aab`를 그대로 업로드했다. SHA-256 **`8523103afc029ceb732516afff119fe52df9322535895f5c35e1a4875bd540c1`**. 새 키·Doppler 재조회·개발 APK 생성 없음. 내장 브리지는 **0.20.0**, 초기 설치/유지보수에는 새 `browser_tools.py`를 포함한 **5payload**가 들어간다. 전체 빌드/서명/54assets/실제 DEX/비밀 원문 미포함/설치 격리 추출 검증을 통과했다. `.tools/aab-0.27.0-48-{build.log,verification.json}`, `.tools/verify-aab-0.27.0.py`.
- 버전 변경 후 scripts **39개**, 브라우저·유지보수 **21개**, **전체 격리 Chromium UI**, **757키×10언어**가 모두 통과했다. `.tools/release-0.27.0-{python,bridge,ui,i18n}.log`. 동일 구현의 버전 변경 전 전체 브리지204개 및 실제 폰 Firefox/X11 검증은 아래 기록과 구분한다. 공개 브라우저 프로토콜/비공개 Console API를 호출하지 않고 X11 화면/키보드/마우스/일반 파일 선택창만 사용했다. GTK 파일 선택창은 부모 Firefox 캡처에서 가려져 전용 display의 root 캡처로 확인했다.
- 증빙 `dist/play-0.27.0/{review-warning,review-devices,review-bundle,review-notes,published-before-refresh,published}.png`, 실제 UI 관찰 `published.json`. README EN/KO·출시 JSON·개발/배포/UI/구조 문서를 내부48 게시 상태로 갱신했다.
- **앱 업데이트 후 설정에서 Termux 브리지를 0.20.0으로 업데이트해야 브라우저 연동이 표시된다.** 사용자 운영 브리지·기존 에이전트·인증 Firefox를 재시작하지 않았다. 브리지 업데이트는 앱에서 종료 대상을 확인하고 사용자가 진행한다. **Play 업데이트 수신·새 앱 설치·새 APK의 설치→인증 전체 흐름은 미검증**이며 iOS·프로덕션·웹사이트 배포는 변경하지 않았다.

## 0.27.0(48) 내부 테스트 배포 준비 (2026-10-23)

- 사용자 ‘내부 테스트 배포’ 요청으로 브라우저 연동 워크트리를 `main`에 통합했다. 구현 커밋 `7fd5f4d`, main 통합 `c626f41`; 미커밋이던 모델/권한4px 간격·응답 중단 버튼28px/세로2px 변경은 `0b560dc`로 보존했다. 충돌은 NEXT 기록과 이미 같은 결과인 CSS였으며 상세 구현 기록과 최종 UI 값을 유지했다.
- Android **0.27.0 / versionCode48**, 내장 브리지 **0.20.0**으로 구분했다. 기존 업로드 키·심사 코드로 서명한 `dist/play/bibimer-0.27.0-48-release.aab`, SHA-256 **`8523103afc029ceb732516afff119fe52df9322535895f5c35e1a4875bd540c1`**. bundletool·서명/기존 인증서·54assets 원본·실제 DEX 브라우저 native API/브리지 버전·심사 digest/비밀 원문 미포함·설치/유지보수 **5payload**·설치 스크립트 구문/격리 추출/0700을 확인했다. `.tools/aab-0.27.0-48-{build.log,verification.json}`, `.tools/verify-aab-0.27.0.py`.
- 새 브라우저 기능은 앱 업데이트와 설정의 브리지0.20.0 업데이트가 필요하다. 이 배포 작업에서는 사용자 운영 브리지·기존 에이전트·기존 인증 Firefox를 재시작하지 않는다. 새 브리지 업데이트는 앱의 종료 대상 확인 흐름으로 사용자가 진행한다.
- 버전 변경 후 Python scripts39개·757키×10언어/언어 UI가 통과했다(`.tools/release-0.27.0-{python,i18n}.log`). 격리 전체 UI와 브라우저·유지보수21개도 통과했으며, 이전 구현의 전체 브리지204개 및 같은 폰 실제 X11/Firefox 검증은 아래에 기록했다. **이 항목은 서명 빌드 준비 기록이며 Play 게시 완료를 의미하지 않는다.** EN/KO 출시노트 `release/google-play/release-notes/0.27.0.txt`.

## Firefox·Termux:X11 기본 연동 구현 (2026-10-23, 별도 워크트리·미배포)

- 사용자 승인에 따라 기존 `feat/termux-x11-browser` 워크트리(`/data/data/com.termux/files/home/projects/bibimer-x11-browser`)에 구현했다. `main`의0.26.3 게시 상태를 `d3d4301`로 병합하고, 원본 작업 폴더의 미커밋 UI 수정(모델/권한 간격4px·응답 중단 버튼28px/세로2px·긴 번역 말줄임)도 복사해 보존했다. 원본 `main`에는 기능을 병합하지 않았다.
- 설정 → **Firefox · Termux:X11**에서 에이전트 연결을 저장하고 기본은 켜짐이다. **Termux에서 준비**는 기존 RUN_COMMAND 권한 흐름으로 새 터미널에서 고정 패키지 설치와 Firefox 버전 확인을 실행한다. X11 Android 앱은 공식 릴리스 링크에서 사용자가 설치하며 명령 복사도 유지한다. 설치 완료·권한 허용을 추측하지 않는다. 새 Codex·Claude·OpenCode Chat에는 공통 `bibimer-browser` 명령 경로와 사용 안내를 자동 연결한다. PTY에는 도구 환경만 제공하고 실행 중 프로세스에 명령을 주입하지 않는다. 전역 에이전트 설정/사용자 프로젝트 AGENTS 파일은 바꾸지 않는다.
- 첫 브라우저 요청에 일반 Firefox를 열고 같은 프로젝트의 워크트리/세션에서 창과0700 프로필을 공유한다. 다른 프로젝트는 분리한다. 기존 실험 프로필·저장소 밖 배포용 실제 로그인 프로필을 이동/복사하지 않는다. 새 창은 직접 로그인 모드로 캡처·입력을 차단하고 앱의 **로그인 완료 · 에이전트 제어 허용**으로만 해제한다. **직접 로그인**으로 돌아가면 진행 중 조작을 마친 뒤 차단·임시 캡처/소유 클립보드 정리를 수행한다. 연결 끄기는 기존 도구 접근도 막되 창/세션은 임의 종료하지 않는다.
- `browser_tools.py`의 비공개 Unix socket·실행 세션별 메모리 capability로 `open/status/screenshot/click/type/key/scroll/release`를 제공한다. 전용 display/활성 Firefox 창을 확인하고 현재 화면 크기로 좌표를 검증한다. 한 에이전트씩 창을 점유하며 read-only/plan은 입력을 거절한다. 키 입력·원본 URL·페이지·쿠키·capability를 일반 로그/브리지 메타데이터에 저장하지 않는다. 캡처는 에이전트별 최신0600 임시 파일이며 수동 모드/연결 끄기/서비스 종료에 정리한다. 브라우저 진단 출력은 폐기한다.
- 실기기에서 발견한 세 문제를 수정했다. Firefox 계열 자식에서만 에이전트의 `LD_LIBRARY_PATH`/`LD_PRELOAD`를 제거한다. Xorg는128바이트 넘는 인자를 거절하므로 인증 cookie 파일을 짧은0700 임시 폴더/0600 파일로 두고 종료 후 삭제한다. Firefox의 클립보드 TARGETS 조회 때문에 xclip1회 모드는 한글 붙여넣기가 비었으므로, 소유한 foreground xclip을 유지하고 수동 모드/종료에만 해당 프로세스를 정리한다. GTK 파일 선택창 조작 시 부모를 재활성화하지 않는다. X11은 인증 cookie·TCP 비활성화·UUID tag·소유 display/process lock을 사용한다. VNC/ADB/브라우저 디버깅 포트/자동화 플래그·UA 변조는 없다.
- 초기 설치와 브리지 유지보수 payload에 새 모듈을 포함하고, 유지보수 사전검증도 전체 payload를 임시 폴더에 구성한 뒤 import하도록 수정했다. 종료·보관·목록·유지보수 대상 및 재시작 뒤 `lost`/출력 비복원 규칙을 유지한다. 앱 설정/설치/로그인 상태·오류는 **757키×10언어**다. 구형 브리지는 새 `browser_tools_x11` 기능을 제공하지 않으므로 UI에서 구분한다.
- 검증: 전체 브리지 **204개 통과**(`.tools/browser-all-final.log`,180.425초), 최종 조작/수명주기 **13개 재통과**(`.tools/browser-controls-final.log`), Python scripts **39개 통과**(`.tools/browser-source-tests-final.log`), 브라우저 설치 명령/권한/allowlist 확장 후 native action **5개 통과**(`.tools/browser-native-actions-final.log`). 전체 격리 Chromium `smoke_ui.cjs`도 통과했다(`.tools/browser-source-ui-complete.log`): 기본 설정 저장·끄기/켜기·설치 요청·10언어320px·수동 로그인/제어 전환과 기존 Queue/Steer·승인·가져오기·재접속·PTY·초안 유지/추가 모델 입력 없음. 설치 모듈 분리와 네이티브 instruction 필드를 반영하기 전의 최초 검사 실패/중단은 `.tools/browser-{all-new,integration-final,source-ui-final}.log`에 별도 보존하며 최종 성공과 구분한다.
- **같은 폰의 실제 Termux:X11·Firefox158.0.1**에서 새 임시 프로필/로컬 시험 페이지로 수동 모드 차단, 화면 캡처, 한글 입력·실제 클릭 제출, 스크롤, 파일 선택창 열기·Escape, 수동 모드 복귀 뒤 캡처 삭제를 통과했다. 재현 명령 `python scripts/smoke_browser_native.py`, 결과 `.tools/browser-native-{final.log,result.json}`, 화면 `dist/screenshots/browser-native-local.png`. 한국어320px 설치 dialog와 실제 한글 입력 화면도 시각 확인했다. 시험 창/프로세스만 정리하고 기존 배포용 X11 창으로 돌아갔다. 실제 계정·모델 요청·기존 Firefox 프로필/브리지/에이전트 재시작은 하지 않았다.
- **APK/AAB/iOS 빌드·설치·배포·버전 변경·운영 브리지 교체·main 기능 병합/원격 push는 하지 않았다.** 다음 명시적 빌드 때 새 앱과 내장 브리지 버전을 구분하고 설치/유지보수 payload를 함께 반영해야 한다. 이전 배포 작업에서의 사용자 Google 로그인/Play 게시 성공은 이 새 APK의 전체 설치 흐름 검증이 아니다. 새 설치·Android WebView→설치/창 연결·실제 에이전트 모델의 도구 선택/이미지 읽기·Google/패스키/2단계 인증·장시간/절전·다중 프로젝트의 실제 동시 창은 후속 검증이다.

## 응답 중단 버튼 세로 여백 축소 (2026-10-23, 미배포)

- 응답 중단 버튼이 두껍게 보인다는 피드백으로 세로 패딩을 **4→2px**, 기본 최소 높이를 **32→28px**로 줄였다. 1px 테두리·붉은 글자·비활성 표시와 기존 중단 동작을 유지한다. 작은 높이 화면에서도28px로 맞춘다.
- 실제 HTML/CSS/번역 소스의 격리 Chromium에서 320/393px ×460/780px ×10언어 ×활성/비활성 **80조합**으로28px 높이·2px 패딩·테두리/색/흐림·정보 버튼과의 가운데 정렬·화면 경계를 확인했다. 초회에320px 포르투갈어/스페인어의 긴 문구가 화면 밖으로 밀려 나가 response-actions의 축소를 허용하고 중단 문구에 말줄임을 적용했다. 정보 아이콘 너비와 접근성용 전체 버튼 문구를 유지한 최종 검사에서80조합 모두 통과했다. `.tools/interrupt-layout-check.cjs`, 시각 확인한 `dist/screenshots/interrupt-compact-393-ko.png`, diff 검사 통과.
- 공유 CSS·UI 문서의 소스 반영이며 APK/AAB/iOS 빌드·설치·배포·버전 변경·운영 브리지/사용자 세션/인증 브라우저 재시작은 하지 않았다. 실제 응답 중단 요청을 보내거나 전체 브리지 회귀를 실행하지 않았다. 실제 내부 배포본은 아래0.26.3(47)이다.

## 모델/권한 섹션 간격 축소 (2026-10-23, 미배포)

- 내부0.26.3의 간격이 크다는 사용자 피드백으로 모델 설정과 권한 설정 섹션 사이 간격을 **8→4px**로 줄였다. 공유 CSS의 권한 섹션 상단 마진 한 값을 조정했으며 셀렉터 높이/패딩은 유지한다. UI 문서의 현재 간격도4px로 갱신했다.
- 격리 Chromium의 실제 HTML/CSS/선택 UI/번역 소스로 320/393/600px ×10언어 ×10권한 ×Fast/지표 표시 상태 **1,200조합**이 통과했다. 섹션 간격4px·셀렉터32px·화살표8px·겹침/넘침 없음과 실제 시트에서 권한 선택 변경을 확인했다(`.tools/permission-layout-check.cjs`). `dist/screenshots/permission-compact-393-ko.png`를 시각 확인하고 diff 검사를 통과했다.
- 소스 반영이며 APK/AAB/iOS 빌드·설치·배포·버전 변경·운영 브리지/사용자 세션/인증 브라우저 재시작은 하지 않았다. 실제 내부 배포본은 아래0.26.3(47)이다.

## Termux:X11 브라우저 수동 로그인 실험 (2026-10-21, 별도 워크트리·미배포)

- 2026-10-22 레포 싱크: 원격 `main`의 내부 테스트0.26.0 게시 완료·문서 갱신3개 커밋(`3217bbb`까지)을 반영했다. 브라우저 실험은 별도 브랜치로 유지하며 `main`에 병합하지 않았다. 공통 변경은 문서/출시 정보뿐으로 앱·브리지 실행 소스 변경이나 빌드·설치·운영 재시작은 없고, 충돌 기록을 양쪽 모두 보존한 뒤 diff/출시 JSON 구문만 확인했다.

- 후속 레포 싱크: 구현을 `02c2710`으로 커밋하고 원격 `main`의 추가10개 커밋(`d30f28f`까지)을 이 실험 브랜치에 통합했다. 로컬 `main`은 원격과 같은 지점으로 fast-forward했으며 브라우저 실험은 `main`에 병합하지 않았다. 원격의 Android0.26.0(44)/브리지0.19.0 및 iOS 클립보드 변경을 유지했다. 이번 동기화에서 앱 빌드·설치·운영 브리지 변경은 하지 않았다.
- 통합 뒤 브라우저8개·Python scripts39개 재검사와744키×10언어, iOS 클립보드/터미널 도구/컨텍스트 설정 Node 검사를 모두 통과했다. `.tools/browser-sync-{tests,scripts}.log`. 충돌은 `NEXT_SESSION.md`의 맨 위 추가 기록 한 곳뿐이었으며 양쪽 기록을 보존했다. 실제 소스의 공통 변경은 manifest 버전과 브리지 버전뿐이다.

- 사용자 요청으로 `b1ba83f`에서 **`feat/termux-x11-browser`** 브랜치와 `/data/data/com.termux/files/home/projects/bibimer-x11-browser` 워크트리를 만들었다. 원본 `bibimer/main`은 변경하지 않았다. 앞선 제안 중 **Termux:X11의 일반 브라우저 창** 방식을 구현했으며 VNC/무선 ADB/접근성 서비스/별도 PC를 사용하지 않는다. 앱 내부 CDP 화면 중계·브라우저 자동 제어는 이번 범위가 아니다.
- 프로젝트/실제 Git 워크트리 화면의 지구본 버튼 → **브라우저 · 실험**에서 도구 설치 상태·작업 폴더를 확인하고 HTTP(S) 주소(선택)를 입력해 시작한다. 최신 Termux:X11 Android 앱 및 Termux의 `termux-x11-nightly`, `firefox`가 필요하며 설치 명령 복사·공식 릴리스 링크만 제공한다. 설치/권한 변경/기존 브리지 재시작은 자동 수행하지 않는다. 정상 시작 뒤 고정 native activity와 UUID tag로 그 브라우저 창을 열고 사용자가 직접 로그인한다. 새 네이티브 API가 없는 iOS·구형 브리지·Demo에서는 진입을 숨긴다.
- 인증된 `POST /v1/browser`에서 상태 조회와 명시적 시작을 처리한다. 기존 작업 폴더 검증·요청 UUID 재시도/충돌 검사·프로필 lock·공유 display lock·기존 X socket/lock 보존·X11 setup 성공 확인을 사용한다. 자격증명/제어 문자/잘못된 포트/다른 URL 스킴은 거절하며 셸 문자열로 실행하지 않는다. 현재 에이전트/선택 세션/작성 초안은 유지한다. 늦은 응답 뒤 다른 작업 폴더나 닫은 화면을 임의로 앞으로 가져오지 않는다.
- 브라우저는 `kind: browser`인 관리 세션으로 목록·보관·이름 변경·종료·종료 후 목록 삭제·브리지 유지보수의 종료 대상에 포함된다. 브라우저 세션의 PTY 입력은 UI/서버 양쪽에서 막는다. 전용 X11 display/Firefox를 소유 POSIX 세션 안에서만 정리하고 사용자 프로세스를 이름으로 종료하지 않는다. 정상 종료는 Firefox를 먼저 정리한 뒤 X 서버를 닫도록 했다. 브리지 재시작 뒤 목록은 유지하지만 실행 복원은 하지 않고 `lost`로 표시한다.
- 작업 폴더별 비공개 상태 경로의 Firefox 프로필(0700)에 로그인/사이트 기록을 유지하고 다른 워크트리는 분리한다. 종료·목록 삭제·프로젝트 등록 해제로 프로필을 지우지 않는다. 원본 URL/페이지/로그인 입력/쿠키/브라우저 진단 출력은 Chat/PTY/일반 로그/브리지 메타데이터로 전달하지 않는다. URL 해시·창 tag만 중복 방지용 메타데이터로 남긴다. 사이트 만료/로그아웃 정책이나 Google 인증 성공을 보장하지 않는다.
- 검증: 브라우저 전용 **8개 통과**(`.tools/browser-tests.log`): 설치 조회의 무실행, 인증/Origin/URL/작업 폴더 거절, 요청 재시도와 충돌, 프로필 유지/워크트리 분리/lock, 다른 프로세스 생존, 출력/URL/입력 비노출, 종료와 재시작 비복원, X11 프로토콜/Firefox 실패 정리를 확인했다. 기존 Python scripts **39개 통과**(`.tools/browser-scripts.log`). 전체 격리 Chromium **`smoke_ui.cjs` 통과**(`.tools/browser-ui-final.log`): 설치 미완료 비활성/명령 복사/공식 링크, 10언어320×460 화면, 실제 임시 브리지+모의 X11/Firefox 시작·창 handoff·세션 관리 종료·Chat 초안/선택 유지/모델 입력0, 기존 Queue/Steer·승인/질문·PTY·가져오기·재접속을 확인했다. 초회 UI 검사는 접힌 설치 안내 안의 복사 버튼을 누르려던 검사 절차가 실패했으며 안내를 먼저 펼치도록 고쳐 전체 재검사를 통과했다.
- 18키를 추가해 **744키×10언어** 및 언어/컨텍스트/구독 renderer·JS/Python 구문·diff 검사가 통과했다. 화면 `dist/screenshots/browser-x11-{setup-320-ko,setup-320-en,running}.png` 중 한국어320px와 실행 상태를 시각 확인했다. Android 전체 Java 소스는 실제 Android36 API·XML에서 대조한 리소스 ID·기존 Play SDK 검사 대역으로 컴파일 성공했다. APK를 생성하는 빌드 경로는 실행하지 않았다. 이전 빌드의 오래된 generated R/class로만 컴파일한 첫 시도는 현재 소스 항목이 없어 실패했으므로 그 결과를 성공 근거로 쓰지 않았다.
- 전체 브리지 **199개 통과**(`.tools/browser-all-bridge-final.log`). 첫 실행은 기존 Setup 검사의 `play_sdk` import 경로1개가 실패했으며 제품 코드를 바꾸지 않고 `PYTHONPATH=scripts`로 전체 재검사를 통과했다. Firefox를 X 서버보다 먼저 정리하도록 종료 순서를 보강한 최종 소스에서도 브라우저 전용 **8개 재검사 통과**(`.tools/browser-tests-final.log`,18.474초). 이후 UI 새로고침 버튼은 기존 공통 번역의 일반 ‘새로고침’ 문구로 정리했고744키×10언어·구문·diff를 다시 확인했다.
- **최초 구현은 소스와 격리 검증까지만 수행했다. 후속 커밋·동기화는 위 기록과 같으며, 브라우저 실험의 APK/AAB/iOS 빌드·설치·배포·main 병합·운영 브리지 교체/재시작·실제 계정/모델 실행은 하지 않았다.** 실제 휴대폰의 최신 X11+Firefox 설치·네이티브 창 연결·창 크기/포커스·터치·한글 입력·팝업·패스키/2단계 인증·Google 로그인 완료 및 장시간/절전 후 유지 검증은 남아 있다. Google 로그인 성공을 확인하기 전 지원 완료로 소개하지 않는다. 설계와 공식 근거는 `docs/architecture.md`, UX는 `docs/interface.md`에 기록했다.
## 0.26.3(47) 내부 테스트 게시 완료 (2026-10-22)

- **23:58 Asia/Seoul**, 같은 폰의 기존 **Termux:X11·Firefox** 인증 상태를 유지해 **0.26.3/code47**을 내부 테스트에 게시했다. Console **활성 / 내부 테스터에게 제공됨**, 새47만 포함·46제외·버전 코드1개·EN/KO노트2/2·오류0·기존 가독화 매핑 파일 경고1·지원 기기 변화0을 확인했다. **페이지 새로고침 뒤에도 활성 상태를 재확인**했다. 출시 이름은 `0.26.3 (47) - Compact selectors and row spacing`이며 기존 내부 트랙/테스터 설정을 유지했다.
- 준비 커밋 `539c004`의 셀렉터 최소 높이·패딩 축소와 모델/권한 섹션 사이8px 간격을 반영했다. 기존 업로드 키·암호·심사 코드로 서명한 AAB `dist/play/bibimer-0.26.3-47-release.aab`, SHA-256 **`505e49986a19b07e14f4e4b0aa17135e7802744942ba4a44987d4b8a18258bd6`**를 그대로 업로드했다. 새 키·Doppler 재조회·개발 APK 생성은 없다. 내장 브리지는 **0.19.0 유지**이며46/47의54개 자산 이름은 같고 **`app.css`만 변경**됐다. 브리지·설치/유지보수 payload는 바이트 단위로 같아 이번 UI 수정을 위한 추가 브리지 업데이트는 필요하지 않다.
- 전체 Java/D8 빌드·bundletool·기존 업로드 인증서·Manifest47·54assets 원본·심사 digest 포함/비밀 원문 미포함·브리지/유지보수4payload·설치 스크립트 구문/격리 추출/0700을 검증했다. `.tools/aab-0.26.3-47-{build.log,verification.json}`, `.tools/verify-aab-0.26.3.py`.
- 버전 변경 뒤 Python scripts **39개 통과**(`.tools/release-0.26.3-python.log`), **전체 격리 Chromium UI 통과**(`.tools/release-0.26.3-ui.log`), 실제 컨텍스트/구독 renderer·**726키×10언어**/언어 선택·JS 구문·diff 검사가 통과했다. 실제 임시 브리지·모의 에이전트로 사용량/남은 양×10언어320px 및 기존 Chat/PTY·Queue/Steer·승인·질문·가져오기·재접속 회귀를 확인했다. 앞선21개 셀렉터/1,200조합의 높이·간격·겹침 검사도 유지한다. 전체 브리지를 재실행하지 않았으며 이전 Mac 실패 이력을 전체 성공으로 바꾸지 않는다.
- 이전 인증 이후의 같은 Firefox 창에서 X11 마우스·키보드·일반 파일 선택 UI로만 업로드·게시했다. 쿠키/토큰을 추출하거나 비공개 게시 API를 직접 호출하지 않았다. 화면 크기가912×931로 바뀌어 기존 UI 캡처가 대기했으나 X11 창을 앞으로 열어 브라우저 재시작 없이 조작을 이어갔다. 브라우저 프로필과 창을 유지한다.
- 증빙 `dist/play-0.26.3/{review-warning,review-devices,review-notes,published-before-refresh,published}.png`, 실제 UI 관찰 기록 `dist/play-0.26.3/published.json`. `listing.json`·README EN/KO·개발/배포 문서를 실제 내부47 게시 상태로 갱신했다. **Play 업데이트 수신·실제 앱 설치·새 WebView 동작은 미검증**이다. 운영 브리지·사용자 세션·iOS·프로덕션·테스터 설정·웹사이트 배포는 변경하지 않았다.

## 셀렉터 세로 여백·모델/권한 줄 간격 조정 (2026-10-22, 미배포)

- 사용자 피드백으로 일반 셀렉터 최소 높이를44→36px, 내부 패딩을8px10px→4px8px로 줄였다. 입력창 아래 모델·추론·에이전트와 권한 셀렉터는 **32px 높이·세로3px 패딩**으로 맞추고 모델 새로고침 버튼도32px로 정렬했다. 권한의44px 높이 덮어쓰기를 제거했다. 모델 줄의 하단 마진과 권한 섹션의 음수 상단 마진을 정리해 두 섹션 사이에 **8px 간격**을 확보했다. 실제 권한 선택 버튼은44px 지표 줄의 가운데에 배치된다.
- 검증: 실제 HTML/CSS/선택 UI/번역 소스의 격리 Chromium에서 320/393/600px ×10언어 ×10권한 이름 ×Fast 표시/숨김 ×지표 표시/숨김 **1,200조합**이 통과했다. 권한/모델 셀렉터32px, 섹션 간격8px, 권한 화살표8px, 한 줄 배치·겹침/가로 넘침 없음과 실제 하단 시트 선택 변경을 확인했다(`.tools/permission-layout-check.cjs`). **전체21개 셀렉터**의 최소 높이/세로 패딩·기본 아웃라인·열림 강조·비활성·포커스와320px 모델 줄 검사도 통과했다(`.tools/selector-outline-check.cjs`). `dist/screenshots/permission-compact-393-ko.png`를 시각 확인했고 diff 검사가 통과했다.
- 공유 CSS와 UI 문서의 소스 변경이다. 전체 앱/브리지 회귀나 실제 WebView 검증으로 확대하지 않는다. APK/AAB/iOS 빌드·설치·배포·버전 변경·운영 브리지/사용자 세션/배포용 브라우저 재시작은 하지 않았다. 현재 내부 배포본은 아래0.26.2(46)를 유지한다.

## 0.26.2(46) 내부 테스트 게시 완료 (2026-10-22)

- **23:21 Asia/Seoul**, 같은 휴대폰의 **Termux:X11·일반 Firefox158.0.1**에서 **0.26.2/code46**을 내부 테스트에 게시했다. 사용자의 명시적 ‘인증 완료’를 받은 뒤 같은 Firefox의 Play Console을 확인하고 AAB 업로드 → EN/KO노트2/2 → 검토 → 저장 및 출시 → 확인 창 확정으로 진행했다. Console **활성 / 내부 테스터에게 제공됨**, 새46만 포함·45제외·버전 코드1개·오류0·기존 가독화 매핑 파일 경고1·지원 기기 변화0을 확인했다. **페이지 새로고침 뒤에도 활성 상태가 유지됨을 재확인**했다. 출시 이름은 `0.26.2 (46) - Selector outlines and usage bars`, 기존 내부 트랙·테스터 설정을 유지했다.
- 권한 셀렉터 너비·화살표 간격, 전체 셀렉터 아웃라인, 컨텍스트·구독 기간별 상세 막대를 포함한다. 내장 브리지는 **0.19.0 유지**로 이미 같은 버전이면 UI 개선을 위한 추가 브리지 업데이트는 필요하지 않다. 별도 브라우저 실험 워크트리 기능을 앱에 병합/배포한 것은 아니며, X11 브라우저는 이번 배포를 위한 저장소 밖 도구다.
- 준비 커밋 `88d9f6d`의 서명 AAB를 그대로 업로드했다. 파일 `dist/play/bibimer-0.26.2-46-release.aab`, SHA-256 **`61bf9c1bb2cbad4a75792eefeb0a0e38222e0e4b76849c6503330470a080b141`**. 저장소 밖 기존 업로드 키·암호·심사 코드 파일을 사용했으며 새 키·Doppler 재조회·개발 APK 생성은 없다. bundletool·jarsigner·기존 Play 업로드 인증서·Manifest46·54assets 원본·DEX 심사 digest/브리지 버전·비밀 원문 미포함·유지보수4payload·설치 스크립트 구문/격리 추출/0700을 확인했다. `.tools/aab-0.26.2-46-{build.log,verification.json}`, `.tools/verify-aab-0.26.2.py`.
- 버전 변경 후 Python scripts **39개**(`.tools/release-0.26.2-python.log`), 실제 컨텍스트/구독 renderer·**726키×10언어**/언어 선택·JS 구문·diff 검사가 통과했다. UI 소스는 기능 구현 뒤 전체 `.tools/usage-popover-bars-ui.log` 성공본과 같고 패키징 자산 일치를 재검증했으므로 전체 UI/브리지를 반복 실행하지 않았다. 이전 Mac의 전체 브리지 실패 이력은 유지하며 이번 검증을 전체 브리지 성공으로 확대하지 않는다.
- **같은 폰 인증 경로의 실제 확인:** 최초에는 X11 앱이 없어 `termux-x11-nightly 1.03.01-6`과 공식 GitHub nightly universal APK를 준비하고 SHA-256/APK 서명 검증 후 사용자가 설치했다. X11 display `:71`/tag `bibimer-play`·private Xauthority에서 일반 Chromium149 로그인은 사용자가 Google의 보안 차단을 보고했다. 디버깅 pipe가 영향을 주었을 가능성은 있으나 원인으로 단정하지 않는다. Google 공식 안내 `https://support.google.com/accounts/answer/7675428?hl=en`는 일부 자동 제어 환경을 차단할 수 있다고 설명한다.
- Firefox158.0.1 설치 초회에는 C++ 심볼 누락으로 실패했다. `libc++29→30`만 업데이트하고 Codex의 별도 `LD_LIBRARY_PATH`가 구형 라이브러리를 우선하는 것을 확인해 **Firefox 자식 환경에서만 해당 변수를 제거**한 뒤 실행했다. Codex 실행 파일/라이브러리·실행 중 프로세스·사용자 셸 설정은 변경하지 않았다. Firefox는 별도0700 프로필·일반 창을 사용하며 WebDriver/Marionette/CDP/원격 디버깅·UA 변경을 쓰지 않았다. VNC·ADB·별도 PC 없이 **사용자의 실제 Google 인증과 이후 내부 게시**를 확인했다. 인증 전에는 준비 상태만 확인하고 화면·DOM·입력·쿠키를 조회하지 않았으며 관리 `/cdp`403 차단을 유지했다.
- 사용자 인증 완료 뒤 xdotool/X11의 일반 창·마우스·키보드·파일 선택 UI로만 조작했다. 브라우저 쿠키·토큰을 추출하거나 Google 비공개 게시 API를 직접 호출하지 않았다. 배포 도구/프로필/상태는 저장소 밖 `~/.local/share/bibimer-play-x11/`, 기존 브라우저 프로필은 유지했다. 모달 포커스 때문에 대기하던 자체 UI 보조 프로세스만 종료하고 조정했으며 Firefox를 재시작하지 않았다. 주소 확인용 clipboard 읽기가 지연되어 해당 읽기 보조만 정리하고, 실제 게시/새로고침 화면으로 검증했다.
- 증빙은 `dist/play-0.26.2/{review-warning,review-notes,published-before-refresh,published}.png`, 관찰 기록 `dist/play-0.26.2/published.json`. `listing.json`·README EN/KO·개발/배포 문서의 실제 내부 배포를46으로 갱신했다. **Play 업데이트 수신·실기기 앱 설치·새 Android WebView UI 검증은 아직 하지 않았다.** 이번 같은 폰 Firefox 인증/게시와 앱 설치를 구분한다. 운영 브리지·사용자 세션·iOS·프로덕션·테스터 설정·웹사이트 배포는 변경하지 않았다. Firefox/X11 창과 인증 프로필은 유지한다.

## 컨텍스트·구독 상세 팝업의 막대 표시 (2026-10-22, 미배포)

- 사용자가 원형 지표를 눌러 여는 상세 팝업에도 가로 프로그레스 바를 요청했다. 컨텍스트의 기존 native meter를 팝업으로 옮겨 표시하고 구독은 각 기간의 숫자 아래에 별도 meter를 추가했다. 접힌 권한 줄은 원형 게이지와 퍼센트만 유지하며 팝업의 막대는 같은 사용량/남은 양 설정을 따른다. 구독 기간마다 소비 비율·네이티브 주의/도달 상태에 따른 경고색과 마지막 확인 값의 흐림을 적용해 다른 기간의 상태를 섞지 않는다.
- 수치 미제공·상태만 있는 보고·초기화 시각이 지난 값의 막대는 숨기며 기존 설명을 유지한다. 실제0은 빈 막대로 표시하고100% 초과는 길이만 제한해 원본 숫자를 유지한다. 기간명과 선택 기준의 수치·마지막 확인 상태를 meter의 접근성 레이블에 전달한다. 기존 상세의 스크롤·바깥 터치/Escape/Android Back 닫기·초안 보존·입력부를 덮지 않는 배치를 유지한다. 새 번역·의존성·브리지/네이티브 변경은 없다.
- 검증: 전체 격리 Chromium `smoke_ui.cjs` **통과**(`.tools/usage-popover-bars-ui.log`). 실제 임시 브리지와 모의 에이전트로 사용량/남은 양 ×10언어320px에서 두 팝업의 막대 표시·수치, 접힌 권한 줄 높이·입력/보내기 미가림·닫기·초안 보존·추가 모델 입력 없음과 기존 Chat/PTY·승인·대기열/Steer·가져오기·재접속 회귀를 확인했다. `dist/screenshots/usage-ring-details-320-en.png`에서 구독의5시간/주간 막대와 입력부를 시각 확인했다.
- 실제 renderer Node 검사에서 기간별 막대의35/12%와 남은65/88%, 소수·0·100% 초과·미제공·상태 전용·만료·기간별 노후 상태·10언어를 확인했다. 컨텍스트 renderer·726키×10언어/언어 선택·JS 구문·diff 검사도 통과했다. 실제 Android/iOS WebView 검증은 후속이며 APK/AAB/iOS 빌드·설치·배포·운영 브리지/사용자 세션 재시작은 하지 않았다.

## 전체 셀렉터 아웃라인 통일 (2026-10-22, 미배포)

- 사용자가 권한뿐 아니라 모든 셀렉터에 아웃라인을 요청했다. 공유 선택 트리거의 1px 회색 테두리·8px 둥근 모서리를 권한·에이전트·모델·추론 수준에도 적용하도록 테두리 제거 예외를 없앴다. 텍스트 좌우 여백을 6px로 확보하고 기존 선택 시트·열림의 민트색 테두리·2px 키보드 포커스·비활성 상태를 유지한다. 권한 영역은 앞선 너비 축소와 화살표 8px 간격을 유지한다. 최신 요청에 맞춰 `AGENTS.md`와 `docs/interface.md`의 기존 테두리 없는 권한 표시 지침도 갱신했다.
- 검증: 실제 전체 HTML/CSS/선택 UI 소스로 격리 Chromium에서 **21개 전체 셀렉터**의 기본 테두리·열림 강조·비활성 투명도, 키보드 포커스와 320px 모델 행을 확인했다(`.tools/selector-outline-check.cjs`). 앞선 권한 배치 **1,200조합**도 모델 행과 함께 다시 통과했다(`.tools/permission-layout-check.cjs`). 실제 시트에서 권한 변경 및 화살표 간격·44px 권한 높이·겹침/넘침 없음을 확인하고 `dist/screenshots/permission-compact-393-ko.png`를 시각 확인했다. 전체 앱/브리지 회귀나 실기기 WebView 검증으로 확대하지 않는다.
- 소스에 반영했으며 APK/AAB/iOS 빌드·설치·배포·버전 변경·운영 브리지/사용자 세션 재시작은 하지 않았다.

## 권한 선택 화살표 간격 수정 (2026-10-22, 미배포)

- 권한 선택 영역의 `flex-grow`로 화살표가 텍스트에서 멀어지는 피드백을 반영했다. 하단 권한 선택은 선택된 텍스트 너비를 사용하고 공간이 부족할 때만 줄이며, 화살표는 텍스트 바로 옆 8px 간격으로 배치한다. 44px 터치 높이·테두리 없는 표시·긴 권한 이름의 말줄임과 우측 사용량 게이지 배치는 유지한다. 공유 CSS 두 규칙만 변경했다.
- 검증: 실제 HTML의 권한 줄·하단 시트, 공유 CSS·선택 UI·번역 소스를 격리 Chromium에서 사용해 320/393/600px × 10언어 × 10권한 이름 × Fast 표시/숨김 × 게이지 표시/숨김 **1,200조합**을 확인했다. 화살표 간격 8px, 한 줄 높이44px, 겹침/가로 넘침 없음과 짧은 이름의 영역 축소가 통과했다. 실제 하단 시트로 권한을 바꾼 뒤 선택값 갱신도 확인했다. 검사 스크립트 `.tools/permission-layout-check.cjs`, 시각 확인한 화면 `dist/screenshots/permission-compact-393-ko.png`, diff 검사 통과. 전체 앱/브리지 회귀나 실제 Android WebView 검증으로 확대하지 않는다.
- APK/AAB/iOS 빌드·설치·배포·운영 브리지/사용자 세션 재시작은 하지 않았다. 다음 명시적 앱 빌드 요청 때 반영한다.

## 0.26.1 · 원형 사용량 표시 내부 테스트 (2026-10-22)

**0.26.1(45)**을 **17:40 Asia/Seoul**에 내부 테스트에 게시했다. 기존 Chrome의 Play Console에서 **활성 / 내부 테스터에게 제공됨**을 확인하고 새로고침 후 다시 검증했다. 새45 포함·44 제외, EN/KO노트2/2, 오류0·기존 가독화 매핑 파일 경고1·지원 기기 변화0이다. 출시16, 이름 `0.26.1 (45) - Compact usage indicators`다.

접근 권한 줄의 원형 컨텍스트·구독 지표와 입력창 위 상세 팝업을 반영했다. 내장 브리지는 **0.19.0 유지**이며 44의 브리지와 유지보수 payload4개가 바이트 단위로 같다. 이미0.19.0을 사용하는 경우 이번 UI 개선을 위한 브리지 업데이트는 필요하지 않다. 이전 브리지 사용자는 설정에서0.19.0으로 업데이트해야 기존 사용량 수집 기능을 쓸 수 있다.

AAB `dist/play/bibimer-0.26.1-45-release.aab`, SHA-256 `563f8820ad32e7a6e28762fea8bddfa42db299a2cff50d96a232ec9d8d4fe796`. 빌드·bundletool·서명/기존 업로드 인증서·54assets 원본 일치·심사 digest 포함/비밀 원문 미포함·브리지 payload4개 원본 일치를 검증했다. Python scripts **39개**, 컨텍스트/구독 renderer·**726키×10언어**·언어 UI·JS 구문 검사가 통과했다. 전체 격리 Chromium `smoke_ui.cjs`도 통과했으며 두 표시 모드×10언어의320px 화면에서 한 줄 배치·입력창을 가리지 않는 상세·키보드/Back/바깥 터치 닫기·초안 유지·추가 전송 없음과 기존 Chat/PTY 회귀를 확인했다.

증빙 `dist/play-0.26.1/{review,published-before-refresh,published}.json`, 빌드/검증 `.tools/aab-0.26.1-45-{mac.log,verification.json}`, 검사 `.tools/release-0.26.1-{python,ui}.log`, 출시노트 `release/google-play/release-notes/0.26.1.txt`. 실제 Android WebView·Play 업데이트 수신·실기기 설치는 후속이다. 전체 브리지는 이번 UI 배포에서 재실행하지 않았으며 앞선 Mac 실패 기록을 유지한다. 운영 브리지·사용자 세션·iOS 실행 앱·프로덕션·테스터 설정·웹사이트 배포는 변경하지 않았다.

## 접근 권한 줄의 원형 컨텍스트·구독 표시 (2026-10-22, 미배포)

- 하단 공간이 크다는 사용자 피드백으로 컨텍스트/구독의 별도 두 행을 없애고 **접근 권한 설정 줄**에 원형 게이지와 퍼센트를 나란히 넣었다. 문서/시계 아이콘으로 구분하며 기존 **사용량(기본)/남은 양** 설정에 따라 호와 숫자가 함께 바뀐다. 원본 수치·수집·네이티브 저장 설정은 변경하지 않았다. `main`의 공유 UI 변경이며 별도 `feat/termux-x11-browser` 워크트리는 변경하지 않았다.
- 기존 `details/summary`를 재사용해 누르면 입력창 위의 팝업에서 전체 요약·토큰 수·기간별 한도/초기화·마지막 보고 설명을 확인한다. 숫자와 native meter는 화면 읽기용으로 유지하고 가로 막대는 표시하지 않는다. 요약 버튼의 화면 읽기 레이블/툴팁에는 언어별 전체 상태를 유지한다. 상세는 하나씩 열리며 바깥 터치·Escape·Android Back·탭/세션 전환으로 닫힌다. 화면 크기/입력칸 높이가 바뀌면 위치/스크롤 높이를 갱신하고 입력칸과 보내기 버튼을 덮지 않는다.
- 확인 불가·한도 없음은 채워진 원형 없이 `—`, 상태만 있는 주의/도달은 `!`, 초기화 후 갱신 대기는 `↻`로 구분한다. 오래된 값은 흐리게 하고 작은 시계를 붙이며 상세에 마지막 확인 상태를 유지한다. 주의 색은 사용량 기준/네이티브 상태를 따른다. 한도가 없어도 알려진 사용 토큰은 상세에 남기며, 소수 사용률의 남은 양을 반올림할 때 요약과 상세 숫자가 같도록 확인했다. 100% 초과·근사치·실제0과 미제공은 구분한다.
- 검증: 전체 격리 Chromium **`smoke_ui.cjs` 통과**(`.tools/usage-ring-ui-final.log`). 실제 임시 브리지/모의 에이전트로 두 모드×10언어320×460px에서 권한·Fast·두 지표·설정 버튼이 같은 **44px 줄**에 있고 가로 넘침/추가 행/가로 막대가 없음을 확인했다. 상세가 입력부 높이를 늘리거나 입력/보내기를 덮지 않음, 요약 키보드 조작·Android Back/바깥 터치 닫기·초안/세션 유지·추가 모델 입력0, 기존 Chat/PTY·Queue/Steer·승인/질문·가져오기·재접속 회귀가 통과했다. 초회에는 상세가 입력을 가리는 문제를 발견해 입력창 위로 위치를 제한한 뒤 전체 재검사를 통과했다.
- 실제 renderer Node 검사는 원형 수치·두 모드·미제공/상태만/만료/노후/초과/소수 반올림·10언어와 알려진 토큰의 상세 보존을 확인했다. 기존 **726키×10언어**·언어 선택, iOS 설정/터미널 도구, Demo 초안/계약 Node 검사·JS 구문·diff도 통과했다. 이후 소수 반올림·상세 요약 보존·상태 전용 경고색을 보강하고 renderer/카탈로그/구문을 다시 확인했다. 화면 `dist/screenshots/usage-ring-{used,remaining}-320-{ko,en}.png`, `usage-ring-details-320-en.png` 중 한국어 접힌 화면과 영어 상세를 시각 확인했다. 앱 네이티브/브리지 소스·HTTP 경로·외부 의존성은 바꾸지 않아 APK 빌드나 전체 브리지 재검사는 하지 않았다.
- **소스 구현·격리 UI 검증이다. APK/AAB/iOS 앱 빌드·설치·배포·버전 변경·운영 브리지/사용자 세션 재시작은 하지 않았다.** 실제 Android WebView/iOS WKWebView의 터치·키보드·화면 읽기 확인은 후속이며 다음 명시적 앱 빌드 요청 때 반영한다. 현재 공개/내부 배포 범위는 아래 기록을 유지한다. 현재 UI/설계는 `docs/interface.md`, `docs/architecture.md`에 갱신했다.

## Android 0.26.0(44) 내부 테스트 게시 완료 (2026-10-22)

- 사용자 요청대로 먼저 iOS 복사·붙여넣기와 원격의 컨텍스트/구독 기능을 병합하고 `e5b9ad0`까지 `origin/main`에 동기화했다. 새 사용량 기능을 포함하는 Android 버전을 **0.26.0 / versionCode44**, 내장 브리지를 **0.19.0**으로 올렸다. 기존 브리지에서 업데이트를 감지하도록 버전을 구분했으며 사용자 운영 브리지·세션은 교체·재시작하지 않았다. iOS 실행 앱도 변경하지 않았다.
- 기존 저장소 밖 업로드 키·심사 코드 파일을 사용해 `dist/play/bibimer-0.26.0-44-release.aab`를 서명 빌드했다. SHA-256 **`87a289ef05244657077e77a23288c3754ff503538b18636fe71f337745b82a37`**. bundletool·서명/업로드 인증서·54assets 원본·내장 브리지와 유지보수4payload·실제 DEX의contextDisplay저장/네이티브asset문자열·심사digest포함/비밀원문미포함을 검증했다. 새 의존성·키 생성 없음. `.tools/aab-0.26.0-44-{mac.log,verification.json}`.
- Python scripts39개, 컨텍스트/구독 renderer·726키×10언어/언어선택, 격리 Chromium 전체 UI가 통과했다. 실제 임시 브리지/모의 에이전트로 두 사용량 모드·구독 초기화/상태/컨텍스트 분리·추가 모델 턴 없음과 기존 Chat·PTY·승인·대기열·재접속을 확인했다. Mac `/tmp`·`/var` 경로 별칭으로 실패한 최초검사는 `TMPDIR=/private/tmp`로 보정한 재검사와 구분한다. `.tools/release-0.26.0-{python-canonical,ui-canonical,node}.log`.
- 전체 브리지 Mac 재검사는 **191개, failures16/errors1**로 전체 성공이 아니다. 새 컨텍스트/구독16개는 모두 통과했으며 남은 실패는 PTY·프로세스 유지보수·`/proc`/Git 출력 경계 등이다. import경로 오류인 Setup1개는 `PYTHONPATH=scripts:bridge/tests`를 지정한 개별 재검사로 통과했다. 최초 기본경로 실행은 failures33/errors2로 별도 보존했다. `.tools/release-0.26.0-bridge{,-canonical}.log`. 실제 Android 설치·실기기 구독/계정 이벤트·업데이트 수신은 이번에 검증하지 않았다.
- **2026-10-22 09:32 Asia/Seoul**, 기존 로그인된 Chrome에서 사용자 승인에 따라 AppleScript로 동일 AAB를 업로드하고 내부 테스트에 게시했다. Console **활성 / 내부 테스터에게 제공됨**, 새44 포함·43 제외, EN/KO 출시노트2/2, 오류0·기존 가독화 매핑 파일 경고1·지원 기기 변화0을 확인했다. 게시 후 페이지를 새로고침해 활성 상태를 다시 확인했다. 출시 이름은 `0.26.0 (44) - Context and subscription usage`, 내부 출시15다. 증빙 `dist/play-0.26.0/{review,published-before-refresh,published}.json`.
- 새 기능은 앱 업데이트 후 **설정에서 브리지0.19.0 업데이트**가 필요하다. 기존 [내부 테스트 참여 링크](https://play.google.com/apps/internaltest/4701718894791581363)를 유지했다. 실제 기기의 Play 업데이트 수신·설치는 미검증이며 운영 브리지·사용자 세션·iOS 실행 앱·프로덕션·테스터 설정은 변경하지 않았다. 정식0.25.0(43)의 심사 결과는 이번에 재확인하지 않았다.
- 초기 별도 Chrome의 Google 로그인 대기 후, 사용자가 지정한 기존 Chrome으로 전환했다. Computer Use는 `Sky Computer Use native pipe startup failed`가 계속 발생했다. 일반 AppleScript가 창 없는 다른 Chrome 프로세스를 선택하던 문제를 피하도록 실제 사용자 창이 있는 프로세스를 지정했다. 새 Chrome 창/프로필 생성이나 인증 정보 추출 없이 기존 로그인 탭에서 게시했다. UI 자동화·증거 원문은 무시되는 `.tools/`, `dist/`, `.playwright-cli/`에만 보관했다.

## iOS Codex 실제 인증·동작 사용자 확인 (2026-10-21)

- 사용자가 **‘코덱스는 인증해서 동작 성공 확인 했음’**이라고 보고했다. 29dab 엔진을 반영한 Simulator 앱에서 Codex의 실제 인증·동작 성공을 사용자가 직접 확인한 결과로 기록한다. 모델명·작업 내용·원본 로그는 수집하지 않았으며 아래 합성 API 자동 검사와 증거 종류를 구분한다. Claude·OpenCode·Gemini의 실제 계정 인증·모델 응답까지 성공한 것으로 확대하지 않는다.
- 터미널 출력 선택 불가 피드백을 반영해 iOS 전용 **텍스트 선택 → 선택 부분/전체 복사** 창과 **붙여넣기** 버튼을 구현했다. xterm 공개 buffer/cell API와 기존 dialog·복사 경로를 재사용하며 새 의존성·Android 변경은 없다. 긴 URL의 soft-wrap·CJK null padding·emoji·명시 공백/빈 줄을 보존한다. 닫으면 출력 사본을 비우고 별도 파일에 저장하지 않는다.
- 붙여넣기는 버튼을 누를 때만 native clipboard RPC로 읽어 입력창의 선택 범위를 치환하며 자동 전송하지 않는다. CRLF/CR→LF, UTF-8 16KiB 제한, 세션·프로젝트·브리지/generation·초안·커서 변경 시 지연 응답 거절을 검증했다. 문서별 nonce와 현재 WKWebView 검사로 오래된 응답을 차단한다. 자동 검사는 private fake clipboard만 사용한다.
- 실제 vendored xterm·native RPC host 회귀와 패키징 Chromium의320/393px×10언어20조합·touch 부분 복사·실제 textarea/caret·경합 검사가 통과했다. Simulator/unsigned iPhoneOS 빌드 및 manifest·29dab 엔진 일치·Clang analyzer 진단0도 확인했다. `.tools/ios-terminal-tools/final-package-verification.json`, `ios/app/VALIDATION.md`에 기록했다. 시각 검토는 버튼 줄바꿈/44px 영역 수정 뒤95/pass다.
- 사용자가 **‘수정본 설치 후 재실행’**을 승인해 현재4개 실행 프로세스를 종료하고 같은 Simulator 앱에 수정본을 설치했다. 재설정·앱 삭제·CLI 재설치는 하지 않았다. 새 필수 검사 `terminal_text_copy_and_draft_paste`를 포함한 **실제 WKWebView UI21 통과(14.01초), JS 오류0**를 확인했다. 기존 syscall151/152 경고4개는 보존했으며 fatal/진단 실패0이다. `dist/ios-app/smoke/`에29dab manifest와 결과를 기록하고 이전 증거는 history에 보존했다. 복사·붙여넣기 검사는 native private fake clipboard를 사용했으며 실제 사용자 clipboard·인증 파일 내용·대화·PTY 원문은 조회하지 않았다.
- 검사 후 출력 수집·self-test 인자 없이 **일반 모드 PID19249로 재실행**했다. 실제 화면에서 Connected와 Select text/Paste 버튼을 확인했고 설치 바이너리·터미널 자산이 검사한 패키지와 일치했다. `.tools/ios-terminal-tools/{applied-verification.json,normal-screen.png}`. 승인된 재시작으로 이전 프로세스는 복원되지 않으며 현재 테스트 세션의 Session lost 표시는 정상이다. 사용자는 Start session으로 새 터미널을 열어 복사·붙여넣기를 시험할 수 있다. CUA의 `Sky Computer Use native pipe startup failed`로 실제 길게 누르기 선택 핸들·iOS 붙여넣기 허용창을 직접 조작한 검증은 남아 있다.

## OpenCode·Gemini 구독 사용 한도 조사 (2026-10-21, 연동 미구현)

- 사용자 요청으로 공식 문서와 OpenCode1.19.3·Gemini CLI0.64.0 소스를 조사했다. 상세 API/로그인 범위/주의점/공식 근거는 `docs/architecture.md`의 **OpenCode·Gemini 계정 한도 조사**에 기록했다. 이전 Codex·Claude 구독 기능의 미커밋 변경은 유지했다.
- **OpenCode Go/Go Plus:** Go 사용량 API가 있으며 구형 공식 구현은 `usage.rolling/weekly/monthly.{percent,resetsAt,status}`를 반환한다. 현재 문서는 모델별5시간·주간·월간 한도다. 기존 `/zen/go/v1/usage`와 새 `/inference/go/v1/usage` 모두 자격증명 없는 GET에서401/JSON을 확인했지만 로그인 후 최신 응답 스키마/모델별 범위는 미검증이다. 로컬 OpenCode 서버에는 확인한 버전 기준 범용 quota API가 없어 활성 Go 제공자의 실제 인증과 일치하는 별도 조회가 필요하다. 다른 제공자는 각각의 계정 연동이 필요하며 세션 토큰/비용으로 대체하지 않는다.
- **Gemini:** Google 로그인 경로의 `retrieveUserQuota`에서 모델별 `remainingFraction`, 선택적 `remainingAmount`, `resetTime`을 받을 수 있다. CLI의 `/stats model`이 사용하는 조회다. 다만 Google 내부 API이며 Gemini0.64.0 ACP에는 이 조회 RPC/계정 이벤트도 `/stats` 명령 등록도 없다. **ACP로 `/stats model`을 자동 전송하지 않는다.** `usage_update`는 컨텍스트, `_meta.quota.token_count/model_usage`는 턴 토큰이라 구독 잔여량이 아니다. 같은 네이티브 인증/프로젝트 문맥에서 quota만 구조화 전달하는 별도 확장이 필요하다. API 키/Vertex 로그인·Gemini 앱 전체 한도로 일반화하지 않는다.
- 실제 Termux OpenCode는1.17.13, Gemini 실행은 `No such file or directory`로 실패했다. 실제 계정/토큰을 읽거나 인증된 요청을 보내지 않았고 모델 턴0개다. 공식 공개 소스/트리는 무시되는 `.tools/quota-research/`에만 받았다. **이번 후속 작업은 조사·문서화만 수행했으며 OpenCode/Gemini 구독 UI 연동·APK 빌드·설치·배포·운영 브리지 변경은 하지 않았다.** 문서 `git diff --check`를 확인했으며 제품 테스트는 재실행하지 않았다.

## 구독 사용 한도·초기화 시각 표시 (2026-10-21, 미배포)

- 사용자 요청으로 Chat 입력창 근처에 컨텍스트와 별도의 **구독 한도** 행을 구현했다. 접힌 상태는 `5시간 · 35% 사용 · +1`, 펼치면 5시간/주간 등 각 기간의 사용률·초기화까지 남은 시간·보고 시각을 보여준다. 네이티브 도달/주의 상태와 높은 사용률의 기간을 우선한다. 기존 선택 설정 이름을 **설정 → 사용량 표시**로 바꿨으며 **사용량(기본) / 남은 양**을 두 지표에 함께 적용한다. 컨텍스트/구독 상세는 하나씩 열고 작은 화면의 구독 상세는 스크롤한다.
- **Codex:** 같은 실행의 app-server에서 thread 초기화 뒤 읽기 전용 `account/rateLimits/read`, 선택한 세션의 events 폴링 중 최소60초 간격 재조회 및 `account/rateLimits/updated`를 받는다. 대기10초·미지원/오류/잘못된 응답은 수치 없음/마지막 값으로 처리하고 Chat/승인/대기열을 실패시키지 않는다. 다중 bucket과 구형 단일 뷰를 중복 없이 처리하며 primary를 항상5시간으로 고정하지 않는다. 희소/null 보고는0으로 덮지 않고, 새 기간의 비율이 없으면 지난 비율/도달 상태를 지운다. 더 최신 push 뒤 도착한 read와 계정 변경 전 대기 응답은 무시한다. `account/updated`는 값을 지우고 새 계정에서 조회한다.
- 설치된 **실제 Codex CLI**에서도 별도 임시 app-server를 초기화하고 계정 한도 읽기에 성공했다. 사용률/초기화 시각이 있는1개 기간 및 다중 bucket 응답 형태를 확인했고 **thread/모델 턴0개**다. `.tools/subscription-native-codex.log`에는 성공/필드 존재 여부/개수만 기록하며 실제 사용률·계정 정보·응답 원문은 저장하지 않았다. 임시 probe만 정리하고 사용자 세션/운영 브리지는 변경하지 않았다.
- **Claude:** 사용자가 명시적으로 시작한 SDK 실행의 주 `rate_limit_event`에서 선택적 `unifiedWindows`와 구형 최상위 utilization을 수집한다. 이 이벤트의0.35는35%, 1은100%지만 구조화된 `/usage` 보고의1은1%이므로 단위를 분리했다. 상태/초기화 시각만 온 경우 퍼센트를 추정하지 않는다. 하위 에이전트·이전 활성 turn을 제외하고 새 query/auth_status에서는 이전 계정의 값을 지운다. 수집을 위해 모델이나 `/usage`를 자동 실행하지 않으며 실험적 SDK 조회 API도 쓰지 않는다. 실제 값이 오는 CLI/SDK/로그인만 표시하며 **Claude 실제 계정 모델 이벤트 검증은 남아 있다.** OpenCode/Gemini의 별도 계정 한도 연동은 미구현으로 확인 불가다.
- 수치는 해당 네이티브 실행에 로그인한 계정의 기간별 한도이며 세션 토큰 합계가 아니다. `subscription_usage`에 최대16개 기간의 허용된 숫자/상태/기간/이름/시각만 메모리로 전달하고 메타데이터에 저장하지 않는다. 계정/세션별 전역 캐시를 합치지 않는다. 수치 없음은 확인 불가, 한도 근접/도달만 보고되면 상태만, 초기화 시각이 지났으면 갱신 대기다. 오프라인/종료/조회 실패 또는 해당 기간의 마지막 숫자가5분 지난 경우 마지막 확인으로 표시하고 현재0%로 바꾸지 않는다. 다른 기간만 갱신됐다고 오래된 기간을 새 값으로 표시하지 않는다. 인증 정보·비용·크레딧·원본 보고·계정명/이메일을 UI/일반 로그/메타데이터에 전달하지 않으며 크레딧 리셋 소비/구매/이메일 전송도 하지 않는다.
- 검증: 전체 브리지 **189개 통과**(`.tools/subscription-all-bridge.log`). 이후 보강한 구형 Claude/계정 전환·다중 bucket 사례까지 **구독 전용9개 재검사 통과**(`.tools/subscription-bridge-final.log`). 선택한 세션의 조회·단위·상태만/실제0·희소값·새 기간 무효화·주기/시간 초과/실패·늦은 read/push·auth 변경·스냅샷 복사·세션 격리·재시작 비복원·추가 모델 턴 없음을 확인했다. Claude/구독 집중22개도 통과(`.tools/subscription-providers-final.log`). 추가 기간 검사에서 ‘새 기간의 비율 없음’을 기존 값이 덮던 문제를 발견해 비율/도달 상태를 무효화한 unknown 행을 유지하도록 수정하고9개를 다시 통과했다.
- 전체 격리 Chromium **`smoke_ui.cjs` 통과**(`.tools/subscription-ui-final.log`). 실제 임시 브리지/모의 Codex·Claude로 구독/컨텍스트 분리·두 기간·초기화 시간·사용량35/남은65·추가 전송 없음·초안/세션 ID 유지, 두 모드×10언어320px·보내기 버튼·기존 Queue/Steer/승인/질문/가져오기/PTY/재접속을 검증했다. 화면 `dist/screenshots/subscription-{used,remaining}-320-{en,ko}.png` 중 한국어 사용량 화면을 시각 확인했다. 실제 renderer Node 검사는 상태만/0/초과·만료·오프라인/종료/오류·기간별 노후 값과 위험 색·10언어를 확인했다. 신규19키와 공통 설정 문구 수정으로 **726키×10언어**, 언어/Demo/초안·JS/Python 구문·diff 통과. Python scripts **39개 통과**(`.tools/subscription-scripts.log`).
- 공유 UI/브리지의 iOS 회귀는 기존 **검사 전용 임시 shebang 보정**으로 Gemini/계정 경계/Codex 정책11개(`.tools/subscription-ios.log`), 앱 패키징/증거6개(`.tools/subscription-ios-app.log`), 권한/사용량 선택/터미널 링크 Node 검사를 통과했다. 기본 iOS 전체의 Termux 환경 제약은 앞선 기록과 같고 전체가 성공했다고 표현하지 않는다. 새 Android 자산 파일/네이티브 HTTP 경로·외부 의존성은 없다. 설계/공식 근거를 `docs/architecture.md`, 현재 UX를 `docs/interface.md`, 작업 규약을 `AGENTS.md`에 갱신했다.
- **소스 구현·검증이며 APK/AAB/iOS 앱 빌드·설치·배포·버전 변경·운영 브리지 교체/재시작은 하지 않았다.** 새 앱과 새 브리지/어댑터 적용이 필요하다. 실제 Android/iOS UI·Claude의 실제 계정 이벤트·다양한 구독/로그인·다른 기기 사용 후 재조회·백그라운드와 절전은 후속 검증이다. 계정 한도를 읽는 Codex probe 외의 모든 실행 검사는 임시 프로젝트/포트와 모의 에이전트로 수행했다.

## 컨텍스트 사용량/남은 양 표시 선택 (2026-10-21, 미배포)

- 후속 사용자 요청에 따라 **설정 → 컨텍스트 표시 → 사용량 / 남은 양**에서 선택한 기준 하나만 표시하도록 바꿨다. **기본은 사용량**이며 기존 설치/저장 선택이 없는 경우도 같다. 사용량 선택 시 `38% 사용`·차오르는 막대·`76,000 / 200,000 토큰 사용`, 남은 양 선택 시 `62% 남음`·줄어드는 막대·`124,000 / 200,000 토큰 남음`을 표시한다. 아래 초기 구현의 두 비율 동시 표시는 이 선택형 UI로 대체됐다.
- Android `InputPreferences`/네이티브 WebView 인터페이스와 iOS JavaScript/NSUserDefaults에 `contextDisplay: used | remaining`을 추가했다. 선택은 앱 공통으로 저장하고 재실행 뒤 복원한다. 설정 목록은 기존 자체 하단 시트·현재 선택/설명을 사용한다. Android 저장 실패 시 이전 선택/표시를 유지하며 허용하지 않는 값은 거절한다. 설정 변경은 실행/전송/중단/승인 없이 즉시 표시만 바꾸며 프로젝트·세션·작성 초안·대기열을 유지한다. 기존 Enter 설정과 예제 모드의 저장 공간 분리를 유지했다.
- 한도를 모르는 경우 사용량은 알려진 토큰 수만, 남은 양은 **확인 불가**로 표시하며 남은 양을 추정하지 않는다. 남은 양은 비율/토큰 0을 하한으로 하고 근사치 `≈`는 표시 가능한 수치에만 붙인다. 사용량 선택에서는 100% 초과 실제 비율을 보존한다. 막대의 주의 색은 두 모드 모두 **사용률 75%/90%**를 기준으로 하므로 표시 전환으로 위험 수준이 바뀌지 않는다. 브리지/에이전트 수집 로직은 이번 후속 변경에서 바꾸지 않았다.
- 검증: Python scripts **39개 통과**, 새 실제 Java `InputPreferences` 하네스로 기본·두 선택 저장/재생성·실패·잘못된 값·Enter 선택 유지·예제 저장 공간 분리를 확인했다(`.tools/context-display-scripts.log`). 실제 컨텍스트 renderer의 Node 검사는 두 모드·막대 반전·100%/0/초과·한도 없음·근사치·언어 전환을 확인했다. 번역은 기존 동시 표시2키를 선택형4키로 교체하고 설정6키를 더해 **707키×10언어**이며 전체 i18n/언어 검사와 Demo/초안·JS 구문·diff 검사가 통과했다.
- 전체 `smoke_ui.cjs`가 통과했다(`.tools/context-display-ui.log`). 연결 전 기본 사용량·두 선택의 저장/reload, 실제 임시 브리지의 활성 세션에서 저장 실패 롤백·사용량/남은 양 전환·막대38/62·선택한 토큰 상세·입력 초안/세션 ID/전송 횟수 유지, 두 모드의10언어320px 및 기존 Chat/PTY·Queue/Steer·승인/질문·가져오기·재접속 회귀를 확인했다. 화면 `dist/screenshots/context-remaining-320-{en,ko}.png`, `context-display-settings-320-en.png`; 한국어 남은 양 화면을 시각 확인했다. iOS 실제 `native.js`의 저장 메시지/허용 값 검사, 기존 권한/터미널 링크 Node 및 패키징/증거 단위6개도 통과했다.
- **소스 구현·검증이며 APK/AAB/iOS 앱 빌드·설치·배포·운영 브리지 적용은 하지 않았다.** 실제 Android/iOS 설정 저장·실기기 UI와 iOS 네이티브 컴파일은 후속이다. 앞선 컨텍스트 수집 기능의 실제 CLI/실기기 검증 제약은 아래 기록을 유지한다.

## 세션별 컨텍스트 사용량·남은 양 표시 (2026-10-21, 미배포)

- 사용자 요청으로 Chat 입력창 아래에 **컨텍스트 · 38% 사용 · 62% 남음**과 작은 막대를 추가했다. 행을 펼치면 **76,000 / 200,000 토큰 · 124,000 남음**과 보고 기준을 표시한다. 75%/90%에서 막대 색이 바뀌며 비율은 텍스트로도 읽을 수 있다. Claude 등의 근사치는 `≈`, 한도 미제공은 사용 토큰만, 수치 미제공은 **확인 불가**로 구분한다. 100% 초과 수치를 숨기지 않고 막대/남은 양만 100%/0에서 제한한다. 기본은 접힌 상태이고 입력·언어·세션 전환으로 자동 전송하지 않는다.
- Codex는 네이티브 `thread/tokenUsage/updated`의 `last.totalTokens`/`modelContextWindow`, Claude는 최신 주 실행 assistant 요청의 input/cache read/cache creation/output과 일치 모델의 한도만 사용한다. Claude의 누적 result/modelUsage 토큰·하위 에이전트 사용량은 점유율에 더하지 않고 placeholder 출력 가능성 때문에 근사치로 표시한다. CLI가 보내는 구조화된 `/context` 결과도 받되 명령을 자동 실행하지 않는다. OpenCode는 최신 유효 assistant의 input/output/reasoning/cache read/write와 해당 provider/model의 로컬 한도를 사용하며 진행 중 0 placeholder는 직전 보고를 지우지 않는다. 한도 조회 실패로 대화를 실패시키지 않는다.
- 공유 UI를 쓰는 iOS에도 표시가 적용되며 Gemini 어댑터는 ACP `usage_update.used/size`를 전달한다. 활성 turn이 끝난 뒤의 같은 세션 보고도 받을 수 있다. Gemini CLI가 이벤트를 보내지 않으면 확인 불가를 유지하며 `_meta.quota`·모델 이름·터미널 출력·대화 글자 수로 채우지 않는다. **실제 Gemini CLI의 이벤트 발행 확인은 남아 있다.** 에이전트별 상세 근거/공식 문서와 계약은 `docs/architecture.md`, 표시 규칙은 `docs/interface.md`, 작업 규약은 `AGENTS.md`에 기록했다.
- Chat snapshot/events의 메모리 전용 `context_usage`에 사용량/한도/근사 여부/보고 시각을 전달한다. 정확한 native thread ID를 확인하고 다른 활성 turn의 늦은 보고·잘못된 숫자를 무시한다. 컨텍스트 압축/reset은 이전 값을 무효화하고 수치 감소도 반영한다. 세션 전환·재접속은 각각의 값을 쓰며 오프라인/종료 시 마지막 보고임을 설명한다. 브리지 메타데이터에는 수치를 저장하지 않아 재시작 후 현재 값으로 복원하지 않는다. PTY에는 표시하지 않으며 계정 사용 한도와 구분한다.
- 검증: 브리지 전체 회귀 **181개 통과**(`.tools/context-all-bridge-final.log`). 이후 보강한 부분 보고/0/명시적 reset 케이스까지 컨텍스트 전용 **7개 재검사 통과**(`.tools/context-bridge-final.log`): 세 에이전트의 최신 값/누적값 구분·캐시/추론·하위 실행 제외·압축/수치 감소·없는 한도/보고·잘못된 thread/turn/수치·snapshot 복사·세션 격리·재시작 비복원을 확인했다. 초기 전체 검사에서 기존 `'text'` 문자열 비포함 검사가 새 `context_usage` 키에도 반응했다. JSON의 `"text"` 키와 실제 대기 본문 누출을 검사하도록 정확히 고쳐 대기열13개 및 전체 회귀를 다시 통과했다. 대기열 본문 저장 정책은 변경하지 않았다.
- 격리 Chromium의 실제 임시 브리지/세 에이전트 fixture를 사용하는 **전체 `smoke_ui.cjs` 통과**(`.tools/context-ui.log`). 새 표시·토큰 상세·재접속·10언어320px 가로 넘침 없음/보내기 버튼/작성 초안 보존, 기존 Queue/Steer·승인/질문·가져오기·다중 프로젝트·PTY·Enter/IME를 확인했다. 화면 `dist/screenshots/context-320-{en,ko}.png` 중 한국어를 시각 확인했다. Node `test_context_usage.cjs`는 모르는 값/부분 값/0/100% 초과·근사치·오프라인/종료·PTY·언어 전환을 확인했다. 신규10키로 **699키×10언어** 및 언어/초안·JS/Python 구문·diff 검사 통과. Python scripts **38개 통과**(`.tools/context-scripts.log`). 새 자산 파일이나 네이티브 HTTP 경로는 추가하지 않았다.
- iOS는 새 ACP 경계 검사와 기존 Gemini 전체/구조화 Chat·모델 목록/Codex 정책을 **11개 통과**했다(`.tools/context-ios-portable-final.log`). Termux에 `/usr/bin/env`가 없어 **검사 전용 임시 복사본의 두 fixture shebang만 현재 Python 경로로 바꿨으며 제품 소스/실제 CLI는 변경하지 않았다.** 앱 패키징/증거 단위6개, 권한/설정·터미널 링크 Node 검사도 통과했다(`.tools/context-ios-app.log`). 기본 iOS 전체 검사는 현재 Termux에서45개 중 실패6·오류9·skip1로 모두 성공하지 않았다. 변경 전 HEAD를 별도 추출한44개에서도 같은 실패6·오류9·skip1 및 동일한15개 실패 항목을 확인했다(`.tools/context-ios-{baseline,full-final}.log`). 기존 fixture 실행기/설치 스크립트 경로 및 OpenCode 파일 변경 감지 검사 등이며 이번 추가 경계 검사는 성공했다. 이를 실제 iOS 실행 검증으로 간주하지 않는다.
- **소스 구현·검증이며 APK/AAB/iOS 앱 빌드·설치·배포·버전 변경·운영 브리지 업데이트/재시작은 하지 않았다.** 새 앱과 이 브리지/어댑터의 적용이 필요하다. 실기기 Android WebView/iOS, 실제 계정 모델 응답의 보고 주기·압축 전후 및 최신 CLI별 이벤트는 후속 검증이다. 모든 실행 검사는 임시 폴더/브리지/세션과 모의 에이전트만 사용했다.

## iOS 입력창 확대·Codex HTTPS 전송 수정 (2026-10-21)

- 사용자가 입력창을 선택하면 화면이 확대되는 현상을 보고했다. 공유 UI의 기본 입력 글꼴14px, 대화 전달 본문12px를 확인하고 `ios/app/build.py`의 iOS 전용 스타일에서 텍스트 입력·textarea를16px로 지정했다. Android 원본·체크박스·라디오 및 viewport의 사용자 확대 설정은 유지한다.
- 패키징한 실제 UI를 Chromium320/393/852px에서 검사해14개 입력 필드 모두 계산 글꼴16px를 확인했다. `.tools/ios-input-focus/computed-style-verification.json`. 기존 앱 Python6검사·터미널링크5경우·권한/설정회귀도 성공했다.
- Codex 기기 코드 로그인의 `auth.openai.com/api/accounts/deviceauth/usercode` 요청 전송 실패를 독립 lab에서 재현했다. CA121개·DNS·시각·Python/curl TLS는 정상이나 원본 Codex의 기본 TLS는 send 실패, 명시적 CA의 rustls는 P521 서명 알고리즘 검사에서 panic이었다. ARM64 halfword lane 인덱스 해석 오류로 알고리즘 값이 유실되는 원인을 확인해 `gen.c` 두 곳의 `size & 1`을 공식 명세의 `size >> 1`로 고쳤다. 원본 Codex·인증서 검증·제품 CA/DNS/래퍼는 변경하지 않았다.
- 신규 승인 엔진 patch **`29dabdb385b105b31c58b5d2d1d5958a216028d2113448eaa8b185233b09c0c8`**. 실제1440개 ARM lane 회귀는 수정 전192개 실패/P521 누락→수정 후 전부 성공/P521 보존(1.816초)했다. 같은 원본 Codex HTTPS는 기본·명시CA·IPv4고정·CA디렉터리·native진단 다섯 조건 모두 정상 TLS와 예상 HTTP 오류 응답까지 도달했다(최종14.802초, errno65 경고16개 보존). 실제 인증 코드를 발급받는 대신 고정 공개 시험 issuer를 사용하고 본문·토큰·코드를 기록하지 않았다. **이 자동 검사에서는 실제 계정 로그인 완료·모델 응답을 검증하지 않았다. 이후 사용자 확인은 위 항목에 기록했다.** `ios/runtime-lab/VALIDATION.md`와 `dist/ios-runtime-lab/{arm64-simd-lanes,auth-network}/` 참고.
- 새 엔진의 후속 실제 회귀도 모두 통과했다. ARMFP1920명령1.198초, Codex 도구6.223초, ClaudeSDK51.731초, GeminiACP64.444초, OpenCode 검색·승인3·Bash 읽기/쓰기·출력·완료254.751초. 네 CLI는 합성 모델 API를 사용했고 각각 복구 연결 경고2/25/18/13개를 보존했다. 런타임 host32검사도 통과했다. 아래2026-10-20의 ff19 기록과 구분한다.
- 새 엔진과 입력창 수정을 포함한 Simulator/unsigned iPhoneOS 양 SDK 앱 빌드 및 manifest·고정 patcher/notice·공유52자산 보존 검사가 성공했다. `.tools/ios-input-focus/build-{iphonesimulator,iphoneos}-29dabdb3.log`, `package-verification-29dabdb3.json`. 사용자가 **‘수정 준비가 끝나면 재실행’**을 명시 승인한 뒤 수정본을 설치해 **실제 UI20 성공13.89초·JS 오류0·미지원 syscall 경고4개**를 확인했다. `dist/ios-app/smoke/`의 시작 전 수집 manifest도29dab이며 이전 증거는 history에 보존했다.
- 최종 검사가 끝난 뒤 self-test 인자·터미널 출력 수집 없이 일반 모드로 재실행했다(PID48701). 실제 화면에서 Connected 상태를 확인했다(`.tools/ios-input-focus/normal-screen.png`). 승인된 앱 재시작으로 기존 프로세스는 종료되며 UI의 Session lost를 실행 복원으로 가장하지 않는다. **Setup→Codex→Sign in에서 새 인증을 시작**하면 된다. 파일·저장 목록·인증 파일을 삭제하거나 실제 모델 요청을 수행하지 않았다.
- CUA가 `Sky Computer Use native pipe startup failed`로 연결되지 않아 실제 iOS 포커스 전후 확대율·키보드 화면 검사는 남아 있다. 현재 Xcode27의 시뮬레이터 창은 `Contents/Applications/DeviceHub.app`이며 예전 `Simulator.app` 경로를 찾지 않는다. 내장 배포판은 Alpine이며 패키지 설치는 `apk add --no-cache curl jq ripgrep` 등으로 수행한다.

## 웹사이트 문의 제목 입력 제거 (2026-10-21)

- 사용자 피드백에 따라10언어 문의 양식의 별도 제목 필드·필수 검사·번역20항목을 삭제했다. 카테고리/기타 직접입력·본문·선택 이메일·동의만 받는다. 공통 생성기/클라이언트와10개 정책의 수집항목도 갱신했다.
- API는 제목 생략/빈 문자열을 허용하고 기존 DB subject 칸에는 본문 앞부분(공백 정리·최대120UTF-16단위·불완전 surrogate제거)을 자동 기록한다. 이전 캐시 양식의 명시적 subject도 받아 기존 내용 해시/재시도와 호환한다. DB마이그레이션·기존 문의 변경·새 의존성은 없다. Discord의 중복 Subject필드도 제거했다.
- 회귀 검사에서 수정 전 제목 없는 접수가400으로 실패함을 확인한 뒤, 제목 생략/공백/이전클라이언트·동일UUID재시도·DB/Discord검사 전체와 실제 Chromium 양식 검사(10언어320px·제목없음·본문수정UUID·실패/15초중단재시도·중복방지)를 통과했다. 웹사이트2검사·언어/JS구문·diff도 통과. 로그 `.tools/contact-no-subject-{before,api,ui}.log`.
- Cloudflare Pages **https://b3458e5b.bibimer.pages.dev**, 공개 **https://bibimer.app/ko/contact/** 배포.44공개리소스 원본/보안헤더·API거절/404를 확인하고, 제목 없는 실제 검증용 문의를202접수·DB자동미리보기·Discord sent1회·중복POST202/한행유지로 확인했다. `dist/website-contact-no-subject/live-verification.json`. 이전 문의·DB·서버비밀은 유지한다.
- 기존 가이드/문의 화면을 기준으로 제목 삭제 후 모바일 화면을 시각 확인했다(96/pass). `dist/website-contact/{ko-320.png,ko-desktop.png}`와 `.omx/state/website-contact-no-subject/ralph-progress.json`. 이번 CUA는 브라우저/네이티브연결이 없어 공개브라우저수동화면 대신 격리Chromium과공개HTTP원본대조로 검증했다. 실제 고객 문의는 사용하지 않았으며 Discord의 기존 네트워크 유실/상태불명 전달 제약은 유지한다. 앱 빌드·설치/Play변경 없음.

## iOS 앱 구현과 네 에이전트 검증 (2026-10-20, Simulator 검증 완료)

- 사용자 요청은 **Bibimer iOS 앱 구현·Simulator 실행**, **Codex·Claude Code·OpenCode·Gemini 모두 포함**이다. `ios/app/`에 기존 UI를 재사용한 WKWebView 앱, `ios/bridge/`에 앱 내부 Linux 연결·설치/로그인 작업·Gemini ACP, `ios/runtime-lab/`에 실행 환경과 검사를 구현했다. Android 소스·APK·운영 Termux는 변경하지 않았다.
- 전용 iPhone17Pro/iOS26.5 ARM64 Simulator의 실제 UI→native 인증 HTTP→내장 Linux 경로에서 **최종 UI20 성공12.82초**, **네 CLI 설치/독립 버전/health Setup10 성공234.52초**, **양쪽 JS 오류0개**를 확인했다. 설치 후 agent catalog가 바로 갱신되는 수정과 최신 OpenCode 호환 패처를 포함한다. 결과는 경고를 보존한 `PASS_WITH_WARNINGS`다(UI의 미지원 syscall4건, Setup의 복구 연결 errno65 60건). 최종 증거는 `dist/ios-app/{smoke,agents}-ff19-compat868ccf40/`, 이전 증거는 `*-ff19-precompat/`에 구분해 보존했다. 마지막 실제 Bash 세션 화면을 유지했다.
- 원본 CLI와 같은 게스트의 합성 HTTP 모델로 실제 도구 왕복을 검증했다. **Codex0.163.0** app-server·셸 읽기/쓰기·완료/종료0 성공6.01초. **Claude Node CLI2.1.112/SDK0.2.112** 원본 provider·일회 승인·읽기/쓰기·chunked SSE·완료/종료0 성공49.43초. **Gemini0.64.0 ACP** 승인/거절·파일 생성/미생성·native 완료/종료0 성공63.99초. 각각 connect errno65 경고를 보존했다.
- **OpenCode1.19.3 + iOS ShellTool 출력 수집 호환 패치**도 검색(glob/grep)·명시 승인3회·실제 Bash 읽기/쓰기와 출력·native 완료·종료0 성공259.12초(원본 provider218.16초)다. 별도 **exit7/stdout·stderr, 큰 출력131076바이트 전체 파일, timeout, 사용자 abort 네 경우도 성공261.85초**했다. timeout/abort 뒤 소유 PID 종료와 후속 명령 미실행을 확인했다. 증거 `dist/ios-runtime-lab/{opencode-compat-search,opencode-shell-edges}/`.
- OpenCode 원본은 출력 수집 fiber를 읽기 전에 scope가 끝나 `(no output)`이 됐다. trace에서 Bash31바이트가 버퍼에 남고 consumer 반환은0임을 확인했다. 실제 v1 경로는 `packages/opencode/src/tool/shell.ts`이며, 출력 fiber 즉시 시작·정상 exit contender 안에서 join·`raceAllFirst`로 완료 순서와 오류 전파를 수정했다. timeout/abort는 같은 race 안에 유지한다. 원본 ELF SHA `37c7de554c2ba7bf456e4fe6faf7705141b0ccb3a7b1dd6e1046d52cd8269ecd`, 검증한 패치 SHA `04023b8024bdab3cde5c84ca509c7a9ec9492b7a308175740449fd62e6e438d6`. `opencode_compat.py`가 전체 SHA/크기/유일한2310바이트 영역을 검증해 같은 길이로만 바꾸며 임의 버전은 거절한다. 원본·영역 밖 바이트는 유지한다.
- 제품 설치는 npm 원본→별도 임시 패치 복사본→실제 --version 성공→stable `opencode-ios`→공개 wrapper 순서다. 패치/버전 실패 시 기존 실행 파일·wrapper를 유지한다. 실제 앱 설치 뒤 원본 SHA·게시 패치 SHA·양쪽195014520바이트·wrapper의 게시본 실행·남은 staging0개를 읽기 검증했다(`dist/ios-app/agents/opencode-install-verification.json`). 원본 보존에195MB, 업데이트 중 임시에 추가195MB가 필요하다. **제품은 stdio preload/trace를 사용하지 않으며 CJS 자산0개**다. 실패한1.2.27/1.3.13/1.17.0 및 preload 실험은 검증 자료일 뿐 제품 pin이 아니다. MIT notice를 앱에 포함했다.
- 실행 엔진은 ios-linuxkit `c8e9dcb954963b0d9f359b3ad9da871f19b28652`, 승인 patch **`ff19b3b11d76dfe4c9893b2b4b8d9ee99d6e6f68a6f2ca762aab0006836f3518`**다. PTY echo/poll, 부모 사망 신호·pending/fork 초기화, epoll 복제FD/ONESHOT, compute 중단, ARM64 FP, Darwin rwlock 느린 경로 SIGUSR1, SA_ONSTACK를 수정하고 전용 실제 guest 회귀를 통과했다. FP1920명령, signal-stack6경우, memory/COW8경우, Bun subprocess12경우 등을 포함한다. host 실행 코드 JIT는 켜지 않았다.
- 기본 Bash·Git·Python·Node/npm·CA·ripgrep을 앱 안에 준비한다. Gemini는 Ignition+실제 guest Liftoff WASM 프로필이다. 다른 jitless Node의 llhttp ABI 파서는 분할 HTTP/chunked SSE를 처리하며 임의 WASM을 흉내 내지 않는다. Codex namespace 격리는 미지원이며 사용자가 Chat에서 명시적으로 선택한 app-sandbox만 externalSandbox 턴 정책에 연결한다. Claude Steer·Gemini history/Steer 등 미검증 기능은 비활성화한다.
- 최신 제품은 Simulator/unsigned iPhoneOS ARM64 양 SDK 빌드 성공, 자체 native Clang 분석4파일 무진단, runtime host31/bridge host44/app host6/경계 fixture host5 검사 성공이다. installer `1d3d755e…`/patcher `868ccf40…`, notice·manifest 일치와 공유 Android 자산52개 원본 보존을 확인했다. 실제 두 최종 검사에 설치된 앱 바이너리 SHA는 `1cb3c9394b4c4c2b9c0b7b3b464e617627d8eb16ad39c7a8a6f505b982e93c3b`로 같다. 상세 `dist/ios-app/final-package-verification.json`. 사용자 요청으로 iOS 소스·검사·문서를 브리지·CLI 회귀 검사·런타임·앱·검증 문서의 다섯 커밋으로 정리해 레포 동기화에 포함했다. `.tools/`·`dist/`·게스트 파일시스템·인증 데이터는 커밋에서 제외했다.
- **실제 계정 인증·실제 모델 호출·과금·실제 iPhone·백그라운드/잠금/메모리 압박·App Store 배포는 미검증**이다. 실제 Mac 인증 파일과 사용자 프로젝트는 사용하지 않았다. 설치/버전·합성 모델 도구 실행을 실제 로그인 성공과 구분한다. 상세는 `ios/app/VALIDATION.md`, `ios/runtime-lab/VALIDATION.md`, `ios/bridge/README.md`를 따른다. 구현과 요청된 Simulator 검증은 완료했으며, 실기기·실제 계정 검증은 별도 단계다.

## iOS 내장 Linux 실행 환경 실험 (2026-10-20)

- 사용자 요청으로 `ios/runtime-lab/`에 독립 UIKit 실험 앱·빌더·게스트 검사·증거 판정기를 구현했다. 별도 터미널 앱/원격 호스트 없이 앱 내 ARM64 Linux 해석기에서 CLI를 실행한다. **완성된 Bibimer iOS 제품은 아니며 Android 코드·Termux 세션·배포판은 변경하지 않았다.** 실행법과 라이선스는 `ios/runtime-lab/README.md`, 상세 증거/제약은 `ios/runtime-lab/VALIDATION.md` 참고.
- ios-linuxkit `c8e9dcb954963b0d9f359b3ad9da871f19b28652`와 checksum 고정 Alpine3.21.0 ARM64 rootfs를 `.tools/ios-runtime/`에서 빌드한다. 내장 앱 전체 종료/남은 자식 정리·PTY 마지막 출력 유실·GCD 신호 마스크와 sleep 중단 경쟁을 `patches/embedded-runtime.patch`로 수정했다. 승인된 patch 외 runtime 변경은 빌드 거절, source diff/patch/rootfs/probe 해시 기록. 일반 입력·probe가 같은 직렬 native stdin 경로를 사용한다.
- 전용 iPhone17Pro/iOS26.5 ARM64 Simulator에서 **25기능 검사 완료**: basic8·persistence1·shutdown1 PASS, packages10·agents5 PASS_WITH_WARNINGS. 파일·파이프·병렬 자식·재실행 후 파일 유지·TERM/KILL 정리, Git commit/worktree·HTTPS·jq·Python subprocess/PTY/9회 signal·Node streaming subprocess·SQLite·FFmpeg 동작 확인. 원본 **Codex0.163.0·Claude Code2.1.303 npm 설치와 `--version` 성공**. packages9.234초는 설치 후 재검증, agents166.049초는 설치 포함. 실제 iPhone 성능으로 해석하지 않는다.
- 경고를 숨기지 않았다: packages 연결errno65 3건·get_mempolicy syscall236 stub2건, agents 연결errno65 24건. 모든 필수 기능 성공 후 해당 connect 형태만 경고로 분류하며 다른NETDIAG·SAFETY-VALVE·assertion·shutdown불완전·시간초과·결과누락은 실패다. 판정기 **24단위 검사**, Python/shell 구문, 자체ObjC/C Clang 정적 분석 무진단, Simulator/기기용 ARM64 컴파일·링크 확인. upstream 빌드 경고는 남아 있다.
- 증거 `dist/ios-runtime-lab/summary.json` 및 tier별 output/result/manifest/host-console/screenshot, 실패재현 `dist/ios-runtime-lab/failures/`. 빌드로그 `.tools/ios-runtime/`. 전용 Simulator ID `.tools/ios-runtime/simulator-id.txt`; rootfs는 앱 sandbox에 유지한다. 자격증명/모델 호출·과금·사용자 프로젝트 작업 없음.
- **실제 iPhone 연결 없음**, 기기용 `.app`은 미서명이며 설치/실행은 미검증. 로그인 후 실제 에이전트 작업·OpenCode·ANSI/TUI·다중 UI 세션·백그라운드/잠금/메모리압박·App Store 배포는 후속이다. 런타임 GPL 및 App Store 예외의 소스 제공 의무를 제품화 전에 검토해야 한다. 다음은 실기기 동일 probe → 인증된 한 턴 → Bibimer UI/세션 규약 연결 순서다. Android APK/AAB 빌드는 하지 않았다.

## 웹사이트 최신 안내·자체 문의 양식·D1·Discord 배포 (2026-10-19)

- 사용자 요청으로10언어 홈·사용법의 오래된 ‘앱은 EN/KO, 추가 언어 준비’ 문구를 수정하고 현재10언어 지원과0.25.0 누적 변경(워크트리 생성/세션 시작·Claude Steer·대기 메시지 묶음·Ctrl+Enter·세션 종료 후 유지보수·첫 화면 수정)을 반영했다. Console에서43은 여전히 검토 중임을 확인해 공개0.23.0/내부0.25.0·정식심사중을 구분한다. 이번 작업으로 Play에 새 제출/빌드/설치는 하지 않았다.
- 이메일로 열리던 일반 문의를 각 언어의 `/contact/`로 변경했다. **오류/설치·연결/기능 제안/개인정보/기타 직접 입력**, 제목·10~5000자 본문·선택 회신 이메일·저장/Discord전달 동의를 제공한다. 계정·첨부파일 없음. 기존 크림/녹색·서체를 재사용한 자체 선택 목록으로 키보드·포커스·Esc/외부클릭/모바일을 지원한다. 문의 내용은 브라우저 저장소에 저장하지 않는다. 개인정보 요청은 `?category=privacy`로 진입하며 이메일은 정책의 대체 경로로 유지한다.
- **Cloudflare Pages Functions → D1 `bibimer-contact` → 비공개 Discord 웹훅**을 연결했다. DB `4927a1d7-9250-4863-92b1-2cae96c34426`, binding `CONTACT_DB`, migration `0001_contact_inquiries.sql` 원격 적용. 제공된 웹훅과 무작위 남용방지 키는 Pages production의 암호화된 `DISCORD_WEBHOOK_URL`/`CONTACT_RATE_KEY`에만 설정했다. 저장소/클라이언트/일반 로그에 비밀값이 없음을 검사했다. 로컬 원본은 저장소 밖 `~/.local/share/bibimer-contact/`의 owner-only 파일이다. 다른 앱 비밀·기존 DB는 변경하지 않았다.
- API는 POST JSON/동일 출처·16KB 실제 스트림·필드/동의를 검증하고 바인딩 SQL로 저장한다. UUID+정규화 내용 해시로 재시도 중복을 막고 키 기반 IP해시당 시간당5건을 원자적으로 제한한다. IP원문/UA는 저장하지 않는다. **DB 커밋 후202접수**, Discord는 최대2회 제한된 재시도 및 sent/failed/pending·횟수를 기록한다. 멘션 전파는 끄고 긴 알림은 줄여도 DB본문은 유지한다. 조회용 공개API 없음.
- 보관: 접수 시 정리와 별도 **`bibimer-contact-retention` 일일 cron `17 3 * * *`(UTC)**가90일 지난 D1행을 삭제한다. cron Worker는 공개 URL이 없다. 버전 `0df6fce6-dd5e-487b-bb2c-5ff79f1c8a21` 배포·스케줄 설정을 확인했고 실제 일일 트리거 실행 대기는 남아 있다. Discord 알림은 별도 운영자 처리/삭제·삭제요청 대상이며90일 자동 삭제를 약속하지 않는다.10언어 개인정보 방침·양식 동의에 이를 반영했다.
- 검증: 실제 SQLite의 SQL/20동시 quota·입력/출처/메서드/크기/UUID·DB실패·Discord제한/Unicode/타임아웃/재시도 API검사, 일일 보관 콜백,40개페이지 SEO/링크·언어기본값/개인정보경로·JS구문·diff 통과. Chromium에서40개페이지320px가로넘침없음과자체목록 키보드/포커스·기타/이메일·실패입력보존·15초중단/동일UUID재시도/수정시새UUID·중복클릭/완료가드·10언어320px/no-JS 안내가 통과했다. Pages Functions 빌드도 통과했다. 의존성 추가 없음.
- 초기 공개 검증에서 D1접수는 성공했지만 Discord가 network실패였다. 공식 Workers 문서로 **`redirect:error` 미지원 TypeError**를 확인해 `manual`로 수정하고302비추적/비재시도와 Workers모드제약 회귀 검사를 추가했다. 최종 전체 API 검사 후 재배포했으며 **공개 CUA 문의 → D1 한 행 → Discord sent/1회 → 같은 UUID 재POST202·행/알림 증가 없음**을 확인했다. 검증용 문의2건 중 초기1건은 실패 기록으로, 최종1건은전송완료로 남겼다. 일반 사용자 문의는 사용하지 않았다.
- 최종 **https://0824d178.bibimer.pages.dev**, 공개 **https://bibimer.app/ko/contact/**.44공개리소스(40HTML+공통3파일+sitemap)의200/원본/CSP/no-transform, API GET405·다른출처403·잘못된입력400·없는페이지404를 확인했다. Python기본UA가Cloudflare1010으로차단돼 사이트검증기임을밝힌UA로검사했다. UI시각94/pass, 증빙 `dist/website-contact/{public-verification.json,live-inquiry-verification.json,published-form.png,published-receipt.png,ko-320.png,ko-desktop.png}`와 `.omx/state/website-contact/ralph-progress.json`.
- 한계: Discord는 네트워크 응답 유실 시 제한된 재시도 중 중복 알림이 가능하며 전송 후DB상태저장 실패는pending으로 남겨 자동 재전송하지 않는다. 실패/불명 문의는 DB에서 운영자가 확인해야 한다. DB저장 성공을 Discord수신 보장으로 표현하지 않는다. 실제 외부 고객 문의·원어민 번역 검수·추가 브라우저 엔진은 미검증이다. 사용자 작업 중인 `ios/`는 변경/추가하지 않았다.

## 0.25.0(43) 정식 배포 심사 제출 (2026-10-19)

- 사용자 **정식 배포** 요청으로 검증된 내부 테스트 **0.25.0(43)** 번들을 그대로 프로덕션에 승급했다. 기존 대상 국가 **100% 전체 출시**, 새43만 포함·40제외다. 새 빌드·버전 변경·AAB 재업로드·키/인증 변경 없음. SHA-256 `1385627d648344205be5d17c2711e2f86c7802cbabcd1e825c4aff1291a46cab`을 배포 전 다시 확인했다.
- Console **2026-10-19 22:59 Asia/Seoul**에 프로덕션 변경1개 전송을 확정했고 게시 개요의 **검토 중인 변경사항 → 0.25.0 (43) - Guided bridge maintenance / 전체 출시 시작**을 확인했다. **빠른 사전 검사 실행 중**이며 검사가 성공하면 Google 검토로 전송된다. 관리형 게시가 꺼져 있어 **승인 후 자동 게시**다. 오류0·기존 가독화파일 경고1·지원기기 변화0. 프로덕션 `/tracks/4697502344481526582/releases/7/details`, 게시개요 `/publishing`.
- 정식 EN/KO노트 `release/google-play/release-notes/0.25.0-production.txt`는 공개0.23.0 이후의 워크트리 생성/세션 시작·Claude Steer·대기 메시지 묶음·Ctrl+Enter 전송·세션 종료 후 유지보수·첫 화면 수정·번역을 누적 반영했다(영어393자·한국어219자). 내장 브리지는 **0.18.0**이며 새 브리지 기능은 설정에서 업데이트해야 적용된다. 세션 종료 확인 UI 자체는 기존 stop API와 호환된다.
- 증빙 `dist/production-0.25.0/{submitted.png,submitted-dom.txt}`. README EN/KO·listing.json·언어/배포 문서를 제출 상태로 갱신했다. 기존 **공개0.23.0(40)** 기록은 별도로 보존했다. **사전검사 완료·Google 승인·정식43 공개·실제폰 업데이트는 아직 확인하지 않았다.** 승인 후 공개 상태를 확인해 currentPublicVersion과 README를 갱신한다.
- 기능/코드는 내부43과 동일하며 빌드/동작 검증은 아래 내부43의38개 scripts·유지보수5개·689키×10언어·격리UI3종과 패키지 검증을 따른다. 이번에는 출시노트 길이/태그·JSON상태·동일번들 해시·diff를 확인했다. 새 APK/실기기 설치·운영 브리지/사용자 세션 변경·웹사이트 배포는 없다.

## 0.25.0(43) 세션 종료 후 유지보수 내부 테스트 게시 (2026-10-19)

- 사용자 요청으로 `5dd5b99`의 누적 소스를 앱 **0.25.0 / versionCode 43**으로 빌드·게시했다. 설정에서 다른 프로젝트·워크트리·보관함·터미널의 종료 대상을 확인하고, 명시적으로 확인한 세션의 실제 종료 후 브리지 업데이트/재시작으로 이어가는 기능을 포함한다. 취소 시 유지, 대상 변경 재확인, 부분 실패/시간 초과/인스턴스 변경 시 유지보수 차단을 제공한다. 이전 첫 화면 수정도 유지한다. **689키×10언어**, 내장 브리지 **0.18.0 유지**. 새 유지보수 UI는 기존 stop API와 호환되며 이 UI 자체를 위해 브리지를 새 버전으로 올릴 필요는 없다.
- Console **활성 / 내부 테스터에게 제공됨 / 2026-10-19 19:29 Asia/Seoul**. 출시명 `0.25.0 (43) - Guided bridge maintenance`, 새43만 포함·42제외, 기존 테스터·EN/KO노트 유지. 오류0·기존 가독화파일 경고1·지원기기 변화0. `/tracks/4701718894791581363/releases/14/details`, 증빙 `dist/play-0.25.0/{internal43-live.png,internal43-live-dom.txt}`.
- AAB `dist/play/bibimer-0.25.0-43-release.aab`, SHA-256 `1385627d648344205be5d17c2711e2f86c7802cbabcd1e825c4aff1291a46cab`. 기존 로컬 키·심사 코드 파일을 사용했다. AAPT2/전체Java/D8·bundletool/jarsigner·기존 인증서·**54assets** 원본·브리지/4payload·비공개 Receiver/DEX·PlaySDK·셸문법·심사 digest 포함/비밀 원문 미포함을 확인했다. 실제 번들에서 `worktree-create.js`와 `bridge-maintenance.js`의 원본·HTML 참조·컴파일된 네이티브 허용 문자열까지 검증했다. `.tools/aab-0.25.0-43-{mac.log,verification.json}`. 최초 로컬 빌드는 심사 코드 파일 환경변수가 빠져 심사 접근이 비활성 상태였으므로 **업로드하지 않고** 올바른 파일 설정으로 재빌드·검증한 최종 번들만 게시했다(`.tools/aab-0.25.0-43-review-disabled.log`). 새 키·의존성·Doppler 다운로드 없음.
- Python scripts **38개**(네이티브 유지보수 Java 하네스 포함), 집중 유지보수 브리지 **5개**, Node689키×10언어·언어/초안·JS구문·diff 검사 통과. 브리지는 이번 변경과 관련한5메서드만 실행했으며 Mac의 기존 legacy pidfd/PTY 테스트까지 모두 재실행했다고 표현하지 않는다. 로그 `.tools/release-0.25.0-{python,bridge}.log`.
- 격리 Chromium의 **유지보수 UI·실제 임시 브리지 세션 종료/업데이트·전체 UI**가 모두 통과했다. 대상 표시/취소/변경/실패/중복/Back/10언어320px, 입력 대기Chat·다른 프로젝트 승인/대기열·보관 워크트리PTY의3프로세스, 종료 확인 뒤0.15.0→0.18.0 업데이트·재연결·토큰/초안/메타데이터/원본 대화 이어가기를 확인했다. 전체 UI는 실제 Java asset 허용 목록을 적용하며 첫 화면/Setup·Chat/PTY·Queue/Steer·Enter/IME·세에이전트/가져오기/승인·재접속을 포함한다. 로그 `.tools/release-0.25.0-{maintenance-ui,maintenance-real,ui}.log`. 임시 상태·모의 에이전트를 사용하고 실제 모델/사용자 세션을 호출하지 않았다.
- **APK 파생·에뮬레이터/실제폰 설치·Play 업데이트 수신은 미검증**이다(adb 연결 기기 없음). Android WebView·Termux RUN_COMMAND 권한/콜백·백그라운드 결합 검증은 실제폰에서 후속이다. 운영 브리지·사용자 세션/프로젝트/인증을 변경하거나 재시작하지 않았다. 정식 **0.23.0(40)**과 웹사이트 배포는 유지한다. 아래 ‘미배포’ 표시는 당시 기능 구현 기록이며 이번43에 반영됐다.

## 세션 종료 후 브리지 업데이트·재시작 (2026-10-19, 미배포)

- 사용자 요청의 대안인 **설정 → Termux 브리지 → 세션 종료 후 업데이트 / 세션 종료 후 재시작**을 구현했다. 응답을 마친 Chat도 브리지에 연결된 실행 프로세스라 연결을 보존하는 재시작으로 표시하지 않는다. 버튼을 비활성화하는 대신 다른 프로젝트·워크트리·보관함·터미널까지 종료 대상 이름/상태/대기열/경로를 확인하고 실행한다. **계속 작업** 또는 조회 중 Back은 세션을 유지한다. 응답/명령 중단·대기열 소실, 목록/저장 대화 유지·PTY 출력 비복원을 안내한다.
- 새 `bridge-maintenance.js`는 최신 인증 health의 전체 대상 ID와 instance를 고정하고 확인 시 재검사한다. 목록이 바뀌면 다시 확인하며, 도중 추가된 세션을 자동 종료하지 않는다. 기존 세션 stop API를 순차 호출하고 모든 대상이 실제 종료됐는지 최대20초(HTTP 자체 제한 별도) 확인한 뒤에만 기존 네이티브 고정 update/restart를 호출한다. 접수 응답만으로 성공 처리하지 않는다. 중복 실행/종료 중 Back을 막으며, 부분 종료·시간 초과·연결/pause/instance 변경 시 유지보수를 시작하지 않는다. 갱신 직전 새 세션이 생겨도 Termux 도우미의 기존 실행 상태 검사로 거절한다. 세션 없는 경우와 오프라인 복구는 기존 도우미의 검증 경로를 유지한다. 별도 강제 종료 API·자동 승인·자동 대화 재개는 추가하지 않았다.
- 신규7키와 기존3키를 10언어에 적용해 **689키×10언어**다. 유지보수 busy 문구는 일부 세션을 이미 종료했을 수 있으므로 ‘아무것도 종료하지 않았다’고 표시하지 않고 브리지 미업데이트/미재시작으로 설명한다. AGENTS.md와 설정/인터페이스/구조 문서를 갱신했다.
- Android WebView의 고정 asset 허용 목록에 새 `bridge-maintenance.js`를 추가했다. 작업 중 발견한 `worktree-create.js` 누락은 원격 0.24.1의 동일 수정과 함께 보존했다. 원격의 `test_build_release.py` 필수 리소스/네이티브 허용 목록 계약 검사와 실제 Java 허용 정책을 적용한 `smoke_ui.cjs`를 유지한다. 중복되는 임시 i18n 리소스 검사는 최종 변경에서 제거하고 이 계약 검사로 확인한다. 기존 워크트리 시작 오류는 원격 기록의0.24.1에서 수정됐으며, 이번 유지보수 UI는 후속 APK가 필요하다.
- 검증: `smoke_bridge_maintenance.cjs`는 입력 대기/응답/승인·대기열/보관/PTY 대상 표시와 텍스트 안전성, 취소/조회 중 Back, 확인 전/도중 목록 변화, stop 실패, 접수 후 실제 종료 지연·시간 초과, 오래된 instance, 중복 클릭/처리 중 Back, 완료 재연결·오프라인 복구, 10언어 320px 확인 창을 검증했다. `.tools/maintenance-end-ui-final.log`, 화면 `dist/screenshots/bridge-maintenance-end-320-{en,ko}.png`. 한국어 화면을 시각 확인했다.
- `smoke_maintenance_sessions.cjs`는 실제 격리 브리지·Git 워크트리·모의 Codex·Chromium과 실제 유지보수 도우미로 **입력 대기 Chat + 다른 프로젝트의 승인/대기열 + 보관된 워크트리 PTY**를 검증했다. 취소 시3프로세스 유지, 명시적 종료 후 active=0일 때만 업데이트, 내장 파일 일치·새 instance·자동 재연결, 원래 초안·세션 이름/보관/경로·연결 토큰 보존, 원본 대화 이어가기를 확인했다. 초기 검사에서 단일 모의 기록 파일을 여러 프로젝트가 덮어쓰던 문제는 검사 전용 CLI의 작업 폴더별 파일 분리로 보완했다. `.tools/maintenance-end-real-final.log`.
- 기존 유지보수/재시작 Python **11검사**, 네이티브 유지보수 Java 하네스 **1검사**, `smoke_ui.cjs` 전체 회귀(Enter/IME·Queue/Steer·다중 프로젝트·3에이전트·가져오기·승인·초안), i18n/언어/초안/asset 689키×10언어·JS구문·diff 통과. `.tools/maintenance-end-{bridge,native,regression}.log`. 브리지/도우미의 실행 세션 거절 조건과 네이티브 허용 동작은 유지했다.
- **소스 구현·검증이며 APK/AAB 빌드·버전 변경·설치/배포·운영 브리지 교체/재시작 없음.** 새 기능은 새 앱 적용이 필요하며 기존 브리지의 세션 stop API와 호환된다. 실제 Android WebView·Termux RUN_COMMAND 권한 승인/거부·백그라운드 제약을 결합한 동작은 후속 APK 적용 후 검증한다. 모든 실행 검사는 임시 폴더/포트/세션만 사용했다.
- 앞선 레포 동기화 요청에 따라 기능을 `de4c5c2`에 커밋하고 원격 `b18d595`까지의4커밋(검사 비동기 보완·0.24.0 내부 배포·워크트리 시작 오류 수정·0.24.1 내부 배포)을 함께 반영했다. 문서와 asset 허용 목록 충돌은 양쪽 기록 및 필요한 두 스크립트를 보존해 해결했다. 원격 앱0.24.1(42)·브리지0.18.0·정식0.23.0(40) 기록을 유지하며 이번 ‘세션 종료 후 유지보수’는 아직 미배포다.
- 병합된 최종 소스에서 유지보수/재시작·네이티브·리소스/빌드 계약 **23검사**, 실제0.15.0→0.18.0 종료/업데이트/대화 이어가기, 유지보수 확인 UI, 네이티브 asset 허용 정책을 적용한 전체 `smoke_ui.cjs`, 689키×10언어·구문/diff를 다시 통과했다. `.tools/maintenance-end-merged-{checks,real,ui,regression}.log`. 패키징 검사는 도구 실행을 대역으로 처리하며 실제 APK/AAB 빌드는 하지 않았다.

## 0.24.1(42) 첫 화면 초기화 수정·내부 테스트 게시 (2026-10-19)

- 사용자가 0.24.0의 **첫 화면 먹통**을 보고했다. `index.html`과 `app.js`가 요구하는 `worktree-create.js`가 Android `MainActivity.ASSETS`에 빠져 WebView에서 빈 응답으로 차단되고, 초기화가 중단되는 원인을 확인했다. 해당 파일 하나를 기존 허용 목록에 추가했다. 파일 접근 범위를 전면 개방하지 않았다.
- 이전 검사는 파일의 AAB 포함 여부와 모든 파일을 제공하는 브라우저 서버만 확인해 **실제 네이티브 허용 정책을 놓쳤다**. `scripts/tests/test_build_release.py`에 HTML의 필수 리소스와 네이티브 허용 목록·원본 파일을 대조하는 회귀 검사를 추가했다. 수정 전 `worktree-create.js` 누락으로 실패하고 수정 후 통과했다. `scripts/smoke_ui.cjs`도 실제 Java 허용 목록으로 파일을 제공하도록 바꿨다.
- Python scripts **38개**, Node **682키×10언어**·언어/초안·Demo·Review, 네이티브 파일 정책을 적용한 전체 격리 Chromium UI 검사를 통과했다. Setup/버튼·Chat/PTY·대기열/Steer·Ctrl+Enter/IME·가져오기/승인/질문/재접속을 포함한다. 로그 `.tools/webview-assets-before.log`, `.tools/release-0.24.1-{python,native-policy-ui}.log`. 실제41/42 AAB의 JS는 같고 **41의 DEX에는 허용 문자열이 없으며 42에는 포함**됨을 확인했다.
- 앱 **0.24.1 / versionCode 42**, 내장 브리지 **0.18.0 유지**. AAB `dist/play/bibimer-0.24.1-42-release.aab`, SHA-256 `2e32fbed4d52e9ae17cdebca1f8e050debeb63e77f62ea1baea6d1a2b179b830`. AAPT2/전체 Java/D8·bundletool/jarsigner·기존 업로드 인증서, 53assets/브리지/4payload 원본·비공개 Receiver/DEX·PlaySDK·셸문법·비밀 원문 미포함 검증 통과. 새 의존성·키 없음. `.tools/aab-0.24.1-42-{mac.log,verification.json}`.
- Console **활성 / 내부 테스터에게 제공됨 / 2026-10-19 17:31 Asia/Seoul**. 출시명 `0.24.1 (42) - Fix first-screen startup`, 새42만 포함·문제 있는41제외, EN/KO노트·기존 테스터 유지. 오류0·기존 가독화파일 경고1·지원기기 변화0. `/tracks/4701718894791581363/releases/13/details`, 증빙 `dist/play-0.24.1/{internal42-live.png,internal42-live-dom.txt}`. README/배포 메타데이터를42로 갱신하고41 결함·대체 이력을 남겼다. 아래41은 당시 배포·검사 기록이며 정상 동작 보장을 뜻하지 않는다.
- **실제폰/에뮬레이터 설치·Android WebView 실동작·Play 업데이트 수신은 미검증**이다. 연결된 adb 기기가 없어 소스/실제 번들/브라우저 정책 검사까지 확인했다. 실제 모델 작업·백그라운드도 후속이다. 사용자 Termux 세션·프로젝트·운영 브리지·인증은 변경/재시작하지 않았다. 정식0.23.0(40)·웹사이트 배포는 유지한다. 이 시작 오류 수정 자체에는 브리지 업데이트가 필요하지 않으며,41에 포함됐던 새 브리지 기능은0.18.0 적용이 필요하다.

## 0.24.0(41) 워크트리·Claude Steer 내부 테스트 게시 (2026-10-19)

- 사용자 요청으로 `a9b1177`의 누적 기능을 앱 **0.24.0 / versionCode 41**, 내장 브리지 **0.18.0**으로 빌드·게시했다. 사이드바 워크트리 생성/브랜치 선택/세션 시작, Claude 입력창·대기 항목 Steer, 일반 대기 메시지 묶음 전송, Enter 줄바꿈 설정의 Ctrl+Enter 전송, **682키×10언어**를 포함한다. 아래 미배포 기능은41에 포함됐다. 새 브리지 기능은 앱 업데이트 후 설정에서 브리지를 업데이트해야 적용된다.
- Console **활성 / 내부 테스터에게 제공됨 / 2026-10-19 17:05 Asia/Seoul**. 출시명 `0.24.0 (41) - Worktrees and Claude steering`, 새41만 포함·40제외, 기존 테스터와 EN/KO 출시노트 유지. 오류0·기존 가독화파일 경고1·지원기기 변화0. Console `/tracks/4701718894791581363/releases/12/details`. 증빙 `dist/play-0.24.0/{internal41-live.png,internal41-live-dom.txt}`.
- AAB `dist/play/bibimer-0.24.0-41-release.aab`, SHA-256 `ce923fe5c5d1bcd560dba0abeb138178c2b9d506bd934f3f78af5ab179492839`. 기존 로컬 업로드키·심사코드 사용. 전체 AAPT2/Java/D8·bundletool/jarsigner·기존 인증서, **53assets** 원본 일치, 유지보수 소스와 브리지/어댑터4payload 원본·해시, 비공개Receiver/DEX·PlaySDK/고정의존성·설치기셸문법·심사digest 포함/비밀원문 미포함 검증 통과. 새 `worktree-create.js`의 로딩과 컴파일된 네이티브 `/v1/worktrees/manage` 허용 경로도 확인했다. `.tools/aab-0.24.0-41-{mac.log,verification.json}`. 이전의 전체Java컴파일 준비 부족은 이번 정식빌드에서 해결됐으며 기존Java8/deprecated·AndroidX디버그정보 안내만 있다. 새 의존성/키·Doppler다운로드 없음.
- Python scripts **37개**, 집중 브리지 **60개**(워크트리8·대기열13·제공자14·명령7·알림9·Setup4·유지보수5), Node682키×10언어·언어/초안·업데이트·프로젝트순서/위치/자동열기·Demo/Review·JS구문·diff 검사 통과. 전체175개를 이번Mac에서 재실행했다고 표현하지 않으며 전체회귀의 앞선Termux기록은 아래를 따른다. Mac 셸은 검사 전용 `/bin/bash --noprofile --norc`, TMPDIR은 실제 `/private/var` 경로를 사용했다. 로그 `.tools/release-0.24.0-{python,bridge}.log`.
- 격리 Chromium의 **워크트리·명령·전체 UI** 검사가 모두 통과했다. 실제 임시Git의 새/기존브랜치·기준커밋/사용중브랜치·중복/응답유실·닫기/재로드/실행실패복구·선택/초안/응답 보존, 자체선택시트·10언어320/393px·Back, Ctrl+Enter·IME·Claude Steer/대기열묶음·기존세에이전트/가져오기/승인/질문/PTY를 확인했다. 초기검사는 도움말 닫기/Escape의 close 이벤트보다 aria-expanded를 먼저 검사한2곳과, OpenCode 답변처리 완료 전에 결과파일을 읽은1곳에서 실패했다. **검사만** 이벤트 완료/명시적 Ready 상태를 기다리도록 보완해 재실행한 명령·전체UI가 통과했다. 앱 동작은 바꾸지 않았다. 로그 `.tools/release-0.24.0-{worktrees-ui,commands-ui,commands-final,ui,ui-final}.log`. KO320px 워크트리 화면을 시각 확인했다. 브라우저Native·에이전트SDK/모델은 대역이며 실제모델을 호출하지 않았다.
- 함께 확인한 기존 **정식0.23.0(40)은 Google Play에 제공됨 / 전체출시 / 178개 국가·지역 / 2026-10-19 06:54 게시** 상태다. `dist/play-0.24.0/production40-confirmed{.png,-dom.txt}`. README EN/KO·listing.json·언어문서의 공개버전을40으로 갱신했다. 이번41의 프로덕션 승급·웹사이트 배포는 없다.
- **APK파생·에뮬레이터/실제폰 설치·Play 업데이트 감지는 이번에 하지 않았다.** 실제 Android WebView·키보드/IME·TalkBack·백그라운드·실제 모델 작업·운영브리지 적용은 후속이다. 사용자 세션·원본Git·운영브리지/인증을 변경하거나 재시작하지 않았다. 설정의 브리지 업데이트는 실행세션이 있으면 거절한다. 생성된 워크트리/브랜치 삭제는 Git에서 처리한다.

## 기능 변경·원격 배포 기록 동기화 (2026-10-19)

- 사용자 요청으로 Ctrl+Enter 전송·Claude Steer·대기열 묶음 전송·워크트리 생성/브랜치/세션 시작을 `0c8fe89`에 커밋하고 원격 `b92ba58`까지의 3커밋(UI 검사 비동기 보완·0.23.0 내부 테스트·정식 심사 제출)을 함께 반영했다. NEXT_SESSION.md의 같은 위치 추가 충돌은 양쪽 기록을 보존해 해결했다. 원격의 앱 0.23.0(40)·브리지 0.17.0 버전과 배포 상태를 유지한다. 이번 신규 기능은 해당 배포에 포함되지 않은 미배포 소스이며 추가 빌드·게시·운영 브리지 교체/재시작은 하지 않았다.
- 병합 후 유지보수/재시작·워크트리 **16검사**, i18n/언어·초안 **682키×10언어**, Python 구문·diff 검사를 다시 통과했다. 로그 `.tools/repo-sync-bridge.log`. 이전 전체175검사·모바일 UI 검증 기록은 아래 기능 항목에 유지한다.

## 사이드바 워크트리 생성·브랜치·세션 시작 (2026-10-19, 미배포)

- 사용자 요청에 따라 프로젝트를 펼치면 **+ 워크트리 만들기**를 제공한다. 새 브랜치 이름 또는 기존 로컬 브랜치·기준 커밋·에이전트·Chat/Terminal을 선택하고 **만들고 세션 시작**으로 진행한다. 없는 브랜치는 새로 만들고 기존 브랜치는 원래 tip을 재사용한다. 사용 중인 브랜치는 비활성화하고 Git에서도 강제 체크아웃/reset을 하지 않는다. 커밋이 없는 저장소·일반 폴더는 생성할 수 없다. 기존 워크트리 그룹의 새 세션/가져오기는 유지한다. Orca·Paseo의 공식 워크트리 안내를 참고했다(링크는 `docs/interface.md`).
- 새 `worktree_creation` 기능과 인증된 `/v1/worktrees/manage`의 options/status/create/launch를 추가했다. Termux 브리지 상태 폴더의 `worktrees/<project-id>/<branch-slug>-<hash>`에 실제 Git 워크트리를 만든다. 원래 폴더·미커밋 파일·세션·대기 승인/초안은 유지하고 미커밋 파일을 복사하지 않는다. 후크·force/reset·fetch·자동 삭제를 사용하지 않으며 기존 폴더/심볼릭 링크를 덮어쓰지 않는다. 생성 중에는 해당 경로로 세션을 시작할 수 없다.
- 생성 영수증을 Git 실행 전에 저장하고 생성/실행 ID를 각각 고정해 재시도 중복을 막는다. 창을 닫으면 생성은 유지하고 세션을 자동 시작하지 않으며, 다시 열거나 화면 재로드 후 완료 작업의 **세션 시작**을 제공한다. 시작 중 창을 닫거나 다른 세션으로 이동해도 선택을 빼앗지 않는다. 실행 실패 시 워크트리/브랜치를 보존한다. 브리지 재시작 후 실제 Git 경로·브랜치·잠금을 확인해 완료 작업을 복구하고 프로세스를 복원했다고 표시하지 않는다. 진행 중 프로젝트 등록 해제/정상 브리지 종료를 거절한다. 동시 Git 생성 1개·누적 영수증 128개·프로젝트 실제 워크트리 120개·Git 생성 5분 제한이다.
- 앱 자체 하단 선택 시트·Back·사용 불가 항목 설명을 사용하고, 구형 브리지에서는 버튼을 숨긴다. 신규 25키×10언어로 **682키×10언어**다. 언어 변경 시 동적으로 만든 브랜치/에이전트/인터페이스 항목도 갱신한다. 작업 재개 시 고정된 실제 기준 커밋을 표시한다. README 영문/한국어는 배포판과 미배포 소스를 구분했고 AGENTS.md·설정/인터페이스/구조 문서를 갱신했다.
- 검증: `PYTHONPATH=bridge/tests:scripts python -m unittest discover -s bridge/tests -v` **175검사 전체 통과**(Codex/Claude/OpenCode·대기열/Steer·알림·가져오기·재시작·Setup 회귀 포함). 워크트리 전용 **8검사**를 기준 커밋 변경 시나리오까지 보완해 다시 통과했다. 실제 Git의 새/기존 브랜치·고정 커밋·후크 미실행·원본 미커밋 파일 보존·경로 경쟁 비덮어쓰기·생성 중 실행 금지·영수증 저장 실패·실행 실패 후 재시도·선택/프로세스 보존·중복/재시작 복구를 확인했다. 로그 `.tools/worktree-create-{all-bridge,bridge-final}.log`.
- `node scripts/smoke_worktrees.cjs`는 실제 격리 브리지·Git·Chromium·모의 Codex로 새/기존 브랜치와 세션 시작, 기존 응답/초안 보존, 중복 submit 방지, 닫은 뒤 생성 완료, 재로드 복구, 실행 응답 유실 후 동일 ID 재시도, 실행 중 닫기/다른 세션 이동, 비 Git/구형 기능 숨김, 10언어·320/393px·자체 선택 시트·Back을 검증했다. `smoke_library.cjs`의 기존 사이드바/드래그 정렬/프로젝트 관리/알림 이동/다중 세션 회귀도 전체 통과했다. 로그 `.tools/worktree-create-{ui-final,library}.log`, 화면 `dist/screenshots/worktree-create-{320,393}-{en,ko}.png`. 영어/한국어 320px 화면을 시각 확인했다. 초기 UI 검사의 완료 작업 필드 비활성/메모리 초안의 재로드 소실 기대값을 바로잡았고 언어 변경 시 이전 선택 문구가 남는 실제 문제를 수정했다.
- i18n·언어/초안(682키×10언어), JS/Python 구문·diff 통과. 변경한 Android `LocalBridge`·`TokenStore`를 Android 36 API 대상으로 Java 8 소스 컴파일해 통과했다(`.tools/worktree-create-java-native.log`). 전체 앱 Java 컴파일 시도는 검증용 생성 설정과 로컬 Play SDK 의존 파일 준비 부족으로 완료하지 않았으며 APK 빌드 검증으로 간주하지 않는다.
- **소스 구현·검증이며 APK/AAB 빌드·버전 변경·설치/배포·운영 브리지 교체/재시작 없음.** 실제 사용에는 새 앱과 브리지 적용이 필요하다. 사용자 프로젝트·운영 세션을 변경하지 않고 임시 저장소/브리지만 사용했다. 실제 Android WebView의 키보드·터치·백그라운드 동작은 후속 APK 적용 후 검증해야 한다. 워크트리/브랜치 삭제는 Git에서 처리한다.

## Claude Steer·대기열 묶음 전송 (2026-10-19, 미배포)

- 사용자 요청에 따라 Claude도 Codex와 같은 **입력창/대기 메시지의 Steer(방향 수정)** UI로 제공한다. 일반 전송은 기존 대기열로 유지한다. `claude_steer`와 어댑터 initialize의 `capabilities.steer`를 확인하며 OpenCode·구형 브리지에는 활성화하지 않는다. Claude는 현재 SDK query의 열린 입력 스트림으로 UUID를 붙여 전달한다. 동일 UUID의 네이티브 `command_lifecycle` queued/started 또는 user replay 확인 후에만 수락 응답하며 SDK 쓰기만으로 성공 처리하지 않는다. 실제 반영 시점은 Claude가 결정한다. 새 query/강제 interrupt/자동 승인으로 Steer를 흉내 내지 않는다.
- 원본 입력/대기 항목·현재 실행 ID·요청 ID를 고정해 중복을 막는다. 대기 항목은 접수 확인 후에만 제거하며 거절/전달 불명에는 보존하고 대기열을 일시정지한다. 승인·작성 초안은 유지한다. Claude 네이티브 후속 입력이 남으면 첫 result에서 닫지 않고 `queued_turn_count`와 미확인 입력을 확인해 같은 Bibimer 실행을 유지한다. 명시적 중단은 SDK interrupt 뒤 해당 query를 닫는다. Claude 슬래시 명령은 Steer로 전달하지 않고 일반 대기열에서 실행한다.
- **Codex·Claude·OpenCode의 일반 대기 메시지는 전송 차례에 쌓인 항목을 순서대로 줄바꿈 두 개로 연결해 한 번에 전달**한다. 요청할 ID 묶음을 고정해 수락 시 해당 항목만 함께 제거하고 나중에 추가한 항목은 다음 묶음으로 남긴다. 묶음 거절/전달 불명은 전체를 보존한다. Codex 스킬 첨부를 유지하고 Claude·OpenCode 네이티브 슬래시 명령은 단독 실행해 명령 의미를 보존한다. 기존 16건·건당 16KiB 한도를 유지하며 어댑터 JSON 행 상한을 2MiB로 늘려 최대 묶음을 수용한다. 화면의 기존 항목별 표시 길이 제한은 유지한다.
- 새 기능 `queue_batch`에 맞춘 도움말 2키와 Steer 안내/오류를 10언어에 반영해 **657키×10언어**다. 구형 브리지는 기존 개별 전송 안내를 사용한다. 예제 Java도 Claude Steer와 한 묶음당 한 번의 예제 재생을 제공하며 실제 입력을 저장/실행하지 않는다. AGENTS.md·설정/인터페이스/구조 문서를 갱신했다.
- 검증: 전체 브리지 **165검사 중 164통과**, Setup 1검사는 빌드 도우미의 `play_sdk`를 찾는 `PYTHONPATH` 누락으로 import 실패했다. `PYTHONPATH=bridge/tests:scripts`로 해당 검사만 재실행해 통과했다(격리 설치이며 운영 브리지 변경 없음). 최종 Claude/명령 **19검사**와 추가 **2검사** 통과: 원래 query 유지·접수/중복/오래된 턴·승인 보존·대기 항목 Steer·거절/시간 초과 보존·네이티브 후속 완료·Codex 스킬/명령 경계·16개 최대 크기 묶음의 Codex/Claude 본문 비절단을 확인했다. 묶음 전체 실패/고정 ID/늦게 추가된 항목의 다음 차례 처리와 완료 알림 회귀도 포함한다.
- `node scripts/smoke_ui.cjs` 최종 전체 통과: Claude 입력창/대기 항목 Steer·동일 실행/초안·구형 기능 숨김·남은 2메시지의 한 번 전송, 기존 Codex Steer·대기열/승인/가져오기/Enter·다중 프로젝트 회귀를 확인했다. 초기 검사는 승인창이 공통 입력창을 숨기는 기존 CSS 규칙 때문에 Steer 가시성에서 실패했으며, 일반 응답 중 시나리오로 수정한 뒤 통과했다. `smoke_commands.cjs`도 새 묶음 도움말 기대값 보완 후 전체 통과. 10언어 320px, i18n/언어/초안·JS/Python 구문·diff 통과. 예제 Java **2검사/102개 동작 단언** 및 예제 UI/초안 계약 통과. 화면 `dist/screenshots/claude-steer-320-en.png`를 시각 확인했다. 로그 `.tools/claude-steer-{ui-verified,commands-final,all-bridge,setup,provider-final,bounds,demo}.log`.
- 실제 폰의 **공식 SDK 0.3.283·Claude 런타임 2.1.283**과 새 어댑터를 별도 임시 작업/설정 폴더·로컬 HTTP 응답 대역으로 검증했다. 6초짜리 `sleep` 도구 실행 중 추가 입력의 네이티브 접수를 약 **59ms**에 확인했고, 같은 실행의 다음 API 요청에 본문이 포함되며 완료가 1회 발생했다. 실제 모델/사용자 인증/프로젝트/운영 브리지는 사용·변경하지 않았다. 재현용 `.tools/claude-steer-native-adapter.mjs`, 결과 `.tools/claude-steer-native-adapter.log`.
- **소스 구현·검증이며 APK/AAB 빌드·버전 변경·설치/배포·운영 브리지 교체/재시작 없음.** 실제 사용에는 새 앱과 브리지/어댑터 적용이 필요하다. 실행 중인 기존 사용자 세션은 유지했다. 실제 모델 작업과 Android WebView의 터치/IME·알림 연동 검증은 후속 적용 후 남아 있다.

## Enter 줄바꿈 설정의 Ctrl+Enter 전송 (2026-10-19, 미배포)

- 공통 입력창에서 Enter가 **줄바꿈**이면 **Ctrl+Enter로 전송**하고 Chat 응답 중에는 해당 세션의 대기열에 추가한다. Enter가 **보내기**이면 Ctrl+Enter는 줄바꿈한다. Shift/Meta/Alt+Enter와 Ctrl+Shift+Enter는 줄바꿈하며 IME 조합/키 코드 229·반복 키 전송 방지, 기존 전송 가능 여부 검사를 유지한다. Chat·PTY 아래 공통 입력창에 적용하고 PTY 직접 입력·특수 Enter 키는 유지한다.
- 설정 안내 1키×10언어와 HTML 기본 문구, AGENTS.md·설정/인터페이스/구조 문서를 갱신했다. 키 개수는 655키×10언어로 유지한다.
- 검증: `node scripts/smoke_ui.cjs` 전체 통과. 실제 격리 브리지·Chromium과 모의 에이전트에서 Ctrl+Enter의 Chat 전송/정확한 본문 1회 전달·응답 중 대기열 추가/현재 턴 유지·PTY 공통 입력창 전송, 두 Enter 설정·선택 영역 줄바꿈·IME/키 반복 보호·프로젝트/세션 초안·기존 승인/대기열/Steer/가져오기 회귀를 확인했다. 추가 전송으로 복사 버튼이 둘이 되어 초기 검사의 선택자가 실패했으며 최신 답변의 버튼을 검사하도록 보완한 뒤 전체 통과했다. `node scripts/smoke_commands.cjs`도 Ctrl+Enter의 구조화된 스킬 전송·명령 선택/IME 회귀를 포함해 통과했다. i18n 655키×10언어·언어/초안, JS 구문·diff 검사 통과. 로그 `.tools/ctrl-enter-ui-final.log`, `.tools/ctrl-enter-commands.log`.
- **소스 구현·검증이며 APK/AAB 빌드·설치/배포·운영 브리지 재시작 없음.** 설치 앱에는 후속 빌드/업데이트 후 반영된다. 실제 Android WebView·하드웨어 키보드·한글 IME 검증은 남아 있다.

## 0.23.0(40) 정식 출시 심사 제출 (2026-10-19)

- 사용자 정식 배포 요청으로 검증된 **0.23.0(40)** 내부 테스트 번들을 프로덕션에 승급했다. 새 빌드·서명·업로드 없이 동일40만 포함하고 기존37은 제외했다. 출시율 **100%·기존 전체178개 국가·지역**이며 관리형 게시가 꺼져 있어 승인 후 자동 공개된다.
- **2026-10-19 06:41 Asia/Seoul**, 게시 개요의 **검토 중인 변경사항 / 일반적으로 발견되는 문제에 대한 빠른 검사 실행 중**을 확인했다. 제출항목은 프로덕션40의 전체 출시 시작 **1건**이다. 오류0·기존 가독화파일 경고1·지원기기 변화0. 기존 심사 접근·스토어 등록정보·가격·국가·테스터 설정을 변경하지 않았다. 공개테스트 임시버전은 제출하지 않았다.
- 정식 출시 노트 `release/google-play/release-notes/0.23.0-production.txt`는 공개37 이후38~40의 에이전트 준비/로그인, 브리지 유지보수, 세션 가져오기·연결완료, GitHub진행률, 프로젝트드래그, 명령결과·전송도움말을 누적 반영했다(영어447자·한국어239자). 내장브리지는 **0.17.0**이며 새 기능 적용에는 앱 업데이트 후 설정에서 브리지 업데이트가 필요하다. 운영브리지/사용자세션은 변경하거나 재시작하지 않았다.
- 동일 AAB SHA-256 `047d8e2fc7b99410e8bb3bb28efd6aed5496482ae2cbbafa60eb5e6d11ddb018`과 기존검증기록을 확인했다. 이번 변경은 출시노트·README EN/KO·listing.json·배포기록뿐이며 소스 동작·버전·빌드산출물은 유지했다. 출시노트 길이/태그·JSON상태·번들해시·diff를 검증했다. 기능 검증은 아래 내부40기록을 따른다.
- 증빙 `dist/production-0.23.0/{submitted.png,submitted-dom.txt}`. 프로덕션 `/tracks/4697502344481526582/releases/6/details`, 게시개요 `/publishing`. **사전검사완료·Google승인·정식40공개·실제폰업데이트는 아직확인하지 않았다.** 현재 마지막으로 확인된 공개버전은 **0.20.0(37)**이며 README/listing.json도 이를 유지한다. 승인 후 Console/Play에서40공개를 확인해 공개버전기록을 갱신한다. 웹사이트 배포·APK파생/설치 없음.

## 0.23.0(40) 프로젝트·GitHub 개선 내부 테스트 게시 (2026-10-19)

- 사용자 배포 요청으로 `8c3516f`까지의 누적 변경을 앱 **0.23.0 / versionCode 40**, 내장 브리지 **0.17.0**으로 빌드·게시했다. Codex 저장 세션 조회 충돌 수정, 준비 화면의 연결 완료 상태, GitHub 클론 결과·단계별 진행률·중복 잠금, 프로젝트 롱 프레스 드래그 정렬, 명령 실패 문구 정리를 포함한다. **655키×10언어**다. 앱의 새 브리지 업데이트 안내가 작동하도록 브리지 버전을 올렸으며 새 브리지 기능은 설정에서 업데이트한 뒤 적용된다.
- Console **활성 / 내부 테스터에게 제공됨 / 2026-10-19 04:11 Asia/Seoul** 확인. 출시명 `0.23.0 (40) - Projects and GitHub progress`, 새40만 포함·39제외, 기존테스터와 EN/KO노트 유지. 오류0·기존 가독화파일 경고1·지원기기 변화0. Console `/tracks/4701718894791581363/releases/11/details`. 증빙 `dist/play-0.23.0/{internal40-live.png,internal40-live-dom.txt}`.
- AAB `dist/play/bibimer-0.23.0-40-release.aab`, SHA-256 `047d8e2fc7b99410e8bb3bb28efd6aed5496482ae2cbbafa60eb5e6d11ddb018`. 기존 로컬 업로드키·심사코드 사용. 전체 AAPT2/Java/D8·bundletool/jarsigner·기존 인증서, 52assets 원본 일치, 유지보수 소스·브리지/어댑터4payload 원본/해시 일치, 비공개Receiver·DEX/PlaySDK·고정의존성·설치기셸문법·심사digest 포함/비밀원문 미포함을 검증했다. `.tools/aab-0.23.0-40-{mac.log,verification.json}`. 새 의존성 설치·키 생성·Doppler 다운로드는 없다.
- 검증: Python scripts **37개**, 집중 브리지 **37개**(가져오기9·GitHub10·프로젝트관리9·Setup4·유지보수5), Node655키×10언어/언어·초안·업데이트·프로젝트순서/위치/자동열기·Demo/Review 회귀, JS구문·diff 검사 통과. 브리지 최초 실행은 Mac PTY 명령 출력1건이 실패했고 `/bin/bash --noprofile --norc`를 쓰는 검사 전용 PATH로 고정한 뒤 단독 및 전체37개가 통과했다. 사용자 셸 설정·운영 브리지 코드는 바꾸지 않았다. TMPDIR도 실제 `/private/var` 경로로 통일했다. 로그 `.tools/release-0.23.0-{python,bridge,bridge-final,pty-recheck,pty-clean}.log`.
- 격리 Chromium의 **Setup·GitHub·Library·Sidebar drag** 검사가 모두 통과했다. 진행률42%/100%·중복탭·실제 로컬Git 클론/등록·응답유실·오류/취소·기존프로세스/초안 유지, 터치롱프레스/이동/자동스크롤/취소·반응형·10언어320px를 확인했다. 기존 설치된 Playwright/cache를 재사용했다. 첫 브라우저 실행은 실행파일 심볼릭링크의 ICU리소스 탐색에 실패해 실제 경로로 exec하는 검사 전용 런처로 해결했다. UI 검사가 폴더 검증·새세션 선택·클론접수 완료 전에 값을 읽던 경합3곳과 화면크기 변경의 미디어쿼리 처리 전 드로어를 열던 경합1곳은 **완료 상태를 기다리도록 검사만 보완**했다. 앱 동작 코드는 유지했다. 유지보수 테스트의 구버전fixture는 현재 `module.VERSION`을 사용하도록 바꿔 버전 변경 뒤에도 실제 구버전을 검증한다. 로그 `.tools/release-0.23.0-{setup-ui,github-final,library-final,drag-final}.log`. KO320px 진행률·드래그 화면을 시각 확인했다.
- **APK파생·에뮬레이터/실제폰 설치·실제 Play 업데이트 감지는 이번에 검증하지 않았다.** 실제 Android WebView·TalkBack·IME·백그라운드와 운영 브리지 적용은 후속이다. 이번 배포로 사용자 세션을 종료하거나 운영 브리지/인증을 변경·재시작하지 않았다. 설정의 업데이트는 실행 세션이 있으면 거절한다. 프로덕션은 기존0.20.0(37), 웹배포 없음. 이전39의 Play 업데이트 버튼 미표시는 사용자가 Play 스토어 앱을 다시 열어 해결했다고 보고했다. 새 버전도 표시가 늦으면 스토어를 다시 열어 확인한다.

## 커맨드 실패 표시의 중복 문구 정리 (2026-10-19, 미배포)

- 커맨드 실행 박스의 실패 상태 옆 `실패 코드 {code}`를 `코드 {code}`로 줄였다(예: **실패 · 코드 127**). 코드가 없으면 `코드 미제공`으로 표시한다. 동일한 두 문구를 10언어에서 정리하고 상태 판정·실제 종료 코드·성공 표시는 유지했다.
- 검증: 기존 i18n 655키×10언어·보간·언어/초안 검사와 diff 검사 통과. 문구만 변경했으며 새 동작 검사는 추가하지 않았다. **APK/AAB 빌드·설치/배포·브리지 재시작 없음.** 설치 앱에는 후속 빌드/업데이트 후 반영된다.

## 저장소 동기화 (2026-10-19)

- 사용자 요청으로 누적 소스 수정(세션 가져오기·준비 연결 상태·GitHub 결과/진행률/중복 잠금·프로젝트 드래그 정렬)을 커밋하고 원격 `9dc901d`의 **0.22.0(39) 내부 테스트 배포 기록**을 함께 반영했다. `NEXT_SESSION.md`의 추가 위치 충돌은 양쪽 기록을 보존해 해결했다. 현재 누적 수정은 해당 배포39 이후의 미배포 변경이며 새 APK/AAB 빌드·게시나 운영 브리지 재시작은 하지 않았다.

## 프로젝트 롱 프레스·드래그 정렬 (2026-10-19, 미배포)

- 사이드바 프로젝트 제목을 **450ms 길게 누른 뒤 드래그하고 놓으면** 해당 위치로 이동한다. 이동 중에는 본문을 CSS로 임시 접어 제목·순번·반투명 삽입 자리·따라오는 제목을 표시하고 목록 가장자리에서 자동 스크롤한다. 드롭/취소 후 원래 펼침 상태를 복원한다. 일반 탭·세로 스크롤·즉시 가로 닫기 스와이프는 유지하고, 드래그 중 가로 닫기와 놓은 뒤 합성 클릭은 차단한다. 데스크톱 마우스도 길게 누르기로 지원하며 접근성/키보드용 기존 위·아래 이동 메뉴를 유지한다.
- `sidebar.js`에서 폴링 갱신 중 DOM을 교체하지 않고 최신 상태를 보류한다. 연결 끊김/비활성화·프로젝트 ID 목록 변경·닫기/Escape·멀티터치·touchcancel·크기 변경/blur/백그라운드 전환 시 저장 없이 취소한다. 안내 문구를 순번으로 교체할 때 높이를 유지해 목록 위치가 튀지 않게 한다. `app.js`는 기존 프로젝트 관리 컨트롤러/중복 잠금/세대 검사를 공유하고 저장 성공의 ID 배열만 적용한다. 실패 시 이전 순서와 오류를 유지한다.
- 브리지 `/v1/project/manage`에 `move_to`/0부터 시작하는 정수 `position`, 기능 `project_drag_ordering`을 추가했다. 한 번의 요청·메타데이터 저장으로 임의 위치에 삽입 이동한다. bool/소수/문자열/범위 밖 입력을 400으로 거절하고 저장 실패 시 메모리 순서도 롤백한다. 기존 `project_ordering`/인접 이동은 유지한다. 새 기능 없는 브리지에는 드래그를 활성화하지 않는다. 예제 Java도 별도 메모리 목록에서 같은 위치 이동을 제공한다. 안내 1키×10언어 추가로 **655키×10언어**다. `docs/interface.md`, `docs/architecture.md` 갱신.
- 검증: 프로젝트 관리 HTTP/영속화 **9검사**(여러 칸 이동, 잘못된 위치, 단일 저장, 실패 롤백, 재로딩, 실제 프로세스/선택 유지) 통과. 컨트롤러의 위치 전송·기능/오프라인 가드·실패·중복 요청·늦은 응답 검사, 예제 **2검사/103개 동작 단언**, 예제 UI 계약, 655키×10언어·언어/초안, JS/Python 구문·diff 검사 통과.
- `scripts/tests/test_sidebar_drag.cjs`의 실제 Chromium 터치/CDP로 길게 누르기/놓기·홀드 중 폴링·움직이지 않고 놓기·합성 클릭 방지·일반 세로 스크롤·가장자리 자동 스크롤·취소/Escape/닫기/오프라인/멀티터치·구형 브리지·데스크톱 마우스·드래그 중 가로 이동/일반 가로 닫기·10언어 320px 넘침 없음 검증. 화면 `dist/screenshots/project-drag-{393-en,320-en,320-ko}.png`를 생성하며 영/한 드래그 표시를 시각 확인했다. 로그 `.tools/project-drag-{ui,bridge,demo,library}.log`.
- `node scripts/smoke_library.cjs` 전체 통과: 실제 격리 브리지의 터치 드롭 1회 요청·저장/실패 복원/재시도, 활성 대화·초안·프로세스 3개 유지, 기존 순서 메뉴·영속화·구형 기능·프로젝트 관리·워크트리·세션/승인·알림 탐색 회귀를 확인했다.
- **소스 구현이며 APK/AAB 빌드·버전 변경·설치/배포·운영 브리지 교체/재시작 없음.** 실제 사용에는 새 앱·`project_drag_ordering`을 제공하는 브리지 적용이 필요하다. 실기기 Android WebView의 롱 프레스·스크롤/뒤로가기·TalkBack 검증은 남아 있다. 기존 세션 가져오기·준비 화면·GitHub 수정도 유지한다.

## GitHub 실제 단계별 진행률과 실행 중 버튼 잠금 (2026-10-19, 미배포)

- 사용자가 진행도를 알 수 있어야 하고 그동안 같은 버튼을 누르지 못해야 한다고 요청했다. 요청 전송·클론·프로젝트 등록 동안 버튼의 문구·disabled·aria-busy를 현재 단계로 표시한다. 단계 상태를 바탕으로 값 없는 진행 막대를 보여주고, Git이 보고한 수치가 오면 **현재 Git 단계의 퍼센트**로 표시한다. 창을 다시 열어도 진행 중인 작업을 우선 찾아 진행률과 잠금을 유지한다. 응답 여부 불명에 대한 기존 동일 요청 ID 확인/재시도는 유지해 새 클론을 중복 생성하지 않는다.
- 브리지는 `git clone --progress`의 stderr를 select/제한 시간 30분으로 소비하며 고정된 객체 확인·압축·수신·변경 내용 복원·파일 준비 형식의 단계/0~100 정수만 추출한다. CR/LF·분할 수신을 처리하고 16KiB 읽기/4KiB 미완성 행 제한을 둔다. 원문·URL·인증 정보는 UI/일반 로그/메타데이터로 보내지 않는다. `progress`는 메모리 전용이며 종료/취소/재시작 뒤 복원하지 않는다. Git 단계의 100%만으로 성공/등록 완료를 추정하지 않는다. 이전 브리지의 수치 없는 작업은 단계/진행 중 표시로 제공한다.
- 진행 표시를 실행 버튼 아래에 함께 스크롤하고, 숫자가 뒤늦게 도착해도 표시 공간을 확보한다. 6키×10언어를 추가해 **654키×10언어**다. `docs/interface.md`, `docs/architecture.md`, GitHub Setup 안내를 갱신했다.
- 검증: GitHub HTTP/실제 로컬 Git **10검사** 통과. 분할/큰/민감 표식 stderr의 숫자만 추출·999% 거절·메타데이터 비저장, 42%·100%에서도 실행 유지와 미등록, 최종 등록/진행률 제거, 기존 실패·취소·재시작·인증·저장 실패를 확인했다. Setup 패키징 **4검사**, 자동 열기/예외·프로젝트 위치/요청 재시도, 654키×10언어·언어/초안, JS/Python 구문·diff 검사 통과. 실제 폰의 Git/gh로 공개 `octocat/Hello-World`를 별도 임시 상태에 클론해 **receiving** 진행률 수신·완료·등록·종료 뒤 progress 없음도 확인하고 임시 파일을 정리했다. 사용자 원본/프로젝트 등록은 변경하지 않았다.
- `node scripts/smoke_github.cjs` 전체 모바일 터치 검사도 통과했다. 전송 중 숫자 없는 막대·busy/disabled·중복 탭 차단, 실제 브리지의 42%를 10언어 320px에 표시·막대 가시성·넘침 없음, 창 닫기/다시 열기의 잠금/42% 복구, Git 100%에도 버튼 잠금, 취소 후 진행 표시 제거/해제, 기존 로그인·클론/등록·자동 열기·초안/프로세스·오류/구형 브리지 회귀를 포함한다. 로그 `.tools/github-progress-{bridge,setup,ui,ui-final}.log`. 초기 화면 확인에서 버튼만 스크롤하면 막대가 화면 아래에 남아 상태/막대 묶음을 스크롤하도록 보완한 뒤 최종 통과했다. 화면 `dist/screenshots/github-progress-320-{ko,en}.png`에서 비활성 버튼·42%·진행 막대를 시각 확인했다.
- **소스 구현·검증이며 APK/AAB 빌드·버전 변경·앱 설치/배포·운영 브리지 업데이트/재시작 없음.** 실제 사용에는 새 앱과 진행률 제공 브리지 적용이 필요하다. 브리지 버전은 이번에 바꾸지 않았으므로 후속 릴리스에서 누적 변경의 버전/번들을 함께 갱신한다. 실기기 Android WebView·TalkBack·키보드·백그라운드 생존 검증은 남아 있다. Setup 검사 끝의 `Bridge installed`는 격리 임시 HOME 출력이다.

## GitHub 클론 버튼의 무반응처럼 보이는 결과 표시 수정 (2026-10-19, 미배포)

- 사용자가 버튼에 반응이 없고 ‘클론 중 화면을 닫아도…’만 보인다고 구체화했다. 해당 문구는 상시 안내이며 접수 확인이 아니다. 저장소 목록이 긴 상태에서 기존 경로 충돌로 클론 요청을 거절하면 오류가 목록 위의 `github-status`에만 표시돼 버튼 근처에서는 결과가 안 보이는 문제를 재현했다. 새 회귀 검사는 수정 전 오류의 화면 내 표시 검증에 실패했다. 사용자 시도의 정확한 거절 이유까지 기존 경로 충돌이라고 확정하지는 않는다.
- `github-clone-status`를 실행 버튼 바로 아래에 두고 로그인 후의 오류·요청 처리·해당 요청의 실제 단계(클론/등록/완료/실패)를 표시한다. 요청 뒤 열린 창에서는 결과가 보이도록 스크롤한다. 저장소·상위 폴더·새 폴더명이 빠져 버튼이 비활성인 이유도 표시한다. 입력 변경 시 지난 시도의 표시를 지우고 요청 준비 중 예외도 UI 오류로 처리한다. 버튼의 busy/상태 설명을 제공하고 네이티브 출력으로 진행을 추측하지 않는다. 신규 4키×10언어, 총 **648키×10언어**다. 클론 전송·재시도·닫기·자동 열기의 기존 요청 ID/작업 유지 규칙과 기존 폴더 비덮어쓰기 규칙은 유지한다.
- 검증: `node scripts/smoke_github.cjs` 전체가 데스크톱 입력 검사와 **모바일 터치 에뮬레이션(`isMobile/hasTouch`, submit tap)** 모두 통과했다. 입력 누락 3종/전송 없음, 요청 중 표시·busy·중복 클릭 차단, 응답 유실의 같은 ID 재시도, 긴 목록 아래의 오류 가시성, 10언어 320px·가로 넘침 없음, 클론/등록/자동 열기·실패/취소·기존 세션/초안·폴더 기본값·구형 브리지/CLI 안내를 확인했다. 추가 상태 표시로 기존 구형 브리지 문구 조회가 2개 노드를 찾는 검사 오류가 있어 계정 상태 노드로 범위를 고친 뒤 전체 통과했다. 원래 무반응 회귀는 수정 전 실패·수정 후 통과다.
- GitHub 브리지 9검사, 자동 열기/늦은 응답/예외 단위 검사, 프로젝트 위치/요청 유실 검사, 648키×10언어·언어/초안, JS 구문·diff 검사를 통과했다. 로그 `.tools/github-feedback-{before,after,final,touch,bridge}.log`; `.tools/github-feedback-after.log`는 구형 브리지 문구의 검사 선택자 실패 기록이며 final/touch가 최종 통과다. 화면 `dist/screenshots/github-clone-feedback-320-{ko,en}.png`에서 실행 버튼 바로 아래의 오류를 시각 확인했다. 실제 Android WebView/IME·키보드·TalkBack은 후속이다.
- **소스 수정이며 APK/AAB 빌드·버전 변경·앱 설치·배포·운영 브리지 교체/재시작·사용자 저장소 클론/프로젝트 등록은 하지 않았다.** 현재 설치 앱에는 다음 빌드/설치 후 반영된다. 앞선 점검의 실제 공개 저장소 임시 클론과 이번 모의 gh/로컬 저장소 검증을 사용자 실패 요청의 성공으로 표현하지 않는다. 기존 Codex 가져오기·준비 탭 수정도 유지했다.

## GitHub 연결 후 클론·프로젝트 등록 제보 점검 (2026-10-19, 증상 확인 대기)

- 사용자가 GitHub 연결 후 클론·프로젝트 등록이 동작하지 않는다고 제보했다. 운영 `/v1/github` status의 Git/gh 설치·활성 계정·인증 상태는 정상이었고 저장된 4개 작업은 모두 complete였다. 각 작업의 대상 Git 폴더와 등록 프로젝트 ID가 실제로 존재하는 것도 읽기 전용으로 확인했다. 가장 최근 작업의 대상 폴더 수정은 점검 시 약 5.7시간 전이었다. 이 4건을 이번 실패 요청의 성공으로 해석하지 않는다.
- 현재 폰의 실제 gh 인증·Git으로 공개 테스트 저장소 `octocat/Hello-World`를 비공개 임시 폴더에 클론하고 별도 `Bridge` 상태에 등록하는 검사는 complete·등록 ID·Git 폴더·활성 세션 0개로 성공했다. 임시 폴더/등록 상태는 정리했고 운영 프로젝트·계정·Git 설정·세션은 변경하지 않았다. 토큰·CLI 출력 원문·사용자 저장소 내용은 로그에 남기지 않았다.
- `node scripts/smoke_github.cjs` 전체가 통과했다. 대역 로그인·목록·폴더 선택과 실제 로컬 Git 클론/등록·응답 유실의 동일 요청 재시도·프로젝트 자동 열기·실패/취소·기존 세션/초안·영어/한국어·320px·구형 브리지/CLI 누락 검증이다. 로그 `.tools/github-reported-baseline.log`. 설치된 앱은 package manager상 versionCode 39였고 APK의 `github.js`는 작업 소스와 동일했다. APK의 `app.js`·`index.html`은 HEAD와 동일하여 앞선 준비 화면 소스 수정은 아직 포함하지 않았다. 설치 앱의 화면 동작을 직접 확인했다는 의미는 아니다.
- 이번 문제는 아직 재현되지 않아 GitHub 기능 소스를 임의로 변경하지 않았다. 사용자에게 버튼 비활성/무반응, 클론 중 멈춤, 오류, 등록 후 열기 실패 중 어느 증상인지 질문했으며 답변이 필요하다. 실패 저장소·오류 문구/대상 경로 확인 후 해당 경로로 재현한다. **APK/AAB 빌드·운영 브리지 재시작·운영 프로젝트 추가/삭제 없음.** 앞선 세션 가져오기와 준비 탭 수정은 유지했다.

## 연결된 브리지의 준비 탭을 완료 상태로 표시 (2026-10-19, 미배포)

- 사용자가 브리지가 연결되어도 Termux 설치·연결 영역이 계속 활성화된다고 제보했다. 기존 `updateEnvironment`/`renderQuickSetup`은 Termux 설치 여부와 자동 설정의 과거 phase만 확인하고 실제 `online` 상태를 버튼·영역에 반영하지 않았다. 실제 인증된 health 성공 시 설치 1단계·자동 연결 2단계·수동 설치/코드 입력을 숨기고 **Termux 연결 완료** 카드로 대체했다. 해당 영역은 fieldset으로 비활성화하고 자동 연결/수동 코드 전송에도 상태 가드를 두었다. 연결 완료 카드의 작업/Termux 열기와 에이전트 준비는 사용할 수 있다. 연결이 확인되는 순간 숨겨질 컨트롤에 포커스가 있으면 완료 카드의 작업 버튼으로 옮긴다.
- 접속 실패·401·연결 정보 삭제 시 기존 설치·연결 경로를 즉시 다시 표시한다. 저장된 토큰이나 과거 `quickSetup.phase=connected`만으로 완료 판정을 하지 않으며 자동 연결 미지원 클라이언트의 수동 경로도 유지한다. Demo 연결은 실제 Termux 완료로 표시하지 않는다. 신규 2키를 10언어에 반영해 **644키×10언어**이며 320px의 완료 카드 버튼은 세로로 배치한다. `docs/interface.md`에 상태·동작 기준을 기록했다.
- 검증: `scripts/smoke_setup.cjs`의 실제 앱 asset/Native 대역에서 연결 완료·새로고침·이전 연동 오류 후 완료 유지, 설치/코드 입력의 숨김·비활성·중복 호출 차단, 작업/Termux 열기, offline/401/forget 복구와 자동 연결 미지원의 수동 복구를 통과했다. 기존 에이전트 13작업·12개 복사·안내·pause와 10언어 320px/가로 넘침 없음·언어 변경/기존 펼침 상태 유지도 통과했다. 화면 `dist/screenshots/setup-connected-320-{ko,en}.png`, 로그 `.tools/setup-connected-smoke.log`. 644키×10언어·언어/초안, Demo UI 계약, JS 구문·diff 검사 통과. `node scripts/smoke_ui.cjs` 전체도 통과해 실제 격리 브리지의 Chat/PTY·프로젝트/세션·재접속·초안/언어·대기열/Steer·승인/질문·Codex 가져오기·Claude/OpenCode·설정/IME 회귀를 확인했다. 로그 `.tools/setup-connected-ui-regression.log`. 저장된 연결이 다시 살아난 경우 초기 설정 없이 재접속하는 경로도 전용 검사에서 확인했다.
- **APK/AAB 빌드·버전 변경·앱 설치·배포·운영 브리지 교체/재시작 없음.** 소스 수정이며 다음 요청 빌드/설치 후 앱에서 반영된다. 실제 Android WebView·TalkBack·포커스/백그라운드 복귀 검증은 남아 있다. 앞선 Codex 가져오기 수정과 기존 사용자 변경을 유지했다.

## Codex 저장 세션 가져오기와 제목 조회 충돌 수정 (2026-10-19, 미적용)

- 사용자가 Codex 세션 폴더의 저장 기록을 가져오지 못하는 것 같다고 제보했다. 읽기 전용 점검 시 기본 `~/.codex/sessions`에 JSONL 60개가 있었고, 운영 브리지 0.16.0에서 프로젝트별 조회가 모두 HTTP 200이었다. Bibimer의 경로가 일치하는 기록 8개는 목록·`thread/read(includeTurns:false)` 조회가 모두 성공했다. 현재 목록은 선택한 프로젝트/워크트리의 cwd와 일치하는 비보관·비임시 기록만 보여준다. 홈 등 다른 cwd의 기록을 임의로 현재 프로젝트에 가져오도록 바꾸지 않았다. 정확한 프로젝트와 목록 누락/선택 후 실패/본문 미표시 중 어느 증상인지 사용자에게 질문했으며 아직 확인되지 않았다.
- 별도로 재현한 버그: Android는 제목 조회를 별도 executor에서 보내는데, 사이드바 제목의 `thread/read`가 `history_lock`을 점유하면 목록 `thread/list`와 가져오기 검증 `thread/read`가 즉시 HTTP 409 `error_history`로 실패했다. `Bridge.history_call`이 브리지/세션 잠금을 잡지 않은 채 조회 슬롯을 최대 5초 기다리도록 수정했다. 슬롯을 얻지 못하면 기존 오류로 반환하고 무한 대기·자동 재시도·자동 승인/모델 입력은 추가하지 않는다.
- 새 HTTP 동시성 검사 2개는 수정 전 실패·수정 후 통과했다. 제목 조회 중 목록 조회/원본 이어하기의 대기·성공, 같은 네이티브 ID·이전 대화 복원, 기존 세션 입력·health·승인 대기 보존을 확인했다. 가져오기 9검사, Python 문법·diff 검사 통과. 전체 브리지 최초 실행은 153개 중 152개 통과·Setup 검사 1개가 `build_apk.py`에서 `play_sdk`를 찾지 못해 실행 오류였다. 보조 모듈 경로를 포함한 `PYTHONPATH=scripts python -m unittest discover -s bridge/tests`로 전체 **153개 통과**했다. 로그 `.tools/import-{before-fix,after-fix,bridge-regression,bridge-regression-final}.log`. 마지막 `Bridge installed`는 Setup 검사의 임시 HOME 설치 출력이며 운영 설치가 아니다. APK 빌드는 하지 않았다.
- 현재 설치된 Codex 0.163.0으로도 기존 Bibimer 기록 하나를 비공개 임시 `CODEX_HOME`에 복사해 실제 `ChatSession` 원본 이어하기·ready·과거 항목 50개 복원과 종료를 확인했다. 사용자 원본 대신 복사본을 사용했고 모델 턴/인증 복사 없이 임시 파일을 정리했다. 대화 본문·토큰은 일반 로그/저장소에 기록하지 않았다.
- **소스 수정만 완료했다. 운영 브리지 파일 교체/재시작·APK/AAB 빌드·앱 설치·버전 변경 없음.** 최종 운영 조회는 0.16.0·11프로젝트·46세션 중 2개 실행 상태였다. 실행 중인 사용자 세션을 종료하지 않았다. 수정 적용에는 이후 브리지 업데이트/재시작이 필요하며, 제보한 실제 Android 화면과 같은 원인인지 확인은 남아 있다.

## 운영 브리지 0.16.0 업데이트·재시작 (2026-10-19)

- 사용자 승인으로 실행 중인 4개 세션을 각 세션 종료 API로 종료하고, 활성 세션 0개를 확인한 뒤 기존 0.15.0을 재시작했다. 이어진 최신 버전 적용 요청으로 저장소의 브리지·어댑터 4파일을 유지보수 `update` 경로로 설치해 **운영 브리지 0.16.0**의 새 인스턴스와 인증된 health 응답을 확인했다.
- 업데이트 전후 저장 메타데이터 전체·연결 토큰 일치, **11개 프로젝트·44개 세션** 유지, 활성 세션 0개, 설치한 4파일과 저장소 원본 바이트 일치를 확인했다. 첫 재시작의 비교에는 메모리 전용 `display_title`을 포함해 불일치가 발생했다. 해당 값은 의도적으로 저장하지 않는 필드임을 소스에서 확인했으며, 후속 업데이트는 실제 저장 메타데이터 전체를 비교해 보존을 검증했다.
- 세션을 자동 재개하거나 모델을 실행하지 않았다. 종료된 Chat은 앱의 세션 관리 → 이어가기로 다시 열 수 있으며 PTY 휘발 출력은 복원하지 않는다. APK/AAB 빌드·앱 설치는 하지 않았고, 앱 재연결·실제 대화 재개 확인은 남아 있다.

## 0.22.0(39) 브리지 유지보수 내부 테스트 게시 (2026-10-19)

- 사용자 재배포 요청으로 `5f082e4`의 앱 브리지 업데이트·재시작 기능을 **0.22.0/code39**, 내장 브리지 **0.16.0 유지**로 빌드·게시했다. 설정의 명시적 업데이트/재시작, 전체 프로젝트·보관함의 실행 세션 차단, 종료된 목록/이름/보관/네이티브 ID/토큰 보존과 세션 관리 이어가기 안내, **642키×10언어**를 포함한다. 아래 미배포 구현은 이번39에 포함됐다.
- Console **활성 / 내부 테스터에게 제공됨 / 2026-10-19 02:50 Asia/Seoul**, 출시명 `0.22.0 (39) - Bridge maintenance`. 새39만 포함·기존38제외, 기존테스터·EN/KO노트 유지. 오류0·기존 가독화 파일 경고1·지원기기 변화0. Console `/tracks/4701718894791581363/releases/10/details`, 증빙 `dist/play-0.22.0/{internal39-live.png,internal39-live-dom.txt}`. 프로덕션은 기존0.20.0(37)이며 이번에 승급/변경하지 않았다.
- AAB `dist/play/bibimer-0.22.0-39-release.aab`, SHA-256 `d3e054fdd97a76fce2a3808efe6e9405daad200ac7ec0cef51e94bee43ffcec7`. 기존 로컬 키·심사코드 사용, 새키/의존성/Doppler다운로드 없음. 전체AAPT2/Java/D8·bundletool/jarsigner·기존인증서,52assets 원본 일치, 유지보수 소스/4압축payload 원본·SHA256 일치, 비공개Receiver·유지보수DEX클래스·PlaySDK/tasks/고정의존성·설치기셸문법·심사digest 포함/비밀원문 미포함 검증. `.tools/aab-0.22.0-39-{mac.log,verification.json}`. 기존Java8/deprecated·AndroidX디버그정보안내만 있다.
- Mac에서 Python scripts **37개**, 신규 유지보수 **5개**, Setup **4개**, Node642키×10언어·언어/초안·업데이트·Demo/Review·위치/자동열기/순서 회귀,JS/Python구문·diff 검사 통과. 유지보수5개는 실제격리서버로 업데이트/재시작 후 같은원본대화 재개·보관/토큰/ID보존·실행세션차단/파일미변경·손상payload/불명잠금차단·설치본재시작·시작실패복구를 확인했다. TMPDIR은 기존Mac `/private/var` 실제경로로 통일했다. 로그 `.tools/release-0.22.0-{python,maintenance-native,setup}.log`.
- **검증 제한:** 전체 `test_maintenance.py`8개 실행은 상속된 기존 재시작 검사2메서드에서 실패했다(PTY종료 대기1, idle/legacy의Mac `/proc`·pidfd 소유권/legacy서버 시작2 subtest). 신규5개와 상속된 실행세션거절1개는 통과했다. Mac에는Linux `/proc`/pidfd가 없고 기존PTY종료경로도 실패했으므로 전체8개통과로 보고하지 않는다. Docker데몬/Podman머신이 없어Linux재검증을 추가하지 않았다. 코드/검사 단언을 우회하지 않았고 신규5개를 별도재실행해모두통과했다. 최초전체결과 `.tools/release-0.22.0-maintenance.log`. 앞선Termux8개통과기록과 이번Mac결과를구분한다.
- **이번에는APK파생·에뮬레이터/실제폰설치·실제RUN_COMMAND결과콜백을검증하지 않았다.** 실제권한/Termux콜백·백그라운드/앱복귀·Play업데이트와Claude/OpenCode원본재개는후속이다. 운영Termux/브리지/세션/인증을업데이트·재시작하지 않았고웹배포도없다. 사용자앱업데이트후버튼으로실행할때도실행세션을먼저명시적으로종료해야한다.


## 앱의 브리지 업데이트·재시작과 종료된 대화 유지 (2026-10-19, 미배포)

- 사용자가 Termux 수동 명령 대신 앱 버튼으로 브리지 버전 업·재시작을 요청하고, **실행 중인 세션이 없으면 기존 목록/기록을 유지해 다시 불러와 이어가기**로 범위를 구체화했다. 설정의 Termux 브리지 카드에 업데이트/재시작 버튼, 전체 프로젝트·보관함의 실행 세션 수, 진행/성공/실패 상태를 추가했다. 최신/더 최신 연결본은 업데이트만 비활성화한다. 실행/종료 중 세션은 강제 종료하지 않으며 응답을 마치고 대기하는 Chat 프로세스도 실행 세션이다. 종료와 목록 삭제를 구분하고 종료된 Chat은 기존 **세션 관리 → 이어가기** 및 원본 기록 가져오기를 사용한다. 원본/프로젝트·목록·이름·보관 상태·네이티브 ID·페어링 토큰을 보존하며 PTY 휘발 출력은 복원하지 않는다. 새8키와 기존 안내를10언어에 적용해 **642키×10언어**다.
- `BridgeMaintenance`는 고정 동작 `update`/`restart`만 받고 내장 `bridge-maintenance.py`를 Termux RUN_COMMAND stdin으로 전달한다. Downloads·설치 스크립트·재페어링·별도 네트워크 다운로드에 의존하지 않는다. 별도 권한 코드26·단일 메모리 대기 동작·Demo epoch/Activity 가드, 비공개 일회용 PendingIntent와 작업 ID/종료 코드/허용 상태 검증을 사용한다. WebView에는 고정 상태 코드만 전달하고 토큰·출력 원문·경로를 전달/저장/로그하지 않는다. 상태 조회는60초 후 미확인 작업을 실패로 표시하며 자동 재실행하지 않는다. 기존 자동 연결24·에이전트 인증25는 유지했다. 공식 계약: https://github.com/termux/termux-app/wiki/RUN_COMMAND-Intent . 권한과 `allow-external-apps`는 임의 변경하지 않는다.
- `bridge/maintain_bridge.py`는 전체 압축 payload의 SHA-256/문법을 먼저 검사하고 중복 유지보수 flock·인증된 health·기존 종료 API·상태 잠금으로 실제 실행 상태를 재검사한다. 실행 중이면 파일도 변경하지 않으며 새 서버는 페어링 없는 `serve`로 시작해 새 instance/version을 확인한다. 업데이트는 앱의 브리지/어댑터4파일, 재시작은 기존 설치본을 사용하고 더 최신 운영본으로의 다운그레이드는 거절한다. 새 자식의 종료로 시작 실패가 확인되면 이전 파일을 복구하고 이전 설치본을 다시 시작한다. 상태 불명인데 잠금이 잡혀 있으면 거절한다. 연결 끊김의 오래된 실행 상태만으로 버튼을 막지 않고 Termux에서 검증한다. 유지보수 프로세스 자체의 Android 강제 종료·시작 응답 타임아웃의 완전 자동 복구는 보장하지 않는다.
- 검증: 실제 격리 서버의 유지보수/기존 재시작 **8검사**, 모의 Codex의 저장된 대화를 업데이트·재시작 후 같은 네이티브 ID로 재개하고 원본 메시지 다시 표시, 세션 이름/보관/토큰 유지, 실행 세션 차단·파일 미변경, 손상 payload·알 수 없는 잠금 차단, 이전 설치본 재시작/시작 실패 복구를 통과했다. Python scripts **37검사**에 새 JVM 권한 재생/거절·중복·Demo/소멸·고정 Intent·위조 결과·상태 허용 목록 검사가 포함돼 통과했다. Setup 브리지4검사, Setup UI 기존 회귀, 유지보수 UI의 명시적2작업/중복 차단/결과 재접속·버전/보관된 실행 세션 차단/10언어320px,642키×10언어/초안, 기존 업데이트 UI·Demo 계약을 확인했다. 전체 Android Java를 API36으로 컴파일했다(Play SDK/생성 상수는 기존 검사 대역, Java8/deprecated 경고). 내장4payload 원본·해시 일치/Intent 크기/문법과 diff 검사를 확인했다.
- **APK/AAB 빌드·앱 버전 변경·설치·배포·운영 브리지 업데이트/재시작 없음.** 현재 배포 앱0.21.0(38)에는 아직 버튼이 없으며 다음 요청 빌드/설치 후 반영된다. 운영 브리지는0.15.0을 유지하고 읽기 전용으로만 상태를 확인했다. 실제 Android 권한·RUN_COMMAND 결과 콜백·백그라운드 제약·앱 복귀와 Claude/OpenCode 실제 원본 기록 재개는 후속 실기기 검증이다. 재시작 버튼은 모델을 실행하거나 기록을 자동 재개하지 않는다. README의 공개/내부 배포 버전과 내장 브리지0.16.0은 유지한다.

## 0.21.0(38) 내부 테스트 게시 완료 (2026-10-19)

- 사용자 내부 테스트 배포 요청으로 `e2c0caa`의 누적 변경을 앱 **0.21.0 / versionCode 38**, 내장 브리지 **0.16.0 유지**로 빌드·게시했다. 에이전트별 Termux 설치·로그인/제공자 연결 작업, 명령 성공·실패/실패 코드, 응답 제어 버튼 외곽선과 대기열·방향 수정 도움말, **634키×10언어**를 포함한다. 기존 미배포 항목의 앱 변경은 이번 38에 포함됐다.
- Console **활성 / 내부 테스터에게 제공됨 / 2026-10-19 02:17 Asia/Seoul** 확인. 출시명 `0.21.0 (38) - Agent setup and response controls`, 새 38만 포함·기존 37 제외, 기존 테스터와 EN/KO 출시 노트 유지. 오류 0·기존 가독화 파일 경고 1, 지원 기기 변화 0. Console `/tracks/4701718894791581363/releases/9/details`; 증빙 `dist/play-0.21.0/{internal38-live.png,internal38-live-dom.txt}`.
- AAB `dist/play/bibimer-0.21.0-38-release.aab`, SHA-256 `a2fe1164c3b851f5644310f9f48fc42399d0e3265ec6d6ea0511ff92b64a37ea`. 기존 로컬 업로드 키·심사 코드 사용, 새 키/의존성/Doppler 다운로드 없음. 전체 AAPT2/Java/D8 컴파일·bundletool/jarsigner 검증, 기존 인증서 일치, 내장 51 assets 원본 일치, 브리지 payload 원본 일치, 새 네이티브 작업 클래스·Play SDK/tasks·고정 의존성 포함, 설치기 셸 문법·심사 digest 포함/비밀 원문 미포함 확인. 로그 `.tools/aab-0.21.0-38-mac.log`, 검증 `.tools/aab-0.21.0-38-verification.json`. 기존 Java8/deprecated·AndroidX 디버그 정보 안내만 있다.
- Python scripts **36개**, bridge Setup **4개**, Node **634키×10언어**, 언어/초안·Demo/Review·업데이트·작업 위치·프로젝트 위치/자동 열기/순서 회귀, 변경 JS 구문·diff 검사 통과. Mac 임시 경로 `/var`와 실제 `/private/var` 차이로 초기 JVM/셸 검사 2개가 실패해 TMPDIR을 실제 경로로 통일한 뒤 전체 36개를 다시 통과했다. 앱 동작 변경 없이 검사 환경만 맞췄다. Python 로그 `.tools/internal-release-{python,setup}.log`. 화면/도움말/Setup 동작 검증은 아래 구현 시 기록을 따른다.
- 함께 확인한 기존 **정식 0.20.0(37)은 Google Play에 제공됨 / 전체 출시 / 178개 국가·지역** 상태다(2026-10-16 13:10 게시). README EN/KO·listing.json의 공개 버전/10언어·기기 언어 기본값을 최신화했다. 이번 38을 프로덕션에 승급하거나 웹사이트를 배포하지 않았다.
- **검증 전용 APK 생성·에뮬레이터/실제 폰 설치는 이번에 하지 않았다.** Play 기기별 업데이트 표시/설치, 실제 Android 권한·Termux 전환·인증 완료/복귀·TalkBack/IME는 후속이다. 기존 참여 링크에서 Play 업데이트를 확인한다. 새 로그인 버튼의 실행 요청과 인증 성공은 구분하며 Gemini 구조화 Chat 연동은 추가하지 않았다. 운영 Termux·브리지·에이전트 인증·실행 세션을 변경/재시작하지 않았다.

## 대기열·방향 수정 상시 설명을 도움말로 이동 (2026-10-19, 미배포)

- 사용자가 상시 설명 필요성을 질문하고 첫 사용/도움말 안내 방안에 동의해, 입력창 아래의 일반 설명을 없애고 Chat 응답 상태 행에 **ⓘ 메시지 전송 안내** 버튼을 추가했다. 사용자가 눌러야 도움말이 열리며 자동 팝업·첫 사용 기록 저장은 추가하지 않았다. 문구는 **대기열: 현재 응답이 끝나면 전송 / 방향 수정: 진행 중인 작업에 추가 지시**로 정리했다. 방향 수정을 지원하지 않는 브리지/세션에는 대기열 설명만 제공한다. 구형 브리지의 대기열 미지원 업데이트 안내는 별도 `delivery-warning`으로 유지하며 짧은 화면에서도 숨기지 않는다.
- 자체 도움말 dialog는 접근성 이름·설명·펼침 상태를 제공하고 완료 버튼으로 포커스를 옮긴다. 완료·Escape·기존 Android Back 경로로 닫는다. 기존 입력창 방향 수정의 접근성 설명은 도움말 본문을 참조한다. 도움말 조회는 메시지·승인·대기열·작업 요청을 실행하지 않고 초안/현재 턴을 유지한다. 제목1키와 기존 설명2키를10언어에 적용해 **634키×10언어**다. `docs/interface.md`에 배치·문구·동작을 기록했다.
- 검증: `node scripts/smoke_commands.cjs`의 격리 브리지/모의 Codex에서 상시 본문 숨김·도움말 열기/완료/Escape/Android Back·포커스/aria-expanded·초안/현재 턴 ID 보존·세션 변경 요청0건을 확인했다. 10언어320×460에서 정확한 제목/본문·다이얼로그 영역·가로 넘침 없음·닫은 뒤 초안/본문 숨김 유지, Steer 기능 미지원 시 대기열 설명만 제공도 확인했다. 기존 명령 목록·선택/전송/구조화 skill·키보드/IME·대기열·PTY 회귀 통과. EN/KO 도움말 화면 `dist/screenshots/delivery-help-320-{en,ko}.png`와 상시 설명 없는 `queue-steer-small-ko.png` 시각 확인.
- 전체 `node scripts/smoke_ui.cjs` 통과: 구형 브리지 업데이트 안내가 작은 화면에 남는지/도움말 설명 일치, 실제 격리 Termux PTY·프로젝트/세션/초안·재접속·설정/모델·대기열/Steer·중단/재개·Enter/IME·가져오기·Claude/OpenCode 모의 Chat/승인/질문·언어 전환 회귀 포함. 634키×10언어/언어·초안, Demo 입력/언어 계약, JS구문/diff 검사도 통과했다. 운영 브리지·프로세스·인증을 건드리지 않고 모의 에이전트로 검증했다.
- **APK/AAB 빌드·버전 변경·앱 설치·배포 없음.** 다음 빌드·설치 후 앱에 반영된다. Android 실제 WebView·TalkBack·IME·시스템 Back 제스처 검증은 남아 있다.

## 응답 중단·방향 수정 버튼에 외곽선 추가 (2026-10-19, 미배포)

- 사용자 요청으로 응답 중단(`#interrupt-turn`)·입력창 방향 수정(`#steer`)·대기 메시지 방향 수정 버튼에 선택 메뉴와 같은 **1px #3a454e 테두리 / 8px 둥근 모서리 / 투명 배경**을 추가했다. CSS6줄만 변경하고 기존 글자색·크기·활성/비활성 조건·클릭 동작을 유지했다. 응답 중단은 붉은 글자, 비활성 버튼은 기존opacity0.4다. 제품 문서 `docs/interface.md`에 외곽선 기준을 기록했다.
- 검증: 실제 앱 asset과 Native 대역으로10언어×320×460/393×780의20개 화면을 미리보기했다. 가로 넘침0, 중단/방향 수정의1px실선, 비활성 테두리 유지/opacity0.4를 확인했다. KO393px·320px에서 중단·입력창/대기 메시지 방향 수정의 외곽선을 시각 확인했다. 증빙 `dist/response-outline-preview.json`, `dist/screenshots/response-outline-{320,393}-{ko,en}.png`(통제된 화면 상태). 기존 `node scripts/smoke_rendering.cjs`의 Markdown·명령 상태·10언어320px·스트리밍/스크롤·펼침·초안·모바일/데스크톱/사이드바 회귀와 diff 검사 통과. 단순 스타일 변경으로 새 단위 테스트는 추가하지 않았다.
- **APK/AAB 빌드·버전 변경·앱 설치·배포 없음.** 다음 빌드·설치 후 앱에 반영된다. 실제 명령·로그인·브리지·운영 세션에 영향 없으며 실기기 화면 확인은 남아 있다.

## 명령 실행 결과를 성공·실패와 실패 코드로 표시 (2026-10-19, 미배포)

- 사용자가 명령 상자의 **완료 / 종료0** 의미를 질문한 뒤 다른 표시와 명확한 성공·실패/실패 코드 구분을 요청했다. 명령의 구조화된 상태가 `completed`이고 정수 코드0이면 초록색 **성공**만 표시해 중복된 완료/0 배지를 없앴다. 원래0은 원본 이벤트에 보존하며 상태의 보조 설명(title)에는 **결과 코드0**으로 둔다.
- 명시적인 `failed` 상태 또는 `completed`+0이 아닌 정수 코드에는 빨간색 **실패 / 실패 코드127**처럼 코드 이름과 숫자를 함께 표시한다. 명시적인 실패가 코드0과 함께 오더라도 성공으로 바꾸지 않는다. 실패에 코드가 없으면 **실패 코드 미제공**으로 표시하고, 완료에 코드가 없으면 기존 완료 상태를 유지해 성공을 추정하지 않는다. 진행 중·중단·일반 도구 상태와 실제 에이전트 세션/프로세스 상태·완료 알림 이벤트는 바꾸지 않는다. 이 결과는 해당 명령 단위다.
- 성공·실패 코드·실패 코드 미제공3키를10언어에 추가해 **633키×10언어**다. 기존 `종료 {code}`는 **결과 코드 {code}**로 명확히 했다. 코드가 미제공된 긴 번역은 좁은 화면에서 줄바꿈한다. `docs/interface.md`에 판정·표시 기준을 기록했다.
- 검증:633키×10언어/언어·초안 회귀, `scripts/smoke_rendering.cjs`의 기존 Markdown/복사·줄바꿈/펼침/스트리밍/스크롤/빈 요약·계획/모바일·데스크톱/사이드바·입력 초안 검사를 통과했다. 같은 브라우저 검사에서 성공0·완료1·명시적 실패127/코드 없음/코드0·진행 중0·중단130·완료 코드 없음·일반 도구0의9경우를10언어320px에서 확인했다. 상태/코드 문구·성공/실패 클래스·원본 상태 보존·코드 배지 숨김/보존·가로넘침 없음·언어 변경 뒤 펼침 유지·프로세스 표시 불변을 검증했다. EN/KO 화면 `dist/screenshots/command-results-320-{en,ko}.png`, KO 표시 시각 확인. JS구문/diff 검사 통과.
- **APK/AAB 빌드·버전 변경·앱 설치·배포 없음.** 다음 빌드·설치 후 앱에 반영된다. 실제 명령·브리지·세션·인증은 변경하지 않았고 모델 호출 없이 구조화 이벤트 대역으로 검증했다.

## OpenCode를 제공자 연결 설정으로 구분 (2026-10-19, 미배포)

- 사용자 지적에 따라 OpenCode의 **Termux에서 로그인** 버튼을 **제공자 연결**로 수정했다. 사용할 제공자 선택 후 API 키 또는 해당 제공자가 지원하는 인증 방식을 설정하는 흐름으로 안내한다. 실행은 검증한 기존 `opencode auth login`을 유지한다. CLI의 하위 명령 이름과 제품에서 표시할 작업 의미를 구분한다. [공식 CLI](https://opencode.ai/docs/cli/#auth), [제공자 안내](https://opencode.ai/docs/providers/) 확인.
- 버튼·설명·실행 상태3키를10언어에 추가해 **630키×10언어**다. OpenCode의 실행 요청 표시는 제공자 설정/명령 결과를 Termux에서 확인하도록 별도 표시한다. 제공자 목록과 버전 확인에서도 연결 완료로 표시하지 않는다. 기존 OpenCode 설치 설명·공통 준비/복귀 문구와 한국어/영어 상세 문서·설정 안내도 계정 인증과 제공자 연결을 구분했다. 다른 에이전트의 로그인 버튼은 유지한다.
- 검증:630키×10언어/언어·초안 회귀, 기존 Setup UI13작업·상태 분리·권한/pause·12개 명령 원문 복사·320px10언어·동적 번역/명령/펼침 유지, JS구문/diff 검사 통과. 실제 명령·Android 권한/실행 경로는 바꾸지 않았고 새 단위 테스트나 APK 빌드는 추가하지 않았다. 실기기 제공자 설정과 모델 접근은 미검증이며 브리지·세션·제공자 자격 증명을 변경하지 않았다.
- **APK/AAB 빌드·버전 변경·앱 설치·배포 없음.** 다음 빌드·설치 후 앱에 반영된다.

## Codex·Gemini·OpenCode 로그인 실행 버튼 확대 (2026-10-19, 미배포)

- 사용자 요청으로 Setup → 에이전트 준비의 Codex·OpenCode·Gemini CLI에도 **Termux에서 로그인** 버튼을 추가했다. Codex는 설치된 `codex login`, OpenCode는 설치된 래퍼의 `opencode auth login`으로 실행한다. 두 CLI에는 버전 확인과 각각 `codex login status`/`opencode auth list` 버튼도 제공한다. OpenCode 목록은 **설정된 제공자 확인**으로 표시하며 인증/접속 성공 판정으로 쓰지 않는다. 기존 Claude5개와 신규8개, 총13개 작업이다.
- Gemini0.58.0에는 독립 `auth login`/상태 하위 명령이 없으므로 설치된 npm의 `bundle/gemini.js`를 Termux Node.js로 인수 없이 대화형 실행한다. 현재 폰의 `/usr/bin/env node` 진입 문제를 우회하고, 사용자에게 Google 로그인 선택·이미 인증된 경우 `/auth` 안내를 제공한다. CLI 도움말과 설치된 내장 `authCommand` 소스에서 `/auth`가 인증 선택 대화상자를 여는 것을 확인했다. `/auth`를 초기 프롬프트로 전송하거나 인증 정보·환경·로그아웃/계정을 임의 변경하지 않는다. 별도 Gemini 상태 버튼·Bibimer 구조화 Chat 연동은 추가하지 않았다.
- `TermuxClaudeActions`를 공통 `TermuxAgentActions`로 확장하고 `AgentSetup`이 에이전트/작업 조합13개만 허용한다. RUN_COMMAND 요청코드25·포그라운드 새 터미널·사용자 권한 허용·결과 콜백/로그 미수집을 유지한다. 대기 권한 요청은 에이전트·작업·언어·데모 epoch로 구분하고 다른 버튼이 교체하지 못하며, 재승인은 기존 브리지 설치 요청24를 실행하지 않는다. 같은 작업의 연속 탭은 막되 다른 확인/로그인 작업을 임의로 차단하지 않는다. 상태 문구도 에이전트별 영역에만 표시한다. 기존 브리지·세션·CLI 설치·인증은 변경하지 않았다.
- 공통 로그인/상태/버전/안내/전송 문구5키를 Claude 전용에서 공통 이름으로 옮기고 제공자 목록·Gemini 인증 안내2키를 추가해 **627키×10언어**다. 기존 수동 복사12개와 Claude 독립 복구/어댑터 경로를 유지하고 한국어·영어 Termux 문서/설정 안내를 갱신했다. 공식 출처: [Codex 인증](https://learn.chatgpt.com/docs/auth), [Gemini 인증](https://geminicli.com/docs/get-started/authentication/), [OpenCode CLI](https://opencode.ai/docs/cli/). 현재 폰에서 Codex 로그인·OpenCode 인증·Gemini 도움말만 실행했으며 로그인 시작/모델 요청·자격 증명 파일 조회는 하지 않았다.
- 검증: 공통 JVM/셸5개 검사 통과(`scripts/tests/test_agent_actions.py`, 기존 Claude3개를 확장). 13개 작업의 포그라운드 Intent·고정 인수·권한 대기 중 에이전트 교체 차단·데모/Activity·중복·미지원 조합 차단, Codex/OpenCode 모의 CLI의 stdin/HOME/실패 코드, Gemini 공백 경로 npm root/Node 직접 실행·인수 없는 로그인·의존성/파일 누락·npm 실패 격리를 확인했다. 기존 Claude 내장 설치5개,627키×10언어/초안·언어, Demo/Review UI 회귀도 통과했다. Setup 브라우저 검사에서 명시적13작업·상태 영역 분리·권한 메시지·알 수 없는 메시지 차단·pause·12개 복사·자동 실행 없음·320px10언어·언어 변경 후 상태/명령/펼침 보존을 확인했다. `dist/screenshots/{agent-setup,claude-actions,opencode-actions,gemini-actions}-320-{en,ko}.png` 중 KO Codex/Gemini 버튼 줄바꿈을 시각 확인했다. 전체 Android Java는 API36으로 컴파일했다(Play SDK·생성 상수는 검사 대역, 기존 Java8/deprecated 경고). JS구문/diff 검사 통과.
- **APK/AAB 빌드·버전 변경·앱 설치·배포·운영 CLI 인증 실행 없음.** 다음 빌드/설치 후 적용한다. 네 CLI의 실제 권한 창·Termux 새 터미널 전환·사용자 브라우저 인증 완료/복귀는 아직 검증하지 않았다. 소스 검사 성공을 실제 로그인 성공으로 표시하지 않는다.

## Claude 설치·복구·인증을 앱에서 Termux로 실행 요청 (2026-10-19, 미배포)

- 사용자 요청으로 Setup → Claude Code · Termux에 **Termux에서 복구 / Termux에서 어댑터 준비 / Termux에서 로그인 / 로그인 상태 확인 / 버전 확인** 버튼을 추가했다. 같은 폰의 Termux `RUN_COMMAND`로 각각 새 포그라운드 터미널을 열며 임의 명령·기존 세션 입력을 받지 않는다. 복구/어댑터는 기존 내장 독립 asset을 전달해 Downloads/이미 설치된 브리지 스크립트에 의존하지 않는다. 로그인/상태/버전은 전용 런처 우선, 없으면 설치된 `claude`로 실행한다. 명령 종료 코드와 출력을 확인할 수 있도록 새 터미널은 Bash로 유지한다.
- Android 명령 실행 권한은 사용자가 허용한다. Claude 전용 요청 코드25와 메모리의 단일 대기 작업을 사용해 허용 뒤 **선택한 작업만** 실행한다. 기존 자동 연결/브리지 설치의 요청 코드24·상태·페어링·프로세스는 건드리지 않는다. 거절·Activity 소멸·데모 전환은 재실행을 취소하고, 데모 실행·잘못된 action·중복 탭을 차단한다. Termux 0.118 이상과 `allow-external-apps=true`가 필요하며 Android 화면 열기 제한 시 Termux 알림을 직접 열도록 안내한다. 공식 문서: https://github.com/termux/termux-app/wiki/RUN_COMMAND-Intent . 설정을 임의로 켜지 않는다.
- 결과 콜백·출력 파일·로그인 표준 입력 스크립트를 사용하지 않는다. 인증 출력은 Termux에만 두고 WebView에는 정해진 상태 코드만 전달한다. **요청 전송은 설치/로그인 성공을 뜻하지 않는다.** 브라우저 인증은 사용자가 직접 마무리하고 결과는 Termux에서 확인한다. 수동 명령 복사는 유지했다. 한국어/영어 상세 문서와7개 UI키×10언어(총625키)를 추가하고320px 버튼 줄바꿈을 조정했다.
- 검증: 새 JVM/셸3개 검사(실제 ClaudeSetup/TermuxClaudeActions + Android 대역)에서 허용 목록, 권한 허용/거절 뒤 단일 재실행, 데모 epoch·Activity 소멸·중복 클릭·누락/구형 Termux·asset/시작 실패·포그라운드 Intent의 결과 캡처 없음, 공백 포함 HOME·전용/일반 CLI 선택·대화형 stdin·실패 코드·설치기 exit 격리를 확인했다. 기존 독립 설치5개 검사와625키×10언어·언어/초안 회귀도 통과했다. Setup UI의 기존 연결 회귀와 명시적5작업·권한 메시지/알 수 없는 메시지 차단·일시정지 가드·자동 실행 없음·12개 원문 복사·320px10언어 검사를 통과했다. EN/KO 화면 `dist/screenshots/claude-actions-320-{en,ko}.png`. 전체 Android Java 소스를 API36으로 컴파일했다(Play SDK/생성 리소스 상수는 검사 대역, 기존 Java8/deprecated 경고). JS구문·diff 검사 통과.
- **APK/AAB 빌드·버전 변경·앱 설치·배포·운영 Termux 명령/인증 실행 없음.** 새 버튼은 다음 빌드/설치 후 적용된다. 실제 기기의 권한 요청·외부 앱 연동 거절·Termux 새 화면·브라우저 로그인/앱 복귀는 아직 검증하지 않았다. 자동 연결 완료 UI 정리는 앞선 논의대로 별도 미구현 상태다.

## 현재 폰의 일반 claude 명령 연결 복구 (2026-10-19)

- 사용자가 Termux의 `claude` 실행 시 `claude native binary not installed`를 확인했다. `$PREFIX/bin/claude`가 기존 npm2.1.263의 `../lib/node_modules/@anthropic-ai/claude-code/bin/claude.exe`를 가리키는 상태였다. 전용2.1.283 런처는 이미 실행되므로 일반 명령의 실행 경로 문제를 별도로 복구했다. 사용자 오류는 인증 단계 이전의 npm 런처 실패다.
- 실제 폰의 기존 심볼릭 링크를 같은 bin 폴더의 **`claude.npm-before-bibimer`**로 보존하고, `claude` 입구만 검증된 `~/.local/share/bibimer/claude-runtime/claude`에 모든 인수를 전달하는0700 셸 런처로 원자적으로 교체했다. npm 패키지 내용·전용 바이너리·SDK·로그인 정보를 다시 설치하거나 브리지/실행 세션을 재시작하지 않았다. 전용 런처를 직접 호출하므로 브리지의 CLI 탐색과 재귀하지 않는다.
- `claude --version`과 새 `bash --noprofile --norc` 셸 모두 **2.1.283 (Claude Code)**를 반환하고, `claude --help`와 실제 SDK의 새 일반 경로 제어 초기화/모델 목록5개 조회가 성공했다. `claude auth status`는 여전히 `loggedIn: false`/`authMethod: none`이다. 다음은 사용자가 Termux에서 **`claude auth login`**으로 브라우저 로그인을 완료한 뒤 실제 요청을 확인하는 것이다. 네이티브 바이너리 누락 오류 해결과 인증/모델 사용 성공은 구분한다.
- 이 연결 변경은 **현재 폰에 직접 적용한 복구**이며 배포 앱이나 일반 복구 설치기가 자동으로 전역 CLI를 교체하도록 변경한 것은 아니다. 향후 전역 npm 재설치가 `claude` 입구를 덮어쓸 수 있으므로 필요 시 전용 런처를 직접 사용한다. 되돌릴 때는 현재 래퍼를 제거하고 같은 폴더의 백업 링크를 원래 이름으로 복원한다(백업은 원래 고장 난 npm 진입점이다). APK/AAB 빌드·버전 변경·배포 없음.

## Claude 어댑터·복구 명령의 Downloads 의존성 제거 (2026-10-19, 미배포)

- 사용자가 복사 버튼의 `~/storage/downloads/bibimer-setup.sh: No such file or directory`를 보고했다. 이는 Claude 실행/인증 전의 설치 파일 부재 문제이며 앞서 재현한 OAuth 만료와 별개다. 파일 저장을 요구하던 명령 생성과 안내를 수정했다.
- `bridge/claude_setup.sh`를 공통 원본으로 SDK 전용 `claude-adapter-setup.sh`와 SDK+런타임 `claude-repair-setup.sh`를 생성해 APK asset에 넣는다. Native `ClaudeSetup`은 해당 asset을 크기 제한·구분자 검사·en/ko 언어 제한 후 인용된 here-document 명령으로 복사한다. 다운로드 파일·저장소 권한·설치된 브리지/복구 스크립트에 의존하지 않으며 사용자가 Termux에 붙여 넣어 실행한다. RUN_COMMAND 권한을 추가로 요구하거나 버튼 선택만으로 설치하지 않는다. 두 asset은 WebView 허용 목록에 포함하지 않는다.
- SDK0.3.283 준비는 Node.js/npm이 없으면 설치한 뒤 Bibimer 전용 폴더에 진행한다. 복구는 필요한 Python과 무결성 정보를 포함한 복구 소스를 사용해 기존2.1.283 검증/원자적 런처 교체 절차를 실행한다. glibc·ripgrep 선행 조건과 사용자 로그인은 그대로 필요하다. 독립 명령은 브리지 파일·인증·프로젝트 메타데이터를 쓰거나 시작/재시작하지 않는다. 수동 전체 설치 파일의 선택적 Claude 작업도 같은 생성 함수를 사용해 중복 구현을 없앴다.
- 현재 폰에 독립 설치 파일 두 개를 `~/.local/share/bibimer/{claude-adapter-setup.sh,claude-repair-setup.sh}`로 준비했다(각0700,1000/4890바이트, 생성 asset과 원본 일치·bash 문법 확인). **설치 파일만 준비했으며 SDK/런타임 재설치·브리지/세션 재시작을 실행하지 않았다.** 지금은 `BIBIMER_LANGUAGE=ko bash ~/.local/share/bibimer/claude-repair-setup.sh`로 SDK+런타임을, 어댑터만 필요하면 같은 폴더의 `claude-adapter-setup.sh`를 선택할 수 있다. 일반 설치본에 이미 배포된 파일이라고 안내하지 않는다.
- 앱의 관련3개 안내를10언어에서 파일 내보내기 없는 흐름으로 바꿨다(618키 유지). 명령 준비 실패 Native 문구를10언어에 추가하고 한국어/영어 Termux 안내·설정/구조/개발 문서를 갱신했다. 기존 배포 앱의 버튼은 아직 이전 Downloads 명령이므로 새 앱 반영은 다음 명시적 APK 빌드/설치에 남아 있다.
- 검증: 실제 `ClaudeSetup` Java를 JVM에서 실행해 복사 명령을 만들고, Downloads·브리지가 없는 임시HOME/공백 경로에서 영어/한국어 SDK 준비, 내장 복구 코드 실행, 누락 의존성 준비, SDK 실패·손상 payload의 복구 차단을 확인했다. 실제 네트워크 설치는 대역이며 정상 토큰/로그인/모델을 사용하지 않았다. 새5개·언어2개·배포패키징10개·Play SDK6개·브리지Setup4개·복구3개, 합계30검사 통과. 618키×10언어·언어/초안, Setup UI의 두 Claude 복사 버튼/12개 명령/320px10언어 회귀, AAPT2 리소스 컴파일, bash/JS/diff 검사도 통과했다. 전체 Android 앱/실제 클립보드 붙여 넣기는 다음 빌드의 실기기 검증 대상이다.
- **APK/AAB 빌드·버전 변경·앱 설치·배포 없음.** 설치 asset 생성과 독립 파일 준비만 수행했다. 기존 초기 연결의 수동 파일 내보내기 경로는 유지한다.

## Claude 오류 재현·Termux 전용 대안 비교 (2026-10-19, 미배포)

- 사용자의 반복 오류 보고를 받아 현재 전역 CLI, Bibimer 전용 런타임과 실제 SDK를 확인했다. 전역 npm CLI2.1.263의 실행 실패와 별개로, 전용 glibc2.1.283은 버전 출력·SDK0.3.283 제어 초기화·모델 목록5개 조회가 성공한다. `auth status`는 `loggedIn: false`/`authMethod: none`이며, 도구·설정 소스·기록 저장을 끈 임시 작업 폴더의 제한 요청은 **`Failed to authenticate: OAuth session expired and could not be refreshed`**로 실패했다. SDK 초기화 성공이 실제 인증/응답 성공을 뜻하지 않는다.
- Termux 커뮤니티 대안으로 Aarstad/claude-code-termux-musl과 gtbuchanan/claude-code-termux를 조사했다. 전자는 공식 musl 빌드+실행 경로+DNS 프록시, 후자는 glibc 인터프리터·내장 도구 재실행·DNS 보완 런처다. Anthropic 공식 Android 지원으로 표현하지 않는다. Aarstad 소스 확인 커밋 `efd767cacdfdfccbfc94bc5b5628149f0d44a4d3`.
- 기존 설치와 분리한 `.tools/claude-diagnosis/musl-probe/`에서 공식 `@anthropic-ai/claude-code-linux-arm64-musl@2.1.283`의 npm SHA-512와 Alpine3.21 musl1.2.5-r11 APK의 고정 SHA-256 `721010e6bff908878d9c527428598661be59dde0d9f013f8431d01fd4dd16652`를 검증했다. 로더와 Claude의 예상 일반 파일만 추출하고, 기존 glibc patchelf0.18.0으로 ELF 인터프리터를 시험 폴더의 musl 로더로 지정했다. 버전2.1.283·SDK 초기화/모델 목록5개가 성공했지만 동일한 제한 요청은 같은 인증 만료로 실패(모델 입력/출력0토큰)했다. 비교 스크립트·출처·검증 JSON은 `.tools/claude-diagnosis/`에 있으며 저장소에 포함하지 않는다.
- **재현된 요청 실패에는 사용자 브라우저 재로그인이 필요하다.** 현재 전용 런처의 `auth login` 도움말을 확인하고, Setup의 단순 실행 복사를 명시적 `auth login`으로 바꾸며 `auth status` 복사를 추가했다. 로그인 안내1키를10언어에 추가해618키다. 한국어/영어 상세 문서에 실제 오류·재로그인·대안/검증 범위를 기록했다. 설치 재실행/브리지 재시작으로 인증이 갱신된다고 안내하지 않는다.
- 검증:618키×10언어/언어·초안 회귀, Setup UI 기존 회귀+12개 명령 원문 복사/9개 가이드/320px10언어·열림 유지, JS구문/diff 통과. Native는 브라우저 대역이다. 사용자에게 오류 위치/문구를 질문했으며 아직 응답을 받지 못했으므로, 앱에서 보았던 오류와 이번 인증 오류가 같은지는 확정하지 않는다.
- **기존 CLI·로그인·운영 브리지·실행 중 세션을 교체/종료하지 않았고 APK/AAB 빌드·설치·배포도 없다.** 커뮤니티 설치기 전체·DNS 프록시·실제 Bash/검색/모델 동작은 미검증이다. 사용자 재로그인 뒤 실제 실패 지점을 확인하고 대안을 기본으로 채택할지 결정한다. musl의 초기화 검증만으로 정상 대화 지원 완료라고 표시하지 않는다.

## Gemini CLI 설치 현황·Terminal 직접 실행 안내 추가 (2026-10-19, 미배포)

- 사용자 지적에 따라 이 폰의 공식 npm `@google/gemini-cli@0.58.0`도 확인했다. `gemini`는 전역 패키지의 `bundle/gemini.js`로 연결되고 Node.js20이상을 요구한다. 현재 검사 환경의 직접 실행은 `#!/usr/bin/env node` 경로로 실패했지만, `node "$(npm root -g)/@google/gemini-cli/bundle/gemini.js" --version`과 절대경로 Node 실행은 모두0.58.0을 반환했다. 패키지 레지스트리에서같은버전/진입파일/Node요구사항과공식설치·인증문서를대조했다. 설치파일수정/재설치·로그인·모델요청은하지않았다.
- Setup에 Gemini CLI의접힘안내와고정버전설치·Node직접버전확인/실행3개복사명령, Termux상세절차·공식문서링크를추가했다. 새2키를10언어에추가해617키다. 한국어/영어Termux문서에실제설치현황·실행경로문제·인증경로와검증범위를기록했다.
- **Gemini는현재Bibimer의에이전트선택/구조화Chat/가져오기/모델·권한선택/완료알림에연결되어있지않다.** 안내는일반Terminal에서직접실행하는경로이며,이번검증은버전출력에한정한다. 실제Terminal대화형시작·로그인·모델/도구사용·새환경설치는후속이다. Gemini전용세션과Chat어댑터구현은별도범위다.
- 검증:617키×10언어·언어/초안회귀,JS구문/diff,기존Setup UI회귀와4개접힘안내/11개원문복사/9개가이드라우팅/설치자동실행없음/320px10언어넘침없음·명령/펼침유지통과. Native는브라우저대역이다. **APK/AAB빌드·설치·배포·운영브리지/세션재시작없음.** 앞서논의한연결완료상태의설치·연동UI정리는아직구현하지않았다.

## 현재 폰 기준 Termux 에이전트 설치 안내 (2026-10-19, 미배포)

- 사용자 요청에 따라 현재 폰의 설치 패키지·실행 경로·`--version`을 확인해 Codex·Claude Code·OpenCode 안내를 구체화했다. Codex는 커뮤니티 `@mmmbuto/codex-cli-termux@0.160.0-termux.3`(출력0.160.0, Android10+/arm64), Claude는 전역2.1.263이 실행 실패하여 기존 Bibimer 전용2.1.283 런처와 Agent SDK0.3.283을 사용, OpenCode는1.17.13의 glibc/proot/Bun 래퍼 구성이다. 버전/도움말만 실행했고 인증 파일·대화 기록을 읽거나 로그인·모델 요청·재설치를 하지 않았다.
- Setup의 에이전트 준비에 접고 펼치는 에이전트별 Termux 안내와8개 명령 복사(설치/버전 확인/로그인), 기존 Claude 런타임·어댑터 복사 버튼, 상세 절차·제품 문서·커뮤니티 소스를 제공한다. 명령은 기존 Native `copyText`로 표시 원문만 복사한다. Claude 런타임 설치 명령이 SDK 준비도 포함함을 반영했다. 안내7키를10언어에 추가해615키이며, 펼침 상태와 명령은 언어 변경 시 유지한다.
- 한국어 `docs/termux-agents.md`와 영어판을 추가하고 README EN/KO·설정문서·웹사이트10언어사용법에 연결했다. 앱 상세 링크는 한국어 선택 시한국어, 나머지는영어문서다. 웹사이트의비영어/한국어언어는상세문서가영어임을링크에명시한다. 공식제품일반설치와커뮤니티Termux경로를구분하며동일폰브라우저인증·앱재연결을안내한다.
- OpenCode 설치 스크립트는 현재 설치 파일과 원격 고정커밋 `a2ac938e4f746c0bd052adc2c7e40e8d18359032`의 바이트 일치·SHA256 `a7fe7e92ca90c9065a5b0a7094d617927fb14aa8fe6f830f8414ab9e5dadbf95`를 확인했다. glibc·OpenClaw Android의준비표시가선행해야하며빈Termux의전체설치가아니다. 스크립트가받는Bun/OpenCode버전은고정되지않으므로신규설치가현재1.17.13과같다고보장하지않는다. glibc초기준비·새기기전체설치/인증·실제모델응답은추가검증대상이다.
- 검증:615키×10언어/언어설정·초안회귀, `smoke_setup.cjs`의기존자동연결회귀+에이전트안내/8개원문복사/7개가이드라우팅/설치미실행/320px10언어가로넘침없음·명령/펼침유지, 웹사이트Python2검사·Node언어선택회귀,JS구문/diff검사통과. Setup브리지4검사도 `PYTHONPATH="$PWD/scripts" python3 -m unittest discover -s bridge/tests -p test_setup.py -v`로통과했다(기본호출은원격에서추가된play_sdk의모듈경로누락으로1개실패하여경로설정후재실행). 화면 `dist/screenshots/agent-setup-320-{en,ko}.png`. 브라우저Native는대역이며AndroidWebView/실제클립보드/브라우저이동검증은후속이다.
- **APK/AAB빌드·버전변경·설치·Play/웹배포·운영브리지/에이전트재시작없음.** 앱설치본반영은다음명시적빌드,웹사이트링크반영은다음배포에남아있다. 상세문서링크를제공하도록소스만갱신했으며전용자동설치기를새로만들거나현재폰환경을변경하지않았다.

## 언어별 단어·어절 줄바꿈 적용 (2026-10-18)

- 사용자 요청에 따라 공통 `assets/typography.css`를33개HTML에 연결했다. 띄어쓰기 언어(한국어·영어·스페인어·브라질 포르투갈어·인도네시아어·프랑스어·독일어)는 단어/어절 중간 임의 분리와 자동 하이픈을 없애고, 중국어 간체/번체·일본어는 정상 글자 단위 줄바꿈과 엄격한 문장부호 금칙을 적용한다. 명령어/경로/code/pre·메일·지원URL만 긴 문자열 줄바꿈 예외를 둔다.
- 홈/정책/심사안내의 inline overflow-wrap:anywhere와 자동hyphens, guide/hero/language CSS의 일반 본문 강제 분리를 제거했다. 긴 PT/ID/FR/DE 제목은 기존2열 구성에서 글이 놓인 열의 너비에 비례하는 cqw 크기로 표시한다.320px독일어 정책 제목·갤러리 캡션과스페인어3번탭 공간을 보완했다. 문구나이미지·SEO·앱은 변경하지 않았다.
- Chromium에서 실제 DOM Range의 단어별 줄 경계를 읽어320/393px×30페이지(60),768/1400px×10개홈(20)의 최종80상태에 단어 중간 분리·텍스트/페이지 넘침이 없음을 확인했다.320px의10언어슬라이더2개추가화면20개도 통과했다. 기존Python웹사이트2검사·Node언어선택회귀·git diff --check 통과. 자동 측정에서 초기문제를 찾아 글자크기/탭배치를 수정한 뒤 최종검증했다. 브라우저가 구버전CSS를캐시한 첫결과는 폐기하고 테스트탭에서 일시적으로캐시를끄고재측정했으며 종료전 복구했다.
- 시각판정96pass, 증빙 `dist/word-wrap/{final-report.json,slider-desktop-report.json,ko-gallery-mobile.png,de-desktop.png,en-mobile.png}`, `.omx/state/word-wrap/ralph-progress.json`. final-report80개는최종CSS검사이고slider-desktop-report의20개panel항목이추가슬라이더검사다.
- Cloudflare Pages **https://7c975360.bibimer.pages.dev** 배포 완료.33HTML+4CSS 총37개 공개리소스HTTP200·원본일치·no-transform 유지 및공개한국어의keep-all/normal/none을확인했다. `dist/word-wrap/{public-verification.json,published-ko.png}`. 새의존성/JavaScript/앱빌드 없음. 다른브라우저엔진의 실제렌더링은 이번에검증하지 않았다.

## 갤러리 제작 안내 문구 삭제 (2026-10-18)

사용자 요청으로10개 언어 홈의 스크린샷 갤러리에서 예시 프로젝트·대화와 개인 세션 기록 미사용을 설명하던 문단을 삭제했다. 제목과4개 이미지·캡션, SEO메타/푸터 링크는 유지했다. 새코드·의존성·스타일 추가 없이 문단만 제거했다.

기존Python웹사이트2검사,Node언어선택회귀,git diff --check 통과. CUA데스크톱/320px한국어에서 간격과4개 이미지·가로넘침 없음을 확인했고 시각판정98pass다. Cloudflare Pages **https://8e3cb015.bibimer.pages.dev** 배포 후10개 공개홈HTTP200·원본일치·설명문단없음·4개스크린샷유지를 검증했다. 증빙 `dist/gallery-copy/{published.png,public-verification.json}`, `.omx/state/gallery-copy/ralph-progress.json`. 앱/Play변경·빌드 없음.

## 푸터 회사 링크·다국어 SEO 보완 (2026-10-18)

- 10개 언어 홈과 기존 EN/KO 심사 안내 푸터의 회사명을 `https://andineering.com` 링크로 바꿨다. 기존 색·밑줄·키보드 포커스 스타일을 재사용했으며 새 의존성이나 화면 구성은 추가하지 않았다.
- 기존30개 공개 페이지(10언어×홈/사용법/정책)의 번역된 title/description, 자기 canonical, 상호11개 hreflang(10언어+x-default), lang/H1을 확인했다. 빠져 있던30-URL sitemap.xml과 robots.txt의 Sitemap 선언, 언어별 Open Graph/Twitter 제목·설명·정규URL·locale·공유 이미지 메타를 추가했다. 공유 이미지는 기존 EN/KO 소개 그래픽을 그대로 사용한다. 검색용 대체언어 선언은 기존 HTML hreflang을 유지하고 사이트맵에는 URL만 넣었다.
- 심사 안내의 기존 noindex/nofollow를 유지해 사이트맵에서 제외했고404에도noindex를 추가했다. robots.txt로 해당 경로의 크롤링을 막지는 않아 메타 지시를 읽을 수 있다.
- `python3 scripts/tests/test_website_locales.py` 2개 검사(30페이지 경로/SEO/사이트맵/제외 경로 포함), `node scripts/tests/test_website_language.cjs`, git diff --check 통과. CUA에서320px10언어 푸터의 링크·언어·가로넘침 없음과KO데스크톱/모바일 키보드 이동을 확인했다. 시각판정98pass `.omx/state/footer-seo/ralph-progress.json`.
- Cloudflare Pages **https://d56a894e.bibimer.pages.dev** 배포 완료. 공개30HTML+sitemap/robots/공유이미지2개, 총34리소스 HTTP200·원본바이트일치·보안헤더 유지, 없는 경로404/noindex, 회사 링크 목적지HTTP200 확인. 증빙 `dist/footer-seo/public-verification.json`, `published-footer.png`.
- Google Search Console 등록·사이트맵 직접 제출·실제 색인/검색 순위는 이번 검증 범위가 아니다. robots.txt에서 사이트맵을 찾을 수 있도록 제공했으며 검색 반영 시점은 검색 엔진에 달려 있다. 앱/Play/Termux프로세스 변경이나빌드는 없다.

## 최신: 0.20.0(37) 정식 출시 심사 제출 (2026-10-16)

사용자가 내부 테스트 확인 후 정식 배포를 요청해, 검증된 **0.20.0(37)** 내부 테스트 번들을 그대로 프로덕션에 승급했다. 새 빌드·재업로드 없이37만 포함하고 기존33은 제외했다. 기존 전체178개 국가·지역,100% 출시이며 관리형 게시가 꺼져 있어 승인 후 자동 공개된다.

Console에서 **검토 중인 변경사항 / 일반 문제 사전 검사 진행 중**을 확인했다(12:02 Asia/Seoul). 제출3건은 프로덕션37과 영어·한국어 상세 설명이다. 설명의 기존 영어 우선/2개 언어 안내를10개 언어·시스템 언어 기본값/영어 폴백으로 수정했다. 정식 출시 노트는33→37 누적 변경을 담은 `release/google-play/release-notes/0.20.0-production.txt`다. 오류0·기존 가독화 파일 경고1, 지원 기기 변화0. 심사 접근 설정·스크린샷·가격·국가는 유지했다.

증빙 `dist/production-0.20.0/submitted.png`, `submitted-dom.txt`. **심사 승인·정식37 게시·실제 기기 업데이트 표시는 아직 확인하지 않았다.** 마지막으로 확인한 공개 버전은0.17.1(33)이다. 승인 후 Console/Play에서37 공개 여부를 확인하고 README·listing.json의 공개 버전과 언어 상태를 갱신한다. 실제 새 버전 감지는37을 Play로 설치한 뒤 이후 더 높은 버전이 게시될 때 검증한다.

## 최신: 0.20.0(37) 업데이트 감지 내부 테스트 게시 완료 (2026-10-15)

- 사용자 **내부 테스트 배포** 요청으로 main `35a2eb4`의 업데이트 감지 기능을 앱 **0.20.0/code37**, 브리지 **0.16.0 유지**로 빌드·게시했다. 자동/수동 확인, 선택 시 Google Play 페이지 이동, 나중에, 앱/브리지 버전 안내,608키×10언어와 기존 누적 기능을 포함한다. 아래 미배포 기록의 기능은37에 포함됐다.
- **활성 / 내부 테스터에게 제공됨 / 2026-10-15 20:03 Asia/Seoul**, 출시명 `0.20.0 (37) - Update availability`. 새37만 포함/36제외, EN/KO출시노트, 기존테스터유지. 오류0·기존 가독화 파일 경고1, 지원 기기 변화0. Console `/tracks/4701718894791581363/releases/8/details`; 증빙 `dist/play-0.20.0/internal37-live.png`. 프로덕션승급/제출·웹배포·운영Termux/세션 변경 없음.
- AAB `dist/play/bibimer-0.20.0-37-release.aab`, SHA-256 **926e8adb9eccc45744821c1cc1147d5c03002bf699c94dc1337c2881a38da776**. 기존 로컬 키·비공개 심사코드 사용, 새키/Doppler다운로드 없음. bundletool/jarsigner/AAPT2·전체Java/D8·기존 업로드 인증서·49assets 원본 일치·업데이트/PlaySDK/tasks DEX·고정SDK의존성/라이선스 원본·브리지0.16.0 원본·심사digest 포함/비밀원문 미포함 검증. `.tools/aab-0.20.0-37-mac.log`, `.tools/aab-0.20.0-37-verification.json`. 기존Java8/deprecated경고와 transitiveAndroidX디버그정보2곳제거안내만 있다.
- Python scripts25개(업데이트 상태JVM122단언·SDK패키징 검사 포함), Node608키×10언어·업데이트UI/언어/초안/프로젝트순서/위치/자동열기/현재위치·Demo/Review회귀 통과. 기능의 소스UI320px10언어·393/1400px 검증은 아래 구현기록을 따른다.
- AAB 파생 검증용 universal APK를 기존 에뮬레이터에 업데이트 설치했다. 기존한국어유지·Settings0.20.0/브리지0.16.0·사이드로드 상태/수동확인·버튼선택시실제GooglePlay앱열기·force-stop후한국어재실행을 확인했다. `dist/play-0.20.0/{settings,manual-check,restarted}.xml`, `android-settings.png`, `store-navigation.json`. Play는미로그인상태이며 계정별 실제업데이트응답/상세스토어목록/실제휴대폰Play설치는미검증이다. UIAutomator가처음빈WebView트리를주면준비된트리를다시조회했다. wm size override의물리입력좌표차이를피해검증중임시reset했고기존1080×1920으로복원후에뮬레이터종료했다.
- **이번37부터감지기능이있으므로이전36이37을앱내에서감지할수는없다.** 먼저기존내부테스트링크에서37을Play로설치해야한다. 이후더높은새버전이같은테스터에게제공될때실제감지/페이지이동/스토어업데이트표시를검증한다. 앱은사용자선택없이업데이트설치나Termux세션재시작을하지않는다. 자세한사항 `docs/app-updates.md`.
- README EN/KO·출시/개발문서·listing.json을 내부37/공개33 기록으로갱신했다. 새AndroidSDK전이의존성포함빌드는Console수락·설치실행까지검증했고원본프로젝트파일/키/기존휴대폰데이터는변경하지않았다.

## 최신: 앱 업데이트 감지·Google Play 페이지 안내 (2026-10-15, 미배포)

- 사용자 구현 승인 후 **사용자가 원하면 Google Play 페이지로 안내**라는 후속 요청에 맞춰 조회/링크 방식으로 구현했다. 앱 내부 다운로드·설치·재시작 API를 호출하지 않는다. 새버전 안내는 **Google Play에서 보기 / 나중에**, Settings에 설치 버전·수동 확인·확인 상태·스토어 이동을 제공한다. Play 앱이 없으면 고정 공식HTTPS페이지로 이동한다. 확인실패를 최신버전으로 표시하지 않는다.
- `AppUpdates.java`는 Play 설치 출처에서 공식 SDK의 계정별 제공 버전을 조회한다. 자동 확인은 Activity복귀에서 성공24시간/실패15분 간격, 수동은 간격 우회·중복 차단. 나중에는 같은버전24시간 숨김. 설치코드 변경 시캐시무효화, Activity종료·Demo전환 이전 늦은콜백무시. 예제모드는 실제Play요청/스토어이동/일반설정수정을 차단한다. 저장은 공개버전코드/시간/상태뿐이며 계정ID·인증·프로젝트·대화는 포함하지 않는다.
- 별도 Termux브리지 카드에서 연결버전과 포함설치파일버전을 수치비교한다. 낮으면Setup으로안내, 오프라인/미확인버전은확인불가. `bridge/bibimer_bridge.py`의VERSION을 빌드가 ReviewAccessConfig.BRIDGE_VERSION으로 생성해 하드코딩중복을 피했다. 운영브리지/실행세션 자동설치·종료·재시작 없음. 페이지이동에서RAM초안유지를 확인했지만 실제Play설치후초안복원을 새로보장하지 않는다.
- 공식GooglePlay `app-update:2.1.0` 및 POM전이의존성31개의 버전·SHA256을 고정하고 기존 AAPT2/javac/D8 빌더에연결했다. `scripts/play_sdk.py`, `play_sdk_dependencies.json`, `README-play-sdk.md`. manifest항목·라이브러리리소스/R·클래스패스·패키징라이선스/출처를 처리하고 예기치않은manifest변경은 거절한다. SDK는GoogleMaven에서만 가져오며 JAR/AAR/생성라이선스캐시는Git제외다. 새런타임권한/자격증명/키/Doppler설정 없음.
- 검증: Python scripts **25개**(업데이트JVM **122단언**, SDK잠금/manifest/resource/classpath/변조검사 포함), Node업데이트UI·608키×10언어·기존언어/초안/프로젝트순서/위치/자동열기/현재위치·Demo/Review회귀 통과. Android리소스·전체Java·DEX컴파일 성공 `.tools/app-updates-compile.log`(기존Java8/deprecated경고, 전이AndroidX디버그정보2곳제거안내). 조회에사용하지않는ActivityResult오버로드의타입을 추가하지 않았으며 실제고정JAR들에서factory/interface/query구현의JVM로딩·조회경로를 확인했다(ART/기기검증은아님).
- CUA실제앱UI+격리Native대역으로320px10개언어·393px한국어·1400px영어 배치,가로넘침없음,나중에/초안유지/수동확인/사용자명시선택시스토어콜백/브리지안내이동 확인. 브라우저콘솔오류없음. 증빙 `dist/app-updates/{banner-ko,settings-ko}.png`, `locale-layouts.json`; 시각판정95pass `.omx/state/app-updates/ralph-progress.json`. Native대역은외부스토어를실제로열지않는다.
- **APK/AAB 패키징·서명·설치·Play배포·버전변경 없음.** 현재내부0.19.1(36)에는미포함. 다음명시적빌드로37이상에기능을넣어Play로설치하고 이후더높은버전을같은테스터에게제공해실제Play응답/스토어업데이트표시를검증해야한다. 자세한동작·남은검증은 `docs/app-updates.md`를따른다. 컴파일의 unsigned.apk는DEX/서명없는리소스중간파일이며배포용APK가아니다.

## 최신: 0.19.1(36) 내부 테스트 게시 완료 (2026-10-15)

- 사용자 **내부 테스트 배포 다시** 요청으로 main `61c22bc`의 프로젝트 추가·다시 연결·GitHub 가져오기 아이콘을 앱 **0.19.1/code36**으로 빌드했다. 브리지는 **0.16.0 유지**. 아래 아이콘 기능의 미배포 기록은 이제36에 포함됐다.
- **활성 / 내부 테스터에게 제공됨 / 2026-10-15 19:30 Asia/Seoul**, 출시명 `0.19.1 (36) - Action icons`. 영어·한국어 출시 노트, 새36만 포함하고35제외, 기존 테스터 유지. 오류0·기존 비난독화 가독화 파일 경고1, 지원 기기 변화0. Console `/tracks/4701718894791581363/releases/7/details`, 증빙 `dist/play-0.19.1/internal36-live.png`. 프로덕션 승급·웹 배포·운영Termux/프로세스 변경 없음.
- AAB `dist/play/bibimer-0.19.1-36-release.aab`, SHA-256 **f70bd23ebf113457012f66caa99b1f2ca0caefdcfc53207ae57d0fd2c19ae60b**. 기존 로컬 업로드 키·심사 코드 사용, 새키/Doppler다운로드 없음. bundletool/jarsigner/AAPT2·전체Java/D8·기존 업로드 인증서·38assets 원본 일치·3개버튼아이콘/label span 포함·브리지0.16.0 원본 일치·심사digest/비밀원문 미포함 검증. 기존Java8/deprecated API경고만 있다. `.tools/aab-0.19.1-36-mac.log`, `.tools/aab-0.19.1-36-verification.json`.
- Python scripts18개(Review17단언·Demo101단언·프로젝트 위치 수명주기 포함), Node591키×10언어·언어설정/초안·Demo/Review·프로젝트순서·위치·자동열기·작업위치 회귀, JS구문/diff 통과. 아이콘 자체의10개언어320px·재연결/구형브리지/오프라인 검증은 바로 아래 구현 기록을 따른다. **이번36은 파생APK/에뮬레이터 설치/실기기 검증 없음**이며35의 설치증빙을36의검증으로 주장하지 않는다.
- README EN/KO·출시문서·listing.json의 내부 버전을36으로 갱신했다. 공개 버전 기록33은 유지한다. 기존 내부 테스트 링크에서 업데이트 가능하며 Console은 보통1시간 이내이나 더 걸릴 수 있다고 안내했다. Chrome 파일권한 변경 없이 macOS기본Open에서 검증AAB만 선택했다.

## 최신: 프로젝트 추가·재연결·GitHub 가져오기 버튼 아이콘 (2026-10-15, 미배포)

- 사이드바의 프로젝트 추가에 폴더/더하기, 다시 연결에 순환 화살표, GitHub에서 가져오기에 GitHub 아이콘을 문구 앞에 추가했다. 기존 색·버튼 크기/비활성 상태를 따르는 18px inline SVG이며 별도 애셋·의존성·번역 키를 추가하지 않았다. 아이콘은 `aria-hidden`/`focusable=false`로 장식 처리하고 기존 번역 문구를 버튼의 접근 가능한 이름으로 유지한다.
- 번역 속성을 버튼 내부 문구 span으로 옮기고 `renderProjects()`의 프로젝트 추가/구형 브리지의 프로젝트 변경 문구 갱신도 해당 span만 바꾼다. 언어 변경·목록 갱신·다시 연결 때 SVG가 지워지지 않는다.
- 검증: 실제 앱 assets와 브라우저 Native API 대역으로 320px의 10개 언어, 세 버튼의 아이콘/44px 조작 영역/가로 넘침 없음, 재연결 후 아이콘 유지, GitHub 창 열기·닫기, 구형 브리지 문구·오프라인 비활성 상태를 확인했다. EN/KO 화면 `dist/screenshots/sidebar-action-icons-{en,ko}-320.png`, 로그 `.tools/action-icons.log`. 591키×10언어·언어 설정/초안·Demo UI 회귀, JS 구문/diff 검사를 통과했다. **APK/AAB 빌드·버전 변경·Play 업로드·운영 브리지/프로세스 변경 없음.** 원격에서 게시된 내부0.19.0(35)에는 이번 아이콘 변경이 포함되지 않는다. Android 설치본 반영과 실기기 표시는 다음 명시적 빌드에 남아 있다.

## 최신: 0.19.0(35) 내부 테스트 게시 완료 (2026-10-15)

- 사용자 **내부 테스트 배포** 요청으로 main `ee27f85`의 누적 기능을 앱 **0.19.0/code35**, 브리지 **0.16.0**으로 빌드했다. 브랜치/워크트리 요약·상세 복사, 마지막 폴더 기억, 상위 폴더 첫 행, 등록 완료 후 작업 화면 열기, 프로젝트 순서 저장, 기존10개 언어591키를 포함한다. 아래 기능별 미배포 기록은 이 버전의 소스로 포함됐다.
- **게시 완료: 활성 / 내부 테스터에게 제공됨 / 2026-10-15 18:15 Asia/Seoul**, 출시명 `0.19.0 (35) - Project navigation`. 영어·한국어 출시 노트와35번들만 포함, 기존34는 제외. 지원 기기 변화0, 오류0·기존 비난독화 가독화 파일 경고1. Console `/tracks/4701718894791581363/releases/6/details`, 증빙 `dist/play-0.19.0/internal35-live.png`. 기존 테스터/참여 링크 유지. 프로덕션 승급/제출·웹사이트 배포 없음.
- 서명 AAB `dist/play/bibimer-0.19.0-35-release.aab`, SHA-256 **6807df2d3497709229329cfa43607ee623d4ed626242532d1726ec51d651f94b**. 로컬 기존 업로드 키·비공개 심사 코드 사용, 새 키·Doppler 다운로드 없음. bundletool/jarsigner/AAPT2·전체Java/D8·기존 Play 업로드 인증서·38assets 원본 일치, 내장 setup의 브리지0.16.0 압축 원본 일치와 project_ordering 포함, 심사digest 포함·코드/암호 원문 미포함 확인. 빌드 로그 `.tools/aab-0.19.0-35-mac.log`, 검증 `.tools/aab-0.19.0-35-verification.json`. 기존Java8/deprecated API 경고만 있다.
- Python scripts18개(프로젝트 위치 저장 수명주기·Review17단언·Demo101단언 포함), bridge library9·project management8·setup4=21개 통과. Mac 브리지 테스트는 `/private/tmp`와 초기화 없는 Bash wrapper로 사용자 셸 설정을 격리했다. Node591키×10언어·현재 위치/복사/갱신 경합·폴더 기본값/저장 실패·자동 열기 수명주기·프로젝트 순서/늦은 응답·Demo/Review/초안, 변경 JS 구문/diff 통과.
- 검증 전용 universal APK를 AAB에서 추출해 기존 에뮬레이터의34에 업데이트 설치했다. 첫 화면 실행·Settings0.19.0·기존수동한국어 유지, force-stop 후 재실행 한국어 유지 확인. `dist/play-0.19.0/{start,settings}.xml`, `android-settings.png`. 실제 Android휴대폰·운영Termux/에이전트·알림·GooglePlay설치는 이번에 검증하지 않았다. APK는 공개 배포 파일로 추가하지 않았다.
- **프로젝트 순서 변경은 Termux 브리지도0.16.0으로 업데이트해야 사용 가능**하다. 새 앱의 내장 설치 파일을 사용한다. 운영 브리지/실행중 사용자세션을 자동 업데이트·재시작하지 않았다. 앱 업데이트 표시까지 보통1시간 이내(더 걸릴 수 있음)라는 Console 안내를 따른다. 후속은 사용자 내부 설치 확인 후 같은35번들 프로덕션 승급과 공개 설명/언어별 스토어 갱신이다.
- Chrome 확장 파일 URL 접근 제한은 변경하지 않고 macOS Open의 해당AAB를 선택해 업로드했다. 새브라우저권한/계정/테스터동의 변경 없음. 출시문서·EN/KO README·listing.json에 내부35/공개33 상태를 갱신했다.


## 최신: 사이드바 프로젝트 순서 변경 (2026-10-15, 미배포)

- 프로젝트 이름 옆 **⋯ → 프로젝트 순서**에 **위로 이동 / 아래로 이동**과 현재 위치/전체 개수를 추가했다. 접힌 프로젝트에서도 메뉴를 열 수 있고 첫/마지막 위치의 해당 방향은 비활성화한다. 정렬 후 메뉴·사이드바를 유지하며 현재 프로젝트·선택 세션·워크트리·초안·대기 승인·에이전트 프로세스를 바꾸지 않는다. 5개 문구를 10개 언어에 추가해 총 **591키**다.
- 기존 `POST /v1/project/manage`에 `move_up`/`move_down`을 추가하고 `project_ordering` 기능 표시로 UI를 구분한다. 등록 ID를 기준으로 인접 위치를 교환하고 `project_order` ID 배열을 반환한다. 기존 `metadata.json`의 프로젝트 배열 순서를 저장/복원하므로 별도 설정 파일·스키마 변경·새 의존성이 없다. 새 등록/클론은 끝에 추가하고 이름 변경·등록 해제는 나머지 순서를 유지한다. 경계 이동은 성공/no-op, 저장 실패는 디스크·메모리의 기존 순서를 유지한다. 미인증/없는 프로젝트 요청은 거절한다.
- 앱은 브리지에서 확인된 순서를 적용하고 중복 요청·오프라인·작업 중 변경을 막으며 이전 연결의 늦은 성공/실패 응답은 무시한다. 구형 브리지는 순서 이동만 비활성화하고 업데이트 안내를 제공한다. 기존 이름 변경/등록 해제 기능은 별도 기능 표시를 유지한다. 심사용 예제도 같은 응답을 제공하되 예제 메모리 목록만 바꾼다.
- 검증: 실제 격리 브리지·모의 Codex·실제 Git 워크트리의 `smoke_library.cjs` 전체 통과. EN/KO 320×460 메뉴·첫/마지막 경계·위/아래 이동·새로고침/앱 reload 후 순서 유지·거절/재시도·구형 브리지 안내·현재 세션/초안/3개 실행 프로세스·기존 승인/보관/등록 해제 동작을 확인했다. 브리지 프로젝트 관리 **8개**, 라이브러리 **9개**, Python scripts **18개**(Demo **101개 단언** 포함) 통과. Node 순서 컨트롤러의 기능/오프라인 차단·중복 차단·실패 유지·늦은 성공/실패 응답, 591키×10언어·작업 위치·Demo 초안/UI·Review 회귀와 JS/Python 구문/diff 검사를 통과했다. 로그 `.tools/project-order-{ui,bridge,library,scripts}.log`, 화면 `dist/screenshots/project-settings-320-{en,ko}.png`.
- `smoke_library.cjs`의 예전 전체 경로 본문 가정 2곳을 현재 브랜치 요약의 `title` 끝 경로 확인/비동기 전환 대기로 고쳤다. 제품의 경로 표시는 바꾸지 않았다. **APK/AAB 빌드·버전 변경·Play 업로드·운영 브리지 업데이트/재시작 없음.** 이 기능은 새 앱 UI와 `project_ordering`을 제공하는 브리지 적용이 모두 필요하다. Android 실기기 조작/재실행 검증은 다음 명시적 빌드에 남아 있다.

## 최신: 폴더 목록의 상위 이동·등록 완료 후 프로젝트 열기 (2026-10-15, 미배포)

- 폴더 찾아보기의 상위 이동 버튼을 툴바에서 **폴더 목록 첫 행 `↰ ..`**으로 옮겼다. 실제 부모 경로를 사용하고 `/`처럼 부모가 없으면 숨긴다. 페이지 추가 시 중복 없이 첫 행을 유지하며 로딩·오프라인에는 비활성화한다. 홈·숨김 폴더·현재/목록 폴더 선택·취소·저장 위치 기억은 기존 동작을 유지한다. 기존 10개 언어의 상위 이동 문구를 재사용했다.
- 현재 GitHub 가져오기 창에서 요청한 클론은 **프로젝트 등록 완료(`complete` + `project_id`)를 확인한 뒤 해당 프로젝트를 열고 가져오기 창·사이드바를 닫으며 작업 화면으로 이동**한다. 같은 요청의 응답 유실 회복도 한 번만 연다. 이전 완료 기록 조회·실패·취소·등록 중에는 자동 전환하지 않는다. 창을 닫아도 클론을 취소하지 않으며 이후에는 기존 완료 프로젝트 열기 버튼을 사용한다. 열기 실패 시 창을 유지해 수동 재시도할 수 있다. 등록한 프로젝트를 열 뿐 기존 에이전트 프로세스·초안을 종료하거나 새 세션을 자동 시작하지 않는다.
- 일반 프로젝트 등록/생성 성공 시 기존 사이드바 닫기에 `Work` 화면 전환을 추가했다. 설정 화면에서 등록해도 완료 후 해당 프로젝트 작업 화면이 열린다. 새 의존성·브리지 API·Android 네이티브 변경은 없다.
- 검증: `smoke_github.cjs`에서 실제 격리 브리지·모의 gh·로컬 Git 클론으로 유실 응답 재시도→등록 완료→자동 열기·사이드바 닫힘, 이전 기록 조회 시 선택 유지, 기존 실행 세션/초안 보존, 기존 폴더 등록·Settings에서 새 폴더 생성 후 작업 화면 전환, EN/KO 320px를 확인했다. Android의 `/` 직접 열람 제한을 고려해 읽기 전용 루트 응답 fixture로 부모 행 숨김·선택 금지를 검사했다. `smoke_ui.cjs` 전체 회귀와 목록 첫 행/페이지 추가 중복 검사도 통과했다. 로그 `.tools/github-auto-open.log`, `.tools/ui-folder-navigation.log`.
- Node 자동 열기 수명주기(직접/폴링 완료·유실 회복·중복 방지·과거 기록·실패/취소·창 닫기·열기 실패·reset 후 늦은 응답), 마지막 폴더·작업 위치·586키×10언어·Demo/Review UI 회귀와 JS 구문/diff 검사를 통과했다. **APK/AAB 빌드·버전 변경·Play 업로드·운영 브리지 재시작 없음.** 현재 설치본 반영과 Android 실기기 검증은 다음 명시적 빌드에 남아 있다.

## 최신: 마지막 프로젝트 폴더 기억 (2026-10-15, 미배포)

- 사용자 요청으로 클론·프로젝트 열기의 마지막 위치를 Android 비공개 `project_locations` 설정에 저장한다. `/projects/app-a`를 열면 다음 **Project Add의 새 폴더 경로와 GitHub 클론 상위 폴더는 `/projects/`**, 폴더 탐색 시작 위치는 `/projects/app-a`다. 클론에서 선택한 상위 폴더도 두 흐름의 공통 생성 기준으로 사용한다. 프로젝트·세션 전환만으로 저장 위치를 바꾸지 않는다.
- 폴더 선택을 확정했을 때와 경로 직접 입력으로 프로젝트 등록/생성에 성공했을 때 실제 브리지 응답의 경로를 저장한다. 직접 입력한 클론 위치는 수락된 작업의 canonical 목적지에서 부모를 구한다. 응답 유실 재시도는 해당 pending 요청의 회복된 작업만 반영하며 오래된 작업 목록/늦은 응답은 덮어쓰지 않는다. 단순 탐색 이동·취소·잘못된 경로 요청은 저장된 선택을 유지한다. 진행 중 클론·불명확한 전송의 재시도 입력도 유지한다.
- `ProjectLocations.java`와 Native API의 환경 값/저장 메서드를 추가하고 `app.js`·`github.js`의 기존 폴더 UI에 연결했다. 별도 화면·새 문구·의존성·브리지 API 변경은 없다. 폴더 경로 두 개만 저장하며 코드/대화/자격 증명은 저장하지 않는다. 심사용 예제에서는 정상 저장 위치를 읽거나 쓰지 않고 화면 메모리에서만 유지한다. 저장 실패 시 이전 설정을 유지하며 누락/잘못된 값은 기존 기본 경로를 사용한다. 저장 위치가 사라진 경우 기존 탐색기의 홈 fallback을 사용한다. 직접 입력한 경로는 탐색 재개 위치보다 우선한다.
- 검증: 실제 격리 브리지/모의 gh와 `smoke_github.cjs`에서 Unicode 폴더 선택·클론/프로젝트 열기의 공유 기본값·reload 복원·취소·기존 폴더 등록·직접 새 폴더 생성·실행 중 세션/초안 보존·EN/KO 320px를 확인했다. `smoke_ui.cjs` 전체 회귀도 통과했다. Node의 기본 경로/루트/저장 실패/예제 격리·canonical 클론/유실 응답/늦은 응답 검사, Java SharedPreferences 대역의 재생성 복원·원자적 실패·잘못된 값/제어 문자·예제 격리, 작업 위치/586키×10언어/Review·Demo 회귀, Python scripts **18개**, AAPT2 리소스·전체 Android Java 소스 컴파일을 통과했다. 기존 Java8/deprecated 경고만 있다. 로그 `.tools/github-project-locations.log`, `.tools/tests-project-locations.log`, 전체 UI `.tools/ui-project-locations.log`.
- `smoke_ui.cjs`에 남아 있던 전체 경로의 화면 본문 가정을 새 브랜치/폴더명 표시와 맞춰 `title`의 실제 경로 검증으로 바꿨다. 제품의 브랜치/경로 표시는 변경하지 않았다. **APK/AAB 빌드·앱 버전 변경·Play 업로드·운영 브리지 적용 없음.** 현재 공개0.17.1(33)/내부0.18.0(34)에 아직 포함되지 않으며 Android 설치본의 실제 저장/강제 종료 후 복원은 다음 명시적 빌드에서 검증한다.

## 최신: 현재 세션의 브랜치·워크트리 위치 표시 (2026-10-15, 미배포)

- 사용자 승인한 배치대로 작업 화면 프로젝트 이름 아래 기존 경로 자리를 **브랜치**로 교체했다. 별도 워크트리는 `⑂ feature/login · 폴더명`, detached HEAD는 `HEAD · 짧은 커밋 ID`, 비 Git/조회 실패/구형 메타데이터는 폴더명만 표시한다. 현재 세션 → 새 세션 초안 경로 → 프로젝트 루트 순으로 실제 작업 위치를 선택하며 다른 경로의 브랜치를 대신 표시하지 않는다.
- 보조 줄은 상세 창을 여는 버튼이다. 전체 브랜치/HEAD와 작업 폴더 경로 확인·복사, Escape/Android 뒤로/닫기/바깥 클릭, 포커스 복귀를 기존 dialog·네이티브 copyText로 제공한다. 창을 연 경로를 고정해 세션이 바뀌어도 다른 경로를 복사하지 않는다. 문구 4개를 10개 언어에 추가(총586키).
- 사이드바의 프로젝트 → 워크트리 → 세션 계층은 유지하며 **단일 Git 워크트리에도 브랜치 제목**을 표시한다. 작업 화면과 같은 경로 포맷 함수를 사용하고 새 의존성·asset 파일 없이 기존 sidebar.js/app.js에 연결했다.
- 기존 `/v1/worktrees`를 작업 화면 갱신에서도 호출하며 같은 프로젝트 조회를 10초 간격으로 제한하고 진행 중 중복을 막는다. 실제 갱신 시점은 기존 이벤트/연결 폴링을 따른다. 상세 창 열기·사이드바 새로고침은 명시적 조회. 조회 실패 시 오래된 브랜치 제거, 브리지 교체/등록 해제/연결 초기화 시 이전 응답 무효화. 별도의 세션 실행·브랜치 전환·워크트리 생성/삭제는 없다.
- 브리지 worktrees 응답에 `head`/`detached`를 추가하고 저장소 하위 폴더로 등록한 프로젝트에도 실제 포함 워크트리의 ref를 표시한다. 기존 허용 경로와 기본 프로젝트 경로는 바꾸지 않았다. **일반 브랜치는 기존 브리지에서 동작하며 HEAD 상세/저장소 하위 폴더 보완은 새 브리지 적용이 필요**하다.
- 검증: Node 작업 위치·복사 대상·조회 제한/실패/재시작 경합 검사, 586키×10 언어 및 Demo/Review UI/초안 회귀, Python scripts17개(Review17단언·Demo95단언), bridge library9개·project management5개·setup4개, JS 구문/Python 컴파일/diff 검사 통과. Mac 기존 테스트의 `/var` 대 `/private/var` 경로 별칭과 사용자 Bash 초기화 영향을 확인해 library fixture 경로를 resolve했고 project management는 `/private/tmp`·`bash --noprofile --norc` 격리로 재검증했다. 제품 동작을 테스트에 맞춰 바꾸지 않았다.
- CUA에서 실제 앱 웹 UI + 격리된 합성 데이터로 320/393px 가로 넘침 없음, 긴 이름 말줄임, 단일/다중 워크트리, 세션별 초안 유지, 상세 전체 경로, Escape·포커스 복귀 확인. 증빙 `dist/workspace-location/`, 시각 판정95pass `.omx/state/workspace-location/ralph-progress.json`. **실제 Android/Termux 기기 테스트·APK/AAB 빌드·버전 변경·Play 업로드 없음.** 공개0.17.1(33)/내부0.18.0(34)에 아직 포함되지 않는다.

## 최신: 10개 언어·0.18.0 내부 테스트 (2026-10-15)

- 사용자 요청으로 일본어 `ja`, 대만·홍콩 공통 표준 중국어 번체 `zh-Hant`, 프랑스어 `fr`, 독일어 `de`를 앱과 웹사이트에 추가했다. 앱 **582개 UI 문구 × 10개 언어**, 네이티브 **21개 × 10개 언어**. 영어·한국어·pt-BR·es·id·zh-Hans와 함께 제공한다. 기존 카탈로그/선택기/리소스 구조를 재사용했고 의존성을 추가하지 않았다. 원어민 검수 완료로 주장하지 않는다.
- 시스템 언어 목록을 순서대로 확인하고 지원 언어가 하나도 없으면 영어를 사용한다. 기존에 직접 저장한 선택이 우선한다. `zh-TW/HK/MO` → `zh-Hant`, 명시된 Hans/Hant 문자는 지역보다 우선. 일본어·프랑스어·독일어 지역 변형도 기본 언어로 매칭한다. 웹사이트도 같은 원칙과 기존 자체 검색형 선택기를 사용한다.
- 앱 **0.18.0 / code34**, 내장 브리지 **0.15.0**. 기존 로컬 업로드 키와 비공개 심사 코드 파일로 `dist/play/bibimer-0.18.0-34-release.aab`를 서명했다. SHA-256 **155409cd26bd421498f2c0568cbce8840ebf85e78316c1a84eacb3246f4f4647**. 새 키·Doppler 다운로드 없음. bundletool/jarsigner/AAPT2/Java/D8·Play 업로드 인증서 일치·38개 assets 원본 일치·심사 digest 포함·비밀 원문 미포함을 검증했다. 기존 Java8/deprecated API 경고만 있다.
- **Play 내부 테스트 배포 완료**, 출시명 `0.18.0 (34) - Ten languages`, Console **내부 테스터에게 제공됨 / 10월15일 오전2:39 게시**. 영어·한국어 출시 노트, 기존 테스터 유지, 지원 기기 변화 없음, 오류 없음·비난독화 매핑 파일 경고1개. 증빙 `dist/localization-ten/internal34-live.png`. 정식 **0.17.1(33)은 유지**, 새 버전 프로덕션 승급/제출은 하지 않았다. 사용자 내부 테스트 설치 확인 후 같은34번들을 승급하면 된다.
- 앞서 제출한 EN/KO 스크린샷 변경은 Console의 **10월15일 게시 완료 / 미게시 변경 없음**으로 확인했다. 이번 작업에서 스토어 설명을 새 지원 언어로 바꾸거나 언어별 스토어 등록정보를 추가하지 않았다. 정식34출시와 함께 공개 설명의 영어첫실행/ENKO 문구 갱신 및 스토어 현지화가 후속이다.
- 출시 AAB로 만든 검증용 universal APK를 기존 Android36.1 에뮬레이터에 업데이트 설치했다. 기존 한국어 선택 유지, 일본어·번체·프랑스어·독일어 설정 화면과 선택기 스크롤, 독일어 프로세스 재시작 후 유지, 시스템 기본값 복귀→기기영어 적용을 실제 WebView에서 확인했다. 마지막에는 기존 한국어 선택을 복원했다. `dist/localization-ten/android-*.{png,xml}`. 실제 휴대폰·운영 Termux·에이전트/알림 전송은 이번에 검증하거나 변경하지 않았다.
- Node 카탈로그/보간/선택·시스템설정 UI·웹 언어 라우팅/키보드·심사접근/초안/데모 UI, Python 앱언어/릴리스/심사접근/데모/웹 경로 검사 통과. Android review17단언·demo95단언 포함. 웹 30페이지 lang/canonical/hreflang/동일종류언어이동/내부링크/정책구조 검증 완료. 새12페이지320px 가로넘침·이미지누락 없음; 일본어 제목과 FR/DE좁은제목 크기를 다듬었다. 시각판정95pass `.omx/state/localization-ten/ralph-progress.json`.

- 웹사이트 배포 **https://88feba4e.bibimer.pages.dev** / https://bibimer.app . 10개 언어 × 홈·정책·가이드 = **30페이지** 공개 원본 일치·HTTP200·CSP/no-transform·없는경로404 확인. language.js·hero.css 공개원본 일치. 공개 한국어 페이지에서 10개 옵션·키보드 끝항목이동·Escape/포커스복귀 확인. `dist/localization-ten/published-verification.json`, `website-published-picker.jpg`. Chrome의 일본어 자동번역이 원문을 한국어로 바꾸는 현상은 브라우저 설정으로, 로컬 원문 화면과 공개 원본 검증을 구분했다. 브라우저 전역 번역 설정은 변경하지 않았다.

## 최신: 웹사이트 소개·사용법·언어 선택과 Play 이미지 (2026-10-15)

- 사용자 요청으로 아이콘을 헤더 BIBIMER 앞에, GitHub을 헤더로 이동했다. Google Play 설치 버튼에는 공식 Play 페이지에서 가져온 컬러 prism SVG를 기존 버튼 스타일에 넣고, 옆에 **사용법 보기**를 배치했다. 6개 언어의 `guide/`에 Termux 준비→수동 연결→프로젝트/터미널→호환 에이전트 설정→세션/파일 관리를 제공한다.
- 큰 로고 대신 같은 Android 폰의 Bibimer→Termux→개발 도구/에이전트 구조, 구조화 이벤트의 모바일 표시, 대화 예시를 CSS radio 슬라이더로 설명한다. 자동 재생·새 의존성 없이 키보드 조작한다. 별도 갤러리는 서식 있는 대화·여러 프로젝트/세션·파일 탐색·코드 뷰어를 보여준다.
- 소개 화면은 **실제 앱 UI + 합성 예시 데이터**이며 개인 로그나 심사용 데모 모드를 사용하지 않았다. Chrome CUA에서 432×768 CSS/2.5 배율로 1080×1920 JPEG EN/KO 각4장을 캡처했다. 테스트 fixture의 애니메이션·자동화 포인터를 제외했으며 이미지 픽셀 편집이나 APK 빌드는 없다. `release/google-play/screenshots/examples/`와 웹 `assets/examples/`가 동일하다. 생성 fixture는 Git 제외 `.tools/product_screenshots_fixture.py`다.
- 웹 언어 메뉴는 자체 검색 드롭다운·현재 언어·키보드 탐색·Escape/바깥 클릭 닫기·포커스 복귀를 제공한다. 기본 홈/정책/가이드 URL은 저장된 명시적 선택→브라우저 언어→영어 fallback이며 명시 locale URL은 유지한다. 저장 불가 시 검증된 `?lang=`으로 영어 선택 루프를 방지한다. 중국어 번체를 간체로 자동 대체하지 않는다. 정책에 기기 내 언어 저장을 반영(시행일10월15일), CSP는 자체 JS만 허용한다.
- **Cloudflare Pages https://b9943f47.bibimer.pages.dev 배포 완료.** 공개18페이지 HTTP200·원본·CSP/no-transform, 잘못된 경로404, 공개8이미지/아이콘/스크립트 바이트 일치. 실제320/393px를 확인한 36개 페이지의 문서/드롭다운 경계, 검색/키보드/외부 클릭·슬라이더·가이드 이동 검증. Node 언어 동작/Python페이지 구조/구문/diff 검사 통과. 시각 판정96점 pass, `.omx/state/website-hero/ralph-progress.json`, `dist/website-hero/`.
- **Play Console EN/KO 휴대전화 스크린샷 변경 두 건 제출 완료.** 새4장씩으로 교체하고 채팅·프로젝트를 먼저 배치했다. 새8애셋의 AI 생성/수정 표시를 적용했다. 게시 개요의 ‘검토 중인 변경사항’과 자동 사전 검사 진행 중을 확인했다. 승인/공개 완료는 아직 아님. 새 AAB·앱 설명·트랙·가격·국가 변경은 없다. 현재 앱은0.17.1(33). 증빙 `dist/website-hero/play-screenshots-submitted.jpg`.
- Chrome 확장 파일 접근 권한 제한으로 chooser.setFiles가 막혔으나 macOS 기본 Open 창으로 필요한 JPG만 업로드했다. 확장 권한을 변경하지 않았다. 예전 실제 Android 캡처/README 화면은 유지한다.

## 최신: 앱 시스템 언어 기본값 (2026-10-15, 미배포)

- 사용자 명시 승인에 따라 기존 영어 고정 지침을 대체했다. `AppLanguage`는 저장값이 없으면 Android 언어 우선순위 중 지원 언어를 고르고 없으면 영어로 표시한다. 기존 명시적 영어 포함 수동 선택은 유지한다. `system` 설정과 여섯 언어를 분리해 저장하며 Settings에 **시스템 설정 따르기**를 제공한다. 전체582키×6언어.
- Activity가 locale/layoutDirection 변경을 처리하고 재개/기기 언어 변경에서 WebView를 다시 로드하지 않고 문구만 갱신한다. 입력 초안/세션을 보존하며 현재 지원 UI는 LTR 유지. 정책 URL·네이티브 메시지·설치 안내는 적용 언어를 사용한다. 심사 데모 설정 격리와 저장 실패 원복도 유지한다.
- Node582키/실제UI컨트롤러·Java언어2검사, Demo UI/Drafts/ReviewAccess 3회귀, JS구문·AAPT2리소스·전체AndroidJava컴파일 통과(기존Java8/deprecation경고). **APK/AAB 빌드·버전 변경 없음.** 실제 Android 설정 변경/백그라운드 복귀/알림 언어는 다음 명시적 빌드 뒤 기기 검증한다. 원어민 번역 검수도 남아 있다.

## 최신: Bibimer 이름 유래 소개 (2026-10-15)

- 사용자 설명을 바탕으로 Android 앱·Termux·코딩 에이전트를 함께 ‘비빈다’는 **비빔(bibim) + -er → Bibimer(비비머)** 유래를 웹사이트 6개 언어의 `#name-story`와 EN/KO README에 추가했다. 새 사실이나 음식 유래를 덧붙이지 않았으며 제품 자체를 코딩 에이전트로 표현하지 않는다. AGENTS.md에도 명명 의미를 기록했다.
- 기존 타이포그래피·색상으로 짧은 소개 섹션을 추가했다. 의존성·스크립트·앱 변경 없음. 한국어 humanizer 의미 보존 6항 점검, 기존 웹사이트 언어 구조 검사·diff 검사 통과. CUA에서 6개 언어 320/393px 가로 넘침·원문 요소 보존, 한국어 모바일·데스크톱을 확인했다. 시각 판정 97점 pass, `.omx/state/name-story/ralph-progress.json`, 증빙 `dist/name-story/`.
- Cloudflare Pages **https://5c279648.bibimer.pages.dev** 배포 완료. 공개 12개 홈/정책의 HTTP 200·원본 일치·기존 보안 헤더/no-transform·없는 경로 404를 확인했다. 공개 한국어 소개 https://bibimer.app/ko/#name-story . APK/AAB 빌드·Play 변경 없음. 로컬 서버 종료·viewport 복원 완료.

## 최신: 중국어 간체 앱 소스·웹사이트 6개 언어 (2026-10-14)

- 사용자가 다음 번역 대상과 웹사이트 언어 지원을 요청해 **중국어 간체 `zh-Hans`**를 추가했다. `i18n-zh-Hans.js`의 **580개 문구**와 `values-b+zh+Hans/strings.xml`의 **21개 Android 문구**, 선택 UI·저장 허용값·asset 연결을 반영했다. 개발 소스는 EN/KO/pt-BR/es/id/zh-Hans 6개 언어다. AI 코딩 에이전트는 중국어 `智能体`로 표현하고 Bibimer 자체와 구분한다.
- `AppLanguage.privacyUrl()`은 허용된 저장 언어로 고정 `bibimer.app`의 정책 주소를 만든다. 영어는 `/privacy/`, 나머지는 `/{locale}/privacy/`이며 Settings의 정책 열기가 이를 사용한다. 잘못된 저장값은 영어로 돌아가고 임의 경로나 URL을 언어로 받지 않는다. 첫 실행 영어·사용자 입력/터미널 원문·기존 언어 split 정책을 유지한다.
- 웹사이트는 EN/KO에 **es/zh-Hans/pt-BR/id 홈·전체 개인정보처리방침**을 추가했다. 언어별 URL과 본문, 6개 언어의 같은 종류 페이지로 이동하는 키보드 접근 가능한 링크 메뉴, 현재 언어 강조, canonical/hreflang을 제공한다. 기존 HTML/CSS를 재사용하고 JS·의존성·네이티브 select를 추가하지 않았다. 심사 안내는 기존 EN/KO 전용이며 공개 홈에서 홍보하지 않는다. 새 홈은 **공개 앱은 영어·한국어, 추가 앱 언어는 준비 중**이라고 명시한다. 정책 처리 내용·시행일은 유지한다.
- Cloudflare Pages **https://a4349ffb.bibimer.pages.dev** 배포 완료. `https://bibimer.app/` 아래 12개 홈/정책의 HTTP 200·원본 일치·기존 CSP/no-transform, 없는 경로 404를 검증했다. 중국어 공개 주소는 **https://bibimer.app/zh-Hans/**다. 기존 Play 개인정보 URL `/privacy/`를 유지한다.
- **Node 580키 × 6언어**, Python **17개**, 기존 Demo/ReviewAccess Node 회귀, JS 구문, AAPT2·전체 Android Java 컴파일, diff 검사를 통과했다. Java 8/deprecation 기존 경고만 남는다. CUA에서 웹 12페이지를 320/393px로 확인하고, 정책 언어 전환 키보드 Enter·정책→동일 언어 홈 이동·중국어 데스크톱을 확인했다. 포르투갈어 긴 제목의 가로 넘침은 grid 자식 최소 폭과 단어 줄바꿈으로 수정했다.
- 중국어 앱 첫 화면·설치 안내·설정을 320/393px로 검증했고, 선택 저장 후 reload·Escape/포커스 복귀·명령 원문 보존·가로 넘침 없음·콘솔 오류 없음을 확인했다. UI는 격리된 로컬 소스/네이티브 API 대역이며 실제 Android 실행 검증으로 주장하지 않는다. 시각 판정 **95점 pass**, `.omx/state/localization-zh/ralph-progress.json`, 증빙 `dist/localization-zh/`다.
- **앱 APK/AAB 빌드·Play 업로드·버전 변경 없음. 공개/내부 0.17.1(33)은 영어·한국어 그대로**다. 원어민 검수, 실제 Android 언어 리소스/알림/외부 정책 열기, Play 언어별 등록정보는 후속이다. 다음 번역은 중국어 번체·러시아어이며 새 앱 언어는 다음 명시적 빌드 요청에 포함한다. 테스트 서버·격리 셸·앱 미리보기 탭 종료 및 viewport 복원을 완료한다.

## 최신: 언어 확대 우선순위·3개 번역 소스 (2026-10-14, 미배포)

- 사용자 요청으로 세계 대상 언어 우선순위를 정리했다. 초기 브라질 성장 중심 제안은 사용자의 중국어·러시아어 질문을 반영해 수정했다. **스페인어·중국어 간체 최우선 → 브라질 포르투갈어·중국어 번체·러시아어 → 인도네시아어·일본어·독일어·프랑스어**다. 국가별 GitHub 계정·모국어/총 화자 수·제품 수요를 동일시하지 않는다. 근거·가설과 후속 기준은 `docs/localization.md`에 있다.
- 이미 진행한 **스페인어·브라질 포르투갈어·인도네시아어** 번역을 소스에 추가했다. 각 **580개 UI 항목·21개 Android 문자열**이며 영어·한국어와 합쳐 개발 소스는 5개 언어다. 중국어·러시아어는 아직 구현하지 않았으며 **다음 구현은 중국어 간체**다. 번역은 AI 초안이고 원어민 검수 완료로 표시하지 않는다.
- 기존 영어/한국어 사전을 유지하고 새 언어를 별도 `i18n-*.js` 카탈로그로 연결했다. Android 저장 허용값·리소스·asset 허용 목록·날짜 표시·기존 자체 언어 선택 시트를 갱신했다. 처음에는 기기 언어와 무관하게 영어이며 저장 실패/잘못된 값의 안전한 처리·영어 fallback을 유지한다. AAB의 언어 split 비활성화도 유지한다. 설치 안내 UI는 번역하지만 셸 설치기 출력과 심사용 예제 로그는 기존 영어/한국어 범위다.
- 새 단위 검사에서 전체 객체 **580개 키**(한 줄에 여러 개인 effort와 따옴표 permission 키 포함), 중복/누락/빈 값·자리표시자·fallback·asset 로드·DOM 언어 적용을 검증했다. Python **16개**, ReviewAccess **17개 단언**, Demo **95개 단언/11개 시나리오**, 기존 Node 접근/초안/UI 계약 통과. AAPT2 리소스 컴파일과 Android 전체 Java 컴파일 통과(기존 Java 8/deprecation 경고). APK/AAB를 만들지 않았다.
- CUA로 소스 UI와 격리 브리지에서 320px 5개 언어 설정, 320/393px 새 언어 첫 화면·설치 안내, 1600px 설정을 확인했다. 초기 긴 선택값 잘림·320px 하단 메뉴가 앱을 가로로 밀던 문제는 언어 선택 행의 유연한 폭/줄바꿈과 탐색 버튼 최소 폭/좁은 화면 텍스트 표시로 수정했다. 키보드 선택·Escape/포커스 복귀·선택 저장 후 reload·전환 시 미전송 한중영 초안/프로젝트 경로 유지 확인. 콘솔 오류 없음. 시각 판정 **95점 pass**, `.omx/state/localization/ralph-progress.json`, 증빙 `dist/localization/`. 미리보기 서버·격리 세션/탭 종료·viewport 복원 완료.
- **공개/내부 테스트 0.17.1(33)은 여전히 영어·한국어**다. 앱 버전·APK/AAB·Play·웹사이트는 이번 언어 작업에서 배포하지 않았다. 다음 명시적 빌드 요청으로 내부 테스트하고 실제 Android 알림·WebView와 번역 표현을 검증한 뒤, 지원 언어에 맞춰 스토어·스크린샷·언어별 웹사이트를 같이 준비한다.

## 최신: 0.17.1 정식 출시 완료 (2026-10-14)

- 사용자가 내부 테스트 버전을 설치해 정상 동작했다고 보고한 뒤, 요청한 웹사이트 업데이트를 먼저 배포하고 기존 **0.17.1(33)** 내부 번들을 프로덕션으로 승급했다. 새 빌드·재업로드·키/Doppler 변경·실제 기기 변경은 없다. 사용자 보고를 에이전트의 실기기 검증으로 표현하지 않는다.
- 영어·한국어 출시 노트, 신규 번들 33만 포함, 출시율 **100%·기존 전체 대상 국가**, 지원 기기 변화 없음, 오류 없이 비난독화 매핑 파일 경고 1개를 확인했다. 게시 개요에서 **프로덕션 0.17.1(33) 전체 출시 시작 1건만** Google에 전송했다. 별도의 기존 공개 테스트 임시 버전은 건드리거나 제출하지 않았다.
- 새로 로드한 게시 개요의 **검토 중인 변경사항**에 33을 확인했다. **자동 사전 검사 진행 중**이며 완료 즉시 본 검토로 전송되는 상태다. 제출 직후 일시적 오류 알림은 다시 로드해 해소됐고 중복 제출하지 않았다. 이후 23:09 KST에 다시 확인한 프로덕션 상세에서 **0.17.1(33) Google Play에 제공됨 / 10월 14일 오후 4:17 게시 / 100% / 국가·지역 178/178**을 확인했다. 기존 관리형 게시 설정에 따라 승인 후 자동 게시됐다. 현재 공개 버전은 **0.17.1(33)**이다.
- 증빙 `dist/play-0.17.1/production33-submitted.jpg`와 `production33-live.jpg`, 공개 웹사이트 `dist/website-release/published-ko.jpg`. EN/KO README·출시 문서·listing.json에 실제 상태와 사용자 테스트 보고를 기록했다. 정식 트랙의 실제 기기 업데이트 표시는 별도 확인 대상이며 추가 제출은 필요하지 않다.

## 최신: 웹사이트 공개 설치 안내 반영 (2026-10-14)

- 사용자가 새 버전의 정식 제출 전 웹사이트 업데이트를 요청했고, **내부 테스트를 설치해 정상 동작했다**고 보고했다. 사용자 보고와 에이전트의 실제 기기 검증을 구분해 기록한다.
- EN/KO 홈의 Google Play 출시 준비 문구를 설치 버튼과 무료·Android 8.0 이상·같은 휴대폰 Termux 안내로 바꿨다. 기존 문의 메뉴·공개 GitHub 링크·ADE 소개·별도 i18n을 유지한다. 공개 0.17.0의 파일/Git 뷰어 기능을 네 번째 기능으로 추가하고 기존 스타일의 데스크톱 2열/모바일 1열을 사용한다. 내부 테스트 전용 탐색 동작을 공개 버전 기능으로 소개하지 않았다.
- Cloudflare Pages **https://301d54d0.bibimer.pages.dev**에 배포 완료. EN/KO 홈·정책·SVG/ICO의 HTTPS 200·원본 일치·보안 헤더/no-transform, Play/GitHub 링크·고유 ID·스크립트 없음·언어 전환·데스크톱/393px 모바일 넘침 없음을 확인했다. 한국어 humanizer 의미 보존 점검·시각 판정 97점 pass. 증빙 `dist/website-release/published-ko.jpg`, 검증 `published-verification.json`과 `.omx/state/website-release/ralph-progress.json`이다. 로컬 미리보기 서버/탭과 viewport override는 종료/복원했다.
- 앱 소스·AAB는 웹사이트 작업에서 변경하지 않았다. 검증 및 사용자 테스트를 마친 기존 0.17.1(33) 번들의 정식 출시 상태를 재조회해 제출을 이어간다. 실제 제출 상태는 다음 출시 기록을 따른다.

## 최신: 0.17.1 내부 테스트 먼저 배포 (2026-10-14)

- 사용자 요청으로 상위 폴더 첫 행·뷰어 아래 탐색기 유지를 **0.17.1/versionCode 33**으로 빌드해 내부 테스트에 배포했다. 새로 로드한 Console의 최신 코드 32·프로덕션/내부 제공 상태를 확인했고 원격 `main`과 0/0인 `bd03169` 이후 버전만 갱신했다. 내장 브리지는 0.15.0으로 유지한다.
- 기존 저장소 밖 0600 업로드 키·암호·심사 코드로 서명했다. AAB **`dist/play/bibimer-0.17.1-33-release.aab`**, SHA-256 **b52c3d5fbb632b81308a6696ba9a7c97cb8fc2c9dd19fe856541599802ec2b09**. bundletool/jarsigner·기존 Play 업로드 인증서·Manifest 33/0.17.1/MAIN/LAUNCHER·30개 assets 원본 일치·심사 digest 포함·코드/암호 원문 미포함을 확인했다. Doppler 자동 다운로드·새 키·별도 APK 배포 파일 생성·설치는 하지 않았다.
- Python **14개**, ReviewAccess Java **17개 단언**, Demo **95개 단언/11개 시나리오**, Node 접근 UI·입력 계약·초안 검증과 변경 JS 구문 검사가 통과했다. UI 동작 검증과 변경하지 않은 브리지의 Mac Git 정리 검사 1건 실패는 아래 구현 기록을 따른다. 빌드 로그 `.tools/aab-0.17.1-33-mac.log`, 검증 `.tools/aab-0.17.1-33-verification.json`이다. 실제 휴대폰·운영 브리지·사용자 세션은 변경하지 않았다.
- Chrome 자동 파일 지정은 기존 file URL 권한 제한으로 실패해, 권한을 바꾸지 않고 Mac 기본 파일 선택기로 업로드했다. Console은 **33(0.17.1), API 26+, target 36**으로 수락했다. 출시명 `0.17.1 (33) - File explorer navigation`, 영어·한국어 출시 노트를 저장하고 **저장 및 출시**했다. 오류는 없고 비난독화 빌드의 매핑 파일 경고 1개다.
- 내부 트랙 **활성 / 0.17.1(33) / 내부 테스터에게 제공됨**, 게시 **10월 14일 12:37** 확인. 최신 목록에서 **프로덕션은 0.17.0(32) Google Play에 제공됨**도 확인했다. 프로덕션 출시/심사 제출은 하지 않았다. 증빙 `dist/play-0.17.1/internal33-live.jpg`, `production32-internal33.jpg`. 기존 테스터·동의·심사 접근 설정을 유지하며 실제 스토어 표시·Play 설치·WebView·시스템 Back·외부 문서 앱 복귀는 테스트 기기에서 확인한다. Console 안내는 보통 1시간 이내 표시, 더 걸릴 수 있음이다.
- Manifest·영어/한국어 README·출시 메모·`listing.json`·출시/개발/UI 문서를 갱신했다. 빌드/배포 상태와 공개 32·내부 33을 분리해 기록했다.

## 최신: 상위 폴더 첫 행·파일 탐색기 유지 (2026-10-14, 소스 반영·APK 미빌드)

- 사용자 요청으로 상위 폴더 이동을 툴바에서 **파일 목록 첫 행**으로 옮겼다. 기존 행 스타일·번역·부모 경로 계산을 재사용하며 작업 폴더 루트에는 표시하지 않는다. 빈 하위 폴더와 200개씩 더 보기에서도 한 행만 유지한다.
- 모바일에서 파일을 열 때 탐색기를 닫던 처리를 제거했다. 문서·코드 뷰어는 열린 탐색기 위에 표시하고 닫기·Back/Escape 뒤 같은 폴더·스크롤·파일 포커스로 돌아간다. 기존 뷰어 종료 처리의 열기 버튼 포커스는 탐색기가 닫힌 경우에만 적용한다. 세션·입력 초안과 전체 화면 뷰어를 유지한다. 새 의존성·복원 상태 저장·별도 UI를 추가하지 않았다.
- `inspector.js`·`file-viewer.js`, `scripts/smoke_inspector.cjs`의 관련 회귀 단언과 `docs/interface.md`를 갱신했다. 전체 smoke 실행은 이 Mac의 `.tools/ui` 도구가 없어 수행하지 않았고 의존성을 설치하지 않았다. CUA로 실제 소스 UI와 격리된 실제 브리지를 연결해 **393×852 영어·320×568 한국어·1600×1000 도킹**, 상위 폴더 첫 행·루트 경계·빈 폴더·205개 파일 페이지 추가·코드/Markdown·외부 앱 대역·닫기/Back/Escape·스크롤 1632 유지·파일 포커스·미전송 초안을 확인했다. Back은 테스트 키를 실제 `BibimerBack`에 연결한 네이티브 대역이다.
- 변경 JS·smoke 구문과 `git diff --check`를 통과했다. 추가 브리지 검사 8개는 Mac의 canonical 임시 경로에서 **7개 통과·1개 실패**다. 변경하지 않은 Git 출력 한도 검사의 정리 과정에서 `os.killpg`가 `PermissionError`를 내어 기대 413 대신 500이 된다. 최초 기본 임시 경로의 `/var` 심볼릭 링크로 실패한 워크트리 검사는 `/private/tmp`에서 통과했다. 이 두 환경/기존 코드 문제를 UI 변경의 실패나 전체 검사 통과로 표현하지 않는다. 운영 브리지·Git 소스는 변경하지 않았다.
- 시각 판정 **96점 pass**, `.omx/state/explorer-continuity/ralph-progress.json`. 화면과 검증 요약은 `dist/explorer-continuity/`다. 테스트 서버와 격리 셸은 종료하며 사용자 프로젝트·세션·연결 정보는 건드리지 않았다. **앱 버전은 0.17.0(32) 그대로이고 APK/AAB 빌드·Play 업로드는 하지 않았다.** 다음 명시적 빌드에 누적해 반영하며 실제 Android WebView·시스템 Back·문서 앱 복귀는 새 설치본에서 검증한다.

## 최신: 웹사이트 파비콘 업데이트 (2026-10-14)

- 사용자 요청으로 기존 앱의 `brand.svg`를 재사용한 `release/website/public/assets/favicon.svg`와 16·32px PNG 항목을 담은 루트 `favicon.ico`를 추가했다. 작은 ICO는 렌더러가 지원하지 않는 그림자 필터만 생략했고 로고 경로·색상은 유지한다. 앱 아이콘·APK·소개 본문은 변경하지 않았다.
- 영어·한국어 홈·개인정보처리방침·심사 안내와 404까지 **7개 HTML**에 같은 SVG/ICO를 지정했다. `?v=20261014`로 이전 파비콘 URL의 캐시와 구분한다. 기존 로고 소스를 재사용했고 새 의존성·스크립트는 추가하지 않았다.
- `npx cf`·Wrangler 인증을 확인하고 기존 Pages 프로덕션에 배포했다: **https://543c6b35.bibimer.pages.dev**. 공개 도메인의 7개 문서·SVG·ICO **HTTP 200·원본 바이트 일치·no-transform**, 로컬 HTML 링크·ICO 크기·SVG 원본 일치·`git diff --check`를 확인했다. Chrome에서 공개 SVG 표시를 확인했고 시각 판정 **96점 pass**를 `.omx/state/website-favicon/ralph-progress.json`에 기록했다. 증빙은 `dist/website-favicon/`이다. 모든 브라우저의 기존 파비콘 캐시 갱신 시점까지 검증한 것은 아니다.

## 최신: 0.17.0 공개 승인·내부 업데이트 조회 (2026-10-12)

- 새로 로드한 Console 최신 버전 목록에서 **0.17.0(32) 프로덕션: Google Play에 제공됨 / 전체 출시 / 178개 대상 국가**, 게시 **오후 5:22**를 확인했다. 내부 테스트도 **0.17.0(32) / 내부 테스터에게 제공됨**, 게시 오후 4:58이다. 아래 제출 단계의 사전 검사·승인 대기는 해소됐다.
- 지정 계정의 참여 페이지를 다시 열어 **You’re a tester for Bibimer (app.bibimer)**를 확인했다. Console의 Andy 목록(1명) 선택 상태도 확인했다. 참여 페이지의 앱 상세 링크에서 **Version 0.17.0**과 활성 기기 호환 표시를 확인했다. 기기 모델 목록이나 계정 전용 링크는 공개 기록에 넣지 않는다. 재가입·탈퇴·테스터 변경은 하지 않았다. 사용자 기기에서 ‘제거’만 보인다는 보고를 받았으며 설치된 버전과 설치 경로를 요청했다. 테스트 제공 상태와 실제 기기의 업데이트 표시·설치 성공을 구분한다.
- 업로드 AAB의 Manifest에서 MainActivity의 MAIN/LAUNCHER, enabled true·exported true를 확인했다. 정상 실행 진입 설정이 포함돼 있다. Download 개발 APK는 Play 배포 인증서와 다르므로 그 설치본의 업데이트 가능 여부는 실제 설치 경로/서명으로 확인한다. 앱 제거·데이터 삭제를 실행하지 않았다.
- 제공 상태 증빙: `dist/play-update-check/production-and-internal32-live.jpg`. Google Play 실제 설치·물리 기기의 파일 뷰어/외부 앱 동작은 여전히 별도 검증 대상이다.

## 이전: Mac 동기화·0.17.0 Play 업로드/제출 (2026-10-12)

- 사용자 요청으로 깨끗한 Mac `main`을 원격 **`2f70985`**까지 fast-forward했다. 전체 화면 파일 뷰어, Markdown·정적 HTML·Mermaid·원본/구문 강조, 기존 Android 앱으로 문서/이미지/PDF 열기가 포함된 **0.17.0 / versionCode 32**다. 내장 브리지는 0.15.0이며 이번 업로드에 브리지 변경·재시작은 없다.
- 로그인된 Console 최신 버전 목록에서 31이 **Google Play에 제공됨 / 전체 출시 / 178개 국가**이고, 32는 미사용임을 확인했다. 기존 31은 2026-10-12 오후 3:59에 게시됐다. 공개 스토어 `https://play.google.com/store/apps/details?id=app.bibimer`의 Bibimer·Andineering·설치 버튼·정상 화면 3장도 확인했다. 시작 시 게시 개요의 오래된 화면에는 심사 중으로 남아 있었으므로 최신 조회 결과를 따른다.
- Git으로 전달되지 않는 AAB를 이 Mac의 기존 저장소 밖 0600 업로드 키·비밀번호·심사 코드로 재빌드했다. Doppler 상시 다운로드나 빌드 자동 연동은 추가하지 않았다. 최종 Mac 번들 **`dist/play/bibimer-0.17.0-32-release.aab`**, SHA-256 **177f2ecd43fa39a80994fe58ccc2c56bb41207279aeef2494ccb2618e729fad1**. 아래 Termux 원본 해시 `3f501a4…`는 별도 빌드 이력이다.
- Python **14개**, 접근 검증 Java **17개 단언**, 가상 작업 공간 **95개 단언/11개 시나리오**, Node 접근 UI·초안·입력 계약과 변경 JS 구문 검사를 통과했다. aapt2/javac/D8·bundletool/jarsigner, 기존 Play 업로드 인증서 일치, Manifest 0.17.0(32)/API 26~36/debuggable false, **30개 assets** 원본 일치·새 뷰어/Mermaid 포함·동일 심사 digest·원문 코드/암호 미포함을 확인했다. 기존 Java 8/deprecated 경고 외 빌드 오류는 없다.
- Chrome 기본 파일 선택기로 AAB를 업로드했고 Console이 **32(0.17.0), API 26+, target 36**으로 인식했다. `0.17.0 (32) - Full-screen file viewer`와 영어 320자·한국어 170자의 출시 메모를 저장했다. 난독화하지 않는 빌드에 매핑 파일 경고 1개가 있으며 오류는 없다. 프로덕션 출시율 100%·모든 대상 국가를 유지한다.
- 내부 테스트 **활성 / 0.17.0 (32) - Full-screen file viewer / 내부 테스터에게 제공됨**, 게시 10월 12일 오후 4:58을 확인했다. 기존 테스터/동의/접근 목록을 유지했고 개인정보를 저장소에 넣지 않는다. 증빙 `dist/play-0.17.0/internal32-live.jpg`.
- 프로덕션 변경 **1개**를 Google에 전송했다. 최종 관찰은 **검토 중인 변경사항** 안의 자동 사전 검사 진행 중이며 검사가 완료되면 Google 심사로 넘어간다. 증빙 `dist/play-0.17.0/production32-submitted.jpg`. 기존 관리형 게시 사용 중지에 따라 승인 후 자동 게시된다. 기존 공개 31을 철회하거나 중단하지 않았다. 최신 상태는 Console 게시 개요와 `listing.json`을 따른다.
- 심사 전용 코드·Settings → Review access·가상 예제 안내를 유지했다. EN/KO 심사 안내 첫 단계에서 오래된 앱 버전 번호만 제거해 같은 경로를 안내한다. 기존 알림 영상은 0.16.0 촬영 이력을 명시하며 새 파일 뷰어 시연으로 주장하지 않는다. Pages 배포 **https://cfd319f4.bibimer.pages.dev**, 공개 두 언어 본문 확인 완료. README에서 데모 홍보를 복원하지 않았다.
- 이번 Mac 작업에서는 APK 생성·설치·사용자 기기의 앱/데이터 변경을 하지 않았다. 새 파일 뷰어의 실제 Android WebView/TalkBack·외부 앱 파일 열기/복귀·Google Play 설치는 별도 확인 대상이다. 변경 로그 `.tools/aab-0.17.0-32-mac.log`. 아래 Mac 인계·Termux 빌드 기록의 로그인 대기는 이번 작업에서 해결했다.

## 이전: Mac 배포 인계 (2026-10-12, 아래 로그인 대기는 해결됨)

- 사용자가 **저장소 동기화 후 Mac에서 진행**하기로 선택했다. `main`의 파일 뷰어·0.17.0(32) 소스와 출시 검증/메모를 `origin/main`에 반영했다. Mac에서 로컬 변경을 보존하며 최신 `main`을 가져온 뒤 아래 출시 준비 상태에서 이어간다.
- **APK/AAB·`.tools`·저장소 밖 서명 파일은 Git 동기화 대상이 아니다.** 이미 서명한 Termux AAB를 별도로 가져오거나, Mac의 기존 업로드 키와 Doppler `bibimer/prd`의 동일한 값으로 0.17.0(32)를 재빌드한다. 파일 경로는 기기에 맞게 지정하고 암호/코드를 채팅·로그·Git에 넣지 않는다. 재빌드하면 해시는 새 결과로 갱신한다.
- Mac 출시 빌드에도 `BIBIMER_UPLOAD_KEYSTORE`, `BIBIMER_UPLOAD_ALIAS`, `BIBIMER_STORE_PASSWORD`와 저장소 밖 0600 심사 코드 파일을 가리키는 **`BIBIMER_REVIEW_CODE_FILE`**이 필요하다. 키만 설정하고 심사 코드를 빠뜨리면 심사용 접근이 차단된다. 빌드 전후 `reviewAccessConfigured: true`, 기존 업로드 인증서 일치, 원문 코드 미포함을 확인한다. 새 키·심사 코드를 만들 필요는 없다.
- 다음 작업은 **로그인된 Play Console의 최신 심사/사용 코드 확인 → AAB 업로드 → 출시·심사 제출 → 최종 상태 확인**이다. 버전 코드 32가 실제 Console에서 아직 사용 가능한지 먼저 확인한다. 기존 사용자의 빌드·배포 요청은 계속 유효하다. 현재 0.17.0은 서명·검증만 완료했고 Play에는 업로드하지 않았다.

## 이전: Termux 0.17.0 빌드·Mac 인계 전 기록

- 사용자가 **빌드해서 Play Console에 배포**를 요청했다. 원격 최신 두 커밋(`44a9d51`·`90bb125`)을 조회해 심사자용 접근 제한·0.16.1(31) 제출·Doppler 공유 기록을 발견했고, 파일 뷰어와 충돌 없이 병합했다. 앱은 **0.17.0 / versionCode 32**, 내장 브리지는 **0.15.0**이다. 31은 이미 출시 이력에 있으므로 초기 로컬 31 검증물을 폐기 대상으로 분리하고 최종 32를 다시 빌드했다. 공개 데모 버튼을 복원하지 않는다.
- 출시 AAB: `dist/play/bibimer-0.17.0-32-release.aab`, SHA-256 **3f501a4d88832ffe9ca688c34adf08249eae29426cbef93599fb022615ab7012**. 기존 업로드 키로 서명했고 Play 등록 업로드 인증서 지문과 일치한다. AAPT2/javac/D8·bundletool 1.18.3 validate·jarsigner, 번들 Manifest의 0.17.0(32)/API 26~36/debuggable false, 30개 assets/뷰어·Mermaid 라이선스 원본 일치, Native 허용 경로/ContentProvider DEX를 검증했다.
- 개발용 APK: `dist/bibimer-debug.apk`, **1,973,750바이트**, SHA-256 **a22a8ee0b06127189373ef92e8cb0df46f6837c112f66f9aa1459380f49b968b**. v2/v3 서명·기존 휴대폰용 0.15.0 개발 인증서 일치, 패키지/버전/SDK·30개 assets를 확인했다. **`/storage/emulated/0/Download/Bibimer-0.17.0.apk`**를 최종 코드 32로 교체하고 바이트 일치를 확인했다. Play 앱 서명과는 다른 개발용 파일이며 앱 설치는 하지 않았다.
- Doppler `bibimer/prd`의 기존 업로드 키·암호·별칭·심사 코드를 이번 작업에만 가져왔다. Termux의 Go DNS와 CA 경로 문제를 `--enable-dns-resolver`/TCP DNS와 `SSL_CERT_FILE=$PREFIX/etc/tls/cert.pem`으로 해결했으며 TLS 검증을 끄지 않았다. 기존 업로드 키의 공개 인증서 일치를 확인한 뒤 저장소 밖 기존 문서 경로에 0700 폴더/0600 파일로 보관했다. 새 키·토큰·권한을 만들지 않았고 값 원문을 출력하지 않았다. 상시 다운로드나 빌드 스크립트의 Doppler 자동 연동은 추가하지 않았다.
- 두 빌드에 기존 심사 코드의 SHA-256만 포함했고 원문 코드가 어떤 archive 항목에도 없는지 확인했다. `reviewAccessConfigured: true`, 미설정/과거 인증 없는 데모 활성화는 계속 거절한다. 영어 320자·한국어 170자의 출시 메모 `release/google-play/release-notes/0.17.0.txt`를 준비했다.
- 최신 병합 후 Python **14개**, ReviewAccess Java **17개 단언**, Demo **95개 단언/11개 시나리오**, Node 접근 UI/입력 계약/초안, `smoke_inspector.cjs`·`smoke_file_links.cjs`·`smoke_rendering.cjs`와 `smoke_ui.cjs` 전체 회귀를 통과했다. 로그 `.tools/build-{apk,aab}-0.17.0-32.log`, `.tools/tests-release-0.17.0-32.log`, `.tools/release-0.17.0-32-verification.json`, `.tools/file-viewer-build-verification-32.json`. 실제 Android 설치·파일 앱 호출은 미확인이다.
- **남은 차단은 Play Console 로그인**이다. 이번 작업용 Termux Chromium을 시작하고 게시 개요로 이동했으나 `https://accounts.google.com/v3/signin/identifier`로 리디렉션됐다. 로그인 화면의 DOM·입력·화면·쿠키를 조회하지 않았다. 사용자에게 기존 로그인된 Mac 환경에서 이어가기 또는 휴대폰 작업용 브라우저에서 직접 로그인을 질문했다. 기존 0.16.1(31) 심사는 취소하거나 변경하지 않았으며 최신 상태 재조회도 못했다.
- **로그인된 Console 환경이 준비되면 기존 배포 요청 범위에서** 최신 코드/심사 상태 확인 → 서명 번들 업로드 → 현재 심사 상태에 맞는 내부 테스트·프로덕션 출시/심사 제출 → 최종 상태 확인을 계속한다. 32의 충돌 여부는 실제 Console에서 확인해야 한다. 이전 Mac 작업 환경에서도 같은 Doppler 값으로 재빌드할 수 있다. 비밀번호·코드는 채팅에 요구하지 않는다. 현재 상태는 **출시 빌드/서명/검증 완료, Play 미업로드/미배포**다. `listing.json`의 실제 출시 기록 0.16.1(31)과 `pendingUpdate` 0.17.0(32)를 구분한다.


## 개발 기기 간 키 공유 · Doppler (2026-10-12)

- 사용자 요청으로 기존 Doppler `andy` 워크플레이스에 **`bibimer` 프로젝트**를 새로 만들었다. **`prd`**에 `BIBIMER_UPLOAD_KEYSTORE_BASE64`(기존 PKCS12 업로드 키 원본의 Base64), `BIBIMER_STORE_PASSWORD`, `BIBIMER_UPLOAD_ALIAS`, `BIBIMER_REVIEW_CODE`를 보관했다. 별칭 외 세 값은 masked로 등록했다. 원문 값은 문서·출력·Git에 넣지 않는다.
- Doppler에서 다시 읽어 원본과 네 항목이 모두 일치하는지, 키의 Base64를 복원하면 기존 파일과 동일한지 확인했다. 출시 자격 증명은 `dev`·`stg`에 복제하지 않았다. 새로운 서비스 토큰·계정 권한·Google 앱 서명 키를 만들지 않았으며 기존 로컬 키·코드를 유지했다.
- 다른 기기는 같은 Doppler 워크플레이스·프로젝트 접근 권한으로 필요할 때 가져다 사용할 수 있다. 사용자는 **공유 보관만** 요청했다. 매 빌드 다운로드, 빌드 스크립트 연동, 환경 변수 자동 주입, APK/AAB 빌드를 추가하지 않았다. 기기별 파일 경로는 공유 값으로 저장하지 않았다.
- 일반 앱·브리지 개발에는 공용 Bibimer 서비스 API 키가 없다. Termux 연결 토큰과 제공자·GitHub 인증은 기기별로 준비한다. 출시 AAB에는 기존 업로드 키·암호·별칭이 필요하고, 심사 예제를 포함하려면 심사 코드 파일도 준비한다. Play App Signing의 앱 서명 키는 Google이 관리하며 이 Doppler 보관 대상과 구분한다.

## 최근 제출: 심사용 데모 접근 제한 · 0.16.1 (2026-10-12)

- 사용자 요청은 데모를 앱 등록·심사용으로 제한하는 것이다. 첫 화면·Setup·일반 Settings의 체험 버튼과 공개 README·스토어 설명의 데모 홍보를 제거했다. Settings의 **Review access / 심사자용 접근**에서 비공개 코드를 입력해야 격리된 가상 작업 공간을 열 수 있다. 공개 홈에는 심사 자료 링크가 없다.
- 코드 원문은 저장소 밖 `~/.local/share/bibimer-review/review-code`(0600, 상위 폴더 0700), Console 비공개 Password와 위 Doppler `bibimer/prd`에 보관한다. Git·웹사이트·도구 출력·로그·AAB에는 원문을 넣지 않았다. `BIBIMER_REVIEW_CODE_FILE`로 SHA-256만 빌드에 포함하며 미설정 빌드는 접근을 거절한다. 인증 없는 과거 데모 설정과 `setDemoMode(true)` 직접 호출도 막는다. 정상 설정·연결·초안 분리와 기존 Termux 프로세스 보존을 유지한다.
- 앱 **0.16.1 / versionCode 31**, 내장 브리지 **0.15.0**. 기존 업로드 키로 `dist/play/bibimer-0.16.1-31-release.aab`를 서명했다. SHA-256 **4e5cacead042bd2208995b36500846a702811f3541be2a608bc9dfa890041e59**. bundletool·jarsigner·aapt2/javac/D8, 내장 asset 원본 일치·코드 원문 미포함 확인 완료. APK 생성·설치·실제 휴대폰/운영 브리지 변경은 하지 않았다.
- 내부 테스트 **활성 / 0.16.1 (31) - Restricted review access / 내부 테스터에게 제공됨 / 검토되지 않음**을 확인했다. 이전 승인으로 등록·참여한 테스터 목록을 유지했다. 비공개 이메일은 저장소에 넣지 않는다. `dist/review-access/internal31-live.jpg`가 증빙이다. 실제 Google Play 설치는 미확인이다.
- 공개 데모 버전 30의 프로덕션 심사를 철회했다. 이 작업은 변경사항을 편집 가능한 대기 상태로 돌렸으며 등급·국가·정책·데이터 보안 선언을 보존했다. 버전 31만 선택해 수정 등록정보와 기존 선언 변경 **12개**를 다시 제출했다. 자동 사전 검사 진행률·카운트다운이 사라지고 **검토 중인 변경사항 / 변경사항을 검토 중입니다**로 전환됐다. Google 승인과 공개 노출은 미확인이다. 증빙은 `dist/review-access/production31-in-review.jpg`다. 기존 관리형 게시가 꺼져 승인 후 자동 게시된다.
- Console 로그인 세부정보에 **Restricted review demo and local Termux**, 비공개 코드, 461자 영어 안내를 저장했다. 코드는 정상 개발 기능이나 외부 계정에 접근을 주지 않는다. 심사 자료는 가상 서식·승인·질문·파일/Git·알림 UI를 보여주며 실제 로그·개인 제공자 자격 증명을 사용하지 않는다. Google의 이 심사 수단 수락은 아직 확인되지 않았다.
- 영어·한국어 스토어에서 Demo와 공개 데모 버튼이 있던 Work 첫 화면을 제외했다. 각 언어 **실제 Terminal → Setup → Settings** 3장을 저장·제출했고 설명에서도 데모 홍보를 제거했다. 현재 3장은 이전 정상 모드 0.15.0/code 28 캡처다. 새 버전 Android 캡처라고 표현하지 않는다. 원본 이력 01·05는 보존한다.
- 정책과 심사 안내를 별도 EN/KO 경로로 갱신했다. `/review/`·`/ko/review/`는 심사자 전용 코드 진입을 안내하며 코드 원문이 없다. 공개 자료 확인용 페이지에 `noindex, nofollow`를 설정했고 한국어 제목을 ‘앱 심사 안내’로 변경했다. 기존 58.1초 알림 영상은 0.16.0에서 촬영했으며 0.16.1 코드 입력을 포함하지 않는다고 명시했다. 최신 Pages 배포 **https://0d4a8150.bibimer.pages.dev**. 공개 두 언어 안내와 정책의 갱신된 본문·언어 이동을 브라우저에서 확인했다.
- 검증: Python **14개**, 접근 검증 Java **17개 단언**, 기존 가상 작업 공간 **95개 단언/11개 시나리오**, Node 접근 UI·초안·입력 계약 통과. 기본 차단·잘못된 코드·과거 설정·직접 활성화 우회·입력 삭제·정상 초안 보존을 검증했다. 실제 소스 UI를 393×852 EN/KO 브라우저에서 확인했고 시각 판정 **95점 pass**, `.omx/state/review-access/ralph-progress.json`이다. 네이티브 대역 검사는 실제 31 APK·실기기·Play 설치 검증과 구분한다. 기존 Java 8/deprecated 경고 외 빌드 오류는 없다.
- 후속: Console의 Google 검토 결과와 요구되는 조치를 확인한다. 지정 테스트 기기에서 Play 설치를 검증하며 기존 휴대폰 앱을 임의 제거하거나 데이터를 지우지 않는다. 아래 0.16.0 제출·공개 체험 기록은 변경 전 이력이다.

## 작업 폴더

`/data/data/com.termux/files/home/projects/bibimer`

## GitHub 저장소

- 공개 저장소: [andy5090/bibimer](https://github.com/andy5090/bibimer).
- 로컬 `origin`: `https://github.com/andy5090/bibimer.git`.
- 기본 작업 브랜치: `main`, 원격 추적 브랜치: `origin/main`.
- 2026-09-13 비공개로 생성·로컬 연결했고 2026-10-12 사용자 요청으로 공개 전환했다. GitHub `visibility: PUBLIC`과 비로그인 README 접근을 확인했다.
- 소스·문서를 Git으로 관리하며 APK·도구 캐시·서명 키·환경 변수 파일은 제외한다. Git 작성자는 이 저장소에만 설정하고 GitHub 비공개 이메일을 사용한다.

## 빌드 진행 원칙 (2026-10-01 사용자 요청)

- 기능을 변경할 때마다 바로 APK를 빌드하지 않는다. 구현과 필요한 소스·동작 검증을 진행하며 기능 변경을 모아 둔다.
- **사용자가 명시적으로 빌드를 요청할 때만 APK를 빌드한다.** 작업 보고에서는 소스 구현 완료와 마지막 APK에 포함된 내용을 구분한다.
- 휴대폰용 마지막 배포 파일은 `Download/Bibimer-0.15.0.apk`다. 2026-10-10의 `apk 빌드` 요청으로 GitHub 가져오기·민트 티타늄·Android 파일 열기를 포함했다. 2026-10-11에는 별도 승인으로 Mac의 `dist/bibimer-debug.apk`를 스토어 캡처용으로 빌드했다. 기존 휴대폰 배포 파일·운영 앱·브리지는 교체하지 않았다.

## 전체 화면 파일 뷰어 (2026-10-12, 0.17.0 개발 APK 포함·Play 미배포)

- 파일 탐색기에서 파일을 누르면 사이드바 내용 대신 대화 위의 전체 화면 dialog에 표시한다. 모바일 사이드바를 닫고 넓은 화면의 고정 패널은 유지한다. 파일명·상대 경로·닫기·Back/Escape·미리보기/원본 보기·파일 새로고침·Android 앱으로 열기를 제공한다. Git status의 미추적 파일도 같은 뷰어를 사용하며 diff·커밋 상세는 기존 패널에 표시한다. 세션·대화·초안·대기열·승인을 변경하지 않는다.
- 코드/설정 파일은 기존 highlight.js의 지원 언어로 구문 강조·복사·줄바꿈을 제공한다. Markdown은 제목·표·목록·코드와 Mermaid 블록을 렌더링하고 `.mmd`/`.mermaid`는 다이어그램을 표시한다. HTML은 인라인 CSS를 포함한 정적 미리보기로 표시한다. Markdown·HTML·Mermaid의 원본은 별도 버튼으로 확인한다.
- Office(doc/docx·ppt/pptx·xls/xlsx)·이미지·PDF는 선택 즉시 기존 네이티브 파일 전송과 읽기 전용 ContentProvider/ACTION_VIEW로 설치된 Android 앱에 열기를 요청한다. **PDF는 우선 외부 앱 방식**이며 자체 페이지 탐색·확대·검색 UI는 추가하지 않았다. 앱 없음/전송 실패 안내와 재시도를 제공한다. 바이너리/비 UTF-8 파일도 외부 앱으로 열 수 있다.
- `file-viewer.js`, Android asset 허용 목록, 빌드 도구의 SHA-512 고정 Mermaid **12.1.0** UMD 번들/라이선스를 추가했다. 라이브러리는 첫 다이어그램에서 지연 로드한다. HTML/SVG는 실행 요소·URL·이벤트 속성을 제거하고 스크립트·외부 자원·탐색·폼을 차단하는 CSP와 sandbox srcdoc iframe으로 표시한다. 하위 프레임에도 Native interface가 노출될 수 있어 allow-scripts/allow-same-origin을 허용하지 않는다. Mermaid는 strict·HTML label 비활성·16,000자/500간선과 설정/내장 마크업 제한을 적용하며 실패하면 원문을 보여 준다.
- 프로젝트·워크트리·브리지 인스턴스 변경 시 뷰어를 닫고, 닫기/재조회 뒤 늦은 파일/다이어그램 응답을 폐기한다. 기존 128KiB 텍스트/64MiB 외부 전송 제한을 유지한다. 잘린 문서는 원문으로 표시한다. 문서·다이어그램 출력은 메타데이터/일반 로그에 저장하지 않는다. 기존 `/v1/inspect`와 `/native/open-file`을 재사용하므로 브리지 소스 변경·재시작은 없다.
- 검증: 실제 임시 Git/브리지와 Chromium Android API 대역의 `smoke_inspector.cjs`에서 구문 강조·복사, Markdown/HTML/Mermaid·원본 전환, 외부 자원 요청 없음·HTML 스크립트 비실행·iframe origin 격리, 실패/설정 지시문 다이어그램, 잘림/바이너리, 다섯 Office/이미지/PDF 요청과 프로젝트/워크트리 일치·앱 없음 재시도, 늦은 응답 폐기, 초안/실행 세션/인덱스 보존, 320/393/1600px·영어/한국어·Back/Escape를 확인했다. 기존 `smoke_file_links.cjs`, `smoke_rendering.cjs`, 브리지 inspector **8개**/file_links **7개**, 출시 도구 **7개**, 최신 리소스를 사용한 Android 전체 Java 컴파일, JS 문법·diff 검사를 통과했다. 기존 Java 8/deprecated 경고만 있다. 화면 증빙은 `dist/screenshots/file-viewer-{markdown-phone,markdown-desktop,phone-ko}.png`다.
- 실제 Android WebView의 srcdoc/CSP·TalkBack·소프트 키보드/창 전환, 설치된 문서/이미지/PDF 앱의 열기·읽기 권한·돌아오기는 새 APK에서 검증해야 한다. JavaScript로 동작하는 HTML과 상대 CSS/이미지 로딩은 이번 정적 미리보기에서 지원하지 않는다. 구현 당시에는 APK/AAB 빌드·설치·버전 변경·운영 브리지 적용을 하지 않았고, 이후 사용자 요청으로 위 0.17.0 개발 APK/출시 서명 AAB에 포함했다. 운영 브리지·앱 설치 상태는 유지한다.
- 기존 `smoke_ui.cjs` 전체 회귀도 통과했다. 프로젝트/워크트리·세 에이전트 전환, 입력/질문 초안·대기열/Steer·승인·가져오기·PTY·재접속·설정/IME·영어/한국어 검증을 포함한다. 변경 전 HEAD에서도 재현된 테스트의 옛 첫 화면 문구와 Settings의 작은 화면 무스크롤 가정을 현재 UI에 맞춰 수정했다. 제품 첫 화면/Settings 동작은 이번 작업에서 변경하지 않았다.

## README 대표 화면 (2026-10-12)

- 사용자 요청에 따라 영어·한국어 README 대표 화면에서 가상 데모를 제거했다. 현재 구성은 **실제 로컬 터미널 → Termux 준비 → 설정** 3장이다. 언어별 기존 스토어 캡처 `04-terminal.png`·`02-setup.jpg`·`03-settings.jpg`를 재사용하고 원본 이미지 링크·설명·alt를 제공한다. 기존 너비 240px와 줄바꿈 구조를 유지했다.
- 모두 정상 모드의 실제 Android 에뮬레이터 캡처(0.15.0/code 28)다. 새 이미지 합성·앱 소스 변경·APK/AAB 빌드는 없다. 양쪽 README의 이미지 3장·언어별 경로·원본 링크·alt, 원본과 캡션의 일치, `git diff --check`를 확인했다.
- GitHub에 게시한 두 언어 README의 교체 반영과 이미지 로딩·배치를 확인했다. 시각 판정 **95점 pass**, `.omx/state/readme-gallery/ralph-progress.json`; 현재 증빙 `dist/readme-gallery/github-readme-normal-ko.jpg`.
- 사용자 지적에 따라 두 언어 README에서 심사용 데모 안내·알림 시연 영상 링크를 제거했다. README는 제품 기능과 설치·사용 안내를 제공한다. Console에 제출한 앱 접근·FGS 심사 리소스와 공개 `/review/` 경로는 계속 사용한다. README의 해당 링크 제거와 `git diff --check`를 확인했다.

## 이전: 0.16.0 프로덕션 최초 제출 (현재 철회)

- Console 초기 설정 항목이 사라지고 프로덕션 만들기가 활성화됐다. 같은 AAB 30을 라이브러리에서 선택해 **0.16.0 (30) - Initial release**를 저장했다. 오류 없이 매핑 파일 경고 1개만 확인했다. 지원 국가 177개 + 기타 국가, 영어/한국어 등록정보, IARC·13세 이상·정책·광고·데이터 보안·건강·카테고리를 포함한 변경 **12개**를 Google 검토에 전송했다. 앱 접근·광고 ID·정부·금융·FGS 선언도 검토 참고 항목에 포함된다.
- 최종 관찰 상태는 **검토 중인 변경사항 / 변경사항을 검토 중입니다**이다. 빠른 검사의 진행률·카운트다운이 사라지고 심사 상태로 전환됐다. 아직 Google 승인·공개 스토어 노출·실기기 Play 설치는 완료로 기록하지 않는다. 관리형 게시가 기존 **사용 중지**이므로 승인 후 자동 게시된다. 사용자에게 해당 동작을 알리고 출시 진행의 기존 승인 범위에서 제출했다.
- 게시 개요 URL: https://play.google.com/console/u/0/developers/5778023895269243113/app/4975090737012022496/publishing . 증빙 `dist/play-release-setup/production-in-review.jpg`. 심사 수단·FGS·데이터 처리 등 Google이 요구하는 후속 조치를 이 화면과 제출 활동에서 확인한다.
- 사용자에게 초대의 이메일·이용 정보 공유 동의를 확인받아 지정 계정으로 내부 테스트 초대를 수락했다. Google 참여 페이지의 **You’re a tester for app.bibimer (unreviewed)** 상태를 확인했고 증빙은 `dist/play-release-setup/internal-test-joined.png`다. 계정 이메일은 공개 문서에 넣지 않는다. 실제 Google Play 설치와 기존 개발 APK의 다른 서명 때문에 발생할 수 있는 설치 전환은 사용자 기기에서 별도 확인한다. 운영 휴대폰의 앱을 제거하거나 데이터를 지우지 않았다.

## 이전: 0.16.0 공개 데모·내부 테스트 이력

- 사용자가 계정 없는 데모와 새 출시 AAB를 승인했고, 실제 로그 내용 사용을 금지했다. Codex·Claude Code·OpenCode의 구조화된 출력 형식만 참고한 가상 세션 예제를 제공한다. 코드·diff·표·계획·도구·승인·질문·터미널을 표시하며 입력과 관계없이 예제를 재생한다. 실제 에이전트·셸·GitHub 요청이나 기기 프로젝트 파일 접근을 수행하지 않는다. 입력/질문 답변은 가상 기록에 보관하지 않는다.
- `DemoWorkspace`는 파일·네트워크·프로세스 API 없는 메모리 구현이다. Native API가 데모 요청을 먼저 분기하며 모드 epoch로 이전 요청·폴링·서비스의 응답을 차단한다. 정상 연결·언어·입력·에이전트·알림 설정과 데모 설정을 분리했다. 정상 초안은 모든 세션의 입력·질문·선택 위치만 프로세스 RAM에 임시 보관하며 한 번 복원한다. 프로세스 종료 시 초안 복원은 보장하지 않는다. 정상 Termux 프로세스를 재시작하거나 종료하지 않는다.
- 명시적 Try demo/데모 체험하기를 첫 화면·Setup·Settings에 추가했다. 데모 badge와 안내를 유지하고 Exit demo로 돌아간다. 실제 Send가 `queue:add`를 쓰는 UI 계약 오류와 null-key 초기 view 초안, 언어 변경 시 데모 badge가 실제 연결 표시로 바뀌는 오류를 검증 중 수정했다. 단순한 가상 상태와 기존 UI를 재사용했으며 새 의존성은 없다.
- 최종 앱 **0.16.0 / versionCode 30**, 내장 브리지 **0.15.0**. `dist/play/bibimer-0.16.0-30-release.aab`, SHA-256 **dd893a74e5cc3ba796d303035bd983e00bf4da3f2671af9654dc0a1b2e3cf7ab**. 기존 저장소 밖 업로드 키로 서명했으며 bundletool·jarsigner·aapt2/javac/D8 검증과 AAB asset 원본 일치를 확인했다. 테스트용 universal APK를 에뮬레이터에 `-r`로 업데이트했다. 실제 휴대폰 APK·운영 브리지는 변경하지 않았다.
- Play 내부 테스트 **활성**, **0.16.0 (30) - Demo internal test**, **내부 테스터에게 제공됨 / 검토되지 않음**을 확인했다. 사용자 지정 Google 계정 한 명이 포함된 Andy 목록을 선택·저장했다. 이메일은 Console 비공개 목록에만 보관하며 공개 문서에 기록하지 않는다. 28·29는 출시 초안에서 제외하고 아티팩트 라이브러리에 유지한다. 난독화를 사용하지 않아 가독화 매핑 파일 경고 1개만 있으며 오류는 없다.
- 두 언어 스토어 설명에 무계정 데모와 실제 Termux 준비를 구분해 추가했다. 각 언어 스크린샷 5장(Work → Setup → Settings → 실제 Terminal → 명시적 Demo)을 리뷰 화면에서 확인·저장했다. 첫 화면·데모는 AAB 30에서 캡처했고 기존 Setup·Settings·실제 Terminal은 이전 캡처를 유지한다. 새 데모 screenshot의 모든 내용은 가상이며 실제 에이전트 로그를 사용하지 않는다.
- 테스트 참여 링크: https://play.google.com/apps/internaltest/4701718894791581363 . 사용자 동의 후 초대 수락과 테스터 참여 완료를 확인했다. 페이지에 `Download test app` 링크가 표시된다. Google Play를 통한 실제 설치 검증은 아직 미완료다. 에뮬레이터 직접 설치를 Play 설치 검증으로 보고하지 않는다.
- Console에 472자 영어 데모 안내와 https://bibimer.app/review/ 링크를 로그인 세부정보로 저장했다. 전체 접근 확인은 명시적인 계정 없는 데모 리소스에 대해 선택했으며 실제 AI·GitHub 외부 계정은 제공하지 않는다. 가상 예제와 실제 외부 도구의 범위를 공개 안내에 명시했다. Google의 해당 심사 수단 수락이나 실제 연동 승인으로 간주하지 않는다. 13~15·16~17·18+ 대상 연령, 데이터 보안 최종 설문, FGS specialUse 설명·영상 링크도 각각 저장 확인했다. Google 검토 제출 여부는 뒤의 최종 상태 기록을 확인한다.
- 영어·한국어 공개 정책에 데모의 메모리 처리·입력 미보관·설정 분리를 설명하고, `/review/`·`/ko/review/`에 별도 언어의 체험·심사 안내를 제공했다. 실제 Android 화면으로 58.1초 알림 영상을 촬영했다. 가상 완료 이벤트로 실제 서비스·알림·세션 이동·끄기를 시연하며 실제 AI 응답이나 제공자 인증 검증이라고 주장하지 않는다. 영상: https://bibimer.app/assets/notification-demo-0.16.0.mp4 . 최종 Pages 배포 `https://60e7bace.bibimer.pages.dev`.
- 검증: Python 9개 테스트, 가상 backend Java **95개 행동 단언 / 11개 시나리오**, 실제 JS 입력 controller와 초안 복원 Node 테스트, 언어 refresh의 데모/실제 연결 구분 회귀 테스트, JS 구문·diff 검사를 통과했다. Java 8/deprecated 경고는 기존과 같으며 빌드 오류는 없다. ADB에서 첫 전송의 입력 대체, 임의 slash 입력, 승인·질문 완료, 세 에이전트 형식 전환, 모델·추론 자체 선택 UI, 가상 파일·Git 상태·기록, 터미널 입력 대체, 알림 거절 후 사용, 허용 후 Home 백그라운드 완료 알림·해당 세션 이동·감시 중지를 확인했다. 큐 FIFO·Steer·가져오기·handoff·GitHub 요청 계약은 단위 검증이며 실제 제공자 통신 검증이 아니다.
- 앱 영어·한국어 UI, 320dp에서 조작 영역, 강제 종료 후 데모 상태·저장된 UI 언어, 종료 후 정상 언어 복원을 확인했다. 데모 기록은 작성된 언어의 로그로 남으며 앱 언어 변경으로 기존 로그를 번역하지 않는다. 기존 paired 실환경의 RAM 초안 왕복·실기기·절전·브리지 재시작·실제 제공자 통신은 이번에 검증하지 않았다. 시각 판정 **94점 pass**, `.omx/state/demo-release/ralph-progress.json`. 테스트 에뮬레이터는 size 1080×2400·density 420 원래 값으로 복원하고 종료했다.

## 출시 절차 계속 진행 (2026-10-12)

- Play 데이터 보안 설문 전체 초안을 저장했다. 재조회 시 수집/공유·계정 생성 없음·외부 계정 설명·세 유형 처리의 보존을 확인하고, 삭제 안내 URL 변경 후 **변경사항이 저장되었습니다**를 확인했다. 메시지·파일/문서·기타 사용자 생성 콘텐츠를 선택적 수집/공유·앱 기능 목적·비일시적 처리로 공개한다. 모든 외부 CLI/도구/엔드포인트의 암호화를 확인하지 않아 전송 암호화 보장 항목은 아니요다. 최종 신고 전 실제 지원 제공자의 별도 계정·진단 데이터와 암호화 범위를 다시 검토한다.
- 두 공개 정책에 `#data-deletion`으로 이메일 삭제 요청 절차·삭제 또는 보관 대상·기기와 제공자에서 삭제할 범위를 정리했다. 운영자의 문의 정보 삭제와 로컬 제거 안내를 제공하며 사용자 파일·원본 에이전트 기록 사본을 보유하거나 대신 삭제한다고 주장하지 않는다. Cloudflare Pages 배포 **https://added5db.bibimer.pages.dev**. 영어·한국어 정책의 HTTP 200·원본 일치·no-transform, 데스크톱·393px 가로 넘침 없음을 확인했다. 시각 판정 96점 pass, `.omx/state/privacy-deletion/ralph-progress.json`. 증빙 `dist/play-release-setup/privacy-deletion-{en,ko}.jpg`, `privacy-deletion-{en,ko}-mobile.jpg`.
- 데이터 보안 최종 저장 버튼은 대상 연령 선행 조건으로 비활성이다. 대상 연령은 로그인 세부정보를 먼저 완료해야 한다. Console의 앱 접근 안내는 **모든 기능의 전체 접근을 제공한다는 확인**이 필수이며 Terminal만으로 Chat·GitHub·완료 알림 접근을 검증한 것은 아니다. 해당 확인을 선택하지 않고 미저장 입력을 취소했다. 사용자에게 **명시적 계정 없는 데모 모드·새 AAB 준비** 또는 **개인 계정과 분리된 심사용 외부 계정**을 질문해 답변 대기다. 데모 코드는 아직 구현하지 않았다.
- Play 앱 서명 페이지에서 활성 상태와 공개 인증서 ZIP을 확인·다운로드했다. `deployment_cert.der` SHA-256 **D7:7B:81:67:43:76:F3:39:0D:7D:05:B7:D3:11:5D:C7:30:77:D5:59:B4:53:2E:C7:DC:34:E8:CC:4B:AC:B5:3B**, Console 업로드 인증서는 로컬 **A7:B7:46:09:C2:17:6E:3B:4D:76:C7:76:3B:BF:36:78:67:01:B3:93:3B:FB:E5:85:68:08:EA:E3:63:DC:A1:BA**와 일치한다. 두 하이브리드 인증서도 openssl로 확인해 `release/google-play/listing.json`에 공개 지문만 기록했다. ZIP·DER·확인 증빙은 Git 제외 `dist/play-release-setup/`에 있다. 개인 키·서명 설정은 변경하지 않았으며 HTTPS App Links·assetlinks.json은 아직 구현하지 않았다.
- 내부 테스트 AAB 28의 **미리보기 및 확인**으로 진행했다. 경고 2개는 **테스터 미지정**, **가독화 파일 없음**이다. 현 빌드는 D8을 사용하고 R8/ProGuard 난독화를 하지 않아 매핑 파일은 없다. 테스터의 Google 계정 이메일을 사용자에게 요청했고 아직 등록하지 않았다. **저장 및 출시**는 실행하지 않았다. 증빙 `dist/play-release-setup/internal-test-review.jpg`, `data-safety-draft.jpg`.
- 사용자 답변 후 내부 테스터 등록·테스트 배포·Play 설치 검증, 전체 기능 심사 접근 준비, 로그인 세부정보 → 13세 이상 대상 연령 → 데이터 보안 제출을 진행한다. FGS `specialUse` 설명 초안은 기존 출시 문서에 있으며 실제 시연 영상·Console 선언·프로덕션 심사는 남아 있다. 이번 작업에는 앱/브리지 소스 수정·APK/AAB 재빌드·에뮬레이터 실행이 없었다.
- 검증: 변경 정책의 HTML 언어·중복 ID 없음·삭제 앵커·메일 링크·스크립트 없음, 등록 JSON·문구 제한·이미지 경로·미출시 상태·실제 다운로드 인증서 지문 일치, `git diff --check`를 통과했다. 앱 소스와 출시 AAB는 변경하지 않아 기존 빌드 테스트를 반복하지 않았다.

## 공개 저장소·사용자 README·출시 AAB (2026-10-12)

- 사용자 요청으로 `andy5090/bibimer`를 공개로 전환했다. GitHub 소개도 모바일 ADE·같은 휴대폰 Termux 직접 개발로 수정했다. 공개 전 현재 파일과 Git 기록 56개 커밋·638개 파일 객체에서 주요 제공자 인증 키 패턴과 비밀 키 경로를 점검했으며 해당 패턴은 발견되지 않았다. 정규식 검사로 모든 종류의 비밀 정보를 보장한 것은 아니다. 서명 키·비밀번호·도구 캐시·세션 증빙은 저장소에 넣지 않는다.
- 기본 `README.md`를 영어 사용자 안내로 다시 쓰고 `README.ko.md`를 별도로 제공한다. 제품 소개·배포 준비 상태·실제 화면·수동 설치·프로젝트와 터미널 시작·에이전트 준비·세션 데이터·도움말 순서로 줄였다. 운영 브리지 이력과 APK별 변경 기록은 기존 개발 문서에 남긴다. README 상대 링크와 이미지 파일, 원격 표시·비로그인 접근을 확인했다.
- 사용자 표현 수정에 따라 슬로건은 **내 손안의 에이전트 개발 환경**이다. 한 손 사용을 전제로 홍보하지 않는다. README와 두 언어 웹사이트는 **프로젝트 파일·Git·개발 명령·호환 에이전트가 같은 휴대폰의 Termux에서 실행되어 별도의 개발 PC나 원격 호스트 없이 직접 개발**한다는 점을 설명한다. 모바일 ADE 자체가 코딩 에이전트라는 표현은 사용하지 않는다.
- Play Console의 두 언어 자세한 설명과 한국어 소개 그래픽을 같은 메시지로 수정·저장했다. 리뷰 단계에서 영어·한국어 문구와 각 스크린샷 4장씩을 확인했으며 저장 뒤 등록정보 상태는 검토 전송 준비 완료다. 확장 프로그램 파일 첨부가 차단되어 Chrome 기본 파일 선택창으로 한국어 1024×500 RGB PNG를 업로드했다.
- 웹사이트 두 홈의 GitHub 링크를 공개 저장소로 변경하고 Cloudflare Pages `https://be3a065b.bibimer.pages.dev`에 배포했다. 기본 영어와 한국어 홈의 원격 HTML 일치, 두 언어 393px 화면의 가로 넘침 없음, 데스크톱 표시를 확인했다. 실제 기기 성능이나 모든 개발 도구 호환성을 약속하지 않는다.
- 명시적 사용자 승인으로 출시용 업로드 키를 저장소 밖 `~/.local/share/bibimer-signing/upload.jks`에 생성했다. PKCS12·RSA 3072·별칭 `bibimer-upload`, 폴더 0700·키와 비밀번호 파일 0600이다. 암호는 같은 비공개 폴더의 `upload-password`에만 보관하고 출력·명령 인수·Git·배포에 넣지 않았다. 공개 인증서는 `upload-certificate.pem`에 내보냈다. 키와 비밀번호의 안전한 별도 백업이 필요하다. Play 앱 서명 키와는 구분한다.
- `dist/play/bibimer-0.15.0-28-release.aab`를 서명 빌드했다. 패키지 `app.bibimer`, 최소 API 26·target 36, 내장 브리지 0.15.0이다. jarsigner와 bundletool 1.18.3 검증, 릴리스 도구 테스트 7개가 통과했다. 번들의 SHA-256은 `2aeea5cf819694827f758aa49cdb3c6d090a1fbbfd49119fa17db9cac913862a`이다. APK와 설정 파일의 배포 여부는 별개다.
- Play Console 내부 테스트에 AAB를 업로드했고 **28 (0.15.0)·API 26 이상·target SDK 36·전체 ABI**로 인식됐다. 두 언어 출시 노트와 `0.15.0 (28) - Internal test`를 초안 저장했으며 **변경사항이 저장되었습니다**를 확인했다. Console은 Google Play 서명·자동 보호 활성 상태를 표시했다. 새 서비스 약관 동의는 요청하지 않았다. 테스터 선택·배포·프로덕션 심사 제출은 진행하지 않았다. 앱 서명 인증서 확인과 앱 액세스·타겟층·데이터 보안 설정은 남아 있다.
- AAB에서 서명된 universal APK를 생성해 테스트 에뮬레이터에 설치하고 영어 첫 실행·새 소개 문구·한국어 전환·앱 재실행 후 언어 유지와 한국어 첫 화면을 확인했다. 기존 캡처용 앱만 에뮬레이터에서 제거했으며 Termux 데이터와 실제 휴대폰·운영 브리지는 유지했다. 앱 배포·심사 승인·모든 기능 검증을 뜻하지 않는다. 빌드에는 기존 Java 8 옵션·deprecated API 경고가 있었으며 오류는 없었다.
- 출시 AAB의 실제 영어·한국어 Work 첫 화면으로 두 등록정보의 첫 스크린샷을 교체했다. Work → Setup → Settings → Terminal 순서와 언어별 4장을 확인하고 저장 뒤 **검토를 위해 전송 준비 완료**를 확인했다. 실제 캡처 JPEG는 1080×1920이다. 검증에 사용한 에뮬레이터와 로컬 그래픽 미리보기 서버는 종료했다.

## Play 남은 설정·Terminal 검증·웹 링크 (2026-10-11)

- 사용자 선택 **무료**, **지원하는 전체 국가·지역**을 확인·저장했다. 프로덕션 국가 화면은 기타 국가를 포함해 **178개 행 타겟팅됨, 미타겟팅 0개**를 표시한다. 광고 ID 사용 **아니요**를 저장했다. 사용자 IARC 약관 동의 후 콘텐츠 등급 설문을 저장했으며 상태 **완료됨**, 한국 3세 이상·유럽 PEGI 3 등이다. 등급과 사용자 선택 대상 연령 13세 이상은 별개다. 새 설문의 온라인 콘텐츠는 외부 에이전트를 통한 생성형 AI 접근을 고려해 **예**로 답했다.
- 기본 설정은 Console 대시보드 **8/11 완료**다. **로그인 세부정보·타겟층·데이터 보안**이 남는다. 대상 연령은 앱 액세스 선행 조건 때문에 여전히 Console 미적용이다. 데이터 보안 부분 임시저장 시도는 재조회에 남지 않았으며 미확정 답변은 취소했다. **데이터 보안 저장 완료로 보고하지 않는다.**
- 사용자 제안에 따라 개인 에이전트 계정·API 키 대신 계정 없는 **Terminal** 경로를 에뮬레이터에서 검증했다. 공식 Termux **0.118.3** 설치·최초 실행, 수동 `bibimer-setup.sh` 내보내기·저장 완료 후 `termux-setup-storage`와 Bash 설치, 기기에서 생성한 일회용 코드 연결, 실제 `~/projects/play-review` 생성, Terminal 세션·`pwd` 출력, Settings 왕복·앱 재열기 후 같은 세션 실행 유지를 확인했다. `RUN_COMMAND`와 `allow-external-apps`는 사용하지 않았다. AI 제공자 계정·모델 실행·자동 연결·실기기 완료 알림을 검증한 것은 아니다.
- [영어 심사 안내 초안](release/google-play/review-instructions.txt)을 작성했다. Console 500자 필드용 **494자** 요약과 상세 단계가 있다. 안내 추가 시 **모든 기능에 전체 접근을 제공한다는 확인**이 필수라 해당 확인을 선택하지 않고 미저장 변경을 취소했다. 개인 계정 제공을 전제로 진행하지 않는다. 외부 AI/GitHub 연동의 독립 심사 접근 또는 적절한 검증 수단을 준비해야 한다.
- 실제 연결된 Terminal 화면을 영어·한국어 스토어에 한 장씩 추가했다. **언어별 4장·총 8장** 정식 저장 후 재진입해 각 언어의 `04-terminal.png`·**4/8**·검토 전송 준비 상태를 확인했다. 캡처는 기존 0.15.0/code 28 APK를 사용했으며 새 첫 화면 문구는 이 설치본에 포함되지 않는다. 증빙 `dist/play-release-setup/store-terminal-en.png`, `store-terminal-ko.png`; 개인정보·가짜 대화 없이 실제 테스트 폴더/명령을 표시한다. 일회용 코드가 있던 임시 캡처는 제거했다. 검증용 Terminal 세션만 앱의 종료 메뉴로 종료한 뒤 상태를 확인하고 에뮬레이터를 중지했다. 실제 휴대폰·운영 브리지·기존 사용자 세션은 건드리지 않았다.
- 사용자 웹사이트 요청으로 영어·한국어 **홈 소개의 Bibimer 13세 이상 문장**을 제거하고 **개발자 GitHub 링크**를 추가했다. 개인정보처리방침의 연령 안내는 유지했다. `andy5090/bibimer`는 조회 당시 **PRIVATE**였으므로 우선 공개 프로필 `https://github.com/andy5090`을 연결했다. 저장소 공개 범위는 변경하지 않았고 링크 경로 선택 질문은 사용자 응답 대기다. Cloudflare Pages 배포 `https://af37b337.bibimer.pages.dev`; 공개 홈·정책 네 경로의 HTTP 200·원본 HTML·no-transform 및 기본 데스크톱/393px 모바일 표시와 링크·넘침 없음을 확인했다. 시각 판정 98점 pass, `.omx/state/website-links/ralph-progress.json`. 증빙 `dist/play-release-setup/website-published-ko.png`.
- 출시용 업로드 키는 준비되지 않았다. `scripts/build_aab.py --unsigned --check`는 Mac SDK/JDK 경로를 설정해 통과했으나 **AAB를 빌드하지 않았다**. 기존 캡처용 키를 출시 키로 사용하지 않는다. 사용자에게 **출시용 AAB 빌드와 저장소 밖 업로드 키 준비**를 별도로 요청해 응답을 기다린다. Play App Signing·AAB 업로드·내부 테스트·FGS 시연 영상·전체 기능 심사 접근·심사 제출·출시는 아직 진행하지 않았다.

## Play Console 휴대폰 개발 소개 반영 (2026-10-11)

- 사용자 **플레이 콘솔에도 반영** 요청으로 영어·한국어의 짧은 설명과 전체 설명 도입부를 수정·정식 저장했다. **Start developing on your phone. / 휴대폰 하나로 개발을 시작하세요.**를 앞세우고 Termux를 휴대폰에서 Git·개발 도구를 실행하는 앱으로 소개한다. Bibimer는 프로젝트·세션·대화·터미널을 관리하는 모바일 ADE이며 실제 코딩 작업은 연결한 에이전트가 수행한다고 설명했다.
- `release/google-play/listing.json`과 Console을 맞췄다. 영어 짧은 설명 **78/80**, 전체 **2047/4000**; 한국어 **55/80**, 전체 **1119/4000**. 제목과 기존 기능·설정·데이터 처리 설명은 유지했다. 저장 후 등록정보 목록의 **검토를 위해 전송 준비 완료**와 재진입한 영어·한국어 네 입력란의 원본 일치를 확인했다. 증빙 `dist/play-mobile-copy/saved-en.jpg`, `saved-ko.jpg`. JSON·문구 길이·diff 검사 통과.
- 아이콘·소개 그래픽·실제 스크린샷은 그대로이며 새 APK/AAB 빌드·설치·심사 제출·출시를 진행하지 않았다. 설치본과 실제 스크린샷의 첫 화면 문구는 다음 요청 빌드·재캡처 때 반영한다.
- 사용자가 **신규 배포 때 검수 없이 인앱 업데이트가 가능한지** 질문했다. [Play In-app updates](https://developer.android.com/guide/playcore/in-app-updates)는 Play에 배포된 업데이트를 앱 안에서 설치하도록 안내하는 기능이며 정식 배포 검토 절차를 생략하지 않는다. [기기·네트워크 악용 정책](https://support.google.com/googleplay/android-developer/answer/16559646?hl=en)은 Play 밖의 자체 APK/DEX/JAR/SO 업데이트를 금지하며 WebView JavaScript 같은 인터프리터 코드에는 예외를 두되 모든 Play 정책 준수를 요구한다. [게시·검토 도움말](https://support.google.com/googleplay/android-developer/answer/9859654?hl=en)에 따르면 내부 테스트 업데이트는 일반적으로 사전 검토가 없으나 최초 릴리스·이전 거절 등의 예외와 사후 검토가 있다.
- 현재 앱은 `MainActivity.java`의 앱 asset 경로에서 HTML·JS·번역을 읽으므로 소스 문구 변경에도 앱 재배포가 필요하다. 향후 문구·가이드 등 데이터만 원격으로 공급하는 설계는 별도 검토할 수 있으나 **이번에는 원격 업데이트·Play In-app updates를 구현하거나 의존성을 추가하지 않았다.**

## 첫 화면 한국어·휴대폰 개발 소개 (2026-10-11, 소스 / APK 대기)

- 사용자 요청으로 `find-skills`에서 한국어 문구 개선 스킬을 찾아 `daleseo/korean-skills`의 **humanizer**를 확인하고 `skill-installer`로 `/Users/andy/.codex/skills/korean-humanizer`에 설치·적용했다. [스킬 원본](https://github.com/daleseo/korean-skills/blob/main/skills/humanizer/SKILL.md). 영어 관용구 직역·추상적인 표현을 줄이고, 사용자의 추가 요청에 따라 휴대폰 자체에서 개발한다는 장점과 Termux의 역할을 설명한다. 설치한 스킬은 다음 턴부터 스킬 목록에 제공된다.
- 앱 첫 화면을 **안드로이드에서 직접 개발 → 휴대폰 하나로 / 개발을 시작하세요.**로 바꿨다. 본문은 **프로젝트를 관리하고 코딩 에이전트와 작업하세요. Termux는 휴대폰에서 Git과 개발 도구를 실행하는 앱입니다.**, 버튼은 **개발 환경 준비하기**다. Bibimer는 프로젝트·에이전트 작업을 관리하는 ADE라는 구분을 유지한다. Git·개발 도구 실행 설명은 [Termux 공식 소개](https://termux.dev/en/)를 확인했다.
- `i18n.js`의 첫 화면 네 키와 `index.html`의 영어 기본 본문만 수정했다. 영어도 **Start developing / on your phone.**와 같은 설명으로 맞췄다. 번역투 대신 구체적인 행동을 설명하며 화면 구조·연결·언어 저장 동작은 수정하지 않았다.
- **검증:** JS 문법·영어 기본값·양쪽 번역 키·영어 HTML 기본 문구 일치·diff 검사 및 기존 빌드 단위 테스트 **7개 통과**. 실제 앱 HTML·CSS·i18n을 사용하는 정적 소스 미리보기로 영어·한국어 각각 **393×780 / 320×460**에서 제목 두 줄·설명·버튼 표시와 가로 넘침 없음을 확인했다. 시각 점검 **98점 pass**, `.omx/state/welcome-copy/ralph-progress.json`; 증빙 `dist/welcome-copy/`. 검증용 서버는 종료했다.
- **APK/AAB 재빌드·설치·스토어 캡처 교체 없음.** 현재 설치본과 Play 스크린샷에는 이전 첫 화면 문구가 남아 있다. 다음 사용자 요청 빌드 후 Android WebView 화면과 새 스토어 캡처를 확인한다. 소스 미리보기에는 Android 연결 대역이나 가짜 에이전트 데이터를 사용하지 않았다.

## 제품 정의·ADE 소개 문구 수정 (2026-10-11)

- 사용자가 Bibimer 자체는 코딩 에이전트가 아니라 Orca처럼 ADE라고 정정했다. **모바일 ADE(Agent Development Environment, 에이전트 개발 환경)**로 정의하고, 실제 코딩 작업은 연결한 Codex·Claude·OpenCode 등의 에이전트가 수행한다고 구분한다. 슬로건은 **한 손으로 지휘하는 에이전트 개발 환경**, 앱 영어 문구는 **Your agent development environment**다. 이 결정은 이전 소개 문구 지침을 대체한다.
- `AGENTS.md`, `README.md`, 앱 `i18n.js`·`index.html`, `release/google-play/listing.json`, `scripts/export_play_graphics.cjs`, 영어·한국어 웹 홈·정책과 개인정보 문서에 반영했다. 에이전트의 기능·데이터 처리·정책 시행일은 바꾸지 않았다. 이전 도메인 미확보 README 항목도 실제 운영 주소로 맞췄다.
- Play Console의 두 언어 짧은 설명·전체 설명·소개 그래픽을 수정·저장했다. 저장 후 다시 열어 영어 설명 원본 일치와 언어별 그래픽·기존 실제 스크린샷 3장씩 보존을 확인했다. 소개 그래픽은 기존 HTML·도형·서체 구성에서 문구를 바꾸고 1024×500 RGB PNG로 다시 출력했다. 기존 아이콘·실제 앱 캡처 6장은 유지했다. AI 애셋 표시는 아이콘과 소개 그래픽 3개에만 적용했다. 심사 제출·출시는 하지 않았다.
- Cloudflare Pages 프로덕션 배포 **https://5292d5b8.bibimer.pages.dev**. 영어·한국어 홈·정책 네 경로 HTTPS 200·원본 일치·스크립트 없음·보안 헤더 유지, 데스크톱·모바일 한국어 표시와 가로 넘침 없음을 확인했다. JS 문법·등록 JSON/문구 길이·PNG 크기/색상·HTML lang/canonical/hreflang·diff 검사, 기존 빌드 단위 테스트 **7개 통과**. 시각 점검 98점 pass를 `.omx/state/ade-positioning/ralph-progress.json`에 기록했다. 증빙 `dist/ade-positioning/`.
- 이번 문구 수정으로 **APK/AAB를 재빌드하지 않았다**. 앱 슬로건은 소스에만 반영했고 기존 폰 배포 APK와 앞서 만든 캡처용 APK는 유지했다. 다음 요청 빌드에 반영한다.

## 스토어 이미지·에뮬레이터 캡처 (2026-10-11)

- 사용자 **캡처용 APK 빌드 진행**, **ADB로 조작·캡처 진행** 승인으로 현재 소스를 빌드하고 `Medium_Phone_API_36.1`에 설치했다. `app.bibimer`, **0.15.0 / versionCode 28**, Android 36.1 Google APIs Play Store ARM64, ADB 대상 `emulator-5554`만 사용했다. 실제 휴대폰·운영 Termux·사용자 세션은 변경하지 않았다.
- `dist/bibimer-debug.apk`, SHA-256 **c5a72ed89f94804daebf5f65a97d39e9d707b5c6463871429d901daf60912249**. Mac의 별도 로컬 개발 키(`.tools/bibimer-debug.keystore`, 0600)로 서명한 캡처 전용 파일이며 기존 폰 APK 서명·출시 업로드 키와 구분한다. AAB·Play App Signing·내부 테스트 업로드는 수행하지 않았다.
- 리소스·Java/D8 빌드, APK v2/v3 서명·설치, **27개 내장 asset 원본 일치**, 릴리스 빌드 단위 테스트 **7개 통과**. 기존 Java source8/deprecation 경고 3개만 있었다. 빌드 로그 `.tools/store-capture-build.log`.
- 실제 앱의 Work 시작·Setup·Settings를 영어·한국어로 캡처했다. 기본 영어 표시·앱 내 한국어 선택을 확인했다. 원본 `dist/store-capture/{work,setup,settings}-{en,ko}.png`, 저장소 파일 `release/google-play/screenshots/{en-US,ko-KR}/01-work.jpg`, `02-setup.jpg`, `03-settings.jpg`. JPEG **1080×1920·9:16·각 8MB 미만**, `sips` 품질 95 변환이며 화면 합성·가짜 대화·브라우저 대역은 사용하지 않았다. 이 AVD는 연결 전·Termux 미설치 상태이므로 에이전트 실행·연동·알림 완료를 검증한 화면은 아니다.
- Play Console에 **아이콘 1개·언어별 소개 그래픽 2개·언어별 스크린샷 3장씩 총 6장**을 업로드하고 정식 저장했다. 영어·한국어 등록정보를 다시 열어 해당 언어 그래픽과 Work → Setup → Settings 순서 보존을 확인했다. 등록정보 상태 **검토를 위해 전송 준비 완료**, 대시보드 **7/11 완료**. AI 애셋 라벨 창에서 그래픽 3개 선택·실제 캡처 6개 미선택을 확인했다. 앱 심사 전송·출시는 하지 않았다.
- Chrome 확장 파일 URL 접근을 확대하지 않고 macOS 기본 파일 선택창으로 업로드했다. 증빙 `dist/play-setup/saved-ko-assets.jpg`, `dashboard-7-of-11.jpg`. 상세 캡처 범위는 `release/google-play/screenshots/README.md`, 저장 내용은 `release/google-play/listing.json`.
- 정책 버튼은 캡처용 APK에 포함했고 에뮬레이터에서 외부 Chrome 실행을 관찰했다. Chrome 최초 실행 약관 화면은 진행하지 않았으므로 정책 페이지 로드와 실기기 호출은 미검증이다. 공개 정책 URL은 별도 브라우저에서 검증했다.
- 캡처 완료 후 AVD 화면 크기 오버라이드를 해제해 원래 **1080×2400**으로 복원하고 작업용 에뮬레이터를 종료했다. 웹 미리보기 서버 8877도 중지했다. 설치된 캡처 앱·이미지 파일은 유지한다.

## 웹사이트 언어별 페이지 (2026-10-11)

- 사용자 요청으로 한 페이지에 병기하던 영어·한국어 본문을 정적 i18n 경로로 분리했다. 영어 홈 `/`, 한국어 홈 `/ko/`, 영어 정책 `/privacy/`, 한국어 정책 `/ko/privacy/`. 모든 소개·메뉴·문의·푸터를 해당 언어로 제공하고 언어 전환은 홈↔홈·정책↔정책으로 이동한다. 기본 URL은 영어이며 Play Console의 기존 정책 주소를 유지한다.
- HTML `lang`, 각 페이지 `canonical`, 영어·한국어·기본 언어 `hreflang`을 지정했다. 병기 섹션과 앵커 이동을 제거했고 외부 스크립트·의존성은 추가하지 않았다. 정책의 처리 내용·시행일은 유지한다.
- Cloudflare Pages `bibimer` 프로덕션에 재배포했다. 네 공개 경로 **HTTPS 200·원본 일치·스크립트 없음·보안 헤더 유지**, HTML 내부 링크·중복 ID·정책 언어 하나, 데스크톱·모바일 언어 전환 및 가로 넘침 없음을 확인했다. 증빙 `dist/website-i18n/ko-home.jpg`, 배포 `https://a2ae0cc0.bibimer.pages.dev`.

## Google Play 설정·Cloudflare 사이트 (2026-10-11)

- 사용자 등록 앱 Bibimer를 기존 로그인된 Chrome Play Console에서 설정했다. 광고 없음·정부 앱 아님·금융 기능 없음·건강 기능 없음을 저장했고 카테고리는 생산성이다. 영어 `Bibimer`·한국어 `Bibimer 비비머`의 설명과 이미지를 저장했다. 이미지의 최종 상태는 위 스토어 캡처 항목을 따른다.
- 사용자가 운영 주체 **앤디니어링**, 개발자명 **Andineering**, 공개 지원 이메일 **andy@andineering.com**, 대상 연령 **13세 이상**을 확인했다. Console에 공개 이메일·웹사이트 `https://bibimer.app/`·정책 URL `https://bibimer.app/privacy/`를 저장했다. 이미지 저장 후 대시보드 **7/11 완료**, 기본 등록정보를 다시 열어 영어·한국어 문구와 이미지 보존을 확인했다. 실제 게시·심사 제출은 수행하지 않았다.
- 사용자 지시대로 **`npx cf`**를 사용해 Cloudflare 인증·도메인 가용성을 확인한 뒤 **`bibimer.app` 1년 USD 8.20 구매·등록을 완료**했다. 만료 **2027-10-11 06:00:18 UTC**, 자동 갱신 **false**, WHOIS **redaction**, 잠금 **true**, 등록 상태 **active**. 조회 당시 갱신가는 USD 14.20/년이었다. 계정의 저장된 기본 결제수단·기본 등록 연락처를 사용했고 자격 증명·연락처 원문을 저장소에 넣지 않았다.
- `release/website/public/`의 영어·한국어 소개·정책·기존 아이콘·자체 호스팅 Space Grotesk Bold를 Cloudflare Pages `bibimer`에 배포했다. 프로젝트 생성·Registrar·DNS·사용자 지정 도메인은 `cf@1.0.0-beta.14`, 이 버전이 지원하지 않는 기존 Pages 업로드는 `wrangler@4.149.0`을 사용했다. npm 의존성 추가 없음. 루트 CNAME `bibimer.app → bibimer.pages.dev`, DNS zone·도메인 검증·HTTPS 인증서 **active** 확인. Pages 기본 주소도 유지한다.
- 기본 Cloudflare 변환이 이메일 링크 가림·분석 beacon을 삽입하는 문제를 발견했다. CLI OAuth에는 zone setting/RUM 변경 권한이 없어 403이었으며 권한 확대는 하지 않았다. 공식 문서의 `Cache-Control: public, max-age=0, must-revalidate, no-transform`과 CSP로 스크립트 없는 정적 내용을 유지한다. 재배포 후 루트·정책·아이콘·서체 **HTTPS 200 + 원본 일치**, 보안 헤더·없는 경로 **404**, 공개 브라우저의 정책·메일 링크, 모바일 가로 넘침 없음 확인. 초기 기본 urllib User-Agent 요청은 403이었다; 실제 브라우저와 Mozilla User-Agent에서 공개 접근을 확인한 범위다.
- 앱 Settings에 **Privacy policy / 개인정보처리방침** 버튼을 추가하고 기존 `openGuide` 외부 브라우저 열기로 고정 URL을 연다. `index.html`, `i18n.js`, `MainActivity.java` 각 한 줄 추가이며 외부 콘텐츠를 권한 있는 WebView에 로드하지 않는다. **소스 연결·번역·JS 문법 확인, 캡처용 APK 반영·에뮬레이터 외부 브라우저 실행 확인, 기존 폰 배포 APK 미반영·실기기 호출 미검증**. Mac의 기존 SDK·JDK로 승인받은 캡처 빌드를 완료했다. 기존 릴리스 빌드 단위 테스트 **7개 통과**, HTML/JSON 검증·diff 검사 완료.
- 다음 출시 작업: 심사자가 Termux·브리지·외부 에이전트 인증까지 재현할 **앱 액세스 안내/테스트 접근**이 필요하다. 제공자 테스트 자격 증명이 없어 전체 접근 보장 선언을 저장하지 않았다. Console **대상 연령은 앱 액세스 완료 선행 조건으로 미적용**이며 로컬 listing·웹 정책에만 13세 이상을 기록했다. 데이터 보안·콘텐츠 등급·배포 국가·가격·FGS 영상·업로드 키/AAB·내부 테스트도 남았다. 수집/공유 없음을 임의 신고하지 않는다. 출시용 APK/AAB 빌드는 별도 사용자 요청 후 진행한다.
- 소스와 배포 안내: `release/website/README.md`, `docs/privacy-policy-draft.md`, `docs/google-play-release.md`, `release/google-play/listing.json`. 결과 스크린샷은 Git 제외 `dist/play-setup/`에 보관한다.

## 사이드바 스와이프 닫기 (2026-10-10, 소스 / APK 대기)

- 사용자 요청으로 모바일 모달 사이드바에 터치 스와이프 닫기를 추가했다. 왼쪽 프로젝트·세션 목록은 **왼쪽**, 오른쪽 파일·Git 패널은 **오른쪽**으로 밀어 닫는다. 손가락을 따라 패널이 움직이고 충분히 밀지 않으면 원위치로 돌아온다. 기존 닫기·바깥 탭·Back/Escape 경로를 유지한다.
- `sidebar.js`의 공통 `BibimerDrawerSwipe`를 두 패널에서 사용한다. 10px 이동 후 바깥 방향/수평 우세를 확인하고 패널 폭 22%(최소 56px·최대 96px) 이상일 때 닫는다. 세로/대각선/반대 방향·긴 누르기·두 손가락·touchcancel·입력/편집·코드·가로 스크롤 영역·활성 텍스트 선택은 닫기로 전환하지 않는다. 중첩 모달·화면 크기 변경/포커스 이탈 때 제스처를 취소하고 스와이프 뒤 발생하는 터치 클릭이 세션이나 뒤의 화면을 누르지 않게 막는다. 키보드 클릭은 유지한다.
- 넓은 화면의 고정 패널과 마우스 드래그에는 적용하지 않는다. 닫힌 뒤 열기 버튼에 포커스/aria-expanded를 맞추고 입력 초안·세션/프로젝트 선택을 변경하지 않는다. 모션 감소 설정에서는 복귀 전환 효과를 끈다.
- **검증:** `scripts/smoke_drawer_swipe.cjs`의 Chromium 실제 터치 입력(CDP)으로 양쪽 닫기, 목록 클릭 방지, 실제 세로/코드 가로 스크롤, 짧은/반대/대각선/긴 누르기/두 손가락/취소/마우스 제스처, 초안·포커스, 화면 크기 변경·고정 패널·모션 감소·320px을 확인했다. 활성 텍스트 선택 방어는 브라우저 기본 선택 해제를 제외한 합성 이벤트로 검증했다. 기존 `smoke_rendering.cjs`, 실제 격리 브리지 기반 `smoke_inspector.cjs`, JS 문법·diff 검사도 통과했다. 로그 `.tools/drawer-swipe-{ui,rendering,inspector}.log`.
- **구현 당시 APK 빌드·설치·브리지 변경 없음.** 휴대폰 배포 0.15.0 APK에는 스와이프가 없으며 2026-10-11 캡처용 APK에는 현재 소스를 포함했다. 브리지 업데이트는 필요 없다. 실제 Android WebView 터치·OS 가장자리 뒤로 가기 제스처와의 동작은 별도 확인한다.

## 0.15.0 운영 브리지 업데이트 (2026-10-10, 완료 확인)

- **사이드바 스와이프 작업 시작 시 읽기 전용 확인으로 완료를 검증했다.** 최신 유지보수 상태 `complete`, 버전 0.15.0, 복원 11개/빈 세션 재생성 2개, `github_import_verified/file_links_verified: true`. 실제 health도 **0.15.0 / 활성 11개 / github_import·file_links 지원**이다. 재시작을 다시 실행하지 않았다. 아래는 설치·예약 당시 이력이다.

- 사용자 `브리지 업데이트` 요청으로 운영 `~/.local/share/bibimer/`의 브리지·OpenCode/Claude 어댑터·Claude 복구 도구 네 파일을 **0.15.0** 소스와 일치하도록 설치했다. 기존 소스와 metadata는 비공개 유지보수 폴더에 백업했고 원본 일치·0700 권한을 확인했다. APK 재빌드/설치는 하지 않았다.
- 사전 운영 상태 **0.14.0 / 프로젝트 7개 / 활성 Chat 11개(Codex 10, Claude 1)**. 현재 요청 세션만 응답 중이고 나머지는 ready, 승인·대기 입력 없음. 읽기 전용 네이티브 조회에서 **대화 있는 Codex 9개**는 저장 기록/작업 폴더 일치를 확인했다. 나머지 Codex 1개·Claude 1개는 입력·응답·도구 항목이 없는 새 빈 세션으로 아직 네이티브 기록이 없어 동일 원본 resume 대상에서 제외했다. 이 둘은 같은 폴더·권한/모델 설정·이름/보관을 적용한 빈 세션으로 다시 열며 새 네이티브 ID를 갖는다.
- 독립 작업 **`restart-0.15.0-741dafde`**을 시작했다. 포인터 `~/.local/state/bibimer/maintenance/latest-restart.json`, 마지막 직접 확인 **`waiting_for_current_turn`**, 실제 런타임은 **아직 0.14.0**이다. 현재 응답과 후속 대기 입력이 정상 처리된 뒤 모든 세션의 ready/대기열 0을 4초 확인하고 완료 세션을 종료·재시작·복원한다. 다른 세션 변경/승인/빈 세션의 새 내용/설치 소스 변경 시 중단한다. 매 세션 종료 직전에도 ready/승인/대기열을 다시 확인한다. 재시작을 중복 예약하지 않는다.
- 9개 원본 대화 ID·프로젝트/워크트리·권한/모델·이름/보관·프로젝트/에이전트 선택·인증을 보존한다. 11개 실행 세션 UUID는 바뀔 수 있다. 추가 모델 입력·승인 처리·대화 전달은 하지 않으며 대화/도구 출력은 로그나 유지보수 파일에 저장하지 않는다. 기존 앱 초안은 원래 세션에 남으며 새 실행 UUID로 자동 이전한다고 보장하지 않는다.
- 격리된 **0.14.0 → 0.15.0** 브리지에서 Codex/Claude의 저장 대화 3개와 빈 세션 2개 복원, 권한/Fast·선택·별칭/보관·인증 유지, 대기 입력 처리 후 재시작·추가 모델 턴 없음, GitHub poll/파일 전송 prepare-release·완료 feed 검증이 통과했다. 다른 세션에 새 입력이 오면 세션을 종료하지 않고 유지보수만 중단하는 검사도 통과했다. 로그 `.tools/test-restart-after-turn-0.15.0.log`, `.tools/test-restart-after-turn-0.15.0-abort.log`.
- 도우미 `.tools/stage-bridge-0.15.0.py`, `.tools/restart-after-turn-0.15.0.py`. 작업 폴더/실행 파일 0700, config/status/metadata/latest 0600이다. **다음 확인은 최신 status의 `complete`, `version: 0.15.0`, `restored_session_count: 11`, `empty_sessions_recreated: 2`, `github_import_verified/file_links_verified: true`와 실제 health의 0.15.0·기능 플래그다.** 실패면 reason/last_stage/실제 실행 상태를 먼저 확인하고 재실행을 반복하지 않는다. 예약을 런타임 업데이트 완료로 보고하지 않는다.

## 0.15.0 APK 빌드 완료 (2026-10-10)

- 사용자 `apk 빌드` 요청으로 앱 **0.15.0 / versionCode 28**, 내장 브리지 **0.15.0**을 빌드했다. GitHub 연결·저장소 클론/프로젝트 등록, 민트 티타늄 로고·적응형/단색 아이콘, 이미지·파일 링크를 외부 Android 앱으로 여는 기능을 포함한다. 기존 사이드바·직접 폴더 선택도 유지했다.
- 리소스·Java/D8·APK v2/v3 서명 검증 통과. 이전 0.14.2 인증서와 일치, 패키지/SDK/Manifest·읽기 전용 ContentProvider·파일 열기/GitHub DEX 경로·27개 내장 asset 원본 일치·새 로고 리소스를 확인했다. 설치 스크립트 문법·격리 추출 원본/0700 권한·자동 연결 페이로드 **77,153 UTF-16 단위 < 220,000**·Download 복사본 해시 확인.
- 버전 변경 뒤 Setup 테스트 **4개 통과**. 기능 소스는 앞선 전체 브리지 **139개**, 파일 링크/렌더링/GitHub UI 검증 결과를 따른다. 기존 deprecated/source8 컴파일 경고만 있으며 검증 실패 없음.
- 파일: **`/storage/emulated/0/Download/Bibimer-0.15.0.apk`**, 380,190바이트, SHA-256 `016ef54ad8ed9d57e30038fa5e52dfc16ae38b02e9c23f14cf47aa987392b302`.
- 파일: **`/storage/emulated/0/Download/bibimer-setup-0.15.0.sh`**, 73,299바이트, SHA-256 `09de0ce4391a75e5e4b86ef78fd5278f0562ba531e1e3f21442588a38f237448`.
- 로그: `.tools/build-0.15.0.log`, `.tools/tests-setup-0.15.0.log`, `.tools/verify-release-0.15.0.log`, `.tools/verify-apk-0.15.0.json`. 이전 Download 버전은 유지했다.
- **APK 설치·운영 브리지 업데이트/재시작·사용자 세션 종료는 하지 않았다.** GitHub·파일 열기는 브리지 0.15.0 적용이 필요하며 APK 설치/자동 연결만으로 기존 브리지를 업데이트하지 않는다. 실제 Android 뷰어의 URI 읽기/앱 선택/복귀, GitHub 인증 브라우저 복귀, 런처 마스크·테마 아이콘은 설치 후 검증한다.

## 대화 이미지·파일 링크 → Android 앱 열기 (2026-10-09 구현, 0.15.0 APK 포함)

- 사용자 요청으로 기존 파일 링크의 경로 복사를 **Android 앱으로 열기**로 바꿨다. 이미지 참조·Markdown 파일 링크의 절대/상대 경로·`file:///`·한글/공백·행/열 번호를 처리한다. 상대 경로는 클릭한 세션의 실제 워크트리를 사용하며 등록 프로젝트 기본 경로와 Download도 지원한다. HTTP(S)는 기존 외부 브라우저, 이미지 자동 요청·HTML 실행은 계속 차단한다.
- 브리지 `LinkedFiles`, `file_links` feature, 인증된 `/v1/files` prepare/read/release 추가. 일반 파일 최대 64MiB, 청크 256KiB, 열린 핸들 8개/120초 만료. 프로젝트/워크트리/Download 범위, FD 탐색의 심볼릭 링크 거절, `.git`·브리지 상태 제외, 전송 중 파일 변경·범위 오류 확인. 파일/핸들은 브리지 메타데이터에 저장하지 않는다.
- Android `FileLinks` 전용 전송 스레드 → 비공개 캐시 → `LinkedFileProvider` 읽기 전용 URI → `ACTION_VIEW`/ClipData/임시 읽기 권한. 파일 내용을 WebView로 반환하지 않고 일반 JS의 `/v1/files` 호출은 거절한다. 네이티브 90초 제한, 중복 클릭 방지, EN/KO 진행·실패·뷰어 없음·이전 브리지 안내. 캐시 128MiB/1시간, 시작·다음 열기에서 정리하며 연결 해제 때 전체 정리. 외부 앱 편집은 원본에 반영하지 않는다.
- 기존 GitHub 기능의 `github.js`가 Android asset 허용 목록에 빠진 것도 보완했다. 이전 GitHub·민트 티타늄·사이드바 변경을 유지했다.
- **검증:** 신규 Python 7개 포함 브리지 전체 **139개 통과**(120.177초). `smoke_file_links.cjs`는 실제 격리 브리지+브라우저 네이티브 대역으로 이미지/파일/URI/행 참조·워크트리·바이너리의 JS 비노출·중복 클릭·누락/뷰어 없음·안전하지 않은 스킴·원격 이미지 자동 요청 없음·EN/KO·이전 브리지·초안/실행 세션 보존을 확인했다. `smoke_rendering.cjs` 통과. 전체 Android AAPT2 리소스 컴파일·리소스 전용 링크 및 Java 컴파일 통과(기존 deprecated/source8 경고만 있음). 로그 `.tools/file-links-{python,regression,ui,rendering,java}.log`, 컴파일 산출물 `.tools/file-links-check/`.
- **구현 당시에는 APK/D8/서명·설치·운영 브리지 변경이 없었다. 이후 위 0.15.0 APK에 포함했다.** 새 기능 사용에는 0.15.0 APK 설치와 브리지 0.15.0 적용이 필요하다. Android 실제 이미지·PDF·텍스트 앱의 URI 읽기/기본 앱·선택 화면/뷰어 없음/앱 복귀/Download 권한/백그라운드 취소는 실기기 검증 대기다. 자동 테스트의 네이티브 대역을 실제 Android 연동 검증으로 간주하지 않는다.

## 민트 티타늄 로고 선택·소스 적용 (2026-10-09, 0.15.0 APK 포함)

- 사용자가 세 시안 중 **민트 티타늄**을 선택해 `brand.svg`, 앱 상단 `BIBIMER` 워드마크와 Android 런처 아이콘에 적용했다. 기존 B 경로·대문자 표기·내장 Space Grotesk Bold는 유지하고 민트 금속 그라데이션·얕은 모서리·짙은 배경을 사용한다. 텍스트 clipping을 지원하지 않는 경우 단색 민트, 강제 고대비 모드에서는 CanvasText로 표시한다.
- Android는 그라데이션 채움/테두리와 겹친 그림자 경로로 표현한다. 배경을 별도 `ic_background.xml`로 분리하고 적응형 전경을 54dp 중심으로 0.82배 조정했다. 필수 형태와 테두리의 최대 반경 **32.81dp < 33dp**를 확인했다. Android 13+ 테마 아이콘에는 새 `ic_monochrome.xml`의 단색 B를 사용해 그라데이션·그림자가 테마 마스크에 섞이지 않게 했다. SVG 미세 질감/블러는 Android 벡터에서는 단순화했다.
- Play의 **512×512 RGBA** 아이콘도 새 디자인으로 재출력했다. 내보내기 스크립트에서 두 배경 사각형의 모서리를 모두 제거해 플랫폼이 마스크를 적용할 수 있게 했다. 소개 그래픽 파일은 재출력 전과 동일하다.
- **검증:** Android 전체 리소스 AAPT2 컴파일·링크(리소스 전용 `.ap_`), XML 파싱·적응형 안전 영역 계산, 현재 실제 앱 assets의 브라우저 **320×568 / 393×851 / 1440×900** 표시·내장 서체/그라데이션/아이콘 로드·고대비 fallback·페이지 오류 없음, Play PNG 형식·크기, diff 검사를 통과했다. 브라우저 화면과 512px PNG를 직접 확인했다. 검사 산출물은 `.tools/mint-titanium-check/`, 화면은 `dist/design/metal-logo/mint-app-*.png`다.
- **구현 당시에는 APK/D8/서명·설치·운영 브리지 변경이 없었다. 이후 위 0.15.0 APK에 포함했다.** 실제 Android WebView와 제조사별 런처 마스크·테마 아이콘 표시는 0.15.0 APK 설치 후 확인한다. 로고 변경 자체는 브리지 업데이트가 필요 없다. GitHub 기능은 0.15.0 APK에 포함했으며 운영 브리지 적용은 대기 중이다.

## 금속 느낌 로고 시안 (2026-10-09, 디자인 검토용)

- 사용자의 금속 느낌 아이콘·글자 제안에 따라 기존 B 심벌 경로와 내장 Space Grotesk Bold를 사용한 **새틴 실버 / 폴리시드 크롬 / 민트 티타늄** 3개 시안을 만들었다. 금속 그라데이션·얕은 모서리/그림자·미세 표면을 적용하고 44px 아이콘·24px 워드마크도 함께 비교했다. 시안 단계의 추천은 새틴 실버였고, 이후 사용자가 민트 티타늄을 선택해 위 항목대로 적용했다.
- SVG: `design/metal-logo/*.svg`. 재출력: `node scripts/preview_metal_logo.cjs`. 비교 이미지·개별 PNG·자체 포함 HTML은 `dist/design/metal-logo/`에 생성한다. 비교 이미지 복사본: `Download/Bibimer-metal-logo-preview-2026-10-09.png`.
- SVG 파싱·ID 중복·브라우저 서체 로드와 출력 이미지를 확인했다. 시안 제작 시점에는 앱 아이콘을 교체하지 않았다. 이후 선택한 민트 티타늄을 소스에 적용했으며 APK는 여전히 빌드하지 않았다. 앞선 GitHub 기능 구현 및 기존 미커밋 변경은 유지했다.

## GitHub 연결 → 원하는 폴더 클론 → 프로젝트 등록 (2026-10-09 구현, 0.15.0 APK 포함)

- 사용자 요청으로 **Project Add → Import from GitHub**를 추가했다. Termux의 GitHub CLI 기존 로그인 또는 앱 코드 표시·외부 브라우저 승인을 사용하며, 저장소 목록·검색(불러온 항목)·50개 페이지·공개/비공개/보관 표시를 제공한다. `owner/repository` 직접 입력도 가능하다. 설치 누락 시 `pkg install git gh` 복사·Termux 열기·수동 로그인 경로를 제공한다.
- 기존 폴더 탐색기를 재사용해 **상위 폴더 + 새 폴더 이름**을 지정하고 최종 경로를 확인한 뒤 HTTPS로 클론한다. 성공 후 자동 등록하되 기존 프로젝트·세션 선택은 유지하며 Open project로 이동한다. 에이전트 시작·중단·입력 초안 변경은 하지 않는다. 기존 파일·빈 폴더·링크는 덮어쓰지 않는다.
- `github_import` 기능과 인증된 `/v1/github`의 status/poll/login/cancel_login/repositories/clone/cancel_clone를 구현했다. 클론은 한 번에 하나, 최근 32건/요청 ID·본문 digest로 중복 요청을 처리한다. 화면 닫기·앱 재실행 뒤 상태를 조회하고 실패/취소 파일은 브리지가 자동 삭제하지 않는다. 재시작 뒤 진행 중 기록은 interrupted이며 자동 재개·완료 처리하지 않는다. 로그인 15분·클론 30분 제한이다.
- 인증은 설치된 `gh`가 관리한다. 토큰·CLI 원문·클론 stdout/stderr를 WebView·로그·브리지 메타데이터에 전달하지 않는다. 로그인 공개 코드는 메모리/해당 화면에만 유지한다. GitHub.com HTTPS만 받고 임의 호스트·명령·인수를 거절한다. 클론에만 gh helper를 사용하고 전역 Git 설정·추적 환경·템플릿/후크·리다이렉트를 사용하지 않는다. GitHub Enterprise·브랜치 지정·서브모듈/LFS 자동 설치는 범위 밖이다.
- **검증:** 전체 브리지 **131개 통과** 후 저장 실패 보완을 포함한 GitHub 전용 **9개 통과**. 새 `scripts/smoke_github.cjs`에서 대역 코드 로그인·목록/검색·실제 로컬 Git 클론·폴더 선택·응답 유실의 동일 요청 재시도·기존 입력/프로세스 보존·실패/취소·재접속·영어/한국어·320px·구형 브리지/CLI 설치 안내를 통과했다. 기존 `smoke_ui.cjs` 전체 회귀, Android Java API 36 소스 컴파일, JS/Python 문법·diff 검사도 통과했다. 최초 UI 검사의 한국어 연결 문구 기대값 및 새 Termux 버튼의 번역 키를 수정했다.
- **실제 기기 Termux 검증:** `gh 2.97.0` 활성 인증·저장소 API, 공개 저장소와 이 프로젝트의 **실제 비공개 저장소** HTTPS 클론·등록을 격리 임시 폴더에서 확인했다. 운영 브리지·세션·인증 설정은 변경하지 않았고 GitHub 원격 쓰기는 하지 않았다. 비공개 저장소 내용·이름·인증 정보를 검증 로그에 출력하지 않았다. 새 계정의 브라우저 인증·조직 SSO·Android WebView/터치·브라우저 복귀·IME·장시간 백그라운드는 다음 APK 설치 후 검증한다.
- 로그: `.tools/test-github.log`, `.tools/github-ui.log`, `.tools/github-ui-regression.log`, `.tools/github-bridge-regression.log`, `.tools/github-native.log`, `.tools/github-private-native.log`, `.tools/github-java.log`. 대역 화면은 `dist/screenshots/github-import-en.png`, `github-import-ko-320.png`다. API/보관 기준은 `docs/architecture.md`, 사용법은 `docs/setup.md`에 기록했다.
- **구현 당시 APK 미빌드·운영 브리지 미적용.** 이후 2026-10-10 요청으로 앱·브리지 0.15.0 및 설치 파일을 빌드했다. 운영 브리지 적용은 대기 중이다. 기존 미커밋 파일·Git 변경을 유지한 채 기능을 추가했다.

## 0.14.2 APK 빌드 완료 (2026-10-07)

- 앱 **0.14.2 / versionCode 27**, 내장 브리지 **0.14.0**. 프로젝트 추가의 각 폴더 행 오른쪽 Select로 들어가지 않고 경로를 지정하는 기능을 포함했다. 기존 우측 선택 탭 아이콘과 파일·Git 탐색도 포함한다. 구현 시 전체 `smoke_ui.cjs` 회귀를 통과했고 이후 기능 소스는 변경하지 않았다.
- 리소스·Java/D8 빌드, APK v2/v3 서명·0.14.1 인증서 일치, 패키지/버전/SDK·Manifest, 내장 26개 asset 원본 및 폴더 직접 선택 코드 포함, 설치 스크립트 문법·격리 추출/0700 권한·자동 설정 페이로드 제한과 Download 복사본 해시를 검증했다.
- APK: **`/storage/emulated/0/Download/Bibimer-0.14.2.apk`**, 354,926바이트, SHA-256 `668d0332e48a07b8c7fd100021da5184798f46e3bef8effcfcd705987e76df02`.
- 설치 파일: `Download/bibimer-setup-0.14.2.sh`, 66,295바이트, SHA-256 `68175fe164625065e58c0f190808ef9d6925bbabc5611ab166f26732299a61ec`. 기존 0.14.0 설치 파일과 동일하며 추가 브리지 업데이트는 필요하지 않다.
- 로그: `.tools/build-0.14.2.log`, `.tools/verify-release-0.14.2.log`, `.tools/verify-apk-0.14.2.json`. 이전 Download 파일들은 유지했다. APK 설치·운영 브리지/사용자 세션 변경은 하지 않았다. 실제 Android 터치·WebView 검증은 설치 후 진행한다.

## 프로젝트 폴더 목록에서 바로 선택 (2026-10-07, 0.14.2 APK 포함)

- 사용자 요청으로 Project Add → Browse의 각 폴더 행에 **Select / 선택** 버튼을 추가했다. 폴더 이름은 기존 하위 폴더 탐색, 오른쪽 버튼은 목록 위치를 바꾸지 않고 그 폴더를 프로젝트 경로로 지정한다. 선택 후 기존 Save project로 등록·전환한다. 하단의 현재 폴더 선택도 유지한다.
- 기존 `/v1/folders`로 선택 대상의 접근·쓰기 가능 여부와 실제 경로를 확인한다. 성공 시 생성 옵션을 끄고 등록 버튼으로 포커스를 옮긴다. 조회 중 중복 선택을 막고 취소/새 탐색 뒤 늦은 응답은 무효화한다. 폴더명은 textContent·접근성 이름으로 표시하며 영어/한국어를 지원한다. 브리지 변경은 없다.
- 검증: 기존 실제 격리 브리지 UI 검사에서 `second-project` 폴더를 목록에서 직접 선택해 탐색 경로는 유지·등록 경로만 변경·실행 세션 유지하는 흐름을 확인했다. 360×460px 폴더 목록의 이름/선택 버튼과 하단 동작을 캡처로 확인했다. `smoke_ui.cjs` 전체 회귀·JS 문법·diff 검사 통과. 로그는 `.tools/folder-direct-selection-ui.log`다.
- 소스 구현 후 사용자 `apk반영` 요청으로 위 **0.14.2 APK에 포함했다.** 실제 Android 터치 검증은 설치 후 진행한다. 운영 브리지·사용자 세션은 변경하지 않았다.

## 0.14.1 APK 빌드 완료 (2026-10-07)

- 앱 **0.14.1 / versionCode 26**, 내장 브리지 **0.14.0**. 선택한 우측 탭의 아이콘을 상단 버튼에 표시하고 닫기/다시 열기 및 언어 전환 때 유지·갱신하는 변경을 포함했다. 앞선 `smoke_inspector.cjs`·브라우저 아이콘/접근성 검증 이후 기능 소스는 변경하지 않았다.
- 리소스·Java/D8 빌드, APK v2/v3 서명·이전 0.14.0 인증서 일치, 패키지/버전/SDK·Manifest, 내장 26개 asset 원본 및 `syncOpener` 포함, 설치 스크립트 문법·격리 추출/0700 권한·자동 설정 페이로드 제한과 Download 복사본 해시를 검증했다.
- APK: **`/storage/emulated/0/Download/Bibimer-0.14.1.apk`**, 354,926바이트, SHA-256 `5e7004e2ea9825b437526bf3a68e496037a59e32028b7f89a4204ef4ff3ea62f`.
- 설치 파일: `Download/bibimer-setup-0.14.1.sh`, 66,295바이트, SHA-256 `68175fe164625065e58c0f190808ef9d6925bbabc5611ab166f26732299a61ec`. 0.14.0 설치 파일과 동일하며 이번 아이콘 변경에 추가 브리지 업데이트는 필요하지 않다.
- 로그: `.tools/build-0.14.1.log`, `.tools/verify-release-0.14.1.log`, `.tools/verify-apk-0.14.1.json`. 이전 Download 파일들은 유지했다. APK 설치는 하지 않았으며 실제 Android WebView·DeX/태블릿 검증은 설치 후 진행한다.

## 우측 사이드바 버튼에 선택 탭 아이콘 표시 (2026-10-07, 0.14.1 APK 포함)

- 사용자 요청으로 상단 우측 사이드바 버튼을 선택한 Files·Git status·Git history 탭과 같은 SVG 아이콘으로 표시한다. 최초는 폴더 아이콘이며 탭 변경 즉시 갱신하고 닫기/다시 열기 후에도 현재 선택을 유지한다. 접근성 이름·마우스 설명도 선택 탭과 표시 언어에 맞춘다.
- `index.html`과 `inspector.js`만 UI 동작을 변경했다. 기존 `smoke_inspector.cjs` 통과 및 브라우저에서 세 아이콘 일치·닫기/재열기·한국어 설명 갱신을 확인했다. JS 문법·diff 검사 통과. 로그: `.tools/inspector-selected-icon.log`.
- 소스 구현 후 사용자 `apk 반영` 요청으로 위 **0.14.1 APK에 포함했다.** 브리지 추가 변경은 필요하지 않다. 구현 중 대기했던 0.14.0 브리지 재시작은 다음 확인에서 완료됐다.

## 0.14.0 운영 브리지 업데이트 (2026-10-07, 완료 확인)

- **0.14.1 APK 빌드 중 읽기 전용 확인에서 완료를 검증했다.** 최신 유지보수 작업은 `stage: complete`, `version: 0.14.0`, `workspace_inspector_verified: true`, 복원 세션 2개를 기록한다. 실제 `/v1/health`도 **0.14.0 / 실행 세션 2개 / workspace_inspector 지원**이다. 아래는 예약 당시 이력이며 재실행하지 않았다.

- 사용자 `브리지 업데이트` 요청으로 운영 `~/.local/share/bibimer/`의 브리지·OpenCode/Claude 어댑터·Claude 복구 도구 네 파일을 **0.14.0** 원본과 일치하도록 설치했다. 기존 파일과 metadata는 저장소 밖 비공개 유지보수 폴더에 보관했고, 원본 일치·0700 파일 권한을 확인했다. APK 재빌드·앱 설치는 수행하지 않았다.
- 사전 운영 조회: **0.13.0 / 프로젝트 2개 / 실행 Codex Chat 2개**. 현재 대화는 응답 중, 다른 대화는 준비 상태였으며 두 대화 모두 저장된 네이티브 ID가 있고 승인·대기열은 없었다. 이전 0.13.0 유지보수는 `complete`였다.
- 비공개 `~/.local/state/bibimer/maintenance/latest-restart.json`이 가리키는 **`restart-0.14.0-748d12b6`** 작업을 시작했고 `waiting_for_current_turn`을 확인했다. 현재 응답 완료 후 4초간 준비 상태를 확인하고 두 완료 세션을 종료·브리지를 재시작한 뒤 **동일 원본 대화 이어하기**로 다시 연다. 네이티브 대화 ID·권한/모델 설정·작업 폴더·이름/보관·프로젝트 선택·인증을 보존하고 추가 모델 입력은 보내지 않는다. 실행 세션 UUID는 바뀔 수 있다.
- 첫 예약 중 현재 세션에 새 대기 입력 1개가 들어와 `queued_input_received`로 안전하게 취소됐으며 세션을 종료하지 않았다. 취소 결과는 비공개 `cancelled-on-new-input.json`에 보존하고, 이미 검증한 `wait_for_queue: true`로 동일 작업을 다시 예약했다. 현재 응답과 대기 입력이 정상 처리되어 모든 세션이 준비 상태일 때만 재시작한다. 대기열을 임의로 전송/삭제/재개하지 않는다. 승인·다른 세션 변경·설치 소스 변경 감지 시 중단한다. 준비 대기 한도는 30분이며 결과는 작업 폴더의 `status.json`에 기록한다. 파일/Git 내용·에이전트 출력은 유지보수 로그에 남기지 않는다.
- 격리 브리지와 Codex 대역으로 **0.13.0 → 0.14.0**, 응답 후 재시작·동일 두 대화/설정/이름/보관/인증 보존·추가 모델 턴 없음, 새 파일·Git API 응답 검증이 통과했다. 다른 세션의 새 입력 시 실행 세션을 중단하지 않고 유지보수만 취소하는 검사도 통과했다. 로그: `.tools/test-restart-after-turn-0.14.0.log`, `.tools/test-restart-after-turn-0.14.0-abort.log`.
- **이 기록 시점에는 파일 설치와 재시작 예약까지 완료했으며 운영 프로세스는 아직 0.13.0이다.** 다음 확인은 최신 작업 `stage: complete`·`workspace_inspector_verified: true` 및 `/v1/health`의 **0.14.0·workspace_inspector**다. 실패 시 `last_stage`·`reason`과 실제 실행 상태를 먼저 확인하고 같은 작업을 무조건 다시 실행하지 않는다. 실제 Android 화면·DeX/태블릿 검증과 구분한다.

## 0.14.0 APK 빌드 완료 (2026-10-07)

- 앱 **0.14.0 / versionCode 25**, 내장 브리지 **0.14.0**. 우측 Files·Git status·Git history 아이콘 탭, 파일/커밋 미리보기·diff, 좌우 반응형 패널과 이전 0.13.1의 DeX·재접속 보완을 포함한다.
- 버전 변경 후 `test_inspector.py` 8개, `test_setup.py` 4개 통과. 앞선 기능 구현의 전체 브리지·UI 회귀 결과는 아래 기록을 따른다. 빌드의 리소스·Java/D8 컴파일과 APK v2/v3 서명 검증이 통과했다.
- 이전 0.13.1과 인증서 일치, 패키지/버전/SDK·DeX Manifest 플래그·네이티브 `/v1/inspect` 및 inspector asset, 내장 **26개 asset** 원본 일치, 설치 스크립트 문법·격리 추출 원본/0700 권한, Download 복사본 SHA-256을 확인했다. 자동 설정 페이로드 **70,149 UTF-16 단위**로 제한 이내다. 기존 Download 버전은 유지했다.
- APK: **`/storage/emulated/0/Download/Bibimer-0.14.0.apk`**, 354,926바이트, SHA-256 `3caabff47b5ff64b49da56502b05a29088633e3b14389c59c4b3da1adc550ca4`.
- 설치 파일: **`/storage/emulated/0/Download/bibimer-setup-0.14.0.sh`**, 66,295바이트, SHA-256 `68175fe164625065e58c0f190808ef9d6925bbabc5611ab166f26732299a61ec`.
- 로그: `.tools/build-0.14.0.log`, `.tools/tests-{inspector,setup}-0.14.0.log`, `.tools/verify-release-0.14.0.log`, `.tools/verify-apk-0.14.0.json`.
- **APK 설치·운영 브리지 업데이트/재시작·사용자 세션 종료는 하지 않았다.** 파일·Git 조회에는 브리지 0.14.0 적용도 필요하다. 자동 연결은 기존 브리지를 업데이트하지 않는다. 실제 Android WebView·DeX/태블릿·IME 검증은 설치 후 진행한다.

## 우측 파일·Git 사이드바 (2026-10-07, 0.14.0 APK 포함 / 운영 브리지 적용 대기)

- 사용자 요청으로 상단 오른쪽 버튼과 **Files / Git status / Git history** 아이콘 탭을 추가했다. 현재 프로젝트·실제 워크트리의 폴더/숨김 파일/UTF-8 텍스트 미리보기, 브랜치·변경 상태·충돌·staged/working diff, 현재 HEAD의 커밋 목록·상세 patch를 읽기 전용으로 제공한다. 파일 200개·이력 50개씩 더 보기, 새로고침·오류 재시도·비 Git/구형 브리지 안내, 영어·한국어를 포함한다.
- 1,280px 이상은 320~400px 우측 고정 패널, 더 작은 창은 우측 모달 서랍이다. 좌우 패널을 함께 열어도 본문·입력 영역을 유지하며 탭 방향키·Home/End·Back/Escape를 지원한다. 큰 화면 첫 연결에서 왼쪽 패널의 실제 워크트리를 즉시 불러오고, 320×460px 새 세션 화면에서 내용이 하단 메뉴를 가리던 문제도 보완했다.
- 인증된 `/v1/inspect`와 `workspace_inspector` 기능 표시를 추가했다. 경로/워크트리 검증, 심볼릭 링크·상위 경로·`.git` 접근 거절, UTF-8 128KiB/Git 256KiB 제한, Git 명령별 5초 제한을 적용한다. Git hooks·fsmonitor·외부 diff/textconv·필터를 실행하지 않고 인덱스·파일을 변경하지 않는다. 필터 저장소는 CLI와 diff 결과가 다를 수 있다. 조회 결과는 로그·메타데이터에 저장하지 않으며 프로젝트·워크트리·연결 변경 시 늦은 응답을 폐기한다.
- 검증: 전체 브리지 121개 통과 후 충돌·타임아웃 정리 검사를 추가한 최신 `test_inspector.py` 8개 통과. `smoke_inspector.cjs`의 실제 격리 Git/브리지 통합 검사, 기존 `smoke_ui.cjs`, `smoke_library.cjs`, `smoke_rendering.cjs` 통과. 파일/바이너리/페이지 분할·diff·이력·실제 워크트리·지연 응답 격리·초안/실행 프로세스/인덱스 보존·키보드 탭·1600/768/320px·영어/한국어·구형 브리지를 검증했다. Android Java API 36 컴파일도 통과했다.
- 로그: `.tools/inspector-{backend,all-backend,ui,regression-ui,library,rendering}.log`. 통제된 캡처: `dist/screenshots/inspector-desktop.png`, `dist/screenshots/inspector-phone.png`. 화면 캡처는 임시 테스트 데이터다.
- 구현 시점에는 소스만 변경했고 이후 사용자 요청에 따라 위 **0.14.0 APK·내장 브리지에 포함했다.** 앱과 브리지 0.14.0을 함께 적용해야 한다. 자동 설정은 기존 브리지를 재시작하지 않으므로 실행 세션을 보존할 업데이트 시점을 고려한다. 운영 브리지·사용자 세션은 유지했으며 실제 DeX/태블릿/Android WebView 검증은 남아 있다. 실시간 파일 감시·파일 편집·Git 변경 작업은 제공하지 않는다.

## 0.13.1 반응형 UI 및 APK 빌드 완료 (2026-10-07)

- 앱 **0.13.1 / versionCode 24**, 내장 브리지 **0.13.0**. 앞서 시작된 연결 수정만의 빌드는 Download에 배포하지 않았으며, 사용자 요청으로 DeX·태블릿 UI를 추가한 뒤 최종 APK를 다시 빌드했다.
- 너비 700px 미만은 기존 휴대폰 배치, 700px 이상은 여백·본문·입력 크기를 조정하고 Chat 최대 폭 920px·Settings/Setup 최대 폭 840px를 적용한다. 1,000px 이상은 280~320px의 접을 수 있는 고정 사이드바를 제공한다. PTY는 가용 폭을 사용한다. 큰 화면/충분한 높이의 여러 줄 입력 최대 높이는 160px이며 낮은 창에서는 100px로 줄인다. 같은 DOM과 세션 상태를 유지하며 작은 창에서는 기존 모달 사이드바로 전환한다. 자세한 기준은 `docs/interface.md`에 기록했다.
- 검증: `smoke_rendering.cjs`, `smoke_library.cjs`, `smoke_setup.cjs`, `smoke_ui.cjs` 모두 통과. 320/393/768/820/1024/1440/2560px와 1100×460의 낮은 창, 본문·입력 정렬, 전송 버튼 노출, 긴 초안의 높이 전환, 가로 넘침 없음, 모달 ↔ 고정 패널의 포커스·접힘·Back/Escape, 실제 격리 브리지의 세션 왕복·초안·대기 승인 유지 및 에이전트 변경 요청 없음 검증 포함. 태블릿·모니터·낮은 창 캡처를 직접 확인했다. Android 네이티브 API는 브라우저 대역이며 실제 DeX/태블릿 검증과 구분한다.
- 최종 APK v2/v3 서명과 이전 0.13.0 인증서 일치, 패키지/버전/SDK, 구성 변경 플래그·크기 변경 허용, DEX 수명 주기 메서드, 내장 25개 asset 원본 일치, 설치 스크립트 문법·격리 추출 원본 및 0700 권한, Download 복사본 SHA-256 일치를 확인했다. 자동 설정 페이로드 65,977 UTF-16 단위로 제한 이내다. 기존 Download 버전들은 유지했다.
- APK: **`/storage/emulated/0/Download/Bibimer-0.13.1.apk`**, 346,669바이트, SHA-256 `b2f3fcc1f32bf58f215ddfc46e25e1aa41de9676e984e538274d675aae291f03`.
- 설치 파일: `Download/bibimer-setup-0.13.1.sh`, 62,123바이트, SHA-256 `4bdca88b23a61a7292672b041a62142f455252509d89bac7ac67e702272e5d43`. 브리지 내용은 0.13.0과 동일하며 이번 UI·연결 수정에 브리지 교체/재시작은 필요하지 않다.
- 로그: `.tools/build-0.13.1.log`, `.tools/verify-release-0.13.1.log`, `.tools/verify-apk-0.13.1.json`, `.tools/responsive-{rendering,library,setup,ui}.log`. 통제된 화면: `dist/screenshots/responsive-chat-{768,1100,1440}.png`, `responsive-projects-1440.png`.
- **APK 설치·운영 브리지/사용자 세션 재시작은 하지 않았다.** 실제 폰 ↔ DeX 이동·태블릿 분할 화면·Android WebView/IME/마우스와 Termux 오류 문구 확인은 남아 있다. 소스 검증을 실제 기기에서 끊김이 해결됐다는 보장으로 확대하지 않는다.

## Set up and connect 재접속 시 Termux 오류 보완 (2026-10-07, 0.13.1 APK 포함)

- 사용자가 재연결하려고 `Set up and connect`를 누르면 Termux 오류가 발생한다고 보고했다. 정확한 오류 문구·표시 위치는 질문했으나 아직 답을 받지 못해 실제 오류 원인을 확정하지 않았다. 읽기 전용 확인에서 설치 앱은 versionCode 23이며 이 폰의 `allow-external-apps=true`다. Android RUN_COMMAND 권한이나 실제 명령 실행 성공을 확인한 것은 아니다.
- 기존 버튼은 이미 연결 정보가 저장돼 있고 브리지가 응답해도 매번 `RUN_COMMAND` 자동 설정을 호출했다. `app.js`에서 저장된 인증으로 `/v1/health`를 먼저 확인하고 성공하면 기존 화면 재접속만 수행하도록 바꿨다. 연결 불가·401은 기존 자동 설정 경로를 사용하며, 프로토콜 불일치는 오류 안내 후 중단한다. 조회 대기 중 앱이 숨겨지거나 연결 정보를 지우면 Termux 명령을 실행하지 않는다. 연속 클릭 방지도 유지한다. 영어·한국어 안내에 저장된 연결 우선 사용을 반영했다.
- 검증: `node scripts/smoke_setup.cjs` 통과. 기존 연동 오류가 표시된 상태에서도 저장된 연결 성공 시 RUN_COMMAND 호출 0회, 연결 실패/401 시 자동 설정 진입, 숨겨진 앱에서 지연 실패 후 명령 실행 없음, 최초 설치·오류/재시도·중복 클릭·언어·320/360px 화면을 브라우저 네이티브 대역으로 확인했다. `python -m unittest discover -s bridge/tests -p test_setup.py` 4개 통과: 기존 브리지의 토큰·실행 세션·대기 승인 보존, 미설치/중복 설치 잠금·오류, 중지된 테스트 브리지 시작, 설치 스크립트 검증. JS 문법과 `git diff --check`도 통과했다.
- 근거: [Termux RUN_COMMAND 공식 문서](https://github.com/termux/termux-app/wiki/RUN_COMMAND-Intent)의 별도 명령 실행 권한·외부 앱 허용 조건을 확인했다. 재접속에 필요하지 않은 명령 실행을 생략한 수정이며, 모든 Termux 실행 오류를 해결했다고 보장하지 않는다.
- 이전 설치본에서는 사이드바의 **Reconnect**로 기존 연결만 다시 시도할 수 있다. 오류 문구 확인 및 새 APK의 실제 재접속/자동 설정 검증이 남아 있다. 구현 단계에서는 소스만 변경했고, 이후 위 0.13.1 APK에 포함했다. APK 설치, 권한/설정 변경, 운영 브리지·사용자 세션 재시작은 하지 않았다.

## DeX 전환 시 연결 유지 보완 (2026-10-07, 0.13.1 APK 포함)

- 사용자가 DeX 실행 시 기존 연결이 끊긴다고 보고했다. BIBIMER 앱 연결 문제로 보고 조사했으며, 실제 DeX의 Activity 재생성·Termux 종료 여부는 아직 확인하지 않았다.
- 기존 `MainActivity`는 디스플레이 구성 변경을 처리하지 않아 Activity/WebView가 재생성될 수 있었고, `onPause()`마다 출력 조회를 취소했다. DeX·다중 창에서 다른 창이 포커스를 받아도 발생할 수 있는 경로다. Activity 종료 자체는 원래부터 에이전트 종료 API를 호출하지 않는다.
- Manifest에 크기·방향·밀도·UI 모드·키보드·탐색 장치 구성 변경 처리와 창 크기 변경 허용을 명시했다. `onConfigurationChanged()`는 같은 WebView를 유지하면서 배치·그리기·시스템/IME 여백만 갱신한다. 출력 조회 중단은 실제로 화면이 숨겨지는 `onStop()`으로 옮겼으며, 숨겨졌다 돌아올 때만 기존 재접속 처리를 호출한다. 포커스 왕복은 현재 조회·화면·초안을 유지한다.
- 근거: [Samsung DeX 최적화](https://developer.samsung.com/samsung-dex/modify-optimizing.html), [Android WebView 상태 유지](https://developer.android.com/develop/adaptive-apps/cookbook/webview-state), [Android 다중 창 수명 주기](https://developer.android.com/develop/ui/views/layout/support-multi-window-mode). 공식 문서의 처리 방식과 소스 확인이며 이 폰의 DeX 재현 결과는 아니다.
- 검증: Manifest XML 파싱 및 API 36 대상으로 최종 Android Java 전체 컴파일, `git diff --check` 통과. `node scripts/smoke_ui.cjs` 전체 통과: 새 1280×720 → 800×600 → 393×780 변경 시 같은 페이지·실행 PTY·연결 표시·입력 초안 유지와 기존 재접속·프로젝트/에이전트 전환·대기열/Steer·승인/질문·가져오기·영어/한국어 검사를 확인했다. Android 네이티브 API는 브라우저 대역이며, 실제 DeX의 구성 변경 콜백·포커스 이동 검증과 구분한다.
- 남은 검증: 새 APK 설치 후 폰 ↔ DeX 이동, 창 크기/최대화·포커스 왕복, 최소화 후 복귀, Chat 응답 중 입력/승인/대기열 및 PTY 출력·크기, IME 여백을 확인한다. OS의 앱 프로세스 종료·Termux 종료에 대한 생존/초안 복구까지 보장하지 않는다. 구현 이후 위 0.13.1 APK에 포함했으며 APK 설치, 운영 브리지 재시작과 사용자 세션 종료는 하지 않았다.

## Google Play 출시 준비 (2026-10-06)

- **현재 단계 — Google 로그인 차단(2026-10-07):** Chromium 뷰어 연결 번호를 확인한 뒤 실제 화면 80회 전송을 확인했지만 사용자가 **이 브라우저는 안전하지 않다는 메시지로 로그인할 수 없다**고 보고했다. 화면/입력 전달 성공과 Google 인증 성공을 구분한다. [Google 공식 안내](https://support.google.com/accounts/answer/7675428?hl=ko)는 자동 제어 브라우저의 로그인을 차단할 수 있다고 설명한다. 이번 자동 제어 Chromium이 원인일 가능성이 있으나 정확한 판정 이유는 확인하지 않았다. 같은 뷰어에서 재시도하도록 반복 안내하지 않는다. 기존에 로그인해 둔 **실제 모바일 Chrome의 `https://play.google.com/console/`**에서 사용자가 직접 이어가는 경로를 안내하며, 뷰어 상단에도 해당 주소를 새 탭으로 여는 링크를 추가했다. 모바일 Chrome 내부를 현재 도구로 직접 조작할 수 있다고 주장하지 않는다. 앱 목록에 BIBIMER가 이미 있는지 확인한 뒤 필요한 화면별 작업을 안내한다. Google/조직 인증·Console 내부 접근·출시는 완료되지 않았다.
- **보존 상태:** 차단 보고 뒤 `chrome-control.py status`의 준비·연결·origin·전송 횟수만 확인했으며 `manualLogin: true`를 유지했다. 로그인 화면·DOM·입력·쿠키를 조회하지 않았고 브라우저/프로필·운영 브리지·에이전트 세션을 변경하거나 종료하지 않았다. 이 기록·출시 문서·뷰어의 직접 링크만 갱신했으며 APK/AAB 빌드·커밋/푸시는 하지 않았다.
- **Chromium 직접 로그인 뷰어 준비 이력(2026-10-07):** Obscura 화면 연결과 실제 화면 전송은 확인했지만 사용자가 글자 표시·입력칸 선택 실패를 보고했다. 계정 없는 별도 Obscura에서 Google 입력칸 중앙의 `elementFromPoint`가 입력칸 위 DIV를 반환하고 일부 버튼 글자가 빠지는 것을 재현했다. 사용자 로그인 화면·DOM·입력은 읽지 않았다. 같은 폰의 기존 Chromium 프로세스에 **새 탭만 추가**하고 **`http://127.0.0.1:18769/`**에 새 수동 뷰어를 준비했다. Obscura·기존 Chromium 탭/프로필·운영 브리지·에이전트 세션은 유지했다. 이전 18766 페이지에도 새 뷰어 링크를 추가했다.
- **새 연결·입력 방법:** 새 주소에서 `화면 연결` → 사용자가 보낸 6자리 연결 번호를 `python ~/.local/share/bibimer-play-browser/chrome-control.py approve <번호>`로 확인한다. 번호는 문서·로그에 기록하지 않는다. 사용자는 하단 **입력칸 선택**으로 현재 보이는 입력칸을 선택하고 키보드에 작성 → **화면에 입력** → Google **Next**를 누른다. 화면 직접 터치·확대·Tab·스크롤·입력칸 지우기도 제공한다. 비밀번호·2단계 인증번호는 사용자가 뷰어에 직접 입력한다. Wi-Fi·ADB가 필요하지 않은 같은 폰의 localhost 경로다.
- **Chromium 구현·검증:** 저장소 밖 `~/.local/share/bibimer-play-browser/`의 `chrome-viewer.cjs`, `chrome-viewer.html`, `chrome-control.py`를 사용한다. 기존 0600 `run/control.sock`을 통해 해당 새 탭만 조작하고 뷰어 관리 API는 별도 0600 `run/chrome-view-control.sock`이다. 412×720 CSS 화면을 824×1440 PNG로 전달하고 터치는 CSS 좌표로 환산한다. 별도 합성 화면에서 미인증/다른 Origin/잘못된 번호 거절, 고해상도·확대 상태의 실제 터치 이벤트, 한글 입력·클릭·지우기·입력칸 선택이 통과했다. **계정 정보 없는 Google 로그인 페이지에서도** 누락 없는 글자 표시, 입력칸 직접 터치·선택 버튼을 확인했다. 아직 사용자의 실제 Android Chrome 터치·Google 인증 수락·Console 접근은 미검증이다.
- **현재 로그인 보호:** 테스트 연결을 초기화하고 새 Chromium 뷰어를 `ready: true`, `manualLogin: true`, 사이트 `https://accounts.google.com`, 사용자 연결 대기 상태로 준비했다. `chrome-control.py status`는 준비·origin·연결·전송 횟수만 반환한다. 새 관리 `/cdp`의 수동 로그인 중 403과 미인증 `/api/frame`의 403을 검증했다. **수동 로그인 동안 기존 Chromium 관리 소켓을 포함한 다른 경로로도 화면·DOM·입력 내용을 읽지 않는다.** 사용자가 로그인 완료를 명시한 뒤에만 `chrome-control.py manual-complete`로 조작을 재개한다. 검사용 Obscura 프로세스만 정리했다. APK/AAB 빌드·운영 브리지 변경·커밋/푸시는 하지 않았다.
- **이전 Obscura 직접 로그인 뷰어:** 사용자의 `내가 로그인 할 방법?` 요청으로 같은 폰의 **`http://127.0.0.1:18766/`**에 수동 입력 뷰어를 준비했다. 기존 진단 주소 18765·noVNC와 구분한다. `화면 연결`을 누르면 6자리 연결 번호가 나오고, 사용자가 보내 준 번호만 `python ~/.local/share/bibimer-play-browser/obscura-control.py approve <번호>`로 확인한다. 그러면 **같은 페이지 안에서** Google 로그인 화면이 나타난다. 사용자는 화면 입력칸을 누른 뒤 하단 `키보드`에 문자를 작성해 `화면에 입력`을 누르고, Google 화면의 `Next`를 누른다. 입력칸 지우기·Backspace·Enter·스크롤·화면 갱신도 제공한다. Wi-Fi·ADB·클립보드·앱 자동 열기에 의존하지 않는다. 연결과 전송은 성공했으나 실제 Google 입력칸 선택 실패로 위 Chromium 경로를 준비했다.
- **Obscura 뷰어 구현·검증:** 저장소 밖 기존 도구 폴더에 `obscura-viewer.cjs`, `obscura-viewer.html`, `obscura-control.py`, 격리 검사 `check-obscura-viewer.cjs`를 추가했다. Obscura CDP는 127.0.0.1의 임의 포트와 메모리상의 인증 토큰, 관리 API는 0600 `run/obscura-control.sock`, 프로필은 0700 `obscura-profile/`이다. 연결 번호는 브라우저별 HttpOnly/SameSite=Strict 쿠키와 짝지으며 화면/입력 API에 인증·Origin 검사를 적용한다. 화면과 입력은 사용자 뷰어에 실시간으로 전달하며 파일·일반 로그에 기록하지 않는다. 원격 입력 후 뷰어의 입력 칸을 비운다. 무계정 테스트에서 미인증 화면·다른 Origin·잘못된 번호 거절, 화면 표시, 한글 입력, 클릭, 전체 지우기가 통과했다. Obscura의 좌표 클릭 기본 동작이 입력칸에 포커스를 주지 않아 값을 읽지 않는 포커스 처리를 보완했고 전체 선택 후 삭제도 검증했다.
- **로그인 보호·후속 작업:** 계정 입력 전 Google 로그인 화면을 412×820으로 직접 확인했고 현재 `ready: true`, `manualLogin: true`, 사이트는 `https://accounts.google.com`, 연결 사용자는 아직 없다. `obscura-control.py status`는 준비·사이트 origin·연결 여부·화면 전송 횟수만 출력한다. 수동 로그인 중 일반 관리 `/cdp` 요청은 403으로 차단되는 것을 확인했다. **계정 입력 중 화면·DOM·입력 내용에 접근하지 않는다.** 사용자가 로그인 완료를 명시한 뒤에만 `obscura-control.py manual-complete`로 일반 조작을 재개한다. Google의 실제 로그인 수락·2단계 인증·Console 접근은 아직 검증하지 않았다. 새 APK 빌드·설치·운영 브리지 변경·기존 Chromium 종료는 하지 않았다. 개인 프로필·토큰·브라우저 도구는 저장소 밖에 유지하며 이번 변경을 자동 커밋/푸시하지 않았다.
- **Obscura 인증 진입 재검토:** 저장소 동기화 후 사용자 문의로 Obscura 0.2.2를 새 비공개 임시 프로필에서 재검사했다. Play Console용 Google `ServiceLogin` 주소로 직접 진입하면 종료 코드 0으로 `accounts.google.com/v3/signin/identifier`, 제목 `Google Play Console`, 이메일 입력란이 확인됐다. 별도 렌더 검사에서도 로그인 페이지 PNG가 생성돼 실제 화면을 확인했다. 앞선 Console 직접 접속의 SIGSEGV와 구분한다. 일반 로그인 폼·쿠키 유지 기능은 공식 README에 있지만, **사용자 계정 입력·Google 로그인 수락·2단계 인증·인증된 Console 접근은 아직 검증하지 않았다.** 이번 테스트에는 계정 정보를 입력하지 않았고 임시 프로필은 정리했다. 현재 사용자에게 연결된 Obscura 로그인 세션은 없다. Obscura는 별도 엔진이므로 기존 Android Chrome 로그인 상태를 자동 공유하지 않는다. 직접 입력할 뷰어 연결과 Google 인증 호환성은 남은 작업이다. 기존 Chromium·브리지·사용자 세션은 변경하지 않았다.
- **현재 중단 지점:** 사용자 `일단 여기까지 레포 싱크` 요청으로 브라우저 연결 문제 해결을 멈추고 출시 준비 자료와 인수인계 기록을 동기화한다. **Play Console 계정 내부에 접근하거나 로그인·업로드·심사 제출을 완료하지 않았다.** 연결 번호 확인 후에도 사용자가 화면이 안 된다고 보고했고 마지막 실제 noVNC 연결 수는 0이다. 다음 작업은 이 미해결 상태에서 시작하며 성공했던 진단 페이지와 실제 Chromium 뷰어를 구분한다.
- **환경 제약:** 조직 개발자 계정이며 사용자는 같은 폰의 모바일 Chrome에 Play Console을 열어 두었다. 현재 Wi-Fi를 사용할 수 없으므로 무선 ADB 페어링을 다음 필수 단계로 요구하지 않는다. Termux ADB 35.0.2는 설치돼 있지만 연결 기기가 없고 mDNS 조회도 오류였다. Termux:API 앱 0.53.0·CLI 0.60.0은 설치돼 있고 배터리 상태 API는 응답한다. API 자체에는 기존 Chrome 화면 조회·클릭 기능이 없다.
- **로컬 브라우저 도구 위치:** 저장소 밖 `~/.local/share/bibimer-play-browser/`에 `browser.cjs`, `control.py`, `diagnose.cjs`, 별도 `profile/`, noVNC 1.7.0과 ws 8.18.3이 있다. Termux Chromium 149.0.7827.155, TigerVNC 1.16.2·Openbox를 사용한다. 이번 출시 작업용 도구이며 제품 앱이나 Git 동기화 대상이 아니다. CDP는 파이프, 관리 API·VNC는 0600 Unix 소켓, 뷰어는 127.0.0.1의 인증된 HTTP/WebSocket이다. 상위 폴더 0700, 연결 키·Xauthority 0600을 유지한다.
- **기존 뷰어와 재접속:** `python ~/.local/share/bibimer-play-browser/control.py status`는 준비·뷰어 수·로그인/Console 페이지 여부만 표시한다. `open`은 인증 진입 주소를 `termux-open-url`로 열고, `copy-link`는 Termux:API의 표준 입력으로 클립보드에 전달한다. 자동 열기는 종료 코드 0이어도 실제 표시가 확인되지 않았다. 클립보드 쓰기·읽기도 종료 코드 0이지만 읽기 결과가 비어 있어 복사 완료를 검증하지 못했다. 인증 없는 `/vnc.html` 바로가기는 403과 `Termux에서 브라우저 화면을 다시 열어 주세요.`를 표시하므로 반복 안내하지 않는다. 실제 포트·PID는 비공개 `run/state.json`에 있다.
- **진단으로 확인한 범위:** `http://127.0.0.1:18765/`의 진단 페이지에서 **실제 페이지 1회·JavaScript 1회·WebSocket 1회·표시 확인 버튼 2회**를 관찰했다. 따라서 같은 폰의 Chrome→Termux 로컬 통신은 확인됐으나 기존 뷰어 연결 문제는 남아 있다. 진단 서버 `/health`에는 단계별 횟수·대기 연결 수만 있고 `run/diagnose.json`에는 전용 PID·포트만 있다. 별도 headless 브라우저 검사에는 `?selfcheck=1`을 써 실제 사용 횟수와 구분했다.
- **복사 없는 연결 시도:** 진단 페이지의 `브라우저 화면 연결`은 브라우저별 무작위 HttpOnly/SameSite=Strict 쿠키와 10분 유효한 6자리 연결 번호를 만든다. 사용자가 전달한 번호만 비공개 `run/diagnose-control.sock`의 `POST /approve`, JSON `{"code":"사용자가 알려 준 번호"}`로 확인한다. 해당 브라우저는 `/link` 조회 후 한 번만 기존 뷰어 진입 주소를 받는다. 번호만으로 공개 HTTP에서 인증 키를 얻을 수 없고 다른 쿠키·미확인 요청·잘못된 번호를 거절한다. 격리 검사에서 거절·확인 후 이동을 검증했다. 실제 사용자 번호에도 `approved: true`를 반환하고 대기 연결이 1→0이 됐으나 이후 실제 뷰어는 0이었고 사용자가 실패를 보고했다. 이 번호는 이미 소비됐으므로 재사용하지 않는다. 번호·쿠키·진입 키를 기록하지 않았다.
- **다음 진단과 보존:** 번호 화면 이후의 정확한 오류·표시 상태는 아직 확인하지 못했다. 연결 경로에 오류 표시를 추가하겠다고 안내했지만 사용자 동기화 요청으로 추가 구현 전에 멈췄다. 원래 Chromium에는 Google 로그인 페이지가 준비돼 있으나 로그인 중 화면·DOM·키 입력을 수집하지 않는다. 프로필을 삭제하거나 운영 브리지·에이전트 세션을 재시작하지 않는다. 로컬 도구를 종료할 때 `control.py stop`은 이번 Chromium·화면 서버만 종료하며 진단 서버는 별도 프로세스다. 마지막 변경에서는 어느 쪽도 종료하지 않았다.
- **앞선 검증:** 로그인 전 테스트 페이지에서 noVNC 화면 표시·실제 클릭 전달, 인증 없는 요청 거절·파일/소켓 권한을 확인했다. Obscura 0.2.2는 로컬 MCP 입력·클릭과 example.com 조회가 성공했지만 Play Console 비로그인 접속 중 SIGSEGV로 종료됐다. 이 결과를 Google 계정 접근 성공으로 보고하지 않는다.

- 사용자 `구글 플레이 스토어에 출시` 요청으로 저장소와 공식 Play 정책을 확인하고 [출시 준비 문서](docs/google-play-release.md), [개인정보처리방침 초안](docs/privacy-policy-draft.md), [영어·한국어 등록 문구](release/google-play/listing.json)를 추가했다. **실제 출시·업로드·심사 완료가 아니다.** 후속 답변으로 **조직 개발자 계정 사용을 확인**했다. Play Console API·앱 연결은 없고 사용자 브라우저에 접근하는 단계가 남아 있다. 조직·신원 인증 완료 여부, 조직명·공개 지원 이메일·조직 웹사이트를 질문했다. 인증 상태·개발자 정보·공개 정책 URL·가격·국가·서명 설정은 아직 확인되지 않았다. 등록 자료에 계정 유형만 반영했고 인증 완료로 표시하지 않았다.
- `scripts/build_aab.py`에 Termux AAB 빌드 경로를 추가했다. 기존 APK의 SDK·웹 assets·브리지 준비와 Java/D8 컴파일을 공통 함수로 분리했다. Google bundletool **1.18.3** 릴리스 SHA-256 확인, protobuf 모듈 포장, 영어·한국어를 유지하는 언어 분할 비활성화, `jarsigner` 업로드 서명과 검증, bundletool validate, 별도 `dist/play/` 출력을 구성했다. 저장소 밖의 기존 업로드 키와 환경 변수 암호를 요구하고 알려진 개발 인증서를 거절한다. 키 생성·Play 업로드를 자동 실행하지 않는다.
- **검증:** `python -m unittest discover -s scripts/tests -v` **7개 통과**(모듈 내용·DEX 보존, binary 리소스/누락 DEX 거절, APK/AAB 컴파일 인수 분리, 언어 포함 설정, 서명 설정 누락/개발 인증서 거절·암호 인수 미노출, check 무빌드). 기존 Setup 테스트 **4개 통과**, Python/Node 문법·diff 검사 통과. `--unsigned --check`에서 `app.bibimer / 0.13.0 / code 23 / min 26 / target 36` 확인. 두 언어 등록 문구의 30·80·4,000자 제한 검사 통과.
- `scripts/export_play_graphics.cjs`와 `release/google-play/graphics/`에 기존 B 심벌 기반 **512×512 RGBA PNG 아이콘**, 영어·한국어 **1024×500 RGB PNG 소개 그래픽**을 추가했다. 앱의 Space Grotesk Bold를 사용하고 이미지 직접 확인·크기/색상 형식/1MiB 이하 검사를 마쳤다. 기존 Playwright·Termux Chromium·ImageMagick으로 재출력한다. 소개 도형은 실제 앱 화면 캡처가 아니며 실제 기기 스크린샷은 별도로 필요하다.
- **APK/AAB 실제 빌드·출시 키 생성·서명·앱 설치·운영 브리지 변경은 하지 않았다.** 새 AAB 경로의 실제 컴파일·bundletool validate·서명·설치 검증은 요청받은 빌드 단계에서 수행해야 한다. 코드 23의 Play 사용 이력도 Console에서 확인한다. 기존 APK 개발 키를 Play 출시 키로 사용하지 않으며 새 앱 서명과 기존 APK 서명이 다르면 덮어 설치할 수 없다는 점을 문서화했다.
- **남은 출시 조건:** 조직 계정 인증 상태, 공개 개인정보처리방침과 앱 내 접근 경로, 데이터 보안 신고(로컬 처리·다른 앱 공유·AI 제공자 전송을 구분), Termux/선택적 CLI 설치의 실행 코드 정책 검토, 심사자가 재현할 앱 액세스/유효한 테스트 접근, `specialUse` FGS 신고·시연 영상, 실제 새 기기 설정/IME/알림/에이전트 검증. **조직 계정이므로 신규 개인 계정의 12명·14일 연속 비공개 테스트 요건은 적용하지 않는다.** 현재 target API 36은 2026-08-31부터 적용된 신규 제출 요구에 맞는다. 근거 링크는 출시 준비 문서에 모았다. 계정 답변 반영은 문서·등록 초안만 변경했으며 JSON·diff 검사로 확인했다. 추가 빌드·서명·업로드는 수행하지 않았다.

## 0.13.0 운영 브리지 적용 (2026-10-06, 현재 응답 후 재시작 예약)

- 사용자 `브리지 적용` 요청으로 운영 `~/.local/share/bibimer/`의 브리지·OpenCode/Claude 어댑터·Claude 복구 도구 네 파일을 **0.13.0** 소스와 일치하도록 설치했다. 파일 내용/SHA-256·0700 권한을 확인했고 이전 소스와 metadata는 저장소 밖 비공개 유지보수 폴더에 보관했다. Android 패키지 조회에서 사용자의 **앱 0.13.0/code 23 설치**도 확인했다. APK를 다시 빌드·설치하지 않았다.
- 이전 **`restart-0.12.0-cb3bf510` complete**와 운영 **0.12.0 / 프로젝트 2개 / 활성·영구 저장된 Codex Chat 2개**를 확인했다. 승인·대기열은 없었고 다른 대화는 ready, 현재 대화는 이 요청을 처리 중이었다. 이전 작업을 중복 실행하지 않았다.
- 독립 유지보수 작업 **`restart-0.13.0-4a8a393e`**을 예약했다. 포인터는 `~/.local/state/bibimer/maintenance/latest-restart.json`이다. 마지막 직접 확인은 **waiting_for_current_turn**, 운영 런타임은 **아직 0.12.0**이다. 현재 응답과 후속 대기 입력이 끝나 두 세션 모두 ready·대기열 0이 4초 유지된 뒤 재시작한다. **다음 작업은 먼저 해당 status.json과 인증된 health를 확인하고 pending인 동안 중복 예약하지 않는다.** 예약을 런타임 적용 완료로 보고하지 않는다.
- 두 대화를 같은 원본 thread ID·프로젝트/워크트리·권한/Fast/모델/effort·별칭/보관·선택 상태로 이어받는다. 승인 요청·다른 세션 활동/목록 변경·원본/옵션 변경에는 중단한다. 유지보수 작업은 추가 모델 턴이나 임의 승인을 보내지 않는다. 완료 시 버전/기능·인증·원본 복원·알림 feed·명령 목록에 더해 **handoff 미리보기의 읽기 전용 조회**까지 검증한다. 전달 내용을 전송하거나 새 handoff 세션을 만들지 않는다.
- 격리된 실제 **0.12.0 → 0.13.0** 전환에서 두 원본 대화·권한/Fast·프로젝트 선택·별칭/보관·인증 유지, 대기 메시지 처리 후 재시작, 유지보수 모델 턴 없음, 완료 feed·명령 목록·handoff 미리보기를 검증했다. 다른 대화에서 새 입력이 생기면 세션을 종료하지 않고 중단하는 검사도 통과했다. 로그: `.tools/test-restart-after-turn-0.13.0.log`, `.tools/test-restart-after-turn-0.13.0-abort.log`.
- 작업 폴더/실행 파일 0700, config/status/metadata 0600을 확인했다. 대화 이벤트·미리보기·자동 표시 제목은 일반 로그나 유지보수 snapshot 파일에 기록하지 않는다. 도우미: `.tools/stage-bridge-0.13.0.py`, `.tools/restart-after-turn-0.13.0.py`. 현재 운영 상태를 재검사하지 않고 이 일회성 도구를 재실행하지 않는다.

## 0.13.0 APK 빌드 완료 (2026-10-06)

- 사용자 `apk 빌드` 요청으로 앱 **0.13.0 / versionCode 23**, 내장 브리지 **0.13.0**을 빌드했다. 빈 공개 요약 카드 숨김, Agent summary / 에이전트 요약 표기, Codex·Claude·OpenCode 간 대화 이어가기/기존 세션 선택, 맥락 미리보기·편집·원본 링크를 포함한다. 아래 기능 구현 시점의 APK 대기 상태는 이번 빌드로 해소됐다.
- APK: **`/storage/emulated/0/Download/Bibimer-0.13.0.apk`**, 342,573바이트. SHA-256 `7c9f3e8b1e91fdf309672ecef891d484b433c20ac33487ec732756b43dda7d23`.
- 브리지 설치 파일: **`/storage/emulated/0/Download/bibimer-setup-0.13.0.sh`**, 62,123바이트. SHA-256 `4bdca88b23a61a7292672b041a62142f455252509d89bac7ac67e702272e5d43`. 기존 Download 버전들은 유지했다.
- APK v2/v3 서명·0.12.0 인증서 일치, 패키지/버전/SDK·알림 권한/서비스, DEX의 handoff 경로·기존 네이티브 기능, 내장 25개 asset 원본 일치, 설치 스크립트 문법·격리 추출된 네 파일/0700 권한/0.13.0 및 agent_handoff, 배포 복사본 해시를 확인했다. 자동 연결 페이로드는 65,977 UTF-16 단위로 제한 이내다.
- 기능 단계의 이어가기/렌더링·UI 검증에 이어 버전 변경 후 Handoff 6개·Setup 4개, 총 **10개 테스트 통과**. 로그: `.tools/build-0.13.0.log`, `.tools/tests-release-0.13.0.log`, `.tools/verify-release-0.13.0.log`, `.tools/verify-apk-0.13.0.json`.
- **APK 설치·운영 브리지 교체/재시작은 하지 않았다.** 빈 요약 카드 수정은 새 APK만으로 기존 0.12.0 브리지에서도 적용된다. 에이전트 간 이어가기에는 브리지 0.13.0 적용도 필요하다. 현재 운영은 0.12.0이며 이어가기 소스는 설치 파일에만 담았다.
- Codex 기본 모드 선택 질문 활성화, Claude/OpenCode 인증·제공자 오류, 동일 원본의 종료 실행 중복 표시 문제는 이번 빌드에서 수정한 항목이 아니다. 선택 질문 검증 결과·후속 제약은 아래 기록을 따른다. Android 설치 후 실제 화면/키보드 검증이 남아 있다.

## 빈 Activity summary 카드 수정 (2026-10-06, 소스 반영 / APK 대기)

- 사용자 제보를 확인한 세션에서 브리지의 요약 64개와 Codex 원본의 최근 공개 요약 64개 모두 본문이 없었다. UI가 빈 공개 요약 이벤트까지 접이식 카드로 만들던 문제를 수정했다.
- `conversation.js`에서 `summary: true`이고 본문이 없거나 공백뿐이며 단계도 없는 항목은 숨긴다. 기존 브리지·가져온 기록·진행/완료 상태에 공통 적용한다. 내부 항목과 대화 순서는 유지해 이후 본문이 오면 같은 위치에 표시하며, 숨겨진 카드는 스크롤 기준에서 제외한다. 일반 계획·도구 출력·파일 변경·답변은 그대로 표시한다.
- 표시명을 **Agent summary / 에이전트 요약**으로 바꿨다. 전체 작업의 별도 자동 요약을 생성하는 기능이 아니며 에이전트가 제공한 공개 요약만 표시한다. 원본 내부 추론을 대체 표시하지 않는다.
- 기존 `scripts/smoke_rendering.cjs`에 빈 과거/실시간 요약 64개, 본문 도착 시 원래 순서 표시, 다시 빈 본문이면 숨김, 영어·한국어 제목, 접기 상태·Markdown 유지, 일반 계획 유지, retained 정리/재번역 검증을 추가해 통과했다. 기존 렌더링·스크롤·모바일 배치 검사와 JS 문법·diff 검사도 통과했다. 로그: `.tools/render-empty-summary.log`.
- **APK 미빌드·운영 브리지 미변경**, 마지막 설치본은 0.12.0/code 22다. 이번 수정 자체는 앱 화면 변경이므로 다음 APK에 포함되며 별도 브리지 변경은 필요 없다. 앞서 구현한 에이전트 간 이어가기의 APK·브리지 적용 대기는 별개다.

## 설치된 Chat 선택 UI 검증 (2026-10-06, 운영 변경 없음)

- 사용자 `확인 진행` 요청으로 설치된 **앱 0.12.0/code 22의 base.apk**를 읽어 assets를 추출했다. `conversation.js`가 현재 소스와 동일함을 확인했다. `adb devices -l`에 연결된 기기가 없어 실제 Android WebView 화면 조작·IME·터치는 검증하지 못했다. 아래 UI 검사는 설치 APK의 실제 assets를 같은 폰의 headless Chromium에서 실행한 것이며 Android 네이티브 화면 검증과 구분한다.
- 운영에 설치된 0.12.0 브리지·어댑터를 별도 상태 폴더에 로드하고, 임시 프로젝트에서 실제 에이전트별 질문을 요청했다. **Codex의 기본 모드는 구조화된 질문 0건**이며 도구 사용 불가를 일반 텍스트로 답했다. 설치 CLI의 `codex features list`에서 `default_mode_request_user_input`은 **under development / false**였다. 질문 UI 구현만으로 기본 모드에서도 질문이 발생한다고 보장하면 안 된다.
- **격리된 Codex App Server 한 프로세스에만** `--enable default_mode_request_user_input`을 적용한 추가 검증에서는 실제 `item/tool/requestUserInput` 1건을 받았다. 해당 요청을 APK renderer에서 표시하고 한국어 선택 → 답변 제출 → 브리지 respond → 실제 모델의 `BIBIMER_QA_ACCEPTED` 확인까지 통과했다. 영어·한국어 320/393px, 선택만으로 미전송, 오프라인 버튼 비활성화를 검증했다. 운영 브리지 실행 인수·전역 config·사용자 권한은 바꾸지 않았다. **기본 모드에서 이 기능을 제공하려면 설치 CLI 호환성을 확인한 브리지 변경이 후속으로 필요하다.**
- 실제 **Claude는 인증 오류**, **OpenCode는 제공자 관련 오류**로 질문 전에 턴이 실패했다. 정상 로그인·모델 연결 상태에서의 실모델 질문 검증은 남는다. 오류 원문이나 자격 증명은 일반 로그에 기록하지 않았다.
- 별도로 세 에이전트 대역 → **운영에 설치된 브리지/어댑터** → **설치 APK renderer** → 답변 전달을 검사했다. Codex 단일 선택, Claude/OpenCode 두 항목 복수 선택과 응답 복귀가 통과했다. 처음 복수 선택 대역은 테스트의 고정 순서와 반대 순서로 클릭해 거절됐으며, 대역이 요구하는 Unit → UI 순서로 수정 후 모두 통과했다. 이를 실제 Claude/OpenCode 계정 모델 검증으로 확대하지 않는다.
- 검증 중 생성한 Codex 대화 두 개는 native archive로 보관했고 Claude/OpenCode 테스트 기록은 해당 제공자 API로 삭제했다. 기존 운영 프로젝트·세션을 생성/종료/전환하지 않았다. 종료 후 운영 health **0.12.0 / 프로젝트 2개 / 활성 세션 2개**를 확인했다. **APK 빌드·운영 설치·재시작·전역 설정 변경 없음.**
- 로그: `.tools/native-question-check.log`, `.tools/native-question-enabled.log`, `.tools/native-question-enabled-results.json`, `.tools/installed-question-fixtures.log`, `.tools/question-errors.log`. 검사 코드: `.tools/check-native-questions.py`, `.tools/check-enabled-native-questions.py`, `.tools/check-question-fixtures.py`, `.tools/check-installed-questions.cjs`. 화면: `dist/screenshots/installed-questions-*-en.png`, `*-ko.png` — 통제된 브라우저 화면이며 실제 Android 앱 캡처가 아니다.
- [공식 App Server 문서](https://learn.chatgpt.com/docs/app-server)의 `item/tool/requestUserInput` 요청/응답 경로를 확인했다. 기본 모드 기능 플래그 상태와 실제 동작은 설치된 CLI·위 네이티브 실험을 근거로 한다.

## 에이전트 간 대화 이어가기 선택 (2026-10-06, 소스 반영 / APK·운영 적용 대기)

- 사용자의 `agent cli 종류가 바뀌어도 세션을 이어나갈수있는 기능 필요` 및 `선택` 답변에 따라 Chat 에이전트 전환에 두 경로를 추가했다. **Continue & send**는 확인·편집한 대화와 다음 지시로 대상 에이전트의 새 네이티브 세션을 만들고, **Open … session without sharing**은 기존 대상 세션으로 돌아간다. 세션 관리에서도 **Continue with another agent**를 제공한다. Codex·Claude·OpenCode 여섯 방향을 지원하며 원본·기존 대상 세션·작성 중 초안을 유지한다.
- 새 세션은 원본과 같은 프로젝트·검증된 Git 워크트리 경로를 사용하고 대상 에이전트에 저장된 권한·모델·추론·Fast를 적용한다. **Open source**로 원본에 돌아간다. 첫 입력은 실제 다음 지시로 시작해 네이티브 미리보기에 내부 전달 안내문이 앞서지 않으며 초기 화면 제목도 다음 지시로 표시한다.
- 인증된 `POST /v1/sessions/{id}/handoff`의 preview/start 및 `agent_handoff` 기능을 추가했다. 미리보기는 완료된 사용자 입력·답변 중 최근 최대 24개/12,000 UTF-8 바이트만 가져오고 도구·추론·commentary·PTY를 제외한다. 다음 지시는 최대 4,000바이트이며 전송 시 native 첫 턴으로 전달한다. 미리보기·취소는 세션/모델 턴을 만들지 않는다. 원본의 응답·승인·대기열 처리 중에는 거절하며 revision으로 미리보기 이후 변경을 다시 확인한다.
- 불확실한 응답 유실은 같은 요청 ID/본문으로 **Check transfer / Retry**하여 중복 세션·턴을 막는다. 브리지 메타데이터에는 전달 본문을 저장하지 않고 출처·요청 digest/생성 ID만 유지한다. 원본/대상 native 기록에는 사용자가 전송한 내용이 남는다. 대상 native 세션 재개 시 출처 링크도 이어받는다. 브리지 재시작으로 원본 대화가 메모리에 없으면 원본 Chat을 먼저 이어서 열어야 한다.
- 전용 브리지 6개 테스트: 세 제공자의 여섯 방향, UTF-8 제한/부분 생략·비대화 제외, 승인·대기열·빈 대화·변경된 원본 거절, 잘못된 모델/입력 거절, 기존 대상 프로세스·실제 한글 Git 워크트리 보존, 응답 유실 재시도와 브리지 재시작 뒤 동일 요청 복원·출처 재개를 검증했다. 새 UI 통합 검사와 기존 전체 UI·라이브러리/알림 회귀 검사, Java 소스 컴파일·JS 문법 검사도 통과했다. 초기 전체 검사의 PTY 중단 타이밍 실패는 단독 재검사에서 통과했다. 전체 115개 검사에서 발견한 제목 초기화 회귀는 수정 후 전용 6개와 Library 8개 테스트로 재검사해 모두 통과했다.
- 로그: `.tools/test-handoff.log`, `.tools/test-handoff-all.log`, `.tools/test-handoff-all-rerun.log`, `.tools/test-handoff-interrupt.log`, `.tools/test-handoff-library.log`, `.tools/ui-handoff.log`, `.tools/ui-handoff-regression.log`, `.tools/ui-handoff-library.log`. 화면: `dist/screenshots/handoff-393-en.png`, `dist/screenshots/handoff-320-ko.png`. **실제 모델 요청 없이 격리 CLI/브라우저 대역으로 검증**했으며 새 APK 설치 후 Android WebView·IME 및 실제 모델로 전달된 맥락의 유용성을 확인해야 한다.
- **버전 0.12.0/code 22 유지, APK 미빌드·운영 소스 미설치·재시작 미실행**. 이 기능은 다음 APK와 브리지 소스를 함께 적용해야 한다. 현재 설치된 앱·운영 브리지는 아래의 0.12.0 릴리스 상태다.

## 0.12.0 운영 브리지 설치 (2026-10-06, 재시작 완료 확인)

- 사용자 `브리지 적용` 요청으로 운영 `~/.local/share/bibimer/`의 브리지·OpenCode/Claude 어댑터·Claude 복구 도구 네 파일을 **0.12.0** 소스와 일치하도록 설치했다. SHA-256·0700 권한을 확인했고 이전 소스와 metadata는 저장소 밖 비공개 유지보수 폴더에 보관했다. APK를 다시 빌드·설치하지 않았다. Android 패키지 조회에서 사용자가 **앱 0.12.0/code 22** 설치를 마친 것도 확인했다.
- 이전 `restart-0.11.2-eea24817`은 **complete**로 확인했으며 중복 실행하지 않았다. 적용 전 운영 런타임은 **0.11.2 / 프로젝트 2개 / 영구 저장된 Codex Chat 2개**였다. 다른 대화는 ready, 현재 대화는 이 요청 처리 중이며 확인 시 승인·대기열은 없었다.
- 독립 유지보수 작업 **`restart-0.12.0-cb3bf510`**은 이번 이어가기 작업 시작 시 **complete**로 확인했다. 인증된 health의 운영 런타임은 **0.12.0 / 프로젝트 2개 / 활성 Codex Chat 2개**다. 상태 기록의 복원 수 2개·`commands_catalog_verified: true`를 확인했다. 포인터는 `~/.local/state/bibimer/maintenance/latest-restart.json`이며 **재실행하거나 중복 예약하지 않는다.**
- 두 세션의 같은 원본 thread ID·권한/Fast/모델/effort·프로젝트/워크트리·별칭/보관·선택 상태, 동일 인증·완료 feed·명령 목록 조회를 유지보수 완료 검사에서 확인했다. 이번 에이전트 간 이어가기 소스는 운영 폴더에 설치하지 않았으며 APK도 새로 빌드하지 않았다.
- 유지보수 폴더/실행 파일 0700, config/status/metadata 0600이다. 이번 도우미는 대화 events 및 표시 제목이 포함된 health를 파일로 기록하지 않으며 config의 자동 display_title도 제외한다. 대화 출력·미리보기는 메모리에서만 검사한다.
- 격리된 실제 **0.11.2 → 0.12.0** 전환에서 두 원본 대화·권한/Fast·프로젝트 선택·별칭/보관·인증 유지, 대기 메시지 처리 후 재시작, 유지보수 모델 턴 없음, 완료 feed·명령 목록 API를 검증했다. 다른 대화에서 새 입력이 생기면 프로세스를 종료하지 않고 중단되는 경우도 통과했다. 로그: `.tools/test-restart-after-turn-0.12.0.log`, `.tools/test-restart-after-turn-0.12.0-abort.log`. 설치/도우미: `.tools/stage-bridge-0.12.0.py`, `.tools/restart-after-turn-0.12.0.py`. 이후 버전/운영 상태를 재검사하지 않고 이 일회성 도구를 재실행하지 않는다.

## 0.12.0 APK 빌드 완료 (2026-10-06)

- 사용자 `apk 빌드` 요청으로 앱 **0.12.0 / versionCode 22**, 내장 브리지 **0.12.0**을 빌드했다. 첫 글자 `/`에서 네이티브 스킬·명령 검색/선택/실행, Codex 대기열·Steer의 스킬 정보 유지, Claude 명령 결과 표시, OpenCode 명령 중 승인·중단 처리, 압축된 브리지 설치 페이로드를 포함한다.
- APK: **`/storage/emulated/0/Download/Bibimer-0.12.0.apk`**, 338,477바이트. SHA-256 `04d522756757c818f13c05c7a1776824544e7a60b9bd3353ec93f0a3208f0c0e`.
- 브리지 설치 파일: **`/storage/emulated/0/Download/bibimer-setup-0.12.0.sh`**, 59,803바이트. SHA-256 `8a13466459670524d1f794e3334e1f174162cdec7ab46b9160b80788ebf7a4cd`. 이전 Download 파일은 유지했다.
- v2/v3 서명·기존 0.11.3 인증서 일치, 패키지/버전/SDK/알림 서비스·권한, 내장 **25개 asset** 원본 일치, DEX의 명령 경로·asset 허용 목록과 알림/설치 버전 조회 코드를 검증했다. 설치 스크립트 문법·격리 추출 네 소스/0700 권한/브리지 버전·SHA-256, 자동 연결 페이로드 **63,657 UTF-16 단위(제한 220,000)**, Download 복사본 해시 일치를 확인했다.
- 기능 구현 때 전체 브리지 109개·명령 UI·기존 세션/알림 UI 회귀를 확인했다. 이번 버전 변경 후 명령 테스트 5개·Setup 테스트 4개 통과. 로그: `.tools/build-0.12.0.log`, `.tools/tests-commands-0.12.0.log`, `.tools/tests-setup-0.12.0.log`, `.tools/verify-release-0.12.0.log`, `.tools/verify-apk-0.12.0.json`.
- **APK 설치·운영 브리지 교체/재시작은 하지 않았다.** `/` 기능에는 앱과 브리지 0.12.0이 함께 필요하다. 운영 브리지 적용 시 기존 세션과 인증/원본 대화를 보존하는 유지보수 절차를 사용한다. 설치 후 실제 Android 키보드/IME·모델 명령/스킬·승인·알림 검증은 남아 있다.

## `/` 스킬·명령 입력 (2026-10-06, 0.12.0 빌드 포함 / 운영 적용 대기)

- 최신 요청: 입력 첫 글자가 `/`이면 현재 에이전트에서 사용 가능한 스킬·명령 목록을 표시하고 실행할 수 있도록 구현했다. **구현 직후에는 빌드·운영 적용하지 않았으며, 이후 명시적 요청으로 위 0.12.0 APK·설치 파일에 포함했다.** APK 설치와 운영 브리지 적용은 별도다.
- `commands.js`의 입력창 위 목록: 이름/설명 검색, 항목 선택 후 인자 입력, Enter/Tab 선택·화살표 이동·Escape/Android Back 닫기. 선택만으로 전송하지 않는다. Shift/Ctrl+Enter 줄바꿈·IME 확정 Enter·작은 입력 높이를 유지한다. 영어 기본·한국어 지원, 로딩/빈 목록/일부 스킬 오류/조회 실패·새로고침/구형 브리지 안내를 제공한다. 프로젝트·워크트리·에이전트·브리지 인스턴스별 캐시와 세션별 선택을 사용하며 늦게 도착한 다른 맥락의 목록으로 화면을 덮지 않는다.
- `POST /v1/commands`, health의 `slash_commands`: 현재 실제 프로젝트 경로 기준 네이티브 조회, 60초 캐시·동시 조회 잠금, 활성·유효 항목만 표시. 스킬 본문/명령 템플릿/인증 정보는 WebView로 보내지 않는다. Android 명령 목록 조회는 별도 executor로 실행한다.
- Codex `skills/list` → 전송 시 `$name` 텍스트 + `{type:skill,name,path}`. Claude SDK `supportedCommands()` → `/name` 입력이며 SDK가 제공하는 내장 명령도 포함한다. `/context`처럼 result만 있는 응답도 렌더링하고 명시적 SDK result 없이 정상 완료로 표시하지 않는다. OpenCode `GET /command` → `POST /session/:id/command`, 비동기 작업자로 승인/중단 채널을 유지하고 현재 messageID의 명시적 완료를 확인한다.
- 서버가 프로젝트·에이전트·스킬 경로로 만든 command ID를 검증한다. 임의 경로/다른 프로젝트 ID/이름 불일치를 거절한다. 명령 정보는 직접 전송·FIFO·Codex 직접/대기 메시지 Steer에 유지되며 대기열 공개 응답/디스크 메타데이터에는 내부 입력·경로를 추가하지 않는다. PTY 입력창에서 알려진 Codex 스킬만 `$name`으로 변환하고 나머지 CLI 명령 원문 및 직접 터미널 키는 유지한다.
- 기능 추가로 기존 비압축 설치 페이로드가 Android 자동 연결 전송 한도에 가까워졌다. `scripts/build_apk.py`가 zlib+base64로 네 소스를 포함하도록 수정했다. 압축 해제 후 기존 SHA-256 검증·0700 권한·파일 교체를 유지하며 테스트에서 실제 생성 스크립트를 격리 실행해 원본 네 파일·권한·손상 해시 거절·전송 크기 제한을 확인한다. 해당 생성물은 위 0.12.0 빌드에 포함했다.
- 검증: 설치된 Codex·Claude(관리형 실행 경로)·OpenCode에서 실제 네이티브 목록 조회 확인. 모델 입력/세션 시작은 수행하지 않았다. 전체 브리지 테스트 **109개 통과**(`.tools/test-slash-final.log`), `.tools/test-commands-final.log`에 명령별 테스트 5개, `.tools/ui-commands-final.log`에 Playwright 검색/선택/실제 구조화 스킬 전송/대기열/IME/줄바꿈/중복명 선택/지연·오류·구형 브리지/PTY 문법/Back 및 영어393px·한국어320px 결과가 있다. 기존 세션·프로젝트·워크트리·알림 이동 전체 UI 회귀는 `.tools/ui-slash-regression.log` 통과. Java 소스 컴파일 및 JS/Python 문법·diff 확인.
- 남은 실기기 검증: 새 APK·브리지 배포 뒤 Android 소프트 키보드/IME와 화면 크기 변화, 실제 계정으로 각 스킬·명령의 모델 응답·승인·중단·알림 확인. CLI 전용 대화형 메뉴 전체를 Chat에 지원한다고 표시하지 않는다. 실제 사용 가능한 목록은 설치된 CLI·프로젝트 설정에 따라 달라진다.

## 0.11.3 APK 빌드 완료 (2026-10-06)

- 사용자 `apk 빌드` 요청으로 앱 **0.11.3 / versionCode 21**을 빌드했다. 이전 알림에서 종료된 실행 대신 같은 원본 대화의 현재 실행을 선택하는 수정과 입력창 기본 높이 **54 → 39px**, 28px 버튼·여러 줄 확장·입력 삭제 후 한 줄 복원을 포함한다. 아래 두 기능의 APK 빌드 대기는 이번 배포로 해소됐다.
- APK: **`/storage/emulated/0/Download/Bibimer-0.11.3.apk`**, 354,797바이트. SHA-256 `9caf4ed9059d3b5a0cf9c81b7fbb0e63ca22958a90a82672d30b4a54876fecd3`.
- 함께 배포한 **`/storage/emulated/0/Download/bibimer-setup-0.11.3.sh`**는 기존 **브리지 0.11.2**를 포함한다. 215,571바이트, SHA-256 `8d0cb3ce0c8f80a0c09a5a6e3f09a3fca2d60e3a1d4e496caa51502bdebf26a5`. 브리지 소스는 변경하지 않았으며 기존 실행 0.11.2와 호환된다. 이전 Download APK/설치 스크립트는 유지했다.
- 빌드·v2/v3 서명·0.11.2 인증서 일치, 패키지/실제 설치 버전/SDK/알림 서비스·권한, 내장 24개 asset 원본 일치 및 새 알림 이동/입력 높이 코드 포함, 설치 스크립트 문법·격리 추출 네 파일/0700 권한/브리지 0.11.2, Download 복사본 해시를 확인했다. 기능 구현 시 알림 회귀 재현·전체 사이드바 UI 검증과 입력창 영어/한국어 320/393px 측정을 마쳤으며 이번 패키징 후 원본 일치·JS 문법·diff 검사를 완료했다.
- 로그: `.tools/build-0.11.3.log`, `.tools/verify-release-0.11.3.log`, `.tools/verify-apk-0.11.3.json`. **Android APK 설치·운영 브리지 변경/재시작은 하지 않았다.** 새 APK 설치 후 실제 알림 터치와 Android 키보드/폰트 확대 시 입력창 배치를 확인한다.

## 입력창 기본 높이 축소 (2026-10-06, 소스 반영 / APK 빌드 대기)

- 사용자 요청으로 공통 Chat/PTY 입력창의 한 줄 높이를 줄였다. 14px 글자·21px 줄 높이는 유지하고 textarea 최소 44px/상하 10px 여백을 제거해 상하 4px 여백으로 바꿨다. Send/Queue/Steer 버튼은 28px 높이로 정리하고 세로 stretch를 제거해 여러 줄에서도 버튼이 같이 늘어나지 않는다. 입력 영역 바깥 여백과 하단 네비게이션 간격은 유지한다.
- 기본 측정에서 textarea **44 → 29px**, 테두리/안쪽 여백을 포함한 입력 영역 **54 → 39px**다. 여러 줄은 기존 최대 100px까지 늘어나고 이후 스크롤한다. 비었을 때 placeholder 줄바꿈의 scrollHeight가 높이를 키우던 문제도 수정해 입력 삭제 후 한 줄 높이로 돌아온다. 긴 안내 문구는 한 줄 말줄임으로 표시한다.
- 격리 브리지·대역 CLI와 브라우저에서 영어/한국어, 320/393px, 빈 입력·한 줄·두 줄·긴 입력·삭제 후 복원, 응답 중 Queue/Steer를 측정했다. 두 줄 textarea 50px, 긴 입력 최대 100px, 삭제 후 29px, 버튼 28px 유지, 가로 넘침/페이지 오류 없음. 기존/변경 측정: `.tools/composer-before.log`, `.tools/composer-after.log`. 미리보기: `dist/screenshots/composer-compact-en.png`, `composer-compact-ko.png`, `composer-compact-queue-ko.png`. JS 문법·diff 검사 통과.
- **APK 미빌드·버전 유지·운영 브리지 미변경**. 마지막 APK 0.11.2에는 포함되지 않으며, 다음 명시적 APK 빌드에 알림 이동 수정과 함께 포함한다. 실제 Android 키보드/글꼴 확대 시 배치는 설치 후 확인한다.

## 알림 탭의 기존 대화 연결 수정 (2026-10-06, 소스 반영 / APK 빌드 대기)

- 사용자 제보에 따라 알림 이동 경로를 확인했다. 알림에는 브리지 실행 세션 UUID가 저장되는데 유지보수 재시작/원본 이어하기는 같은 네이티브 대화로 새 실행 UUID를 만들고 이전 실행을 종료 목록에 남긴다. 기존 UI는 알림의 이전 UUID를 그대로 선택해 빈 과거 출력·비활성 입력·Start session 화면으로 이동할 수 있었다. 운영 목록에서도 동일 원본 ID에 여러 종료 실행과 현재 실행이 함께 있는 것을 확인했다.
- `app.js`에서 알림 원본이 종료/유실 상태일 때 **동일 프로젝트·에이전트·Chat 방식·실제 프로젝트/워크트리 경로·external_thread_id**를 가진 유일한 실행 중/종료 중 세션으로 이동하도록 수정했다. 기존 알림도 ID를 원본 목록과 대조하므로 적용된다. 원본 실행이 살아 있으면 그대로 열며, 복사 세션(source_thread_id만 같은 경우)·다른 프로젝트/워크트리/에이전트·여러 후보는 임의 선택하지 않는다. 대체 실행이 없으면 해당 종료 기록을 열고 새 실행/원본 재개/모델 입력/승인을 자동 처리하지 않는다. 원본 목록에서 삭제된 알림은 기존 삭제 안내를 유지한다.
- 알림 조회 중 브리지 인스턴스가 바뀌면 연결 상태를 먼저 갱신하고 보관한 알림 대상을 다시 처리한다. 현재 입력 초안은 기존 세션별 저장을 사용하며 알림 이동은 기존 `/v1/project-session` 선택만 수행한다. 서버/Android PendingIntent 데이터/저장 기록은 변경하지 않았다.
- 격리 브리지·대역 CLI·브라우저에서 기존 코드가 이전 알림을 현재 원본 대화로 연결하지 못하는 회귀를 재현했다(`.tools/ui-notification-resume-before.log`). 수정 후 정상/보관된 이어받은 대화, 대화 기록 표시·입력 가능 상태, 다른 프로젝트 초안 유지, WebView 새 진입, 복사 세션 제외, 살아 있는 원본이 없을 때 종료 기록 유지, 알림 탭으로 세션 생성/재개/입력/승인 요청이 추가되지 않음을 확인했다. 통합 로그: `.tools/ui-notification-resume.log`. 기존 제목·프로젝트/워크트리·알림 설정/탭·세션 관리 통합 검증과 JS 문법·diff 검사도 통과했다.
- **APK 미빌드·운영 브리지 미변경**. 마지막 APK는 0.11.2이며 이번 수정은 다음 APK에 포함된다. 기존 0.11.2 브리지의 목록 정보를 사용하므로 이번 수정만을 위한 브리지 재시작은 필요 없다. 실제 Android 알림 터치와 Activity 복귀 동작은 새 APK 설치 후 확인한다.
- 이전 **restart-0.11.2-eea24817 complete**와 운영 health **0.11.2/프로젝트 2개/활성 Codex Chat 2개**를 확인했다. 동일 원본·권한·인증 유지, session_titles/완료 API 확인이 기록됐다. 재시작을 중복 예약하지 않았다.

## 0.11.2 APK 생성·브리지 업데이트 (2026-10-06)

- 사용자 요청으로 앱 **0.11.2 / versionCode 20**, 내장 브리지 **0.11.2**를 빌드했다. 세션 원본 제목/첫 입력 표시, 수동 이름 우선순위, 사이드바 두 줄 제목, 기존 기록의 읽기 전용 제목 조회·메모리 캐시, Android 별도 제목 조회 executor를 포함한다. 아래 제목 수정의 APK 대기 기록은 이번 빌드로 해소됐다.
- APK: **`/storage/emulated/0/Download/Bibimer-0.11.2.apk`**, 354,797바이트. SHA-256 `dd70413df863941f27619bc749bac942737194191372ddac2b580d07165a85fb`.
- 설치 스크립트: **`/storage/emulated/0/Download/bibimer-setup-0.11.2.sh`**, 215,571바이트. SHA-256 `8d0cb3ce0c8f80a0c09a5a6e3f09a3fca2d60e3a1d4e496caa51502bdebf26a5`. 기존 Download 버전들은 유지했다.
- v2/v3 서명·0.11.1 인증서 일치, 패키지/버전/SDK·알림 서비스와 권한, DEX의 제목 경로와 버전 조회, 내장 24개 asset 원본 일치, 설치 스크립트 문법·격리 추출된 네 파일/0700 권한/0.11.2와 session_titles, 배포 복사본 해시를 확인했다. 기능 단계 전체 104개 테스트·UI 통합 검증에 이어 버전 변경 후 Setup 4개·Library 8개·알림 9개를 통과했다. 로그: `.tools/build-0.11.2.log`, `.tools/verify-release-0.11.2.log`, `.tools/verify-apk-0.11.2.json`, `.tools/tests-release-0.11.2.log`.
- 이전 **restart-0.11.1-01f70335 complete** 및 운영 health **0.11.1/프로젝트 2개/활성 Codex Chat 2개**를 확인했다. 두 기존 원본 대화·권한·인증·알림 API가 유지됐다. 이전 작업을 중복 실행하지 않았다.
- 운영 `.local/share/bibimer`의 브리지·두 어댑터·Claude 복구 도구를 이번 **0.11.2** 소스와 일치하도록 설치했다. 이전 소스/metadata는 저장소 밖 비공개 유지보수 폴더에 보관했다. 현재 대화가 운영 브리지의 자식이므로 즉시 종료하지 않고 독립 작업 **`restart-0.11.2-eea24817`**을 예약했다. 마지막 직접 확인 상태는 **waiting_for_current_turn**, 실행 버전은 **아직 0.11.1**이다.
- 포인터 `~/.local/state/bibimer/maintenance/latest-restart.json`의 status를 다음 작업에서 먼저 확인한다. 현재 응답과 추가 대기열이 정상 처리되어 ready/대기열 0이 4초 유지되면 재시작하며 두 세션을 같은 원본 ID·권한/Fast/모델/effort·프로젝트/워크트리·별칭/보관·선택 상태로 이어받는다. 마지막 확인 당시 현재 대기열 0, 다른 세션 ready·승인 없음. 다른 세션 변경/승인 요청 등은 기존 보호 조건으로 중단하며 새 모델 입력/임의 승인은 보내지 않는다. config/status/metadata 0600, 폴더/실행 파일 0700.
- 격리된 실제 **0.11.1 → 0.11.2** 전환에서 큐 후속 입력이 먼저 끝난 뒤 재시작, 두 원본 대화·권한/Fast/선택/별칭/보관/인증 보존, 유지보수 추가 모델 턴 없음, session_titles/완료 API를 확인했다. 로그 `.tools/test-restart-after-turn-0.11.2.log`. 새 APK는 생성·배포만 했으며 Android 설치와 실제 WebView 제목 표시는 사용자 설치 후 확인한다. 예약 완료를 운영 런타임 전환 완료로 보고하지 않는다.

## 세션 목록 제목 수정 (2026-10-05, 소스 반영 / APK·브리지 적용 대기)

- 기존 목록은 수동 별칭인 `title`만 사용해, 이름을 바꾸지 않은 세션이 에이전트·시각·ID로 표시됐다. 운영 목록도 수동 제목 0건으로 확인했다. **수동 이름 → 원본 에이전트 제목/미리보기 → 첫 구조화된 사용자 입력 → 기존 식별 문구** 순으로 표시하도록 수정했다. 사이드바·현재 세션 제목·관리 화면에 공통 적용하며 긴 제목은 사이드바에서 두 줄로 표시한다. 한글·이모지·HTML 모양의 문자열은 일반 텍스트로 유지한다.
- Chat 시작/가져오기에서 원본 `name`/`preview`를 받고, 제목 없는 대화는 첫 native `userMessage`로 표시한다. 인증된 `GET /v1/sessions/{id}/title`와 `session_titles` 기능을 추가했다. 사이드바를 열 때 기존/종료/보관 세션도 native `thread/read(includeTurns:false)`로 읽고 60초간 캐시한다. 원본 ID·프로젝트/워크트리 경로·ephemeral 여부를 검증하며 모델 입력/재개/승인을 보내지 않는다. 없는 기록·조회 실패는 기존 식별 문구를 유지한다.
- 자동 `display_title`은 브리지/화면 메모리에만 유지하고 metadata의 세션 목록·선택 세션 양쪽에서 제외한다. 브리지 재시작 후 사이드바에서 원본으로 재조회하며 수동 이름은 기존 방식으로 보존한다. 삭제 시 브리지 캐시를 정리하고 연결 해제/인스턴스 변경 시 화면 캐시를 비운다. 늦은 제목 응답은 제목만 병합해 실행 상태·입력 초안을 덮어쓰지 않는다.
- Android 로컬 요청 허용 목록에 제목 경로를 추가했다. 제목 조회는 별도 단일 executor에서 실행해 메시지 전송/승인·이벤트 polling을 기다리게 하지 않는다. 앱 종료 시 executor도 정리한다.
- **전체 브리지 104개 테스트 통과**, Library 8개·Setup 4개, 브라우저 전체 사이드바/프로젝트/알림 통합 검증, Android Java 소스 컴파일·JS 문법 검증을 완료했다. 제목 우선순위·첫 입력 고정·메타데이터 본문 미포함·종료 기록 조회·세 제공자 경로/권한·캐시·잘못된 원본 거절, 실제 격리 브리지와 대역 CLI의 제목 조회, HTML 비실행·한글/이모지·320px 두 줄 표시를 검증했다. 기존 프로젝트/워크트리 전환·초안/승인·보관/삭제·알림 이동도 통과했다.
- 로그: `.tools/tests-session-titles-all.log`, `.tools/tests-session-titles.log`, `.tools/tests-session-titles-setup.log`, `.tools/ui-session-titles.log`, `.tools/java-session-titles.log`. 화면: `dist/screenshots/session-title-320-ko.png`. **APK 미빌드·버전 유지·운영 소스 미변경**이며 새 APK와 이번 브리지 소스를 함께 적용해야 한다. 현재 0.11.1 APK에는 이번 제목 수정이 없다. Android WebView 실기기 표시는 다음 빌드 설치 후 확인한다.
- 이전 요청의 운영 브리지 **0.11.1 재시작 예약은 별개로 유지**했다. 이번 턴 중 확인은 `restart-0.11.1-01f70335: waiting_for_current_turn`, 실행 런타임 0.11.0/활성 2개다. 해당 작업은 이번 턴 완료 후 이전에 설치한 0.11.1을 적용하며 이번 제목 변경은 포함하지 않는다. 다음 작업에서 먼저 유지보수 status를 확인하고 중복 예약하지 않는다.

## 0.11.1 운영 브리지 설치 (2026-10-05, 대기 메시지 처리 후 재시작 예약)

- 사용자 `브리지 설치` 요청에 따라 `.local/share/bibimer`의 브리지·OpenCode/Claude 어댑터·Claude 복구 도구 네 파일을 **0.11.1** 소스와 일치하도록 설치했다. SHA-256/0700 권한을 확인했고 이전 파일과 metadata는 비공개 유지보수 폴더에 보관했다. 설치된 Android APK는 **0.11.1/code 19**이며 Download 배포본 해시와 일치한다. APK를 다시 빌드/설치하지 않았다.
- 확인 당시 실행 중 브리지는 **0.11.0, 프로젝트 2개, 활성 Codex Chat 2개**였다. 두 대화 모두 영구 저장, 서로 다른 원본 thread ID를 확인했다. 현재 대화가 브리지의 자식이라 즉시 재시작하지 않았다. 처음 검사 이후 현재 세션에 사용자 후속 메시지 **1개가 대기열에 추가**됐으므로 입력을 보존하고 처리 완료까지 기다리도록 했다. 다른 세션은 ready, 승인/대기열 없음이다.
- 독립 작업 **`restart-0.11.1-01f70335`**를 실행했다. 포인터: `~/.local/state/bibimer/maintenance/latest-restart.json`. 최종 직접 확인 상태는 **waiting_for_current_turn**, 실행 런타임은 **아직 0.11.0**이다. **다음 작업에서는 먼저 해당 status.json을 읽고, pending인 동안 중복 재시작/예약을 하지 않는다.** complete이면 인증된 health 버전·세션 수를 확인한다.
- 이번 config는 `wait_for_queue:true`다. 현재 세션의 대기 입력/이어지는 턴은 처리하게 두고, 모든 대상 세션이 ready·대기열 0으로 4초간 안정된 뒤 재시작한다(최대 30분). 다른 세션의 입력/상태 변화, 권한/원본 thread/활성 목록 변경, 승인 요청이 생기면 작업을 중단한다. 대기열이 일시정지된 채 남으면 임의로 재개/삭제하지 않고 기다린다. 실행 중인 턴을 중단하거나 메시지를 버리지 않는다.
- 두 세션을 **같은 원본 대화로 resume**하고 프로젝트/워크트리·권한/Fast/모델/effort·별칭/보관·선택 상태와 인증을 유지한다. 새 세션 UUID를 만들고 이전 실행은 종료 기록으로 남는다. 추가 모델 입력·승인 처리는 하지 않는다. 버전·기능·완료 API를 점검한 뒤 status complete를 기록한다. 실패하면 정제된 reason/last_stage와 비공개 restored-sessions.json으로 이미 복원된 세션을 확인한다.
- 격리 테스트에서 **0.11.0 → 0.11.1**, 두 원본 대화·권한/Fast·프로젝트 선택·별칭/보관·인증 유지, 추가 유지보수 모델 턴 없음, 완료 feed를 확인했다. 별도 테스트에서는 현재 턴 뒤에 **예약된 후속 입력이 먼저 완료되고 나서 재시작**되는 것을 검증했다. 로그: `.tools/test-restart-after-turn-0.11.1.log`, `.tools/test-restart-after-turn-0.11.1-queue.log`. 운영 작업 폴더/실행 파일 0700, config/status/metadata/latest 0600이다.

## 0.11.1 APK 빌드 완료 (2026-10-05)

- 사용자 `apk 빌드` 요청으로 앱 **0.11.1 / versionCode 19**, 내장 브리지 **0.11.1**을 빌드했다. 알림 본문/확장 본문의 실제 답변 미리보기(최대 180자), 프로젝트 제목과 세션 보조 문구, 서식 정리·최종 답변 선택·OpenCode 턴 연결을 포함한다. 아래 미리보기 구현의 빌드 대기 기록은 이번 APK에 포함됐다.
- 설치 파일: **`/storage/emulated/0/Download/Bibimer-0.11.1.apk`**, **350,701바이트**. 브리지 설치 파일: **`/storage/emulated/0/Download/bibimer-setup-0.11.1.sh`**, **211,995바이트**. 기존 0.11.0 파일은 유지하고 `dist/bibimer-debug.apk`/`dist/bibimer-setup.sh`와 각각 동일한 복사본을 저장했다.
- APK SHA-256: `8bc09883e82eccd6204de81e307ea7a9689fc507febf8b83bf01fc79ef40ac41`. 설치 스크립트 SHA-256: `d9db46aae75148a1aa517c44f0f13fbd9c253fdbeb343067db583c59eb5bb15e`.
- 빌드·v2/v3 서명·0.11.0 인증서 일치, 패키지/버전/SDK/알림 서비스·권한, DEX의 preview/세션 보조 문구/설치 버전 조회, 내장 **24개 asset 원본 일치**, 설치 스크립트 문법·격리 추출된 네 소스/0.11.1/0700 권한·Download 복사본 해시를 확인했다.
- 기능 구현 시 전체 101개·Java 검증을 완료했고, 이번 버전 변경 후 Setup 4개·알림 9개 테스트를 통과했다. 로그: `.tools/build-0.11.1.log`, `.tools/tests-release-0.11.1.log`, `.tools/verify-release-0.11.1.log`, `.tools/verify-apk-0.11.1.json`.
- **APK 설치·운영 브리지 적용/재시작은 하지 않았다.** 운영 브리지는 마지막 확인한 0.11.0이며 실제 답변 미리보기에는 0.11.1 브리지도 필요하다. 현재 대화·기존 프로세스·설정은 변경하지 않았다. 새 버전 설치 후 실제 Android 미리보기/확장/잠금 화면을 확인해야 한다.

## 응답 완료 알림의 답변 미리보기 (2026-10-05, 소스 반영 / APK·브리지 적용 대기)

- 사용자 요청으로 일반 `Response complete` 문구 대신 **완료된 답변 앞부분 최대 180자**를 표시하도록 수정했다. 별도 모델 요약은 호출하지 않는다. Android 알림 제목은 프로젝트 이름, 보조 문구는 세션 이름/에이전트, 본문·확장 본문은 답변 미리보기다. 텍스트가 없거나 구형 브리지가 preview를 제공하지 않으면 일반 완료 문구로 돌아간다. 잠금 화면 공개 버전은 BIBIMER·일반 완료 문구만 유지한다.
- 브리지 완료 feed에 `preview`를 추가했다. 현재 턴의 완료된 `agentMessage`만 사용하며 Codex `final_answer`를 우선하고 `commentary`를 제외한다. 단계가 없는 Claude/OpenCode/이전 Codex는 해당 턴의 마지막 완료된 assistant 텍스트를 사용한다. 사용자 입력·추론·도구/명령 출력·이전 턴/가져온 기록·미완료 스트림은 후보가 아니다. 명시적 최종 답변 뒤의 단계 미상 메시지로 덮어쓰지 않는다.
- 턴별 짧은 미리보기를 유지해 최근 대화 200개 한계에 걸려도 마지막 답변을 잃지 않으며 턴 종료/새 턴 시작에서 비운다. Markdown 제목/목록/강조/링크/코드 구분 기호, ANSI/제어 문자를 정리하고 공백을 합친다. 한국어·이모지를 유지하고 긴 발췌는 말줄임표로 끝낸다. Native에서도 코드 포인트 기준 길이를 제한한다.
- OpenCode는 native parent message ID와 브리지 turn UUID가 달라, 어댑터가 현재 prompt 소속 항목에만 `responseTurnId`를 명시한다. 기존 대화 화면의 native 그룹 ID는 바꾸지 않는다. 이전 메시지를 현재 알림으로 발췌하지 않는다.
- 사용자 지시를 반영해 AGENTS의 본문 미포함 지침을 짧은 답변 미리보기 허용으로 수정했다. 발췌는 브리지 메모리의 최근 512개 완료 목록에만 추가되며 metadata/일반 로그/Android cursor preferences에 저장하지 않는다. 별도 인증 정보를 추가하지 않는다. 설정 안내도 영어·한국어로 갱신했다.
- **전체 브리지 테스트 101개 통과**, 알림 관련 9개, Android 전체 Java 컴파일·JS 문법·diff 검사 통과. 신규 검증은 Markdown/한국어/이모지/제어 문자/길이, final과 commentary 구분, 기록/도구/추론 제외, 200개 항목 제거 후 유지, 다음 턴 미리보기 초기화, OpenCode ID 연결을 포함한다. Claude/OpenCode 실제 어댑터 대역에서 대기 응답 3건의 미리보기 3건도 검증했다. 자동 Setup payload는 **215,849 UTF-16 단위**로 220,000 한도 이내다.
- 로그: `.tools/tests-notification-previews-all.log`, `.tools/tests-notification-previews.log`, `.tools/java-notification-previews.log`. **APK 미빌드·운영 브리지 미변경**. 설치된 앱·브리지 0.11.0은 아직 일반 완료 문구를 사용하며 새 APK와 브리지 적용이 모두 필요하다. 실제 Android 알림 미리보기/확장/잠금 화면은 다음 설치 후 검증한다.
- 이전 실제 응답 테스트 **response-1cc4e580**의 독립 관찰 결과는 `completion_event_seen`, event ID 1, 해당 세션 일치 이벤트 1개였다. 브리지 이벤트 생성은 확인했지만 관찰 작업은 Android 표시 자체를 검사하지 않으므로 `android_delivery_verified:false`를 유지한다.

## 0.11.0 적용 확인 및 실제 응답 알림 테스트 (2026-10-05)

- `restart-0.11.0-1d3f2ae2/status.json`의 **complete**와 운영 health **0.11.0·활성 세션 2개·프로젝트 3개**를 확인했다. 두 원본 대화·권한·페어링 유지 및 완료 API 검증이 기록됐고 `response_notifications` 기능을 실제 제공한다. 아래 재시작 예약 기록은 완료됐다. 같은 작업을 다시 예약하지 않는다.
- Android 사용자 0의 설치 `base.apk`를 읽어 **0.11.0/code 18**, POST_NOTIFICATIONS 선언과 Download의 0.11.0 APK SHA-256 일치를 확인했다. APK 설치도 완료된 상태다.
- 사용자 `노티피케이션 테스트` 요청에 현재 실제 Codex 답변의 정상 완료를 테스트 이벤트로 사용한다. 별도의 모델 입력·다른 세션 변경·가짜 알림 게시·권한 자동 허용은 하지 않았다. 운영 완료 feed의 시작 cursor는 0이었다.
- 비공개 `~/.local/state/bibimer/notification-tests/latest.json` → **response-1cc4e580**에 현재 답변의 완료 이벤트를 기다리는 독립 관찰 작업을 시작했다. 최종 확인 시 `waiting_for_response`. 답변 완료 후 `status.json`이 `completion_event_seen`인지 확인할 수 있다. 180초 한도이며 세션 ID와 일치하는 완료 메타데이터만 확인한다. `android_delivery_verified:false`는 Android 표시 확인과 구분하기 위한 값이다.
- ADB 연결 기기가 없고 Termux UID의 dumpsys는 DUMP 권한 부족으로 거절됐다. 알림 권한의 실제 허용 상태·채널·서비스·화면 표시를 직접 확인했다고 보고하지 않는다. 실제 알림함/잠금 화면 표시와 탭은 사용자 확인이 필요하다. 빌드·코드 변경·재시작은 추가 수행하지 않았다.

## 0.11.0 운영 브리지 적용 (2026-10-05, 현재 응답 후 재시작 예약)

- 사용자 `브리지 적용` 요청에 따라 운영 `.local/share/bibimer`의 브리지·두 어댑터·Claude 복구 도구 네 파일을 0.11.0 소스와 일치하도록 교체하고 SHA-256/0700 권한을 확인했다. 이전 파일과 메타데이터는 저장소 밖 비공개 유지보수 폴더에 보관했다. APK는 다시 빌드/설치하지 않았다.
- 확인 시 운영 브리지는 **0.10.0, 프로젝트 3개, 활성 Codex Chat 2개**다. 현재 Codex 대화가 브리지의 자식 프로세스이고 다른 하나에도 실제 대화 1턴이 있으므로 즉시 재시작하지 않았다. 두 세션의 서로 다른 원본 thread ID와 영구 저장, 대기 승인/대기열 없음, 다른 세션 ready를 확인했다.
- 독립 실행 작업 **`restart-0.11.0-1d3f2ae2`**를 시작했다. `~/.local/state/bibimer/maintenance/latest-restart.json`에 작업 폴더와 PID를 기록했다. 마지막 직접 확인 상태는 **`waiting_for_current_turn`**이며 런타임은 여전히 0.10.0이다. **다음 작업 때 이 포인터의 `status.json`과 인증된 health를 읽어 완료 여부를 확인해야 한다. 완료 확인 없이 재시작을 중복 예약하지 않는다.**
- 작업은 이번 턴 종료와 4초 안정된 ready 상태를 기다린다. 새 사용자 항목/새 턴/다른 세션의 입력/권한 변경/승인/대기열/활성 목록 변화가 있으면 중단한다. 보존된 항목 수가 200개에서 잘려도 오판하지 않도록 사용자 항목 ID와 다른 세션의 revision을 검사한다. 대화 본문·토큰은 일반 로그에 기록하지 않는다.
- 종료 후 0.11.0 브리지를 실행하고 두 세션 모두 동일 원본 대화로 resume한다. 프로젝트/워크트리 경로·권한/Fast/모델/effort·별칭/보관·선택 프로젝트/에이전트를 복원하고 완료 알림 API와 `response_notifications`/`project_management` 기능을 확인하도록 구성했다. 세션 UUID는 새로 생기고 이전 실행은 종료 기록으로 남는다. 추가 모델 입력·승인 처리는 하지 않는다. 원본 출력은 네이티브 저장 기록에서 읽으며 PTY 복원으로 표시하지 않는다.
- 격리된 실제 0.10.0 → 0.11.0 테스트 브리지와 Codex 프로토콜 대역으로 **두 원본 대화·권한/Fast·프로젝트 선택·별칭/보관 유지, 추가 모델 턴 없음, 완료 API**를 검증했다. 다른 세션에 새 입력이 도착할 때 프로세스를 종료하지 않고 중단하는 테스트도 통과했다. 대역이 두 프로젝트에 같은 원본 ID를 쓰던 문제는 프로젝트별 ID로 보완해 실제 충돌 방지를 우회하지 않고 검증했다. 로그: `.tools/test-restart-after-turn-0.11.0.log`, `.tools/test-restart-after-turn-0.11.0-abort.log`.
- 비공개 상태: 작업 폴더 0700, config/status/metadata/latest 0600, 실행 helper 0700. 완료 시 상태에 `complete`, `version:0.11.0`, `restored_session_count:2`, `restored_same_threads`, `permissions_preserved`, `pairing_preserved`, `completion_feed_verified`가 남는다. 실패 시 `last_stage`/정제된 `reason`과 `restored-sessions.json`을 확인하고 이미 복원된 실행을 중복 생성하지 않는다.

## 0.11.0 APK 빌드 완료 (2026-10-05)

- 사용자 요청으로 앱 **0.11.0 / versionCode 18**, 내장 브리지 **0.11.0**을 빌드했다. 정상 Chat 응답 완료 Android 알림·알림 설정/권한 안내·프로젝트 설정/이름 변경/등록 해제·Settings의 실제 설치 버전 표시를 포함한다. 아래 각 구현 기록의 ‘APK 빌드 대기’는 당시 상태이며 이번 APK에 포함됐다.
- 설치 파일: **`/storage/emulated/0/Download/Bibimer-0.11.0.apk`**, **350,701바이트**. 브리지 설치 파일: **`/storage/emulated/0/Download/bibimer-setup-0.11.0.sh`**, **208,463바이트**. `dist/bibimer-debug.apk`, `dist/bibimer-setup.sh`와 각각 SHA-256 일치한다. 기존 0.10.0 파일은 유지했다.
- APK SHA-256: `20a71fe5be9c89711294f63e0f3ad9d8e525f971c3312bcadeb32d13d150398d`. 설치 스크립트 SHA-256: `e6132162f990b39be6663d51791b887767a4d09613fb96d96cdc023ca87a327b`.
- v2/v3 서명·기존 0.10.0 인증서 일치, 패키지/버전/SDK/BIBIMER 이름, 알림·foreground service 권한/비공개 서비스/사유, DEX의 알림 서비스·설정·버전 조회 포함, **내장 24개 asset 원본 일치**를 확인했다. 설치 스크립트 문법·격리된 임시 폴더의 네 소스 추출/0.11.0 버전/0700 권한을 확인했다.
- 기능 구현 시 전체 브리지 97개·알림/사이드바 UI·Java 검증을 완료했다. 이번 버전 변경 후 Setup 4개·완료 알림 5개 테스트를 다시 검증했다. 로그: `.tools/build-0.11.0.log`, `.tools/tests-release-0.11.0.log`, `.tools/tests-notifications-release-0.11.0.log`, `.tools/verify-release-0.11.0.log`, `.tools/verify-apk-0.11.0.json`.
- 알림 테스트 재실행에서 자식 프로세스 종료와 브리지의 `exited` 상태 반영 사이 경합이 드러났다. 테스트가 condition으로 최종 상태를 기다리도록 보완한 뒤 알림 5개가 통과했다. 제품 소스·APK 동작 변경은 없다.
- **APK 설치·운영 브리지 업데이트/재시작은 하지 않았다.** 운영 브리지는 마지막 적용한 0.10.0이며 완료 알림·프로젝트 관리에는 0.11.0 설치/재시작도 필요하다. 자동 Setup 연결은 기존 브리지를 업데이트하지 않는다. 진행 중인 세션·인증·설정은 변경하지 않았다.
- 실제 기기 알림 권한 거절/복구·홈/잠금·최근 앱 제거·알림 탭(앱 실행/종료 상태)·절전·여러 프로젝트 연속 완료와 Android WebView 동작은 설치 후 검증한다. 빌드/서명/브라우저 대역 결과만으로 실제 알림 전달을 보장하지 않는다.

## 각 응답 완료 알림 (2026-10-05, 소스 반영 / APK·브리지 적용 대기)

- 사용자 요청에 따라 모든 프로젝트·세션의 Codex·Claude·OpenCode Chat 정상 응답 완료마다 Android 알림을 게시하는 소스를 추가했다. 보관한 세션·다른 워크트리·연속 대기열도 포함한다. 실패·중단·승인 대기·초기 ready·과거 대화 가져오기·PTY 출력은 완료로 추측하지 않는다.
- 브리지에 `response_notifications` 기능 표시와 인증된 `GET /v1/completions?cursor=N&instance=UUID|none&wait=0..20`를 추가했다. 명시적인 현재 턴 완료마다 전역 ID를 발행하며 최근 512건의 메타데이터만 메모리에 저장한다. 본문·명령·토큰은 포함하지 않는다. 처음 구독·브리지 인스턴스 변경은 현재 cursor로 기준을 맞추며 과거 완료를 재생하지 않는다. 재접속은 cursor 이후를 읽고 범위를 넘으면 `gap`을 표시한다. 현재 프로젝트·세션 이름을 붙이며 삭제된 대상은 제외한다.
- Android `ResponseNotificationService`는 UI와 별도 HTTP 연결로 완료를 확인한다. POST_NOTIFICATIONS 및 foregroundService specialUse 권한/유형/사유, 흰색 터미널 알림 아이콘, 완료/지속 알림 채널을 추가했다. 화면이 보이는 Activity에서 브리지 연결·기능 지원·허용된 알림을 확인한 뒤 시작한다. 지속 알림에 **Turn off alerts**를 제공하고 앱을 닫아도 에이전트는 유지한다. 서비스는 START_NOT_STICKY이며 앱/서비스 강제 종료 후에는 앱을 다시 열어 연결해야 한다.
- Settings에 **Response notifications** 토글·권한/연결 상태·Android 알림 설정 버튼을 추가했다. 기본은 켜짐이며 Android 13 이상에서 첫 연결 후 한 번 권한을 요청한다. 거절해도 대화를 막지 않고 자동 재요청하지 않는다. 토글/허용 상태는 네이티브 설정에서 읽는다. 기능 없는 브리지는 업데이트 안내를 표시한다. 영어 기본·한국어 추가 지원한다.
- 완료 알림에는 프로젝트 이름과 응답 완료·세션 별칭/에이전트만 표시한다. 잠금 화면 공개 버전은 BIBIMER·응답 완료만 포함한다. immutable explicit Activity PendingIntent로 프로젝트/세션 ID를 전달하고, 새 앱 화면의 연결 후 또는 onNewIntent로 해당 세션에 이동한다. 현재 초안·대기 승인·실행 프로세스를 유지하고 시작/복원/승인을 자동 실행하지 않는다. 삭제된 세션은 안내한다.
- 앱은 private preferences에 인스턴스/cursor를 기록하고, 비활성/권한 차단/연결 삭제 시 지운다. 세대 번호와 잠금으로 늦은 poll이 초기화된 cursor를 다시 쓰지 못하게 한다. 고정 알림 tag·OnlyAlertOnce·cursor로 정상 재접속 중복을 방지하지만 알림 게시/디스크 저장의 강제 종료 경계에서 정확히 한 번 전달을 보장하지 않는다. 완료 알림함은 최근 40건으로 제한한다.
- **브리지 전체 97개 테스트 통과**: 신규 5개는 초기/재시작 기준, long poll, 512건 한계, FIFO별 완료/중복, 본문 미포함, 실패/중단/오래된 턴, 프로젝트/보관/이름/삭제, 인증·잘못된 cursor·PTY 제외를 검증한다. 기존 Claude/OpenCode 대기열 통합 테스트에서도 실제 어댑터의 응답 3개 → 완료 이벤트 3개를 확인했다. 자동 Setup 설치 payload 한계 검증도 통과했다.
- `scripts/smoke_library.cjs`를 확장해 알림 켜기/끄기·권한 거절/허용·구형 브리지·영어/한국어 320px·알림 대상 세션 이동·Pause/Resume·삭제된 대상·초안/승인/프로세스 유지·새 페이지 연결 후 대상 소비·설정 저장을 검증했다. **브라우저 네이티브 대역으로 확인한 결과이며 실제 Android 알림 수신 검증은 아니다.** 기존 프로젝트 관리/사이드바 회귀도 통과했다.
- Android 리소스 링크/전체 Java 컴파일과 JS 문법·diff 검증 완료. APK 서명·패키징은 하지 않았다. 로그: `.tools/tests-response-notifications.log`, `.tools/ui-notifications.log`, `.tools/java-notifications.log`. 화면: `dist/screenshots/notifications-320-en.png`, `notifications-320-ko.png`.
- **새 APK 미빌드·운영 브리지 미변경**. 현재 설치 앱/브리지는 0.10.0이며 이 기능에는 다음 APK와 새 브리지 모두 필요하다. 프로젝트 관리 메뉴·Settings 버전 표시 수정도 함께 적용 대기다. 다음 빌드 후 실제 알림 권한 거절/복구, 완료 알림 탭(앱 실행/종료 상태), 홈·잠금·최근 앱 제거·Android 서비스 중지·절전·여러 세션의 연속 완료를 확인해야 한다. Termux/OS/OEM 절전·프로세스 종료로 인한 전달 지연/누락을 아직 보장하지 않는다.

## 프로젝트 관리 메뉴 (2026-10-05, 소스 반영 / APK·브리지 적용 대기)

- 사이드바의 **각 프로젝트 이름 옆 ⋯ → Project settings(프로젝트 설정)**을 추가했다. 접힌 프로젝트에서도 열 수 있으며 프로젝트 이름 변경·폴더 경로 확인/복사·등록 해제를 제공한다. 기존 ↗ 프로젝트 열기와 세션별 ⋯는 유지한다. 긴 프로젝트 이름은 두 줄로 제한하고 메뉴의 접근성 이름에 전체 이름을 포함한다.
- 등록 해제는 확인창을 거쳐 해당 프로젝트와 BIBIMER 세션 목록만 제거한다. 실제 프로젝트 파일·Git 워크트리·에이전트 원본 기록은 유지한다. 보관된 세션·다른 워크트리·다른 에이전트를 포함한 실행 중/종료 중 세션이 하나라도 있으면 UI·서버 모두 거절하며 자동 종료하지 않는다. 프로젝트 이름 변경은 실행 프로세스와 실제 경로를 바꾸지 않는다. 폴더 이동/경로 변경 기능은 추가하지 않았다.
- 인증된 `POST /v1/project/manage`와 `project_management` 기능 표시, Android 경로 허용을 추가했다. 이름은 120자 이내로 제한하고 양끝 공백을 제거하며 빈 이름·제어 문자를 거절한다. 등록 해제 시 선택 포인터·세션 목록·별칭·캐시를 정리하고 늦은 시작 요청의 재실행을 차단한다. 작업 중 등록 해제와 실행 준비가 경합해도 등록되지 않은 폴더에서 세션을 시작하지 않는다.
- 메뉴 편집 중 polling이 입력을 덮어쓰지 않는다. 대상 프로젝트 ID를 고정하고 작업 중 이전 polling 결과를 버린다. 다른 프로젝트를 관리해도 현재 대화·입력 초안·대기 승인을 유지한다. 삭제 실패는 확인창 안에 표시하며 취소·재시도를 제공한다. 마지막 프로젝트 해제 후에는 빈 목록과 등록 화면으로 돌아간다. 구형 브리지는 경로 조회/복사만 허용하고 이름 변경·등록 해제에는 업데이트를 안내한다.
- **브리지 전체 92개 테스트 통과**, 확장한 `scripts/smoke_library.cjs` 통과, Android Java 소스 컴파일·JS 문법·diff 검사 통과. 신규 서버 검증은 인증/입력 오류, 실행·보관/워크트리 세션 삭제 차단, 파일 보존, 재등록/늦은 요청, 마지막 프로젝트/재시작 메타데이터, 실행 준비와 삭제 경합을 포함한다. UI는 접힌 메뉴·이름의 HTML 비실행·초안/승인 유지·실패/취소/재시도·구형 브리지·마지막 등록 해제·Back/Escape와 영어/한국어 작은 화면을 확인했다.
- 로그: `.tools/tests-project-management-all.log`, `.tools/ui-project-management.log`, `.tools/java-project-management.log`. 미리보기: `dist/screenshots/project-menu-320-en.png`, `project-settings-320-en.png`, `project-settings-320-ko.png`, `project-remove-320-ko.png`. 사이드바 애니메이션 도중 좌표를 읽던 테스트는 화면 가장자리 클릭으로 수정해 실제 배경 탭을 검증한다.
- **APK 미빌드·운영 브리지 미변경**. 현재 설치 앱/브리지는 0.10.0이며 이 메뉴는 다음 APK와 새 브리지 적용이 모두 필요하다. Settings 버전 표시 수정도 계속 빌드 대기다. 실제 Android WebView 터치·시스템 키보드는 다음 설치 후 검증한다.

## 0.10.0 브리지 재시작 완료 (2026-10-04 실행, 2026-10-05 확인)

- 사용자가 브리지 재시작을 요청했다. 운영 0.9.0의 실행 세션 2개 중 하나가 현재 Codex 대화의 부모 프로세스이므로 즉시 종료하지 않고, 이번 응답 완료 후 재시작하는 별도 일회성 유지보수 프로세스를 실행했다. 다른 하나는 입력·승인·대기열이 없는 Codex Chat이다.
- 브리지·두 어댑터·Claude 복구 도구를 **0.10.0 소스와 일치하도록 설치**하고 0700 권한을 확인했다. 이전 네 파일·메타데이터와 유지보수 설정은 저장소 밖 비공개 폴더에 보관했다. 파일 교체 당시 응답 중인 프로세스는 0.9.0 코드로 동작했고 응답 완료 후 새 프로세스로 교체됐다.
- `~/.local/state/bibimer/maintenance/latest-restart.json`이 가리키는 **`restart-0.10.0-a3e1f07f`**의 상태가 **`complete`**인 것을 2026-10-05 읽기 전용으로 확인했다. 동일 원본 대화·권한/Fast·인증 유지, 두 세션 복원과 프로젝트 3개를 기록한다. 실제 `/v1/health`에서도 **0.10.0·실행 세션 2개·프로젝트 3개**, 모델·세션 목록·워크트리·대기 메시지 Steer 지원을 확인했다. 같은 작업을 다시 실행하지 않는다.
- 작업은 현재 턴 완료와 잠시 안정된 준비 상태를 기다린 뒤 동일 Codex 원본 대화를 이어하고, 입력 없는 다른 세션은 같은 권한/Fast로 다시 연다. 추가 모델 입력·승인 처리는 하지 않는다. 새 턴/사용자 입력·활성 세션 변경·승인/대기열이 감지되면 재시작을 진행하지 않는다. 새 세션 UUID가 생기며 이전 실행은 0.10.0 세션 목록에 남을 수 있다.
- 임시 상태 폴더·Codex 대역으로 실제 **0.9.0 → 0.10.0**, 메타데이터 **형식 2 → 4**, 응답 중 대기·종료 후 재시작·동일 원본 대화/두 세션 복원·권한/Fast·인증·프로젝트 유지·추가 모델 턴 없음 검증을 통과했다. 로그: `.tools/test-restart-after-turn-0.10.0.log`. 운영 비공개 파일은 폴더 0700·데이터 0600이다.
- **APK는 다시 빌드하지 않았다.** Settings의 0.9.0 표시 오류 수정은 여전히 다음 요청 빌드에 포함할 소스 변경이다.

## Settings 버전 표시 수정 (2026-10-04, 소스 반영 / APK 빌드 대기)

- 사용자가 0.10.0을 재설치했는데 Settings의 버전이 올라가지 않는다고 보고했다. Android 사용자 0의 실제 설치 패키지는 **0.10.0/code 17**이며 설치된 `base.apk`의 SHA-256이 Download의 0.10.0 APK와 일치한다. 재설치는 정상이다.
- 원인은 `MainActivity.NativeApi.environment()`가 앱 버전을 `0.9.0` 문자열로 고정해 반환한 것이다. 이전 빌드에서 Manifest와 JS 대체값만 갱신하고 이 값을 놓쳤다. 브리지 버전 표시나 WebView 캐시 문제가 아니다.
- 실제 설치 패키지의 `PackageInfo.versionName`을 조회하도록 변경하고 JS의 고정 버전 대체값도 제거했다. 조회값이 없으면 `—`로 표시하며 오래된 버전을 추측해서 표시하지 않는다. 앱·브리지 버전은 별개다.
- Java 전체 소스 컴파일과 `node --check`·`git diff --check` 통과. Java 로그: `.tools/java-version-display.log`. **새 APK는 빌드하지 않았다.** 현재 Download/설치본의 0.10.0에는 표시 오류가 남아 있으며 다음 명시적 빌드에 수정이 포함된다. 운영 브리지·실행 세션·인증·설정은 변경하지 않았다.

## 0.10.0 APK 빌드 완료 (2026-10-04)

- 앱 **0.10.0 / versionCode 17**, 내장 브리지 **0.10.0**. 자체 선택 목록·모델/추론 수준·에이전트 전환·대기 메시지 Steer·자동 설정/연결 안내·반복 설정 문구 정리·프로젝트/워크트리/여러 세션 사이드바·세션 관리·Responding 애니메이션을 포함했다. 아래 각 구현 기록의 ‘빌드 대기’는 당시 상태이며 이번 APK에 모두 포함됐다.
- 설치 파일: **`/storage/emulated/0/Download/Bibimer-0.10.0.apk`**, **338,335바이트**. 브리지 설치 파일: **`/storage/emulated/0/Download/bibimer-setup-0.10.0.sh`**, 201,099바이트. `dist/bibimer-debug.apk`, `dist/bibimer-setup.sh`와 각각 일치한다.
- APK SHA-256: `7a633a036470f6aa933f4d0291e60909a1eef963143eda34f74c0254d59ca3da`. 설치 파일 SHA-256: `2ac82045fbb78c5fa9086ddc54b2b95141510d74e75b7051e56d27cd593a5a21`.
- APK 빌드·v2/v3 서명·0.9.0과 동일 인증서, 패키지/버전/SDK/대문자 이름, 내장 **24개 asset의 원본 일치**, DEX의 설정·Termux 연결 클래스와 Back 처리 포함, RUN_COMMAND 권한·비공개 수신기를 확인했다. 설치 스크립트 문법·격리된 임시 홈의 네 소스 추출/원본 일치/0700 권한을 검증했다. 자동 설치 페이로드는 **204,953 UTF-16 단위**로 한도 220,000 이내다.
- 버전 변경 후 **전체 브리지 테스트 87개 통과**. 기능별 UI·렌더러 검증은 아래 구현 기록을 따른다. 로그: `.tools/build-0.10.0.log`, `.tools/tests-0.10.0.log`, `.tools/verify-apk-0.10.0.json`.
- **APK 설치·운영 브리지 업데이트/재시작은 하지 않았다.** 설치된 운영 브리지 소스는 여전히 **0.9.0**이다. 새 세션 관리·모델/추론 선택·대기 메시지 Steer는 앱과 브리지 0.10.0을 함께 적용해야 한다. 자동 연결 버튼은 기존 브리지를 업데이트하지 않는다. 기존 사용자 세션·인증·권한 설정은 유지했다.
- 다음 검증은 APK 설치 후 Android WebView 터치·시스템 Back/IME·애니메이션/모션 설정·TalkBack과 실제 Termux RUN_COMMAND 권한/콜백, 새 기기의 전체 설치 흐름이다. 패키징·브라우저 대역 검증을 실기기 지원 완료로 표시하지 않는다.

## 원래 요청

Android에서 Termux와 연동해 여러 프로젝트와 Codex·Claude 같은 코딩 에이전트를 관리·오케스트레이션하는 앱을 구상하고, 가제로 프로젝트 폴더를 만든 뒤 그 폴더를 기준으로 개발을 시작한다.

이름 검토 후 사용자가 Bibimer로 프로젝트 폴더를 다시 설정하도록 요청했다. 이후 작업은 위 경로를 기준으로 진행한다.

사용자는 Android 앱으로 사용할 수 있어야 하며, 폰에서 직접 개발 과정을 진행하는 것이 핵심이라고 명확히 했다. Orca·Paseo는 프로젝트·에이전트 관리 경험의 벤치마킹 대상으로 둔다.

## 정리한 방향

- 확정한 프로젝트 이름: Bibimer(비비머). ‘비빔 + -er’에서 유래한다.
- 제품 소개 문구: ‘한 손으로 지휘하는 코딩 에이전트’.
- 웹사이트 후보: `bibimer.app`. 아직 도메인을 확보하지 않았다.
- 휴대폰에 설치하는 Android 앱이 개발 작업의 주 사용 화면을 제공하고, 같은 휴대폰의 Termux에서 프로젝트 파일·에이전트 CLI·개발 명령을 다룬다.
- 별도의 개발 PC나 원격 개발 호스트를 기본 사용 흐름의 전제로 삼지 않는다.
- Orca·Paseo의 프로젝트·에이전트 관리 경험을 참고해, 작업 지시부터 실행 결과 확인과 후속 입력까지 폰에서 이어가는 흐름을 설계한다.
- 먼저 프로젝트 하나·에이전트 하나의 실행, 입출력, 재접속을 검증한다.
- 첫 마일스톤은 같은 휴대폰에 설치한 실제 Android 앱과 Termux로 검증한다. 첫 연결 실험에서 브리지는 수동으로 시작해도 된다.
- 실제 기기 검증 결과에 따라 구현 구조를 조정한다.
- Termux와 개발 도구가 없는 사용자를 위해 앱 내 설치 안내·설정 파일·실행 명령 가이드를 제공한다. 새 기기에서 설치부터 실행까지 완주하는지는 나중에 실제 확인한다.
- 첫 구현 스택: Java Android 앱 + 앱에 포함한 WebView/xterm.js 화면, Python 표준 라이브러리 HTTP 브리지, PTY. 현재 기기에서 APK를 직접 빌드하는 경로를 확보했다.
- 기본 표시 언어는 영어이며 한국어를 추가 지원한다. 기기 언어와 관계없이 영어로 시작하고 **Settings → Language → 한국어**에서 선택한 언어를 저장한다(0.9.0부터, 이전 0.8.2는 Setup). 사용자와의 설명·프로젝트 문서는 한국어를 유지한다.

## Responding 진행 표시 강조 (2026-10-04, 소스 반영 / APK 빌드 대기)

- 입력창 위 `Responding / 응답 중`에 민트색 강조 배경·굵은 글자·작은 회전 링을 추가했다. 사이드바의 세션 상태와 ⋯ 세션 관리에도 같은 표시를 적용한다. 실제 연결된 Chat의 `state: running`·`turn_state: running`에만 적용하며 완료·실패·승인/질문 대기·연결 끊김에는 회전하지 않는다. 기존 상태 문구와 `role=status`는 유지한다.
- CSS 애니메이션으로 처리하며 출력 갱신마다 표시를 새로 만들지 않는다. `prefers-reduced-motion: reduce`에서는 고정 링·색상으로 표시한다. JavaScript 문법과 임시 브리지/에이전트 대역 기반 브라우저 확인에서 실제 회전·사이드바 표시·모션 줄이기·중단 후 대기/승인 상태의 표시 제거, 영어/한국어 320/360×460 배치를 확인했다. 로그: `.tools/ui-responding.log`, 미리보기: `dist/screenshots/responding-*.png`.
- **APK 미빌드·운영 브리지 미변경**. 다음 명시적 APK 빌드에 포함한다. 실제 Android WebView의 애니메이션·시스템 모션 설정은 설치 후 확인한다.

## 프로젝트·워크트리·여러 세션 사이드바 (2026-10-04, 소스 반영 / APK·브리지 적용 대기)

- 상단 왼쪽 버튼으로 여닫는 모바일 사이드바에 프로젝트 목록을 나열하고 각 프로젝트·실제 Git 워크트리 아래 세션을 접고 펼친다. `Project Add`와 폴더 찾기를 사이드바로 옮기고 새 세션·저장된 세션 가져오기·프로젝트 열기(↗)를 제공한다. 대화창 하단의 `Stop this session`은 제거했다. 이름·작업 경로·상태와 상단의 새 세션/⋯만 두며 입력과 하단 내비게이션 사이 여백은 유지한다.
- 세션 ⋯에서 이름 변경, 보관/복원, 종료, 종료된 세션의 BIBIMER 목록 삭제, 원본 ID가 있는 Chat 이어하기를 제공한다. 보관은 실행·대기열·승인을 유지하고 보관된 실행도 프로젝트 실행 수에 포함한다. 삭제 확인창은 원본 CLI 기록·파일을 유지함을 명시하고 실행 중 삭제는 서버도 거절한다. 원본 이어하기는 새 실행 ID로 같은 네이티브 대화를 열며 과거 실행 항목은 목록에 남겨 사용자가 보관/삭제할 수 있다.
- 브리지 세션 저장을 `(project_id, agent)` 슬롯에서 세션 UUID별로 확장했다. 프로젝트별 선택 에이전트·에이전트별 마지막 선택 세션을 유지하며 `new_session: true`는 기존 프로세스를 보존한다. 새 시작 화면은 선택 포인터만 null로 바꾼다. 입력/질문 초안·대기열·응답·종료는 각각 세션 ID에 묶는다. 같은 원본의 동시 이어하기·삭제된 최근 실행 ID 재시도를 막는다.
- `/v1/project-session`, `/v1/worktrees`, `/v1/sessions/{id}/manage`와 기능 표시 `session_library`·`git_worktrees`를 추가하고 Android 허용 경로를 갱신했다. 메타데이터 형식 4는 기존 형식 3·2·단일 프로젝트와 토큰을 보존하면서 전체 목록·사용자 이름·보관 상태·네이티브 ID·실제 작업 경로를 저장한다. 브리지 재시작 시 실행 상태는 `lost`, 대기열은 초기화하며 프로세스/PTY 출력을 자동 복원하지 않는다.
- Git `worktree list --porcelain -z`로 실제 경로·브랜치를 조회한다. 연결된 사용 가능한 경로만 실행·가져오기·모델 조회에 허용하고 모델 캐시도 작업 경로별로 구분한다. 워크트리를 자동 생성/삭제하지 않는다. Git이 없거나 비저장소면 기본 프로젝트 폴더를 제공한다.
- 브리지 전체 **86개 테스트 통과**, 이후 추가한 중복 원본 실행 거절·네이티브 ID 이어하기를 포함한 목록 테스트 **5개 통과**. 신규 검증은 동시 같은 에이전트·승인/대기열 분리·이름/보관/삭제·재시작/형식 이전·실제 Git 워크트리 경로와 입력 검증을 포함한다. 로그: `.tools/test-sidebar-bridge.log`, `.tools/test-session-library.log`.
- 기존 UI 통합과 새 `scripts/smoke_library.cjs` 통과. 세션별 초안·보류 승인·프로젝트/워크트리 왕복, 보관 중 실행 유지, 삭제 확인/취소/대상 격리, 이름의 HTML 비실행, 목록 polling 중 포커스·펼침 유지, 영어/한국어, 320/360/393×460, Back/Escape/바깥쪽 탭, 재로드를 확인했다. 미리보기 `dist/screenshots/sidebar-*-en.png`, `sidebar-393-ko.png`, `chat-ko.png`를 검토했다. 로그: `.tools/ui-sidebar.log`, `.tools/ui-session-library.log`.
- Android Java 컴파일·JS 문법 검증 통과. Android 13 이상은 UI 상태에 따라 `OnBackInvokedCallback`을 등록/해제하고 이전 버전은 `onBackPressed`로 팝업을 닫는다. 실제 Android 시스템 Back·IME·TalkBack과 모델 호출은 다음 빌드 설치 후 검증한다. 내장 설치 스크립트만 최신 소스로 생성했고 자동 설치 페이로드는 **204,953 UTF-16 단위**로 제한 220,000 이내다.
- Setup 회귀 검증도 통과했다. 자동 연결 후 프로젝트가 없으면 사이드바 등록 화면을 열고, 닫은 뒤 Setup으로 돌아가 재연결·연결 삭제를 진행한다. 로그: `.tools/setup-sidebar-regression.log`. Android 네이티브 설치·권한 콜백은 이 브라우저 검증에서 대역을 사용했다.
- **APK 미빌드·버전 유지·운영 브리지 미변경**. 마지막 APK·운영 브리지는 계속 **0.9.0**이며 이 확장은 다음 APK와 새 브리지를 모두 적용해야 한다. 현재 사용자의 실행 세션·권한·토큰을 변경하지 않았다.

## 입력창 하단 반복 안내 정리 (2026-10-04, 소스 반영 / APK 빌드 대기)

- 권한·Fast 아래의 `Next message · remembered for future sessions`와 PTY·시작 전의 유사 안내를 평소에는 숨긴다. 빈 줄도 남기지 않으며 저장 중·브리지 업데이트 필요 상태만 표시한다. 적용 시점과 마지막 선택 저장 설명은 ⓘ 세션 설정에 유지한다. 하단 내비게이션과의 여백은 변경하지 않았다.
- JavaScript 문법·기존 UI 통합 검증을 통과했다. 권한·Fast 저장, 미지원 브리지 안내, 프로젝트·에이전트 전환, Queue/Steer·가져오기·영어/한국어를 확인했고 대화 화면 미리보기에서 반복 안내와 빈 줄이 없는 것을 확인했다. 로그: `.tools/ui-quiet-hint.log`. 실제 Android WebView 확인은 다음 APK 설치 후 진행한다.
- **APK 미빌드·운영 브리지 미변경**. 다음 명시적 빌드에 포함하며 마지막 APK는 계속 **0.9.0/code 16**이다.

## Setup 자동 설치·연결 (2026-10-04, 소스 반영 / APK·실기기 검증 대기)

- Setup에 **Set up and connect(설정하고 연결)**를 추가했다. Termux 설치·첫 실행 후 최초 Android RUN_COMMAND 권한과 Termux `allow-external-apps=true` 허용이 필요하다. 앱 권한 화면 열기·연동 허용 명령 복사·Termux 열기를 함께 제공하고, 기존 파일 저장/수동 코드 입력은 **Manual setup and pairing** 안에 유지한다.
- 허용 이후 고정된 Termux RUN_COMMAND 작업으로 필요한 Python·브리지를 설치하고 브리지를 실행한 뒤 일회용 코드를 앱이 직접 받아 연결한다. 공유 저장소·설치 파일 수동 이동·코드 입력이 필요 없다. 기존 브리지는 파일을 교체하거나 재시작하지 않으며 토큰·프로젝트·실행 세션을 보존한다. 브리지 업데이트는 별도 작업이다. 에이전트 설치·로그인은 자동화하지 않는다.
- `TermuxSetup`·비공개 `TermuxSetupReceiver`, RUN_COMMAND 권한 선언, APK의 `quick-setup.sh`·`setup-connect.py`를 추가했다. 코드 교환과 Keystore 저장은 네이티브에서 처리하며 코드·토큰·결과 원문은 JS·로그에 보내지 않는다. 고유 작업 ID·명시적 대상·1회 PendingIntent·15분 만료·연결 정보 삭제 시 콜백 무효화, 설치 잠금과 중복 요청 차단을 사용한다. 설치 스크립트의 `BIBIMER_SKIP_START=1`로 대화형 출력을 생략한다.
- 백그라운드 RUN_COMMAND에는 `/dev/tty`가 없어 기존 CLI `start`는 코드 출력 단계에서 실패한다는 점을 테스트에서 확인했다. 자동 경로는 같은 `serve` 데몬을 직접 시작하고 인증된 health 확인 후 코드를 발급하도록 수정했다. 해당 테스트가 만든 임시 데몬만 정리했으며 운영 브리지는 변경하지 않았다.
- **설치/연결 테스트 4개, 자동 설정 UI 및 기존 UI 전체 통합, Java 소스 컴파일 통과**. Python 부재·설치 실패·누락된 브리지 설치/재시도·설치 잠금·새 데몬 시작·1회 코드 교환·토큰/세션/승인 보존을 확인했다. UI는 최초 허용 안내·진행/중복 방지·재로드·오류/재시도·자동 연결·연결 삭제·수동 경로·영어/한국어·320/360px를 검증했다. Android API는 브라우저 대역이며 실제 PendingIntent 결과 수신·OS 권한 검증과 구분한다. 로그: `.tools/tests-quick-setup.log`, `.tools/ui-quick-setup.log`, `.tools/ui-setup-regression.log`, `.tools/java-quick-setup.log`. 화면: `dist/screenshots/quick-setup-*-ko.png`.
- Termux 공식 문서·설치 대상 0.118.3 서비스 소스로 권한·extras·콜백 형식을 확인했다. 현재 폰은 읽기 전용 확인에서 **외부 앱 연동 허용이 꺼져 있다**. 이를 임의로 켜거나 앱 권한을 변경하지 않았다. 새 APK 설치 후 실제 권한 요청→외부 앱 허용→설치→결과 수신→자동 연결, 앱 종료/재실행·OS 종료, Python/브리지가 없는 새 환경을 검증해야 한다. 지원 완료로 표시하지 않는다.
- **APK 미빌드·버전 유지·운영 브리지 미변경**. 마지막 APK·운영 브리지는 계속 **0.9.0**이다. 다음 요청 빌드에는 자체 선택·모델/추론·에이전트 전환·대기 메시지 Steer와 자동 설정을 함께 포함한다. 새 APK의 설치 asset은 빌드 스크립트에서 다시 생성된다.

## 대기 메시지에서 Steer (2026-10-03, 소스 반영 / APK·브리지 적용 대기)

- 사용자 요청으로 Codex 대기 메시지 행에 **Steer / Remove**를 함께 표시한다. 진행 중인 응답·승인 대기에서 해당 메시지를 현재 턴으로 전달하며, 수락이 확인되면 해당 항목만 제거한다. 기존 입력창 Steer와 작성 중인 초안은 유지한다. 응답이 없으면 비활성화하고 Claude·OpenCode·미지원 브리지에서는 행의 Steer를 숨긴다.
- `queue_steer` 기능 표시와 기존 queue API의 `action: steer`를 추가했다. 세션 ID·항목 ID·현재 턴 ID를 고정하고 대기열의 원문을 사용한다. 확인 대기 중에는 `steering` 상태로 새 FIFO 전송·해당 항목 취소/중복 전달을 막는다. 응답 종료가 먼저 도착해도 항목을 중복 전송하지 않는다. 수락 시에만 제거하며 거절·전달 여부 불명은 메시지를 남기고 대기열을 일시정지한다. 전달 여부 불명 항목은 대화 확인 후 취소해야 재개할 수 있다. 대기 승인은 자동 처리하지 않는다.
- 대기열 테스트 **10개 통과**, UI 전체 통합 검증 통과. 선택한 두 번째 항목만 전달·요청 ID 재시도·FIFO 순서/승인 보존·오래된 턴/다른 세션 거절·시간 초과/잘못된 확인 응답·턴 완료와 수락 확인의 경합을 검증했다. UI에서 대기열 복원 후 Steer·거절 항목 유지·초안 보존·프로젝트 전환 중 늦은 결과 격리·미지원 브리지·한국어와 360×460 배치를 확인했다. 로그: `.tools/tests-queue-steer.log`, `.tools/ui-queue-steer.log`. 화면: `dist/screenshots/queue-entry-steer-ko.png`.
- 전체 검사에서 테스트 HTTP 제한 4초가 서버의 Steer 확인 제한 4초와 충돌해, 테스트 클라이언트를 실제 앱과 같은 6초로 조정하고 오류 시에도 소켓을 닫도록 수정했다. 이후 **전체 브리지 테스트 78개 통과**. 결과는 `.tools/tests-queue-steer-all.log`에 기록했다.
- **APK 미빌드·버전 유지·운영 브리지 미변경**. 마지막 APK·운영 브리지는 0.9.0이며 이번 기능은 다음 명시적 빌드와 브리지 업데이트에 포함한다. 실제 Android WebView 터치와 실제 모델의 지시 반영은 설치 후 검증한다. 통합 검증은 격리된 임시 브리지와 에이전트 대역을 사용하며 사용자 대화에 입력하지 않았다.

## 모델·추론 수준 선택과 에이전트 전환 (2026-10-03, 소스 반영 / APK·브리지 적용 대기)

- 입력창 아래에 **Agent / Model / Reasoning / 새로고침**을 추가했다. 기존 자체 선택 시트로 Codex·Claude·OpenCode와 설치된 에이전트가 실제 제공하는 모델·추론 수준을 선택한다. 가져오기 설정에도 모델·추론 선택을 제공하며 전체 자체 선택 메뉴는 15개다. 영어 기본·한국어 지원, 목록 로딩·실패·재시도·지원하지 않는 저장값 안내를 포함한다.
- 모델은 Codex `model/list`, Claude SDK `supportedModels()`, OpenCode 연결된 제공자의 모델·variant에서 가져온다. 모델 변경 시 추론 수준을 기본값으로 초기화하고 마지막 선택을 에이전트별 Android 설정에 저장한다. **Chat은 다음 입력부터, PTY는 다음 실행부터** 적용하며 대기열도 실제 전송 시 해당 세션의 선택을 사용한다. 승인 요청은 변경하지 않는다.
- 프로젝트마다 **에이전트별 실행 세션 하나**를 유지한다. 전환은 기존 프로세스를 종료하거나 모델 입력을 보내지 않으며 각 에이전트의 대화·대기열·승인·작성 중인 입력을 복원한다. 에이전트 간 대화 내용을 자동 전달하지 않는다. `agent_sessions`·`model_options` 기능 표시, 인증된 `/v1/project-agent`·`/v1/models`, 메타데이터 format 3을 추가했다. 기존 프로젝트당 세션 메타데이터는 해당 에이전트로 이전한다.
- 모델 조회는 세션 잠금 밖에서 수행하며 프로젝트·에이전트별 120초 캐시를 사용한다. 목록 조회와 세션 시작이 겹쳐도 조회 결과를 공유하도록 처리했다. 선택 조합을 브리지에서 검증하고 제공자 설정·자격 증명은 앱에 전달하지 않는다.
- **Python 통합 74개, UI 통합·자체 선택 컨트롤·응답 렌더러, Java 소스 컴파일 통과**. 새 검증은 네이티브 옵션 전달·잘못된 조합 거절·다음 턴 적용·모델 기본값 복원·동시 목록 조회/시작·세 에이전트 동시 실행/전환·초안/대기열/승인 격리·종료 격리·메타데이터 이전을 포함한다. UI에서 재로드·가져오기 모델/수준 선택·한국어 표시와 기존 프로젝트/Queue/Steer 동작도 확인했다. 로그: `.tools/tests-models-final.log`, `.tools/ui-models.log`, `.tools/select-models.log`, `.tools/render-models.log`, `.tools/java-models.log`.
- 실제 설치된 Codex 0.156.1·Claude SDK 0.3.283/CLI 2.1.283·OpenCode 1.17.13에서 각각 7·6·8개 모델 목록과 지원 수준을 조회했다. 실제 Codex는 로컬 HTTP 대역으로 두 모델/추론 선택 전달과 원래 모델 복원을 확인했다(`.tools/native-model-selection.log`). 외부 모델 호출 없이 자체 테스트 기록만 만들고 정리했다. Android WebView·실제 모델 응답/도구 동작은 다음 빌드 설치 후 확인한다.
- 제약: OpenCode PTY에는 현재 추론 수준 시작 인수가 없어 자체 CLI 메뉴를 사용하도록 안내한다. OpenCode Chat에서 명시한 모델을 **Agent default**로 되돌리는 것은 새 세션에서 가능하며, 목록의 다른 모델로는 바로 전환할 수 있다. 입력 초안은 화면 메모리, 대기열은 브리지 메모리에만 유지한다.
- **APK 미빌드·버전 유지·운영 브리지 미변경**. 마지막 APK와 운영 브리지는 계속 **0.9.0**이다. 다음 명시적 빌드에 자체 선택 UI와 이번 기능을 함께 포함하고, 브리지 소스도 별도로 적용해야 한다. 운영 사용자 세션을 재시작하거나 종료하지 않았다.

## 자체 선택 목록 UI (2026-10-03, 소스 반영 / APK 빌드 대기)

- 사용자 요청으로 **프로젝트·프로그램·Chat/PTY·하단 권한·Enter·언어·가져오기 에이전트/방식/권한·권한 설명창의 10개 선택 메뉴**를 앱 자체 하단 시트로 통일했다. 현재 선택은 민트색 배경·체크로 표시하고 권한 설명·프로젝트 경로·Enter 동작 설명을 제공한다. 하단 권한 트리거는 기존 테두리 없는 텍스트 형태를 유지한다.
- `select.js` 공통 컨트롤과 WebView 자산 허용 항목을 추가했다. 기존 select는 숨긴 내부 값 모델로 사용하며 옵션·비활성·언어·저장 실패 복원을 동기화한다. 선택 행 탭/Enter/Space로 적용하고 닫기·시트 밖 탭·Escape로 취소한다. 방향키·Home/End·문자 검색, 포커스 복원, 현재 행 스크롤, 중첩 팝업을 지원한다.
- 열린 목록의 프로젝트·세션 문맥이 바뀌거나 항목이 비활성/제거되면 이전 선택을 적용하지 않는다. 상태 갱신마다 목록을 다시 만들지 않아 읽던 위치와 포커스를 유지한다. 기존 통합 검증이 같은 값 재선택에 의존하던 인터페이스 안내 갱신 문제도 고쳐, 에이전트 목록이 같아도 브리지 기능 변경을 표시한다.
- **UI 통합·새 선택 컨트롤·기존 렌더러 테스트와 Java 소스 컴파일 통과**. 전체 메뉴를 자체 UI로 조작해 멀티 프로젝트·권한/Fast·세 제공자·세션 가져오기·Queue/Steer·Settings를 확인했다. 영어/한국어, 저장 실패 복원, 중복 변경 없음, 키보드/취소, polling 중 포커스, 120개 옵션과 긴 이름/경로, 320×460 스크롤·HTML 비실행을 확인했다. 로그: `.tools/ui-select.log`, `.tools/select-control.log`, `.tools/render-select.log`. 미리보기: `dist/screenshots/select-*.png`.
- **APK 미빌드·버전 유지·운영 브리지 미변경**. 마지막 APK는 계속 **0.9.0/code 16**이며 자체 선택 UI는 다음 명시적 빌드에 포함한다. Android WebView 실제 터치·뒤로 가기·TalkBack은 다음 빌드 설치 후 검증한다.

## 0.9.0 브리지 재시작 완료 (2026-10-02 준비, 2026-10-03 완료 확인)

- 사용자 요청으로 0.9.0 운영 소스를 설치하고, 브리지 자식인 현재 Codex 대화를 끊지 않도록 응답 완료 후 재시작하는 별도 일회성 유지보수 프로세스를 실행했다. 브리지·두 어댑터·Claude 복구 도구의 원본 일치·0700 권한을 확인했고 기존 설치 파일과 복구 사본은 저장소 밖 비공개 폴더에 보관했다.
- **2026-10-03 읽기 전용 확인에서 재시작 완료**. `~/.local/state/bibimer/maintenance/latest-restart.json`이 가리키는 `restart-0.9.0-0033b167/status.json`은 `stage: complete`, `version: 0.9.0`, 동일 스레드·권한/Fast·인증 유지, 실행 세션 2개 복원, 프로젝트 3개, Queue/Steer 지원을 기록한다. 운영 `/v1/health`에서도 **0.9.0·활성 세션 2개·Queue/Steer 지원**을 확인했다. 유지보수 프로세스를 다시 실행하지 않는다.
- 기존 Codex 대화는 동일 스레드의 원본 이어하기로 복원됐고, 입력 없던 다른 프로젝트의 Codex Chat은 같은 권한/Fast로 다시 열렸다. 재시작 도구는 모델 입력을 새로 보내지 않는다. 복구 사본·작업 설정은 0700 폴더/0600 파일이며 저장소나 일반 로그에 넣지 않는다.
- 사전 임시 브리지·Codex 대역에서 응답 중 대기, 응답 완료 후 재시작, 인증·프로젝트·권한/Fast 보존, 같은 스레드와 두 번째 빈 세션 복원, 추가 모델 턴 없음 검증을 통과했다. 로그: `.tools/test-restart-after-turn.log`. APK는 다시 빌드하지 않았다.

## 0.9.0 APK 빌드 완료 (2026-10-02)

- 사용자의 `apk build` 요청으로 누적 변경을 **앱 0.9.0 / versionCode 16**, 내장 브리지 **0.9.0**으로 빌드했다. BIBIMER 로고·Space Grotesk, Project Add/Full Access 표기, Queue·Steer, Settings·Enter 기본 줄바꿈/보내기 선택을 포함한다.
- 설치 파일: **`/storage/emulated/0/Download/Bibimer-0.9.0.apk`**, 309,402바이트. 브리지 설치 파일: **`/storage/emulated/0/Download/bibimer-setup-0.9.0.sh`**. `dist/bibimer-debug.apk`, `dist/bibimer-setup.sh`와 각각 동일하다.
- APK SHA-256: `dd2758f1c48164be8bcef36ad515f912c98eca61534dc924645147f9a2d3705a`. 설치 스크립트 SHA-256: `33ae2a020e7e051b3de3d78a96573850d54b20ca15c5ade03e88f4e5ed35a10c`.
- 빌드·APK v2/v3 서명, 0.8.2와 동일 인증서, 패키지/버전/대문자 이름, 내장 20개 asset의 소스 일치, DEX의 새 입력 설정 클래스 포함을 확인했다. 설치 스크립트 문법과 격리된 임시 폴더에서 네 소스 추출·체크섬·0700 권한도 검증했다. 로그: `.tools/build-0.9.0.log`. 기능 구현 때 통과한 UI/렌더러 및 브리지 67개 테스트의 범위는 아래 기록을 따른다.
- 빌드 당시 운영 브리지는 **0.8.1 / 실행 세션 1개 / Queue 미지원**이었다. 이후 사용자 요청으로 재시작했고 위 기록처럼 **0.9.0·Queue/Steer 지원**을 확인했다. APK 설치는 수행하지 않았다.
- 남은 검증: 실제 APK 설치, Android 환경 설정 저장·앱 재실행, WebView의 서체·키보드/IME, 실제 모델의 Queue·Steer와 승인 동작. 아래의 미빌드 기록은 각 기능 구현 당시 상태이며 누적 소스는 이번 APK에 포함했다.

## 구현 기록: 별도 Settings·Enter 기본 줄바꿈 (2026-10-02, 이후 0.9.0에 포함)

- 사용자 요청으로 **Work / Setup / Settings** 하단 내비게이션과 별도 설정 페이지를 추가했다. **Language(언어)**도 Setup에서 Settings로 옮겼다. 연결 전에도 사용할 수 있고 Settings 왕복은 실행 세션·작성 중인 입력을 유지한다. 권한·Fast는 입력창 아래에 유지한다.
- **Settings → Enter key**에서 **New line(줄바꿈)** 또는 **Send(보내기)**를 선택한다. 기본은 줄바꿈이며 기존 설치본에서도 저장한 선택이 없으면 줄바꿈이다. `InputPreferences`가 Android 전용 환경 설정에 저장해 프로젝트·세션·앱 재실행에 공통 적용한다. 저장 실패는 이전 동작·선택으로 되돌리고 영어/한국어 오류를 표시한다.
- Chat·PTY 아래 공통 입력창에 적용한다. 줄바꿈 모드는 Send/Queue 버튼으로 전송하며 보내기 모드의 Enter는 전송 또는 응답 중 대기열 추가다. Shift/Ctrl/Meta/Alt+Enter는 항상 줄바꿈하며 한글 조합·키 코드 229·반복 전송 방지는 유지한다. 키보드 힌트도 `enter`/`send`로 바뀐다. PTY 직접 입력·특수 Enter 키는 기존 동작을 유지한다.
- UI 통합·기존 렌더러 테스트 통과. 두 선택 저장/재로드, 저장 실패 복원/번역, Settings 전환 후 초안·세션 유지, Chat/PTY 줄바꿈·선택 영역 치환·IME 보호, 응답 중 오전송 없음과 Queue/Steer, 기존 멀티 프로젝트·세 제공자·가져오기/승인을 확인했다. 320/360/393×460 설정 화면과 저장값 누락·잘못된 값 기본 처리도 확인했다. 로그는 `.tools/ui-enter-settings.log`, `.tools/render-enter-settings.log`, 미리보기는 `dist/screenshots/app-settings-*-en.png`, `app-settings-*-ko.png`다.
- Android Java 소스 컴파일 통과. **APK 미빌드·버전 유지·운영 브리지 미변경**이며 마지막 배포 파일은 **0.8.2/code 15**다. 이번 UI 설정은 브리지 변경이 필요 없다. 이전 Queue/Steer 변경은 여전히 브리지 적용 대기다. 실제 Android 설정 저장·앱 재실행·WebView 키보드/한글 조합 동작은 다음 빌드 후 확인한다.

## 구현 기록: Project Add·Full Access / 응답 중 Queue·Steer (2026-10-01, 이후 0.9.0에 포함)

- 표기 요청을 반영해 프로젝트 추가 버튼을 **Project Add / 프로젝트 추가**, Codex YOLO 선택 문구를 **Full Access / 전체 접근**으로 바꿨다. 내부 `yolo` 값과 권한 동작은 유지한다.
- Chat 응답 중에도 작성하고 **Queue(대기열)**로 전송할 수 있다. Enter 전송은 이후 추가한 Settings에서 보내기를 선택한 경우에 동작한다. 입력창 위 대기 목록·개별 취소·중단/실패 후 **Resume queue**를 제공한다. Codex에는 **Steer(방향 수정)** 버튼으로 현재 턴에 추가 지시를 전달한다. Claude·OpenCode는 Queue를 사용한다. Ctrl/Shift+Enter·IME 보호와 프로젝트별 초안 유지도 검증했다.
- 브리지의 인증된 세션별 `queue`(add/remove/resume)·`steer` API와 `chat_queue`·`codex_steer` 기능 플래그를 추가했다. 최대 16건·건당 UTF-8 16KiB, FIFO·중복 방지·잘못된 입력/세션/턴 거절을 적용한다. 다음 작업을 시작할 때 현재 세션 권한·Fast를 사용하며 승인 요청은 그대로 둔다. 시작 거절 항목은 실패 상태로 남기고 중단/실패 이후 자동 진행하지 않는다.
- 대기 내용은 브리지 메모리에만 두며 앱 재실행·프로젝트 전환 후 events로 복원한다. 에이전트 종료·브리지 종료 시에는 사라진다. 디스크 snapshot에는 내용 없이 건수·상태만 들어가며 브리지 재시작 시 건수·턴 ID도 초기화한다. 앱도 재시작 전 변경 번호·대기 목록을 초기화하고 대기열 유실을 알린다.
- Codex는 네이티브 `turn/steer`에 `expectedTurnId`를 보내고 응답의 턴 ID 확인 후 성공 처리한다. 거절/전달 여부 불명 시 초안을 유지하며 자동 재전송하지 않는다. 확인 응답이 오지 않아도 다음 대기열을 영구 차단하지 않도록 처리했다. [공식 App Server 문서](https://learn.chatgpt.com/docs/app-server#steer-an-active-turn)와 설치된 0.156.1 스키마를 확인했다.
- **Python 테스트 67개 통과**, 최종 확인 응답 유실 후 재개 검증을 포함한 대기열 테스트 6개도 통과했다. 새 검증은 FIFO·취소·용량·중복·프로젝트 격리·승인 유지·중단/실패 후 재개·메타데이터 내용 미저장·세 제공자 순차 실행·Steer 성공/거절/시간 초과를 포함한다. UI 통합과 렌더러 검증도 통과했다. 360×460에서 Queue/Steer·대기 목록이 내비게이션 위에 표시되고 재로드/프로젝트 왕복·미지원 브리지 안내·거절 초안 유지·영어/한국어를 확인했다.
- 실제 Codex 0.156.1과 통제된 로컬 HTTP 대역에서 같은 턴 Steer 수락·중복 억제, 응답 중 대기 보관, interrupt 후 일시정지·취소를 확인했다. 외부 모델 호출은 없었고 자체 테스트 기록만 보관 처리했다. 실제 모델이 지시를 반영하는 시점·Android WebView/키보드 검증은 남는다.
- **소스 반영 완료 / APK 미빌드 / 운영 브리지 미적용**. 앱·브리지 버전도 이번 작업에서 올리지 않았다. 마지막 APK는 **0.8.2/code 15**, 운영 브리지는 **0.8.1**이며 새 기능은 다음 명시적 빌드·브리지 적용 시 제공한다. 운영 사용자 세션을 종료하지 않았다. 앞선 대문자 로고 변경과 함께 누적 반영한다.

## 구현 기록: BIBIMER 대문자 텍스트 로고·서체 (2026-10-01, 이후 0.9.0에 포함)

- 사용자 요청에 따라 헤더 텍스트 로고를 `BIBIMER`로 바꾸고 Space Grotesk Bold 700·18px·0.065em 자간을 적용했다. 창 제목·런처 표시 이름·영어/한국어 버전 표기도 대문자로 맞췄다. 일반 UI와 코드/PTY 서체는 기존 가독성을 유지한다.
- 원본 WOFF2(41,780바이트)와 SIL OFL 1.1 라이선스를 assets에 포함했다. 출처·고정 커밋·SHA-256은 `assets/fonts/README.md`에 기록했다. 네이티브 WebView에 해당 파일만 허용하고 MIME을 추가해 외부 네트워크 없이 불러온다.
- 기존 렌더러 검증 통과. 브라우저의 실제 플랫폼 글리프 조회에서 `SpaceGrotesk-Bold` 내장 서체로 7글자가 표시됨을 확인했다. 320/360/393px 헤더에서 상태 표시와 겹침이 없고 영어/한국어 헤더 미리보기를 확인했다. 실제 Android WebView 로딩은 다음 APK 설치 후 검증한다.
- **소스 반영 완료 / APK 미빌드**. 앱 버전·versionCode는 올리지 않았으며 마지막 배포 파일은 계속 **0.8.2/code 15**다. 브리지·운영 세션은 변경하지 않았다. 다음 명시적 빌드 요청 시 누적 변경과 함께 반영한다.

## 0.8.2 권한 텍스트 선택·번개 Fast 칩 (2026-10-01)

- 입력창 하단 권한 선택의 테두리·배경을 없애 텍스트 메뉴로 표시한다. 네이티브 선택 메뉴·권한 이름·영어/한국어 지원은 유지한다.
- Fast는 체크박스 모양 대신 번개 SVG와 둥근 토글 칩으로 표시한다. 꺼짐은 회색·윤곽선 번개, 켜짐은 민트색·채워진 번개다. 36px 터치 영역, 네이티브 입력의 switch 역할·접근성 이름·Space 조작·포커스 표시·비활성 처리를 유지한다.
- 저장 요청 중 Fast가 잠깐 이전 상태로 돌아가던 UI 문제도 확인해 수정했다. 세션/에이전트/설정 위치에 맞는 대기 선택을 표시하고 저장 완료 후 서버 상태로 돌아가므로 실패 시에도 실제 상태를 표시한다. 권한 적용 시점·기본값 저장·브리지 API는 동일하다.
- 앱 **0.8.2 / versionCode 15**, 브리지는 **0.8.1**이다. 이번 변경은 앱 업데이트만 필요하며 운영 브리지와 사용자 세션을 재시작하지 않았다. 마지막 설치 확인은 **0.8.1/code 14**다.
- 기존 UI 통합 검증 통과: Fast 전환·권한 선택·영어/한국어·작은 화면·세 에이전트·프로젝트/승인/입력/재접속/가져오기. 360×460 전체 화면과 Fast on/off 미리보기를 확인했고 Space 키 전환도 확인했다. APK 빌드·v2/v3 서명·이전 인증서 일치·내장 소스·변경 없는 0.8.1 설치 파일·다운로드 복사 일치를 검증했다. **`Download/Bibimer-0.8.2.apk`**로 설치한다. 실제 Android WebView 터치·TalkBack 검증은 남는다. 브리지 소스는 변경하지 않아 Python/모델 정책 검증을 반복하지 않았다.

## 0.8.1 입력창 하단 권한·Fast / 대화 중 권한 변경 (2026-10-01)

- 사용자 보고: “퍼미션 변경이 안됨”. 이어서 설정 팝업보다 입력창 하단에서 바로 변경할 것을 요청했다. 원인은 0.8.0 UI의 실행 중 권한 선택 잠금이었다.
- 입력창 바로 아래에 권한 선택·Codex Fast·설명(ⓘ)을 배치했다. Chat에서는 실행 중에도 선택할 수 있고 **다음 입력부터** 적용한다. 현재 응답·대기 승인·질문에는 임의 응답하지 않는다. 세션별 다음 입력 설정은 브리지에, 마지막 기본값은 에이전트별 Android 설정에 저장한다. 앱 재로드·프로젝트 전환 시 유지한다.
- 인증된 `POST /v1/sessions/{id}/options`와 `live_agent_options` 기능 표시를 추가했다. 부분 변경·타입·권한 열거값·중복 요청을 검증하고 종료 세션/PTY는 거절한다. 세션 잠금 밖에서 메타데이터를 보관해 기존 잠금 순서를 유지한다. 앱은 갱신 요청의 세션 ID를 고정하고 오래된 응답으로 다른 프로젝트를 덮어쓰지 않는다.
- Codex는 네이티브 thread 시작/복원 응답에서 원래 승인·sandbox 정책을 받아 둔 뒤 첫 입력부터 선택한 값을 `turn/start`에 매번 전달한다. YOLO→읽기 전용→프로젝트 쓰기→기본값 복원을 지원한다. 기본 정책이 없는 CLI 응답은 시작 실패로 처리한다. Fast도 서버에 다음 입력 설정으로 보관하므로 전송 전 앱 재실행으로 선택이 사라지던 제한을 해소했다.
- Claude는 다음 SDK query에 선택한 permissionMode를 적용한다. OpenCode는 다음 prompt 전에 네이티브 세션 규칙을 PATCH한다. OpenCode의 기존 규칙 병합 API에는 제거가 없으므로 Ask↔Bypass 전환을 지원하고, 변경 후 Agent default 복원은 새 세션을 안내한다. PTY 실행 중 하단 변경은 다음 세션의 기본값이며 현재 터미널은 CLI에서 조정한다. 적용 범위를 UI에 표시한다.
- **브리지 테스트 60개 통과**. 대기 승인이 있는 상태의 옵션 변경·승인 유지·후속 입력 적용·기본값 복원·잘못된 값/중복/종료 후 거절·다른 프로젝트 격리·세 제공자 전환을 포함한다. UI 검증에서 실제 임시 브리지와 모의 에이전트로 하단 직접 변경, 같은 세션 ID/재로드 후 설정 유지, 미지원 브리지 안내/기존 입력 유지, 영어·한국어와 360×460 위치를 확인했다. 기존 렌더러·입력·승인·가져오기 검증도 통과했다.
- 실제 Codex 0.156.1의 `thread/settings/updated`에서 YOLO=`never/dangerFullAccess`, 읽기=`on-request/readOnly`, 쓰기=`on-request/workspaceWrite`, 기본값 복원=`on-request/readOnly` 전환을 확인했다. 모델 주소는 통제된 로컬 HTTP 응답 대역만 사용했고 외부 모델 요청은 없었다. Fast on/off 및 같은 ID 저장·재개도 확인했다. OpenCode 1.17.13 공식 태그의 세션 PATCH 구현에서 기존 권한 규칙 병합을 확인했다.
- **0.8.1 / versionCode 14** APK 빌드·v2/v3 서명·이전 인증서 일치, 내장 UI/설치 파일/네 소스 일치와 격리 설치의 0700 권한 검증 완료. 파일: **`Download/Bibimer-0.8.1.apk`**, `Download/bibimer-setup-0.8.1.sh`.
- 운영 브리지도 **0.8.1 적용 완료**. 당시 활성 Codex Chat은 첫 초기화 revision 1, 입력·응답·도구 항목 0개, 승인 0개, 가져오기 아님을 재확인한 빈 세션이었다. 비공개 설정 체크포인트를 보관하고 해당 빈 세션만 같은 프로젝트·기존 YOLO/Fast 설정으로 다시 열었다. 비어 있어 native 기록이 아직 생성되지 않은 세션을 새로 만든 것이며 새 모델 입력은 보내지 않았다. 사용자 대화가 있는 세션은 종료하지 않았다. 인증 토큰·프로젝트 3개·선택 프로젝트와 새 기능 활성화를 확인했다. CLI의 연결 코드 TTY 제약을 피하려고 검증된 restart 함수 후 serve를 사용했다.
- 마지막으로 확인한 설치 앱은 **0.8.0/code 13**. 새 하단 UI/변경 API를 쓰려면 **0.8.1 APK 설치 후 Reconnect**가 필요하다. 실제 Android WebView·키보드·설정 보관, 실제 모델 도구 실행 정책, Fast 계정/모델별 제공 여부와 기존 첫 마일스톤의 검증은 남는다.

## 운영 브리지 0.8.0 적용 완료 (2026-10-01)

- 사용자가 브리지 재시작을 명시적으로 요청했다. 실행 직전 기존 세션이 이미 모두 종료되어 `active_sessions: 0`이었고 앱 **0.8.0 / versionCode 13** 설치도 확인했다. 추가 에이전트 종료는 수행하지 않았다.
- 이전 브리지에 남아 있던 표시 기록 65개를 `~/.local/state/bibimer/recovery/`(0700)의 별도 JSON(0600)에 한 번 더 보존한 뒤 재시작했다. 전체 모델 맥락의 복원본은 아니며 실제 내용·토큰·세션 ID를 문서나 일반 로그에 넣지 않는다.
- 운영 `127.0.0.1:8765`의 인증된 health에서 **0.8.0**, 실행 세션 0개, 등록 프로젝트 3개, `agent_options`·`persistent_codex_sessions` 활성화를 확인했다. 인증 토큰 파일은 백업 전부터 수정되지 않았고 기존 인증으로 연결된다. 프로젝트 목록과 이전 세션의 상태/events 조회도 정상이다. Codex·OpenCode·Claude의 Chat/PTY 모드가 표시된다.
- 자동 실행 환경의 `restart` 명령은 브리지 시작 후 연결 코드 표시 단계에서 `/dev/tty` 부재로 오류를 반환했다. 이후 health와 status를 직접 확인해 재시작 성공을 검증했다. 새 연결 코드를 만들거나 토큰을 변경할 필요는 없었다.
- 앱에서 **Reconnect** 후 Session settings의 권한·YOLO/bypass·Fast와 새 세션/가져오기를 확인하면 된다. 기존 적용 대기는 해소되었다. 실제 모델 작업·Android 화면/키보드/설정 저장·신규 설치 흐름 검증은 아직 별도다.

## 0.8.0 권한 선택·마지막 설정·Codex Fast (2026-10-01)

- 사용자 요청: 기존 세션 종료·브리지 적용보다 먼저 권한 및 YOLO/bypass 선택, 다음 세션에 마지막 설정 사용, Codex Fast 켜기·끄기 추가.
- Session settings 팝업과 Saved sessions의 설정 버튼을 추가했다. 권한은 Codex 기본값/읽기 전용/프로젝트 쓰기+승인/YOLO, Claude 기본값/일반 승인/파일 편집 허용/계획/bypass, OpenCode 기본값/전체 도구 승인 요청/bypass다. 기본은 기존 에이전트 권한 상속이며 명시한 모드만 적용한다.
- Android `AgentPreferences`가 마지막 선택을 에이전트별로 저장한다. 다른 프로젝트·새 세션·가져오기에 재사용하며 진행 중인 다른 세션은 바꾸지 않는다. 앱 기본 영어 및 한국어 지원. 360×460 화면에서도 팝업의 모든 설정·완료 버튼을 사용할 수 있도록 구성했다.
- Codex Fast는 새 앱에서 기본 꺼짐. Chat에서는 다음 메시지의 `serviceTier`로 전달하고 PTY에는 실행 인수로 전달한다. 실행 중인 Chat 권한은 잠그고 Fast만 변경한다. Fast를 선택한 뒤 메시지 전송 없이 앱을 재실행하면 현재 세션은 마지막 전송 값을 표시하고 새 세션 기본값에는 마지막 선택이 남는다. CLI에서 직접 변경한 권한·`/fast`는 앱 기본값과 자동 동기화하지 않는다.
- 세 에이전트 Chat/PTY 및 새 세션/resume/fork에 고정된 네이티브 옵션만 전달한다. Fast의 타입·에이전트 제한과 권한 열거값을 검증하며 임의 설정·RPC 통로는 만들지 않는다. YOLO/bypass일 때도 어댑터가 실제로 받은 질문·승인에 임의 응답하지 않는다. OpenCode 원본 이어하기의 규칙은 네이티브 세션에 남으며 복사의 규칙은 원본에 쓰지 않는다.
- 브리지 테스트 **58개 통과**: 설정 매핑·잘못된 값 거절·PTY 인수/환경·새/원본/복사·다른 프로젝트 격리·Fast on/off·중복 전송/실행 충돌 검증 포함. 실제 임시 브리지와 모의 에이전트의 UI 검증에서 앱 재로드 후 마지막 설정 복원, 에이전트별 분리, 실행 중 권한 잠금, Fast 다음 입력 적용, import 설정, 영어/한국어·기존 IME/승인/프로젝트/재접속을 확인했다. 기존 응답 렌더러·작은 화면 검증도 통과했다.
- 실제 Codex 0.156.1 App Server가 YOLO/`fast`/`default`를 수락함을 확인했다. 통제된 로컬 HTTP 서버만 사용한 두 입력에서 Fast on의 `service_tier=priority`, off의 tier 생략과 같은 ID 저장·재개를 확인했다. 외부 모델 작업은 보내지 않았다. 실제 Claude SDK/전용 2.1.283 런타임에서 bypass 옵션으로 초기화했고 모델 입력은 없었다. 실제 OpenCode 1.17.13 API에서 새/원본/복사 정책을 확인했다. OpenCode PATCH는 기존 규칙 뒤에 새 규칙을 추가하며 마지막 일치 규칙을 사용한다.
- **0.8.0 / versionCode 13** APK 빌드·v2/v3 서명 및 기존 인증서 일치, 내장 UI/설치 파일/네 소스 일치, 격리 설치 추출/0700 권한 검증 완료. 파일: **`Download/Bibimer-0.8.0.apk`**, `Download/bibimer-setup-0.8.0.sh`. 저장소의 dist에도 있다.
- 0.8.0 구현 직후 실제 설치 앱은 **0.6.1 / code 10**, 운영 브리지는 **0.6.0 / 활성 세션 1개**를 유지했다. `~/.local/share/bibimer/`의 네 소스는 0.8.0으로 갱신했지만 프로세스를 재시작하지 않았다. 이때는 기존 보존 요청 때문에 재시작을 보류했다. 이후 사용자의 재시작 요청에 따른 적용 결과는 위 절에 기록했다. 새 앱은 `agent_options` 없는 브리지의 에이전트 시작·가져오기를 막고 안내한다.
- 남은 실제 검증: Android WebView에서 설정 저장·재실행, 각 계정/모델의 Fast 제공·사용량, 실제 모델 도구 실행의 권한 정책, Termux 제약 안의 샌드박스, 기존 첫 마일스톤의 키보드/백그라운드/신규 설치 흐름. 네이티브 CLI 설정 수락과 실제 모델 작업 검증을 구분한다.

## 0.7.0 Codex 저장 통합·이전 앱 작업 이어받기 (2026-10-01)

- 사용자 요청: Bibimer에서 진행한 세션을 찾아 작업을 이어가고 기존 Codex와 세션 관리를 통합. 운영 0.6.0 브리지의 이 프로젝트 Codex Chat이 `ready` 상태로 남아 있음을 확인했다. 앱에서 요청한 작업은 Claude 연동 복구였으며 관련 0.6.2 미커밋 소스가 남아 있었다. 이를 보존·검토하고 이번 버전에 포함했다.
- 원인은 Codex 새 Chat의 `ephemeral: true`였다. 대화가 다른 저장 폴더에 있는 것이 아니라 메모리에만 있었다. 남아 있는 표시 이벤트 65개는 `~/.local/state/bibimer/recovery/`(0700)의 JSON 파일(0600)에 일회성 보존했다. 민감한 실제 내용·토큰·세션 ID는 저장소 문서에 넣지 않는다. 전체 모델 맥락과 동일한 복원본이 아니며 통제된 네이티브 실험에서 임시 세션의 `thread/fork`는 거절되었다. 기존 프로세스에는 RPC 주입이나 강제 종료를 하지 않았다.
- 새 Codex Chat은 `ephemeral: false`, 기존 환경의 `CODEX_HOME`(기본 `~/.codex`)을 그대로 사용한다. 별도 세션 DB나 색인을 만들지 않는다. 응답의 `ephemeral: false`를 확인해 `history_persisted`를 메타데이터에 남긴다. health의 `persistent_codex_sessions`가 없는 브리지에서는 새 앱의 Codex 새 Chat 시작을 막아 다시 임시 기록이 생기지 않게 했다. 기존 PTY·저장 기록 복원은 유지한다.
- 세션 화면은 **Saved sessions(저장된 세션)**이며 **Continue original(원본 이어하기)**가 기본이다. 명시적 복사도 유지한다. 저장이 확인된 Codex 대화의 **Resume in CLI**는 같은 ID와 셸 이스케이프한 폴더를 포함한 명령을 복사한다. 앱 세션을 종료한 뒤 CLI에서 이어가도록 안내하며 자동 명령 실행은 없다.
- 실제 Codex 0.156.1과 임시 프로젝트·로컬 HTTP 응답 대역으로 새 대화 → 사용자 입력 → 기본 세션 목록 → 프로세스 종료 → 같은 ID와 입력 복원을 검증했다. 주입한 항목만 있는 빈 세션은 첫 사용자 턴까지 목록에서 제외되므로 실제 턴 경로를 검증했다. 외부 모델은 호출하지 않았고 테스트 기록만 보관 처리했다.
- Claude 미완료 작업 마무리: `repair_claude_termux.py`의 공식 2.1.283 SHA-512 검증·실행 확인·실패 시 기존 런처 유지·원자적 설치를 보완하고 영어/한국어 안내와 테스트를 추가했다. 현재 폰의 기존 arm64 Termux/glibc를 사용해 `~/.local/share/bibimer/claude-runtime/claude` 설치를 완료했다. 정상 사용자 CLI를 우선하고, 고장 난 경우 관리 런처를 사용한다. 명시적 `BIBIMER_CLAUDE_EXECUTABLE`도 지원한다. 기존 전역 CLI·로그인 설정은 변경하지 않았다.
- 실제 관리 런처의 `--version`, 공식 SDK 초기 연결, Bibimer Chat 준비와 PTY 출력·명시적 종료를 확인했다. 모델 대화·실제 도구 작업은 미검증이다. 새 기기의 glibc 설치까지 자동 지원하지 않으며 요구 조건이 없으면 안내하고 중단한다.
- 브리지 테스트 **53개 통과**. UI 통합·렌더러 검증 통과: 원본 이어하기 기본값·명시적 복사·CLI 명령 복사·기존 브리지의 저장 기능 안내/새 Chat 차단·PTY 전환, 기존 여러 에이전트·프로젝트·IME·승인·서식 검증. 실제 Android WebView·키보드 검증과 구분한다.
- **0.7.0 / versionCode 12** APK 빌드·v2/v3 서명, 내장 UI·설치 스크립트·네 소스 일치와 격리 설치 추출/0700 권한 검증 완료. 파일: **`Download/Bibimer-0.7.0.apk`**, `Download/bibimer-setup-0.7.0.sh`. 현재 설치 앱은 **0.6.1 / code 10**.
- 운영 브리지는 기존 앱 임시 세션을 보존하기 위해 아직 **0.6.0**으로 실행 중이다. 새 코드 적용에는 이 세션 종료 후 재시작이 필요하다. 앱 업데이트만으로 새 영구 저장이 적용되었다고 말하지 않는다.

## 0.6.1 입력창 아래 여백 (2026-09-28)

- 사용자 요청: 입력창과 하단 내비게이션 사이에 약간의 여백 추가. 공통 `.composer`의 아래 마진을 0에서 8px로 늘렸다. Chat·PTY에 함께 적용하며 기존 종료 버튼 위치와 작은 화면에서도 여백을 유지한다.
- 앱만 **0.6.1(versionCode 10)**로 업데이트했다. 브리지는 0.6.0 그대로 사용하며 재시작하지 않았다.
- 기존 `smoke_rendering.cjs` 통과. 393×780·360×460의 통제된 화면 캡처에서 입력창 아래 여백과 전송 버튼 위치를 확인했다. APK 빌드·v2/v3 서명 검증, 내장 CSS/JS와 원본 일치, 다운로드 복사본 일치를 확인했다. 브리지 변경이 없어 브리지 테스트는 재실행하지 않았다. 실제 Android 키보드·WebView 확인은 남아 있다.
- 설치 파일: **`/storage/emulated/0/Download/Bibimer-0.6.1.apk`**. 현재 폰에 설치된 앱은 versionCode 7이며 APK 업데이트가 필요하다.

## 0.6.0 OpenCode·Claude 실행과 세션 가져오기 (2026-09-28)

- 사용자 요청: “claude, opencode도 지원 할것”, “opencode 자체도 지원해야됨”. 가져오기뿐 아니라 OpenCode·Claude의 새 Chat·입력·승인·질문·중단·재접속과 PTY 실행을 추가했다. 앱·브리지 0.6.0, APK versionCode 9.
- `provider_opencode.py`: 설치된 OpenCode의 인증된 전용 루프백 서버와 공개 HTTP API를 사용한다. 생성·목록·복사·원본 이어하기·기록·도구·승인·질문을 기존 구조화된 대화로 연결한다. 자동 승인·권한 우회·가져오기 시 모델 실행은 하지 않는다. PTY는 `opencode`를 직접 실행한다.
- `provider_claude.mjs`: 공식 Claude Agent SDK 0.3.283과 설치된 CLI를 연결한다. SDK의 저장 기록 API 및 fork를 사용하고, 새 입력에서만 streaming query를 시작한다. 구조화된 텍스트·명령·편집·계획과 `canUseTool`·복수 선택 질문을 대응시켰다. 준비 화면의 설치 명령은 `BIBIMER_CLAUDE=1 bash ~/storage/downloads/bibimer-setup.sh`이며 Node.js·SDK를 별도 설치한다. Claude CLI는 교체하지 않는다.
- `POST /v1/session-history`에 `agent`(기본 codex), health에 `import_agent_session`을 추가했다. 기존 Codex 앱/API 호환을 유지한다. 목록은 현재 프로젝트의 실제 폴더로 제한하며 다른 프로젝트의 세션·승인을 유지한다. OpenCode·Claude 목록은 최대 10,000건, 기록 미리보기는 최근 50항목, Claude 기록은 64MiB까지 지원한다. 외부 CLI 활성 상태를 완전히 탐지하지 못하므로 복사가 기본이다.
- UI에 에이전트별 새 Chat·PTY·가져오기 선택, 실제 응답 에이전트 이름, 복수 선택 질문과 초안 유지, CLI 없음/실행 실패/SDK 누락 진단 및 영어·한국어 안내를 추가했다. 재접속 시 실행 중인 에이전트·모드가 Codex 기본값으로 바뀌던 문제도 수정했다.
- 브리지 테스트 **48개 통과**, 두 제공자 테스트 3개 후속 재검증 통과. `smoke_ui.cjs`와 `smoke_rendering.cjs` 통과: 기존 기능과 세 에이전트 새 Chat·승인 거절·복수 선택·재접속·프로젝트/언어 전환·가져오기·후속 입력·작은 화면·OpenCode PTY. 실제 Android 네이티브 API는 브라우저 테스트 어댑터로 대체했으므로 APK 실기기 검증과 구분한다.
- 설치된 **OpenCode 1.17.13**으로 새 Chat 초기화, 실제 목록·복사·원본 이어하기·통제된 과거 기록 표시를 확인했다. `Session.path`는 cwd가 아니므로 서버 `directory` 필터와 실제 폴더 비교를 사용한다. 실제 PTY 시작·같은 세션 재접속·명시적 종료도 통과했다. 모델 요청은 보내지 않았으며 별도 생성한 테스트 기록만 삭제했다.
- 공식 **Claude SDK 0.3.283**을 `~/.local/share/bibimer/claude/`에 설치했다. 임시 설정 폴더에서 합성 기록의 실제 SDK 조회·읽기·복사와 원본 보존을 확인했다. **현재 폰의 Claude CLI는 네이티브 실행 파일 누락으로 `claude --version`이 실패한다.** 앱은 `Needs repair`로 표시하고 실행을 비활성화한다. CLI를 복구하기 전 실제 Claude 대화는 검증할 수 없다. SDK 설치 성공을 CLI 실행 성공으로 간주하지 않는다.
- APK 빌드·v2/v3 서명·기존 인증서 일치·앱 asset 일치·설정 스크립트의 세 소스 체크섬·격리 추출·0700 권한을 확인했다. 설치 파일: **`/storage/emulated/0/Download/Bibimer-0.6.0.apk`**, 설정 파일: `Download/bibimer-setup-0.6.0.sh`. `dist/`에도 최신 파일이 있다. 현재 폰의 설치 앱은 여전히 **0.4.0(versionCode 7)** 이므로 업데이트가 필요하다.
- 실행 세션 0개를 확인하고 운영 브리지를 **0.6.0으로 적용 완료**했다. 인증 토큰·전체 프로젝트 설정 보존, 운영 health, 세 에이전트 목록 조회를 확인했다. CLI 실패 안내 외 연결 오류는 없으며 현재 사용자 세션을 종료하지 않았다.
- 남은 검증: APK에서 OpenCode 새 Chat·PTY·가져오기와 실제 모델 응답, Claude CLI 복구 후 실제 SDK 실행·승인·중단, 실제 키보드·WebView·백그라운드 복귀, Termux가 없는 신규 설치 흐름. 이번 작업에서는 실제 모델 요청을 보내지 않았다.

## 0.5.0 Codex 세션 가져오기 (2026-09-28)

- 사용자 요청: “import session 기능이 있어야 겠는데”. 우선 같은 폰의 Termux에 저장된 Codex 기록을 프로젝트별로 가져온다. Claude·실행 중인 외부 CLI 연결은 현재 범위 밖이다. 앱·브리지 0.5.0, APK versionCode 8.
- Work → **Import session**에서 현재 프로젝트 cwd의 비보관 Codex 세션 목록·최근 순·제목 검색(대소문자 구분)·더 보기를 제공한다. 기본 **Import a copy**는 원본을 보존하고 **Continue original**은 같은 스레드로 이어간다. 가져오기 자체로 새 모델 작업을 보내지 않으며 외부 CLI에서 원본을 사용하는 경우 복사하도록 안내한다.
- 인증된 `POST /v1/session-history`, health의 `import_codex_session`, 세션 시작의 `source_thread_id`·`import_mode`를 추가했다. 읽기 전용 보조 App Server로 목록/메타데이터를 확인하고, 새 ChatSession의 `thread/resume`·`thread/fork` → `thread/items/list`로 최근 최대 50항목을 표시한다. 모델·권한 설정은 상속한다. 외부 활성 상태의 완전한 탐지는 지원하지 않는다.
- 같은 프로젝트의 실행 세션은 대체하지 않으며, 지연된 조회 중 프로젝트 전환·중복 시작을 다시 확인한다. 다른 프로젝트의 실행·승인 대기는 유지한다. 과거 기록을 현재 승인 요청으로 재구성하지 않는다. 실패 시 이번에 만든 프로세스만 종료하고, 미리보기만 실패하면 맥락 복원 안내 후 후속 입력을 허용한다.
- Bibimer에는 ID·가져오기 방식만 메타데이터로 저장하며 목록 제목·대화 내용은 디스크에 저장하지 않는다. 가져온 원본·복사본의 영속 기록은 Codex가 관리한다. 기본 새 Chat의 `ephemeral: true`는 유지되므로 임시 대화는 목록에 나오지 않는다. 전체 과거 기록 탐색은 아직 없다.
- 브리지 테스트 **45개** 통과, 마지막 목록 제공자 필터 변경 후 가져오기 7개 재검증 통과. `smoke_ui.cjs`와 `smoke_rendering.cjs` 통과: 가져오기 검색·페이지·오류·리터럴 제목·복사 기본값·서식 기록·자동 실행/승인 없음·후속 입력·닫은 창의 늦은 응답 차단, 영어/한국어·393×780·360×460와 기존 기능을 확인했다. 화면 검증은 Android 네이티브 API를 브라우저 어댑터로 대체했다.
- 현재 Codex **0.156.1**의 생성 JSON Schema·공식 문서를 확인하고 실제 읽기 전용 목록/항목 조회 및 별도로 만든 통제된 기록의 **복사·원본 이어하기 → ready**를 검증했다. 모델 턴을 보내지 않았고 사용자 세션을 이어가거나 종료하지 않았다. 실제 프로브의 주입 기록은 턴을 만들지 않아 표시 항목은 0개였고, 과거 대화 렌더링은 통제된 프로토콜 대역으로 검증했다. 이번 프로브의 두 기록 모두 보관 처리를 확인했다. 실제 사용자 기록의 APK 표시·모델 응답·코드 수정은 별도 검증 대상이다.
- APK v2/v3 서명, 0.4.0과 같은 인증서, versionCode 8, 내장 UI·설정 파일·브리지 원본·SHA-256·설정 스크립트 문법을 확인했다. **`Download/Bibimer-0.5.0.apk`**와 `Download/bibimer-setup-0.5.0.sh`에 복사하고 원본 일치를 확인했다.
- 운영 브리지의 실행 세션 **0개**를 확인하고 **0.5.0 적용 완료**. 인증 토큰·전체 프로젝트 설정 유지, 새 기능 플래그와 실제 저장 세션 목록 API 정상 응답을 확인했다. 현재 설치 앱은 **0.4.0(versionCode 7)**이며 0.5.0 APK 설치·실제 WebView 가져오기는 사용자가 확인해야 한다. 첫 마일스톤은 아직 완료로 표시하지 않는다.

## 0.4.0 응답 렌더러·UI·아이콘 (2026-09-28)

- 사용자가 Orca·Paseo 대비 빈약한 응답 렌더링과 넓은 간격을 개선하고 Bibimer 정체성을 담은 전문적인 아이콘을 요청했다. 앱·브리지 0.4.0, APK versionCode 7로 구현했다.
- 중성 어두운 배경·민트 강조색, 12px 화면 여백과 작은 헤더·제어 행으로 작업 공간을 늘렸다. 도구는 접이식 상태 행, 답변은 Markdown 본문, 사용자 입력은 작은 카드로 구분한다. 긴 명령이 상태를 밀어내던 레이아웃을 수정했다.
- `rich-text.js`: marked 15.0.12 lexer → 허용 DOM 요소로 GFM 제목·중첩 목록·체크리스트·표·인용·강조·링크를 렌더링한다. highlight.js 11.11.1로 알려진 코드 언어를 강조하고 코드 복사·줄바꿈을 제공한다. 라이브러리 체크섬·라이선스를 빌드에 고정했다. HTML은 실행하지 않고 이미지는 자동 요청 없이 참조로 표시한다. 당시에는 HTTP(S) 링크를 탭하면 외부 브라우저로 열고 파일 경로 링크는 복사했다. 2026-10-09 소스에서 파일 링크를 Android 앱 열기로 확장했으며 위 최신 항목을 참고한다.
- 명령·도구의 상태·종료 코드·출력, 파일별 diff와 추가/삭제 수·줄 번호, 구조화된 계획 단계·완료 개수, 제공된 작업 요약을 표시한다. 브리지는 `changes`, `truncated`, `steps`, `explanation`, `summary`를 전달하고 기존 평문 필드를 유지한다. 큰 diff의 잘림 안내와 출력 미저장을 검증했다. PTY 출력 추정이나 승인 자동 처리는 추가하지 않았다.
- 스트리밍 중 이전 메시지를 읽는 위치를 유지하며 최신 응답 이동 버튼을 제공한다. 같은 항목 갱신·언어 전환 시 도구 접기·코드 줄바꿈 상태를 유지한다. 기존 프로젝트별 입력·질문 초안 유지도 회귀 검증했다.
- B와 두 코드 꺾쇠를 결합한 SVG·벡터 심벌을 앱 로고와 런처에 적용했다. 적응형 아이콘(v26)과 테마용 단색 레이어(v33), 네이티브 배경·강조색도 맞췄다. SVG MIME와 네이티브 asset 허용 목록을 함께 갱신했다.
- 브리지 테스트 38개, `smoke_ui.cjs`, 새 `smoke_rendering.cjs` 통과. GFM·구문 강조·복사·줄바꿈·diff·계획·불완전 코드 스트리밍·읽던 위치·안전한 HTML/이미지 처리·영어/한국어·393×780 및 360×460, 기존 폴더·멀티 프로젝트·IME·PTY·승인·재접속을 확인했다. 통제된 이벤트와 실제 임시 브리지/PTY를 사용했으며 모델 요청은 보내지 않았다.
- APK v2/v3·기존 인증서, 버전·소스·renderer 라이브러리/라이선스·적응형/단색 아이콘 리소스·내장 설정/브리지·SHA-256을 검증했다. `Download/Bibimer-0.4.0.apk`, `Download/bibimer-setup-0.4.0.sh`에 복사 후 원본과 일치를 확인했다.
- 운영 브리지의 활성 세션 0개를 확인하고 0.4.0으로 적용했다. 인증 토큰·전체 프로젝트 ID/이름/경로를 유지했으며 실행 세션을 종료하지 않았다. 폰의 설치 앱은 아직 0.3.0(versionCode 5)이다. 실제 WebView 외부 링크·아이콘의 런처 마스크/테마·키보드/잠금·모델 작업 검증은 남아 있다. 수식·Mermaid·이미지/HTML 미리보기·파일 편집기는 이번 범위 밖이다.
- 설계와 공개 참고 자료는 `docs/interface.md`, 통제된 화면 캡처는 Git에서 제외한 `dist/screenshots/agent-*.png`, `brand-preview.png`에 있다.

## 0.3.1 기존 프로젝트 폴더 탐색 (2026-09-28)

- 사용자가 Add에서 기존 프로젝트를 폴더 탐색으로 불러오도록 요청했다. 9월 16일 구현을 시작했고 9월 28일 최종 빌드·다운로드 폴더 복사·브리지 적용을 완료했다. 앱·브리지 0.3.1, APK versionCode 6이다.
- **Add → Browse → 폴더 이동 → Select folder → Save project**로 등록한다. 입력 경로가 존재하면 그곳에서 시작하고 없으면 Termux 홈으로 이동한다. 홈·상위 폴더, 숨김 폴더, 100개 단위 더 보기, 빈 폴더·읽기 전용·접근 오류·재시도를 제공한다. 선택 시 새 폴더 생성 체크를 해제하며 경로 직접 입력도 유지한다.
- 인증된 `POST /v1/folders`를 Termux 측에서 처리한다. 파일 내용을 읽지 않고 한 단계의 하위 폴더만 반환하며, 심볼릭 링크를 열면 실제 경로를 표시한다. 기존 프로젝트·세션을 변경하지 않는다. Android 로컬 요청 허용 목록에 이 고정 경로를 추가했고 `browse_folders` 기능이 없는 브리지에는 업데이트 안내를 표시한다.
- 브리지 테스트 37개 통과(9월 16일): 기존 33개와 탐색 인증·잘못된 요청·페이지 이동·숨김·한글/특수 문자·링크·파일 제외·권한/유실 오류·실행 세션 유지 4개. Android에서 `/` 접근이 거절될 수 있어 루트 경계는 대역으로 확인했다.
- 최종 브라우저 통합 검증 통과(9월 28일): 실제 임시 브리지·폴더로 기존 프로젝트 등록, 홈 대체·상위 이동·더 보기·숨김·빈 폴더·사라진 폴더 재시도, 취소 및 늦은 응답 분리, 이전 브리지 안내, 영어·한국어와 360×460 화면의 선택 버튼을 확인했다. 기존 멀티 프로젝트·Enter/IME·대화·PTY·재접속 검증도 통과했다. 폴더 아이콘의 접근성 이름과 선택 후 등록 버튼 포커스 오류를 수정했다. Android 네이티브 연결은 테스트 어댑터이며 실제 모델 요청은 보내지 않았다.
- 최종 APK v2/v3 서명·기존 0.3.0 인증서 일치, 버전·내장 소스·설정 파일·브리지 원본·SHA-256을 검증했다. `Download/Bibimer-0.3.1.apk`, `Download/bibimer-setup-0.3.1.sh`로 복사하고 원본과 바이트 일치를 확인했다.
- 현재 폰은 앱 0.3.0(versionCode 5) 설치 상태다. 운영 브리지 0.3.0의 활성 세션 0개를 확인하고 0.3.1로 적용했다. 토큰·전체 프로젝트 ID/이름/경로 유지, `browse_folders`와 실제 홈 폴더 API 200을 확인했다. 사용자 세션을 종료하지 않았다. APK 설치 후 실제 WebView의 Browse·폴더 선택 검증이 남아 있다.

## 0.3.0 입력 키·멀티 프로젝트 (2026-09-15)

- 사용자가 Enter 기본 전송, Shift/Ctrl+Enter 줄바꿈, 여러 프로젝트 지원·전환을 요청했다. 앱·브리지 버전 0.3.0, APK versionCode 5로 구현했다.
- Chat·PTY 공통 입력창은 Enter로 전송하고 Shift/Ctrl/Meta/Alt+Enter로 선택 영역을 줄바꿈으로 바꾼다. IME 조합 상태·키 코드 229·키 반복은 전송하지 않고 응답 중 전송 불가 상태에서도 초안을 유지한다. `enterkeyhint="send"`를 추가했다. 실제 Android 소프트 키보드 조합 동작은 별도 기기 검증이 필요하다.
- 프로젝트를 **Add(추가)**로 등록하고 상단 선택 메뉴에서 전환한다. 프로젝트당 세션 하나를 실행하며 여러 프로젝트를 동시에 실행할 수 있다. 프로젝트 목록의 실행·종료·응답 대기 상태를 갱신한다.
- 입력·프로그램·인터페이스 선택·질문 답변 초안을 프로젝트별 화면 메모리에 보관한다. 전환한 프로젝트의 출력을 다시 읽고, 지연된 전송 응답이 다른 프로젝트의 입력을 지우지 않게 한다. 승인·종료는 해당 세션 ID로만 전달한다. 초안은 앱 프로세스 종료 후 복구하지 않는다.
- 브리지 메타데이터 형식 2에 프로젝트 UUID·전체 목록·마지막 선택·프로젝트별 세션을 기록한다. 기존 단일 프로젝트 파일은 토큰을 유지한 채 자동으로 이동한다. 같은 폴더는 중복 등록하지 않으며 잘못된 프로젝트 ID로 다른 폴더에 실행하지 않는다.
- 현재 화면에 보이지 않는 프로젝트를 포함해 하나라도 세션이 실행 중이면 브리지 재시작을 거절한다. 기존 앱의 요청 형식을 유지하며 새 앱은 `multiple_projects` 기능 응답을 확인한다. 이전 브리지에 연결하면 업데이트 안내를 표시한다.
- 브리지 테스트 33개 통과: 기존 검증 및 두 셸의 입력 경로·출력·종료 분리, 두 Chat의 메시지·승인 분리, 다른 프로젝트 실행 중 재시작 거절, 전체 상태 복원·출력 미저장·단일 프로젝트 이동.
- 실제 임시 브리지와 브라우저에서 두 프로젝트 동시 실행·전환, 초안 복원, 지연된 전송 응답, 프로젝트별 종료, 승인·질문 복구, Enter 전송·Shift/Ctrl/Meta 줄바꿈·선택 영역 치환·IME/반복/응답 중 보호를 확인했다. 기존 영어·한국어·393×780/360×460·PTY 색상·재접속 테스트도 통과했다. Android 네이티브 API는 테스트 어댑터이며 실제 모델 요청은 전송하지 않았다.
- 0.3.0 APK 빌드·v2/v3 서명·기존 인증서 일치, 내장 소스·설정 파일·SHA-256 검증을 완료했다. 다운로드 폴더: `Bibimer-0.3.0.apk`, `bibimer-setup-0.3.0.sh`.
- 2026-09-15 사용자가 현재 Codex 세션 종료·브리지 적용에 `yes`로 승인했다. 준비 당시 브리지 인스턴스·세션 ID가 같은지 확인하고 해당 세션만 종료한 뒤 브리지 0.3.0을 재시작했다. 인증 토큰·프로젝트 이름과 경로 유지, 프로젝트 ID 마이그레이션, `multiple_projects` 기능과 프로젝트 목록, 활성 세션 0개를 확인했다. 기존 세션은 `exited`로 유지되고 `events`는 200을 반환하며 출력은 저장되지 않았다. 폰의 APK는 아직 0.2.0(versionCode 3)으로 최신 APK 설치와 실제 화면 검증이 남아 있다.

## 0.2.1 Start session 수정 (2026-09-14)

- 종료된 세션을 남기고 브리지를 재시작하면 `health`에는 이전 세션이 있으나 `events`는 404를 반환했다. 앱이 이를 연결 끊김으로 처리해 Start session이 계속 비활성화됐다. 현재 폰의 상태 조회와 임시 브리지의 실제 종료·재시작 테스트에서 재현했다.
- `Bridge.session_events()`가 재시작 직후 마지막 세션의 종료·유실 상태와 빈 출력을 반환하도록 수정했다. 이전 커서는 0으로 초기화하며 `gap`을 알린다. 종료 기록에 대한 입력·종료·승인 응답은 계속 거절하고, 새 세션을 시작하면 이전 ID 조회도 거절한다.
- 브리지 테스트 27개 통과. 재시작 후 출력 조회·새 세션 시작, PTY/Chat 종료·유실 기록의 인증·읽기 전용 처리 검증을 추가했다. 수정 전 재시작 테스트는 404로 실패하고 수정 후 통과했다.
- 실제 임시 브리지와 브라우저 UI에서 PTY 종료 → 브리지 재시작 → 재접속 → Start session 활성 유지 → Chat 시작을 검증했다. Chat 종료 후 같은 순서로 새 Chat 시작도 확인했다. Android 네이티브 API는 테스트 어댑터이며 실제 모델 요청은 보내지 않았다.
- 현재 폰의 브리지도 0.2.1로 설치·재시작했다. 기존 세션이 `exited`인 것을 확인한 뒤 적용했으며 인증 토큰·프로젝트 설정을 유지했다. 운영 포트의 `health`와 이전 세션의 `events`가 모두 200을 반환함을 확인했다. 현재 앱 0.2.0에서도 이 수정이 적용된다.
- 앱 배포본도 0.2.1(versionCode 4)로 빌드했다. 기존 0.2.0과 동일한 서명 인증서, v2/v3 서명, APK 내장 소스·설정 파일·SHA-256 일치를 확인했다. 파일: `dist/bibimer-debug.apk`, `dist/bibimer-setup.sh`, `Download/Bibimer-0.2.1.apk`, `Download/bibimer-setup-0.2.1.sh`. 폰의 APK를 자동 교체하지 않았으며 실제 화면 검증은 남아 있다.

## 0.2.0 변경 (2026-09-14)

사용자가 PTY 외에 Paseo와 같은 텍스트 서식·자체 입력 UI, PTY의 ASCII·색상 지원을 요청했다.

- `ChatSession`: Codex App Server(stdio) 대화. 메시지·도구 실행·파일 변경·계획, 승인·추가 질문 응답, 현재 응답 중단, 같은 실행 세션 재접속을 구현했다.
- `conversation.js`: DOM 기반 Markdown 부분 지원(제목·목록·표·코드·굵기), 코드 복사, 도구·변경 상세, 직접 입력·선택지·승인 버튼. HTML과 외부 콘텐츠를 실행하지 않는다.
- Chat과 Terminal을 세션 시작 전에 선택한다. 현재 Chat은 Codex만 지원하며 Claude와 셸은 PTY다. 한 프로젝트·한 실행 세션 범위는 유지한다.
- PTY는 ANSI 16색·256색·트루컬러·굵기·ASCII 도형을 실제 브리지→xterm 화면에서 검증했다.
- `restart` CLI와 종료 API를 추가했다. 활성 세션이 있으면 거부하고, 이전 버전은 소유권·상태 잠금·pidfd를 확인한 해당 브리지만 종료한다. 관련 절차는 `docs/setup.md`에 있다.
- 브리지 테스트 25개 통과: 기존 PTY·인증 테스트와 Chat 메시지·중복 방지·승인 복구·거절·질문·중단 실패·메모리 상한·유실·출력 미저장, 새/이전 버전 브리지 종료 및 무관한 프로세스 유지.
- 모의 Codex와 실제 브리지의 두 언어 UI 테스트 통과. 좁은 화면의 답변 버튼, 재접속, 언어 변경 시 입력 유지, 악성 HTML 비실행, 코드 복사도 확인했다.
- 설치된 Codex의 실제 PTY 및 App Server 대화 초기화·UI 재접속·종료를 `--probe-codex`로 확인했다. 실제 모델 응답·도구 실행·모델이 보낸 승인 요청은 미검증이다.
- 앱/브리지 버전 0.2.0, APK versionCode 3. 빌드·v2/v3 서명·내장 소스 체크섬 검증 통과. 파일: `dist/bibimer-debug.apk`, `dist/bibimer-setup.sh`, 다운로드 폴더의 `Bibimer-0.2.0.apk` 및 `bibimer-setup-0.2.0.sh`.
- 새 기능 구현 직후에는 앱 0.1.0과 실행 중인 브리지 0.1.0을 유지했다. 이후 업데이트 상태는 아래에 기록한다.

## 브리지 업데이트 (2026-09-14)

- 사용자 요청으로 브리지 0.2.0을 `~/.local/share/bibimer/bibimer_bridge.py`에 설치하고 `~/.local/bin/bibimer-bridge` 실행 파일을 만들었다. 두 파일은 권한 `0700`으로 원자적으로 설치했으며, 배포 설정 파일의 내장 소스·SHA-256과 저장소 소스가 일치함을 확인했다.
- 설치한 실행 파일의 `status` 명령으로 기존 브리지 연결을 확인했다. 인증 토큰과 프로젝트 설정은 변경하지 않았다.
- `pm list packages --show-versioncode --user 0 app.bibimer` 결과, 사용자가 앱 0.2.0(versionCode 3) 설치를 완료했다. 실제 앱 화면 동작 검증과는 구분한다.
- Formatted 비활성화의 원인은 실행 중인 브리지가 0.1.0이라 에이전트의 `modes`를 전달하지 않기 때문이었다. 후속 확인에서 기존 Codex 세션이 `exited` 상태인 것을 확인한 뒤 브리지 0.2.0으로 재시작·적용을 완료했다. 실행 중인 세션을 강제 종료하지 않았다.
- 실제 `127.0.0.1:8765/v1/health`에서 버전 0.2.0, Codex 설치 및 `modes: ["terminal", "chat"]`를 확인했다. 재시작 전후 인증 토큰과 프로젝트 설정이 동일하고, 설치 소스가 저장소 소스와 일치함을 검증했다.
- 앱에서 **Reconnect(다시 연결)** 후 프로그램을 **Codex**로 선택하면 **Chat · formatted text**를 선택할 수 있다. 셸·Claude는 현재 PTY만 지원한다. 실제 Android 화면에서 선택·대화 실행 확인은 아래의 남은 검증에 포함한다.

## 앞선 완료 내용

- 프로젝트 디렉터리를 `bibimer`로 변경하고 기존 Git 저장소를 유지.
- README.md에 제품 개념과 초기 범위 작성.
- AGENTS.md 및 docs/bootstrap.md에 작업 지침과 검증 계획 작성.
- 문서의 프로젝트 이름·작업 경로 및 브랜드 설명을 Bibimer 기준으로 갱신.
- README.md, AGENTS.md, docs/bootstrap.md와 이 문서에 Android 앱 제공 및 같은 폰에서 직접 개발하는 요구사항과 검증 기준을 반영.
- `bridge/bibimer_bridge.py`: 루프백 인증, 8자리 일회용 코드 연결, 프로젝트 경로 검증·생성, 셸/Codex/Claude 탐지·실행, PTY 입출력·크기 변경, 출력 재생·재접속, 명시적 종료 및 실제 반환값 표시.
- `android/app/src/main/`: Android 앱, 영어 기본·한국어 준비 가이드·프로젝트·터미널 화면, 특수 키·한글 입력창, 연결/실행 상태 분리, Android Keystore 토큰 보관, 설치 파일 내보내기.
- `scripts/build_apk.py`: API 36 플랫폼·xterm 배포본 체크섬 검증, Termux AAPT2/javac/D8/APK 서명, 자체 포함 `bibimer-setup.sh` 생성.
- `bridge/tests/test_bridge.py`, `scripts/smoke_ui.cjs`: 실제 PTY·HTTP 및 화면 연결 검증.
- `docs/setup.md`, `docs/development.md`, `docs/architecture.md`: 설치 안내, 빌드·검증 결과, 공식 문서 근거, API·제약 기록.
- 0.1.1: `i18n.js`의 화면·상태·오류 번역, Setup 언어 선택, `AppLanguage`의 별도 Android 환경 설정 저장 및 네이티브 문구 리소스. 언어 전환 시 세션과 입력을 유지한다.
- 브리지 오류에 안정적인 `code`와 영어 기본 문구를 추가했다. 새 앱은 코드가 없는 0.1.0 브리지 오류도 번역하며 기존 실행을 재시작할 필요가 없다. CLI·설정 스크립트는 영어 기본, `BIBIMER_LANGUAGE=ko` 또는 CLI의 `--language ko`로 한국어 안내를 선택한다.
- GitHub 비공개 저장소 `andy5090/bibimer` 생성 및 로컬 `origin` 연결. README.md에 저장소 링크 추가.

## 이전 버전 검증 기록과 남은 제약

2026-09-13 현재 기기: Android 16 / API 36 / arm64, Termux 0.118.3 F-Droid, Python 3.14.6, OpenJDK 21.

- 0.1.1(versionCode 2) APK 빌드와 v2/v3 서명 검증 통과. 결과: `dist/bibimer-debug.apk`와 `dist/bibimer-setup.sh`. 현재 폰에서 찾을 설치 파일: `/storage/emulated/0/Download/Bibimer-0.1.1.apk`.
- 실제 Termux PTY·HTTP 통합 테스트 17개 통과: 인증, 연결 코드 만료·시도 제한, 경로 검증, 중복 방지, 한글 입출력, 재접속, resize, Ctrl+C, 종료 코드, 전경·배경 작업 중지 및 무관한 프로세스 유지, 유실 상태, 출력 미저장, CLI 영어 기본·한국어 선택.
- 현재 기기의 Chromium에서 영어 기본(한국어 로캘)·한국어 전환·오류 번역·기존 브리지 응답 호환·언어 변경 시 실행 세션 및 작성 중인 입력 유지·코드 연결·프로젝트 생성·입출력·재접속·명시적 종료 검증. Android 네이티브 연결과 설정 저장은 테스트 어댑터로 대체했으므로 APK 실기기 검증과 구분한다.
- 393×780 및 360×460 화면에서 등록·전송 버튼 확인. 주기적 상태 갱신이 작성 중인 프로젝트 경로를 지우던 문제 수정.
- 현재 설치된 `@mmmbuto/codex-cli-termux` 0.153.3을 PTY에서 실행하고, xterm 화면 연결·같은 세션 재접속·명시적 종료까지 확인. 실제 모델 요청·코드 변경은 수행하지 않았다. Claude Code 실행 검증은 하지 않았다.
- APK에 포함된 설정 파일과 별도 설정 파일이 동일하며, 설정 파일이 담은 브리지 소스가 현재 소스와 일치함을 확인. 설정 스크립트 셸 문법 검사 및 터미널 의존성 라이선스 포함 여부 확인.
- `pm list packages --show-versioncode --user 0 app.bibimer`로 기존 0.1.0(versionCode 1) 설치 확인. 0.1.1은 같은 개발용 키로 서명한 업데이트 파일이며 실제 업데이트 설치·실행은 남아 있다.
- 사용자 요청으로 기존 브리지 시작 명령을 실행했다. 언어 추가 작업 중에는 실행 중인 브리지·사용자 세션을 재시작하거나 종료하지 않았다. 테스트는 별도 임시 폴더·포트를 사용한다.

남은 검증: 실제 모델 대화·도구 및 승인 요청, 실제 Android WebView·Keystore·언어 저장·네이티브 안내·Termux 로컬 연결, 앱 닫기·재실행·화면 잠금, OS에 의한 브리지 종료, Termux·Python·에이전트가 없는 새 사용자의 전체 설정, 에이전트 로그인·모델 작업. 첫 마일스톤은 아직 완료로 표시하지 않는다.

제약: 배포된 0.9.0은 프로젝트당 살아 있는 세션 하나이며 현재 미배포 소스는 프로젝트·에이전트별 하나로 확장했다. 고정 포트 8765, 수동 브리지 시작, 세션마다 PTY 최근 1MiB·Chat 최대 1MiB/200항목 메모리 보관, 브리지 재시작 후 모든 프로젝트의 실행 중 메타데이터를 `lost`로 표시한다. 입력 초안은 앱 화면 메모리에만 보관한다. 별도 POSIX 세션으로 분리한 데몬은 추적하지 않는다. 앱의 토큰 초기화는 Termux 세션 종료를 의미하지 않는다.

## 다음 작업

1. 자체 선택 UI·모델/추론 수준·에이전트 전환·대기 메시지 Steer·자동 설정은 소스 검증 완료·APK 및 브리지 적용 대기다. 사용자가 빌드를 요청하면 누적 변경을 새 버전에 포함한다. 브리지 업데이트 시 기존 인증·프로젝트·대화를 보존하고 새 기능 표시를 확인한다. 이전 0.9.0용 일회성 재시작 도구는 이번 다중 에이전트 세션 구조 검토 없이 재사용하지 않는다. 실제 WebView의 목록 열기·선택·취소·뒤로 가기·TalkBack·작은 화면, 모델/수준 저장과 다음 응답 적용, 에이전트 왕복·세션 격리를 확인한다. 현재 `Download/Bibimer-0.9.0.apk`와 운영 브리지는 Settings·Enter·권한/Fast·Queue/Steer까지 포함하며 **0.9.0 재시작·기존 대화 복원은 완료 확인했다.** OpenCode Chat/PTY, 가져오기·후속 지시, 응답/도구/diff/코드 렌더링과 Project Add → Browse도 실제 폰에서 확인한다. 외부 CLI에서 원본을 사용 중이면 복사한다.
2. 기존 인증 토큰을 유지하므로 새 연결 코드가 필요한 경우에만 Termux에서 `~/.local/bin/bibimer-bridge pair`를 실행한다. 코드나 토큰은 저장소·일반 로그에 남기지 않는다.
3. 실제 APK에서 Enter·줄바꿈·한글 조합, 여러 프로젝트 추가·전환·동시 실행·복수 선택 질문 초안 유지, Chat·PTY 선택, 영어·한국어, 모델 응답·승인·응답 중단·재접속을 검증한다. Bibimer 출력은 브리지 메모리만 유지하며 0.7.0부터 Codex 새 Chat도 영구 저장한다. 세 에이전트의 기록은 각 도구의 저장 규칙에 따라 Saved sessions에서 같은 ID로 이어갈 수 있다. 이전 임시 세션은 자동 변환되지 않는다.
4. Termux가 없는 기기에서 설치 안내 → 설정 파일 저장 → Python·브리지 설치 → 앱 연결을 별도로 검증한다.

빌드 및 테스트 명령은 `docs/development.md`를 따른다. 변경 내용은 `main`에서 커밋하고 `origin/main`과 동기화한다. 빌드 결과·도구 캐시·로컬 서명 키는 Git에서 제외되어 있다.

## 웹사이트 버전 공지를 없애고 일반 안내로 정리 (2026-10-21)

- 사용자 피드백에 따라10언어 홈의 별도 업데이트 공지와 공개/테스터/심사 버전 상태를 삭제했다. 가이드의 버전별 소식은 세션·입력·브리지 관리 사용법으로 바꿨다. 버전번호·특정 시작화면 수정 이력·브리지 최소버전 공지 대신 기능을 쓰는 방법과 앱의 브리지 업데이트 안내를 따르는 방법을 남겼다. 버전별 변경은 Play 출시 노트에서 안내하고 웹사이트는 실제 기능/사용 흐름이 달라질 때 해당 설명만 갱신한다는 기준을 release/website/README.md에 기록했다.
- 소개·갤러리·기능·설치·이름 유래·문의/정책·SEO 경로를 유지하며 새 UI/의존성을 추가하지 않았다. 홈10개/가이드10개HTML과 웹사이트문서만 변경했고 문의 API/DB/Discord·앱코드는 변경하지 않았다.
- 웹사이트2검사·언어선택·diff 검사를 통과했다. Chromium의10언어×홈/가이드×320/1100px 총40상태에서 공지/버전텍스트없음·가로넘침없음을 확인했다. 한국어화면을 기존사이트와 비교해96/pass. dist/website-evergreen/{layout-verification.json,ko-home-320.png,ko-home-1100.png,ko-guide-320.png,ko-guide-1100.png} 및 .omx/state/website-evergreen/ralph-progress.json.
- Cloudflare Pages **https://140daff4.bibimer.pages.dev** 배포. 공개44리소스 원본/보안헤더/no-transform과404·기존API거절조건을 확인했다(dist/website-evergreen/public-verification.json). DB실제접수/Discord알림은 변경이 없어 재전송하지 않았다. 다른브라우저엔진의 실제렌더링은 미검증이다. 병행 중인 iOS/기존 NEXT_SESSION.md 변경은 보존하고 이 기록만 분리해 스테이징했다.
