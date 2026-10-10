(()=>{
  const EPS=1e-9;
  function finite(value){if(value===null||value===undefined||value==="")return null;const n=Number(value);return Number.isFinite(n)?n:null;}
  function projectProfiles(project){
    return Array.isArray(project?.materialLibrary?.project_profiles)
      ? project.materialLibrary.project_profiles
      : [];
  }
  function materialFingerprint(profile){
    if(!profile)return null;
    const payload={
      id:profile.id??null,
      density_kg_m3:profile.density_kg_m3??null,
      elastic_modulus_mpa:profile.elastic_modulus_mpa??null,
      yield_strength_mpa:profile.yield_strength_mpa??null,
      tensile_strength_mpa:profile.tensile_strength_mpa??null,
      poisson_ratio:profile.poisson_ratio??null,
      thermal_expansion_per_c:profile.thermal_expansion_per_c??null,
      springback:profile.springback??null,
      minimum_clr_mm:profile.minimum_clr_mm??null,
      dt_ratio_min:profile.dt_ratio_min??null,
      dt_ratio_max:profile.dt_ratio_max??null,
      custom_fields:profile.custom_fields??[]
    };
    let hash=2166136261;
    const text=JSON.stringify(payload);
    for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return "mat-"+(hash>>>0).toString(16).padStart(8,"0");
  }
  function tubeFacts(tube){
    const od=finite(tube?.od_mm??tube?.outer_diameter_mm);
    const wall=finite(tube?.wall_mm??tube?.wall_thickness_mm);
    const clrs=Array.isArray(tube?.bend_clr_mm)
      ? tube.bend_clr_mm.map(finite).filter((x)=>x!==null)
      : [finite(tube?.clr_mm??tube?.centerline_radius_mm)].filter((x)=>x!==null);
    return {od,wall,clrs};
  }
  function resolveProfile(project,tube){
    const id=String(tube?.material_profile_id??"").trim();
    if(!id)return null;
    return projectProfiles(project).find((profile)=>String(profile?.id)===id)??null;
  }
  function materialCheck(project,tube,{requireSpringback=true,requireDensity=false,requireWarningAck=false}={}){
    const profile=resolveProfile(project,tube);
    const errors=[],warnings=[];
    if(!tube?.material_profile_id)errors.push("Material Profile не назначен трубе");
    else if(!profile)errors.push("Назначенный Material Profile отсутствует в проектной библиотеке");
    if(profile){
      const factor=finite(profile.springback);
      if(requireSpringback){
        if(factor===null)errors.push("В Material Profile не задан springback factor");
        else if(!(factor>0))errors.push("Springback factor должен быть больше 0");
        else if(factor<1)warnings.push("Springback factor меньше 1 — проверьте направление компенсации");
      }
      const density=finite(profile.density_kg_m3);
      if(requireDensity&&!(density>0))errors.push("В Material Profile не задана положительная плотность");
      const ys=finite(profile.yield_strength_mpa),uts=finite(profile.tensile_strength_mpa);
      if(ys!==null&&uts!==null&&ys>uts)errors.push("Предел текучести материала превышает предел прочности");
      const minimumClr=finite(profile.minimum_clr_mm);
      if(minimumClr!==null&&!(minimumClr>0))errors.push("Минимальный CLR материала должен быть больше 0");

      const facts=tubeFacts(tube);
      if(facts.od!==null&&facts.wall!==null){
        if(!(facts.wall>0))errors.push("Толщина стенки трубы должна быть больше 0 для проверки D/t");
        else{
          const ratio=facts.od/facts.wall;
          const min=finite(profile.dt_ratio_min),max=finite(profile.dt_ratio_max);
          if(min!==null&&ratio<min-EPS)errors.push(`D/t ${ratio.toFixed(3)} ниже допустимого минимума ${min}`);
          if(max!==null&&ratio>max+EPS)errors.push(`D/t ${ratio.toFixed(3)} выше допустимого максимума ${max}`);
        }
      }else if(profile.dt_ratio_min!=null||profile.dt_ratio_max!=null){
        warnings.push("OD или толщина стенки не определены — диапазон D/t не проверен");
      }

      if(minimumClr!==null&&facts.clrs.length){
        const below=facts.clrs.filter((clr)=>clr+EPS<minimumClr);
        if(below.length)warnings.push(`CLR ${Math.min(...below)} мм меньше рекомендуемого для материала ${minimumClr} мм`);
      }else if(minimumClr!==null&&!facts.clrs.length){
        warnings.push("CLR трубы не определён — минимальный рекомендуемый CLR материала не проверен");
      }
    }

    const signature=profile?materialFingerprint(profile):null;
    const acknowledged=!!signature&&String(tube?.material_warning_ack_signature??"")===signature;
    const warningAckRequired=warnings.length>0&&!acknowledged;
    if(requireWarningAck&&warningAckRequired)errors.push("Предупреждения Material Profile требуют явного подтверждения");

    return Object.freeze({
      ok:errors.length===0,
      status:errors.length?"Error":warnings.length?"Warning":"Valid",
      profile,
      material_signature:signature,
      warning_acknowledged:acknowledged,
      warning_ack_required:warningAckRequired,
      errors:Object.freeze(errors),
      warnings:Object.freeze(warnings)
    });
  }
  function compensateBend({project,tube,nominalAngleDeg,toolingCorrectionDeg=0}={}){
    const check=materialCheck(project,tube,{requireSpringback:true});
    const nominal=finite(nominalAngleDeg);
    if(nominal===null)return Object.freeze({ok:false,status:"Error",errors:["Номинальный угол не является числом"],commandAngleDeg:null});
    if(!check.ok)return Object.freeze({
      ok:false,status:check.status,profileId:check.profile?.id??null,profileName:check.profile?.name??null,
      nominalAngleDeg:nominal,commandAngleDeg:null,springbackFactor:null,materialDeltaDeg:null,
      toolingCorrectionDeg:finite(toolingCorrectionDeg)??0,errors:check.errors,warnings:check.warnings
    });
    const factor=Number(check.profile.springback);
    const tooling=finite(toolingCorrectionDeg)??0;
    const materialCommand=nominal*factor;
    const command=materialCommand+tooling;
    return Object.freeze({
      ok:true,status:check.status,
      profileId:check.profile.id,profileName:check.profile.name,
      nominalAngleDeg:nominal,
      springbackFactor:factor,
      materialDeltaDeg:materialCommand-nominal,
      toolingCorrectionDeg:tooling,
      commandAngleDeg:command,
      materialSignature:check.material_signature,
      warningAcknowledged:check.warning_acknowledged,
      warningAckRequired:check.warning_ack_required,
      errors:Object.freeze([]),warnings:check.warnings
    });
  }
  function densityKgM3(project,tube){
    const profile=resolveProfile(project,tube);
    const density=finite(profile?.density_kg_m3);
    return density!==null&&density>0?density:null;
  }
  function validateManufacturingData({project,tube,manufacturing,kind="manufacturing"}={}){
    const errors=[],warnings=[];
    const material=materialCheck(project,tube,{requireSpringback:true,requireDensity:false,requireWarningAck:true});
    errors.push(...material.errors);warnings.push(...material.warnings);
    const equipment=manufacturing?.equipmentValidation;
    if(equipment){
      errors.push(...(equipment.errors??[]).map((x)=>"Equipment: "+x));
      warnings.push(...(equipment.warnings??[]).map((x)=>"Equipment: "+x));
    }
    const trim=manufacturing?.trimValidation;
    if(trim){
      errors.push(...(trim.errors??[]).map((x)=>"Trim/Cut: "+x));
      warnings.push(...(trim.warnings??[]).map((x)=>"Trim/Cut: "+x));
    }
    const steps=manufacturing?.steps;
    if(!Array.isArray(steps))errors.push("Производственные шаги отсутствуют");
    else{
      for(const step of steps){
        const bend=step?.bend??"?";
        if(finite(step?.Y)===null)errors.push(`Гиб ${bend}: Y/L не является числом`);
        if(finite(step?.B)===null)errors.push(`Гиб ${bend}: B/R не является числом`);
        if(finite(step?.C)===null)errors.push(`Гиб ${bend}: номинальный угол отсутствует`);
        if(finite(step?.commandAngle)===null)errors.push(`Гиб ${bend}: машинный угол не рассчитан`);
      }
    }
    const machine=manufacturing?.machine??{};
    if(kind==="nc"&&!String(machine?.ncPost??"").trim())errors.push("Не выбран NC-постпроцессор");
    const maxAngle=finite(machine?.maxBendAngle);
    const rotationLimit=finite(machine?.rotationLimit);
    const minFeed=finite(machine?.minFeed);
    for(const step of steps??[]){
      const command=finite(step?.commandAngle),rotation=finite(step?.B),feed=finite(step?.Y);
      if(maxAngle!==null&&command!==null&&Math.abs(command)>maxAngle+EPS)errors.push(`Гиб ${step.bend}: машинный угол ${command}° превышает лимит ${maxAngle}°`);
      if(rotationLimit!==null&&rotation!==null&&Math.abs(rotation)>rotationLimit+EPS)errors.push(`Гиб ${step.bend}: поворот ${rotation}° превышает лимит ${rotationLimit}°`);
      if(minFeed!==null&&feed!==null&&feed+EPS<minFeed)warnings.push(`Гиб ${step.bend}: подача ${feed} мм меньше рекомендуемой ${minFeed} мм`);
    }
    return Object.freeze({
      ok:errors.length===0,
      status:errors.length?"Error":warnings.length?"Warning":"Valid",
      material,
      equipment:equipment??null,
      trim:trim??null,
      errors:Object.freeze([...new Set(errors)]),
      warnings:Object.freeze([...new Set(warnings)])
    });
  }

  function parseWords(line){
    const result={};
    const rx=/([A-Za-z])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/g;
    let m;while((m=rx.exec(String(line))))result[m[1].toUpperCase()]=Number(m[2]);
    return result;
  }
  function parseGenericNc(text,format){
    const normalized=String(format??"").toUpperCase();
    if(!["YBC","LRA"].includes(normalized))return Object.freeze({supported:false,format:normalized,steps:[]});
    const steps=[];
    for(const raw of String(text??"").split(/\r?\n/)){
      const line=raw.trim();if(!line||line.startsWith(";")||line.startsWith("#"))continue;
      const words=parseWords(line);
      if(normalized==="YBC"&&["Y","B","C"].every((k)=>Number.isFinite(words[k]))){
        steps.push(Object.freeze({Y:words.Y,B:words.B,commandAngle:words.C}));
      }else if(normalized==="LRA"&&["L","R","A"].every((k)=>Number.isFinite(words[k]))){
        steps.push(Object.freeze({L:words.L,R:words.R,commandAngle:words.A}));
      }
    }
    return Object.freeze({supported:true,format:normalized,steps:Object.freeze(steps)});
  }
  function roundTripValidate({text,format,expectedSteps,lengthTolerance=0.001,angleTolerance=0.001}={}){
    const parsed=parseGenericNc(text,format);
    if(!parsed.supported)return Object.freeze({status:"NotChecked",ok:true,supported:false,errors:Object.freeze([]),parsed});
    const expected=Array.isArray(expectedSteps)?expectedSteps:[];
    const errors=[];
    if(parsed.steps.length!==expected.length)errors.push(`Количество гибов после обратного чтения: ${parsed.steps.length}, ожидалось ${expected.length}`);
    const count=Math.min(parsed.steps.length,expected.length);
    for(let i=0;i<count;i++){
      const p=parsed.steps[i],e=expected[i],bend=e?.bend??i+1;
      if(parsed.format==="YBC"){
        if(Math.abs(Number(p.Y)-Number(e.Y))>lengthTolerance)errors.push(`Гиб ${bend}: Y изменился при round-trip`);
        if(Math.abs(Number(p.B)-Number(e.B))>angleTolerance)errors.push(`Гиб ${bend}: B изменился при round-trip`);
      }else{
        if(Math.abs(Number(p.L)-Number(e.L))>lengthTolerance)errors.push(`Гиб ${bend}: L изменился при round-trip`);
        if(Math.abs(Number(p.R)-Number(e.R))>angleTolerance)errors.push(`Гиб ${bend}: R изменился при round-trip`);
      }
      if(Math.abs(Number(p.commandAngle)-Number(e.commandAngle))>angleTolerance)errors.push(`Гиб ${bend}: машинный угол изменился при round-trip`);
    }
    return Object.freeze({
      status:errors.length?"Error":"Valid",
      ok:errors.length===0,
      supported:true,
      errors:Object.freeze(errors),
      parsed
    });
  }

  window.TubeBenderMaterialManufacturing=Object.freeze({
    resolveProfile,
    materialFingerprint,
    materialCheck,
    compensateBend,
    densityKgM3,
    validateManufacturingData,
    parseGenericNc,
    roundTripValidate
  });
})();
