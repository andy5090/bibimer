# Google Play 출시 준비

2026-10-06 기준 Bibimer는 **출시 준비 중**이다. 현재 앱은 `app.bibimer`, `0.13.0 / versionCode 23`, 최소 API 26·target API 36이다. 기존 배포물은 로컬 개발 키로 서명한 APK이며 Play에 제출한 AAB가 아니다. 새 AAB 빌드 경로를 추가했지만 실제 번들 빌드·Play 업로드·심사는 아직 수행하지 않았다.

사용자가 **조직 개발자 계정**을 사용한다고 확인했다. 신규 개인 계정의 12명·14일 비공개 테스트 요건은 이 출시 일정에 적용하지 않는다. 조직 계정의 인증 완료 여부와 Console에 표시되는 출시 제한은 별도로 확인한다.

## 제출 전 남은 작업

| 항목 | 현재 상태와 다음 작업 |
| --- | --- |
| Play Console 계정 | **조직 계정 사용 확인**. Wi-Fi를 사용할 수 없는 같은 폰에서 로컬 진단 페이지 연결까지 확인했다. Termux Chromium 뷰어는 연결 번호 확인 뒤에도 표시되지 않아 사용자 요청으로 문제 해결을 멈췄다. 계정 내부 접근·조직 인증 상태·Console 출시 제한은 아직 확인하지 않았다. 상세 인수인계는 NEXT_SESSION.md를 따른다. |
| 패키지 | 현재 `app.bibimer`를 유지한다. 첫 업로드 전 소유 계정에서 등록 가능 여부를 확인한다. |
| 빌드 | `scripts/build_aab.py` 추가. 업로드 키 준비 후 실제 AAB 빌드·bundletool 검증·내부 테스트 설치 필요. |
| 서명 | 현재 개발 인증서는 출시용으로 사용하지 않는다. 별도 업로드 키와 Play App Signing 설정 필요. |
| 개인정보처리방침 | [내용 초안](privacy-policy-draft.md). 운영 주체·문의 이메일·시행일 확정, 공개 웹 주소 및 앱 내 접근 경로 추가 필요. |
| 등록 정보 | [영어·한국어 문구](../release/google-play/listing.json) 준비. 지원 이메일·배포 국가·무료/유료·대상 연령·콘텐츠 등급은 소유자가 확정한다. |
| 이미지 | [512×512 아이콘](../release/google-play/graphics/icon-512.png)과 [영어](../release/google-play/graphics/feature-en-US.png)·[한국어](../release/google-play/graphics/feature-ko-KR.png) 1024×500 소개 그래픽 준비. 실제 앱 화면 최소 2장 필요. 기존 브라우저 대역 캡처를 실제 앱 검증 결과로 쓰지 않는다. |
| 데이터 보안 | 아래 데이터 흐름에 따라 앱 간 전송·AI 제공자 전송 및 사용자 요청 예외 적용 여부를 확정한다. |
| 앱 액세스 | Termux 설치·연동·브리지 연결·에이전트 로그인까지 심사자가 재현할 안내와 필요한 테스트 접근 제공 필요. |
| 포그라운드 서비스 | `specialUse` 선언 사유·사용자 영향·실제 시연 영상 준비 필요. |
| 실제 동작 | 새 기기 설치, Android 권한, WebView/IME, 백그라운드/잠금 화면 알림, 세 에이전트의 실제 응답·승인·재접속 검증 필요. |

