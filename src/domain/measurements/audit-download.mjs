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
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA="TubeBender.DimensionAuditDownloadHistory.v1";
export const DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA="TubeBender.DimensionAuditDownloadAttempt.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA="TubeBender.DimensionAuditDownloadAttemptHistorySummary.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_INTEGRITY_SCHEMA="TubeBender.DimensionAuditDownloadHistoryIntegrity.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_INTEGRITY_CODES=freeze([
  "OK",
  "INVALID_HISTORY_SCHEMA",
  "INVALID_GENERATED_AT",
  "INVALID_ATTEMPT_COUNT",
  "INVALID_ATTEMPTS",
  "INVALID_SUMMARY",
  "INVALID_SUMMARY_SIGNATURE",
  "INVALID_PROTOCOL_STATE",
  "INVALID_PROTOCOL_STATE_SIGNATURE",
  "INVALID_SNAPSHOT_SIGNATURE"
]);
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
  "TubeBender.DimensionReviewReasonAudit.v1",
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA
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


export function dimensionAuditDownloadProtocolState(){
  const policy=dimensionAuditDownloadPolicy();
  const validationSchema=String(policy.validation_schema??"");
  const validationCodes=[...(policy.validation_codes??[])];
  const schemas=[...(policy.schemas??[])];
  const filename={...(policy.filename??{})};
  const protocolConsistent=
    validationSchema===DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA
    &&JSON.stringify(validationCodes)===JSON.stringify([...DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES])
    &&JSON.stringify(schemas)===JSON.stringify([...DIMENSION_AUDIT_DOWNLOAD_SCHEMAS])
    &&JSON.stringify(filename)===JSON.stringify({...DIMENSION_AUDIT_FILENAME_POLICY});
  return freeze({
    schema:"TubeBender.DimensionAuditDownloadProtocolState.v1",
    valid:protocolConsistent,
    protocol_consistent:protocolConsistent,
    policy_schema:String(policy.schema??""),
    validation_schema:validationSchema,
    validation_codes:validationCodes,
    schemas,
    filename
  });
}


export function dimensionAuditDownloadProtocolSignature(state=dimensionAuditDownloadProtocolState()){
  const value=state??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    valid:value.valid===true,
    protocol_consistent:value.protocol_consistent===true,
    policy_schema:String(value.policy_schema??""),
    validation_schema:String(value.validation_schema??""),
    validation_codes:[...(value.validation_codes??[])],
    schemas:[...(value.schemas??[])],
    filename:{...(value.filename??{})}
  });
}

export function dimensionAuditDownloadProtocolSignatureValid(signature,state=dimensionAuditDownloadProtocolState()){
  const value=state??{};
  const expected=dimensionAuditDownloadProtocolState();
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.valid==="boolean"
    &&typeof value.protocol_consistent==="boolean"
    &&typeof value.policy_schema==="string"
    &&typeof value.validation_schema==="string"
    &&Array.isArray(value.validation_codes)
    &&value.validation_codes.every(code=>typeof code==="string")
    &&Array.isArray(value.schemas)
    &&value.schemas.every(schema=>typeof schema==="string")
    &&!!value.filename
    &&typeof value.filename==="object"
    &&!Array.isArray(value.filename)
    &&value.valid===true
    &&value.protocol_consistent===true
    &&dimensionAuditDownloadProtocolSignature(value)===dimensionAuditDownloadProtocolSignature(expected)
    &&signature===dimensionAuditDownloadProtocolSignature(value);
}


export function dimensionAuditDownloadAttemptSignature(attempt={}){
  const value=attempt??{};
  const hasPermitEvidence=value.export_action!=null
    ||value.action_permit_signature!=null
    ||value.action_permit_snapshot_signature!=null;
  if(typeof value.schema!=="string"
    ||typeof value.status!=="string"
    ||typeof value.filename!=="string"
    ||!(value.snapshot_schema===null||typeof value.snapshot_schema==="string")
    ||typeof value.code!=="string"
    ||typeof value.preflight_signature!=="string"
    ||typeof value.runtime_signature!=="string"
    ||typeof value.protocol_signature!=="string"
    ||!(value.error===null||typeof value.error==="string")
    ||typeof value.generated_at!=="string"
    ||(hasPermitEvidence&&(
      typeof value.export_action!=="string"
      ||typeof value.action_permit_signature!=="string"
      ||typeof value.action_permit_snapshot_signature!=="string"
    ))){
    throw new TypeError("audit download attempt signature fields must be canonical");
  }
  const signed={
    schema:value.schema,
    status:value.status,
    filename:value.filename,
    snapshot_schema:value.snapshot_schema,
    code:value.code,
    preflight_signature:value.preflight_signature,
    runtime_signature:value.runtime_signature,
    protocol_signature:value.protocol_signature,
    error:value.error,
    generated_at:value.generated_at
  };
  if(hasPermitEvidence){
    signed.export_action=value.export_action;
    signed.action_permit_signature=value.action_permit_signature;
    signed.action_permit_snapshot_signature=value.action_permit_snapshot_signature;
  }
  return JSON.stringify(signed);
}

export function dimensionAuditDownloadAttemptSignatureValid(signature,attempt={}){
  const value=attempt??{};
  const hasPermitEvidence=value.export_action!=null
    ||value.action_permit_signature!=null
    ||value.action_permit_snapshot_signature!=null;
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.status==="string"
    &&typeof value.filename==="string"
    &&(value.snapshot_schema===null||typeof value.snapshot_schema==="string")
    &&typeof value.code==="string"
    &&typeof value.preflight_signature==="string"
    &&typeof value.runtime_signature==="string"
    &&typeof value.protocol_signature==="string"
    &&(value.error===null||typeof value.error==="string")
    &&typeof value.generated_at==="string"
    &&(!hasPermitEvidence||(
      typeof value.export_action==="string"
      &&typeof value.action_permit_signature==="string"
      &&typeof value.action_permit_snapshot_signature==="string"
    ))
    &&signature===dimensionAuditDownloadAttemptSignature(value);
}

export function dimensionAuditDownloadAttemptPermitEvidence(attempt={}){
  const value=attempt??{};
  const present=value.export_action!=null
    ||value.action_permit_signature!=null
    ||value.action_permit_snapshot_signature!=null;
  if(!present)return freeze({present:false,valid:true,action:null,permit_signature:null,permit_snapshot_signature:null});
  const action=String(value.export_action??"");
  const permitSignature=String(value.action_permit_signature??"");
  const permitSnapshotSignature=String(value.action_permit_snapshot_signature??"");
  return freeze({
    present:true,
    valid:["copy","download"].includes(action)&&!!permitSignature&&!!permitSnapshotSignature,
    action,
    permit_signature:permitSignature,
    permit_snapshot_signature:permitSnapshotSignature
  });
}

export function buildDimensionAuditDownloadAttempt({
  status,
  filename="",
  snapshot_schema=null,
  code="",
  preflight_signature="",
  runtime_signature="",
  protocol_signature="",
  export_action=null,
  action_permit_signature=null,
  action_permit_snapshot_signature=null,
  error=null,
  generated_at=new Date().toISOString()
}={}){
  const safeStatus=String(status??"");
  if(!["blocked","downloaded","failed"].includes(safeStatus)){
    throw new RangeError("unsupported audit download attempt status: "+safeStatus);
  }
  const timestamp=new Date(generated_at);
  if(Number.isNaN(timestamp.getTime()))throw new TypeError("audit download attempt generated_at must be a valid timestamp");
  const safeError=error==null?null:String(error);
  if(safeStatus==="failed"&&!safeError)throw new TypeError("failed audit download attempt must include error");
  if(safeStatus!=="failed"&&safeError!==null)throw new TypeError("non-failed audit download attempt cannot include error");
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA,
    status:safeStatus,
    filename:String(filename??""),
    snapshot_schema:snapshot_schema==null?null:String(snapshot_schema),
    code:String(code??""),
    preflight_signature:String(preflight_signature??""),
    runtime_signature:String(runtime_signature??""),
    protocol_signature:String(protocol_signature??""),
    error:safeError,
    generated_at:timestamp.toISOString()
  };
  const permitEvidence=dimensionAuditDownloadAttemptPermitEvidence({
    export_action,
    action_permit_signature,
    action_permit_snapshot_signature
  });
  if(permitEvidence.present){
    if(!permitEvidence.valid){
      if(!["copy","download"].includes(permitEvidence.action))throw new TypeError("audit download attempt export_action must be copy or download");
      throw new TypeError("audit download attempt permit evidence must be complete");
    }
    base.export_action=permitEvidence.action;
    base.action_permit_signature=permitEvidence.permit_signature;
    base.action_permit_snapshot_signature=permitEvidence.permit_snapshot_signature;
  }
  return freeze({
    ...base,
    signature:dimensionAuditDownloadAttemptSignature(base)
  });
}

export function dimensionAuditDownloadAttemptValid(attempt={}){
  const value=attempt??{};
  if(typeof value.schema!=="string"
    ||typeof value.status!=="string"
    ||typeof value.filename!=="string"
    ||!(value.snapshot_schema===null||typeof value.snapshot_schema==="string")
    ||typeof value.code!=="string"
    ||typeof value.preflight_signature!=="string"
    ||typeof value.runtime_signature!=="string"
    ||typeof value.protocol_signature!=="string"
    ||!(value.error===null||typeof value.error==="string")
    ||typeof value.generated_at!=="string"
    ||typeof value.signature!=="string")return false;
  const status=value.status;
  const signature=value.signature;
  const error=value.error;
  const outcomeValid=status==="failed"?!!error:error===null;
  const timestamp=new Date(value.generated_at);
  const generatedAtValid=!Number.isNaN(timestamp.getTime())&&timestamp.toISOString()===value.generated_at;
  const hasPermitEvidence=value.export_action!=null
    ||value.action_permit_signature!=null
    ||value.action_permit_snapshot_signature!=null;
  if(hasPermitEvidence&&(
    typeof value.export_action!=="string"
    ||typeof value.action_permit_signature!=="string"
    ||typeof value.action_permit_snapshot_signature!=="string"
  ))return false;
  const permitEvidence=dimensionAuditDownloadAttemptPermitEvidence(value);
  const permitEvidenceValid=permitEvidence.valid;
  return value.schema===DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA
    &&["blocked","downloaded","failed"].includes(status)
    &&outcomeValid
    &&generatedAtValid
    &&permitEvidenceValid
    &&dimensionAuditDownloadAttemptSignatureValid(signature,value);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_PERMIT_EVIDENCE_SUMMARY_SCHEMA="TubeBender.DimensionAuditDownloadHistoryPermitEvidenceSummary.v1";

export function dimensionAuditDownloadHistoryPermitEvidenceSummary(attempts=[]){
  if(!Array.isArray(attempts))throw new TypeError("audit download history attempts must be an array");
  let present=0,valid=0,invalid=0,copy=0,download=0;
  for(const attempt of attempts){
    const evidence=dimensionAuditDownloadAttemptPermitEvidence(attempt);
    if(!evidence.present)continue;
    present++;
    if(evidence.valid)valid++;else invalid++;
    if(evidence.action==="copy")copy++;
    if(evidence.action==="download")download++;
  }
  const latest=dimensionAuditDownloadAttemptPermitEvidence(attempts.at(-1)??{});
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_PERMIT_EVIDENCE_SUMMARY_SCHEMA,
    total:attempts.length,
    present,
    absent:attempts.length-present,
    valid,
    invalid,
    copy,
    download,
    latest_present:latest.present,
    latest_valid:latest.valid,
    latest_action:latest.action
  });
}

export function dimensionAuditDownloadHistoryPermitEvidenceSummaryValid(summary={},attempts=[]){
  if(!Array.isArray(attempts))return false;
  if(!attempts.every(attempt=>dimensionAuditDownloadAttemptValid(attempt)))return false;
  const expected=dimensionAuditDownloadHistoryPermitEvidenceSummary(attempts);
  const value=summary??{};
  return typeof value.schema==="string"
    &&value.schema===DIMENSION_AUDIT_DOWNLOAD_HISTORY_PERMIT_EVIDENCE_SUMMARY_SCHEMA
    &&Number.isInteger(value.total)&&value.total===expected.total
    &&Number.isInteger(value.present)&&value.present===expected.present
    &&Number.isInteger(value.absent)&&value.absent===expected.absent
    &&Number.isInteger(value.valid)&&value.valid===expected.valid
    &&Number.isInteger(value.invalid)&&value.invalid===expected.invalid
    &&Number.isInteger(value.copy)&&value.copy===expected.copy
    &&Number.isInteger(value.download)&&value.download===expected.download
    &&typeof value.latest_present==="boolean"
    &&typeof value.latest_valid==="boolean"
    &&(value.latest_action===null||typeof value.latest_action==="string")
    &&value.latest_present===expected.latest_present
    &&value.latest_valid===expected.latest_valid
    &&value.latest_action===expected.latest_action;
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportEvent.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_SUMMARY_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportEventSummary.v1";

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_FINAL_STATE_EVIDENCE_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportEventFinalStateEvidence.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_FINAL_STATE_EVIDENCE_SUMMARY_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary.v1";

export function dimensionAuditDownloadHistoryExportEventFinalStateEvidence(event={}){
  const value=event??{};
  const hasSignature=value.final_state_signature!=null;
  const hasSnapshotSignature=value.final_state_snapshot_signature!=null;
  const present=hasSignature||hasSnapshotSignature;
  const complete=typeof value.final_state_signature==="string"
    &&value.final_state_signature.length>0
    &&typeof value.final_state_snapshot_signature==="string"
    &&value.final_state_snapshot_signature.length>0;
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_FINAL_STATE_EVIDENCE_SCHEMA,
    present,
    valid:!present||complete,
    final_state_signature:complete?value.final_state_signature:"",
    final_state_snapshot_signature:complete?value.final_state_snapshot_signature:""
  });
}

export function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events=[]){
  if(!Array.isArray(events))throw new TypeError("history export events must be an array");
  let present=0,valid=0,invalid=0;
  for(const event of events){
    const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidence(event);
    if(!evidence.present)continue;
    present++;
    if(evidence.valid)valid++;else invalid++;
  }
  const latest=dimensionAuditDownloadHistoryExportEventFinalStateEvidence(events.at(-1)??{});
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_FINAL_STATE_EVIDENCE_SUMMARY_SCHEMA,
    total:events.length,
    present,
    absent:events.length-present,
    valid,
    invalid,
    latest_present:latest.present,
    latest_valid:latest.valid
  });
}

export function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid(summary={},events=[]){
  if(!Array.isArray(events))return false;
  if(!events.every(event=>dimensionAuditDownloadHistoryExportEventValid(event)))return false;
  const expected=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const value=summary??{};
  return typeof value.schema==="string"
    &&value.schema===DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_FINAL_STATE_EVIDENCE_SUMMARY_SCHEMA
    &&Number.isInteger(value.total)&&value.total===expected.total
    &&Number.isInteger(value.present)&&value.present===expected.present
    &&Number.isInteger(value.absent)&&value.absent===expected.absent
    &&Number.isInteger(value.valid)&&value.valid===expected.valid
    &&Number.isInteger(value.invalid)&&value.invalid===expected.invalid
    &&typeof value.latest_present==="boolean"&&value.latest_present===expected.latest_present
    &&typeof value.latest_valid==="boolean"&&value.latest_valid===expected.latest_valid;
}

export function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature(summary={}){
  const value=summary??{};
  if(typeof value.schema!=="string"
    ||!Number.isInteger(value.total)
    ||!Number.isInteger(value.present)
    ||!Number.isInteger(value.absent)
    ||!Number.isInteger(value.valid)
    ||!Number.isInteger(value.invalid)
    ||typeof value.latest_present!=="boolean"
    ||typeof value.latest_valid!=="boolean"){
    throw new TypeError("history export final-state evidence summary signature fields must be canonical");
  }
  return JSON.stringify({
    schema:value.schema,
    total:value.total,
    present:value.present,
    absent:value.absent,
    valid:value.valid,
    invalid:value.invalid,
    latest_present:value.latest_present,
    latest_valid:value.latest_valid
  });
}

export function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid(signature,summary={},events=[]){
  if(!Array.isArray(events))return false;
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid(summary,events)
    &&signature===dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature(summary);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_FINAL_STATE_EVIDENCE_SUMMARY_SNAPSHOT_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot.v1";

export function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature(events=[]){
  if(!Array.isArray(events))throw new TypeError("history export events must be an array");
  if(!events.every(event=>typeof event?.signature==="string"))throw new TypeError("history export event signatures must be strings");
  return JSON.stringify(events.map(event=>event.signature));
}

export function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid(signature,events=[]){
  if(!Array.isArray(events))return false;
  if(!events.every(event=>typeof event?.signature==="string"))return false;
  return typeof signature==="string"
    &&signature.length>0
    &&signature===dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature(events);
}

export function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature(snapshot={}){
  const value=snapshot??{};
  if(typeof value.schema!=="string"
    ||typeof value.summary_signature!=="string"
    ||typeof value.event_binding_signature!=="string"
    ||typeof value.summary_valid!=="boolean"
    ||typeof value.summary_signature_valid!=="boolean"){
    throw new TypeError("history export evidence summary snapshot signature fields must be canonical");
  }
  return JSON.stringify({
    schema:value.schema,
    summary_signature:value.summary_signature,
    event_binding_signature:value.event_binding_signature,
    summary_valid:value.summary_valid,
    summary_signature_valid:value.summary_signature_valid
  });
}

export function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid(signature,snapshot={}){
  const value=snapshot??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.summary_signature==="string"
    &&typeof value.event_binding_signature==="string"
    &&typeof value.summary_valid==="boolean"
    &&typeof value.summary_signature_valid==="boolean"
    &&signature===dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature(value);
}

export function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(),events=[]){
  const value=summary??{};
  const signature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature(value);
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_FINAL_STATE_EVIDENCE_SUMMARY_SNAPSHOT_SCHEMA,
    summary:value,
    summary_signature:signature,
    event_binding_signature:dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature(events),
    summary_valid:dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid(value,events),
    summary_signature_valid:dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid(signature,value,events)
  };
  const snapshotSignature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature(base);
  return freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
}

