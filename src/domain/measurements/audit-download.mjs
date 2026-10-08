function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const key of Object.keys(value))value[key]=freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}

export const DIMENSION_AUDIT_DOWNLOAD_POLICY_SCHEMA="TubeBender.DimensionAuditDownloadPolicy.v1";
export const DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA="TubeBender.DimensionAuditDownloadValidation.v1";
export const DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES=freeze([
  "OK",
  "INVALID_FILENAME",
  "INVALID_SNAPSHOT",
  "UNSUPPORTED_SCHEMA"
]);
export const DIMENSION_AUDIT_DOWNLOAD_SCHEMAS=freeze([
  "TubeBender.DimensionAudit.v1",
  "TubeBender.DimensionSelectionAudit.v1",
  "TubeBender.DimensionAuditView.v1",
  "TubeBender.DimensionReviewQueueAudit.v1",
  "TubeBender.DimensionReviewReasonAudit.v1"
]);
export const DIMENSION_AUDIT_FILENAME_POLICY=freeze({
  part_default_length:80,
  part_min_length:8,
  part_max_length:120,
  json_default_length:220,
  json_min_length:80,
  json_max_length:240
});

export function dimensionAuditFilenameStamp(value=new Date()){
  if(!(value instanceof Date)||Number.isNaN(value.getTime()))throw new TypeError("audit filename timestamp must be a valid Date");
  return value.toISOString().replace(/[:.]/g,"-");
}

export function dimensionAuditFilenamePart(value,fallback="item",maxLength=DIMENSION_AUDIT_FILENAME_POLICY.part_default_length){
  const limit=Math.max(
    DIMENSION_AUDIT_FILENAME_POLICY.part_min_length,
    Math.min(
      DIMENSION_AUDIT_FILENAME_POLICY.part_max_length,
      Math.trunc(Number(maxLength)||DIMENSION_AUDIT_FILENAME_POLICY.part_default_length)
    )
  );
  const safe=String(value??"").trim()
    .replace(/[^\p{L}\p{N}._-]+/gu,"_")
    .replace(/^[_\-.]+|[_\-.]+$/g,"");
  const clipped=safe.slice(0,limit).replace(/[_\-.]+$/g,"");
  return clipped||String(fallback).slice(0,limit);
}

export function dimensionAuditJsonFilename(stem,generatedAt,maxLength=DIMENSION_AUDIT_FILENAME_POLICY.json_default_length){
  const limit=Math.max(
    DIMENSION_AUDIT_FILENAME_POLICY.json_min_length,
    Math.min(
      DIMENSION_AUDIT_FILENAME_POLICY.json_max_length,
      Math.trunc(Number(maxLength)||DIMENSION_AUDIT_FILENAME_POLICY.json_default_length)
    )
  );
  const date=generatedAt instanceof Date?generatedAt:new Date(generatedAt);
  const stamp=dimensionAuditFilenameStamp(date);
  const suffix="-"+stamp+".json";
  const budget=Math.max(16,limit-suffix.length);
  const safeStem=String(stem??"dimension-audit").slice(0,budget).replace(/[_\-.]+$/g,"")||"dimension-audit";
  return safeStem+suffix;
}

export function dimensionAuditDownloadFilenameSupported(filename){
  const value=String(filename??"").trim();
  return !!value
    &&value.length<=DIMENSION_AUDIT_FILENAME_POLICY.json_max_length
    &&value.endsWith(".json")
    &&!/[\\/\u0000-\u001f]/u.test(value);
}

export function dimensionAuditDownloadSnapshotShapeSupported(snapshot){
  return !!snapshot&&typeof snapshot==="object"&&!Array.isArray(snapshot);
}

export function dimensionAuditDownloadSchemaSupported(schema){
  return DIMENSION_AUDIT_DOWNLOAD_SCHEMAS.includes(String(schema??"").trim());
}

export function dimensionAuditDownloadValidation(filename,snapshot){
  const safeFilename=String(filename??"").trim();
  if(!dimensionAuditDownloadFilenameSupported(safeFilename)){
    return freeze({
      validation_schema:DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA,
      valid:false,code:"INVALID_FILENAME",filename:safeFilename,schema:null
    });
  }
  if(!dimensionAuditDownloadSnapshotShapeSupported(snapshot)){
    return freeze({
      validation_schema:DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA,
      valid:false,code:"INVALID_SNAPSHOT",filename:safeFilename,schema:null
    });
  }
  const schema=String(snapshot?.schema??"").trim();
  if(!dimensionAuditDownloadSchemaSupported(schema)){
    return freeze({
      validation_schema:DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA,
      valid:false,code:"UNSUPPORTED_SCHEMA",filename:safeFilename,schema
    });
  }
  return freeze({
    validation_schema:DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA,
    valid:true,code:"OK",filename:safeFilename,schema
  });
}

export function dimensionAuditDownloadPolicy(){
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_POLICY_SCHEMA,
    validation_schema:DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA,
    validation_codes:[...DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES],
    schemas:[...DIMENSION_AUDIT_DOWNLOAD_SCHEMAS],
    filename:{...DIMENSION_AUDIT_FILENAME_POLICY}
  });
}
