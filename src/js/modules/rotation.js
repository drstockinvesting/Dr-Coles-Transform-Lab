import * as Utils from '../utils.js';
import {
  updateTransBox, formatSideBySide, initCanvas, attachResize,
  clampPos, drawGrid, gShape, gLabels, gLine, gDot, multiDrag
} from '../canvas.js';

export function init() {
  let cData = initCanvas('roCanvas');
  let {canvas,ctx,w,h,cx,cy} = cData;
  let sk='triangle', level=1;
  let ox=Utils.snap(cx-2*Utils.STEP), oy=Utils.snap(cy+2*Utils.STEP);
  let cxR=cx, cyR=cy;
  let angle=0, arcVtx=0, preRot=0;
  let chalRo3=null, revealedRo3=false, centerPlaced3=false, userAngle3=0;
  let chalRo4=null, revealedRo4=false, centerPlaced4=false, userAngle4=0;
  let chalRo5=null, revealedRo5=false, userAngle5=0, selectedRule5=null;
  const COLOR='#ffcc00';
  const LEVEL_NAMES = {1:'Explore',2:'Explore',3:'Apply',4:'Challenge',5:'Rules'};

  // Floating tooltip for blocked slider interactions
  let tipTimer=null;
  const floatTip=document.createElement('div');
  floatTip.style.cssText='position:fixed;background:rgba(10,5,25,.95);border:1px solid rgba(255,100,100,.5);color:#ff8899;padding:5px 12px;border-radius:8px;font-size:.78rem;font-family:"Space Mono",monospace;pointer-events:none;z-index:1000;display:none;white-space:nowrap;box-shadow:0 2px 12px rgba(0,0,0,.5);';
  document.body.appendChild(floatTip);
  function showTip(mx,my,txt){
    floatTip.textContent=txt;
    floatTip.style.left='0px'; floatTip.style.top='0px'; floatTip.style.display='block';
    const tw=floatTip.offsetWidth, th=floatTip.offsetHeight;
    const vw=window.innerWidth, vh=window.innerHeight;
    const x=Math.min(mx+14, vw-tw-8);
    const y=Math.max(8, Math.min(my-32, vh-th-8));
    floatTip.style.left=x+'px'; floatTip.style.top=y+'px';
    clearTimeout(tipTimer); tipTimer=setTimeout(()=>{floatTip.style.display='none';},2000);
  }

  function correctRuleFor(a){const n=((a%360)+360)%360; if(n===90) return '90'; if(n===180) return '180'; if(n===270) return '270'; return '360';}
  const shape=()=>{let base=Utils.getShape(sk); if(preRot) return base.map(([px,py])=>Utils.rotatePt(px,py,0,0,preRot)); return base;};

  function buildVtxBtns(containerId){
    const c=Utils.el(containerId); if(!c) return; c.innerHTML='';
    shape().forEach((_,i)=>{const b=document.createElement('button'); b.className='axbtn'+(i===arcVtx?' active':''); b.textContent=String.fromCharCode(65+i); b.addEventListener('click',()=>{arcVtx=i; rebuildAllVtxBtns(); draw();}); c.appendChild(b);});
  }
  function rebuildAllVtxBtns(){['roVtxBtns1','roVtxBtns2','roVtxBtns3','roVtxBtns4','roVtxBtns5'].forEach(id=>buildVtxBtns(id));}

  // Build the four concrete-coordinate answer buttons for L5
  function buildOptions5(){
    const container=Utils.el('roRuleBtns5');
    if(!container||!chalRo5) return;
    // Use the fixed vertex stored in the challenge (not the arc-display vertex)
    const pts=shape(), vi=Math.min(chalRo5.vIdx, pts.length-1);
    const vLbl=String.fromCharCode(65+vi)+"'";
    const [gx,gy]=Utils.gc(ox+pts[vi][0], oy+pts[vi][1], cx, cy);
    // Correct coordinate formulas matching rotatePt (screen y-down: 90° CW visually)
    // 90°:  (gx,gy)→( gy,−gx)   270°: (gx,gy)→(−gy, gx)
    // 180°: (gx,gy)→(−gx,−gy)   360°: (gx,gy)→( gx, gy)
    const coordsFor={'90':[gy,-gx],'270':[-gy,gx],'180':[-gx,-gy],'360':[gx,gy]};
    const base=[{rule:'90',type:'switch'},{rule:'270',type:'switch'},{rule:'180',type:'keep'},{rule:'360',type:'keep'}];
    // Apply stored shuffle order (set at challenge generation)
    const opts=chalRo5.optOrder.map(i=>{const b=base[i];const[x,y]=coordsFor[b.rule];return{...b,x,y};});
    const correct=correctRuleFor(chalRo5.angle);
    container.innerHTML='';
    opts.forEach(opt=>{
      const b=document.createElement('button');
      let cls='rule-btn';
      if(revealedRo5){if(opt.rule===correct) cls+=' correct';}
      else if(selectedRule5===opt.rule) cls+=' selected';
      b.className=cls; b.dataset.rule=opt.rule;
      const lbl=opt.type==='switch'?'Switch x \u0026 y:':'Keep x \u0026 y:';
      b.innerHTML=`${lbl} <span style="white-space:nowrap">${vLbl}(${opt.x},\u00a0${opt.y})</span>`;
      if(!revealedRo5){b.addEventListener('click',function(){document.querySelectorAll('#roRuleBtns5 .rule-btn').forEach(x=>x.className='rule-btn');this.classList.add('selected');selectedRule5=this.dataset.rule;});}
      container.appendChild(b);
    });
  }

  function drawArc(CC,CR,vx,vy,ang){
    const r=Math.hypot(vx-CC,vy-CR); if(r<1) return;
    const startA=Math.atan2(vy-CR,vx-CC), endA=startA+(ang*Math.PI/180);
    ctx.save(); ctx.shadowColor=Utils.rgba(COLOR,.6); ctx.shadowBlur=10; ctx.strokeStyle=Utils.rgba(COLOR,.55); ctx.lineWidth=2; ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.arc(CC,CR,r,startA,endA,ang<0); ctx.stroke();
    const tipA=endA, tipX=CC+r*Math.cos(tipA), tipY=CR+r*Math.sin(tipA), tangentA=ang>=0?tipA+Math.PI/2:tipA-Math.PI/2;
    ctx.setLineDash([]); ctx.fillStyle=Utils.rgba(COLOR,.7); ctx.beginPath(); ctx.moveTo(tipX,tipY); ctx.lineTo(tipX-9*Math.cos(tangentA-.45),tipY-9*Math.sin(tangentA-.45)); ctx.lineTo(tipX-9*Math.cos(tangentA+.45),tipY-9*Math.sin(tangentA+.45)); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function drawArcAndRays(CC,CR,absPre,imgAbs,ang,vi){if(Math.abs(ang)>1) drawArc(CC,CR,absPre[vi][0],absPre[vi][1],ang); gLine(ctx,CC,CR,absPre[vi][0],absPre[vi][1],Utils.rgba('#4dd8f0',.4),true); gLine(ctx,CC,CR,imgAbs[vi][0],imgAbs[vi][1],Utils.rgba(COLOR,.4),true);}
  function getRotTransText(ang,gcc,gcr){if(ang===0) return ''; return `Rotation: ${ang}° around P(${gcc}, ${gcr})`;}

  function draw(){
    drawGrid(ctx,w,h,cx,cy); const pts=shape();
    if(level===5){
      gDot(ctx,cx,cy,'#bb55ff','P');
      const absPre=pts.map(([px,py])=>[ox+px,oy+py]);
      const imgAbsSlider=absPre.map(([px,py])=>Utils.rotatePt(px,py,cx,cy,userAngle5));
      const vi=Math.min(arcVtx,pts.length-1);
      // Arc + rays based on current slider angle (always visible)
      if(Math.abs(userAngle5)>1) drawArcAndRays(cx,cy,absPre,imgAbsSlider,userAngle5,vi);
      else {gLine(ctx,cx,cy,absPre[vi][0],absPre[vi][1],Utils.rgba('#4dd8f0',.4),true); gLine(ctx,cx,cy,imgAbsSlider[vi][0],imgAbsSlider[vi][1],Utils.rgba(COLOR,.4),true);}
      // Pre-image always visible
      gShape(ctx,pts,ox,oy,'#4dd8f0'); gLabels(ctx,pts,ox,oy,'#4dd8f0');
      // Image hidden until correct answer or Show Me
      if(revealedRo5&&chalRo5){
        const imgAbsRev=absPre.map(([px,py])=>Utils.rotatePt(px,py,cx,cy,chalRo5.angle));
        const[rcx5,rcy5]=Utils.rotatePt(ox,oy,cx,cy,chalRo5.angle);
        const imgRel5=imgAbsRev.map(([px,py])=>[px-rcx5,py-rcy5]);
        gShape(ctx,imgRel5,rcx5,rcy5,COLOR); gLabels(ctx,imgRel5,rcx5,rcy5,COLOR,"'");
        if(Utils.el('roCoords5')) Utils.el('roCoords5').innerHTML=formatSideBySide(absPre,imgAbsRev,cx,cy);
      } else {
        if(Utils.el('roCoords5')) Utils.el('roCoords5').innerHTML=formatSideBySide(absPre,null,cx,cy);
      }
      updateTransBox('roTransBox5',getRotTransText(userAngle5,0,0));
      return;
    }
    if(level===4){
      gShape(ctx,pts,ox,oy,'#4dd8f0'); gLabels(ctx,pts,ox,oy,'#4dd8f0');
      if(centerPlaced4){
        gDot(ctx,cxR,cyR,'#bb55ff','P'); const absPre=pts.map(([px,py])=>[ox+px,oy+py]);
        if(revealedRo4&&chalRo4){
          const tCC=cx+chalRo4.cx*Utils.STEP, tCR=cy-chalRo4.cy*Utils.STEP, imgAbsCorrect=absPre.map(([px,py])=>Utils.rotatePt(px,py,tCC,tCR,chalRo4.angle)), [rcxC,rcyC]=Utils.rotatePt(ox,oy,tCC,tCR,chalRo4.angle), imgRelC=imgAbsCorrect.map(([px,py])=>[px-rcxC,py-rcyC]), [ugcx,ugcy]=Utils.gc(cxR,cyR,cx,cy), vi=Math.min(arcVtx,pts.length-1);
          if(ugcx!==chalRo4.cx||ugcy!==chalRo4.cy) gDot(ctx,tCC,tCR,'#00ff7f','P\u2713');
          drawArcAndRays(tCC,tCR,absPre,imgAbsCorrect,chalRo4.angle,vi); gShape(ctx,imgRelC,rcxC,rcyC,COLOR); gLabels(ctx,imgRelC,rcxC,rcyC,COLOR,"'");
          if(Utils.el('roCoords4')) Utils.el('roCoords4').innerHTML=formatSideBySide(absPre,imgAbsCorrect,cx,cy); updateTransBox('roTransBox4',getRotTransText(chalRo4.angle,chalRo4.cx,chalRo4.cy));
        } else if(Math.abs(userAngle4)>0){const imgAbsUser=absPre.map(([px,py])=>Utils.rotatePt(px,py,cxR,cyR,userAngle4)), vi=Math.min(arcVtx,pts.length-1); drawArcAndRays(cxR,cyR,absPre,imgAbsUser,userAngle4,vi); if(Utils.el('roCoords4')) Utils.el('roCoords4').innerHTML=formatSideBySide(absPre,null,cx,cy); updateTransBox('roTransBox4','');}
        else {if(Utils.el('roCoords4')) Utils.el('roCoords4').innerHTML=formatSideBySide(absPre,null,cx,cy); updateTransBox('roTransBox4','');}
      } else {const absPre=pts.map(([px,py])=>[ox+px,oy+py]); if(Utils.el('roCoords4')) Utils.el('roCoords4').innerHTML=formatSideBySide(absPre,null,cx,cy); updateTransBox('roTransBox4','');}
      return;
    }
    if(level===3){
      gShape(ctx,pts,ox,oy,'#4dd8f0'); gLabels(ctx,pts,ox,oy,'#4dd8f0');
      if(centerPlaced3){
        gDot(ctx,cxR,cyR,'#bb55ff','P'); const absPre=pts.map(([px,py])=>[ox+px,oy+py]);
        if(revealedRo3&&chalRo3){
          const[ugcx,ugcy]=Utils.gc(cxR,cyR,cx,cy);
          if(ugcx!==chalRo3.gcx||ugcy!==chalRo3.gcy){
            const tCC=cx+chalRo3.gcx*Utils.STEP, tCR=cy-chalRo3.gcy*Utils.STEP; gDot(ctx,tCC,tCR,'#00ff7f','P\u2713');
            const imgAbsReal=absPre.map(([px,py])=>Utils.rotatePt(px,py,tCC,tCR,chalRo3.angle)), [rcxR,rcyR]=Utils.rotatePt(ox,oy,tCC,tCR,chalRo3.angle), imgRelR=imgAbsReal.map(([px,py])=>[px-rcxR,py-rcyR]), vi=Math.min(arcVtx,pts.length-1);
            drawArcAndRays(tCC,tCR,absPre,imgAbsReal,chalRo3.angle,vi); gShape(ctx,imgRelR,rcxR,rcyR,COLOR); gLabels(ctx,imgRelR,rcxR,rcyR,COLOR,"'");
            if(Utils.el('roCoords3')) Utils.el('roCoords3').innerHTML=formatSideBySide(absPre,imgAbsReal,cx,cy);
          } else {
            const imgAbsCorrect=absPre.map(([px,py])=>Utils.rotatePt(px,py,cxR,cyR,chalRo3.angle)), [rcxC,rcyC]=Utils.rotatePt(ox,oy,cxR,cyR,chalRo3.angle), imgRelC=imgAbsCorrect.map(([px,py])=>[px-rcxC,py-rcyC]), vi=Math.min(arcVtx,pts.length-1);
            drawArcAndRays(cxR,cyR,absPre,imgAbsCorrect,chalRo3.angle,vi); gShape(ctx,imgRelC,rcxC,rcyC,COLOR); gLabels(ctx,imgRelC,rcxC,rcyC,COLOR,"'");
            if(Utils.el('roCoords3')) Utils.el('roCoords3').innerHTML=formatSideBySide(absPre,imgAbsCorrect,cx,cy);
          }
          updateTransBox('roTransBox3',getRotTransText(chalRo3.angle,chalRo3.gcx,chalRo3.gcy));
        } else {
          const imgAbsUser=absPre.map(([px,py])=>Utils.rotatePt(px,py,cxR,cyR,userAngle3)), [rcxU,rcyU]=Utils.rotatePt(ox,oy,cxR,cyR,userAngle3), imgRelU=imgAbsUser.map(([px,py])=>[px-rcxU,py-rcyU]), vi=Math.min(arcVtx,pts.length-1);
          if(Math.abs(userAngle3)>0) drawArcAndRays(cxR,cyR,absPre,imgAbsUser,userAngle3,vi);
          gShape(ctx,imgRelU,rcxU,rcyU,COLOR); gLabels(ctx,imgRelU,rcxU,rcyU,COLOR,"'");
          if(Utils.el('roCoords3')) Utils.el('roCoords3').innerHTML=formatSideBySide(absPre,imgAbsUser,cx,cy); const[ugcx,ugcy]=Utils.gc(cxR,cyR,cx,cy); updateTransBox('roTransBox3',getRotTransText(userAngle3,ugcx,ugcy));
        }
      } else {const absPre=pts.map(([px,py])=>[ox+px,oy+py]); if(Utils.el('roCoords3')) Utils.el('roCoords3').innerHTML=formatSideBySide(absPre,null,cx,cy); updateTransBox('roTransBox3','');}
      return;
    }
    const CC=(level===1)?cx:cxR, CR=(level===1)?cy:cyR; gDot(ctx,CC,CR,'#bb55ff','P');
    const absPre=pts.map(([px,py])=>[ox+px,oy+py]), imgAbs=absPre.map(([px,py])=>Utils.rotatePt(px,py,CC,CR,angle)), [rcx,rcy]=Utils.rotatePt(ox,oy,CC,CR,angle), imgRel=imgAbs.map(([px,py])=>[px-rcx,py-rcy]), vi=Math.min(arcVtx,pts.length-1);
    if(Math.abs(angle)>1) drawArc(CC,CR,absPre[vi][0],absPre[vi][1],angle); gLine(ctx,CC,CR,absPre[vi][0],absPre[vi][1],Utils.rgba('#4dd8f0',.4),true); gLine(ctx,CC,CR,imgAbs[vi][0],imgAbs[vi][1],Utils.rgba(COLOR,.4),true);
    gShape(ctx,pts,ox,oy,'#4dd8f0'); gLabels(ctx,pts,ox,oy,'#4dd8f0'); gShape(ctx,imgRel,rcx,rcy,COLOR); gLabels(ctx,imgRel,rcx,rcy,COLOR,"'");
    const[gcc,gcr]=Utils.gc(CC,CR,cx,cy); Utils.set('roV1',`${angle}°`); Utils.set('roV2',`${angle}°`);
    if(Utils.el('roCoords1')) Utils.el('roCoords1').innerHTML=formatSideBySide(absPre,imgAbs,cx,cy); if(Utils.el('roCoords2')) Utils.el('roCoords2').innerHTML=formatSideBySide(absPre,imgAbs,cx,cy); updateTransBox('roTransBox'+level,getRotTransText(angle,gcc,gcr));
  }

  multiDrag(canvas,[{pos:()=>[cxR,cyR],set:([x,y])=>{if(level===2){cxR=Utils.snap(x);cyR=Utils.snap(y);}},r:24,snp:true},{pos:()=>[ox,oy],set:([x,y])=>{if(level===1||level===2){ox=Utils.snap(x);oy=Utils.snap(y);}},bounds:(x,y)=>clampPos(x,y,shape(),w,h),r:75}],draw);

  canvas.addEventListener('click',function(e){if(level!==3&&level!==4) return; if(level===3&&revealedRo3) return; if(level===4&&revealedRo4) return; const r=canvas.getBoundingClientRect(); cxR=Utils.snap(e.clientX-r.left); cyR=Utils.snap(e.clientY-r.top); if(level===3) centerPlaced3=true; if(level===4) centerPlaced4=true; draw();});

  Utils.el('roS1').addEventListener('input',function(){angle=+this.value; if(Utils.el('roS2'))Utils.el('roS2').value=angle; draw();});
  document.querySelectorAll('.ro-quick').forEach(b=>b.addEventListener('click',function(){angle=+this.dataset.a; Utils.el('roS1').value=angle; if(Utils.el('roS2'))Utils.el('roS2').value=angle; draw();}));
  Utils.el('roRst1').addEventListener('click',()=>{ox=Utils.snap(cx-2*Utils.STEP);oy=Utils.snap(cy+2*Utils.STEP);[ox,oy]=clampPos(ox,oy,shape(),w,h); angle=0; Utils.el('roS1').value=0; if(Utils.el('roS2'))Utils.el('roS2').value=0; draw();});
  Utils.el('roS2').addEventListener('input',function(){angle=+this.value; Utils.el('roS1').value=angle; draw();});
  document.querySelectorAll('.ro-quick2').forEach(b=>b.addEventListener('click',function(){angle=+this.dataset.a; Utils.el('roS1').value=angle; Utils.el('roS2').value=angle; draw();}));
  Utils.el('roRst2').addEventListener('click',()=>{ox=Utils.snap(cx-2*Utils.STEP);oy=Utils.snap(cy+2*Utils.STEP);[ox,oy]=clampPos(ox,oy,shape(),w,h); cxR=cx;cyR=cy; angle=0; Utils.el('roS1').value=0; Utils.el('roS2').value=0; draw();});

  // L3 slider: blocked until CoR is placed
  let sliderPos3={x:0,y:0};
  Utils.el('roS3').addEventListener('pointerdown',function(e){sliderPos3={x:e.clientX,y:e.clientY};});
  Utils.el('roS3').addEventListener('input',function(){
    if(!centerPlaced3){this.value=0; showTip(sliderPos3.x,sliderPos3.y,'Rotations require a center.'); return;}
    userAngle3=+this.value; Utils.set('roV3',`${userAngle3}°`); draw();
  });

  // L4 slider: blocked until CoR is placed
  let sliderPos4={x:0,y:0};
  Utils.el('roS4').addEventListener('pointerdown',function(e){sliderPos4={x:e.clientX,y:e.clientY};});
  Utils.el('roS4').addEventListener('input',function(){
    if(!centerPlaced4){this.value=0; showTip(sliderPos4.x,sliderPos4.y,'Rotations require a center.'); return;}
    userAngle4=+this.value; Utils.set('roV4',`${userAngle4}°`); draw();
  });

  Utils.el('roS5').addEventListener('input',function(){userAngle5=+this.value; Utils.set('roV5',`${userAngle5}°`); draw();});

  function newChallengeL3(){
    preRot=[0,90,180,270][Math.floor(Math.random()*4)]; ox=cx+(Math.floor(Math.random()*7)-3)*Utils.STEP; oy=cy+(Math.floor(Math.random()*5)-2)*Utils.STEP; [ox,oy]=clampPos(ox,oy,shape(),w,h);
    const angles=[90,180,270,-90,-180,-270], chosenAngle=angles[Math.floor(Math.random()*angles.length)]; let targetCX=cx,targetCY=cy;
    for(let a=0;a<50;a++){const tcx=cx+(Math.floor(Math.random()*9)-4)*Utils.STEP,tcy=cy+(Math.floor(Math.random()*7)-3)*Utils.STEP, absPre=shape().map(([px,py])=>[ox+px,oy+py]); if(absPre.map(([px,py])=>Utils.rotatePt(px,py,tcx,tcy,chosenAngle)).every(([px,py])=>px>=Utils.STEP&&px<=w-Utils.STEP&&py>=Utils.STEP&&py<=h-Utils.STEP)){targetCX=tcx;targetCY=tcy;break;}}
    const[gcc,gcr]=Utils.gc(targetCX,targetCY,cx,cy); chalRo3={angle:chosenAngle,gcx:gcc,gcy:gcr,absCX:targetCX,absCY:targetCY}; centerPlaced3=false; userAngle3=0; revealedRo3=false; cxR=cx; cyR=cy; Utils.el('roS3').value=0; Utils.set('roV3','0°');
    Utils.el('roRule3').innerHTML=`Rotate ${chosenAngle}° <span style="white-space:nowrap">around P(${gcc},\u00a0${gcr})</span>`;
    const r=Utils.el('roRes3'); r.textContent=''; r.className='pres'; Utils.el('roShow3').style.display='none'; draw();
  }
  Utils.el('roChk3').addEventListener('click',()=>{
    if(!chalRo3) return; if(!centerPlaced3){const r=Utils.el('roRes3');r.textContent='Click on the graph to place center P first.';r.className='pres warn';return;}
    const[ugcx,ugcy]=Utils.gc(cxR,cyR,cx,cy), centerOK=(ugcx===chalRo3.gcx&&ugcy===chalRo3.gcy), angleOK=(userAngle3===chalRo3.angle), r=Utils.el('roRes3'),sb=Utils.el('roShow3');
    if(centerOK&&angleOK){revealedRo3=true;r.textContent='🎉 Great job! That\'s the correct rotation — try a new one!';r.className='pres ok';sb.style.display='none';}
    else if(!centerOK&&!angleOK){r.textContent='Check both center P and the angle.';r.className='pres no';sb.style.display='inline-flex';} else if(!centerOK){r.textContent='The angle is correct, but check center P!';r.className='pres no';sb.style.display='inline-flex';} else{r.textContent='Center P is correct! Now adjust the angle.';r.className='pres no';sb.style.display='inline-flex';}
    draw();
  });
  Utils.el('roShow3').addEventListener('click',()=>{if(!chalRo3) return; revealedRo3=true; cxR=chalRo3.absCX; cyR=chalRo3.absCY; centerPlaced3=true; userAngle3=chalRo3.angle; Utils.el('roS3').value=userAngle3; Utils.set('roV3',`${userAngle3}°`); const r=Utils.el('roRes3');r.textContent='Here\'s the solution! Try a new one when you\'re ready.';r.className='pres ok';Utils.el('roShow3').style.display='none'; draw();});
  Utils.el('roNew3').addEventListener('click',newChallengeL3);

  function newChallengeL4(){
    preRot=[0,90,180,270][Math.floor(Math.random()*4)]; ox=cx+(Math.floor(Math.random()*7)-3)*Utils.STEP; oy=cy+(Math.floor(Math.random()*5)-2)*Utils.STEP; [ox,oy]=clampPos(ox,oy,shape(),w,h);
    const angles=[90,180,270,-90,-180,-270], chosenAngle=angles[Math.floor(Math.random()*angles.length)]; let targetCX=cx,targetCY=cy;
    for(let a=0;a<50;a++){const tcx=cx+(Math.floor(Math.random()*9)-4)*Utils.STEP,tcy=cy+(Math.floor(Math.random()*7)-3)*Utils.STEP, absPre=shape().map(([px,py])=>[ox+px,oy+py]); if(absPre.map(([px,py])=>Utils.rotatePt(px,py,tcx,tcy,chosenAngle)).every(([px,py])=>px>=Utils.STEP&&px<=w-Utils.STEP&&py>=Utils.STEP&&py<=h-Utils.STEP)){targetCX=tcx;targetCY=tcy;break;}}
    const[gcc,gcr]=Utils.gc(targetCX,targetCY,cx,cy), vIdx=Math.floor(Math.random()*shape().length); chalRo4={angle:chosenAngle,cx:gcc,cy:gcr,absCX:targetCX,absCY:targetCY,vIdx:vIdx}; centerPlaced4=false; userAngle4=0; revealedRo4=false; cxR=cx; cyR=cy; Utils.el('roS4').value=0; Utils.set('roV4','0°'); Utils.el('roPX4').value=''; Utils.el('roPY4').value='';
    Utils.set('roChalQ4',`Where will vertex ${String.fromCharCode(65+vIdx)}' land?`);
    Utils.el('roRule4').innerHTML=`Rotate ${chosenAngle}° <span style="white-space:nowrap">around P(${gcc},\u00a0${gcr})</span>`;
    const r=Utils.el('roRes4'); r.textContent=''; r.className='pres'; Utils.el('roShow4').style.display='none'; draw();
  }
  Utils.el('roChk4').addEventListener('click',()=>{
    if(!chalRo4) return; if(!centerPlaced4){const r=Utils.el('roRes4');r.textContent='Click on the graph to place center P first.';r.className='pres warn';return;}
    const px=parseInt(Utils.el('roPX4').value),py=parseInt(Utils.el('roPY4').value); if(isNaN(px)||isNaN(py)){const r=Utils.el('roRes4');r.textContent='Enter your predicted coordinates.';r.className='pres warn';return;}
    const[ugcx,ugcy]=Utils.gc(cxR,cyR,cx,cy), centerOK=(ugcx===chalRo4.cx&&ugcy===chalRo4.cy), angleOK=(userAngle4===chalRo4.angle), tCC=chalRo4.absCX,tCR=chalRo4.absCY, absPre=shape().map(([px,py])=>[ox+px,oy+py]), imgAbsCorrect=absPre.map(([px,py])=>Utils.rotatePt(px,py,tCC,tCR,chalRo4.angle)), [ansX,ansY]=Utils.gc(imgAbsCorrect[chalRo4.vIdx][0],imgAbsCorrect[chalRo4.vIdx][1],cx,cy), coordOK=(px===ansX&&py===ansY), vL=String.fromCharCode(65+chalRo4.vIdx), r=Utils.el('roRes4'),sb=Utils.el('roShow4');
    if(centerOK&&angleOK&&coordOK){revealedRo4=true;r.textContent=`🎉 Great job! ${vL}' is at (${ansX}, ${ansY}) — try a new one!`;r.className='pres ok';sb.style.display='none';}
    else {let h=[]; if(!centerOK)h.push('center placement'); if(!angleOK)h.push('angle'); if(!coordOK)h.push('predicted coordinates'); r.textContent=`Check your ${h.join(' and ')} — you've got this!`; r.className='pres no'; sb.style.display='inline-flex';}
    draw();
  });
  Utils.el('roShow4').addEventListener('click',()=>{if(!chalRo4) return; revealedRo4=true; cxR=chalRo4.absCX; cyR=chalRo4.absCY; centerPlaced4=true; userAngle4=chalRo4.angle; Utils.el('roS4').value=userAngle4; Utils.set('roV4',`${userAngle4}°`); const absPre=shape().map(([px,py])=>[ox+px,oy+py]), imgAbsCorrect=absPre.map(([px,py])=>Utils.rotatePt(px,py,cxR,cyR,chalRo4.angle)), [ansX,ansY]=Utils.gc(imgAbsCorrect[chalRo4.vIdx][0],imgAbsCorrect[chalRo4.vIdx][1],cx,cy), vL=String.fromCharCode(65+chalRo4.vIdx); Utils.el('roPX4').value=ansX; Utils.el('roPY4').value=ansY; const r=Utils.el('roRes4'); r.textContent=`${vL}' is at (${ansX}, ${ansY}). Try a new one when you're ready!`; r.className='pres ok'; Utils.el('roShow4').style.display='none'; draw();});
  Utils.el('roNew4').addEventListener('click',newChallengeL4);

  function newChallengeL5(){
    preRot=[0,90,180,270][Math.floor(Math.random()*4)]; ox=cx+(Math.floor(Math.random()*7)-3)*Utils.STEP; oy=cy+(Math.floor(Math.random()*5)-2)*Utils.STEP; [ox,oy]=clampPos(ox,oy,shape(),w,h);
    const angles=[90,180,270], chosenAngle=angles[Math.floor(Math.random()*angles.length)];
    const absPre=shape().map(([px,py])=>[ox+px,oy+py]);
    if(!absPre.map(([px,py])=>Utils.rotatePt(px,py,cx,cy,chosenAngle)).every(([px,py])=>px>=0&&px<=w&&py>=0&&py<=h)){ox=cx; oy=Utils.snap(cy+2*Utils.STEP); [ox,oy]=clampPos(ox,oy,shape(),w,h);}
    // Shuffle within type groups once at challenge generation
    const order=[0,1,2,3];
    if(Math.random()>.5){[order[0],order[1]]=[order[1],order[0]];}
    if(Math.random()>.5){[order[2],order[3]]=[order[3],order[2]];}
    const vIdx5=Math.floor(Math.random()*shape().length);
    chalRo5={angle:chosenAngle,optOrder:order,vIdx:vIdx5}; userAngle5=0; revealedRo5=false; selectedRule5=null;
    Utils.el('roS5').value=0; Utils.set('roV5','0°');
    Utils.el('roRule5').innerHTML=`Rotate ${chosenAngle}° <span style="white-space:nowrap">around P(0,\u00a00)</span>`;
    const r=Utils.el('roRes5'); r.textContent=''; r.className='pres'; Utils.el('roShow5').style.display='none';
    buildOptions5(); draw();
  }
  Utils.el('roChk5').addEventListener('click',()=>{
    if(!chalRo5) return;
    if(!selectedRule5){const r=Utils.el('roRes5');r.textContent='Select an answer below.';r.className='pres warn';return;}
    const correct=correctRuleFor(chalRo5.angle), r=Utils.el('roRes5'), sb=Utils.el('roShow5');
    if(selectedRule5===correct){
      revealedRo5=true; buildOptions5();
      r.textContent='🎉 Great job! That\'s the correct result — try a new one!'; r.className='pres ok'; sb.style.display='none'; draw();
    } else {
      document.querySelectorAll('#roRuleBtns5 .rule-btn').forEach(b=>{if(b.classList.contains('selected')) b.className='rule-btn wrong';});
      r.textContent='Not quite — take another look at the graph!'; r.className='pres no'; sb.style.display='inline-flex';
    }
  });
  Utils.el('roShow5').addEventListener('click',()=>{
    if(!chalRo5) return; revealedRo5=true; selectedRule5=correctRuleFor(chalRo5.angle);
    userAngle5=chalRo5.angle; Utils.el('roS5').value=userAngle5; Utils.set('roV5',`${userAngle5}°`);
    buildOptions5(); const r=Utils.el('roRes5'); r.textContent='Here\'s the solution! Try a new one when you\'re ready.'; r.className='pres ok'; Utils.el('roShow5').style.display='none'; draw();
  });
  Utils.el('roNew5').addEventListener('click',newChallengeL5);

  document.querySelectorAll('#roSB .sbtn').forEach(b=>b.addEventListener('click',function(){document.querySelectorAll('#roSB .sbtn').forEach(x=>x.classList.remove('active')); this.classList.add('active');sk=this.dataset.shape; arcVtx=0; rebuildAllVtxBtns(); if(level===1||level===2){[ox,oy]=clampPos(ox,oy,shape(),w,h);} if(level===3) newChallengeL3(); if(level===4) newChallengeL4(); if(level===5) newChallengeL5(); draw();}));
  document.querySelectorAll('[data-panel=rotation] .lbtn').forEach(b=>b.addEventListener('click',function(){document.querySelectorAll('[data-panel=rotation] .lbtn').forEach(x=>x.classList.remove('active')); this.classList.add('active'); level=+this.dataset.level; document.querySelector('[data-panel=rotation]').setAttribute('data-level',level); Utils.set('roLN', LEVEL_NAMES[level]||'Explore'); preRot=0; angle=0; Utils.el('roS1').value=0; Utils.el('roS2').value=0; if(level===1||level===2){cxR=cx;cyR=cy; ox=Utils.snap(cx-2*Utils.STEP);oy=Utils.snap(cy+2*Utils.STEP);[ox,oy]=clampPos(ox,oy,shape(),w,h);} if(level===3) newChallengeL3(); if(level===4) newChallengeL4(); if(level===5) newChallengeL5(); draw();}));

  attachResize('roCanvas',()=>{const fresh=initCanvas('roCanvas'); const dx=fresh.cx-cx,dy=fresh.cy-cy; w=fresh.w;h=fresh.h;cx=fresh.cx;cy=fresh.cy; ox+=dx;oy+=dy;cxR+=dx;cyR+=dy; [ox,oy]=clampPos(ox,oy,shape(),w,h); draw();});
  rebuildAllVtxBtns(); [ox,oy]=clampPos(ox,oy,shape(),w,h); draw();
}
