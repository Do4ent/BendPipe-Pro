import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateNumericInput,
  evaluateAssociativeFormulas,
  parseCoordinateInput,
  applyOrthoTracking,
  applyPolarTracking,
  dynamicInputPreview,
  detectNumericDecimalSeparator,
  resolveDecimalSeparator,
  formatNumericInput,
  normalizeDecimalSeparatorPreference
} from "../../src/domain/editing/dynamic-input.mjs";

test("numeric input accepts formulas units and comma decimal",()=>{
  assert.equal(evaluateNumericInput("2*25,4mm"),50.8);
  assert.equal(evaluateNumericInput("1in+25.4mm"),50.8);
  assert.ok(Math.abs(evaluateNumericInput("3.141592653589793rad",{kind:"angle"})-180)<1e-9);
});

test("associative formulas resolve dependencies and reject cycles",()=>{
  const values=evaluateAssociativeFormulas({A:"100",B:"A+25",C:"B*2"});
  assert.equal(values.C,250);
  assert.throws(()=>evaluateAssociativeFormulas({A:"B+1",B:"A+1"}),/cycle/i);
});

test("coordinate input supports absolute relative polar and 3D",()=>{
  assert.deepEqual(parseCoordinateInput("10,20,30").point,{x:10,y:20,z:30});
  assert.deepEqual(parseCoordinateInput("@10;20;30",{origin:{x:1,y:2,z:3}}).point,{x:11,y:22,z:33});
  const polar=parseCoordinateInput("@100<90",{origin:{x:10,y:0,z:0}}).point;
  assert.ok(Math.abs(polar.x-10)<1e-9);assert.ok(Math.abs(polar.y-100)<1e-9);
  const polar3=parseCoordinateInput("@100<0<30").delta;
  assert.ok(Math.abs(polar3.z-50)<1e-9);
});

test("Ortho and Polar tracking are deterministic",()=>{
  assert.deepEqual(applyOrthoTracking({x:10,y:3,z:2},{enabled:true}),{x:10,y:0,z:0});
  const p=applyPolarTracking({x:10,y:2,z:5},{enabled:true,increment_deg:45});
  assert.ok(Math.abs(p.y)<1e-9);assert.equal(p.z,5);
});

test("live preview fails closed instead of inventing coordinates",()=>{
  const result=dynamicInputPreview("@bad",{origin:{x:0,y:0,z:0}});
  assert.equal(result.status,"Invalid");assert.equal(result.point,null);
});


test("question 58: dot and comma decimals are both accepted",()=>{
  assert.equal(evaluateNumericInput("12.5"),12.5);
  assert.equal(evaluateNumericInput("12,5"),12.5);
  assert.equal(detectNumericDecimalSeparator("12.5"),".");
  assert.equal(detectNumericDecimalSeparator("12,5"),",");
  assert.equal(resolveDecimalSeparator("auto",{input:"12,5"}),",");
  assert.equal(resolveDecimalSeparator("auto",{input:"12.5"}),".");
});

test("question 58: decimal comma coordinates use semicolon separators",()=>{
  assert.deepEqual(
    parseCoordinateInput("10,5;20,25;30,75",{decimal_separator:","}).point,
    {x:10.5,y:20.25,z:30.75}
  );
  assert.throws(
    ()=>parseCoordinateInput("10,20,30",{decimal_separator:","}),
    /semicolons/i
  );
  assert.deepEqual(
    parseCoordinateInput("10,20,30",{decimal_separator:"."}).point,
    {x:10,y:20,z:30}
  );
});

test("question 58: preferred separator validates and formats deterministically",()=>{
  assert.equal(normalizeDecimalSeparatorPreference("auto"),"auto");
  assert.equal(normalizeDecimalSeparatorPreference("."),".");
  assert.equal(normalizeDecimalSeparatorPreference(","),",");
  assert.throws(()=>normalizeDecimalSeparatorPreference("space"),/decimal_separator/);
  assert.equal(formatNumericInput(12.5,{decimal_separator:".",maximumFractionDigits:3}),"12.5");
  assert.equal(formatNumericInput(12.5,{decimal_separator:",",maximumFractionDigits:3}),"12,5");
});
