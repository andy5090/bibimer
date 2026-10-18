# Prepare coding agents in Termux

[한국어](termux-agents.md)

Run these steps in **Termux on the same Android phone as Bibimer**. A separate computer or remote host is not required. First connect the bridge in Setup and try `pwd` in Terminal.

These are configurations checked on an **Android 16 arm64 phone on 2026-10-19**. Version checks do not call a model. Installation and authentication from scratch on another phone still need verification. Keep an existing working installation.

| Agent | Checked configuration | Result |
| --- | --- | --- |
| Codex | `@mmmbuto/codex-cli-termux@0.160.0-termux.3` | `codex-cli 0.160.0` |
| Claude Code | Bibimer runtime 2.1.283; Agent SDK 0.3.283 | Dedicated launcher and the phone's normal `claude` command pass version checks; original npm2.1.263 entry backed up |
| OpenCode | 1.17.13; community OpenClaw Android glibc/proot/Bun wrapper | `opencode --version` succeeds |
| Gemini CLI | Official npm `@google/gemini-cli@0.58.0`; entry file run directly with Node.js | `--version` prints `0.58.0`; Bibimer agent selection and Chat are not integrated |

Agent requirements differ from Bibimer's minimum Android version. The phone uses Termux Node.js 26.4.0, npm 11.19.0, glibc 2.42-0 and glibc-runner 2.0-3; these are reference versions, not a requirement to replace working tools.

## Codex

Use the [community Termux distribution](https://github.com/DioNanos/codex-termux), which requires **Android 10+ arm64** for this version. This is not an official OpenAI Termux distribution or the standard Linux binary.

Only if Node.js and npm are missing:

```sh
pkg install nodejs-lts npm
```

Install the checked package version, verify it, then sign in:

```sh
npm install -g @mmmbuto/codex-cli-termux@0.160.0-termux.3
codex --version
codex login
```

Open the printed URL in the same phone's browser. If the browser callback fails, `codex login --device-auth` is an alternative when device code login is allowed for your account/workspace. Configure any API key authentication in Termux, not Bibimer's composer. See [OpenAI authentication](https://learn.chatgpt.com/docs/auth).

## Claude Code

The phone uses Bibimer's separate runtime because its original npm entry failed with `claude native binary not installed`. On 2026-10-19 we also connected the normal `claude` command to that runtime and verified its version output and SDK initialization. The original npm link is backed up at `$PREFIX/bin/claude.npm-before-bibimer`. This was a direct repair on this phone; the general repair installer still preserves the global CLI. An ordinary global npm installation does not reproduce this configuration.

Prerequisites: **arm64 Termux**, an existing glibc loader at `$PREFIX/glibc/lib/ld-linux-aarch64.so.1`, and ripgrep. See the [glibc packages project](https://github.com/termux-pacman/glibc-packages) if needed. Bibimer does not install glibc; preparing that environment from scratch remains unverified.

In **Setup → Claude Code · Termux**, choose **Copy Claude repair command**, then paste and run it in Termux. The command contains the complete bundled installer, so no exported file or Downloads access is required. This source change reaches the app after the next APK build/install; older distributed versions still copy a command that references an exported file. Prepare ripgrep first if needed:

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

**Pinning the script does not pin its Bun/OpenCode downloads.** A new installation may differ from the checked OpenCode 1.17.13. Do not rerun it over a working installation. Verify the executable instead of relying on installer success text, then sign in to your provider:

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

For Codex, Claude Code and OpenCode, reconnect in Bibimer after installation and sign-in and check agent readiness before starting a session. A successful version check does not establish authentication or model access. Do not put API keys or login codes in Bibimer project settings or conversations.

Update the bridge only when needed. Finish active sessions before restarting it, following the [bridge setup guide (Korean)](setup.md). Viewing these instructions does not restart the bridge or agents.
