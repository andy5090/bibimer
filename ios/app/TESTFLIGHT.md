# iOS TestFlight 배포

## iOS 0.1.0(8) TestFlight 내부 배포 완료 (2026-11-12)

- **02:36 Asia/Seoul**, Apple 처리·기존 표준 암호화(Apple OS 외/병행)·프랑스 미배포 응답과 한/영 테스트 안내1018자 저장을 완료했다. 기존 **Bibimer Internal** 그룹의 **0.1.0(8)·테스트 중·90일 후 만료**, 내부 테스터1명·빌드8개를 직접 확인했다. 기존1–7번·그룹/테스터·자동 배포 설정을 유지했다.
- 업로드 소스 `23168f5f6ce26d9d005b1e979fb59e39f5dec6bb`, 빌드 ID `df6a60df-5432-41b3-8069-ea8faf1b8dc1`. IPA **8,555,777 bytes**, SHA-256 `95e2d0abb3a01e8310c45f9e7aa19f05c3fa165f3b72aa310fe8402e02c1cca1`.**02:31:11 Asia/Seoul Xcode 업로드 성공/exit0/EXPORT SUCCEEDED**다. 아카이브 `dist/ios-testflight/0.1.0-8-unsigned-nov12-recovery/Bibimer.xcarchive`, IPA `dist/ios-testflight/0.1.0-8-export-nov12-recovery/export/Bibimer.ipa`, 비공개 증빙 `dist/ios-testflight/upload-0.1.0-8-nov12/`.
- 복귀/명시적 다시 연결 후 health 실패가30초/5회 이상 지속되면 Linux 사용자 프로세스 종료를 확인하고 동일 rootfs에서 서비스를 다시 시작한다. PID1 supervisor·WKWebView·파일/저장 대화·세션 목록은 유지하며 이전 프로세스는 lost, PTY 출력/미저장 대기열은 유실로 처리한다. 메시지/명령/승인은 재전송하지 않고 브라우저 제어는 다시 허용해야 한다. Claude 설정 로그인은 대화형 `/login`과 수동 코드 입력 경로를 사용한다.
- 양 SDK 컴파일·archive/dSYM·배포 서명·현재 소스/IPA 자산(웹64·게스트18·네이티브11자산/13소스·현지화20·rootfs426) 일치를 확인했다. 실제 전용 WKWebView/Linux **30개·26.83초·JS오류0**와 모의 백그라운드 정책20개·앱 Python29·iOS 브리지56·Node16파일·Chromium20배치·main/서비스/RuntimeSupport 정적분석0을 통과했다. 최초 검사의 누락된 self-test bridge ID와 필수 검사 목록을 보완했으며 실제 동작 경로 변경은 없다. 기존 syscall 경고4개·미사용 매개변수 컴파일 경고16개는 유지했다.
- **TestFlight에서0.1.0(8)로 업데이트한다.** 실제 iPhone의 잠금/앱 전환 복구·복구 후 인증 유지·Claude 로그인 및 OS 백그라운드 허가/지속 시간은 별도 확인이다. PID1 종료/커널 교착 복구나 무기한 상주를 보장하지 않는다. 사용자 앱/Runtime Lab/브리지·세션 재시작·Android/웹사이트 배포·외부 베타·정식 App Store 제출은 수행하지 않았다. 아래 준비/미빌드 기록은 이번 배포 이전 상태다.

## iOS 0.1.0(7) TestFlight 내부 배포 완료 (2026-11-11)

