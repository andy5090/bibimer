# Bibimer 정적 웹사이트

Bibimer는 **모바일 ADE(Agent Development Environment, 에이전트 개발 환경)**다. 같은 휴대폰의 Termux에서 프로젝트·코딩 에이전트 세션·대화·터미널을 관리한다. 슬로건은 **내 손안의 에이전트 개발 환경**이며 실제 코딩 작업은 연결한 에이전트가 수행한다.

- 영어 사이트(기본): https://bibimer.app/
- 한국어 사이트: https://bibimer.app/ko/
- 영어 개인정보처리방침: https://bibimer.app/privacy/
- 한국어 개인정보처리방침: https://bibimer.app/ko/privacy/
- 운영 주체: 앤디니어링 (Andineering)
- 지원·개인정보 문의: andy@andineering.com
- 정책 시행일: 2026-10-11

`public/`만 Cloudflare Pages에 직접 업로드한다. HTML·자체 호스팅 서체·기존 앱 아이콘으로 구성하며 JavaScript, 계정, 문의 폼, 광고, 분석 스크립트를 포함하지 않는다. 서체 라이선스는 `public/assets/SpaceGrotesk-OFL.txt`에 있다. `_headers`에 정적 페이지용 보안 헤더와 `Cache-Control: public, max-age=0, must-revalidate, no-transform`을 지정하고 `404.html`로 없는 경로의 HTTP 404를 유지한다. 앱 소스·서명 키·세션 기록은 업로드하지 않는다.

언어별 URL을 사용하는 정적 i18n 구성이다. 각 페이지는 선택한 언어의 본문만 제공하고, 언어 전환은 같은 종류의 페이지로 이동한다. 한국어 홈의 정책 링크·정책의 홈 링크는 한국어 경로를 유지한다. 각 문서에 `lang`, 자기 URL의 `canonical`, 상호 연결된 `hreflang`을 지정했다. 브라우저 언어에 따른 자동 이동 없이 기본 URL은 영어로 열리며 Play Console에 등록한 `/privacy/` 주소를 유지한다.

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
