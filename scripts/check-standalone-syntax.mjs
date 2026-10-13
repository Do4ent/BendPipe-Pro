import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";

const file = path.resolve(process.argv[2] ?? "dist/TubeBender_CAD_VC207R7_M1_Standalone.html");
const html = fs.readFileSync(file, "utf8");
const tags = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
let total = 0;
let checked = 0;
let perfBootstrapFound = false;
let match;
while ((match = tags.exec(html))) {
  total++;
  const attributes = match[1];
  const code = match[2];
  if (/\bsrc\s*=/.test(attributes)) continue;
  const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attributes)?.[1]?.toLowerCase();
  if (type && type !== "text/javascript" && type !== "application/javascript") continue;
  if (!code.trim()) continue;
  const lineOffset = html.slice(0, match.index).split("\n").length - 1;
  const filename = file + ":script-" + total + ":starts-at-html-line-" + (lineOffset + 1);
  if (code.includes("window.TubeBenderStartupStatus")) perfBootstrapFound = true;
  try {
    new vm.Script(code, { filename, lineOffset });
    checked++;
  } catch (error) {
    console.error("Invalid inline JavaScript", { tag: total, htmlLine: lineOffset + 1, attributes });
    console.error(error?.stack ?? error);
    process.exitCode = 1;
  }
}
if (!perfBootstrapFound) {
  console.error("PERF startup bootstrap was not found in a classic inline script");
  process.exitCode = 1;
}
console.log(JSON.stringify({ file, totalScriptTags:total, checkedClassicScripts:checked, perfBootstrapFound, valid:!process.exitCode }));
