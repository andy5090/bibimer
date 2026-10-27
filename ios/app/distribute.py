#!/usr/bin/env python3
"""Archive a verified device .app with Xcode; export a local TestFlight IPA.

No upload is performed. Provisioning network access is explicitly opt-in.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
DEFAULT_APP = REPO / '.tools/ios-app/iphoneos/Bibimer.app'
DEFAULT_OUTPUT = REPO / 'dist/ios-testflight'


class DistributionError(RuntimeError):
    pass


def checked(*command, log=None):
    result = subprocess.run(list(map(str, command)), stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True)
    if log:
        with open(log, 'a', encoding='utf-8') as stream:
            stream.write(result.stdout)
        os.chmod(log, 0o600)
    if result.returncode:
        raise DistributionError(f'{Path(str(command[0])).name} failed ({result.returncode})'
                                + (f'; inspect private log {log}' if log else ''))
    return result.stdout.strip()


def validate_values(team, bundle, version, build):
    if team and not re.fullmatch(r'[A-Z0-9]{10}', team):
        raise DistributionError('Team must be a 10-character Apple team ID.')
    if not re.fullmatch(r'[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+', bundle):
        raise DistributionError('Provide an explicit reverse-DNS bundle identifier.')
    if not re.fullmatch(r'[0-9]+(?:\.[0-9]+){0,2}', version):
        raise DistributionError('Version must contain one to three numeric components.')
    if not re.fullmatch(r'[1-9][0-9]*(?:\.[0-9]+){0,2}', build):
        raise DistributionError('Build must be a positive numeric build number.')


def validate_app(app):
    if not app.is_dir() or app.suffix != '.app':
        raise DistributionError('Input must be an existing device .app directory.')
    try:
        info = plistlib.loads((app / 'Info.plist').read_bytes())
    except (OSError, ValueError) as error:
        raise DistributionError('Input Info.plist is missing or invalid.') from error
    executable = info.get('CFBundleExecutable')
    if not executable or Path(executable).name != executable or not (app / executable).is_file():
        raise DistributionError('Input executable is missing or invalid.')
    manifest = json.loads((app / 'build-manifest.json').read_text())
    if manifest.get('sdk') != 'iphoneos':
        raise DistributionError('Simulator builds cannot be distributed.')
    binary = app / executable
    digest = hashlib.sha256(binary.read_bytes()).hexdigest()
    if digest != manifest.get('preSigningBinarySHA256'):
        raise DistributionError('Executable differs from the verified pre-signing build manifest.')
    architecture = checked('xcrun', 'lipo', '-archs', binary)
    if architecture != 'arm64':
        raise DistributionError('Only the verified arm64 iPhone device binary is supported.')
    platform = checked('xcrun', 'vtool', '-show-build', binary)
    if not re.search(r'platform\s+IOS\b', platform):
        raise DistributionError('Mach-O platform is not iOS device.')
    return info, digest


def pbx_string(value):
    # JSON quoted strings are valid OpenStep project string literals.
    return json.dumps(str(value))


def prepare_project(app, output, team, bundle, version, build, asset_catalog=None, profile_uuid=None):
    """Generate a normal app target so Xcode owns plist processing and signing."""
    info, digest = validate_app(app)
    info.update(CFBundleIdentifier=bundle, CFBundleVersion=build,
                CFBundleShortVersionString=version, CFBundleSupportedPlatforms=['iPhoneOS'],
                LSRequiresIPhoneOS=True)
    info['UISupportedInterfaceOrientations~ipad'] = ['UIInterfaceOrientationPortrait',
        'UIInterfaceOrientationPortraitUpsideDown', 'UIInterfaceOrientationLandscapeLeft',
        'UIInterfaceOrientationLandscapeRight']
    for key in list(info):
        if key.startswith('DT') or key in {'BuildMachineOSBuild', 'CFBundleIcons', 'CFBundleIcons~ipad', 'UIDeviceFamily'}:
            info.pop(key)
    work = output / 'wrapper'
    work.mkdir(parents=True, exist_ok=False)
    os.chmod(output, 0o700)
    (work / 'Info.plist').write_bytes(plistlib.dumps(info))
    # Build settings and paths are passed via environment, never interpolated into shell source.
    script = '''set -eu
mkdir -p "$TARGET_BUILD_DIR/$WRAPPER_NAME"
/usr/bin/rsync -a --exclude Info.plist --exclude _CodeSignature --exclude embedded.mobileprovision "$BIBIMER_PREBUILT_APP/" "$TARGET_BUILD_DIR/$WRAPPER_NAME/"
/usr/bin/xcrun dsymutil "$TARGET_BUILD_DIR/$WRAPPER_NAME/$EXECUTABLE_NAME" -o "$DWARF_DSYM_FOLDER_PATH/$DWARF_DSYM_FILE_NAME"
'''
    catalog_ref = ''
    catalog_phase = ''
    icon_setting = ''
    if asset_catalog:
        if not asset_catalog.is_dir() or asset_catalog.suffix != '.xcassets':
            raise DistributionError('Asset catalog must be an existing .xcassets directory.')
        catalog_ref = f'''A00000000000000000000009 = {{isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = {pbx_string(asset_catalog)}; sourceTree = "<absolute>"; }};
A0000000000000000000000A = {{isa = PBXBuildFile; fileRef = A00000000000000000000009; }};'''
        catalog_phase = 'A0000000000000000000000A,'
        icon_setting = 'ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;'
    executable = info['CFBundleExecutable']
    signing = ('CODE_SIGN_STYLE = Manual; CODE_SIGN_IDENTITY = \"Apple Distribution\"; '
               f'PROVISIONING_PROFILE_SPECIFIER = {pbx_string(profile_uuid)};'
               if profile_uuid else 'CODE_SIGN_STYLE = Automatic;')
    settings = f'''SDKROOT = iphoneos; IPHONEOS_DEPLOYMENT_TARGET = {pbx_string(info.get('MinimumOSVersion', '16.0'))};
ARCHS = arm64; TARGETED_DEVICE_FAMILY = "1,2"; PRODUCT_NAME = {pbx_string(executable)};
PRODUCT_BUNDLE_IDENTIFIER = {pbx_string(bundle)}; INFOPLIST_FILE = "$(SRCROOT)/Info.plist";
GENERATE_INFOPLIST_FILE = NO; {signing} DEVELOPMENT_TEAM = {pbx_string(team or '')};
BIBIMER_PREBUILT_APP = {pbx_string(app)}; ENABLE_USER_SCRIPT_SANDBOXING = NO;
SKIP_INSTALL = NO; DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym"; COPY_PHASE_STRIP = NO;
ENABLE_BITCODE = NO; ALWAYS_SEARCH_USER_PATHS = NO; {icon_setting}'''
    project = work / 'BibimerDistribution.xcodeproj'
    project.mkdir()
    project.joinpath('project.pbxproj').write_text(f'''// !$*UTF8*$!
{{ archiveVersion = 1; classes = {{}}; objectVersion = 56; objects = {{
A00000000000000000000001 = {{isa = PBXProject; attributes = {{LastUpgradeCheck = 2700;}}; buildConfigurationList = A00000000000000000000007; compatibilityVersion = "Xcode 14.0"; developmentRegion = en; knownRegions = (en, Base); mainGroup = A00000000000000000000002; productRefGroup = A00000000000000000000002; projectDirPath = ""; projectRoot = ""; targets = (A00000000000000000000003); }};
A00000000000000000000002 = {{isa = PBXGroup; children = (A00000000000000000000004); sourceTree = "<group>"; }};
A00000000000000000000003 = {{isa = PBXNativeTarget; buildConfigurationList = A00000000000000000000007; buildPhases = (A00000000000000000000005, A00000000000000000000008); buildRules = (); dependencies = (); name = BibimerDistribution; productName = {pbx_string(executable)}; productReference = A00000000000000000000004; productType = "com.apple.product-type.application"; }};
A00000000000000000000004 = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = {pbx_string(executable + '.app')}; sourceTree = BUILT_PRODUCTS_DIR; }};
A00000000000000000000005 = {{isa = PBXShellScriptBuildPhase; buildActionMask = 2147483647; files = (); inputPaths = (); outputPaths = (); runOnlyForDeploymentPostprocessing = 0; shellPath = /bin/sh; shellScript = {pbx_string(script)}; alwaysOutOfDate = 1; }};
A00000000000000000000006 = {{isa = XCBuildConfiguration; buildSettings = {{{settings}}}; name = Release; }};
A00000000000000000000007 = {{isa = XCConfigurationList; buildConfigurations = (A00000000000000000000006); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release; }};
A00000000000000000000008 = {{isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = ({catalog_phase}); runOnlyForDeploymentPostprocessing = 0; }};
{catalog_ref}
}}; rootObject = A00000000000000000000001; }}
''')
    scheme_dir = project / 'xcshareddata/xcschemes'
    scheme_dir.mkdir(parents=True)
    scheme_dir.joinpath('BibimerDistribution.xcscheme').write_text('''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2700" version="1.3"><BuildAction parallelizeBuildables="NO" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="NO" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="A00000000000000000000003" BuildableName="Bibimer.app" BlueprintName="BibimerDistribution" ReferencedContainer="container:BibimerDistribution.xcodeproj"/></BuildActionEntry></BuildActionEntries></BuildAction><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="NO"/></Scheme>
''')
    return project, digest


def verify_archive(archive, bundle, version, build, signed):
    metadata = plistlib.loads((archive / 'Info.plist').read_bytes())
    properties = metadata.get('ApplicationProperties', {})
    relative = properties.get('ApplicationPath', '')
    if not relative or '..' in Path(relative).parts or Path(relative).is_absolute():
        raise DistributionError('Archive application path is invalid.')
    app = archive / 'Products' / relative
    info = plistlib.loads((app / 'Info.plist').read_bytes())
    for key, expected in [('CFBundleIdentifier', bundle), ('CFBundleVersion', build),
                          ('CFBundleShortVersionString', version)]:
        if info.get(key) != expected:
            raise DistributionError(f'Archive {key} does not match requested value.')
    if info.get('CFBundleSupportedPlatforms') != ['iPhoneOS'] or not info.get('DTSDKName', '').startswith('iphoneos'):
        raise DistributionError('Archive is missing iPhoneOS SDK metadata.')
    binary = app / info['CFBundleExecutable']
    dsym = archive / 'dSYMs' / (app.name + '.dSYM')
    if not dsym.is_dir():
        raise DistributionError('Archive dSYM is missing.')
    binary_uuids = checked('xcrun', 'dwarfdump', '--uuid', binary).splitlines()
    symbol_uuids = checked('xcrun', 'dwarfdump', '--uuid', dsym).splitlines()
    normalize = lambda lines: sorted(re.findall(r'UUID: ([A-Fa-f0-9-]+) \(([^)]+)\)', '\n'.join(lines)))
    if not normalize(binary_uuids) or normalize(binary_uuids) != normalize(symbol_uuids):
        raise DistributionError('Archive dSYM UUID does not match the executable.')
    if signed:
        checked('codesign', '--verify', '--strict', app)
        if not (app / 'embedded.mobileprovision').is_file():
            raise DistributionError('Signed archive provisioning profile is missing.')
    return app


def verify_distribution_signature(app, team, bundle):
    """Check the exported code signature and embedded App Store profile locally."""
    checked('codesign', '--verify', '--strict', app)
    profile_path = app / 'embedded.mobileprovision'
    if not profile_path.is_file():
        raise DistributionError('Exported app has no embedded provisioning profile.')
    profile = plistlib.loads(checked('security', 'cms', '-D', '-i', profile_path).encode())
    entitlements = profile.get('Entitlements', {})
    prefixes = profile.get('ApplicationIdentifierPrefix', [])
    if team not in profile.get('TeamIdentifier', []):
        raise DistributionError('Exported profile belongs to a different team.')
    if entitlements.get('application-identifier') not in [prefix + '.' + bundle for prefix in prefixes]:
        raise DistributionError('Exported profile bundle identifier does not match.')
    if entitlements.get('get-task-allow') is not False or profile.get('ProvisionedDevices') or profile.get('ProvisionsAllDevices'):
        raise DistributionError('Exported profile is not for App Store distribution.')
    expires = profile.get('ExpirationDate')
    if not isinstance(expires, datetime) or expires.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        raise DistributionError('Exported provisioning profile has expired.')


def verify_ipa(ipa, team, bundle):
    # ditto preserves bundle symlinks; zipfile extraction does not.
    with tempfile.TemporaryDirectory(prefix='bibimer-ipa-') as temporary:
        checked('ditto', '-x', '-k', ipa, temporary)
        apps = list((Path(temporary) / 'Payload').glob('*.app'))
        if len(apps) != 1:
            raise DistributionError('Exported IPA must contain one app.')
        verify_distribution_signature(apps[0], team, bundle)


def export_options(team, bundle=None, profile_uuid=None):
    options = dict(method='app-store-connect', destination='export', teamID=team,
                signingStyle='automatic', manageAppVersionAndBuildNumber=False,
                uploadSymbols=True, generateAppStoreInformation=True)
    if profile_uuid:
        options.update(signingStyle='manual', signingCertificate='Apple Distribution',
                       provisioningProfiles={bundle: profile_uuid})
    return options


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', type=Path, default=DEFAULT_APP)
    parser.add_argument('--archive', type=Path, help='Export an existing archive without a development-profile archive step')
    parser.add_argument('--profile-uuid', help='Installed App Store profile UUID; use manual Apple Distribution signing')
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--team', help='Confirmed iOS Apple Developer Program team ID')
    parser.add_argument('--bundle-id', default='app.bibimer.ios')
    parser.add_argument('--version', required=True)
    parser.add_argument('--build', required=True)
    parser.add_argument('--asset-catalog', type=Path)
    parser.add_argument('--unsigned', action='store_true', help='Prepare a non-distributable archive without account access')
    parser.add_argument('--export', action='store_true', help='Export a local App Store Connect IPA after signing')
    parser.add_argument('--allow-provisioning-updates', action='store_true', help='Allow Xcode account provisioning changes')
    args = parser.parse_args()
    validate_values(args.team, args.bundle_id, args.version, args.build)
    if not args.unsigned and not args.team:
        raise DistributionError('Signing requires the confirmed iOS team ID.')
    if args.profile_uuid and not re.fullmatch(r'[0-9A-Fa-f]{8}-(?:[0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}', args.profile_uuid):
        raise DistributionError('Profile UUID is invalid.')
    if args.archive and (args.unsigned or not args.export):
        raise DistributionError('--archive requires --export and cannot be combined with --unsigned.')
    if args.unsigned and (args.export or args.allow_provisioning_updates or args.profile_uuid):
        raise DistributionError('Unsigned archives cannot export or access provisioning.')
    os.environ.setdefault('DEVELOPER_DIR', '/Applications/Xcode.app/Contents/Developer')
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    os.chmod(output, 0o700)
    archive = output / 'Bibimer.xcarchive'
    if archive.exists() or (output / 'wrapper').exists():
        raise DistributionError('Use a new output directory; existing archives are never overwritten.')
    log = output / 'xcodebuild.log'
    log.touch(mode=0o600, exist_ok=False)
    if args.archive:
        archive = args.archive.resolve()
        archive_metadata = plistlib.loads((archive / 'Info.plist').read_bytes())
        relative = archive_metadata.get('ApplicationProperties', {}).get('ApplicationPath', '')
        if not relative or Path(relative).is_absolute() or '..' in Path(relative).parts:
            raise DistributionError('Archive application path is invalid.')
        existing_app = archive / 'Products' / relative
        signed_archive = (existing_app / 'embedded.mobileprovision').is_file()
        verified_app = verify_archive(archive, args.bundle_id, args.version, args.build, signed_archive)
        executable = plistlib.loads((verified_app / 'Info.plist').read_bytes())['CFBundleExecutable']
        digest = hashlib.sha256((verified_app / executable).read_bytes()).hexdigest()
    else:
        project, digest = prepare_project(args.app.resolve(), output, args.team,
                                          args.bundle_id, args.version, args.build,
                                          args.asset_catalog.resolve() if args.asset_catalog else None,
                                          args.profile_uuid)
        command = ['xcodebuild', '-project', project, '-scheme', 'BibimerDistribution',
                   '-configuration', 'Release', '-destination', 'generic/platform=iOS',
                   '-archivePath', archive, '-derivedDataPath', output / 'DerivedData', 'archive']
        if args.unsigned:
            command.append('CODE_SIGNING_ALLOWED=NO')
        if args.allow_provisioning_updates:
            command.append('-allowProvisioningUpdates')
        checked(*command, log=log)
        signed_archive = not args.unsigned
        verify_archive(archive, args.bundle_id, args.version, args.build, signed_archive)
    if args.export:
        options = output / 'ExportOptions.plist'
        options.write_bytes(plistlib.dumps(export_options(args.team, args.bundle_id, args.profile_uuid)))
        command = ['xcodebuild', '-exportArchive', '-archivePath', archive,
                   '-exportPath', output / 'export', '-exportOptionsPlist', options]
        if args.allow_provisioning_updates:
            command.append('-allowProvisioningUpdates')
        checked(*command, log=log)
        ipas = list((output / 'export').glob('*.ipa'))
        if len(ipas) != 1:
            raise DistributionError('Export did not produce exactly one IPA.')
        verify_ipa(ipas[0], args.team, args.bundle_id)
    report = dict(bundleIdentifier=args.bundle_id, version=args.version, build=args.build,
                  preSigningBinarySHA256=digest, signed=signed_archive,
                  archiveVerified=True, exported=args.export, exportedSignatureVerified=args.export, uploaded=False,
                  physicalDeviceVerified=False)
    (output / 'distribution.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
    print(f'Archive: {archive}')


if __name__ == '__main__':
    try:
        main()
    except (DistributionError, OSError, ValueError) as error:
        sys.exit(str(error))
