const PROFILE_STATUS = Object.freeze({
  VALID: "Valid",
  WARNING: "Warning",
  ERROR: "Error"
});

const STANDARD_FIELDS = Object.freeze({
  name: { kind: "text", required: true },
  grade: { kind: "text", required: false },
  category: { kind: "text", required: false },
  density_kg_m3: { kind: "number", unit: "kg/m3", minExclusive: 0 },
  elastic_modulus_mpa: { kind: "number", unit: "MPa", minExclusive: 0 },
  yield_strength_mpa: { kind: "number", unit: "MPa", minExclusive: 0 },
  tensile_strength_mpa: { kind: "number", unit: "MPa", minExclusive: 0 },
  poisson_ratio: { kind: "number", min: -1, maxExclusive: 0.5 },
  thermal_expansion_per_c: { kind: "number", unit: "1/C", min: 0 },
  springback: { kind: "number", minExclusive: 0 },
  minimum_clr_mm: { kind: "number", unit: "mm", minExclusive: 0 },
  dt_ratio_min: { kind: "number", minExclusive: 0 },
  dt_ratio_max: { kind: "number", minExclusive: 0 },
  technology_notes: { kind: "text", required: false }
});

const CUSTOM_TYPES = new Set([
  "Number",
  "Text",
  "Boolean",
  "Enum",
  "Formula",
  "UnitNumber"
]);

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) value[key] = freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}

function clone(value) {
  if (value === undefined) return undefined;
  return structuredClone(value);
}

function requiredString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new TypeError("value must be a string");
  const text = value.trim();
  return text === "" ? null : text;
}

function makeId(prefix = "material") {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function finiteOrNull(value, name) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError(`${name} must be finite or null`);
  return n;
}

function normalizeStandardFields(input = {}) {
  const out = {};
  for (const [key, spec] of Object.entries(STANDARD_FIELDS)) {
    if (spec.kind === "text") {
      out[key] = key === "name"
        ? requiredString(input[key], "material name")
        : optionalString(input[key]);
    } else {
      out[key] = finiteOrNull(input[key], key);
    }
  }
  return out;
}

function validateCustomDefinition(definition) {
  if (!definition || typeof definition !== "object") {
    throw new TypeError("custom field definition must be an object");
  }
  const id = requiredString(definition.id ?? makeId("field"), "custom field id");
  const name = requiredString(definition.name, "custom field name");
  const type = requiredString(definition.type, "custom field type");
  if (!CUSTOM_TYPES.has(type)) throw new RangeError(`unsupported custom field type: ${type}`);
  const scope = definition.scope ?? "project";
  if (!["global", "project"].includes(scope)) {
    throw new RangeError("custom field scope must be global or project");
  }
  const enumValues = type === "Enum"
    ? [...new Set((definition.enum_values ?? []).map((v) => requiredString(v, "enum value")))]
    : [];
  if (type === "Enum" && enumValues.length === 0) {
    throw new RangeError("Enum field requires at least one enum value");
  }
  return freeze({
    id,
    name,
    type,
    scope,
    description: optionalString(definition.description),
    unit: optionalString(definition.unit),
    required: definition.required === true,
    default_value: clone(definition.default_value ?? null),
    enum_values: enumValues
  });
}

function normalizeCustomFields(input = []) {
  if (!Array.isArray(input)) throw new TypeError("custom_fields must be an array");
  const ids = new Set();
  const names = new Set();
  return input.map((entry) => {
    const definition = validateCustomDefinition(entry.definition ?? entry);
    if (ids.has(definition.id)) throw new RangeError(`duplicate custom field id: ${definition.id}`);
    if (names.has(definition.name)) throw new RangeError(`duplicate custom field name: ${definition.name}`);
    ids.add(definition.id);
    names.add(definition.name);
    const formula = definition.type === "Formula"
      ? requiredString(entry.formula ?? entry.value ?? "", `formula for ${definition.name}`)
      : null;
    return freeze({
      definition,
      value: definition.type === "Formula" ? null : clone(entry.value ?? definition.default_value),
      formula
    });
  });
}

