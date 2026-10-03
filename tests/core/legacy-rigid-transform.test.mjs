import test from "node:test";
import assert from "node:assert/strict";
import {
  effectiveLegacyBendAxis,
  replayLegacyDirection,
  angleBetweenVectorsDeg
} from "../../src/recognition/legacy-row-kinematics.mjs";
import {
  rotateLegacyTubeRigid,
  translateLegacyTubeRigid
} from "../../src/domain/editing/legacy-rigid-transform.mjs";
import {
  rotationMatrix,
  transformPoint,
  transformVector
} from "../../src/domain/editing/transform-commands.mjs";

function near(a,b,tol=1e-7){
  for(const key of ["x","y","z"]){
    assert.ok(Math.abs(Number(a[key])-Number(b[key]))<=tol,`${key}: ${a[key]} vs ${b[key]}`);
  }
}
function arr(v){return [Number(v.x),Number(v.y),Number(v.z)];}
function obj(v){return {x:v[0],y:v[1],z:v[2]};}
function unit(v){
  const l=Math.hypot(...v);
  return v.map((x)=>x/l);
}
function replay(rows,start){
  const result=[];
  let incoming=unit(start);
  for(let i=0;i<rows.length;i++){
    const row=rows[i];
    if(row.type==="LINE"){
      result.push({rowIndex:i,type:"LINE",direction:[...incoming]});
    }else{
      const effective=[...effectiveLegacyBendAxis(incoming,row.plane,row.rot??0)];
      const outgoing=[...replayLegacyDirection(incoming,{angle:row.angle,plane:row.plane,rotation:row.rot??0})];
      result.push({rowIndex:i,type:"BEND",incoming:[...incoming],outgoing:[...outgoing],effective});
      incoming=outgoing;
    }
  }
  return result;
}

function sample(){
  return {
    id:"tube-1",
    name:"Spatial",
    origin:{x:10,y:20,z:30},
    startVector:{x:1,y:0,z:0},
    rows:[
      {type:"LINE",L:100,LFormula:"100",elementId:"e0"},
      {type:"BEND",angle:90,angleFormula:"90.00",plane:"XY",rot:35,rotFormula:"35.00",clr:50,elementId:"e1"},
      {type:"LINE",L:80,LFormula:"80",elementId:"e2"},
      {type:"BEND",angle:-60,angleFormula:"-60.00",plane:"YZ",rot:-22,rotFormula:"-22.00",clr:40,elementId:"e3"},
      {type:"LINE",L:120,LFormula:"120",elementId:"e4"}
    ],
    engineering:{
      ports:{
        P1:{locked:true,position:{x:10,y:20,z:30},direction:{x:1,y:0,z:0}},
        P2:{locked:false,position:{x:100,y:200,z:300},direction:{x:0,y:1,z:0}}
      }
    }
  };
}

test("rigid tube rotation preserves nominal line lengths bend angles and CLR",()=>{
  const source=sample();
  const result=rotateLegacyTubeRigid(source,{
    axis:{x:1,y:1,z:1},
    center:{x:5,y:-10,z:7},
    angle_deg:37
  });
  assert.equal(result.status,"exact");
  assert.equal(result.nominal_scalars_preserved,true);
  assert.equal(result.rigid_body_only,true);
  assert.deepEqual(
    result.tube.rows.filter((r)=>r.type==="LINE").map((r)=>r.L),
    source.rows.filter((r)=>r.type==="LINE").map((r)=>r.L)
  );
  assert.deepEqual(
    result.tube.rows.filter((r)=>r.type==="BEND").map((r)=>[r.angle,r.clr]),
    source.rows.filter((r)=>r.type==="BEND").map((r)=>[r.angle,r.clr])
  );
});

test("re-encoded legacy plane and rot reproduce rigidly rotated bend directions and axes",()=>{
  const source=sample();
  const axis={x:0.3,y:0.8,z:-0.2},center={x:12,y:-4,z:9},angle_deg=71;
  const matrix=rotationMatrix({axis,center,angle_deg});
  const result=rotateLegacyTubeRigid(source,{axis,center,angle_deg});
  assert.equal(result.status,"exact");

  const before=replay(source.rows,arr(source.startVector));
  const after=replay(result.tube.rows,arr(result.tube.startVector));

  assert.equal(before.length,after.length);
  for(let i=0;i<before.length;i++){
    if(before[i].type==="LINE"){
      const expected=unit(arr(transformVector(matrix,obj(before[i].direction))));
      assert.ok(angleBetweenVectorsDeg(after[i].direction,expected)<1e-5);
    }else{
      const expectedOut=unit(arr(transformVector(matrix,obj(before[i].outgoing))));
      const expectedAxis=unit(arr(transformVector(matrix,obj(before[i].effective))));
      assert.ok(angleBetweenVectorsDeg(after[i].outgoing,expectedOut)<1e-5);
      assert.ok(angleBetweenVectorsDeg(after[i].effective,expectedAxis)<1e-5);
    }
  }
});

test("rigid rotation transforms tube origin around selected center",()=>{
  const source=sample();
  const axis={x:0,y:0,z:1},center={x:0,y:0,z:0};
  const matrix=rotationMatrix({axis,center,angle_deg:90});
  const result=rotateLegacyTubeRigid(source,{axis,center,angle_deg:90});
  near(result.tube.origin,transformPoint(matrix,source.origin));
  near(result.tube.engineering.ports.P1.position,result.tube.origin);
});

test("P2 world point and direction rotate with whole tube even when P2 is unlocked",()=>{
  const source=sample();
  const matrix=rotationMatrix({axis:{x:0,y:0,z:1},center:{x:0,y:0,z:0},angle_deg:90});
  const result=rotateLegacyTubeRigid(source,{axis:{x:0,y:0,z:1},center:{x:0,y:0,z:0},angle_deg:90});
  near(result.tube.engineering.ports.P2.position,transformPoint(matrix,source.engineering.ports.P2.position));
  const expected=transformVector(matrix,source.engineering.ports.P2.direction);
  assert.ok(angleBetweenVectorsDeg(arr(result.tube.engineering.ports.P2.direction),arr(expected))<1e-7);
});

test("translation is rigid and never changes intrinsic rows",()=>{
  const source=sample();
  const result=translateLegacyTubeRigid(source,{x:5,y:-7,z:11});
  assert.equal(result.status,"exact");
  near(result.tube.origin,{x:15,y:13,z:41});
  assert.deepEqual(result.tube.rows,source.rows);
  near(result.tube.engineering.ports.P2.position,{x:105,y:193,z:311});
});

test("rigid rotation fails closed on malformed row data",()=>{
  const source=sample();
  source.rows[1].plane="BAD";
  assert.throws(
    ()=>rotateLegacyTubeRigid(source,{axis:{x:0,y:0,z:1},angle_deg:30}),
    /unsupported legacy bend plane/
  );
});
