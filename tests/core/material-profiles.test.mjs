import test from "node:test";
import assert from "node:assert/strict";

import {
  PROFILE_STATUS,
  addMaterialCategory,
  addMaterialTemplate,
  assignMaterialToTube,
  bulkAssignMaterialToTubes,
  clearTubeMaterial,
  compareMaterialProfiles,
  convertMaterialUnit,
  copyGlobalMaterialToProject,
  copyGlobalTemplateToProject,
  createMaterialFromTemplate,
  createMaterialLibrary,
  createMaterialProfile,
  createMaterialTemplate,
  deleteMaterialCategory,
  deleteMaterialTemplate,
  deleteProjectMaterial,
  duplicateMaterialProfile,
  evaluateMaterialFormulas,
  exportMaterialProfilesCsv,
  exportMaterialProfilesJson,
  exportMaterialTemplatesJson,
  importMaterialProfilesCsv,
  importMaterialProfilesJson,
  importMaterialTemplatesJson,
  materialForNewTube,
  renameMaterialTemplate,
  requireMaterialForCalculation,
  searchMaterialProfiles,
  sortMaterialProfiles,
  compareMaterialTemplates,
  updateProjectTemplateFromGlobal,
  updateProjectMaterialInLibrary,
  setProjectDefaultMaterial,
  setProjectDefaultMaterialTemplate,
  updateMaterialProfile,
  updateProjectMaterialFromGlobal,
  validateMaterialProfile,
  validateMaterialTemplate
} from "../../src/domain/materials/material-profiles.mjs";

function steel(overrides = {}) {
  return createMaterialProfile({
    name: "S235",
    grade: "S235JR",
    category: "Steel",
    density_kg_m3: 7850,
    elastic_modulus_mpa: 210000,
    yield_strength_mpa: 235,
    tensile_strength_mpa: 360,
    poisson_ratio: 0.3,
    thermal_expansion_per_c: 0.000012,
    springback: 1.05,
    minimum_clr_mm: 30,
    dt_ratio_min: 10,
    dt_ratio_max: 80,
    technology_notes: "Tube grade",
    ...overrides
  }, { id: overrides.id ?? "mat-s235", source: overrides.source ?? "project" });
}

test("material profile stores stable identity and treats absent values as null, not zero", () => {
  const profile = createMaterialProfile({ name: "Unknown alloy" }, { id: "mat-unknown" });
  assert.equal(profile.id, "mat-unknown");
  assert.equal(profile.density_kg_m3, null);
  assert.equal(profile.springback, null);
  assert.notEqual(profile.springback, 0);
});

test("material validation catches physical contradictions and keeps warnings separate from errors", () => {
  const invalid = steel({ yield_strength_mpa: 500, tensile_strength_mpa: 400 });
  const bad = validateMaterialProfile(invalid);
  assert.equal(bad.status, PROFILE_STATUS.ERROR);
  assert.ok(bad.issues.some((x) => x.code === "STRENGTH_ORDER"));

  const warning = createMaterialProfile({ name: "Minimal" }, { id: "mat-minimal" });
  const warned = validateMaterialProfile(warning);
  assert.equal(warned.status, PROFILE_STATUS.WARNING);
  assert.ok(warned.issues.some((x) => x.code === "SPRINGBACK_UNDEFINED"));
});

test("calculation-specific material requirements block only the calculation that needs them", () => {
  const profile = createMaterialProfile({ name: "Geometry-only" }, { id: "mat-geometry" });
  assert.doesNotThrow(() => requireMaterialForCalculation(profile, []));
  assert.throws(() => requireMaterialForCalculation(profile, ["springback"]), /springback is required/);
});

test("custom numeric fields and formulas evaluate through stable field ids", () => {
  const profile = createMaterialProfile({
    name: "Formula material",
    springback: 1,
    minimum_clr_mm: 20,
    custom_fields: [
      {
        definition: { id: "k", name: "K bend", type: "Number", scope: "project" },
        value: 1.08
      },
      {
        definition: { id: "base", name: "Base", type: "UnitNumber", unit: "mm", scope: "project" },
        value: 12
      },
      {
        definition: { id: "calc", name: "Calculated", type: "Formula", scope: "project" },
        formula: "@base * @k + 2"
      }
    ]
  }, { id: "mat-formula" });

  const values = evaluateMaterialFormulas(profile);
  assert.equal(values.k, 1.08);
  assert.equal(values.base, 12);
  assert.equal(values.calc, 14.96);
});

