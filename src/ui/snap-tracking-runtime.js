(()=>{
  const SNAP_ENGINE_URL="__TB_SNAP_ENGINE_MODULE_URL__";
  const HOVER_ACQUIRE_MS=450;
  const REFERENCE_TTL_MS=5000;
  let snap=null,installed=false,active=false,commandName="";
  let sourceCandidates=[],rankedCandidates=[],current=null;
  let acquired=[],hoverId=null,hoverTimer=null,lastPointer=null,lastCursor=null;
  let helperGroup=null,hud=null,pruneTimer=null;
  let modes={ortho:true,polar:false,polar_increment_deg:15};
  let snapOptions={through_snap:false};

  const context=()=>window.TubeBenderObjectContext??null;
  const toleranceApi=()=>window.TubeBenderToleranceProfile??null;
  const toleranceProfile=()=>toleranceApi()?.profile?.()??null;
  const snapSettings=(base={})=>toleranceApi()?.snapSettings?.(base)??base;
  const now=()=>globalThis.performance?.now?.()??Date.now();
  const clone=(v)=>v==null?v:structuredClone(v);
  const canvas=()=>document.getElementById("threeCanvas");
  const sceneScale=()=>typeof GEOM_SCALE==="number"&&Number.isFinite(GEOM_SCALE)&&Math.abs(GEOM_SCALE)>1e-12?GEOM_SCALE:1;
  const isTextTarget=(target)=>!!target&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/i.test(String(target.tagName||"")));

  function ensureHud(){
    if(hud)return hud;
    const el=document.createElement("div");
    el.id="tbSnapTrackingHud";
    el.style.cssText="position:fixed;display:none;z-index:120500;pointer-events:none;padding:5px 7px;border:1px solid #60758e;border-radius:5px;background:rgba(9,17,27,.94);color:#edf5ff;font:11px Segoe UI,Arial,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.4);white-space:nowrap";
    document.body.appendChild(el);hud=el;return el;
  }

  function clearHoverTimer(){
    if(hoverTimer!=null){clearTimeout(hoverTimer);hoverTimer=null;}
  }

  function dispatch(){
    try{
      window.dispatchEvent(new CustomEvent("tubebender-snap-change",{detail:{
        active,command:commandName,
        current:current?clone(current):null,
        candidates:rankedCandidates.map(clone),
        references:acquired.map((r)=>({candidate:clone(r.candidate),pinned:r.pinned===true}))
      }}));
    }catch{}
  }

  function sameReference(candidate){
    return acquired.find((r)=>String(r.candidate?.id)===String(candidate?.id))??null;
  }

  function acquireCandidate(candidate,{pinned=false}={}){
    if(!candidate||candidate.virtual===true)return false;
    const existing=sameReference(candidate);
    if(existing){
      existing.last_seen=now();
      existing.pinned=existing.pinned||pinned===true;
    }else{
      acquired.push({candidate:clone(candidate),acquired_at:now(),last_seen:now(),pinned:pinned===true});
    }
    rebuild(lastCursor,lastPointer);
    return true;
  }

  function scheduleHoverAcquire(candidate){
    const id=candidate&&!candidate.virtual?String(candidate.id):null;
    if(id===hoverId)return;
    clearHoverTimer();hoverId=id;
    if(!id)return;
    hoverTimer=setTimeout(()=>{
      hoverTimer=null;
      if(!active||hoverId!==id)return;
      const candidateNow=sourceCandidates.find((c)=>String(c.id)===id);
      if(candidateNow)acquireCandidate(candidateNow);
    },HOVER_ACQUIRE_MS);
  }

  function pruneReferences(){
    const stamp=now();
    const before=acquired.length;
    acquired=acquired.filter((r)=>r.pinned===true||(stamp-r.last_seen)<=REFERENCE_TTL_MS);
    if(acquired.length!==before)rebuild(lastCursor,lastPointer);
  }

  function worldToScreenDistance(point,event){
    if(!point||!event||typeof THREE==="undefined"||typeof camera==="undefined")return 0;
    const c=canvas(),rect=c?.getBoundingClientRect?.();
    if(!c||!rect?.width||!rect?.height)return 0;
    const scale=sceneScale();
    const p=new THREE.Vector3(Number(point.x)*scale,Number(point.y)*scale,Number(point.z)*scale).project(camera);
    const sx=rect.left+(p.x+1)*.5*rect.width;
    const sy=rect.top+(1-p.y)*.5*rect.height;
    return Math.hypot(Number(event.clientX)-sx,Number(event.clientY)-sy);
  }

  function pointerWorldPoint(event){
    const direct=snap?.selectBestSnapCandidate?.(sourceCandidates,snapSettings());
    if(direct?.point)return clone(direct.point);
    if(!event||!acquired.length||typeof THREE==="undefined"||typeof camera==="undefined")return lastCursor;
    const c=canvas(),rect=c?.getBoundingClientRect?.();
    if(!c||!rect?.width||!rect?.height)return lastCursor;
    const mouse=new THREE.Vector2(
      ((event.clientX-rect.left)/rect.width)*2-1,
      -((event.clientY-rect.top)/rect.height)*2+1
    );
    const raycaster=new THREE.Raycaster();raycaster.setFromCamera(mouse,camera);
    const scale=sceneScale(),anchor=acquired[0].candidate.point;
    const planePoint=new THREE.Vector3(anchor.x*scale,anchor.y*scale,anchor.z*scale);
    const normal=new THREE.Vector3();camera.getWorldDirection(normal);
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,planePoint);
    const hit=new THREE.Vector3();
    if(!raycaster.ray.intersectPlane(plane,hit))return lastCursor;
    return {x:hit.x/scale,y:hit.y/scale,z:hit.z/scale};
  }

  function rayDirections(anchor,cursor){
    const out=[];
    if(modes.ortho){
      out.push({name:"X",v:{x:1,y:0,z:0}},{name:"Y",v:{x:0,y:1,z:0}},{name:"Z",v:{x:0,y:0,z:1}});
    }
    if(modes.polar&&cursor){
      const dx=Number(cursor.x)-Number(anchor.x),dy=Number(cursor.y)-Number(anchor.y);
      if(Math.hypot(dx,dy)>1e-9){
        const step=Math.max(0.001,Number(modes.polar_increment_deg)||15);
        const angle=Math.atan2(dy,dx)*180/Math.PI;
        const snapped=Math.round(angle/step)*step*Math.PI/180;
        out.push({name:"Polar",v:{x:Math.cos(snapped),y:Math.sin(snapped),z:0}});
      }
    }
    return out;
  }

  function trackingRays(cursor){
    const rays=[];
    for(const ref of acquired){
      ref.last_seen=ref.pinned?ref.last_seen:ref.last_seen;
      for(const direction of rayDirections(ref.candidate.point,cursor)){
        rays.push(snap.createObjectSnapTrackingRay({
          anchor:ref.candidate.point,
          direction:direction.v,
          source_candidate_id:ref.candidate.id,
          label:"Tracking "+direction.name
        }));
      }
    }
    return rays;
  }

  function currentWorkingPlane(){
    let p=null;try{p=window.TubeBenderEngineering?.activeProject?.()??null;}catch{}
    const plane=p?.working_plane??p?.workingPlane??null;
    const point=plane?.point??plane?.origin??{x:0,y:0,z:0};
    const normal=plane?.normal??{x:0,y:0,z:1};
    return {point:{x:Number(point.x)||0,y:Number(point.y)||0,z:Number(point.z)||0},normal:{x:Number(normal.x)||0,y:Number(normal.y)||0,z:Number(normal.z)||1}};
  }
  function contextualGeometryCandidates(event){
    if(!acquired.length||!snap)return [];
    const anchorRef=acquired.find(ref=>ref.pinned===true)??acquired[0];
    const sourcePoint=anchorRef?.candidate?.point;
    if(!sourcePoint)return [];
    const sourcePrimitive=anchorRef?.candidate?.metadata?.primitive??null;
    const out=[];
    for(const candidate of sourceCandidates){
      const primitive=candidate?.metadata?.primitive;
      if(!primitive)continue;
      if(primitive.kind==="segment"&&primitive.start&&primitive.direction){
        if(sourcePrimitive?.kind==="segment"&&sourcePrimitive.start&&sourcePrimitive.direction&&String(candidate.id)!==String(anchorRef?.candidate?.id)){
          try{
            const relationCandidates=snap.lineLineIntersectionCandidates({
              lineA:{point:sourcePrimitive.start,direction:sourcePrimitive.direction},
              lineB:{point:primitive.start,direction:primitive.direction},
              working_plane:currentWorkingPlane(),
              object_id:String(anchorRef?.candidate?.object_id??"lineA")+"|"+String(candidate.object_id??"lineB"),
              source:candidate.source,
              tolerance_mm:Number(toleranceProfile()?.linear_tolerance_mm??0.01),
              include_projected:true,
              include_closest:true
            });
            for(const hit of relationCandidates){
              out.push({
                ...hit,
                screen_distance_px:worldToScreenDistance(new THREE.Vector3(hit.point.x,hit.point.y,hit.point.z),event),
                metadata:{
                  ...hit.metadata,
                  source_anchor:clone(anchorRef.candidate),
                  target_candidate_id:candidate.id,
                  target_subentity_id:candidate.subentity_id??null,
                  working_plane:currentWorkingPlane()
                }
              });
            }
          }catch{}
        }
        try{
          const hit=snap.perpendicularSnapCandidate({
            point:sourcePoint,
            line_point:primitive.start,
            line_direction:primitive.direction,
            object_id:candidate.object_id,
            source:candidate.source,
            parameter_min:primitive.parameter_min??0,
            parameter_max:primitive.parameter_max,
            subentity_id:String(candidate.subentity_id??"segment")+":perpendicular"
          });
          out.push({
            ...hit,
            screen_distance_px:worldToScreenDistance(new THREE.Vector3(hit.point.x,hit.point.y,hit.point.z),event),
            metadata:{
              ...hit.metadata,
              source_anchor:clone(anchorRef.candidate),
              target_candidate_id:candidate.id,
              target_subentity_id:candidate.subentity_id??null
            }
          });
        }catch{}
      }else if(primitive.kind==="circle"&&primitive.center&&Number.isFinite(Number(primitive.radius_mm))){
        const common={
          point:sourcePoint,
          center:primitive.center,
          radius_mm:Number(primitive.radius_mm),
          normal:primitive.normal??{x:0,y:0,z:1},
          object_id:candidate.object_id,
          source:candidate.source,
          subentity_id:String(candidate.subentity_id??"circle"),
          arc_start_deg:primitive.arc_start_deg,
          arc_end_deg:primitive.arc_end_deg,
          arc_basis_x:primitive.arc_basis_x
        };
        try{
          for(const hit of snap.tangentSnapCandidates(common)){
            out.push({
              ...hit,
              screen_distance_px:worldToScreenDistance(new THREE.Vector3(hit.point.x,hit.point.y,hit.point.z),event),
              metadata:{...hit.metadata,source_anchor:clone(anchorRef.candidate),target_candidate_id:candidate.id,target_subentity_id:candidate.subentity_id??null}
            });
          }
        }catch{}
        try{
          for(const hit of snap.perpendicularCircleSnapCandidates(common)){
            out.push({
              ...hit,
              screen_distance_px:worldToScreenDistance(new THREE.Vector3(hit.point.x,hit.point.y,hit.point.z),event),
              metadata:{...hit.metadata,source_anchor:clone(anchorRef.candidate),target_candidate_id:candidate.id,target_subentity_id:candidate.subentity_id??null}
            });
          }
        }catch{}
      }
    }
    return out;
  }

  function trackingCandidates(cursor,event){
    if(!cursor||!acquired.length)return [];
    const rays=trackingRays(cursor),out=[];
    for(let i=0;i<rays.length;i++){
      const ray=rays[i];
      const base=snap.objectSnapTrackingCandidate({cursor,ray,object_id:"tracking-"+i});
      out.push({...base,screen_distance_px:worldToScreenDistance(base.point,event)});
    }
    for(let i=0;i<rays.length;i++)for(let j=i+1;j<rays.length;j++){
      const hit=snap.intersectObjectSnapTrackingRays(rays[i],rays[j],{tolerance_mm:Number(toleranceProfile()?.linear_tolerance_mm??0.01),object_id:"tracking-"+i+"-"+j});
      if(hit)out.push({...hit,screen_distance_px:worldToScreenDistance(hit.point,event)});
    }
    return out;
  }

  function renderHelpers(cursor){
    if(typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup)return;
    if(helperGroup?.parent)helperGroup.parent.remove(helperGroup);
    helperGroup=null;
    if(!active)return;
    const group=new THREE.Group();group.userData={helper:true,snapTrackingHelper:true};
    const scale=sceneScale(),rayLength=5000*scale;
    const pointGeometry=new THREE.SphereGeometry(Math.max(.035,3*scale),12,8);
    for(const ref of acquired){
      const p=ref.candidate.point;
      const marker=new THREE.Mesh(pointGeometry,new THREE.MeshBasicMaterial({color:ref.pinned?0xffd54a:0x52d6ff,depthTest:false,depthWrite:false}));
      marker.position.set(p.x*scale,p.y*scale,p.z*scale);marker.renderOrder=9900;marker.userData={helper:true,snapTrackingReference:true};group.add(marker);
    }
    for(const ray of trackingRays(cursor)){
      const a=ray.anchor,d=ray.direction;
      const p1=new THREE.Vector3((a.x-d.x*5000)*scale,(a.y-d.y*5000)*scale,(a.z-d.z*5000)*scale);
      const p2=new THREE.Vector3((a.x+d.x*5000)*scale,(a.y+d.y*5000)*scale,(a.z+d.z*5000)*scale);
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1,p2]),new THREE.LineDashedMaterial({color:0x52d6ff,dashSize:Math.max(.04,8*scale),gapSize:Math.max(.025,5*scale),depthTest:false,depthWrite:false}));
      line.computeLineDistances();line.renderOrder=9890;line.userData={helper:true,snapTrackingGuide:true};group.add(line);
    }
    rankedCandidates.forEach((candidate,index)=>{
      if(!candidate?.point)return;
      const isCurrent=String(candidate.id)===String(current?.id);
      const isThrough=candidate.through===true;
      const isVirtual=candidate.virtual===true;
      const color=isCurrent?0xffd54a:isThrough?0xff66cc:isVirtual?0x52d6ff:0xe8f1ff;
      const radius=isCurrent?Math.max(.052,4.8*scale):Math.max(.032,3*scale);
      const geometry=new THREE.SphereGeometry(radius,isCurrent?16:10,isCurrent?10:7);
      const material=new THREE.MeshBasicMaterial({
        color,
        depthTest:false,
        depthWrite:false,
        transparent:!isCurrent,
        opacity:isCurrent?1:.78,
        wireframe:isVirtual||isThrough
      });
      const p=candidate.point;
      const marker=new THREE.Mesh(geometry,material);
      marker.position.set(p.x*scale,p.y*scale,p.z*scale);
      marker.renderOrder=isCurrent?9920:9910;
      marker.userData={
        helper:true,
        snapCandidateMarker:true,
        snapCandidateId:String(candidate.id),
        snapCandidateType:String(candidate.type),
        snapCandidateCurrent:isCurrent,
        snapCandidateVirtual:isVirtual,
        snapCandidateThrough:isThrough,
        snapCandidateIndex:index
      };
      group.add(marker);
    });
    pipeGroup.add(group);helperGroup=group;
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
  }

  function renderHud(){
    const el=ensureHud();
    if(!active||!current||!lastPointer){el.style.display="none";return;}
    const p=current.point;
    const currentIndex=Math.max(0,rankedCandidates.findIndex((candidate)=>String(candidate.id)===String(current.id)));
    const kind=current.through===true?"Through":current.virtual===true?"Virtual":"Exact";
    el.textContent=(current.label||current.type)+" ["+(currentIndex+1)+"/"+rankedCandidates.length+"] "+kind+"  X "+Number(p.x).toFixed(2)+"  Y "+Number(p.y).toFixed(2)+"  Z "+Number(p.z).toFixed(2)+"  · Tab / Shift+Tab · P pin";
    el.style.display="block";
    el.style.left=Math.min(window.innerWidth-320,Math.max(8,Number(lastPointer.clientX)+14))+"px";
    el.style.top=Math.min(window.innerHeight-34,Math.max(8,Number(lastPointer.clientY)+14))+"px";
  }

  function rebuild(cursor=lastCursor,event=lastPointer){
    lastCursor=cursor??lastCursor;lastPointer=event??lastPointer;
    const virtual=trackingCandidates(lastCursor,lastPointer);
    const contextual=contextualGeometryCandidates(lastPointer);
    const all=[...sourceCandidates,...virtual,...contextual];
    rankedCandidates=Array.from(snap?.rankSnapCandidates?.(all,snapSettings({through_snap:snapOptions.through_snap}), {contextual_types:["LineAxis","Intersection","Tangent","Perpendicular"],through_snap:snapOptions.through_snap})??[]);
    const previousId=current?.id;
    current=rankedCandidates.find((c)=>String(c.id)===String(previousId))??rankedCandidates[0]??null;
    const direct=snap?.selectBestSnapCandidate?.(sourceCandidates,snapSettings())??null;
    scheduleHoverAcquire(direct);
    renderHelpers(lastCursor);renderHud();dispatch();
    return current;
  }

  function setCandidates(candidates=[],options={}){
    sourceCandidates=Array.isArray(candidates)?candidates.map(clone):[];
    if(options.cursor)lastCursor=clone(options.cursor);
    if(options.event)lastPointer=options.event;
    return rebuild(lastCursor,lastPointer);
  }

  function cycle(direction=1){
    if(!active||rankedCandidates.length<2)return current;
    current=snap.cycleSnapCandidate(rankedCandidates,current?.id,direction,snapSettings({through_snap:snapOptions.through_snap}), {contextual_types:["LineAxis","Intersection"],through_snap:snapOptions.through_snap})??current;
    renderHelpers(lastCursor);renderHud();dispatch();
    return current;
  }

  function setTrackingModes(next={}){
    modes={
      ortho:next.ortho==null?modes.ortho:next.ortho===true,
      polar:next.polar==null?modes.polar:next.polar===true,
      polar_increment_deg:next.polar_increment_deg==null?modes.polar_increment_deg:Math.max(.001,Number(next.polar_increment_deg)||15)
    };
    rebuild(lastCursor,lastPointer);return {...modes};
  }

  function setSnapOptions(next={}){
    if(next.through_snap!=null)snapOptions.through_snap=next.through_snap===true;
    rebuild(lastCursor,lastPointer);return {...snapOptions};
  }

  function startCommand(name="Edit",options={}){
    active=true;commandName=String(name||"Edit");
    sourceCandidates=[];rankedCandidates=[];current=null;acquired=[];hoverId=null;lastCursor=null;lastPointer=null;
    snapOptions={through_snap:options.through_snap===true};
    setTrackingModes({
      ortho:options.ortho==null?true:options.ortho===true,
      polar:options.polar===true,
      polar_increment_deg:options.polar_increment_deg??15
    });
    if(!pruneTimer)pruneTimer=setInterval(pruneReferences,1000);
    dispatch();return true;
  }

  function endCommand(){
    active=false;commandName="";sourceCandidates=[];rankedCandidates=[];current=null;acquired=[];hoverId=null;lastCursor=null;lastPointer=null;
    clearHoverTimer();
    if(helperGroup?.parent)helperGroup.parent.remove(helperGroup);helperGroup=null;
    if(hud)hud.style.display="none";
    dispatch();return true;
  }

  function pinCurrent(){
    if(!current)return false;
    const source=sourceCandidates.find((c)=>String(c.id)===String(current.id))??current;
    return acquireCandidate(source,{pinned:true});
  }

  function clearReferences(){
    acquired=[];rebuild(lastCursor,lastPointer);return true;
  }

  function onPointerMove(event){
    if(!active)return;
    lastPointer=event;
    const candidates=context()?.snapCandidatesAtEvent?.(event)??[];
    sourceCandidates=Array.isArray(candidates)?candidates.map(clone):[];
    const cursor=pointerWorldPoint(event);
    rebuild(cursor,event);
  }

  function onKeyDown(event){
    if(!active||isTextTarget(event.target))return;
    if(event.key==="Tab"&&rankedCandidates.length>1){
      event.preventDefault();event.stopPropagation();
      cycle(event.shiftKey?-1:1);return;
    }
    if((event.key==="p"||event.key==="P")&&current){
      event.preventDefault();pinCurrent();return;
    }
    if(event.key==="Escape"&&acquired.length){
      event.preventDefault();clearReferences();
    }
  }

  async function install(){
    if(installed)return;installed=true;
    try{snap=await import(SNAP_ENGINE_URL);}catch(error){console.error("Snap Tracking runtime failed to load",error);return;}
    ensureHud();
    canvas()?.addEventListener("pointermove",onPointerMove,true);
    window.addEventListener("tubebender-tolerance-change",()=>{if(active)rebuild(lastCursor,lastPointer);});
    window.addEventListener("keydown",onKeyDown,true);
    window.TubeBenderSnapTracking=Object.freeze({
      startCommand,endCommand,setCandidates,setTrackingModes,setSnapOptions,cycle,pinCurrent,clearReferences,
      acquireCurrent:()=>current?acquireCandidate(current):false,
      currentCandidate:()=>current?clone(current):null,
      candidates:()=>rankedCandidates.map(clone),
      references:()=>acquired.map((r)=>({candidate:clone(r.candidate),pinned:r.pinned===true})),
      state:()=>({active,command:commandName,modes:{...modes},snapOptions:{...snapOptions}})
    });
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();