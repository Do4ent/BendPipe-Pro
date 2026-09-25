function finitePoint(point, label) {
  if (!Array.isArray(point) || point.length !== 3) {
    throw new TypeError(`${label} must be a 3D point`);
  }
  const out = point.map(Number);
  if (!out.every(Number.isFinite)) {
    throw new RangeError(`${label} contains non-finite coordinates`);
  }
  return out;
}

function distance(a, b) {
  return Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
}

function meanPoint(points) {
  const sum=[0,0,0];
  for(const p of points){
    sum[0]+=p[0]; sum[1]+=p[1]; sum[2]+=p[2];
  }
  return sum.map((value)=>value/points.length);
}

function mean(values) {
  return values.reduce((sum,value)=>sum+value,0)/values.length;
}

function stddev(values, average=mean(values)) {
  return Math.sqrt(
    values.reduce((sum,value)=>sum+(value-average)**2,0)/values.length
  );
}

function edgeKey(a,b) {
  return a<b ? `${a}:${b}` : `${b}:${a}`;
}

function normalizeMesh(vertices, faces) {
  if (!Array.isArray(vertices) || vertices.length < 3) {
    throw new RangeError("mesh vertices are required");
  }
  if (!Array.isArray(faces) || faces.length < 1) {
    throw new RangeError("mesh triangle faces are required");
  }
  const points=vertices.map((point,index)=>finitePoint(point,`vertex ${index}`));
  const triangles=faces.map((face,index)=>{
    if (!Array.isArray(face) || face.length !== 3) {
      throw new TypeError(`face ${index} must contain three indices`);
    }
    const tri=face.map(Number);
    if (!tri.every((value)=>Number.isInteger(value) && value>=0 && value<points.length)) {
      throw new RangeError(`face ${index} contains an invalid vertex index`);
    }
    if (new Set(tri).size !== 3) {
      throw new RangeError(`face ${index} is degenerate`);
    }
    return tri;
  });
  return {points,triangles};
}

function meshComponents(vertexCount, faces) {
  const adjacency=Array.from({length:vertexCount},()=>new Set());
  for(const [a,b,c] of faces){
    for(const [u,v] of [[a,b],[b,c],[c,a]]){
      adjacency[u].add(v);
      adjacency[v].add(u);
    }
  }

  const seen=new Set();
  const components=[];
  for(let seed=0;seed<vertexCount;seed+=1){
    if(seen.has(seed) || adjacency[seed].size===0) continue;
    const stack=[seed];
    const vertices=[];
    seen.add(seed);
    while(stack.length){
      const current=stack.pop();
      vertices.push(current);
      for(const next of adjacency[current]){
        if(!seen.has(next)){
          seen.add(next);
          stack.push(next);
        }
      }
    }
    const set=new Set(vertices);
    const componentFaces=faces.filter((face)=>set.has(face[0]));
    const edgeCounts=new Map();
    for(const [a,b,c] of componentFaces){
      for(const [u,v] of [[a,b],[b,c],[c,a]]){
        const key=edgeKey(u,v);
        edgeCounts.set(key,(edgeCounts.get(key)??0)+1);
      }
    }
    components.push({
      vertices:vertices.sort((a,b)=>a-b),
      faces:componentFaces,
      boundary_edge_count:[...edgeCounts.values()].filter((count)=>count===1).length
    });
  }
  return components;
}

function consecutive(indices) {
  for(let i=1;i<indices.length;i+=1){
    if(indices[i]!==indices[i-1]+1) return false;
  }
  return true;
}

function sideSurfaceCandidate(component, points) {
  const boundary=component.boundary_edge_count;
  if (boundary < 6 || boundary % 2 !== 0) return null;
  const circumferenceCount=boundary/2;
  if (component.vertices.length % circumferenceCount !== 0) return null;
  const axialCount=component.vertices.length/circumferenceCount;
  if (axialCount < 2) return null;
  if (component.faces.length !== 2*circumferenceCount*(axialCount-1)) return null;
  if (!consecutive(component.vertices)) return null;

  const rings=[];
  const centers=[];
  const ringRadii=[];
  for(let ringIndex=0;ringIndex<axialCount;ringIndex+=1){
    const ids=component.vertices.slice(
      ringIndex*circumferenceCount,
      (ringIndex+1)*circumferenceCount
    );
    const ring=ids.map((id)=>points[id]);
    const center=meanPoint(ring);
    const radii=ring.map((point)=>distance(point,center));
    rings.push(ids);
    centers.push(center);
    ringRadii.push(radii);
  }
  const allRadii=ringRadii.flat();
  const radiusMean=mean(allRadii);
  const radiusStddev=stddev(allRadii,radiusMean);

  return {
    vertex_count:component.vertices.length,
    face_count:component.faces.length,
    boundary_edge_count:boundary,
    circumference_count:circumferenceCount,
    axial_count:axialCount,
    vertex_index_start:component.vertices[0],
    vertex_index_end:component.vertices.at(-1),
    centers,
    radius_source_units:radiusMean,
    radius_stddev_source_units:radiusStddev
  };
}

