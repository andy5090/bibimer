# Google Play update SDK in the custom Android build

`play_sdk_dependencies.json` pins `com.google.android.play:app-update:2.1.0`
and its full declared Google Maven POM dependency closure. Version conflicts
resolve to the highest version requested for a coordinate, as in a standard
Android dependency build. All 31 artifact archives have a pinned SHA-256. The
only repository is Google's official Maven repository:
<https://dl.google.com/dl/android/maven2/>.

The direct dependencies in the SDK's official POM are:

- `com.google.android.gms:play-services-basement:18.1.0`
- `com.google.android.gms:play-services-tasks:18.0.2`
- `com.google.android.play:core-common:2.0.3`

Basement transitively requires AndroidX core, fragment, collection and their
support/lifecycle libraries. They are included because this build uses D8
without a dependency shrinker. No Kotlin or Activity Result convenience
library was added: Bibimer only requests update availability and opens the
Google Play listing. It does not call the SDK's update-flow overloads.

`play_sdk.prepare` downloads and verifies archives with the existing build
fetcher, extracts code and resources to the ignored `.tools/play-sdk` cache,
and audits their manifests against the explicitly merged entries in the app
manifest. The app retains minSdk 26 and targetSdk 36. Resource compilation
includes each AAR's resources and generates its Java `R` package via AAPT2
`--extra-packages`; javac and D8 receive every extracted dependency jar.

The merged manifest entries are Google Play services version metadata,
AndroidX's `CoreComponentFactory`, and the private Play Core dialog wrapper
activity and its transparent theme. Preserving the official SDK manifest does
not start that activity or enable an in-app installation flow.

SDK license notices and the dependency lock are copied into generated
`assets/vendor/play-sdk` for both APK and AAB builds. They remain ignored source
inputs, like the existing bundled web libraries. Play SDK terms:
<https://developer.android.com/guide/playcore/license>. Google Play services
terms: <https://developer.android.com/studio/terms.html>. AndroidX dependencies
use the Apache 2.0 license: <https://www.apache.org/licenses/LICENSE-2.0>.

Unit tests inject local dependencies into `compile_android` and synthetic
archives into `play_sdk.prepare`; they do not download, sign or build an app.
A source/resource/DEX compilation can use `compile_android` directly without
calling the packaging/signing entry points. D8 currently reports two benign
invalid-local-debug-table messages from the pinned legacy AndroidX PrintHelper
and PagerTitleStrip classes; it removes those debug tables successfully.
