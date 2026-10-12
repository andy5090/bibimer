# Play 스토어용 실제 앱 화면

2026-10-12 현재 영어·한국어 각각 **3장, 총 6장**을 Play Console 기본 등록정보에 저장했다. 심사용 데모와 데모 버튼이 있던 첫 화면은 공개 등록정보에서 제외했다. README도 같은 정상 모드 화면을 사용한다.

| 순서 | 파일 | 화면 |
| --- | --- | --- |
| 1 | `en-US/04-terminal.png`, `ko-KR/04-terminal.png` | 실제 Termux 연결·테스트 프로젝트에서 Terminal `pwd` 실행 |
| 2 | `en-US/02-setup.jpg`, `ko-KR/02-setup.jpg` | Setup 설치·연동 안내 |
| 3 | `en-US/03-settings.jpg`, `ko-KR/03-settings.jpg` | Settings 언어·Enter·알림 설정 |

- 사용자 승인 ADB로 Android 에뮬레이터의 실제 앱을 캡처했다. AVD `Medium_Phone_API_36.1`, Android 36.1, 1080×1920, 9:16이다. Setup·Settings는 품질 95 JPEG, Terminal은 ADB 원본 PNG다. 이미지 합성이나 문구 오버레이를 추가하지 않았다.
- 현재 사용한 화면은 2026-10-11 캡처용 **0.15.0 / code 28**이다. `play-review`는 테스트 에뮬레이터에서 만든 실제 Termux 폴더이며 Terminal은 셸 출력이다. AI 에이전트 실행이나 0.16.1 설치 검증을 뜻하지 않는다. 기존 휴대폰 APK·운영 브리지는 교체하지 않았다.
- Console에서 두 언어 모두 **Terminal → Setup → Settings**, 3/8을 확인하고 저장했다. 언어별 설명에서도 데모 홍보를 제거했다. 현재 출시 제출 상태는 [출시 기록](../../../docs/google-play-release.md)을 따른다.
- `01-work.jpg`와 `05-demo.png`는 이전 **0.16.0 / code 30** 캡처 이력으로만 보존한다. 두 파일은 현재 Play 등록정보·README에 표시하지 않는다. 가상 데모 이미지에는 실제 에이전트 기록·계정·API 키를 사용하지 않았다.
- 원본과 검증 증빙은 Git 제외 `dist/demo-release/`, `dist/review-access/`에 있다. 에뮬레이터는 원래 1080×2400·density 420으로 복원하고 종료했다. 이번 접근 제한 작업에서는 새 APK나 스크린샷을 생성하지 않았다.
