import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "../..");
const outputPath = path.join(
  root,
  "dist",
  "TubeBender_CAD_VC207R7_M1_Standalone.html"
);

test("standalone builders serialize publication of the shared artifact", async () => {
  const builds = await Promise.all(
    Array.from({ length: 4 }, () =>
      execFileAsync(process.execPath, ["scripts/build-standalone.mjs"], {
        cwd: root,
        maxBuffer: 4 * 1024 * 1024,
      })
    )
  );

  for (const { stdout, stderr } of builds) {
    assert.equal(stderr, "");
    const result = JSON.parse(stdout);
    assert.equal(result.offlineCoreReady, true);
    assert.equal(result.bundledDwfxImporter, true);
  }

  const html = fs.readFileSync(outputPath, "utf8");
  assert.match(html, /window\.TubeBenderStartupStatus/);
  assert.match(html, /<\/html>\s*$/);
});
