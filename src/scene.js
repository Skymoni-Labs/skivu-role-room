// SPDX-License-Identifier: GPL-3.0-only
// Original SVG furniture and room artwork. No external images or scripts.
import {furniture} from './model.js';
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const art={
  bed:`<ellipse cy="10" rx="49" ry="19" fill="#5e4b4230"/><path d="M-44-28 0-52 48-25 3 1Z" fill="#cc967b"/><path d="M-44-28 3-1 3 14-44-13Z" fill="#ae7965"/><path d="m3-1 45-25v15L3 14Z" fill="#d2a28b"/><path d="m-40-34 35-20 49 28L9-6Z" fill="#fcf1d7"/><path d="m-19-36 14-8 47 28-15 8Z" fill="#b6c9b2"/><path d="m-34-33 12-7 15 9-12 7Z" fill="#fff9ed"/><path d="m-43-31-1-28 35-20v27" fill="#c8947b" stroke="#b88168" stroke-width="3"/>`,
  desk:`<ellipse cy="12" rx="37" ry="14" fill="#5e4b4220"/><path d="m-32-22 36-21 33 19L1-3Z" fill="#d5ac85"/><path d="m-30-20 1 33m62-35v31M1-2v20" stroke="#a67e60" stroke-width="6"/><path d="m-15-27 18-10 15 9-18 10Z" fill="#fff5df"/><path d="m-2-33 11 6m-16-3 10 6" stroke="#b4ad94" stroke-width="1.4"/><path d="m21-35v-18m-8 1 9-13 11 12Z" fill="#85957a" stroke="#6d8065" stroke-width="3"/><ellipse cx="21" cy="-33" rx="9" ry="4" fill="#718569"/>`,
  shelf:`<ellipse cy="10" rx="31" ry="12" fill="#5e4b4220"/><path d="m-29-49 20-12 37 21v49l-21 12-36-21Z" fill="#b38969"/><path d="m-25-44 31 18v38l-31-18Z" fill="#d9b68f"/><path d="m-25-24 31 18m-31-37 31 18m-31 20 31 18" stroke="#9b7256" stroke-width="3"/><path d="m-19-41v14m7-10v14m7-10v14m-14 5v14m8-10v14m8-9v14" stroke="#98aa91" stroke-width="5"/><path d="m-13-37v14m-3 3v13m15 7v13" stroke="#cb8b76" stroke-width="4"/>`,
  sofa:`<ellipse cy="15" rx="48" ry="18" fill="#5e4b4226"/><path d="m-43-27 28-16 57 32v24L14 29-43-3Z" fill="#a5b69b"/><path d="m-37-16 22-13 50 29-22 13Z" fill="#c2ceb5"/><path d="m-42-25v-23l26-15 4 27M-12-36l52 30v24" fill="#acbd9f" stroke="#91a788" stroke-width="8" stroke-linejoin="round"/><path d="m-44-26v25l12 7v-26m54 7v25l14 8V-5" fill="#c4d0b9" stroke="#9caf90" stroke-width="3"/><path d="m-25-26 10-6 11 7-10 8Z" fill="#f7d4b8"/><path d="m0-13 10-6 11 7-10 8Z" fill="#fff1d9"/>`,
  plant:`<ellipse cy="8" rx="20" ry="8" fill="#5e4b4220"/><path d="m-14-15 5 25h18l5-25" fill="#ce9a7e"/><ellipse cy="-15" rx="14" ry="7" fill="#e0b59b"/><path d="M0-15v-43m0 24q-28-1-25-22 27 1 25 22m0-6q27-2 24-25Q-3-61 0-40m0-12q-19-11-12-25Q8-70 0-52" fill="#7f9f77" stroke="#688b65" stroke-width="2.5"/>`,
  record:`<ellipse cy="12" rx="27" ry="10" fill="#5e4b4220"/><path d="m-28-22 28-16 30 17L2-4Z" fill="#d5a785"/><path d="m-28-22 30 18v22l-30-17Z" fill="#b18b6b"/><path d="m2-4 28-17V2L2 18Z" fill="#c39975"/><ellipse cx="-1" cy="-23" rx="15" ry="9" fill="#535552"/><ellipse cx="-1" cy="-23" rx="5" ry="3" fill="#d4ab78"/><path d="m19-28-2 11-10 4" fill="none" stroke="#e8c798" stroke-width="2"/><path d="m-18-7 12 7m-12-1 12 7" stroke="#8b6c54" stroke-width="2"/>`,
  phone:`<ellipse cy="8" rx="19" ry="7" fill="#5e4b4220"/><path d="m-21-16 19-11 24 14L3-2Z" fill="#cbac88"/><path d="m-21-16v17L3 15V-2M3 15 22 4v-17" fill="#b49375"/><path d="m-8-22 8-5 11 7-8 5Z" fill="#4e6869" stroke="#e1dfca" stroke-width="2"/><path d="m-3-22 4-2 5 3-4 2Z" fill="#b2e0ce"/>`
};
export function scene(state,roleName='TA',selected=null){
  const night=state.ambience==='night';
  const colors={peach:['#f4dfcc','#efd1bf','#d5bc9c'],sage:['#e0e8d6','#c9dbca','#c5c5a6'],lavender:['#e8dfec','#d6cbdf','#cbbbc4']}[state.theme];
  let grid='';for(let n=0;n<=7;n++){let a=n*43,b=n*22;grid+=`<path d="M${360+a} ${230+b}l-301 154M${360-a} ${230+b}l301 154"/>`;}
  const items=state.items.filter(x=>x.visible).sort((a,b)=>a.x+a.y-b.x-b.y).map(item=>{
    const x=360+(item.x-item.y)*43,y=230+(item.x+item.y)*22;
    return `<g class="furniture ${selected===item.id?'selected':''}" role="button" tabindex="0" aria-label="${furniture[item.id].name}" data-item="${item.id}" transform="translate(${x} ${y})"><title>${furniture[item.id].name}</title><ellipse class="selection" cy="10" rx="49" ry="22"/>${art[item.id]}</g>`;
  }).join('');
  const pos=state.items.find(x=>x.id===state.position&&x.visible)||state.items.find(x=>x.visible)||{x:3,y:3};
  const ax=360+(pos.x-pos.y)*43+27,ay=230+(pos.x+pos.y)*22+23;
  return `<svg viewBox="0 0 720 620" xmlns="http://www.w3.org/2000/svg" aria-label="${escape(state.title)}的互动场景" class="scene-svg ${night?'night':''}">
  <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${night?'#53617a':'#bbd9d8'}"/><stop offset="1" stop-color="${night?'#8a84a0':'#e8e5c6'}"/></linearGradient><radialGradient id="glow"><stop stop-color="#fff5b8" stop-opacity=".6"/><stop offset="1" stop-color="#fff5b8" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="360" cy="497" rx="273" ry="62" fill="#75503a" opacity=".07"/>
  <path d="M59 384 360 230 360 55 59 209Z" fill="${colors[0]}"/><path d="M360 230 661 384 661 209 360 55Z" fill="${colors[1]}"/>
  <path d="M59 384 360 230 661 384 360 538Z" fill="${colors[2]}"/><g stroke="#a68a69" stroke-width="1" opacity=".15">${grid}</g>
  <path d="M59 384 360 538 661 384v13L360 552 59 397Z" fill="#b28e6d"/><path d="M59 384 360 230 661 384" fill="none" stroke="#ae937a" stroke-width="6"/>
  <g transform="translate(151 197)"><path d="M0 0 97-50v94L0 94Z" fill="url(#sky)" stroke="#fdf3df" stroke-width="8"/><path d="m47-24v94M0 47l97-50" stroke="#fcf3df" stroke-width="5"/><path d="m-15-7 16-8v109l-16 8Zm112-57 15-8V37l-15 8Z" fill="#b4bfaa"/><path d="m-21 98 139-71v11L-21 109Z" fill="#f6ebd4"/></g>
  <g transform="translate(478 178)"><path d="m-26-45 51 26v49l-51-26Z" fill="#eee4cd" stroke="#a58e74" stroke-width="4"/><path d="m-19-12 15-15 22 33-12-2-11-8Z" fill="#a1b49b"/><path d="m9-21 1 1" stroke="#c98f6d" stroke-width="12" stroke-linecap="round"/></g>
  <ellipse cx="365" cy="417" rx="108" ry="51" fill="#f6e8cd" opacity=".8"/><ellipse cx="365" cy="417" rx="88" ry="40" fill="none" stroke="#cdb9a2" stroke-width="2" stroke-dasharray="4 5"/>
  ${items}
  <g class="avatar" transform="translate(${ax} ${ay})"><ellipse cy="9" rx="19" ry="8" fill="#4b55542a"/><path d="m-10-13-3 22m23-22 3 22" stroke="#5a6961" stroke-width="9" stroke-linecap="round"/><path d="M-16-25q16-13 32 0l-4 23h-24Z" fill="#f7edd9" stroke="#d8ccb5" stroke-width="2"/><path d="M-17-22-22-6m39-16 5 16" stroke="#eac4a5" stroke-width="7" stroke-linecap="round"/><circle cy="-42" r="18" fill="#edc8a9"/><path d="M-19-41q-5-26 19-26t19 26l-10-15q-5 13-28 15" fill="#6b564b"/><path d="M-7-41h1m12 0h1" stroke="#594a42" stroke-width="2.6" stroke-linecap="round"/><path d="M-4-34q4 4 8 0" stroke="#b0786a" stroke-width="1.6" fill="none"/><text y="-79" text-anchor="middle" class="avatar-label">${escape(String(roleName).slice(0,18))}</text><text y="-95" text-anchor="middle" font-size="18">${night?'☾':'✦'}</text></g>
  ${night?'<rect width="720" height="620" fill="#354154" opacity=".14" pointer-events="none"/><ellipse cx="390" cy="355" rx="240" ry="180" fill="url(#glow)" pointer-events="none"/>':''}
  </svg>`;
}
