// SPDX-License-Identifier: GPL-3.0-only
import {RoomError,text,roomSummary,scope,parseBackup,contextIdentity,MAX_BACKUP_BYTES} from './model.js';
export function modelHistory(rows){
  const result=[],encoder=new TextEncoder();
  for(const row of rows.slice(-16).reverse()){
    const next=[{role:row.role,content:row.text},...result];
    if(encoder.encode(JSON.stringify(next)).length>48000)break;
    result.unshift(next[0]);
  }
  return result;
}
export class RoomConversation {
  constructor(store){this.store=store;this.serial=0;this.busy=false;}
  cancel(){this.serial++;}
  async send(input){
    if(this.busy)throw new RoomError('BUSY','上一条模型请求仍在结束，请稍候再发送。');
    const message=text(input,2000,'消息'),token=this.store.capture(),snapshot=this.store.state;
    const serial=++this.serial;this.busy=true;
    try {
      const reply=await this.store.call('ai.generate',{roleId:token.context.roleId,
        instruction:`在当前角色设定下与用户进行一段自然的房间对话。以下是虚构角色房间，不代表现实设备操作。只回复文字，不伪造其他插件写入或现实操作结果。房间背景：${roomSummary(snapshot)}\n用户说：${message}`,
        context:modelHistory(snapshot.conversation),maxOutput:700});
      if(serial!==this.serial)throw new RoomError('CANCELLED','已取消本次回复；迟到的结果不会保存。');
      this.store.check(token);const answer=text(reply?.text,4000,'模型回复');
      return await this.store.transaction(state=>{const at=Date.now();state.conversation.push({role:'user',text:message,at},{role:'assistant',text:answer,at});state.conversation=state.conversation.slice(-40);},{expectedRevision:snapshot.revision});
    } finally {this.busy=false;}
  }
}
export async function chatDraft(store){
  const token=store.capture(),state=store.state;const message=`我们回到${state.title}。${state.activity}\n想和你聊聊今天的房间日常。`;
  store.check(token);const receipt=await store.call('ui.chatDraft',{text:message});
  if(receipt?.saved!==true||receipt?.sent!==false)throw new RoomError('UNKNOWN_RESULT','尚未确认聊天草稿的保存结果，请返回聊天核对，避免重复添加。');
  return receipt;
}
export function backup(state,context){return JSON.stringify({format:'skivu-role-room/v1',scope:scope(context),roleId:context.roleId,state},null,2);}
export function encodeFile(content){const bytes=new TextEncoder().encode(content);let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(raw);}
export function decodeBackup(file,context){if(!file||typeof file.base64!=='string'||file.base64.length>Math.ceil(MAX_BACKUP_BYTES/3)*4)throw new RoomError('INVALID_BACKUP','请选择不超过2 MiB的房间JSON备份。');let raw;try{const bytes=Uint8Array.from(atob(file.base64),x=>x.charCodeAt(0));raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new RoomError('INVALID_BACKUP','备份文件编码无效。');}return parseBackup(raw,context);}
export async function readPickedBackup(store,file,original){
  // A native system picker pauses the Activity. Re-read authoritative context
  // after returning; never apply the old file to a newly selected room.
  const latest=await store.call('context.get');
  if(contextIdentity(latest)!==contextIdentity(original.context))throw new RoomError('CANCELLED','选择文件期间角色或故事已变化，请重新导入。');
  const value=decodeBackup(file,latest);await store.select(latest);
  return {value,token:store.capture(),revision:store.state.revision};
}
