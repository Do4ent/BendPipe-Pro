(()=>{
  const MODULE_URL="__TB_MACHINE_TOOLING_MODULE_URL__";
  let domain=null,installed=false,panel=null,tab="machine-profiles";
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
      return {
        ...t,
        od_mm:Number(manufacturing?.style?.outerDiameter),
        wall_mm:Number(manufacturing?.style?.wallThickness),
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
        const prefix=item.compatibility.status==="Compatible"?"✓":item.compatibility.status==="Conditional"?"△":"✕";
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
    try{domain=await import(MODULE_URL);}catch(error){console.error("Equipment Library failed to load",error);return;}
    shell();
    window.TubeBenderEquipmentLibrary=Object.freeze({open,close,store,refresh:render});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();