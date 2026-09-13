# Bibimer 설치 및 사용 안내

## 필요한 앱과 도구

- Bibimer Android 앱: 이 저장소에서 빌드한 `dist/bibimer-debug.apk`.
- 같은 휴대폰의 Termux.
- 브리지용 Python: 설정 파일이 없을 때 설치한다.
- 실제 작업에 사용할 에이전트와 개발 도구: 사용자 프로젝트에 맞게 Termux에 준비한다.

현재는 개발용 APK이며 공개 배포 채널은 없다. APK는 이 저장소의 [빌드 안내](development.md)에 따라 만들 수 있다. APK 설치를 열면 Android의 설치 확인을 기기 화면에서 진행한다.

현재 테스트 폰에는 0.1.0이 설치되어 있다. 새 설치 파일은 **내 파일 → 다운로드 → Bibimer-0.1.1.apk**에서 열어 업데이트할 수 있다. 기존 설치본과 같은 개발용 키로 서명했다.

## 언어 선택

앱은 기기 언어와 관계없이 영어로 시작한다. **Setup → Language → 한국어**를 선택하면 한국어로 바뀌며 다음 실행에도 선택을 유지한다. 영어로 돌아가려면 **준비 → 언어 → English**를 선택한다. 언어 변경은 실행 세션을 종료하거나 작성 중인 입력을 지우지 않는다. 사용자 입력·프로젝트 이름·터미널 출력은 번역하지 않는다.

아래 안내는 기본 영어 버튼 이름과 한국어 이름을 함께 표기한다. 앱에서 복사하는 브리지 설치·시작 명령은 선택한 언어를 반영한다. 직접 실행하는 브리지 명령은 영어가 기본이며, 한국어 안내는 `BIBIMER_LANGUAGE=ko`를 명령 앞에 붙이거나 브리지의 `--language ko` 옵션으로 선택한다.

## Termux가 없는 경우

