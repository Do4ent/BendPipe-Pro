import fs from "node:fs";

// Shared editor/runtime and current shell. There is one supported presentation.
export function readBrowserSource() {
  return fs.readFileSync(new URL("./editor.html", import.meta.url), "utf8")
    .replace("__TB_EDITOR_STYLES__", () => fs.readFileSync(new URL("../ui/editor-controls.css", import.meta.url), "utf8"))
    .replace("__TB_SHELL_STYLES__", () => fs.readFileSync(new URL("../ui/workspace-shell.css", import.meta.url), "utf8"))
    .replace(/\r\n?/g, "\n");
}
