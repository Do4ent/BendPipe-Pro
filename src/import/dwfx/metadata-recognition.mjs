function finiteOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function exactMetadataValue(value, source, unit = null) {
  return Object.freeze({
    value,
    confidence: 1,
    reason: null,
    method: "dwfx_inventor_properties",
    source: Object.freeze([source]),
    truth_category: "source",
    ...(unit ? { unit } : {})
  });
}

function unresolvedGeometry(reason, source) {
  return Object.freeze({
    status: "unresolved",
    production_ready: false,
    confidence: 0,
    reason,
    source: Object.freeze([source]),
    canonical_geometry: null
  });
}

/**
 * Convert the historical 80003043-style DWFx recognition JSON into a strict
 * metadata recognition result.
 *
 * Important: rows marked as recognized-placeholder-line are evidence only.
 * They are never promoted into canonical geometry.
 */
export function normalizeDwfxMetadataRecognition(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("input must be an object");
  }
  if (input?.source?.format !== "DWFx") {
    throw new RangeError("input source format must be DWFx");
  }

  const sourceFile = String(input?.source?.file || "");
  if (!sourceFile) {
    throw new RangeError("DWFx source file name is required");
  }

  const tubes = Array.isArray(input?.project?.tubes) ? input.project.tubes : [];

  return Object.freeze({
    source: Object.freeze({
      format: "DWFx",
      file: sourceFile,
      recognition: input?.source?.recognition ?? null,
      recognized_at: input?.source?.recognizedAt ?? null
    }),
    recognition_status: Object.freeze({
      metadata_only: true,
      production_ready: false,
      bend_sequence:
        input?.recognitionStatus?.bendSequence ?? "not_extracted",
      note: input?.recognitionStatus?.note ?? null
    }),
    tubes: Object.freeze(
      tubes.map((tube) => {
        const partNumber = String(tube?.partNumber || "");
        const sourceRef = partNumber
          ? `dwfx:${sourceFile}#part:${partNumber}`
          : `dwfx:${sourceFile}#tube:${String(tube?.id || "unknown")}`;

        const placeholderRows = Array.isArray(tube?.rows)
          ? tube.rows.filter(
              (row) => row?.elementId === "recognized-placeholder-line"
            )
          : [];

        const od = finiteOrNull(tube?.outerDiameterMm);
        const wall = finiteOrNull(tube?.wallThicknessMm);
        const developed = finiteOrNull(tube?.developedLengthMm);

        return Object.freeze({
          id: String(tube?.id || ""),
          part_number: partNumber || null,
          revision: tube?.revision ?? null,
          quantity_in_assembly: finiteOrNull(tube?.quantityInAssembly),
          material: tube?.material ?? null,
          metadata: Object.freeze({
            outer_diameter:
              od === null ? null : exactMetadataValue(od, sourceRef, "mm"),
            wall_thickness:
              wall === null ? null : exactMetadataValue(wall, sourceRef, "mm"),
            developed_length:
              developed === null
                ? null
                : exactMetadataValue(developed, sourceRef, "mm")
          }),
          geometry: unresolvedGeometry(
            placeholderRows.length
              ? "Historical rows are full-length placeholder straights; binary W3D centerline has not been extracted."
              : "Binary W3D centerline has not been extracted.",
            sourceRef
          ),
          source_evidence: Object.freeze({
            original_geometry_recognition: clone(tube?.geometryRecognition ?? null),
            placeholder_rows: Object.freeze(clone(placeholderRows))
          })
        });
      })
    )
  });
}
