(()=>{
  function finite(value,defaultValue=0){
    if(value===null||value===undefined||value==="")return defaultValue;
    const n=Number(value);return Number.isFinite(n)?n:defaultValue;
  }
  function pref(tube,end){
    const raw=tube?.trim_preferences?.[end]??{};
    const method=["saw","tube_cutter","laser","manual","other"].includes(raw.method)?raw.method:"saw";
    const tolerance=Math.max(0,finite(raw.tolerance_mm,0.5));
    const mode=raw?.plane?.mode==="explicit"?"explicit":"perpendicular_to_centerline";
    return Object.freeze({
      end,method,tolerance_mm:tolerance,
      plane:Object.freeze({
        mode,
        point_mm:raw?.plane?.point_mm??null,
        normal:mode==="explicit"?raw?.plane?.normal??null:null
      }),
      notes:typeof raw.notes==="string"?raw.notes:""
    });
  }
  function buildPlan({tube,endAllowances={},setupExtensions={},style={}}={}){
    const startAuto=Math.max(0,finite(endAllowances.startAllowance,0));
    const endAuto=Math.max(0,finite(endAllowances.endAllowance,0));
    const startSetup=Math.max(0,finite(setupExtensions.start_mm,0));
    const endSetup=Math.max(0,finite(setupExtensions.end_mm,0));
    const startCut=Math.max(0,finite(style.cutAllowanceStart,0));
    const endCut=Math.max(0,finite(style.cutAllowanceEnd,0));
    const make=(end,remove,preference)=>Object.freeze({
      id:"trim-"+end.toLowerCase(),
      type:"TrimCut",
      end,
      remove_length_mm:remove,
      method:preference.method,
      tolerance_mm:preference.tolerance_mm,
      plane:preference.plane,
      source:"required_allowances",
      manufacturing_only:true,
      nominal_geometry_changed:false,
      enabled:remove>1e-9,
      notes:preference.notes
    });
    const p1=make("P1",startAuto+startSetup+startCut,pref(tube,"P1"));
    const p2=make("P2",endAuto+endSetup+endCut,pref(tube,"P2"));
    return Object.freeze({
      operations:Object.freeze([p1,p2]),
      required_removal_mm:p1.remove_length_mm+p2.remove_length_mm,
      p1_auto_allowance_mm:startAuto,p2_auto_allowance_mm:endAuto,
      p1_setup_extension_mm:startSetup,p2_setup_extension_mm:endSetup,
      p1_cut_allowance_mm:startCut,p2_cut_allowance_mm:endCut,
      nominal_geometry_changed:false
    });
  }
  function validate(plan){
    const errors=[],warnings=[];
    for(const op of plan?.operations??[]){
      if(!["P1","P2"].includes(op?.end))errors.push("Trim end is invalid");
      if(!(Number(op?.remove_length_mm)>=0))errors.push((op?.end??"?")+": invalid trim length");
      if(!(Number(op?.tolerance_mm)>=0))errors.push((op?.end??"?")+": invalid trim tolerance");
      if(op?.manufacturing_only!==true||op?.nominal_geometry_changed!==false)errors.push((op?.end??"?")+": trim must remain manufacturing-only");
      if(op?.plane?.mode==="explicit"){
        const n=op?.plane?.normal;
        const length=Math.hypot(Number(n?.x)||0,Number(n?.y)||0,Number(n?.z)||0);
        if(!(length>1e-12))errors.push((op?.end??"?")+": explicit trim plane has no normal");
      }
      if(Number(op?.remove_length_mm)===0)warnings.push((op?.end??"?")+": no trim required");
    }
    return Object.freeze({ok:errors.length===0,status:errors.length?"Error":warnings.length?"Warning":"Valid",errors:Object.freeze(errors),warnings:Object.freeze(warnings)});
  }
  function finishedLength(stockLengthMm,plan){
    const stock=Number(stockLengthMm);
    if(!Number.isFinite(stock)||stock<0)return null;
    const removal=(plan?.operations??[]).filter((op)=>op?.enabled!==false).reduce((sum,op)=>sum+Math.max(0,Number(op?.remove_length_mm)||0),0);
    return stock>=removal?stock-removal:null;
  }
  window.TubeBenderTrimCutRuntime=Object.freeze({buildPlan,validate,finishedLength,preference:pref});
})();