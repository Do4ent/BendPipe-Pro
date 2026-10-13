import test from "node:test";
import assert from "node:assert/strict";
import {
  lockPermission,
  lockStateOf,
  mostRestrictiveLockMode,
  setLockMode
} from "../../src/domain/editing/object-locks.mjs";

test("question 71: Lock Object blocks editing but keeps view measure and Snap",()=>{
  const object={id:"tube-1"};
  setLockMode(object,"Object");
  for(const action of ["move","rotate","delete","scale","properties","geometry","technology","tooling","array","transform-stack","break-link"]){
    const permission=lockPermission(object,action);
    assert.equal(permission.allowed,false,action);
    assert.equal(permission.reason,"Объект заблокирован");
  }
  for(const action of ["view","measure","snap","show","hide","transparent","isolate","compare"]){
    assert.equal(lockPermission(object,action).allowed,true,action);
  }
});

test("question 71: Lock Position blocks only position and orientation changes",()=>{
  const object={id:"tube-1"};
  setLockMode(object,"Position");
  for(const action of ["move","rotate","scale","position","orientation","transform","transform-stack"]){
    assert.equal(lockPermission(object,action).allowed,false,action);
  }
  for(const action of ["properties","geometry","technology","delete","array","view","measure","snap"]){
    assert.equal(lockPermission(object,action).allowed,true,action);
  }
});

test("question 71: lock mode is normalized and removable",()=>{
  const object={id:"x"};
  assert.equal(lockStateOf(object).mode,"Unlocked");
  setLockMode(object,"Position");
  assert.equal(lockStateOf(object).mode,"Position");
  setLockMode(object,"Object");
  assert.equal(lockStateOf(object).mode,"Object");
  setLockMode(object,"Unlocked");
  assert.equal(lockStateOf(object).mode,"Unlocked");
  assert.equal("lock_state" in object,false);
});

test("question 71: Object lock is more restrictive than Position",()=>{
  assert.equal(mostRestrictiveLockMode([{lock_state:{mode:"Position"}},{lock_state:{mode:"Object"}}]),"Object");
  assert.equal(mostRestrictiveLockMode([{lock_state:{mode:"Position"}},{}]),"Position");
});
