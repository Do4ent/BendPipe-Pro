import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDwfxGraphicsLinkIndex,
  parseDwfxContentObjects,
  parseDwfxInstances,
  parseDwfxReferenceNodes,
  resolvePartGraphicsLinks
} from "../../src/import/dwfx/content-linkage.mjs";

const PARTS = [
  ["10160780","C++tg4ZCQ0+2QU4Qi13JRg","Cu+tg4ZCQ0+2QU4Qi13JRg","TD4C6rYJ0Ui8vPcd0hGi6w","DO+tg4ZCQ0+2QU4Qi13JRg",121136,121137],
  ["10157546","e++tg4ZCQ0+2QU4Qi13JRg","eu+tg4ZCQ0+2QU4Qi13JRg","gT4C6rYJ0Ui8vPcd0hGi6w","fO+tg4ZCQ0+2QU4Qi13JRg",121190,121191],
  ["10157555","hu+tg4ZCQ0+2QU4Qi13JRg","he+tg4ZCQ0+2QU4Qi13JRg","hj4C6rYJ0Ui8vPcd0hGi6w","h++tg4ZCQ0+2QU4Qi13JRg",121196,121197],
  ["10157683","ie+tg4ZCQ0+2QU4Qi13JRg","iO+tg4ZCQ0+2QU4Qi13JRg","hz4C6rYJ0Ui8vPcd0hGi6w","iu+tg4ZCQ0+2QU4Qi13JRg",121198,121199],
  ["10157549","FPCtg4ZCQ0+2QU4Qi13JRg","E_Ctg4ZCQ0+2QU4Qi13JRg","xT4C6rYJ0Ui8vPcd0hGi6w","FfCtg4ZCQ0+2QU4Qi13JRg",121270,121271],
  ["10157552","F_Ctg4ZCQ0+2QU4Qi13JRg","FvCtg4ZCQ0+2QU4Qi13JRg","xj4C6rYJ0Ui8vPcd0hGi6w","GPCtg4ZCQ0+2QU4Qi13JRg",121272,121273]
];

const contentXml = `<dwf:Content xmlns:dwf="urn:dwf">${PARTS.map(
  ([part,objectId,entityRef]) =>
    `<dwf:Object id="${objectId}" label="${part}/B - Bended tube, Copper &quot;source&quot;:1" entityRef="${entityRef}"/>`
).join("")}</dwf:Content>`;

const presentationXml = `<dwf:Presentation xmlns:dwf="urn:dwf">${PARTS.map(
  ([part,objectId,,referenceNodeId]) =>
    `<ReferenceNode contentElementRefs="${objectId}" id="${referenceNodeId}" label="${part}:1"/>`
).join("")}</dwf:Presentation>`;

const definitionXml = `<dwf:Instances xmlns:dwf="urn:dwf">${PARTS.map(
  ([,objectId,,,instanceId,node,variation]) =>
    `<dwf:Instance id="${instanceId}" renderableRef="${objectId}" node="${node}" geometricVariation="${variation}"/>`
).join("")}</dwf:Instances>`;

test("A20: DWFx XML parsers preserve exact source identifiers and numeric graphics nodes",()=>{
  const objects=parseDwfxContentObjects(contentXml);
  const refs=parseDwfxReferenceNodes(presentationXml);
  const instances=parseDwfxInstances(definitionXml);

  assert.equal(objects.length,6);
  assert.equal(refs.length,6);
  assert.equal(instances.length,6);
  assert.match(objects[0].label,/Copper "source"/);
  assert.equal(instances[0].node,121136);
  assert.equal(instances[0].geometric_variation,121137);
});

