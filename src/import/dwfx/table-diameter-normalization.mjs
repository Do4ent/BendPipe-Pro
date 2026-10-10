function clone(value){
  return value==null ? value : JSON.parse(JSON.stringify(value));
}

function finitePositive(value){
  const n=Number(value);
  return Number.isFinite(n)&&n>0?n:null;
}

function sourceDiameterEvidence(tube){
  const summary=tube?.importEvidence?.recognitionSummary;
  const reconciliation=summary?.dimension_reconciliation;
  const derived=finitePositive(reconciliation?.derived_outer_diameter_mm);
  if(derived!=null){
    return Object.freeze({
      value_mm:derived,
      source_kind:"recognized_w3d_geometry",
      source_path:"importEvidence.recognitionSummary.dimension_reconciliation.derived_outer_diameter_mm"
    });
  }

  const candidates=[
    [
      tube?.importEvidence?.metadata?.outer_diameter_mm,
      "exact_dwfx_metadata",
      "importEvidence.metadata.outer_diameter_mm"
    ],
    [
      tube?.importEvidence?.metadata?.outer_diameter?.value,
      "exact_dwfx_metadata",
      "importEvidence.metadata.outer_diameter.value"
    ],
    [
      tube?.metadata?.outer_diameter_mm,
      "metadata",
      "metadata.outer_diameter_mm"
    ],
    [
      tube?.outerDiameterMm,
      "tube_field",
      "outerDiameterMm"
    ],
    [
      tube?.outer_diameter_mm,
      "tube_field",
      "outer_diameter_mm"
    ]
  ];
  for(const [value,sourceKind,sourcePath] of candidates){
    const n=finitePositive(value);
    if(n!=null){
      return Object.freeze({
        value_mm:n,
        source_kind:sourceKind,
        source_path:sourcePath
      });
    }
  }
  return null;
}

function catalogRows(catalog){
  if(!Array.isArray(catalog))return [];
  return catalog
    .map((entry,index)=>({
      index,
      outer_diameter_mm:finitePositive(entry?.mm),
      inch:entry?.inch==null?null:String(entry.inch)
    }))
    .filter((entry)=>entry.outer_diameter_mm!=null);
}

export function nearestTableDiameter(
  source_outer_diameter_mm,
  diameter_catalog
){
  const source=finitePositive(source_outer_diameter_mm);
  if(source==null){
    return Object.freeze({
      status:"unresolved",
      source_outer_diameter_mm:null,
      table_outer_diameter_mm:null,
      table_index:null,
      error_mm:null,
      reason:"Recognized outer diameter is missing."
    });
  }

  const rows=catalogRows(diameter_catalog);
  if(!rows.length){
    return Object.freeze({
      status:"unresolved",
      source_outer_diameter_mm:source,
      table_outer_diameter_mm:null,
      table_index:null,
      error_mm:null,
      reason:"Tube diameter table is empty."
    });
  }

  rows.sort((a,b)=>{
    const da=Math.abs(a.outer_diameter_mm-source);
    const db=Math.abs(b.outer_diameter_mm-source);
    return da-db ||
      a.outer_diameter_mm-b.outer_diameter_mm ||
      a.index-b.index;
  });
  const best=rows[0];
  return Object.freeze({
    status:"nearest",
    source_outer_diameter_mm:source,
    table_outer_diameter_mm:best.outer_diameter_mm,
    table_index:best.index,
    table_inch:best.inch,
    error_mm:Math.abs(best.outer_diameter_mm-source),
    reason:"Nearest active tube-table diameter selected."
  });
}

/**
 * Normalize an imported DWFx tube to the nearest active pipe-table diameter.
 *
 * This is an explicit display/import normalization requested by the user.
 * It does NOT select tooling, does NOT change bend CLR, does NOT change wall
 * thickness, and does NOT remove the original recognized diameter evidence.
 */
