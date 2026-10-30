/* ===== MEMORY: витрина =====
   Порядок данных: черновик владельца в браузере > data/db.json (опубликовано) > стандартные данные из data.js. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const jsq = s => esc(JSON.stringify(String(s)));   // текст как безопасная строка внутри onclick
const plu = (n,a,b,c)=>{ const m=Math.abs(n)%100, d=m%10; if(m>10&&m<20) return c; if(d>1&&d<5) return b; if(d===1) return a; return c; };
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
let toastT;
function toast(t){ const el=$('#toast'); el.textContent=t; el.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),2800); }

/* ====== БАЗА ДАННЫХ ======
   Товары с фото лежат в большом хранилище браузера (IndexedDB), остальное в localStorage. */
const LS = { prod:'memory_products', store:'memory_store', admin:'memory_admin' };
let PUB = null;
const BIG = { mem:null, db:null,
  open(){ return new Promise(res=>{ try{
      const r=indexedDB.open('memory',1);
      r.onupgradeneeded=()=>r.result.createObjectStore('kv');
      r.onsuccess=()=>{ BIG.db=r.result; res(true); };
      r.onerror=()=>res(false); r.onblocked=()=>res(false);
    }catch(e){ res(false); } }); },
  get(k){ return new Promise(res=>{ try{
      const q=BIG.db.transaction('kv').objectStore('kv').get(k);
      q.onsuccess=()=>res(q.result||null); q.onerror=()=>res(null);
    }catch(e){ res(null); } }); },
  put(k,v){ try{
      const tx=BIG.db.transaction('kv','readwrite'); tx.objectStore('kv').put(v,k);
      tx.onabort=()=>toast('Не удалось сохранить: в браузере закончилось место. Удалите лишние фото.');
    }catch(e){ toast('Не удалось сохранить изменения в браузере.'); } },
  del(k){ try{ BIG.db.transaction('kv','readwrite').objectStore('kv').delete(k); }catch(e){} }
};
const DB = {
  load(key,def){
    if(key===LS.prod && BIG.mem) return clone(BIG.mem);
    const pub = PUB && {[LS.prod]:PUB.products}[key];
    try{ const v=localStorage.getItem(key); return v?JSON.parse(v):clone(pub||def); }catch(e){ return clone(pub||def); } },
  save(key,val){
    if(key===LS.prod && BIG.db){ BIG.mem=clone(val); BIG.put(key,BIG.mem); try{ localStorage.removeItem(key); }catch(e){} return true; }
    try{ localStorage.setItem(key,JSON.stringify(val)); return true; }
    catch(e){ toast('В браузере закончилось место для фото. Удалите лишние фото или вставьте ссылку.'); return false; } },
  products(){ return this.load(LS.prod, DEFAULT_PRODUCTS); },
  store(){ return Object.assign(clone(DEFAULT_STORE), clone((PUB&&PUB.store)||{}), this.load(LS.store, {})); },
  hasDraft(){ try{ return !!(BIG.mem || localStorage.getItem(LS.prod) || localStorage.getItem(LS.store)); }catch(e){ return false; } },
  admin(){ return Object.assign(clone(DEFAULT_ADMIN), this.load(LS.admin, {})); }
};

let PRODUCTS=[], STORE={};
/* приводим товар к полному виду, чтобы старые или неполные записи не ломали витрину */
function norm(p){
  const a=v=>Array.isArray(v)?v.filter(x=>x!==''&&x!=null):[];
  p.fam=a(p.fam); p.top=a(p.top); p.heart=a(p.heart); p.base=a(p.base); p.season=a(p.season); p.time=a(p.time); p.char=a(p.char); p.occ=a(p.occ); p.images=a(p.images);
  p.variants=a(p.variants).map(v=>({ml:+v.ml||0,price:+v.price||0,old:+v.old||0,out:!!v.out})).filter(v=>v.ml>0).sort((x,y)=>x.ml-y.ml);
  p.bottle=Object.assign({shape:'block',tint:'#3A3F4A',cap:'black'},p.bottle||{});
  p.lon=Math.min(5,Math.max(1,+p.lon||3)); p.sil=Math.min(5,Math.max(1,+p.sil||3));
  p.brand=p.brand||''; p.name=p.name||'Без названия'; p.conc=p.conc||'EDP'; p.gender=GENDERS[p.gender]?p.gender:'u';
  p.code=String(p.code||'').trim() || String(p.id||'').slice(0,6);
  return p;
}
function loadData(){
  PRODUCTS = DB.products().filter(p=>p&&p.id&&!p.hidden).map(norm);
  STORE = DB.store();
  try{ syncSaved(); }catch(e){}
}

/* ====== ПОМОЩНИКИ ТОВАРА ====== */
const byId = id => PRODUCTS.find(p=>p.id===id);
const money = n => { const c=STORE.currency||'₽', v=Math.round(Number(n||0)).toLocaleString('ru-RU'); return c==='₽' ? v+' ₽' : c+v; };
const vOn = p => p.variants.filter(v=>!v.out);
const soldOut = p => !vOn(p).length;
const minVar = p => (vOn(p)[0] || p.variants[0] || {ml:0,price:0});
const minPrice = p => { const on=vOn(p); return on.length ? Math.min(...on.map(v=>v.price)) : (p.variants[0]||{}).price||0; };
const isDecant = v => v.ml<=10;
const volName = ml => ml<=10 ? ml+' мл, отливант' : ml+' мл, флакон';
const famNames = p => p.fam.map(f=>FAMILIES[f]).filter(Boolean);
const allNotes = p => [...p.top,...p.heart,...p.base];
const photo = (p,i) => p.images[i||0] || '';