test("A20: six golden tube parts resolve to exact W3D graphics-node IDs without ordinal matching",()=>{
  const index=buildDwfxGraphicsLinkIndex({
    contentXml,
    presentationXml,
    contentDefinitionXml:definitionXml
  });
  const resolved=resolvePartGraphicsLinks(index,PARTS.map(([part])=>part));

  assert.deepEqual(
    resolved.map((item)=>[
      item.part_number,item.status,item.graphics_node,item.geometric_variation
    ]),
    [
      ["10160780","exact",121136,121137],
      ["10157546","exact",121190,121191],
      ["10157555","exact",121196,121197],
      ["10157683","exact",121198,121199],
      ["10157549","exact",121270,121271],
      ["10157552","exact",121272,121273]
    ]
  );
  assert.equal(resolved.every((item)=>item.production_ready===false),true);
});

test("A20: duplicate Instance references remain ambiguous instead of selecting the first",()=>{
  const duplicateDefinition=definitionXml.replace(
    "</dwf:Instances>",
    '<dwf:Instance id="duplicate" renderableRef="C++tg4ZCQ0+2QU4Qi13JRg" node="7"/></dwf:Instances>'
  );
  const index=buildDwfxGraphicsLinkIndex({
    contentXml,
    presentationXml,
    contentDefinitionXml:duplicateDefinition
  });
  const [result]=resolvePartGraphicsLinks(index,["10160780"]);

  assert.equal(result.status,"unresolved");
  assert.equal(result.graphics_node,null);
  assert.deepEqual(result.link.issues,["INSTANCE_AMBIGUOUS"]);
});

test("A20: duplicate part-labelled objects remain ambiguous at part resolution",()=>{
  const duplicateContent=contentXml.replace(
    "</dwf:Content>",
    '<dwf:Object id="duplicate-object" label="10160780/ duplicate" entityRef="duplicate-entity"/></dwf:Content>'
  );
  const index=buildDwfxGraphicsLinkIndex({
    contentXml:duplicateContent,
    presentationXml,
    contentDefinitionXml:definitionXml
  });
  const [result]=resolvePartGraphicsLinks(index,["10160780"]);

  assert.equal(result.status,"ambiguous");
  assert.equal(result.match_count,2);
  assert.equal(result.link,null);
});

test("A20: malformed graphics-node numbers fail loudly",()=>{
  assert.throws(
    ()=>parseDwfxInstances('<Instance id="x" renderableRef="r" node="12.5"/>'),
    /non-negative integer/
  );
});


test("A20: Object Part Number links 10102473 even when the Object label starts with route instance 10104935",()=>{
  const sourceContent=`<dwf:Content xmlns:dwf="urn:dwf">
    <dwf:Entity id="empty-entity"/>
    <dwf:Object id="obj-10102473" label="10104935/A - Tube, Copper, 3/8&quot; x 0,76mm:1" entityRef="empty-entity">
      <dwf:Property name="Part Number" value="10102473" category="Design Tracking Properties"/>
      <dwf:Property name="Description" value="Tube, Copper 3_8inch x 0,76" category="Design Tracking Properties"/>
    </dwf:Object>
  </dwf:Content>`;
  const sourcePresentation=
    '<Presentation><ReferenceNode id="ref-10102473" contentElementRefs="obj-10102473"/></Presentation>';
  const sourceDefinition=
    '<Instances><Instance id="inst-10102473" renderableRef="obj-10102473" node="501" geometricVariation="502"/></Instances>';

  const index=buildDwfxGraphicsLinkIndex({
    contentXml:sourceContent,
    presentationXml:sourcePresentation,
    contentDefinitionXml:sourceDefinition
  });
  const [resolved]=resolvePartGraphicsLinks(index,["10102473"]);

  assert.equal(index.links[0].object_label,'10104935/A - Tube, Copper, 3/8" x 0,76mm:1');
  assert.equal(index.links[0].part_number,"10102473");
  assert.equal(resolved.status,"exact");
  assert.equal(resolved.matching_method,"object_property");
  assert.equal(resolved.graphics_node,501);
  assert.equal(resolved.geometric_variation,502);

  const [routeNumber]=resolvePartGraphicsLinks(index,["10104935"]);
  assert.equal(routeNumber.status,"unresolved");
  assert.equal(routeNumber.match_count,0);
});

