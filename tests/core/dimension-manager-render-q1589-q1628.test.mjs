import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1589: review-context sort derives one review context state",()=>{
  assert.match(ui,/if\(dimensionManagerSort==="review-context"\)\{\s*const reviewContextState=dimensionReviewContextState\(items,selectedDimensionAuditIds\(\)\)/);
});

test("question 1590: review-context sort prioritizes diagnostics error before pending and ready",()=>{
  assert.match(ui,/const healthRank=\{ "diagnostics-error":0,pending:1,ready:2,"not-required":3 \}/);
});

test("question 1591: review-context sort preserves original order for equal ranks",()=>{
  assert.match(ui,/\.sort\(\(a,b\)=>a\.rank-b\.rank\|\|a\.index-b\.index\)/);
});

test("question 1592: non-audit sort returns filtered result unchanged",()=>{
  assert.match(ui,/if\(dimensionManagerSort!=="audit"\)return result/);
});

test("question 1593: audit sort ranks Stale first",()=>{
  assert.match(ui,/const rank=dimension=>String\(dimension\?\.status\?\?"\"\)==="Stale"\s*\?0/);
});

test("question 1594: audit sort ranks needs-review after Stale",()=>{
  assert.match(ui,/:dimensionAuditNeedsReview\(dimension\)\?1/);
});

test("question 1595: audit sort ranks rebound-from-stale after needs-review",()=>{
  assert.match(ui,/:dimension\?\.rebound_from_stale===true\?2:3/);
});

test("question 1596: audit sort preserves source order inside equal ranks",()=>{
  assert.match(ui,/\.sort\(\(a,b\)=>rank\(a\.dimension\)-rank\(b\.dimension\)\|\|a\.index-b\.index\)/);
});

test("question 1597: dimension manager restores persisted audit-view state before rendering",()=>{
  assert.match(ui,/function dimensionManagerHtml\(\)\{\s*restoreDimensionAuditViewState\(\)/);
});

test("question 1598: unfocused dimension manager persists current audit-view state",()=>{
  assert.match(ui,/if\(!dimensionManagerFocusId\)persistDimensionAuditViewState\(\)/);
});

test("question 1599: dimension manager loads saved dimensions once at render start",()=>{
  assert.match(ui,/const items=savedDimensions\(\)/);
});

test("question 1600: empty dimension manager renders saved-dimensions empty state",()=>{
  assert.match(ui,/if\(!items\.length\)return '<div class="tb-measure-result"[^;]+Сохранённых размеров пока нет\./);
});

test("question 1601: dimension manager captures readonly state",()=>{
  assert.match(ui,/const locked=readonly\(\)/);
});

test("question 1602: dimension manager computes audit summary from current items",()=>{
  assert.match(ui,/const auditSummary=dimensionAuditSummary\(items\)/);
});

test("question 1603: dimension manager computes audit-download attempt history summary",()=>{
  assert.match(ui,/const auditDownloadHistorySummary=dimensionAuditDownloadAttemptHistorySummary\(\)/);
});

test("question 1604: attempt-history summary signature is derived from the computed summary",()=>{
  assert.match(ui,/const auditDownloadHistorySummarySignature=dimensionAuditDownloadAttemptHistorySummarySignature\(auditDownloadHistorySummary\)/);
});

test("question 1605: permit-evidence summary is computed for manager rendering",()=>{
  assert.match(ui,/const auditDownloadHistoryPermitEvidenceSummary=dimensionAuditDownloadHistoryPermitEvidenceSummary\(\)/);
});

test("question 1606: permit-evidence summary validity is checked against the computed summary",()=>{
  assert.match(ui,/const auditDownloadHistoryPermitEvidenceSummaryValid=dimensionAuditDownloadHistoryPermitEvidenceSummaryValid\(auditDownloadHistoryPermitEvidenceSummary\)/);
});

test("question 1607: latest permit evidence safely falls back to empty attempt",()=>{
  assert.match(ui,/dimensionAuditDownloadAttemptPermitEvidence\(dimensionAuditDownloadAttemptHistorySnapshot\(\)\.at\(-1\)\?\?\{\}\)/);
});

test("question 1608: export-event summary is computed for manager rendering",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventSummary=dimensionAuditDownloadHistoryExportEventSummary\(\)/);
});

test("question 1609: export-event summary validity is checked",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventSummaryValid=dimensionAuditDownloadHistoryExportEventSummaryValid\(auditDownloadHistoryExportEventSummary\)/);
});

