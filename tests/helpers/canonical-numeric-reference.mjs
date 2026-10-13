// Independently specified 20 mm straight, 10 mm CLR / 90 degree bend,
// 30 mm straight. These are nominal dimensions, with no machine corrections.
const value=n=>({value:n,confidence:1,reason:null,source:["numeric-reference"],method:"reference",truth_category:"source"});
export function canonicalNumericReference(){
  return {schema_version:"1.0.0",tube_id:"numeric-reference",length_unit:"mm",angle_unit:"deg",
    coordinate_frame:{id:"source",handedness:"right"},source_refs:["numeric-reference"],primitives:[
      {type:"LINE",element_id:"l1",start:value([0,0,0]),end:value([20,0,0]),direction:value([1,0,0]),length:value(20)},
      {type:"BEND",element_id:"b1",tangent_in:value([20,0,0]),tangent_out:value([30,10,0]),
        center:value([20,10,0]),bend_plane_normal:value([0,0,1]),clr:value(10),angle:value(90),plane_rotation_from_previous:value(null)},
      {type:"LINE",element_id:"l2",start:value([30,10,0]),end:value([30,40,0]),direction:value([0,1,0]),length:value(30)}]};
}
export function recognitionNumericReference(){
  return {tube_id:"numeric-reference",promotion:{status:"canonical_candidate",canonical_ready:true,polygon_handedness:"right"},
    geometry:{status:"geometry_candidate",machine_compensation_applied:false,segmentation:{primitives:[{
      source_start_index:0,source_end_index:1,primitive:{type:"LINE",start:[0,0,0],end:[20,0,0],direction:[1,0,0],length_mm:20}}]}}};
}
