function finitePositive(value,label){
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0){
    throw new RangeError(label+" must be a finite positive number");
  }
  return n;
}

function canonicalBendClrs(tube){
  const primitives=
    tube?.importEvidence?.canonicalGeometry?.primitives ??
    tube?.canonical_geometry?.primitives ??
    [];
  const clrs=[];
  for(const primitive of primitives){
    if(primitive?.type!=="BEND") continue;
    const raw=primitive?.clr?.value ?? primitive?.clr_mm ?? primitive?.clr;
    const clr=Number(raw);
    if(Number.isFinite(clr)&&clr>0) clrs.push(clr);
  }
  return clrs;
}

function sourceOuterDiameter(tube){
  const candidates=[
    tube?.importEvidence?.metadata?.outer_diameter?.value,
    tube?.metadata?.outer_diameter?.value,
    tube?.outerDiameterMm,
    tube?.outer_diameter_mm
  ];
  for(const value of candidates){
    const n=Number(value);
    if(Number.isFinite(n)&&n>0) return n;
  }
  return null;
}

/**
 * Return compatible tooling choices for an imported tube without selecting one.
 *
 * Matching uses explicit source OD and canonical per-bend CLR only. The helper
 * never mutates the tube, never writes diameterIndex/toolingId and never falls
 * back to the first or nearest tool when no exact-tolerance match exists.
 */
export function toolingCandidatesForImportedTube(
  tube,
  toolingCatalog,
  {
    od_tolerance_mm=0.02,
    clr_tolerance_mm=0.05
  }={}
){
  if(!tube||typeof tube!=="object"){
    throw new TypeError("imported tube is required");
  }
  if(!Array.isArray(toolingCatalog)){
    throw new TypeError("toolingCatalog must be an array");
  }
  const odTol=finitePositive(od_tolerance_mm,"od_tolerance_mm");
  const clrTol=finitePositive(clr_tolerance_mm,"clr_tolerance_mm");
  const sourceOd=sourceOuterDiameter(tube);
  const clrs=canonicalBendClrs(tube);

  if(sourceOd==null){
    return Object.freeze({
      status:"unresolved",
      selected_tooling_id:null,
      source_outer_diameter_mm:null,
      canonical_clrs_mm:Object.freeze(clrs),
      candidates:Object.freeze([]),
      reason:"Imported tube has no exact source outer diameter."
    });
  }
  if(clrs.length===0){
    return Object.freeze({
      status:"unresolved",
      selected_tooling_id:null,
      source_outer_diameter_mm:sourceOd,
      canonical_clrs_mm:Object.freeze([]),
      candidates:Object.freeze([]),
      reason:"Imported tube has no canonical bend CLR evidence."
    });
  }

  const candidates=[];
  for(const [index,tool] of toolingCatalog.entries()){
    const id=tool?.id==null?null:String(tool.id);
    const mm=Number(tool?.mm);
    const rb=Number(tool?.Rb);
    if(!id||!Number.isFinite(mm)||mm<=0||!Number.isFinite(rb)||rb<=0) continue;

    const odError=Math.abs(mm-sourceOd);
    const clrErrors=clrs.map((clr)=>Math.abs(rb-clr));
    const maxClrError=Math.max(...clrErrors);
    if(odError>odTol||maxClrError>clrTol) continue;

    candidates.push(Object.freeze({
      tooling_id:id,
      catalog_index:index,
      outer_diameter_mm:mm,
      centerline_radius_mm:rb,
      od_error_mm:odError,
      max_clr_error_mm:maxClrError,
      exact_source_od_match:odError<=1e-12,
      exact_canonical_clr_match:maxClrError<=1e-12
    }));
  }

  candidates.sort((a,b)=>
    a.od_error_mm-b.od_error_mm ||
    a.max_clr_error_mm-b.max_clr_error_mm ||
    a.tooling_id.localeCompare(b.tooling_id)
  );

  return Object.freeze({
    status:candidates.length?"candidates":"unresolved",
    selected_tooling_id:null,
    source_outer_diameter_mm:sourceOd,
    canonical_clrs_mm:Object.freeze([...clrs]),
    candidates:Object.freeze(candidates),
    reason:candidates.length
      ?"Compatible tooling candidates are available, but explicit user selection is still required."
      :"No tooling matches both exact source OD and canonical CLR within tolerance."
  });
}
