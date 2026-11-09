"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const context = vm.createContext({window:{},performance:{now:() => clock}});
let clock = 0;
vm.runInContext(fs.readFileSync("ios/app/Resources/text-gestures.js", "utf8"), context);
function fixture(initial = 13) {
  const listeners = new Map(), target = {}, outside = {}, changes = [];
  let size = initial, allowed = true;
  const panel = {contains:node => node === target, getBoundingClientRect:() => ({left:0,top:0,right:300,bottom:500}),
    addEventListener:(type,handler) => listeners.set(type,handler), removeEventListener:(type,handler) => {if (listeners.get(type) === handler) listeners.delete(type);}};
  const api = context.window.BibimerTextGestures.attach(panel, {getSize:() => size,setSize:value => {size = value; changes.push(value);},enabled:() => allowed});
  const touch = (id,x,y = 100,node = target) => ({identifier:id,clientX:x,clientY:y,target:node});
  const emit = (type,touches = [],extra = {}) => {
    const event = {touches,changedTouches:[],cancelable:true,prevented:false,stopped:false,
      preventDefault(){this.prevented = true;},stopImmediatePropagation(){this.stopped = true;},...extra};
    listeners.get(type)?.(event); return event;
  };
  return {api,changes,listeners,target,outside,touch,emit,size:() => size,enable:value => {allowed = value;}};
}
{
  const f = fixture(), p = f.touch;
  assert.equal(f.emit("touchstart", [p(1,50)]).prevented,false);
  assert.equal(f.emit("touchmove", [p(1,90)]).prevented,false);
  assert.equal(f.emit("touchend", [], {changedTouches:[p(1,90)]}).prevented,false);
  assert.deepEqual(f.changes,[],"Single-finger scrolling and selection never resize text");
  assert.equal(f.emit("touchstart", [p(1,50),p(2,150)]).prevented,true);
  f.emit("touchmove", [p(2,250),p(1,50)]);assert.equal(f.size(),26,"Touch array reordering retains finger identities");
  f.emit("touchmove", [p(1,50),p(2,260)]);assert.deepEqual(f.changes,[26],"Clamped values do not cause repeated updates");
  f.emit("touchmove", [p(1,50),p(2,70)]);assert.equal(f.size(),10);
  f.emit("touchmove", [p(1,50),p(2,150)]);assert.equal(f.size(),13);
  assert.equal(f.emit("touchend", [p(1,50)], {changedTouches:[p(2,150)]}).prevented,true);
  f.emit("touchmove", [p(1,50),p(2,250)]);assert.equal(f.size(),13,"Ended gestures cannot resume from touchmove");
}
for (const invalid of ["outside-target","outside-bounds","same-id","zero-gap","invalid-coordinate","three-fingers"]) {
  const f = fixture(), p = f.touch;
  const points = invalid === "outside-target" ? [p(1,50),p(2,150,100,f.outside)] :
    invalid === "outside-bounds" ? [p(1,50),p(2,350)] : invalid === "same-id" ? [p(1,50),p(1,150)] :
    invalid === "zero-gap" ? [p(1,50),p(2,50)] : invalid === "invalid-coordinate" ? [p(1,NaN),p(2,150)] : [p(1,50),p(2,150),p(3,200)];
  assert.equal(f.emit("touchstart",points).prevented,false,invalid);
  f.emit("touchmove",[p(1,50),p(2,250)]);assert.deepEqual(f.changes,[],invalid);
}
for (const reason of ["disabled","third-finger","lost-id","invalid-gap","uncancelable","explicit-cancel"]) {
  const f = fixture(), p = f.touch;
  f.emit("touchstart",[p(1,50),p(2,150)]);
  if (reason === "disabled") f.enable(false);
  if (reason === "explicit-cancel") f.api.cancel();
  const points = reason === "third-finger" ? [p(1,50),p(2,250),p(3,275)] : reason === "lost-id" ? [p(1,50),p(3,250)] : reason === "invalid-gap" ? [p(1,50),p(2,50)] : [p(1,50),p(2,250)];
  assert.equal(f.emit("touchmove",points,{cancelable:reason !== "uncancelable"}).prevented,false,reason);
  f.enable(true);f.emit("touchmove",[p(1,50),p(2,250)]);assert.deepEqual(f.changes,[],reason);
}
{
  const f = fixture(), p = f.touch;
  f.emit("touchstart",[p(1,50),p(2,150)]);f.emit("touchmove",[p(1,50),p(2,200)]);
  f.emit("touchend",[],{changedTouches:[p(1,50),p(2,200)]});
  f.emit("touchstart",[p(3,50)]);
  assert.equal(f.emit("click",[],{target:f.target,clientX:50,clientY:100,isTrusted:true,detail:1,pointerType:"touch"}).prevented,false,"A fresh physical touch is not the prior pinch's ghost click");
}
{
  const f = fixture(), p = f.touch;
  f.emit("touchstart",[p(1,50),p(2,150)]);f.emit("touchmove",[p(1,50),p(2,200)]);
  assert.equal(f.size(),20);
  f.emit("touchend",[],{changedTouches:[p(1,50),p(2,200)]});
  const click = extra => f.emit("click",[],{target:f.target,clientX:50,clientY:100,isTrusted:true,detail:1,...extra});
  assert.equal(click({detail:0}).prevented,false,"Keyboard activation is preserved");
  assert.equal(click({isTrusted:false}).prevented,false,"Programmatic activation is preserved");
  assert.equal(click({pointerType:"mouse"}).prevented,false,"Explicit mouse clicks are preserved");
  assert.equal(click({sourceCapabilities:{firesTouchEvents:false}}).prevented,false);
  assert.equal(click({target:f.outside}).prevented,false);
  assert.equal(click({clientX:290,clientY:450}).prevented,false,"Unrelated coordinates are preserved");
  const ghost = click({pointerType:"touch"});assert.equal(ghost.prevented,true);assert.equal(ghost.stopped,true);
  assert.equal(click({pointerType:"touch"}).prevented,false,"Only the next generated activation is suppressed");
}
{
  const f = fixture(), p = f.touch;
  f.emit("touchstart",[p(1,50),p(2,150)]);f.emit("touchmove",[p(1,50),p(2,200)]);
  f.emit("touchcancel",[],{changedTouches:[p(1,50),p(2,200)]});
  clock += 401;
  assert.equal(f.emit("click",[],{target:f.target,clientX:50,clientY:100,isTrusted:true,detail:1,pointerType:"touch"}).prevented,false);
  f.api.destroy();assert.equal(f.listeners.size,0);
  f.emit("touchstart",[p(1,50),p(2,150)]);f.emit("touchmove",[p(1,50),p(2,250)]);assert.deepEqual(f.changes,[20]);
}
for (const initial of [NaN,Infinity,0,-1]) {
  const f = fixture(initial), p = f.touch;
  assert.equal(f.emit("touchstart",[p(1,50),p(2,150)]).prevented,false);
}
console.log("PASS scoped text pinch: size/clamps/identity, single-finger pass-through, panel boundaries, disabled/third-finger/lost-touch cancellation, scoped ghost-click suppression and listener cleanup");
