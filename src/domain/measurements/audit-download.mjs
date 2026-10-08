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


export function dimensionAuditDownloadAttemptSignature(attempt={}){
  const value=attempt??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    status:String(value.status??""),
    filename:String(value.filename??""),
    snapshot_schema:value.snapshot_schema==null?null:String(value.snapshot_schema),
    code:String(value.code??""),
    preflight_signature:String(value.preflight_signature??""),
    runtime_signature:String(value.runtime_signature??""),
    protocol_signature:String(value.protocol_signature??""),
    error:value.error==null?null:String(value.error),
    generated_at:String(value.generated_at??"")
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
  return freeze({
    ...base,
    signature:dimensionAuditDownloadAttemptSignature(base)
  });
}

export function dimensionAuditDownloadAttemptValid(attempt={}){
  const value=attempt??{};
  const status=String(value.status??"");
  const signature=String(value.signature??"");
  const error=value.error==null?null:String(value.error);
  const outcomeValid=status==="failed"?!!error:error===null;
  return String(value.schema??"")===DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA
    &&["blocked","downloaded","failed"].includes(status)
    &&outcomeValid
    &&!!signature
    &&signature===dimensionAuditDownloadAttemptSignature(value);
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
  const value=summary??{};
  const counts={blocked:0,downloaded:0,failed:0};
  for(const attempt of attempts){
    const status=String(attempt?.status??"");
    if(!Object.prototype.hasOwnProperty.call(counts,status))return false;
    counts[status]++;
  }
  return String(value.schema??"")===DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA
    &&Number(value.total??-1)===attempts.length
    &&Number(value.blocked??-1)===counts.blocked
    &&Number(value.downloaded??-1)===counts.downloaded
    &&Number(value.failed??-1)===counts.failed
    &&String(value.latest_signature??"")===String(attempts.at(-1)?.signature??"");
}

export function dimensionAuditDownloadHistorySummarySignature(summary={}){
  const value=summary??{};
  return JSON.stringify({
    schema:String(value.schema??""),
    total:Number(value.total??0),
    blocked:Number(value.blocked??0),
    downloaded:Number(value.downloaded??0),
    failed:Number(value.failed??0),
    latest_signature:String(value.latest_signature??"")
  });
}

export function dimensionAuditDownloadHistorySignature(snapshot={}){
  const value=snapshot??{};
  const attempts=Array.isArray(value.attempts)?value.attempts:[];
  return JSON.stringify({
    schema:String(value.schema??""),
    project_id:String(value.project_id??""),
    project_name:String(value.project_name??""),
    generated_at:String(value.generated_at??""),
    summary_signature:String(value.summary_signature??""),
    protocol_state_signature:String(value.protocol_state_signature??""),
    attempt_count:Number(value.attempt_count??0),
    attempt_signatures:attempts.map(attempt=>String(attempt?.signature??""))
  });
}

export function dimensionAuditDownloadHistoryIntegrity(snapshot={}){
  const value=snapshot??{};
  const attempts=Array.isArray(value.attempts)?value.attempts:[];
  const summary=value.summary??{};
  const historySchemaValid=String(value.schema??"")===DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA;
  const attemptCountValid=Number(value.attempt_count??-1)===attempts.length;
  const attemptsValid=attempts.every(attempt=>dimensionAuditDownloadAttemptValid(attempt));
  const summaryValid=dimensionAuditDownloadHistorySummaryValid(summary,attempts);
  const summarySignatureValid=String(value.summary_signature??"")===dimensionAuditDownloadHistorySummarySignature(summary);
  const protocolState=value.protocol_state??null;
  const protocolStateSignatureValid=!!protocolState
    &&String(value.protocol_state_signature??"")===dimensionAuditDownloadHistoryProtocolStateSignature(protocolState);
  const protocolStateValid=dimensionAuditDownloadHistoryProtocolBindingValid(value);
  const signature=String(value.snapshot_signature??"");
  const snapshotSignatureValid=!signature||signature===dimensionAuditDownloadHistorySignature(value);
  const errors=[
    !historySchemaValid?"INVALID_HISTORY_SCHEMA":null,
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
    attempt_count_valid:value.attempt_count_valid===true,
    attempts_valid:value.attempts_valid===true,
    summary_valid:value.summary_valid===true,
    summary_signature_valid:value.summary_signature_valid===true,
    protocol_state_valid:value.protocol_state_valid===true,
    protocol_state_signature_valid:value.protocol_state_signature_valid===true,
    snapshot_signature_valid:value.snapshot_signature_valid===true
  });
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

