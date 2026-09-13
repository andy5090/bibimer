"use strict";
(() => {
  // Each entry is [English default, Korean]. Terminal output is never translated.
  const strings = {
    tagline: ["Coding agents at your fingertips", "한 손으로 지휘하는 코딩 에이전트"],
    connection_initial: ["Not connected", "연결 전"],
    connection_on: ["Connected", "기기 연결됨"],
    connection_off: ["Disconnected", "연결 끊김"],
    welcome_eyebrow: ["START ON THIS PHONE", "이 휴대폰에서 시작"],
    welcome_title: ["Your projects.\nIn your hands.", "내 프로젝트,\n내 손 안의 개발."],
    welcome_body: ["Run coding agents in Termux on this phone and keep your work moving.", "같은 폰의 Termux에서 에이전트를 실행하고 작업을 이어가세요."],
    setup_device: ["Set up this phone", "기기 준비하기"],
    reconnect_existing: ["Reconnect to your bridge", "기존 브리지에 다시 연결"],
    project_eyebrow: ["PROJECT", "프로젝트"],
    project_empty: ["Add a project", "프로젝트를 등록하세요"],
    project_location: ["A working folder in Termux", "Termux 안의 작업 폴더"],
    edit_project: ["Edit", "변경"],
    project_folder: ["Project folder", "프로젝트 폴더"],
    create_folder: ["Create the folder if it does not exist", "폴더가 없으면 새로 만들기"],
    save_project: ["Save project", "프로젝트 등록"],
    process_idle: ["Not started", "실행 전"],
    process_running: ["Running", "실행 중"],
    process_stopping: ["Stopping", "종료 중"],
    process_lost: ["Session lost", "세션 유실"],
    process_exited: ["Exited · code {code}", "종료 · 코드 {code}"],
    process_last_seen: ["{state} (last seen)", "{state} (마지막 확인)"],
    reconnect: ["Reconnect", "다시 연결"],
    program_label: ["Program to run", "실행할 프로그램"],
    agent_shell: ["Terminal", "터미널"],
    agent_codex: ["Codex", "Codex"],
    agent_claude: ["Claude Code", "Claude Code"],
    install_required_suffix: [" · install first", " · 설치 필요"],
    start_session: ["Start session", "새 세션 시작"],
    terminal_label: ["Agent terminal output", "에이전트 터미널 출력"],
    terminal_ready: ["Ready when you are", "작업을 시작할 준비"],
    terminal_intro: ["Add a project and choose a program to run.", "프로젝트를 등록하고 실행할 프로그램을 선택하세요."],
    session_kept: ["Closing the app does not stop your session.", "앱 화면을 닫아도 실행 중인 세션은 종료하지 않습니다."],
    session_unknown: ["Current process state is unknown. Reconnect to check.", "현재 실행 상태는 미확인입니다. 다시 연결해 확인하세요."],
    session_lost_note: ["The bridge restarted. The previous process is no longer accessible.", "브리지가 다시 시작되어 이전 프로세스에 접근할 수 없습니다."],
    special_keys: ["Terminal keys", "터미널 특수 키"],
    arrow_up: ["Up arrow", "위쪽 화살표"],
    arrow_down: ["Down arrow", "아래쪽 화살표"],
    input_label: ["Input for the agent", "에이전트에 보낼 입력"],
    input_placeholder: ["Type an instruction or reply", "지시나 응답을 입력하세요"],
    send: ["Send", "보내기"],
    stop_session: ["Stop this session", "이 세션 종료"],
    setup_eyebrow: ["GET YOUR PHONE READY", "처음 한 번, 기기 준비"],
    setup_title: ["A workspace on your phone.", "폰 안에 개발 환경을."],
    setup_intro: ["Follow these steps to install Termux and connect the app.", "Termux 설치부터 앱 연결까지 순서대로 진행하세요."],
    language_label: ["Language", "언어"],
    language_hint: ["Choose your app language.", "앱에서 사용할 언어를 선택하세요."],
    termux_install: ["Install Termux", "Termux 설치"],
    checking: ["Checking", "확인 중"],
    installed: ["Installed", "설치 확인"],
    install_needed: ["Not installed", "설치 필요"],
    termux_body: ["Termux stores your projects and runs development commands on this phone. Open it once after installation to finish its initial setup.", "Termux는 이 폰에서 프로젝트 파일과 개발 명령을 다루는 실행 환경입니다. 설치 후 한 번 열어 초기 준비를 완료하세요."],
    termux_guide: ["Installation guide", "Termux 설치 안내"],
    termux_open: ["Open Termux ↗", "Termux 열기 ↗"],
    termux_hint: ["Use the same distribution source for Termux and its plugins. Complete installation on the linked page and in Android's installer.", "기존 Termux와 플러그인은 같은 배포처를 사용하세요. 설치는 이동한 안내 페이지와 Android 설치 화면에서 진행합니다."],
    bridge_setup: ["Set up the bridge", "브리지 준비"],
    bridge_body: ["Save the setup file as bibimer-setup.sh in your Download folder. It connects this app to Termux.", "앱과 Termux를 연결할 설정 파일을 다운로드(Download) 폴더에 bibimer-setup.sh 이름으로 저장하세요."],
    save_installer: ["Save setup file", "설정 파일 저장"],
    commands_body: ["Run these commands one at a time in Termux. Finish granting file access before running the installation command.", "Termux에서 아래 두 명령을 하나씩 실행하세요. 첫 명령의 파일 접근 허용을 마친 다음 설치 명령을 실행합니다."],
    copy: ["Copy", "복사"],
    copy_storage: ["Copy file access command", "파일 접근 명령 복사"],
    copy_install: ["Copy bridge installation command", "브리지 설치 명령 복사"],
    bridge_hint: ["The setup file installs Python if needed, then installs the bridge in your Termux home. Adjust the command if you saved the file under another name or folder.", "설정 파일은 필요한 경우 Python을 설치하고, Termux 홈에 브리지를 준비합니다. 설치 파일이나 폴더 이름이 달라지면 명령의 경로도 맞춰 주세요."],
    pair_title: ["Connect this app", "이 앱 연결"],
    pair_body: ["Enter the 8-digit pairing code shown in Termux. It can be used once within five minutes.", "Termux에 표시된 8자리 연결 코드를 입력하세요. 코드는 5분 동안 한 번 사용할 수 있습니다."],
    pair_label: ["8-digit pairing code", "8자리 연결 코드"],
    pair: ["Connect", "연결"],
    copy_start: ["Copy start command", "브리지 시작 명령 복사"],
    copy_pair: ["Copy new-code command", "새 코드 발급 명령 복사"],
    agent_setup: ["Prepare an agent", "에이전트 준비"],
    agent_body: ["Start with Terminal to check input and output. To use Codex or Claude Code, install a version that runs in Termux and complete any required sign-in.", "먼저 ‘터미널’로 실행과 입력을 확인할 수 있습니다. Codex나 Claude Code는 Termux에서 실행 가능하게 설치하고 필요한 로그인을 마치면 작업 화면에 표시됩니다."],
    codex_guide: ["Codex guide ↗", "Codex 안내 ↗"],
    claude_guide: ["Claude Code guide ↗", "Claude Code 안내 ↗"],
    agent_hint: ["Finding a program does not confirm Android compatibility or account access. Check each agent's Termux installation and runtime requirements.", "프로그램이 발견되어도 Android 실행 지원과 로그인 완료를 뜻하지는 않습니다. 에이전트마다 Termux 설치 방법과 실행 가능 여부를 확인해야 합니다."],
    return_title: ["When you come back", "다시 이어서 작업할 때"],
    return_body: ["Reopen the app to reconnect to a live bridge. If it is unavailable, run the start command in Termux. If Android stopped the environment, the previous process may no longer be recoverable.", "브리지가 살아 있으면 앱을 다시 열어 같은 세션에 연결합니다. 연결이 안 되면 Termux에서 시작 명령을 다시 실행하세요. Android가 실행 환경을 종료했다면 이전 프로세스는 복구되지 않을 수 있습니다."],
    forget: ["Forget this app's connection", "이 앱의 연결 정보 지우기"],
    version_note: ["Bibimer {version} · Termux on this phone", "Bibimer {version} · 이 휴대폰의 Termux에 연결"],
    navigation: ["Main navigation", "주 메뉴"],
    tab_work: ["Work", "작업"],
    tab_setup: ["Setup", "준비"],
    stop_title: ["Stop this session?", "이 세션을 종료할까요?"],
    stop_body: ["This stops the agent and commands running in this session.", "실행 중인 에이전트와 이 세션에서 시작한 명령을 중지합니다."],
    stop_cancel: ["Keep working", "계속 작업"],
    stop_confirm: ["Stop session", "세션 종료"],
    bridge_restarted: ["The bridge restarted. Check the state of your previous session.", "브리지가 다시 시작되었습니다. 이전 세션의 상태를 확인해 주세요."],
    output_gap: ["Some older output is no longer in the replay buffer.", "보관 범위를 넘긴 이전 출력 일부가 생략되었습니다."],
    paste_too_large: ["Split your input into chunks of 16KB or less.", "입력을 16KB 이하로 나누어 보내 주세요."],
    check_delivery: ["Check the output to see what arrived before sending it again.", "출력에서 전달 여부를 확인한 뒤 다시 입력해 주세요."],
    pairing_digits: ["Enter the 8-digit pairing code.", "8자리 연결 코드를 입력해 주세요."],
    connection_forgotten: ["Connection details removed. The Termux session is still running if it was active.", "앱의 연결 정보를 지웠습니다. Termux의 실행 세션은 종료하지 않았습니다."],
    language_save_failed: ["Could not save your language. Please try again.", "언어 설정을 저장하지 못했습니다. 다시 시도해 주세요."],
    error_timeout: ["The connection request timed out.", "연결 응답을 기다리는 시간이 초과되었습니다."],
    error_android_required: ["Connect from the Android app.", "Android 앱에서 연결해 주세요."],
    error_request_failed: ["Could not process the request.", "요청을 처리하지 못했습니다."],
    error_protocol: ["Update the app and bridge to compatible versions.", "앱과 브리지의 버전을 맞춰 주세요."],
    error_connection_failed: ["Could not reach the Termux bridge. Check that it is running in Termux.", "Termux 브리지에 연결하지 못했습니다. Termux에서 브리지가 실행 중인지 확인해 주세요."],
    error_input_busy: ["Input is queued up. Please try again shortly.", "입력 처리가 밀렸습니다. 잠시 후 다시 시도해 주세요."],
    error_number_range: ["Check the numeric value and its allowed range.", "숫자 범위를 확인해 주세요."],
    error_request_id: ["The request ID is invalid.", "요청 식별자가 올바르지 않습니다."],
    error_cursor_changed: ["The output position changed. Reconnect to the session.", "출력 위치가 달라졌습니다. 세션을 다시 연결해 주세요."],
    error_input_size: ["Each input must contain 1 to 16384 bytes.", "한 번에 보낼 입력은 1~16384바이트여야 합니다."],
    error_input_conflict: ["A request ID cannot be reused for different input.", "같은 요청 식별자로 다른 입력을 보낼 수 없습니다."],
    error_input_uncertain: ["This input may have been delivered only partly. Check the output.", "이 입력은 일부만 전달되었을 수 있습니다. 출력을 확인해 주세요."],
    error_session_not_running: ["Input can only be sent to a running session.", "실행 중인 세션에만 입력할 수 있습니다."],
    error_input_partial: ["Only part of the input was delivered. Check the output and send smaller chunks.", "입력 일부만 전달되었습니다. 출력 확인 후 나누어 보내 주세요."],
    error_resize: ["Could not resize the terminal.", "터미널 크기를 변경하지 못했습니다."],
    error_pairing_expired: ["The pairing code expired. Generate a new code in Termux.", "연결 코드가 만료되었습니다. Termux에서 새 코드를 발급해 주세요."],
    error_pairing_invalid: ["Check the pairing code. After five failed attempts, generate a new one.", "연결 코드를 확인해 주세요. 5회 실패하면 새 코드가 필요합니다."],
    error_project_busy: ["Stop the current session before changing projects.", "프로젝트 변경 전 현재 세션을 종료해 주세요."],
    error_project_path: ["Enter a project path in Termux.", "Termux의 프로젝트 경로를 입력해 주세요."],
    error_absolute_path: ["Enter an absolute path or a path starting with ~/.", "절대 경로 또는 ~/로 시작하는 경로를 입력해 주세요."],
    error_project_access: ["Choose a project folder with read and write access.", "읽고 쓸 수 있는 프로젝트 폴더가 필요합니다."],
    error_program: ["Choose a supported program to run.", "지원하는 실행 항목을 선택해 주세요."],
    error_launch_conflict: ["This launch request ID has already been used.", "실행 요청 식별자가 중복되었습니다."],
    error_session_exists: ["A session is already running.", "이미 실행 중인 세션이 있습니다."],
    error_project_required: ["Add a project first.", "프로젝트를 먼저 등록해 주세요."],
    error_program_missing: ["This program is not installed in Termux. Check the setup guide.", "Termux에 해당 프로그램이 없습니다. 준비 안내를 확인해 주세요."],
    error_launch_failed: ["Could not start the process. Check the folder and program.", "프로세스를 시작하지 못했습니다. 폴더와 프로그램을 확인해 주세요."],
    error_session_missing: ["This session is no longer accessible. Refresh its current state.", "이 실행 세션에 접근할 수 없습니다. 현재 상태를 다시 확인해 주세요."],
    error_http_request: ["The request could not be handled.", "요청을 처리할 수 없습니다."],
    error_internal: ["The bridge could not process the request.", "브리지에서 요청을 처리하지 못했습니다."],
    error_local_only: ["Only the app's local connection is allowed.", "앱의 로컬 연결만 허용합니다."],
    error_pairing_required: ["Connect the app to Termux first.", "앱과 Termux를 먼저 연결해 주세요."],
    error_content_length: ["The request length is invalid.", "요청 길이가 올바르지 않습니다."],
    error_json_required: ["Only JSON requests are accepted.", "JSON 요청만 허용합니다."],
    error_invalid_json: ["The JSON request is invalid.", "JSON 요청이 올바르지 않습니다."],
    error_route: ["The requested endpoint was not found.", "요청 경로를 찾을 수 없습니다."],
    error_cursor: ["The output position is invalid.", "출력 위치가 올바르지 않습니다."],
    error_input_format: ["The input format is invalid.", "입력 형식이 올바르지 않습니다."]
  };
  let language = "en";
  const legacyErrors = new Map();
  for (const [key, values] of Object.entries(strings)) {
    if (key.startsWith("error_")) for (const text of values) legacyErrors.set(text, key);
  }
  function t(key, values = {}) {
    const entry = strings[key];
    const message = entry ? (entry[language === "ko" ? 1 : 0] || entry[0]) : key;
    return message.replace(/\{(\w+)\}/g, (match, name) => values[name] === undefined ? match : String(values[name]));
  }
  function apply() {
    document.documentElement.lang = language;
    for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
    for (const attribute of ["placeholder", "aria-label"]) {
      for (const node of document.querySelectorAll(`[data-i18n-${attribute}]`)) {
        node.setAttribute(attribute, t(node.getAttribute(`data-i18n-${attribute}`)));
      }
    }
  }
  window.BibimerI18n = {
    t, apply, has: key => Object.hasOwn(strings, key), language: () => language,
    setLanguage: value => { language = value === "ko" ? "ko" : "en"; },
    // Version 0.1.0 bridges have no error code. Translate those known messages
    // without restarting their live sessions or touching terminal transcripts.
    errorKey: data => strings[data.code] && data.code.startsWith("error_") ? data.code :
      legacyErrors.get(data.error) || "error_request_failed"
  };
})();
