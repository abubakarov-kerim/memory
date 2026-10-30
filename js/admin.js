/* ===== MEMORI: панель владельца =====
   Вход: адрес сайта + #admin (или /admin), логин admin. Изменения сначала черновик в браузере владельца,
   кнопка «Опубликовать» отправляет их в файлы сайта (data/db.json и images/p) через GitHub. */
function isAdmin(){ try{ return sessionStorage.getItem('memori_authed')==='1'; }catch(e){ return false; } }
function enableAdminMode(){ document.body.classList.add('admin-on'); $('#abVer').textContent='версия '+MEMORI_BUILD; updateDraftUI(); }
function disableAdminMode(){ document.body.classList.remove('admin-on'); }
function adminBoot(){ if(isAdmin()) enableAdminMode(); if(location.hash==='#admin') openAdminGate(); }
window.addEventListener('hashchange',()=>{ if(location.hash==='#admin') openAdminGate(); });

/* ----- вход ----- */
function sha256(s){const k=[],h=[];let p=2;for(let c=0;c<64;p++){let f=1;for(let d=2;d*d<=p;d++)if(p%d==0){f=0;break}if(f){if(c<8)h[c]=(Math.pow(p,.5)*4294967296)|0;k[c++]=(Math.pow(p,1/3)*4294967296)|0}}
const b=unescape(encodeURIComponent(s)),l=b.length*8,w=[];for(let i=0;i<b.length;i++)w[i>>2]|=b.charCodeAt(i)<<(24-(i%4)*8);w[l>>5]|=0x80<<(24-l%32);w[((l+64>>9)<<4)+15]=l;
for(let j=0;j<w.length;j+=16){const a=h.slice(0,8),W=[];for(let i=0;i<64;i++){if(i<16)W[i]=w[j+i]|0;else{const x=W[i-15],y=W[i-2];W[i]=(((x>>>7|x<<25)^(x>>>18|x<<14)^x>>>3)+W[i-7]+((y>>>17|y<<15)^(y>>>19|y<<13)^y>>>10)+W[i-16])|0}
const e=a[4],t1=a[7]+((e>>>6|e<<26)^(e>>>11|e<<21)^(e>>>25|e<<7))+(e&a[5]^~e&a[6])+k[i]+W[i],A=a[0],t2=((A>>>2|A<<30)^(A>>>13|A<<19)^(A>>>22|A<<10))+(A&a[1]^A&a[2]^a[1]&a[2]);a.unshift((t1+t2)|0);a[4]=(a[4]+t1)|0;a.pop()}for(let i=0;i<8;i++)h[i]=(h[i]+a[i])|0}
return h.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('')}
const admCreds = () => Object.assign(DB.admin(), (PUB&&PUB.admin)||{}, (()=>{ try{ return JSON.parse(localStorage.getItem(LS.admin)||'{}'); }catch(e){ return {}; } })());
function openAdminGate(){
  if(isAdmin()){ openAdmin(); return; }
  $('#loginUser').value=''; $('#loginPass').value=''; $('#loginErr').hidden=true; openModal('loginModal');
}
function tryLogin(){
  const a=admCreds();
  if($('#loginUser').value.trim()===a.user && sha256($('#loginPass').value)===a.hash){
    try{ sessionStorage.setItem('memori_authed','1'); }catch(e){}
    closeModal('loginModal'); enableAdminMode(); openAdmin(); toast('Вы вошли как владелец');
  } else $('#loginErr').hidden=false;
}
function logoutAdmin(){ try{ sessionStorage.removeItem('memori_authed'); }catch(e){} disableAdminMode(); closeAdmin(); toast('Вы вышли'); }
let adminTab='products';
function openAdmin(){ if(!isAdmin()){ openAdminGate(); return; } $('#adminPanel').classList.add('open'); syncLock(); admTab(adminTab); }
function closeAdmin(){ $('#adminPanel').classList.remove('open'); if(location.hash==='#admin') history.replaceState(null,'',location.pathname+location.search); syncLock(); }
function admTab(t){ adminTab=t; $$('#admTabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t)); ({products:admProducts,store:admStore,access:admAccess,data:admData}[t]||admProducts)(); $('#admBody').scrollTop=0; updateDraftUI(); }
$('#admTabs').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) admTab(b.dataset.tab); });

