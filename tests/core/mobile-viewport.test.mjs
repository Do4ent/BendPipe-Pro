import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {MOBILE_VIEWPORT_CSS, renderMobileViewportStyle} from "../../src/ui/mobile-viewport.mjs";

test("MOB-001: root and CAD workspace are clipped only at mobile breakpoint",()=>{
  assert.match(MOBILE_VIEWPORT_CSS, /@media\s*\(max-width:\s*1120px\)/);
  assert.match(MOBILE_VIEWPORT_CSS, /html, body\s*\{[^}]*overflow:\s*clip\s*!important/s);
  assert.match(MOBILE_VIEWPORT_CSS, /body\.tb-project-map #app\s*\{[^}]*overflow:\s*clip\s*!important/s);
  assert.match(MOBILE_VIEWPORT_CSS, /\.tb-map-workspace,[\s\S]*?\.tb-map-bottom\s*\{\s*overflow:\s*clip/s);
  assert.match(MOBILE_VIEWPORT_CSS, /100dvh/);
});
test("MOB-002: scoped local scrolling is preserved for existing panels",()=>{
  for(const panel of [".construction-tree-body",".tb-check-list",".tb-production-body",".tb-edit-body",".settings-pane"]){
    assert.ok(MOBILE_VIEWPORT_CSS.includes(panel), panel);
  }
  assert.doesNotMatch(MOBILE_VIEWPORT_CSS, /\.construction-tree-body[^}]*overflow:\s*(?:hidden|clip)/s);
  assert.doesNotMatch(MOBILE_VIEWPORT_CSS, /\.settings-pane[^}]*overflow:\s*(?:hidden|clip)/s);
});
test("MOB-001: standalone builder injects one end-of-head style",()=>{
  const build=fs.readFileSync(new URL("../../scripts/build-standalone.mjs",import.meta.url),"utf8");
  assert.match(build,/renderMobileViewportStyle/);
  assert.match(build,/tbMobileViewportMOB001/);
  assert.match(renderMobileViewportStyle(),/^<style id="tbMobileViewportMOB001">/);
});
