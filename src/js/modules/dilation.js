import * as Utils from '../utils.js';
import {
  updateTransBox, initCanvas, attachResize,
  clampPos, drawGrid, gShape, gLabels, gDot, multiDrag
} from '../canvas.js';

export function init() {
  let cData = initCanvas('dCanvas');
  let {canvas,ctx,w,h,cx,cy} = cData;
  let sk='triangle', level=1, scale=1;
  let DCX=cx, DCY=cy;
  let ox=Utils.snap(cx+Utils.STEP), oy=Utils.snap(cy-Utils.STEP);
  const COLOR='#ffcc00';
  const LEVEL_NAMES={1:'Explore',2:'Explore',3:'Apply',4:'Challenge',5:'Rules'};
  const shape=()=>Utils.getShape(sk);
  const dilPt=(px,py,kx,ky,k)=>[kx+(px-kx)*k, ky+(py-ky)*k];

  // L2 state
  let showDist2=true, selVtx2=0;
  // L3 state
  let chalD3=null, revealedD3=false, centerPlaced3=false, dCX3=cx, dCY3=cy, userScale3=1, userType3=null;
  // L4 state
  let chalD4=null, revealedD4=false;
  // L5 state
  let chalD5=null, revealedD5=false, placedVerts5=[];

  // ── Floating tooltip ──
  let tipTimer=null;
  const floatTip=document.createElement('div');
  floatTip.style.cssText='position:fixed;background:rgba(10,5,25,.95);border:1px solid rgba(255,51,85,.5);color:#ff8899;padding:5px 12px;border-radius:8px;font-size:.78rem;font-family:"Space Mono",monospace;pointer-events:none;z-index:1000;display:none;white-space:nowrap;box-shadow:0 2px 12px rgba(0,0,0,.5);';
  document.body.appendChild(floatTip);
  function showTip(mx,my,html){
    floatTip.innerHTML=html;
    floatTip.style.left='0px'; floatTip.style.top='0px'; floatTip.style.display='block';
    const tw=floatTip.offsetWidth, th=floatTip.offsetHeight;
    const vw=window.innerWidth, vh=window.innerHeight;
    floatTip.style.left=Math.min(mx+14,vw-tw-8)+'px';
    floatTip.style.top=Math.max(8,Math.min(my-32,vh-th-8))+'px';
    clearTimeout(tipTimer); tipTimer=setTimeout(()=>{floatTip.style.display='none';},2200);
  }

  // Round a pixel coord to grid value (up to 1 decimal)
  function gcRound(px, origin, flip=false) {
    const raw=(px-origin)/Utils.STEP*(flip?-1:1);
    const r=Math.round(raw*10)/10;
    return Number.isInteger(r)?r:parseFloat(r.toFixed(1));
  }

  // Coord table
  function formatDilCoords(absPre, absImg) {
    let html=`<div class="coord-grid"><div class="coord-col"><div class="ck cpre" style="margin-bottom:2px">Pre-image</div>`;
    if(absPre) absPre.forEach((p,i)=>{
      const gx=gcRound(p[0],cx), gy=gcRound(p[1],cy,true);
      html+=`<div class="cpre">${String.fromCharCode(65+i)}(${gx}, ${gy})</div>`;
    });
    html+=`</div><div class="coord-col"><div class="ck cimg" style="margin-bottom:2px">Image</div>`;
    if(absImg) absImg.forEach((p,i)=>{
      const gx=gcRound(p[0],cx), gy=gcRound(p[1],cy,true);
      html+=`<div class="cimg">${String.fromCharCode(65+i)}'(${gx}, ${gy})</div>`;
    });
    html+=`</div></div>`;
    return html;
  }

  function drawRays(KX,KY,absPts,color,alpha){
    ctx.save();
    ctx.strokeStyle=Utils.rgba(color,alpha); ctx.lineWidth=1.2; ctx.setLineDash([5,4]);
    ctx.shadowColor=color; ctx.shadowBlur=4;
    absPts.forEach(([px,py])=>{ctx.beginPath();ctx.moveTo(KX,KY);ctx.lineTo(px,py);ctx.stroke();});
    ctx.restore();
  }

  // Draw horizontal + vertical component lines from K to a vertex, labeled in grid units.
  // bboxPts: array of [px,py] pixel positions of all visible shape vertices — used to
  // pick which L-corner lies outside the shapes rather than through their interior.
  function drawDistLines(KX, KY, vtxPx, vtxPy, color, bboxPts=[]) {
    if(Math.abs(vtxPx-KX)<2&&Math.abs(vtxPy-KY)<2) return;
    const vGx=gcRound(vtxPx,cx), vGy=gcRound(vtxPy,cy,true);
    const kGx=gcRound(KX,cx);
    const dGx=Math.round(Math.abs(vGx-kGx)*10)/10;
    const dGy=Math.round(Math.abs(vGy-gcRound(KY,cy,true))*10)/10;
    if(dGx===0&&dGy===0) return;

    // Compute combined bounding box of all shape points + K + target vertex
    let bMinX=Infinity,bMaxX=-Infinity,bMinY=Infinity,bMaxY=-Infinity;
    [[KX,KY],[vtxPx,vtxPy],...bboxPts].forEach(([x,y])=>{
      bMinX=Math.min(bMinX,x); bMaxX=Math.max(bMaxX,x);
      bMinY=Math.min(bMinY,y); bMaxY=Math.max(bMaxY,y);
    });
    const bcx=(bMinX+bMaxX)/2, bcy=(bMinY+bMaxY)/2;

    // Two L-corner candidates:
    //  c1 (horizontal-first): corner at (vtxPx, KY)
    //  c2 (vertical-first):   corner at (KX, vtxPy)
    const inBox=(x,y,m=6)=>x>bMinX+m&&x<bMaxX-m&&y>bMinY+m&&y<bMaxY-m;
    const c1In=inBox(vtxPx,KY), c2In=inBox(KX,vtxPy);
    // Prefer the corner that is outside the bbox.
    // Tie-break: pick whichever corner is farther from the bbox centre.
    const d1=Math.hypot(vtxPx-bcx,KY-bcy), d2=Math.hypot(KX-bcx,vtxPy-bcy);
    const horizFirst=(!c1In&&c2In)?true:(c1In&&!c2In)?false:(d1>=d2);

    ctx.save();
    ctx.strokeStyle=Utils.rgba(color,.9); ctx.lineWidth=1.6; ctx.setLineDash([5,3]);
    ctx.fillStyle=color;
    ctx.font='bold 9.5px "Space Mono",monospace';

    if(horizFirst){
      // K → (vtxPx, KY) → vertex
      if(dGx>0){
        ctx.beginPath(); ctx.moveTo(KX,KY); ctx.lineTo(vtxPx,KY); ctx.stroke();
        ctx.textAlign='center';
        ctx.fillText(String(dGx),(KX+vtxPx)/2,KY+(vtxPy>KY?-8:12));
      }
      if(dGy>0){
        ctx.beginPath(); ctx.moveTo(vtxPx,KY); ctx.lineTo(vtxPx,vtxPy); ctx.stroke();
        ctx.textAlign=vtxPx>=KX?'left':'right';
        ctx.fillText(String(dGy),vtxPx+(vtxPx>=KX?7:-7),(KY+vtxPy)/2);
      }
    } else {
      // K → (KX, vtxPy) → vertex
      if(dGy>0){
        ctx.beginPath(); ctx.moveTo(KX,KY); ctx.lineTo(KX,vtxPy); ctx.stroke();
        ctx.textAlign=vtxPx>=KX?'right':'left';
        ctx.fillText(String(dGy),KX+(vtxPx>=KX?-8:8),(KY+vtxPy)/2);
      }
      if(dGx>0){
        ctx.beginPath(); ctx.moveTo(KX,vtxPy); ctx.lineTo(vtxPx,vtxPy); ctx.stroke();
        ctx.textAlign='center';
        ctx.fillText(String(dGx),(KX+vtxPx)/2,vtxPy+(vtxPy>=KY?12:-8));
      }
    }
    ctx.restore();
  }

  function getDilTransText(k,kgx,kgy){
    return k!==1?`Dilation: \u00d7${k} from K(${kgx}, ${kgy})`:'';
  }

  // ── Build L2 vertex selector buttons ──
  function buildVtxBtns2(){
    const c=Utils.el('dVtxBtns2'); if(!c) return;
    c.innerHTML='';
    shape().forEach((_,i)=>{
      const b=document.createElement('button');
      b.className='rule-btn'+(i===selVtx2?' selected':'');
      b.style.cssText='min-width:34px;padding:4px 9px;font-size:.75rem;';
      b.textContent=String.fromCharCode(65+i);
      b.addEventListener('click',()=>{
        selVtx2=i;
        c.querySelectorAll('.rule-btn').forEach((x,j)=>x.classList.toggle('selected',j===i));
        draw();
      });
      c.appendChild(b);
    });
  }

  // ── Main draw ──
  function draw(){
    drawGrid(ctx,w,h,cx,cy);
    const pts=shape();
    const absPts=pts.map(([px,py])=>[ox+px,oy+py]);

    // ── L5: K at origin, student places image vertices ──
    if(level===5){
      gDot(ctx,cx,cy,'#ffffff','K');
      gShape(ctx,pts,ox,oy,'#4dd8f0'); gLabels(ctx,pts,ox,oy,'#4dd8f0');
      if(!chalD5){ return; }
      const k=chalD5.scale;
      if(revealedD5){
        const imgAbs=absPts.map(([px,py])=>dilPt(px,py,cx,cy,k));
        const[rix,riy]=dilPt(ox,oy,cx,cy,k);
        const imgRel=imgAbs.map(([px,py])=>[px-rix,py-riy]);
        drawRays(cx,cy,absPts,'#ffffff',.22);
        drawRays(cx,cy,imgAbs,'#ffffff',.15);
        gShape(ctx,imgRel,rix,riy,COLOR); gLabels(ctx,imgRel,rix,riy,COLOR,"'");
        if(Utils.el('dCoords5')) Utils.el('dCoords5').innerHTML=formatDilCoords(absPts,imgAbs);
        updateTransBox('dTransBox5',getDilTransText(k,0,0));
      } else {
        if(Utils.el('dCoords5')) Utils.el('dCoords5').innerHTML=formatDilCoords(absPts,null);
        updateTransBox('dTransBox5','');
        // Draw placed vertices + connecting lines
        if(placedVerts5.length>=2){
          ctx.save();
          ctx.strokeStyle=Utils.rgba(COLOR,.55); ctx.lineWidth=1.5; ctx.setLineDash([]);
          ctx.beginPath();
          placedVerts5.forEach(([px,py],i)=>i===0?ctx.moveTo(px,py):ctx.lineTo(px,py));
          if(placedVerts5.length===pts.length) ctx.closePath();
          ctx.stroke(); ctx.restore();
        }
        placedVerts5.forEach(([px,py],i)=>gDot(ctx,px,py,COLOR,String.fromCharCode(65+i)+"'"));
        // Update active vertex label
        const nxt=placedVerts5.length;
        Utils.set('dChalQ5', nxt<pts.length
          ? `Click to place vertex ${String.fromCharCode(65+nxt)}'`
          : 'All vertices placed \u2014 click Check!');
      }
      return;
    }

    // ── L4: K + pre-image shown; image hidden until correct answer ──
    if(level===4){
      gShape(ctx,pts,ox,oy,'#4dd8f0'); gLabels(ctx,pts,ox,oy,'#4dd8f0');
      if(chalD4){
        const KX=cx+chalD4.kgx*Utils.STEP, KY=cy-chalD4.kgy*Utils.STEP;
        gDot(ctx,KX,KY,'#ffffff','K');
        drawRays(KX,KY,absPts,'#ffffff',.22);
        const vi=chalD4.vIdx;
        if(revealedD4){
          const imgAbs=absPts.map(([px,py])=>dilPt(px,py,KX,KY,chalD4.scale));
          const[rix,riy]=dilPt(ox,oy,KX,KY,chalD4.scale);
          const imgRel=imgAbs.map(([px,py])=>[px-rix,py-riy]);
          drawRays(KX,KY,imgAbs,'#ffffff',.15);
          gShape(ctx,imgRel,rix,riy,COLOR); gLabels(ctx,imgRel,rix,riy,COLOR,"'");
          // Both pre-image (cyan) and image (yellow) distance lines after reveal
          const bboxAll=[...absPts,...imgAbs];
          drawDistLines(KX,KY,absPts[vi][0],absPts[vi][1],'#4dd8f0',bboxAll);
          drawDistLines(KX,KY,imgAbs[vi][0],imgAbs[vi][1],COLOR,bboxAll);
          if(Utils.el('dCoords4')) Utils.el('dCoords4').innerHTML=formatDilCoords(absPts,imgAbs);
          updateTransBox('dTransBox4',getDilTransText(chalD4.scale,chalD4.kgx,chalD4.kgy));
        } else {
          // Pre-image vertex distance lines while question is presented
          drawDistLines(KX,KY,absPts[vi][0],absPts[vi][1],'#4dd8f0',absPts);
          if(Utils.el('dCoords4')) Utils.el('dCoords4').innerHTML=formatDilCoords(absPts,null);
          updateTransBox('dTransBox4','');
        }
      }
      return;
    }

    // ── L3: student plots K, sets scale, classifies ──
    if(level===3){
      gShape(ctx,pts,ox,oy,'#4dd8f0'); gLabels(ctx,pts,ox,oy,'#4dd8f0');
      if(centerPlaced3){
        gDot(ctx,dCX3,dCY3,'#ffffff','K');
        const imgAbs=absPts.map(([px,py])=>dilPt(px,py,dCX3,dCY3,userScale3));
        drawRays(dCX3,dCY3,absPts,'#ffffff',.22);
        if(Math.abs(userScale3-1)>0.01) drawRays(dCX3,dCY3,imgAbs,'#ffffff',.15);
        const[rix,riy]=dilPt(ox,oy,dCX3,dCY3,userScale3);
        const imgRel=imgAbs.map(([px,py])=>[px-rix,py-riy]);
        gShape(ctx,imgRel,rix,riy,COLOR); gLabels(ctx,imgRel,rix,riy,COLOR,"'");
        if(Utils.el('dCoords3')) Utils.el('dCoords3').innerHTML=formatDilCoords(absPts,imgAbs);
        updateTransBox('dTransBox3',getDilTransText(userScale3,...Utils.gc(dCX3,dCY3,cx,cy)));
        if(revealedD3&&chalD3){
          const[ucx3,ucy3]=Utils.gc(dCX3,dCY3,cx,cy);
          if(ucx3!==chalD3.kgx||ucy3!==chalD3.kgy){
            const tKX=cx+chalD3.kgx*Utils.STEP, tKY=cy-chalD3.kgy*Utils.STEP;
            gDot(ctx,tKX,tKY,'#00ff7f','K\u2713');
          }
        }
      } else {
        if(Utils.el('dCoords3')) Utils.el('dCoords3').innerHTML=formatDilCoords(absPts,null);
        updateTransBox('dTransBox3','');
      }
      return;
    }

    // ── L1 & L2 — wrapped in clip to prevent GPU crash at extreme scale values ──
    ctx.save();
    ctx.beginPath(); ctx.rect(-80,-80,w+160,h+160); ctx.clip();

    if(Math.abs(scale-1)<0.001){
      gDot(ctx,DCX,DCY,'#ffffff','K');
      gShape(ctx,pts,ox,oy,'#4dd8f0'); gLabels(ctx,pts,ox,oy,'#4dd8f0');
      if(level===2&&showDist2){
        const idx=Math.min(selVtx2,pts.length-1);
        drawDistLines(DCX,DCY,absPts[idx][0],absPts[idx][1],'#4dd8f0',absPts);
      }
      const k=scale.toFixed(1),[gcc,gcr]=Utils.gc(DCX,DCY,cx,cy);
      Utils.set('dV',k); Utils.set('dV2',k); Utils.set('dScale',k); Utils.set('dScale2',k); Utils.set('dCtr1',Utils.gf(gcc,gcr));
      const absPre=pts.map(([px,py])=>[ox+px,oy+py]);
      if(Utils.el('dCoords1')) Utils.el('dCoords1').innerHTML=formatDilCoords(absPre,absPre);
      if(Utils.el('dCoords2')) Utils.el('dCoords2').innerHTML=formatDilCoords(absPre,absPre);
      updateTransBox('dTransBox'+level,'');
      ctx.restore(); return;
    }
    const imgAbs=absPts.map(([px,py])=>dilPt(px,py,DCX,DCY,scale));
    const[dicx,dicy]=dilPt(ox,oy,DCX,DCY,scale);
    const imgRel=imgAbs.map(([px,py])=>[px-dicx,py-dicy]);
    gDot(ctx,DCX,DCY,'#ffffff','K');
    drawRays(DCX,DCY,imgAbs,'#ffffff',.22);
    gShape(ctx,imgRel,dicx,dicy,COLOR); gLabels(ctx,imgRel,dicx,dicy,COLOR,"'");
    gShape(ctx,pts,ox,oy,'#4dd8f0'); gLabels(ctx,pts,ox,oy,'#4dd8f0');
    if(level===2&&showDist2){
      const idx=Math.min(selVtx2,pts.length-1);
      const bboxAll=[...absPts,...imgAbs];
      drawDistLines(DCX,DCY,absPts[idx][0],absPts[idx][1],'#4dd8f0',bboxAll);
      drawDistLines(DCX,DCY,imgAbs[idx][0],imgAbs[idx][1],COLOR,bboxAll);
    }
    const k=scale.toFixed(1),[gcc,gcr]=Utils.gc(DCX,DCY,cx,cy);
    Utils.set('dV',k); Utils.set('dV2',k); Utils.set('dScale',k); Utils.set('dScale2',k); Utils.set('dCtr1',Utils.gf(gcc,gcr));
    if(Utils.el('dCoords1')) Utils.el('dCoords1').innerHTML=formatDilCoords(absPts,imgAbs);
    if(Utils.el('dCoords2')) Utils.el('dCoords2').innerHTML=formatDilCoords(absPts,imgAbs);
    updateTransBox('dTransBox'+level,getDilTransText(scale,gcc,gcr));
    ctx.restore();
  }

  // ── multiDrag ──
  multiDrag(canvas,[
    {pos:()=>[DCX,DCY], set:([x,y])=>{if(level===2){DCX=Utils.snap(x);DCY=Utils.snap(y);}}, r:24, snp:true},
    {pos:()=>[ox,oy],   set:([x,y])=>{if(level===1||level===2){ox=Utils.snap(x);oy=Utils.snap(y);}}, bounds:(x,y)=>clampPos(x,y,shape(),w,h), r:95},
  ],draw);

  // ── Canvas click: L3 place K | L5 place vertex ──
  canvas.addEventListener('click',function(e){
    if(level!==3&&level!==5) return;
    const rect=canvas.getBoundingClientRect();
    const kx=Utils.snap(e.clientX-rect.left), ky=Utils.snap(e.clientY-rect.top);
    if(level===3){
      if(revealedD3) return;
      dCX3=kx; dCY3=ky; centerPlaced3=true;
    } else {
      if(!chalD5||revealedD5) return;
      if(placedVerts5.length>=shape().length) return;
      placedVerts5.push([kx,ky]);
    }
    draw();
  });

  // ── Right-click: L5 undo last vertex ──
  canvas.addEventListener('contextmenu',function(e){
    if(level!==5) return;
    e.preventDefault();
    if(!revealedD5&&placedVerts5.length>0){ placedVerts5.pop(); draw(); }
  });

  // ── L1/L2 scale controls ──
  const setScale=k=>{scale=k; Utils.el('dS').value=scale; Utils.el('dS2').value=scale; draw();};
  Utils.el('dS').addEventListener('input',function(){scale=+this.value; Utils.el('dS2').value=scale; draw();});
  Utils.el('dS2').addEventListener('input',function(){scale=+this.value; Utils.el('dS').value=scale; draw();});
  Utils.el('d05').addEventListener('click',()=>setScale(.5));
  Utils.el('d1').addEventListener('click',()=>setScale(1));
  Utils.el('d2').addEventListener('click',()=>setScale(2));
  Utils.el('d3').addEventListener('click',()=>setScale(3));
  const resetD=()=>{ox=Utils.snap(cx+Utils.STEP);oy=Utils.snap(cy-Utils.STEP);if(level===1){DCX=cx;DCY=cy;}setScale(2);[ox,oy]=clampPos(ox,oy,shape(),w,h);draw();};
  Utils.el('dRst').addEventListener('click',resetD);
  Utils.el('dRst2').addEventListener('click',resetD);

  // ── L2 distance toggle + vertex selector ──
  Utils.el('dDistShow2').addEventListener('change',function(){ showDist2=this.checked; draw(); });

  // ── L3 slider – blocked until K placed ──
  let sPos3={x:0,y:0};
  Utils.el('dS3').addEventListener('pointerdown',e=>{sPos3={x:e.clientX,y:e.clientY};});
  Utils.el('dS3').addEventListener('input',function(){
    if(!centerPlaced3){
      this.value=1;
      showTip(sPos3.x,sPos3.y,'Plot <strong style="color:#fff">center K</strong> first.');
      return;
    }
    userScale3=+this.value; Utils.set('dV3',userScale3+'\u00d7'); draw();
  });

  // ── L3 stretch/shrink buttons ──
  function setType3(t){
    userType3=t;
    Utils.el('dStretch3').classList.toggle('selected',t==='stretch');
    Utils.el('dShrink3').classList.toggle('selected',t==='shrink');
  }
  Utils.el('dStretch3').addEventListener('click',()=>setType3('stretch'));
  Utils.el('dShrink3').addEventListener('click',()=>setType3('shrink'));

  // ─── Challenge generators ───

  // General placement: exhaustive search for valid (CoD, pre-image) at scale k
  function findValidChallenge(k){
    const codOff=[-2,-1,1,2], preOff=[-2,-1,0,1,2];
    const margin=Utils.STEP, valid=[];
    for(const kgx of codOff){
      for(const kgy of codOff){
        const KX=cx+kgx*Utils.STEP, KY=cy-kgy*Utils.STEP;
        for(const pgx of preOff){
          for(const pgy of preOff){
            const tOx=cx+pgx*Utils.STEP, tOy=cy-pgy*Utils.STEP;
            const[cOx,cOy]=clampPos(tOx,tOy,shape(),w,h);
            if(Math.abs(cOx-tOx)>1||Math.abs(cOy-tOy)>1) continue;
            const absPts=shape().map(([px,py])=>[tOx+px,tOy+py]);
            const imgAbs=absPts.map(([px,py])=>dilPt(px,py,KX,KY,k));
            if(imgAbs.every(([px,py])=>px>=margin&&px<=w-margin&&py>=margin&&py<=h-margin))
              valid.push({kgx,kgy,ox:tOx,oy:tOy});
          }
        }
      }
    }
    if(!valid.length) return null;
    return valid[Math.floor(Math.random()*valid.length)];
  }

  const SCALES=[0.5,1.5,2,2.5,3];
  function pickScaleCombo(){
    const order=[...SCALES].sort(()=>Math.random()-.5);
    for(const k of order){const c=findValidChallenge(k);if(c) return{k,combo:c};}
    return null;
  }

  // L4 specialized: find combo where named vertex has integer, non-zero Δx AND Δy from K
  function findValidChallengeL4(){
    const codOff=[-2,-1,1,2], preOff=[-2,-1,0,1,2];
    const margin=Utils.STEP, valid=[];
    for(const k of SCALES){
      for(const kgx of codOff){
        for(const kgy of codOff){
          const KX=cx+kgx*Utils.STEP, KY=cy-kgy*Utils.STEP;
          for(const pgx of preOff){
            for(const pgy of preOff){
              const tOx=cx+pgx*Utils.STEP, tOy=cy-pgy*Utils.STEP;
              const[cOx,cOy]=clampPos(tOx,tOy,shape(),w,h);
              if(Math.abs(cOx-tOx)>1||Math.abs(cOy-tOy)>1) continue;
              const absPts=shape().map(([px,py])=>[tOx+px,tOy+py]);
              const imgAbs=absPts.map(([px,py])=>dilPt(px,py,KX,KY,k));
              if(!imgAbs.every(([px,py])=>px>=margin&&px<=w-margin&&py>=margin&&py<=h-margin)) continue;
              const goodVtxs=[];
              for(let vi=0;vi<absPts.length;vi++){
                const imgGx=gcRound(imgAbs[vi][0],cx), imgGy=gcRound(imgAbs[vi][1],cy,true);
                const dx=Math.abs(imgGx-kgx), dy=Math.abs(imgGy-kgy);
                if(Number.isInteger(dx)&&Number.isInteger(dy)&&dx>0&&dy>0)
                  goodVtxs.push(vi);
              }
              if(goodVtxs.length>0) valid.push({k,kgx,kgy,ox:tOx,oy:tOy,goodVtxs});
            }
          }
        }
      }
    }
    if(!valid.length) return null;
    const combo=valid[Math.floor(Math.random()*valid.length)];
    const vIdx=combo.goodVtxs[Math.floor(Math.random()*combo.goodVtxs.length)];
    return{k:combo.k,kgx:combo.kgx,kgy:combo.kgy,ox:combo.ox,oy:combo.oy,vIdx};
  }

  // L5 specialized: K at origin, all image coords must be integers, both shapes on canvas
  function findValidChallengeL5(){
    const margin=Utils.STEP, valid=[];
    for(const k of SCALES){
      for(let pgx=-4;pgx<=4;pgx++){
        for(let pgy=-4;pgy<=4;pgy++){
          if(pgx===0&&pgy===0) continue;
          const tOx=cx+pgx*Utils.STEP, tOy=cy-pgy*Utils.STEP;
          const[cOx,cOy]=clampPos(tOx,tOy,shape(),w,h);
          if(Math.abs(cOx-tOx)>1||Math.abs(cOy-tOy)>1) continue;
          const absPts=shape().map(([px,py])=>[tOx+px,tOy+py]);
          if(!absPts.every(([px,py])=>px>=margin&&px<=w-margin&&py>=margin&&py<=h-margin)) continue;
          const imgAbs=absPts.map(([px,py])=>dilPt(px,py,cx,cy,k));
          if(!imgAbs.every(([px,py])=>px>=margin&&px<=w-margin&&py>=margin&&py<=h-margin)) continue;
          // All image vertex grid coords must be integers
          const allInt=imgAbs.every(([px,py])=>{
            const igx=(px-cx)/Utils.STEP, igy=(cy-py)/Utils.STEP;
            return Math.abs(igx-Math.round(igx))<0.001&&Math.abs(igy-Math.round(igy))<0.001;
          });
          if(!allInt) continue;
          valid.push({k,ox:tOx,oy:tOy});
        }
      }
    }
    if(!valid.length) return null;
    return valid[Math.floor(Math.random()*valid.length)];
  }

  // ─── L3 ───
  function newChallengeL3(){
    const res=pickScaleCombo();
    if(!res) return;
    const{k,combo}=res;
    ox=combo.ox; oy=combo.oy; [ox,oy]=clampPos(ox,oy,shape(),w,h);
    chalD3={scale:k,kgx:combo.kgx,kgy:combo.kgy};
    centerPlaced3=false; userScale3=1; revealedD3=false; userType3=null;
    dCX3=cx; dCY3=cy;
    Utils.el('dS3').value=1; Utils.set('dV3','1\u00d7');
    Utils.el('dStretch3').classList.remove('selected');
    Utils.el('dShrink3').classList.remove('selected');
    Utils.el('dRule3').innerHTML=`Scale factor ${k} <span style="white-space:nowrap">from K(${combo.kgx},\u00a0${combo.kgy})</span>`;
    const r=Utils.el('dRes3'); r.textContent=''; r.className='pres'; Utils.el('dShow3').style.display='none'; draw();
  }
  Utils.el('dChk3').addEventListener('click',()=>{
    if(!chalD3) return;
    if(!centerPlaced3){
      const r=Utils.el('dRes3');
      r.innerHTML='Click the graph to place <strong style="color:#fff">center K</strong> first.';
      r.className='pres warn'; return;
    }
    if(userType3===null){
      const r=Utils.el('dRes3');
      r.textContent='Choose Stretch or Shrink before checking.';
      r.className='pres warn'; return;
    }
    const[ugx,ugy]=Utils.gc(dCX3,dCY3,cx,cy);
    const centerOK=ugx===chalD3.kgx&&ugy===chalD3.kgy;
    const scaleOK=userScale3===chalD3.scale;
    const typeOK=userType3===(chalD3.scale>1?'stretch':'shrink');
    const r=Utils.el('dRes3'),sb=Utils.el('dShow3');
    if(centerOK&&scaleOK&&typeOK){
      revealedD3=true;
      r.textContent='🎉 Great job! That\'s the correct dilation — try a new one!';
      r.className='pres ok'; sb.style.display='none';
    } else {
      const hints=[];
      if(!typeOK) hints.push('dilation type (Stretch/Shrink)');
      if(!centerOK) hints.push('center K');
      if(!scaleOK) hints.push('scale factor');
      r.textContent=`Check your ${hints.join(' and ')} — keep going!`;
      r.className='pres no'; sb.style.display='inline-flex';
    }
    draw();
  });
  Utils.el('dShow3').addEventListener('click',()=>{
    if(!chalD3) return; revealedD3=true;
    dCX3=cx+chalD3.kgx*Utils.STEP; dCY3=cy-chalD3.kgy*Utils.STEP;
    centerPlaced3=true; userScale3=chalD3.scale;
    Utils.el('dS3').value=userScale3; Utils.set('dV3',userScale3+'\u00d7');
    setType3(chalD3.scale>1?'stretch':'shrink');
    const r=Utils.el('dRes3'); r.textContent='Here\'s the solution! Try a new one when you\'re ready.'; r.className='pres ok'; Utils.el('dShow3').style.display='none'; draw();
  });
  Utils.el('dNew3').addEventListener('click',newChallengeL3);

  // ─── L4 ───
  function newChallengeL4(){
    const res=findValidChallengeL4();
    if(!res) return;
    ox=res.ox; oy=res.oy; [ox,oy]=clampPos(ox,oy,shape(),w,h);
    chalD4={scale:res.k,kgx:res.kgx,kgy:res.kgy,vIdx:res.vIdx}; revealedD4=false;
    Utils.el('dDX4').value=''; Utils.el('dDY4').value='';
    const vL=String.fromCharCode(65+res.vIdx);
    Utils.el('dChalQ4').innerHTML=`Distances from <strong style="color:#fff">K</strong> to vertex <strong style="color:${COLOR}">${vL}'</strong>?`;
    Utils.el('dRule4').innerHTML=`Scale factor ${res.k} <span style="white-space:nowrap">from K(${res.kgx},\u00a0${res.kgy})</span>`;
    const r=Utils.el('dRes4'); r.textContent=''; r.className='pres'; Utils.el('dShow4').style.display='none'; draw();
  }
  Utils.el('dChk4').addEventListener('click',()=>{
    if(!chalD4) return;
    const userDX=parseFloat(Utils.el('dDX4').value), userDY=parseFloat(Utils.el('dDY4').value);
    if(isNaN(userDX)||isNaN(userDY)){
      const r=Utils.el('dRes4'); r.textContent='Enter both horizontal and vertical distances.'; r.className='pres warn'; return;
    }
    const KX=cx+chalD4.kgx*Utils.STEP, KY=cy-chalD4.kgy*Utils.STEP;
    const absPts=shape().map(([px,py])=>[ox+px,oy+py]);
    const vi=chalD4.vIdx;
    const[imgPx,imgPy]=dilPt(absPts[vi][0],absPts[vi][1],KX,KY,chalD4.scale);
    const imgGx=gcRound(imgPx,cx), imgGy=gcRound(imgPy,cy,true);
    const corrDX=Math.abs(imgGx-chalD4.kgx), corrDY=Math.abs(imgGy-chalD4.kgy);
    const dxOK=Math.round(userDX*10)/10===corrDX, dyOK=Math.round(userDY*10)/10===corrDY;
    const vL=String.fromCharCode(65+vi),r=Utils.el('dRes4'),sb=Utils.el('dShow4');
    if(dxOK&&dyOK){
      revealedD4=true;
      r.textContent=`🎉 Correct! |Δx| = ${corrDX}, |Δy| = ${corrDY} — try a new one!`;
      r.className='pres ok'; sb.style.display='none'; draw();
    } else {
      const hints=[];
      if(!dxOK) hints.push('horizontal');
      if(!dyOK) hints.push('vertical');
      r.textContent=`Check your ${hints.join(' and ')} distance${hints.length>1?'s':''} — keep going!`;
      r.className='pres no'; sb.style.display='inline-flex';
    }
  });
  Utils.el('dShow4').addEventListener('click',()=>{
    if(!chalD4) return;
    const KX=cx+chalD4.kgx*Utils.STEP, KY=cy-chalD4.kgy*Utils.STEP;
    const absPts=shape().map(([px,py])=>[ox+px,oy+py]);
    const vi=chalD4.vIdx;
    const[imgPx,imgPy]=dilPt(absPts[vi][0],absPts[vi][1],KX,KY,chalD4.scale);
    const imgGx=gcRound(imgPx,cx), imgGy=gcRound(imgPy,cy,true);
    const corrDX=Math.abs(imgGx-chalD4.kgx), corrDY=Math.abs(imgGy-chalD4.kgy);
    const vL=String.fromCharCode(65+vi);
    Utils.el('dDX4').value=corrDX; Utils.el('dDY4').value=corrDY;
    revealedD4=true;
    const r=Utils.el('dRes4'); r.textContent=`|Δx| = ${corrDX}, |Δy| = ${corrDY} from K to ${vL}'. Try a new one!`; r.className='pres ok'; Utils.el('dShow4').style.display='none'; draw();
  });
  Utils.el('dNew4').addEventListener('click',newChallengeL4);

  // ─── L5 ───
  function newChallengeL5(){
    const res=findValidChallengeL5();
    if(!res) return;
    ox=res.ox; oy=res.oy; [ox,oy]=clampPos(ox,oy,shape(),w,h);
    chalD5={scale:res.k}; revealedD5=false; placedVerts5=[];
    Utils.el('dRule5').innerHTML=`Scale factor ${res.k} <span style="white-space:nowrap">from K(0,\u00a00)</span>`;
    Utils.set('dChalQ5', `Click to place vertex A'`);
    const r=Utils.el('dRes5'); r.textContent=''; r.className='pres'; Utils.el('dShow5').style.display='none'; draw();
  }
  Utils.el('dChk5').addEventListener('click',()=>{
    if(!chalD5) return;
    const pts=shape();
    if(placedVerts5.length<pts.length){
      const r=Utils.el('dRes5');
      r.textContent=`Place all ${pts.length} vertices first.`;
      r.className='pres warn'; return;
    }
    const absPts=pts.map(([p,q])=>[ox+p,oy+q]);
    let allOK=true;
    for(let vi=0;vi<pts.length;vi++){
      const[ipx,ipy]=dilPt(absPts[vi][0],absPts[vi][1],cx,cy,chalD5.scale);
      const ansGx=Math.round((ipx-cx)/Utils.STEP), ansGy=Math.round((cy-ipy)/Utils.STEP);
      const[pgx,pgy]=Utils.gc(placedVerts5[vi][0],placedVerts5[vi][1],cx,cy);
      if(pgx!==ansGx||pgy!==ansGy){allOK=false;break;}
    }
    const r=Utils.el('dRes5'),sb=Utils.el('dShow5');
    if(allOK){
      revealedD5=true;
      r.textContent='🎉 Excellent! You\'ve found the image — try a new one!';
      r.className='pres ok'; sb.style.display='none'; draw();
    } else {
      r.textContent='Not quite — check your vertex placements and try again.';
      r.className='pres no'; sb.style.display='inline-flex';
    }
  });
  Utils.el('dShow5').addEventListener('click',()=>{
    if(!chalD5) return;
    revealedD5=true;
    const r=Utils.el('dRes5');
    r.textContent='Here\'s the correct image! Try a new one when you\'re ready.';
    r.className='pres ok'; Utils.el('dShow5').style.display='none'; draw();
  });
  Utils.el('dNew5').addEventListener('click',newChallengeL5);

  // ── Shape selector ──
  document.querySelectorAll('#dSB .sbtn').forEach(b=>b.addEventListener('click',function(){
    document.querySelectorAll('#dSB .sbtn').forEach(x=>x.classList.remove('active'));
    this.classList.add('active'); sk=this.dataset.shape;
    selVtx2=0; [ox,oy]=clampPos(ox,oy,shape(),w,h);
    if(level===2) buildVtxBtns2();
    if(level===3) newChallengeL3();
    if(level===4) newChallengeL4();
    if(level===5) newChallengeL5();
    draw();
  }));

  // ── Level selector ──
  document.querySelectorAll('[data-panel=dilation] .lbtn').forEach(b=>b.addEventListener('click',function(){
    document.querySelectorAll('[data-panel=dilation] .lbtn').forEach(x=>x.classList.remove('active'));
    this.classList.add('active'); level=+this.dataset.level;
    document.querySelector('[data-panel=dilation]').setAttribute('data-level',level);
    Utils.set('dLN',LEVEL_NAMES[level]||'Explore');
    if(level===1){DCX=cx;DCY=cy;}
    if(level===2){selVtx2=0; buildVtxBtns2();}
    if(level===3) newChallengeL3();
    if(level===4) newChallengeL4();
    if(level===5) newChallengeL5();
    draw();
  }));

  attachResize('dCanvas',()=>{
    const fresh=initCanvas('dCanvas'); const dx=fresh.cx-cx, dy=fresh.cy-cy;
    w=fresh.w; h=fresh.h; cx=fresh.cx; cy=fresh.cy;
    ox+=dx; oy+=dy;
    if(level===1){DCX=cx;DCY=cy;} else{DCX+=dx;DCY+=dy;}
    dCX3+=dx; dCY3+=dy;
    placedVerts5=[];
    [ox,oy]=clampPos(ox,oy,shape(),w,h); draw();
  });

  buildVtxBtns2();
  [ox,oy]=clampPos(ox,oy,shape(),w,h); draw();
}
