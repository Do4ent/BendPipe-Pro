import { repairRoundedTubeContinuity } from "./editable-tube-integrity.mjs";

function clone(value){
  return value==null ? value : JSON.parse(JSON.stringify(value));
}

function finitePositive(value){
  const n=Number(value);
  return Number.isFinite(n)&&n>0?n:null;
}

function sourceOuterDiameter(tube,catalog){
  const normalized=finitePositive(
    tube?.importEvidence?.diameterNormalization?.table_outer_diameter_mm
  );
  if(normalized!=null)return normalized;

  const index=Number(tube?.diameterIndex);
  if(Number.isInteger(index)&&index>=0&&index<catalog.length){
    const mm=finitePositive(catalog[index]?.mm);
    if(mm!=null)return mm;
  }

  const candidates=[
    tube?.importEvidence?.recognitionSummary?.dimension_reconciliation?.derived_outer_diameter_mm,
    tube?.importEvidence?.metadata?.outer_diameter_mm,
    tube?.importEvidence?.metadata?.outer_diameter?.value,
    tube?.metadata?.outer_diameter_mm,
    tube?.outerDiameterMm,
    tube?.outer_diameter_mm
  ];
  for(const value of candidates){
    const n=finitePositive(value);
    if(n!=null)return n;
  }
  return null;
}

function canonicalClrs(tube){
  const primitives=tube?.importEvidence?.canonicalGeometry?.primitives??[];
  return primitives
    .filter((primitive)=>primitive?.type==="BEND")
    .map((primitive)=>finitePositive(
      primitive?.clr?.value??primitive?.clr_mm??primitive?.clr
    ))
    .filter((value)=>value!=null);
}

function bendRows(tube){
  return (tube?.rows??[])
    .map((row,index)=>({row,index}))
    .filter(({row})=>row?.type==="BEND");
}

function technologicalRows(catalog,diameterMm,odTolerance){
  return (catalog??[])
    .map((tool,index)=>({
      index,
      tooling_id:tool?.id==null?null:String(tool.id),
      outer_diameter_mm:finitePositive(tool?.mm),
      centerline_radius_mm:finitePositive(tool?.Rb)
    }))
    .filter((tool)=>
      tool.outer_diameter_mm!=null&&
      tool.centerline_radius_mm!=null&&
      Math.abs(tool.outer_diameter_mm-diameterMm)<=odTolerance
    );
}

function chooseCommonRadius(rows,sourceClrs){
  const ranked=rows.map((tool)=>{
    const errors=sourceClrs.map((clr)=>
      Math.abs(clr-tool.centerline_radius_mm)
    );
    return {
      ...tool,
      max_error_mm:Math.max(...errors),
      total_error_mm:errors.reduce((sum,value)=>sum+value,0),
      errors
    };
  });
  ranked.sort((a,b)=>
    a.max_error_mm-b.max_error_mm||
    a.total_error_mm-b.total_error_mm||
    a.centerline_radius_mm-b.centerline_radius_mm||
    a.index-b.index
  );
  return ranked[0]??null;
}

/**
 * Normalize recognized bend CLR to one technologically available tooling radius.
 *
 * The canonical/source CLR evidence is never modified. This function only
 * changes editable rows and keeps tube-level tooling unresolved: selecting and
 * confirming production tooling remains an explicit user action.
 */
