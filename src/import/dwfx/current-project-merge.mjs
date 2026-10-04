import { normalizeImportedTubeDiameterToCatalog } from "./table-diameter-normalization.mjs";
import { roundEditableTubeLinearDimensions } from "./editable-linear-rounding.mjs";
import { normalizeImportedTubeBendRadiiToTechnology } from "./technological-radius-normalization.mjs";

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

function tubePartNumber(tube){
  return String(
    tube?.partNumber ??
    tube?.part_number ??
    tube?.importEvidence?.part_number ??
    tube?.importEvidence?.metadata?.part_number ??
    ""
  ).trim();
}

function geometrySnapshot(tube){
  const fields=[
    "origin","startVector","startAxis","startDir","rows",
    "diameter","diameter_mm","outerDiameterMm","outer_diameter_mm","OD","OD_mm",
    "wall","wall_mm","wallThicknessMm","wall_thickness_mm"
  ];
  const snapshot={schema:"dwfx_editable_source_geometry_v1"};
  for(const key of fields){
    if(tube?.[key]!==undefined)snapshot[key]=clone(tube[key]);
  }
  return snapshot;
}

function findReferenceSourceLink(project,tube,{sourceFile=null}={}){
  const part=tubePartNumber(tube);
  if(!part)return null;
  const preferredFile=String(
    sourceFile ??
    tube?.importEvidence?.source?.file ??
    ""
  );
  const matches=[];
  const visit=(scene,node)=>{
    if(String(node?.editable_part_number??"")===part){
      matches.push({scene,node});
    }
    for(const child of node?.children??[])visit(scene,child);
  };
  for(const scene of project?.referenceScenes??[]){
    for(const root of scene?.tree??[])visit(scene,root);
  }
  if(!matches.length)return null;
  const chosen=
    matches.find(({scene})=>
      preferredFile &&
      String(scene?.source_file??scene?.name??"")===preferredFile
    ) ??
    matches[0];
  return {
    status:"linked",
    detached:false,
    scene_id:String(chosen.scene.id),
    node_id:String(chosen.node.id),
    part_number:part,
    source_label:String(chosen.node.label??chosen.node.id??part),
    source_file:String(chosen.scene.source_file??chosen.scene.name??preferredFile),
    display:"hidden"
  };
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

  const spatialOrigin=tube?.importEvidence?.spatialPlacement?.origin_mm;
  if(
    tube?.importEvidence?.spatialPlacement?.status==="exact" &&
    Array.isArray(spatialOrigin) &&
    spatialOrigin.length===3 &&
    spatialOrigin.every((value)=>Number.isFinite(Number(value)))
  ){
    tube.origin={
      x:Number(spatialOrigin[0]),
      y:Number(spatialOrigin[1]),
      z:Number(spatialOrigin[2])
    };
    tube.importEvidence={
      ...(tube.importEvidence??{}),
      spatialPlacement:{
        ...(tube.importEvidence?.spatialPlacement??{}),
        editable_origin_seeded:true,
        user_origin_override:false
      }
    };
  }

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
    part_number:tubePartNumber(tube),
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
  diameter_rounding_tolerance_mm=0.35,
  linear_rounding_increment_mm=1,
  technology_radius_od_tolerance_mm=0.02
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
      const roundedImport=roundEditableTubeLinearDimensions(
        materialized,
        {increment_mm:linear_rounding_increment_mm}
      );
      if(roundedImport.status!=="rounded"||!roundedImport.tube){
        throw new Error(
          "Imported tube "+originalName+
          " failed post-rounding continuity validation: "+
          String(roundedImport.blocker??"unknown integrity failure")
        );
      }
      materialized=roundedImport.tube;

      if(Array.isArray(diameter_catalog)&&diameter_catalog.length){
        const radiusNormalized=normalizeImportedTubeBendRadiiToTechnology(
          materialized,
          diameter_catalog,
          {od_tolerance_mm:technology_radius_od_tolerance_mm}
        );
        if(radiusNormalized.status==="blocked"||!radiusNormalized.tube){
          throw new Error(
            "Imported tube "+originalName+
            " failed technological bend-radius normalization: "+
            String(radiusNormalized.blocker??"unknown normalization failure")
          );
        }
        materialized=radiusNormalized.tube;
      }

      if(existingIndexes.length&&conflict==="copy"){
        usedNames.delete(nameKey(materialized.name));
        materialized.name=uniqueCopyName(originalName,usedNames);
        usedNames.add(nameKey(materialized.name));
      }

      const sourceLink=findReferenceSourceLink(target,materialized,{sourceFile:source_file});
      materialized.currentProjectImport={
        ...(materialized.currentProjectImport??{}),
        source_link:sourceLink,
        source_geometry_snapshot:geometrySnapshot(materialized)
      };

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
