// ══════════════════════════════════════════════════
// SHARED CANVAS & DRAWING UTILITIES
// ══════════════════════════════════════════════════

import { el, snap, STEP, rgba, gc } from './utils.js';

export function updateTransBox(lvlId, text) {
  const lbl = el(lvlId.replace('Box', 'Lbl'));
  const box = el(lvlId);
  if(!lbl || !box) return;
  if(text) {
     box.textContent = text;
     lbl.classList.add('active');
     box.classList.add('active');
  } else {
     lbl.classList.remove('active');
     box.classList.remove('active');
  }
}

export const formatSideBySide = (absPre, absImg, cx, cy) => {
  let html = `<div class="coord-grid">
    <div class="coord-col"><div class="ck cpre" style="margin-bottom:2px">Pre-image</div>`;
  if(absPre){
    absPre.forEach((p,i) => {
      const [gx, gy] = gc(p[0], p[1], cx, cy);
      html += `<div class="cpre">${String.fromCharCode(65+i)}(${gx}, ${gy})</div>`;
    });
  }
  html += `</div><div class="coord-col"><div class="ck cimg" style="margin-bottom:2px">Image</div>`;
  if(absImg){
    absImg.forEach((p,i) => {
      const [gx, gy] = gc(p[0], p[1], cx, cy);
      html += `<div class="cimg">${String.fromCharCode(65+i)}'(${gx}, ${gy})</div>`;
    });
  }
  html += `</div></div>`;
  return html;
};

export function initCanvas(id) {
  const c = el(id), dpr = window.devicePixelRatio || 1;
  const card = c.parentElement;

  const cw = card.clientWidth - 28;
  let w = Math.max(cw, 240);
  let h = w * 0.55;

  const maxH = window.innerHeight - 240;
  if (h > maxH && maxH > 200) {
    h = maxH;
    w = h / 0.55;
  }

  c.width = w*dpr; c.height = h*dpr;
  c.style.width = w+'px'; c.style.height = h+'px';
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  return { canvas:c, ctx, w, h, cx:snap(Math.round(w/2)), cy:snap(Math.round(h/2)) };
}

export function attachResize(id, onResize) {
  const elC = el(id);
  if(!elC) return;
  new ResizeObserver(() => {
    const rect = elC.parentElement.getBoundingClientRect();
    if (rect.width === 0) return;
    onResize();
  }).observe(elC.parentElement);
}

export const getBounds = (pts, ox, oy) => {
  let l=Infinity, r=-Infinity, t=Infinity, b=-Infinity;
  pts.forEach(([px,py]) => {
     l=Math.min(l, ox+px); r=Math.max(r, ox+px);
     t=Math.min(t, oy+py); b=Math.max(b, oy+py);
  });
  return {l, r, t, b};
};

export const clampPos = (ox, oy, pts, w, h) => {
  let nx = ox, ny = oy;
  let b = getBounds(pts, 0, 0);
  if(nx + b.l < 0) nx = -b.l;
  if(nx + b.r > w) nx = w - b.r;
  if(ny + b.t < 0) ny = -b.t;
  if(ny + b.b > h) ny = h - b.b;
  return [nx, ny];
};

export function drawGrid(ctx, w, h, cx, cy) {
  ctx.clearRect(0,0,w,h);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
  for(let x=cx%STEP;x<w;x+=STEP){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let y=cy%STEP;y<h;y+=STEP){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.fillStyle='rgba(255,255,255,.15)';
  for(let x=cx%STEP;x<w;x+=STEP)
    for(let y=cy%STEP;y<h;y+=STEP)
      {ctx.beginPath();ctx.arc(x,y,1.5,0,Math.PI*2);ctx.fill();}
  ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(w,cy);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,h);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.5)'; ctx.font='bold 11px "Space Mono",monospace';
  ctx.textAlign='center';
  for(let x=cx%STEP;x<w;x+=STEP){const v=Math.round((x-cx)/STEP);if(v&&v%2===0)ctx.fillText(v,x,cy+14);}
  ctx.textAlign='right';
  for(let y=cy%STEP;y<h;y+=STEP){const v=-Math.round((y-cy)/STEP);if(v&&v%2===0)ctx.fillText(v,cx-4,y+4);}
  ctx.restore();
}