- **01:55 Asia/Seoul**, Apple 처리·기존 표준 암호화(Apple OS 외/병행)·프랑스 미배포 응답과 한/영 테스트 안내951자 저장을 완료했다. 기존 **Bibimer Internal** 그룹의 **0.1.0(7)·테스트 중·90일 후 만료**, 내부 테스터1명·빌드7개를 직접 확인했다. 기존1–6번·그룹/테스터·자동 배포 설정을 유지했다.
- 업로드 소스 `9358f8a409699e8ed4e9a93d46572be9bfbaf305`, 빌드 ID `9fd50bbc-5af0-4629-a41f-ac1c58ffd6e5`. IPA **8,547,418 bytes**, SHA-256 `8f2be311809f483e98cd060ce1132b9e6b7c2cc0c9accc76eaf15bb839990515`. **01:51:09 Asia/Seoul Xcode 업로드 성공/exit0/EXPORT SUCCEEDED**이며 Console 접수 시각은01:52다. 아카이브 `dist/ios-testflight/0.1.0-7-unsigned-nov11-reconnect/Bibimer.xcarchive`, IPA `dist/ios-testflight/0.1.0-7-export-nov11-reconnect/export/Bibimer.ipa`, 비공개 증빙 `dist/ios-testflight/upload-0.1.0-7-nov11/`.
- 비활성/백그라운드 복귀와 수동 다시 연결에서 새 HTTP transport를 사용하고 멈춘 health 요청을5초 감시로 폐기한다. 기존 WKWebView·bridge·session·draft를 유지하고 제출된 POST는 취소/재전송하지 않는다. 저장 세션 로딩·연결 끊김 옆 다시 연결·답변 우측 하단 재생/복사·조작 UI 선택 방지를 포함한다. 기존 공식 백그라운드 작업·화면 유지 설정도 포함한다.
- 양 SDK 컴파일·아카이브/dSYM·배포 서명·현재 소스/IPA 자산(웹64·게스트17·네이티브11자산/13소스·현지화20·rootfs426) 일치를 확인했다. 실제 전용 QA WKWebView/Linux **29개·19.04초·JS오류0**와 모의 백그라운드 정책20개·Python25·Node16파일·Chromium20배치·Clang 정적분석0을 통과했다. 기존 syscall 경고4개와 미사용 매개변수 컴파일 경고16개는 남아 있다.
- **TestFlight에서0.1.0(7)로 업데이트한다.** 실제 iPhone의 앱 전환/잠금 복귀·OS 백그라운드 허가/지속 시간은 별도 검증이다. 이번 검사는 살아 있는 Linux의 transport 복구이며 init 종료/교착 복구나 무기한 상주를 보장하지 않는다. 사용자 앱/브리지/세션 재시작·Android/웹사이트 배포·외부 베타·정식 App Store 제출은 수행하지 않았다. 아래 미빌드/이전 배포 기록은 당시 상태다.

## iOS 0.1.0(6) TestFlight 내부 배포 완료 (2026-11-10)

- **02:13 Asia/Seoul**, Apple 처리·기존 암호화 응답(Apple OS 외/병행 표준 암호화·프랑스 미배포)과 한/영 테스트 안내1139자 저장을 완료했다. 기존 **Bibimer Internal** 그룹에서 **0.1.0(6)·테스트 중·90일 후 만료**, 내부 테스터1명·빌드6개를 직접 확인했다. 기존1–5번·그룹/테스터·자동 배포OFF를 유지하고 새 초대·외부 베타·정식 App Store 제출은 하지 않았다.
- 빌드 ID `bef07861-a51e-4284-a1d2-fd166de145ca`, 업로드 소스 `a80bf35be9d9b83927d641b833a879b3aa742533`. 검증한 로컬 export IPA **8,545,477 bytes**, SHA-256 `46c9119eec914ffa15c21847e699b62b88b000b00b8d292bc12c931ae4a9a7c8`. 최종 background-final 아카이브에서 **02:04:29 Asia/Seoul Xcode 업로드 성공/exit0/EXPORT SUCCEEDED**를 확인했다. 비공개 증빙은 dist/ios-testflight/upload-0.1.0-6-nov10/의 upload-receipt.json·xcode-upload.log·test-notes.txt다. 앞선 미수정 로컬 후보는 업로드하지 않았다.
- 잠금 복귀 재연결·자동 잠금 방지/하단 홈 제스처 완화 설정과 원격75936f5의 답변 하단 재생/복사를 포함한다. 새 BackgroundExecution은 **iOS26+의 실제 설치/버전 확인과 진행 중 Chat/비정지 대기열**에 공식 백그라운드 API를 연결한다(지원 기기 기본 켜짐). 유휴 터미널·로그인·무기한 Linux 상주는 대상이 아니며 OS 허가/지속 시간은 보장하지 않는다. 만료·거절·설정 해제로 세션을 임의 종료하거나 명령/승인/대기열을 재전송하지 않는다. 화면 유지 두 옵션은 각각 기본 꺼짐이다.
- 양 SDK 컴파일·아카이브/dSYM·배포 서명·현재 소스와 IPA 자산(웹64·게스트17·네이티브11자산/13소스·현지화20) 일치를 확인했다. 실제 QA WKWebView/Linux **29개·15.96초·JS오류0**, 네이티브 모의 정책20개·Python25·Node11파일·공통 답변/음성/중단 질문3검사·Chromium20배치·main/서비스 정적분석0을 통과했다. 기존 syscall151/152 경고4개는 보존했다.
- **TestFlight에서0.1.0(6)로 업데이트한다. 실제 iPhone의 OS 백그라운드 허가·Live Activity·잠금 후 장시간 실행은 아직 미검증**이다. Simulator의 모의 스케줄러 성공을 실기기 상시 실행 성공으로 표시하지 않는다. Codex 폰 설치 성공은 사용자 확인이며 Claude 폰 설치 결과는 미확정이다. Android/웹사이트 배포나 사용자 브리지/앱 재시작은 수행하지 않았다. 아래 준비/미배포 기록은 당시 상태이며 이번6번에 포함됐다.

