import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {resolve,extname} from 'node:path';
// The development adapter uses the exact same handler as the deployed Worker.
import worker from './src/worker.js';
const root=resolve('public');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{try{
 let local={};try{local=parseEnv(await readFile('.env','utf8'));}catch{}
 const env={...process.env,...local,ASSETS:{async fetch(request){const url=new URL(request.url);const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+'/'))return new Response('Not found',{status:404});try{return new Response(await readFile(path),{headers:{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'}});}catch{return new Response('Not found',{status:404});}}}};
 const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
 const request=new Request('http://127.0.0.1:4173'+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
 const result=await worker.fetch(request,env);res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
 }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'The local server could not complete the request.'}));}}).listen(4173,'127.0.0.1',()=>console.log('FORGE preview: http://127.0.0.1:4173'));
