# Bibimer 웹사이트

## 웹사이트 스크린샷 8장 배포 완료 (2026-11-11)

- Pages `https://55a03134.bibimer.pages.dev`에 최신 UI 예제 화면 8장(한국어/영어 각 대화·프로젝트·파일 탐색·코드 보기)을 게시했다. 공개 10개 홈과 8개 새 이미지 HTTP200·원본 바이트 일치, GET 문의 API 405 유지와 공개 한국어 갤러리의 새 화면을 확인했다. 기존 Functions 번들을 함께 유지하며 실제 문의/모델 요청·앱 빌드·스토어 변경은 하지 않았다.
- 현재 Android 공통 UI를 관리 Firefox에서 예제 데이터로 렌더링해 캡처한 405×720 화면이다. 실제 Android/iOS 기기 촬영은 아니며 개인 세션/대화는 사용하지 않았다. 구형 하단 탭을 제거하고 상단 설정·음성 입력·우측 하단 답변 재생/복사·프로젝트 추가 단독 푸터를 보여준다. 캡처 출처·해시는 `release/website/screenshots.json`, 원본/미리보기/공개 증빙과 public-verification.json은 `dist/website-screenshots-20261111/`에 보관했다.
- 날짜가 있는 새 이미지 경로로 10언어 갤러리와 대표 이미지/확대 링크를 바꿨고, 이전 이미지 파일은 기존 캐시/링크를 위해 유지한다. 기존 Android 예시 표기는 유지하며 iOS용 화면을 생성했다고 표시하지 않는다. 구조 Python2개·언어 선택 Node·diff 검사 통과, 게시 소스 `0a8cd7a`. 아래 준비 기록은 이번 배포 이전 상태다.


## 웹사이트 최신 UI 스크린샷 갱신 (2026-11-11, 배포 준비)

- 사용자 요청으로 기존 구버전 하단 탭/상단 복사 화면을 현재 공통 Android UI로 교체한다. 한국어/영어 대화·프로젝트/워크트리/세션·파일 탐색·TypeScript 코드 보기 8장을 405×720으로 새로 캡처했다. 응답 우측 하단 재생/복사·상단 설정·음성 입력·프로젝트 추가 단독 푸터를 포함한다. 10언어 홈 갤러리 및 대표 대화 이미지의 링크/src를 새 날짜 주소로 변경해 캐시를 구분하며 이전 이미지 파일은 유지한다.
- 연결된 촬영용 ADB 기기가 없어 실제 Android 기기 촬영으로 표시하지 않는다. 관리 Firefox에서 현행 앱 자산/컴포넌트를 사용한 예제 프로토콜 화면을 캡처하고 브라우저 외곽만 잘랐다. 개인 프로젝트·실제 대화·인증·모델 요청·AI 이미지 생성은 사용하지 않았다. 촬영 정보/해시는 `release/website/screenshots.json`, 원본 화면과 갤러리 확인은 `dist/website-screenshots-20261111/`에 보존한다. 실제 iOS 기기 스크린샷을 만든 것은 아니며 공개 갤러리의 Android 표기를 유지한다.
- 웹 구조 Python2개·언어 선택 Node·diff 검사를 통과했다. 기존 Pages/Functions 구성으로 게시하고 공개 이미지·홈의 원본 일치를 확인한다. 앱/스토어·정책·문의 API/DB는 변경하지 않는다.


## 웹사이트 iOS 곧 출시 안내 배포 완료 (2026-11-11)

- Cloudflare Pages `https://39b61fee.bibimer.pages.dev`에 게시했다. 10언어 홈/가이드/문의 30개와 새 `platforms.css`까지 공개 `bibimer.app`의 31개 리소스 HTTP200·원본 바이트 일치를 확인했다. GET `/api/contact`의 기존 405 응답과 Functions 번들 업로드를 확인했으며 실제 문의는 전송하지 않았다. 공개 한국어 화면에서도 iOS 곧 출시와 Android/내장 Linux 차이를 확인했다.
- 10언어 메인 소개·SEO를 스마트폰 기반 ADE로 바꾸고 Android는 현재 Google Play, iOS는 출시 예정으로 구분했다. Android의 같은 폰 Termux/Android8+ 조건과 이름 유래를 유지하고 iOS의 앱 내장 Linux 환경을 안내한다. 날짜/가상 App Store 링크/공개 TestFlight 초대는 추가하지 않았다. 현재 가이드/도식/스크린샷은 Android용임을 표시하고 문의 푸터의 Android 전용 소개도 중립화했다. 정책·문의 API/DB·정리 Worker·앱 버전은 변경하지 않았다.
- Python 웹 구조2개·Node 언어 선택·diff 검사 통과. 실제 관리 Firefox에서 한국어/영어 데스크톱 및320px 한국어/393px 영어의 모바일 소개/플랫폼 카드 줄바꿈을 확인했다. 증빙 `dist/website-ios-coming-soon/`의 mobile-hero/mobile-platforms/public-ko-hero/public-ko-platforms.png와 public-verification.json, 배포 로그 `.tools/website-platforms-deploy.log`다. 기존 API 토큰 대신 갱신된 Wrangler OAuth와 설치된 Android esbuild를 사용했고 키·토큰을 소스/콘솔에 넣지 않았다.
- 동기화 중 원격 iOS7 배포/재연결 수정2커밋(`42d063a`)을 발견해 모두 보존하고 웹사이트 변경을 그 위에 재적용했다. 게시 소스는 `f98cec6`이다. 아래 배포 준비 기록은 당시 상태이며 이번 게시로 완료됐다.


