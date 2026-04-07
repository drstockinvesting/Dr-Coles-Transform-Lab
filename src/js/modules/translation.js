import * as Utils from '../utils.js';
import {
  updateTransBox, formatSideBySide, initCanvas, attachResize,
  clampPos, drawGrid, gShape, gLabels, gArrow, multiDrag, getTransText
} from '../canvas.js';

export function init() {
  let cData = initCanvas('tCanvas');
  let {canvas,ctx,w,h,cx,cy} = cData;
  let sk='triangle', level=1;
  let preRot = 0;
  let PRE_X=cx, PRE_Y=cy;
  let imgX=Utils.snap(cx+2*Utils.STEP), imgY=Utils.snap(cy-Utils.STEP);
  let tx=0, ty=0;
  let chalL3=null, revealedL3=false;
  let chalL4=null, revealedL4=false;
  const COLOR='#ffcc00';
  const LEVEL_NAMES={1:'Explore',2:'Explore',3:'Apply',4:'Challenge'};
  const VEC_COLOR = Utils.rgba(COLOR, 0.3);

  const shape = () => {
    let base = Utils.getShape(sk);
    if (preRot) return base.map(([px,py]) => Utils.rotatePt(px,py, 0,0, preRot));
    return base;
  };

  function draw(){
    drawGrid(ctx,w,h,cx,cy);
    const pts=shape();
    if(level===4){
      gShape(ctx,pts,PRE_X,PRE_Y,'#4dd8f0');
      gLabels(ctx,pts,PRE_X,PRE_Y,'#4dd8f0');
      const absPre = pts.map(([px,py])=>[PRE_X+px, PRE_Y+py]);
      if(Utils.el('tCoords4')) Utils.el('tCoords4').innerHTML = formatSideBySide(absPre, revealedL4 ? pts.map(([px,py])=>[PRE_X+chalL4.tx*Utils.STEP+px, PRE_Y-chalL4.ty*Utils.STEP+py]) : null, cx, cy);
      if(revealedL4){
        const ix=PRE_X+chalL4.tx*Utils.STEP, iy=PRE_Y-chalL4.ty*Utils.STEP;
        pts.forEach(([px,py])=>{ gArrow(ctx,PRE_X+px,PRE_Y+py,ix+px,iy+py,VEC_COLOR); });
        gShape(ctx,pts,ix,iy,COLOR);
        gLabels(ctx,pts,ix,iy,COLOR,"'");
      }
      return;
    }
    if(level===3){
      const current_tx = Math.round((imgX - PRE_X)/Utils.STEP);
      const current_ty = -Math.round((imgY - PRE_Y)/Utils.STEP);
      if(current_tx || current_ty){
        pts.forEach(([px,py])=>{ gArrow(ctx,PRE_X+px,PRE_Y+py,imgX+px,imgY+py,VEC_COLOR); });
      }
      gShape(ctx,pts,PRE_X,PRE_Y,'#4dd8f0');
      gLabels(ctx,pts,PRE_X,PRE_Y,'#4dd8f0');
      gShape(ctx,pts,imgX,imgY,COLOR);
      gLabels(ctx,pts,imgX,imgY,COLOR,"'");
      const absPre = pts.map(([px,py])=>[PRE_X+px, PRE_Y+py]);
      const absImg = pts.map(([px,py])=>[imgX+px, imgY+py]);
      if(Utils.el('tCoords3')) Utils.el('tCoords3').innerHTML = formatSideBySide(absPre, absImg, cx, cy);
      updateTransBox('tTransBox3', getTransText(current_tx, current_ty));
      return;
    }
    if(level===2){
      const ix=PRE_X+tx*Utils.STEP, iy=PRE_Y-ty*Utils.STEP;
      if(tx||ty){
         pts.forEach(([px,py])=>{ gArrow(ctx,PRE_X+px,PRE_Y+py,ix+px,iy+py,VEC_COLOR); });
      }
      gShape(ctx,pts,PRE_X,PRE_Y,'#4dd8f0');
      gLabels(ctx,pts,PRE_X,PRE_Y,'#4dd8f0');
      gShape(ctx,pts,ix,iy,COLOR);
      gLabels(ctx,pts,ix,iy,COLOR,"'");
      const absPre = pts.map(([px,py])=>[PRE_X+px, PRE_Y+py]);
      const absImg = pts.map(([px,py])=>[ix+px, iy+py]);
      if(Utils.el('tCoords2')) Utils.el('tCoords2').innerHTML = formatSideBySide(absPre, absImg, cx, cy);
      Utils.set('txV',tx);Utils.set('tyV',ty);
      updateTransBox('tTransBox2', getTransText(tx, ty));
      return;
    }
    const current_tx = Math.round((imgX - PRE_X)/Utils.STEP);
    const current_ty = -Math.round((imgY - PRE_Y)/Utils.STEP);
    if(current_tx||current_ty){
      pts.forEach(([px,py])=>{ gArrow(ctx,PRE_X+px,PRE_Y+py,imgX+px,imgY+py,VEC_COLOR); });
    }
    gShape(ctx,pts,PRE_X,PRE_Y,'#4dd8f0');
    gLabels(ctx,pts,PRE_X,PRE_Y,'#4dd8f0');
    gShape(ctx,pts,imgX,imgY,COLOR);
    gLabels(ctx,pts,imgX,imgY,COLOR,"'");
    const absPre = pts.map(([px,py])=>[PRE_X+px, PRE_Y+py]);
    const absImg = pts.map(([px,py])=>[imgX+px, imgY+py]);
    if(Utils.el('tCoords1')) Utils.el('tCoords1').innerHTML = formatSideBySide(absPre, absImg, cx, cy);
    updateTransBox('tTransBox1', getTransText(current_tx, current_ty));
  }

  multiDrag(canvas,[{
    pos:()=>[imgX,imgY],
    set:([x,y])=>{
       if(level===1 || level===3) {
         imgX=Utils.snap(x); imgY=Utils.snap(y);
         [imgX, imgY] = clampPos(imgX, imgY, shape(), w, h);
       }
    },
    r:80
  }],draw);

  Utils.el('txS').addEventListener('input',function(){ tx=+this.value; draw();});
  Utils.el('tyS').addEventListener('input',function(){ ty=+this.value; draw();});
  Utils.el('tRst').addEventListener('click',()=>{tx=0;ty=0;Utils.el('txS').value=0;Utils.el('tyS').value=0;draw();});

  function newChallengeL3(){
    preRot = [0, 90, 180, 270][Math.floor(Math.random()*4)];
    PRE_X = cx + (Math.floor(Math.random()*7)-3)*Utils.STEP;
    PRE_Y = cy + (Math.floor(Math.random()*5)-2)*Utils.STEP;
    [PRE_X, PRE_Y] = clampPos(PRE_X, PRE_Y, shape(), w, h);
    imgX = PRE_X; imgY = PRE_Y;
    const s=[-1,1];
    const dx=(Math.floor(Math.random()*4)+1)*s[~~(Math.random()*2)];
    const dy=(Math.floor(Math.random()*3)+1)*s[~~(Math.random()*2)];
    chalL3={tx:dx, ty:dy}; revealedL3=false;
    let dxStr = dx>0 ? `Right ${dx}` : (dx<0 ? `Left ${Math.abs(dx)}` : '');
    let dyStr = dy>0 ? `Up ${dy}` : (dy<0 ? `Down ${Math.abs(dy)}` : '');
    let rText = [dxStr, dyStr].filter(Boolean).join(', ');
    Utils.set('tRule3',`Rule: ${rText}`);
    const r=Utils.el('tRes3'); r.textContent=''; r.className='pres';
    const sb=Utils.el('tShow3'); if(sb) sb.style.display='none';
    draw();
  }

  Utils.el('tChk3').addEventListener('click',()=>{
    if(!chalL3)return;
    const current_tx = Math.round((imgX - PRE_X)/Utils.STEP);
    const current_ty = -Math.round((imgY - PRE_Y)/Utils.STEP);
    const r=Utils.el('tRes3');
    const sb=Utils.el('tShow3');
    if(current_tx === chalL3.tx && current_ty === chalL3.ty){
      r.textContent=`🎉 Great job! That's exactly right — try a new one!`; r.className='pres ok';
      if(sb) sb.style.display='none';
    }else{
      r.textContent=`Keep trying — you've got this!`; r.className='pres no';
      if(sb) sb.style.display='inline-flex';
    }
  });

  Utils.el('tShow3').addEventListener('click',()=>{
    if(!chalL3) return;
    imgX = PRE_X + chalL3.tx * Utils.STEP;
    imgY = PRE_Y - chalL3.ty * Utils.STEP;
    [imgX, imgY] = clampPos(imgX, imgY, shape(), w, h);
    revealedL3 = true;
    const r=Utils.el('tRes3');
    r.textContent=`Here's the solution! Try a new one when you're ready.`; r.className='pres ok';
    draw();
  });

  Utils.el('tNew3').addEventListener('click',newChallengeL3);

  function newChallengeL4(){
    preRot = [0, 90, 180, 270][Math.floor(Math.random()*4)];
    PRE_X = cx + (Math.floor(Math.random()*7)-3)*Utils.STEP;
    PRE_Y = cy + (Math.floor(Math.random()*5)-2)*Utils.STEP;
    [PRE_X, PRE_Y] = clampPos(PRE_X, PRE_Y, shape(), w, h);
    imgX = PRE_X; imgY = PRE_Y;
    const pts = shape();
    const s=[-1,1];
    const dx=(Math.floor(Math.random()*4)+1)*s[~~(Math.random()*2)];
    const dy=(Math.floor(Math.random()*3)+1)*s[~~(Math.random()*2)];
    const vIdx = Math.floor(Math.random() * pts.length);
    chalL4={tx:dx, ty:dy, vIdx:vIdx}; revealedL4=false;
    let dxStr = dx>0 ? `Right ${dx}` : (dx<0 ? `Left ${Math.abs(dx)}` : '');
    let dyStr = dy>0 ? `Up ${dy}` : (dy<0 ? `Down ${Math.abs(dy)}` : '');
    let rText = [dxStr, dyStr].filter(Boolean).join(', ');
    Utils.set('tRule4',`Rule: ${rText}`);
    Utils.el('tPX4').value=''; Utils.el('tPY4').value='';
    const vLetter = String.fromCharCode(65 + vIdx);
    Utils.set('tChalQ4', `Where will vertex ${vLetter}' land?`);
    const r=Utils.el('tRes4'); r.textContent=''; r.className='pres';
    const sb=Utils.el('tShow4'); if(sb) sb.style.display='none';
    draw();
  }

  Utils.el('tChk4').addEventListener('click',()=>{
    if(!chalL4)return;
    const px=parseInt(Utils.el('tPX4').value),py=parseInt(Utils.el('tPY4').value);
    if(isNaN(px)||isNaN(py))return;
    const pts = shape();
    const [gpx, gpy] = Utils.gc(PRE_X+pts[chalL4.vIdx][0], PRE_Y+pts[chalL4.vIdx][1], cx, cy);
    const ansX = gpx + chalL4.tx, ansY = gpy + chalL4.ty;
    const r=Utils.el('tRes4');
    const sb=Utils.el('tShow4');
    const vLetter = String.fromCharCode(65 + chalL4.vIdx);
    if(px===ansX&&py===ansY){
      revealedL4=true;
      r.textContent=`🎉 Great job! ${vLetter}' is at (${ansX}, ${ansY}) — try a new one!`; r.className='pres ok';
      if(sb) sb.style.display='none';
      draw();
    }else{
      r.textContent=`Keep trying — you've got this!`; r.className='pres no';
      if(sb) sb.style.display='inline-flex';
    }
  });

  Utils.el('tShow4').addEventListener('click',()=>{
    if(!chalL4) return;
    const pts = shape();
    const [gpx, gpy] = Utils.gc(PRE_X+pts[chalL4.vIdx][0], PRE_Y+pts[chalL4.vIdx][1], cx, cy);
    const ansX = gpx + chalL4.tx, ansY = gpy + chalL4.ty;
    const vLetter = String.fromCharCode(65 + chalL4.vIdx);
    Utils.el('tPX4').value = ansX; Utils.el('tPY4').value = ansY;
    revealedL4 = true;
    const r=Utils.el('tRes4');
    r.textContent=`${vLetter}' lands at (${ansX}, ${ansY}). Try a new one when you're ready!`; r.className='pres ok';
    draw();
  });

  Utils.el('tNew4').addEventListener('click',newChallengeL4);

  document.querySelectorAll('#tSB .sbtn').forEach(b=>b.addEventListener('click',function(){
    document.querySelectorAll('#tSB .sbtn').forEach(x=>x.classList.remove('active'));
    this.classList.add('active');sk=this.dataset.shape;
    if(level===1 || level===2){ [PRE_X, PRE_Y] = clampPos(PRE_X, PRE_Y, shape(), w, h); }
    if(level===3) newChallengeL3();
    if(level===4) newChallengeL4();
    draw();
  }));

  document.querySelectorAll('[data-panel=translation] .lbtn').forEach(b=>b.addEventListener('click',function(){
    document.querySelectorAll('[data-panel=translation] .lbtn').forEach(x=>x.classList.remove('active'));
    this.classList.add('active');
    level=+this.dataset.level;
    document.querySelector('[data-panel=translation]').setAttribute('data-level',level);
    Utils.set('tLN', LEVEL_NAMES[level]||'Explore');
    if(level===1 || level===2){
       preRot = 0; PRE_X = cx; PRE_Y = cy; tx=0; ty=0;
       imgX=Utils.snap(cx+2*Utils.STEP); imgY=Utils.snap(cy-Utils.STEP);
       Utils.el('txS').value=0; Utils.el('tyS').value=0;
    }
    if(level===3) newChallengeL3();
    if(level===4) newChallengeL4();
    draw();
  }));

  attachResize('tCanvas', () => {
    const fresh = initCanvas('tCanvas');
    const dx = fresh.cx - cx, dy = fresh.cy - cy;
    w = fresh.w; h = fresh.h; cx = fresh.cx; cy = fresh.cy;
    PRE_X += dx; PRE_Y += dy;
    imgX += dx; imgY += dy;
    draw();
  });
  draw();
}
