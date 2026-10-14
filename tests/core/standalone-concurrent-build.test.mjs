import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "../..");
const outputPath = path.join(
  root,
  "dist",
  "BendPipe_Pro_CAD_Workspace.html"
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

test("release and standalone builds keep one versioned artifact and matching checksum", async () => {
  await Promise.all(["build-release.mjs","build-standalone.mjs","build-release.mjs","build-standalone.mjs"].map(script=>
    execFileAsync(process.execPath,["scripts/"+script],{cwd:root,maxBuffer:4*1024*1024})
  ));
  const html=fs.readFileSync(outputPath,"utf8");
  const {version}=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
  assert.equal(html.split('releaseVersion:'+JSON.stringify(version)+',').length-1,1);
  const hash=crypto.createHash("sha256").update(html).digest("hex");
  const sums=fs.readFileSync(path.join(root,"dist","SHA256SUMS"),"utf8").trim().split(/\r?\n/);
  assert.ok(sums.includes(hash+"  BendPipe_Pro_CAD_Workspace.html"));
  assert.equal(sums.length,2);
});
