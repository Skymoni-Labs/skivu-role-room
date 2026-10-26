// SPDX-License-Identifier: GPL-3.0-only
import {RoomStore,friendly} from './store.js';
import {invokeTool} from './tools.js';
let running=false;
Skivu.on('companion.invoke',async event=>{
  if(running)return;running=true;let result;
  try{const store=new RoomStore((m,p)=>Skivu.call(m,p));await store.select(await Skivu.call('context.get'));result=await invokeTool(store,event.tool,event.arguments);}
  catch(error){result={success:false,error:friendly(error),code:error?.code||'TOOL_FAILED'};}
  await Skivu.call('runtime.complete',{result});
});
Skivu.call('runtime.ready',{}).catch(()=>{});
