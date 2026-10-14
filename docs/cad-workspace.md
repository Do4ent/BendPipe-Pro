# BendPipe-Pro CAD Workspace

CAD Workspace is the sole supported interface. The task ribbon presents Source, Geometry, Technology, Machine and Release stages around the existing project tree, viewer and object inspector. Commands use the existing native editing, recognition and technology APIs; the UI does not introduce a second project model.

Startup mounts CAD Workspace at DOMContentLoaded after the shared shell, without waiting for window load and optional resources. An early loading gate keeps the base interface hidden until CAD is ready. Reference controls start on the explicit CAD-ready event. A failed mount shows an error rather than falling back to the base interface. Repeated load events do not mount duplicate controls.

The inspector has Properties, Source and Checks tabs. Properties mounts the native selection editor. Source exposes source evidence and unresolved geometry. Checks reads the actual production-release decision and its blockers. Presentation never promotes inferred values or applies machine compensation to canonical geometry.

Right-click the ribbon or header to choose icons with captions, icons only, compact with captions, or **Компактный вид без подписей**. Settings are saved independently under `bendpipe.cad.toolbarDisplay.v1`, outside project JSON. Hidden captions retain tooltips and accessible command names. Shift+F10, arrows, Home/End, Enter/Space and Escape operate the menu without repeating a model command.

Native Properties remains in the inspector; on mobile, opening it reveals the inspector and leaves bottom navigation reachable. The All Panels drawer retains native tools not represented in the current task ribbon, including normalization, tolerances, markers, command history/settings and the transform gizmo. Removing these native controls would remove working features.

Native launchers outside the drawer are hidden from first paint. A direct-body observer places late-created controls in All Panels immediately, preserving the original DOM nodes and their actions. There is no delayed two-second collection step.

Classic switching and its DOM restoration/CSS are removed. Obsolete Checks/Technology cards and the old Layers launcher are removed from the shared application template. `legacy/VC207R7` still contains the shared application runtime and editor templates required by the builder; it is not a separately shipped or selectable interface.

Build and verify:

```sh
npm run build:release
node scripts/check-standalone-syntax.mjs
npx playwright test --config acceptance/playwright.config.mjs
```

Open `dist/BendPipe_Pro_CAD_Workspace.html` in Chromium. The same HTML is used for toolbar, import, editing, persistence, WebGL restart and full project round-trip acceptance. Save project JSON before moving between browser origins or HTML files.
