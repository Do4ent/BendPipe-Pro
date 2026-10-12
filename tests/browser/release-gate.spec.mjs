import fs from "node:fs/promises";
import path from "node:path";
import {test,expect} from "@playwright/test";

const html="/TubeBender_CAD_VC207R7_M1_Standalone.html";
const fixture=path.resolve("tests/reference_parts/cases/dwfx-80004806/source.dwfx");

async function waitForApplication(page){
  await page.goto(html,{waitUntil:"commit",timeout:15000});
  await page.waitForFunction(
    ()=>Boolean(document.readyState==='complete'&&window.TubeBenderStartupStatus?.booted&&window.TubeBenderEngineering?.getState),
    null,
    {timeout:120000}
  );
}

async function importFileThroughProjectDialog(page,filePath){
  await page.locator("#projectOpenQuick").evaluate(button=>button.click());
  await page.locator("#poFileInput").setInputFiles(filePath);
  const openButton=page.locator("#poOpenBtn");
  await expect(openButton).toBeEnabled({timeout:120000});
  await expect(openButton).toContainText("9",{timeout:10000});
  await openButton.click();
}

async function activatePart(page,partNumber){
  return page.evaluate(part=>{
    const engineering=window.TubeBenderEngineering;
    const project=engineering.activeProject();
    const tube=project.tubes.find(candidate=>candidate.partNumber===part);
    if(!tube)throw new Error("Recognized tube not found: "+part+"; records="+JSON.stringify(project.tubes.map(t=>({name:t.name,partNumber:t.partNumber,keys:Object.keys(t),source:t.importEvidence?.source}))));
    activateProjectTube(project.id,tube.id);
    const stableEvidence={
      source:structuredClone(tube.importEvidence?.source),
      canonicalGeometry:structuredClone(tube.importEvidence?.canonicalGeometry),
      canonicalPromotion:structuredClone(tube.importEvidence?.canonicalPromotion),
      coordinateMapping:structuredClone(tube.importEvidence?.coordinateMapping),
      machineCompensationApplied:tube.importEvidence?.machineCompensationApplied,
      validationIssues:structuredClone(tube.importValidation?.issues??[])
    };
    return {
      projectId:project.id,
      tubeId:tube.id,
      stableEvidence,
      productionBlocked:tube.importValidation?.productionBlocked===true,
      canonicalGeometryPreserved:tube.importValidation?.canonicalGeometryPreserved===true
    };
  },partNumber);
}

