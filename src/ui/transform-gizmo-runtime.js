(()=>{
  const SETTINGS_KEY="tubebender.transformGizmo.settings";
  let installed=false,gizmoGroup=null,previewGroup=null,panel=null,drag=null,activeHandle=null,suppressClickUntil=0;
  const pivotState={feature:null,snap:null,temporary:null};
  const settings=loadSettings();

  function loadSettings(){
    const defaults={visible:true,cs:"global",pivotMode:"center",ortho:false,polar:false,polarStep:15,userEuler:{x:0,y:0,z:0},userOrigin:{x:0,y:0,z:0}};
    try{
      const raw=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"null");
      if(!raw||typeof raw!=="object")return defaults;
      return {
        visible:raw.visible!==false,
        cs:["global","local","user"].includes(raw.cs)?raw.cs:"global",
        pivotMode:["center","p1","feature","snap","cs-origin","temporary"].includes(raw.pivotMode)?raw.pivotMode:"center",
        ortho:raw.ortho===true,
        polar:raw.polar===true,
        polarStep:Number(raw.polarStep)>0?Number(raw.polarStep):15,
        userEuler:{
          x:Number(raw.userEuler?.x)||0,
          y:Number(raw.userEuler?.y)||0,
          z:Number(raw.userEuler?.z)||0
        },
        userOrigin:{
          x:Number(raw.userOrigin?.x)||0,
          y:Number(raw.userOrigin?.y)||0,
          z:Number(raw.userOrigin?.z)||0
        }
      };
    }catch{return defaults;}
  }
  function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}}
  const context=()=>window.TubeBenderObjectContext??null;
  const engineering=()=>window.TubeBenderEngineering??null;
  const editing=()=>window.TubeBenderEditing??null;
  const snapTracking=()=>window.TubeBenderSnapTracking??null;
  const scale=()=>typeof GEOM_SCALE==="number"&&Number.isFinite(GEOM_SCALE)&&Math.abs(GEOM_SCALE)>1e-12?GEOM_SCALE:1;
  const canvas=()=>document.getElementById("threeCanvas");
  const entries=()=>context()?.selectionEntries?.()??[];
  const wholeEntries=()=>entries().filter((entry)=>entry.kind==="tube"||entry.kind==="ref");
  const project=()=>{try{return engineering()?.activeProject?.()??null;}catch{return null;}};
  const tubeById=(id)=>(project()?.tubes??[]).find((tube)=>String(tube?.id)===String(id))??null;
  const activeTubeId=()=>String(engineering()?.activeTube?.()?.id??"");
  const toast=(message)=>{try{engineering()?.toast?.(String(message??""));}catch{}};

  function isTextTarget(target){
    return !!target&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/i.test(String(target.tagName||"")));
  }
  function axisFromName(name){
    const key=String(name||"x").toLowerCase();
    if(key==="y")return new THREE.Vector3(0,1,0);
    if(key==="z")return new THREE.Vector3(0,0,1);
    return new THREE.Vector3(1,0,0);
  }
  function exactStartVector(tube){
    const sv=tube?.startVector;
    if(sv&&[sv.x,sv.y,sv.z].every(Number.isFinite)){
      const v=new THREE.Vector3(Number(sv.x),Number(sv.y),Number(sv.z));
      if(v.lengthSq()>1e-12)return v.normalize();
    }
    const axis=String(tube?.startAxis??"X").toUpperCase();
    const sign=axis.startsWith("-")?-1:1,key=axis.replace("-","");
    if(key==="Y")return new THREE.Vector3(0,sign,0);
    if(key==="Z")return new THREE.Vector3(0,0,sign);
    return new THREE.Vector3(sign,0,0);
  }
  function basisFromX(xValue){
    const x=xValue.clone().normalize();
    const reference=Math.abs(x.z)<.92?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0);
    const y=reference.clone().cross(x).normalize();
    const z=x.clone().cross(y).normalize();
    return {x,y,z};
  }
  function currentBasis(){
    if(typeof THREE==="undefined")return null;
    if(settings.cs==="local"){
      const first=wholeEntries().find((entry)=>entry.kind==="tube");
      const tube=first?tubeById(first.tubeId):null;
      if(tube)return basisFromX(exactStartVector(tube));
    }
    if(settings.cs==="user"){
      const e=settings.userEuler;
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(
        THREE.MathUtils.degToRad(e.x),
        THREE.MathUtils.degToRad(e.y),
        THREE.MathUtils.degToRad(e.z),
        "XYZ"
      ));
      return {
        x:new THREE.Vector3(1,0,0).applyQuaternion(q).normalize(),
        y:new THREE.Vector3(0,1,0).applyQuaternion(q).normalize(),
        z:new THREE.Vector3(0,0,1).applyQuaternion(q).normalize()
      };
    }
    return {x:new THREE.Vector3(1,0,0),y:new THREE.Vector3(0,1,0),z:new THREE.Vector3(0,0,1)};
  }
  function basisQuaternion(basis){
    const matrix=new THREE.Matrix4().makeBasis(basis.x,basis.y,basis.z);
    return new THREE.Quaternion().setFromRotationMatrix(matrix);
  }
  function entrySets(){
    const tubes=new Set(),refs=new Set();
    for(const entry of wholeEntries()){
      if(entry.kind==="tube")tubes.add(String(entry.tubeId));
      if(entry.kind==="ref")refs.add(String(entry.sceneId)+"|"+String(entry.nodeId));
    }
    return {tubes,refs};
  }
  function objectMatchesSelection(object,sets){
    let item=object;
    const activeId=activeTubeId();
    while(item){
      const data=item.userData??{};
      if(data.helper||data.objectSelectionHelper||data.referenceSelectionHelper||data.transformGizmo)return false;
      const refKey=data.referenceSceneId&&data.referenceNodeId
        ?String(data.referenceSceneId)+"|"+String(data.referenceNodeId)
        :null;
      if(refKey&&sets.refs.has(refKey))return true;
      if(data.tubeId&&sets.tubes.has(String(data.tubeId)))return true;
      if(activeId&&sets.tubes.has(activeId)&&(data.pipe===true||data.originPoint===true||data.tubeEnd===true||Number.isInteger(Number(data.rowIndex))))return true;
      item=item.parent;
    }
    return false;
  }
  function selectedLeaves(){
    if(typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup)return [];
    const sets=entrySets(),out=[];
    pipeGroup.updateMatrixWorld?.(true);
    pipeGroup.traverse((object)=>{
      if(object===pipeGroup||!object.visible||!object.geometry)return;
      if(!(object.isMesh||object.isLine||object.isLineSegments||object.isPoints))return;
      if(objectMatchesSelection(object,sets))out.push(object);
    });
    return out;
  }
  function selectionBounds(){
    const leaves=selectedLeaves();
    if(!leaves.length)return null;
    const box=new THREE.Box3();
    for(const object of leaves){
      const b=new THREE.Box3().setFromObject(object);
      if(!b.isEmpty())box.union(b);
    }
    return box.isEmpty()?null:box;
  }
  function selectionCenterScene(){
    const box=selectionBounds();
    if(!box)return null;
    const world=box.getCenter(new THREE.Vector3());
    if(typeof pipeGroup!=="undefined"&&pipeGroup?.worldToLocal)pipeGroup.worldToLocal(world);
    return world;
  }
  function mmPointToScene(point){
    const s=scale();
    return new THREE.Vector3((Number(point?.x)||0)*s,(Number(point?.y)||0)*s,(Number(point?.z)||0)*s);
  }
  function firstSelectedTube(){
    const entry=wholeEntries().find((item)=>item.kind==="tube");
    return entry?tubeById(entry.tubeId):null;
  }
  function p1PivotScene(){
    const tube=firstSelectedTube();
    return tube?mmPointToScene(tube.origin??{x:0,y:0,z:0}):selectionCenterScene();
  }
  function activeCsOriginScene(){
    if(settings.cs==="global")return new THREE.Vector3(0,0,0);
    if(settings.cs==="local")return p1PivotScene();
    return mmPointToScene(settings.userOrigin);
  }
  function candidateScene({featureOnly=false}={}){
    const candidate=snapTracking()?.currentCandidate?.();
    if(!candidate?.point)return null;
    if(featureOnly&&!["Node","Endpoint","Center","Midpoint"].includes(String(candidate.type)))return null;
    return mmPointToScene(candidate.point);
  }
  function pivotScene(){
    const fallback=selectionCenterScene();
    if(!fallback)return null;
    if(settings.pivotMode==="p1")return p1PivotScene()??fallback;
    if(settings.pivotMode==="feature")return pivotState.feature?.clone?.()??fallback;
    if(settings.pivotMode==="snap")return pivotState.snap?.clone?.()??fallback;
    if(settings.pivotMode==="cs-origin")return activeCsOriginScene()??fallback;
    if(settings.pivotMode==="temporary")return pivotState.temporary?.clone?.()??fallback;
    return fallback;
  }
  function pivotMm(){
    const p=pivotScene();if(!p)return null;
    const s=scale();return {x:p.x/s,y:p.y/s,z:p.z/s};
  }
  function captureFeaturePivot(){
    const point=candidateScene({featureOnly:true});
    if(!point){toast("Текущий Snap должен быть Node / Endpoint / Center / Midpoint");return false;}
    pivotState.feature=point.clone();settings.pivotMode="feature";saveSettings();rebuildGizmo();updatePanel();return true;
  }
  function captureSnapPivot(){
    const point=candidateScene();
    if(!point){toast("Нет активной Snap-точки для Pivot");return false;}
    pivotState.snap=point.clone();settings.pivotMode="snap";saveSettings();rebuildGizmo();updatePanel();return true;
  }
  function setTemporaryPivotMm(point){
    const values={x:Number(point?.x),y:Number(point?.y),z:Number(point?.z)};
    if(!Object.values(values).every(Number.isFinite)){toast("Pivot XYZ должен быть числом");return false;}
    pivotState.temporary=mmPointToScene(values);settings.pivotMode="temporary";saveSettings();rebuildGizmo();updatePanel();return true;
  }
  function canRotate(){
    const list=wholeEntries();
    return list.length>0&&list.every((entry)=>entry.kind==="tube");
  }

  function handleData(object){
    let item=object;
    while(item){
      if(item.userData?.transformGizmoHandle)return item.userData.transformGizmoHandle;
      item=item.parent;
    }
    return null;
  }
  function tagHandle(object,data){
    object.userData={...(object.userData??{}),helper:true,objectSelectionHelper:true,transformGizmo:true,transformGizmoHandle:data};
    object.traverse?.((child)=>{
      child.userData={...(child.userData??{}),helper:true,objectSelectionHelper:true,transformGizmo:true,transformGizmoHandle:data};
    });
    return object;
  }
  function axisColor(name){
    return name==="x"?0xff5a5a:name==="y"?0x55d878:0x5c8dff;
  }
  function makeArrow(name){
    const group=new THREE.Group(),color=axisColor(name);
    const shaft=new THREE.Mesh(
      new THREE.CylinderGeometry(.018,.018,.82,10),
      new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false})
    );
    shaft.position.y=.46;
    const head=new THREE.Mesh(
      new THREE.ConeGeometry(.075,.22,14),
      new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false})
    );
    head.position.y=.98;
    group.add(shaft,head);
    const direction=axisFromName(name);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
    tagHandle(group,{kind:"move-axis",axis:name,label:"Move "+name.toUpperCase()});
    return group;
  }
  function makePlane(name){
    const colors={xy:0xffd45c,xz:0xff77a8,yz:0x65e1c2},material=new THREE.MeshBasicMaterial({
      color:colors[name],transparent:true,opacity:.24,side:THREE.DoubleSide,depthTest:false,depthWrite:false
    });
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.34,.34),material);
    if(name==="xy")mesh.position.set(.30,.30,0);
    if(name==="xz"){mesh.rotation.x=Math.PI/2;mesh.position.set(.30,0,.30);}
    if(name==="yz"){mesh.rotation.y=Math.PI/2;mesh.position.set(0,.30,.30);}
    tagHandle(mesh,{kind:"move-plane",plane:name,label:"Move "+name.toUpperCase()});
    return mesh;
  }
  function makeRing(name){
    const mesh=new THREE.Mesh(
      new THREE.TorusGeometry(1.18,.022,8,72),
      new THREE.MeshBasicMaterial({color:axisColor(name),transparent:true,opacity:.82,depthTest:false,depthWrite:false})
    );
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),axisFromName(name));
    tagHandle(mesh,{kind:"rotate",axis:name,label:"Rotate "+name.toUpperCase()});
    return mesh;
  }
  function clearGizmo(){
    if(gizmoGroup?.parent)gizmoGroup.parent.remove(gizmoGroup);
    gizmoGroup=null;
  }
  function gizmoVisualScale(pivot){
    if(typeof camera==="undefined"||!camera)return 1;
    const world=pivot.clone();
    if(typeof pipeGroup!=="undefined"&&pipeGroup?.localToWorld)pipeGroup.localToWorld(world);
    return Math.max(.25,Math.min(25,camera.position.distanceTo(world)*.12));
  }
  function rebuildGizmo(){
    clearGizmo();
    if(!settings.visible||typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup)return false;
    const list=wholeEntries(),pivot=pivotScene(),basis=currentBasis();
    if(!list.length||!pivot||!basis)return false;
    const group=new THREE.Group();
    group.name="TubeBender Transform Gizmo";
    group.userData={helper:true,objectSelectionHelper:true,transformGizmo:true};
    group.position.copy(pivot);
    group.quaternion.copy(basisQuaternion(basis));
    group.scale.setScalar(gizmoVisualScale(pivot));
    group.add(makeArrow("x"),makeArrow("y"),makeArrow("z"));
    group.add(makePlane("xy"),makePlane("xz"),makePlane("yz"));
    if(canRotate())group.add(makeRing("x"),makeRing("y"),makeRing("z"));
    group.traverse((object)=>{object.renderOrder=12000;});
    pipeGroup.add(group);gizmoGroup=group;
    updatePanel();
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
    return true;
  }

  function clearPreview(){
    if(previewGroup?.parent)previewGroup.parent.remove(previewGroup);
    previewGroup=null;
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
  }
  function clonePreviewLeaf(object){
    const clone=object.clone(false);
    clone.children=[];
    clone.userData={...(clone.userData??{}),helper:true,objectSelectionHelper:true,transformGizmoPreview:true};
    if(object.material){
      const src=Array.isArray(object.material)?object.material:[object.material];
      const mats=src.map((material)=>{
        const m=material?.clone?.()??material;
        if(m){
          m.transparent=true;m.opacity=.34;m.depthWrite=false;m.depthTest=false;
          if(m.color?.setHex)m.color.setHex(0x52d6ff);
        }
        return m;
      });
      clone.material=Array.isArray(object.material)?mats:mats[0];
    }
    const inv=new THREE.Matrix4().copy(pipeGroup.matrixWorld).invert();
    clone.matrix.copy(inv.multiply(object.matrixWorld));
    clone.matrixAutoUpdate=false;
    return clone;
  }
  function ensurePreview(){
    clearPreview();
    if(typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup)return null;
    const group=new THREE.Group();
    group.userData={helper:true,objectSelectionHelper:true,transformGizmoPreview:true};
    for(const leaf of selectedLeaves())group.add(clonePreviewLeaf(leaf));
    group.matrixAutoUpdate=false;group.matrix.identity();
    pipeGroup.add(group);previewGroup=group;
    return group;
  }
  function previewMove(deltaMm){
    const group=previewGroup??ensurePreview();if(!group)return;
    const s=scale();
    group.matrix.makeTranslation(deltaMm.x*s,deltaMm.y*s,deltaMm.z*s);
    group.matrixWorldNeedsUpdate=true;
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
  }
  function previewRotate(axis,angleRad,pivot){
    const group=previewGroup??ensurePreview();if(!group)return;
    const t1=new THREE.Matrix4().makeTranslation(pivot.x,pivot.y,pivot.z);
    const r=new THREE.Matrix4().makeRotationAxis(axis.clone().normalize(),angleRad);
    const t2=new THREE.Matrix4().makeTranslation(-pivot.x,-pivot.y,-pivot.z);
    group.matrix.copy(t1).multiply(r).multiply(t2);group.matrixWorldNeedsUpdate=true;
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
  }

  function pointerRay(event){
    const c=canvas(),rect=c?.getBoundingClientRect?.();
    if(!c||!rect?.width||!rect?.height||typeof camera==="undefined"||!camera)return null;
    const mouse=new THREE.Vector2(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    const rc=new THREE.Raycaster();rc.params.Line={threshold:.08};rc.setFromCamera(mouse,camera);return rc;
  }
  function pickHandle(event){
    if(!gizmoGroup)return null;
    const rc=pointerRay(event);if(!rc)return null;
    const hits=rc.intersectObjects(gizmoGroup.children,true);
    for(const hit of hits){
      const handle=handleData(hit.object);
      if(handle)return {handle,object:hit.object,hit};
    }
    return null;
  }
  function planeHit(event,normal,point){
    const rc=pointerRay(event);if(!rc)return null;
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal.clone().normalize(),point);
    const out=new THREE.Vector3();return rc.ray.intersectPlane(plane,out)?out:null;
  }
  function axisVector(handle,basis){
    return basis[String(handle.axis||"x")]?.clone?.().normalize()??new THREE.Vector3(1,0,0);
  }
  function planeVectors(handle,basis){
    const key=String(handle.plane||"xy");
    const a=basis[key[0]]?.clone?.().normalize()??basis.x.clone();
    const b=basis[key[1]]?.clone?.().normalize()??basis.y.clone();
    const normal=a.clone().cross(b).normalize();
    return {a,b,normal};
  }
  function moveAxisDragPlaneNormal(axis,pivot){
    const worldPivot=pivot.clone();pipeGroup.localToWorld(worldPivot);
    const cameraDirection=camera.position.clone().sub(worldPivot).normalize();
    let normal=axis.clone().cross(cameraDirection.clone().cross(axis));
    if(normal.lengthSq()<1e-8){
      normal=Math.abs(axis.z)<.9?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0);
    }
    return normal.normalize();
  }
  function snapPointScene(){
    const candidate=snapTracking()?.currentCandidate?.();
    if(!candidate?.point)return null;
    const s=scale();return new THREE.Vector3(candidate.point.x*s,candidate.point.y*s,candidate.point.z*s);
  }
  function applyPlaneTracking(u,v){
    let a=u,b=v;
    if(settings.ortho){
      if(Math.abs(a)>=Math.abs(b))b=0;else a=0;
    }else if(settings.polar){
      const r=Math.hypot(a,b);
      if(r>1e-12){
        const step=THREE.MathUtils.degToRad(Math.max(.001,Number(settings.polarStep)||15));
        const angle=Math.round(Math.atan2(b,a)/step)*step;
        a=r*Math.cos(angle);b=r*Math.sin(angle);
      }
    }
    return {u:a,v:b};
  }
  function handleLabel(handle){return handle?.label??"";}

  function beginDrag(event,picked){
    const handle=picked?.handle;if(!handle)return false;
    const pivot=pivotScene(),basis=currentBasis();if(!pivot||!basis)return false;
    activeHandle={...handle};updatePanel();
    let planeNormal,startHit,startVector=null;
    if(handle.kind==="move-axis"){
      const axis=axisVector(handle,basis);
      planeNormal=moveAxisDragPlaneNormal(axis,pivot);
      startHit=planeHit(event,planeNormal,pivot);
    }else if(handle.kind==="move-plane"){
      const vectors=planeVectors(handle,basis);planeNormal=vectors.normal;startHit=planeHit(event,planeNormal,pivot);
    }else if(handle.kind==="rotate"){
      const axis=axisVector(handle,basis);planeNormal=axis;startHit=planeHit(event,planeNormal,pivot);
      if(startHit)startVector=startHit.clone().sub(pivot).normalize();
    }
    if(!startHit)return false;
    ensurePreview();
    drag={handle:{...handle},pivot,basis,planeNormal,startHit,startVector,deltaMm:{x:0,y:0,z:0},angleRad:0};
    try{if(controls)controls.enabled=false;}catch{}
    snapTracking()?.startCommand?.("transform-gizmo",{ortho:settings.ortho,polar:settings.polar,polar_increment_deg:settings.polarStep});
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
    return true;
  }
  function updateDrag(event){
    if(!drag)return false;
    const current=planeHit(event,drag.planeNormal,drag.pivot);if(!current)return false;
    const snapped=snapPointScene();
    const handle=drag.handle,s=scale();
    if(handle.kind==="move-axis"){
      const axis=axisVector(handle,drag.basis);
      const raw=(snapped??current).clone().sub(snapped?drag.pivot:drag.startHit);
      const amount=raw.dot(axis);
      const delta=axis.clone().multiplyScalar(amount/s);
      drag.deltaMm={x:delta.x,y:delta.y,z:delta.z};
      previewMove(drag.deltaMm);
      setNumericFields(amount/s,0);
    }else if(handle.kind==="move-plane"){
      const vectors=planeVectors(handle,drag.basis);
      const raw=(snapped??current).clone().sub(snapped?drag.pivot:drag.startHit);
      const tracked=applyPlaneTracking(raw.dot(vectors.a)/s,raw.dot(vectors.b)/s);
      const delta=vectors.a.clone().multiplyScalar(tracked.u).add(vectors.b.clone().multiplyScalar(tracked.v));
      drag.deltaMm={x:delta.x,y:delta.y,z:delta.z};
      previewMove(drag.deltaMm);
      setNumericFields(tracked.u,tracked.v);
    }else if(handle.kind==="rotate"){
      const axis=axisVector(handle,drag.basis);
      const vector=(snapped??current).clone().sub(drag.pivot);
      if(vector.lengthSq()>1e-12){
        vector.normalize();
        let angle=Math.atan2(axis.dot(drag.startVector.clone().cross(vector)),drag.startVector.dot(vector));
        if(settings.polar){
          const step=THREE.MathUtils.degToRad(Math.max(.001,Number(settings.polarStep)||15));
          angle=Math.round(angle/step)*step;
        }
        drag.angleRad=angle;previewRotate(axis,angle,drag.pivot);
        setNumericFields(THREE.MathUtils.radToDeg(angle),0);
      }
    }
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
    return true;
  }
  function commitMove(delta){
    if(Math.hypot(delta.x,delta.y,delta.z)<1e-9)return true;
    return context()?.applyMove?.(delta)!==false;
  }
  function commitRotate(axis,pivot,angleRad){
    if(Math.abs(angleRad)<1e-10)return true;
    const s=scale();
    return editing()?.rotateSelectedDirect?.({
      axis:{x:axis.x,y:axis.y,z:axis.z},
      center:{x:pivot.x/s,y:pivot.y/s,z:pivot.z/s},
      angle_deg:THREE.MathUtils.radToDeg(angleRad),
      label:"Gizmo Rotate"
    })!==false;
  }
  function finishDrag(event,{cancel=false}={}){
    if(!drag)return false;
    const state=drag;drag=null;
    clearPreview();
    try{if(controls)controls.enabled=true;}catch{}
    snapTracking()?.endCommand?.();
    let ok=true;
    if(!cancel){
      if(state.handle.kind==="rotate")ok=commitRotate(axisVector(state.handle,state.basis),state.pivot,state.angleRad);
      else ok=commitMove(state.deltaMm);
    }
    suppressClickUntil=Date.now()+120;
    rebuildGizmo();updatePanel();
    event?.preventDefault?.();event?.stopPropagation?.();event?.stopImmediatePropagation?.();
    return ok;
  }

  function parseNumber(value){
    const n=Number(String(value??"").trim().replace(",","."));
    return Number.isFinite(n)?n:null;
  }
  function exactDeltaForHandle(handle,a,b,basis){
    if(handle.kind==="move-axis"){
      const axis=axisVector(handle,basis),delta=axis.multiplyScalar(a);
      return {x:delta.x,y:delta.y,z:delta.z};
    }
    if(handle.kind==="move-plane"){
      const vectors=planeVectors(handle,basis);
      const delta=vectors.a.multiplyScalar(a).add(vectors.b.multiplyScalar(b));
      return {x:delta.x,y:delta.y,z:delta.z};
    }
    return null;
  }
  function applyNumeric(){
    if(!activeHandle){toast("Сначала выберите ось, плоскость или кольцо Gizmo");return false;}
    const a=parseNumber(panel?.querySelector("[data-gizmo-a]")?.value);
    const b=parseNumber(panel?.querySelector("[data-gizmo-b]")?.value);
    if(a==null||(activeHandle.kind==="move-plane"&&b==null)){toast("Введите числовое значение Gizmo");return false;}
    const basis=currentBasis(),pivot=pivotScene();if(!basis||!pivot)return false;
    let ok=false;
    if(activeHandle.kind==="rotate")ok=commitRotate(axisVector(activeHandle,basis),pivot,THREE.MathUtils.degToRad(a));
    else ok=commitMove(exactDeltaForHandle(activeHandle,a,b??0,basis));
    rebuildGizmo();return ok;
  }
  function setNumericFields(a,b){
    const ia=panel?.querySelector("[data-gizmo-a]"),ib=panel?.querySelector("[data-gizmo-b]");
    if(ia)ia.value=Number(a).toFixed(3);
    if(ib)ib.value=Number(b).toFixed(3);
  }

  function injectStyles(){
    if(document.getElementById("tbTransformGizmoStyles"))return;
    const style=document.createElement("style");style.id="tbTransformGizmoStyles";
    style.textContent=
      '#tbTransformGizmoPanel{position:fixed;z-index:120310;left:14px;bottom:14px;width:280px;padding:8px;border:1px solid #41566f;border-radius:8px;background:rgba(13,22,32,.96);color:#eaf3fd;font:11px system-ui;box-shadow:0 10px 30px rgba(0,0,0,.45)}'+
      '#tbTransformGizmoPanel .tg-row{display:flex;align-items:center;gap:6px;margin:5px 0}#tbTransformGizmoPanel .tg-row label{color:#9fb0c3}'+
      '#tbTransformGizmoPanel select,#tbTransformGizmoPanel input{min-width:0;background:#0a121b;color:#fff;border:1px solid #40536a;border-radius:4px;padding:4px}'+
      '#tbTransformGizmoPanel input[type=number]{width:55px}#tbTransformGizmoPanel button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:4px 7px;cursor:pointer}'+
      '#tbTransformGizmoPanel .tg-grow{flex:1}#tbTransformGizmoPanel .tg-muted{color:#8295aa}';
    document.head.appendChild(style);
  }
  function ensurePanel(){
    if(panel)return panel;
    injectStyles();
    panel=document.createElement("section");panel.id="tbTransformGizmoPanel";
    panel.innerHTML=
      '<div class="tg-row"><b>3D Transform Gizmo</b><span class="tg-grow"></span><button data-gizmo-toggle title="G">Hide</button></div>'+
      '<div class="tg-row"><label>CS</label><select data-gizmo-cs><option value="global">Global</option><option value="local">Local</option><option value="user">User</option></select>'+
      '<label><input data-gizmo-ortho type="checkbox"> Ortho</label><label><input data-gizmo-polar type="checkbox"> Polar</label></div>'+
      '<div class="tg-row" data-gizmo-user><label>User XYZ°</label><input data-user-x type="number"><input data-user-y type="number"><input data-user-z type="number"></div>'+
      '<div class="tg-row"><label>Polar°</label><input data-gizmo-step type="number" min="0.001"><span class="tg-grow"></span><span class="tg-muted" data-gizmo-handle>handle: —</span></div>'+
      '<div class="tg-row"><label>A</label><input data-gizmo-a placeholder="mm / °"><label>B</label><input data-gizmo-b placeholder="mm"><button data-gizmo-apply>Apply exact</button></div>';
    document.body.appendChild(panel);
    const cs=panel.querySelector("[data-gizmo-cs]"),ortho=panel.querySelector("[data-gizmo-ortho]"),polar=panel.querySelector("[data-gizmo-polar]"),step=panel.querySelector("[data-gizmo-step]");
    cs.onchange=()=>{settings.cs=cs.value;saveSettings();rebuildGizmo();updatePanel();};
    ortho.onchange=()=>{settings.ortho=ortho.checked;saveSettings();snapTracking()?.setTrackingModes?.({ortho:settings.ortho,polar:settings.polar,polar_increment_deg:settings.polarStep});};
    polar.onchange=()=>{settings.polar=polar.checked;saveSettings();snapTracking()?.setTrackingModes?.({ortho:settings.ortho,polar:settings.polar,polar_increment_deg:settings.polarStep});};
    step.onchange=()=>{settings.polarStep=Math.max(.001,Number(step.value)||15);saveSettings();snapTracking()?.setTrackingModes?.({polar_increment_deg:settings.polarStep});};
    for(const axis of ["x","y","z"]){
      panel.querySelector("[data-user-"+axis+"]").onchange=(event)=>{settings.userEuler[axis]=Number(event.target.value)||0;saveSettings();if(settings.cs==="user")rebuildGizmo();};
    }
    panel.querySelector("[data-gizmo-toggle]").onclick=()=>toggleVisible();
    panel.querySelector("[data-gizmo-apply]").onclick=applyNumeric;
    updatePanel();return panel;
  }
  function updatePanel(){
    if(!panel)return;
    panel.querySelector("[data-gizmo-cs]").value=settings.cs;
    panel.querySelector("[data-gizmo-ortho]").checked=settings.ortho;
    panel.querySelector("[data-gizmo-polar]").checked=settings.polar;
    panel.querySelector("[data-gizmo-step]").value=settings.polarStep;
    panel.querySelector("[data-user-x]").value=settings.userEuler.x;
    panel.querySelector("[data-user-y]").value=settings.userEuler.y;
    panel.querySelector("[data-user-z]").value=settings.userEuler.z;
    panel.querySelector("[data-gizmo-user]").style.display=settings.cs==="user"?"flex":"none";
    panel.querySelector("[data-gizmo-toggle]").textContent=settings.visible?"Hide":"Show";
    panel.querySelector("[data-gizmo-handle]").textContent="handle: "+(activeHandle?handleLabel(activeHandle):"—");
    panel.querySelector("[data-gizmo-b]").disabled=activeHandle?.kind!=="move-plane";
  }
  function toggleVisible(force){
    settings.visible=typeof force==="boolean"?force:!settings.visible;saveSettings();
    if(settings.visible)rebuildGizmo();else{clearGizmo();clearPreview();}
    updatePanel();return settings.visible;
  }

  function onPointerDown(event){
    if(event.button!==0||!settings.visible||drag)return;
    const picked=pickHandle(event);if(!picked)return;
    beginDrag(event,picked);
  }
  function onPointerMove(event){if(drag)updateDrag(event);}
  function onPointerUp(event){if(drag)finishDrag(event);}
  function onClickCapture(event){
    if(Date.now()<suppressClickUntil){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();}
  }
  function onKeyDown(event){
    if(isTextTarget(event.target))return;
    if(event.key==="g"||event.key==="G"){event.preventDefault();toggleVisible();return;}
    if(event.key==="Escape"&&drag){finishDrag(event,{cancel:true});}
  }
  function onSelectionChange(){
    if(drag)return;
    activeHandle=null;clearPreview();rebuildGizmo();updatePanel();
  }
  function install(){
    if(installed)return;installed=true;
    ensurePanel();
    const c=canvas();
    c?.addEventListener("pointerdown",onPointerDown,true);
    c?.addEventListener("pointermove",onPointerMove,true);
    c?.addEventListener("pointerup",onPointerUp,true);
    c?.addEventListener("pointercancel",(event)=>drag&&finishDrag(event,{cancel:true}),true);
    c?.addEventListener("click",onClickCapture,true);
    window.addEventListener("keydown",onKeyDown,true);
    window.addEventListener("tubebender-selection-change",onSelectionChange);
    window.addEventListener("resize",()=>{if(settings.visible)rebuildGizmo();});
    rebuildGizmo();
    window.TubeBenderTransformGizmo=Object.freeze({
      install,rebuild:rebuildGizmo,show:()=>toggleVisible(true),hide:()=>toggleVisible(false),toggle:toggleVisible,
      settings:()=>structuredClone(settings),
      setCoordinateSystem:(value)=>{if(!["global","local","user"].includes(value))throw new RangeError("Unknown coordinate system");settings.cs=value;saveSettings();rebuildGizmo();updatePanel();return value;},
      setUserEuler:(value)=>{settings.userEuler={x:Number(value?.x)||0,y:Number(value?.y)||0,z:Number(value?.z)||0};saveSettings();if(settings.cs==="user")rebuildGizmo();updatePanel();return structuredClone(settings.userEuler);},
      applyNumeric,
      activeHandle:()=>activeHandle?structuredClone(activeHandle):null,
      pivotMm
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();