// Development-only static preview. No model proxy or external HTTP requests.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function previewServer(){return http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1'),name=decodeURIComponent(url.pathname);
    if(req.method!=='GET'||name.includes('..')||name.includes('\\')){res.writeHead(400).end();return;}
    const file=name==='/skivu-sdk.js'?path.join(root,'tools/preview-sdk.js'):path.join(root,'src',name==='/'?'index.html':name.slice(1));
    const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});res.end(await readFile(file));
  }catch{if(!res.headersSent)res.writeHead(404);res.end();}
});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=previewServer();server.listen(Number(process.env.ROOM_PREVIEW_PORT||57110),'127.0.0.1',()=>console.log(`角色房间交互预览（模拟SDK）：http://127.0.0.1:${server.address().port}`));
}
