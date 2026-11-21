# Bibimer iOS license

Copyright (c) 2026 Andineering.

Andineering licenses the covered Bibimer source code described below under
version 3 of the GNU General Public License (GPL-3.0-only), with the additional
App Store permission in `LICENSE.IOS`. This is an effective license grant,
approved on 2026-11-19.

The covered code is free software: you can redistribute it and/or modify it
under the terms of version 3 of the GNU General Public License as published by
the Free Software Foundation.

The covered code is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

The complete GPL version 3 text accompanies this notice in `COPYING`, and in the
app as `Web/GPL-3.0.txt`. If you did not receive it, see
<https://www.gnu.org/licenses/gpl-3.0.html>.

## Covered source

This grant covers the Andineering-owned portions of:

- `ios/app/`, including the application, packaging tools and tests;
- `ios/bridge/`, including the Bibimer-authored bridge and compatibility code;
- `ios/runtime-lab/`, including Bibimer-authored integration, build tools and
  modifications to the upstream interpreter;
- the common `bridge/` source files and `android/app/src/main/assets/` source
  assets actually included in the Bibimer iOS distribution by
  `ios/app/build.py` at the accompanying source revision.
- the Andineering-owned build-only helper source needed for that iOS build,
  including the review-access configuration helper reused from
  `scripts/build_apk.py`, and `android/app/src/main/java/app/bibimer/DemoWorkspace.java`
  as the source of the sample replay data bundled in iOS. This does not license
  the Android application as a whole.

The last item identifies the shared source included in the iOS application and
its corresponding source. Once received under this grant, the covered code may
be used, modified and redistributed for any platform under the GPL; this is not
a restriction to iOS use. This notice does not license the Android application
as a whole or the website as a whole.

## Other copyright holders and notices

This grant is made only for material whose copyright Andineering owns. It does
not replace or remove other copyright holders' licenses, notices or attribution.
The interpreter, Linux programs, fonts, vendor web libraries, included license
texts and other third-party material retain their respective terms. In
particular, preserve the upstream runtime `LICENSE.md` and `LICENSE.IOS`,
`ios/bridge/LICENSE.OPENCODE`, and the vendor/font and Alpine notices.

The App Store permission in `LICENSE.IOS` applies only to the covered
Andineering-owned material. It does not grant additional permissions for any
other copyright holder's work.

## Corresponding source and build information

The accompanying repository contains the covered source and build instructions.
See `ios/app/README.md`, `ios/bridge/README.md`, `ios/runtime-lab/README.md`, and
`release/app-store/runtime-sources.md` for the pinned interpreter, applied patch,
base-filesystem package sources and build information. The release record must
identify the exact source revision used for each distributed application.

Keep this grant, `LICENSE.IOS`, the GPL text and all applicable third-party
notices with redistributions as required by their respective licenses. Source
availability and this grant do not constitute Apple App Store review approval.
