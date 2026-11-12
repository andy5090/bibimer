"use strict";
(() => {
  function validURL(value) {
    if(typeof value!=="string"||value.length>8192||/[\s\\\x00-\x20\x7f]/.test(value))return false;
    try{const url=new URL(value);return ["http:","https:"].includes(url.protocol)&&!!url.hostname&&!url.username&&!url.password;}catch(_){return false;}
  }
  function links(terminal,number) {
    const buffer=terminal.buffer.active;
    let first=number-1,last=first;
    if(!buffer.getLine(first))return [];
    while(first>0&&last-first<64&&buffer.getLine(first).isWrapped)first--;
    while(last+1<buffer.length&&last-first<64&&buffer.getLine(last+1).isWrapped)last++;
    const rows=[];let text="";
    for(let index=first;index<=last;index++){
      const line=buffer.getLine(index);let end=0;
      for(let x=0;x<line.length;x++)if(line.getCell(x)?.getChars())end=x+1;
      rows.push({line,index,start:text.length});text+=line.translateToString(index===last,0,end);
    }
    const point=(offset,end=false)=>{
      const row=[...rows].reverse().find(row=>row.start<=offset)||rows[0];let characters=row.start;
      for(let x=0;x<row.line.length;x++){
        const cell=row.line.getCell(x),width=cell?.getWidth()??1;
        if(width===0)continue;
        const count=(cell?.getChars()||" ").length;
        if(offset<characters+count)return {x:x+(end?width:1),y:row.index+1};
        characters+=count;
      }
      return {x:row.line.length,y:row.index+1};
    };
    const result=[];
    for(const match of text.matchAll(/https?:\/\/[^\s<>"'`]+/g)){
      let url=match[0].replace(/[.,;!?]+$/,"");
      for(const [open,close] of [["(",")"],["[","]"],["{","}"]])while(url.endsWith(close)&&url.split(close).length>url.split(open).length)url=url.slice(0,-1);
      if(!validURL(url))continue;
      const range={start:point(match.index),end:point(match.index+url.length-1,true)};
      if(range.start.y<=number&&range.end.y>=number)result.push({text:url,range});
    }
    return result;
  }
  function snapshot(terminal) {
    const buffer=terminal.buffer.active,rows=[];let last=Math.min(buffer.length-1,buffer.baseY+buffer.cursorY);
    for(let row=0;row<buffer.length;row++){
      const line=buffer.getLine(row);if(!line)continue;let end=0;
      for(let col=0;col<Math.min(line.length,terminal.cols);col++)if(line.getCell(col)?.getChars())end=col+1;
      rows[row]={text:line.translateToString(false,0,end),wrapped:line.isWrapped};if(end)last=Math.max(last,row);
    }
    let text="";
    for(let row=0;row<=last;row++)if(rows[row])text+=(row&&!rows[row].wrapped?"\n":"")+rows[row].text;
    // Match the native clipboard bound; keep a wrapped OAuth URL on one line.
    text=text.slice(-65536);if(/^[\uDC00-\uDFFF]/.test(text))text=text.slice(1);return text;
  }
  function create({terminal,native,t,context,selection=true,document=window.document}) {
    const area=document.getElementById("terminal"),identity=()=>JSON.stringify(context());
    let lastOpen=null,touch=null,origin=null,selectedRange=null;
    function open(url){
      if(!context().terminal||!validURL(url)||terminal.hasSelection())return;
      const now=Date.now();if(lastOpen?.url===url&&now-lastOpen.time<600)return;
      lastOpen={url,time:now};native.openLink(url);
    }
    terminal.registerLinkProvider({provideLinks(number,callback){callback(links(terminal,number).map(link=>({...link,activate:()=>open(link.text)})));}});
    area.addEventListener("pointerdown",event=>{
      touch=event.pointerType!=="mouse"&&event.isPrimary!==false?{id:event.pointerId,x:event.clientX,y:event.clientY,time:Date.now(),context:identity(),viewport:terminal.buffer.active.viewportY}:null;
    },{passive:true});
    area.addEventListener("pointermove",event=>{if(touch&&(event.pointerId!==touch.id||Math.hypot(event.clientX-touch.x,event.clientY-touch.y)>10))touch=null;},{passive:true});
    area.addEventListener("pointercancel",()=>{touch=null;},{passive:true});
    area.addEventListener("pointerup",event=>{
      const down=touch;touch=null;
      if(!down||event.pointerId!==down.id||identity()!==down.context||Date.now()-down.time>450||Math.hypot(event.clientX-down.x,event.clientY-down.y)>10||down.viewport!==terminal.buffer.active.viewportY)return;
      const box=area.querySelector(".xterm-screen")?.getBoundingClientRect();
      if(!box||box.width<=0||box.height<=0||event.clientX<box.left||event.clientX>=box.right||event.clientY<box.top||event.clientY>=box.bottom)return;
      const x=Math.floor((event.clientX-box.left)*terminal.cols/box.width)+1;
      const y=terminal.buffer.active.viewportY+Math.floor((event.clientY-box.top)*terminal.rows/box.height)+1;
      const link=links(terminal,y).find(({range})=>(y>range.start.y||x>=range.start.x)&&(y<range.end.y||x<=range.end.x));
      if(link){event.preventDefault();open(link.text);}
    });
    const nodes={};
    if(selection){
      const make=(tag,id,parent)=>{const node=document.createElement(tag);node.id=id;parent.append(node);return node;};
      nodes.select=make("button","terminal-output-select",document.querySelector(".session-bar"));nodes.select.type="button";nodes.select.className="icon-button";
      nodes.select.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4M9 8h6m-3 0v8m-3 0h6"/></svg>';
      nodes.dialog=make("dialog","terminal-output-dialog",document.body);nodes.dialog.className="settings-dialog";nodes.dialog.setAttribute("aria-labelledby","terminal-output-title");
      nodes.title=make("h2","terminal-output-title",nodes.dialog);
      nodes.hint=make("p","terminal-output-hint",nodes.dialog);nodes.hint.className="hint";
      nodes.output=make("textarea","terminal-output-text",nodes.dialog);nodes.output.readOnly=true;nodes.output.spellcheck=false;nodes.output.setAttribute("wrap","off");nodes.output.setAttribute("autocapitalize","off");nodes.output.setAttribute("autocomplete","off");nodes.output.setAttribute("aria-describedby","terminal-output-hint");
      const row=make("div","terminal-output-actions",nodes.dialog);row.className="button-row";
      nodes.copy=make("button","terminal-output-copy",row);nodes.copy.type="button";nodes.copy.className="secondary";
      nodes.close=make("button","terminal-output-close",row);nodes.close.type="button";nodes.close.className="secondary";
      nodes.status=make("p","terminal-output-status",nodes.dialog);nodes.status.className="hint";nodes.status.setAttribute("role","status");
      nodes.select.addEventListener("click",()=>{
        if(!context().terminal)return;origin=identity();nodes.output.value=snapshot(terminal);nodes.status.textContent="";selectedRange=[0,0];
        nodes.dialog.showModal();nodes.output.focus({preventScroll:true});nodes.output.setSelectionRange(0,0);
      });
      nodes.output.addEventListener("select",()=>{selectedRange=[nodes.output.selectionStart,nodes.output.selectionEnd];});
      nodes.copy.addEventListener("pointerdown",event=>{selectedRange=[nodes.output.selectionStart,nodes.output.selectionEnd];event.preventDefault();});
      nodes.copy.addEventListener("click",()=>{
        if(!nodes.dialog.open||origin!==identity())return;
        const [start,end]=selectedRange||[nodes.output.selectionStart,nodes.output.selectionEnd];
        const value=nodes.output.value.slice(start,end)||nodes.output.value;
        if(value){native.copyText(value);nodes.status.textContent=t("copied");}
      });
      nodes.close.addEventListener("click",()=>nodes.dialog.close());
      nodes.dialog.addEventListener("close",()=>{nodes.output.value="";nodes.status.textContent="";origin=null;selectedRange=null;if(context().terminal)nodes.select.focus({preventScroll:true});});
    }
    function update(){
      if(touch&&touch.context!==identity())touch=null;
      if(!selection)return;
      nodes.select.hidden=!context().terminal;
      if(nodes.dialog.open&&origin!==identity())nodes.dialog.close();
      nodes.select.setAttribute("aria-label",t("terminal_select_output"));nodes.select.title=t("terminal_select_output");
      nodes.title.textContent=t("terminal_output_title");nodes.hint.textContent=t("terminal_output_hint");nodes.output.setAttribute("aria-label",t("terminal_output_title"));
      nodes.copy.textContent=t("copy");nodes.close.textContent=t("sidebar_close");
    }
    update();return {update};
  }
  window.BibimerTerminalOutput=Object.freeze({create,links,snapshot,validURL});
})();
