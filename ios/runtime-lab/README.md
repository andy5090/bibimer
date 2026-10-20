# Bibimer iOS 실행 환경 실험

독립 iOS 앱 안에 ARM64 Linux 실행 환경을 넣고, CLI 설치·입출력·프로세스 제어를 검증하는 기술 실험이다. 별도 a-Shell/iSH 앱이나 원격 개발 호스트에 연결하지 않는다. 이 폴더는 실행 환경 검증 도구이며, Bibimer UI를 연결한 개발 앱은 [`../app/`](../app/README.md)에 있다. 공개 배포판은 아니다. Android 앱·Termux 브리지·공개 제품 문구는 변경하지 않는다.

## 구성

- `Sources/main.m`: UIKit 명령 입력/출력 화면, 앱 샌드박스의 영속 rootfs, 시스템 DNS 반영, native stdin/stdout 연결, 종료 결과 기록.
- `Sources/RuntimeSupport.c`: 게스트 장치 초기화. 실제 명령은 Linux 게스트의 `execve`와 자식 프로세스에서 실행한다.
- `Resources/probe.sh`: 게스트 안에서 실행되는 실제 기능 검사. 인증 정보나 유료 모델을 사용하지 않는다.
- `patches/embedded-runtime.patch`: 고정 upstream에 적용하는 내장 앱 종료·PTY·신호·epoll·ARM64 명령·HTTP 파서 수정.
- `build.py`: 의존성 고정/검증, 시뮬레이터 또는 기기용 컴파일·링크, rootfs와 리소스 포함.
- `run_probe.py`: 전용 시뮬레이터에 설치·실행하고 증거 수집. 일반 사용자의 시뮬레이터를 대상으로 실행하지 않는다.
- `tests/verify_probe.py`: 필수 검사 전체 PASS, 완전한 요약, 실제 guest 종료 코드, 출력 EOF를 전제로 생성된 native 결과를 검사한다. 호스트 런타임 오류·미완료·타임아웃을 성공으로 취급하지 않는다.