export function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(snapshot={},events=[]){
  if(!Array.isArray(events))return false;
  const value=snapshot??{};
  if(typeof value.schema!=="string"
    ||typeof value.summary_signature!=="string"
    ||typeof value.event_binding_signature!=="string"
    ||typeof value.summary_valid!=="boolean"
    ||typeof value.summary_signature_valid!=="boolean"
    ||typeof value.snapshot_signature!=="string"
    ||typeof value.snapshot_signature_valid!=="boolean")return false;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_FINAL_STATE_EVIDENCE_SUMMARY_SNAPSHOT_SCHEMA)return false;
  if(!dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid(value.event_binding_signature,events))return false;
  if(!dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid(value.summary,events))return false;
  if(value.summary_valid!==true||value.summary_signature_valid!==true)return false;
  if(!dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid(value.summary_signature,value.summary,events))return false;
  if(value.snapshot_signature_valid!==true)return false;
  return dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid(value.snapshot_signature,value);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_LOG_ENVELOPE_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportEventLogEnvelope.v1";

export function dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(envelope={}){
  const value=envelope??{};
  const history=value.history_snapshot;
  const evidence=value.evidence_summary_snapshot;
  if(typeof value.schema!=="string"
    ||!history||typeof history!=="object"||Array.isArray(history)
    ||typeof history.signature!=="string"
    ||!Array.isArray(history.events)
    ||!history.events.every(event=>typeof event?.signature==="string")
    ||!Number.isInteger(history.event_count)
    ||!evidence||typeof evidence!=="object"||Array.isArray(evidence)
    ||typeof evidence.snapshot_signature!=="string"
    ||typeof evidence.summary_signature!=="string"
    ||typeof evidence.event_binding_signature!=="string"
    ||!evidence.summary||typeof evidence.summary!=="object"||Array.isArray(evidence.summary)
    ||!Number.isInteger(evidence.summary.total)){
    throw new TypeError("history export event-log envelope signature fields must be canonical");
  }
  return JSON.stringify({
    schema:value.schema,
    history_snapshot_signature:history.signature,
    evidence_summary_snapshot_signature:evidence.snapshot_signature,
    evidence_summary_signature:evidence.summary_signature,
    evidence_event_binding_signature:evidence.event_binding_signature,
    history_event_signatures:history.events.map(event=>event.signature),
    event_count:history.event_count,
    evidence_event_count:evidence.summary.total
  });
}

export function dimensionAuditDownloadHistoryExportEventLogEnvelopeSignatureValid(signature,envelope={}){
  const value=envelope??{};
  const history=value.history_snapshot;
  const evidence=value.evidence_summary_snapshot;
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&!!history
    &&typeof history==="object"
    &&!Array.isArray(history)
    &&typeof history.signature==="string"
    &&Array.isArray(history.events)
    &&history.events.every(event=>typeof event?.signature==="string")
    &&Number.isInteger(history.event_count)
    &&!!evidence
    &&typeof evidence==="object"
    &&!Array.isArray(evidence)
    &&typeof evidence.snapshot_signature==="string"
    &&typeof evidence.summary_signature==="string"
    &&typeof evidence.event_binding_signature==="string"
    &&!!evidence.summary
    &&typeof evidence.summary==="object"
    &&!Array.isArray(evidence.summary)
    &&Number.isInteger(evidence.summary.total)
    &&signature===dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(value);
}

export function dimensionAuditDownloadHistoryExportEventLogEnvelope(historySnapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(),evidenceSummarySnapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(),events=[]){
  if(!Array.isArray(events))throw new TypeError("history export events must be an array");
  const history=historySnapshot??{};
  const evidence=evidenceSummarySnapshot??{};
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_LOG_ENVELOPE_SCHEMA,
    history_snapshot:history,
    evidence_summary_snapshot:evidence,
    history_snapshot_valid:dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(history),
    evidence_summary_snapshot_valid:dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(evidence,events)
  };
  return freeze({...base,signature:dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(base)});
}

export function dimensionAuditDownloadHistoryExportEventLogEnvelopeValid(envelope={},events=[]){
  if(!Array.isArray(events))return false;
  const value=envelope??{};
  if(typeof value.schema!=="string"
    ||typeof value.history_snapshot_valid!=="boolean"
    ||typeof value.evidence_summary_snapshot_valid!=="boolean"
    ||typeof value.signature!=="string")return false;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_LOG_ENVELOPE_SCHEMA)return false;
  if(value.history_snapshot_valid!==true||!dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(value.history_snapshot))return false;
  const historyEvents=Array.isArray(value.history_snapshot?.events)?value.history_snapshot.events:null;
  if(!historyEvents||historyEvents.length!==events.length)return false;
  for(let index=0;index<events.length;index++){
    if(typeof historyEvents[index]?.signature!=="string"||typeof events[index]?.signature!=="string")return false;
    if(historyEvents[index].signature!==events[index].signature)return false;
  }
  if(value.evidence_summary_snapshot_valid!==true||!dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(value.evidence_summary_snapshot,events))return false;
  return dimensionAuditDownloadHistoryExportEventLogEnvelopeSignatureValid(value.signature,value);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_LOG_ENVELOPE_SNAPSHOT_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot.v1";

export function dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature(snapshot={}){
  const value=snapshot??{};
  if(typeof value.schema!=="string"
    ||typeof value.envelope_signature!=="string"
    ||typeof value.envelope_valid!=="boolean"){
    throw new TypeError("history export event-log envelope snapshot signature fields must be canonical");
  }
  return JSON.stringify({
    schema:value.schema,
    envelope_signature:value.envelope_signature,
    envelope_valid:value.envelope_valid
  });
}

export function dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid(signature,snapshot={}){
  const value=snapshot??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.envelope_signature==="string"
    &&typeof value.envelope_valid==="boolean"
    &&signature===dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature(value);
}

export function dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(),events=[]){
  if(!Array.isArray(events))throw new TypeError("history export events must be an array");
  const value=envelope??{};
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_LOG_ENVELOPE_SNAPSHOT_SCHEMA,
    envelope:value,
    envelope_signature:String(value.signature??""),
    envelope_valid:dimensionAuditDownloadHistoryExportEventLogEnvelopeValid(value,events)
  };
  const snapshotSignature=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature(base);
  return freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
}

export function dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid(snapshot={},events=[]){
  if(!Array.isArray(events))return false;
  const value=snapshot??{};
  if(typeof value.schema!=="string"
    ||typeof value.envelope_signature!=="string"
    ||typeof value.envelope_valid!=="boolean"
    ||typeof value.snapshot_signature!=="string"
    ||typeof value.snapshot_signature_valid!=="boolean")return false;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_LOG_ENVELOPE_SNAPSHOT_SCHEMA)return false;
  if(value.envelope_valid!==true||!dimensionAuditDownloadHistoryExportEventLogEnvelopeValid(value.envelope,events))return false;
  if(value.envelope_signature!==value.envelope.signature)return false;
  if(value.snapshot_signature_valid!==true)return false;
  return dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid(value.snapshot_signature,value);
}

export function dimensionAuditDownloadHistoryExportEventSignature(event={}){
  const value=event??{};
  const hasFinalStateEvidence=value.final_state_signature!=null
    ||value.final_state_snapshot_signature!=null;
  if(typeof value.schema!=="string"
    ||typeof value.action!=="string"
    ||typeof value.outcome!=="string"
    ||typeof value.code!=="string"
    ||typeof value.history_snapshot_signature!=="string"
    ||typeof value.action_permit_signature!=="string"
    ||typeof value.action_permit_snapshot_signature!=="string"
    ||(hasFinalStateEvidence&&(
      typeof value.final_state_signature!=="string"
      ||typeof value.final_state_snapshot_signature!=="string"
    ))
    ||!(value.error===null||typeof value.error==="string")
    ||typeof value.generated_at!=="string"){
    throw new TypeError("history export event signature fields must be canonical");
  }
  return JSON.stringify({
    schema:value.schema,
    action:value.action,
    outcome:value.outcome,
    code:value.code,
    history_snapshot_signature:value.history_snapshot_signature,
    action_permit_signature:value.action_permit_signature,
    action_permit_snapshot_signature:value.action_permit_snapshot_signature,
    ...(hasFinalStateEvidence?{
      final_state_signature:value.final_state_signature,
      final_state_snapshot_signature:value.final_state_snapshot_signature
    }:{ }),
    error:value.error,
    generated_at:value.generated_at
  });
}

export function dimensionAuditDownloadHistoryExportEventSignatureValid(signature,event={}){
  const value=event??{};
  const hasFinalStateEvidence=value.final_state_signature!=null||value.final_state_snapshot_signature!=null;
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.action==="string"
    &&typeof value.outcome==="string"
    &&typeof value.code==="string"
    &&typeof value.history_snapshot_signature==="string"
    &&typeof value.action_permit_signature==="string"
    &&typeof value.action_permit_snapshot_signature==="string"
    &&(!hasFinalStateEvidence||(
      typeof value.final_state_signature==="string"
      &&typeof value.final_state_snapshot_signature==="string"
    ))
    &&(value.error===null||typeof value.error==="string")
    &&typeof value.generated_at==="string"
    &&signature===dimensionAuditDownloadHistoryExportEventSignature(value);
}

export function buildDimensionAuditDownloadHistoryExportEvent({
  action,
  outcome,
  code="",
  history_snapshot_signature="",
  action_permit_signature="",
  action_permit_snapshot_signature="",
  final_state_signature=null,
  final_state_snapshot_signature=null,
  error=null,
  generated_at=new Date().toISOString()
}={}){
  const safeAction=String(action??"");
  const safeOutcome=String(outcome??"");
  if(!["copy","download"].includes(safeAction))throw new RangeError("unsupported history export action: "+safeAction);
  if(!["blocked","copied","downloaded","failed"].includes(safeOutcome))throw new RangeError("unsupported history export outcome: "+safeOutcome);
  if(safeAction==="copy"&&safeOutcome==="downloaded")throw new TypeError("copy history export cannot have downloaded outcome");
  if(safeAction==="download"&&safeOutcome==="copied")throw new TypeError("download history export cannot have copied outcome");
  const timestamp=new Date(generated_at);
  if(Number.isNaN(timestamp.getTime()))throw new TypeError("history export event generated_at must be a valid timestamp");
  const safeError=error==null?null:String(error);
  if(safeOutcome==="failed"&&!safeError)throw new TypeError("failed history export event must include error");
  if(safeOutcome!=="failed"&&safeError!==null)throw new TypeError("non-failed history export event cannot include error");
  const permitSignature=String(action_permit_signature??"");
  const permitSnapshotSignature=String(action_permit_snapshot_signature??"");
  const permitEvidenceComplete=!!permitSignature&&!!permitSnapshotSignature;
  const permitEvidenceAbsent=!permitSignature&&!permitSnapshotSignature;
  if(!permitEvidenceComplete&&!permitEvidenceAbsent)throw new TypeError("history export permit evidence must be complete or absent");
  if(["copied","downloaded"].includes(safeOutcome)&&!permitEvidenceComplete){
    throw new TypeError("successful history export event requires permit evidence");
  }
  const hasFinalStateEvidence=final_state_signature!=null||final_state_snapshot_signature!=null;
  const finalStateSignature=hasFinalStateEvidence?String(final_state_signature??""):"";
  const finalStateSnapshotSignature=hasFinalStateEvidence?String(final_state_snapshot_signature??""):"";
  const finalStateEvidenceComplete=!!finalStateSignature&&!!finalStateSnapshotSignature;
  if(hasFinalStateEvidence&&!finalStateEvidenceComplete){
    throw new TypeError("history export final-state evidence must be complete or absent");
  }
  const historySnapshotSignature=String(history_snapshot_signature??"");
  if(!historySnapshotSignature)throw new TypeError("history export event requires history snapshot signature");
  const safeCode=String(code??"");
  if(!safeCode)throw new TypeError("history export event requires code");
  const successful=["copied","downloaded"].includes(safeOutcome);
  if(successful&&safeCode!=="READY")throw new TypeError("successful history export event requires READY code");
  if(!successful&&safeCode==="READY")throw new TypeError("non-successful history export event cannot use READY code");
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_SCHEMA,
    action:safeAction,
    outcome:safeOutcome,
    code:safeCode,
    history_snapshot_signature:historySnapshotSignature,
    action_permit_signature:permitSignature,
    action_permit_snapshot_signature:permitSnapshotSignature,
    ...(hasFinalStateEvidence?{
      final_state_signature:finalStateSignature,
      final_state_snapshot_signature:finalStateSnapshotSignature
    }:{ }),
    error:safeError,
    generated_at:timestamp.toISOString()
  };
  return freeze({...base,signature:dimensionAuditDownloadHistoryExportEventSignature(base)});
}

export function dimensionAuditDownloadHistoryExportEventValid(event={}){
  const value=event??{};
  const action=String(value.action??"");
  const outcome=String(value.outcome??"");
  const timestamp=new Date(String(value.generated_at??""));
  const permitSignature=String(value.action_permit_signature??"");
  const permitSnapshotSignature=String(value.action_permit_snapshot_signature??"");
  const permitEvidenceComplete=!!permitSignature&&!!permitSnapshotSignature;
  const permitEvidenceAbsent=!permitSignature&&!permitSnapshotSignature;
  const hasFinalStateEvidence=value.final_state_signature!=null||value.final_state_snapshot_signature!=null;
  const finalStateSignature=hasFinalStateEvidence?String(value.final_state_signature??""):"";
  const finalStateSnapshotSignature=hasFinalStateEvidence?String(value.final_state_snapshot_signature??""):"";
  const finalStateEvidenceComplete=!!finalStateSignature&&!!finalStateSnapshotSignature;
  const actionOutcomeValid=(action==="copy"&&outcome!=="downloaded")||(action==="download"&&outcome!=="copied");
  const error=value.error==null?null:String(value.error);
  const errorValid=outcome==="failed"?!!error:error===null;
  const successful=["copied","downloaded"].includes(outcome);
  const successPermitValid=!successful||permitEvidenceComplete;
  const code=String(value.code??"");
  const codeOutcomeValid=successful?code==="READY":!!code&&code!=="READY";
  return typeof value.schema==="string"
    &&value.schema===DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_SCHEMA
    &&typeof value.action==="string"
    &&typeof value.outcome==="string"
    &&typeof value.code==="string"
    &&typeof value.history_snapshot_signature==="string"
    &&typeof value.action_permit_signature==="string"
    &&typeof value.action_permit_snapshot_signature==="string"
    &&(!hasFinalStateEvidence||(
      typeof value.final_state_signature==="string"
      &&typeof value.final_state_snapshot_signature==="string"
      &&finalStateEvidenceComplete
    ))
    &&(value.error===null||typeof value.error==="string")
    &&typeof value.generated_at==="string"
    &&typeof value.signature==="string"
    &&["copy","download"].includes(action)
    &&["blocked","copied","downloaded","failed"].includes(outcome)
    &&actionOutcomeValid
    &&errorValid
    &&(permitEvidenceComplete||permitEvidenceAbsent)
    &&successPermitValid
    &&codeOutcomeValid
    &&value.history_snapshot_signature.length>0
    &&!Number.isNaN(timestamp.getTime())
    &&timestamp.toISOString()===value.generated_at
    &&dimensionAuditDownloadHistoryExportEventSignatureValid(value.signature,value);
}

export function dimensionAuditDownloadHistoryExportEventSummarySignature(summary={}){
  const value=summary??{};
  if(typeof value.schema!=="string"
    ||!Number.isInteger(value.total)
    ||!Number.isInteger(value.blocked)
    ||!Number.isInteger(value.copied)
    ||!Number.isInteger(value.downloaded)
    ||!Number.isInteger(value.failed)
    ||!Number.isInteger(value.copy)
    ||!Number.isInteger(value.download)
    ||!Number.isInteger(value.valid)
    ||!Number.isInteger(value.invalid)
    ||typeof value.latest_signature!=="string"
    ||typeof value.latest_outcome!=="string"
    ||typeof value.latest_action!=="string"
    ||typeof value.latest_code!=="string"){
    throw new TypeError("history export event summary signature fields must be canonical");
  }
  return JSON.stringify({
    schema:value.schema,
    total:value.total,
    blocked:value.blocked,
    copied:value.copied,
    downloaded:value.downloaded,
    failed:value.failed,
    copy:value.copy,
    download:value.download,
    valid:value.valid,
    invalid:value.invalid,
    latest_signature:value.latest_signature,
    latest_outcome:value.latest_outcome,
    latest_action:value.latest_action,
    latest_code:value.latest_code
  });
}

export function dimensionAuditDownloadHistoryExportEventSummarySignatureValid(signature,summary={}){
  const value=summary??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&Number.isInteger(value.total)
    &&Number.isInteger(value.blocked)
    &&Number.isInteger(value.copied)
    &&Number.isInteger(value.downloaded)
    &&Number.isInteger(value.failed)
    &&Number.isInteger(value.copy)
    &&Number.isInteger(value.download)
    &&Number.isInteger(value.valid)
    &&Number.isInteger(value.invalid)
    &&typeof value.latest_signature==="string"
    &&typeof value.latest_outcome==="string"
    &&typeof value.latest_action==="string"
    &&typeof value.latest_code==="string"
    &&signature===dimensionAuditDownloadHistoryExportEventSummarySignature(value);
}

export function dimensionAuditDownloadHistoryExportEventSummary(events=[]){
  if(!Array.isArray(events))throw new TypeError("history export events must be an array");
  let blocked=0,copied=0,downloaded=0,failed=0,copy=0,download=0,valid=0,invalid=0;
  for(const event of events){
    const outcome=String(event?.outcome??"");
    if(outcome==="blocked")blocked++;
    if(outcome==="copied")copied++;
    if(outcome==="downloaded")downloaded++;
    if(outcome==="failed")failed++;
    if(String(event?.action??"")==="copy")copy++;
    if(String(event?.action??"")==="download")download++;
    if(dimensionAuditDownloadHistoryExportEventValid(event))valid++;else invalid++;
  }
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_SUMMARY_SCHEMA,
    total:events.length,blocked,copied,downloaded,failed,copy,download,valid,invalid,
    latest_signature:String(events.at(-1)?.signature??""),
    latest_outcome:String(events.at(-1)?.outcome??""),
    latest_action:String(events.at(-1)?.action??""),
    latest_code:String(events.at(-1)?.code??"")
  };
  return freeze({...base,signature:dimensionAuditDownloadHistoryExportEventSummarySignature(base)});
}

