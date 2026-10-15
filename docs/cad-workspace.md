# BendPipe-Pro CAD Workspace

CAD Workspace is the sole supported interface. The task ribbon presents Source, Geometry, Technology, Machine and Release stages around the existing project tree, viewer and object inspector. Commands use the existing native editing, recognition and technology APIs; the UI does not introduce a second project model.

Startup mounts CAD Workspace at DOMContentLoaded after the shared shell, without waiting for window load and optional resources. An early loading gate keeps the base interface hidden until CAD is ready. Reference controls start on the explicit CAD-ready event. A failed mount shows an error rather than falling back to the base interface. Repeated load events do not mount duplicate controls.

The inspector has Properties, Source and Checks tabs. Properties mounts the native selection editor. Source exposes source evidence and unresolved geometry. Checks reads the actual production-release decision and its blockers. Presentation never promotes inferred values or applies machine compensation to canonical geometry.

Right-click the ribbon or header to choose icons with captions, icons only, compact with captions, or **Компактный вид без подписей**. Settings are saved independently under `bendpipe.cad.toolbarDisplay.v1`, outside project JSON. Hidden captions retain tooltips and accessible command names. Shift+F10, arrows, Home/End, Enter/Space and Escape operate the menu without repeating a model command.

Native Properties remains in the inspector; on mobile, opening it reveals the inspector and leaves bottom navigation reachable. The All Panels drawer retains native tools not represented in the current task ribbon, including normalization, tolerances, markers, command history/settings and the transform gizmo. Removing these native controls would remove working features.

Native launchers outside the drawer are hidden from first paint. Observers on the body and header place late-created controls in All Panels immediately, preserving their actions. Measurements and Editing launchers also live in this drawer, leaving the header for project actions. There is no delayed collection step.

The source under `legacy/VC207R7` is retired. Shared editor, viewer, dialogs and calculation/runtime code live in `src/application/editor.html`, composed by `src/application/browser-source.mjs`. Editor controls and the current shell have separate CSS in `src/ui`. The old title bar, hidden workbench, duplicate construction tree/project buttons, unused editing dashboard, mockup styles/layout observer and decorative window/navigation/snap controls are deleted. Historical code remains available through Git history.

The live unfold drawing is available through **Развёртка** in bottom navigation. Selecting a task stage or executing a ribbon command returns to the 3D view. Editing a dimension still uses the shared validated editor; no copied or inferred dimensions are introduced by this presentation change.

Build and verify:

```sh
npm run build:release
node scripts/check-standalone-syntax.mjs
npx playwright test --config acceptance/playwright.config.mjs
```

Open `dist/BendPipe_Pro_CAD_Workspace.html` in Chromium. The same HTML is used for toolbar, import, editing, persistence, WebGL restart and full project round-trip acceptance. Save project JSON before moving between browser origins or HTML files.
