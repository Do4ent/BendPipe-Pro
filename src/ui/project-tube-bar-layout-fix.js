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
/* Project/Tube bar final layout guard: prevent Project from overlapping TB logo. */
body.tb-project-map .tb-map-header{
  min-width:0!important;
  overflow:visible!important;
}
body.tb-project-map #projectEditor{
  box-sizing:border-box!important;
  min-width:0!important;
  max-width:100%!important;
  overflow:visible!important;
  gap:8px!important;
}
body.tb-project-map #projectEditor .pt-group{
  min-width:0!important;
  max-width:100%!important;
}
body.tb-project-map #projectEditor .project-group,
body.tb-project-map #projectEditor .tube-group{
  flex:1 1 0!important;
  width:auto!important;
  min-width:0!important;
  max-width:none!important;
}
body.tb-project-map #projectEditor .project-combo,
body.tb-project-map #projectEditor .tube-combo{
  flex:1 1 auto!important;
  width:100%!important;
  min-width:0!important;
  max-width:100%!important;
  box-sizing:border-box!important;
}
body.tb-project-map #projectEditor .pt-label{
  min-width:0!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
}
body.tb-project-map #projectEditor .tube-field-format{
  min-width:0!important;
  overflow:hidden!important;
}
body.tb-project-map #projectEditor .pt-divider{
  flex:0 0 1px!important;
}

/* Desktop: explicit grid tracks keep TB brand and Project/Tube fields disjoint. */
@media (min-width:1551px){
  body.tb-project-map .tb-map-header{
    display:grid!important;
    grid-template-columns:382px minmax(400px,450px) minmax(8px,1fr) auto!important;
    column-gap:14px!important;
  }
  body.tb-project-map #projectEditor{
    width:100%!important;
    flex:none!important;
  }
}
@media (min-width:1121px) and (max-width:1550px){
  body.tb-project-map .tb-map-header{
    display:grid!important;
    grid-template-columns:310px minmax(330px,410px) minmax(8px,1fr) auto!important;
    column-gap:12px!important;
  }
  body.tb-project-map .tb-brand{
    min-width:0!important;
    width:auto!important;
  }
  body.tb-project-map #projectEditor{
    width:100%!important;
    flex:none!important;
  }
}
@media (max-width:1120px){
  body.tb-project-map .tb-map-header{
    display:grid!important;
    grid-template-columns:52px minmax(0,1fr)!important;
    column-gap:8px!important;
  }
  body.tb-project-map .tb-map-head-spacer,
  body.tb-project-map .tb-head-actions{
    display:none!important;
  }
  body.tb-project-map #projectEditor{
    width:100%!important;
    flex:none!important;
    gap:6px!important;
  }
}
@media (max-width:620px){
  body.tb-project-map #projectEditor{
    gap:4px!important;
  }
  body.tb-project-map #projectEditor .project-group{
    flex:0 1 42%!important;
  }
  body.tb-project-map #projectEditor .tube-group{
    flex:1 1 58%!important;
  }
}

/* Dropdowns are viewport overlays, never clipped by the header/workspace. */
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

    // Measure only after the popup has its final width.
    const measuredHeight=Math.min(
      popup.scrollHeight||popup.getBoundingClientRect().height||180,
      Math.max(120,viewportHeight-margin*2)
    );
    const left=clamp(rect.left,margin,viewportWidth-width-margin);
    const below=rect.bottom+5;
    const above=rect.top-measuredHeight-5;
    const top=
      below+measuredHeight<=viewportHeight-margin
        ? below
        : Math.max(margin,above);

    popup.style.left=Math.round(left)+"px";
    popup.style.top=Math.round(top)+"px";
    popup.style.maxHeight=Math.max(120,viewportHeight-top-margin)+"px";

    const expanded=id==="projectDropdown"||id==="tubeDropdown";
    if(expanded)anchor.setAttribute("aria-expanded","true");
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
        if(isOpen(popup)){
          requestAnimationFrame(()=>positionPopup(id));
        }else{
          updateAria();
        }
      });
      observer.observe(popup,{attributes:true,attributeFilter:["class"],childList:true,subtree:false});
    }

    for(const [id,spec] of Object.entries(popupSpecs)){
      const anchor=document.getElementById(spec.anchor);
      if(!anchor||anchor.dataset.layoutFixBound==="1")continue;
      anchor.dataset.layoutFixBound="1";
      anchor.addEventListener("click",()=>{
        requestAnimationFrame(()=>positionPopup(id));
      });
    }
  }

  function validateLayout(){
    const result={
      viewport:{width:window.innerWidth,height:window.innerHeight},
      overlap:false,
      tubeDropdown:null
    };
    const brand=document.querySelector(".tb-brand");
    const editor=document.getElementById("projectEditor");
    if(brand&&editor&&document.body.classList.contains("tb-project-map")){
      const a=brand.getBoundingClientRect();
      const b=editor.getBoundingClientRect();
      result.brand={left:a.left,right:a.right,width:a.width};
      result.projectEditor={left:b.left,right:b.right,width:b.width};
      result.overlap=a.right>b.left+.5;
    }
    const tube=document.getElementById("tubeDropdown");
    if(tube&&isOpen(tube)){
      const r=tube.getBoundingClientRect();
      result.tubeDropdown={
        left:r.left,right:r.right,top:r.top,bottom:r.bottom,
        width:r.width,height:r.height,
        insideViewport:
          r.left>=-0.5&&
          r.right<=window.innerWidth+0.5&&
          r.top>=-0.5&&
          r.bottom<=window.innerHeight+0.5,
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

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",install,{once:true});
  }else{
    install();
  }
})();