# iOS runtime and corresponding sources

Checked 2026-11-19. These are source and build references for the actual bundled interpreter and Alpine base filesystem. They are not an assertion that every user-installed CLI shares the same license.

## Bibimer and interpreter

- Bibimer iOS source and build instructions: [repository](https://github.com/andy5090/bibimer/tree/main/ios), `ios/app/build.py`, `ios/app/distribute.py`, and `ios/runtime-lab/build.py`. The final submission receipt records the exact Bibimer commit.
- Interpreter upstream: [dnakov/litter-ish at c8e9dcb954963b0d9f359b3ad9da871f19b28652](https://github.com/dnakov/litter-ish/tree/c8e9dcb954963b0d9f359b3ad9da871f19b28652).
- Applied modifications: [embedded-runtime.patch](https://github.com/andy5090/bibimer/blob/main/ios/runtime-lab/patches/embedded-runtime.patch), SHA-256 `29dabdb385b105b31c58b5d2d1d5958a216028d2113448eaa8b185233b09c0c8`. Apply it to the pinned upstream, then follow the runtime/application README build steps.
- Preserve [upstream GPL notices](https://github.com/dnakov/litter-ish/blob/c8e9dcb954963b0d9f359b3ad9da871f19b28652/LICENSE.md) and the [limited App Store additional terms](https://github.com/dnakov/litter-ish/blob/c8e9dcb954963b0d9f359b3ad9da871f19b28652/LICENSE.IOS). The latter do not waive corresponding-source obligations.
- Andineering-owned Bibimer iOS code is licensed under [GPL version 3](../../ios/LICENSE.md), with the limited [App Store additional permission](../../ios/LICENSE.IOS); the [full GPL text](../../ios/COPYING) accompanies the source. This effective grant covers the Andineering-owned iOS application, bridge/runtime integration and shared source actually packaged for iOS, while preserving third-party terms. It does not relicense the entire Android application or website, or restrict a GPL recipient to iOS use. The [approval record](ios-license-proposal.md) records the authorized scope.

## Bundled Alpine base filesystem

Original archive: `alpine-minirootfs-3.21.0-aarch64.tar.gz`; SHA-256 `f31202c4070c4ef7de9e157e1bd01cb4da3a2150035d74ea5372c5e86f1efac1`. This list is read from that archive’s `/lib/apk/db/installed`, rather than from a user’s modified app container.

Each recipe below is pinned to the actual package database’s `c:` aports commit. Its directory contains the build recipe, configuration and patches; the recipe names the upstream source archives and checksums. Source archives are available from the upstream URL in the recipe or [Alpine’s v3.21 distfile mirror](https://distfiles.alpinelinux.org/distfiles/v3.21/). The machine-readable inventory also records recipe hashes.

| Package | Version | License | Exact source/build directory |
| --- | --- | --- | --- |
| alpine-baselayout | 3.6.8-r0 | GPL-2.0-only | [alpine-baselayout](https://github.com/alpinelinux/aports/tree/82d6c06a6d6e8de20a4db05994da6046f0623af3/main/alpine-baselayout) |
| alpine-baselayout-data | 3.6.8-r0 | GPL-2.0-only | [alpine-baselayout](https://github.com/alpinelinux/aports/tree/82d6c06a6d6e8de20a4db05994da6046f0623af3/main/alpine-baselayout) |
| alpine-keys | 2.5-r0 | MIT | [alpine-keys](https://github.com/alpinelinux/aports/tree/6d473fb38effb2389f567b29fb7eb27039b3a279/main/alpine-keys) |
| alpine-release | 3.21.0-r0 | MIT | [alpine-base](https://github.com/alpinelinux/aports/tree/59962f87e4603deb5bb4d237927fd7eb84c7c9c9/main/alpine-base) |
| apk-tools | 2.14.6-r2 | GPL-2.0-only | [apk-tools](https://github.com/alpinelinux/aports/tree/85fce5ac38cd9990b8910637d750591e3ef55a6c/main/apk-tools) |
| busybox | 1.37.0-r8 | GPL-2.0-only | [busybox](https://github.com/alpinelinux/aports/tree/79fddc2aa9c64c47fb3da6edeae9570b4e9caa7e/main/busybox) |
| busybox-binsh | 1.37.0-r8 | GPL-2.0-only | [busybox](https://github.com/alpinelinux/aports/tree/79fddc2aa9c64c47fb3da6edeae9570b4e9caa7e/main/busybox) |
| ca-certificates-bundle | 20241010-r0 | MPL-2.0 AND MIT | [ca-certificates](https://github.com/alpinelinux/aports/tree/537f890454d2213fd05cde5e458dfa9c8ef1977f/main/ca-certificates) |
| libcrypto3 | 3.3.2-r4 | Apache-2.0 | [openssl](https://github.com/alpinelinux/aports/tree/e18f4d0c2080542ef5c4fd329a5be584064658aa/main/openssl) |
| libssl3 | 3.3.2-r4 | Apache-2.0 | [openssl](https://github.com/alpinelinux/aports/tree/e18f4d0c2080542ef5c4fd329a5be584064658aa/main/openssl) |
| musl | 1.2.5-r8 | MIT | [musl](https://github.com/alpinelinux/aports/tree/c1ab9dfcb36751c3e9097f0f67e01ad12b2e1f5f/main/musl) |
| musl-utils | 1.2.5-r8 | MIT AND BSD-2-Clause AND GPL-2.0-or-later | [musl](https://github.com/alpinelinux/aports/tree/c1ab9dfcb36751c3e9097f0f67e01ad12b2e1f5f/main/musl) |
| scanelf | 1.3.8-r1 | GPL-2.0-only | [pax-utils](https://github.com/alpinelinux/aports/tree/398a5aee3025ec8a4d0d761e448dc86ac777fa09/main/pax-utils) |
| ssl_client | 1.37.0-r8 | GPL-2.0-only | [busybox](https://github.com/alpinelinux/aports/tree/79fddc2aa9c64c47fb3da6edeae9570b4e9caa7e/main/busybox) |
| zlib | 1.3.1-r2 | Zlib | [zlib](https://github.com/alpinelinux/aports/tree/4c2722e7ecc1c5e3ba882429044a101497121223/main/zlib) |

## Other components and installation

- System UIKit/Foundation/WebKit/Speech/Security/SQLite/resolver frameworks are linked as Apple system libraries. Homebrew libarchive is used by the host filesystem conversion tool; it is not linked into the app executable by the app build command.
- Shared web assets preserve their bundled licenses: xterm.js and addon-fit (MIT), marked (MIT), highlight.js (BSD-3-Clause), Space Grotesk (SIL OFL), and other included vendor notices. See `android/app/src/main/assets/vendor/` and `fonts/` in the corresponding source.
- The app preserves `Runtime-LICENSE.md`, `Runtime-LICENSE.IOS`, web vendor/font notices and `Guest/ios/LICENSE.OPENCODE`. It also bundles the effective Bibimer grant, additional permission and GPLv3 text as `Web/BIBIMER-LICENSE.md`, `Web/BIBIMER-LICENSE.IOS` and `Web/GPL-3.0.txt`. The Settings legal/source screen exposes the Bibimer grant/permission, runtime texts, Alpine notices and source references. Packaging rejects a Bibimer notice that differs from its source license file.
- First-run development packages and later user-selected agents are downloaded separately. Their versions and terms may differ from this base archive. `apk info -v`, `apk info -L <package>` and the Alpine package database identify installed versions; the package origin/commit locates the corresponding Alpine build sources.
- The app does not describe downloaded programs as static data or claim educational status to avoid Apple review. It uses an interpreter without JIT entitlements; Apple makes the App Store policy classification decision.

The source references and exact-package inventory do not replace the individual licenses. Retain copyright and license texts when distributing modified or unmodified components.
