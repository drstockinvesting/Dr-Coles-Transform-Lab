import * as Utils from '../utils.js';
import {
  updateTransBox, formatSideBySide, initCanvas, attachResize,
  clampPos, drawGrid, gShape, gLabels, gLine, gDot, multiDrag
} from '../canvas.js';

export function init() {
  let cData = initCanvas('rfCanvas');
  let {canvas,ctx,w,h,cx,cy} = cData;
  let sk='triangle', level=1;
  let ox=Utils.snap(cx-2*Utils.STEP), oy=Utils.snap(cy-Utils.STEP);
  let ax1={x:cx, y:Utils.snap(cy-3*Utils.STEP)};
  let ax2={x:cx, y:Utils.snap(cy+3*Utils.STEP)};
  const COLOR='#ffcc00';
  const LEVEL_NAMES={1:'Explore',2:'Explore',3:'Apply',4:'Challenge',5:'Rules'};
  let chalRf=null, plotted=[], checkedRf=false;
  let chalRf5=null, checkedRf5=false;
  const shape=()=>Utils.getShape(sk);
  const MAPPING_RULES={'y':'(x, y) \u2192 (\u2212x, y)','x':'(x, y) \u2192 (x, \u2212y)','yx':'(x, y) \u2192 (y, x)','ynx':'(x, y) \u2192 (\u2212y, \u2212x)'};

  function reflectPt(px,py){
    const dx=ax2.x-ax1.x,dy=ax2.y-ax1.y,len2=dx*dx+dy*dy;
    if(len2<.01)return[px,py];
    const t=((px-ax1.x)*dx+(py-ax1.y)*dy)/len2;
    return[2*(ax1.x+t*dx)-px, 2*(ax1.y+t*dy)-py];
  }
  function axisEnds(){
    const dx=ax2.x-ax1.x,dy=ax2.y-ax1.y,L=Math.hypot(dx,dy)||1,T=Math.max(w,h)*2;
    return[ax1.x-(dx/L)*T,ax1.y-(dy/L)*T,ax1.x+(dx/L)*T,ax1.y+(dy/L)*T];
  }
  function perpDir(){const dx=ax2.x-ax1.x,dy=ax2.y-ax1.y,L=Math.hypot(dx,dy)||1;return[-dy/L,dx/L];}
  function getAxisLabel(){
    const gx1=Math.round((ax1.x-cx)/Utils.STEP), gy1=-Math.round((ax1.y-cy)/Utils.STEP);
    const gx2=Math.round((ax2.x-cx)/Utils.STEP), gy2=-Math.round((ax2.y-cy)/Utils.STEP);
    if(gx1===gx2) return (gx1===0)?'Across y-axis':`Across x = ${gx1}`;
    if(gy1===gy2) return (gy1===0)?'Across x-axis':`Across y = ${gy1}`;
    const m=(gy2-gy1)/(gx2-gx1), b=gy1-m*gx1;
    if(m===1&&b===0) return 'Across y = x';
    if(m===-1&&b===0) return 'Across y = \u2212x';
    const mStr=Number.isInteger(m)?m.toString():m.toFixed(2);
    const bAbs=Math.abs(b);
    const bStr=Number.isInteger(bAbs)?bAbs.toString():bAbs.toFixed(2);
    if(b===0) return `Across y = ${mStr}x`;
    return `Across y = ${mStr}x ${b>0?'+':'\u2212'} ${bStr}`;
  }
  function drawConnectors(pts,imgAbs){
    ctx.save();
    pts.forEach(([px,py],i)=>{
      const vx=ox+px,vy=oy+py,rx=imgAbs[i][0],ry=imgAbs[i][1];
      const mx=(vx+rx)/2,my=(vy+ry)/2;
      ctx.shadowColor=COLOR;ctx.shadowBlur=7;
      ctx.strokeStyle=Utils.rgba(COLOR,.55);ctx.lineWidth=1;ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.moveTo(vx,vy);ctx.lineTo(mx,my);ctx.stroke();
      ctx.strokeStyle=Utils.rgba('#4dd8f0',.55);
      ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(rx,ry);ctx.stroke();
      const[pd,pk]=perpDir();const TL=5;
      ctx.setLineDash([]);ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1.5;ctx.shadowBlur=0;
      ctx.beginPath();ctx.moveTo(mx+pd*TL,my+pk*TL);ctx.lineTo(mx-pd*TL,my-pk*TL);ctx.stroke();
    });
    ctx.restore();
  }

  function draw(){
    drawGrid(ctx,w,h,cx,cy);
    const pts=shape();
    const[lx1,ly1,lx2,ly2]=axisEnds();
    ctx.save();
    ctx.shadowColor='#bb55ff';ctx.shadowBlur=14;
    ctx.strokeStyle='#bb55ff';ctx.lineWidth=1.5;ctx.setLineDash([8,5]);
    ctx.beginPath();ctx.moveTo(lx1,ly1);ctx.lineTo(lx2,ly2);ctx.stroke();
    ctx.restore();
    const absPre=pts.map(([px,py])=>[ox+px,oy+py]);
    const imgAbs=absPre.map(([px,py])=>reflectPt(px,py));
    const[rcx,rcy]=reflectPt(ox,oy);
    const imgRel=imgAbs.map(([ix,iy])=>[ix-rcx,iy-rcy]);
    if(level===1){
      drawConnectors(pts,imgAbs);
      gShape(ctx,pts,ox,oy,'#4dd8f0'); gLabels(ctx,pts,ox,oy,'#4dd8f0');
      gShape(ctx,imgRel,rcx,rcy,COLOR); gLabels(ctx,imgRel,rcx,rcy,COLOR,"'");
      if(Utils.el('rfCoords1')) Utils.el('rfCoords1').innerHTML=formatSideBySide(absPre,imgAbs,cx,cy);
      updateTransBox('rfTransBox1',`Reflection: ${getAxisLabel()}`);
      return;
    }
    if(level===2){
      gDot(ctx,ax1.x,ax1.y,'#bb55ff'); gDot(ctx,ax2.x,ax2.y,'#bb55ff');
      drawConnectors(pts,imgAbs);
      gShape(ctx,pts,ox,oy,'#4dd8f0'); gLabels(ctx,pts,ox,oy,'#4dd8f0');
      gShape(ctx,imgRel,rcx,rcy,COLOR); gLabels(ctx,imgRel,rcx,rcy,COLOR,"'");
      if(Utils.el('rfCoords2')) Utils.el('rfCoords2').innerHTML=formatSideBySide(absPre,imgAbs,cx,cy);
      updateTransBox('rfTransBox2',`Reflection: ${getAxisLabel()}`);
      return;
    }
    if(level===3||level===4){
      const coordsId=`rfCoords${level}`, transBoxId=`rfTransBox${level}`;
      gShape(ctx,pts,ox,oy,'#4dd8f0'); gLabels(ctx,pts,ox,oy,'#4dd8f0');
      plotted.forEach(([px,py],i)=>{
        ctx.save();
        ctx.shadowColor=COLOR;ctx.shadowBlur=14;ctx.fillStyle=COLOR;
        ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.shadowBlur=0;ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,.85)';
        ctx.font='bold 10px "Space Mono",monospace';ctx.textAlign='center';
        ctx.fillText(String.fromCharCode(65+i)+"'",px,py-12);
        ctx.restore();
      });
      if(checkedRf){
        gShape(ctx,imgRel,rcx,rcy,COLOR); gLabels(ctx,imgRel,rcx,rcy,COLOR,"'");
        if(Utils.el(coordsId)) Utils.el(coordsId).innerHTML=formatSideBySide(absPre,imgAbs,cx,cy);
        updateTransBox(transBoxId,`Reflection: ${getAxisLabel()}`);
      } else {
        if(Utils.el(coordsId)) Utils.el(coordsId).innerHTML=formatSideBySide(absPre,null,cx,cy);
        updateTransBox(transBoxId,'');
      }
      return;
    }
    if(level===5){
      gShape(ctx,pts,ox,oy,'#4dd8f0'); gLabels(ctx,pts,ox,oy,'#4dd8f0');
      if(checkedRf5){
        gShape(ctx,imgRel,rcx,rcy,COLOR); gLabels(ctx,imgRel,rcx,rcy,COLOR,"'");
        if(Utils.el('rfCoords5')) Utils.el('rfCoords5').innerHTML=formatSideBySide(absPre,imgAbs,cx,cy);
        updateTransBox('rfTransBox5',`Reflection: ${getAxisLabel()}`);
      } else {
        if(Utils.el('rfCoords5')) Utils.el('rfCoords5').innerHTML=formatSideBySide(absPre,null,cx,cy);
        updateTransBox('rfTransBox5','');
      }
    }
  }

  multiDrag(canvas,[
    {pos:()=>[ax1.x,ax1.y],set:([x,y])=>{if(level===2){ax1.x=Utils.snap(x);ax1.y=Utils.snap(y);}},r:18,snp:true},
    {pos:()=>[ax2.x,ax2.y],set:([x,y])=>{if(level===2){ax2.x=Utils.snap(x);ax2.y=Utils.snap(y);}},r:18,snp:true},
    {pos:()=>[ox,oy],set:([x,y])=>{if(level===1||level===2){ox=Utils.snap(x);oy=Utils.snap(y);}},bounds:(x,y)=>clampPos(x,y,shape(),w,h),r:75},
  ],draw);

  canvas.addEventListener('click',function(e){
    if(level!==3&&level!==4) return;
    if(checkedRf) return;
    const pts=shape();
    if(plotted.length>=pts.length) return;
    const r=canvas.getBoundingClientRect();
    const sx=Utils.snap(e.clientX-r.left), sy=Utils.snap(e.clientY-r.top);
    if(plotted.some(([px,py])=>px===sx&&py===sy)) return;
    plotted.push([sx,sy]);
    draw(); updatePlotStatus();
  });
  canvas.addEventListener('contextmenu',function(e){if((level===3||level===4)&&!checkedRf&&plotted.length>0){e.preventDefault(); plotted.pop(); draw(); updatePlotStatus();}});

  function updatePlotStatus(){
    const needed=shape().length;
    const resEl=Utils.el(`rfRes${level}`);
    if(!resEl) return;
    if(plotted.length<needed){resEl.textContent=`${plotted.length} of ${needed} vertices placed. Right-click to undo.`;resEl.className='pres no'; resEl.style.display='block';}
    else {resEl.textContent=`All ${needed} vertices placed — hit Check when ready!`;resEl.className='pres warn'; resEl.style.display='block';}
  }

  document.querySelectorAll('#rfAP .axbtn').forEach(b=>b.addEventListener('click',function(){
    document.querySelectorAll('#rfAP .axbtn').forEach(x=>x.classList.remove('active'));
    this.classList.add('active'); _applyAxisPreset(this.dataset.ax); draw();
  }));
  document.querySelectorAll('#rfAP2 .axbtn').forEach(b=>b.addEventListener('click',function(){
    document.querySelectorAll('#rfAP2 .axbtn').forEach(x=>x.classList.remove('active'));
    this.classList.add('active'); _applyAxisPreset(this.dataset.ax); draw();
  }));

  const resetRf=()=>{
    ox=Utils.snap(cx-2*Utils.STEP); oy=Utils.snap(cy-Utils.STEP);
    ax1={x:cx,y:Utils.snap(cy-3*Utils.STEP)}; ax2={x:cx,y:Utils.snap(cy+3*Utils.STEP)};
    [ox,oy]=clampPos(ox,oy,shape(),w,h);
    ['#rfAP','#rfAP2'].forEach(sel=>{
      document.querySelectorAll(`${sel} .axbtn`).forEach(x=>x.classList.remove('active'));
      const yBtn=document.querySelector(`${sel} .axbtn[data-ax="y"]`);
      if(yBtn) yBtn.classList.add('active');
    });
    draw();
  };
  Utils.el('rfRst').addEventListener('click',resetRf);
  Utils.el('rfRst2').addEventListener('click',resetRf);

  function _applyAxisPreset(axKey){
    const D=3*Utils.STEP;
    switch(axKey){
      case'x':ax1={x:cx-D,y:cy};ax2={x:cx+D,y:cy};break;
      case'yx':ax1={x:cx-D,y:cy+D};ax2={x:cx+D,y:cy-D};break;
      case'ynx':ax1={x:cx-D,y:cy-D};ax2={x:cx+D,y:cy+D};break;
      default:ax1={x:cx,y:cy-D};ax2={x:cx,y:cy+D};break;
    }
  }
  function _applyCandidateAxis(cand){
    const D=3*Utils.STEP;
    if(cand.type==='vert'){const kx=cx+cand.k*Utils.STEP; ax1={x:kx,y:cy-D}; ax2={x:kx,y:cy+D};}
    else if(cand.type==='horiz'){const ky=cy-cand.k*Utils.STEP; ax1={x:cx-D,y:ky}; ax2={x:cx+D,y:ky};}
    else {const x1c=cx-D,x2c=cx+D; ax1={x:x1c,y:cy-(cand.m*(x1c-cx)/Utils.STEP+cand.b)*Utils.STEP}; ax2={x:x2c,y:cy-(cand.m*(x2c-cx)/Utils.STEP+cand.b)*Utils.STEP};}
  }
  function _chalAxisLabel(){
    if(!chalRf) return 'Axis: y-axis';
    if(chalRf.type==='vert') return chalRf.k===0?'Axis: y-axis':`Axis: x = ${chalRf.k}`;
    if(chalRf.type==='horiz') return chalRf.k===0?'Axis: x-axis':`Axis: y = ${chalRf.k}`;
    const m=chalRf.m,b=chalRf.b, mStr=m===1?'':(m===-1?'\u2212':''+m);
    if(b===0) return `Axis: y = ${mStr}x`;
    return `Axis: y = ${mStr}x ${b>0?'+':'\u2212'} ${Math.abs(b)}`;
  }
  function _placePreImage(){
    for(let i=0;i<30;i++){
      let tx=cx+(Math.floor(Math.random()*9)-4)*Utils.STEP;
      let ty=cy+(Math.floor(Math.random()*7)-3)*Utils.STEP;
      const[nx,ny]=clampPos(tx,ty,shape(),w,h); ox=nx; oy=ny;
      const imgAbs=shape().map(([px,py])=>reflectPt(ox+px,oy+py));
      if(imgAbs.every(([px,py])=>px>=0&&px<=w&&py>=0&&py<=h)) return;
    }
    [ox,oy]=clampPos(cx,cy,shape(),w,h);
  }
  function newChallengeL3(){const axKey=['y','x'][Math.floor(Math.random()*2)]; _applyAxisPreset(axKey); _placePreImage(); plotted=[]; checkedRf=false; const r=Utils.el('rfRes3'); r.textContent=''; r.className='pres'; r.style.display='none'; Utils.el('rfShow3').style.display='none'; Utils.set('rfRule3',axKey==='y'?'Axis: y-axis':'Axis: x-axis'); draw();}
  function newChallengeL4(){
    const candidates=[];
    for(let k=-4;k<=4;k++) candidates.push({type:'vert',k});
    for(let k=-4;k<=4;k++) candidates.push({type:'horiz',k});
    for(const m of [1,-1]) for(let b=-3;b<=3;b++) candidates.push({type:'slant',m,b});
    for(let i=candidates.length-1;i>0;i--){const j=~~(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
    _placePreImage(); chalRf=null;
    for(const cand of candidates){_applyCandidateAxis(cand); const imgCoords=shape().map(([px,py])=>{const abs=reflectPt(ox+px,oy+py);return Utils.gc(abs[0],abs[1],cx,cy);}); if(imgCoords.every(([x,y])=>Number.isInteger(x)&&Number.isInteger(y))){const[nx,ny]=clampPos(ox,oy,shape(),w,h); if(nx===ox&&ny===oy){chalRf=cand;break;}}}
    if(!chalRf){chalRf={type:'vert',k:0};_applyCandidateAxis(chalRf);}
    plotted=[]; checkedRf=false; const r=Utils.el('rfRes4'); r.textContent=''; r.className='pres'; r.style.display='none'; Utils.el('rfShow4').style.display='none'; Utils.set('rfRule4',_chalAxisLabel()); draw();
  }
  function newChallengeL5(){
    const axKeys=['y','x','yx','ynx']; const axKey=axKeys[Math.floor(Math.random()*axKeys.length)]; _applyAxisPreset(axKey); _placePreImage();
    const pts=shape(); const vIdx=Math.floor(Math.random()*pts.length); chalRf5={axKey,vIdx}; checkedRf5=false;
    Utils.el('rfPX5').value=''; Utils.el('rfPY5').value=''; const r=Utils.el('rfRes5'); r.textContent=''; r.className='pres'; r.style.display='none'; Utils.el('rfShow5').style.display='none';
    const axLabel={y:'y-axis',x:'x-axis',yx:'y = x',ynx:'y = \u2212x'}[axKey]; Utils.set('rfRule5',`Axis: ${axLabel}`); Utils.set('rfChalQ5',`Where will vertex ${String.fromCharCode(65+vIdx)}' land?`);
    const absPre=pts.map(([px,py])=>[ox+px,oy+py]); if(Utils.el('rfCoords5')) Utils.el('rfCoords5').innerHTML=formatSideBySide(absPre,null,cx,cy); updateTransBox('rfTransBox5',''); draw();
  }
  function checkReflection(lvl){
    const pts=shape(); const correct=pts.map(([px,py])=>[ox+px,oy+py]).map(([px,py])=>reflectPt(px,py)).map(([px,py])=>[Utils.snap(px),Utils.snap(py)]);
    const r=Utils.el(`rfRes${lvl}`), sb=Utils.el(`rfShow${lvl}`); if(plotted.length<pts.length){r.textContent=`Place all ${pts.length} vertices first.`; r.className='pres no'; r.style.display='block'; return;}
    let allCorrect=true; const used=new Set();
    for(const[px,py] of plotted){let matched=false; for(let i=0;i<correct.length;i++){if(used.has(i)) continue; if(Math.abs(px-correct[i][0])<Utils.STEP*0.5&&Math.abs(py-correct[i][1])<Utils.STEP*0.5){used.add(i);matched=true;break;}} if(!matched){allCorrect=false;break;}}
    if(allCorrect){checkedRf=true; r.textContent='\ud83c\udf89 Great job! That\u2019s the correct reflection \u2014 try a new one!'; r.className='pres ok'; r.style.display='block'; if(sb) sb.style.display='none';}
    else {r.textContent='Keep trying \u2014 you\u2019ve got this!'; r.className='pres no'; r.style.display='block'; if(sb) sb.style.display='inline-flex';}
    draw();
  }
  function showSolution(lvl){const imgAbs=shape().map(([px,py])=>[ox+px,oy+py]).map(([px,py])=>reflectPt(px,py)); plotted=imgAbs.map(([px,py])=>[Utils.snap(px),Utils.snap(py)]); checkedRf=true; const r=Utils.el(`rfRes${lvl}`); r.textContent='Here\u2019s the solution! Try a new one when you\u2019re ready.'; r.className='pres ok'; r.style.display='block'; Utils.el(`rfShow${lvl}`).style.display='none'; draw();}

  Utils.el('rfChk3').addEventListener('click',()=>checkReflection(3)); Utils.el('rfShow3').addEventListener('click',()=>showSolution(3)); Utils.el('rfNew3').addEventListener('click',newChallengeL3);
  Utils.el('rfChk4').addEventListener('click',()=>checkReflection(4)); Utils.el('rfShow4').addEventListener('click',()=>showSolution(4)); Utils.el('rfNew4').addEventListener('click',newChallengeL4);
  Utils.el('rfChk5').addEventListener('click',()=>{
    if(!chalRf5) return; const px=parseInt(Utils.el('rfPX5').value), py=parseInt(Utils.el('rfPY5').value); if(isNaN(px)||isNaN(py)) return;
    const imgAbs=shape().map(([x,y])=>[ox+x,oy+y]).map(([x,y])=>reflectPt(x,y)); const[ansX,ansY]=Utils.gc(imgAbs[chalRf5.vIdx][0],imgAbs[chalRf5.vIdx][1],cx,cy);
    const vLetter=String.fromCharCode(65+chalRf5.vIdx), r=Utils.el('rfRes5'), sb=Utils.el('rfShow5');
    if(px===ansX&&py===ansY){checkedRf5=true; const rule=MAPPING_RULES[chalRf5.axKey]||''; r.innerHTML=`\ud83c\udf89 Great job! ${vLetter}' is at (${ansX}, ${ansY})<br><span style="font-size:.75rem;opacity:.85">Mapping rule: ${rule}</span>`; r.className='pres ok'; r.style.display='block'; if(sb) sb.style.display='none'; draw();}
    else {r.textContent='Keep trying \u2014 you\u2019ve got this!'; r.className='pres no'; r.style.display='block'; if(sb) sb.style.display='inline-flex';}
  });
  Utils.el('rfShow5').addEventListener('click',()=>{
    if(!chalRf5) return; const imgAbs=shape().map(([x,y])=>[ox+x,oy+y]).map(([x,y])=>reflectPt(x,y)); const[ansX,ansY]=Utils.gc(imgAbs[chalRf5.vIdx][0],imgAbs[chalRf5.vIdx][1],cx,cy);
    const vLetter=String.fromCharCode(65+chalRf5.vIdx); Utils.el('rfPX5').value=ansX; Utils.el('rfPY5').value=ansY; checkedRf5=true; const rule=MAPPING_RULES[chalRf5.axKey]||'';
    const r=Utils.el('rfRes5'); r.innerHTML=`${vLetter}' is at (${ansX}, ${ansY}). Try a new one!<br><span style="font-size:.75rem;opacity:.85">Mapping rule: ${rule}</span>`; r.className='pres ok'; r.style.display='block'; Utils.el('rfShow5').style.display='none'; draw();
  });
  Utils.el('rfNew5').addEventListener('click',newChallengeL5);

  document.querySelectorAll('#rfSB .sbtn').forEach(b=>b.addEventListener('click',function(){document.querySelectorAll('#rfSB .sbtn').forEach(x=>x.classList.remove('active')); this.classList.add('active'); sk=this.dataset.shape; if(level===1||level===2)[ox,oy]=clampPos(ox,oy,shape(),w,h); if(level===3) newChallengeL3(); if(level===4) newChallengeL4(); if(level===5) newChallengeL5(); draw();}));
  document.querySelectorAll('[data-panel=reflection] .lbtn').forEach(b=>b.addEventListener('click',function(){document.querySelectorAll('[data-panel=reflection] .lbtn').forEach(x=>x.classList.remove('active')); this.classList.add('active'); level=+this.dataset.level; document.querySelector('[data-panel=reflection]').setAttribute('data-level',level); Utils.set('rfLN',LEVEL_NAMES[level]||'Explore'); plotted=[]; checkedRf=false; checkedRf5=false; if(level===1||level===2) resetRf(); if(level===3) newChallengeL3(); if(level===4) newChallengeL4(); if(level===5) newChallengeL5(); draw();}));

  attachResize('rfCanvas',()=>{const fresh=initCanvas('rfCanvas'); const dx=fresh.cx-cx, dy=fresh.cy-cy; w=fresh.w; h=fresh.h; cx=fresh.cx; cy=fresh.cy; ox+=dx; oy+=dy; ax1.x+=dx; ax1.y+=dy; ax2.x+=dx; ax2.y+=dy; plotted=plotted.map(([px,py])=>[px+dx,py+dy]); [ox,oy]=clampPos(ox,oy,shape(),w,h); draw();});
  [ox,oy]=clampPos(ox,oy,shape(),w,h); draw();
}
