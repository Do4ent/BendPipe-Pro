(()=>{
  const selected=new Set();
  let contextMenu=null;
  let movePanel=null;
  let issuesPanel=null;
  let installed=false;
  let ownRaycaster=null;
  const PREFIX={
    ref:"ref:",
    tube:"tube:",
    row:"row:",
    end:"end:",
    assembly:"assembly:"
  };

  function enc(value){return encodeURIComponent(String(value??""));}
  function dec(value){try{return decodeURIComponent(String(value??""));}catch{return String(value??"");}}
  function refKey(sceneId,nodeId){return PREFIX.ref+enc(sceneId)+":"+enc(nodeId);}
  function tubeKey(tubeId){return PREFIX.tube+enc(tubeId);}
  function endKey(tubeId){return PREFIX.end+enc(tubeId);}
  function rowKey(tubeId,rowIndex){return PREFIX.row+enc(tubeId)+":"+String(Number(rowIndex));}
  function assemblyKey(tubeId,assemblyId){return PREFIX.assembly+enc(tubeId)+":"+enc(assemblyId);}

  function parseKey(key){
    const text=String(key??"");
    if(text.startsWith(PREFIX.ref)){
      const body=text.slice(PREFIX.ref.length);
      const split=body.indexOf(":");
      if(split<0)return null;
      return {kind:"ref",sceneId:dec(body.slice(0,split)),nodeId:dec(body.slice(split+1))};
    }
    if(text.startsWith(PREFIX.tube)){
      return {kind:"tube",tubeId:dec(text.slice(PREFIX.tube.length))};
    }
    if(text.startsWith(PREFIX.row)){
      const body=text.slice(PREFIX.row.length);
      const split=body.indexOf(":");
      if(split<0)return null;
      return {kind:"row",tubeId:dec(body.slice(0,split)),rowIndex:Number(body.slice(split+1))};
    }
    if(text.startsWith(PREFIX.end)){
      return {kind:"end",tubeId:dec(text.slice(PREFIX.end.length))};
    }
    if(text.startsWith(PREFIX.assembly)){
      const body=text.slice(PREFIX.assembly.length);
      const split=body.indexOf(":");
      if(split<0)return null;
      return {kind:"assembly",tubeId:dec(body.slice(0,split)),assemblyId:dec(body.slice(split+1))};
    }
    return null;
  }

  function project(){
    try{return typeof activeProject==="function"?activeProject():null;}
    catch{return null;}
  }
  function refApi(){return window.TubeBenderReferenceSceneUi??null;}
  function tubeById(id){
    return (project()?.tubes??[]).find((tube)=>String(tube?.id)===String(id))??null;
  }
  function activeTubeId(){
    try{return String(state?.activeTubeId??"");}catch{return "";}
  }

  function isRecognizedTube(tube){
    return !!tube?.importEvidence;
  }
  function rowFor(entry){
    const tube=tubeById(entry?.tubeId);
    if(!tube)return null;
    if(String(tube.id)===activeTubeId()){
      return state?.rows?.[entry.rowIndex]??null;
    }
    return tube.rows?.[entry.rowIndex]??null;
  }

  function rawReferenceKey(entry){
    return String(entry.sceneId)+"|"+String(entry.nodeId);
  }
  function syncReferenceIntoSelection(){
    const p=project();
    const api=refApi();
    if(!p||typeof api?.selectedKeys!=="function")return;
    for(const key of [...selected])if(key.startsWith(PREFIX.ref))selected.delete(key);
    for(const raw of api.selectedKeys(p)??[]){
      const split=String(raw).indexOf("|");
      if(split<0)continue;
      selected.add(refKey(String(raw).slice(0,split),String(raw).slice(split+1)));
    }
  }
  function syncSelectionIntoReference(){
    const p=project();
    const api=refApi();
    if(!p||typeof api?.replaceSelection!=="function")return;
    const keys=[];
    for(const key of selected){
      const entry=parseKey(key);
      if(entry?.kind==="ref")keys.push(rawReferenceKey(entry));
    }
    api.replaceSelection(p,keys);
  }

  function clearSelection({keepReference=false}={}){
    selected.clear();
    if(!keepReference)refApi()?.clearSelection?.();
    refreshVisualSelection();
  }

  function setSelectedKey(key,{additive=false,toggle=false}={}){
    if(!key)return;
    if(!additive){
      selected.clear();
      refApi()?.clearSelection?.();
    }
    if(toggle&&selected.has(key))selected.delete(key);
    else selected.add(key);
    syncSelectionIntoReference();
    refreshVisualSelection();
  }

  function ensureSelectedKey(key){
    syncReferenceIntoSelection();
    if(selected.has(key))return;
    setSelectedKey(key,{additive:false});
  }

  function selectionEntries(){
    syncReferenceIntoSelection();
    return [...selected].map(parseKey).filter(Boolean);
  }

  function keyForTreeRow(row){
    if(!row)return null;
    if(row.matches?.("[data-ref-node]")){
      return refKey(row.dataset.refScene,row.dataset.refNode);
    }
    if(row.matches?.("[data-tree-tube]")){
      return tubeKey(row.dataset.treeTube);
    }
    if(row.matches?.("[data-tree-row]")){
      return rowKey(activeTubeId(),Number(row.dataset.treeRow));
    }
    if(row.matches?.("[data-tree-end]")){
      return endKey(activeTubeId());
    }
    if(row.matches?.("[data-tree-assembly]")){
      return assemblyKey(activeTubeId(),row.dataset.treeAssembly);
    }
    if(row.matches?.("[data-tree-assembly-part]")){
      const rowIndex=Number(row.dataset.treeRowRef);
      return Number.isInteger(rowIndex)&&rowIndex>=0
        ? rowKey(activeTubeId(),rowIndex)
        : assemblyKey(activeTubeId(),row.dataset.treeAssemblyPart);
    }
    if(row.matches?.("[data-tree-origin]")){
      return tubeKey(activeTubeId());
    }
    return null;
  }

  function treeRowFromTarget(target){
    return target?.closest?.(
      "[data-ref-node],[data-tree-tube],[data-tree-row],[data-tree-end],[data-tree-assembly],[data-tree-assembly-part],[data-tree-origin]"
    )??null;
  }

  function projectTreeForEvent(event){
    const target=event?.target;
    const tree=document.getElementById("tbProjectTree");
    if(!tree||!target)return null;
    return tree===target||tree.contains(target)?tree:null;
  }

  function skip3DHit(object){
    let item=object;
    while(item){
      const data=item.userData??{};
      if(data.referenceNodeId&&data.referenceSceneId)return false;
      if(
        data.bboxCorner||
        data.dimension||
        data.dofHandle||
        data.dofAxis||
        data.dofRotation||
        data.straightDirectionChoice||
        data.bendDirection||
        data.referenceSelectionHelper||
        data.objectSelectionHelper
      )return true;
      item=item.parent;
    }
    return false;
  }

  function entryFrom3DObject(object){
    let item=object;
    let rowIndex=null;
    let passiveTubeId=null;
    let origin=false;
    while(item){
      const data=item.userData??{};
      if(data.referenceNodeId&&data.referenceSceneId){
        return {
          key:refKey(data.referenceSceneId,data.referenceNodeId),
          entry:{kind:"ref",sceneId:String(data.referenceSceneId),nodeId:String(data.referenceNodeId)}
        };
      }
      if(data.tubeEnd&&activeTubeId()){
        return {key:endKey(activeTubeId()),entry:{kind:"end",tubeId:activeTubeId()}};
      }
      if(data.tubeId)passiveTubeId=String(data.tubeId);
      if(data.originPoint)origin=true;
      if(rowIndex==null&&Number.isInteger(Number(data.rowIndex))){
        rowIndex=Number(data.rowIndex);
      }
      item=item.parent;
    }
    if(passiveTubeId){
      return {key:tubeKey(passiveTubeId),entry:{kind:"tube",tubeId:passiveTubeId}};
    }
    const id=activeTubeId();
    if(origin&&id){
      return {key:tubeKey(id),entry:{kind:"tube",tubeId:id}};
    }
    if(rowIndex!=null&&rowIndex>=0&&id){
      return {key:rowKey(id,rowIndex),entry:{kind:"row",tubeId:id,rowIndex}};
    }
    return null;
  }

  function pick3D(event){
    if(typeof THREE==="undefined"||typeof camera==="undefined"||typeof pipeGroup==="undefined")return null;
    if(!camera||!pipeGroup)return null;
    const canvas=document.getElementById("threeCanvas");
    if(!canvas)return null;
    const rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height)return null;
    ownRaycaster=ownRaycaster||new THREE.Raycaster();
    ownRaycaster.params.Line={threshold:.18};
    const mouse=new THREE.Vector2(
      ((event.clientX-rect.left)/rect.width)*2-1,
      -((event.clientY-rect.top)/rect.height)*2+1
    );
    ownRaycaster.setFromCamera(mouse,camera);
    const hits=ownRaycaster.intersectObjects(pipeGroup.children,true);
    for(const hit of hits){
      if(skip3DHit(hit.object))continue;
      const result=entryFrom3DObject(hit.object);
      if(result)return result;
    }
    return null;
  }

  function applyMaterialOpacity(object,opacity){
    if(!object?.material)return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    for(const material of materials){
      if(!material)continue;
      material.transparent=opacity<.999;
      material.opacity=opacity;
      material.depthWrite=opacity>=.999;
      material.needsUpdate=true;
    }
  }

  function ancestorData(object,predicate){
    let item=object;
    while(item){
      if(predicate(item.userData??{},item))return item;
      item=item.parent;
    }
    return null;
  }

  function decorateRenderedObjects(){
    if(typeof pipeGroup==="undefined"||!pipeGroup)return;
    const p=project();
    const currentId=activeTubeId();

    // Persist per-row and per-tube display state after every full 3D rebuild.
    pipeGroup.traverse((object)=>{
      if(object.userData?.referenceGeometry||object.userData?.referenceSelectionHelper)return;
      const passive=ancestorData(object,(data)=>!!data.tubeId);
      if(passive){
        const tube=tubeById(passive.userData.tubeId);
        if(tube?.uiHiddenIn3D===true)passive.visible=false;
        if(isRecognizedTube(tube)){
          tube.uiTransparentIn3D=false;
          if(!object.userData?.helper)applyMaterialOpacity(object,1);
        }else if(tube?.uiTransparentIn3D===true&&!object.userData?.helper){
          applyMaterialOpacity(object,.24);
        }
        return;
      }

      const rowHolder=ancestorData(object,(data)=>Number.isInteger(Number(data.rowIndex))&&data.pipe===true);
      if(rowHolder&&currentId){
        const index=Number(rowHolder.userData.rowIndex);
        const row=state?.rows?.[index];
        const tube=tubeById(currentId);
        if(row?.uiHiddenIn3D===true||tube?.uiHiddenIn3D===true){
          rowHolder.visible=false;
        }
        if(isRecognizedTube(tube)){
          tube.uiTransparentIn3D=false;
          if(row)row.uiTransparentIn3D=false;
          if(!object.userData?.helper)applyMaterialOpacity(object,1);
        }else if((row?.uiTransparentIn3D===true||tube?.uiTransparentIn3D===true)&&!object.userData?.helper){
          applyMaterialOpacity(object,.24);
        }
      }
    });

    if(Array.isArray(labels)){
      for(const item of labels){
        const index=Number(item?.rowIndex);
        const row=Number.isInteger(index)?state?.rows?.[index]:null;
        if(item?.el)item.el.style.display=row?.uiHiddenIn3D===true?"none":"";
      }
    }

    addSelectionHelpers();
  }

  function boxForObjects(objects){
    if(typeof THREE==="undefined")return null;
    const box=new THREE.Box3();
    let has=false;
    for(const object of objects){
      if(!object||object.visible===false)continue;
      const current=new THREE.Box3().setFromObject(object);
      if(current.isEmpty())continue;
      if(!has){box.copy(current);has=true;}else box.union(current);
    }
    return has?box:null;
  }

  function addSelectionHelpers(){
    if(typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup)return;
    syncReferenceIntoSelection();
    const entries=selectionEntries().filter((entry)=>entry.kind!=="ref");
    for(const entry of entries){
      let objects=[];
      if(entry.kind==="tube"){
        if(entry.tubeId===activeTubeId()){
          pipeGroup.traverse((object)=>{
            if(object.userData?.referenceGeometry||object.userData?.helper)return;
            if(object.userData?.pipe===true&&Number.isInteger(Number(object.userData.rowIndex))){
              objects.push(object);
            }
          });
        }else{
          pipeGroup.traverse((object)=>{
            if(String(object.userData?.tubeId??"")===String(entry.tubeId))objects.push(object);
          });
        }
      }else if(entry.kind==="row"){
        if(entry.tubeId!==activeTubeId())continue;
        pipeGroup.traverse((object)=>{
          if(
            object.userData?.pipe===true&&
            Number(object.userData.rowIndex)===Number(entry.rowIndex)&&
            !object.userData?.helper
          )objects.push(object);
        });
      }else if(entry.kind==="assembly"){
        if(entry.tubeId!==activeTubeId())continue;
        const indices=[];
        (state?.rows??[]).forEach((row,index)=>{
          if(String(row?.assemblyId??"")===String(entry.assemblyId))indices.push(index);
        });
        pipeGroup.traverse((object)=>{
          if(
            object.userData?.pipe===true&&
            indices.includes(Number(object.userData.rowIndex))&&
            !object.userData?.helper
          )objects.push(object);
        });
      }
      const box=boxForObjects(objects);
      if(!box)continue;
      const helper=new THREE.Box3Helper(box,0xffd54a);
      helper.userData.helper=true;
      helper.userData.objectSelectionHelper=true;
      pipeGroup.add(helper);
    }
  }

  function treeRowForKey(key){
    const host=document.getElementById("tbProjectTree");
    if(!host||!key)return null;
    for(const row of host.querySelectorAll(
      "[data-ref-node],[data-tree-tube],[data-tree-row],[data-tree-end],[data-tree-assembly],[data-tree-assembly-part],[data-tree-origin]"
    )){
      if(keyForTreeRow(row)===key)return row;
    }
    return null;
  }

  function scrollTreeSelectionIntoView(key){
    const attempt=(remaining)=>{
      const row=treeRowForKey(key);
      if(row){
        row.scrollIntoView?.({block:"nearest",inline:"nearest",behavior:"auto"});
        return;
      }
      if(remaining>0)requestAnimationFrame(()=>attempt(remaining-1));
    };
    requestAnimationFrame(()=>attempt(3));
  }

  function revealTreeKey(key){
    const entry=parseKey(key);
    const p=project();
    if(!entry||!p)return false;

    if(entry.kind==="ref"){
      const changed=refApi()?.revealNode?.(p,entry.sceneId,entry.nodeId)===true;
      if(changed){
        try{if(typeof refreshProjectTree==="function")refreshProjectTree();}catch{}
      }
    }else{
      try{if(typeof refreshProjectTree==="function")refreshProjectTree();}catch{}
    }

    requestAnimationFrame(()=>{
      updateTreeSelectionStyles();
      scrollTreeSelectionIntoView(key);
    });
    return true;
  }

  function adoptReferenceSelection({source="tree",replaceNonReference=false}={}){
    if(replaceNonReference){
      for(const key of [...selected]){
        if(!key.startsWith(PREFIX.ref))selected.delete(key);
      }
    }
    syncReferenceIntoSelection();
    updateTreeSelectionStyles();
    try{
      if(typeof update3D==="function")update3D();
      if(typeof markViewerDirty==="function")markViewerDirty();
    }catch{}
    return selected.size;
  }

  function refreshVisualSelection(){
    updateTreeSelectionStyles();
    try{
      if(typeof update3D==="function")update3D();
      if(typeof markViewerDirty==="function")markViewerDirty();
    }catch{}
  }

  function updateTreeSelectionStyles(){
    const host=document.getElementById("tbProjectTree");
    if(!host)return;
    syncReferenceIntoSelection();
    host.querySelectorAll(".tb-object-selected").forEach((node)=>{
      node.classList.remove("tb-object-selected");
      node.removeAttribute("aria-selected");
    });
    for(const row of host.querySelectorAll(
      "[data-ref-node],[data-tree-tube],[data-tree-row],[data-tree-assembly],[data-tree-assembly-part],[data-tree-origin]"
    )){
      const key=keyForTreeRow(row);
      if(key&&selected.has(key)){
        row.classList.add("tb-object-selected");
        row.setAttribute("aria-selected","true");
      }
    }
  }

  function canMoveSelection(){
    const entries=selectionEntries();
    return entries.length>0&&entries.every((entry)=>entry.kind==="ref"||entry.kind==="tube");
  }

  function invalidElementDiagnosis(entries=selectionEntries()){
    if(!Array.isArray(entries)||entries.length!==1)return null;
    const entry=entries[0];
    if(entry?.kind!=="row")return null;
    const tube=tubeById(entry.tubeId);
    if(!tube)return null;
    let issues=[];
    try{
      if(typeof tubeRowValidationIssues==="function"){
        issues=tubeRowValidationIssues(tube,entry.rowIndex)??[];
      }
    }catch{}
    issues=[...new Set(
      (Array.isArray(issues)?issues:[])
        .map((value)=>String(value??"").trim())
        .filter(Boolean)
    )];
    if(!issues.length)return null;
    const row=rowFor(entry);
    const type=row?.type==="BEND"?"Гиб":
      row?.type==="LINE"?"Прямой участок":
      "Элемент";
    return {
      entry,
      tube,
      row,
      issues,
      title:type+" "+(Number(entry.rowIndex)+1)
    };
  }

  function ensureIssuesPanel(){
    if(issuesPanel)return issuesPanel;
    const panel=document.createElement("div");
    panel.id="tbObjectIssuesPanel";
    panel.className="tb-object-issues-panel";
    panel.innerHTML=
      '<div class="tb-object-issues-head">'+
      '<div><b data-issues-title>Что не правильно?</b><div data-issues-subtitle></div></div>'+
      '<button type="button" data-issues-close aria-label="Закрыть">×</button>'+
      '</div>'+
      '<div class="tb-object-issues-list" data-issues-list></div>';
    document.body.appendChild(panel);
    panel.querySelector("[data-issues-close]")?.addEventListener("click",()=>panel.style.display="none");
    issuesPanel=panel;
    return panel;
  }

  function openInvalidElementDiagnosis(){
    const diagnosis=invalidElementDiagnosis();
    if(!diagnosis)return false;
    const panel=ensureIssuesPanel();
    const subtitle=panel.querySelector("[data-issues-subtitle]");
    if(subtitle){
      subtitle.textContent=diagnosis.title+
        (diagnosis.tube?.name?" · "+String(diagnosis.tube.name):"");
    }
    const list=panel.querySelector("[data-issues-list]");
    if(list){
      list.innerHTML="";
      diagnosis.issues.forEach((issue)=>{
        const row=document.createElement("div");
        row.className="tb-object-issue-row";
        const marker=document.createElement("span");
        marker.className="tb-object-issue-marker";
        marker.textContent="!";
        const text=document.createElement("span");
        text.textContent=issue;
        row.append(marker,text);
        list.appendChild(row);
      });
    }
    panel.style.display="block";
    panel.style.left=Math.max(12,(window.innerWidth-panel.offsetWidth)/2)+"px";
    panel.style.top=Math.max(12,(window.innerHeight-panel.offsetHeight)/2)+"px";
    return true;
  }

  function ensureContextMenu(){
    if(contextMenu)return contextMenu;
    const menu=document.createElement("div");
    menu.id="tbObjectContextMenu";
    menu.className="tb-object-context-menu";
    menu.innerHTML=
      '<div class="tb-object-context-title" data-context-title>Выбрано: 1</div>'+
      '<button type="button" data-object-action="move">↔ <span>Переместить…</span></button>'+
      '<button type="button" data-object-action="hide">◌ <span>Скрыть</span></button>'+
      '<button type="button" data-object-action="isolate">◎ <span>Скрыть другие</span></button>'+
      '<button type="button" data-object-action="show">◉ <span>Показать</span></button>'+
      '<button type="button" data-object-action="show-all">◉ <span>Показать все</span></button>'+
      '<button type="button" data-object-action="transparent">◫ <span>Прозрачность</span></button>'+
      '<button type="button" class="diagnose" data-object-action="diagnose">? <span>Что не правильно?</span></button>'+
      '<div class="tb-object-context-separator"></div>'+
      '<button type="button" class="danger" data-object-action="delete">🗑 <span>Удалить</span></button>';
    document.body.appendChild(menu);
    menu.addEventListener("click",(event)=>{
      const button=event.target.closest("[data-object-action]");
      if(!button||button.disabled)return;
      const action=button.dataset.objectAction;
      hideContextMenu();
      if(action==="move")openMovePanel();
      else if(action==="diagnose")openInvalidElementDiagnosis();
      else applyAction(action);
    });
    contextMenu=menu;
    return menu;
  }

  function showContextMenu(event,{source="3d",allowEmpty=false,selectionAvailable=true}={}){
    const entries=selectionAvailable?selectionEntries():[];
    if(!entries.length&&!allowEmpty)return;
    const menu=ensureContextMenu();
    const hasSelection=entries.length>0;
    const title=menu.querySelector("[data-context-title]");
    if(title)title.textContent=hasSelection
      ?"Выбрано: "+entries.length
      :(source==="3d"?"3D-окно":"Дерево проекта");
    for(const button of menu.querySelectorAll("[data-object-action]")){
      const action=button.dataset.objectAction;
      if(action!=="show-all")button.hidden=!hasSelection;
    }
    const diagnosis=hasSelection?invalidElementDiagnosis(entries):null;
    const diagnose=menu.querySelector('[data-object-action="diagnose"]');
    if(diagnose){
      diagnose.hidden=!diagnosis;
      diagnose.disabled=!diagnosis;
      diagnose.title=diagnosis
        ?diagnosis.issues.join("\n")
        :"Доступно только для некорректного элемента трубы";
    }
    const move=menu.querySelector('[data-object-action="move"]');
    if(move){
      const allowed=hasSelection&&source==="3d"&&canMoveSelection();
      move.hidden=!hasSelection||source!=="3d";
      move.disabled=!allowed;
      move.title=allowed
        ?"Переместить выбранные объекты на ΔX / ΔY / ΔZ"
        :"Перемещение доступно для целых труб и импортированных компонентов";
    }
    menu.style.display="block";
    const margin=8;
    const rect=menu.getBoundingClientRect();
    const x=Math.min(event.clientX,window.innerWidth-rect.width-margin);
    const y=Math.min(event.clientY,window.innerHeight-rect.height-margin);
    menu.style.left=Math.max(margin,x)+"px";
    menu.style.top=Math.max(margin,y)+"px";
  }

  function hideContextMenu(){
    if(contextMenu)contextMenu.style.display="none";
  }

  function ensureMovePanel(){
    if(movePanel)return movePanel;
    const panel=document.createElement("div");
    panel.id="tbObjectMovePanel";
    panel.className="tb-object-move-panel";
    panel.innerHTML=
      '<div class="tb-object-move-head"><b>Перемещение выбранных объектов</b><button type="button" data-move-close>×</button></div>'+
      '<div class="tb-object-move-grid">'+
      '<label>ΔX, мм</label><input type="number" step="1" value="0" data-move-axis="x">'+
      '<label>ΔY, мм</label><input type="number" step="1" value="0" data-move-axis="y">'+
      '<label>ΔZ, мм</label><input type="number" step="1" value="0" data-move-axis="z">'+
      '</div>'+
      '<div class="tb-object-move-actions"><button type="button" data-move-cancel>Отмена</button><button type="button" class="primary" data-move-apply>Переместить</button></div>';
    document.body.appendChild(panel);
    panel.querySelector("[data-move-close]")?.addEventListener("click",closeMovePanel);
    panel.querySelector("[data-move-cancel]")?.addEventListener("click",closeMovePanel);
    panel.querySelector("[data-move-apply]")?.addEventListener("click",()=>{
      const delta={x:0,y:0,z:0};
      for(const input of panel.querySelectorAll("[data-move-axis]")){
        const value=Number(input.value);
        if(!Number.isFinite(value)){
          if(typeof ptToast==="function")ptToast("Введите числовое смещение");
          return;
        }
        delta[input.dataset.moveAxis]=value;
      }
      if(applyMove(delta))closeMovePanel();
    });
    movePanel=panel;
    return panel;
  }

  function openMovePanel(){
    if(!canMoveSelection())return;
    const panel=ensureMovePanel();
    panel.querySelectorAll("[data-move-axis]").forEach((input)=>input.value="0");
    panel.style.display="block";
    panel.style.left=Math.max(12,(window.innerWidth-panel.offsetWidth)/2)+"px";
    panel.style.top=Math.max(12,(window.innerHeight-panel.offsetHeight)/2)+"px";
    panel.querySelector('[data-move-axis="x"]')?.focus();
    panel.querySelector('[data-move-axis="x"]')?.select();
  }
  function closeMovePanel(){if(movePanel)movePanel.style.display="none";}

  function selectedReferenceEntries(entries){
    return entries.filter((entry)=>entry.kind==="ref");
  }
  function prepareReferenceSelection(entries){
    const api=refApi();
    const p=project();
    if(!api||!p)return;
    const raw=selectedReferenceEntries(entries).map(rawReferenceKey);
    api.replaceSelection?.(p,raw);
  }

  function applyMove(delta){
    const entries=selectionEntries();
    if(!entries.length||!canMoveSelection())return false;
    const p=project();
    if(!p)return false;

    const mutate=()=>{
      if(typeof syncActiveTubeFromState==="function")syncActiveTubeFromState();
      const refEntries=selectedReferenceEntries(entries);
      if(refEntries.length){
        prepareReferenceSelection(entries);
        refApi()?.moveSelection?.(p,delta);
      }

      const originals=[];
      for(const entry of entries){
        if(entry.kind!=="tube")continue;
        const tube=tubeById(entry.tubeId);
        if(!tube)continue;
        const origin=tube.origin??{x:0,y:0,z:0};
        originals.push({tube,origin:{x:Number(origin.x)||0,y:Number(origin.y)||0,z:Number(origin.z)||0}});
        tube.origin={
          x:Number(((Number(origin.x)||0)+delta.x).toFixed(6)),
          y:Number(((Number(origin.y)||0)+delta.y).toFixed(6)),
          z:Number(((Number(origin.z)||0)+delta.z).toFixed(6))
        };
        try{if(typeof markImportedOriginOverride==="function")markImportedOriginOverride(tube);}catch{}
      }

      // Keep the whole move atomic if a moved editable tube leaves the allowed frame.
      let invalid=false;
      for(const {tube} of originals){
        try{
          if(typeof analyzeTubeBounds==="function"&&!analyzeTubeBounds(tube)?.valid){
            invalid=true;
            break;
          }
        }catch{}
      }
      if(invalid){
        for(const item of originals)item.tube.origin=item.origin;
        if(typeof ptToast==="function")ptToast("Перемещение отменено: труба выходит за габаритную рамку");
        return false;
      }

      const active=tubeById(activeTubeId());
      if(active&&entries.some((entry)=>entry.kind==="tube"&&entry.tubeId===active.id)){
        state.origin={...active.origin};
      }
      return true;
    };

    const ok=typeof tbModelCommand==="function"
      ? tbModelCommand("Переместить выбранные объекты",mutate)
      : mutate();
    if(ok===false)return false;
    try{if(typeof save==="function")save();}catch{}
    try{if(typeof renderAll==="function")renderAll();}catch{}
    updateTreeSelectionStyles();
    return true;
  }

  function setDisplayState(entry,action){
    if(entry.kind==="tube"){
      const tube=tubeById(entry.tubeId);
      if(!tube)return;
      if(action==="hide")tube.uiHiddenIn3D=true;
      if(action==="show"){
        tube.uiHiddenIn3D=false;
        tube.visible=true;
      }
      return;
    }
    if(entry.kind==="row"){
      const row=rowFor(entry);
      if(!row)return;
      row.uiHiddenIn3D=action==="hide";
      return;
    }
    if(entry.kind==="assembly"){
      const tube=tubeById(entry.tubeId);
      for(const row of tube?.rows??[]){
        if(String(row?.assemblyId??"")===String(entry.assemblyId)){
          row.uiHiddenIn3D=action==="hide";
        }
      }
    }
  }

  function isolateEditableSelection(entries,projectValue){
    const wholeTubes=new Set(
      entries
        .filter((entry)=>entry.kind==="tube")
        .map((entry)=>String(entry.tubeId))
    );
    const rowsByTube=new Map();
    const assembliesByTube=new Map();

    for(const entry of entries){
      const tubeId=String(entry.tubeId??"");
      if(!tubeId)continue;
      if(entry.kind==="row"){
        const set=rowsByTube.get(tubeId)??new Set();
        set.add(Number(entry.rowIndex));
        rowsByTube.set(tubeId,set);
      }else if(entry.kind==="assembly"){
        const set=assembliesByTube.get(tubeId)??new Set();
        set.add(String(entry.assemblyId));
        assembliesByTube.set(tubeId,set);
      }
    }

    for(const tube of projectValue?.tubes??[]){
      const tubeId=String(tube?.id??"");
      const keepWhole=wholeTubes.has(tubeId);
      const rowSet=rowsByTube.get(tubeId)??new Set();
      const assemblySet=assembliesByTube.get(tubeId)??new Set();
      const partial=rowSet.size>0||assemblySet.size>0;

      if(keepWhole){
        tube.uiHiddenIn3D=false;
        tube.visible=true;
        for(const row of tube.rows??[])row.uiHiddenIn3D=false;
        continue;
      }

      if(partial){
        tube.uiHiddenIn3D=false;
        tube.visible=true;
        (tube.rows??[]).forEach((row,index)=>{
          const keep=
            rowSet.has(index)||
            (row?.assemblyId&&assemblySet.has(String(row.assemblyId)));
          row.uiHiddenIn3D=!keep;
        });
        continue;
      }

      tube.uiHiddenIn3D=true;
    }

    // Keep the active legacy row array synchronized with the active project tube.
    const active=tubeById(activeTubeId());
    if(active&&Array.isArray(state?.rows)&&Array.isArray(active.rows)){
      state.rows.forEach((row,index)=>{
        if(active.rows[index])row.uiHiddenIn3D=active.rows[index].uiHiddenIn3D===true;
      });
    }
  }

  function toggleTransparency(entries){
    const editable=entries.filter((entry)=>{
      if(entry.kind==="ref")return false;
      const tube=tubeById(entry.tubeId);
      return !isRecognizedTube(tube);
    });
    const allTransparent=editable.length>0&&editable.every((entry)=>{
      if(entry.kind==="tube")return tubeById(entry.tubeId)?.uiTransparentIn3D===true;
      if(entry.kind==="row")return rowFor(entry)?.uiTransparentIn3D===true;
      if(entry.kind==="assembly"){
        const tube=tubeById(entry.tubeId);
        const rows=(tube?.rows??[]).filter((row)=>String(row?.assemblyId??"")===String(entry.assemblyId));
        return rows.length>0&&rows.every((row)=>row.uiTransparentIn3D===true);
      }
      return false;
    });
    const next=!allTransparent;
    for(const entry of entries){
      if(entry.kind==="ref")continue;
      const tube=tubeById(entry.tubeId);
      if(!isRecognizedTube(tube))continue;
      tube.uiTransparentIn3D=false;
      if(entry.kind==="row"){
        const row=rowFor(entry);
        if(row)row.uiTransparentIn3D=false;
      }else if(entry.kind==="assembly"){
        for(const row of tube?.rows??[]){
          if(String(row?.assemblyId??"")===String(entry.assemblyId)){
            row.uiTransparentIn3D=false;
          }
        }
      }
    }
    for(const entry of editable){
      if(entry.kind==="tube"){
        const tube=tubeById(entry.tubeId);
        if(tube)tube.uiTransparentIn3D=next;
      }else if(entry.kind==="row"){
        const row=rowFor(entry);
        if(row)row.uiTransparentIn3D=next;
      }else if(entry.kind==="assembly"){
        const tube=tubeById(entry.tubeId);
        for(const row of tube?.rows??[]){
          if(String(row?.assemblyId??"")===String(entry.assemblyId)){
            row.uiTransparentIn3D=next;
          }
        }
      }
    }
  }

  function deleteRows(entries){
    const activeId=activeTubeId();
    const activeRows=entries
      .filter((entry)=>entry.kind==="row"&&entry.tubeId===activeId)
      .map((entry)=>Number(entry.rowIndex))
      .filter((index)=>Number.isInteger(index)&&index>=0)
      .sort((a,b)=>b-a);
    const assemblies=new Set(
      entries
        .filter((entry)=>entry.kind==="assembly"&&entry.tubeId===activeId)
        .map((entry)=>String(entry.assemblyId))
    );
    for(const index of activeRows){
      const row=state?.rows?.[index];
      if(row?.assemblyId)assemblies.add(String(row.assemblyId));
    }
    for(const assemblyId of assemblies){
      state.rows=normalizeTubeRowStart(
        (state.rows??[]).filter((row)=>String(row?.assemblyId??"")!==assemblyId),
        state.diameterIndex
      );
    }
    for(const index of activeRows){
      const row=state?.rows?.[index];
      if(!row||row.assemblyId)continue;
      if(row.type!=="BEND"){
        if(typeof ptToast==="function")ptToast("Прямой участок удаляется только вместе с предыдущим гибом");
        continue;
      }
      const count=state.rows[index+1]?.type==="LINE"&&!state.rows[index+1]?.assemblyId?2:1;
      state.rows.splice(index,count);
      state.rows=normalizeTubeRowStart(state.rows,state.diameterIndex);
    }
  }

  function deleteTubes(entries){
    const p=project();
    if(!p)return;
    const ids=new Set(entries.filter((entry)=>entry.kind==="tube").map((entry)=>String(entry.tubeId)));
    if(!ids.size)return;
    p.tubes=(p.tubes??[]).filter((tube)=>!ids.has(String(tube.id)));
    if(!p.tubes.length&&typeof newTubeData==="function"){
      p.tubes.push(newTubeData("Pipe 1"));
    }
    if(ids.has(activeTubeId())){
      state.activeTubeId=p.tubes?.[0]?.id??null;
      try{if(typeof syncProjectToLegacy==="function")syncProjectToLegacy();}catch{}
      try{if(typeof loadActiveTubeToState==="function")loadActiveTubeToState();}catch{}
    }
  }

  function finitePoint3(value,fallback={x:0,y:0,z:0}){
    const source=value&&typeof value==="object"?value:{};
    const out={};
    for(const axis of ["x","y","z"]){
      const n=Number(source[axis]);
      out[axis]=Number.isFinite(n)?n:Number(fallback?.[axis])||0;
    }
    return out;
  }

  function frameDimensions(projectValue){
    const source=projectValue?.bbox??state?.bbox??{};
    return finitePoint3(source,{x:0,y:0,z:0});
  }

  function frameOffset(projectValue){
    const source=projectValue?.coordinateOffset??state?.coordinateOffset??{};
    return finitePoint3(source,{x:0,y:0,z:0});
  }

  function frameChanged(a,b,tolerance=.001){
    return ["x","y","z"].some(
      (axis)=>Math.abs((Number(a?.[axis])||0)-(Number(b?.[axis])||0))>tolerance
    );
  }

  function frameText(value){
    return ["x","y","z"]
      .map((axis)=>{
        const n=Number(value?.[axis])||0;
        return Math.abs(n-Math.round(n))<1e-9
          ? String(Math.round(n))
          : n.toFixed(2);
      })
      .join(" × ");
  }

  function shouldApplyReferenceFrame(projectValue,preview){
    const frame=preview?.frame;
    if(preview?.status!=="exact"||!frame)return false;
    const current=frameDimensions(projectValue);
    const next=frameDimensions({bbox:frame.bbox});
    const dimensionsChanged=frameChanged(current,next);
    if(!dimensionsChanged)return true;
    const message=
      "После удаления импортированного компонента габаритная рамка изменится.\n\n"+
      "Текущая: "+frameText(current)+" мм\n"+
      "Новая: "+frameText(next)+" мм\n\n"+
      "Обновить габаритную рамку?";
    try{return window.confirm(message);}
    catch{return false;}
  }

  function updateImportOriginEvidence(tube,oldOrigin,newOrigin,oldOffset,newOffset){
    const spatial=tube?.importEvidence?.spatialPlacement;
    if(!spatial||typeof spatial!=="object")return;
    spatial.editable_origin_mm=[newOrigin.x,newOrigin.y,newOrigin.z];
    spatial.reference_frame_rebase_after_delete={
      status:"applied",
      source_editable_origin_mm:[oldOrigin.x,oldOrigin.y,oldOrigin.z],
      previous_coordinate_offset_mm:[oldOffset.x,oldOffset.y,oldOffset.z],
      next_coordinate_offset_mm:[newOffset.x,newOffset.y,newOffset.z],
      rebased_editable_origin_mm:[newOrigin.x,newOrigin.y,newOrigin.z],
      physical_world_position_preserved:true,
      source_geometry_preserved:true
    };
    const linear=tube?.importEvidence?.linearDimensionNormalization;
    if(linear&&typeof linear==="object"){
      linear.project_frame_rebased_origin_mm=[newOrigin.x,newOrigin.y,newOrigin.z];
    }
  }

  function applyReferenceFrame(projectValue,frame){
    if(!projectValue||frame?.status!=="exact")return false;
    const oldOffset=frameOffset(projectValue);
    const nextOffset=finitePoint3(frame.coordinateOffset,oldOffset);
    const delta={
      x:oldOffset.x-nextOffset.x,
      y:oldOffset.y-nextOffset.y,
      z:oldOffset.z-nextOffset.z
    };

    for(const tube of projectValue.tubes??[]){
      const oldOrigin=finitePoint3(tube?.origin,{x:0,y:0,z:0});
      const newOrigin={
        x:Number((oldOrigin.x+delta.x).toFixed(6)),
        y:Number((oldOrigin.y+delta.y).toFixed(6)),
        z:Number((oldOrigin.z+delta.z).toFixed(6))
      };
      tube.origin=newOrigin;
      updateImportOriginEvidence(tube,oldOrigin,newOrigin,oldOffset,nextOffset);
    }

    projectValue.bbox={...frame.bbox};
    projectValue.bboxAnchor={...frame.bboxAnchor};
    projectValue.coordinateOffset={...nextOffset};

    if(typeof state==="object"&&state){
      state.bbox={...frame.bbox};
      state.bboxAnchor={...frame.bboxAnchor};
      state.coordinateOffset={...nextOffset};
      const active=(projectValue.tubes??[]).find(
        (tube)=>String(tube?.id)===activeTubeId()
      );
      if(active?.origin)state.origin={...active.origin};
    }
    return true;
  }

  function showAllObjects(projectValue){
    for(const tube of projectValue?.tubes??[]){
      tube.uiHiddenIn3D=false;
      tube.visible=true;
      for(const row of tube.rows??[])row.uiHiddenIn3D=false;
    }
    if(Array.isArray(state?.rows)){
      for(const row of state.rows)row.uiHiddenIn3D=false;
    }
    refApi()?.showAll?.(projectValue);
  }

  function applyAction(action){
    const entries=selectionEntries();
    const p=project();
    if(!p)return;
    if(action!=="show-all"&&!entries.length)return;

    const mutate=()=>{
      if(typeof syncActiveTubeFromState==="function")syncActiveTubeFromState();

      if(action==="show-all"){
        showAllObjects(p);
      }else{
        prepareReferenceSelection(entries);
      }

      if(action==="hide"||action==="show"){
        const refs=selectedReferenceEntries(entries);
        if(refs.length)refApi()?.applyBulkAction?.(p,action);
        for(const entry of entries)if(entry.kind!=="ref")setDisplayState(entry,action);
      }else if(action==="isolate"){
        isolateEditableSelection(entries,p);
        refApi()?.isolateSelection?.(p);
      }else if(action==="transparent"){
        const refs=selectedReferenceEntries(entries);
        if(refs.length)refApi()?.applyBulkAction?.(p,"transparent");
        toggleTransparency(entries);
      }else if(action==="delete"){
        const refs=selectedReferenceEntries(entries);
        let framePreview=null;
        let applyFrame=false;
        if(refs.length){
          framePreview=refApi()?.previewDeleteFrame?.(p)??null;
          if(framePreview?.status==="exact"){
            applyFrame=shouldApplyReferenceFrame(p,framePreview);
          }
          refApi()?.applyBulkAction?.(p,"delete");
        }
        deleteRows(entries);
        deleteTubes(entries);
        if(refs.length&&applyFrame&&framePreview?.frame){
          applyReferenceFrame(p,framePreview.frame);
        }else if(refs.length&&framePreview&&framePreview.status!=="exact"){
          try{
            if(typeof ptToast==="function"){
              ptToast("Компонент удалён; габаритная рамка не пересчитана: "+String(framePreview.reason??"нет точных габаритов"));
            }
          }catch{}
        }
        selected.clear();
        refApi()?.clearSelection?.();
      }
      return true;
    };

    const label={
      hide:"Скрыть выбранные объекты",
      isolate:"Скрыть другие объекты",
      show:"Показать выбранные объекты",
      "show-all":"Показать все объекты",
      transparent:"Изменить прозрачность выбранных объектов",
      delete:"Удалить выбранные объекты"
    }[action]||"Изменить выбранные объекты";

    const ok=typeof tbModelCommand==="function"?tbModelCommand(label,mutate):mutate();
    if(ok===false)return;
    try{if(typeof save==="function")save();}catch{}
    try{if(typeof renderAll==="function")renderAll();}catch{}
    refreshVisualSelection();
  }

  function onCanvasClick(event){
    if(event.button!==0)return;
    try{if(controls?.shouldSuppressSelection?.())return;}catch{}
    const picked=pick3D(event);
    if(!picked)return;
    setSelectedKey(picked.key,{
      additive:!!(event.ctrlKey||event.metaKey),
      toggle:!!(event.ctrlKey||event.metaKey)
    });
    revealTreeKey(picked.key);
  }

  function onCanvasContext(event){
    try{
      if(controls?.shouldSuppressSelection?.()){
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }catch{}
    const picked=pick3D(event);
    event.preventDefault();
    event.stopPropagation();
    if(!picked){
      showContextMenu(event,{source:"3d",allowEmpty:true,selectionAvailable:false});
      return;
    }
    syncReferenceIntoSelection();
    if(!selected.has(picked.key))setSelectedKey(picked.key,{additive:false});
    revealTreeKey(picked.key);
    showContextMenu(event,{source:"3d"});
  }

  function onTreeClick(event){
    if(!projectTreeForEvent(event))return;
    const row=treeRowFromTarget(event.target);
    if(!row)return;
    const key=keyForTreeRow(row);
    if(!key)return;
    if(row.matches("[data-ref-node]")){
      const replaceNonReference=!(event.ctrlKey||event.metaKey||event.shiftKey);
      setTimeout(()=>{
        adoptReferenceSelection({
          source:"tree",
          replaceNonReference
        });
      },0);
      return;
    }
    setSelectedKey(key,{
      additive:!!(event.ctrlKey||event.metaKey),
      toggle:!!(event.ctrlKey||event.metaKey)
    });
  }

  function onTreeContext(event){
    if(!projectTreeForEvent(event))return;
    const row=treeRowFromTarget(event.target);
    if(!row){
      event.preventDefault();
      event.stopPropagation();
      showContextMenu(event,{source:"tree",allowEmpty:true,selectionAvailable:false});
      return;
    }
    const key=keyForTreeRow(row);
    if(!key)return;
    event.preventDefault();
    event.stopPropagation();
    syncReferenceIntoSelection();
    if(!selected.has(key))setSelectedKey(key,{additive:false});
    showContextMenu(event,{source:"tree"});
  }

  function projectTreeRows(host){
    if(!host)return [];
    return [...host.querySelectorAll(
      "[data-tree-tube],[data-tree-row],[data-tree-assembly],[data-tree-assembly-part],[data-tree-origin],[data-ref-scene-row],[data-ref-node]"
    )];
  }

  function decorateProjectTreeAsTreeView(){
    const host=document.getElementById("tbProjectTree");
    if(!host)return;
    host.classList.add("tb-project-treeview");
    host.setAttribute("role","tree");

    const rows=projectTreeRows(host);
    if(!rows.length)return;
    const paddings=rows.map((row)=>{
      const inline=parseFloat(row.style.paddingLeft);
      if(Number.isFinite(inline))return inline;
      try{
        const computed=parseFloat(getComputedStyle(row).paddingLeft);
        return Number.isFinite(computed)?computed:0;
      }catch{
        return 0;
      }
    });
    const minPadding=Math.min(...paddings);

    rows.forEach((row,index)=>{
      const padding=paddings[index];
      const depth=Math.max(0,Math.round((padding-minPadding)/18));
      row.classList.add("tb-treeview-row");
      row.dataset.treeviewDepth=String(depth);
      row.style.setProperty("--tb-treeview-depth",String(depth));
      row.style.setProperty("--tb-treeview-branch-x",(11+depth*18)+"px");
      row.setAttribute("role","treeitem");
      row.setAttribute("aria-level",String(depth+1));

      const expander=row.querySelector(
        ".tb-tree-icon,[data-ref-toggle],[data-ref-scene-toggle],[data-tree-toggle],[data-tree-expand]"
      );
      if(expander){
        row.classList.add("tb-treeview-expandable");
        const marker=String(expander.textContent??"").trim();
        if(marker==="▾"||marker==="▼"||marker==="−"){
          row.setAttribute("aria-expanded","true");
        }else if(marker==="▸"||marker==="▶"||marker==="+"){
          row.setAttribute("aria-expanded","false");
        }
      }
    });
  }

  function installStyles(){
    if(document.getElementById("tbObjectContextStyles"))return;
    const style=document.createElement("style");
    style.id="tbObjectContextStyles";
    style.textContent=
      '.tb-object-context-menu{position:fixed;z-index:120000;display:none;min-width:205px;padding:5px;background:#101927;border:1px solid #40536d;border-radius:7px;box-shadow:0 12px 34px rgba(0,0,0,.55);font:12px/1.2 Segoe UI,Arial,sans-serif;color:#e6eef8}'+
      '.tb-object-context-title{padding:5px 8px 7px;color:#91a6c0;font-size:11px;border-bottom:1px solid #2d3b4f;margin-bottom:3px}'+
      '.tb-object-context-menu button{display:flex;width:100%;align-items:center;gap:9px;text-align:left;border:0;border-radius:4px;background:transparent;color:#e6eef8;padding:7px 9px;cursor:pointer}'+
      '.tb-object-context-menu button:hover:not(:disabled){background:#233750}'+
      '.tb-object-context-menu button:disabled{opacity:.4;cursor:not-allowed}'+
      '.tb-object-context-menu button.diagnose{color:#ffb4b4}'+
      '.tb-object-context-menu button.diagnose:hover:not(:disabled){background:#4a232a;color:#ffd4d4}'+
      '.tb-object-issues-panel{position:fixed;z-index:120010;display:none;width:min(430px,calc(100vw - 24px));max-height:min(520px,calc(100vh - 24px));overflow:auto;background:#101927;border:1px solid #65414a;border-radius:9px;box-shadow:0 18px 45px rgba(0,0,0,.62);font:12px/1.4 Segoe UI,Arial,sans-serif;color:#e6eef8}'+
      '.tb-object-issues-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid #3d2d35;background:#24181d}'+
      '.tb-object-issues-head b{color:#ffb4b4;font-size:13px}'+
      '.tb-object-issues-head [data-issues-subtitle]{margin-top:2px;color:#aebed1;font-size:11px}'+
      '.tb-object-issues-head button{width:25px;height:25px;border:0;border-radius:4px;background:transparent;color:#dce7f4;cursor:pointer;font-size:19px;line-height:1}'+
      '.tb-object-issues-head button:hover{background:#4a2a32}'+
      '.tb-object-issues-list{display:flex;flex-direction:column;gap:6px;padding:10px 12px}'+
      '.tb-object-issue-row{display:grid;grid-template-columns:20px 1fr;gap:7px;align-items:start;padding:7px 8px;border:1px solid #4b3239;border-radius:6px;background:#1c1418;color:#ffd4d4}'+
      '.tb-object-issue-marker{display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:50%;background:#ff4c4c;color:#fff;font-weight:900;font-size:11px}'+
      '.tb-object-context-menu button.danger{color:#ff9b9b}'+
      '.tb-object-context-separator{height:1px;background:#2d3b4f;margin:3px 4px}'+
      '.tb-object-move-panel{position:fixed;z-index:120001;display:none;width:300px;padding:10px;background:#101927;border:1px solid #48607e;border-radius:8px;box-shadow:0 16px 42px rgba(0,0,0,.62);color:#e6eef8;font:12px Segoe UI,Arial,sans-serif}'+
      '.tb-object-move-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}.tb-object-move-head b{flex:1}.tb-object-move-head button{border:0;background:transparent;color:#b9c8da;font-size:18px;cursor:pointer}'+
      '.tb-object-move-grid{display:grid;grid-template-columns:80px 1fr;gap:7px;align-items:center}.tb-object-move-grid input{height:29px;border:1px solid #3a506b;border-radius:5px;background:#0b1320;color:#fff;padding:0 7px}'+
      '.tb-object-move-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:11px}.tb-object-move-actions button{height:29px;border:1px solid #3d536e;border-radius:5px;background:#17283d;color:#e5edf7;padding:0 10px;cursor:pointer}.tb-object-move-actions button.primary{background:#24558a;border-color:#3c7fc1}'+
      '#tbProjectTree .tb-object-selected{box-shadow:inset 3px 0 0 #ffd54a!important,0 0 0 1px rgba(255,213,74,.35)!important;background:rgba(255,213,74,.14)!important;color:#fff8cf!important}'+
      '#tbProjectTree.tb-project-treeview{padding:4px 3px 8px;overflow:auto;user-select:none}'+
      '#tbProjectTree.tb-project-treeview .tb-treeview-row{position:relative;display:flex;align-items:center;min-height:26px;margin:1px 2px;padding-left:calc(8px + var(--tb-treeview-depth)*18px)!important;padding-right:4px;border-radius:4px;white-space:nowrap;box-sizing:border-box}'+
      '#tbProjectTree.tb-project-treeview .tb-treeview-row:hover{background:rgba(105,148,196,.12)}'+
      '#tbProjectTree.tb-project-treeview .tb-treeview-row[data-treeview-depth]:not([data-treeview-depth="0"])::before{content:"";position:absolute;left:var(--tb-treeview-branch-x);top:-14px;bottom:13px;border-left:1px solid rgba(128,151,178,.38);pointer-events:none}'+
      '#tbProjectTree.tb-project-treeview .tb-treeview-row[data-treeview-depth]:not([data-treeview-depth="0"])::after{content:"";position:absolute;left:var(--tb-treeview-branch-x);top:13px;width:11px;border-top:1px solid rgba(128,151,178,.38);pointer-events:none}'+
      '#tbProjectTree.tb-project-treeview .tb-tree-icon,#tbProjectTree.tb-project-treeview [data-ref-toggle],#tbProjectTree.tb-project-treeview [data-ref-scene-toggle],#tbProjectTree.tb-project-treeview [data-tree-toggle],#tbProjectTree.tb-project-treeview [data-tree-expand]{width:18px!important;min-width:18px!important;height:18px!important;padding:0!important;margin:0 2px 0 0!important;border:0!important;background:transparent!important;color:#aebed0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:3px!important;line-height:18px!important}'+
      '#tbProjectTree.tb-project-treeview .tb-tree-icon:hover,#tbProjectTree.tb-project-treeview [data-ref-toggle]:hover,#tbProjectTree.tb-project-treeview [data-ref-scene-toggle]:hover,#tbProjectTree.tb-project-treeview [data-tree-toggle]:hover,#tbProjectTree.tb-project-treeview [data-tree-expand]:hover{background:rgba(117,157,202,.18)!important;color:#eaf2fb!important}'+
      '#tbProjectTree.tb-project-treeview .tb-tree-label{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:24px}'+
      '#tbProjectTree.tb-project-treeview .tb-tree-eye{margin-left:auto;flex:0 0 auto;opacity:.75}'+
      '#tbProjectTree.tb-project-treeview input[type="checkbox"]{width:13px;height:13px;margin:0 5px 0 1px;flex:0 0 auto}'+
      '#tbProjectTree.tb-project-treeview .tb-treeview-row.active{background:rgba(66,123,183,.20)}'+
      '#tbProjectTree.tb-project-treeview .tb-treeview-row.tb-object-selected{background:rgba(255,213,74,.14)!important}';
    document.head.appendChild(style);
  }

  function install(){
    if(installed)return;
    installed=true;
    installStyles();
    const canvas=document.getElementById("threeCanvas");
    canvas?.addEventListener("click",onCanvasClick);
    canvas?.addEventListener("contextmenu",onCanvasContext);
    // Project tree is built dynamically by buildShell(), so bind through
    // document instead of capturing a possibly non-existent tree element.
    document.addEventListener("click",onTreeClick);
    document.addEventListener("contextmenu",onTreeContext,true);
    document.addEventListener("pointerdown",(event)=>{
      if(contextMenu?.style.display==="block"&&!event.target.closest("#tbObjectContextMenu"))hideContextMenu();
      if(movePanel?.style.display==="block"&&!event.target.closest("#tbObjectMovePanel")&&!event.target.closest('[data-object-action="move"]')){}
      if(issuesPanel?.style.display==="block"&&!event.target.closest("#tbObjectIssuesPanel")&&!event.target.closest('[data-object-action="diagnose"]')){
        issuesPanel.style.display="none";
      }
    });
    window.addEventListener("keydown",(event)=>{
      if(event.key==="Escape"){
        hideContextMenu();
        closeMovePanel();
        if(issuesPanel)issuesPanel.style.display="none";
      }
    });

    // Re-apply hidden/transparency/selection state after every legacy 3D rebuild.
    if(typeof update3D==="function"&&!update3D._tbObjectContext){
      const original=update3D;
      update3D=function(...args){
        const result=original.apply(this,args);
        try{decorateRenderedObjects();}catch(error){console.warn("Object display state:",error);}
        return result;
      };
      update3D._tbObjectContext=true;
    }

    const treeObserver=new MutationObserver((mutations)=>{
      let treeChanged=false;
      for(const mutation of mutations){
        const target=mutation.target;
        if(
          target?.id==="tbProjectTree"||
          target?.closest?.("#tbProjectTree")||
          [...(mutation.addedNodes??[])].some((node)=>
            node?.nodeType===1&&(
              node.id==="tbProjectTree"||
              node.querySelector?.("#tbProjectTree")
            )
          )
        ){
          treeChanged=true;
          break;
        }
      }
      if(treeChanged){
        decorateProjectTreeAsTreeView();
        updateTreeSelectionStyles();
      }
    });
    treeObserver.observe(document.body,{childList:true,subtree:true});
    try{decorateRenderedObjects();}catch{}
    decorateProjectTreeAsTreeView();
    updateTreeSelectionStyles();
  }

  window.TubeBenderObjectContext=Object.freeze({
    install,
    clearSelection,
    selectionKeys:()=>Object.freeze([...selected]),
    selectionEntries,
    applyAction,
    applyMove,
    applyReferenceFrame,
    invalidElementDiagnosis,
    openInvalidElementDiagnosis,
    revealTreeKey,
    adoptReferenceSelection,
    decorateProjectTreeAsTreeView,
    refresh:refreshVisualSelection
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();