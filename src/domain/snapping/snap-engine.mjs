const EPS=1e-12;

export const SNAP_TYPES=Object.freeze([
  "Node","Vertex","Endpoint","Intersection","Center","Midpoint",
  "Tangent","Perpendicular","LineAxis","Plane","Nearest","Grid"
]);

export const DEFAULT_SNAP_PRIORITY=Object.freeze({
  Node:0,Vertex:0,Endpoint:1,Intersection:2,Center:3,Midpoint:4,
  Tangent:5,Perpendicular:6,LineAxis:7,Plane:8,Nearest:9,Grid:10
});

export const DEFAULT_SOURCE_PRIORITY=Object.freeze({
  Editable:0,
  Tube:1,
  Construction:2,
  SourceReference:3,
  MeshFitted:4,
  Grid:5
});

export const DEFAULT_SNAP_SETTINGS=Object.freeze({
  cursor_radius_px:12,
  point_tolerance_mm:0.01,
  linear_tolerance_mm:0.01,
  angular_tolerance_deg:0.05,
  coplanar_tolerance_mm:0.02,
  tangent_tolerance_deg:0.05,
  enabled:Object.freeze({
    Node:true,Vertex:true,Endpoint:true,Intersection:true,Center:true,Midpoint:true,
    Tangent:false,Perpendicular:false,LineAxis:true,Plane:true,Nearest:false,Grid:false
  }),
  allow_virtual_contextual:true,
  through_snap:false,
  show_all_candidates:true,
  snap_priority:DEFAULT_SNAP_PRIORITY,
  source_priority:DEFAULT_SOURCE_PRIORITY
});

function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const key of Object.keys(value))value[key]=freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}
function finite(value,name){
  const n=Number(value);
  if(!Number.isFinite(n))throw new TypeError(`${name} must be finite`);
  return n;
}
function point(value,name="point"){
  if(!value||typeof value!=="object")throw new TypeError(`${name} must be an object`);
  return {
    x:finite(value.x,`${name}.x`),
    y:finite(value.y,`${name}.y`),
    z:finite(value.z,`${name}.z`)
  };
}
function add(a,b){return {x:a.x+b.x,y:a.y+b.y,z:a.z+b.z};}
function sub(a,b){return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};}
function mul(a,s){return {x:a.x*s,y:a.y*s,z:a.z*s};}
function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
function cross(a,b){return {x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x};}
function len(a){return Math.hypot(a.x,a.y,a.z);}
function unit(a,name="vector"){const l=len(a);if(!(l>EPS))throw new RangeError(`${name} must be non-zero`);return mul(a,1/l);}
function distance(a,b){return len(sub(a,b));}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

export function normalizeSnapSettings(input={}){
  const enabled={...DEFAULT_SNAP_SETTINGS.enabled,...(input.enabled??{})};
  const snap_priority={...DEFAULT_SNAP_PRIORITY,...(input.snap_priority??{})};
  const source_priority={...DEFAULT_SOURCE_PRIORITY,...(input.source_priority??{})};
  return freeze({
    cursor_radius_px:Math.max(1,finite(input.cursor_radius_px??DEFAULT_SNAP_SETTINGS.cursor_radius_px,"cursor_radius_px")),
    point_tolerance_mm:Math.max(0,finite(input.point_tolerance_mm??DEFAULT_SNAP_SETTINGS.point_tolerance_mm,"point_tolerance_mm")),
    linear_tolerance_mm:Math.max(0,finite(input.linear_tolerance_mm??DEFAULT_SNAP_SETTINGS.linear_tolerance_mm,"linear_tolerance_mm")),
    angular_tolerance_deg:Math.max(0,finite(input.angular_tolerance_deg??DEFAULT_SNAP_SETTINGS.angular_tolerance_deg,"angular_tolerance_deg")),
    coplanar_tolerance_mm:Math.max(0,finite(input.coplanar_tolerance_mm??DEFAULT_SNAP_SETTINGS.coplanar_tolerance_mm,"coplanar_tolerance_mm")),
    tangent_tolerance_deg:Math.max(0,finite(input.tangent_tolerance_deg??DEFAULT_SNAP_SETTINGS.tangent_tolerance_deg,"tangent_tolerance_deg")),
    enabled,
    allow_virtual_contextual:input.allow_virtual_contextual!==false,
    through_snap:input.through_snap===true,
    show_all_candidates:input.show_all_candidates!==false,
    snap_priority,
    source_priority
  });
}

