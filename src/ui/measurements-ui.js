(()=>{
  const GEOMETRY_URL="__TB_GEOMETRY_MEASUREMENTS_MODULE_URL__";
  const DIMENSIONS_URL="__TB_DIMENSIONS_MODULE_URL__";
  let geometry=null,dimensions=null,installed=false,panel=null,resultsPanel=null,button=null,lastResult=null,lastSelectionKey="",poll=null,formulaMeasurementValue=null,dimensionManagerFilter="all",dimensionManagerSort="project",dimensionManagerSearch="",dimensionManagerFocusId="";
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
.tb-measure-body{padding:10px;overflow:auto}.tb-measure-result{border:1px solid #304154;border-radius:7px;padding:9px}.tb-measure-title{font-weight:700;margin-bottom:7px}.tb-measure-value{font-size:20px;color:#ffe46b;margin:6px 0 10px}.tb-measure-table{width:100%;border-collapse:collapse}.tb-measure-table td{padding:4px 5px;border-bottom:1px solid rgba(128,151,178,.18)}.tb-measure-note{color:#9fafbf;line-height:1.45}.tb-measure-error{color:#ff7979}.tb-measure-actions{display:flex;gap:6px;justify-content:flex-end;margin-top:9px}.tb-measure-settings{display:grid;grid-template-columns:1fr 110px;gap:6px 8px;margin-top:10px}.tb-measure-settings input,.tb-measure-settings select{background:#0b131c;color:#fff;border:1px solid #40536a;border-radius:5px;padding:5px}.tb-dim-colors{display:grid;grid-template-columns:1fr 1fr;gap:6px 8px}.tb-dim-colors label{display:flex;align-items:center;justify-content:space-between;gap:6px}.tb-dim-colors input[type=color]{width:42px;height:28px;padding:1px}
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
  function dimensionRebindAuditSnapshot(dimension){
    const references=dimension?.references??[];
    const referenceGeometryStatuses=[...new Set(references.map(ref=>String(ref?.geometry_status??"").trim()).filter(Boolean))];
    return {
      ...dimensionAuditProjectContext(),
      dimension_id:String(dimension?.id??""),
      kind:String(dimension?.kind??""),
      mode:String(dimension?.mode??""),
      status:String(dimension?.status??""),
      needs_review:dimensionAuditNeedsReview(dimension),
      review_reasons:clone(dimensionAuditReviewReasons(dimension)),
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
      dimensions:items.map(dimension=>dimensionRebindAuditSnapshot(dimension))
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

  function selectedDimensionAuditIds(){
    return (context()?.selectionEntries?.()??[])
      .filter(entry=>entry?.kind==="dimension"&&entry?.dimensionId!=null)
      .map(entry=>String(entry.dimensionId));
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
        selected_dimension_ids:selectionIds,
        selected_dimension_count:selectionIds.length,
        selected_in_view_ids:selectedInView,
        selected_in_view_count:selectedInView.length,
        selected_outside_view_ids:selectedOutsideView,
        selected_outside_view_count:selectedOutsideView.length
      },
      dimension_count:items.length,
      summary:dimensionAuditSummary(items),
      dimensions:items.map(dimension=>dimensionRebindAuditSnapshot(dimension))
    };
  }
  function downloadDimensionAuditJson(filename,snapshot){
    try{
      const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=url;link.download=String(filename||"dimension-audit.json");
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),0);
      toast("Dimension audit JSON сохранён");
      return true;
    }catch(error){toast("Не удалось сохранить Dimension audit JSON");return false;}
  }
  function dimensionAuditFilenameStamp(value=new Date()){
    return value.toISOString().replace(/[:.]/g,"-");
  }
  function downloadVisibleDimensionAudits(){
    const snapshot=visibleDimensionAuditSnapshot();
    const name=(snapshot.project_name||snapshot.project_id||"project").replace(/[^a-z0-9._-]+/gi,"_");
    return downloadDimensionAuditJson(name+"-dimension-audit-view-"+dimensionAuditFilenameStamp(new Date(snapshot.generated_at))+".json",snapshot);
  }
  function downloadAllDimensionAudits(){
    const snapshot=allDimensionAuditSnapshot();
    const name=(snapshot.project_name||snapshot.project_id||"project").replace(/[^a-z0-9._-]+/gi,"_");
    return downloadDimensionAuditJson(name+"-dimension-audit-"+dimensionAuditFilenameStamp(new Date(snapshot.generated_at))+".json",snapshot);
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
    const projectName=(snapshot.project_name||snapshot.project_id||"project").replace(/[^a-z0-9._-]+/gi,"_");
    const dimensionName=String(dimension?.id??"dimension").replace(/[^a-z0-9._-]+/gi,"_");
    return downloadDimensionAuditJson(projectName+"-"+dimensionName+"-dimension-audit-"+dimensionAuditFilenameStamp(new Date(snapshot.generated_at))+".json",snapshot);
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

  function dimensionSearchText(dimension){
    const refs=dimension?.references??[];
    const sources=refs.map(ref=>String(ref?.object_id??"")).filter(Boolean);
    const geometryStatuses=refs.map(ref=>String(ref?.geometry_status??"")).filter(Boolean);
    return [
      dimension?.id,dimension?.note,dimension?.kind,dimension?.mode,dimension?.status,dimension?.stale_reason,
      dimensionAuditGeometryClass(dimension),...geometryStatuses,...sources
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
    const search=String(dimensionManagerSearch??"").trim().toLowerCase();
    if(search)result=result.filter(dimension=>dimensionSearchText(dimension).includes(search));
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
    const items=savedDimensions();
    if(!items.length)return '<div class="tb-measure-result" style="margin-top:9px"><div class="tb-measure-title">Saved Dimensions</div><div class="tb-measure-note">Сохранённых размеров пока нет.</div></div>';
    const locked=readonly();
    const auditSummary=dimensionAuditSummary(items);
    const statusSummary=Object.entries(auditSummary.by_status).map(([status,count])=>status+': '+count).join(' · ');
    const modeSummary=Object.entries(auditSummary.by_mode).map(([mode,count])=>mode+': '+count).join(' · ');
    const geometrySummary=Object.entries(auditSummary.by_geometry_status).map(([status,count])=>'Geometry '+status+': '+count).join(' · ');
    const referenceSummary=Object.entries(auditSummary.reference_geometry_counts).map(([status,count])=>'Refs '+status+': '+count).join(' · ');
    const visibleItems=filteredDimensionManagerItems(items);
    const selectedIds=selectedDimensionAuditIds();
    const visibleIdSet=new Set(visibleItems.map(dimension=>String(dimension?.id??"")));
    const selectedInViewCount=selectedIds.filter(id=>visibleIdSet.has(String(id))).length;
    const selectedOutsideViewCount=selectedIds.length-selectedInViewCount;
    const rows=visibleItems.map(dimension=>{
      const stale=String(dimension.status)==="Stale",visible=dimension.visible!==false;
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
      return '<div class="tb-measure-result" style="margin-top:7px">'+
        '<div class="tb-measure-title">'+esc(dimension.note??dimension.kind)+' · '+esc(dimension.mode??"Reference")+
        (stale?' · ⚠ Stale':' · '+esc(dimension.status??"NeedsUpdate"))+'</div>'+
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
      ['all','selected','unselected','needs-review','stale','rebound','section-derived','exact','fitted','unknown-geometry','reference','driving','visible','hidden'].map(name=>'<button data-dimension-filter="'+name+'" '+(dimensionManagerFilter===name?'disabled':'')+'>'+({all:'All',selected:'Selected',unselected:'Unselected','needs-review':'Needs review',stale:'Stale',rebound:'Rebound','section-derived':'Section-derived',exact:'Exact',fitted:'Fitted','unknown-geometry':'Unknown geometry',reference:'Reference',driving:'Driving',visible:'Visible',hidden:'Hidden'}[name])+'</button>').join('')+
      '</div>'+
      '<div class="tb-measure-actions" data-dimension-audit-sort>'+
      '<button data-dimension-sort="project" '+(dimensionManagerSort==="project"?'disabled':'')+'>Project order</button>'+
      '<button data-dimension-sort="audit" '+(dimensionManagerSort==="audit"?'disabled':'')+'>Audit priority</button></div>'+
      '<div class="tb-measure-actions" data-dimension-audit-search>'+
      '<input data-dimension-search value="'+esc(dimensionManagerSearch)+'" placeholder="Search ID, kind, source, stale reason">'+
      '<button data-dimension-search-apply>Search</button><button data-dimension-search-clear '+(!dimensionManagerSearch?'disabled':'')+'>Clear</button>'+
      '<button data-dimension-view-reset '+(dimensionManagerFilter==="all"&&dimensionManagerSort==="project"&&!dimensionManagerSearch?'disabled':'')+'>Reset view</button></div>';
    return '<div class="tb-measure-result" style="margin-top:9px"><div class="tb-measure-title">Saved Dimensions</div>'+
      '<div class="tb-measure-note">Управление сохранёнными Reference/Driving Dimensions, включая скрытые размеры.</div>'+
      '<div class="tb-measure-note" data-dimension-audit-summary>Total: '+auditSummary.total+' · Visible: '+auditSummary.visible+' · Hidden: '+auditSummary.hidden+' · Selected: '+auditSummary.selected+' · Unselected: '+auditSummary.unselected+' · Needs review: '+auditSummary.needs_review+' · Section-derived: '+auditSummary.section_derived+' · Stale: '+auditSummary.stale+' · Rebound: '+auditSummary.rebound+(statusSummary?' · '+esc(statusSummary):'')+(modeSummary?' · '+esc(modeSummary):'')+(geometrySummary?' · '+esc(geometrySummary):'')+(referenceSummary?' · '+esc(referenceSummary):'')+'</div>'+
      '<div class="tb-measure-note" data-dimension-visible-count>Showing '+visibleItems.length+' of '+items.length+'</div>'+
      '<div class="tb-measure-note" data-dimension-selection-scope>Selected in view: '+selectedInViewCount+' · outside view: '+selectedOutsideViewCount+'</div>'+
      (dimensionManagerFocusId?'<div class="tb-measure-note" data-dimension-exact-focus>Exact focus: '+esc(dimensionManagerFocusId)+' <button data-dimension-focus-clear>Clear focus</button></div>':'')+
      filters+
      '<div class="tb-measure-actions"><button data-select-visible-dimension-audit>Select visible results</button><button data-add-visible-dimension-audit>Add visible results</button><button data-remove-visible-dimension-audit>Remove visible results</button><button data-prune-dimension-selection '+(selectedOutsideViewCount===0?'disabled':'')+'>Prune selection to view</button><button data-show-dimension-audit '+(locked?'disabled title="Проект открыт только для просмотра"':'')+'>Show results</button><button data-show-select-dimension-audit '+(locked?'disabled title="Проект открыт только для просмотра"':'')+'>Show & Select results</button><button data-hide-dimension-audit '+(locked?'disabled title="Проект открыт только для просмотра"':'')+'>Hide results</button><button data-copy-visible-dimension-audits>Copy visible audit JSON</button><button data-download-visible-dimension-audits>Download visible audit JSON</button><button data-copy-all-dimension-audits>Copy all audit JSON</button><button data-download-all-dimension-audits>Download all audit JSON</button></div></div>'+rows;
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
    body.querySelector("[data-prune-dimension-selection]")?.addEventListener("click",pruneDimensionSelectionToAuditView);
    body.querySelector("[data-show-dimension-audit]")?.addEventListener("click",showDimensionAuditResults);
    body.querySelector("[data-show-select-dimension-audit]")?.addEventListener("click",showAndSelectDimensionAuditResults);
    body.querySelector("[data-hide-dimension-audit]")?.addEventListener("click",hideDimensionAuditResults);
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
    const searchInput=body.querySelector("[data-dimension-search]");
    body.querySelector("[data-dimension-search-apply]")?.addEventListener("click",()=>{
      dimensionManagerFocusId="";dimensionManagerSearch=String(searchInput?.value??"");render();
    });
    searchInput?.addEventListener("keydown",event=>{
      if(event.key==="Enter"){event.preventDefault();dimensionManagerFocusId="";dimensionManagerSearch=String(searchInput.value??"");render();}
    });
    body.querySelector("[data-dimension-search-clear]")?.addEventListener("click",()=>{dimensionManagerFocusId="";dimensionManagerSearch="";render();});
    body.querySelector("[data-dimension-focus-clear]")?.addEventListener("click",()=>{
      dimensionManagerFocusId="";dimensionManagerSearch="";render();
    });
    body.querySelector("[data-dimension-view-reset]")?.addEventListener("click",()=>{
      dimensionManagerFilter="all";dimensionManagerSort="project";dimensionManagerSearch="";dimensionManagerFocusId="";render();
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
    try{[geometry,dimensions]=await Promise.all([import(GEOMETRY_URL),import(DIMENSIONS_URL)]);}
    catch(error){console.error("Measurements UI failed to load",error);return;}
    ensureShell();
    const update=()=>{
      const next=selectionSignature();
      if(next!==lastSelectionKey){lastSelectionKey=next;if(panel?.classList.contains("open"))render();}
    };
    window.addEventListener("tubebender-selection-change",update);
    window.addEventListener("tubebender-section-view-change",()=>invalidateSectionDerivedDimensions("Section View changed"));
    window.addEventListener("tubebender-dimension-change",()=>{if(panel?.classList.contains("open"))render();});
    window.addEventListener("tubebender-history-change",()=>{if(panel?.classList.contains("open"))render();});
    window.addEventListener("tubebender-snap-change",onQuickSnapChange);
    document.getElementById("threeCanvas")?.addEventListener("click",onQuickCanvasClick,true);
    window.addEventListener("keydown",onQuickKeyDown,true);
    poll=setInterval(update,500);
    window.TubeBenderMeasurements=Object.freeze({
      open,close,focusDimensionAudit,refresh:render,buildMeasurement,savedDimensions,saveCurrentDimension,saveCurrentDrivingDimension,invalidateSectionDerivedDimensions,rebindSectionDerivedDimension,sectionRebindCompatibility,dimensionAuditProjectContext,dimensionRebindAuditSnapshot,copyDimensionRebindAudit,downloadDimensionRebindAudit,downloadDimensionAuditJson,dimensionAuditFilenameStamp,downloadVisibleDimensionAudits,downloadAllDimensionAudits,dimensionAuditGeometryClass,dimensionReferenceStatusCounts,dimensionFittedAuditStats,auditNumber,dimensionAuditReviewReasons,dimensionAuditNeedsReview,dimensionAuditSummary,allDimensionAuditSnapshot,copyAllDimensionAudits,selectedDimensionAuditIds,visibleDimensionAuditSnapshot,copyVisibleDimensionAudits,filteredDimensionManagerItems,pruneDimensionSelectionToAuditView,removeVisibleDimensionAuditResultsFromSelection,addVisibleDimensionAuditResultsToSelection,selectVisibleDimensionAuditResults,showDimensionAuditResults,showAndSelectDimensionAuditResults,hideDimensionAuditResults,
      startQuickMeasure,stopQuickMeasure,clearQuickMeasure,captureQuickCandidate,
      copyMeasurementResult,useMeasurementInFormula,
      formulaValue:()=>formulaMeasurementValue,
      openResults:()=>{ensureResultsPanel().classList.add("open");renderResultsPanel(lastResult);},
      quickState:()=>clone(quick)
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();