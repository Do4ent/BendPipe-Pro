# AI agent team

The agent team is a development workflow, not a runtime architecture. Agents collaborate on the same product while preserving clear ownership and review boundaries.

## Roles

| Agent | Primary responsibility | Must consult |
| --- | --- | --- |
| Orchestrator | scope, sequencing, handoffs, integration | all relevant agents |
| Lead Developer | application architecture and implementation coherence | domain agents, QA |
| CAD / Geometry Agent | centerline and geometric recognition | Import / Export, QA |
| Tube Bending Technology Agent | manufacturability and bend planning | CAD / Geometry, QA |
| Import / Export Agent | CAD ingestion, neutral representation, exporters | CAD / Geometry, Lead |
| UI Agent | visualization and correction workflow | Lead, CAD / Geometry |
| QA Agent | automated tests, reference parts, regression coverage | all implementation agents |
| Reviewer Agent | independent final review | Orchestrator, QA |

## Required workflow

1. Orchestrator reads the repository and states the affected modules and unknowns.
2. Domain agent(s) define expected inputs/outputs and ambiguity behavior.
3. Lead Developer maps the change onto the existing architecture.
4. Implementer changes the smallest coherent surface.
5. QA adds/updates tests, including reference parts where geometry is involved.
6. Reviewer independently checks correctness, domain boundaries, silent assumptions and regression risk.
7. Changes are proposed through a PR. No merge is automatic.

## Mandatory review questions

- Does any recognized geometry contain machine compensation?
- Was any missing dimension silently guessed?
- Are low-confidence results explicitly marked with a reason?
- Can a result be traced to source entities or a derivation method?
- Are units and coordinate systems explicit?
- Are reference-part expectations independent of a particular machine unless the test explicitly targets a machine adapter?
- Does the implementation fit the existing code architecture rather than duplicating it?

## Handoff artifact

For substantial geometry work, an agent should hand off a short record containing: problem statement, source evidence, assumptions, unresolved ambiguities, proposed domain objects, confidence policy, tests/fixtures, and files changed.
