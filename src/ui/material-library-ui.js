(()=>{
  const MODULE_URL="__TB_MATERIAL_MODULE_URL__";
  const GLOBAL_KEY="tubebender.materials.global.v1";
  let domain=null;
  let installed=false;
  let panel=null;
  let activeTab="library";
  let knownProjectId=null;
  let knownTubeIds=new Set();
  let newTubeTimer=null;

  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];
  const clone=(value)=>value==null?value:structuredClone(value);

  function api(){return window.TubeBenderEngineering??null;}
  function project(){try{return api()?.activeProject?.()??(typeof activeProject==="function"?activeProject():null);}catch{return null;}}
  function tube(){try{return api()?.activeTube?.()??(typeof activeTube==="function"?activeTube():null);}catch{return null;}}
  function stateValue(){try{return api()?.getState?.()??state;}catch{return null;}}
  function readonly(){try{return api()?.readonly?.()===true;}catch{return false;}}
  function toast(message){try{if(typeof api()?.toast==="function")api().toast(message);else if(typeof ptToast==="function")ptToast(message);}catch{}}

  function rawGlobal(){
    try{
      const parsed=JSON.parse(localStorage.getItem(GLOBAL_KEY)||"null");
      if(parsed&&typeof parsed==="object")return parsed;
    }catch{}
    return {global_profiles:[],global_templates:[],global_categories:[]};
  }
  function projectStore(p=project()){
    const value=p?.materialLibrary;
    return value&&typeof value==="object"?value:{
      project_profiles:[],
      project_templates:[],
      project_categories:[],
      default_material_profile_id:null,
      default_material_template_id:null
    };
  }
  function combinedLibrary(){
    const g=rawGlobal(), p=projectStore();
    return domain.createMaterialLibrary({
      global_profiles:g.global_profiles??[],
      global_templates:g.global_templates??[],
      global_categories:g.global_categories??[],
      project_profiles:p.project_profiles??[],
      project_templates:p.project_templates??[],
      project_categories:p.project_categories??[],
      default_material_profile_id:p.default_material_profile_id??null,
      default_material_template_id:p.default_material_template_id??null
    });
  }
  function persistGlobal(library){
    localStorage.setItem(GLOBAL_KEY,JSON.stringify({
      global_profiles:library.global_profiles??[],
      global_templates:library.global_templates??[],
      global_categories:library.global_categories??[]
    }));
  }
  function persistProject(library,{label="Изменить материалы проекта"}={}){
    const p=project();
    if(!p)return false;
    const mutate=()=>{
      p.materialLibrary={
        project_profiles:clone(library.project_profiles??[]),
        project_templates:clone(library.project_templates??[]),
        project_categories:clone(library.project_categories??[]),
        default_material_profile_id:library.default_material_profile_id??null,
        default_material_template_id:library.default_material_template_id??null
      };
      return true;
    };
    const ok=api()?.modelCommand?api().modelCommand(label,mutate):mutate();
    if(ok===false)return false;
    try{api()?.save?.();}catch{}
    try{api()?.renderAll?.();}catch{}
    return true;
  }
  function persistCombined(library,options={}){
    persistGlobal(library);
    return persistProject(library,options);
  }
  function markMaterialDependentsStale(materialId){
    const p=project();
    for(const item of p?.tubes??[]){
      if(item?.material_profile_id===materialId)item.material_calculation_state="Stale";
    }
  }

  function esc(value){
    return String(value??"").replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }
  function option(value,label,selected=false){
    return '<option value="'+esc(value)+'" '+(selected?'selected':'')+'>'+esc(label)+'</option>';
  }
  function fmt(value){
    return value==null||value===""?"—":String(value);
  }

  function injectStyles(){
    if(document.getElementById("tbMaterialUiStyles"))return;
    const style=document.createElement("style");
    style.id="tbMaterialUiStyles";
    style.textContent=`
#tbMaterialButton{position:fixed;right:16px;bottom:16px;z-index:120250;border:1px solid rgba(124,151,181,.55);background:#1e2936;color:#eef5ff;border-radius:8px;padding:9px 13px;font:600 12px system-ui;box-shadow:0 8px 28px rgba(0,0,0,.35);cursor:pointer}
#tbMaterialButton:hover{background:#263649}
#tbMaterialPanel{position:fixed;z-index:120300;left:max(12px,calc(50vw - 470px));top:max(12px,calc(50vh - 340px));width:min(940px,calc(100vw - 24px));height:min(680px,calc(100vh - 24px));display:none;flex-direction:column;background:#111a24;color:#e8eef5;border:1px solid rgba(124,151,181,.55);border-radius:10px;box-shadow:0 18px 52px rgba(0,0,0,.55);font:12px system-ui}
#tbMaterialPanel.open{display:flex}
.tb-mat-head{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(124,151,181,.28)}
.tb-mat-head b{font-size:14px}.tb-mat-head .spacer{flex:1}.tb-mat-head button,.tb-mat-actions button,.tb-mat-inline button{background:#243244;border:1px solid #42566d;color:#eef5ff;border-radius:5px;padding:6px 9px;cursor:pointer}
.tb-mat-head button:hover,.tb-mat-actions button:hover,.tb-mat-inline button:hover{background:#30445a}
.tb-mat-tabs{display:flex;gap:2px;padding:6px 8px;border-bottom:1px solid rgba(124,151,181,.22)}
.tb-mat-tabs button{border:0;background:transparent;color:#9fb0c3;padding:7px 10px;border-radius:5px;cursor:pointer}
.tb-mat-tabs button.active{background:#26384c;color:#fff}
.tb-mat-body{flex:1;min-height:0;overflow:auto;padding:10px}
.tb-mat-toolbar{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-bottom:9px}
.tb-mat-toolbar input,.tb-mat-toolbar select,.tb-mat-form input,.tb-mat-form select,.tb-mat-form textarea{background:#0c131c;color:#eef5ff;border:1px solid #405268;border-radius:5px;padding:6px 7px;box-sizing:border-box}
.tb-mat-toolbar input{min-width:220px}
.tb-mat-table{width:100%;border-collapse:collapse}
.tb-mat-table th,.tb-mat-table td{border-bottom:1px solid rgba(124,151,181,.18);padding:6px 7px;text-align:left;vertical-align:middle}
.tb-mat-table th{position:sticky;top:0;background:#172231;color:#aebdcb}
.tb-mat-table tr[data-id]{cursor:pointer}.tb-mat-table tr[data-id]:hover{background:#19283a}.tb-mat-table tr.selected{background:#233a52}
.tb-mat-badge{display:inline-block;padding:2px 6px;border-radius:999px;font-size:10px;border:1px solid currentColor}
.tb-mat-badge.Valid{color:#56d77a}.tb-mat-badge.Warning{color:#f3c95a}.tb-mat-badge.Error{color:#ff6969}
.tb-mat-grid{display:grid;grid-template-columns:170px minmax(180px,1fr) 170px minmax(180px,1fr);gap:8px 10px;align-items:center}
.tb-mat-grid label{color:#aebdcb}.tb-mat-grid .wide{min-width:0;width:100%}
.tb-mat-form textarea{width:100%;min-height:86px;resize:vertical}
.tb-mat-section{border:1px solid rgba(124,151,181,.22);border-radius:7px;margin:9px 0;padding:10px}
.tb-mat-section h3{margin:0 0 8px;font-size:12px;color:#dce6ef}
.tb-mat-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:12px}
.tb-mat-note{color:#9fafbf;line-height:1.45}.tb-mat-error{color:#ff7979}.tb-mat-warning{color:#f1c95f}
.tb-mat-tube-card{display:grid;grid-template-columns:150px minmax(220px,1fr);gap:8px 10px;max-width:720px}
.tb-mat-inline{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
@media(max-width:760px){.tb-mat-grid{grid-template-columns:130px 1fr}.tb-mat-grid .wide{min-width:0;width:100%}.tb-mat-tube-card{grid-template-columns:1fr}}
`;
    document.head.appendChild(style);
  }

  function ensureShell(){
    if(panel)return panel;
    injectStyles();
    const button=document.createElement("button");
    button.id="tbMaterialButton";
    button.type="button";
    button.textContent="Материалы";
    button.addEventListener("click",()=>openPanel());
    document.body.appendChild(button);

    panel=document.createElement("section");
    panel.id="tbMaterialPanel";
    panel.innerHTML=
      '<div class="tb-mat-head"><b>Material Library</b><span class="spacer"></span><button type="button" data-mat-close>×</button></div>'+
      '<div class="tb-mat-tabs">'+
      '<button data-tab="library">Библиотека</button>'+
      '<button data-tab="tube">Труба</button>'+
      '<button data-tab="project">Проект</button>'+
      '<button data-tab="templates">Шаблоны</button>'+
      '</div><div class="tb-mat-body"></div>';
    document.body.appendChild(panel);
    panel.querySelector("[data-mat-close]").addEventListener("click",closePanel);
    panel.querySelector(".tb-mat-tabs").addEventListener("click",(event)=>{
      const btn=event.target.closest("[data-tab]");
      if(!btn)return;
      activeTab=btn.dataset.tab;
      render();
    });
    return panel;
  }

  function openPanel(tab=activeTab){
    activeTab=tab;
    ensureShell().classList.add("open");
    render();
  }
  function closePanel(){panel?.classList.remove("open");}

  function profiles(lib,scope="all"){
    if(scope==="global")return lib.global_profiles;
    if(scope==="project")return lib.project_profiles;
    return [...lib.project_profiles,...lib.global_profiles];
  }
  function templates(lib,scope="all"){
    if(scope==="global")return lib.global_templates;
    if(scope==="project")return lib.project_templates;
    return [...lib.project_templates,...lib.global_templates];
  }

  function render(){
    if(!panel||!domain)return;
    $$(".tb-mat-tabs button",panel).forEach((b)=>b.classList.toggle("active",b.dataset.tab===activeTab));
    if(activeTab==="tube")renderTube();
    else if(activeTab==="project")renderProject();
    else if(activeTab==="templates")renderTemplates();
    else renderLibrary();
  }

  function renderLibrary(){
    const body=$(".tb-mat-body",panel), lib=combinedLibrary();
    body.innerHTML=
      '<div class="tb-mat-toolbar">'+
      '<input data-mat-search placeholder="Поиск материалов…">'+
      '<select data-mat-scope><option value="all">Global + Project</option><option value="project">Project</option><option value="global">Global</option></select>'+
      '<select data-mat-category><option value="">Все категории</option></select>'+
      '<button data-mat-new-project>+ Project Material</button>'+
      '<button data-mat-new-global>+ Global Material</button>'+
      '<button data-mat-category-add>+ Категория</button>'+
      '<button data-mat-import>Импорт</button>'+
      '<button data-mat-export>Экспорт</button>'+
      '</div><div data-mat-list></div>';
    const cat=$("[data-mat-category]",body);
    [...new Set([...lib.project_categories,...lib.global_categories,...profiles(lib).map((p)=>p.category).filter(Boolean)])]
      .sort().forEach((x)=>cat.insertAdjacentHTML("beforeend",option(x,x)));
    const draw=()=>{
      const scope=$("[data-mat-scope]",body).value;
      const query=$("[data-mat-search]",body).value;
      const category=cat.value||null;
      const list=domain.sortMaterialProfiles(domain.searchMaterialProfiles(profiles(lib,scope),query,{category}),{by:"name"});
      const rows=list.map((p)=>{
        const v=domain.validateMaterialProfile(p);
        return '<tr data-id="'+esc(p.id)+'" data-source="'+esc(p.source)+'"><td>'+esc(p.name)+'</td><td>'+esc(fmt(p.grade))+'</td><td>'+esc(fmt(p.category))+'</td><td>'+esc(p.source)+'</td><td><span class="tb-mat-badge '+esc(v.status)+'">'+esc(v.status)+'</span></td><td>'+esc(fmt(p.springback))+'</td><td>'+esc(fmt(p.minimum_clr_mm))+'</td></tr>';
      }).join("");
      $("[data-mat-list]",body).innerHTML='<table class="tb-mat-table"><thead><tr><th>Название</th><th>Марка</th><th>Категория</th><th>Источник</th><th>Статус</th><th>Springback</th><th>Min CLR</th></tr></thead><tbody>'+rows+'</tbody></table>';
      $$("tr[data-id]",body).forEach((row)=>{
        row.addEventListener("dblclick",()=>editMaterial(row.dataset.id,row.dataset.source));
        row.addEventListener("contextmenu",(event)=>{
          event.preventDefault();
          const action=window.prompt("Действие: edit / duplicate / delete / copy-to-project","");
          if(action==="edit")editMaterial(row.dataset.id,row.dataset.source);
          else if(action==="duplicate")duplicateMaterial(row.dataset.id,row.dataset.source);
          else if(action==="delete")deleteMaterial(row.dataset.id,row.dataset.source);
          else if(action==="copy-to-project"&&row.dataset.source==="global")copyGlobalToProject(row.dataset.id);
        });
      });
    };
    ["input","change"].forEach((eventName)=>{
      $("[data-mat-search]",body).addEventListener(eventName,draw);
      $("[data-mat-scope]",body).addEventListener(eventName,draw);
      cat.addEventListener(eventName,draw);
    });
    $("[data-mat-new-project]",body).addEventListener("click",()=>editMaterial(null,"project"));
    $("[data-mat-new-global]",body).addEventListener("click",()=>editMaterial(null,"global"));
    $("[data-mat-category-add]",body).addEventListener("click",addCategory);
    $("[data-mat-import]",body).addEventListener("click",importMaterials);
    $("[data-mat-export]",body).addEventListener("click",exportMaterials);
    draw();
  }

  const numberFields=[
    ["density_kg_m3","Плотность, kg/m³"],["elastic_modulus_mpa","Модуль E, MPa"],
    ["yield_strength_mpa","Предел текучести, MPa"],["tensile_strength_mpa","Предел прочности, MPa"],
    ["poisson_ratio","Коэф. Пуассона"],["thermal_expansion_per_c","Лин. расширение, 1/°C"],
    ["springback","Springback"],["minimum_clr_mm","Минимальный CLR, мм"],
    ["dt_ratio_min","D/t min"],["dt_ratio_max","D/t max"]
  ];

  function materialFormHtml(profile,source){
    const p=profile??{};
    return '<div class="tb-mat-section"><h3>'+(profile?'Редактирование':'Новый Material Profile')+' · '+esc(source)+'</h3>'+
      '<div class="tb-mat-grid">'+
      '<label>Название *</label><input data-f="name" value="'+esc(p.name??"")+'">'+
      '<label>Марка</label><input data-f="grade" value="'+esc(p.grade??"")+'">'+
      '<label>Категория</label><input data-f="category" value="'+esc(p.category??"")+'">'+
      '<label>Примечание</label><input data-f="technology_notes" value="'+esc(p.technology_notes??"")+'">'+
      numberFields.map(([key,label])=>'<label>'+esc(label)+'</label><input data-f="'+key+'" inputmode="decimal" value="'+esc(p[key]??"")+'">').join("")+
      '<label>Custom Fields JSON</label><textarea class="wide" data-f="custom_fields">'+esc(JSON.stringify(p.custom_fields??[],null,2))+'</textarea>'+
      '</div><div data-mat-validation class="tb-mat-note"></div>'+
      '<div class="tb-mat-actions"><button data-mat-cancel>Отмена</button><button data-mat-save>Сохранить</button></div></div>';
  }

  function editMaterial(id,source){
    if(readonly()&&source==="project"){toast("Проект открыт только для просмотра");return;}
    const body=$(".tb-mat-body",panel), lib=combinedLibrary();
    const list=source==="global"?lib.global_profiles:lib.project_profiles;
    const current=id?list.find((x)=>x.id===id):null;
    body.innerHTML=materialFormHtml(current,source);
    const collect=()=>{
      const raw={};
      $$("[data-f]",body).forEach((input)=>{
        const key=input.dataset.f;
        if(key==="custom_fields"){
          raw.custom_fields=input.value.trim()?JSON.parse(input.value):[];
        }else if(numberFields.some(([name])=>name===key)){
          raw[key]=input.value.trim()===""?null:Number(input.value.replace(",","."));
        }else raw[key]=input.value;
      });
      return raw;
    };
    const validate=()=>{
      const host=$("[data-mat-validation]",body);
      try{
        const candidate=domain.createMaterialProfile(collect(),{id:current?.id,source});
        const result=domain.validateMaterialProfile(candidate);
        host.className="tb-mat-note "+(result.status==="Error"?"tb-mat-error":result.status==="Warning"?"tb-mat-warning":"");
        host.textContent=result.status+(result.issues.length?" · "+result.issues.map((x)=>x.message).join(" · "):"");
      }catch(error){host.className="tb-mat-error";host.textContent=error.message;}
    };
    body.addEventListener("input",validate);
    $("[data-mat-cancel]",body).addEventListener("click",renderLibrary);
    $("[data-mat-save]",body).addEventListener("click",()=>{
      try{
        const raw=collect();
        let next=combinedLibrary();
        if(current){
          const updated=domain.updateMaterialProfile(current,raw);
          if(source==="global")next={...clone(next),global_profiles:next.global_profiles.map((x)=>x.id===current.id?updated:x)};
          else{
            next={...clone(next),project_profiles:next.project_profiles.map((x)=>x.id===current.id?updated:x)};
            markMaterialDependentsStale(current.id);
          }
        }else{
          const created=domain.createMaterialProfile(raw,{source});
          const key=source==="global"?"global_profiles":"project_profiles";
          next={...clone(next),[key]:[...next[key],created]};
        }
        if(source==="global")persistGlobal(next);
        else persistProject(next,{label:current?"Изменить Material Profile":"Создать Material Profile"});
        toast("Material Profile сохранён");
        renderLibrary();
      }catch(error){toast(error.message);}
    });
    validate();
  }

  function duplicateMaterial(id,source){
    const lib=combinedLibrary(), list=source==="global"?lib.global_profiles:lib.project_profiles;
    const current=list.find((x)=>x.id===id);if(!current)return;
    const name=window.prompt("Имя копии",current.name+" Copy");if(!name)return;
    const copy=domain.duplicateMaterialProfile(current,{name,source});
    const key=source==="global"?"global_profiles":"project_profiles";
    const next={...clone(lib),[key]:[...lib[key],copy]};
    source==="global"?persistGlobal(next):persistProject(next,{label:"Дублировать Material Profile"});
    renderLibrary();
  }
  function copyGlobalToProject(id){
    const lib=combinedLibrary(), source=lib.global_profiles.find((x)=>x.id===id);if(!source)return;
    const name=window.prompt("Имя Project Material",source.name);if(!name)return;
    const result=domain.copyGlobalMaterialToProject(lib,id,{name});
    persistProject(result.library,{label:"Копировать Global Material в проект"});
    renderLibrary();
  }
  function deleteMaterial(id,source){
    const lib=combinedLibrary();
    if(!window.confirm("Удалить Material Profile?"))return;
    try{
      if(source==="global"){
        const next={...clone(lib),global_profiles:lib.global_profiles.filter((x)=>x.id!==id)};
        persistGlobal(next);
      }else{
        const next=domain.deleteProjectMaterial(lib,id,project()?.tubes??[]);
        persistProject(next,{label:"Удалить Material Profile"});
      }
      renderLibrary();
    }catch(error){toast(error.message);}
  }

  function addCategory(){
    const scope=window.prompt("Уровень категории: global или project","project");
    if(!scope)return;
    const name=window.prompt("Название категории","");if(!name)return;
    try{
      const next=domain.addMaterialCategory(combinedLibrary(),name,{scope});
      scope==="global"?persistGlobal(next):persistProject(next,{label:"Добавить категорию материала"});
      renderLibrary();
    }catch(error){toast(error.message);}
  }

  function download(name,text,type="application/json"){
    const blob=new Blob([text],{type});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),0);
  }
  function exportMaterials(){
    const lib=combinedLibrary();
    const scope=window.prompt("Экспорт: project / global / all","project");
    if(!scope)return;
    const format=window.prompt("Формат: json / csv","json");
    const list=profiles(lib,scope==="all"?"all":scope);
    if(format==="csv")download("material-profiles.csv",domain.exportMaterialProfilesCsv(list),"text/csv");
    else download("material-profiles.json",domain.exportMaterialProfilesJson(list));
  }
  function importMaterials(){
    const target=window.prompt("Импортировать в: project / global","project");
    if(!["project","global"].includes(target))return;
    const input=document.createElement("input");input.type="file";input.accept=".json,.csv,application/json,text/csv";
    input.addEventListener("change",async()=>{
      const file=input.files?.[0];if(!file)return;
      try{
        const text=await file.text();
        const imported=file.name.toLowerCase().endsWith(".csv")
          ?domain.importMaterialProfilesCsv(text,{target})
          :domain.importMaterialProfilesJson(text,{target});
        const lib=combinedLibrary(), key=target==="global"?"global_profiles":"project_profiles";
        const next={...clone(lib),[key]:[...lib[key],...imported]};
        target==="global"?persistGlobal(next):persistProject(next,{label:"Импорт Material Profiles"});
        toast("Импортировано: "+imported.length);
        renderLibrary();
      }catch(error){toast(error.message);}
    },{once:true});
    input.click();
  }

  function renderTube(){
    const body=$(".tb-mat-body",panel), lib=combinedLibrary(), current=tube();
    if(!current){body.innerHTML='<div class="tb-mat-note">Нет активной трубы.</div>';return;}
    const selected=current.material_profile_id??"";
    const list=domain.sortMaterialProfiles(lib.project_profiles,{by:"name"});
    const assigned=list.find((x)=>x.id===selected)??null;
    body.innerHTML=
      '<div class="tb-mat-section"><h3>Материал активной трубы</h3><div class="tb-mat-tube-card">'+
      '<span>Труба</span><b>'+esc(current.name??current.id??"—")+'</b>'+
      '<span>Material Profile</span><select data-tube-material>'+option("","Не назначен",!selected)+list.map((p)=>option(p.id,p.name,p.id===selected)).join("")+'</select>'+
      '<span>Статус расчёта</span><span>'+esc(current.material_calculation_state??"—")+'</span>'+
      '<span>Валидация</span><span data-tube-validation></span>'+
      '</div><div class="tb-mat-actions"><button data-tube-clear>Снять материал</button><button data-tube-apply>Применить</button></div></div>'+
      '<div class="tb-mat-note">OD / wall thickness / ID остаются геометрическими параметрами трубы и не переопределяются материалом.</div>';
    const renderValidation=()=>{
      const id=$("[data-tube-material]",body).value;
      const p=list.find((x)=>x.id===id);
      const host=$("[data-tube-validation]",body);
      if(!p){host.textContent="Материал не назначен";return;}
      const result=domain.validateMaterialProfile(p);
      host.innerHTML='<span class="tb-mat-badge '+esc(result.status)+'">'+esc(result.status)+'</span> '+esc(result.issues.map((x)=>x.message).join(" · "));
    };
    $("[data-tube-material]",body).addEventListener("change",renderValidation);
    $("[data-tube-apply]",body).addEventListener("click",()=>{
      if(readonly()){toast("Проект открыт только для просмотра");return;}
      const id=$("[data-tube-material]",body).value;if(!id){toast("Выберите Material Profile");return;}
      const mutate=()=>{current.material_profile_id=id;current.material_calculation_state="Stale";return true;};
      const ok=api()?.modelCommand?api().modelCommand("Назначить материал трубе",mutate):mutate();
      if(ok!==false){api()?.save?.();api()?.renderAll?.();toast("Материал назначен");renderTube();}
    });
    $("[data-tube-clear]",body).addEventListener("click",()=>{
      if(readonly()){toast("Проект открыт только для просмотра");return;}
      const mutate=()=>{current.material_profile_id=null;current.material_calculation_state="Missing Material";return true;};
      const ok=api()?.modelCommand?api().modelCommand("Снять материал трубы",mutate):mutate();
      if(ok!==false){api()?.save?.();api()?.renderAll?.();renderTube();}
    });
    renderValidation();
  }

  function renderProject(){
    const body=$(".tb-mat-body",panel), lib=combinedLibrary();
    const materials=domain.sortMaterialProfiles(lib.project_profiles,{by:"name"});
    const tpls=[...lib.project_templates,...lib.global_templates].sort((a,b)=>a.name.localeCompare(b.name));
    body.innerHTML=
      '<div class="tb-mat-section"><h3>Настройки проекта</h3><div class="tb-mat-grid">'+
      '<label>Default Material Profile</label><select data-project-default-material>'+option("","None",!lib.default_material_profile_id)+materials.map((p)=>option(p.id,p.name,p.id===lib.default_material_profile_id)).join("")+'</select>'+
      '<label>Default Material Template</label><select data-project-default-template>'+option("","None",!lib.default_material_template_id)+tpls.map((t)=>option(t.id,t.name,t.id===lib.default_material_template_id)).join("")+'</select>'+
      '</div><div class="tb-mat-actions"><button data-project-save>Сохранить</button></div></div>'+
      '<div class="tb-mat-note">Default Material применяется только к трубам, созданным после изменения настройки. Существующие трубы автоматически не меняются.</div>';
    $("[data-project-save]",body).addEventListener("click",()=>{
      if(readonly()){toast("Проект открыт только для просмотра");return;}
      let next=combinedLibrary();
      next=domain.setProjectDefaultMaterial(next,$("[data-project-default-material]",body).value||null);
      next=domain.setProjectDefaultMaterialTemplate(next,$("[data-project-default-template]",body).value||null);
      persistProject(next,{label:"Изменить настройки материалов проекта"});
      toast("Настройки материалов проекта сохранены");
    });
  }

  function renderTemplates(){
    const body=$(".tb-mat-body",panel), lib=combinedLibrary();
    const list=[...lib.project_templates,...lib.global_templates].sort((a,b)=>a.name.localeCompare(b.name));
    body.innerHTML=
      '<div class="tb-mat-toolbar"><button data-template-new-project>+ Project Template</button><button data-template-new-global>+ Global Template</button><button data-template-import>Импорт JSON</button><button data-template-export>Экспорт JSON</button></div>'+
      '<table class="tb-mat-table"><thead><tr><th>Имя</th><th>Категория</th><th>Источник</th><th>Статус</th></tr></thead><tbody>'+
      list.map((t)=>{const v=domain.validateMaterialTemplate(t);return '<tr data-template-id="'+esc(t.id)+'" data-source="'+esc(t.source)+'"><td>'+esc(t.name)+'</td><td>'+esc(fmt(t.category))+'</td><td>'+esc(t.source)+'</td><td><span class="tb-mat-badge '+esc(v.status)+'">'+esc(v.status)+'</span></td></tr>';}).join("")+
      '</tbody></table><div class="tb-mat-note" style="margin-top:8px">Двойной клик — создать независимый Material Profile по шаблону. Правый клик — edit / delete / copy-to-project.</div>';
    $$("tr[data-template-id]",body).forEach((row)=>{
      row.addEventListener("dblclick",()=>createMaterialFromTemplateUi(row.dataset.templateId));
      row.addEventListener("contextmenu",(event)=>{
        event.preventDefault();
        const action=window.prompt("Действие: edit / delete / copy-to-project","");
        if(action==="edit")editTemplate(row.dataset.templateId,row.dataset.source);
        else if(action==="delete")deleteTemplate(row.dataset.templateId);
        else if(action==="copy-to-project"&&row.dataset.source==="global")copyTemplateToProject(row.dataset.templateId);
      });
    });
    $("[data-template-new-project]",body).addEventListener("click",()=>editTemplate(null,"project"));
    $("[data-template-new-global]",body).addEventListener("click",()=>editTemplate(null,"global"));
    $("[data-template-import]",body).addEventListener("click",importTemplates);
    $("[data-template-export]",body).addEventListener("click",()=>{
      const scope=window.prompt("Экспорт шаблонов: project / global / all","project");if(!scope)return;
      download("material-templates.json",domain.exportMaterialTemplatesJson(templates(lib,scope==="all"?"all":scope)));
    });
  }

  function editTemplate(id,source){
    const body=$(".tb-mat-body",panel), lib=combinedLibrary(), list=source==="global"?lib.global_templates:lib.project_templates;
    const current=id?list.find((x)=>x.id===id):null;
    body.innerHTML='<div class="tb-mat-section"><h3>'+(current?'Редактировать':'Новый')+' Material Profile Template · '+esc(source)+'</h3>'+
      '<div class="tb-mat-grid"><label>Имя *</label><input data-tf="name" value="'+esc(current?.name??"")+'">'+
      '<label>Категория</label><input data-tf="category" value="'+esc(current?.category??"")+'">'+
      '<label>Defaults JSON</label><textarea class="wide" data-tf="defaults">'+esc(JSON.stringify(current?.defaults??{},null,2))+'</textarea>'+
      '<label>Custom Fields JSON</label><textarea class="wide" data-tf="custom_fields">'+esc(JSON.stringify(current?.custom_fields??[],null,2))+'</textarea></div>'+
      '<div data-template-validation class="tb-mat-note"></div><div class="tb-mat-actions"><button data-template-cancel>Отмена</button><button data-template-save>Сохранить</button></div></div>';
    const collect=()=>({
      name:$('[data-tf="name"]',body).value,
      category:$('[data-tf="category"]',body).value,
      defaults:JSON.parse($('[data-tf="defaults"]',body).value||"{}"),
      custom_fields:JSON.parse($('[data-tf="custom_fields"]',body).value||"[]")
    });
    const validate=()=>{
      const host=$("[data-template-validation]",body);
      try{
        const candidate=domain.createMaterialTemplate(collect(),{id:current?.id,source});
        const result=domain.validateMaterialTemplate(candidate);
        host.className="tb-mat-note "+(result.status==="Error"?"tb-mat-error":result.status==="Warning"?"tb-mat-warning":"");
        host.textContent=result.status+(result.issues.length?" · "+result.issues.map((x)=>x.message).join(" · "):"");
      }catch(error){host.className="tb-mat-error";host.textContent=error.message;}
    };
    body.addEventListener("input",validate);
    $("[data-template-cancel]",body).addEventListener("click",renderTemplates);
    $("[data-template-save]",body).addEventListener("click",()=>{
      try{
        const raw=collect(), candidate=domain.createMaterialTemplate(raw,{id:current?.id,source});
        let next=combinedLibrary();
        if(current){
          const key=source==="global"?"global_templates":"project_templates";
          const others=[...next.global_templates,...next.project_templates].filter((x)=>x.id!==current.id);
          if(others.some((x)=>x.name.toLowerCase()===candidate.name.toLowerCase()))throw new Error("Имя шаблона уже используется");
          next={...clone(next),[key]:next[key].map((x)=>x.id===current.id?candidate:x)};
        }else next=domain.addMaterialTemplate(next,candidate,{scope:source});
        source==="global"?persistGlobal(next):persistProject(next,{label:current?"Изменить шаблон материала":"Создать шаблон материала"});
        renderTemplates();
      }catch(error){toast(error.message);}
    });
    validate();
  }

  function deleteTemplate(id){
    if(!window.confirm("Удалить Material Profile Template?"))return;
    try{
      const lib=combinedLibrary(), current=[...lib.global_templates,...lib.project_templates].find((x)=>x.id===id);
      if(!current)return;
      const next=domain.deleteMaterialTemplate(lib,id);
      current.source==="global"?persistGlobal(next):persistProject(next,{label:"Удалить шаблон материала"});
      renderTemplates();
    }catch(error){toast(error.message);}
  }
  function copyTemplateToProject(id){
    const name=window.prompt("Уникальное имя Project Template","");if(!name)return;
    try{
      const result=domain.copyGlobalTemplateToProject(combinedLibrary(),id,{name});
      persistProject(result.library,{label:"Копировать Global Template в проект"});
      renderTemplates();
    }catch(error){toast(error.message);}
  }
  function createMaterialFromTemplateUi(id){
    const lib=combinedLibrary(), template=[...lib.project_templates,...lib.global_templates].find((x)=>x.id===id);if(!template)return;
    const name=window.prompt("Название нового материала",template.defaults?.name??template.name);if(!name)return;
    try{
      const profile=domain.createMaterialFromTemplate(template,{name});
      const next={...clone(lib),project_profiles:[...lib.project_profiles,profile]};
      persistProject(next,{label:"Создать материал по шаблону"});
      toast("Материал создан независимо от шаблона");
      activeTab="library";render();
    }catch(error){toast(error.message);}
  }
  function importTemplates(){
    const target=window.prompt("Импортировать шаблоны в: project / global","project");
    if(!["project","global"].includes(target))return;
    const input=document.createElement("input");input.type="file";input.accept=".json,application/json";
    input.addEventListener("change",async()=>{
      const file=input.files?.[0];if(!file)return;
      try{
        const text=await file.text(), lib=combinedLibrary();
        const imported=domain.importMaterialTemplatesJson(text,{target,existing_names:[...lib.global_templates,...lib.project_templates].map((x)=>x.name)});
        const key=target==="global"?"global_templates":"project_templates";
        const next={...clone(lib),[key]:[...lib[key],...imported]};
        target==="global"?persistGlobal(next):persistProject(next,{label:"Импорт шаблонов материала"});
        toast("Импортировано шаблонов: "+imported.length);renderTemplates();
      }catch(error){toast(error.message);}
    },{once:true});
    input.click();
  }

  function trackNewTubes(){
    const p=project();if(!p)return;
    const pid=String(p.id??p.name??"");
    if(pid!==knownProjectId){
      knownProjectId=pid;
      knownTubeIds=new Set((p.tubes??[]).map((t)=>String(t.id)));
      return;
    }
    const currentIds=new Set((p.tubes??[]).map((t)=>String(t.id)));
    const added=(p.tubes??[]).filter((t)=>!knownTubeIds.has(String(t.id)));
    knownTubeIds=currentIds;
    if(!added.length)return;
    const lib=combinedLibrary(), defaultId=lib.default_material_profile_id;
    if(!defaultId||!lib.project_profiles.some((x)=>x.id===defaultId))return;
    let changed=false;
    for(const t of added){
      if(t.material_profile_id)continue;
      t.material_profile_id=defaultId;
      t.material_calculation_state="Stale";
      changed=true;
    }
    if(changed){try{api()?.save?.();}catch{}}
  }

  function installPropertiesShortcut(){
    document.addEventListener("dblclick",(event)=>{
      const row=event.target.closest?.("[data-tree-tube]");
      if(!row)return;
      activeTab="tube";openPanel("tube");
    });
  }

  async function install(){
    if(installed)return;
    installed=true;
    try{
      domain=await import(MODULE_URL);
    }catch(error){
      console.error("TubeBender Material Library failed to load",error);
      return;
    }
    ensureShell();
    installPropertiesShortcut();
    knownProjectId=null;
    trackNewTubes();
    newTubeTimer=setInterval(trackNewTubes,700);
    window.TubeBenderMaterials=Object.freeze({
      open:openPanel,
      close:closePanel,
      library:combinedLibrary,
      validateActive:()=>{const t=tube(),lib=combinedLibrary();const p=lib.project_profiles.find((x)=>x.id===t?.material_profile_id);return p?domain.validateMaterialProfile(p):null;},
      refresh:render
    });
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();