test("[RELEASE-GATE] DWFx import, recognition, edit, reopen, and export",async({page})=>{
  test.setTimeout(300000);
  const unexpectedPrompts=[];
  let downloadCount=0;
  page.on("download",()=>{downloadCount+=1;});
  page.on("dialog",async dialog=>{
    if(dialog.type()==="prompt"){
      unexpectedPrompts.push(dialog.message());
      await dialog.dismiss();
      return;
    }
    await dialog.accept();
  });

  await waitForApplication(page);
  await importFileThroughProjectDialog(page,fixture);

  const recognition=await page.waitForFunction(()=>{
    const engineering=window.TubeBenderEngineering;
    const project=engineering?.activeProject?.();
    if(project?.tubes?.length!==9)return null;
    return {
      tubeCount:project.tubes.length,
      parts:project.tubes.map(tube=>tube.partNumber),
      allProductionBlocked:project.tubes.every(
        tube=>tube.importValidation?.productionBlocked===true
      ),
      allHaveSourceEvidence:project.tubes.every(
        tube=>tube.importEvidence?.source&&typeof tube.importEvidence.source==="object"
      ),
      canonicalSeparated:project.tubes.every(tube=>
        tube.importEvidence?.canonicalPromotion?.status==="canonical_candidate"&&
        tube.importEvidence?.canonicalPromotion?.canonical_ready===true&&
        tube.importEvidence?.canonicalPromotion?.production_ready===false&&
        tube.importEvidence?.machineCompensationApplied===false
      )
    };
  },null,{timeout:30000});
  const recognitionValue=await recognition.jsonValue();
  expect(recognitionValue.tubeCount).toBe(9);
  expect(recognitionValue.allProductionBlocked).toBe(true);
  expect(recognitionValue.allHaveSourceEvidence).toBe(true);
  expect(recognitionValue.canonicalSeparated).toBe(true);
  expect(recognitionValue.parts).toEqual(expect.arrayContaining([
    "10100407","10102202","10102201","10102217","10102473",
    "10139798","10134724","10141451","10141455"
  ]));

  const selected=await activatePart(page,"10102202");
  expect(selected.productionBlocked).toBe(true);
  expect(selected.canonicalGeometryPreserved).toBe(true);

  const editTarget=await page.evaluate(()=>{
    const rows=window.TubeBenderEngineering.getState().rows;
    const rowIndex=rows.findLastIndex(row=>row?.type==="LINE");
    if(rowIndex<0)throw new Error("Imported tube has no editable LINE row");
    return {rowIndex,before:Number(rows[rowIndex].L)};
  });
  await page.evaluate(
    rowIndex=>openRowParamEditor(rowIndex,"lineLength"),
    editTarget.rowIndex
  );
  const lengthInput=page.locator(
    `.row-param-input[data-row-index="${editTarget.rowIndex}"][data-param="lineLength"]`
  );
  const editedLength=editTarget.before+1;
  await lengthInput.fill(String(editedLength));
  await lengthInput.press("Enter");
  await expect.poll(
    ()=>page.evaluate(index=>Number(
      window.TubeBenderEngineering.getState().rows[index]?.L
    ),editTarget.rowIndex)
  ).toBe(editedLength);
  expect((await activatePart(page,"10102202")).stableEvidence)
    .toEqual(selected.stableEvidence);

  await page.locator("#tbActionSave").evaluate(button=>button.click());
  await page.reload({waitUntil:"commit",timeout:15000});
  await page.waitForFunction(
    ()=>Boolean(document.readyState==='complete'&&window.TubeBenderStartupStatus?.booted&&window.TubeBenderEngineering?.getState),
    null,
    {timeout:120000}
  );
  const reopened=await activatePart(page,"10102202");
  expect(reopened.projectId).toBe(selected.projectId);
  expect(reopened.tubeId).toBe(selected.tubeId);
  expect(reopened.stableEvidence).toEqual(selected.stableEvidence);
  expect(reopened.productionBlocked).toBe(true);
  expect(await page.evaluate(
    index=>Number(window.TubeBenderEngineering.getState().rows[index]?.L),
    editTarget.rowIndex
  )).toBe(editedLength);

  await page.locator('[data-action="projectExport"]').evaluate(button=>button.click());
  await page.locator("#ptIoName").fill("DWFx release gate");
  const downloadPromise=page.waitForEvent("download");
  await page.locator("#ptIoOk").click();
  const download=await downloadPromise;
  const downloadedPath=await download.path();
  expect(downloadedPath).toBeTruthy();
  const exported=JSON.parse(await fs.readFile(downloadedPath,"utf8"));
  const exportedTube=exported.project.tubes.find(tube=>tube.partNumber==="10102202");
  expect(exported.type).toBe("TubeBenderProject");
  expect(exported.project.tubes).toHaveLength(9);
  expect(Number(exportedTube.rows[editTarget.rowIndex].L)).toBe(editedLength);
  expect(exportedTube.importValidation.productionBlocked).toBe(true);

  const projectIdBeforeJsonReopen=reopened.projectId;
  await importFileThroughProjectDialog(page,downloadedPath);
  await page.waitForFunction(previousProjectId=>
    window.TubeBenderEngineering.activeProject()?.id!==previousProjectId,
    projectIdBeforeJsonReopen,
    {timeout:30000}
  );
  const jsonReopened=await activatePart(page,"10102202");
  expect(jsonReopened.stableEvidence).toEqual(selected.stableEvidence);
  expect(jsonReopened.productionBlocked).toBe(true);
  expect(await page.evaluate(
    index=>Number(window.TubeBenderEngineering.getState().rows[index]?.L),
    editTarget.rowIndex
  )).toBe(editedLength);

  const productionDecision=await page.evaluate(()=>{
    const engineering=window.TubeBenderEngineering;
    const tube=engineering.activeTube();
    return {
      decision:engineering.productionReleaseDecision(tube,"json"),
      exportResult:engineering.exportManufacturing("json")
    };
  });
  expect(productionDecision.decision.allowed).toBe(false);
  expect(productionDecision.decision.blockers.length).toBeGreaterThan(0);
  expect(productionDecision.exportResult).toBe(false);
  await page.waitForTimeout(500);
  expect(downloadCount).toBe(1);
  expect(unexpectedPrompts).toEqual([]);
});
