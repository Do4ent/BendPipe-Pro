(()=>{
  let installed=false;
  const popupSpecs={
    projectDropdown:{anchor:"projectCombo",minWidth:520},
    tubeDropdown:{anchor:"tubeCombo",minWidth:430},
    projectMenu:{anchor:"projectMenuBtn",minWidth:230},
    tubeMenu:{anchor:"tubeMenuBtn",minWidth:230}
  };

  function injectStyles(){
    if(document.getElementById("tbProjectTubeLayoutFixStyles"))return;
    const style=document.createElement("style");
    style.id="tbProjectTubeLayoutFixStyles";
    style.textContent=`
/*
 * Safe VC207R7 header corrections.
 * IMPORTANT: preserve the native .tb-map-header flex layout. Do not replace it
 * with grid: the approved UI builds its header dynamically as
 * Brand -> Project/Tube -> spacer -> actions -> window controls.
 */
body.tb-project-map .tb-map-header{
  min-width:0!important;
  overflow:visible!important;
  flex-wrap:nowrap!important;
}
body.tb-project-map .tb-brand{order:10!important;}
body.tb-project-map #projectEditor{order:20!important;}
body.tb-project-map .tb-map-head-spacer{order:30!important;}
body.tb-project-map .tb-head-actions{order:40!important;}
body.tb-project-map .tb-window-controls{
  order:50!important;
  position:static!important;
  flex:0 0 auto!important;
  margin-left:4px!important;
  padding-left:7px!important;
  align-self:center!important;
  white-space:nowrap!important;
}
body.tb-project-map .tb-window-control{
  flex:0 0 38px!important;
  width:38px!important;
  min-width:38px!important;
  height:38px!important;
  min-height:38px!important;
}
body.tb-project-map .tb-brand{
  min-width:0;
}
body.tb-project-map #projectEditor{
  box-sizing:border-box!important;
  min-width:0!important;
  max-width:100%!important;
  overflow:visible!important;
  order:0!important;
}
body.tb-project-map #projectEditor .pt-group{
  min-width:0!important;
  max-width:100%!important;
}
body.tb-project-map #projectEditor .pt-combo{
  min-width:0!important;
  max-width:100%!important;
}
body.tb-project-map #projectEditor .pt-label,
body.tb-project-map #projectEditor .tube-field-format{
  min-width:0!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
}

/*
 * VC207R7 narrows #projectEditor from 450 to 410 px at 1121..1550 px,
 * while legacy child groups stayed at 215 + 215 with a 20 px gap.
 * Let only those two groups shrink inside the existing flex container.
 */
@media (min-width:1121px) and (max-width:1550px){
  body.tb-project-map #projectEditor .project-group,
  body.tb-project-map #projectEditor .tube-group{
    flex:1 1 0!important;
    width:auto!important;
    min-width:0!important;
  }
}
@media (min-width:1121px) and (max-width:1240px){
  body.tb-project-map .tb-brand{
    flex:0 0 53px!important;
    min-width:53px!important;
  }
  body.tb-project-map .tb-brand-text{
    display:none!important;
  }
}

/* Dropdowns are viewport overlays and therefore cannot be clipped by the header. */
body.tb-project-map #projectDropdown,
body.tb-project-map #tubeDropdown,
body.tb-project-map #projectMenu,
body.tb-project-map #tubeMenu{
  position:fixed!important;
  inset:auto!important;
  z-index:120500!important;
  box-sizing:border-box!important;
  max-width:calc(100vw - 16px)!important;
  max-height:min(470px,calc(100vh - 20px))!important;
  overflow:auto!important;
  overscroll-behavior:contain!important;
}
body.tb-project-map #tubeDropdown{
  min-width:min(430px,calc(100vw - 16px))!important;
}
body.tb-project-map #projectDropdown{
  min-width:min(520px,calc(100vw - 16px))!important;
}
body.tb-project-map #tubeDropdown .pt-tube-row,
body.tb-project-map #projectDropdown .pt-tube-row{
  box-sizing:border-box!important;
  width:100%!important;
}
@media (max-width:700px){
  body.tb-project-map #tubeDropdown .pt-tube-row,
  body.tb-project-map #projectDropdown .pt-tube-row{
    grid-template-columns:22px minmax(92px,1fr) 10px minmax(76px,auto) 10px minmax(60px,auto) auto!important;
    padding-left:5px!important;
    padding-right:5px!important;
    font-size:11px!important;
  }
  body.tb-project-map #tubeDropdown,
  body.tb-project-map #projectDropdown{
    min-width:0!important;
  }
}
`;
    document.head.appendChild(style);
  }

  function isOpen(el){
    return !!el&&!el.classList.contains("hidden")&&getComputedStyle(el).display!=="none";
  }
  function clamp(value,min,max){
    return Math.min(Math.max(value,min),Math.max(min,max));
  }

  function positionPopup(id){
    const spec=popupSpecs[id];
    const popup=document.getElementById(id);
    const anchor=document.getElementById(spec?.anchor??"");
    if(!spec||!popup||!anchor||!isOpen(popup))return false;

    const rect=anchor.getBoundingClientRect();
    const margin=8;
    const viewportWidth=Math.max(320,window.innerWidth||document.documentElement.clientWidth||320);
    const viewportHeight=Math.max(240,window.innerHeight||document.documentElement.clientHeight||240);
    const maxWidth=Math.max(120,viewportWidth-margin*2);
    const desiredWidth=Math.max(Number(spec.minWidth)||0,rect.width);
    const width=Math.min(desiredWidth,maxWidth);

    popup.style.width=width+"px";
    popup.style.maxWidth=maxWidth+"px";
    popup.style.left="0px";
    popup.style.top="0px";

    const measuredHeight=Math.min(
      popup.scrollHeight||popup.getBoundingClientRect().height||180,
      Math.max(120,viewportHeight-margin*2)
    );
    const left=clamp(rect.left,margin,viewportWidth-width-margin);
    const below=rect.bottom+5;
    const above=rect.top-measuredHeight-5;
    const top=below+measuredHeight<=viewportHeight-margin
      ? below
      : Math.max(margin,above);

    popup.style.left=Math.round(left)+"px";
    popup.style.top=Math.round(top)+"px";
    popup.style.maxHeight=Math.max(120,viewportHeight-top-margin)+"px";

    if(id==="projectDropdown"||id==="tubeDropdown"){
      anchor.setAttribute("aria-expanded","true");
    }
    return true;
  }

  function updateAria(){
    for(const [id,spec] of Object.entries(popupSpecs)){
      if(id!=="projectDropdown"&&id!=="tubeDropdown")continue;
      const popup=document.getElementById(id);
      const anchor=document.getElementById(spec.anchor);
      anchor?.setAttribute("aria-expanded",isOpen(popup)?"true":"false");
      anchor?.setAttribute("aria-haspopup","listbox");
    }
  }

  function repositionOpenPopups(){
    for(const id of Object.keys(popupSpecs))positionPopup(id);
    updateAria();
  }

  function installPopupObservers(){
    for(const id of Object.keys(popupSpecs)){
      const popup=document.getElementById(id);
      if(!popup||popup.dataset.layoutFixBound==="1")continue;
      popup.dataset.layoutFixBound="1";
      const observer=new MutationObserver(()=>{
        if(isOpen(popup))requestAnimationFrame(()=>positionPopup(id));
        else updateAria();
      });
      observer.observe(popup,{attributes:true,attributeFilter:["class"],childList:true,subtree:false});
    }
    for(const [id,spec] of Object.entries(popupSpecs)){
      const anchor=document.getElementById(spec.anchor);
      if(!anchor||anchor.dataset.layoutFixBound==="1")continue;
      anchor.dataset.layoutFixBound="1";
      anchor.addEventListener("click",()=>requestAnimationFrame(()=>positionPopup(id)));
    }
  }

  function rectData(el){
    if(!el)return null;
    const r=el.getBoundingClientRect();
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
  }

  function overlaps(a,b,tolerance=.5){
    if(!a||!b)return false;
    return !(
      a.right<=b.left+tolerance||
      b.right<=a.left+tolerance||
      a.bottom<=b.top+tolerance||
      b.bottom<=a.top+tolerance
    );
  }

  function validateLayout(){
    const brand=rectData(document.querySelector(".tb-brand"));
    const editor=rectData(document.getElementById("projectEditor"));
    const actions=rectData(document.querySelector(".tb-head-actions"));
    const controls=rectData(document.querySelector(".tb-window-controls"));
    const header=rectData(document.querySelector(".tb-map-header"));
    const checksHead=rectData(document.querySelector(".tb-map-right .tb-card-head"));

    const result={
      viewport:{width:window.innerWidth,height:window.innerHeight},
      header,
      brand,
      projectEditor:editor,
      actions,
      windowControls:controls,
      checksHead,
      overlaps:{
        brandProject:overlaps(brand,editor),
        projectActions:overlaps(editor,actions),
        actionsWindow:overlaps(actions,controls),
        windowChecks:overlaps(controls,checksHead)
      },
      tubeDropdown:null
    };

    const tube=document.getElementById("tubeDropdown");
    if(tube&&isOpen(tube)){
      const r=rectData(tube);
      result.tubeDropdown={
        ...r,
        insideViewport:
          r.left>=-0.5&&r.right<=window.innerWidth+0.5&&
          r.top>=-0.5&&r.bottom<=window.innerHeight+0.5,
        rowCount:tube.querySelectorAll(".pt-tube-row").length
      };
    }
    return Object.freeze(result);
  }

  function install(){
    if(installed)return;
    installed=true;
    injectStyles();
    installPopupObservers();
    updateAria();

    window.addEventListener("resize",()=>requestAnimationFrame(repositionOpenPopups));
    window.addEventListener("scroll",()=>requestAnimationFrame(repositionOpenPopups),true);

    const bodyObserver=new MutationObserver(()=>{
      installPopupObservers();
      requestAnimationFrame(repositionOpenPopups);
    });
    bodyObserver.observe(document.body,{childList:true,subtree:true});
    requestAnimationFrame(repositionOpenPopups);
  }

  window.TubeBenderProjectTubeLayout=Object.freeze({
    install,
    repositionOpenPopups,
    validateLayout
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();