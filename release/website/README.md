# Bibimer 정적 웹사이트

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
- 지원·개인정보 문의: andy@andineering.com
- 정책 시행일: 2026-10-15

`public/`만 Cloudflare Pages에 직접 업로드한다. HTML·CSS·자체 호스팅 서체·이미지와 언어 선택용 자체 JavaScript로 구성한다. 계정, 문의 폼, 광고, 분석 스크립트는 없다. 서체 라이선스는 `public/assets/SpaceGrotesk-OFL.txt`에 있다. `_headers`에 정적 페이지용 보안 헤더와 `Cache-Control: public, max-age=0, must-revalidate, no-transform`을 지정하고 `404.html`로 없는 경로의 HTTP 404를 유지한다. 앱 소스·서명 키·세션 기록은 업로드하지 않는다.

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