test("custom formula circular dependency is an explicit validation error", () => {
  const profile = createMaterialProfile({
    name: "Cycle",
    springback: 1,
    minimum_clr_mm: 20,
    custom_fields: [
      { definition: { id: "a", name: "A", type: "Formula" }, formula: "@b + 1" },
      { definition: { id: "b", name: "B", type: "Formula" }, formula: "@a + 1" }
    ]
  }, { id: "mat-cycle" });

  const result = validateMaterialProfile(profile);
  assert.equal(result.status, PROFILE_STATUS.ERROR);
  assert.ok(result.issues.some((x) => x.code === "FORMULA_ERROR"));
});

test("profile update preserves identity and duplicate creates an independent identity", () => {
  const original = steel();
  const updated = updateMaterialProfile(original, { springback: 1.09 });
  assert.equal(updated.id, original.id);
  assert.equal(updated.springback, 1.09);

  const duplicate = duplicateMaterialProfile(original, { id: "mat-copy", name: "S235 Custom" });
  assert.equal(duplicate.id, "mat-copy");
  assert.equal(duplicate.name, "S235 Custom");
  assert.equal(duplicate.yield_strength_mpa, original.yield_strength_mpa);
});

test("global material copies to project as an independent local profile", () => {
  const global = steel({ id: "mat-global", source: "global" });
  const library = createMaterialLibrary({ global_profiles: [global] });
  const copied = copyGlobalMaterialToProject(library, "mat-global", { id: "mat-local" });

  assert.equal(copied.profile.source, "project");
  assert.equal(copied.profile.id, "mat-local");
  const edited = updateMaterialProfile(copied.profile, { yield_strength_mpa: 250 });
  assert.equal(global.yield_strength_mpa, 235);
  assert.equal(edited.yield_strength_mpa, 250);
});

test("global/project compare is field-level and update is explicitly selective", () => {
  const global = steel({ id: "mat-global", source: "global", springback: 1.1 });
  const local = steel({ id: "mat-local", source: "project", springback: 1.05, technology_notes: "local note" });

  const diff = compareMaterialProfiles(local, global);
  assert.ok(diff.some((x) => x.field === "springback"));
  assert.ok(diff.some((x) => x.field === "technology_notes"));

  const merged = updateProjectMaterialFromGlobal(local, global, ["springback"]);
  assert.equal(merged.springback, 1.1);
  assert.equal(merged.technology_notes, "local note");
});

test("tube material assignment is explicit and changing it marks material calculations stale", () => {
  const local = steel();
  const library = createMaterialLibrary({ project_profiles: [local] });
  const tube = assignMaterialToTube({ id: "tube-1", od_mm: 16, wall_mm: 1 }, local.id, library);

  assert.equal(tube.material_profile_id, local.id);
  assert.equal(tube.od_mm, 16);
  assert.equal(tube.material_calculation_state, "Stale");

  const cleared = clearTubeMaterial(tube);
  assert.equal(cleared.material_profile_id, null);
  assert.equal(cleared.material_calculation_state, "Missing Material");
});

test("bulk material assignment changes selected tubes without geometry overrides", () => {
  const local = steel();
  const library = createMaterialLibrary({ project_profiles: [local] });
  const tubes = bulkAssignMaterialToTubes([
    { id: "tube-a", od_mm: 16, wall_mm: 1 },
    { id: "tube-b", od_mm: 22, wall_mm: 1.5 }
  ], local.id, library);

  assert.deepEqual(tubes.map((x) => x.material_profile_id), [local.id, local.id]);
  assert.deepEqual(tubes.map((x) => x.od_mm), [16, 22]);
});

test("used project material cannot be deleted until tube references are removed", () => {
  const local = steel();
  const library = createMaterialLibrary({ project_profiles: [local] });
  assert.throws(
    () => deleteProjectMaterial(library, local.id, [{ id: "tube", material_profile_id: local.id }]),
    /reassign or clear/
  );
  const next = deleteProjectMaterial(library, local.id, []);
  assert.equal(next.project_profiles.length, 0);
});

test("project default material affects new tubes only through explicit lookup", () => {
  const local = steel();
  let library = createMaterialLibrary({ project_profiles: [local] });
  library = setProjectDefaultMaterial(library, local.id);
  assert.equal(materialForNewTube(library).id, local.id);

  library = setProjectDefaultMaterial(library, null);
  assert.equal(materialForNewTube(library), null);
});

test("material categories are user-managed and non-empty categories cannot be deleted", () => {
  let library = createMaterialLibrary({ project_profiles: [steel()] });
  library = addMaterialCategory(library, "Steel");
  assert.deepEqual(library.project_categories, ["Steel"]);
  assert.throws(() => deleteMaterialCategory(library, "Steel"), /used by material profiles/);

  const empty = addMaterialCategory(createMaterialLibrary(), "Experimental");
  assert.equal(deleteMaterialCategory(empty, "Experimental").project_categories.length, 0);
});

