const EPS=1e-9;
function p(v){return {x:Number(v?.x)||0,y:Number(v?.y)||0,z:Number(v?.z)||0};}
function sub(a,b){return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};}
function add(a,b){return {x:a.x+b.x,y:a.y+b.y,z:a.z+b.z};}
function mul(a,s){return {x:a.x*s,y:a.y*s,z:a.z*s};}
function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
function len(a){return Math.hypot(a.x,a.y,a.z);}
function unit(a){const l=len(a);if(!(l>EPS))throw new RangeError("plane normal must be non-zero");return mul(a,1/l);}
function uniquePoints(points,tol=1e-7){
  const out=[];
  for(const q of points){
    if(!out.some(v=>Math.hypot(v.x-q.x,v.y-q.y,v.z-q.z)<=tol))out.push(q);
  }
  return out;
}
export function intersectTriangleWithPlane(triangle,{point,normal}={}){
  const tri=(triangle??[]).map(p);if(tri.length!==3)throw new Error("triangle requires 3 points");
  const n=unit(p(normal)),o=p(point);
  const d=tri.map(v=>dot(sub(v,o),n));
  if(d.every(v=>Math.abs(v)<=EPS))return Object.freeze({status:"coplanar",segment:null});
  if(d.every(v=>v>EPS)||d.every(v=>v<-EPS))return Object.freeze({status:"none",segment:null});
  const hits=[];
  for(let i=0;i<3;i++){
    const a=tri[i],b=tri[(i+1)%3],da=d[i],db=d[(i+1)%3];
    if(Math.abs(da)<=EPS)hits.push(a);
    if((da>EPS&&db<-EPS)||(da<-EPS&&db>EPS)){
      const t=da/(da-db);hits.push(add(a,mul(sub(b,a),t)));
    }
  }
  const points=uniquePoints(hits);
  if(points.length<2)return Object.freeze({status:"point",segment:null,point:points[0]??null});
  let best=[points[0],points[1]],bestLen=0;
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    const l=len(sub(points[i],points[j]));if(l>bestLen){bestLen=l;best=[points[i],points[j]];}
  }
  if(bestLen<=EPS)return Object.freeze({status:"point",segment:null,point:best[0]});
  return Object.freeze({status:"segment",segment:Object.freeze(best.map(v=>Object.freeze({...v})))});
}
export function pointInsideBox(point,{min,max},tol=1e-7){
  const q=p(point),a=p(min),b=p(max);
  return q.x>=a.x-tol&&q.x<=b.x+tol&&q.y>=a.y-tol&&q.y<=b.y+tol&&q.z>=a.z-tol&&q.z<=b.z+tol;
}
export function clipSegmentToBox(segment,{min,max}={}){
  const a=p(segment?.[0]),b=p(segment?.[1]),mn=p(min),mx=p(max),d=sub(b,a);
  let t0=0,t1=1;
  for(const [origin,delta,lo,hi] of [[a.x,d.x,mn.x,mx.x],[a.y,d.y,mn.y,mx.y],[a.z,d.z,mn.z,mx.z]]){
    if(Math.abs(delta)<=EPS){if(origin<lo-EPS||origin>hi+EPS)return null;continue;}
    let ta=(lo-origin)/delta,tb=(hi-origin)/delta;if(ta>tb)[ta,tb]=[tb,ta];
    t0=Math.max(t0,ta);t1=Math.min(t1,tb);if(t0>t1+EPS)return null;
  }
  const p0=add(a,mul(d,t0)),p1=add(a,mul(d,t1));
  if(len(sub(p1,p0))<=EPS)return null;
  return Object.freeze([Object.freeze(p0),Object.freeze(p1)]);
}
export function sectionSegmentsFromTriangles(triangles,section){
  const out=[];
  const mode=String(section?.mode??"off");
  if(mode==="off"||section?.enabled===false)return Object.freeze(out);
  const planes=mode==="plane"
    ?[{point:section.plane.point,normal:section.plane.flipped?mul(p(section.plane.normal),-1):section.plane.normal,face:"plane"}]
    :[
      {point:{x:section.box.min.x,y:0,z:0},normal:{x:1,y:0,z:0},face:"xmin"},
      {point:{x:section.box.max.x,y:0,z:0},normal:{x:1,y:0,z:0},face:"xmax"},
      {point:{x:0,y:section.box.min.y,z:0},normal:{x:0,y:1,z:0},face:"ymin"},
      {point:{x:0,y:section.box.max.y,z:0},normal:{x:0,y:1,z:0},face:"ymax"},
      {point:{x:0,y:0,z:section.box.min.z},normal:{x:0,y:0,z:1},face:"zmin"},
      {point:{x:0,y:0,z:section.box.max.z},normal:{x:0,y:0,z:1},face:"zmax"}
    ];
  for(let ti=0;ti<(triangles??[]).length;ti++){
    for(const plane of planes){
      const hit=intersectTriangleWithPlane(triangles[ti],plane);
      if(hit.status!=="segment")continue;
      const clipped=mode==="box"?clipSegmentToBox(hit.segment,section.box):hit.segment;
      if(!clipped)continue;
      out.push(Object.freeze({triangle_index:ti,face:plane.face,segment:clipped}));
    }
  }
  return Object.freeze(out);
}
