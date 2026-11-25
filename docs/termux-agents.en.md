# Prepare coding agents in Termux

[한국어](termux-agents.md)

Run these steps in **Termux on the same Android phone as Bibimer**. A separate computer or remote host is not required. First connect the bridge in Setup and try `pwd` in Terminal.

These are configurations checked on an **Android 16 arm64 phone on 2026-10-19**. Version checks do not call a model. Installation and authentication from scratch on another phone still need verification. Keep an existing working installation.

| Agent | Checked configuration | Result |
| --- | --- | --- |
| Codex | Termux repository `codex` candidate0.172.0 (isolated check) | `codex-cli 0.172.0`; installed CLI remains0.163.0 |
| Claude Code | Bibimer runtime 2.1.283; Agent SDK 0.3.283 | Dedicated launcher and the phone's normal `claude` command pass version checks; original npm2.1.263 entry backed up |
| OpenCode | 1.17.13; community OpenClaw Android glibc/proot/Bun wrapper | `opencode --version` succeeds |
| Gemini CLI | Official npm `@google/gemini-cli@0.58.0`; entry file run directly with Node.js | `--version` prints `0.58.0`; Bibimer agent selection and Chat are not integrated |

Agent requirements differ from Bibimer's minimum Android version. The phone uses Termux Node.js 26.4.0, npm 11.19.0, glibc 2.42-0 and glibc-runner 2.0-3; these are reference versions, not a requirement to replace working tools.

## Manage accounts and providers in Bibimer (internal 0.30.0)

Open **Settings → Agent accounts and providers → Manage connections**, or the account/status/version actions under **Setup → Prepare an agent**. A connected Termux bridge advertising `agent_connections` is required; its source version is **0.23.0**. This is included in internal 0.30.0(52); update the bridge to 0.23.0 from Settings after updating the app.

| Agent | In-app operations | Additional step |
| --- | --- | --- |
| Codex | Native account configuration/authentication type, version, API key entry, ChatGPT login initiation and completion | Complete website authentication yourself in a browser |
| Claude Code | Native `auth status` JSON and version | Explicit **Set up in Termux instead** for native login |
| OpenCode | Native provider list/configuration/authentication methods, API keys, supported OAuth code/automatic callbacks, version | Plugin methods requiring additional native forms use the explicit Termux fallback |
| Gemini CLI | Installation and version; use Node.js for the installed npm entry when necessary | Authentication status remains unavailable; choose login in the existing interactive native flow |

Connection, status and version actions stay in the app. An unavailable/older bridge shows guidance and the explicit Termux fallback. Installation, Claude repair and adapter preparation retain their existing Termux actions and permissions. Bridge queries need no new terminal.

Keys and codes are entered in masked fields and sent only through the local bridge to the agent's existing credential store. They are absent from Bibimer preferences, conversations, general logs and bridge metadata. Keys clear immediately on submission; fields also clear on closing, backgrounding or changing project. Browser authentication opens only on user action, with the site's origin displayed. Pending login processes and authorization details stay in memory for up to ten minutes, with cancellation, expiry and bridge shutdown cleanup.

**Configured does not establish model access.** No model prompt, slash command or paid request is used as an authentication test. Existing projects, sessions, drafts and approvals are preserved. Authentication changes are not promised to affect existing processes immediately; the model catalog cache is invalidated after saving.

Validation uses fictional native agents and UI controller tests. New real-account login/key saving, installed Android WebView and browser return remain unverified. Shared iOS UI/native routing is prepared, while its runtime feature flag stays disabled pending validation. Do not paste keys or authorization codes into conversations or project settings.

## Codex