export function normalizeImportedTubeBendRadiiToTechnology(
  tube,
  toolingCatalog,
  {od_tolerance_mm=0.02}={}
){
  if(!tube||typeof tube!=="object")throw new TypeError("tube is required");
  if(!Array.isArray(toolingCatalog))throw new TypeError("toolingCatalog must be an array");
  const odTolerance=Number(od_tolerance_mm);
  if(!Number.isFinite(odTolerance)||odTolerance<0){
    throw new RangeError("od_tolerance_mm must be non-negative");
  }

  const out=clone(tube);
  const bends=bendRows(out);
  if(!bends.length){
    return Object.freeze({
      status:"no_bends",
      tube:out,
      normalization:Object.freeze({
        status:"no_bends",
        source_geometry_preserved:true,
        tooling_selected:false,
        production_ready:false
      }),
      changed_count:0,
      production_ready:false
    });
  }

  const diameterMm=sourceOuterDiameter(out,toolingCatalog);
  if(diameterMm==null){
    const normalization=Object.freeze({
      status:"unresolved",
      source_outer_diameter_mm:null,
      available_radii_mm:Object.freeze([]),
      target_clr_mm:null,
      source_geometry_preserved:true,
      tooling_selected:false,
      production_ready:false,
      reason:"No normalized or recognized tube diameter is available for technological CLR correction."
    });
    out.importEvidence={
      ...(out.importEvidence??{}),
      technologicalRadiusNormalization:normalization
    };
    return Object.freeze({
      status:"unresolved",
      tube:out,
      normalization,
      changed_count:0,
      production_ready:false
    });
  }

  const candidates=technologicalRows(
    toolingCatalog,
    diameterMm,
    odTolerance
  );
  if(!candidates.length){
    const normalization=Object.freeze({
      status:"unresolved",
      source_outer_diameter_mm:diameterMm,
      available_radii_mm:Object.freeze([]),
      target_clr_mm:null,
      source_geometry_preserved:true,
      tooling_selected:false,
      production_ready:false,
      reason:"No technological tooling radius is defined for the normalized tube diameter."
    });
    out.importEvidence={
      ...(out.importEvidence??{}),
      technologicalRadiusNormalization:normalization
    };
    return Object.freeze({
      status:"unresolved",
      tube:out,
      normalization,
      changed_count:0,
      production_ready:false
    });
  }

  const editableBefore=bends.map(({row})=>finitePositive(row?.clr));
  if(editableBefore.some((value)=>value==null)){
    const normalization=Object.freeze({
      status:"unresolved",
      source_outer_diameter_mm:diameterMm,
      available_radii_mm:Object.freeze(
        [...new Set(candidates.map((item)=>item.centerline_radius_mm))]
      ),
      target_clr_mm:null,
      source_geometry_preserved:true,
      tooling_selected:false,
      production_ready:false,
      reason:"One or more editable bends have no positive CLR."
    });
    out.importEvidence={
      ...(out.importEvidence??{}),
      technologicalRadiusNormalization:normalization
    };
    return Object.freeze({
      status:"unresolved",
      tube:out,
      normalization,
      changed_count:0,
      production_ready:false
    });
  }

  const canonical=canonicalClrs(out);
  const sourceForSelection=
    canonical.length===bends.length
      ? canonical
      : editableBefore;
  const selected=chooseCommonRadius(candidates,sourceForSelection);
  if(!selected)throw new Error("technological radius selection failed");

  const target=selected.centerline_radius_mm;
  const changes=[];
  bends.forEach(({row,index},bendIndex)=>{
    const before=finitePositive(row.clr);
    const sourceCanonical=
      canonical.length===bends.length?canonical[bendIndex]:null;
    row.clr=target;
    row.clrSource="technology_table_normalization";
    row.clrToolingId=null;
    if(Math.abs(before-target)>1e-12){
      changes.push(Object.freeze({
        row_index:index,
        bend_index:bendIndex,
        recognized_clr_mm:sourceCanonical,
        editable_clr_before_mm:before,
        technological_clr_mm:target,
        delta_from_editable_mm:target-before,
        delta_from_recognized_mm:
          sourceCanonical==null?null:target-sourceCanonical
      }));
    }
  });

  // Align the legacy diameter/tool row with the selected technological radius,
  // but deliberately do not resolve the stable tooling assignment.
  out.diameterIndex=selected.index;
  out.toolingId=null;
  out.toolingUnresolved=true;

  const normalization=Object.freeze({
    status:changes.length?"corrected":"already_technological",
    source_outer_diameter_mm:diameterMm,
    target_outer_diameter_mm:selected.outer_diameter_mm,
    target_clr_mm:target,
    selected_catalog_index:selected.index,
    candidate_tooling_id:selected.tooling_id,
    available_radii_mm:Object.freeze(
      [...new Set(candidates.map((item)=>item.centerline_radius_mm))]
        .sort((a,b)=>a-b)
    ),
    recognized_clrs_mm:Object.freeze([...sourceForSelection]),
    editable_clrs_before_mm:Object.freeze([...editableBefore]),
    max_source_deviation_mm:selected.max_error_mm,
    total_source_deviation_mm:selected.total_error_mm,
    rule:"single_common_nearest_available_radius_minimax",
    source_geometry_preserved:true,
    editable_geometry_changed:changes.length>0,
    tooling_selected:false,
    machine_compensation_applied:false,
    changes:Object.freeze(changes),
    production_ready:false
  });

  out.importEvidence={
    ...(out.importEvidence??{}),
    technologicalRadiusNormalization:normalization
  };
  const issues=Array.isArray(out.importValidation?.issues)
    ? [...out.importValidation.issues]
    : [];
  if(changes.length){
    const message=
      "Recognized bend CLR normalized to technological R"+
      target+" mm for Ø"+selected.outer_diameter_mm+" mm.";
    if(!issues.includes(message))issues.push(message);
  }
  out.importValidation={
    ...(out.importValidation??{}),
    productionBlocked:true,
    toolingResolved:false,
    technologicalRadiusNormalized:true,
    technologicalRadiusMm:target,
    technologicalRadiusChanged:changes.length>0,
    issues
  };

  const repaired=repairRoundedTubeContinuity(out);
  if(repaired.status!=="continuous_tube"||!repaired.tube){
    return Object.freeze({
      status:"blocked",
      tube:null,
      normalization,
      changed_count:changes.length,
      blocker:
        repaired.blocker??
        "Technological CLR normalization failed editable continuity repair.",
      production_ready:false
    });
  }

  return Object.freeze({
    status:normalization.status,
    tube:repaired.tube,
    normalization,
    integrity:repaired.integrity,
    changed_count:changes.length,
    production_ready:false
  });
}

