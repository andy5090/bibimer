# iOS 라이선스 적용 — 승인 및 반영 기록

2026-11-19 사용자가 **“iOS GPLv3 제공에 동의”**라고 명시 승인했다. 승인한 아래 범위를 [효력 있는 라이선스](../../ios/LICENSE.md), [App Store 추가 허락](../../ios/LICENSE.IOS), [GPLv3 전문](../../ios/COPYING)에 반영했다. 이 문서는 승인·구현 기록이며 실제 허락의 원문은 위 라이선스 파일이다.

## 승인·적용한 범위

- Bibimer iOS 배포물을 구성하는 Andineering 소유 코드: `ios/app/`, `ios/bridge/`, `ios/runtime-lab/`의 Bibimer 작성 부분과 iOS 패키징에 포함되는 공통 `bridge/` 및 `android/app/src/main/assets/` 부분.
- 위 코드가 Bibimer iOS 배포물/대응 소스로 제공될 때 GPL version 3로 이용·수정·재배포할 수 있도록 허락한다.
- 다른 저작권자의 코드·서체·정적 웹 라이브러리·별도 Linux 프로그램에는 각자의 원래 라이선스가 적용된다.
- Android 앱 배포 전체나 웹사이트 전체에 대한 별도 라이선스 변경을 의도하지 않는다. 공통 소스는 iOS 대응 소스의 일부로 받을 때 위 허락을 받는 범위를 명시한다.
- Apple App Store 약관과 GPL의 충돌만으로 배포를 막지 않도록 upstream `LICENSE.IOS`와 같은 범위의 추가 허락을 Bibimer 소유 iOS 코드에도 제공한다. GPL의 소스·고지·수정 권리는 유지한다.

## 배포물과 함께 제공·확인할 자료

1. `ios/LICENSE.md`, `ios/LICENSE.IOS`, `ios/COPYING`과 upstream 라이선스/예외 원문. 패키징은 앱의 `Web/BIBIMER-LICENSE.md`, `Web/BIBIMER-LICENSE.IOS`, `Web/GPL-3.0.txt`와 Settings 법적 고지에 원문을 제공하고 소스 법문과 일치하는지 검사한다.
2. 실제 제출 후보의 고정 Git 커밋, 빌드/설치 절차, 정확한 upstream 커밋과 적용 패치.
3. 번들 Alpine15개 패키지의 정확한 버전·라이선스·aports recipe 커밋 및 원본 소스 경로.
4. 앱 설정에서 접근할 수 있는 라이선스/소스 안내. 새 허락의 소스·패키징 회귀와 실제 GUI 표시, 최종 후보 커밋/공개 소스 연결은 배포 전에 확인한다.

위 허락은 Andineering 소유 부분에 적용하며 수령자의 GPL 권리를 특정 플랫폼 사용으로 제한하지 않는다. 타 저작권자의 별도 권리나 Apple의 심사 승인을 대신하지 않는다. 원래 라이선스와 실제 배포 구조를 유지하며 교육 앱 등 다른 제품으로 설명하지 않는다.

확인 근거: [고정 런타임 LICENSE.md](https://github.com/dnakov/litter-ish/blob/c8e9dcb954963b0d9f359b3ad9da871f19b28652/LICENSE.md), [고정 런타임 LICENSE.IOS](https://github.com/dnakov/litter-ish/blob/c8e9dcb954963b0d9f359b3ad9da871f19b28652/LICENSE.IOS), [GPLv3 원문](https://www.gnu.org/licenses/gpl-3.0.html).