export function dimensionAuditDownloadHistoryExportEventSummaryValid(summary={},events=[]){
  if(!Array.isArray(events))return false;
  const expected=dimensionAuditDownloadHistoryExportEventSummary(events);
  const value=summary??{};
  return typeof value.schema==="string"
    &&value.schema===DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_SUMMARY_SCHEMA
    &&typeof value.latest_signature==="string"
    &&typeof value.latest_outcome==="string"
    &&typeof value.latest_action==="string"
    &&typeof value.latest_code==="string"
    &&typeof value.signature==="string"
    &&Number.isInteger(value.total)&&value.total===expected.total
    &&Number.isInteger(value.blocked)&&value.blocked===expected.blocked
    &&Number.isInteger(value.copied)&&value.copied===expected.copied
    &&Number.isInteger(value.downloaded)&&value.downloaded===expected.downloaded
    &&Number.isInteger(value.failed)&&value.failed===expected.failed
    &&Number.isInteger(value.copy)&&value.copy===expected.copy
    &&Number.isInteger(value.download)&&value.download===expected.download
    &&Number.isInteger(value.valid)&&value.valid===expected.valid
    &&Number.isInteger(value.invalid)&&value.invalid===expected.invalid
    &&value.latest_signature===expected.latest_signature
    &&value.latest_outcome===expected.latest_outcome
    &&value.latest_action===expected.latest_action
    &&value.latest_code===expected.latest_code
    &&dimensionAuditDownloadHistoryExportEventSummarySignatureValid(value.signature,value);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_HISTORY_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportEventHistory.v1";

export function dimensionAuditDownloadHistoryExportEventHistorySignature(snapshot={}){
  const value=snapshot??{};
  const summary=value.summary;
  if(typeof value.schema!=="string"
    ||!Number.isInteger(value.event_count)
    ||!Array.isArray(value.events)
    ||!value.events.every(event=>typeof event?.signature==="string")
    ||!summary||typeof summary!=="object"||Array.isArray(summary)
    ||typeof summary.schema!=="string"
    ||typeof summary.signature!=="string"
    ||!Number.isInteger(summary.total)
    ||typeof summary.latest_signature!=="string"
    ||typeof summary.latest_action!=="string"
    ||typeof summary.latest_outcome!=="string"
    ||typeof summary.latest_code!=="string"
    ||typeof value.events_valid!=="boolean"
    ||typeof value.summary_valid!=="boolean"
    ||typeof value.summary_signature_valid!=="boolean"
    ||typeof value.signature_valid!=="boolean"
    ||typeof value.generated_at!=="string"){
    throw new TypeError("history export event history signature fields must be canonical");
  }
  return JSON.stringify({
    schema:value.schema,
    event_count:value.event_count,
    event_signatures:value.events.map(event=>event.signature),
    summary_schema:summary.schema,
    summary_signature:summary.signature,
    summary_total:summary.total,
    summary_latest_signature:summary.latest_signature,
    summary_latest_action:summary.latest_action,
    summary_latest_outcome:summary.latest_outcome,
    summary_latest_code:summary.latest_code,
    events_valid:value.events_valid,
    summary_valid:value.summary_valid,
    summary_signature_valid:value.summary_signature_valid,
    signature_valid:value.signature_valid,
    generated_at:value.generated_at
  });
}

export function dimensionAuditDownloadHistoryExportEventHistorySignatureValid(signature,snapshot={}){
  const value=snapshot??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&Number.isInteger(value.event_count)
    &&Array.isArray(value.events)
    &&value.events.every(event=>typeof event?.signature==="string")
    &&!!value.summary
    &&typeof value.summary==="object"
    &&!Array.isArray(value.summary)
    &&typeof value.summary.schema==="string"
    &&typeof value.summary.signature==="string"
    &&Number.isInteger(value.summary.total)
    &&typeof value.summary.latest_signature==="string"
    &&typeof value.summary.latest_action==="string"
    &&typeof value.summary.latest_outcome==="string"
    &&typeof value.summary.latest_code==="string"
    &&typeof value.events_valid==="boolean"
    &&typeof value.summary_valid==="boolean"
    &&typeof value.summary_signature_valid==="boolean"
    &&typeof value.signature_valid==="boolean"
    &&typeof value.generated_at==="string"
    &&signature===dimensionAuditDownloadHistoryExportEventHistorySignature(value);
}

export function dimensionAuditDownloadHistoryExportEventHistorySnapshot(events=[],generatedAt=new Date()){
  if(!Array.isArray(events))throw new TypeError("history export events must be an array");
  const timestamp=generatedAt instanceof Date?generatedAt:new Date(generatedAt);
  if(Number.isNaN(timestamp.getTime()))throw new TypeError("history export event snapshot generatedAt must be valid");
  const normalized=events.map(event=>freeze({...event}));
  const eventTimes=normalized.map(event=>new Date(String(event?.generated_at??"")).getTime());
  for(let index=1;index<eventTimes.length;index++){
    if(Number.isFinite(eventTimes[index-1])&&Number.isFinite(eventTimes[index])&&eventTimes[index]<eventTimes[index-1]){
      throw new RangeError("history export events must be chronological");
    }
  }
  const latestEventTime=Math.max(-Infinity,...eventTimes.filter(Number.isFinite));
  if(Number.isFinite(latestEventTime)&&timestamp.getTime()<latestEventTime){
    throw new RangeError("history export event snapshot cannot predate contained events");
  }
  const summary=dimensionAuditDownloadHistoryExportEventSummary(normalized);
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_HISTORY_SCHEMA,
    event_count:normalized.length,
    events:freeze(normalized),
    events_valid:normalized.every(event=>dimensionAuditDownloadHistoryExportEventValid(event)),
    summary,
    summary_valid:dimensionAuditDownloadHistoryExportEventSummaryValid(summary,normalized),
    summary_signature_valid:dimensionAuditDownloadHistoryExportEventSummarySignatureValid(summary.signature,summary),
    generated_at:timestamp.toISOString()
  };
  const withSignatureFlag={...base,signature_valid:true};
  return freeze({...withSignatureFlag,signature:dimensionAuditDownloadHistoryExportEventHistorySignature(withSignatureFlag)});
}

export function dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(snapshot={}){
  const value=snapshot??{};
  const events=Array.isArray(value.events)?value.events:null;
  if(typeof value.schema!=="string"||value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_HISTORY_SCHEMA||!events)return false;
  if(typeof value.generated_at!=="string"||typeof value.signature!=="string")return false;
  if(!Number.isInteger(value.event_count)||value.event_count!==events.length)return false;
  if(value.events_valid!==events.every(event=>dimensionAuditDownloadHistoryExportEventValid(event)))return false;
  if(value.events_valid!==true)return false;
  if(!dimensionAuditDownloadHistoryExportEventSummaryValid(value.summary,events))return false;
  if(value.summary_valid!==true)return false;
  if(value.summary_signature_valid!==true)return false;
  if(!dimensionAuditDownloadHistoryExportEventSummarySignatureValid(value.summary?.signature,value.summary))return false;
  if(value.signature_valid!==true)return false;
  const generatedAtText=value.generated_at;
  const generatedAt=new Date(generatedAtText);
  if(Number.isNaN(generatedAt.getTime())||generatedAt.toISOString()!==generatedAtText)return false;
  const eventTimes=events.map(event=>new Date(String(event?.generated_at??"")).getTime());
  for(let index=1;index<eventTimes.length;index++)if(eventTimes[index]<eventTimes[index-1])return false;
  if(eventTimes.some(time=>Number.isFinite(time)&&time>generatedAt.getTime()))return false;
  return dimensionAuditDownloadHistoryExportEventHistorySignatureValid(value.signature,value);
}

export function dimensionAuditDownloadHistorySummary(attempts=[]){
  if(!Array.isArray(attempts))throw new TypeError("audit download history attempts must be an array");
  const counts={blocked:0,downloaded:0,failed:0};
  for(const [index,attempt] of attempts.entries()){
    const status=String(attempt?.status??"");
    if(!Object.prototype.hasOwnProperty.call(counts,status)){
      throw new RangeError("unsupported audit download attempt status at index "+index+": "+status);
    }
    counts[status]++;
  }
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA,
    total:attempts.length,
    blocked:counts.blocked,
    downloaded:counts.downloaded,
    failed:counts.failed,
    latest_signature:String(attempts.at(-1)?.signature??"")
  });
}

export function dimensionAuditDownloadHistorySummaryValid(summary={},attempts=[]){
  if(!Array.isArray(attempts))return false;
  const signedAttempts=attempts.filter(attempt=>attempt?.schema===DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA);
  if(signedAttempts.length>0&&signedAttempts.length!==attempts.length)return false;
  if(signedAttempts.length===attempts.length&&!attempts.every(attempt=>dimensionAuditDownloadAttemptValid(attempt)))return false;
  if(signedAttempts.length===0&&!attempts.every(attempt=>
    !!attempt
    &&typeof attempt==="object"
    &&!Array.isArray(attempt)
    &&typeof attempt.status==="string"
    &&typeof attempt.signature==="string"
  ))return false;
  const value=summary??{};
  const counts={blocked:0,downloaded:0,failed:0};
  for(const attempt of attempts){
    const status=attempt.status;
    if(!Object.prototype.hasOwnProperty.call(counts,status))return false;
    counts[status]++;
  }
  const expectedLatest=attempts.length?attempts.at(-1).signature:"";
  return typeof value.schema==="string"
    &&value.schema===DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA
    &&typeof value.latest_signature==="string"
    &&Number.isInteger(value.total)&&value.total===attempts.length
    &&Number.isInteger(value.blocked)&&value.blocked===counts.blocked
    &&Number.isInteger(value.downloaded)&&value.downloaded===counts.downloaded
    &&Number.isInteger(value.failed)&&value.failed===counts.failed
    &&value.latest_signature===expectedLatest;
}

export function dimensionAuditDownloadHistorySummarySignature(summary={}){
  const value=summary??{};
  if(typeof value.schema!=="string"
    ||!Number.isInteger(value.total)
    ||!Number.isInteger(value.blocked)
    ||!Number.isInteger(value.downloaded)
    ||!Number.isInteger(value.failed)
    ||typeof value.latest_signature!=="string"){
    throw new TypeError("audit download history summary signature fields must be canonical");
  }
  return JSON.stringify({
    schema:value.schema,
    total:value.total,
    blocked:value.blocked,
    downloaded:value.downloaded,
    failed:value.failed,
    latest_signature:value.latest_signature
  });
}

export function dimensionAuditDownloadHistorySummarySignatureValid(signature,summary={},attempts=[]){
  if(!Array.isArray(attempts))return false;
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistorySummaryValid(summary,attempts)
    &&signature===dimensionAuditDownloadHistorySummarySignature(summary);
}

export function dimensionAuditDownloadHistorySignature(snapshot={}){
  const value=snapshot??{};
  if(typeof value.schema!=="string"
    ||typeof value.project_id!=="string"
    ||typeof value.project_name!=="string"
    ||!(value.generated_at==null||typeof value.generated_at==="string")
    ||typeof value.summary_signature!=="string"
    ||typeof value.protocol_state_signature!=="string"
    ||!Number.isInteger(value.attempt_count)
    ||!Array.isArray(value.attempts)
    ||!value.attempts.every(attempt=>typeof attempt?.signature==="string")){
    throw new TypeError("audit download history signature fields must be canonical");
  }
  return JSON.stringify({
    schema:value.schema,
    project_id:value.project_id,
    project_name:value.project_name,
    generated_at:value.generated_at??"",
    summary_signature:value.summary_signature,
    protocol_state_signature:value.protocol_state_signature,
    attempt_count:value.attempt_count,
    attempt_signatures:value.attempts.map(attempt=>attempt.signature)
  });
}

export function dimensionAuditDownloadHistorySignatureValid(signature,snapshot={}){
  const value=snapshot??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.project_id==="string"
    &&typeof value.project_name==="string"
    &&(value.generated_at==null||typeof value.generated_at==="string")
    &&typeof value.summary_signature==="string"
    &&typeof value.protocol_state_signature==="string"
    &&Number.isInteger(value.attempt_count)
    &&Array.isArray(value.attempts)
    &&value.attempts.every(attempt=>typeof attempt?.signature==="string")
    &&signature===dimensionAuditDownloadHistorySignature(value);
}

export function dimensionAuditDownloadHistoryIntegrity(snapshot={}){
  const value=snapshot??{};
  const attemptsArrayValid=Array.isArray(value.attempts);
  const attempts=attemptsArrayValid?value.attempts:[];
  const summary=value.summary??{};
  const historySchemaValid=typeof value.schema==="string"&&value.schema===DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA;
  const generatedAtValid=value.generated_at==null||(
    typeof value.generated_at==="string"
    &&(()=>{const date=new Date(value.generated_at);return !Number.isNaN(date.getTime())&&date.toISOString()===value.generated_at;})()
  );
  const attemptCountValid=attemptsArrayValid&&Number.isInteger(value.attempt_count)&&value.attempt_count===attempts.length;
  const attemptsValid=attemptsArrayValid&&attempts.every(attempt=>dimensionAuditDownloadAttemptValid(attempt));
  const summaryValid=attemptsArrayValid&&dimensionAuditDownloadHistorySummaryValid(summary,attempts);
  const summarySignatureValid=attemptsArrayValid
    &&dimensionAuditDownloadHistorySummarySignatureValid(value.summary_signature,summary,attempts);
  const protocolState=value.protocol_state??null;
  const protocolStateSignatureValid=!!protocolState
    &&dimensionAuditDownloadHistoryProtocolStateSignatureValid(value.protocol_state_signature,protocolState);
  const protocolStateValid=dimensionAuditDownloadHistoryProtocolBindingValid(value);
  const rawSignature=value.snapshot_signature;
  const snapshotSignatureTypeValid=rawSignature==null||typeof rawSignature==="string";
  const signature=typeof rawSignature==="string"?rawSignature:"";
  const snapshotSignatureValid=snapshotSignatureTypeValid
    &&(!signature||dimensionAuditDownloadHistorySignatureValid(signature,value));
  const errors=[
    !historySchemaValid?"INVALID_HISTORY_SCHEMA":null,
    !generatedAtValid?"INVALID_GENERATED_AT":null,
    !attemptCountValid?"INVALID_ATTEMPT_COUNT":null,
    !attemptsValid?"INVALID_ATTEMPTS":null,
    !summaryValid?"INVALID_SUMMARY":null,
    !summarySignatureValid?"INVALID_SUMMARY_SIGNATURE":null,
    !protocolStateValid?"INVALID_PROTOCOL_STATE":null,
    !protocolStateSignatureValid?"INVALID_PROTOCOL_STATE_SIGNATURE":null,
    !snapshotSignatureValid?"INVALID_SNAPSHOT_SIGNATURE":null
  ].filter(Boolean);
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_INTEGRITY_SCHEMA,
    valid:errors.length===0,
    code:errors[0]??"OK",
    errors,
    history_schema_valid:historySchemaValid,
    generated_at_valid:generatedAtValid,
    attempt_count_valid:attemptCountValid,
    attempts_valid:attemptsValid,
    summary_valid:summaryValid,
    summary_signature_valid:summarySignatureValid,
    protocol_state_valid:protocolStateValid,
    protocol_state_signature_valid:protocolStateSignatureValid,
    snapshot_signature_valid:snapshotSignatureValid
  });
}

export function dimensionAuditDownloadHistoryIntegritySignature(integrity={}){
  const value=integrity??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    valid:value.valid===true,
    code:String(value.code??""),
    errors:[...(value.errors??[])].map(code=>String(code)),
    history_schema_valid:value.history_schema_valid===true,
    generated_at_valid:value.generated_at_valid===true,
    attempt_count_valid:value.attempt_count_valid===true,
    attempts_valid:value.attempts_valid===true,
    summary_valid:value.summary_valid===true,
    summary_signature_valid:value.summary_signature_valid===true,
    protocol_state_valid:value.protocol_state_valid===true,
    protocol_state_signature_valid:value.protocol_state_signature_valid===true,
    snapshot_signature_valid:value.snapshot_signature_valid===true
  });
}

export function dimensionAuditDownloadHistoryIntegritySignatureValid(signature,integrity={}){
  const value=integrity??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.valid==="boolean"
    &&typeof value.code==="string"
    &&Array.isArray(value.errors)
    &&value.errors.every(code=>typeof code==="string")
    &&signature===dimensionAuditDownloadHistoryIntegritySignature(value);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_ENVELOPE_SCHEMA="TubeBender.DimensionAuditDownloadHistoryEnvelope.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_SCHEMA="TubeBender.DimensionAuditDownloadHistoryProtocol.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_VALIDATION_SCHEMA="TubeBender.DimensionAuditDownloadHistoryProtocolValidation.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_VALIDATION_CODES=freeze([
  "OK",
  "INVALID_PROTOCOL_SCHEMA",
  "INVALID_ATTEMPT_SCHEMA",
  "INVALID_HISTORY_SCHEMA",
  "INVALID_SUMMARY_SCHEMA",
  "INVALID_INTEGRITY_SCHEMA",
  "INVALID_INTEGRITY_CODES",
  "INVALID_ENVELOPE_SCHEMA",
  "INVALID_PROTOCOL_VALIDATION_SCHEMA",
  "INVALID_PROTOCOL_VALIDATION_CODES"
]);

export function dimensionAuditDownloadHistoryProtocol(){
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_SCHEMA,
    attempt_schema:DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA,
    history_schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA,
    summary_schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA,
    integrity_schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_INTEGRITY_SCHEMA,
    integrity_codes:[...DIMENSION_AUDIT_DOWNLOAD_HISTORY_INTEGRITY_CODES],
    envelope_schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_ENVELOPE_SCHEMA,
    validation_schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_VALIDATION_SCHEMA,
    validation_codes:[...DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_VALIDATION_CODES]
  });
}

export function dimensionAuditDownloadHistoryProtocolSignature(protocol=dimensionAuditDownloadHistoryProtocol()){
  const value=protocol??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    attempt_schema:String(value.attempt_schema??""),
    history_schema:String(value.history_schema??""),
    summary_schema:String(value.summary_schema??""),
    integrity_schema:String(value.integrity_schema??""),
    integrity_codes:[...(value.integrity_codes??[])].map(code=>String(code)),
    envelope_schema:String(value.envelope_schema??""),
    validation_schema:String(value.validation_schema??""),
    validation_codes:[...(value.validation_codes??[])].map(code=>String(code))
  });
}

export function dimensionAuditDownloadHistoryProtocolSignatureValid(signature,protocol=dimensionAuditDownloadHistoryProtocol()){
  const validation=dimensionAuditDownloadHistoryProtocolValidation(protocol);
  return typeof signature==="string"
    &&signature.length>0
    &&validation.valid===true
    &&signature===dimensionAuditDownloadHistoryProtocolSignature(protocol);
}

