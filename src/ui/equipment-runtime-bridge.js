(()=>{
  function list(project,key){return Array.isArray(project?.equipmentLibrary?.[key])?project.equipmentLibrary[key]:[];}
  function byId(items,id){const key=String(id??"").trim();return key?items.find((x)=>String(x?.id)===key)??null:null;}
  function resolveMachineInstance(project,tube){return byId(list(project,"machine_instances"),tube?.machine_instance_id);}
  function resolveMachineProfile(project,tube){
    const direct=byId(list(project,"machine_profiles"),tube?.machine_profile_id);
    if(direct)return direct;
    const instance=resolveMachineInstance(project,tube);
    return instance?byId(list(project,"machine_profiles"),instance.machine_profile_id):null;
  }
  function resolveToolingInstance(project,tube){return byId(list(project,"tooling_instances"),tube?.tooling_instance_id);}
  function resolveToolingSet(project,tube){
    const direct=byId(list(project,"tooling_sets"),tube?.tooling_set_id);
    if(direct)return direct;
    const instance=resolveToolingInstance(project,tube);
    return instance?byId(list(project,"tooling_sets"),instance.tooling_set_id):null;
  }
  function toolingCorrectionDeg(project,tube){
    const instance=resolveToolingInstance(project,tube);
    const value=Number(instance?.angle_correction_deg);
    return Number.isFinite(value)?value:0;
  }
  function effectiveValue(profile,instance,profileKey,overrideKey=profileKey){
    const override=instance?.limit_overrides?.[overrideKey];
    if(override!==null&&override!==undefined&&override!==""){
      const n=Number(override);if(Number.isFinite(n))return n;
    }
    const value=profile?.[profileKey];
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  }
  function effectiveMachine(project,tube,legacyMachine=null){
    const profile=resolveMachineProfile(project,tube);
    const instance=resolveMachineInstance(project,tube);
    if(!profile)return legacyMachine??null;
    const out={
      ...(legacyMachine&&typeof legacyMachine==="object"?legacyMachine:{}),
      equipmentProfileId:profile.id,
      equipmentInstanceId:instance?.id??null,
      name:instance?.name||profile.name,
      manufacturer:profile.manufacturer??"",
      model:profile.model??"",
      technology:profile.technology??legacyMachine?.technology??null,
      maxDiameter:effectiveValue(profile,instance,"max_diameter_mm"),
      maxStockLength:effectiveValue(profile,instance,"max_stock_length_mm"),
      minFeed:effectiveValue(profile,instance,"min_feed_mm"),
      maxBendAngle:effectiveValue(profile,instance,"max_bend_angle_deg"),
      clampMin:effectiveValue(profile,instance,"clamp_min_mm"),
      rotationLimit:effectiveValue(profile,instance,"rotation_limit_deg"),
      headRadius:Number.isFinite(Number(profile.head_radius_mm))?Number(profile.head_radius_mm):legacyMachine?.headRadius??null,
      headLength:Number.isFinite(Number(profile.head_length_mm))?Number(profile.head_length_mm):legacyMachine?.headLength??null,
      headHeight:Number.isFinite(Number(profile.head_height_mm))?Number(profile.head_height_mm):legacyMachine?.headHeight??null,
      bendSide:profile.bend_side??legacyMachine?.bendSide??"",
      supportsReverse:profile.supports_reverse===true,
      ncPost:profile.nc_post??legacyMachine?.ncPost??null,
      confirmed:profile.confirmed===true
    };
    return Object.freeze(out);
  }
  function activeMachineSetup(tube){
    const setups=Array.isArray(tube?.machine_setups)?tube.machine_setups:[];
    const id=String(tube?.active_machine_setup_id??"").trim();
    return id?setups.find((setup)=>String(setup?.id)===id)??null:null;
  }
  function machineSetupOffsetMm(tube){
    const setup=activeMachineSetup(tube);if(!setup)return 0;
    if(setup.offset_method==="clamp_point"){
      const n=Number(setup.clamp_point_mm);return Number.isFinite(n)?n:0;
    }
    if(setup.offset_method==="feed_zero"){
      const n=Number(setup.feed_zero_mm);return Number.isFinite(n)?n:0;
    }
    const n=Number(setup.offset_mm);return Number.isFinite(n)?n:0;
  }
  function machineSetupExtensions(tube){
    const setup=activeMachineSetup(tube);
    if(!setup)return Object.freeze({start_mm:0,end_mm:0});
    const start=Number(setup?.clamping_extensions?.start_mm),end=Number(setup?.clamping_extensions?.end_mm);
    return Object.freeze({
      start_mm:Number.isFinite(start)&&start>0?start:0,
      end_mm:Number.isFinite(end)&&end>0?end:0
    });
  }
  function machineSetupCheck(project,tube){
    const setup=activeMachineSetup(tube);
    if(!setup)return Object.freeze({ok:true,status:"NotConfigured",errors:Object.freeze([]),warnings:Object.freeze([]),setup:null});
    const errors=[],warnings=[];
    if(setup.machine_profile_id&&tube?.machine_profile_id&&String(setup.machine_profile_id)!==String(tube.machine_profile_id))errors.push("Machine Setup references another Machine Profile");
    if(setup.machine_instance_id&&tube?.machine_instance_id&&String(setup.machine_instance_id)!==String(tube.machine_instance_id))errors.push("Machine Setup references another Machine Instance");
    if(setup.tooling_set_id&&tube?.tooling_set_id&&String(setup.tooling_set_id)!==String(tube.tooling_set_id))errors.push("Machine Setup references another Tooling Set");
    if(setup.tooling_instance_id&&tube?.tooling_instance_id&&String(setup.tooling_instance_id)!==String(tube.tooling_instance_id))errors.push("Machine Setup references another Tooling Instance");
    if(!setup.datum?.type)errors.push("Machine Setup datum is missing");
    if(setup.offset_method==="clamp_point"&&!Number.isFinite(Number(setup.clamp_point_mm)))errors.push("Machine Setup clamp point is unresolved");
    if(setup.offset_method==="feed_zero"&&!Number.isFinite(Number(setup.feed_zero_mm)))errors.push("Machine Setup feed zero is unresolved");
    if(!setup.machine_profile_id&&!setup.machine_instance_id)warnings.push("Machine Setup has no explicit machine assignment");
    return Object.freeze({ok:errors.length===0,status:errors.length?"Error":warnings.length?"Warning":"Valid",errors:Object.freeze(errors),warnings:Object.freeze(warnings),setup});
  }

  function assignmentCheck(project,tube){
    const errors=[],warnings=[];
    const mp=resolveMachineProfile(project,tube),mi=resolveMachineInstance(project,tube);
    const ts=resolveToolingSet(project,tube),ti=resolveToolingInstance(project,tube);
    if(tube?.machine_profile_id||tube?.machine_instance_id){
      if(!mp)errors.push("Назначенный Machine Profile не найден");
      if(tube.machine_instance_id&&!mi)errors.push("Назначенный Machine Instance не найден");
      if(mi&&mp&&String(mi.machine_profile_id)!==String(mp.id))errors.push("Machine Instance не соответствует Machine Profile");
    }
    if(tube?.tooling_set_id||tube?.tooling_instance_id){
      if(!ts)errors.push("Назначенный Tooling Set не найден");
      if(tube.tooling_instance_id&&!ti)errors.push("Назначенный Tooling Instance не найден");
      if(ti&&ts&&String(ti.tooling_set_id)!==String(ts.id))errors.push("Tooling Instance не соответствует Tooling Set");
    }
    if(mp&&ts){
      const declared=Array.isArray(ts.compatible_machine_profile_ids)?ts.compatible_machine_profile_ids:[];
      if(!declared.length)warnings.push("Tooling Set не имеет явно заданной совместимости со станком");
      else if(!declared.map(String).includes(String(mp.id)))errors.push("Tooling Set несовместим с назначенным Machine Profile");
      const od=Number(tube?.outer_diameter_mm??tube?.od_mm);
      const toolOd=Number(ts.diameter_mm);
      if(Number.isFinite(od)&&Number.isFinite(toolOd)&&Math.abs(od-toolOd)>0.02)errors.push("Диаметр трубы не соответствует Tooling Set");
      const wall=Number(tube?.wall_thickness_mm??tube?.wall_mm);
      const wallMin=Number(ts.wall_min_mm),wallMax=Number(ts.wall_max_mm);
      if(Number.isFinite(wall)){
        if(Number.isFinite(wallMin)&&wall<wallMin-1e-9)errors.push("Толщина стенки ниже диапазона Tooling Set");
        if(Number.isFinite(wallMax)&&wall>wallMax+1e-9)errors.push("Толщина стенки выше диапазона Tooling Set");
      }else if(ts.wall_min_mm!=null||ts.wall_max_mm!=null)warnings.push("Толщина стенки трубы не определена для проверки Tooling Set");
      const clrs=Array.isArray(tube?.bend_clr_mm)
        ? tube.bend_clr_mm.map(Number).filter(Number.isFinite)
        : [Number(tube?.clr_mm??tube?.centerline_radius_mm)].filter(Number.isFinite);
      const toolingClr=Number(ts.clr_mm);
      if(Number.isFinite(toolingClr)&&clrs.some((clr)=>Math.abs(clr-toolingClr)>0.05)){
        errors.push("CLR трубы не соответствует Tooling Set");
      }
    }
    return Object.freeze({
      ok:errors.length===0,
      status:errors.length?"Error":warnings.length?"Warning":"Valid",
      machineProfile:mp,machineInstance:mi,toolingSet:ts,toolingInstance:ti,
      errors:Object.freeze(errors),warnings:Object.freeze(warnings)
    });
  }
  window.TubeBenderEquipmentRuntime=Object.freeze({
    resolveMachineProfile,resolveMachineInstance,resolveToolingSet,resolveToolingInstance,
    toolingCorrectionDeg,effectiveMachine,assignmentCheck,
    activeMachineSetup,machineSetupOffsetMm,machineSetupExtensions,machineSetupCheck
  });
})();