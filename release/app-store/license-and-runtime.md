# 런타임·설치 소프트웨어 근거

기준 소스 `7741191`, 2026-11-18. 기술적 출처 목록이며 배포 라이선스 의무를 모두 검토했다는 확인서는 아니다.

| 구성 | 출처와 확인한 상태 |
| --- | --- |
| 앱 소스·빌드 절차 | GitHub `andy5090/bibimer`의 공개 저장소 상태를 연결 도구로 확인. [이번 후보의 고정 소스](https://github.com/andy5090/bibimer/tree/7741191def46e5bc6b475c4ada30435e3546c6cb) |
| 내장 해석기 | `dnakov/litter-ish`, 고정 커밋 `c8e9dcb954963b0d9f359b3ad9da871f19b28652`. [GPL 원문](https://github.com/dnakov/litter-ish/blob/c8e9dcb954963b0d9f359b3ad9da871f19b28652/LICENSE.md), [iOS 예외](https://github.com/dnakov/litter-ish/blob/c8e9dcb954963b0d9f359b3ad9da871f19b28652/LICENSE.IOS) |
| 해석기 수정 | [고정 후보의 embedded-runtime.patch](https://github.com/andy5090/bibimer/blob/7741191def46e5bc6b475c4ada30435e3546c6cb/ios/runtime-lab/patches/embedded-runtime.patch). 빌드 도구가 검증된 runtime diff·패치 해시 일치를 확인 |
| 내장 rootfs | Alpine minirootfs 3.21.0 aarch64. 원본 파일명·해시·리소스 해시를 앱 `build-manifest.json`에 유지 |
| 초기 설치 | `ios/bridge/bootstrap.sh`가 해당 Alpine 버전의 공식 HTTPS 저장소에서 CA 인증서·Python·Bash·Git·Node/npm·curl·jq·SQLite·GitHub CLI·ripgrep 및 의존성을 설치. 최초 준비에는 인터넷 필요 |
| 에이전트 CLI | 사용자가 선택한 도구만 고정 설치 작업으로 설치. CLI/의존성 버전·원본 출처·변환된 실행 사본은 `ios/bridge/run.py`와 각 호환 코드 기준. 원본을 앱이 작성한 도구로 소개하지 않음 |
| 번들 notice | 후보 IPA 안의 `Runtime-LICENSE.md`, `Runtime-LICENSE.IOS`, 게스트 OpenCode notice 포함 확인. 폰트·xterm 등 기존 웹 자산의 라이선스도 번들 구조 유지 |

## 정식 제출 전 확인

- 내장 rootfs·런타임·정적 링크 의존성과 사용자가 나중에 설치하는 CLI를 나눠 실제 버전/라이선스 목록을 확인한다.
- 공개 소스 경로가 존재하는 것과 필요한 대응 소스·빌드/설치 정보가 충분한지는 별도 검토한다. 런타임 예외를 모든 의존성의 App Store 배포 허가로 일반화하지 않는다.
- 앱 내에서 사용자가 관련 고지와 소스 제공 경로에 접근할 수 있는지 실제 기기에서 확인한다. 파일이 번들에 존재한다는 검사만으로 접근성까지 통과했다고 표시하지 않는다.
- Apple 심사 메모에는 실제 내려받는 실행 코드를 정확히 설명한다. 소스 공개만으로 Apple의 실행 코드 관련 분류가 확정됐다고 쓰지 않는다.