export function createSnapCandidate(input={}){
  const type=String(input.type??"");
  if(!SNAP_TYPES.includes(type))throw new RangeError(`unsupported snap type: ${type}`);
  const source=String(input.source??"Editable");
  const candidate={
    id:String(input.id??(`snap-${type}-${Math.random().toString(36).slice(2,9)}`)),
    type,
    source,
    object_id:input.object_id==null?null:String(input.object_id),
    subentity_id:input.subentity_id==null?null:String(input.subentity_id),
    point:point(input.point??{x:0,y:0,z:0}),
    screen_distance_px:Math.max(0,finite(input.screen_distance_px??0,"screen_distance_px")),
    visible:input.visible!==false,
    virtual:input.virtual===true,
    through:input.through===true,
    fitted:input.fitted===true,
    confidence:input.confidence==null?1:clamp(finite(input.confidence,"confidence"),0,1),
    label:input.label==null?type:String(input.label),
    metadata:freeze(structuredClone(input.metadata??{}))
  };
  return freeze(candidate);
}

function candidateAllowed(candidate,settings,{contextual_types=[],through_snap=null,nearest_override=false}={}){
  const enabled=settings.enabled[candidate.type]===true||
    contextual_types.includes(candidate.type)||
    (candidate.type==="Nearest"&&nearest_override);
  if(!enabled)return false;
  if(candidate.screen_distance_px>settings.cursor_radius_px)return false;
  const throughEnabled=through_snap==null?settings.through_snap:through_snap===true;
  if(!candidate.visible&&!throughEnabled&&!candidate.through)return false;
  if(candidate.through&&!throughEnabled)return false;
  if(candidate.virtual&&!settings.allow_virtual_contextual&&!contextual_types.includes(candidate.type))return false;
  return true;
}

function rankTuple(candidate,settings){
  const source=settings.source_priority[candidate.source]??999;
  const type=settings.snap_priority[candidate.type]??999;
  const real=candidate.virtual?1:0;
  const exact=candidate.fitted?1:0;
  const distance=candidate.screen_distance_px;
  const confidence=-candidate.confidence;
  return [source,type,real,exact,distance,confidence,candidate.id];
}
function compareTuple(a,b){
  for(let i=0;i<Math.min(a.length,b.length);i++){
    if(a[i]<b[i])return -1;
    if(a[i]>b[i])return 1;
  }
  return 0;
}

export function rankSnapCandidates(candidates,settingsInput={},options={}){
  const settings=normalizeSnapSettings(settingsInput);
  if(!Array.isArray(candidates))throw new TypeError("candidates must be an array");
  return freeze(
    candidates
      .map((c)=>c?.type?createSnapCandidate(c):null)
      .filter(Boolean)
      .filter((c)=>candidateAllowed(c,settings,options))
      .sort((a,b)=>compareTuple(rankTuple(a,settings),rankTuple(b,settings)))
  );
}

export function selectBestSnapCandidate(candidates,settings={},options={}){
  return rankSnapCandidates(candidates,settings,options)[0]??null;
}

export function cycleSnapCandidate(candidates,currentId,direction=1,settings={},options={}){
  const ranked=rankSnapCandidates(candidates,settings,options);
  if(!ranked.length)return null;
  const current=ranked.findIndex((c)=>c.id===currentId);
  const step=direction<0?-1:1;
  const next=current<0?0:(current+step+ranked.length)%ranked.length;
  return ranked[next];
}

export function segmentSnapCandidates({start,end,object_id=null,source="Editable",include_line=true}={}){
  const a=point(start,"start"),b=point(end,"end");
  const mid=mul(add(a,b),0.5);
  const out=[
    createSnapCandidate({id:`${object_id??"segment"}:start`,type:"Endpoint",source,object_id,subentity_id:"start",point:a}),
    createSnapCandidate({id:`${object_id??"segment"}:end`,type:"Endpoint",source,object_id,subentity_id:"end",point:b}),
    createSnapCandidate({id:`${object_id??"segment"}:mid`,type:"Midpoint",source,object_id,subentity_id:"mid",point:mid})
  ];
  if(include_line)out.push(createSnapCandidate({
    id:`${object_id??"segment"}:line`,
    type:"LineAxis",source,object_id,subentity_id:"axis",point:mid,
    metadata:{direction:unit(sub(b,a),"segment")}
  }));
  return freeze(out);
}

