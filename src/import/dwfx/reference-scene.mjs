import {
  buildDisplayHsfSegmentIndex,
  decodeIndexedDisplaySegment
} from "./display-segment-index.mjs";

const IDENTITY=Object.freeze([
  1,0,0,0,
  0,1,0,0,
  0,0,1,0,
  0,0,0,1
]);

function decodeXml(value){
  return String(value??"").replace(
    /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g,
    (_match,entity)=>{
      if(entity==="amp")return "&";
      if(entity==="lt")return "<";
      if(entity==="gt")return ">";
      if(entity==="quot")return '"';
      if(entity==="apos")return "'";
      if(entity.startsWith("#x")){
        const code=Number.parseInt(entity.slice(2),16);
        return Number.isFinite(code)?String.fromCodePoint(code):_match;
      }
      if(entity.startsWith("#")){
        const code=Number.parseInt(entity.slice(1),10);
        return Number.isFinite(code)?String.fromCodePoint(code):_match;
      }
      return _match;
    }
  );
}

function parseAttributes(fragment){
  const out={};
  const pattern=/([A-Za-z_][\w:.-]*)\s*=\s*(["'])(.*?)\2/gs;
  for(const match of String(fragment??"").matchAll(pattern)){
    out[match[1].split(":").at(-1)]=decodeXml(match[3]);
  }
  return out;
}

export function parseDwfxObjectTree(contentXml){
  if(typeof contentXml!=="string")throw new TypeError("DWFx Content XML must be a string");

  const roots=[];
  const stack=[];
  const token=/<(?:[A-Za-z_][\w.-]*:)?Object\b([^>]*?)(\/?)>|<\/(?:[A-Za-z_][\w.-]*:)?Object\s*>/gs;

  for(const match of contentXml.matchAll(token)){
    const text=match[0];
    if(/^<\//.test(text)){
      if(stack.length===0)throw new RangeError("DWFx Object hierarchy has an unmatched closing Object");
      stack.pop();
      continue;
    }

    const attrs=parseAttributes(match[1]);
    if(!attrs.id)continue;
    const node={
      id:attrs.id,
      label:attrs.label??attrs.id,
      entity_ref:attrs.entityRef??null,
      children:[]
    };
    if(stack.length)stack.at(-1).children.push(node);
    else roots.push(node);

    if(match[2]!=="/")stack.push(node);
  }

  if(stack.length){
    throw new RangeError("DWFx Object hierarchy contains unclosed Object nodes");
  }
  if(roots.length===0){
    throw new RangeError("DWFx Content XML contains no Object hierarchy");
  }
  return roots;
}

function pathKey(path){
  return JSON.stringify(Array.isArray(path)?path:[]);
}
function isPrefix(prefix,path){
  if(!Array.isArray(prefix)||!Array.isArray(path)||prefix.length>path.length)return false;
  for(let i=0;i<prefix.length;i+=1){
    if(prefix[i]!==path[i])return false;
  }
  return true;
}

function matrix16(value){
  if(!Array.isArray(value)||value.length!==16)return IDENTITY;
  const out=value.map(Number);
  return out.every(Number.isFinite)?out:IDENTITY;
}

function multiply4(a,b){
  const out=new Array(16).fill(0);
  for(let col=0;col<4;col+=1){
    for(let row=0;row<4;row+=1){
      let sum=0;
      for(let k=0;k<4;k+=1){
        sum+=a[k*4+row]*b[col*4+k];
      }
      out[col*4+row]=sum;
    }
  }
  return out;
}

function inheritedMatrix(entities,target){
  const path=Array.isArray(target?.segment_path)?target.segment_path:[];
  const targetOffset=Number(target?.source_offset);
  const byPath=new Map();

  for(const entity of entities){
    if(entity?.kind!=="transform"||!Array.isArray(entity.segment_path))continue;
    if(Number.isFinite(targetOffset)&&Number(entity.source_offset)>targetOffset)continue;
    if(!isPrefix(entity.segment_path,path))continue;
    byPath.set(pathKey(entity.segment_path),entity);
  }

  const transforms=[...byPath.values()].sort(
    (a,b)=>
      a.segment_path.length-b.segment_path.length||
      Number(a.source_offset)-Number(b.source_offset)
  );
  return transforms.reduce(
    (matrix,entity)=>multiply4(matrix,matrix16(entity.matrix)),
    [...IDENTITY]
  );
}

function colorRgb(entity){
  const direct=entity?.rgb_bytes;
  const diffuse=entity?.channels?.diffuse?.rgb_bytes;
  const value=Array.isArray(direct)?direct:Array.isArray(diffuse)?diffuse:null;
  if(!value||value.length<3)return null;
  const rgb=value.slice(0,3).map(Number);
  return rgb.every((x)=>Number.isFinite(x)&&x>=0&&x<=255)?rgb:null;
}

function inheritedColor(entities,target){
  const path=Array.isArray(target?.segment_path)?target.segment_path:[];
  const targetOffset=Number(target?.source_offset);
  const candidates=entities.filter((entity)=>
    entity?.kind==="color"&&
    Array.isArray(entity.segment_path)&&
    isPrefix(entity.segment_path,path)&&
    (!Number.isFinite(targetOffset)||Number(entity.source_offset)<=targetOffset)&&
    colorRgb(entity)
  );
  if(!candidates.length)return Object.freeze([155,164,178]);
  candidates.sort(
    (a,b)=>
      a.segment_path.length-b.segment_path.length||
      Number(a.source_offset)-Number(b.source_offset)
  );
  return Object.freeze(colorRgb(candidates.at(-1)));
}

function transformPoint(point,matrix){
  const x=Number(point?.[0]),y=Number(point?.[1]),z=Number(point?.[2]);
  if(![x,y,z].every(Number.isFinite))return null;
  const m=matrix16(matrix);
  const w=m[3]*x+m[7]*y+m[11]*z+m[15];
  const denom=Number.isFinite(w)&&Math.abs(w)>1e-12?w:1;
  return Object.freeze([
    (m[0]*x+m[4]*y+m[8]*z+m[12])/denom,
    (m[1]*x+m[5]*y+m[9]*z+m[13])/denom,
    (m[2]*x+m[6]*y+m[10]*z+m[14])/denom
  ]);
}

function appendSegment(out,a,b,matrix){
  const p0=transformPoint(a,matrix);
  const p1=transformPoint(b,matrix);
  if(!p0||!p1)return;
  out.push(...p0,...p1);
}

function v3(value){
  if(!Array.isArray(value)||value.length<3)return null;
  const out=value.slice(0,3).map(Number);
  return out.every(Number.isFinite)?out:null;
}
function vAdd(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
function vSub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function vScale(a,s){return [a[0]*s,a[1]*s,a[2]*s];}
function vDot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function vCross(a,b){
  return [
    a[1]*b[2]-a[2]*b[1],
    a[2]*b[0]-a[0]*b[2],
    a[0]*b[1]-a[1]*b[0]
  ];
}
function vLen(a){return Math.hypot(a[0],a[1],a[2]);}
function vUnit(a){
  const length=vLen(a);
  return length>1e-12?vScale(a,1/length):null;
}
export function circularArcPolyline(entity){
  const start=v3(entity?.start);
  const middle=v3(entity?.middle);
  const end=v3(entity?.end);
  if(!start||!middle||!end)return null;

  const ab=vSub(middle,start);
  const ac=vSub(end,start);
  const normal=vCross(ab,ac);
  const normal2=vDot(normal,normal);
  if(normal2<=1e-18)return Object.freeze([start,middle,end]);

  let center=v3(entity?.center);
  if(!center){
    const term1=vScale(vCross(ac,normal),vDot(ab,ab));
    const term2=vScale(vCross(normal,ab),vDot(ac,ac));
    center=vAdd(start,vScale(vAdd(term1,term2),1/(2*normal2)));
  }

  const u=vUnit(vSub(start,center));
  const n=vUnit(normal);
  if(!u||!n)return Object.freeze([start,middle,end]);
  const v=vUnit(vCross(n,u));
  if(!v)return Object.freeze([start,middle,end]);

  const angleOf=(point)=>{
    const rel=vSub(point,center);
    return Math.atan2(vDot(rel,v),vDot(rel,u));
  };
  const normalize=(angle)=>{
    let out=angle%(Math.PI*2);
    if(out<0)out+=Math.PI*2;
    return out;
  };

  const midAngle=normalize(angleOf(middle));
  const endAngle=normalize(angleOf(end));
  const sweep=midAngle<=endAngle
    ? endAngle
    : endAngle-Math.PI*2;
  const radius=vLen(vSub(start,center));
  if(!Number.isFinite(radius)||radius<=1e-12){
    return Object.freeze([start,middle,end]);
  }

  const count=Math.max(8,Math.min(128,Math.ceil(Math.abs(sweep)/(Math.PI/36))));
  const points=[];
  for(let i=0;i<=count;i+=1){
    const angle=sweep*(i/count);
    const radial=vAdd(vScale(u,Math.cos(angle)*radius),vScale(v,Math.sin(angle)*radius));
    points.push(Object.freeze(vAdd(center,radial)));
  }
  return Object.freeze(points);
}

function buildLineAsset(entities){
  const positions=[];
  for(const entity of entities){
    const matrix=inheritedMatrix(entities,entity);
    if(entity?.kind==="polyline"&&Array.isArray(entity.points)){
      for(let i=1;i<entity.points.length;i+=1){
        appendSegment(positions,entity.points[i-1],entity.points[i],matrix);
      }
      continue;
    }
    if(entity?.kind==="polygon"&&Array.isArray(entity.points)&&entity.points.length>=2){
      for(let i=1;i<entity.points.length;i+=1){
        appendSegment(positions,entity.points[i-1],entity.points[i],matrix);
      }
      appendSegment(positions,entity.points.at(-1),entity.points[0],matrix);
      continue;
    }
    if(entity?.kind==="curve_candidate"&&entity.primitive==="line"){
      appendSegment(positions,entity.start,entity.end,matrix);
      continue;
    }
    if(entity?.kind==="curve_candidate"&&entity.primitive==="circular_arc"){
      const arc=circularArcPolyline(entity);
      if(arc){
        for(let i=1;i<arc.length;i+=1){
          appendSegment(positions,arc[i-1],arc[i],matrix);
        }
      }
      continue;
    }

    // Future/less common curve kinds remain display evidence without being
    // silently approximated as manufacturing geometry. A control polygon is
    // permitted only for the read-only visual reference layer.
    if(
      entity?.kind==="curve_candidate"&&
      entity.primitive==="nurbs_curve"&&
      Array.isArray(entity.control_points)
    ){
      for(let i=1;i<entity.control_points.length;i+=1){
        appendSegment(
          positions,
          entity.control_points[i-1],
          entity.control_points[i],
          matrix
        );
      }
    }
  }
  return Object.freeze({
    kind:"line_segments",
    positions:Object.freeze(positions),
    color_rgb:Object.freeze([126,138,154])
  });
}

function buildDisplayAsset(decoded,name){
  if(!decoded||decoded.status!=="exact_display"){
    return Object.freeze({
      id:String(name),
      status:"unresolved",
      kind:"unresolved",
      meshes:Object.freeze([]),
      line_segments:null
    });
  }

  const entities=decoded.entities;
  const meshes=entities.filter((entity)=>
    entity?.kind==="triangle_mesh"&&
    Array.isArray(entity.vertices)&&
    entity.connectivity?.status==="decoded"&&
    Array.isArray(entity.connectivity?.faces)
  );

  if(meshes.length){
    return Object.freeze({
      id:String(name),
      status:"exact",
      kind:"mesh",
      meshes:Object.freeze(meshes.map((mesh)=>Object.freeze({
        vertices:mesh.vertices,
        faces:mesh.connectivity.faces,
        matrix:Object.freeze(inheritedMatrix(entities,mesh)),
        color_rgb:inheritedColor(entities,mesh),
        source_offset:
          mesh.absolute_source_offset??mesh.source_offset??null
      }))),
      line_segments:null
    });
  }

  const lineAsset=buildLineAsset(entities);
  return Object.freeze({
    id:String(name),
    status:lineAsset.positions.length?"exact":"empty",
    kind:lineAsset.positions.length?"line_segments":"empty",
    meshes:Object.freeze([]),
    line_segments:lineAsset.positions.length?lineAsset:null
  });
}

function exactIncludeEntities(decoded){
  return decoded.entities.filter((entity)=>
    entity?.kind==="segment"&&
    entity.action==="include"&&
    typeof entity.name==="string"&&
    entity.name.startsWith("?Include Library/")
  );
}

function freezeTreeNode(node){
  return Object.freeze({
    ...node,
    children:Object.freeze(node.children.map(freezeTreeNode)),
    geometry_instances:Object.freeze(
      (node.geometry_instances??[]).map((item)=>Object.freeze({
        ...item,
        placement_matrix:Object.freeze([...item.placement_matrix])
      }))
    )
  });
}

function safeSceneId(sourceFile){
  return "dwfx-reference:"+String(sourceFile??"imported.dwfx");
}


function emptyBounds(){
  return {
    min:[Infinity,Infinity,Infinity],
    max:[-Infinity,-Infinity,-Infinity],
    point_count:0
  };
}

function expandBounds(bounds,point){
  const p=v3(point);
  if(!p)return;
  for(let axis=0;axis<3;axis+=1){
    bounds.min[axis]=Math.min(bounds.min[axis],p[axis]);
    bounds.max[axis]=Math.max(bounds.max[axis],p[axis]);
  }
  bounds.point_count+=1;
}

function transformBoundsPoint(bounds,point,matrix){
  const transformed=transformPoint(point,matrix);
  if(transformed)expandBounds(bounds,transformed);
}

export function computeReferenceSceneBounds({
  tree,
  assets,
  scale_mm_per_source_unit=1
}){
  if(!Array.isArray(tree))throw new TypeError("reference tree must be an array");
  if(!Array.isArray(assets))throw new TypeError("reference assets must be an array");
  const scale=Number(scale_mm_per_source_unit);
  if(!Number.isFinite(scale)||scale<=0){
    throw new RangeError("scale_mm_per_source_unit must be positive");
  }

  const byId=new Map(assets.map((asset)=>[String(asset?.id??""),asset]));
  const bounds=emptyBounds();

  const visitAsset=(assetId,parentMatrix,stack=new Set())=>{
    const key=String(assetId??"");
    if(!key||stack.has(key))return;
    const asset=byId.get(key);
    if(!asset||asset.status!=="exact")return;
    const nextStack=new Set(stack);
    nextStack.add(key);

    for(const mesh of asset.meshes??[]){
      const meshMatrix=multiply4(parentMatrix,matrix16(mesh?.matrix));
      for(const vertex of mesh?.vertices??[]){
        transformBoundsPoint(bounds,vertex,meshMatrix);
      }
    }

    const positions=asset.line_segments?.positions??[];
    for(let index=0;index+2<positions.length;index+=3){
      transformBoundsPoint(
        bounds,
        [positions[index],positions[index+1],positions[index+2]],
        parentMatrix
      );
    }

    for(const nested of asset.nested_instances??[]){
      if(nested?.status!=="exact")continue;
      const nestedMatrix=multiply4(
        parentMatrix,
        matrix16(nested?.placement_matrix)
      );
      visitAsset(nested.asset_id,nestedMatrix,nextStack);
    }
  };

  const visitNode=(node)=>{
    for(const instance of node?.geometry_instances??[]){
      if(instance?.status!=="exact")continue;
      visitAsset(
        instance.asset_id,
        matrix16(instance.placement_matrix)
      );
    }
    for(const child of node?.children??[])visitNode(child);
  };
  for(const root of tree)visitNode(root);

  if(bounds.point_count===0){
    return Object.freeze({
      status:"empty",
      point_count:0,
      source_units:null,
      mm:null
    });
  }

  const min=bounds.min;
  const max=bounds.max;
  const size=max.map((value,index)=>value-min[index]);
  const scaled=(value)=>Number((value*scale).toFixed(6));

  return Object.freeze({
    status:"exact",
    point_count:bounds.point_count,
    source_units:Object.freeze({
      min:Object.freeze([...min]),
      max:Object.freeze([...max]),
      size:Object.freeze([...size])
    }),
    mm:Object.freeze({
      min:Object.freeze(min.map(scaled)),
      max:Object.freeze(max.map(scaled)),
      size:Object.freeze(size.map(scaled))
    })
  });
}

function referenceComponentCoreLabel(label){
  return String(label??"")
    .replace(/:\d+\s*$/,"")
    .replace(/^\s*\d{5,}(?:\/[A-Za-z0-9._-]+)?\s*(?:[-,]\s*)?/,"")
    .trim();
}

export function classifyReferenceAnnotationLabel(label){
  const text=String(label??"").trim().toLocaleLowerCase();
  if(
    /^(?:annotation|annotations|annotatie|annotaties|anmerkung|anmerkungen)$/.test(text)
  )return "annotation";
  if(/^(?:аннотация|аннотации|примечание|примечания)$/.test(text))return "annotation";
  return null;
}

function countObjectTree(node){
  if(!node||typeof node!=="object")return Object.freeze({objects:0,leaves:0});
  const children=Array.isArray(node.children)?node.children:[];
  if(children.length===0)return Object.freeze({objects:1,leaves:1});
  let objects=1;
  let leaves=0;
  for(const child of children){
    const count=countObjectTree(child);
    objects+=count.objects;
    leaves+=count.leaves;
  }
  return Object.freeze({objects,leaves});
}

function subtreeHasRecognizedObject(node,recognizedByObject){
  if(!node||typeof node!=="object")return false;
  if(recognizedByObject.has(String(node.id)))return true;
  return (node.children??[]).some((child)=>
    subtreeHasRecognizedObject(child,recognizedByObject)
  );
}

export function classifyReferenceCableGlandBlackLabel(label){
  const core=referenceComponentCoreLabel(label);
  const text=core.toLocaleLowerCase();

  const cableGlandBlack=
    /\bcable\s+gland\s+black\b/.test(text)||
    /\bzwarte\s+kabelwartel\b/.test(text)||
    /\bschwarze\s+kabelverschraubung\b/.test(text)||
    /(?:^|[^а-яё])черн(?:ый|ая|ое|ые|ого|ому|ым|ом)\s+кабельн(?:ый|ая|ое|ые)\s+(?:ввод|сальник)(?:[^а-яё]|$)/i.test(text);

  return cableGlandBlack?"cable_gland_black":null;
}

export function classifyReferenceHoseClampLabel(label){
  const core=referenceComponentCoreLabel(label);
  const text=core.toLocaleLowerCase();

  const hoseClamp=
    /\bhose\s*[- ]?\s*clamps?\b/.test(text)||
    /\bhose\s*clips?\b/.test(text)||
    /\bslangklem(?:men)?\b/.test(text)||
    /\bschlauchschelle(?:n)?\b/.test(text)||
    /(?:^|[^а-яё])шлангов(?:ый|ые|ого|ому|ым|ом)\s+хомут(?:ы|а|ов|у|ом|е)?(?:[^а-яё]|$)/i.test(text)||
    /(?:^|[^а-яё])хомут(?:ы|а|ов|у|ом|е)?\s+(?:для\s+)?шланг(?:а|ов|у|ом|е)?(?:[^а-яё]|$)/i.test(text);

  return hoseClamp?"hose_clamp":null;
}

export function classifyReferenceFastenerLabel(label){
  const core=referenceComponentCoreLabel(label);
  const text=core.toLocaleLowerCase();

  const washer=
    /\bwashers?\b/.test(text)||
    /\bunterlegscheiben?\b/.test(text)||
    /\bsluitringen?\b/.test(text)||
    /(?:^|[^а-яё])шайб(?:а|ы|у|е|ой|ою)?(?:[^а-яё]|$)/i.test(text);
  if(washer)return "washer";

  const screw=
    /\bscrews?\b/.test(text)||
    /\bschrauben?\b/.test(text)||
    /\bschroeven?\b/.test(text)||
    /(?:^|[^а-яё])винт(?:ы|а|ов|у|ом|е)?(?:[^а-яё]|$)/i.test(text);
  if(screw)return "screw";

  const nut=
    /\bnuts?\b/.test(text)||
    /\bmuttern?\b/.test(text)||
    /\bmoeren?\b/.test(text)||
    /(?:^|[^а-яё])гайк(?:а|и|у|е|ой|ою)?(?:[^а-яё]|$)/i.test(text);
  if(nut){
    const embeddedAccessory=
      /\bwith\b[^,;]{0,80}\b(?:contra\s+)?nut\b/.test(text)||
      /\bmet\b[^,;]{0,80}\bmoer\b/.test(text)||
      /\bmit\b[^,;]{0,80}\bmutter\b/.test(text);
    if(!embeddedAccessory)return "nut";
  }

  const bolt=
    /\bbolts?\b/.test(text)||
    /\bbouten?\b/.test(text)||
    /(?:^|[^а-яё])болт(?:ы|а|ов|у|ом|е)?(?:[^а-яё]|$)/i.test(text);
  if(bolt){
    const accessoryForBolt=
      /^(?:sealing\s+ring|gasket|o[- ]?ring)\b/.test(text);
    if(!accessoryForBolt)return "bolt";
  }

  return null;
}

/**
 * Build a read-only reference scene from every instantiated leaf Object in a
 * DWFx Content tree. It never promotes this geometry to canonical/editable
 * geometry and never affects production release.
 */
export function buildDwfxReferenceScene({
  content_xml,
  link_index,
  opcode_stream,
  hsf_version,
  descriptor,
  source_file,
  recognized_graphics_links=[]
}){
  if(!link_index||!Array.isArray(link_index.links)){
    throw new TypeError("DWFx graphics link index is required");
  }
  if(!(opcode_stream instanceof Uint8Array)){
    throw new TypeError("HSF opcode_stream Uint8Array is required");
  }

  const roots=parseDwfxObjectTree(content_xml);
  const linksByObject=new Map(
    link_index.links.map((link)=>[String(link.object_id),link])
  );
  const recognizedByObject=new Map();
  for(const item of recognized_graphics_links??[]){
    const objectId=item?.link?.object_id;
    if(objectId){
      recognizedByObject.set(String(objectId),String(item.part_number??""));
    }
  }

  const scale=Number(descriptor?.w3d?.scale_mm_per_source_unit);
  if(!Number.isFinite(scale)||scale<=0){
    throw new RangeError("Exact positive DWFx W3D scale is required for reference geometry");
  }

  const segmentIndex=buildDisplayHsfSegmentIndex(opcode_stream);
  const assetCache=new Map();
  const assetManifest=new Map();
  const diagnostics=[];
  let objectCount=0;
  let leafCount=0;
  let placedCount=0;
  let drawableLeafCount=0;
  let metadataOnlyCount=0;
  let unresolvedCount=0;
  let filteredFastenerCount=0;
  let filteredHoseClampCount=0;
  let filteredCableGlandBlackCount=0;
  let filteredAnnotationLeafCount=0;
  let filteredAnnotationObjectCount=0;
  const filteredFastenerByKind={
    bolt:0,
    nut:0,
    washer:0,
    screw:0
  };

  const resolvingAssets=new Set();
  const assetFor=(name)=>{
    if(assetCache.has(name))return assetCache.get(name);
    if(resolvingAssets.has(name)){
      diagnostics.push(Object.freeze({
        stage:"asset_include_cycle",
        asset_id:String(name),
        status:"blocked_cycle"
      }));
      return Object.freeze({
        id:String(name),
        status:"unresolved",
        kind:"cycle",
        meshes:Object.freeze([]),
        line_segments:null,
        nested_instances:Object.freeze([])
      });
    }

    resolvingAssets.add(name);
    const decoded=decodeIndexedDisplaySegment(
      opcode_stream,
      segmentIndex,
      name,
      {hsfVersion:hsf_version,attachSegmentPath:true,maxOpcodes:1_000_000}
    );
    const direct=buildDisplayAsset(decoded,name);
    const nestedInstances=[];

    if(decoded?.status==="exact_display"){
      for(const include of exactIncludeEntities(decoded)){
        const child=assetFor(include.name);
        nestedInstances.push(Object.freeze({
          asset_id:include.name,
          placement_matrix:Object.freeze(inheritedMatrix(decoded.entities,include)),
          status:child.status
        }));
      }
    }

    const exactNested=nestedInstances.filter((item)=>item.status==="exact").length;
    const hasDirectGeometry=direct.status==="exact";
    const status=
      hasDirectGeometry&&exactNested===nestedInstances.length
        ?"exact"
        : !hasDirectGeometry&&nestedInstances.length>0&&exactNested===nestedInstances.length
          ?"exact"
          : hasDirectGeometry||exactNested>0
            ?"partial"
            : direct.status;

    const asset=Object.freeze({
      ...direct,
      status,
      kind:
        direct.status==="exact"
          ? direct.kind
          : nestedInstances.length
            ? "group"
            : direct.kind,
      nested_instances:Object.freeze(nestedInstances)
    });
    resolvingAssets.delete(name);
    assetCache.set(name,asset);
    const entityKinds=Object.freeze(
      [...new Set((decoded?.entities??[]).map((entity)=>
        entity?.kind==="curve_candidate"
          ? "curve_candidate:"+String(entity.primitive??"unknown")
          : String(entity?.kind??"unknown")
      ))]
    );
    const unresolvedMeshCount=(decoded?.entities??[]).filter((entity)=>
      entity?.kind==="triangle_mesh"&&entity.connectivity?.status!=="decoded"
    ).length;
    assetManifest.set(name,Object.freeze({
      id:name,
      status:asset.status,
      kind:asset.kind,
      mesh_count:asset.meshes.length,
      unresolved_mesh_count:unresolvedMeshCount,
      nested_instance_count:nestedInstances.length,
      entity_kinds:entityKinds,
      line_segment_count:
        asset.line_segments
          ? Math.floor(asset.line_segments.positions.length/6)
          : 0
    }));
    if(asset.status==="unresolved"){
      diagnostics.push(Object.freeze({
        stage:"asset_decode",
        asset_id:name,
        status:decoded.status,
        candidate_count:decoded.candidate_count,
        diagnostics:decoded.diagnostics
      }));
    }
    return asset;
  };

  const enrich=(source,ancestorLabels=[])=>{
    objectCount+=1;
    const sourceIsLeaf=source.children.length===0;
    if(sourceIsLeaf)leafCount+=1;

    const editablePart=recognizedByObject.get(String(source.id))??null;
    const labelPath=[...ancestorLabels,String(source.label??"")];
    const annotationPath=labelPath.some(
      (label)=>classifyReferenceAnnotationLabel(label)==="annotation"
    );

    if(annotationPath&&!editablePart){
      const canDropWholeSubtree=
        sourceIsLeaf||
        !subtreeHasRecognizedObject(source,recognizedByObject);
      if(canDropWholeSubtree){
        const count=countObjectTree(source);
        if(!sourceIsLeaf){
          objectCount+=Math.max(0,count.objects-1);
          leafCount+=count.leaves;
        }
        filteredAnnotationLeafCount+=count.leaves;
        filteredAnnotationObjectCount+=count.objects;
        diagnostics.push(Object.freeze({
          stage:"reference_annotation_filter",
          object_id:String(source.id),
          label:String(source.label??""),
          filtered_object_count:count.objects,
          filtered_leaf_count:count.leaves,
          status:"excluded"
        }));
        return null;
      }
    }

    if(sourceIsLeaf&&!editablePart){
      const cableGlandBlackKind=classifyReferenceCableGlandBlackLabel(source.label);
      if(cableGlandBlackKind){
        filteredCableGlandBlackCount+=1;
        diagnostics.push(Object.freeze({
          stage:"reference_cable_gland_black_filter",
          object_id:String(source.id),
          label:String(source.label??""),
          component_kind:cableGlandBlackKind,
          status:"excluded"
        }));
        return null;
      }

      const hoseClampKind=classifyReferenceHoseClampLabel(source.label);
      if(hoseClampKind){
        filteredHoseClampCount+=1;
        diagnostics.push(Object.freeze({
          stage:"reference_hose_clamp_filter",
          object_id:String(source.id),
          label:String(source.label??""),
          component_kind:hoseClampKind,
          status:"excluded"
        }));
        return null;
      }

      const fastenerKind=classifyReferenceFastenerLabel(source.label);
      if(fastenerKind){
        filteredFastenerCount+=1;
        filteredFastenerByKind[fastenerKind]+=1;
        diagnostics.push(Object.freeze({
          stage:"reference_fastener_filter",
          object_id:String(source.id),
          label:String(source.label??""),
          fastener_kind:fastenerKind,
          status:"excluded"
        }));
        return null;
      }
    }

    const children=source.children
      .map((child)=>
        enrich(child,[...ancestorLabels,String(source.label??"")])
      )
      .filter(Boolean);
    if(!sourceIsLeaf&&children.length===0)return null;

    const isLeaf=sourceIsLeaf;
    const link=linksByObject.get(String(source.id))??null;
    const geometryInstances=[];
    let geometryStatus=isLeaf?"unresolved":"group";
    let anchorId=null;
    let anchorKind=null;

    if(isLeaf&&link?.status==="exact"){
      const variation=
        link.geometric_variation==null
          ? null
          : Number(link.geometric_variation);
      const graphicsNode=Number(link.graphics_node);
      const hasVariation=Number.isInteger(variation)&&variation>=0;
      anchorId=hasVariation
        ? variation
        : Number.isInteger(graphicsNode)&&graphicsNode>=0
          ? graphicsNode+1
          : null;
      anchorKind=hasVariation
        ?"geometric_variation"
        :"graphics_node_successor_no_variation";

      if(anchorId!=null){
        const anchor=decodeIndexedDisplaySegment(
          opcode_stream,
          segmentIndex,
          String(anchorId),
          {hsfVersion:hsf_version,attachSegmentPath:true,maxOpcodes:1_000_000}
        );
        if(anchor.status==="exact_display"){
          const includes=exactIncludeEntities(anchor);
          for(const include of includes){
            const asset=assetFor(include.name);
            geometryInstances.push(Object.freeze({
              asset_id:include.name,
              placement_matrix:Object.freeze(inheritedMatrix(anchor.entities,include)),
              status:asset.status
            }));
          }
          geometryStatus=
            geometryInstances.length&&
            geometryInstances.every((item)=>item.status==="exact")
              ?"exact"
              : geometryInstances.length&&
                geometryInstances.every((item)=>item.status==="empty")
                ?"metadata_only"
                : geometryInstances.length
                  ?"partial"
                  :"empty";
          if(geometryInstances.length)placedCount+=1;
          if(geometryStatus==="exact")drawableLeafCount+=1;
          if(geometryStatus==="metadata_only")metadataOnlyCount+=1;
        }else{
          diagnostics.push(Object.freeze({
            stage:"instance_anchor",
            object_id:String(source.id),
            label:String(source.label??""),
            anchor_id:String(anchorId),
            status:anchor.status,
            diagnostics:anchor.diagnostics
          }));
        }
      }
    }

    if(isLeaf&&geometryStatus==="unresolved")unresolvedCount+=1;
    const annotation=annotationPath;

    return {
      id:String(source.id),
      label:String(source.label??source.id),
      entity_ref:source.entity_ref??null,
      readonly:true,
      role:isLeaf?"reference_object":"group",
      source_graphics_node:link?.graphics_node??null,
      source_geometric_variation:link?.geometric_variation??null,
      geometry_anchor_id:anchorId,
      geometry_anchor_kind:anchorKind,
      geometry_status:geometryStatus,
      editable_part_number:editablePart,
      annotation,
      visible:true,
      geometry_instances:geometryInstances,
      children
    };
  };

  const tree=roots.map((root)=>enrich(root,[])).filter(Boolean);
  const assets=Object.freeze([...assetCache.values()]);
  const sceneBounds=computeReferenceSceneBounds({
    tree,
    assets,
    scale_mm_per_source_unit:scale
  });
  const manifest=Object.freeze([...assetManifest.values()]);
  const exactAssets=manifest.filter((asset)=>asset.status==="exact");

  const sceneId=safeSceneId(source_file);
  const metadata=Object.freeze({
    id:sceneId,
    runtime_scene_id:sceneId,
    name:String(source_file??"Imported DWFx"),
    source_file:String(source_file??""),
    source_format:"DWFx",
    readonly:true,
    visible:true,
    production_ready:false,
    canonical_ready:false,
    scale_mm_per_source_unit:scale,
    bounds_mm:sceneBounds.status==="exact"
      ? Object.freeze({
          min:Object.freeze([...sceneBounds.mm.min]),
          max:Object.freeze([...sceneBounds.mm.max]),
          size:Object.freeze([...sceneBounds.mm.size])
        })
      : null,
    bounds_source_units:sceneBounds.source_units,
    tree:Object.freeze(tree.map(freezeTreeNode)),
    asset_manifest:manifest,
    stats:Object.freeze({
      object_count:objectCount,
      leaf_count:leafCount,
      retained_leaf_count:
        leafCount-filteredFastenerCount-filteredHoseClampCount-filteredCableGlandBlackCount-filteredAnnotationLeafCount,
      filtered_fastener_count:filteredFastenerCount,
      filtered_fastener_by_kind:Object.freeze({...filteredFastenerByKind}),
      filtered_hose_clamp_count:filteredHoseClampCount,
      filtered_cable_gland_black_count:filteredCableGlandBlackCount,
      filtered_annotation_leaf_count:filteredAnnotationLeafCount,
      filtered_annotation_object_count:filteredAnnotationObjectCount,
      placed_leaf_count:placedCount,
      drawable_leaf_count:drawableLeafCount,
      metadata_only_leaf_count:metadataOnlyCount,
      unresolved_leaf_count:unresolvedCount,
      asset_count:manifest.length,
      exact_asset_count:exactAssets.length,
      mesh_asset_count:exactAssets.filter((asset)=>asset.kind==="mesh").length,
      line_asset_count:exactAssets.filter((asset)=>asset.kind==="line_segments").length
    }),
    blocker:
      "Reference geometry is display-only evidence and is excluded from editable tube geometry and production calculations."
  });

  const runtime=Object.freeze({
    scene_id:sceneId,
    source_file:String(source_file??""),
    readonly:true,
    scale_mm_per_source_unit:scale,
    bounds_mm:sceneBounds.status==="exact"
      ? Object.freeze({
          min:Object.freeze([...sceneBounds.mm.min]),
          max:Object.freeze([...sceneBounds.mm.max]),
          size:Object.freeze([...sceneBounds.mm.size])
        })
      : null,
    assets
  });

  return Object.freeze({
    status:unresolvedCount===0?"exact_reference_scene":"partial_reference_scene",
    metadata,
    runtime,
    diagnostics:Object.freeze(diagnostics),
    production_ready:false,
    canonical_ready:false
  });
}
