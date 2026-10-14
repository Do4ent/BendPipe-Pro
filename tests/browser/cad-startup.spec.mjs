import {test,expect} from "@playwright/test";

test("[CAD-STARTUP] parsing delay shows loading state instead of the base interface",async({page})=>{
  await page.addInitScript(()=>{
    window.__startupKeyProbe=0;
    window.addEventListener("keydown",()=>{window.__startupKeyProbe++;});
  });
  let releaseModule;
  const pendingModule=new Promise(resolve=>{releaseModule=resolve;});
  await page.route("**/startup-dom-blocker.mjs",async route=>{
    await pendingModule;
    await route.fulfill({status:200,contentType:"text/javascript",body:"export {};"});
  });
  await page.route("**/BendPipe_Pro_CAD_Workspace.html",async route=>{
    const response=await route.fetch();
    const html=(await response.text()).replace("</head>",'<script type="module" src="/startup-dom-blocker.mjs"></script></head>');
    await route.fulfill({response,body:html});
  });
  try{
    await page.goto("/BendPipe_Pro_CAD_Workspace.html",{waitUntil:"commit"});
    await expect(page.locator("#cadStartupStatus")).toBeVisible();
    await expect(page.locator("#app")).toHaveCount(1);
    await expect(page.locator("#app")).toBeHidden();
    await expect(page.locator("html")).toHaveAttribute("data-cad-boot","pending");
    await page.keyboard.press("Enter");
    expect(await page.evaluate(()=>window.__startupKeyProbe)).toBe(0);
    releaseModule();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("#cadRibbon")).toBeVisible();
    await expect(page.locator("#app")).toBeVisible();
    await expect(page.locator("#cadStartupStatus")).toHaveCount(0);
    await page.keyboard.press("Shift");
    expect(await page.evaluate(()=>window.__startupKeyProbe)).toBe(1);
  }finally{releaseModule();}
});

test("[CAD-STARTUP] failed mount cannot repeat hidden commands and preserves browser reload",async({page})=>{
  await page.route("**/BendPipe_Pro_CAD_Workspace.html",async route=>{
    const response=await route.fetch();
    const html=(await response.text()).replace(/(<script data-bendpipe-workspace="cad">)([\s\S]*?)(<\/script>)/,
      (_,open,code,close)=>open+code.replace("const api=()=>window.TubeBenderEngineering;","const api=()=>null;")+close);
    await route.fulfill({response,body:html});
  });
  await page.goto("/BendPipe_Pro_CAD_Workspace.html",{waitUntil:"domcontentloaded"});
  await expect(page.locator("html")).toHaveAttribute("data-cad-boot","error");
  await expect(page.locator("#cadStartupStatus")).toContainText("Не удалось открыть CAD Workspace");
  await expect(page.locator("#app")).toBeHidden();
  await page.waitForFunction(()=>Boolean(window.TubeBenderRepeatCommands));
  await page.evaluate(()=>{
    window.__startupRepeatProbe=0;
    window.TubeBenderRepeatCommands.register({id:"startup-error-probe",label:"Startup repeat probe",run:()=>{window.__startupRepeatProbe++;return true;}});
    window.TubeBenderRepeatCommands.record("startup-error-probe","Startup repeat probe");
  });
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  expect(await page.evaluate(()=>window.__startupRepeatProbe)).toBe(0);
  for(const options of [{key:"F5"},{key:"r",ctrlKey:true},{key:"R",metaKey:true}]){
    expect(await page.evaluate(options=>{
      const event=new KeyboardEvent("keydown",{...options,cancelable:true,bubbles:true});
      window.dispatchEvent(event);return event.defaultPrevented;
    },options)).toBe(false);
  }
});

test("[CAD-STARTUP] initial load and reload show CAD before optional resources finish",async({page})=>{
  test.setTimeout(60000);
  let releaseResource;
  let pendingResource;
  const resetBlocker=()=>{pendingResource=new Promise(resolve=>{releaseResource=resolve;});};
  resetBlocker();
  await page.route("**/startup-load-blocker.png",async route=>{
    await pendingResource;
    await route.fulfill({status:200,contentType:"image/png",body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6k0AAAAASUVORK5CYII=","base64")});
  });
  await page.route("**/BendPipe_Pro_CAD_Workspace.html",async route=>{
    const response=await route.fetch();
    const html=(await response.text()).replace(/<\/body>\s*<\/html>\s*$/i,'<img hidden src="/startup-load-blocker.png" alt=""></body></html>');
    await route.fulfill({response,body:html});
  });
  try{
    await page.goto("/BendPipe_Pro_CAD_Workspace.html",{waitUntil:"domcontentloaded"});
    expect(await page.evaluate(()=>document.readyState)).toBe("interactive");
    await expect(page.locator("#cadRibbon")).toBeVisible();
    await expect(page.locator("#cadReferenceStatus")).toBeVisible();
    await expect(page.locator("#cadRestore")).toHaveCount(0);
    await page.locator('[data-cad-command="measure"]').click({button:"right"});
    await page.locator('[data-display-mode="compact-icons"]').click();
    releaseResource();
    await page.waitForLoadState("load");
    await expect(page.locator("#cadRibbon")).toHaveCount(1);
    await expect(page.locator("#cadRibbon")).toBeVisible();
    resetBlocker();
    await page.reload({waitUntil:"domcontentloaded"});
    expect(await page.evaluate(()=>document.readyState)).toBe("interactive");
    await expect(page.locator("#cadRibbon")).toBeVisible();
    await expect(page.locator("#cadCommands")).toHaveAttribute("data-cad-display","compact-icons");
    await expect(page.locator("#cadPropertySlot #tbPropertiesPanel")).toHaveCount(1);
    releaseResource();
    await page.waitForLoadState("load");
    await expect(page.locator("#cadRibbon")).toHaveCount(1);
    await expect(page.locator("#cadRibbon")).toBeVisible();
  }finally{releaseResource();}
});
