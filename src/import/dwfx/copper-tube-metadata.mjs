import { parseEntityRecords, parseObjectRecords } from "./raw-metadata-intake.mjs";

function firstProperty(entity,name,category=null){
  const list=entity.properties?.[name]??[];
  const filtered=category==null?list:list.filter((p)=>p.category===category);
  if(filtered.length!==1) return null;
  return filtered[0].value;
}

function decimal(value,label){
  const text=String(value??"").trim().replace(",",".");
  const match=/[-+]?\d+(?:\.\d+)?/.exec(text);
  if(!match) throw new RangeError(label+" contains no numeric value");
  const n=Number(match[0]);
  if(!Number.isFinite(n)) throw new RangeError(label+" is not finite");
  return n;
}

function exact(value,source,unit=null,method="dwfx_content_property"){
  return Object.freeze({
    value,
    confidence:1,
    reason:null,
    method,
    source:Object.freeze([source]),
    truth_category:"source",
    ...(unit?{unit}:{})
  });
}

function parseTubeDimensions(text){
  const source=String(text??"");
  if(!source.trim()) return null;

  const imperial=/([0-9]+)\s*[\/_]\s*([0-9]+)\s*(?:"|inch)?\s*x\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:mm)?/i.exec(source);
  if(imperial){
    const numerator=Number(imperial[1]);
    const denominator=Number(imperial[2]);
    const wall=decimal(imperial[3],"wall thickness");
    if(!(numerator>0)||!(denominator>0)||!(wall>0)) return null;
    return Object.freeze({
      outer_diameter_mm:numerator/denominator*25.4,
      wall_thickness_mm:wall,
      source_notation:imperial[0],
      diameter_method:"explicit_imperial_fraction_to_mm"
    });
  }

  const metric=/([0-9]+(?:[.,][0-9]+)?)\s*mm\s*x\s*([0-9]+(?:[.,][0-9]+)?)\s*mm/i.exec(source);
  if(metric){
    const od=decimal(metric[1],"outer diameter");
    const wall=decimal(metric[2],"wall thickness");
    if(!(od>0)||!(wall>0)) return null;
    return Object.freeze({
      outer_diameter_mm:od,
      wall_thickness_mm:wall,
      source_notation:metric[0],
      diameter_method:"explicit_metric_dimensions"
    });
  }

  return null;
}

function isCopperTubeEntity(entity){
  const material=firstProperty(entity,"Material","Physical");
  const description=firstProperty(entity,"Description","Design Tracking Properties");
  const title=firstProperty(entity,"Title","Summary Information");
  const description1=firstProperty(entity,"Description 1","User Defined Properties");
  const description2=firstProperty(entity,"Description 2","User Defined Properties");

  const explicitClass=
    /^Tube$/i.test(String(description1??"").trim()) &&
    /^Copper$/i.test(String(description2??"").trim());
  const textClass=/\b(?:tube\s*,?\s*copper|copper\s+tube)\b/i.test(
    [description,title].filter(Boolean).join(" ")
  );
  return /^Copper$/i.test(String(material??"").trim()) && (explicitClass||textClass);
}

function dimensionEvidence(entity){
  const sources=[
    ["Title","Summary Information"],
    ["Description","Design Tracking Properties"],
    ["Art.code manufacturer","User Defined Properties"]
  ];
  for(const [name,category] of sources){
    const value=firstProperty(entity,name,category);
    const dimensions=parseTubeDimensions(value);
    if(dimensions) return Object.freeze({name,category,value,dimensions});
  }
  return null;
}


function partNumberFromObjectLabel(label){
  const match=/^(\d+)(?=[\s/:-])/.exec(String(label??"").trim());
  return match?match[1]:null;
}

function partNumberFromEntityLabel(label){
  const text=String(label??"");
  const pattern=/(?:^|[\\/])(\d{5,})\.ipt/ig;
  let part=null;
  for(const match of text.matchAll(pattern)) part=match[1];
  return part;
}

function candidateFromRecord(record,part,{
  source_file,
  source_kind,
  part_number_method,
  reported_part_number_property=null,
  entity_filename_part_number=null
}){
  if(!isCopperTubeEntity(record)) return null;

  const dimensionsEvidence=dimensionEvidence(record);
  if(!dimensionsEvidence) return null;

  const lengthValue=firstProperty(record,"Length","User Defined Properties");
  if(lengthValue==null) return null;
  const developed=decimal(lengthValue,"Length");
  if(!(developed>0)) return null;

  const sourceRef=
    "dwfx:"+String(source_file)+"#"+source_kind+":"+String(record.id??part);
  const material=firstProperty(record,"Material","Physical")??null;
  const revision=firstProperty(record,"Revision Number","Summary Information")??null;
  const d=dimensionsEvidence.dimensions;

  return Object.freeze({
    id:String(record.id??part),
    entity_ref:record.entity_ref??(source_kind==="entity"?record.id??null:null),
    part_number:part,
    revision,
    quantity_in_assembly:null,
    material,
    metadata:Object.freeze({
      outer_diameter:exact(
        d.outer_diameter_mm,
        sourceRef,
        "mm",
        d.diameter_method
      ),
      wall_thickness:exact(
        d.wall_thickness_mm,
        sourceRef,
        "mm",
        "explicit_copper_tube_designation"
      ),
      developed_length:exact(
        developed,
        sourceRef,
        "mm",
        "dwfx_content_length_property"
      )
    }),
    source_evidence:Object.freeze({
      entity_label:record.label,
      recognition_kind:"copper_tube_fallback",
      source_record_kind:source_kind,
      part_number_method,
      reported_part_number_property,
      entity_filename_part_number,
      dimension_property:dimensionsEvidence.name,
      dimension_text:dimensionsEvidence.value,
      dimension_notation:d.source_notation,
      description:firstProperty(record,"Description","Design Tracking Properties"),
      title:firstProperty(record,"Title","Summary Information"),
      displayed_od_property:firstProperty(record,"OD","User Defined Properties"),
      displayed_wall_property:firstProperty(record,"SN","User Defined Properties")
    })
  });
}

/**
 * Strict fallback metadata recognizer for assemblies that describe editable
 * copper pipes as ordinary Tube/Copper Content Center parts instead of
 * "Bended tube". It excludes fittings and prefers an exact numeric Part Number.
 * When Autodesk omits that property on an instantiated copper-tube Object, an
 * exact numeric Object-label prefix is accepted as source identity evidence.
 */
export function extractCopperTubeMetadataFromContentXml(
  xml,
  {source_file="unknown.dwfx"}={}
){
  const candidates=[];
  const entities=parseEntityRecords(xml);
  const objects=parseObjectRecords(xml);
  const objectLabelPartsByEntity=new Map();

  for(const object of objects){
    const labelPart=partNumberFromObjectLabel(object.label);
    const entityRef=String(object.entity_ref??"");
    if(!labelPart||!entityRef)continue;
    const set=objectLabelPartsByEntity.get(entityRef)??new Set();
    set.add(labelPart);
    objectLabelPartsByEntity.set(entityRef,set);
  }

  for(const entity of entities){
    const partNumber=firstProperty(entity,"Part Number","Design Tracking Properties");
    if(!partNumber||!/^\d+$/.test(String(partNumber).trim())) continue;
    const reportedPart=String(partNumber).trim();
    const filenamePart=partNumberFromEntityLabel(entity.label);
    const instanceParts=objectLabelPartsByEntity.get(String(entity.id))??new Set();

    const identityOverride=
      filenamePart &&
      filenamePart!==reportedPart &&
      instanceParts.has(filenamePart);

    const part=identityOverride?filenamePart:reportedPart;
    const candidate=candidateFromRecord(entity,part,{
      source_file,
      source_kind:"entity",
      part_number_method:identityOverride
        ?"object_label_plus_entity_filename_override_stale_property"
        :"explicit_property",
      reported_part_number_property:reportedPart,
      entity_filename_part_number:filenamePart
    });
    if(candidate) candidates.push(candidate);
  }

  const entityParts=new Set(candidates.map((candidate)=>candidate.part_number));
  for(const object of objects){
    const explicitPart=firstProperty(
      object,
      "Part Number",
      "Design Tracking Properties"
    );
    const labelPart=partNumberFromObjectLabel(object.label);
    if(!labelPart||entityParts.has(labelPart)) continue;

    const linkedEntity=entities.find((entity)=>
      String(entity.id)===String(object.entity_ref??"")
    )??null;
    const filenamePart=partNumberFromEntityLabel(linkedEntity?.label);
    const explicitText=explicitPart==null?null:String(explicitPart).trim();
    const corroboratedConflict=
      explicitText &&
      /^\d+$/.test(explicitText) &&
      explicitText!==labelPart &&
      filenamePart===labelPart;

    if(explicitPart&&!corroboratedConflict) continue;

    const candidate=candidateFromRecord(object,labelPart,{
      source_file,
      source_kind:"object",
      part_number_method:corroboratedConflict
        ?"object_label_plus_entity_filename_override_stale_property"
        :"exact_object_label_prefix",
      reported_part_number_property:explicitText,
      entity_filename_part_number:filenamePart
    });
    if(candidate) candidates.push(candidate);
  }

  const byPart=new Map();
  for(const candidate of candidates){
    const list=byPart.get(candidate.part_number)??[];
    list.push(candidate);
    byPart.set(candidate.part_number,list);
  }
  const duplicates=[...byPart.entries()]
    .filter(([,list])=>list.length>1)
    .map(([part])=>part);

  if(duplicates.length){
    return Object.freeze({
      status:"blocked",
      production_ready:false,
      source:Object.freeze({format:"DWFx",file:String(source_file)}),
      tubes:Object.freeze([]),
      issues:Object.freeze(
        duplicates.map((part)=>"duplicate copper-tube entity for part "+part)
      )
    });
  }

  return Object.freeze({
    status:candidates.length?"exact":"blocked",
    production_ready:false,
    source:Object.freeze({
      format:"DWFx",
      file:String(source_file),
      recognition:"dwfx_copper_tube_content_properties"
    }),
    recognition_status:Object.freeze({
      metadata_only:true,
      production_ready:false,
      bend_sequence:"not_extracted",
      note:"Copper tube metadata extracted from exact Content Entity properties, with strict instantiated Object-label fallback when Autodesk omits Part Number; W3D geometry remains authoritative for editable LINE/BEND reconstruction."
    }),
    tubes:Object.freeze(candidates),
    issues:Object.freeze(
      candidates.length?[]:["No exact copper tube metadata entities were found."]
    )
  });
}

export { parseTubeDimensions, isCopperTubeEntity };
