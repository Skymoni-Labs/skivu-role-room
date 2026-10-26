// Development-only mock SDK. Never included in the distributable plugin.
(()=>{
  const listeners=new Map(),clone=x=>JSON.parse(JSON.stringify(x));
  const preview={context:{roleId:'preview-role',roleName:'小羽',chatId:'preview-chat',storageScope:'story',spaceId:'a'.repeat(64),roleBound:true,chatToolsEnabled:true,callId:'preview-call'},calls:[],picked:null,saved:null,delayAI:false,pendingAI:null,failNext:null,
    emit(name,value){for(const fn of listeners.get(name)||[])fn(value);},
    change(value){Object.assign(this.context,value);this.emit('context.changed',clone(this.context));},
    read(key){const value=localStorage.getItem(key);return value===null?null:JSON.parse(value);},
    write(key,value){localStorage.setItem(key,JSON.stringify(value));}
  };
  window.__roomPreview=preview;
  window.Skivu={on(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);return()=>listeners.get(name).delete(fn);},async call(method,p={}){
    preview.calls.push({method,params:clone(p)});
    if(preview.failNext===method){preview.failNext=null;throw {code:'PERMISSION_DENIED'};}
    if(method==='host.info')return{apiVersion:'1.0',platform:'room-preview',methods:['storage.compareAndSet','ui.roleSettings','ui.chatDraft']};
    if(method==='context.get')return clone(preview.context);
    if(method==='storage.get')return preview.read(p.key);
    if(method==='storage.compareAndSet'){if(JSON.stringify(preview.read(p.key))!==JSON.stringify(p.expected))throw {code:'REVISION_CONFLICT'};preview.write(p.key,p.value);return true;}
    if(method==='ui.roleSettings')return true;
    if(method==='ui.chatDraft')return{saved:true,sent:false};
    if(method==='chat.read')return[{id:'preview-quote',role:'assistant',text:'【预览测试原话】有你在，这里就有了家的样子。'}];
    if(method==='ai.generate'){if(preview.delayAI)return new Promise(resolve=>{preview.pendingAI=()=>resolve({text:'【本地演示回复，非真实模型】我们就坐在这里，慢慢说说今天吧。'});});return{text:'【本地演示回复，非真实模型】欢迎回来，今天也想和你一起留下一点小日常。'};}
    if(method==='files.pick'){preview.emit('host.pause',null);return preview.picked;}
    if(method==='files.save'){preview.saved=clone(p);return true;}
    throw {code:'METHOD_NOT_FOUND'};
  }};
})();