export function dimensionAuditDownloadHistoryProtocolValidation(protocol=dimensionAuditDownloadHistoryProtocol()){
  const value=protocol??{};
  const scalarValid=(field,expected)=>typeof field==="string"&&field===expected;
  const integrityCodesValid=Array.isArray(value.integrity_codes)
    &&value.integrity_codes.every(code=>typeof code==="string")
    &&JSON.stringify(value.integrity_codes)===JSON.stringify([...DIMENSION_AUDIT_DOWNLOAD_HISTORY_INTEGRITY_CODES]);
  const validationCodesValid=Array.isArray(value.validation_codes)
    &&value.validation_codes.every(code=>typeof code==="string")
    &&JSON.stringify(value.validation_codes)===JSON.stringify([...DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_VALIDATION_CODES]);
  const errors=[
    !scalarValid(value.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_SCHEMA)?"INVALID_PROTOCOL_SCHEMA":null,
    !scalarValid(value.attempt_schema,DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA)?"INVALID_ATTEMPT_SCHEMA":null,
    !scalarValid(value.history_schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA)?"INVALID_HISTORY_SCHEMA":null,
    !scalarValid(value.summary_schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA)?"INVALID_SUMMARY_SCHEMA":null,
    !scalarValid(value.integrity_schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_INTEGRITY_SCHEMA)?"INVALID_INTEGRITY_SCHEMA":null,
    !integrityCodesValid?"INVALID_INTEGRITY_CODES":null,
    !scalarValid(value.envelope_schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_ENVELOPE_SCHEMA)?"INVALID_ENVELOPE_SCHEMA":null,
    !scalarValid(value.validation_schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_VALIDATION_SCHEMA)?"INVALID_PROTOCOL_VALIDATION_SCHEMA":null,
    !validationCodesValid?"INVALID_PROTOCOL_VALIDATION_CODES":null
  ].filter(Boolean);
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_VALIDATION_SCHEMA,
    valid:errors.length===0,
    code:errors[0]??"OK",
    errors
  });
}

export function dimensionAuditDownloadHistoryProtocolValidationSignature(validation=dimensionAuditDownloadHistoryProtocolValidation()){
  const value=validation??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    valid:value.valid===true,
    code:String(value.code??""),
    errors:[...(value.errors??[])].map(code=>String(code))
  });
}

export function dimensionAuditDownloadHistoryProtocolValidationSignatureValid(signature,validation=dimensionAuditDownloadHistoryProtocolValidation()){
  const value=validation??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.valid==="boolean"
    &&typeof value.code==="string"
    &&Array.isArray(value.errors)
    &&value.errors.every(code=>typeof code==="string")
    &&signature===dimensionAuditDownloadHistoryProtocolValidationSignature(value);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_STATE_SCHEMA="TubeBender.DimensionAuditDownloadHistoryProtocolState.v1";

export function dimensionAuditDownloadHistoryProtocolState(){
  const protocol=dimensionAuditDownloadHistoryProtocol();
  const validation=dimensionAuditDownloadHistoryProtocolValidation(protocol);
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_STATE_SCHEMA,
    valid:validation.valid===true,
    protocol,
    protocol_signature:dimensionAuditDownloadHistoryProtocolSignature(protocol),
    validation,
    validation_signature:dimensionAuditDownloadHistoryProtocolValidationSignature(validation)
  });
}

export function dimensionAuditDownloadHistoryProtocolStateSignature(state=dimensionAuditDownloadHistoryProtocolState()){
  const value=state??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    valid:value.valid===true,
    protocol_signature:String(value.protocol_signature??""),
    validation_signature:String(value.validation_signature??"")
  });
}

export function dimensionAuditDownloadHistoryProtocolStateSignatureValid(signature,state=dimensionAuditDownloadHistoryProtocolState()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryProtocolStateValid(state)
    &&signature===dimensionAuditDownloadHistoryProtocolStateSignature(state);
}

export function dimensionAuditDownloadHistoryProtocolStateValid(state=dimensionAuditDownloadHistoryProtocolState()){
  const value=state??{};
  const protocol=value.protocol??{};
  const validation=value.validation??{};
  if(typeof value.schema!=="string"
    ||typeof value.valid!=="boolean"
    ||typeof value.protocol_signature!=="string"
    ||typeof value.validation_signature!=="string"
    ||typeof validation.schema!=="string"
    ||typeof validation.valid!=="boolean"
    ||typeof validation.code!=="string"
    ||!Array.isArray(validation.errors)
    ||!validation.errors.every(code=>typeof code==="string"))return false;
  const expectedValidation=dimensionAuditDownloadHistoryProtocolValidation(protocol);
  return value.schema===DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_STATE_SCHEMA
    &&value.valid===true
    &&validation.valid===true
    &&expectedValidation.valid===true
    &&validation.schema===expectedValidation.schema
    &&validation.code===expectedValidation.code
    &&JSON.stringify(validation.errors)===JSON.stringify(expectedValidation.errors)
    &&dimensionAuditDownloadHistoryProtocolSignatureValid(value.protocol_signature,protocol)
    &&dimensionAuditDownloadHistoryProtocolValidationSignatureValid(value.validation_signature,validation)
    &&dimensionAuditDownloadHistoryProtocolValidationSignature(expectedValidation)===value.validation_signature;
}

export function dimensionAuditDownloadHistoryProtocolBindingValid(snapshot={}){
  const value=snapshot??{};
  const state=value.protocol_state??null;
  return !!state
    &&dimensionAuditDownloadHistoryProtocolStateSignatureValid(value.protocol_state_signature,state);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_BINDING_SCHEMA="TubeBender.DimensionAuditDownloadHistoryProtocolBinding.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_BINDING_CODES=freeze([
  "OK",
  "MISSING_PROTOCOL_STATE",
  "INVALID_PROTOCOL_STATE",
  "INVALID_PROTOCOL_STATE_SIGNATURE"
]);

export function dimensionAuditDownloadHistoryProtocolBinding(snapshot={}){
  const value=snapshot??{};
  const state=value.protocol_state??null;
  const statePresent=!!state;
  const stateValid=statePresent&&dimensionAuditDownloadHistoryProtocolStateValid(state);
  const signatureValid=statePresent
    &&dimensionAuditDownloadHistoryProtocolStateSignatureValid(value.protocol_state_signature,state);
  const errors=[
    !statePresent?"MISSING_PROTOCOL_STATE":null,
    statePresent&&!stateValid?"INVALID_PROTOCOL_STATE":null,
    statePresent&&!signatureValid?"INVALID_PROTOCOL_STATE_SIGNATURE":null
  ].filter(Boolean);
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_BINDING_SCHEMA,
    valid:errors.length===0,
    code:errors[0]??"OK",
    errors,
    state_present:statePresent,
    state_valid:stateValid,
    signature_valid:signatureValid
  });
}

export function dimensionAuditDownloadHistoryProtocolBindingSignature(binding=dimensionAuditDownloadHistoryProtocolBinding()){
  const value=binding??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    valid:value.valid===true,
    code:String(value.code??""),
    errors:[...(value.errors??[])].map(code=>String(code)),
    state_present:value.state_present===true,
    state_valid:value.state_valid===true,
    signature_valid:value.signature_valid===true
  });
}

export function dimensionAuditDownloadHistoryProtocolBindingSignatureValid(signature,binding=dimensionAuditDownloadHistoryProtocolBinding()){
  const value=binding??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.valid==="boolean"
    &&typeof value.code==="string"
    &&Array.isArray(value.errors)
    &&value.errors.every(code=>typeof code==="string")
    &&typeof value.state_present==="boolean"
    &&typeof value.state_valid==="boolean"
    &&typeof value.signature_valid==="boolean"
    &&signature===dimensionAuditDownloadHistoryProtocolBindingSignature(value);
}

export function dimensionAuditDownloadHistoryEnvelopeSignature(snapshot={}){
  const value=snapshot??{};
  return JSON.stringify({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_ENVELOPE_SCHEMA,
    history_schema:String(value.schema??""),
    snapshot_signature:String(value.snapshot_signature??""),
    protocol_state_signature:String(value.protocol_state_signature??""),
    protocol_binding_signature:String(value.protocol_binding_signature??""),
    integrity_signature:String(value.integrity_signature??""),
    protocol_binding_valid:value.protocol_binding_valid===true,
    attempts_valid:value.attempts_valid===true,
    summary_valid:value.summary_valid===true,
    valid:value.valid===true
  });
}

export function dimensionAuditDownloadHistoryEnvelopeSignatureValid(signature,snapshot={}){
  const value=snapshot??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.snapshot_signature==="string"
    &&typeof value.protocol_state_signature==="string"
    &&typeof value.protocol_binding_signature==="string"
    &&typeof value.integrity_signature==="string"
    &&typeof value.protocol_binding_valid==="boolean"
    &&typeof value.attempts_valid==="boolean"
    &&typeof value.summary_valid==="boolean"
    &&typeof value.valid==="boolean"
    &&signature===dimensionAuditDownloadHistoryEnvelopeSignature(value);
}

export function dimensionAuditDownloadHistoryEnvelopeValid(snapshot={}){
  const value=snapshot??{};
  const coreIntegrity=dimensionAuditDownloadHistoryIntegrity(value);
  const embeddedIntegrity=value.integrity??null;
  const embeddedIntegritySignatureValid=typeof value.integrity_signature==="string";
  const embeddedIntegritySignature=embeddedIntegritySignatureValid?value.integrity_signature:"";
  const embeddedIntegrityValid=!!embeddedIntegrity
    &&embeddedIntegritySignatureValid
    &&dimensionAuditDownloadHistoryIntegritySignatureValid(embeddedIntegritySignature,embeddedIntegrity)
    &&dimensionAuditDownloadHistoryIntegritySignatureValid(embeddedIntegritySignature,coreIntegrity);
  const embeddedBinding=value.protocol_binding??null;
  const embeddedBindingSignatureValid=typeof value.protocol_binding_signature==="string";
  const embeddedBindingSignature=embeddedBindingSignatureValid?value.protocol_binding_signature:"";
  const coreBinding=dimensionAuditDownloadHistoryProtocolBinding(value);
  const embeddedBindingValid=!!embeddedBinding
    &&embeddedBindingSignatureValid
    &&dimensionAuditDownloadHistoryProtocolBindingSignatureValid(embeddedBindingSignature,embeddedBinding)
    &&dimensionAuditDownloadHistoryProtocolBindingSignatureValid(embeddedBindingSignature,coreBinding);
  const rawEnvelopeSignature=value.envelope_signature;
  const envelopeSignatureTypeValid=rawEnvelopeSignature==null||typeof rawEnvelopeSignature==="string";
  const envelopeSignature=typeof rawEnvelopeSignature==="string"?rawEnvelopeSignature:"";
  const envelopeSignatureValid=envelopeSignatureTypeValid
    &&(!envelopeSignature||dimensionAuditDownloadHistoryEnvelopeSignatureValid(envelopeSignature,value));
  return coreIntegrity.valid
    &&embeddedIntegrityValid
    &&embeddedBindingValid
    &&value.attempts_valid===coreIntegrity.attempts_valid
    &&value.summary_valid===coreIntegrity.summary_valid
    &&value.protocol_binding_valid===dimensionAuditDownloadHistoryProtocolBindingValid(value)
    &&value.valid===coreIntegrity.valid
    &&envelopeSignatureValid;
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_HEALTH_SCHEMA="TubeBender.DimensionAuditDownloadHistoryHealth.v1";

export function dimensionAuditDownloadHistoryHealth(snapshot={}){
  const value=snapshot??{};
  const protocolStateValid=dimensionAuditDownloadHistoryProtocolStateValid(value.protocol_state??{});
  const binding=dimensionAuditDownloadHistoryProtocolBinding(value);
  const integrity=dimensionAuditDownloadHistoryIntegrity(value);
  const envelopeValid=dimensionAuditDownloadHistoryEnvelopeValid(value);
  const errors=[
    !protocolStateValid?"INVALID_PROTOCOL_STATE":null,
    !binding.valid?"INVALID_PROTOCOL_BINDING":null,
    !integrity.valid?"INVALID_INTEGRITY":null,
    !envelopeValid?"INVALID_ENVELOPE":null
  ].filter(Boolean);
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_HEALTH_SCHEMA,
    valid:errors.length===0,
    code:errors[0]??"OK",
    errors,
    protocol_state_valid:protocolStateValid,
    protocol_binding_valid:binding.valid===true,
    protocol_binding_code:String(binding.code??""),
    integrity_valid:integrity.valid===true,
    integrity_code:String(integrity.code??""),
    envelope_valid:envelopeValid
  });
}

export function dimensionAuditDownloadHistoryHealthSignature(health=dimensionAuditDownloadHistoryHealth()){
  const value=health??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    valid:value.valid===true,
    code:String(value.code??""),
    errors:[...(value.errors??[])].map(code=>String(code)),
    protocol_state_valid:value.protocol_state_valid===true,
    protocol_binding_valid:value.protocol_binding_valid===true,
    protocol_binding_code:String(value.protocol_binding_code??""),
    integrity_valid:value.integrity_valid===true,
    integrity_code:String(value.integrity_code??""),
    envelope_valid:value.envelope_valid===true
  });
}

export function dimensionAuditDownloadHistoryHealthSignatureValid(signature,health=dimensionAuditDownloadHistoryHealth()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryHealthCanonical(health)
    &&signature===dimensionAuditDownloadHistoryHealthSignature(health);
}

function dimensionAuditDownloadHistoryHealthCanonical(health={}){
  const value=health??{};
  return typeof value.schema==="string"
    &&typeof value.valid==="boolean"
    &&typeof value.code==="string"
    &&Array.isArray(value.errors)
    &&value.errors.every(code=>typeof code==="string")
    &&typeof value.protocol_state_valid==="boolean"
    &&typeof value.protocol_binding_valid==="boolean"
    &&typeof value.protocol_binding_code==="string"
    &&typeof value.integrity_valid==="boolean"
    &&typeof value.integrity_code==="string"
    &&typeof value.envelope_valid==="boolean";
}

export function dimensionAuditDownloadHistoryEmbeddedHealthValid(snapshot={}){
  const value=snapshot??{};
  const embedded=value.health??null;
  const signature=value.health_signature;
  if(!embedded||typeof signature!=="string"||signature.length===0)return false;
  if(!dimensionAuditDownloadHistoryHealthCanonical(embedded))return false;
  const embeddedValid=dimensionAuditDownloadHistoryHealthSignatureValid(signature,embedded);
  const current=dimensionAuditDownloadHistoryHealth(value);
  const currentValid=dimensionAuditDownloadHistoryHealthSignatureValid(signature,current);
  return embeddedValid&&currentValid;
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_HEALTH_EMBEDDING_SCHEMA="TubeBender.DimensionAuditDownloadHistoryHealthEmbedding.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_HEALTH_EMBEDDING_CODES=freeze([
  "OK",
  "MISSING_HEALTH",
  "INVALID_HEALTH_SIGNATURE",
  "STALE_HEALTH"
]);

export function dimensionAuditDownloadHistoryHealthEmbedding(snapshot={}){
  const value=snapshot??{};
  const embedded=value.health??null;
  const signaturePresent=value.health_signature!=null;
  const signatureTypeValid=typeof value.health_signature==="string"&&value.health_signature.length>0;
  const signature=signatureTypeValid?value.health_signature:"";
  const present=!!embedded&&signaturePresent;
  const signatureValid=present
    &&signatureTypeValid
    &&dimensionAuditDownloadHistoryHealthCanonical(embedded)
    &&dimensionAuditDownloadHistoryHealthSignature(embedded)===signature;
  const current=dimensionAuditDownloadHistoryHealth(value);
  const currentSignature=dimensionAuditDownloadHistoryHealthSignature(current);
  const currentValid=signatureValid&&currentSignature===signature;
  const errors=[
    !present?"MISSING_HEALTH":null,
    present&&!signatureValid?"INVALID_HEALTH_SIGNATURE":null,
    present&&signatureValid&&!currentValid?"STALE_HEALTH":null
  ].filter(Boolean);
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_HEALTH_EMBEDDING_SCHEMA,
    valid:errors.length===0,
    code:errors[0]??"OK",
    errors,
    present,
    signature_valid:signatureValid,
    current_valid:currentValid,
    current_signature:currentSignature
  });
}

export function dimensionAuditDownloadHistoryHealthEmbeddingSignature(embedding=dimensionAuditDownloadHistoryHealthEmbedding()){
  const value=embedding??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    valid:value.valid===true,
    code:String(value.code??""),
    errors:[...(value.errors??[])].map(code=>String(code)),
    present:value.present===true,
    signature_valid:value.signature_valid===true,
    current_valid:value.current_valid===true,
    current_signature:String(value.current_signature??"")
  });
}

export function dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid(signature,embedding=dimensionAuditDownloadHistoryHealthEmbedding()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryHealthEmbeddingCanonical(embedding)
    &&signature===dimensionAuditDownloadHistoryHealthEmbeddingSignature(embedding);
}

function dimensionAuditDownloadHistoryHealthEmbeddingCanonical(embedding={}){
  const value=embedding??{};
  return typeof value.schema==="string"
    &&typeof value.valid==="boolean"
    &&typeof value.code==="string"
    &&Array.isArray(value.errors)
    &&value.errors.every(code=>typeof code==="string")
    &&typeof value.present==="boolean"
    &&typeof value.signature_valid==="boolean"
    &&typeof value.current_valid==="boolean"
    &&typeof value.current_signature==="string";
}

export function dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid(snapshot={}){
  const value=snapshot??{};
  const embedded=value.health_embedding??null;
  const signature=value.health_embedding_signature;
  if(!embedded||typeof signature!=="string"||signature.length===0)return false;
  if(!dimensionAuditDownloadHistoryHealthEmbeddingCanonical(embedded))return false;
  const embeddedValid=dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid(signature,embedded);
  const current=dimensionAuditDownloadHistoryHealthEmbedding(value);
  const currentValid=dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid(signature,current);
  return embeddedValid&&currentValid;
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_VERIFICATION_SCHEMA="TubeBender.DimensionAuditDownloadHistoryVerification.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_VERIFICATION_CODES=freeze([
  "OK",
  "INVALID_PROTOCOL_BINDING",
  "INVALID_INTEGRITY",
  "INVALID_ENVELOPE",
  "INVALID_HEALTH",
  "INVALID_EMBEDDED_HEALTH",
  "INVALID_HEALTH_EMBEDDING"
]);