export function circleSnapCandidates({center,radius_mm,normal={x:0,y:0,z:1},object_id=null,source="Editable"}={}){
  const c=point(center,"center"),r=finite(radius_mm,"radius_mm");
  if(!(r>0))throw new RangeError("radius_mm must be > 0");
  const n=unit(point(normal,"normal"),"normal");
  return freeze([
    createSnapCandidate({
      id:`${object_id??"circle"}:center`,type:"Center",source,object_id,subentity_id:"center",point:c,
      metadata:{radius_mm:r,normal:n}
    })
  ]);
}

export function projectPointToLine(pointValue,linePoint,lineDirection){
  const p=point(pointValue),a=point(linePoint),d=unit(point(lineDirection,"lineDirection"),"lineDirection");
  const t=dot(sub(p,a),d);
  return freeze({point:add(a,mul(d,t)),parameter:t,distance_mm:distance(p,add(a,mul(d,t)))});
}

export function perpendicularSnapCandidate({
  point:sourcePoint,
  line_point,
  line_direction,
  object_id=null,
  source="Editable",
  parameter_min=null,
  parameter_max=null,
  subentity_id="perpendicular"
}={}){
  const projection=projectPointToLine(sourcePoint,line_point,line_direction);
  const finiteRange=Number.isFinite(Number(parameter_min))&&Number.isFinite(Number(parameter_max));
  const min=finiteRange?Math.min(Number(parameter_min),Number(parameter_max)):null;
  const max=finiteRange?Math.max(Number(parameter_min),Number(parameter_max)):null;
  const onEntity=finiteRange?projection.parameter>=min-EPS&&projection.parameter<=max+EPS:false;
  return createSnapCandidate({
    id:`${object_id??"line"}:perpendicular:${subentity_id}`,
    type:"Perpendicular",source,object_id,subentity_id,point:projection.point,
    virtual:!onEntity,
    metadata:{
      line_parameter:projection.parameter,
      distance_mm:projection.distance_mm,
      parameter_min:min,
      parameter_max:max,
      on_entity:onEntity,
      extension:!onEntity,
      constraint_type:"Perpendicular",
      direction:unit(point(line_direction,"line_direction"),"line_direction")
    }
  });
}

function planeBasis(normal,preferred){
  const n=unit(point(normal??{x:0,y:0,z:1},"normal"),"normal");
  let e1=preferred?sub(point(preferred),mul(n,dot(point(preferred),n))):null;
  if(!e1||len(e1)<=EPS){
    const fallback=Math.abs(n.x)<0.8?{x:1,y:0,z:0}:{x:0,y:1,z:0};
    e1=cross(n,fallback);
  }
  e1=unit(e1,"plane basis");
  const e2=unit(cross(n,e1),"plane basis perpendicular");
  return {n,e1,e2};
}
function orientedAngleDeg(vector,basis){
  const v=unit(vector,"arc vector");
  let a=Math.atan2(dot(v,basis.e2),dot(v,basis.e1))*180/Math.PI;
  if(a<0)a+=360;
  return a;
}
function angleWithinArc(angle,start,end,tolerance=1e-7){
  let a=((angle%360)+360)%360,s=((start%360)+360)%360,e=((end%360)+360)%360;
  if(Math.abs(s-e)<=tolerance)return true;
  if(e>=s)return a>=s-tolerance&&a<=e+tolerance;
  return a>=s-tolerance||a<=e+tolerance;
}
function arcMembership(pointValue,centerValue,normal,{
  arc_start_deg=null,
  arc_end_deg=null,
  arc_basis_x=null
}={}){
  if(!Number.isFinite(Number(arc_start_deg))||!Number.isFinite(Number(arc_end_deg)))return {finite:false,on_entity:true,angle_deg:null};
  const c=point(centerValue,"center"),p=point(pointValue),basis=planeBasis(normal,arc_basis_x);
  const angle=orientedAngleDeg(sub(p,c),basis);
  return {finite:true,on_entity:angleWithinArc(angle,Number(arc_start_deg),Number(arc_end_deg)),angle_deg:angle};
}

