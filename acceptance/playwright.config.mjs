import {defineConfig,devices} from "@playwright/test";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
export default defineConfig({
  testDir:"../tests/browser",
  testMatch:"*.spec.mjs",
  timeout:30000,
  expect:{timeout:10000},
  retries:0,
  workers:1,
  reporter:[["list"],["json",{outputFile:path.join(root,"reports/browser/playwright.json")}]],
  use:{
    ...devices["Desktop Chrome"],
    baseURL:"http://127.0.0.1:4178",
    trace:"retain-on-failure",
    screenshot:"only-on-failure",
    launchOptions:{args:["--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--disable-dev-shm-usage"]}
  },
  outputDir:path.join(root,"reports/browser/test-results"),
  webServer:{
    cwd:root,
    command:"node scripts/acceptance-static-server.mjs",
    url:"http://127.0.0.1:4178/TubeBender_CAD_VC207R7_M1_Standalone.html",
    timeout:90000,
    reuseExistingServer:!process.env.CI
  }
});