test("A20: label fallback remains available only when Object has no explicit Part Number property",()=>{
  const sourceContent=
    '<Content><Object id="obj-fallback" label="10160780/B - Bended tube" entityRef="ent"/></Content>';
  const sourcePresentation=
    '<Presentation><ReferenceNode id="ref-fallback" contentElementRefs="obj-fallback"/></Presentation>';
  const sourceDefinition=
    '<Instances><Instance id="inst-fallback" renderableRef="obj-fallback" node="601" geometricVariation="602"/></Instances>';
  const index=buildDwfxGraphicsLinkIndex({
    contentXml:sourceContent,
    presentationXml:sourcePresentation,
    contentDefinitionXml:sourceDefinition
  });
  const [resolved]=resolvePartGraphicsLinks(index,["10160780"]);

  assert.equal(resolved.status,"exact");
  assert.equal(resolved.matching_method,"object_label_fallback");
  assert.equal(resolved.graphics_node,601);
});

test("A20: real 10134724 label fallback resolves exact graphics anchors",()=>{
  const sourceContent='<Content><Object id="PyRYbsi_5UmTo_7y68W23g" label="10134724/A - Tube, Copper, 3/8&quot; x 0,76mm:1" entityRef="PiRYbsi_5UmTo_7y68W23g"><Property name="Description" value="Tube, Copper 3_8inch x 0,76" category="Design Tracking Properties"/></Object></Content>';
  const sourcePresentation='<Presentation><ReferenceNode id="eJZMvqYtMUie0F_3wYgEvQ" contentElementRefs="PyRYbsi_5UmTo_7y68W23g" label="10134724/A - Tube, Copper, 3/8&quot; x 0,76mm:1"/></Presentation>';
  const sourceDefinition='<Instances><Instance id="QCRYbsi_5UmTo_7y68W23g" renderableRef="PyRYbsi_5UmTo_7y68W23g" node="119959" geometricVariation="119960"/></Instances>';
  const index=buildDwfxGraphicsLinkIndex({
    contentXml:sourceContent,
    presentationXml:sourcePresentation,
    contentDefinitionXml:sourceDefinition
  });
  const [resolved]=resolvePartGraphicsLinks(index,["10134724"]);
  assert.equal(resolved.status,"exact");
  assert.equal(resolved.matching_method,"object_label_fallback");
  assert.equal(resolved.graphics_node,119959);
  assert.equal(resolved.geometric_variation,119960);
});


test("A20: real 10141455 label fallback resolves exact graphics anchors",()=>{
  const sourceContent='<Content><Object id="3CRYbsi_5UmTo_7y68W23g" label="10141455/ - Tube, Copper, on length, 1/2&quot; x 0,89mm:1" entityRef="2yRYbsi_5UmTo_7y68W23g"><Property name="Description" value="Tube, Copper, 1_2inch x 0,89mm" category="Design Tracking Properties"/></Object></Content>';
  const sourcePresentation='<Presentation><ReferenceNode id="uJZMvqYtMUie0F_3wYgEvQ" contentElementRefs="3CRYbsi_5UmTo_7y68W23g" label="10141455/ - Tube, Copper, on length, 1/2&quot; x 0,89mm:1"/></Presentation>';
  const sourceDefinition='<Instances><Instance id="3SRYbsi_5UmTo_7y68W23g" renderableRef="3CRYbsi_5UmTo_7y68W23g" node="120041" geometricVariation="120042"/></Instances>';
  const index=buildDwfxGraphicsLinkIndex({
    contentXml:sourceContent,
    presentationXml:sourcePresentation,
    contentDefinitionXml:sourceDefinition
  });
  const [resolved]=resolvePartGraphicsLinks(index,["10141455"]);
  assert.equal(resolved.status,"exact");
  assert.equal(resolved.matching_method,"object_label_fallback");
  assert.equal(resolved.graphics_node,120041);
  assert.equal(resolved.geometric_variation,120042);
});
