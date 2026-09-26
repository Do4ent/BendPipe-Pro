import { normalizeImportedTubeDiameterToCatalog } from "./table-diameter-normalization.mjs";

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
  source_file=null,
  diameter_catalog=null,
  diameter_rounding_tolerance_mm=0.35
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
  target.referenceScenes=Array.isArray(target.referenceScenes)
    ? target.referenceScenes
    : [];

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
  const importedReferenceScenes=[];
  const skippedReferenceScenes=[];
  const replacedReferenceScenes=[];
  const usedReferenceSceneIds=new Set(
    target.referenceScenes
      .map((scene)=>String(scene?.id??"").trim())
      .filter(Boolean)
  );

  const uniqueSceneId=(preferred)=>{
    const base=String(preferred??"dwfx-reference").trim()||"dwfx-reference";
    if(!usedReferenceSceneIds.has(base))return base;
    let index=2;
    while(usedReferenceSceneIds.has(base+"#"+index))index+=1;
    return base+"#"+index;
  };

  for(const importedProject of imported_projects){
    for(const sourceScene of importedProject?.referenceScenes??[]){
      if(!sourceScene||typeof sourceScene!=="object")continue;
      const scene=clone(sourceScene);
      scene.readonly=true;
      scene.production_ready=false;
      scene.canonical_ready=false;
      scene.runtime_scene_id=String(
        scene.runtime_scene_id??scene.id??""
      );
      const sourceKey=String(scene.source_file??scene.name??scene.id??"");
      const existingIndexes=[];
      target.referenceScenes.forEach((item,index)=>{
        const itemKey=String(item?.source_file??item?.name??item?.id??"");
        if(itemKey===sourceKey)existingIndexes.push(index);
      });

      if(existingIndexes.length&&conflict==="skip"){
        skippedReferenceScenes.push(sourceKey);
        continue;
      }
      if(existingIndexes.length&&conflict==="replace"){
        for(let i=existingIndexes.length-1;i>=0;i-=1){
          const [removed]=target.referenceScenes.splice(existingIndexes[i],1);
          if(removed?.id)usedReferenceSceneIds.delete(String(removed.id));
        }
        replacedReferenceScenes.push(sourceKey);
      }

      scene.id=uniqueSceneId(scene.id||"dwfx-reference");
      usedReferenceSceneIds.add(scene.id);
      target.referenceScenes.push(scene);
      importedReferenceScenes.push(scene);
    }

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

      let materialized=editableImportedTube(sourceTube,{
        usedIds,
        usedNames,
        makeId:make_id,
        sourceFile:source_file
      });
      if(Array.isArray(diameter_catalog)&&diameter_catalog.length){
        materialized=normalizeImportedTubeDiameterToCatalog(
          materialized,
          diameter_catalog,
          {recommended_tolerance_mm:diameter_rounding_tolerance_mm}
        ).tube;
      }

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
    status:(imported.length||importedReferenceScenes.length)?"merged":"no_change",
    project:target,
    imported_count:imported.length,
    imported_reference_scene_count:importedReferenceScenes.length,
    skipped_reference_scene_count:skippedReferenceScenes.length,
    replaced_reference_scene_count:replacedReferenceScenes.length,
    skipped_count:skipped.length,
    replaced_count:replaced.length,
    imported_tube_ids:Object.freeze(imported.map((tube)=>tube.id)),
    imported_tube_names:Object.freeze(imported.map((tube)=>tube.name)),
    skipped_names:Object.freeze(skipped),
    replaced_names:Object.freeze(replaced),
    imported_reference_scene_ids:Object.freeze(
      importedReferenceScenes.map((scene)=>scene.id)
    ),
    skipped_reference_scenes:Object.freeze(skippedReferenceScenes),
    replaced_reference_scenes:Object.freeze(replacedReferenceScenes),
    production_ready:false,
    blocker:
      imported.length||importedReferenceScenes.length
        ?"Recognized DWFx tubes and read-only source reference geometry were merged; tooling and production release remain unresolved."
        :"No selected DWFx tubes or reference geometry were added to the current project."
  });
}
