# Google Play 출시 준비

## 0.26.0 · 컨텍스트·구독 사용량 내부 테스트 준비 (2026-10-21, 미게시)

Android0.26.0(44)·내장 브리지0.19.0의 서명 번들을 준비했다. 컨텍스트 사용량과 지원되는 Codex·Claude 계정 구독 한도/초기화 시각을 구분해 표시하고 설정에서 사용량/남은 양을 고른다. 새 브리지 기능은 앱 업데이트 후 설정의 브리지 업데이트가 필요하다. 사용자 운영 브리지·세션은 변경하지 않았다.

AAB `dist/play/bibimer-0.26.0-44-release.aab`, SHA-256 `87a289ef05244657077e77a23288c3754ff503538b18636fe71f337745b82a37`. 빌드·bundletool·서명/기존 인증서·54assets·브리지/유지보수4payload·심사 비밀 미포함을 검증했다. Python scripts39개, 실제 임시 브리지의 전체 Chromium UI,726키×10언어와 컨텍스트/구독16개 검사는 통과했다. Mac 전체 브리지는191개 중 failures16/errors1이 남았고 Setup import경로 오류1개는 별도 보정 재검사로 통과했다. PTY/`/proc`/Git 경계 등 Mac 검사 제약을 전체 성공으로 표시하지 않는다. 로그/검증과 실제 기기 검증 범위는 NEXT_SESSION.md를 따른다.

Play Console용 Chrome 창은 Google 로그인 화면으로 사용자의 직접 로그인이 필요하다. **44 업로드·내부 테스트 게시·실제 Play 설치는 아직 확인하지 않았다.** EN/KO노트 `release/google-play/release-notes/0.26.0.txt`를 준비했으며 기존 내부43/정식 심사 설정은 유지한다.

## 0.25.0 · 정식 배포 심사 제출 (2026-10-19)

검증된 내부 **0.25.0(43)**을 동일 번들로 프로덕션 승급해 **22:59 Asia/Seoul**에 변경1개 전송을 확정했다. 기존 대상 국가 **100% 전체 출시**, 새43 포함·40제외. Console은 **검토 중인 변경사항 / 빠른 사전 검사 실행 중**이며 검사 성공 후 검토로 전송된다. 관리형 게시가 꺼져 있어 **승인 후 자동 게시**한다. 오류0·기존 매핑파일 경고1·지원기기 변화0.

새 빌드·재업로드·코드 변경은 없다. SHA-256 `1385627d648344205be5d17c2711e2f86c7802cbabcd1e825c4aff1291a46cab` 재확인. 정식 EN/KO노트 `release/google-play/release-notes/0.25.0-production.txt`에 공개0.23.0 이후 누적 변경과 브리지0.18.0 업데이트 안내를 담았다. 증빙 `dist/production-0.25.0/{submitted.png,submitted-dom.txt}`, 프로덕션 `/tracks/4697502344481526582/releases/7/details`.

**사전검사 완료·Google 승인·43 공개·실제폰 업데이트는 아직 미확인**이다. 현재 마지막 확인된 공개 버전은 **0.23.0(40)**으로 유지하며 승인 뒤 갱신한다. 세부 기록·기존 검증은 NEXT_SESSION.md와 아래 내부43 항목을 따른다.

## 0.25.0 · 세션 종료 후 유지보수 내부 테스트 (2026-10-19)

**0.25.0(43)**을 내부 테스트에 게시했다. Console **활성 / 내부 테스터에게 제공됨 / 19:29 Asia/Seoul**, 새43만 포함·42제외, EN/KO노트·기존 테스터 유지. 오류0·기존 가독화파일 경고1·지원기기 변화0. 설정에서 종료 대상을 확인하고 실제 종료된 뒤 브리지 업데이트/재시작을 이어가는 기능을 포함한다. 취소 시 세션 유지, 대상 변경 재확인, 실패/시간 초과/인스턴스 변경 시 유지보수 차단을 제공한다. 내장 브리지 **0.18.0**, 정식 **0.23.0(40)** 유지.

AAB `dist/play/bibimer-0.25.0-43-release.aab`, SHA-256 `1385627d648344205be5d17c2711e2f86c7802cbabcd1e825c4aff1291a46cab`. 전체 빌드/서명·54assets·필수 스크립트의 네이티브 허용 목록·브리지4payload·심사 digest/비밀 미포함 검증을 통과했다. Python scripts38개·집중 유지보수5개·689키×10언어, 격리 Chromium 유지보수 확인 UI·실제 임시 브리지 종료/업데이트/재연결·네이티브 asset 정책 전체 UI 회귀가 통과했다. 심사 접근 파일 설정을 보완한 최종 재빌드만 업로드했으며 상세는 NEXT_SESSION.md를 따른다.

증빙 `dist/play-0.25.0/`, 검증 `.tools/aab-0.25.0-43-*`, `.tools/release-0.25.0-*.log`. **실제폰/에뮬레이터 설치·Play 업데이트 수신·Termux RUN_COMMAND 실기기 검증은 후속**이다. 사용자 운영 브리지/세션·웹사이트 배포는 변경하지 않았다.

## 0.24.1 · 첫 화면 초기화 수정 (2026-10-19)

**0.24.1(42)**을 내부 테스트에 게시했다. Console **활성 / 내부 테스터에게 제공됨 / 17:31 Asia/Seoul**, 새42만 포함·문제 있는41제외, 오류0·기존 가독화파일 경고1·지원기기 변화0. 내장 브리지는 **0.18.0 유지**다. 정식0.23.0(40)은 유지한다.

0.24.0의 첫 화면 먹통은 네이티브 WebView 허용 목록에서 `worktree-create.js`가 누락돼 초기화가 중단된 문제였다. 파일 하나를 허용 목록에 추가했다. 이전의 파일 포함/브라우저 검사가 실제 네이티브 정책을 놓친 점을 보완해 HTML 필수 리소스 계약 검사와 네이티브 허용 정책을 적용한 전체 UI 검사를 추가·통과했다. Python38개·682키×10언어·AAB 빌드/서명/53assets/브리지4payload 검증도 통과했다. 실제41/42 DEX의 허용 문자열 차이도 확인했다.

AAB `dist/play/bibimer-0.24.1-42-release.aab`, SHA-256 `2e32fbed4d52e9ae17cdebca1f8e050debeb63e77f62ea1baea6d1a2b179b830`. 증빙 `dist/play-0.24.1/`, 검증 `.tools/aab-0.24.1-42-*`, `.tools/release-0.24.1-*.log`. **실제폰/에뮬레이터 설치·WebView 실동작·Play 업데이트 수신은 미검증**이며 사용자 세션/운영 브리지는 변경하지 않았다. 상세 원인·검증 범위는 NEXT_SESSION.md에 기록했다. 아래41은 결함 수정 전의 배포 기록이다.

## 0.24.0 · 워크트리·Claude Steer 내부 테스트 (2026-10-19)

**0.24.0(41)**을 기존 내부 테스터에게 게시했다. Console **활성 / 내부 테스터에게 제공됨 / 17:05 Asia/Seoul**, 새41만 포함·40제외, EN/KO노트. 오류0·기존 가독화파일 경고1·지원기기 변화0. 워크트리 생성·브랜치/세션 시작, Claude Steer, 대기열 묶음 전송, Ctrl+Enter 전송과682키×10언어를 포함한다. 내장브리지 **0.18.0**이며 새 브리지 기능은 앱 업데이트 후 설정에서 업데이트해야 적용된다.

