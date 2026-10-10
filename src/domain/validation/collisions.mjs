import { ValidationStatus } from "./results.mjs";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function involvesTube(collision, tubeId) {
  return collision?.tubeAId === tubeId || collision?.tubeBId === tubeId;
}

/**
 * Summarize project collision analysis without filtering the project truth
 * down to the currently active tube.
 *
 * The active-tube and whole-project statuses are deliberately separate.
 */
export function summarizeCollisionValidation({
  collisions,
  activeTubeId
}) {
  const all = asArray(collisions);
  const active = activeTubeId
    ? all.filter((collision) => involvesTube(collision, activeTubeId))
    : [];

  const activeSelf = active.filter((collision) => collision?.self === true);
  const activeOther = active.filter((collision) => collision?.self !== true);
  const inactiveOnly = activeTubeId
    ? all.filter((collision) => !involvesTube(collision, activeTubeId))
    : [...all];

  return Object.freeze({
    active_tube: Object.freeze({
      tube_id: activeTubeId ?? null,
      status:
        active.length === 0
          ? ValidationStatus.PASSED
          : ValidationStatus.VIOLATION,
      collision_count: active.length,
      self_collision_count: activeSelf.length,
      intertube_collision_count: activeOther.length
    }),
    project: Object.freeze({
      status:
        all.length === 0
          ? ValidationStatus.PASSED
          : ValidationStatus.VIOLATION,
      collision_count: all.length,
      inactive_only_collision_count: inactiveOnly.length
    })
  });
}
