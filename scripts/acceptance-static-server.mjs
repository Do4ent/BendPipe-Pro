import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const port=Number(process.env.PORT||4178);
const basename="TubeBender_CAD_VC207R7_M1_Standalone.html";
const allowed=new Set([basename,"BendPipe_Pro_CAD_Workspace_Prototype.html"]);
http.createServer((req,res)=>{
  const requested=decodeURIComponent((req.url||"/").split("?")[0]);
  const filename=requested==="/"?basename:requested.slice(1);
  if(!allowed.has(filename)){
    res.writeHead(404);res.end("Not found");return;
  }
  const filepath=path.resolve("dist",filename);
  fs.stat(filepath,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(503);res.end("Standalone artifact is missing");return;}
    res.writeHead(200,{"Content-Type":"text/html; charset=utf-8",
      "Content-Length":stat.size,"Cache-Control":"no-store"});
    fs.createReadStream(filepath).pipe(res);
  });
}).listen(port,"127.0.0.1",()=>console.log("TubeBender acceptance server listening on "+port));