## 웹사이트 iOS 출시 예정·플랫폼 설명 (2026-11-11, 배포 준비)

- 사용자 요청으로 10개 언어 홈의 소개/SEO를 스마트폰 기반 ADE로 바꾸고 Android는 Google Play 제공 중, iOS는 곧 출시로 구분했다. Android는 같은 기기의 Termux, iOS는 앱 내장 Linux 환경이라는 차이를 별도 카드로 안내한다. 출시 날짜·App Store 링크·공개 TestFlight 초대는 임의로 추가하지 않았다.
- 기존 Android 구성도·앱 스크린샷은 Android 예시임을 표시하고 공통 기능 소개에서 Android 전용 표현을 줄였다. Android 설치 조건·Termux 안내와 이름 유래는 유지한다. 10개 가이드에 Android/Termux용 안내임을 명시했고 문의 페이지 푸터/원본 JSON의 Android 전용 소개도 일반 모바일 소개로 바꿨다. 개인정보처리방침·문의 API/DB/정리 Worker·앱 빌드는 변경하지 않았다.
- 웹사이트 구조 Python2개·언어 선택 Node·diff 검사 통과. 관리 Firefox의 한국어/영어 데스크톱과 320px 한국어/393px 영어 화면에서 새 안내/플랫폼 카드와 줄바꿈을 확인했다(`dist/website-ios-coming-soon/`). 기존 Cloudflare API 토큰은 유효하지 않아 사용하지 않았고 기존 Wrangler OAuth 로그인 갱신으로 인증을 확인했다. 기존 Pages 프로젝트/Functions/D1 binding을 유지해 게시한 뒤 공개 원본을 확인한다.


## 음성 기능 개인정보 안내 반영 (2026-11-04)

Android0.37.0 내부 테스트 준비에 맞춰 공개10언어 정책에 선택적 STT 오디오 전송(OpenAI/ElevenLabs), TTS 텍스트 전송(ElevenLabs)/Android 엔진 네트워크 가능성, 기본 꺼짐, 별도 API 키의 Keystore 암호화·삭제, 앱 전용 녹음/재생 임시 파일 정리와 기기 내 핵심 문장 요약을 추가했다. 다른 정책·문의 API/DB/Worker는 변경하지 않았다. 정책 시행일은11월4일로 갱신했고 기존 문의 보관/정리 기준일11월3일은 유지했다.

Pages `https://acdb8851.bibimer.pages.dev` 배포 완료. 공개10개 정책 페이지의 HTTP200·원본 바이트 일치·voice-privacy 고지를 확인했다(`dist/play-0.37.0/policy-verification.json`). 웹 구조2개·언어 선택·diff 검사가 통과했다. 사용자 음성·실제 문의 전송이나 DB 변경은 없다.

## 문의 유형의 개인정보·데이터 항목 제거 (2026-11-03)

사용자 요청으로 10개 언어 문의 유형에서 개인정보·데이터를 제거했다. 오류 제보·설치/연결 도움·기능 제안·기타만 제공하고 공개 정책의 문의 링크도 일반 문의로 변경했다. API의 새 접수 허용 목록에서도 제거했으며 기존 문의 기록과 DB 스키마는 유지한다. 웹사이트 구조·언어·실제 SQLite 기반 문의 API 검사를 통과했다. 브라우저 smoke의 사전 선택 fixture를 설치/연결로 바꿨으며 해당 headless 검사는 실행하지 않았다. Pages `https://9a281176.bibimer.pages.dev` 배포 후 공개 방침/문의 20개 페이지 원본 일치·유형 4개·이전 유형 링크 제거를 확인했다(`dist/privacy-category-removal/public-verification.json`). 실제 문의 전송·앱 빌드는 하지 않았다.

