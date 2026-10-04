(()=>{
  const STRAIGHT_RUN_URL="__TB_STRAIGHT_RUN_MODULE_URL__";
  const RIGID_TRANSFORM_URL="__TB_RIGID_TRANSFORM_MODULE_URL__";
  let straightRun=null,rigidTransform=null,installed=false,panel=null,button=null,activeTool="copy";
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clone=(v)=>v==null?v:structuredClone(v);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const api=()=>window.TubeBenderEngineering??null;
  const context=()=>window.TubeBenderObjectContext??null;
  const project=()=>{try{return api()?.activeProject?.()??null;}catch{return null;}};
  const stateValue=()=>{try{return api()?.getState?.()??null;}catch{return null;}};
  const readonly=()=>{try{return api()?.readonly?.()===true;}catch{return false;}};
  const toast=(m)=>{try{api()?.toast?.(String(m??""));}catch{}};
  const entries=()=>context()?.selectionEntries?.()??[];
  const tubeById=(id)=>(project()?.tubes??[]).find((t)=>String(t?.id)===String(id))??null;
  function makeId(prefix){
    const uuid=globalThis.crypto?.randomUUID?.();
    return uuid?prefix+"-"+uuid:prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
  }
  function uniqueTubeName(base){
    const used=new Set((project()?.tubes??[]).map((t)=>String(t?.name??"")));
    let name=String(base||"Tube")+" Copy",i=2;
    while(used.has(name))name=String(base||"Tube")+" Copy "+i++;
    return name;
  }
  function detachExternalGeometryLinks(tube){
    const copy=clone(tube);
    const keys=[
      "sourceGeometryId","editableGeometryId","externalRefId","external_ref_id",
      "source_geometry_id","editable_geometry_id","source_link","external_link"
    ];
    for(const key of keys)delete copy[key];
    if(copy.engineering?.ports){
      for(const port of Object.values(copy.engineering.ports)){
        if(port&&typeof port==="object"){
          port.externalRefId="";
          port.ownerObjectId="";
        }
      }
      if(copy.engineering.ports.P1)copy.engineering.ports.P1.locked=true;
      if(copy.engineering.ports.P2)copy.engineering.ports.P2.locked=false;
    }
    if(copy.importEvidence&&typeof copy.importEvidence==="object"){
      copy.importEvidence={
        ...copy.importEvidence,
        copied_geometry_snapshot:true,
        source_link_detached:true
      };
    }
    copy.source_link_detached=true;
    copy.uiHiddenIn3D=false;
    copy.uiTransparentIn3D=false;
    return copy;
  }
  function selectedWholeTubes(){
    return entries().filter((e)=>e.kind==="tube").map((e)=>tubeById(e.tubeId)).filter((tube)=>
      tube&&tube?.array_member?.derived_readonly!==true&&tube?.mirror_member?.derived_readonly!==true&&tube?.transform_stack_member?.derived_readonly!==true
    );
  }
  function selectedSingleLine(){
    const list=entries();
    if(list.length!==1||list[0].kind!=="row")return null;
    const e=list[0],tube=tubeById(e.tubeId);
    if(!tube)return null;
    const s=stateValue();
    const row=String(s?.activeTubeId??"")===String(tube.id)
      ?s?.rows?.[e.rowIndex]??tube.rows?.[e.rowIndex]
      :tube.rows?.[e.rowIndex];
    if(row?.type!=="LINE")return null;
    return {entry:e,tube,row,rowIndex:Number(e.rowIndex)};
  }
  function commit(label,mutate){
    if(readonly()){toast("Проект открыт только для просмотра");return false;}
    const ok=api()?.modelCommand?api().modelCommand(label,mutate):mutate();
    if(ok===false)return false;
    try{api()?.save?.();api()?.renderAll?.();}catch{}
    try{context()?.refresh?.();}catch{}
    render();
    return true;
  }

  function copySelection(){
    const tubes=selectedWholeTubes();
    if(!tubes.length){toast("Для Copy выберите одну или несколько целых труб");return false;}
    const p=project();if(!p)return false;
    return commit("Копировать выбранные трубы",()=>{
      const created=[];
      for(const source of tubes){
        const copy=detachExternalGeometryLinks(source);
        copy.id=makeId("tube");
        copy.name=uniqueTubeName(source.name);
        copy.partNumber="";
        copy.material_warning_ack_signature=null;
        copy.equipment_calculation_state="Stale";
        copy.material_calculation_state=copy.material_profile_id?"Stale":"Missing Material";
        if(Array.isArray(copy.rows)){
          copy.rows=copy.rows.map((row)=>({
            ...row,
            elementId:row?.elementId?makeId("element"):row?.elementId
          }));
        }
        created.push(copy);
      }
      p.tubes=[...(p.tubes??[]),...created];
      return true;
    });
  }
  function moveSelection(body){
    const dx=Number($("[data-edit-dx]",body).value.replace(",",".")),
      dy=Number($("[data-edit-dy]",body).value.replace(",",".")),
      dz=Number($("[data-edit-dz]",body).value.replace(",","."));
    if(![dx,dy,dz].every(Number.isFinite)){toast("ΔX / ΔY / ΔZ должны быть числами");return false;}
    const ok=context()?.applyMove?.({x:dx,y:dy,z:dz});
    if(ok===false)toast("Перемещение недоступно для текущего выбора");
    return ok;
  }
  function splitSelected(body){
    const selected=selectedSingleLine();
    if(!selected){toast("Для Split выберите один прямой участок LINE");return false;}
    const mode=$("[data-split-mode]",body).value;
    const raw=$("[data-split-value]",body).value.replace(",",".");
    const value=Number(raw);
    if(!Number.isFinite(value)){toast("Введите числовое значение Split");return false;}
    try{
      const run=straightRun.straightRunFromLegacy(selected.row);
      let next;
      if(mode==="start")next=straightRun.splitStraightAtDistance(run,value,{from:"start"});
      else if(mode==="end")next=straightRun.splitStraightAtDistance(run,value,{from:"end"});
      else if(mode==="equal")next=straightRun.splitStraightEqual(run,Math.trunc(value));
      else if(mode==="percent")next=straightRun.splitStraightAtNormalized(run,value/100);
      else throw new Error("Неизвестный режим Split");
      const serialized=straightRun.serializeStraightRunToLegacy(next);
      return commit("Разделить прямой участок",()=>{
        selected.row.straightRun=clone(serialized.straightRun);
        return true;
      });
    }catch(error){toast(error.message);return false;}
  }

  function rotateSelection(body){
    const tubes=selectedWholeTubes();
    if(!tubes.length){toast("Для Rotate выберите одну или несколько целых труб");return false;}
    const axisName=$("[data-rotate-axis]",body).value;
    const axis=axisName==="X"?{x:1,y:0,z:0}:axisName==="Y"?{x:0,y:1,z:0}:{x:0,y:0,z:1};
    const angle=Number($("[data-rotate-angle]",body).value.replace(",","."));
    if(!Number.isFinite(angle)){toast("Угол Rotate должен быть числом");return false;}
    const centerMode=$("[data-rotate-center-mode]",body).value;
    let explicitCenter=null;
    if(centerMode==="custom"){
      explicitCenter={
        x:Number($("[data-rotate-cx]",body).value.replace(",",".")),
        y:Number($("[data-rotate-cy]",body).value.replace(",",".")),
        z:Number($("[data-rotate-cz]",body).value.replace(",","."))
      };
      if(![explicitCenter.x,explicitCenter.y,explicitCenter.z].every(Number.isFinite)){
        toast("Координаты центра Rotate должны быть числами");return false;
      }
    }
    const plans=[];
    try{
      for(const source of tubes){
        const center=centerMode==="own"
          ?clone(source.origin??{x:0,y:0,z:0})
          :centerMode==="custom"
            ?explicitCenter
            :{x:0,y:0,z:0};
        const result=rigidTransform.rotateLegacyTubeRigid(source,{axis,center,angle_deg:angle});
        if(result.status!=="exact")throw new Error(result.reason||"Rotate не может быть точно закодирован");
        const rotated=clone(result.tube);
        if(rotated.importEvidence?.spatialPlacement){
          rotated.importEvidence.spatialPlacement.user_origin_override=true;
          rotated.importEvidence.spatialPlacement.rigid_rotation_override=true;
        }
        plans.push({source,rotated});
      }
    }catch(error){toast(error.message);return false;}

    if(readonly()){toast("Проект открыт только для просмотра");return false;}
    const command=api()?.wholeObjectCommand??api()?.modelCommand;
    const mutate=()=>{
      for(const plan of plans){
        for(const key of Object.keys(plan.source))delete plan.source[key];
        Object.assign(plan.source,clone(plan.rotated));
      }
      return true;
    };
    const ok=typeof command==="function"?command("Повернуть выбранные трубы",mutate):mutate();
    if(ok===false)return false;
    try{api()?.reloadActiveTube?.();}catch{}
    try{api()?.save?.();api()?.renderAll?.();context()?.refresh?.();}catch{}
    render();
    return true;
  }

  function mirrorRuntime(){return window.TubeBenderAssociativeMirrors??null;}
  function mirrorPlaneFromBody(body){
    const mode=$("[data-mirror-plane]",body).value;
    const point={
      x:Number($("[data-mirror-px]",body).value.replace(",",".")),
      y:Number($("[data-mirror-py]",body).value.replace(",",".")),
      z:Number($("[data-mirror-pz]",body).value.replace(",","."))
    };
    if(![point.x,point.y,point.z].every(Number.isFinite))throw new Error("Точка плоскости Mirror должна быть числовой");
    let normal;
    if(mode==="XY")normal={x:0,y:0,z:1};
    else if(mode==="XZ")normal={x:0,y:1,z:0};
    else if(mode==="YZ")normal={x:1,y:0,z:0};
    else{
      normal={
        x:Number($("[data-mirror-nx]",body).value.replace(",",".")),
        y:Number($("[data-mirror-ny]",body).value.replace(",",".")),
        z:Number($("[data-mirror-nz]",body).value.replace(",","."))
      };
    }
    if(![normal.x,normal.y,normal.z].every(Number.isFinite)||Math.hypot(normal.x,normal.y,normal.z)<=1e-12){
      throw new Error("Нормаль плоскости Mirror должна быть ненулевой");
    }
    return {plane_point:point,plane_normal:normal};
  }
  function createMirrorFromSelection(body){
    const tubes=selectedWholeTubes();
    if(!tubes.length){toast("Для Mirror выберите одну или несколько целых труб");return false;}
    const runtime=mirrorRuntime();
    if(!runtime){toast("Associative Mirror runtime ещё не загружен");return false;}
    const mode=$("[data-mirror-mode]",body).value;
    const associative=$("[data-mirror-associative]",body).checked;
    let plane;
    try{plane=mirrorPlaneFromBody(body);}catch(error){toast(error.message);return false;}
    if(mode==="Original"&&associative){
      toast("Associative Mirror для Original пока не применяется: выберите Copy или отключите Associative");
      return false;
    }
    return commit(mode==="Original"?"Mirror Original":"Mirror Copy",()=>{
      for(const source of tubes){
        if(mode==="Original"){
          runtime.mirrorOriginal({source_tube_id:source.id,...plane},project());
        }else if(associative){
          runtime.addAssociativeCopy({
            source_tube_id:source.id,
            name:$("[data-mirror-name]",body).value.trim()||"Mirror",
            ...plane
          },project());
        }else{
          runtime.createIndependentCopy({
            source_tube_id:source.id,
            name:uniqueTubeName((source.name??"Tube")+" Mirror"),
            ...plane
          },project());
        }
      }
      try{api()?.reloadActiveTube?.();}catch{}
      return true;
    });
  }
  function mirrorAction(body,action){
    const runtime=mirrorRuntime(),id=$("[data-mirror-existing]",body)?.value;
    if(!runtime||!id){toast("Выберите существующий Associative Mirror");return false;}
    if(action==="break"){
      return commit("Разорвать Associative Mirror",()=>{runtime.breakMirror(id,project());return true;});
    }
    if(action==="delete"){
      return commit("Удалить Associative Mirror",()=>{runtime.deleteMirror(id,{deleteTarget:true},project());return true;});
    }
    return false;
  }
  function mirrorPanelHtml(){
    const defs=mirrorRuntime()?.definitions?.()??[];
    const existing='<option value="">—</option>'+defs.map((d)=>'<option value="'+esc(d.id)+'">'+esc(d.name)+" · "+esc(d.status??"")+'</option>').join("");
    return '<div class="tb-edit-card"><b>Mirror</b><div class="tb-edit-grid" style="margin-top:8px">'+
      '<label>Name</label><input data-mirror-name value="Mirror">'+
      '<label>Mode</label><select data-mirror-mode><option>Copy</option><option>Original</option></select>'+
      '<label>Plane</label><select data-mirror-plane><option>XY</option><option>XZ</option><option>YZ</option><option value="Custom">Custom normal</option></select>'+
      '<label>Plane point X</label><input data-mirror-px value="0"><label>Plane point Y</label><input data-mirror-py value="0"><label>Plane point Z</label><input data-mirror-pz value="0">'+
      '<label>Normal X</label><input data-mirror-nx value="1"><label>Normal Y</label><input data-mirror-ny value="0"><label>Normal Z</label><input data-mirror-nz value="0">'+
      '<label>Associative Copy</label><input data-mirror-associative type="checkbox" checked>'+
      '</div><div class="tb-edit-note" style="margin-top:8px">Mirror Copy по умолчанию ассоциативен: источник не меняется, производная труба пересчитывается перед renderAll. Отражение пере-кодируется в правостороннюю геометрию; nominal L / CLR / bend angle сохраняются. Mirror Original выполняется как явная неассоциативная операция.</div>'+
      '<div class="tb-edit-actions"><button data-mirror-create>Применить Mirror</button></div></div>'+
      '<div class="tb-edit-card" style="margin-top:8px"><b>Associative Mirrors</b><div class="tb-edit-grid" style="margin-top:8px"><label>Mirror</label><select data-mirror-existing>'+existing+'</select></div>'+
      '<div class="tb-edit-actions"><button data-mirror-break>Break Mirror</button><button data-mirror-delete>Удалить Mirror</button></div></div>';
  }

  function stackRuntime(){return window.TubeBenderTransformStacks??null;}
  function stackSelectedDefinition(body){
    const id=$("[data-stack-existing]",body)?.value;
    return id?stackRuntime()?.definitionById?.(id)??null:null;
  }
  function createTransformStackFromSelection(){
    const tubes=selectedWholeTubes();
    if(!tubes.length){toast("Для Transform Stack выберите одну или несколько целых труб");return false;}
    const runtime=stackRuntime();
    if(!runtime?.createForTube){toast("Transform Stack runtime ещё не загружен");return false;}
    return commit("Создать Transform Stack",()=>{
      for(const tube of tubes)runtime.createForTube(tube.id,project());
      return true;
    });
  }
  function stackAddOperation(body,kind){
    const runtime=stackRuntime(),def=stackSelectedDefinition(body);
    if(!runtime||!def){toast("Выберите Transform Stack");return false;}
    try{
      return commit("Добавить "+kind+" в Transform Stack",()=>{
        if(kind==="Move"){
          runtime.appendMove(def.id,{x:Number($("[data-stack-dx]",body).value.replace(",",".")),y:Number($("[data-stack-dy]",body).value.replace(",",".")),z:Number($("[data-stack-dz]",body).value.replace(",","."))},project());
        }else if(kind==="Rotate"){
          const axisName=$("[data-stack-axis]",body).value;
          const axis=axisName==="X"?{x:1,y:0,z:0}:axisName==="Y"?{x:0,y:1,z:0}:{x:0,y:0,z:1};
          runtime.appendRotate(def.id,{axis,center:{x:Number($("[data-stack-cx]",body).value.replace(",",".")),y:Number($("[data-stack-cy]",body).value.replace(",",".")),z:Number($("[data-stack-cz]",body).value.replace(",","."))},angle_deg:Number($("[data-stack-angle]",body).value.replace(",","."))},project());
        }else{
          const plane=$("[data-stack-plane]",body).value;
          const normal=plane==="XY"?{x:0,y:0,z:1}:plane==="XZ"?{x:0,y:1,z:0}:{x:1,y:0,z:0};
          runtime.appendMirror(def.id,{plane_point:{x:Number($("[data-stack-px]",body).value.replace(",",".")),y:Number($("[data-stack-py]",body).value.replace(",",".")),z:Number($("[data-stack-pz]",body).value.replace(",","."))},plane_normal:normal},project());
        }
        return true;
      });
    }catch(error){toast(error.message);return false;}
  }
  function stackOperationAction(body,action){
    const runtime=stackRuntime(),def=stackSelectedDefinition(body);
    if(!runtime||!def){toast("Выберите Transform Stack");return false;}
    const opId=$("[data-stack-operation]",body)?.value;
    if(action==="bake")return commit("Bake Transform Stack",()=>{runtime.bake(def.id,project());return true;});
    if(action==="delete")return commit("Удалить Transform Stack",()=>runtime.deleteStack(def.id,{restoreBase:true},project()));
    if(!opId){toast("Выберите операцию Transform Stack");return false;}
    const index=def.operations.findIndex((op)=>String(op.id)===String(opId));
    if(index<0){toast("Операция Transform Stack не найдена");return false;}
    if(action==="remove")return commit("Удалить операцию Transform Stack",()=>{runtime.removeOperation(def.id,opId,project());return true;});
    if(action==="toggle"){const op=def.operations[index];return commit("Переключить операцию Transform Stack",()=>{runtime.setOperationEnabled(def.id,opId,op.enabled===false,project());return true;});}
    const target=action==="up"?index-1:index+1;
    if(target<0||target>=def.operations.length)return false;
    return commit("Изменить порядок Transform Stack",()=>{runtime.reorderOperation(def.id,index,target,project());return true;});
  }
  function stackPanelHtml(){
    const defs=stackRuntime()?.definitions?.()??[];
    const existing='<option value="">—</option>'+defs.map((d)=>'<option value="'+esc(d.id)+'">'+esc(d.base_tube?.name??d.object_id)+" · "+esc(d.operations?.length??0)+" ops · "+esc(d.state??"")+'</option>').join("");
    return '<div class="tb-edit-card"><b>Associative Transform Stack</b><div class="tb-edit-note" style="margin-top:7px">Стек хранит исходную геометрию отдельно и применяет Move / Rotate / Mirror строго по порядку. Номинальные L, CLR и bend angle не изменяются.</div><div class="tb-edit-actions"><button data-stack-create>Создать Stack из выбранной трубы</button></div></div>'+
      '<div class="tb-edit-card" style="margin-top:8px"><div class="tb-edit-grid"><label>Stack</label><select data-stack-existing>'+existing+'</select>'+
      '<label>Move ΔX</label><input data-stack-dx value="0"><label>Move ΔY</label><input data-stack-dy value="0"><label>Move ΔZ</label><input data-stack-dz value="0">'+
      '<label>Rotate axis</label><select data-stack-axis><option>X</option><option>Y</option><option>Z</option></select><label>Angle, °</label><input data-stack-angle value="90">'+
      '<label>Center X</label><input data-stack-cx value="0"><label>Center Y</label><input data-stack-cy value="0"><label>Center Z</label><input data-stack-cz value="0">'+
      '<label>Mirror plane</label><select data-stack-plane><option>XY</option><option>XZ</option><option>YZ</option></select><label>Plane point X</label><input data-stack-px value="0"><label>Plane point Y</label><input data-stack-py value="0"><label>Plane point Z</label><input data-stack-pz value="0">'+
      '</div><div class="tb-edit-actions"><button data-stack-add-move>+ Move</button><button data-stack-add-rotate>+ Rotate</button><button data-stack-add-mirror>+ Mirror</button></div></div>'+
      '<div class="tb-edit-card" style="margin-top:8px"><div class="tb-edit-grid"><label>Operation ID</label><input data-stack-operation placeholder="operation id"></div><div class="tb-edit-actions"><button data-stack-up>↑</button><button data-stack-down>↓</button><button data-stack-toggle>On/Off</button><button data-stack-remove>Remove</button><button data-stack-bake>Bake</button><button data-stack-delete>Delete Stack</button></div></div>';
  }

  function arrayRuntime(){return window.TubeBenderAssociativeArrays??null;}
  function createArrayFromSelection(body){
    const tubes=selectedWholeTubes();
    if(!tubes.length){toast("Для Array выберите одну или несколько исходных целых труб");return false;}
    const runtime=arrayRuntime();
    if(!runtime?.addArray){toast("Associative Array runtime ещё не загружен");return false;}
    const type=$("[data-array-type]",body).value;
    let parameters;
    try{
      if(type==="Linear"){
        const count=Math.trunc(Number($("[data-array-count]",body).value));
        const step=Number($("[data-array-step]",body).value.replace(",","."));
        const axis=$("[data-array-axis]",body).value;
        const direction=axis==="X"?{x:1,y:0,z:0}:axis==="Y"?{x:0,y:1,z:0}:{x:0,y:0,z:1};
        parameters={count,step,direction};
      }else if(type==="Matrix"){
        const counts=["x","y","z"].map((a)=>Math.trunc(Number($("[data-array-n"+a+"]",body).value)));
        const steps=["x","y","z"].map((a)=>Number($("[data-array-s"+a+"]",body).value.replace(",",".")));
        parameters={counts,steps,directions:[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}]};
      }else{
        const count=Math.trunc(Number($("[data-array-count]",body).value));
        const total_angle_deg=Number($("[data-array-total]",body).value.replace(",","."));
        const axisName=$("[data-array-axis]",body).value;
        const axis=axisName==="X"?{x:1,y:0,z:0}:axisName==="Y"?{x:0,y:1,z:0}:{x:0,y:0,z:1};
        const center={
          x:Number($("[data-array-cx]",body).value.replace(",",".")),
          y:Number($("[data-array-cy]",body).value.replace(",",".")),
          z:Number($("[data-array-cz]",body).value.replace(",","."))
        };
        const rotate_elements=$("[data-array-rotate]",body).checked;
        parameters={count,total_angle_deg,axis,center,rotate_elements};
      }
      const name=$("[data-array-name]",body).value.trim()||type+" Array";
      return commit("Создать ассоциативный массив",()=>{
        runtime.addArray({
          type,
          name,
          source_tube_ids:tubes.map((t)=>String(t.id)),
          parameters
        },project());
        return true;
      });
    }catch(error){toast(error.message);return false;}
  }
  function arrayAction(body,action){
    const runtime=arrayRuntime(),id=$("[data-array-existing]",body)?.value;
    if(!runtime||!id){toast("Выберите существующий Array");return false;}
    if(action==="break"){
      return commit("Разорвать ассоциативный массив",()=>{runtime.breakArray(id,project());return true;});
    }
    const index=Math.trunc(Number($("[data-array-member-index]",body)?.value));
    if(!(index>0)){toast("Member index должен быть больше 0; source member имеет индекс 0");return false;}
    return commit(action==="suppress"?"Suppress Array member":"Restore Array member",()=>{
      runtime.suppressMember(id,index,action==="suppress",project());
      return true;
    });
  }
  function arrayPanelHtml(){
    const defs=arrayRuntime()?.definitions?.()??[];
    const existing='<option value="">—</option>'+defs.map((d)=>'<option value="'+esc(d.id)+'">'+esc(d.name)+" · "+esc(d.type)+" · "+esc(d.status??"")+'</option>').join("");
    return '<div class="tb-edit-card"><b>Associative Array</b><div class="tb-edit-grid" style="margin-top:8px">'+
      '<label>Name</label><input data-array-name value="Array">'+
      '<label>Type</label><select data-array-type><option>Linear</option><option>Matrix</option><option>Circular</option></select>'+
      '<label>Count</label><input data-array-count value="3">'+
      '<label>Step, mm</label><input data-array-step value="100">'+
      '<label>Axis</label><select data-array-axis><option>X</option><option>Y</option><option>Z</option></select>'+
      '<label>Matrix Nx</label><input data-array-nx value="2"><label>Matrix Ny</label><input data-array-ny value="2"><label>Matrix Nz</label><input data-array-nz value="1">'+
      '<label>Matrix Sx, mm</label><input data-array-sx value="100"><label>Matrix Sy, mm</label><input data-array-sy value="100"><label>Matrix Sz, mm</label><input data-array-sz value="100">'+
      '<label>Total angle, °</label><input data-array-total value="360">'+
      '<label>Center X</label><input data-array-cx value="0"><label>Center Y</label><input data-array-cy value="0"><label>Center Z</label><input data-array-cz value="0">'+
      '<label>Rotate elements</label><input data-array-rotate type="checkbox" checked>'+
      '</div><div class="tb-edit-note" style="margin-top:8px">Source member остаётся исходной трубой. Производные members пересобираются из source перед renderAll и защищены от прямого редактирования.</div>'+
      '<div class="tb-edit-actions"><button data-array-create>Создать Array</button></div></div>'+
      '<div class="tb-edit-card" style="margin-top:8px"><b>Управление массивом</b><div class="tb-edit-grid" style="margin-top:8px"><label>Array</label><select data-array-existing>'+existing+'</select><label>Member index</label><input data-array-member-index value="1"></div>'+
      '<div class="tb-edit-actions"><button data-array-suppress>Suppress</button><button data-array-restore>Restore</button><button data-array-break>Break Array</button></div></div>';
  }

  function injectStyles(){
    if(document.getElementById("tbEditingUiStyles"))return;
    const s=document.createElement("style");s.id="tbEditingUiStyles";s.textContent=`
#tbEditingButton{border:1px solid rgba(255,255,255,.14);border-radius:6px;background:#233244;color:#eef5ff;padding:6px 9px;cursor:pointer;font:600 12px system-ui}
#tbEditingButton.tb-fixed{position:fixed;right:116px;bottom:100px;z-index:120240}
#tbEditingPanel{position:fixed;z-index:120321;right:16px;top:86px;width:min(440px,calc(100vw - 32px));display:none;flex-direction:column;background:#101923;color:#edf4fb;border:1px solid #43546a;border-radius:9px;box-shadow:0 16px 45px rgba(0,0,0,.55);font:12px system-ui}
#tbEditingPanel.open{display:flex}.tb-edit-head{display:flex;align-items:center;padding:9px 10px;border-bottom:1px solid #2c3948}.tb-edit-head .sp{flex:1}.tb-edit-head button,.tb-edit-tools button,.tb-edit-actions button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:5px;padding:5px 8px;cursor:pointer}
.tb-edit-tools{display:flex;flex-wrap:wrap;gap:5px;padding:8px;border-bottom:1px solid #293746}.tb-edit-tools button.active{background:#3b5570;color:#fff}.tb-edit-tools button[disabled]{opacity:.45;cursor:not-allowed}
.tb-edit-body{padding:10px}.tb-edit-card{border:1px solid #304154;border-radius:7px;padding:9px}.tb-edit-grid{display:grid;grid-template-columns:130px 1fr;gap:7px 9px;align-items:center}.tb-edit-grid input,.tb-edit-grid select{background:#0b131c;color:#fff;border:1px solid #40536a;border-radius:5px;padding:6px}.tb-edit-note{color:#9fafbf;line-height:1.45}.tb-edit-actions{display:flex;gap:6px;justify-content:flex-end;margin-top:9px}
`;document.head.appendChild(s);
  }
  function ensureShell(){
    if(panel)return panel;
    injectStyles();
    button=document.createElement("button");button.id="tbEditingButton";button.type="button";button.textContent="Редактирование";button.onclick=()=>open();
    const host=document.querySelector(".tb-head-actions");
    if(host)host.appendChild(button);else{button.classList.add("tb-fixed");document.body.appendChild(button);}
    panel=document.createElement("section");panel.id="tbEditingPanel";
    panel.innerHTML='<div class="tb-edit-head"><b>Редактирование</b><span class="sp"></span><button data-edit-close>×</button></div>'+
      '<div class="tb-edit-tools">'+
      '<button data-tool="copy">Copy</button><button data-tool="move">Move</button><button data-tool="split">Split</button>'+
      '<button data-tool="rotate">Rotate</button><button data-tool="mirror">Mirror</button>'+
      '<button data-tool="array">Array</button><button data-tool="stack">Transform Stack</button>'+
      '</div><div class="tb-edit-body"></div>';
    document.body.appendChild(panel);
    $("[data-edit-close]",panel).onclick=close;
    $(".tb-edit-tools",panel).onclick=(e)=>{const b=e.target.closest("[data-tool]");if(!b||b.disabled)return;activeTool=b.dataset.tool;render();};
    return panel;
  }
  function open(){ensureShell().classList.add("open");render();}
  function close(){panel?.classList.remove("open");}
  function render(){
    if(!panel||!straightRun)return;
    $$(".tb-edit-tools button",panel).forEach((b)=>b.classList.toggle("active",b.dataset.tool===activeTool));
    const body=$(".tb-edit-body",panel);
    if(activeTool==="copy"){
      const count=selectedWholeTubes().length;
      body.innerHTML='<div class="tb-edit-card"><b>Copy</b><div class="tb-edit-note" style="margin-top:7px">Выбрано целых труб: '+count+'. Копия получает независимый ID, новый набор element IDs, снимает внешние geometry links и освобождает P2.</div><div class="tb-edit-actions"><button data-copy-run>Копировать</button></div></div>';
      $("[data-copy-run]",body).onclick=copySelection;
    }else if(activeTool==="move"){
      body.innerHTML='<div class="tb-edit-card"><b>Move</b><div class="tb-edit-grid" style="margin-top:8px"><label>ΔX, мм</label><input data-edit-dx value="0"><label>ΔY, мм</label><input data-edit-dy value="0"><label>ΔZ, мм</label><input data-edit-dz value="0"></div><div class="tb-edit-actions"><button data-move-run>Переместить</button></div></div>';
      $("[data-move-run]",body).onclick=()=>moveSelection(body);
    }else if(activeTool==="split"){
      const selected=selectedSingleLine(),nodes=selected?.row?.straightRun?.nodes_mm??[];
      body.innerHTML='<div class="tb-edit-card"><b>Split Straight</b><div class="tb-edit-grid" style="margin-top:8px"><label>Режим</label><select data-split-mode><option value="start">Расстояние от начала</option><option value="end">Расстояние от конца</option><option value="equal">N равных частей</option><option value="percent">Позиция, %</option></select><label>Значение</label><input data-split-value value="50"></div><div class="tb-edit-note" style="margin-top:8px">Внутренние узлы: '+esc(nodes.length?nodes.join(", ")+" мм":"нет")+'. LINE остаётся одним производственным StraightRun.</div><div class="tb-edit-actions"><button data-split-run>Разделить</button></div></div>';
      $("[data-split-run]",body).onclick=()=>splitSelected(body);
    }else if(activeTool==="rotate"){
      body.innerHTML='<div class="tb-edit-card"><b>Rotate</b><div class="tb-edit-grid" style="margin-top:8px">'+
        '<label>Ось</label><select data-rotate-axis><option>X</option><option>Y</option><option>Z</option></select>'+
        '<label>Угол, °</label><input data-rotate-angle value="90">'+
        '<label>Центр</label><select data-rotate-center-mode><option value="global">Global 0,0,0</option><option value="own">Origin каждой трубы</option><option value="custom">Заданный XYZ</option></select>'+
        '<label>Center X</label><input data-rotate-cx value="0"><label>Center Y</label><input data-rotate-cy value="0"><label>Center Z</label><input data-rotate-cz value="0">'+
        '</div><div class="tb-edit-note" style="margin-top:8px">Rigid-body Rotate сохраняет длины, CLR и углы гибов; TubeBender пересчитывает только origin/startVector и legacy plane/rot.</div>'+
        '<div class="tb-edit-actions"><button data-rotate-run>Повернуть</button></div></div>';
      $("[data-rotate-run]",body).onclick=()=>rotateSelection(body);
    }else if(activeTool==="mirror"){
      body.innerHTML=mirrorPanelHtml();
      $("[data-mirror-create]",body).onclick=()=>createMirrorFromSelection(body);
      $("[data-mirror-break]",body).onclick=()=>mirrorAction(body,"break");
      $("[data-mirror-delete]",body).onclick=()=>mirrorAction(body,"delete");
    }else if(activeTool==="stack"){
      body.innerHTML=stackPanelHtml();
      $("[data-stack-create]",body).onclick=createTransformStackFromSelection;
      $("[data-stack-add-move]",body).onclick=()=>stackAddOperation(body,"Move");
      $("[data-stack-add-rotate]",body).onclick=()=>stackAddOperation(body,"Rotate");
      $("[data-stack-add-mirror]",body).onclick=()=>stackAddOperation(body,"Mirror");
      $("[data-stack-up]",body).onclick=()=>stackOperationAction(body,"up");
      $("[data-stack-down]",body).onclick=()=>stackOperationAction(body,"down");
      $("[data-stack-toggle]",body).onclick=()=>stackOperationAction(body,"toggle");
      $("[data-stack-remove]",body).onclick=()=>stackOperationAction(body,"remove");
      $("[data-stack-bake]",body).onclick=()=>stackOperationAction(body,"bake");
      $("[data-stack-delete]",body).onclick=()=>stackOperationAction(body,"delete");
    }else if(activeTool==="array"){
      body.innerHTML=arrayPanelHtml();
      $("[data-array-create]",body).onclick=()=>createArrayFromSelection(body);
      $("[data-array-suppress]",body).onclick=()=>arrayAction(body,"suppress");
      $("[data-array-restore]",body).onclick=()=>arrayAction(body,"restore");
      $("[data-array-break]",body).onclick=()=>arrayAction(body,"break");
    }
  }
  async function install(){
    if(installed)return;installed=true;
    try{[straightRun,rigidTransform]=await Promise.all([import(STRAIGHT_RUN_URL),import(RIGID_TRANSFORM_URL)]);}catch(error){console.error("Editing UI failed to load",error);return;}
    ensureShell();
    window.addEventListener("tubebender-selection-change",()=>{if(panel?.classList.contains("open"))render();});
    window.TubeBenderEditing=Object.freeze({open,close,copySelection,moveSelection:()=>context()?.applyMove,splitSelected,rotateSelection,createMirrorFromSelection,mirrorAction,createArrayFromSelection,arrayAction,createTransformStackFromSelection,stackAddOperation,stackOperationAction,refresh:render});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();