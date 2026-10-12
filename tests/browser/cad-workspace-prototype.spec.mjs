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
  await expect(page.locator("#cadPropertySlot #tbPropertiesPanel")).toHaveCount(1);
  await expect(page.locator("#cadRibbon")).toBeVisible();
  await page.locator('[data-cad-stage="source"]').click();
  await expect(page.locator('[data-inspector-tab="source"]')).toHaveAttribute("aria-selected","true");
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
  expect(await page.locator("#tbPropertiesPanel").evaluate(node=>node.parentElement===document.body)).toBe(true);
  expect(await page.locator("#tbPropertiesToggle").evaluate(node=>node.parentElement===document.body)).toBe(true);
  await page.locator("#cadRestore").click();
  await expect(page.locator("#cadRibbon")).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-cad-command="properties"]').click();
  await expect(page.locator('[data-inspector-tab="properties"]')).toHaveAttribute("aria-selected","true");
  await expect.poll(async()=>{
    const rect=await page.locator("#tbPropertiesPanel").boundingBox();
    return Boolean(rect&&rect.width>0&&rect.x>=0&&rect.x+rect.width<=390);
  }).toBe(true);
  await page.locator('.tb-bottom-tab[data-tab="3d"]').click();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:"reports/browser/cad-workspace-mobile.png",fullPage:true});
  expect(errors).toEqual([]);
});

test("[CAD-WORKSPACE] toolbar context menu persists per-panel icon preferences",async({page})=>{
  test.skip(!fs.existsSync(prototype),"Build the opt-in CAD workspace prototype first");
  test.setTimeout(90000);
  await page.goto("/BendPipe_Pro_CAD_Workspace_Prototype.html",{waitUntil:"load"});
  await page.waitForFunction(()=>Boolean(window.TubeBenderCadWorkspace),null,{timeout:60000});
  const command=page.locator('[data-cad-command="measure"]');
  await command.click({button:"right"});
  await expect(page.locator("#cadPanelMenu")).toBeVisible();
  await page.locator('[data-display-mode="icons"]').click();
  await expect(command.locator(".cad-command-label")).toBeHidden();
  await expect(command).toHaveAttribute("title","Измерить");
  await expect(command).toHaveAttribute("aria-label","Измерить");
  await page.locator('[data-cad-stage="machine"]').click();
  await expect(page.locator('[data-cad-command="equipment"] .cad-command-label')).toBeHidden();
  await page.reload({waitUntil:"load"});
  await page.waitForFunction(()=>Boolean(window.TubeBenderCadWorkspace));
  await expect(page.locator("#cadCommands")).toHaveAttribute("data-cad-display","icons");
  await expect(page.locator(".tb-head-actions")).toHaveAttribute("data-cad-display","icons");
  await page.locator("#tbActionSave").click({button:"right"});
  await page.locator('[data-display-mode="labels"]').click();
  await expect(page.locator("#tbActionSave .txt")).toBeVisible();
  await expect(page.locator("#cadCommands")).toHaveAttribute("data-cad-display","icons");
  await page.locator('[data-cad-command="measure"]').focus();
  await page.waitForFunction(()=>Boolean(window.TubeBenderRepeatCommands));
  await page.evaluate(()=>{
    window.__cadRepeatProbe=0;
    window.TubeBenderRepeatCommands.register({id:"cad-menu-probe",label:"Menu repeat probe",run:()=>{window.__cadRepeatProbe++;return true;}});
    window.TubeBenderRepeatCommands.record("cad-menu-probe","Menu repeat probe");
  });
  await page.keyboard.press("Shift+F10");
  await expect(page.locator("#cadPanelMenu")).toBeVisible();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.locator("#cadCommands")).toHaveAttribute("data-cad-display","labels");
  await expect(page.locator('[data-cad-command="measure"] .cad-command-label')).toBeVisible();
  expect(await page.evaluate(()=>window.__cadRepeatProbe)).toBe(0);
  await page.locator('[data-cad-command="measure"]').click({button:"right"});
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await expect(page.locator("#cadCommands")).toHaveAttribute("data-cad-display","icons");
  expect(await page.evaluate(()=>window.__cadRepeatProbe)).toBe(0);
  await page.locator('[data-cad-command="measure"]').click({button:"right"});
  await page.keyboard.press("Escape");
  await expect(page.locator("#cadPanelMenu")).toBeHidden();
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-cad-command="measure"]').click({button:"right"});
  const rect=await page.locator("#cadPanelMenu").boundingBox();
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.x+rect.width).toBeLessThanOrEqual(390);
});

test("[CAD-WORKSPACE] native properties reveal the mobile inspector",async({page})=>{
  test.skip(!fs.existsSync(prototype),"Build the opt-in CAD workspace prototype first");
  test.setTimeout(60000);
  await page.setViewportSize({width:390,height:844});
  await page.goto("/BendPipe_Pro_CAD_Workspace_Prototype.html",{waitUntil:"load"});
  await page.waitForFunction(()=>Boolean(window.TubeBenderCadWorkspace&&window.TubeBenderProperties));
  await page.locator('[data-cad-stage="source"]').click();
  await page.locator('.tb-bottom-tab[data-tab="3d"]').click();
  await page.evaluate(()=>window.TubeBenderProperties.open());
  await expect(page.locator('[data-inspector-tab="properties"]')).toHaveAttribute("aria-selected","true");
  await expect.poll(async()=>{
    const rect=await page.evaluate(()=>{
      const rect=document.getElementById("tbPropertiesPanel").getBoundingClientRect();
      return {x:rect.x,width:rect.width};
    });
    return Boolean(rect&&rect.width>0&&rect.x>=0&&rect.x+rect.width<=390);
  }).toBe(true);
});
