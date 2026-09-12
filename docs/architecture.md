# Architecture baseline

## Current repository state

At the time this baseline was introduced, the repository contained only a minimal `README.md`; no application code, framework, or production module boundaries existed. Therefore this document defines domain boundaries without choosing a programming language or CAD kernel prematurely.

## Proposed logical architecture

### 1. Import / normalization

Responsibilities:
- accept DWFx, STEP, DWG, DXF and future CAD formats;
- preserve units, coordinate systems, layers, entity IDs and metadata;
- translate source entities into a neutral intermediate representation;
- report unsupported entities instead of dropping them silently.

Output: `NormalizedCadModel` plus diagnostics and provenance.

### 2. Geometry recognition

Responsibilities:
- detect candidate tube bodies/paths;
- determine tube centerline;
- split centerline into straight and bend primitives;
- calculate tangent points, CLR, bend angle and local bend plane;
- detect plane rotations between bends;
- determine geometric ordering along the tube;
- emit confidence and ambiguity for every non-certain inference.

Output: `CanonicalTubeGeometry`.

This layer represents the part as recognized/designed. It MUST NOT include springback, material elongation, clamp offsets, mandrel corrections, tooling calibration, controller zero shifts, or other machine compensation.

### 3. Bending technology

Responsibilities:
- convert canonical geometry into a manufacturable bend sequence;
- evaluate bend-order constraints, grip lengths, collisions and reachability when enough information exists;
- distinguish geometric values from technological decisions;
- report missing manufacturing inputs explicitly.

Output: `BendingPlan` referencing, but not mutating, `CanonicalTubeGeometry`.

### 4. Machine adapter / compensation

Responsibilities:
- consume a `BendingPlan` plus machine/tool/material calibration;
- calculate controller-specific compensated commands;
- keep every correction traceable to a calibration/rule source.

Output: `MachineProgram` or machine-neutral compensated operations.

This is intentionally downstream and separate from recognized geometry.

### 5. Export

Responsibilities:
- export canonical geometry, technology plans, reports, and machine programs through explicit adapters;
- never relabel compensated values as recognized geometry.

### 6. UI

Responsibilities:
- show source, recognized/inferred, user-confirmed, technological and compensated values distinctly;
- surface confidence, warnings and ambiguity reasons;
- allow a user to confirm/correct unresolved values without destroying original evidence.

## Dependency direction

Adapters depend inward on domain contracts. Geometry recognition must not depend on a specific UI or bending machine. Machine compensation may depend on canonical geometry and technology outputs, never the reverse.

## Initial implementation guidance

Before selecting libraries or folder names for production code, inspect the first real implementation and adapt these logical boundaries to its architecture rather than forcing a parallel hierarchy. The agent documents are governance contracts, not an instruction to create eight runtime microservices.
