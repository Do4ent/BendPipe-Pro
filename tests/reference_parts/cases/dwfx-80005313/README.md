# DWFx source reference: 80005313

`source.dwfx` is the authoritative, byte-preserved source CAD file supplied for
BendPipe-Pro import validation. Its original name is:

`ITEM[80005313(A)]-DOC[80005313(A)]-Components WTB, DryMaster, Y-035.0 UL_CSA (2).dwfx`

- Size: 8,141,564 bytes.
- SHA-256: `5bedcbf8db5d39caf77d29938e6f0a21beef6bc4ba029fe06b5320ac6dcb6b36`.
- Container inspection: DWFx/OPC ZIP, 27 entries, one W3D resource,
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
