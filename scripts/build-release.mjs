import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const {version}=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
if(!/^\d+\.\d+\.\d+-rc\.\d+$/.test(version))throw new Error("Expected a release-candidate version");
execFileSync(process.execPath,["scripts/build-cad-workspace-prototype.mjs"],{cwd:root,stdio:"inherit"});
const dist=path.join(root,"dist");
const mainName="BendPipe_Pro_CAD_Workspace.html";
const classicName="TubeBender_CAD_VC207R7_M1_Standalone.html";
const anchor="window.TubeBenderBuildInfo=Object.freeze({";
function stamp(html){
  if(!html.includes(anchor))throw new Error("BuildInfo anchor is missing");
  return html.replace(anchor,anchor+"\n  releaseVersion:"+JSON.stringify(version)+",");
}
const prototype=fs.readFileSync(path.join(dist,"BendPipe_Pro_CAD_Workspace_Prototype.html"),"utf8");
if(!prototype.includes('badge.textContent="WORKSPACE LAB"'))throw new Error("Workspace badge anchor is missing");
fs.writeFileSync(path.join(dist,mainName),stamp(prototype.replace(
  'badge.textContent="WORKSPACE LAB"',
  'badge.textContent='+JSON.stringify("CAD WORKSPACE · "+version)
)));
fs.writeFileSync(path.join(dist,classicName),stamp(fs.readFileSync(path.join(dist,classicName),"utf8")));
const readmeName="README-RELEASE.txt";
fs.writeFileSync(path.join(dist,readmeName),[
  "BendPipe-Pro "+version,
  "",
  "Open "+mainName+" in Chromium to use the accepted CAD Workspace.",
  "The Classic view button switches layout without copying project data.",
  "A separate classic HTML is also included: "+classicName,
  "",
  "Right-click the ribbon/header to select icons with captions or icons only.",
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
const files=[mainName,classicName,readmeName];
const sums=files.map(name=>crypto.createHash("sha256").update(fs.readFileSync(path.join(dist,name))).digest("hex")+"  "+name);
fs.writeFileSync(path.join(dist,"SHA256SUMS"),sums.join("\n")+"\n");
console.log(JSON.stringify({version,primary:mainName,files:[...files,"SHA256SUMS"]}));
