// SPDX-License-Identifier: GPL-3.0-only
import {RoomStore,friendly} from './store.js';
import {copy,furniture,activities,perform,move,text,addDiary,RoomError,contextIdentity} from './model.js';
import {RoomConversation,chatDraft,backup,encodeFile,readPickedBackup} from './interactions.js';
import {scene,escape} from './scene.js';
const $=id=>document.getElementById(id),sdk=globalThis.Skivu;
const call=(method,params={})=>sdk.call(method,params);
const store=new RoomStore(call),conversation=new RoomConversation(store);let busy=false,loadSerial=0,selected=null,draft=null;
const icons={sit:'♧',read:'▤',water:'♧',listen:'♫',rest:'☾',tidy:'✧'};
function notice(message,error=false){$('notice').textContent=message;$('notice').className=error?'error':'';$('notice').hidden=!message;}
function dialog(title,body,buttons){const d=$('dialog');$('dialog-content').innerHTML=`<h2>${escape(title)}</h2>${body}<div class="buttons">${buttons}</div>`;if(!d.open)d.showModal();return d;}
function close(){draft=null;$('dialog').close();$('dialog-content').textContent='';if(store.state)renderScene();}
$('dialog').addEventListener('cancel',event=>{event.preventDefault();close();});
function renderScene(){if(store.state)$('scene').innerHTML=scene(draft||store.state,store.context.roleName,selected);}
function render(){
  const state=store.state;if(!state)return;
  $('content').hidden=false;$('not-bound').hidden=true;$('loading').hidden=true;$('decorate').disabled=false;
  $('room-title').textContent=state.title;$('scope-label').textContent=`${store.context.storageScope==='story'?'各故事独立':'同角色共用'} · ${state.updatedAt?'已保存到本机':'等你留下第一笔日常'}`;
  $('owner-label').textContent=`${store.context.roleName||'TA'} 在房间里`;$('activity').textContent=state.activity;
  $('ambience').textContent=state.ambience==='day'?'☀ 白天':'☾ 夜晚';renderScene();
  $('actions').innerHTML=Object.entries(activities).map(([id,a])=>`<button class="action" data-action="${id}" ${state.items.find(x=>x.id===a.item).visible?'':'disabled'}><span>${icons[id]}</span>${a.label}</button>`).join('');
  $('conversation').innerHTML=state.conversation.length?state.conversation.map(row=>`<div class="bubble ${row.role}">${escape(row.text)}</div>`).join(''):'<div class="conversation-empty">给 TA 留一句话，让故事从这里开始。</div>';
  $('conversation').scrollTop=$('conversation').scrollHeight;
  $('diary-count').textContent=`${state.diary.length} 则`;
  $('diary').innerHTML=state.diary.length?state.diary.slice(-6).reverse().map(row=>`<article class="diary-entry"><time>${escape(new Date(row.at).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))} · ${row.kind==='model'?'角色原话':row.kind==='local'?'房间互动':row.kind==='manual'?'手写日常':'角色剧情'}</time><p>${escape(row.text)}</p><button data-delete="${escape(row.id)}" aria-label="删除这条手记">×</button></article>`).join(''):'<div class="empty-journal">还没有手记。和 TA 做一件小事，或把今天想记住的话留在这里。</div>';
}
async function mutate(change,message='已保存。',expected=store.state?.revision){
  if(busy)return;busy=true;try{await store.transaction(change,{expectedRevision:expected});render();notice(message);return true;}catch(error){notice(friendly(error),true);return false;}finally{busy=false;}
}
async function load(){
  const serial=++loadSerial;conversation.cancel();close();$('content').hidden=true;$('loading').hidden=false;$('decorate').disabled=true;
  try{
    const context=await call('context.get');if(serial!==loadSerial)return;
    await store.select(context);if(serial!==loadSerial)return;render();notice('');
  }catch(error){if(serial!==loadSerial)return;$('loading').hidden=true;$('not-bound').hidden=true;
    if(error?.code==='NOT_BOUND')$('not-bound').hidden=false;
    notice(friendly(error),true);
  }
}
function openNote(value='',kind='manual'){
  dialog('留下一笔日常',`<label for="note-text">想记住的片刻</label><textarea id="note-text" maxlength="2000" rows="5">${escape(value)}</textarea><p>保存到当前房间手记，不会自动写入原聊天或其他插件。</p>`, '<button class="quiet" data-close>取消</button><button id="save-note" class="primary">保存手记</button>');
  $('save-note').onclick=async()=>{let content;try{content=text($('note-text').value,2000,'手记');}catch(e){notice(friendly(e),true);return;}$('save-note').disabled=true;if(await mutate(s=>addDiary(s,content,kind),'这句话已经留在房间里了。'))close();else if($('save-note'))$('save-note').disabled=false;};
}
function showDecorate(){
  draft=copy(store.state);selected=selected||'sofa';renderDecorate();
}
function renderDecorate(){
  const version=store.state.revision;
  dialog('把房间布置成喜欢的样子',`<label for="room-name">房间名称</label><input id="room-name" maxlength="80" value="${escape(draft.title)}"><label>房间色调</label><div class="theme-options">${[['peach','奶油杏'],['sage','鼠尾草'],['lavender','浅丁香']].map(([id,name])=>`<button data-theme="${id}" aria-pressed="${draft.theme===id}">${name}</button>`).join('')}</div><label>家具位置</label><p>箭头沿地板方向移动；同一格只放一件家具。隐藏家具会停用对应互动。</p><div id="furniture-editor">${draft.items.map(item=>`<div class="furniture-row"><span>${furniture[item.id].name} <small>(${item.x+1},${item.y+1})</small></span><button data-toggle="${item.id}" aria-label="${item.visible?'收起':'放回'}${furniture[item.id].name}">${item.visible?'收起':'放回'}</button><button data-move="${item.id}:0:-1" aria-label="向后移动${furniture[item.id].name}">↗</button><button data-move="${item.id}:-1:0" aria-label="向左移动${furniture[item.id].name}">↖</button><button data-move="${item.id}:1:0" aria-label="向右移动${furniture[item.id].name}">↘</button><button data-move="${item.id}:0:1" aria-label="向前移动${furniture[item.id].name}">↙</button></div>`).join('')}</div>`, '<button class="quiet" data-close>取消</button><button id="save-decorate" class="primary">保存布置</button>');
  $('room-name').oninput=()=>{draft.title=$('room-name').value;};
  $('save-decorate').onclick=async()=>{let title;try{title=text($('room-name').value,80,'房间名称');}catch(e){notice(friendly(e),true);return;}const value=copy(draft);value.title=title;$('save-decorate').disabled=true;if(await mutate(s=>Object.assign(s,value),'房间布置已保存。',version))close();else if($('save-decorate'))$('save-decorate').disabled=false;};
}
async function moduleSettings(){try{await call('ui.roleSettings');await load();}catch(e){notice(friendly(e),true);}}
async function toChat(){if(busy)return;busy=true;try{await chatDraft(store);notice('已放入原聊天草稿，尚未发送。');}catch(e){notice(friendly(e),true);}finally{busy=false;}}
$('talk-form').onsubmit=async event=>{
  event.preventDefault();if(conversation.busy||!store.state)return;const input=$('talk').value;let valid;try{valid=text(input,2000,'消息');}catch(e){notice(friendly(e),true);return;}
  $('talk-send').disabled=true;$('cancel-ai').hidden=false;$('talk-status').textContent='正在等 TA 回应…';notice('');
  const context=contextIdentity(store.context);
  try{await conversation.send(valid);if(context!==contextIdentity(store.context))return;$('talk').value='';render();notice('房间对话已保存。');}
  catch(e){if(context===contextIdentity(store.context))notice(friendly(e),true);}
  finally{$('talk-send').disabled=false;$('cancel-ai').hidden=true;$('talk-status').textContent='回复通过宿主当前模型生成';}
};
$('cancel-ai').onclick=()=>{conversation.cancel();$('cancel-ai').hidden=true;$('talk-status').textContent='已取消；正在结束原请求';notice('迟到的回复不会保存。已发送的模型请求仍可能产生用量。');};
$('ambience').onclick=()=>mutate(s=>{s.ambience=s.ambience==='day'?'night':'day';},'房间灯光已切换。');
$('decorate').onclick=showDecorate;$('new-note').onclick=()=>openNote();$('modules').onclick=moduleSettings;$('bind').onclick=moduleSettings;$('connect-modules').onclick=moduleSettings;$('connect-chat').onclick=toChat;$('chat-draft').onclick=toChat;$('refresh').onclick=load;
$('all-notes').onclick=()=>{dialog('房间的全部手记',store.state.diary.length?store.state.diary.slice().reverse().map(row=>`<article class="quote"><small>${escape(new Date(row.at).toLocaleString('zh-CN'))}</small><p>${escape(row.text)}</p><button class="quiet" data-delete="${escape(row.id)}">删除这条手记</button></article>`).join(''):'<p>房间还没有手记。</p>','<button class="quiet" data-close>关闭</button>');};
$('capture-quote').onclick=async()=>{const token=store.capture();try{const messages=await call('chat.read',{limit:30});store.check(token);if(!Array.isArray(messages))throw new RoomError('INVALID_RESPONSE','聊天记录格式无效。');const words=messages.filter(m=>m.role==='assistant'&&typeof m.text==='string'&&m.text.trim()).slice(-8).reverse();dialog('收下 TA 说过的话',words.length?words.map((m,i)=>`<button class="quote" data-quote="${i}">${escape(m.text.slice(0,2000))}</button>`).join(''):'<p>当前聊天还没有可选的角色发言。先和 TA 聊聊吧。</p>','<button class="quiet" data-close>关闭</button>');$('dialog-content').querySelectorAll('[data-quote]').forEach(b=>b.onclick=()=>openNote(words[Number(b.dataset.quote)].text.slice(0,2000),'model'));}catch(e){notice(friendly(e),true);}};
$('export').onclick=async()=>{try{const token=store.capture(),content=backup(store.state,token.context);const result=await call('files.save',{name:'role-room-backup.json',mime:'application/json',base64:encodeFile(content)});notice(result===true?'备份已保存到你选择的位置。':'已取消导出。');}catch(e){notice(friendly(e),true);}};
$('import').onclick=async()=>{const original=store.capture();try{const file=await call('files.pick');if(file===null){notice('已取消导入。');return;}const {value,token,revision}=await readPickedBackup(store,file,original);render();dialog('恢复这间房间？',`<p>将用备份「${escape(value.title)}」替换当前房间的布置、手记与房间对话。其他模块不受影响。建议先导出当前存档。</p>`,'<button class="quiet" data-close>取消</button><button id="confirm-import" class="primary">确认恢复</button>');$('confirm-import').onclick=async()=>{try{store.check(token);$('confirm-import').disabled=true;if(await mutate(s=>{const revision=s.revision;Object.assign(s,copy(value));s.revision=revision;},'房间备份已恢复。',revision))close();else if($('confirm-import'))$('confirm-import').disabled=false;}catch(e){notice(friendly(e),true);close();}};}catch(e){notice(friendly(e),true);}};
document.addEventListener('click',event=>{
  const target=event.target.closest('button,[data-item]');if(!target)return;
  if(target.hasAttribute('data-close')){close();return;}
  if(target.dataset.action){mutate(s=>perform(s,target.dataset.action),'记下了这次房间互动。');return;}
  if(target.dataset.item){selected=target.dataset.item;renderScene();const action=Object.entries(activities).find(([,a])=>a.item===selected);if(action){dialog(furniture[selected].name,`<p>${escape(action[1].text)}</p><p>这是虚构房间内的互动。你也可以把话题带回原聊天，让其他已绑定模块接着记录。</p>`,`<button class="quiet" data-close>先看看</button><button class="primary" id="furniture-action">${action[1].label}</button>`);$('furniture-action').onclick=async()=>{if(await mutate(s=>perform(s,action[0]),'这个片刻已经留在房间里。'))close();};}else{moduleSettings();}return;}
  if(target.dataset.theme&&draft){draft.theme=target.dataset.theme;renderDecorate();renderScene();return;}
  if(target.dataset.toggle&&draft){const item=draft.items.find(x=>x.id===target.dataset.toggle);if(!item.visible&&draft.items.some(x=>x.id!==item.id&&x.visible&&x.x===item.x&&x.y===item.y)){notice('原位置已有家具，请先移动再放回。',true);return;}item.visible=!item.visible;renderDecorate();renderScene();return;}
  if(target.dataset.move&&draft){try{const [id,x,y]=target.dataset.move.split(':');move(draft,id,Number(x),Number(y));selected=id;renderDecorate();renderScene();}catch(e){notice(friendly(e),true);}return;}
  if(target.dataset.delete){const id=target.dataset.delete,version=store.state.revision;dialog('删除这条房间手记？','<p>只删除本房间的这一条记录。</p>','<button class="quiet" data-close>取消</button><button class="primary" id="confirm-delete">删除</button>');$('confirm-delete').onclick=async()=>{if(await mutate(s=>{s.diary=s.diary.filter(x=>x.id!==id);},'手记已删除。',version))close();};}
});
$('scene').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.hasAttribute('data-item')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
async function boot(){
  if(!sdk||typeof sdk.call!=='function'||typeof sdk.on!=='function'){$('loading').hidden=true;notice('请从 Skivu 0.2.41 或更新版本安装并打开角色房间。',true);return;}
  try{const info=await call('host.info');if(!Array.isArray(info.methods)||!info.methods.includes('storage.compareAndSet'))throw new RoomError('UNSUPPORTED_HOST','请更新到支持原子存档的 Skivu 0.2.41 或更新版本。');
    if(info.platform==='room-preview')$('preview-banner').hidden=false;
    sdk.on('context.changed',()=>{store.invalidate();conversation.cancel();load();});
    sdk.on('host.suspend',()=>{store.invalidate();conversation.cancel();$('content').hidden=true;notice('插件已暂停，请返回角色重新打开。');});
    sdk.on('host.pause',()=>{store.invalidate();conversation.cancel();});
    sdk.on('storage.changed',()=>{if(!busy&&!conversation.busy)load();});
    await load();
  }catch(e){$('loading').hidden=true;notice(friendly(e),true);}
}
boot();