export function tangentPointsFromPointToCircle({
  point:sourcePoint,
  center,
  radius_mm,
  normal={x:0,y:0,z:1}
}={}){
  const p=point(sourcePoint,"point"),c=point(center,"center"),r=finite(radius_mm,"radius_mm");
  if(!(r>0))throw new RangeError("radius_mm must be > 0");
  const basis0=planeBasis(normal,sub(p,c)),n=basis0.n;
  const pc=sub(p,c),planeOffset=dot(pc,n),projected=sub(pc,mul(n,planeOffset)),d=len(projected);
  if(d<r-EPS)return freeze([]);
  if(d<=EPS)return freeze([]);
  const e1=unit(projected,"projected source"),e2=unit(cross(n,e1),"tangent perpendicular");
  const x=r*r/d;
  const ySquared=Math.max(0,r*r-x*x);
  const y=Math.sqrt(ySquared);
  const first=add(c,add(mul(e1,x),mul(e2,y)));
  if(y<=EPS)return freeze([first]);
  const second=add(c,add(mul(e1,x),mul(e2,-y)));
  return freeze([first,second]);
}

export function tangentSnapCandidates({
  point:sourcePoint,
  center,
  radius_mm,
  normal={x:0,y:0,z:1},
  object_id=null,
  source="Editable",
  subentity_id="circle",
  arc_start_deg=null,
  arc_end_deg=null,
  arc_basis_x=null
}={}){
  const solutions=tangentPointsFromPointToCircle({point:sourcePoint,center,radius_mm,normal});
  return freeze(solutions.map((solution,index)=>{
    const membership=arcMembership(solution,center,normal,{arc_start_deg,arc_end_deg,arc_basis_x});
    return createSnapCandidate({
      id:`${object_id??"circle"}:tangent:${subentity_id}:${index}`,
      type:"Tangent",source,object_id,subentity_id:String(subentity_id)+":tangent:"+index,point:solution,
      virtual:membership.finite&&!membership.on_entity,
      label:membership.finite&&!membership.on_entity?"Tangent · Virtual":"Tangent",
      metadata:{
        radius_mm:Number(radius_mm),
        center:point(center),
        normal:unit(point(normal),"normal"),
        solution_index:index,
        on_entity:membership.on_entity,
        extension:membership.finite&&!membership.on_entity,
        arc_angle_deg:membership.angle_deg,
        constraint_type:"Tangent"
      }
    });
  }));
}

export function perpendicularCircleSnapCandidates({
  point:sourcePoint,
  center,
  radius_mm,
  normal={x:0,y:0,z:1},
  object_id=null,
  source="Editable",
  subentity_id="circle",
  arc_start_deg=null,
  arc_end_deg=null,
  arc_basis_x=null
}={}){
  const p=point(sourcePoint,"point"),c=point(center,"center"),r=finite(radius_mm,"radius_mm");
  if(!(r>0))throw new RangeError("radius_mm must be > 0");
  const n=unit(point(normal),"normal"),pc=sub(p,c),projected=sub(pc,mul(n,dot(pc,n)));
  if(len(projected)<=EPS)return freeze([]);
  const d=unit(projected,"projected source");
  const points=[add(c,mul(d,r)),add(c,mul(d,-r))];
  return freeze(points.map((solution,index)=>{
    const membership=arcMembership(solution,c,n,{arc_start_deg,arc_end_deg,arc_basis_x});
    return createSnapCandidate({
      id:`${object_id??"circle"}:perpendicular:${subentity_id}:${index}`,
      type:"Perpendicular",source,object_id,subentity_id:String(subentity_id)+":perpendicular:"+index,point:solution,
      virtual:membership.finite&&!membership.on_entity,
      label:membership.finite&&!membership.on_entity?"Perpendicular · Virtual":"Perpendicular",
      metadata:{
        radius_mm:r,center:c,normal:n,solution_index:index,
        on_entity:membership.on_entity,
        extension:membership.finite&&!membership.on_entity,
        arc_angle_deg:membership.angle_deg,
        constraint_type:"Perpendicular"
      }
    });
  }));
}

