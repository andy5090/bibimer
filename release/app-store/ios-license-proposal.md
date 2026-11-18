# iOS 라이선스 적용안 — 승인 전 초안

이 문서는 검토안이며 라이선스를 부여하지 않는다. 사용자 승인 전 `LICENSE` 또는 배포물에 새 라이선스 부여 문구를 넣지 않는다.

## 적용하려는 범위

- Bibimer iOS 배포물을 구성하는 Andineering 소유 코드: `ios/app/`, `ios/bridge/`, `ios/runtime-lab/`의 Bibimer 작성 부분과 iOS 패키징에 포함되는 공통 `bridge/` 및 `android/app/src/main/assets/` 부분.
- 위 코드가 Bibimer iOS 배포물/대응 소스로 제공될 때 GPL version 3로 이용·수정·재배포할 수 있도록 허락한다.
- 다른 저작권자의 코드·서체·정적 웹 라이브러리·별도 Linux 프로그램에는 각자의 원래 라이선스가 적용된다.
- Android 앱 배포 전체나 웹사이트 전체에 대한 별도 라이선스 변경을 의도하지 않는다. 공통 소스는 iOS 대응 소스의 일부로 받을 때 위 허락을 받는 범위를 명시한다.
- Apple App Store 약관과 GPL의 충돌만으로 배포를 막지 않도록 upstream `LICENSE.IOS`와 같은 범위의 추가 허락을 Bibimer 소유 iOS 코드에도 제공한다. GPL의 소스·고지·수정 권리는 유지한다.

## 승인 뒤 제공할 자료

1. GPLv3 전체 원문과 upstream 라이선스/예외 원문.
2. 실제 제출 후보의 고정 Git 커밋, 빌드/설치 절차, 정확한 upstream 커밋과 적용 패치.
3. 번들 Alpine15개 패키지의 정확한 버전·라이선스·aports recipe 커밋 및 원본 소스 경로.
4. 앱 설정에서 접근할 수 있는 라이선스/소스 안내.

이 검토안은 모든 저작권자의 별도 권리나 Apple의 심사 승인을 대신하지 않는다. 원래 라이선스와 실제 배포 구조를 유지하며 교육 앱 등 다른 제품으로 설명하지 않는다.

확인 근거: [고정 런타임 LICENSE.md](https://github.com/dnakov/litter-ish/blob/c8e9dcb954963b0d9f359b3ad9da871f19b28652/LICENSE.md), [고정 런타임 LICENSE.IOS](https://github.com/dnakov/litter-ish/blob/c8e9dcb954963b0d9f359b3ad9da871f19b28652/LICENSE.IOS), [GPLv3 원문](https://www.gnu.org/licenses/gpl-3.0.html).