/* ----- ароматы: список ----- */
const allProducts = () => DB.products().map(p=>norm(p));
function saveProducts(list){ if(DB.save(LS.prod,list)){ reloadAll(); updateDraftUI(); return true; } return false; }
function admProducts(){
  const list=allProducts();
  $('#admBody').innerHTML=`<div class="adm-h"><h2>Ароматы <small class="mono" style="font-size:.9rem;color:var(--mu)">${list.length}</small></h2><button class="btn red sm" type="button" onclick="editProduct()">Добавить аромат</button></div>
    <p class="adm-hint">Сейчас в каталоге примерные ароматы и цены. Замените их своими: нажмите «Изменить» или удалите лишние. Нет фото? Сайт нарисует флакон в цвете аромата.</p>
    ${list.map(p=>`<div class="adm-row"><div class="ar-img">${visual(p,0)}</div>
      <div><div class="ar-n">${esc(p.brand)} ${esc(p.name)}</div><div class="ar-m">${p.variants.map(v=>v.ml+' мл '+(v.out?'нет':money(v.price))).join(', ')}${p.hit?', хит':''}${p.isNew?', новинка':''}${p.hidden?', <b style="color:var(--red-tx)">скрыт</b>':''}${p.images.length?'':', без фото'}</div></div>
      <div class="ar-acts"><button class="adm-mini" type="button" onclick="editProduct(${jsq(p.id)})">Изменить</button><button class="adm-mini" type="button" onclick="toggleHidden(${jsq(p.id)})">${p.hidden?'Показать':'Скрыть'}</button><button class="adm-mini danger" type="button" onclick="askDelete(${jsq(p.id)})">Удалить</button></div></div>`).join('')}`;
}
function toggleHidden(id){ const l=allProducts(), p=l.find(x=>x.id===id); if(!p) return; p.hidden=!p.hidden; saveProducts(l); admProducts(); toast(p.hidden?'Аромат скрыт с сайта':'Аромат снова виден'); }
function askDelete(id){ const p=allProducts().find(x=>x.id===id); confirmAction(`Удалить «${p?p.brand+' '+p.name:''}»?`,()=>{ saveProducts(allProducts().filter(x=>x.id!==id)); admProducts(); toast('Удалено. Не забудьте опубликовать.'); }); }

