(()=>{
  let installed=false,panel=null,toggle=null,lastSignature="";
  const MIXED=Symbol("mixed");
  const ctx=()=>window.TubeBenderObjectContext??null;
  const eng=()=>window.TubeBenderEngineering??null;
  const refApi=()=>window.TubeBenderReferenceSceneUi??null;
  const lockApi=()=>window.TubeBenderObjectLocks??null;
  const layerApi=()=>window.TubeBenderLayers??null;
  const groupsApi=()=>window.TubeBenderGroups??null;
  const normalizeApi=()=>window.TubeBenderNormalizeGeometry??null;
  const assembliesApi=()=>window.TubeBenderAssemblies??null;
  const arraysApi=()=>window.TubeBenderAssociativeArrays??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const entries=()=>ctx()?.selectionEntries?.()??[];
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const value=(v)=>{
    if(v===null||v===undefined||v==="")return "—";
    if(typeof v==="number")return Number.isFinite(v)?String(Number(v.toFixed(6))):"—";
    if(typeof v==="boolean")return v?"Да":"Нет";
    if(typeof v==="object"){
      if(["x","y","z"].every(k=>Object.prototype.hasOwnProperty.call(v,k))){
        return ["x","y","z"].map(k=>k.toUpperCase()+" "+value(Number(v[k]))).join(" · ");
      }
      return JSON.stringify(v);
    }
    return String(v);
  };
  function findTube(id){return (project()?.tubes??[]).find(t=>String(t?.id)===String(id))??null;}
  function findScene(id){return (project()?.referenceScenes??[]).find(s=>String(s?.id)===String(id))??null;}
  function findNode(tree,id){
    for(const node of tree??[]){
      if(String(node?.id)===String(id))return node;
      const nested=findNode(node?.children,id);if(nested)return nested;
    }
    return null;
  }
  function setObjectStyleValue(object,key,value){
    const domain=layerApi()?.domain;
    const next={...(object?.object_style??{})};
    next[key]=value==null||value===""?null:value;
    object.object_style=domain?.normalizeObjectStyle?{...domain.normalizeObjectStyle(next)}:next;
  }
  function sharedLayerFields(object){
    const available=layerApi()?.layers?.()??[];
    return {
      layer_id:{
        label:"Layer",type:"select",
        options:available.map(layer=>({value:String(layer.id),label:String(layer.name)})),
        get:()=>String(object?.layer_id??""),
        set:(value)=>{
          if(!layerApi()?.layerById?.(value))throw new Error("Layer not found");
          object.layer_id=String(value);
        }
      },
      color_override:{
        label:"Color override",type:"text",
        get:()=>String(object?.object_style?.color??""),
        set:(value)=>{
          const text=String(value??"").trim();
          if(text&&!/^#[0-9a-f]{6}$/i.test(text))throw new Error("Color override: используйте #RRGGBB или пусто (ByLayer)");
          setObjectStyleValue(object,"color",text||null);
        }
      },
      linetype_override:{
        label:"Linetype override",type:"select",
        options:[{value:"",label:"ByLayer"},...((layerApi()?.domain?.LINETYPES??[]).map(type=>({value:type,label:type})))],
        get:()=>String(object?.object_style?.linetype??""),
        set:(value)=>setObjectStyleValue(object,"linetype",String(value??"")||null)
      },
      lineweight_override:{
        label:"Lineweight override",type:"text",
        get:()=>object?.object_style?.lineweight_mm==null?"":String(object.object_style.lineweight_mm),
        set:(value)=>{
          const text=String(value??"").trim();
          if(text===""){setObjectStyleValue(object,"lineweight_mm",null);return;}
          const n=Number(text);
          if(!Number.isFinite(n)||n<0||n>5)throw new Error("Lineweight должен быть 0…5 mm или пусто (ByLayer)");
          setObjectStyleValue(object,"lineweight_mm",n);
        }
      }
    };
  }

  function editableTarget(entry){
    if(!entry)return null;
    if(entry.kind==="tube"){
      const tube=findTube(entry.tubeId);
      return tube?{
        key:"tube:"+String(tube.id),
        entry,
        object:tube,
        fields:{
          name:{label:"Имя",type:"text",get:()=>String(tube.name??""),set:(value)=>{tube.name=String(value??"").trim();}},
          partNumber:{label:"Part number",type:"text",get:()=>String(tube.partNumber??tube.part_number??""),set:(value)=>{tube.partNumber=String(value??"").trim();}},
          ...sharedLayerFields(tube)
        }
      }:null;
    }
    if(entry.kind==="mesh-instance"){
      const instance=refApi()?.meshInstanceById?.(project(),entry.instanceId);
      return instance?{
        key:"mesh:"+String(instance.id),
        entry,
        object:instance,
        fields:{
          name:{label:"Имя",type:"text",get:()=>String(instance.name??""),set:(value)=>{instance.name=String(value??"").trim();}},
          visible:{label:"Видимый",type:"boolean",get:()=>instance.visible!==false,set:(value)=>{instance.visible=value===true;}},
          compare_source:{label:"Compare Source",type:"boolean",get:()=>instance.compare_source===true,set:(value)=>{
            if(instance.link_status==="detached"&&value===true)throw new Error("Detached mesh instance has no Source link");
            instance.compare_source=value===true;
            if(value===true)instance.source_visible=true;
          }},
          ...sharedLayerFields(instance)
        }
      }:null;
    }
    if(entry.kind==="group"){
      const group=groupsApi()?.groupById?.(entry.groupId);
      return group?{
        key:"group:"+String(group.id),
        entry,
        object:group,
        fields:{
          name:{label:"Имя",type:"text",get:()=>String(group.name??""),set:(value)=>{group.name=String(value??"").trim();}},
          visible:{label:"Видимый",type:"boolean",get:()=>group.visible!==false,set:(value)=>{group.visible=value===true;}}
        }
      }:null;
    }
    if(entry.kind==="project-assembly"){
      const assembly=assembliesApi()?.assemblyById?.(entry.assemblyId);
      return assembly?{
        key:"project-assembly:"+String(assembly.id),
        entry,
        object:assembly,
        fields:{
          name:{label:"Имя",type:"text",get:()=>String(assembly.name??""),set:(value)=>{assembly.name=String(value??"").trim();}},
          visible:{label:"Видимый",type:"boolean",get:()=>assembly.visible!==false,set:(value)=>{assembly.visible=value===true;}},
          fixed:{label:"Fixed",type:"boolean",get:()=>assembly.fixed===true,set:(value)=>{assembly.fixed=value===true;}}
        }
      }:null;
    }
    return null;
  }
  function editableTargets(){
    const out=[],seen=new Set();
    for(const entry of entries()){
      const target=editableTarget(entry);
      if(target&&!seen.has(target.key)){seen.add(target.key);out.push(target);}
    }
    return out;
  }
  function commonEditableFields(){
    const targets=editableTargets();
    if(!targets.length)return {targets,fields:[]};
    const names=Object.keys(targets[0].fields).filter(name=>targets.every(target=>!!target.fields[name]));
    return {targets,fields:names.map(name=>{
      const specs=targets.map(target=>target.fields[name]),values=specs.map(spec=>spec.get());
      const first=values[0],mixed=values.some(value=>value!==first);
      return {name,label:specs[0].label,type:specs[0].type,options:specs[0].options??null,value:mixed?MIXED:first,mixed};
    })};
  }
  function parsePropertyInput(field,input){
    if(field.type==="boolean")return input.checked===true;
    return String(input.value??"");
  }
  function applyCommonProperty(fieldName,input){
    if(lockApi()?.canSelection?.("properties",{notify:true})===false)return false;
    const {targets,fields}=commonEditableFields();
    const field=fields.find(item=>item.name===fieldName);
    if(!field||!targets.length)return false;
    const next=parsePropertyInput(field,input);
    if(field.type==="text"&&fieldName==="name"&&!String(next).trim()){
      eng()?.toast?.("Имя не может быть пустым");return false;
    }
    const mutate=()=>{
      for(const target of targets)target.fields[fieldName].set(next);
      return true;
    };
    const label="Свойства: "+field.label+" ("+targets.length+")";
    const command=eng()?.modelCommand;
    let ok;
    try{ok=typeof command==="function"?command(label,mutate):mutate();}
    catch(error){eng()?.toast?.(String(error?.message??error));return false;}
    if(ok===false)return false;
    try{eng()?.save?.();eng()?.renderAll?.();}catch{}
    try{window.refreshProjectTree?.();}catch{}
    try{layerApi()?.applyAll?.();}catch{}
    render(true);
    return true;
  }
  function editableFieldsHtml(){
    const {targets,fields}=commonEditableFields();
    if(!targets.length)return '<div class="tb-prop-empty">Для этого типа свойства доступны только для просмотра.</div>';
    if(!fields.length)return '<div class="tb-prop-empty">У выбранных объектов нет общих редактируемых свойств.</div>';
    const count=targets.length;
    const lockModes=new Set((lockApi()?.selectionTargets?.()??[]).map((target)=>String(target.mode??"Unlocked")));
    const lockSummary=lockModes.size===1?(lockModes.has("Object")?"🔒 Lock Object":lockModes.has("Position")?"📍 Lock Position":"Unlocked"):"Mixed lock";
    const normalizable=normalizeApi()?.normalizedTargets?.()??[];
    const selectedObjects=normalizeApi()?.selectedTargets?.()??[];
    const normalized=selectedObjects.map(target=>target.object).filter(object=>object?.normalization_provenance?.operation==="FittedToExact");
    const arrayDefs=[...new Map(targets.map(target=>arrayDefinitionForTube(target.object)).filter(Boolean).map(def=>[String(def.id),def])).values()];
    const arrayAction=arrayDefs.length===1
      ?'<div class="tb-prop-edit-row"><label>Associative Array</label><span><button data-property-edit-array>Edit Array / formulas / grips</button></span></div>'
      :'';
    const normalizeActions=(normalizable.length||normalized.length===1)
      ?'<div class="tb-prop-edit-row"><label>Geometry</label><span>'+
        (normalizable.length?'<button data-property-normalize>Fitted → Exact</button>':'')+
        (normalized.length===1?'<button data-property-compare-normalized>Compare Fitted</button>':'')+
        '</span></div>'
      :'';
    return '<div class="tb-prop-edit-card"><div class="tb-prop-edit-title">Редактирование'+(count>1?' · '+count+' объектов':'')+' <span class="tb-prop-kind">· '+lockSummary+'</span></div>'+
      normalizeActions+
      arrayAction+
      '<div class="tb-prop-edit-row"><label>Lock</label><span><button data-property-lock="Object">🔒 Object</button><button data-property-lock="Position">📍 Position</button><button data-property-lock="Unlocked">🔓 Unlock</button></span></div>'+
      fields.map(field=>{
        if(field.type==="boolean"){
          return '<div class="tb-prop-edit-row"><label>'+esc(field.label)+'</label><span><input type="checkbox" data-property-field="'+esc(field.name)+'" data-property-type="boolean" '+(field.value===true?'checked ':'')+'data-property-mixed="'+(field.mixed?'1':'0')+'"><button data-property-apply="'+esc(field.name)+'">Применить</button></span></div>';
        }
        if(field.type==="select"){
          const options=(field.options??[]).map(option=>'<option value="'+esc(option.value)+'" '+(!field.mixed&&String(option.value)===String(field.value)?'selected':'')+'>'+esc(option.label)+'</option>').join("");
          return '<div class="tb-prop-edit-row"><label>'+esc(field.label)+'</label><span><select data-property-field="'+esc(field.name)+'" data-property-type="select">'+(field.mixed?'<option value="" selected disabled>— разные значения —</option>':'')+options+'</select><button data-property-apply="'+esc(field.name)+'">Применить</button></span></div>';
        }
        return '<div class="tb-prop-edit-row"><label>'+esc(field.label)+'</label><span><input data-property-field="'+esc(field.name)+'" data-property-type="text" value="'+(field.mixed?'':esc(field.value))+'" placeholder="'+(field.mixed?'— разные значения —':'')+'"><button data-property-apply="'+esc(field.name)+'">Применить</button></span></div>';
      }).join("")+
      '<div class="tb-prop-edit-note">'+(count>1?'Изменение применяется ко всем совместимым выбранным объектам одной операцией Undo.':'Изменение записывается одной операцией Undo.')+'</div></div>';
  }
  function bindEditableFields(){
    if(!panel)return;
    panel.querySelectorAll("[data-dimension-visibility]").forEach(button=>{
      button.onclick=()=>{
        const id=button.dataset.dimensionVisibility,visible=button.dataset.dimensionVisible==="1";
        window.TubeBenderDimensionGrips?.setDimensionVisible?.(id,!visible);render(true);
      };
    });
    panel.querySelectorAll("[data-dimension-delete]").forEach(button=>{
      button.onclick=()=>{window.TubeBenderDimensionGrips?.deleteDimension?.(button.dataset.dimensionDelete);render(true);};
    });
    panel.querySelectorAll("[data-dimension-copy-audit]").forEach(button=>{
      button.onclick=()=>window.TubeBenderMeasurements?.copyDimensionRebindAudit?.(button.dataset.dimensionCopyAudit);
    });
    panel.querySelectorAll("[data-dimension-open-audit]").forEach(button=>{
      button.onclick=()=>window.TubeBenderMeasurements?.focusDimensionAudit?.(button.dataset.dimensionOpenAudit);
    });
    panel.querySelector("[data-property-edit-array]")?.addEventListener("click",()=>window.TubeBenderEditing?.open?.("array"));
    panel.querySelector("[data-property-normalize]")?.addEventListener("click",()=>{normalizeApi()?.normalizeSelected?.();render(true);});
    panel.querySelector("[data-property-compare-normalized]")?.addEventListener("click",()=>{
      const target=(normalizeApi()?.selectedTargets?.()??[]).find(item=>item.object?.normalization_provenance?.operation==="FittedToExact");
      if(target)normalizeApi()?.compareNormalized?.(target.object.id,{visible:!(target.object.normalization_compare?.enabled===true)});
      render(true);
    });
    panel.querySelectorAll("[data-property-lock]").forEach(button=>{
      button.onclick=()=>{
        const mode=button.dataset.propertyLock;
        if(mode==="Object")lockApi()?.lockObject?.();
        else if(mode==="Position")lockApi()?.lockPosition?.();
        else lockApi()?.unlockSelection?.();
        render(true);
      };
    });
    panel.querySelectorAll('[data-property-field][data-property-type="boolean"]').forEach(input=>{
      input.indeterminate=input.dataset.propertyMixed==="1";
      input.addEventListener("change",()=>{input.indeterminate=false;input.dataset.propertyMixed="0";});
    });
    panel.querySelectorAll("[data-property-apply]").forEach(button=>{
      button.onclick=()=>{
        const name=button.dataset.propertyApply;
        const input=panel.querySelector('[data-property-field="'+CSS.escape(name)+'"]');
        if(input)applyCommonProperty(name,input);
      };
    });
    panel.querySelectorAll('[data-property-field][data-property-type="text"]').forEach(input=>{
      input.addEventListener("keydown",event=>{
        if(event.key==="Enter"){event.preventDefault();applyCommonProperty(input.dataset.propertyField,input);}
      });
    });
  }

  function layerInfoForEntry(entry){
    const layer=layerApi()?.entryLayer?.(entry);
    const style=layerApi()?.currentStyleForEntry?.(entry);
    return {
      layer:layer?.name??"—",
      style:style?String(style.color)+" · "+String(style.linetype)+" · "+String(style.lineweight_mm)+" mm":"—"
    };
  }
  function assemblyEditContextLabel(){
    const api=assembliesApi();
    return api?.editing?.()?api.breadcrumb?.()??"Edit Assembly":null;
  }
  function lockLabelForEntry(entry){
    const status=lockApi()?.statusForEntry?.(entry);
    return status?.mode==="Object"?"🔒 Lock Object":status?.mode==="Position"?"📍 Lock Position":"Unlocked";
  }
  function assemblyPortAnchorLabel(port){
    const anchor=port?.assembly_constraint;
    if(!anchor?.assembly_id||!anchor?.local_position_mm)return null;
    const p=anchor.local_position_mm;
    return String(anchor.assembly_id)+" · local ("+
      [p.x,p.y,p.z].map(value=>Number(value).toFixed(3)).join(", ")+")";
  }
  function arrayDefinitionForTube(tube){
    if(!tube)return null;
    const api=arraysApi(),memberId=tube?.array_member?.array_id;
    if(memberId)return api?.definitionById?.(memberId)??null;
    const defs=(api?.definitions?.()??[]).filter(def=>(def.source_tube_ids??[]).some(id=>String(id)===String(tube.id)));
    return defs.length===1?defs[0]:null;
  }
  function arrayRoleForTube(tube,def){
    if(!tube||!def)return null;
    if(String(tube?.array_member?.array_id??"")===String(def.id))return "Derived member #"+String(tube.array_member.member_index??"?");
    if((def.source_tube_ids??[]).some(id=>String(id)===String(tube.id)))return "Source";
    return null;
  }
  function arrayDetailsRows(tube){
    const def=arrayDefinitionForTube(tube);if(!def)return [];
    let evaluated=null;
    try{evaluated=arraysApi()?.evaluatedParameters?.(def,project())??null;}
    catch(error){evaluated={error:String(error?.message??error)};}
    return [
      ["Array",def.name??def.id],["Array ID",def.id],["Array type",def.type],["Array role",arrayRoleForTube(tube,def)],
      ["Array status",def.status],["Evaluated parameters",evaluated],["Formulas",def.parameter_formulas??{}]
    ].filter(row=>row[1]!=null);
  }
  function commonTubeProps(tube){
    if(!tube)return [];
    return [
      ["ID",tube.id],
      ["Имя",tube.name],
      ["Part number",tube.partNumber??tube.part_number],
      ["Тип","Tube"],
      ["Диаметр",tube.diameter_mm??tube.outerDiameterMm??tube.OD_mm??tube.OD],
      ["Стенка",tube.wall_mm??tube.wallThicknessMm??tube.wall_thickness_mm],
      ["Origin",tube.origin],
      ["Start axis",tube.startAxis],
      ["Tooling",tube.toolingId??tube.tooling_id],
      ["Material",tube.material_profile_id],
      ["Import",tube.currentProjectImport?.source_format??tube.importEvidence?.source?.format],
      ["Source file",tube.currentProjectImport?.source_file??tube.importEvidence?.source?.file],
      ["Readonly",tube.readonly===true],
      ["Lock",lockLabelForEntry({kind:"tube",tubeId:tube.id})],
      ["P1",tube?.engineering?.ports?.P1?.locked===true?"⚓ fixed":"⚓ fixed"],
      ["P1 Assembly anchor",assemblyPortAnchorLabel(tube?.engineering?.ports?.P1)],
      ["P2",tube?.engineering?.ports?.P2?.locked===true?"⚓ fixed":"free"],
      ["P2 Assembly anchor",assemblyPortAnchorLabel(tube?.engineering?.ports?.P2)],
      ["Layer",layerInfoForEntry({kind:"tube",tubeId:tube.id}).layer],
      ["Style",layerInfoForEntry({kind:"tube",tubeId:tube.id}).style],
      ["Geometry status",tube.geometry_status??(tube.normalization_provenance?.operation==="FittedToExact"?"Exact":null)],
      ["Normalized from",tube.normalized_from_fitted_id],
      ["Max correction",tube.normalization_provenance?.correction?.max_abs_correction],
      ["Assembly context",assemblyEditContextLabel()]
    ].filter((row)=>row[1]!=null);
  }
  function describe(entry){
    const p=project();
    if(!entry)return {title:"Неизвестный объект",kind:"unknown",groups:[]};
    if(entry.kind==="tube"){
      const tube=findTube(entry.tubeId);
      const arrayRows=arrayDetailsRows(tube);
      return {title:tube?.name??"Tube",kind:"tube",groups:[
        {name:"Общие",rows:commonTubeProps(tube)},
        {name:"Геометрия",rows:[["Элементов",tube?.rows?.length??0],["CLR bends",(tube?.rows??[]).filter(r=>r?.type==="BEND").length]]},
        ...(arrayRows.length?[{name:"Associative Array",rows:arrayRows}]:[])
      ]};
    }
    if(["row","origin","end"].includes(entry.kind)){
      const tube=findTube(entry.tubeId);
      const row=entry.kind==="row"?tube?.rows?.[Number(entry.rowIndex)]:null;
      const rows=entry.kind==="row"?[
        ["Тип",row?.type],["Element ID",row?.elementId],["Length",row?.length],["Angle",row?.angle],
        ["Plane",row?.plane],["CLR",row?.clr??row?.radius],["Formula",row?.lengthFormula??row?.angleFormula]
      ]:[
        ["Тип",entry.kind==="origin"?"Origin":"End"],["Tube",tube?.name??tube?.id],["Tube ID",tube?.id]
      ];
      return {title:(tube?.name??"Tube")+" · "+(entry.kind==="row"?(row?.type??"Element")+" #"+(Number(entry.rowIndex)+1):entry.kind),kind:entry.kind,groups:[
        {name:"Объект",rows},{name:"Родительская труба",rows:commonTubeProps(tube).slice(0,6)}
      ]};
    }
    if(entry.kind==="group"){
      const group=groupsApi()?.groupById?.(entry.groupId);
      const descendants=group?groupsApi()?.domain?.groupDescendantIds?.(p,group.id)??[]:[];
      return {title:group?.name??"Group",kind:"group",groups:[
        {name:"Group",rows:[
          ["ID",group?.id],["Имя",group?.name],["Members",group?.members?.length??0],
          ["Nested groups",descendants.length],["Visible",group?.visible!==false],["Lock",lockLabelForEntry(entry)]
        ]},
        {name:"Семантика",rows:[["Тип","Logical Group"],["Geometry merged",false],["Dependencies preserved",true]]}
      ]};
    }
    if(entry.kind==="project-assembly"){
      const assembly=assembliesApi()?.assemblyById?.(entry.assemblyId);
      const descendants=assembly?assembliesApi()?.domain?.assemblyDescendantIds?.(p,assembly.id)??[]:[];
      return {title:assembly?.name??"Assembly",kind:"project-assembly",groups:[
        {name:"Assembly",rows:[
          ["ID",assembly?.id],["Имя",assembly?.name],["Members",assembly?.members?.length??0],
          ["Nested assemblies",descendants.length],["Visible",assembly?.visible!==false],
          ["Fixed",assembly?.fixed===true],["Lock",lockLabelForEntry(entry)]
        ]},
        {name:"Local coordinate system",rows:[
          ["Origin",assembly?.frame?.origin_mm],["Quaternion",assembly?.frame?.rotation_quaternion]
        ]},
        {name:"Семантика",rows:[
          ["Тип","Constructive Assembly"],["Local coordinates",true],["Geometry merged",false],["Dependencies preserved",true]
        ]}
      ]};
    }
    if(entry.kind==="assembly"||entry.kind==="assembly-part"){
      return {title:entry.kind==="assembly"?"Assembly":"Assembly Part",kind:entry.kind,groups:[{name:"Связь",rows:[
        ["Assembly ID",entry.assemblyId],["Part",entry.part??entry.partId],["Tube ID",entry.tubeId],["Row",entry.rowIndex]
      ]}]};
    }
    if(entry.kind==="dimension"){
      const dimension=(p?.engineering_dimensions??[]).find(item=>String(item?.id)===String(entry.dimensionId))??null;
      const audit=window.TubeBenderMeasurements??null;
      const geometryClass=audit?.dimensionAuditGeometryClass?.(dimension)??null;
      const reviewReasons=audit?.dimensionAuditReviewReasons?.(dimension)??[];
      const fittedStats=audit?.dimensionFittedAuditStats?.(dimension)??null;
      const refs=(dimension?.references??[]).map((ref,index)=>({
        index,
        object_id:ref?.object_id,
        subentity_id:ref?.subentity_id,
        snap_type:ref?.snap_type,
        geometry_status:ref?.geometry_status,
        fitting_error:ref?.fitting_error??null,
        confidence:ref?.confidence??null,
        evidence:ref?.evidence??null,
        section_snapshot:ref?.section_snapshot??null
      }));
      return {title:dimension?.note??"Dimension",kind:"dimension",dimensionId:dimension?.id,visible:dimension?.visible!==false,groups:[
        {name:"Dimension",rows:[
          ["ID",dimension?.id],["Kind",dimension?.kind],["Mode",dimension?.mode],["Value",dimension?.value],
          ["Status",dimension?.status],["Visible",dimension?.visible!==false],["Cross assembly",dimension?.cross_assembly?.cross_assembly===true]
        ]},
        {name:"Associativity",rows:[
          ["References",refs],["Reference count",refs.length],
          ["Stale reason",dimension?.stale_reason],["Stale at Section View",dimension?.stale_at_section_view]
        ]},
        {name:"Trusted geometry audit",rows:[
          ["Geometry class",geometryClass],
          ["Needs review",reviewReasons.length>0],
          ["Review reasons",reviewReasons],
          ["Fitted reference count",fittedStats?.reference_count],
          ["Max fit error mm",fittedStats?.max_error_mm],
          ["Max fit error deg",fittedStats?.max_error_deg],
          ["Min confidence",fittedStats?.min_confidence],
          ["Fitted stats",fittedStats]
        ]},
        {name:"Rebind audit",rows:[
          ["Rebound from stale",dimension?.rebound_from_stale===true],
          ["Rebound at Section View",dimension?.rebound_at_section_view],
          ["Rebind history",dimension?.rebound_history??[]]
        ]}
      ]};
    }
    if(entry.kind==="section-derived"){
      const record=window.TubeBenderSectionView?.derivedSelectionById?.(entry.derivedId)??null;
      return {title:"Section-derived Geometry",kind:"section-derived",groups:[
        {name:"Derived geometry",rows:[
          ["ID",entry.derivedId],["Readonly",true],["Virtual",true],
          ["Section mode",record?.section_mode],["Section face",record?.section_face],
          ["Geometry status",record?.geometry_status??"SectionDerived"],
          ["Source geometry",record?.source_geometry],["Source object",record?.object_id]
        ]},
        {name:"Contour segment",rows:[
          ["Start",record?.segment?.start],["Midpoint",record?.segment?.midpoint],["End",record?.segment?.end],
          ["Screen distance",record?.screen_distance_px]
        ]},
        {name:"Evidence",rows:[
          ["Evidence",record?.evidence],["Editable",false],["Persistent object",false]
        ]}
      ]};
    }
    if(entry.kind==="ref"){
      const scene=findScene(entry.sceneId),node=findNode(scene?.tree,entry.nodeId);
      return {title:node?.label??"Source / Reference",kind:"ref",groups:[
        {name:"Source / Reference",rows:[
          ["Scene",scene?.name??scene?.source_file],["Scene ID",scene?.id],["Node ID",node?.id],["Label",node?.label],
          ["Readonly",true],["Geometry status",node?.geometry_status],["Editable part",node?.editable_part_number],
          ["Geometry instances",node?.geometry_instances?.length??0],["Children",node?.children?.length??0]
        ]}
      ]};
    }
    if(entry.kind==="mesh-instance"){
      const instance=refApi()?.meshInstanceById?.(p,entry.instanceId);
      return {title:instance?.name??"Editable Mesh Instance",kind:"mesh-instance",groups:[
        {name:"Instance",rows:[
          ["ID",instance?.id],["Link",instance?.link_status],["Visible",instance?.visible!==false],
          ["Lock",lockLabelForEntry(entry)],
          ["Layer",layerInfoForEntry(entry).layer],["Style",layerInfoForEntry(entry).style],
          ["Assembly context",assemblyEditContextLabel()],
          ["Position",instance?.transform?.position_mm],["Rotation",instance?.transform?.rotation_deg]
        ]},
        {name:"Source",rows:[
          ["Scene ID",instance?.source?.scene_id],["Node ID",instance?.source?.node_id],
          ["Source file",instance?.source?.source_file],["Label",instance?.source?.label],
          ["Compare Source",instance?.compare_source===true]
        ]}
      ]};
    }
    return {title:String(entry.kind??"Object"),kind:String(entry.kind??"unknown"),groups:[{name:"Selection",rows:Object.entries(entry)}]};
  }
  function ensureStyles(){
    if(document.getElementById("tbPropertiesStyles"))return;
    const s=document.createElement("style");s.id="tbPropertiesStyles";s.textContent=
      '#tbPropertiesToggle{position:fixed;right:14px;top:54px;z-index:120360;background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:6px;padding:6px 10px;cursor:pointer}'+
      '#tbPropertiesPanel{position:fixed;right:14px;top:88px;width:min(360px,calc(100vw - 28px));max-height:calc(100vh - 110px);z-index:120350;display:none;flex-direction:column;background:rgba(13,22,32,.98);color:#edf4fb;border:1px solid #41566f;border-radius:9px;box-shadow:0 14px 40px rgba(0,0,0,.45);font:12px system-ui}#tbPropertiesPanel.open{display:flex}'+
      '.tb-prop-head{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #304154}.tb-prop-head .grow{flex:1}.tb-prop-body{overflow:auto;padding:8px}.tb-prop-card{border:1px solid #2f4154;border-radius:7px;margin-bottom:8px;overflow:hidden}.tb-prop-title{padding:7px 8px;background:#172433;font-weight:600}.tb-prop-kind{color:#8ea2b7;font-weight:400}.tb-prop-group{padding:7px 8px}.tb-prop-group+.tb-prop-group{border-top:1px solid #263647}.tb-prop-group>strong{display:block;margin-bottom:5px;color:#a9bdd1}.tb-prop-row{display:grid;grid-template-columns:42% 58%;gap:8px;padding:3px 0}.tb-prop-key{color:#8fa3b8}.tb-prop-val{word-break:break-word}.tb-prop-empty{padding:14px;color:#8396aa}';
    document.head.appendChild(s);
  }
  function ensurePanel(){
    if(panel)return panel;
    ensureStyles();
    toggle=document.createElement("button");toggle.id="tbPropertiesToggle";toggle.type="button";toggle.textContent="Свойства";document.body.appendChild(toggle);
    panel=document.createElement("section");panel.id="tbPropertiesPanel";
    panel.innerHTML='<div class="tb-prop-head"><b>Свойства</b><span class="grow"></span><span data-prop-count></span><button data-prop-close>×</button></div><div class="tb-prop-body" data-prop-body></div>';
    document.body.appendChild(panel);
    toggle.onclick=()=>{panel.classList.toggle("open");render(true);};
    panel.querySelector("[data-prop-close]").onclick=()=>panel.classList.remove("open");
    return panel;
  }
  function cardHtml(item){
    const dimensionActions=item.kind==="dimension"&&item.dimensionId
      ?'<div class="tb-prop-group"><strong>Dimension actions</strong><div class="tb-prop-edit-row"><label>Visibility</label><span><button data-dimension-visibility="'+esc(item.dimensionId)+'" data-dimension-visible="'+(item.visible?"1":"0")+'">'+(item.visible?"Hide":"Show")+'</button><button data-dimension-delete="'+esc(item.dimensionId)+'">Delete</button><button data-dimension-copy-audit="'+esc(item.dimensionId)+'">Copy audit JSON</button><button data-dimension-open-audit="'+esc(item.dimensionId)+'">Open in Saved Dimensions</button></span></div></div>'
      :"";
    return '<div class="tb-prop-card"><div class="tb-prop-title">'+esc(item.title)+' <span class="tb-prop-kind">· '+esc(item.kind)+'</span></div>'+
      item.groups.map(group=>'<div class="tb-prop-group"><strong>'+esc(group.name)+'</strong>'+
        group.rows.map(([k,v])=>'<div class="tb-prop-row"><span class="tb-prop-key">'+esc(k)+'</span><span class="tb-prop-val">'+esc(value(v))+'</span></div>').join("")+
      '</div>').join("")+dimensionActions+'</div>';
  }
  function snapshot(){
    const selection=entries();
    return {selection,items:selection.map(describe)};
  }
  function render(force=false){
    const root=ensurePanel(),body=root.querySelector("[data-prop-body]"),data=snapshot();
    const signature=JSON.stringify(data.selection);
    if(!force&&signature===lastSignature&&!root.classList.contains("open"))return;
    lastSignature=signature;
    root.querySelector("[data-prop-count]").textContent=data.items.length?String(data.items.length):"";
    body.innerHTML=data.items.length
      ?editableFieldsHtml()+data.items.map(cardHtml).join("")
      :'<div class="tb-prop-empty">Выберите объект в 3D или TreeView.</div>';
    bindEditableFields();
  }
  function open(){ensurePanel().classList.add("open");render(true);}
  function close(){panel?.classList.remove("open");}
  function install(){
    if(installed)return;installed=true;ensurePanel();render(true);
    window.addEventListener("tubebender-selection-change",()=>render(true));
    window.addEventListener("tubebender-lock-change",()=>render(true));
    window.addEventListener("tubebender-layer-change",()=>render(true));
    window.addEventListener("tubebender-group-change",()=>render(true));
    window.addEventListener("tubebender-normalize-geometry",()=>render(true));
    window.addEventListener("tubebender-assembly-change",()=>render(true));
    window.addEventListener("tubebender-assembly-edit-change",()=>render(true));
    window.addEventListener("tubebender-snap-change",()=>{if(panel?.classList.contains("open"))render(false);});
    window.addEventListener("tubebender-array-change",()=>render(true));
    window.addEventListener("tubebender-dimension-change",()=>render(true));
    window.addEventListener("tubebender-history-change",()=>render(true));
    window.TubeBenderProperties=Object.freeze({open,close,refresh:()=>render(true),snapshot,describe,editableTargets,commonEditableFields,applyCommonProperty});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();