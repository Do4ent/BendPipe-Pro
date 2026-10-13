# Additional real DWFx validation

Source bytes and `source.json` remain unchanged. No source dimension or canonical reference certification has been added.

## Rendering-options decoding

Both additional sources originally stopped at `TKE_Rendering_Options` mask `0x1`. The DWF Toolkit defines this as `TKO_Interp_Texture_Faces`, a texture-interpolation toggle. Its `TK_Rendering_Options::Read/Write` consumes only the existing mask/value pair for this bit; there is no additional payload. The decoder now accepts this one bit and preserves its raw mask/value. Other unsupported and extended masks still stop at the opcode start.

Primary toolkit code: [enum](https://github.com/kveretennicov/dwf-toolkit/blob/master/develop/global/src/dwf/w3dtk/BOpcodeHandler.h#L2541), [Read/Write](https://github.com/kveretennicov/dwf-toolkit/blob/master/develop/global/src/dwf/w3dtk/BOpcodeHandler.cpp#L10309).

The binary regression verifies enabled/disabled values, the following tag at byte offset 9, termination, and refusal of a mixed unknown mask. It does not scan for resynchronization or alter mesh coordinates.

## Recognition outcomes after the fix

| Source | Exact HSF-linked parts | Editable candidates | Blocked parts | Project package |
| --- | --- | --- | --- | --- |
| 80005311 | 9 | 6 | 3 | blocked |
| 80005313 | 9 | 0 | 9 | blocked |

For 80005311, two parts fail the tube OD/wall / side-surface match; one reaches canonical evidence but cannot map to legacy rows because the first line and oriented bend-plane normal exceed the orthogonality tolerance. For 80005313, all parts fail the current exact tube-surface recognition constraints. These are recognition/mapping limitations, not missing corpus dimensions.

The importer retains all nine result records rather than dropping failed parts. Supplying a caller test bbox does not bypass the unresolved assembly. The new real-source regressions preserve SHA-256, source provenance, nominal/corrected boundaries and `production_ready:false`. Known geometry candidates are not promoted to verified manufacturing programs.
