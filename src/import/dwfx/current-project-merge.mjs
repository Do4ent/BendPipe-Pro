function clone(value){
  return value==null ? value : JSON.parse(JSON.stringify(value));
}

function nameKey(value){
  return String(value??"").trim().toLocaleLowerCase();
}

function uniqueCopyName(base,usedKeys){
  const root=String(base??"").trim()||"Imported tube";
  let candidate=root+" copy";
  let index=2;
  while(usedKeys.has(nameKey(candidate))){
    candidate=root+" copy "+index;
    index+=1;
  }
  return candidate;
}

function nextId(preferred,usedIds,makeId){
  let candidate=String(preferred??"").trim();
  if(candidate&&!usedIds.has(candidate)) return candidate;
  if(typeof makeId!=="function"){
    throw new RangeError("make_id is required when an imported tube ID is missing or conflicts");
  }
  for(let attempt=0;attempt<1000;attempt+=1){
    candidate=String(makeId()).trim();
    if(candidate&&!usedIds.has(candidate)) return candidate;
  }
  throw new RangeError("make_id did not produce a unique tube ID");
}

function editableImportedTube(source,{usedIds,usedNames,makeId,sourceFile}){
  const tube=clone(source);
  if(!tube||typeof tube!=="object") throw new TypeError("imported tube must be an object");
  if(!Array.isArray(tube.rows)||tube.rows.length===0){
    throw new RangeError("imported DWFx tube must contain editable rows");
  }

  tube.id=nextId(tube.id,usedIds,makeId);
  usedIds.add(tube.id);

  const name=String(tube.name??tube.partNumber??"Imported tube").trim()||"Imported tube";
  tube.name=name;
  usedNames.add(nameKey(name));

  tube.toolingId=null;
  tube.toolingUnresolved=true;
  tube.diameterIndex=null;
  tube.importValidation={
    ...(tube.importValidation&&typeof tube.importValidation==="object"
      ? tube.importValidation
      : {}),
    productionBlocked:true,
    toolingResolved:false,
    productionSettingsConfirmed:false,
    importedIntoCurrentProject:true
  };
  tube.currentProjectImport={
    source_format:"DWFx",
    source_file:String(
      sourceFile ??
      tube.importEvidence?.source?.file ??
      ""
    ),
    geometry_source:"recognized_canonical_geometry",
    machine_compensation_applied:false
  };
  return tube;
}

/**
 * Merge selected editable DWFx tubes into one existing TubeBender project.
 *
 * The operation is pure: neither the target project nor imported projects are
 * mutated. Tooling stays unresolved and production blocked by construction.
 */
export function mergeDwfxTubesIntoCurrentProject({
  project,
  imported_projects,
  conflict="copy",
  make_id=null,
  source_file=null
}){
  if(!project||typeof project!=="object"){
    throw new TypeError("current project is required");
  }
  if(!Array.isArray(imported_projects)){
    throw new TypeError("imported_projects must be an array");
  }
  if(!["copy","replace","skip"].includes(conflict)){
    throw new RangeError("conflict must be copy, replace or skip");
  }

  const target=clone(project);
  target.tubes=Array.isArray(target.tubes)?target.tubes:[];

  const usedIds=new Set(
    target.tubes
      .map((tube)=>String(tube?.id??"").trim())
      .filter(Boolean)
  );
  const usedNames=new Set(
    target.tubes.map((tube)=>nameKey(tube?.name)).filter(Boolean)
  );

  const imported=[];
  const skipped=[];
  const replaced=[];

  for(const importedProject of imported_projects){
    for(const sourceTube of importedProject?.tubes??[]){
      const originalName=
        String(sourceTube?.name??sourceTube?.partNumber??"Imported tube").trim()||
        "Imported tube";
      const key=nameKey(originalName);
      const existingIndexes=[];
      target.tubes.forEach((tube,index)=>{
        if(nameKey(tube?.name)===key) existingIndexes.push(index);
      });

      if(existingIndexes.length&&conflict==="skip"){
        skipped.push(originalName);
        continue;
      }

      if(existingIndexes.length&&conflict==="replace"){
        for(let i=existingIndexes.length-1;i>=0;i-=1){
          const [removed]=target.tubes.splice(existingIndexes[i],1);
          if(removed?.id) usedIds.delete(String(removed.id));
          if(removed?.name) usedNames.delete(nameKey(removed.name));
        }
        replaced.push(originalName);
      }

      const materialized=editableImportedTube(sourceTube,{
        usedIds,
        usedNames,
        makeId:make_id,
        sourceFile:source_file
      });

      if(existingIndexes.length&&conflict==="copy"){
        usedNames.delete(nameKey(materialized.name));
        materialized.name=uniqueCopyName(originalName,usedNames);
        usedNames.add(nameKey(materialized.name));
      }

      target.tubes.push(materialized);
      imported.push(materialized);
    }
  }

  return Object.freeze({
    status:imported.length?"merged":"no_change",
    project:target,
    imported_count:imported.length,
    skipped_count:skipped.length,
    replaced_count:replaced.length,
    imported_tube_ids:Object.freeze(imported.map((tube)=>tube.id)),
    imported_tube_names:Object.freeze(imported.map((tube)=>tube.name)),
    skipped_names:Object.freeze(skipped),
    replaced_names:Object.freeze(replaced),
    production_ready:false,
    blocker:
      imported.length
        ?"Recognized DWFx geometry was merged as editable tubes; tooling and production release remain unresolved."
        :"No selected DWFx tubes were added to the current project."
  });
}
