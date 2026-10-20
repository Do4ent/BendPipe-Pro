// Реальный файл 80004806 (tests/reference_parts/cases/dwfx-80004806/source.dwfx) проходит весь импорт DWFx.
// Фиксирует: статус кандидата, число редактируемых деталей, отсутствие блокировок, отсутствие компенсации станка,
// и значения размеров по всем деталям эталона real-import-golden.json.
// Метаданные-конфликты не исправляются: размеры из геометрии помечаются geometry_derived и остаются блокерами производства.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { prepareTrustedDwfxFileImport } from "../../src/import/dwfx/trusted-file-import.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const caseDir = path.join(here, "../reference_parts/cases/dwfx-80004806");
const golden = JSON.parse(fs.readFileSync(path.join(caseDir, "real-import-golden.json"), "utf8"));
const bytes = new Uint8Array(fs.readFileSync(path.join(caseDir, "source.dwfx")));

const tolMm = 1e-3;
const res = await prepareTrustedDwfxFileImport({ bytes, dwfx_file: "source.dwfx" });
const assembly = res.project_import.assembly;
const byPart = new Map(assembly.results.map((r) => [r.tube?.partNumber, r]));

test("80004806: импорт — кандидат проекта, редактируем, производство заблокировано", () => {
  assert.equal(res.status, "dwfx_project_candidate");
  assert.equal(res.editable_ready, true);
  assert.equal(res.production_ready, false);
  assert.equal(assembly.part_count, 9, "девять деталей (README: nine editable tube candidates)");
  assert.equal(assembly.editable_count, 9);
  assert.equal(assembly.blocked_count, 0);
  assert.deepEqual(assembly.duplicate_part_numbers, []);
});

test("80004806: ни одна деталь не готова к производству и компенсация станка не применена", () => {
  for (const r of assembly.results) {
    assert.equal(r.production_ready, false, `деталь ${r.tube?.partNumber}`);
    assert.equal(r.geometry?.canonical_ready, false, `деталь ${r.tube?.partNumber}`);
    assert.equal(r.canonicalization?.machineCompensationApplied ?? false, false, `деталь ${r.tube?.partNumber}`);
  }
  assert.equal(golden.invariants.machine_compensation_applied, false);
});

test("80004806: размеры всех деталей эталона совпадают с импортом", () => {
  for (const gt of golden.tubes) {
    const r = byPart.get(gt.part_number);
    assert.ok(r, `деталь ${gt.part_number} есть в импорте`);
    const rec = r.geometry.dimension_reconciliation;
    assert.ok(Math.abs(rec.metadata_outer_diameter_mm - gt.metadata.outer_diameter_mm) <= tolMm, gt.part_number);
    assert.ok(Math.abs(rec.metadata_wall_thickness_mm - gt.metadata.wall_thickness_mm) <= tolMm, gt.part_number);
    assert.ok(
      Math.abs(rec.derived_outer_diameter_mm - gt.geometry.derived_outer_diameter_mm) <= tolMm,
      `${gt.part_number}: ∅ из геометрии ${rec.derived_outer_diameter_mm}, эталон ${gt.geometry.derived_outer_diameter_mm}`
    );
    assert.ok(
      Math.abs(rec.derived_wall_thickness_mm - gt.geometry.derived_wall_thickness_mm) <= tolMm,
      `${gt.part_number}: стенка из геометрии ${rec.derived_wall_thickness_mm}, эталон ${gt.geometry.derived_wall_thickness_mm}`
    );
  }
});

test("80004806: детали с расхождением метаданных помечаются geometry_derived, а совпавшие — metadata_confirmed", () => {
  for (const gt of golden.tubes) {
    const r = byPart.get(gt.part_number);
    const rec = r.geometry.dimension_reconciliation;
    const confirmed = rec.metadata_dimension_match === true;
    assert.equal(r.geometry.dimension_source, confirmed ? "metadata_confirmed" : "geometry_derived", gt.part_number);
    // Эталон помечает расхождение как блокер производства: в импорте такая деталь не может стать metadata_confirmed.
    if (gt.metadata_conflict.dimensions) {
      assert.equal(confirmed, false, `${gt.part_number}: расхождение размеров должно сохраняться`);
    }
  }
});
