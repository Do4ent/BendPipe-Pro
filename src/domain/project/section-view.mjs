const clone=v=>v==null?v:structuredClone(v);
function finite(value,name){
  const n=Number(value);if(!Number.isFinite(n))throw new TypeError(name+" must be finite");return n;
}
function point(value,name){
  const v=value??{};return Object.freeze({x:finite(v.x,name+".x"),y:finite(v.y,name+".y"),z:finite(v.z,name+".z")});
}
function unit(value,name){
  const p=point(value,name),len=Math.hypot(p.x,p.y,p.z);
  if(!(len>1e-12))throw new RangeError(name+" must be non-zero");
  return Object.freeze({x:p.x/len,y:p.y/len,z:p.z/len});
}
export const SECTION_MODES=Object.freeze(["off","plane","box"]);
export function normalizeSectionPlane(input={}){
  return Object.freeze({
    point:point(input.point??{x:0,y:0,z:0},"section.plane.point"),
    normal:unit(input.normal??{x:1,y:0,z:0},"section.plane.normal"),
    flipped:input.flipped===true
  });
}
export function normalizeSectionBox(input={}){
  const min=point(input.min??{x:-500,y:-500,z:-500},"section.box.min");
  const max=point(input.max??{x:500,y:500,z:500},"section.box.max");
  if(max.x<min.x||max.y<min.y||max.z<min.z)throw new RangeError("section box max must be >= min");
  return Object.freeze({min,max});
}
export function normalizeSectionView(input={}){
  const mode=String(input.mode??"off").toLowerCase();
  if(!SECTION_MODES.includes(mode))throw new RangeError("section mode must be off, plane or box");
  return Object.freeze({
    mode,
    enabled:mode!=="off"&&input.enabled!==false,
    show_helper:input.show_helper!==false,
    plane:normalizeSectionPlane(input.plane??{}),
    box:normalizeSectionBox(input.box??{})
  });
}
export function ensureSectionViewState(project){
  if(!project||typeof project!=="object")throw new TypeError("project is required");
  project.section_view={...normalizeSectionView(project.section_view??{})};
  return project.section_view;
}
export function setSectionPlane(project,plane,{enabled=true,show_helper=true}={}){
  project.section_view={...normalizeSectionView({mode:"plane",enabled,show_helper,plane,box:project.section_view?.box})};
  return project.section_view;
}
export function setSectionBox(project,box,{enabled=true,show_helper=true}={}){
  project.section_view={...normalizeSectionView({mode:"box",enabled,show_helper,box,plane:project.section_view?.plane})};
  return project.section_view;
}
export function disableSectionView(project){
  const current=ensureSectionViewState(project);
  project.section_view={...normalizeSectionView({...current,mode:"off",enabled:false})};
  return project.section_view;
}
export function sectionViewSnapshot(project){return clone(ensureSectionViewState(project));}