런타임은 [ios-linuxkit](https://github.com/dnakov/litter-ish)의 C FFI와 정적 라이브러리를 재사용한다. iSH 파생 프로젝트의 CPU 해석·Linux syscall 호환 계층이며, 완전한 Linux 커널/가상 머신이 아니다. 호스트 iOS에서 `fork`/`posix_spawn`으로 명령을 실행하지 않는다. CPU 가상화나 JIT entitlement를 추가하지 않는다.

## 고정 입력과 준비물

- ios-linuxkit commit: `c8e9dcb954963b0d9f359b3ad9da871f19b28652`
- 현재 승인 patch SHA256: `29dabdb385b105b31c58b5d2d1d5958a216028d2113448eaa8b185233b09c0c8` (2026-10-21 ARM64 halfword lane 수정). 이전 빌드의 실행 결과와 최신 재검증 범위는 [검증 기록](VALIDATION.md)에서 구분한다.
- Alpine ARM64: `alpine-minirootfs-3.21.0-aarch64.tar.gz`
- SHA256: `f31202c4070c4ef7de9e157e1bd01cb4da3a2150035d74ea5372c5e86f1efac1`
- 빌드 도구: Meson 1.9.1, Ninja 1.13.0. 저장소의 `.tools/ios-runtime/build-venv`에만 설치한다.
- Apple Silicon Mac, Xcode와 iOS Simulator runtime, Python 3, LLVM+lld(AArch64 ELF VDSO용), Homebrew libarchive 헤더/라이브러리, Git·sqlite3가 필요하다.
- 현재 빌더는 이 Mac의 Homebrew LLVM 21/lld 21 및 libarchive 경로를 지원한다. Intel Mac이나 다른 개발 환경은 검증하지 않았다.

런타임은 `.tools/ios-runtime/ios-linuxkit`에 받고 승인된 패치 외 수정이 있으면 빌드를 거절한다. 패치/실제 diff/rootfs/probe 해시를 `build-manifest.json`에 기록한다. APK 패키지는 공식 Alpine 버전 저장소의 서명·TLS 검증을 유지하되 최신 보안 패치를 따라가므로 모든 실행이 동일한 패키지 버전이라는 의미는 아니다. 실제 패키지 목록은 probe 출력에 남긴다.

## 실행

저장소 루트에서:

```sh
python3 ios/runtime-lab/build.py
python3 ios/runtime-lab/run_probe.py --tier basic --timeout 120
python3 ios/runtime-lab/run_probe.py --tier persistence --timeout 90
python3 ios/runtime-lab/run_probe.py --tier shutdown --timeout 25
python3 ios/runtime-lab/run_probe.py --tier packages --timeout 900
python3 ios/runtime-lab/run_probe.py --tier agents --timeout 1450
```

`packages`는 첫 실행에 인터넷에서 도구를 설치한다. `agents`는 `packages` 이후 실행한다. `persistence`는 `basic`이 저장한 파일을 앱 종료·재실행 후 확인한다. `shutdown`은 잠든 자식과 TERM을 무시하는 자식을 남기고 init을 종료해, UIKit 앱을 유지한 채 정리되는지 확인한다.

제품에 연결하는 네 CLI의 실제 도구 검사는 별도다. 아래 명령은 CLI와 같은 게스트의 합성 모델 응답 서버를 사용한다. 실제 계정이나 유료 API를 사용하지 않는다. OpenCode는 고정1.19.3의 출력 수집 호환 패치 복사본을 사용하며 npm 원본은 유지한다. 검사 성공 여부는 [검증 기록](VALIDATION.md)을 확인한다.

```sh
python3 ios/runtime-lab/run_probe.py --tier codex-external --timeout 180
python3 ios/runtime-lab/run_probe.py --tier claude-sdk --timeout 700
python3 ios/runtime-lab/run_probe.py --tier gemini-acp --timeout 700
python3 ios/runtime-lab/run_probe.py --tier opencode-compat-search --timeout 750
python3 ios/runtime-lab/run_probe.py --tier opencode-shell-edges --timeout 1150
```

`opencode-shell-edges`는 앞선 설치가 필요하며 exit7·큰 출력·timeout·명시적 중단을 실제 프로세스와 native 이벤트로 확인한다. 수정하지 않은 원본의 `opencode-provider`·구버전·preload tier는 실패 재현용이며 제품 성공 검사로 간주하지 않는다.

실행 엔진 회귀에는 `kernel-runtime`, `bridge-pty`, `epoll-runtime`, `compute-signal`, `arm64-fp`, `arm64-simd-lanes`, `bun-math`, `bun-process`, `memory-fault`, `signal-stack`을 사용한다. `arm64-simd-lanes`는 single-structure load/store1440개 조합과 원본 Codex rustls 서명 목록의 gather 명령열을 검사한다. `tests/test_runtime_rwlock.c`는 Darwin 호스트에서 런타임의 실제 잠금 래퍼와 원본 pthread 대조군을 비교한다. guest 검사를 대신하지 않는다.

시뮬레이터 ID는 `.tools/ios-runtime/simulator-id.txt`에 보관한다. `--device`를 지정해도 이름이 `Bibimer Runtime Lab`인 시뮬레이터만 사용한다. probe를 실행할 때 해당 실험 앱만 종료·재실행한다. rootfs는 유지된다. 다른 프로젝트·Android·Termux 세션은 다루지 않는다.

일반 명령 입력은 설치된 앱을 probe 인자 없이 실행한다. 화면의 입력창과 Run 버튼으로 명령을 보낼 수 있다. 자동 probe도 같은 native stdin 경로로 셸에 명령을 전달한다.

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl launch --terminate-running-process <전용-시뮬레이터-ID> app.bibimer.runtime-lab
```

현재 화면은 **파이프 기반 명령 실행기**다. ANSI 터미널, 대화형 TUI 키 입력, 창 크기 변경, 여러 UI 세션은 구현하지 않았다. 게스트 내부 PTY는 별도 Python 검사로 검증한다. 일반 명령의 출력은 화면에만 보관하며, probe 모드의 합성 데이터/설치 결과만 Documents에 파일로 기록한다. 자격 증명을 입력하는 용도로 사용하지 않는다.

기기용 컴파일·링크:

```sh
python3 ios/runtime-lab/build.py --sdk iphoneos
```

이 산출물은 개발자 서명·프로비저닝을 하지 않은 `.app`이다. **기기용 빌드 성공은 실제 iPhone 설치·실행 성공을 뜻하지 않는다.** 실제 기기 설치에는 별도 서명 설정과 연결된 기기가 필요하다.

## 증거와 검사

`auth-network`는 고정 public URL의 DNS·UTC·Python/curl TLS와 **원본 Codex의 실제 TLS 요청**을 비교한다. Codex는 실제 인증 endpoint 대신 존재하지 않는 고정 issuer 경로를 사용하므로 HTTP 오류 응답까지 도달하는지만 검사한다. 응답 본문·인증 코드·토큰은 기록하지 않고 실제 인증이나 모델 요청을 완료하지 않는다. 별도 lab rootfs에 기존 Codex 인증 파일이 있으면 읽지 않고 중단한다. 기본 환경·명시 CA·IPv4 hosts 대조·CA 디렉터리·제한된 native TLS 진단의 다섯 경우 모두 실제 HTTP 응답에 도달해야 통과한다. hosts 대조는 이 lab 안에서만 일시 적용하고 복원한다. 이 검사는 현재 사용자 Bibimer 앱을 종료하거나 사용자 세션에 입력하지 않는다.

```sh
python3 ios/runtime-lab/run_probe.py --tier auth-network --timeout 150
```

검증기는 다섯 Codex 결과를 독립적으로 확인한 뒤에만 정확한 `connect … errno=65` 진단을 경고로 보존한다. 시험 네트워크에서 의도적으로 확인한 IPv6 도달 실패와 정상 클라이언트의 주소 fallback도 이 경고에 남으며 깨끗한 PASS로 표시하지 않는다. 다른 오류·native panic·전송 실패를 무시하지 않는다. 실제 계정 로그인 완료 여부는 사용자의 원래 인증 흐름에서 별도로 확인해야 한다.

`dist/ios-runtime-lab/<tier>/`에 guest 출력, native 종료/시간 JSON, 빌드 manifest, 실행 정보와 실제 실행 바이너리 해시, host console, screenshot을 모은다. 재실행 전 기존 파일을 `history/`에 보존하고 현재 결과를 비워 오래된 성공이 섞이지 않게 한다. 실행 전 manifest를 고정해 도중 다른 빌드와 섞이지 않게 한다. timeout에서는 완료 JSON을 만들지 않으며 실패로 끝난다. 실행 중 앱이 사라져도 실패한다. 저장소에는 바이너리/rootfs/다운로드 파일/실행 로그를 커밋하지 않는다.

```sh
python3 -m unittest discover -s ios/runtime-lab/tests -v
python3 ios/runtime-lab/tests/verify_probe.py --tier packages --documents dist/ios-runtime-lab/packages
```

Python 단위 검사는 증거 판정기의 검사이며 실제 iOS 실행 증거를 대신하지 않는다. 실제 실행 결과와 남은 제약은 [검증 기록](VALIDATION.md)을 따른다.

## 내장용 패치와 남은 경계

1. **호스트 앱 종료 방지:** upstream init 종료 경로의 host `SIGTERM`/`_exit` 대신 guest TERM/KILL을 전달한다. 대기 중 `pids_lock`을 풀어 자식이 종료할 수 있게 한다. 정리가 안 되면 mount를 해제하지 않고 실패 표식을 남긴다.
2. **PTY 출력 보존:** slave가 닫혀도 master에 남은 출력부터 읽는다. 빠르게 종료하는 자식의 마지막 출력이 사라졌던 실제 probe 실패를 수정한다.
3. **신호로 sleep 중단:** GCD에서 상속된 host SIGUSR1 차단을 guest pthread에서 풀고, guest pending 확인과 host sleep 진입을 `pselect`로 동기화한다. 상대 sleep의 EINTR 잔여 시간도 처리한다.
4. **실제 CLI 회귀:** 부모 사망 신호·스레드 공유 pending, epoll의 복제FD별 watch와 ONESHOT, compute-only 작업의 중단, ARM64 FP 즉시값과 변환, jitless Node의 llhttp HTTP ABI를 수정한다. 범위별 원본 CLI 및 명령 검사를 함께 둔다.
5. **Darwin 잠금 경합:** 빈번한 SIGUSR1 중 rwlock 대기열이 소유자 없이 멈추는 host 재현을 확인했다. 경합 중인 blocking 잠금 획득에서만 SIGUSR1을 보류하고 원래 마스크를 복원한다. guest 동시 lazy-page/COW 검사와 실제 OpenCode 후속 검증은 별도로 기록한다.
6. **ARM64 halfword lane:** LD/ST single-structure의16비트 lane 인덱스를 ARM 명세의 `Q:S:size<1>`로 해석한다. 홀수 lane이 앞 칸을 덮어 원본 Codex의 P521 서명 항목을 유실시키던 결함을 수정했고, 같은1440개 조합의 수정 전 실패·수정 후 성공을 보존한다.

이 패치는 upstream 전체 호환성을 보장하지 않는다. 특히 모든 condition-variable 대기, guest process crash 복구, 다중 장기 세션, 메모리 압박, OS 강제 종료, 백그라운드 지속 실행은 추가 검증 대상이다. 런타임은 앱 프로세스당 하나이고, 종료 뒤에는 앱을 재실행한다. 저장된 파일과 살아 있는 프로세스의 복원을 구분한다.

Node는 이 런타임의 upstream 처리에 따라 jitless 옵션이 적용될 수 있다. 임의 npm 패키지·네이티브 확장·WASM·Docker를 지원한다고 일반화하지 않는다. CLI의 설치와 `--version` 성공도 인증된 실제 에이전트 작업을 증명하지 않는다.

## 라이선스와 제품화

런타임의 [LICENSE.md](https://github.com/dnakov/litter-ish/blob/c8e9dcb954963b0d9f359b3ad9da871f19b28652/LICENSE.md)는 GPL이다. [LICENSE.IOS](https://github.com/dnakov/litter-ish/blob/c8e9dcb954963b0d9f359b3ad9da871f19b28652/LICENSE.IOS)는 App Store 약관 충돌에 관한 제한된 예외이며 GPL의 소스·라이선스 제공 의무는 유지한다. 빌드 산출물에는 두 원문을 포함한다. 배포 형태와 소스 제공 범위는 제품화 전에 검토해야 한다. 이 실험은 외부 배포나 App Store 심사 통과를 의미하지 않는다.

Bibimer의 프로젝트·워크트리·세션·구조화된 에이전트 이벤트 연결은 별도 iOS 앱에서 진행한다. Android 원본을 교체하지 않고 재사용하며, 해당 앱의 검사 결과는 [`../app/VALIDATION.md`](../app/VALIDATION.md)를 따른다.
