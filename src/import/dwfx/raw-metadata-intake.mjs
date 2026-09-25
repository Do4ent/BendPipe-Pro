function decodeXml(value){
  return String(value??"").replace(
    /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g,
    (match,entity)=>{
      if(entity==="amp") return "&";
      if(entity==="lt") return "<";
      if(entity==="gt") return ">";
      if(entity==="quot") return '"';
      if(entity==="apos") return "'";
      if(entity.startsWith("#x")){
        const code=Number.parseInt(entity.slice(2),16);
        return Number.isFinite(code)?String.fromCodePoint(code):match;
      }
      if(entity.startsWith("#")){
        const code=Number.parseInt(entity.slice(1),10);
        return Number.isFinite(code)?String.fromCodePoint(code):match;
      }
      return match;
    }
  );
}

function parseAttributes(fragment){
  const out={};
  const pattern=/([A-Za-z_][\w:.-]*)\s*=\s*(["'])(.*?)\2/gs;
  for(const match of fragment.matchAll(pattern)){
    out[match[1].split(":").at(-1)]=decodeXml(match[3]);
  }
  return out;
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

function parseEntityRecords(xml){
  if(typeof xml!=="string") throw new TypeError("content XML must be a string");
  const entities=[];
  const pattern=/<(?:[A-Za-z_][\w.-]*:)?Entity\b([^>]*)>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?Entity>/g;
  for(const match of xml.matchAll(pattern)){
    const attrs=parseAttributes(match[1]);
    const properties={};
    const propPattern=/<(?:[A-Za-z_][\w.-]*:)?Property\b([^>]*)\/?\s*>/g;
    for(const propMatch of match[2].matchAll(propPattern)){
      const p=parseAttributes(propMatch[1]);
      if(!p.name) continue;
      const current=properties[p.name]??[];
      current.push(Object.freeze({
        value:p.value??null,
        category:p.category??null
      }));
      properties[p.name]=current;
    }
    entities.push(Object.freeze({
      id:attrs.id??null,
      label:attrs.label??null,
      properties:Object.freeze(properties)
    }));
  }
  return Object.freeze(entities);
}

function firstProperty(entity,name,category=null){
  const list=entity.properties?.[name]??[];
  const filtered=category==null
    ? list
    : list.filter((p)=>p.category===category);
  if(filtered.length!==1) return null;
  return filtered[0].value;
}

function parseTubeDescription(description){
  const text=decodeXml(String(description??""));
  const fraction=/([0-9]+)\s*\/\s*([0-9]+)\s*"\s*x\s*([0-9]+(?:[.,][0-9]+)?)\s*mm/i.exec(text);
  if(fraction){
    const numerator=Number(fraction[1]);
    const denominator=Number(fraction[2]);
    const wall=decimal(fraction[3],"wall thickness");
    if(!(denominator>0)||!(numerator>0)||!(wall>0)){
      throw new RangeError("invalid imperial tube description");
    }
    return Object.freeze({
      outer_diameter_mm:numerator/denominator*25.4,
      wall_thickness_mm:wall,
      source_notation:fraction[0],
      diameter_method:"explicit_imperial_fraction_to_mm"
    });
  }

  const metric=/([0-9]+(?:[.,][0-9]+)?)\s*mm\s*x\s*([0-9]+(?:[.,][0-9]+)?)\s*mm/i.exec(text);
  if(metric){
    return Object.freeze({
      outer_diameter_mm:decimal(metric[1],"outer diameter"),
      wall_thickness_mm:decimal(metric[2],"wall thickness"),
      source_notation:metric[0],
      diameter_method:"explicit_metric_dimensions"
    });
  }

  return null;
}

/**
 * Extract exact bent-tube metadata from DWF Content Entity properties.
 *
 * OD/wall come from the explicit source designation in Description, not the
 * rounded OD/SN display properties. Imperial fractions are converted exactly
 * by 25.4 mm/inch.
 */
export function extractBentTubeMetadataFromContentXml(
  xml,
  {source_file="unknown.dwfx"}={}
){
  const entities=parseEntityRecords(xml);
  const candidates=[];

  for(const entity of entities){
    const partNumber=firstProperty(
      entity,
      "Part Number",
      "Design Tracking Properties"
    );
    const description=firstProperty(
      entity,
      "Description",
      "Design Tracking Properties"
    );
    if(!partNumber||!/^\d+$/.test(String(partNumber).trim())) continue;
    if(!/^Bended tube\b/i.test(String(description??""))) continue;

    const dimensions=parseTubeDescription(description);
    if(!dimensions) continue;

    const lengthValue=firstProperty(entity,"Length","User Defined Properties");
    if(lengthValue==null) continue;
    const developed=decimal(lengthValue,"Length");
    if(!(developed>0)) continue;

    const revision=
      firstProperty(entity,"Revision Number","Summary Information")??null;
    const material=
      firstProperty(entity,"Material","Physical")??
      null;

    const part=String(partNumber).trim();
    const sourceRef="dwfx:"+String(source_file)+"#entity:"+String(entity.id??part);

    candidates.push(Object.freeze({
      id:String(entity.id??part),
      entity_ref:entity.id??null,
      part_number:part,
      revision,
      quantity_in_assembly:null,
      material,
      metadata:Object.freeze({
        outer_diameter:exact(
          dimensions.outer_diameter_mm,
          sourceRef,
          "mm",
          dimensions.diameter_method
        ),
        wall_thickness:exact(
          dimensions.wall_thickness_mm,
          sourceRef,
          "mm",
          "explicit_source_description"
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
        description,
        dimension_notation:dimensions.source_notation,
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
        duplicates.map((part)=>"duplicate bent-tube entity for part "+part)
      )
    });
  }

  return Object.freeze({
    status:candidates.length?"exact":"blocked",
    production_ready:false,
    source:Object.freeze({
      format:"DWFx",
      file:String(source_file),
      recognition:"dwfx_content_entity_properties"
    }),
    recognition_status:Object.freeze({
      metadata_only:true,
      production_ready:false,
      bend_sequence:"not_extracted",
      note:"Tube metadata extracted directly from DWF Content Entity properties."
    }),
    tubes:Object.freeze(candidates),
    issues:Object.freeze(
      candidates.length?[]:["No exact bent-tube metadata entities were found."]
    )
  });
}

export { parseEntityRecords, parseTubeDescription };
