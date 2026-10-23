# 개발 및 검증

## 0.28.0 · 브리지 업데이트 후 세션 다시 열기 내부 테스트 (2026-10-23)

**0.28.0(49)**을 **2026-10-23 09:36 Asia/Seoul**에 내부 테스트에 게시했다. 같은 폰의 기존 Termux:X11·Firefox에서 업로드·검토·게시했고 Console **활성 / 내부 테스터에게 제공됨**을 새로고침 후 다시 확인했다. 새49만 포함·48제외·버전 코드1개·EN/KO노트2/2·오류0·기존 가독화 매핑 파일 경고1·확인한 기기 유형의 지원 변화0이며 기존 트랙/테스터 설정을 유지했다.

업데이트 확인 창의 **업데이트 후 세션 다시 열기**가 기본 선택이다. Codex·Claude·OpenCode의 저장 Chat을 같은 네이티브 대화로 재개하고, 같은 폴더의 새 터미널·기존 프로필의 Firefox 직접 로그인 모드를 연다. 세션 ID·이름·보관·선택·초안을 유지하며 중단 응답·명령·승인·대기열·PTY 출력은 재실행/복원하지 않는다. 실패/저장 없음/실행 여부 불명을 구분하고 확인된 실패·미시작만 설정에서 재시도한다. 일반 재시작·옵션 해제·업데이트 실패는 자동으로 다시 열지 않는다. **앱 업데이트 후 설정에서 브리지0.21.0 업데이트가 필요**하다.

소스 준비 커밋 `2bc21e2`, AAB `dist/play/bibimer-0.28.0-49-release.aab`, SHA-256 `a504742899a885586424fc9daa20f5032beb693d897bce43b56ab52e6e3d5268`. 전체 Java/D8·bundletool·기존 업로드 인증서·54assets 원본·복구 native API·심사 digest/비밀 원문 미포함·설치/유지보수6payload·설치 구문/격리 추출/0700 검증을 통과했다. 버전 변경 후 scripts39개·복구/유지보수/브라우저32개·전체 격리 UI·실제 임시 업데이트의 기본 다시 열기·766키×10언어 통과. 버전 변경 전 전체 브리지213개와 추가 경계 검사는 NEXT_SESSION.md에 구분했다.