export function lineLineRelation(lineA,lineB,{tolerance_mm=0.01}={}){
  const a=point(lineA.point,"lineA.point"),u=unit(point(lineA.direction,"lineA.direction"),"lineA.direction");
  const b=point(lineB.point,"lineB.point"),v=unit(point(lineB.direction,"lineB.direction"),"lineB.direction");
  const w=sub(a,b),aa=dot(u,u),bb=dot(u,v),cc=dot(v,v),dd=dot(u,w),ee=dot(v,w);
  const denom=aa*cc-bb*bb;
  let s,t;
  if(Math.abs(denom)<EPS){s=0;t=ee/cc;}
  else{s=(bb*ee-cc*dd)/denom;t=(aa*ee-bb*dd)/denom;}
  const pA=add(a,mul(u,s)),pB=add(b,mul(v,t)),gap=distance(pA,pB),mid=mul(add(pA,pB),0.5);
  return freeze({
    kind:gap<=tolerance_mm?"RealIntersection":"ClosestPoints",
    intersects:gap<=tolerance_mm,
    point:mid,
    point_a:pA,
    point_b:pB,
    gap_mm:gap,
    parameter_a:s,
    parameter_b:t,
    parallel:Math.abs(denom)<EPS
  });
}

export function lineIntersectionSnapCandidate({lineA,lineB,object_id=null,source="Editable",tolerance_mm=0.01,allow_closest=false}={}){
  const relation=lineLineRelation(lineA,lineB,{tolerance_mm});
  if(!relation.intersects&&!allow_closest)return null;
  return createSnapCandidate({
    id:`${object_id??"intersection"}:${relation.kind}`,
    type:"Intersection",source,object_id,subentity_id:relation.kind,point:relation.point,
    virtual:!relation.intersects,
    metadata:relation
  });
}

export function projectPointToPlane(pointValue,plane){
  const p=point(pointValue,"point"),o=point(plane?.point??{x:0,y:0,z:0},"plane.point"),n=unit(point(plane?.normal??{x:0,y:0,z:1},"plane.normal"),"plane.normal");
  const signed=dot(sub(p,o),n);
  return freeze({point:sub(p,mul(n,signed)),signed_distance_mm:signed});
}
export function projectDirectionToPlane(directionValue,plane){
  const d=unit(point(directionValue,"direction"),"direction"),n=unit(point(plane?.normal??{x:0,y:0,z:1},"plane.normal"),"plane.normal");
  const projected=sub(d,mul(n,dot(d,n)));
  if(len(projected)<=EPS)return null;
  return freeze(unit(projected,"projected direction"));
}
export function projectedLineIntersection({lineA,lineB,plane,tolerance_mm=0.01}={}){
  const aPoint=projectPointToPlane(lineA?.point,plane),bPoint=projectPointToPlane(lineB?.point,plane);
  const aDir=projectDirectionToPlane(lineA?.direction,plane),bDir=projectDirectionToPlane(lineB?.direction,plane);
  if(!aDir||!bDir)return freeze({status:"DegenerateProjection",point:null});
  const relation=lineLineRelation(
    {point:aPoint.point,direction:aDir},
    {point:bPoint.point,direction:bDir},
    {tolerance_mm}
  );
  if(relation.parallel)return freeze({status:"ParallelProjection",point:null,relation});
  return freeze({
    status:"ProjectedIntersection",
    point:relation.point,
    relation,
    source_plane_distances_mm:[aPoint.signed_distance_mm,bPoint.signed_distance_mm]
  });
}
export function lineLineIntersectionCandidates({
  lineA,
  lineB,
  working_plane=null,
  object_id=null,
  source="Editable",
  tolerance_mm=0.01,
  include_projected=true,
  include_closest=true
}={}){
  const relation=lineLineRelation(lineA,lineB,{tolerance_mm}),out=[];
  if(relation.intersects){
    out.push(createSnapCandidate({
      id:`${object_id??"intersection"}:real`,
      type:"Intersection",source,object_id,subentity_id:"real-intersection",point:relation.point,
      virtual:false,label:"Real Intersection",
      metadata:{...relation,kind:"RealIntersection",constraint_type:"Coincident"}
    }));
  }else{
    if(include_projected&&working_plane){
      const projected=projectedLineIntersection({lineA,lineB,plane:working_plane,tolerance_mm});
      if(projected.status==="ProjectedIntersection"){
        out.push(createSnapCandidate({
          id:`${object_id??"intersection"}:projected`,
          type:"Intersection",source,object_id,subentity_id:"projected-intersection",point:projected.point,
          virtual:true,label:"Projected Intersection",
          metadata:{...projected,kind:"ProjectedIntersection",working_plane:clonePlane(working_plane)}
        }));
      }
    }
    if(include_closest){
      for(const [index,p] of [relation.point_a,relation.point_b].entries()){
        out.push(createSnapCandidate({
          id:`${object_id??"intersection"}:closest:${index}`,
          type:"Intersection",source,object_id,subentity_id:`closest-point-${index}`,point:p,
          virtual:true,label:`Closest Point ${index===0?"A":"B"}`,
          metadata:{...relation,kind:"ClosestPoints",closest_point_index:index,pair_point:index===0?relation.point_b:relation.point_a}
        }));
      }
    }
  }
  return freeze(out);
}
function clonePlane(plane){
  return {
    point:point(plane?.point??{x:0,y:0,z:0},"plane.point"),
    normal:unit(point(plane?.normal??{x:0,y:0,z:1},"plane.normal"),"plane.normal")
  };
}


