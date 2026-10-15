(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const api=()=>window.TubeBenderEngineering;
  function call(target,method,...args){
    if(typeof target?.[method]!=="function")throw new Error("Команда недоступна: "+method);
    return target[method](...args);
  }
  function clickSelector(selector){
    const target=document.querySelector(selector);
    if(!target)throw new Error("Команда недоступна: "+selector);
    target.click();
  }
  let stage="geometry",inspector=null,ribbon=null,lastSnapshot="",toolDrawer=null;
  const displayKey="bendpipe.cad.toolbarDisplay.v1";
  const toolbarModes=["labels","icons","compact","compact-icons"];
  let inspectorTab="properties",displayModes={},panelMenu=null,menuTarget=null,menuReturnFocus=null;
  try{displayModes=JSON.parse(localStorage.getItem(displayKey)||"{}")||{};}catch{}
  if(typeof displayModes!=="object"||Array.isArray(displayModes))displayModes={};
  const commands=[
    ["import","Источник","Импорт CAD / проекта","↥",()=>click("tbActionOpen")],
    ["projectExport","Источник","JSON проекта","↧",()=>clickSelector('[data-action="projectExport"]')],
    ["recognition","Источник","Доказательства","◎",()=>selectInspector("source")],
    ["measure","Геометрия","Измерить","↔",()=>call(window.TubeBenderMeasurements,"open")],
    ["properties","Геометрия","Свойства","☷",()=>selectInspector("properties")],
    ["move","Геометрия","Переместить","✥",()=>hotkey("move")],
    ["copy","Геометрия","Копировать","▱",()=>hotkey("copy")],
    ["rotate","Геометрия","Повернуть","⟳",()=>hotkey("rotate")],
    ["array","Геометрия","Массив","⠿",()=>hotkey("array")],
    ["length","Геометрия","Длина","L",()=>hotkey("length")],
    ["angle","Геометрия","Угол","∠",()=>hotkey("angle")],
    ["constraints","Геометрия","Зависимости","⊥",()=>call(api(),"open","constraints")],
    ["modernConstraints","Геометрия","Связи объектов","⊡",()=>openExistingPanel("tbConstraintsPanel","tbConstraintsToggle")],
    ["layers","Геометрия","Слои","▱",()=>call(window.TubeBenderLayers,"openPanel")],
    ["groups","Геометрия","Группы","▦",()=>call(window.TubeBenderGroups,"openPanel")],
    ["assemblies","Геометрия","Сборки","◫",()=>call(window.TubeBenderAssemblies,"openPanel")],
    ["split","Геометрия","Разделить","⋮",()=>call(window.TubeBenderEditing,"open","split")],
    ["mirror","Геометрия","Отразить","◧",()=>call(window.TubeBenderEditing,"open","mirror")],
    ["stack","Геометрия","Преобразования","▥",()=>call(window.TubeBenderEditing,"open","stack")],
    ["views","Геометрия","Виды","◇",()=>call(window.TubeBenderNamedViews,"openPanel")],
    ["selectionSets","Геометрия","Наборы выбора","⊞",()=>call(window.TubeBenderSelectionSets,"openPanel")],
    ["snap","Геометрия","Привязки","⊕",()=>hotkey("snapSettings")],
    ["section","Геометрия","Сечение","◩",()=>call(window.TubeBenderSectionView,"openPanel")],
    ["material","Технология","Материалы","◈",()=>call(window.TubeBenderMaterials,"open")],
    ["style","Технология","Стиль трубы","⌁",()=>call(api(),"open","style")],
    ["ports","Технология","Порты P1 / P2","○",()=>call(api(),"open","ports")],
    ["autoroute","Технология","Автотрасса","⌇",()=>call(api(),"open","autoroute")],
    ["manufacturing","Технология","YBC / LRA","≋",()=>call(api(),"open","manufacturing")],
    ["equipment","Станок","Оборудование","⚙",()=>call(window.TubeBenderEquipmentLibrary,"open")],
    ["machine","Станок","Профиль станка","▧",()=>call(api(),"open","machine")],
    ["simulation","Станок","Симуляция","▷",()=>call(api(),"open","simulation")],
    ["tooling","Станок","Оснастка","◉",()=>call(window.TubeBenderEquipmentLibrary,"open","tooling-sets")],
    ["setup","Станок","Наладка","⚒",()=>call(window.TubeBenderEquipmentLibrary,"open","setups")],
    ["sequence","Станок","Порядок гибов","≡",()=>call(window.TubeBenderEquipmentLibrary,"open","sequence")],
    ["trim","Станок","Обрезка","⌿",()=>call(window.TubeBenderEquipmentLibrary,"open","trim")],
    ["clearance","Станок","Зазоры","↔",()=>call(window.TubeBenderEquipmentLibrary,"open","clearance")],
    ["reports","Выпуск","Отчёты / экспорт","▤",()=>call(api(),"open","reports")],
    ["diagnostics","Выпуск","Проверка выпуска","✓",()=>call(api(),"open","overview")],
    ["history","Выпуск","История","↶",()=>hotkey("history")],
    ["revisions","Выпуск","Ревизии","◷",()=>call(api(),"open","revisions")],
    ["settings","Общие","Настройки","⚙",()=>click("tbActionSettings")],
    ["search","Общие","Все команды","⌕",()=>call(window.TubeBenderCommandLine,"open")]
  ];
  const stages=[
    ["source","01","Источник","Источник"],["geometry","02","Геометрия","Геометрия"],
    ["technology","03","Технология","Технология"],["machine","04","Станок","Станок"],
    ["release","05","Выпуск","Выпуск"]
  ];
  function click(id){const target=$(id);if(!target)throw new Error("Команда недоступна: "+id);target.click();}
  function openExistingPanel(panelId,toggleId){
    const panel=$(panelId);
    if(!panel)throw new Error("Панель недоступна: "+panelId);
    if(!panel.classList.contains("open"))click(toggleId);
    return true;
  }
  function isNativeTool(node){
    return node.nodeType===1&&((node.tagName==="BUTTON"&&node.id.startsWith("tb"))||node.id==="tbTransformGizmoPanel");
  }
  function collectTools(){
    for(const node of [...document.body.children,...document.querySelectorAll('.tb-head-actions>button:not(.tb-head-action)')]){
      if(isNativeTool(node))toolDrawer.append(node);
    }
  }
  function toggleTools(){collectTools();toolDrawer.hidden=!toolDrawer.hidden;}
  function hotkey(id){if(typeof window.TubeBenderHotkeys?.execute!=="function")throw new Error("Команды ещё загружаются");return window.TubeBenderHotkeys.execute(id);}
  function revealModel(){
    if(document.querySelector('.tb-bottom-tab[data-tab="unfold"].active')){
      document.querySelector('.tb-bottom-tab[data-tab="3d"]')?.click();
    }
  }
  function execute(id){
    const command=commands.find(item=>item[0]===id);
    if(!command)return false;
    revealModel();
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
    revealModel();
    stage=id;
    ribbon.querySelectorAll("[data-cad-stage]").forEach(button=>{
      const active=button.dataset.cadStage===stage;
      button.setAttribute("aria-selected",String(active));
      button.tabIndex=active?0:-1;
    });
    const category=stages.find(item=>item[0]===stage)[3];
    $("cadCommands").innerHTML=commands.filter(item=>item[1]===category).map(item=>
      '<button type="button" data-cad-command="'+item[0]+'" title="'+esc(item[2])+'" aria-label="'+esc(item[2])+'"><span class="cad-command-icon" aria-hidden="true">'+item[3]+'</span><span class="cad-command-label">'+item[2]+"</span></button>"
    ).join("");
    $("cadCommands").querySelectorAll("button").forEach(button=>button.onclick=()=>execute(button.dataset.cadCommand));
    if(id==="source")selectInspector("source");
    if(id==="release")selectInspector("checks");
  }
  function selectInspector(tab,{reveal=true}={}){
    if(!["properties","source","checks"].includes(tab))return;
    inspectorTab=tab;lastSnapshot="";
    if(reveal&&innerWidth<=860)document.body.classList.add("tb-show-checks");
    inspector.querySelectorAll("[data-inspector-tab]").forEach(button=>{
      const selected=button.dataset.inspectorTab===tab;
      button.setAttribute("aria-selected",String(selected));button.tabIndex=selected?0:-1;
    });
    $("cadPropertySlot").hidden=tab!=="properties";
    $("cadInspectorContent").hidden=tab==="properties";
    if(tab==="properties"&&reveal)window.TubeBenderProperties?.open?.();
    else if(tab==="properties")window.TubeBenderProperties?.refresh?.();
    else window.TubeBenderProperties?.close?.();
    renderInspector();
  }
  function applyDisplay(panel,mode){
    const key=panel.dataset.cadToolbar;
    displayModes[key]=toolbarModes.includes(mode)?mode:"labels";
    panel.dataset.cadDisplay=displayModes[key];
    try{localStorage.setItem(displayKey,JSON.stringify(displayModes));}catch{}
    updateCompactLayout();
  }
  function updateCompactLayout(){
    const isCompact=panel=>["compact","compact-icons"].includes(panel?.dataset.cadDisplay);
    document.body.classList.toggle("cad-toolbar-compact",isCompact($("cadCommands")));
    document.body.classList.toggle("cad-header-compact",isCompact(document.querySelector(".tb-head-actions")));
    requestAnimationFrame(()=>{try{window.resize?.();window.markViewerDirty?.();}catch{}});
  }
  function closePanelMenu(restoreFocus=false){
    if(!panelMenu)return;
    panelMenu.hidden=true;
    if(restoreFocus&&menuReturnFocus?.isConnected)menuReturnFocus.focus();
  }
  function showPanelMenu(event,panel){
    event.preventDefault();menuTarget=panel;
    menuReturnFocus=document.activeElement;
    panelMenu.hidden=false;
    const mode=panel.dataset.cadDisplay;
    panelMenu.querySelectorAll("[data-display-mode]").forEach(button=>
      button.setAttribute("aria-checked",String(button.dataset.displayMode===mode)));
    const rect=panel.getBoundingClientRect();
    const x=event.type==="keydown"?rect.left:event.clientX;
    const y=event.type==="keydown"?rect.bottom:event.clientY;
    panelMenu.style.left=Math.max(8,Math.min(x,innerWidth-panelMenu.offsetWidth-8))+"px";
    panelMenu.style.top=Math.max(8,Math.min(y,innerHeight-panelMenu.offsetHeight-8))+"px";
    panelMenu.querySelector('[aria-checked="true"]').focus();
  }
  function installPanelMenu(){
    panelMenu=document.createElement("div");panelMenu.id="cadPanelMenu";panelMenu.hidden=true;
    panelMenu.setAttribute("role","menu");panelMenu.setAttribute("aria-label","Отображение панели инструментов");
    panelMenu.innerHTML='<div class="cad-menu-title">Отображение панели</div>'+
      '<button type="button" role="menuitemradio" data-display-mode="labels">Иконки с подписями</button>'+
      '<button type="button" role="menuitemradio" data-display-mode="icons">Только иконки</button>'+
      '<button type="button" role="menuitemradio" data-display-mode="compact">Компактный вид</button>'+
      '<button type="button" role="menuitemradio" data-display-mode="compact-icons">Компактный вид без подписей</button>';
    document.body.append(panelMenu);
    panelMenu.querySelectorAll("button").forEach(button=>button.onclick=()=>{
      applyDisplay(menuTarget,button.dataset.displayMode);closePanelMenu(true);
    });
    panelMenu.onkeydown=event=>{
      event.stopPropagation();
      if(["Enter"," ","Spacebar"].includes(event.key)){
        event.preventDefault();
        if(!event.repeat)document.activeElement?.closest('[role="menuitemradio"]')?.click();
        return;
      }
      if(event.key==="Escape"){event.preventDefault();closePanelMenu(true);}
      if(["ArrowUp","ArrowDown","Home","End"].includes(event.key)){
        event.preventDefault();
        const buttons=[...panelMenu.querySelectorAll("button")];
        const index=buttons.indexOf(document.activeElement);
        const next=event.key==="Home"?0:event.key==="End"?buttons.length-1:
          (index+(event.key==="ArrowUp"?-1:1)+buttons.length)%buttons.length;
        buttons[next].focus();
      }
    };
    const header=document.querySelector(".tb-head-actions");
    for(const button of header.querySelectorAll("button")){
      const label=button.getAttribute("aria-label")||button.querySelector(".txt")?.textContent||
        button.title||button.textContent.trim();
      button.setAttribute("aria-label",label);button.title=label;
      if(!button.querySelector(".glyph")){
        const text=document.createElement("span");text.className="txt";text.textContent=button.textContent;
        const glyph=document.createElement("span");glyph.className="glyph";glyph.setAttribute("aria-hidden","true");
        glyph.textContent=/measure/i.test(button.id)?"↔":"✥";button.replaceChildren(glyph,text);
      }else if(!button.querySelector(".txt")){
        const text=document.createElement("span");text.className="txt";
        text.textContent=({"tbActionUndo":"Отменить","tbActionRedo":"Повторить","tbActionHelp":"Справка"})[button.id]||label;
        button.append(text);
      }
    }
    for(const [panel,key,defaultMode] of [[$("cadCommands"),"commands","labels"],[document.querySelector(".tb-head-actions"),"header","icons"]]){
      panel.dataset.cadToolbar=key;
      panel.dataset.cadDisplay=toolbarModes.includes(displayModes[key])?displayModes[key]:defaultMode;
      panel.addEventListener("contextmenu",event=>showPanelMenu(event,panel));
      panel.addEventListener("keydown",event=>{
        if(["Enter"," ","Spacebar"].includes(event.key)&&event.target.tagName==="BUTTON"){
          event.preventDefault();event.stopPropagation();
          if(!event.repeat)event.target.click();
          return;
        }
        if(event.key==="ContextMenu"||(event.shiftKey&&event.key==="F10"))showPanelMenu(event,panel);
      });
    }
    updateCompactLayout();
    ribbon.addEventListener("contextmenu",event=>{if(!event.defaultPrevented)showPanelMenu(event,$("cadCommands"));});
    document.addEventListener("pointerdown",event=>{if(!panelMenu.contains(event.target))closePanelMenu();});
    window.addEventListener("resize",()=>closePanelMenu());
    document.addEventListener("scroll",()=>closePanelMenu(),true);
  }
  function snapshot(){
    const tube=api()?.activeTube?.(),project=api()?.activeProject?.();
    const evidence=tube?.importEvidence??{},validation=tube?.importValidation??{};
    const primitives=evidence.canonicalGeometry?.primitives??[];
    let decision={allowed:false,blockers:["Проверка выпуска ещё не выполнена"]};
    // Use the actual production gate on demand, never infer readiness from a colour or import status.
    if(inspectorTab==="checks")try{decision=api().productionReleaseDecision(tube,"manufacturing");}catch(error){decision.blockers=[error.message];}
    return {project:project?.name,tube:tube?.name,part:tube?.partNumber??tube?.engineering?.partNumber??null,
      rows:tube?.rows?.length??0,primitives:primitives.length,source:evidence.source??null,
      promotion:evidence.canonicalPromotion??null,issues:validation.issues??[],
      blocked:validation.productionBlocked===true,tooling:tube?.toolingUnresolved===true,
      machineCompensation:evidence.machineCompensationApplied??null,decision,stage,inspectorTab};
  }
  function renderInspector(){
    if(document.hidden)return;
    const data=snapshot(),key=JSON.stringify(data);
    if(key===lastSnapshot)return;lastSnapshot=key;
    const value=(label,text)=>'<div class="cad-value"><span>'+label+'</span><strong>'+esc(text??"Неизвестно")+"</strong></div>";
    const source=data.source?.file??data.source?.source_file??"Источник не указан";
    $("cadInspectorContent").innerHTML='<header><span>АКТИВНАЯ ТРУБА</span></header>'+
      '<h2>'+esc(data.tube??"Выберите трубу")+'</h2><p class="cad-object-path">'+esc(data.project??"Проект")+' / '+esc(data.part??"Номер детали не указан")+"</p>"+
      (inspectorTab==="source"?'<div class="cad-evidence-tag">РАСПОЗНАННЫЕ ДАННЫЕ</div>'+
      value("Источник CAD",source)+value("Канонические примитивы",data.primitives||"Не подтверждены")+
      value("Статус геометрии",data.promotion?.status??"Пользовательская модель")+
      '<div class="cad-evidence-tag user">ПОЛЬЗОВАТЕЛЬСКАЯ МОДЕЛЬ</div>'+
      value("Редактируемые элементы",data.rows)+
      '<div class="cad-evidence-tag machine">СТАНОК / КОМПЕНСАЦИЯ</div>'+
      value("Оснастка",data.tooling?"Требует выбора":"См. проверку выпуска")+
      value("Компенсация в источнике",data.machineCompensation===false?"Не применена":data.machineCompensation===true?"Применена":"Неизвестно"):"")+
      '<div class="cad-release-note">'+(inspectorTab==="checks"
        ? (data.decision.allowed?"Проверка выпуска пройдена":"Выпуск заблокирован · "+data.decision.blockers.length+" причин")
        :data.blocked?"Импорт требует подтверждения перед производством":"Производственная готовность не проверена")+"</div>"+
      (inspectorTab==="checks"?'<ul class="cad-blockers">'+data.decision.blockers.map(issue=>"<li>"+esc(issue)+"</li>").join("")+"</ul>":"")+
      '<details><summary>Происхождение и неопределённости</summary><pre>'+esc(JSON.stringify({source:data.source,canonicalPromotion:data.promotion,issues:data.issues},null,2))+"</pre></details>";
  }
  function install(){
    if(window.TubeBenderCadWorkspace)return true;
    if(!document.body.classList.contains("tb-project-map")||!api())return false;
    document.body.classList.add("cad-workspace");
    ribbon=document.createElement("section");ribbon.id="cadRibbon";ribbon.setAttribute("aria-label","CAD рабочие пространства");
    ribbon.innerHTML='<div class="cad-ribbon-top"><div class="cad-stage-tabs" role="tablist">'+stages.map(item=>
      '<button type="button" role="tab" data-cad-stage="'+item[0]+'"><span>'+item[1]+"</span>"+item[2]+"</button>"
    ).join("")+'</div><div class="cad-ribbon-actions"><button type="button" id="cadTools">Все панели</button><button type="button" id="cadSearch">⌕ Найти команду <kbd>/</kbd></button></div></div><div id="cadCommands" role="toolbar" aria-label="Команды рабочего пространства"></div>';
    $("app").insertBefore(ribbon,document.querySelector(".tb-map-workspace"));
    ribbon.querySelectorAll("[data-cad-stage]").forEach(button=>{
      button.onclick=()=>{selectStage(button.dataset.cadStage);renderInspector();};
      button.onkeydown=event=>{
        if(["Enter"," ","Spacebar"].includes(event.key)){event.preventDefault();event.stopPropagation();if(!event.repeat)button.click();return;}
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
    const headerActions=document.querySelector('.tb-head-actions');
    const toolObserver=new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes){
        if((node.parentElement===document.body||node.parentElement===headerActions)&&
          isNativeTool(node)&&!node.classList.contains('tb-head-action'))toolDrawer.append(node);
      }
    });
    toolObserver.observe(document.body,{childList:true});
    if(headerActions)toolObserver.observe(headerActions,{childList:true});
    window.addEventListener("pagehide",()=>toolObserver.disconnect(),{once:true});
    document.addEventListener("keydown",event=>{if(event.key==="Escape")toolDrawer.hidden=true;});
    inspector=document.createElement("section");inspector.id="cadInspector";
    inspector.innerHTML='<div class="cad-inspector-tabs" role="tablist" aria-label="Инспектор">'+
      [["properties","Свойства"],["source","Источник"],["checks","Проверки"]].map(([id,label])=>
        '<button type="button" role="tab" data-inspector-tab="'+id+'">'+label+"</button>").join("")+
      '</div><div id="cadPropertySlot"></div><div id="cadInspectorContent" hidden></div>';
    document.querySelector(".tb-map-right").prepend(inspector);
    const propertyPanel=$("tbPropertiesPanel");
    if(propertyPanel){
      $("cadPropertySlot").append(propertyPanel);
      const observer=new MutationObserver(()=>{
        if(propertyPanel.classList.contains("open")){
          if(inspectorTab!=="properties")selectInspector("properties");
          else if(innerWidth<=860)document.body.classList.add("tb-show-checks");
        }
      });
      observer.observe(propertyPanel,{attributes:true,attributeFilter:["class"]});
      window.addEventListener("pagehide",()=>observer.disconnect(),{once:true});
    }
    inspector.querySelectorAll("[data-inspector-tab]").forEach(button=>{
      button.onclick=()=>selectInspector(button.dataset.inspectorTab);
      button.onkeydown=event=>{
        if(["Enter"," ","Spacebar"].includes(event.key)){event.preventDefault();event.stopPropagation();if(!event.repeat)button.click();return;}
        if(!["ArrowLeft","ArrowRight"].includes(event.key))return;
        event.preventDefault();
        const tabs=["properties","source","checks"],index=tabs.indexOf(inspectorTab);
        selectInspector(tabs[(index+(event.key==="ArrowRight"?1:2))%3]);
        inspector.querySelector('[aria-selected="true"]').focus();
      };
    });
    installPanelMenu();
    document.querySelector('.tb-bottom-tab[data-tab="checks"]')?.addEventListener("click",()=>{
      selectInspector("checks");
    });
    selectInspector("properties",{reveal:false});
    const badge=document.createElement("span");badge.className="cad-workspace-badge";badge.textContent="CAD WORKSPACE";
    document.querySelector(".tb-brand-title").append(badge);
    selectStage("geometry");renderInspector();
    const timer=setInterval(renderInspector,1500);
    window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
    window.TubeBenderCadWorkspace=Object.freeze({selectStage,selectInspector,execute,snapshot,commands:()=>commands.map(item=>({id:item[0],category:item[1],label:item[2]}))});
    return true;
  }
  function boot(){
    try{
      if(!install())throw new Error("CAD application shell is unavailable");
      document.documentElement.dataset.cadBoot="ready";
      $("cadStartupStatus")?.remove();
      document.dispatchEvent(new CustomEvent("bendpipe:cad-workspace-ready"));
    }catch(error){
      document.documentElement.dataset.cadBoot="error";
      const status=$("cadStartupStatus");
      if(status)status.textContent="Не удалось открыть CAD Workspace. Обновите страницу.";
      console.error("CAD Workspace startup failed",error);
    }
  }
  if(document.readyState==="loading")window.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
