(()=>{
  const DYNAMIC_INPUT_URL="__TB_GEOMETRY_GRIPS_DYNAMIC_INPUT_URL__";
  let dynamicInput=null,installed=false,group=null,previewGroup=null,panel=null,drag=null,activeHandle=null,suppressUntil=0;
  const eng=()=>window.TubeBenderEngineering??null;
  const ctx=()=>window.TubeBenderObjectContext??null;
  const snap=()=>window.TubeBenderSnapTracking??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const entries=()=>ctx()?.selectionEntries?.()??[];
  const canvas=()=>document.getElementById("threeCanvas");
  const clone=v=>v==null?v:structuredClone(v);
  const scale=()=>typeof GEOM_SCALE==="number"&&Number.isFinite(GEOM_SCALE)&&Math.abs(GEOM_SCALE)>1e-12?GEOM_SCALE:1;
  const toast=m=>{try{eng()?.toast?.(String(m??""));}catch{}};
  const tubeById=id=>(project()?.tubes??[]).find(t=>String(t?.id)===String(id))??null;
  function rowFor(tube,rowIndex){
    try{
      const state=eng()?.getState?.();
      if(String(state?.activeTubeId??"")===String(tube?.id))return state?.rows?.[rowIndex]??tube?.rows?.[rowIndex]??null;
    }catch{}
    return tube?.rows?.[rowIndex]??null;
  }
  function selectedGeometry(){
    const list=entries();if(list.length!==1)return null;
    const entry=list[0];
    if(entry.kind==="tube"){
      const tube=tubeById(entry.tubeId);return tube?{entry,tube,row:null,rowIndex:null,kind:"tube"}:null;
    }
    if(entry.kind!=="row")return null;
    const tube=tubeById(entry.tubeId),row=tube?rowFor(tube,Number(entry.rowIndex)):null;
    return tube&&row?{entry,tube,row,rowIndex:Number(entry.rowIndex),kind:row.type}:null;
  }
  function isDerivedReadonly(tube){
    return tube?.array_member?.derived_readonly===true||tube?.mirror_member?.derived_readonly===true||tube?.transform_stack_member?.derived_readonly===true;
  }
  function canEdit(selection,{notify=true}={}){
    if(!selection)return false;
    if(isDerivedReadonly(selection.tube)){if(notify)toast("Derived geometry: сначала Detach/Break для редактирования");return false;}
    const allowed=window.TubeBenderObjectLocks?.canSelection?.("geometry",{notify})!==false;
    return allowed&&eng()?.readonly?.()!==true;
  }
  function geometry(selection){
    try{return eng()?.geometryForTube?.(selection?.tube)??null;}catch{return null;}
  }
  function element(selection){
    const g=geometry(selection);return (g?.elements??[]).find(el=>Number(el?.rowIndex)===Number(selection?.rowIndex))??null;
  }
  function mm(v){
    if(!v)return null;const s=scale(),x=Number(v.x??v[0]),y=Number(v.y??v[1]),z=Number(v.z??v[2]);
    return [x,y,z].every(Number.isFinite)?{x:x/s,y:y/s,z:z/s}:null;
  }
  function scene(p){
    if(!p)return null;const s=scale(),x=Number(p.x),y=Number(p.y),z=Number(p.z);
    return [x,y,z].every(Number.isFinite)?new THREE.Vector3(x*s,y*s,z*s):null;
  }
  function vec(v){return new THREE.Vector3(Number(v?.x)||0,Number(v?.y)||0,Number(v?.z)||0);}
  function visualScale(p){
    if(typeof camera==="undefined"||!camera||!p)return .08;const w=p.clone();try{pipeGroup?.localToWorld?.(w);}catch{}
    return Math.max(.02,Math.min(1.3,camera.position.distanceTo(w)*.012));
  }
  function tag(object,data){
    object.userData={...(object.userData??{}),helper:true,objectSelectionHelper:true,geometryGripRuntime:true,geometryGrip:data};
    object.traverse?.(child=>{child.userData={...(child.userData??{}),helper:true,objectSelectionHelper:true,geometryGripRuntime:true,geometryGrip:data};});
    object.renderOrder=13600;return object;
  }
  function grip(point,color,data,shape="sphere"){
    const p=scene(point);if(!p)return null;const s=visualScale(p),mat=new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false});
    const geo=shape==="cube"?new THREE.BoxGeometry(.13*s,.13*s,.13*s):new THREE.SphereGeometry(.075*s,14,10);
    const mesh=new THREE.Mesh(geo,mat);mesh.position.copy(p);return tag(mesh,data);
  }
  function helperLine(a,b,color=0x74d9ff){
    const aa=scene(a),bb=scene(b);if(!aa||!bb)return null;
    const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([aa,bb]),new THREE.LineBasicMaterial({color,transparent:true,opacity:.75,depthTest:false,depthWrite:false}));
    l.userData={helper:true,objectSelectionHelper:true,geometryGripRuntime:true};l.renderOrder=13590;return l;
  }
  function bendMidpoint(el){
    if(!el?.center||!el?.start||!el?.axis)return null;
    const center=el.center.clone(),radial=el.start.clone().sub(center),axis=el.axis.clone().normalize();
    const sweep=THREE.MathUtils.degToRad(Math.abs(Number(el.angleDeg)||0))*.5;
    return mm(center.clone().add(radial.applyAxisAngle(axis,sweep)));
  }
  function handleDescriptors(selection){
    if(!selection)return [];const g=geometry(selection);
    if(selection.kind==="tube"){
      const origin=clone(selection.tube.origin??{x:0,y:0,z:0});
      return [{kind:"origin",label:"Origin",point:origin,field:"origin"}];
    }
    const el=(g?.elements??[]).find(x=>Number(x.rowIndex)===selection.rowIndex);if(!el)return [];
    if(selection.row.type==="LINE"){
      const end=mm(el.end),start=mm(el.start),direction=el.direction?mm(el.direction.clone().multiplyScalar(scale())):null;
      return end?[{kind:"line-length",label:"LINE length",field:"L",point:end,start,direction:direction??null,rowIndex:selection.rowIndex}]:[];
    }
    if(selection.row.type==="BEND"){
      const end=mm(el.end),mid=bendMidpoint(el),center=mm(el.center),start=mm(el.start);
      return [
        end?{kind:"bend-angle",label:"BEND angle",field:"angle",point:end,start,center,rowIndex:selection.rowIndex,axis:el.axis?{x:el.axis.x,y:el.axis.y,z:el.axis.z}:null}:null,
        mid?{kind:"bend-radius",label:"BEND CLR",field:"clr",point:mid,start,center,rowIndex:selection.rowIndex,axis:el.axis?{x:el.axis.x,y:el.axis.y,z:el.axis.z}:null}:null
      ].filter(Boolean);
    }
    return [];
  }
  function clearGroup(){if(group?.parent)group.parent.remove(group);group=null;}
  function clearPreview(){if(previewGroup?.parent)previewGroup.parent.remove(previewGroup);previewGroup=null;}
  function rebuild(){
    clearGroup();clearPreview();const selection=selectedGeometry();ensurePanel();
    if(!selection||typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup){updatePanel(null);return false;}
    const handles=handleDescriptors(selection),g=new THREE.Group();g.name="Geometry Grips";g.userData={helper:true,objectSelectionHelper:true,geometryGripRuntime:true};
    for(const h of handles){
      const color=h.kind==="line-length"?0x65d6ff:h.kind==="bend-angle"?0xffa45c:h.kind==="bend-radius"?0x73e19c:0xffffff;
      const node=grip(h.point,color,h,h.kind==="origin"?"cube":"sphere");if(node)g.add(node);
      if(h.start){const l=helperLine(h.start,h.point,color);if(l)g.add(l);}
      if(h.center&&h.kind==="bend-radius"){const l=helperLine(h.center,h.point,color);if(l)g.add(l);}
    }
    pipeGroup.add(g);group=g;updatePanel(selection);try{markViewerDirty?.();}catch{}return true;
  }
  function ray(event){
    const c=canvas(),rect=c?.getBoundingClientRect?.();if(!c||!rect?.width||!rect?.height||typeof camera==="undefined")return null;
    const mouse=new THREE.Vector2(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1),r=new THREE.Raycaster();r.setFromCamera(mouse,camera);return r;
  }
  function pick(event){
    const r=ray(event);if(!r||!group)return null;
    for(const hit of r.intersectObjects(group.children,true)){
      let o=hit.object;while(o&&o!==group){if(o.userData?.geometryGrip)return {object:o,handle:o.userData.geometryGrip,hit};o=o.parent;}
    }return null;
  }
  function planePoint(event,anchor,normal=null){
    const r=ray(event),p=scene(anchor);if(!r||!p)return null;
    const n=normal?vec(normal).normalize():(()=>{const q=new THREE.Vector3();camera.getWorldDirection(q);return q;})();
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(n,p),hit=new THREE.Vector3();
    return r.ray.intersectPlane(plane,hit)?mm(hit):null;
  }
  function currentPointerPoint(event,handle){
    const candidate=snap()?.currentCandidate?.(),sp=candidate?.point;
    if(sp&&[sp.x,sp.y,sp.z].every(Number.isFinite))return {x:Number(sp.x),y:Number(sp.y),z:Number(sp.z),fromSnap:true};
    return planePoint(event,handle.center??handle.start??handle.point,handle.kind.startsWith("bend-")?handle.axis:null);
  }
  function lineValue(handle,p){
    const start=vec(handle.start),end=vec(p),dir=vec(handle.direction??{x:1,y:0,z:0});
    if(dir.lengthSq()<1e-12)return null;dir.normalize();return end.sub(start).dot(dir);
  }
  function bendRadiusValue(handle,p){
    const center=vec(handle.center),point=vec(p),axis=vec(handle.axis??{x:0,y:0,z:1}).normalize(),rel=point.sub(center);
    return rel.sub(axis.multiplyScalar(rel.dot(axis))).length();
  }
  function signedAngleAround(startVec,endVec,axis){
    const a=startVec.clone().normalize(),b=endVec.clone().normalize(),n=axis.clone().normalize();
    return THREE.MathUtils.radToDeg(Math.atan2(n.dot(a.clone().cross(b)),THREE.MathUtils.clamp(a.dot(b),-1,1)));
  }
  function bendAngleValue(selection,handle,p){
    const center=vec(handle.center),start=vec(handle.start).sub(center),target=vec(p).sub(center),axis=vec(handle.axis??{x:0,y:0,z:1});
    if(start.lengthSq()<1e-12||target.lengthSq()<1e-12||axis.lengthSq()<1e-12)return null;
    target.sub(axis.clone().normalize().multiplyScalar(target.dot(axis.clone().normalize())));
    if(target.lengthSq()<1e-12)return null;
    const unsigned=Math.abs(signedAngleAround(start,target,axis)),sign=Number(selection.row.angle)<0?-1:1;
    return sign*Math.max(.01,Math.min(179.99,unsigned));
  }
  function patchFromPoint(selection,handle,p){
    if(!p)return null;
    if(handle.kind==="origin")return {origin:{x:p.x,y:p.y,z:p.z}};
    if(handle.kind==="line-length"){
      const value=lineValue(handle,p);return Number.isFinite(value)?{value:Math.max(.001,value)}:null;
    }
    if(handle.kind==="bend-radius"){
      const value=bendRadiusValue(handle,p);return Number.isFinite(value)?{value:Math.max(.001,value)}:null;
    }
    if(handle.kind==="bend-angle"){
      const value=bendAngleValue(selection,handle,p);return Number.isFinite(value)?{value}:null;
    }
    return null;
  }
  function previewTube(selection,handle,patch){
    if(!patch)return null;const tube=clone(selection.tube);tube.id="__geometry_grip_preview__"+String(selection.tube.id);
    if(handle.kind==="origin")tube.origin=clone(patch.origin);
    else{
      if(!Array.isArray(tube.rows)||!tube.rows[selection.rowIndex])return null;
      const row=tube.rows[selection.rowIndex];
      if(handle.kind==="line-length"){row.L=patch.value;row.LFormula=String(patch.value);}
      if(handle.kind==="bend-angle"){row.angle=patch.value;row.angleFormula=String(patch.value);}
      if(handle.kind==="bend-radius"){row.clr=patch.value;row.clrSource="geometry_grip_preview";}
    }
    return tube;
  }
  function renderPreview(selection,handle,patch){
    clearPreview();const tube=previewTube(selection,handle,patch);if(!tube||!pipeGroup)return;
    let geometry;try{geometry=eng()?.geometryForTube?.(tube);}catch{return;}
    if(!geometry)return;const g=new THREE.Group();g.name="Geometry Grip Preview";g.userData={helper:true,objectSelectionHelper:true,geometryGripPreview:true};
    for(const el of geometry.elements??[]){
      if(el.type==="LINE"){
        const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([el.start,el.end]),new THREE.LineBasicMaterial({color:0x59e6ff,transparent:true,opacity:.48,depthTest:false,depthWrite:false}));l.userData={helper:true,objectSelectionHelper:true,geometryGripPreview:true};g.add(l);
      }else if(el.type==="BEND"&&el.center&&el.start&&el.axis){
        const radial=el.start.clone().sub(el.center),axis=el.axis.clone().normalize(),sweep=THREE.MathUtils.degToRad(Math.abs(Number(el.angleDeg)||0)),pts=[];
        for(let i=0;i<=24;i++)pts.push(el.center.clone().add(radial.clone().applyAxisAngle(axis,sweep*i/24)));
        const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x59e6ff,transparent:true,opacity:.48,depthTest:false,depthWrite:false}));l.userData={helper:true,objectSelectionHelper:true,geometryGripPreview:true};g.add(l);
      }
    }
    pipeGroup.add(g);previewGroup=g;try{markViewerDirty?.();}catch{}
  }
  function handleValue(selection,handle){
    if(handle.kind==="origin")return selection.tube.origin;
    if(handle.kind==="line-length")return Number(selection.row.L);
    if(handle.kind==="bend-angle")return Number(selection.row.angle);
    if(handle.kind==="bend-radius")return Number(selection.row.clr);
    return null;
  }
  function updatePanel(selection){
    ensurePanel();const handles=selection?handleDescriptors(selection):[];panel.classList.toggle("open",!!selection&&handles.length>0);
    const title=panel.querySelector("[data-geometry-grip-title]"),input=panel.querySelector("[data-geometry-grip-value]");
    if(title)title.textContent=activeHandle?.label??(selection?.kind==="tube"?"Origin":"Geometry grips");
    if(!selection||!activeHandle){if(input){input.value="";input.disabled=true;}return;}
    const value=handleValue(selection,activeHandle);if(input){
      input.disabled=activeHandle.kind==="origin";
      input.value=typeof value==="number"&&Number.isFinite(value)?String(value):"";
      input.placeholder=activeHandle.kind==="line-length"?"L / formula":activeHandle.kind==="bend-angle"?"angle / formula":"CLR / formula";
    }
  }
  function setPanelPreview(handle,patch){
    const out=panel?.querySelector("[data-geometry-grip-preview]");if(!out)return;
    if(handle.kind==="origin")out.textContent=patch?.origin?"Preview origin: "+[patch.origin.x,patch.origin.y,patch.origin.z].map(v=>Number(v).toFixed(2)).join("; "):"";
    else out.textContent=Number.isFinite(Number(patch?.value))?"Preview: "+Number(patch.value).toFixed(3):"";
  }
  function begin(event,picked){
    const selection=selectedGeometry(),handle=picked?.handle;if(!selection||!handle||!canEdit(selection))return false;
    activeHandle=handle;updatePanel(selection);
    snap()?.startCommand?.("geometry-grip",{ortho:handle.kind==="line-length",polar:handle.kind.startsWith("bend-")});
    drag={handle,selectionKey:{tubeId:String(selection.tube.id),rowIndex:selection.rowIndex},patch:null};
    try{if(controls)controls.enabled=false;}catch{}
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();return true;
  }
  function update(event){
    if(!drag)return false;const selection=selectedGeometry();if(!selection||String(selection.tube.id)!==drag.selectionKey.tubeId)return false;
    const p=currentPointerPoint(event,drag.handle),patch=patchFromPoint(selection,drag.handle,p);if(!patch)return false;
    drag.patch=patch;renderPreview(selection,drag.handle,patch);setPanelPreview(drag.handle,patch);
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();return true;
  }
  function boundAllowed(selection,apply,rollback){
    let before=null;try{
      if(String(eng()?.getState?.()?.activeTubeId??"")===String(selection.tube.id)&&typeof analyzePipeBounds==="function")before=analyzePipeBounds();
      else if(typeof analyzeTubeBounds==="function")before=analyzeTubeBounds(selection.tube);
    }catch{}
    apply();
    try{
      let after=null;
      if(String(eng()?.getState?.()?.activeTubeId??"")===String(selection.tube.id)&&typeof analyzePipeBounds==="function")after=analyzePipeBounds();
      else if(typeof analyzeTubeBounds==="function")after=analyzeTubeBounds(selection.tube);
      const assessment=before&&after&&typeof boundsAssessment==="function"?boundsAssessment(before,after):null;
      if((assessment&&assessment.allowed===false)||(!assessment&&before?.valid===true&&after?.valid===false)){rollback();toast(assessment?.message??"Изменение создаёт нарушение габаритной рамки");return false;}
    }catch{}
    return true;
  }
  function commitPatch(selection,handle,patch,{formula=null,label="Geometry grip"}={}){
    if(!patch||!canEdit(selection))return false;
    const command=eng()?.modelCommand;
    const mutate=()=>{
      if(handle.kind==="origin"){
        const state=eng()?.getState?.(),active=String(state?.activeTubeId??"")===String(selection.tube.id);
        const old=clone(active?(state?.origin??selection.tube.origin??{x:0,y:0,z:0}):(selection.tube.origin??{x:0,y:0,z:0}));
        return boundAllowed(selection,()=>{
          if(active)state.origin=clone(patch.origin);
          selection.tube.origin=clone(patch.origin);
        },()=>{
          if(active)state.origin=clone(old);
          selection.tube.origin=clone(old);
        });
      }
      const row=rowFor(selection.tube,selection.rowIndex);if(!row)return false;
      const old={L:row.L,LFormula:row.LFormula,angle:row.angle,angleFormula:row.angleFormula,clr:row.clr,clrFormula:row.clrFormula,clrSource:row.clrSource};
      const apply=()=>{
        if(handle.kind==="line-length"){row.L=Number(patch.value.toFixed(6));row.LFormula=formula??String(row.L);}
        else if(handle.kind==="bend-angle"){row.angle=Number(patch.value.toFixed(6));row.angleFormula=formula??String(row.angle);}
        else if(handle.kind==="bend-radius"){row.clr=Number(patch.value.toFixed(6));row.clrFormula=formula??String(row.clr);row.clrSource=formula?"formula_geometry_grip":"geometry_grip";}
      };
      const rollback=()=>Object.assign(row,old);
      return boundAllowed(selection,apply,rollback);
    };
    let ok;try{ok=typeof command==="function"?command(label,mutate):mutate();}catch(error){toast(error?.message??error);return false;}
    if(ok===false)return false;try{eng()?.save?.();eng()?.renderAll?.();}catch{}dispatch(handle.kind);rebuild();return true;
  }
  function finish(event,{cancel=false}={}){
    if(!drag)return false;const state=drag;drag=null;clearPreview();snap()?.endCommand?.();try{if(controls)controls.enabled=true;}catch{}
    const selection=selectedGeometry();let ok=true;if(!cancel&&selection&&state.patch)ok=commitPatch(selection,state.handle,state.patch,{label:"3D Geometry grip"});
    suppressUntil=Date.now()+120;rebuild();event?.preventDefault?.();event?.stopPropagation?.();event?.stopImmediatePropagation?.();return ok;
  }
  function exactPatch(selection,handle,raw){
    if(handle.kind==="origin")throw new Error("Origin редактируется drag/Snap или командой Move");
    const vars={...(project()?.formula_variables??{}),...(project()?.geometry_formula_variables??{})};
    const kind=handle.kind==="bend-angle"?"angle":"length",value=dynamicInput.evaluateNumericInput(raw,{kind,variables:vars});
    if(handle.kind==="line-length"||handle.kind==="bend-radius"){
      if(!(value>.0001))throw new Error("Значение должно быть > 0");
      return {value};
    }
    if(handle.kind==="bend-angle"){
      if(Math.abs(value)>.001&&Math.abs(value)<180)return {value};
      throw new Error("Угол должен быть в диапазоне (-180; 180) без 0");
    }
    return null;
  }
  function applyExact(){
    const selection=selectedGeometry();if(!selection||!activeHandle)return false;
    const raw=panel?.querySelector("[data-geometry-grip-value]")?.value??"";
    let patch;try{patch=exactPatch(selection,activeHandle,raw);}catch(error){toast(error?.message??error);return false;}
    return commitPatch(selection,activeHandle,patch,{formula:String(raw).trim(),label:"Exact Geometry grip"});
  }
  function ensurePanel(){
    if(panel)return panel;const style=document.createElement("style");style.id="tbGeometryGripStyles";style.textContent='#tbGeometryGripPanel{position:fixed;left:14px;bottom:116px;z-index:120314;width:310px;padding:8px;border:1px solid #41566f;border-radius:8px;background:rgba(13,22,32,.96);color:#eaf3fd;font:11px system-ui;box-shadow:0 10px 30px rgba(0,0,0,.45);display:none}#tbGeometryGripPanel.open{display:block}#tbGeometryGripPanel .gg-row{display:flex;gap:6px;align-items:center;margin:5px 0}#tbGeometryGripPanel input{width:125px;background:#0a121b;color:#fff;border:1px solid #40536a;border-radius:4px;padding:4px}#tbGeometryGripPanel button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:4px 7px;cursor:pointer}.gg-grow{flex:1}.gg-muted{color:#8295aa}';document.head.appendChild(style);
    panel=document.createElement("section");panel.id="tbGeometryGripPanel";panel.innerHTML='<div class="gg-row"><b data-geometry-grip-title>Geometry grips</b><span class="gg-grow"></span><span class="gg-muted">Snap + formula</span></div><div class="gg-row"><label>Exact</label><input data-geometry-grip-value><button data-geometry-grip-apply>Apply</button></div><div class="gg-row"><span class="gg-muted" data-geometry-grip-preview>Выберите grip и перетащите его</span></div>';document.body.appendChild(panel);panel.querySelector("[data-geometry-grip-apply]").onclick=applyExact;return panel;
  }
  function dispatch(reason){try{window.dispatchEvent(new CustomEvent("tubebender-geometry-grip-change",{detail:{reason:String(reason??"change")}}));}catch{}}
  function onDown(event){if(event.button!==0||drag)return;const picked=pick(event);if(picked)begin(event,picked);}
  function onMove(event){if(drag)update(event);}
  function onUp(event){if(drag)finish(event);}
  function onClick(event){if(Date.now()<suppressUntil){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();}}
  function onKey(event){if(event.key==="Escape"&&drag)finish(event,{cancel:true});}
  function selectionChanged(){if(drag)return;activeHandle=null;rebuild();}
  async function install(){
    if(installed)return;installed=true;try{dynamicInput=await import(DYNAMIC_INPUT_URL);}catch(error){console.error("Geometry grips runtime failed",error);return;}
    ensurePanel();canvas()?.addEventListener("pointerdown",onDown,true);window.addEventListener("pointermove",onMove,true);window.addEventListener("pointerup",onUp,true);canvas()?.addEventListener("click",onClick,true);window.addEventListener("keydown",onKey,true);
    window.addEventListener("tubebender-selection-change",selectionChanged);window.addEventListener("tubebender-lock-change",rebuild);window.addEventListener("tubebender-layer-change",rebuild);window.addEventListener("tubebender-tolerance-change",rebuild);
    if(typeof renderAll==="function"&&!renderAll._tbGeometryGrips){const original=renderAll;renderAll=function(...args){const result=original.apply(this,args);try{rebuild();}catch{}return result;};renderAll._tbGeometryGrips=true;}
    rebuild();window.TubeBenderGeometryGrips=Object.freeze({rebuild,selectedGeometry,applyExact});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();