Bibimer의 **Setup(준비) → Installation guide(Termux 설치 안내)**에서 [F-Droid의 Termux 페이지](https://f-droid.org/packages/com.termux/)로 이동한다. 설치 후 Termux를 한 번 열고 초기 환경 준비를 마친다. Termux와 플러그인을 설치할 때는 [Termux 공식 설치 문서](https://github.com/termux/termux-app#installation)의 배포처·서명 안내를 따른다.

Bibimer가 Termux를 대신 설치하거나 Android의 설치 확인을 자동으로 처리하지는 않는다. 앱은 설치 안내, 설정 파일, 다음에 실행할 명령을 제공한다. Termux가 없는 새 기기에서 이 과정을 끝까지 진행하는 검증은 남아 있다.

## 브리지 설치

1. Bibimer의 **Setup(준비) → Save setup file(설정 파일 저장)**을 누른다.
2. Android 파일 저장 화면에서 다운로드(`Download`) 폴더를 선택하고 `bibimer-setup.sh` 이름으로 저장한다.
3. Termux에서 다음 명령을 실행하고 파일 접근 허용을 완료한다. 이미 `~/storage/downloads`를 사용할 수 있으면 이 단계는 생략한다.

   ```sh
   termux-setup-storage
   ```

4. 권한 허용이 끝나고 다운로드 폴더가 연결된 뒤 다음 명령을 실행한다.

   ```sh
   bash ~/storage/downloads/bibimer-setup.sh
   ```

   파일을 다른 위치·이름으로 저장했다면 경로를 맞춘다. 같은 이름의 기존 파일 때문에 `(1)` 같은 접미사가 붙지 않았는지도 확인한다.

5. Python이 없으면 Termux 패키지 저장소에서 설치한다. 이어서 브리지를 `~/.local/share/bibimer/`에 설치하고 `~/.local/bin/bibimer-bridge` 실행 파일을 만든다. 프로젝트 파일이나 에이전트 자격 증명은 이 설정 파일에 포함하지 않는다.
6. 브리지가 시작되면 Termux에 표시된 8자리 코드를 Bibimer의 **Connect this app(이 앱 연결)**에 입력한다. 코드는 5분 동안 한 번만 유효하며 5번 틀리면 다시 발급해야 한다.

이후 브리지를 시작하거나 새 연결 코드가 필요할 때는 아래 명령을 사용한다. 앱의 준비 화면에서 각 명령을 복사할 수 있다.

```sh
~/.local/bin/bibimer-bridge start
~/.local/bin/bibimer-bridge pair
~/.local/bin/bibimer-bridge status
```

`start`는 이미 같은 브리지가 실행 중이면 기존 세션을 유지하고 새 연결 코드를 발급한다. 연결 코드는 일반 로그로 출력하지 않으므로 Termux의 대화형 터미널에서 실행한다.

## 프로젝트와 첫 실행

연결 후 **Work(작업)** 화면에서 `~/projects/my-project` 같은 Termux 경로를 등록한다. 새 폴더가 필요하면 **Create the folder if it does not exist(폴더가 없으면 새로 만들기)**를 선택한다.

처음에는 **Terminal(터미널)**을 선택하고 **Start session(새 세션 시작)**을 누르면 셸의 출력·입력을 확인할 수 있다. 화면 아래 입력창에 명령을 입력하고 **Send(보내기)**를 누른다. Esc, Tab, 방향키, Ctrl+C, Enter 버튼으로 대화형 프로그램에도 입력할 수 있다.

Codex·Claude Code는 Termux에서 실행 가능하게 설치하고 로그인을 마친 뒤 선택한다. 준비 화면에 각 제품의 설치 문서 링크가 있다. 해당 문서의 일반 Linux 설치 절차가 Android/Termux에서도 동작한다고 가정하지 않는다.

현재 기기에서는 이미 설치된 Termux용 Codex 배포본의 대화형 시작 화면만 확인했다. 새 사용자를 위한 에이전트 설치 경로와 실제 모델 작업은 별도 검증 대상이다. 계정 키나 토큰은 Bibimer의 프로젝트 설정에 입력하지 않는다.

## 작업 이어가기와 종료

- 앱 화면 이동·닫기는 세션 종료를 요청하지 않는다. 브리지가 살아 있다면 앱을 다시 열어 같은 세션의 최근 출력을 확인하고 입력을 이어갈 수 있다.
- **Connected(기기 연결됨) / Disconnected(연결 끊김)**는 화면 연결 상태다. 연결이 끊기면 프로세스 상태는 마지막 확인 값으로 표시한다.
- **Stop this session(이 세션 종료)**는 확인 후 해당 세션과 일반적인 하위 작업을 중지한다. Ctrl+C는 현재 전경 작업에 인터럽트를 전달한다.
- Android가 Termux나 브리지를 종료하면 기존 프로세스에 다시 접근하지 못할 수 있다. 브리지 재시작 시 이전 실행을 **Session lost(세션 유실)**로 표시한다.
- 최근 출력은 메모리에 1MiB까지 유지한다. 오래된 출력이 생략되면 표시하며, 브리지 재시작 후 출력은 복원하지 않는다.

## 연결이 안 될 때

Termux에서 `status`로 브리지 연결 가능 여부를 확인하고, 실행되지 않았다면 `start`를 사용한다. 코드가 만료되었다면 `pair`로 새 코드를 발급한다. 포트 `8765`를 다른 프로그램이 사용하고 있으면 기본 앱 연결을 시작할 수 없다.

Android의 화면 잠금·배터리 제한·프로세스 종료에 따른 동작은 기기별 확인이 필요하다. [Termux 공식 저장소](https://github.com/termux/termux-app)의 Android 프로세스 제약 안내도 참고한다. Bibimer는 OS가 종료한 프로세스의 생존을 보장하지 않는다.
