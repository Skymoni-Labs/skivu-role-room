// SPDX-License-Identifier: GPL-3.0-only
import {RoomError,activities,text,perform,copy,roomSummary} from './model.js';
export async function invokeTool(store,tool,args={}) {
  if(!args||typeof args!=='object'||Array.isArray(args))throw new RoomError('INVALID_ARGUMENT','工具参数无效。');
  if(tool==='read_room'){
    if(Object.keys(args).length)throw new RoomError('INVALID_ARGUMENT','读取房间不接收额外参数。');
    const state=store.state;return {success:true,fictional:true,revision:state.revision,summary:roomSummary(state),items:copy(state.items),recentDiary:state.diary.slice(-8).map(row=>({...row,text:row.text.slice(0,800),truncated:row.text.length>800})),totalDiaryCount:state.diary.length,diaryTextLimit:800,activities:Object.keys(activities)};
  }
  if(tool!=='update_room')throw new RoomError('INVALID_ARGUMENT','不支持这个房间工具。');
  if(Object.keys(args).some(k=>!['activity','note','expected_revision','source'].includes(k))||!Number.isSafeInteger(args.expected_revision)||args.expected_revision<0||!['conversation','role_story'].includes(args.source))throw new RoomError('INVALID_ARGUMENT','请先读取房间，并提供活动、来源和读取时的版本。');
  const input={activity:args.activity,note:text(args.note??'',400,'剧情手记',{empty:true}),source:args.source};
  const requestId=text(store.context.callId,180,'宿主调用标识');
  const state=await store.transaction(s=>perform(s,input.activity,input.note,Date.now(),input.source),{expectedRevision:args.expected_revision,requestId,fingerprint:JSON.stringify(input)});
  return {success:true,fictional:true,revision:state.revision,card:{title:state.title,summary:state.activity,action:'open-room',payload:{}},summary:'已更新虚构房间记录；其他模块与现实软件未被直接修改。'};
}
