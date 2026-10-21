"use strict";
(() => {
  const keys = ["select","paste","title","hint","selection","all","close","copied","choose","empty","failed","changed","large","pasted"];
  const locales = {
    en:["Select text","Paste","Terminal text","Select part of the output to copy. This is a snapshot; new output stays in the terminal.","Copy selection","Copy all","Close","Copied.","Select some text first.","The clipboard has no text.","Could not read the clipboard. Try Paste again and allow access if iOS asks.","The session, draft or cursor changed. Nothing was pasted. Try again.","The draft would exceed 16 KiB. Nothing was pasted.","Pasted into the draft. Review it before sending."],
    ko:["텍스트 선택","붙여넣기","터미널 텍스트","출력 일부를 선택해 복사하세요. 이 창은 현재 출력의 사본이며 새 출력은 터미널에 표시됩니다.","선택 부분 복사","전체 복사","닫기","복사했습니다.","먼저 텍스트를 선택하세요.","클립보드에 텍스트가 없습니다.","클립보드를 읽지 못했습니다. 다시 붙여넣고 iOS가 요청하면 접근을 허용하세요.","세션·초안·커서가 바뀌어 붙여넣지 않았습니다. 다시 시도하세요.","초안이 16 KiB를 초과해 붙여넣지 않았습니다.","초안에 붙여넣었습니다. 전송 전에 확인하세요."],
    "pt-BR":["Selecionar texto","Colar","Texto do terminal","Selecione parte da saída para copiar. Esta é uma captura; novas saídas ficam no terminal.","Copiar seleção","Copiar tudo","Fechar","Copiado.","Selecione um texto primeiro.","A área de transferência não contém texto.","Não foi possível ler a área de transferência. Tente Colar novamente e permita o acesso se o iOS solicitar.","A sessão, o rascunho ou o cursor mudou. Nada foi colado. Tente novamente.","O rascunho excederia 16 KiB. Nada foi colado.","Colado no rascunho. Revise antes de enviar."],
    es:["Seleccionar texto","Pegar","Texto del terminal","Selecciona parte de la salida para copiar. Es una captura; la nueva salida queda en el terminal.","Copiar selección","Copiar todo","Cerrar","Copiado.","Selecciona texto primero.","El portapapeles no contiene texto.","No se pudo leer el portapapeles. Vuelve a pulsar Pegar y permite el acceso si iOS lo solicita.","La sesión, el borrador o el cursor cambió. No se pegó nada. Inténtalo de nuevo.","El borrador superaría 16 KiB. No se pegó nada.","Pegado en el borrador. Revísalo antes de enviar."],
    id:["Pilih teks","Tempel","Teks terminal","Pilih sebagian keluaran untuk disalin. Ini adalah cuplikan; keluaran baru tetap di terminal.","Salin pilihan","Salin semua","Tutup","Disalin.","Pilih teks terlebih dahulu.","Papan klip tidak berisi teks.","Papan klip tidak dapat dibaca. Coba Tempel lagi dan izinkan akses jika iOS meminta.","Sesi, draf, atau kursor berubah. Tidak ada yang ditempel. Coba lagi.","Draf akan melebihi 16 KiB. Tidak ada yang ditempel.","Ditempel ke draf. Periksa sebelum mengirim."],
    "zh-Hans":["选择文本","粘贴","终端文本","选择部分输出以复制。这是当前输出的快照，新输出仍显示在终端中。","复制所选内容","全部复制","关闭","已复制。","请先选择文本。","剪贴板中没有文本。","无法读取剪贴板。请再次点按粘贴，并在 iOS 询问时允许访问。","会话、草稿或光标已改变，未粘贴任何内容。请重试。","草稿将超过 16 KiB，未粘贴任何内容。","已粘贴到草稿，请在发送前检查。"],
    ja:["テキストを選択","貼り付け","ターミナルのテキスト","出力の一部を選択してコピーできます。現在の出力のコピーであり、新しい出力はターミナルに表示されます。","選択範囲をコピー","すべてコピー","閉じる","コピーしました。","先にテキストを選択してください。","クリップボードにテキストがありません。","クリップボードを読み取れませんでした。もう一度貼り付けを押し、iOS が求めたらアクセスを許可してください。","セッション・下書き・カーソルが変わったため貼り付けませんでした。もう一度お試しください。","下書きが 16 KiB を超えるため貼り付けませんでした。","下書きに貼り付けました。送信前に確認してください。"],
    "zh-Hant":["選取文字","貼上","終端機文字","選取部分輸出以複製。這是目前輸出的快照，新輸出仍顯示在終端機中。","複製選取範圍","全部複製","關閉","已複製。","請先選取文字。","剪貼簿中沒有文字。","無法讀取剪貼簿。請再次點按貼上，並在 iOS 詢問時允許取用。","工作階段、草稿或游標已改變，未貼上任何內容。請重試。","草稿將超過 16 KiB，未貼上任何內容。","已貼上草稿，請在傳送前檢查。"],
    fr:["Sélectionner le texte","Coller","Texte du terminal","Sélectionnez une partie de la sortie à copier. Il s’agit d’un instantané ; les nouvelles sorties restent dans le terminal.","Copier la sélection","Tout copier","Fermer","Copié.","Sélectionnez d’abord du texte.","Le presse-papiers ne contient aucun texte.","Impossible de lire le presse-papiers. Réessayez de coller et autorisez l’accès si iOS le demande.","La session, le brouillon ou le curseur a changé. Rien n’a été collé. Réessayez.","Le brouillon dépasserait 16 Kio. Rien n’a été collé.","Collé dans le brouillon. Vérifiez avant l’envoi."],
    de:["Text auswählen","Einfügen","Terminaltext","Wähle einen Teil der Ausgabe zum Kopieren aus. Dies ist eine Momentaufnahme; neue Ausgaben bleiben im Terminal.","Auswahl kopieren","Alles kopieren","Schließen","Kopiert.","Wähle zuerst Text aus.","Die Zwischenablage enthält keinen Text.","Die Zwischenablage konnte nicht gelesen werden. Tippe erneut auf Einfügen und erlaube den Zugriff, wenn iOS danach fragt.","Sitzung, Entwurf oder Cursor hat sich geändert. Nichts wurde eingefügt. Versuche es erneut.","Der Entwurf würde 16 KiB überschreiten. Nichts wurde eingefügt.","In den Entwurf eingefügt. Prüfe ihn vor dem Senden."]
  };
  const label = (language,key) => (locales[language] || locales.en)[keys.indexOf(key)];

  function snapshot(terminal) {
    const buffer = terminal.buffer.active, lines = [];
    let last = Math.min(buffer.length - 1,buffer.baseY + buffer.cursorY);
    for (let row = 0; row < buffer.length; row++) {
      const line = buffer.getLine(row);
      if (!line) continue;
      let end = 0;
      // Empty cells are viewport padding; a written space has getChars() === " ".
      for (let column = 0; column < Math.min(line.length,terminal.cols); column++) if (line.getCell(column)?.getChars()) end = column + 1;
      const text = line.translateToString(false,0,end);
      lines.push({text,wrapped:line.isWrapped});
      if (text.length) last = Math.max(last,row);
    }
    let text = "";
    for (let row = 0; row <= last; row++) text += (row && !lines[row].wrapped ? "\n" : "") + lines[row].text;
    return text;
  }

  function create({terminal,input,native,context,language,document = window.document}) {
    const element = (tag,id,parent) => { const node = document.createElement(tag); node.id = id; parent.append(node); return node; };
    const row = document.createElement("div"); row.id = "ios-terminal-tools"; row.className = "ios-terminal-tools";
    document.getElementById("terminal-area").before(row);
    const select = element("button","ios-terminal-select",row), paste = element("button","ios-terminal-paste",row);
    const status = element("p","ios-terminal-status",row); status.setAttribute("role","status"); status.className = "hint";
    const dialog = element("dialog","ios-terminal-dialog",document.body); dialog.className = "settings-dialog ios-terminal-dialog";
    dialog.setAttribute("aria-labelledby","ios-terminal-title"); dialog.setAttribute("aria-describedby","ios-terminal-hint");
    const title = element("h2","ios-terminal-title",dialog), hint = element("p","ios-terminal-hint",dialog);
    hint.className = "hint";
    const output = element("textarea","ios-terminal-text",dialog); output.readOnly = true; output.spellcheck = false;
    output.setAttribute("wrap","off"); output.setAttribute("autocapitalize","off"); output.setAttribute("autocomplete","off");
    const buttons = element("div","ios-terminal-copy-actions",dialog); buttons.className = "button-row";
    const selection = element("button","ios-terminal-copy-selection",buttons), all = element("button","ios-terminal-copy-all",buttons), close = element("button","ios-terminal-close",buttons);
    const copyStatus = element("p","ios-terminal-copy-status",dialog); copyStatus.className = "hint"; copyStatus.setAttribute("role","status");
    for (const button of [select,paste,selection,all,close]) button.type = "button";
    let revision = 0, pending = false, previousContext = "", contextRevision = 0, origin = null, selectedRange = null;
    let inputRange = [input.selectionStart,input.selectionEnd,input.selectionDirection].join(":");
    const text = key => label(language(),key);
    const captureRange = () => {
      const next = [input.selectionStart,input.selectionEnd,input.selectionDirection].join(":");
      if (next !== inputRange) { revision++; inputRange = next; }
      if (document.activeElement === output) selectedRange = [output.selectionStart,output.selectionEnd];
    };
    input.addEventListener("input",()=>{revision++;captureRange();});
    input.addEventListener("select",captureRange); document.addEventListener("selectionchange",captureRange);
    output.addEventListener("select",()=>{selectedRange = [output.selectionStart,output.selectionEnd];});
    const contextKey = () => JSON.stringify(context());
    const identityKey = () => { const {paste,...identity} = context(); return JSON.stringify(identity); };
    const cleanup = () => {
      output.value = ""; selectedRange = null; copyStatus.textContent = "";
      const previous = origin; origin = null;
      if (previous?.context === identityKey() && previous.focus?.isConnected) previous.focus.focus({preventScroll:true});
    };
    dialog.addEventListener("close",cleanup);
    function update() {
      const current = context(), key = JSON.stringify(current);
      if (key !== previousContext) { previousContext = key; contextRevision++; }
      if (dialog.open && origin?.context !== identityKey()) { dialog.close(); cleanup(); }
      row.hidden = !current.terminal;
      select.disabled = !current.terminal;
      paste.disabled = pending || !current.paste || input.disabled;
      for (const [node,key] of [[select,"select"],[paste,"paste"],[title,"title"],[hint,"hint"],[selection,"selection"],[all,"all"],[close,"close"]]) node.textContent = text(key);
      output.setAttribute("aria-label",text("title"));
    }
    select.addEventListener("click",()=>{
      if (!context().terminal) return;
      revision++;
      origin = {context:identityKey(),focus:document.activeElement};
      output.value = snapshot(terminal); selectedRange = [0,0]; copyStatus.textContent = "";
      dialog.showModal(); output.focus({preventScroll:true}); output.setSelectionRange(0,0);
    });
    for (const button of [selection,all]) button.addEventListener("pointerdown",event=>{
      selectedRange = [output.selectionStart,output.selectionEnd]; event.preventDefault();
    });
    selection.addEventListener("click",()=>{
      const [start,end] = selectedRange || [output.selectionStart,output.selectionEnd];
      if (end <= start) { copyStatus.textContent = text("choose"); return; }
      native.copyText(output.value.slice(start,end)); copyStatus.textContent = text("copied");
    });
    all.addEventListener("click",()=>{ if (output.value) { native.copyText(output.value); copyStatus.textContent = text("copied"); } });
    close.addEventListener("click",()=>{dialog.close();cleanup();});
    paste.addEventListener("click",async()=>{
      if (pending || !context().paste || input.disabled) return;
      captureRange(); update();
      const target = contextKey(), epoch = contextRevision, edit = revision, value = input.value;
      const start = input.selectionStart, end = input.selectionEnd, direction = input.selectionDirection;
      pending = true; status.textContent = ""; update();
      try {
        const clipboard = await native.readClipboard();
        captureRange(); update();
        if (target !== contextKey() || epoch !== contextRevision || edit !== revision || input.value !== value || input.selectionStart !== start || input.selectionEnd !== end || input.selectionDirection !== direction || input.disabled || !context().paste) { status.textContent = text("changed"); return; }
        if (typeof clipboard !== "string" || !clipboard.length) { status.textContent = text("empty"); return; }
        const normalized = clipboard.replace(/\r\n?/g,"\n");
        const next = value.slice(0,start) + normalized + value.slice(end);
        if (new TextEncoder().encode(next).length > 16384) { status.textContent = text("large"); return; }
        input.focus({preventScroll:true}); input.setRangeText(normalized,start,end,"end");
        input.dispatchEvent(new Event("input",{bubbles:true})); status.textContent = text("pasted");
      } catch (error) { status.textContent = text(error.message === "clipboard_empty" ? "empty" : error.message === "clipboard_large" ? "large" : "failed"); }
      finally { pending = false; update(); }
    });
    update();
    return {update,close:()=>{if (dialog.open) dialog.close();cleanup();}};
  }
  window.BibimerTerminalTools = Object.freeze({create,snapshot,label});
})();
