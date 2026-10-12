import fs from "node:fs";
import path from "node:path";
import {test,expect} from "@playwright/test";

const prototype=path.resolve("dist/BendPipe_Pro_CAD_Workspace_Prototype.html");
test("[CAD-WORKSPACE] real import, context evidence, command routing and layout",async({page})=>{
  test.skip(!fs.existsSync(prototype),"Build the opt-in CAD workspace prototype first");
  test.setTimeout(180000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error)));
  const response=await page.goto("/BendPipe_Pro_CAD_Workspace_Prototype.html",{waitUntil:"load"});
  expect(response.status()).toBe(200);
  await page.waitForFunction(()=>Boolean(window.TubeBenderCadWorkspace),null,{timeout:120000});
  await expect(page.locator("#cadRibbon")).toBeVisible();
  await page.locator('[data-cad-stage="source"]').click();
  await page.locator('[data-cad-command="import"]').click();
  await expect(page.locator("#projectOpenDialog")).toBeVisible();
  await page.locator("#poFileInput").setInputFiles(
    path.resolve("tests/reference_parts/cases/dwfx-80004806/source.dwfx")
  );
  await expect(page.locator("#poOpenBtn")).toBeEnabled({timeout:120000});
  await page.locator("#poOpenBtn").click();
  await expect.poll(()=>page.evaluate(()=>window.TubeBenderEngineering.activeProject().tubes.length)).toBe(9);
  await page.locator('[data-cad-stage="geometry"]').click();
  await page.locator('[data-cad-command="properties"]').click();
  await expect(page.locator("#tbPropertiesPanel")).toHaveClass(/open/);
  await page.evaluate(()=>window.TubeBenderProperties.close());
  await page.locator("#cadTools").click();
  await page.locator("#cadToolDrawer #tbPropertiesToggle").click();
  await expect(page.locator("#tbPropertiesPanel")).toHaveClass(/open/);
  await expect(page.locator("#cadToolDrawer")).toBeHidden();
  await page.evaluate(()=>window.TubeBenderProperties.close());
  await page.locator('[data-cad-stage="release"]').click();
  await expect(page.locator("#cadInspector")).toContainText("Выпуск заблокирован",{timeout:10000});
  expect(await page.evaluate(()=>window.TubeBenderEngineering.activeProject().tubes.every(
    tube=>tube.importValidation.productionBlocked===true&&tube.importEvidence.machineCompensationApplied===false
  ))).toBe(true);
  await page.locator('[data-cad-stage="geometry"]').click();
  await page.screenshot({path:"reports/browser/cad-workspace-desktop.png",fullPage:true});
  await page.locator("#cadRestore").click();
  await expect(page.locator("#cadRibbon")).toBeHidden();
  expect(await page.locator("#tbPropertiesToggle").evaluate(node=>node.parentElement===document.body)).toBe(true);
  await page.locator("#cadRestore").click();
  await expect(page.locator("#cadRibbon")).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:"reports/browser/cad-workspace-mobile.png",fullPage:true});
  expect(errors).toEqual([]);
});