/* ----- ароматы: форма ----- */
let ED=null;
const TR={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ы:'y',э:'e',ю:'yu',я:'ya'};
const slug = s => String(s).toLowerCase().replace(/[а-яё]/g,c=>TR[c]||'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40) || 'item';
function editProduct(id){
  const p=id?allProducts().find(x=>x.id===id):null;
  ED = p ? clone(p) : norm({ id:'', brand:'', name:'', conc:'EDP', gender:'u', variants:[{ml:5,price:0},{ml:10,price:0},{ml:100,price:0}], lon:3, sil:3, images:[], bottle:{shape:'block',tint:'#3A3F4A',cap:'black'} });
  renderEditor();
}
function chkGroup(name,map,sel){ return `<div class="chips">${Object.entries(map).map(([k,v])=>`<label class="chk" style="margin-right:14px"><input type="checkbox" name="${name}" value="${esc(k)}" ${sel.includes(k)?'checked':''}>${esc(typeof v==='string'?v:v.name)}</label>`).join('')}</div>`; }
function renderEditor(){
  const p=ED, opt=(map,cur)=>Object.entries(map).map(([k,v])=>`<option value="${esc(k)}" ${k===cur?'selected':''}>${esc(v)}</option>`).join('');
  const n5=(cur)=>[1,2,3,4,5].map(i=>`<option ${i===cur?'selected':''}>${i}</option>`).join('');
  $('#admBody').innerHTML=`<div class="adm-h"><h2>${p.id?'Изменить аромат':'Новый аромат'}</h2><button class="btn line sm" type="button" onclick="admProducts()">К списку</button></div>
  <div class="af">
    <div class="fld"><label class="lbl" for="e_brand">Бренд</label><input class="inp" id="e_brand" value="${esc(p.brand)}" placeholder="Tom Ford"></div>
    <div class="fld"><label class="lbl" for="e_name">Название</label><input class="inp" id="e_name" value="${esc(p.name)}" placeholder="Oud Wood"></div>
    <div class="fld"><label class="lbl" for="e_gender">Для кого</label><select class="inp" id="e_gender">${opt(GENDERS,p.gender)}</select></div>
    <div class="fld"><label class="lbl" for="e_conc">Концентрация</label><select class="inp" id="e_conc">${opt(Object.fromEntries(Object.entries(CONCS).map(([k,v])=>[k,k+': '+v])),p.conc)}</select></div>
    <div class="fld full"><label class="lbl" for="e_desc">Описание (1-2 предложения)</label><textarea class="inp" id="e_desc" rows="3">${esc(p.desc||'')}</textarea></div>
    <div class="fld full"><span class="lbl">Объёмы и цены</span>
      <div class="vhead"><span>Объём, мл</span><span>Цена</span><span>Старая цена</span><span>Нет</span><span></span></div>
      <div id="e_vars">${p.variants.map((v,i)=>varRow(v,i)).join('')}</div>
      <button class="adm-mini" type="button" onclick="addVar()">Добавить объём</button>
      <small class="hint">До 10 мл сайт называет «отливант», больше: «флакон». Галочка «Нет» значит, что этого объёма сейчас нет в наличии.</small></div>
    <div class="fld full"><span class="lbl">Семейства</span>${chkGroup('e_fam',FAMILIES,p.fam)}</div>
    <div class="fld full"><label class="lbl" for="e_top">Верхние ноты (через запятую)</label><input class="inp" id="e_top" value="${esc(p.top.join(', '))}"></div>
    <div class="fld full"><label class="lbl" for="e_heart">Ноты сердца</label><input class="inp" id="e_heart" value="${esc(p.heart.join(', '))}"></div>
    <div class="fld full"><label class="lbl" for="e_base">Базовые ноты</label><input class="inp" id="e_base" value="${esc(p.base.join(', '))}"></div>
    <div class="fld"><label class="lbl" for="e_lon">Стойкость (1-5)</label><select class="inp" id="e_lon">${n5(p.lon)}</select></div>
    <div class="fld"><label class="lbl" for="e_sil">Шлейф (1-5)</label><select class="inp" id="e_sil">${n5(p.sil)}</select></div>
    <div class="fld full"><span class="lbl">Сезон</span>${chkGroup('e_season',SEASONS,p.season)}</div>
    <div class="fld"><span class="lbl">Время</span>${chkGroup('e_time',TIMES,p.time)}</div>
    <div class="fld"><span class="lbl">Отметки</span><div class="chips">
      <label class="chk" style="margin-right:14px"><input type="checkbox" id="e_hit" ${p.hit?'checked':''}>Хит</label>
      <label class="chk" style="margin-right:14px"><input type="checkbox" id="e_new" ${p.isNew?'checked':''}>Новинка</label>
      <label class="chk"><input type="checkbox" id="e_hidden" ${p.hidden?'checked':''}>Скрыть с сайта</label></div></div>
    <div class="fld full"><span class="lbl">Характер (для подбора)</span>${chkGroup('e_char',CHARS,p.char)}</div>
    <div class="fld full"><span class="lbl">Повод (для подбора)</span>${chkGroup('e_occ',OCCS,p.occ)}</div>
    <div class="fld full"><span class="lbl">Фото (до 4, первое главное)</span><div class="imgs" id="e_imgs"></div>
      <label class="chk" style="margin-top:10px"><input type="checkbox" id="e_cut" ${CUT_ON?'checked':''} onchange="CUT_ON=this.checked">Убирать фон автоматически (флакон на прозрачном фоне, по центру)</label>
      <div style="display:flex;gap:8px;margin-top:6px"><input class="inp" id="e_url" placeholder="или вставьте ссылку на фото"><button class="adm-mini" type="button" onclick="addImgUrl()">Добавить</button></div></div>
    <div class="fld full"><span class="lbl">Рисунок флакона (если фото нет)</span>
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div class="bt-prev" id="e_prev"></div>
        <label class="lbl" style="margin:0">Форма <select class="inp" id="e_shape" onchange="btPrev()" style="min-height:40px;margin-top:6px">${opt({block:'Прямоугольный',tall:'Высокий',round:'Круглый',facet:'Гранёный',flask:'Флакон-фляга'},p.bottle.shape)}</select></label>
        <label class="lbl" style="margin:0">Цвет <input class="inp" type="color" id="e_tint" value="${esc(p.bottle.tint)}" oninput="btPrev()" style="min-height:40px;width:70px;padding:4px;margin-top:6px"></label>
        <label class="lbl" style="margin:0">Крышка <select class="inp" id="e_cap" onchange="btPrev()" style="min-height:40px;margin-top:6px">${opt({black:'Чёрная',gold:'Золото',silver:'Серебро',wood:'Дерево'},p.bottle.cap)}</select></label></div></div>
    <div class="fld"><label class="lbl" for="e_code">Код (для штрихкода)</label><input class="inp" id="e_code" value="${esc(p.code)}"></div>
    <div class="fld full" style="display:flex;gap:10px;margin-top:10px"><button class="btn red" type="button" onclick="saveProductForm()">Сохранить</button><button class="btn line" type="button" onclick="admProducts()">Отмена</button></div>
  </div>`;
  renderImgs(); btPrev();
}
const varRow=(v,i)=>`<div class="vrow" data-i="${i}"><input class="inp" type="number" min="1" inputmode="numeric" value="${v.ml||''}" aria-label="Объём"><input class="inp" type="number" min="0" inputmode="numeric" value="${v.price||''}" aria-label="Цена"><input class="inp" type="number" min="0" inputmode="numeric" value="${v.old||''}" aria-label="Старая цена"><label><input type="checkbox" ${v.out?'checked':''}>нет</label><button class="adm-mini danger" type="button" onclick="this.parentElement.remove()" aria-label="Убрать объём">×</button></div>`;
function addVar(){ $('#e_vars').insertAdjacentHTML('beforeend',varRow({ml:'',price:''},Date.now())); }
function readVars(){ return $$('#e_vars .vrow').map(r=>{ const i=r.querySelectorAll('input'); return {ml:+i[0].value||0,price:+i[1].value||0,old:+i[2].value||0,out:i[3].checked}; }).filter(v=>v.ml>0); }
function btPrev(){ $('#e_prev').innerHTML=bottleSVG({brand:$('#e_brand').value,name:$('#e_name').value,bottle:{shape:$('#e_shape').value,tint:$('#e_tint').value,cap:$('#e_cap').value}}); }
function renderImgs(){
  $('#e_imgs').innerHTML=ED.images.map((u,i)=>`<div class="im${isCut(u)?' cutbg':''}"><img src="${esc(u)}" alt=""><button type="button" onclick="ED.images.splice(${i},1);renderImgs()" aria-label="Убрать фото">×</button>${isCut(u)?'':`<button type="button" class="im-cut" onclick="cutExisting(${i})">Убрать фон</button>`}</div>`).join('')+
    (ED.images.length<4?`<label class="add">Загрузить фото<input type="file" accept="image/*" hidden onchange="pickImg(this,u=>{ED.images.push(u);renderImgs();},1400,CUT_ON)"></label>`:'');
}
/* ===== УДАЛЕНИЕ ФОНА =====
   Нейросеть (js/cutout.js) находит флакон, фон становится прозрачным,
   затем флакон ставится по центру кадра 4:5 с одинаковыми полями, чтобы все карточки выглядели ровно. */
let CUT_ON=true;
async function cutBg(canvas){
  const q=await MLCUT.mask(canvas), r=MLCUT.apply(canvas,q,50);
  if(!r.ok) return null;
  const c=r.canvas, w=c.width, h=c.height, d=c.getContext('2d').getImageData(0,0,w,h).data;
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(d[(y*w+x)*4+3]>40){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  if(x1<0) return null;
  const bw=x1-x0+1, bh=y1-y0+1, H=Math.round(Math.max(bh/.84, bw/.8*1.25)), W=Math.round(H*.8);
  const o=document.createElement('canvas'); o.width=W; o.height=H;
  o.getContext('2d').drawImage(c,x0,y0,bw,bh,Math.round((W-bw)/2),Math.round(H*.92-bh),bw,bh);   // флакон стоит на «полу», сверху воздух
  let out=o.toDataURL('image/webp',.9); if(out.indexOf('data:image/webp')!==0) out=o.toDataURL('image/png');
  return out;
}
function imgCanvas(src){ return new Promise((res,rej)=>{ const im=new Image(); im.crossOrigin='anonymous';
  im.onload=()=>{ const k=Math.min(1,1400/Math.max(im.naturalWidth,im.naturalHeight)), c=document.createElement('canvas'); c.width=Math.round(im.naturalWidth*k); c.height=Math.round(im.naturalHeight*k); c.getContext('2d').drawImage(im,0,0,c.width,c.height); res(c); };
  im.onerror=rej; im.src=src; }); }
async function cutExisting(i){
  toast('Убираю фон... (первый раз до 20 секунд)');
  try{ const out=await cutBg(await imgCanvas(ED.images[i])); if(!out){ toast('Флакон на фото не найден, фото оставлено как есть'); return; } ED.images[i]=out; renderImgs(); toast('Фон убран'); }
  catch(e){ toast('Не получилось убрать фон у этого фото. Загрузите его файлом.'); }
}
function addImgUrl(){ const u=$('#e_url').value.trim(); if(!/^(https?:\/\/|images\/)/.test(u)){ toast('Ссылка должна начинаться с https://'); return; } if(ED.images.length>=4){ toast('Уже 4 фото'); return; } ED.images.push(u); $('#e_url').value=''; renderImgs(); }
const listOf = s => String(s||'').split(/[,;\n]/).map(x=>x.trim().toLowerCase()).filter(Boolean);
const checked = n => $$(`input[name="${n}"]:checked`).map(i=>i.value);
function saveProductForm(){
  const brand=$('#e_brand').value.trim(), name=$('#e_name').value.trim(), variants=readVars();
  if(!name){ toast('Впишите название'); $('#e_name').focus(); return; }
  if(!variants.length){ toast('Добавьте хотя бы один объём с ценой'); return; }
  if(variants.some(v=>!v.price)){ toast('У каждого объёма должна быть цена'); return; }
  const list=allProducts();
  let id=ED.id;
  if(!id){ id=slug(brand+' '+name); let n=2, base=id; while(list.some(x=>x.id===id)) id=base+'-'+(n++); }
  const p=Object.assign(ED,{ id, brand, name, gender:$('#e_gender').value, conc:$('#e_conc').value, desc:$('#e_desc').value.trim(), variants,
    fam:checked('e_fam'), top:listOf($('#e_top').value), heart:listOf($('#e_heart').value), base:listOf($('#e_base').value),
    lon:+$('#e_lon').value, sil:+$('#e_sil').value, season:checked('e_season'), time:checked('e_time'), char:checked('e_char'), occ:checked('e_occ'),
    hit:$('#e_hit').checked, isNew:$('#e_new').checked, hidden:$('#e_hidden').checked,
    bottle:{shape:$('#e_shape').value,tint:$('#e_tint').value,cap:$('#e_cap').value}, code:$('#e_code').value.trim()||String(Date.now()).slice(-4) });
  const i=list.findIndex(x=>x.id===id); if(i>-1) list[i]=p; else list.unshift(p);
  if(saveProducts(list)){ toast('Сохранено. Нажмите «Опубликовать», чтобы увидели все.'); admProducts(); }
}

/* фото: уменьшаем и сжимаем в браузере, чтобы влезало в память и быстро грузилось */
function pickImg(input,done,max,cut){
  const file=input.files[0]; if(!file) return; input.value='';
  max=max||1400;
  const fail=()=>toast('Не удалось прочитать фото. Попробуйте JPG или PNG');
  const r=new FileReader(); r.onerror=fail;
  r.onload=()=>{ const im=new Image(); im.onerror=fail;
    im.onload=()=>{ const k=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight)), c=document.createElement('canvas');
      c.width=Math.round(im.naturalWidth*k); c.height=Math.round(im.naturalHeight*k);
      const x=c.getContext('2d'); x.drawImage(im,0,0,c.width,c.height);
      if(cut){ toast('Убираю фон... (первый раз до 20 секунд)');
        cutBg(c).then(o=>{ if(o){ done(o); toast('Фото загружено, фон убран'); } else { done(c.toDataURL('image/jpeg',.86)); toast('Флакон не найден, фото загружено с фоном'); } })
          .catch(()=>{ done(c.toDataURL('image/jpeg',.86)); toast('Не удалось убрать фон (нет интернета?). Фото загружено как есть'); });
        return; }
      let alpha=false; try{ const d=x.getImageData(0,0,c.width,c.height).data; for(let i=3;i<d.length;i+=64){ if(d[i]<250){ alpha=true; break; } } }catch(e){}
      let out=alpha?c.toDataURL('image/webp',.9):c.toDataURL('image/jpeg',.86);
      if(alpha && out.indexOf('data:image/webp')!==0) out=c.toDataURL('image/png');
      done(out); toast('Фото загружено'); };
    im.src=r.result; };
  r.readAsDataURL(file);
}