## iOS 0.1.0(5) TestFlight 내부 배포 완료 (2026-11-09)

- **22:59 Asia/Seoul**, 기존 **Bibimer Internal** 그룹에서 **0.1.0(5)·테스트 중·90일 후 만료**, 내부 테스터1명·빌드5개를 확인했다. 한/영 테스트 안내737자와 기존 표준 암호화(Apple OS 외/병행)·프랑스 미배포 응답을 저장했다.
- 빌드 ID `097f861a-fae5-4c8c-9b18-b913e556f820`, 소스 `0bcbbd4c19bb46dd9551f01da7127940facdcfb9`, IPA **8,499,702 bytes**, SHA-256 `e9afeb9bd3d7b8f9c19af532565ec16d811adf4a63b34bc3afb0ba149acb6013`. 기기용 컴파일·아카이브/dSYM·배포 서명·IPA의 자산과 현재 소스 일치(웹64·게스트17·네이티브11자산/11소스)를 검증했다. **22:54:18 Asia/Seoul** Xcode 업로드 성공/exit0/EXPORT SUCCEEDED다. 비공개 증빙은 `dist/ios-testflight/upload-0.1.0-5-nov09/`이며 바이너리/서명/계정 자료는 커밋하지 않는다.
- 연결 끊김 시 상단 탐색·Settings Back, 기존 WKWebView 재연결, 종료된 Linux의 완전 종료/재실행 안내와 Chat/터미널별 두 손가락 글자 크기 조절을 포함한다. 앱 전체 더블 탭/핀치 확대·좌우 밀림을 제한한다. 공통 전체 화면 판정도 단순히 연결 상태를 포함하도록 수정했다.
- 전용 QA Simulator의 실제 WKWebView/Linux25개·14.02초·JS오류0·fatal0·진단실패0, 기존 syscall 경고4개를 보존했다. Python25·Node11파일·917키×10언어·Chromium20배치·Clang 정적분석0을 확인했다. 실제 iPhone 손가락 제스처/장시간 네트워크 단절·실제 Linux 종료 후 재실행은 별도 확인이다. 기존 그룹/테스터·자동 배포OFF·이전 빌드는 유지했다.

## iOS 0.1.0(4) TestFlight 내부 배포 완료 (2026-11-09)

- **02:52 Asia/Seoul**, Apple 처리·기존 암호화 응답(Apple OS 외/병행 표준 암호화·프랑스 미배포)과 en-US의 한/영 테스트 안내900자 저장을 완료했다. 기존 **Bibimer Internal** 그룹에서 **0.1.0(4)·테스트 중·90일 후 만료**, 내부 테스터1명·빌드4개를 직접 확인했다. 기존1/2/3번·그룹/테스터·자동 배포OFF를 유지했고 새 초대·외부 베타·정식 App Store 제출은 하지 않았다.
- 빌드 ID `24b30dd1-a175-4619-8297-e23c3713a197`, 업로드 소스 `6dfb78d783b258c18ec07691117c3ac7a4b53bff`. 수정본 IPA `dist/ios-testflight/0.1.0-4-export-nov09-scene/export/Bibimer.ipa`, **8,486,753 bytes**, SHA-256 **`a839a9fa94dbf69fe6099c99718638971c9595ac204eb958be693e4747e95761`**. 업로드 로그의 EXPORT SUCCEEDED/exit0와 Console 접수02:48을 확인했다. 비공개 증빙은 `dist/ios-testflight/upload-0.1.0-4-nov09/{upload-receipt.json,xcode-upload.log,test-notes.txt}`이며 바이너리·서명/계정 자료는 커밋하지 않는다.
- iOS27 Scene 시작 충돌과 게스트 Unix 소켓 경로 수정·최신 공통 기능을 포함한다. 양 SDK 컴파일·아카이브/dSYM·배포 서명·공유63자산·네이티브11소스 manifest 검증, 실제 QA WKWebView/Linux21개/14.00초/JS0, 앱Python25·브리지55·런타임판정32·Node8·917키×10언어·정적분석0을 확인했다. 준비 항목의 **제공 확인 전** 상태는 해결됐다. 테스트의 긴 경로 fixture는 해당 테스트 전용 TemporaryDirectory 안으로 한정해 재검증했다(제품 바이너리 변경 없음).
- **TestFlight에서0.1.0(4)로 업데이트한 뒤 iPhone에서 완전히 닫고 다시 열어 확인한다.** iOS26.5 Simulator 성공은 iOS27 실기기 콜드 실행·실제 마이크/음성/알림/브라우저·잠금/장시간 실행의 증거가 아니다. Xcode 충돌을 실기기 확인 없이 Resolved로 표시하지 않았으며, 사용자 설치본·운영 브리지/세션을 임의 재시작하지 않았다. Android/웹사이트 배포도 없다.

