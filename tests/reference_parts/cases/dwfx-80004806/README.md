# DWFx source reference: 80004806

`source.dwfx` is the authoritative, byte-preserved source CAD file supplied for
BendPipe-Pro import validation. Its original name is:

`ITEM[80004806(-)]-DOC[80004806(-)]-Components WTB, CoolMaster, K-008.9, start pressure regulator.dwfx`

- Size: 8,538,354 bytes.
- SHA-256: `4a37c381b4d5234b98cf7b77e78271c52a1fcbfa237849a76abdd09d609ff4f7`.
- Container inspection: DWFx/OPC ZIP, 30 entries, one W3D resource,
  HSF V14.50 / W3D V01.00.
- Machine-readable provenance: `source.json`.

This case records the source CAD only. Verified canonical tube geometry,
expected dimensions, recognition tolerances, and production readiness have not
been established. Do not treat source meshes or metadata as approved centerlines,
CLR values, bend sequences, or machine-compensated dimensions.

The original file name is preserved in the provenance record. The binary is
stored as `source.dwfx` for a stable path in future reference-part tests. Add
verified expected geometry and a reference-part manifest when recognition for
this case has been independently checked; do not fabricate expectations from
unresolved input.
