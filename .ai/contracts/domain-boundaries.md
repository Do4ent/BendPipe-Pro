# Domain boundaries and data semantics

## Truth categories

Every important value should belong to one category:

- `source`: directly present in imported CAD/metadata;
- `derived`: deterministically calculated from source evidence;
- `inferred`: selected from ambiguous evidence and therefore confidence-bearing;
- `user_confirmed`: explicitly accepted/entered by a human;
- `technology`: a manufacturing decision such as bend ordering;
- `compensated`: modified for a particular machine/tool/material calibration.

These categories must not be collapsed into one unlabeled number.

## Canonical geometry must contain
- explicit length/angle units;
- coordinate/reference frame;
- ordered centerline primitives;
- straight segment lengths;
- bend tangent points;
- CLR;
- bend angle and bend-plane orientation;
- plane rotation relation between bends where defined;
- provenance and confidence/ambiguity metadata.

## Canonical geometry must not contain
- springback correction;
- empirical bend-angle correction;
- tube elongation/shortening compensation;
- clamp/collet/tool offsets;
- pressure die, mandrel or wiper-die calibration;
- machine axis zeros, controller conventions or calibration tables.

## Unknowns
An unresolved value is represented explicitly, e.g.:

```json
{
  "value": null,
  "confidence": 0.0,
  "reason": "CLR cannot be determined uniquely from the available entities",
  "source": ["entity:42", "entity:43"],
  "method": "arc-tangent-fit-v1"
}
```

A guessed numeric fallback is not permitted unless clearly marked as a non-authoritative suggestion and never substituted into canonical geometry automatically.