export function dimensionAuditDownloadHistoryVerification(snapshot={}){
  const value=snapshot??{};
  const bindingValid=dimensionAuditDownloadHistoryProtocolBindingValid(value);
  const integrity=dimensionAuditDownloadHistoryIntegrity(value);
  const envelopeValid=dimensionAuditDownloadHistoryEnvelopeValid(value);
  const health=dimensionAuditDownloadHistoryHealth(value);
  const embeddedHealthValid=dimensionAuditDownloadHistoryEmbeddedHealthValid(value);
  const healthEmbeddingValid=dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid(value);
  const errors=[
    !bindingValid?"INVALID_PROTOCOL_BINDING":null,
    !integrity.valid?"INVALID_INTEGRITY":null,
    !envelopeValid?"INVALID_ENVELOPE":null,
    !health.valid?"INVALID_HEALTH":null,
    !embeddedHealthValid?"INVALID_EMBEDDED_HEALTH":null,
    !healthEmbeddingValid?"INVALID_HEALTH_EMBEDDING":null
  ].filter(Boolean);
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_VERIFICATION_SCHEMA,
    valid:errors.length===0,
    code:errors[0]??"OK",
    errors,
    protocol_binding_valid:bindingValid,
    integrity_valid:integrity.valid===true,
    envelope_valid:envelopeValid,
    health_valid:health.valid===true,
    embedded_health_valid:embeddedHealthValid,
    health_embedding_valid:healthEmbeddingValid
  });
}

export function dimensionAuditDownloadHistoryVerificationSignature(verification=dimensionAuditDownloadHistoryVerification()){
  const value=verification??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    valid:value.valid===true,
    code:String(value.code??""),
    errors:[...(value.errors??[])].map(code=>String(code)),
    protocol_binding_valid:value.protocol_binding_valid===true,
    integrity_valid:value.integrity_valid===true,
    envelope_valid:value.envelope_valid===true,
    health_valid:value.health_valid===true,
    embedded_health_valid:value.embedded_health_valid===true,
    health_embedding_valid:value.health_embedding_valid===true
  });
}

export function dimensionAuditDownloadHistoryVerificationSignatureValid(signature,verification=dimensionAuditDownloadHistoryVerification()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryVerificationCanonical(verification)
    &&signature===dimensionAuditDownloadHistoryVerificationSignature(verification);
}

function dimensionAuditDownloadHistoryVerificationCanonical(verification={}){
  const value=verification??{};
  return typeof value.schema==="string"
    &&typeof value.valid==="boolean"
    &&typeof value.code==="string"
    &&Array.isArray(value.errors)
    &&value.errors.every(code=>typeof code==="string")
    &&typeof value.protocol_binding_valid==="boolean"
    &&typeof value.integrity_valid==="boolean"
    &&typeof value.envelope_valid==="boolean"
    &&typeof value.health_valid==="boolean"
    &&typeof value.embedded_health_valid==="boolean"
    &&typeof value.health_embedding_valid==="boolean";
}

export function dimensionAuditDownloadHistoryEmbeddedVerificationValid(snapshot={}){
  const value=snapshot??{};
  const embedded=value.verification??null;
  const signature=value.verification_signature;
  if(!embedded||typeof signature!=="string"||signature.length===0)return false;
  if(!dimensionAuditDownloadHistoryVerificationCanonical(embedded))return false;
  const embeddedValid=dimensionAuditDownloadHistoryVerificationSignatureValid(signature,embedded);
  const current=dimensionAuditDownloadHistoryVerification(value);
  const currentValid=dimensionAuditDownloadHistoryVerificationSignatureValid(signature,current);
  return embeddedValid&&currentValid;
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_VERIFICATION_EMBEDDING_SCHEMA="TubeBender.DimensionAuditDownloadHistoryVerificationEmbedding.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_VERIFICATION_EMBEDDING_CODES=freeze([
  "OK",
  "MISSING_VERIFICATION",
  "INVALID_VERIFICATION_SIGNATURE",
  "STALE_VERIFICATION"
]);

export function dimensionAuditDownloadHistoryVerificationEmbedding(snapshot={}){
  const value=snapshot??{};
  const embedded=value.verification??null;
  const signaturePresent=value.verification_signature!=null;
  const signatureTypeValid=typeof value.verification_signature==="string"&&value.verification_signature.length>0;
  const signature=signatureTypeValid?value.verification_signature:"";
  const present=!!embedded&&signaturePresent;
  const signatureValid=present
    &&signatureTypeValid
    &&dimensionAuditDownloadHistoryVerificationCanonical(embedded)
    &&dimensionAuditDownloadHistoryVerificationSignature(embedded)===signature;
  const current=dimensionAuditDownloadHistoryVerification(value);
  const currentSignature=dimensionAuditDownloadHistoryVerificationSignature(current);
  const currentValid=signatureValid&&currentSignature===signature;
  const errors=[
    !present?"MISSING_VERIFICATION":null,
    present&&!signatureValid?"INVALID_VERIFICATION_SIGNATURE":null,
    present&&signatureValid&&!currentValid?"STALE_VERIFICATION":null
  ].filter(Boolean);
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_VERIFICATION_EMBEDDING_SCHEMA,
    valid:errors.length===0,
    code:errors[0]??"OK",
    errors,
    present,
    signature_valid:signatureValid,
    current_valid:currentValid,
    current_signature:currentSignature
  });
}

export function dimensionAuditDownloadHistoryVerificationEmbeddingSignature(embedding=dimensionAuditDownloadHistoryVerificationEmbedding()){
  const value=embedding??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    valid:value.valid===true,
    code:String(value.code??""),
    errors:[...(value.errors??[])].map(code=>String(code)),
    present:value.present===true,
    signature_valid:value.signature_valid===true,
    current_valid:value.current_valid===true,
    current_signature:String(value.current_signature??"")
  });
}

export function dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid(signature,embedding=dimensionAuditDownloadHistoryVerificationEmbedding()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryVerificationEmbeddingCanonical(embedding)
    &&signature===dimensionAuditDownloadHistoryVerificationEmbeddingSignature(embedding);
}

function dimensionAuditDownloadHistoryVerificationEmbeddingCanonical(embedding={}){
  const value=embedding??{};
  return typeof value.schema==="string"
    &&typeof value.valid==="boolean"
    &&typeof value.code==="string"
    &&Array.isArray(value.errors)
    &&value.errors.every(code=>typeof code==="string")
    &&typeof value.present==="boolean"
    &&typeof value.signature_valid==="boolean"
    &&typeof value.current_valid==="boolean"
    &&typeof value.current_signature==="string";
}

export function dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(snapshot={}){
  const value=snapshot??{};
  const embedded=value.verification_embedding??null;
  const signature=value.verification_embedding_signature;
  if(!embedded||typeof signature!=="string"||signature.length===0)return false;
  if(!dimensionAuditDownloadHistoryVerificationEmbeddingCanonical(embedded))return false;
  const embeddedValid=dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid(signature,embedded);
  const current=dimensionAuditDownloadHistoryVerificationEmbedding(value);
  const currentValid=dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid(signature,current);
  return embeddedValid&&currentValid;
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_ATTESTATION_SCHEMA="TubeBender.DimensionAuditDownloadHistoryAttestation.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_ATTESTATION_CODES=freeze([
  "OK",
  "INVALID_VERIFICATION",
  "INVALID_EMBEDDED_VERIFICATION",
  "INVALID_VERIFICATION_EMBEDDING",
  "INVALID_EMBEDDED_VERIFICATION_EMBEDDING"
]);

export function dimensionAuditDownloadHistoryAttestation(snapshot={}){
  const value=snapshot??{};
  const verification=dimensionAuditDownloadHistoryVerification(value);
  const embeddedVerificationValid=dimensionAuditDownloadHistoryEmbeddedVerificationValid(value);
  const verificationEmbedding=dimensionAuditDownloadHistoryVerificationEmbedding(value);
  const embeddedVerificationEmbeddingValid=dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(value);
  const errors=[
    !verification.valid?"INVALID_VERIFICATION":null,
    !embeddedVerificationValid?"INVALID_EMBEDDED_VERIFICATION":null,
    !verificationEmbedding.valid?"INVALID_VERIFICATION_EMBEDDING":null,
    !embeddedVerificationEmbeddingValid?"INVALID_EMBEDDED_VERIFICATION_EMBEDDING":null
  ].filter(Boolean);
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_ATTESTATION_SCHEMA,
    valid:errors.length===0,
    code:errors[0]??"OK",
    errors,
    verification_valid:verification.valid===true,
    embedded_verification_valid:embeddedVerificationValid,
    verification_embedding_valid:verificationEmbedding.valid===true,
    embedded_verification_embedding_valid:embeddedVerificationEmbeddingValid
  });
}

export function dimensionAuditDownloadHistoryAttestationSignature(attestation=dimensionAuditDownloadHistoryAttestation()){
  const value=attestation??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    valid:value.valid===true,
    code:String(value.code??""),
    errors:[...(value.errors??[])].map(code=>String(code)),
    verification_valid:value.verification_valid===true,
    embedded_verification_valid:value.embedded_verification_valid===true,
    verification_embedding_valid:value.verification_embedding_valid===true,
    embedded_verification_embedding_valid:value.embedded_verification_embedding_valid===true
  });
}

export function dimensionAuditDownloadHistoryAttestationSignatureValid(signature,attestation=dimensionAuditDownloadHistoryAttestation()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryAttestationCanonical(attestation)
    &&signature===dimensionAuditDownloadHistoryAttestationSignature(attestation);
}

function dimensionAuditDownloadHistoryAttestationCanonical(attestation={}){
  const value=attestation??{};
  return typeof value.schema==="string"
    &&typeof value.valid==="boolean"
    &&typeof value.code==="string"
    &&Array.isArray(value.errors)
    &&value.errors.every(code=>typeof code==="string")
    &&typeof value.verification_valid==="boolean"
    &&typeof value.embedded_verification_valid==="boolean"
    &&typeof value.verification_embedding_valid==="boolean"
    &&typeof value.embedded_verification_embedding_valid==="boolean";
}

export function dimensionAuditDownloadHistoryEmbeddedAttestationValid(snapshot={}){
  const value=snapshot??{};
  const embedded=value.attestation??null;
  const signature=value.attestation_signature;
  if(!embedded||typeof signature!=="string"||signature.length===0)return false;
  if(!dimensionAuditDownloadHistoryAttestationCanonical(embedded))return false;
  const embeddedValid=dimensionAuditDownloadHistoryAttestationSignatureValid(signature,embedded);
  const current=dimensionAuditDownloadHistoryAttestation(value);
  const currentValid=dimensionAuditDownloadHistoryAttestationSignatureValid(signature,current);
  return embeddedValid&&currentValid;
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_ATTESTATION_EMBEDDING_SCHEMA="TubeBender.DimensionAuditDownloadHistoryAttestationEmbedding.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_ATTESTATION_EMBEDDING_CODES=freeze([
  "OK",
  "MISSING_ATTESTATION",
  "INVALID_ATTESTATION_SIGNATURE",
  "STALE_ATTESTATION"
]);

export function dimensionAuditDownloadHistoryAttestationEmbedding(snapshot={}){
  const value=snapshot??{};
  const embedded=value.attestation??null;
  const signaturePresent=value.attestation_signature!=null;
  const signatureTypeValid=typeof value.attestation_signature==="string"&&value.attestation_signature.length>0;
  const signature=signatureTypeValid?value.attestation_signature:"";
  const present=!!embedded&&signaturePresent;
  const signatureValid=present
    &&signatureTypeValid
    &&dimensionAuditDownloadHistoryAttestationCanonical(embedded)
    &&dimensionAuditDownloadHistoryAttestationSignature(embedded)===signature;
  const current=dimensionAuditDownloadHistoryAttestation(value);
  const currentSignature=dimensionAuditDownloadHistoryAttestationSignature(current);
  const currentValid=signatureValid&&currentSignature===signature;
  const errors=[
    !present?"MISSING_ATTESTATION":null,
    present&&!signatureValid?"INVALID_ATTESTATION_SIGNATURE":null,
    present&&signatureValid&&!currentValid?"STALE_ATTESTATION":null
  ].filter(Boolean);
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_ATTESTATION_EMBEDDING_SCHEMA,
    valid:errors.length===0,
    code:errors[0]??"OK",
    errors,
    present,
    signature_valid:signatureValid,
    current_valid:currentValid,
    current_signature:currentSignature
  });
}

export function dimensionAuditDownloadHistoryAttestationEmbeddingSignature(embedding=dimensionAuditDownloadHistoryAttestationEmbedding()){
  const value=embedding??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    valid:value.valid===true,
    code:String(value.code??""),
    errors:[...(value.errors??[])].map(code=>String(code)),
    present:value.present===true,
    signature_valid:value.signature_valid===true,
    current_valid:value.current_valid===true,
    current_signature:String(value.current_signature??"")
  });
}

export function dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid(signature,embedding=dimensionAuditDownloadHistoryAttestationEmbedding()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryAttestationEmbeddingCanonical(embedding)
    &&signature===dimensionAuditDownloadHistoryAttestationEmbeddingSignature(embedding);
}

function dimensionAuditDownloadHistoryAttestationEmbeddingCanonical(embedding={}){
  const value=embedding??{};
  return typeof value.schema==="string"
    &&typeof value.valid==="boolean"
    &&typeof value.code==="string"
    &&Array.isArray(value.errors)
    &&value.errors.every(code=>typeof code==="string")
    &&typeof value.present==="boolean"
    &&typeof value.signature_valid==="boolean"
    &&typeof value.current_valid==="boolean"
    &&typeof value.current_signature==="string";
}

export function dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(snapshot={}){
  const value=snapshot??{};
  const embedded=value.attestation_embedding??null;
  const signature=value.attestation_embedding_signature;
  if(!embedded||typeof signature!=="string"||signature.length===0)return false;
  if(!dimensionAuditDownloadHistoryAttestationEmbeddingCanonical(embedded))return false;
  const embeddedValid=dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid(signature,embedded);
  const current=dimensionAuditDownloadHistoryAttestationEmbedding(value);
  const currentValid=dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid(signature,current);
  return embeddedValid&&currentValid;
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_TRUST_SCHEMA="TubeBender.DimensionAuditDownloadHistoryTrust.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_TRUST_CODES=freeze([
  "OK",
  "INVALID_ATTESTATION",
  "INVALID_EMBEDDED_ATTESTATION",
  "INVALID_ATTESTATION_EMBEDDING",
  "INVALID_EMBEDDED_ATTESTATION_EMBEDDING"
]);

export function dimensionAuditDownloadHistoryTrust(snapshot={}){
  const value=snapshot??{};
  const attestation=dimensionAuditDownloadHistoryAttestation(value);
  const embeddedAttestationValid=dimensionAuditDownloadHistoryEmbeddedAttestationValid(value);
  const attestationEmbedding=dimensionAuditDownloadHistoryAttestationEmbedding(value);
  const embeddedAttestationEmbeddingValid=dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(value);
  const errors=[
    !attestation.valid?"INVALID_ATTESTATION":null,
    !embeddedAttestationValid?"INVALID_EMBEDDED_ATTESTATION":null,
    !attestationEmbedding.valid?"INVALID_ATTESTATION_EMBEDDING":null,
    !embeddedAttestationEmbeddingValid?"INVALID_EMBEDDED_ATTESTATION_EMBEDDING":null
  ].filter(Boolean);
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_TRUST_SCHEMA,
    trusted:errors.length===0,
    code:errors[0]??"OK",
    errors,
    attestation_valid:attestation.valid===true,
    embedded_attestation_valid:embeddedAttestationValid,
    attestation_embedding_valid:attestationEmbedding.valid===true,
    embedded_attestation_embedding_valid:embeddedAttestationEmbeddingValid
  });
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportReadiness.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_CODES=freeze([
  "READY",
  "EMPTY",
  "VERIFICATION_FAILED",
  "UNTRUSTED",
  "INVALID_PROVENANCE"
]);

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_PROTOCOL_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportReadinessProtocol.v1";

export function dimensionAuditDownloadHistoryExportReadinessProtocol(){
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_PROTOCOL_SCHEMA,
    state_schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SCHEMA,
    snapshot_schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SNAPSHOT_SCHEMA,
    codes:[...DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_CODES]
  });
}

export function dimensionAuditDownloadHistoryExportReadinessProtocolSignature(protocol=dimensionAuditDownloadHistoryExportReadinessProtocol()){
  const value=protocol??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    state_schema:String(value.state_schema??""),
    snapshot_schema:String(value.snapshot_schema??""),
    codes:[...(value.codes??[])].map(code=>String(code))
  });
}

export function dimensionAuditDownloadHistoryExportReadinessProtocolValid(protocol=dimensionAuditDownloadHistoryExportReadinessProtocol()){
  const value=protocol??{};
  if(typeof value.schema!=="string"||value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_PROTOCOL_SCHEMA)return false;
  if(typeof value.state_schema!=="string"||value.state_schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SCHEMA)return false;
  if(typeof value.snapshot_schema!=="string"||value.snapshot_schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SNAPSHOT_SCHEMA)return false;
  if(!Array.isArray(value.codes))return false;
  if(value.codes.length!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_CODES.length)return false;
  return value.codes.every((code,index)=>typeof code==="string"&&code===DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_CODES[index]);
}

export function dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(signature,protocol=dimensionAuditDownloadHistoryExportReadinessProtocol()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryExportReadinessProtocolValid(protocol)
    &&signature===dimensionAuditDownloadHistoryExportReadinessProtocolSignature(protocol);
}

export function dimensionAuditDownloadHistoryExportReadinessState({
  attempt_count=0,
  verification_valid=false,
  trusted=false,
  provenance_valid=false,
  history_snapshot_signature="",
  provenance_signature=""
}={}){
  const attempts=Math.max(0,Math.trunc(Number(attempt_count)||0));
  const code=!attempts
    ?"EMPTY"
    :verification_valid!==true
      ?"VERIFICATION_FAILED"
      :trusted!==true
        ?"UNTRUSTED"
        :provenance_valid!==true
          ?"INVALID_PROVENANCE"
          :"READY";
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SCHEMA,
    ready:code==="READY",
    code,
    attempt_count:attempts,
    verification_valid:verification_valid===true,
    trusted:trusted===true,
    provenance_valid:provenance_valid===true,
    history_snapshot_signature:String(history_snapshot_signature??""),
    provenance_signature:String(provenance_signature??"")
  });
}

