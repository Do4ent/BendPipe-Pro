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
function circularArcPolyline(entity){
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
  let unresolvedCount=0;

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
    assetManifest.set(name,Object.freeze({
      id:name,
      status:asset.status,
      kind:asset.kind,
      mesh_count:asset.meshes.length,
      nested_instance_count:nestedInstances.length,
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
    const children=source.children.map((child)=>
      enrich(child,[...ancestorLabels,String(source.label??"")])
    );
    const isLeaf=children.length===0;
    if(isLeaf)leafCount+=1;

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
              : geometryInstances.length
                ?"partial"
                :"empty";
          if(geometryInstances.length)placedCount+=1;
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
    const labelPath=[...ancestorLabels,String(source.label??"")];
    const annotation=labelPath.some((label)=>/^annotation$/i.test(label.trim()));

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
      editable_part_number:recognizedByObject.get(String(source.id))??null,
      annotation,
      visible:true,
      geometry_instances:geometryInstances,
      children
    };
  };

  const tree=roots.map((root)=>enrich(root,[]));
  const assets=Object.freeze([...assetCache.values()]);
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
    tree:Object.freeze(tree.map(freezeTreeNode)),
    asset_manifest:manifest,
    stats:Object.freeze({
      object_count:objectCount,
      leaf_count:leafCount,
      placed_leaf_count:placedCount,
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
