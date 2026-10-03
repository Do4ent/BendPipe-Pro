const EPS=1e-12;
function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const key of Object.keys(value))value[key]=freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}
function num(v,name){const n=Number(v);if(!Number.isFinite(n))throw new TypeError(`${name} must be finite`);return n;}
function vec(v,name="vector"){
  if(!v||typeof v!=="object")throw new TypeError(`${name} must be an object`);
  return {x:num(v.x,`${name}.x`),y:num(v.y,`${name}.y`),z:num(v.z,`${name}.z`)};
}
function add(a,b){return {x:a.x+b.x,y:a.y+b.y,z:a.z+b.z};}
function sub(a,b){return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};}
function scale(a,s){return {x:a.x*s,y:a.y*s,z:a.z*s};}
function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
function cross(a,b){return {x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x};}
function length(a){return Math.hypot(a.x,a.y,a.z);}
function unit(a,name="vector"){const l=length(a);if(!(l>EPS))throw new RangeError(`${name} must be non-zero`);return scale(a,1/l);}
function identity(){
  return freeze([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
}
function rawMatrix(values){
  if(!Array.isArray(values)||values.length!==16)throw new TypeError("matrix must contain 16 values");
  return freeze(values.map((v,i)=>num(v,`matrix[${i}]`)));
}
export function multiplyMatrices(a,b){
  const A=rawMatrix(a),B=rawMatrix(b),out=new Array(16).fill(0);
  for(let r=0;r<4;r++)for(let c=0;c<4;c++)for(let k=0;k<4;k++)out[r*4+c]+=A[r*4+k]*B[k*4+c];
  return freeze(out);
}
export function transformPoint(matrix,point){
  const m=rawMatrix(matrix),p=vec(point,"point");
  const x=m[0]*p.x+m[1]*p.y+m[2]*p.z+m[3];
  const y=m[4]*p.x+m[5]*p.y+m[6]*p.z+m[7];
  const z=m[8]*p.x+m[9]*p.y+m[10]*p.z+m[11];
  const w=m[12]*p.x+m[13]*p.y+m[14]*p.z+m[15];
  if(Math.abs(w)<EPS)throw new RangeError("point transformed to w=0");
  return freeze({x:x/w,y:y/w,z:z/w});
}
export function transformVector(matrix,vector){
  const m=rawMatrix(matrix),v=vec(vector,"vector");
  return freeze({
    x:m[0]*v.x+m[1]*v.y+m[2]*v.z,
    y:m[4]*v.x+m[5]*v.y+m[6]*v.z,
    z:m[8]*v.x+m[9]*v.y+m[10]*v.z
  });
}
export function translationMatrix(delta){
  const d=vec(delta,"delta");
  return freeze([1,0,0,d.x,0,1,0,d.y,0,0,1,d.z,0,0,0,1]);
}
export function moveByPoints(basePoint,targetPoint){
  const b=vec(basePoint,"basePoint"),t=vec(targetPoint,"targetPoint");
  const delta=sub(t,b);
  return freeze({kind:"Move",delta,matrix:translationMatrix(delta)});
}
export function rotationMatrix({axis,angle_rad,angle_deg,center={x:0,y:0,z:0}}={}){
  const a=unit(vec(axis,"axis"),"axis");
  const theta=angle_rad!==undefined?num(angle_rad,"angle_rad"):num(angle_deg,"angle_deg")*Math.PI/180;
  const c=Math.cos(theta),s=Math.sin(theta),t=1-c;
  const {x,y,z}=a;
  const R=rawMatrix([
    t*x*x+c,t*x*y-s*z,t*x*z+s*y,0,
    t*x*y+s*z,t*y*y+c,t*y*z-s*x,0,
    t*x*z-s*y,t*y*z+s*x,t*z*z+c,0,
    0,0,0,1
  ]);
  const p=vec(center,"center");
  return multiplyMatrices(
    translationMatrix(p),
    multiplyMatrices(R,translationMatrix(scale(p,-1)))
  );
}
export function rotateTransform(options={}){
  const matrix=rotationMatrix(options);
  return freeze({kind:"Rotate",matrix,axis:unit(vec(options.axis,"axis")),center:vec(options.center??{x:0,y:0,z:0},"center"),angle_rad:options.angle_rad!==undefined?num(options.angle_rad,"angle_rad"):num(options.angle_deg,"angle_deg")*Math.PI/180});
}
export function mirrorMatrix({plane_point={x:0,y:0,z:0},plane_normal}={}){
  const p=vec(plane_point,"plane_point"),n=unit(vec(plane_normal,"plane_normal"),"plane_normal");
  const {x,y,z}=n;
  const R=rawMatrix([
    1-2*x*x,-2*x*y,-2*x*z,0,
    -2*y*x,1-2*y*y,-2*y*z,0,
    -2*z*x,-2*z*y,1-2*z*z,0,
    0,0,0,1
  ]);
  return multiplyMatrices(translationMatrix(p),multiplyMatrices(R,translationMatrix(scale(p,-1))));
}
export function mirrorTransform(options={}){
  return freeze({kind:"Mirror",matrix:mirrorMatrix(options),plane_point:vec(options.plane_point??{x:0,y:0,z:0},"plane_point"),plane_normal:unit(vec(options.plane_normal,"plane_normal"),"plane_normal"),handedness:"reflected"});
}
export function composeTransformStack(stack=[]){
  if(!Array.isArray(stack))throw new TypeError("stack must be an array");
  let result=identity();
  for(const op of stack){
    if(op?.enabled===false)continue;
    result=multiplyMatrices(op.matrix,result);
  }
  return result;
}
export function createTransformOperation(input={}){
  const kind=String(input.kind??"").trim();
  if(!kind)throw new TypeError("transform operation kind is required");
  return freeze({
    id:String(input.id??(`transform-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`)),
    kind,
    matrix:rawMatrix(input.matrix??identity()),
    enabled:input.enabled!==false,
    associative:input.associative===true,
    metadata:freeze(structuredClone(input.metadata??{}))
  });
}
export function reorderTransformStack(stack,fromIndex,toIndex){
  if(!Array.isArray(stack))throw new TypeError("stack must be an array");
  if(!Number.isInteger(fromIndex)||!Number.isInteger(toIndex)||fromIndex<0||toIndex<0||fromIndex>=stack.length||toIndex>=stack.length)throw new RangeError("transform stack index out of range");
  const next=[...stack], [item]=next.splice(fromIndex,1);next.splice(toIndex,0,item);return freeze(next);
}
export function toggleTransformOperation(stack,id,enabled){
  return freeze(stack.map((op)=>op.id===id?freeze({...structuredClone(op),enabled:enabled===true}):op));
}
export function linearArrayTransforms({count,step,direction}={}){
  const n=Math.trunc(num(count,"count"));
  if(n<1)throw new RangeError("count must be >= 1");
  const d=unit(vec(direction,"direction"),"direction"),s=num(step,"step");
  return freeze(Array.from({length:n},(_,i)=>translationMatrix(scale(d,s*i))));
}
export function matrixArrayTransforms({counts=[1,1,1],steps=[0,0,0],directions=[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}]}={}){
  if(!Array.isArray(counts)||counts.length!==3||!Array.isArray(steps)||steps.length!==3||!Array.isArray(directions)||directions.length!==3)throw new TypeError("matrix array requires 3 counts, steps and directions");
  const c=counts.map((v,i)=>{const n=Math.trunc(num(v,`counts[${i}]`));if(n<1)throw new RangeError("array counts must be >= 1");return n;});
  const s=steps.map((v,i)=>num(v,`steps[${i}]`));
  const d=directions.map((v,i)=>unit(vec(v,`directions[${i}]`),`directions[${i}]`));
  const out=[];
  for(let i=0;i<c[0];i++)for(let j=0;j<c[1];j++)for(let k=0;k<c[2];k++){
    const delta=add(add(scale(d[0],s[0]*i),scale(d[1],s[1]*j)),scale(d[2],s[2]*k));
    out.push(translationMatrix(delta));
  }
  return freeze(out);
}
export function circularArrayTransforms({count,center,axis,total_angle_deg=360,initial_angle_deg=0,rotate_elements=true}={}){
  const n=Math.trunc(num(count,"count"));
  if(n<1)throw new RangeError("count must be >= 1");
  const span=num(total_angle_deg,"total_angle_deg"),initial=num(initial_angle_deg,"initial_angle_deg"),c=vec(center,"center"),a=unit(vec(axis,"axis"),"axis");
  const step=n===1?0:span/n;
  const out=[];
  for(let i=0;i<n;i++){
    const angle=initial+step*i;
    const around=rotationMatrix({axis:a,center:c,angle_deg:angle});
    if(rotate_elements)out.push(around);
    else{
      const originMoved=transformPoint(around,{x:0,y:0,z:0});
      out.push(translationMatrix(originMoved));
    }
  }
  return freeze(out);
}
export function createAssociativeArray(input={}){
  const type=String(input.type??"").trim();
  if(!["Linear","Matrix","Circular"].includes(type))throw new RangeError("unsupported array type");
  return freeze({
    id:String(input.id??(`array-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`)),
    type,
    source_object_ids:freeze([...(input.source_object_ids??[])].map(String)),
    parameters:freeze(structuredClone(input.parameters??{})),
    suppressed_members:freeze([...(input.suppressed_members??[])].map((x)=>Math.trunc(Number(x))).filter(Number.isInteger)),
    associative:true
  });
}
export function arrayMemberTransforms(array){
  let transforms;
  if(array.type==="Linear")transforms=linearArrayTransforms(array.parameters);
  else if(array.type==="Matrix")transforms=matrixArrayTransforms(array.parameters);
  else transforms=circularArrayTransforms(array.parameters);
  const suppressed=new Set(array.suppressed_members??[]);
  return freeze(transforms.map((matrix,index)=>freeze({index,matrix,suppressed:suppressed.has(index)})));
}
export function suppressArrayMember(array,index,suppressed=true){
  const i=Math.trunc(num(index,"index"));if(i<0)throw new RangeError("index must be >= 0");
  const set=new Set(array.suppressed_members??[]);
  if(suppressed)set.add(i);else set.delete(i);
  return freeze({...structuredClone(array),suppressed_members:[...set].sort((a,b)=>a-b)});
}
export function breakAssociativeArray(array){
  return freeze({
    array_id:array.id,
    associative:false,
    members:arrayMemberTransforms(array).filter((x)=>!x.suppressed).map((x)=>freeze({source_object_ids:array.source_object_ids,member_index:x.index,matrix:x.matrix}))
  });
}
export const TransformMath=freeze({identity,add,sub,scale,dot,cross,length,unit});