export function gShape(ctx, pts, ox, oy, color, fA=.16) {
  ctx.save();
  ctx.beginPath();
  pts.forEach(([x,y],i)=>i===0?ctx.moveTo(ox+x,oy+y):ctx.lineTo(ox+x,oy+y));
  ctx.closePath();
  ctx.fillStyle=rgba(color,fA); ctx.fill();
  ctx.shadowColor=color; ctx.shadowBlur=26;
  ctx.strokeStyle=color; ctx.lineWidth=2.2; ctx.stroke();
  ctx.shadowBlur=8; ctx.lineWidth=1.5; ctx.stroke();
  ctx.restore();
}

export function gLabels(ctx, pts, ox, oy, color, suffix='') {
  ctx.save();
  ctx.fillStyle=color;
  ctx.font='bold 11.5px "Space Mono",monospace';
  pts.forEach(([x,y],i)=>{
    ctx.beginPath();ctx.arc(ox+x,oy+y,3.5,0,Math.PI*2);ctx.fill();
    const ang = Math.atan2(y, x);
    const dist = 15;
    const tx = ox + x + Math.cos(ang) * dist;
    const ty = oy + y + Math.sin(ang) * dist;
    ctx.textAlign = Math.cos(ang) > 0.1 ? 'left' : (Math.cos(ang) < -0.1 ? 'right' : 'center');
    ctx.textBaseline = Math.sin(ang) > 0.1 ? 'top' : (Math.sin(ang) < -0.1 ? 'bottom' : 'middle');
    ctx.fillText(String.fromCharCode(65+i)+suffix, tx + Math.cos(ang)*2, ty + Math.sin(ang)*2);
  });
  ctx.restore();
}

export function gLine(ctx,x1,y1,x2,y2,color,dash=false,lw=1.5){
  ctx.save();
  ctx.shadowColor=color;ctx.shadowBlur=10;
  ctx.strokeStyle=color;ctx.lineWidth=lw;
  if(dash)ctx.setLineDash([6,4]);
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  ctx.restore();
}

export function gArrow(ctx,x1,y1,x2,y2,color){
  gLine(ctx,x1,y1,x2,y2,color,true);
  const a=Math.atan2(y2-y1,x2-x1);
  ctx.save();
  ctx.shadowColor=color;ctx.shadowBlur=10;ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(x2,y2);
  ctx.lineTo(x2-11*Math.cos(a-.4),y2-11*Math.sin(a-.4));
  ctx.lineTo(x2-11*Math.cos(a+.4),y2-11*Math.sin(a+.4));
  ctx.closePath();ctx.fill();
  ctx.restore();
}

export function gDot(ctx,x,y,color,label=''){
  ctx.save();
  ctx.shadowColor=color;ctx.shadowBlur=16;ctx.fillStyle=color;
  ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.shadowBlur=0;ctx.stroke();
  if(label){
    ctx.fillStyle='rgba(255,255,255,.85)';
    ctx.font='bold 10px "Space Mono",monospace';ctx.textAlign='center';
    ctx.fillText(label,x,y-12);
  }
  ctx.restore();
}

export function multiDrag(canvas, targets, onDrag) {
  let active=null, sm, sp;
  const pt=e=>{const r=canvas.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return[t.clientX-r.left,t.clientY-r.top];};
  const dn=e=>{
    const[mx,my]=pt(e);
    active=targets.find(t=>{const[tx,ty]=t.pos();return Math.hypot(mx-tx,my-ty)<(t.r||24);})||null;
    if(active){sm=[mx,my];sp=active.pos();e.preventDefault();}
  };
  const mv=e=>{
    if(!active)return;
    const[mx,my]=pt(e);
    let nx=sp[0]+(mx-sm[0]),ny=sp[1]+(my-sm[1]);
    if(active.bounds) [nx, ny] = active.bounds(nx, ny);
    if(active.snp!==false){nx=snap(nx);ny=snap(ny);}
    if(active.bounds) [nx, ny] = active.bounds(nx, ny);
    active.set([nx,ny]);onDrag();e.preventDefault();
  };
  const up=()=>active=null;
  canvas.addEventListener('mousedown',dn);
  canvas.addEventListener('mousemove',mv);
  canvas.addEventListener('mouseup',up);
  canvas.addEventListener('touchstart',dn,{passive:false});
  canvas.addEventListener('touchmove',mv,{passive:false});
  canvas.addEventListener('touchend',up);
}

export function getTransText(dx, dy) {
   let arr = [];
   if(dx>0) arr.push(`Right ${dx}`); else if(dx<0) arr.push(`Left ${Math.abs(dx)}`);
   if(dy>0) arr.push(`Up ${dy}`); else if(dy<0) arr.push(`Down ${Math.abs(dy)}`);
   return arr.length ? `Translation: ${arr.join(', ')}` : '';
}
