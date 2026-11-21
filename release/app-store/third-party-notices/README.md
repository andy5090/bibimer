# Alpine base-filesystem notice materials

Checked 2026-11-19. These files preserve upstream attribution and license material for the 15 APK packages in Bibimer's original Alpine minirootfs 3.21.0 aarch64 archive. The machine-readable package inventory is `../runtime-packages.json`. No downloaded package, script or build recipe was executed or installed to collect this material.

The app resource `ios/app/Resources/alpine-notices.json` groups the 15 packages by their 10 source origins. Each component has the packaged names and versions, exact aports commit/recipe URL/hash, notice text, and source-file provenance. The application displays these materials alongside its separate `GPL-2.0.txt` and `GPL-3.0.txt` documents. GPL full texts are not duplicated here.

For seven upstream releases, the downloaded archive's SHA-512 was compared with the exact package's APKBUILD checksum before reading it: apk-tools 2.14.6, BusyBox 1.37.0, ca-certificates 20241010, musl 1.2.5, OpenSSL 3.3.2, pax-utils 1.3.8 and zlib 1.3.1. `provenance.json` records their original URLs and SHA-256/SHA-512 values. musl-utils' Alpine `getconf.c`, `getent.c` and `iconv.c` notices come from the package database's pinned aports commit; the two NetBSD notices contain their BSD permission and disclaimer. Debian netbase v6.4 protocol/service source headers were fetched from Alpine's mirror and verified against APKBUILD checksums after the original host returned a challenge page; that challenge was neither executed nor treated as source.

License material includes musl's COPYRIGHT and third-party notices, OpenSSL's complete Apache-2.0 license and authors, zlib's license, the Mozilla certificate-data license header and Mozilla's complete MPL-2.0 text, package authors, and verbatim source copyright/license comment blocks. The BusyBox GPL-version-only note and the bzip2-derived source's license are preserved. Source comment blocks are presented with file-name labels; the blocks themselves are not rewritten. Source archive/recipe references explain how to obtain the corresponding sources and patches; see `../runtime-sources.md`.

## Limits

- Alpine's exact `alpine-keys` and `alpine-release` recipes declare MIT but their aports directories provide no separate MIT permission text or copyright-holder statement. We preserve the original recipes and maintainer attribution without inventing a copyright holder or license grant. The recipe's license metadata is not represented as an independent legal clearance.
- Automatic comment extraction examined the first 16,000 characters of UTF-8 C/C++/assembly files no larger than 250,000 bytes, plus the listed license/author documents. It is not an exhaustive audit of every build input. Some notices refer to source configurations, architectures or helper programs not enabled in the bundled binaries; retaining them does not assert that those programs are bundled.
- The bundled `ca-certificates-bundle` contains the certificate bundle and symlinks; its source origin's MIT c_rehash attribution is retained without claiming that the helper binary is included.
- Notices and source URLs do not by themselves establish all corresponding-source, modification, patent, trademark or App Store distribution obligations. Additional user-installed packages and agents are outside this base-filesystem inventory.

All exact notice-file hashes and extraction kinds are recorded in `provenance.json`. Network archives and collection receipts are private working evidence under `dist/ios-appstore/submission-nov19/upstream-notice-sources/`.