/* ----- магазин ----- */
let STORE_IMG={};
function admStore(){
  const s=DB.store(); STORE_IMG={heroImg:s.heroImg||'',aboutImg:s.aboutImg||''};
  const f=(k,l,ph,full)=>`<div class="fld${full?' full':''}"><label class="lbl" for="s_${k}">${l}</label><input class="inp" id="s_${k}" value="${esc(s[k]||'')}" placeholder="${esc(ph||'')}"></div>`;
  const img=(k,l)=>`<div class="fld"><span class="lbl">${l}</span><div class="imgs" id="s_${k}_box"></div></div>`;
  $('#admBody').innerHTML=`<div class="adm-h"><h2>Магазин</h2></div>
  <p class="adm-hint">Контакты нужны для кнопок заказа. Пустой мессенджер на сайте будет приглушён.</p>
  <div class="af">
    ${f('telegram','Telegram (ник без @)','memori_grozny')}${f('whatsapp','WhatsApp (номер)','+7 928 000-00-00')}
    ${f('instagram','Instagram (ник без @)','memori.parfum')}${f('city','Город','Грозный')}
    ${f('address','Адрес магазина','проспект, дом')}${f('hours','Часы работы','Ежедневно 10:00-21:00')}
    ${f('heroTitle','Заголовок на первом экране','',true)}${f('heroSub','Подзаголовок (до 20 слов)','',true)}
    ${img('heroImg','Фото первого экрана')}${img('aboutImg','Фото в блоке «О магазине»')}
    ${f('ownerName','Подпись в блоке «О магазине»','Ибрагим Токкаев')}${f('seller','Продавец (ИП ФИО)','ИП Иванов И. И.')}
    ${f('ownerNote','Текст о магазине','',true)}
    <div class="fld full"><label class="lbl" for="s_delivery">Доставка</label><textarea class="inp" id="s_delivery" rows="3">${esc(s.delivery||'')}</textarea></div>
    ${f('inn','ИНН или ОГРНИП','')}
    <div class="fld full"><button class="btn red" type="button" onclick="saveStore()">Сохранить</button></div>
  </div>`;
  ['heroImg','aboutImg'].forEach(storeImgBox);
}
function storeImgBox(k){
  const u=STORE_IMG[k];
  $('#s_'+k+'_box').innerHTML = u ? `<div class="im"><img src="${esc(u)}" alt=""><button type="button" onclick="STORE_IMG['${k}']='';storeImgBox('${k}')" aria-label="Убрать фото">×</button></div>`
    : `<label class="add">Загрузить фото<input type="file" accept="image/*" hidden onchange="pickImg(this,u=>{STORE_IMG['${k}']=u;storeImgBox('${k}')},2000)"></label>`;
}
function saveStore(){
  const s=DB.store();
  ['telegram','whatsapp','instagram','city','address','hours','heroTitle','heroSub','ownerName','seller','ownerNote','inn'].forEach(k=>s[k]=$('#s_'+k).value.trim());
  s.telegram=s.telegram.replace(/^@/,''); s.instagram=s.instagram.replace(/^@/,'');
  s.delivery=$('#s_delivery').value.trim(); Object.assign(s,STORE_IMG);
  if(DB.save(LS.store,s)){ reloadAll(); updateDraftUI(); toast('Сохранено. Нажмите «Опубликовать».'); }
}

