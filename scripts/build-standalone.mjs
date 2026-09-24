import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  root,
  "legacy",
  "VC207R7",
  "TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html"
);
const threePath = path.join(root, "vendor", "three", "r160", "three.min.js");
const distDir = path.join(root, "dist");
const outputPath = path.join(distDir, "TubeBender_CAD_VC207R7_M1_Standalone.html");

const source = fs.readFileSync(sourcePath, "utf8");
const three = fs.readFileSync(threePath, "utf8");

const localTag =
  '<script src="../../vendor/three/r160/three.min.js" data-tubebender-vendored="three-r160"></script>';

if (!source.includes(localTag)) {
  throw new Error("Vendored Three.js script tag was not found in the source HTML");
}

const safeThree = three.replace(/<\/script/gi, "<\\/script");
let output = source.replace(
  localTag,
  `<script data-tubebender-bundled="three-r160">\n${safeThree}\n</script>`
);

output = output.replace(
  "offlineCoreReady:true,\n  offlineReady:false",
  "offlineCoreReady:true,\n  offlineReady:false"
);

if (/cdn\.jsdelivr\.net\/npm\/three@/i.test(output)) {
  throw new Error("Standalone build still references the Three.js CDN");
}
if (/<script\b[^>]*\bsrc=["'][^"']*three[^"']*["'][^>]*>/i.test(output)) {
  throw new Error("Standalone build still contains an external Three.js script tag");
}
if (!output.includes('data-tubebender-bundled="three-r160"')) {
  throw new Error("Standalone build is missing the bundled Three.js marker");
}

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(outputPath, output, "utf8");

const bytes = fs.statSync(outputPath).size;
process.stdout.write(
  JSON.stringify(
    {
      output: path.relative(root, outputPath),
      bytes,
      offlineCoreReady: true,
      optionalExternalModules: ["tesseract"]
    },
    null,
    2
  ) + "\n"
);