## 0.1.0(4) 빌드 검증 (2026-11-09, 제공 확인 전)

최신 공통 UI/음성/알림/브라우저와 iOS27 Scene 시작 충돌·게스트 Unix 소켓 경로 수정을 양 SDK로 컴파일했다. 전용 QA Simulator의 WKWebView/내장 Linux21개·JS오류0·14.00초, 기존 syscall 경고4개를 보존했다. Python25개와 배포 Scene 거절/Darwin 실제 소켓 회귀도 통과했다. 수정본 `0.1.0-4-unsigned-nov09-scene` 아카이브와 `0.1.0-4-export-nov09-scene` 경로를 사용하며 앞선 미수정 후보는 업로드하지 않는다. 최신 실제 내부 제공 버전은 아직3이며, 업로드/처리/기존 그룹 제공과 iOS27 실기기 콜드 실행은 각각 확인해야 한다. 상세 근거와 제약은 `VALIDATION.md`와 루트 `NEXT_SESSION.md`를 따른다.

## 2026-11-09 Mac에서 재빌드 이어가기

최신 기능을 포함한 재빌드/내부 배포 요청을 받아 사용자가 레포 싱크 후 Mac에서 진행하기로 했다. 최신 소스와 사전 검사·기능 제약·충돌 정보는 루트 `NEXT_SESSION.md`의 **iOS 최신 기능 재빌드 — Mac 인계**를 먼저 읽는다. 마지막 실제 배포는 계속 0.1.0(3)이며 새 빌드 번호는 아직 확정/업로드하지 않았다. iPhone 13/iOS 27.0.1의 실행 직후 충돌 1건이 Console에서 확인되어 Xcode의 상세 스택 확보와 실제 iPhone 콜드 실행 검증이 필요하다.


2026-11-07 추가한 음성·완료 알림·WebKit 및 최신 공통 기능은 **소스 구현 상태이며 아래0.1.0(3)에 미포함**이다. [기능 반영 현황과 빌드 전 검증](FEATURE_PARITY.md)을 확인한다. 새 빌드·서명·업로드는 아직 수행하지 않았다.

## 0.1.0(3) TestFlight 내부 배포 완료 (2026-10-28)

- 기본 특수 키2줄68px·펼친 F키1줄 추가104px, 윗줄 F펼침 버튼과 위/아래 화살표, Ctrl+C 전용 키 제거와 Ctrl/Alt/Shift 홀딩 토글을 포함한다. 보조 키는 다시 누르면 해제하며 세션/화면/연결 변경에도 초기화한다. Ctrl+C는 Ctrl을 켜고 키보드 C를 입력한다. 구형 GitHub CLI 인증 확인과 Mac의 키보드 가이드/화면 높이 수정도 포함한다. 공유 브리지는0.23.1이다.
- 10언어·120키보드/80사이드바 배치, 제어 문자/홀딩/Shift 조합,805키×10언어·전체 격리 UI, scripts39개·GitHub13개·앱20개가 통과했다. 별도 QA Simulator의 실제 WKWebView/내장 Linux21개가13.99초에 통과했다. 기존 syscall151/152 경고4개·fatal/진단 실패0으로 PASS_WITH_WARNINGS다.58개 Web 파일이 현재 소스와 일치한다.
- `dist/ios-testflight/0.1.0-3-unsigned-oct28/Bibimer.xcarchive`에서 기존 팀·번들·Xcode 계정으로 App Store 배포 서명/export를 완료했다. IPA `dist/ios-testflight/0.1.0-3-export-oct28/export/Bibimer.ipa`,8,330,767bytes·SHA-256 `97cde470edcb0ab4e846e362da540bb0ee825ae6b3b2fe6223cb7e4d5797e03e`다. 등록 기기/새 키/인증서 폐기 없이 서명/프로파일 검증까지 통과했다.
- 최종 소스 `a11b52ea2e2f00e73fd7910c180c6d715a2a9c03`를 레포에 동기화한 뒤 **2026-10-28 02:06:11 Asia/Seoul Xcode 업로드 성공/exit0/EXPORT SUCCEEDED**를 확인했다. Apple 처리 후 기존 표준 암호화(Apple OS 외/병행)·프랑스 배포 안 함으로 응답하고, en-US 테스트 안내에 영어·한국어673자를 저장해 저장 완료를 확인했다.
- **02:12 Asia/Seoul**, 기존 **Bibimer Internal** 그룹의 **0.1.0(3)·테스트 중·90일 후 만료**, 내부 테스터1명·빌드3개를 확인했다. 기존1/2번도 테스트 중이다. 빌드 ID `ea92b315-9985-421b-ae1c-287530eabf0d`; 그룹/테스터 범위·자동 배포OFF를 유지하고 새 초대·외부 베타 심사·정식 App Store 제출은 하지 않았다. 증빙은 `dist/ios-testflight/upload-0.1.0-3/{upload-receipt.json,internal-testing.png,internal-testing-summary.png}`와0600 업로드 로그다. TestFlight 앱에서0.1.0(3)을 업데이트한다.
- 실제 iPhone·macOS TestFlight 업데이트 설치·외장 키보드/IME·작은 키 터치/F키 스와이프·제공자별 새 실제 모델 응답 검증은 별도다.

