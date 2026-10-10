(()=>{
  const STACK_URL="__TB_TRANSFORM_STACK_MODULE_URL__";
  let stackDomain=null,installed=false,syncing=false;
  const api=()=>window.TubeBenderEngineering??null;
  const project=()=>{try{return api()?.activeProject?.()??null;}catch{return null;}};
  const clone=(v)=>v==null?v:structuredClone(v);
  const byId=(p,id)=>(p?.tubes??[]).find((t)=>String(t?.id)===String(id))??null;
  function definitions(p=project()){
    if(!p)return [];
    if(!Array.isArray(p.associative_transform_stacks))p.associative_transform_stacks=[];
    return p.associative_transform_stacks;
  }
  function definitionById(id,p=project()){
    return definitions(p).find((d)=>String(d?.id)===String(id))??null;
  }
  function definitionForTube(tubeId,p=project()){
    return definitions(p).find((d)=>String(d?.object_id)===String(tubeId))??null;
  }
  function replaceTube(target,next){
    const visibility={
      uiHiddenIn3D:target?.uiHiddenIn3D===true,
      uiTransparentIn3D:target?.uiTransparentIn3D===true
    };
    const id=target?.id,name=target?.name;
    for(const key of Object.keys(target))delete target[key];
    Object.assign(target,clone(next));
    if(id!=null)target.id=id;
    if(name!=null)target.name=name;
    target.uiHiddenIn3D=visibility.uiHiddenIn3D;
    target.uiTransparentIn3D=visibility.uiTransparentIn3D;
    target.transform_stack_member={stack_id:String(target.transform_stack?.id??""),derived_readonly:true,status:"Valid"};
  }
  function createForTube(tubeId,p=project()){
    if(!p)throw new Error("No active project");
    const tube=byId(p,tubeId);
    if(!tube)throw new Error("Tube not found");
    if(definitionForTube(tubeId,p))throw new Error("Tube already has an associative transform stack");
    const stack=stackDomain.createTubeTransformStack(tube);
    const def=clone(stack);
    definitions(p).push(def);
    synchronize(p);
    return clone(def);
  }
  function mutateStack(stackId,mutator,p=project()){
    if(!p)throw new Error("No active project");
    const defs=definitions(p);
    const index=defs.findIndex((d)=>String(d?.id)===String(stackId));
    if(index<0)throw new Error("Transform stack not found");
    const next=mutator(clone(defs[index]));
    defs[index]=clone(next);
    synchronize(p);
    return clone(defs[index]);
  }
  function appendMove(stackId,delta,p=project()){
    return mutateStack(stackId,(stack)=>stackDomain.appendTransformOperation(stack,stackDomain.createMoveOperation(delta)),p);
  }
  function appendRotate(stackId,input,p=project()){
    return mutateStack(stackId,(stack)=>stackDomain.appendTransformOperation(stack,stackDomain.createRotateOperation(input)),p);
  }
  function appendMirror(stackId,input,p=project()){
    return mutateStack(stackId,(stack)=>stackDomain.appendTransformOperation(stack,stackDomain.createMirrorOperation(input)),p);
  }
  function removeOperation(stackId,operationId,p=project()){
    return mutateStack(stackId,(stack)=>stackDomain.removeTransformOperation(stack,operationId),p);
  }
  function reorderOperation(stackId,fromIndex,toIndex,p=project()){
    return mutateStack(stackId,(stack)=>stackDomain.reorderTubeTransformOperation(stack,fromIndex,toIndex),p);
  }
  function setOperationEnabled(stackId,operationId,enabled,p=project()){
    return mutateStack(stackId,(stack)=>stackDomain.setTransformOperationEnabled(stack,operationId,enabled),p);
  }
  function bake(stackId,p=project()){
    if(!p)throw new Error("No active project");
    const defs=definitions(p);
    const index=defs.findIndex((d)=>String(d?.id)===String(stackId));
    if(index<0)throw new Error("Transform stack not found");
    const def=defs[index];
    const tube=byId(p,def.object_id);
    if(!tube)throw new Error("Transform stack source tube not found");
    const result=stackDomain.bakeTubeTransformStack(def);
    if(result.status!=="exact"||!result.tube)throw new Error(result.reason||"Transform stack bake failed");
    const baked=clone(result.tube);
    baked.id=tube.id;
    baked.name=tube.name;
    delete baked.transform_stack_member;
    replaceTube(tube,baked);
    delete tube.transform_stack_member;
    defs.splice(index,1);
    return clone(result);
  }
  function deleteStack(stackId,{restoreBase=true}={},p=project()){
    if(!p)throw new Error("No active project");
    const defs=definitions(p);
    const index=defs.findIndex((d)=>String(d?.id)===String(stackId));
    if(index<0)return false;
    const def=defs[index],tube=byId(p,def.object_id);
    if(tube&&restoreBase!==false){
      const base=clone(def.base_tube);
      base.id=tube.id;base.name=tube.name;
      replaceTube(tube,base);
      delete tube.transform_stack_member;
      delete tube.transform_stack;
      delete tube.transform_stack_state;
      delete tube.transform_stack_fingerprint;
    }
    defs.splice(index,1);
    return true;
  }
  function synchronize(p=project()){
    if(!p||!stackDomain||syncing)return {ok:true,changed:false};
    syncing=true;
    try{
      let changed=false;
      for(const def of definitions(p)){
        const tube=byId(p,def.object_id);
        if(!tube){def.state="LostSource";continue;}
        const result=stackDomain.applyTubeTransformStack(def);
        if(result.status!=="exact"||!result.tube){
          def.state="Error";
          def.error=String(result.reason??"Transform stack evaluation failed");
          continue;
        }
        const next=clone(result.tube);
        next.id=tube.id;next.name=tube.name;
        const before=JSON.stringify(tube);
        replaceTube(tube,next);
        if(JSON.stringify(tube)!==before)changed=true;
        def.state="Valid";
        delete def.error;
      }
      return {ok:true,changed};
    }finally{syncing=false;}
  }
  function summary(stackId,p=project()){
    const def=definitionById(stackId,p);
    return def?stackDomain.summarizeTransformStack(def):null;
  }
  function isStackTube(tube){return tube?.transform_stack_member?.derived_readonly===true;}
  async function install(){
    if(installed)return;installed=true;
    stackDomain=await import(STACK_URL);
    try{synchronize();}catch(error){console.warn("Associative Transform Stack sync:",error);}
    if(typeof renderAll==="function"&&!renderAll._tbTransformStacks){
      const original=renderAll;
      renderAll=function(...args){
        try{synchronize();}catch(error){console.warn("Associative Transform Stack sync:",error);}
        return original.apply(this,args);
      };
      renderAll._tbTransformStacks=true;
    }
    window.TubeBenderTransformStacks=Object.freeze({
      definitions:()=>definitions(),
      definitionById:(id)=>definitionById(id),
      definitionForTube:(id)=>definitionForTube(id),
      createForTube,appendMove,appendRotate,appendMirror,removeOperation,reorderOperation,
      setOperationEnabled,bake,deleteStack,synchronize,summary,isStackTube
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});
  else install().catch(console.error);
})();