/* ----- доступ ----- */
function admAccess(){
  const a=admCreds();
  $('#admBody').innerHTML=`<div class="adm-h"><h2>Доступ</h2></div>
  <p class="adm-hint">Новый логин и пароль начнут работать везде после публикации. Пароль хранится только в виде отпечатка, его нельзя прочитать.</p>
  <div class="af"><div class="fld"><label class="lbl" for="a_user">Логин</label><input class="inp" id="a_user" value="${esc(a.user)}" autocomplete="off"></div>
    <div class="fld"><label class="lbl" for="a_pass">Новый пароль (от 8 знаков)</label><input class="inp" id="a_pass" type="password" autocomplete="new-password"></div>
    <div class="fld full"><button class="btn red" type="button" onclick="saveAccess()">Сменить</button></div></div>`;
}
function saveAccess(){
  const u=$('#a_user').value.trim(), p=$('#a_pass').value;
  if(!u){ toast('Впишите логин'); return; } if(p.length<8){ toast('Пароль должен быть не короче 8 знаков'); return; }
  try{ localStorage.setItem(LS.admin,JSON.stringify({user:u,hash:sha256(p)})); }catch(e){}
  updateDraftUI(); toast('Сохранено. Опубликуйте, чтобы пароль сменился на всех устройствах.');
}