export function dimensionAuditDownloadHistoryExportReadinessStateValid(state=dimensionAuditDownloadHistoryExportReadinessState()){
  const value=state??{};
  if(typeof value.schema!=="string"||value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SCHEMA)return false;
  if(typeof value.ready!=="boolean")return false;
  if(typeof value.code!=="string"||!DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_CODES.includes(value.code))return false;
  if(!Number.isInteger(value.attempt_count)||value.attempt_count<0)return false;
  if(typeof value.verification_valid!=="boolean"
    ||typeof value.trusted!=="boolean"
    ||typeof value.provenance_valid!=="boolean"
    ||typeof value.history_snapshot_signature!=="string"
    ||typeof value.provenance_signature!=="string")return false;
  const expected=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:value.attempt_count,
    verification_valid:value.verification_valid,
    trusted:value.trusted,
    provenance_valid:value.provenance_valid,
    history_snapshot_signature:value.history_snapshot_signature,
    provenance_signature:value.provenance_signature
  });
  return value.ready===expected.ready
    &&value.code===expected.code
    &&value.attempt_count===expected.attempt_count
    &&value.verification_valid===expected.verification_valid
    &&value.trusted===expected.trusted
    &&value.provenance_valid===expected.provenance_valid
    &&value.history_snapshot_signature===expected.history_snapshot_signature
    &&value.provenance_signature===expected.provenance_signature
    &&dimensionAuditDownloadHistoryExportReadinessStateSignature(value)
      ===dimensionAuditDownloadHistoryExportReadinessStateSignature(expected);
}

export function dimensionAuditDownloadHistoryExportReadinessStateSignature(state=dimensionAuditDownloadHistoryExportReadinessState()){
  const value=state??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    ready:value.ready===true,
    code:String(value.code??""),
    attempt_count:Math.max(0,Math.trunc(Number(value.attempt_count)||0)),
    verification_valid:value.verification_valid===true,
    trusted:value.trusted===true,
    provenance_valid:value.provenance_valid===true,
    history_snapshot_signature:String(value.history_snapshot_signature??""),
    provenance_signature:String(value.provenance_signature??"")
  });
}

export function dimensionAuditDownloadHistoryExportReadinessStateSignatureValid(signature,state=dimensionAuditDownloadHistoryExportReadinessState()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryExportReadinessStateValid(state)
    &&signature===dimensionAuditDownloadHistoryExportReadinessStateSignature(state);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SNAPSHOT_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportReadinessSnapshot.v1";

export function dimensionAuditDownloadHistoryExportReadinessSnapshotSignature(snapshot={}){
  const value=snapshot??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    protocol_signature:String(value.protocol_signature??""),
    protocol_valid:value.protocol_valid===true,
    protocol_signature_valid:value.protocol_signature_valid===true,
    state_schema:String(value.state_schema??""),
    state_valid:value.state_valid===true,
    ready:value.ready===true,
    code:String(value.code??""),
    attempt_count:Math.max(0,Math.trunc(Number(value.attempt_count)||0)),
    verification_valid:value.verification_valid===true,
    trusted:value.trusted===true,
    provenance_valid:value.provenance_valid===true,
    history_snapshot_signature:String(value.history_snapshot_signature??""),
    provenance_signature:String(value.provenance_signature??""),
    signature:String(value.signature??""),
    signature_valid:value.signature_valid===true
  });
}

export function dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(signature,snapshot={}){
  const value=snapshot??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.protocol_signature==="string"
    &&typeof value.protocol_valid==="boolean"
    &&typeof value.protocol_signature_valid==="boolean"
    &&typeof value.state_schema==="string"
    &&typeof value.state_valid==="boolean"
    &&typeof value.ready==="boolean"
    &&typeof value.code==="string"
    &&Number.isInteger(value.attempt_count)
    &&typeof value.verification_valid==="boolean"
    &&typeof value.trusted==="boolean"
    &&typeof value.provenance_valid==="boolean"
    &&typeof value.history_snapshot_signature==="string"
    &&typeof value.provenance_signature==="string"
    &&typeof value.signature==="string"
    &&typeof value.signature_valid==="boolean"
    &&signature===dimensionAuditDownloadHistoryExportReadinessSnapshotSignature(value);
}

export function dimensionAuditDownloadHistoryExportReadinessSnapshot(state=dimensionAuditDownloadHistoryExportReadinessState()){
  const value=state??{};
  const signature=dimensionAuditDownloadHistoryExportReadinessStateSignature(value);
  const protocol=dimensionAuditDownloadHistoryExportReadinessProtocol();
  const protocolSignature=dimensionAuditDownloadHistoryExportReadinessProtocolSignature(protocol);
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SNAPSHOT_SCHEMA,
    protocol,
    protocol_signature:protocolSignature,
    protocol_valid:dimensionAuditDownloadHistoryExportReadinessProtocolValid(protocol),
    protocol_signature_valid:dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(protocolSignature,protocol),
    state_schema:String(value.schema??""),
    state_valid:dimensionAuditDownloadHistoryExportReadinessStateValid(value),
    ready:value.ready===true,
    code:String(value.code??""),
    attempt_count:Math.max(0,Math.trunc(Number(value.attempt_count)||0)),
    verification_valid:value.verification_valid===true,
    trusted:value.trusted===true,
    provenance_valid:value.provenance_valid===true,
    history_snapshot_signature:String(value.history_snapshot_signature??""),
    provenance_signature:String(value.provenance_signature??""),
    signature,
    signature_valid:dimensionAuditDownloadHistoryExportReadinessStateSignatureValid(signature,value)
  };
  const snapshotSignature=dimensionAuditDownloadHistoryExportReadinessSnapshotSignature(base);
  return freeze({
    ...base,
    snapshot_signature:snapshotSignature,
    snapshot_signature_valid:true
  });
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportGate.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_CODES=freeze([
  "READY",
  "EMPTY",
  "VERIFICATION_FAILED",
  "UNTRUSTED",
  "INVALID_PROVENANCE",
  "INVALID_PROTOCOL",
  "INVALID_PROTOCOL_SIGNATURE",
  "INVALID_STATE",
  "INVALID_STATE_SIGNATURE",
  "INVALID_SNAPSHOT_SIGNATURE",
  "INVALID_SNAPSHOT"
]);

export function dimensionAuditDownloadHistoryExportGate(snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(),state=dimensionAuditDownloadHistoryExportReadinessState()){
  const value=snapshot??{};
  const readinessCode=String(value.code??"");
  let code="READY";
  if(!dimensionAuditDownloadHistoryExportReadinessProtocolValid(value.protocol)||value.protocol_valid!==true){
    code="INVALID_PROTOCOL";
  }else if(!dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(value.protocol_signature,value.protocol)||value.protocol_signature_valid!==true){
    code="INVALID_PROTOCOL_SIGNATURE";
  }else if(value.state_valid!==true){
    code="INVALID_STATE";
  }else if(value.signature_valid!==true||!dimensionAuditDownloadHistoryExportReadinessStateSignatureValid(value.signature,state)){
    code="INVALID_STATE_SIGNATURE";
  }else if(value.snapshot_signature_valid!==true||!dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(value.snapshot_signature,value)){
    code="INVALID_SNAPSHOT_SIGNATURE";
  }else if(!dimensionAuditDownloadHistoryExportReadinessSnapshotValid(value,state)){
    code="INVALID_SNAPSHOT";
  }else if(value.ready!==true){
    code=DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_CODES.includes(readinessCode)?readinessCode:"INVALID_SNAPSHOT";
  }
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_SCHEMA,
    allowed:code==="READY",
    code,
    readiness_code:readinessCode,
    snapshot_valid:dimensionAuditDownloadHistoryExportReadinessSnapshotValid(value,state)
  });
}

export function dimensionAuditDownloadHistoryExportGateSignature(gate=dimensionAuditDownloadHistoryExportGate()){
  const value=gate??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    allowed:value.allowed===true,
    code:String(value.code??""),
    readiness_code:String(value.readiness_code??""),
    snapshot_valid:value.snapshot_valid===true
  });
}

export function dimensionAuditDownloadHistoryExportGateValid(gate=dimensionAuditDownloadHistoryExportGate()){
  const value=gate??{};
  if(typeof value.schema!=="string"
    ||typeof value.allowed!=="boolean"
    ||typeof value.code!=="string"
    ||typeof value.readiness_code!=="string"
    ||typeof value.snapshot_valid!=="boolean")return false;
  const code=value.code;
  const readinessCode=value.readiness_code;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_SCHEMA)return false;
  if(!DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_CODES.includes(code))return false;
  if(!DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_CODES.includes(readinessCode))return false;
  if(value.allowed!==(code==="READY"))return false;
  if(DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_CODES.includes(code)){
    return value.snapshot_valid===true&&code===readinessCode;
  }
  return value.allowed===false&&value.snapshot_valid===false;
}

export function dimensionAuditDownloadHistoryExportGateSignatureValid(signature,gate=dimensionAuditDownloadHistoryExportGate()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryExportGateValid(gate)
    &&signature===dimensionAuditDownloadHistoryExportGateSignature(gate);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_SNAPSHOT_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportGateSnapshot.v1";

export function dimensionAuditDownloadHistoryExportGateSnapshotSignature(snapshot={}){
  const value=snapshot??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    gate_signature:String(value.gate_signature??""),
    gate_valid:value.gate_valid===true,
    gate_signature_valid:value.gate_signature_valid===true
  });
}

export function dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid(signature,snapshot={}){
  const value=snapshot??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.gate_signature==="string"
    &&typeof value.gate_valid==="boolean"
    &&typeof value.gate_signature_valid==="boolean"
    &&signature===dimensionAuditDownloadHistoryExportGateSnapshotSignature(value);
}

export function dimensionAuditDownloadHistoryExportGateSnapshot(gate=dimensionAuditDownloadHistoryExportGate()){
  const value=gate??{};
  const signature=dimensionAuditDownloadHistoryExportGateSignature(value);
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_SNAPSHOT_SCHEMA,
    gate:value,
    gate_signature:signature,
    gate_valid:dimensionAuditDownloadHistoryExportGateValid(value),
    gate_signature_valid:dimensionAuditDownloadHistoryExportGateSignatureValid(signature,value)
  };
  const snapshotSignature=dimensionAuditDownloadHistoryExportGateSnapshotSignature(base);
  return freeze({
    ...base,
    snapshot_signature:snapshotSignature,
    snapshot_signature_valid:true
  });
}

export function dimensionAuditDownloadHistoryExportGateSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportGateSnapshot()){
  const value=snapshot??{};
  if(typeof value.schema!=="string"
    ||typeof value.gate_signature!=="string"
    ||typeof value.gate_valid!=="boolean"
    ||typeof value.gate_signature_valid!=="boolean"
    ||typeof value.snapshot_signature!=="string"
    ||typeof value.snapshot_signature_valid!=="boolean")return false;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_SNAPSHOT_SCHEMA)return false;
  if(!dimensionAuditDownloadHistoryExportGateValid(value.gate))return false;
  if(value.gate_valid!==true)return false;
  if(value.gate_signature_valid!==true)return false;
  if(!dimensionAuditDownloadHistoryExportGateSignatureValid(value.gate_signature,value.gate))return false;
  if(value.snapshot_signature_valid!==true)return false;
  return dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid(value.snapshot_signature,value);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportDecision.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_CODES=freeze([
  ...DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_CODES,
  "INVALID_GATE_SNAPSHOT"
]);

export function dimensionAuditDownloadHistoryExportDecision(gateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot()){
  const value=gateSnapshot??{};
  const gate=value.gate??{};
  const gateSnapshotValid=dimensionAuditDownloadHistoryExportGateSnapshotValid(value);
  const gateCode=String(gate.code??"");
  const code=gateSnapshotValid&&DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_CODES.includes(gateCode)
    ?gateCode
    :"INVALID_GATE_SNAPSHOT";
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_SCHEMA,
    allowed:gateSnapshotValid&&gate.allowed===true&&code==="READY",
    code,
    gate_snapshot_valid:gateSnapshotValid,
    gate_code:gateCode,
    gate_allowed:gate.allowed===true
  });
}

export function dimensionAuditDownloadHistoryExportDecisionValid(decision=dimensionAuditDownloadHistoryExportDecision()){
  const value=decision??{};
  if(typeof value.schema!=="string"
    ||typeof value.allowed!=="boolean"
    ||typeof value.code!=="string"
    ||typeof value.gate_snapshot_valid!=="boolean"
    ||typeof value.gate_code!=="string"
    ||typeof value.gate_allowed!=="boolean")return false;
  const code=value.code;
  const gateCode=value.gate_code;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_SCHEMA)return false;
  if(!DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_CODES.includes(code))return false;
  if(value.allowed!==(code==="READY"))return false;
  if(code==="INVALID_GATE_SNAPSHOT"){
    return value.gate_snapshot_valid===false&&value.allowed===false;
  }
  if(!DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_CODES.includes(gateCode))return false;
  return value.gate_snapshot_valid===true&&gateCode===code&&value.gate_allowed===(code==="READY");
}

export function dimensionAuditDownloadHistoryExportDecisionSignature(decision=dimensionAuditDownloadHistoryExportDecision()){
  const value=decision??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    allowed:value.allowed===true,
    code:String(value.code??""),
    gate_snapshot_valid:value.gate_snapshot_valid===true,
    gate_code:String(value.gate_code??""),
    gate_allowed:value.gate_allowed===true
  });
}

export function dimensionAuditDownloadHistoryExportDecisionSignatureValid(signature,decision=dimensionAuditDownloadHistoryExportDecision()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryExportDecisionValid(decision)
    &&signature===dimensionAuditDownloadHistoryExportDecisionSignature(decision);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_SNAPSHOT_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportDecisionSnapshot.v1";

export function dimensionAuditDownloadHistoryExportDecisionSnapshotSignature(snapshot={}){
  const value=snapshot??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    decision_signature:String(value.decision_signature??""),
    decision_valid:value.decision_valid===true,
    decision_signature_valid:value.decision_signature_valid===true
  });
}

export function dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid(signature,snapshot={}){
  const value=snapshot??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.decision_signature==="string"
    &&typeof value.decision_valid==="boolean"
    &&typeof value.decision_signature_valid==="boolean"
    &&signature===dimensionAuditDownloadHistoryExportDecisionSnapshotSignature(value);
}

export function dimensionAuditDownloadHistoryExportDecisionSnapshot(decision=dimensionAuditDownloadHistoryExportDecision()){
  const value=decision??{};
  const signature=dimensionAuditDownloadHistoryExportDecisionSignature(value);
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_SNAPSHOT_SCHEMA,
    decision:value,
    decision_signature:signature,
    decision_valid:dimensionAuditDownloadHistoryExportDecisionValid(value),
    decision_signature_valid:dimensionAuditDownloadHistoryExportDecisionSignatureValid(signature,value)
  };
  const snapshotSignature=dimensionAuditDownloadHistoryExportDecisionSnapshotSignature(base);
  return freeze({
    ...base,
    snapshot_signature:snapshotSignature,
    snapshot_signature_valid:true
  });
}

export function dimensionAuditDownloadHistoryExportDecisionSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot()){
  const value=snapshot??{};
  if(typeof value.schema!=="string"
    ||typeof value.decision_signature!=="string"
    ||typeof value.decision_valid!=="boolean"
    ||typeof value.decision_signature_valid!=="boolean"
    ||typeof value.snapshot_signature!=="string"
    ||typeof value.snapshot_signature_valid!=="boolean")return false;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_SNAPSHOT_SCHEMA)return false;
  if(!dimensionAuditDownloadHistoryExportDecisionValid(value.decision))return false;
  if(value.decision_valid!==true||value.decision_signature_valid!==true)return false;
  if(!dimensionAuditDownloadHistoryExportDecisionSignatureValid(value.decision_signature,value.decision))return false;
  if(value.snapshot_signature_valid!==true)return false;
  return dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid(value.snapshot_signature,value);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_AUTHORIZATION_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportAuthorization.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_AUTHORIZATION_CODES=freeze([
  ...DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_CODES,
  "INVALID_DECISION_SNAPSHOT"
]);

export function dimensionAuditDownloadHistoryExportAuthorization(decisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot()){
  const value=decisionSnapshot??{};
  const decision=value.decision??{};
  const decisionSnapshotValid=dimensionAuditDownloadHistoryExportDecisionSnapshotValid(value);
  const decisionCode=String(decision.code??"");
  const code=decisionSnapshotValid&&DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_CODES.includes(decisionCode)
    ?decisionCode
    :"INVALID_DECISION_SNAPSHOT";
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_AUTHORIZATION_SCHEMA,
    allowed:decisionSnapshotValid&&decision.allowed===true&&code==="READY",
    code,
    decision_snapshot_valid:decisionSnapshotValid,
    decision_code:decisionCode,
    decision_allowed:decision.allowed===true
  });
}

export function dimensionAuditDownloadHistoryExportAuthorizationValid(authorization=dimensionAuditDownloadHistoryExportAuthorization()){
  const value=authorization??{};
  if(typeof value.schema!=="string"
    ||typeof value.allowed!=="boolean"
    ||typeof value.code!=="string"
    ||typeof value.decision_snapshot_valid!=="boolean"
    ||typeof value.decision_code!=="string"
    ||typeof value.decision_allowed!=="boolean")return false;
  const code=value.code;
  const decisionCode=value.decision_code;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_AUTHORIZATION_SCHEMA)return false;
  if(!DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_AUTHORIZATION_CODES.includes(code))return false;
  if(value.allowed!==(code==="READY"))return false;
  if(code==="INVALID_DECISION_SNAPSHOT"){
    return value.decision_snapshot_valid===false&&value.allowed===false;
  }
  if(!DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_CODES.includes(decisionCode))return false;
  return value.decision_snapshot_valid===true&&decisionCode===code&&value.decision_allowed===(code==="READY");
}

export function dimensionAuditDownloadHistoryExportAuthorizationSignature(authorization=dimensionAuditDownloadHistoryExportAuthorization()){
  const value=authorization??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    allowed:value.allowed===true,
    code:String(value.code??""),
    decision_snapshot_valid:value.decision_snapshot_valid===true,
    decision_code:String(value.decision_code??""),
    decision_allowed:value.decision_allowed===true
  });
}