function alignCenterlines(a,b) {
  if(a.length!==b.length) {
    return {status:"mismatch",centers:null,max_error:Infinity,reversed:false};
  }
  const maxError=(left,right)=>Math.max(
    ...left.map((point,index)=>distance(point,right[index]))
  );
  const same=maxError(a,b);
  const reversedB=[...b].reverse();
  const reversed=maxError(a,reversedB);
  const useReversed=reversed<same;
  const selected=useReversed?reversedB:b;
  return {
    status:"aligned",
    centers:a.map((point,index)=>meanPoint([point,selected[index]])),
    max_error:Math.min(same,reversed),
    reversed:useReversed
  };
}

function positive(value,label) {
  const number=Number(value);
  if(!Number.isFinite(number) || number<=0) {
    throw new RangeError(`${label} must be positive`);
  }
  return number;
}

function polylineLength(points) {
  let total=0;
  for(let i=1;i<points.length;i+=1) total+=distance(points[i-1],points[i]);
  return total;
}

/**
 * Derive centerline samples from an Inventor-style hollow tube shell.
 *
 * Acceptance is deliberately strict:
 * - exactly two side-surface grid components must be present;
 * - each grid must be ring-major and topologically exact;
 * - both side surfaces must produce the same axial centers;
 * - outer/inner radii must agree with exact metadata dimensions.
 *
 * The result remains derived evidence. Primitive LINE/BEND recognition is a
 * separate stage and production readiness is always false here.
 */
