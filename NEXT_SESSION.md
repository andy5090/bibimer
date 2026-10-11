# Bibimer 다음 세션 시작점

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

## 프로덕션 첫 출시 제출 현황 (2026-10-12)

- Console 초기 설정 항목이 사라지고 프로덕션 만들기가 활성화됐다. 같은 AAB 30을 라이브러리에서 선택해 **0.16.0 (30) - Initial release**를 저장했다. 오류 없이 매핑 파일 경고 1개만 확인했다. 지원 국가 177개 + 기타 국가, 영어/한국어 등록정보, IARC·13세 이상·정책·광고·데이터 보안·건강·카테고리를 포함한 변경 **12개**를 Google 검토에 전송했다. 앱 접근·광고 ID·정부·금융·FGS 선언도 검토 참고 항목에 포함된다.
- 최종 관찰 상태는 **검토 중인 변경사항 / 일반적으로 발견되는 문제에 대한 빠른 검사 실행 중 (40%, 최대 9분)**이다. 사전 검사를 통과하면 심사로 넘어간다. 아직 Google 승인·공개 스토어 노출·실기기 Play 설치는 완료로 기록하지 않는다. 관리형 게시가 기존 **사용 중지**이므로 승인 후 자동 게시된다. 사용자에게 해당 동작을 알리고 출시 진행의 기존 승인 범위에서 제출했다.
- 게시 개요 URL: https://play.google.com/console/u/0/developers/5778023895269243113/app/4975090737012022496/publishing . 증빙 `dist/play-release-setup/production-review-checks.jpg`. 심사 수단·FGS·데이터 처리 등 Google이 요구하는 후속 조치를 이 화면과 제출 활동에서 확인한다.
- 지정 계정의 내부 테스트 참여 페이지까지 확인했다. 초대에는 개발자에게 이메일·이용 정보 공유 동의가 포함되어 있어 사용자에게 해당 단계의 동의를 요청했으며 아직 대신 수락하지 않았다. 비밀번호·API 키 요청은 없고 개인 에이전트를 제공하지 않는다. 실제 Google Play 설치와 기존 개발 APK의 다른 서명 때문에 발생할 수 있는 설치 전환은 사용자 기기에서 별도 확인한다. 운영 휴대폰의 앱을 제거하거나 데이터를 지우지 않았다.

## 계정 없는 가상 데모·내부 테스트 출시 (2026-10-12)

- 사용자가 계정 없는 데모와 새 출시 AAB를 승인했고, 실제 로그 내용 사용을 금지했다. Codex·Claude Code·OpenCode의 구조화된 출력 형식만 참고한 가상 세션 예제를 제공한다. 코드·diff·표·계획·도구·승인·질문·터미널을 표시하며 입력과 관계없이 예제를 재생한다. 실제 에이전트·셸·GitHub 요청이나 기기 프로젝트 파일 접근을 수행하지 않는다. 입력/질문 답변은 가상 기록에 보관하지 않는다.
- `DemoWorkspace`는 파일·네트워크·프로세스 API 없는 메모리 구현이다. Native API가 데모 요청을 먼저 분기하며 모드 epoch로 이전 요청·폴링·서비스의 응답을 차단한다. 정상 연결·언어·입력·에이전트·알림 설정과 데모 설정을 분리했다. 정상 초안은 모든 세션의 입력·질문·선택 위치만 프로세스 RAM에 임시 보관하며 한 번 복원한다. 프로세스 종료 시 초안 복원은 보장하지 않는다. 정상 Termux 프로세스를 재시작하거나 종료하지 않는다.
- 명시적 Try demo/데모 체험하기를 첫 화면·Setup·Settings에 추가했다. 데모 badge와 안내를 유지하고 Exit demo로 돌아간다. 실제 Send가 `queue:add`를 쓰는 UI 계약 오류와 null-key 초기 view 초안, 언어 변경 시 데모 badge가 실제 연결 표시로 바뀌는 오류를 검증 중 수정했다. 단순한 가상 상태와 기존 UI를 재사용했으며 새 의존성은 없다.
- 최종 앱 **0.16.0 / versionCode 30**, 내장 브리지 **0.15.0**. `dist/play/bibimer-0.16.0-30-release.aab`, SHA-256 **dd893a74e5cc3ba796d303035bd983e00bf4da3f2671af9654dc0a1b2e3cf7ab**. 기존 저장소 밖 업로드 키로 서명했으며 bundletool·jarsigner·aapt2/javac/D8 검증과 AAB asset 원본 일치를 확인했다. 테스트용 universal APK를 에뮬레이터에 `-r`로 업데이트했다. 실제 휴대폰 APK·운영 브리지는 변경하지 않았다.
- Play 내부 테스트 **활성**, **0.16.0 (30) - Demo internal test**, **내부 테스터에게 제공됨 / 검토되지 않음**을 확인했다. 사용자 지정 Google 계정 한 명이 포함된 Andy 목록을 선택·저장했다. 이메일은 Console 비공개 목록에만 보관하며 공개 문서에 기록하지 않는다. 28·29는 출시 초안에서 제외하고 아티팩트 라이브러리에 유지한다. 난독화를 사용하지 않아 가독화 매핑 파일 경고 1개만 있으며 오류는 없다.
- 두 언어 스토어 설명에 무계정 데모와 실제 Termux 준비를 구분해 추가했다. 각 언어 스크린샷 5장(Work → Setup → Settings → 실제 Terminal → 명시적 Demo)을 리뷰 화면에서 확인·저장했다. 첫 화면·데모는 AAB 30에서 캡처했고 기존 Setup·Settings·실제 Terminal은 이전 캡처를 유지한다. 새 데모 screenshot의 모든 내용은 가상이며 실제 에이전트 로그를 사용하지 않는다.
- 테스트 참여 링크: https://play.google.com/apps/internaltest/4701718894791581363 . 지정 계정의 실제 초대 페이지가 열린다. `Accept invite`에는 이메일·이용 정보 공유 동의가 표시되어 대신 수락하지 않았다. 테스터의 참여 동의·Google Play를 통한 설치 검증은 아직 미완료다. 에뮬레이터 직접 설치를 Play 설치 검증으로 보고하지 않는다.
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
