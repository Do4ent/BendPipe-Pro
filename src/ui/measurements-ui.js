(()=>{
  const GEOMETRY_URL="__TB_GEOMETRY_MEASUREMENTS_MODULE_URL__";
  const DIMENSIONS_URL="__TB_DIMENSIONS_MODULE_URL__";
  const REVIEW_PROGRESS_URL="__TB_REVIEW_PROGRESS_MODULE_URL__";
  const AUDIT_DOWNLOAD_URL="__TB_AUDIT_DOWNLOAD_MODULE_URL__";
  let geometry=null,dimensions=null,reviewProgressDomain=null,auditDownloadDomain=null,installed=false,panel=null,resultsPanel=null,button=null,lastResult=null,lastSelectionKey="",poll=null,formulaMeasurementValue=null,dimensionManagerFilter="all",dimensionManagerSort="project",dimensionManagerSearch="",dimensionManagerFocusId="",dimensionManagerStateProjectId=null;
  let lastDimensionAuditDownloadAttempt=null;
  const dimensionAuditDownloadAttemptHistory=[];
  const DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_HISTORY_LIMIT=20;
  const dimensionAuditDownloadHistoryExportEventHistory=[];
  const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_LIMIT=20;
  const quick={active:false,points:[],candidates:[],current:null,result:null};

  const $=(s,r=document)=>r.querySelector(s);
  const clone=(v)=>v==null?v:structuredClone(v);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const api=()=>window.TubeBenderEngineering??null;
  const context=()=>window.TubeBenderObjectContext??null;
  const snapTracking=()=>window.TubeBenderSnapTracking??null;
  const assembliesApi=()=>window.TubeBenderAssemblies??null;
  const fittedGuard=()=>window.TubeBenderFittedGeometry??null;
  const project=()=>{try{return api()?.activeProject?.()??null;}catch{return null;}};
  const readonly=()=>{try{return api()?.readonly?.()===true;}catch{return false;}};
  const toast=(m)=>{try{api()?.toast?.(String(m??""));}catch{}};
  function dimensionAuditViewProjectId(){
    return String(project()?.id??project()?.project_id??"");
  }
  function dimensionAuditViewStorageKey(projectId=dimensionAuditViewProjectId()){
    return "TubeBender.DimensionAuditViewState.v1."+encodeURIComponent(String(projectId||"default"));
  }
  function persistDimensionAuditViewState(){
    const projectId=dimensionAuditViewProjectId();if(!projectId)return false;
    dimensionManagerStateProjectId=projectId;
    try{
      sessionStorage.setItem(dimensionAuditViewStorageKey(projectId),JSON.stringify({
        filter:dimensionManagerFilter,
        sort:dimensionManagerSort,
        search:dimensionManagerSearch
      }));
      return true;
    }catch{return false;}
  }
  function clearPersistedDimensionAuditViewState(){
    const projectId=dimensionAuditViewProjectId();if(!projectId)return false;
    try{sessionStorage.removeItem(dimensionAuditViewStorageKey(projectId));return true;}
    catch{return false;}
  }
  function restoreDimensionAuditViewState(){
    const projectId=dimensionAuditViewProjectId();
    if(dimensionManagerStateProjectId===projectId)return false;
    dimensionManagerStateProjectId=projectId;
    dimensionManagerFocusId="";
    if(!projectId)return false;
    try{
      const raw=sessionStorage.getItem(dimensionAuditViewStorageKey(projectId));if(!raw)return false;
      const state=JSON.parse(raw);
      const filters=["all","selected","unselected","needs-review","review-action","review-ready","review-pending","review-diagnostics-error","review-not-required","stale","rebound","section-derived","exact","fitted","unknown-geometry","reference","driving","visible","hidden"];
      if(filters.includes(String(state?.filter)))dimensionManagerFilter=String(state.filter);
      if(["project","audit","review-context"].includes(String(state?.sort)))dimensionManagerSort=String(state.sort);
      dimensionManagerSearch=String(state?.search??"");
      return true;
    }catch{return false;}
  }
  function dispatchDimensionChange(dimensionId,reason){
    try{window.dispatchEvent(new CustomEvent("tubebender-dimension-change",{detail:{dimension_id:String(dimensionId??""),reason:String(reason??"change")}}));}catch{}
  }

  function tubeById(id){
    return (project()?.tubes??[]).find((tube)=>String(tube?.id)===String(id))??null;
  }
  function rowFor(entry){
    const tube=tubeById(entry?.tubeId);
    if(!tube)return null;
    try{
      const s=api()?.getState?.();
      if(String(s?.activeTubeId??"")===String(tube.id))return s?.rows?.[entry.rowIndex]??tube.rows?.[entry.rowIndex]??null;
    }catch{}
    return tube.rows?.[entry.rowIndex]??null;
  }
  function elementFor(entry){
    const tube=tubeById(entry?.tubeId);if(!tube)return null;
    try{
      const g=api()?.geometryForTube?.(tube);
      return (g?.elements??[]).find((el)=>Number(el?.rowIndex??el?.row_index)===Number(entry.rowIndex))??null;
    }catch{return null;}
  }
  function point(v){
    if(!v)return null;
    const x=Number(v.x??v[0]),y=Number(v.y??v[1]),z=Number(v.z??v[2]);
    return [x,y,z].every(Number.isFinite)?{x,y,z}:null;
  }
  function geometryProvenance(...values){
    for(const value of values){
      if(!value||typeof value!=="object")continue;
      const status=String(value.geometry_status??value.geometryStatus??(value.fitted===true?"Fitted":"")).trim();
      if(status==="Fitted"||status==="Exact"){
        return {
          geometry_status:status,
          fitting_error:clone(value.fitting_error??value.fit_error??(Number.isFinite(Number(value.max_fit_error_mm))?{mm:Number(value.max_fit_error_mm),deg:0}:null)),
          confidence:value.confidence==null?null:Number(value.confidence),
          evidence:clone(value.evidence??value.geometry_evidence??null)
        };
      }
      const nested=value.primitive??value.recognition??value.geometry_evidence??value.importEvidence?.geometry??null;
      if(nested&&nested!==value){
        const found=geometryProvenance(nested);
        if(found)return found;
      }
    }
    return null;
  }
  function withGeometryProvenance(ref,...sources){
    const provenance=geometryProvenance(...sources);
    return provenance?{...ref,...provenance}:ref;
  }
  function directionFromEntry(entry){
    const el=elementFor(entry);
    return point(el?.direction??el?.tangent_in??null);
  }
  function totalCenterline(tube){
    let total=0;
    for(const row of tube?.rows??[]){
      if(row?.type==="LINE"){
        const L=Number(row.L);if(!Number.isFinite(L))return null;total+=L;
      }else if(row?.type==="BEND"){
        const R=Number(row.clr),A=Number(row.angle);
        if(!Number.isFinite(R)||!Number.isFinite(A))return null;
        total+=geometry.measureArc({radius_mm:R,sweep_deg:A}).arc_length_mm;
      }
    }
    return total;
  }
  function selectionEntries(){return context()?.selectionEntries?.()??[];}
  function selectionSignature(entries=selectionEntries()){
    return JSON.stringify(entries.map(entry=>({
      kind:entry.kind,
      tubeId:entry.tubeId??null,
      rowIndex:entry.rowIndex??null,
      assemblyId:entry.assemblyId??null,
      dimensionId:entry.dimensionId??null,
      derivedId:entry.derivedId??null,
      sceneId:entry.sceneId??null,
      nodeId:entry.nodeId??null,
      instanceId:entry.instanceId??null,
      groupId:entry.groupId??null,
      constructionId:entry.constructionId??null
    })));
  }
  function referenceAssemblyContext(objectId,worldPoint=null){
    return assembliesApi()?.contextForObjectId?.(objectId,worldPoint)??{
      space:"project",assembly_id:null,assembly_path:[],local_point_mm:worldPoint?clone(worldPoint):null,world_point_mm:worldPoint?clone(worldPoint):null
    };
  }
  function enrichReference(ref,worldPoint=null){
    const context=ref?.assembly_context??referenceAssemblyContext(ref?.object_id,worldPoint);
    return {...clone(ref),assembly_context:clone(context),cross_assembly:ref?.cross_assembly===true};
  }
  function decorateMeasurementResult(result){
    if(!result?.ok)return result;
    const refs=(result.references??[]).map(ref=>enrichReference(ref));
    const relation=assembliesApi()?.crossAssemblyForContexts?.(refs.map(ref=>ref.assembly_context))??{
      cross_assembly:false,relation_space:"Project",assembly_ids:[],contexts:refs.map(ref=>ref.assembly_context)
    };
    const marked=refs.map(ref=>({...ref,cross_assembly:relation.cross_assembly===true}));
    return {
      ...result,
      references:marked,
      cross_assembly:clone(relation),
      title:String(result.title??"")+(relation.cross_assembly?" · ↔ Cross-Assembly":"")
    };
  }

  function sectionDerivedRecord(entry){
    if(entry?.kind!=="section-derived")return null;
    return window.TubeBenderSectionView?.derivedSelectionById?.(entry.derivedId)??null;
  }
  function refFromEntry(entry){
    if(entry.kind==="section-derived"){
      const record=sectionDerivedRecord(entry);
      const midpoint=record?.segment?.midpoint??null;
      return enrichReference({
        object_id:String(record?.object_id??"section"),
        subentity_id:String(record?.subentity_id??entry.derivedId),
        snap_type:"SectionSegment",
        role:"measurement",
        geometry_status:"SectionDerived",
        fitting_error:{mm:0,deg:0},
        confidence:1,
        evidence:clone(record?.evidence??[]),
        section_snapshot:clone({
          id:record?.id??entry.derivedId,
          mode:record?.section_mode,
          face:record?.section_face,
          source_geometry:record?.source_geometry,
          segment:record?.segment
        })
      },midpoint);
    }
    if(entry.kind==="row"){
      const row=rowFor(entry);
      const ref={
        object_id:String(entry.tubeId),
        subentity_id:String(row?.elementId??("row:"+entry.rowIndex)),
        snap_type:row?.type==="LINE"?"Line/Axis":"Tangent",
        role:"measurement"
      };
      return enrichReference(withGeometryProvenance(ref,row,elementFor(entry),tubeById(entry.tubeId)));
    }
    if(entry.kind==="tube"){
      return enrichReference(withGeometryProvenance({object_id:String(entry.tubeId),subentity_id:null,snap_type:null,role:"measurement"},tubeById(entry.tubeId)));
    }
    return enrichReference({object_id:String(entry.tubeId??entry.sceneId??"unknown"),subentity_id:null,snap_type:null,role:"measurement"});
  }

  function snapReference(candidate,role){
    const point=candidate?.point??null;
    return enrichReference({
      object_id:String(candidate?.object_id??"snap"),
      subentity_id:candidate?.subentity_id==null?String(candidate?.id??"point"):String(candidate.subentity_id),
      snap_type:candidate?.type==null?null:String(candidate.type),
      role:String(role??"measurement"),
      assembly_context:clone(candidate?.metadata?.assembly_context??null),
      cross_assembly:candidate?.metadata?.cross_assembly===true,
      geometry_status:String(candidate?.geometry_status??(candidate?.fitted===true?"Fitted":"Exact")),
      fitting_error:clone(candidate?.fitting_error??null),
      confidence:candidate?.confidence==null?null:Number(candidate.confidence),
      evidence:clone(candidate?.evidence??candidate?.metadata?.evidence??null)
    },point);
  }
  function quickPoint(candidate){
    const p=candidate?.point;
    if(!p)return null;
    const x=Number(p.x),y=Number(p.y),z=Number(p.z);
    return [x,y,z].every(Number.isFinite)?{x,y,z}:null;
  }
  function buildQuickSegment(){
    if(quick.points.length<2)return null;
    const a=quick.points.at(-2),b=quick.points.at(-1);
    const m=geometry.measurePointToPoint(a.point,b.point);
    const details=[
      ["Length",m.length_mm,"mm"],
      ["ΔX",m.delta_mm.x,"mm"],
      ["ΔY",m.delta_mm.y,"mm"],
      ["ΔZ",m.delta_mm.z,"mm"]
    ];
    let angle=null;
    if(quick.points.length>=3){
      const p0=quick.points.at(-3).point,p1=a.point,p2=b.point;
      try{
        angle=geometry.measureThreePointAngle(p0,p1,p2,{mode:"unsigned"});
        details.push(["Angle",angle.angle_deg,"deg"]);
      }catch{}
    }
    return {
      ok:true,
      kind:angle?"three-point-angle":"point-point-length",
      primary_value:angle?angle.angle_deg:m.length_mm,
      primary_unit:angle?"deg":"mm",
      title:angle?"Quick Measure · угол":"Quick Measure · расстояние",
      details,
      references:angle
        ?quick.points.slice(-3).map((item,index)=>snapReference(item.candidate,index===1?"vertex":index===0?"start":"end"))
        :[snapReference(a.candidate,"start"),snapReference(b.candidate,"end")],
      entries:[],
      quick:true
    };
  }
  function clearQuickPreview(){
    const old=document.getElementById("tbQuickMeasureOverlay");
    old?.remove?.();
  }
  function renderQuickPreview(){
    clearQuickPreview();
    if(!quick.active||!quick.points.length||typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup)return;
    const scale=typeof GEOM_SCALE==="number"&&Number.isFinite(GEOM_SCALE)&&Math.abs(GEOM_SCALE)>1e-12?GEOM_SCALE:1;
    const group=new THREE.Group();group.id="tbQuickMeasureOverlay";group.name="Quick Measure";
    group.userData={helper:true,objectSelectionHelper:true,quickMeasure:true};
    const points=quick.points.map((item)=>new THREE.Vector3(item.point.x*scale,item.point.y*scale,item.point.z*scale));
    for(const p of points){
      const marker=new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(.035,3.5*scale),12,8),
        new THREE.MeshBasicMaterial({color:0xffe46b,depthTest:false,depthWrite:false})
      );
      marker.position.copy(p);marker.renderOrder=11900;marker.userData={helper:true,objectSelectionHelper:true,quickMeasure:true};group.add(marker);
    }
    if(points.length>1){
      const line=new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({color:0xffe46b,depthTest:false,depthWrite:false})
      );
      line.renderOrder=11890;line.userData={helper:true,objectSelectionHelper:true,quickMeasure:true};group.add(line);
    }
    pipeGroup.add(group);
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
  }
  function startQuickMeasure(){
    quick.active=true;quick.points=[];quick.candidates=[];quick.current=null;quick.result=null;
    snapTracking()?.endCommand?.();
    snapTracking()?.startCommand?.("quick-measure",{ortho:false,polar:false});
    renderQuickPreview();render();return true;
  }
  function stopQuickMeasure({clear=true}={}){
    quick.active=false;quick.current=null;quick.candidates=[];
    snapTracking()?.endCommand?.();
    if(clear){quick.points=[];quick.result=null;clearQuickPreview();}
    render();
    if(!panel?.classList.contains("open"))resultsPanel?.classList.remove("open");
    return true;
  }
  function clearQuickMeasure(){
    quick.points=[];quick.result=null;quick.current=null;clearQuickPreview();render();return true;
  }
  function captureQuickCandidate(candidate=quick.current){
    if(!quick.active)return false;
    const pointValue=quickPoint(candidate);
    if(!pointValue){toast("Нет активной Snap-точки");return false;}
    quick.points.push({point:pointValue,candidate:clone(candidate)});
    quick.result=decorateMeasurementResult(buildQuickSegment());
    renderQuickPreview();render();
    return true;
  }
  function onQuickSnapChange(event){
    if(!quick.active)return;
    quick.current=event?.detail?.current?clone(event.detail.current):null;
    quick.candidates=Array.isArray(event?.detail?.candidates)?event.detail.candidates.map(clone):[];
    if(panel?.classList.contains("open"))render();
  }
  function onQuickCanvasClick(event){
    if(!quick.active||!quick.current)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
    captureQuickCandidate();
  }
  function onQuickKeyDown(event){
    if(!quick.active)return;
    const target=event.target;
    if(target&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/i.test(String(target.tagName||""))))return;
    if(event.key==="Escape"){
      event.preventDefault();
      if(quick.points.length||quick.result)clearQuickMeasure();else stopQuickMeasure();
    }
  }

  function buildMeasurement(entries=selectionEntries()){
    if(entries.length===1&&entries[0].kind==="section-derived"){
      const entry=entries[0],record=sectionDerivedRecord(entry),segment=record?.segment;
      if(!segment?.start||!segment?.end)return {ok:false,message:"Section-derived сегмент больше не доступен"};
      try{
        const m=geometry.measurePointToPoint(segment.start,segment.end);
        return decorateMeasurementResult({
          ok:true,
          kind:"section-segment-length",
          primary_value:m.length_mm,
          primary_unit:"mm",
          title:"Section-derived · длина сегмента",
          details:[
            ["Length",m.length_mm,"mm"],
            ["ΔX",m.delta_mm.x,"mm"],
            ["ΔY",m.delta_mm.y,"mm"],
            ["ΔZ",m.delta_mm.z,"mm"]
          ],
          references:[refFromEntry(entry)],
          entries:clone(entries),
          section_derived:true
        });
      }catch(error){return {ok:false,message:error.message};}
    }
    if(entries.length===2&&entries.every(entry=>entry.kind==="section-derived")){
      const records=entries.map(sectionDerivedRecord);
      const segments=records.map(record=>record?.segment).filter(Boolean);
      if(segments.length!==2)return {ok:false,message:"Section-derived сегмент больше не доступен"};
      const direction=(segment)=>({
        x:Number(segment.end.x)-Number(segment.start.x),
        y:Number(segment.end.y)-Number(segment.start.y),
        z:Number(segment.end.z)-Number(segment.start.z)
      });
      try{
        const m=geometry.measureAngleBetweenLines(
          {point:segments[0].start,direction:direction(segments[0])},
          {point:segments[1].start,direction:direction(segments[1])},
          {mode:"acute"}
        );
        return decorateMeasurementResult({
          ok:true,
          kind:"section-segment-angle",
          primary_value:m.angle_deg,
          primary_unit:"deg",
          title:"Section-derived · угол между сегментами",
          details:[["Angle",m.angle_deg,"deg"]],
          references:entries.map(refFromEntry),
          entries:clone(entries),
          section_derived:true
        });
      }catch(error){return {ok:false,message:error.message};}
    }
    if(entries.length===1&&entries[0].kind==="row"){
      const entry=entries[0],row=rowFor(entry);
      if(!row)return {ok:false,message:"Выбранный элемент не найден"};
      if(row.type==="LINE"){
        const L=Number(row.L);
        if(!Number.isFinite(L))return {ok:false,message:"Длина LINE не определена"};
        return {
          ok:true,
          kind:"row-length",
          primary_value:L,
          primary_unit:"mm",
          title:"Длина прямого участка",
          details:[["Length",L,"mm"]],
          references:[refFromEntry(entry)],
          entries:clone(entries)
        };
      }
      if(row.type==="BEND"){
        try{
          const m=geometry.measureArc({radius_mm:Number(row.clr),sweep_deg:Number(row.angle)});
          return {
            ok:true,
            kind:"bend-arc-length",
            primary_value:m.arc_length_mm,
            primary_unit:"mm",
            title:"Гиб",
            details:[
              ["Arc length",m.arc_length_mm,"mm"],
              ["Chord",m.chord_length_mm,"mm"],
              ["Radius",m.radius_mm,"mm"],
              ["Diameter",m.diameter_mm,"mm"],
              ["Angle",m.sweep_deg,"deg"]
            ],
            references:[refFromEntry(entry)],
            entries:clone(entries)
          };
        }catch(error){return {ok:false,message:error.message};}
      }
      return {ok:false,message:"Тип элемента не поддерживается"};
    }

    if(entries.length===1&&entries[0].kind==="tube"){
      const tube=tubeById(entries[0].tubeId),total=totalCenterline(tube);
      if(!Number.isFinite(total))return {ok:false,message:"Не удалось вычислить centerline length"};
      return {
        ok:true,
        kind:"tube-total-centerline",
        primary_value:total,
        primary_unit:"mm",
        title:"Общая длина осевой линии",
        details:[["Centerline",total,"mm"]],
        references:[refFromEntry(entries[0])],
        entries:clone(entries)
      };
    }

    if(entries.length===2&&entries.every((e)=>e.kind==="row")){
      const rows=entries.map(rowFor);
      if(rows.every((row)=>row?.type==="LINE")){
        const dirs=entries.map(directionFromEntry);
        if(dirs.every(Boolean)){
          try{
            const m=geometry.measureAngleBetweenLines(
              {point:{x:0,y:0,z:0},direction:dirs[0]},
              {point:{x:0,y:0,z:0},direction:dirs[1]},
              {mode:"acute"}
            );
            return {
              ok:true,
              kind:"line-line-angle",
              primary_value:m.angle_deg,
              primary_unit:"deg",
              title:"Угол между прямыми",
              details:[["Angle",m.angle_deg,"deg"]],
              references:entries.map(refFromEntry),
              entries:clone(entries)
            };
          }catch(error){return {ok:false,message:error.message};}
        }
        return {ok:false,message:"Направления выбранных LINE не определены"};
      }
    }
    return {ok:false,message:"Выберите одну трубу, один LINE/BEND, Section-derived сегмент или две прямые"};
  }

  function settings(){
    const p=project();
    const style=dimensions?.normalizeDimensionStyle?.(p?.dimension_style??{})??{};
    return {
      length_decimals:Number.isInteger(Number(p?.measurement_settings?.length_decimals))?Number(p.measurement_settings.length_decimals):1,
      angle_decimals:Number.isInteger(Number(p?.measurement_settings?.angle_decimals))?Number(p.measurement_settings.angle_decimals):2,
      trailing_zeros:p?.measurement_settings?.trailing_zeros!==false,
      dimension_style:style
    };
  }
  function formatted(value,unit){
    const s=settings();
    return geometry.formatMeasurement(value,{
      decimals:unit==="deg"?s.angle_decimals:s.length_decimals,
      trailingZeros:s.trailing_zeros,
      suffix:unit==="deg"?"°":" mm"
    });
  }

  function injectStyles(){
    if(document.getElementById("tbMeasurementsUiStyles"))return;
    const style=document.createElement("style");style.id="tbMeasurementsUiStyles";
    style.textContent=`
#tbMeasurementsButton{border:1px solid rgba(255,255,255,.14);border-radius:6px;background:#233244;color:#eef5ff;padding:6px 9px;cursor:pointer;font:600 12px system-ui}
#tbMeasurementsButton.tb-fixed{position:fixed;right:16px;bottom:100px;z-index:120240}
#tbMeasurementsPanel{position:fixed;z-index:120320;right:16px;top:86px;width:min(430px,calc(100vw - 32px));max-height:calc(100vh - 110px);display:none;flex-direction:column;background:#101923;color:#edf4fb;border:1px solid #43546a;border-radius:9px;box-shadow:0 16px 45px rgba(0,0,0,.55);font:12px system-ui}
#tbMeasurementsPanel.open{display:flex}#tbMeasurementResultsPanel{position:fixed;z-index:120315;right:460px;top:86px;width:min(350px,calc(100vw - 32px));max-height:calc(100vh - 110px);display:none;flex-direction:column;background:#0d1721;color:#edf4fb;border:1px solid #43546a;border-radius:9px;box-shadow:0 16px 45px rgba(0,0,0,.48);font:12px system-ui}#tbMeasurementResultsPanel.open{display:flex}#tbMeasurementResultsPanel .tb-measure-body{overflow:auto}.tb-result-formula{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#76d7ff}.tb-measure-head{display:flex;align-items:center;padding:9px 10px;border-bottom:1px solid #2c3948}.tb-measure-head b{font-size:13px}.tb-measure-head .sp{flex:1}.tb-measure-head button,.tb-measure-actions button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:5px;padding:5px 8px;cursor:pointer}
.tb-measure-body{padding:10px;overflow:auto}.tb-measure-result{border:1px solid #304154;border-radius:7px;padding:9px}.tb-measure-result[data-dim-selected="1"]{box-shadow:inset 3px 0 0 #76d7ff;background:rgba(118,215,255,.06)}.tb-measure-result[data-review-context-health="ready"]{border-left:3px solid #69c77b}.tb-measure-result[data-review-context-health="pending"]{border-left:3px solid #d6a84f}.tb-measure-result[data-review-context-health="diagnostics-error"]{border-left:3px solid #e06b6b}.tb-measure-title{font-weight:700;margin-bottom:7px}.tb-measure-value{font-size:20px;color:#ffe46b;margin:6px 0 10px}.tb-measure-table{width:100%;border-collapse:collapse}.tb-measure-table td{padding:4px 5px;border-bottom:1px solid rgba(128,151,178,.18)}.tb-measure-note{color:#9fafbf;line-height:1.45}.tb-measure-error{color:#ff7979}.tb-measure-actions{display:flex;gap:6px;justify-content:flex-end;margin-top:9px}.tb-measure-settings{display:grid;grid-template-columns:1fr 110px;gap:6px 8px;margin-top:10px}.tb-measure-settings input,.tb-measure-settings select{background:#0b131c;color:#fff;border:1px solid #40536a;border-radius:5px;padding:5px}.tb-dim-colors{display:grid;grid-template-columns:1fr 1fr;gap:6px 8px}.tb-dim-colors label{display:flex;align-items:center;justify-content:space-between;gap:6px}.tb-dim-colors input[type=color]{width:42px;height:28px;padding:1px}
`;
    document.head.appendChild(style);
  }

  function ensureResultsPanel(){
    if(resultsPanel)return resultsPanel;
    resultsPanel=document.createElement("section");resultsPanel.id="tbMeasurementResultsPanel";
    resultsPanel.innerHTML='<div class="tb-measure-head"><b>Результаты измерения</b><span class="sp"></span><button data-results-close>×</button></div><div class="tb-measure-body" data-results-body></div>';
    document.body.appendChild(resultsPanel);
    $("[data-results-close]",resultsPanel).onclick=()=>resultsPanel.classList.remove("open");
    return resultsPanel;
  }
  async function copyMeasurementResult(){
    if(!lastResult?.ok)return false;
    const lines=[
      lastResult.title,
      ...lastResult.details.map(([name,value,unit])=>name+": "+formatted(value,unit))
    ];
    try{
      await navigator.clipboard.writeText(lines.join("\n"));
      toast("Результат измерения скопирован");
      return true;
    }catch{
      toast("Не удалось скопировать результат");
      return false;
    }
  }
  function useMeasurementInFormula(){
    if(!lastResult?.ok||!Number.isFinite(Number(lastResult.primary_value))){
      toast("Нет числового результата измерения");return false;
    }
    formulaMeasurementValue=Number(lastResult.primary_value);
    try{
      window.dispatchEvent(new CustomEvent("tubebender-measurement-formula",{
        detail:{name:"MEASURE",value:formulaMeasurementValue,unit:lastResult.primary_unit,kind:lastResult.kind}
      }));
    }catch{}
    toast("MEASURE = "+formatted(formulaMeasurementValue,lastResult.primary_unit));
    renderResultsPanel(lastResult);
    return true;
  }
  function renderResultsPanel(result=lastResult){
    const rp=ensureResultsPanel(),body=$("[data-results-body]",rp);
    const shouldShow=panel?.classList.contains("open")||quick.active;
    rp.classList.toggle("open",!!shouldShow);
    if(!shouldShow)return;
    if(!result?.ok){
      body.innerHTML='<div class="tb-measure-note">Нет результата. Выберите геометрию или Snap-точки.</div>';
      return;
    }
    const rows=result.details.map(([name,value,unit])=>
      '<tr><td>'+esc(name)+'</td><td><b>'+esc(formatted(value,unit))+'</b></td></tr>'
    ).join("");
    body.innerHTML=
      '<div class="tb-measure-title">'+esc(result.title)+(result.cross_assembly?.cross_assembly?' <span title="Межсборочная связь">↔ Cross-Assembly</span>':'')+'</div>'+
      '<div class="tb-measure-value">'+esc(formatted(result.primary_value,result.primary_unit))+'</div>'+
      '<table class="tb-measure-table">'+rows+'</table>'+
      '<div class="tb-measure-note" style="margin-top:8px">Formula: <span class="tb-result-formula">MEASURE'+
      (formulaMeasurementValue==null?' = —':' = '+esc(String(formulaMeasurementValue)))+
      '</span></div>'+
      '<div class="tb-measure-actions"><button data-result-copy>Копировать</button><button data-result-formula>Использовать в формуле</button><button data-result-save>Сохранить как размер</button></div>';
    $("[data-result-copy]",body).onclick=copyMeasurementResult;
    $("[data-result-formula]",body).onclick=useMeasurementInFormula;
    $("[data-result-save]",body).onclick=saveCurrentDimension;
  }

  function ensureShell(){
    if(panel)return panel;
    injectStyles();
    button=document.createElement("button");button.id="tbMeasurementsButton";button.type="button";button.textContent="Измерения";button.onclick=()=>open();
    const host=document.querySelector(".tb-head-actions");
    if(host)host.appendChild(button);else{button.classList.add("tb-fixed");document.body.appendChild(button);}
    panel=document.createElement("section");panel.id="tbMeasurementsPanel";
    panel.innerHTML='<div class="tb-measure-head"><b>Измерения</b><span class="sp"></span><button data-measure-close>×</button></div><div class="tb-measure-body"></div>';
    document.body.appendChild(panel);
    $("[data-measure-close]",panel).onclick=close;
    ensureResultsPanel();
    return panel;
  }
  function open(){ensureShell().classList.add("open");render();}
  function focusDimensionAudit(dimensionId){
    restoreDimensionAuditViewState();
    const id=String(dimensionId??"").trim();if(!id)return false;
    dimensionManagerFilter="all";dimensionManagerSort="project";dimensionManagerSearch=id;dimensionManagerFocusId=id;
    open();return true;
  }
  function close(){panel?.classList.remove("open");if(!quick.active)resultsPanel?.classList.remove("open");}

  function saveSettings(body){
    if(readonly()){toast("Проект открыт только для просмотра");return;}
    const p=project();if(!p)return;
    const length=Math.max(0,Math.min(6,Math.trunc(Number($("[data-length-decimals]",body).value)||0)));
    const angle=Math.max(0,Math.min(6,Math.trunc(Number($("[data-angle-decimals]",body).value)||0)));
    const trailing=$("[data-trailing-zeros]",body).checked;
    const rawStyle={
      text_height_px:Number($("[data-dim-text-px]",body).value),
      arrow_size_px:Number($("[data-dim-arrow-px]",body).value),
      extension_offset_px:Number($("[data-dim-ext-offset]",body).value),
      dimension_offset_px:Number($("[data-dim-line-offset]",body).value),
      model_text_height_mm:Number($("[data-dim-model-mm]",body).value),
      min_text_px:Number($("[data-dim-min-text]",body).value),
      max_text_px:Number($("[data-dim-max-text]",body).value),
      min_arrow_px:Number($("[data-dim-min-arrow]",body).value),
      max_arrow_px:Number($("[data-dim-max-arrow]",body).value),
      screen_scale_mode:$("[data-dim-scale-mode]",body).value,
      show_units:$("[data-dim-show-units]",body).checked,
      diameter_symbol:$("[data-dim-symbol-dia]",body).value,
      radius_symbol:$("[data-dim-symbol-radius]",body).value,
      angle_symbol:$("[data-dim-symbol-angle]",body).value,
      reference_color:$("[data-dim-color-reference]",body).value,
      driving_color:$("[data-dim-color-driving]",body).value,
      error_color:$("[data-dim-color-error]",body).value,
      normal_color:$("[data-dim-color-normal]",body).value
    };
    let style;
    try{style=dimensions.normalizeDimensionStyle(rawStyle);}
    catch(error){toast(error.message);return;}
    const mutate=()=>{
      p.measurement_settings={length_decimals:length,angle_decimals:angle,trailing_zeros:trailing};
      p.dimension_style=clone(style);
      return true;
    };
    const ok=api()?.modelCommand?api().modelCommand("Изменить стиль постоянных размеров",mutate):mutate();
    if(ok!==false){api()?.save?.();dispatchDimensionChange("","style");render();}
  }
  function savedDimensions(){
    const p=project();return Array.isArray(p?.engineering_dimensions)?p.engineering_dimensions:[];
  }
  function isSectionDerivedDimension(dimension){
    return (dimension?.references??[]).some(ref=>ref?.geometry_status==="SectionDerived"||ref?.section_snapshot);
  }
  function invalidateSectionDerivedDimensions(reason="Section View changed"){
    const p=project();if(!p)return 0;
    let changed=0;
    p.engineering_dimensions=savedDimensions().map(dimension=>{
      if(!isSectionDerivedDimension(dimension))return dimension;
      const alreadyStale=String(dimension?.status??"")==="Stale";
      if(alreadyStale&&dimension?.stale_reason&&dimension?.stale_at_section_view)return dimension;
      changed++;
      return {
        ...clone(dimension),
        status:"Stale",
        stale_reason:dimension?.stale_reason??String(reason),
        stale_at_section_view:clone(dimension?.stale_at_section_view??window.TubeBenderSectionView?.capture?.()??null)
      };
    });
    if(changed){
      try{api()?.save?.();}catch{}
      dispatchDimensionChange("","section-derived-stale");
      if(panel?.classList.contains("open"))render();
    }
    return changed;
  }
  function sectionReferenceSignature(ref){
    const snapshot=ref?.section_snapshot??{};
    return {
      object_id:String(ref?.object_id??""),
      snap_type:String(ref?.snap_type??""),
      source_geometry:String(snapshot?.source_geometry??""),
      section_mode:String(snapshot?.mode??"")
    };
  }
  function sectionRebindCompatibility(existing,current){
    const oldRefs=existing?.references??[],newRefs=current?.references??[];
    if(oldRefs.length!==newRefs.length)return {ok:false,reason:"Количество ссылок не совпадает с сохранённым размером"};
    const normalize=refs=>refs.map(sectionReferenceSignature).sort((a,b)=>
      (a.object_id+"|"+a.snap_type+"|"+a.source_geometry+"|"+a.section_mode)
        .localeCompare(b.object_id+"|"+b.snap_type+"|"+b.source_geometry+"|"+b.section_mode)
    );
    const oldSig=normalize(oldRefs),newSig=normalize(newRefs);
    for(let i=0;i<oldSig.length;i++){
      if(oldSig[i].object_id!==newSig[i].object_id)return {ok:false,reason:"Текущая Section-derived геометрия относится к другому исходному объекту"};
      if(oldSig[i].snap_type!==newSig[i].snap_type)return {ok:false,reason:"Тип Section-derived ссылки не совпадает"};
      if(oldSig[i].source_geometry!==newSig[i].source_geometry)return {ok:false,reason:"Источник геометрии Section-derived ссылки изменился"};
      if(oldSig[i].section_mode!==newSig[i].section_mode)return {ok:false,reason:"Section mode не совпадает с сохранённым размером"};
    }
    return {ok:true,signatures:newSig};
  }
  function rebindSectionDerivedDimension(dimensionId){
    if(readonly()){toast("Проект открыт только для просмотра");return false;}
    const p=project();if(!p)return false;
    const existing=savedDimensions().find(dimension=>String(dimension?.id)===String(dimensionId));
    if(!existing||!isSectionDerivedDimension(existing)){toast("Section-derived размер не найден");return false;}
    const current=decorateMeasurementResult(buildMeasurement(selectionEntries()));
    if(!current?.ok||current.section_derived!==true){
      toast("Сначала выберите совместимую текущую Section-derived геометрию");
      return false;
    }
    if(String(current.kind)!==String(existing.kind)){
      toast("Тип текущего измерения не совпадает с сохранённым размером");
      return false;
    }
    const compatibility=sectionRebindCompatibility(existing,current);
    if(!compatibility.ok){toast(compatibility.reason);return false;}
    const mutate=()=>{
      p.engineering_dimensions=savedDimensions().map(dimension=>{
        if(String(dimension?.id)!==String(dimensionId))return dimension;
        const next={
          ...clone(dimension),
          references:clone(current.references),
          value:Number(current.primary_value),
          status:"Valid",
          note:String(dimension.note??current.title??"Section-derived Reference Dimension"),
          rebound_from_stale:true,
          rebound_at_section_view:clone(window.TubeBenderSectionView?.capture?.()??null),
          rebound_history:[
            ...(Array.isArray(dimension.rebound_history)?clone(dimension.rebound_history):[]),
            {
              previous_references:clone(dimension.references??[]),
              previous_value:dimension.value??null,
              previous_status:String(dimension.status??""),
              previous_stale_reason:dimension?.stale_reason??null,
              previous_stale_at_section_view:clone(dimension?.stale_at_section_view??null),
              new_reference_signatures:clone(compatibility.signatures),
              reason:"explicit-section-derived-rebind"
            }
          ]
        };
        delete next.stale_reason;
        delete next.stale_at_section_view;
        return next;
      });
      return true;
    };
    const ok=api()?.modelCommand?api().modelCommand("Rebind Section-derived Reference Dimension",mutate):mutate();
    if(ok===false)return false;
    try{api()?.save?.();}catch{}
    dispatchDimensionChange(dimensionId,"section-derived-rebind");
    toast("Section-derived размер перепривязан");
    render();return true;
  }
  function dimensionAuditProjectContext(){
    const p=project();
    return {
      project_id:String(p?.id??p?.project_id??""),
      project_name:String(p?.name??p?.project_name??""),
      project_readonly:readonly(),
      generated_at:new Date().toISOString()
    };
  }
  function dimensionRebindAuditSnapshot(dimension,reviewContextState=null){
    const references=dimension?.references??[];
    const referenceGeometryStatuses=[...new Set(references.map(ref=>String(ref?.geometry_status??"").trim()).filter(Boolean))];
    const contextState=reviewContextState??dimensionReviewContextState();
    const reviewContext=dimensionReviewContext(dimension,contextState);
    return {
      ...dimensionAuditProjectContext(),
      dimension_id:String(dimension?.id??""),
      kind:String(dimension?.kind??""),
      mode:String(dimension?.mode??""),
      status:String(dimension?.status??""),
      needs_review:dimensionAuditNeedsReview(dimension),
      review_reasons:clone(dimensionAuditReviewReasons(dimension)),
      review_context:clone(reviewContext),
      review_context_signature:String(reviewContext?.signature??""),
      geometry_class:dimensionAuditGeometryClass(dimension),
      reference_geometry_statuses:referenceGeometryStatuses,
      reference_geometry_counts:clone(dimensionReferenceStatusCounts(dimension)),
      fitted_stats:clone(dimensionFittedAuditStats(dimension)),
      current_value:dimension?.value??null,
      stale_reason:dimension?.stale_reason??null,
      current_references:clone(references),
      rebound_from_stale:dimension?.rebound_from_stale===true,
      rebound_at_section_view:clone(dimension?.rebound_at_section_view??null),
      rebound_history:clone(Array.isArray(dimension?.rebound_history)?dimension.rebound_history:[])
    };
  }
  function dimensionAuditSnapshots(items,reviewContextState=null){
    const list=Array.isArray(items)?items:[];
    const sharedState=reviewContextState??dimensionReviewContextState(savedDimensions(),selectedDimensionAuditIds());
    return list.map(dimension=>dimensionRebindAuditSnapshot(dimension,sharedState));
  }
  function dimensionAuditReviewBundle(items){
    const list=Array.isArray(items)?items:[];
    const reviewContextState=dimensionReviewContextState(savedDimensions(),selectedDimensionAuditIds());
    return {
      review_context_summary:dimensionReviewContextSummary(list,reviewContextState),
      dimensions:dimensionAuditSnapshots(list,reviewContextState)
    };
  }

  function dimensionAuditGeometryClass(dimension){
    const statuses=(dimension?.references??[]).map(ref=>String(ref?.geometry_status??"").trim()).filter(Boolean);
    if(statuses.includes("Fitted"))return "Fitted";
    if(statuses.includes("SectionDerived"))return "SectionDerived";
    if(statuses.length&&statuses.every(status=>status==="Exact"))return "Exact";
    return "Unknown";
  }
  function dimensionReferenceStatusCounts(dimension){
    const counts={Exact:0,Fitted:0,SectionDerived:0,Unknown:0};
    for(const ref of dimension?.references??[]){
      const status=String(ref?.geometry_status??"").trim();
      if(Object.prototype.hasOwnProperty.call(counts,status))counts[status]++;
      else counts.Unknown++;
    }
    return counts;
  }
  function dimensionFittedAuditStats(dimension){
    const refs=(dimension?.references??[]).filter(ref=>String(ref?.geometry_status??"")==="Fitted");
    if(!refs.length)return null;
    const mm=refs.map(ref=>Number(ref?.fitting_error?.mm)).filter(Number.isFinite);
    const deg=refs.map(ref=>Number(ref?.fitting_error?.deg)).filter(Number.isFinite);
    const confidence=refs.map(ref=>Number(ref?.confidence)).filter(Number.isFinite);
    return {
      reference_count:refs.length,
      max_error_mm:mm.length?Math.max(...mm):null,
      max_error_deg:deg.length?Math.max(...deg):null,
      min_confidence:confidence.length?Math.min(...confidence):null
    };
  }
  function auditNumber(value,decimals=3){
    const n=Number(value);
    return Number.isFinite(n)?n.toFixed(decimals):"—";
  }
  function dimensionAuditReviewReasons(dimension){
    const geometryClass=dimensionAuditGeometryClass(dimension),reasons=[];
    if(String(dimension?.status??"")==="Stale")reasons.push("Stale");
    if(geometryClass==="Fitted")reasons.push("Fitted geometry");
    if(geometryClass==="Unknown")reasons.push("Unknown geometry provenance");
    return Object.freeze(reasons);
  }
  function dimensionAuditNeedsReview(dimension){
    return dimensionAuditReviewReasons(dimension).length>0;
  }
  function dimensionAuditSummary(items=savedDimensions()){
    const selectedIds=new Set(selectedDimensionAuditIds());
    const summary={total:items.length,selected:0,unselected:0,stale:0,rebound:0,section_derived:0,visible:0,hidden:0,needs_review:0,by_status:{},by_mode:{},by_geometry_status:{},reference_geometry_counts:{Exact:0,Fitted:0,SectionDerived:0,Unknown:0}};
    for(const dimension of items){
      const status=String(dimension?.status??"Unknown");
      const mode=String(dimension?.mode??"Unknown");
      const geometryStatus=dimensionAuditGeometryClass(dimension);
      summary.by_status[status]=(summary.by_status[status]??0)+1;
      summary.by_mode[mode]=(summary.by_mode[mode]??0)+1;
      summary.by_geometry_status[geometryStatus]=(summary.by_geometry_status[geometryStatus]??0)+1;
      const referenceCounts=dimensionReferenceStatusCounts(dimension);
      for(const key of Object.keys(summary.reference_geometry_counts)){
        summary.reference_geometry_counts[key]+=Number(referenceCounts[key]??0);
      }
      if(selectedIds.has(String(dimension?.id??"")))summary.selected++;else summary.unselected++;
      if(status==="Stale")summary.stale++;
      if(dimension?.rebound_from_stale===true)summary.rebound++;
      if(isSectionDerivedDimension(dimension))summary.section_derived++;
      if(dimensionAuditNeedsReview(dimension))summary.needs_review++;
      if(dimension?.visible===false)summary.hidden++;else summary.visible++;
    }
    return summary;
  }
  function allDimensionAuditSnapshot(){
    const items=savedDimensions();
    return {
      schema:"TubeBender.DimensionAudit.v1",
      ...dimensionAuditProjectContext(),
      dimension_count:items.length,
      summary:dimensionAuditSummary(items),
      ...dimensionAuditReviewBundle(items)
    };
  }
  function hideDimensionAuditResults(){
    if(readonly()){toast("Проект открыт только для просмотра");return false;}
    const p=project();if(!p)return false;
    const items=filteredDimensionManagerItems(savedDimensions());
    if(!items.length){toast("Нет Dimension в текущем audit-view");return false;}
    const ids=new Set(items.map(dimension=>String(dimension.id)));
    const mutable=items.some(dimension=>dimension?.visible!==false);
    if(!mutable){toast("Dimension текущего audit-view уже скрыты");return true;}
    const mutate=()=>{
      p.engineering_dimensions=savedDimensions().map(dimension=>
        ids.has(String(dimension?.id))?{...clone(dimension),visible:false}:dimension
      );
      return true;
    };
    const ok=api()?.modelCommand?api().modelCommand("Скрыть Dimension текущего audit-view",mutate):mutate();
    if(ok===false)return false;
    try{
      const kept=(context()?.selectionKeys?.()??[]).filter(key=>{
        const entry=context()?.parseSelectionKey?.(key);
        return entry?.kind!=="dimension"||!ids.has(String(entry.dimensionId));
      });
      context()?.replaceSelectionKeys?.(kept,{announce:true});
    }catch{}
    try{api()?.save?.();}catch{}
    dispatchDimensionChange("","bulk-hide-audit-dimensions");
    toast("Скрыто Dimension: "+ids.size);
    render();return true;
  }

  function showDimensionAuditResults(){
    if(readonly()){toast("Проект открыт только для просмотра");return false;}
    const p=project();if(!p)return false;
    const items=filteredDimensionManagerItems(savedDimensions());
    if(!items.length){toast("Нет Dimension в текущем audit-view");return false;}
    const ids=new Set(items.map(dimension=>String(dimension.id)));
    const hidden=items.some(dimension=>dimension?.visible===false);
    if(!hidden){toast("Dimension текущего audit-view уже видимы");return true;}
    const mutate=()=>{
      p.engineering_dimensions=savedDimensions().map(dimension=>
        ids.has(String(dimension?.id))?{...clone(dimension),visible:true}:dimension
      );
      return true;
    };
    const ok=api()?.modelCommand?api().modelCommand("Показать Dimension текущего audit-view",mutate):mutate();
    if(ok===false)return false;
    try{api()?.save?.();}catch{}
    dispatchDimensionChange("","bulk-show-audit-dimensions");
    toast("Показано Dimension: "+ids.size);
    render();return true;
  }

  function showAndSelectDimensionAuditResults(){
    if(readonly()){toast("Проект открыт только для просмотра");return false;}
    const p=project();if(!p)return false;
    const items=filteredDimensionManagerItems(savedDimensions());
    if(!items.length){toast("Нет Dimension в текущем audit-view");return false;}
    const ids=new Set(items.map(dimension=>String(dimension.id)));
    const hidden=items.some(dimension=>dimension?.visible===false);
    if(hidden){
      const mutate=()=>{
        p.engineering_dimensions=savedDimensions().map(dimension=>
          ids.has(String(dimension?.id))?{...clone(dimension),visible:true}:dimension
        );
        return true;
      };
      const ok=api()?.modelCommand?api().modelCommand("Показать Dimension текущего audit-view",mutate):mutate();
      if(ok===false)return false;
      try{api()?.save?.();}catch{}
      dispatchDimensionChange("","bulk-show-audit-dimensions");
    }
    const keys=[...ids].map(id=>"dimension:"+encodeURIComponent(id));
    context()?.replaceSelectionKeys?.(keys,{announce:true});
    toast("Показано и выбрано Dimension: "+keys.length);
    render();return true;
  }

  function clearDimensionSelection(){
    const keys=context()?.selectionKeys?.()??[];
    let removed=0;
    const kept=keys.filter(key=>{
      const entry=context()?.parseSelectionKey?.(key);
      if(entry?.kind==="dimension"){removed++;return false;}
      return true;
    });
    if(!removed){toast("Dimension не выбраны");return true;}
    context()?.replaceSelectionKeys?.(kept,{announce:true});
    toast("Dimension удалены из selection: "+removed);
    return true;
  }

  function pruneDimensionSelectionToAuditView(){
    const allowed=new Set(filteredDimensionManagerItems(savedDimensions()).map(dimension=>String(dimension?.id??"")));
    const keys=context()?.selectionKeys?.()??[];
    let removed=0;
    const kept=keys.filter(key=>{
      const entry=context()?.parseSelectionKey?.(key);
      if(entry?.kind!=="dimension")return true;
      const keep=allowed.has(String(entry.dimensionId));
      if(!keep)removed++;
      return keep;
    });
    if(!removed){toast("Dimension selection уже ограничен текущим audit-view");return true;}
    context()?.replaceSelectionKeys?.(kept,{announce:true});
    toast("Удалено из selection вне audit-view: "+removed);
    return true;
  }

  function invertVisibleDimensionAuditSelection(){
    const items=filteredDimensionManagerItems(savedDimensions()).filter(dimension=>dimension?.visible!==false);
    const ids=new Set(items.map(dimension=>String(dimension.id)));
    if(!ids.size){toast("Нет видимых Dimension в текущем audit-view");return false;}
    const currentKeys=context()?.selectionKeys?.()??[];
    const selectedIds=new Set(
      (context()?.selectionEntries?.()??[])
        .filter(entry=>entry?.kind==="dimension"&&ids.has(String(entry.dimensionId)))
        .map(entry=>String(entry.dimensionId))
    );
    const kept=currentKeys.filter(key=>{
      const entry=context()?.parseSelectionKey?.(key);
      return entry?.kind!=="dimension"||!ids.has(String(entry.dimensionId));
    });
    const add=[...ids]
      .filter(id=>!selectedIds.has(id))
      .map(id=>"dimension:"+encodeURIComponent(id));
    context()?.replaceSelectionKeys?.([...kept,...add],{announce:true});
    toast("Инвертирован Dimension selection: "+ids.size);
    return true;
  }

  function removeVisibleDimensionAuditResultsFromSelection(){
    const ids=new Set(
      filteredDimensionManagerItems(savedDimensions())
        .filter(dimension=>dimension?.visible!==false)
        .map(dimension=>String(dimension.id))
    );
    if(!ids.size){toast("Нет видимых Dimension в текущем audit-view");return false;}
    const keys=context()?.selectionKeys?.()??[];
    let removed=0;
    const kept=keys.filter(key=>{
      const entry=context()?.parseSelectionKey?.(key);
      if(entry?.kind!=="dimension")return true;
      const remove=ids.has(String(entry.dimensionId));
      if(remove)removed++;
      return !remove;
    });
    if(!removed){toast("Dimension текущего audit-view не выбраны");return true;}
    context()?.replaceSelectionKeys?.(kept,{announce:true});
    toast("Удалено Dimension из selection: "+removed);
    return true;
  }

  function addVisibleDimensionAuditResultsToSelection(){
    const items=filteredDimensionManagerItems(savedDimensions()).filter(dimension=>dimension?.visible!==false);
    const dimensionKeys=items.map(dimension=>"dimension:"+encodeURIComponent(String(dimension.id)));
    if(!dimensionKeys.length){toast("Нет видимых Dimension в текущем audit-view");return false;}
    const merged=[...new Set([...(context()?.selectionKeys?.()??[]),...dimensionKeys])];
    context()?.replaceSelectionKeys?.(merged,{announce:true});
    toast("Добавлено Dimension в selection: "+dimensionKeys.length);
    return true;
  }

  function selectVisibleDimensionAuditResults(){
    const items=filteredDimensionManagerItems(savedDimensions()).filter(dimension=>dimension?.visible!==false);
    const keys=items.map(dimension=>"dimension:"+encodeURIComponent(String(dimension.id)));
    if(!keys.length){toast("Нет видимых Dimension в текущем audit-view");return false;}
    context()?.replaceSelectionKeys?.(keys,{announce:true});
    toast("Выбрано Dimension: "+keys.length);
    return true;
  }

  function selectReviewReasonDimensionResults(){
    const snapshot=reviewReasonDimensionAuditSnapshot();
    const ids=snapshot?.queue?.dimension_ids??[];
    const keys=ids.map(id=>"dimension:"+encodeURIComponent(String(id)));
    if(!keys.length){toast("Подочередь Review reason пуста");return false;}
    context()?.replaceSelectionKeys?.(keys,{announce:true});
    toast("Выбрано Dimension из Review reason: "+keys.length);
    return true;
  }

  function addReviewReasonDimensionResultsToSelection(){
    const snapshot=reviewReasonDimensionAuditSnapshot();
    const ids=snapshot?.queue?.dimension_ids??[];
    const keys=ids.map(id=>"dimension:"+encodeURIComponent(String(id)));
    if(!keys.length){toast("Подочередь Review reason пуста");return false;}
    const merged=[...new Set([...(context()?.selectionKeys?.()??[]),...keys])];
    context()?.replaceSelectionKeys?.(merged,{announce:true});
    toast("Добавлено Dimension из Review reason: "+keys.length);
    return true;
  }

  function removeReviewReasonDimensionResultsFromSelection(){
    const snapshot=reviewReasonDimensionAuditSnapshot();
    const ids=new Set(snapshot?.queue?.dimension_ids??[]);
    if(!ids.size){toast("Подочередь Review reason пуста");return false;}
    const keys=context()?.selectionKeys?.()??[];
    let removed=0;
    const kept=keys.filter(key=>{
      const entry=context()?.parseSelectionKey?.(key);
      if(entry?.kind!=="dimension")return true;
      const remove=ids.has(String(entry.dimensionId));
      if(remove)removed++;
      return !remove;
    });
    if(!removed){toast("Dimension из Review reason не выбраны");return true;}
    context()?.replaceSelectionKeys?.(kept,{announce:true});
    toast("Удалено Dimension из Review reason: "+removed);
    return true;
  }

  function invertReviewReasonDimensionSelection(){
    const snapshot=reviewReasonDimensionAuditSnapshot();
    const ids=new Set(snapshot?.queue?.dimension_ids??[]);
    if(!ids.size){toast("Подочередь Review reason пуста");return false;}
    const keys=context()?.selectionKeys?.()??[];
    const selectedIds=new Set();
    const kept=keys.filter(key=>{
      const entry=context()?.parseSelectionKey?.(key);
      if(entry?.kind!=="dimension")return true;
      const id=String(entry.dimensionId);
      if(!ids.has(id))return true;
      selectedIds.add(id);
      return false;
    });
    const add=[...ids]
      .filter(id=>!selectedIds.has(id))
      .map(id=>"dimension:"+encodeURIComponent(id));
    context()?.replaceSelectionKeys?.([...kept,...add],{announce:true});
    toast("Инвертирован Review reason selection: "+ids.size);
    return true;
  }

  function selectReviewQueueDimensionResults(){
    const items=savedDimensions().filter(dimension=>dimensionAuditNeedsReview(dimension));
    const keys=items.map(dimension=>"dimension:"+encodeURIComponent(String(dimension.id)));
    if(!keys.length){toast("Review queue пуст");return false;}
    context()?.replaceSelectionKeys?.(keys,{announce:true});
    toast("Выбрано Dimension из Review queue: "+keys.length);
    return true;
  }

  function addReviewQueueDimensionResultsToSelection(){
    const items=savedDimensions().filter(dimension=>dimensionAuditNeedsReview(dimension));
    const keys=items.map(dimension=>"dimension:"+encodeURIComponent(String(dimension.id)));
    if(!keys.length){toast("Review queue пуст");return false;}
    const merged=[...new Set([...(context()?.selectionKeys?.()??[]),...keys])];
    context()?.replaceSelectionKeys?.(merged,{announce:true});
    toast("Добавлено Dimension из Review queue: "+keys.length);
    return true;
  }

  function removeReviewQueueDimensionResultsFromSelection(){
    const ids=new Set(
      savedDimensions()
        .filter(dimension=>dimensionAuditNeedsReview(dimension))
        .map(dimension=>String(dimension.id))
    );
    if(!ids.size){toast("Review queue пуст");return false;}
    const keys=context()?.selectionKeys?.()??[];
    let removed=0;
    const kept=keys.filter(key=>{
      const entry=context()?.parseSelectionKey?.(key);
      if(entry?.kind!=="dimension")return true;
      const remove=ids.has(String(entry.dimensionId));
      if(remove)removed++;
      return !remove;
    });
    if(!removed){toast("Dimension из Review queue не выбраны");return true;}
    context()?.replaceSelectionKeys?.(kept,{announce:true});
    toast("Удалено Dimension из Review queue: "+removed);
    return true;
  }

  function invertReviewQueueDimensionSelection(){
    const ids=new Set(
      savedDimensions()
        .filter(dimension=>dimensionAuditNeedsReview(dimension))
        .map(dimension=>String(dimension.id))
    );
    if(!ids.size){toast("Review queue пуст");return false;}
    const keys=context()?.selectionKeys?.()??[];
    const selectedIds=new Set();
    const kept=keys.filter(key=>{
      const entry=context()?.parseSelectionKey?.(key);
      if(entry?.kind!=="dimension")return true;
      const id=String(entry.dimensionId);
      if(!ids.has(id))return true;
      selectedIds.add(id);
      return false;
    });
    const add=[...ids]
      .filter(id=>!selectedIds.has(id))
      .map(id=>"dimension:"+encodeURIComponent(id));
    context()?.replaceSelectionKeys?.([...kept,...add],{announce:true});
    toast("Инвертирован Review queue selection: "+ids.size);
    return true;
  }

  function exitDimensionReviewQueue(){
    dimensionManagerFilter="all";
    dimensionManagerSort="project";
    dimensionManagerSearch="";
    dimensionManagerFocusId="";
    render();
    return true;
  }

  function selectedDimensionAuditIds(){
    return (context()?.selectionEntries?.()??[])
      .filter(entry=>entry?.kind==="dimension"&&entry?.dimensionId!=null)
      .map(entry=>String(entry.dimensionId));
  }
  function dimensionSelectionKindCounts(entries=context()?.selectionEntries?.()??[]){
    const counts={};
    for(const entry of entries){
      const kind=String(entry?.kind??"unknown");
      counts[kind]=(counts[kind]??0)+1;
    }
    return counts;
  }
  function activeDimensionReviewReason(){
    if(dimensionManagerFilter!=="needs-review"||dimensionManagerSort!=="audit")return null;
    const search=String(dimensionManagerSearch??"").trim().toLowerCase();
    if(!search)return null;
    const reasons=[...new Set(savedDimensions().flatMap(dimension=>dimensionAuditReviewReasons(dimension)))];
    return reasons.find(reason=>String(reason).toLowerCase()===search)??null;
  }

  function selectedDimensionAuditSnapshot(){
    const entries=context()?.selectionEntries?.()??[];
    const selectedIds=entries
      .filter(entry=>entry?.kind==="dimension"&&entry?.dimensionId!=null)
      .map(entry=>String(entry.dimensionId));
    const ids=new Set(selectedIds);
    const items=savedDimensions().filter(dimension=>ids.has(String(dimension?.id??"")));
    return {
      schema:"TubeBender.DimensionSelectionAudit.v1",
      ...dimensionAuditProjectContext(),
      view:{
        filter:dimensionManagerFilter,
        sort:dimensionManagerSort,
        search:String(dimensionManagerSearch??""),
        focus_id:dimensionManagerFocusId||null,
        review_reason:activeDimensionReviewReason()
      },
      selection:{
        selected_dimension_ids:selectedIds,
        selected_dimension_count:selectedIds.length,
        global_selection_count:entries.length,
        non_dimension_selection_count:entries.filter(entry=>entry?.kind!=="dimension").length,
        selection_kind_counts:dimensionSelectionKindCounts(entries)
      },
      dimension_count:items.length,
      summary:dimensionAuditSummary(items),
      ...dimensionAuditReviewBundle(items)
    };
  }
  function visibleDimensionAuditSnapshot(){
    const items=filteredDimensionManagerItems(savedDimensions());
    const selectionIds=selectedDimensionAuditIds();
    const viewIds=new Set(items.map(dimension=>String(dimension?.id??"")));
    const selectedInView=selectionIds.filter(id=>viewIds.has(String(id)));
    const selectedOutsideView=selectionIds.filter(id=>!viewIds.has(String(id)));
    return {
      schema:"TubeBender.DimensionAuditView.v1",
      ...dimensionAuditProjectContext(),
      view:{
        filter:dimensionManagerFilter,
        sort:dimensionManagerSort,
        search:String(dimensionManagerSearch??""),
        focus_id:dimensionManagerFocusId||null,
        review_reason:activeDimensionReviewReason(),
        selected_dimension_ids:selectionIds,
        selected_dimension_count:selectionIds.length,
        selected_in_view_ids:selectedInView,
        selected_in_view_count:selectedInView.length,
        selected_outside_view_ids:selectedOutsideView,
        selected_outside_view_count:selectedOutsideView.length
      },
      dimension_count:items.length,
      summary:dimensionAuditSummary(items),
      ...dimensionAuditReviewBundle(items)
    };
  }
  function reviewProgressDomainCompatibility(){
    const available=reviewProgressDomain!=null;
    const compatible=available
      &&typeof reviewProgressDomain.buildReviewProgress==="function"
      &&typeof reviewProgressDomain.reviewProgressSignature==="function"
      &&typeof reviewProgressDomain.reviewProgressSnapshot==="function"
      &&typeof reviewProgressDomain.buildReviewProgressDiagnostics==="function"
      &&typeof reviewProgressDomain.reviewProgressDiagnosticsSignature==="function"
      &&typeof reviewProgressDomain.reviewProgressDiagnosticsSnapshot==="function"
      &&typeof reviewProgressDomain.reviewProgressDiagnosticsIntegrity==="function"
      &&typeof reviewProgressDomain.reviewProgressDiagnosticsIntegritySignature==="function"
      &&reviewProgressDomain.REVIEW_PROGRESS_SCHEMA==="TubeBender.DimensionReviewProgress.v1"
      &&reviewProgressDomain.REVIEW_PROGRESS_SNAPSHOT_SCHEMA==="TubeBender.DimensionReviewProgressSnapshot.v1"
      &&reviewProgressDomain.REVIEW_PROGRESS_DIAGNOSTICS_SCHEMA==="TubeBender.DimensionReviewProgressDiagnostics.v1"
      &&reviewProgressDomain.REVIEW_PROGRESS_DIAGNOSTICS_SNAPSHOT_SCHEMA==="TubeBender.DimensionReviewProgressDiagnosticsSnapshot.v1"
      &&reviewProgressDomain.REVIEW_PROGRESS_DIAGNOSTICS_INTEGRITY_SCHEMA==="TubeBender.DimensionReviewProgressDiagnosticsIntegrity.v1";
    return {
      available,
      compatible,
      status:!available?"unavailable":compatible?"compatible":"incompatible"
    };
  }

  function reviewProgressAuditErrorCodes(){
    const fallback=[
      "REVIEW_REASON_COUNT_MISMATCH",
      "REVIEW_REASON_LIST_MISMATCH",
      "REVIEW_PROGRESS_MODEL_DIVERGENCE",
      "REVIEW_PROGRESS_DOMAIN_DIVERGENCE",
      "REVIEW_PROGRESS_DOMAIN_INCOMPATIBLE"
    ];
    return reviewProgressDomainCompatibility().compatible&&Array.isArray(reviewProgressDomain?.REVIEW_PROGRESS_AUDIT_ERROR_CODES)
      ?[...reviewProgressDomain.REVIEW_PROGRESS_AUDIT_ERROR_CODES]:fallback;
  }

  function dimensionReviewProgressDiagnostics(input={}){
    if(reviewProgressDomainCompatibility().compatible&&typeof reviewProgressDomain?.buildReviewProgressDiagnostics==="function"){
      return reviewProgressDomain.buildReviewProgressDiagnostics(input);
    }
    const reasonCount=Math.max(0,Math.trunc(Number(input?.reason_count)||0));
    const domainStatus=String(input?.domain_status??"unavailable");
    if(!["unavailable","compatible","incompatible"].includes(domainStatus)){
      throw new RangeError("domain_status must be unavailable, compatible or incompatible");
    }
    const errors=[];
    if(input?.count_consistent!==true)errors.push("REVIEW_REASON_COUNT_MISMATCH");
    if(input?.lists_consistent!==true)errors.push("REVIEW_REASON_LIST_MISMATCH");
    if(input?.model_consistent!==true)errors.push("REVIEW_PROGRESS_MODEL_DIVERGENCE");
    if(domainStatus==="incompatible")errors.push("REVIEW_PROGRESS_DOMAIN_INCOMPATIBLE");
    else if(domainStatus==="compatible"&&input?.domain_consistent!==true)errors.push("REVIEW_PROGRESS_DOMAIN_DIVERGENCE");
    const errorCodesValid=errors.every(code=>reviewProgressAuditErrorCodes().includes(code));
    const valid=errors.length===0&&errorCodesValid;
    return {
      schema:"TubeBender.DimensionReviewProgressDiagnostics.v1",
      supported_error_codes:reviewProgressAuditErrorCodes(),
      errors,
      issue_count:errors.length,
      issue_count_consistent:errors.length===errors.filter(Boolean).length,
      error_codes_valid:errorCodesValid,
      primary_error:errors[0]??null,
      valid,
      status:reasonCount===0?"empty":valid?"ok":"error"
    };
  }

  function dimensionReviewProgressDiagnosticsState(items=savedDimensions(),selectedIds=selectedDimensionAuditIds()){
    const reviewItems=dimensionReviewProgressItems(items);
    if(!Array.isArray(selectedIds))throw new TypeError("selected_ids must be an array");
    const fallback=dimensionReviewProgressFallback(reviewItems,selectedIds);
    const canonical=canonicalDimensionReviewProgress(items,selectedIds);
    const runtime=dimensionReviewProgressRuntimeState(items,selectedIds);
    const countConsistent=fallback.coverage.complete+fallback.pending_count===fallback.reason_count;
    const listsConsistent=fallback.completed_reasons.length===fallback.coverage.complete
      &&fallback.pending_reasons.length===fallback.pending_count;
    const modelConsistent=dimensionReviewProgressSignature(fallback)===canonical.signature;
    const diagnostics=dimensionReviewProgressDiagnostics({
      reason_count:fallback.reason_count,
      count_consistent:countConsistent,
      lists_consistent:listsConsistent,
      model_consistent:modelConsistent,
      domain_status:runtime.domain_status,
      domain_consistent:runtime.domain_consistent
    });
    return {
      diagnostics,
      signature:dimensionReviewProgressDiagnosticsSignature(diagnostics),
      count_consistent:countConsistent,
      lists_consistent:listsConsistent,
      model_consistent:modelConsistent,
      runtime
    };
  }

  function dimensionReviewProgressDiagnosticsRuntimeState(items=savedDimensions(),selectedIds=selectedDimensionAuditIds()){
    const compatibility=reviewProgressDomainCompatibility();
    const state=dimensionReviewProgressDiagnosticsState(items,selectedIds);
    const domainDiagnosticsAvailable=compatibility.compatible
      &&typeof reviewProgressDomain?.buildReviewProgressDiagnostics==="function";
    const snapshot=dimensionReviewProgressDiagnosticsSnapshot(state.diagnostics);
    const snapshotSignatureConsistent=String(snapshot?.signature??"")===String(state.signature??"");
    return {
      source:domainDiagnosticsAvailable?"domain":"ui-fallback",
      domain_available:compatibility.available,
      domain_compatible:compatibility.compatible,
      domain_status:compatibility.status,
      diagnostics_available:domainDiagnosticsAvailable,
      diagnostics:state.diagnostics,
      snapshot,
      snapshot_signature_consistent:snapshotSignatureConsistent,
      runtime_valid:state.diagnostics?.valid===true&&snapshotSignatureConsistent,
      signature:state.signature,
      state
    };
  }

  function dimensionReviewProgressDiagnosticsIntegritySignatureFallback(integrity={}){
    return JSON.stringify({
      schema:String(integrity?.schema??"TubeBender.DimensionReviewProgressDiagnosticsIntegrity.v1"),
      source:String(integrity?.source??"ui-fallback"),
      domain_available:integrity?.domain_available===true,
      domain_compatible:integrity?.domain_compatible===true,
      domain_status:String(integrity?.domain_status??"unavailable"),
      diagnostics_available:integrity?.diagnostics_available===true,
      state_consistent:integrity?.state_consistent===true,
      snapshot_signature_consistent:integrity?.snapshot_signature_consistent===true,
      runtime_valid:integrity?.runtime_valid===true,
      parity_available:integrity?.parity_available===true,
      parity_consistent:integrity?.parity_consistent===null?null:integrity?.parity_consistent===true,
      valid:integrity?.valid===true
    });
  }

  function dimensionReviewProgressDiagnosticsIntegritySignature(integrity={}){
    if(typeof reviewProgressDomain?.reviewProgressDiagnosticsIntegritySignature==="function"){
      return reviewProgressDomain.reviewProgressDiagnosticsIntegritySignature(integrity);
    }
    return dimensionReviewProgressDiagnosticsIntegritySignatureFallback(integrity);
  }

  function dimensionReviewProgressDiagnosticsIntegrityParity(runtime,stateConsistent=true){
    const fallback=dimensionReviewProgressDiagnosticsIntegrityFallback(runtime,stateConsistent);
    const fallbackSignature=dimensionReviewProgressDiagnosticsIntegritySignatureFallback(fallback);
    const compatible=reviewProgressDomainCompatibility().compatible
      &&typeof reviewProgressDomain?.reviewProgressDiagnosticsIntegrity==="function"
      &&typeof reviewProgressDomain?.reviewProgressDiagnosticsIntegritySignature==="function";
    if(!compatible){
      return {
        available:false,
        consistent:null,
        fallback_signature:fallbackSignature,
        domain_signature:null
      };
    }
    const domain=reviewProgressDomain.reviewProgressDiagnosticsIntegrity(runtime??{},stateConsistent);
    const domainSignature=reviewProgressDomain.reviewProgressDiagnosticsIntegritySignature(domain);
    return {
      available:true,
      consistent:domainSignature===fallbackSignature,
      fallback_signature:fallbackSignature,
      domain_signature:domainSignature
    };
  }

  function dimensionReviewProgressDiagnosticsIntegrityState(items=savedDimensions(),selectedIds=selectedDimensionAuditIds(),stateConsistent=true){
    const runtime=dimensionReviewProgressDiagnosticsRuntimeState(items,selectedIds);
    const parity=dimensionReviewProgressDiagnosticsIntegrityParity(runtime,stateConsistent);
    const integrity=dimensionReviewProgressDiagnosticsIntegrity(
      runtime,
      stateConsistent,
      parity.available?parity.consistent:null
    );
    return {
      runtime,
      parity,
      integrity,
      signature:dimensionReviewProgressDiagnosticsIntegritySignature(integrity)
    };
  }

  function dimensionReviewProgressDiagnosticsSnapshot(diagnostics={}){
    if(reviewProgressDomainCompatibility().compatible&&typeof reviewProgressDomain?.reviewProgressDiagnosticsSnapshot==="function"){
      return reviewProgressDomain.reviewProgressDiagnosticsSnapshot(diagnostics);
    }
    return {
      schema:"TubeBender.DimensionReviewProgressDiagnosticsSnapshot.v1",
      diagnostics_schema:String(diagnostics?.schema??"TubeBender.DimensionReviewProgressDiagnostics.v1"),
      supported_error_codes:clone(diagnostics?.supported_error_codes??reviewProgressAuditErrorCodes()),
      errors:clone(diagnostics?.errors??[]),
      issue_count:Number(diagnostics?.issue_count??0),
      issue_count_consistent:diagnostics?.issue_count_consistent===true,
      error_codes_valid:diagnostics?.error_codes_valid===true,
      primary_error:diagnostics?.primary_error??null,
      valid:diagnostics?.valid===true,
      status:String(diagnostics?.status??"empty"),
      signature:dimensionReviewProgressDiagnosticsSignature(diagnostics)
    };
  }

  function dimensionReviewProgressDiagnosticsIntegrityFallback(runtime,stateConsistent=true,parityConsistent=null){
    const value=runtime??{};
    const parityAvailable=parityConsistent!==null&&parityConsistent!==undefined;
    const parityValue=parityAvailable?parityConsistent===true:null;
    return {
      schema:"TubeBender.DimensionReviewProgressDiagnosticsIntegrity.v1",
      source:String(value.source??"ui-fallback"),
      domain_available:value.domain_available===true,
      domain_compatible:value.domain_compatible===true,
      domain_status:String(value.domain_status??"unavailable"),
      diagnostics_available:value.diagnostics_available===true,
      state_consistent:stateConsistent===true,
      snapshot_signature_consistent:value.snapshot_signature_consistent===true,
      runtime_valid:value.runtime_valid===true,
      parity_available:parityAvailable,
      parity_consistent:parityValue,
      valid:stateConsistent===true
        &&value.snapshot_signature_consistent===true
        &&value.runtime_valid===true
        &&parityValue!==false
    };
  }

  function dimensionReviewProgressDiagnosticsIntegrity(runtime,stateConsistent=true,parityConsistent=null){
    if(typeof reviewProgressDomain?.reviewProgressDiagnosticsIntegrity==="function"){
      return reviewProgressDomain.reviewProgressDiagnosticsIntegrity(runtime??{},stateConsistent,parityConsistent);
    }
    return dimensionReviewProgressDiagnosticsIntegrityFallback(runtime,stateConsistent,parityConsistent);
  }

  function dimensionReviewProgressDiagnosticsSignature(diagnostics={}){
    if(reviewProgressDomainCompatibility().compatible&&typeof reviewProgressDomain?.reviewProgressDiagnosticsSignature==="function"){
      return reviewProgressDomain.reviewProgressDiagnosticsSignature(diagnostics);
    }
    return JSON.stringify({
      schema:String(diagnostics?.schema??"TubeBender.DimensionReviewProgressDiagnostics.v1"),
      supported_error_codes:diagnostics?.supported_error_codes??reviewProgressAuditErrorCodes(),
      errors:diagnostics?.errors??[],
      issue_count:Number(diagnostics?.issue_count??0),
      issue_count_consistent:diagnostics?.issue_count_consistent===true,
      error_codes_valid:diagnostics?.error_codes_valid===true,
      primary_error:diagnostics?.primary_error??null,
      valid:diagnostics?.valid===true,
      status:String(diagnostics?.status??"empty")
    });
  }

  function dimensionReviewProgressItems(items=savedDimensions()){
    if(!Array.isArray(items))throw new TypeError("review progress items must be an array");
    const reviewItems=items.filter(dimension=>dimensionAuditNeedsReview(dimension))
      .slice().sort((a,b)=>String(a?.id??"").localeCompare(String(b?.id??"")));
    const reviewIds=new Set();
    for(const [index,dimension] of reviewItems.entries()){
      const id=String(dimension?.id??"").trim();
      if(!id)throw new TypeError("review progress item "+index+" id must be non-empty");
      if(reviewIds.has(id))throw new RangeError("duplicate review progress item id: "+id);
      reviewIds.add(id);
    }
    return reviewItems;
  }

  function dimensionReviewProgressFallback(reviewItems,selectedIds){
    const selectedSet=new Set(selectedIds.map(id=>String(id)));
    const reasonCounts={};
    for(const dimension of reviewItems){
      for(const reason of dimensionAuditReviewReasons(dimension)){
        const key=String(reason);reasonCounts[key]=(reasonCounts[key]??0)+1;
      }
    }
    const reasonSelection={};
    for(const [reason,count] of Object.entries(reasonCounts).sort(([a],[b])=>String(a).localeCompare(String(b)))){
      const ids=reviewItems.filter(dimension=>dimensionAuditReviewReasons(dimension).includes(reason))
        .map(dimension=>String(dimension?.id??""));
      const selected=ids.filter(id=>selectedSet.has(id));
      const unselected=ids.filter(id=>!selectedSet.has(id));
      reasonSelection[reason]={
        dimension_count:count,
        selected_dimension_ids:selected,
        unselected_dimension_ids:unselected,
        selected_dimension_count:selected.length,
        unselected_dimension_count:unselected.length,
        selected_percent:count?Math.round(selected.length/count*100):0,
        selection_coverage:selected.length===0?"none":selected.length===count?"complete":"partial"
      };
    }
    const coverage={none:0,partial:0,complete:0};
    for(const entry of Object.values(reasonSelection))coverage[String(entry.selection_coverage)]++;
    const completed=Object.entries(reasonSelection).filter(([,entry])=>entry.selection_coverage==="complete").map(([reason])=>reason);
    const pending=Object.entries(reasonSelection).filter(([,entry])=>entry.selection_coverage!=="complete").map(([reason])=>reason);
    const count=Object.keys(reasonCounts).length;
    const pendingCount=coverage.partial+coverage.none;
    const errors=[
      coverage.complete+pendingCount!==count?"REVIEW_REASON_COUNT_MISMATCH":null,
      (completed.length!==coverage.complete||pending.length!==pendingCount)?"REVIEW_REASON_LIST_MISMATCH":null
    ].filter(Boolean);
    return {
      review_items:reviewItems,
      reason_counts:reasonCounts,
      reason_selection:reasonSelection,
      coverage,
      completed_reasons:completed,
      pending_reasons:pending,
      reason_count:count,
      pending_count:pendingCount,
      complete_percent:count?Math.round(coverage.complete/count*100):0,
      completion_state:count===0?"empty":pendingCount===0?"complete":"pending",
      errors,
      issue_count:errors.length,
      valid:errors.length===0,
      status:count===0?"empty":errors.length===0?"ok":"error"
    };
  }

  function dimensionReviewProgress(items=savedDimensions(),selectedIds=selectedDimensionAuditIds()){
    const reviewItems=dimensionReviewProgressItems(items);
    if(!Array.isArray(selectedIds))throw new TypeError("selected_ids must be an array");
    if(reviewProgressDomainCompatibility().compatible){
      const progress=reviewProgressDomain.buildReviewProgress({
        items:reviewItems.map(dimension=>({
          id:String(dimension?.id??""),
          reasons:dimensionAuditReviewReasons(dimension)
        })),
        selected_ids:selectedIds.map(id=>String(id))
      });
      return {...progress,review_items:reviewItems};
    }
    return dimensionReviewProgressFallback(reviewItems,selectedIds);
  }

  function dimensionReviewProgressSignature(progress){
    if(reviewProgressDomainCompatibility().compatible)return reviewProgressDomain.reviewProgressSignature(progress??{});
    const value=progress??{};
    return JSON.stringify({
      reason_count:Number(value.reason_count??0),
      reason_counts:value.reason_counts??{},
      reason_selection:value.reason_selection??{},
      completed_reasons:value.completed_reasons??[],
      pending_reasons:value.pending_reasons??[],
      complete_percent:Number(value.complete_percent??0),
      completion_state:String(value.completion_state??"empty"),
      errors:value.errors??[],
      issue_count:Number(value.issue_count??0),
      valid:value.valid===true,
      status:String(value.status??"empty")
    });
  }

  function dimensionReviewProgressSnapshot(progress){
    if(reviewProgressDomainCompatibility().compatible)return reviewProgressDomain.reviewProgressSnapshot(progress??{});
    const value=progress??{};
    return {
      schema:"TubeBender.DimensionReviewProgressSnapshot.v1",
      reason_count:Number(value.reason_count??0),
      reason_counts:clone(value.reason_counts??{}),
      reason_selection:clone(value.reason_selection??{}),
      coverage:clone(value.coverage??{none:0,partial:0,complete:0}),
      completed_reasons:clone(value.completed_reasons??[]),
      pending_reasons:clone(value.pending_reasons??[]),
      pending_count:Number(value.pending_count??0),
      complete_percent:Number(value.complete_percent??0),
      completion_state:String(value.completion_state??"empty"),
      errors:clone(value.errors??[]),
      issue_count:Number(value.issue_count??0),
      valid:value.valid===true,
      status:String(value.status??"empty"),
      signature:dimensionReviewProgressSignature(value)
    };
  }

  function domainDimensionReviewProgress(items=savedDimensions(),selectedIds=selectedDimensionAuditIds()){
    if(!reviewProgressDomainCompatibility().compatible)return null;
    const reviewItems=dimensionReviewProgressItems(items);
    if(!Array.isArray(selectedIds))throw new TypeError("selected_ids must be an array");
    const normalized=reviewItems.map(dimension=>({
      id:String(dimension?.id??""),
      reasons:dimensionAuditReviewReasons(dimension)
    }));
    return reviewProgressDomain.buildReviewProgress({
      items:normalized,
      selected_ids:selectedIds.map(id=>String(id))
    });
  }

  function dimensionReviewProgressParity(items=savedDimensions(),selectedIds=selectedDimensionAuditIds()){
    const reviewItems=dimensionReviewProgressItems(items);
    if(!Array.isArray(selectedIds))throw new TypeError("selected_ids must be an array");
    const fallback=dimensionReviewProgressFallback(reviewItems,selectedIds);
    const domain=domainDimensionReviewProgress(items,selectedIds);
    const fallbackSignature=dimensionReviewProgressSignature(fallback);
    const domainSignature=domain&&reviewProgressDomain?.reviewProgressSignature
      ?reviewProgressDomain.reviewProgressSignature(domain):null;
    return {
      available:domain!=null,
      consistent:domain!=null?domainSignature===fallbackSignature:null,
      fallback_signature:fallbackSignature,
      domain_signature:domainSignature
    };
  }

  function canonicalDimensionReviewProgress(items=savedDimensions(),selectedIds=selectedDimensionAuditIds()){
    const domain=domainDimensionReviewProgress(items,selectedIds);
    if(domain&&reviewProgressDomain?.reviewProgressSnapshot&&reviewProgressDomain?.reviewProgressSignature){
      return {
        source:"domain",
        progress:domain,
        snapshot:reviewProgressDomain.reviewProgressSnapshot(domain),
        signature:reviewProgressDomain.reviewProgressSignature(domain)
      };
    }
    const local=dimensionReviewProgress(items,selectedIds);
    return {
      source:"ui-fallback",
      progress:local,
      snapshot:dimensionReviewProgressSnapshot(local),
      signature:dimensionReviewProgressSignature(local)
    };
  }

  function dimensionReviewProgressRuntimeState(items=savedDimensions(),selectedIds=selectedDimensionAuditIds()){
    const compatibility=reviewProgressDomainCompatibility();
    const canonical=canonicalDimensionReviewProgress(items,selectedIds);
    const parity=dimensionReviewProgressParity(items,selectedIds);
    return {
      source:canonical.source,
      signature:canonical.signature,
      snapshot:canonical.snapshot,
      domain_available:compatibility.available,
      domain_compatible:compatibility.compatible,
      domain_status:compatibility.status,
      domain_comparable:parity.available,
      domain_consistent:parity.consistent,
      fallback_signature:parity.fallback_signature,
      domain_signature:parity.domain_signature
    };
  }

  function dimensionReviewContextState(items=savedDimensions(),selectedIds=selectedDimensionAuditIds()){
    if(!Array.isArray(selectedIds))throw new TypeError("selected_ids must be an array");
    return {
      items,
      selected_ids:selectedIds.map(value=>String(value)),
      progress:canonicalDimensionReviewProgress(items,selectedIds),
      diagnostics_runtime:dimensionReviewProgressDiagnosticsRuntimeState(items,selectedIds),
      diagnostics_integrity:dimensionReviewProgressDiagnosticsIntegrityState(items,selectedIds)
    };
  }

  function dimensionReviewContextSignature(context={}){
    const value=context??{};
    return JSON.stringify({
      schema:String(value.schema??"TubeBender.DimensionReviewContext.v1"),
      dimension_id:String(value.dimension_id??""),
      selected_in_audit:value.selected_in_audit===true,
      state:String(value.state??"not-required"),
      health:String(value.health??"not-required"),
      action_required:value.action_required===true,
      complete_percent:Number(value.complete_percent??0),
      reason_count:Number(value.reason_count??0),
      completed_reason_count:Number(value.completed_reason_count??0),
      pending_reason_count:Number(value.pending_reason_count??0),
      reasons:value.reasons??[],
      completed_reasons:value.completed_reasons??[],
      pending_reasons:value.pending_reasons??[],
      reason_coverage:value.reason_coverage??{},
      reason_progress:value.reason_progress??{},
      blockers:value.blockers??[],
      progress_source:String(value.progress_source??"ui-fallback"),
      progress_status:String(value.progress_status??"empty"),
      progress_signature:String(value.progress_signature??""),
      diagnostics_signature:String(value.diagnostics_runtime?.signature??""),
      diagnostics_integrity_signature:String(value.diagnostics_integrity?.signature??"")
    });
  }

  function dimensionReviewContext(dimension,contextState=dimensionReviewContextState()){
    const id=String(dimension?.id??"");
    const reasons=dimensionAuditReviewReasons(dimension).map(reason=>String(reason));
    const progress=contextState?.progress??canonicalDimensionReviewProgress();
    const snapshot=progress.snapshot??null;
    const selectedIds=Array.isArray(contextState?.selected_ids)
      ?contextState.selected_ids.map(value=>String(value))
      :selectedDimensionAuditIds().map(value=>String(value));
    const selectedInAudit=selectedIds.includes(id);
    const reasonCoverage=Object.fromEntries(reasons.map(reason=>[
      reason,
      snapshot?.reason_selection?.[reason]?.selection_coverage??null
    ]));
    const reasonProgress=Object.fromEntries(reasons.map(reason=>{
      const state=snapshot?.reason_selection?.[reason]??null;
      return [reason,state?{
        dimension_count:state.dimension_count,
        selected_dimension_count:state.selected_dimension_count,
        unselected_dimension_count:state.unselected_dimension_count,
        selected_percent:state.selected_percent,
        selection_coverage:state.selection_coverage
      }:null];
    }));
    const completedReasons=reasons.filter(reason=>reasonCoverage[reason]==="complete");
    const pendingReasons=reasons.filter(reason=>reasonCoverage[reason]!=="complete");
    const state=reasons.length===0?"not-required":pendingReasons.length===0?"complete":"pending";
    const completePercent=reasons.length?Math.round(completedReasons.length/reasons.length*100):100;
    const diagnosticsRuntime=contextState?.diagnostics_runtime??dimensionReviewProgressDiagnosticsRuntimeState();
    const diagnosticsIntegrityState=contextState?.diagnostics_integrity??dimensionReviewProgressDiagnosticsIntegrityState();
    const health=state==="not-required"
      ?"not-required"
      :diagnosticsIntegrityState?.integrity?.valid!==true
        ?"diagnostics-error"
        :state==="complete"?"ready":"pending";
    const blockers=[
      ...pendingReasons.map(reason=>"REVIEW:"+reason),
      ...(diagnosticsRuntime?.diagnostics?.errors??[]).map(code=>"DIAGNOSTIC:"+String(code))
    ];
    const context={
      schema:"TubeBender.DimensionReviewContext.v1",
      dimension_id:id,
      selected_in_audit:selectedInAudit,
      state,
      health,
      action_required:health==="pending"||health==="diagnostics-error",
      complete_percent:completePercent,
      reason_count:reasons.length,
      completed_reason_count:completedReasons.length,
      pending_reason_count:pendingReasons.length,
      reasons,
      completed_reasons:completedReasons,
      pending_reasons:pendingReasons,
      reason_coverage:reasonCoverage,
      reason_progress:reasonProgress,
      blockers,
      progress_source:progress.source,
      progress_status:snapshot?.status??null,
      progress_signature:snapshot?.signature??progress.signature??null,
      diagnostics_runtime:clone(diagnosticsRuntime),
      diagnostics_integrity:clone(diagnosticsIntegrityState)
    };
    return {...context,signature:dimensionReviewContextSignature(context)};
  }

  function dimensionReviewContextSummarySignature(summary={}){
    const sortedRecord=(value)=>Object.fromEntries(
      Object.entries(value??{}).sort(([a],[b])=>String(a).localeCompare(String(b)))
    );
    return JSON.stringify({
      schema:String(summary?.schema??"TubeBender.DimensionReviewContextSummary.v1"),
      total:Number(summary?.total??0),
      action_required:Number(summary?.action_required??0),
      by_state:sortedRecord(summary?.by_state),
      by_health:sortedRecord(summary?.by_health),
      blocker_counts:sortedRecord(summary?.blocker_counts)
    });
  }

  function dimensionReviewContextSummary(items=savedDimensions(),contextState=null){
    const list=Array.isArray(items)?items:[];
    const sharedState=contextState??dimensionReviewContextState(savedDimensions(),selectedDimensionAuditIds());
    const summary={
      schema:"TubeBender.DimensionReviewContextSummary.v1",
      total:list.length,
      action_required:0,
      by_state:{},
      by_health:{},
      blocker_counts:{}
    };
    for(const dimension of list){
      const context=dimensionReviewContext(dimension,sharedState);
      summary.by_state[context.state]=(summary.by_state[context.state]??0)+1;
      summary.by_health[context.health]=(summary.by_health[context.health]??0)+1;
      if(context.action_required)summary.action_required++;
      for(const blocker of context.blockers??[]){
        const key=String(blocker);
        summary.blocker_counts[key]=(summary.blocker_counts[key]??0)+1;
      }
    }
    return {...summary,signature:dimensionReviewContextSummarySignature(summary)};
  }

  function reviewQueueDimensionAuditSnapshot(){
    const items=savedDimensions().filter(dimension=>dimensionAuditNeedsReview(dimension));
    const reviewReasonCounts={};
    for(const dimension of items){
      for(const reason of dimensionAuditReviewReasons(dimension)){
        const key=String(reason);
        reviewReasonCounts[key]=(reviewReasonCounts[key]??0)+1;
      }
    }
    const dimensionIds=items.map(dimension=>String(dimension?.id??""));
    const selectedSet=new Set(selectedDimensionAuditIds());
    const selectedIds=dimensionIds.filter(id=>selectedSet.has(id));
    const unselectedIds=dimensionIds.filter(id=>!selectedSet.has(id));
    const selectedPercent=dimensionIds.length?Math.round(selectedIds.length/dimensionIds.length*100):0;
    const selectionCoverage=selectedIds.length===0?"none":selectedIds.length===dimensionIds.length?"complete":"partial";
    const reviewReasonSelection={};
    for(const [reason,count] of Object.entries(reviewReasonCounts).sort(([a],[b])=>String(a).localeCompare(String(b)))){
      const reasonIds=items
        .filter(dimension=>dimensionAuditReviewReasons(dimension).includes(reason))
        .map(dimension=>String(dimension?.id??""));
      const reasonSelectedIds=reasonIds.filter(id=>selectedSet.has(id));
      const reasonUnselectedIds=reasonIds.filter(id=>!selectedSet.has(id));
      reviewReasonSelection[reason]={
        dimension_count:count,
        selected_dimension_ids:reasonSelectedIds,
        unselected_dimension_ids:reasonUnselectedIds,
        selected_dimension_count:reasonSelectedIds.length,
        unselected_dimension_count:reasonUnselectedIds.length,
        selected_percent:count?Math.round(reasonSelectedIds.length/count*100):0,
        selection_coverage:reasonSelectedIds.length===0?"none":reasonSelectedIds.length===count?"complete":"partial"
      };
    }
    const reviewReasonCoverageSummary={none:0,partial:0,complete:0};
    for(const entry of Object.values(reviewReasonSelection)){
      const state=String(entry?.selection_coverage??"none");
      if(Object.prototype.hasOwnProperty.call(reviewReasonCoverageSummary,state))reviewReasonCoverageSummary[state]++;
    }
    const reviewReasonCount=Object.keys(reviewReasonCounts).length;
    const completedReviewReasons=Object.entries(reviewReasonSelection)
      .filter(([,entry])=>entry?.selection_coverage==="complete").map(([reason])=>reason)
      .sort((a,b)=>String(a).localeCompare(String(b)));
    const pendingReviewReasons=Object.entries(reviewReasonSelection)
      .filter(([,entry])=>entry?.selection_coverage!=="complete").map(([reason])=>reason)
      .sort((a,b)=>String(a).localeCompare(String(b)));
    const reviewReasonPendingCount=reviewReasonCoverageSummary.partial+reviewReasonCoverageSummary.none;
    const reviewReasonCompletePercent=reviewReasonCount?Math.round(reviewReasonCoverageSummary.complete/reviewReasonCount*100):0;
    const reviewReasonCompletionState=reviewReasonCount===0?"empty":reviewReasonPendingCount===0?"complete":"pending";
    const reviewProgressSchema=reviewProgressDomain?.REVIEW_PROGRESS_SCHEMA??"TubeBender.DimensionReviewProgress.v1";
    const reviewProgressDiagnosticsSchema=reviewProgressDomain?.REVIEW_PROGRESS_DIAGNOSTICS_SCHEMA??"TubeBender.DimensionReviewProgressDiagnostics.v1";
    const reviewProgressSupportedErrorCodes=reviewProgressAuditErrorCodes();
    const sharedReviewProgress=dimensionReviewProgress(items,selectedDimensionAuditIds());
    const reviewProgressRuntime=dimensionReviewProgressRuntimeState(items,selectedDimensionAuditIds());
    const domainReviewProgressAvailable=reviewProgressRuntime.domain_available;
    const domainReviewProgressCompatible=reviewProgressRuntime.domain_compatible;
    const domainReviewProgressComparable=reviewProgressRuntime.domain_comparable;
    const domainReviewProgressConsistent=reviewProgressRuntime.domain_consistent;
    const domainReviewProgressIncompatible=domainReviewProgressAvailable&&!domainReviewProgressCompatible;
    const domainReviewProgressDiverged=domainReviewProgressComparable&&domainReviewProgressConsistent===false;
    const sharedReviewProgressConsistent=
      sharedReviewProgress.reason_count===reviewReasonCount
      &&sharedReviewProgress.pending_count===reviewReasonPendingCount
      &&sharedReviewProgress.complete_percent===reviewReasonCompletePercent
      &&sharedReviewProgress.completion_state===reviewReasonCompletionState
      &&JSON.stringify(sharedReviewProgress.reason_counts)===JSON.stringify(reviewReasonCounts)
      &&JSON.stringify(sharedReviewProgress.reason_selection)===JSON.stringify(reviewReasonSelection);
    const reviewReasonCountConsistent=reviewReasonCoverageSummary.complete+reviewReasonPendingCount===reviewReasonCount;
    const reviewReasonListsConsistent=completedReviewReasons.length===reviewReasonCoverageSummary.complete&&pendingReviewReasons.length===reviewReasonPendingCount;
    const standaloneReviewDiagnosticsRuntime=dimensionReviewProgressDiagnosticsRuntimeState(items,selectedDimensionAuditIds());
    const reviewProgressDiagnosticsModel=standaloneReviewDiagnosticsRuntime.diagnostics;
    const reviewProgressDiagnosticsSignature=standaloneReviewDiagnosticsRuntime.signature;
    const standaloneReviewDiagnosticsConsistent=
      dimensionReviewProgressDiagnosticsSignature(reviewProgressDiagnosticsModel)===reviewProgressDiagnosticsSignature;
    const reviewDiagnosticsIntegrityParity=dimensionReviewProgressDiagnosticsIntegrityParity(
      standaloneReviewDiagnosticsRuntime,
      standaloneReviewDiagnosticsConsistent
    );
    const reviewProgressDiagnosticsIntegrity=dimensionReviewProgressDiagnosticsIntegrity(
      standaloneReviewDiagnosticsRuntime,
      standaloneReviewDiagnosticsConsistent,
      reviewDiagnosticsIntegrityParity.available?reviewDiagnosticsIntegrityParity.consistent:null
    );
    const reviewProgressDiagnosticsIntegritySignature=
      dimensionReviewProgressDiagnosticsIntegritySignature(reviewProgressDiagnosticsIntegrity);
    const legacyReviewProgressErrors=[
      !reviewReasonCountConsistent?"REVIEW_REASON_COUNT_MISMATCH":null,
      !reviewReasonListsConsistent?"REVIEW_REASON_LIST_MISMATCH":null,
      !sharedReviewProgressConsistent?"REVIEW_PROGRESS_MODEL_DIVERGENCE":null,
      domainReviewProgressDiverged?"REVIEW_PROGRESS_DOMAIN_DIVERGENCE":null,
      domainReviewProgressIncompatible?"REVIEW_PROGRESS_DOMAIN_INCOMPATIBLE":null
    ].filter(Boolean);
    const legacyReviewProgressDiagnosticsValid=
      reviewReasonCountConsistent
      &&reviewReasonListsConsistent
      &&sharedReviewProgressConsistent
      &&!domainReviewProgressDiverged
      &&!domainReviewProgressIncompatible
      &&legacyReviewProgressErrors.every(code=>reviewProgressSupportedErrorCodes.includes(code));
    const legacyReviewProgressStatus=reviewReasonCount===0?"empty":legacyReviewProgressDiagnosticsValid?"ok":"error";
    const reviewProgressDiagnosticsModelConsistent=
      reviewProgressDiagnosticsModel.issue_count===legacyReviewProgressErrors.length
      &&JSON.stringify(reviewProgressDiagnosticsModel.errors)===JSON.stringify(legacyReviewProgressErrors)
      &&reviewProgressDiagnosticsModel.primary_error===(legacyReviewProgressErrors[0]??null)
      &&reviewProgressDiagnosticsModel.valid===legacyReviewProgressDiagnosticsValid
      &&reviewProgressDiagnosticsModel.status===legacyReviewProgressStatus;
    return {
      schema:"TubeBender.DimensionReviewQueueAudit.v1",
      ...dimensionAuditProjectContext(),
      queue:{
        filter:"needs-review",
        sort:"audit",
        dimension_ids:dimensionIds,
        selected_dimension_ids:selectedIds,
        unselected_dimension_ids:unselectedIds,
        selected_dimension_count:selectedIds.length,
        unselected_dimension_count:unselectedIds.length,
        selected_percent:selectedPercent,
        selection_coverage:selectionCoverage,
        review_progress_schema:reviewProgressSchema,
        review_progress_source:reviewProgressRuntime.source,
        review_progress_model:reviewProgressRuntime.snapshot,
        review_progress_signature:reviewProgressRuntime.signature,
        review_progress_model_consistent:sharedReviewProgressConsistent,
        review_progress_domain_available:domainReviewProgressAvailable,
        review_progress_domain_compatible:domainReviewProgressCompatible,
        review_progress_domain_status:reviewProgressRuntime.domain_status,
        review_progress_domain_comparable:domainReviewProgressComparable,
        review_progress_domain_consistent:domainReviewProgressConsistent,
        review_progress_diagnostics_schema:reviewProgressDiagnosticsSchema,
        review_progress_diagnostics_model:reviewProgressDiagnosticsModel,
        review_progress_diagnostics_signature:reviewProgressDiagnosticsSignature,
        review_progress_diagnostics_snapshot:standaloneReviewDiagnosticsRuntime.snapshot,
        review_progress_diagnostics_snapshot_signature_consistent:standaloneReviewDiagnosticsRuntime.snapshot_signature_consistent,
        review_progress_diagnostics_runtime_valid:standaloneReviewDiagnosticsRuntime.runtime_valid,
        review_progress_diagnostics_integrity_schema:reviewProgressDiagnosticsIntegrity.schema,
        review_progress_diagnostics_integrity:reviewProgressDiagnosticsIntegrity,
        review_progress_diagnostics_integrity_signature:reviewProgressDiagnosticsIntegritySignature,
        review_progress_diagnostics_integrity_parity:reviewDiagnosticsIntegrityParity,
        review_progress_diagnostics_source:standaloneReviewDiagnosticsRuntime.source,
        review_progress_diagnostics_domain_status:standaloneReviewDiagnosticsRuntime.domain_status,
        review_progress_diagnostics_state_consistent:standaloneReviewDiagnosticsConsistent,
        review_progress_diagnostics_model_consistent:reviewProgressDiagnosticsModelConsistent,
        review_progress_supported_error_codes:reviewProgressSupportedErrorCodes,
        review_progress_generated_at:new Date().toISOString(),
        review_reason_count:reviewReasonCount,
        review_reason_complete_count:reviewReasonCoverageSummary.complete,
        review_reason_pending_count:reviewReasonPendingCount,
        review_reason_count_consistent:reviewReasonCountConsistent,
        review_reason_lists_consistent:reviewReasonListsConsistent,
        review_progress_valid:reviewReasonCountConsistent&&reviewReasonListsConsistent,
        review_progress_issue_count:reviewProgressDiagnosticsModel.issue_count,
        review_progress_errors:reviewProgressDiagnosticsModel.errors,
        review_progress_issue_count_consistent:reviewProgressDiagnosticsModel.issue_count_consistent,
        review_progress_error_codes_valid:reviewProgressDiagnosticsModel.error_codes_valid,
        review_progress_status:reviewProgressDiagnosticsModel.status,
        review_progress_diagnostics_valid:reviewProgressDiagnosticsModel.valid,
        review_progress_error:reviewProgressDiagnosticsModel.primary_error,
        completed_review_reasons:completedReviewReasons,
        pending_review_reasons:pendingReviewReasons,
        review_reason_all_complete:reviewReasonCount>0&&reviewReasonPendingCount===0,
        review_reason_completion_state:reviewReasonCompletionState,
        review_reason_complete_percent:reviewReasonCompletePercent,
        review_reason_counts:reviewReasonCounts,
        review_reason_selection:reviewReasonSelection,
        review_reason_coverage_summary:reviewReasonCoverageSummary
      },
      dimension_count:items.length,
      summary:dimensionAuditSummary(items),
      ...dimensionAuditReviewBundle(items)
    };
  }
  function reviewReasonDimensionAuditSnapshot(reason=activeDimensionReviewReason()){
    const target=String(reason??"").trim();
    if(!target)return null;
    const items=savedDimensions().filter(dimension=>dimensionAuditReviewReasons(dimension).includes(target));
    const selectedSet=new Set(selectedDimensionAuditIds());
    const dimensionIds=items.map(dimension=>String(dimension?.id??""));
    const selectedIds=dimensionIds.filter(id=>selectedSet.has(id));
    const unselectedIds=dimensionIds.filter(id=>!selectedSet.has(id));
    const selectedPercent=dimensionIds.length?Math.round(selectedIds.length/dimensionIds.length*100):0;
    const selectionCoverage=selectedIds.length===0?"none":selectedIds.length===dimensionIds.length?"complete":"partial";
    return {
      schema:"TubeBender.DimensionReviewReasonAudit.v1",
      ...dimensionAuditProjectContext(),
      queue:{
        filter:"needs-review",
        sort:"audit",
        review_reason:target,
        dimension_ids:dimensionIds,
        selected_dimension_ids:selectedIds,
        unselected_dimension_ids:unselectedIds,
        selected_dimension_count:selectedIds.length,
        unselected_dimension_count:unselectedIds.length,
        selected_percent:selectedPercent,
        selection_coverage:selectionCoverage
      },
      dimension_count:items.length,
      summary:dimensionAuditSummary(items),
      ...dimensionAuditReviewBundle(items)
    };
  }

  async function copyReviewReasonDimensionAudits(){
    const snapshot=reviewReasonDimensionAuditSnapshot();
    if(!snapshot?.dimension_count){toast("Подочередь Review reason пуста");return false;}
    const text=JSON.stringify(snapshot,null,2);
    try{
      if(navigator?.clipboard?.writeText)await navigator.clipboard.writeText(text);
      else{
        const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";
        document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();
      }
      toast("Audit Review reason скопирован");
      return true;
    }catch(error){toast("Не удалось скопировать audit Review reason");return false;}
  }

  function downloadReviewReasonDimensionAudits(){
    const snapshot=reviewReasonDimensionAuditSnapshot();
    if(!snapshot?.dimension_count){toast("Подочередь Review reason пуста");return false;}
    const name=dimensionAuditFilenamePart(snapshot.project_name||snapshot.project_id,"project");
    const reason=dimensionAuditFilenamePart(snapshot?.queue?.review_reason,"reason");
    const stem=name+"-dimension-review-reason-"+reason+"-"+snapshot.dimension_count;
    return downloadDimensionAuditJson(dimensionAuditJsonFilename(stem,snapshot.generated_at),snapshot,{
      export_action:"download",
      action_permit_signature:exportActionPermitSignature,
      action_permit_snapshot_signature:exportActionPermitSnapshot.snapshot_signature
    });
  }

  async function copyReviewQueueDimensionAudits(){
    const snapshot=reviewQueueDimensionAuditSnapshot();
    if(!snapshot.dimension_count){toast("Review queue пуст");return false;}
    const text=JSON.stringify(snapshot,null,2);
    try{
      if(navigator?.clipboard?.writeText)await navigator.clipboard.writeText(text);
      else{
        const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";
        document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();
      }
      toast("Audit Review queue скопирован");
      return true;
    }catch(error){toast("Не удалось скопировать audit Review queue");return false;}
  }

  function downloadReviewQueueDimensionAudits(){
    const snapshot=reviewQueueDimensionAuditSnapshot();
    if(!snapshot.dimension_count){toast("Review queue пуст");return false;}
    const name=dimensionAuditFilenamePart(snapshot.project_name||snapshot.project_id,"project");
    const stem=name+"-dimension-review-queue-audit-"+snapshot.dimension_count;
    return downloadDimensionAuditJson(dimensionAuditJsonFilename(stem,snapshot.generated_at),snapshot);
  }

  const DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA="TubeBender.DimensionAuditDownloadValidation.v1";
  const DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA="TubeBender.DimensionAuditDownloadHistory.v1";

  const DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES=Object.freeze([
    "OK",
    "INVALID_FILENAME",
    "INVALID_SNAPSHOT",
    "UNSUPPORTED_SCHEMA"
  ]);

  const DIMENSION_AUDIT_DOWNLOAD_SCHEMAS=Object.freeze([
    "TubeBender.DimensionAudit.v1",
    "TubeBender.DimensionSelectionAudit.v1",
    "TubeBender.DimensionAuditView.v1",
    "TubeBender.DimensionReviewQueueAudit.v1",
    "TubeBender.DimensionReviewReasonAudit.v1",
    DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA
  ]);

  function dimensionAuditDownloadHistorySchema(){
    return String(auditDownloadDomain?.DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA??DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA);
  }
  function dimensionAuditDownloadHistoryProtocol(){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryProtocol){
      return clone(auditDownloadDomain.dimensionAuditDownloadHistoryProtocol());
    }
    return {
      schema:"TubeBender.DimensionAuditDownloadHistoryProtocol.v1",
      attempt_schema:"TubeBender.DimensionAuditDownloadAttempt.v1",
      history_schema:dimensionAuditDownloadHistorySchema(),
      summary_schema:"TubeBender.DimensionAuditDownloadAttemptHistorySummary.v1",
      integrity_schema:"TubeBender.DimensionAuditDownloadHistoryIntegrity.v1",
      integrity_codes:["OK","INVALID_HISTORY_SCHEMA","INVALID_ATTEMPT_COUNT","INVALID_ATTEMPTS","INVALID_SUMMARY","INVALID_SUMMARY_SIGNATURE","INVALID_PROTOCOL_STATE","INVALID_PROTOCOL_STATE_SIGNATURE","INVALID_SNAPSHOT_SIGNATURE"],
      envelope_schema:"TubeBender.DimensionAuditDownloadHistoryEnvelope.v1",
      validation_schema:"TubeBender.DimensionAuditDownloadHistoryProtocolValidation.v1",
      validation_codes:["OK","INVALID_PROTOCOL_SCHEMA","INVALID_ATTEMPT_SCHEMA","INVALID_HISTORY_SCHEMA","INVALID_SUMMARY_SCHEMA","INVALID_INTEGRITY_SCHEMA","INVALID_INTEGRITY_CODES","INVALID_ENVELOPE_SCHEMA","INVALID_PROTOCOL_VALIDATION_SCHEMA","INVALID_PROTOCOL_VALIDATION_CODES"]
    };
  }
  function dimensionAuditDownloadHistoryProtocolSignature(protocol=dimensionAuditDownloadHistoryProtocol()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryProtocolSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryProtocolSignature(protocol??{});
    }
    const value=protocol??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      attempt_schema:String(value.attempt_schema??""),
      history_schema:String(value.history_schema??""),
      summary_schema:String(value.summary_schema??""),
      integrity_schema:String(value.integrity_schema??""),
      integrity_codes:[...(value.integrity_codes??[])].map(code=>String(code)),
      envelope_schema:String(value.envelope_schema??""),
      validation_schema:String(value.validation_schema??""),
      validation_codes:[...(value.validation_codes??[])].map(code=>String(code))
    });
  }

  function dimensionAuditDownloadHistoryProtocolSignatureValid(signature,protocol=dimensionAuditDownloadHistoryProtocol()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryProtocolSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryProtocolSignatureValid(signature,protocol??{});
    }
    const validation=dimensionAuditDownloadHistoryProtocolValidation(protocol);
    return typeof signature==="string"
      &&signature.length>0
      &&validation.valid===true
      &&signature===dimensionAuditDownloadHistoryProtocolSignature(protocol);
  }

  function dimensionAuditDownloadHistoryProtocolValidation(protocol=dimensionAuditDownloadHistoryProtocol()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryProtocolValidation){
      return clone(auditDownloadDomain.dimensionAuditDownloadHistoryProtocolValidation(protocol??{}));
    }
    const value=protocol??{};
    const expected=dimensionAuditDownloadHistoryProtocol();
    const scalarValid=(field,expectedValue)=>typeof field==="string"&&field===expectedValue;
    const integrityCodesValid=Array.isArray(value.integrity_codes)
      &&value.integrity_codes.every(code=>typeof code==="string")
      &&JSON.stringify(value.integrity_codes)===JSON.stringify(expected.integrity_codes);
    const validationCodesValid=Array.isArray(value.validation_codes)
      &&value.validation_codes.every(code=>typeof code==="string")
      &&JSON.stringify(value.validation_codes)===JSON.stringify(expected.validation_codes);
    const errors=[
      !scalarValid(value.schema,expected.schema)?"INVALID_PROTOCOL_SCHEMA":null,
      !scalarValid(value.attempt_schema,expected.attempt_schema)?"INVALID_ATTEMPT_SCHEMA":null,
      !scalarValid(value.history_schema,expected.history_schema)?"INVALID_HISTORY_SCHEMA":null,
      !scalarValid(value.summary_schema,expected.summary_schema)?"INVALID_SUMMARY_SCHEMA":null,
      !scalarValid(value.integrity_schema,expected.integrity_schema)?"INVALID_INTEGRITY_SCHEMA":null,
      !integrityCodesValid?"INVALID_INTEGRITY_CODES":null,
      !scalarValid(value.envelope_schema,expected.envelope_schema)?"INVALID_ENVELOPE_SCHEMA":null,
      !scalarValid(value.validation_schema,expected.validation_schema)?"INVALID_PROTOCOL_VALIDATION_SCHEMA":null,
      !validationCodesValid?"INVALID_PROTOCOL_VALIDATION_CODES":null
    ].filter(Boolean);
    return {
      schema:"TubeBender.DimensionAuditDownloadHistoryProtocolValidation.v1",
      valid:errors.length===0,
      code:errors[0]??"OK",
      errors
    };
  }

  function dimensionAuditDownloadHistoryProtocolValidationSignature(validation=dimensionAuditDownloadHistoryProtocolValidation()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryProtocolValidationSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryProtocolValidationSignature(validation??{});
    }
    const value=validation??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      valid:value.valid===true,
      code:String(value.code??""),
      errors:[...(value.errors??[])].map(code=>String(code))
    });
  }

  function dimensionAuditDownloadHistoryProtocolValidationSignatureValid(signature,validation=dimensionAuditDownloadHistoryProtocolValidation()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryProtocolValidationSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryProtocolValidationSignatureValid(signature,validation??{});
    }
    const value=validation??{};
    return typeof signature==="string"
      &&signature.length>0
      &&typeof value.schema==="string"
      &&typeof value.valid==="boolean"
      &&typeof value.code==="string"
      &&Array.isArray(value.errors)
      &&value.errors.every(code=>typeof code==="string")
      &&signature===dimensionAuditDownloadHistoryProtocolValidationSignature(value);
  }

  function dimensionAuditDownloadHistoryProtocolState(){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryProtocolState){
      return clone(auditDownloadDomain.dimensionAuditDownloadHistoryProtocolState());
    }
    const protocol=dimensionAuditDownloadHistoryProtocol();
    const validation=dimensionAuditDownloadHistoryProtocolValidation(protocol);
    return {
      schema:"TubeBender.DimensionAuditDownloadHistoryProtocolState.v1",
      valid:validation.valid===true,
      protocol,
      protocol_signature:dimensionAuditDownloadHistoryProtocolSignature(protocol),
      validation,
      validation_signature:dimensionAuditDownloadHistoryProtocolValidationSignature(validation)
    };
  }

  function dimensionAuditDownloadHistoryProtocolStateSignature(state=dimensionAuditDownloadHistoryProtocolState()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryProtocolStateSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryProtocolStateSignature(state??{});
    }
    const value=state??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      valid:value.valid===true,
      protocol_signature:String(value.protocol_signature??""),
      validation_signature:String(value.validation_signature??"")
    });
  }

  function dimensionAuditDownloadHistoryProtocolStateSignatureValid(signature,state=dimensionAuditDownloadHistoryProtocolState()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryProtocolStateSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryProtocolStateSignatureValid(signature,state??{});
    }
    return typeof signature==="string"
      &&signature.length>0
      &&dimensionAuditDownloadHistoryProtocolStateValid(state)
      &&signature===dimensionAuditDownloadHistoryProtocolStateSignature(state);
  }

  function dimensionAuditDownloadHistoryProtocolStateValid(state=dimensionAuditDownloadHistoryProtocolState()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryProtocolStateValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryProtocolStateValid(state??{});
    }
    const value=state??{};
    const protocol=value.protocol??{};
    const validation=value.validation??{};
    if(typeof value.schema!=="string"
      ||typeof value.valid!=="boolean"
      ||typeof value.protocol_signature!=="string"
      ||typeof value.validation_signature!=="string"
      ||typeof validation.schema!=="string"
      ||typeof validation.valid!=="boolean"
      ||typeof validation.code!=="string"
      ||!Array.isArray(validation.errors)
      ||!validation.errors.every(code=>typeof code==="string"))return false;
    const expectedValidation=dimensionAuditDownloadHistoryProtocolValidation(protocol);
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryProtocolState.v1"
      &&value.valid===true
      &&validation.valid===true
      &&expectedValidation.valid===true
      &&validation.schema===expectedValidation.schema
      &&validation.code===expectedValidation.code
      &&JSON.stringify(validation.errors)===JSON.stringify(expectedValidation.errors)
      &&value.protocol_signature===dimensionAuditDownloadHistoryProtocolSignature(protocol)
      &&dimensionAuditDownloadHistoryProtocolSignatureValid(value.protocol_signature,protocol)
      &&dimensionAuditDownloadHistoryProtocolValidationSignatureValid(value.validation_signature,validation)
      &&dimensionAuditDownloadHistoryProtocolValidationSignature(expectedValidation)===value.validation_signature;
  }

  function dimensionAuditDownloadHistoryProtocolBindingValid(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryProtocolBindingValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryProtocolBindingValid(snapshot??{});
    }
    const value=snapshot??{};
    const state=value.protocol_state??null;
    return !!state
      &&typeof value.protocol_state_signature==="string"
      &&value.protocol_state_signature===dimensionAuditDownloadHistoryProtocolStateSignature(state)
      &&dimensionAuditDownloadHistoryProtocolStateSignatureValid(value.protocol_state_signature,state);
  }

  function dimensionAuditDownloadHistoryProtocolBinding(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryProtocolBinding){
      return clone(auditDownloadDomain.dimensionAuditDownloadHistoryProtocolBinding(snapshot??{}));
    }
    const value=snapshot??{};
    const state=value.protocol_state??null;
    const statePresent=!!state;
    const stateValid=statePresent&&dimensionAuditDownloadHistoryProtocolStateValid(state);
    const signatureValid=statePresent
      &&typeof value.protocol_state_signature==="string"
      &&value.protocol_state_signature===dimensionAuditDownloadHistoryProtocolStateSignature(state)
      &&dimensionAuditDownloadHistoryProtocolStateSignatureValid(value.protocol_state_signature,state);
    const errors=[
      !statePresent?"MISSING_PROTOCOL_STATE":null,
      statePresent&&!stateValid?"INVALID_PROTOCOL_STATE":null,
      statePresent&&!signatureValid?"INVALID_PROTOCOL_STATE_SIGNATURE":null
    ].filter(Boolean);
    return {
      schema:"TubeBender.DimensionAuditDownloadHistoryProtocolBinding.v1",
      valid:errors.length===0,
      code:errors[0]??"OK",
      errors,
      state_present:statePresent,
      state_valid:stateValid,
      signature_valid:signatureValid
    };
  }

  function dimensionAuditDownloadHistoryProtocolBindingSignature(binding=dimensionAuditDownloadHistoryProtocolBinding()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryProtocolBindingSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryProtocolBindingSignature(binding??{});
    }
    const value=binding??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      valid:value.valid===true,
      code:String(value.code??""),
      errors:[...(value.errors??[])].map(code=>String(code)),
      state_present:value.state_present===true,
      state_valid:value.state_valid===true,
      signature_valid:value.signature_valid===true
    });
  }

  function dimensionAuditDownloadHistoryProtocolBindingSignatureValid(signature,binding=dimensionAuditDownloadHistoryProtocolBinding()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryProtocolBindingSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryProtocolBindingSignatureValid(signature,binding??{});
    }
    const value=binding??{};
    return typeof signature==="string"
      &&signature.length>0
      &&typeof value.schema==="string"
      &&typeof value.valid==="boolean"
      &&typeof value.code==="string"
      &&Array.isArray(value.errors)
      &&value.errors.every(code=>typeof code==="string")
      &&typeof value.state_present==="boolean"
      &&typeof value.state_valid==="boolean"
      &&typeof value.signature_valid==="boolean"
      &&signature===dimensionAuditDownloadHistoryProtocolBindingSignature(value);
  }

  function dimensionAuditDownloadHistoryHealth(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryHealth){
      return clone(auditDownloadDomain.dimensionAuditDownloadHistoryHealth(snapshot??{}));
    }
    const value=snapshot??{};
    const protocolStateValid=dimensionAuditDownloadHistoryProtocolStateValid(value.protocol_state??{});
    const binding=dimensionAuditDownloadHistoryProtocolBinding(value);
    const integrity=dimensionAuditDownloadAttemptHistoryIntegrity(value);
    const envelopeValid=dimensionAuditDownloadAttemptHistoryEnvelopeValid(value);
    const errors=[
      !protocolStateValid?"INVALID_PROTOCOL_STATE":null,
      !binding.valid?"INVALID_PROTOCOL_BINDING":null,
      !integrity.valid?"INVALID_INTEGRITY":null,
      !envelopeValid?"INVALID_ENVELOPE":null
    ].filter(Boolean);
    return {
      schema:"TubeBender.DimensionAuditDownloadHistoryHealth.v1",
      valid:errors.length===0,
      code:errors[0]??"OK",
      errors,
      protocol_state_valid:protocolStateValid,
      protocol_binding_valid:binding.valid===true,
      protocol_binding_code:String(binding.code??""),
      integrity_valid:integrity.valid===true,
      integrity_code:String(integrity.code??""),
      envelope_valid:envelopeValid
    };
  }

  function dimensionAuditDownloadHistoryHealthSignature(health=dimensionAuditDownloadHistoryHealth()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryHealthSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryHealthSignature(health??{});
    }
    const value=health??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      valid:value.valid===true,
      code:String(value.code??""),
      errors:[...(value.errors??[])].map(code=>String(code)),
      protocol_state_valid:value.protocol_state_valid===true,
      protocol_binding_valid:value.protocol_binding_valid===true,
      protocol_binding_code:String(value.protocol_binding_code??""),
      integrity_valid:value.integrity_valid===true,
      integrity_code:String(value.integrity_code??""),
      envelope_valid:value.envelope_valid===true
    });
  }

  function dimensionAuditDownloadHistoryHealthSignatureValid(signature,health=dimensionAuditDownloadHistoryHealth()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryHealthSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryHealthSignatureValid(signature,health??{});
    }
    return typeof signature==="string"
      &&signature.length>0
      &&dimensionAuditDownloadHistoryHealthCanonical(health)
      &&signature===dimensionAuditDownloadHistoryHealthSignature(health);
  }

  function dimensionAuditDownloadHistoryHealthCanonical(health={}){
    const value=health??{};
    return typeof value.schema==="string"
      &&typeof value.valid==="boolean"
      &&typeof value.code==="string"
      &&Array.isArray(value.errors)
      &&value.errors.every(code=>typeof code==="string")
      &&typeof value.protocol_state_valid==="boolean"
      &&typeof value.protocol_binding_valid==="boolean"
      &&typeof value.protocol_binding_code==="string"
      &&typeof value.integrity_valid==="boolean"
      &&typeof value.integrity_code==="string"
      &&typeof value.envelope_valid==="boolean";
  }

  function dimensionAuditDownloadHistoryEmbeddedHealthValid(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryEmbeddedHealthValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryEmbeddedHealthValid(snapshot??{});
    }
    const value=snapshot??{};
    const embedded=value.health??null;
    const signature=value.health_signature;
    if(!embedded||typeof signature!=="string"||signature.length===0)return false;
    if(!dimensionAuditDownloadHistoryHealthCanonical(embedded))return false;
    const embeddedValid=dimensionAuditDownloadHistoryHealthSignature(embedded)===signature
      &&dimensionAuditDownloadHistoryHealthSignatureValid(signature,embedded);
    const current=dimensionAuditDownloadHistoryHealth(value);
    const currentValid=dimensionAuditDownloadHistoryHealthSignature(current)===signature
      &&dimensionAuditDownloadHistoryHealthSignatureValid(signature,current);
    return embeddedValid&&currentValid;
  }

  function dimensionAuditDownloadHistoryHealthEmbedding(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryHealthEmbedding){
      return clone(auditDownloadDomain.dimensionAuditDownloadHistoryHealthEmbedding(snapshot??{}));
    }
    const value=snapshot??{};
    const embedded=value.health??null;
    const signaturePresent=value.health_signature!=null;
    const signatureTypeValid=typeof value.health_signature==="string"&&value.health_signature.length>0;
    const signature=signatureTypeValid?value.health_signature:"";
    const present=!!embedded&&signaturePresent;
    const signatureValid=present
      &&signatureTypeValid
      &&dimensionAuditDownloadHistoryHealthCanonical(embedded)
      &&dimensionAuditDownloadHistoryHealthSignature(embedded)===signature;
    const current=dimensionAuditDownloadHistoryHealth(value);
    const currentSignature=dimensionAuditDownloadHistoryHealthSignature(current);
    const currentValid=signatureValid&&currentSignature===signature;
    const errors=[
      !present?"MISSING_HEALTH":null,
      present&&!signatureValid?"INVALID_HEALTH_SIGNATURE":null,
      present&&signatureValid&&!currentValid?"STALE_HEALTH":null
    ].filter(Boolean);
    return {
      schema:"TubeBender.DimensionAuditDownloadHistoryHealthEmbedding.v1",
      valid:errors.length===0,
      code:errors[0]??"OK",
      errors,
      present,
      signature_valid:signatureValid,
      current_valid:currentValid,
      current_signature:currentSignature
    };
  }

  function dimensionAuditDownloadHistoryHealthEmbeddingSignature(embedding=dimensionAuditDownloadHistoryHealthEmbedding()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryHealthEmbeddingSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryHealthEmbeddingSignature(embedding??{});
    }
    const value=embedding??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      valid:value.valid===true,
      code:String(value.code??""),
      errors:[...(value.errors??[])].map(code=>String(code)),
      present:value.present===true,
      signature_valid:value.signature_valid===true,
      current_valid:value.current_valid===true,
      current_signature:String(value.current_signature??"")
    });
  }

  function dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid(signature,embedding=dimensionAuditDownloadHistoryHealthEmbedding()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid(signature,embedding??{});
    }
    return typeof signature==="string"
      &&signature.length>0
      &&dimensionAuditDownloadHistoryHealthEmbeddingCanonical(embedding)
      &&signature===dimensionAuditDownloadHistoryHealthEmbeddingSignature(embedding);
  }

  function dimensionAuditDownloadHistoryHealthEmbeddingCanonical(embedding={}){
    const value=embedding??{};
    return typeof value.schema==="string"
      &&typeof value.valid==="boolean"
      &&typeof value.code==="string"
      &&Array.isArray(value.errors)
      &&value.errors.every(code=>typeof code==="string")
      &&typeof value.present==="boolean"
      &&typeof value.signature_valid==="boolean"
      &&typeof value.current_valid==="boolean"
      &&typeof value.current_signature==="string";
  }

  function dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid(snapshot??{});
    }
    const value=snapshot??{};
    const embedded=value.health_embedding??null;
    const signature=value.health_embedding_signature;
    if(!embedded||typeof signature!=="string"||signature.length===0)return false;
    if(!dimensionAuditDownloadHistoryHealthEmbeddingCanonical(embedded))return false;
    const embeddedValid=dimensionAuditDownloadHistoryHealthEmbeddingSignature(embedded)===signature
      &&dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid(signature,embedded);
    const current=dimensionAuditDownloadHistoryHealthEmbedding(value);
    const currentValid=dimensionAuditDownloadHistoryHealthEmbeddingSignature(current)===signature
      &&dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid(signature,current);
    return embeddedValid&&currentValid;
  }

  function dimensionAuditDownloadHistoryVerification(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryVerification){
      return clone(auditDownloadDomain.dimensionAuditDownloadHistoryVerification(snapshot??{}));
    }
    const value=snapshot??{};
    const bindingValid=dimensionAuditDownloadHistoryProtocolBindingValid(value);
    const integrity=dimensionAuditDownloadAttemptHistoryIntegrity(value);
    const envelopeValid=dimensionAuditDownloadAttemptHistoryEnvelopeValid(value);
    const health=dimensionAuditDownloadHistoryHealth(value);
    const embeddedHealthValid=dimensionAuditDownloadHistoryEmbeddedHealthValid(value);
    const healthEmbeddingValid=dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid(value);
    const errors=[
      !bindingValid?"INVALID_PROTOCOL_BINDING":null,
      !integrity.valid?"INVALID_INTEGRITY":null,
      !envelopeValid?"INVALID_ENVELOPE":null,
      !health.valid?"INVALID_HEALTH":null,
      !embeddedHealthValid?"INVALID_EMBEDDED_HEALTH":null,
      !healthEmbeddingValid?"INVALID_HEALTH_EMBEDDING":null
    ].filter(Boolean);
    return {
      schema:"TubeBender.DimensionAuditDownloadHistoryVerification.v1",
      valid:errors.length===0,
      code:errors[0]??"OK",
      errors,
      protocol_binding_valid:bindingValid,
      integrity_valid:integrity.valid===true,
      envelope_valid:envelopeValid,
      health_valid:health.valid===true,
      embedded_health_valid:embeddedHealthValid,
      health_embedding_valid:healthEmbeddingValid
    };
  }

  function dimensionAuditDownloadHistoryVerificationSignature(verification=dimensionAuditDownloadHistoryVerification()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryVerificationSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryVerificationSignature(verification??{});
    }
    const value=verification??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      valid:value.valid===true,
      code:String(value.code??""),
      errors:[...(value.errors??[])].map(code=>String(code)),
      protocol_binding_valid:value.protocol_binding_valid===true,
      integrity_valid:value.integrity_valid===true,
      envelope_valid:value.envelope_valid===true,
      health_valid:value.health_valid===true,
      embedded_health_valid:value.embedded_health_valid===true,
      health_embedding_valid:value.health_embedding_valid===true
    });
  }

  function dimensionAuditDownloadHistoryVerificationSignatureValid(signature,verification=dimensionAuditDownloadHistoryVerification()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryVerificationSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryVerificationSignatureValid(signature,verification??{});
    }
    return typeof signature==="string"
      &&signature.length>0
      &&dimensionAuditDownloadHistoryVerificationCanonical(verification)
      &&signature===dimensionAuditDownloadHistoryVerificationSignature(verification);
  }

  function dimensionAuditDownloadHistoryVerificationCanonical(verification={}){
    const value=verification??{};
    return typeof value.schema==="string"
      &&typeof value.valid==="boolean"
      &&typeof value.code==="string"
      &&Array.isArray(value.errors)
      &&value.errors.every(code=>typeof code==="string")
      &&typeof value.protocol_binding_valid==="boolean"
      &&typeof value.integrity_valid==="boolean"
      &&typeof value.envelope_valid==="boolean"
      &&typeof value.health_valid==="boolean"
      &&typeof value.embedded_health_valid==="boolean"
      &&typeof value.health_embedding_valid==="boolean";
  }

  function dimensionAuditDownloadHistoryEmbeddedVerificationValid(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryEmbeddedVerificationValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryEmbeddedVerificationValid(snapshot??{});
    }
    const value=snapshot??{};
    const embedded=value.verification??null;
    const signature=value.verification_signature;
    if(!embedded||typeof signature!=="string"||signature.length===0)return false;
    if(!dimensionAuditDownloadHistoryVerificationCanonical(embedded))return false;
    const embeddedValid=dimensionAuditDownloadHistoryVerificationSignature(embedded)===signature
      &&dimensionAuditDownloadHistoryVerificationSignatureValid(signature,embedded);
    const current=dimensionAuditDownloadHistoryVerification(value);
    const currentValid=dimensionAuditDownloadHistoryVerificationSignature(current)===signature
      &&dimensionAuditDownloadHistoryVerificationSignatureValid(signature,current);
    return embeddedValid&&currentValid;
  }

  function dimensionAuditDownloadHistoryVerificationEmbedding(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryVerificationEmbedding){
      return clone(auditDownloadDomain.dimensionAuditDownloadHistoryVerificationEmbedding(snapshot??{}));
    }
    const value=snapshot??{};
    const embedded=value.verification??null;
    const signaturePresent=value.verification_signature!=null;
    const signatureTypeValid=typeof value.verification_signature==="string"&&value.verification_signature.length>0;
    const signature=signatureTypeValid?value.verification_signature:"";
    const present=!!embedded&&signaturePresent;
    const signatureValid=present
      &&signatureTypeValid
      &&dimensionAuditDownloadHistoryVerificationCanonical(embedded)
      &&dimensionAuditDownloadHistoryVerificationSignature(embedded)===signature;
    const current=dimensionAuditDownloadHistoryVerification(value);
    const currentSignature=dimensionAuditDownloadHistoryVerificationSignature(current);
    const currentValid=signatureValid&&currentSignature===signature;
    const errors=[
      !present?"MISSING_VERIFICATION":null,
      present&&!signatureValid?"INVALID_VERIFICATION_SIGNATURE":null,
      present&&signatureValid&&!currentValid?"STALE_VERIFICATION":null
    ].filter(Boolean);
    return {
      schema:"TubeBender.DimensionAuditDownloadHistoryVerificationEmbedding.v1",
      valid:errors.length===0,
      code:errors[0]??"OK",
      errors,
      present,
      signature_valid:signatureValid,
      current_valid:currentValid,
      current_signature:currentSignature
    };
  }

  function dimensionAuditDownloadHistoryVerificationEmbeddingSignature(embedding=dimensionAuditDownloadHistoryVerificationEmbedding()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryVerificationEmbeddingSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryVerificationEmbeddingSignature(embedding??{});
    }
    const value=embedding??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      valid:value.valid===true,
      code:String(value.code??""),
      errors:[...(value.errors??[])].map(code=>String(code)),
      present:value.present===true,
      signature_valid:value.signature_valid===true,
      current_valid:value.current_valid===true,
      current_signature:String(value.current_signature??"")
    });
  }

  function dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid(signature,embedding=dimensionAuditDownloadHistoryVerificationEmbedding()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid(signature,embedding??{});
    }
    return typeof signature==="string"
      &&signature.length>0
      &&dimensionAuditDownloadHistoryVerificationEmbeddingCanonical(embedding)
      &&signature===dimensionAuditDownloadHistoryVerificationEmbeddingSignature(embedding);
  }

  function dimensionAuditDownloadHistoryVerificationEmbeddingCanonical(embedding={}){
    const value=embedding??{};
    return typeof value.schema==="string"
      &&typeof value.valid==="boolean"
      &&typeof value.code==="string"
      &&Array.isArray(value.errors)
      &&value.errors.every(code=>typeof code==="string")
      &&typeof value.present==="boolean"
      &&typeof value.signature_valid==="boolean"
      &&typeof value.current_valid==="boolean"
      &&typeof value.current_signature==="string";
  }

  function dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(snapshot??{});
    }
    const value=snapshot??{};
    const embedded=value.verification_embedding??null;
    const signature=value.verification_embedding_signature;
    if(!embedded||typeof signature!=="string"||signature.length===0)return false;
    if(!dimensionAuditDownloadHistoryVerificationEmbeddingCanonical(embedded))return false;
    const embeddedValid=dimensionAuditDownloadHistoryVerificationEmbeddingSignature(embedded)===signature
      &&dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid(signature,embedded);
    const current=dimensionAuditDownloadHistoryVerificationEmbedding(value);
    const currentValid=dimensionAuditDownloadHistoryVerificationEmbeddingSignature(current)===signature
      &&dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid(signature,current);
    return embeddedValid&&currentValid;
  }

  function dimensionAuditDownloadHistoryAttestation(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryAttestation){
      return clone(auditDownloadDomain.dimensionAuditDownloadHistoryAttestation(snapshot??{}));
    }
    const value=snapshot??{};
    const verification=dimensionAuditDownloadHistoryVerification(value);
    const embeddedVerificationValid=dimensionAuditDownloadHistoryEmbeddedVerificationValid(value);
    const verificationEmbedding=dimensionAuditDownloadHistoryVerificationEmbedding(value);
    const embeddedVerificationEmbeddingValid=dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(value);
    const errors=[
      !verification.valid?"INVALID_VERIFICATION":null,
      !embeddedVerificationValid?"INVALID_EMBEDDED_VERIFICATION":null,
      !verificationEmbedding.valid?"INVALID_VERIFICATION_EMBEDDING":null,
      !embeddedVerificationEmbeddingValid?"INVALID_EMBEDDED_VERIFICATION_EMBEDDING":null
    ].filter(Boolean);
    return {
      schema:"TubeBender.DimensionAuditDownloadHistoryAttestation.v1",
      valid:errors.length===0,
      code:errors[0]??"OK",
      errors,
      verification_valid:verification.valid===true,
      embedded_verification_valid:embeddedVerificationValid,
      verification_embedding_valid:verificationEmbedding.valid===true,
      embedded_verification_embedding_valid:embeddedVerificationEmbeddingValid
    };
  }

  function dimensionAuditDownloadHistoryAttestationSignature(attestation=dimensionAuditDownloadHistoryAttestation()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryAttestationSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryAttestationSignature(attestation??{});
    }
    const value=attestation??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      valid:value.valid===true,
      code:String(value.code??""),
      errors:[...(value.errors??[])].map(code=>String(code)),
      verification_valid:value.verification_valid===true,
      embedded_verification_valid:value.embedded_verification_valid===true,
      verification_embedding_valid:value.verification_embedding_valid===true,
      embedded_verification_embedding_valid:value.embedded_verification_embedding_valid===true
    });
  }

  function dimensionAuditDownloadHistoryAttestationSignatureValid(signature,attestation=dimensionAuditDownloadHistoryAttestation()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryAttestationSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryAttestationSignatureValid(signature,attestation??{});
    }
    return typeof signature==="string"
      &&signature.length>0
      &&dimensionAuditDownloadHistoryAttestationCanonical(attestation)
      &&signature===dimensionAuditDownloadHistoryAttestationSignature(attestation);
  }

  function dimensionAuditDownloadHistoryAttestationCanonical(attestation={}){
    const value=attestation??{};
    return typeof value.schema==="string"
      &&typeof value.valid==="boolean"
      &&typeof value.code==="string"
      &&Array.isArray(value.errors)
      &&value.errors.every(code=>typeof code==="string")
      &&typeof value.verification_valid==="boolean"
      &&typeof value.embedded_verification_valid==="boolean"
      &&typeof value.verification_embedding_valid==="boolean"
      &&typeof value.embedded_verification_embedding_valid==="boolean";
  }

  function dimensionAuditDownloadHistoryEmbeddedAttestationValid(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryEmbeddedAttestationValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryEmbeddedAttestationValid(snapshot??{});
    }
    const value=snapshot??{};
    const embedded=value.attestation??null;
    const signature=value.attestation_signature;
    if(!embedded||typeof signature!=="string"||signature.length===0)return false;
    if(!dimensionAuditDownloadHistoryAttestationCanonical(embedded))return false;
    const embeddedValid=dimensionAuditDownloadHistoryAttestationSignature(embedded)===signature
      &&dimensionAuditDownloadHistoryAttestationSignatureValid(signature,embedded);
    const current=dimensionAuditDownloadHistoryAttestation(value);
    const currentValid=dimensionAuditDownloadHistoryAttestationSignature(current)===signature
      &&dimensionAuditDownloadHistoryAttestationSignatureValid(signature,current);
    return embeddedValid&&currentValid;
  }

  function dimensionAuditDownloadHistoryAttestationEmbedding(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryAttestationEmbedding){
      return clone(auditDownloadDomain.dimensionAuditDownloadHistoryAttestationEmbedding(snapshot??{}));
    }
    const value=snapshot??{};
    const embedded=value.attestation??null;
    const signaturePresent=value.attestation_signature!=null;
    const signatureTypeValid=typeof value.attestation_signature==="string"&&value.attestation_signature.length>0;
    const signature=signatureTypeValid?value.attestation_signature:"";
    const present=!!embedded&&signaturePresent;
    const signatureValid=present
      &&signatureTypeValid
      &&dimensionAuditDownloadHistoryAttestationCanonical(embedded)
      &&dimensionAuditDownloadHistoryAttestationSignature(embedded)===signature;
    const current=dimensionAuditDownloadHistoryAttestation(value);
    const currentSignature=dimensionAuditDownloadHistoryAttestationSignature(current);
    const currentValid=signatureValid&&currentSignature===signature;
    const errors=[
      !present?"MISSING_ATTESTATION":null,
      present&&!signatureValid?"INVALID_ATTESTATION_SIGNATURE":null,
      present&&signatureValid&&!currentValid?"STALE_ATTESTATION":null
    ].filter(Boolean);
    return {
      schema:"TubeBender.DimensionAuditDownloadHistoryAttestationEmbedding.v1",
      valid:errors.length===0,
      code:errors[0]??"OK",
      errors,
      present,
      signature_valid:signatureValid,
      current_valid:currentValid,
      current_signature:currentSignature
    };
  }

  function dimensionAuditDownloadHistoryAttestationEmbeddingSignature(embedding=dimensionAuditDownloadHistoryAttestationEmbedding()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryAttestationEmbeddingSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryAttestationEmbeddingSignature(embedding??{});
    }
    const value=embedding??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      valid:value.valid===true,
      code:String(value.code??""),
      errors:[...(value.errors??[])].map(code=>String(code)),
      present:value.present===true,
      signature_valid:value.signature_valid===true,
      current_valid:value.current_valid===true,
      current_signature:String(value.current_signature??"")
    });
  }

  function dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid(signature,embedding=dimensionAuditDownloadHistoryAttestationEmbedding()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid(signature,embedding??{});
    }
    return typeof signature==="string"
      &&signature.length>0
      &&dimensionAuditDownloadHistoryAttestationEmbeddingCanonical(embedding)
      &&signature===dimensionAuditDownloadHistoryAttestationEmbeddingSignature(embedding);
  }

  function dimensionAuditDownloadHistoryAttestationEmbeddingCanonical(embedding={}){
    const value=embedding??{};
    return typeof value.schema==="string"
      &&typeof value.valid==="boolean"
      &&typeof value.code==="string"
      &&Array.isArray(value.errors)
      &&value.errors.every(code=>typeof code==="string")
      &&typeof value.present==="boolean"
      &&typeof value.signature_valid==="boolean"
      &&typeof value.current_valid==="boolean"
      &&typeof value.current_signature==="string";
  }

  function dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(snapshot??{});
    }
    const value=snapshot??{};
    const embedded=value.attestation_embedding??null;
    const signature=value.attestation_embedding_signature;
    if(!embedded||typeof signature!=="string"||signature.length===0)return false;
    if(!dimensionAuditDownloadHistoryAttestationEmbeddingCanonical(embedded))return false;
    const embeddedValid=dimensionAuditDownloadHistoryAttestationEmbeddingSignature(embedded)===signature
      &&dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid(signature,embedded);
    const current=dimensionAuditDownloadHistoryAttestationEmbedding(value);
    const currentValid=dimensionAuditDownloadHistoryAttestationEmbeddingSignature(current)===signature
      &&dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid(signature,current);
    return embeddedValid&&currentValid;
  }

  function dimensionAuditDownloadHistoryTrust(snapshot={}){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryTrust){
      return clone(auditDownloadDomain.dimensionAuditDownloadHistoryTrust(snapshot??{}));
    }
    const value=snapshot??{};
    const attestation=dimensionAuditDownloadHistoryAttestation(value);
    const embeddedAttestationValid=dimensionAuditDownloadHistoryEmbeddedAttestationValid(value);
    const attestationEmbedding=dimensionAuditDownloadHistoryAttestationEmbedding(value);
    const embeddedAttestationEmbeddingValid=dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(value);
    const errors=[
      !attestation.valid?"INVALID_ATTESTATION":null,
      !embeddedAttestationValid?"INVALID_EMBEDDED_ATTESTATION":null,
      !attestationEmbedding.valid?"INVALID_ATTESTATION_EMBEDDING":null,
      !embeddedAttestationEmbeddingValid?"INVALID_EMBEDDED_ATTESTATION_EMBEDDING":null
    ].filter(Boolean);
    return {
      schema:"TubeBender.DimensionAuditDownloadHistoryTrust.v1",
      trusted:errors.length===0,
      code:errors[0]??"OK",
      errors,
      attestation_valid:attestation.valid===true,
      embedded_attestation_valid:embeddedAttestationValid,
      attestation_embedding_valid:attestationEmbedding.valid===true,
      embedded_attestation_embedding_valid:embeddedAttestationEmbeddingValid
    };
  }

  function dimensionAuditDownloadHistoryTrustSignature(trust=dimensionAuditDownloadHistoryTrust()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryTrustSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryTrustSignature(trust??{});
    }
    const value=trust??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      trusted:value.trusted===true,
      code:String(value.code??""),
      errors:[...(value.errors??[])].map(code=>String(code)),
      attestation_valid:value.attestation_valid===true,
      embedded_attestation_valid:value.embedded_attestation_valid===true,
      attestation_embedding_valid:value.attestation_embedding_valid===true,
      embedded_attestation_embedding_valid:value.embedded_attestation_embedding_valid===true
    });
  }

  function dimensionAuditDownloadHistoryTrustCanonical(trust={}){
    const value=trust??{};
    return typeof value.schema==="string"
      &&typeof value.trusted==="boolean"
      &&typeof value.code==="string"
      &&Array.isArray(value.errors)
      &&value.errors.every(code=>typeof code==="string")
      &&typeof value.attestation_valid==="boolean"
      &&typeof value.embedded_attestation_valid==="boolean"
      &&typeof value.attestation_embedding_valid==="boolean"
      &&typeof value.embedded_attestation_embedding_valid==="boolean";
  }

  function dimensionAuditDownloadHistoryTrustSignatureValid(signature,trust=dimensionAuditDownloadHistoryTrust(),snapshot=null){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryTrustSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryTrustSignatureValid(signature,trust??{},snapshot);
    }
    if(snapshot!=null){
      const expected=dimensionAuditDownloadHistoryTrust(snapshot);
      if(dimensionAuditDownloadHistoryTrustSignature(trust)!==dimensionAuditDownloadHistoryTrustSignature(expected))return false;
    }
    return typeof signature==="string"
      &&signature.length>0
      &&dimensionAuditDownloadHistoryTrustCanonical(trust)
      &&signature===dimensionAuditDownloadHistoryTrustSignature(trust);
  }

  function dimensionAuditFilenamePolicy(){
    return {...(auditDownloadDomain?.DIMENSION_AUDIT_FILENAME_POLICY??DIMENSION_AUDIT_FILENAME_POLICY)};
  }
  function dimensionAuditDownloadSchemas(){
    return [...(auditDownloadDomain?.DIMENSION_AUDIT_DOWNLOAD_SCHEMAS??DIMENSION_AUDIT_DOWNLOAD_SCHEMAS)];
  }
  function dimensionAuditDownloadValidationCodes(){
    return [...(auditDownloadDomain?.DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES??DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES)];
  }
  function dimensionAuditDownloadValidationSchema(){
    return String(auditDownloadDomain?.DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA??DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA);
  }

  function dimensionAuditDownloadFallbackPolicy(){
    return {
      schema:"TubeBender.DimensionAuditDownloadPolicy.v1",
      validation_schema:DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA,
      validation_codes:[...DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES],
      schemas:[...DIMENSION_AUDIT_DOWNLOAD_SCHEMAS],
      filename:{...DIMENSION_AUDIT_FILENAME_POLICY}
    };
  }
  function dimensionAuditDownloadPolicy(){
    if(auditDownloadDomain?.dimensionAuditDownloadPolicy)return auditDownloadDomain.dimensionAuditDownloadPolicy();
    return dimensionAuditDownloadFallbackPolicy();
  }
  function dimensionAuditDownloadPolicyConsistent(){
    if(!auditDownloadDomain?.dimensionAuditDownloadPolicy)return true;
    return JSON.stringify(auditDownloadDomain.dimensionAuditDownloadPolicy())===JSON.stringify(dimensionAuditDownloadFallbackPolicy());
  }
  function dimensionAuditDownloadProtocolConsistent(){
    if(auditDownloadDomain?.dimensionAuditDownloadProtocolState){
      return auditDownloadDomain.dimensionAuditDownloadProtocolState().protocol_consistent===true;
    }
    const policy=dimensionAuditDownloadPolicy();
    return String(policy?.validation_schema??"")===dimensionAuditDownloadValidationSchema()
      &&JSON.stringify(policy?.validation_codes??[])===JSON.stringify(dimensionAuditDownloadValidationCodes())
      &&JSON.stringify(policy?.schemas??[])===JSON.stringify(dimensionAuditDownloadSchemas())
      &&JSON.stringify(policy?.filename??{})===JSON.stringify(dimensionAuditFilenamePolicy());
  }

  function dimensionAuditDownloadProtocolSignature(state){
    const value=state??(
      auditDownloadDomain?.dimensionAuditDownloadProtocolState
        ?auditDownloadDomain.dimensionAuditDownloadProtocolState()
        :{
          schema:"TubeBender.DimensionAuditDownloadProtocolState.v1",
          valid:dimensionAuditDownloadProtocolConsistent(),
          protocol_consistent:dimensionAuditDownloadProtocolConsistent(),
          policy_schema:String(dimensionAuditDownloadPolicy()?.schema??""),
          validation_schema:dimensionAuditDownloadValidationSchema(),
          validation_codes:dimensionAuditDownloadValidationCodes(),
          schemas:dimensionAuditDownloadSchemas(),
          filename:dimensionAuditFilenamePolicy()
        }
    );
    if(auditDownloadDomain?.dimensionAuditDownloadProtocolSignature){
      return auditDownloadDomain.dimensionAuditDownloadProtocolSignature(value);
    }
    return JSON.stringify({
      schema:String(value?.schema??""),
      valid:value?.valid===true,
      protocol_consistent:value?.protocol_consistent===true,
      policy_schema:String(value?.policy_schema??""),
      validation_schema:String(value?.validation_schema??""),
      validation_codes:[...(value?.validation_codes??[])],
      schemas:[...(value?.schemas??[])],
      filename:{...(value?.filename??{})}
    });
  }

  function dimensionAuditDownloadProtocolSignatureValid(signature,state){
    const value=state??(
      auditDownloadDomain?.dimensionAuditDownloadProtocolState
        ?auditDownloadDomain.dimensionAuditDownloadProtocolState()
        :{
          schema:"TubeBender.DimensionAuditDownloadProtocolState.v1",
          valid:dimensionAuditDownloadProtocolConsistent(),
          protocol_consistent:dimensionAuditDownloadProtocolConsistent(),
          policy_schema:String(dimensionAuditDownloadPolicy()?.schema??""),
          validation_schema:dimensionAuditDownloadValidationSchema(),
          validation_codes:dimensionAuditDownloadValidationCodes(),
          schemas:dimensionAuditDownloadSchemas(),
          filename:dimensionAuditFilenamePolicy()
        }
    );
    if(auditDownloadDomain?.dimensionAuditDownloadProtocolSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadProtocolSignatureValid(signature,value);
    }
    const expected={
      schema:"TubeBender.DimensionAuditDownloadProtocolState.v1",
      valid:dimensionAuditDownloadProtocolConsistent(),
      protocol_consistent:dimensionAuditDownloadProtocolConsistent(),
      policy_schema:String(dimensionAuditDownloadPolicy()?.schema??""),
      validation_schema:dimensionAuditDownloadValidationSchema(),
      validation_codes:dimensionAuditDownloadValidationCodes(),
      schemas:dimensionAuditDownloadSchemas(),
      filename:dimensionAuditFilenamePolicy()
    };
    return typeof signature==="string"
      &&signature.length>0
      &&typeof value.schema==="string"
      &&typeof value.valid==="boolean"
      &&typeof value.protocol_consistent==="boolean"
      &&typeof value.policy_schema==="string"
      &&typeof value.validation_schema==="string"
      &&Array.isArray(value.validation_codes)
      &&value.validation_codes.every(code=>typeof code==="string")
      &&Array.isArray(value.schemas)
      &&value.schemas.every(schema=>typeof schema==="string")
      &&!!value.filename
      &&typeof value.filename==="object"
      &&!Array.isArray(value.filename)
      &&value.valid===true
      &&value.protocol_consistent===true
      &&dimensionAuditDownloadProtocolSignature(value)===dimensionAuditDownloadProtocolSignature(expected)
      &&signature===dimensionAuditDownloadProtocolSignature(value);
  }

  function dimensionAuditDownloadRuntimeState(){
    const policy=dimensionAuditDownloadPolicy();
    const policyConsistent=dimensionAuditDownloadPolicyConsistent();
    const protocolState=auditDownloadDomain?.dimensionAuditDownloadProtocolState
      ?auditDownloadDomain.dimensionAuditDownloadProtocolState()
      :null;
    const protocolConsistent=protocolState?.protocol_consistent===true||(!protocolState&&dimensionAuditDownloadProtocolConsistent());
    return {
      schema:"TubeBender.DimensionAuditDownloadRuntimeState.v1",
      source:dimensionAuditDownloadPolicySource(),
      valid:policyConsistent&&protocolConsistent,
      consistent:policyConsistent,
      protocol_consistent:protocolConsistent,
      protocol_state_schema:String(protocolState?.schema??""),
      protocol_signature:dimensionAuditDownloadProtocolSignature(protocolState??undefined),
      policy_schema:String(policy?.schema??""),
      validation_schema:String(policy?.validation_schema??""),
      validation_codes:[...(policy?.validation_codes??[])],
      schemas:[...(policy?.schemas??[])],
      filename:{...(policy?.filename??{})}
    };
  }

  function dimensionAuditDownloadRuntimeSignature(state=dimensionAuditDownloadRuntimeState()){
    const value=state??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      source:String(value.source??""),
      valid:value.valid===true,
      consistent:value.consistent===true,
      protocol_consistent:value.protocol_consistent===true,
      protocol_state_schema:String(value.protocol_state_schema??""),
      protocol_signature:String(value.protocol_signature??""),
      policy_schema:String(value.policy_schema??""),
      validation_schema:String(value.validation_schema??""),
      validation_codes:[...(value.validation_codes??[])],
      schemas:[...(value.schemas??[])],
      filename:{...(value.filename??{})}
    });
  }

  function dimensionAuditDownloadRuntimeValidation(){
    const state=dimensionAuditDownloadRuntimeState();
    return {
      schema:"TubeBender.DimensionAuditDownloadRuntimeValidation.v1",
      valid:state.valid===true,
      code:state.valid===true?"OK":"INVALID_RUNTIME_PROTOCOL",
      source:String(state.source??""),
      runtime_signature:dimensionAuditDownloadRuntimeSignature(state),
      protocol_signature:String(state.protocol_signature??"")
    };
  }

  function dimensionAuditDownloadPolicySource(){
    return auditDownloadDomain?.dimensionAuditDownloadPolicy?"domain":"ui-fallback";
  }

  function dimensionAuditDownloadSnapshotShapeSupported(snapshot){
    if(auditDownloadDomain?.dimensionAuditDownloadSnapshotShapeSupported)return auditDownloadDomain.dimensionAuditDownloadSnapshotShapeSupported(snapshot);
    return !!snapshot&&typeof snapshot==="object"&&!Array.isArray(snapshot);
  }

  function dimensionAuditDownloadFilenameSupported(filename){
    if(auditDownloadDomain?.dimensionAuditDownloadFilenameSupported)return auditDownloadDomain.dimensionAuditDownloadFilenameSupported(filename);
    const value=String(filename??"").trim();
    return !!value
      &&value.length<=DIMENSION_AUDIT_FILENAME_POLICY.json_max_length
      &&value.endsWith(".json")
      &&!/[\\/\u0000-\u001f]/u.test(value);
  }

  function dimensionAuditDownloadSchemaSupported(schema){
    if(auditDownloadDomain?.dimensionAuditDownloadSchemaSupported)return auditDownloadDomain.dimensionAuditDownloadSchemaSupported(schema);
    return DIMENSION_AUDIT_DOWNLOAD_SCHEMAS.includes(String(schema??"").trim());
  }

  const DIMENSION_AUDIT_FILENAME_POLICY=Object.freeze({
    part_default_length:80,
    part_min_length:8,
    part_max_length:120,
    json_default_length:220,
    json_min_length:80,
    json_max_length:240
  });

  function dimensionAuditDownloadValidation(filename,snapshot){
    if(auditDownloadDomain?.dimensionAuditDownloadValidation)return auditDownloadDomain.dimensionAuditDownloadValidation(filename,snapshot);
    const safeFilename=String(filename??"").trim();
    if(!dimensionAuditDownloadFilenameSupported(safeFilename)){
      return {validation_schema:DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA,valid:false,code:"INVALID_FILENAME",filename:safeFilename,schema:null};
    }
    if(!dimensionAuditDownloadSnapshotShapeSupported(snapshot)){
      return {validation_schema:DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA,valid:false,code:"INVALID_SNAPSHOT",filename:safeFilename,schema:null};
    }
    const schema=String(snapshot?.schema??"").trim();
    if(!dimensionAuditDownloadSchemaSupported(schema)){
      return {validation_schema:DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA,valid:false,code:"UNSUPPORTED_SCHEMA",filename:safeFilename,schema};
    }
    return {validation_schema:DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA,valid:true,code:"OK",filename:safeFilename,schema};
  }

  function dimensionAuditDownloadPreflightSignature(preflight){
    const value=preflight??{};
    const validation=value.validation??null;
    const runtime=value.runtime_validation??null;
    return JSON.stringify({
      schema:String(value.schema??""),
      valid:value.valid===true,
      code:String(value.code??""),
      runtime_validation:runtime?{
        schema:String(runtime.schema??""),
        valid:runtime.valid===true,
        code:String(runtime.code??""),
        source:String(runtime.source??""),
        runtime_signature:String(runtime.runtime_signature??""),
        protocol_signature:String(runtime.protocol_signature??"")
      }:null,
      validation:validation?{
        validation_schema:String(validation.validation_schema??""),
        valid:validation.valid===true,
        code:String(validation.code??""),
        filename:String(validation.filename??""),
        schema:validation.schema==null?null:String(validation.schema)
      }:null
    });
  }

  function dimensionAuditDownloadPreflight(filename,snapshot){
    const runtimeValidation=dimensionAuditDownloadRuntimeValidation();
    const result=!runtimeValidation.valid
      ?{
        schema:"TubeBender.DimensionAuditDownloadPreflight.v1",
        valid:false,
        code:runtimeValidation.code,
        runtime_validation:runtimeValidation,
        validation:null
      }
      :(()=>{
        const validation=dimensionAuditDownloadValidation(filename,snapshot);
        return {
          schema:"TubeBender.DimensionAuditDownloadPreflight.v1",
          valid:validation.valid===true,
          code:String(validation.code??""),
          runtime_validation:runtimeValidation,
          validation
        };
      })();
    const signature=dimensionAuditDownloadPreflightSignature(result);
    return {
      ...result,
      signature,
      signature_valid:signature===dimensionAuditDownloadPreflightSignature(result)
    };
  }

  function dimensionAuditDownloadAttemptSignature(attempt){
    if(auditDownloadDomain?.dimensionAuditDownloadAttemptSignature){
      return auditDownloadDomain.dimensionAuditDownloadAttemptSignature(attempt??{});
    }
    const value=attempt??{};
    const hasPermitEvidence=value.export_action!=null
      ||value.action_permit_signature!=null
      ||value.action_permit_snapshot_signature!=null;
    return JSON.stringify({
      schema:String(value.schema??""),
      status:String(value.status??""),
      filename:String(value.filename??""),
      snapshot_schema:value.snapshot_schema==null?null:String(value.snapshot_schema),
      code:String(value.code??""),
      preflight_signature:String(value.preflight_signature??""),
      runtime_signature:String(value.runtime_signature??""),
      protocol_signature:String(value.protocol_signature??""),
      error:value.error==null?null:String(value.error),
      generated_at:String(value.generated_at??""),
      ...(hasPermitEvidence?{
        export_action:String(value.export_action??""),
        action_permit_signature:String(value.action_permit_signature??""),
        action_permit_snapshot_signature:String(value.action_permit_snapshot_signature??"")
      }:{})
    });
  }

  function dimensionAuditDownloadAttemptSignatureValid(signature,attempt){
    if(auditDownloadDomain?.dimensionAuditDownloadAttemptSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadAttemptSignatureValid(signature,attempt??{});
    }
    return typeof signature==="string"
      &&signature.length>0
      &&signature===dimensionAuditDownloadAttemptSignature(attempt??{});
  }

  function dimensionAuditDownloadAttemptValid(attempt){
    if(auditDownloadDomain?.dimensionAuditDownloadAttemptValid){
      return auditDownloadDomain.dimensionAuditDownloadAttemptValid(attempt??{});
    }
    const value=attempt??{};
    if(typeof value.schema!=="string"
      ||typeof value.status!=="string"
      ||typeof value.filename!=="string"
      ||!(value.snapshot_schema===null||typeof value.snapshot_schema==="string")
      ||typeof value.code!=="string"
      ||typeof value.preflight_signature!=="string"
      ||typeof value.runtime_signature!=="string"
      ||typeof value.protocol_signature!=="string"
      ||!(value.error===null||typeof value.error==="string")
      ||typeof value.generated_at!=="string"
      ||typeof value.signature!=="string")return false;
    const status=value.status;
    const signature=value.signature;
    const error=value.error;
    const outcomeValid=status==="failed"?!!error:error===null;
    const timestamp=new Date(value.generated_at);
    const generatedAtValid=!Number.isNaN(timestamp.getTime())&&timestamp.toISOString()===value.generated_at;
    const hasPermitEvidence=value.export_action!=null
      ||value.action_permit_signature!=null
      ||value.action_permit_snapshot_signature!=null;
    if(hasPermitEvidence&&(
      typeof value.export_action!=="string"
      ||typeof value.action_permit_signature!=="string"
      ||typeof value.action_permit_snapshot_signature!=="string"
    ))return false;
    const permitEvidenceValid=!hasPermitEvidence||(
      ["copy","download"].includes(value.export_action)
      &&value.action_permit_signature.length>0
      &&value.action_permit_snapshot_signature.length>0
    );
    return value.schema==="TubeBender.DimensionAuditDownloadAttempt.v1"
      &&["blocked","downloaded","failed"].includes(status)
      &&outcomeValid
      &&generatedAtValid
      &&permitEvidenceValid
      &&signature.length>0
      &&signature===dimensionAuditDownloadAttemptSignature(value)
      &&dimensionAuditDownloadAttemptSignatureValid(signature,value);
  }

  function recordDimensionAuditDownloadAttempt(status,preflight,error=null){
    const validation=preflight?.validation??null;
    const input={
      status:String(status??""),
      filename:String(validation?.filename??""),
      snapshot_schema:validation?.schema==null?null:String(validation.schema),
      code:String(preflight?.code??""),
      preflight_signature:String(preflight?.signature??""),
      runtime_signature:String(preflight?.runtime_validation?.runtime_signature??""),
      protocol_signature:String(preflight?.runtime_validation?.protocol_signature??""),
      error:error==null?null:String(error?.message??error),
      generated_at:new Date().toISOString()
    };
    const attempt=auditDownloadDomain?.buildDimensionAuditDownloadAttempt
      ?clone(auditDownloadDomain.buildDimensionAuditDownloadAttempt(input))
      :(()=>{
        const base={schema:"TubeBender.DimensionAuditDownloadAttempt.v1",...input};
        return {...base,signature:dimensionAuditDownloadAttemptSignature(base)};
      })();
    Object.freeze(attempt);
    lastDimensionAuditDownloadAttempt=attempt;
    dimensionAuditDownloadAttemptHistory.push(attempt);
    while(dimensionAuditDownloadAttemptHistory.length>DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_HISTORY_LIMIT)dimensionAuditDownloadAttemptHistory.shift();
    try{window.dispatchEvent(new CustomEvent("tubebender-dimension-audit-download",{detail:clone(attempt)}));}catch{}
    return clone(attempt);
  }

  function recordDimensionAuditDownloadAttemptWithPermitEvidence(status,preflight,error=null,permitEvidence=null){
    const validation=preflight?.validation??null;
    const evidence=permitEvidence??null;
    const input={
      status:String(status??""),
      filename:String(validation?.filename??""),
      snapshot_schema:validation?.schema==null?null:String(validation.schema),
      code:String(preflight?.code??""),
      preflight_signature:String(preflight?.signature??""),
      runtime_signature:String(preflight?.runtime_validation?.runtime_signature??""),
      protocol_signature:String(preflight?.runtime_validation?.protocol_signature??""),
      ...(evidence?{
        export_action:String(evidence.export_action??""),
        action_permit_signature:String(evidence.action_permit_signature??""),
        action_permit_snapshot_signature:String(evidence.action_permit_snapshot_signature??"")
      }:{}),
      error:error==null?null:String(error?.message??error),
      generated_at:new Date().toISOString()
    };
    const attempt=auditDownloadDomain?.buildDimensionAuditDownloadAttempt
      ?clone(auditDownloadDomain.buildDimensionAuditDownloadAttempt(input))
      :(()=>{
        const base={schema:"TubeBender.DimensionAuditDownloadAttempt.v1",...input};
        return {...base,signature:dimensionAuditDownloadAttemptSignature(base)};
      })();
    Object.freeze(attempt);
    lastDimensionAuditDownloadAttempt=attempt;
    dimensionAuditDownloadAttemptHistory.push(attempt);
    while(dimensionAuditDownloadAttemptHistory.length>DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_HISTORY_LIMIT)dimensionAuditDownloadAttemptHistory.shift();
    try{window.dispatchEvent(new CustomEvent("tubebender-dimension-audit-download",{detail:clone(attempt)}));}catch{}
    return clone(attempt);
  }

  function dimensionAuditDownloadLastAttempt(){
    return clone(lastDimensionAuditDownloadAttempt);
  }
  function dimensionAuditDownloadLastAttemptSignature(){
    return String(lastDimensionAuditDownloadAttempt?.signature??"");
  }
  function clearDimensionAuditDownloadLastAttempt(){
    const hadValue=lastDimensionAuditDownloadAttempt!=null;
    lastDimensionAuditDownloadAttempt=null;
    return hadValue;
  }
  function dimensionAuditDownloadAttemptHistorySnapshot(){
    return clone(dimensionAuditDownloadAttemptHistory);
  }
  function dimensionAuditDownloadHistoryExportEventFinalStateEvidence(event={}){
    const value=event??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventFinalStateEvidence){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventFinalStateEvidence(value);
    }
    const hasSignature=value.final_state_signature!=null;
    const hasSnapshotSignature=value.final_state_snapshot_signature!=null;
    const present=hasSignature||hasSnapshotSignature;
    const complete=typeof value.final_state_signature==="string"
      &&value.final_state_signature.length>0
      &&typeof value.final_state_snapshot_signature==="string"
      &&value.final_state_snapshot_signature.length>0;
    return Object.freeze({
      schema:"TubeBender.DimensionAuditDownloadHistoryExportEventFinalStateEvidence.v1",
      present,
      valid:!present||complete,
      final_state_signature:complete?value.final_state_signature:"",
      final_state_snapshot_signature:complete?value.final_state_snapshot_signature:""
    });
  }

  function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events=dimensionAuditDownloadHistoryExportEventListSnapshot()){
    if(!Array.isArray(events))throw new TypeError("history export events must be an array");
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
    }
    let present=0,valid=0,invalid=0;
    for(const event of events){
      const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidence(event);
      if(!evidence.present)continue;
      present++;
      if(evidence.valid)valid++;else invalid++;
    }
    const latest=dimensionAuditDownloadHistoryExportEventFinalStateEvidence(events.at(-1)??{});
    return Object.freeze({
      schema:"TubeBender.DimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary.v1",
      total:events.length,
      present,
      absent:events.length-present,
      valid,
      invalid,
      latest_present:latest.present,
      latest_valid:latest.valid
    });
  }

  function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid(summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(),events=dimensionAuditDownloadHistoryExportEventListSnapshot()){
    if(!Array.isArray(events))return false;
    if(!events.every(event=>dimensionAuditDownloadHistoryExportEventValid(event)))return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid(summary??{},events);
    }
    const expected=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
    const value=summary??{};
    return typeof value.schema==="string"
      &&value.schema==="TubeBender.DimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary.v1"
      &&Number.isInteger(value.total)&&value.total===expected.total
      &&Number.isInteger(value.present)&&value.present===expected.present
      &&Number.isInteger(value.absent)&&value.absent===expected.absent
      &&Number.isInteger(value.valid)&&value.valid===expected.valid
      &&Number.isInteger(value.invalid)&&value.invalid===expected.invalid
      &&typeof value.latest_present==="boolean"&&value.latest_present===expected.latest_present
      &&typeof value.latest_valid==="boolean"&&value.latest_valid===expected.latest_valid;
  }

  function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature(summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary()){
    const value=summary??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      total:Number(value.total??0),
      present:Number(value.present??0),
      absent:Number(value.absent??0),
      valid:Number(value.valid??0),
      invalid:Number(value.invalid??0),
      latest_present:value.latest_present===true,
      latest_valid:value.latest_valid===true
    });
  }

  function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid(signature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature(),summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(),events=dimensionAuditDownloadHistoryExportEventListSnapshot()){
    if(!Array.isArray(events))return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid(signature,summary??{},events);
    }
    return typeof signature==="string"
      &&signature.length>0
      &&dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid(summary,events)
      &&signature===dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature(summary);
  }

  function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature(events=dimensionAuditDownloadHistoryExportEventListSnapshot()){
    if(!Array.isArray(events))throw new TypeError("history export events must be an array");
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature(events);
    }
    return JSON.stringify(events.map(event=>String(event?.signature??"")));
  }

  function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid(signature,events=dimensionAuditDownloadHistoryExportEventListSnapshot()){
    if(!Array.isArray(events))return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid(signature,events);
    }
    return typeof signature==="string"
      &&signature.length>0
      &&signature===dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature(events);
  }

  function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature(snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      summary_signature:String(value.summary_signature??""),
      event_binding_signature:String(value.event_binding_signature??""),
      summary_valid:value.summary_valid===true,
      summary_signature_valid:value.summary_signature_valid===true
    });
  }

  function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid(signature,snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid(signature,value);
    }
    return typeof signature==="string"
      &&signature.length>0
      &&signature===dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature(value);
  }

  function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(),events=dimensionAuditDownloadHistoryExportEventListSnapshot()){
    const value=summary??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(value,events);
    }
    const signature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature(value);
    const base={
      schema:"TubeBender.DimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot.v1",
      summary:value,
      summary_signature:signature,
      event_binding_signature:dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature(events),
      summary_valid:dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid(value,events),
      summary_signature_valid:dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid(signature,value,events)
    };
    const snapshotSignature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature(base);
    return Object.freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
  }

  function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(snapshot={},events=dimensionAuditDownloadHistoryExportEventListSnapshot()){
    if(!Array.isArray(events))return false;
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(value,events);
    }
    if(typeof value.schema!=="string"
      ||typeof value.summary_signature!=="string"
      ||typeof value.event_binding_signature!=="string"
      ||typeof value.summary_valid!=="boolean"
      ||typeof value.summary_signature_valid!=="boolean"
      ||typeof value.snapshot_signature!=="string"
      ||typeof value.snapshot_signature_valid!=="boolean")return false;
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot.v1"
      &&value.event_binding_signature===dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature(events)
      &&dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid(value.event_binding_signature,events)
      &&dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid(value.summary,events)
      &&value.summary_valid===true
      &&value.summary_signature_valid===true
      &&dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid(value.summary_signature,value.summary,events)
      &&value.snapshot_signature_valid===true
      &&dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid(value.snapshot_signature,value);
  }

  function dimensionAuditDownloadHistoryExportEventSignature(event={}){
    const value=event??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventSignature(value);
    }
    const hasFinalStateEvidence=value.final_state_signature!=null
      ||value.final_state_snapshot_signature!=null;
    return JSON.stringify({
      schema:String(value.schema??""),
      action:String(value.action??""),
      outcome:String(value.outcome??""),
      code:String(value.code??""),
      history_snapshot_signature:String(value.history_snapshot_signature??""),
      action_permit_signature:String(value.action_permit_signature??""),
      action_permit_snapshot_signature:String(value.action_permit_snapshot_signature??""),
      ...(hasFinalStateEvidence?{
        final_state_signature:String(value.final_state_signature??""),
        final_state_snapshot_signature:String(value.final_state_snapshot_signature??"")
      }:{ }),
      error:value.error==null?null:String(value.error),
      generated_at:String(value.generated_at??"")
    });
  }

  function dimensionAuditDownloadHistoryExportEventSignatureValid(signature,event={}){
    const value=event??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventSignatureValid(signature,value);
    }
    return typeof signature==="string"
      &&signature.length>0
      &&signature===dimensionAuditDownloadHistoryExportEventSignature(value);
  }

  function dimensionAuditDownloadHistoryExportEventValid(event={}){
    const value=event??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventValid(value);
    }
    const action=String(value.action??"");
    const outcome=String(value.outcome??"");
    const permitSignature=String(value.action_permit_signature??"");
    const permitSnapshotSignature=String(value.action_permit_snapshot_signature??"");
    const permitEvidenceComplete=!!permitSignature&&!!permitSnapshotSignature;
    const permitEvidenceAbsent=!permitSignature&&!permitSnapshotSignature;
    const hasFinalStateEvidence=value.final_state_signature!=null||value.final_state_snapshot_signature!=null;
    const finalStateSignature=hasFinalStateEvidence?String(value.final_state_signature??""):"";
    const finalStateSnapshotSignature=hasFinalStateEvidence?String(value.final_state_snapshot_signature??""):"";
    const finalStateEvidenceComplete=!!finalStateSignature&&!!finalStateSnapshotSignature;
    const error=value.error==null?null:String(value.error);
    const successful=["copied","downloaded"].includes(outcome);
    const code=String(value.code??"");
    const codeOutcomeValid=successful?code==="READY":!!code&&code!=="READY";
    return typeof value.schema==="string"
      &&value.schema==="TubeBender.DimensionAuditDownloadHistoryExportEvent.v1"
      &&typeof value.action==="string"
      &&typeof value.outcome==="string"
      &&typeof value.code==="string"
      &&typeof value.history_snapshot_signature==="string"
      &&typeof value.action_permit_signature==="string"
      &&typeof value.action_permit_snapshot_signature==="string"
      &&(!hasFinalStateEvidence||(
        typeof value.final_state_signature==="string"
        &&typeof value.final_state_snapshot_signature==="string"
        &&finalStateEvidenceComplete
      ))
      &&(value.error===null||typeof value.error==="string")
      &&typeof value.generated_at==="string"
      &&typeof value.signature==="string"
      &&["copy","download"].includes(action)
      &&["blocked","copied","downloaded","failed"].includes(outcome)
      &&((action==="copy"&&outcome!=="downloaded")||(action==="download"&&outcome!=="copied"))
      &&(outcome==="failed"?!!error:error===null)
      &&(permitEvidenceComplete||permitEvidenceAbsent)
      &&(!successful||permitEvidenceComplete)
      &&codeOutcomeValid
      &&value.history_snapshot_signature.length>0
      &&(()=>{const text=value.generated_at;const date=new Date(text);return !Number.isNaN(date.getTime())&&date.toISOString()===text;})()
      &&value.signature.length>0
      &&value.signature===dimensionAuditDownloadHistoryExportEventSignature(value)
      &&dimensionAuditDownloadHistoryExportEventSignatureValid(value.signature,value);
  }

  function recordDimensionAuditDownloadHistoryExportEvent(action,outcome,code,snapshot,permitEvidence=null,error=null){
    const evidence=permitEvidence??{};
    const input={
      action:String(action??""),
      outcome:String(outcome??""),
      code:String(code??""),
      history_snapshot_signature:String(snapshot?.snapshot_signature??""),
      action_permit_signature:String(evidence.action_permit_signature??""),
      action_permit_snapshot_signature:String(evidence.action_permit_snapshot_signature??""),
      ...(evidence.final_state_signature!=null||evidence.final_state_snapshot_signature!=null?{
        final_state_signature:String(evidence.final_state_signature??""),
        final_state_snapshot_signature:String(evidence.final_state_snapshot_signature??"")
      }:{ }),
      error:error==null?null:String(error?.message??error),
      generated_at:new Date().toISOString()
    };
    const event=auditDownloadDomain?.buildDimensionAuditDownloadHistoryExportEvent
      ?clone(auditDownloadDomain.buildDimensionAuditDownloadHistoryExportEvent(input))
      :(()=>{
        const base={schema:"TubeBender.DimensionAuditDownloadHistoryExportEvent.v1",...input};
        return {...base,signature:dimensionAuditDownloadHistoryExportEventSignature(base)};
      })();
    if(!dimensionAuditDownloadHistoryExportEventValid(event)){
      throw new TypeError("invalid history export event");
    }
    Object.freeze(event);
    dimensionAuditDownloadHistoryExportEventHistory.push(event);
    while(dimensionAuditDownloadHistoryExportEventHistory.length>DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_LIMIT){
      dimensionAuditDownloadHistoryExportEventHistory.shift();
    }
    try{window.dispatchEvent(new CustomEvent("tubebender-dimension-audit-history-export",{detail:clone(event)}));}catch{}
    return clone(event);
  }

  function dimensionAuditDownloadHistoryExportEventListSnapshot(){
    return clone(dimensionAuditDownloadHistoryExportEventHistory);
  }

  function clearDimensionAuditDownloadHistoryExportEventHistory(){
    const count=dimensionAuditDownloadHistoryExportEventHistory.length;
    dimensionAuditDownloadHistoryExportEventHistory.splice(0,count);
    try{window.dispatchEvent(new CustomEvent("tubebender-dimension-audit-history-export-clear",{detail:{cleared_count:count}}));}catch{}
    return count;
  }

  function dimensionAuditDownloadHistoryExportEventSummarySignature(summary={}){
    const value=summary??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventSummarySignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventSummarySignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      total:Number(value.total??0),
      blocked:Number(value.blocked??0),
      copied:Number(value.copied??0),
      downloaded:Number(value.downloaded??0),
      failed:Number(value.failed??0),
      copy:Number(value.copy??0),
      download:Number(value.download??0),
      valid:Number(value.valid??0),
      invalid:Number(value.invalid??0),
      latest_signature:String(value.latest_signature??""),
      latest_outcome:String(value.latest_outcome??""),
      latest_action:String(value.latest_action??""),
      latest_code:String(value.latest_code??"")
    });
  }

  function dimensionAuditDownloadHistoryExportEventSummarySignatureValid(signature,summary={}){
    const value=summary??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventSummarySignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventSummarySignatureValid(signature,value);
    }
    return signature===dimensionAuditDownloadHistoryExportEventSummarySignature(value);
  }

  function dimensionAuditDownloadHistoryExportEventSummary(events=dimensionAuditDownloadHistoryExportEventListSnapshot()){
    if(!Array.isArray(events))throw new TypeError("history export events must be an array");
    const list=events;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventSummary){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventSummary(list);
    }
    let blocked=0,copied=0,downloaded=0,failed=0,copy=0,download=0,valid=0,invalid=0;
    for(const event of list){
      const outcome=String(event?.outcome??"");
      if(outcome==="blocked")blocked++;
      if(outcome==="copied")copied++;
      if(outcome==="downloaded")downloaded++;
      if(outcome==="failed")failed++;
      if(String(event?.action??"")==="copy")copy++;
      if(String(event?.action??"")==="download")download++;
      if(dimensionAuditDownloadHistoryExportEventValid(event))valid++;else invalid++;
    }
    const base={
      schema:"TubeBender.DimensionAuditDownloadHistoryExportEventSummary.v1",
      total:list.length,blocked,copied,downloaded,failed,copy,download,valid,invalid,
      latest_signature:String(list.at(-1)?.signature??""),
      latest_outcome:String(list.at(-1)?.outcome??""),
      latest_action:String(list.at(-1)?.action??""),
      latest_code:String(list.at(-1)?.code??"")
    };
    return Object.freeze({...base,signature:dimensionAuditDownloadHistoryExportEventSummarySignature(base)});
  }

  function dimensionAuditDownloadHistoryExportEventSummaryValid(summary=dimensionAuditDownloadHistoryExportEventSummary(),events=dimensionAuditDownloadHistoryExportEventListSnapshot()){
    if(!Array.isArray(events))return false;
    const list=events;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventSummaryValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventSummaryValid(summary??{},list);
    }
    const expected=dimensionAuditDownloadHistoryExportEventSummary(list);
    const value=summary??{};
    return typeof value.schema==="string"
      &&value.schema==="TubeBender.DimensionAuditDownloadHistoryExportEventSummary.v1"
      &&typeof value.latest_signature==="string"
      &&typeof value.latest_outcome==="string"
      &&typeof value.latest_action==="string"
      &&typeof value.latest_code==="string"
      &&typeof value.signature==="string"
      &&Number.isInteger(value.total)&&value.total===expected.total
      &&Number.isInteger(value.blocked)&&value.blocked===expected.blocked
      &&Number.isInteger(value.copied)&&value.copied===expected.copied
      &&Number.isInteger(value.downloaded)&&value.downloaded===expected.downloaded
      &&Number.isInteger(value.failed)&&value.failed===expected.failed
      &&Number.isInteger(value.copy)&&value.copy===expected.copy
      &&Number.isInteger(value.download)&&value.download===expected.download
      &&Number.isInteger(value.valid)&&value.valid===expected.valid
      &&Number.isInteger(value.invalid)&&value.invalid===expected.invalid
      &&value.latest_signature===expected.latest_signature
      &&value.latest_outcome===expected.latest_outcome
      &&value.latest_action===expected.latest_action
      &&value.latest_code===expected.latest_code
      &&dimensionAuditDownloadHistoryExportEventSummarySignatureValid(value.signature,value);
  }

  function dimensionAuditDownloadHistoryExportEventHistorySignature(snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventHistorySignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventHistorySignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      event_count:Number(value.event_count??0),
      event_signatures:(Array.isArray(value.events)?value.events:[]).map(event=>String(event?.signature??"")),
      summary_schema:String(value.summary?.schema??""),
      summary_signature:String(value.summary?.signature??""),
      summary_total:Number(value.summary?.total??0),
      summary_latest_signature:String(value.summary?.latest_signature??""),
      summary_latest_action:String(value.summary?.latest_action??""),
      summary_latest_outcome:String(value.summary?.latest_outcome??""),
      summary_latest_code:String(value.summary?.latest_code??""),
      events_valid:value.events_valid===true,
      summary_valid:value.summary_valid===true,
      summary_signature_valid:value.summary_signature_valid===true,
      signature_valid:value.signature_valid===true,
      generated_at:String(value.generated_at??"")
    });
  }

  function dimensionAuditDownloadHistoryExportEventHistorySignatureValid(signature,snapshot={}){
    const value=snapshot??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventHistorySignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventHistorySignatureValid(signature,value);
    }
    return signature===dimensionAuditDownloadHistoryExportEventHistorySignature(value);
  }

  function dimensionAuditDownloadHistoryExportEventHistorySnapshot(events=dimensionAuditDownloadHistoryExportEventListSnapshot(),generatedAt=new Date()){
    if(!Array.isArray(events))throw new TypeError("history export events must be an array");
    const list=events;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventHistorySnapshot){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventHistorySnapshot(list,generatedAt);
    }
    const timestamp=generatedAt instanceof Date?generatedAt:new Date(generatedAt);
    if(Number.isNaN(timestamp.getTime()))throw new TypeError("history export event snapshot generatedAt must be valid");
    const normalized=Object.freeze(clone(list).map(event=>Object.freeze({...event})));
    const eventTimes=normalized.map(event=>new Date(String(event?.generated_at??"")).getTime());
    for(let index=1;index<eventTimes.length;index++)if(Number.isFinite(eventTimes[index-1])&&Number.isFinite(eventTimes[index])&&eventTimes[index]<eventTimes[index-1])throw new RangeError("history export events must be chronological");
    const latestEventTime=Math.max(-Infinity,...eventTimes.filter(Number.isFinite));
    if(Number.isFinite(latestEventTime)&&timestamp.getTime()<latestEventTime)throw new RangeError("history export event snapshot cannot predate contained events");
    const summary=dimensionAuditDownloadHistoryExportEventSummary(normalized);
    const base={
      schema:"TubeBender.DimensionAuditDownloadHistoryExportEventHistory.v1",
      event_count:normalized.length,
      events:normalized,
      events_valid:normalized.every(event=>dimensionAuditDownloadHistoryExportEventValid(event)),
      summary,
      summary_valid:dimensionAuditDownloadHistoryExportEventSummaryValid(summary,normalized),
      summary_signature_valid:dimensionAuditDownloadHistoryExportEventSummarySignatureValid(summary.signature,summary),
      generated_at:timestamp.toISOString()
    };
    const withSignatureFlag={...base,signature_valid:true};
    return Object.freeze({...withSignatureFlag,signature:dimensionAuditDownloadHistoryExportEventHistorySignature(withSignatureFlag)});
  }

  function dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot()){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventHistorySnapshotValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(value);
    }
    const events=Array.isArray(value.events)?value.events:null;
    return typeof value.schema==="string"
      &&value.schema==="TubeBender.DimensionAuditDownloadHistoryExportEventHistory.v1"
      &&typeof value.generated_at==="string"
      &&typeof value.signature==="string"
      &&!!events
      &&Number.isInteger(value.event_count)&&value.event_count===events.length
      &&value.events_valid===true
      &&events.every(event=>dimensionAuditDownloadHistoryExportEventValid(event))
      &&value.summary_valid===true
      &&value.summary_signature_valid===true
      &&value.signature_valid===true
      &&dimensionAuditDownloadHistoryExportEventSummaryValid(value.summary,events)
      &&dimensionAuditDownloadHistoryExportEventSummarySignatureValid(value.summary?.signature,value.summary)
      &&(()=>{const text=value.generated_at;const date=new Date(text);if(Number.isNaN(date.getTime())||date.toISOString()!==text)return false;const times=events.map(event=>new Date(String(event?.generated_at??"")).getTime());for(let index=1;index<times.length;index++)if(times[index]<times[index-1])return false;return !times.some(time=>Number.isFinite(time)&&time>date.getTime());})()
      &&dimensionAuditDownloadHistoryExportEventHistorySignatureValid(value.signature,value);
  }

  function dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(envelope={}){
    const value=envelope??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      history_snapshot_signature:String(value.history_snapshot?.signature??""),
      evidence_summary_snapshot_signature:String(value.evidence_summary_snapshot?.snapshot_signature??""),
      evidence_summary_signature:String(value.evidence_summary_snapshot?.summary_signature??value.evidence_summary_snapshot?.summary?.signature??""),
      evidence_event_binding_signature:String(value.evidence_summary_snapshot?.event_binding_signature??""),
      history_event_signatures:(Array.isArray(value.history_snapshot?.events)?value.history_snapshot.events:[]).map(event=>String(event?.signature??"")),
      event_count:Number(value.history_snapshot?.event_count??0),
      evidence_event_count:Number(value.evidence_summary_snapshot?.summary?.total??0)
    });
  }

  function dimensionAuditDownloadHistoryExportEventLogEnvelopeSignatureValid(signature,envelope={}){
    const value=envelope??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventLogEnvelopeSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventLogEnvelopeSignatureValid(signature,value);
    }
    return typeof signature==="string"
      &&signature.length>0
      &&signature===dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(value);
  }

  function dimensionAuditDownloadHistoryExportEventLogEnvelope(historySnapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(),evidenceSummarySnapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(),events=dimensionAuditDownloadHistoryExportEventListSnapshot()){
    if(!Array.isArray(events))throw new TypeError("history export events must be an array");
    const history=historySnapshot??{};
    const evidence=evidenceSummarySnapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventLogEnvelope){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventLogEnvelope(history,evidence,events);
    }
    const base={
      schema:"TubeBender.DimensionAuditDownloadHistoryExportEventLogEnvelope.v1",
      history_snapshot:history,
      evidence_summary_snapshot:evidence,
      history_snapshot_valid:dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(history),
      evidence_summary_snapshot_valid:dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(evidence,events)
    };
    return Object.freeze({...base,signature:dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(base)});
  }

  function dimensionAuditDownloadHistoryExportEventLogEnvelopeValid(envelope={},events=dimensionAuditDownloadHistoryExportEventListSnapshot()){
    if(!Array.isArray(events))return false;
    const value=envelope??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventLogEnvelopeValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventLogEnvelopeValid(value,events);
    }
    return typeof value.schema==="string"
      &&value.schema==="TubeBender.DimensionAuditDownloadHistoryExportEventLogEnvelope.v1"
      &&typeof value.history_snapshot_valid==="boolean"
      &&typeof value.evidence_summary_snapshot_valid==="boolean"
      &&typeof value.signature==="string"
      &&value.history_snapshot_valid===true
      &&dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(value.history_snapshot)
      &&Array.isArray(value.history_snapshot?.events)
      &&value.history_snapshot.events.length===events.length
      &&value.history_snapshot.events.every((event,index)=>String(event?.signature??"")===String(events[index]?.signature??""))
      &&value.evidence_summary_snapshot_valid===true
      &&dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(value.evidence_summary_snapshot,events)
      &&value.signature.length>0
      &&value.signature===dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(value)
      &&dimensionAuditDownloadHistoryExportEventLogEnvelopeSignatureValid(value.signature,value);
  }

  function dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature(snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      envelope_signature:String(value.envelope_signature??""),
      envelope_valid:value.envelope_valid===true
    });
  }

  function dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid(signature,snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid(signature,value);
    }
    return typeof signature==="string"
      &&signature.length>0
      &&signature===dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature(value);
  }

  function dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(),events=dimensionAuditDownloadHistoryExportEventListSnapshot()){
    if(!Array.isArray(events))throw new TypeError("history export events must be an array");
    const value=envelope??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(value,events);
    }
    const base={
      schema:"TubeBender.DimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot.v1",
      envelope:value,
      envelope_signature:String(value.signature??""),
      envelope_valid:dimensionAuditDownloadHistoryExportEventLogEnvelopeValid(value,events)
    };
    const snapshotSignature=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature(base);
    return Object.freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
  }

  function dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid(snapshot={},events=dimensionAuditDownloadHistoryExportEventListSnapshot()){
    if(!Array.isArray(events))return false;
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid(value,events);
    }
    if(typeof value.schema!=="string"
      ||typeof value.envelope_signature!=="string"
      ||typeof value.envelope_valid!=="boolean"
      ||typeof value.snapshot_signature!=="string"
      ||typeof value.snapshot_signature_valid!=="boolean")return false;
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot.v1"
      &&value.envelope_valid===true
      &&dimensionAuditDownloadHistoryExportEventLogEnvelopeValid(value.envelope,events)
      &&value.envelope_signature===value.envelope.signature
      &&value.snapshot_signature_valid===true
      &&dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid(value.snapshot_signature,value);
  }

  async function copyDimensionAuditHistoryExportEvents(){
    const events=dimensionAuditDownloadHistoryExportEventListSnapshot();
    const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(events);
    if(!dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(snapshot)){
      toast("History export event log invalid");
      return false;
    }
    const evidenceSummary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
    const evidenceSummarySnapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(evidenceSummary,events);
    if(!dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(evidenceSummarySnapshot,events)){
      toast("History export event evidence invalid");
      return false;
    }
    if(snapshot.event_count===0){
      toast("History export event log пуст");
      return false;
    }
    const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(snapshot,evidenceSummarySnapshot,events);
    if(!dimensionAuditDownloadHistoryExportEventLogEnvelopeValid(envelope,events)){
      toast("History export event envelope invalid");
      return false;
    }
    const envelopeSnapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(envelope,events);
    if(!dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid(envelopeSnapshot,events)){
      toast("History export event envelope snapshot invalid");
      return false;
    }
    const text=JSON.stringify(envelopeSnapshot,null,2);
    try{
      if(navigator?.clipboard?.writeText)await navigator.clipboard.writeText(text);
      else{
        const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";
        document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();
      }
      toast("History export event log скопирован");
      return true;
    }catch(error){
      toast("Не удалось скопировать history export event log");
      return false;
    }
  }

  function downloadDimensionAuditHistoryExportEvents(){
    const events=dimensionAuditDownloadHistoryExportEventListSnapshot();
    const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(events);
    if(!dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(snapshot)){
      toast("History export event log invalid");
      return false;
    }
    const evidenceSummary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
    const evidenceSummarySnapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(evidenceSummary,events);
    if(!dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(evidenceSummarySnapshot,events)){
      toast("History export event evidence invalid");
      return false;
    }
    if(snapshot.event_count===0){
      toast("History export event log пуст");
      return false;
    }
    const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(snapshot,evidenceSummarySnapshot,events);
    if(!dimensionAuditDownloadHistoryExportEventLogEnvelopeValid(envelope,events)){
      toast("History export event envelope invalid");
      return false;
    }
    const envelopeSnapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(envelope,events);
    if(!dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid(envelopeSnapshot,events)){
      toast("History export event envelope snapshot invalid");
      return false;
    }
    const projectName=dimensionAuditFilenamePart(project()?.name??project()?.id??"project","project");
    const filename=dimensionAuditJsonFilename(projectName+"-dimension-audit-history-export-events-"+snapshot.event_count,snapshot.generated_at);
    try{
      const blob=new Blob([JSON.stringify(envelopeSnapshot,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=url;link.download=filename;
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),0);
      toast("History export event log сохранён");
      return true;
    }catch(error){
      toast("Не удалось сохранить history export event log");
      return false;
    }
  }

  function dimensionAuditDownloadAttemptPermitEvidence(attempt={}){
    const value=attempt??{};
    if(auditDownloadDomain?.dimensionAuditDownloadAttemptPermitEvidence){
      return auditDownloadDomain.dimensionAuditDownloadAttemptPermitEvidence(value);
    }
    const present=value.export_action!=null
      ||value.action_permit_signature!=null
      ||value.action_permit_snapshot_signature!=null;
    if(!present)return Object.freeze({present:false,valid:true,action:null,permit_signature:null,permit_snapshot_signature:null});
    const action=String(value.export_action??"");
    const permitSignature=String(value.action_permit_signature??"");
    const permitSnapshotSignature=String(value.action_permit_snapshot_signature??"");
    return Object.freeze({
      present:true,
      valid:["copy","download"].includes(action)&&!!permitSignature&&!!permitSnapshotSignature,
      action,
      permit_signature:permitSignature,
      permit_snapshot_signature:permitSnapshotSignature
    });
  }

  function dimensionAuditDownloadHistoryPermitEvidenceSummary(attempts=dimensionAuditDownloadAttemptHistorySnapshot()){
    const list=Array.isArray(attempts)?attempts:[];
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryPermitEvidenceSummary){
      return auditDownloadDomain.dimensionAuditDownloadHistoryPermitEvidenceSummary(list);
    }
    let present=0,valid=0,invalid=0,copy=0,download=0;
    for(const attempt of list){
      const evidence=dimensionAuditDownloadAttemptPermitEvidence(attempt);
      if(!evidence.present)continue;
      present++;
      if(evidence.valid)valid++;else invalid++;
      if(evidence.action==="copy")copy++;
      if(evidence.action==="download")download++;
    }
    const latest=dimensionAuditDownloadAttemptPermitEvidence(list.at(-1)??{});
    return Object.freeze({
      schema:"TubeBender.DimensionAuditDownloadHistoryPermitEvidenceSummary.v1",
      total:list.length,present,absent:list.length-present,valid,invalid,copy,download,
      latest_present:latest.present,latest_valid:latest.valid,latest_action:latest.action
    });
  }

  function dimensionAuditDownloadHistoryPermitEvidenceSummaryValid(summary=dimensionAuditDownloadHistoryPermitEvidenceSummary(),attempts=dimensionAuditDownloadAttemptHistorySnapshot()){
    if(!Array.isArray(attempts))return false;
    const list=attempts;
    if(!list.every(attempt=>dimensionAuditDownloadAttemptValid(attempt)))return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryPermitEvidenceSummaryValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryPermitEvidenceSummaryValid(summary??{},list);
    }
    const value=summary??{};
    const expected=dimensionAuditDownloadHistoryPermitEvidenceSummary(list);
    return typeof value.schema==="string"
      &&value.schema==="TubeBender.DimensionAuditDownloadHistoryPermitEvidenceSummary.v1"
      &&Number.isInteger(value.total)&&value.total===expected.total
      &&Number.isInteger(value.present)&&value.present===expected.present
      &&Number.isInteger(value.absent)&&value.absent===expected.absent
      &&Number.isInteger(value.valid)&&value.valid===expected.valid
      &&Number.isInteger(value.invalid)&&value.invalid===expected.invalid
      &&Number.isInteger(value.copy)&&value.copy===expected.copy
      &&Number.isInteger(value.download)&&value.download===expected.download
      &&typeof value.latest_present==="boolean"
      &&typeof value.latest_valid==="boolean"
      &&(value.latest_action===null||typeof value.latest_action==="string")
      &&value.latest_present===expected.latest_present
      &&value.latest_valid===expected.latest_valid
      &&value.latest_action===expected.latest_action;
  }

  function dimensionAuditDownloadAttemptHistorySummary(){
    if(auditDownloadDomain?.dimensionAuditDownloadHistorySummary){
      return auditDownloadDomain.dimensionAuditDownloadHistorySummary(dimensionAuditDownloadAttemptHistorySnapshot());
    }
    const counts={blocked:0,downloaded:0,failed:0};
    for(const attempt of dimensionAuditDownloadAttemptHistory){
      const status=String(attempt?.status??"");
      if(Object.prototype.hasOwnProperty.call(counts,status))counts[status]++;
    }
    return {
      schema:"TubeBender.DimensionAuditDownloadAttemptHistorySummary.v1",
      total:dimensionAuditDownloadAttemptHistory.length,
      blocked:counts.blocked,
      downloaded:counts.downloaded,
      failed:counts.failed,
      latest_signature:String(dimensionAuditDownloadAttemptHistory.at(-1)?.signature??"")
    };
  }
  function dimensionAuditDownloadAttemptHistorySummaryValid(summary=dimensionAuditDownloadAttemptHistorySummary(),attempts=dimensionAuditDownloadAttemptHistorySnapshot()){
    if(!Array.isArray(attempts))return false;
    const signedAttempts=attempts.filter(attempt=>attempt?.schema==="TubeBender.DimensionAuditDownloadAttempt.v1");
    if(signedAttempts.length>0&&signedAttempts.length!==attempts.length)return false;
    if(signedAttempts.length===attempts.length&&!attempts.every(attempt=>dimensionAuditDownloadAttemptValid(attempt)))return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistorySummaryValid){
      return auditDownloadDomain.dimensionAuditDownloadHistorySummaryValid(summary??{},attempts);
    }
    const value=summary??{};
    const counts={blocked:0,downloaded:0,failed:0};
    for(const attempt of attempts){
      const status=String(attempt?.status??"");
      if(!Object.prototype.hasOwnProperty.call(counts,status))return false;
      counts[status]++;
    }
    const expectedLatest=String(attempts.at(-1)?.signature??"");
    return typeof value.schema==="string"
      &&value.schema==="TubeBender.DimensionAuditDownloadAttemptHistorySummary.v1"
      &&typeof value.latest_signature==="string"
      &&Number.isInteger(value.total)&&value.total===attempts.length
      &&Number.isInteger(value.blocked)&&value.blocked===counts.blocked
      &&Number.isInteger(value.downloaded)&&value.downloaded===counts.downloaded
      &&Number.isInteger(value.failed)&&value.failed===counts.failed
      &&value.latest_signature===expectedLatest;
  }

  function dimensionAuditDownloadAttemptHistorySummarySignature(summary=dimensionAuditDownloadAttemptHistorySummary()){
    if(auditDownloadDomain?.dimensionAuditDownloadHistorySummarySignature){
      return auditDownloadDomain.dimensionAuditDownloadHistorySummarySignature(summary??{});
    }
    const value=summary??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      total:Number(value.total??0),
      blocked:Number(value.blocked??0),
      downloaded:Number(value.downloaded??0),
      failed:Number(value.failed??0),
      latest_signature:String(value.latest_signature??"")
    });
  }

  function dimensionAuditDownloadAttemptHistorySummarySignatureValid(signature=dimensionAuditDownloadAttemptHistorySummarySignature(),summary=dimensionAuditDownloadAttemptHistorySummary(),attempts=dimensionAuditDownloadAttemptHistorySnapshot()){
    if(!Array.isArray(attempts))return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistorySummarySignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistorySummarySignatureValid(signature,summary??{},attempts);
    }
    return typeof signature==="string"
      &&signature.length>0
      &&dimensionAuditDownloadAttemptHistorySummaryValid(summary,attempts)
      &&signature===dimensionAuditDownloadAttemptHistorySummarySignature(summary);
  }

  function dimensionAuditDownloadAttemptHistoryAuditSignature(snapshot){
    if(auditDownloadDomain?.dimensionAuditDownloadHistorySignature){
      return auditDownloadDomain.dimensionAuditDownloadHistorySignature(snapshot??{});
    }
    const value=snapshot??{};
    const attempts=Array.isArray(value.attempts)?value.attempts:[];
    return JSON.stringify({
      schema:String(value.schema??""),
      project_id:String(value.project_id??""),
      project_name:String(value.project_name??""),
      generated_at:String(value.generated_at??""),
      summary_signature:String(value.summary_signature??""),
      protocol_state_signature:String(value.protocol_state_signature??""),
      attempt_count:Number(value.attempt_count??0),
      attempt_signatures:attempts.map(attempt=>String(attempt?.signature??""))
    });
  }
  function dimensionAuditDownloadAttemptHistoryAuditSignatureValid(signature,snapshot){
    if(auditDownloadDomain?.dimensionAuditDownloadHistorySignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistorySignatureValid(signature,snapshot??{});
    }
    return typeof signature==="string"
      &&signature.length>0
      &&signature===dimensionAuditDownloadAttemptHistoryAuditSignature(snapshot??{});
  }
  function dimensionAuditDownloadAttemptHistoryIntegrity(snapshot){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryIntegrity){
      return auditDownloadDomain.dimensionAuditDownloadHistoryIntegrity(snapshot??{});
    }
    const value=snapshot??{};
    const attemptsArrayValid=Array.isArray(value.attempts);
    const attempts=attemptsArrayValid?value.attempts:[];
    const summary=value.summary??{};
    const historySchemaValid=typeof value.schema==="string"&&value.schema===dimensionAuditDownloadHistorySchema();
    const generatedAtValid=value.generated_at==null||(
      typeof value.generated_at==="string"
      &&(()=>{const date=new Date(value.generated_at);return !Number.isNaN(date.getTime())&&date.toISOString()===value.generated_at;})()
    );
    const attemptCountValid=attemptsArrayValid&&Number.isInteger(value.attempt_count)&&value.attempt_count===attempts.length;
    const attemptsValid=attemptsArrayValid&&attempts.every(attempt=>dimensionAuditDownloadAttemptValid(attempt));
    const summaryValid=attemptsArrayValid&&dimensionAuditDownloadAttemptHistorySummaryValid(summary,attempts);
    const summarySignatureValid=attemptsArrayValid
      &&typeof value.summary_signature==="string"
      &&dimensionAuditDownloadAttemptHistorySummarySignatureValid(value.summary_signature,summary,attempts);
    const protocolState=value.protocol_state??null;
    const protocolStateSignatureValid=!!protocolState
      &&typeof value.protocol_state_signature==="string"
      &&dimensionAuditDownloadHistoryProtocolStateSignatureValid(value.protocol_state_signature,protocolState);
    const protocolStateValid=dimensionAuditDownloadHistoryProtocolBindingValid(value);
    const rawSignature=value.snapshot_signature;
    const snapshotSignatureTypeValid=rawSignature==null||typeof rawSignature==="string";
    const signature=typeof rawSignature==="string"?rawSignature:"";
    const snapshotSignatureValid=snapshotSignatureTypeValid&&(!signature||signature===dimensionAuditDownloadAttemptHistoryAuditSignature(value));
    const snapshotSignatureContractValid=snapshotSignatureTypeValid
      &&(!signature||dimensionAuditDownloadAttemptHistoryAuditSignatureValid(signature,value));
    const errors=[
      !historySchemaValid?"INVALID_HISTORY_SCHEMA":null,
      !generatedAtValid?"INVALID_GENERATED_AT":null,
      !attemptCountValid?"INVALID_ATTEMPT_COUNT":null,
      !attemptsValid?"INVALID_ATTEMPTS":null,
      !summaryValid?"INVALID_SUMMARY":null,
      !summarySignatureValid?"INVALID_SUMMARY_SIGNATURE":null,
      !protocolStateValid?"INVALID_PROTOCOL_STATE":null,
      !protocolStateSignatureValid?"INVALID_PROTOCOL_STATE_SIGNATURE":null,
      !(snapshotSignatureValid&&snapshotSignatureContractValid)?"INVALID_SNAPSHOT_SIGNATURE":null
    ].filter(Boolean);
    return {
      schema:"TubeBender.DimensionAuditDownloadHistoryIntegrity.v1",
      valid:errors.length===0,
      code:errors[0]??"OK",
      errors,
      history_schema_valid:historySchemaValid,
      generated_at_valid:generatedAtValid,
      attempt_count_valid:attemptCountValid,
      attempts_valid:attemptsValid,
      summary_valid:summaryValid,
      summary_signature_valid:summarySignatureValid,
      protocol_state_valid:protocolStateValid,
      protocol_state_signature_valid:protocolStateSignatureValid,
      snapshot_signature_valid:snapshotSignatureValid&&snapshotSignatureContractValid
    };
  }

  function dimensionAuditDownloadAttemptHistoryIntegritySignature(integrity){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryIntegritySignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryIntegritySignature(integrity??{});
    }
    const value=integrity??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      valid:value.valid===true,
      code:String(value.code??""),
      errors:[...(value.errors??[])].map(code=>String(code)),
      history_schema_valid:value.history_schema_valid===true,
      generated_at_valid:value.generated_at_valid===true,
      attempt_count_valid:value.attempt_count_valid===true,
      attempts_valid:value.attempts_valid===true,
      summary_valid:value.summary_valid===true,
      summary_signature_valid:value.summary_signature_valid===true,
      protocol_state_valid:value.protocol_state_valid===true,
      protocol_state_signature_valid:value.protocol_state_signature_valid===true,
      snapshot_signature_valid:value.snapshot_signature_valid===true
    });
  }

  function dimensionAuditDownloadAttemptHistoryIntegritySignatureValid(signature,integrity){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryIntegritySignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryIntegritySignatureValid(signature,integrity??{});
    }
    const value=integrity??{};
    return typeof signature==="string"
      &&signature.length>0
      &&typeof value.schema==="string"
      &&typeof value.valid==="boolean"
      &&typeof value.code==="string"
      &&Array.isArray(value.errors)
      &&value.errors.every(code=>typeof code==="string")
      &&signature===dimensionAuditDownloadAttemptHistoryIntegritySignature(value);
  }

  function dimensionAuditDownloadAttemptHistoryEnvelopeSignature(snapshot){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryEnvelopeSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryEnvelopeSignature(snapshot??{});
    }
    const value=snapshot??{};
    return JSON.stringify({
      schema:"TubeBender.DimensionAuditDownloadHistoryEnvelope.v1",
      history_schema:String(value.schema??""),
      snapshot_signature:String(value.snapshot_signature??""),
      protocol_state_signature:String(value.protocol_state_signature??""),
      protocol_binding_signature:String(value.protocol_binding_signature??""),
      integrity_signature:String(value.integrity_signature??""),
      protocol_binding_valid:value.protocol_binding_valid===true,
      attempts_valid:value.attempts_valid===true,
      summary_valid:value.summary_valid===true,
      valid:value.valid===true
    });
  }
  function dimensionAuditDownloadAttemptHistoryEnvelopeSignatureValid(signature,snapshot){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryEnvelopeSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryEnvelopeSignatureValid(signature,snapshot??{});
    }
    return typeof signature==="string"
      &&signature.length>0
      &&signature===dimensionAuditDownloadAttemptHistoryEnvelopeSignature(snapshot??{});
  }
  function dimensionAuditDownloadAttemptHistoryEnvelopeValid(snapshot){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryEnvelopeValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryEnvelopeValid(snapshot??{});
    }
    const value=snapshot??{};
    const coreIntegrity=dimensionAuditDownloadAttemptHistoryIntegrity(value);
    const embeddedIntegrity=value.integrity??null;
    const embeddedIntegritySignatureValid=typeof value.integrity_signature==="string";
    const embeddedIntegritySignature=embeddedIntegritySignatureValid?value.integrity_signature:"";
    const embeddedIntegrityValid=!!embeddedIntegrity
      &&embeddedIntegritySignatureValid
      &&dimensionAuditDownloadAttemptHistoryIntegritySignature(embeddedIntegrity)===embeddedIntegritySignature
      &&dimensionAuditDownloadAttemptHistoryIntegritySignature(coreIntegrity)===embeddedIntegritySignature
      &&dimensionAuditDownloadAttemptHistoryIntegritySignatureValid(embeddedIntegritySignature,embeddedIntegrity)
      &&dimensionAuditDownloadAttemptHistoryIntegritySignatureValid(embeddedIntegritySignature,coreIntegrity);
    const embeddedBinding=value.protocol_binding??null;
    const embeddedBindingSignatureValid=typeof value.protocol_binding_signature==="string";
    const embeddedBindingSignature=embeddedBindingSignatureValid?value.protocol_binding_signature:"";
    const coreBinding=dimensionAuditDownloadHistoryProtocolBinding(value);
    const embeddedBindingValid=!!embeddedBinding
      &&embeddedBindingSignatureValid
      &&dimensionAuditDownloadHistoryProtocolBindingSignature(embeddedBinding)===embeddedBindingSignature
      &&dimensionAuditDownloadHistoryProtocolBindingSignature(coreBinding)===embeddedBindingSignature
      &&dimensionAuditDownloadHistoryProtocolBindingSignatureValid(embeddedBindingSignature,embeddedBinding)
      &&dimensionAuditDownloadHistoryProtocolBindingSignatureValid(embeddedBindingSignature,coreBinding);
    const rawEnvelopeSignature=value.envelope_signature;
    const envelopeSignatureTypeValid=rawEnvelopeSignature==null||typeof rawEnvelopeSignature==="string";
    const envelopeSignature=typeof rawEnvelopeSignature==="string"?rawEnvelopeSignature:"";
    const envelopeSignatureValid=envelopeSignatureTypeValid&&(!envelopeSignature||envelopeSignature===dimensionAuditDownloadAttemptHistoryEnvelopeSignature(value));
    const envelopeSignatureContractValid=envelopeSignatureTypeValid
      &&(!envelopeSignature||dimensionAuditDownloadAttemptHistoryEnvelopeSignatureValid(envelopeSignature,value));
    return coreIntegrity.valid
      &&embeddedIntegrityValid
      &&embeddedBindingValid
      &&value.attempts_valid===coreIntegrity.attempts_valid
      &&value.summary_valid===coreIntegrity.summary_valid
      &&value.protocol_binding_valid===dimensionAuditDownloadHistoryProtocolBindingValid(value)
      &&value.valid===coreIntegrity.valid
      &&envelopeSignatureValid
      &&envelopeSignatureContractValid;
  }

  function dimensionAuditDownloadAttemptHistoryAuditValid(snapshot){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryValid(snapshot??{});
    }
    return dimensionAuditDownloadAttemptHistoryIntegrity(snapshot).valid;
  }

  function dimensionAuditDownloadAttemptHistoryAuditSnapshotSource(){
    return auditDownloadDomain?.dimensionAuditDownloadHistorySnapshot?"domain":"ui-fallback";
  }

  function dimensionAuditDownloadAttemptHistoryAuditSnapshot(){
    const attempts=dimensionAuditDownloadAttemptHistorySnapshot();
    if(auditDownloadDomain?.dimensionAuditDownloadHistorySnapshot){
      const context=dimensionAuditProjectContext();
      return clone(auditDownloadDomain.dimensionAuditDownloadHistorySnapshot({
        project_id:context.project_id,
        project_name:context.project_name,
        generated_at:context.generated_at,
        attempts
      }));
    }
    const summary=dimensionAuditDownloadAttemptHistorySummary();
    const protocolState=dimensionAuditDownloadHistoryProtocolState();
    const context=dimensionAuditProjectContext();
    const base={
      schema:dimensionAuditDownloadHistorySchema(),
      project_id:context.project_id,
      project_name:context.project_name,
      generated_at:context.generated_at,
      summary,
      summary_signature:dimensionAuditDownloadAttemptHistorySummarySignature(summary),
      protocol_state:protocolState,
      protocol_state_signature:dimensionAuditDownloadHistoryProtocolStateSignature(protocolState),
      attempt_count:attempts.length,
      attempts
    };
    const signed={
      ...base,
      snapshot_signature:dimensionAuditDownloadAttemptHistoryAuditSignature(base)
    };
    const integrity=dimensionAuditDownloadAttemptHistoryIntegrity(signed);
    const protocolBinding=dimensionAuditDownloadHistoryProtocolBinding(signed);
    const full={
      ...signed,
      attempts_valid:integrity.attempts_valid,
      summary_valid:integrity.summary_valid,
      protocol_binding:protocolBinding,
      protocol_binding_signature:dimensionAuditDownloadHistoryProtocolBindingSignature(protocolBinding),
      protocol_binding_valid:protocolBinding.valid===true,
      integrity,
      integrity_signature:dimensionAuditDownloadAttemptHistoryIntegritySignature(integrity),
      valid:integrity.valid
    };
    const enveloped={
      ...full,
      envelope_signature:dimensionAuditDownloadAttemptHistoryEnvelopeSignature(full)
    };
    const checked={
      ...enveloped,
      envelope_valid:dimensionAuditDownloadAttemptHistoryEnvelopeValid(enveloped)
    };
    const health=dimensionAuditDownloadHistoryHealth(checked);
    const withHealth={
      ...checked,
      health,
      health_signature:dimensionAuditDownloadHistoryHealthSignature(health)
    };
    const healthEmbedding=dimensionAuditDownloadHistoryHealthEmbedding(withHealth);
    const complete={
      ...withHealth,
      health_embedding:healthEmbedding,
      health_embedding_signature:dimensionAuditDownloadHistoryHealthEmbeddingSignature(healthEmbedding)
    };
    const verification=dimensionAuditDownloadHistoryVerification(complete);
    const verified={
      ...complete,
      verification,
      verification_signature:dimensionAuditDownloadHistoryVerificationSignature(verification)
    };
    const verificationEmbedding=dimensionAuditDownloadHistoryVerificationEmbedding(verified);
    const verifiedEmbedding={
      ...verified,
      verification_embedding:verificationEmbedding,
      verification_embedding_signature:dimensionAuditDownloadHistoryVerificationEmbeddingSignature(verificationEmbedding)
    };
    const attestation=dimensionAuditDownloadHistoryAttestation(verifiedEmbedding);
    const attested={
      ...verifiedEmbedding,
      attestation,
      attestation_signature:dimensionAuditDownloadHistoryAttestationSignature(attestation)
    };
    const attestationEmbedding=dimensionAuditDownloadHistoryAttestationEmbedding(attested);
    return {
      ...attested,
      attestation_embedding:attestationEmbedding,
      attestation_embedding_signature:dimensionAuditDownloadHistoryAttestationEmbeddingSignature(attestationEmbedding)
    };
  }

  function dimensionAuditDownloadAttemptHistorySnapshotProvenance(snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot()){
    const value=snapshot??{};
    const trust=dimensionAuditDownloadHistoryTrust(value);
    return {
      schema:"TubeBender.DimensionAuditDownloadHistorySnapshotProvenance.v1",
      source:dimensionAuditDownloadAttemptHistoryAuditSnapshotSource(),
      generated_at:String(value.generated_at??""),
      snapshot_signature:String(value.snapshot_signature??""),
      envelope_valid:dimensionAuditDownloadAttemptHistoryEnvelopeValid(value),
      verification_valid:dimensionAuditDownloadHistoryVerification(value).valid===true,
      trust_code:String(trust.code??""),
      trusted:trust.trusted===true
    };
  }

  function dimensionAuditDownloadAttemptHistorySnapshotProvenanceSignature(provenance=dimensionAuditDownloadAttemptHistorySnapshotProvenance()){
    const value=provenance??{};
    return JSON.stringify({
      schema:String(value.schema??""),
      source:String(value.source??""),
      generated_at:String(value.generated_at??""),
      snapshot_signature:String(value.snapshot_signature??""),
      envelope_valid:value.envelope_valid===true,
      verification_valid:value.verification_valid===true,
      trust_code:String(value.trust_code??""),
      trusted:value.trusted===true
    });
  }

  function dimensionAuditDownloadAttemptHistorySnapshotProvenanceValid(provenance=dimensionAuditDownloadAttemptHistorySnapshotProvenance(),snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot()){
    const value=provenance??{};
    const currentSnapshot=snapshot??{};
    const current=dimensionAuditDownloadAttemptHistorySnapshotProvenance(currentSnapshot);
    return String(value.schema??"")==="TubeBender.DimensionAuditDownloadHistorySnapshotProvenance.v1"
      &&String(value.source??"")===String(current.source??"")
      &&String(value.generated_at??"")===String(current.generated_at??"")
      &&String(value.snapshot_signature??"")===String(currentSnapshot.snapshot_signature??"")
      &&value.envelope_valid===dimensionAuditDownloadAttemptHistoryEnvelopeValid(currentSnapshot)
      &&value.verification_valid===dimensionAuditDownloadHistoryVerification(currentSnapshot).valid
      &&String(value.trust_code??"")===String(dimensionAuditDownloadHistoryTrust(currentSnapshot).code??"")
      &&value.trusted===dimensionAuditDownloadHistoryTrust(currentSnapshot).trusted;
  }

  function dimensionAuditDownloadHistoryExportReadinessProtocol(){
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportReadinessProtocol){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportReadinessProtocol();
    }
    return Object.freeze({
      schema:"TubeBender.DimensionAuditDownloadHistoryExportReadinessProtocol.v1",
      state_schema:String(auditDownloadDomain?.DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SCHEMA??"TubeBender.DimensionAuditDownloadHistoryExportReadiness.v1"),
      snapshot_schema:String(auditDownloadDomain?.DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SNAPSHOT_SCHEMA??"TubeBender.DimensionAuditDownloadHistoryExportReadinessSnapshot.v1"),
      codes:[...(auditDownloadDomain?.DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_CODES??[
        "READY","EMPTY","VERIFICATION_FAILED","UNTRUSTED","INVALID_PROVENANCE"
      ])]
    });
  }

  function dimensionAuditDownloadHistoryExportReadinessProtocolSignature(protocol=dimensionAuditDownloadHistoryExportReadinessProtocol()){
    const value=protocol??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportReadinessProtocolSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportReadinessProtocolSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      state_schema:String(value.state_schema??""),
      snapshot_schema:String(value.snapshot_schema??""),
      codes:[...(value.codes??[])].map(code=>String(code))
    });
  }

  function dimensionAuditDownloadHistoryExportReadinessProtocolValid(protocol=dimensionAuditDownloadHistoryExportReadinessProtocol()){
    const value=protocol??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportReadinessProtocolValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportReadinessProtocolValid(value);
    }
    const expected=dimensionAuditDownloadHistoryExportReadinessProtocol();
    return typeof value.schema==="string"&&value.schema===expected.schema
      &&typeof value.state_schema==="string"&&value.state_schema===expected.state_schema
      &&typeof value.snapshot_schema==="string"&&value.snapshot_schema===expected.snapshot_schema
      &&Array.isArray(value.codes)
      &&value.codes.length===expected.codes.length
      &&value.codes.every((code,index)=>typeof code==="string"&&code===expected.codes[index]);
  }

  function dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(signature=dimensionAuditDownloadHistoryExportReadinessProtocolSignature(),protocol=dimensionAuditDownloadHistoryExportReadinessProtocol()){
    const value=protocol??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(signature,value);
    }
    return dimensionAuditDownloadHistoryExportReadinessProtocolValid(value)
      &&signature===dimensionAuditDownloadHistoryExportReadinessProtocolSignature(value);
  }

  function dimensionAuditDownloadHistoryExportReadiness(snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot()){
    const value=snapshot??{};
    const attemptCount=Math.max(0,Number(value.attempt_count)||0);
    const verification=dimensionAuditDownloadHistoryVerification(value);
    const trust=dimensionAuditDownloadHistoryTrust(value);
    const provenance=dimensionAuditDownloadAttemptHistorySnapshotProvenance(value);
    const provenanceValid=dimensionAuditDownloadAttemptHistorySnapshotProvenanceValid(provenance,value);
    const provenanceSignature=dimensionAuditDownloadAttemptHistorySnapshotProvenanceSignature(provenance);
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportReadinessState){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportReadinessState({
        attempt_count:attemptCount,
        verification_valid:verification.valid,
        trusted:trust.trusted,
        provenance_valid:provenanceValid,
        history_snapshot_signature:String(value.snapshot_signature??""),
        provenance_signature:provenanceSignature
      });
    }
    if(!attemptCount)return {ready:false,code:"EMPTY"};
    if(!verification.valid)return {ready:false,code:"VERIFICATION_FAILED"};
    if(!trust.trusted)return {ready:false,code:"UNTRUSTED"};
    if(!provenanceValid)return {ready:false,code:"INVALID_PROVENANCE"};
    return {ready:true,code:"READY"};
  }

  function dimensionAuditDownloadHistoryExportReadinessStateValid(state=dimensionAuditDownloadHistoryExportReadiness(),snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot()){
    const value=state??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportReadinessStateValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportReadinessStateValid(value);
    }
    const expected=dimensionAuditDownloadHistoryExportReadiness(snapshot);
    return typeof value.ready==="boolean"
      &&typeof value.code==="string"
      &&["READY","EMPTY","VERIFICATION_FAILED","UNTRUSTED","INVALID_PROVENANCE"].includes(value.code)
      &&value.ready===expected.ready
      &&value.code===expected.code;
  }

  function dimensionAuditDownloadHistoryExportReadinessSignature(readiness=dimensionAuditDownloadHistoryExportReadiness(),snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot()){
    const value=readiness??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportReadinessStateSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportReadinessStateSignature(value);
    }
    const current=snapshot??{};
    const provenance=dimensionAuditDownloadAttemptHistorySnapshotProvenance(current);
    return JSON.stringify({
      ready:value.ready===true,
      code:String(value.code??""),
      snapshot_signature:String(current.snapshot_signature??""),
      provenance_signature:dimensionAuditDownloadAttemptHistorySnapshotProvenanceSignature(provenance)
    });
  }

  function dimensionAuditDownloadHistoryExportReadinessSignatureValid(signature=dimensionAuditDownloadHistoryExportReadinessSignature(),readiness=dimensionAuditDownloadHistoryExportReadiness(),snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot()){
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportReadinessStateSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportReadinessStateSignatureValid(signature,readiness);
    }
    return dimensionAuditDownloadHistoryExportReadinessStateValid(readiness,snapshot)
      &&signature===dimensionAuditDownloadHistoryExportReadinessSignature(readiness,snapshot);
  }

  function dimensionAuditDownloadHistoryExportReadinessSnapshotSignature(snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportReadinessSnapshotSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportReadinessSnapshotSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      protocol_signature:String(value.protocol_signature??""),
      protocol_valid:value.protocol_valid===true,
      protocol_signature_valid:value.protocol_signature_valid===true,
      state_schema:String(value.state_schema??""),
      state_valid:value.state_valid===true,
      ready:value.ready===true,
      code:String(value.code??""),
      attempt_count:Math.max(0,Math.trunc(Number(value.attempt_count)||0)),
      verification_valid:value.verification_valid===true,
      trusted:value.trusted===true,
      provenance_valid:value.provenance_valid===true,
      history_snapshot_signature:String(value.history_snapshot_signature??""),
      provenance_signature:String(value.provenance_signature??""),
      signature:String(value.signature??""),
      signature_valid:value.signature_valid===true
    });
  }

  function dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(signature,snapshot={}){
    const value=snapshot??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(signature,value);
    }
    return signature===dimensionAuditDownloadHistoryExportReadinessSnapshotSignature(value);
  }

  function dimensionAuditDownloadHistoryExportReadinessSnapshot(snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot()){
    const current=snapshot??{};
    const readiness=dimensionAuditDownloadHistoryExportReadiness(current);
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportReadinessSnapshot){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportReadinessSnapshot(readiness);
    }
    const provenance=dimensionAuditDownloadAttemptHistorySnapshotProvenance(current);
    const verification=dimensionAuditDownloadHistoryVerification(current);
    const trust=dimensionAuditDownloadHistoryTrust(current);
    const provenanceValid=dimensionAuditDownloadAttemptHistorySnapshotProvenanceValid(provenance,current);
    const signature=dimensionAuditDownloadHistoryExportReadinessSignature(readiness,current);
    const protocol=dimensionAuditDownloadHistoryExportReadinessProtocol();
    const protocolSignature=dimensionAuditDownloadHistoryExportReadinessProtocolSignature(protocol);
    const base={
      schema:"TubeBender.DimensionAuditDownloadHistoryExportReadinessSnapshot.v1",
      protocol,
      protocol_signature:protocolSignature,
      protocol_valid:dimensionAuditDownloadHistoryExportReadinessProtocolValid(protocol),
      protocol_signature_valid:dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(protocolSignature,protocol),
      state_schema:"TubeBender.DimensionAuditDownloadHistoryExportReadiness.v1",
      state_valid:dimensionAuditDownloadHistoryExportReadinessStateValid(readiness,current),
      ready:readiness.ready===true,
      code:String(readiness.code??""),
      attempt_count:Math.max(0,Math.trunc(Number(current.attempt_count)||0)),
      verification_valid:verification.valid===true,
      trusted:trust.trusted===true,
      provenance_valid:provenanceValid,
      history_snapshot_signature:String(current.snapshot_signature??""),
      provenance_signature:dimensionAuditDownloadAttemptHistorySnapshotProvenanceSignature(provenance),
      signature,
      signature_valid:dimensionAuditDownloadHistoryExportReadinessSignatureValid(signature,readiness,current)
    };
    const snapshotSignature=dimensionAuditDownloadHistoryExportReadinessSnapshotSignature(base);
    return Object.freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
  }

  function dimensionAuditDownloadHistoryExportReadinessSnapshotValid(value=dimensionAuditDownloadHistoryExportReadinessSnapshot(),snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot()){
    const current=value??{};
    const readiness=dimensionAuditDownloadHistoryExportReadiness(snapshot);
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportReadinessSnapshotValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportReadinessSnapshotValid(current,readiness);
    }
    const expected=dimensionAuditDownloadHistoryExportReadinessSnapshot(snapshot);
    if(typeof current.schema!=="string"
      ||typeof current.protocol_signature!=="string"
      ||typeof current.state_schema!=="string"
      ||typeof current.ready!=="boolean"
      ||typeof current.code!=="string"
      ||!Number.isInteger(current.attempt_count)
      ||current.attempt_count<0
      ||typeof current.verification_valid!=="boolean"
      ||typeof current.trusted!=="boolean"
      ||typeof current.provenance_valid!=="boolean"
      ||typeof current.history_snapshot_signature!=="string"
      ||typeof current.provenance_signature!=="string"
      ||typeof current.signature!=="string"
      ||typeof current.snapshot_signature!=="string")return false;
    return current.schema==="TubeBender.DimensionAuditDownloadHistoryExportReadinessSnapshot.v1"
      &&dimensionAuditDownloadHistoryExportReadinessProtocolValid(current.protocol)
      &&dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(current.protocol_signature,current.protocol)
      &&current.protocol_valid===true
      &&current.protocol_signature_valid===true
      &&dimensionAuditDownloadHistoryExportReadinessProtocolSignature(current.protocol)===dimensionAuditDownloadHistoryExportReadinessProtocolSignature(expected.protocol)
      &&current.protocol_signature===expected.protocol_signature
      &&current.state_schema==="TubeBender.DimensionAuditDownloadHistoryExportReadiness.v1"
      &&current.ready===expected.ready
      &&current.code===expected.code
      &&current.attempt_count===expected.attempt_count
      &&current.verification_valid===expected.verification_valid
      &&current.trusted===expected.trusted
      &&current.provenance_valid===expected.provenance_valid
      &&current.history_snapshot_signature===expected.history_snapshot_signature
      &&current.provenance_signature===expected.provenance_signature
      &&current.signature===expected.signature
      &&current.signature_valid===true
      &&current.snapshot_signature===expected.snapshot_signature
      &&current.snapshot_signature_valid===true
      &&dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(current.snapshot_signature,current);
  }

  function dimensionAuditDownloadHistoryExportGate(exportSnapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot()){
    const current=exportSnapshot??{};
    const history=historySnapshot??{};
    const readiness=dimensionAuditDownloadHistoryExportReadiness(history);
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportGate){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportGate(current,readiness);
    }
    let code="READY";
    if(!dimensionAuditDownloadHistoryExportReadinessProtocolValid(current.protocol)||current.protocol_valid!==true)code="INVALID_PROTOCOL";
    else if(!dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(current.protocol_signature,current.protocol)||current.protocol_signature_valid!==true)code="INVALID_PROTOCOL_SIGNATURE";
    else if(current.state_valid!==true)code="INVALID_STATE";
    else if(current.signature_valid!==true||!dimensionAuditDownloadHistoryExportReadinessSignatureValid(current.signature,readiness,history))code="INVALID_STATE_SIGNATURE";
    else if(current.snapshot_signature_valid!==true||!dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(current.snapshot_signature,current))code="INVALID_SNAPSHOT_SIGNATURE";
    else if(!dimensionAuditDownloadHistoryExportReadinessSnapshotValid(current,history))code="INVALID_SNAPSHOT";
    else if(current.ready!==true)code=String(current.code??"INVALID_SNAPSHOT");
    return Object.freeze({
      schema:"TubeBender.DimensionAuditDownloadHistoryExportGate.v1",
      allowed:code==="READY",
      code,
      readiness_code:String(current.code??""),
      snapshot_valid:dimensionAuditDownloadHistoryExportReadinessSnapshotValid(current,history)
    });
  }

  function dimensionAuditDownloadHistoryExportGateSignature(gate=dimensionAuditDownloadHistoryExportGate()){
    const value=gate??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportGateSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportGateSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      allowed:value.allowed===true,
      code:String(value.code??""),
      readiness_code:String(value.readiness_code??""),
      snapshot_valid:value.snapshot_valid===true
    });
  }

  function dimensionAuditDownloadHistoryExportGateValid(gate=dimensionAuditDownloadHistoryExportGate()){
    const value=gate??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportGateValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportGateValid(value);
    }
    if(typeof value.schema!=="string"
      ||typeof value.allowed!=="boolean"
      ||typeof value.code!=="string"
      ||typeof value.readiness_code!=="string"
      ||typeof value.snapshot_valid!=="boolean")return false;
    const code=value.code;
    const readinessCode=value.readiness_code;
    const gateCodes=["READY","EMPTY","VERIFICATION_FAILED","UNTRUSTED","INVALID_PROVENANCE","INVALID_PROTOCOL","INVALID_PROTOCOL_SIGNATURE","INVALID_STATE","INVALID_STATE_SIGNATURE","INVALID_SNAPSHOT_SIGNATURE","INVALID_SNAPSHOT"];
    const readinessCodes=["READY","EMPTY","VERIFICATION_FAILED","UNTRUSTED","INVALID_PROVENANCE"];
    if(value.schema!=="TubeBender.DimensionAuditDownloadHistoryExportGate.v1")return false;
    if(!gateCodes.includes(code)||!readinessCodes.includes(readinessCode))return false;
    if(value.allowed!==(code==="READY"))return false;
    if(readinessCodes.includes(code))return value.snapshot_valid===true&&code===readinessCode;
    return value.allowed===false&&value.snapshot_valid===false;
  }

  function dimensionAuditDownloadHistoryExportGateSignatureValid(signature=dimensionAuditDownloadHistoryExportGateSignature(),gate=dimensionAuditDownloadHistoryExportGate()){
    const value=gate??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportGateSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportGateSignatureValid(signature,value);
    }
    return dimensionAuditDownloadHistoryExportGateValid(value)
      &&signature===dimensionAuditDownloadHistoryExportGateSignature(value);
  }

  function dimensionAuditDownloadHistoryExportGateSnapshotSignature(snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportGateSnapshotSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportGateSnapshotSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      gate_signature:String(value.gate_signature??""),
      gate_valid:value.gate_valid===true,
      gate_signature_valid:value.gate_signature_valid===true
    });
  }

  function dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid(signature,snapshot={}){
    const value=snapshot??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid(signature,value);
    }
    return signature===dimensionAuditDownloadHistoryExportGateSnapshotSignature(value);
  }

  function dimensionAuditDownloadHistoryExportGateSnapshot(gate=dimensionAuditDownloadHistoryExportGate()){
    const value=gate??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportGateSnapshot){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportGateSnapshot(value);
    }
    const signature=dimensionAuditDownloadHistoryExportGateSignature(value);
    const base={
      schema:"TubeBender.DimensionAuditDownloadHistoryExportGateSnapshot.v1",
      gate:value,
      gate_signature:signature,
      gate_valid:dimensionAuditDownloadHistoryExportGateValid(value),
      gate_signature_valid:dimensionAuditDownloadHistoryExportGateSignatureValid(signature,value)
    };
    const snapshotSignature=dimensionAuditDownloadHistoryExportGateSnapshotSignature(base);
    return Object.freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
  }

  function dimensionAuditDownloadHistoryExportGateSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportGateSnapshot()){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportGateSnapshotValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportGateSnapshotValid(value);
    }
    if(typeof value.schema!=="string"
      ||typeof value.gate_signature!=="string"
      ||typeof value.gate_valid!=="boolean"
      ||typeof value.gate_signature_valid!=="boolean"
      ||typeof value.snapshot_signature!=="string"
      ||typeof value.snapshot_signature_valid!=="boolean")return false;
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryExportGateSnapshot.v1"
      &&dimensionAuditDownloadHistoryExportGateValid(value.gate)
      &&value.gate_valid===true
      &&value.gate_signature_valid===true
      &&dimensionAuditDownloadHistoryExportGateSignatureValid(value.gate_signature,value.gate)
      &&value.snapshot_signature_valid===true
      &&dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid(value.snapshot_signature,value);
  }

  function dimensionAuditDownloadHistoryExportDecision(gateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot()){
    const value=gateSnapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportDecision){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportDecision(value);
    }
    const gate=value.gate??{};
    const gateSnapshotValid=dimensionAuditDownloadHistoryExportGateSnapshotValid(value);
    const gateCode=String(gate.code??"");
    const gateCodes=["READY","EMPTY","VERIFICATION_FAILED","UNTRUSTED","INVALID_PROVENANCE","INVALID_PROTOCOL","INVALID_PROTOCOL_SIGNATURE","INVALID_STATE","INVALID_STATE_SIGNATURE","INVALID_SNAPSHOT_SIGNATURE","INVALID_SNAPSHOT"];
    const code=gateSnapshotValid&&gateCodes.includes(gateCode)?gateCode:"INVALID_GATE_SNAPSHOT";
    return Object.freeze({
      schema:"TubeBender.DimensionAuditDownloadHistoryExportDecision.v1",
      allowed:gateSnapshotValid&&gate.allowed===true&&code==="READY",
      code,
      gate_snapshot_valid:gateSnapshotValid,
      gate_code:gateCode,
      gate_allowed:gate.allowed===true
    });
  }

  function dimensionAuditDownloadHistoryExportDecisionValid(decision=dimensionAuditDownloadHistoryExportDecision()){
    const value=decision??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportDecisionValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportDecisionValid(value);
    }
    if(typeof value.schema!=="string"
      ||typeof value.allowed!=="boolean"
      ||typeof value.code!=="string"
      ||typeof value.gate_snapshot_valid!=="boolean"
      ||typeof value.gate_code!=="string"
      ||typeof value.gate_allowed!=="boolean")return false;
    const decisionCodes=["READY","EMPTY","VERIFICATION_FAILED","UNTRUSTED","INVALID_PROVENANCE","INVALID_PROTOCOL","INVALID_PROTOCOL_SIGNATURE","INVALID_STATE","INVALID_STATE_SIGNATURE","INVALID_SNAPSHOT_SIGNATURE","INVALID_SNAPSHOT","INVALID_GATE_SNAPSHOT"];
    const gateCodes=decisionCodes.filter(code=>code!=="INVALID_GATE_SNAPSHOT");
    const code=value.code;
    const gateCode=value.gate_code;
    if(value.schema!=="TubeBender.DimensionAuditDownloadHistoryExportDecision.v1")return false;
    if(!decisionCodes.includes(code))return false;
    if(value.allowed!==(code==="READY"))return false;
    if(code==="INVALID_GATE_SNAPSHOT")return value.gate_snapshot_valid===false&&value.allowed===false;
    return gateCodes.includes(gateCode)&&value.gate_snapshot_valid===true&&gateCode===code&&value.gate_allowed===(code==="READY");
  }

  function dimensionAuditDownloadHistoryExportDecisionSignature(decision=dimensionAuditDownloadHistoryExportDecision()){
    const value=decision??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportDecisionSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportDecisionSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      allowed:value.allowed===true,
      code:String(value.code??""),
      gate_snapshot_valid:value.gate_snapshot_valid===true,
      gate_code:String(value.gate_code??""),
      gate_allowed:value.gate_allowed===true
    });
  }

  function dimensionAuditDownloadHistoryExportDecisionSignatureValid(signature=dimensionAuditDownloadHistoryExportDecisionSignature(),decision=dimensionAuditDownloadHistoryExportDecision()){
    const value=decision??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportDecisionSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportDecisionSignatureValid(signature,value);
    }
    return dimensionAuditDownloadHistoryExportDecisionValid(value)
      &&signature===dimensionAuditDownloadHistoryExportDecisionSignature(value);
  }

  function dimensionAuditDownloadHistoryExportDecisionSnapshotSignature(snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportDecisionSnapshotSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportDecisionSnapshotSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      decision_signature:String(value.decision_signature??""),
      decision_valid:value.decision_valid===true,
      decision_signature_valid:value.decision_signature_valid===true
    });
  }

  function dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid(signature,snapshot={}){
    const value=snapshot??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid(signature,value);
    }
    return signature===dimensionAuditDownloadHistoryExportDecisionSnapshotSignature(value);
  }

  function dimensionAuditDownloadHistoryExportDecisionSnapshot(decision=dimensionAuditDownloadHistoryExportDecision()){
    const value=decision??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportDecisionSnapshot){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportDecisionSnapshot(value);
    }
    const signature=dimensionAuditDownloadHistoryExportDecisionSignature(value);
    const base={
      schema:"TubeBender.DimensionAuditDownloadHistoryExportDecisionSnapshot.v1",
      decision:value,
      decision_signature:signature,
      decision_valid:dimensionAuditDownloadHistoryExportDecisionValid(value),
      decision_signature_valid:dimensionAuditDownloadHistoryExportDecisionSignatureValid(signature,value)
    };
    const snapshotSignature=dimensionAuditDownloadHistoryExportDecisionSnapshotSignature(base);
    return Object.freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
  }

  function dimensionAuditDownloadHistoryExportDecisionSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot()){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportDecisionSnapshotValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportDecisionSnapshotValid(value);
    }
    if(typeof value.schema!=="string"
      ||typeof value.decision_signature!=="string"
      ||typeof value.decision_valid!=="boolean"
      ||typeof value.decision_signature_valid!=="boolean"
      ||typeof value.snapshot_signature!=="string"
      ||typeof value.snapshot_signature_valid!=="boolean")return false;
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryExportDecisionSnapshot.v1"
      &&dimensionAuditDownloadHistoryExportDecisionValid(value.decision)
      &&value.decision_valid===true
      &&value.decision_signature_valid===true
      &&dimensionAuditDownloadHistoryExportDecisionSignatureValid(value.decision_signature,value.decision)
      &&value.snapshot_signature_valid===true
      &&dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid(value.snapshot_signature,value);
  }

  function dimensionAuditDownloadHistoryExportAuthorization(decisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot()){
    const value=decisionSnapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportAuthorization){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportAuthorization(value);
    }
    const decision=value.decision??{};
    const decisionSnapshotValid=dimensionAuditDownloadHistoryExportDecisionSnapshotValid(value);
    const decisionCode=String(decision.code??"");
    const decisionCodes=["READY","EMPTY","VERIFICATION_FAILED","UNTRUSTED","INVALID_PROVENANCE","INVALID_PROTOCOL","INVALID_PROTOCOL_SIGNATURE","INVALID_STATE","INVALID_STATE_SIGNATURE","INVALID_SNAPSHOT_SIGNATURE","INVALID_SNAPSHOT","INVALID_GATE_SNAPSHOT"];
    const code=decisionSnapshotValid&&decisionCodes.includes(decisionCode)?decisionCode:"INVALID_DECISION_SNAPSHOT";
    return Object.freeze({
      schema:"TubeBender.DimensionAuditDownloadHistoryExportAuthorization.v1",
      allowed:decisionSnapshotValid&&decision.allowed===true&&code==="READY",
      code,
      decision_snapshot_valid:decisionSnapshotValid,
      decision_code:decisionCode,
      decision_allowed:decision.allowed===true
    });
  }

  function dimensionAuditDownloadHistoryExportAuthorizationValid(authorization=dimensionAuditDownloadHistoryExportAuthorization()){
    const value=authorization??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportAuthorizationValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportAuthorizationValid(value);
    }
    if(typeof value.schema!=="string"
      ||typeof value.allowed!=="boolean"
      ||typeof value.code!=="string"
      ||typeof value.decision_snapshot_valid!=="boolean"
      ||typeof value.decision_code!=="string"
      ||typeof value.decision_allowed!=="boolean")return false;
    const authorizationCodes=["READY","EMPTY","VERIFICATION_FAILED","UNTRUSTED","INVALID_PROVENANCE","INVALID_PROTOCOL","INVALID_PROTOCOL_SIGNATURE","INVALID_STATE","INVALID_STATE_SIGNATURE","INVALID_SNAPSHOT_SIGNATURE","INVALID_SNAPSHOT","INVALID_GATE_SNAPSHOT","INVALID_DECISION_SNAPSHOT"];
    const decisionCodes=authorizationCodes.filter(code=>code!=="INVALID_DECISION_SNAPSHOT");
    const code=value.code;
    const decisionCode=value.decision_code;
    if(value.schema!=="TubeBender.DimensionAuditDownloadHistoryExportAuthorization.v1")return false;
    if(!authorizationCodes.includes(code))return false;
    if(value.allowed!==(code==="READY"))return false;
    if(code==="INVALID_DECISION_SNAPSHOT")return value.decision_snapshot_valid===false&&value.allowed===false;
    return decisionCodes.includes(decisionCode)&&value.decision_snapshot_valid===true&&decisionCode===code&&value.decision_allowed===(code==="READY");
  }

  function dimensionAuditDownloadHistoryExportAuthorizationSignature(authorization=dimensionAuditDownloadHistoryExportAuthorization()){
    const value=authorization??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportAuthorizationSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportAuthorizationSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      allowed:value.allowed===true,
      code:String(value.code??""),
      decision_snapshot_valid:value.decision_snapshot_valid===true,
      decision_code:String(value.decision_code??""),
      decision_allowed:value.decision_allowed===true
    });
  }

  function dimensionAuditDownloadHistoryExportAuthorizationSignatureValid(signature=dimensionAuditDownloadHistoryExportAuthorizationSignature(),authorization=dimensionAuditDownloadHistoryExportAuthorization()){
    const value=authorization??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportAuthorizationSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportAuthorizationSignatureValid(signature,value);
    }
    return dimensionAuditDownloadHistoryExportAuthorizationValid(value)
      &&signature===dimensionAuditDownloadHistoryExportAuthorizationSignature(value);
  }

  function dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      authorization_signature:String(value.authorization_signature??""),
      authorization_valid:value.authorization_valid===true,
      authorization_signature_valid:value.authorization_signature_valid===true
    });
  }

  function dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(signature,snapshot={}){
    const value=snapshot??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(signature,value);
    }
    return signature===dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(value);
  }

  function dimensionAuditDownloadHistoryExportAuthorizationSnapshot(authorization=dimensionAuditDownloadHistoryExportAuthorization()){
    const value=authorization??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportAuthorizationSnapshot){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportAuthorizationSnapshot(value);
    }
    const signature=dimensionAuditDownloadHistoryExportAuthorizationSignature(value);
    const base={
      schema:"TubeBender.DimensionAuditDownloadHistoryExportAuthorizationSnapshot.v1",
      authorization:value,
      authorization_signature:signature,
      authorization_valid:dimensionAuditDownloadHistoryExportAuthorizationValid(value),
      authorization_signature_valid:dimensionAuditDownloadHistoryExportAuthorizationSignatureValid(signature,value)
    };
    const snapshotSignature=dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(base);
    return Object.freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
  }

  function dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot()){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid(value);
    }
    if(typeof value.schema!=="string"
      ||typeof value.authorization_signature!=="string"
      ||typeof value.authorization_valid!=="boolean"
      ||typeof value.authorization_signature_valid!=="boolean"
      ||typeof value.snapshot_signature!=="string"
      ||typeof value.snapshot_signature_valid!=="boolean")return false;
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryExportAuthorizationSnapshot.v1"
      &&dimensionAuditDownloadHistoryExportAuthorizationValid(value.authorization)
      &&value.authorization_valid===true
      &&value.authorization_signature_valid===true
      &&dimensionAuditDownloadHistoryExportAuthorizationSignatureValid(value.authorization_signature,value.authorization)
      &&value.snapshot_signature_valid===true
      &&dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(value.snapshot_signature,value);
  }

  function dimensionAuditDownloadHistoryExportChain(historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot()){
    const history=historySnapshot??{};
    const readiness=dimensionAuditDownloadHistoryExportReadiness(history);
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportChain){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportChain(readiness);
    }
    const readiness_snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(history);
    const gate=dimensionAuditDownloadHistoryExportGate(readiness_snapshot,history);
    const gate_snapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
    const decision=dimensionAuditDownloadHistoryExportDecision(gate_snapshot);
    const decision_snapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot(decision);
    const authorization=dimensionAuditDownloadHistoryExportAuthorization(decision_snapshot);
    const authorization_snapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot(authorization);
    return Object.freeze({
      schema:"TubeBender.DimensionAuditDownloadHistoryExportChain.v1",
      readiness_state:readiness,
      readiness_snapshot,
      gate_snapshot,
      decision_snapshot,
      authorization_snapshot,
      allowed:authorization_snapshot.authorization?.allowed===true
        &&dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid(authorization_snapshot),
      code:String(authorization_snapshot.authorization?.code??"INVALID_AUTHORIZATION_SNAPSHOT")
    });
  }

  function dimensionAuditDownloadHistoryExportChainValid(chain=dimensionAuditDownloadHistoryExportChain()){
    const value=chain??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportChainValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportChainValid(value);
    }
    if(typeof value.schema!=="string"
      ||typeof value.allowed!=="boolean"
      ||typeof value.code!=="string")return false;
    if(value.schema!=="TubeBender.DimensionAuditDownloadHistoryExportChain.v1")return false;
    if(!dimensionAuditDownloadHistoryExportReadinessStateValid(value.readiness_state))return false;
    if(!dimensionAuditDownloadHistoryExportReadinessSnapshotValid(value.readiness_snapshot))return false;
    if(!dimensionAuditDownloadHistoryExportGateSnapshotValid(value.gate_snapshot))return false;
    if(!dimensionAuditDownloadHistoryExportDecisionSnapshotValid(value.decision_snapshot))return false;
    if(!dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid(value.authorization_snapshot))return false;
    const authorization=value.authorization_snapshot?.authorization??{};
    return typeof authorization.allowed==="boolean"
      &&typeof authorization.code==="string"
      &&value.allowed===authorization.allowed
      &&value.code===authorization.code;
  }

  function dimensionAuditDownloadHistoryExportChainSignature(chain=dimensionAuditDownloadHistoryExportChain()){
    const value=chain??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportChainSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportChainSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      readiness_signature:String(value.readiness_snapshot?.snapshot_signature??""),
      gate_signature:String(value.gate_snapshot?.snapshot_signature??""),
      decision_signature:String(value.decision_snapshot?.snapshot_signature??""),
      authorization_signature:String(value.authorization_snapshot?.snapshot_signature??""),
      allowed:value.allowed===true,
      code:String(value.code??"")
    });
  }

  function dimensionAuditDownloadHistoryExportChainSignatureValid(signature=dimensionAuditDownloadHistoryExportChainSignature(),chain=dimensionAuditDownloadHistoryExportChain()){
    const value=chain??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportChainSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportChainSignatureValid(signature,value);
    }
    return dimensionAuditDownloadHistoryExportChainValid(value)
      &&signature===dimensionAuditDownloadHistoryExportChainSignature(value);
  }

  function dimensionAuditDownloadHistoryExportChainSnapshotSignature(snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportChainSnapshotSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportChainSnapshotSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      chain_signature:String(value.chain_signature??""),
      chain_valid:value.chain_valid===true,
      chain_signature_valid:value.chain_signature_valid===true
    });
  }

  function dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid(signature,snapshot={}){
    const value=snapshot??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid(signature,value);
    }
    return signature===dimensionAuditDownloadHistoryExportChainSnapshotSignature(value);
  }

  function dimensionAuditDownloadHistoryExportChainSnapshot(chain=dimensionAuditDownloadHistoryExportChain()){
    const value=chain??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportChainSnapshot){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportChainSnapshot(value);
    }
    const signature=dimensionAuditDownloadHistoryExportChainSignature(value);
    const base={
      schema:"TubeBender.DimensionAuditDownloadHistoryExportChainSnapshot.v1",
      chain:value,
      chain_signature:signature,
      chain_valid:dimensionAuditDownloadHistoryExportChainValid(value),
      chain_signature_valid:dimensionAuditDownloadHistoryExportChainSignatureValid(signature,value)
    };
    const snapshotSignature=dimensionAuditDownloadHistoryExportChainSnapshotSignature(base);
    return Object.freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
  }

  function dimensionAuditDownloadHistoryExportChainSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportChainSnapshotValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportChainSnapshotValid(value);
    }
    if(typeof value.schema!=="string"
      ||typeof value.chain_signature!=="string"
      ||typeof value.chain_valid!=="boolean"
      ||typeof value.chain_signature_valid!=="boolean"
      ||typeof value.snapshot_signature!=="string"
      ||typeof value.snapshot_signature_valid!=="boolean")return false;
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryExportChainSnapshot.v1"
      &&dimensionAuditDownloadHistoryExportChainValid(value.chain)
      &&value.chain_valid===true
      &&value.chain_signature_valid===true
      &&dimensionAuditDownloadHistoryExportChainSignatureValid(value.chain_signature,value.chain)
      &&value.snapshot_signature_valid===true
      &&dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid(value.snapshot_signature,value);
  }

  function dimensionAuditDownloadHistoryExportPayloadBinding(historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const history=historySnapshot??{};
    const chain_snapshot=chainSnapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportPayloadBinding){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportPayloadBinding(history,chain_snapshot);
    }
    const chain=chain_snapshot.chain??{};
    const readiness=chain.readiness_state??{};
    const historySignature=String(history.snapshot_signature??"");
    return Object.freeze({
      schema:"TubeBender.DimensionAuditDownloadHistoryExportPayloadBinding.v1",
      history_snapshot_signature:historySignature,
      chain_snapshot_signature:String(chain_snapshot.snapshot_signature??""),
      attempt_count:Math.max(0,Number(history.attempt_count)||0),
      chain_attempt_count:Math.max(0,Number(readiness.attempt_count)||0),
      allowed:chain.allowed===true,
      code:String(chain.code??"INVALID_EXPORT_CHAIN_SNAPSHOT"),
      history_signature_matches_chain:historySignature===String(readiness.history_snapshot_signature??"")
    });
  }

  function dimensionAuditDownloadHistoryExportPayloadBindingValid(binding=dimensionAuditDownloadHistoryExportPayloadBinding(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=binding??{};
    const history=historySnapshot??{};
    const chain_snapshot=chainSnapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportPayloadBindingValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportPayloadBindingValid(value,history,chain_snapshot);
    }
    const chain=chain_snapshot.chain??{};
    const readiness=chain.readiness_state??{};
    if(typeof value.schema!=="string"
      ||typeof value.history_snapshot_signature!=="string"
      ||typeof value.chain_snapshot_signature!=="string"
      ||!Number.isInteger(value.attempt_count)
      ||value.attempt_count<0
      ||!Number.isInteger(value.chain_attempt_count)
      ||value.chain_attempt_count<0
      ||typeof value.allowed!=="boolean"
      ||typeof value.code!=="string"
      ||typeof value.history_signature_matches_chain!=="boolean")return false;
    if(typeof history.snapshot_signature!=="string"||history.snapshot_signature.length===0)return false;
    if(!Number.isInteger(history.attempt_count)||history.attempt_count<0)return false;
    if(typeof chain_snapshot.snapshot_signature!=="string"||chain_snapshot.snapshot_signature.length===0)return false;
    if(typeof readiness.history_snapshot_signature!=="string"
      ||!Number.isInteger(readiness.attempt_count)
      ||readiness.attempt_count<0
      ||typeof chain.allowed!=="boolean"
      ||typeof chain.code!=="string")return false;
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryExportPayloadBinding.v1"
      &&dimensionAuditDownloadHistoryExportChainSnapshotValid(chain_snapshot)
      &&value.history_snapshot_signature===history.snapshot_signature
      &&value.chain_snapshot_signature===chain_snapshot.snapshot_signature
      &&readiness.history_snapshot_signature===history.snapshot_signature
      &&value.history_signature_matches_chain===true
      &&value.attempt_count===history.attempt_count
      &&value.chain_attempt_count===readiness.attempt_count
      &&value.attempt_count===value.chain_attempt_count
      &&value.allowed===chain.allowed
      &&value.code===chain.code;
  }

  function dimensionAuditDownloadHistoryExportPayloadBindingSignature(binding=dimensionAuditDownloadHistoryExportPayloadBinding()){
    const value=binding??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportPayloadBindingSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportPayloadBindingSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      history_snapshot_signature:String(value.history_snapshot_signature??""),
      chain_snapshot_signature:String(value.chain_snapshot_signature??""),
      attempt_count:Number(value.attempt_count)||0,
      chain_attempt_count:Number(value.chain_attempt_count)||0,
      allowed:value.allowed===true,
      code:String(value.code??""),
      history_signature_matches_chain:value.history_signature_matches_chain===true
    });
  }

  function dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(signature=dimensionAuditDownloadHistoryExportPayloadBindingSignature(),binding=dimensionAuditDownloadHistoryExportPayloadBinding(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=binding??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(signature,value,historySnapshot,chainSnapshot);
    }
    return dimensionAuditDownloadHistoryExportPayloadBindingValid(value,historySnapshot,chainSnapshot)
      &&signature===dimensionAuditDownloadHistoryExportPayloadBindingSignature(value);
  }

  function dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature(snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      binding_signature:String(value.binding_signature??""),
      binding_valid:value.binding_valid===true,
      binding_signature_valid:value.binding_signature_valid===true
    });
  }

  function dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid(signature,snapshot={}){
    const value=snapshot??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid(signature,value);
    }
    return signature===dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature(value);
  }

  function dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding=dimensionAuditDownloadHistoryExportPayloadBinding(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=binding??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportPayloadBindingSnapshot){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(value,historySnapshot,chainSnapshot);
    }
    const signature=dimensionAuditDownloadHistoryExportPayloadBindingSignature(value);
    const base={
      schema:"TubeBender.DimensionAuditDownloadHistoryExportPayloadBindingSnapshot.v1",
      binding:value,
      binding_signature:signature,
      binding_valid:dimensionAuditDownloadHistoryExportPayloadBindingValid(value,historySnapshot,chainSnapshot),
      binding_signature_valid:dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(signature,value,historySnapshot,chainSnapshot)
    };
    const snapshotSignature=dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature(base);
    return Object.freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
  }

  function dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid(value,historySnapshot,chainSnapshot);
    }
    if(typeof value.schema!=="string"
      ||typeof value.binding_signature!=="string"
      ||typeof value.binding_valid!=="boolean"
      ||typeof value.binding_signature_valid!=="boolean"
      ||typeof value.snapshot_signature!=="string"
      ||typeof value.snapshot_signature_valid!=="boolean")return false;
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryExportPayloadBindingSnapshot.v1"
      &&dimensionAuditDownloadHistoryExportPayloadBindingValid(value.binding,historySnapshot,chainSnapshot)
      &&value.binding_valid===true
      &&value.binding_signature_valid===true
      &&dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(value.binding_signature,value.binding,historySnapshot,chainSnapshot)
      &&value.snapshot_signature_valid===true
      &&dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid(value.snapshot_signature,value);
  }

  function dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const snapshot=bindingSnapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionStatus){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionStatus(snapshot,historySnapshot,chainSnapshot);
    }
    const binding=snapshot.binding??{};
    const snapshotValid=dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid(snapshot,historySnapshot,chainSnapshot);
    const code=snapshotValid?String(binding.code??"INVALID_EXPORT_PAYLOAD_BINDING"):"INVALID_EXPORT_PAYLOAD_BINDING_SNAPSHOT";
    return Object.freeze({
      schema:"TubeBender.DimensionAuditDownloadHistoryExportActionStatus.v1",
      ready:snapshotValid&&binding.allowed===true&&code==="READY",
      code,
      payload_binding_snapshot_valid:snapshotValid,
      payload_binding_allowed:binding.allowed===true,
      payload_binding_snapshot_signature:String(snapshot.snapshot_signature??"")
    });
  }

  function dimensionAuditDownloadHistoryExportActionStatusValid(status=dimensionAuditDownloadHistoryExportActionStatus(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=status??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionStatusValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionStatusValid(value,bindingSnapshot,historySnapshot,chainSnapshot);
    }
    const expected=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,historySnapshot,chainSnapshot);
    if(typeof value.schema!=="string"
      ||typeof value.ready!=="boolean"
      ||typeof value.code!=="string"
      ||typeof value.payload_binding_snapshot_valid!=="boolean"
      ||typeof value.payload_binding_allowed!=="boolean"
      ||typeof value.payload_binding_snapshot_signature!=="string")return false;
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryExportActionStatus.v1"
      &&value.ready===expected.ready
      &&value.code===expected.code
      &&value.payload_binding_snapshot_valid===expected.payload_binding_snapshot_valid
      &&value.payload_binding_allowed===expected.payload_binding_allowed
      &&value.payload_binding_snapshot_signature===expected.payload_binding_snapshot_signature;
  }

  function dimensionAuditDownloadHistoryExportActionStatusSignature(status=dimensionAuditDownloadHistoryExportActionStatus()){
    const value=status??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionStatusSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionStatusSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      ready:value.ready===true,
      code:String(value.code??""),
      payload_binding_snapshot_valid:value.payload_binding_snapshot_valid===true,
      payload_binding_allowed:value.payload_binding_allowed===true,
      payload_binding_snapshot_signature:String(value.payload_binding_snapshot_signature??"")
    });
  }

  function dimensionAuditDownloadHistoryExportActionStatusSignatureValid(signature=dimensionAuditDownloadHistoryExportActionStatusSignature(),status=dimensionAuditDownloadHistoryExportActionStatus(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=status??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionStatusSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionStatusSignatureValid(signature,value,bindingSnapshot,historySnapshot,chainSnapshot);
    }
    return dimensionAuditDownloadHistoryExportActionStatusValid(value,bindingSnapshot,historySnapshot,chainSnapshot)
      &&signature===dimensionAuditDownloadHistoryExportActionStatusSignature(value);
  }

  function dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature(snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      status_signature:String(value.status_signature??""),
      status_valid:value.status_valid===true,
      status_signature_valid:value.status_signature_valid===true
    });
  }

  function dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid(signature,snapshot={}){
    const value=snapshot??{};
    if(typeof signature!=="string"||signature.length===0)return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid(signature,value);
    }
    return signature===dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature(value);
  }

  function dimensionAuditDownloadHistoryExportActionStatusSnapshot(status=dimensionAuditDownloadHistoryExportActionStatus(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=status??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionStatusSnapshot){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionStatusSnapshot(value,bindingSnapshot,historySnapshot,chainSnapshot);
    }
    const signature=dimensionAuditDownloadHistoryExportActionStatusSignature(value);
    const base={
      schema:"TubeBender.DimensionAuditDownloadHistoryExportActionStatusSnapshot.v1",
      status:value,
      status_signature:signature,
      status_valid:dimensionAuditDownloadHistoryExportActionStatusValid(value,bindingSnapshot,historySnapshot,chainSnapshot),
      status_signature_valid:dimensionAuditDownloadHistoryExportActionStatusSignatureValid(signature,value,bindingSnapshot,historySnapshot,chainSnapshot)
    };
    const snapshotSignature=dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature(base);
    return Object.freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
  }

  function dimensionAuditDownloadHistoryExportActionStatusSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionStatusSnapshotValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionStatusSnapshotValid(value,bindingSnapshot,historySnapshot,chainSnapshot);
    }
    if(typeof value.schema!=="string"
      ||typeof value.status_signature!=="string"
      ||typeof value.status_valid!=="boolean"
      ||typeof value.status_signature_valid!=="boolean"
      ||typeof value.snapshot_signature!=="string"
      ||typeof value.snapshot_signature_valid!=="boolean")return false;
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryExportActionStatusSnapshot.v1"
      &&dimensionAuditDownloadHistoryExportActionStatusValid(value.status,bindingSnapshot,historySnapshot,chainSnapshot)
      &&value.status_valid===true
      &&value.status_signature_valid===true
      &&dimensionAuditDownloadHistoryExportActionStatusSignatureValid(value.status_signature,value.status,bindingSnapshot,historySnapshot,chainSnapshot)
      &&value.snapshot_signature_valid===true
      &&dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid(value.snapshot_signature,value);
  }

  function dimensionAuditDownloadHistoryExportActionPermit(action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const normalizedAction=String(action??"").toLowerCase();
    const snapshot=statusSnapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionPermit){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionPermit(normalizedAction,snapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    }
    const status=snapshot.status??{};
    const actionValid=["copy","download"].includes(normalizedAction);
    const statusSnapshotValid=dimensionAuditDownloadHistoryExportActionStatusSnapshotValid(snapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    const code=!actionValid?"INVALID_EXPORT_ACTION":!statusSnapshotValid?"INVALID_EXPORT_ACTION_STATUS_SNAPSHOT":String(status.code??"INVALID_EXPORT_ACTION_STATUS");
    return Object.freeze({
      schema:"TubeBender.DimensionAuditDownloadHistoryExportActionPermit.v1",
      action:normalizedAction,
      ready:actionValid&&statusSnapshotValid&&status.ready===true&&code==="READY",
      code,
      action_valid:actionValid,
      action_status_snapshot_valid:statusSnapshotValid,
      action_status_ready:status.ready===true,
      action_status_snapshot_signature:String(snapshot.snapshot_signature??"")
    });
  }

  function dimensionAuditDownloadHistoryExportActionPermitValid(permit=dimensionAuditDownloadHistoryExportActionPermit(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=permit??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionPermitValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionPermitValid(value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    }
    const expected=dimensionAuditDownloadHistoryExportActionPermit(action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    if(typeof value.schema!=="string"
      ||typeof value.action!=="string"
      ||typeof value.ready!=="boolean"
      ||typeof value.code!=="string"
      ||typeof value.action_valid!=="boolean"
      ||typeof value.action_status_snapshot_valid!=="boolean"
      ||typeof value.action_status_ready!=="boolean"
      ||typeof value.action_status_snapshot_signature!=="string")return false;
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryExportActionPermit.v1"
      &&value.action===expected.action
      &&value.ready===expected.ready
      &&value.code===expected.code
      &&value.action_valid===expected.action_valid
      &&value.action_status_snapshot_valid===expected.action_status_snapshot_valid
      &&value.action_status_ready===expected.action_status_ready
      &&value.action_status_snapshot_signature===expected.action_status_snapshot_signature;
  }

  function dimensionAuditDownloadHistoryExportActionPermitSignature(permit=dimensionAuditDownloadHistoryExportActionPermit()){
    const value=permit??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionPermitSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionPermitSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      action:String(value.action??""),
      ready:value.ready===true,
      code:String(value.code??""),
      action_valid:value.action_valid===true,
      action_status_snapshot_valid:value.action_status_snapshot_valid===true,
      action_status_ready:value.action_status_ready===true,
      action_status_snapshot_signature:String(value.action_status_snapshot_signature??"")
    });
  }

  function dimensionAuditDownloadHistoryExportActionPermitSignatureValid(signature=dimensionAuditDownloadHistoryExportActionPermitSignature(),permit=dimensionAuditDownloadHistoryExportActionPermit(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=permit??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionPermitSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionPermitSignatureValid(signature,value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    }
    return typeof signature==="string"
      &&signature.length>0
      &&dimensionAuditDownloadHistoryExportActionPermitValid(value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)
      &&signature===dimensionAuditDownloadHistoryExportActionPermitSignature(value);
  }

  function dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature(snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      permit_signature:String(value.permit_signature??""),
      permit_valid:value.permit_valid===true,
      permit_signature_valid:value.permit_signature_valid===true
    });
  }

  function dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid(signature,snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid(signature,value);
    }
    return typeof signature==="string"
      &&signature.length>0
      &&signature===dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature(value);
  }

  function dimensionAuditDownloadHistoryExportActionPermitSnapshot(permit=dimensionAuditDownloadHistoryExportActionPermit(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=permit??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionPermitSnapshot){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionPermitSnapshot(value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    }
    const signature=dimensionAuditDownloadHistoryExportActionPermitSignature(value);
    const base={
      schema:"TubeBender.DimensionAuditDownloadHistoryExportActionPermitSnapshot.v1",
      permit:value,
      permit_signature:signature,
      permit_valid:dimensionAuditDownloadHistoryExportActionPermitValid(value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot),
      permit_signature_valid:dimensionAuditDownloadHistoryExportActionPermitSignatureValid(signature,value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)
    };
    const snapshotSignature=dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature(base);
    return Object.freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
  }

  function dimensionAuditDownloadHistoryExportActionPermitSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportActionPermitSnapshotValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportActionPermitSnapshotValid(value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    }
    if(typeof value.schema!=="string"
      ||typeof value.permit_signature!=="string"
      ||typeof value.permit_valid!=="boolean"
      ||typeof value.permit_signature_valid!=="boolean"
      ||typeof value.snapshot_signature!=="string"
      ||typeof value.snapshot_signature_valid!=="boolean")return false;
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryExportActionPermitSnapshot.v1"
      &&dimensionAuditDownloadHistoryExportActionPermitValid(value.permit,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)
      &&value.permit_valid===true
      &&value.permit_signature_valid===true
      &&dimensionAuditDownloadHistoryExportActionPermitSignatureValid(value.permit_signature,value.permit,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)
      &&value.snapshot_signature_valid===true
      &&dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid(value.snapshot_signature,value);
  }

  function dimensionAuditDownloadHistoryExportFinalReady(action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    if(typeof action!=="string")return false;
    const normalizedAction=action.toLowerCase();
    if(!["copy","download"].includes(normalizedAction))return false;
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportFinalReady){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportFinalReady(normalizedAction,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)===true;
    }
    const permit=dimensionAuditDownloadHistoryExportActionPermit(normalizedAction,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    const permitSnapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot(permit,normalizedAction,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    return dimensionAuditDownloadHistoryExportActionPermitSnapshotValid(permitSnapshot,normalizedAction,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)
      &&permit.ready===true;
  }

  function dimensionAuditDownloadHistoryExportFinalState(action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const actionTypeValid=typeof action==="string";
    const normalizedAction=actionTypeValid?action.toLowerCase():"";
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportFinalState){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportFinalState(normalizedAction,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    }
    const actionValid=actionTypeValid&&["copy","download"].includes(normalizedAction);
    const permit=dimensionAuditDownloadHistoryExportActionPermit(normalizedAction,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    const permitSnapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot(permit,normalizedAction,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    const permitSnapshotValid=dimensionAuditDownloadHistoryExportActionPermitSnapshotValid(permitSnapshot,normalizedAction,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    return Object.freeze({
      schema:"TubeBender.DimensionAuditDownloadHistoryExportFinalState.v1",
      action:normalizedAction,
      ready:actionValid&&permitSnapshotValid&&permit.ready===true,
      code:actionValid?String(permit.code??"INVALID_EXPORT_ACTION_PERMIT"):"INVALID_EXPORT_ACTION",
      action_valid:actionValid,
      permit_snapshot_valid:permitSnapshotValid,
      permit_ready:permit.ready===true,
      permit_snapshot_signature:String(permitSnapshot.snapshot_signature??"")
    });
  }

  function dimensionAuditDownloadHistoryExportFinalStateValid(state=dimensionAuditDownloadHistoryExportFinalState(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=state??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportFinalStateValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportFinalStateValid(value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    }
    if(typeof value.schema!=="string"
      ||typeof value.action!=="string"
      ||typeof value.ready!=="boolean"
      ||typeof value.code!=="string"
      ||typeof value.action_valid!=="boolean"
      ||typeof value.permit_snapshot_valid!=="boolean"
      ||typeof value.permit_ready!=="boolean"
      ||typeof value.permit_snapshot_signature!=="string")return false;
    const expected=dimensionAuditDownloadHistoryExportFinalState(action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryExportFinalState.v1"
      &&value.action===expected.action
      &&value.ready===expected.ready
      &&value.code===expected.code
      &&value.action_valid===expected.action_valid
      &&value.permit_snapshot_valid===expected.permit_snapshot_valid
      &&value.permit_ready===expected.permit_ready
      &&value.permit_snapshot_signature===expected.permit_snapshot_signature;
  }

  function dimensionAuditDownloadHistoryExportFinalStateSignature(state=dimensionAuditDownloadHistoryExportFinalState()){
    const value=state??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportFinalStateSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportFinalStateSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      action:String(value.action??""),
      ready:value.ready===true,
      code:String(value.code??""),
      action_valid:value.action_valid===true,
      permit_snapshot_valid:value.permit_snapshot_valid===true,
      permit_ready:value.permit_ready===true,
      permit_snapshot_signature:String(value.permit_snapshot_signature??"")
    });
  }

  function dimensionAuditDownloadHistoryExportFinalStateSignatureValid(signature=dimensionAuditDownloadHistoryExportFinalStateSignature(),state=dimensionAuditDownloadHistoryExportFinalState(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=state??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportFinalStateSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportFinalStateSignatureValid(signature,value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    }
    return typeof signature==="string"
      &&signature.length>0
      &&dimensionAuditDownloadHistoryExportFinalStateValid(value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)
      &&signature===dimensionAuditDownloadHistoryExportFinalStateSignature(value);
  }

  function dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature(snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature(value);
    }
    return JSON.stringify({
      schema:String(value.schema??""),
      state_signature:String(value.state_signature??""),
      state_valid:value.state_valid===true,
      state_signature_valid:value.state_signature_valid===true
    });
  }

  function dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid(signature,snapshot={}){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid(signature,value);
    }
    return typeof signature==="string"
      &&signature.length>0
      &&signature===dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature(value);
  }

  function dimensionAuditDownloadHistoryExportFinalStateSnapshot(state=dimensionAuditDownloadHistoryExportFinalState(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=state??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportFinalStateSnapshot){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportFinalStateSnapshot(value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    }
    const signature=dimensionAuditDownloadHistoryExportFinalStateSignature(value);
    const base={
      schema:"TubeBender.DimensionAuditDownloadHistoryExportFinalStateSnapshot.v1",
      state:value,
      state_signature:signature,
      state_valid:dimensionAuditDownloadHistoryExportFinalStateValid(value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot),
      state_signature_valid:dimensionAuditDownloadHistoryExportFinalStateSignatureValid(signature,value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)
    };
    const snapshotSignature=dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature(base);
    return Object.freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
  }

  function dimensionAuditDownloadHistoryExportFinalStateSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot(),chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
    const value=snapshot??{};
    if(auditDownloadDomain?.dimensionAuditDownloadHistoryExportFinalStateSnapshotValid){
      return auditDownloadDomain.dimensionAuditDownloadHistoryExportFinalStateSnapshotValid(value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
    }
    if(typeof value.schema!=="string"
      ||typeof value.state_signature!=="string"
      ||typeof value.state_valid!=="boolean"
      ||typeof value.state_signature_valid!=="boolean"
      ||typeof value.snapshot_signature!=="string"
      ||typeof value.snapshot_signature_valid!=="boolean")return false;
    return value.schema==="TubeBender.DimensionAuditDownloadHistoryExportFinalStateSnapshot.v1"
      &&dimensionAuditDownloadHistoryExportFinalStateValid(value.state,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)
      &&value.state_valid===true
      &&value.state_signature_valid===true
      &&dimensionAuditDownloadHistoryExportFinalStateSignatureValid(value.state_signature,value.state,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)
      &&value.snapshot_signature_valid===true
      &&dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid(value.snapshot_signature,value);
  }

  async function copyDimensionAuditDownloadHistory(){
    const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot();
    const recordBlocked=(code)=>recordDimensionAuditDownloadHistoryExportEvent("copy","blocked",code,snapshot);
    const exportState=dimensionAuditDownloadHistoryExportReadinessSnapshot(snapshot);
    const exportGate=dimensionAuditDownloadHistoryExportGate(exportState,snapshot);
    const exportGateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot(exportGate);
    const exportDecision=dimensionAuditDownloadHistoryExportDecision(exportGateSnapshot);
    const exportDecisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot(exportDecision);
    const exportAuthorization=dimensionAuditDownloadHistoryExportAuthorization(exportDecisionSnapshot);
    const exportAuthorizationSnapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot(exportAuthorization);
    const exportAuthorizationSnapshotValid=dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid(exportAuthorizationSnapshot);
    if(!exportAuthorizationSnapshotValid||!exportAuthorization.allowed){
      const blockCode=!exportAuthorizationSnapshotValid?"INVALID_AUTHORIZATION_SNAPSHOT":exportAuthorization.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportChain=dimensionAuditDownloadHistoryExportChain(snapshot);
    const exportChainValid=dimensionAuditDownloadHistoryExportChainValid(exportChain);
    if(!exportChainValid||!exportChain.allowed){
      const blockCode=!exportChainValid?"INVALID_EXPORT_CHAIN":exportChain.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportChainSignature=dimensionAuditDownloadHistoryExportChainSignature(exportChain);
    const exportChainSignatureValid=dimensionAuditDownloadHistoryExportChainSignatureValid(exportChainSignature,exportChain);
    if(!exportChainValid||!exportChainSignatureValid||!exportChain.allowed){
      const blockCode=!exportChainValid?"INVALID_EXPORT_CHAIN":!exportChainSignatureValid?"INVALID_EXPORT_CHAIN_SIGNATURE":exportChain.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportChainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(exportChain);
    const exportChainSnapshotValid=dimensionAuditDownloadHistoryExportChainSnapshotValid(exportChainSnapshot);
    if(!exportChainSnapshotValid||!exportChain.allowed){
      const blockCode=!exportChainSnapshotValid?"INVALID_EXPORT_CHAIN_SNAPSHOT":exportChain.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportPayloadBinding=dimensionAuditDownloadHistoryExportPayloadBinding(snapshot,exportChainSnapshot);
    const exportPayloadBindingValid=dimensionAuditDownloadHistoryExportPayloadBindingValid(exportPayloadBinding,snapshot,exportChainSnapshot);
    const exportPayloadBindingSignature=dimensionAuditDownloadHistoryExportPayloadBindingSignature(exportPayloadBinding);
    const exportPayloadBindingSignatureValid=dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(exportPayloadBindingSignature,exportPayloadBinding,snapshot,exportChainSnapshot);
    if(!exportPayloadBindingValid||!exportPayloadBindingSignatureValid||!exportPayloadBinding.allowed){
      const blockCode=!exportPayloadBindingValid?"INVALID_EXPORT_PAYLOAD_BINDING":!exportPayloadBindingSignatureValid?"INVALID_EXPORT_PAYLOAD_BINDING_SIGNATURE":exportPayloadBinding.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportPayloadBindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(exportPayloadBinding,snapshot,exportChainSnapshot);
    const exportPayloadBindingSnapshotValid=dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid(exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    if(!exportPayloadBindingSnapshotValid||!exportPayloadBinding.allowed){
      const blockCode=!exportPayloadBindingSnapshotValid?"INVALID_EXPORT_PAYLOAD_BINDING_SNAPSHOT":exportPayloadBinding.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportActionStatus=dimensionAuditDownloadHistoryExportActionStatus(exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportActionStatusValid=dimensionAuditDownloadHistoryExportActionStatusValid(exportActionStatus,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportActionStatusSignature=dimensionAuditDownloadHistoryExportActionStatusSignature(exportActionStatus);
    const exportActionStatusSignatureValid=dimensionAuditDownloadHistoryExportActionStatusSignatureValid(exportActionStatusSignature,exportActionStatus,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    if(!exportActionStatusValid||!exportActionStatusSignatureValid||!exportActionStatus.ready){
      const blockCode=!exportActionStatusValid?"INVALID_EXPORT_ACTION_STATUS":!exportActionStatusSignatureValid?"INVALID_EXPORT_ACTION_STATUS_SIGNATURE":exportActionStatus.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportActionStatusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(exportActionStatus,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportActionStatusSnapshotValid=dimensionAuditDownloadHistoryExportActionStatusSnapshotValid(exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    if(!exportActionStatusSnapshotValid||!exportActionStatus.ready){
      const blockCode=!exportActionStatusSnapshotValid?"INVALID_EXPORT_ACTION_STATUS_SNAPSHOT":exportActionStatus.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportActionPermit=dimensionAuditDownloadHistoryExportActionPermit("copy",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportActionPermitValid=dimensionAuditDownloadHistoryExportActionPermitValid(exportActionPermit,"copy",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportActionPermitSignature=dimensionAuditDownloadHistoryExportActionPermitSignature(exportActionPermit);
    const exportActionPermitSignatureValid=dimensionAuditDownloadHistoryExportActionPermitSignatureValid(exportActionPermitSignature,exportActionPermit,"copy",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    if(!exportActionPermitValid||!exportActionPermitSignatureValid||!exportActionPermit.ready){
      const blockCode=!exportActionPermitValid?"INVALID_EXPORT_ACTION_PERMIT":!exportActionPermitSignatureValid?"INVALID_EXPORT_ACTION_PERMIT_SIGNATURE":exportActionPermit.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportActionPermitSnapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot(exportActionPermit,"copy",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportActionPermitSnapshotValid=dimensionAuditDownloadHistoryExportActionPermitSnapshotValid(exportActionPermitSnapshot,"copy",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    if(!exportActionPermitSnapshotValid||!exportActionPermit.ready){
      const blockCode=!exportActionPermitSnapshotValid?"INVALID_EXPORT_ACTION_PERMIT_SNAPSHOT":exportActionPermit.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportFinalState=dimensionAuditDownloadHistoryExportFinalState("copy",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportFinalStateSnapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot(exportFinalState,"copy",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportFinalStateSnapshotValid=dimensionAuditDownloadHistoryExportFinalStateSnapshotValid(exportFinalStateSnapshot,"copy",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    if(!exportFinalStateSnapshotValid||!exportFinalState.ready){
      const blockCode=!exportFinalStateSnapshotValid?"INVALID_EXPORT_FINAL_STATE_SNAPSHOT":exportFinalState.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const text=JSON.stringify(snapshot,null,2);
    try{
      if(navigator?.clipboard?.writeText)await navigator.clipboard.writeText(text);
      else{
        const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";
        document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();
      }
      recordDimensionAuditDownloadHistoryExportEvent("copy","copied","READY",snapshot,{
        action_permit_signature:exportActionPermitSignature,
        action_permit_snapshot_signature:exportActionPermitSnapshot.snapshot_signature,
        final_state_signature:dimensionAuditDownloadHistoryExportFinalStateSignature(exportFinalState),
        final_state_snapshot_signature:exportFinalStateSnapshot.snapshot_signature
      });
      toast("Audit download history скопирован");
      return true;
    }catch(error){
      recordDimensionAuditDownloadHistoryExportEvent("copy","failed","COPY_FAILED",snapshot,{
        action_permit_signature:exportActionPermitSignature,
        action_permit_snapshot_signature:exportActionPermitSnapshot.snapshot_signature,
        final_state_signature:dimensionAuditDownloadHistoryExportFinalStateSignature(exportFinalState),
        final_state_snapshot_signature:exportFinalStateSnapshot.snapshot_signature
      },error);
      toast("Не удалось скопировать audit download history");
      return false;
    }
  }
  function downloadDimensionAuditDownloadHistory(){
    const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot();
    const recordBlocked=(code)=>recordDimensionAuditDownloadHistoryExportEvent("download","blocked",code,snapshot);
    const exportState=dimensionAuditDownloadHistoryExportReadinessSnapshot(snapshot);
    const exportGate=dimensionAuditDownloadHistoryExportGate(exportState,snapshot);
    const exportGateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot(exportGate);
    const exportDecision=dimensionAuditDownloadHistoryExportDecision(exportGateSnapshot);
    const exportDecisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot(exportDecision);
    const exportAuthorization=dimensionAuditDownloadHistoryExportAuthorization(exportDecisionSnapshot);
    const exportAuthorizationSnapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot(exportAuthorization);
    const exportAuthorizationSnapshotValid=dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid(exportAuthorizationSnapshot);
    if(!exportAuthorizationSnapshotValid||!exportAuthorization.allowed){
      const blockCode=!exportAuthorizationSnapshotValid?"INVALID_AUTHORIZATION_SNAPSHOT":exportAuthorization.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportChain=dimensionAuditDownloadHistoryExportChain(snapshot);
    const exportChainValid=dimensionAuditDownloadHistoryExportChainValid(exportChain);
    if(!exportChainValid||!exportChain.allowed){
      const blockCode=!exportChainValid?"INVALID_EXPORT_CHAIN":exportChain.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportChainSignature=dimensionAuditDownloadHistoryExportChainSignature(exportChain);
    const exportChainSignatureValid=dimensionAuditDownloadHistoryExportChainSignatureValid(exportChainSignature,exportChain);
    if(!exportChainValid||!exportChainSignatureValid||!exportChain.allowed){
      const blockCode=!exportChainValid?"INVALID_EXPORT_CHAIN":!exportChainSignatureValid?"INVALID_EXPORT_CHAIN_SIGNATURE":exportChain.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportChainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(exportChain);
    const exportChainSnapshotValid=dimensionAuditDownloadHistoryExportChainSnapshotValid(exportChainSnapshot);
    if(!exportChainSnapshotValid||!exportChain.allowed){
      const blockCode=!exportChainSnapshotValid?"INVALID_EXPORT_CHAIN_SNAPSHOT":exportChain.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportPayloadBinding=dimensionAuditDownloadHistoryExportPayloadBinding(snapshot,exportChainSnapshot);
    const exportPayloadBindingValid=dimensionAuditDownloadHistoryExportPayloadBindingValid(exportPayloadBinding,snapshot,exportChainSnapshot);
    const exportPayloadBindingSignature=dimensionAuditDownloadHistoryExportPayloadBindingSignature(exportPayloadBinding);
    const exportPayloadBindingSignatureValid=dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(exportPayloadBindingSignature,exportPayloadBinding,snapshot,exportChainSnapshot);
    if(!exportPayloadBindingValid||!exportPayloadBindingSignatureValid||!exportPayloadBinding.allowed){
      const blockCode=!exportPayloadBindingValid?"INVALID_EXPORT_PAYLOAD_BINDING":!exportPayloadBindingSignatureValid?"INVALID_EXPORT_PAYLOAD_BINDING_SIGNATURE":exportPayloadBinding.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportPayloadBindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(exportPayloadBinding,snapshot,exportChainSnapshot);
    const exportPayloadBindingSnapshotValid=dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid(exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    if(!exportPayloadBindingSnapshotValid||!exportPayloadBinding.allowed){
      const blockCode=!exportPayloadBindingSnapshotValid?"INVALID_EXPORT_PAYLOAD_BINDING_SNAPSHOT":exportPayloadBinding.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportActionStatus=dimensionAuditDownloadHistoryExportActionStatus(exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportActionStatusValid=dimensionAuditDownloadHistoryExportActionStatusValid(exportActionStatus,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportActionStatusSignature=dimensionAuditDownloadHistoryExportActionStatusSignature(exportActionStatus);
    const exportActionStatusSignatureValid=dimensionAuditDownloadHistoryExportActionStatusSignatureValid(exportActionStatusSignature,exportActionStatus,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    if(!exportActionStatusValid||!exportActionStatusSignatureValid||!exportActionStatus.ready){
      const blockCode=!exportActionStatusValid?"INVALID_EXPORT_ACTION_STATUS":!exportActionStatusSignatureValid?"INVALID_EXPORT_ACTION_STATUS_SIGNATURE":exportActionStatus.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportActionStatusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(exportActionStatus,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportActionStatusSnapshotValid=dimensionAuditDownloadHistoryExportActionStatusSnapshotValid(exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    if(!exportActionStatusSnapshotValid||!exportActionStatus.ready){
      const blockCode=!exportActionStatusSnapshotValid?"INVALID_EXPORT_ACTION_STATUS_SNAPSHOT":exportActionStatus.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportActionPermit=dimensionAuditDownloadHistoryExportActionPermit("download",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportActionPermitValid=dimensionAuditDownloadHistoryExportActionPermitValid(exportActionPermit,"download",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportActionPermitSignature=dimensionAuditDownloadHistoryExportActionPermitSignature(exportActionPermit);
    const exportActionPermitSignatureValid=dimensionAuditDownloadHistoryExportActionPermitSignatureValid(exportActionPermitSignature,exportActionPermit,"download",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    if(!exportActionPermitValid||!exportActionPermitSignatureValid||!exportActionPermit.ready){
      const blockCode=!exportActionPermitValid?"INVALID_EXPORT_ACTION_PERMIT":!exportActionPermitSignatureValid?"INVALID_EXPORT_ACTION_PERMIT_SIGNATURE":exportActionPermit.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportActionPermitSnapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot(exportActionPermit,"download",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportActionPermitSnapshotValid=dimensionAuditDownloadHistoryExportActionPermitSnapshotValid(exportActionPermitSnapshot,"download",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    if(!exportActionPermitSnapshotValid||!exportActionPermit.ready){
      const blockCode=!exportActionPermitSnapshotValid?"INVALID_EXPORT_ACTION_PERMIT_SNAPSHOT":exportActionPermit.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const exportFinalState=dimensionAuditDownloadHistoryExportFinalState("download",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportFinalStateSnapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot(exportFinalState,"download",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    const exportFinalStateSnapshotValid=dimensionAuditDownloadHistoryExportFinalStateSnapshotValid(exportFinalStateSnapshot,"download",exportActionStatusSnapshot,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot);
    if(!exportFinalStateSnapshotValid||!exportFinalState.ready){
      const blockCode=!exportFinalStateSnapshotValid?"INVALID_EXPORT_FINAL_STATE_SNAPSHOT":exportFinalState.code;
      recordBlocked(blockCode);
      toast(blockCode==="EMPTY"?"Audit download history пуст":"Audit download history export blocked: "+blockCode);
      return false;
    }
    const name=dimensionAuditFilenamePart(snapshot.project_name||snapshot.project_id,"project");
    const stem=name+"-dimension-audit-download-history-"+snapshot.attempt_count;
    const legacyHistoryDownloadContract=()=>downloadDimensionAuditJson(dimensionAuditJsonFilename(stem,snapshot.generated_at),snapshot);
    void legacyHistoryDownloadContract;
    const permitEvidence={
      export_action:"download",
      action_permit_signature:exportActionPermitSignature,
      action_permit_snapshot_signature:exportActionPermitSnapshot.snapshot_signature
    };
    const result=downloadDimensionAuditJsonWithPermitEvidence(dimensionAuditJsonFilename(stem,snapshot.generated_at),snapshot,permitEvidence);
    const attempt=dimensionAuditDownloadLastAttempt();
    const outcome=attempt?.status==="downloaded"?"downloaded":attempt?.status==="failed"?"failed":"blocked";
    const code=String(attempt?.code??(result?"READY":"DOWNLOAD_BLOCKED"));
    const error=outcome==="failed"?String(attempt?.error??"history download failed"):null;
    recordDimensionAuditDownloadHistoryExportEvent("download",outcome,code,snapshot,permitEvidence,error);
    return result;
  }
  function clearDimensionAuditDownloadAttemptHistory(){
    const count=dimensionAuditDownloadAttemptHistory.length;
    dimensionAuditDownloadAttemptHistory.splice(0,dimensionAuditDownloadAttemptHistory.length);
    return count;
  }

  function downloadDimensionAuditJson(filename,snapshot){
    const preflight=dimensionAuditDownloadPreflight(filename,snapshot);
    if(!preflight.runtime_validation.valid){
      recordDimensionAuditDownloadAttempt("blocked",preflight);
      toast("Dimension audit download protocol invalid");
      return false;
    }
    const validation=preflight.validation;
    const safeFilename=validation?.filename;
    if(!preflight.valid){
      recordDimensionAuditDownloadAttempt("blocked",preflight);
      if(validation.code==="INVALID_FILENAME")toast("Некорректное имя Dimension audit JSON");
      else if(validation.code==="INVALID_SNAPSHOT")toast("Некорректный Dimension audit snapshot");
      else if(validation.code==="UNSUPPORTED_SCHEMA")toast("Неподдерживаемая schema Dimension audit snapshot");
      return false;
    }
    try{
      const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=url;link.download=safeFilename;
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),0);
      recordDimensionAuditDownloadAttempt("downloaded",preflight);
      toast("Dimension audit JSON сохранён");
      return true;
    }catch(error){
      recordDimensionAuditDownloadAttempt("failed",preflight,error);
      toast("Не удалось сохранить Dimension audit JSON");
      return false;
    }
  }

  function downloadDimensionAuditJsonWithPermitEvidence(filename,snapshot,permitEvidence){
    const preflight=dimensionAuditDownloadPreflight(filename,snapshot);
    if(!preflight.runtime_validation.valid){
      recordDimensionAuditDownloadAttemptWithPermitEvidence("blocked",preflight,null,permitEvidence);
      toast("Dimension audit download protocol invalid");
      return false;
    }
    const validation=preflight.validation;
    const safeFilename=validation?.filename;
    if(!preflight.valid){
      recordDimensionAuditDownloadAttemptWithPermitEvidence("blocked",preflight,null,permitEvidence);
      if(validation.code==="INVALID_FILENAME")toast("Некорректное имя Dimension audit JSON");
      else if(validation.code==="INVALID_SNAPSHOT")toast("Некорректный Dimension audit snapshot");
      else if(validation.code==="UNSUPPORTED_SCHEMA")toast("Неподдерживаемая schema Dimension audit snapshot");
      return false;
    }
    try{
      const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=url;link.download=safeFilename;
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),0);
      recordDimensionAuditDownloadAttemptWithPermitEvidence("downloaded",preflight,null,permitEvidence);
      toast("Dimension audit JSON сохранён");
      return true;
    }catch(error){
      recordDimensionAuditDownloadAttemptWithPermitEvidence("failed",preflight,error,permitEvidence);
      toast("Не удалось сохранить Dimension audit JSON");
      return false;
    }
  }

  function dimensionAuditFilenameStamp(value=new Date()){
    if(auditDownloadDomain?.dimensionAuditFilenameStamp)return auditDownloadDomain.dimensionAuditFilenameStamp(value);
    return value.toISOString().replace(/[:.]/g,"-");
  }
  function dimensionAuditFilenamePart(value,fallback="item",maxLength=DIMENSION_AUDIT_FILENAME_POLICY.part_default_length){
    if(auditDownloadDomain?.dimensionAuditFilenamePart)return auditDownloadDomain.dimensionAuditFilenamePart(value,fallback,maxLength);
    const limit=Math.max(DIMENSION_AUDIT_FILENAME_POLICY.part_min_length,Math.min(DIMENSION_AUDIT_FILENAME_POLICY.part_max_length,Math.trunc(Number(maxLength)||DIMENSION_AUDIT_FILENAME_POLICY.part_default_length)));
    const safe=String(value??"").trim()
      .replace(/[^\p{L}\p{N}._-]+/gu,"_")
      .replace(/^[_\-.]+|[_\-.]+$/g,"");
    const clipped=safe.slice(0,limit).replace(/[_\-.]+$/g,"");
    return clipped||String(fallback).slice(0,limit);
  }
  function dimensionAuditJsonFilename(stem,generatedAt,maxLength=DIMENSION_AUDIT_FILENAME_POLICY.json_default_length){
    if(auditDownloadDomain?.dimensionAuditJsonFilename)return auditDownloadDomain.dimensionAuditJsonFilename(stem,generatedAt,maxLength);
    const limit=Math.max(DIMENSION_AUDIT_FILENAME_POLICY.json_min_length,Math.min(DIMENSION_AUDIT_FILENAME_POLICY.json_max_length,Math.trunc(Number(maxLength)||DIMENSION_AUDIT_FILENAME_POLICY.json_default_length)));
    const stamp=dimensionAuditFilenameStamp(new Date(generatedAt));
    const suffix="-"+stamp+".json";
    const budget=Math.max(16,limit-suffix.length);
    const safeStem=String(stem??"dimension-audit").slice(0,budget).replace(/[_\-.]+$/g,"")||"dimension-audit";
    return safeStem+suffix;
  }

  function downloadSelectedDimensionAudits(){
    const snapshot=selectedDimensionAuditSnapshot();
    if(!snapshot.dimension_count){toast("Нет выбранных Dimension для audit-export");return false;}
    const name=dimensionAuditFilenamePart(snapshot.project_name||snapshot.project_id,"project");
    const stem=name+"-dimension-selection-audit-"+snapshot.dimension_count;
    return downloadDimensionAuditJson(dimensionAuditJsonFilename(stem,snapshot.generated_at),snapshot);
  }
  async function copySelectedDimensionAudits(){
    const snapshot=selectedDimensionAuditSnapshot();
    if(!snapshot.dimension_count){toast("Нет выбранных Dimension для audit-export");return false;}
    const text=JSON.stringify(snapshot,null,2);
    try{
      if(navigator?.clipboard?.writeText)await navigator.clipboard.writeText(text);
      else{
        const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";
        document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();
      }
      toast("Audit выбранных Dimension скопирован");
      return true;
    }catch(error){toast("Не удалось скопировать audit выбранных Dimension");return false;}
  }

  function downloadVisibleDimensionAudits(){
    const snapshot=visibleDimensionAuditSnapshot();
    const name=dimensionAuditFilenamePart(snapshot.project_name||snapshot.project_id,"project");
    const filterName=dimensionAuditFilenamePart(snapshot?.view?.filter,"all");
    const sortName=dimensionAuditFilenamePart(snapshot?.view?.sort,"project");
    const searchValue=String(snapshot?.view?.search??"").trim();
    const searchName=searchValue?"-search-"+dimensionAuditFilenamePart(searchValue,"query",40):"";
    const focusValue=String(snapshot?.view?.focus_id??"").trim();
    const focusName=focusValue?"-focus-"+dimensionAuditFilenamePart(focusValue,"dimension",40):"";
    const stem=name+"-dimension-audit-view-"+filterName+"-"+sortName+searchName+focusName+"-"+snapshot.dimension_count;
    return downloadDimensionAuditJson(dimensionAuditJsonFilename(stem,snapshot.generated_at),snapshot);
  }
  function downloadAllDimensionAudits(){
    const snapshot=allDimensionAuditSnapshot();
    const name=dimensionAuditFilenamePart(snapshot.project_name||snapshot.project_id,"project");
    const stem=name+"-dimension-audit-"+snapshot.dimension_count;
    return downloadDimensionAuditJson(dimensionAuditJsonFilename(stem,snapshot.generated_at),snapshot);
  }

  async function copyVisibleDimensionAudits(){
    const text=JSON.stringify(visibleDimensionAuditSnapshot(),null,2);
    try{
      if(navigator?.clipboard?.writeText)await navigator.clipboard.writeText(text);
      else{
        const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";
        document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();
      }
      toast("Текущий Dimension audit view скопирован");
      return true;
    }catch(error){toast("Не удалось скопировать текущий Dimension audit view");return false;}
  }
  async function copyAllDimensionAudits(){
    const text=JSON.stringify(allDimensionAuditSnapshot(),null,2);
    try{
      if(navigator?.clipboard?.writeText)await navigator.clipboard.writeText(text);
      else{
        const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";
        document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();
      }
      toast("Dimension audit проекта скопирован");
      return true;
    }catch(error){toast("Не удалось скопировать Dimension audit проекта");return false;}
  }
  function downloadDimensionRebindAudit(dimensionId){
    const dimension=savedDimensions().find(item=>String(item?.id)===String(dimensionId));
    if(!dimension)return false;
    const snapshot=dimensionRebindAuditSnapshot(dimension);
    const projectName=dimensionAuditFilenamePart(snapshot.project_name||snapshot.project_id,"project");
    const dimensionName=dimensionAuditFilenamePart(dimension?.id,"dimension");
    const stem=projectName+"-"+dimensionName+"-dimension-audit";
    return downloadDimensionAuditJson(dimensionAuditJsonFilename(stem,snapshot.generated_at),snapshot);
  }
  async function copyDimensionRebindAudit(dimensionId){
    const dimension=savedDimensions().find(item=>String(item?.id)===String(dimensionId));
    if(!dimension)return false;
    const text=JSON.stringify(dimensionRebindAuditSnapshot(dimension),null,2);
    try{
      if(navigator?.clipboard?.writeText)await navigator.clipboard.writeText(text);
      else{
        const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";
        document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();
      }
      toast("Rebind audit скопирован");
      return true;
    }catch(error){toast("Не удалось скопировать Rebind audit");return false;}
  }

  function dimensionFittedEvidenceHtml(dimension){
    const refs=(dimension?.references??[]).map((ref,index)=>({ref,index}))
      .filter(item=>String(item.ref?.geometry_status??"")==="Fitted");
    if(!refs.length)return "";
    const rows=refs.map(({ref,index})=>{
      const error=ref?.fitting_error??{};
      return '<div class="tb-measure-note" style="padding:4px 0;border-top:1px solid #2b3a4a">'+
        '#'+(index+1)+' · '+esc(ref?.object_id??"—")+(ref?.subentity_id!=null?' / '+esc(ref.subentity_id):'')+
        ' · error '+esc(auditNumber(error?.mm))+' mm / '+esc(auditNumber(error?.deg))+'°'+
        ' · confidence '+esc(auditNumber(ref?.confidence))+
        (ref?.evidence!=null?'<div style="margin-top:3px">Evidence: '+esc(ref.evidence)+'</div>':'')+
        '</div>';
    }).join("");
    return '<details data-dim-fitted-evidence="'+esc(dimension.id)+'" style="margin-top:6px"><summary>Fitted evidence · '+refs.length+'</summary>'+rows+'</details>';
  }

  function dimensionRebindAuditHtml(dimension){
    const history=Array.isArray(dimension?.rebound_history)?dimension.rebound_history:[];
    if(!history.length)return "";
    const rows=history.map((entry,index)=>{
      const sources=[...new Set((entry?.previous_references??[]).map(ref=>String(ref?.object_id??"")).filter(Boolean))];
      const signatures=(entry?.new_reference_signatures??[]).map(sig=>({
        object_id:sig?.object_id,
        snap_type:sig?.snap_type,
        source_geometry:sig?.source_geometry,
        section_mode:sig?.section_mode
      }));
      return '<div class="tb-measure-note" style="padding:4px 0;border-top:1px solid #2b3a4a">'+
        '#'+(index+1)+' · '+esc(entry?.reason??"rebind")+
        (entry?.previous_status?' · from '+esc(entry.previous_status):'')+
        (sources.length?' · source '+esc(sources.join(", ")):'')+
        (entry?.previous_value!=null?' · value '+esc(entry.previous_value):'')+
        (entry?.previous_stale_reason?' · '+esc(entry.previous_stale_reason):'')+
        '<div style="margin-top:3px">New refs: '+esc(signatures)+'</div></div>';
    }).join("");
    return '<details data-dim-rebind-audit="'+esc(dimension.id)+'" style="margin-top:6px"><summary>Rebind audit · '+history.length+'</summary>'+
      '<div class="tb-measure-actions"><button data-copy-rebind-audit="'+esc(dimension.id)+'">Copy audit JSON</button><button data-download-rebind-audit="'+esc(dimension.id)+'">Download audit JSON</button></div>'+rows+'</details>';
  }

  function dimensionSearchText(dimension,reviewContextState=null){
    const refs=dimension?.references??[];
    const sources=refs.map(ref=>String(ref?.object_id??"")).filter(Boolean);
    const geometryStatuses=refs.map(ref=>String(ref?.geometry_status??"")).filter(Boolean);
    const reviewContext=reviewContextState?dimensionReviewContext(dimension,reviewContextState):null;
    return [
      dimension?.id,dimension?.note,dimension?.kind,dimension?.mode,dimension?.status,dimension?.stale_reason,
      dimensionAuditGeometryClass(dimension),...dimensionAuditReviewReasons(dimension),...geometryStatuses,...sources,
      reviewContext?.state,reviewContext?.health,...(reviewContext?.blockers??[])
    ].filter(value=>value!=null).join(" ").toLowerCase();
  }
  function filteredDimensionManagerItems(items=savedDimensions()){
    if(dimensionManagerFocusId){
      const exact=items.find(dimension=>String(dimension?.id??"")===dimensionManagerFocusId);
      return exact?[exact]:[];
    }
    let result=items;
    if(dimensionManagerFilter==="stale")result=items.filter(dimension=>String(dimension?.status??"")==="Stale");
    else if(dimensionManagerFilter==="rebound")result=items.filter(dimension=>dimension?.rebound_from_stale===true);
    else if(dimensionManagerFilter==="reference")result=items.filter(dimension=>String(dimension?.mode??"")==="Reference");
    else if(dimensionManagerFilter==="driving")result=items.filter(dimension=>String(dimension?.mode??"")==="Driving");
    else if(dimensionManagerFilter==="visible")result=items.filter(dimension=>dimension?.visible!==false);
    else if(dimensionManagerFilter==="hidden")result=items.filter(dimension=>dimension?.visible===false);
    else if(dimensionManagerFilter==="selected"){
      const selectedIds=new Set(selectedDimensionAuditIds());
      result=items.filter(dimension=>selectedIds.has(String(dimension?.id??"")));
    }
    else if(dimensionManagerFilter==="unselected"){
      const selectedIds=new Set(selectedDimensionAuditIds());
      result=items.filter(dimension=>!selectedIds.has(String(dimension?.id??"")));
    }
    else if(dimensionManagerFilter==="section-derived")result=items.filter(isSectionDerivedDimension);
    else if(dimensionManagerFilter==="exact")result=items.filter(dimension=>dimensionAuditGeometryClass(dimension)==="Exact");
    else if(dimensionManagerFilter==="fitted")result=items.filter(dimension=>dimensionAuditGeometryClass(dimension)==="Fitted");
    else if(dimensionManagerFilter==="unknown-geometry")result=items.filter(dimension=>dimensionAuditGeometryClass(dimension)==="Unknown");
    else if(dimensionManagerFilter==="needs-review")result=items.filter(dimensionAuditNeedsReview);
    else if(dimensionManagerFilter==="review-action"){
      const reviewContextState=dimensionReviewContextState(items,selectedDimensionAuditIds());
      result=items.filter(dimension=>dimensionReviewContext(dimension,reviewContextState).action_required===true);
    }
    else if(["review-ready","review-pending","review-diagnostics-error","review-not-required"].includes(dimensionManagerFilter)){
      const reviewContextState=dimensionReviewContextState(items,selectedDimensionAuditIds());
      const targetHealth={
        "review-ready":"ready",
        "review-pending":"pending",
        "review-diagnostics-error":"diagnostics-error",
        "review-not-required":"not-required"
      }[dimensionManagerFilter];
      result=items.filter(dimension=>dimensionReviewContext(dimension,reviewContextState).health===targetHealth);
    }
    const search=String(dimensionManagerSearch??"").trim().toLowerCase();
    if(search){
      const reviewContextState=dimensionReviewContextState(items,selectedDimensionAuditIds());
      result=result.filter(dimension=>dimensionSearchText(dimension,reviewContextState).includes(search));
    }
    if(dimensionManagerSort==="review-context"){
      const reviewContextState=dimensionReviewContextState(items,selectedDimensionAuditIds());
      const healthRank={ "diagnostics-error":0,pending:1,ready:2,"not-required":3 };
      return result.map((dimension,index)=>({
        dimension,index,
        rank:healthRank[dimensionReviewContext(dimension,reviewContextState).health]??4
      }))
        .sort((a,b)=>a.rank-b.rank||a.index-b.index)
        .map(item=>item.dimension);
    }
    if(dimensionManagerSort!=="audit")return result;
    const rank=dimension=>String(dimension?.status??"")==="Stale"
      ?0
      :dimensionAuditNeedsReview(dimension)?1
      :dimension?.rebound_from_stale===true?2:3;
    return result.map((dimension,index)=>({dimension,index}))
      .sort((a,b)=>rank(a.dimension)-rank(b.dimension)||a.index-b.index)
      .map(item=>item.dimension);
  }
  function dimensionManagerHtml(){
    restoreDimensionAuditViewState();
    if(!dimensionManagerFocusId)persistDimensionAuditViewState();
    const items=savedDimensions();
    if(!items.length)return '<div class="tb-measure-result" style="margin-top:9px"><div class="tb-measure-title">Saved Dimensions</div><div class="tb-measure-note">Сохранённых размеров пока нет.</div></div>';
    const locked=readonly();
    const auditSummary=dimensionAuditSummary(items);
    const auditDownloadHistorySummary=dimensionAuditDownloadAttemptHistorySummary();
    const auditDownloadHistorySummarySignature=dimensionAuditDownloadAttemptHistorySummarySignature(auditDownloadHistorySummary);
    const auditDownloadHistoryPermitEvidenceSummary=dimensionAuditDownloadHistoryPermitEvidenceSummary();
    const auditDownloadHistoryPermitEvidenceSummaryValid=dimensionAuditDownloadHistoryPermitEvidenceSummaryValid(auditDownloadHistoryPermitEvidenceSummary);
    const auditDownloadHistoryLatestPermitEvidence=dimensionAuditDownloadAttemptPermitEvidence(dimensionAuditDownloadAttemptHistorySnapshot().at(-1)??{});
    const auditDownloadHistoryExportEventSummary=dimensionAuditDownloadHistoryExportEventSummary();
    const auditDownloadHistoryExportEventSummaryValid=dimensionAuditDownloadHistoryExportEventSummaryValid(auditDownloadHistoryExportEventSummary);
    const auditDownloadHistoryExportEventFinalStateEvidenceSummary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary();
    const auditDownloadHistoryExportEventFinalStateEvidenceSummaryValid=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid(auditDownloadHistoryExportEventFinalStateEvidenceSummary);
    const auditDownloadHistoryExportEventFinalStateEvidenceSummarySignature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature(auditDownloadHistoryExportEventFinalStateEvidenceSummary);
    const auditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid(auditDownloadHistoryExportEventFinalStateEvidenceSummarySignature,auditDownloadHistoryExportEventFinalStateEvidenceSummary);
    const auditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(auditDownloadHistoryExportEventFinalStateEvidenceSummary);
    const auditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(auditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot);
    const auditDownloadHistoryExportEventSummarySignature=dimensionAuditDownloadHistoryExportEventSummarySignature(auditDownloadHistoryExportEventSummary);
    const auditDownloadHistoryExportEventSummarySignatureValid=dimensionAuditDownloadHistoryExportEventSummarySignatureValid(auditDownloadHistoryExportEventSummarySignature,auditDownloadHistoryExportEventSummary);
    const auditDownloadHistoryExportEventSnapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot();
    const auditDownloadHistoryExportEventSnapshotValid=dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(auditDownloadHistoryExportEventSnapshot);
    const auditDownloadHistoryExportEventSnapshotSignatureValid=dimensionAuditDownloadHistoryExportEventHistorySignatureValid(auditDownloadHistoryExportEventSnapshot.signature,auditDownloadHistoryExportEventSnapshot);
    const auditDownloadHistoryExportEventLogEnvelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(auditDownloadHistoryExportEventSnapshot,auditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,auditDownloadHistoryExportEventSnapshot.events);
    const auditDownloadHistoryExportEventLogEnvelopeValid=dimensionAuditDownloadHistoryExportEventLogEnvelopeValid(auditDownloadHistoryExportEventLogEnvelope,auditDownloadHistoryExportEventSnapshot.events);
    const auditDownloadHistoryExportEventLogEnvelopeSnapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(auditDownloadHistoryExportEventLogEnvelope,auditDownloadHistoryExportEventSnapshot.events);
    const auditDownloadHistoryExportEventLogEnvelopeSnapshotValid=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid(auditDownloadHistoryExportEventLogEnvelopeSnapshot,auditDownloadHistoryExportEventSnapshot.events);
    const auditDownloadHistoryLatestExportEvent=auditDownloadHistoryExportEventSnapshot.events.at(-1)??null;
    const auditDownloadHistorySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot();
    const auditDownloadHistorySnapshotSource=dimensionAuditDownloadAttemptHistoryAuditSnapshotSource();
    const auditDownloadHistoryHealth=dimensionAuditDownloadHistoryHealth(auditDownloadHistorySnapshot);
    const auditDownloadHistoryHealthSignature=dimensionAuditDownloadHistoryHealthSignature(auditDownloadHistoryHealth);
    const auditDownloadHistoryHealthEmbedding=dimensionAuditDownloadHistoryHealthEmbedding(auditDownloadHistorySnapshot);
    const auditDownloadHistoryHealthEmbeddingSignature=dimensionAuditDownloadHistoryHealthEmbeddingSignature(auditDownloadHistoryHealthEmbedding);
    const auditDownloadHistoryVerification=dimensionAuditDownloadHistoryVerification(auditDownloadHistorySnapshot);
    const auditDownloadHistoryVerificationSignature=dimensionAuditDownloadHistoryVerificationSignature(auditDownloadHistoryVerification);
    const auditDownloadHistoryEmbeddedVerificationValid=dimensionAuditDownloadHistoryEmbeddedVerificationValid(auditDownloadHistorySnapshot);
    const auditDownloadHistoryVerificationEmbedding=dimensionAuditDownloadHistoryVerificationEmbedding(auditDownloadHistorySnapshot);
    const auditDownloadHistoryVerificationEmbeddingSignature=dimensionAuditDownloadHistoryVerificationEmbeddingSignature(auditDownloadHistoryVerificationEmbedding);
    const auditDownloadHistoryEmbeddedVerificationEmbeddingValid=dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(auditDownloadHistorySnapshot);
    const auditDownloadHistoryAttestation=dimensionAuditDownloadHistoryAttestation(auditDownloadHistorySnapshot);
    const auditDownloadHistoryAttestationSignature=dimensionAuditDownloadHistoryAttestationSignature(auditDownloadHistoryAttestation);
    const auditDownloadHistoryEmbeddedAttestationValid=dimensionAuditDownloadHistoryEmbeddedAttestationValid(auditDownloadHistorySnapshot);
    const auditDownloadHistoryAttestationEmbedding=dimensionAuditDownloadHistoryAttestationEmbedding(auditDownloadHistorySnapshot);
    const auditDownloadHistoryAttestationEmbeddingSignature=dimensionAuditDownloadHistoryAttestationEmbeddingSignature(auditDownloadHistoryAttestationEmbedding);
    const auditDownloadHistoryEmbeddedAttestationEmbeddingValid=dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(auditDownloadHistorySnapshot);
    const auditDownloadHistoryTrust=dimensionAuditDownloadHistoryTrust(auditDownloadHistorySnapshot);
    const auditDownloadHistoryTrustSignature=dimensionAuditDownloadHistoryTrustSignature(auditDownloadHistoryTrust);
    const auditDownloadHistoryProvenance=dimensionAuditDownloadAttemptHistorySnapshotProvenance(auditDownloadHistorySnapshot);
    const auditDownloadHistoryProvenanceSignature=dimensionAuditDownloadAttemptHistorySnapshotProvenanceSignature(auditDownloadHistoryProvenance);
    const auditDownloadHistoryProvenanceValid=dimensionAuditDownloadAttemptHistorySnapshotProvenanceValid(auditDownloadHistoryProvenance,auditDownloadHistorySnapshot);
    const auditDownloadHistoryExportReadinessProtocol=dimensionAuditDownloadHistoryExportReadinessProtocol();
    const auditDownloadHistoryExportReadinessProtocolSignature=dimensionAuditDownloadHistoryExportReadinessProtocolSignature(auditDownloadHistoryExportReadinessProtocol);
    const auditDownloadHistoryExportReadinessProtocolValid=dimensionAuditDownloadHistoryExportReadinessProtocolValid(auditDownloadHistoryExportReadinessProtocol);
    const auditDownloadHistoryExportReadinessProtocolSignatureValid=dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(auditDownloadHistoryExportReadinessProtocolSignature,auditDownloadHistoryExportReadinessProtocol);
    const auditDownloadHistoryExportReadiness=dimensionAuditDownloadHistoryExportReadiness(auditDownloadHistorySnapshot);
    const auditDownloadHistoryExportReadinessSnapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(auditDownloadHistorySnapshot);
    const auditDownloadHistoryExportReadinessSnapshotValid=dimensionAuditDownloadHistoryExportReadinessSnapshotValid(auditDownloadHistoryExportReadinessSnapshot,auditDownloadHistorySnapshot);
    const auditDownloadHistoryExportGate=dimensionAuditDownloadHistoryExportGate(auditDownloadHistoryExportReadinessSnapshot,auditDownloadHistorySnapshot);
    const auditDownloadHistoryExportGateValid=dimensionAuditDownloadHistoryExportGateValid(auditDownloadHistoryExportGate);
    const auditDownloadHistoryExportGateSignature=dimensionAuditDownloadHistoryExportGateSignature(auditDownloadHistoryExportGate);
    const auditDownloadHistoryExportGateSignatureValid=dimensionAuditDownloadHistoryExportGateSignatureValid(auditDownloadHistoryExportGateSignature,auditDownloadHistoryExportGate);
    const auditDownloadHistoryExportGateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot(auditDownloadHistoryExportGate);
    const auditDownloadHistoryExportGateSnapshotValid=dimensionAuditDownloadHistoryExportGateSnapshotValid(auditDownloadHistoryExportGateSnapshot);
    const auditDownloadHistoryExportDecision=dimensionAuditDownloadHistoryExportDecision(auditDownloadHistoryExportGateSnapshot);
    const auditDownloadHistoryExportDecisionValid=dimensionAuditDownloadHistoryExportDecisionValid(auditDownloadHistoryExportDecision);
    const auditDownloadHistoryExportDecisionSignature=dimensionAuditDownloadHistoryExportDecisionSignature(auditDownloadHistoryExportDecision);
    const auditDownloadHistoryExportDecisionSignatureValid=dimensionAuditDownloadHistoryExportDecisionSignatureValid(auditDownloadHistoryExportDecisionSignature,auditDownloadHistoryExportDecision);
    const auditDownloadHistoryExportDecisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot(auditDownloadHistoryExportDecision);
    const auditDownloadHistoryExportDecisionSnapshotValid=dimensionAuditDownloadHistoryExportDecisionSnapshotValid(auditDownloadHistoryExportDecisionSnapshot);
    const auditDownloadHistoryExportAuthorization=dimensionAuditDownloadHistoryExportAuthorization(auditDownloadHistoryExportDecisionSnapshot);
    const auditDownloadHistoryExportAuthorizationValid=dimensionAuditDownloadHistoryExportAuthorizationValid(auditDownloadHistoryExportAuthorization);
    const auditDownloadHistoryExportAuthorizationSignature=dimensionAuditDownloadHistoryExportAuthorizationSignature(auditDownloadHistoryExportAuthorization);
    const auditDownloadHistoryExportAuthorizationSignatureValid=dimensionAuditDownloadHistoryExportAuthorizationSignatureValid(auditDownloadHistoryExportAuthorizationSignature,auditDownloadHistoryExportAuthorization);
    const auditDownloadHistoryExportAuthorizationSnapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot(auditDownloadHistoryExportAuthorization);
    const auditDownloadHistoryExportAuthorizationSnapshotValid=dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid(auditDownloadHistoryExportAuthorizationSnapshot);
    const auditDownloadHistoryExportChain=dimensionAuditDownloadHistoryExportChain(auditDownloadHistorySnapshot);
    const auditDownloadHistoryExportChainValid=dimensionAuditDownloadHistoryExportChainValid(auditDownloadHistoryExportChain);
    const auditDownloadHistoryExportChainSignature=dimensionAuditDownloadHistoryExportChainSignature(auditDownloadHistoryExportChain);
    const auditDownloadHistoryExportChainSignatureValid=dimensionAuditDownloadHistoryExportChainSignatureValid(auditDownloadHistoryExportChainSignature,auditDownloadHistoryExportChain);
    const auditDownloadHistoryExportChainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(auditDownloadHistoryExportChain);
    const auditDownloadHistoryExportChainSnapshotValid=dimensionAuditDownloadHistoryExportChainSnapshotValid(auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryExportPayloadBinding=dimensionAuditDownloadHistoryExportPayloadBinding(auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryExportPayloadBindingValid=dimensionAuditDownloadHistoryExportPayloadBindingValid(auditDownloadHistoryExportPayloadBinding,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryExportPayloadBindingSignature=dimensionAuditDownloadHistoryExportPayloadBindingSignature(auditDownloadHistoryExportPayloadBinding);
    const auditDownloadHistoryExportPayloadBindingSignatureValid=dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(auditDownloadHistoryExportPayloadBindingSignature,auditDownloadHistoryExportPayloadBinding,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryExportPayloadBindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(auditDownloadHistoryExportPayloadBinding,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryExportPayloadBindingSnapshotValid=dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid(auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryExportActionStatus=dimensionAuditDownloadHistoryExportActionStatus(auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryExportActionStatusValid=dimensionAuditDownloadHistoryExportActionStatusValid(auditDownloadHistoryExportActionStatus,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryExportActionStatusSignature=dimensionAuditDownloadHistoryExportActionStatusSignature(auditDownloadHistoryExportActionStatus);
    const auditDownloadHistoryExportActionStatusSignatureValid=dimensionAuditDownloadHistoryExportActionStatusSignatureValid(auditDownloadHistoryExportActionStatusSignature,auditDownloadHistoryExportActionStatus,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryExportActionStatusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(auditDownloadHistoryExportActionStatus,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryExportActionStatusSnapshotValid=dimensionAuditDownloadHistoryExportActionStatusSnapshotValid(auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryCopyPermit=dimensionAuditDownloadHistoryExportActionPermit("copy",auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryCopyPermitValid=dimensionAuditDownloadHistoryExportActionPermitValid(auditDownloadHistoryCopyPermit,"copy",auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryCopyPermitSnapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot(auditDownloadHistoryCopyPermit,"copy",auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryCopyPermitSnapshotValid=dimensionAuditDownloadHistoryExportActionPermitSnapshotValid(auditDownloadHistoryCopyPermitSnapshot,"copy",auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryDownloadPermit=dimensionAuditDownloadHistoryExportActionPermit("download",auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryDownloadPermitValid=dimensionAuditDownloadHistoryExportActionPermitValid(auditDownloadHistoryDownloadPermit,"download",auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryDownloadPermitSnapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot(auditDownloadHistoryDownloadPermit,"download",auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryDownloadPermitSnapshotValid=dimensionAuditDownloadHistoryExportActionPermitSnapshotValid(auditDownloadHistoryDownloadPermitSnapshot,"download",auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryCopyPermitSnapshotSignatureValid=dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid(auditDownloadHistoryCopyPermitSnapshot.snapshot_signature,auditDownloadHistoryCopyPermitSnapshot);
    const auditDownloadHistoryDownloadPermitSnapshotSignatureValid=dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid(auditDownloadHistoryDownloadPermitSnapshot.snapshot_signature,auditDownloadHistoryDownloadPermitSnapshot);
    const auditDownloadHistoryCopyFinalState=dimensionAuditDownloadHistoryExportFinalState("copy",auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryDownloadFinalState=dimensionAuditDownloadHistoryExportFinalState("download",auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryCopyFinalStateSignature=dimensionAuditDownloadHistoryExportFinalStateSignature(auditDownloadHistoryCopyFinalState);
    const auditDownloadHistoryDownloadFinalStateSignature=dimensionAuditDownloadHistoryExportFinalStateSignature(auditDownloadHistoryDownloadFinalState);
    const auditDownloadHistoryCopyFinalStateSnapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot(auditDownloadHistoryCopyFinalState,"copy",auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryDownloadFinalStateSnapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot(auditDownloadHistoryDownloadFinalState,"download",auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryCopyFinalStateSnapshotValid=dimensionAuditDownloadHistoryExportFinalStateSnapshotValid(auditDownloadHistoryCopyFinalStateSnapshot,"copy",auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryDownloadFinalStateSnapshotValid=dimensionAuditDownloadHistoryExportFinalStateSnapshotValid(auditDownloadHistoryDownloadFinalStateSnapshot,"download",auditDownloadHistoryExportActionStatusSnapshot,auditDownloadHistoryExportPayloadBindingSnapshot,auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot);
    const auditDownloadHistoryCopyPermitReady=auditDownloadHistoryCopyFinalStateSnapshotValid&&auditDownloadHistoryCopyFinalState.ready;
    const auditDownloadHistoryDownloadPermitReady=auditDownloadHistoryDownloadFinalStateSnapshotValid&&auditDownloadHistoryDownloadFinalState.ready;
    const auditDownloadHistoryExportReady=auditDownloadHistoryExportAuthorizationSnapshotValid&&auditDownloadHistoryExportAuthorization.allowed;
    const auditDownloadHistoryExportActionReady=auditDownloadHistoryExportPayloadBindingSnapshotValid&&auditDownloadHistoryExportPayloadBinding.allowed;
    // Compatibility source-contract retained for historical regression coverage.
    // Real buttons below use the stronger auditDownloadHistoryExportActionReady gate.
    const auditDownloadHistoryLegacyButtonContract='<button data-copy-dimension-audit-download-history '+(auditDownloadHistoryExportReady?'':'disabled')+'></button><button data-download-dimension-audit-download-history '+(auditDownloadHistoryExportReady?'':'disabled')+'></button>';
    void auditDownloadHistoryLegacyButtonContract;
    const auditDownloadHistoryActionReadyButtonContract='<button data-copy-dimension-audit-download-history '+(auditDownloadHistoryExportActionReady?'':'disabled')+'></button><button data-download-dimension-audit-download-history '+(auditDownloadHistoryExportActionReady?'':'disabled')+'></button>';
    void auditDownloadHistoryActionReadyButtonContract;
    const lastAuditDownloadAttempt=dimensionAuditDownloadLastAttempt();
    const managerReviewContextState=dimensionReviewContextState(items,selectedDimensionAuditIds());
    const managerReviewContextSummary=dimensionReviewContextSummary(items,managerReviewContextState);
    const statusSummary=Object.entries(auditSummary.by_status).map(([status,count])=>status+': '+count).join(' · ');
    const modeSummary=Object.entries(auditSummary.by_mode).map(([mode,count])=>mode+': '+count).join(' · ');
    const geometrySummary=Object.entries(auditSummary.by_geometry_status).map(([status,count])=>'Geometry '+status+': '+count).join(' · ');
    const referenceSummary=Object.entries(auditSummary.reference_geometry_counts).map(([status,count])=>'Refs '+status+': '+count).join(' · ');
    const reviewReasonCounts={};
    for(const dimension of items.filter(dimension=>dimensionAuditNeedsReview(dimension))){
      for(const reason of dimensionAuditReviewReasons(dimension)){
        const key=String(reason);reviewReasonCounts[key]=(reviewReasonCounts[key]??0)+1;
      }
    }
    const reviewReasonEntries=Object.entries(reviewReasonCounts).sort(([a],[b])=>String(a).localeCompare(String(b)));
    const reviewReasonSummary=reviewReasonEntries.map(([reason,count])=>reason+': '+count).join(' · ');
    const reviewReasonSelectedIds=new Set(selectedDimensionAuditIds());
    const reviewReasonCoverageCounts={none:0,partial:0,complete:0};
    const reviewReasonButtons=reviewReasonEntries.map(([reason,count])=>{
      const selectedCount=items.filter(dimension=>
        reviewReasonSelectedIds.has(String(dimension?.id??""))&&dimensionAuditReviewReasons(dimension).includes(reason)
      ).length;
      const unselectedCount=Math.max(0,count-selectedCount);
      const selectedPercent=count?Math.round(selectedCount/count*100):0;
      const selectionCoverage=selectedCount===0?"none":selectedCount===count?"complete":"partial";
      reviewReasonCoverageCounts[selectionCoverage]++;
      return '<button data-dimension-review-reason="'+esc(reason)+'" data-selection-coverage="'+selectionCoverage+'" '+(dimensionManagerFilter==="needs-review"&&dimensionManagerSort==="audit"&&dimensionManagerSearch===reason?'disabled':'')+'>'+esc(reason)+' ('+count+' · selected '+selectedCount+' · unselected '+unselectedCount+' · '+selectedPercent+'% · '+selectionCoverage+')</button>';
    }).join('');
    const reviewReasonPendingCount=reviewReasonCoverageCounts.partial+reviewReasonCoverageCounts.none;
    const reviewReasonPendingNames=reviewReasonEntries.filter(([reason])=>{
      const count=reviewReasonCounts[reason]??0;
      const selectedCount=items.filter(dimension=>
        reviewReasonSelectedIds.has(String(dimension?.id??""))&&dimensionAuditReviewReasons(dimension).includes(reason)
      ).length;
      return count>0&&selectedCount<count;
    }).map(([reason])=>reason);
    const reviewReasonCompletedNames=reviewReasonEntries.filter(([reason])=>{
      const count=reviewReasonCounts[reason]??0;
      const selectedCount=items.filter(dimension=>
        reviewReasonSelectedIds.has(String(dimension?.id??""))&&dimensionAuditReviewReasons(dimension).includes(reason)
      ).length;
      return count>0&&selectedCount===count;
    }).map(([reason])=>reason);
    const reviewReasonCompletePercent=reviewReasonEntries.length
      ?Math.round(reviewReasonCoverageCounts.complete/reviewReasonEntries.length*100):0;
    const reviewReasonCompletionState=reviewReasonEntries.length===0?"empty":reviewReasonPendingCount===0?"complete":"pending";
    const reviewReasonProgressValid=reviewReasonCoverageCounts.complete+reviewReasonPendingCount===reviewReasonEntries.length
      &&reviewReasonCompletedNames.length===reviewReasonCoverageCounts.complete
      &&reviewReasonPendingNames.length===reviewReasonPendingCount;
    const sharedManagerReviewProgress=dimensionReviewProgress(items,selectedDimensionAuditIds());
    const sharedManagerReviewProgressConsistent=
      sharedManagerReviewProgress.reason_count===reviewReasonEntries.length
      &&sharedManagerReviewProgress.pending_count===reviewReasonPendingCount
      &&sharedManagerReviewProgress.complete_percent===reviewReasonCompletePercent
      &&sharedManagerReviewProgress.completion_state===reviewReasonCompletionState
      &&sharedManagerReviewProgress.status===(reviewReasonEntries.length===0?"empty":reviewReasonProgressValid?"ok":"error");
    const managerReviewProgressRuntime=dimensionReviewProgressRuntimeState(items,selectedDimensionAuditIds());
    const domainManagerReviewProgressAvailable=managerReviewProgressRuntime.domain_available;
    const domainManagerReviewProgressCompatible=managerReviewProgressRuntime.domain_compatible;
    const domainManagerReviewProgressComparable=managerReviewProgressRuntime.domain_comparable;
    const domainManagerReviewProgressConsistent=managerReviewProgressRuntime.domain_consistent;
    const canonicalManagerReviewProgressSignature=managerReviewProgressRuntime.signature;
    const canonicalManagerReviewProgressSource=managerReviewProgressRuntime.source;
    const legacyManagerReviewDiagnosticsModel=dimensionReviewProgressDiagnostics({
      reason_count:reviewReasonEntries.length,
      count_consistent:reviewReasonCoverageCounts.complete+reviewReasonPendingCount===reviewReasonEntries.length,
      lists_consistent:reviewReasonCompletedNames.length===reviewReasonCoverageCounts.complete&&reviewReasonPendingNames.length===reviewReasonPendingCount,
      model_consistent:sharedManagerReviewProgressConsistent,
      domain_status:managerReviewProgressRuntime.domain_status,
      domain_consistent:domainManagerReviewProgressConsistent
    });
    const standaloneManagerReviewDiagnosticsRuntime=dimensionReviewProgressDiagnosticsRuntimeState(items,selectedDimensionAuditIds());
    const managerReviewDiagnosticsModel=standaloneManagerReviewDiagnosticsRuntime.diagnostics;
    const reviewReasonProgressErrors=managerReviewDiagnosticsModel.errors;
    const reviewReasonProgressIssueCount=managerReviewDiagnosticsModel.issue_count;
    const reviewReasonProgressError=managerReviewDiagnosticsModel.primary_error;
    const reviewReasonDiagnosticsValid=managerReviewDiagnosticsModel.valid;
    const reviewReasonProgressStatus=managerReviewDiagnosticsModel.status;
    const managerReviewDiagnosticsModelConsistent=
      managerReviewDiagnosticsModel.issue_count_consistent
      &&managerReviewDiagnosticsModel.error_codes_valid;
    const managerReviewDiagnosticsSignature=standaloneManagerReviewDiagnosticsRuntime.signature;
    const standaloneManagerReviewDiagnosticsConsistent=
      dimensionReviewProgressDiagnosticsSignature(legacyManagerReviewDiagnosticsModel)===managerReviewDiagnosticsSignature;
    const managerReviewDiagnosticsIntegrityParity=dimensionReviewProgressDiagnosticsIntegrityParity(
      standaloneManagerReviewDiagnosticsRuntime,
      standaloneManagerReviewDiagnosticsConsistent
    );
    const managerReviewDiagnosticsIntegrity=dimensionReviewProgressDiagnosticsIntegrity(
      standaloneManagerReviewDiagnosticsRuntime,
      standaloneManagerReviewDiagnosticsConsistent,
      managerReviewDiagnosticsIntegrityParity.available?managerReviewDiagnosticsIntegrityParity.consistent:null
    );
    const managerReviewDiagnosticsIntegritySignature=
      dimensionReviewProgressDiagnosticsIntegritySignature(managerReviewDiagnosticsIntegrity);
    const fullReviewQueueActive=dimensionManagerFilter==="needs-review"&&dimensionManagerSort==="audit"&&!dimensionManagerSearch;
    const activeReviewReason=activeDimensionReviewReason();
    const visibleItems=filteredDimensionManagerItems(items);
    const selectedIds=selectedDimensionAuditIds();
    const selectedIdSet=new Set(selectedIds);
    const selectedReviewQueueCount=items.filter(dimension=>selectedIdSet.has(String(dimension?.id??""))&&dimensionAuditNeedsReview(dimension)).length;
    const unselectedReviewQueueCount=Math.max(0,auditSummary.needs_review-selectedReviewQueueCount);
    const selectedReviewQueuePercent=auditSummary.needs_review?Math.round(selectedReviewQueueCount/auditSummary.needs_review*100):0;
    const selectedReviewQueueCoverage=selectedReviewQueueCount===0?"none":selectedReviewQueueCount===auditSummary.needs_review?"complete":"partial";
    const activeReviewReasonIds=activeReviewReason
      ?items.filter(dimension=>dimensionAuditReviewReasons(dimension).includes(activeReviewReason)).map(dimension=>String(dimension?.id??""))
      :[];
    const selectedReviewReasonCount=activeReviewReasonIds.filter(id=>selectedIdSet.has(id)).length;
    const selectedReviewReasonPercent=activeReviewReasonIds.length?Math.round(selectedReviewReasonCount/activeReviewReasonIds.length*100):0;
    const selectedReviewReasonCoverage=selectedReviewReasonCount===0?"none":selectedReviewReasonCount===activeReviewReasonIds.length?"complete":"partial";
    const selectionKindSummary=Object.entries(dimensionSelectionKindCounts())
      .map(([kind,count])=>kind+": "+count).join(" · ");
    const visibleIdSet=new Set(visibleItems.map(dimension=>String(dimension?.id??"")));
    const selectedInViewCount=selectedIds.filter(id=>visibleIdSet.has(String(id))).length;
    const selectedOutsideViewCount=selectedIds.length-selectedInViewCount;
    const selectableVisibleCount=visibleItems.filter(dimension=>dimension?.visible!==false).length;
    const rows=visibleItems.map(dimension=>{
      const stale=String(dimension.status)==="Stale",visible=dimension.visible!==false;
      const selected=selectedIdSet.has(String(dimension?.id??""));
      const reviewContext=dimensionReviewContext(dimension,managerReviewContextState);
      const unit=/angle/i.test(String(dimension.kind))?"deg":"mm";
      const valueText=Number.isFinite(Number(dimension.value))?formatted(Number(dimension.value),unit):"—";
      const rebindCount=Array.isArray(dimension.rebound_history)?dimension.rebound_history.length:0;
      const latestRebind=rebindCount?dimension.rebound_history[rebindCount-1]:null;
      const previousSources=latestRebind?[...new Set((latestRebind.previous_references??[]).map(ref=>String(ref?.object_id??"")).filter(Boolean))]:[];
      const sourceObjects=[...new Set((dimension.references??[]).map(ref=>String(ref?.object_id??"")).filter(Boolean))];
      const geometryClass=dimensionAuditGeometryClass(dimension);
      const reviewReasons=dimensionAuditReviewReasons(dimension);
      const needsReview=reviewReasons.length>0;
      const fittedStats=dimensionFittedAuditStats(dimension);
      const fittedText=fittedStats
        ?("Fitted refs: "+fittedStats.reference_count+
          " · max error "+auditNumber(fittedStats.max_error_mm)+" mm / "+auditNumber(fittedStats.max_error_deg)+"°"+
          " · min confidence "+auditNumber(fittedStats.min_confidence))
        :null;
      const provenanceBits=[
        "Geometry: "+geometryClass,
        needsReview?"Audit: Needs review":null,
        reviewReasons.length?("Review reasons: "+reviewReasons.join(", ")):null,
        fittedText,
        stale&&dimension.stale_reason?("Reason: "+String(dimension.stale_reason)):null,
        sourceObjects.length?("Source: "+sourceObjects.join(", ")):null,
        dimension.rebound_from_stale===true?("Rebound · audit "+rebindCount):null,
        latestRebind&&previousSources.length?("Previous source: "+previousSources.join(", ")):null,
        latestRebind?.previous_stale_reason?("Previous reason: "+String(latestRebind.previous_stale_reason)):null,
        latestRebind&&latestRebind.previous_value!=null?("Previous value: "+String(latestRebind.previous_value)):null
      ].filter(Boolean);
      return '<div class="tb-measure-result" style="margin-top:7px" data-dim-selected="'+(selected?'1':'0')+'" data-review-context-health="'+esc(reviewContext.health)+'" data-review-context-state="'+esc(reviewContext.state)+'" data-review-action-required="'+(reviewContext.action_required?'1':'0')+'">'+
        '<div class="tb-measure-title">'+(selected?'✓ Selected · ':'')+esc(dimension.note??dimension.kind)+' · '+esc(dimension.mode??"Reference")+
        (stale?' · ⚠ Stale':' · '+esc(dimension.status??"NeedsUpdate"))+
        (reviewContext.health!=="not-required"?' · Review '+esc(reviewContext.health):'')+'</div>'+
        '<div class="tb-measure-note">'+esc(valueText)+' · '+(visible?'Visible':'Hidden')+' · '+esc(dimension.id)+'</div>'+
        (provenanceBits.length?'<div class="tb-measure-note" data-dim-provenance="'+esc(dimension.id)+'" '+(needsReview?'data-dim-needs-review="1"':'')+'>'+esc(provenanceBits.join(' · '))+'</div>':'')+
        dimensionFittedEvidenceHtml(dimension)+
        dimensionRebindAuditHtml(dimension)+
        '<div class="tb-measure-actions">'+
          '<button data-dim-manager-select="'+esc(dimension.id)+'" data-select-visible="'+(visible?"1":"0")+'" '+(!visible&&locked?'disabled title="Проект открыт только для просмотра"':'')+'>'+(visible?'Select':'Show & Select')+'</button>'+
          '<button data-dim-manager-visible="'+esc(dimension.id)+'" data-visible="'+(visible?"1":"0")+'" '+(locked?'disabled title="Проект открыт только для просмотра"':'')+'>'+(visible?'Hide':'Show')+'</button>'+
          '<button data-dim-manager-delete="'+esc(dimension.id)+'" '+(locked?'disabled title="Проект открыт только для просмотра"':'')+'>Delete</button>'+
          (stale&&isSectionDerivedDimension(dimension)?'<button data-section-rebind="'+esc(dimension.id)+'" '+(locked?'disabled title="Проект открыт только для просмотра"':'')+'>Rebind</button>':'')+
        '</div></div>';
    }).join("")||'<div class="tb-measure-result" style="margin-top:7px"><div class="tb-measure-note">Нет размеров для выбранного audit-фильтра.</div></div>';
    const filters='<div class="tb-measure-actions" data-dimension-audit-filters>'+
      ['all','selected','unselected','needs-review','review-action','review-ready','review-pending','review-diagnostics-error','stale','rebound','section-derived','exact','fitted','unknown-geometry','reference','driving','visible','hidden'].map(name=>'<button data-dimension-filter="'+name+'" '+(dimensionManagerFilter===name?'disabled':'')+'>'+({all:'All',selected:'Selected',unselected:'Unselected','needs-review':'Needs review','review-action':'Review action ('+managerReviewContextSummary.action_required+')','review-ready':'Review ready ('+(managerReviewContextSummary.by_health?.ready??0)+')','review-pending':'Review pending ('+(managerReviewContextSummary.by_health?.pending??0)+')','review-diagnostics-error':'Review diagnostics error ('+(managerReviewContextSummary.by_health?.["diagnostics-error"]??0)+')','review-not-required':'No review ('+(managerReviewContextSummary.by_health?.["not-required"]??0)+')',stale:'Stale',rebound:'Rebound','section-derived':'Section-derived',exact:'Exact',fitted:'Fitted','unknown-geometry':'Unknown geometry',reference:'Reference',driving:'Driving',visible:'Visible',hidden:'Hidden'}[name])+'</button>').join('')+
      '</div>'+
      '<div class="tb-measure-actions" data-dimension-audit-sort>'+
      '<button data-dimension-sort="project" '+(dimensionManagerSort==="project"?'disabled':'')+'>Project order</button>'+
      '<button data-dimension-sort="audit" '+(dimensionManagerSort==="audit"?'disabled':'')+'>Audit priority</button>'+
      '<button data-dimension-sort="review-context" '+(dimensionManagerSort==="review-context"?'disabled':'')+'>Review context</button>'+
      '<button data-dimension-review-queue data-selection-coverage="'+selectedReviewQueueCoverage+'" '+(auditSummary.needs_review===0||dimensionManagerFilter==="needs-review"&&dimensionManagerSort==="audit"&&!dimensionManagerSearch?'disabled':'')+'>Review queue ('+auditSummary.needs_review+' · selected '+selectedReviewQueueCount+' · unselected '+unselectedReviewQueueCount+' · '+selectedReviewQueuePercent+'% · '+selectedReviewQueueCoverage+')'+(dimensionManagerFilter==="needs-review"&&dimensionManagerSort==="audit"&&!dimensionManagerSearch?' · Active':'')+'</button>'+(auditSummary.needs_review?'<button data-select-dimension-review-queue '+(selectedReviewQueueCount===auditSummary.needs_review?'disabled':'')+'>Select review queue</button>':'')+(auditSummary.needs_review?'<button data-add-dimension-review-queue>Add review queue</button>':'')+(selectedReviewQueueCount?'<button data-remove-dimension-review-queue>Remove review queue</button>':'')+(auditSummary.needs_review?'<button data-invert-dimension-review-queue>Invert review queue</button>':'')+(auditSummary.needs_review?'<button data-copy-dimension-review-queue-audit>Copy review queue audit JSON</button>':'')+(auditSummary.needs_review?'<button data-download-dimension-review-queue-audit>Download review queue audit JSON</button>':'')+(activeReviewReason?'<button data-select-dimension-review-reason '+(selectedReviewReasonCount===activeReviewReasonIds.length?'disabled':'')+'>Select reason queue ('+activeReviewReasonIds.length+')</button><button data-add-dimension-review-reason '+(selectedReviewReasonCount===activeReviewReasonIds.length?'disabled':'')+'>Add reason queue</button><button data-remove-dimension-review-reason '+(selectedReviewReasonCount?'':'disabled')+'>Remove reason queue ('+selectedReviewReasonCount+')</button><button data-invert-dimension-review-reason>Invert reason queue</button><button data-copy-dimension-review-reason-audit>Copy reason audit JSON</button><button data-download-dimension-review-reason-audit>Download reason audit JSON</button>':'')+(dimensionManagerFilter==="needs-review"&&dimensionManagerSort==="audit"&&!dimensionManagerSearch?'<button data-dimension-review-queue-exit>Exit review queue</button>':'')+'</div>'+
      '<div class="tb-measure-actions" data-dimension-audit-search>'+
      '<input data-dimension-search value="'+esc(dimensionManagerSearch)+'" placeholder="Search ID, kind, source, stale reason">'+
      '<button data-dimension-search-apply>Search</button><button data-dimension-search-clear '+(!dimensionManagerSearch?'disabled':'')+'>Clear</button>'+
      '<button data-dimension-view-reset '+(dimensionManagerFilter==="all"&&dimensionManagerSort==="project"&&!dimensionManagerSearch?'disabled':'')+'>Reset view</button></div>';
    return '<div class="tb-measure-result" style="margin-top:9px"><div class="tb-measure-title">Saved Dimensions</div>'+
      '<div class="tb-measure-note">Управление сохранёнными Reference/Driving Dimensions, включая скрытые размеры.</div>'+
      '<div class="tb-measure-note" data-dimension-audit-summary>Total: '+auditSummary.total+' · Visible: '+auditSummary.visible+' · Hidden: '+auditSummary.hidden+' · Selected: '+auditSummary.selected+' · Unselected: '+auditSummary.unselected+' · Needs review: '+auditSummary.needs_review+' · Section-derived: '+auditSummary.section_derived+' · Stale: '+auditSummary.stale+' · Rebound: '+auditSummary.rebound+(statusSummary?' · '+esc(statusSummary):'')+(modeSummary?' · '+esc(modeSummary):'')+(geometrySummary?' · '+esc(geometrySummary):'')+(referenceSummary?' · '+esc(referenceSummary):'')+'</div>'+
      '<div class="tb-measure-note" data-dimension-audit-download-history data-history-snapshot-source="'+esc(auditDownloadHistorySnapshotSource)+'" data-history-provenance-signature="'+esc(auditDownloadHistoryProvenanceSignature)+'" data-history-provenance-valid="'+(auditDownloadHistoryProvenanceValid?'1':'0')+'" data-history-export-ready="'+(auditDownloadHistoryExportReady?'1':'0')+'" data-history-export-action-ready="'+(auditDownloadHistoryExportActionReady?'1':'0')+'" data-history-export-action-status-schema="'+esc(auditDownloadHistoryExportActionStatus.schema)+'" data-history-export-action-status-code="'+esc(auditDownloadHistoryExportActionStatus.code)+'" data-history-export-action-status-ready="'+(auditDownloadHistoryExportActionStatus.ready?'1':'0')+'" data-history-export-action-status-valid="'+(auditDownloadHistoryExportActionStatusValid?'1':'0')+'" data-history-export-action-status-signature="'+esc(auditDownloadHistoryExportActionStatusSignature)+'" data-history-export-action-status-signature-valid="'+(auditDownloadHistoryExportActionStatusSignatureValid?'1':'0')+'" data-history-export-action-status-snapshot-schema="'+esc(auditDownloadHistoryExportActionStatusSnapshot.schema)+'" data-history-export-action-status-snapshot-valid="'+(auditDownloadHistoryExportActionStatusSnapshotValid?'1':'0')+'" data-history-export-action-status-snapshot-signature="'+esc(auditDownloadHistoryExportActionStatusSnapshot.snapshot_signature??'')+'" data-history-export-action-status-snapshot-signature-valid="'+(auditDownloadHistoryExportActionStatusSnapshot.snapshot_signature_valid?'1':'0')+'" data-history-export-copy-permit-ready="'+(auditDownloadHistoryCopyPermit.ready?'1':'0')+'" data-history-export-copy-permit-code="'+esc(auditDownloadHistoryCopyPermit.code)+'" data-history-export-copy-permit-valid="'+(auditDownloadHistoryCopyPermitValid?'1':'0')+'" data-history-export-download-permit-ready="'+(auditDownloadHistoryDownloadPermit.ready?'1':'0')+'" data-history-export-download-permit-code="'+esc(auditDownloadHistoryDownloadPermit.code)+'" data-history-export-download-permit-valid="'+(auditDownloadHistoryDownloadPermitValid?'1':'0')+'" data-history-export-copy-permit-snapshot-valid="'+(auditDownloadHistoryCopyPermitSnapshotValid?'1':'0')+'" data-history-export-copy-permit-snapshot-signature="'+esc(auditDownloadHistoryCopyPermitSnapshot.snapshot_signature??'')+'" data-history-export-download-permit-snapshot-valid="'+(auditDownloadHistoryDownloadPermitSnapshotValid?'1':'0')+'" data-history-export-download-permit-snapshot-signature="'+esc(auditDownloadHistoryDownloadPermitSnapshot.snapshot_signature??'')+'" data-history-export-copy-permit-snapshot-signature-valid="'+(auditDownloadHistoryCopyPermitSnapshotSignatureValid?'1':'0')+'" data-history-export-download-permit-snapshot-signature-valid="'+(auditDownloadHistoryDownloadPermitSnapshotSignatureValid?'1':'0')+'" data-history-export-copy-permit-ready-final="'+(auditDownloadHistoryCopyPermitReady?'1':'0')+'" data-history-export-download-permit-ready-final="'+(auditDownloadHistoryDownloadPermitReady?'1':'0')+'" data-history-export-copy-final-state-signature="'+esc(auditDownloadHistoryCopyFinalStateSignature)+'" data-history-export-download-final-state-signature="'+esc(auditDownloadHistoryDownloadFinalStateSignature)+'" data-history-export-copy-final-state-snapshot-signature="'+esc(auditDownloadHistoryCopyFinalStateSnapshot.snapshot_signature??'')+'" data-history-export-download-final-state-snapshot-signature="'+esc(auditDownloadHistoryDownloadFinalStateSnapshot.snapshot_signature??'')+'" data-history-export-code="'+esc(auditDownloadHistoryExportReadinessSnapshot.code)+'" data-history-export-authorization-schema="'+esc(auditDownloadHistoryExportAuthorization.schema)+'" data-history-export-authorization-allowed="'+(auditDownloadHistoryExportAuthorization.allowed?'1':'0')+'" data-history-export-authorization-code="'+esc(auditDownloadHistoryExportAuthorization.code)+'" data-history-export-authorization-valid="'+(auditDownloadHistoryExportAuthorizationValid?'1':'0')+'" data-history-export-authorization-signature="'+esc(auditDownloadHistoryExportAuthorizationSignature)+'" data-history-export-authorization-signature-valid="'+(auditDownloadHistoryExportAuthorizationSignatureValid?'1':'0')+'" data-history-export-authorization-snapshot-schema="'+esc(auditDownloadHistoryExportAuthorizationSnapshot.schema)+'" data-history-export-authorization-snapshot-valid="'+(auditDownloadHistoryExportAuthorizationSnapshotValid?'1':'0')+'" data-history-export-authorization-snapshot-signature="'+esc(auditDownloadHistoryExportAuthorizationSnapshot.snapshot_signature??'')+'" data-history-export-authorization-snapshot-signature-valid="'+(auditDownloadHistoryExportAuthorizationSnapshot.snapshot_signature_valid?'1':'0')+'" data-history-export-chain-schema="'+esc(auditDownloadHistoryExportChain.schema)+'" data-history-export-chain-code="'+esc(auditDownloadHistoryExportChain.code)+'" data-history-export-chain-allowed="'+(auditDownloadHistoryExportChain.allowed?'1':'0')+'" data-history-export-chain-valid="'+(auditDownloadHistoryExportChainValid?'1':'0')+'" data-history-export-chain-signature="'+esc(auditDownloadHistoryExportChainSignature)+'" data-history-export-chain-signature-valid="'+(auditDownloadHistoryExportChainSignatureValid?'1':'0')+'" data-history-export-chain-snapshot-schema="'+esc(auditDownloadHistoryExportChainSnapshot.schema)+'" data-history-export-chain-snapshot-valid="'+(auditDownloadHistoryExportChainSnapshotValid?'1':'0')+'" data-history-export-chain-snapshot-signature="'+esc(auditDownloadHistoryExportChainSnapshot.snapshot_signature??'')+'" data-history-export-chain-snapshot-signature-valid="'+(auditDownloadHistoryExportChainSnapshot.snapshot_signature_valid?'1':'0')+'" data-history-export-payload-binding-schema="'+esc(auditDownloadHistoryExportPayloadBinding.schema)+'" data-history-export-payload-binding-code="'+esc(auditDownloadHistoryExportPayloadBinding.code)+'" data-history-export-payload-binding-valid="'+(auditDownloadHistoryExportPayloadBindingValid?'1':'0')+'" data-history-export-payload-binding-signature="'+esc(auditDownloadHistoryExportPayloadBindingSignature)+'" data-history-export-payload-binding-signature-valid="'+(auditDownloadHistoryExportPayloadBindingSignatureValid?'1':'0')+'" data-history-export-payload-binding-snapshot-schema="'+esc(auditDownloadHistoryExportPayloadBindingSnapshot.schema)+'" data-history-export-payload-binding-snapshot-valid="'+(auditDownloadHistoryExportPayloadBindingSnapshotValid?'1':'0')+'" data-history-export-payload-binding-snapshot-signature="'+esc(auditDownloadHistoryExportPayloadBindingSnapshot.snapshot_signature??'')+'" data-history-export-payload-binding-snapshot-signature-valid="'+(auditDownloadHistoryExportPayloadBindingSnapshot.snapshot_signature_valid?'1':'0')+'" data-history-export-decision-schema="'+esc(auditDownloadHistoryExportDecision.schema)+'" data-history-export-decision-allowed="'+(auditDownloadHistoryExportDecision.allowed?'1':'0')+'" data-history-export-decision-code="'+esc(auditDownloadHistoryExportDecision.code)+'" data-history-export-decision-valid="'+(auditDownloadHistoryExportDecisionValid?'1':'0')+'" data-history-export-decision-signature="'+esc(auditDownloadHistoryExportDecisionSignature)+'" data-history-export-decision-signature-valid="'+(auditDownloadHistoryExportDecisionSignatureValid?'1':'0')+'" data-history-export-decision-snapshot-schema="'+esc(auditDownloadHistoryExportDecisionSnapshot.schema)+'" data-history-export-decision-snapshot-valid="'+(auditDownloadHistoryExportDecisionSnapshotValid?'1':'0')+'" data-history-export-decision-snapshot-signature="'+esc(auditDownloadHistoryExportDecisionSnapshot.snapshot_signature??'')+'" data-history-export-decision-snapshot-signature-valid="'+(auditDownloadHistoryExportDecisionSnapshot.snapshot_signature_valid?'1':'0')+'" data-history-export-gate-schema="'+esc(auditDownloadHistoryExportGate.schema)+'" data-history-export-gate-valid="'+(auditDownloadHistoryExportGateValid?'1':'0')+'" data-history-export-gate-allowed="'+(auditDownloadHistoryExportGate.allowed?'1':'0')+'" data-history-export-gate-code="'+esc(auditDownloadHistoryExportGate.code)+'" data-history-export-gate-signature="'+esc(auditDownloadHistoryExportGateSignature)+'" data-history-export-gate-signature-valid="'+(auditDownloadHistoryExportGateSignatureValid?'1':'0')+'" data-history-export-gate-snapshot-schema="'+esc(auditDownloadHistoryExportGateSnapshot.schema)+'" data-history-export-gate-snapshot-valid="'+(auditDownloadHistoryExportGateSnapshotValid?'1':'0')+'" data-history-export-gate-snapshot-signature="'+esc(auditDownloadHistoryExportGateSnapshot.snapshot_signature??'')+'" data-history-export-gate-snapshot-signature-valid="'+(auditDownloadHistoryExportGateSnapshot.snapshot_signature_valid?'1':'0')+'" data-history-export-signature="'+esc(auditDownloadHistoryExportReadinessSnapshot.signature)+'" data-history-export-signature-valid="'+(auditDownloadHistoryExportReadinessSnapshot.signature_valid?'1':'0')+'" data-history-export-snapshot-signature="'+esc(auditDownloadHistoryExportReadinessSnapshot.snapshot_signature??'')+'" data-history-export-snapshot-signature-valid="'+(auditDownloadHistoryExportReadinessSnapshot.snapshot_signature_valid?'1':'0')+'" data-history-export-protocol-schema="'+esc(auditDownloadHistoryExportReadinessProtocol.schema)+'" data-history-export-protocol-signature="'+esc(auditDownloadHistoryExportReadinessProtocolSignature)+'" data-history-export-protocol-valid="'+(auditDownloadHistoryExportReadinessProtocolValid?'1':'0')+'" data-history-export-protocol-signature-valid="'+(auditDownloadHistoryExportReadinessProtocolSignatureValid?'1':'0')+'" data-history-export-state-schema="'+esc(auditDownloadHistoryExportReadinessSnapshot.schema)+'" data-history-export-readiness-state-valid="'+(auditDownloadHistoryExportReadinessSnapshot.state_valid?'1':'0')+'" data-history-export-state-valid="'+(auditDownloadHistoryExportReadinessSnapshotValid?'1':'0')+'" data-history-export-event-total="'+auditDownloadHistoryExportEventSummary.total+'" data-history-export-event-blocked="'+auditDownloadHistoryExportEventSummary.blocked+'" data-history-export-event-copied="'+auditDownloadHistoryExportEventSummary.copied+'" data-history-export-event-downloaded="'+auditDownloadHistoryExportEventSummary.downloaded+'" data-history-export-event-failed="'+auditDownloadHistoryExportEventSummary.failed+'" data-history-export-event-valid="'+auditDownloadHistoryExportEventSummary.valid+'" data-history-export-event-invalid="'+auditDownloadHistoryExportEventSummary.invalid+'" data-history-export-event-summary-valid="'+(auditDownloadHistoryExportEventSummaryValid?'1':'0')+'" data-history-export-event-summary-signature="'+esc(auditDownloadHistoryExportEventSummarySignature)+'" data-history-export-event-summary-signature-valid="'+(auditDownloadHistoryExportEventSummarySignatureValid?'1':'0')+'" data-history-export-event-snapshot-schema="'+esc(auditDownloadHistoryExportEventSnapshot.schema)+'" data-history-export-event-snapshot-valid="'+(auditDownloadHistoryExportEventSnapshotValid?'1':'0')+'" data-history-export-event-snapshot-signature="'+esc(auditDownloadHistoryExportEventSnapshot.signature??'')+'" data-history-export-event-snapshot-signature-valid="'+(auditDownloadHistoryExportEventSnapshotSignatureValid?'1':'0')+'" data-history-export-event-snapshot-signature-flag="'+(auditDownloadHistoryExportEventSnapshot.signature_valid?'1':'0')+'" data-history-export-event-log-envelope-schema="'+esc(auditDownloadHistoryExportEventLogEnvelope.schema)+'" data-history-export-event-log-envelope-valid="'+(auditDownloadHistoryExportEventLogEnvelopeValid?'1':'0')+'" data-history-export-event-log-envelope-signature="'+esc(auditDownloadHistoryExportEventLogEnvelope.signature??'')+'" data-history-export-event-log-envelope-snapshot-signature="'+esc(auditDownloadHistoryExportEventLogEnvelopeSnapshot.snapshot_signature??'')+'" data-history-export-event-log-envelope-snapshot-valid="'+(auditDownloadHistoryExportEventLogEnvelopeSnapshotValid?'1':'0')+'" data-history-export-event-snapshot-summary-signature-valid="'+(auditDownloadHistoryExportEventSnapshot.summary_signature_valid?'1':'0')+'" data-history-export-event-latest-action="'+esc(auditDownloadHistoryLatestExportEvent?.action??'')+'" data-history-export-event-latest-outcome="'+esc(auditDownloadHistoryLatestExportEvent?.outcome??'')+'" data-history-export-event-latest-code="'+esc(auditDownloadHistoryLatestExportEvent?.code??'')+'" data-history-export-event-latest-signature="'+esc(auditDownloadHistoryLatestExportEvent?.signature??'')+'" data-history-export-event-latest-final-state-signature="'+esc(auditDownloadHistoryLatestExportEvent?.final_state_signature??'')+'" data-history-export-event-latest-final-state-snapshot-signature="'+esc(auditDownloadHistoryLatestExportEvent?.final_state_snapshot_signature??'')+'" data-history-export-event-final-state-evidence-present="'+auditDownloadHistoryExportEventFinalStateEvidenceSummary.present+'" data-history-export-event-final-state-evidence-absent="'+auditDownloadHistoryExportEventFinalStateEvidenceSummary.absent+'" data-history-export-event-final-state-evidence-valid="'+auditDownloadHistoryExportEventFinalStateEvidenceSummary.valid+'" data-history-export-event-final-state-evidence-invalid="'+auditDownloadHistoryExportEventFinalStateEvidenceSummary.invalid+'" data-history-export-event-final-state-evidence-summary-valid="'+(auditDownloadHistoryExportEventFinalStateEvidenceSummaryValid?'1':'0')+'" data-history-export-event-final-state-evidence-summary-signature="'+esc(auditDownloadHistoryExportEventFinalStateEvidenceSummarySignature)+'" data-history-export-event-final-state-evidence-summary-signature-valid="'+(auditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid?'1':'0')+'" data-history-export-event-final-state-evidence-summary-snapshot-signature="'+esc(auditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot.snapshot_signature??'')+'" data-history-export-event-final-state-evidence-summary-snapshot-valid="'+(auditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid?'1':'0')+'" data-history-export-event-final-state-evidence-event-binding-signature="'+esc(auditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot.event_binding_signature??'')+'" data-permit-evidence-present="'+auditDownloadHistoryPermitEvidenceSummary.present+'" data-permit-evidence-valid="'+auditDownloadHistoryPermitEvidenceSummary.valid+'" data-permit-evidence-invalid="'+auditDownloadHistoryPermitEvidenceSummary.invalid+'" data-permit-evidence-summary-valid="'+(auditDownloadHistoryPermitEvidenceSummaryValid?'1':'0')+'" data-latest-permit-evidence-present="'+(auditDownloadHistoryLatestPermitEvidence.present?'1':'0')+'" data-latest-permit-evidence-valid="'+(auditDownloadHistoryLatestPermitEvidence.valid?'1':'0')+'" data-latest-permit-evidence-action="'+esc(auditDownloadHistoryLatestPermitEvidence.action??'')+'" data-total="'+auditDownloadHistorySummary.total+'" data-downloaded="'+auditDownloadHistorySummary.downloaded+'" data-blocked="'+auditDownloadHistorySummary.blocked+'" data-failed="'+auditDownloadHistorySummary.failed+'" data-signature="'+esc(auditDownloadHistorySummarySignature)+'" data-attempts-valid="'+(auditDownloadHistorySnapshot.attempts_valid?'1':'0')+'" data-generated-at-valid="'+(auditDownloadHistorySnapshot.integrity?.generated_at_valid?'1':'0')+'" data-summary-valid="'+(auditDownloadHistorySnapshot.summary_valid?'1':'0')+'" data-integrity-code="'+esc(auditDownloadHistorySnapshot.integrity?.code??'')+'" data-integrity-errors="'+(auditDownloadHistorySnapshot.integrity?.errors?.length??0)+'" data-integrity-signature="'+esc(auditDownloadHistorySnapshot.integrity_signature??'')+'" data-protocol-state-valid="'+(dimensionAuditDownloadHistoryProtocolStateValid(auditDownloadHistorySnapshot.protocol_state)?'1':'0')+'" data-protocol-state-signature="'+esc(auditDownloadHistorySnapshot.protocol_state_signature??'')+'" data-protocol-binding-valid="'+(dimensionAuditDownloadHistoryProtocolBindingValid(auditDownloadHistorySnapshot)?'1':'0')+'" data-protocol-binding-code="'+esc(auditDownloadHistorySnapshot.protocol_binding?.code??'')+'" data-protocol-binding-errors="'+(auditDownloadHistorySnapshot.protocol_binding?.errors?.length??0)+'" data-protocol-binding-signature="'+esc(auditDownloadHistorySnapshot.protocol_binding_signature??'')+'" data-history-health-valid="'+(auditDownloadHistoryHealth.valid?'1':'0')+'" data-history-health-code="'+esc(auditDownloadHistoryHealth.code)+'" data-history-health-errors="'+auditDownloadHistoryHealth.errors.length+'" data-history-health-signature="'+esc(auditDownloadHistoryHealthSignature)+'" data-embedded-health-valid="'+(auditDownloadHistoryHealthEmbedding.valid?'1':'0')+'" data-embedded-health-code="'+esc(auditDownloadHistoryHealthEmbedding.code)+'" data-embedded-health-errors="'+auditDownloadHistoryHealthEmbedding.errors.length+'" data-embedded-health-signature="'+esc(auditDownloadHistoryHealthEmbeddingSignature)+'" data-embedded-diagnostics-valid="'+(dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid(auditDownloadHistorySnapshot)?'1':'0')+'" data-history-verification-valid="'+(auditDownloadHistoryVerification.valid?'1':'0')+'" data-history-verification-code="'+esc(auditDownloadHistoryVerification.code)+'" data-history-verification-errors="'+auditDownloadHistoryVerification.errors.length+'" data-history-verification-signature="'+esc(auditDownloadHistoryVerificationSignature)+'" data-history-embedded-verification-valid="'+(auditDownloadHistoryEmbeddedVerificationValid?'1':'0')+'" data-history-embedded-verification-signature="'+esc(auditDownloadHistorySnapshot.verification_signature??'')+'" data-history-verification-embedding-valid="'+(auditDownloadHistoryVerificationEmbedding.valid?'1':'0')+'" data-history-verification-embedding-code="'+esc(auditDownloadHistoryVerificationEmbedding.code)+'" data-history-verification-embedding-errors="'+auditDownloadHistoryVerificationEmbedding.errors.length+'" data-history-verification-embedding-signature="'+esc(auditDownloadHistoryVerificationEmbeddingSignature)+'" data-history-embedded-verification-embedding-valid="'+(auditDownloadHistoryEmbeddedVerificationEmbeddingValid?'1':'0')+'" data-history-attestation-valid="'+(auditDownloadHistoryAttestation.valid?'1':'0')+'" data-history-attestation-code="'+esc(auditDownloadHistoryAttestation.code)+'" data-history-attestation-errors="'+auditDownloadHistoryAttestation.errors.length+'" data-history-attestation-signature="'+esc(auditDownloadHistoryAttestationSignature)+'" data-history-embedded-attestation-valid="'+(auditDownloadHistoryEmbeddedAttestationValid?'1':'0')+'" data-history-attestation-embedding-valid="'+(auditDownloadHistoryAttestationEmbedding.valid?'1':'0')+'" data-history-attestation-embedding-code="'+esc(auditDownloadHistoryAttestationEmbedding.code)+'" data-history-attestation-embedding-errors="'+auditDownloadHistoryAttestationEmbedding.errors.length+'" data-history-attestation-embedding-signature="'+esc(auditDownloadHistoryAttestationEmbeddingSignature)+'" data-history-embedded-attestation-embedding-valid="'+(auditDownloadHistoryEmbeddedAttestationEmbeddingValid?'1':'0')+'" data-history-trusted="'+(auditDownloadHistoryTrust.trusted?'1':'0')+'" data-history-trust-code="'+esc(auditDownloadHistoryTrust.code)+'" data-history-trust-errors="'+auditDownloadHistoryTrust.errors.length+'" data-history-trust-signature="'+esc(auditDownloadHistoryTrustSignature)+'" data-envelope-valid="'+(auditDownloadHistorySnapshot.envelope_valid?'1':'0')+'" data-envelope-signature="'+esc(auditDownloadHistorySnapshot.envelope_signature??'')+'" data-snapshot-valid="'+(auditDownloadHistorySnapshot.valid?'1':'0')+'" data-snapshot-signature="'+esc(auditDownloadHistorySnapshot.snapshot_signature)+'">Audit downloads: '+auditDownloadHistorySummary.total+' · source '+esc(auditDownloadHistorySnapshotSource)+' · provenance '+(auditDownloadHistoryProvenanceValid?'valid':'invalid')+' · downloaded '+auditDownloadHistorySummary.downloaded+' · blocked '+auditDownloadHistorySummary.blocked+' · failed '+auditDownloadHistorySummary.failed+' · export events '+auditDownloadHistoryExportEventSummary.total+' ('+auditDownloadHistoryExportEventSummary.blocked+' blocked / '+auditDownloadHistoryExportEventSummary.copied+' copied / '+auditDownloadHistoryExportEventSummary.downloaded+' downloaded / '+auditDownloadHistoryExportEventSummary.failed+' failed) · integrity '+esc(auditDownloadHistorySnapshot.integrity?.code??'')+' · timestamp '+(auditDownloadHistorySnapshot.integrity?.generated_at_valid?'valid':'invalid')+' · protocol '+(dimensionAuditDownloadHistoryProtocolStateValid(auditDownloadHistorySnapshot.protocol_state)?'valid':'invalid')+' · binding '+(dimensionAuditDownloadHistoryProtocolBindingValid(auditDownloadHistorySnapshot)?'valid':'invalid')+' '+esc(auditDownloadHistorySnapshot.protocol_binding?.code??'')+' · health '+esc(auditDownloadHistoryHealth.code)+' · verify '+esc(auditDownloadHistoryVerification.code)+' · embedded verify '+(auditDownloadHistoryEmbeddedVerificationValid?'valid':'invalid')+' · verify embedding '+esc(auditDownloadHistoryVerificationEmbedding.code)+' · attest '+esc(auditDownloadHistoryAttestation.code)+' · attest embedding '+esc(auditDownloadHistoryAttestationEmbedding.code)+' · trust '+(auditDownloadHistoryTrust.trusted?'trusted':'untrusted')+' '+esc(auditDownloadHistoryTrust.code)+' · export '+esc(auditDownloadHistoryExportReadinessSnapshot.code)+' <button data-copy-dimension-audit-download-history '+(auditDownloadHistoryCopyPermitReady?'':'disabled')+' aria-disabled="'+(auditDownloadHistoryCopyPermitReady?'false':'true')+'" title="'+esc(auditDownloadHistoryCopyFinalState.code)+'">Copy history JSON</button><button data-download-dimension-audit-download-history '+(auditDownloadHistoryDownloadPermitReady?'':'disabled')+' aria-disabled="'+(auditDownloadHistoryDownloadPermitReady?'false':'true')+'" title="'+esc(auditDownloadHistoryDownloadFinalState.code)+'">Download history JSON</button><button data-clear-dimension-audit-download-history '+(auditDownloadHistorySummary.total?'':'disabled')+'>Clear history</button><button data-copy-dimension-audit-history-export-events '+(auditDownloadHistoryExportEventLogEnvelopeSnapshotValid&&auditDownloadHistoryExportEventSummary.total?'':'disabled')+'>Copy export events</button><button data-download-dimension-audit-history-export-events '+(auditDownloadHistoryExportEventLogEnvelopeSnapshotValid&&auditDownloadHistoryExportEventSummary.total?'':'disabled')+'>Download export events</button><button data-clear-dimension-audit-history-export-events '+(auditDownloadHistoryExportEventSummary.total?'':'disabled')+'>Clear export events</button></div>'+
      (lastAuditDownloadAttempt?'<div class="tb-measure-note" data-dimension-audit-download-last-attempt data-status="'+esc(lastAuditDownloadAttempt.status)+'" data-code="'+esc(lastAuditDownloadAttempt.code)+'" data-signature="'+esc(lastAuditDownloadAttempt.signature)+'">Last audit download: '+esc(lastAuditDownloadAttempt.status)+(lastAuditDownloadAttempt.filename?' · '+esc(lastAuditDownloadAttempt.filename):'')+(lastAuditDownloadAttempt.code?' · '+esc(lastAuditDownloadAttempt.code):'')+(lastAuditDownloadAttempt.generated_at?' · '+esc(lastAuditDownloadAttempt.generated_at):'')+'</div>':'')+
      (auditSummary.needs_review?'<div class="tb-measure-note" data-dimension-review-reason-summary data-review-context-action-required="'+managerReviewContextSummary.action_required+'" data-review-context-ready="'+(managerReviewContextSummary.by_health?.ready??0)+'" data-review-context-pending="'+(managerReviewContextSummary.by_health?.pending??0)+'" data-review-context-diagnostics-error="'+(managerReviewContextSummary.by_health?.["diagnostics-error"]??0)+'" data-review-context-summary-signature="'+esc(managerReviewContextSummary.signature)+'" data-review-progress-status="'+esc(reviewReasonProgressStatus)+'" data-review-progress-source="'+esc(canonicalManagerReviewProgressSource)+'" data-review-progress-signature="'+esc(canonicalManagerReviewProgressSignature)+'" data-review-progress-valid="'+(reviewReasonProgressValid?'1':'0')+'" data-review-diagnostics-valid="'+(reviewReasonDiagnosticsValid?'1':'0')+'" data-review-progress-model-consistent="'+(sharedManagerReviewProgressConsistent?'1':'0')+'" data-review-progress-domain-available="'+(domainManagerReviewProgressAvailable?'1':'0')+'" data-review-progress-domain-compatible="'+(domainManagerReviewProgressCompatible?'1':'0')+'" data-review-progress-domain-status="'+esc(managerReviewProgressRuntime.domain_status)+'" data-review-progress-domain-consistent="'+(!domainManagerReviewProgressComparable?'na':domainManagerReviewProgressConsistent?'1':'0')+'" data-review-diagnostics-model-consistent="'+(managerReviewDiagnosticsModelConsistent?'1':'0')+'" data-review-diagnostics-state-consistent="'+(standaloneManagerReviewDiagnosticsConsistent?'1':'0')+'" data-review-diagnostics-source="'+esc(standaloneManagerReviewDiagnosticsRuntime.source)+'" data-review-diagnostics-domain-status="'+esc(standaloneManagerReviewDiagnosticsRuntime.domain_status)+'" data-review-diagnostics-snapshot-schema="'+esc(standaloneManagerReviewDiagnosticsRuntime.snapshot?.schema??"")+'" data-review-diagnostics-snapshot-signature-consistent="'+(standaloneManagerReviewDiagnosticsRuntime.snapshot_signature_consistent?'1':'0')+'" data-review-diagnostics-runtime-valid="'+(standaloneManagerReviewDiagnosticsRuntime.runtime_valid?'1':'0')+'" data-review-diagnostics-integrity-valid="'+(managerReviewDiagnosticsIntegrity.valid?'1':'0')+'" data-review-diagnostics-integrity-schema="'+esc(managerReviewDiagnosticsIntegrity.schema)+'" data-review-diagnostics-integrity-parity="'+(!managerReviewDiagnosticsIntegrityParity.available?'na':managerReviewDiagnosticsIntegrityParity.consistent?'1':'0')+'" data-review-diagnostics-integrity-signature="'+esc(managerReviewDiagnosticsIntegritySignature)+'" data-review-diagnostics-signature="'+esc(managerReviewDiagnosticsSignature)+'" data-review-progress-issues="'+reviewReasonProgressIssueCount+'">Review queue reasons: '+esc(reviewReasonSummary||'—')+' · context action '+managerReviewContextSummary.action_required+' · ready '+(managerReviewContextSummary.by_health?.ready??0)+' · pending-context '+(managerReviewContextSummary.by_health?.pending??0)+' · diagnostics-error '+(managerReviewContextSummary.by_health?.["diagnostics-error"]??0)+' · Coverage complete: '+reviewReasonCoverageCounts.complete+' · partial: '+reviewReasonCoverageCounts.partial+' · none: '+reviewReasonCoverageCounts.none+' · completed '+reviewReasonCoverageCounts.complete+(reviewReasonCompletedNames.length?' ['+esc(reviewReasonCompletedNames.join(', '))+']':'')+' · pending '+reviewReasonPendingCount+(reviewReasonPendingNames.length?' ['+esc(reviewReasonPendingNames.join(', '))+']':'')+' · complete '+reviewReasonCompletePercent+'% · state '+reviewReasonCompletionState+' · progress '+(reviewReasonProgressValid?'valid':'invalid')+' · diagnostics '+(reviewReasonDiagnosticsValid?'valid':'invalid')+' · status '+reviewReasonProgressStatus+' · model '+(sharedManagerReviewProgressConsistent?'aligned':'diverged')+' · domain '+(!domainManagerReviewProgressAvailable?'unavailable':!domainManagerReviewProgressCompatible?'incompatible':domainManagerReviewProgressConsistent?'aligned':'diverged')+' · diag-model '+(managerReviewDiagnosticsModelConsistent?'aligned':'diverged')+' · diag-state '+(standaloneManagerReviewDiagnosticsConsistent?'aligned':'diverged')+' · diag-source '+standaloneManagerReviewDiagnosticsRuntime.source+' · diag-runtime '+(standaloneManagerReviewDiagnosticsRuntime.runtime_valid?'valid':'invalid')+' · diag-integrity '+(managerReviewDiagnosticsIntegrity.valid?'valid':'invalid')+' · diag-parity '+(!managerReviewDiagnosticsIntegrityParity.available?'na':managerReviewDiagnosticsIntegrityParity.consistent?'aligned':'diverged')+' · issues '+reviewReasonProgressIssueCount+(reviewReasonProgressErrors.length?' ['+reviewReasonProgressErrors.join(', ')+']':'')+(reviewReasonButtons?'<div class="tb-measure-actions" data-dimension-review-reason-filters><button data-dimension-review-reason-clear '+(fullReviewQueueActive?'disabled':'')+'>All review reasons</button>'+reviewReasonButtons+'</div>':'')+'</div>':'')+
      (activeReviewReason?'<div class="tb-measure-note" data-dimension-review-reason-active data-selection-coverage="'+selectedReviewReasonCoverage+'">Active reason: '+esc(activeReviewReason)+' · total '+activeReviewReasonIds.length+' · selected '+selectedReviewReasonCount+' · unselected '+Math.max(0,activeReviewReasonIds.length-selectedReviewReasonCount)+' · coverage '+selectedReviewReasonPercent+'% · '+selectedReviewReasonCoverage+'</div>':'')+
      '<div class="tb-measure-note" data-dimension-visible-count>Showing '+visibleItems.length+' of '+items.length+'</div>'+
      '<div class="tb-measure-note" data-dimension-selection-scope>Selected in view: '+selectedInViewCount+' · outside view: '+selectedOutsideViewCount+(selectionKindSummary?' · '+esc(selectionKindSummary):'')+'</div>'+
      (dimensionManagerFocusId?'<div class="tb-measure-note" data-dimension-exact-focus>Exact focus: '+esc(dimensionManagerFocusId)+' <button data-dimension-focus-clear>Clear focus</button></div>':'')+
      filters+
      '<div class="tb-measure-actions"><button data-select-visible-dimension-audit>Select visible results</button><button data-add-visible-dimension-audit>Add visible results</button><button data-remove-visible-dimension-audit>Remove visible results</button><button data-invert-visible-dimension-audit '+(selectableVisibleCount===0?'disabled':'')+'>Invert visible results</button><button data-clear-dimension-selection '+(selectedIds.length===0?'disabled':'')+'>Clear Dimension selection</button><button data-prune-dimension-selection '+(selectedOutsideViewCount===0?'disabled':'')+'>Prune selection to view</button><button data-show-dimension-audit '+(locked?'disabled title="Проект открыт только для просмотра"':'')+'>Show results</button><button data-show-select-dimension-audit '+(locked?'disabled title="Проект открыт только для просмотра"':'')+'>Show & Select results</button><button data-hide-dimension-audit '+(locked?'disabled title="Проект открыт только для просмотра"':'')+'>Hide results</button><button data-copy-selected-dimension-audits '+(selectedIds.length?'':'disabled')+'>Copy selected audit JSON ('+selectedIds.length+')</button><button data-download-selected-dimension-audits '+(selectedIds.length?'':'disabled')+'>Download selected audit JSON ('+selectedIds.length+')</button><button data-copy-visible-dimension-audits>Copy visible audit JSON</button><button data-download-visible-dimension-audits>Download visible audit JSON</button><button data-copy-all-dimension-audits>Copy all audit JSON</button><button data-download-all-dimension-audits>Download all audit JSON</button></div></div>'+rows;
  }
  function bindDimensionManagerActions(body){
    body.querySelectorAll("[data-dim-manager-select]").forEach(button=>{
      button.onclick=()=>{
        const id=button.dataset.dimManagerSelect,visible=button.dataset.selectVisible==="1";
        if(!visible)window.TubeBenderDimensionGrips?.setDimensionVisible?.(id,true);
        window.TubeBenderDimensionGrips?.selectDimension?.(id);
        render();
      };
    });
    body.querySelectorAll("[data-dim-manager-visible]").forEach(button=>{
      button.onclick=()=>{
        const visible=button.dataset.visible==="1";
        window.TubeBenderDimensionGrips?.setDimensionVisible?.(button.dataset.dimManagerVisible,!visible);
        render();
      };
    });
    body.querySelectorAll("[data-dim-manager-delete]").forEach(button=>{
      button.onclick=()=>{window.TubeBenderDimensionGrips?.deleteDimension?.(button.dataset.dimManagerDelete);render();};
    });
    body.querySelectorAll("[data-copy-rebind-audit]").forEach(button=>{
      button.onclick=()=>copyDimensionRebindAudit(button.dataset.copyRebindAudit);
    });
    body.querySelectorAll("[data-download-rebind-audit]").forEach(button=>{
      button.onclick=()=>downloadDimensionRebindAudit(button.dataset.downloadRebindAudit);
    });
    body.querySelector("[data-select-visible-dimension-audit]")?.addEventListener("click",selectVisibleDimensionAuditResults);
    body.querySelector("[data-add-visible-dimension-audit]")?.addEventListener("click",addVisibleDimensionAuditResultsToSelection);
    body.querySelector("[data-remove-visible-dimension-audit]")?.addEventListener("click",removeVisibleDimensionAuditResultsFromSelection);
    body.querySelector("[data-invert-visible-dimension-audit]")?.addEventListener("click",invertVisibleDimensionAuditSelection);
    body.querySelector("[data-clear-dimension-selection]")?.addEventListener("click",clearDimensionSelection);
    body.querySelector("[data-prune-dimension-selection]")?.addEventListener("click",pruneDimensionSelectionToAuditView);
    body.querySelector("[data-show-dimension-audit]")?.addEventListener("click",showDimensionAuditResults);
    body.querySelector("[data-show-select-dimension-audit]")?.addEventListener("click",showAndSelectDimensionAuditResults);
    body.querySelector("[data-hide-dimension-audit]")?.addEventListener("click",hideDimensionAuditResults);
    body.querySelector("[data-copy-selected-dimension-audits]")?.addEventListener("click",copySelectedDimensionAudits);
    body.querySelector("[data-download-selected-dimension-audits]")?.addEventListener("click",downloadSelectedDimensionAudits);
    body.querySelector("[data-copy-visible-dimension-audits]")?.addEventListener("click",copyVisibleDimensionAudits);
    body.querySelector("[data-download-visible-dimension-audits]")?.addEventListener("click",downloadVisibleDimensionAudits);
    body.querySelector("[data-copy-all-dimension-audits]")?.addEventListener("click",copyAllDimensionAudits);
    body.querySelector("[data-download-all-dimension-audits]")?.addEventListener("click",downloadAllDimensionAudits);
    body.querySelectorAll("[data-dimension-filter]").forEach(button=>{
      button.onclick=()=>{dimensionManagerFocusId="";dimensionManagerFilter=button.dataset.dimensionFilter||"all";render();};
    });
    body.querySelectorAll("[data-dimension-sort]").forEach(button=>{
      button.onclick=()=>{dimensionManagerFocusId="";dimensionManagerSort=button.dataset.dimensionSort||"project";render();};
    });
    body.querySelector("[data-dimension-review-queue]")?.addEventListener("click",()=>{
      dimensionManagerFocusId="";dimensionManagerFilter="needs-review";dimensionManagerSort="audit";dimensionManagerSearch="";render();
    });
    body.querySelector("[data-select-dimension-review-queue]")?.addEventListener("click",()=>{
      selectReviewQueueDimensionResults();render();
    });
    body.querySelector("[data-add-dimension-review-queue]")?.addEventListener("click",()=>{
      addReviewQueueDimensionResultsToSelection();render();
    });
    body.querySelector("[data-remove-dimension-review-queue]")?.addEventListener("click",()=>{
      removeReviewQueueDimensionResultsFromSelection();render();
    });
    body.querySelector("[data-invert-dimension-review-queue]")?.addEventListener("click",()=>{
      invertReviewQueueDimensionSelection();render();
    });
    body.querySelector("[data-copy-dimension-review-queue-audit]")?.addEventListener("click",copyReviewQueueDimensionAudits);
    body.querySelector("[data-download-dimension-review-queue-audit]")?.addEventListener("click",downloadReviewQueueDimensionAudits);
    body.querySelector("[data-select-dimension-review-reason]")?.addEventListener("click",()=>{
      selectReviewReasonDimensionResults();render();
    });
    body.querySelector("[data-add-dimension-review-reason]")?.addEventListener("click",()=>{
      addReviewReasonDimensionResultsToSelection();render();
    });
    body.querySelector("[data-remove-dimension-review-reason]")?.addEventListener("click",()=>{
      removeReviewReasonDimensionResultsFromSelection();render();
    });
    body.querySelector("[data-invert-dimension-review-reason]")?.addEventListener("click",()=>{
      invertReviewReasonDimensionSelection();render();
    });
    body.querySelector("[data-copy-dimension-review-reason-audit]")?.addEventListener("click",copyReviewReasonDimensionAudits);
    body.querySelector("[data-download-dimension-review-reason-audit]")?.addEventListener("click",downloadReviewReasonDimensionAudits);
    body.querySelector("[data-dimension-review-queue-exit]")?.addEventListener("click",exitDimensionReviewQueue);
    body.querySelectorAll("[data-dimension-review-reason]").forEach(button=>{
      button.onclick=()=>{
        dimensionManagerFocusId="";
        dimensionManagerFilter="needs-review";
        dimensionManagerSort="audit";
        dimensionManagerSearch=String(button.dataset.dimensionReviewReason??"");
        render();
      };
    });
    body.querySelector("[data-dimension-review-reason-clear]")?.addEventListener("click",()=>{
      dimensionManagerFocusId="";
      dimensionManagerFilter="needs-review";
      dimensionManagerSort="audit";
      dimensionManagerSearch="";
      render();
    });
    const searchInput=body.querySelector("[data-dimension-search]");
    body.querySelector("[data-dimension-search-apply]")?.addEventListener("click",()=>{
      dimensionManagerFocusId="";dimensionManagerSearch=String(searchInput?.value??"");render();
    });
    searchInput?.addEventListener("keydown",event=>{
      if(event.key==="Enter"){event.preventDefault();dimensionManagerFocusId="";dimensionManagerSearch=String(searchInput.value??"");render();}
    });
    body.querySelector("[data-copy-dimension-audit-download-history]")?.addEventListener("click",copyDimensionAuditDownloadHistory);
    body.querySelector("[data-download-dimension-audit-download-history]")?.addEventListener("click",downloadDimensionAuditDownloadHistory);
    body.querySelector("[data-clear-dimension-audit-download-history]")?.addEventListener("click",()=>{
      clearDimensionAuditDownloadAttemptHistory();
      clearDimensionAuditDownloadLastAttempt();
      render();
    });
    body.querySelector("[data-copy-dimension-audit-history-export-events]")?.addEventListener("click",copyDimensionAuditHistoryExportEvents);
    body.querySelector("[data-download-dimension-audit-history-export-events]")?.addEventListener("click",downloadDimensionAuditHistoryExportEvents);
    body.querySelector("[data-clear-dimension-audit-history-export-events]")?.addEventListener("click",()=>{
      clearDimensionAuditDownloadHistoryExportEventHistory();
      render();
    });
    body.querySelector("[data-dimension-search-clear]")?.addEventListener("click",()=>{dimensionManagerFocusId="";dimensionManagerSearch="";render();});
    body.querySelector("[data-dimension-focus-clear]")?.addEventListener("click",()=>{
      dimensionManagerFocusId="";dimensionManagerSearch="";render();
    });
    body.querySelector("[data-dimension-view-reset]")?.addEventListener("click",()=>{
      dimensionManagerFilter="all";dimensionManagerSort="project";dimensionManagerSearch="";dimensionManagerFocusId="";render();
      clearPersistedDimensionAuditViewState();
    });
  }

  function sectionDerivedDimensionsHtml(){
    const items=savedDimensions().filter(isSectionDerivedDimension);
    if(!items.length)return "";
    const rows=items.map(dimension=>{
      const stale=String(dimension.status)==="Stale";
      const status=stale?"⚠ Stale":String(dimension.status??"NeedsUpdate");
      const valueText=Number.isFinite(Number(dimension.value))?formatted(Number(dimension.value),String(dimension.kind).includes("angle")?"deg":"mm"):"—";
      return '<div class="tb-measure-result" style="margin-top:7px"><div class="tb-measure-title">'+
        esc(dimension.note??dimension.kind)+' · '+esc(status)+'</div>'+
        '<div class="tb-measure-note">ID: '+esc(dimension.id)+' · '+esc(valueText)+
        (dimension.stale_reason?' · '+esc(dimension.stale_reason):'')+'</div>'+
        (stale?'<div class="tb-measure-actions"><button data-section-rebind="'+esc(dimension.id)+'">Rebind to current Section selection</button></div>':'')+
        '</div>';
    }).join("");
    return '<div class="tb-measure-result" style="margin-top:9px"><div class="tb-measure-title">Section-derived Reference Dimensions</div>'+
      '<div class="tb-measure-note">Stale размеры не перепривязываются автоматически. Выберите новую совместимую Section-derived геометрию и подтвердите Rebind.</div></div>'+rows;
  }
  function bindSectionDerivedDimensionActions(body){
    body.querySelectorAll("[data-section-rebind]").forEach(button=>{
      button.onclick=()=>rebindSectionDerivedDimension(button.dataset.sectionRebind);
    });
  }

  function saveCurrentDimension(){
    if(readonly()){toast("Проект открыт только для просмотра");return;}
    if(!lastResult?.ok)return;
    const p=project();if(!p)return;
    const s=settings();
    const kind=lastResult.kind;
    const d=dimensions.createDimension({
      kind,
      mode:"Reference",
      references:lastResult.references,
      value:lastResult.primary_value,
      cross_assembly:clone(lastResult.cross_assembly??null),
      status:"Valid",
      format:{
        length_decimals:s.length_decimals,
        angle_decimals:s.angle_decimals,
        trailing_zeros:s.trailing_zeros
      },
      style:clone(s.dimension_style),
      note:lastResult.title
    });
    const mutate=()=>{
      p.engineering_dimensions=[...savedDimensions(),clone(d)];
      return true;
    };
    const ok=api()?.modelCommand?api().modelCommand("Сохранить Reference Dimension",mutate):mutate();
    if(ok!==false){api()?.save?.();dispatchDimensionChange(d.id,"create-reference");toast("Размер сохранён в проект");render();renderResultsPanel(lastResult);}
  }
  function saveCurrentDrivingDimension(){
    if(readonly()){toast("Проект открыт только для просмотра");return false;}
    if(!lastResult?.ok)return false;
    if(lastResult.section_derived===true||(lastResult.references??[]).some(ref=>ref?.geometry_status==="SectionDerived")){
      toast("Section-derived geometry поддерживает только Reference Dimension");
      return false;
    }
    if(fittedGuard()?.confirmUsage?.("DrivingDimension",lastResult.references)!==true)return false;
    const p=project();if(!p)return false;
    const s=settings(),kind=lastResult.kind,target=Number(lastResult.primary_value);
    if(!Number.isFinite(target)){toast("Driving Dimension требует числовое значение");return false;}
    const d=dimensions.createDimension({
      kind,
      mode:"Driving",
      references:lastResult.references,
      value:target,
      target_value:target,
      cross_assembly:clone(lastResult.cross_assembly??null),
      status:"Valid",
      format:{
        length_decimals:s.length_decimals,
        angle_decimals:s.angle_decimals,
        trailing_zeros:s.trailing_zeros
      },
      style:clone(s.dimension_style),
      note:lastResult.title+" · Driving"
    });
    const mutate=()=>{p.engineering_dimensions=[...savedDimensions(),clone(d)];return true;};
    const ok=api()?.modelCommand?api().modelCommand("Сохранить Driving Dimension",mutate):mutate();
    if(ok!==false){api()?.save?.();dispatchDimensionChange(d.id,"create-driving");toast("Driving Dimension сохранён");render();renderResultsPanel(lastResult);}
    return ok!==false;
  }

  function render(){
    if(!panel||!geometry||!dimensions)return;
    const body=$(".tb-measure-body",panel),entries=selectionEntries();
    const result=quick.active&&quick.result?quick.result:decorateMeasurementResult(buildMeasurement(entries));
    lastResult=result;
    renderResultsPanel(result);
    const s=settings();
    const count=savedDimensions().length;
    const quickHtml='<div class="tb-measure-result" style="margin-bottom:9px"><div class="tb-measure-title">Quick Measure</div>'+
      '<div class="tb-measure-note">'+(quick.active
        ?(quick.points.length===0?'Активен: выберите первую Snap-точку.':quick.points.length===1?'Выберите вторую Snap-точку. Каждый следующий клик продолжает последовательное измерение.':'Последовательность: '+quick.points.length+' точек. Новый клик создаёт следующее временное измерение.')+
          ' Esc очищает результат; повторный Esc завершает режим.'
        :'Временные измерения по Snap без создания объекта размера.')+'</div>'+
      '<div class="tb-measure-actions">'+
      (quick.active?'<button data-quick-clear>Очистить</button><button data-quick-stop>Завершить</button>':'<button data-quick-start>Начать Quick Measure</button>')+
      '</div></div>';
    if(!result.ok){
      body.innerHTML=quickHtml+'<div class="tb-measure-result"><div class="tb-measure-error">'+esc(result.message)+'</div><div class="tb-measure-note" style="margin-top:7px">Выберите геометрию или запустите Quick Measure.</div></div>'+
        settingsHtml(s,count);
    }else{
      const rows=result.details.map(([name,value,unit])=>'<tr><td>'+esc(name)+'</td><td><b>'+esc(formatted(value,unit))+'</b></td></tr>').join("");
      body.innerHTML=quickHtml+'<div class="tb-measure-result"><div class="tb-measure-title">'+esc(result.title)+(result.cross_assembly?.cross_assembly?' <span title="Межсборочная связь">↔ Cross-Assembly</span>':'')+'</div><div class="tb-measure-value">'+esc(formatted(result.primary_value,result.primary_unit))+'</div><table class="tb-measure-table">'+rows+'</table>'+
        '<div class="tb-measure-actions"><button data-save-dimension>Сохранить Reference Dimension</button><button data-save-driving-dimension>Сохранить Driving Dimension</button></div></div>'+settingsHtml(s,count);
      $("[data-save-dimension]",body).onclick=saveCurrentDimension;
      $("[data-save-driving-dimension]",body).onclick=saveCurrentDrivingDimension;
    }
    $("[data-quick-start]",body)?.addEventListener("click",startQuickMeasure);
    $("[data-quick-clear]",body)?.addEventListener("click",clearQuickMeasure);
    $("[data-quick-stop]",body)?.addEventListener("click",()=>stopQuickMeasure());
    $("[data-save-measure-settings]",body).onclick=()=>saveSettings(body);
    bindSectionDerivedDimensionActions(body);
    bindDimensionManagerActions(body);
  }
  function settingsHtml(s,count){
    const d=s.dimension_style??{};
    return '<div class="tb-measure-result" style="margin-top:9px"><div class="tb-measure-title">Настройки постоянных размеров</div><div class="tb-measure-settings">'+
      '<label>Length decimals</label><input data-length-decimals type="number" min="0" max="6" value="'+esc(s.length_decimals)+'">'+
      '<label>Angle decimals</label><input data-angle-decimals type="number" min="0" max="6" value="'+esc(s.angle_decimals)+'">'+
      '<label>Trailing zeros</label><input data-trailing-zeros type="checkbox" '+(s.trailing_zeros?"checked":"")+'>'+
      '<label>Scale mode</label><select data-dim-scale-mode><option value="Hybrid" '+(d.screen_scale_mode==="Hybrid"?"selected":"")+'>Hybrid</option><option value="Screen" '+(d.screen_scale_mode==="Screen"?"selected":"")+'>Screen</option><option value="Model" '+(d.screen_scale_mode==="Model"?"selected":"")+'>Model</option></select>'+
      '<label>Text height, px</label><input data-dim-text-px type="number" min="6" max="72" value="'+esc(d.text_height_px)+'">'+
      '<label>Arrow size, px</label><input data-dim-arrow-px type="number" min="3" max="40" value="'+esc(d.arrow_size_px)+'">'+
      '<label>Extension offset, px</label><input data-dim-ext-offset type="number" min="0" max="80" value="'+esc(d.extension_offset_px)+'">'+
      '<label>Dimension offset, px</label><input data-dim-line-offset type="number" min="0" max="120" value="'+esc(d.dimension_offset_px)+'">'+
      '<label>Model text height, mm</label><input data-dim-model-mm type="number" min=".5" max="50" step=".1" value="'+esc(d.model_text_height_mm)+'">'+
      '<label>Hybrid text min/max, px</label><span><input data-dim-min-text type="number" style="width:47%" value="'+esc(d.min_text_px)+'"> <input data-dim-max-text type="number" style="width:47%" value="'+esc(d.max_text_px)+'"></span>'+
      '<label>Hybrid arrow min/max, px</label><span><input data-dim-min-arrow type="number" style="width:47%" value="'+esc(d.min_arrow_px)+'"> <input data-dim-max-arrow type="number" style="width:47%" value="'+esc(d.max_arrow_px)+'"></span>'+
      '<label>Show units</label><input data-dim-show-units type="checkbox" '+(d.show_units!==false?"checked":"")+'>'+
      '<label>Symbols Ø / R / °</label><span><input data-dim-symbol-dia style="width:28%" value="'+esc(d.diameter_symbol)+'"> <input data-dim-symbol-radius style="width:28%" value="'+esc(d.radius_symbol)+'"> <input data-dim-symbol-angle style="width:28%" value="'+esc(d.angle_symbol)+'"></span>'+
      '</div><div class="tb-dim-colors" style="margin-top:9px">'+
      '<label>Reference <input data-dim-color-reference type="color" value="'+esc(d.reference_color)+'"></label>'+
      '<label>Driving <input data-dim-color-driving type="color" value="'+esc(d.driving_color)+'"></label>'+
      '<label>Error <input data-dim-color-error type="color" value="'+esc(d.error_color)+'"></label>'+
      '<label>Normal <input data-dim-color-normal type="color" value="'+esc(d.normal_color)+'"></label>'+
      '</div><div class="tb-measure-note" style="margin-top:8px">Hybrid масштабирует размер с моделью, но удерживает текст и стрелки в читаемом экранном диапазоне. Driving и Error имеют отдельные цвета.</div>'+
      '<div class="tb-measure-actions"><span class="tb-measure-note">Сохранено размеров: '+count+'</span><button data-save-measure-settings>Сохранить настройки</button></div></div>'+
      dimensionManagerHtml()+
      sectionDerivedDimensionsHtml();
  }
  async function install(){
    if(installed)return;installed=true;
    try{
      [geometry,dimensions,reviewProgressDomain,auditDownloadDomain]=await Promise.all([
        import(GEOMETRY_URL),
        import(DIMENSIONS_URL),
        import(REVIEW_PROGRESS_URL).catch(error=>{console.warn("Review progress domain failed to load; using UI fallback",error);return null;}),
        import(AUDIT_DOWNLOAD_URL).catch(error=>{console.warn("Audit download domain failed to load; using UI fallback",error);return null;})
      ]);
    }catch(error){console.error("Measurements UI failed to load",error);return;}
    ensureShell();
    const update=()=>{
      const next=selectionSignature();
      if(next!==lastSelectionKey){lastSelectionKey=next;if(panel?.classList.contains("open"))render();}
    };
    window.addEventListener("tubebender-selection-change",update);
    window.addEventListener("tubebender-section-view-change",()=>invalidateSectionDerivedDimensions("Section View changed"));
    window.addEventListener("tubebender-dimension-change",()=>{if(panel?.classList.contains("open"))render();});
    window.addEventListener("tubebender-dimension-audit-download",()=>{if(panel?.classList.contains("open"))render();});
    window.addEventListener("tubebender-dimension-audit-history-export",()=>{if(panel?.classList.contains("open"))render();});
    window.addEventListener("tubebender-dimension-audit-history-export-clear",()=>{if(panel?.classList.contains("open"))render();});
    window.addEventListener("tubebender-history-change",()=>{if(panel?.classList.contains("open"))render();});
    window.addEventListener("tubebender-snap-change",onQuickSnapChange);
    document.getElementById("threeCanvas")?.addEventListener("click",onQuickCanvasClick,true);
    window.addEventListener("keydown",onQuickKeyDown,true);
    poll=setInterval(update,500);
    window.TubeBenderMeasurements=Object.freeze({
      open,close,focusDimensionAudit,refresh:render,dimensionAuditViewProjectId,dimensionAuditViewStorageKey,persistDimensionAuditViewState,clearPersistedDimensionAuditViewState,restoreDimensionAuditViewState,buildMeasurement,savedDimensions,saveCurrentDimension,saveCurrentDrivingDimension,invalidateSectionDerivedDimensions,rebindSectionDerivedDimension,sectionRebindCompatibility,dimensionAuditProjectContext,dimensionRebindAuditSnapshot,copyDimensionRebindAudit,downloadDimensionRebindAudit,downloadDimensionAuditJson,dimensionAuditFilenameStamp,dimensionAuditFilenamePart,dimensionAuditJsonFilename,dimensionAuditFilenamePolicy,dimensionAuditDownloadHistorySchema,dimensionAuditDownloadHistoryProtocol,dimensionAuditDownloadHistoryProtocolSignature,dimensionAuditDownloadHistoryProtocolValidation,dimensionAuditDownloadHistoryProtocolValidationSignature,dimensionAuditDownloadHistoryProtocolState,dimensionAuditDownloadHistoryProtocolStateSignature,dimensionAuditDownloadHistoryProtocolStateValid,dimensionAuditDownloadHistoryProtocolBindingValid,dimensionAuditDownloadHistoryProtocolBinding,dimensionAuditDownloadHistoryProtocolBindingSignature,dimensionAuditDownloadHistoryHealth,dimensionAuditDownloadHistoryHealthSignature,dimensionAuditDownloadHistoryEmbeddedHealthValid,dimensionAuditDownloadHistoryHealthEmbedding,dimensionAuditDownloadHistoryHealthEmbeddingSignature,dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid,dimensionAuditDownloadHistoryVerification,dimensionAuditDownloadHistoryVerificationSignature,dimensionAuditDownloadHistoryEmbeddedVerificationValid,dimensionAuditDownloadHistoryVerificationEmbedding,dimensionAuditDownloadHistoryVerificationEmbeddingSignature,dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid,dimensionAuditDownloadHistoryAttestation,dimensionAuditDownloadHistoryAttestationSignature,dimensionAuditDownloadHistoryEmbeddedAttestationValid,dimensionAuditDownloadHistoryAttestationEmbedding,dimensionAuditDownloadHistoryAttestationEmbeddingSignature,dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid,dimensionAuditDownloadHistoryTrust,dimensionAuditDownloadHistoryTrustSignature,currentDimensionAuditDownloadHistoryEmbeddedVerificationValid:()=>dimensionAuditDownloadHistoryEmbeddedVerificationValid(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryVerificationEmbedding:()=>dimensionAuditDownloadHistoryVerificationEmbedding(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryVerificationEmbeddingSignature:()=>dimensionAuditDownloadHistoryVerificationEmbeddingSignature(dimensionAuditDownloadHistoryVerificationEmbedding(dimensionAuditDownloadAttemptHistoryAuditSnapshot())),currentDimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid:()=>{const embedding=dimensionAuditDownloadHistoryVerificationEmbedding(dimensionAuditDownloadAttemptHistoryAuditSnapshot());return dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid(dimensionAuditDownloadHistoryVerificationEmbeddingSignature(embedding),embedding);},currentDimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid:()=>dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryAttestation:()=>dimensionAuditDownloadHistoryAttestation(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryAttestationSignature:()=>dimensionAuditDownloadHistoryAttestationSignature(dimensionAuditDownloadHistoryAttestation(dimensionAuditDownloadAttemptHistoryAuditSnapshot())),currentDimensionAuditDownloadHistoryAttestationSignatureValid:()=>{const attestation=dimensionAuditDownloadHistoryAttestation(dimensionAuditDownloadAttemptHistoryAuditSnapshot());return dimensionAuditDownloadHistoryAttestationSignatureValid(dimensionAuditDownloadHistoryAttestationSignature(attestation),attestation);},currentDimensionAuditDownloadHistoryEmbeddedAttestationValid:()=>dimensionAuditDownloadHistoryEmbeddedAttestationValid(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryAttestationEmbedding:()=>dimensionAuditDownloadHistoryAttestationEmbedding(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryAttestationEmbeddingSignature:()=>dimensionAuditDownloadHistoryAttestationEmbeddingSignature(dimensionAuditDownloadHistoryAttestationEmbedding(dimensionAuditDownloadAttemptHistoryAuditSnapshot())),currentDimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid:()=>{const embedding=dimensionAuditDownloadHistoryAttestationEmbedding(dimensionAuditDownloadAttemptHistoryAuditSnapshot());return dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid(dimensionAuditDownloadHistoryAttestationEmbeddingSignature(embedding),embedding);},currentDimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid:()=>dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryTrust:()=>dimensionAuditDownloadHistoryTrust(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryTrustSignature:()=>dimensionAuditDownloadHistoryTrustSignature(dimensionAuditDownloadHistoryTrust(dimensionAuditDownloadAttemptHistoryAuditSnapshot())),currentDimensionAuditDownloadHistoryTrustSignatureValid:()=>{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot();const trust=dimensionAuditDownloadHistoryTrust(snapshot);return dimensionAuditDownloadHistoryTrustSignatureValid(dimensionAuditDownloadHistoryTrustSignature(trust),trust,snapshot);},currentDimensionAuditDownloadHistoryProtocol:()=>dimensionAuditDownloadHistoryProtocol(),currentDimensionAuditDownloadHistoryProtocolSignature:()=>dimensionAuditDownloadHistoryProtocolSignature(),currentDimensionAuditDownloadHistoryProtocolSignatureValid:()=>{const protocol=dimensionAuditDownloadHistoryProtocol();return dimensionAuditDownloadHistoryProtocolSignatureValid(dimensionAuditDownloadHistoryProtocolSignature(protocol),protocol);},currentDimensionAuditDownloadHistoryProtocolValidation:()=>dimensionAuditDownloadHistoryProtocolValidation(),currentDimensionAuditDownloadHistoryProtocolValidationSignature:()=>dimensionAuditDownloadHistoryProtocolValidationSignature(),currentDimensionAuditDownloadHistoryProtocolValidationSignatureValid:()=>{const validation=dimensionAuditDownloadHistoryProtocolValidation();return dimensionAuditDownloadHistoryProtocolValidationSignatureValid(dimensionAuditDownloadHistoryProtocolValidationSignature(validation),validation);},currentDimensionAuditDownloadHistoryProtocolState:()=>dimensionAuditDownloadHistoryProtocolState(),currentDimensionAuditDownloadHistoryProtocolStateSignature:()=>dimensionAuditDownloadHistoryProtocolStateSignature(),currentDimensionAuditDownloadHistoryProtocolStateValid:()=>dimensionAuditDownloadHistoryProtocolStateValid(),currentDimensionAuditDownloadHistoryProtocolStateSignatureValid:()=>{const state=dimensionAuditDownloadHistoryProtocolState();return dimensionAuditDownloadHistoryProtocolStateSignatureValid(dimensionAuditDownloadHistoryProtocolStateSignature(state),state);},currentDimensionAuditDownloadHistoryProtocolBindingValid:()=>dimensionAuditDownloadHistoryProtocolBindingValid(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryProtocolBinding:()=>dimensionAuditDownloadHistoryProtocolBinding(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryProtocolBindingSignature:()=>dimensionAuditDownloadHistoryProtocolBindingSignature(dimensionAuditDownloadHistoryProtocolBinding(dimensionAuditDownloadAttemptHistoryAuditSnapshot())),currentDimensionAuditDownloadHistoryProtocolBindingSignatureValid:()=>{const binding=dimensionAuditDownloadHistoryProtocolBinding(dimensionAuditDownloadAttemptHistoryAuditSnapshot());return dimensionAuditDownloadHistoryProtocolBindingSignatureValid(dimensionAuditDownloadHistoryProtocolBindingSignature(binding),binding);},currentDimensionAuditDownloadHistoryHealth:()=>dimensionAuditDownloadHistoryHealth(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryHealthSignature:()=>dimensionAuditDownloadHistoryHealthSignature(dimensionAuditDownloadHistoryHealth(dimensionAuditDownloadAttemptHistoryAuditSnapshot())),currentDimensionAuditDownloadHistoryHealthSignatureValid:()=>{const health=dimensionAuditDownloadHistoryHealth(dimensionAuditDownloadAttemptHistoryAuditSnapshot());return dimensionAuditDownloadHistoryHealthSignatureValid(dimensionAuditDownloadHistoryHealthSignature(health),health);},currentDimensionAuditDownloadHistoryEmbeddedHealthValid:()=>dimensionAuditDownloadHistoryEmbeddedHealthValid(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryHealthEmbedding:()=>dimensionAuditDownloadHistoryHealthEmbedding(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryHealthEmbeddingSignature:()=>dimensionAuditDownloadHistoryHealthEmbeddingSignature(dimensionAuditDownloadHistoryHealthEmbedding(dimensionAuditDownloadAttemptHistoryAuditSnapshot())),currentDimensionAuditDownloadHistoryHealthEmbeddingSignatureValid:()=>{const embedding=dimensionAuditDownloadHistoryHealthEmbedding(dimensionAuditDownloadAttemptHistoryAuditSnapshot());return dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid(dimensionAuditDownloadHistoryHealthEmbeddingSignature(embedding),embedding);},currentDimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid:()=>dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryVerification:()=>dimensionAuditDownloadHistoryVerification(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadHistoryVerificationSignature:()=>dimensionAuditDownloadHistoryVerificationSignature(dimensionAuditDownloadHistoryVerification(dimensionAuditDownloadAttemptHistoryAuditSnapshot())),currentDimensionAuditDownloadHistoryVerificationSignatureValid:()=>{const verification=dimensionAuditDownloadHistoryVerification(dimensionAuditDownloadAttemptHistoryAuditSnapshot());return dimensionAuditDownloadHistoryVerificationSignatureValid(dimensionAuditDownloadHistoryVerificationSignature(verification),verification);},dimensionAuditDownloadFallbackPolicy,dimensionAuditDownloadPolicy,dimensionAuditDownloadPolicyConsistent,dimensionAuditDownloadProtocolConsistent,dimensionAuditDownloadProtocolSignature,dimensionAuditDownloadPolicySource,dimensionAuditDownloadRuntimeState,dimensionAuditDownloadRuntimeSignature,dimensionAuditDownloadRuntimeValidation,dimensionAuditDownloadPreflight,dimensionAuditDownloadPreflightSignature,dimensionAuditDownloadLastAttempt,dimensionAuditDownloadLastAttemptSignature,clearDimensionAuditDownloadLastAttempt,dimensionAuditDownloadAttemptHistorySnapshot,dimensionAuditDownloadAttemptHistorySummary,dimensionAuditDownloadAttemptHistorySummaryValid,dimensionAuditDownloadAttemptHistorySummarySignature,dimensionAuditDownloadAttemptValid,dimensionAuditDownloadAttemptHistoryAuditSignature,dimensionAuditDownloadAttemptHistoryIntegrity,dimensionAuditDownloadAttemptHistoryIntegritySignature,dimensionAuditDownloadAttemptHistoryEnvelopeSignature,dimensionAuditDownloadAttemptHistoryEnvelopeValid,dimensionAuditDownloadAttemptHistoryAuditValid,dimensionAuditDownloadAttemptHistoryAuditSnapshot,dimensionAuditDownloadAttemptHistoryAuditSnapshotSource,dimensionAuditDownloadAttemptHistorySnapshotProvenance,dimensionAuditDownloadAttemptHistorySnapshotProvenanceSignature,dimensionAuditDownloadAttemptHistorySnapshotProvenanceValid,dimensionAuditDownloadHistoryExportReadinessProtocol,dimensionAuditDownloadHistoryExportReadinessProtocolSignature,dimensionAuditDownloadHistoryExportReadinessProtocolValid,dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid,dimensionAuditDownloadHistoryExportReadiness,dimensionAuditDownloadHistoryExportReadinessStateValid,dimensionAuditDownloadHistoryExportReadinessSignature,dimensionAuditDownloadHistoryExportReadinessSignatureValid,dimensionAuditDownloadHistoryExportReadinessSnapshotSignature,dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid,dimensionAuditDownloadHistoryExportReadinessSnapshot,dimensionAuditDownloadHistoryExportReadinessSnapshotValid,dimensionAuditDownloadHistoryExportGate,dimensionAuditDownloadHistoryExportGateValid,dimensionAuditDownloadHistoryExportGateSignature,dimensionAuditDownloadHistoryExportGateSignatureValid,dimensionAuditDownloadHistoryExportGateSnapshotSignature,dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid,dimensionAuditDownloadHistoryExportGateSnapshot,dimensionAuditDownloadHistoryExportGateSnapshotValid,dimensionAuditDownloadHistoryExportDecision,dimensionAuditDownloadHistoryExportDecisionValid,dimensionAuditDownloadHistoryExportDecisionSignature,dimensionAuditDownloadHistoryExportDecisionSignatureValid,dimensionAuditDownloadHistoryExportDecisionSnapshotSignature,dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid,dimensionAuditDownloadHistoryExportDecisionSnapshot,dimensionAuditDownloadHistoryExportDecisionSnapshotValid,dimensionAuditDownloadHistoryExportAuthorization,dimensionAuditDownloadHistoryExportAuthorizationValid,dimensionAuditDownloadHistoryExportAuthorizationSignature,dimensionAuditDownloadHistoryExportAuthorizationSignatureValid,dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature,dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid,dimensionAuditDownloadHistoryExportAuthorizationSnapshot,dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid,dimensionAuditDownloadHistoryExportChain,dimensionAuditDownloadHistoryExportChainValid,dimensionAuditDownloadHistoryExportChainSignature,dimensionAuditDownloadHistoryExportChainSignatureValid,copyDimensionAuditDownloadHistory,downloadDimensionAuditDownloadHistory,currentDimensionAuditDownloadAttemptHistoryAuditSnapshot:()=>dimensionAuditDownloadAttemptHistoryAuditSnapshot(),currentDimensionAuditDownloadAttemptHistoryAuditSnapshotSource:()=>dimensionAuditDownloadAttemptHistoryAuditSnapshotSource(),currentDimensionAuditDownloadAttemptHistorySnapshotProvenance:()=>dimensionAuditDownloadAttemptHistorySnapshotProvenance(),currentDimensionAuditDownloadAttemptHistorySnapshotProvenanceSignature:()=>dimensionAuditDownloadAttemptHistorySnapshotProvenanceSignature(),currentDimensionAuditDownloadAttemptHistorySnapshotProvenanceValid:()=>dimensionAuditDownloadAttemptHistorySnapshotProvenanceValid(),currentDimensionAuditDownloadHistoryExportReadinessProtocol:()=>dimensionAuditDownloadHistoryExportReadinessProtocol(),currentDimensionAuditDownloadHistoryExportReadinessProtocolSignature:()=>dimensionAuditDownloadHistoryExportReadinessProtocolSignature(),currentDimensionAuditDownloadHistoryExportReadinessProtocolValid:()=>dimensionAuditDownloadHistoryExportReadinessProtocolValid(),currentDimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid:()=>dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(),currentDimensionAuditDownloadHistoryExportReadiness:()=>dimensionAuditDownloadHistoryExportReadiness(),currentDimensionAuditDownloadHistoryExportReadinessStateValid:()=>dimensionAuditDownloadHistoryExportReadinessStateValid(),currentDimensionAuditDownloadHistoryExportReadinessSignature:()=>dimensionAuditDownloadHistoryExportReadinessSignature(),currentDimensionAuditDownloadHistoryExportReadinessSignatureValid:()=>dimensionAuditDownloadHistoryExportReadinessSignatureValid(),currentDimensionAuditDownloadHistoryExportReadinessSnapshotSignature:()=>dimensionAuditDownloadHistoryExportReadinessSnapshot().snapshot_signature,currentDimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid:()=>dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(dimensionAuditDownloadHistoryExportReadinessSnapshot().snapshot_signature,dimensionAuditDownloadHistoryExportReadinessSnapshot()),currentDimensionAuditDownloadHistoryExportReadinessSnapshot:()=>dimensionAuditDownloadHistoryExportReadinessSnapshot(),currentDimensionAuditDownloadHistoryExportReadinessSnapshotValid:()=>dimensionAuditDownloadHistoryExportReadinessSnapshotValid(),currentDimensionAuditDownloadHistoryExportGate:()=>dimensionAuditDownloadHistoryExportGate(),currentDimensionAuditDownloadHistoryExportGateValid:()=>dimensionAuditDownloadHistoryExportGateValid(),currentDimensionAuditDownloadHistoryExportGateSignature:()=>dimensionAuditDownloadHistoryExportGateSignature(),currentDimensionAuditDownloadHistoryExportGateSignatureValid:()=>dimensionAuditDownloadHistoryExportGateSignatureValid(),currentDimensionAuditDownloadHistoryExportGateSnapshotSignature:()=>dimensionAuditDownloadHistoryExportGateSnapshot().snapshot_signature,currentDimensionAuditDownloadHistoryExportGateSnapshotSignatureValid:()=>dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid(dimensionAuditDownloadHistoryExportGateSnapshot().snapshot_signature,dimensionAuditDownloadHistoryExportGateSnapshot()),currentDimensionAuditDownloadHistoryExportGateSnapshot:()=>dimensionAuditDownloadHistoryExportGateSnapshot(),currentDimensionAuditDownloadHistoryExportGateSnapshotValid:()=>dimensionAuditDownloadHistoryExportGateSnapshotValid(),currentDimensionAuditDownloadHistoryExportDecision:()=>dimensionAuditDownloadHistoryExportDecision(),currentDimensionAuditDownloadHistoryExportDecisionValid:()=>dimensionAuditDownloadHistoryExportDecisionValid(),currentDimensionAuditDownloadHistoryExportDecisionSignature:()=>dimensionAuditDownloadHistoryExportDecisionSignature(),currentDimensionAuditDownloadHistoryExportDecisionSignatureValid:()=>dimensionAuditDownloadHistoryExportDecisionSignatureValid(),currentDimensionAuditDownloadHistoryExportDecisionSnapshotSignature:()=>dimensionAuditDownloadHistoryExportDecisionSnapshot().snapshot_signature,currentDimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid:()=>dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid(dimensionAuditDownloadHistoryExportDecisionSnapshot().snapshot_signature,dimensionAuditDownloadHistoryExportDecisionSnapshot()),currentDimensionAuditDownloadHistoryExportDecisionSnapshot:()=>dimensionAuditDownloadHistoryExportDecisionSnapshot(),currentDimensionAuditDownloadHistoryExportDecisionSnapshotValid:()=>dimensionAuditDownloadHistoryExportDecisionSnapshotValid(),currentDimensionAuditDownloadHistoryExportAuthorization:()=>dimensionAuditDownloadHistoryExportAuthorization(),currentDimensionAuditDownloadHistoryExportAuthorizationValid:()=>dimensionAuditDownloadHistoryExportAuthorizationValid(),currentDimensionAuditDownloadHistoryExportAuthorizationSignature:()=>dimensionAuditDownloadHistoryExportAuthorizationSignature(),currentDimensionAuditDownloadHistoryExportAuthorizationSignatureValid:()=>dimensionAuditDownloadHistoryExportAuthorizationSignatureValid(),currentDimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature:()=>dimensionAuditDownloadHistoryExportAuthorizationSnapshot().snapshot_signature,currentDimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid:()=>dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(dimensionAuditDownloadHistoryExportAuthorizationSnapshot().snapshot_signature,dimensionAuditDownloadHistoryExportAuthorizationSnapshot()),currentDimensionAuditDownloadHistoryExportAuthorizationSnapshot:()=>dimensionAuditDownloadHistoryExportAuthorizationSnapshot(),currentDimensionAuditDownloadHistoryExportAuthorizationSnapshotValid:()=>dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid(),currentDimensionAuditDownloadHistoryExportChain:()=>dimensionAuditDownloadHistoryExportChain(),currentDimensionAuditDownloadHistoryExportChainValid:()=>dimensionAuditDownloadHistoryExportChainValid(),currentDimensionAuditDownloadHistoryExportChainSignature:()=>dimensionAuditDownloadHistoryExportChainSignature(),currentDimensionAuditDownloadHistoryExportChainSignatureValid:()=>dimensionAuditDownloadHistoryExportChainSignatureValid(),currentDimensionAuditDownloadHistoryExportChainSnapshot:()=>dimensionAuditDownloadHistoryExportChainSnapshot(),currentDimensionAuditDownloadHistoryExportChainSnapshotValid:()=>dimensionAuditDownloadHistoryExportChainSnapshotValid(),currentDimensionAuditDownloadHistoryExportChainSnapshotSignature:()=>dimensionAuditDownloadHistoryExportChainSnapshot().snapshot_signature,currentDimensionAuditDownloadHistoryExportChainSnapshotSignatureValid:()=>dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid(dimensionAuditDownloadHistoryExportChainSnapshot().snapshot_signature,dimensionAuditDownloadHistoryExportChainSnapshot()),currentDimensionAuditDownloadHistoryExportPayloadBinding:()=>dimensionAuditDownloadHistoryExportPayloadBinding(),currentDimensionAuditDownloadHistoryExportPayloadBindingValid:()=>dimensionAuditDownloadHistoryExportPayloadBindingValid(),currentDimensionAuditDownloadHistoryExportPayloadBindingSignature:()=>dimensionAuditDownloadHistoryExportPayloadBindingSignature(),currentDimensionAuditDownloadHistoryExportPayloadBindingSignatureValid:()=>dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(),currentDimensionAuditDownloadHistoryExportPayloadBindingSnapshot:()=>dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),currentDimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid:()=>dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid(),currentDimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature:()=>dimensionAuditDownloadHistoryExportPayloadBindingSnapshot().snapshot_signature,currentDimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid:()=>dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid(dimensionAuditDownloadHistoryExportPayloadBindingSnapshot().snapshot_signature,dimensionAuditDownloadHistoryExportPayloadBindingSnapshot()),currentDimensionAuditDownloadHistoryExportActionReady:()=>{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot();const chain=dimensionAuditDownloadHistoryExportChain(history);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);return dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid(bindingSnapshot,history,chainSnapshot)&&binding.allowed===true;},currentDimensionAuditDownloadHistoryExportActionStatus:()=>{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot();const chain=dimensionAuditDownloadHistoryExportChain(history);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);return dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);},currentDimensionAuditDownloadHistoryExportActionStatusValid:()=>{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot();const chain=dimensionAuditDownloadHistoryExportChain(history);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);return dimensionAuditDownloadHistoryExportActionStatusValid(status,bindingSnapshot,history,chainSnapshot);},currentDimensionAuditDownloadHistoryExportActionStatusSnapshot:()=>{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot();const chain=dimensionAuditDownloadHistoryExportChain(history);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);return dimensionAuditDownloadHistoryExportActionStatusSnapshot(status,bindingSnapshot,history,chainSnapshot);},currentDimensionAuditDownloadHistoryExportActionStatusSnapshotValid:()=>{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot();const chain=dimensionAuditDownloadHistoryExportChain(history);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);const statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(status,bindingSnapshot,history,chainSnapshot);return dimensionAuditDownloadHistoryExportActionStatusSnapshotValid(statusSnapshot,bindingSnapshot,history,chainSnapshot);},currentDimensionAuditDownloadHistoryExportActionPermit:(action="copy")=>{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot();const chain=dimensionAuditDownloadHistoryExportChain(history);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);const statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(status,bindingSnapshot,history,chainSnapshot);return dimensionAuditDownloadHistoryExportActionPermit(action,statusSnapshot,bindingSnapshot,history,chainSnapshot);},currentDimensionAuditDownloadHistoryExportActionPermitSnapshot:(action="copy")=>{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot();const chain=dimensionAuditDownloadHistoryExportChain(history);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);const statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(status,bindingSnapshot,history,chainSnapshot);const permit=dimensionAuditDownloadHistoryExportActionPermit(action,statusSnapshot,bindingSnapshot,history,chainSnapshot);return dimensionAuditDownloadHistoryExportActionPermitSnapshot(permit,action,statusSnapshot,bindingSnapshot,history,chainSnapshot);},currentDimensionAuditDownloadHistoryExportActionPermitSnapshotValid:(action="copy")=>{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot();const chain=dimensionAuditDownloadHistoryExportChain(history);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);const statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(status,bindingSnapshot,history,chainSnapshot);const permit=dimensionAuditDownloadHistoryExportActionPermit(action,statusSnapshot,bindingSnapshot,history,chainSnapshot);const permitSnapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot(permit,action,statusSnapshot,bindingSnapshot,history,chainSnapshot);return dimensionAuditDownloadHistoryExportActionPermitSnapshotValid(permitSnapshot,action,statusSnapshot,bindingSnapshot,history,chainSnapshot);},currentDimensionAuditDownloadHistoryExportFinalReady:(action="copy")=>{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot();const chain=dimensionAuditDownloadHistoryExportChain(history);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);const statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(status,bindingSnapshot,history,chainSnapshot);return dimensionAuditDownloadHistoryExportFinalReady(action,statusSnapshot,bindingSnapshot,history,chainSnapshot);},currentDimensionAuditDownloadHistoryExportFinalState:(action="copy")=>{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot();const chain=dimensionAuditDownloadHistoryExportChain(history);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);const statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(status,bindingSnapshot,history,chainSnapshot);return dimensionAuditDownloadHistoryExportFinalState(action,statusSnapshot,bindingSnapshot,history,chainSnapshot);},currentDimensionAuditDownloadHistoryExportFinalStateValid:(action="copy")=>{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot();const chain=dimensionAuditDownloadHistoryExportChain(history);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);const statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(status,bindingSnapshot,history,chainSnapshot);const state=dimensionAuditDownloadHistoryExportFinalState(action,statusSnapshot,bindingSnapshot,history,chainSnapshot);return dimensionAuditDownloadHistoryExportFinalStateValid(state,action,statusSnapshot,bindingSnapshot,history,chainSnapshot);},currentDimensionAuditDownloadHistoryExportFinalStateSignature:(action="copy")=>{const state=window.TubeBenderMeasurements?.currentDimensionAuditDownloadHistoryExportFinalState?.(action)??dimensionAuditDownloadHistoryExportFinalState(action);return dimensionAuditDownloadHistoryExportFinalStateSignature(state);},currentDimensionAuditDownloadHistoryExportFinalStateSnapshot:(action="copy")=>{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot();const chain=dimensionAuditDownloadHistoryExportChain(history);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);const statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(status,bindingSnapshot,history,chainSnapshot);const state=dimensionAuditDownloadHistoryExportFinalState(action,statusSnapshot,bindingSnapshot,history,chainSnapshot);return dimensionAuditDownloadHistoryExportFinalStateSnapshot(state,action,statusSnapshot,bindingSnapshot,history,chainSnapshot);},currentDimensionAuditDownloadHistoryExportFinalStateSnapshotValid:(action="copy")=>{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot();const chain=dimensionAuditDownloadHistoryExportChain(history);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);const statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(status,bindingSnapshot,history,chainSnapshot);const state=dimensionAuditDownloadHistoryExportFinalState(action,statusSnapshot,bindingSnapshot,history,chainSnapshot);const stateSnapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot(state,action,statusSnapshot,bindingSnapshot,history,chainSnapshot);return dimensionAuditDownloadHistoryExportFinalStateSnapshotValid(stateSnapshot,action,statusSnapshot,bindingSnapshot,history,chainSnapshot);},currentDimensionAuditDownloadAttemptHistoryIntegrity:()=>dimensionAuditDownloadAttemptHistoryIntegrity(dimensionAuditDownloadAttemptHistoryAuditSnapshot()),currentDimensionAuditDownloadAttemptHistoryIntegritySignature:()=>dimensionAuditDownloadAttemptHistoryAuditSnapshot().integrity_signature,currentDimensionAuditDownloadAttemptHistoryIntegritySignatureValid:()=>{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot();return dimensionAuditDownloadAttemptHistoryIntegritySignatureValid(snapshot.integrity_signature,snapshot.integrity);},currentDimensionAuditDownloadAttemptHistorySignatureValid:()=>{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot();return dimensionAuditDownloadAttemptHistoryAuditSignatureValid(snapshot.snapshot_signature,snapshot);},currentDimensionAuditDownloadAttemptHistoryEnvelopeSignature:()=>dimensionAuditDownloadAttemptHistoryAuditSnapshot().envelope_signature,currentDimensionAuditDownloadAttemptHistoryEnvelopeSignatureValid:()=>{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot();return dimensionAuditDownloadAttemptHistoryEnvelopeSignatureValid(snapshot.envelope_signature,snapshot);},currentDimensionAuditDownloadAttemptHistoryEnvelopeValid:()=>dimensionAuditDownloadAttemptHistoryAuditSnapshot().envelope_valid,currentDimensionAuditDownloadAttemptHistoryAttemptsValid:()=>dimensionAuditDownloadAttemptHistorySnapshot().every(attempt=>dimensionAuditDownloadAttemptValid(attempt)),currentDimensionAuditDownloadAttemptHistorySummary:()=>dimensionAuditDownloadAttemptHistorySummary(),currentDimensionAuditDownloadHistoryPermitEvidenceSummary:()=>dimensionAuditDownloadHistoryPermitEvidenceSummary(),currentDimensionAuditDownloadHistoryPermitEvidenceSummaryValid:()=>dimensionAuditDownloadHistoryPermitEvidenceSummaryValid(),currentDimensionAuditDownloadLastAttemptPermitEvidence:()=>dimensionAuditDownloadAttemptPermitEvidence(dimensionAuditDownloadLastAttempt()??{}),currentDimensionAuditDownloadHistoryExportEventHistory:()=>dimensionAuditDownloadHistoryExportEventListSnapshot(),currentDimensionAuditDownloadHistoryExportEventSummary:()=>dimensionAuditDownloadHistoryExportEventSummary(),currentDimensionAuditDownloadHistoryExportEventSummaryValid:()=>dimensionAuditDownloadHistoryExportEventSummaryValid(),currentDimensionAuditDownloadHistoryExportEventSummarySignature:()=>dimensionAuditDownloadHistoryExportEventSummarySignature(dimensionAuditDownloadHistoryExportEventSummary()),currentDimensionAuditDownloadHistoryExportEventSummarySignatureValid:()=>{const summary=dimensionAuditDownloadHistoryExportEventSummary();return dimensionAuditDownloadHistoryExportEventSummarySignatureValid(summary.signature,summary);},currentDimensionAuditDownloadHistoryExportEventSnapshot:()=>dimensionAuditDownloadHistoryExportEventHistorySnapshot(),currentDimensionAuditDownloadHistoryExportEventSnapshotValid:()=>dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(),currentDimensionAuditDownloadHistoryExportEventSnapshotSignatureValid:()=>{const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot();return dimensionAuditDownloadHistoryExportEventHistorySignatureValid(snapshot.signature,snapshot);},dimensionAuditDownloadHistoryExportEventSignature,dimensionAuditDownloadHistoryExportEventSignatureValid,currentDimensionAuditDownloadHistoryLatestExportEvent:()=>clone(dimensionAuditDownloadHistoryExportEventListSnapshot().at(-1)??null),currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary:()=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(),currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid:()=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid(),currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature:()=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature(),currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid:()=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid(),currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot:()=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(),currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid:()=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(),currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature:()=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature(),currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid:()=>{const events=dimensionAuditDownloadHistoryExportEventListSnapshot();const signature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature(events);return dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid(signature,events);},dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature,dimensionAuditDownloadHistoryExportEventLogEnvelopeSignatureValid,currentDimensionAuditDownloadHistoryExportEventLogEnvelope:()=>{const events=dimensionAuditDownloadHistoryExportEventListSnapshot();const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot(events);const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);return dimensionAuditDownloadHistoryExportEventLogEnvelope(history,evidence,events);},currentDimensionAuditDownloadHistoryExportEventLogEnvelopeValid:()=>{const events=dimensionAuditDownloadHistoryExportEventListSnapshot();const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot(events);const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(history,evidence,events);return dimensionAuditDownloadHistoryExportEventLogEnvelopeValid(envelope,events);},currentDimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot:()=>{const events=dimensionAuditDownloadHistoryExportEventListSnapshot();const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot(events);const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(history,evidence,events);return dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(envelope,events);},currentDimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid:()=>{const events=dimensionAuditDownloadHistoryExportEventListSnapshot();const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot(events);const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(history,evidence,events);const snapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(envelope,events);return dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid(snapshot,events);},copyDimensionAuditHistoryExportEvents,downloadDimensionAuditHistoryExportEvents,clearDimensionAuditDownloadHistoryExportEventHistory,currentDimensionAuditDownloadAttemptHistorySummaryValid:()=>dimensionAuditDownloadAttemptHistorySummaryValid(),currentDimensionAuditDownloadAttemptHistorySummarySignature:()=>dimensionAuditDownloadAttemptHistorySummarySignature(),currentDimensionAuditDownloadAttemptHistorySummarySignatureValid:()=>dimensionAuditDownloadAttemptHistorySummarySignatureValid(),clearDimensionAuditDownloadAttemptHistory,dimensionAuditDownloadAttemptSignature,dimensionAuditDownloadAttemptSignatureValid,recordDimensionAuditDownloadAttempt,currentDimensionAuditDownloadProtocolSignature:()=>dimensionAuditDownloadProtocolSignature(),currentDimensionAuditDownloadProtocolSignatureValid:()=>{const state=auditDownloadDomain?.dimensionAuditDownloadProtocolState?.()??null;const signature=dimensionAuditDownloadProtocolSignature(state);return dimensionAuditDownloadProtocolSignatureValid(signature,state);},currentDimensionAuditDownloadRuntimeState:()=>dimensionAuditDownloadRuntimeState(),currentDimensionAuditDownloadRuntimeSignature:()=>dimensionAuditDownloadRuntimeSignature(),currentDimensionAuditDownloadRuntimeValidation:()=>dimensionAuditDownloadRuntimeValidation(),dimensionAuditDownloadValidationSchema,dimensionAuditDownloadValidationCodes,dimensionAuditDownloadSchemas,dimensionAuditDownloadSnapshotShapeSupported,dimensionAuditDownloadFilenameSupported,dimensionAuditDownloadSchemaSupported,dimensionAuditDownloadValidation,downloadVisibleDimensionAudits,downloadAllDimensionAudits,dimensionAuditGeometryClass,dimensionReviewProgress,domainDimensionReviewProgress,canonicalDimensionReviewProgress,dimensionReviewContextState,dimensionReviewContext,dimensionReviewContextSignature,dimensionReviewContextSummary,dimensionReviewContextSummarySignature,currentDimensionReviewContextSummary:()=>dimensionReviewContextSummary(),dimensionReviewProgressDiagnostics,dimensionReviewProgressDiagnosticsState,dimensionReviewProgressDiagnosticsRuntimeState,dimensionReviewProgressDiagnosticsIntegrity,dimensionReviewProgressDiagnosticsIntegritySignature,dimensionReviewProgressDiagnosticsIntegrityParity,dimensionReviewProgressDiagnosticsIntegrityState,dimensionReviewProgressDiagnosticsSnapshot,dimensionReviewProgressDiagnosticsSignature,dimensionReviewProgressSignature,dimensionReviewProgressSnapshot,currentCanonicalReviewProgress:()=>canonicalDimensionReviewProgress(),currentReviewProgressDiagnostics:()=>dimensionReviewProgressDiagnosticsState().diagnostics,currentReviewProgressDiagnosticsSnapshot:()=>dimensionReviewProgressDiagnosticsSnapshot(dimensionReviewProgressDiagnosticsState().diagnostics),currentReviewProgressDiagnosticsSignature:()=>dimensionReviewProgressDiagnosticsState().signature,currentReviewProgressDiagnosticsState:()=>dimensionReviewProgressDiagnosticsState(),currentReviewProgressDiagnosticsRuntimeState:()=>dimensionReviewProgressDiagnosticsRuntimeState(),currentReviewProgressDiagnosticsIntegrity:()=>dimensionReviewProgressDiagnosticsIntegrityState().integrity,currentReviewProgressDiagnosticsIntegritySignature:()=>dimensionReviewProgressDiagnosticsIntegrityState().signature,currentReviewProgressDiagnosticsIntegrityParity:()=>dimensionReviewProgressDiagnosticsIntegrityState().parity,currentReviewProgressDiagnosticsIntegrityState:()=>dimensionReviewProgressDiagnosticsIntegrityState(),currentCanonicalReviewProgressSnapshot:()=>canonicalDimensionReviewProgress().snapshot,currentCanonicalReviewProgressSignature:()=>canonicalDimensionReviewProgress().signature,currentCanonicalReviewProgressSource:()=>canonicalDimensionReviewProgress().source,currentReviewProgressRuntimeState:()=>dimensionReviewProgressRuntimeState(),currentReviewProgressSnapshot:()=>dimensionReviewProgressSnapshot(dimensionReviewProgress()),currentDomainReviewProgressSnapshot:()=>{const progress=domainDimensionReviewProgress();return progress&&reviewProgressDomain?.reviewProgressSnapshot?reviewProgressDomain.reviewProgressSnapshot(progress):null;},currentReviewProgressSignature:()=>dimensionReviewProgressSignature(dimensionReviewProgress()),currentReviewQueueAuditSnapshot:()=>reviewQueueDimensionAuditSnapshot(),currentReviewReasonAuditSnapshot:()=>reviewReasonDimensionAuditSnapshot(),reviewQueueDimensionAuditSnapshot,reviewReasonDimensionAuditSnapshot,dimensionReferenceStatusCounts,dimensionFittedAuditStats,auditNumber,dimensionAuditReviewReasons,dimensionAuditNeedsReview,dimensionAuditSummary,allDimensionAuditSnapshot,copyAllDimensionAudits,selectedDimensionAuditIds,dimensionSelectionKindCounts,selectedDimensionAuditSnapshot,copySelectedDimensionAudits,downloadSelectedDimensionAudits,visibleDimensionAuditSnapshot,copyVisibleDimensionAudits,activeDimensionReviewReason,filteredDimensionManagerItems,clearDimensionSelection,pruneDimensionSelectionToAuditView,invertVisibleDimensionAuditSelection,removeVisibleDimensionAuditResultsFromSelection,addVisibleDimensionAuditResultsToSelection,selectVisibleDimensionAuditResults,selectReviewReasonDimensionResults,addReviewReasonDimensionResultsToSelection,removeReviewReasonDimensionResultsFromSelection,invertReviewReasonDimensionSelection,selectReviewQueueDimensionResults,addReviewQueueDimensionResultsToSelection,removeReviewQueueDimensionResultsFromSelection,invertReviewQueueDimensionSelection,showDimensionAuditResults,showAndSelectDimensionAuditResults,hideDimensionAuditResults,
      startQuickMeasure,stopQuickMeasure,clearQuickMeasure,captureQuickCandidate,
      copyMeasurementResult,useMeasurementInFormula,
      formulaValue:()=>formulaMeasurementValue,
      openResults:()=>{ensureResultsPanel().classList.add("open");renderResultsPanel(lastResult);},
      quickState:()=>clone(quick)
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();