"use strict";
// Local extraction only; no generated claims, model requests or network access.
window.BibimerSpeechText = (value, mode) => {
  if (typeof value !== "string" || value.length > 65536) return "";
  const clip=(text,limit)=>Array.from(text).slice(0,limit).join("");
  const plain=text=>text.replace(/^\s*(```|~~~)[^\n]*$/gm,"").replace(/!\[([^\]]*)\]\([^)]*\)/g,"$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/^\s{0,3}#{1,6}\s+/gm,"")
    .replace(/^\s*(?:[-*+] |[0-9]+[.)] )/gm,"").replace(/`/g,"").replace(/\*\*([^*]+)\*\*/g,"$1")
    .replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
  if(mode!=="summary")return plain(value);
  const text=plain(value.replace(/(```|~~~)[^\n]*\n[\s\S]*?(?:\1|$)/g," ").replace(/^\s*\|.*$/gm," "));
  if(text.length<=650)return text;
  const sentences=[...new Set(text.split(/(?<=[.!?。！？])\s*|\n+/u).map(s=>s.trim()).filter(s=>s.length>5))];
  if(!sentences.length)return clip(text,650);
  const frequencies=new Map();
  const tokens=sentences.map(sentence=>{
    const words=new Set((sentence.toLowerCase().match(/[\p{L}\p{N}]{2,30}/gu)||[]));
    for(const word of words)frequencies.set(word,(frequencies.get(word)||0)+1);return words;
  });
  const ranked=sentences.map((sentence,index)=>({index,score:((index===0?1.5:0)+(index===sentences.length-1?1:0)+
    [...tokens[index]].reduce((sum,word)=>sum+Math.min(5,frequencies.get(word)),0))/Math.sqrt(Math.max(1,tokens[index].size))})).sort((a,b)=>b.score-a.score);
  const selected=[];let size=0;
  for(const row of ranked){const length=sentences[row.index].length;if(length<=650 && size+length+selected.length<=700){selected.push(row.index);size+=length;}if(selected.length===3)break;}
  return selected.length ? selected.sort((a,b)=>a-b).map(index=>sentences[index]).join("\n") : clip(sentences[ranked[0].index],650);
};