AAB `dist/play/bibimer-0.24.0-41-release.aab`, SHA-256 `ce923fe5c5d1bcd560dba0abeb138178c2b9d506bd934f3f78af5ab179492839`. 전체Java/D8·bundletool/서명·53assets·4payload·네이티브워크트리경로·비밀미포함, Python scripts37개·집중브리지60개·Node682키×10언어/기존회귀·격리Chromium 워크트리/명령/전체UI가 통과했다. 초기UI검사의 비동기 완료 대기를 보완한 내용과 원본/최종로그는 NEXT_SESSION.md에 기록했다. 실제폰·Play설치·WebView·실제모델 검증은 후속이다.

기존 **정식0.23.0(40)은 06:54 게시·Google Play에 제공됨·전체출시·178개 국가·지역**을 확인해 공개버전 기록을 갱신했다. 이번41의 프로덕션 승급·웹배포·운영브리지/세션 변경은 없다. 증빙 `dist/play-0.24.0/`, 로그/검증 `.tools/aab-0.24.0-41-*`, `.tools/release-0.24.0-*.log`. 기존 [내부 테스트 링크](https://play.google.com/apps/internaltest/4701718894791581363)에서 업데이트한다.

## 0.23.0 · 정식 출시 심사 제출 (2026-10-19)

사용자 정식 배포 요청으로 검증된 내부 테스트 **0.23.0(40)** 번들을 그대로 프로덕션에 승급했다. 새 빌드/업로드 없이40만 포함·기존37제외, **100%·기존178개 국가·지역**이다. 관리형 게시가 꺼져 있어 승인 후 자동 공개된다.

**06:41 Asia/Seoul**, Console **검토 중인 변경사항 / 자동 사전 검사 실행 중**, 프로덕션 전체 출시 시작1건 제출을 확인했다. 오류0·기존 가독화파일경고1·지원기기변화0. 공개37 이후 누적 변경을 담은 EN/KO노트는 `release/google-play/release-notes/0.23.0-production.txt`다. 기존 심사접근·스토어·가격·국가·테스터 설정은 유지했다.

증빙 `dist/production-0.23.0/{submitted.png,submitted-dom.txt}`. 승인·정식40공개·실제기기업데이트는 아직미확인이다. 마지막으로 확인한 공개버전은 **0.20.0(37)**이며 최신 상태와 후속작업은 NEXT_SESSION.md를 따른다. 내장브리지0.17.0, 운영브리지/세션·웹사이트 변경 없음.

## 0.23.0 · 프로젝트·GitHub 개선 내부 테스트 (2026-10-19)

**0.23.0(40)**을 기존 내부 테스터에게 게시했다. Console **활성 / 내부 테스터에게 제공됨 / 04:11 Asia/Seoul**, 새40만 포함·39제외, EN/KO출시노트. 오류0·기존가독화파일경고1·지원기기변화0. 세션 가져오기 충돌, 연결 완료 화면, GitHub 진행률/결과·중복 잠금, 프로젝트 드래그 정렬, 명령 실패 문구를 포함하며655키×10언어다. 내장브리지 **0.17.0**으로 올렸으며 새 브리지 기능은 앱 업데이트 후 설정에서 브리지를 업데이트해야 적용된다. 운영 브리지·세션은 자동 변경하지 않았다.

AAB `dist/play/bibimer-0.23.0-40-release.aab`, SHA-256 `047d8e2fc7b99410e8bb3bb28efd6aed5496482ae2cbbafa60eb5e6d11ddb018`. 전체Java/D8·bundletool/서명·52assets·4payload/비공개Receiver·비밀미포함 검증, Python scripts37개·집중브리지37개·Node회귀·격리Chromium Setup/GitHub/Library/Sidebar drag 검사가 통과했다. Mac 셸·브라우저 실행환경 보정과 자동검사의 비동기 대기 보완은 NEXT_SESSION.md에 기록했다. APK파생/실기기 설치·WebView·실제Play감지는 후속이다.

증빙 `dist/play-0.23.0/`, 로그/검증 `.tools/aab-0.23.0-40-*`, `.tools/release-0.23.0-*.log`. 기존 [내부 테스트 링크](https://play.google.com/apps/internaltest/4701718894791581363)에서 업데이트한다. 프로덕션·웹사이트 변경 없음.

## 0.22.0 · 브리지 유지보수 내부 테스트 (2026-10-19)

**0.22.0(39)**을 기존 내부 테스터에게 게시했다. Console **활성 / 내부 테스터에게 제공됨 / 02:50 Asia/Seoul**, 새39만 포함·38제외, EN/KO출시노트. 오류0·기존가독화파일경고1·지원기기변화0. 설정의 브리지 업데이트/재시작과 실행세션차단·종료된목록/원본ID/보관/토큰보존,642키×10언어를 포함한다. 내장브리지0.16.0 유지,운영브리지/세션·프로덕션·웹사이트는변경하지 않았다.

AAB `dist/play/bibimer-0.22.0-39-release.aab`, SHA-256 `d3e054fdd97a76fce2a3808efe6e9405daad200ac7ec0cef51e94bee43ffcec7`. 전체Java/D8·bundletool/서명·52assets·유지보수4payload/비공개Receiver·비밀미포함검증 통과. Python scripts37개·신규유지보수5개·Setup4개·Node번역/기존UI로직회귀통과. 전체유지보수검사의상속된기존2메서드는Mac에서PTY종료/`/proc`·pidfd·legacy서버시작실패가있어전체8개통과로표시하지않는다. 상세실패와원본로그는NEXT_SESSION.md를따른다. APK파생/설치·실기기RUN_COMMAND콜백은후속이다.

증빙 `dist/play-0.22.0/`, 로그/검증 `.tools/aab-0.22.0-39-*`, `.tools/release-0.22.0-*.log`. 기존 [내부 테스트 링크](https://play.google.com/apps/internaltest/4701718894791581363)에서 업데이트한다.

## 0.21.0 · 에이전트 준비·응답 제어 내부 테스트 (2026-10-19)

**0.21.0(38)**을 기존 내부 테스터에게 게시했다. Console **활성 / 내부 테스터에게 제공됨 / 02:17 Asia/Seoul**, 새 38만 포함하고 37은 제외했다. EN/KO 출시 노트, 오류 0·기존 가독화 파일 경고 1, 지원 기기 변화 0. 에이전트별 Termux 작업·안내, 명령 성공/실패 표시, 응답 제어와 전송 도움말,634키×10언어를 포함하며 내장 브리지는0.16.0이다.

기존 업로드 키로 서명한 AAB `dist/play/bibimer-0.21.0-38-release.aab`의 SHA-256은 `a2fe1164c3b851f5644310f9f48fc42399d0e3265ec6d6ea0511ff92b64a37ea`다. 전체 Java/D8·bundletool/서명·51assets/브리지 원본·심사 비밀 미포함 검증과 Python36개·브리지 Setup4개·Node 번역/기존 UI 로직 회귀를 통과했다. 증빙 `dist/play-0.21.0/`, 빌드/검증 `.tools/aab-0.21.0-38-*`. APK 파생·설치/실기기 인증은 이번에 검증하지 않았다. 자세한 범위·Mac 임시 경로 보정은 NEXT_SESSION.md를 따른다.

기존 정식 **0.20.0(37)은 Google Play에 제공됨 / 전체 출시 / 178개 국가·지역** 상태를 확인했다. 이번38의 프로덕션 승급·웹배포·운영 브리지/세션 재시작은 없다. 기존 [내부 테스트 참여 링크](https://play.google.com/apps/internaltest/4701718894791581363)에서 업데이트하며 기기별 반영 시간은 달라질 수 있다.

## 0.20.0 · 정식 출시 심사 제출 (2026-10-16)

사용자가 내부 테스트 확인 후 정식 배포를 요청해, 검증된 **0.20.0(37)** 내부 테스트 번들을 그대로 프로덕션에 승급했다. 새 빌드·재업로드 없이37만 포함하고 기존33은 제외했다. 기존 전체178개 국가·지역,100% 출시이며 관리형 게시가 꺼져 있어 승인 후 자동 공개된다.

Console에서 **검토 중인 변경사항 / 일반 문제 사전 검사 진행 중**을 확인했다(12:02 Asia/Seoul). 제출3건은 프로덕션37과 영어·한국어 상세 설명이다. 설명의 기존 영어 우선/2개 언어 안내를10개 언어·시스템 언어 기본값/영어 폴백으로 수정했다. 정식 출시 노트는33→37 누적 변경을 담은 `release/google-play/release-notes/0.20.0-production.txt`다. 오류0·기존 가독화 파일 경고1, 지원 기기 변화0. 심사 접근 설정·스크린샷·가격·국가는 유지했다.

증빙 `dist/production-0.20.0/submitted.png`, `submitted-dom.txt`. **심사 승인·정식37 게시·실제 기기 업데이트 표시는 아직 확인하지 않았다.** 마지막으로 확인한 공개 버전은0.17.1(33)이다. 승인 후 Console/Play에서37 공개 여부를 확인하고 README·listing.json의 공개 버전과 언어 상태를 갱신한다. 실제 새 버전 감지는37을 Play로 설치한 뒤 이후 더 높은 버전이 게시될 때 검증한다.

## 0.20.0 · 업데이트 감지 내부 테스트 (2026-10-15)

업데이트 감지·선택 시 Google Play 페이지 이동·수동 확인·Termux 브리지 버전 안내를 포함한 **0.20.0(37)**을 게시했다. 출시명 `0.20.0 (37) - Update availability`, Console **활성 / 내부 테스터에게 제공됨 / 10월15일 오후8:03 게시**. 기존 테스터와 영어·한국어 출시 노트를 유지하고37번들만 포함했다. 오류0·기존 가독화 파일 경고1, 지원 기기 변화0. 브리지0.16.0 유지, 프로덕션/웹사이트/운영Termux 변경 없음.

AAB `dist/play/bibimer-0.20.0-37-release.aab`, SHA-256 `926e8adb9eccc45744821c1cc1147d5c03002bf699c94dc1337c2881a38da776`. 기존 키·심사 코드로 서명하고 bundletool/jarsigner/AAPT2·Java/D8·49assets 원본 일치·업데이트/SDK/tasks DEX 포함·SDK고정 의존성/라이선스·브리지 원본·비밀 원문 미포함을 검증했다. Python25개(업데이트122단언 포함), Node608키×10언어·업데이트/기존UI 회귀 통과.

검증 전용 universal APK로 기존 에뮬레이터에 업데이트 설치했다.0.20.0/브리지0.16.0/기존한국어 유지, 사이드로드 자동확인 불가 안내·수동 확인, 명시적 버튼으로 실제 Google Play 앱 열기, force-stop 후 재실행을 확인했다. 에뮬레이터는 Play미로그인 상태여서 계정별 제공 버전 응답과 상세 스토어 목록은 미검증이다.37을 Play로 설치한 후 더 높은 다음 버전이 게시돼야 실제 새 버전 감지를 검증할 수 있다. [업데이트 동작과 검증](app-updates.md). 증빙 `dist/play-0.20.0/`, 로그 `.tools/aab-0.20.0-37-mac.log`, 검증 `.tools/aab-0.20.0-37-verification.json`.


## 0.19.1 · 버튼 아이콘 내부 테스트 (2026-10-15)

프로젝트 추가·다시 연결·GitHub 가져오기 버튼 아이콘을 포함한 **0.19.1(36)**을 내부 테스트에 게시했다. 출시명 `0.19.1 (36) - Action icons`, Console **활성 / 내부 테스터에게 제공됨 / 10월15일 오후7:30 게시**. 기존 테스터와 영어·한국어 출시 노트를 유지하고 새36번들만 포함했다. 오류0·기존 가독화 파일 경고1, 지원 기기 변화0. 프로덕션·웹사이트·운영 브리지는 변경하지 않았다.

AAB `dist/play/bibimer-0.19.1-36-release.aab`, SHA-256 `f70bd23ebf113457012f66caa99b1f2ca0caefdcfc53207ae57d0fd2c19ae60b`. 기존 업로드 키·심사 코드를 사용했다. bundletool/jarsigner/AAPT2·전체Java/D8, 기존 업로드 인증서 일치,38assets 원본 일치·3개 버튼 아이콘·브리지0.16.0 원본 일치·비밀 원문 미포함을 검증했다. Python scripts18개와 Node591키×10언어·언어/초안·Demo/Review·프로젝트 탐색 회귀 통과. 아이콘의10개 언어320px 검증은 기능 구현 기록을 따른다. 이번에는 파생APK 생성·에뮬레이터 설치·실기기 검증을 하지 않았다. 증빙 `dist/play-0.19.1/internal36-live.png`, 로그 `.tools/aab-0.19.1-36-mac.log`, 검증 `.tools/aab-0.19.1-36-verification.json`.


## 0.19.0 · 프로젝트 탐색 내부 테스트 (2026-10-15)

**0.19.0(35)**를 기존 내부 테스터에게 게시했다. 브랜치·워크트리 표시와 전체 경로 복사, 마지막 프로젝트·클론 폴더 기억, 상위 폴더 첫 행, 등록 완료 후 프로젝트 열기, 프로젝트 순서 저장을 포함한다. 내장 브리지는 **0.16.0**이며 프로젝트 순서 변경에는 Termux 측 브리지 업데이트도 필요하다. 운영 브리지나 사용자 세션을 자동 재시작하지 않았다.

- AAB `dist/play/bibimer-0.19.0-35-release.aab`, SHA-256 `6807df2d3497709229329cfa43607ee623d4ed626242532d1726ec51d651f94b`. 기존 로컬 업로드 키·비공개 심사 코드를 사용했으며 새 키·Doppler 다운로드는 없다. bundletool/jarsigner/AAPT2·전체 Java/D8·38개 내장 assets 일치·브리지 원본 일치·심사 digest와 비밀 원문 미포함을 확인했다.
- Console **활성 / 내부 테스터에게 제공됨 / 10월15일 오후6:15 게시**. 출시명 `0.19.0 (35) - Project navigation`, 영어·한국어 출시 노트, 오류 없음·기존 가독화 파일 경고1개, 지원 기기 변화 없음. 34를 새 출시에 포함하지 않았다. 증빙 `dist/play-0.19.0/internal35-live.png`.
- Python scripts18개, 브리지 library9·project management8·setup4, Node591키×10언어·작업 위치/복사·폴더 기억·자동 열기·프로젝트 순서·Demo/Review/초안 회귀 통과. AAB에서 파생한 검증 전용 universal APK로 기존 에뮬레이터를 업데이트해 실행·0.19.0 표시·기존 한국어 설정 유지를 확인했다. 실제 기기·실제 에이전트·알림·Play 설치 검증은 별도다.
- 프로덕션 승급·웹사이트 배포는 하지 않았다. 기존 내부 테스트 참여 링크는 https://play.google.com/apps/internaltest/4701718894791581363 이다. 실제 기기 업데이트 표시는 Console 안내대로 보통1시간 이내이나 더 걸릴 수 있다.



## 0.18.0 · 10개 언어 내부 테스트 (2026-10-15)

기존 6개 언어 소스에 일본어·중국어 번체(대만·홍콩)·프랑스어·독일어를 추가하고, 시스템 언어 기본값을 포함해 **0.18.0(34)**를 내부 테스트에 게시했다. 공개 버전은 **0.17.1(33)**이다. 빌드·서명·검증·에뮬레이터·Console 증빙 및 남은 실기기/프로덕션 작업은 [NEXT_SESSION.md](../NEXT_SESSION.md)의 최신 항목을 따른다. 새 키나 반복적인 Doppler 다운로드는 필요하지 않다.

## 0.17.1 정식 출시 완료 (2026-10-14)

사용자가 내부 테스트 버전을 설치해 정상 동작했다고 보고했다. 웹사이트를 먼저 업데이트한 뒤 기존 검증한 **0.17.1 / versionCode 33** 내부 번들을 프로덕션으로 승급했다. 새 빌드·재업로드·키 변경은 없다.

- 영어·한국어 출시 노트와 번들 33만 포함, 출시율 **100%·기존 전체 대상 국가**를 유지했다. 지원 기기 변화와 오류는 없고 기존 매핑 파일 경고 1개다.
- 게시 개요에서 **프로덕션 0.17.1 (33) - File explorer navigation / 전체 출시 시작 1건**을 Google에 전송했다. 별도의 기존 공개 테스트 임시 버전은 변경하거나 제출하지 않았다.
- 새로 로드한 Console에서 **검토 중인 변경사항 / 자동 사전 검사 진행 중**을 확인했다. 검사 완료 즉시 본 검토로 전송된다. 일시적 오류 알림은 다시 로드해 사라졌으며 중복 제출하지 않았다. 이후 23:09 KST에 다시 확인한 프로덕션 상세는 **0.17.1(33) Google Play에 제공됨 / 10월 14일 오후 4:17 게시 / 100% / 178/178 국가·지역**이다. 승인 후 기존 설정대로 자동 게시됐으며 현재 공개 버전은 **0.17.1(33)**이다. 증빙 `dist/play-0.17.1/production33-submitted.jpg`, `production33-live.jpg`.
- 사용자 설치·동작 보고를 에이전트 실기기 검증으로 표현하지 않는다. 웹사이트 EN/KO 설치 버튼과 공개 32의 파일/Git 뷰어 소개는 https://301d54d0.bibimer.pages.dev 로 배포하고 실제 도메인에서 확인했다. 내부 33의 탐색 개선을 공개 버전 기능으로 미리 광고하지 않았다.

## 0.17.1 내부 테스트 배포 (2026-10-14)

사용자의 **테스트 배포 먼저** 요청으로 상위 폴더 첫 행·파일 뷰어 아래 탐색기 유지를 내부 트랙에만 배포했다. 새로 로드한 Console에서 32가 최신 사용 코드임을 확인하고 앱을 **0.17.1 / versionCode 33**으로 올렸다. 기존 업로드 키·비공개 심사 코드와 정상 설정·테스터 구성을 유지했다.

- AAB: `dist/play/bibimer-0.17.1-33-release.aab`, SHA-256 **b52c3d5fbb632b81308a6696ba9a7c97cb8fc2c9dd19fe856541599802ec2b09**. bundletool/jarsigner·기존 인증서·Manifest·30개 assets·동일 심사 digest·코드/암호 미포함 확인 완료. Python 14개·ReviewAccess 17개 단언·Demo 95개 단언/11개 시나리오·Node 접근/초안/입력 계약 검사 통과. 앞선 UI 검증과 Mac의 별도 Git 정리 검사 실패 기록을 유지한다.
- Console은 33(0.17.1), API 26+, target 36으로 수락했고 영어·한국어 출시 노트를 저장했다. 오류는 없고 비난독화 빌드의 매핑 파일 경고 1개다. 기존 버전 32를 새 내부 출시에 포함하지 않으며 지원 기기 수 변화는 없다.
- **활성 / 0.17.1 (33) - File explorer navigation / 내부 테스터에게 제공됨**, 게시 **10월 14일 12:37** 확인. 증빙 `dist/play-0.17.1/internal33-live.jpg`. 기존 내부 테스트 참여 링크는 https://play.google.com/apps/internaltest/4701718894791581363 이다. 계정 전용 링크나 테스터 이메일은 저장소에 넣지 않는다.
- 최신 버전 목록에서 **프로덕션 0.17.0(32) Google Play에 제공됨**과 **내부 테스트 0.17.1(33)**을 함께 확인했다. 증빙 `dist/play-0.17.1/production32-internal33.jpg`. 프로덕션 승급·심사 제출은 하지 않았다. 실제 휴대폰의 스토어 업데이트 표시·설치는 별도 확인 대상이며 Console은 표시까지 보통 1시간 이내, 더 걸릴 수도 있다고 안내했다.

## 0.17.0 업데이트 업로드·제출 (2026-10-12)

원격 `main`의 **`2f70985`**까지 Mac을 동기화했다. 전체 화면 파일 뷰어·Markdown/정적 HTML/Mermaid·원본 전환·코드 구문 강조와 Android 문서 앱 열기를 포함한 **0.17.0 / versionCode 32**를 기존 업로드 키와 심사 코드로 재빌드해 Play에 업로드했다. 새 키나 빌드의 Doppler 자동 연동은 추가하지 않았다.

- Mac AAB: `dist/play/bibimer-0.17.0-32-release.aab`, SHA-256 `177f2ecd43fa39a80994fe58ccc2c56bb41207279aeef2494ccb2618e729fad1`. 아래 Termux 빌드 해시와 구분한다. 내장 브리지 0.15.0, 패키지 `app.bibimer`, 최소 API 26·target 36이다.
- 기존 0.16.1(31)은 **Google Play에 제공됨 / 전체 출시**, 2026-10-12 오후 3:59 게시를 확인했다. [공개 스토어](https://play.google.com/store/apps/details?id=app.bibimer)에서 앱 이름·개발자·설치 버튼·정상 모드 이미지 3장을 확인했다. 기존 공개 버전을 철회하지 않았다.
- 내부 테스트는 **활성 / 0.17.0 (32) - Full-screen file viewer / 내부 테스터에게 제공됨**, 오후 4:58 게시를 확인했다. 기존 테스터 목록과 참여 동의를 유지했다. 실제 Play 설치는 미확인이다.
- 프로덕션은 **0.17.0 (32) - Full-screen file viewer**를 출시율 100%·모든 기존 대상 국가로 저장하고 변경 **1개**를 Google에 전송했다. 이후 새로 로드한 Console에서 **0.17.0(32) Google Play에 제공됨 / 전체 출시**, 오후 **5:22** 게시를 확인했다. 내부 테스트는 같은 32를 제공한다. 실제 기기의 업데이트 표시·설치는 별도 확인 대상이다.
- 영어 320자·한국어 170자의 [출시 메모](../release/google-play/release-notes/0.17.0.txt)를 두 트랙에 적용했다. 매핑 파일 경고 1개 외 오류는 없으며 이 빌드는 난독화를 사용하지 않는다.
- 14개 Python 테스트, ReviewAccess Java 17개 단언, Demo 95개 단언/11개 시나리오, Node 접근 UI/입력 계약/초안과 변경 JS 구문 검사를 통과했다. bundletool·서명·Manifest/DEX·30개 assets·새 뷰어/Mermaid·업로드 인증서 일치·동일 심사 digest·원문 코드/암호 미포함을 확인했다. 새 APK 생성·설치·사용자 기기 변경은 하지 않았다. 실제 Android 파일 뷰어/외부 앱·Play 설치 검증은 별개다.
- [심사 안내](../release/google-play/review-instructions.txt)는 기존 비공개 코드를 그대로 사용한다. EN/KO 웹 안내 첫 단계의 오래된 앱 버전 번호를 제거하고 공개 본문을 확인했다. Pages 배포 `https://cfd319f4.bibimer.pages.dev`. 공개 README에 데모 홍보를 복원하지 않았다.

Bibimer의 제품 유형은 **모바일 ADE(Agent Development Environment, 에이전트 개발 환경)**다. 프로젝트·워크트리·코딩 에이전트 세션·대화·터미널을 관리하고, 실제 코딩 작업은 사용자가 연결한 에이전트가 수행한다. 슬로건은 **내 손안의 에이전트 개발 환경**이다. 영어·한국어 스토어 설명과 소개 그래픽, 웹사이트에 반영했으며 앱의 새 소개 문구는 2026-10-12 출시용 AAB에 포함했다. 기존 휴대폰 설치 APK는 교체하지 않았다.

사용자가 **조직 개발자 계정**을 사용한다고 확인했다. 신규 개인 계정의 12명·14일 비공개 테스트 요건은 이 출시 일정에 적용하지 않는다. 조직 계정의 인증 완료 여부와 Console에 표시되는 출시 제한은 별도로 확인한다.

## 이전: 0.16.1 초기 제출 기록 (현재 공개 출시됨)

공개 데모가 있던 **0.16.0(30)의 프로덕션 심사를 철회**하고, **0.16.1 (31) - Restricted review access**와 수정한 등록정보·선언 변경 **12개**를 다시 제출했다. 자동 사전 검사 진행률·카운트다운이 사라지고 Console은 **검토 중인 변경사항 / 변경사항을 검토 중입니다**로 전환됐다. Google 승인·공개 노출은 미확인이다. 기존 관리형 게시가 사용 중지되어 승인 후 자동 게시된다. [게시 개요](https://play.google.com/console/u/0/developers/5778023895269243113/app/4975090737012022496/publishing)에서 상태를 확인한다.

- 내부 테스트: **활성 / 0.16.1 (31) - Restricted review access / 내부 테스터에게 제공됨 / 검토되지 않음**. [참여 링크](https://play.google.com/apps/internaltest/4701718894791581363). 기존 사용자 승인으로 지정·참여한 테스터 한 명을 유지한다. 비공개 이메일은 저장소에 넣지 않으며 실제 Google Play 설치는 미확인이다.
- AAB: `bibimer-0.16.1-31-release.aab`, SHA-256 `4e5cacead042bd2208995b36500846a702811f3541be2a608bc9dfa890041e59`. 기존 업로드 키로 서명하고 bundletool·jarsigner·aapt2/javac/D8와 내장 asset 일치를 확인했다. 이번에는 파생 APK 생성·설치나 운영 휴대폰 교체를 하지 않았다. 난독화를 사용하지 않아 매핑 파일 경고 1개만 표시됐다.
- 심사 접근: Settings의 **Review access / 심사자용 접근**에서 Console 비공개 Password의 코드를 입력한다. [영어 안내](../release/google-play/review-instructions.txt)에 원문 코드는 없다. 첫 화면·Setup·일반 Settings의 체험 버튼과 README·스토어의 데모 홍보를 제거했다. 미설정 빌드·과거 인증 없는 데모 설정·직접 활성화 호출은 접근을 허용하지 않는다. 심사자에게 개인 외부 계정·키나 실제 로그를 제공하지 않는다.
- 제한된 예제는 입력과 무관한 가상 세션·UI를 재생한다. 실제 AI·셸·GitHub 실행을 검증하지 않으며 Google의 심사 수단 수락은 미확인이다. 정상 개발 기능은 동일하게 제공되고 앱이 심사 환경을 감지해 동작을 바꾸지 않는다.
- 스토어: 언어별 **실제 Terminal → Setup → Settings** 3장과 데모 홍보가 없는 설명을 저장·제출했다. 현재 이미지는 정상 모드 **0.15.0/code 28** 캡처다. Demo와 공개 데모 버튼이 있던 첫 화면은 제외했다. [화면별 출처](../release/google-play/screenshots/README.md)를 따른다.
- 대상 연령 **13~15·16~17·18+**, IARC·데이터 보안·정책·가격·국가 선언을 보존하고 새 출시와 함께 제출했다. FGS specialUse 자료의 기존 58.1초 알림 영상은 0.16.0의 실제 Android 조작이며 새 코드 입력 과정을 포함하지 않는다. 안내 사이트는 EN/KO가 분리되어 있고 코드 원문이 없으며 검색 색인을 막았다.
- 검증: Python **14개**, 접근 검증 Java **17개 단언**, 기존 가상 작업 공간 **95개 단언/11개 시나리오**, Node 접근 UI·초안·입력 계약 통과. 393×852 EN/KO 소스 UI와 코드 입력·취소·실패 상태를 브라우저에서 확인했다. Android 네이티브 대역 검사를 설치된 31 앱의 동작 확인으로 표현하지 않는다. 실제 기기·Play 설치·실제 제공자 실행은 미확인이다.

아래 날짜별 기록은 이전 준비 이력이다. 최신 업데이트 상태는 문서 첫 항목과 `listing.json`을 따른다.

## 현재 준비 항목과 후속 확인

| 항목 | 상태 |
| --- | --- |
| 계정·패키지 | 사용자 확인 조직 계정, `app.bibimer`. 프로덕션 제출이 가능하며 조직·법적 프로필은 임의 변경하지 않았다. |
| 빌드·서명 | 최신 AAB 33 검증·내부 테스트·프로덕션 전체 출시 완료. 현재 공개 버전은 33이다. Play 배포 인증서와 업로드 인증서를 확인했다. 같은 키·비밀번호·별칭·심사 코드를 Doppler bibimer/prd에 공유 보관했다. |
| 정책·연락처 | 별도 영어/한국어 공개 정책에 데모와 삭제 안내를 반영했다. 운영 주체 앤디니어링(Andineering), 공개 문의 andy@andineering.com. |
| 등록정보·이미지 | 영어·한국어 설명, 아이콘·소개 그래픽, 언어별 정상 모드 스크린샷 **3장**을 저장·제출했다. [화면별 출처](../release/google-play/screenshots/README.md). |
| 가격·국가 | 무료, 지원 국가 177개와 기타 국가 포함. Console의 178개 행과 실제 명명된 국가 수를 구분한다. |
| 등급·대상 | IARC 설문 완료·제출, 사용자 선택 13세 이상 대상(13~15·16~17·18+) 반영. 콘텐츠 등급과 대상 연령은 별개다. |
| 데이터 보안 | 전체 설문 최종 저장·제출. 메시지·파일/문서·기타 사용자 생성 콘텐츠의 선택적 수집/공유·앱 기능 목적과 삭제 URL을 공개한다. 모든 외부 도구의 전송 암호화를 보장하지 않는다. |
| 심사 접근 | [영어 안내](../release/google-play/review-instructions.txt)와 비공개 코드가 필요한 심사용 예제를 제출했다. 개인 외부 계정·키는 제공하지 않는다. 실제 제공자 실행은 데모로 검증했다고 주장하지 않는다. |
| 완료 알림 | FGS specialUse 설명과 실제 Android 조작 영상 제출. 가상 완료 이벤트로 서비스·알림 이동·끄기를 확인했으며 실제 기기·절전·실제 제공자의 동작은 별도 검증 대상이다. |
| 내부 테스터 | 지정 계정 1명 등록·트랙 활성·사용자 동의 후 참여 완료. 2026-10-14 사용자가 내부 테스트 설치·정상 동작을 보고했다(에이전트 실기기 검증과 구분). 기존 개발 APK의 서명과 Play 서명은 구분해야 하며 운영 앱 데이터를 임의 제거하지 않는다. |
| 프로덕션 | 업데이트 33 공개 승인·전체 출시 완료(10월 14일 16:17, 100%, 178/178 국가·지역). 내부 테스트도 같은 33이다. |
| App Links | HTTPS intent filter·라우팅·assetlinks.json은 미구현이다. Play 배포 인증서 지문은 확보했다. |

신규 앱은 Android App Bundle과 Play App Signing을 사용한다. 패키지 이름은 등록 후 변경할 수 없으며, 업데이트마다 versionCode를 올린다. target API 36은 현재 신규 제출 요구사항에 맞는다. [앱 등록](https://support.google.com/googleplay/android-developer/answer/9859152), [API 요구사항](https://support.google.com/googleplay/android-developer/answer/11926878), [앱 서명](https://support.google.com/googleplay/android-developer/answer/9842756).

## 조직 계정 확인

기존 조직 계정에서 조직·신원 인증이 완료됐는지 확인한다. 조직의 법적 이름·주소와 연결된 결제 프로필, D-U-N-S 정보가 필요한 인증 항목이며 일부 정부 기관 등의 예외는 Google 안내를 따른다. 조직 웹사이트와 연락처, 공개 개발자 이메일·전화번호도 계정에서 확인한다. Google에만 제공하는 연락처와 Play에 공개되는 연락처는 구분한다. [조직 계정 정보와 인증](https://support.google.com/googleplay/android-developer/answer/13628312).

스토어·개인정보처리방침의 운영 주체는 사용자 확인 **앤디니어링(Andineering)**, 공개 지원 이메일은 **andy@andineering.com**이다. 제품 사이트는 https://bibimer.app/ 이며 조직 계정의 법적 정보·인증 항목을 임의 변경한 것은 아니다. [사이트 소스·배포 안내](../release/website/README.md)를 따른다.

## 휴대폰에서 AAB 준비

APK와 같은 Termux의 AAPT2·Java·D8, 같은 고정 버전 SDK·웹 의존성·내장 브리지를 사용한다. bundletool 1.18.3은 [Google 공식 릴리스](https://github.com/google/bundletool/releases/tag/1.18.3)의 SHA-256으로 확인한다. 언어 분할을 꺼서 기기 언어와 관계없이 영어·한국어를 앱에서 선택할 수 있게 한다. AAB는 `jarsigner`로 서명한다. [명령줄 번들 빌드](https://developer.android.com/build/building-cmdline#build_bundle).

다운로드·컴파일·키 생성 없는 설정 점검:

```sh
python scripts/build_aab.py --unsigned --check
python -m unittest discover -s scripts/tests -v
```

사용자가 빌드를 요청한 뒤 미서명 번들을 검증할 때:

```sh
python scripts/build_aab.py --unsigned
```

결과는 `dist/play/bibimer-<versionName>-<versionCode>-unsigned.aab`다. **미서명 파일은 Play 제출용이 아니다.** `bundletool validate` 성공도 실제 설치나 Play 승인 결과를 뜻하지 않는다.

실제 서명 빌드는 저장소 밖의 업로드 키를 준비한 뒤 실행한다. 2026-10-12 사용자 요청으로 별도 업로드 키를 저장소 밖에 준비했다. `dist/play/bibimer-0.15.0-28-release.aab`와 같은 이름의 검증 기록 JSON을 생성했고 테스트 에뮬레이터에서 파생 APK 실행을 확인했다. 아래는 최초 준비·직접 관리 예시다. 이미 준비한 키를 다시 생성하지 않는다. 비밀번호를 채팅·문서·명령 인수에 쓰지 않는다. 명령은 Bash에서 실행한다.

```bash
install -d -m 700 "$HOME/.local/share/bibimer-signing"
# 처음 한 번만 실행. 이미 준비한 키가 있다면 새로 만들지 않는다.
keytool -genkeypair -keystore "$HOME/.local/share/bibimer-signing/upload.jks" \
  -storetype PKCS12 -alias bibimer-upload -keyalg RSA -keysize 3072 -validity 10000
chmod 600 "$HOME/.local/share/bibimer-signing/upload.jks"
export BIBIMER_UPLOAD_KEYSTORE="$HOME/.local/share/bibimer-signing/upload.jks"
export BIBIMER_UPLOAD_ALIAS=bibimer-upload
read -r -s -p 'Upload keystore password: ' BIBIMER_STORE_PASSWORD
export BIBIMER_STORE_PASSWORD
python scripts/build_aab.py --check
python scripts/build_aab.py
unset BIBIMER_STORE_PASSWORD
```

키 비밀번호가 저장소 비밀번호와 다를 때만 `BIBIMER_KEY_PASSWORD`도 같은 방식으로 입력하고 실행 후 해제한다. 키와 비밀번호는 안전하게 별도 백업한다. 스크립트는 키를 생성하지 않으며 저장소 내부 키·다른 사용자가 읽을 수 있는 키·알려진 개발 인증서를 거절한다. 환경 변수 이름만 서명 도구 인수로 전달한다.

출력은 `dist/play/bibimer-<versionName>-<versionCode>-release.aab`, 같은 이름의 `.json`(버전·서명 여부·SHA-256), `bibimer-setup.sh`다. 마지막 APK와 운영 브리지는 자동으로 교체하지 않는다. 현재 코드 31은 업로드·내부 테스트 게시를 마쳤으므로 다음 번들은 더 높은 버전 코드를 사용한다.

최초 코드 28 준비 당시 내부 테스트 버전 검토에서 **경고 2개**를 확인했다. 테스터 미지정으로 현재 누구도 버전을 이용할 수 없으며, 난독화 코드용 매핑 파일이 없다는 안내다. 현재 빌드는 D8을 사용하고 R8/ProGuard 난독화를 하지 않아 매핑 파일을 만들지 않는다. 테스터의 Google 계정 이메일을 요청했으며 아직 등록·출시 버튼을 실행하지 않았다.

Console의 앱 서명 인증서 ZIP에서 다음 공개 인증서 SHA-256을 확인했다. 개인 키를 다운로드한 것은 아니다.

| 인증서 | SHA-256 |
| --- | --- |
| Play 배포 인증서 `deployment_cert.der` | `D7:7B:81:67:43:76:F3:39:0D:7D:05:B7:D3:11:5D:C7:30:77:D5:59:B4:53:2E:C7:DC:34:E8:CC:4B:AC:B5:3B` |
| Play 하이브리드 classical 인증서 | `FD:88:C7:16:FF:E6:95:F1:41:3A:9F:16:D7:55:D9:16:2C:23:DC:DB:42:C6:AD:B9:B0:90:58:46:C4:6A:D8:02` |
| Play 하이브리드 PQC 인증서 | `18:70:66:97:A1:D8:C7:51:1F:1D:45:66:BF:85:57:9B:2C:83:C0:2E:C2:3A:38:2D:B3:97:28:1F:D5:B9:20:3E` |
| 로컬 업로드 인증서 | `A7:B7:46:09:C2:17:6E:3B:4D:76:C7:76:3B:BF:36:78:67:01:B3:93:3B:FB:E5:85:68:08:EA:E3:63:DC:A1:BA` |

업로드 인증서는 로컬 키와 Console이 일치한다. HTTPS App Links는 아직 앱의 intent filter·라우팅과 `assetlinks.json`을 구현하지 않았으므로 인증서 확인만으로 지원 완료라고 표시하지 않는다.

Play App Signing의 **앱 서명 키**와 로컬 **업로드 키**는 용도가 다르다. 기존 개발 APK와 Play 앱의 서명이 달라지면 같은 `app.bibimer` 패키지를 덮어 설치할 수 없다. 테스트용 별도 기기를 우선 사용하고, 기존 기기의 제거·재설치는 사용자 선택으로 진행한다. 앱 제거 시 앱 설정·연결 토큰은 사라지며 Termux의 파일·원본 에이전트 기록과는 구분한다.

## 데이터 보안 신고 근거

| 데이터 흐름 | 소스에서 확인한 처리 | 신고 전 확인 |
| --- | --- | --- |
| 앱 설정·연결 토큰 | 앱 전용 저장소, 토큰은 Android Keystore로 암호화. 앱 백업 비활성화 | 로컬 처리 범위와 보존·삭제 안내 |
| 프로젝트·세션·입력·출력 | `127.0.0.1:8765` 인증 HTTP로 같은 폰의 Termux 브리지와 송수신 | 다른 앱에 전달하는 데이터의 공유 신고 또는 예외 적용 |
| 프로젝트 경로·세션 메타데이터 | Termux 비공개 상태 폴더에 저장 | 목록 삭제와 실제 파일/원본 기록 삭제의 차이 |
| 프롬프트·코드·응답 | 선택한 Termux 에이전트가 설정된 제공자와 통신할 수 있음 | 사용자 생성 콘텐츠·파일·메시지 등 실제 유형, 목적, 필수/선택, 전송 암호화, 제공자별 보존 |
| 알림 | 완료 답변 최대 180자와 프로젝트·세션 이름을 Android 알림에 전달. 공개 잠금 화면은 일반 완료 문구 | OS 알림 접근 허용 앱을 포함한 기기 설정에 따른 노출 안내 |
| 설치·외부 링크 | Termux 패키지 저장소, 선택적 SDK/CLI 설치, 브라우저로 여는 외부 안내 | 제3자에게 전달되는 요청 및 각 배포처 정책 |

앱 소스에는 광고·분석 SDK나 Bibimer 운영 서버 전송이 없다. 하지만 **이 사실만으로 수집·공유 없음을 신고하지 않는다.** Google은 로컬에서만 처리한 데이터와 다른 앱에 전달하는 데이터를 구분하며, 사용자 요청에 따른 전송에는 조건부 공유 예외가 있다. 실제 에이전트 설정·전송과 UI 안내를 확인해 답한다. [Data safety 작성 기준](https://support.google.com/googleplay/android-developer/answer/10787469).

아래 내용은 초기 데이터 보안 초안의 신고 근거다. 대상 연령 선행 조건을 해결한 뒤 전체 설문을 저장했고 현재 출시와 함께 제출했다.

- 기타 인앱 메시지·파일 및 문서·기타 사용자 제작 콘텐츠: 수집 및 공유, 선택 사항, 앱 기능 목적. 외부 제공자의 기록 보존을 일시적 메모리 처리로 단정하지 않는다.
- Bibimer 계정 생성 없음. 선택적 GitHub·AI 연동은 사용자가 외부에서 만든 계정과 Termux CLI의 인증을 사용한다고 설명한다. Terminal은 제공자 계정 없이 사용한다.
- 모든 수집 데이터의 전송 암호화: **아니요**. 앱 자체는 같은 폰의 `127.0.0.1`에만 HTTP로 연결하고 Android 네트워크 설정은 이 주소에만 cleartext를 허용한다. 사용자가 설정한 외부 CLI·도구·엔드포인트 전체의 암호화를 확인하지 않았으므로 보안 연결 보장 배지를 주장하지 않는다. 실제 출시 범위의 제공자·도구 설정을 바탕으로 제출 전 다시 검토한다.
- 데이터 삭제 요청: **예**, [공개 요청 절차](https://bibimer.app/privacy/#data-deletion). 이메일로 운영자가 보유한 문의 정보의 삭제를 요청하고 기기 데이터 삭제 방법을 안내받을 수 있다. Termux 파일·원본 에이전트 기록·외부 제공자 데이터는 각각 기기나 제공자에서 삭제하며, 운영자가 보유하거나 대신 삭제한다고 설명하지 않는다. Google의 작성 안내는 전용 이메일 등 요청 접수 수단을 허용한다.

사용자 요청 전송의 공유 예외에 의존하지 않고 현재 세 유형의 전송을 공개하는 초안이다. 선택된 외부 에이전트의 별도 계정·진단·사용 정보 전송은 사용자 설치·설정에 따라 달라질 수 있으므로 이 초안을 모든 제공자 구성의 검증 결과로 해석하지 않는다.

개인정보처리방침은 로그인·지역 제한 없는 공개 웹 주소로 제공하고 앱에서도 접근할 수 있어야 한다. 영어 `/privacy/`·한국어 `/ko/privacy/`의 공개 접근을 브라우저에서 확인했다. 앱 내 정책 링크는 캡처용 APK에 포함했고 에뮬레이터에서 외부 Chrome 실행을 확인했다. Chrome 최초 실행의 약관 단계에서 멈췄으므로 에뮬레이터의 정책 페이지 로드·실기기 호출은 미검증이다. `bibimer.app`은 `npx cf`로 조회 후 사용자 구매 지시에 따라 1년 USD 8.20 등록·연결을 완료했다. 자동 갱신은 꺼져 있고 만료일은 2027-10-11이다. 갱신 조회가는 USD 14.20/년이었다. [사용자 데이터 정책](https://support.google.com/googleplay/android-developer/answer/10144311).

## 스토어 문구와 그래픽

`release/google-play/listing.json`은 업로드 도구용 API 요청이 아닌 등록 내용과 이미지 경로의 기록이다. 두 언어의 제목·짧은 설명·전체 설명을 각각 30·80·4,000자 이내로 작성했다. 공개 이메일·웹사이트·정책 URL과 두 언어의 이미지까지 Console에 저장했다. 기본 등록정보는 검토 전송 준비 상태이며 앱 자체는 출시 준비 중이다. 사용자 선택에 따라 가격은 무료, 국가는 지원하는 전체 국가·지역으로 저장했다. 기록의 `ALL_AVAILABLE`은 이 선택을 나타내며 API 국가 코드가 아니다.

`release/google-play/graphics/`의 아이콘은 기존 B 심벌의 도형·색상을 유지하고 Play가 마스킹할 정사각형으로 출력했다. 소개 그래픽의 BIBIMER 텍스트는 앱에 포함된 Space Grotesk Bold를 사용한다. 우측 프로젝트·대화·터미널 그림은 기능을 설명하는 도형이며 실제 앱 스크린샷이 아니다.

현재 UI 검증 환경의 `playwright-core`, Termux `headless_shell`, ImageMagick이 준비되어 있으면 다음 명령으로 다시 출력한다.

```sh
node scripts/export_play_graphics.cjs
```

출력 규격은 512×512 RGBA PNG 아이콘, 1024×500 RGB PNG 소개 그래픽이다. 사용자 요청으로 캡처용 APK를 빌드·설치한 Android 에뮬레이터에서 Work 시작·Setup·Settings를 영어·한국어로 캡처했다. 이후 공식 Termux 설치·연결과 테스트 프로젝트의 `pwd` 실행을 확인하고 Terminal 원본 PNG를 추가했다. 1080×1920, 9:16의 기존 캡처를 사용한다. 현재 등록정보에는 언어별 Terminal·Setup·Settings 3장만 포함한다. 개인 데이터·가짜 대화는 포함하지 않았다. [캡처 환경과 검증 범위](../release/google-play/screenshots/README.md), [Play 이미지 요구사항](https://support.google.com/googleplay/android-developer/answer/9866151).

## Termux 연동과 심사

앱은 사용자 허용 후 `RUN_COMMAND`로 같은 폰의 Termux에서 내장 브리지 설치 작업을 실행한다. Python이 없으면 Termux 패키지 관리자가 설치한다. 별도 설치 스크립트에는 선택적 Claude SDK 및 CLI 복구 경로도 있다. Android 앱 자체의 코드·리소스는 Play 배포물에 포함하며 WebView는 내장 리소스만 읽는다.

외부 실행 코드 다운로드·다른 앱 연동은 [Device and Network Abuse 정책](https://support.google.com/googleplay/android-developer/answer/16559646)에 비추어 전체 동작을 설명해야 한다. **Termux에서 실행한다는 이유만으로 자동 면제라고 단정하지 않는다.** 자동 설정부터 에이전트 준비까지 다운로드 대상·실행 주체·권한·사용자 동작을 심사 안내에 기록한다. Google의 해당 구조 허용 여부는 아직 확인되지 않았다.

심사 접근 안내는 [설정 가이드](setup.md)를 바탕으로 영어로 제공한다. 사용자 제안에 따라 개인 에이전트 계정 대신 **계정 없는 Terminal** 경로를 검증했다. 공식 Termux 0.118.3 설치·최초 실행 → Bibimer 수동 설치 파일 내보내기 → 저장 완료 확인 → `termux-setup-storage` → `bash ~/storage/downloads/bibimer-setup.sh` → 기기에서 생성한 코드로 연결 → `~/projects/play-review` 생성 → Terminal 실행·`pwd` → Settings 왕복과 앱 재열기 후 같은 실행 세션 유지를 확인했다. 수동 경로에는 `RUN_COMMAND`와 `allow-external-apps`가 필요하지 않다. 자동 연결·실기기·AI 모델 응답 검증으로 확대해 해석하지 않는다.

초기에는 계정 없는 Terminal 안내만으로 Console의 **앱의 모든 기능에 전체 접근을 제공한다는 확인**을 충족하지 못해 저장하지 않았다. 현재는 [영어 안내](../release/google-play/review-instructions.txt)의 461자 요약과 비공개 코드를 격리된 가상 심사 리소스로 저장·제출했다. 전체 접근 확인은 해당 예제 UI에 대한 선언이며 실제 외부 에이전트·GitHub 인증을 검증한 것은 아니다. 개인 계정·API 키를 심사자에게 제공할 필요가 있다고 단정하지 않는다. 전체 기능 접근을 요구하는 [Google 심사 접근 기준](https://support.google.com/googleplay/android-developer/answer/15748846?hl=en)에 맞는 독립 테스트 접근이나 다른 검증 수단을 준비한다. 시연 영상만으로 전체 기능 접근을 대신했다고 간주하지 않는다.

2026-10-12에도 동일한 전체 접근 확인을 확인한 뒤 미저장 입력을 취소했다. 사용자에게 **계정 없는 명시적 데모 모드와 새 AAB 준비**, 또는 **개인 계정과 분리된 심사용 외부 계정** 중 접근 방식을 질문했다. 답변 전에는 데모 기능을 구현하거나 사용자 자격 증명을 등록하지 않는다. 로그인 세부정보 완료 → 대상 연령(13–15, 16–17, 18+) → 데이터 보안 제출 순서로 진행한다.

## 포그라운드 서비스 설명 초안

앱은 `FOREGROUND_SERVICE_SPECIAL_USE`로 같은 기기 브리지의 명시적 완료 이벤트를 확인한다. 기능·지연/중단 영향·작동 단계가 보이는 영상이 필요하다. 타입 선언은 승인 보장이 아니다. [신고 요구사항](https://support.google.com/googleplay/android-developer/answer/13392821).

Console 설명 초안:

> BIBIMER monitors coding-agent response completion in Termux on the same Android phone. When response notifications are enabled and Android notification permission is granted, a visible foreground notification accompanies a connection to the authenticated loopback bridge. This service observes completion events; it does not run model tasks, send agent instructions, synchronize files, or connect to a remote development host. Users can stop monitoring from the ongoing notification or Settings. Delaying or interrupting monitoring can delay or prevent completion alerts while users are away from the app.

영상에는 알림 켜기·Android 권한 허용·실제 응답 시작·앱 백그라운드 전환·지속 알림·완료 알림·탭으로 세션 열기·알림 감시 중지를 담는다. 사용자의 프로젝트·대화·자격 증명이 노출되지 않는 전용 테스트 프로젝트를 사용한다.

## 테스트와 제출 순서

1. 조직 계정의 인증 상태·조직명·지원 이메일·조직 웹사이트·배포 국가·가격을 확정한다. 개인정보처리방침의 공개와 앱 내 경로를 완료한다.
2. 업로드 키와 Play App Signing을 설정하고 요청받은 출시 AAB를 빌드한다. 내부 테스트로 설치해 초기 설정·실제 에이전트·재접속·언어·키보드·알림을 검증한다.
3. 등록 문구·실제 화면·그래픽·개인정보처리방침·데이터 보안·앱 액세스·광고 여부·대상 연령·콘텐츠 등급·FGS 신고를 작성한다. AI 콘텐츠 정책을 포함해 실제 기능에 해당하는 Console 항목도 검토한다.
4. 내부 테스트 결과와 피드백을 반영하고 필요하면 비공개 테스트를 추가한다. 조직 계정에는 신규 개인 계정의 12명·14일 테스트와 그에 따른 프로덕션 접근 신청 절차를 필수 일정으로 넣지 않는다.
5. 사전 출시 보고서와 정책 검사를 해결한 뒤 프로덕션 심사에 제출한다. 심사 승인 및 실제 스토어 노출을 확인한 후 출시 완료로 기록한다.

12명·14일 연속 비공개 테스트는 2023-11-13 이후 생성한 **개인** 개발자 계정을 대상으로 하는 요건이다. 이번 조직 계정 출시에는 해당 요건이 적용되지 않지만, 앱의 동작 검증·정책 준수·Google 심사는 필요하다. [개인 계정 테스트 요건의 적용 범위](https://support.google.com/googleplay/android-developer/answer/14151465).
