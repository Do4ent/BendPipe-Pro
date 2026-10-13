(()=>{
  const HOTKEYS_URL="__TB_HOTKEYS_MODULE_URL__";
  const STORAGE_KEY="tubebender.hotkeys.v1";
  const FILTER_KEY="tubebender.selectionFilter.v1";
  let domain=null,installed=false,map=null,panel=null,toggle=null,filterPanel=null,observer=null;
  const FILTER_KINDS=Object.freeze([
    ["tube","Tube"],["row","Tube element"],["mesh-instance","Editable Mesh"],["ref","Source / Reference"],
    ["group","Group"],["project-assembly","Assembly"],["dimension","Dimension"],["construction","Construction"]
  ]);
  let selectionFilter=Object.fromEntries(FILTER_KINDS.map(([kind])=>[kind,true]));
  const toast=(m)=>{try{window.TubeBenderEngineering?.toast?.(String(m??""));}catch{}};
  const clone=(v)=>v==null?v:structuredClone(v);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  function load(){
    let raw="";try{raw=localStorage.getItem(STORAGE_KEY)||"";}catch{}
    map=domain.parseHotkeyMap(raw);
    try{
      const parsed=JSON.parse(localStorage.getItem(FILTER_KEY)||"{}");
      for(const [kind] of FILTER_KINDS)if(typeof parsed?.[kind]==="boolean")selectionFilter[kind]=parsed[kind];
    }catch{}
  }
  function save(){
    try{localStorage.setItem(STORAGE_KEY,domain.serializeHotkeyMap(map));}catch{}
    try{localStorage.setItem(FILTER_KEY,JSON.stringify(selectionFilter));}catch{}
  }
  function isTextTarget(target){return !!target&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/i.test(String(target.tagName||"")));}
  function shortcut(commandId){return domain.shortcutLabel(map,commandId);}
  function matchesCommand(event,commandId){return domain.matchesCommand(event,map,commandId);}
  function cycleUcs(){
    const api=window.TubeBenderTransformGizmo;if(!api?.setCoordinateSystem)return false;
    const current=String(api.settings?.()?.cs??"global"),order=["global","local","user"];
    const next=order[(Math.max(0,order.indexOf(current))+1)%order.length];
    api.setCoordinateSystem(next);toast("UCS: "+next);return true;
  }
  function cancelActive(){
    let handled=false;
    try{if(document.getElementById("tbEditingPanel")?.classList.contains("open")){window.TubeBenderEditing?.close?.();handled=true;}}catch{}
    try{if(window.TubeBenderMeasurements?.quickState?.()?.active){window.TubeBenderMeasurements.stopQuickMeasure();handled=true;}}catch{}
    try{window.TubeBenderSnapTracking?.endCommand?.();}catch{}
    try{if(window.TubeBenderAssemblies?.editing?.()){window.TubeBenderAssemblies.exitEdit?.();handled=true;}}catch{}
    if(filterPanel?.classList.contains("open")){filterPanel.classList.remove("open");handled=true;}
    if(panel?.classList.contains("open")){panel.classList.remove("open");handled=true;}
    try{window.dispatchEvent(new CustomEvent("tubebender-hotkey-cancel"));}catch{}
    return handled;
  }
  function execute(commandId){
    switch(String(commandId)){
      case "move": window.TubeBenderEditing?.open?.("move");return true;
      case "copy": window.TubeBenderEditing?.open?.("copy");return true;
      case "rotate": window.TubeBenderEditing?.open?.("rotate");return true;
      case "array": window.TubeBenderEditing?.open?.("array");return true;
      case "divide": window.TubeBenderEditing?.open?.("split");return true;
      case "length": return window.TubeBenderGeometryGrips?.focusScalarEdit?.("length")??false;
      case "angle": return window.TubeBenderGeometryGrips?.focusScalarEdit?.("angle")??false;
      case "quickMeasure":
        window.TubeBenderMeasurements?.open?.();
        return window.TubeBenderMeasurements?.startQuickMeasure?.()??false;
      case "snapSettings": return window.TubeBenderSnapTracking?.openSettings?.()??false;
      case "selectionFilter": openSelectionFilter();return true;
      case "activeUcs": return cycleUcs();
      case "history": window.TubeBenderHistory?.openPanel?.();return true;
      case "properties": window.TubeBenderProperties?.open?.();return true;
      case "cancel": return cancelActive();
      // Repeat/confirm is owned by the Repeat Commands runtime so active commands can consume Enter first.
      case "repeatLast":
      case "repeatLastAlt": return false;
      default:return false;
    }
  }
  function onKeyDown(event){
    if(event.defaultPrevented||event.repeat)return;
    const command=domain.commandForChord(map,domain.eventChord(event));
    if(!command)return;
    if(command.id==="repeatLast"||command.id==="repeatLastAlt")return;
    if(command.id!=="cancel"&&isTextTarget(event.target))return;
    const result=execute(command.id);
    if(result!==false){event.preventDefault();event.stopPropagation();}
  }
  function allows(entry){
    if(!entry)return true;
    const kind=String(entry.kind??"");
    if(Object.prototype.hasOwnProperty.call(selectionFilter,kind))return selectionFilter[kind]!==false;
    if(kind==="origin"||kind==="end"||kind==="assembly"||kind==="assembly-part")return selectionFilter.row!==false;
    return true;
  }
  function setFilter(kind,value){
    if(!Object.prototype.hasOwnProperty.call(selectionFilter,String(kind)))throw new Error("Unknown selection filter kind");
    selectionFilter[String(kind)]=value===true;save();renderSelectionFilter();
    try{window.dispatchEvent(new CustomEvent("tubebender-selection-filter-change",{detail:{filter:clone(selectionFilter)}}));}catch{}
    return clone(selectionFilter);
  }
  function ensureSelectionFilter(){
    if(filterPanel)return filterPanel;
    filterPanel=document.createElement("section");filterPanel.id="tbSelectionFilterPanel";
    filterPanel.innerHTML='<div class="tb-hotkey-head"><b>Selection Filter</b><span class="grow"></span><button data-filter-all>All</button><button data-filter-close>×</button></div><div class="tb-hotkey-body" data-filter-body></div>';
    document.body.appendChild(filterPanel);
    filterPanel.querySelector("[data-filter-close]").onclick=()=>filterPanel.classList.remove("open");
    filterPanel.querySelector("[data-filter-all]").onclick=()=>{for(const [kind] of FILTER_KINDS)selectionFilter[kind]=true;save();renderSelectionFilter();};
    return filterPanel;
  }
  function renderSelectionFilter(){
    const root=ensureSelectionFilter(),body=root.querySelector("[data-filter-body]");
    body.innerHTML=FILTER_KINDS.map(([kind,label])=>'<label class="tb-filter-row"><input type="checkbox" data-filter-kind="'+esc(kind)+'" '+(selectionFilter[kind]!==false?"checked":"")+'><span>'+esc(label)+'</span></label>').join("");
    body.querySelectorAll("[data-filter-kind]").forEach(input=>input.onchange=()=>setFilter(input.dataset.filterKind,input.checked));
  }
  function openSelectionFilter(){ensureSelectionFilter().classList.add("open");renderSelectionFilter();}
  function ensurePanel(){
    if(panel)return panel;
    const style=document.createElement("style");style.id="tbHotkeyStyles";style.textContent=
      '#tbHotkeySettingsToggle{position:fixed;right:405px;top:54px;z-index:120369;background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:6px;padding:6px 10px;cursor:pointer}'+
      '#tbHotkeySettingsPanel,#tbSelectionFilterPanel{position:fixed;right:14px;top:88px;width:min(520px,calc(100vw - 28px));max-height:calc(100vh - 110px);z-index:120362;display:none;flex-direction:column;background:rgba(13,22,32,.985);color:#edf4fb;border:1px solid #41566f;border-radius:9px;box-shadow:0 14px 40px rgba(0,0,0,.45);font:12px system-ui}#tbHotkeySettingsPanel.open,#tbSelectionFilterPanel.open{display:flex}.tb-hotkey-head{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #304154}.tb-hotkey-head .grow{flex:1}.tb-hotkey-body{overflow:auto;padding:8px}.tb-hotkey-row{display:grid;grid-template-columns:125px 1fr 155px;gap:7px;align-items:center;padding:4px 0}.tb-hotkey-row input{background:#09131c;color:#fff;border:1px solid #40536a;border-radius:4px;padding:5px}.tb-hotkey-category{color:#8296aa;font-size:10px}.tb-hotkey-actions{display:flex;gap:6px;justify-content:flex-end;padding:8px;border-top:1px solid #304154}.tb-hotkey-actions button,.tb-hotkey-head button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:5px 7px;cursor:pointer}.tb-hotkey-error{min-height:18px;color:#ffb4b4;padding:0 8px 7px}.tb-hotkey-hint{margin-left:7px;color:#90a5ba;font:10px system-ui;border:1px solid #52677d;border-radius:3px;padding:1px 4px}.tb-filter-row{display:flex;align-items:center;gap:8px;padding:6px 3px}';
    document.head.appendChild(style);
    toggle=document.createElement("button");toggle.id="tbHotkeySettingsToggle";toggle.type="button";toggle.textContent="Настройки";document.body.appendChild(toggle);
    panel=document.createElement("section");panel.id="tbHotkeySettingsPanel";
    panel.innerHTML='<div class="tb-hotkey-head"><b>Настройки · Горячие клавиши</b><span class="grow"></span><button data-hotkey-close>×</button></div><div class="tb-hotkey-body" data-hotkey-body></div><div class="tb-hotkey-error" data-hotkey-error></div><div class="tb-hotkey-actions"><button data-hotkey-reset>По умолчанию</button><button data-hotkey-save>Сохранить</button></div>';
    document.body.appendChild(panel);
    toggle.onclick=()=>{panel.classList.toggle("open");renderSettings();};
    panel.querySelector("[data-hotkey-close]").onclick=()=>panel.classList.remove("open");
    panel.querySelector("[data-hotkey-reset]").onclick=()=>{map=domain.defaultHotkeyMap();save();renderSettings();decorate();dispatch();};
    panel.querySelector("[data-hotkey-save]").onclick=saveFromPanel;
    ensureSelectionFilter();
    return panel;
  }
  function renderSettings(){
    if(!panel)return;
    const body=panel.querySelector("[data-hotkey-body]");
    body.innerHTML=domain.HOTKEY_COMMANDS.map(command=>
      '<label class="tb-hotkey-row"><span>'+esc(command.label)+'<br><span class="tb-hotkey-category">'+esc(command.category)+'</span></span><input data-hotkey-id="'+esc(command.id)+'" value="'+esc(shortcut(command.id))+'" autocomplete="off" spellcheck="false"><span>Default: '+esc(command.default_chord)+'</span></label>'
    ).join("");
    body.querySelectorAll("[data-hotkey-id]").forEach(input=>{
      input.addEventListener("keydown",event=>{
        if(["Tab"].includes(event.key))return;
        event.preventDefault();
        if(event.key==="Backspace"||event.key==="Delete"){input.value="";return;}
        const chord=domain.eventChord(event);if(chord)input.value=chord;
      });
    });
    panel.querySelector("[data-hotkey-error]").textContent="";
  }
  function saveFromPanel(){
    const inputs=[...panel.querySelectorAll("[data-hotkey-id]")],next={...map};
    try{
      for(const input of inputs)next[input.dataset.hotkeyId]=domain.normalizeChord(input.value);
      map=domain.normalizeHotkeyMap(next);save();decorate();dispatch();
      panel.querySelector("[data-hotkey-error]").textContent="";
      toast("Горячие клавиши сохранены");return true;
    }catch(error){
      panel.querySelector("[data-hotkey-error]").textContent=String(error?.message??error);return false;
    }
  }
  const DECORATORS=Object.freeze([
    ["move",'[data-tool="move"]'],["copy",'[data-tool="copy"]'],["rotate",'[data-tool="rotate"]'],["array",'[data-tool="array"]'],["divide",'[data-tool="split"]'],
    ["properties","#tbPropertiesToggle"],["snapSettings","#tbSnapSourceButton"],["quickMeasure","#tbMeasurementsButton"],["history","#tbHistoryButton"]
  ]);
  function applyHint(element,commandId){
    if(!element)return;
    const key=shortcut(commandId);if(!key)return;
    element.dataset.hotkeyCommand=commandId;
    const baseTitle=element.dataset.hotkeyBaseTitle??element.getAttribute("title")??element.textContent?.trim()??"";
    element.dataset.hotkeyBaseTitle=baseTitle;
    element.title=(baseTitle?baseTitle+" · ":"")+key;
    let hint=element.querySelector?.(":scope > .tb-hotkey-hint");
    if(!hint&&element.matches?.("button")){
      hint=document.createElement("kbd");hint.className="tb-hotkey-hint";element.appendChild(hint);
    }
    if(hint)hint.textContent=key;
  }
  function decorate(root=document){
    for(const [commandId,selector] of DECORATORS)for(const element of root.querySelectorAll?.(selector)??[])applyHint(element,commandId);
    for(const element of root.querySelectorAll?.("[data-object-action]")??[]){
      const action=String(element.dataset.objectAction);
      if(action==="move")applyHint(element,"move");
      if(action==="properties")applyHint(element,"properties");
    }
  }
  function observe(){
    observer?.disconnect?.();observer=new MutationObserver(mutations=>{
      for(const mutation of mutations)for(const node of mutation.addedNodes??[])if(node?.nodeType===1)decorate(node);
    });observer.observe(document.body,{childList:true,subtree:true});
  }
  function dispatch(){try{window.dispatchEvent(new CustomEvent("tubebender-hotkey-change",{detail:{map:clone(map)}}));}catch{}}
  async function install(){
    if(installed)return;installed=true;
    try{domain=await import(HOTKEYS_URL);}catch(error){console.error("Hotkeys runtime failed",error);return;}
    load();ensurePanel();renderSettings();renderSelectionFilter();decorate();observe();
    window.addEventListener("keydown",onKeyDown,false);
    window.TubeBenderSelectionFilter=Object.freeze({allows,set:setFilter,state:()=>clone(selectionFilter),open:openSelectionFilter});
    window.TubeBenderHotkeys=Object.freeze({
      execute,shortcut,matchesCommand,map:()=>clone(map),set:(id,chord)=>{map=domain.setHotkey(map,id,chord);save();decorate();renderSettings();dispatch();return shortcut(id);},
      reset:()=>{map=domain.defaultHotkeyMap();save();decorate();renderSettings();dispatch();return clone(map);},
      openSettings:()=>{ensurePanel().classList.add("open");renderSettings();},decorate,
      selectionAllowed:allows,openSelectionFilter,domain
    });
    dispatch();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();