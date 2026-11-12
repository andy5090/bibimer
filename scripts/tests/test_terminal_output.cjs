"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.self=global;
const {Terminal}=require('../../android/app/src/main/assets/vendor/xterm.js');
const window={};vm.runInNewContext(fs.readFileSync('android/app/src/main/assets/terminal-output.js','utf8'),{window,URL,Date});
const tools=window.BibimerTerminalOutput;
class Node extends EventTarget{
 constructor(document){super();this.document=document;this.children=[];this.value='';this.selectionStart=this.selectionEnd=0;}
 append(node){this.children.push(node);if(node.id)this.document.nodes.set(node.id,node);}
 setAttribute(k,v){this[k]=v;}
 showModal(){this.open=true;}
 close(){this.open=false;this.dispatchEvent(new Event('close'));}
 focus(){this.document.activeElement=this;}
 setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;this.dispatchEvent(new Event('select'));}
 click(){this.dispatchEvent(new Event('click'));}
}
function fixture(terminal){
 const document={nodes:new Map(),createElement(){return new Node(this);},getElementById(id){return this.nodes.get(id);},querySelector(){return this.bar;}};
 document.body=new Node(document);document.bar=new Node(document);
 const area=new Node(document);document.nodes.set('terminal',area);
 const box={left:0,top:0,right:terminal.cols*10,bottom:terminal.rows*20,width:terminal.cols*10,height:terminal.rows*20};
 area.querySelector=()=>({getBoundingClientRect:()=>box});
 const state={terminal:true,session:'one',instance:'bridge',tab:'work'},opened=[],copied=[],providers=[];
 const register=terminal.registerLinkProvider;terminal.registerLinkProvider=provider=>{providers.push(provider);return register.call(terminal,provider);};
 const ui=tools.create({terminal,native:{openLink:url=>opened.push(url),copyText:text=>copied.push(text)},context:()=>({...state}),t:key=>key,document});
 const $=name=>document.nodes.get('terminal-output-'+name);
 const pointer=(type,x,y,extra={})=>{const event=new Event(type,{cancelable:true});Object.assign(event,{pointerType:'touch',pointerId:1,isPrimary:true,clientX:x,clientY:y,...extra});area.dispatchEvent(event);return event;};
 return {state,ui,$,opened,copied,providers,pointer};
}
async function terminal(text,cols=20){const term=new Terminal({cols,rows:8,scrollback:100});await new Promise(resolve=>term.write(text,resolve));return term;}
(async()=>{
 const url='https://claude.ai/oauth/authorize?state=fictional&redirect_uri=https%3A%2F%2Flocalhost';
 const term=await terminal('\x1b[32m로그인 '+url+'\x1b[0m\r\n');
 const found=tools.links(term,2);assert.equal(found.length,1);assert.equal(found[0].text,url);assert.equal(found[0].range.start.x,8);assert.ok(found[0].range.end.y>2);
 assert.equal(tools.snapshot(term),'로그인 '+url+'\n');
 const f=fixture(term);assert.equal(f.opened.length,0);
 // A mobile tap on the second visual row opens the entire wrapped URL.
 f.pointer('pointerdown',15,30);f.ui.update();f.pointer('pointerup',15,30);assert.deepEqual(f.opened,[url]);
 let links;f.providers[0].provideLinks(2,value=>links=value);links[0].activate({},url);assert.equal(f.opened.length,1,'synthetic click after touch does not double-open');
 f.pointer('pointerdown',15,30);f.pointer('pointermove',15,80);f.pointer('pointerup',15,80);assert.equal(f.opened.length,1,'scroll is not a link tap');
 f.pointer('pointerdown',15,30);f.pointer('pointercancel',15,30);f.pointer('pointerup',15,30);assert.equal(f.opened.length,1);
 f.pointer('pointerdown',15,30);f.state.session='two';f.pointer('pointerup',15,30);assert.equal(f.opened.length,1,'stale tap cannot open another session URL');
 f.pointer('pointerdown',15,30);f.pointer('pointerup',15,30,{pointerId:2});assert.equal(f.opened.length,1);
 f.$('select').click();assert.equal(f.$('text').readOnly,true);assert.equal(f.$('text').value,'로그인 '+url+'\n');
 f.$('text').setSelectionRange(4,4+url.length);f.$('copy').dispatchEvent(new Event('pointerdown',{cancelable:true}));
 f.$('text').selectionStart=f.$('text').selectionEnd=0;f.$('copy').click();assert.equal(f.copied[0],url,'selection survives tapping the copy control');
 const frozen=f.$('text').value;await new Promise(resolve=>term.write('new output',resolve));f.ui.update();assert.equal(f.$('text').value,frozen);
 f.$('text').setSelectionRange(0,0);f.$('copy').click();assert.equal(f.copied[1],frozen);
 f.state.session='three';f.ui.update();assert.equal(f.$('dialog').open,false);assert.equal(f.$('text').value,'');
 f.state.terminal=false;f.ui.update();assert.equal(f.$('select').hidden,true);f.$('select').click();assert.equal(f.$('dialog').open,false);
 for(const value of ['javascript:alert(1)','https://user:pass@example.test','https://example.test/\nsecret','https://example.test/\\evil','https://example.test/'+ 'a'.repeat(8192)])assert.equal(tools.validURL(value),false,value.slice(0,40));
 const parens=await terminal('(https://example.test/auth?a=(b))',80);assert.equal(tools.links(parens,1)[0].text,'https://example.test/auth?a=(b)');parens.dispose();
 const adjacent=await terminal('주소https://example.test/한😀',80);const adjacentLink=tools.links(adjacent,1)[0];assert.equal(adjacentLink.text,'https://example.test/한😀');assert.equal(adjacentLink.range.start.x,5);assert.equal(adjacentLink.range.end.x,28);adjacent.dispose();
 const whitespace=await terminal('1234567한\r\n한글 😀  \r\n   \r\n\r\n',8);assert.equal(tools.snapshot(whitespace),'1234567한\n한글 😀  \n   \n\n');whitespace.dispose();
 const long=new Terminal({cols:100,rows:8,scrollback:1000});await new Promise(resolve=>long.write(('A'.repeat(99)+'\r\n').repeat(900),resolve));assert.equal(tools.snapshot(long).length,65536);long.dispose();term.dispose();
 console.log('PASS terminal output: ANSI/CJK/wrapped URLs, mobile taps and synthetic click deduplication, scroll/cancel/context guards, stable selectable snapshot, partial/all copy, cleanup and URL/size bounds');
})().catch(error=>{console.error(error);process.exitCode=1;});
