(()=>{
"use strict";
// Adds the approved reference interface around live TubeBender state and commands.
// It intentionally does not create fake CAD geometry, fabricated measurements or duplicate project data.
const $=s=>document.querySelector(s);
const getApi=()=>window.TubeBenderEngineering;
const workspace=()=>window.TubeBenderCadWorkspace;
const toast=s=>{try{getApi()?.toast?.(s);}catch{}};
let timer=null;
const format=n=>n!==null&&n!==undefined&&n!==""&&Number.isFinite(Number(n))?Number(n).toFixed(2):"—";
function current(){
 const api=getApi();const tube=api?.activeTube?.()??null;
 const project=api?.activeProject?.()??null;
 const rows=Array.isArray(tube?.rows)?tube.rows:[];
 let length=0,known=Boolean(tube&&rows.length);
 for(const row of rows){
   if(row?.type==="LINE"){
     const l=row.L;if(l==null||l===""||!Number.isFinite(Number(l))||Number(l)<0){known=false;break;}length+=Number(l);
   }else if(row?.type==="BEND"){
     const r=row.clr,a=row.angle;
     if(r==null||r===""||a==null||a===""||!Number.isFinite(Number(r))||!Number.isFinite(Number(a))||Number(r)<=0){known=false;break;}
     length+=Math.abs(Number(r)*Number(a)*Math.PI/180);
   }else{known=false;break;}
 }
 const diameter=tube?.od??tube?.OD??tube?.diameter??tube?.outerDiameter??tube?.outsideDiameter;
 const material=tube?.material?.name??tube?.material?.displayName??(typeof tube?.material==="string"?tube.material:null);
 return {project,tube,rows,bends:rows.filter(r=>r.type==="BEND").length,
   length:known&&Number.isFinite(length)?length:null,diameter,material,wall:tube?.wallThickness??tube?.wall??null};
}
function button(label,icon,action){
 const b=document.createElement("button");b.type="button";b.className="cad-reference-tool";
 b.dataset.cadRefAction=action;b.setAttribute("aria-label",label);b.title=label;
 const i=document.createElement("span");i.className="cad-command-icon";i.setAttribute("aria-hidden","true");i.textContent=icon;
 const t=document.createElement("span");t.className="cad-command-label";t.textContent=label;
 b.append(i,t);return b;
}
function action(name){
 try{
  // Never present an unavailable CAD command as if it succeeded.
  const requireCommand=(callback,message)=>{
   if(typeof callback!=="function")throw new Error(message);
   callback();return true;
  };
  if(name==="radius"||name==="dimensions"){
   // The native measurement editor owns all dimension data and tools.
   return requireCommand(window.TubeBenderMeasurements?.open?.bind(window.TubeBenderMeasurements),"Измерения недоступны");
  }
  if(name==="views"){
   return requireCommand(window.TubeBenderNamedViews?.openPanel?.bind(window.TubeBenderNamedViews),"Сохранённые виды недоступны");
  }
  if(name==="display"){
   return requireCommand(workspace()?.execute?.bind(workspace(),"views"),"Настройки отображения недоступны");
  }
  if(name==="properties"){
   return requireCommand(window.TubeBenderProperties?.open?.bind(window.TubeBenderProperties),"Свойства недоступны");
  }
  if(name==="checks"){
   return requireCommand(workspace()?.selectInspector?.bind(workspace(),"checks"),"Проверки недоступны");
  }
  throw new Error("Неизвестная CAD-команда");
 }catch(error){toast(String(error?.message??error));return false;}
}
function syncRibbon(){
 const bar=$("#cadCommands");if(!bar)return;
 const geometry=!!bar.querySelector('[data-cad-command="measure"]');
 if(geometry){
   for(const [name,label,icon] of [["radius","Радиус","⌒"],["dimensions","Размеры","↔"],["display","Вид","◈"]]){
     if(bar.querySelector('[data-cad-ref-action="'+name+'"]'))continue;
     const b=button(label,icon,name);b.onclick=()=>action(name);bar.append(b);
   }
 }
 const aliases={angle:"Угол",constraints:"Ограничения",modernConstraints:"Связи",
   views:"Виды",snap:"Привязки",section:"Сечение"};
 for(const b of bar.querySelectorAll("[data-cad-command]")){
   const name=aliases[b.dataset.cadCommand];if(name){
     const span=b.querySelector(".cad-command-label");if(span&&span.textContent!==name)span.textContent=name;
   }
 }
}
function installRibbon(){
 const bar=$("#cadCommands");if(!bar)return;
 const observer=new MutationObserver(()=>syncRibbon());
 observer.observe(bar,{childList:true});
 syncRibbon();
 window.addEventListener("pagehide",()=>observer.disconnect(),{once:true});
}
function attachViewer(){
 const pane=$(".tb-map-3d");if(!pane)return;
 const head=pane.querySelector(".tb-card-head");
 if(head&&!$("#cadReferenceQuick")){
   const controls=document.createElement("div");controls.id="cadReferenceQuick";controls.className="cad-reference-quick";
   for(const [text,title,actionId] of [["⌒","Измерить радиус","radius"],["↔","Размеры","dimensions"],["◇","Сохранённые виды","views"]]){
     const b=document.createElement("button");b.type="button";b.textContent=text;b.title=title;b.setAttribute("aria-label",title);
     b.addEventListener("click",()=>action(actionId));controls.append(b);
   }
   head.append(controls);
 }
 if(!$("#cadReferenceStatus")){
   const status=document.createElement("div");status.id="cadReferenceStatus";
   status.className="cad-reference-status";status.setAttribute("role","status");
   pane.append(status);
 }
}
function updateStatus(){
 const el=$("#cadReferenceStatus");if(!el)return;
 const s=current(),n=s.tube?.name??"Труба не выбрана";
 const parts=["◉ "+n,s.length===null?"Длина: не определена":"Длина осевой линии: "+format(s.length)+" мм",
   "Гибов: "+s.bends,"Материал: "+(s.material??"не указан")];
 const fragment=document.createDocumentFragment();
 for(let j=0;j<parts.length;j++){
  const span=document.createElement("span");span.textContent=parts[j];
  if(j===0)span.className="cad-reference-ok";
  fragment.append(span);
 }
 const signature=JSON.stringify(parts);
 if(el.dataset.signature===signature)return;
 el.dataset.signature=signature;el.replaceChildren(fragment);
}
function installInspector(){
 const slot=$("#cadPropertySlot");if(!slot||$("#cadReferenceInfo"))return;
 const info=document.createElement("div");info.id="cadReferenceInfo";
 const name=document.createElement("strong");name.id="cadReferenceName";
 const fields=document.createElement("div");fields.id="cadReferenceSummary";fields.className="cad-ref-sub";
 const edit=document.createElement("button");edit.type="button";edit.className="cad-reference-open";
 edit.textContent="Открыть свойства выбранного объекта";
 edit.onclick=()=>action("properties");
 info.append(name,fields,edit);slot.prepend(info);
}
function updateInspector(){
 const name=$("#cadReferenceName"),fields=$("#cadReferenceSummary");if(!name||!fields)return;
 const s=current();
 const line=s.tube?.name??"Труба не выбрана";
 const details=[s.project?.name??"Проект",
  s.diameter==null?"Ø —":"Ø "+format(s.diameter)+" мм",
  "Гибов: "+s.bends,s.material??"Материал не указан"].join(" · ");
 if(name.textContent!==line)name.textContent=line;
 if(fields.textContent!==details)fields.textContent=details;
}
function localizeChrome(){
 const nativeBottom=document.querySelectorAll(".tb-bottom-tab");
 const map={"Project map":"Карта проекта","3D model":"3D модель","Checks":"Проверки",
    "Production":"Производство","Project":"Проект"};
 for(const tab of nativeBottom){
   const text=tab.querySelector(".txt")??tab;
   if(map[text.textContent.trim()])text.textContent=map[text.textContent.trim()];
 }
 const header=$(".tb-tree-card .tb-card-head");
 if(header){
   for(const node of header.childNodes){
     if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim()==="Project")
       node.textContent=node.textContent.replace("Project","Проект");
   }
 }
}
function installBottomTechnology(){
 const bottom=$(".tb-map-bottom");
 if(!bottom||$("#cadReferenceTechTab"))return;
 const source=bottom.querySelector(".tb-bottom-tab");
 if(!source)return;
 const b=document.createElement("button");b.type="button";
 b.id="cadReferenceTechTab";b.className="tb-bottom-tab";
 b.innerHTML='<span class="ico" aria-hidden="true">♜</span><span class="txt">Технология</span>';
 b.onclick=()=>workspace()?.selectStage?.("technology");
 const production=bottom.querySelector('[data-tab="production"]');
 if(production)bottom.insertBefore(b,production);else bottom.append(b);
}
function refresh(){if(!document.body.classList.contains("cad-workspace"))return;
 attachViewer();installInspector();updateStatus();updateInspector();localizeChrome();
}
function start(){
 if(!workspace()||!$("#cadRibbon"))return;
 installRibbon();attachViewer();installInspector();installBottomTechnology();
 refresh();timer=setInterval(refresh,1000);
 window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
 window.TubeBenderReferenceWorkspace=Object.freeze({
   activeSummary:()=>current(),refresh,execute:action
 });
}
if(document.readyState==="complete")start();else window.addEventListener("load",start,{once:true});
})();