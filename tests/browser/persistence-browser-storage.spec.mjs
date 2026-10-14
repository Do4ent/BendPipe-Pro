import {test,expect} from "@playwright/test";

const appPath="/BendPipe_Pro_CAD_Workspace.html";

test("[PERSISTENCE] native IndexedDB and localStorage survive page reload",async({page})=>{
  test.setTimeout(60000);
  const response=await page.goto(appPath,{waitUntil:"commit",timeout:15000});
  expect(response?.status()).toBe(200);
  // This test intentionally uses real browser storage, not an in-memory substitute.
  const key="tb-acceptance-"+Date.now();
  const value="persist-"+Math.random().toString(36).slice(2);
  try{
    await page.evaluate(async({key,value})=>{
      localStorage.setItem(key,value);
      await new Promise((resolve,reject)=>{
        const request=indexedDB.open("tb-persistence-browser-acceptance",1);
        request.onupgradeneeded=()=>request.result.createObjectStore("fixtures");
        request.onerror=()=>reject(request.error);
        request.onsuccess=()=>{
          const db=request.result;
          const tx=db.transaction("fixtures","readwrite");
          tx.objectStore("fixtures").put(value,key);
          tx.oncomplete=()=>{db.close();resolve();};
          tx.onerror=()=>{db.close();reject(tx.error);};
          tx.onabort=()=>{db.close();reject(tx.error);};
        };
      });
    },{key,value});
    await page.reload({waitUntil:"commit",timeout:15000});
    const actual=await page.evaluate(async key=>{
      const local=localStorage.getItem(key);
      const indexed=await new Promise((resolve,reject)=>{
        const request=indexedDB.open("tb-persistence-browser-acceptance",1);
        request.onerror=()=>reject(request.error);
        request.onsuccess=()=>{
          const db=request.result;
          const tx=db.transaction("fixtures","readonly");
          const get=tx.objectStore("fixtures").get(key);
          get.onsuccess=()=>resolve(get.result);
          get.onerror=()=>reject(get.error);
          tx.oncomplete=()=>db.close();
        };
      });
      return {local,indexed};
    },key);
    expect(actual).toEqual({local:value,indexed:value});
  }finally{
    // Clean up own fixture even on assertion failures; do not touch app databases.
    await page.evaluate(async key=>{
      try{localStorage.removeItem(key);}catch{}
      try{
        await new Promise(resolve=>{
          const request=indexedDB.open("tb-persistence-browser-acceptance",1);
          request.onerror=()=>resolve();
          request.onsuccess=()=>{
            const db=request.result;
            const tx=db.transaction("fixtures","readwrite");
            tx.objectStore("fixtures").delete(key);
            tx.oncomplete=()=>{db.close();resolve();};
            tx.onerror=()=>{db.close();resolve();};
          };
        });
      }catch{}
    },key).catch(()=>{});
  }
});