export function linePlaneIntersection({line,plane,tolerance=EPS}={}){
  const a=point(line.point,"line.point"),d=unit(point(line.direction,"line.direction"),"line.direction");
  const p=point(plane.point,"plane.point"),n=unit(point(plane.normal,"plane.normal"),"plane.normal");
  const denom=dot(d,n);
  if(Math.abs(denom)<=tolerance)return freeze({status:"Parallel",point:null,parameter:null});
  const t=dot(sub(p,a),n)/denom;
  return freeze({status:"Intersection",point:add(a,mul(d,t)),parameter:t});
}

export function linePlaneSnapCandidate({line,plane,object_id=null,source="Construction"}={}){
  const hit=linePlaneIntersection({line,plane});
  if(hit.status!=="Intersection")return null;
  return createSnapCandidate({
    id:`${object_id??"line-plane"}:intersection`,
    type:"Intersection",source,object_id,subentity_id:"line-plane",point:hit.point,
    virtual:true,metadata:{line_parameter:hit.parameter}
  });
}

export function nearestPointCandidate({point:nearest,object_id=null,source="Editable",screen_distance_px=0}={}){
  return createSnapCandidate({
    id:`${object_id??"object"}:nearest`,type:"Nearest",source,object_id,subentity_id:"nearest",
    point:nearest,screen_distance_px
  });
}

export function gridSnapCandidate({point:gridPoint,object_id="grid",screen_distance_px=0}={}){
  return createSnapCandidate({
    id:`${object_id}:grid`,type:"Grid",source:"Grid",object_id,subentity_id:"grid",
    point:gridPoint,screen_distance_px
  });
}

export function createObjectSnapTrackingRay({anchor,direction,source_candidate_id=null,label=null}={}){
  const a=point(anchor,"anchor"),d=unit(point(direction,"direction"),"direction");
  return freeze({
    anchor:a,
    direction:d,
    source_candidate_id:source_candidate_id==null?null:String(source_candidate_id),
    label:label==null?"Object Snap Tracking":String(label)
  });
}

export function objectSnapTrackingCandidate({cursor,ray,object_id="tracking",source="Construction",screen_distance_px=0}={}){
  if(!ray)throw new TypeError("tracking ray is required");
  const projection=projectPointToLine(cursor,ray.anchor,ray.direction);
  return createSnapCandidate({
    id:`${object_id}:tracking:${ray.source_candidate_id??"ray"}`,
    type:"LineAxis",
    source,
    object_id,
    subentity_id:"object-snap-tracking",
    point:projection.point,
    screen_distance_px,
    virtual:true,
    label:ray.label??"Object Snap Tracking",
    metadata:{
      tracking:true,
      source_candidate_id:ray.source_candidate_id??null,
      line_parameter:projection.parameter,
      distance_mm:projection.distance_mm,
      direction:ray.direction
    }
  });
}

export function intersectObjectSnapTrackingRays(rayA,rayB,{tolerance_mm=0.01,object_id="tracking"}={}){
  if(!rayA||!rayB)throw new TypeError("two tracking rays are required");
  const candidate=lineIntersectionSnapCandidate({
    lineA:{point:rayA.anchor,direction:rayA.direction},
    lineB:{point:rayB.anchor,direction:rayB.direction},
    object_id,
    source:"Construction",
    tolerance_mm,
    allow_closest:false
  });
  if(!candidate)return null;
  return createSnapCandidate({
    ...candidate,
    id:`${object_id}:tracking-intersection`,
    type:"Intersection",
    virtual:true,
    label:"Object Snap Tracking Intersection",
    metadata:{
      ...candidate.metadata,
      tracking:true,
      source_candidate_ids:[rayA.source_candidate_id??null,rayB.source_candidate_id??null]
    }
  });
}

export const SnapMath=freeze({add,sub,mul,dot,cross,len,unit,distance});
