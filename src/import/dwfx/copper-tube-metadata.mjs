import { parseEntityRecords } from "./raw-metadata-intake.mjs";

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

  const imperial=/([0-9]+)\s*[\/_]\s*([0-9]+)\s*(?:"|inch)?\s*x\s*([0-9]+(?:[.,][0-9]+)?)\s*mm?/i.exec(source);
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

/**
 * Strict fallback metadata recognizer for assemblies that describe editable
 * copper pipes as ordinary Tube/Copper Content Center parts instead of
 * "Bended tube". It deliberately excludes fittings and entities without an
 * exact numeric Part Number because downstream W3D linkage is part-number based.
 */
export function extractCopperTubeMetadataFromContentXml(
  xml,
  {source_file="unknown.dwfx"}={}
){
  const candidates=[];

  for(const entity of parseEntityRecords(xml)){
    const partNumber=firstProperty(entity,"Part Number","Design Tracking Properties");
    if(!partNumber||!/^\d+$/.test(String(partNumber).trim())) continue;
    if(!isCopperTubeEntity(entity)) continue;

    const dimensionsEvidence=dimensionEvidence(entity);
    if(!dimensionsEvidence) continue;

    const lengthValue=firstProperty(entity,"Length","User Defined Properties");
    if(lengthValue==null) continue;
    const developed=decimal(lengthValue,"Length");
    if(!(developed>0)) continue;

    const part=String(partNumber).trim();
    const sourceRef="dwfx:"+String(source_file)+"#entity:"+String(entity.id??part);
    const material=firstProperty(entity,"Material","Physical")??null;
    const revision=firstProperty(entity,"Revision Number","Summary Information")??null;
    const d=dimensionsEvidence.dimensions;

    candidates.push(Object.freeze({
      id:String(entity.id??part),
      entity_ref:entity.id??null,
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
        entity_label:entity.label,
        recognition_kind:"copper_tube_fallback",
        dimension_property:dimensionsEvidence.name,
        dimension_text:dimensionsEvidence.value,
        dimension_notation:d.source_notation,
        description:firstProperty(entity,"Description","Design Tracking Properties"),
        title:firstProperty(entity,"Title","Summary Information"),
        displayed_od_property:firstProperty(entity,"OD","User Defined Properties"),
        displayed_wall_property:firstProperty(entity,"SN","User Defined Properties")
      })
    }));
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
      note:"Copper tube metadata extracted from exact Content Entity properties; W3D geometry remains authoritative for editable LINE/BEND reconstruction."
    }),
    tubes:Object.freeze(candidates),
    issues:Object.freeze(
      candidates.length?[]:["No exact copper tube metadata entities were found."]
    )
  });
}

export { parseTubeDimensions, isCopperTubeEntity };
