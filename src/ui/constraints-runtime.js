(()=>{
  const CONSTRAINTS_URL="__TB_GEOMETRIC_CONSTRAINTS_MODULE_URL__";
  let domain=null,installed=false,panel=null,toggle=null;
  const eng=()=>window.TubeBenderEngineering??null;
  const ctx=()=>window.TubeBenderObjectContext??null;
  const assemblies=()=>window.TubeBenderAssemblies??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const clone=(v)=>v==null?v:structuredClone(v);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const toast=(m)=>{try{eng()?.toast?.(String(m??""));}catch{}};
  function command(label,mutate){
    const fn=eng()?.modelCommand;
    let ok;
    try{ok=typeof fn==="function"?fn(label,mutate):mutate();}catch(error){toast(error?.message??error);return false;}
    if(ok===false)return false;
    try{eng()?.save?.();eng()?.renderAll?.();window.refreshProjectTree?.();}catch{}
    render();
    try{window.dispatchEvent(new CustomEvent("tubebender-constraints-change"));}catch{}
    return true;
  }
  function tubeById(id){return (project()?.tubes??[]).find(t=>String(t?.id)===String(id))??null;}
  function rowByElementId(tube,id){
    return (tube?.rows??[]).find(r=>String(r?.elementId??"")===String(id))??null;
  }
  function geomElement(tube,ref){
    try{
      const g=eng()?.geometryForTube?.(tube);
      const id=String(ref?.subentity_id??"");
      return (g?.elements??[]).find(el=>String(el?.elementId??el?.id??el?.rowId??"")===id)??null;
    }catch{return null;}
  }
  function point(v){
    if(!v)return null;const x=Number(v.x??v[0]),y=Number(v.y??v[1]),z=Number(v.z??v[2]);
    return [x,y,z].every(Number.isFinite)?{x,y,z}:null;
  }
  function resolveReference(ref){
    const objectId=String(ref?.object_id??"");
    const tube=tubeById(objectId);
    if(tube){
      const sub=String(ref?.subentity_id??"");
      if(sub==="P1"){
        const p=tube?.engineering?.ports?.P1?.position??tube.origin;
        return {point:clone(p),position:clone(p),direction:clone(tube?.engineering?.ports?.P1?.direction??tube.startVector??null),signature:{object_id:objectId,subentity_id:"P1",point:clone(p)}};
      }
      if(sub==="P2"){
        const p=tube?.engineering?.ports?.P2?.position;
        return p?{point:clone(p),position:clone(p),direction:clone(tube?.engineering?.ports?.P2?.direction??null),signature:{object_id:objectId,subentity_id:"P2",point:clone(p)}}:null;
      }
      const el=geomElement(tube,ref),row=rowByElementId(tube,sub);
      if(el||row){
        const center=point(el?.center??el?.centerline?.center??null);
        const start=point(el?.start??el?.p0??el?.tangent_start??null);
        const dir=point(el?.direction??el?.tangent_in??el?.axis??null);
        const radius=Number(row?.clr??el?.radius_mm??el?.radius);
        const length=Number(row?.L??el?.length_mm??el?.length);
        return {
          point:start??center??clone(tube.origin),
          center,
          direction:dir,
          axis:dir,
          radius_mm:Number.isFinite(radius)?radius:null,
          length_mm:Number.isFinite(length)?length:null,
          value:Number.isFinite(length)?length:Number.isFinite(radius)?radius:null,
          signature:{object_id:objectId,subentity_id:sub,row:clone(row??null)}
        };
      }
      return {point:clone(tube.origin),position:clone(tube.origin),direction:clone(tube.startVector??null),signature:{object_id:objectId,origin:clone(tube.origin),rows:clone(tube.rows??[])}};
    }
    const mesh=window.TubeBenderReferenceSceneUi?.meshInstanceById?.(project(),objectId);
    if(mesh){
      const p=mesh.transform?.position_mm??{x:0,y:0,z:0};
      return {point:clone(p),position:clone(p),signature:{object_id:objectId,transform:clone(mesh.transform??null)}};
    }
    const assembly=assemblies()?.assemblyById?.(objectId);
    if(assembly){
      const p=assembly.frame?.origin_mm??{x:0,y:0,z:0};
      return {point:clone(p),position:clone(p),signature:{object_id:objectId,frame:clone(assembly.frame)}};
    }
    return null;
  }
  function entryReference(entry){
    if(!entry)return null;
    if(entry.kind==="tube"){
      const context=assemblies()?.contextForObjectId?.(entry.tubeId,tubeById(entry.tubeId)?.origin??null)??null;
      return {object_id:String(entry.tubeId),subentity_id:null,role:"constraint",assembly_context:clone(context)};
    }
    if(entry.kind==="row"){
      const tube=tubeById(entry.tubeId),row=tube?.rows?.[Number(entry.rowIndex)];
      const el=geomElement(tube,{subentity_id:row?.elementId});
      const world=point(el?.start??el?.p0??tube?.origin);
      const context=assemblies()?.contextForObjectId?.(entry.tubeId,world)??null;
      return {object_id:String(entry.tubeId),subentity_id:String(row?.elementId??("row:"+entry.rowIndex)),role:"constraint",assembly_context:clone(context),snap_type:row?.type==="LINE"?"Line/Axis":"Tangent"};
    }
    if(entry.kind==="origin"){
      const tube=tubeById(entry.tubeId),world=tube?.origin??null;
      const context=assemblies()?.contextForObjectId?.(entry.tubeId,world)??null;
      return {object_id:String(entry.tubeId),subentity_id:"P1",role:"constraint",assembly_context:clone(context),snap_type:"Endpoint"};
    }
    if(entry.kind==="end"){
      const tube=tubeById(entry.tubeId),world=tube?.engineering?.ports?.P2?.position??null;
      const context=assemblies()?.contextForObjectId?.(entry.tubeId,world)??null;
      return {object_id:String(entry.tubeId),subentity_id:"P2",role:"constraint",assembly_context:clone(context),snap_type:"Endpoint"};
    }
    if(entry.kind==="mesh-instance"){
      const mesh=window.TubeBenderReferenceSceneUi?.meshInstanceById?.(project(),entry.instanceId);
      const world=mesh?.transform?.position_mm??null;
      const context=assemblies()?.contextForObjectId?.(entry.instanceId,world)??null;
      return {object_id:String(entry.instanceId),subentity_id:null,role:"constraint",assembly_context:clone(context)};
    }
    if(entry.kind==="project-assembly"){
      const a=assemblies()?.assemblyById?.(entry.assemblyId),world=a?.frame?.origin_mm??null;
      return {object_id:String(entry.assemblyId),subentity_id:null,role:"constraint",assembly_context:assemblies()?.contextForObjectId?.(entry.assemblyId,world)??null};
    }
    return null;
  }
  function selectedReferences(){
    const refs=[],seen=new Set();
    for(const entry of ctx()?.selectionEntries?.()??[]){
      const ref=entryReference(entry);if(!ref)continue;
      const key=ref.object_id+"|"+String(ref.subentity_id??"");
      if(seen.has(key))continue;seen.add(key);refs.push(ref);
    }
    return refs;
  }
  function targetForFixed(type,refs){
    const resolved=refs.map(resolveReference);
    if(type==="FixedPoint")return {point:clone(resolved[0]?.point??resolved[0]?.position??null)};
    if(type==="FixedDirection")return {direction:clone(resolved[0]?.direction??resolved[0]?.axis??null)};
    if(type==="FixedGeometry")return {signature:clone(resolved[0]?.signature??resolved[0]??null)};
    return null;
  }
  function createFromSelection(type,{name=null,driving=true}={}){
    const refs=selectedReferences();
    const one=["Horizontal","Vertical","FixedDirection","FixedPoint","FixedGeometry"].includes(type);
    const min=one?1:type==="Tangent"||type==="Coincident"||type==="Collinear"||type==="Parallel"||type==="Perpendicular"||type==="Concentric"||type==="Equal"?2:1;
    if(refs.length<min){toast("Недостаточно выбранных геометрических ссылок для "+type);return false;}
    const relation=assemblies()?.crossAssemblyForContexts?.(refs.map(r=>r.assembly_context))??null;
    let created=null;
    return command("Создать Constraint "+type,()=>{
      created=domain.upsertGeometricConstraint(project(),{
        type,name:name??type,references:refs,target:targetForFixed(type,refs),driving,
        cross_assembly:clone(relation),status:"NeedsSolve"
      });
      const next=domain.recalculateGeometricConstraint(created,{resolveReference});
      const list=domain.ensureConstraintState(project()),index=list.findIndex(x=>String(x.id)===String(created.id));
      list[index]=clone(next);created=list[index];
      return true;
    });
  }
  function remove(id){return command("Удалить Constraint",()=>domain.removeGeometricConstraint(project(),id));}
  function setEnabled(id,enabled){
    return command(enabled?"Включить Constraint":"Отключить Constraint",()=>{
      const item=(project()?.geometric_constraints??[]).find(x=>String(x?.id)===String(id));if(!item)return false;
      item.enabled=enabled===true;item.status=item.enabled?"NeedsSolve":"Disabled";return true;
    });
  }
  function recalculateAll(){
    const list=domain.ensureConstraintState(project()),next=[];
    for(const item of list)next.push(clone(domain.recalculateGeometricConstraint(item,{resolveReference})));
    project().geometric_constraints=next;return next;
  }
  function validateProject({update=true}={}){
    const list=domain.ensureConstraintState(project()),results=[],conflicts=[];
    for(let i=0;i<list.length;i++){
      const item=list[i],next=domain.recalculateGeometricConstraint(item,{resolveReference});
      if(update)list[i]=clone(next);
      results.push({id:item.id,type:item.type,status:next.status});
      if(item.enabled!==false&&item.driving!==false&&next.status!=="Valid"&&next.status!=="Disabled"){
        conflicts.push({id:item.id,type:item.type,status:next.status,evaluation:clone(next.last_evaluation)});
      }
    }
    return {ok:conflicts.length===0,conflicts,results};
  }
  function ensurePanel(){
    if(panel)return panel;
    const style=document.createElement("style");style.id="tbConstraintsStyle";style.textContent='#tbConstraintsToggle{position:fixed;right:320px;top:54px;z-index:120366;background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:6px;padding:6px 10px;cursor:pointer}#tbConstraintsPanel{position:fixed;right:14px;top:88px;width:min(450px,calc(100vw - 28px));max-height:calc(100vh - 110px);z-index:120359;display:none;flex-direction:column;background:rgba(13,22,32,.985);color:#edf4fb;border:1px solid #41566f;border-radius:9px;font:12px system-ui}#tbConstraintsPanel.open{display:flex}.tb-con-head{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #304154}.tb-con-head .grow{flex:1}.tb-con-body{overflow:auto;padding:8px}.tb-con-create{display:flex;gap:5px;flex-wrap:wrap}.tb-con-create select,.tb-con-create input{background:#09131c;color:#fff;border:1px solid #40536a;border-radius:4px;padding:5px}.tb-con-create button,.tb-con-row button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:5px 7px;cursor:pointer}.tb-con-row{display:grid;grid-template-columns:22px 1fr auto auto;gap:6px;align-items:center;border-top:1px solid #27384a;padding:7px 0}.tb-con-status{font-size:10px;color:#8da0b3}.tb-con-conflict{color:#ff8d8d}.tb-con-valid{color:#7de2a3}';document.head.appendChild(style);
    toggle=document.createElement("button");toggle.id="tbConstraintsToggle";toggle.textContent="Constraints";document.body.appendChild(toggle);
    panel=document.createElement("section");panel.id="tbConstraintsPanel";panel.innerHTML='<div class="tb-con-head"><b>Geometric Constraints</b><span class="grow"></span><button data-con-close>×</button></div><div class="tb-con-body" data-con-body></div>';document.body.appendChild(panel);
    toggle.onclick=()=>{panel.classList.toggle("open");render();};
    panel.querySelector("[data-con-close]").onclick=()=>panel.classList.remove("open");
    return panel;
  }
  function render(){
    if(!domain)return;const root=ensurePanel(),body=root.querySelector("[data-con-body]"),list=domain.ensureConstraintState(project());
    const options=domain.GEOMETRIC_CONSTRAINT_TYPES.map(t=>'<option>'+esc(t)+'</option>').join("");
    body.innerHTML='<div class="tb-con-create"><select data-con-type>'+options+'</select><input data-con-name placeholder="Name"><label><input data-con-driving type="checkbox" checked> Driving</label><button data-con-create>Создать из выбора</button><button data-con-refresh>Проверить</button></div>'+
      '<div style="margin-top:8px">'+list.map(item=>'<div class="tb-con-row"><input type="checkbox" data-con-enabled="'+esc(item.id)+'" '+(item.enabled!==false?'checked':'')+'><div><b>'+esc(item.name??item.type)+'</b><div class="tb-con-status '+(item.status==="Valid"?'tb-con-valid':item.status==="Disabled"?'':'tb-con-conflict')+'">'+esc(item.type)+' · '+esc(item.status)+' · refs '+(item.references?.length??0)+(item.cross_assembly?.cross_assembly?' · ↔ Cross-Assembly':'')+'</div></div><span>'+esc(item.driving===false?'Reference':'Driving')+'</span><button data-con-delete="'+esc(item.id)+'">×</button></div>').join("")+'</div>';
    body.querySelector("[data-con-create]").onclick=()=>createFromSelection(body.querySelector("[data-con-type]").value,{name:body.querySelector("[data-con-name]").value.trim()||null,driving:body.querySelector("[data-con-driving]").checked});
    body.querySelector("[data-con-refresh]").onclick=()=>{recalculateAll();render();};
    body.querySelectorAll("[data-con-enabled]").forEach(el=>el.onchange=()=>setEnabled(el.dataset.conEnabled,el.checked));
    body.querySelectorAll("[data-con-delete]").forEach(el=>el.onclick=()=>remove(el.dataset.conDelete));
  }
  async function install(){
    if(installed)return;installed=true;
    try{domain=await import(CONSTRAINTS_URL);}catch(error){console.error("Constraints runtime failed",error);return;}
    domain.ensureConstraintState(project());ensurePanel();render();
    window.addEventListener("tubebender-selection-change",()=>{if(panel?.classList.contains("open"))render();});
    window.TubeBenderConstraints=Object.freeze({
      createFromSelection,remove,setEnabled,recalculateAll,validateProject,resolveReference,selectedReferences,render,domain
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();