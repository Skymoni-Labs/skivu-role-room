// SPDX-License-Identifier: GPL-3.0-only
import {RoomError,copy,scope,contextIdentity,initial,validateState} from './model.js';
export function friendly(error) {
  const messages={REVISION_CONFLICT:'房间已在其他页面更新，请刷新后再试。',NOT_BOUND:'请先为当前角色启用房间。',CANCELLED:'操作已取消。',USER_DENIED:'你已取消本次操作。',CLOSED:'插件已暂停，请重新打开。',PERMISSION_DENIED:'缺少宿主授权，请到插件设置检查权限。',PERMISSION_REQUIRED:'请先在插件设置授予所需权限。',NOT_FOUND:'原角色或聊天已不存在，请返回聊天重新选择。',model_not_available:'模型未开放或已下架，请更新模型列表并切换到当前可用模型',TIMEOUT:'请求超时；结果可能尚未确定，请刷新核对后再操作。'};
  return error instanceof RoomError?error.message:messages[error?.code]||'操作未完成，请检查连接和授权后重试。';
}
export class RoomStore {
  constructor(call){this.call=call;this.context=null;this.state=null;this.epoch=0;this.tail=Promise.resolve();}
  async select(context){const token=++this.epoch;this.context=copy(context);this.state=null;const key=scope(context);const raw=await this.call('storage.get',{key});if(token!==this.epoch)throw new RoomError('CANCELLED','角色已切换，旧房间加载已取消。');this.state=raw===null?initial(context.roleName):validateState(raw);return copy(this.state);}
  invalidate(){this.epoch++;}
  capture(){if(!this.state)throw new RoomError('NOT_READY','房间正在读取，请稍候。');return {epoch:this.epoch,context:copy(this.context),key:scope(this.context)};}
  check(token){if(token.epoch!==this.epoch||contextIdentity(token.context)!==contextIdentity(this.context))throw new RoomError('CANCELLED','角色、故事或授权已变化，本次操作已取消。');}
  transaction(change,{expectedRevision,requestId,fingerprint}={}) {
    const token=this.capture();
    const work=this.tail.then(async()=>{
      this.check(token);const raw=await this.call('storage.get',{key:token.key});this.check(token);
      const before=raw===null?initial(token.context.roleName):validateState(raw);
      if(requestId){const prior=before.requests.find(x=>x.id===requestId);if(prior){if(prior.fingerprint!==fingerprint)throw new RoomError('REPLAY_MISMATCH','同一次工具调用的内容不一致，已拒绝重复写入。');this.state=before;return copy(before);}}
      if(expectedRevision!==undefined&&before.revision!==expectedRevision)throw new RoomError('REVISION_CONFLICT','房间已更新，请重新读取后再操作。');
      const next=copy(before);change(next);next.revision=before.revision+1;next.updatedAt=Date.now();
      if(requestId){next.requests.push({id:requestId,fingerprint});next.requests=next.requests.slice(-60);}
      validateState(next);this.check(token);
      const receipt=await this.call('storage.compareAndSet',{key:token.key,expected:raw,value:next});
      if(receipt!==true)throw new RoomError('UNKNOWN_RESULT','宿主没有确认保存结果；请刷新核对，避免重复操作。');
      this.check(token);this.state=next;return copy(next);
    });this.tail=work.catch(()=>{});return work;
  }
}
