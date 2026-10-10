import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {runIsolatedStartup} from "../../src/domain/performance/render-startup.mjs";

test("PERF-003: startup status requires successful bind, not merely attempted bind",()=>{
  const source=fs.readFileSync(new URL("../../scripts/build-standalone.mjs",import.meta.url),"utf8");
  assert.match(source,/status\.booted=status\.phases\.some\(phase=>phase\.name===/);
  assert.match(source,/phase\.status===/);
  assert.match(source,/if\(!status\.booted\)return/);
  assert.doesNotMatch(source,/status\.booted=true;status\.starting=false/);
});

test("PERF-003: failed core binding remains a failed startup even if optional stages succeed",()=>{
  const stages=runIsolatedStartup([
    ["ensureIndustrialState",()=>{}],
    ["bind",()=>{throw Error("binding failed");}],
    ["optional",()=>{}]
  ]);
  const booted=stages.some(phase=>phase.name==="bind"&&phase.status==="ok");
  assert.equal(booted,false);
  assert.deepEqual(stages.map(stage=>stage.status),["ok","failed","ok"]);
});

test("PERF-003: successful binding remains booted even after independent optional failure",()=>{
  const stages=runIsolatedStartup([
    ["optional",()=>{throw Error("optional module failed");}],
    ["bind",()=>{}]
  ]);
  assert.equal(stages.some(phase=>phase.name==="bind"&&phase.status==="ok"),true);
});