/* ----- база и публикация ----- */
const GH_DEF={repo:'abubakarov-kerim/memori',branch:'main',token:''};
const GH={ get(){ try{ return Object.assign({},GH_DEF,JSON.parse(localStorage.getItem('memori_gh')||'{}')); }catch(e){ return Object.assign({},GH_DEF); } },
  set(o){ try{ localStorage.setItem('memori_gh',JSON.stringify(o)); }catch(e){} } };
function admData(){
  const g=GH.get();
  $('#admBody').innerHTML=`<div class="adm-h"><h2>Публикация</h2></div>
  <p class="adm-hint">«Опубликовать» отправляет ароматы, фото и настройки в файлы сайта. Для этого один раз нужен ключ доступа GitHub (fine-grained token с правом «Contents: Read and write» только для этого сайта). Ключ хранится только в этом браузере.</p>
  <div class="af">
    <div class="fld"><label class="lbl" for="gh_repo">Репозиторий</label><input class="inp" id="gh_repo" value="${esc(g.repo)}"></div>
    <div class="fld"><label class="lbl" for="gh_branch">Ветка</label><input class="inp" id="gh_branch" value="${esc(g.branch)}"></div>
    <div class="fld full"><label class="lbl" for="gh_token">Ключ (token)</label><input class="inp" id="gh_token" type="password" autocomplete="off" value="${esc(g.token)}" placeholder="github_pat_..."></div>
    <div class="fld full"><button class="btn line" type="button" onclick="saveGH()">Сохранить ключ</button></div>
  </div>
  <div class="adm-h adm-sec"><h2>Резервная копия</h2></div>
  <p class="adm-hint"><b>Скачать</b>: файл со всеми ароматами и настройками. <b>Загрузить</b>: такой файл станет черновиком, потом «Опубликовать». <b>Отменить черновик</b>: вернуть то, что сейчас на сайте.</p>
  <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn line" type="button" onclick="exportDB()">Скачать базу</button>
    <label class="btn line" style="cursor:pointer">Загрузить базу<input type="file" accept="application/json" hidden onchange="importDB(this)"></label>
    <button class="btn line" type="button" onclick="dropDraft()">Отменить черновик</button></div>`;
}
function saveGH(){ const o={repo:$('#gh_repo').value.trim()||GH_DEF.repo,branch:$('#gh_branch').value.trim()||'main',token:$('#gh_token').value.trim()}; GH.set(o); toast(o.token?'Ключ сохранён в этом браузере':'Ключ удалён'); }
const hasAdminDraft = () => { try{ return !!localStorage.getItem(LS.admin); }catch(e){ return false; } };
function updateDraftUI(busy){
  const draft=DB.hasDraft()||hasAdminDraft();
  $$('#abPub, .pubbtn').forEach(b=>{ b.textContent=busy||(draft?'Опубликовать':'Всё опубликовано'); b.disabled=!!busy||!draft; });
  const st=$('#pubState'); if(st) st.innerHTML = draft ? '<b>Есть неопубликованные изменения.</b> Посетители их пока не видят.' : 'Всё, что вы видите, уже на сайте.';
}
function dropDraft(){ confirmAction('Отменить все неопубликованные изменения?',()=>{ BIG.mem=null; BIG.del(LS.prod); try{ [LS.prod,LS.store,LS.admin].forEach(k=>localStorage.removeItem(k)); }catch(e){} reloadAll(); admTab(adminTab); toast('Черновик отменён'); }); }
function exportDB(){
  const d={products:DB.products(),store:DB.store(),_date:new Date().toISOString()};
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,1)],{type:'application/json'}));
  a.download='memori-base.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast('База скачана');
}
function importDB(input){
  const f=input.files[0]; if(!f) return; input.value='';
  const r=new FileReader();
  r.onload=()=>{ let d; try{ d=JSON.parse(r.result); }catch(e){ toast('Файл повреждён'); return; }
    if(!Array.isArray(d.products)){ toast('В файле нет ароматов'); return; }
    confirmAction('Загрузить базу из файла? Текущий черновик заменится.',()=>{ DB.save(LS.prod,d.products); if(d.store) DB.save(LS.store,d.store); reloadAll(); admTab(adminTab); toast('Загружено. Проверьте и опубликуйте.'); }); };
  r.readAsText(f);
}
async function ghApi(g,path,method,body){
  let r;
  try{ r=await fetch('https://api.github.com/repos/'+g.repo+path,{method:method||'GET',cache:'no-store',
    headers:Object.assign({'Authorization':'Bearer '+g.token,'Accept':'application/vnd.github+json'},body?{'Content-Type':'application/json'}:{}),
    body:body?JSON.stringify(body):undefined}); }
  catch(e){ throw new Error('Нет связи с GitHub. Проверьте интернет и попробуйте ещё раз.'); }
  if(!r.ok){
    const m={401:'Ключ неверный или истёк. Создайте новый (вкладка «База»).',403:'У ключа нет права записи. Нужен доступ «Contents: Read and write».',
      404:'Репозиторий не найден или ключ к нему не допущен.',409:'Сайт изменился во время публикации. Нажмите ещё раз.',422:'Сайт изменился во время публикации. Нажмите ещё раз.'};
    throw new Error(m[r.status]||('GitHub ответил ошибкой '+r.status+'.'));
  }
  return r.json();
}
let publishing=false;
async function publishDB(){
  const g=GH.get();
  if(!g.token){ toast('Сначала добавьте ключ публикации во вкладке «База».'); adminTab='data'; openAdmin(); return; }
  if(publishing) return; publishing=true; updateDraftUI('Публикую...');
  try{
    const products=DB.products(), store=DB.store(), admin=admCreds();
    const blobs=[], stamp=Date.now().toString(36), done=new Map();
    const toFile=(u,name)=>{ const m=/^data:image\/(png|webp|jpeg|gif);base64,(.+)$/.exec(u||''); if(!m) return u;
      if(done.has(u)) return done.get(u);
      const path='images/p/'+name+'-'+stamp+'.'+(m[1]==='jpeg'?'jpg':m[1]); blobs.push({path,b64:m[2]}); done.set(u,path); return path; };
    products.forEach(p=>{ const sid=String(p.id).replace(/[^a-z0-9_-]/gi,''); p.images=(p.images||[]).map((u,i)=>toFile(u,sid+'-'+(i+1))); });
    store.heroImg=toFile(store.heroImg,'hero'); store.aboutImg=toFile(store.aboutImg,'about');
    const db={_v:1,_rev:Date.now(),_date:new Date().toISOString(),products,store,admin:{user:admin.user,hash:admin.hash}};
    const br=encodeURIComponent(g.branch||'main');
    const ref=await ghApi(g,'/git/ref/heads/'+br), base=await ghApi(g,'/git/commits/'+ref.object.sha), tree=[];
    for(const f of blobs){ const bl=await ghApi(g,'/git/blobs','POST',{content:f.b64,encoding:'base64'}); tree.push({path:f.path,mode:'100644',type:'blob',sha:bl.sha}); }
    tree.push({path:'data/db.json',mode:'100644',type:'blob',content:JSON.stringify(db,null,1)});
    const nt=await ghApi(g,'/git/trees','POST',{base_tree:base.tree.sha,tree});
    const nc=await ghApi(g,'/git/commits','POST',{message:'Публикация из админки: '+products.length+' ароматов',tree:nt.sha,parents:[ref.object.sha]});
    await ghApi(g,'/git/refs/heads/'+br,'PATCH',{sha:nc.sha});
    PUB=db; BIG.put('pub',db); BIG.mem=null; BIG.del(LS.prod);
    try{ [LS.prod,LS.store,LS.admin].forEach(k=>localStorage.removeItem(k)); }catch(e){}
    reloadAll(); if($('#adminPanel').classList.contains('open')) admTab(adminTab);
    toast('Опубликовано. Все увидят изменения через 1-2 минуты.');
  }catch(e){ toast(e.message||'Не удалось опубликовать.'); }
  finally{ publishing=false; updateDraftUI(); }
}
