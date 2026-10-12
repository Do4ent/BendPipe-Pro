import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test, expect, chromium } from "@playwright/test";

const baseURL = "http://127.0.0.1:4178";
const classicURL = baseURL + "/TubeBender_CAD_VC207R7_M1_Standalone.html";
const workspaceURL = baseURL + "/BendPipe_Pro_CAD_Workspace.html";
const softwareGL = ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"];

test("[WEBGL2-001] actual release CAD Workspace initializes a live WebGL2 3D canvas", async ({ page }, testInfo) => {
  test.setTimeout(150000);
  const errors = [];
  page.on("pageerror", err => errors.push(String(err)));
  const response = await page.goto(workspaceURL, { waitUntil: "commit", timeout: 20000 });
  expect(response?.status()).toBe(200);
  await page.waitForFunction(
    () => document.readyState === "complete" && window.TubeBenderStartupStatus?.booted === true,
    null, { timeout: 120000 }
  );
  await expect(page.locator("#threeCanvas")).toBeVisible();
  const observation = await page.evaluate(async () => {
    const canvas = document.querySelector("#threeCanvas");
    const gl = canvas?.getContext("webgl2");
    // Verify working rendering, not only a WebGL2 type declaration.
    const probe = document.createElement("canvas");
    probe.width = 4; probe.height = 4;
    const pg = probe.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false });
    let pixel = null;
    if (pg) {
      pg.viewport(0, 0, 4, 4);
      pg.clearColor(1, 0, 0, 1);
      pg.clear(pg.COLOR_BUFFER_BIT);
      const bytes = new Uint8Array(4);
      pg.readPixels(2, 2, 1, 1, pg.RGBA, pg.UNSIGNED_BYTE, bytes);
      pixel = [...bytes];
    }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      webgl2Canvas: gl instanceof WebGL2RenderingContext,
      workingContext: Boolean(pg) && !pg.isContextLost(),
      canvasWidth: gl?.drawingBufferWidth ?? 0,
      canvasHeight: gl?.drawingBufferHeight ?? 0,
      rendererNotLost: Boolean(gl) && !gl.isContextLost(),
      pixel,
      text: document.querySelector("#viewer")?.textContent?.slice(0,80) ?? ""
    };
  });
  const actualRenderer = await page.evaluate(() => {
    try {
      return {
        threeLoaded: Boolean(window.THREE?.WebGLRenderer),
        realRenderer: typeof renderer !== "undefined" && renderer?.isWebGLRenderer === true,
        matchingContext: typeof renderer !== "undefined" &&
          renderer?.getContext?.() === document.querySelector("#threeCanvas")?.getContext("webgl2"),
        meshGroupCount: typeof pipeGroup !== "undefined" ? pipeGroup?.children?.length ?? 0 : 0,
        sceneChildrenCount: typeof scene !== "undefined" ? scene?.children?.length ?? 0 : 0,
        drawCalls: typeof renderer !== "undefined" ? renderer?.info?.render?.calls ?? 0 : 0
      };
    } catch (error) { return { error: String(error) }; }
  });
  console.log("WEBGL2-001 actual renderer:", JSON.stringify(actualRenderer));
  expect(actualRenderer.threeLoaded).toBe(true);
  expect(actualRenderer.realRenderer).toBe(true);
  expect(actualRenderer.matchingContext).toBe(true);
  expect(actualRenderer.meshGroupCount).toBeGreaterThan(0);
  expect(actualRenderer.sceneChildrenCount).toBeGreaterThan(0);
  expect(actualRenderer.drawCalls).toBeGreaterThan(0);
  console.log("WEBGL2-001 observed:", JSON.stringify(observation));
  expect(observation.webgl2Canvas, "3D canvas must own a WebGL2 context").toBe(true);
  expect(observation.workingContext).toBe(true);
  expect(observation.rendererNotLost).toBe(true);
  expect(observation.canvasWidth).toBeGreaterThan(100);
  expect(observation.canvasHeight).toBeGreaterThan(100);
  expect(observation.pixel).toEqual([255, 0, 0, 255]);
  expect(errors).toEqual([]);
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("actual-tubebender-3d.png", { body: screenshot, contentType: "image/png" });
});

test("[PERSISTENCE-RESTART] native localStorage and IndexedDB persist after full Chromium process restart", async () => {
  test.setTimeout(120000);
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "tb-full-browser-restart-"));
  const key = "tb-full-restart-" + Date.now();
  const value = "marker-" + Date.now();
  let context;
  const launch = () => chromium.launchPersistentContext(profile, {
    headless: true,
    args: softwareGL,
    viewport: { width: 1200, height: 800 }
  });
  try {
    context = await launch();
    let page = context.pages()[0] ?? await context.newPage();
    expect((await page.goto(classicURL, { waitUntil: "commit", timeout: 20000 }))?.status()).toBe(200);
    await page.evaluate(async ({ key, value }) => {
      localStorage.setItem(key, value);
      await new Promise((resolve, reject) => {
        const req = indexedDB.open("tb-full-restart-check", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("markers");
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("markers", "readwrite");
          tx.objectStore("markers").put(value, key);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
      });
    }, { key, value });
    await context.close();
    context = null;
    context = await launch();
    page = context.pages()[0] ?? await context.newPage();
    expect((await page.goto(classicURL, { waitUntil: "commit", timeout: 20000 }))?.status()).toBe(200);
    const restored = await page.evaluate(async key => {
      const local = localStorage.getItem(key);
      const indexed = await new Promise((resolve, reject) => {
        const req = indexedDB.open("tb-full-restart-check", 1);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("markers", "readonly");
          const get = tx.objectStore("markers").get(key);
          get.onsuccess = () => resolve(get.result);
          get.onerror = () => reject(get.error);
          tx.oncomplete = () => db.close();
        };
      });
      return { local, indexed };
    }, key);
    console.log("PERSISTENCE-RESTART:", JSON.stringify(restored));
    expect(restored).toEqual({ local: value, indexed: value });
  } finally {
    if (context) await context.close();
    await fs.rm(profile, { force: true, recursive: true });
  }
});