## 개인정보처리방침·문의 안내 배포 (2026-11-03)

Pages `https://7a39fe77.bibimer.pages.dev`에 10개 언어 방침과 문의 양식을 배포했다. 시행일은 2026-11-03이다. 본문 개인정보 입력 금지, 답변용 선택 이메일, 문의 DB 접수 후 90일 정기 삭제를 명시했다. 지원 알림의 11-03 이후 접수분 정리·실패 재시도·이전/미추적 알림의 별도 정리 한계와 직접 이메일의 필요 기간 보관을 구분한다. 큰 데이터 삭제 요청 절차는 기기별 삭제 방법과 문의 정보 보관 안내로 간소화했다. 표시 문구의 Discord 브랜드는 제거했으며 외부 처리 고지와 해당 서비스 정책 링크는 유지한다.

공개 20개 방침/문의 페이지가 원본과 일치함을 확인했다. 웹사이트 구조·언어 검사와 문의 생성 재현을 통과했다. API·Worker·비밀 설정은 변경하지 않았고 실제 문의 전송이나 만료 메시지 삭제 검증을 추가 수행하지 않았다. 아래의 정책 미갱신 기록은 이번 배포로 대체된다.

## 브라우저 로그인·제어 허용 공통 안내 (2026-11-03)

10개언어guide에Termux:X11직접로그인후Bibimer작업화면의제어요청카드에서허용하는절차를추가했다. 카드없는설치본은하단설정 → Firefox · Termux:X11 → 로그인및에이전트제어경로를안내한다. 새카드는앱/브리지업데이트가필요한미빌드소스이므로현재사용자에게는기존설정경로도함께제공한다. Pages `https://5f43f82e.bibimer.pages.dev`에배포했고공개10개가이드의원본일치와새안내포함을확인했다. 문의/개인정보정책·웹훅·보관작업은변경하지않았다.


## 공개 웹사이트의 정보 범위 (2026-10-21)

홈은 현재 제품 소개와 주요 기능·설치·문의 경로를 안내한다. 별도 업데이트 소식이나 버전·내부 테스트·정식 심사 상태는 싣지 않는다. 버전별 변경은 Play 출시 노트에서 안내하고, 웹사이트는 실제 기능이나 사용 흐름이 달라질 때 해당 설명만 갱신한다.

10개 언어 홈의 버전 공지를 삭제하고, 가이드의 버전별 추가 기능·수정 이력·상태 문구는 일반 사용법으로 바꿨다. 워크트리·Steer·대기열·입력 키·브리지 유지보수의 필요한 사용법은 유지한다. 내부 개발·검증 기록의 버전 정보는 별도로 보존한다.

## 자체 문의·D1·Discord (2026-10-19)

