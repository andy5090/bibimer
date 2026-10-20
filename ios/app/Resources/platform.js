"use strict";
(() => {
  const original = window.BibimerI18n;
  const policyLocales = {
    "pt-BR": {
      sandbox:"Sandbox do app iOS", scope:"Somente Chat. O Codex pode acessar todos os arquivos do ambiente Linux deste app e usar a rede. Não há isolamento por pasta de projeto. A política de aprovação continua sendo on-request.",
      namespace:"Esta política do Codex exige um sandbox de namespace Linux indisponível neste ambiente iOS. Sua escolha salva é mantida. Escolha explicitamente uma política compatível para continuar.",
      terminal:"O sandbox do app iOS está disponível apenas no Chat do Codex. Escolha explicitamente outra política antes de iniciar o modo Terminal.",
      inherit:"Usa sua configuração atual do Codex. Configurações de sandbox de namespace Linux não funcionam aqui. Escolha explicitamente o sandbox do app iOS para acessar os arquivos Linux deste app no Chat."
    },
    es:{
      sandbox:"Sandbox de la app iOS", scope:"Solo Chat. Codex puede acceder a todos los archivos del entorno Linux de esta app y usar la red. No hay aislamiento por carpeta de proyecto. Se mantiene la política de aprobación on-request.",
      namespace:"Esta política de Codex requiere un sandbox de espacios de nombres de Linux que no está disponible en este entorno iOS. Se conserva tu selección guardada. Elige explícitamente una política compatible para continuar.",
      terminal:"El sandbox de la app iOS solo está disponible en el Chat de Codex. Elige explícitamente otra política antes de iniciar el modo Terminal.",
      inherit:"Usa tu configuración actual de Codex. Los ajustes de sandbox de espacios de nombres de Linux no funcionan aquí. Elige explícitamente el sandbox de la app iOS para acceder a los archivos Linux de esta app desde Chat."
    },
    id:{
      sandbox:"Sandbox aplikasi iOS", scope:"Khusus Chat. Codex dapat mengakses semua berkas di lingkungan Linux aplikasi ini dan menggunakan jaringan. Tidak ada isolasi per folder proyek. Kebijakan persetujuan tetap on-request.",
      namespace:"Kebijakan Codex ini memerlukan sandbox namespace Linux yang tidak tersedia di lingkungan iOS ini. Pilihan tersimpan Anda dipertahankan. Pilih kebijakan yang didukung secara eksplisit untuk melanjutkan.",
      terminal:"Sandbox aplikasi iOS hanya tersedia untuk Chat Codex. Pilih kebijakan lain secara eksplisit sebelum memulai mode Terminal.",
      inherit:"Menggunakan konfigurasi Codex Anda saat ini. Pengaturan sandbox namespace Linux tidak dapat berjalan di sini. Pilih sandbox aplikasi iOS secara eksplisit untuk mengakses berkas Linux aplikasi ini melalui Chat."
    },
    "zh-Hans":{
      sandbox:"iOS 应用沙盒", scope:"仅用于 Chat。Codex 可以访问此应用 Linux 环境中的所有文件并使用网络，不提供项目文件夹隔离。审批策略保持为 on-request。",
      namespace:"此 Codex 策略需要 Linux namespace 沙盒，而此 iOS 运行环境不支持。已保留您保存的选择。请明确选择受支持的策略后再继续。",
      terminal:"iOS 应用沙盒仅适用于 Codex Chat。启动 Terminal 模式前，请明确选择其他策略。",
      inherit:"使用现有 Codex 配置。Linux namespace 沙盒设置无法在此运行。如需在 Chat 中访问此应用的 Linux 文件，请明确选择 iOS 应用沙盒。"
    },
    ja:{
      sandbox:"iOSアプリのサンドボックス", scope:"Chat専用です。CodexはこのアプリのLinux環境内のすべてのファイルにアクセスし、ネットワークを使用できます。プロジェクトフォルダ単位の分離はありません。承認ポリシーはon-requestを維持します。",
      namespace:"このCodexポリシーにはLinux namespaceサンドボックスが必要ですが、このiOS実行環境では利用できません。保存済みの選択は維持します。続行するには対応するポリシーを明示的に選択してください。",
      terminal:"iOSアプリのサンドボックスはCodex Chat専用です。Terminalモードを開始する前に、別のポリシーを明示的に選択してください。",
      inherit:"既存のCodex設定を使用します。Linux namespaceサンドボックスの設定はここでは実行できません。ChatでこのアプリのLinuxファイルを利用する場合は、iOSアプリのサンドボックスを明示的に選択してください。"
    },
    "zh-Hant":{
      sandbox:"iOS 應用程式沙盒", scope:"僅用於 Chat。Codex 可以存取此應用程式 Linux 環境中的所有檔案並使用網路，不提供專案資料夾隔離。核准策略維持為 on-request。",
      namespace:"此 Codex 策略需要 Linux namespace 沙盒，但此 iOS 執行環境不支援。已保留您儲存的選擇。請明確選擇受支援的策略後再繼續。",
      terminal:"iOS 應用程式沙盒僅適用於 Codex Chat。啟動 Terminal 模式前，請明確選擇其他策略。",
      inherit:"使用既有的 Codex 設定。Linux namespace 沙盒設定無法在此執行。若要在 Chat 中存取此應用程式的 Linux 檔案，請明確選擇 iOS 應用程式沙盒。"
    },
    fr:{
      sandbox:"Bac à sable de l’app iOS", scope:"Chat uniquement. Codex peut accéder à tous les fichiers de l’environnement Linux de cette app et utiliser le réseau. Les dossiers de projet ne sont pas isolés. La politique d’approbation reste on-request.",
      namespace:"Cette politique Codex nécessite un bac à sable avec espaces de noms Linux, indisponible dans cet environnement iOS. Votre choix enregistré est conservé. Sélectionnez explicitement une politique compatible pour continuer.",
      terminal:"Le bac à sable de l’app iOS est réservé au Chat Codex. Sélectionnez explicitement une autre politique avant de démarrer le mode Terminal.",
      inherit:"Utilise votre configuration Codex actuelle. Les paramètres de bac à sable avec espaces de noms Linux ne fonctionnent pas ici. Sélectionnez explicitement le bac à sable de l’app iOS pour accéder aux fichiers Linux de cette app dans Chat."
    },
    de:{
      sandbox:"iOS-App-Sandbox", scope:"Nur für Chat. Codex kann auf alle Dateien der Linux-Umgebung dieser App zugreifen und das Netzwerk nutzen. Projektordner werden nicht voneinander isoliert. Die Genehmigungsrichtlinie bleibt on-request.",
      namespace:"Diese Codex-Richtlinie benötigt eine Linux-Namespace-Sandbox, die in dieser iOS-Laufzeit nicht verfügbar ist. Deine gespeicherte Auswahl bleibt erhalten. Wähle ausdrücklich eine unterstützte Richtlinie, um fortzufahren.",
      terminal:"Die iOS-App-Sandbox ist nur für Codex Chat verfügbar. Wähle ausdrücklich eine andere Richtlinie, bevor du den Terminal-Modus startest.",
      inherit:"Verwendet deine vorhandene Codex-Konfiguration. Einstellungen für Linux-Namespace-Sandboxes funktionieren hier nicht. Wähle ausdrücklich die iOS-App-Sandbox, um im Chat auf die Linux-Dateien dieser App zuzugreifen."
    }
  };
  const policyKeys = {"permission_app-sandbox":"sandbox","permission_hint_app-sandbox":"scope","permission_hint_read-only":"namespace","permission_hint_workspace-write":"namespace",error_ios_codex_sandbox:"namespace",error_ios_codex_terminal_policy:"terminal",ios_codex_inherit_hint:"inherit"};
  const overrides = {
    agent_gemini:["Gemini CLI","Gemini CLI"],
    "permission_app-sandbox":["iOS app sandbox","iOS 앱 샌드박스"],
    "permission_hint_app-sandbox":["Chat only. Codex can access all files in this app’s Linux environment and use the network. There is no project-folder isolation. Requests retain the on-request approval policy.","Chat 전용입니다. Codex가 이 앱의 Linux 환경 전체 파일과 네트워크에 접근할 수 있습니다. 프로젝트 폴더별 격리는 없으며 승인은 on-request 정책을 유지합니다."],
    "permission_hint_read-only":["The Linux namespace sandbox is unavailable in this iOS runtime. Your saved choice is kept; choose a supported policy explicitly before starting a session.","이 iOS 실행 환경에서는 Linux namespace 샌드박스를 사용할 수 없습니다. 저장된 선택은 유지합니다. 세션을 시작하기 전에 지원하는 권한을 직접 선택하세요."],
    "permission_hint_workspace-write":["The Linux namespace sandbox is unavailable in this iOS runtime. Your saved choice is kept; choose a supported policy explicitly before starting a session.","이 iOS 실행 환경에서는 Linux namespace 샌드박스를 사용할 수 없습니다. 저장된 선택은 유지합니다. 세션을 시작하기 전에 지원하는 권한을 직접 선택하세요."],
    ios_codex_inherit_hint:["Uses your existing Codex configuration. Linux namespace sandbox settings cannot run here. Choose iOS app sandbox explicitly for Chat when you need access to this app’s Linux files.","기존 Codex 설정을 사용합니다. Linux namespace 샌드박스 설정은 이 환경에서 실행되지 않습니다. Chat에서 앱의 Linux 파일을 사용하려면 iOS 앱 샌드박스를 직접 선택하세요."],
    error_ios_codex_sandbox:["This Codex policy requires an unavailable Linux namespace sandbox. Your saved choice is kept. Choose a supported policy explicitly to continue.","이 Codex 권한에는 지원하지 않는 Linux namespace 샌드박스가 필요합니다. 저장된 선택은 유지합니다. 계속하려면 지원하는 권한을 직접 선택하세요."],
    error_ios_codex_terminal_policy:["iOS app sandbox is available for Codex Chat only. Choose another policy explicitly before starting Terminal mode.","iOS 앱 샌드박스는 Codex Chat에서만 사용할 수 있습니다. Terminal 모드를 시작하려면 다른 권한을 직접 선택하세요."],
    welcome_eyebrow:["DEVELOP ON iOS","iOS에서 개발하기"],
    welcome_body:["Projects, agents and a Linux workspace inside this app.","앱 안의 Linux 작업 환경에서 프로젝트와 에이전트를 관리하세요."],
    setup_intro:["The local Linux environment starts with the app.","앱이 내장 Linux 환경을 시작합니다."],
    setup_connected:["Local Linux connected","내장 Linux 연결됨"],
    setup_connected_body:["Your projects and development tools run inside this app.","프로젝트와 개발 도구가 이 앱 안에서 실행됩니다."],
    termux_open:["Open local terminal","내장 터미널 열기"],
    agent_body:["Install the CLIs you need, check their versions, then complete account authentication in the terminal.","필요한 CLI를 설치하고 버전을 확인한 뒤 터미널에서 계정 인증을 완료하세요."],
    agent_termux_basis:["Linux ARM64 packages run through the embedded interpreter. Compatibility depends on each CLI.","내장 해석기에서 Linux ARM64 패키지를 실행합니다. CLI별 호환성은 다를 수 있습니다."],
    agent_action_hint:["Each action opens a local PTY session. Installation output and sign-in links appear there.","각 작업은 앱 안의 PTY 세션에서 열립니다. 설치 결과와 로그인 링크를 그곳에서 확인하세요."],
    agent_action_login:["Sign in","로그인"],
    agent_action_sent:["Opened a local terminal session. Check its output; opening does not confirm success.","내장 터미널 세션을 열었습니다. 출력에서 결과를 확인하세요. 세션 열기가 성공을 뜻하지는 않습니다."],
    agent_opencode_action_sent:["Opened a local terminal session. Check the result there.","내장 터미널 세션에서 결과를 확인하세요."],
    agent_hint:["A detected CLI does not confirm authentication or model access.","CLI 감지는 인증이나 모델 사용 권한을 확인한 결과가 아닙니다."],
    return_body:["Project files and saved conversations persist. iOS can suspend or stop the app; live processes are not restored after it exits.","프로젝트 파일과 저장된 대화는 유지됩니다. iOS가 앱을 일시 정지하거나 종료할 수 있으며 앱 종료 후 실행 프로세스는 복원되지 않습니다."],
    session_kept:["iOS may suspend the app in the background. Saved files persist; stopped processes are not restored.","백그라운드에서 iOS가 앱을 정지할 수 있습니다. 파일은 유지되지만 종료된 프로세스는 복원되지 않습니다."],
    notifications_app_update:["iOS background completion alerts are not available in this build.","이 빌드에서는 iOS 백그라운드 완료 알림을 제공하지 않습니다."],
    notifications_off:["Completion alerts are unavailable in this iOS build.","이 iOS 빌드에서는 완료 알림을 제공하지 않습니다."],
    notifications_hint:["iOS can suspend this app in the background. This build does not monitor response completion while suspended.","iOS가 백그라운드 앱을 정지할 수 있습니다. 이 빌드는 정지 중 응답 완료를 확인하지 않습니다."],
    error_android_required:["The local iOS connection is unavailable.","앱의 내장 실행 환경에 연결할 수 없습니다."]
  };
  function t(key, values = {}) {
    const pair = overrides[key];
    const policy = policyLocales[original.language()]?.[policyKeys[key]];
    const text = pair ? (policy || pair[original.language() === "ko" ? 1 : 0]).replace(/\{(\w+)\}/g, (all, name) => values[name] ?? all) : original.t(key, values);
    return text.replace(/Termux/g,"Linux").replace(/Android/g,"iOS");
  }
  window.BibimerI18n = {...original, t, errorKey:data=>overrides[data?.code] ? data.code : original.errorKey(data), apply() {
    original.apply();
    for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
    for (const attribute of ["placeholder","aria-label"]) for (const node of document.querySelectorAll(`[data-i18n-${attribute}]`)) node.setAttribute(attribute,t(node.getAttribute(`data-i18n-${attribute}`)));
  }};
  const labels = {codex:"Codex",claude:"Claude Code",opencode:"OpenCode",gemini:"Gemini CLI"};
  for (const [agent,label] of Object.entries(labels)) {
    const details = document.getElementById(`${agent}-install`);
    details.replaceChildren();
    const summary = document.createElement("summary"); summary.textContent = label; details.append(summary);
    const row = document.createElement("div"); row.className = "button-row";
    for (const [action,en,ko] of [["install","Install / update","설치 / 업데이트"],["version","Check version","버전 확인"],["login","Sign in","로그인"]]) {
      const button = document.createElement("button"); button.type = "button"; button.className = action === "install" ? "primary" : "secondary";
      button.dataset.agent = agent; button.dataset.agentAction = action; button.textContent = original.language() === "ko" ? ko : en;
      button.dataset.iosEn = en; button.dataset.iosKo = ko; row.append(button);
    }
    const status = document.createElement("p"); status.id = `agent-action-status-${agent}`; status.className = "hint"; status.hidden = true;
    details.append(row,status);
  }
  const oldApply = window.BibimerI18n.apply;
  window.BibimerI18n.apply = () => { oldApply(); for (const button of document.querySelectorAll("[data-ios-en]")) button.textContent = original.language() === "ko" ? button.dataset.iosKo : button.dataset.iosEn; };
  for (const selector of ["#manual-setup","#setup-connection-steps","#review-access-open","#app-update-banner","#app-update-card","#bridge-update-card","#forget","[data-command='restart']","[data-i18n='bridge_update_hint']","[data-i18n='agent_termux_return']"]) {
    const element = document.querySelector(selector); if (element) element.classList.add("ios-unavailable");
  }
  const maintenance = document.getElementById("bridge-maintenance-open"); if (maintenance) maintenance.classList.add("ios-unavailable");
})();