/* ====== ФЛАКОН-РИСУНОК: пока у товара нет фото, рисуем стеклянный флакон в цвете аромата ====== */
let svgN=0;
function shade(hex,k){ const n=parseInt(String(hex).replace('#',''),16); if(isNaN(n)) return hex;
  let r=n>>16&255,g=n>>8&255,b=n&255; const f=v=>Math.max(0,Math.min(255,Math.round(k<0?v*(1+k):v+(255-v)*k)));
  return '#'+[f(r),f(g),f(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
const CAPS = { black:['#2A2A2F','#0E0E10'], gold:['#E2C27A','#7A5A20'], silver:['#E8E8EC','#6E6E76'], wood:['#8A5A36','#3A2414'] };
function bottleSVG(p){
  const b=p.bottle||{}, t=b.tint||'#3A3F4A', cap=CAPS[b.cap]||CAPS.black, id='b'+(++svgN);
  const brand=esc(String(p.brand||'').toUpperCase().slice(0,26)), name=esc(String(p.name||'').toUpperCase().slice(0,24));
  const defs=`<defs>
    <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(t,.18)}"/><stop offset="1" stop-color="${shade(t,-.55)}"/></linearGradient>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".18" stop-color="#fff" stop-opacity=".04"/><stop offset=".8" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".14"/></linearGradient>
    <linearGradient id="${id}c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${cap[1]}"/><stop offset=".35" stop-color="${cap[0]}"/><stop offset=".6" stop-color="${cap[1]}"/><stop offset="1" stop-color="${shade(cap[1],-.4)}"/></linearGradient>
    <radialGradient id="${id}s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>`;
  const bl=String(p.brand||'').slice(0,26).length||1, nl=String(p.name||'').slice(0,24).length||1;
  /* длинные названия уменьшаем, чтобы не вылезали за этикетку */
  const label=(x,y,w)=>{ const fb=Math.min(7,(w-8)/(bl*.62+bl*.2)), fn=Math.min(10,(w-6)/(nl*.5+nl*.1));
    return `<rect x="${x}" y="${y}" width="${w}" height="34" fill="#F2F2F2" opacity=".92"/><text x="${x+w/2}" y="${y+14}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="${fb.toFixed(1)}" letter-spacing="${(fb*.2).toFixed(2)}" fill="#111">${brand}</text><text x="${x+w/2}" y="${y+26}" text-anchor="middle" font-family="Fira Sans Extra Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="${fn.toFixed(1)}" letter-spacing="${(fn*.1).toFixed(2)}" fill="#111">${name}</text>`; };
  let body='';
  switch(b.shape){
    case 'tall': body=`<rect x="70" y="18" width="60" height="62" fill="url(#${id}c)"/><rect x="88" y="80" width="24" height="12" fill="${shade(cap[1],-.3)}"/>
      <rect x="52" y="92" width="96" height="196" fill="url(#${id}l)"/><rect x="52" y="92" width="96" height="196" fill="url(#${id}g)" stroke="#fff" stroke-opacity=".18"/>
      <rect x="60" y="104" width="6" height="170" fill="#fff" opacity=".16"/>${label(62,176,76)}`; break;
    case 'round': body=`<rect x="78" y="26" width="44" height="56" fill="url(#${id}c)"/><rect x="90" y="82" width="20" height="22" fill="${shade(cap[1],-.3)}"/>
      <circle cx="100" cy="196" r="88" fill="url(#${id}l)"/><circle cx="100" cy="196" r="88" fill="url(#${id}g)" stroke="#fff" stroke-opacity=".18"/>
      <path d="M40 160a70 70 0 0 1 40-46" stroke="#fff" stroke-opacity=".3" stroke-width="5" fill="none"/>${label(58,182,84)}`; break;
    case 'facet': body=`<polygon points="76,20 124,20 132,40 132,72 124,86 76,86 68,72 68,40" fill="url(#${id}c)"/><rect x="90" y="86" width="20" height="14" fill="${shade(cap[1],-.3)}"/>
      <polygon points="64,100 136,100 166,132 166,256 136,288 64,288 34,256 34,132" fill="url(#${id}l)"/>
      <polygon points="64,100 136,100 166,132 166,256 136,288 64,288 34,256 34,132" fill="url(#${id}g)" stroke="#fff" stroke-opacity=".2"/>
      <path d="M64 100 76 132v124l-12 32M136 100l-12 32v124l12 32M34 132h42M124 132h42M34 256h42M124 256h42" stroke="#fff" stroke-opacity=".12" fill="none"/>${label(66,176,68)}`; break;
    case 'flask': body=`<rect x="80" y="22" width="40" height="58" fill="url(#${id}c)"/><rect x="88" y="80" width="24" height="16" fill="${shade(cap[1],-.3)}"/>
      <path d="M86 96h28v18c0 8 46 22 46 64v94c0 9-7 16-16 16H56c-9 0-16-7-16-16v-94c0-42 46-56 46-64z" fill="url(#${id}l)"/>
      <path d="M86 96h28v18c0 8 46 22 46 64v94c0 9-7 16-16 16H56c-9 0-16-7-16-16v-94c0-42 46-56 46-64z" fill="url(#${id}g)" stroke="#fff" stroke-opacity=".18"/>
      <rect x="50" y="176" width="5" height="96" fill="#fff" opacity=".18"/>${label(60,200,80)}`; break;
    default: body=`<rect x="64" y="24" width="72" height="66" fill="url(#${id}c)"/><rect x="86" y="90" width="28" height="12" fill="${shade(cap[1],-.3)}"/>
      <rect x="34" y="102" width="132" height="186" fill="${shade(t,-.35)}" stroke="#fff" stroke-opacity=".2"/>
      <rect x="46" y="114" width="108" height="162" fill="url(#${id}l)"/><rect x="34" y="102" width="132" height="186" fill="url(#${id}g)"/>
      <rect x="40" y="108" width="5" height="174" fill="#fff" opacity=".2"/>${label(58,180,84)}`;
  }
  return `<svg class="bt" viewBox="0 0 200 312" role="img" aria-label="${esc(p.brand+' '+p.name)}">${defs}<ellipse cx="100" cy="296" rx="80" ry="10" fill="url(#${id}s)"/>${body}</svg>`;
}
/* картинка товара: фото, если есть, иначе рисунок флакона */
/* фото без фона (png/webp с прозрачностью) показываем целиком, по центру */
const isCut = u => /^data:image\/(png|webp)/i.test(u||'') || /\.(png|webp)(\?|#|$)/i.test(u||'');
function visual(p,i,cls){ const u=photo(p,i); return u ? `<img class="${cls||'ph'}${isCut(u)?' cut':''}" src="${esc(u)}" alt="${esc(p.brand+' '+p.name)}" loading="lazy" decoding="async">` : bottleSVG(p); }

/* ====== ШТРИХКОД: у каждого аромата свой, из его кода ====== */
function barcodeSVG(code){
  let h=2166136261; const s=String(code||'MEMORY');
  const rnd=()=>{ h^=h<<13; h^=h>>>17; h^=h<<5; return (h>>>0)/4294967296; };
  for(const ch of s){ h=Math.imul(h^ch.charCodeAt(0),16777619); }
  let x=0, bars='';
  for(let i=0;i<38;i++){ const w=1+Math.floor(rnd()*3); if(i%2===0) bars+=`<rect x="${x}" y="0" width="${w}" height="30"/>`; x+=w; }
  return `<svg class="bc" viewBox="0 0 ${x} 30" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`;
}

/* ====== ВСТУПЛЕНИЕ ====== */
let introDone=false;
function introStart(){
  const el=$('#intro');
  let seen=false; try{ seen=sessionStorage.getItem('memory_intro')==='1'; }catch(e){}
  if(seen || REDUCED || /^#(admin|p=)/.test(location.hash)){ el.classList.add('gone'); introDone=true; return; }
  try{ sessionStorage.setItem('memory_intro','1'); }catch(e){}
  document.body.classList.add('intro-run','lock');
  let h=47, bars='';
  for(let i=0;i<30;i++){ h=(h*1103515245+12345)&0x7fffffff; const w=1+(h%4); bars+=`<i style="width:${w}px;animation-delay:${(i*16)}ms;${i%7===3?'height:70%;align-self:center':''}"></i>`; }
  $('#inCode').innerHTML=bars;
  $('#inWord').innerHTML=[...'MEMORY'].map((c,i)=>`<span style="animation-delay:${.55+i*.07}s">${c}</span>`).join('');
  setTimeout(()=>{ if(!introDone) el.classList.add('open'); },1850);
  setTimeout(()=>introEnd(),2250);
  setTimeout(()=>{ if(!introDone) introEnd(); },4000);
}
function introEnd(){
  const el=$('#intro'); if(introDone && el.classList.contains('split')) return;
  introDone=true; el.classList.add('open','split');
  document.body.classList.remove('intro-run'); syncLock();
  setTimeout(()=>el.classList.add('gone'),1150);
}

/* ====== ПЕРЕХОД: шторка с красной кромкой ======
   Закрывает экран, меняет содержимое и уходит влево. */
let curBusy=false;
function curtain(cb){
  if(REDUCED || curBusy){ cb(); return; }
  curBusy=true; const c=$('#curtain');
  c.className='in';
  setTimeout(()=>{ try{ cb(); }catch(e){ console.error(e); } c.className='out'; setTimeout(()=>{ c.className=''; curBusy=false; },760); },640);
}
function goSection(id){
  const go=()=>{ hideOverlays(); const el=document.getElementById(id); if(el){ const y=id==='top'?0:el.getBoundingClientRect().top+scrollY-($('#hdr').offsetHeight)+1; window.scrollTo({top:y,behavior:'instant'}); } };
  curtain(go); return false;
}

/* ====== ТЕМА ====== */
function toggleTheme(){
  const t=document.documentElement.getAttribute('data-theme')==='light'?'dark':'light';
  curtain(()=>{ document.documentElement.setAttribute('data-theme',t); try{ localStorage.setItem('memory_theme',t); }catch(e){}
    $('meta[name=theme-color]').setAttribute('content',t==='light'?'#F3F3F2':'#0B0B0C'); });
}

/* ====== ГЛАВНАЯ ====== */
function renderHero(){
  $('#heroTitle').textContent=STORE.heroTitle||DEFAULT_STORE.heroTitle;
  $('#heroSub').textContent=STORE.heroSub||DEFAULT_STORE.heroSub;
  const hp = PRODUCTS.find(p=>p.hit) || PRODUCTS[0];
  $('#heroVis').innerHTML = STORE.heroImg ? `<img class="hv-photo" src="${esc(STORE.heroImg)}" alt="">` : (hp ? bottleSVG(Object.assign({},hp,{bottle:{shape:'block',tint:'#5A1220',cap:'black'},brand:'MEMORY',name:'N° 047'})) : '');
  $('#heroVis').classList.toggle('has-photo',!!STORE.heroImg);
  $('#ownerNote').textContent=STORE.ownerNote||'';
  $('#ownerName').textContent=STORE.ownerName||'';
  $('#ownerName').parentElement.hidden=!STORE.ownerName;
  const av=$('#aboutVis');
  av.innerHTML = STORE.aboutImg ? `<img src="${esc(STORE.aboutImg)}" alt="" loading="lazy">` : (PRODUCTS[2]?bottleSVG(PRODUCTS[2]):'');
  const d=STORE.delivery||''; $('#deliveryShort').textContent = d.length>140 ? d.slice(0,d.indexOf('.',60)+1||140) : d;
}
let railMode='hit';
function renderRail(){
  let list = PRODUCTS.filter(p=> railMode==='new' ? p.isNew : p.hit);
  if(list.length<4) list = list.concat(PRODUCTS.filter(p=>!list.includes(p))).slice(0,8);
  $('#rail').innerHTML = list.slice(0,10).map(cardHTML).join('');
}
function renderMatchGrid(){
  $('#matchGrid').innerHTML = Object.entries(CHARS).map(([k,c])=>{
    const n=PRODUCTS.filter(p=>p.char.includes(k)).length;
    return `<button class="mg" type="button" onclick="openQuiz(${jsq(k)})"><i>${n} ${plu(n,'аромат','аромата','ароматов')}</i><div><b>${esc(c.name)}</b><br><span>${esc(c.hint)}</span></div></button>`;
  }).join('');
}
function renderFamilies(){
  $('#famList').innerHTML = Object.entries(FAMILIES).map(([k,name])=>{
    const ps=PRODUCTS.filter(p=>p.fam.includes(k)); if(!ps.length) return '';
    const notes=[...new Set(ps.flatMap(p=>p.base.concat(p.heart)))].slice(0,4).join(', ');
    return `<button class="fam" type="button" onclick="pickFamily(${jsq(k)})"><b>${esc(name)}</b><span>${esc(notes)}</span><em>${ps.length} ${plu(ps.length,'аромат','аромата','ароматов')}</em></button>`;
  }).join('');
}
function pickFamily(k){ resetFilters(true); F.fam.add(k); renderShop(); goSection('catalog'); }

/* ====== КАРТОЧКА ====== */
const HEART='<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>';
function cardHTML(p){
  const out=soldOut(p), mv=minVar(p), w=wish.includes(p.id);
  const tag = out ? 'Нет в наличии' : p.isNew ? 'Новинка' : p.hit ? 'Хит' : '';
  const old = mv.old && mv.old>mv.price ? `<s>${money(mv.old)}</s>` : '';
  return `<article class="card${out?' out':''}">
    <div class="card-img" onclick="openProduct(${jsq(p.id)})">${visual(p,0)}</div>
    <button class="ib wbtn${w?' on':''}" type="button" onclick="toggleWish(${jsq(p.id)},this)" aria-label="${w?'Убрать из избранного':'В избранное'}" aria-pressed="${w}">${HEART}</button>
    <div class="card-b">
      <div class="card-brand"><span>${esc(p.brand)}</span>${tag?`<span class="tag">${tag}</span>`:''}</div>
      <h3 class="card-name" onclick="openProduct(${jsq(p.id)})">${esc(p.name)}</h3>
      <div class="card-notes">${esc(allNotes(p).slice(0,3).join(', '))}</div>
      <div class="card-f"><span class="price">${old}${p.variants.length>1?'от ':''}${money(minPrice(p))}</span>
        <button class="card-add" type="button" onclick="quickAdd(${jsq(p.id)})" ${out?'disabled':''}>${out?'Нет':'В корзину'}</button></div>
    </div></article>`;
}

/* ====== КАТАЛОГ И ФИЛЬТРЫ ====== */
const F = { g:'', q:'', sort:'pop', fam:new Set(), brand:new Set(), conc:new Set(), season:new Set(), time:new Set(), notes:new Set(), vol:'', lon:1, price:0, stock:false };
function resetFilters(silent){
  Object.assign(F,{ g:'', q:'', fam:new Set(), brand:new Set(), conc:new Set(), season:new Set(), time:new Set(), notes:new Set(), vol:'', lon:1, price:0, stock:false });
  $('#q').value=''; $$('#genderSeg button').forEach(b=>b.classList.toggle('on',b.dataset.g===''));
  if(!silent) renderShop();
}
const priceCap = () => Math.ceil(Math.max(1000,...PRODUCTS.map(minPrice))/500)*500;
function match(p){
  if(F.g && p.gender!==F.g) return false;
  if(F.fam.size && !p.fam.some(f=>F.fam.has(f))) return false;
  if(F.brand.size && !F.brand.has(p.brand)) return false;
  if(F.conc.size && !F.conc.has(p.conc)) return false;
  if(F.season.size && !p.season.some(s=>F.season.has(s))) return false;
  if(F.time.size && !p.time.some(s=>F.time.has(s))) return false;
  if(F.notes.size){ const n=allNotes(p).join(' ').toLowerCase(); if(![...F.notes].every(x=>n.includes(x))) return false; }
  if(F.vol==='dec' && !vOn(p).some(isDecant)) return false;
  if(F.vol==='full' && !vOn(p).some(v=>!isDecant(v))) return false;
  if(F.lon>1 && p.lon<F.lon) return false;
  if(F.price && minPrice(p)>F.price) return false;
  if(F.stock && soldOut(p)) return false;
  if(F.q){ const hay=(p.brand+' '+p.name+' '+allNotes(p).join(' ')+' '+famNames(p).join(' ')).toLowerCase();
    if(!F.q.toLowerCase().split(/\s+/).filter(Boolean).every(w=>hay.includes(w))) return false; }
  return true;
}
function sorted(list){
  const s=F.sort, idx=p=>PRODUCTS.indexOf(p);
  return list.slice().sort((a,b)=>
    (soldOut(a)-soldOut(b)) ||
    (s==='asc' ? minPrice(a)-minPrice(b) : s==='desc' ? minPrice(b)-minPrice(a) : s==='lon' ? (b.lon-a.lon)||(b.sil-a.sil) :
     s==='new' ? (!!b.isNew-!!a.isNew)||idx(a)-idx(b) : (!!b.hit-!!a.hit)||idx(a)-idx(b)));
}
function fltCountN(){ return F.fam.size+F.brand.size+F.conc.size+F.season.size+F.time.size+F.notes.size+(F.vol?1:0)+(F.lon>1?1:0)+(F.price?1:0)+(F.stock?1:0); }
function renderFilters(){
  const cnt=(fn)=>PRODUCTS.filter(fn).length;
  const chips=(group,map)=>`<div class="chips">${Object.entries(map).map(([k,v])=>`<button type="button" class="chip${F[group].has(k)?' on':''}" onclick="togF('${group}',${jsq(k)})" aria-pressed="${F[group].has(k)}">${esc(v)}</button>`).join('')}</div>`;
  const brands=[...new Set(PRODUCTS.map(p=>p.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const famAvail=Object.fromEntries(Object.entries(FAMILIES).filter(([k])=>PRODUCTS.some(p=>p.fam.includes(k))));
  const cap=priceCap(), pv=F.price||cap;
  const lonN=['любая','от 2 из 5','от 3 из 5','от 4 из 5','только 5 из 5'];
  $('#fltBody').innerHTML=`
    <div class="flt-g"><div class="flt-t">Семейство</div>${chips('fam',famAvail)}</div>
    <div class="flt-g"><div class="flt-t">Ноты <small>все выбранные</small></div>${chips('notes',Object.fromEntries(NOTE_PICKS.filter(n=>PRODUCTS.some(p=>allNotes(p).join(' ').includes(n))).map(n=>[n,n])))}</div>
    <div class="flt-g"><div class="flt-t">Объём</div><div class="chips">
      ${[['','Любой'],['dec','Отливант 5 и 10 мл'],['full','Флакон']].map(([k,v])=>`<button type="button" class="chip${F.vol===k?' on':''}" onclick="setF('vol',${jsq(k)})">${v}</button>`).join('')}</div></div>
    <div class="flt-g"><div class="flt-t">Цена <small>до ${money(pv)}</small></div><input class="range" type="range" min="500" max="${cap}" step="500" value="${pv}" oninput="setPrice(this.value)" aria-label="Цена до"></div>
    <div class="flt-g"><div class="flt-t">Сезон</div>${chips('season',SEASONS)}</div>
    <div class="flt-g"><div class="flt-t">Время</div>${chips('time',TIMES)}</div>
    <div class="flt-g"><div class="flt-t">Стойкость <small>${lonN[F.lon-1]}</small></div><input class="range" type="range" min="1" max="5" step="1" value="${F.lon}" oninput="setLon(this.value)" aria-label="Стойкость не меньше"></div>
    <div class="flt-g"><div class="flt-t">Концентрация</div>${chips('conc',Object.fromEntries(Object.keys(CONCS).filter(k=>PRODUCTS.some(p=>p.conc===k)).map(k=>[k,CONCS[k]])))}</div>
    <div class="flt-g"><div class="flt-t">Бренд</div><div class="brands">${brands.map(b=>`<label class="chk"><input type="checkbox" ${F.brand.has(b)?'checked':''} onchange="togF('brand',${jsq(b)})">${esc(b)}<small>${cnt(p=>p.brand===b)}</small></label>`).join('')}</div></div>
    <div class="flt-g"><label class="chk"><input type="checkbox" ${F.stock?'checked':''} onchange="setF('stock',this.checked)">Только в наличии</label></div>`;
}
function togF(g,k){ F[g].has(k)?F[g].delete(k):F[g].add(k); renderShop(); }
function setF(k,v){ F[k]=v; renderShop(); }
let priceT; function setPrice(v){ v=+v; F.price = v>=priceCap()?0:v; clearTimeout(priceT); priceT=setTimeout(()=>renderShop(true),60); }
function setLon(v){ F.lon=+v; renderShop(true); }
function renderShop(keepFilters){
  const list=sorted(PRODUCTS.filter(match));
  $('#grid').innerHTML = list.length ? list.map(cardHTML).join('') :
    `<div class="empty"><b>Ничего не нашлось</b>Попробуйте убрать часть фильтров или поискать по другой ноте.<br><button class="btn line" type="button" onclick="resetFilters()">Сбросить фильтры</button></div>`;
  if(!keepFilters) renderFilters(); else renderFiltersLabels();
  const n=fltCountN(); $('#fltCount').textContent=n?n:'';
  $('#fltShow').textContent = 'Показать '+list.length;
  const on=[];
  const lab={fam:FAMILIES,season:SEASONS,time:TIMES,conc:CONCS};
  ['fam','notes','season','time','conc','brand'].forEach(g=>F[g].forEach(k=>on.push(`<button type="button" class="chip-x" onclick="togF('${g}',${jsq(k)})">${esc((lab[g]&&lab[g][k])||k)}</button>`)));
  if(F.vol) on.push(`<button type="button" class="chip-x" onclick="setF('vol','')">${F.vol==='dec'?'Отливанты':'Флаконы'}</button>`);
  if(F.price) on.push(`<button type="button" class="chip-x" onclick="F.price=0;renderShop()">до ${money(F.price)}</button>`);
  if(F.lon>1) on.push(`<button type="button" class="chip-x" onclick="setLon(1);renderFilters()">стойкость от ${F.lon}</button>`);
  if(F.stock) on.push(`<button type="button" class="chip-x" onclick="setF('stock',false)">в наличии</button>`);
  $('#chipsOn').innerHTML = `<span class="cnt-line">${list.length} ${plu(list.length,'аромат','аромата','ароматов')}</span>`+on.join('');
}
/* при движении ползунка не перерисовываем фильтры целиком (иначе ползунок теряется под пальцем), только подписи */
function renderFiltersLabels(){
  const lonN=['любая','от 2 из 5','от 3 из 5','от 4 из 5','только 5 из 5'];
  const g=$$('#fltBody .flt-g');
  g.forEach(el=>{ const t=el.querySelector('.flt-t'); if(!t) return; const s=t.querySelector('small'); if(!s) return;
    if(t.textContent.startsWith('Цена')) s.textContent='до '+money(F.price||priceCap());
    if(t.textContent.startsWith('Стойкость')) s.textContent=lonN[F.lon-1]; });
}
function openFilters(){ $('#flt').classList.add('open'); $('#shade').classList.add('open'); syncLock(); }
function closeFilters(){ $('#flt').classList.remove('open'); if(!$('#drawer').classList.contains('open')) $('#shade').classList.remove('open'); syncLock(); }
function focusSearch(){ goSection('catalog'); setTimeout(()=>$('#q').focus({preventScroll:true}),700); }

/* ====== ДОСЬЕ АРОМАТА ====== */
const PV={id:null,ml:0,img:0,t:0};
function openProduct(id,noPush){
  const p=byId(id); if(!p) return;
  const show=()=>{ hideOverlays(true); PV.id=id; PV.img=0; PV.t=0; const mv=minVar(p); PV.ml=mv.ml;
    renderProduct(); const v=$('#pview'); v.classList.add('open'); $('#pvBody').scrollTop=0; syncLock();
    if(!noPush) history.pushState({ov:'p'},'','#p='+encodeURIComponent(id)); };
  curtain(show);
}
function closeProduct(){ if(history.state&&history.state.ov){ history.back(); } else { curtain(()=>{ $('#pview').classList.remove('open'); syncLock(); }); } }
function meter(n,words){ return `<div class="meter">${[1,2,3,4,5].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}<em>${words[n-1]}</em></div>`; }
function renderProduct(still){
  const p=byId(PV.id); if(!p) return;
  const v=p.variants.find(x=>x.ml===PV.ml)||minVar(p), out=soldOut(p), w=wish.includes(p.id);
  $('#pvCrumb').textContent=p.brand+' / '+p.name;
  const thumbs = p.images.length>1 ? `<div class="pv-thumbs">${p.images.map((u,i)=>`<button type="button" class="${i===PV.img?'on':''}" onclick="pvImg(${i})" aria-label="Фото ${i+1}"><img src="${esc(u)}" alt=""></button>`).join('')}</div>` : '';
  const vols = p.variants.map(x=>`<button type="button" class="vol${x.ml===v.ml?' on':''}${x.out?' off':''}" ${x.out?'disabled':''} onclick="pvVol(${x.ml})"><b>${x.ml} мл</b><span>${x.out?'нет':money(x.price)}</span></button>`).join('');
  const sims = similar(p);
  $('#pvBody').innerHTML=`<div class="pv">
    <div class="pv-gal"><div class="pv-gal-in"><div class="pv-main" id="pvMain">${visual(p,PV.img)}</div>${thumbs}
      <div class="pv-code">${barcodeSVG(p.code)}<span>MM-${esc(p.code)}</span></div></div></div>
    <div class="pv-info${still?'':' stg'}">
      <div class="pv-brand">${esc(p.brand)}</div>
      <h1 class="pv-name">${esc(p.name)}</h1>
      <div class="pv-meta"><span>${esc(CONCS[p.conc]||p.conc)}</span><span>${esc(GENDERS[p.gender])}</span><b>${esc(famNames(p).join(', '))}</b></div>
      <p class="pv-desc">${esc(p.desc||'')}</p>
      <div><span class="lbl">Объём</span><div class="vols">${vols}</div></div>
      <div class="pv-price">${out?'<span class="now">Нет в наличии</span>':`<span class="now">${money(v.price)}</span>${v.old>v.price?`<s>${money(v.old)}</s>`:''}<small>${isDecant(v)?'отливант из оригинала':'флакон'}</small>`}</div>
      <div class="pv-cta">
        <button class="btn red" type="button" onclick="pvAdd(false)" ${out||v.out?'disabled':''}>В корзину</button>
        <button class="btn line" type="button" onclick="pvAdd(true)" ${out||v.out?'disabled':''}>Купить сейчас</button>
        <button class="wb${w?' on':''}" type="button" onclick="toggleWish(${jsq(p.id)},this)" aria-label="${w?'Убрать из избранного':'В избранное'}" aria-pressed="${w}">${HEART}</button>
      </div>
      <section class="dos" aria-label="Досье аромата">
        <div class="dos-h"><h3>Досье</h3><span>MM-${esc(p.code)}</span></div>
        <dl>
          <div class="dos-row"><dt>Характер</dt><dd><div class="tags">${p.char.map(c=>`<span class="on">${esc((CHARS[c]||{}).name||c)}</span>`).join('')||'<span>не указан</span>'}</div></dd></div>
          <div class="dos-row"><dt>Стойкость</dt><dd>${meter(p.lon,['до 2 часов','3-4 часа','5-6 часов','8 часов','весь день и дольше'])}</dd></div>
          <div class="dos-row"><dt>Шлейф</dt><dd>${meter(p.sil,['у самой кожи','рядом','заметный','сильный','заполняет комнату'])}</dd></div>
          <div class="dos-row"><dt>Сезон</dt><dd><div class="tags">${Object.entries(SEASONS).map(([k,n])=>`<span class="${p.season.includes(k)?'on':''}">${n}</span>`).join('')}</div></dd></div>
          <div class="dos-row"><dt>Когда</dt><dd><div class="tags">${p.time.map(t=>`<span class="on">${TIMES[t]}</span>`).join('')}${p.occ.map(o=>`<span>${esc(OCCS[o]||o)}</span>`).join('')}</div></dd></div>
        </dl>
      </section>
      <section class="tl" aria-label="Как раскрывается">
        <div class="tl-h"><h3>Как раскрывается</h3><span id="tlWhen"></span></div>
        <div class="tl-stage" id="tlStage"></div>
        <div class="tl-ctl"><input type="range" min="0" max="100" value="${PV.t}" oninput="pvTime(this.value)" aria-label="Время после нанесения">
          <div class="tl-marks">${TL_MARKS.map(([v,n])=>`<span data-v="${v}" onclick="pvTime(${v},true)">${n}</span>`).join('')}</div></div>
        <p class="tl-say" id="tlSay"></p>
      </section>
    </div>
    ${sims.length?`<div class="pv-sim"><h3>Похожие по характеру</h3><div class="rail">${sims.map(cardHTML).join('')}</div></div>`:''}
  </div>`;
  pvTime(PV.t);
}
/* раскрытие: верхние ноты звучат первыми, сердце в середине, база остаётся к вечеру */
const TL_MARKS=[[0,'Нанесение'],[33,'Через час'],[66,'Через 4 часа'],[100,'К вечеру']];
function pvTime(t,setSlider){
  t=+t; PV.t=t; const p=byId(PV.id); if(!p) return;
  if(setSlider){ const r=$('.tl-ctl input'); if(r) r.value=t; }
  const cl=x=>Math.max(0,Math.min(1,x));
  const W={ top:cl(1-t/38), heart:cl(1-Math.abs(t-45)/42), base:cl((t-12)/55) };
  const T=[['top','Верх',p.top],['heart','Сердце',p.heart],['base','База',p.base]];
  $('#tlStage').innerHTML=T.map(([k,n,arr])=>{ const a=.18+.82*W[k];
    return `<div class="tl-tier" style="opacity:${(.35+.65*W[k]).toFixed(2)}"><dt>${n}</dt><dd>${arr.map(x=>`<span style="opacity:${a.toFixed(2)};${W[k]>.6?'color:var(--tx)':'color:var(--tx2)'}">${esc(x)}</span>`).join('')||'<span>нет данных</span>'}</dd>
      <div class="tl-bar"><i style="transform:scaleX(${W[k].toFixed(2)})"></i></div></div>`; }).join('');
  const near=TL_MARKS.reduce((a,b)=>Math.abs(b[0]-t)<Math.abs(a[0]-t)?b:a);
  $('#tlWhen').textContent=near[1];
  $$('.tl-marks span').forEach(s=>s.classList.toggle('on',+s.dataset.v===near[0]));
  const top=Object.entries(W).sort((a,b)=>b[1]-a[1])[0][0];
  const say={ top:`Первые минуты: ярко звучат ${p.top.slice(0,3).join(', ')||'верхние ноты'}. Это первое впечатление, его слышат все рядом.`,
    heart:`Сердце аромата: ${p.heart.slice(0,3).join(', ')||'средние ноты'}. Так аромат звучит большую часть дня.`,
    base:`База остаётся на коже и одежде: ${p.base.slice(0,3).join(', ')||'базовые ноты'}. ${p.lon>=4?'Её слышно и вечером.':'К вечеру звучит тихо, у кожи.'}` };
  $('#tlSay').textContent=say[top];
}
function pvImg(i){ const p=byId(PV.id); PV.img=i; $('#pvMain').innerHTML=visual(p,i); $$('.pv-thumbs button').forEach((b,j)=>b.classList.toggle('on',j===i)); }
/* смена объёма: перерисовываем без анимации появления, иначе блоки на миг исчезают */
function pvVol(ml){ PV.ml=ml; const sc=$('#pvBody').scrollTop; renderProduct(true); $('#pvBody').scrollTop=sc; }
function pvAdd(buy){ const p=byId(PV.id); const v=p.variants.find(x=>x.ml===PV.ml); if(!v||v.out){ toast('Этого объёма сейчас нет'); return; }
  addToCart(p.id,v.ml,1); if(buy){ history.state&&history.state.ov ? (history.back(), setTimeout(()=>openDrawer('cart'),80)) : openDrawer('cart'); } }
function similar(p){
  return PRODUCTS.filter(q=>q.id!==p.id).map(q=>({q,s:q.fam.filter(f=>p.fam.includes(f)).length*2+q.char.filter(c=>p.char.includes(c)).length+(q.gender===p.gender?1:0)}))
    .filter(x=>x.s>1).sort((a,b)=>b.s-a.s).slice(0,8).map(x=>x.q);
}

/* ====== ПОДБОР ПО ХАРАКТЕРУ ====== */
const QZ=[
  { k:'g', q:'Для кого аромат?', o:[['m','Мужской','Для себя или в подарок мужчине'],['w','Женский','Для неё'],['any','Не важно','Покажите всё, включая унисекс']] },
  { k:'occ', q:'Куда вы будете его носить?', o:Object.entries(OCCS).map(([k,n])=>[k,n,{daily:'Учёба, город, дела',work:'Офис, переговоры, деловые встречи',evening:'Ужин, встреча с друзьями',event:'Свадьба, праздник, особый день'}[k]]) },
  { k:'char', q:'Какой вы?', o:Object.entries(CHARS).map(([k,c])=>[k,c.name,c.hint]) },
  { k:'season', q:'Когда будете носить?', o:[['cold','Осень и зима','Тёплые, плотные ароматы'],['warm','Весна и лето','Лёгкие и свежие'],['all','Круглый год','Универсальный вариант']] },
  { k:'sil', q:'Насколько заметным он должен быть?', o:[['2','Для себя','Слышно только рядом'],['4','Заметно','Чувствуют, когда вы проходите мимо'],['5','Чтобы запомнили','Шлейф остаётся после вас']] }
];
let qzStep=0, qzA={};
function openQuiz(pre){
  qzA={}; qzStep=0;
  if(pre && CHARS[pre]){ qzA.char=pre; }
  curtain(()=>{ hideOverlays(true); $('#quiz').classList.add('open'); syncLock(); renderQuiz(); history.pushState({ov:'q'},'','#match'); });
}
function closeQuiz(){ if(history.state&&history.state.ov){ history.back(); } else curtain(()=>{ $('#quiz').classList.remove('open'); syncLock(); }); }
function quizBack(){ if(qzStep===0){ closeQuiz(); return; } qzStep--; renderQuiz(); }
function renderQuiz(){
  $('#qzProg').style.transform=`scaleX(${Math.min(1,qzStep/QZ.length)})`;
  if(qzStep>=QZ.length){ renderQuizResult(); return; }
  const s=QZ[qzStep];
  $('#qzBody').innerHTML=`<div class="qz-in stg"><div class="qz-step">Вопрос ${qzStep+1} из ${QZ.length}</div><h2 class="qz-q">${esc(s.q)}</h2>
    <div class="qz-opts">${s.o.map(([k,n,h])=>`<button type="button" class="qz-o${qzA[s.k]===k?' on':''}" onclick="quizPick(${jsq(s.k)},${jsq(k)},this)"><b>${esc(n)}</b><span>${esc(h||'')}</span></button>`).join('')}</div></div>`;
  $('#qzBody').scrollTop=0;
}
function quizPick(k,v,btn){ qzA[k]=v; $$('.qz-o').forEach(b=>b.classList.toggle('on',b===btn));
  setTimeout(()=>{ qzStep++; renderQuiz(); },REDUCED?0:220); }
function quizScore(p){
  const a=qzA; let s=0, why=[];
  if(a.g==='m' && p.gender==='w') return null;
  if(a.g==='w' && p.gender==='m') return null;
  if(a.occ && p.occ.includes(a.occ)){ s+=p.occ[0]===a.occ?3:2; why.push(OCCS[a.occ].toLowerCase()); }
  if(a.char && p.char.includes(a.char)){ s+=p.char[0]===a.char?5:4; why.push('характер: '+CHARS[a.char].name.toLowerCase()); }
  const ss={cold:['autumn','winter'],warm:['spring','summer'],all:['winter','spring','summer','autumn']}[a.season]||[];
  if(ss.length){ const hit=ss.filter(x=>p.season.includes(x)).length/ss.length; s+=hit*2; if(hit>=.5) why.push(a.season==='cold'?'для холодов':a.season==='warm'?'для тепла':'на весь год'); }
  if(a.sil){ const d=Math.abs(p.sil-(+a.sil)); s+=Math.max(0,3-d*1.3); if(d<=1) why.push(p.sil>=5?'мощный шлейф':p.sil>=4?'заметный шлейф':'спокойный шлейф'); if(+a.sil>=4) s+=(p.lon-3)/4; }
  return { p, s, why };
}
function renderQuizResult(){
  const max=13.5, rs=PRODUCTS.filter(p=>!soldOut(p)).map(quizScore).filter(Boolean).sort((a,b)=>b.s-a.s).slice(0,3);
  $('#qzProg').style.transform='scaleX(1)';
  const ch=qzA.char&&CHARS[qzA.char];
  $('#qzBody').innerHTML=`<div class="qz-in stg">
    <div class="qz-res-h"><div><div class="qz-step">Результат</div><h2 class="qz-q" style="margin-bottom:0">${ch?esc(ch.name)+': ваши ароматы':'Ваши ароматы'}</h2></div></div>
    <div class="qz-res">${rs.map(({p,s,why})=>`<div class="qr">
      <div class="qr-img" onclick="openProduct(${jsq(p.id)})">${visual(p,0)}</div>
      <div><div class="qr-pc">Подходит на ${Math.round(Math.min(97,50+48*s/max))}%</div><h4 onclick="openProduct(${jsq(p.id)})">${esc(p.name)}</h4><p><b style="color:var(--tx2);font-weight:500">${esc(p.brand)}</b>. ${esc(why.join(', ')||famNames(p).join(', '))}. От ${money(minPrice(p))}.</p></div>
      <div class="qr-acts"><button class="btn line" type="button" onclick="openProduct(${jsq(p.id)})">Досье</button><button class="btn red" type="button" onclick="quickAdd(${jsq(p.id)})">Отливант</button></div>
    </div>`).join('')||'<div class="empty"><b>Пока нет подходящих</b>В каталоге нет ароматов под такой набор. Попробуйте другой ответ.</div>'}</div>
    <div class="qz-more"><button class="btn line" type="button" onclick="qzStep=0;qzA={};renderQuiz()">Пройти заново</button>
      <button class="btn line" type="button" onclick="quizToCatalog()">Все подходящие в каталоге</button></div></div>`;
  $('#qzBody').scrollTop=0;
}
function quizToCatalog(){
  resetFilters(true);
  if(qzA.g==='m'||qzA.g==='w'){ /* мужские или женские вместе с унисекс: фильтр пола не ставим, ставим сезон */ }
  if(qzA.season==='cold'){ F.season.add('autumn'); F.season.add('winter'); } else if(qzA.season==='warm'){ F.season.add('spring'); F.season.add('summer'); }
  if(qzA.sil==='5') F.lon=4;
  renderShop();
  if(history.state&&history.state.ov){ history.back(); setTimeout(()=>goSection('catalog'),60); } else goSection('catalog');
}

/* ====== КОРЗИНА И ИЗБРАННОЕ (хранятся только в браузере покупателя) ====== */
const loadSaved=k=>{ try{ const v=JSON.parse(localStorage.getItem(k)||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } };
let cart=loadSaved('memory_cart').filter(c=>c&&c.id&&c.ml&&c.qty>0), wish=loadSaved('memory_wish').filter(x=>typeof x==='string');
function saveCW(){ try{ localStorage.setItem('memory_cart',JSON.stringify(cart)); localStorage.setItem('memory_wish',JSON.stringify(wish)); }catch(e){} }
/* после загрузки товаров: убираем из корзины то, чего больше нет */
function syncSaved(){ cart=cart.filter(c=>{ const p=byId(c.id); return p && p.variants.some(v=>v.ml===c.ml); }); if($('#cartCount')) updateCounts(); }
const lineOf=c=>{ const p=byId(c.id), v=p&&p.variants.find(x=>x.ml===c.ml); return {p,v,sum:v?v.price*c.qty:0}; };
function addToCart(id,ml,qty){
  const p=byId(id), v=p&&p.variants.find(x=>x.ml===ml); if(!v||v.out){ toast('Этого объёма сейчас нет'); return; }
  const ex=cart.find(c=>c.id===id&&c.ml===ml); if(ex) ex.qty+=qty; else cart.push({id,ml,qty});
  updateCounts(); renderDrawer(); toast(`${p.name}, ${ml} мл: в корзине`);
}
function quickAdd(id){ const p=byId(id); if(!p||soldOut(p)){ toast('Этого аромата сейчас нет'); return; } addToCart(id,minVar(p).ml,1); }
function changeQty(i,d){ const c=cart[i]; if(!c) return; c.qty+=d; if(c.qty<=0) cart.splice(i,1); updateCounts(); renderDrawer(); }
function removeLine(i){ cart.splice(i,1); updateCounts(); renderDrawer(); }
function toggleWish(id,btn){
  const i=wish.indexOf(id); if(i>-1) wish.splice(i,1); else wish.push(id);
  const on=wish.includes(id);
  $$('.wbtn,.wb').forEach(b=>{ if(b.getAttribute('onclick')&&b.getAttribute('onclick').includes(JSON.stringify(id))){ b.classList.toggle('on',on); b.setAttribute('aria-pressed',on); } });
  updateCounts(); if(drTab==='wish') renderDrawer(); toast(on?'Добавлено в избранное':'Убрано из избранного');
}
function updateCounts(){
  saveCW();
  const n=cart.reduce((s,c)=>s+c.qty,0), cc=$('#cartCount'), wc=$('#wishCount');
  cc.textContent=n; cc.style.display=n?'grid':'none'; wc.textContent=wish.length; wc.style.display=wish.length?'grid':'none';
}
let drTab='cart';
function openDrawer(t){ drTab=t||'cart'; renderDrawer(); $('#drawer').classList.add('open'); $('#shade').classList.add('open'); syncLock(); }
function closeDrawer(){ $('#drawer').classList.remove('open'); if(!$('#flt').classList.contains('open')) $('#shade').classList.remove('open'); syncLock(); }
const ciImg=p=>`<div class="ci-img" onclick="closeDrawer();openProduct(${jsq(p.id)})">${visual(p,0)}</div>`;
function renderDrawer(){
  $$('#drTabs button').forEach(b=>b.classList.toggle('on',b.dataset.d===drTab));
  const body=$('#drBody'), foot=$('#drFoot');
  if(drTab==='wish'){
    const ps=wish.map(byId).filter(Boolean);
    body.innerHTML = ps.length ? ps.map(p=>`<div class="ci">${ciImg(p)}<div><div class="ci-n">${esc(p.name)}</div><div class="ci-v">${esc(p.brand)}, от ${money(minPrice(p))}</div></div>
      <div class="ci-r"><button class="btn sm red" type="button" onclick="quickAdd(${jsq(p.id)})" ${soldOut(p)?'disabled':''}>В корзину</button><button class="rm" type="button" onclick="toggleWish(${jsq(p.id)})">Убрать</button></div></div>`).join('')
      : `<div class="dr-empty"><b>Пока пусто</b>Нажмите на сердце у аромата, чтобы сохранить его здесь.<br><button class="btn line" type="button" onclick="closeDrawer();goSection('catalog')">В каталог</button></div>`;
    foot.innerHTML=''; return;
  }
  if(!cart.length){ body.innerHTML=`<div class="dr-empty"><b>Корзина пуста</b>Начните с отливанта на 5 мл: так проще понять, ваш ли это аромат.<br><button class="btn line" type="button" onclick="closeDrawer();goSection('catalog')">В каталог</button></div>`; foot.innerHTML=''; return; }
  body.innerHTML=cart.map((c,i)=>{ const {p,v,sum}=lineOf(c); if(!p||!v) return '';
    return `<div class="ci">${ciImg(p)}<div><div class="ci-n">${esc(p.name)}</div><div class="ci-v">${esc(p.brand)}<br>${esc(volName(c.ml))}</div>
      <div class="qty"><button type="button" onclick="changeQty(${i},-1)" aria-label="Меньше">−</button><span>${c.qty}</span><button type="button" onclick="changeQty(${i},1)" aria-label="Больше">+</button></div></div>
      <div class="ci-r"><span class="price">${money(sum)}</span><button class="rm" type="button" onclick="removeLine(${i})">Удалить</button></div></div>`; }).join('');
  const total=cart.reduce((s,c)=>s+lineOf(c).sum,0);
  foot.innerHTML=`<div class="sub"><span>Итого</span><b>${money(total)}</b></div><p class="dr-note">Доставку и оплату подтвердит менеджер в переписке.</p>
    <button class="btn red block" type="button" onclick="openOrder()">Оформить заказ</button>`;
}

/* ====== ОФОРМЛЕНИЕ: текст заказа уходит в Telegram, WhatsApp или Instagram ====== */
const SHIP={ pickup:['Самовывоз','из магазина'], courier:['Курьер по Грозному','в день заказа'], chechnya:['По Чечне','в другой город'], russia:['По России','транспортной компанией'] };
let shipMode='pickup';
function renderShip(){
  $('#shipOpts').innerHTML=Object.entries(SHIP).map(([k,[n,h]])=>`<button type="button" class="opt${shipMode===k?' on':''}" onclick="setShip(${jsq(k)})">${n}<small>${h}</small></button>`).join('');
  $('#addrFld').hidden = shipMode==='pickup';
}
function setShip(k){ shipMode=k; renderShip(); $('#orderText').value=buildOrderText(); }
function buildOrderText(){
  const lines=cart.map((c,i)=>{ const {p,sum}=lineOf(c); return p?`${i+1}. ${p.brand} ${p.name}, ${CONCS[p.conc]?p.conc:''}, ${volName(c.ml)} × ${c.qty} = ${money(sum)}`:''; }).filter(Boolean);
  const total=cart.reduce((s,c)=>s+lineOf(c).sum,0), addr=$('#addr').value.trim(), com=$('#ocomm').value.trim();
  return `Здравствуйте! Хочу оформить заказ в ${STORE.name||'MEMORY'}:\n\n${lines.join('\n')}\n\nИтого: ${money(total)}\nПолучение: ${SHIP[shipMode][0]}${shipMode!=='pickup'&&addr?'\nАдрес: '+addr:''}${com?'\nКомментарий: '+com:''}\n\nПодтвердите, пожалуйста, наличие и стоимость доставки.`;
}
function openOrder(){
  if(!cart.length){ toast('Корзина пуста'); return; }
  closeDrawer(); renderShip(); $('#orderText').value=buildOrderText();
  $$('.ch-row .btn').forEach(b=>b.classList.toggle('off',!STORE[b.dataset.ch]));
  openModal('orderModal');
}
function copyText(raw){
  const old=()=>{ const t=$('#orderText'); try{ t.select(); document.execCommand('copy'); }catch(_){} };
  try{ navigator.clipboard.writeText(raw).catch(old); }catch(e){ old(); }
}
function copyOrder(){ copyText($('#orderText').value); toast('Текст заказа скопирован'); }
const tgUrl=h=>'https://t.me/'+encodeURIComponent(String(h).replace(/^@/,'').replace(/^https?:\/\/t\.me\//,''));
function sendOrder(ch){
  const raw=$('#orderText').value, text=encodeURIComponent(raw), s=STORE;
  copyText(raw);   // запасной вариант: если чат не подставит текст сам, его можно вставить
  const names={telegram:'Telegram',whatsapp:'WhatsApp',instagram:'Instagram'};
  if(!s[ch]){ toast(names[ch]+' магазина пока не указан. Текст заказа скопирован.'); return; }
  let url='';
  if(ch==='whatsapp') url=`https://wa.me/${String(s.whatsapp).replace(/\D/g,'')}?text=${text}`;
  else if(ch==='telegram') url=`${tgUrl(s.telegram)}?text=${text}`;
  else { url=`https://ig.me/m/${encodeURIComponent(String(s.instagram).replace(/^@/,''))}`; toast('Текст скопирован: вставьте его в чат Instagram'); }
  window.open(url,'_blank','noopener');
}

/* ====== ОКНА ====== */
function openModal(id){ $('#'+id).classList.add('open'); syncLock(); if(id==='loginModal') setTimeout(()=>$('#loginUser').focus({preventScroll:true}),80); }
function closeModal(id){ $('#'+id).classList.remove('open'); syncLock(); }
function confirmAction(text,yes){ $('#confirmText').textContent=text; $('#confirmYes').onclick=()=>{ closeModal('confirmModal'); yes(); }; openModal('confirmModal'); }
function syncLock(){ const any=$$('.ov.open,.drawer.open,.modal.open,.flt.open').length || document.body.classList.contains('intro-run'); document.body.classList.toggle('lock',!!any); }
function hideOverlays(keepHistory){ ['#pview','#quiz'].forEach(s=>$(s).classList.remove('open')); syncLock(); }
function closeAll(){ closeDrawer(); closeFilters(); }
function contactsHTML(){
  const s=STORE, a=[];
  if(s.telegram) a.push(`<a href="${tgUrl(s.telegram)}" target="_blank" rel="noopener">Telegram</a>`);
  if(s.whatsapp) a.push(`<a href="https://wa.me/${String(s.whatsapp).replace(/\D/g,'')}" target="_blank" rel="noopener">WhatsApp</a>`);
  if(s.instagram) a.push(`<a href="https://instagram.com/${encodeURIComponent(String(s.instagram).replace(/^@/,''))}" target="_blank" rel="noopener">Instagram*</a>`);
  if(s.address) a.push(`<span>${esc(s.city?s.city+', ':'')}${esc(s.address)}</span>`);
  if(s.hours) a.push(`<span class="muted">${esc(s.hours)}</span>`);
  return a.length?a.join(''):'<span class="muted">Контакты магазина появятся здесь</span>';
}
function renderFooter(){
  $('#ftrContacts').innerHTML=contactsHTML();
  $('#ftrSeller').textContent=(STORE.seller?STORE.seller+(STORE.inn?', ИНН '+STORE.inn:''):(STORE.name||'MEMORY'))+(STORE.instagram?'. *Instagram принадлежит Meta, признанной экстремистской в РФ':'');
}
function openInfo(kind){
  const s=STORE, seller=s.seller?esc(s.seller)+(s.inn?', ИНН '+esc(s.inn):''):'магазин '+esc(s.name);
  const T={
    terms:['Условия покупки',`<h4>Как заказать</h4><p>Добавьте ароматы в корзину, нажмите «Оформить заказ», выберите способ получения и мессенджер. Менеджер подтвердит наличие и сумму.</p>
      <h4>Отливанты</h4><p>Отливант: 5 или 10 мл аромата, перелитые из оригинального флакона в чистый атомайзер. Так можно поносить аромат, прежде чем покупать флакон.</p>
      <h4>Получение и доставка</h4><p>${esc(s.delivery||DEFAULT_STORE.delivery)}</p>
      <h4>Оплата</h4><p>Способ и момент оплаты согласуются с менеджером.</p>
      <h4>Возврат</h4><p>Парфюмерия надлежащего качества по закону обмену и возврату не подлежит. Если флакон пришёл повреждённым, напишите менеджеру сразу при получении.</p>
      <h4>Продавец</h4><p>${seller}.</p>`],
    privacy:['Конфиденциальность',`<h4>Что собирает сайт</h4><p>Ничего. Нет регистрации, форм с телефоном, счётчиков посещений и рекламных трекеров. Шрифты и картинки загружаются с самого сайта.</p>
      <h4>Корзина и избранное</h4><p>Хранятся только в вашем браузере и никуда не отправляются.</p>
      <h4>Когда вы пишете магазину</h4><p>Кнопки заказа открывают переписку в мессенджере. Адрес и имя, которые вы там сообщаете, нужны только чтобы доставить заказ, и не передаются третьим лицам.</p>
      <h4>Кто отвечает</h4><p>${seller}.</p>`],
    orig:['Как проверить оригинал',`<h4>Код партии</h4><p>На дне флакона и на коробке есть код партии (batch code). Они должны совпадать. По коду можно узнать дату производства на сайтах проверки кода партии.</p>
      <h4>Флакон и распылитель</h4><p>Ровное стекло без пузырей, плотно сидящая крышка, мелкий равномерный распыл.</p>
      <h4>Попросите показать</h4><p>Для отливанта менеджер может прислать фото или видео флакона, из которого он разлит.</p>`]
  }[kind];
  $('#infoTitle').textContent=T[0]; $('#infoBody').innerHTML=T[1]; openModal('infoModal');
}

/* ====== ПОЯВЛЕНИЕ ПРИ ПРОКРУТКЕ ====== */
function observeReveal(){
  $$('.sec h2, .sec-lead, .match-txt p, .match-txt .btn, .match-grid, .fam-list, .about-vis, .about-txt p, .sign, .facts').forEach(e=>e.classList.add('rv'));
  if(!('IntersectionObserver' in window)){ $$('.rv').forEach(e=>e.classList.add('in')); return; }
  const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }),{rootMargin:'0px 0px -8% 0px'});
  $$('.rv').forEach(e=>io.observe(e));
  setTimeout(()=>$$('#top .rv').forEach(e=>e.classList.add('in')), introDone?60:1900);
}

function reloadAll(){ loadData(); renderHero(); renderRail(); renderMatchGrid(); renderFamilies(); renderShop(); renderFooter(); renderDrawer(); updateCounts(); if($('#pview').classList.contains('open')) renderProduct(true); if(typeof updateDraftUI==='function') updateDraftUI(); }

/* ====== СОБЫТИЯ ====== */
$('#railTabs').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; railMode=b.dataset.r; $$('#railTabs button').forEach(x=>x.classList.toggle('on',x===b)); renderRail(); });
$('#genderSeg').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; F.g=b.dataset.g; $$('#genderSeg button').forEach(x=>x.classList.toggle('on',x===b)); renderShop(); });
$('#drTabs').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; drTab=b.dataset.d; renderDrawer(); });
let qT; $('#q').addEventListener('input',e=>{ clearTimeout(qT); qT=setTimeout(()=>{ F.q=e.target.value.trim(); renderShop(true); },120); });
$('#sort').addEventListener('change',e=>{ F.sort=e.target.value; renderShop(true); });
['#addr','#ocomm'].forEach(s=>$(s).addEventListener('input',()=>{ $('#orderText').value=buildOrderText(); }));
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape') return;
  const m=$$('.modal.open').pop(); if(m){ closeModal(m.id); return; }
  if($('#drawer').classList.contains('open')||$('#flt').classList.contains('open')){ closeAll(); return; }
  if($('#adminPanel').classList.contains('open')){ closeAdmin(); return; }
  if($('#pview').classList.contains('open')){ closeProduct(); return; }
  if($('#quiz').classList.contains('open')){ closeQuiz(); return; }
});
/* кнопка «назад» на телефоне закрывает досье и подбор */
window.addEventListener('popstate',()=>{
  const h=location.hash;
  const m=/^#p=(.+)$/.exec(h);
  if(m && byId(decodeURIComponent(m[1]))){ openProduct(decodeURIComponent(m[1]),true); return; }
  if($('#pview').classList.contains('open')||$('#quiz').classList.contains('open')) curtain(()=>hideOverlays());
});
/* фото не загрузилось: показываем рисунок флакона */
document.addEventListener('error',e=>{ const t=e.target; if(!t||t.tagName!=='IMG'||t.dataset.fb) return; t.dataset.fb='1';
  const card=t.closest('.card-img,.pv-main,.ci-img,.qr-img,.ar-img'); if(card){ const p=PRODUCTS.find(x=>x.images.includes(t.getAttribute('src'))); if(p){ t.outerHTML=bottleSVG(p); return; } }
  t.style.visibility='hidden'; },true);

/* ====== ЗАПУСК ====== */
introStart();
loadData(); reloadAll(); observeReveal();
(async()=>{
  const fetchPub=fetch('data/db.json?_='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
  const [pub,ok]=await Promise.all([fetchPub,BIG.open()]);
  let local=null;
  if(ok){ const v=await BIG.get(LS.prod); if(v) BIG.mem=v; local=await BIG.get('pub'); }
  const pick=(local && (!pub || (local._rev||0)>(pub._rev||0))) ? local : pub;
  if(pick && Array.isArray(pick.products)) PUB=pick;
  reloadAll();
  const m=/^#p=(.+)$/.exec(location.hash);
  if(m && byId(decodeURIComponent(m[1]))){ history.replaceState(null,'',location.pathname+location.search); openProduct(decodeURIComponent(m[1])); }
  else if(location.hash==='#match'){ history.replaceState(null,'',location.pathname+location.search); openQuiz(); }
  if(typeof adminBoot==='function') adminBoot();
})();
