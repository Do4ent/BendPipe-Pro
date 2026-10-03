(()=>{
  const EPS=1e-9;
  function finite(value){const n=Number(value);return Number.isFinite(n)?n:null;}
  function projectProfiles(project){
    return Array.isArray(project?.materialLibrary?.project_profiles)
      ? project.materialLibrary.project_profiles
      : [];
  }
  function resolveProfile(project,tube){
    const id=String(tube?.material_profile_id??"").trim();
    if(!id)return null;
    return projectProfiles(project).find((profile)=>String(profile?.id)===id)??null;
  }
  function materialCheck(project,tube,{requireSpringback=true,requireDensity=false}={}){
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
      const clr=finite(profile.minimum_clr_mm);
      if(clr!==null&&!(clr>0))errors.push("Минимальный CLR материала должен быть больше 0");
    }
    return Object.freeze({
      ok:errors.length===0,
      status:errors.length?"Error":warnings.length?"Warning":"Valid",
      profile,
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
    const material=materialCheck(project,tube,{requireSpringback:true,requireDensity:false});
    errors.push(...material.errors);warnings.push(...material.warnings);
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
    materialCheck,
    compensateBend,
    densityKgM3,
    validateManufacturingData,
    parseGenericNc,
    roundTripValidate
  });
})();