신규 앱은 Android App Bundle과 Play App Signing을 사용한다. 패키지 이름은 등록 후 변경할 수 없으며, 업데이트마다 versionCode를 올린다. target API 36은 현재 신규 제출 요구사항에 맞는다. [앱 등록](https://support.google.com/googleplay/android-developer/answer/9859152), [API 요구사항](https://support.google.com/googleplay/android-developer/answer/11926878), [앱 서명](https://support.google.com/googleplay/android-developer/answer/9842756).

## 조직 계정 확인

기존 조직 계정에서 조직·신원 인증이 완료됐는지 확인한다. 조직의 법적 이름·주소와 연결된 결제 프로필, D-U-N-S 정보가 필요한 인증 항목이며 일부 정부 기관 등의 예외는 Google 안내를 따른다. 조직 웹사이트와 연락처, 공개 개발자 이메일·전화번호도 계정에서 확인한다. Google에만 제공하는 연락처와 Play에 공개되는 연락처는 구분한다. [조직 계정 정보와 인증](https://support.google.com/googleplay/android-developer/answer/13628312).

스토어·개인정보처리방침의 운영 주체에는 실제 조직명을 사용하고, 사용자가 연락할 수 있는 공개 지원 이메일을 지정한다. 조직명·지원 이메일·조직 웹사이트 주소는 아직 미정이다. 공개 정책은 기존 조직 웹사이트의 접근 가능한 페이지로 제공할 수 있다.

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

실제 서명 빌드는 저장소 밖의 업로드 키를 준비한 뒤 실행한다. 아래는 소유자가 직접 키와 비밀번호를 관리하는 예시이며 이번 작업에서 키를 생성하지 않았다. 비밀번호를 채팅·문서·명령 인수에 쓰지 않는다. 명령은 Bash에서 실행한다.

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

출력은 `dist/play/bibimer-<versionName>-<versionCode>-release.aab`, 같은 이름의 `.json`(버전·서명 여부·SHA-256), `bibimer-setup.sh`다. 마지막 APK와 운영 브리지는 자동으로 교체하지 않는다. 첫 내부 테스트 업로드 전에 버전 코드를 결정한다. 현재 코드 23이 Play에서 사용된 적 있는지는 Console에서 확인한다.

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

개인정보처리방침은 로그인·지역 제한 없는 공개 웹 주소로 제공하고 앱에서도 접근할 수 있어야 한다. 비공개 GitHub 문서는 공개 주소를 대체하지 못한다. `bibimer.app`은 아직 확보된 도메인이 아니므로 실제 정책 주소로 등록하지 않는다. [사용자 데이터 정책](https://support.google.com/googleplay/android-developer/answer/10144311).

## 스토어 문구와 그래픽

`release/google-play/listing.json`은 업로드 도구용 API 요청이 아닌 등록 내용 초안이다. 두 언어의 제목·짧은 설명·전체 설명을 각각 30·80·4,000자 이내로 작성했다. 미정인 가격·국가·연락처·정책 URL은 자동 제출하지 않는다.

`release/google-play/graphics/`의 아이콘은 기존 B 심벌의 도형·색상을 유지하고 Play가 마스킹할 정사각형으로 출력했다. 소개 그래픽의 BIBIMER 텍스트는 앱에 포함된 Space Grotesk Bold를 사용한다. 우측 프로젝트·대화·터미널 그림은 기능을 설명하는 도형이며 실제 앱 스크린샷이 아니다.

현재 UI 검증 환경의 `playwright-core`, Termux `headless_shell`, ImageMagick이 준비되어 있으면 다음 명령으로 다시 출력한다.

```sh
node scripts/export_play_graphics.cjs
```

출력 규격은 512×512 RGBA PNG 아이콘, 1024×500 RGB PNG 소개 그래픽이다. 실제 화면 캡처는 개인 데이터 없는 전용 테스트 프로젝트에서 준비하고, 전화기 스크린샷은 JPEG 또는 RGB PNG, 각 변 320~3,840px, 긴 변이 짧은 변의 2배 이하인 규격을 확인한다. [Play 이미지 요구사항](https://support.google.com/googleplay/android-developer/answer/9866151).

## Termux 연동과 심사

앱은 사용자 허용 후 `RUN_COMMAND`로 같은 폰의 Termux에서 내장 브리지 설치 작업을 실행한다. Python이 없으면 Termux 패키지 관리자가 설치한다. 별도 설치 스크립트에는 선택적 Claude SDK 및 CLI 복구 경로도 있다. Android 앱 자체의 코드·리소스는 Play 배포물에 포함하며 WebView는 내장 리소스만 읽는다.

외부 실행 코드 다운로드·다른 앱 연동은 [Device and Network Abuse 정책](https://support.google.com/googleplay/android-developer/answer/16559646)에 비추어 전체 동작을 설명해야 한다. **Termux에서 실행한다는 이유만으로 자동 면제라고 단정하지 않는다.** 자동 설정부터 에이전트 준비까지 다운로드 대상·실행 주체·권한·사용자 동작을 심사 안내에 기록한다. Google의 해당 구조 허용 여부는 아직 확인되지 않았다.

심사 접근 안내는 [설정 가이드](setup.md)를 바탕으로 영어로 제공한다. Termux 배포처·버전, 최초 실행, Android 명령 권한, `allow-external-apps`, 자동/수동 코드 연결, 샘플 프로젝트 등록, 실제로 검증한 에이전트의 준비·로그인·응답 확인까지 포함한다. 심사에 필요한 유효한 계정 정보는 Console의 비공개 앱 액세스 항목으로 제공하고 저장소·공개 문서에 넣지 않는다. 시연 영상만으로 기능 접근을 대신했다고 간주하지 않는다.

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
