(()=>{
  const PALETTE_URL="__TB_COMMAND_PALETTE_MODULE_URL__";
  const STORAGE_KEY="tubebender.commandPalette.v1";
  let domain=null,installed=false,state=null,shell=null,input=null,list=null,status=null,aliasPanel=null,open=false,selectedIndex=0,historyIndex=-1,activeStep=null;
  const providers=new Set();
  const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const clone=v=>v==null?v:structuredClone(v);
  const toast=m=>{try{window.TubeBenderEngineering?.toast?.(String(m??""));}catch{}};
  function load(){let raw="";try{raw=localStorage.getItem(STORAGE_KEY)||"";}catch{}state=domain.parsePaletteState(raw);}
  function save(){try{localStorage.setItem(STORAGE_KEY,domain.serializePaletteState(state));}catch{}}
  function recentIds(){
    const repeats=window.TubeBenderRepeatCommands?.recent?.()??[];
    return [...new Set([...(state?.recent_ids??[]),...repeats.map(item=>String(item.id??"").replace(/^edit\./,""))])].filter(Boolean);
  }
  function executeCommand(command){
    if(!command)return false;
    let result=false;
    if(typeof command.run==="function"){
      try{result=command.run();}catch(error){toast(error?.message??error);return false;}
      if(result!==false){
        state=domain.normalizePaletteState({...state,recent_ids:[command.id,...(state.recent_ids??[]).filter(id=>id!==command.id)].slice(0,20)});
        save();return true;
      }
      return false;
    }
    if(command.id==="repeatLast")result=window.TubeBenderRepeatCommands?.repeatLast?.()??false;
    else if(command.id==="recentCommands"){window.TubeBenderRepeatCommands?.openRecent?.();result=true;}
    else if(command.id==="hotkeySettings"){window.TubeBenderHotkeys?.openSettings?.();result=true;}
    else result=window.TubeBenderHotkeys?.execute?.(command.id)??false;
    if(result!==false){
      state=domain.normalizePaletteState({...state,recent_ids:[command.id,...(state.recent_ids??[]).filter(id=>id!==command.id)].slice(0,20)});
      save();setStep({command_id:command.id,prompt:defaultPrompt(command.id)});
      return true;
    }
    return false;
  }
  function defaultPrompt(id){
    return ({
      move:"Задайте смещение / точку",
      copy:"Задайте Base Point и Target Point",
      rotate:"Задайте угол / ось / pivot",
      array:"Задайте параметры массива",
      divide:"Введите позицию разделения",
      length:"Введите длину",
      angle:"Введите угол",
      quickMeasure:"Выберите Snap-точки",
      selectionFilter:"Настройте разрешённые типы выбора"
    })[String(id)]??"";
  }
  function providerResults(query){
    const out=[];
    for(const provider of providers){
      try{
        const values=provider({query:String(query??""),recent_ids:recentIds()})??[];
        for(const value of values){
          if(!value)continue;
          const command=value.command??value;
          if(!command?.id)continue;
          out.push({
            command:{...command,dynamic:true},
            aliases:Array.isArray(value.aliases)?value.aliases:[],
            score:Number.isFinite(Number(value.score))?Number(value.score):100
          });
        }
      }catch(error){console.warn("Command Palette provider:",error);}
    }
    return out;
  }
  function results(){
    const query=input?.value??"";
    return [...domain.searchCommands(query,{alias_map:state.aliases,recent_ids:recentIds()}),...providerResults(query)]
      .sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0))
      .slice(0,10);
  }
  function renderResults(){
    if(!list)return;const found=results();selectedIndex=Math.max(0,Math.min(selectedIndex,Math.max(0,found.length-1)));
    list.innerHTML=found.map((item,index)=>
      '<button type="button" class="tb-command-result '+(index===selectedIndex?"selected":"")+'" data-command-result="'+esc(item.command.id)+'">'+
      '<span class="tb-command-main">'+esc(item.command.name_en)+' <small>'+esc(item.command.name_ru)+'</small></span>'+
      '<span class="tb-command-alias">'+esc((item.aliases??[]).join(" / "))+'</span></button>'
    ).join("");
    list.querySelectorAll("[data-command-result]").forEach(button=>button.onclick=()=>{
      const command=domain.commandById(button.dataset.commandResult);if(command){rememberQuery(input.value);executeCommand(command);closePalette();}
    });
  }
  function renderStatus(message=null){
    if(!status)return;
    const step=activeStep;
    status.innerHTML=message!=null?esc(message):step
      ?'<b>'+esc(step.label??step.command_id??"Command")+'</b> · '+esc(step.prompt??"")+(step.last_input!=null?' · input: <b>'+esc(step.last_input)+'</b>':"")
      :'Введите команду или алиас · ↑/↓ история · Enter запуск · Esc закрыть';
  }
  function rememberQuery(text){
    state=domain.normalizePaletteState({...state,history:domain.pushCommandHistory(state.history,text)});
    save();historyIndex=-1;
  }
  function submit(){
    const raw=String(input?.value??"").trim();
    if(!raw)return false;
    const numeric=Number(raw.replace(",","."));
    if(activeStep&&Number.isFinite(numeric)){
      activeStep={...activeStep,last_input:raw,numeric_value:numeric};
      rememberQuery(raw);renderStatus();
      try{window.dispatchEvent(new CustomEvent("tubebender-command-line-input",{detail:clone(activeStep)}));}catch{}
      input.value="";renderResults();return true;
    }
    const resolved=domain.resolveCommand(raw,{alias_map:state.aliases});
    if(resolved){rememberQuery(raw);const ok=executeCommand(resolved);input.value="";renderResults();if(ok)closePalette({keepStatus:true});return ok;}
    const found=results();if(found.length){rememberQuery(raw);const ok=executeCommand(found[selectedIndex]?.command??found[0].command);input.value="";renderResults();if(ok)closePalette({keepStatus:true});return ok;}
    renderStatus("Команда не найдена: "+raw);return false;
  }
  function historyMove(direction){
    const h=state.history??[];if(!h.length)return;
    historyIndex=Math.max(-1,Math.min(h.length-1,historyIndex+(direction>0?1:-1)));
    input.value=historyIndex<0?"":h[historyIndex];selectedIndex=0;renderResults();
    input.setSelectionRange?.(input.value.length,input.value.length);
  }
  function onInputKey(event){
    if(event.key==="ArrowDown"){
      event.preventDefault();
      if(historyIndex>=0||!input.value.trim()){historyMove(-1);}
      else{const found=results();selectedIndex=Math.min(found.length-1,selectedIndex+1);renderResults();}
      return;
    }
    if(event.key==="ArrowUp"){
      event.preventDefault();
      if(historyIndex>=0||!input.value.trim())historyMove(1);
      else if(results().length){selectedIndex=Math.max(0,selectedIndex-1);renderResults();}
      return;
    }
    if(event.key==="PageUp"){event.preventDefault();historyMove(1);return;}
    if(event.key==="PageDown"){event.preventDefault();historyMove(-1);return;}
    if(event.key==="Enter"){event.preventDefault();submit();return;}
    if(event.key==="Escape"){event.preventDefault();closePalette();}
  }
  function ensureShell(){
    if(shell)return shell;
    const style=document.createElement("style");style.id="tbCommandPaletteStyles";style.textContent=
      '#tbCommandLine{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:120620;width:min(720px,calc(100vw - 28px));display:none;background:rgba(9,17,27,.985);border:1px solid #52677f;border-radius:8px;box-shadow:0 16px 48px rgba(0,0,0,.55);font:12px system-ui;color:#edf5ff}#tbCommandLine.open{display:block}.tb-command-input-row{display:flex;align-items:center;gap:7px;padding:7px}.tb-command-prefix{color:#66d5ff;font-weight:700}.tb-command-input-row input{flex:1;background:#07111a;color:#fff;border:1px solid #40536a;border-radius:5px;padding:7px;font:13px ui-monospace,Consolas,monospace}.tb-command-input-row button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:6px 8px;cursor:pointer}.tb-command-results{max-height:270px;overflow:auto;border-top:1px solid #27394c}.tb-command-result{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;color:#edf5ff;text-align:left;padding:7px 10px;cursor:pointer}.tb-command-result.selected,.tb-command-result:hover{background:#233750}.tb-command-main{flex:1}.tb-command-main small{color:#8fa5ba;margin-left:8px}.tb-command-alias{color:#ffd76a;font:10px ui-monospace,Consolas,monospace}.tb-command-status{padding:5px 9px;border-top:1px solid #27394c;color:#8fa5ba}.tb-command-status b{color:#dcecff}#tbCommandAliasPanel{position:fixed;right:14px;top:88px;z-index:120621;width:min(500px,calc(100vw - 28px));max-height:calc(100vh - 110px);display:none;flex-direction:column;background:#0d1620;color:#edf5ff;border:1px solid #41566f;border-radius:8px;box-shadow:0 16px 40px rgba(0,0,0,.5);font:12px system-ui}#tbCommandAliasPanel.open{display:flex}.tb-alias-head{display:flex;align-items:center;gap:6px;padding:8px;border-bottom:1px solid #304154}.tb-alias-head .grow{flex:1}.tb-alias-body{overflow:auto;padding:8px}.tb-alias-row{display:grid;grid-template-columns:170px 1fr;gap:8px;align-items:center;padding:4px}.tb-alias-row input{background:#08131d;color:#fff;border:1px solid #40536a;border-radius:4px;padding:5px}.tb-alias-error{color:#ffb4b4;padding:0 10px 8px}';
    document.head.appendChild(style);
    shell=document.createElement("section");shell.id="tbCommandLine";
    shell.innerHTML='<div class="tb-command-input-row"><span class="tb-command-prefix">Command:</span><input data-command-input autocomplete="off" spellcheck="false" placeholder="MOVE / Переместить / M"><button data-command-aliases>Aliases</button><button data-command-close>×</button></div><div class="tb-command-results" data-command-results></div><div class="tb-command-status" data-command-status></div>';
    document.body.appendChild(shell);
    input=shell.querySelector("[data-command-input]");list=shell.querySelector("[data-command-results]");status=shell.querySelector("[data-command-status]");
    input.addEventListener("input",()=>{selectedIndex=0;renderResults();});
    input.addEventListener("keydown",onInputKey);
    shell.querySelector("[data-command-close]").onclick=()=>closePalette();
    shell.querySelector("[data-command-aliases]").onclick=openAliases;
    aliasPanel=document.createElement("section");aliasPanel.id="tbCommandAliasPanel";aliasPanel.innerHTML='<div class="tb-alias-head"><b>Command aliases</b><span class="grow"></span><button data-alias-save>Save</button><button data-alias-close>×</button></div><div class="tb-alias-body" data-alias-body></div><div class="tb-alias-error" data-alias-error></div>';document.body.appendChild(aliasPanel);
    aliasPanel.querySelector("[data-alias-close]").onclick=()=>aliasPanel.classList.remove("open");
    aliasPanel.querySelector("[data-alias-save]").onclick=saveAliases;
    return shell;
  }
  function renderAliases(){
    const body=aliasPanel.querySelector("[data-alias-body]");
    body.innerHTML=domain.COMMAND_DEFINITIONS.map(command=>'<label class="tb-alias-row"><span>'+esc(command.name_en)+' · '+esc(command.name_ru)+'</span><input data-alias-id="'+esc(command.id)+'" value="'+esc((state.aliases?.[command.id]??[]).join(", "))+'"></label>').join("");
    aliasPanel.querySelector("[data-alias-error]").textContent="";
  }
  function openAliases(){ensureShell();aliasPanel.classList.add("open");renderAliases();}
  function saveAliases(){
    try{
      const next={...state.aliases};
      for(const inputEl of aliasPanel.querySelectorAll("[data-alias-id]")){
        next[inputEl.dataset.aliasId]=inputEl.value.split(",").map(v=>v.trim()).filter(Boolean);
      }
      state=domain.normalizePaletteState({...state,aliases:domain.normalizeAliasMap(next)});save();renderAliases();renderResults();toast("Command aliases сохранены");return true;
    }catch(error){aliasPanel.querySelector("[data-alias-error]").textContent=String(error?.message??error);return false;}
  }
  function openPalette({query=""}={}){
    ensureShell();open=true;shell.classList.add("open");input.value=String(query);selectedIndex=0;renderResults();renderStatus();setTimeout(()=>input.focus(),0);return true;
  }
  function closePalette({keepStatus=false}={}){
    open=false;shell?.classList.remove("open");if(!keepStatus&&activeStep==null)renderStatus();return true;
  }
  function setStep(step=null){
    activeStep=step?{command_id:String(step.command_id??""),label:String(step.label??domain.commandById(step.command_id)?.name_en??step.command_id??""),prompt:String(step.prompt??""),last_input:step.last_input??null}:null;
    ensureShell();renderStatus();return clone(activeStep);
  }
  function clearStep(){activeStep=null;renderStatus();return true;}
  function onGlobalKey(event){
    if(event.defaultPrevented||event.repeat)return;
    const target=event.target,isText=target&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/i.test(String(target.tagName||"")));
    if(isText||open)return;
    if(event.key===":"||event.key==="/"){event.preventDefault();openPalette();}
  }
  async function install(){
    if(installed)return;installed=true;
    try{domain=await import(PALETTE_URL);}catch(error){console.error("Command Palette failed",error);return;}
    load();ensureShell();renderResults();renderStatus();
    window.addEventListener("keydown",onGlobalKey,false);
    window.addEventListener("tubebender-hotkey-change",()=>renderResults());
    window.addEventListener("tubebender-repeat-command-change",()=>renderResults());
    window.TubeBenderCommandLine=Object.freeze({
      open:openPalette,close:closePalette,execute:(id)=>executeCommand(domain.commandById(id)),search:(query)=>[
        ...domain.searchCommands(query,{alias_map:state.aliases,recent_ids:recentIds()}),...providerResults(query)
      ].sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)),
      registerProvider:(provider)=>{if(typeof provider!=="function")throw new TypeError("Command provider must be a function");providers.add(provider);return ()=>providers.delete(provider);},
      setStep,clearStep,currentStep:()=>clone(activeStep),aliases:()=>clone(state.aliases),history:()=>clone(state.history),openAliases,
      domain
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();