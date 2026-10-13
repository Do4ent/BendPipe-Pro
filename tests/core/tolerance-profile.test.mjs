import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_GEOMETRY_TOLERANCE_PROFILE,
  normalizeGeometryToleranceProfile,
  ensureProjectGeometryToleranceProfile,
  mathematicalToleranceProfile,
  snapSettingsFromToleranceProfile,
  recognitionSettingsFromToleranceProfile,
  createGeometryFitEvidence,
  exactGeometryEvidence
} from "../../src/domain/geometry/tolerance-profile.mjs";

test("question 85: model tolerances and cursor capture radius are separate",()=>{
  const profile=normalizeGeometryToleranceProfile({
    point_tolerance_mm:.02,
    linear_tolerance_mm:.03,
    angular_tolerance_deg:.1,
    coplanar_tolerance_mm:.04,
    circle_arc_fit_tolerance_mm:.2,
    tangent_tolerance_deg:.15,
    cursor_capture_radius_px:18
  });
  assert.equal(profile.cursor_capture_radius_px,18);
  const math=mathematicalToleranceProfile(profile);
  assert.equal("cursor_capture_radius_px" in math,false);
  assert.equal(math.circle_arc_fit_tolerance_mm,.2);
});

test("question 85: snap settings consume px capture plus model tolerances",()=>{
  const profile={...DEFAULT_GEOMETRY_TOLERANCE_PROFILE,cursor_capture_radius_px:21,linear_tolerance_mm:.125};
  const settings=snapSettingsFromToleranceProfile(profile,{through_snap:true});
  assert.equal(settings.cursor_radius_px,21);
  assert.equal(settings.linear_tolerance_mm,.125);
  assert.equal(settings.through_snap,true);
});

test("question 85: recognition settings never contain cursor pixels",()=>{
  const profile={...DEFAULT_GEOMETRY_TOLERANCE_PROFILE,cursor_capture_radius_px:99,circle_arc_fit_tolerance_mm:.17,coplanar_tolerance_mm:.06};
  const settings=recognitionSettingsFromToleranceProfile(profile);
  assert.equal(settings.arc_radial_tolerance_mm,.17);
  assert.equal(settings.arc_plane_tolerance_mm,.06);
  assert.equal("cursor_capture_radius_px" in settings,false);
  assert.equal("cursor_radius_px" in settings,false);
});

test("question 85: project tolerance profile is normalized and persisted on project",()=>{
  const project={geometry_tolerance_profile:{linear_tolerance_mm:.2,cursor_capture_radius_px:16}};
  const profile=ensureProjectGeometryToleranceProfile(project);
  assert.equal(profile.linear_tolerance_mm,.2);
  assert.equal(profile.cursor_capture_radius_px,16);
  assert.equal(project.geometry_tolerance_profile.point_tolerance_mm,DEFAULT_GEOMETRY_TOLERANCE_PROFILE.point_tolerance_mm);
});

test("question 85: fitted evidence carries status errors confidence and source evidence",()=>{
  const fit=createGeometryFitEvidence({
    mode:"Fitted",
    fitting_error_mm:.025,
    tolerance_mm:.1,
    evidence:[{source:"mesh",sample_count:9}]
  });
  assert.equal(fit.geometry_status,"Fitted");
  assert.equal(fit.fitting_error.mm,.025);
  assert.equal(fit.confidence,.75);
  assert.deepEqual(fit.evidence,[{source:"mesh",sample_count:9}]);
});

test("question 85: Exact evidence is explicit and confidence one",()=>{
  const exact=exactGeometryEvidence([{source:"native-curve"}]);
  assert.equal(exact.geometry_status,"Exact");
  assert.equal(exact.fitting_error.mm,0);
  assert.equal(exact.confidence,1);
});