test("question 1610: final-state evidence summary is computed",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventFinalStateEvidenceSummary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(\)/);
});

test("question 1611: final-state evidence summary validity is checked",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventFinalStateEvidenceSummaryValid=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid\(auditDownloadHistoryExportEventFinalStateEvidenceSummary\)/);
});

test("question 1612: final-state evidence summary signature is derived from the summary",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventFinalStateEvidenceSummarySignature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature\(auditDownloadHistoryExportEventFinalStateEvidenceSummary\)/);
});

test("question 1613: final-state evidence summary signature validity is checked",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid\(auditDownloadHistoryExportEventFinalStateEvidenceSummarySignature,auditDownloadHistoryExportEventFinalStateEvidenceSummary\)/);
});

test("question 1614: final-state evidence snapshot is built from the computed summary",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot\(auditDownloadHistoryExportEventFinalStateEvidenceSummary\)/);
});

test("question 1615: final-state evidence snapshot validity is checked",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid\(auditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot\)/);
});

test("question 1616: export-event summary signature is derived from summary",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventSummarySignature=dimensionAuditDownloadHistoryExportEventSummarySignature\(auditDownloadHistoryExportEventSummary\)/);
});

test("question 1617: export-event summary signature validity is checked",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventSummarySignatureValid=dimensionAuditDownloadHistoryExportEventSummarySignatureValid\(auditDownloadHistoryExportEventSummarySignature,auditDownloadHistoryExportEventSummary\)/);
});

test("question 1618: export-event history snapshot is computed",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventSnapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot\(\)/);
});

test("question 1619: export-event history snapshot validity is checked",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventSnapshotValid=dimensionAuditDownloadHistoryExportEventHistorySnapshotValid\(auditDownloadHistoryExportEventSnapshot\)/);
});

test("question 1620: export-event history signature validity is checked",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventSnapshotSignatureValid=dimensionAuditDownloadHistoryExportEventHistorySignatureValid\(auditDownloadHistoryExportEventSnapshot\.signature,auditDownloadHistoryExportEventSnapshot\)/);
});

test("question 1621: export-event log envelope binds history evidence and events",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventLogEnvelope=dimensionAuditDownloadHistoryExportEventLogEnvelope\(auditDownloadHistoryExportEventSnapshot,auditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,auditDownloadHistoryExportEventSnapshot\.events\)/);
});

test("question 1622: export-event log envelope validity is checked against its events",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventLogEnvelopeValid=dimensionAuditDownloadHistoryExportEventLogEnvelopeValid\(auditDownloadHistoryExportEventLogEnvelope,auditDownloadHistoryExportEventSnapshot\.events\)/);
});

test("question 1623: export-event log envelope snapshot is computed",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventLogEnvelopeSnapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot\(auditDownloadHistoryExportEventLogEnvelope,auditDownloadHistoryExportEventSnapshot\.events\)/);
});

test("question 1624: export-event log envelope snapshot validity is checked",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventLogEnvelopeSnapshotValid=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid\(auditDownloadHistoryExportEventLogEnvelopeSnapshot,auditDownloadHistoryExportEventSnapshot\.events\)/);
});

test("question 1625: latest export event is taken from the computed event snapshot",()=>{
  assert.match(ui,/const auditDownloadHistoryLatestExportEvent=auditDownloadHistoryExportEventSnapshot\.events\.at\(-1\)\?\?null/);
});

test("question 1626: manager computes one audit-download history snapshot",()=>{
  assert.match(ui,/const auditDownloadHistorySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)/);
});

test("question 1627: manager records audit-download history snapshot source",()=>{
  assert.match(ui,/const auditDownloadHistorySnapshotSource=dimensionAuditDownloadAttemptHistoryAuditSnapshotSource\(\)/);
});

test("question 1628: manager derives history health from the computed audit snapshot",()=>{
  assert.match(ui,/const auditDownloadHistoryHealth=dimensionAuditDownloadHistoryHealth\(auditDownloadHistorySnapshot\)/);
});