export function createMaterialProfile(input = {}, { id = null, source = "project" } = {}) {
  if (!["global", "project"].includes(source)) {
    throw new RangeError("material profile source must be global or project");
  }
  const fields = normalizeStandardFields(input);
  return freeze({
    id: requiredString(id ?? input.id ?? makeId("mat"), "material profile id"),
    source,
    ...fields,
    custom_fields: normalizeCustomFields(input.custom_fields ?? []),
    created_at: input.created_at ?? new Date().toISOString(),
    updated_at: input.updated_at ?? new Date().toISOString()
  });
}

function customFieldMap(profile) {
  return new Map(profile.custom_fields.map((entry) => [entry.definition.id, entry]));
}

function formulaTokens(expression) {
  const tokens = [];
  const rx = /\s*(?:(@[A-Za-z0-9_.:-]+)|((?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)|([()+\-*/]))/gy;
  let index = 0;
  while (index < expression.length) {
    rx.lastIndex = index;
    const match = rx.exec(expression);
    if (!match || match.index !== index) {
      throw new SyntaxError(`unsupported formula token near: ${expression.slice(index, index + 16)}`);
    }
    if (match[1]) tokens.push({ type: "ref", value: match[1].slice(1) });
    else if (match[2]) tokens.push({ type: "number", value: Number(match[2]) });
    else tokens.push({ type: match[3], value: match[3] });
    index = rx.lastIndex;
  }
  tokens.push({ type: "eof" });
  return tokens;
}

function evaluateExpression(expression, resolveReference) {
  const tokens = formulaTokens(expression);
  let pos = 0;
  const peek = () => tokens[pos];
  const take = (type) => {
    const token = tokens[pos];
    if (token.type !== type) throw new SyntaxError(`expected ${type}, got ${token.type}`);
    pos += 1;
    return token;
  };
  const primary = () => {
    if (peek().type === "number") return take("number").value;
    if (peek().type === "ref") {
      const value = resolveReference(take("ref").value);
      if (!Number.isFinite(value)) throw new TypeError("formula reference is not numeric");
      return value;
    }
    if (peek().type === "(") {
      take("(");
      const value = expressionNode();
      take(")");
      return value;
    }
    if (peek().type === "+") { take("+"); return primary(); }
    if (peek().type === "-") { take("-"); return -primary(); }
    throw new SyntaxError(`unexpected token: ${peek().type}`);
  };
  const term = () => {
    let value = primary();
    while (peek().type === "*" || peek().type === "/") {
      const op = tokens[pos++].type;
      const rhs = primary();
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  };
  const expressionNode = () => {
    let value = term();
    while (peek().type === "+" || peek().type === "-") {
      const op = tokens[pos++].type;
      const rhs = term();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  };
  const result = expressionNode();
  take("eof");
  if (!Number.isFinite(result)) throw new RangeError("formula result is not finite");
  return result;
}

export function evaluateMaterialFormulas(profile) {
  const byId = customFieldMap(profile);
  const values = new Map();
  const visiting = new Set();

  const resolve = (id) => {
    if (values.has(id)) return values.get(id);
    const entry = byId.get(id);
    if (!entry) throw new ReferenceError(`custom field not found: ${id}`);
    if (visiting.has(id)) throw new RangeError(`circular custom field dependency: ${id}`);
    visiting.add(id);
    let value;
    if (entry.definition.type === "Formula") {
      value = evaluateExpression(entry.formula, resolve);
    } else if (["Number", "UnitNumber"].includes(entry.definition.type)) {
      value = finiteOrNull(entry.value, entry.definition.name);
      if (value === null) throw new TypeError(`custom field has no numeric value: ${id}`);
    } else {
      throw new TypeError(`custom field is not numeric: ${id}`);
    }
    visiting.delete(id);
    values.set(id, value);
    return value;
  };

  for (const entry of profile.custom_fields) {
    if (entry.definition.type === "Formula") resolve(entry.definition.id);
  }

  return freeze(Object.fromEntries(values));
}

function issue(level, code, field, message) {
  return freeze({ level, code, field, message });
}

export function validateMaterialProfile(profile, { required_fields = [] } = {}) {
  const issues = [];
  if (!profile || typeof profile !== "object") {
    return freeze({ status: PROFILE_STATUS.ERROR, issues: [issue("Error", "INVALID_PROFILE", null, "Material profile is missing")] });
  }
  if (!profile.name) issues.push(issue("Error", "NAME_REQUIRED", "name", "Material name is required"));

  for (const [field, spec] of Object.entries(STANDARD_FIELDS)) {
    if (spec.kind !== "number") continue;
    const value = profile[field];
    if (value === null || value === undefined) continue;
    if (!Number.isFinite(value)) {
      issues.push(issue("Error", "NOT_FINITE", field, `${field} must be finite`));
      continue;
    }
    if (spec.min !== undefined && value < spec.min) issues.push(issue("Error", "BELOW_MIN", field, `${field} is below its physical range`));
    if (spec.minExclusive !== undefined && value <= spec.minExclusive) issues.push(issue("Error", "BELOW_MIN", field, `${field} must be greater than ${spec.minExclusive}`));
    if (spec.maxExclusive !== undefined && value >= spec.maxExclusive) issues.push(issue("Error", "ABOVE_MAX", field, `${field} must be below ${spec.maxExclusive}`));
  }

  if (
    Number.isFinite(profile.yield_strength_mpa) &&
    Number.isFinite(profile.tensile_strength_mpa) &&
    profile.yield_strength_mpa > profile.tensile_strength_mpa
  ) {
    issues.push(issue("Error", "STRENGTH_ORDER", "yield_strength_mpa", "Yield strength cannot exceed tensile strength"));
  }

  if (
    Number.isFinite(profile.dt_ratio_min) &&
    Number.isFinite(profile.dt_ratio_max) &&
    profile.dt_ratio_min > profile.dt_ratio_max
  ) {
    issues.push(issue("Error", "DT_RANGE", "dt_ratio_min", "D/t minimum cannot exceed maximum"));
  }

  for (const field of required_fields) {
    if (!(field in profile) || profile[field] === null || profile[field] === undefined || profile[field] === "") {
      issues.push(issue("Error", "REQUIRED_FOR_CALCULATION", field, `${field} is required for this calculation`));
    }
  }

  for (const entry of profile.custom_fields ?? []) {
    const def = entry.definition;
    if (def.required && def.type !== "Formula" && (entry.value === null || entry.value === undefined || entry.value === "")) {
      issues.push(issue("Error", "CUSTOM_REQUIRED", def.id, `${def.name} is required`));
    }
    if (def.type === "Enum" && entry.value !== null && entry.value !== undefined && !def.enum_values.includes(String(entry.value))) {
      issues.push(issue("Error", "CUSTOM_ENUM", def.id, `${def.name} has an unsupported value`));
    }
  }

  try {
    evaluateMaterialFormulas(profile);
  } catch (error) {
    issues.push(issue("Error", "FORMULA_ERROR", null, error.message));
  }

  if (profile.springback === null || profile.springback === undefined) {
    issues.push(issue("Warning", "SPRINGBACK_UNDEFINED", "springback", "Springback is not defined"));
  }
  else if (Number(profile.springback) < 1) {
    issues.push(issue("Warning", "SPRINGBACK_BELOW_ONE", "springback", "Springback factor is below 1; verify compensation direction"));
  }
  if (profile.minimum_clr_mm === null || profile.minimum_clr_mm === undefined) {
    issues.push(issue("Warning", "MINIMUM_CLR_UNDEFINED", "minimum_clr_mm", "Minimum CLR is not defined"));
  }

  const status = issues.some((x) => x.level === "Error")
    ? PROFILE_STATUS.ERROR
    : issues.some((x) => x.level === "Warning")
      ? PROFILE_STATUS.WARNING
      : PROFILE_STATUS.VALID;

  return freeze({ status, issues });
}

export function requireMaterialForCalculation(profile, requiredFields = []) {
  const result = validateMaterialProfile(profile, { required_fields: requiredFields });
  if (result.status === PROFILE_STATUS.ERROR) {
    const message = result.issues.filter((x) => x.level === "Error").map((x) => x.message).join("; ");
    throw new Error(message || "Material profile is invalid");
  }
  return result;
}

export function updateMaterialProfile(profile, patch = {}) {
  const base = clone(profile);
  delete base.id;
  delete base.source;
  delete base.created_at;
  delete base.updated_at;
  const next = {
    ...base,
    ...clone(patch),
    custom_fields: patch.custom_fields ?? base.custom_fields
  };
  return createMaterialProfile(next, {
    id: profile.id,
    source: profile.source
  });
}

export function duplicateMaterialProfile(profile, { id = null, name = null, source = profile.source } = {}) {
  const copy = clone(profile);
  delete copy.id;
  copy.name = name ?? `${profile.name} Copy`;
  copy.created_at = new Date().toISOString();
  copy.updated_at = copy.created_at;
  return createMaterialProfile(copy, { id, source });
}

function indexById(records, label) {
  const map = new Map();
  for (const item of records) {
    if (map.has(item.id)) throw new RangeError(`duplicate ${label} id: ${item.id}`);
    map.set(item.id, item);
  }
  return map;
}

function ensureUniqueTemplateName(globalTemplates, projectTemplates, name, exceptId = null) {
  const normalized = requiredString(name, "template name").toLocaleLowerCase();
  const conflict = [...globalTemplates, ...projectTemplates].find(
    (item) => item.id !== exceptId && item.name.toLocaleLowerCase() === normalized
  );
  if (conflict) throw new RangeError(`material template name already exists: ${name}`);
}

export function createMaterialLibrary(input = {}) {
  const globalProfiles = (input.global_profiles ?? []).map((x) =>
    x.source === "global" ? createMaterialProfile(x, { id: x.id, source: "global" }) : createMaterialProfile(x, { id: x.id, source: "global" })
  );
  const projectProfiles = (input.project_profiles ?? []).map((x) =>
    createMaterialProfile(x, { id: x.id, source: "project" })
  );
  indexById([...globalProfiles, ...projectProfiles], "material profile");

  const globalTemplates = (input.global_templates ?? []).map((x) => createMaterialTemplate(x, { id: x.id, source: "global" }));
  const projectTemplates = (input.project_templates ?? []).map((x) => createMaterialTemplate(x, { id: x.id, source: "project" }));
  indexById([...globalTemplates, ...projectTemplates], "material template");
  for (const template of [...globalTemplates, ...projectTemplates]) {
    ensureUniqueTemplateName(
      globalTemplates.filter((x) => x.id !== template.id),
      projectTemplates.filter((x) => x.id !== template.id),
      template.name
    );
  }

  return freeze({
    global_profiles: globalProfiles,
    project_profiles: projectProfiles,
    global_templates: globalTemplates,
    project_templates: projectTemplates,
    global_categories: [...new Set((input.global_categories ?? []).map((x) => requiredString(x, "category")))],
    project_categories: [...new Set((input.project_categories ?? []).map((x) => requiredString(x, "category")))],
    default_material_profile_id: input.default_material_profile_id ?? null,
    default_material_template_id: input.default_material_template_id ?? null
  });
}

export function copyGlobalMaterialToProject(library, materialId, { id = null, name = null } = {}) {
  const source = library.global_profiles.find((x) => x.id === materialId);
  if (!source) throw new RangeError(`global material not found: ${materialId}`);
  const local = duplicateMaterialProfile(source, {
    id,
    name: name ?? source.name,
    source: "project"
  });
  return freeze({
    library: freeze({
      ...clone(library),
      project_profiles: [...library.project_profiles, local]
    }),
    profile: local
  });
}

export function compareMaterialProfiles(left, right) {
  const ignored = new Set(["id", "source", "created_at", "updated_at"]);
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const differences = [];
  for (const key of keys) {
    if (ignored.has(key)) continue;
    const a = JSON.stringify(left[key] ?? null);
    const b = JSON.stringify(right[key] ?? null);
    if (a !== b) differences.push(freeze({ field: key, left: clone(left[key] ?? null), right: clone(right[key] ?? null) }));
  }
  return freeze(differences);
}

export function updateProjectMaterialFromGlobal(projectProfile, globalProfile, selectedFields) {
  if (projectProfile.source !== "project") throw new Error("target profile must be project-local");
  if (globalProfile.source !== "global") throw new Error("source profile must be global");
  if (!Array.isArray(selectedFields)) throw new TypeError("selectedFields must be an array");
  const patch = {};
  for (const field of selectedFields) {
    if (["id", "source", "created_at", "updated_at"].includes(field)) continue;
    if (!(field in globalProfile)) throw new RangeError(`global field not found: ${field}`);
    patch[field] = clone(globalProfile[field]);
  }
  return updateMaterialProfile(projectProfile, patch);
}

export function assignMaterialToTube(tube, materialId, library) {
  const profile = [...library.project_profiles, ...library.global_profiles].find((x) => x.id === materialId);
  if (!profile) throw new RangeError(`material profile not found: ${materialId}`);
  return freeze({
    ...clone(tube),
    material_profile_id: profile.id,
    material_calculation_state: "Stale"
  });
}

export function clearTubeMaterial(tube) {
  return freeze({
    ...clone(tube),
    material_profile_id: null,
    material_calculation_state: "Missing Material"
  });
}

export function bulkAssignMaterialToTubes(tubes, materialId, library) {
  if (!Array.isArray(tubes)) throw new TypeError("tubes must be an array");
  return freeze(tubes.map((tube) => assignMaterialToTube(tube, materialId, library)));
}

export function deleteProjectMaterial(library, materialId, tubes = []) {
  const profile = library.project_profiles.find((x) => x.id === materialId);
  if (!profile) throw new RangeError(`project material not found: ${materialId}`);
  const users = tubes.filter((tube) => tube?.material_profile_id === materialId);
  if (users.length) throw new Error(`material ${materialId} is used by ${users.length} tube(s); reassign or clear them first`);
  return freeze({
    ...clone(library),
    project_profiles: library.project_profiles.filter((x) => x.id !== materialId),
    default_material_profile_id:
      library.default_material_profile_id === materialId ? null : library.default_material_profile_id
  });
}

export function setProjectDefaultMaterial(library, materialId) {
  if (materialId === null) return freeze({ ...clone(library), default_material_profile_id: null });
  const exists = [...library.project_profiles, ...library.global_profiles].some((x) => x.id === materialId);
  if (!exists) throw new RangeError(`material profile not found: ${materialId}`);
  return freeze({ ...clone(library), default_material_profile_id: materialId });
}

export function materialForNewTube(library) {
  const id = library.default_material_profile_id;
  if (!id) return null;
  return [...library.project_profiles, ...library.global_profiles].find((x) => x.id === id) ?? null;
}

export function addMaterialCategory(library, name, { scope = "project" } = {}) {
  if (!["global", "project"].includes(scope)) throw new RangeError("category scope must be global or project");
  const key = scope === "global" ? "global_categories" : "project_categories";
  const category = requiredString(name, "category");
  if (library[key].some((x) => x.toLocaleLowerCase() === category.toLocaleLowerCase())) {
    throw new RangeError(`category already exists: ${category}`);
  }
  return freeze({ ...clone(library), [key]: [...library[key], category] });
}

export function deleteMaterialCategory(library, name, { scope = "project" } = {}) {
  const key = scope === "global" ? "global_categories" : "project_categories";
  const profiles = scope === "global" ? library.global_profiles : library.project_profiles;
  if (profiles.some((x) => x.category === name)) throw new Error(`category is used by material profiles: ${name}`);
  return freeze({ ...clone(library), [key]: library[key].filter((x) => x !== name) });
}

export function createMaterialTemplate(input = {}, { id = null, source = "project" } = {}) {
  if (!["global", "project"].includes(source)) throw new RangeError("template source must be global or project");
  return freeze({
    id: requiredString(id ?? input.id ?? makeId("mat-template"), "material template id"),
    source,
    name: requiredString(input.name, "template name"),
    category: optionalString(input.category),
    defaults: clone(input.defaults ?? {}),
    custom_fields: normalizeCustomFields(input.custom_fields ?? [])
  });
}

export function validateMaterialTemplate(template) {
  const issues = [];
  try {
    createMaterialProfile({
      name: template.defaults?.name ?? "Template validation material",
      ...template.defaults,
      custom_fields: template.custom_fields
    });
  } catch (error) {
    issues.push(issue("Error", "TEMPLATE_INVALID", null, error.message));
  }

  if (!issues.length) {
    try {
      const probe = createMaterialProfile({
        name: template.defaults?.name ?? "Template validation material",
        ...template.defaults,
        custom_fields: template.custom_fields
      });
      const result = validateMaterialProfile(probe);
      issues.push(...result.issues.filter((x) => x.code === "FORMULA_ERROR" || x.code === "CUSTOM_REQUIRED" || x.code === "CUSTOM_ENUM"));
    } catch {}
  }

  const status = issues.some((x) => x.level === "Error")
    ? PROFILE_STATUS.ERROR
    : issues.some((x) => x.level === "Warning")
      ? PROFILE_STATUS.WARNING
      : PROFILE_STATUS.VALID;
  return freeze({ status, issues });
}

export function createMaterialFromTemplate(template, overrides = {}, { id = null } = {}) {
  const validation = validateMaterialTemplate(template);
  if (validation.status === PROFILE_STATUS.ERROR) throw new Error("material template is invalid");
  return createMaterialProfile({
    ...clone(template.defaults),
    ...clone(overrides),
    custom_fields: overrides.custom_fields ?? clone(template.custom_fields),
    name: overrides.name ?? template.defaults?.name ?? template.name
  }, { id, source: "project" });
}

export function addMaterialTemplate(library, templateInput, { scope = "project" } = {}) {
  const template = createMaterialTemplate(templateInput, { id: templateInput.id, source: scope });
  ensureUniqueTemplateName(library.global_templates, library.project_templates, template.name);
  const key = scope === "global" ? "global_templates" : "project_templates";
  return freeze({ ...clone(library), [key]: [...library[key], template] });
}

export function renameMaterialTemplate(library, templateId, newName) {
  const name = requiredString(newName, "template name");
  const all = [...library.global_templates, ...library.project_templates];
  const current = all.find((x) => x.id === templateId);
  if (!current) throw new RangeError(`material template not found: ${templateId}`);
  ensureUniqueTemplateName(library.global_templates, library.project_templates, name, templateId);
  const key = current.source === "global" ? "global_templates" : "project_templates";
  return freeze({
    ...clone(library),
    [key]: library[key].map((item) => item.id === templateId ? freeze({ ...clone(item), name }) : item)
  });
}

export function deleteMaterialTemplate(library, templateId) {
  const current = [...library.global_templates, ...library.project_templates].find((x) => x.id === templateId);
  if (!current) throw new RangeError(`material template not found: ${templateId}`);
  const key = current.source === "global" ? "global_templates" : "project_templates";
  return freeze({
    ...clone(library),
    [key]: library[key].filter((x) => x.id !== templateId),
    default_material_template_id:
      library.default_material_template_id === templateId ? null : library.default_material_template_id
  });
}

export function copyGlobalTemplateToProject(library, templateId, { id = null, name } = {}) {
  const source = library.global_templates.find((x) => x.id === templateId);
  if (!source) throw new RangeError(`global material template not found: ${templateId}`);
  const targetName = requiredString(name, "project template name");
  ensureUniqueTemplateName(library.global_templates, library.project_templates, targetName);
  const template = createMaterialTemplate({
    ...clone(source),
    id: id ?? makeId("mat-template"),
    name: targetName
  }, { id: id ?? null, source: "project" });
  return freeze({
    library: freeze({ ...clone(library), project_templates: [...library.project_templates, template] }),
    template
  });
}

export function setProjectDefaultMaterialTemplate(library, templateId) {
  if (templateId === null) return freeze({ ...clone(library), default_material_template_id: null });
  const exists = [...library.global_templates, ...library.project_templates].some((x) => x.id === templateId);
  if (!exists) throw new RangeError(`material template not found: ${templateId}`);
  return freeze({ ...clone(library), default_material_template_id: templateId });
}

const UNIT_CONVERSIONS = Object.freeze({
  "MPa": { family: "stress", toCanonical: (x) => x, fromCanonical: (x) => x },
  "GPa": { family: "stress", toCanonical: (x) => x * 1000, fromCanonical: (x) => x / 1000 },
  "Pa": { family: "stress", toCanonical: (x) => x / 1e6, fromCanonical: (x) => x * 1e6 },
  "ksi": { family: "stress", toCanonical: (x) => x * 6.894757293168361, fromCanonical: (x) => x / 6.894757293168361 },
  "mm": { family: "length", toCanonical: (x) => x, fromCanonical: (x) => x },
  "in": { family: "length", toCanonical: (x) => x * 25.4, fromCanonical: (x) => x / 25.4 },
  "kg/m3": { family: "density", toCanonical: (x) => x, fromCanonical: (x) => x },
  "g/cm3": { family: "density", toCanonical: (x) => x * 1000, fromCanonical: (x) => x / 1000 },
  "1/C": { family: "thermal", toCanonical: (x) => x, fromCanonical: (x) => x },
  "1/K": { family: "thermal", toCanonical: (x) => x, fromCanonical: (x) => x }
});

export function convertMaterialUnit(value, fromUnit, toUnit) {
  const from = UNIT_CONVERSIONS[fromUnit];
  const to = UNIT_CONVERSIONS[toUnit];
  if (!from || !to) throw new RangeError(`unsupported unit conversion: ${fromUnit} -> ${toUnit}`);
  if (from.family !== to.family) throw new RangeError(`incompatible unit conversion: ${fromUnit} -> ${toUnit}`);
  const n = finiteOrNull(value, "value");
  if (n === null) return null;
  return to.fromCanonical(from.toCanonical(n));
}

export function exportMaterialProfilesJson(profiles, { unitMode = "canonical" } = {}) {
  if (!Array.isArray(profiles)) throw new TypeError("profiles must be an array");
  if (!["canonical", "display"].includes(unitMode)) throw new RangeError("unitMode must be canonical or display");
  return JSON.stringify({
    schema: "tubebender.material-profiles",
    schema_version: 1,
    unit_mode: unitMode,
    exported_at: new Date().toISOString(),
    profiles: clone(profiles)
  }, null, 2);
}

export function importMaterialProfilesJson(text, { target = "project" } = {}) {
  if (!["global", "project"].includes(target)) throw new RangeError("target must be global or project");
  const parsed = JSON.parse(text);
  if (parsed?.schema !== "tubebender.material-profiles" || parsed?.schema_version !== 1 || !Array.isArray(parsed.profiles)) {
    throw new Error("unsupported material profile JSON");
  }
  return freeze(parsed.profiles.map((profile) => {
    const copy = clone(profile);
    delete copy.id;
    return createMaterialProfile(copy, { source: target });
  }));
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportMaterialProfilesCsv(profiles) {
  const keys = ["name", "grade", "category", "density_kg_m3", "elastic_modulus_mpa", "yield_strength_mpa", "tensile_strength_mpa", "poisson_ratio", "thermal_expansion_per_c", "springback", "minimum_clr_mm", "dt_ratio_min", "dt_ratio_max", "technology_notes"];
  return [keys.join(","), ...profiles.map((profile) => keys.map((key) => csvEscape(profile[key])).join(","))].join("\n");
}


function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        value += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      values.push(value);
      value = "";
    } else {
      value += ch;
    }
  }
  if (quoted) throw new SyntaxError("unterminated quoted CSV field");
  values.push(value);
  return values;
}

export function importMaterialProfilesCsv(text, { target = "project", column_map = null } = {}) {
  if (!["global", "project"].includes(target)) throw new RangeError("target must be global or project");
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n").filter((line) => line.trim() !== "");
  if (lines.length < 2) return freeze([]);
  const headers = parseCsvLine(lines[0]).map((x) => x.trim());
  const mapping = column_map ?? Object.fromEntries(headers.map((header) => [header, header]));
  const profiles = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const raw = {};
    headers.forEach((header, index) => {
      const field = mapping[header];
      if (!field) return;
      raw[field] = cells[index] ?? "";
    });
    for (const [field, spec] of Object.entries(STANDARD_FIELDS)) {
      if (spec.kind !== "number" || !(field in raw)) continue;
      raw[field] = raw[field] === "" ? null : Number(String(raw[field]).trim().replace(",", "."));
    }
    if (!raw.name) throw new Error("CSV material row has no mapped name");
    profiles.push(createMaterialProfile(raw, { source: target }));
  }
  return freeze(profiles);
}