export function dimensionAuditDownloadHistoryExportAuthorizationSignatureValid(signature,authorization=dimensionAuditDownloadHistoryExportAuthorization()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryExportAuthorizationValid(authorization)
    &&signature===dimensionAuditDownloadHistoryExportAuthorizationSignature(authorization);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_AUTHORIZATION_SNAPSHOT_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportAuthorizationSnapshot.v1";

export function dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(snapshot={}){
  const value=snapshot??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    authorization_signature:String(value.authorization_signature??""),
    authorization_valid:value.authorization_valid===true,
    authorization_signature_valid:value.authorization_signature_valid===true
  });
}

export function dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(signature,snapshot={}){
  const value=snapshot??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.authorization_signature==="string"
    &&typeof value.authorization_valid==="boolean"
    &&typeof value.authorization_signature_valid==="boolean"
    &&signature===dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(value);
}

export function dimensionAuditDownloadHistoryExportAuthorizationSnapshot(authorization=dimensionAuditDownloadHistoryExportAuthorization()){
  const value=authorization??{};
  const signature=dimensionAuditDownloadHistoryExportAuthorizationSignature(value);
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_AUTHORIZATION_SNAPSHOT_SCHEMA,
    authorization:value,
    authorization_signature:signature,
    authorization_valid:dimensionAuditDownloadHistoryExportAuthorizationValid(value),
    authorization_signature_valid:dimensionAuditDownloadHistoryExportAuthorizationSignatureValid(signature,value)
  };
  const snapshotSignature=dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(base);
  return freeze({
    ...base,
    snapshot_signature:snapshotSignature,
    snapshot_signature_valid:true
  });
}

export function dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot()){
  const value=snapshot??{};
  if(typeof value.schema!=="string"
    ||typeof value.authorization_signature!=="string"
    ||typeof value.authorization_valid!=="boolean"
    ||typeof value.authorization_signature_valid!=="boolean"
    ||typeof value.snapshot_signature!=="string"
    ||typeof value.snapshot_signature_valid!=="boolean")return false;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_AUTHORIZATION_SNAPSHOT_SCHEMA)return false;
  if(!dimensionAuditDownloadHistoryExportAuthorizationValid(value.authorization))return false;
  if(value.authorization_valid!==true||value.authorization_signature_valid!==true)return false;
  if(!dimensionAuditDownloadHistoryExportAuthorizationSignatureValid(value.authorization_signature,value.authorization))return false;
  if(value.snapshot_signature_valid!==true)return false;
  return dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(value.snapshot_signature,value);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_CHAIN_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportChain.v1";

export function dimensionAuditDownloadHistoryExportChain(state=dimensionAuditDownloadHistoryExportReadinessState()){
  const readiness_state=state??{};
  const readiness_snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(readiness_state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness_snapshot,readiness_state);
  const gate_snapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  const decision=dimensionAuditDownloadHistoryExportDecision(gate_snapshot);
  const decision_snapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot(decision);
  const authorization=dimensionAuditDownloadHistoryExportAuthorization(decision_snapshot);
  const authorization_snapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot(authorization);
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_CHAIN_SCHEMA,
    readiness_state,
    readiness_snapshot,
    gate_snapshot,
    decision_snapshot,
    authorization_snapshot,
    allowed:authorization_snapshot.authorization?.allowed===true
      &&dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid(authorization_snapshot),
    code:String(authorization_snapshot.authorization?.code??"INVALID_AUTHORIZATION_SNAPSHOT")
  });
}

export function dimensionAuditDownloadHistoryExportChainValid(chain=dimensionAuditDownloadHistoryExportChain()){
  const value=chain??{};
  if(typeof value.schema!=="string"
    ||typeof value.allowed!=="boolean"
    ||typeof value.code!=="string")return false;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_CHAIN_SCHEMA)return false;
  if(!dimensionAuditDownloadHistoryExportReadinessStateValid(value.readiness_state))return false;
  if(!dimensionAuditDownloadHistoryExportReadinessSnapshotValid(value.readiness_snapshot,value.readiness_state))return false;
  if(!dimensionAuditDownloadHistoryExportGateSnapshotValid(value.gate_snapshot))return false;
  if(!dimensionAuditDownloadHistoryExportDecisionSnapshotValid(value.decision_snapshot))return false;
  if(!dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid(value.authorization_snapshot))return false;
  const authorization=value.authorization_snapshot?.authorization??{};
  if(typeof authorization.allowed!=="boolean"||typeof authorization.code!=="string")return false;
  if(value.allowed!==authorization.allowed)return false;
  return value.code===authorization.code;
}

export function dimensionAuditDownloadHistoryExportChainSignature(chain=dimensionAuditDownloadHistoryExportChain()){
  const value=chain??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    readiness_signature:String(value.readiness_snapshot?.snapshot_signature??""),
    gate_signature:String(value.gate_snapshot?.snapshot_signature??""),
    decision_signature:String(value.decision_snapshot?.snapshot_signature??""),
    authorization_signature:String(value.authorization_snapshot?.snapshot_signature??""),
    allowed:value.allowed===true,
    code:String(value.code??"")
  });
}

export function dimensionAuditDownloadHistoryExportChainSignatureValid(signature,chain=dimensionAuditDownloadHistoryExportChain()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryExportChainValid(chain)
    &&signature===dimensionAuditDownloadHistoryExportChainSignature(chain);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_CHAIN_SNAPSHOT_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportChainSnapshot.v1";

export function dimensionAuditDownloadHistoryExportChainSnapshotSignature(snapshot={}){
  const value=snapshot??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    chain_signature:String(value.chain_signature??""),
    chain_valid:value.chain_valid===true,
    chain_signature_valid:value.chain_signature_valid===true
  });
}

export function dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid(signature,snapshot={}){
  const value=snapshot??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.chain_signature==="string"
    &&typeof value.chain_valid==="boolean"
    &&typeof value.chain_signature_valid==="boolean"
    &&signature===dimensionAuditDownloadHistoryExportChainSnapshotSignature(value);
}

export function dimensionAuditDownloadHistoryExportChainSnapshot(chain=dimensionAuditDownloadHistoryExportChain()){
  const value=chain??{};
  const signature=dimensionAuditDownloadHistoryExportChainSignature(value);
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_CHAIN_SNAPSHOT_SCHEMA,
    chain:value,
    chain_signature:signature,
    chain_valid:dimensionAuditDownloadHistoryExportChainValid(value),
    chain_signature_valid:dimensionAuditDownloadHistoryExportChainSignatureValid(signature,value)
  };
  const snapshotSignature=dimensionAuditDownloadHistoryExportChainSnapshotSignature(base);
  return freeze({
    ...base,
    snapshot_signature:snapshotSignature,
    snapshot_signature_valid:true
  });
}

export function dimensionAuditDownloadHistoryExportChainSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const value=snapshot??{};
  if(typeof value.schema!=="string"
    ||typeof value.chain_signature!=="string"
    ||typeof value.chain_valid!=="boolean"
    ||typeof value.chain_signature_valid!=="boolean"
    ||typeof value.snapshot_signature!=="string"
    ||typeof value.snapshot_signature_valid!=="boolean")return false;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_CHAIN_SNAPSHOT_SCHEMA)return false;
  if(!dimensionAuditDownloadHistoryExportChainValid(value.chain))return false;
  if(value.chain_valid!==true||value.chain_signature_valid!==true)return false;
  if(!dimensionAuditDownloadHistoryExportChainSignatureValid(value.chain_signature,value.chain))return false;
  if(value.snapshot_signature_valid!==true)return false;
  return dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid(value.snapshot_signature,value);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_PAYLOAD_BINDING_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportPayloadBinding.v1";

export function dimensionAuditDownloadHistoryExportPayloadBinding(historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const history=historySnapshot??{};
  const chain_snapshot=chainSnapshot??{};
  const chain=chain_snapshot.chain??{};
  const readiness=chain.readiness_state??{};
  const historySignature=String(history.snapshot_signature??"");
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_PAYLOAD_BINDING_SCHEMA,
    history_snapshot_signature:historySignature,
    chain_snapshot_signature:String(chain_snapshot.snapshot_signature??""),
    attempt_count:Math.max(0,Number(history.attempt_count)||0),
    chain_attempt_count:Math.max(0,Number(readiness.attempt_count)||0),
    allowed:chain.allowed===true,
    code:String(chain.code??"INVALID_EXPORT_CHAIN_SNAPSHOT"),
    history_signature_matches_chain:historySignature===String(readiness.history_snapshot_signature??"")
  });
}

export function dimensionAuditDownloadHistoryExportPayloadBindingValid(binding=dimensionAuditDownloadHistoryExportPayloadBinding(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const value=binding??{};
  const history=historySnapshot??{};
  const chain_snapshot=chainSnapshot??{};
  const chain=chain_snapshot.chain??{};
  const readiness=chain.readiness_state??{};
  if(typeof value.schema!=="string"
    ||typeof value.history_snapshot_signature!=="string"
    ||typeof value.chain_snapshot_signature!=="string"
    ||!Number.isInteger(value.attempt_count)
    ||value.attempt_count<0
    ||!Number.isInteger(value.chain_attempt_count)
    ||value.chain_attempt_count<0
    ||typeof value.allowed!=="boolean"
    ||typeof value.code!=="string"
    ||typeof value.history_signature_matches_chain!=="boolean")return false;
  if(typeof history.snapshot_signature!=="string"||history.snapshot_signature.length===0)return false;
  if(!Number.isInteger(history.attempt_count)||history.attempt_count<0)return false;
  if(typeof chain_snapshot.snapshot_signature!=="string"||chain_snapshot.snapshot_signature.length===0)return false;
  if(typeof readiness.history_snapshot_signature!=="string"
    ||!Number.isInteger(readiness.attempt_count)
    ||readiness.attempt_count<0
    ||typeof chain.allowed!=="boolean"
    ||typeof chain.code!=="string")return false;
  const historySignature=history.snapshot_signature;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_PAYLOAD_BINDING_SCHEMA)return false;
  if(!dimensionAuditDownloadHistoryExportChainSnapshotValid(chain_snapshot))return false;
  if(value.history_snapshot_signature!==historySignature)return false;
  if(value.chain_snapshot_signature!==chain_snapshot.snapshot_signature)return false;
  if(readiness.history_snapshot_signature!==historySignature)return false;
  if(value.history_signature_matches_chain!==true)return false;
  if(value.attempt_count!==history.attempt_count)return false;
  if(value.chain_attempt_count!==readiness.attempt_count)return false;
  if(value.attempt_count!==value.chain_attempt_count)return false;
  if(value.allowed!==chain.allowed)return false;
  return value.code===chain.code;
}

export function dimensionAuditDownloadHistoryExportPayloadBindingSignature(binding=dimensionAuditDownloadHistoryExportPayloadBinding()){
  const value=binding??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    history_snapshot_signature:String(value.history_snapshot_signature??""),
    chain_snapshot_signature:String(value.chain_snapshot_signature??""),
    attempt_count:Number(value.attempt_count)||0,
    chain_attempt_count:Number(value.chain_attempt_count)||0,
    allowed:value.allowed===true,
    code:String(value.code??""),
    history_signature_matches_chain:value.history_signature_matches_chain===true
  });
}

export function dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(signature,binding=dimensionAuditDownloadHistoryExportPayloadBinding(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryExportPayloadBindingValid(binding,historySnapshot,chainSnapshot)
    &&signature===dimensionAuditDownloadHistoryExportPayloadBindingSignature(binding);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_PAYLOAD_BINDING_SNAPSHOT_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportPayloadBindingSnapshot.v1";

export function dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature(snapshot={}){
  const value=snapshot??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    binding_signature:String(value.binding_signature??""),
    binding_valid:value.binding_valid===true,
    binding_signature_valid:value.binding_signature_valid===true
  });
}

export function dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid(signature,snapshot={}){
  const value=snapshot??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.binding_signature==="string"
    &&typeof value.binding_valid==="boolean"
    &&typeof value.binding_signature_valid==="boolean"
    &&signature===dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature(value);
}

export function dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding=dimensionAuditDownloadHistoryExportPayloadBinding(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const value=binding??{};
  const signature=dimensionAuditDownloadHistoryExportPayloadBindingSignature(value);
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_PAYLOAD_BINDING_SNAPSHOT_SCHEMA,
    binding:value,
    binding_signature:signature,
    binding_valid:dimensionAuditDownloadHistoryExportPayloadBindingValid(value,historySnapshot,chainSnapshot),
    binding_signature_valid:dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(signature,value,historySnapshot,chainSnapshot)
  };
  const snapshotSignature=dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature(base);
  return freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
}

export function dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const value=snapshot??{};
  if(typeof value.schema!=="string"
    ||typeof value.binding_signature!=="string"
    ||typeof value.binding_valid!=="boolean"
    ||typeof value.binding_signature_valid!=="boolean"
    ||typeof value.snapshot_signature!=="string"
    ||typeof value.snapshot_signature_valid!=="boolean")return false;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_PAYLOAD_BINDING_SNAPSHOT_SCHEMA)return false;
  if(!dimensionAuditDownloadHistoryExportPayloadBindingValid(value.binding,historySnapshot,chainSnapshot))return false;
  if(value.binding_valid!==true||value.binding_signature_valid!==true)return false;
  if(!dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(value.binding_signature,value.binding,historySnapshot,chainSnapshot))return false;
  if(value.snapshot_signature_valid!==true)return false;
  return dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid(value.snapshot_signature,value);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_STATUS_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportActionStatus.v1";

export function dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const snapshot=bindingSnapshot??{};
  const binding=snapshot.binding??{};
  const snapshotValid=dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid(snapshot,historySnapshot,chainSnapshot);
  const code=snapshotValid?String(binding.code??"INVALID_EXPORT_PAYLOAD_BINDING"):"INVALID_EXPORT_PAYLOAD_BINDING_SNAPSHOT";
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_STATUS_SCHEMA,
    ready:snapshotValid&&binding.allowed===true&&code==="READY",
    code,
    payload_binding_snapshot_valid:snapshotValid,
    payload_binding_allowed:binding.allowed===true,
    payload_binding_snapshot_signature:String(snapshot.snapshot_signature??"")
  });
}

export function dimensionAuditDownloadHistoryExportActionStatusValid(status=dimensionAuditDownloadHistoryExportActionStatus(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const value=status??{};
  const snapshot=bindingSnapshot??{};
  const binding=snapshot.binding??{};
  const snapshotValid=dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid(snapshot,historySnapshot,chainSnapshot);
  if(typeof binding.code!=="string"
    ||typeof binding.allowed!=="boolean"
    ||typeof snapshot.snapshot_signature!=="string")return false;
  const expectedCode=snapshotValid?binding.code:"INVALID_EXPORT_PAYLOAD_BINDING_SNAPSHOT";
  if(typeof value.schema!=="string"
    ||typeof value.ready!=="boolean"
    ||typeof value.code!=="string"
    ||typeof value.payload_binding_snapshot_valid!=="boolean"
    ||typeof value.payload_binding_allowed!=="boolean"
    ||typeof value.payload_binding_snapshot_signature!=="string")return false;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_STATUS_SCHEMA)return false;
  if(value.payload_binding_snapshot_valid!==snapshotValid)return false;
  if(value.payload_binding_allowed!==binding.allowed)return false;
  if(value.payload_binding_snapshot_signature!==snapshot.snapshot_signature)return false;
  if(value.code!==expectedCode)return false;
  return value.ready===(snapshotValid&&binding.allowed&&expectedCode==="READY");
}

export function dimensionAuditDownloadHistoryExportActionStatusSignature(status=dimensionAuditDownloadHistoryExportActionStatus()){
  const value=status??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    ready:value.ready===true,
    code:String(value.code??""),
    payload_binding_snapshot_valid:value.payload_binding_snapshot_valid===true,
    payload_binding_allowed:value.payload_binding_allowed===true,
    payload_binding_snapshot_signature:String(value.payload_binding_snapshot_signature??"")
  });
}

export function dimensionAuditDownloadHistoryExportActionStatusSignatureValid(signature,status=dimensionAuditDownloadHistoryExportActionStatus(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryExportActionStatusValid(status,bindingSnapshot,historySnapshot,chainSnapshot)
    &&signature===dimensionAuditDownloadHistoryExportActionStatusSignature(status);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_STATUS_SNAPSHOT_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportActionStatusSnapshot.v1";

export function dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature(snapshot={}){
  const value=snapshot??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    status_signature:String(value.status_signature??""),
    status_valid:value.status_valid===true,
    status_signature_valid:value.status_signature_valid===true
  });
}

export function dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid(signature,snapshot={}){
  const value=snapshot??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.status_signature==="string"
    &&typeof value.status_valid==="boolean"
    &&typeof value.status_signature_valid==="boolean"
    &&signature===dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature(value);
}

export function dimensionAuditDownloadHistoryExportActionStatusSnapshot(status=dimensionAuditDownloadHistoryExportActionStatus(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const value=status??{};
  const signature=dimensionAuditDownloadHistoryExportActionStatusSignature(value);
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_STATUS_SNAPSHOT_SCHEMA,
    status:value,
    status_signature:signature,
    status_valid:dimensionAuditDownloadHistoryExportActionStatusValid(value,bindingSnapshot,historySnapshot,chainSnapshot),
    status_signature_valid:dimensionAuditDownloadHistoryExportActionStatusSignatureValid(signature,value,bindingSnapshot,historySnapshot,chainSnapshot)
  };
  const snapshotSignature=dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature(base);
  return freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
}

export function dimensionAuditDownloadHistoryExportActionStatusSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const value=snapshot??{};
  if(typeof value.schema!=="string"
    ||typeof value.status_signature!=="string"
    ||typeof value.status_valid!=="boolean"
    ||typeof value.status_signature_valid!=="boolean"
    ||typeof value.snapshot_signature!=="string"
    ||typeof value.snapshot_signature_valid!=="boolean")return false;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_STATUS_SNAPSHOT_SCHEMA)return false;
  if(!dimensionAuditDownloadHistoryExportActionStatusValid(value.status,bindingSnapshot,historySnapshot,chainSnapshot))return false;
  if(value.status_valid!==true||value.status_signature_valid!==true)return false;
  if(!dimensionAuditDownloadHistoryExportActionStatusSignatureValid(value.status_signature,value.status,bindingSnapshot,historySnapshot,chainSnapshot))return false;
  if(value.snapshot_signature_valid!==true)return false;
  return dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid(value.snapshot_signature,value);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_PERMIT_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportActionPermit.v1";
