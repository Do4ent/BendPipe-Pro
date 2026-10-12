# BendPipe-Pro CAD Workspace — experimental interface

## Design basis

This is a synthesis of selected documented CAD interaction patterns, rather than a survey of every historical UI version or a measured claim of optimal usability. Product names describe inspiration; the prototype has its own visual design and reuses BendPipe-Pro commands.

| CAD reference | Pattern adopted | BendPipe-Pro implementation |
| --- | --- | --- |
| Inventor | Environment-aware ribbon and model browser | Five workspaces with a context command strip; existing project tree remains live |
| SolidWorks | CommandManager and contextual properties | Geometry tools together, selection properties and evidence beside the viewport |
| Solid Edge | Command Finder and direct manipulation | Existing command palette, Move/Rotate tools and geometry grips |
| CATIA | Task-oriented action bar/workbenches | Source, Geometry, Technology, Machine and Release workspaces |
| Siemens NX | Roles and command discovery | Show tools relevant to the current task; keep all-command access |
| Onshape | Document structure and history | Project/tube navigation and existing revision/history routes |
| Fusion | Workspaces, browser and timeline | Context workspaces and persistent history access, without introducing a second model history |
| AutoCAD | Command input close to work | Existing aliases, dynamic input and hotkeys retained |
| FreeCAD | Workbench switching | Switching the command surface keeps the model and scene unchanged |

Official sources consulted:

- [Inventor ribbon](https://help.autodesk.com/cloudhelp/2025/ENU/Inventor-Help/files/GUID-78BFC5E2-5323-48E3-A704-58DDD1836EFE.htm)
- [SolidWorks Manager Pane](https://help.solidworks.com/2024/english/SolidWorks/sldworks/c_management_panel.htm)
- [Solid Edge Command Finder](https://blogs.sw.siemens.com/solidedge/The-Solid-Edge-Command-Finder-is-Your-Friend/)
- [Solid Edge Steering Wheel](https://solidedge.siemens.com/en/solutions/products/3d-design/55167-2/)
- [CATIA action bar](https://blog.3ds.com/brands/catia/enhance-user-experience-and-productivity-with-this-simple-trick/)
- [NX roles](https://blogs.sw.siemens.com/designcenter/nx-roles/)
- [NX Command Finder](https://blogs.sw.siemens.com/news/nx-hints-and-tips-using-command-finder/)
- [Onshape document tabs](https://cad.onshape.com/help/Content/Document/document_tabs.htm)
- [Fusion interface](https://help.autodesk.com/view/fusion360/ENU/?contextId=LP-STEPS-P13N-SNP-GS-OTH-CRD-1)
- [AutoCAD dynamic input](https://help.autodesk.com/cloudhelp/2025/ENU/AutoCAD-Core/files/GUID-3EBD4C17-F0A5-49FA-B131-4AABE2E727DB.htm)
- [FreeCAD workbench layout](https://blog.freecad.org/2024/12/03/tutorial-themes-and-workbench-layout/)

## Layout and scope

Top: project, active tube, save/undo/redo, five workspaces and command search. Left: current source/project/object tree, including original layers and group decorations. Centre: original 3D canvas, view navigation and selection. Right: a unified Properties / Source / Checks inspector. Bottom: original view/mobile panel navigation.

The inspector never assigns missing dimensions, confidence values or tooling. It displays stored source evidence and the real production release decision. Source CAD, canonical geometry, editable geometry and downstream compensation remain distinct. Project JSON export is labelled separately from manufacturing output.

## Function coverage

| Existing capability | Access in the prototype |
| --- | --- |
| CAD/DWFx/project import, bbox and source selection | Source → Import; original import dialog |
| Project save, JSON export, recovery and recent projects | Source tools and original project dialog |
| Recognition, canonical evidence, ambiguities | Source → Evidence; context inspector; Properties |
| Line length, bend angles, CLR and rotations | Geometry → Length/Angle/Properties; original row editors |
| Move/copy/rotate/mirror/split/arrays/transform stacks | Geometry command strip; original editing panel |
| Selection filters, snaps, UCS, dynamic input | Original viewport tools, palette and hotkeys |
| Layers/groups/assemblies/object locks | Geometry tools, original tree and context menus |
| Measurements/sections/named views/selection sets | Geometry tools and original viewport |
| Constraints/tolerances/fitted/normalized geometry | Original dedicated panels and command palette; geometry constraints routes |
| Materials, styles and tube ports | Technology workspace and original libraries |
| Autorouting, YBC/LRA | Technology workspace, existing engineering centre |
| Machine profiles/instances, tooling and setup | Machine workspace and existing Equipment Library |
| Trim/sequence/simulation/clearance | Machine workspace |
| Revisions/history, reports and release checks | Release workspace |
| Manufacturing formats and compensation | Original Reports panel; existing production gate |
| Languages, settings, shortcuts and aliases | Header Settings; original settings/palette |

All existing runtime modules and DOM nodes are retained. This is an alternate command/layout surface, not a replacement implementation of the functions. The Classic view toggle permits comparing layouts without reloading or copying project data. Not every existing command has a new ribbon button; original panels and palette remain available.

## Build and try

```sh
npm run build:cad-prototype
```

Open `dist/BendPipe_Pro_CAD_Workspace_Prototype.html` in Chromium. It contains the real app and bundled DWFx importer; no demo dimensions are inserted. Browser localStorage is shared by origin with the original app, so preserve a project JSON before comparing interfaces against an existing workspace.

For automated checks:

```sh
npx playwright test --config acceptance/playwright.config.mjs --grep CAD-WORKSPACE
TB_BROWSER_APP_PATH=/BendPipe_Pro_CAD_Workspace_Prototype.html npx playwright test --config acceptance/playwright.config.mjs --grep RELEASE-GATE
```

The first test covers visible command routing, real DWFx import, source/production boundaries, layout switching and mobile overflow. The second exercises the complete edit/save/reopen/export flow on the alternate UI. Screenshots are written to `reports/browser/cad-workspace-desktop.png` and `cad-workspace-mobile.png`.

## Unified inspector and panel display

The right column has three tabs: Properties uses the original selection editor (including editable fields), Source shows active-tube canonical/provenance evidence, and Checks lists the actual production gate blockers. The previous right-column cards are hidden only in CAD Workspace; their functions remain accessible through the task ribbon and original panels. Switching to Classic returns the original properties DOM node to the body and restores the original layout. No model data is copied.

Right-click the command ribbon or header action panel to choose **Icons with labels** or **Icons only**. The preference is saved separately for each panel in localStorage under `bendpipe.cad.toolbarDisplay.v1`; it applies across workspaces and page reloads. It does not enter project JSON or alter manufacturing settings. Hidden captions retain tooltips and accessible names. The menu also supports Shift+F10/the context-menu key, arrows, Enter and Escape.

Menu keyboard events are consumed before CAD hotkey/repeat handlers, so Enter/Space cannot accidentally repeat a model operation while selecting a display option. On mobile, opening native Properties reveals the inspector; drawer height leaves the bottom 3D navigation reachable.

Save is kept in the header; the duplicate Save ribbon item and duplicate All Panels ribbon item are removed. Evidence now opens the Source inspector rather than reopening Properties.

## Evaluation limits

Prototype labels are initially Russian; existing language settings continue to control the underlying application. The inspector observes state periodically and does not implement new recognition or compensation logic. Other native panels remain floating/modal in this iteration. Keyboard navigation is provided for workspace/inspector tabs and the display menu; a full accessibility audit and usability testing with real operators are still required. No editing speed or performance improvement is claimed without measurement.
