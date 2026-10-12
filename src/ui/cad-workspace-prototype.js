(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const api=()=>window.TubeBenderEngineering;
  let stage="geometry",enabled=true,inspector=null,ribbon=null,lastSnapshot="",toolDrawer=null;
  const movedTools=[];
  const commands=[
    ["import","Источник","Импорт CAD / проекта","↥",()=>click("tbActionOpen")],
    ["save","Источник","Сохранить","▣",()=>click("tbActionSave")],
    ["projectExport","Источник","JSON проекта","↧",()=>document.querySelector('[data-action="projectExport"]')?.click()],
    ["recognition","Источник","Доказательства","◎",()=>window.TubeBenderProperties?.open?.()],
    ["measure","Геометрия","Измерить","↔",()=>window.TubeBenderMeasurements?.open?.()],
    ["properties","Геометрия","Свойства","☷",()=>window.TubeBenderProperties?.open?.()],
    ["move","Геометрия","Переместить","✥",()=>hotkey("move")],
    ["copy","Геометрия","Копировать","▱",()=>hotkey("copy")],
    ["rotate","Геометрия","Повернуть","⟳",()=>hotkey("rotate")],
    ["array","Геометрия","Массив","⠿",()=>hotkey("array")],
    ["length","Геометрия","Длина","L",()=>hotkey("length")],
    ["angle","Геометрия","Угол","∠",()=>hotkey("angle")],
    ["constraints","Геометрия","Зависимости","⊥",()=>api()?.open?.("constraints")],
    ["modernConstraints","Геометрия","Связи объектов","⊡",()=>openExistingPanel("tbConstraintsPanel","tbConstraintsToggle")],
    ["layers","Геометрия","Слои","▱",()=>openExistingPanel("tbLayersPanel","tbLayersToggle")],
    ["groups","Геометрия","Группы","▦",()=>window.TubeBenderGroups?.openPanel?.()],
    ["assemblies","Геометрия","Сборки","◫",()=>window.TubeBenderAssemblies?.openPanel?.()],
    ["split","Геометрия","Разделить","⋮",()=>window.TubeBenderEditing?.open?.("split")],
    ["mirror","Геометрия","Отразить","◧",()=>window.TubeBenderEditing?.open?.("mirror")],
    ["stack","Геометрия","Преобразования","▥",()=>window.TubeBenderEditing?.open?.("stack")],
    ["views","Геометрия","Виды","◇",()=>window.TubeBenderNamedViews?.openPanel?.()],
    ["selectionSets","Геометрия","Наборы выбора","⊞",()=>window.TubeBenderSelectionSets?.openPanel?.()],
    ["snap","Геометрия","Привязки","⊕",()=>hotkey("snapSettings")],
    ["more","Геометрия","Все панели","•••",()=>toggleTools()],
    ["section","Геометрия","Сечение","◩",()=>window.TubeBenderSectionView?.openPanel?.()],
    ["material","Технология","Материалы","◈",()=>window.TubeBenderMaterials?.open?.()],
    ["style","Технология","Стиль трубы","⌁",()=>api()?.open?.("style")],
    ["ports","Технология","Порты P1 / P2","○",()=>api()?.open?.("ports")],
    ["autoroute","Технология","Автотрасса","⌇",()=>api()?.open?.("autoroute")],
    ["manufacturing","Технология","YBC / LRA","≋",()=>api()?.open?.("manufacturing")],
    ["equipment","Станок","Оборудование","⚙",()=>window.TubeBenderEquipmentLibrary?.open?.()],
    ["machine","Станок","Профиль станка","▧",()=>api()?.open?.("machine")],
    ["simulation","Станок","Симуляция","▷",()=>api()?.open?.("simulation")],
    ["tooling","Станок","Оснастка","◉",()=>window.TubeBenderEquipmentLibrary?.open?.("tooling-sets")],
    ["setup","Станок","Наладка","⚒",()=>window.TubeBenderEquipmentLibrary?.open?.("setups")],
    ["sequence","Станок","Порядок гибов","≡",()=>window.TubeBenderEquipmentLibrary?.open?.("sequence")],
    ["trim","Станок","Обрезка","⌿",()=>window.TubeBenderEquipmentLibrary?.open?.("trim")],
    ["clearance","Станок","Зазоры","↔",()=>window.TubeBenderEquipmentLibrary?.open?.("clearance")],
    ["reports","Выпуск","Отчёты / экспорт","▤",()=>api()?.open?.("reports")],
    ["diagnostics","Выпуск","Проверка выпуска","✓",()=>api()?.open?.("overview")],
    ["history","Выпуск","История","↶",()=>hotkey("history")],
    ["revisions","Выпуск","Ревизии","◷",()=>api()?.open?.("revisions")],
    ["settings","Общие","Настройки","⚙",()=>click("tbActionSettings")],
    ["search","Общие","Все команды","⌕",()=>window.TubeBenderCommandLine?.open?.()]
  ];
  const stages=[
    ["source","01","Источник","Источник"],["geometry","02","Геометрия","Геометрия"],
    ["technology","03","Технология","Технология"],["machine","04","Станок","Станок"],
    ["release","05","Выпуск","Выпуск"]
  ];
  function click(id){const target=$(id);if(!target)throw new Error("Команда недоступна: "+id);target.click();}
  function openExistingPanel(panelId,toggleId){if(!$(panelId)?.classList.contains("open"))click(toggleId);}
  function collectTools(){
    if(!enabled)return;
    for(const node of [...document.body.children]){
      if(node.tagName==="BUTTON"&&node.id.startsWith("tb")||node.id==="tbTransformGizmoPanel"){
        if(!movedTools.includes(node))movedTools.push(node);
        toolDrawer.append(node);
      }
    }
  }
  function toggleTools(){collectTools();toolDrawer.hidden=!toolDrawer.hidden;}
  function hotkey(id){if(!window.TubeBenderHotkeys)throw new Error("Команды ещё загружаются");return window.TubeBenderHotkeys.execute(id);}
  function execute(id){
    const command=commands.find(item=>item[0]===id);
    if(!command)return false;
    const required={
      recognition:"TubeBenderProperties",properties:"TubeBenderProperties",measure:"TubeBenderMeasurements",
      move:"TubeBenderEditing",copy:"TubeBenderEditing",rotate:"TubeBenderEditing",array:"TubeBenderEditing",
      split:"TubeBenderEditing",mirror:"TubeBenderEditing",stack:"TubeBenderEditing",
      groups:"TubeBenderGroups",assemblies:"TubeBenderAssemblies",views:"TubeBenderNamedViews",
      selectionSets:"TubeBenderSelectionSets",section:"TubeBenderSectionView",material:"TubeBenderMaterials",
      equipment:"TubeBenderEquipmentLibrary",tooling:"TubeBenderEquipmentLibrary",setup:"TubeBenderEquipmentLibrary",
      sequence:"TubeBenderEquipmentLibrary",trim:"TubeBenderEquipmentLibrary",clearance:"TubeBenderEquipmentLibrary",
      search:"TubeBenderCommandLine"
    };
    try{
      if(required[id]&&!window[required[id]])throw new Error("Инструмент ещё загружается. Повторите команду.");
      const result=command[4]();
      if(result===false){api()?.toast?.("Команда недоступна для текущего выбора");return false;}
      return true;
    }catch(error){api()?.toast?.(error.message);return false;}
  }
  function selectStage(id){
    if(!stages.some(item=>item[0]===id))return;
    stage=id;
    ribbon.querySelectorAll("[data-cad-stage]").forEach(button=>{
      const active=button.dataset.cadStage===stage;
      button.setAttribute("aria-selected",String(active));
      button.tabIndex=active?0:-1;
    });
    const category=stages.find(item=>item[0]===stage)[3];
    $("cadCommands").innerHTML=commands.filter(item=>item[1]===category).map(item=>
      '<button type="button" data-cad-command="'+item[0]+'"><span aria-hidden="true">'+item[3]+'</span>'+item[2]+"</button>"
    ).join("");
    $("cadCommands").querySelectorAll("button").forEach(button=>button.onclick=()=>execute(button.dataset.cadCommand));
  }
  function snapshot(){
    const tube=api()?.activeTube?.(),project=api()?.activeProject?.();
    const evidence=tube?.importEvidence??{},validation=tube?.importValidation??{};
    const primitives=evidence.canonicalGeometry?.primitives??[];
    let decision={allowed:false,blockers:["Проверка выпуска ещё не выполнена"]};
    // Use the actual production gate on demand, never infer readiness from a colour or import status.
    if(stage==="release")try{decision=api().productionReleaseDecision(tube,"manufacturing");}catch(error){decision.blockers=[error.message];}
    return {project:project?.name,tube:tube?.name,part:tube?.partNumber??tube?.engineering?.partNumber??null,
      rows:tube?.rows?.length??0,primitives:primitives.length,source:evidence.source??null,
      promotion:evidence.canonicalPromotion??null,issues:validation.issues??[],
      blocked:validation.productionBlocked===true,tooling:tube?.toolingUnresolved===true,
      machineCompensation:evidence.machineCompensationApplied??null,decision,stage};
  }
  function renderInspector(){
    if(!enabled||document.hidden)return;
    const data=snapshot(),key=JSON.stringify(data);
    if(key===lastSnapshot)return;lastSnapshot=key;
    const value=(label,text)=>'<div class="cad-value"><span>'+label+'</span><strong>'+esc(text??"Неизвестно")+"</strong></div>";
    const source=data.source?.file??data.source?.source_file??"Источник не указан";
    inspector.innerHTML='<header><span>АКТИВНАЯ ТРУБА</span><button type="button" id="cadProperties">Свойства ↗</button></header>'+
      '<h2>'+esc(data.tube??"Выберите трубу")+'</h2><p class="cad-object-path">'+esc(data.project??"Проект")+' / '+esc(data.part??"Номер детали не указан")+"</p>"+
      '<div class="cad-evidence-tag">РАСПОЗНАННЫЕ ДАННЫЕ</div>'+
      value("Источник CAD",source)+value("Канонические примитивы",data.primitives||"Не подтверждены")+
      value("Статус геометрии",data.promotion?.status??"Пользовательская модель")+
      '<div class="cad-evidence-tag user">ПОЛЬЗОВАТЕЛЬСКАЯ МОДЕЛЬ</div>'+
      value("Редактируемые элементы",data.rows)+
      '<div class="cad-evidence-tag machine">СТАНОК / КОМПЕНСАЦИЯ</div>'+
      value("Оснастка",data.tooling?"Требует выбора":"См. проверку выпуска")+
      value("Компенсация в источнике",data.machineCompensation===false?"Не применена":data.machineCompensation===true?"Применена":"Неизвестно")+
      '<div class="cad-release-note">'+(data.stage==="release"
        ? (data.decision.allowed?"Проверка выпуска пройдена":"Выпуск заблокирован · "+data.decision.blockers.length+" причин")
        :data.blocked?"Импорт требует подтверждения перед производством":"Производственная готовность не проверена")+"</div>"+
      (data.stage==="release"?'<ul class="cad-blockers">'+data.decision.blockers.slice(0,6).map(issue=>"<li>"+esc(issue)+"</li>").join("")+"</ul>":"")+
      '<details><summary>Происхождение и неопределённости</summary><pre>'+esc(JSON.stringify({source:data.source,canonicalPromotion:data.promotion,issues:data.issues},null,2))+"</pre></details>";
    $("cadProperties").onclick=()=>execute("properties");
  }
  function toggle(){
    enabled=!enabled;
    document.body.classList.toggle("cad-workspace",enabled);
    ribbon.hidden=!enabled;inspector.hidden=!enabled;
    toolDrawer.hidden=true;
    if(!enabled)for(const node of movedTools)document.body.append(node);
    else for(const node of movedTools)toolDrawer.append(node);
    $("cadRestore").textContent=enabled?"Классический вид":"CAD Workspace";
    try{window.resize?.();window.markViewerDirty?.();}catch{}
  }
  function install(){
    if(!document.body.classList.contains("tb-project-map")||!api())return;
    document.body.classList.add("cad-workspace");
    ribbon=document.createElement("section");ribbon.id="cadRibbon";ribbon.setAttribute("aria-label","CAD рабочие пространства");
    ribbon.innerHTML='<div class="cad-ribbon-top"><div class="cad-stage-tabs" role="tablist">'+stages.map(item=>
      '<button type="button" role="tab" data-cad-stage="'+item[0]+'"><span>'+item[1]+"</span>"+item[2]+"</button>"
    ).join("")+'</div><div class="cad-ribbon-actions"><button type="button" id="cadTools">Все панели</button><button type="button" id="cadSearch">⌕ Найти команду <kbd>/</kbd></button></div></div><div id="cadCommands" role="toolbar" aria-label="Команды рабочего пространства"></div>';
    $("app").insertBefore(ribbon,document.querySelector(".tb-map-workspace"));
    ribbon.querySelectorAll("[data-cad-stage]").forEach(button=>{
      button.onclick=()=>{selectStage(button.dataset.cadStage);renderInspector();};
      button.onkeydown=event=>{
        if(!["ArrowLeft","ArrowRight"].includes(event.key))return;
        event.preventDefault();
        const index=stages.findIndex(item=>item[0]===stage);
        selectStage(stages[(index+(event.key==="ArrowRight"?1:4))%5][0]);
        ribbon.querySelector('[aria-selected="true"]').focus();
      };
    });
    $("cadSearch").onclick=()=>execute("search");
    toolDrawer=document.createElement("section");toolDrawer.id="cadToolDrawer";toolDrawer.hidden=true;
    toolDrawer.setAttribute("aria-label","Все существующие панели");
    document.body.append(toolDrawer);
    toolDrawer.addEventListener("click",event=>{
      if(event.target.closest("button")?.parentElement===toolDrawer)toolDrawer.hidden=true;
    });
    $("cadTools").onclick=toggleTools;
    collectTools();
    setTimeout(collectTools,2000);
    document.addEventListener("keydown",event=>{if(event.key==="Escape")toolDrawer.hidden=true;});
    inspector=document.createElement("section");inspector.id="cadInspector";
    document.querySelector(".tb-map-right").prepend(inspector);
    const restore=document.createElement("button");restore.id="cadRestore";restore.type="button";restore.textContent="Классический вид";restore.onclick=toggle;
    document.querySelector(".tb-map-header").append(restore);
    const badge=document.createElement("span");badge.className="cad-prototype-badge";badge.textContent="WORKSPACE LAB";
    document.querySelector(".tb-brand-title").append(badge);
    selectStage("geometry");renderInspector();
    const timer=setInterval(renderInspector,1500);
    window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
    window.TubeBenderCadWorkspace=Object.freeze({selectStage,execute,snapshot,toggle,commands:()=>commands.map(item=>({id:item[0],category:item[1],label:item[2]}))});
  }
  if(document.readyState==="complete")install();
  else window.addEventListener("load",install,{once:true});
})();