공개 [문의 양식](https://bibimer.app/ko/contact/)을10개언어로 제공한다. 오류·설치/연결·기능제안·기타 직접입력, 내용·선택이메일과명시적동의를 받는다. 일반 문의 버튼과README는 양식으로 연결하고 정책의 이메일 대체 경로는 유지한다. 홈·가이드에는현재10언어지원과0.25.0기능을반영했으며0.25.0정식심사중/현재공개0.23.0을구분한다.

`contact-locales.json`과 `python3 scripts/build_website_contact.py`로10개정적문의페이지를 생성한다. 공통 `assets/contact.js`/`contact.css`와자체접근성선택기를 사용한다. 별도 제목 입력은 받지 않으며 기존 DB의 제목 칸은 본문 앞부분으로 자동 채운다. 이전 클라이언트가 보낸 제목도 받아 기존 재시도와 호환한다. 서버는 `functions/api/contact.js`, D1스키마는 `migrations/0001_contact_inquiries.sql`, Pages설정은 `wrangler.toml`이다. DB binding은 `CONTACT_DB`이고 DB는 `bibimer-contact`다. 웹훅/남용방지키는 암호화된 Pages비밀설정 `DISCORD_WEBHOOK_URL`/`CONTACT_RATE_KEY`로만 주입한다. 값은 소스에 넣지 않는다.

DB를 먼저 커밋한 뒤 접수번호를 반환하고Discord알림을시도한다. UUID/내용 기반중복방지·동일출처/16KB제한·IP의키기반해시당5건/시간·바인딩SQL·멘션차단을 제공한다. 연락처와내용을일반로그에남기지않는다. `notification_status`/`notification_attempts`/`notification_error`로전달실패를확인한다. Discord는429/서버오류응답에만최대2회시도하며네트워크/타임아웃처럼전달여부가불명확하면중복전송을피하기위해재시도하지않는다. DB저장은알림전달보장을뜻하지않는다. 긴Discord본문은잘라도DB에는전체본문을저장한다.

`maintenance-worker.js` / `wrangler.maintenance.toml`의매시간cron(매시17분)이90일지난DB행과추적된Discord알림을정리한다. 공개API/URL을제공하지않는다. Discord삭제실패시본문/이메일없는삭제식별자만유지해다음실행에서재시도한다. 기존고객데이터가없는새DB에마이그레이션을적용했으며임의의다른DB는수정하지않았다.

검사:

```sh
python3 scripts/tests/test_website_locales.py
node scripts/tests/test_website_language.cjs
node scripts/tests/test_website_contact_api.cjs
node scripts/tests/test_website_retention.cjs
node scripts/smoke_website_contact.cjs
```

마지막브라우저검사는프로젝트의기존Playwright/Chromium환경을사용한다. 새런타임의존성은없다. 배포는 `release/website/`에서인증확인후수행한다:

```sh
wrangler whoami
wrangler d1 migrations apply bibimer-contact --remote
wrangler pages secret put DISCORD_WEBHOOK_URL --project-name bibimer
wrangler pages secret put CONTACT_RATE_KEY --project-name bibimer
wrangler pages deploy public --project-name bibimer --branch main
wrangler deploy --config wrangler.maintenance.toml
```

운영자는Cloudflare D1에서전달상태를먼저확인한다(본문/이메일을일반로그로출력하지않는다):

```sql
SELECT request_id, category, created_at, notification_status,
       notification_attempts, notification_error
FROM contact_inquiries ORDER BY created_at DESC LIMIT 20;
```

제출한문의관련요청은접수번호로대상과요청자를확인하고D1행과해당Discord알림을각각정리한다. 공개조회/관리API는없다. 웹훅을바꾸면Pages비밀을갱신하고다시배포한다. 자동재전송관리화면은제공하지않으므로실패/pending은운영자가확인한다.

최종배포 **https://0824d178.bibimer.pages.dev**.44공개리소스원본·보안헤더/404·API거절조건,실제공개양식의D1저장/Discord전송·동일UUID재전송중복없음을확인했다. 초기Workers미지원redirect옵션은수정·회귀검사·재배포후실제전송으로확인했다. 증빙 `dist/website-contact/`, 상세검증/한계는NEXT_SESSION.md를따른다. 시각판정94/pass. 아래는이전시점의변경기록이며‘문의폼없음’등은이번구성으로대체됐다.

## Discord 문의 알림 90일 정리 배포 (2026-11-03)

2026-11-02에새마이그레이션/API를배포했고, 11-03에Doppler `bibimer/prd`의 `DISCORD_WEBHOOK_URL`을Pages/정리Worker에동일하게연결했다. Pages `https://b3723536.bibimer.pages.dev`, Worker버전 `c0d25793-5306-4114-b1c1-3b733582f41a`와매시17분cron배포를확인했다. 웹훅유효성HTTP200·로컬정리회귀는통과했으나실제만료메시지삭제는아직관찰하지않았다. 공개정책은아직변경하지않았다.

새 알림의 `wait=true` 응답에서 메시지 ID만 읽어 `contact_discord_messages`에 메시지 ID·웹훅 ID·원래 문의 접수 시각을 저장한다. 본문·이메일·토큰은 이 정리 테이블에 저장하지 않는다. 문의 DB의 90일 정리와 별도로, 매시간 최대20개의 만료 메시지를 웹훅 DELETE API로 개별 삭제한다. 삭제 성공204 또는 Unknown Message10008 확인 뒤에만 식별자를 지운다. 네트워크/권한/호출제한/웹훅변경 실패는 식별자를 남기고 다음 실행에 재시도하며 cron을 실패로 표시한다. 원본 문의 DB는 이 실패와 관계없이 만료 정리한다.

적용 순서: 새 마이그레이션 `0002_discord_retention.sql`을 D1에 적용 → 기존 Pages와 동일한 `DISCORD_WEBHOOK_URL`을 유지보수 Worker의 비밀 설정에도 주입 → Pages API와 유지보수 Worker 배포 → 격리된 테스트 메시지로 실제 삭제를 확인한다. Worker 설정에 토큰을 넣거나 비밀 값을 출력하지 않는다. Pages에 저장한 비밀은 Worker로 자동 공유되지 않는다. 웹훅 교체 전 이전 웹훅 메시지를 정리해야 하며, 토큰을 잃으면 이 경로로 삭제할 수 없다.

예전 알림은 메시지 ID를 저장하지 않았으므로 소급 삭제하지 않는다. 웹훅은 채널의 메시지 목록을 조회하는 기능을 제공하지 않는다. 기존 메시지는 Discord에서 별도 정리하거나 운영자가 확인한 메시지/웹훅 ID와 접수 시각을 정리 테이블에 등록해야 한다. 채널의 다른 메시지나 운영자의 답변은 자동 삭제하지 않는다. 전송 성공 응답 유실·ID 저장 실패는 자동 복구할 수 없어 문의 행의 `missing_message_id`/`message_tracking_failed` 또는 전달 불명 상태를 확인해 별도 정리한다. 실제 배포·정리 확인 전 공개 정책의 기존 보관 안내는 변경하지 않는다.

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

## 10개 언어 공개 (2026-10-15)

일본어 `/ja/`, 대만·홍콩 공통 번체 `/zh-Hant/`, 프랑스어 `/fr/`, 독일어 `/de/`를 추가했다. 기존6개와 함께 각 언어의 홈·`privacy/`·`guide/` 총30페이지를 제공한다. 브라우저 언어 기본값과 수동 선택 저장, 프로젝트 자체 검색형 선택기, 같은 종류의 페이지 이동을 유지한다. 지원 언어가 없는 기기 언어 목록은 영어로 표시한다. 정식 앱0.17.1은 EN/KO이며 내부0.18.0에서10개 언어를 제공하므로 공개 홈은 새 언어의 정식 앱 제공을 아직 예고한다.

Cloudflare Pages **https://88feba4e.bibimer.pages.dev**, 공개 https://bibimer.app . 새12페이지320px 가로넘침 없음, 일본어 짧은 제목 및FR/DE제목크기 보완, 30페이지 원본/HTTP/보안헤더/404와 공개 언어 메뉴 키보드 검증 통과. 기록 `dist/localization-ten/`, 시각판정95pass. 원어민 검수는 남아 있다.

Bibimer는 **모바일 ADE(Agent Development Environment, 에이전트 개발 환경)**다. 같은 휴대폰의 Termux에서 프로젝트·코딩 에이전트 세션·대화·터미널을 관리한다. 슬로건은 **내 손안의 에이전트 개발 환경**이며 실제 코딩 작업은 연결한 에이전트가 수행한다.

- 영어 사이트(기본): https://bibimer.app/
- 한국어 사이트: https://bibimer.app/ko/
- 영어 개인정보처리방침: https://bibimer.app/privacy/
- 한국어 개인정보처리방침: https://bibimer.app/ko/privacy/
- 운영 주체: 앤디니어링 (Andineering)
- 지원·개인정보 문의: https://bibimer.app/ko/contact/ (정책의 이메일 대체 경로 유지)
- 정책 시행일: 2026-10-15

`public/`의 정적 HTML·CSS·서체·이미지와 `functions/`의 문의 API를 Cloudflare Pages에 함께 배포한다. 공개 계정·광고·분석 SDK는 없다. 문의 저장에는 D1, 알림에는 서버 비밀 설정의 Discord 웹훅을 사용한다. 서체 라이선스는 `public/assets/SpaceGrotesk-OFL.txt`다. `_headers`의 보안 헤더와 no-transform을 유지하며 API는 no-store 응답을 제공한다. 앱 소스·서명 키·사용자 세션 기록을 업로드하지 않는다.

언어별 URL을 사용하는 정적 i18n 구성이다. 각 페이지는 선택한 언어의 본문만 제공하고, 언어 전환은 같은 종류의 페이지로 이동한다. 한국어 홈의 정책 링크·정책의 홈 링크는 한국어 경로를 유지한다. 각 문서에 `lang`, 자기 URL의 `canonical`, 상호 연결된 `hreflang`을 지정했다. 기본 홈·정책·사용법 URL은 저장된 명시적 선택 또는 브라우저 언어에 맞춰 이동한다. 지원 언어가 없으면 영어를 사용하고 직접 지정한 언어 경로는 유지한다. 선택은 `bibimer.website.language`로 기기 브라우저에 저장한다. Play Console의 `/privacy/` 주소는 유지한다.

## 소개 화면·사용법·시스템 언어 (2026-10-15)

아이콘을 BIBIMER 앞에, GitHub·문의·자체 언어 선택기를 헤더에 배치했다. 설치 버튼은 기존 디자인에 Google Play 원본 컬러 아이콘을 추가했고 옆의 사용법 버튼은 각 언어의 `guide/`로 연결한다. Google Play SVG는 공식 Play 페이지의 prism 경로·색상을 그대로 자체 호스팅한다. 출처 https://play.google.com/store/apps/details?id=app.bibimer (2026-10-15).

6개 언어 사용법은 Termux 준비, 앱 연결, 프로젝트/터미널, 코딩 에이전트 설정, 세션·파일 관리를 설명한다. 소개의 CSS radio 슬라이더는 같은 폰의 Android 앱–Termux–에이전트 구조·모바일 서식·채팅 예시를 보여준다. 네 장의 실제 UI + 합성 데이터 화면을 별도 갤러리로 제공하며 실제 사용자 기록이나 모델 실행 증거로 소개하지 않는다.

언어 메뉴는 검색·키보드 탐색·Escape/외부 클릭 닫기·포커스 복귀를 지원한다. 기본 홈·정책·사용법 URL은 저장된 수동 선택 → 브라우저 언어 → 영어 순으로 이동하고 명시적 locale URL을 존중한다. 중국어 번체를 간체로 자동 변환하지 않는다. localStorage 불가 시 검증된 `?lang=` 선택을 유지한다. 자체 `language.js`만 사용하도록 CSP `script-src 'self'`를 적용했으며 외부 요청/분석 SDK는 없다. 정책에 기기 내 언어 설정 저장을 반영했다.

배포 **https://b9943f47.bibimer.pages.dev**. 공개18페이지 HTTP200·원본/CSP/no-transform·404, 공개8이미지/아이콘/스크립트 바이트, 320/393px 36페이지/드롭다운 경계, 검색/키보드/슬라이더를 확인했다. Node 언어 동작·Python 페이지 구조 검사 통과, 시각 판정96점 pass. 증빙 `dist/website-hero/`.

아래 날짜별 기록의 ‘JS 없음/영어 고정’은 당시 상태이며 이 변경으로 대체됐다.

## 이름 유래 소개 (2026-10-15)

6개 언어 홈의 `#name-story`에 **비빔(bibim) + -er → Bibimer**를 설명한다. Android 앱·Termux·코딩 에이전트를 함께 비빈다는 사용자의 명명 의도를 유지한다. 한국어는 ‘왜 비비머인가요?’, 영어는 ‘Why Bibimer?’이며 EN/KO README에도 같은 내용을 제공한다. 기존 CSS를 재사용하고 별도 스크립트는 없다.

배포 **https://5c279648.bibimer.pages.dev**. 공개 원본·보안 헤더와 6개 언어의 모바일 표시를 검증했다. 기록 `dist/name-story/`, 시각 판정 97점 pass다.

## 6개 언어 제공 (2026-10-14)

영어 `/`, 한국어 `/ko/`, 스페인어 `/es/`, 중국어 간체 `/zh-Hans/`, 브라질 포르투갈어 `/pt-BR/`, 인도네시아어 `/id/`에서 홈을 제공한다. 각 경로의 `privacy/`에 같은 언어의 전체 정책을 제공한다. 앱의 공개 0.17.1은 영어·한국어만 지원하므로 홈에 웹사이트 언어와 앱 출시 언어를 구분해 안내한다.

6개 언어를 직접 고르는 링크 메뉴로 같은 종류의 페이지를 오간다. URL로 선택을 유지하며 자동 감지/이동·쿠키·클라이언트 스크립트·native select는 없다. 모든 홈과 정책의 lang/canonical/hreflang을 연결했고 기존 영어 정책 주소를 유지한다. 긴 제목은 좁은 화면에서 줄바꿈한다. 기존 개인정보 처리 내용과 시행일은 유지하며 번역은 원어민 검수를 완료한 것으로 표시하지 않는다.

배포 **https://a4349ffb.bibimer.pages.dev**. 공개 12페이지의 HTTP 200·원본 일치·CSP/no-transform·잘못된 경로 404, 320/393px 언어 이동·정책→홈·가로 넘침, 키보드 전환·중국어 데스크톱을 확인했다. 구조 검사는 `python3 -m unittest discover -s scripts/tests -p 'test_website_locales.py'`, 화면/공개 검증 기록은 `dist/localization-zh/`에 있다. 앱의 선택 언어별 정책 링크는 소스에 구현했으며 다음 앱 빌드에 포함된다.

## Google Play 출시 안내 (2026-10-14)

사용자 요청으로 두 홈의 출시 준비 문구와 문의용 첫 버튼을 **Google Play 설치 링크**로 바꿨다. 무료·Android 8.0 이상·같은 휴대폰의 Termux 사용을 안내한다. 문의는 기존 메뉴에서, 공개 GitHub 저장소는 설치 버튼 옆에서 연다. 공개 0.17.0에 포함된 코드 구문 강조·Git diff·Markdown/정적 HTML/Mermaid 미리보기·호환 Android 앱으로 Office/이미지/PDF 열기를 네 번째 기능으로 추가했다. 데스크톱은 2열, 모바일은 1열이며 기존 디자인·별도 언어 URL·개인정보처리방침을 유지한다. 내부 테스트만 제공 중인 탐색기 동작 개선을 공개 설치본에 포함된 것으로 소개하지 않는다.

Cloudflare Pages **https://301d54d0.bibimer.pages.dev**에 배포했다. 공개 EN/KO 홈·정책·두 파비콘의 HTTPS 200·원본 일치·보안 헤더/no-transform, 두 홈의 Play/GitHub 링크·정적 HTML·고유 ID·언어 전환, 데스크톱 및 393px 모바일 가로 넘침 없음을 확인했다. 한국어 새 문구는 humanizer의 의미 보존 기준으로 점검했으며 시각 판정은 97점 pass다. 기록 `.omx/state/website-release/ralph-progress.json`, 화면 `dist/website-release/`. 새 의존성·클라이언트 스크립트를 추가하지 않았다.

## 파비콘 (2026-10-14)

앱의 `android/app/src/main/assets/brand.svg`를 그대로 복사한 `public/assets/favicon.svg`와 16·32px 항목을 담은 `public/favicon.ico`를 모든 HTML(영어·한국어 홈·정책·심사 안내·404)에 지정했다. 기존 홈 소개용 512px 아이콘은 유지한다. ICO는 SVG를 Inkscape로 16·32px PNG로 렌더링한 뒤 하나의 ICO 컨테이너에 담았다. 렌더러가 지원하지 않는 SVG 그림자만 작은 래스터에서 생략했다. 새 패키지 의존성이나 클라이언트 스크립트는 없다.

링크의 `?v=20261014`는 기존 파비콘 캐시와 구분하기 위한 버전이다. 아이콘을 다시 변경할 때 두 링크의 버전도 함께 갱신한다. Pages 배포: **https://543c6b35.bibimer.pages.dev**. `bibimer.app`의 7개 문서와 두 파비콘 파일의 HTTP 200·원본 일치·보안 헤더 유지, SVG 원본 일치와 ICO 크기, Chrome의 공개 SVG 표시를 확인했다. 브라우저별 기존 탭 캐시 갱신 시점은 보장하지 않는다.

2026-10-11 사용자 요청으로 홈 소개의 대상 연령 문장을 제거했고 정책의 연령 안내는 유지한다. 2026-10-12 사용자 요청으로 GitHub 저장소를 공개 전환한 뒤 두 홈의 링크를 `https://github.com/andy5090/bibimer`로 변경했다. 슬로건은 **내 손안의 에이전트 개발 환경**이며 프로젝트 파일과 개발 도구를 같은 휴대폰에서 실행하는 장점을 설명한다. 데스크톱과 393px 두 언어 화면의 가독성·가로 넘침 없음을 확인했다. 배포: `https://be3a065b.bibimer.pages.dev`.

2026-10-12 출시 준비 중 두 정책의 `#data-deletion`에 삭제 요청 절차를 구체화했다. `andy@andineering.com`으로 요청할 수 있으며 운영자가 보관한 문의 정보, 기기의 Termux 파일·에이전트 기록, 외부 제공자가 보관한 정보를 구분한다. 비밀번호·API 키·비공개 프로젝트 파일을 보내지 않도록 안내한다. 최신 배포는 `https://added5db.bibimer.pages.dev`다. 두 공개 정책 HTTP 200·원본 일치·no-transform, 데스크톱 및 393px 두 언어의 가로 넘침 없음을 확인했다. 처리 구조와 원래 시행일은 유지한다.

## 조회와 배포

2026-10-11 `npx cf`로 Cloudflare 인증을 확인하고 `bibimer` Pages 프로젝트를 생성했다. 같은 CLI로 조회한 `bibimer.app`은 `registrable: true`, standard, 첫해 USD 8.20·갱신 USD 14.20이었다. 사용자의 구매 지시에 따라 가용성을 재확인하고 계정 기본 결제수단으로 **1년 USD 8.20 등록을 완료**했다. 등록 상태 active, 만료 2027-10-11 06:00:18 UTC, 자동 갱신 false, WHOIS redaction, 도메인 잠금 true를 확인했다. 갱신은 자동 실행되지 않으며 당시의 가격을 다시 확인해야 한다.

```sh
npx --yes cf@1.0.0-beta.14 auth whoami
npx --yes cf@1.0.0-beta.14 registrar registrations check bibimer.app
```

이 버전의 `cf pages deploy`는 기존 Pages 파일 업로드를 지원하지 않아 Cloudflare 공식 Wrangler로 배포했다. 새 프로젝트 생성은 다시 실행할 필요 없다. 저장소에 npm 의존성을 추가하지 않았다.

```sh
npx --yes wrangler@4.149.0 whoami
npx --yes wrangler@4.149.0 pages deploy release/website/public \
  --project-name bibimer --branch main --commit-dirty=true
```

Pages 기본 주소 `bibimer.pages.dev`를 유지하며 새 도메인의 루트 CNAME을 해당 주소로 연결했다. Pages 사용자 지정 도메인·DNS zone·HTTPS 인증서 활성화를 확인했다. 공개 영어·한국어 홈과 정책 네 경로, 서체·아이콘의 HTTPS 200과 소스 일치, 보안 헤더, 없는 경로의 404를 확인했다. `no-transform` 적용 뒤 이메일 가림·분석 스크립트가 삽입되지 않아 HTML이 원본과 일치한다. 브라우저에서 데스크톱과 모바일 크기, 정책 이동·언어 전환·가로 넘침 없음을 확인했다. 기본 Python urllib User-Agent의 첫 요청은 403이었고 일반 브라우저와 Mozilla User-Agent 요청은 성공했다. 자동 클라이언트 전체의 접근을 보장한 검증은 아니다.

로컬 미리보기는 종료 후 서버를 중지한다.

```sh
python3 -m http.server 8877 --bind 127.0.0.1 --directory release/website/public
```

앱 Settings에 기존 외부 브라우저 열기 경로로 고정된 `https://bibimer.app/privacy/` 버튼을 추가하고 사용자 요청의 캡처용 APK에 포함했다. 영어·한국어 표시와 외부 Chrome 실행을 에뮬레이터에서 확인했다. Chrome 최초 실행 약관 단계에서 멈췄으므로 앱에서 정책 페이지 로드·실기기 브라우저 호출은 미검증이다. 기존 휴대폰 배포 APK는 교체하지 않았다. 기본 CLI OAuth 권한으로 zone setting·RUM 설정 변경은 403이므로 권한을 확대하지 않았다. Cloudflare 공식 문서의 `no-transform` 헤더로 이메일 가림과 Web Analytics 자동 삽입을 막는다. Play 앱 서명 인증서는 확인했으나 HTTPS App Links의 앱 intent filter·라우팅은 구현하지 않았다. `assetlinks.json`도 해당 기능과 함께 구현·검증할 때 게시한다.

## 계정 없는 데모 안내 (2026-10-12)

`/review/`와 `/ko/review/`는 별도 언어의 체험·심사 안내이며 두 정책에도 데모 처리 범위를 추가했다. 계정 없이 가상 구조화 로그를 재생하고 실제 AI 요청·명령·프로젝트 파일 접근을 하지 않는다. 58.1초 MP4는 실제 Android 포그라운드 서비스·알림·세션 이동·끄기를 가상 완료 이벤트로 시연한다. 제공자 인증·실제 AI 응답 검증으로 주장하지 않는다. 영상은 자체 호스팅이며 광고·외부 플레이어 스크립트가 없다. 두 안내의 393px 가로 넘침 없음, 영상 metadata 58.1초 로드를 브라우저에서 확인했다. 정책의 처음 시행일은 유지했다. 이 단계의 배포는 `https://60e7bace.bibimer.pages.dev`다. 아래 접근 제한 변경으로 대체됐다.

## 심사자용 접근 안내로 변경 (2026-10-12)

일반 홈과 공개 README는 데모 체험·알림 시연을 홍보하지 않는다. 심사 리소스 `/review/`·`/ko/review/`는 Console의 비공개 코드가 필요한 **0.16.1 Settings → Review access** 진입을 안내한다. 심사 안내에는 검색 색인을 막는 `noindex, nofollow`를 추가했다. 페이지 자체는 Google 심사 자료 확인을 위해 공개지만 접근 코드 원문은 없다. 앱 데모는 코드 인증을 통과해야 사용할 수 있다.

영어·한국어 정책에 코드의 기기 내 확인과 원문 미보관을 반영했다. 알림 영상은 기존 0.16.0의 실제 Android 조작이며 새 코드 입력 과정을 포함하지 않는다고 명시했다. 영상은 변경하지 않았다. 최신 배포는 `https://0d4a8150.bibimer.pages.dev`다. 공개 두 언어 안내와 정책의 갱신된 본문·언어 이동, 안내의 `noindex, nofollow` 적용을 브라우저에서 확인했다.

2026-10-12의 0.17.0 출시 준비에서 심사 안내 첫 단계의 버전 번호를 제거했다. 새 버전에서도 같은 Settings → Review access와 비공개 코드를 사용하므로 오래된 버전을 설치하라고 안내하지 않는다. EN/KO 공개 본문을 브라우저에서 확인했다. 배포: `https://cfd319f4.bibimer.pages.dev`.