export function exportMaterialTemplatesJson(templates) {
  if (!Array.isArray(templates)) throw new TypeError("templates must be an array");
  return JSON.stringify({
    schema: "tubebender.material-templates",
    schema_version: 1,
    exported_at: new Date().toISOString(),
    templates: clone(templates)
  }, null, 2);
}

export function importMaterialTemplatesJson(text, { target = "project", existing_names = [] } = {}) {
  if (!["global", "project"].includes(target)) throw new RangeError("target must be global or project");
  const parsed = JSON.parse(text);
  if (parsed?.schema !== "tubebender.material-templates" || parsed?.schema_version !== 1 || !Array.isArray(parsed.templates)) {
    throw new Error("unsupported material template JSON");
  }
  const names = new Set(existing_names.map((x) => String(x).trim().toLocaleLowerCase()));
  const imported = [];
  for (const source of parsed.templates) {
    const name = requiredString(source.name, "template name");
    const normalized = name.toLocaleLowerCase();
    if (names.has(normalized)) throw new RangeError(`material template name already exists: ${name}`);
    names.add(normalized);
    const copy = clone(source);
    delete copy.id;
    imported.push(createMaterialTemplate(copy, { source: target }));
  }
  return freeze(imported);
}

export function compareMaterialTemplates(left, right) {
  const ignored = new Set(["id", "source"]);
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const differences = [];
  for (const key of keys) {
    if (ignored.has(key)) continue;
    const a = JSON.stringify(left[key] ?? null);
    const b = JSON.stringify(right[key] ?? null);
    if (a !== b) differences.push(freeze({ field: key, left: clone(left[key] ?? null), right: clone(right[key] ?? null) }));
  }
  return freeze(differences);
}

