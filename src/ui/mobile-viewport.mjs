// MOB-001 / MOB-002: constrain the mobile viewport without disabling
// scrolling inside the existing tree, settings, editor and table panels.
export const MOBILE_VIEWPORT_CSS = String.raw`
@media (max-width: 1120px) {
  html, body {
    width: 100% !important;
    max-width: 100% !important;
    height: 100% !important;
    overflow: clip !important;
    overscroll-behavior: none;
  }
  body.tb-project-map,
  body.tb-project-map #app {
    box-sizing: border-box !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: 100dvh !important;
    max-height: 100dvh !important;
    min-height: 0 !important;
    overflow: clip !important;
  }
  body.tb-project-map .tb-map-header,
  body.tb-project-map .tb-map-workspace,
  body.tb-project-map .tb-map-center,
  body.tb-project-map .tb-map-3d,
  body.tb-project-map .tb-map-bottom {
    box-sizing: border-box !important;
    min-width: 0 !important;
    max-width: 100% !important;
  }
  /* The side drawers are translated off screen when closed. They must not
     enlarge the scrollable document (but remain reachable via bottom tabs). */
  body.tb-project-map .tb-map-workspace,
  body.tb-project-map .tb-map-bottom {
    overflow: clip !important;
  }
  body.tb-project-map .tb-map-left,
  body.tb-project-map .tb-map-right {
    max-height: calc(100dvh - var(--r7-head) - var(--r7-foot) - 10px) !important;
  }
  /* Preserve local scrolling in the drawers; never globally disable it. */
  body.tb-project-map .construction-tree-body,
  body.tb-project-map .tb-check-list,
  body.tb-project-map .tb-production-body,
  body.tb-project-map .tb-edit-body,
  body.tb-project-map .settings-pane {
    overscroll-behavior: contain;
  }
  body.tb-project-map .tb-bottom-tab {
    min-height: 44px !important;
    touch-action: manipulation;
  }
}
`;
export function renderMobileViewportStyle(){
  return `<style id="tbMobileViewportMOB001">\n${MOBILE_VIEWPORT_CSS}\n</style>`;
}
