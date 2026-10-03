(()=>{
  const MODULE_URL="__TB_MACHINE_TOOLING_MODULE_URL__";
  const SETUP_MODULE_URL="__TB_MACHINE_SETUP_MODULE_URL__";
  const SEQUENCE_MODULE_URL="__TB_BEND_SEQUENCE_MODULE_URL__";
  const SIM_COLLISION_MODULE_URL="__TB_SIM_COLLISION_MODULE_URL__";
  const CLEARANCE_MODULE_URL="__TB_CLEARANCE_MODULE_URL__";
  let domain=null,setupDomain=null,sequenceDomain=null,simCollisionDomain=null,clearanceDomain=null,installed=false,panel=null,tab="machine-profiles";
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clone=(v)=>v==null?v:structuredClone(v);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const api=()=>window.TubeBenderEngineering??null;
  const project=()=>{try{return api()?.activeProject?.()??null;}catch{return null;}};
  const tube=()=>{try{return api()?.activeTube?.()??null;}catch{return null;}};
  const readonly=()=>{try{return api()?.readonly?.()===true;}catch{return false;}};
  const toast=(m)=>{try{api()?.toast?.(String(m??""));}catch{}};

  function store(p=project()){
    const x=p?.equipmentLibrary;
    return x&&typeof x==="object"?x:{
      machine_profiles:[],machine_instances:[],tooling_sets:[],tooling_instances:[]
    };
  }
  function saveStore(next,label="Изменить Equipment Library"){
    const p=project();if(!p)return false;
    const mutate=()=>{p.equipmentLibrary=clone(next);return true;};
    const ok=api()?.modelCommand?api().modelCommand(label,mutate):mutate();
    if(ok===false)return false;
    api()?.save?.();api()?.renderAll?.();
    return true;
  }
  function selected(id,list){return list.find((x)=>String(x.id)===String(id))??null;}
  function option(value,label,isSelected=false){
    return '<option value="'+esc(value)+'" '+(isSelected?'selected':'')+'>'+esc(label)+'</option>';
  }
  function number(v){return v==null?"":String(v);}
  function parseNum(v){const s=String(v??"").trim().replace(",",".");return s===""?null:Number(s);}

  function styles(){
    if(document.getElementById("tbEquipmentUiStyles"))return;
    const s=document.createElement("style");s.id="tbEquipmentUiStyles";s.textContent=`
#tbEquipmentButton{position:fixed;right:16px;bottom:58px;z-index:120250;border:1px solid rgba(124,151,181,.55);background:#1e2936;color:#eef5ff;border-radius:8px;padding:9px 13px;font:600 12px system-ui;box-shadow:0 8px 28px rgba(0,0,0,.35);cursor:pointer}
#tbEquipmentPanel{position:fixed;z-index:120310;left:max(12px,calc(50vw - 480px));top:max(12px,calc(50vh - 345px));width:min(960px,calc(100vw - 24px));height:min(690px,calc(100vh - 24px));display:none;flex-direction:column;background:#101923;color:#edf4fb;border:1px solid #43546a;border-radius:10px;box-shadow:0 18px 52px rgba(0,0,0,.58);font:12px system-ui}
#tbEquipmentPanel.open{display:flex}.tb-eq-head{display:flex;align-items:center;padding:10px 12px;border-bottom:1px solid #2c3948}.tb-eq-head b{font-size:14px}.tb-eq-head .sp{flex:1}
.tb-eq-head button,.tb-eq-actions button,.tb-eq-toolbar button{background:#243244;color:#eef5ff;border:1px solid #43566c;border-radius:5px;padding:6px 9px;cursor:pointer}
.tb-eq-tabs{display:flex;gap:2px;padding:6px 8px;border-bottom:1px solid #293746;overflow:auto}.tb-eq-tabs button{background:transparent;border:0;color:#9fb1c4;padding:7px 9px;border-radius:5px;white-space:nowrap;cursor:pointer}.tb-eq-tabs button.active{background:#26394d;color:#fff}
.tb-eq-body{flex:1;min-height:0;overflow:auto;padding:10px}.tb-eq-toolbar{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:9px}.tb-eq-table{width:100%;border-collapse:collapse}.tb-eq-table th,.tb-eq-table td{border-bottom:1px solid #263442;padding:6px 7px;text-align:left}.tb-eq-table th{position:sticky;top:0;background:#172330}.tb-eq-table tr[data-id]{cursor:pointer}.tb-eq-table tr[data-id]:hover{background:#1b2b3c}
.tb-eq-section{border:1px solid #2d3d4e;border-radius:7px;padding:10px;margin:8px 0}.tb-eq-section h3{margin:0 0 9px;font-size:12px}.tb-eq-grid{display:grid;grid-template-columns:175px minmax(170px,1fr) 175px minmax(170px,1fr);gap:8px 10px;align-items:center}.tb-eq-grid input,.tb-eq-grid select,.tb-eq-grid textarea{background:#0b131c;color:#eef5ff;border:1px solid #40536a;border-radius:5px;padding:6px 7px;box-sizing:border-box}.tb-eq-grid textarea{min-height:72px;resize:vertical}.tb-eq-wide{min-width:0;width:100%}.tb-eq-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:12px}.tb-eq-note{color:#9fafbf;line-height:1.45}.tb-eq-error{color:#ff7a7a}.tb-eq-warning{color:#f0c85b}.tb-eq-ok{color:#58d77e}.tb-eq-assign{display:grid;grid-template-columns:180px minmax(240px,1fr);gap:9px 12px;max-width:760px}.tb-eq-assign select{background:#0b131c;color:#eef5ff;border:1px solid #40536a;border-radius:5px;padding:6px 7px}
@media(max-width:760px){.tb-eq-grid{grid-template-columns:130px 1fr}.tb-eq-assign{grid-template-columns:1fr}}
`;document.head.appendChild(s);
  }

  function shell(){
    if(panel)return panel;
    styles();
    const b=document.createElement("button");b.id="tbEquipmentButton";b.type="button";b.textContent="Оборудование";b.onclick=()=>open();document.body.appendChild(b);
    panel=document.createElement("section");panel.id="tbEquipmentPanel";
    panel.innerHTML='<div class="tb-eq-head"><b>Equipment Library</b><span class="sp"></span><button data-eq-close>×</button></div>'+
      '<div class="tb-eq-tabs">'+
      '<button data-tab="machine-profiles">Machine Profiles</button>'+
      '<button data-tab="machine-instances">Machine Instances</button>'+
      '<button data-tab="tooling-sets">Tooling Sets</button>'+
      '<button data-tab="tooling-instances">Tooling Instances</button>'+
      '<button data-tab="setups">Machine Setups</button>'+
      '<button data-tab="trim">Trim / Cut</button>'+
      '<button data-tab="sequence">Bend Sequence</button>'+
      '<button data-tab="simulation">Simulation</button>'+
      '<button data-tab="clearance">Clearance Monitor</button>'+
      '<button data-tab="tube">Труба</button></div><div class="tb-eq-body"></div>';
    document.body.appendChild(panel);
    $("[data-eq-close]",panel).onclick=close;
    $(".tb-eq-tabs",panel).onclick=(e)=>{const b=e.target.closest("[data-tab]");if(!b)return;tab=b.dataset.tab;render();};
    return panel;
  }
  function open(next=tab){tab=next;shell().classList.add("open");render();}
  function close(){panel?.classList.remove("open");}
  function render(){
    $$(".tb-eq-tabs button",panel).forEach((b)=>b.classList.toggle("active",b.dataset.tab===tab));
    if(tab==="machine-profiles")renderMachineProfiles();
    else if(tab==="machine-instances")renderMachineInstances();
    else if(tab==="tooling-sets")renderToolingSets();
    else if(tab==="tooling-instances")renderToolingInstances();
    else if(tab==="setups")renderMachineSetups();
    else if(tab==="trim")renderTrimCut();
    else if(tab==="sequence")renderSequenceAnalysis();
    else if(tab==="simulation")renderSimulationCollision();
    else if(tab==="clearance")renderClearanceMonitors();
    else renderTubeAssignment();
  }

  function tablePage({title,key,columns,newLabel,onEdit}){
    const body=$(".tb-eq-body",panel),lib=store(),rows=lib[key]??[];
    body.innerHTML='<div class="tb-eq-toolbar"><button data-new>+ '+esc(newLabel)+'</button></div>'+
      '<div class="tb-eq-section"><h3>'+esc(title)+'</h3><table class="tb-eq-table"><thead><tr>'+
      columns.map((c)=>'<th>'+esc(c.label)+'</th>').join("")+'</tr></thead><tbody>'+
      rows.map((row)=>'<tr data-id="'+esc(row.id)+'">'+columns.map((c)=>'<td>'+esc(c.get(row)??"—")+'</td>').join("")+'</tr>').join("")+
      '</tbody></table><div class="tb-eq-note" style="margin-top:8px">Двойной клик — редактировать. Правый клик — удалить.</div></div>';
    $("[data-new]",body).onclick=()=>onEdit(null);
    $$("tr[data-id]",body).forEach((tr)=>{
      tr.ondblclick=()=>onEdit(tr.dataset.id);
      tr.oncontextmenu=(e)=>{e.preventDefault();if(window.confirm("Удалить запись?"))deleteRecord(key,tr.dataset.id);};
    });
  }
  function deleteRecord(key,id){
    if(readonly()){toast("Проект открыт только для просмотра");return;}
    const lib=clone(store());
    const p=project();
    const inUse=(p?.tubes??[]).some((t)=>{
      if(key==="machine_profiles")return t.machine_profile_id===id;
      if(key==="machine_instances")return t.machine_instance_id===id;
      if(key==="tooling_sets")return t.tooling_set_id===id;
      if(key==="tooling_instances")return t.tooling_instance_id===id;
      return false;
    });
    if(inUse){toast("Запись используется трубой; сначала снимите или замените назначение");return;}
    lib[key]=(lib[key]??[]).filter((x)=>String(x.id)!==String(id));
    saveStore(lib,"Удалить запись Equipment Library");render();
  }

  function renderMachineProfiles(){
    tablePage({title:"Machine Profiles",key:"machine_profiles",newLabel:"Machine Profile",onEdit:editMachineProfile,columns:[
      {label:"Name",get:x=>x.name},{label:"Model",get:x=>x.model},{label:"Technology",get:x=>x.technology},
      {label:"Ø max",get:x=>x.max_diameter_mm},{label:"Stock max",get:x=>x.max_stock_length_mm},{label:"NC Post",get:x=>x.nc_post}
    ]});
  }
  function renderMachineInstances(){
    const lib=store();
    tablePage({title:"Machine Instances",key:"machine_instances",newLabel:"Machine Instance",onEdit:editMachineInstance,columns:[
      {label:"Name",get:x=>x.name},{label:"Machine Profile",get:x=>selected(x.machine_profile_id,lib.machine_profiles)?.name??x.machine_profile_id},
      {label:"Serial",get:x=>x.serial_number},{label:"Location",get:x=>x.location}
    ]});
  }
  function renderToolingSets(){
    tablePage({title:"Tooling Sets",key:"tooling_sets",newLabel:"Tooling Set",onEdit:editToolingSet,columns:[
      {label:"Name",get:x=>x.name},{label:"Ø",get:x=>x.diameter_mm},{label:"Wall",get:x=>(x.wall_min_mm??"—")+" … "+(x.wall_max_mm??"—")},
      {label:"CLR",get:x=>x.clr_mm},{label:"Machine Profiles",get:x=>(x.compatible_machine_profile_ids??[]).length}
    ]});
  }
  function renderToolingInstances(){
    const lib=store();
    tablePage({title:"Tooling Instances",key:"tooling_instances",newLabel:"Tooling Instance",onEdit:editToolingInstance,columns:[
      {label:"Name",get:x=>x.name},{label:"Tooling Set",get:x=>selected(x.tooling_set_id,lib.tooling_sets)?.name??x.tooling_set_id},
      {label:"Serial",get:x=>x.serial_number},{label:"Angle correction",get:x=>x.angle_correction_deg}
    ]});
  }

  function form(title,fields,onSave){
    const body=$(".tb-eq-body",panel);
    body.innerHTML='<div class="tb-eq-section"><h3>'+esc(title)+'</h3><div class="tb-eq-grid">'+fields.map((f)=>{
      const control=f.type==="select"
        ?'<select data-f="'+esc(f.key)+'">'+f.options.map((o)=>option(o.value,o.label,String(o.value)===String(f.value??""))).join("")+'</select>'
        :f.type==="textarea"
          ?'<textarea class="tb-eq-wide" data-f="'+esc(f.key)+'">'+esc(f.value??"")+'</textarea>'
          :'<input data-f="'+esc(f.key)+'" type="'+(f.type==="number"?"text":"text")+'" value="'+esc(f.value??"")+'">';
      return '<label>'+esc(f.label)+'</label>'+control;
    }).join("")+'</div><div data-validation class="tb-eq-note"></div><div class="tb-eq-actions"><button data-cancel>Отмена</button><button data-save>Сохранить</button></div></div>';
    $("[data-cancel]",body).onclick=render;
    $("[data-save]",body).onclick=()=>{try{onSave(body);}catch(error){toast(error.message);}};
    return body;
  }
  function values(body){
    const out={};$$("[data-f]",body).forEach((el)=>out[el.dataset.f]=el.value);return out;
  }
  function upsert(key,record,label){
    const lib=clone(store()),items=lib[key]??[],index=items.findIndex((x)=>x.id===record.id);
    if(index>=0)items[index]=record;else items.push(record);lib[key]=items;
    saveStore(lib,label);render();
  }

  function editMachineProfile(id){
    if(readonly()){toast("Проект открыт только для просмотра");return;}
    const lib=store(),x=id?selected(id,lib.machine_profiles):null;
    const body=form(x?"Machine Profile":"New Machine Profile",[
      {key:"name",label:"Name *",value:x?.name},{key:"manufacturer",label:"Manufacturer",value:x?.manufacturer},
      {key:"model",label:"Model",value:x?.model},{key:"technology",label:"Technology",value:x?.technology},
      {key:"max_diameter_mm",label:"Max diameter, mm",value:number(x?.max_diameter_mm),type:"number"},
      {key:"max_stock_length_mm",label:"Max stock length, mm",value:number(x?.max_stock_length_mm),type:"number"},
      {key:"min_feed_mm",label:"Min feed, mm",value:number(x?.min_feed_mm),type:"number"},
      {key:"max_bend_angle_deg",label:"Max bend angle, °",value:number(x?.max_bend_angle_deg),type:"number"},
      {key:"clamp_min_mm",label:"Clamp min, mm",value:number(x?.clamp_min_mm),type:"number"},
      {key:"rotation_limit_deg",label:"Rotation limit, °",value:number(x?.rotation_limit_deg),type:"number"},
      {key:"head_radius_mm",label:"Head radius, mm",value:number(x?.head_radius_mm),type:"number"},
      {key:"head_length_mm",label:"Head length, mm",value:number(x?.head_length_mm),type:"number"},
      {key:"head_height_mm",label:"Head height, mm",value:number(x?.head_height_mm),type:"number"},
      {key:"nc_post",label:"NC Post",value:x?.nc_post??"generic-ybc"}
    ],(root)=>{
      const v=values(root);
      const rec=domain.createMachineProfile({...v,
        max_diameter_mm:parseNum(v.max_diameter_mm),max_stock_length_mm:parseNum(v.max_stock_length_mm),
        min_feed_mm:parseNum(v.min_feed_mm),max_bend_angle_deg:parseNum(v.max_bend_angle_deg),
        clamp_min_mm:parseNum(v.clamp_min_mm),rotation_limit_deg:parseNum(v.rotation_limit_deg),
        head_radius_mm:parseNum(v.head_radius_mm),head_length_mm:parseNum(v.head_length_mm),head_height_mm:parseNum(v.head_height_mm),
        confirmed:true
      },{profileId:x?.id});
      const check=domain.validateMachineProfile(rec);if(!check.ok)throw new Error(check.errors.join("; "));
      upsert("machine_profiles",rec,x?"Изменить Machine Profile":"Создать Machine Profile");
    });
  }

  function editMachineInstance(id){
    if(readonly()){toast("Проект открыт только для просмотра");return;}
    const lib=store(),x=id?selected(id,lib.machine_instances):null;
    const mpOptions=[{value:"",label:"— выберите —"},...lib.machine_profiles.map((m)=>({value:m.id,label:m.name}))];
    const body=form(x?"Machine Instance":"New Machine Instance",[
      {key:"name",label:"Name *",value:x?.name},{key:"machine_profile_id",label:"Machine Profile *",value:x?.machine_profile_id,type:"select",options:mpOptions},
      {key:"serial_number",label:"Serial",value:x?.serial_number},{key:"location",label:"Location",value:x?.location},
      {key:"max_stock_length_mm",label:"Override stock max, mm",value:number(x?.limit_overrides?.max_stock_length_mm),type:"number"},
      {key:"max_bend_angle_deg",label:"Override bend max, °",value:number(x?.limit_overrides?.max_bend_angle_deg),type:"number"}
    ],(root)=>{
      const v=values(root);
      const rec=domain.createMachineInstance({...v,limit_overrides:{
        max_stock_length_mm:parseNum(v.max_stock_length_mm),max_bend_angle_deg:parseNum(v.max_bend_angle_deg)
      }},{instanceId:x?.id});
      upsert("machine_instances",rec,x?"Изменить Machine Instance":"Создать Machine Instance");
    });
  }

  function editToolingSet(id){
    if(readonly()){toast("Проект открыт только для просмотра");return;}
    const lib=store(),x=id?selected(id,lib.tooling_sets):null;
    const body=form(x?"Tooling Set":"New Tooling Set",[
      {key:"name",label:"Name *",value:x?.name},{key:"diameter_mm",label:"Tube diameter, mm",value:number(x?.diameter_mm),type:"number"},
      {key:"wall_min_mm",label:"Wall min, mm",value:number(x?.wall_min_mm),type:"number"},
      {key:"wall_max_mm",label:"Wall max, mm",value:number(x?.wall_max_mm),type:"number"},
      {key:"clr_mm",label:"CLR, mm",value:number(x?.clr_mm),type:"number"},
      {key:"min_straight_mm",label:"Min straight, mm",value:number(x?.min_straight_mm),type:"number"},
      {key:"compatible",label:"Compatible Machine Profile IDs",value:(x?.compatible_machine_profile_ids??[]).join(",")},
      {key:"bend_die",label:"Bend die",value:x?.components?.bend_die},{key:"clamp_die",label:"Clamp die",value:x?.components?.clamp_die},
      {key:"pressure_die",label:"Pressure die",value:x?.components?.pressure_die},{key:"mandrel",label:"Mandrel",value:x?.components?.mandrel},
      {key:"wiper_die",label:"Wiper die",value:x?.components?.wiper_die}
    ],(root)=>{
      const v=values(root),ids=v.compatible.split(",").map((s)=>s.trim()).filter(Boolean);
      const rec=domain.createToolingSet({...v,
        compatible_machine_profile_ids:ids,diameter_mm:parseNum(v.diameter_mm),wall_min_mm:parseNum(v.wall_min_mm),
        wall_max_mm:parseNum(v.wall_max_mm),clr_mm:parseNum(v.clr_mm),min_straight_mm:parseNum(v.min_straight_mm),
        components:{bend_die:v.bend_die,clamp_die:v.clamp_die,pressure_die:v.pressure_die,mandrel:v.mandrel,wiper_die:v.wiper_die}
      },{toolingSetId:x?.id});
      const check=domain.validateToolingSet(rec);if(!check.ok)throw new Error(check.errors.join("; "));
      upsert("tooling_sets",rec,x?"Изменить Tooling Set":"Создать Tooling Set");
    });
  }

  function editToolingInstance(id){
    if(readonly()){toast("Проект открыт только для просмотра");return;}
    const lib=store(),x=id?selected(id,lib.tooling_instances):null;
    const tsOptions=[{value:"",label:"— выберите —"},...lib.tooling_sets.map((s)=>({value:s.id,label:s.name}))];
    const miOptions=[{value:"",label:"Не привязан"},...lib.machine_instances.map((m)=>({value:m.id,label:m.name}))];
    const body=form(x?"Tooling Instance":"New Tooling Instance",[
      {key:"name",label:"Name *",value:x?.name},{key:"tooling_set_id",label:"Tooling Set *",value:x?.tooling_set_id,type:"select",options:tsOptions},
      {key:"serial_number",label:"Serial",value:x?.serial_number},{key:"machine_instance_id",label:"Machine Instance",value:x?.machine_instance_id,type:"select",options:miOptions},
      {key:"angle_correction_deg",label:"Angle correction, °",value:number(x?.angle_correction_deg),type:"number"}
    ],(root)=>{
      const v=values(root);
      const rec=domain.createToolingInstance({...v,machine_instance_id:v.machine_instance_id||null,angle_correction_deg:parseNum(v.angle_correction_deg)},{toolingInstanceId:x?.id});
      upsert("tooling_instances",rec,x?"Изменить Tooling Instance":"Создать Tooling Instance");
    });
  }

  function renderMachineSetups(){
    const body=$(".tb-eq-body",panel),t=tube();
    if(!t){body.innerHTML='<div class="tb-eq-note">Нет активной трубы.</div>';return;}
    const list=Array.isArray(t.machine_setups)?t.machine_setups:[];
    body.innerHTML='<div class="tb-eq-toolbar"><button data-setup-new>+ Machine Setup</button></div>'+
      '<div class="tb-eq-section"><h3>Machine Setups · '+esc(t.name??t.id??"")+'</h3><table class="tb-eq-table"><thead><tr><th>Active</th><th>Name</th><th>Datum</th><th>Offset method</th><th>Offset</th><th>Extensions P1/P2</th><th>Status</th></tr></thead><tbody>'+
      list.map((s)=>{const v=setupDomain.validateMachineSetup(s);return '<tr data-setup-id="'+esc(s.id)+'"><td>'+(String(t.active_machine_setup_id??"")===String(s.id)?"●":"")+'</td><td>'+esc(s.name)+'</td><td>'+esc(s.datum?.type??"—")+'</td><td>'+esc(s.offset_method)+'</td><td>'+esc(setupDomain.resolvedSetupOffsetMm(s))+'</td><td>'+esc((s.clamping_extensions?.start_mm??0)+" / "+(s.clamping_extensions?.end_mm??0))+'</td><td>'+esc(v.status)+'</td></tr>';}).join("")+
      '</tbody></table><div class="tb-eq-note" style="margin-top:8px">Двойной клик — редактировать. Один клик — сделать активным. Правый клик — удалить.</div></div>';
    $("[data-setup-new]",body).onclick=()=>editMachineSetup(null);
    $("tr[data-setup-id]",body).forEach((tr)=>{
      tr.onclick=()=>selectSetup(tr.dataset.setupId);
      tr.ondblclick=(e)=>{e.stopPropagation();editMachineSetup(tr.dataset.setupId);};
      tr.oncontextmenu=(e)=>{e.preventDefault();deleteSetup(tr.dataset.setupId);};
    });
  }

  function editMachineSetup(id){
    if(readonly()){toast("Проект открыт только для просмотра");return;}
    const t=tube();if(!t)return;
    const list=Array.isArray(t.machine_setups)?t.machine_setups:[];
    const x=id?list.find((s)=>String(s.id)===String(id))??null:null;
    const body=form(x?"Edit Machine Setup":"New Machine Setup",[
      {key:"name",label:"Name *",value:x?.name??"Setup"},
      {key:"datum_type",label:"Datum",value:x?.datum?.type??"P1",type:"select",options:["P1","P2","point","plane","coordinate_system"].map((v)=>({value:v,label:v}))},
      {key:"offset_method",label:"Offset method",value:x?.offset_method??"physical_end",type:"select",options:[
        {value:"physical_end",label:"Physical end"},{value:"clamp_point",label:"Clamp point"},{value:"feed_zero",label:"Feed zero"},{value:"custom",label:"Custom"}
      ]},
      {key:"offset_mm",label:"Offset, mm",value:number(x?.offset_mm),type:"number"},
      {key:"clamp_point_mm",label:"Clamp point, mm",value:number(x?.clamp_point_mm),type:"number"},
      {key:"feed_zero_mm",label:"Feed zero, mm",value:number(x?.feed_zero_mm),type:"number"},
      {key:"start_extension_mm",label:"Clamping extension P1, mm",value:number(x?.clamping_extensions?.start_mm),type:"number"},
      {key:"end_extension_mm",label:"Clamping extension P2, mm",value:number(x?.clamping_extensions?.end_mm),type:"number"},
      {key:"origin_x",label:"Setup origin X, mm",value:number(x?.transform?.origin_mm?.x),type:"number"},
      {key:"origin_y",label:"Setup origin Y, mm",value:number(x?.transform?.origin_mm?.y),type:"number"},
      {key:"origin_z",label:"Setup origin Z, mm",value:number(x?.transform?.origin_mm?.z),type:"number"}
    ],(root)=>{
      const v=values(root);
      const raw={
        ...(x??{}),name:v.name,datum:{...(x?.datum??{}),type:v.datum_type},
        offset_method:v.offset_method,offset_mm:parseNum(v.offset_mm),
        clamp_point_mm:parseNum(v.clamp_point_mm),feed_zero_mm:parseNum(v.feed_zero_mm),
        clamping_extensions:{start_mm:parseNum(v.start_extension_mm)??0,end_mm:parseNum(v.end_extension_mm)??0},
        transform:{
          origin_mm:{x:parseNum(v.origin_x)??0,y:parseNum(v.origin_y)??0,z:parseNum(v.origin_z)??0},
          x_axis:x?.transform?.x_axis??{x:1,y:0,z:0},
          y_axis:x?.transform?.y_axis??{x:0,y:1,z:0}
        },
        machine_profile_id:t.machine_profile_id??x?.machine_profile_id??null,
        machine_instance_id:t.machine_instance_id??x?.machine_instance_id??null,
        tooling_set_id:t.tooling_set_id??x?.tooling_set_id??null,
        tooling_instance_id:t.tooling_instance_id??x?.tooling_instance_id??null
      };
      const setup=setupDomain.createMachineSetup(raw,{setupId:x?.id});
      const valid=setupDomain.validateMachineSetup(setup);if(!valid.ok)throw new Error(valid.errors.join("; "));
      const mutate=()=>{
        const current=Array.isArray(t.machine_setups)?t.machine_setups:[];
        if(x)t.machine_setups=current.map((s)=>s.id===x.id?clone(setup):s);
        else{t.machine_setups=[...current,clone(setup)];if(!t.active_machine_setup_id)t.active_machine_setup_id=setup.id;}
        t.equipment_calculation_state="Stale";
        return true;
      };
      const ok=api()?.modelCommand?api().modelCommand(x?"Изменить Machine Setup":"Создать Machine Setup",mutate):mutate();
      if(ok!==false){api()?.save?.();api()?.renderAll?.();renderMachineSetups();}
    });
  }

  function selectSetup(id){
    if(readonly())return;
    const t=tube();if(!t)return;
    const exists=(t.machine_setups??[]).some((s)=>String(s.id)===String(id));if(!exists)return;
    const mutate=()=>{t.active_machine_setup_id=id;t.equipment_calculation_state="Stale";return true;};
    const ok=api()?.modelCommand?api().modelCommand("Выбрать Machine Setup",mutate):mutate();
    if(ok!==false){api()?.save?.();renderMachineSetups();}
  }

  function deleteSetup(id){
    if(readonly()){toast("Проект открыт только для просмотра");return;}
    if(!window.confirm("Удалить Machine Setup?"))return;
    const t=tube();if(!t)return;
    const mutate=()=>{
      t.machine_setups=(t.machine_setups??[]).filter((s)=>String(s.id)!==String(id));
      if(String(t.active_machine_setup_id??"")===String(id))t.active_machine_setup_id=t.machine_setups[0]?.id??null;
      t.equipment_calculation_state="Stale";return true;
    };
    const ok=api()?.modelCommand?api().modelCommand("Удалить Machine Setup",mutate):mutate();
    if(ok!==false){api()?.save?.();api()?.renderAll?.();renderMachineSetups();}
  }

  function renderTrimCut(){
    const body=$(".tb-eq-body",panel),t=tube();
    if(!t){body.innerHTML='<div class="tb-eq-note">Нет активной трубы.</div>';return;}
    let manufacturing=null;try{manufacturing=api()?.manufacturingData?.(t)??null;}catch{}
    const plan=manufacturing?.trimPlan??window.TubeBenderTrimCutRuntime?.buildPlan?.({
      tube:t,endAllowances:manufacturing?.endAllowances??{},setupExtensions:manufacturing?.setupExtensions??{},style:manufacturing?.style??{}
    });
    const prefs=t.trim_preferences??{};
    const methods=["saw","tube_cutter","laser","manual","other"];
    const block=(end)=>{
      const p=prefs[end]??{},op=plan?.operations?.find((x)=>x.end===end);
      return '<div class="tb-eq-section"><h3>'+end+' · снять '+esc(op?.remove_length_mm??0)+' мм</h3><div class="tb-eq-grid">'+
        '<label>Method</label><select data-trim="'+end+'" data-key="method">'+methods.map((m)=>option(m,m,m===(p.method??"saw"))).join("")+'</select>'+
        '<label>Tolerance, mm</label><input data-trim="'+end+'" data-key="tolerance_mm" value="'+esc(p.tolerance_mm??0.5)+'">'+
        '<label>Plane</label><select data-trim="'+end+'" data-key="plane_mode">'+option("perpendicular_to_centerline","Perpendicular to centerline",(p.plane?.mode??"perpendicular_to_centerline")==="perpendicular_to_centerline")+option("explicit","Explicit",p.plane?.mode==="explicit")+'</select>'+
        '<label>Normal X</label><input data-trim="'+end+'" data-key="normal_x" value="'+esc(p.plane?.normal?.x??1)+'">'+
        '<label>Normal Y</label><input data-trim="'+end+'" data-key="normal_y" value="'+esc(p.plane?.normal?.y??0)+'">'+
        '<label>Normal Z</label><input data-trim="'+end+'" data-key="normal_z" value="'+esc(p.plane?.normal?.z??0)+'">'+
        '<label>Notes</label><input data-trim="'+end+'" data-key="notes" value="'+esc(p.notes??"")+'">'+
        '</div><div class="tb-eq-note">Длина снятия рассчитывается автоматически из cut allowance + end allowance + clamping extension и недоступна для ручного редактирования.</div></div>';
    };
    body.innerHTML=block("P1")+block("P2")+
      '<div class="tb-eq-section"><h3>Итог</h3><div class="tb-eq-note">Заготовка: <b>'+esc(manufacturing?.production??"—")+' мм</b> · снять: <b>'+esc(plan?.required_removal_mm??0)+' мм</b> · после Trim/Cut: <b>'+esc(manufacturing?.finishedLengthAfterTrim??"—")+' мм</b><br>Nominal geometry changed: <b>NO</b></div></div>'+
      '<div class="tb-eq-actions"><button data-trim-save>Сохранить параметры Trim/Cut</button></div>';
    $("[data-trim-save]",body).onclick=()=>{
      if(readonly()){toast("Проект открыт только для просмотра");return;}
      const next={};
      for(const end of ["P1","P2"]){
        const get=(key)=>$('[data-trim="'+end+'"][data-key="'+key+'"]',body)?.value;
        const mode=get("plane_mode")||"perpendicular_to_centerline";
        next[end]={
          end,method:get("method")||"saw",tolerance_mm:parseNum(get("tolerance_mm"))??0.5,
          plane:{mode,point_mm:null,normal:mode==="explicit"?{x:parseNum(get("normal_x"))??1,y:parseNum(get("normal_y"))??0,z:parseNum(get("normal_z"))??0}:null},
          notes:get("notes")||""
        };
      }
      const mutate=()=>{t.trim_preferences=next;t.manufacturing_calculation_state="Stale";return true;};
      const ok=api()?.modelCommand?api().modelCommand("Изменить Trim/Cut",mutate):mutate();
      if(ok!==false){api()?.save?.();api()?.renderAll?.();toast("Trim/Cut сохранён");renderTrimCut();}
    };
  }

  function renderSequenceAnalysis(){
    const body=$(".tb-eq-body",panel),t=tube();
    if(!t){body.innerHTML='<div class="tb-eq-note">Нет активной трубы.</div>';return;}
    let manufacturing=null;try{manufacturing=api()?.manufacturingData?.(t)??null;}catch{}
    const steps=manufacturing?.steps??[];
    if(!steps.length){body.innerHTML='<div class="tb-eq-note">Для трубы нет рассчитанных гибов.</div>';return;}
    const allowReverse=manufacturing?.machine?.supportsReverse===true;
    const priorities=t.sequence_analysis_priorities??{regrips:10,flips:8,rotation:0.01,feed:0.0001,clearance:5,warnings:2};
    let analyses=[];
    try{
      analyses=sequenceDomain.analyzeSequenceCandidates(steps,{
        allow_reverse:allowReverse,
        machine_limits:{
          max_bend_angle_deg:manufacturing?.machine?.maxBendAngle,
          rotation_limit_deg:manufacturing?.machine?.rotationLimit,
          min_feed_mm:manufacturing?.machine?.minFeed
        },
        priorities
      });
    }catch(error){
      body.innerHTML='<div class="tb-eq-error">'+esc(error.message)+'</div>';return;
    }
    const pref=t.sequence_analysis_preference??null;
    const forwardOrder=steps.map((step,index)=>String(step?.elementId??step?.bend_id??step?.bend??index+1));
    body.innerHTML=
      '<div class="tb-eq-section"><h3>Bend Sequence Analysis</h3><div class="tb-eq-note">Результаты — предложения. TubeBender не меняет порядок гибов автоматически. Reverse/нестандартный порядок требует отдельного kinematic rebuild Y/B/C перед Machine Export.</div>'+
      '<table class="tb-eq-table"><thead><tr><th>Rank</th><th>Candidate</th><th>Status</th><th>Order</th><th>Regrips</th><th>Flips</th><th>Rotation</th><th>Feed</th><th>Clearance</th><th>Preferred</th></tr></thead><tbody>'+
      analyses.map((a)=>'<tr data-sequence-id="'+esc(a.candidate_id)+'"><td>'+esc(a.suggestion_rank)+'</td><td>'+esc(a.name)+'</td><td>'+esc(a.status)+'</td><td>'+esc(a.order.join(" → "))+'</td><td>'+esc(a.metrics.regrips)+'</td><td>'+esc(a.metrics.flips)+'</td><td>'+esc(a.metrics.total_rotation_deg)+'</td><td>'+esc(a.metrics.total_feed_mm)+'</td><td>'+esc(a.metrics.min_clearance_mm??"—")+'</td><td>'+(pref?.candidate_id===a.candidate_id?"●":"")+'</td></tr>').join("")+
      '</tbody></table></div>'+
      '<div class="tb-eq-section"><h3>Priorities</h3><div class="tb-eq-grid">'+
      ['regrips','flips','rotation','feed','clearance','warnings'].map((key)=>'<label>'+key+'</label><input data-seq-weight="'+key+'" value="'+esc(priorities[key])+'">').join("")+
      '</div><div class="tb-eq-actions"><button data-seq-weights>Сохранить приоритеты</button><button data-seq-clear>Сбросить preferred</button></div></div>';
    $("tr[data-sequence-id]",body).forEach((tr)=>{
      tr.onclick=()=>{
        const analysis=analyses.find((x)=>x.candidate_id===tr.dataset.sequenceId);if(!analysis)return;
        if(!analysis.valid){toast("Недопустимую последовательность выбрать нельзя");return;}
        const sameAsForward=analysis.order.length===forwardOrder.length&&analysis.order.every((id,index)=>String(id)===String(forwardOrder[index]));
        const mutate=()=>{t.sequence_analysis_preference={
          candidate_id:analysis.candidate_id,name:analysis.name,order:[...analysis.order],
          chosen_explicitly:true,kinematic_rebuild_required:!sameAsForward,
          analysis_status:analysis.status,metrics:clone(analysis.metrics)
        };t.manufacturing_calculation_state="Stale";return true;};
        const ok=api()?.modelCommand?api().modelCommand("Выбрать предпочтительную последовательность",mutate):mutate();
        if(ok!==false){api()?.save?.();renderSequenceAnalysis();}
      };
    });
    $("[data-seq-weights]",body).onclick=()=>{
      const next={};$("[data-seq-weight]",body).forEach((el)=>next[el.dataset.seqWeight]=parseNum(el.value)??0);
      const mutate=()=>{t.sequence_analysis_priorities=next;t.manufacturing_calculation_state="Stale";return true;};
      const ok=api()?.modelCommand?api().modelCommand("Изменить приоритеты последовательности",mutate):mutate();
      if(ok!==false){api()?.save?.();renderSequenceAnalysis();}
    };
    $("[data-seq-clear]",body).onclick=()=>{
      const mutate=()=>{t.sequence_analysis_preference=null;t.manufacturing_calculation_state="Stale";return true;};
      const ok=api()?.modelCommand?api().modelCommand("Сбросить предпочтительную последовательность",mutate):mutate();
      if(ok!==false){api()?.save?.();renderSequenceAnalysis();}
    };
  }

  function simulationCollisionReport(t=tube(),manufacturing=null){
    if(!t||!simCollisionDomain)return null;
    let data=manufacturing;
    if(!data){try{data=api()?.manufacturingData?.(t)??null;}catch{}}
    const settings=t.simulation_collision_settings??{};
    const persisted=Array.isArray(t.simulation_collision_observations)?t.simulation_collision_observations:[];
    const live=window.TubeBenderSimulationCollisionLive?.observationsForTube?.(t.id)??[];
    const observations=[...persisted,...live];
    const report=simCollisionDomain.analyzeBendingSimulation(data?.steps??[],observations,{
      warning_clearance_mm:Number.isFinite(Number(settings.warning_clearance_mm))?Number(settings.warning_clearance_mm):5,
      contact_tolerance_mm:Number.isFinite(Number(settings.contact_tolerance_mm))?Number(settings.contact_tolerance_mm):0.1,
      contact_rule:["allow","warn","forbid"].includes(settings.contact_rule)?settings.contact_rule:"warn"
    });
    const mode=Object.values(simCollisionDomain.SimulationCollisionMode).includes(settings.mode)
      ?settings.mode
      :simCollisionDomain.SimulationCollisionMode.MONITOR;
    const decision=simCollisionDomain.simulationModeDecision(report,mode);
    return Object.freeze({report,decision,mode});
  }

  function renderSimulationCollision(){
    const body=$(".tb-eq-body",panel),t=tube();
    if(!t){body.innerHTML='<div class="tb-eq-note">Нет активной трубы.</div>';return;}
    let manufacturing=null;try{manufacturing=api()?.manufacturingData?.(t)??null;}catch{}
    const steps=manufacturing?.steps??[];
    if(!steps.length){body.innerHTML='<div class="tb-eq-note">Для трубы нет рассчитанных гибов.</div>';return;}
    const settings=t.simulation_collision_settings??{};
    const result=simulationCollisionReport(t,manufacturing);
    const report=result?.report;
    body.innerHTML=
      '<div class="tb-eq-section"><h3>Bending Simulation Collision</h3>'+
      '<div class="tb-eq-grid">'+
      '<label>Mode</label><select data-sim-mode>'+
      ['Monitor','Stop','ValidationLock'].map((x)=>option(x,x,x===(result?.mode??"Monitor"))).join("")+
      '</select>'+
      '<label>Warning clearance, mm</label><input data-sim-warning value="'+esc(settings.warning_clearance_mm??5)+'">'+
      '<label>Contact tolerance, mm</label><input data-sim-contact value="'+esc(settings.contact_tolerance_mm??0.1)+'">'+
      '<label>Contact rule</label><select data-sim-contact-rule>'+
      ['allow','warn','forbid'].map((x)=>option(x,x,x===(settings.contact_rule??"warn"))).join("")+
      '</select></div>'+
      '<div class="tb-eq-actions"><button data-sim-save>Сохранить режим</button></div>'+
      '<div class="tb-eq-note">Monitor only — только показывает результат. Stop on Collision — блокирует playback при Collision/Impossible. Validation Lock — дополнительно блокирует production release при Collision/Impossible или неполной проверке.</div></div>'+
      '<div class="tb-eq-section"><h3>Per-bend status</h3>'+
      '<div class="tb-eq-note">Overall: <b>'+esc(report?.status??"NotChecked")+'</b> · checked '+esc(report?.checked_bend_count??0)+' / '+esc(report?.bend_count??steps.length)+' · min clearance '+esc(report?.min_clearance_mm??"—")+' mm</div>'+
      '<table class="tb-eq-table"><thead><tr><th>Bend</th><th>Status</th><th>Checked</th><th>Min clearance</th><th>Messages</th></tr></thead><tbody>'+
      (report?.per_bend??[]).map((item)=>'<tr><td>'+esc(item.bend??item.bend_id)+'</td><td>'+esc(item.status)+'</td><td>'+(item.checked?'yes':'no')+'</td><td>'+esc(item.min_clearance_mm??"—")+'</td><td>'+esc([...(item.errors??[]),...(item.warnings??[])].join(" · ")||"—")+'</td></tr>').join("")+
      '</tbody></table></div>'+
      '<div class="tb-eq-section"><h3>Collision observations</h3>'+
      '<textarea class="tb-eq-wide" data-sim-observations style="min-height:150px">'+esc(JSON.stringify(t.simulation_collision_observations??[],null,2))+'</textarea>'+
      '<div class="tb-eq-note">Live observations автоматически собираются из simCollisionChecks и хранятся только в runtime. JSON ниже — диагностические/ручные observations, сохраняемые в проекте. Отсутствие checked evidence никогда не считается OK.</div>'+
      '<div class="tb-eq-actions"><button data-sim-observations-save>Сохранить observations</button></div></div>';
    $("[data-sim-save]",body).onclick=()=>{
      if(readonly()){toast("Проект открыт только для просмотра");return;}
      const mode=$("[data-sim-mode]",body).value;
      const warning=parseNum($("[data-sim-warning]",body).value);
      const contact=parseNum($("[data-sim-contact]",body).value);
      const contactRule=$("[data-sim-contact-rule]",body).value;
      const mutate=()=>{t.simulation_collision_settings={
        mode,
        warning_clearance_mm:warning??5,
        contact_tolerance_mm:contact??0.1,
        contact_rule:contactRule
      };t.simulation_calculation_state="Stale";return true;};
      const ok=api()?.modelCommand?api().modelCommand("Изменить режим collision simulation",mutate):mutate();
      if(ok!==false){api()?.save?.();renderSimulationCollision();}
    };
    $("[data-sim-observations-save]",body).onclick=()=>{
      if(readonly()){toast("Проект открыт только для просмотра");return;}
      try{
        const parsed=JSON.parse($("[data-sim-observations]",body).value||"[]");
        if(!Array.isArray(parsed))throw new Error("Observations must be an array");
        parsed.forEach((item)=>simCollisionDomain.normalizeCollisionObservation(item));
        const mutate=()=>{t.simulation_collision_observations=clone(parsed);t.simulation_calculation_state="Stale";return true;};
        const ok=api()?.modelCommand?api().modelCommand("Обновить collision observations",mutate):mutate();
        if(ok!==false){api()?.save?.();renderSimulationCollision();}
      }catch(error){toast(error.message);}
    };
  }

  function projectClearanceMonitors(){
    const p=project();
    return Array.isArray(p?.clearance_monitors)?p.clearance_monitors:[];
  }
  function projectClearanceMeasurements(){
    const p=project();
    const stored=p?.clearance_monitor_measurements&&typeof p.clearance_monitor_measurements==="object"
      ?clone(p.clearance_monitor_measurements):{};
    for(const monitor of projectClearanceMonitors()){
      const tubeIds=(monitor?.members??[]).filter((x)=>x?.kind==="tube").map((x)=>String(x.id));
      if(tubeIds.length!==2)continue;
      let measured=null;
      try{measured=api()?.measureTubeClearance?.(p,tubeIds[0],tubeIds[1])??null;}catch{}
      if(measured?.checked===true&&Number.isFinite(Number(measured.distance_mm))){
        stored[monitor.id]=measured;
      }
    }
    return stored;
  }
  function saveClearanceMonitors(monitors,label){
    const p=project();if(!p)return false;
    const mutate=()=>{p.clearance_monitors=clone(monitors);return true;};
    const ok=api()?.modelCommand?api().modelCommand(label,mutate):mutate();
    if(ok===false)return false;
    api()?.save?.();return true;
  }
  function renderClearanceMonitors(){
    const body=$(".tb-eq-body",panel),monitors=projectClearanceMonitors(),measurements=projectClearanceMeasurements();
    const summary=clearanceDomain.evaluateClearanceMonitors(monitors,measurements);
    body.innerHTML=
      '<div class="tb-eq-toolbar"><button data-clearance-new>+ Clearance Monitor</button></div>'+
      '<div class="tb-eq-section"><h3>Persistent Clearance Monitor</h3>'+
      '<div class="tb-eq-note">Overall: <b>'+esc(summary.status)+'</b> · Red '+summary.red_count+' · Yellow '+summary.yellow_count+' · Green '+summary.green_count+' · Not checked '+summary.not_checked_count+'. Видимость объектов не влияет на расчёт.</div>'+
      '<table class="tb-eq-table"><thead><tr><th>Name</th><th>Members</th><th>Min</th><th>Warn</th><th>Distance</th><th>Status</th><th>Enabled</th></tr></thead><tbody>'+
      summary.results.map((r)=>{
        const m=monitors.find((x)=>x.id===r.monitor_id);
        return '<tr data-clearance-id="'+esc(r.monitor_id)+'"><td>'+esc(r.name)+'</td><td>'+esc((m?.members??[]).map((x)=>x.kind+":"+x.id).join(" ↔ "))+'</td><td>'+esc(m?.minimum_clearance_mm??"—")+'</td><td>'+esc(m?.warning_clearance_mm??"—")+'</td><td>'+esc(r.distance_mm??"—")+'</td><td>'+esc(r.status)+'</td><td>'+(m?.enabled!==false?"yes":"no")+'</td></tr>';
      }).join("")+
      '</tbody></table><div class="tb-eq-note" style="margin-top:8px">Double click — edit. Right click — delete. Tube↔tube пары автоматически используют ту же centerline/segment geometry, что и project collision engine, и получают фактический minimum surface clearance. Другие типы пар остаются NotChecked до появления precise measurement source.</div></div>';
    $("[data-clearance-new]",body).onclick=()=>editClearanceMonitor(null);
    $("tr[data-clearance-id]",body).forEach((tr)=>{
      tr.ondblclick=()=>editClearanceMonitor(tr.dataset.clearanceId);
      tr.oncontextmenu=(e)=>{e.preventDefault();if(!window.confirm("Удалить Clearance Monitor?"))return;const next=clearanceDomain.deleteClearanceMonitor(projectClearanceMonitors(),tr.dataset.clearanceId);if(saveClearanceMonitors(next,"Удалить Clearance Monitor"))renderClearanceMonitors();};
    });
  }
  function editClearanceMonitor(id){
    if(readonly()){toast("Проект открыт только для просмотра");return;}
    const current=id?projectClearanceMonitors().find((x)=>x.id===id):null;
    const body=$(".tb-eq-body",panel);
    body.innerHTML='<div class="tb-eq-section"><h3>'+(current?"Edit":"New")+' Clearance Monitor</h3><div class="tb-eq-grid">'+
      '<label>Name</label><input data-cm="name" value="'+esc(current?.name??"Clearance Monitor")+'">'+
      '<label>Minimum clearance, mm</label><input data-cm="minimum" value="'+esc(current?.minimum_clearance_mm??0)+'">'+
      '<label>Warning clearance, mm</label><input data-cm="warning" value="'+esc(current?.warning_clearance_mm??5)+'">'+
      '<label>Enabled</label><select data-cm="enabled">'+option("true","yes",current?.enabled!==false)+option("false","no",current?.enabled===false)+'</select>'+
      '<label>Members JSON</label><textarea class="tb-eq-wide" data-cm="members">'+esc(JSON.stringify(current?.members??[{kind:"tube",id:tube()?.id??""},{kind:"object",id:""}],null,2))+'</textarea>'+
      '<label>Notes</label><textarea class="tb-eq-wide" data-cm="notes">'+esc(current?.notes??"")+'</textarea>'+
      '</div><div class="tb-eq-actions"><button data-cm-cancel>Отмена</button><button data-cm-save>Сохранить</button></div></div>';
    $("[data-cm-cancel]",body).onclick=renderClearanceMonitors;
    $("[data-cm-save]",body).onclick=()=>{
      try{
        const input={
          name:$('[data-cm="name"]',body).value,
          minimum_clearance_mm:parseNum($('[data-cm="minimum"]',body).value),
          warning_clearance_mm:parseNum($('[data-cm="warning"]',body).value),
          enabled:$('[data-cm="enabled"]',body).value==="true",
          members:JSON.parse($('[data-cm="members"]',body).value||"[]"),
          notes:$('[data-cm="notes"]',body).value
        };
        let next=projectClearanceMonitors();
        if(current)next=clearanceDomain.updateClearanceMonitor(next,current.id,input);
        else next=[...next,clearanceDomain.createClearanceMonitor(input)];
        if(saveClearanceMonitors(next,current?"Изменить Clearance Monitor":"Создать Clearance Monitor"))renderClearanceMonitors();
      }catch(error){toast(error.message);}
    };
  }

  function renderTubeAssignment(){
    const body=$(".tb-eq-body",panel),lib=store(),t=tube();
    if(!t){body.innerHTML='<div class="tb-eq-note">Нет активной трубы.</div>';return;}
    const mp=[{value:"",label:"Legacy / не назначен"},...lib.machine_profiles.map((x)=>({value:x.id,label:x.name}))];
    const mi=[{value:"",label:"Не назначен"},...lib.machine_instances.map((x)=>({value:x.id,label:x.name}))];
    const ts=[{value:"",label:"Legacy / не назначен"},...lib.tooling_sets.map((x)=>({value:x.id,label:x.name}))];
    const ti=[{value:"",label:"Не назначен"},...lib.tooling_instances.map((x)=>({value:x.id,label:x.name}))];
    body.innerHTML='<div class="tb-eq-section"><h3>Оборудование активной трубы</h3><div class="tb-eq-assign">'+
      '<label>Machine Profile</label><select data-a="machine_profile_id">'+mp.map((o)=>option(o.value,o.label,String(o.value)===String(t.machine_profile_id??""))).join("")+'</select>'+
      '<label>Machine Instance</label><select data-a="machine_instance_id">'+mi.map((o)=>option(o.value,o.label,String(o.value)===String(t.machine_instance_id??""))).join("")+'</select>'+
      '<label>Tooling Set</label><select data-a="tooling_set_id">'+ts.map((o)=>option(o.value,o.label,String(o.value)===String(t.tooling_set_id??""))).join("")+'</select>'+
      '<label>Tooling Instance</label><select data-a="tooling_instance_id">'+ti.map((o)=>option(o.value,o.label,String(o.value)===String(t.tooling_instance_id??""))).join("")+'</select>'+
      '</div><div data-check class="tb-eq-note" style="margin-top:10px"></div><div class="tb-eq-actions"><button data-clear>Снять новые назначения</button><button data-apply>Применить</button></div></div>'+
      '<div class="tb-eq-note">Без явного назначения TubeBender использует существующие legacy machine/tooling данные. После назначения новая модель имеет приоритет в технологическом расчёте.</div>';
    const tubeFacts=()=>{
      let manufacturing=null;try{manufacturing=api()?.manufacturingData?.(t)??null;}catch{}
      const odRaw=manufacturing?.style?.outerDiameter,wallRaw=manufacturing?.style?.wallThickness;
      return {
        ...t,
        od_mm:odRaw===null||odRaw===undefined||odRaw===""?NaN:Number(odRaw),
        wall_mm:wallRaw===null||wallRaw===undefined||wallRaw===""?NaN:Number(wallRaw),
        bend_clr_mm:(manufacturing?.steps??[]).map((step)=>Number(step?.radius)).filter(Number.isFinite)
      };
    };
    const candidate=()=>{const x=tubeFacts();$("[data-a]",body).forEach((el)=>x[el.dataset.a]=el.value||null);return x;};
    const selectedMachineProfile=()=>{
      const direct=$('[data-a="machine_profile_id"]',body)?.value;
      if(direct)return selected(direct,lib.machine_profiles);
      const instance=selected($('[data-a="machine_instance_id"]',body)?.value,lib.machine_instances);
      return instance?selected(instance.machine_profile_id,lib.machine_profiles):null;
    };
    const selectedMachineInstance=()=>selected($('[data-a="machine_instance_id"]',body)?.value,lib.machine_instances);
    const refreshToolingSuggestions=()=>{
      const profile=selectedMachineProfile();
      const selectEl=$('[data-a="tooling_set_id"]',body);
      if(!selectEl)return;
      const previous=selectEl.value;
      const suggestions=profile
        ?domain.suggestToolingSets({machineProfile:profile,machineInstance:selectedMachineInstance(),toolingSets:lib.tooling_sets,tube:tubeFacts()})
        :lib.tooling_sets.map((tooling_set)=>({tooling_set,compatibility:{status:"Conditional"}}));
      selectEl.innerHTML=option("","Legacy / не назначен",!previous)+suggestions.map((item)=>{
        const prefix=item.compatibility.status==="Compatible"?"✓":item.compatibility.status==="Conditional"?"△":item.compatibility.status==="Incompatible"?"✕":"?";
        return option(item.tooling_set.id,prefix+" "+item.compatibility.status+" · "+item.tooling_set.name,item.tooling_set.id===previous);
      }).join("");
    };
    const check=()=>{refreshToolingSuggestions();const result=window.TubeBenderEquipmentRuntime?.assignmentCheck?.(project(),candidate());const host=$("[data-check]",body);if(!result){host.textContent="Runtime bridge недоступен";return;}host.className="tb-eq-note "+(result.status==="Error"?"tb-eq-error":result.status==="Warning"?"tb-eq-warning":"tb-eq-ok");host.textContent=result.status+(result.errors.length?" · "+result.errors.join(" · "):result.warnings.length?" · "+result.warnings.join(" · "):"");};
    $("[data-a]",body).forEach((el)=>el.onchange=check);
    $("[data-apply]",body).onclick=()=>{
      if(readonly()){toast("Проект открыт только для просмотра");return;}
      const x=candidate(),result=window.TubeBenderEquipmentRuntime?.assignmentCheck?.(project(),x);
      if(result&&!result.ok){toast(result.errors[0]);return;}
      const mutate=()=>{for(const key of ["machine_profile_id","machine_instance_id","tooling_set_id","tooling_instance_id"])t[key]=x[key];t.equipment_calculation_state="Stale";return true;};
      const ok=api()?.modelCommand?api().modelCommand("Назначить оборудование трубе",mutate):mutate();
      if(ok!==false){api()?.save?.();api()?.renderAll?.();toast("Оборудование назначено");renderTubeAssignment();}
    };
    $("[data-clear]",body).onclick=()=>{
      if(readonly()){toast("Проект открыт только для просмотра");return;}
      const mutate=()=>{for(const key of ["machine_profile_id","machine_instance_id","tooling_set_id","tooling_instance_id"])t[key]=null;t.equipment_calculation_state="Legacy";return true;};
      const ok=api()?.modelCommand?api().modelCommand("Снять назначения оборудования",mutate):mutate();
      if(ok!==false){api()?.save?.();api()?.renderAll?.();renderTubeAssignment();}
    };
    refreshToolingSuggestions();
    check();
  }

  async function install(){
    if(installed)return;installed=true;
    try{[domain,setupDomain,sequenceDomain,simCollisionDomain,clearanceDomain]=await Promise.all([import(MODULE_URL),import(SETUP_MODULE_URL),import(SEQUENCE_MODULE_URL),import(SIM_COLLISION_MODULE_URL),import(CLEARANCE_MODULE_URL)]);}catch(error){console.error("Equipment Library failed to load",error);return;}
    shell();
    window.TubeBenderEquipmentLibrary=Object.freeze({open,close,store,refresh:render,simulationCollisionReport});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();