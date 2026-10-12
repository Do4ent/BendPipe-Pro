import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root,stdio:"inherit"});
const input=path.join(root,"dist/TubeBender_CAD_VC207R7_M1_Standalone.html");
const runtime=fs.readFileSync(path.join(root,"src/ui/cad-workspace-prototype.js"),"utf8").replace(/<\/script/gi,"<\\/script");
const css=fs.readFileSync(path.join(root,"src/ui/cad-workspace-prototype.css"),"utf8");
const referenceRuntime=fs.readFileSync(path.join(root,"src/ui/cad-reference-workspace.js"),"utf8").replace(/<\/script/gi,"<\\/script");
const referenceCss=fs.readFileSync(path.join(root,"src/ui/cad-reference-workspace.css"),"utf8");
const html=fs.readFileSync(input,"utf8");
const output=path.join(root,"dist/BendPipe_Pro_CAD_Workspace_Prototype.html");
fs.writeFileSync(output,html.replace("</head>",'<style id="cad-workspace-style">'+css+"</style>"+'<style id="cad-reference-workspace-style">'+referenceCss+"</style></head>")
  .replace(/<\/body>\s*<\/html>\s*$/i,'<script data-bendpipe-prototype="cad-workspace">'+runtime+"</script>"+'<script data-bendpipe-reference="cad-workspace">'+referenceRuntime+"</script></body></html>"));
console.log(JSON.stringify({output,experimental:true,usesRealApplication:true}));