As checked on November 25, 2026, `@mmmbuto/codex-cli-termux` has ended maintenance with release 0.163.0-termux.3. Its maintainer recommends **`codex` from the official Termux package repository**. This is a Termux-maintained build with Android patches, not an official OpenAI Android distribution. [Maintainer migration notice](https://github.com/DioNanos/codex-termux/releases/tag/v0.163.0-termux.3) · [Termux package source](https://github.com/termux/termux-packages/blob/master/packages/codex/build.sh).

For a new installation:

```sh
pkg update
pkg install codex
codex --version
codex login
```

The current repository candidate 0.172.0 was downloaded, extracted separately and checked with `--version` and `app-server initialize` on this phone. The installed CLI was not changed; no login or model request was used.

Existing npm users can select **Settings → Agent management → Codex → Check for updates** in the new app with bridge0.25.4. Review the migration and affected Codex sessions before starting. The updater pins the exact repository version and preserves `~/.codex` accounts/config/saved chats and the old npm payload. Do not uninstall that npm package afterward: npm can remove the new launcher. Future updates use the Termux package. If cached repository metadata is stale, run `pkg update` in Termux and check again. Unknown custom launchers are not replaced automatically.

For full manual cleanup outside the app, stop the relevant Codex sessions first and follow the maintainer’s sequence: `npm uninstall -g @mmmbuto/codex-cli-termux`, `pkg install --reinstall codex`, `hash -r`, then `codex --version`. A failed reinstall after npm removal can leave no launcher; Bibimer does not automatically uninstall the old package.

Complete the printed login URL yourself in the same phone’s browser. If callback login fails and your account/workspace permits it, use `codex login --device-auth`. Enter API keys in the connection manager or native CLI, never the conversation composer. See [OpenAI authentication](https://learn.chatgpt.com/docs/codex/auth).

## Claude Code

The phone uses Bibimer's separate runtime because its original npm entry failed with `claude native binary not installed`. On 2026-10-19 we also connected the normal `claude` command to that runtime and verified its version output and SDK initialization. The original npm link is backed up at `$PREFIX/bin/claude.npm-before-bibimer`. This was a direct repair on this phone; the general repair installer still preserves the global CLI. An ordinary global npm installation does not reproduce this configuration.

Internal 0.30.0 includes five buttons under **Setup → Claude Code · Termux**: **Repair in Termux**, **Set up adapter in Termux**, **Sign in with Termux**, **Check sign-in**, and **Check version**. Status and version actions open the in-app connection manager above. Repair, adapter setup and sign-in request one fixed action in a new Termux terminal on the same phone. Sign-in, status, and version prefer Bibimer's dedicated launcher, falling back to the installed `claude` command when absent. Repair and adapter setup use standalone scripts bundled with the app, without relying on a Downloads file. Existing bridge and agent sessions are preserved.

The Termux execution buttons require Termux 0.118+, BIBIMER's Android **Run commands in Termux environment** permission, and Termux's `allow-external-apps=true` setting. Granting the requested permission runs only the selected action, without switching to bridge installation. The user controls both permissions and settings. The [official Termux RUN_COMMAND guide](https://github.com/termux/termux-app/wiki/RUN_COMMAND-Intent) explains that Android activity-launch restrictions may require opening Termux from its notification. A request-sent message does not confirm installation or sign-in; inspect progress, errors, and results in Termux. Finish browser sign-in yourself. Authentication output is not returned to Bibimer. The command-copying fallback remains available.

**These actions are included in internal 0.30.0(52).** Device permission requests, Termux switching, and returning from browser login with the new buttons remain unverified.

Prerequisites: **arm64 Termux**, an existing glibc loader at `$PREFIX/glibc/lib/ld-linux-aarch64.so.1`, and ripgrep. See the [glibc packages project](https://github.com/termux-pacman/glibc-packages) if needed. Bibimer does not install glibc; preparing that environment from scratch remains unverified.

In **Setup → Claude Code · Termux**, choose **Copy Claude repair command**, then paste and run it in Termux. The command contains the complete bundled installer, so no exported file or Downloads access is required. This is included in internal 0.30.0(52); older versions may still copy a command that references an exported file. Prepare ripgrep first if needed:

```sh
pkg install ripgrep
```

The runtime installer verifies the fixed official Claude 2.1.283 package's SHA-512 and executable before activating its dedicated launcher. It preserves the global CLI and credentials. This command also installs Node.js/npm if needed and official Agent SDK 0.3.283 in Bibimer's private tool directory. If your existing CLI works and only the Chat adapter is missing, use **Copy Claude adapter setup command** instead. Neither command installs or restarts the bridge. Separate installer files were also prepared in the current development phone's private Bibimer folder; see the [setup guide (Korean)](setup.md) for those phone-specific commands.

Check the **dedicated launcher**, then open it to complete sign-in on this phone:

```sh
~/.local/share/bibimer/claude-runtime/claude --version
~/.local/share/bibimer/claude-runtime/claude auth status
~/.local/share/bibimer/claude-runtime/claude auth login
```

The bridge uses this launcher when the normal CLI is missing or fails. An existing working CLI or explicit `BIBIMER_CLAUDE_EXECUTABLE` follows the existing selection rules. [Claude's official setup guide](https://code.claude.com/docs/en/setup) provides general account and usage information, rather than a Termux-specific installation procedure.

### Repeated authentication errors

On 2026-10-19, the phone's dedicated glibc runtime passed its version check and the real Agent SDK control handshake, returning five models. However, `auth status` reported `loggedIn: false`. A single request in a temporary working directory with tools, project settings and session persistence disabled failed with **`Failed to authenticate: OAuth session expired and could not be refreshed`**. A version check does not establish authenticated access.

For this error, run **`auth login`** above in Termux, finish browser sign-in on the same phone, then check `auth status` again. Reconnect in Bibimer and retry your input. Reinstalling the runtime or restarting the bridge does not renew expired authentication. Bibimer does not choose your account or handle login codes for you.

### Termux-specific alternatives investigated

[Aarstad/claude-code-termux-musl](https://github.com/Aarstad/claude-code-termux-musl) is a community launcher and DNS proxy for the official `linux-arm64-musl` build, rather than official Anthropic Android support. Source reviewed at commit `efd767cacdfdfccbfc94bc5b5628149f0d44a4d3`.

In the separate `.tools/claude-diagnosis/musl-probe/` folder, we verified npm SHA-512 for official `@anthropic-ai/claude-code-linux-arm64-musl@2.1.283`, prepared an Alpine musl loader with a pinned SHA-256, and changed only the ELF interpreter path. Version output and the existing Agent SDK0.3.283 control handshake with five models succeeded. **This establishes startup compatibility only; the complete community installer, DNS proxy, tools and authenticated model responses remain unverified.** The user's credentials, global CLI, running bridge and sessions were not replaced.

The [Termux glibc launcher project](https://github.com/gtbuchanan/claude-code-termux) also addresses loader, embedded-tool re-execution and DNS issues. That installer was not applied here. Resolve the reproduced authentication error first, then compare actual shell/search tools and networking before selecting a new default installation path.

The same restricted request through the separate musl executable returned the identical authentication-expired error, with zero model input/output tokens. Replacing the runtime did not resolve authentication in this comparison. User sign-in and functional verification are needed before promoting an alternative to the default.

## OpenCode

The checked phone uses the **OpenCode installation script** from [community OpenClaw Android](https://github.com/AidanPark/openclaw-android). You do not need the OpenClaw agent to use Bibimer. An ordinary npm installation alone does not reproduce the wrapper.

Prerequisites: arm64 Termux, the glibc loader and OpenClaw Android's `~/.openclaw-android/.glibc-arch` preparation marker. The script prepares proot and Bun, downloads OpenCode, and creates a minimal proot root and launcher. It skips installation if the glibc environment is missing; this is not a complete installation on an empty Termux environment.

[This fixed source](https://github.com/AidanPark/openclaw-android/blob/a2ac938e4f746c0bd052adc2c7e40e8d18359032/scripts/install-opencode.sh) matches the phone's installed script byte for byte. SHA-256: `a7fe7e92ca90c9065a5b0a7094d617927fb14aa8fe6f830f8414ab9e5dadbf95`. It is community software, not an official OpenCode Termux installer.

If the prerequisites are already present and OpenCode is missing, download, review and run the script:

```sh
curl -fL https://raw.githubusercontent.com/AidanPark/openclaw-android/a2ac938e4f746c0bd052adc2c7e40e8d18359032/scripts/install-opencode.sh -o ~/bibimer-install-opencode.sh
less ~/bibimer-install-opencode.sh
bash ~/bibimer-install-opencode.sh
```

**Pinning the script does not pin its Bun/OpenCode downloads.** A new installation may differ from the checked OpenCode 1.17.13. Do not rerun it over a working installation. Verify the executable instead of relying on installer success text, then configure your provider connection:

```sh
opencode --version
opencode auth login
```

On this phone `$PREFIX/bin/opencode` wraps `~/.openclaw-android/proot-root`, `~/.openclaw-android/bin/ld.so.opencode` and the OpenCode binary in Bun's cache. Replacing the wrapper with a global npm update or clearing that cache can break this configuration. See [OpenCode documentation](https://opencode.ai/docs/) for provider and model configuration.

## Gemini CLI

The phone also has **`@google/gemini-cli@0.58.0`** installed globally. The package and [official installation guide](https://geminicli.com/docs/get-started/installation/) require **Node.js 20+**. If it is missing, prepare Termux Node.js and npm, then install the reference version. Keep an existing working installation.

```sh
npm install -g @google/gemini-cli@0.58.0
```

In the checked execution environment, the `gemini` entry file's `#!/usr/bin/env node` launcher fails. Running the same entry file directly with Termux Node.js succeeds, without modifying the installed file or replacing the global launcher:

```sh
node "$(npm root -g)/@google/gemini-cli/bundle/gemini.js" --version
```

Check for output `0.58.0`. To start the CLI and sign in, run the following in Termux or a Bibimer **Terminal** session, then follow the browser prompts on the same phone. See [official authentication instructions](https://geminicli.com/docs/get-started/authentication/).

```sh
node "$(npm root -g)/@google/gemini-cli/bundle/gemini.js"
```

**Installation and version checks do not establish Bibimer integration.** Gemini is not connected to Bibimer's agent picker, structured Chat, saved-session import, model/permission controls or completion notifications. This is a direct CLI path in a general Terminal session. Only the Node.js version command was verified here; interactive authentication, model responses, tools and installation from scratch remain unverified. Dedicated Gemini session management and Chat require separate implementation.

## Return to Bibimer

For Codex, Claude Code and OpenCode, reconnect in Bibimer after installation and the required account authentication or provider setup and check agent readiness before starting a session. A successful version check does not establish authentication or model access. Do not put API keys or login codes in Bibimer project settings or conversations.

Update the bridge only when needed. Finish active sessions before restarting it, following the [bridge setup guide (Korean)](setup.md). Viewing these instructions does not restart the bridge or agents.
