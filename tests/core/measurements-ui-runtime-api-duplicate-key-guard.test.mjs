import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

function topLevelEntries(source,marker){
  const start=source.indexOf(marker);
  assert.notEqual(start,-1);
  let index=start+marker.length,depth=1,quote=null,escaped=false,entryStart=index;
  const entries=[];
  const push=(end)=>{const raw=source.slice(entryStart,end).trim();if(raw)entries.push(raw);};
  for(;index<source.length;index++){
    const ch=source[index];
    if(quote){
      if(escaped){escaped=false;continue;}
      if(ch==="\\"){escaped=true;continue;}
      if(ch===quote){quote=null;continue;}
      continue;
    }
    if(ch==="'"||ch==='"'||ch==="\`"){quote=ch;continue;}
    if(ch==="("||ch==="["||ch==="{"){depth++;continue;}
    if(ch===")"||ch==="]"||ch==="}"){
      depth--;
      if(depth===0){push(index);break;}
      continue;
    }
    if(ch===","&&depth===1){push(index);entryStart=index+1;}
  }
  return entries;
}

test("question 853: TubeBenderMeasurements runtime API has no duplicate top-level keys",()=>{
  const entries=topLevelEntries(ui,"window.TubeBenderMeasurements=Object.freeze({");
  const keys=entries.map(entry=>{
    const explicit=entry.match(/^([A-Za-z_$][\w$]*)\s*:/);
    if(explicit)return explicit[1];
    const shorthand=entry.match(/^([A-Za-z_$][\w$]*)$/);
    return shorthand?.[1]??null;
  }).filter(Boolean);
  assert.equal(keys.length,entries.length);
  const counts=new Map();
  for(const key of keys)counts.set(key,(counts.get(key)??0)+1);
  assert.deepEqual([...counts.entries()].filter(([,count])=>count>1),[]);
});