export function updateProjectTemplateFromGlobal(projectTemplate, globalTemplate, selectedFields) {
  if (projectTemplate.source !== "project") throw new Error("target template must be project-local");
  if (globalTemplate.source !== "global") throw new Error("source template must be global");
  if (!Array.isArray(selectedFields)) throw new TypeError("selectedFields must be an array");
  const patch = clone(projectTemplate);
  for (const field of selectedFields) {
    if (["id", "source", "name"].includes(field)) continue;
    if (!(field in globalTemplate)) throw new RangeError(`global template field not found: ${field}`);
    patch[field] = clone(globalTemplate[field]);
  }
  return createMaterialTemplate(patch, { id: projectTemplate.id, source: "project" });
}

export function sortMaterialProfiles(profiles, { by = "name", direction = "asc" } = {}) {
  if (!["asc", "desc"].includes(direction)) throw new RangeError("direction must be asc or desc");
  const sign = direction === "asc" ? 1 : -1;
  return freeze([...profiles].sort((a, b) => {
    const av = a?.[by] ?? "";
    const bv = b?.[by] ?? "";
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * sign;
    return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" }) * sign;
  }));
}

export function updateProjectMaterialInLibrary(library, materialId, patch, tubes = []) {
  const current = library.project_profiles.find((x) => x.id === materialId);
  if (!current) throw new RangeError(`project material not found: ${materialId}`);
  const updated = updateMaterialProfile(current, patch);
  const dependent_tube_ids = tubes
    .filter((tube) => tube?.material_profile_id === materialId)
    .map((tube) => tube.id ?? null);
  return freeze({
    library: freeze({
      ...clone(library),
      project_profiles: library.project_profiles.map((profile) => profile.id === materialId ? updated : profile)
    }),
    profile: updated,
    dependent_tube_ids: freeze(dependent_tube_ids),
    calculation_state: dependent_tube_ids.length ? "Stale" : "Unchanged"
  });
}

export function searchMaterialProfiles(profiles, query = "", { category = null, status = null } = {}) {
  const q = String(query).trim().toLocaleLowerCase();
  return freeze(profiles.filter((profile) => {
    if (category && profile.category !== category) return false;
    if (status && validateMaterialProfile(profile).status !== status) return false;
    if (!q) return true;
    const haystack = [
      profile.name,
      profile.grade,
      profile.category,
      profile.technology_notes,
      ...profile.custom_fields.filter((x) => x.definition.type === "Text").map((x) => x.value)
    ].filter(Boolean).join(" ").toLocaleLowerCase();
    return haystack.includes(q);
  }));
}

export { PROFILE_STATUS, STANDARD_FIELDS, CUSTOM_TYPES };