export function dimensionAuditDownloadHistoryProtocolValidation(protocol=dimensionAuditDownloadHistoryProtocol()){
  const value=protocol??{};
  const errors=[
    String(value.schema??"")!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_SCHEMA?"INVALID_PROTOCOL_SCHEMA":null,
    String(value.attempt_schema??"")!==DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA?"INVALID_ATTEMPT_SCHEMA":null,
    String(value.history_schema??"")!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA?"INVALID_HISTORY_SCHEMA":null,
    String(value.summary_schema??"")!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA?"INVALID_SUMMARY_SCHEMA":null,
    String(value.integrity_schema??"")!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_INTEGRITY_SCHEMA?"INVALID_INTEGRITY_SCHEMA":null,
    JSON.stringify([...(value.integrity_codes??[])].map(code=>String(code)))!==JSON.stringify([...DIMENSION_AUDIT_DOWNLOAD_HISTORY_INTEGRITY_CODES])?"INVALID_INTEGRITY_CODES":null,
    String(value.envelope_schema??"")!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_ENVELOPE_SCHEMA?"INVALID_ENVELOPE_SCHEMA":null,
    String(value.validation_schema??"")!==DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_VALIDATION_SCHEMA?"INVALID_PROTOCOL_VALIDATION_SCHEMA":null,
    JSON.stringify([...(value.validation_codes??[])].map(code=>String(code)))!==JSON.stringify([...DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_VALIDATION_CODES])?"INVALID_PROTOCOL_VALIDATION_CODES":null
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

export function dimensionAuditDownloadHistoryProtocolStateValid(state=dimensionAuditDownloadHistoryProtocolState()){
  const value=state??{};
  const protocol=value.protocol??{};
  const validation=value.validation??{};
  const protocolSignature=String(value.protocol_signature??"");
  const validationSignature=String(value.validation_signature??"");
  const expectedValidation=dimensionAuditDownloadHistoryProtocolValidation(protocol);
  return String(value.schema??"")===DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_STATE_SCHEMA
    &&protocolSignature===dimensionAuditDownloadHistoryProtocolSignature(protocol)
    &&validationSignature===dimensionAuditDownloadHistoryProtocolValidationSignature(validation)
    &&dimensionAuditDownloadHistoryProtocolValidationSignature(expectedValidation)===validationSignature
    &&value.valid===validation.valid
    &&value.valid===expectedValidation.valid;
}

export function dimensionAuditDownloadHistoryProtocolBindingValid(snapshot={}){
  const value=snapshot??{};
  const state=value.protocol_state??null;
  return !!state
    &&dimensionAuditDownloadHistoryProtocolStateValid(state)
    &&String(value.protocol_state_signature??"")===dimensionAuditDownloadHistoryProtocolStateSignature(state);
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
    &&String(value.protocol_state_signature??"")===dimensionAuditDownloadHistoryProtocolStateSignature(state);
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

export function dimensionAuditDownloadHistoryEnvelopeValid(snapshot={}){
  const value=snapshot??{};
  const coreIntegrity=dimensionAuditDownloadHistoryIntegrity(value);
  const embeddedIntegrity=value.integrity??null;
  const embeddedIntegritySignature=String(value.integrity_signature??"");
  const embeddedIntegrityValid=!!embeddedIntegrity
    &&dimensionAuditDownloadHistoryIntegritySignature(embeddedIntegrity)===embeddedIntegritySignature
    &&dimensionAuditDownloadHistoryIntegritySignature(coreIntegrity)===embeddedIntegritySignature;
  const embeddedBinding=value.protocol_binding??null;
  const embeddedBindingSignature=String(value.protocol_binding_signature??"");
  const coreBinding=dimensionAuditDownloadHistoryProtocolBinding(value);
  const embeddedBindingValid=!!embeddedBinding
    &&dimensionAuditDownloadHistoryProtocolBindingSignature(embeddedBinding)===embeddedBindingSignature
    &&dimensionAuditDownloadHistoryProtocolBindingSignature(coreBinding)===embeddedBindingSignature;
  const envelopeSignature=String(value.envelope_signature??"");
  const envelopeSignatureValid=!envelopeSignature||envelopeSignature===dimensionAuditDownloadHistoryEnvelopeSignature(value);
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

export function dimensionAuditDownloadHistoryEmbeddedHealthValid(snapshot={}){
  const value=snapshot??{};
  const embedded=value.health??null;
  const signature=String(value.health_signature??"");
  if(!embedded||!signature)return false;
  const embeddedValid=dimensionAuditDownloadHistoryHealthSignature(embedded)===signature;
  const current=dimensionAuditDownloadHistoryHealth(value);
  const currentValid=dimensionAuditDownloadHistoryHealthSignature(current)===signature;
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
  const signature=String(value.health_signature??"");
  const present=!!embedded&&!!signature;
  const signatureValid=present&&dimensionAuditDownloadHistoryHealthSignature(embedded)===signature;
  const current=dimensionAuditDownloadHistoryHealth(value);
  const currentSignature=dimensionAuditDownloadHistoryHealthSignature(current);
  const currentValid=present&&currentSignature===signature;
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

export function dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid(snapshot={}){
  const value=snapshot??{};
  const embedded=value.health_embedding??null;
  const signature=String(value.health_embedding_signature??"");
  if(!embedded||!signature)return false;
  const embeddedValid=dimensionAuditDownloadHistoryHealthEmbeddingSignature(embedded)===signature;
  const current=dimensionAuditDownloadHistoryHealthEmbedding(value);
  const currentValid=dimensionAuditDownloadHistoryHealthEmbeddingSignature(current)===signature;
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

export function dimensionAuditDownloadHistoryEmbeddedVerificationValid(snapshot={}){
  const value=snapshot??{};
  const embedded=value.verification??null;
  const signature=String(value.verification_signature??"");
  if(!embedded||!signature)return false;
  const embeddedValid=dimensionAuditDownloadHistoryVerificationSignature(embedded)===signature;
  const current=dimensionAuditDownloadHistoryVerification(value);
  const currentValid=dimensionAuditDownloadHistoryVerificationSignature(current)===signature;
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
  const signature=String(value.verification_signature??"");
  const present=!!embedded&&!!signature;
  const signatureValid=present&&dimensionAuditDownloadHistoryVerificationSignature(embedded)===signature;
  const current=dimensionAuditDownloadHistoryVerification(value);
  const currentSignature=dimensionAuditDownloadHistoryVerificationSignature(current);
  const currentValid=present&&currentSignature===signature;
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

export function dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(snapshot={}){
  const value=snapshot??{};
  const embedded=value.verification_embedding??null;
  const signature=String(value.verification_embedding_signature??"");
  if(!embedded||!signature)return false;
  const embeddedValid=dimensionAuditDownloadHistoryVerificationEmbeddingSignature(embedded)===signature;
  const current=dimensionAuditDownloadHistoryVerificationEmbedding(value);
  const currentValid=dimensionAuditDownloadHistoryVerificationEmbeddingSignature(current)===signature;
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

export function dimensionAuditDownloadHistoryEmbeddedAttestationValid(snapshot={}){
  const value=snapshot??{};
  const embedded=value.attestation??null;
  const signature=String(value.attestation_signature??"");
  if(!embedded||!signature)return false;
  const embeddedValid=dimensionAuditDownloadHistoryAttestationSignature(embedded)===signature;
  const current=dimensionAuditDownloadHistoryAttestation(value);
  const currentValid=dimensionAuditDownloadHistoryAttestationSignature(current)===signature;
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
  const signature=String(value.attestation_signature??"");
  const present=!!embedded&&!!signature;
  const signatureValid=present&&dimensionAuditDownloadHistoryAttestationSignature(embedded)===signature;
  const current=dimensionAuditDownloadHistoryAttestation(value);
  const currentSignature=dimensionAuditDownloadHistoryAttestationSignature(current);
  const currentValid=present&&currentSignature===signature;
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

export function dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(snapshot={}){
  const value=snapshot??{};
  const embedded=value.attestation_embedding??null;
  const signature=String(value.attestation_embedding_signature??"");
  if(!embedded||!signature)return false;
  const embeddedValid=dimensionAuditDownloadHistoryAttestationEmbeddingSignature(embedded)===signature;
  const current=dimensionAuditDownloadHistoryAttestationEmbedding(value);
  const currentValid=dimensionAuditDownloadHistoryAttestationEmbeddingSignature(current)===signature;
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

export function dimensionAuditDownloadHistorySnapshot({
  project_id="",
  project_name="",
  generated_at=null,
  attempts=[]
}={}){
  if(!Array.isArray(attempts))throw new TypeError("audit download history attempts must be an array");
  const safeAttempts=attempts.map(attempt=>structuredClone(attempt));
  const summary=dimensionAuditDownloadHistorySummary(safeAttempts);
  const protocolState=dimensionAuditDownloadHistoryProtocolState();
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA,
    project_id:String(project_id??""),
    project_name:String(project_name??""),
    ...(generated_at==null?{}:{generated_at:String(generated_at)}),
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