export function deriveTubeMeshCenterline({
  vertices,
  faces,
  outer_diameter_mm,
  wall_thickness_mm,
  scale_mm_per_source_unit = null,
  center_match_tolerance_mm = 0.02,
  radius_tolerance_mm = 0.02,
  max_ring_radius_stddev_mm = 0.01
}) {
  const {points,triangles}=normalizeMesh(vertices,faces);
  const components=meshComponents(points.length,triangles);
  const sideCandidates=components
    .map((component)=>sideSurfaceCandidate(component,points))
    .filter(Boolean);

  const outerDiameter=positive(outer_diameter_mm,"outer_diameter_mm");
  const wall=positive(wall_thickness_mm,"wall_thickness_mm");
  if(wall*2>=outerDiameter) {
    throw new RangeError("wall_thickness_mm is incompatible with outer_diameter_mm");
  }

  const explicitScale=scale_mm_per_source_unit==null
    ? null
    : positive(scale_mm_per_source_unit,"scale_mm_per_source_unit");

  const pairEvaluations=[];
  for(let i=0;i<sideCandidates.length;i+=1){
    for(let j=i+1;j<sideCandidates.length;j+=1){
      const left=sideCandidates[i];
      const right=sideCandidates[j];
      const pairBlockers=[];

      if(left.axial_count!==right.axial_count){
        pairBlockers.push("axial ring counts differ");
      }

      const aligned=left.axial_count===right.axial_count
        ? alignCenterlines(left.centers,right.centers)
        : {status:"mismatch",centers:null,max_error:Infinity,reversed:false};

      const sorted=[left,right].sort(
        (a,b)=>a.radius_source_units-b.radius_source_units
      );
      const inner=sorted[0];
      const outer=sorted[1];

      const scale=explicitScale??(
        outer.radius_source_units>0
          ? outerDiameter/(2*outer.radius_source_units)
          : NaN
      );
      const scaleMethod=explicitScale==null
        ? "derived_from_outer_diameter"
        : "explicit";

      const observedOuterRadiusMm=outer.radius_source_units*scale;
      const observedInnerRadiusMm=inner.radius_source_units*scale;
      const expectedOuterRadiusMm=outerDiameter/2;
      const expectedInnerRadiusMm=expectedOuterRadiusMm-wall;
      const outerError=Math.abs(observedOuterRadiusMm-expectedOuterRadiusMm);
      const innerError=Math.abs(observedInnerRadiusMm-expectedInnerRadiusMm);
      const centerMismatchMm=aligned.max_error*scale;
      const maxRadiusStddevMm=Math.max(
        inner.radius_stddev_source_units,
        outer.radius_stddev_source_units
      )*scale;

      if(aligned.status!=="aligned"){
        pairBlockers.push("centerline samples cannot be aligned");
      }
      if(!Number.isFinite(scale) || scale<=0){
        pairBlockers.push("unit scale cannot be resolved");
      }
      if(outerError>radius_tolerance_mm) {
        pairBlockers.push(`outer radius mismatch ${outerError} mm exceeds tolerance`);
      }
      if(innerError>radius_tolerance_mm) {
        pairBlockers.push(`inner radius mismatch ${innerError} mm exceeds tolerance`);
      }
      if(centerMismatchMm>center_match_tolerance_mm) {
        pairBlockers.push(`side-surface center mismatch ${centerMismatchMm} mm exceeds tolerance`);
      }
      if(maxRadiusStddevMm>max_ring_radius_stddev_mm) {
        pairBlockers.push(`ring radius scatter ${maxRadiusStddevMm} mm exceeds tolerance`);
      }

      pairEvaluations.push(Object.freeze({
        candidate_indices:Object.freeze([i,j]),
        accepted:pairBlockers.length===0,
        blockers:Object.freeze(pairBlockers),
        aligned,
        inner,
        outer,
        scale,
        scaleMethod,
        observedOuterRadiusMm,
        observedInnerRadiusMm,
        expectedOuterRadiusMm,
        expectedInnerRadiusMm,
        centerMismatchMm,
        maxRadiusStddevMm
      }));
    }
  }

  const acceptedPairs=pairEvaluations.filter((pair)=>pair.accepted);
  if(acceptedPairs.length!==1){
    return Object.freeze({
      status:"unresolved",
      blocker:acceptedPairs.length===0
        ? `no unique inner/outer side-surface pair matches tube metadata among ${sideCandidates.length} ring-grid candidates`
        : `multiple inner/outer side-surface pairs match tube metadata (${acceptedPairs.length})`,
      diagnostics:Object.freeze({
        ring_grid_candidate_count:sideCandidates.length,
        evaluated_pair_count:pairEvaluations.length,
        accepted_pair_count:acceptedPairs.length,
        pair_failures:Object.freeze(pairEvaluations
          .filter((pair)=>!pair.accepted)
          .map((pair)=>Object.freeze({
            candidate_indices:pair.candidate_indices,
            blockers:pair.blockers
          })))
      }),
      production_ready:false,
      canonical_ready:false
    });
  }

  const selected=acceptedPairs[0];
  const {
    aligned,
    inner,
    outer,
    scale,
    scaleMethod,
    observedOuterRadiusMm,
    observedInnerRadiusMm,
    centerMismatchMm,
    maxRadiusStddevMm
  }=selected;

  const centerlineMm=Object.freeze(
    aligned.centers.map((point)=>Object.freeze(point.map((value)=>value*scale)))
  );

  return Object.freeze({
    status:"centerline_candidate",
    production_ready:false,
    canonical_ready:false,
    source_truth_category:"derived",
    scale_mm_per_source_unit:scale,
    scale_method:scaleMethod,
    side_surfaces:Object.freeze([inner,outer].map((surface)=>Object.freeze({
      vertex_count:surface.vertex_count,
      face_count:surface.face_count,
      circumference_count:surface.circumference_count,
      axial_count:surface.axial_count,
      vertex_index_start:surface.vertex_index_start,
      vertex_index_end:surface.vertex_index_end,
      radius_source_units:surface.radius_source_units,
      radius_stddev_source_units:surface.radius_stddev_source_units
    }))),
    observed_outer_radius_mm:observedOuterRadiusMm,
    observed_inner_radius_mm:observedInnerRadiusMm,
    center_mismatch_mm:centerMismatchMm,
    max_ring_radius_stddev_mm:maxRadiusStddevMm,
    centerline_points_mm:centerlineMm,
    centerline_sample_count:centerlineMm.length,
    chordal_polyline_length_mm:polylineLength(centerlineMm)
  });
}