export function normalizeImportedTubeDiameterToCatalog(
  tube,
  diameter_catalog,
  {recommended_tolerance_mm=0.35}={}
){
  if(!tube||typeof tube!=="object"){
    throw new TypeError("tube is required");
  }
  const tolerance=Number(recommended_tolerance_mm);
  if(!Number.isFinite(tolerance)||tolerance<=0){
    throw new RangeError("recommended_tolerance_mm must be positive");
  }

  const out=clone(tube);
  const evidence=sourceDiameterEvidence(tube);
  if(!evidence){
    const normalization=Object.freeze({
      status:"unresolved",
      source_outer_diameter_mm:null,
      table_outer_diameter_mm:null,
      table_index:null,
      error_mm:null,
      recommended_tolerance_mm:tolerance,
      within_recommended_tolerance:false,
      source_kind:null,
      source_path:null,
      affects_display_only:true,
      tooling_selected:false,
      machine_compensation_applied:false,
      reason:"No recognized or metadata outer diameter is available."
    });
    out.importEvidence={
      ...(out.importEvidence??{}),
      diameterNormalization:normalization
    };
    out.toolingId=null;
    out.toolingUnresolved=true;
    return Object.freeze({tube:out,normalization});
  }

  const nearest=nearestTableDiameter(evidence.value_mm,diameter_catalog);
  if(nearest.status!=="nearest"){
    const normalization=Object.freeze({
      ...nearest,
      recommended_tolerance_mm:tolerance,
      within_recommended_tolerance:false,
      source_kind:evidence.source_kind,
      source_path:evidence.source_path,
      affects_display_only:true,
      tooling_selected:false,
      machine_compensation_applied:false
    });
    out.importEvidence={
      ...(out.importEvidence??{}),
      diameterNormalization:normalization
    };
    out.toolingId=null;
    out.toolingUnresolved=true;
    return Object.freeze({tube:out,normalization});
  }

  const within=nearest.error_mm<=tolerance;
  const normalization=Object.freeze({
    status:within?"snapped":"snapped_large_deviation",
    source_outer_diameter_mm:nearest.source_outer_diameter_mm,
    table_outer_diameter_mm:nearest.table_outer_diameter_mm,
    table_index:nearest.table_index,
    table_inch:nearest.table_inch,
    error_mm:nearest.error_mm,
    recommended_tolerance_mm:tolerance,
    within_recommended_tolerance:within,
    source_kind:evidence.source_kind,
    source_path:evidence.source_path,
    table_source:"active_pipe_db",
    affects_display_only:true,
    tooling_selected:false,
    machine_compensation_applied:false,
    reason:within
      ?"Recognized outer diameter was rounded to the nearest active table value."
      :"Recognized outer diameter was rounded to the nearest active table value, but the deviation exceeds the recommended tolerance."
  });

  out.diameterIndex=nearest.table_index;
  out.toolingId=null;
  out.toolingUnresolved=true;
  out.importEvidence={
    ...(out.importEvidence??{}),
    diameterNormalization:normalization
  };
  const issues=Array.isArray(out.importValidation?.issues)
    ? [...out.importValidation.issues]
    : [];
  const message=
    "Imported OD "+nearest.source_outer_diameter_mm.toFixed(3)+
    " mm → table "+nearest.table_outer_diameter_mm.toFixed(3)+
    " mm (Δ "+nearest.error_mm.toFixed(3)+" mm).";
  if(!issues.includes(message))issues.push(message);
  if(!within){
    const warning="Diameter-table rounding deviation exceeds "+tolerance.toFixed(3)+" mm; verify the tube size before production.";
    if(!issues.includes(warning))issues.push(warning);
  }
  out.importValidation={
    ...(out.importValidation??{}),
    productionBlocked:true,
    toolingResolved:false,
    diameterTableNormalized:true,
    diameterNormalizationWithinTolerance:within,
    issues
  };

  return Object.freeze({tube:out,normalization});
}

export function normalizeImportedProjectDiameters(
  project,
  diameter_catalog,
  options={}
){
  if(!project||typeof project!=="object"){
    throw new TypeError("project is required");
  }
  const out=clone(project);
  out.tubes=Array.isArray(out.tubes)?out.tubes:[];
  let normalizedCount=0;
  let unresolvedCount=0;
  let largeDeviationCount=0;

  out.tubes=out.tubes.map((tube)=>{
    const isDwfx=
      String(tube?.importEvidence?.source?.format??"").toLowerCase()==="dwfx";
    if(!isDwfx)return tube;
    const result=normalizeImportedTubeDiameterToCatalog(
      tube,
      diameter_catalog,
      options
    );
    if(result.normalization.status==="unresolved")unresolvedCount+=1;
    else normalizedCount+=1;
    if(result.normalization.status==="snapped_large_deviation"){
      largeDeviationCount+=1;
    }
    return result.tube;
  });

  return Object.freeze({
    status:normalizedCount?"normalized":unresolvedCount?"partial":"no_change",
    project:out,
    normalized_count:normalizedCount,
    unresolved_count:unresolvedCount,
    large_deviation_count:largeDeviationCount,
    production_ready:false
  });
}
