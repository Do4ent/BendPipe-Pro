(()=>{
  const STRAIGHT_RUN_URL="__TB_STRAIGHT_RUN_MODULE_URL__";
  const RIGID_TRANSFORM_URL="__TB_RIGID_TRANSFORM_MODULE_URL__";
  const DYNAMIC_INPUT_URL="__TB_DYNAMIC_INPUT_MODULE_URL__";
  const TRANSFORM_COMMANDS_URL="__TB_TRANSFORM_COMMANDS_MODULE_URL__";
  const DECIMAL_PREF_KEY="tubebender.dynamicInput.decimalSeparator";
  let straightRun=null,rigidTransform=null,dynamicInput=null,transformCommands=null,installed=false,panel=null,button=null,activeTool="copy",snapCommandTool=null;
  let copyPreviewGroup=null;
  const copySession={active:false,mode:"single",base:null,targets:[],pendingPoint:null,sourceIds:[],sourceMeshEntries:[]};
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clone=(v)=>v==null?v:structuredClone(v);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const api=()=>window.TubeBenderEngineering??null;
  const context=()=>window.TubeBenderObjectContext??null;
  const snapTracking=()=>window.TubeBenderSnapTracking??null;
  const referenceApi=()=>window.TubeBenderReferenceSceneUi??null;
  const project=()=>{try{return api()?.activeProject?.()??null;}catch{return null;}};
  const stateValue=()=>{try{return api()?.getState?.()??null;}catch{return null;}};
  const readonly=()=>{try{return api()?.readonly?.()===true;}catch{return false;}};
  const toast=(m)=>{try{api()?.toast?.(String(m??""));}catch{}};
  const entries=()=>context()?.selectionEntries?.()??[];
  const tubeById=(id)=>(project()?.tubes??[]).find((t)=>String(t?.id)===String(id))??null;
  function decimalPreference(){
    let value="auto";
    try{value=localStorage.getItem(DECIMAL_PREF_KEY)||"auto";}catch{}
    try{return dynamicInput?.normalizeDecimalSeparatorPreference?.(value)??"auto";}catch{return "auto";}
  }
  function setDecimalPreference(value){
    let next="auto";
    try{next=dynamicInput?.normalizeDecimalSeparatorPreference?.(value)??"auto";}catch{}
    try{localStorage.setItem(DECIMAL_PREF_KEY,next);}catch{}
    const select=panel?.querySelector?.("[data-decimal-pref]");
    if(select)select.value=next;
    render();
    return next;
  }
  function formatDynamicNumber(value,digits=3){
    try{return dynamicInput?.formatNumericInput?.(value,{decimal_separator:decimalPreference(),maximumFractionDigits:digits})??Number(value).toFixed(digits);}
    catch{return String(value);}
  }
  function makeId(prefix){
    const uuid=globalThis.crypto?.randomUUID?.();
    return uuid?prefix+"-"+uuid:prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
  }
  function uniqueTubeName(base){
    const used=new Set((project()?.tubes??[]).map((t)=>String(t?.name??"")));
    let name=String(base||"Tube")+" Copy",i=2;
    while(used.has(name))name=String(base||"Tube")+" Copy "+i++;
    return name;
  }
  function detachExternalGeometryLinks(tube){
    const copy=clone(tube);
    const keys=[
      "sourceGeometryId","editableGeometryId","externalRefId","external_ref_id",
      "source_geometry_id","editable_geometry_id","source_link","external_link"
    ];
    for(const key of keys)delete copy[key];
    if(copy.engineering?.ports){
      for(const port of Object.values(copy.engineering.ports)){
        if(port&&typeof port==="object"){
          port.externalRefId="";
          port.ownerObjectId="";
        }
      }
      if(copy.engineering.ports.P1)copy.engineering.ports.P1.locked=true;
      if(copy.engineering.ports.P2)copy.engineering.ports.P2.locked=false;
    }
    if(copy.importEvidence&&typeof copy.importEvidence==="object"){
      copy.importEvidence={
        ...copy.importEvidence,
        copied_geometry_snapshot:true,
        source_link_detached:true
      };
    }
    copy.source_link_detached=true;
    copy.uiHiddenIn3D=false;
    copy.uiTransparentIn3D=false;
    return copy;
  }
  function selectedWholeTubes(){
    return entries().filter((e)=>e.kind==="tube").map((e)=>tubeById(e.tubeId)).filter((tube)=>
      tube&&tube?.array_member?.derived_readonly!==true&&tube?.mirror_member?.derived_readonly!==true&&tube?.transform_stack_member?.derived_readonly!==true
    );
  }
  function selectedMeshSources(){
    return entries().filter((entry)=>entry.kind==="ref"||entry.kind==="mesh-instance");
  }
  function scalePermissionForSelection(){
    const selection=entries();
    if(!selection.length)return Object.freeze({allowed:false,code:"NO_SELECTION",reason:"Scale requires a selected object"});
    const tubes=selection.filter((entry)=>entry.kind==="tube"||entry.kind==="row"||entry.kind==="origin"||entry.kind==="end");
    if(tubes.length){
      const entry=tubes[0];
      const tube=tubeById(entry.tubeId);
      return transformCommands?.scalePermission?.({
        ...(tube??{}),
        kind:"tube",
        is_tube:true,
        recognized_tube:true
      })??Object.freeze({
        allowed:false,
        code:"TUBE_SCALE_FORBIDDEN",
        reason:"Scale is forbidden for recognized/engineering tubes."
      });
    }
    return Object.freeze({allowed:true,code:"SCALE_ALLOWED_NON_TUBE",reason:null});
  }
  function canScaleSelection(){
    return scalePermissionForSelection().allowed===true;
  }
  function requestScaleSelection(){
    const permission=scalePermissionForSelection();
    if(!permission.allowed){toast(permission.reason);return false;}
    toast("Scale policy permits only non-tube geometry; no tube Scale command is exposed.");
    return false;
  }
  function selectedSingleLine(){
    const list=entries();
    if(list.length!==1||list[0].kind!=="row")return null;
    const e=list[0],tube=tubeById(e.tubeId);
    if(!tube)return null;
    const s=stateValue();
    const row=String(s?.activeTubeId??"")===String(tube.id)
      ?s?.rows?.[e.rowIndex]??tube.rows?.[e.rowIndex]
      :tube.rows?.[e.rowIndex];
    if(row?.type!=="LINE")return null;
    return {entry:e,tube,row,rowIndex:Number(e.rowIndex)};
  }
  function commit(label,mutate){
    if(readonly()){toast("Проект открыт только для просмотра");return false;}
    const ok=api()?.modelCommand?api().modelCommand(label,mutate):mutate();
    if(ok===false)return false;
    try{api()?.save?.();api()?.renderAll?.();}catch{}
    try{context()?.refresh?.();}catch{}
    render();
    return true;
  }

  function syncSnapCommand(){
    const runtime=snapTracking();
    if(!runtime)return;
    const eligible=panel?.classList.contains("open")&&["copy","move","rotate"].includes(activeTool);
    if(!eligible){
      if(snapCommandTool)runtime.endCommand?.();
      snapCommandTool=null;return;
    }
    if(snapCommandTool!==activeTool){
      runtime.endCommand?.();
      runtime.startCommand?.(activeTool,{ortho:true,polar:false,polar_increment_deg:15});
      snapCommandTool=activeTool;
    }
  }
  function finishSnapCommand(result){
    if(result===false)return result;
    const runtime=snapTracking();
    runtime?.endCommand?.();snapCommandTool=null;
    syncSnapCommand();
    return result;
  }
  function currentSnapPoint(){
    const candidate=snapTracking()?.currentCandidate?.();
    return candidate?.point?clone(candidate.point):null;
  }
  function copySceneScale(){
    return typeof GEOM_SCALE==="number"&&Number.isFinite(GEOM_SCALE)&&Math.abs(GEOM_SCALE)>1e-12?GEOM_SCALE:1;
  }
  function clearCopyPreview(){
    if(copyPreviewGroup?.parent)copyPreviewGroup.parent.remove(copyPreviewGroup);
    copyPreviewGroup=null;
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
  }
  function copySourceTubes(){
    const ids=copySession.sourceIds.length?copySession.sourceIds:selectedWholeTubes().map((tube)=>String(tube.id));
    return ids.map(tubeById).filter(Boolean);
  }
  function rootBelongsToCopySource(root,tubeId){
    if(!root||root.userData?.helper||root.userData?.referenceGeometry||root.userData?.referenceSelectionHelper)return false;
    const activeId=String(stateValue()?.activeTubeId??"");
    let belongs=String(root.userData?.tubeId??"")===String(tubeId);
    try{
      root.traverse?.((object)=>{
        if(String(object.userData?.tubeId??"")===String(tubeId))belongs=true;
        if(String(tubeId)===activeId&&object.userData?.pipe===true&&!object.userData?.referenceGeometry)belongs=true;
      });
    }catch{}
    return belongs;
  }
  function makeCopyPreviewClone(root){
    const copy=root.clone(true);
    copy.traverse?.((object)=>{
      object.userData={...(object.userData??{}),helper:true,objectSelectionHelper:true,copyLivePreview:true};
      if(object.material){
        const materials=Array.isArray(object.material)?object.material:[object.material];
        const cloned=materials.map((material)=>{
          const next=material?.clone?.()??material;
          if(next){
            next.transparent=true;next.opacity=.32;next.depthWrite=false;next.depthTest=true;
            if(next.color?.setHex)next.color.setHex(0x52d6ff);
          }
          return next;
        });
        object.material=Array.isArray(object.material)?cloned:cloned[0];
      }
    });
    return copy;
  }
  function copyPreviewRoots(tubeId){
    if(typeof pipeGroup==="undefined"||!pipeGroup)return [];
    return [...pipeGroup.children].filter((root)=>root!==copyPreviewGroup&&rootBelongsToCopySource(root,tubeId));
  }
  function samePoint(a,b,tol=1e-6){
    return !!a&&!!b&&Math.hypot(Number(a.x)-Number(b.x),Number(a.y)-Number(b.y),Number(a.z)-Number(b.z))<=tol;
  }
  function renderCopyPreview(){
    clearCopyPreview();
    if(!copySession.active||!copySession.base||typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup)return;
    const points=[...copySession.targets];
    if(copySession.pendingPoint&&!points.some((p)=>samePoint(p,copySession.pendingPoint)))points.push(copySession.pendingPoint);
    if(!points.length)return;
    const group=new THREE.Group();group.userData={helper:true,objectSelectionHelper:true,copyLivePreview:true};
    const scale=copySceneScale(),sources=copySourceTubes();
    for(const target of points){
      const delta={
        x:Number(target.x)-Number(copySession.base.x),
        y:Number(target.y)-Number(copySession.base.y),
        z:Number(target.z)-Number(copySession.base.z)
      };
      const placement=new THREE.Group();
      placement.userData={helper:true,objectSelectionHelper:true,copyLivePreview:true};
      placement.position.set(delta.x*scale,delta.y*scale,delta.z*scale);
      for(const source of sources){
        for(const root of copyPreviewRoots(source.id))placement.add(makeCopyPreviewClone(root));
      }
      group.add(placement);
    }
    pipeGroup.add(group);copyPreviewGroup=group;
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
  }
  function resetCopySession({keepMode=true}={}){
    const mode=copySession.mode;
    clearCopyPreview();
    copySession.active=panel?.classList.contains("open")&&activeTool==="copy";
    copySession.base=null;copySession.targets=[];copySession.pendingPoint=null;copySession.sourceIds=[];copySession.sourceMeshEntries=[];
    if(keepMode)copySession.mode=mode;else copySession.mode="single";
  }
  function syncCopySessionTool(){
    const shouldBeActive=panel?.classList.contains("open")&&activeTool==="copy";
    if(!shouldBeActive&&copySession.active){resetCopySession();copySession.active=false;}
    else if(shouldBeActive)copySession.active=true;
  }
  function copySessionStatus(body){
    const status=$("[data-copy-session-status]",body);
    if(!status)return;
    const base=copySession.base
      ?"Base: "+["x","y","z"].map((k)=>formatDynamicNumber(copySession.base[k],2)).join(decimalPreference()===","?"; ":", ")
      :"Base: выберите Snap-точку в 3D или введите XYZ";
    status.textContent=base+" · Targets: "+copySession.targets.length+
      (copySession.mode==="multiple"?" · Enter завершает серию · Backspace отменяет последнюю точку":" · одна целевая точка завершает команду");
  }
  function setCopyBase(point,body=null){
    const tubes=selectedWholeTubes(),meshes=selectedMeshSources();
    if(tubes.length&&meshes.length){toast("Copy: не смешивайте трубы и mesh instances в одной операции");return false;}
    if(!tubes.length&&!meshes.length){toast("Для Copy выберите целую трубу, Source mesh или Editable Mesh Instance");return false;}
    if(!point){toast("Не задана базовая точка Copy");return false;}
    copySession.base=clone(point);copySession.targets=[];copySession.pendingPoint=null;
    copySession.sourceIds=tubes.map((tube)=>String(tube.id));
    copySession.sourceMeshEntries=meshes.map(clone);
    renderCopyPreview();if(body)copySessionStatus(body);return true;
  }
  function setCopyBaseFromSnap(body){
    const point=currentSnapPoint();
    if(!point){toast("Нет активного snap-кандидата для Base Point");return false;}
    return setCopyBase(point,body);
  }
  function setCopyBaseFromInput(body){
    const raw=$("[data-copy-base-input]",body)?.value.trim();
    if(!raw){toast("Введите Base XYZ");return false;}
    try{
      const parsed=dynamicInput.parseCoordinateInput(raw,{origin:{x:0,y:0,z:0},decimal_separator:decimalPreference()});
      return setCopyBase(parsed.point,body);
    }catch(error){toast(error.message);return false;}
  }
  function addCopyTarget(point,body=null){
    if(!copySession.base){toast("Сначала задайте Base Point");return false;}
    if(!point){toast("Не задана целевая точка Copy");return false;}
    if(samePoint(point,copySession.base)){toast("Target Point совпадает с Base Point");return false;}
    copySession.targets.push(clone(point));copySession.pendingPoint=null;
    renderCopyPreview();if(body)copySessionStatus(body);
    if(copySession.mode==="single")return commitCopySeries(body);
    return true;
  }
  function addCopyTargetFromSnap(body){
    const point=currentSnapPoint();
    if(!point){toast("Нет активного snap-кандидата для Target Point");return false;}
    return addCopyTarget(point,body);
  }
  function addCopyTargetFromInput(body){
    if(!copySession.base){toast("Сначала задайте Base Point");return false;}
    const raw=$("[data-copy-target-input]",body)?.value.trim();
    if(!raw){toast("Введите Target XYZ / @delta / polar");return false;}
    try{
      const parsed=dynamicInput.parseCoordinateInput(raw,{origin:copySession.base,decimal_separator:decimalPreference()});
      return addCopyTarget(parsed.point,body);
    }catch(error){toast(error.message);return false;}
  }
  function nextCopyName(base,used){
    let name=String(base||"Tube")+" Copy",i=2;
    while(used.has(name))name=String(base||"Tube")+" Copy "+i++;
    used.add(name);return name;
  }
  function translatedIndependentCopy(source,delta,usedNames){
    let copy=detachExternalGeometryLinks(source);
    const moved=rigidTransform.translateLegacyTubeRigid(copy,delta);
    if(moved.status!=="exact")throw new Error(moved.reason||"Copy translation failed");
    copy=clone(moved.tube);
    copy.id=makeId("tube");copy.name=nextCopyName(source.name,usedNames);copy.partNumber="";
    copy.material_warning_ack_signature=null;copy.equipment_calculation_state="Stale";
    copy.material_calculation_state=copy.material_profile_id?"Stale":"Missing Material";
    if(Array.isArray(copy.rows))copy.rows=copy.rows.map((row)=>({...row,elementId:row?.elementId?makeId("element"):row?.elementId}));
    return copy;
  }
  function commitCopySeries(body=null){
    if(!copySession.base||!copySession.targets.length){toast("Нет целевых точек Copy");return false;}
    if(readonly()){toast("Проект открыт только для просмотра");return false;}
    const p=project(),sources=copySourceTubes(),meshEntries=copySession.sourceMeshEntries.map(clone);
    if(!p||(!sources.length&&!meshEntries.length)){toast("Исходные объекты Copy недоступны");return false;}
    if(sources.length&&meshEntries.length){toast("Copy: смешанный tube/mesh источник запрещён");return false;}
    const base=clone(copySession.base),targets=copySession.targets.map(clone);
    const usedNames=new Set((p.tubes??[]).map((tube)=>String(tube?.name??"")));
    const createdMeshIds=[];
    const mutate=()=>{
      if(meshEntries.length){
        const ref=referenceApi();
        if(!ref)throw new Error("Editable Mesh Instance API недоступен");
        for(const target of targets){
          const delta={x:target.x-base.x,y:target.y-base.y,z:target.z-base.z};
          for(const entry of meshEntries){
            let created;
            if(entry.kind==="ref"){
              created=ref.createEditableMeshInstanceByRef?.(p,entry.sceneId,entry.nodeId,{position_mm:delta});
            }else{
              created=ref.copyEditableMeshInstance?.(p,entry.instanceId,{offset_mm:delta});
            }
            if(!created)throw new Error("Mesh Copy failed");
            createdMeshIds.push(String(created.id));
          }
        }
        return true;
      }
      const created=[];
      for(const target of targets){
        const delta={x:target.x-base.x,y:target.y-base.y,z:target.z-base.z};
        for(const source of sources)created.push(translatedIndependentCopy(source,delta,usedNames));
      }
      p.tubes=[...(p.tubes??[]),...created];
      return true;
    };
    const label=meshEntries.length
      ?(targets.length>1?"Copy: серия mesh instances":"Copy: mesh instance")
      :(targets.length>1?"Copy: серия целевых точек":"Copy: одна целевая точка");
    const ok=api()?.modelCommand?api().modelCommand(label,mutate):mutate();
    if(ok===false)return false;
    resetCopySession();copySession.active=true;
    try{api()?.save?.();api()?.renderAll?.();context()?.refresh?.();}catch{}
    if(createdMeshIds.length){
      try{context()?.replaceSelectionKeys?.(createdMeshIds.map((id)=>"mesh:"+encodeURIComponent(id)));}catch{}
    }
    finishSnapCommand(true);render();return true;
  }
  function undoLastCopyTarget(body=null){
    if(!copySession.targets.length)return false;
    copySession.targets.pop();copySession.pendingPoint=null;renderCopyPreview();
    if(body)copySessionStatus(body);return true;
  }
  function onCopyCanvasClick(event){
    if(!copySession.active||activeTool!=="copy"||!panel?.classList.contains("open"))return;
    const point=currentSnapPoint();if(!point)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
    const body=$(".tb-edit-body",panel);
    if(!copySession.base)setCopyBase(point,body);
    else addCopyTarget(point,body);
  }
  function onCopyKeyDown(event){
    if(!copySession.active||activeTool!=="copy"||!panel?.classList.contains("open"))return;
    const target=event.target;
    if(target&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/i.test(String(target.tagName||""))))return;
    const body=$(".tb-edit-body",panel);
    if(event.key==="Enter"&&copySession.mode==="multiple"&&copySession.targets.length){
      event.preventDefault();commitCopySeries(body);return;
    }
    if(event.key==="Backspace"&&copySession.targets.length){
      event.preventDefault();undoLastCopyTarget(body);return;
    }
    if(event.key==="Escape"&&(copySession.base||copySession.targets.length)){
      event.preventDefault();resetCopySession();copySession.active=true;if(body)copySessionStatus(body);
    }
  }
  function onSnapChangeForCopy(event){
    if(!copySession.active||!copySession.base||activeTool!=="copy")return;
    copySession.pendingPoint=event?.detail?.current?.point?clone(event.detail.current.point):null;
    renderCopyPreview();
  }

  function useSnapForCopyStep(body){
    const tubes=selectedWholeTubes(),point=currentSnapPoint();
    if(tubes.length!==1){toast("Snap Step доступен для одной выбранной трубы");return false;}
    if(!point){toast("Нет активного snap-кандидата");return false;}
    const origin=tubes[0].origin??{x:0,y:0,z:0};
    const values={x:point.x-Number(origin.x||0),y:point.y-Number(origin.y||0),z:point.z-Number(origin.z||0)};
    $("[data-copy-step-x]",body).value=values.x.toFixed(3);
    $("[data-copy-step-y]",body).value=values.y.toFixed(3);
    $("[data-copy-step-z]",body).value=values.z.toFixed(3);
    return true;
  }
  function useSnapForMove(body){
    const point=currentSnapPoint();
    if(!point){toast("Нет активного snap-кандидата");return false;}
    const input=$("[data-edit-vector]",body);
    if(!input)return false;
    input.value=[point.x,point.y,point.z].map((v)=>Number(v).toFixed(3)).join(";");
    updateMovePreview(body);return true;
  }
  function useSnapForRotatePivot(body){
    const point=currentSnapPoint();
    if(!point){toast("Нет активного snap-кандидата");return false;}
    $("[data-rotate-center-mode]",body).value="custom";
    $("[data-rotate-cx]",body).value=Number(point.x).toFixed(3);
    $("[data-rotate-cy]",body).value=Number(point.y).toFixed(3);
    $("[data-rotate-cz]",body).value=Number(point.z).toFixed(3);
    return true;
  }

  function copySelection(){
    const tubes=selectedWholeTubes();
    if(!tubes.length){toast("Для Copy выберите одну или несколько целых труб");return false;}
    const p=project();if(!p)return false;
    return commit("Копировать выбранные трубы",()=>{
      const created=[];
      for(const source of tubes){
        const copy=detachExternalGeometryLinks(source);
        copy.id=makeId("tube");
        copy.name=uniqueTubeName(source.name);
        copy.partNumber="";
        copy.material_warning_ack_signature=null;
        copy.equipment_calculation_state="Stale";
        copy.material_calculation_state=copy.material_profile_id?"Stale":"Missing Material";
        if(Array.isArray(copy.rows)){
          copy.rows=copy.rows.map((row)=>({
            ...row,
            elementId:row?.elementId?makeId("element"):row?.elementId
          }));
        }
        created.push(copy);
      }
      p.tubes=[...(p.tubes??[]),...created];
      return true;
    });
  }
  function createMeshArray(body){
    const meshEntries=selectedMeshSources();
    if(!meshEntries.length){toast("Для Mesh Array выберите Source mesh или Editable Mesh Instance");return false;}
    if(selectedWholeTubes().length){toast("Mesh Array не смешивает трубы и mesh instances");return false;}
    const count=Math.trunc(Number($("[data-mesh-array-count]",body)?.value));
    const step={
      x:Number($("[data-mesh-array-x]",body)?.value.replace(",",".")||0),
      y:Number($("[data-mesh-array-y]",body)?.value.replace(",",".")||0),
      z:Number($("[data-mesh-array-z]",body)?.value.replace(",",".")||0)
    };
    if(!(count>=2)){toast("Mesh Array count должен быть ≥ 2");return false;}
    if(![step.x,step.y,step.z].every(Number.isFinite)){toast("Mesh Array step XYZ должен быть числом");return false;}
    const p=project(),ref=referenceApi();if(!p||!ref)return false;
    const createdIds=[];
    return commit("Создать Mesh Array",()=>{
      for(const entry of meshEntries){
        if(entry.kind==="mesh-instance"){
          const created=ref.arrayEditableMeshInstance?.(p,entry.instanceId,{count,step_mm:step})??[];
          createdIds.push(...created.map((item)=>String(item.id)));
        }else{
          for(let index=1;index<count;index++){
            const created=ref.createEditableMeshInstanceByRef?.(p,entry.sceneId,entry.nodeId,{
              position_mm:{x:step.x*index,y:step.y*index,z:step.z*index},
              name:"Source mesh ["+(index+1)+"]"
            });
            if(!created)throw new Error("Source Mesh Array failed");
            created.array_member={
              source_reference:{scene_id:String(entry.sceneId),node_id:String(entry.nodeId)},
              member_index:index,
              derived:false
            };
            createdIds.push(String(created.id));
          }
        }
      }
      queueMicrotask(()=>{
        try{context()?.replaceSelectionKeys?.(createdIds.map((id)=>"mesh:"+encodeURIComponent(id)));}catch{}
      });
      return true;
    });
  }

  function multipleCopySelection(body){
    const tubes=selectedWholeTubes();
    if(!tubes.length){toast("Для Copy выберите одну или несколько целых труб");return false;}
    const p=project();if(!p)return false;
    const count=Math.max(1,Math.trunc(Number($("[data-copy-count]",body)?.value)||1));
    const step={
      x:Number($("[data-copy-step-x]",body)?.value.replace(",",".")||0),
      y:Number($("[data-copy-step-y]",body)?.value.replace(",",".")||0),
      z:Number($("[data-copy-step-z]",body)?.value.replace(",",".")||0)
    };
    if(![step.x,step.y,step.z].every(Number.isFinite)){toast("Шаг Copy XYZ должен быть числом");return false;}
    if(count===1&&step.x===0&&step.y===0&&step.z===0)return copySelection();
    return commit("Множественное копирование труб",()=>{
      const created=[];
      for(const source of tubes){
        for(let i=1;i<=count;i++){
          let copy=detachExternalGeometryLinks(source);
          if(step.x||step.y||step.z){
            const moved=rigidTransform.translateLegacyTubeRigid(copy,{x:step.x*i,y:step.y*i,z:step.z*i});
            if(moved.status!=="exact")throw new Error(moved.reason||"Copy offset failed");
            copy=clone(moved.tube);
          }
          copy.id=makeId("tube");
          copy.name=uniqueTubeName(source.name);
          copy.partNumber="";
          copy.material_warning_ack_signature=null;
          copy.equipment_calculation_state="Stale";
          copy.material_calculation_state=copy.material_profile_id?"Stale":"Missing Material";
          if(Array.isArray(copy.rows))copy.rows=copy.rows.map((row)=>({...row,elementId:row?.elementId?makeId("element"):row?.elementId}));
          created.push(copy);
        }
      }
      p.tubes=[...(p.tubes??[]),...created];
      return true;
    });
  }

  function moveSelection(body){
    const expression=$("[data-edit-vector]",body)?.value.trim();
    let delta;
    if(expression){
      try{
        const tubes=selectedWholeTubes();
        const origin=tubes.length===1?clone(tubes[0].origin??{x:0,y:0,z:0}):{x:0,y:0,z:0};
        const parsed=dynamicInput.parseCoordinateInput(expression,{origin,decimal_separator:decimalPreference()});
        if(!String(parsed.mode).startsWith("relative")&&tubes.length!==1){
          toast("Absolute Move доступен только для одной выбранной трубы");return false;
        }
        delta=parsed.delta??{x:parsed.point.x-origin.x,y:parsed.point.y-origin.y,z:parsed.point.z-origin.z};
        delta=dynamicInput.applyOrthoTracking(delta,{enabled:$("[data-edit-ortho]",body)?.checked===true});
        delta=dynamicInput.applyPolarTracking(delta,{enabled:$("[data-edit-polar]",body)?.checked===true,increment_deg:Number($("[data-edit-polar-step]",body)?.value||15)});
      }catch(error){toast(error.message);return false;}
    }else{
      const dx=Number($("[data-edit-dx]",body).value.replace(",",".")),
        dy=Number($("[data-edit-dy]",body).value.replace(",",".")),
        dz=Number($("[data-edit-dz]",body).value.replace(",","."));
      if(![dx,dy,dz].every(Number.isFinite)){toast("ΔX / ΔY / ΔZ должны быть числами");return false;}
      delta={x:dx,y:dy,z:dz};
    }
    const ok=context()?.applyMove?.(delta);
    if(ok===false)toast("Перемещение недоступно для текущего выбора");
    return ok;
  }
  function updateMovePreview(body){
    const out=$("[data-edit-preview]",body),expression=$("[data-edit-vector]",body)?.value.trim();
    if(!out)return;
    if(!expression){out.textContent="Dynamic preview: используйте @10;0;0, 100;200;0 или @100<45";return;}
    const tubes=selectedWholeTubes(),origin=tubes.length===1?clone(tubes[0].origin??{x:0,y:0,z:0}):{x:0,y:0,z:0};
    const preview=dynamicInput.dynamicInputPreview(expression,{origin,decimal_separator:decimalPreference()});
    out.textContent=preview.status==="Valid"
      ?"Preview "+preview.mode+": X="+formatDynamicNumber(preview.point.x)+" Y="+formatDynamicNumber(preview.point.y)+" Z="+formatDynamicNumber(preview.point.z)
      :"Invalid: "+preview.error;
  }
  function splitSelected(body){
    const selected=selectedSingleLine();
    if(!selected){toast("Для Split выберите один прямой участок LINE");return false;}
    const mode=$("[data-split-mode]",body).value;
    const raw=$("[data-split-value]",body).value.replace(",",".");
    const value=Number(raw);
    if(!Number.isFinite(value)){toast("Введите числовое значение Split");return false;}
    try{
      const run=straightRun.straightRunFromLegacy(selected.row);
      let next;
      if(mode==="start")next=straightRun.splitStraightAtDistance(run,value,{from:"start"});
      else if(mode==="end")next=straightRun.splitStraightAtDistance(run,value,{from:"end"});
      else if(mode==="equal")next=straightRun.splitStraightEqual(run,Math.trunc(value));
      else if(mode==="percent")next=straightRun.splitStraightAtNormalized(run,value/100);
      else throw new Error("Неизвестный режим Split");
      const serialized=straightRun.serializeStraightRunToLegacy(next);
      return commit("Разделить прямой участок",()=>{
        selected.row.straightRun=clone(serialized.straightRun);
        return true;
      });
    }catch(error){toast(error.message);return false;}
  }

  function commitRigidRotation(tubes,{axis,angle_deg,centerResolver,label="Повернуть выбранные трубы"}={}){
    if(!Array.isArray(tubes)||!tubes.length){toast("Для Rotate выберите одну или несколько целых труб");return false;}
    const angle=Number(angle_deg);
    if(!Number.isFinite(angle)){toast("Угол Rotate должен быть числом");return false;}
    const plans=[];
    try{
      for(const source of tubes){
        const center=typeof centerResolver==="function"
          ?centerResolver(source)
          :clone(source.origin??{x:0,y:0,z:0});
        const result=rigidTransform.rotateLegacyTubeRigid(source,{axis,center,angle_deg:angle});
        if(result.status!=="exact")throw new Error(result.reason||"Rotate не может быть точно закодирован");
        const rotated=clone(result.tube);
        if(rotated.importEvidence?.spatialPlacement){
          rotated.importEvidence.spatialPlacement.user_origin_override=true;
          rotated.importEvidence.spatialPlacement.rigid_rotation_override=true;
        }
        plans.push({source,rotated});
      }
    }catch(error){toast(error.message);return false;}

    if(readonly()){toast("Проект открыт только для просмотра");return false;}
    const command=api()?.wholeObjectCommand??api()?.modelCommand;
    const mutate=()=>{
      for(const plan of plans){
        for(const key of Object.keys(plan.source))delete plan.source[key];
        Object.assign(plan.source,clone(plan.rotated));
      }
      return true;
    };
    const ok=typeof command==="function"?command(label,mutate):mutate();
    if(ok===false)return false;
    try{api()?.reloadActiveTube?.();}catch{}
    try{api()?.save?.();api()?.renderAll?.();context()?.refresh?.();}catch{}
    render();
    return true;
  }
  function rotateSelectedDirect({axis={x:0,y:0,z:1},center={x:0,y:0,z:0},angle_deg=0,label="Gizmo Rotate"}={}){
    const tubes=selectedWholeTubes();
    return commitRigidRotation(tubes,{
      axis,
      angle_deg,
      centerResolver:()=>clone(center),
      label
    });
  }
  function rotateSelection(body){
    const tubes=selectedWholeTubes();
    if(!tubes.length){toast("Для Rotate выберите одну или несколько целых труб");return false;}
    const axisName=$("[data-rotate-axis]",body).value;
    const axis=axisName==="X"?{x:1,y:0,z:0}:axisName==="Y"?{x:0,y:1,z:0}:{x:0,y:0,z:1};
    const angle=Number($("[data-rotate-angle]",body).value.replace(",","."));
    if(!Number.isFinite(angle)){toast("Угол Rotate должен быть числом");return false;}
    const centerMode=$("[data-rotate-center-mode]",body).value;
    let explicitCenter=null;
    if(centerMode==="custom"){
      explicitCenter={
        x:Number($("[data-rotate-cx]",body).value.replace(",",".")),
        y:Number($("[data-rotate-cy]",body).value.replace(",",".")),
        z:Number($("[data-rotate-cz]",body).value.replace(",","."))
      };
      if(![explicitCenter.x,explicitCenter.y,explicitCenter.z].every(Number.isFinite)){
        toast("Координаты центра Rotate должны быть числами");return false;
      }
    }
    return commitRigidRotation(tubes,{
      axis,
      angle_deg:angle,
      centerResolver:(source)=>centerMode==="own"
        ?clone(source.origin??{x:0,y:0,z:0})
        :centerMode==="custom"
          ?explicitCenter
          :{x:0,y:0,z:0},
      label:"Повернуть выбранные трубы"
    });
  }

  function mirrorRuntime(){return window.TubeBenderAssociativeMirrors??null;}
  function mirrorPlaneFromBody(body){
    const mode=$("[data-mirror-plane]",body).value;
    const point={
      x:Number($("[data-mirror-px]",body).value.replace(",",".")),
      y:Number($("[data-mirror-py]",body).value.replace(",",".")),
      z:Number($("[data-mirror-pz]",body).value.replace(",","."))
    };
    if(![point.x,point.y,point.z].every(Number.isFinite))throw new Error("Точка плоскости Mirror должна быть числовой");
    let normal;
    if(mode==="XY")normal={x:0,y:0,z:1};
    else if(mode==="XZ")normal={x:0,y:1,z:0};
    else if(mode==="YZ")normal={x:1,y:0,z:0};
    else{
      normal={
        x:Number($("[data-mirror-nx]",body).value.replace(",",".")),
        y:Number($("[data-mirror-ny]",body).value.replace(",",".")),
        z:Number($("[data-mirror-nz]",body).value.replace(",","."))
      };
    }
    if(![normal.x,normal.y,normal.z].every(Number.isFinite)||Math.hypot(normal.x,normal.y,normal.z)<=1e-12){
      throw new Error("Нормаль плоскости Mirror должна быть ненулевой");
    }
    return {plane_point:point,plane_normal:normal};
  }
  function createMirrorFromSelection(body){
    const tubes=selectedWholeTubes();
    if(!tubes.length){toast("Для Mirror выберите одну или несколько целых труб");return false;}
    const runtime=mirrorRuntime();
    if(!runtime){toast("Associative Mirror runtime ещё не загружен");return false;}
    const mode=$("[data-mirror-mode]",body).value;
    const associative=$("[data-mirror-associative]",body).checked;
    let plane;
    try{plane=mirrorPlaneFromBody(body);}catch(error){toast(error.message);return false;}
    if(mode==="Original"&&associative){
      toast("Associative Mirror для Original пока не применяется: выберите Copy или отключите Associative");
      return false;
    }
    return commit(mode==="Original"?"Mirror Original":"Mirror Copy",()=>{
      for(const source of tubes){
        if(mode==="Original"){
          runtime.mirrorOriginal({source_tube_id:source.id,...plane},project());
        }else if(associative){
          runtime.addAssociativeCopy({
            source_tube_id:source.id,
            name:$("[data-mirror-name]",body).value.trim()||"Mirror",
            ...plane
          },project());
        }else{
          runtime.createIndependentCopy({
            source_tube_id:source.id,
            name:uniqueTubeName((source.name??"Tube")+" Mirror"),
            ...plane
          },project());
        }
      }
      try{api()?.reloadActiveTube?.();}catch{}
      return true;
    });
  }
  function mirrorAction(body,action){
    const runtime=mirrorRuntime(),id=$("[data-mirror-existing]",body)?.value;
    if(!runtime||!id){toast("Выберите существующий Associative Mirror");return false;}
    if(action==="break"){
      return commit("Разорвать Associative Mirror",()=>{runtime.breakMirror(id,project());return true;});
    }
    if(action==="delete"){
      return commit("Удалить Associative Mirror",()=>{runtime.deleteMirror(id,{deleteTarget:true},project());return true;});
    }
    return false;
  }
  function mirrorPanelHtml(){
    const defs=mirrorRuntime()?.definitions?.()??[];
    const existing='<option value="">—</option>'+defs.map((d)=>'<option value="'+esc(d.id)+'">'+esc(d.name)+" · "+esc(d.status??"")+'</option>').join("");
    return '<div class="tb-edit-card"><b>Mirror</b><div class="tb-edit-grid" style="margin-top:8px">'+
      '<label>Name</label><input data-mirror-name value="Mirror">'+
      '<label>Mode</label><select data-mirror-mode><option>Copy</option><option>Original</option></select>'+
      '<label>Plane</label><select data-mirror-plane><option>XY</option><option>XZ</option><option>YZ</option><option value="Custom">Custom normal</option></select>'+
      '<label>Plane point X</label><input data-mirror-px value="0"><label>Plane point Y</label><input data-mirror-py value="0"><label>Plane point Z</label><input data-mirror-pz value="0">'+
      '<label>Normal X</label><input data-mirror-nx value="1"><label>Normal Y</label><input data-mirror-ny value="0"><label>Normal Z</label><input data-mirror-nz value="0">'+
      '<label>Associative Copy</label><input data-mirror-associative type="checkbox" checked>'+
      '</div><div class="tb-edit-note" style="margin-top:8px">Mirror Copy по умолчанию ассоциативен: источник не меняется, производная труба пересчитывается перед renderAll. Отражение пере-кодируется в правостороннюю геометрию; nominal L / CLR / bend angle сохраняются. Mirror Original выполняется как явная неассоциативная операция.</div>'+
      '<div class="tb-edit-actions"><button data-mirror-create>Применить Mirror</button></div></div>'+
      '<div class="tb-edit-card" style="margin-top:8px"><b>Associative Mirrors</b><div class="tb-edit-grid" style="margin-top:8px"><label>Mirror</label><select data-mirror-existing>'+existing+'</select></div>'+
      '<div class="tb-edit-actions"><button data-mirror-break>Break Mirror</button><button data-mirror-delete>Удалить Mirror</button></div></div>';
  }

  function stackRuntime(){return window.TubeBenderTransformStacks??null;}
  function stackSelectedDefinition(body){
    const id=$("[data-stack-existing]",body)?.value;
    return id?stackRuntime()?.definitionById?.(id)??null:null;
  }
  function createTransformStackFromSelection(){
    const tubes=selectedWholeTubes();
    if(!tubes.length){toast("Для Transform Stack выберите одну или несколько целых труб");return false;}
    const runtime=stackRuntime();
    if(!runtime?.createForTube){toast("Transform Stack runtime ещё не загружен");return false;}
    return commit("Создать Transform Stack",()=>{
      for(const tube of tubes)runtime.createForTube(tube.id,project());
      return true;
    });
  }
  function stackAddOperation(body,kind){
    const runtime=stackRuntime(),def=stackSelectedDefinition(body);
    if(!runtime||!def){toast("Выберите Transform Stack");return false;}
    try{
      return commit("Добавить "+kind+" в Transform Stack",()=>{
        if(kind==="Move"){
          runtime.appendMove(def.id,{x:Number($("[data-stack-dx]",body).value.replace(",",".")),y:Number($("[data-stack-dy]",body).value.replace(",",".")),z:Number($("[data-stack-dz]",body).value.replace(",","."))},project());
        }else if(kind==="Rotate"){
          const axisName=$("[data-stack-axis]",body).value;
          const axis=axisName==="X"?{x:1,y:0,z:0}:axisName==="Y"?{x:0,y:1,z:0}:{x:0,y:0,z:1};
          runtime.appendRotate(def.id,{axis,center:{x:Number($("[data-stack-cx]",body).value.replace(",",".")),y:Number($("[data-stack-cy]",body).value.replace(",",".")),z:Number($("[data-stack-cz]",body).value.replace(",","."))},angle_deg:Number($("[data-stack-angle]",body).value.replace(",","."))},project());
        }else{
          const plane=$("[data-stack-plane]",body).value;
          const normal=plane==="XY"?{x:0,y:0,z:1}:plane==="XZ"?{x:0,y:1,z:0}:{x:1,y:0,z:0};
          runtime.appendMirror(def.id,{plane_point:{x:Number($("[data-stack-px]",body).value.replace(",",".")),y:Number($("[data-stack-py]",body).value.replace(",",".")),z:Number($("[data-stack-pz]",body).value.replace(",","."))},plane_normal:normal},project());
        }
        return true;
      });
    }catch(error){toast(error.message);return false;}
  }
  function stackOperationAction(body,action){
    const runtime=stackRuntime(),def=stackSelectedDefinition(body);
    if(!runtime||!def){toast("Выберите Transform Stack");return false;}
    const opId=$("[data-stack-operation]",body)?.value;
    if(action==="bake")return commit("Bake Transform Stack",()=>{runtime.bake(def.id,project());return true;});
    if(action==="delete")return commit("Удалить Transform Stack",()=>runtime.deleteStack(def.id,{restoreBase:true},project()));
    if(!opId){toast("Выберите операцию Transform Stack");return false;}
    const index=def.operations.findIndex((op)=>String(op.id)===String(opId));
    if(index<0){toast("Операция Transform Stack не найдена");return false;}
    if(action==="remove")return commit("Удалить операцию Transform Stack",()=>{runtime.removeOperation(def.id,opId,project());return true;});
    if(action==="toggle"){const op=def.operations[index];return commit("Переключить операцию Transform Stack",()=>{runtime.setOperationEnabled(def.id,opId,op.enabled===false,project());return true;});}
    const target=action==="up"?index-1:index+1;
    if(target<0||target>=def.operations.length)return false;
    return commit("Изменить порядок Transform Stack",()=>{runtime.reorderOperation(def.id,index,target,project());return true;});
  }
  function stackPanelHtml(){
    const defs=stackRuntime()?.definitions?.()??[];
    const existing='<option value="">—</option>'+defs.map((d)=>'<option value="'+esc(d.id)+'">'+esc(d.base_tube?.name??d.object_id)+" · "+esc(d.operations?.length??0)+" ops · "+esc(d.state??"")+'</option>').join("");
    return '<div class="tb-edit-card"><b>Associative Transform Stack</b><div class="tb-edit-note" style="margin-top:7px">Стек хранит исходную геометрию отдельно и применяет Move / Rotate / Mirror строго по порядку. Номинальные L, CLR и bend angle не изменяются.</div><div class="tb-edit-actions"><button data-stack-create>Создать Stack из выбранной трубы</button></div></div>'+
      '<div class="tb-edit-card" style="margin-top:8px"><div class="tb-edit-grid"><label>Stack</label><select data-stack-existing>'+existing+'</select>'+
      '<label>Move ΔX</label><input data-stack-dx value="0"><label>Move ΔY</label><input data-stack-dy value="0"><label>Move ΔZ</label><input data-stack-dz value="0">'+
      '<label>Rotate axis</label><select data-stack-axis><option>X</option><option>Y</option><option>Z</option></select><label>Angle, °</label><input data-stack-angle value="90">'+
      '<label>Center X</label><input data-stack-cx value="0"><label>Center Y</label><input data-stack-cy value="0"><label>Center Z</label><input data-stack-cz value="0">'+
      '<label>Mirror plane</label><select data-stack-plane><option>XY</option><option>XZ</option><option>YZ</option></select><label>Plane point X</label><input data-stack-px value="0"><label>Plane point Y</label><input data-stack-py value="0"><label>Plane point Z</label><input data-stack-pz value="0">'+
      '</div><div class="tb-edit-actions"><button data-stack-add-move>+ Move</button><button data-stack-add-rotate>+ Rotate</button><button data-stack-add-mirror>+ Mirror</button></div></div>'+
      '<div class="tb-edit-card" style="margin-top:8px"><div class="tb-edit-grid"><label>Operation ID</label><input data-stack-operation placeholder="operation id"></div><div class="tb-edit-actions"><button data-stack-up>↑</button><button data-stack-down>↓</button><button data-stack-toggle>On/Off</button><button data-stack-remove>Remove</button><button data-stack-bake>Bake</button><button data-stack-delete>Delete Stack</button></div></div>';
  }

  function arrayRuntime(){return window.TubeBenderAssociativeArrays??null;}
  function createArrayFromSelection(body){
    const tubes=selectedWholeTubes();
    if(!tubes.length){toast("Для Array выберите одну или несколько исходных целых труб");return false;}
    const runtime=arrayRuntime();
    if(!runtime?.addArray){toast("Associative Array runtime ещё не загружен");return false;}
    const type=$("[data-array-type]",body).value;
    let parameters;
    try{
      if(type==="Linear"){
        const count=Math.trunc(Number($("[data-array-count]",body).value));
        const step=Number($("[data-array-step]",body).value.replace(",","."));
        const axis=$("[data-array-axis]",body).value;
        const direction=axis==="X"?{x:1,y:0,z:0}:axis==="Y"?{x:0,y:1,z:0}:{x:0,y:0,z:1};
        parameters={count,step,direction};
      }else if(type==="Matrix"){
        const counts=["x","y","z"].map((a)=>Math.trunc(Number($("[data-array-n"+a+"]",body).value)));
        const steps=["x","y","z"].map((a)=>Number($("[data-array-s"+a+"]",body).value.replace(",",".")));
        parameters={counts,steps,directions:[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}]};
      }else{
        const count=Math.trunc(Number($("[data-array-count]",body).value));
        const total_angle_deg=Number($("[data-array-total]",body).value.replace(",","."));
        const axisName=$("[data-array-axis]",body).value;
        const axis=axisName==="X"?{x:1,y:0,z:0}:axisName==="Y"?{x:0,y:1,z:0}:{x:0,y:0,z:1};
        const center={
          x:Number($("[data-array-cx]",body).value.replace(",",".")),
          y:Number($("[data-array-cy]",body).value.replace(",",".")),
          z:Number($("[data-array-cz]",body).value.replace(",","."))
        };
        const rotate_elements=$("[data-array-rotate]",body).checked;
        parameters={count,total_angle_deg,axis,center,rotate_elements};
      }
      const name=$("[data-array-name]",body).value.trim()||type+" Array";
      return commit("Создать ассоциативный массив",()=>{
        runtime.addArray({
          type,
          name,
          source_tube_ids:tubes.map((t)=>String(t.id)),
          parameters
        },project());
        return true;
      });
    }catch(error){toast(error.message);return false;}
  }
  function arrayAction(body,action){
    const runtime=arrayRuntime(),id=$("[data-array-existing]",body)?.value;
    if(!runtime||!id){toast("Выберите существующий Array");return false;}
    if(action==="break"){
      return commit("Разорвать ассоциативный массив",()=>{runtime.breakArray(id,project());return true;});
    }
    const index=Math.trunc(Number($("[data-array-member-index]",body)?.value));
    if(action==="detach"){
      if(!(index>0)){toast("Member index должен быть больше 0; source member имеет индекс 0");return false;}
      return commit("Отсоединить Array member для редактирования",()=>{runtime.detachMember(id,index,{},project());return true;});
    }
    if(!(index>0)){toast("Member index должен быть больше 0; source member имеет индекс 0");return false;}
    return commit(action==="suppress"?"Suppress Array member":"Restore Array member",()=>{
      runtime.suppressMember(id,index,action==="suppress",project());
      return true;
    });
  }
  function arrayPanelHtml(){
    const defs=arrayRuntime()?.definitions?.()??[];
    const existing='<option value="">—</option>'+defs.map((d)=>'<option value="'+esc(d.id)+'">'+esc(d.name)+" · "+esc(d.type)+" · "+esc(d.status??"")+'</option>').join("");
    return '<div class="tb-edit-card"><b>Associative Array</b><div class="tb-edit-grid" style="margin-top:8px">'+
      '<label>Name</label><input data-array-name value="Array">'+
      '<label>Type</label><select data-array-type><option>Linear</option><option>Matrix</option><option>Circular</option></select>'+
      '<label>Count</label><input data-array-count value="3">'+
      '<label>Step, mm</label><input data-array-step value="100">'+
      '<label>Axis</label><select data-array-axis><option>X</option><option>Y</option><option>Z</option></select>'+
      '<label>Matrix Nx</label><input data-array-nx value="2"><label>Matrix Ny</label><input data-array-ny value="2"><label>Matrix Nz</label><input data-array-nz value="1">'+
      '<label>Matrix Sx, mm</label><input data-array-sx value="100"><label>Matrix Sy, mm</label><input data-array-sy value="100"><label>Matrix Sz, mm</label><input data-array-sz value="100">'+
      '<label>Total angle, °</label><input data-array-total value="360">'+
      '<label>Center X</label><input data-array-cx value="0"><label>Center Y</label><input data-array-cy value="0"><label>Center Z</label><input data-array-cz value="0">'+
      '<label>Rotate elements</label><input data-array-rotate type="checkbox" checked>'+
      '</div><div class="tb-edit-note" style="margin-top:8px">Source member остаётся исходной трубой. Производные members пересобираются из source перед renderAll и защищены от прямого редактирования.</div>'+
      '<div class="tb-edit-actions"><button data-array-create>Создать Array</button></div></div>'+
      '<div class="tb-edit-card" style="margin-top:8px"><b>Управление массивом</b><div class="tb-edit-grid" style="margin-top:8px"><label>Array</label><select data-array-existing>'+existing+'</select><label>Member index</label><input data-array-member-index value="1"></div>'+
      '<div class="tb-edit-actions"><button data-array-suppress>Suppress</button><button data-array-restore>Restore</button><button data-array-detach>Detach for editing</button><button data-array-break>Break Array</button></div></div>';
  }

  function injectStyles(){
    if(document.getElementById("tbEditingUiStyles"))return;
    const s=document.createElement("style");s.id="tbEditingUiStyles";s.textContent=`
#tbEditingButton{border:1px solid rgba(255,255,255,.14);border-radius:6px;background:#233244;color:#eef5ff;padding:6px 9px;cursor:pointer;font:600 12px system-ui}
#tbEditingButton.tb-fixed{position:fixed;right:116px;bottom:100px;z-index:120240}
#tbEditingPanel{position:fixed;z-index:120321;right:16px;top:86px;width:min(440px,calc(100vw - 32px));display:none;flex-direction:column;background:#101923;color:#edf4fb;border:1px solid #43546a;border-radius:9px;box-shadow:0 16px 45px rgba(0,0,0,.55);font:12px system-ui}
#tbEditingPanel.open{display:flex}.tb-edit-head{display:flex;align-items:center;padding:9px 10px;border-bottom:1px solid #2c3948}.tb-edit-head .sp{flex:1}.tb-edit-head button,.tb-edit-tools button,.tb-edit-actions button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:5px;padding:5px 8px;cursor:pointer}
.tb-edit-tools{display:flex;flex-wrap:wrap;gap:5px;padding:8px;border-bottom:1px solid #293746}.tb-edit-tools button.active{background:#3b5570;color:#fff}.tb-edit-tools button[disabled]{opacity:.45;cursor:not-allowed}
.tb-edit-body{padding:10px}.tb-edit-card{border:1px solid #304154;border-radius:7px;padding:9px}.tb-edit-grid{display:grid;grid-template-columns:130px 1fr;gap:7px 9px;align-items:center}.tb-edit-grid input,.tb-edit-grid select{background:#0b131c;color:#fff;border:1px solid #40536a;border-radius:5px;padding:6px}.tb-edit-note{color:#9fafbf;line-height:1.45}.tb-edit-actions{display:flex;gap:6px;justify-content:flex-end;margin-top:9px}.tb-decimal-pref{display:flex;align-items:center;gap:5px;color:#9fafbf;font-size:11px}.tb-decimal-pref select{background:#0b131c;color:#fff;border:1px solid #40536a;border-radius:4px;padding:3px 5px}
`;document.head.appendChild(s);
  }
  function ensureShell(){
    if(panel)return panel;
    injectStyles();
    button=document.createElement("button");button.id="tbEditingButton";button.type="button";button.textContent="Редактирование";button.onclick=()=>open();
    const host=document.querySelector(".tb-head-actions");
    if(host)host.appendChild(button);else{button.classList.add("tb-fixed");document.body.appendChild(button);}
    panel=document.createElement("section");panel.id="tbEditingPanel";
    panel.innerHTML='<div class="tb-edit-head"><b>Редактирование</b><span class="sp"></span><label class="tb-decimal-pref">Decimal <select data-decimal-pref title="Десятичный разделитель"><option value="auto">Auto</option><option value=".">.</option><option value=",">,</option></select></label><button data-edit-close>×</button></div>'+
      '<div class="tb-edit-tools">'+
      '<button data-tool="copy">Copy</button><button data-tool="move">Move</button><button data-tool="split">Split</button>'+
      '<button data-tool="rotate">Rotate</button><button data-tool="mirror">Mirror</button>'+
      '<button data-tool="array">Array</button><button data-tool="stack">Transform Stack</button>'+
      '</div><div class="tb-edit-body"></div>';
    document.body.appendChild(panel);
    $("[data-edit-close]",panel).onclick=close;
    const decimalSelect=$("[data-decimal-pref]",panel);
    if(decimalSelect){decimalSelect.value=decimalPreference();decimalSelect.onchange=(event)=>setDecimalPreference(event.target.value);}
    $(".tb-edit-tools",panel).onclick=(e)=>{const b=e.target.closest("[data-tool]");if(!b||b.disabled)return;if(activeTool==="copy"&&b.dataset.tool!=="copy"){resetCopySession();copySession.active=false;}activeTool=b.dataset.tool;render();};
    return panel;
  }
  function open(){ensureShell().classList.add("open");render();}
  function close(){panel?.classList.remove("open");resetCopySession();copySession.active=false;snapTracking()?.endCommand?.();snapCommandTool=null;}
  function render(){
    if(!panel||!straightRun)return;
    syncSnapCommand();syncCopySessionTool();
    $$(".tb-edit-tools button",panel).forEach((b)=>b.classList.toggle("active",b.dataset.tool===activeTool));
    const body=$(".tb-edit-body",panel);
    if(activeTool==="copy"){
      const count=selectedWholeTubes().length+selectedMeshSources().length;
      body.innerHTML='<div class="tb-edit-card"><b>Copy</b><div class="tb-edit-note" style="margin-top:7px">Выбрано объектов: '+count+'. Copy работает как Base Point → Target Point; Source mesh создаёт lightweight Editable Instance без копирования тяжёлой геометрии.</div>'+
        '<div class="tb-edit-grid" style="margin-top:8px"><label>Режим</label><select data-copy-mode><option value="single">Одна копия</option><option value="multiple">Несколько копий</option></select>'+
        '<label>Base XYZ</label><input data-copy-base-input placeholder="100;200;0"><label>Target / @delta</label><input data-copy-target-input placeholder="300;200;0 / @100;0;0 / @100<45"></div>'+
        '<div class="tb-edit-note" data-copy-session-status style="margin-top:8px"></div>'+
        '<div class="tb-edit-note" style="margin-top:6px">В 3D: первый клик по Snap задаёт Base Point, следующие клики — Target Point. Live-preview не изменяет модель. Поддерживаются 12.5 и 12,5; при десятичной запятой разделяйте X/Y/Z точкой с запятой (;). В режиме «Несколько»: Enter завершает всю серию одним Undo, Backspace убирает последнюю ещё не записанную в модель точку.</div>'+
        '<div class="tb-edit-actions"><button data-copy-base-snap>Snap → Base</button><button data-copy-base-input-run>XYZ → Base</button><button data-copy-target-snap>Snap → Target</button><button data-copy-target-input-run>Input → Target</button><button data-copy-finish>Завершить</button></div>'+
        (selectedMeshSources().length?'<div class="tb-edit-note" style="margin-top:10px"><b>Mesh Array</b> · Source остаётся readonly, создаются lightweight instances.</div><div class="tb-edit-grid" style="margin-top:6px"><label>Count</label><input data-mesh-array-count value="3"><label>Step X</label><input data-mesh-array-x value="100"><label>Step Y</label><input data-mesh-array-y value="0"><label>Step Z</label><input data-mesh-array-z value="0"></div><div class="tb-edit-actions"><button data-mesh-array-create>Создать Mesh Array</button></div>':'')+
        '</div>';
      $("[data-copy-mode]",body).value=copySession.mode;
      $("[data-copy-mode]",body).onchange=(event)=>{copySession.mode=event.target.value==="multiple"?"multiple":"single";resetCopySession();copySession.active=true;copySessionStatus(body);};
      $("[data-copy-base-snap]",body).onclick=()=>setCopyBaseFromSnap(body);
      $("[data-copy-base-input-run]",body).onclick=()=>setCopyBaseFromInput(body);
      $("[data-copy-target-snap]",body).onclick=()=>addCopyTargetFromSnap(body);
      $("[data-copy-target-input-run]",body).onclick=()=>addCopyTargetFromInput(body);
      $("[data-copy-finish]",body).onclick=()=>commitCopySeries(body);
      $("[data-mesh-array-create]",body)?.addEventListener("click",()=>createMeshArray(body));
      copySessionStatus(body);renderCopyPreview();
    }else if(activeTool==="move"){
      body.innerHTML='<div class="tb-edit-card"><b>Move</b><div class="tb-edit-grid" style="margin-top:8px"><label>ΔX, мм</label><input data-edit-dx value="0"><label>ΔY, мм</label><input data-edit-dy value="0"><label>ΔZ, мм</label><input data-edit-dz value="0"><label>Dynamic input</label><input data-edit-vector placeholder="@10;0;0 / 100;200;0 / @100<45"><label>Ortho</label><input data-edit-ortho type="checkbox"><label>Polar Tracking</label><input data-edit-polar type="checkbox"><label>Polar step, °</label><input data-edit-polar-step value="15"></div><div class="tb-edit-note" data-edit-preview style="margin-top:8px"></div><div class="tb-edit-note" style="margin-top:6px">Object Snap Tracking работает в 3D: hover-acquire, Tab / Shift+Tab, P pin. Tracking guides следуют Ortho / Polar. Числа принимают 12.5 и 12,5; для X/Y/Z с десятичной запятой используйте ;.</div><div class="tb-edit-actions"><button data-move-use-snap>Snap → Point</button><button data-move-run>Переместить</button></div></div>';
      $("[data-move-use-snap]",body).onclick=()=>useSnapForMove(body);
      $("[data-move-run]",body).onclick=()=>finishSnapCommand(moveSelection(body));
      $("[data-edit-vector]",body).oninput=()=>updateMovePreview(body);
      const syncTracking=()=>snapTracking()?.setTrackingModes?.({
        ortho:$("[data-edit-ortho]",body)?.checked===true,
        polar:$("[data-edit-polar]",body)?.checked===true,
        polar_increment_deg:Number($("[data-edit-polar-step]",body)?.value||15)
      });
      $("[data-edit-ortho]",body).onchange=syncTracking;
      $("[data-edit-polar]",body).onchange=syncTracking;
      $("[data-edit-polar-step]",body).oninput=syncTracking;
      syncTracking();updateMovePreview(body);
    }else if(activeTool==="split"){
      const selected=selectedSingleLine(),nodes=selected?.row?.straightRun?.nodes_mm??[];
      body.innerHTML='<div class="tb-edit-card"><b>Split Straight</b><div class="tb-edit-grid" style="margin-top:8px"><label>Режим</label><select data-split-mode><option value="start">Расстояние от начала</option><option value="end">Расстояние от конца</option><option value="equal">N равных частей</option><option value="percent">Позиция, %</option></select><label>Значение</label><input data-split-value value="50"></div><div class="tb-edit-note" style="margin-top:8px">Внутренние узлы: '+esc(nodes.length?nodes.join(", ")+" мм":"нет")+'. LINE остаётся одним производственным StraightRun.</div><div class="tb-edit-actions"><button data-split-run>Разделить</button></div></div>';
      $("[data-split-run]",body).onclick=()=>splitSelected(body);
    }else if(activeTool==="rotate"){
      body.innerHTML='<div class="tb-edit-card"><b>Rotate</b><div class="tb-edit-grid" style="margin-top:8px">'+
        '<label>Ось</label><select data-rotate-axis><option>X</option><option>Y</option><option>Z</option></select>'+
        '<label>Угол, °</label><input data-rotate-angle value="90">'+
        '<label>Центр</label><select data-rotate-center-mode><option value="global">Global 0,0,0</option><option value="own">Origin каждой трубы</option><option value="custom">Заданный XYZ</option></select>'+
        '<label>Center X</label><input data-rotate-cx value="0"><label>Center Y</label><input data-rotate-cy value="0"><label>Center Z</label><input data-rotate-cz value="0">'+
        '</div><div class="tb-edit-note" style="margin-top:8px">Rigid-body Rotate сохраняет длины, CLR и углы гибов; TubeBender пересчитывает только origin/startVector и legacy plane/rot.</div>'+
        '<div class="tb-edit-note" style="margin-top:6px">Object Snap Tracking: Tab переключает кандидаты; P закрепляет временную reference point.</div>'+
        '<div class="tb-edit-actions"><button data-rotate-use-snap>Snap → Pivot</button><button data-rotate-run>Повернуть</button></div></div>';
      $("[data-rotate-use-snap]",body).onclick=()=>useSnapForRotatePivot(body);
      $("[data-rotate-run]",body).onclick=()=>finishSnapCommand(rotateSelection(body));
    }else if(activeTool==="mirror"){
      body.innerHTML=mirrorPanelHtml();
      $("[data-mirror-create]",body).onclick=()=>createMirrorFromSelection(body);
      $("[data-mirror-break]",body).onclick=()=>mirrorAction(body,"break");
      $("[data-mirror-delete]",body).onclick=()=>mirrorAction(body,"delete");
    }else if(activeTool==="stack"){
      body.innerHTML=stackPanelHtml();
      $("[data-stack-create]",body).onclick=createTransformStackFromSelection;
      $("[data-stack-add-move]",body).onclick=()=>stackAddOperation(body,"Move");
      $("[data-stack-add-rotate]",body).onclick=()=>stackAddOperation(body,"Rotate");
      $("[data-stack-add-mirror]",body).onclick=()=>stackAddOperation(body,"Mirror");
      $("[data-stack-up]",body).onclick=()=>stackOperationAction(body,"up");
      $("[data-stack-down]",body).onclick=()=>stackOperationAction(body,"down");
      $("[data-stack-toggle]",body).onclick=()=>stackOperationAction(body,"toggle");
      $("[data-stack-remove]",body).onclick=()=>stackOperationAction(body,"remove");
      $("[data-stack-bake]",body).onclick=()=>stackOperationAction(body,"bake");
      $("[data-stack-delete]",body).onclick=()=>stackOperationAction(body,"delete");
    }else if(activeTool==="array"){
      body.innerHTML=arrayPanelHtml();
      $("[data-array-create]",body).onclick=()=>createArrayFromSelection(body);
      $("[data-array-suppress]",body).onclick=()=>arrayAction(body,"suppress");
      $("[data-array-restore]",body).onclick=()=>arrayAction(body,"restore");
      $("[data-array-detach]",body).onclick=()=>arrayAction(body,"detach");
      $("[data-array-break]",body).onclick=()=>arrayAction(body,"break");
    }
  }
  async function install(){
    if(installed)return;installed=true;
    try{[straightRun,rigidTransform,dynamicInput,transformCommands]=await Promise.all([import(STRAIGHT_RUN_URL),import(RIGID_TRANSFORM_URL),import(DYNAMIC_INPUT_URL),import(TRANSFORM_COMMANDS_URL)]);}catch(error){console.error("Editing UI failed to load",error);return;}
    ensureShell();
    document.getElementById("threeCanvas")?.addEventListener("click",onCopyCanvasClick,true);
    window.addEventListener("keydown",onCopyKeyDown,true);
    window.addEventListener("tubebender-snap-change",onSnapChangeForCopy);
    window.addEventListener("tubebender-selection-change",()=>{if(panel?.classList.contains("open"))render();});
    window.TubeBenderEditing=Object.freeze({open,close,copySelection,multipleCopySelection,commitCopySeries,undoLastCopyTarget,rotateSelectedDirect,moveSelection:()=>context()?.applyMove,splitSelected,rotateSelection,createMirrorFromSelection,mirrorAction,createArrayFromSelection,arrayAction,createTransformStackFromSelection,stackAddOperation,stackOperationAction,scalePermissionForSelection,canScaleSelection,requestScaleSelection,refresh:render});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();