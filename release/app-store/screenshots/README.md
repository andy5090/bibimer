# App Store 화면 자료

2026-11-18: **영어·한국어 iPhone/iPad 각3장, 총12장 촬영·검토 완료. Console 업로드는0장**이다. App Store Connect 로그인 실패와 공식 서비스 장애로 등록은 대기 중이며 심사 제출은 사용자 지시로 보류한다.

## 실제 촬영 구성

| 순서 | 파일 | 실제 내용 |
| --- | --- | --- |
| 1 | `01-terminal.jpg` | 기기 내 Linux에서 실행한 `pwd`, `uname`, `ls`와 출력 |
| 2 | `02-explorer.jpg` | 같은 QA 프로젝트의 실제 `readme` 파일 목록 |
| 3 | `03-settings.jpg` | 실제 앱 설정·입력·OS 실행 제약 안내 |

`en-US/{iphone,ipad}/`와 `ko/{iphone,ipad}/`의 파일을 해당 언어/기기에 등록한다. 경로는 `../listing.json`, SHA-256·해상도·기기·언어·촬영 시각은 [manifest.json](manifest.json)에 기록했다. 초기5장씩20장 계획 대신 실제 확보·검토한3장씩12장을 기본 등록 세트로 확정했다. Chat·워크트리 홍보 화면을 확보했다고 표시하지 않는다.

## 환경·출처

- Xcode27.2의 시뮬레이터 화면 앱은 **Device Hub**다. Simulator.app이 없으므로 촬영 불가라는 이전 판단을 정정한다. Xcode의 필수 시스템 구성요소 설치를 완료하고 Device Hub에서 실제 앱을 조작했다.
- 별도 `Bibimer TestFlight QA` iPhone17Pro(iOS26.5)와 새 `Bibimer App Store iPad QA` iPadPro13-inch(M5, iPadOS26.5)를 사용했다. 사용자 Runtime Lab·운영 앱·기존 iPad는 변경하지 않았다.
- 촬영 앱의 버전/빌드 메타데이터는1.0.0(15)다. 시뮬레이터 패키징의 기존0.1.0(1) 메타데이터만 별도 복사본에서 수정하고 ad-hoc 서명을 검증했다. 네이티브 소스·패키징 자산 해시는 업로드한15번 아카이브와 일치한다. Simulator 바이너리와 기기용 IPA를 동일 바이너리라고 주장하지 않는다.
- 실제 화면의 Screenshot 버튼으로 네이티브 PNG를 저장했다. PNG에 알파 채널이 있어 macOS `sips`로 JPEG 품질100 변환만 했다. 크기 변경·자르기·문구/상태 합성·베젤 추가는 하지 않았다.
- iPhone은1206×2622, iPad는2064×2752 세로, JPEG·알파 없음이다. 네이티브 원본과 패키징 영수증은 비공개 `dist/ios-appstore/preparation-nov18/screenshots-sim/`에 보존한다.

프로젝트 `/root/projects/storedemo`와 `readme`, Git 저장소는 별도 QA 앱에서 실제 생성했다. 터미널의 호스트 이름은 게스트가 가진 실제 프롬프트이며 명령은 기기 내 Linux에서 실행했다. 모델 응답·계정 로그인·워크트리 생성은 합성하지 않았고 사용자 프로젝트·인증 정보·OAuth URL·코드·알림을 포함하지 않았다.

## 검토 결과와 남은 작업

12장 모두 실제 화면과 대조하고 표시 언어·해상도·알파 없음·파일 해시를 확인했다. iPhone 파일 **내용 보기**의 한국어 도구 모음에서 `파일 새로고침`과 `iOS 앱으로 열기`가 겹치는 문제를 발견했다. 해당 사진은 양 언어 모두 제외하고 파일 **탐색 목록**으로 다시 촬영했다. 제품 코드를 수정한 것은 아니므로 출시 전 UI 검토 항목으로 남긴다.

설정 사진은 실제 백그라운드 실행 불가 안내를 그대로 포함한다. 물리 기기의 백그라운드 실행·계정 로그인·음성 권한 검증을 대신하지 않는다. [출시 준비](../readiness.md)의 나머지 제출 조건도 유지한다.

서비스 복구 후 Console의 영어/한국어 iPhone·iPad 슬롯에 각3장 업로드하고 저장·처리 완료·순서를 다시 확인한다. 등록만 진행하고 `심사에 추가`·제출·공개는 실행하지 않는다.

근거: [Apple 스크린샷 규격](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/), [Device Hub](https://developer.apple.com/documentation/Xcode/device-hub), [기기 화면 촬영](https://developer.apple.com/documentation/xcode/capturing-screenshots-and-videos-from-devices), [Apple 개발자 시스템 상태](https://developer.apple.com/system-status/) (2026-11-18 확인).