export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTIONS=freeze(["copy","download"]);

export function dimensionAuditDownloadHistoryExportActionPermit(action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const normalizedAction=String(action??"").toLowerCase();
  const snapshot=statusSnapshot??{};
  const status=snapshot.status??{};
  const actionValid=DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTIONS.includes(normalizedAction);
  const statusSnapshotValid=dimensionAuditDownloadHistoryExportActionStatusSnapshotValid(snapshot,bindingSnapshot,historySnapshot,chainSnapshot);
  const code=!actionValid
    ?"INVALID_EXPORT_ACTION"
    :!statusSnapshotValid
      ?"INVALID_EXPORT_ACTION_STATUS_SNAPSHOT"
      :String(status.code??"INVALID_EXPORT_ACTION_STATUS");
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_PERMIT_SCHEMA,
    action:normalizedAction,
    ready:actionValid&&statusSnapshotValid&&status.ready===true&&code==="READY",
    code,
    action_valid:actionValid,
    action_status_snapshot_valid:statusSnapshotValid,
    action_status_ready:status.ready===true,
    action_status_snapshot_signature:String(snapshot.snapshot_signature??"")
  });
}

export function dimensionAuditDownloadHistoryExportActionPermitValid(permit=dimensionAuditDownloadHistoryExportActionPermit(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const value=permit??{};
  const expected=dimensionAuditDownloadHistoryExportActionPermit(action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
  if(typeof value.schema!=="string"
    ||typeof value.action!=="string"
    ||typeof value.ready!=="boolean"
    ||typeof value.code!=="string"
    ||typeof value.action_valid!=="boolean"
    ||typeof value.action_status_snapshot_valid!=="boolean"
    ||typeof value.action_status_ready!=="boolean"
    ||typeof value.action_status_snapshot_signature!=="string")return false;
  return value.schema===DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_PERMIT_SCHEMA
    &&value.action===expected.action
    &&value.ready===expected.ready
    &&value.code===expected.code
    &&value.action_valid===expected.action_valid
    &&value.action_status_snapshot_valid===expected.action_status_snapshot_valid
    &&value.action_status_ready===expected.action_status_ready
    &&value.action_status_snapshot_signature===expected.action_status_snapshot_signature;
}

export function dimensionAuditDownloadHistoryExportActionPermitSignature(permit=dimensionAuditDownloadHistoryExportActionPermit()){
  const value=permit??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    action:String(value.action??""),
    ready:value.ready===true,
    code:String(value.code??""),
    action_valid:value.action_valid===true,
    action_status_snapshot_valid:value.action_status_snapshot_valid===true,
    action_status_ready:value.action_status_ready===true,
    action_status_snapshot_signature:String(value.action_status_snapshot_signature??"")
  });
}

export function dimensionAuditDownloadHistoryExportActionPermitSignatureValid(signature,permit=dimensionAuditDownloadHistoryExportActionPermit(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryExportActionPermitValid(permit,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)
    &&signature===dimensionAuditDownloadHistoryExportActionPermitSignature(permit);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_PERMIT_SNAPSHOT_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportActionPermitSnapshot.v1";

export function dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature(snapshot={}){
  const value=snapshot??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    permit_signature:String(value.permit_signature??""),
    permit_valid:value.permit_valid===true,
    permit_signature_valid:value.permit_signature_valid===true
  });
}

export function dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid(signature,snapshot={}){
  const value=snapshot??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.permit_signature==="string"
    &&typeof value.permit_valid==="boolean"
    &&typeof value.permit_signature_valid==="boolean"
    &&signature===dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature(value);
}

export function dimensionAuditDownloadHistoryExportActionPermitSnapshot(permit=dimensionAuditDownloadHistoryExportActionPermit(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const value=permit??{};
  const signature=dimensionAuditDownloadHistoryExportActionPermitSignature(value);
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_PERMIT_SNAPSHOT_SCHEMA,
    permit:value,
    permit_signature:signature,
    permit_valid:dimensionAuditDownloadHistoryExportActionPermitValid(value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot),
    permit_signature_valid:dimensionAuditDownloadHistoryExportActionPermitSignatureValid(signature,value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)
  };
  const snapshotSignature=dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature(base);
  return freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
}

export function dimensionAuditDownloadHistoryExportActionPermitSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const value=snapshot??{};
  if(typeof value.schema!=="string"
    ||typeof value.permit_signature!=="string"
    ||typeof value.permit_valid!=="boolean"
    ||typeof value.permit_signature_valid!=="boolean"
    ||typeof value.snapshot_signature!=="string"
    ||typeof value.snapshot_signature_valid!=="boolean")return false;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_PERMIT_SNAPSHOT_SCHEMA)return false;
  if(!dimensionAuditDownloadHistoryExportActionPermitValid(value.permit,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot))return false;
  if(value.permit_valid!==true||value.permit_signature_valid!==true)return false;
  if(!dimensionAuditDownloadHistoryExportActionPermitSignatureValid(value.permit_signature,value.permit,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot))return false;
  if(value.snapshot_signature_valid!==true)return false;
  return dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid(value.snapshot_signature,value);
}

export function dimensionAuditDownloadHistoryExportFinalReady(action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  if(typeof action!=="string")return false;
  const normalizedAction=action.toLowerCase();
  if(!DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTIONS.includes(normalizedAction))return false;
  const permit=dimensionAuditDownloadHistoryExportActionPermit(normalizedAction,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
  const permitSnapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot(permit,normalizedAction,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
  return dimensionAuditDownloadHistoryExportActionPermitSnapshotValid(permitSnapshot,normalizedAction,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)
    &&permit.ready===true;
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_FINAL_STATE_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportFinalState.v1";

export function dimensionAuditDownloadHistoryExportFinalState(action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const actionTypeValid=typeof action==="string";
  const normalizedAction=actionTypeValid?action.toLowerCase():"";
  const actionValid=actionTypeValid&&DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTIONS.includes(normalizedAction);
  const permit=dimensionAuditDownloadHistoryExportActionPermit(normalizedAction,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
  const permitSnapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot(permit,normalizedAction,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
  const permitSnapshotValid=dimensionAuditDownloadHistoryExportActionPermitSnapshotValid(permitSnapshot,normalizedAction,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
  const code=actionValid?String(permit.code??"INVALID_EXPORT_ACTION_PERMIT"):"INVALID_EXPORT_ACTION";
  return freeze({
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_FINAL_STATE_SCHEMA,
    action:normalizedAction,
    ready:actionValid&&permitSnapshotValid&&permit.ready===true,
    code,
    action_valid:actionValid,
    permit_snapshot_valid:permitSnapshotValid,
    permit_ready:permit.ready===true,
    permit_snapshot_signature:String(permitSnapshot.snapshot_signature??"")
  });
}

export function dimensionAuditDownloadHistoryExportFinalStateValid(state=dimensionAuditDownloadHistoryExportFinalState(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const value=state??{};
  if(typeof value.schema!=="string"
    ||typeof value.action!=="string"
    ||typeof value.ready!=="boolean"
    ||typeof value.code!=="string"
    ||typeof value.action_valid!=="boolean"
    ||typeof value.permit_snapshot_valid!=="boolean"
    ||typeof value.permit_ready!=="boolean"
    ||typeof value.permit_snapshot_signature!=="string")return false;
  const expected=dimensionAuditDownloadHistoryExportFinalState(action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot);
  return value.schema===DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_FINAL_STATE_SCHEMA
    &&value.action===expected.action
    &&value.ready===expected.ready
    &&value.code===expected.code
    &&value.action_valid===expected.action_valid
    &&value.permit_snapshot_valid===expected.permit_snapshot_valid
    &&value.permit_ready===expected.permit_ready
    &&value.permit_snapshot_signature===expected.permit_snapshot_signature;
}

export function dimensionAuditDownloadHistoryExportFinalStateSignature(state=dimensionAuditDownloadHistoryExportFinalState()){
  const value=state??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    action:String(value.action??""),
    ready:value.ready===true,
    code:String(value.code??""),
    action_valid:value.action_valid===true,
    permit_snapshot_valid:value.permit_snapshot_valid===true,
    permit_ready:value.permit_ready===true,
    permit_snapshot_signature:String(value.permit_snapshot_signature??"")
  });
}

export function dimensionAuditDownloadHistoryExportFinalStateSignatureValid(signature,state=dimensionAuditDownloadHistoryExportFinalState(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryExportFinalStateValid(state,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)
    &&signature===dimensionAuditDownloadHistoryExportFinalStateSignature(state);
}

export const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_FINAL_STATE_SNAPSHOT_SCHEMA="TubeBender.DimensionAuditDownloadHistoryExportFinalStateSnapshot.v1";

export function dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature(snapshot={}){
  const value=snapshot??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    state_signature:String(value.state_signature??""),
    state_valid:value.state_valid===true,
    state_signature_valid:value.state_signature_valid===true
  });
}

export function dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid(signature,snapshot={}){
  const value=snapshot??{};
  return typeof signature==="string"
    &&signature.length>0
    &&typeof value.schema==="string"
    &&typeof value.state_signature==="string"
    &&typeof value.state_valid==="boolean"
    &&typeof value.state_signature_valid==="boolean"
    &&signature===dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature(value);
}

export function dimensionAuditDownloadHistoryExportFinalStateSnapshot(state=dimensionAuditDownloadHistoryExportFinalState(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const value=state??{};
  const signature=dimensionAuditDownloadHistoryExportFinalStateSignature(value);
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_FINAL_STATE_SNAPSHOT_SCHEMA,
    state:value,
    state_signature:signature,
    state_valid:dimensionAuditDownloadHistoryExportFinalStateValid(value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot),
    state_signature_valid:dimensionAuditDownloadHistoryExportFinalStateSignatureValid(signature,value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot)
  };
  const snapshotSignature=dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature(base);
  return freeze({...base,snapshot_signature:snapshotSignature,snapshot_signature_valid:true});
}

export function dimensionAuditDownloadHistoryExportFinalStateSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot(),action="copy",statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(),bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(),historySnapshot={},chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot()){
  const value=snapshot??{};
  if(typeof value.schema!=="string"
    ||typeof value.state_signature!=="string"
    ||typeof value.state_valid!=="boolean"
    ||typeof value.state_signature_valid!=="boolean"
    ||typeof value.snapshot_signature!=="string"
    ||typeof value.snapshot_signature_valid!=="boolean")return false;
  if(value.schema!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_FINAL_STATE_SNAPSHOT_SCHEMA)return false;
  if(!dimensionAuditDownloadHistoryExportFinalStateValid(value.state,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot))return false;
  if(value.state_valid!==true||value.state_signature_valid!==true)return false;
  if(!dimensionAuditDownloadHistoryExportFinalStateSignatureValid(value.state_signature,value.state,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot))return false;
  if(value.snapshot_signature_valid!==true)return false;
  return dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid(value.snapshot_signature,value);
}

export function dimensionAuditDownloadHistoryExportReadinessSnapshotValid(snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(),state=dimensionAuditDownloadHistoryExportReadinessState()){
  const value=snapshot??{};
  const expected=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  if(typeof value.schema!=="string"
    ||typeof value.protocol_signature!=="string"
    ||typeof value.state_schema!=="string"
    ||typeof value.ready!=="boolean"
    ||typeof value.code!=="string"
    ||!Number.isInteger(value.attempt_count)
    ||value.attempt_count<0
    ||typeof value.verification_valid!=="boolean"
    ||typeof value.trusted!=="boolean"
    ||typeof value.provenance_valid!=="boolean"
    ||typeof value.history_snapshot_signature!=="string"
    ||typeof value.provenance_signature!=="string"
    ||typeof value.signature!=="string"
    ||typeof value.snapshot_signature!=="string")return false;
  return value.schema===DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SNAPSHOT_SCHEMA
    &&dimensionAuditDownloadHistoryExportReadinessProtocolValid(value.protocol)
    &&dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(value.protocol_signature,value.protocol)
    &&value.protocol_valid===true
    &&value.protocol_signature_valid===true
    &&dimensionAuditDownloadHistoryExportReadinessProtocolSignature(value.protocol)===dimensionAuditDownloadHistoryExportReadinessProtocolSignature(expected.protocol)
    &&value.protocol_signature===expected.protocol_signature
    &&value.state_schema===expected.state_schema
    &&value.state_valid===true
    &&value.ready===expected.ready
    &&value.code===expected.code
    &&value.attempt_count===expected.attempt_count
    &&value.verification_valid===expected.verification_valid
    &&value.trusted===expected.trusted
    &&value.provenance_valid===expected.provenance_valid
    &&value.history_snapshot_signature===expected.history_snapshot_signature
    &&value.provenance_signature===expected.provenance_signature
    &&value.signature===expected.signature
    &&value.signature_valid===true
    &&value.snapshot_signature===expected.snapshot_signature
    &&value.snapshot_signature_valid===true
    &&dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(value.snapshot_signature,value);
}

export function dimensionAuditDownloadHistoryTrustSignature(trust=dimensionAuditDownloadHistoryTrust()){
  const value=trust??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    trusted:value.trusted===true,
    code:String(value.code??""),
    errors:[...(value.errors??[])].map(code=>String(code)),
    attestation_valid:value.attestation_valid===true,
    embedded_attestation_valid:value.embedded_attestation_valid===true,
    attestation_embedding_valid:value.attestation_embedding_valid===true,
    embedded_attestation_embedding_valid:value.embedded_attestation_embedding_valid===true
  });
}

function dimensionAuditDownloadHistoryTrustCanonical(trust={}){
  const value=trust??{};
  return typeof value.schema==="string"
    &&typeof value.trusted==="boolean"
    &&typeof value.code==="string"
    &&Array.isArray(value.errors)
    &&value.errors.every(code=>typeof code==="string")
    &&typeof value.attestation_valid==="boolean"
    &&typeof value.embedded_attestation_valid==="boolean"
    &&typeof value.attestation_embedding_valid==="boolean"
    &&typeof value.embedded_attestation_embedding_valid==="boolean";
}

export function dimensionAuditDownloadHistoryTrustSignatureValid(signature,trust=dimensionAuditDownloadHistoryTrust(),snapshot=null){
  if(snapshot!=null){
    const expected=dimensionAuditDownloadHistoryTrust(snapshot);
    if(dimensionAuditDownloadHistoryTrustSignature(trust)!==dimensionAuditDownloadHistoryTrustSignature(expected))return false;
  }
  return typeof signature==="string"
    &&signature.length>0
    &&dimensionAuditDownloadHistoryTrustCanonical(trust)
    &&signature===dimensionAuditDownloadHistoryTrustSignature(trust);
}

export function dimensionAuditDownloadHistorySnapshot({
  project_id="",
  project_name="",
  generated_at=null,
  attempts=[]
}={}){
  if(!Array.isArray(attempts))throw new TypeError("audit download history attempts must be an array");
  const historyTimestamp=generated_at==null?null:new Date(generated_at);
  if(historyTimestamp&&Number.isNaN(historyTimestamp.getTime()))throw new TypeError("audit download history generated_at must be a valid timestamp");
  const safeAttempts=attempts.map(attempt=>structuredClone(attempt));
  const summary=dimensionAuditDownloadHistorySummary(safeAttempts);
  const protocolState=dimensionAuditDownloadHistoryProtocolState();
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA,
    project_id:String(project_id??""),
    project_name:String(project_name??""),
    ...(historyTimestamp==null?{}:{generated_at:historyTimestamp.toISOString()}),
    summary,
    summary_signature:dimensionAuditDownloadHistorySummarySignature(summary),
    protocol_state:protocolState,
    protocol_state_signature:dimensionAuditDownloadHistoryProtocolStateSignature(protocolState),
    attempt_count:safeAttempts.length,
    attempts:safeAttempts
  };
  const signed={
    ...base,
    snapshot_signature:dimensionAuditDownloadHistorySignature(base)
  };
  const integrity=dimensionAuditDownloadHistoryIntegrity(signed);
  const protocolBinding=dimensionAuditDownloadHistoryProtocolBinding(signed);
  const full={
    ...signed,
    attempts_valid:integrity.attempts_valid,
    summary_valid:integrity.summary_valid,
    protocol_binding:protocolBinding,
    protocol_binding_signature:dimensionAuditDownloadHistoryProtocolBindingSignature(protocolBinding),
    protocol_binding_valid:protocolBinding.valid===true,
    integrity,
    integrity_signature:dimensionAuditDownloadHistoryIntegritySignature(integrity),
    valid:integrity.valid
  };
  const enveloped={
    ...full,
    envelope_signature:dimensionAuditDownloadHistoryEnvelopeSignature(full)
  };
  const checked={
    ...enveloped,
    envelope_valid:dimensionAuditDownloadHistoryEnvelopeValid(enveloped)
  };
  const health=dimensionAuditDownloadHistoryHealth(checked);
  const withHealth={
    ...checked,
    health,
    health_signature:dimensionAuditDownloadHistoryHealthSignature(health)
  };
  const healthEmbedding=dimensionAuditDownloadHistoryHealthEmbedding(withHealth);
  const complete={
    ...withHealth,
    health_embedding:healthEmbedding,
    health_embedding_signature:dimensionAuditDownloadHistoryHealthEmbeddingSignature(healthEmbedding)
  };
  const verification=dimensionAuditDownloadHistoryVerification(complete);
  const verified={
    ...complete,
    verification,
    verification_signature:dimensionAuditDownloadHistoryVerificationSignature(verification)
  };
  const verificationEmbedding=dimensionAuditDownloadHistoryVerificationEmbedding(verified);
  const verifiedEmbedding={
    ...verified,
    verification_embedding:verificationEmbedding,
    verification_embedding_signature:dimensionAuditDownloadHistoryVerificationEmbeddingSignature(verificationEmbedding)
  };
  const attestation=dimensionAuditDownloadHistoryAttestation(verifiedEmbedding);
  const attested={
    ...verifiedEmbedding,
    attestation,
    attestation_signature:dimensionAuditDownloadHistoryAttestationSignature(attestation)
  };
  const attestationEmbedding=dimensionAuditDownloadHistoryAttestationEmbedding(attested);
  return freeze({
    ...attested,
    attestation_embedding:attestationEmbedding,
    attestation_embedding_signature:dimensionAuditDownloadHistoryAttestationEmbeddingSignature(attestationEmbedding)
  });
}

export function dimensionAuditDownloadHistoryValid(snapshot={}){
  return dimensionAuditDownloadHistoryIntegrity(snapshot).valid;
}
