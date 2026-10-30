/* ===== УДАЛЕНИЕ ФОНА С ФОТО (перенесено из Lion Style) =====
   U2-Net (u2netp, 4.5 МБ, лицензия Apache-2.0) запускается прямо в браузере (onnxruntime-web).
   Сеть находит флакон, затем край маски уточняется по самому фото (guided filter), чтобы он шёл точно по ткани.
   MLCUT.mask(canvas) → маска 0..1 (считается один раз), MLCUT.apply(canvas, mask, сила) → вырезанная флакон. */
const MLCUT=(function(){
  const ORT='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.3/dist/';
  let loading=null;
  function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('script')); document.head.appendChild(s); }); }
  function init(){
    if(!loading) loading=(async()=>{
      if(!window.ort) await loadScript(ORT+'ort.min.js');
      ort.env.wasm.wasmPaths=ORT; ort.env.wasm.numThreads=1;
      return ort.InferenceSession.create('models/u2netp.onnx',{executionProviders:['wasm']});
    })().catch(e=>{ loading=null; throw e; });
    return loading;
  }
  function box(src,w,h,r){
    const tmp=new Float32Array(w*h), out=new Float32Array(w*h);
    for(let y=0;y<h;y++){ const o=y*w; let s=0,n=0; for(let x=0;x<=Math.min(r,w-1);x++){ s+=src[o+x]; n++; }
      for(let x=0;x<w;x++){ tmp[o+x]=s/n; const a=x+r+1, b=x-r; if(a<w){ s+=src[o+a]; n++; } if(b>=0){ s-=src[o+b]; n--; } } }
    for(let x=0;x<w;x++){ let s=0,n=0; for(let y=0;y<=Math.min(r,h-1);y++){ s+=tmp[y*w+x]; n++; }
      for(let y=0;y<h;y++){ out[y*w+x]=s/n; const a=y+r+1, b=y-r; if(a<h){ s+=tmp[a*w+x]; n++; } if(b>=0){ s-=tmp[b*w+x]; n--; } } }
    return out;
  }
  // уточнение края маски p по яркости фото I
  function guided(I,p,w,h,r,eps){
    const N=w*h, Ip=new Float32Array(N), II=new Float32Array(N);
    for(let i=0;i<N;i++){ Ip[i]=I[i]*p[i]; II[i]=I[i]*I[i]; }
    const mI=box(I,w,h,r), mp=box(p,w,h,r), mIp=box(Ip,w,h,r), mII=box(II,w,h,r), a=new Float32Array(N), b=new Float32Array(N);
    for(let i=0;i<N;i++){ const v=mII[i]-mI[i]*mI[i], c=mIp[i]-mI[i]*mp[i]; a[i]=c/(v+eps); b[i]=mp[i]-a[i]*mI[i]; }
    const ma=box(a,w,h,r), mb=box(b,w,h,r), q=new Float32Array(N);
    for(let i=0;i<N;i++) q[i]=ma[i]*I[i]+mb[i];
    return q;
  }
  async function mask(canvas){
    const s=await init(), S=320, w=canvas.width, h=canvas.height, N=w*h;
    const t=document.createElement('canvas'); t.width=S; t.height=S; const tg=t.getContext('2d'); tg.drawImage(canvas,0,0,S,S);
    const px=tg.getImageData(0,0,S,S).data; let mx=1; for(let i=0;i<px.length;i+=4) mx=Math.max(mx,px[i],px[i+1],px[i+2]);
    const M=[.485,.456,.406], D=[.229,.224,.225], inp=new Float32Array(3*S*S);
    for(let i=0;i<S*S;i++) for(let c=0;c<3;c++) inp[c*S*S+i]=(px[i*4+c]/mx-M[c])/D[c];
    const feeds={}; feeds[s.inputNames[0]]=new ort.Tensor('float32',inp,[1,3,S,S]);
    const o=(await s.run(feeds))[s.outputNames[0]].data;
    let lo=1e9,hi=-1e9; for(const v of o){ if(v<lo)lo=v; if(v>hi)hi=v; }
    const m=document.createElement('canvas'); m.width=S; m.height=S; const mg=m.getContext('2d'), md=mg.createImageData(S,S);
    for(let i=0;i<S*S;i++){ const v=Math.round((o[i]-lo)/((hi-lo)||1)*255); md.data[i*4]=md.data[i*4+1]=md.data[i*4+2]=v; md.data[i*4+3]=255; }
    mg.putImageData(md,0,0);
    const u=document.createElement('canvas'); u.width=w; u.height=h; const ug=u.getContext('2d'); ug.imageSmoothingQuality='high'; ug.drawImage(m,0,0,w,h);
    const ud=ug.getImageData(0,0,w,h).data, d=canvas.getContext('2d').getImageData(0,0,w,h).data;
    const P=new Float32Array(N), I=new Float32Array(N);
    for(let i=0;i<N;i++){ P[i]=ud[i*4]/255; I[i]=(d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114)/255; }
    return guided(I,P,w,h,Math.max(2,Math.round(Math.min(w,h)/220)),2e-3);
  }
  // сила 0..100: больше — режем смелее (порог маски выше)
  function apply(canvas,q,tol){
    const w=canvas.width, h=canvas.height, N=w*h, th=.5+(Math.max(0,Math.min(100,tol))-50)/100*.5;
    const d=canvas.getContext('2d').getImageData(0,0,w,h).data, A=new Float32Array(N), F=new Uint8Array(N);
    for(let i=0;i<N;i++){ A[i]=Math.max(0,Math.min(1,(q[i]-th)*2.4+.5)); F[i]=A[i]>.5?1:0; }
    // убираем мелкие островки фона, оставляем крупные куски (пара обуви — два куска)
    const lab=new Int32Array(N), st=new Int32Array(N), size=[0];
    for(let i=0,cur=0;i<N;i++){ if(!F[i]||lab[i]) continue; cur++; let sp=0,c=0; st[sp++]=i; lab[i]=cur;
      while(sp){ const j=st[--sp], x=j%w; c++;
        if(x>0&&F[j-1]&&!lab[j-1]){lab[j-1]=cur;st[sp++]=j-1;} if(x<w-1&&F[j+1]&&!lab[j+1]){lab[j+1]=cur;st[sp++]=j+1;}
        if(j>=w&&F[j-w]&&!lab[j-w]){lab[j-w]=cur;st[sp++]=j-w;} if(j<N-w&&F[j+w]&&!lab[j+w]){lab[j+w]=cur;st[sp++]=j+w;} }
      size.push(c); }
    let big=0; for(let i=1;i<size.length;i++) big=Math.max(big,size[i]);
    // небольшие «дыры» внутри вещи (тёмное нутро обуви на тёмном фоне) заливаем обратно
    { const G=new Uint8Array(N); for(let i=0;i<N;i++) G[i]=A[i]>=.9?1:0;      // «точно флакон»
      const hl=new Int32Array(N), hs=[0], ht=[0];
      for(let i=0,cur=0;i<N;i++){ if(G[i]||hl[i]) continue; cur++; let sp=0,c=0,t=0; st[sp++]=i; hl[i]=cur;
        while(sp){ const j=st[--sp], x=j%w; c++; if(x===0||x===w-1||j<w||j>=N-w) t=1;
          if(x>0&&!G[j-1]&&!hl[j-1]){hl[j-1]=cur;st[sp++]=j-1;} if(x<w-1&&!G[j+1]&&!hl[j+1]){hl[j+1]=cur;st[sp++]=j+1;}
          if(j>=w&&!G[j-w]&&!hl[j-w]){hl[j-w]=cur;st[sp++]=j-w;} if(j<N-w&&!G[j+w]&&!hl[j+w]){hl[j+w]=cur;st[sp++]=j+w;} }
        hs.push(c); ht.push(t); }
      const lim=Math.min(N*.015, big*.12);
      for(let i=0;i<N;i++){ const l=hl[i]; if(l && !ht[l] && hs[l]<lim){ A[i]=1; F[i]=2; } } }
    const out=document.createElement('canvas'); out.width=w; out.height=h; const og=out.getContext('2d'), oi=og.createImageData(w,h), od=oi.data;
    let kept=0;
    for(let i=0;i<N;i++){
      let a=A[i]; if(lab[i] && size[lab[i]]<big*.08) a=0;
      if(F[i]===2) a=1;
      else if(!lab[i] && a>.02){ // полупрозрачный край: оставляем только рядом с крупным куском
        const x=i%w, nb=[i-1,i+1,i-w,i+w].some(j=>j>=0&&j<N&&lab[j]&&size[lab[j]]>=big*.08&&Math.abs((j%w)-x)<=1); if(!nb) a=0; }
      od[i*4]=d[i*4]; od[i*4+1]=d[i*4+1]; od[i*4+2]=d[i*4+2]; od[i*4+3]=Math.round(a*255); if(a>.5) kept++;
    }
    og.putImageData(oi,0,0);
    const ratio=kept/N;
    if(ratio<.02) return {ok:false,canvas:out,ratio,reason:'Флакон на фото не найдена. Попробуйте уменьшить силу обрезки.'};
    return {ok:true,canvas:out,ratio};
  }
  return {init,mask,apply};
})();