export function normalizeImportedProjectBendRadiiToTechnology(
  project,
  toolingCatalog,
  options={}
){
  if(!project||typeof project!=="object")throw new TypeError("project is required");
  if(!Array.isArray(toolingCatalog))throw new TypeError("toolingCatalog must be an array");

  const out=clone(project);
  out.tubes=Array.isArray(out.tubes)?out.tubes:[];
  let normalizedCount=0;
  let changedCount=0;
  let unresolvedCount=0;
  let blockedCount=0;

  out.tubes=out.tubes.map((tube)=>{
    const isDwfx=
      String(tube?.importEvidence?.source?.format??"").toLowerCase()==="dwfx"||
      !!tube?.importEvidence?.canonicalGeometry;
    if(!isDwfx)return tube;
    const result=normalizeImportedTubeBendRadiiToTechnology(
      tube,
      toolingCatalog,
      options
    );
    if(result.status==="blocked"){
      blockedCount+=1;
      return tube;
    }
    if(result.status==="unresolved"){
      unresolvedCount+=1;
      return result.tube;
    }
    if(result.status==="corrected"||result.status==="already_technological"){
      normalizedCount+=1;
      changedCount+=result.changed_count;
    }
    return result.tube;
  });

  return Object.freeze({
    status:blockedCount?"partial":
      normalizedCount?"normalized":
      unresolvedCount?"unresolved":"no_change",
    project:out,
    normalized_count:normalizedCount,
    changed_count:changedCount,
    unresolved_count:unresolvedCount,
    blocked_count:blockedCount,
    production_ready:false
  });
}
