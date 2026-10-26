// SPDX-License-Identifier: GPL-3.0-only
export const furniture = Object.freeze({
  bed: {name:'软软的床',x:1,y:1}, desk:{name:'写字桌',x:5,y:1},
  shelf:{name:'小书架',x:0,y:4}, sofa:{name:'双人沙发',x:3,y:4},
  plant:{name:'绿植',x:6,y:3}, record:{name:'唱片机',x:5,y:5}, phone:{name:'小手机',x:3,y:1}
});
export const activities = Object.freeze({
  sit:{label:'坐一会儿',item:'sofa',text:'在沙发上坐下来，留一点时间给彼此。'},
  read:{label:'一起读书',item:'shelf',text:'拿起一本书，把喜欢的那一页留在这里。'},
  water:{label:'照顾绿植',item:'plant',text:'给窗边的绿植浇水，陪它慢慢长大。'},
  listen:{label:'听张唱片',item:'record',text:'在房间故事里放上一张喜欢的唱片。'},
  rest:{label:'晚安休息',item:'bed',text:'整理好被角，给今天一个温柔的结尾。'},
  tidy:{label:'整理房间',item:'desk',text:'收好桌上的小物件，让房间重新清爽起来。'}
});
export class RoomError extends Error { constructor(code,message){super(message);this.code=code;} }
export const copy=value=>JSON.parse(JSON.stringify(value));
export const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function text(value,max,label,{empty=false}={}) {
  if(typeof value!=='string'||value.length>max||(!empty&&!value.trim())||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))throw new RoomError('INVALID_ARGUMENT',`${label}格式不正确。`);
  return value.trim();
}
function exact(o,keys,label){if(!object(o)||Object.keys(o).some(k=>!keys.includes(k)))throw new RoomError('INVALID_ARGUMENT',`${label}字段不正确。`);}
export function scope(context) {
  if(context?.roleBound!==true||typeof context.roleId!=='string'||!context.roleId||context.roleId.length>160)throw new RoomError('NOT_BOUND','请先在随身模块中，为当前角色启用房间。');
  if(context.storageScope==='story') {
    if(!/^[a-f0-9]{64}$/.test(context.spaceId||''))throw new RoomError('INVALID_CONTEXT','故事空间尚未就绪，请返回聊天后重新打开。');
    return `room:v1:story:${context.spaceId}`;
  }
  if(context.storageScope!=='role')throw new RoomError('INVALID_CONTEXT','不支持当前存档范围，请更新宿主。');
  return `room:v1:role:${encodeURIComponent(context.roleId)}`;
}
export const contextIdentity=c=>JSON.stringify([c?.roleId,c?.chatId,c?.storageScope,c?.spaceId,c?.roleBound,c?.chatToolsEnabled]);
export function initial(name='TA') {
  return {schemaVersion:1,revision:0,title:`${String(name).slice(0,50)||'TA'}的小房间`,theme:'peach',ambience:'day',
    items:Object.entries(furniture).map(([id,p])=>({id,x:p.x,y:p.y,visible:true})),position:'sofa',activity:'欢迎回来，房间一直为你留着灯。',
    diary:[],conversation:[],requests:[],updatedAt:null};
}
export function validateState(value) {
  exact(value,['schemaVersion','revision','title','theme','ambience','items','position','activity','diary','conversation','requests','updatedAt'],'存档');
  if(value.schemaVersion!==1||!Number.isSafeInteger(value.revision)||value.revision<0||value.revision>=Number.MAX_SAFE_INTEGER)throw new RoomError('CORRUPT_ARCHIVE','存档版本无效，请保留备份后检查。');
  text(value.title,80,'房间名称');text(value.activity,400,'活动描述');
  if(!['peach','sage','lavender'].includes(value.theme)||!['day','night'].includes(value.ambience)||!own(furniture,value.position))throw new RoomError('CORRUPT_ARCHIVE','房间外观无效。');
  if(!Array.isArray(value.items)||value.items.length!==Object.keys(furniture).length)throw new RoomError('CORRUPT_ARCHIVE','家具存档不完整。');
  const ids=new Set(),tiles=new Set();
  for(const item of value.items){exact(item,['id','x','y','visible'],'家具');if(!own(furniture,item.id)||ids.has(item.id)||typeof item.visible!=='boolean'||![item.x,item.y].every(n=>Number.isInteger(n)&&n>=0&&n<=6))throw new RoomError('CORRUPT_ARCHIVE','家具位置无效。');ids.add(item.id);const tile=`${item.x},${item.y}`;if(item.visible&&tiles.has(tile))throw new RoomError('CORRUPT_ARCHIVE','家具位置重叠。');if(item.visible)tiles.add(tile);}
  if(!Array.isArray(value.diary)||value.diary.length>100||!Array.isArray(value.conversation)||value.conversation.length>40||!Array.isArray(value.requests)||value.requests.length>60)throw new RoomError('CORRUPT_ARCHIVE','记录数量无效。');
  for(const row of value.diary){exact(row,['id','text','kind','at'],'手记');text(row.id,100,'记录标识');text(row.text,2000,'手记');text(row.kind,30,'记录来源');if(!Number.isSafeInteger(row.at)||row.at<0)throw new RoomError('CORRUPT_ARCHIVE','手记时间无效。');}
  for(const row of value.conversation){exact(row,['role','text','at'],'对话');if(!['user','assistant'].includes(row.role))throw new RoomError('CORRUPT_ARCHIVE','对话身份无效。');text(row.text,4000,'对话');if(!Number.isSafeInteger(row.at)||row.at<0)throw new RoomError('CORRUPT_ARCHIVE','对话时间无效。');}
  for(const row of value.requests){exact(row,['id','fingerprint'],'操作凭据');text(row.id,180,'操作标识');text(row.fingerprint,1600,'操作摘要');}
  if(value.updatedAt!==null&&(!Number.isSafeInteger(value.updatedAt)||value.updatedAt<0))throw new RoomError('CORRUPT_ARCHIVE','存档时间无效。');
  return copy(value);
}
export function addDiary(state,content,kind,at=Date.now()) {
  state.diary.push({id:`${state.revision+1}-${state.diary.length}-${at}`,text:text(content,2000,'手记'),kind,at});state.diary=state.diary.slice(-100);return state;
}
export function perform(state,activity,note='',at=Date.now(),kind='local') {
  if(!own(activities,activity))throw new RoomError('INVALID_ARGUMENT','不支持这项房间活动。');
  const action=activities[activity],item=state.items.find(x=>x.id===action.item);
  if(!item.visible)throw new RoomError('ITEM_HIDDEN',`请先把${furniture[action.item].name}放回房间。`);
  state.position=action.item;state.activity=action.text;addDiary(state,note?text(note,400,'剧情手记'):action.text,kind,at);return state;
}
export function move(state,id,dx,dy) {
  const item=state.items.find(x=>x.id===id);if(!item||![-1,0,1].includes(dx)||![-1,0,1].includes(dy)||Math.abs(dx)+Math.abs(dy)!==1)throw new RoomError('INVALID_ARGUMENT','移动方向无效。');
  const x=item.x+dx,y=item.y+dy;if(x<0||x>6||y<0||y>6)throw new RoomError('OUT_OF_ROOM','已经到房间边缘了。');
  if(state.items.some(o=>o.id!==id&&o.visible&&o.x===x&&o.y===y))throw new RoomError('OCCUPIED','这里已有家具，请换一个位置。');
  item.x=x;item.y=y;return state;
}
export function parseBackup(raw,context) {
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>1024*1024)throw new RoomError('INVALID_BACKUP','备份超过1 MiB或格式不正确。');
  let value;try{value=JSON.parse(raw);}catch{throw new RoomError('INVALID_BACKUP','文件不是有效的JSON备份。');}
  exact(value,['format','scope','roleId','state'],'备份');
  if(value.format!=='skivu-role-room/v1'||value.scope!==scope(context)||value.roleId!==context.roleId)throw new RoomError('WRONG_SCOPE','这份备份属于其他角色或故事，请回到原空间再导入。');
  return validateState(value.state);
}
export function roomSummary(state) {return `${state.title}；${state.ambience==='night'?'夜晚暖灯':'白天日光'}；${state.activity} 家具：${state.items.filter(x=>x.visible).map(x=>furniture[x.id].name).join('、')}。`;}