test("material profile search covers name, grade, category and text custom fields", () => {
  const a = steel();
  const b = createMaterialProfile({
    name: "Cu tube",
    grade: "Cu-DHP",
    category: "Copper",
    springback: 1,
    minimum_clr_mm: 20,
    custom_fields: [
      { definition: { id: "customer", name: "Customer", type: "Text" }, value: "ACME" }
    ]
  }, { id: "mat-cu" });

  assert.deepEqual(searchMaterialProfiles([a, b], "copper").map((x) => x.id), ["mat-cu"]);
  assert.deepEqual(searchMaterialProfiles([a, b], "acme").map((x) => x.id), ["mat-cu"]);
  assert.deepEqual(searchMaterialProfiles([a, b], "", { category: "Steel" }).map((x) => x.id), ["mat-s235"]);
});

test("canonical unit conversion supports common engineering units and rejects incompatible families", () => {
  assert.equal(convertMaterialUnit(210, "GPa", "MPa"), 210000);
  assert.equal(convertMaterialUnit(1, "in", "mm"), 25.4);
  assert.equal(convertMaterialUnit(7.85, "g/cm3", "kg/m3"), 7850);
  assert.throws(() => convertMaterialUnit(1, "mm", "MPa"), /incompatible/);
});

test("JSON material export/import creates new ids instead of silently overwriting existing profiles", () => {
  const original = steel();
  const json = exportMaterialProfilesJson([original]);
  const imported = importMaterialProfilesJson(json, { target: "project" });

  assert.equal(imported.length, 1);
  assert.equal(imported[0].name, original.name);
  assert.notEqual(imported[0].id, original.id);
});

test("CSV export is a simple tabular representation with standard fields", () => {
  const csv = exportMaterialProfilesCsv([steel()]);
  assert.match(csv, /^name,grade,category,/);
  assert.match(csv, /S235,S235JR,Steel/);
});

test("material template validation catches broken formulas", () => {
  const template = createMaterialTemplate({
    name: "Broken template",
    defaults: { springback: 1, minimum_clr_mm: 10 },
    custom_fields: [
      { definition: { id: "f", name: "F", type: "Formula" }, formula: "@missing + 1" }
    ]
  }, { id: "tpl-broken" });

  assert.equal(validateMaterialTemplate(template).status, PROFILE_STATUS.ERROR);
});

test("material created from template is independent and stores no template provenance", () => {
  const template = createMaterialTemplate({
    name: "Steel tube",
    defaults: {
      name: "Template Steel",
      category: "Steel",
      springback: 1.04,
      minimum_clr_mm: 25
    }
  }, { id: "tpl-steel" });

  const profile = createMaterialFromTemplate(template, { name: "Project Steel" }, { id: "mat-from-template" });
  assert.equal(profile.id, "mat-from-template");
  assert.equal(profile.name, "Project Steel");
  assert.equal(profile.springback, 1.04);
  assert.equal("template_id" in profile, false);
  assert.equal("created_from_template" in profile, false);
});

test("material template names are unique across global and project levels", () => {
  let library = createMaterialLibrary();
  library = addMaterialTemplate(library, { id: "tpl-global", name: "Steel Tube" }, { scope: "global" });
  assert.throws(
    () => addMaterialTemplate(library, { id: "tpl-project", name: "Steel Tube" }, { scope: "project" }),
    /name already exists/
  );
});

test("copying a global template to project requires a globally unique new name", () => {
  let library = createMaterialLibrary({
    global_templates: [{ id: "tpl-global", name: "Steel Tube" }]
  });
  assert.throws(
    () => copyGlobalTemplateToProject(library, "tpl-global", { id: "tpl-local", name: "Steel Tube" }),
    /name already exists/
  );
  const copied = copyGlobalTemplateToProject(library, "tpl-global", {
    id: "tpl-local",
    name: "Steel Tube Project"
  });
  assert.equal(copied.template.name, "Steel Tube Project");
  assert.equal(copied.template.source, "project");
});

test("template rename enforces uniqueness and does not affect material profiles", () => {
  const material = steel();
  let library = createMaterialLibrary({
    project_profiles: [material],
    global_templates: [{ id: "tpl-a", name: "A" }],
    project_templates: [{ id: "tpl-b", name: "B" }]
  });

  assert.throws(() => renameMaterialTemplate(library, "tpl-b", "A"), /name already exists/);
  library = renameMaterialTemplate(library, "tpl-b", "C");
  assert.equal(library.project_templates[0].name, "C");
  assert.equal(library.project_profiles[0].name, "S235");
});

