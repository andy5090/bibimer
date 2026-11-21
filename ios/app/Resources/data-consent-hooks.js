  // Explicit consent precedes any native dispatch that can start an agent,
  // resume work or send user content. Reads and local preview operations stay local.
  const iosConsent = window.BibimerDataConsent;
  const iosConsentContext = () => JSON.stringify([instance,projectKey(),viewKey(),currentTab,paused]);
  iosConsent.configure(iosConsentContext);
  const iosOriginalAPI = api;
  api = async function(method,path,data={}) {
    const targetID = path.match(/^\/v1\/sessions\/([^/]+)\//)?.[1];
    let target = targetID ? findSession(targetID) : null;
    const action = path.split("/").at(-1);
    const worktreeLaunch = path === "/v1/worktrees/manage" && data.action === "launch";
    if (worktreeLaunch) {
      const job = worktreeCreator.state?.job;
      if (!job || job.id !== data.request_id) throw Object.assign(appError("error_connection_failed"),{status:409});
      target = {agent:job.agent,mode:job.mode,options:job.options,project:{id:job.project_id,path:job.path}};
    }
    const restores = ["/v1/agent-connections","/v1/agent-updates"].includes(path) && ["start","retry_restore"].includes(data.action) && (data.reopen === true || data.action === "retry_restore");
    const iosSetup = path === "/v1/ios/agents" && ["install","version","login"].includes(data.action);
    if (iosSetup && data.action === "login") iosConsent.invalidate();
    const newSession = path === "/v1/sessions" || worktreeLaunch || restores || iosSetup;
    const contentAction = ["message","steer","respond","input"].includes(action) ||
      (action === "queue" && !["pause","cancel","remove","edit"].includes(data.action)) ||
      (action === "handoff" && data.action === "start") || (action === "manage" && data.action === "reopen");
    if (method === "POST" && (newSession || contentAction)) {
      if (targetID && !target && !data.agent) throw Object.assign(appError("error_connection_failed"),{status:409});
      const agent = data.agent || target?.agent || "shell";
      const purpose = iosSetup || agent === "shell" || (data.mode || target?.mode) === "terminal" ? "terminal" : "chat";
      const model = data.options?.model || target?.options?.model || "";
      const context = iosConsentContext();
      const scope = JSON.stringify([instance,data.project_id || target?.project?.id || projectKey(),data.worktree_path || data.branch || target?.project?.path || "",agent,model]);
      const allowed = await iosConsent.ensure({purpose,recipient:iosConsent.recipient(purpose === "terminal" ? "shell" : agent,model),scope,
        remember:purpose === "terminal",guard:()=>context===iosConsentContext() && online && !paused});
      if (!allowed) throw Object.assign(appError("ios_data_cancelled"),{status:409});
    }
    if (method === "POST" && path === "/v1/agent-connections" && ["start","logout","terminal","code","retry_restore"].includes(data.action)) iosConsent.invalidate();
    if (method === "POST" && action === "input" && (target?.agent === "shell" || target?.mode === "terminal")) iosConsent.invalidateChat();
    const result = await iosOriginalAPI(method,path,data);
    return result;
  };