## 0.1.0(2) TestFlight 내부 배포 완료 (2026-10-28)

- 소스 `a9f3162`의 터미널 하단 입력/에이전트 전환 제거, 역T자 방향키·일회 Ctrl/Alt·확장 F1–F12, 검토 후 붙여넣기, 사이드바 폭과 Codex 초기 조회 기한 수정을 기기용으로 빌드했다. 기존0.1.0(1)은 계속 제공 중이다.
- 별도 QA Simulator에서 실제 WKWebView·내장 ARM64 Linux21개 검사/12.79초 통과, JavaScript 오류0·fatal0·진단 실패0이며 알려진 syscall151/152 경고4개만 있다. 앱 Python20개와 공유 UI80+키보드100배치·805키×10언어·전체 격리 UI 회귀도 통과했다. agent-first 기본 선택 때문에 smoke가 셸 선택 전에 launch 활성화를 기다리던 테스트 조건을 고쳐 재통과했다. 실제 모델 응답을 새로 요청하지 않았다.
- 아카이브 `dist/ios-testflight/0.1.0-2-unsigned-oct28/Bibimer.xcarchive`와 export `dist/ios-testflight/0.1.0-2-export-oct28/`를 사용했다. IPA8,329,512bytes·SHA-256 `26ae6accdda88a7bcc86d8371d56163ef99da92084ad611784be3b2dfa405219`, 배포 서명/프로파일 검증 및 현재 소스와58개 Web 자산 일치를 확인했다. 기존 팀·번들·Xcode 계정을 유지하고 기기를 등록하지 않았다.
- **2026-10-28 00:40:26 Asia/Seoul Xcode 업로드 성공/exit0/EXPORT SUCCEEDED**다. `dist/ios-testflight/upload-0.1.0-2/{upload-receipt.json,xcode-upload.log}`에 결과를 보관하며 로그는0600이다.
- 사용자가 기존 Chrome의 Apple 로그인을 직접 완료한 뒤 처리된2번 빌드를 확인했다. 수출 규정 응답은 기존과 동일한 **표준 암호화(Apple OS 외/병행 구현)·프랑스 배포 안 함**이다. 암호화가 없다고 선언하거나 Info.plist 면제 키를 추가하지 않았다. en-US 테스트 내용에 영어·한국어 안내602자를 저장하고 저장 완료를 확인했다.
- **2026-10-28 00:53 Asia/Seoul**, 기존 **Bibimer Internal** 그룹에2번을 추가하고 새 그룹 화면에서 **0.1.0(2)·테스트 중·90일 후 만료**, 내부 테스터1명·빌드2개를 확인했다. 기존1번도 테스트 중으로 유지한다. 빌드 ID `419d25ce-9d93-49ad-b8f6-23776c2a7b8c`; 그룹/테스터 범위·자동 배포OFF는 유지했고 재업로드·새 초대·외부 베타 심사·정식 App Store 제출은 하지 않았다. 완료 증빙은 `dist/ios-testflight/upload-0.1.0-2/{upload-receipt.json,internal-testing.png,internal-testing-summary.png}`다. TestFlight 앱에서0.1.0(2)를 업데이트한다.
- 실제 iPhone·macOS TestFlight 업데이트 설치와 장시간/잠금/발열, 제공자별 실제 계정 응답은 이번 검사에 포함하지 않았다.

