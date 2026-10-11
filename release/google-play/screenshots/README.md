# Play 스토어용 실제 앱 화면

영어·한국어 각각 **5장, 총 10장**을 Play Console 기본 등록정보에 저장했다. 사용자가 승인한 ADB로 Android 에뮬레이터의 실제 앱을 캡처했다. 첫 화면과 데모 화면은 2026-10-12 최종 출시 AAB **0.16.0 / versionCode 30**의 파생 APK다.

| 순서 | 파일 | 화면 |
| --- | --- | --- |
| 1 | `en-US/01-work.jpg`, `ko-KR/01-work.jpg` | Work 시작 화면, 연결 전·데모 체험 버튼 |
| 2 | `en-US/02-setup.jpg`, `ko-KR/02-setup.jpg` | Setup 설치·연동 안내, Termux 설치 필요 |
| 3 | `en-US/03-settings.jpg`, `ko-KR/03-settings.jpg` | Settings 언어·Enter·알림 설정 |
| 4 | `en-US/04-terminal.png`, `ko-KR/04-terminal.png` | 실제 Termux 연결·테스트 프로젝트에서 Terminal `pwd` 실행 |
| 5 | `en-US/05-demo.png`, `ko-KR/05-demo.png` | 실제 앱의 명시적 데모: 가상 Codex 형식의 코드·Markdown 예제, 실제 기록 사용 없음 |

- AVD: `Medium_Phone_API_36.1`, Android 36.1, `emulator-5554`.
- 모두 1080×1920, 9:16. ADB `screencap`의 원본 PNG를 사용하며 1번은 macOS `sips`로 JPEG 품질 90으로 내보냈다. 2~3번은 기존 품질 95 JPEG, 4~5번은 PNG다. 이미지 합성이나 문구 오버레이를 추가하지 않았다. 5번의 대화는 앱에 구현된 가상의 예제이며 Demo/데모 안내로 구분한다. 개인 에이전트 로그·계정·API 키를 사용하지 않는다.
- 2~4번은 2026-10-11 캡처용 0.15.0 / code 28 APK다. 4번의 `play-review`는 테스트 에뮬레이터에서 실제로 만든 Termux 폴더이며 셸 출력이다. AI 에이전트 실행을 뜻하지 않는다. 1·5번은 업로드 키 서명 AAB 30의 파생 APK로 다시 캡처했다. 실제 휴대폰 배포 APK·운영 브리지는 변경하지 않았다.
- 영어·한국어 각각 Work → Setup → Settings → Terminal → Demo 순서로 리뷰 화면을 확인하고 저장 성공을 확인했다. 등록정보 상태는 **검토를 위해 전송 준비 완료**다. 내부 테스트 출시와 프로덕션 심사·공개 출시는 구분한다.
- 원본과 검증 증빙은 Git 제외 `dist/demo-release/`, `dist/play-release-setup/store-demo-saved.jpg`에 있다. ADB 에뮬레이터를 원래 1080×2400·density 420으로 복원하고 종료했다.
