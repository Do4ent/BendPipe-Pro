(() => {
  function currentImportButton(){
    return document.getElementById("poImportCurrentBtn");
  }

  function ensureCurrentImportButton(){
    let button=currentImportButton();
    if(button)return button;

    const open=document.getElementById("poOpenBtn");
    const host=open?.parentElement;
    if(!open||!host)return null;

    button=document.createElement("button");
    button.className="po-secondary";
    button.id="poImportCurrentBtn";
    button.type="button";
    button.hidden=true;
    button.disabled=true;
    button.textContent="Импортировать геометрию в текущий проект";
    button.title="Добавить выбранные распознанные DWFx-трубы в активный текущий проект";
    button.addEventListener("click",importSelectedDwfxTubesIntoCurrentProject);
    host.insertBefore(button,open);
    return button;
  }

  function selectedTubeCount(){
    try{
      return Number(poSelectionCount()?.tubes)||0;
    }catch{
      return 0;
    }
  }

  function updateCurrentImportButton(){
    const button=ensureCurrentImportButton();
    if(!button)return;

    let pkg=null;
    let readOnly=false;
    try{pkg=PO.current;}catch{}
    try{readOnly=poReadOnly();}catch{}

    const count=selectedTubeCount();
    const ready=
      pkg?.rawDwfxImport?.status==="dwfx_project_candidate" &&
      Array.isArray(pkg?.projects) &&
      pkg.projects.length>0;

    const nextHidden=!ready;
    const nextDisabled=!ready||count<1||readOnly;
    const nextText=ready
      ? "Импортировать в текущий проект ("+count+")"
      : "Импортировать геометрию в текущий проект";
    if(button.hidden!==nextHidden)button.hidden=nextHidden;
    if(button.disabled!==nextDisabled)button.disabled=nextDisabled;
    if(button.textContent!==nextText)button.textContent=nextText;
  }

  async function importSelectedDwfxTubesIntoCurrentProject(){
    let pkg=null;
    try{pkg=PO.current;}catch{}

    if(!pkg?.rawDwfxImport||pkg.rawDwfxImport.status!=="dwfx_project_candidate"){
      ptToast("Сначала распознайте DWFx-файл");
      return false;
    }
    if(poReadOnly()){
      ptToast("Текущий проект открыт только для просмотра");
      return false;
    }

    const chosen=poSelectedMaterialized();
    if(!chosen.length){
      ptToast("Не выбраны распознанные трубы");
      return false;
    }

    const bridge=window.TubeBenderDwfxImport;
    if(!bridge||typeof bridge.mergeDwfxTubesIntoCurrentProject!=="function"){
      ptToast("Модуль импорта в текущий проект недоступен");
      return false;
    }

    poSetBusy(true,"Создание резервной копии перед импортом DWFx…");
    await poStoreRecovery("backup","Перед импортом распознанной DWFx-геометрии");

    let historyToken=null;
    PO.suppressDirty=true;
    try{
      syncActiveTubeFromState();
      const current=activeProject();
      if(!current)throw new Error("Активный проект не найден");

      const merged=await bridge.mergeDwfxTubesIntoCurrentProject({
        project:current,
        imported_projects:chosen,
        conflict:document.getElementById("poConflict")?.value||"copy",
        make_id:uid,
        source_file:pkg.rawDwfxImport.source_file||pkg.meta?.name||""
      });

      if(merged.status!=="merged"||merged.imported_count<1){
        ptToast("Новые трубы не добавлены");
        return false;
      }

      historyToken=tbHistoryBegin("Импортировать DWFx геометрию");
      if(!historyToken){
        throw new Error("Завершите текущее редактирование перед импортом");
      }

      const projectIndex=(state.projects||[]).findIndex(
        (project)=>String(project?.id)===String(current.id)
      );
      if(projectIndex<0){
        throw new Error("Активный проект исчез во время импорта");
      }

      state.projects[projectIndex]=merged.project;
      state.activeProjectId=merged.project.id;
      state.activeTubeId=
        merged.imported_tube_ids.at(-1)||
        merged.project.tubes.at(-1)?.id||
        state.activeTubeId;
      state.workspaceDirty=true;

      syncProjectToLegacy();
      loadActiveTubeToState();
      projectCollisionCache.clear();
      save();

      tbHistoryCommit(historyToken);
      historyToken=null;

      renderPipeSelect();
      renderPipeTable();
      renderAll();
      poApplyReadOnlyUi();
      await poRememberOpened(pkg,pkg.rawText||JSON.stringify(pkg.rawData));

      const dialog=document.getElementById("projectOpenDialog");
      if(dialog?.open)dialog.close();

      const skipped=merged.skipped_count
        ?" · пропущено "+merged.skipped_count
        :"";
      ptToast("Импортировано труб: "+merged.imported_count+skipped);
      return true;
    }catch(error){
      if(historyToken){
        const before=historyToken.before;
        tbHistoryCancel(historyToken);
        tbHistoryRestore(before);
      }
      console.error(error);
      ptToast("Не удалось импортировать DWFx-геометрию: "+error.message);
      return false;
    }finally{
      PO.suppressDirty=false;
      poSetBusy(false,"Готово");
      updateCurrentImportButton();
    }
  }

  function install(){
    const button=ensureCurrentImportButton();
    const dialog=document.getElementById("projectOpenDialog");
    if(!button||!dialog)return;

    dialog.addEventListener("change",()=>queueMicrotask(updateCurrentImportButton),true);
    dialog.addEventListener("click",()=>queueMicrotask(updateCurrentImportButton),true);

    let updateQueued=false;
    const scheduleUpdate=()=>{
      if(updateQueued)return;
      updateQueued=true;
      queueMicrotask(()=>{
        updateQueued=false;
        updateCurrentImportButton();
      });
    };
    const observer=new MutationObserver((records)=>{
      if(records.every((record)=>record.target===button||button.contains(record.target)))return;
      scheduleUpdate();
    });
    observer.observe(dialog,{subtree:true,childList:true});

    updateCurrentImportButton();
  }

  if(document.readyState==="loading"){
    window.addEventListener("DOMContentLoaded",install,{once:true});
  }else{
    install();
  }

  window.TubeBenderDwfxCurrentProjectUi=Object.freeze({
    update:updateCurrentImportButton,
    importSelected:importSelectedDwfxTubesIntoCurrentProject
  });
})();
