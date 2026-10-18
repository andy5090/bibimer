# Prepare coding agents in Termux

[한국어](termux-agents.md)

Run these steps in **Termux on the same Android phone as Bibimer**. A separate computer or remote host is not required. First connect the bridge in Setup and try `pwd` in Terminal.

These are configurations checked on an **Android 16 arm64 phone on 2026-10-19**. Version checks do not call a model. Installation and authentication from scratch on another phone still need verification. Keep an existing working installation.

| Agent | Checked configuration | Result |
| --- | --- | --- |
| Codex | `@mmmbuto/codex-cli-termux@0.160.0-termux.3` | `codex-cli 0.160.0` |
| Claude Code | Bibimer runtime 2.1.283; Agent SDK 0.3.283 | Dedicated launcher works; the global npm CLI 2.1.263 fails |
| OpenCode | 1.17.13; community OpenClaw Android glibc/proot/Bun wrapper | `opencode --version` succeeds |

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

The global `claude` command on the checked phone fails, so it uses Bibimer's separate runtime. An ordinary global npm installation does not reproduce this configuration.

Prerequisites: **arm64 Termux**, an existing glibc loader at `$PREFIX/glibc/lib/ld-linux-aarch64.so.1`, and ripgrep. See the [glibc packages project](https://github.com/termux-pacman/glibc-packages) if needed. Bibimer does not install glibc; preparing that environment from scratch remains unverified.

Save the latest `bibimer-setup.sh` to Download from Bibimer Setup. Run `termux-setup-storage` and finish granting access first if needed. Then prepare ripgrep and the runtime; runtime installation also prepares the Chat SDK:

```sh
pkg install ripgrep
BIBIMER_CLAUDE_TERMUX=1 bash ~/storage/downloads/bibimer-setup.sh
```

The runtime installer verifies the fixed official Claude 2.1.283 package's SHA-512 and executable before activating its dedicated launcher. It preserves the global CLI and credentials. This command also installs Node.js if needed and official Agent SDK 0.3.283 in Bibimer's private tool directory. If your existing CLI works and only the Chat adapter is missing, use `BIBIMER_CLAUDE=1 bash ~/storage/downloads/bibimer-setup.sh` instead.

Check the **dedicated launcher**, then open it to complete sign-in on this phone:

```sh
~/.local/share/bibimer/claude-runtime/claude --version
~/.local/share/bibimer/claude-runtime/claude
```

The bridge uses this launcher when the normal CLI is missing or fails. An existing working CLI or explicit `BIBIMER_CLAUDE_EXECUTABLE` follows the existing selection rules. [Claude's official setup guide](https://code.claude.com/docs/en/setup) provides general account and usage information, rather than a Termux-specific installation procedure.

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

## Return to Bibimer

After installation and sign-in, reconnect in Bibimer and check agent readiness before starting a session. A successful version check does not establish authentication or model access. Do not put API keys or login codes in Bibimer project settings or conversations.

Update the bridge only when needed. Finish active sessions before restarting it, following the [bridge setup guide (Korean)](setup.md). Viewing these instructions does not restart the bridge or agents.
