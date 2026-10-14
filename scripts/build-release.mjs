import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const {version}=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
if(!/^\d+\.\d+\.\d+-rc\.\d+$/.test(version))throw new Error("Expected a release-candidate version");
execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root,stdio:"inherit"});
const dist=path.join(root,"dist");
const mainName="BendPipe_Pro_CAD_Workspace.html";
const workspace=fs.readFileSync(path.join(dist,"BendPipe_Pro_CAD_Workspace.html"),"utf8");
if(!workspace.includes('releaseVersion:'+JSON.stringify(version)+','))throw new Error("Release version missing from workspace");
const readmeName="README-RELEASE.txt";
fs.writeFileSync(path.join(dist,readmeName),[
  "BendPipe-Pro "+version,
  "",
  "Open "+mainName+" in Chromium to use the accepted CAD Workspace.",
  "",
  "Right-click the ribbon/header to select captions, icons only, compact, or compact without captions.",
  "Open native Layers with the Geometry button or LAYER / LA / СЛОИ in the command palette.",
  "Project JSON is an editable project artifact, not a manufacturing release.",
  "Unverified source geometry, tooling/material/machine settings retain production blockers.",
  "The full real-source round trip is verified for DWFx 80004806.",
  "80005311/80005313 have real-import regression coverage; unresolved parts block whole-project import.",
  "Optional OCR functionality may require external resources.",
  "",
  "Save project JSON before moving between browser origins or HTML files.",
  "UI settings and local workspace persistence depend on browser storage.",
  "",
  "Checksums: SHA256SUMS",
  "Source and release notes: https://github.com/Do4ent/BendPipe-Pro/releases/tag/v"+version,
  ""
].join("\n"));
const files=[mainName,readmeName];
const sums=files.map(name=>crypto.createHash("sha256").update(fs.readFileSync(path.join(dist,name))).digest("hex")+"  "+name);
fs.writeFileSync(path.join(dist,"SHA256SUMS"),sums.join("\n")+"\n");
console.log(JSON.stringify({version,primary:mainName,files:[...files,"SHA256SUMS"]}));
