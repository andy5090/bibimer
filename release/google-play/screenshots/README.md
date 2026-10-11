# Play 스토어용 실제 앱 화면

2026-10-11 사용자 요청으로 캡처용 APK를 빌드하고 Android 에뮬레이터에 설치했다. 사용자가 승인한 ADB 조작·캡처로 영어·한국어 각각 네 장을 준비하고 Play Console 기본 등록정보에 저장했다.

| 순서 | 파일 | 화면 |
| --- | --- | --- |
| 1 | `en-US/01-work.jpg`, `ko-KR/01-work.jpg` | Work 시작 화면, 연결 전 |
| 2 | `en-US/02-setup.jpg`, `ko-KR/02-setup.jpg` | Setup 설치·연동 안내, Termux 설치 필요 |
| 3 | `en-US/03-settings.jpg`, `ko-KR/03-settings.jpg` | Settings 언어·Enter·알림 설정 |
| 4 | `en-US/04-terminal.png`, `ko-KR/04-terminal.png` | 실제 Termux 연결·테스트 프로젝트에서 Terminal `pwd` 실행 |

- 앱: `app.bibimer`, 0.15.0 / versionCode 28. Work 첫 화면은 출시용 AAB의 파생 APK, 나머지는 `dist/bibimer-debug.apk`에서 캡처했다.
- AVD: `Medium_Phone_API_36.1`, Android 36.1 Google APIs Play Store ARM64, `emulator-5554`.
- 캡처: 1080×1920, 9:16. ADB `screencap` 원본 PNG를 macOS `sips`로 JPEG 변환했다(새 1번 품질 92, 2~3번 품질 95). 4번은 원본 PNG다. 화면 합성·문구 오버레이·가짜 대화는 추가하지 않았다. `play-review`는 검증 중 실제로 만든 Termux 폴더다.
- 원본과 빌드 로그: Git 제외 `dist/store-capture/`, `.tools/store-capture-build.log`.
- 1~3번은 Termux 설치 전 화면이다. 4번은 공식 Termux 0.118.3과 내장 브리지를 수동 설치·연결한 뒤 캡처했다. 개인 에이전트 계정·API 키 없이 셸을 실행하고 프로젝트 경로 출력을 확인했다. Settings 왕복·앱 재열기 후 같은 세션 실행 상태도 확인했다. AI 에이전트 실행·백그라운드 완료 알림 검증을 대신하지 않는다.
- Setup·Settings·Terminal은 Mac의 별도 로컬 개발 키로 서명한 캡처 전용 APK에서 캡처했다. 2026-10-12 Work 첫 화면은 사용자가 승인한 출시용 AAB에서 파생한 업로드 키 서명 APK로 다시 캡처해 자연스러운 첫 화면과 휴대폰 개발 소개를 반영했다. 영어 첫 실행, 한국어 전환과 앱 재실행 후 언어 유지도 확인했다. 실제 휴대폰 배포 APK·운영 브리지는 교체하지 않았다.

영어·한국어 등록정보에서 아이콘·각 언어의 소개 그래픽·스크린샷 4장씩의 순서가 저장된 것을 확인했다. 2026-10-12 새 Work 화면도 두 언어 모두 첫 번째에 배치·저장했다. Console 상태는 **검토를 위해 전송 준비 완료**이며 앱 심사 제출·출시는 하지 않았다. 최신 증빙은 `dist/play-release-setup/store-new-work-en.jpg`, `store-new-work-ko.jpg`에 있다.
