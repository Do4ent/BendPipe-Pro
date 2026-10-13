(()=>{
  const DELETE_DEPENDENCIES_URL="__TB_DELETE_DEPENDENCIES_MODULE_URL__";
  let domain=null,installed=false,panel=null,pending=null;
  const eng=()=>window.TubeBenderEngineering??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const clone=v=>v==null?v:structuredClone(v);
  const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const toast=m=>{try{eng()?.toast?.(String(m??""));}catch{}};

  function targetFromEntry(entry){
    if(!entry)return null;
    if(entry.kind==="tube")return {kind:"tube",id:String(entry.tubeId)};
    if(entry.kind==="mesh-instance")return {kind:"mesh-instance",id:String(entry.instanceId)};
    if(entry.kind==="dimension")return {kind:"dimension",id:String(entry.dimensionId??entry.id)};
    if(entry.kind==="construction")return {kind:"construction",id:String(entry.constructionId??entry.id)};
    return null;
  }
  function targetsForEntries(entries=[]){
    const out=new Map();
    for(const entry of entries){
      const target=targetFromEntry(entry);if(target?.id)out.set(target.kind+":"+target.id,target);
    }
    return [...out.values()];
  }
  function objectLabel(target){
    const p=project();
    if(target.kind==="tube"){
      const item=(p?.tubes??[]).find(x=>String(x?.id)===target.id);
      return "Tube · "+String(item?.name??target.id);
    }
    if(target.kind==="mesh-instance"){
      const item=(p?.editable_mesh_instances??[]).find(x=>String(x?.id)===target.id);
      return "Mesh · "+String(item?.name??target.id);
    }
    if(target.kind==="dimension"){
      const item=[...(p?.engineering_dimensions??[]),...(p?.dimensions??[])].find(x=>String(x?.id)===target.id);
      return "Dimension · "+String(item?.name??target.id);
    }
    return target.kind+" · "+target.id;
  }
  function kindForId(id){
    const p=project(),key=String(id);
    if((p?.tubes??[]).some(x=>String(x?.id)===key))return "tube";
    if((p?.editable_mesh_instances??[]).some(x=>String(x?.id)===key))return "mesh-instance";
    if([...(p?.engineering_dimensions??[]),...(p?.dimensions??[])].some(x=>String(x?.id)===key))return "dimension";
    if((p?.construction_geometry??[]).some(x=>String(x?.id)===key))return "construction";
    return null;
  }
  function replacementCandidates(target){
    const p=project(),kind=target.kind;
    const list=kind==="tube"?(p?.tubes??[]):
      kind==="mesh-instance"?(p?.editable_mesh_instances??[]):
      kind==="dimension"?[...(p?.engineering_dimensions??[]),...(p?.dimensions??[])]:
      kind==="construction"?(p?.construction_geometry??[]):[];
    const blocked=new Set(pending?.targets?.map(item=>String(item.id))??[]);
    return list.filter(item=>item?.id&&!blocked.has(String(item.id))).map(item=>({
      id:String(item.id),label:String(item.name??item.label??item.id)
    }));
  }
  function ensurePanel(){
    if(panel)return panel;
    const style=document.createElement("style");style.id="tbDeleteDependencyStyles";
    style.textContent='#tbDeleteDependencyPanel{position:fixed;inset:0;z-index:120500;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.42);font:12px system-ui;color:#edf4fb}#tbDeleteDependencyPanel.open{display:flex}.tb-deldep-card{width:min(620px,calc(100vw - 30px));max-height:calc(100vh - 40px);overflow:auto;background:#101927;border:1px solid #53677e;border-radius:10px;box-shadow:0 18px 54px rgba(0,0,0,.6)}.tb-deldep-head{display:flex;align-items:center;padding:10px 12px;border-bottom:1px solid #304154}.tb-deldep-head .grow{flex:1}.tb-deldep-body{padding:10px 12px}.tb-deldep-list{max-height:220px;overflow:auto;border:1px solid #2d4053;border-radius:6px;margin:8px 0}.tb-deldep-row{display:grid;grid-template-columns:150px 1fr;gap:8px;padding:6px 8px;border-bottom:1px solid #243344}.tb-deldep-row:last-child{border-bottom:0}.tb-deldep-actions{display:flex;gap:7px;justify-content:flex-end;margin-top:12px}.tb-deldep-actions button,.tb-deldep-body select{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:5px;padding:6px 8px}.tb-deldep-actions button{cursor:pointer}.tb-deldep-warning{color:#ffcf8a}.tb-deldep-reassign{display:none;margin-top:8px}.tb-deldep-reassign.open{display:block}.tb-deldep-target{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center;margin-top:5px}';
    document.head.appendChild(style);
    panel=document.createElement("section");panel.id="tbDeleteDependencyPanel";
    panel.innerHTML='<div class="tb-deldep-card"><div class="tb-deldep-head"><b>Безопасное удаление · Dependencies</b><span class="grow"></span><button data-deldep-close>×</button></div><div class="tb-deldep-body" data-deldep-body></div></div>';
    document.body.appendChild(panel);
    panel.querySelector("[data-deldep-close]").onclick=cancel;
    return panel;
  }
  function relationLabel(dep){
    return ({
      TubePort:"Tube port",
      DimensionReference:"Dimension",
      ConstraintReference:"Constraint",
      GroupMember:"Group membership",
      AssemblyMember:"Assembly membership",
      ArraySource:"Associative Array",
      MirrorSource:"Associative Mirror",
      TransformStackObject:"Transform Stack"
    })[dep.relation]??dep.relation;
  }
  function cancel(){
    const callback=pending?.callback;pending=null;
    panel?.classList.remove("open");
    if(callback)callback({cancelled:true,strategy:"Cancel"});
  }
  function render(){
    if(!pending)return;
    const root=ensurePanel(),body=root.querySelector("[data-deldep-body]");
    const summary=domain.dependencySummary(pending.analysis);
    body.innerHTML='<div class="tb-deldep-warning"><b>Удаление остановлено:</b> найдено зависимостей: '+summary.count+'. Выберите явную стратегию.</div>'+
      '<div class="tb-deldep-list">'+pending.analysis.dependencies.map(dep=>'<div class="tb-deldep-row"><span>'+esc(relationLabel(dep))+'</span><span>'+esc(dep.dependent_type)+' · '+esc(dep.dependent_id)+' → '+esc(dep.target_id)+'</span></div>').join("")+'</div>'+
      '<label>Стратегия <select data-deldep-strategy><option value="">— выберите —</option><option value="Detach">Detach — сохранить dependents, разорвать ссылки</option><option value="Cascade">Cascade — удалить зависимые элементы</option><option value="Reassign">Reassign — переназначить ссылки</option></select></label>'+
      '<div class="tb-deldep-reassign" data-deldep-reassign>'+pending.targets.map(target=>{
        const options=replacementCandidates(target).map(item=>'<option value="'+esc(item.id)+'">'+esc(item.label)+'</option>').join("");
        return '<div class="tb-deldep-target"><span>'+esc(objectLabel(target))+'</span><select data-deldep-replacement="'+esc(target.id)+'"><option value="">— новый объект —</option>'+options+'</select></div>';
      }).join("")+'</div>'+
      '<div class="tb-deldep-actions"><button data-deldep-cancel>Отмена</button><button data-deldep-apply>Продолжить удаление</button></div>';
    const strategy=body.querySelector("[data-deldep-strategy]"),reassign=body.querySelector("[data-deldep-reassign]");
    strategy.onchange=()=>reassign.classList.toggle("open",strategy.value==="Reassign");
    body.querySelector("[data-deldep-cancel]").onclick=cancel;
    body.querySelector("[data-deldep-apply]").onclick=()=>{
      const mode=String(strategy.value||"");
      if(!["Detach","Cascade","Reassign"].includes(mode)){toast("Выберите стратегию обработки зависимостей");return;}
      const replacement_by_target={};
      if(mode==="Reassign"){
        for(const target of pending.targets){
          const value=body.querySelector('[data-deldep-replacement="'+CSS.escape(target.id)+'"]')?.value;
          if(!value){toast("Для Reassign выберите новый объект для каждой удаляемой ссылки");return;}
          replacement_by_target[target.id]=value;
        }
      }
      const callback=pending.callback,resolution={strategy:mode,replacement_by_target,analysis:clone(pending.analysis)};
      pending=null;root.classList.remove("open");callback?.(resolution);
    };
    root.classList.add("open");
  }
  function request(entries,callback){
    const targets=targetsForEntries(entries),targetIds=targets.map(item=>item.id);
    if(!targetIds.length){callback?.({strategy:"None",analysis:null});return {handled:true,dependencies:0};}
    const analysis=domain.analyzeDeletionDependencies(project(),targetIds);
    if(!analysis.has_dependencies){
      callback?.({strategy:"None",analysis:clone(analysis)});
      return {handled:true,dependencies:0};
    }
    pending={targets,analysis:clone(analysis),callback};
    render();
    return {handled:true,dependencies:analysis.dependencies.length};
  }
  function applyStrategy(projectValue,resolution){
    if(!resolution||resolution.strategy==="None")return {ok:true,strategy:"None",changed:false};
    return domain.applyDeletionDependencyStrategy(projectValue,resolution.analysis,{
      strategy:resolution.strategy,
      replacement_by_target:resolution.replacement_by_target??{}
    });
  }
  async function install(){
    if(installed)return;installed=true;
    try{domain=await import(DELETE_DEPENDENCIES_URL);}catch(error){console.error("Delete dependency runtime failed",error);return;}
    ensurePanel();
    window.TubeBenderDeleteDependencies=Object.freeze({
      request,applyStrategy,targetsForEntries,
      analyze:(entries)=>domain.analyzeDeletionDependencies(project(),targetsForEntries(entries).map(item=>item.id)),
      domain
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();