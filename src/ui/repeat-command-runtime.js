(()=>{
  const REPEAT_URL="__TB_REPEAT_COMMAND_MODULE_URL__";
  const STORAGE_KEY="tubebender.repeatCommands.v1";
  let domain=null,installed=false,panel=null,toggle=null,state=null;
  const handlers=new Map();
  const clone=(v)=>v==null?v:structuredClone(v);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const toast=(message)=>{try{window.TubeBenderEngineering?.toast?.(String(message??""));}catch{}};
  function loadState(){
    let raw="";try{raw=localStorage.getItem(STORAGE_KEY)||"";}catch{}
    state=domain.parseRepeatState(raw,{limit:12});
    return state;
  }
  function saveState(){
    try{localStorage.setItem(STORAGE_KEY,domain.serializeRepeatState(state));}catch{}
  }
  function setRecent(recent){
    state=domain.createRepeatState({recent,limit:state?.limit??12});
    saveState();renderRecent();dispatch();return state;
  }
  function record(id,label,settings={},source="ui"){
    const command=domain.normalizeRepeatCommand({id,label,settings,source,timestamp:Date.now()});
    const recent=domain.pushRecentCommand(state?.recent??[],command,{limit:state?.limit??12});
    setRecent(recent);
    return command;
  }
  function register({id,label,run}={}){
    const key=String(id??"").trim();if(!key||typeof run!=="function")throw new Error("Repeat command registration requires id and run");
    handlers.set(key,{id:key,label:String(label??key),run});
    return ()=>handlers.delete(key);
  }
  function canRepeat(command=state?.last){
    return !!command&&handlers.has(String(command.id));
  }
  async function repeat(command=state?.last){
    if(!command){toast("Нет последней команды для повтора");return false;}
    const handler=handlers.get(String(command.id));
    if(!handler){toast("Команда больше недоступна: "+String(command.label??command.id));return false;}
    try{
      const result=await handler.run(clone(command.settings??{}),clone(command));
      if(result===false)return false;
      // Repeating a command should make it most recent, but should not duplicate identical head entries.
      record(command.id,command.label,command.settings,command.source);
      return result===undefined?true:result;
    }catch(error){
      toast(error?.message??error);return false;
    }
  }
  function repeatByIndex(index){
    const command=state?.recent?.[Number(index)];
    return command?repeat(command):false;
  }
  function clearRecent(){
    setRecent([]);return true;
  }
  function lastLabel(){
    return state?.last?domain.repeatDisplayLabel(state.last):"Повторить команду";
  }
  function isTextTarget(target){
    return !!target&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/i.test(String(target.tagName||"")));
  }
  function editingBusy(){
    const edit=document.getElementById("tbEditingPanel");
    if(edit?.classList.contains("open"))return true;
    if(document.querySelector(".tb-object-move-panel[style*='display: block'],#tbObjectMovePanel[style*='display: block']"))return true;
    return false;
  }
  function onKeyDown(event){
    if(event.defaultPrevented||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
    if(isTextTarget(event.target)||editingBusy())return;
    if(event.key!=="Enter"&&event.key!==" ")return;
    if(!canRepeat())return;
    event.preventDefault();event.stopPropagation();
    repeat();
  }
  function ensurePanel(){
    if(panel)return panel;
    const style=document.createElement("style");style.id="tbRepeatCommandStyles";style.textContent=
      '#tbRecentCommandsToggle{position:fixed;right:326px;top:54px;z-index:120368;background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:6px;padding:6px 10px;cursor:pointer}'+
      '#tbRecentCommandsPanel{position:fixed;right:14px;top:88px;width:min(380px,calc(100vw - 28px));max-height:calc(100vh - 110px);z-index:120361;display:none;flex-direction:column;background:rgba(13,22,32,.985);color:#edf4fb;border:1px solid #41566f;border-radius:9px;box-shadow:0 14px 40px rgba(0,0,0,.45);font:12px system-ui}#tbRecentCommandsPanel.open{display:flex}.tb-recent-head{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #304154}.tb-recent-head .grow{flex:1}.tb-recent-body{overflow:auto;padding:7px}.tb-recent-row{display:flex;align-items:center;gap:7px;width:100%;background:transparent;color:#eef5ff;border:0;border-radius:5px;padding:7px 8px;text-align:left;cursor:pointer}.tb-recent-row:hover{background:#233750}.tb-recent-index{color:#7790aa;min-width:22px}.tb-recent-label{flex:1}.tb-recent-source{color:#7790aa;font-size:10px}.tb-recent-empty{padding:14px;color:#8396aa}';
    document.head.appendChild(style);
    toggle=document.createElement("button");toggle.id="tbRecentCommandsToggle";toggle.type="button";toggle.textContent="Recent";document.body.appendChild(toggle);
    panel=document.createElement("section");panel.id="tbRecentCommandsPanel";
    panel.innerHTML='<div class="tb-recent-head"><b>Recent Commands</b><span class="grow"></span><button data-recent-clear>Clear</button><button data-recent-close>×</button></div><div class="tb-recent-body" data-recent-body></div>';
    document.body.appendChild(panel);
    toggle.onclick=()=>{panel.classList.toggle("open");renderRecent();};
    panel.querySelector("[data-recent-close]").onclick=()=>panel.classList.remove("open");
    panel.querySelector("[data-recent-clear]").onclick=clearRecent;
    return panel;
  }
  function renderRecent(){
    if(!panel)return;
    const body=panel.querySelector("[data-recent-body]");if(!body)return;
    const recent=state?.recent??[];
    body.innerHTML=recent.length?recent.map((command,index)=>
      '<button class="tb-recent-row" data-recent-index="'+index+'" '+(!canRepeat(command)?"disabled":"")+'>'+
      '<span class="tb-recent-index">'+(index+1)+'.</span><span class="tb-recent-label">'+esc(command.label)+'</span><span class="tb-recent-source">'+esc(command.source)+'</span></button>'
    ).join(""):'<div class="tb-recent-empty">История команд пуста.</div>';
    body.querySelectorAll("[data-recent-index]").forEach(button=>button.onclick=()=>repeatByIndex(button.dataset.recentIndex));
    if(toggle)toggle.title=state?.last?lastLabel()+" · Enter / Space":"Recent Commands";
  }
  function dispatch(){
    try{window.dispatchEvent(new CustomEvent("tubebender-repeat-command-change",{detail:{last:clone(state?.last??null),recent:clone(state?.recent??[])}}));}catch{}
  }
  function registerBuiltins(){
    const editingTool=(tool)=>async(settings)=>{
      const api=window.TubeBenderEditing;
      if(!api?.open){toast("Редактирование ещё не загружено");return false;}
      if(typeof api.openWithSettings==="function")return api.openWithSettings(tool,settings);
      api.open(tool);return true;
    };
    for(const [tool,label] of [
      ["copy","Copy"],["move","Move"],["split","Split"],["rotate","Rotate"],
      ["mirror","Mirror"],["array","Array"],["stack","Transform Stack"]
    ])register({id:"edit."+tool,label,run:editingTool(tool)});
    register({id:"context.hide",label:"Скрыть",run:()=>window.TubeBenderObjectContext?.applyAction?.("hide")});
    register({id:"context.show",label:"Показать",run:()=>window.TubeBenderObjectContext?.applyAction?.("show")});
    register({id:"context.isolate",label:"Скрыть другие",run:()=>window.TubeBenderObjectContext?.applyAction?.("isolate")});
  }
  async function install(){
    if(installed)return;installed=true;
    try{domain=await import(REPEAT_URL);}catch(error){console.error("Repeat Commands failed to load",error);return;}
    loadState();ensurePanel();registerBuiltins();renderRecent();
    window.addEventListener("keydown",onKeyDown,false);
    window.TubeBenderRepeatCommands=Object.freeze({
      record,register,repeatLast:()=>repeat(),repeat,recent:()=>clone(state?.recent??[]),last:()=>clone(state?.last??null),
      hasLast:()=>!!state?.last&&canRepeat(),lastLabel,clearRecent,openRecent:()=>{ensurePanel().classList.add("open");renderRecent();},
      sanitizeSettings:(value)=>domain.sanitizeRepeatSettings(value),
      domain
    });
    dispatch();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();