test("default material template is independent from default material profile and resets when template is deleted", () => {
  const material = steel();
  let library = createMaterialLibrary({
    project_profiles: [material],
    project_templates: [{ id: "tpl-a", name: "A" }]
  });
  library = setProjectDefaultMaterial(library, material.id);
  library = setProjectDefaultMaterialTemplate(library, "tpl-a");

  assert.equal(library.default_material_profile_id, material.id);
  assert.equal(library.default_material_template_id, "tpl-a");

  library = deleteMaterialTemplate(library, "tpl-a");
  assert.equal(library.default_material_profile_id, material.id);
  assert.equal(library.default_material_template_id, null);
});


test("CSV import maps standard columns and never reuses exported profile identity", () => {
  const csv = exportMaterialProfilesCsv([steel()]);
  const imported = importMaterialProfilesCsv(csv, { target: "project" });
  assert.equal(imported.length, 1);
  assert.equal(imported[0].name, "S235");
  assert.equal(imported[0].yield_strength_mpa, 235);
  assert.notEqual(imported[0].id, "mat-s235");
});

test("CSV import supports explicit column mapping", () => {
  const csv = "Material,YS,UTS\nMapped Steel,250,410";
  const imported = importMaterialProfilesCsv(csv, {
    column_map: {
      Material: "name",
      YS: "yield_strength_mpa",
      UTS: "tensile_strength_mpa"
    }
  });
  assert.equal(imported[0].name, "Mapped Steel");
  assert.equal(imported[0].yield_strength_mpa, 250);
  assert.equal(imported[0].tensile_strength_mpa, 410);
});

test("material template JSON exchange preserves structure but creates a new identity", () => {
  const original = createMaterialTemplate({
    name: "Copper Tube",
    category: "Copper",
    defaults: { name: "Cu-DHP", springback: 1.02, minimum_clr_mm: 18 },
    custom_fields: [
      { definition: { id: "kb", name: "K bend", type: "Number" }, value: 1.01 }
    ]
  }, { id: "tpl-cu", source: "global" });
  const json = exportMaterialTemplatesJson([original]);
  const imported = importMaterialTemplatesJson(json, { target: "project" });
  assert.equal(imported[0].name, "Copper Tube");
  assert.equal(imported[0].source, "project");
  assert.notEqual(imported[0].id, original.id);
  assert.equal(imported[0].custom_fields[0].definition.name, "K bend");
});

test("material template import refuses a conflicting name instead of silently overwriting", () => {
  const json = exportMaterialTemplatesJson([
    createMaterialTemplate({ name: "Steel Tube" }, { id: "tpl-steel" })
  ]);
  assert.throws(
    () => importMaterialTemplatesJson(json, { existing_names: ["steel tube"] }),
    /name already exists/
  );
});

test("global/project template compare and selective update preserve project name and identity", () => {
  const globalTemplate = createMaterialTemplate({
    name: "Global Steel",
    category: "Steel",
    defaults: { name: "S235", springback: 1.08, minimum_clr_mm: 30 }
  }, { id: "tpl-global", source: "global" });
  const projectTemplate = createMaterialTemplate({
    name: "Project Steel",
    category: "Steel",
    defaults: { name: "Local Steel", springback: 1.02, minimum_clr_mm: 25 }
  }, { id: "tpl-project", source: "project" });

  const diff = compareMaterialTemplates(projectTemplate, globalTemplate);
  assert.ok(diff.some((x) => x.field === "defaults"));

  const updated = updateProjectTemplateFromGlobal(projectTemplate, globalTemplate, ["defaults"]);
  assert.equal(updated.id, "tpl-project");
  assert.equal(updated.name, "Project Steel");
  assert.equal(updated.defaults.springback, 1.08);
});

test("sorting material profiles is deterministic and non-mutating", () => {
  const profiles = [
    createMaterialProfile({ name: "Zinc", springback: 1, minimum_clr_mm: 1 }, { id: "z" }),
    createMaterialProfile({ name: "Aluminium", springback: 1, minimum_clr_mm: 1 }, { id: "a" })
  ];
  const sorted = sortMaterialProfiles(profiles, { by: "name" });
  assert.deepEqual(sorted.map((x) => x.name), ["Aluminium", "Zinc"]);
  assert.deepEqual(profiles.map((x) => x.name), ["Zinc", "Aluminium"]);
});

test("editing a project material reports exactly which tube calculations become stale", () => {
  const profile = steel();
  const library = createMaterialLibrary({ project_profiles: [profile] });
  const result = updateProjectMaterialInLibrary(
    library,
    profile.id,
    { springback: 1.12 },
    [
      { id: "tube-1", material_profile_id: profile.id },
      { id: "tube-2", material_profile_id: "other" },
      { id: "tube-3", material_profile_id: profile.id }
    ]
  );
  assert.equal(result.profile.springback, 1.12);
  assert.equal(result.calculation_state, "Stale");
  assert.deepEqual(result.dependent_tube_ids, ["tube-1", "tube-3"]);
});
