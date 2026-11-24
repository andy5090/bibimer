# App Store 헤더·검색용 크리에이티브

영어·한국어 universal 이미지다. 선택적 App Store 마케팅 자산이며 새 앱 빌드나 앱 실행으로 만든 결과가 아니다. 업로드·자산 심사 제출 여부는 상위 배포 기록을 따른다.

| 언어 | 제출 PNG | 전체 축소 미리보기 | 핵심 안전영역 미리보기 |
| --- | --- | --- | --- |
| 영어 | [en-US-universal.png](en-US-universal.png) | [전체](previews/en-US-preview.png) | [안전영역](previews/en-US-safe-crop.png) |
| 한국어 | [ko-universal.png](ko-universal.png) | [전체](previews/ko-preview.png) | [안전영역](previews/ko-safe-crop.png) |

- 제출 파일: **5244×2950, 8-bit RGB PNG, 알파 없음**.
- Apple 지정 핵심 안전영역: **x1921, y660, width1402, height962**. 로고·카피·실제 화면은 전부 이 영역 안에 배치했다. 전체 캔버스의 넓은 여백은 여러 배치의 크롭을 위한 배경이다.
- 기존 `brand.svg`, `SpaceGrotesk-Bold.woff2`, 제출용 `screenshots/{en-US,ko}/iphone/01-terminal.jpg`를 참조한다. JPG 원본은 편집·교체하지 않고 원래 비율로 삽입했다. 단말 외곽·배경·텍스트 배치는 HTML/CSS/SVG로 구성했다.
- 실제 iOS 터미널 화면을 보여준다. 이미지에 가상의 AI 응답·로그인 성공·실행 결과를 새로 넣지 않았다. Bibimer를 코딩 에이전트로 표현하지 않는다.
- 영문은 “Your agent workspace. On your phone.”, 한국어는 “내 손안의 에이전트 개발 환경.”이다. 가격·URL·수상·다른 플랫폼 마켓 문구를 넣지 않았다.

## 다시 렌더링

저장소 루트에서 실행한다. 기존 `.tools/ui/node_modules/playwright-core`와 macOS의 Google Chrome을 사용하며 의존성을 설치하지 않는다.

```sh
./release/app-store/creative-assets/render.sh
```

다른 기존 Chromium 실행 파일을 사용할 때만 `BIBIMER_CHROMIUM`을 지정한다. 픽셀 재현은 같은 Chrome·macOS 폰트 환경을 기준으로 한다. 한국어 본문은 macOS의 Apple SD Gothic Neo를 사용하고 `BIBIMER` 텍스트 로고는 저장소의 Space Grotesk Bold를 사용한다.

`verify.py`는 PNG CRC·픽셀 데이터와 해시·안전영역을 표준 라이브러리로 확인해 `verification.json`을 생성한다. `render.sh`에서 렌더 뒤 자동 실행된다.

`render.cjs`가 폰트 로드·원본 비율·핵심 요소 경계·정확한 PNG 규격을 검사하고 `manifest.json`에 출력/원본 해시와 경계를 기록한다. 전체 축소 미리보기는 별도 페이지에서 렌더한다. 시각 검토는 원본 브랜드·캡처와 대조했으며 `.omx/state/app-store-creatives/ralph-progress.json`에 2차 **94/pass**를 기록했다. 이 점수는 Apple의 승인 또는 실제 노출을 뜻하지 않는다.

규격 출처: [Apple Creative assets specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications), 2026-11-25 확인.

## 자산 심사 제출

2026-11-25 두 PNG를 Asset Library에 업로드하고 iOS 최신 버전의 별도 자산 심사로 제출했다. Apple의 **‘2개의 항목 제출됨’** 완료 화면을 확인했다. [심사 상세](https://appstoreconnect.apple.com/apps/6826729307/distribution/reviewsubmissions/details/2b483c17-b41d-4689-a9cd-d089199d3da1), 기록은 `submission.json`이다.

자산은 승인 결과 대기 중이다. 승인 후 영한 라이브 제품 페이지의 헤더·검색 결과에 선택/저장하고 노출을 검증한다. 앱1.0.0은 이미 공개되어 있으며 자산 제출 완료를 실제 배치 완료로 취급하지 않는다.
