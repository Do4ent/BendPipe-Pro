# AI agent team

The agent team is a development workflow, not a runtime architecture. Agents collaborate on the same TubeBender product while preserving clear ownership and review boundaries.

## Domain and governance roles

| Agent | Primary responsibility | Must consult |
| --- | --- | --- |
| Orchestrator | scope, sequencing, handoffs, integration | all relevant agents |
| Lead Developer | implementation coherence and delivery decisions | architect, domain agents, QA |
| CAD / Geometry Agent | centerline and geometric recognition semantics | Import / Export, Core Developer, QA |
| Tube Bending Technology Agent | manufacturability and bend planning | CAD / Geometry, Core Developer, QA |
| Import / Export Agent | CAD ingestion semantics and export contracts | Integration Developer, CAD / Geometry |
| UI Agent | visualization and correction workflow | Lead, Core Developer, CAD / Geometry |
| QA Agent | automated tests, reference parts, regression coverage | all implementation agents |
| Reviewer Agent | independent final review | Orchestrator, QA |

## TubeBender implementation roles

| Agent | Primary responsibility | Key boundary |
| --- | --- | --- |
| Software Architect | module boundaries, dependencies, extension points | architecture follows domain, not vice versa |
| Core Application Developer | domain objects, use cases, deterministic core logic | no machine compensation in recognized geometry |
| Integration Developer | CAD SDKs/parsers, external services, machine adapters | third-party models stay at the edge |
| Project Data / Persistence Agent | project files, schemas, migrations, serialization | recognized/user/machine data remain distinguishable |
| Build / Release Agent | build, CI, packaging, release reproducibility | no auto-publish/merge without approval |
| Performance / Reliability Agent | profiling, diagnostics, cancellation, robustness | correctness before optimization |

These implementation agents are responsible for actually writing the program. They do not replace the CAD, bending-technology or QA specialists; they implement contracts approved by those specialists.

## Required workflow

1. Orchestrator reads the repository and states the affected modules and unknowns.
2. Domain agent(s) define expected inputs/outputs, units, tolerances and ambiguity behavior.
3. Software Architect maps the feature onto the current architecture when an architectural decision is needed.
4. Lead Developer assigns implementation to Core, Integration, Persistence, UI or other relevant agents.
5. Implementer changes the smallest coherent surface and adds local tests.
6. QA adds/updates unit, integration and reference-part regression coverage.
7. Performance / Reliability checks expensive or failure-prone paths when relevant.
8. Reviewer independently checks correctness, domain boundaries, silent assumptions and regression risk.
9. Changes are proposed through a PR. No merge is automatic.

## Mandatory review questions

- Does any recognized geometry contain machine compensation?
- Was any missing dimension silently guessed?
- Are low-confidence results explicitly marked with a reason?
- Can a result be traced to source entities or a derivation method?
- Are units, tolerances and coordinate systems explicit?
- Are third-party CAD/SDK types isolated from the core domain where practical?
- Are reference-part expectations independent of a particular machine unless the test explicitly targets a machine adapter?
- Does persistence preserve the distinction between imported, recognized, inferred, user-confirmed and machine-compensated values?
- Does the implementation fit the existing code architecture rather than duplicating it?

## Handoff artifact

For substantial work, an agent should hand off a short record containing: problem statement, source evidence, assumptions, unresolved ambiguities, proposed/changed domain objects, confidence policy, tests/fixtures, performance implications when relevant, and files changed.
