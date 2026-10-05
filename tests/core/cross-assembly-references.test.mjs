import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  createAssembly,
  assemblyContextForMember,
  crossAssemblyMetadata
} from "../../src/domain/project/assemblies.mjs";
import { createDimension } from "../../src/domain/measurements/dimensions.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const assemblyRuntime=fs.readFileSync(path.join(root,"src","ui","assemblies-runtime.js"),"utf8");
const objectContext=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const measurements=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 77: member context records direct Assembly local point and full hierarchy path",()=>{
  const project={};
  const child=createAssembly(project,{
    id:"child",name:"Child",frame:{origin_mm:{x:100,y:0,z:0}},
    members:[{ref:{kind:"tube",id:"t1"},local:{position_mm:{x:10,y:0,z:0}}}]
  });
  const parent=createAssembly(project,{
    id:"parent",name:"Parent",frame:{origin_mm:{x:0,y:0,z:0}},
    members:[{ref:{kind:"assembly",id:child.id},local:{position_mm:{x:100,y:0,z:0}}}]
  });
  const ctx=assemblyContextForMember(project,{kind:"tube",id:"t1"},{world_point:{x:110,y:5,z:0}});
  assert.equal(ctx.assembly_id,"child");
  assert.deepEqual(ctx.assembly_path,["parent","child"]);
  assert.deepEqual(ctx.local_point_mm,{x:10,y:5,z:0});
});

test("question 77: relation between different Assembly contexts is explicitly cross-assembly",()=>{
  const relation=crossAssemblyMetadata([
    {space:"assembly",assembly_id:"A",assembly_path:["A"]},
    {space:"assembly",assembly_id:"B",assembly_path:["B"]}
  ]);
  assert.equal(relation.cross_assembly,true);
  assert.equal(relation.relation_space,"CrossAssembly");
  assert.deepEqual(Array.from(relation.assembly_ids),["A","B"]);
});

test("question 77: relation inside one Assembly is not mislabeled",()=>{
  const relation=crossAssemblyMetadata([
    {space:"assembly",assembly_id:"A",assembly_path:["A"]},
    {space:"assembly",assembly_id:"A",assembly_path:["A"]}
  ]);
  assert.equal(relation.cross_assembly,false);
  assert.equal(relation.relation_space,"SameAssembly");
});

test("question 77: permanent Dimension preserves Assembly context and cross metadata",()=>{
  const contextA={space:"assembly",assembly_id:"A",assembly_path:["A"],local_point_mm:{x:1,y:2,z:3},world_point_mm:{x:11,y:2,z:3}};
  const contextB={space:"assembly",assembly_id:"B",assembly_path:["B"],local_point_mm:{x:4,y:5,z:6},world_point_mm:{x:24,y:5,z:6}};
  const cross=crossAssemblyMetadata([contextA,contextB]);
  const d=createDimension({
    id:"dim-cross",
    kind:"point-point-length",
    references:[
      {object_id:"t1",subentity_id:"P1",assembly_context:contextA,cross_assembly:true},
      {object_id:"t2",subentity_id:"P2",assembly_context:contextB,cross_assembly:true}
    ],
    cross_assembly:cross,
    value:13
  });
  assert.equal(d.cross_assembly.cross_assembly,true);
  assert.equal(d.references[0].assembly_context.assembly_id,"A");
  assert.equal(d.references[1].assembly_context.assembly_id,"B");
  assert.equal(d.references[0].cross_assembly,true);
});

test("question 77: Assembly runtime exposes generic persistent cross-link and construction annotation APIs",()=>{
  assert.doesNotThrow(()=>new vm.Script(assemblyRuntime,{filename:"assemblies-runtime.js"}));
  assert.match(assemblyRuntime,/function registerCrossAssemblyLink\(/);
  assert.match(assemblyRuntime,/cross_assembly_links/);
  assert.match(assemblyRuntime,/function decorateConstructionGeometry\(/);
  assert.match(assemblyRuntime,/associative_references/);
  assert.match(assemblyRuntime,/cross_assembly=clone\(decorated\.cross_assembly\)/);
});

test("question 77: Snap candidates keep world and local Assembly context and remain available across Assemblies",()=>{
  assert.match(objectContext,/assembly_context=assembliesApi\(\)\?\.contextForObjectId/);
  assert.match(objectContext,/crossAssembly/);
  assert.match(objectContext,/↔ Assembly/);
  assert.match(objectContext,/metadata:\{/);
  assert.match(objectContext,/source_assembly_id/);
  const snapBlock=objectContext.slice(objectContext.indexOf("function snapCandidatesAtEvent"),objectContext.indexOf("function applyMaterialOpacity"));
  assert.doesNotMatch(snapBlock,/resolveInteraction/);
  assert.doesNotMatch(snapBlock,/activeEditAssembly.*continue/);
});

test("question 77: active P1 P2 Snap falls back to active tube ID for Assembly context",()=>{
  assert.match(objectContext,/data\.tubeId\?\?activeTubeId\(\)\?\?objectId/);
});

test("question 77: Quick Measure and saved Dimension explicitly show and persist Cross-Assembly",()=>{
  assert.match(measurements,/function decorateMeasurementResult\(/);
  assert.match(measurements,/crossAssemblyForContexts/);
  assert.match(measurements,/↔ Cross-Assembly/);
  assert.match(measurements,/cross_assembly:clone\(lastResult\.cross_assembly\?\?null\)/);
  assert.match(measurements,/assembly_context:clone\(candidate\?\.metadata\?\.assembly_context\?\?null\)/);
});