증빙 `dist/play-0.28.0/`, `.tools/aab-0.28.0-49-{build.log,verification.json}`, `.tools/release-0.28.0-{python,bridge,ui,reopen,i18n}.log`. [내부 테스트 참여 링크](https://play.google.com/apps/internaltest/4701718894791581363)를 유지했다. **새 Play 업데이트 수신·실제 앱 설치·새 APK의 RUN_COMMAND→업데이트→다시 열기 및 Android 강제 종료/절전 복구는 미검증**이다. 운영 브리지·사용자 세션·프로덕션·iOS·웹사이트 배포는 변경하지 않았다.

## 0.27.0 · Firefox 개발 브라우저 내부 테스트 (2026-10-23)

**0.27.0(48)**을 **08:25 Asia/Seoul**에 내부 테스트에 게시했다. 같은 폰의 기존 Termux:X11·Firefox에서 서명 AAB를 업로드하고 EN/KO노트2/2·검토·확인 창으로 게시했다. Console **활성 / 내부 테스터에게 제공됨**, 새48만 포함·47제외·버전 코드1개와 **새로고침 후 상태 유지**를 확인했다. 오류0·기존 가독화 매핑 파일 경고1·확인한 기기 유형의 지원 변화0이며 기존 트랙/테스터 설정을 유지했다.

Firefox·Termux:X11 준비, 프로젝트별 창/프로필 재사용, 직접 로그인→에이전트 제어 전달, 새 Codex·Claude·OpenCode Chat용 도구/사용 안내를 포함한다. 모델/권한 줄 간격4px·응답 중단 버튼28px/세로2px도 반영했다. **앱 업데이트 후 설정에서 브리지0.20.0 업데이트가 필요**하다. 운영 브리지와 기존 에이전트 세션은 이 배포에서 업데이트/재시작하지 않았다.

AAB `dist/play/bibimer-0.27.0-48-release.aab`, SHA-256 `8523103afc029ceb732516afff119fe52df9322535895f5c35e1a4875bd540c1`. 전체 Java/D8·bundletool·기존 서명/업로드 인증서·54assets 원본·실제 DEX native 브라우저 API/브리지 버전·심사 digest/비밀 원문 미포함·설치/유지보수5payload·설치 스크립트 구문/격리 추출/0700을 확인했다. 버전 변경 후 scripts39개·브라우저/유지보수21개·전체 격리 Chromium UI·757키×10언어를 통과했다. 버전 변경 전 동일 구현의 전체 브리지204개와 실제 폰 Firefox/X11의 한글 입력·클릭·캡처·파일 선택창 검증은 NEXT_SESSION.md에 구분했다.

증빙 `dist/play-0.27.0/`, 빌드/검증 `.tools/aab-0.27.0-48-{build.log,verification.json}`, 회귀 `.tools/release-0.27.0-{python,bridge,ui,i18n}.log`, 출시노트 `release/google-play/release-notes/0.27.0.txt`. [내부 테스트 참여 링크](https://play.google.com/apps/internaltest/4701718894791581363)를 유지했다. **새 Play 업데이트 수신·실제 앱 설치·새 APK의 설치→인증 전체 흐름은 미검증**이다. iOS·프로덕션·웹사이트 배포는 변경하지 않았다.

## 0.26.3 · 셀렉터 높이·설정 줄 간격 내부 테스트 (2026-10-22)

**0.26.3(47)**을 **23:58 Asia/Seoul**에 내부 테스트에 게시했다. 같은 폰의 기존 **Termux:X11·Firefox** 인증 상태를 유지해 업로드·검토·게시했고, Console **활성 / 내부 테스터에게 제공됨**과 새로고침 뒤 상태 유지를 확인했다. 새47만 포함·46제외, EN/KO노트2/2, 오류0·기존 가독화 매핑 파일 경고1·지원 기기 변화0이다. 출시 이름은 `0.26.3 (47) - Compact selectors and row spacing`다.

일반 셀렉터 최소36px·세로4px 패딩, 입력창 아래 모델/권한 셀렉터32px·세로3px 패딩과 설정 섹션 사이8px 간격을 반영했다. 내장 브리지는 **0.19.0 유지**다. 46/47의54개 내장 자산 이름은 같으며 변경된 자산은 `app.css` 하나다. 브리지/설치/유지보수 payload는 바이트 단위로 같아 이번 UI 변경만을 위한 브리지 업데이트는 필요하지 않다.

AAB `dist/play/bibimer-0.26.3-47-release.aab`, SHA-256 `505e49986a19b07e14f4e4b0aa17135e7802744942ba4a44987d4b8a18258bd6`. 전체 Java/D8·bundletool·기존 인증서·54assets 원본·심사 digest/비밀 미포함·브리지/유지보수4payload·설치 스크립트 구문/격리 추출을 검증했다. 버전 변경 뒤 Python scripts39개·전체 격리 Chromium UI·컨텍스트/구독 renderer·726키×10언어·구문 검사를 통과했다. 앞선 실제21개 셀렉터와1,200조합의 배치 검사도 기록했다. `.tools/aab-0.26.3-47-{build.log,verification.json}`, `.tools/release-0.26.3-{python,ui}.log`.

증빙 `dist/play-0.26.3/{review-warning,review-devices,review-notes,published-before-refresh,published}.png`와 관찰 기록 `published.json`, EN/KO출시노트 `release/google-play/release-notes/0.26.3.txt`. 기존 [내부 테스트 링크](https://play.google.com/apps/internaltest/4701718894791581363)와 테스터 설정을 유지했다. **Play 업데이트 수신·실제 앱 설치·새 WebView 동작은 후속**이며 운영 브리지·사용자 세션·iOS·프로덕션·웹사이트 배포는 변경하지 않았다.

## 0.26.2 · 셀렉터·상세 사용량 개선 내부 테스트 (2026-10-22)

**0.26.2(46)**을 **23:21 Asia/Seoul**에 내부 테스트에 게시했다. 같은 폰의 **Termux:X11·Firefox**에서 사용자가 직접 Google 인증을 마친 뒤 일반 브라우저 UI로 업로드·검토·게시했다. Console **활성 / 내부 테스터에게 제공됨**을 확인하고 새로고침 후 다시 검증했다. 새46만 포함·45제외, EN/KO노트2/2, 오류0·기존 가독화 매핑 파일 경고1·지원 기기 변화0이다. 출시 이름은 `0.26.2 (46) - Selector outlines and usage bars`다.

권한 셀렉터 너비·화살표 간격, 전체 셀렉터 아웃라인, 컨텍스트·구독 기간별 상세 막대를 포함한다. 내장 브리지는 **0.19.0 유지**이며 이미 같은 버전을 사용하는 경우 이번 UI 개선만을 위한 브리지 업데이트는 필요하지 않다. AAB `dist/play/bibimer-0.26.2-46-release.aab`, SHA-256 `61bf9c1bb2cbad4a75792eefeb0a0e38222e0e4b76849c6503330470a080b141`. 전체 Java/D8 빌드·bundletool·기존 업로드 인증서·54assets 원본·심사 digest 포함/비밀 원문 미포함·브리지/유지보수4payload·설치 스크립트 구문/격리 추출을 검증했다. Python scripts39개, 컨텍스트/구독 renderer·726키×10언어·구문 검사 및 기능 구현 뒤 전체 격리 Chromium UI 회귀가 통과했다.

증빙 `dist/play-0.26.2/{review-warning,review-notes,published-before-refresh,published}.png`, 실제 UI 관찰 기록 `dist/play-0.26.2/published.json`. 빌드/검증 `.tools/aab-0.26.2-46-{build.log,verification.json}`, 출시노트 `release/google-play/release-notes/0.26.2.txt`. 기존 [내부 테스트 링크](https://play.google.com/apps/internaltest/4701718894791581363)·테스터 설정을 유지했다. **Play 업데이트 수신·실기기 앱 설치·새 WebView UI 실동작은 후속**이다. 이번에 확인한 같은 폰의 X11 브라우저 인증·게시와 앱 설치 검증을 구분한다. 운영 브리지·사용자 세션·iOS·프로덕션·웹사이트 배포는 변경하지 않았다.

## 0.26.1 · 원형 사용량 표시 내부 테스트 (2026-10-22)

**0.26.1(45)**을 **17:40 Asia/Seoul**에 내부 테스트에 게시했다. 기존 Chrome의 Play Console에서 **활성 / 내부 테스터에게 제공됨**을 확인하고 새로고침 후 다시 검증했다. 새45 포함·44 제외, EN/KO노트2/2, 오류0·기존 가독화 매핑 파일 경고1·지원 기기 변화0이다. 출시16, 이름 `0.26.1 (45) - Compact usage indicators`다.

접근 권한 줄의 원형 컨텍스트·구독 지표와 입력창 위 상세 팝업을 반영했다. 내장 브리지는 **0.19.0 유지**이며 44의 브리지와 유지보수 payload4개가 바이트 단위로 같다. 이미0.19.0을 사용하는 경우 이번 UI 개선을 위한 브리지 업데이트는 필요하지 않다. 이전 브리지 사용자는 설정에서0.19.0으로 업데이트해야 기존 사용량 수집 기능을 쓸 수 있다.

AAB `dist/play/bibimer-0.26.1-45-release.aab`, SHA-256 `563f8820ad32e7a6e28762fea8bddfa42db299a2cff50d96a232ec9d8d4fe796`. 빌드·bundletool·서명/기존 업로드 인증서·54assets 원본 일치·심사 digest 포함/비밀 원문 미포함·브리지 payload4개 원본 일치를 검증했다. Python scripts **39개**, 컨텍스트/구독 renderer·**726키×10언어**·언어 UI·JS 구문 검사가 통과했다. 전체 격리 Chromium `smoke_ui.cjs`도 통과했으며 두 표시 모드×10언어의320px 화면에서 한 줄 배치·입력창을 가리지 않는 상세·키보드/Back/바깥 터치 닫기·초안 유지·추가 전송 없음과 기존 Chat/PTY 회귀를 확인했다.

증빙 `dist/play-0.26.1/{review,published-before-refresh,published}.json`, 빌드/검증 `.tools/aab-0.26.1-45-{mac.log,verification.json}`, 검사 `.tools/release-0.26.1-{python,ui}.log`, 출시노트 `release/google-play/release-notes/0.26.1.txt`. 실제 Android WebView·Play 업데이트 수신·실기기 설치는 후속이다. 전체 브리지는 이번 UI 배포에서 재실행하지 않았으며 앞선 Mac 실패 기록을 유지한다. 운영 브리지·사용자 세션·iOS 실행 앱·프로덕션·테스터 설정·웹사이트 배포는 변경하지 않았다.

## 0.26.0 · 컨텍스트·구독 사용량 내부 테스트 (2026-10-22)

**0.26.0(44)**을 **09:32 Asia/Seoul**에 내부 테스트에 게시했다. Console 활성·내부 테스터 제공 상태를 새로고침 후에도 확인했다. 새44 포함·43 제외, EN/KO노트, 오류0·기존 매핑 파일 경고1·지원 기기 변화0이다. 컨텍스트와 지원되는 Codex·Claude 계정의 구독 사용량/초기화 시각, 사용량/남은 양 설정을 포함하며 **앱 업데이트 후 설정에서 브리지0.19.0 업데이트**가 필요하다.

AAB `dist/play/bibimer-0.26.0-44-release.aab`, SHA-256 `87a289ef05244657077e77a23288c3754ff503538b18636fe71f337745b82a37`. 빌드·서명·54assets·브리지/유지보수4payload·비밀 미포함 검증, Python scripts39개·컨텍스트/구독16개·726키×10언어·격리 Chromium 전체 UI가 통과했다. Mac 전체 브리지191개는 failures16/errors1로 전체 성공이 아니며 PTY·프로세스 관련 제약과 개별 Setup 재검사 결과는 NEXT_SESSION.md에 기록했다. 실제 기기 설치·Play 업데이트 수신·Claude 실제 계정 이벤트는 후속이다.

기존 Chrome을 AppleScript로 제어해 게시했으며 증빙은 `dist/play-0.26.0/{review,published-before-refresh,published}.json`이다. 사용자 운영 브리지·세션·iOS 실행 앱·프로덕션·웹사이트 배포는 변경하지 않았다. 아래 정식 심사 기록은 당시 확인한 상태다.

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

## 0.17.1 AAB 내부 테스트 (2026-10-14)

- 앱 0.17.1/versionCode 33, 내장 브리지 0.15.0. 상위 폴더 첫 행과 뷰어 아래 탐색기 유지를 기존 업로드 키·심사 코드로 빌드했다. 새 키·Doppler 자동 다운로드·APK 배포 파일은 만들지 않았다.
- `dist/play/bibimer-0.17.1-33-release.aab`, SHA-256 `b52c3d5fbb632b81308a6696ba9a7c97cb8fc2c9dd19fe856541599802ec2b09`. bundletool/jarsigner·기존 업로드 인증서 일치·Manifest 33/MAIN/LAUNCHER·30개 assets 원본 일치·심사 digest 포함·코드/암호 원문 미포함을 확인했다. 빌드 로그 `.tools/aab-0.17.1-33-mac.log`, 검증 `.tools/aab-0.17.1-33-verification.json`.
- Python 14개, ReviewAccess Java 17개 단언, Demo 95개 단언/11개 시나리오, Node 접근 UI·입력 계약·초안 검사와 변경 JS 구문 검사를 통과했다. 탐색기 UI는 앞선 CUA/격리 브리지 검증을 따른다. 별도 Mac Git 정리 검사 1건 실패와 전체 smoke 도구 미설치는 `NEXT_SESSION.md`에 기록돼 있다. 브리지 소스·운영 세션은 변경하지 않았다.
- 내부 테스트는 10월 14일 12:37 **내부 테스터에게 제공됨**으로 게시됐다. 이후 사용자가 설치·정상 동작을 보고했고 같은 번들을 프로덕션으로 승급했다. 새로 로드한 Console에서 0.17.1(33)의 오후 4:17 게시·100%·178/178 국가 제공을 확인했다. 사용자 보고를 에이전트의 실기기 세부 기능 검증으로 표현하지 않는다.

## 심사용 데모 접근 제한 · 0.16.1 AAB (2026-10-12)

심사용 예제 공간은 Settings의 **Review access / 심사자용 접근**에서 비공개 코드로 연다. 일반 첫 화면·Setup의 데모 체험 버튼과 Settings의 체험 소개는 제거한다. 심사 코드 원문은 저장소 밖 0600 파일에 보관하고 `BIBIMER_REVIEW_CODE_FILE`로 빌드에 전달한다. 공통 빌드 스크립트가 생성하는 `ReviewAccessConfig.DIGEST`에는 SHA-256만 들어가며, 설정 없는 빌드에서는 접근을 거절한다. 코드 원문을 Git·로그·공개 페이지에 넣지 않는다.

공개 README와 스토어 설명은 실제 개발 환경 준비와 사용을 안내한다. [심사 접근 안내](../release/google-play/review-instructions.txt)는 Console의 비공개 코드 입력란을 참조하며 코드 원문을 포함하지 않는다. 공개 데모였던 버전 30의 심사를 철회하고 제한된 버전 31과 안내를 함께 교체했다. 최신 제출·내부 테스트 상태는 [출시 기록](google-play-release.md)을 따른다.

- 기존 `setDemoMode(true)` 호출과 인증 없는 과거 데모 설정으로 진입할 수 없다. 정상 연결·설정·초안과 가상 작업 공간의 분리를 유지하며 실제 Termux 프로세스나 제공자 계정에 접근하지 않는다.
- 서명 AAB `dist/play/bibimer-0.16.1-31-release.aab`, SHA-256 `4e5cacead042bd2208995b36500846a702811f3541be2a608bc9dfa890041e59`. 기존 업로드 키를 사용했다. bundletool·jarsigner·aapt2/javac/D8, 내장 asset 일치와 코드 원문 미포함을 확인했다.
- Python 14개 테스트, 접근 검증 Java 17개 단언, 기존 가상 작업 공간 95개 단언/11개 시나리오, Node 접근 UI·초안·입력 계약 검증을 통과했다. 기본 접근 차단·잘못된 코드·직접 활성화 우회 차단·과거 설정 차단·취소 시 입력 제거를 검증한다.
- 실제 소스의 영어·한국어 UI를 393×852 브라우저에서 확인했다. 시각 판정 95점 pass. Android 네이티브 호출은 대역이므로 이 검사를 설치된 앱의 동작 확인으로 해석하지 않는다. 이번에는 APK 생성·설치·실기기 Play 설치를 하지 않았다. 기존 Java 8/deprecated 경고 외 빌드 오류는 없다.

## 0.15.0 APK 빌드 완료 (2026-10-10)

- 사용자 `apk 빌드` 요청으로 앱 **0.15.0 / versionCode 28**, 내장 브리지 **0.15.0**을 빌드했다. GitHub 연결·저장소 클론/프로젝트 등록, 민트 티타늄 로고·적응형/단색 아이콘, 이미지·파일 링크를 외부 Android 앱으로 여는 기능을 포함한다. 기존 사이드바·직접 폴더 선택도 유지했다.
- 리소스·Java/D8·APK v2/v3 서명 검증 통과. 이전 0.14.2 인증서와 일치, 패키지/SDK/Manifest·읽기 전용 ContentProvider·파일 열기/GitHub DEX 경로·27개 내장 asset 원본 일치·새 로고 리소스를 확인했다. 설치 스크립트 문법·격리 추출 원본/0700 권한·자동 연결 페이로드 **77,153 UTF-16 단위 < 220,000**·Download 복사본 해시 확인.
- 버전 변경 뒤 Setup 테스트 **4개 통과**. 기능 소스는 앞선 전체 브리지 **139개**, 파일 링크/렌더링/GitHub UI 검증 결과를 따른다. 기존 deprecated/source8 컴파일 경고만 있으며 검증 실패 없음.
- 파일: **`/storage/emulated/0/Download/Bibimer-0.15.0.apk`**, 380,190바이트, SHA-256 `016ef54ad8ed9d57e30038fa5e52dfc16ae38b02e9c23f14cf47aa987392b302`.
- 파일: **`/storage/emulated/0/Download/bibimer-setup-0.15.0.sh`**, 73,299바이트, SHA-256 `09de0ce4391a75e5e4b86ef78fd5278f0562ba531e1e3f21442588a38f237448`.
- 로그: `.tools/build-0.15.0.log`, `.tools/tests-setup-0.15.0.log`, `.tools/verify-release-0.15.0.log`, `.tools/verify-apk-0.15.0.json`. 이전 Download 버전은 유지했다.
- **APK 설치·운영 브리지 업데이트/재시작·사용자 세션 종료는 하지 않았다.** GitHub·파일 열기는 브리지 0.15.0 적용이 필요하며 APK 설치/자동 연결만으로 기존 브리지를 업데이트하지 않는다. 실제 Android 뷰어의 URI 읽기/앱 선택/복귀, GitHub 인증 브라우저 복귀, 런처 마스크·테마 아이콘은 설치 후 검증한다.


## 2026-10-07 0.14.2 APK 빌드 검증

- 앱 **0.14.2/code 27**, 내장 브리지 **0.14.0**. 프로젝트 폴더 목록에서 하위 탐색 없이 Select로 바로 선택하는 변경을 포함한다. 구현 단계의 전체 UI 회귀·작은 화면 확인 이후 버전만 변경했다.
- 빌드·v2/v3 서명·0.14.1 인증서 일치, Manifest/SDK·내장 26개 asset/직접 선택 코드, 설치 스크립트 격리 추출·권한·Download 복사 해시 검증을 통과했다. `Download/Bibimer-0.14.2.apk`로 저장했으며 해시·로그는 [NEXT_SESSION.md](../NEXT_SESSION.md)를 따른다.
- APK 설치·운영 브리지/사용자 세션 변경은 하지 않았다. 추가 브리지 업데이트는 필요하지 않으며 실제 Android 화면 검증은 설치 후 진행한다.

## 2026-10-07 0.14.1 APK 빌드 검증

- 앱 **0.14.1/code 26**, 내장 브리지 **0.14.0**. 우측 사이드바 열기 버튼에 현재 탭 아이콘을 표시하는 변경을 포함한다. 기능 구현 시 아이콘 전환·닫기/재열기·한국어 설명 및 기존 Inspector UI 통합 검증을 마쳤다.
- APK 빌드·v2/v3 서명·0.14.0 인증서 일치, Manifest/SDK·내장 26개 asset/선택 아이콘 코드, 설치 스크립트 격리 추출·권한·Download 복사 해시를 확인했다. `Download/Bibimer-0.14.1.apk`로 저장했다. 해시·로그는 [NEXT_SESSION.md](../NEXT_SESSION.md)를 따른다.
- APK 설치는 하지 않았다. 이전 요청의 운영 브리지 업데이트는 읽기 전용으로 **0.14.0·두 세션 복원·workspace_inspector 활성화 완료**를 확인했다. 이번 아이콘 변경에 추가 브리지 업데이트는 필요하지 않다.

## 2026-10-07 0.14.0 APK 빌드 검증

- 사용자 빌드 요청으로 앱 **0.14.0/code 25**, 내장 브리지 **0.14.0**을 빌드했다. 우측 파일·Git 아이콘 탭과 기존 DeX·태블릿 반응형 화면·연결 보완을 포함한다.
- 버전 변경 후 Inspector 8개·Setup 4개 검사 통과. APK v2/v3 서명 및 이전 0.13.1 인증서 일치, 패키지/SDK·Manifest, 네이티브 조회 경로, 내장 26개 asset 원본 일치, 설치 스크립트 문법·격리 추출·0700 권한, 자동 설정 페이로드 제한과 Download 복사본 SHA-256을 확인했다.
- `Download/Bibimer-0.14.0.apk`, `Download/bibimer-setup-0.14.0.sh`로 저장했다. APK 설치·운영 브리지 업데이트/재시작은 하지 않았다. 실제 Android WebView·DeX/태블릿 검증은 설치 후 진행한다. 로그·해시는 [NEXT_SESSION.md](../NEXT_SESSION.md)에 기록했다. 아래 소스 구현 단계의 APK 대기 기록은 이번 빌드로 해소됐다.

## 2026-10-07 우측 파일·Git 사이드바 (소스 / APK 반영 대기)

- `python -m unittest discover -s bridge/tests`: 121개 통과. 이후 추가한 충돌·타임아웃 검사를 포함한 `test_inspector.py` 최신 8개도 통과했다. 경로·실제 워크트리 제한, 파일·Git 출력 크기, symlink/FIFO 거절, 충돌·rename·빈 저장소·detached HEAD·페이지 분할, 외부 Git 프로그램 실행 차단과 인덱스/메타데이터 보존을 검증한다.
- `node scripts/smoke_inspector.cjs`: 임시 저장소·워크트리 및 실제 격리 브리지로 파일/미리보기·Git status/diff/history/detail·재시도·지연 응답 격리·프로젝트/워크트리 선택·초안/프로세스 유지·반응형 우측 패널·키보드·영어/한국어·구형 브리지 안내를 검증한다.
- 기존 `smoke_ui.cjs`, `smoke_library.cjs`, `smoke_rendering.cjs`와 Android Java API 36 컴파일 통과. 브라우저의 Android 네이티브 대역 검증이며 실제 WebView/DeX 검증은 아니다. 로그·범위·배포 상태는 [NEXT_SESSION.md](../NEXT_SESSION.md)를 따른다. 새 APK 빌드·운영 브리지 적용은 하지 않았다.

## 2026-10-07 0.13.1 APK 빌드 검증

- 앱 **0.13.1/code 24**, 내장 브리지 **0.13.0**. DeX·태블릿 반응형 UI, 디스플레이 구성 변경 시 WebView 유지, 창 포커스 이동 중 연결 조회 유지, 저장된 연결 우선 재접속을 포함한다. 이번 변경에 브리지 업데이트는 필요하지 않다.
- 렌더링·세션 목록·Setup·전체 UI 통합 검증 통과. 320~2560px 및 낮은 창의 배치, 고정 사이드바·모달 전환, 세션 초안/승인 보존과 기존 PTY/Chat 흐름을 확인했다. 범위와 실제 기기 제약은 [화면 기준](interface.md#dex태블릿-반응형-화면-0131)을 따른다.
- APK v2/v3 서명·이전 인증서, 버전/SDK·DeX Manifest 플래그, 내장 asset 및 격리 설치 추출, 다운로드 복사본 검증 통과. 설치 파일은 `Download/Bibimer-0.13.1.apk`. 로그와 해시는 [NEXT_SESSION.md](../NEXT_SESSION.md)에 기록했다. 실제 설치·DeX/태블릿 검증과 운영 브리지 재시작은 수행하지 않았다.

## 2026-10-06 0.13.0 APK 빌드 검증

- 앱 **0.13.0/code 23**, 내장 브리지 **0.13.0** 빌드 완료. 빈 요약 카드 숨김·표기 변경과 에이전트 간 이어가기 선택을 포함한다. APK·설치 스크립트를 Download에 저장했다.
- v2/v3 서명·기존 0.12.0 인증서 일치, Manifest/DEX, 25개 asset 소스 일치, handoff 경로 및 요약 수정 포함, 설치 스크립트 문법·격리 추출·0700 권한·복사본 해시를 확인했다. 자동 연결 페이로드는 65,977 UTF-16 단위다.
- 기능 검증에 이어 버전 변경 후 Handoff 6개·Setup 4개 통과. 로그·파일 크기·SHA-256은 [NEXT_SESSION.md](../NEXT_SESSION.md)의 0.13.0 항목을 따른다. APK 설치·운영 브리지 적용은 이번 빌드와 별개이며 수행하지 않았다.

## 2026-10-06 에이전트 간 대화 이어가기 (미빌드)

- `POST /v1/sessions/{id}/handoff`는 preview/start 두 동작을 제공한다. preview는 원본의 완료된 사용자·답변과 revision을 반환한다. start는 확인한 context·instruction·대상 agent/options·revision·request_id를 받아 같은 프로젝트/워크트리에 별도 Chat을 만들고 초기 대기 입력을 보낸다. 기존 에이전트 어댑터의 새 세션/턴 API를 사용하며 원본 프로세스나 네이티브 ID를 바꾸지 않는다.
- 초기화·진행 중 턴·승인·대기열·변경된 revision을 검사한다. request digest는 원본/대상/본문/설정/revision을 묶고 동일 요청은 생성된 세션을 반환한다. 출처와 digest만 metadata에 유지하고 본문은 저장하지 않는다. 네이티브 대화 기록은 해당 에이전트가 보관한다.
- `bridge/tests/test_handoff.py`의 6개 검사와 `scripts/smoke_handoff.cjs`로 세 에이전트의 여섯 방향, 기존 세션·초안·워크트리 유지, 기록 필터/바이트 제한, 미리보기의 무실행, 승인/대기열/원본 변경 거절, 응답 유실 후 동일 요청 복구·출처 링크를 검증했다. 320/393px 영어·한국어 화면과 구형 브리지 안내를 확인했다. 기존 전체 UI·라이브러리/알림 검증, Java 컴파일·JS 문법 검사도 통과했다.
- 새 APK·운영 브리지 적용 전 상태다. 실제 모델 맥락의 유용성, Android WebView/키보드는 새 빌드 설치 후 검증한다. 자세한 로그·현재 운영 상태는 [NEXT_SESSION.md](../NEXT_SESSION.md)를 따른다.

## 2026-10-06 0.12.0 APK 빌드 검증

- 앱 **0.12.0/code 22**, 내장 브리지 **0.12.0** 빌드 완료. `/` 스킬·명령 UI와 세 에이전트 네이티브 호출, 압축 브리지 설치 파일을 포함한다. Download의 `Bibimer-0.12.0.apk`는 338,477바이트, `bibimer-setup-0.12.0.sh`는 59,803바이트다.
- APK v2/v3 서명·0.11.3 인증서 일치·버전/SDK/권한/서비스·DEX 명령 경로/asset 허용 목록, 25개 asset 원본 일치, 설치 스크립트 문법·격리 추출·0700 권한·내장 브리지 버전·복사본 해시를 확인했다. 자동 연결 페이로드는 63,657 UTF-16 단위로 220,000 한도 이내다.
- 기능 구현 시 전체 브리지 109개와 명령 UI/세션·알림 회귀 검증을 마쳤다. 버전 변경 후 명령 5개·Setup 4개 테스트 통과. 로그: `.tools/build-0.12.0.log`, `.tools/tests-commands-0.12.0.log`, `.tools/tests-setup-0.12.0.log`, `.tools/verify-apk-0.12.0.json`.
- APK 설치·운영 브리지 적용/재시작은 하지 않았다. 새 `/` 기능에는 앱·브리지 0.12.0이 모두 필요하며 실제 Android IME·모델 작업 검증은 설치 후 진행한다.

## 2026-10-05 0.11.1 APK 빌드 검증

- 앱 **0.11.1/code 19**, 내장 브리지 **0.11.1** 빌드 완료. 답변 미리보기와 세션 보조 문구를 포함한다. Download 파일은 `Bibimer-0.11.1.apk`(350,701바이트), `bibimer-setup-0.11.1.sh`(211,995바이트)다.
- v2/v3 서명·0.11.0 인증서 일치, 패키지/버전/권한/서비스·DEX preview/보조 문구, 내장 24개 asset 원본 일치, 스크립트 문법·격리 추출·0700 권한과 복사본 해시를 확인했다. 버전 변경 후 Setup 4개·알림 9개 테스트 통과. 기능 전체 101개 결과는 이전 구현 기록을 따른다.
- 로그: `.tools/build-0.11.1.log`, `.tools/tests-release-0.11.1.log`, `.tools/verify-apk-0.11.1.json`. APK 설치·운영 브리지 변경은 하지 않았다. 미리보기를 사용하려면 0.11.1 앱·브리지를 함께 적용해야 하며 Android 실제 표시는 설치 후 검증한다.

## 2026-10-05 알림 답변 미리보기 검증 (소스 반영 / APK·브리지 적용 대기)

- 전체 브리지 **101개 테스트 통과**. 알림 관련 9개는 발췌 서식/한국어/이모지/길이, 명시적 final 우선·commentary/도구/추론/이전 기록 제외, 출력 200개 한계와 다음 턴 초기화, OpenCode native 메시지/브리지 턴 연결을 검증한다. Claude/OpenCode 어댑터 대기열 통합 테스트에서 실제 완료 답변 미리보기 3건을 검증했다.
- Android 전체 Java 소스 컴파일과 JS 문법·diff 검사 통과. Setup payload는 215,849 UTF-16 단위로 220,000 이내다. 로그: `.tools/tests-notification-previews-all.log`, `.tools/tests-notification-previews.log`, `.tools/java-notification-previews.log`.
- APK 빌드·운영 브리지 교체는 하지 않았다. 0.11.0 설치본은 일반 완료 문구를 사용하며 짧은 답변 미리보기에는 새 APK와 브리지 적용이 필요하다. 실제 알림 UI·확장 본문·잠금 화면은 설치 후 검증한다.

## 2026-10-05 0.11.0 APK 빌드 검증

- 명시적 요청으로 앱 **0.11.0/code 18**, 내장 브리지 **0.11.0**을 빌드했다. `Download/Bibimer-0.11.0.apk`(350,701바이트), `Download/bibimer-setup-0.11.0.sh`(208,463바이트)를 저장했다. 완료 알림·프로젝트 관리·설치 버전 표시 수정이 포함된다.
- APK v2/v3 서명과 기존 0.10.0 인증서 일치, Manifest 버전/SDK/알림 권한/서비스, DEX 알림·버전 조회, 내장 24개 asset 원본 일치, 설치 스크립트 문법·격리 추출·네 소스와 0700 권한, Download 복사본 해시를 검증했다.
- 기능 구현 때 전체 97개 테스트·UI 회귀를 검증했다. 버전 변경 후 Setup 4개·완료 알림 5개를 재검증했다. 로그: `.tools/build-0.11.0.log`, `.tools/tests-release-0.11.0.log`, `.tools/tests-notifications-release-0.11.0.log`, `.tools/verify-apk-0.11.0.json`.
- 알림 테스트 재실행에서 자식 프로세스 종료와 브리지의 `exited` 상태 반영 사이 경합이 드러났다. 테스트가 condition으로 최종 상태를 기다리도록 보완한 뒤 알림 5개가 통과했다. 제품 소스·APK 동작 변경은 없다.
- APK 설치·운영 브리지 업데이트/재시작은 수행하지 않았다. 새 기능에는 브리지 0.11.0 적용도 필요하다. 알림 권한/백그라운드/잠금/탭과 WebView 실기기 검증은 설치 후 진행한다. 아래 구현일의 빌드 대기 기록은 이번 APK에 포함된 과거 상태다.

## 2026-10-04 0.10.0 APK 빌드 검증

- 명시적 요청으로 누적 기능을 앱 **0.10.0/code 17**, 내장 브리지 **0.10.0**으로 빌드했다. 최신 파일은 `Download/Bibimer-0.10.0.apk`(338,335바이트)와 `Download/bibimer-setup-0.10.0.sh`다. 아래 날짜별 기록의 빌드 대기 기능도 이번 APK에 포함했다.
- APK v2/v3 서명·이전 0.9.0 인증서 일치·버전/SDK/이름, 내장 24개 asset의 소스 일치, DEX 설정/자동 연결 클래스와 Back 처리, RUN_COMMAND 권한·비공개 수신기를 확인했다. 설치 스크립트 문법, 격리된 임시 홈의 네 소스 추출/원본 일치/0700 권한, 자동 설치 페이로드 204,953 UTF-16 단위(제한 220,000), Download 복사본 체크섬을 확인했다.
- 버전 변경 후 `python -m unittest discover -s bridge/tests -v` **87개 통과**. UI 기능은 기존 구현 시 검증했으며 이번 변경은 버전과 문서만 갱신했다. 로그: `.tools/build-0.10.0.log`, `.tools/tests-0.10.0.log`, `.tools/verify-apk-0.10.0.json`.
- APK 설치·운영 브리지 재시작은 하지 않았다. 운영 설치 소스는 0.9.0이며 새 기능에는 브리지 0.10.0 적용도 필요하다. 실제 WebView·Back/IME·Termux 자동 설치/코드 수신·새 기기 전체 흐름은 설치 후 검증한다.

## 소스 구조

```text
android/app/src/main/
    java/app/bibimer/       Android Activity, 고정 로컬 HTTP 클라이언트, 토큰 보관
    assets/                대화·터미널 화면, conversation.js/rich-text.js, select.js 선택 UI, brand.svg, i18n.js 문구
    res/                   앱 아이콘·테마·네트워크 정책, 영어·한국어 네이티브 문구
bridge/bibimer_bridge.py    Python 표준 라이브러리 브리지
bridge/provider_opencode.py OpenCode 로컬 HTTP 서버 어댑터
bridge/provider_claude.mjs  Claude Agent SDK 어댑터
bridge/setup_connect.py    앱의 Termux 준비·코드 발급 도우미 (APK asset으로 생성)
bridge/tests/              PTY·HTTP, 세 에이전트 프로토콜 대역, 업데이트 통합 테스트
scripts/build_apk.py        Termux에서 APK 빌드 및 설치 스크립트 생성
scripts/smoke_ui.cjs        화면 + 실제 브리지 연결 검증
scripts/smoke_select.cjs    자체 선택 시트·키보드·긴 목록·상태 변경 검증
scripts/smoke_setup.cjs     자동 설정 상태·재시도·연결과 모바일 UI 검증
scripts/smoke_rendering.cjs GFM·코드·diff·계획·스크롤·안전한 출력과 UI 검증
```

첫 버전은 같은 폰에서 APK까지 빌드할 수 있도록 Java와 Android 플랫폼 API를 사용한다. 화면과 xterm.js는 APK에 포함하고 WebView의 외부 네트워크 로딩과 탐색을 막는다. 로컬 HTTP 요청은 Android 네이티브 코드가 수행하며, UI JavaScript에 인증 토큰을 전달하지 않는다.

## 빌드

Google Play용 AAB 준비와 업로드 키 설정은 [출시 준비](google-play-release.md)를 따른다. `python scripts/build_aab.py --unsigned --check`는 다운로드·빌드 없이 설정을 확인한다. 2026-10-12 출시용 AAB 서명 빌드·번들 검증·파생 APK 에뮬레이터 설치를 완료하고 Play 내부 테스트 초안에 업로드·저장했다. 테스터 배포·Play에서 설치·실기기 검증은 남아 있다. 아래 APK 경로는 기존 개발용이다.

```sh
pkg install python openjdk-21 aapt2 d8 apksigner
python scripts/build_apk.py
```

빌드 스크립트는 다음 파일을 다운로드하고 고정 체크섬을 확인한다.

- Google Android SDK Platform 36 revision 2: 공식 저장소 메타데이터의 SHA-1.
- `@xterm/xterm` 5.5.0, `@xterm/addon-fit` 0.10.0, `marked` 15.0.12, `@highlightjs/cdn-assets` 11.11.1: npm 배포본의 SHA-512. 라이선스를 APK에 함께 포함한다.

출력은 `dist/bibimer-debug.apk`, `dist/bibimer-setup.sh`, `dist/checksums.json`이다. 로컬 서명 키는 `.tools/bibimer-debug.keystore`에 만들며 Git에서 제외한다. 같은 설치본을 업데이트하려면 이 키를 유지한다. 개발용 키이므로 배포용 서명·출시 절차는 별도 작업이다.

설정 스크립트는 브리지와 두 어댑터 소스를 체크섬과 함께 내장하고 설치 시 각각 검증한다. `BIBIMER_CLAUDE=1`로 실행하면 필요한 Node.js와 SDK 0.3.283을 별도 설치한다. SDK와 Claude CLI는 APK에 포함하지 않으며 설정 스크립트가 기존 CLI를 교체하지 않는다.

Claude 어댑터/복구 복사 버튼은 별도 내장 `claude-adapter-setup.sh`/`claude-repair-setup.sh`를 인용된 here-document 명령으로 복사한다. `installer()`가 두 asset을 생성하며 수동 전체 설치기의 선택적 Claude 작업도 같은 `claude_setup()` 내용을 재사용한다. 두 독립 명령은 Downloads 파일·기존 설치 스크립트·브리지 설치 상태 없이 SDK/런타임만 준비하고 브리지를 시작·재시작하지 않는다. 생성 asset만 갱신하는 작업은 APK 빌드가 아니다. 검증은 `python3 -m unittest discover -s scripts/tests -p test_claude_setup.py -v`와 기존 Setup 회귀를 사용한다.

자바 8 바이트코드와 API 26 이상을 대상으로 빌드하고 target SDK는 36이다. 이는 빌드 설정이며, Android 8~15에서의 실제 실행 검증을 뜻하지 않는다. Gradle이나 Android Studio 빌드는 아직 구성하지 않았다.

## 브리지 개발 실행

```sh
python bridge/bibimer_bridge.py start
python bridge/bibimer_bridge.py pair
python bridge/bibimer_bridge.py status
# 작업 중인 세션을 종료한 뒤 브리지를 업데이트할 때만 실행
python bridge/bibimer_bridge.py restart
```

기본 상태 폴더는 `~/.local/state/bibimer/`다. 테스트용으로 `--state-dir`와 `--port`를 지정할 수 있으며, 현재 Android 앱은 `127.0.0.1:8765`에 고정되어 있다. `serve`는 포그라운드 실행용이고 `start`는 분리된 프로세스로 실행한다.

상태 폴더는 0700, 토큰 및 메타데이터 파일은 0600으로 만든다. 출력이나 입력 내용은 파일로 저장하지 않는다. 실제 세션을 검사할 때도 출력·계정 정보·연결 코드를 테스트 로그나 화면 캡처에 남기지 않는다.

CLI와 설정 스크립트는 영어가 기본이다. `BIBIMER_LANGUAGE=ko` 환경 변수로 한국어 안내를 선택할 수 있고 CLI는 `--language ko`도 지원한다. 앱 언어는 기기 언어와 독립적이며 `AppLanguage`가 Android 환경 설정에 저장하고 명시적 로캘로 네이티브 리소스를 읽는다. `values/strings.xml`이 영어 기본, `values-ko/strings.xml`이 한국어다.

## 검증 명령

```sh
python -m unittest discover -s bridge/tests -v
node --check bridge/provider_claude.mjs
node --check android/app/src/main/assets/app.js
node --check android/app/src/main/assets/select.js
node --check android/app/src/main/assets/i18n.js
node --check android/app/src/main/assets/conversation.js
node --check android/app/src/main/assets/rich-text.js
python -m py_compile bridge/bibimer_bridge.py bridge/provider_opencode.py scripts/build_apk.py
bash -n dist/bibimer-setup.sh
```

브리지 테스트의 Claude SDK 대역에는 Node.js가 필요하고, 화면 검증에는 Chromium도 필요하다. Android 앱 자체는 이 도구들을 사용하지 않지만 Claude Chat 어댑터는 Termux의 Node.js가 필요하다.

```sh
pkg install nodejs
npm install --prefix .tools/ui --ignore-scripts --no-fund --no-audit playwright-core@1.55.1
node scripts/smoke_ui.cjs
node scripts/smoke_github.cjs
node scripts/smoke_select.cjs
node scripts/smoke_library.cjs
node scripts/smoke_setup.cjs
node scripts/smoke_rendering.cjs
```

현재 기기에 설치된 Codex의 시작·재접속·종료까지 추가 확인하려면 `node scripts/smoke_ui.cjs --probe-codex`를 실행한다. 이 선택 검증은 Codex 설치가 필요하고 모델 작업은 전송하지 않는다. 기본 화면 테스트는 실제 셸과 통제된 Codex·OpenCode·Claude 프로토콜 대역으로 동작하며 에이전트 계정이나 모델 요청이 필요하지 않다. `--probe-codex`는 실제 Codex의 PTY 시작 및 App Server 대화 초기화·재접속·종료를 확인한다.

현재 기기에서는 기존 Termux X11 Chromium의 `headless_shell`을 사용했다. 다른 경로의 Chromium을 사용하려면 `BIBIMER_CHROMIUM`을 지정한다. Playwright의 플랫폼 검사에 맞춰 테스트 프로세스에서만 Android를 Linux로 식별하고, 실제 실행 파일은 Termux용 Chromium을 지정한다. 이는 Playwright나 앱의 Android 지원을 검증하는 방법이 아니다.

UI 테스트는 임시 폴더의 실제 브리지에 연결하며 Android 네이티브 API를 명시적인 테스트 어댑터로 대체한다. 한국어 브라우저 로캘에서도 영어로 시작하는지, 한국어 전환·저장값 복원, 오류 번역과 0.1.0 응답 호환, 언어 전환 시 세션·입력 유지까지 확인한다. 어댑터의 설정 저장은 브라우저 테스트용이며 실제 앱의 Android 환경 설정 저장을 검증한 것은 아니다. 화면 캡처는 통제된 셸 출력과 모의 대화만 포함하고 `dist/screenshots/*-en.png`, `*-ko.png`에 저장한다. 실제 앱의 Keystore, WebView 리소스 로딩, 기기 간 앱 격리 경계는 APK로 따로 확인해야 한다.

## 2026-10-05 응답 완료 알림 검증 (소스 반영 / APK·실기기 검증 대기)

- 브리지 **97개 테스트 통과**. `test_notifications.py` 신규 5개: 초기 기준/재시작/overflow/long poll, 연속 대기열 각각의 완료·중복 방지·본문 제외, 중단/실패/오래된 턴 제외, 프로젝트/보관/별칭/삭제, 인증·입력 검증과 PTY 제외. 기존 Claude/OpenCode 어댑터 대기열 테스트에도 정상 완료 수 검증을 추가했다. Setup 설치 payload 한계 검증도 통과했다.
- `node scripts/smoke_library.cjs` 통과. 알림 설정 토글·권한 차단/허용·Android 설정 버튼·구형 브리지·영어/한국어 320px, 새 페이지 및 실행 중 화면의 알림 세션 이동, Pause/Resume, 삭제된 대상 안내, 초안·승인·실행 프로세스 유지와 설정 저장을 확인했다. 프로젝트 관리/세션 사이드바 회귀도 포함한다.
- AAPT2 리소스 컴파일/링크와 javac 전체 소스 컴파일, JS 문법·diff 검사 통과. 서명·DEX 생성·APK 배포 파일 빌드는 하지 않았다. 로그: `.tools/tests-response-notifications.log`, `.tools/ui-notifications.log`, `.tools/java-notifications.log`. 화면: `dist/screenshots/notifications-320-en.png`, `notifications-320-ko.png`.
- Android 환경 설정·권한·NotificationManager·foreground service·실제 Activity PendingIntent는 기기에서 아직 검증하지 않았다. 다음 명시적 빌드 후 권한 거절/복구, 홈/잠금/최근 앱 제거, 앱이 닫힌 상태의 알림 탭, 여러 프로젝트의 연속 응답, 서비스 중지/재연결, Termux 종료/절전을 확인한다. 운영 브리지와 진행 중 세션은 변경하지 않았다.

## 2026-10-04 자동 설정·연결 검증 (소스 반영 / APK·실기기 검증 대기)

- `python -m unittest discover -s bridge/tests -p test_setup.py -v` **4개 통과**. PATH가 제한된 임시 환경에서 Python 부재→패키지 설치 대역·실패 안내를 확인하고, 생성 설치 payload의 셸 문법·Intent 크기 한도를 검증했다. 임시 서버에서 새 설치·기존 파일 미교체·설치 잠금·별도 데몬 시작·실제 1회 코드 교환·기존 토큰/세션/승인 보존을 확인했다. 테스트는 운영 상태 폴더를 사용하지 않는다.
- 자동 설정 UI와 기존 UI 전체 통합 통과. Termux 없음·최초 권한 안내·연동 명령 복사·중복 차단·진행 중 재로드·실패/재시도·수동 경로·자동 Work 이동·연결 정보 삭제, 영어/한국어와 320/360px를 확인했다. 기존 모델/에이전트 선택·Queue/Steer·멀티 프로젝트·가져오기·승인도 유지된다. Android API·콜백 상태는 브라우저 대역이므로 실제 권한/서비스 실행 검증을 의미하지 않는다.
- Android Java 소스를 API 36·`--release 8`로 컴파일했다. 빌드 스크립트의 installer 생성만 실행해 두 설치 asset을 점검했으며 APK를 생성하지 않았다. 최신 APK의 자산 목록에는 새 `quick-setup.sh`·`setup-connect.py`가 추가되어야 한다. 설치 스크립트만 생성하는 동작을 APK 빌드와 구분한다.
- 로그: `.tools/tests-quick-setup.log`, `.tools/ui-quick-setup.log`, `.tools/ui-setup-regression.log`, `.tools/java-quick-setup.log`. 화면: `dist/screenshots/quick-setup-320-ko.png`, `quick-setup-360-ko.png`.
- 현재 폰의 외부 앱 허용은 꺼진 상태로 유지했다. APK 설치 후 실제 RUN_COMMAND 권한, 외부 앱 설정, 비공개 PendingIntent 수신, 앱 프로세스 재생성, Keystore 저장과 새 사용자 전체 설치를 확인해야 한다. 계정 로그인·모델 작업·운영 세션 재시작은 수행하지 않았다.

## 2026-10-03 대기 메시지 Steer 검증 (소스 반영 / APK·브리지 적용 대기)

- 대기열 테스트 10개와 UI 전체 통합 검증을 통과했다. 새 검증은 선택 항목의 수락 후 제거·중복 억제·다른 항목 FIFO 순서·승인 유지, 거절·오래된 턴·다른 세션 접근·시간 초과·잘못된 턴 확인을 포함한다. 현재 턴이 수락 확인보다 먼저 끝나는 대역으로 자동 FIFO 전송과 Steer의 경합을 재현해 한 번만 전달되는지 확인했다. Claude·OpenCode의 대기열 Steer 거절도 확인한다.
- 화면 검증은 대기열 복원 후 Steer·입력창 초안 유지·거절 항목 보존·일시정지/재개·프로젝트 전환 중 늦은 결과 격리·미지원 브리지에서 버튼 숨김·응답 종료 후 비활성화를 포함한다. 360×460 한국어 화면을 직접 확인했다. 기존 모델·에이전트 전환, Settings·Enter/IME, 가져오기·승인 검증도 통과했다.
- 테스트 클라이언트의 4초 HTTP 제한이 서버의 Steer 확인 제한 4초와 경합하던 문제를 해결했다. 실제 앱과 같은 6초로 기다리고 실패 시에도 소켓을 닫는다. 수정 후 **전체 브리지 테스트 78개 통과**. 전체 결과는 `.tools/tests-queue-steer-all.log`, 대기열 검증은 `.tools/tests-queue-steer.log`, UI는 `.tools/ui-queue-steer.log`에 기록했다. 미리보기는 `dist/screenshots/queue-entry-steer-ko.png`다.
- 실제 모델 입력·APK 빌드·운영 브리지 재시작은 수행하지 않았다. 이번 변경은 기존 네이티브 Steer 프로토콜과 기존 HTTP 경로를 사용하며 Android Java 코드는 변경하지 않았다. 실제 WebView 터치와 모델 응답 반영은 다음 빌드 설치 후 검증한다.

## 2026-10-03 모델·추론 수준·에이전트 전환 검증 (소스 반영 / APK·브리지 적용 대기)

- Python 통합 **74개 통과**. `bridge/tests/test_models.py`의 7개 검증은 실제 모델 목록 형식·인증/입력 검증·잘못된 조합 차단, 세 제공자의 모델/effort/variant 전달, Codex 원래 모델 복원, PTY 인수와 OpenCode PTY 제한, 동시 목록 조회/실행 결과 공유, 프로젝트·에이전트별 실행/승인/대기열 격리와 메타데이터 이전을 다룬다. 기존 67개 검증도 통과했다.
- UI 통합·선택 컨트롤·렌더러 통과. 자체 시트 15개, 모델 변경 시 지원 수준 갱신, 마지막 선택 저장/재로드, Codex·Claude·OpenCode 간 전환 후 각 초안/대기열 복원과 독립 종료, 가져오기 모델·수준 선택과 한국어 표시를 확인했다. 기존 Settings·Enter/IME·멀티 프로젝트·권한/Fast·Queue/Steer·가져오기·승인 검증도 통과했다. Java는 빌드 스크립트와 같은 `javac --release 8 -classpath .tools/android-36.jar`로 소스 컴파일했으며 APK는 만들지 않았다.
- 실제 설치된 Codex 0.156.1, Claude SDK 0.3.283/CLI 2.1.283, OpenCode 1.17.13의 모델 목록과 수준을 조회했다. 실제 Codex는 외부 추론 요청 없이 로컬 HTTP 대역으로 두 모델·추론 선택의 네이티브 전달과 원래 모델 복원을 확인했다. 자체 검증 기록만 정리했으며 사용자 세션·운영 브리지는 변경하지 않았다.
- 로그: `.tools/tests-models-final.log`, `.tools/ui-models.log`, `.tools/select-models.log`, `.tools/render-models.log`, `.tools/java-models.log`, `.tools/native-model-selection.log`. 화면 예시: `dist/screenshots/select-model-en.png`, `select-effort-en.png`, `quick-settings-small-en.png`. 테스트 데이터만 포함한다.
- 마지막 APK와 운영 브리지는 **0.9.0**으로 유지한다. 현재 소스의 모델·전환 기능은 다음 명시적 빌드와 브리지 업데이트에 포함한다. 실제 WebView/Android 설정 저장·소프트 키보드와 실제 모델 응답·도구 동작은 설치 후 검증한다. OpenCode PTY는 자체 메뉴에서 추론 수준을 선택하고, Chat의 Agent default 모델 복원은 새 세션에서 진행한다.

## 2026-10-03 자체 선택 UI 검증 (소스 반영 / APK 빌드 대기)

- `select.js` 공통 컨트롤을 10개 선택 메뉴에 적용하고 Android WebView 자산 허용 목록에 추가했다. 기존 select는 값·변경 이벤트의 내부 모델로만 사용한다. `.value` 변경 뒤 `sync()`로 표시를 맞추고 옵션/비활성 변경도 감지한다. 열린 목록은 소유 프로젝트·세션 문맥을 확인한 뒤 선택을 적용한다.
- `node scripts/smoke_ui.cjs` 통과. 모든 메뉴를 실제 트리거·선택 행으로 조작하며 프로젝트 전환·권한/Fast·가져오기·세 제공자·Queue/Steer·Settings·영어/한국어를 확인했다. 취소/포커스 복원, 같은 항목 중복 저장 없음, 비활성 항목 차단, 저장 실패 복원, 상태 polling 중 선택/포커스 유지도 확인했다. 재연결 시 에이전트 목록이 같아도 인터페이스 지원 안내를 갱신하도록 수정했다.
- `node scripts/smoke_select.cjs` 통과. 120개 옵션·Unicode/긴 경로·HTML 문자 표시, 320×460에서 현재 행 스크롤·가로 넘침 없음, 키보드 이동/비활성 건너뛰기, 프로그램 값 동기화, 오래된 문맥/제거 항목 차단, 중첩 팝업 취소·선택·부모 닫힘을 확인했다.
- 기존 `smoke_rendering.cjs`와 Java 소스 컴파일 통과. 로그는 `.tools/ui-select.log`, `.tools/select-control.log`, `.tools/render-select.log`, 미리보기는 `dist/screenshots/select-*.png`다. APK 패키징·버전 변경·운영 브리지 재시작은 하지 않았다. 마지막 APK는 0.9.0/code 16이며 Android WebView 터치·뒤로 가기·TalkBack은 다음 빌드 설치 후 검증한다.

## 2026-10-02 0.9.0 APK 빌드 검증

- 명시적 빌드 요청으로 앱 0.9.0/code 16과 내장 브리지 0.9.0을 패키징했다. 이전 소스 검증을 마친 로고·Queue/Steer·Settings·Enter 동작 선택을 포함한다.
- APK v2/v3 서명·0.8.2 인증서 일치, 패키지·버전·BIBIMER 이름·min/target SDK, 내장 20개 asset과 원본 일치 및 새 `InputPreferences` DEX 포함을 확인했다.
- 설치 스크립트 문법·격리된 임시 폴더의 네 소스 추출/체크섬/0700 권한, `dist`와 Download 복사본 SHA-256 일치를 확인했다. 배포 파일은 `Download/Bibimer-0.9.0.apk`(309,402바이트)와 `Download/bibimer-setup-0.9.0.sh`다.
- 운영 브리지 0.8.1·실행 세션 1개는 유지했다. 실제 APK 설치·Android 키보드/설정 보관·모델 동작은 별도 검증이다. Queue·Steer 사용에는 브리지 0.9.0 설치·재시작이 필요하다.

## 2026-10-02 Settings·Enter 동작 검증 (소스 반영 / 빌드 대기)

- 별도 Settings와 언어 선택 이동, Enter 기본 줄바꿈·보내기 선택 및 저장 실패 시 이전 선택 유지를 구현했다. `InputPreferences`의 Android 저장값은 `newline`/`send`만 허용하며 기본값은 `newline`이다. 인증·프로젝트·세션과 독립적이다.
- `node scripts/smoke_ui.cjs` 통과. 연결 전 설정, 영어/한국어, 두 선택의 재로드 복원, PTY·Chat 선택 영역 줄바꿈, IME 보호, 설정 왕복 후 초안·실행 세션 유지, 응답 중 Enter 오전송 없음과 Queue 버튼·보내기 선택 후 Enter 추가를 검증했다. 기존 멀티 프로젝트·가져오기·세 제공자·승인·대기열·Steer 검증도 통과했다.
- 기존 렌더러 검증 통과. 320/360/393×460 Settings에서 가로 넘침 없이 두 선택 메뉴와 하단 내비게이션이 표시되고, 저장값 누락·알 수 없는 값은 줄바꿈으로 처리되는지 추가 확인했다.
- Android API 36 jar와 기존 생성 R.java를 이용한 Java 소스 컴파일 통과. APK 패키징·빌드·설치, 운영 브리지 재시작은 하지 않았다. 브라우저 설정 저장은 네이티브 API 대역이므로 실제 Android SharedPreferences·WebView·소프트 키보드/IME 검증은 다음 요청 빌드 후 필요하다.

## 2026-10-01 Queue·Steer 검증 (소스 반영 / 빌드 대기)

- Python 통합 67개 통과. 대기열 FIFO·취소·용량·중복·프로젝트 격리·승인 보존·실패/중단 후 재개·내용 미저장·Claude/OpenCode 연속 실행과 Codex Steer 응답 확인·거절·시간 초과 검증 포함. 최종 대기열 테스트 6개로 응답 유실 후 후속 작업 재개도 확인했다.
- UI 통합·렌더러 검증 통과. Project Add·Full Access 표기, 응답 중 Enter→Queue, 프로젝트 왕복·앱 재로드 후 대기 복원, 취소·재개, 거절된 Steer 초안 유지, 이전 브리지 안내, 영어/한국어와 360×460의 입력/내비게이션 배치를 확인했다. Android 네이티브 연결은 브라우저 대역이다.
- 실제 Codex 0.156.1은 통제된 로컬 HTTP 응답 대역을 사용했다. 외부 모델 호출 없이 같은 턴 Steer 수락·중복 억제와 Queue 대기·interrupt 후 일시정지·취소를 확인했다. 실제 모델의 지시 반영과 Android WebView·키보드는 별도 검증이다.
- 사용자 요청에 따라 APK를 빌드하지 않았고 운영 브리지·사용자 세션도 변경하지 않았다. 배포 파일은 계속 0.8.2이며 새 기능은 다음 요청 빌드에 포함한다.

## 2026-10-01 검증 결과 (0.8.1)

- Python 통합 테스트 60개와 UI·렌더러 검증 통과. 입력창 아래 직접 권한/Fast 변경, 대기 승인 보존, 다음 입력 적용, 기본 정책 복원, 재로드/프로젝트별 격리와 기존 기능을 확인했다. 360×460에서도 하단 컨트롤이 입력창과 내비게이션 사이에 표시된다.
- 실제 Codex의 설정 변경 알림으로 YOLO→읽기→프로젝트 쓰기→기본값 복원을 확인했다. 로컬 HTTP 대역만 사용해 실제 모델 호출 없이 네이티브 정책과 Fast 설정 전달·저장/재개를 검증했다. 실제 모델 도구 실행은 별도 검증이다. OpenCode 기본값 복원 제약은 [1.17.13 세션 PATCH 구현](https://github.com/anomalyco/opencode/blob/v1.17.13/packages/opencode/src/server/routes/instance/httpapi/handlers/session.ts)의 기존 규칙 병합을 기준으로 확인했다.
- 0.8.1/code 14 APK 빌드·서명·이전 인증서 일치·내장 파일·설치 추출 검증 완료. `Download/Bibimer-0.8.1.apk`와 설정 파일을 준비했다.
- 운영 브리지 0.8.1 적용. 아직 입력하지 않은 준비 상태의 빈 Codex 세션만 같은 프로젝트·설정으로 다시 열고 인증·프로젝트를 유지했다. 앱은 마지막 확인 기준 0.8.0/code 13이어서 새 APK 설치가 필요하다. Android 실기기 조작 검증은 남는다.

## 2026-10-01 검증 결과 (0.8.0)

- Python 통합 테스트 58개 통과. 권한·속도의 새/원본/복사 매핑, 잘못된 설정 거절, PTY argv/환경, Fast on/off·중복 처리·다른 프로젝트 격리 포함.
- UI 및 기존 응답 렌더러 테스트 통과. Android 설정 저장 API의 브라우저 대역을 통해 마지막 선택/재로드/에이전트 분리, 가져오기, 실행 중 권한 잠금·Fast 전환, 영어·한국어와 360×460 설정 팝업을 확인했다. 실제 Android 저장 검증과 구분한다.
- 실제 Codex App Server 설정 수락과 로컬 HTTP 대역의 Fast on/off tier 전달을 확인했다. 실제 Claude SDK bypass 초기화, OpenCode 새/원본/복사 permission 규칙도 확인했다. 실제 모델 작업은 보내지 않았다.
- 0.8.0/versionCode 13 빌드, v2/v3 서명 및 이전 인증서 일치, APK 내장 UI·설치 스크립트·네 소스와 격리 설치/0700 권한 검증. 배포: `Download/Bibimer-0.8.0.apk`, `Download/bibimer-setup-0.8.0.sh`.
- 사용자 재시작 요청 후 실제 앱 0.8.0/code 13과 운영 브리지 0.8.0 적용 확인. 실행 세션 0개에서 표시 기록 65개를 비공개 보존한 뒤 재시작했고 기존 인증·프로젝트 3개·이전 세션 상태 조회 및 새 기능 플래그가 유지됨을 확인했다. 모델 도구 정책·Fast 계정별 제공·Android 실기기 UI/저장 검증은 남는다.
- 근거: [Codex App Server](https://learn.chatgpt.com/docs/app-server), [Codex Fast](https://learn.chatgpt.com/docs/agent-configuration/speed), [Claude 권한](https://code.claude.com/docs/en/permissions), 설치된 Claude SDK `sdk.d.ts`, [OpenCode 권한](https://opencode.ai/docs/permissions/), [OpenCode CLI 환경 변수](https://opencode.ai/docs/cli/)와 설치된 서버 `/doc` 스키마.

## 2026-10-01 검증 결과 (0.7.0)

- Codex 저장 통합: 실제 Codex 0.156.1과 임시 프로젝트·로컬 HTTP 오류 대역으로 첫 사용자 턴을 생성했다. 외부 모델 요청 없이 기본 세션 목록 노출, `ephemeral: false`, 프로세스 종료 후 같은 ID와 사용자 입력 복원을 확인했다. 테스트에서 만든 기록만 보관 처리했다.
- Claude 복구: 기존 앱 세션에서 남긴 변경 사항을 이어받아 공식 2.1.283 실행 파일을 전용 폴더에 설치했다. 설치된 glibc를 사용하는 현재 arm64 Termux에서 버전, 실제 SDK 초기화, Bibimer Chat 준비 및 PTY 출력을 확인했다. 실제 모델 요청은 보내지 않았다.
- 브리지 테스트 **53개 통과**. UI 통합·렌더러 검증 통과. 브리지 회귀 검증은 저장소 공유·브리지 재시작 후 같은 세션 재개와 복구 런처 선택·무결성 오류·실행 실패 시 기존 파일 보존을 포함한다. UI 검증은 원본 이어하기 기본값, 명시적 복사, CLI 명령 복사, 이전 브리지의 새 Codex Chat 차단을 포함한다.
- APK 0.7.0 / versionCode 12 빌드·v2/v3 서명 통과. 내장 UI·설정 스크립트와 네 소스(브리지·두 어댑터·Claude 복구 도구) 일치, 격리 설치 추출과 0700 권한을 확인했다. 설치 파일은 `Download/Bibimer-0.7.0.apk`다.
- 현재 설치 앱은 0.6.1 / code 10. 이전 앱 세션의 남은 표시 기록은 저장소 밖에 비공개 보존했다. 운영 브리지 재시작은 이 세션을 마친 뒤 진행해야 하며 실제 Android 화면·키보드·모델 응답 검증은 남는다.

## 2026-09-28 검증 결과

0.6.1은 입력창 아래 마진만 조정했다. 기존 렌더러·모바일 레이아웃 검증과 APK 빌드·서명·CSS/JS 포함 검증을 다시 수행했다. 아래 브리지·에이전트 검증은 0.6.0 결과이며 브리지 코드는 변경하지 않았다.

| 항목 | 결과 |
| --- | --- |
| 현재 환경 | Android 16 / API 36 / arm64, Termux 0.118.3 F-Droid, Python 3.14.6, OpenJDK 21 |
| APK 빌드 | 0.6.1 / versionCode 10 성공, 영어·한국어 리소스 포함 및 APK v2/v3 서명 검증 통과, 기존 서명 인증서 일치 |
| 브리지 테스트 | 48개 통과: 기존 45개와 OpenCode·Claude의 새 대화·가져오기·프로젝트 경로 검증·자동 승인 없음·명시적 승인/거절·복수 선택 질문·중복 응답·중단·CLI/SDK 오류 검증 3개 추가 |
| 화면 + 실제 브리지 | 영어·한국어 안내, 언어 전환 시 세션·입력 유지, 오류 번역·기존 브리지 호환, 코드 연결·프로젝트 생성·한글 입출력·재접속·명시적 종료, Markdown·표·코드·복사, 승인 복구·거절·질문, HTML 비실행, 응답 중단, PTY/Chat 종료 후 브리지 재시작·Start session 활성 유지·새 Chat 시작 통과 |
| 폴더 탐색 | 실제 임시 브리지·폴더로 기존 프로젝트 등록, 홈 대체·상위 이동·숨김·100개 단위 목록·빈 폴더·접근 오류·재시도·취소·지연 응답 분리, 이전 브리지 안내, 영어·한국어 검증 통과 |
| 세션 가져오기 | 임시 브리지·세 에이전트 대역으로 에이전트 선택·검색·페이지·오류·제목 HTML 비실행·복사 기본값·기록 서식·자동 실행/승인 없음·후속 입력·닫은 창의 늦은 응답 분리·영어/한국어 검증 통과 |
| 새 에이전트 대화 | OpenCode·Claude 대역의 새 Chat, 재접속 후 에이전트·승인 유지, 복수 선택 초안·프로젝트/언어 전환, 360×460 질문 제출, 명시적 종료 및 OpenCode PTY 입력 통과 |
| 응답 렌더러 | GFM 중첩·체크리스트·표·링크, 코드 강조·복사·줄바꿈, 파일 diff·줄 번호·계획, 스트리밍/스크롤 유지·접기 상태, HTML 비실행·이미지 자동 요청 없음 검증 통과 |
| 아이콘 | 새 B 벡터·SVG, 적응형/테마 아이콘 리소스 포함·컴파일, 브라우저 크기별 미리보기 확인. 실제 런처는 미검증 |
| 작은 화면 | 393×780과 360×460에서 세션 가져오기·대화·PTY 전송·질문 응답·폴더 선택 버튼 확인. 언어 변경 시 일반 입력·질문 답변 유지 |
| 프로젝트 전환 | 두 프로젝트 동시 실행, 초안 복원, 지연된 전송 응답 분리, 다른 프로젝트 실행 유지, 승인·질문 대기 복구 통과 |
| 입력 키 | Enter 전송, Shift/Ctrl/Meta+Enter 줄바꿈, 선택 영역 치환, 합성 IME·키 반복·응답 중 전송 방지 통과. 실제 Android 키보드 입력은 미검증 |
| PTY 표시 | 실제 PTY → xterm에서 ANSI 16색·256색·RGB 트루컬러·굵기 및 ASCII 도형 확인 |
| 설치된 Codex | PTY 시작 및 App Server 대화 초기화·재접속·명시적 종료 확인. 모델 요청·실제 코드 수정은 수행하지 않음 |
| 실제 OpenCode | 1.17.13: 새 Chat 초기화·목록·복사·원본 이어하기·통제된 기록 표시·PTY 시작·재접속·명시적 종료 확인. 모델 요청 없음 |
| 실제 Claude SDK | 0.3.283: 격리한 설정 폴더의 통제된 기록 조회·읽기·복사, 원본 유지 확인. 현재 설치 CLI는 네이티브 실행 파일 누락으로 실행 실패, 실제 모델 대화 미검증 |
| 설정 파일 | APK asset·별도 설치 파일·브리지/두 어댑터 원본 일치, 셸 문법 및 격리된 설치 추출·체크섬·0700 권한 검증 통과 |
| Android 설치 | 앱 0.4.0(versionCode 7) 설치 확인. 실행 세션 0개 확인 후 브리지 0.6.0 적용, 토큰·전체 프로젝트 설정 유지와 운영 세 에이전트 목록 API 확인. 최신 APK는 `Download/Bibimer-0.6.1.apk`; APK 업데이트·실제 화면 확인은 남음 |
| 새 사용자 준비 | 설치 가이드·설정 파일 생성 구현. Termux·Python이 없는 기기의 전체 과정은 미검증 |

현재 설치된 CLI는 `codex-cli 0.156.1`이다. 0.5.0 작업에서는 현재 프로젝트의 읽기 전용 목록·항목 조회와 별도로 만든 통제된 테스트 기록의 복사·원본 이어하기를 실제 App Server로 확인했다. 테스트 기록 생성·주입은 모델 턴을 시작하지 않았으며 사용자 기록은 이어가거나 변경하지 않았다. 이전 PTY·Chat 초기화 검증의 패키지는 `@mmmbuto/codex-cli-termux` 0.153.3이었다. 일반 Codex 배포본이나 Claude Code의 Android 동작을 확인한 것으로 확대하지 않는다.

0.6.0에서는 OpenCode의 전용 테스트 폴더에 세션을 만들고 공개 API의 `noReply` 입력으로 통제된 기록을 주입했다. 실제 어댑터의 새 세션·fork·resume·history를 확인한 뒤 이번 검증에서 생성한 세션만 삭제했다. Claude SDK는 임시 `CLAUDE_CONFIG_DIR` 안의 합성 기록으로 SDK 파일 API를 검증했다. 두 검증 모두 사용자 대화·자격 증명을 출력하거나 실제 모델 작업을 실행하지 않았다. Claude의 실제 CLI 실행과 세 에이전트의 실제 모델 응답·도구·승인은 별도 검증이 남는다.

## 공식 문서 확인 근거

응답 렌더러·아이콘의 설계와 Marked/highlight.js·Android 적응형 아이콘 근거는 [화면 설계](interface.md)에 기록했다.

- [Android 앱 샌드박스](https://source.android.com/docs/security/app-sandbox): 앱마다 UID·권한을 분리하므로 앱이 Termux 전용 데이터를 직접 읽는 것으로 가정하지 않는다. 폴더 목록은 인증된 로컬 브리지가 Termux 권한으로 읽는다. 이 경계의 실제 WebView 동작은 APK로 별도 확인한다.

- [MDN keydown과 IME](https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event#keydown_events_with_ime): 조합 시작·종료 경계에서는 `isComposing`과 IME 키 코드 229를 함께 확인한다. 구현은 브라우저 합성 이벤트로 확인했으며 기기의 실제 조합 동작은 별도 검증한다.
- [MDN enterkeyhint](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/enterkeyhint): 공통 입력창의 가상 키보드 동작 힌트는 기본 `enter`이며 보내기 설정을 선택하면 `send`로 바뀐다. 표시 방식은 키보드와 사용자 언어에 따라 달라질 수 있다.
- [Termux RUN_COMMAND Intent](https://github.com/termux/termux-app/wiki/RUN_COMMAND-Intent): 외부 실행에는 별도 권한과 `allow-external-apps` 설정이 필요하다. 첫 버전은 수동 설정 파일 실행을 사용하며 해당 권한을 요구하지 않는다.
- [Android 앱 내 콘텐츠 로드](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content): 앱에 포함한 리소스를 사용한다. 이 구현은 허용 목록의 리소스만 `shouldInterceptRequest`로 제공한다.
- [Android WebView 네이티브 브리지](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges): 외부 콘텐츠가 JavaScript 인터페이스에 접근하지 못하도록 탐색·파일 접근·외부 리소스를 차단한다.
- [Android 네트워크 보안 설정](https://developer.android.com/privacy-and-security/security-config): 일반 cleartext를 차단하고 `127.0.0.1`에만 예외를 둔다.
- [Android 로컬 네트워크 권한](https://developer.android.com/privacy-and-security/local-network-permission): OS·target SDK에 따른 권한 변화는 향후 기기 검증에 포함한다.
- [Termux 공식 저장소](https://github.com/termux/termux-app): Android의 프로세스 제한 및 설치 배포처 안내를 확인했다. 화면 잠금·백그라운드 생존은 별도 실기기 검증 항목이다.
- [xterm.js API](https://xtermjs.org/docs/api/terminal/classes/terminal/): 터미널 입출력과 크기 변경에 사용한다. 의존성의 MIT 라이선스를 APK의 vendor assets에 포함한다.
- [Android 지역화](https://developer.android.com/guide/topics/resources/localization), [문자열 리소스](https://developer.android.com/guide/topics/resources/string-resource), [로캘을 지정한 Context](https://developer.android.com/reference/android/content/Context#createConfigurationContext(android.content.res.Configuration)): 영어 기본 리소스·한국어 대체 리소스를 제공하고 앱에서 선택한 언어로 네이티브 안내를 읽는다.

- [Codex App Server](https://learn.chatgpt.com/docs/app-server): stdio의 초기화·스레드·턴·항목·승인·질문 이벤트에 사용한다. 설치된 CLI에서 생성한 JSON 스키마로 실제 필드도 확인했다. 스키마 캐시는 `.tools/`에만 둔다.
- [Paseo 제공자 구조](https://github.com/getpaseo/paseo/blob/main/docs/providers.md): 에이전트별 구조화된 연결을 공통 대화 화면으로 제공하는 방식의 참고 자료다.
- [xterm.js 터미널 시퀀스](https://xtermjs.org/docs/api/vtfeatures/): SGR 색상·문자 속성 등 PTY 렌더링 근거다.
- [Android Bionic pidfd 헤더](https://android.googlesource.com/platform/bionic/+/refs/heads/main/libc/include/sys/pidfd.h): Android API 31에 추가된 libc 래퍼를 확인했다. 현재 Termux Python에서 직접 노출하지 않는 pidfd는 공개 libc 래퍼로 호출하고, 실제 테스트용 프로세스에 한정해 종료를 검증했다. 지원하지 않는 기기에서는 이전 버전 브리지 자동 종료를 거부한다.

## 2026-10-09 GitHub 프로젝트 가져오기 검증 (소스 / APK 대기)

- `bridge/tests/test_github.py`: 인증·Origin 제한, CLI 상태/저장소 필드 제한과 페이지 분할, 코드만 전달하는 로그인·취소, 실제 로컬 Git 클론·중복 요청·등록·현재 세션 유지, 재시작 작업 기록, 기존 폴더/파일/링크 및 잘못된 경로 거절, 실패/취소 파일 보존, Git 명령·환경 제한, 설치 누락·오류 원문 비노출, 저장 실패 뒤 멈춘 작업 방지를 검사한다.
- `node scripts/smoke_github.cjs`: 격리 브리지·gh 대역·실제 로컬 Git으로 앱의 코드 로그인·목록/검색·폴더 선택·클론/등록·응답 유실 재시도·기존 입력/프로세스 보존·실패/취소·재접속·영어/한국어·320px·구형 브리지·CLI 설치 안내를 검증한다. 사용자의 인증 설정이나 원격 저장소는 변경하지 않는다.
- 전체 브리지 **131개 통과**, 저장 실패 처리 보완 후 GitHub 전용 **9개 통과**. 기존 `smoke_ui.cjs` 전체 회귀, Java API 36 소스 컴파일(기존 생성 R.java 포함)도 통과했다. 최초 GitHub UI 검사의 한국어 연결 문구 기대값을 실제 `기기 연결됨`으로 수정했다.
- 같은 폰의 실제 `gh 2.97.0`로 활성 인증·저장소 필드 제한을 확인하고, 공개 `octocat/Hello-World`를 임시 Termux 경로에 HTTPS 클론해 등록·token 없는 origin을 확인했다. 개인 계정명·비공개 저장소 이름·토큰은 결과 로그에 출력하지 않았다. 추가로 현재 프로젝트의 실제 비공개 원격 저장소를 별도 임시 폴더에 클론해 GitHub CLI 인증 도우미와 등록을 확인했다. 새 브라우저 로그인·조직 SSO는 검증하지 않았다.
- 로그: `.tools/test-github.log`, `.tools/github-ui.log`, `.tools/github-ui-regression.log`, `.tools/github-bridge-regression.log`, `.tools/github-native.log`, `.tools/github-private-native.log`, `.tools/github-java.log`. 화면은 `dist/screenshots/github-import-en.png`, `github-import-ko-320.png`이며 브라우저 대역 화면이다.
- APK·운영 브리지는 변경하지 않았다. 실제 Android 브라우저 복귀·IME·장시간 백그라운드는 다음 빌드/설치 뒤 확인한다. 구현은 앱 assets·기존 브리지 단일 파일에 포함되므로 기존 패키징 경로에 따라 다음 빌드에 반영된다.


### 파일 링크 열기 검증

```sh
python -m unittest discover -s bridge/tests -p test_file_links.py -v
node scripts/smoke_file_links.cjs
node scripts/smoke_rendering.cjs
```

파일 링크 UI 테스트는 격리된 실제 브리지와 임시 Git 워크트리를 사용하며 Android 전송·뷰어 부분은 대역이다. APK 빌드 없이 AAPT2 리소스와 Java 컴파일을 확인할 수 있다. 실제 ContentProvider 읽기 권한·갤러리/PDF/텍스트 앱 실행·기본 앱 선택·복귀·백그라운드 취소는 다음 APK 설치 후 별도 확인한다.

## 앱에서 브리지 유지보수 검증 (미배포)

`installer()`는 `bridge/maintain_bridge.py`와 현재 브리지/어댑터 payload를 `bridge-maintenance.py` asset으로 생성한다. 생성 파일은 저장소에서 제외하고 WebView 허용 목록에도 넣지 않는다. APK 빌드 없이 `PYTHONPATH=scripts python3 -c 'import build_apk; build_apk.installer()'`로 갱신할 수 있다. 앱/브리지 버전 변경은 이번 구현에 포함하지 않았다.

검증 명령은 `PYTHONPATH=bridge/tests python3 -m unittest test_maintenance -v`, `python3 -m unittest discover -s scripts/tests -p test_bridge_maintenance.py -v`, `node scripts/smoke_bridge_maintenance.cjs`다. 실제 격리 서버·모의 Codex의 저장/재개, 이전 파일 복구, 실행 중 차단과 Android JVM 대역의 권한/고정 명령/결과 코드, 10언어320px UI를 확인한다. 운영 브리지·사용자 인증·모델은 사용하지 않는다. 실제 Android RUN_COMMAND·권한·결과 콜백과 앱 복귀는 다음 요청 빌드/설치 후 확인한다. 공식 연동 계약은 [Termux RUN_COMMAND](https://github.com/termux/termux-app/wiki/RUN_COMMAND-Intent)를 따른다.