## 첫 배포 기록 (2026-10-25)

- 첫 iOS 배포 후보는 `app.bibimer.ios`, **0.1.0(1)**이다. 최신 공유 UI·게스트 소스를 기기용으로 컴파일하고 기존 브랜드 아이콘의 불투명1024px AppIcon을 포함했다. Android 버전·배포 설정은 변경하지 않았다.
- `dist/ios-testflight/0.1.0-1-unsigned-final/Bibimer.xcarchive`에서 실제 Xcode archive가 통과했다. iPhoneOS27.1·arm64·SDK metadata·실행 파일/dSYM UUID 일치,507개 manifest 자산 원본 일치·개인정보 manifest·iPhone/iPad 아이콘을 확인했다. 이 아카이브 자체는 unsigned이고, 아래 별도 export에서 배포 서명·업로드를 완료했다.
- 기존 사용자 앱과 분리한 `Bibimer TestFlight QA` 시뮬레이터에서 실제 WKWebView/내장 Linux **21개 검사 통과**,34.08초·JavaScript 오류0·fatal0·진단 실패0이다. 기존 syscall151/152 경고4개와 초기 APK 네트워크 복구 경고1개를 보존한 `PASS_WITH_WARNINGS`다. 증빙 `dist/ios-app/testflight-smoke/`, 로그 `.tools/ios-testflight-{device-final-build,simulator-build,qa,app-tests-final}.log`.
- 배포 경계14개를 포함한 앱 Python20개와 권한·설정·클립보드·터미널 Node 회귀가 통과했다. 실제 iPhone 실행·CLI 실제 계정 응답·장시간/잠금·메모리/발열은 이번 검사에 포함하지 않았다.
- 사용자가 Apple 로그인·새 개발자 계약 동의를 직접 완료했다. Bibimer 앱(Apple ID `6826729307`)을 등록하고 **2026-10-25 11:23 Asia/Seoul에 Xcode 업로드 성공**을 확인했다. Apple 처리와 암호화 응답을 완료하고 **Bibimer Internal** 그룹에서 **0.1.0(1) / 테스트 중 / 테스터1명 / 빌드1개**를 확인했다. 계정 소유자 한 명만 초대했으며 상태는 **초대됨**, 빌드는 90일 후 만료다. 실제 iPhone 초대 수락·설치·실행은 아직 확인하지 않았다.
- 자동 배포는 **꺼짐**이다. 이후 업로드 빌드는 이 그룹에 직접 추가한다. 자동 배포를 켠 새 그룹에서는 향후 업로드 빌드도 자동으로 추가된다. 이 설정은 App Store 정식 자동 출시와 무관하며, Apple 생성 화면 안내상 그룹 생성 후 변경할 수 없다.
- 암호화 질문은 **표준 암호화 사용(Apple OS 외 구현 포함)**·**프랑스 배포 안 함**으로 응답했다. 이번 한국 계정 소유자용 첫 내부 테스트 범위다. 프랑스나 외부 배포 확대 전 신고를 다시 확인한다. 암호화가 없다고 선언하거나 `ITSAppUsesNonExemptEncryption=false`를 임의 추가하지 않았다.
- 베타 설명·공개 지원 이메일·마케팅 URL은 저장 후 재방문해 확인했다. 외부 베타 심사 연락처와 심사용 추가 정보는 미작성/미저장이다. 외부 테스터·공개 링크·정식 App Store 심사 제출은 진행하지 않았다.
- 증빙은 `dist/ios-testflight/upload-0.1.0-1/{upload-receipt.json,internal-testing.jpg}`다. 초대 계정으로 iPhone에서 초대 메일을 열고 TestFlight를 통해 수락·설치한다. [내부 그룹](https://appstoreconnect.apple.com/teams/de8119d6-cda7-41ce-b0e1-5d1f49c57367/apps/6826729307/testflight/groups/05c12695-3fe4-411f-acf8-53bce8a31aac/builds).

`Resources/PrivacyInfo.xcprivacy`의 사용 사유는 앱 전용 설정(UserDefaults/CA92.1), 앱 컨테이너 파일 메타데이터(FileTimestamp/C617.1), 런타임 타이머/경과시간(SystemBootTime/35F9.1), 패키지·파일 기록의 공간 부족 확인(DiskSpace/E174.1)이다. Apple의 [공식 API 사유 목록](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype)을 기준으로 작성했다. 이것만으로 App Store 개인정보 응답이나 임의 설치 CLI의 제공자별 데이터 처리를 모두 선언한 것으로 취급하지 않는다.

`build.py`가 만든 **iphoneos arm64** 앱을 작은 Xcode 앱 타깃으로 감싸 아카이브한다. Xcode가 SDK 정보, 아이콘 asset catalog, 서명, 프로비저닝과 export를 처리한다. 별도 Python 패키지는 필요하지 않다. 이 도구는 **App Store Connect 업로드나 테스터 초대를 실행하지 않는다**.

## 전제

- 전체 Xcode와 iOS SDK. 기본 경로는 `/Applications/Xcode.app/Contents/Developer`이며 `DEVELOPER_DIR`로 명시할 수 있다.
- 최신 소스에서 `python3 ios/app/build.py --sdk iphoneos`를 완료한 `.tools/ios-app/iphoneos/Bibimer.app`. 배포 스크립트는 실행 파일 SHA-256, Mach-O iOS device platform, arm64를 검사한다. 시뮬레이터 앱은 거절한다.
- 배포 시에는 유료 Apple Developer Program 팀, Xcode Accounts 로그인, 해당 팀의 App ID 및 App Store Connect 앱 등록이 필요하다. macOS Developer ID 인증서만으로 iOS 배포를 할 수 없다.
- AppIcon을 포함한 `.xcassets`를 `--asset-catalog`에 전달한다. 앱 개인정보 manifest·실제 동작·런타임 라이선스 및 다운로드 코드 심사 적합성 검토는 별도로 필요하다. 아카이브 검증 성공을 Apple 심사 승인이나 실기기 검증으로 간주하지 않는다.

## 계정 없이 아카이브 확인

```sh
python3 ios/app/distribute.py \
  --unsigned --version 0.1.0 --build 1 \
  --output dist/ios-testflight/0.1.0-1-unsigned \
  --asset-catalog ios/app/Assets.xcassets
```

아이콘 준비 전 구조 확인만 할 때는 `--asset-catalog`를 생략할 수 있다. unsigned 아카이브는 설치·TestFlight 배포용이 아니다. 실제 Xcode archive의 앱 경로·번들 ID·버전·빌드·SDK 메타데이터와 실행 파일/dSYM UUID 일치를 확인한다. 원본 `.app`는 변경하지 않는다.

## 실기기 등록 없이 로컬 IPA export

자동 서명으로 **archive**부터 만들면 Xcode가 Apple Development 프로파일을 요구하고, 팀에 등록 기기가 없으면 실패한다. 이 경우 위 unsigned 아카이브를 유지하고 **App Store Connect export 단계에서** 배포 서명을 시도한다. 가짜 UDID나 불필요한 개발 기기 등록을 하지 않는다.

확인된 **iOS 팀 ID**를 사용한다. 아래 `ABCDEFGHIJ`는 예시다.

```sh
python3 ios/app/distribute.py \
  --archive dist/ios-testflight/0.1.0-1-unsigned/Bibimer.xcarchive \
  --team ABCDEFGHIJ --version 0.1.0 --build 1 \
  --output dist/ios-testflight/0.1.0-1-export \
  --allow-provisioning-updates --export
```

기존 아카이브의 앱·버전·SDK·dSYM을 먼저 재확인하고 개발 서명 archive 단계를 생략한다. 2026-10-25 실제 유료 팀 계정에서 이 경로의 **App Store Connect IPA export에 성공**했다. 등록 iPhone 없이 unsigned 아카이브에서 자동 배포 서명·프로비저닝을 완료하고, IPA 코드 서명·팀/번들 ID·App Store 프로파일·`get-task-allow=false`를 확인했다. 이 결과는 업로드 성공이나 실기기 실행 확인을 뜻하지 않는다.

`--allow-provisioning-updates`는 Xcode가 Apple 계정에 연결해 프로비저닝 자료를 생성/갱신할 수 있는 명시적 옵션이다. 자동 기기 등록 옵션은 사용하지 않는다. 이미 필요한 서명 자료가 설치되어 있으면 이 옵션을 생략할 수 있다. 인증서 폐기나 기존 프로파일 삭제는 실행하지 않는다.

### 수동 App Store 서명 경로

직접 export가 서명되지 않은 아카이브를 거절하거나 적절한 배포 자료를 고르지 못하면, 실제 계정에서 **Apple Distribution 인증서와 개인 키**, 해당 팀/번들 ID용 **App Store Connect 프로비저닝 프로파일**을 먼저 준비한다. App Store 프로파일은 개발 기기 등록을 요구하지 않는다. 설치된 프로파일 UUID를 지정하면 Xcode wrapper archive와 export 모두 수동 배포 서명으로 실행한다.

```sh
python3 ios/app/distribute.py \
  --team ABCDEFGHIJ --version 0.1.0 --build 1 \
  --profile-uuid 12345678-1234-1234-1234-123456789012 \
  --output dist/ios-testflight/0.1.0-1-manual \
  --asset-catalog ios/app/Assets.xcassets --export
```

위 UUID는 예시다. 기존 archive를 수동으로 export할 때도 `--archive ... --profile-uuid ... --export`를 사용할 수 있다. 수동 경로는 `Apple Distribution` 인증서, 지정 프로파일, `signingStyle=manual`을 사용하며 Apple Development 프로파일을 요청하지 않는다.

등록 기기가 있는 팀에서 기존 자동 archive부터 진행하려면 `--archive`·`--profile-uuid` 없이 `--team ... --asset-catalog ... --allow-provisioning-updates --export`를 사용할 수 있다.

산출물:

- `Bibimer.xcarchive`: 정상 iOS 앱 아카이브 및 UUID가 일치하는 dSYM.
- `ExportOptions.plist`: `app-store-connect`, **로컬 export**, 빌드 번호 자동 변경 꺼짐. 외부 TestFlight 사용을 막는 internal-only 제한을 지정하지 않는다.
- `export/*.ipa`: Xcode export 성공 후 코드 서명, App Store용 프로파일, 팀·번들 ID·만료를 검증한 IPA.
- `distribution.json`: 아카이브 서명 여부와 export 서명 검증 결과를 구분한다. `uploaded`와 `physicalDeviceVerified`는 계속 false다.
- `xcodebuild.log`: 계정/서명 진단이 포함될 수 있는 **0600 비공개 로컬 로그**. 출력 폴더는 0700이며 `dist/` 및 `.tools/` 산출물을 커밋하지 않는다. 콘솔에는 로그 원문·인증서·프로파일·인증 키를 출력하지 않는다.

기존 아카이브를 덮어쓰지 않는다. 재시도는 새 `--output` 경로를 사용한다. 이 도구에 API 개인 키·암호를 전달하는 옵션은 없다.

## 업로드 후 확인

Xcode Organizer 또는 Transporter로 검증된 아카이브/IPA를 업로드하고 App Store Connect 처리 결과를 확인한다. 암호화 수출 규정·베타 설명/테스트 안내·심사 연락처 등은 실제 사용 방식과 계정에 맞춰 입력한다. 외부 테스터 배포는 베타 심사가 필요할 수 있다. 초대/공개 링크 생성과 이메일 전송은 별도 승인 범위에 맞춰 진행한다.

최초 실제 iPhone 테스트는 설치, Linux 초기 준비, CLI 설치, 인증 Safari 왕복, 파일·대화 보존, 화면 잠금/복귀, 장시간 실행의 메모리·발열을 포함한다.

## 검증 및 근거

```sh
python3 -m unittest discover -s ios/app/tests -p test_distribution.py
```

- [Apple: Distributing your app for beta testing and releases](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
- [Apple: Manually manage distribution signing](https://help.apple.com/xcode/mac/current/en.lproj/devcac6ab5b3.html)
- [Apple: Export an iOS app](https://help.apple.com/xcode/mac/current/en.lproj/dev23ea8b877.html)
- 로컬 Xcode의 `xcodebuild -help`: `app-store-connect`, `destination=export`, `manageAppVersionAndBuildNumber`, `signingStyle`, `-allowProvisioningUpdates` 의미를 확인한다.

### 2026-10-25 실제 export 확인

- 입력: `dist/ios-testflight/0.1.0-1-unsigned-final/Bibimer.xcarchive`, iOS `0.1.0(1)`.
- 산출물: `dist/ios-testflight/export-unsigned-probe/export/Bibimer.ipa`, **8,275,988 bytes**.
- SHA-256: `33d0032b1eb815d352363a992b7614de3b244157cd29253ad77b2e76bec6e504`.
- 기존 Xcode 로그인과 계정의 자동 App Store Connect export를 사용했으며 기기 등록은 하지 않았다. 테스트 14개는 기존 unsigned 아카이브에서 archive/개발 프로파일 단계를 생략하고 export만 호출하는 회귀를 포함한다.
- 서명된 IPA까지의 검증이다. App Store Connect 업로드·처리·TestFlight 제공 여부와 실기기 검증은 각각 실제 결과를 확인해야 한다.
