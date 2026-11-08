import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, EmailAuthProvider, linkWithCredential, updatePassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/* ===== settings ===== */
const firebaseConfig={apiKey:"AIzaSyCCdRRGhApVy5xESVmCrVYUJdNo1cszPCc",authDomain:"auto-peshsaf.firebaseapp.com",projectId:"auto-peshsaf",storageBucket:"auto-peshsaf.firebasestorage.app",messagingSenderId:"923283036748",appId:"1:923283036748:web:869dabd7e3913cf974b2e9"};
const IN_WV=(()=>{try{return /; wv\)|Version\/[\d.]+ Chrome\/[\d.]+ Mobile Safari/.test(navigator.userAgent)&&/Android/.test(navigator.userAgent)}catch(_){return false}})();
const ADMIN_EMAILS=["umar.safaroov@gmail.com"];           // роҳбарон (почтаи Google)
const WORKER_DOMAIN="workers.auto-peshsaf.app";            // почтаи сохтагӣ барои логини коргар

const fbApp=initializeApp(firebaseConfig);
const auth=getAuth(fbApp);
const db=getFirestore(fbApp);
let secAuth=null; // барои сохтани ҳисоби коргар бе баромадани роҳбар
const secondaryAuth=()=>secAuth||(secAuth=getAuth(initializeApp(firebaseConfig,'secondary')));

/* ===== constants ===== */
const ST={new:{l:'Нав',k:'n'},assigned:{l:'Супорида шуд',k:'a'},searching:{l:'Дар ҷустуҷӯ',k:'s'},found:{l:'Нарх лозим',k:'f'},offered:{l:'Нарх фиристода шуд',k:'o'},ordered:{l:'Заказ шуд',k:'d'},shipped:{l:'Дар роҳ',k:'d'},delivered:{l:'Дода шуд',k:'g'},returned:{l:'Баргашт',k:'x'},notfound:{l:'Ёфт нашуд',k:'x'},cancelled:{l:'Бекор шуд',k:'x'}};
const ORDER=['new','assigned','searching','found','offered','ordered','shipped','delivered','returned','notfound','cancelled'];
const ACTIVE=['new','assigned','searching','found','offered','ordered','shipped'];
const SOLD=['ordered','shipped','delivered'];
const PRE=['new','assigned','searching'];
const URG={h24:{l:'24 соат',h:24},d3:{l:'3 рӯз',h:72},w1:{l:'1 ҳафта',h:168}};
const KIND={orig:'Оригинал',copy:'Копия',used:'Кӯҳна (б/у)'};
let COND={},GRP={},GRPS={};
/* соҳаҳо: ҳар ширкат дар «Танзимот» соҳаи худро интихоб мекунад */
const PRESETS={
  auto:{label:'Автозапчаст',f1:'Мошин (марка, модел)',f1s:'Мошин',f1ph:'Toyota Camry',f2:'Сол',f2ph:'2015',f3:'VIN',f3ph:'JTDBR32E720123456',f3len:17,
    itemPh:'Масалан: фараи пеши чап',g1:'Нав',g2:'Кӯҳна',needRef:true,refHint:'VIN ё акс лозим аст — бо онҳо қисми дуруст ёфт мешавад.'},
  computers:{label:'Компютер ва электроника',f1:'Дастгоҳ (бренд, модел)',f1s:'Дастгоҳ',f1ph:'Lenovo ThinkPad T14',f2:'Насл / сол',f2ph:'Gen 2, 2021',f3:'Серия (S/N) ё Part number',f3ph:'PF2ABCDE',f3len:0,
    itemPh:'Масалан: клавиатура, SSD 512GB',g1:'Нав',g2:'Истифодашуда',needRef:true,refHint:'Серия, Part number ё акс лозим аст — бо онҳо қисми мувофиқ ёфт мешавад.'},
  phones:{label:'Телефон ва гаҷетҳо',f1:'Дастгоҳ (бренд, модел)',f1s:'Дастгоҳ',f1ph:'iPhone 13 Pro',f2:'Хотира / ранг',f2ph:'256GB, кабуд',f3:'IMEI ё серия',f3ph:'35xxxxxxxxxxxxx',f3len:0,
    itemPh:'Масалан: экран, батарея',g1:'Оригинал',g2:'Копия / б.у',needRef:true,refHint:'IMEI ё акс лозим аст — бо онҳо қисми мувофиқ ёфт мешавад.'},
  general:{label:'Умумӣ (ҳар гуна мол)',f1:'Мол ё объект',f1s:'Мол',f1ph:'Номи мол',f2:'Тафсилот',f2ph:'Андоза, ранг, бренд…',f3:'Код / артикул',f3ph:'',f3len:0,
    itemPh:'Номи мол',g1:'Нав',g2:'Истифодашуда',needRef:false,refHint:'Агар код ё акс бошад, мол зудтар ёфт мешавад.'}
};
const CFG_DEFAULT={name:'AUTO PESHSAF',tagline:'Deira, Dubai',phone:'',industry:'auto',cur:'AED',cur2:'TJS',rate2:2.6,vat:5,...PRESETS.auto};
let C={...CFG_DEFAULT};
const logoTxt=()=>initials(C.name).slice(0,2)||'•';
const logoHtml=()=>C.logo?`<div class="logo img"><img src="${esc(C.logo)}" alt="${esc(C.name)}"></div>`:`<div class="logo">${esc(logoTxt())}</div>`;
async function logoData(file){const img=await createImageBitmap(file);const s=Math.min(1,256/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  let d=c.toDataURL('image/png');if(d.length>150000)d=c.toDataURL('image/jpeg',.85);return d}
function applyCfg(d){
  const base=PRESETS[(d&&d.industry)||CFG_DEFAULT.industry]||PRESETS.general;
  C={...CFG_DEFAULT,...base,...(d||{})};
  COND={new:C.g1,used:C.g2,any:'Фарқ надорад'};GRP={new:C.g1,used:C.g2};GRPS={new:C.g1,used:C.g2,all:'Ҳарду гурӯҳ'};
  document.title=C.name+' · Дархостҳо';
}
applyCfg(null);
const CSTEPS=['Қабул','Ҷустуҷӯ','Ёфт шуд','Заказ','Дар роҳ','Дода шуд'];
const CSTAGE={new:0,assigned:0,searching:1,found:1,offered:2,ordered:3,shipped:4,delivered:5};
const OST={assigned:'Супорида шуд',bought:'Аз паставшик гирифта шуд',packed:'Бастабандӣ шуд',shipped:'Ба карго дода шуд'};
const PRIV_KEYS=['quotes','chosenQ','cost','supplier','supplierPhone','workerNote','com','comPct','comW','comPaid','comPaidAt'];
/* ===== музди коргар ===== */
const chosenIC=r=>{const q=(r.quotes||[]).find(x=>x.id===r.chosenQ);return q&&Array.isArray(q.itemCosts)?q.itemCosts:null};
const profitOf=r=>Math.round(((+r.price||0)-(+r.cost||0))*100)/100;
const comWorker=r=>r.comW||r.workerId||r.orderWorkerId||null;
const wPct=wid=>{const w=(S.workers||{})[wid]||{};return w.comPct!=null&&w.comPct!==''?+w.comPct:10};
const comElig=r=>SOLD.includes(r.status)&&+r.cost>0&&+r.price>0&&!!comWorker(r);
const comSug=(r,pct)=>Math.round(Math.max(0,profitOf(r))*(pct??wPct(comWorker(r)))/100*100)/100;
const hasCom=r=>r.com!=null&&r.com!==''&&SOLD.includes(r.status);
const IC=(p,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICONS={cust:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',inv:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',req:'<path d="M9 4h6l1 2h3v14H5V6h3z"/><path d="M9 11h6M9 15h4"/>',debt:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',rep:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6 6 0 0 0-4-5.6"/>',set:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  work:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',found:'<path d="M20 6 9 17l-5-5"/>',sold:'<path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>',profit:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'};
const ICON_SEARCH='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
const ICON_CAM='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';

const S={authReady:false,ready:false,isAdmin:false,wid:null,cid:null,denied:null,
  rawReqs:{},extra:{},privs:{},workers:{},customers:{},users:{},reqs:[],
  view:null,adminTab:'req',repTab:'o',period:'month',fStatus:'active',fGroup:'all',fWorker:'all',wTab:'new',q:'',open:null,newReq:false,toast:null,busy:false,
  nItems:1,lb:null,lastRate:null,entryTab:(typeof location!=='undefined'&&location.hash==='#worker')?'worker':'customer',ph:{},phLoading:{}};
const app=document.getElementById('app');
S.det={};S.qOpen=null;
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.k)S.det[d.dataset.k]=d.open},true);
let unsubs=[];

/* ===== helpers ===== */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const p2=n=>String(n).padStart(2,'0');
const fmt=t=>{if(!t)return'';const d=new Date(t);return p2(d.getDate())+'.'+p2(d.getMonth()+1)+' '+p2(d.getHours())+':'+p2(d.getMinutes())};
const fdate=t=>{const d=new Date(t);return p2(d.getDate())+'.'+p2(d.getMonth()+1)+'.'+d.getFullYear()};
const ago=t=>{if(!t)return'';const m=Math.floor((Date.now()-t)/60000);if(m<1)return'ҳозир';if(m<60)return m+' дақ. пеш';const h=Math.floor(m/60);if(h<24)return h+' соат пеш';const d=Math.floor(h/24);return d<7?d+' рӯз пеш':fmt(t).slice(0,5)};
const num=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0});
const money=n=>(n||n===0)&&n!==''&&n!==null?Number(n).toLocaleString('en-US',{maximumFractionDigits:2})+' '+C.cur:'—';
const hrs=h=>h==null?'—':h<1?Math.round(h*60)+' дақ':h<48?(Math.round(h*10)/10)+' соат':Math.round(h/24)+' рӯз';
const digits=p=>String(p||'').replace(/\D/g,'').replace(/^00/,'');
const uname=id=>{const u=S.users[id];return u?(u.name||'Беном'):'—'};
const initials=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const kc=s=>'k-'+((ST[s]||{}).k||'a');
const pill=s=>`<span class="pill ${kc(s)}">${esc((ST[s]||{l:s}).l)}</span>`;
const itemsOf=r=>Array.isArray(r.items)&&r.items.length?r.items:[{n:r.parts||'',q:r.qty||1,price:r.price||null,off:false}];
const inm=i=>i.code?i.code+(i.n&&i.n!==i.code?' — '+i.n:''):(i.n||'');
const inmH=i=>i.code?`${i.oldCode&&i.oldCode!==i.code?`<s class="oldc">${esc(i.oldCode)}</s> → `:''}<code class="pc">${esc(i.code)}</code>${i.n&&i.n!==i.code?` <span class="inm">${esc(i.n)}</span>`:''}`:esc(i.n||'');
const titleOf=r=>{const a=itemsOf(r).filter(i=>!i.off);if(a.length<=2)return itemsTxt(r);return a.length+' қисм: '+a.slice(0,2).map(i=>i.code||i.n).join(', ')+' +'+(a.length-2)};
const itemsTxt=r=>itemsOf(r).filter(i=>!i.off).map(i=>inm(i)+(i.q>1?' × '+i.q:'')).join(', ');
const paidOf=r=>(r.payments||[]).reduce((a,p)=>a+(+p.a||0),0);
const balOf=r=>SOLD.includes(r.status)?Math.max(0,Math.round(((+r.price||0)-paidOf(r))*100)/100):0;
const deadline=r=>(r.createdAt||0)+URG[r.urgency&&URG[r.urgency]?r.urgency:'d3'].h*3600000;
const overdue=r=>PRE.includes(r.status)&&Date.now()>deadline(r);
function dueTxt(r){if(!PRE.includes(r.status))return'';const ms=deadline(r)-Date.now();if(ms<0)return'<span class="due late">Мӯҳлат гузашт</span>';const h=Math.floor(ms/3600000);return`<span class="due ${h<6?'soon':''}">${h<24?Math.max(1,h)+' соат монд':Math.floor(h/24)+' рӯз монд'}</span>`}
function custName(r){return r.customerId&&S.users[r.customerId]?S.users[r.customerId].name:(r.customerName||'Муштарӣ')}
function custPhone(r){return r.customerId&&S.users[r.customerId]?S.users[r.customerId].phone:(r.customerPhone||'')}
function waText(r){
  const its=itemsOf(r).filter(i=>!i.off),car=(r.car||'').trim(),hasCar=car&&car!=='—';
  const line=(i,k)=>`${its.length>1?(k+1)+') ':''}${i.code||i.n}${i.code&&i.n&&i.n!==i.code?' ('+i.n+')':''}${i.q>1?' — '+i.q+' дона':''}`;
  const L=[];
  if(hasCar){L.push('1. '+car);L.push('2. '+(r.year||'—'));L.push('3. '+(its.length>1?'Қисмҳо ('+its.length+'):':line(its[0],0)));if(its.length>1)its.forEach((i,k)=>L.push(line(i,k)))}
  else{L.push(its.some(i=>i.code)?'Кодҳо ('+its.length+'):':'Қисмҳо ('+its.length+'):');its.forEach((i,k)=>L.push(line(i,k)))}
  if(r.vin)L.push('VIN: '+r.vin);
  if(r.condition==='new')L.push('Намуд: '+(C.g1||'Нав'));else if(r.condition==='used')L.push('Намуд: '+(C.g2||'Кӯҳна'));
  return L.join('\n')}
const isoD=t=>{const d=new Date(t);return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())};
const siteUrl=()=>{try{return location.origin+location.pathname}catch(_){return''}};
function custMsg(r){
  const n=custName(r),c=r.code;
  if(r.status==='offered')return`Ассалому алайкум, ${n}!\nДархости №${c} (${r.car}) ёфт шуд:\n${itemsOf(r).filter(i=>!i.off).map(i=>'• '+inm(i)+(i.q>1?' × '+i.q:'')+(i.price?' — '+money(i.price):'')).join('\n')}\nҶамъ: ${money(r.price)}${r.warrantyDays?'\nКафолат: '+r.warrantyDays+' рӯз':''}\nБарои заказ ба сайт ворид шавед: ${location.origin+location.pathname}\n${C.name}`;
  if(r.status==='ordered')return`Ассалому алайкум, ${n}! Закази №${c} қабул шуд. Ҷамъ: ${money(r.price)}${balOf(r)?', боқимонда: '+money(balOf(r)):''}.\n${C.name}`;
  if(r.status==='shipped'){const L=[`Ассалому алайкум, ${n}!`,`Закази №${c} ба карго супорида шуд ✅`,''];
    if(r.cargo)L.push('📦 Карго: '+r.cargo);if(r.tracking)L.push('🔢 Рақами карго: '+r.tracking);if(+r.weight)L.push('⚖️ Вазни бор: '+r.weight+' кг');if(r.deliverBy)L.push('📅 Рӯзи супоридан ба шумо: '+fdate(r.deliverBy));
    L.push('','🧾 Инвойс INV-'+c+':');itemsOf(r).filter(i=>!i.off).forEach(i=>L.push('• '+inm(i)+(i.q>1?' × '+i.q:'')+(i.price?' — '+money(i.price):'')));
    L.push('Ҷамъ: '+money(r.price),'Пардохт шуд: '+money(paidOf(r)),'Боқимонда: '+money(balOf(r)));
    L.push('','Акси бор ва инвойсро дар сайт бинед:',siteUrl(),C.name);return L.join('\n')}
  if(r.status==='delivered')return`Ассалому алайкум, ${n}! Закази №${c} тайёр/супорида шуд.${balOf(r)?' Боқимонда: '+money(balOf(r))+'.':''} Ташаккур!\n${C.name}`;
  if(r.status==='notfound')return`Ассалому алайкум, ${n}! Афсӯс, қисм аз дархости №${c} ҳоло ёфт нашуд.\n${C.name}`;
  return`Ассалому алайкум, ${n}! Дархости №${c} дар ҷустуҷӯ аст.\n${C.name}`;
}
const waLink=(ph,txt)=>'https://wa.me/'+digits(ph)+(txt?'?text='+encodeURIComponent(txt):'');
function toast(m){S.toast=m;render();clearTimeout(toast.t);toast.t=setTimeout(()=>{S.toast=null;render()},3200)}
function matchQ(r){const q=S.q.trim().toLowerCase();if(!q)return true;return[r.code,r.car,r.year,itemsTxt(r),r.vin,custName(r),custPhone(r),r.supplier].join(' ').toLowerCase().includes(q)}
const errTxt=e=>{const c=e&&(e.code||'')||'';if(c.includes('permission'))return'иҷозат нест';if(c.includes('unavailable')||c.includes('network'))return'интернет нест';return'боз кӯшиш кунед'};

/* photos (stored in Firestore as small JPEG) */
const PH_PLACE='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#8888"/></svg>');
function photosHtml(r){const ph=r.photos||[];if(!ph.length)return'';return`<div class="photos">${ph.map(p=>`<button class="thumb" data-act="lb" data-v="${esc(p.id)}"><img data-pid="${esc(p.id)}" src="${S.ph[p.id]||PH_PLACE}" alt="Акси қисм"><i>${p.k==='g'?'карго':p.k==='w'?'коргар':'муштарӣ'}</i></button>`).join('')}</div>`}
function fillPhotos(){app.querySelectorAll('img[data-pid]').forEach(img=>{const id=img.dataset.pid;if(S.ph[id]){if(img.src!==S.ph[id])img.src=S.ph[id];return}
  if(S.phLoading[id])return;S.phLoading[id]=true;getDoc(doc(db,'photos',id)).then(s=>{if(s.exists()){S.ph[id]=s.data().data;app.querySelectorAll('img[data-pid="'+id+'"]').forEach(x=>x.src=S.ph[id])}}).catch(()=>{})})}
function uplBtn(id,label){return`<label class="upl">${ICON_CAM}${label}<input type="file" accept="image/*" multiple data-up="${id}"></label>`}
async function toJpeg(f){const img=await createImageBitmap(f);let side=1000,q=.72,out='';
  for(let i=0;i<5;i++){const s=Math.min(1,side/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);out=c.toDataURL('image/jpeg',q);if(out.length<700000)break;side*=.75;q-=.08}
  return out}
async function uploadFiles(files,kind,rid,cidv){
  const out=[];if(!files||!files.length)return out;
  for(const f of [...files].slice(0,6)){try{const data=await toJpeg(f);const ref=doc(collection(db,'photos'));await setDoc(ref,{rid,cid:cidv||null,data,k:kind,t:Date.now(),by:actor()});S.ph[ref.id]=data;out.push({id:ref.id,k:kind,t:Date.now()})}
    catch(e){toast('Акс бор нашуд ('+errTxt(e)+'). JPG ё PNG интихоб кунед.')}}
  return out;
}

/* roles */
const workers=()=>Object.entries(S.users).filter(([,u])=>u.role==='worker').sort((a,b)=>(a[1].createdAt||0)-(b[1].createdAt||0));
const idsOf=id=>[id];
const loadOf=id=>S.reqs.filter(r=>r.workerId===id&&ACTIVE.includes(r.status)).length;
function role(){return S.isAdmin?'admin':S.wid?'worker':S.cid?'customer':null}
function view(){if(S.isAdmin)return S.view||'admin';if(S.wid)return'worker';if(S.cid)return'customer';return'onboard'}
function actWorker(){if(!S.isAdmin)return S.wid;const ws=workers();if(!ws.some(([id])=>id===S.asWorker))S.asWorker=ws.length?ws[0][0]:null;return S.asWorker}
const actIds=()=>S.wid?[S.wid]:S.isAdmin&&view()==='worker'&&actWorker()?[actWorker()]:[];
const actor=()=>S.isAdmin?'admin':(S.wid||S.cid||'—');
const cid=()=>S.cid||'admin';
const isAdminView=()=>view()==='admin';
function crewBtn(id,u,on,act,extra){return`<button class="crew ${on?'on':''}" data-act="${act}" data-v="${id}" ${extra||''}><span class="av">${esc(initials(u.name))}</span><span style="min-width:0"><b>${esc(u.name)}</b><small>${esc(GRPS[u.group]||'')} · ${loadOf(id)} дар кор</small></span></button>`}
function translit(s){const m={а:'a',б:'b',в:'v',г:'g',ғ:'gh',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',ӣ:'i',й:'y',к:'k',қ:'q',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ӯ:'u',ф:'f',х:'kh',ҳ:'h',ч:'ch',ҷ:'j',ш:'sh',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};return String(s||'').toLowerCase().split('').map(c=>m[c]??c).join('').replace(/[^a-z0-9]/g,'')}
const cleanLogin=s=>String(s||'').toLowerCase().trim().replace(/[^a-z0-9._-]/g,'');

/* merge raw docs into the shape the views use */
function rebuild(){
  const u={admin:{name:'Роҳбар',role:'admin'}};
  for(const [id,w] of Object.entries(S.workers))u[id]={...w,role:w.active===false?'removed':'worker'};
  for(const [id,c] of Object.entries(S.customers))u[id]={...c,role:'customer'};
  S.users=u;
  const all={...S.extra,...(S.extraO||{}),...S.rawReqs};
  S.reqs=Object.entries(all).map(([id,d])=>{
    const p={...((S.privsO||{})[id]||{}),...(S.privs[id]||{})};const custOff=d.custOff||[];
    const items=itemsOf(d).map((it,i)=>({...it,off:!!it.off||custOff.includes(i)}));
    const priced=items.some(it=>it.price>0);
    const price=priced?items.filter(it=>!it.off).reduce((a,it)=>a+(+it.price||0),0):(d.price||null);
    return{id,...d,...p,items,price,log:d.log||[],plog:p.log||[]};
  }).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
}

/* ===== stats ===== */
function periodStart(){const d=new Date();d.setHours(0,0,0,0);if(S.period==='today')return+d;if(S.period==='month'){d.setDate(1);return+d}if(S.period==='week'){d.setDate(d.getDate()-6);return+d}return 0}
const inPer=r=>(r.createdAt||0)>=periodStart();
const wasFound=r=>!!r.foundAt||['found','offered',...SOLD,'returned'].includes(r.status)||(r.status==='cancelled'&&!!r.offeredAt);
function wStepsHtml(r,isMine){
  const me=actIds(),isO=!!r.orderWorkerId&&me.includes(r.orderWorkerId),os=r.ordStage||'',sh=['shipped','delivered'].includes(r.status),sold=SOLD.includes(r.status);
  const taken=!!r.workerId&&!['assigned','new'].includes(r.status),hasQ=(r.quotes||[]).length>0,found=wasFound(r)&&r.status!=='searching';
  const oSteps=[['Аз паставшик гирифтан',sh||['bought','packed','shipped'].includes(os)],['Бастабандӣ',sh||['packed','shipped'].includes(os)],['Акси бор + карго',sh]];
  let S_=[];
  if(isMine||(r.status==='assigned'&&!r.workerId))S_=[['Ба кор гирифтан',taken],['Нархи паставшик',hasQ||found],['Ёфт шуд',found],['Роҳбар нарх ба муштарӣ мефиристад',wasOffered(r)],['Муштарӣ заказ медиҳад',sold],['Роҳбар масъули заказро таъин мекунад',!!r.orderWorkerId]];
  if(isO)S_=S_.concat(oSteps);
  else if(isMine&&r.orderWorkerId)S_.push(['Заказро '+uname(r.orderWorkerId)+' тайёр мекунад',sh]);
  if(!S_.length)return'';
  const cur=S_.findIndex(x=>!x[1]);
  const wait=cur>=0&&/Роҳбар|Муштарӣ|тайёр мекунад/.test(S_[cur][0]);
  return`<div class="card wsteps"><h3>Қадамҳои шумо</h3><ol>${S_.map(([l,d],i)=>`<li class="${d?'done':i===cur?'cur':'lock'}"><i>${d?'✓':i===cur?i+1:'🔒'}</i><span>${esc(l)}</span>${i===cur?`<b>${wait?'интизор':'ҳозир'}</b>`:''}</li>`).join('')}</ol>${wait?'<div class="small muted">Ин қадам аз шумо нест — интизор шавед. Вақте иҷро шуд, қадами навбатӣ худаш кушода мешавад.</div>':''}</div>`;
}
function admSteps(r,SL){
  const tail=(SL.extra||'')+(SL.extra2||'');
  if(['cancelled','notfound','returned'].includes(r.status))return(SL.worker||'')+(SL.quotes||'')+(SL.offer||'')+(SL.pay||'')+(SL.profit||'')+tail;
  const sold=SOLD.includes(r.status),sh=['shipped','delivered'].includes(r.status),os=r.ordStage||'';
  const shipTxt=sold?`<div class="card"><div class="small">Ҳолат: <b>${esc(sh?OST.shipped:OST[os||'assigned'])}</b>${r.cargo?' · '+esc(r.cargo):''}${r.tracking?' · '+esc(r.tracking):''}${+r.weight?' · '+r.weight+' кг':''}</div><div class="small muted">Ин қадамро масъули заказ (${esc(uname(r.orderWorkerId)||'—')}) дар панели худ иҷро мекунад.</div></div>`:'';
  const st=[
    ['worker','Масъул (коргар)',!!r.workerId&&r.status!=='new',r.workerId?uname(r.workerId):''],
    ['quotes','Нархи паставшик',(r.quotes||[]).length>0||wasFound(r),(r.quotes||[]).length?(r.quotes.length+' нарх'):''],
    ['offer','Нарх ба муштарӣ',wasOffered(r),r.price?money(r.price):''],
    ['confirm','Тасдиқи муштарӣ',sold,sold?'заказ шуд':''],
    ['oworker','Масъули заказ',!!r.orderWorkerId,r.orderWorkerId?uname(r.orderWorkerId):''],
    ['ship','Харид → баста → карго',sh,r.cargo||''],
    ['send','Ба муштарӣ фиристодан',!!r.sentToCustAt||r.status==='delivered',r.sentToCustAt?fdate(r.sentToCustAt):''],
    ['pay','Пардохти муштарӣ',sold&&+r.price>0&&balOf(r)<=0,sold?(balOf(r)>0?'қарз '+money(balOf(r)):'пурра'):''],
    ['com','Музди коргар',!!r.comPaid||(sold&&!comWorker(r)),hasCom(r)?money(r.com):''],
  ];
  const allDone=st.every(x=>x[2]);
  st.push(['profit','Фоида ва инвойс',allDone,sold&&+r.cost>0?money(netOf(r)):'']);
  const cur=st.findIndex(x=>!x[2]);
  const body=k=>k==='ship'?shipTxt:(SL[k]||'');
  return`<div class="asteps">${st.map(([k,l,d,sub],i)=>{const c=body(k),isCur=i===cur;
    return`<details class="ast ${d?'done':isCur?'cur':'todo'}" id="ast-${k}" ${isCur||(k==='profit'&&allDone)?'open':''}><summary><i>${d?'✓':'✕'}</i><span class="ast-t"><b>${i+1}. ${l}</b>${sub?`<small>${esc(sub)}</small>`:''}</span>${isCur?'<em>ҳозир</em>':''}</summary><div class="ast-b">${c||`<div class="small muted">${d?'Иҷро шуд.':'Ҳоло дастрас нест — аввал қадами пешинро иҷро кунед.'}</div>`}</div></details>`}).join('')}</div>`
    +(tail?`<div class="small muted" style="margin:6px 2px -4px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Иловагӣ</div>`+tail:'');
}
function procHtml(r){
  const os=r.ordStage||'',sh=['shipped','delivered'].includes(r.status),sold=SOLD.includes(r.status);
  const S_=[['Дархост',1],['Масъул',!!r.workerId],['Нарх ёфт',wasFound(r)],['Ба муштарӣ',wasOffered(r)],['Қабул кард',sold],['Масъули заказ',!!r.orderWorkerId],['Харид',sh||['bought','packed','shipped'].includes(os)],['Баста',sh||['packed','shipped'].includes(os)],['Карго + акс',sh],['Музд',!!r.comPaid||(sold&&!comWorker(r))],['Фоида',sh&&(!!r.comPaid||!comWorker(r))]];
  if(['cancelled','notfound','returned'].includes(r.status))return'';
  const cur=S_.findIndex(x=>!x[1]);
  return`<div class="card proc"><h3>Раванд</h3><div class="steps">${S_.map(([l,d],i)=>`<span class="stp ${d?'done':i===cur?'cur':''}"><i>${d?'✓':i+1}</i>${l}</span>`).join('')}</div></div>`;
}
const netOf=r=>Math.round((profitOf(r)-(hasCom(r)?+r.com||0:0))*100)/100;
const wasOffered=r=>!!r.offeredAt||['offered',...SOLD,'returned'].includes(r.status);
function wStats(id,from){
  const rs=S.reqs.filter(r=>r.workerId===id&&(r.createdAt||0)>=(from||0));
  const found=rs.filter(wasFound).length,open=rs.filter(r=>['assigned','searching'].includes(r.status)).length,nf=rs.filter(r=>r.status==='notfound').length;
  const sold=rs.filter(r=>SOLD.includes(r.status));
  const rev=sold.reduce((a,r)=>a+(+r.price||0),0),profit=sold.reduce((a,r)=>a+((+r.price||0)-(+r.cost||0)),0);
  const ft=rs.filter(r=>r.foundAt&&r.assignedAt).map(r=>(r.foundAt-r.assignedAt)/3600000);
  return{total:rs.length,found,open,nf,sold:sold.length,rev,profit,late:rs.filter(overdue).length,avg:ft.length?ft.reduce((a,b)=>a+b,0)/ft.length:null,rate:found+nf?Math.round(found/(found+nf)*100):null};
}
function supStats(from){
  const m={};
  S.reqs.filter(r=>(r.createdAt||0)>=from).forEach(r=>{const qs=r.quotes||[];const min=Math.min(...qs.map(x=>+x.cost||Infinity));
    qs.forEach(q=>{const k=(q.sup||'').trim().toLowerCase();if(!k)return;const s=m[k]||(m[k]={name:q.sup.trim(),ph:'',quotes:0,won:0,ret:0,cheap:0,eta:[]});
      s.quotes++;if(q.ph&&!s.ph)s.ph=q.ph;if(q.eta)s.eta.push(+q.eta);if(qs.length>1&&+q.cost===min)s.cheap++;
      if(r.chosenQ===q.id){s.won++;if(r.status==='returned')s.ret++}})});
  return Object.values(m).sort((a,b)=>b.won-a.won||b.quotes-a.quotes);
}

/* ===== views ===== */
function header(){
  const v=view();
  const sw=S.isAdmin?`<div class="seg">${[['admin','Роҳбар'],['worker','Коргар'],['customer','Муштарӣ']].map(([k,l])=>`<button data-act="view" data-v="${k}" class="${v===k?'on':''}">${l}</button>`).join('')}</div>`:'';
  const out=S.isAdmin||S.wid||S.cid?`<button class="iconbtn" data-act="logout" aria-label="Баромадан" title="Баромадан"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l5-5-5-5"/><path d="M15 12H4"/></svg></button>`:'';
  const setOn=S.isAdmin&&v==='admin'&&S.adminTab==='set';
  const gear=S.isAdmin?`<button class="iconbtn gear ${setOn?'on':''}" data-act="gotoset" aria-label="Танзимот" title="Танзимот">${IC(ICONS.set,18)}</button>`:'';
  const who=S.isAdmin?'Роҳбар':S.wid||S.cid?uname(S.wid||S.cid):'';
  const sub={admin:'Панели идора',worker:'Панели коргар',customer:'Дархостҳои ман',onboard:'Воридшавӣ'}[v]||'';
  return`<header><div class="wrap hrow">${logoHtml()}<div class="brand"><b>${esc(C.name)}</b><span>${esc(sub)}${who?' · '+esc(who):''}</span></div>${gear}${out}${sw}</div></header>`;
}
function searchBox(ph){return`<div class="search">${ICON_SEARCH}<input id="q" type="search" placeholder="${ph}" value="${esc(S.q)}" autocomplete="off"></div>`}
function pipe(items,cur,act){return`<div class="pipe-wrap"><div class="pipe">${items.map(([k,l,n,kk])=>`<button class="st ${cur===k?'on':''} ${kk||''}" data-act="${act}" data-v="${k}"><i></i>${esc(l)}<b>${n}</b></button>`).join('')}</div></div>`}
function cards(list,showWorker){
  if(list===null)return'';
  if(!list.length)return`<div class="empty"><b>${S.q?'Чизе ёфт нашуд':'Дархост нест'}</b><span class="small">${S.q?'Калимаи дигарро санҷед.':'Дархостҳои нав дар ҳамин ҷо пайдо мешаванд.'}</span></div>`;
  return`<div class="rqs">${list.map(r=>{const u=r.urgency||'d3';const bal=isAdminView()?balOf(r):0;const adm=isAdminView();return`${adm?'<div class="rqw">':''}<button class="rq ${kc(r.status)}" data-act="open" data-id="${r.id}">
    <span class="l1"><span class="tag">${esc(r.code)}</span><span class="urg ${u}">${URG[u]?URG[u].l:''}</span>${dueTxt(r)||`<span class="time">${ago(r.updatedAt||r.createdAt)}</span>`}</span>
    <span class="r1">${r.price&&isAdminView()?`<span class="price small">${money(r.price)}</span>`:''}${pill(r.status)}</span>
    <span class="t1">${esc(titleOf(r))}</span>
    <span class="t2"><span>${r.car&&r.car!=='—'?esc(r.car)+' '+esc(r.year||''):'<span class="muted">мошин номаълум</span>'}</span>${isAdminView()?`<span>${esc(custName(r))}</span>`:''}${(r.quotes||[]).length?`<span>${r.quotes.length} нарх</span>`:''}${(r.photos||[]).length?`<span>${r.photos.length} акс</span>`:''}${bal?`<span class="who none">қарз ${money(bal)}</span>`:''}${showWorker&&!SOLD.includes(r.status)?`<span class="who ${r.workerId?'':'none'}">Масъул: ${r.workerId?esc(uname(r.workerId)):'таъин нашуд'}</span>`:''}${showWorker&&SOLD.includes(r.status)?`<span class="who ${r.orderWorkerId?'':'none'}">Заказ: ${r.orderWorkerId?esc(uname(r.orderWorkerId))+' · '+esc(OST[r.ordStage]||OST.assigned):'масъул нест'}</span>`:''}</span>
  </button>${adm?`${S.confirmDel===r.id?`<div class="rqconf"><span>№${esc(r.code)}-ро тамоман нест кунам?</span><button class="btn bad" data-act="delreq" data-id="${r.id}">Ҳа, нест кун</button><button class="btn" data-act="delno">Не</button></div>`:`<button class="rqdel" data-act="delreq" data-id="${r.id}" aria-label="Нест кардан" title="Нест кардан">${IC('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>',17)}</button>`}</div>`:''}`}).join('')}</div>`;
}
const WD=['Якшанбе','Душанбе','Сешанбе','Чоршанбе','Панҷшанбе','Ҷумъа','Шанбе'],MO=['январ','феврал','март','апрел','май','июн','июл','август','сентябр','октябр','ноябр','декабр'];
const todayTxt=()=>{const d=new Date();return WD[d.getDay()]+', '+d.getDate()+' '+MO[d.getMonth()]};
const hello=()=>{const h=new Date().getHours();return h<12?'Субҳ ба хайр':h<18?'Рӯз ба хайр':'Шом ба хайр'};
const PER=[['today','Имрӯз'],['week','7 рӯз'],['month','Ин моҳ'],['all','Ҳама вақт']];
const perChips=()=>`<div class="bar">${PER.map(([k,l])=>`<button class="chip ${S.period===k?'on':''}" data-act="period" data-v="${k}" style="height:34px">${l}</button>`).join('')}</div>`;
function kpis(){
  const rs=S.reqs.filter(inPer),sold=rs.filter(r=>SOLD.includes(r.status));
  const rev=sold.reduce((a,r)=>a+(+r.price||0),0),profit=sold.reduce((a,r)=>a+((+r.price||0)-(+r.cost||0)),0);
  const debt=S.reqs.reduce((a,r)=>a+balOf(r),0),act=S.reqs.filter(r=>ACTIVE.includes(r.status)).length;
  const k=(v,ic,label,val,sub)=>`<button class="hk ${S.fStatus===v?'on':''}" data-act="kpi" data-v="${v}"><span class="hi">${IC(ICONS[ic],18)}</span><b>${val}</b><span class="hl">${label}</span>${sub?`<span class="hs">${sub}</span>`:''}</button>`;
  return`<section class="hero"><div class="hero-top"><div><div class="hello">${hello()}, ${esc(S.isAdmin?'роҳбар':'')}</div><div class="hdate">${todayTxt()}</div></div>
    <div class="hper">${PER.map(([key,l])=>`<button class="${S.period===key?'on':''}" data-act="period" data-v="${key}">${l}</button>`).join('')}</div></div>
    <div class="hkpis">${k('active','work','Дар кор',act,'ҳозир')}${k('foundall','found','Ёфт шуд',rs.filter(wasFound).length,'аз '+rs.length)}${k('sold','sold','Фурӯхта',sold.length,num(rev)+' '+esc(C.cur))}${k('profit','profit','Фоида',num(profit),esc(C.cur))}</div>
    ${debt?`<button class="hdebt" data-act="atab" data-v="debt"><span>Қарзи муштариён</span><b>${money(debt)}</b><span>→</span></button>`:''}</section>`;
}
function adminView(){
  const debtN=new Set(S.reqs.filter(r=>balOf(r)>0).map(r=>r.customerId||r.customerPhone||r.id)).size;
  if(S.adminTab==='debt'){S.adminTab='cust';S.custSeg='debt'}
  const T=[['req','Дархостҳо'],['cust','Муштариён'],['inv','Инвойсҳо'],['rep','Ҳисобот'],['users','Одамон'],['set','Танзимот']];
  const tabs=`<div class="tabs top-tabs">${T.map(([k,l])=>`<button class="${S.adminTab===k?'on':''}" data-act="atab" data-v="${k}">${l}${k==='cust'&&debtN?`<span class="badge">${debtN}</span>`:''}</button>`).join('')}</div>
    <nav class="bnav c6" aria-label="Менюи асосӣ">${T.filter(([k])=>k!=='set').map(([k,l],ix)=>(ix===2?`<button class="bplus" data-act="newreq" aria-label="Дархости нав"><span>+</span></button>`:'')+`<button class="${S.adminTab===k?'on':''}" data-act="atab" data-v="${k}">${IC(ICONS[k],22)}<span>${l}</span>${k==='cust'&&debtN?`<i class="bdot">${debtN}</i>`:''}</button>`).join('')}</nav>`;
  if(S.adminTab==='users')return tabs+usersView();
  if(S.adminTab==='set')return tabs+settingsView();
  if(S.adminTab==='rep')return tabs+reportView();
  if(S.adminTab==='cust')return tabs+custView();
  if(S.adminTab==='inv')return tabs+invListView();
  let base=S.reqs.filter(matchQ);
  if(S.fGroup!=='all')base=base.filter(r=>S.fGroup==='none'?!r.group:r.group===S.fGroup);
  if(S.fWorker==='none')base=base.filter(r=>!r.workerId);else if(S.fWorker!=='all')base=base.filter(r=>r.workerId===S.fWorker);
  const c=s=>base.filter(r=>r.status===s).length;
  const fa=base.filter(r=>wasFound(r)&&inPer(r)),sd=base.filter(r=>SOLD.includes(r.status)&&inPer(r));
  const items=[['active','Ҳама фаъол',base.filter(r=>ACTIVE.includes(r.status)).length],['late','Мӯҳлат гузашт',base.filter(overdue).length,'k-x'],...ACTIVE.map(s=>[s,ST[s].l,c(s),kc(s)]),['foundall','Ёфтшудаҳо',fa.length,'k-g'],['sold','Фурӯхташуда',sd.length,'k-g'],['done','Анҷомёфта',base.filter(r=>!ACTIVE.includes(r.status)).length],['all','Ҳама',base.length]];
  const ordNo=base.filter(r=>r.status==='ordered'&&!r.orderWorkerId);
  const list=S.fStatus==='ordnow'?ordNo:S.fStatus==='foundall'?fa:S.fStatus==='sold'?sd:S.fStatus==='all'?base:S.fStatus==='late'?base.filter(overdue):S.fStatus==='active'?base.filter(r=>ACTIVE.includes(r.status)):S.fStatus==='done'?base.filter(r=>!ACTIVE.includes(r.status)):base.filter(r=>r.status===S.fStatus);
  const nO=S.reqs.filter(r=>r.status==='ordered'&&!r.orderWorkerId).length,nNew=S.reqs.filter(r=>r.status==='new').length,nF=S.reqs.filter(r=>r.status==='found').length,nL=S.reqs.filter(overdue).length;
  const al=[nO?[nO+' заказ масъул надорад','ordnow']:null,nL?[nL+' дархост мӯҳлаташ гузашт','late']:null,nNew?[nNew+' дархости нав супоридан лозим','new']:null,nF?[nF+' дархост нарх лозим','found']:null].filter(Boolean);
  const alert=al.length?`<button class="alert" data-act="fs" data-v="${al[0][1]}">${al.map(a=>a[0]).join(' · ')}<span class="arr">→</span></button>`:'';
  const tool=`<div class="tool">${searchBox('Ҷустуҷӯ: рақам, мошин, қисм, муштарӣ, паставшик')}<select id="fg" data-act="fgsel" class="chip" style="width:auto">${[['all','Ҳама гурӯҳҳо'],['new','Нав'],['used','Кӯҳна'],['none','Бе гурӯҳ']].map(([k,l])=>`<option value="${k}" ${S.fGroup===k?'selected':''}>${l}</option>`).join('')}</select><button class="btn pri desk" data-act="newreq">+ Дархости нав</button></div>`;
  const wsel=S.fWorker!=='all'&&S.fWorker!=='none'&&S.users[S.fWorker]?`<div class="wselw" data-act="fw" data-v="all" role="button" title="Пӯшидан">${wCard(S.fWorker,S.users[S.fWorker],0,false)}<span class="wsel-x" aria-hidden="true">✕</span></div>`:'';
  const w=workers(),none=S.reqs.filter(r=>ACTIVE.includes(r.status)&&!r.workerId).length;
  const wOpts=[['all','Ҳамаи коргарон'],...w.map(([id,u])=>[id,u.name+' · '+loadOf(id)+' дар кор']),['none','Бе масъул'+(none?' · '+none:'')]];
  const chips=items.filter(([k,,n])=>n>0||k===S.fStatus||k==='active'||k==='all');
  const curChip=(items.find(x=>x[0]===S.fStatus)||[,'Ҳама'])[1];
  const fsum=[curChip,S.fWorker!=='all'?(S.fWorker==='none'?'Бе масъул':uname(S.fWorker)):'',S.fGroup!=='all'?(GOPTS().find(x=>x[0]===S.fGroup)||[,''])[1]:'',S.q?'«'+S.q+'»':''].filter(Boolean).join(' · ');
  const rpOpen=S.rpOpen??false;
  const panel=`<details class="card rpanel" id="rp" ${rpOpen||S.q?'open':''}><summary class="rp-h"><span class="rp-ht"><h3>Дархостҳо · ${list.length}</h3><small>${esc(fsum)}</small></span><span class="rp-tg">Филтр</span></summary><div class="rp-body">
    ${searchBox('Ҷустуҷӯ: рақам, код, мошин, муштарӣ')}
    <div class="rp-f">${pickBtn('Масъул',S.fWorker==='all'?'Ҳамаи коргарон':S.fWorker==='none'?'Бе масъул':uname(S.fWorker),'worker',S.fWorker!=='all')}${pickBtn('Гурӯҳ',GOPTS().find(x=>x[0]===S.fGroup)?.[1]||'Ҳама гурӯҳҳо','group',S.fGroup!=='all')}</div>
    <div class="rp-chips">${chips.map(([k,l,n,kk])=>`<button class="st ${S.fStatus===k?'on':''} ${kk||''}" data-act="fs" data-v="${k}"><i></i>${esc(l)}<b>${n}</b></button>`).join('')}</div>
    ${w.length?'':'<div class="note">Коргар нест. Дар қисми <b>Одамон</b> коргаронро бо логин ва парол илова кунед.</div>'}</div></details>`;
  return tabs+kpis()+alert+wsel+(S.newReq?newReqForm(true):'')+panel+`<div id="list-anchor"></div>`+cards(list,true)+`<button class="fab" data-act="newreq" aria-label="Дархости нав">+</button>`;
}
const GOPTS=()=>[['all','Ҳама гурӯҳҳо'],['new',C.g1||'Нав'],['used',C.g2||'Кӯҳна'],['none','Бе гурӯҳ']];
function pickBtn(lbl,cur,k,on){return`<button class="pickb ${on?'on':''}" data-act="pick" data-v="${k}"><small>${lbl}</small><span>${esc(cur)}</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>`}
function pickerView(){
  if(!S.pick||view()!=='admin')return'';
  let title,rows;
  if(S.pick==='worker'){
    const w=workers(),none=S.reqs.filter(r=>ACTIVE.includes(r.status)&&!r.workerId).length,all=S.reqs.filter(r=>ACTIVE.includes(r.status)).length;
    title='Масъул';
    rows=[['all','Ҳамаи коргарон','Ҳама дархостҳо',all,'∗'],...w.map(([id,u])=>[id,u.name,GRPS[u.group]||'',loadOf(id),initials(u.name)]),['none','Бе масъул','Ба касе супорида нашуд',none,'?']]
      .map(([k,l,sub,n,av])=>`<button class="pk-row ${S.fWorker===k?'on':''}" data-act="pickv" data-k="fWorker" data-v="${k}"><span class="av ${k==='none'&&n?'warn':''}">${esc(av)}</span><span class="pk-t"><b>${esc(l)}</b><small>${esc(sub)}</small></span><span class="pk-n ${n?'':'z'}">${n}<small>дар кор</small></span><span class="pk-c">${S.fWorker===k?'✓':''}</span></button>`).join('');
  }else{
    title='Гурӯҳ';
    rows=GOPTS().map(([k,l])=>{const n=S.reqs.filter(r=>ACTIVE.includes(r.status)&&(k==='all'||(k==='none'?!r.group:r.group===k))).length;return`<button class="pk-row ${S.fGroup===k?'on':''}" data-act="pickv" data-k="fGroup" data-v="${k}"><span class="av">${k==='all'?'∗':k==='none'?'–':esc(l[0])}</span><span class="pk-t"><b>${esc(l)}</b></span><span class="pk-n ${n?'':'z'}">${n}<small>фаъол</small></span><span class="pk-c">${S.fGroup===k?'✓':''}</span></button>`}).join('');
  }
  return`<div class="pk-bg" data-act="pickclose"></div><div class="pk" role="dialog" aria-label="${title}"><div class="grab"></div><div class="pk-h"><h3>${title}</h3><button class="iconbtn" data-act="pickclose" aria-label="Пӯшидан">✕</button></div><div class="pk-list">${rows}</div></div>`;
}
function crew(){
  const w=workers();
  if(!w.length)return`<div class="note">Коргар нест. Дар қисми <b>Одамон</b> коргаронро бо логин ва парол илова кунед.</div>`;
  const none=S.reqs.filter(r=>ACTIVE.includes(r.status)&&!r.workerId).length;
  return`<div><div class="bar" style="justify-content:space-between;margin-bottom:8px"><h3>Коргарон · кӣ чӣ қадар кор дорад</h3>${S.fWorker!=='all'?'<button class="link" data-act="fw" data-v="all">Ҳамаро нишон деҳ</button>':''}</div>
    <div class="pipe-wrap"><div class="pipe">${w.map(([id,u])=>crewBtn(id,u,S.fWorker===id,'fw')).join('')}<button class="crew ${S.fWorker==='none'?'on':''} ${none?'warn':''}" data-act="fw" data-v="none"><span class="av">?</span><span><b>Бе масъул</b><small>${none} дархост</small></span></button></div></div></div>`;
}
function wCard(id,u,from,clickable){
  const s=wStats(id,from),t=Math.max(1,s.found+s.open+s.nf),rate=s.rate;
  const rc=rate===null?'var(--line)':rate>=70?'var(--ok)':rate>=40?'var(--warn)':'var(--bad)';
  const C2=2*Math.PI*22,dash=rate===null?0:C2*rate/100;
  const open=clickable?`<button class="wc wstat" data-act="wopen" data-v="${id}">`:`<div class="wc wstat">`;
  const tile=(n,l,c)=>`<div class="wt" style="--c:${c}"><b>${n}</b><span>${l}</span></div>`;
  return`${open}<div class="wh2"><span class="av2" style="--rc:${rc}">${esc(initials(u.name))}</span>
      <div class="wh2-t"><b>${esc(u.name)}</b><div class="wtags"><span>${esc(GRPS[u.group]||'—')}</span><span>${s.total} дархост</span>${s.avg!=null?`<span>⏱ ${hrs(s.avg)}</span>`:''}</div></div>
      <div class="ring"><svg viewBox="0 0 52 52" width="56" height="56"><circle cx="26" cy="26" r="22" fill="none" stroke="var(--line)" stroke-width="5"/><circle cx="26" cy="26" r="22" fill="none" stroke="${rc}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${dash} ${C2}" transform="rotate(-90 26 26)"/></svg><span><b>${rate===null?'—':rate+'%'}</b><small>ёфтан</small></span></div></div>
    <div class="wtiles">${tile(s.found,'Ёфт кард','var(--ok)')}${tile(s.open,'Дар кор','var(--warn)')}${tile(s.nf,'Ёфт нашуд','var(--bad)')}${tile(s.late,'Мӯҳлат гузашт',s.late?'var(--bad)':'var(--muted)')}</div>
    <div class="wbar2"><i style="width:${s.found/t*100}%;background:var(--ok)"></i><i style="width:${s.open/t*100}%;background:var(--warn)"></i><i style="width:${s.nf/t*100}%;background:var(--bad)"></i></div>
    <div class="wm2"><div><span>Фурӯхта · ${s.sold}</span><b>${num(s.rev)} <small>${esc(C.cur)}</small></b></div><div class="p"><span>Фоида</span><b>${num(s.profit)} <small>${esc(C.cur)}</small></b></div></div>${clickable?'</button>':'</div>'}`;
}
function comBox(wid){
  const l=S.reqs.filter(r=>hasCom(r)&&comWorker(r)===wid),pend=S.reqs.filter(r=>comElig(r)&&!hasCom(r)&&comWorker(r)===wid);
  if(!l.length&&!pend.length)return'';
  const sum=x=>x.reduce((a,r)=>a+(+r.com||0),0),due=l.filter(r=>!r.comPaid);
  return`<div class="card combox"><div class="bal"><div><span>Музд ҳисоб шуд</span><b>${money(sum(l))}</b></div><div class="ok-b"><span>Пардохт шуд</span><b>${money(sum(l.filter(r=>r.comPaid)))}</b></div><div class="${sum(due)?'due-b':''}"><span>Бояд диҳед</span><b>${money(sum(due))}</b></div></div>
    ${pend.length?`<div class="bar"><span class="small warn-note">${pend.length} заказ — музд муайян нашуд:</span>${pend.slice(0,6).map(r=>`<button class="chip" data-act="open" data-id="${r.id}" style="height:30px">${esc(r.code)}</button>`).join('')}</div>`:''}
    ${due.length?`<div class="bar"><button class="btn ok" data-act="payall" data-v="${wid}">${S.confirmPay===wid?'Ҳа, '+money(sum(due))+' пардохт шуд':'Ҳамаашро пардохт кардам ('+due.length+')'}</button></div>`:''}</div>`;
}
function reportView(){
  const from=periodStart();
  const top=`<div class="tabs" style="border:0">${[['o','Умумӣ'],['a','Воридшавӣ'],['w','Коргарон'],['s','Паставшикҳо']].map(([k,l])=>`<button class="${S.repTab===k?'on':''}" data-act="rtab" data-v="${k}">${l}</button>`).join('')}</div>`+perChips();
  if(S.repTab==='a'){
    const isOn=p=>p&&p.online&&Date.now()-(p.lastSeen||0)<3*60000;
    const pres=Object.values(S.pres||{}).sort((a,b)=>(b.lastSeen||0)-(a.lastSeen||0));
    const on=pres.filter(isOn);
    const rf=S.actRole||'all';
    const rows=(S.acts||[]).filter(a=>a.t>=from&&(rf==='all'||a.role===rf));
    const roleChips=`<div class="bar">${[['all','Ҳама'],['worker','Коргарон'],['admin','Роҳбарон'],['customer','Муштариён']].map(([k,l])=>`<button class="chip ${rf===k?'on':''}" data-act="actrole" data-v="${k}" style="height:32px">${l}</button>`).join('')}</div>`;
    return top+`<div class="card"><h3>Ҳозир дар барнома · ${on.length}</h3>${on.length?`<div class="bar">${on.map(p=>`<span class="online"><i></i>${esc(p.name||'—')} <small>${esc(ROLE_L[p.role]||'')}</small></span>`).join('')}</div>`:'<div class="small muted">Ҳоло касе дар барнома нест.</div>'}
      <div class="small muted">Охирин бор дида шуд: ${pres.filter(p=>!isOn(p)).slice(0,6).map(p=>esc(p.name||'—')+' — '+ago(p.lastSeen)).join(' · ')||'—'}</div></div>
      ${roleChips}<div class="card"><h3>Таърих · ${rows.length}</h3>${rows.length?`<div class="tbl-wrap"><table class="tbl act"><thead><tr><th>Сана</th><th>Вақт</th><th>Ном</th><th>Нақш</th><th>Амал</th><th>Дастгоҳ</th></tr></thead><tbody>${rows.map(a=>{const d=new Date(a.t);return`<tr><td>${p2(d.getDate())+'.'+p2(d.getMonth()+1)}</td><td>${p2(d.getHours())+':'+p2(d.getMinutes())}</td><td>${esc(a.name||'—')}</td><td>${esc(ROLE_L[a.role]||'')}</td><td><span class="ev ev-${a.type}">${esc(ACT_L[a.type]||a.type)}</span></td><td>${esc(a.dev||'')}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="small muted">Дар ин давра маълумот нест.</div>'}
      <div class="small muted">«Ворид шуд/Баромад» — бо логин ва тугмаи баромадан. «Кушод/Пӯшид» — вақте барнома ё сайт кушода ё пӯшида мешавад.</div></div>`;
  }
  if(S.repTab==='o'){
    const rs=S.reqs.filter(r=>(r.createdAt||0)>=from),n=rs.length;
    if(!n)return top+`<div class="empty"><b>Дар ин давра дархост нест</b><span class="small">Давраи дигарро интихоб кунед.</span></div>`;
    const sold=rs.filter(r=>SOLD.includes(r.status));
    const rev=sold.reduce((a,r)=>a+(+r.price||0),0),cost=sold.reduce((a,r)=>a+(+r.cost||0),0),profit=rev-cost,coms=sold.reduce((a,r)=>a+(hasCom(r)?+r.com||0:0),0),net=profit-coms,debt=S.reqs.reduce((a,r)=>a+balOf(r),0);
    const fun=[['Ҳамаи дархостҳо',n,'var(--info)'],['Ёфт шуд',rs.filter(wasFound).length,'var(--ok)'],['Нарх ба муштарӣ рафт',rs.filter(wasOffered).length,'var(--violet)'],['Фурӯхта шуд',sold.length,'var(--ok)']];
    const lost=[['Дар кор',rs.filter(r=>ACTIVE.includes(r.status)&&!SOLD.includes(r.status)).length],['Ёфт нашуд',rs.filter(r=>r.status==='notfound').length],['Муштарӣ рад/бекор кард',rs.filter(r=>r.status==='cancelled').length],['Баргашт',rs.filter(r=>r.status==='returned').length]];
    const days={};rs.forEach(r=>{const d=new Date(r.createdAt);const k=d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());const x=days[k]||(days[k]={t:r.createdAt,n:0,f:0,s:0,p:0});x.n++;if(wasFound(r))x.f++;if(SOLD.includes(r.status)){x.s++;x.p+=(+r.price||0)-(+r.cost||0)}});
    const dl=Object.entries(days).sort((a,b)=>b[0]<a[0]?-1:1).slice(0,60);
    return top+`<div class="card"><h3>Аз дархост то фурӯш</h3><div class="fun">${fun.map(([l,v,c])=>`<div class="frow"><span>${l}</span><span class="fbar"><i style="width:${v/n*100}%;background:${c}"></i></span><b>${v}</b><small>${Math.round(v/n*100)}%</small></div>`).join('')}</div>
      <div class="wnums">${lost.map(([l,v],i)=>`<div class="${i?'x':'o'}"><b>${v}</b><span>${l}</span></div>`).join('')}</div></div>
      <div class="card"><h3>Пул</h3><div class="bal"><div><span>Фурӯш</span><b>${money(rev)}</b></div><div><span>Харид</span><b>${money(cost)}</b></div><div><span>Фоида</span><b>${money(profit)}</b></div><div><span>Музди коргарон</span><b>${money(coms)}</b></div><div class="ok-b"><span>Фоидаи соф</span><b>${money(net)}</b></div><div><span>Фоизи фоида</span><b>${rev?Math.round(net/rev*100)+'%':'—'}</b></div><div class="${debt?'due-b':''}"><span>Қарз (ҳама вақт)</span><b>${money(debt)}</b></div></div></div>
      <div class="card"><h3>Таърих аз рӯи рӯз</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Сана</th><th>Дархост</th><th>Ёфт шуд</th><th>Фурӯхта</th><th>Фоида</th></tr></thead><tbody>${dl.map(([,x])=>`<tr><td>${fdate(x.t)}</td><td>${x.n}</td><td>${x.f}</td><td>${x.s}</td><td>${x.p?num(x.p):'—'}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  if(S.repTab==='s'){
    const ss=supStats(from);
    if(!ss.length)return top+`<div class="empty"><b>Ҳоло маълумот нест</b><span class="small">Вақте коргарон нархи паставшикҳоро ворид кунанд, ҳисобот дар ин ҷо пайдо мешавад.</span></div>`;
    return top+`<div class="small muted">Тартиб аз рӯи шумораи интихобшуда.</div><div class="wgrid-out">${ss.map(s=>`<div class="wstat"><div class="wh"><span class="av">${esc(initials(s.name))}</span><div><b>${esc(s.name)}</b><small>${esc(s.ph||'бе телефон')}</small></div><span class="rate">${s.quotes?Math.round(s.won/s.quotes*100):0}%<small>интихоб</small></span></div>
      <div class="wnums"><div><b>${s.quotes}</b><span>Нарх дод</span></div><div class="f"><b>${s.won}</b><span>Интихоб шуд</span></div><div class="f"><b>${s.cheap}</b><span>Арзонтарин</span></div><div class="${s.ret?'x':''}"><b>${s.ret}</b><span>Баргашт</span></div></div>
      <div class="wmoney"><div><span>Миёнаи расонидан</span><b>${s.eta.length?(Math.round(s.eta.reduce((a,b)=>a+b,0)/s.eta.length*10)/10)+' рӯз':'—'}</b></div>${s.ph?`<div><span>Тамос</span><b><a class="link" href="${waLink(s.ph)}" target="_blank" rel="noopener">WhatsApp</a></b></div>`:''}</div></div>`).join('')}</div>`;
  }
  const ws=workers();
  if(!ws.length)return top+`<div class="note">Коргар нест. Дар қисми «Одамон» илова кунед.</div>`;
  const sorted=ws.slice().sort((a,b)=>wStats(b[0],from).profit-wStats(a[0],from).profit);
  return top+`<div class="small muted">Тартиб аз рӯи фоида. Ба коргар пахш кунед, то ҳамаи дархостҳояшро бинед.</div><div class="wgrid-out">${sorted.map(([id,u])=>wCard(id,u,from,true)+comBox(id)).join('')}</div>`;
}
const ckey=r=>r.customerId||('p:'+digits(custPhone(r)||'')||r.id);
function custGroups(){
  const g={};
  Object.entries(S.customers||{}).forEach(([id,c])=>{g[id]={id,name:c.name||'—',phone:c.phone||'',since:c.createdAt||0,rs:[]}});
  S.reqs.forEach(r=>{const k=ckey(r);const x=g[k]||(g[k]={id:k,name:custName(r)||'—',phone:custPhone(r)||'',since:r.createdAt||0,rs:[]});x.rs.push(r)});
  return Object.values(g).map(x=>{const sold=x.rs.filter(r=>SOLD.includes(r.status));return{...x,n:x.rs.length,sold:sold.length,sum:sold.reduce((a,r)=>a+(+r.price||0),0),debt:x.rs.reduce((a,r)=>a+balOf(r),0),last:Math.max(x.since||0,...x.rs.map(r=>r.updatedAt||r.createdAt||0))}});
}
function custView(){
  const seg=S.custSeg||'all';
  const segs=`<div class="seg mode" style="margin-bottom:2px"><button class="${seg==='all'?'on':''}" data-act="custseg" data-v="all">Ҳамаи муштариён</button><button class="${seg==='debt'?'on':''}" data-act="custseg" data-v="debt">Қарздорон</button></div>`;
  if(seg==='debt')return segs+debtView();
  const q=(S.cq2||'').toLowerCase().trim();
  let l=custGroups().filter(c=>!q||(c.name+' '+c.phone).toLowerCase().includes(q)).sort((a,b)=>b.last-a.last);
  const tot=custGroups();
  const head=`<section class="hero"><div class="hero-top"><div><div class="hello">Муштариён</div><div class="hdate">${tot.length} нафар</div></div></div>
    <div class="hkpis"><div class="hk"><b>${tot.length}</b><span class="hl">Ҳама</span></div><div class="hk"><b>${tot.filter(c=>c.sold).length}</b><span class="hl">Харидор</span></div><div class="hk"><b>${num(tot.reduce((a,c)=>a+c.sum,0))}</b><span class="hl">Фурӯш</span></div><div class="hk"><b style="color:${tot.some(c=>c.debt)?'var(--bad)':'inherit'}">${num(tot.reduce((a,c)=>a+c.debt,0))}</b><span class="hl">Қарз</span></div></div></section>`;
  const search=`<label class="search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="cq2" data-cq2 placeholder="Ҷустуҷӯ: ном ё телефон" value="${esc(S.cq2||'')}"></label>`;
  if(!l.length)return segs+head+search+`<div class="empty"><b>Муштарӣ ёфт нашуд</b></div>`;
  return segs+head+search+`<div class="clist">${l.map(c=>{const op=S.custOpen===c.id;return`<div class="cc ${op?'open':''}"><button class="cc-h" data-act="custopen" data-v="${esc(c.id)}"><span class="av">${esc(initials(c.name))}</span><span class="cc-t"><b>${esc(c.name)}</b><small>${esc(c.phone||'—')} · ${c.n} дархост${c.sold?' · '+c.sold+' харид':''}</small></span><span class="cc-r">${c.debt?`<b class="dbt">${num(c.debt)}</b><small>қарз</small>`:c.sum?`<b>${num(c.sum)}</b><small>${esc(C.cur)}</small>`:`<small>${ago(c.last)}</small>`}</span></button>
    ${op?`<div class="cc-b"><div class="bal"><div><span>Дархост</span><b>${c.n}</b></div><div><span>Харид</span><b>${money(c.sum)}</b></div><div class="${c.debt?'due-b':'ok-b'}"><span>Қарз</span><b>${money(c.debt)}</b></div></div>
      <div class="bar">${c.phone?`<a class="btn" href="${waLink(c.phone,'Ассалому алайкум, '+c.name+'!')}" target="_blank" rel="noopener">WhatsApp</a>`:''}</div>
      <div class="mini">${c.rs.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).map(r=>`<button class="mrow" data-act="open" data-id="${r.id}"><span class="tag">${esc(r.code)}</span><span class="mt">${esc(titleOf(r))}</span>${r.price?`<span class="mp">${num(r.price)}</span>`:''}${pill(r.status)}</button>`).join('')||'<div class="small muted">Дархост нест.</div>'}</div></div>`:''}</div>`}).join('')}</div>`;
}
function invListView(){
  const f=S.invF||'all',q=(S.iq||'').toLowerCase().trim();
  const all=S.reqs.filter(r=>SOLD.includes(r.status)).map(r=>({r,t:r.orderedAt||r.offeredAt||r.createdAt||0,paid:paidOf(r),bal:balOf(r)})).sort((a,b)=>b.t-a.t);
  const m0=new Date();m0.setDate(1);m0.setHours(0,0,0,0);
  let l=all.filter(x=>f==='all'||(f==='debt'?x.bal>0:f==='paid'?x.bal<=0:x.t>=m0.getTime()));
  if(q)l=l.filter(({r})=>(r.code+' '+custName(r)+' '+(custPhone(r)||'')+' '+(r.parts||'')).toLowerCase().includes(q));
  const sum=k=>l.reduce((a,x)=>a+(k==='p'?+x.r.price||0:k==='paid'?x.paid:x.bal),0);
  const chips=[['all','Ҳама',all.length],['month','Ин моҳ',all.filter(x=>x.t>=m0.getTime()).length],['debt','Қарз',all.filter(x=>x.bal>0).length],['paid','Пардохт шуд',all.filter(x=>x.bal<=0).length]];
  return`<section class="hero"><div class="hero-top"><div><div class="hello">Инвойсҳо</div><div class="hdate">${l.length} инвойс</div></div></div>
    <div class="hkpis c3"><div class="hk"><b>${num(sum('p'))}</b><span class="hl">Ҷамъ, ${esc(C.cur)}</span></div><div class="hk"><b style="color:var(--ok)">${num(sum('paid'))}</b><span class="hl">Пардохт шуд</span></div><div class="hk"><b style="color:${sum('b')?'var(--bad)':'inherit'}">${num(sum('b'))}</b><span class="hl">Боқимонда</span></div></div></section>
    <label class="search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="iq" data-iq placeholder="Ҷустуҷӯ: рақам, муштарӣ, қисм" value="${esc(S.iq||'')}"></label>
    <div class="rp-chips">${chips.map(([k,lb,n])=>`<button class="st ${f===k?'on':''}" data-act="invf" data-v="${k}"><i></i>${lb}<b>${n}</b></button>`).join('')}</div>
    ${l.length?`<div class="ilist">${l.map(({r,t,paid,bal})=>`<button class="ir" data-act="inv" data-id="${r.id}"><span class="ir-ic">${IC(ICONS.inv,20)}</span><span class="ir-t"><b>INV-${esc(r.code)}</b><small>${fdate(t)} · ${esc(custName(r)||'—')}</small><small class="ir-p">${esc(titleOf(r))}</small></span><span class="ir-r"><b>${num(r.price)}</b><span class="ev ${bal<=0?'ev-login':paid>0?'ev-open':'ev-logout'}">${bal<=0?'пардохт шуд':paid>0?'қисман':'қарз '+num(bal)}</span></span></button>`).join('')}</div>`:'<div class="empty"><b>Инвойс нест</b><span class="small">Вақте муштарӣ заказ медиҳад, инвойс дар ин ҷо пайдо мешавад.</span></div>'}`;
}
function debtView(){
  const rs=S.reqs.filter(r=>balOf(r)>0);
  if(!rs.length)return`<div class="empty"><b>Қарз нест</b><span class="small">Ҳамаи заказҳо пурра пардохт шудаанд.</span></div>`;
  const g={};rs.forEach(r=>{const k=r.customerId||digits(r.customerPhone)||r.id;(g[k]=g[k]||[]).push(r)});
  const groups=Object.values(g).map(l=>({l,sum:l.reduce((a,r)=>a+balOf(r),0)})).sort((a,b)=>b.sum-a.sum);
  const total=groups.reduce((a,x)=>a+x.sum,0);
  return`<div class="kpi"><span>Ҳамагӣ қарзи муштариён · ${groups.length} нафар</span><b style="color:var(--bad)">${money(total)}</b></div>`+groups.map(({l,sum})=>{const r0=l[0],ph=custPhone(r0);
    const msg=`Ассалому алайкум, ${custName(r0)}! Аз заказҳо боқимонда: ${money(sum)}.\n${l.map(r=>'№'+r.code+' — '+money(balOf(r))).join('\n')}\n${C.name}`;
    return`<div class="card dgroup"><div class="dhead"><span class="av">${esc(initials(custName(r0)))}</span><div><b>${esc(custName(r0))}</b><div class="small muted">${esc(ph||'бе телефон')}</div></div><b class="price">${money(sum)}</b></div>
      ${l.map(r=>`<button class="rq ${kc(r.status)}" data-act="open" data-id="${r.id}" style="box-shadow:none"><span class="l1"><span class="tag">${esc(r.code)}</span><span class="time">${fdate(r.createdAt)}</span></span><span class="r1"><span class="price small" style="color:var(--bad)">${money(balOf(r))}</span></span><span class="t1">${esc(titleOf(r))}</span><span class="t2"><span>Ҷамъ ${money(r.price)}</span><span>Пардохт ${money(paidOf(r))}</span></span></button>`).join('')}
      ${ph?`<div><a class="btn" href="${waLink(ph,msg)}" target="_blank" rel="noopener">Ёдрас дар WhatsApp</a></div>`:''}</div>`}).join('');
}
function settingsView(){
  const inp=(id,label,v,extra)=>`<label>${label}<input id="s-${id}" value="${esc(v??'')}" ${extra||''}></label>`;
  const u0=auth.currentUser,hasPw=S.hasPw||!!(u0&&u0.providerData.some(p=>p.providerId==='password'));
  const pwCard=u0&&u0.email&&!u0.email.endsWith('@'+WORKER_DOMAIN)?`<form class="card" id="f-apw"><h3>Парол барои барнома (APK)</h3><div class="small muted">Дар барномаи Android «Ворид бо Google» кор намекунад. Дар ин ҷо парол созед ва дар барнома бо <b>${esc(u0.email)}</b> ва ҳамин парол ворид шавед.${hasPw?' <b style="color:var(--ok)">Парол аллакай ҳаст</b> — метавонед иваз кунед.':''}</div><div class="grid"><label>Пароли нав<input id="ap-1" type="password" autocomplete="new-password" minlength="6" required></label><label>Боз як бор<input id="ap-2" type="password" autocomplete="new-password" minlength="6" required></label></div><div><button class="btn pri" type="submit">${hasPw?'Паролро иваз кардан':'Парол сохтан'}</button></div></form>`:'';
  return pwCard+`<div class="card"><h3>Нусхаи эҳтиётӣ</h3><div class="small muted">Ҳамаи дархостҳо, нархҳо, муштариён, коргарон ва танзимотро ҳамчун як файл (JSON) ба телефон ё компютер нигоҳ доред. Ҳар моҳ як бор кардан беҳтар аст. Аксҳо дар файл нестанд.</div><div><button class="btn pri" data-act="backup">⬇ Нусхаи эҳтиётӣ гирифтан</button></div>${S.lastBackup?`<div class="small" style="color:var(--ok)">✓ Охирин: ${fmt(S.lastBackup)}</div>`:''}</div>
  <form class="card" id="f-set"><h2>Ширкат</h2>
    <div class="logo-edit">${logoHtml()}<div class="bar"><label class="upl">${IC('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',16)}${C.logo?'Логотипро иваз кардан':'Логотип гузоштан'}<input type="file" id="s-logo" accept="image/png,image/jpeg,image/webp"></label>${C.logo?'<button type="button" class="btn bad" data-act="logodel">Нест кардан</button>':''}</div>
    <div class="small muted">Расми мураббаъ беҳтар аст (PNG ё JPG). Логотип дар сарлавҳа ва саҳифаи воридшавӣ дида мешавад.</div></div>
    <div class="grid">
    ${inp('name','Номи ширкат',C.name,'required maxlength="40"')}${inp('tagline','Суроға ё шиор',C.tagline,'maxlength="60"')}${inp('phone','WhatsApp-и ширкат',C.phone,'inputmode="tel"')}</div>
    <h2>Соҳа</h2><div class="small muted">Соҳаро интихоб кунед — номи майдонҳои дархост худкор иваз мешаванд. Баъд метавонед ҳар номро дастӣ ислоҳ кунед.</div>
    <div class="grid"><label>Соҳа<select id="s-industry" data-act="industry">${Object.entries(PRESETS).map(([k,p])=>`<option value="${k}" ${C.industry===k?'selected':''}>${esc(p.label)}</option>`).join('')}</select></label></div>
    <div class="grid">${inp('f1','Майдони 1 (объект)',C.f1)}${inp('f1s','Майдони 1 — номи кӯтоҳ',C.f1s)}${inp('f1ph','Майдони 1 — намуна',C.f1ph)}
      ${inp('f2','Майдони 2',C.f2)}${inp('f2ph','Майдони 2 — намуна',C.f2ph)}
      ${inp('f3','Майдони 3 (рақам/код)',C.f3)}${inp('f3ph','Майдони 3 — намуна',C.f3ph)}${inp('f3len','Майдони 3 — шумораи рамз (0 = ҳар гуна)',C.f3len,'type="number" min="0" max="40"')}
      ${inp('itemPh','Намунаи қисм/мол',C.itemPh)}${inp('refHint','Маслиҳат дар зери форма',C.refHint)}</div>
    <label class="chk"><input type="checkbox" id="s-needRef" ${C.needRef?'checked':''}>Аз муштарӣ майдони 3 ё акс ҳатман талаб карда шавад</label>
    <h2>Гурӯҳҳо ва намуди мол</h2><div class="grid">${inp('g1','Гурӯҳи 1',C.g1,'required')}${inp('g2','Гурӯҳи 2',C.g2,'required')}</div>
    <h2>Асъор</h2><div class="grid">${inp('cur','Асъори асосӣ',C.cur,'required maxlength="6"')}${inp('cur2','Асъори дуюм (холӣ = нест)',C.cur2,'maxlength="6"')}${inp('rate2','Курси асъори дуюм барои 1 асъори асосӣ',C.rate2,'type="number" step="0.0001" min="0"')}${inp('vat','VAT (%) — ба нархи паставшик илова мешавад',C.vat??5,'type="number" min="0" max="30" step="0.5"')}</div>
    <div class="bar"><button class="btn pri" type="submit" ${S.busy?'disabled':''}>Танзимотро сабт кардан</button></div></form>
    <div class="note">Ин сайтро ширкатҳои дигар ҳам метавонанд истифода баранд: ҳар кас нусхаи худро бо Firebase-и худ мегирад ва дар ҳамин саҳифа ному соҳаи худро мегузорад.</div>`;
}
function usersView(){
  const ws=Object.entries(S.workers).filter(([,w])=>w.active!==false).sort((a,b)=>(a[1].createdAt||0)-(b[1].createdAt||0));
  const cs=Object.entries(S.customers).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
  const add=`<form class="card" id="f-addw"><h2>Илова кардани коргар</h2><div class="grid"><label>Ном<input id="aw-name" required placeholder="Салмон"></label><label>Телефон<input id="aw-phone" inputmode="tel"></label><label>Гурӯҳ<select id="aw-group"><option value="all">Ҳарду гурӯҳ</option><option value="new">Запчастҳои нав</option><option value="used">Запчастҳои кӯҳна</option></select></label>
    <label>Логин (лотинӣ)<input id="aw-login" required autocapitalize="none" spellcheck="false" placeholder="salmon"></label><label>Парол (камаш 6 рамз)<input id="aw-pass" required minlength="6" autocomplete="new-password"></label></div><div><button class="btn pri" type="submit" ${S.busy?'disabled':''}>Илова кардан</button></div></form>`;
  const wrow=([id,u])=>`<div class="urow"><div class="av">${esc(initials(u.name))}</div><div class="main"><div style="font-weight:600">${esc(u.name)}</div><div class="small muted">${esc([u.phone,loadOf(id)+' дархост дар кор'].filter(Boolean).join(' · '))}</div>
    <div class="cred">${u.login?`<span class="ok-dot"></span>Логин: <b style="font-family:var(--mono)">${esc(u.login)}</b>`:'<span class="who none">Логин нест</span>'}<span class="spacer"></span><button class="link" data-act="cred" data-v="${id}">Логин/пароли нав</button></div>
    ${S.credFor===id?`<form class="cform" id="f-cred" data-id="${id}"><div class="grid"><label>Логини нав<input id="c-login" autocapitalize="none" spellcheck="false" required placeholder="${esc((u.login||translit(u.name))+'2')}"></label><label>Пароли нав (камаш 6)<input id="c-pass" required minlength="6" autocomplete="new-password"></label></div><div class="bar"><button class="btn pri" type="submit">Сабт</button><button class="btn" type="button" data-act="cred" data-v="">Бекор</button></div><div class="small muted">Логини кӯҳна дигар кор намекунад. Логини навро (бояд аз кӯҳна фарқ кунад) ва паролро ба коргар диҳед.</div></form>`:''}</div>
    <label class="pctl">Музд<input type="number" min="0" max="100" step="0.5" data-wpct="${id}" value="${wPct(id)}" aria-label="Фоизи музд">% аз фоида</label>
    <select data-act="wgroup" data-id="${id}" aria-label="Гурӯҳ">${[['all','Ҳарду гурӯҳ'],['new','Нав'],['used','Кӯҳна'],['removed','Хориҷ кардан']].map(([v,l])=>`<option value="${v}" ${(u.group||'all')===v?'selected':''}>${l}</option>`).join('')}</select></div>`;
  const owners=ADMIN_EMAILS.map(e=>[e,{name:'Соҳиб',owner:true}]),ads=Object.entries(S.admins||{});
  const adminsBox=`<h3>Роҳбарон (админ) · ${owners.length+ads.length}</h3><div class="ulist">${owners.concat(ads).map(([e,a])=>`<div class="urow"><div class="av">${esc(initials(a.name||e))}</div><div class="main"><div style="font-weight:700">${esc(a.name||e.split('@')[0])}${a.owner?' <span class="pill k-g">Соҳиб</span>':''}</div><div class="small muted">${esc(e)}</div></div>${!a.owner&&S.isOwner?(S.confirmAdm===e?`<div class="bar"><button class="btn bad" data-act="admdel" data-v="${esc(e)}">Ҳа, хориҷ кун</button><button class="btn" data-act="admno">Не</button></div>`:`<button class="btn bad" data-act="admdel" data-v="${esc(e)}">Хориҷ кардан</button>`):''}</div>`).join('')}</div>
    ${S.isOwner?`<form class="card" id="f-adm"><h2>Илова кардани роҳбар</h2><div class="small muted">Роҳбари нав ҳамаи дастрасиҳои шуморо мегирад: дархостҳо, нархҳо, пул, коргарон ва танзимот. Танҳо шумо (соҳиб) роҳбаронро илова ё хориҷ карда метавонед.</div>
      <div class="grid"><label>Ном<input id="ad-name" placeholder="Масалан: Фирӯз"></label><label>Почтаи Gmail<input id="ad-email" type="email" required inputmode="email" autocapitalize="none" placeholder="name@gmail.com"></label></div>
      <div><button class="btn pri" type="submit">Роҳбар кардан</button></div><div class="small muted">Роҳбари нав сайтро дар Chrome мекушояд → «Роҳбар» → «Бо Google ворид шудан» бо ҳамин почта.</div></form>`:''}`;
  return add+adminsBox+`<div class="note">Ба ҳар коргар <b>логин ва парол</b> диҳед. Коргар сайтро мекушояд, «Коргар»-ро интихоб мекунад ва бо ҳамон логин-парол ворид мешавад.</div>`
    +`<h3>Коргарон · ${ws.length}</h3>`+(ws.length?`<div class="ulist">${ws.map(wrow).join('')}</div>`:`<div class="empty"><b>Ҳоло коргар нест</b><span class="small">Бо формаи боло илова кунед.</span></div>`)
    +`<h3>Муштариён · ${cs.length}</h3>`+(cs.length?`<div class="ulist">${cs.map(([id,u])=>`<div class="urow"><div class="av">${esc(initials(u.name))}</div><div class="main"><div style="font-weight:600">${esc(u.name)}</div><div class="small muted">${esc(u.phone||'')} · ${S.reqs.filter(r=>r.customerId===id).length} дархост</div></div>${u.phone?`<a class="btn" href="${waLink(u.phone)}" target="_blank" rel="noopener">WhatsApp</a>`:''}</div>`).join('')}</div>`:`<div class="empty"><b>Ҳоло муштарӣ нест</b></div>`);
}

const tOf=r=>r.orderedAt||r.offeredAt||r.updatedAt||r.createdAt||0;
function payView(ids){
  const l=S.reqs.filter(r=>hasCom(r)&&ids.includes(comWorker(r))).sort((a,b)=>tOf(b)-tOf(a));
  const m0=new Date();m0.setDate(1);m0.setHours(0,0,0,0);
  const sum=x=>x.reduce((a,r)=>a+(+r.com||0),0);
  const month=l.filter(r=>tOf(r)>=m0.getTime()),paid=l.filter(r=>r.comPaid),due=l.filter(r=>!r.comPaid);
  const pend=S.reqs.filter(r=>comElig(r)&&!hasCom(r)&&ids.includes(comWorker(r))).length;
  return`<div class="card"><div class="bal"><div><span>Ин моҳ</span><b>${money(sum(month))}</b></div><div class="ok-b"><span>Гирифтам</span><b>${money(sum(paid))}</b></div><div class="${sum(due)?'due-b':''}"><span>Интизор</span><b>${money(sum(due))}</b></div></div>
    ${pend?`<div class="small muted">${pend} заказ ҳанӯз аз ҷониби роҳбар ҳисоб нашудааст.</div>`:''}
    ${l.length?`<div class="tbl-wrap"><table class="tbl pay-t"><thead><tr><th>Заказ</th><th>Сана</th><th>Музд</th><th>Ҳолат</th></tr></thead><tbody>${l.map(r=>`<tr data-act="open" data-id="${r.id}" style="cursor:pointer"><td><span class="tag">${esc(r.code)}</span><div class="small muted t-cut">${esc(titleOf(r))}</div></td><td>${fdate(tOf(r))}</td><td><b>${num(r.com)}</b>${r.comPct!=null?`<div class="small muted">${r.comPct}%</div>`:''}</td><td>${r.comPaid?'<span class="ev ev-login">гирифт</span>':'<span class="ev ev-close">интизор</span>'}</td></tr>`).join('')}</tbody></table></div>`
      :'<div class="small muted">Ҳоло музд нест. Вақте заказ фурӯхта мешавад ва роҳбар муздро муайян мекунад, дар ин ҷо пайдо мешавад.</div>'}</div>`;
}
function workerView(){
  const isAdm=S.isAdmin;
  const aw=actWorker();
  const g0=(S.users[isAdm?aw:S.wid]||{}).group;const myG=!g0||g0==='all'?null:g0;
  const ids=actIds();const mine=r=>ids.includes(r.workerId);
  const isOrd=r=>ids.includes(r.orderWorkerId)&&['ordered','shipped'].includes(r.status);
  const pool=S.reqs.filter(r=>mine(r)||isOrd(r)||(!r.workerId&&r.status==='assigned'&&r.group&&(!myG||r.group===myG))).filter(matchQ);
  const tabs={ord:pool.filter(isOrd),new:pool.filter(r=>r.status==='assigned'),work:pool.filter(r=>r.status==='searching'&&mine(r)),
    done:pool.filter(r=>['found','offered',...SOLD,'returned','notfound'].includes(r.status)&&mine(r)),all:pool.filter(r=>mine(r)&&ACTIVE.includes(r.status))};
  const labels={pay:['Музди ман',''],ord:['Заказҳо барои ман','k-g'],new:['Нав барои ман','k-n'],work:['Дар ҷустуҷӯ','k-s'],done:['Ёфтаҳои ман','k-d'],all:['Ҳамаи корҳои ман','']};
  const ws=workers();
  const late=pool.filter(r=>mine(r)&&overdue(r)).length;
  const head=isAdm?(ws.length?`<div class="note">Панели кадом коргарро бинед? Ҳар коргар танҳо дархостҳои худашро мебинад.</div><div class="tool"><select data-act="awsel" id="aw" class="chip" style="width:auto;flex:1">${ws.map(([id,u])=>`<option value="${id}" ${aw===id?'selected':''}>${esc(u.name)} · ${esc(GRPS[u.group]||'')}</option>`).join('')}</select>${searchBox('Ҷустуҷӯ')}</div>`:`<div class="note">Аввал дар қисми «Одамон» коргар илова кунед.</div>`)
    :`<div class="note">Гурӯҳи шумо: <b>${esc(GRPS[g0]||'—')}</b>. Барои ҳар дархост нархи якчанд паставшикро нависед — роҳбар беҳтаринашро интихоб мекунад.</div><div class="tool">${searchBox('Ҷустуҷӯ')}</div>`;
  if(!S.wTabSet&&tabs.ord.length&&S.wTab==='new')S.wTab='ord';
  if(S.lastMoved&&Date.now()-S.lastMoved.t>15000)S.lastMoved=null;
  if(S.lastMoved){const lm=S.lastMoved;const k=['ord','work','done','new'].find(k=>tabs[k].some(r=>r.id===lm.id&&r.status===lm.st));if(k){S.wTab=k;S.wTabSet=false;S.lastMoved=null}}
  else if(S.wTab!=='pay'&&!(tabs[S.wTab]||[]).length&&!S.wTabSet){const k=['ord','new','work','done'].find(k=>tabs[k].length);if(k)S.wTab=k}
  return `<section class="hero whero"><div class="hero-top"><div><div class="hello">${hello()}, ${esc(isAdm?uname(aw)||'':uname(S.wid)||'')}</div><div class="hdate">${todayTxt()}</div></div></div>
    <div class="hkpis">${[['ord','sold','Заказҳо'],['new','req','Нав'],['work','work','Ҷустуҷӯ'],['done','found','Ёфтаҳо']].map(([k,ic,l])=>`<button class="hk ${S.wTab===k?'on':''} ${k==='new'&&tabs.new.length?'pulse':''}" data-act="wt" data-v="${k}"><span class="hi">${IC(ICONS[ic],18)}</span><b>${tabs[k].length}</b><span class="hl">${l}</span></button>`).join('')}</div>
    <button class="hall ${S.wTab==='all'?'on':''}" data-act="wt" data-v="all"><span>Ҳамаи корҳои ман</span><b>${tabs.all.length}</b><span>→</span></button>${(()=>{const cl=S.reqs.filter(r=>hasCom(r)&&ids.includes(comWorker(r)));const due=cl.filter(r=>!r.comPaid).reduce((a,r)=>a+(+r.com||0),0);return`<button class="hall money ${S.wTab==='pay'?'on':''}" data-act="wt" data-v="pay"><span>💰 Музди ман${due?' · интизор '+money(due):''}</span><b>${num(cl.reduce((a,r)=>a+(+r.com||0),0))}</b><span>→</span></button>`})()}</section>`+head+(late?`<button class="alert" data-act="wt" data-v="work">${late} дархост мӯҳлаташ гузашт<span class="arr">→</span></button>`:'')+`<div class="wsec">${esc(labels[S.wTab]?labels[S.wTab][0]:'')}</div>`+(S.wTab==='pay'?payView(ids):'')+cards(S.wTab==='pay'?null:tabs[S.wTab]||[],S.wTab==='all');
}

function customerView(){
  const list=S.reqs.filter(r=>r.customerId===cid());
  const cs=list.map(r=>{
    const stg=CSTAGE[r.status];
    const prog=stg===undefined?`<div><span class="pill k-x">${r.status==='notfound'?'Афсӯс, ёфт нашуд':r.status==='returned'?'Баргардонида шуд':'Бекор шуд'}</span></div>`
      :`<div class="steps">${CSTEPS.map((_,i)=>`<i class="${i<=stg?'on':''}"></i>`).join('')}</div><div class="steps-l">${CSTEPS.map((l,i)=>`<span class="${i===stg?'on':''}">${l}</span>`).join('')}</div>`;
    const its=itemsOf(r),showP=['offered',...SOLD].includes(r.status);
    const itemsBox=`<div class="items">${its.map((it,i)=>`<div class="it ${it.off?'off':''}"><span class="nm">${inmH(it)}${it.q>1?' × '+it.q:''}</span><span class="bar">${showP&&it.price?`<span class="price small">${money(it.price)}</span>`:''}${r.status==='offered'&&its.length>1?`<button class="link" data-act="item-off" data-id="${r.id}" data-i="${i}">${it.off?'Бозгардон':'Лозим нест'}</button>`:''}</span></div>`).join('')}${showP?`<div class="sum"><span>Ҷамъ</span><span class="price">${money(r.price)}</span></div>`:''}</div>`;
    const offer=r.status==='offered'?`<div class="offer"><div><div class="small">Қисм ёфт шуд${r.warrantyDays?' · кафолат '+r.warrantyDays+' рӯз':''}</div><div class="price">${money(r.price)}</div>${r.offerNote?`<div class="small">${esc(r.offerNote)}</div>`:''}</div><div class="spacer"></div><button class="btn ok" data-act="cust-accept" data-id="${r.id}">Заказ медиҳам</button><button class="btn bad" data-act="cust-decline" data-id="${r.id}">Лозим нест</button></div>`:'';
    const pay=SOLD.includes(r.status)?`<div class="bal"><div class="ok-b"><span>Пардохт шуд</span><b>${money(paidOf(r))}</b></div><div class="${balOf(r)?'due-b':''}"><span>Боқимонда</span><b>${money(balOf(r))}</b></div>${r.tracking?`<div><span>Пайгирӣ</span><b>${esc(r.tracking)}</b></div>`:''}${r.warrantyDays&&r.deliveredAt?`<div><span>Кафолат то</span><b>${fdate(r.deliveredAt+r.warrantyDays*864e5)}</b></div>`:''}</div>`:'';
    const ship=['shipped','delivered'].includes(r.status)&&(r.cargo||r.tracking)?`<div class="shipbox"><div class="sb-h">📦 ${r.status==='delivered'?'Супорида шуд':'Бор дар роҳ аст'}</div><div class="shipinfo"><div><span>Карго</span><b>${esc(r.cargo||'—')}</b></div><div><span>Рақами карго</span><b>${esc(r.tracking||'—')}</b></div>${+r.weight?`<div><span>Вазн</span><b>${r.weight} кг</b></div>`:''}${r.deliverBy?`<div><span>Рӯзи супоридан</span><b>${fdate(r.deliverBy)}</b></div>`:''}</div></div>`:'';
    const cancel=['new','assigned'].includes(r.status)?`<div><button class="btn bad" data-act="cust-cancel" data-id="${r.id}">Бекор кардан</button></div>`:'';
    return`<div class="ccard ${r.status==='offered'?'is-offer':''}"><div class="top"><span class="tag">${esc(r.code)}</span><b>${esc(r.car)} ${esc(r.year)}</b><span class="spacer"></span><span class="time">${ago(r.createdAt)}</span></div>
      <div class="small muted">${r.vin?esc(C.f3)+' '+esc(r.vin)+' · ':''}${esc(COND[r.condition]||'')} · мӯҳлат ${URG[r.urgency||'d3'].l}</div>${prog}${ship}${itemsBox}${photosHtml(r)}${offer}${pay}${SOLD.includes(r.status)?`<div><button class="btn" data-act="inv" data-id="${r.id}">🧾 Инвойс</button></div>`:''}${cancel}</div>`;
  });
  const offers=list.filter(r=>r.status==='offered');
  const tab=S.cTab||(offers.length?'offers':list.length?'list':'new');
  const me=S.users[cid()]||{};const debt=list.reduce((a,r)=>a+balOf(r),0);
  const card=r=>cs[list.indexOf(r)];
  const k=(v,ic,label,val)=>`<button class="hk ${tab===v?'on':''}" data-act="ctab" data-v="${v}"><span class="hi">${IC(ICONS[ic],18)}</span><b>${val}</b><span class="hl">${label}</span></button>`;
  const hero=`<section class="hero"><div class="hero-top"><div><div class="hello">${hello()}${me.name?', '+esc(me.name.split(' ')[0]):''}</div><div class="hdate">${todayTxt()}</div></div></div>
    <div class="hkpis">${k('list','work','Дар ҷустуҷӯ',list.filter(r=>['new','assigned','searching','found'].includes(r.status)).length)}${k('offers','profit','Нарх омад',offers.length)}${k('list','sold','Заказҳо',list.filter(r=>SOLD.includes(r.status)).length)}${k('list','debt','Қарз',debt?num(debt):'0')}</div>
    ${offers.length&&tab!=='offers'?`<button class="hdebt good" data-act="ctab" data-v="offers"><span>Барои ${offers.length} дархост нарх омад</span><b>Дидан</b><span>→</span></button>`:''}</section>`;
  const T=[['offers','Нархҳо'],['list','Дархостҳо'],['new','Дархости нав']];
  const TI={offers:ICONS.profit,list:ICONS.req,new:'<path d="M12 5v14M5 12h14"/>'};
  const nav=`<div class="tabs top-tabs">${T.map(([key,l])=>`<button class="${tab===key?'on':''}" data-act="ctab" data-v="${key}">${l}${key==='offers'&&offers.length?`<span class="badge">${offers.length}</span>`:''}</button>`).join('')}</div>
    <nav class="bnav c3" aria-label="Менюи муштарӣ">${T.map(([key,l])=>`<button class="${tab===key?'on':''}" data-act="ctab" data-v="${key}">${IC(TI[key],22)}<span>${l}</span>${key==='offers'&&offers.length?`<i class="bdot">${offers.length}</i>`:''}</button>`).join('')}</nav>`;
  let body;
  if(tab==='new')body=newReqForm(false);
  else if(tab==='offers')body=offers.length?`<div class="small muted">Роҳбар нарх фиристод. Қисмҳои лозимаро интихоб кунед ва «Заказ медиҳам»-ро пахш кунед.</div>`+offers.map(card).join(''):`<div class="empty"><b>Ҳоло нарх нест</b><span class="small">Вақте роҳбар барои дархостатон нарх фиристад, он дар ҳамин ҷо пайдо мешавад.</span><button class="btn pri" data-act="ctab" data-v="new">+ Дархости нав</button></div>`;
  else body=list.length?cs.join(''):`<div class="empty"><b>Ҳоло дархост нест</b><span class="small">Дархости аввалро фиристед — мо қисмро меёбем ва нархро ҳамин ҷо мебинед.</span><button class="btn pri" data-act="ctab" data-v="new">+ Дархости нав</button></div>`;
  return hero+nav+body;
}

function itemRow(i){return`<div class="irow3"><input id="n-it-${i}" placeholder="${i?'Номи қисм':esc(C.itemPh)}" aria-label="Номи қисм ${i+1}"><input id="n-iq-${i}" type="number" min="1" value="1" aria-label="Миқдор"><input id="n-ic-${i}" class="codein" placeholder="Коди қисм (агар бошад)" autocapitalize="characters" spellcheck="false" aria-label="Коди қисм ${i+1}"></div>`}
function parseCodes(txt){const map=new Map(),notes=[];
  String(txt||'').split(/[\n;]+/).map(s=>s.trim()).filter(Boolean).slice(0,120).forEach(line=>{
    const tk=line.split(/[\s,]+/).filter(Boolean);const code=(tk[0]||'').toUpperCase().replace(/[.,:]+$/,'');
    if(!/\d/.test(code)||code.length<4){notes.push(line);return}
    let rest=tk.slice(1),q=1;const last=rest[rest.length-1];
    const m=last&&last.match(/^[x×*]?(\d{1,3})(шт|pcs|дона|ta)?\.?$/i);if(m){q=Math.max(1,+m[1]);rest=rest.slice(0,-1)}
    else if(rest.length>=2&&/^[x×*]$/i.test(rest[rest.length-2])&&/^\d{1,3}$/.test(last)){q=+last;rest=rest.slice(0,-2)}
    const n=rest.join(' ').replace(/^[-–:]+\s*/,'').trim();
    if(map.has(code)){const o=map.get(code);o.q+=q;if(!o.n&&n)o.n=n}else map.set(code,{code,n,q})});
  return{items:[...map.values()].slice(0,60),notes}}
function codesList(){const el=document.getElementById('n-codes'),box=document.getElementById('codes-list');if(!el||!box)return;
  const {items,notes}=parseCodes(el.value);S.cq=S.cq||{};
  box.innerHTML=items.length?`<div class="cl-h">Ёфт шуд: <b>${items.length}</b> код${notes.length?` · <span class="muted">${notes.length} сатр ҳамчун эзоҳ</span>`:''}</div>${items.map(it=>{const q=S.cq[it.code]||it.q;return`<div class="cl-r"><span class="cl-c"><code class="pc">${esc(it.code)}</code>${it.n?` <span class="small">${esc(it.n)}</span>`:''}</span><span class="stepper"><button type="button" data-cq="-1" data-code="${esc(it.code)}" aria-label="Кам">−</button><input class="cqin" data-code="${esc(it.code)}" type="number" min="1" value="${q}" aria-label="Миқдор"><button type="button" data-cq="1" data-code="${esc(it.code)}" aria-label="Зиёд">+</button></span></div>`}).join('')}`:'<div class="small muted">Кодҳо дар ин ҷо бо миқдорашон пайдо мешаванд.</div>'}
function bulkBox(){return S.bulk?`<div class="bulk"><div class="small muted" style="font-weight:600">Ҳар код дар як сатр. Пас аз код ном ё миқдорро ҳам навиштан мумкин (масалан: 21810-A9000 2).</div><textarea id="n-codes" rows="6" placeholder="21810-A9000\n90915-YZZD4 филтри равған\n25281-2F001 2"></textarea><div id="codes-list" class="codes-list"></div></div>`:''}
function custReqForm(adm){
  const rows=[];for(let i=0;i<S.nItems;i++)rows.push(itemRow(i));
  const opt='<span class="opt">ихтиёрӣ</span>';
  const md=S.fMode==='codes'?'codes':'simple';
  const sw=`<div class="seg mode"><button type="button" data-act="fmode" data-v="simple" class="${md==='simple'?'on':''}">Ном ва акс</button><button type="button" data-act="fmode" data-v="codes" class="${md==='codes'?'on':''}">Танҳо кодҳо</button></div>`;
  const back=adm||S.reqs.some(r=>r.customerId===cid())?'<button class="btn block" type="button" data-act="closenew">Бекор</button>':'';
  const who=adm?`<div class="grid2"><label class="big"><span>Номи муштарӣ</span><input id="n-cname" required></label><label class="big"><span>WhatsApp</span><input id="n-cphone" inputmode="tel" placeholder="+971…"></label></div>`:'';
  const ttl=adm?'Дархост аз номи муштарӣ':'Дархости нав';
  const man=adm?`<details class="more" id="n-man-d"><summary>Нарх маълум аст — фавран заказ</summary><div class="grid"><label class="chk full"><input type="checkbox" id="n-man">Бе ҷустуҷӯ, рост заказ шавад</label><label class="full">Паставшик<input id="n-sup"></label><label>Нархи харид (${esc(C.cur)})<input id="n-cost" type="number" step="0.01" min="0"></label><label>Нархи фурӯш (${esc(C.cur)})<input id="n-price" type="number" step="0.01" min="0"></label></div></details>`:'';
  if(md==='codes')return`<form class="card simple-f" id="f-new"><h2>${ttl}</h2>${sw}${who}
    <div class="big"><div class="lbl">1. Кодҳоро гузоред</div><div class="small muted">Ҳар код дар як сатр. Аз WhatsApp ё Excel нусха гирифта гузоред. Сатрҳои бе код ҳамчун эзоҳ мераванд.</div>
      <textarea id="n-codes" class="codes-ta" rows="7" placeholder="21810-A9000\n21950-A9000\n25281-2F001 2"></textarea></div>
    <div class="big"><div class="lbl">2. Миқдор</div><div id="codes-list" class="codes-list"></div></div>
    <label class="big"><span>3. Мошин ${opt}</span><input id="n-car" placeholder="${esc(C.f1ph)}" autocomplete="off"></label>
    <button class="btn pri block" type="submit" ${S.busy?'disabled':''}>${S.busy?'Фиристода истодааст…':'Фиристодан'}</button>${back}</form>`;
  return`<form class="card simple-f" id="f-new"><h2>${ttl}</h2>${sw}${who}
    <label class="big">1. ${adm?'Мошин':'Мошинатон'}<input id="n-car" required placeholder="${esc(C.f1ph)} 2015" autocomplete="off"></label>
    <div class="big"><div class="lbl">2. Чӣ лозим?</div><div class="items">${rows.join('')}</div><button type="button" class="link" data-act="additem" style="margin-top:6px">+ Боз як қисм</button></div>
    <div class="big"><div class="lbl">3. Акс ${opt}</div><label class="upl wide">${ICON_CAM}Акси қисм ё техпаспорт<input type="file" id="n-photo" accept="image/*" multiple></label> <span class="small muted" id="n-photo-n"></span></div>
    <details class="more" id="n-more"><summary>Маълумоти иловагӣ ${opt}</summary><div class="grid">
      <label class="full">${esc(C.f3)}<input id="n-vin" autocapitalize="characters" spellcheck="false" placeholder="${esc(C.f3ph)}" style="font-family:var(--mono)"></label>
      <label class="full">${esc(C.f2)}<input id="n-year" inputmode="numeric" placeholder="${esc(C.f2ph)}"></label>
      <div class="full"><div class="small muted" style="margin-bottom:5px;font-weight:600">Нав ё кӯҳна?</div><div class="radio">${Object.entries(COND).map(([k,l])=>`<label><input type="radio" name="n-cond" id="n-cond-${k}" value="${k}" ${k==='any'?'checked':''}>${l}</label>`).join('')}</div></div>
      <div class="full"><div class="small muted" style="margin-bottom:5px;font-weight:600">Кай лозим?</div><div class="radio">${Object.entries(URG).map(([k,u])=>`<label><input type="radio" name="n-urg" id="n-urg-${k}" value="${k}" ${k==='d3'?'checked':''}>${u.l}</label>`).join('')}</div></div>
      <label class="full">Эзоҳ<input id="n-note" placeholder="Ранг, тараф (чап/рост)…"></label>
    </div></details>
    ${man}
    <button class="btn pri block" type="submit" ${S.busy?'disabled':''}>${S.busy?'Фиристода истодааст…':'Фиристодан'}</button>
    <div class="small muted" style="text-align:center">Агар коди қисм, акс ё VIN бошад, қисмро зудтар меёбем.</div>
    ${back}</form>`;
}
function newReqForm(forAdmin){
  if(!forAdmin)return custReqForm();
  const md=S.fMode==='codes'?'codes':'simple';
  if(md==='simple')return custReqForm(true);
  const sw=`<div class="seg mode"><button type="button" data-act="fmode" data-v="simple" class="${md==='simple'?'on':''}">Ном ва акс</button><button type="button" data-act="fmode" data-v="codes" class="${md==='codes'?'on':''}">Танҳо кодҳо</button></div>`;
  if(md==='codes')return`<form class="card simple-f" id="f-new"><h2>Дархост аз номи муштарӣ</h2>${sw}
    <div class="grid2"><label class="big"><span>Номи муштарӣ</span><input id="n-cname" required></label><label class="big"><span>WhatsApp</span><input id="n-cphone" inputmode="tel" placeholder="+971…"></label></div>
    <div class="big"><div class="lbl">Кодҳо</div><div class="small muted">Ҳар код дар як сатр — пайдарҳам нависед ё аз WhatsApp/Excel гузоред. Пас аз код миқдор: <code class="pc">21810-A9000 2</code></div>
      <textarea id="n-codes" class="codes-ta" rows="8" placeholder="21810-A9000\n21950-A9000\n25281-2F001 2"></textarea></div>
    <div class="big"><div class="lbl">Миқдор</div><div id="codes-list" class="codes-list"></div></div>
    <details class="more" id="n-more"><summary>Мошин, VIN ва дигар (ихтиёрӣ)</summary><div class="grid">
      <label class="full">${esc(C.f1)}<input id="n-car" placeholder="${esc(C.f1ph)}"></label>
      <label>${esc(C.f2)}<input id="n-year" placeholder="${esc(C.f2ph)}"></label>
      <label>${esc(C.f3)}<input id="n-vin" autocapitalize="characters" spellcheck="false" style="font-family:var(--mono)"></label>
      <div class="full"><div class="small muted" style="margin-bottom:5px;font-weight:600">Нав ё кӯҳна?</div><div class="radio">${Object.entries(COND).map(([k,l])=>`<label><input type="radio" name="n-cond" value="${k}" ${k==='any'?'checked':''}>${l}</label>`).join('')}</div></div>
      <div class="full"><div class="small muted" style="margin-bottom:5px;font-weight:600">Кай лозим?</div><div class="radio">${Object.entries(URG).map(([k,u])=>`<label><input type="radio" name="n-urg" value="${k}" ${k==='d3'?'checked':''}>${u.l}</label>`).join('')}</div></div>
      <label class="full">Эзоҳ<input id="n-note"></label></div></details>
    <div class="bar"><button class="btn pri" type="submit" ${S.busy?'disabled':''}>${S.busy?'Фиристода истодааст…':'Фиристодан'}</button><button class="btn" type="button" data-act="closenew">Бекор</button></div></form>`;
  const rows=[];for(let i=0;i<S.nItems;i++)rows.push(itemRow(i));
  return`<form class="card" id="f-new"><h2>${forAdmin?'Дархост аз номи муштарӣ':'Дархости нав'}</h2>${sw}<div class="grid">
    ${forAdmin?`<label>Номи муштарӣ<input id="n-cname" required></label><label>WhatsApp-и муштарӣ<input id="n-cphone" inputmode="tel" placeholder="+971…"></label>`:''}
    <div class="grid2 full"><label>${esc(C.f1)}<input id="n-car" required placeholder="${esc(C.f1ph)}"></label>
    <label>${esc(C.f2)}<input id="n-year" placeholder="${esc(C.f2ph)}"></label></div>
    <label class="full">${esc(C.f3)}${C.f3len?' ('+C.f3len+' рамз)':''}<input id="n-vin" ${C.f3len?'maxlength="'+C.f3len+'"':''} autocapitalize="characters" spellcheck="false" placeholder="${esc(C.f3ph)}" style="font-family:var(--mono)"></label>
    <div class="full"><div class="small muted" style="margin-bottom:5px;font-weight:600">Қисмҳо ва миқдор</div><div class="items">${rows.join('')}</div><div class="bar" style="margin-top:8px"><button type="button" class="link" data-act="additem">+ Қисми дигар илова кунед</button><button type="button" class="link" data-act="bulk">${S.bulk?'− Рӯйхати кодҳоро пӯшидан':'☰ Кодҳои бисёр якбора'}</button></div>${bulkBox()}</div>
    <div class="full"><div class="small muted" style="margin-bottom:5px;font-weight:600">Акси қисм ё техпаспорт</div><label class="upl">${ICON_CAM}Акс интихоб кунед<input type="file" id="n-photo" accept="image/*" multiple></label> <span class="small muted" id="n-photo-n"></span></div>
    <div class="full"><div class="small muted" style="margin-bottom:5px;font-weight:600">Кадом намуд?</div><div class="radio">${Object.entries(COND).map(([k,l],i)=>`<label><input type="radio" name="n-cond" id="n-cond-${k}" value="${k}" ${i===0?'checked':''}>${l}</label>`).join('')}</div></div>
    <div class="full"><div class="small muted" style="margin-bottom:5px;font-weight:600">Кай лозим?</div><div class="radio">${Object.entries(URG).map(([k,u])=>`<label><input type="radio" name="n-urg" id="n-urg-${k}" value="${k}" ${k==='d3'?'checked':''}>${u.l}</label>`).join('')}</div></div>
    <label class="full">Эзоҳ<input id="n-note" placeholder="Ранг, тараф, рақами қисм…"></label>
    ${forAdmin?`<label class="chk full"><input type="checkbox" id="n-man">Нарх маълум аст — фавран заказ (бе ҷустуҷӯ)</label>
    <div class="grid full manual-f"><label>Паставшик<input id="n-sup"></label><label>Нархи харид (${esc(C.cur)})<input id="n-cost" type="number" step="0.01" min="0"></label><label>Нархи фурӯш (${esc(C.cur)})<input id="n-price" type="number" step="0.01" min="0"></label></div>`:''}
  </div><div class="small muted">${esc(C.refHint)}</div><div class="bar"><button class="btn pri" type="submit" ${S.busy?'disabled':''}>${S.busy?'Фиристода истодааст…':'Фиристодан'}</button>${S.reqs.some(r=>r.customerId===cid())||forAdmin?'<button class="btn" type="button" data-act="closenew">Бекор</button>':''}</div></form>`;
}
function onboardView(){
  const t=S.entryTab||'customer';
  const seg=`<div class="seg">${[['customer','Муштарӣ'],['worker','Коргар'],['admin','Роҳбар']].map(([k,l])=>`<button data-act="etab" data-v="${k}" class="${t===k?'on':''}">${l}</button>`).join('')}</div>`;
  const err=S.loginErr?`<div class="err">${esc(S.loginErr)}</div>`:'';
  const head=(h,p)=>`<div class="lhead">${logoHtml()}<h1>${h}</h1><p class="muted small" style="margin:0">${p}</p></div>`;
  if(t==='worker')return`<div class="login">${head('Воридшавии коргар','Логин ва паролро аз роҳбар гиред.')}${seg}
    <form class="card" id="f-login" autocomplete="on"><label>Логин<input id="l-login" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
    <label>Парол<div class="pw"><input id="l-pass" type="${S.showPw?'text':'password'}" autocomplete="current-password" required><button type="button" class="link" data-act="showpw">${S.showPw?'Пинҳон':'Нишон деҳ'}</button></div></label>
    ${err}<button class="btn pri" type="submit" ${S.busy?'disabled':''}>${S.busy?'Ворид шуда истодааст…':'Ворид шудан'}</button></form></div>`;
  if(t==='admin')return`<div class="login">${head('Воридшавии роҳбар','Бо ҳисоби Google-и роҳбар ворид шавед.')}${seg}
    ${IN_WV?`<div class="card"><div class="note">Дар барнома (APK) «Ворид бо Google» кор намекунад — Google инро манъ кардааст. Бо Gmail ва пароли худ ворид шавед. Паролро як бор дар Chrome месозед: сайт → ⚙ Танзимот → «Парол барои барнома».</div></div>`:`<div class="card">${S.aPw?'':err}<button class="btn pri" data-act="google" ${S.busy?'disabled':''}><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Бо Google ворид шудан</button></div>`}
    <form class="card" id="f-alogin"><div class="small" style="font-weight:700">${IN_WV?'Ворид бо Gmail ва парол':'Ё бо Gmail ва парол'}</div><label>Gmail<input id="a-email" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" required></label><label>Парол<input id="a-pass" type="password" autocomplete="current-password" required></label>${S.aPw||IN_WV?err:''}<button class="btn ${IN_WV?'pri':''}" type="submit" ${S.busy?'disabled':''}>Ворид шудан</button></form></div>`;
  return`<div class="login">${head('Воридшавии муштарӣ','Ном ва рақами WhatsApp-и худро нависед. Бори дигар бо ҳамин рақам ворид шавед — дархостҳоятон ҳамин ҷо мемонанд.')}${seg}
    <form class="card" id="f-clogin"><label>Ном<input id="o-name" required autocomplete="name"></label>
    <label>Рақами WhatsApp<input id="o-phone" inputmode="tel" required autocomplete="tel" placeholder="+971 50 123 4567"></label>
    ${err}<button class="btn pri" type="submit" ${S.busy?'disabled':''}>${S.busy?'Ворид шуда истодааст…':'Ворид шудан'}</button></form></div>`;
}

/* ===== detail sheet ===== */
function qTotals(id){let s=0;document.querySelectorAll('input[type=number][data-qsum="'+id+'"]').forEach(x=>{s+=parseFloat(x.value)||0});s=Math.round(s*100)/100;
  const vb=document.getElementById('q-vat-'+id),on=vb&&vb.checked,vr=+C.vat||0,va=on?Math.round(s*vr)/100:0;
  const set=(k,v)=>{const e=document.getElementById(k+id);if(e)e.textContent=num(v)+' '+C.cur};set('q-tot-',s);set('q-vatv-',va);set('q-totv-',Math.round((s+va)*100)/100);
  document.querySelectorAll('.sum.vat,.sum.tot').forEach(e=>e.style.opacity=on?1:.4)}
function quoteForm(r,cancel){
  return (S.qEdit&&S.qEdit.rid===r.id?'<div class="note" style="margin-bottom:8px">Нархи паставшикро иваз карда истодаед.</div>':'')+quoteForm0(r,cancel)}
function quoteForm0(r,cancel){
  const its=itemsOf(r);
  const eq=S.qEdit&&S.qEdit.rid===r.id?(r.quotes||[]).find(x=>x.id===S.qEdit.qid):null;
  const pv=i=>{if(!eq)return'';const raw=Array.isArray(eq.itemCosts)?eq.itemCosts[i]:(its.filter(x=>!x.off).length===1?eq.cost:null);if(raw==null)return'';return Math.round(raw/(1+(+eq.vat||0)/100)*100)/100};
  const ev=k=>eq?esc(eq[k]??''):'';
  const qrow=(it,i)=>it.off?'':`<div class="qi"><div class="qi-top"><span class="nm"><b>${inmH(it)}</b>${it.q>1?' × '+it.q:''}</span><input id="q-ip-${r.id}-${i}" data-qsum="${r.id}" value="${pv(i)}" type="number" step="0.01" min="0" inputmode="decimal" placeholder="Нарх" aria-label="Нархи харид"></div>
      ${S.qNc&&S.qNc[r.id+'-'+i]?`<input id="q-nc-${r.id}-${i}" class="codein" placeholder="Коди нав (агар иваз шуд)" value="${esc(it.code||'')}" autocapitalize="characters" spellcheck="false">`:`<button type="button" class="link small" data-act="qnc" data-id="${r.id}" data-v="${i}">↻ Код иваз шуд</button>`}</div>`;
  return `<div class="cform qform">
    <div class="grid"><label>Паставшик<input id="q-sup-${r.id}" value="${ev('sup')}" placeholder="Номи мағоза"></label><label>Телефони паставшик<input id="q-ph-${r.id}" value="${ev('ph')}" inputmode="tel" placeholder="ихтиёрӣ"></label></div>
    <div><div class="small muted" style="font-weight:600;margin-bottom:6px">Нархи харид барои ҳар қисм (${esc(C.cur)}). Агар паставшик надорад — холӣ монед.</div><div class="qitems">${its.map(qrow).join('')}</div>
      <div class="sum"><span>Ҷамъ</span><span id="q-tot-${r.id}">0</span></div>
      ${+C.vat>0?`<label class="chk vatchk"><input type="checkbox" id="q-vat-${r.id}" data-qsum="${r.id}" ${!eq||eq.vat?'checked':''}>+ VAT ${C.vat}% (нархҳо бе VAT навишта шудаанд)</label>
      <div class="sum vat"><span>VAT ${C.vat}%</span><span id="q-vatv-${r.id}">0</span></div><div class="sum tot"><span>Ҷамъ бо VAT</span><span id="q-totv-${r.id}">0</span></div>`:''}</div>
    <div class="grid"><label>Намуд<select id="q-kind-${r.id}">${Object.entries(KIND).map(([k,l])=>`<option value="${k}" ${(eq?eq.kind:(r.condition==='used'?'used':'orig'))===k?'selected':''}>${l}</option>`).join('')}</select></label><label>Расонидан (рӯз)<input id="q-eta-${r.id}" value="${ev('eta')}" type="number" min="0" step="1"></label>
    <label class="full">Эзоҳ<input id="q-note-${r.id}" value="${ev('note')}" placeholder="Сифат, ранг…"></label></div>
    <div class="bar"><button class="btn pri" data-act="addq" data-id="${r.id}">${eq?'Тағйиротро сабт кардан':'Сабт кардан'}</button>${eq?'<button class="btn" data-act="qeditx">Бекор</button>':''}${cancel?'<button class="btn" data-act="qclose">Бекор</button>':''}</div></div>`;
}
function quotesHtml(r,v,canAdd){
  const qs=(r.quotes||[]).slice().sort((a,b)=>(+a.cost||0)-(+b.cost||0));
  const min=qs.length?+qs[0].cost:null;
  const list=qs.length?`<div class="qlist">${qs.map(q=>`<div class="q ${r.chosenQ===q.id?'chosen':''}"><span class="qs">${esc(q.sup)} ${qs.length>1&&+q.cost===min?'<span class="best">арзонтарин</span>':''} ${r.chosenQ===q.id?'<span class="best">интихоб шуд</span>':''}</span><span class="qc">${money(q.cost)}${q.vat?`<small class="vatl">бо VAT ${q.vat}%</small>`:''}</span>
    <span class="qm"><span>${esc(KIND[q.kind]||'')}</span>${q.eta?`<span>${esc(q.eta)} рӯз</span>`:''}${q.ph?`<span>${esc(q.ph)}</span>`:''}${q.note?`<span>${esc(q.note)}</span>`:''}<span>${esc(uname(q.by))} · ${ago(q.t)}</span></span>${Array.isArray(q.itemCosts)&&itemsOf(r).length>1?`<span class="qb">${itemsOf(r).map((it,i)=>it.off?'':`<span><code class="pc">${esc(it.code||it.n)}</code> ${q.itemCosts[i]!=null?num(q.itemCosts[i]):'<span class="muted">нест</span>'}</span>`).join('')}</span>`:''}
    ${v==='admin'||canAdd?`<span class="qa">${v==='admin'&&r.chosenQ!==q.id?`<button class="btn ok" data-act="chooseq" data-id="${r.id}" data-q="${q.id}" style="height:34px">Интихоб</button>`:''}${q.ph?`<a class="btn" style="height:34px" href="${waLink(q.ph,waText(r))}" target="_blank" rel="noopener">WhatsApp</a>`:''}${v==='admin'||(canAdd&&actIds().includes(q.by))?`<button class="link" data-act="qedit" data-id="${r.id}" data-q="${q.id}">✎ Нархро иваз кардан</button><button class="link" data-act="delq" data-id="${r.id}" data-q="${q.id}" style="color:var(--bad)">Нест кардан</button>`:''}</span>`:''}</div>`).join('')}</div>`:`<div class="small muted">Ҳоло нарх нест.</div>`;
  const form=!canAdd||canAdd==='list'?'':S.qOpen!==r.id?`<div><button class="btn pri" data-act="qopen" data-id="${r.id}">+ Нарх илова кардан</button></div>`:quoteForm(r,true);
  return`<div class="card"><h3>Нархи паставшикҳо · ${qs.length}</h3>${list}${form}</div>`;
}
function sheet(){
  const r=S.reqs.find(x=>x.id===S.open);if(!r)return'';
  const v=view(),isMine=actIds().includes(r.workerId),adm=v==='admin';
  const its=itemsOf(r);
  const info=`<dl class="kv"><dt>${esc(C.f1s)}</dt><dd>${esc(r.car)} ${esc(r.year)}</dd><dt>${esc(C.f3)}</dt><dd style="font-family:var(--mono)">${r.vin?esc(r.vin)+(C.f3len&&r.vin.length!==C.f3len?' <span class="warn-note">('+C.f3len+' рамз нест)</span>':''):'<span class="warn-note">нест</span>'}</dd><dt>Намуд</dt><dd>${esc(COND[r.condition]||'—')}</dd><dt>Мӯҳлат</dt><dd>${URG[r.urgency||'d3'].l} · ${fmt(deadline(r))} ${dueTxt(r)}</dd>${r.note?`<dt>Эзоҳ</dt><dd>${esc(r.note)}</dd>`:''}
    ${adm?`<dt>Муштарӣ</dt><dd>${esc(custName(r))} ${custPhone(r)?'· <span style="font-family:var(--mono)">'+esc(custPhone(r))+'</span>':''}</dd>`:''}
    <dt>Масъул</dt><dd>${r.workerId?`<b>${esc(uname(r.workerId))}</b>`:'<span class="who none">таъин нашуд</span>'}${r.assignedAt&&r.foundAt?` · ёфт дар ${hrs((r.foundAt-r.assignedAt)/36e5)}`:''}</dd>${r.workerNote?`<dt>Эзоҳи коргар</dt><dd>${esc(r.workerNote)}</dd>`:''}${r.returnReason?`<dt>Сабаби бозгашт</dt><dd>${esc(r.returnReason)}</dd>`:''}</dl>`;
  const canEd=adm||(isMine&&['assigned','searching','found'].includes(r.status));
  const wPriceMode=v==='worker'&&['searching','found'].includes(r.status)&&isMine;
  const ed=S.editIt&&S.editIt.id===r.id?S.editIt.i:-1;
  const itemsBox=`<div class="items">${its.map((it,i)=>i===ed?`<div class="it-ed"><div class="small muted">Код ё номро иваз кунед. Коди кӯҳна нигоҳ дошта мешавад.</div>
      <input id="ie-code" value="${esc(it.code||'')}" placeholder="Коди нав" autocapitalize="characters" spellcheck="false" style="font-family:var(--mono)">
      <div class="irow"><input id="ie-name" value="${esc(it.n&&it.n!==it.code?it.n:'')}" placeholder="Ном (ихтиёрӣ)"><input id="ie-q" type="number" min="1" value="${it.q||1}" aria-label="Миқдор"></div>
      <div class="bar"><button class="btn pri" data-act="itsave" data-id="${r.id}" data-v="${i}">Сабт</button><button class="btn" data-act="itcancel">Бекор</button></div></div>`
    :`<div class="it ${it.off?'off':''}"><span class="nm"><b>${inmH(it)}</b>${it.q>1?' × '+it.q:''}</span><span class="bar">${adm&&it.price?`<span class="price small">${money(it.price)}</span>`:''}${canEd&&!it.off?`<button class="itbtn" data-act="itedit" data-id="${r.id}" data-v="${i}" aria-label="Иваз кардан" title="Иваз кардан">✎</button>`:''}</span></div>`).join('')}</div>`;
  const photos=`<div class="bar">${photosHtml(r)||'<span class="small muted">Акс нест.</span>'}</div>${(adm||isMine)?uplBtn(r.id,'Акс илова кардан'):''}`;
  const mg=adm&&(r.cost||r.price)?`<div class="bal"><div><span>Харид${r.supplier?' · '+esc(r.supplier):''}</span><b>${money(r.cost)}</b></div><div><span>Фурӯш</span><b>${money(r.price)}</b></div>${r.cost&&r.price?`<div class="ok-b"><span>Фоида</span><b>${money(r.price-r.cost)}</b></div>`:''}</div>`:'';
  let act='';const SL={};const put=(k,h)=>{SL[k]=(SL[k]||'')+h};
  if(adm){
    const ws=workers(),g0=r.group||(r.condition==='used'?'used':r.condition==='new'?'new':'');
    const live=its.filter(i=>!i.off),canPrice=['new','assigned','searching','found','offered'].includes(r.status);
    const priceCard=canPrice?`<div class="card pricing"><h3>${r.status==='offered'?'Нарх фиристода шуд — метавонед иваз кунед':'Нархи фурӯш ба муштарӣ'}</h3>
      ${r.cost?`<div class="bal"><div><span>Нархи харид${r.supplier?' · '+esc(r.supplier):''}</span><b>${money(r.cost)}</b></div>${r.workerId?`<div><span>Ёфт</span><b style="font-family:var(--body)">${esc(uname(r.workerId))}</b></div>`:''}</div>`:'<div class="small muted">Нархи харид ҳанӯз нест — метавонед нархро худатон гузоред.</div>'}
      ${r.cost&&(live.length===1||chosenIC(r))?`<div class="bar"><span class="small muted">Фоида:</span>${[10,20,30,50].map(p=>`<button class="chip" data-act="markup" data-id="${r.id}" data-v="${p}" style="height:34px">+${p}%</button>`).join('')}</div>`:''}
      <div class="items">${its.map((it,i)=>it.off?`<div class="it off"><span class="nm">${inmH(it)}</span><span class="small">муштарӣ рад кард</span></div>`:`<div class="it"><span class="nm"><b>${inmH(it)}</b>${it.q>1?' × '+it.q:''}</span><input id="d-ip-${r.id}-${i}" data-pp="${r.id}" type="number" step="0.01" min="0" inputmode="decimal" placeholder="Нарх ${esc(C.cur)}" value="${esc(it.price??'')}" aria-label="Нархи ${esc(it.n)}"></div>`).join('')}</div>
      <div class="bal"><div><span>Ҷамъ ба муштарӣ</span><b id="pt-${r.id}">—</b></div><div class="ok-b"><span>Фоидаи шумо</span><b id="pp-${r.id}">—</b></div></div>
      <div class="grid"><label>Кафолат (рӯз)<input id="d-war-${r.id}" type="number" min="0" value="${esc(r.warrantyDays||'')}" placeholder="0"></label><label>Эзоҳ ба муштарӣ<input id="d-onote-${r.id}" value="${esc(r.offerNote||'')}" placeholder="Мӯҳлат: 2 рӯз"></label></div>
      <div><button class="btn pri" data-act="offer" data-id="${r.id}">${r.status==='offered'?'Нархи навро ба муштарӣ фиристодан':'Ба муштарӣ фиристодан'}</button></div></div>`:'';
    const ph0=custPhone(r);
    const msgCard=ph0?`<div class="card"><h3>Хабар ба муштарӣ (WhatsApp)</h3><div class="wa">${esc(custMsg(r))}</div><div class="bar"><a class="btn ${['offered',...SOLD].includes(r.status)?'pri':''}" href="${waLink(ph0,custMsg(r))}" target="_blank" rel="noopener">Дар WhatsApp фиристодан</a><button class="btn" data-act="copytxt" data-v="cm-${r.id}">Нусха</button></div><textarea id="cm-${r.id}" hidden>${esc(custMsg(r))}</textarea></div>`:'';
    const top=['found','offered'].includes(r.status);
    const custAns=r.status==='offered'?`<div class="card pricing confirm-c"><h3>Тасдиқи заказ</h3><div class="small muted">Агар муштарӣ дар сайт набошад (масалан дархостро шумо гузоштед ё ӯ дар WhatsApp ҷавоб дод), заказро аз номи ӯ тасдиқ кунед.</div>
      <div class="bal"><div><span>Муштарӣ</span><b style="font-family:var(--body)">${esc(custName(r)||'—')}</b></div><div><span>Нарх</span><b>${money(r.price)}</b></div></div>
      <div class="bar"><button class="btn ok" data-act="adm-accept" data-id="${r.id}">✓ Муштарӣ қабул кард — заказ</button><button class="btn bad" data-act="adm-decline" data-id="${r.id}">✕ Рад кард</button></div></div>`:'';
    put('confirm',custAns);if(top)put('offer',priceCard+(r.status==='offered'?msgCard:''));
    if(['ordered','shipped'].includes(r.status)){const stg=['assigned','bought','packed','shipped'],cur=r.status==='shipped'?3:Math.max(0,stg.indexOf(r.ordStage||'assigned'));
      put('oworker',`<div class="card pricing"><h3>${r.orderWorkerId?'Заказ: масъул ва ҳолат':'Заказ омад — масъулро интихоб кунед'}</h3><div class="small muted">Масъул молро аз паставшик мегирад, бастабандӣ мекунад ва ба карго месупорад.</div>
        ${ws.length?`<div class="pick">${ws.map(([wid,u])=>crewBtn(wid,u,r.orderWorkerId===wid,'assignord',`data-id="${r.id}"`)).join('')}</div>`:'<div class="small muted">Аввал дар «Одамон» коргар илова кунед.</div>'}
        ${r.orderWorkerId?`<div class="steps">${stg.map((_,i)=>`<i class="${i<=cur?'on':''}"></i>`).join('')}</div><div class="steps-l">${stg.map((s,i)=>`<span class="${i===cur?'on':''}">${['Супорида','Гирифта','Баста','Дар карго'][i]}</span>`).join('')}</div>`:''}
        ${r.cargo||r.tracking?`<div class="small">Карго: <b>${esc(r.cargo||'—')}</b>${r.tracking?' · '+esc(r.tracking):''}</div>`:''}</div>`)}
    if(ACTIVE.slice(0,4).includes(r.status)||r.status==='notfound')put('worker',`<div class="card"><h3>Масъулро интихоб кунед</h3>${ws.length?`<div class="pick">${ws.map(([id,u])=>crewBtn(id,u,r.workerId===id,'assignto',`data-id="${r.id}"`)).join('')}</div>`:'<div class="small muted">Аввал дар қисми «Одамон» коргар илова кунед.</div>'}
      <div class="small muted">Ё ба тамоми гурӯҳ фиристед — ҳар коргари гурӯҳ гирифта метавонад:</div>
      <div class="bar"><select id="d-group-${r.id}" style="flex:1;width:auto">${Object.entries(GRP).map(([k,l])=>`<option value="${k}" ${g0===k?'selected':''}>${l}</option>`).join('')}</select><button class="btn" data-act="assign" data-id="${r.id}">Ба гурӯҳ</button></div></div>`);
    put('quotes',quotesHtml(r,v,true));
    if(!top)put('offer',priceCard);
    if(SOLD.includes(r.status)){
      const cw=comWorker(r),cands=[...new Set([r.workerId,r.orderWorkerId].filter(Boolean))];
      const pct=r.comPct!=null?r.comPct:wPct(cw),amt=r.com!=null?r.com:comSug(r,pct);
      if(+r.cost>0)put('profit',`<div class="card"><h3>Фоидаи ин заказ</h3><div class="bal"><div><span>Фурӯш</span><b>${money(r.price)}</b></div><div><span>Харид</span><b>${money(r.cost)}</b></div><div><span>Музди коргар</span><b>${hasCom(r)?money(r.com):'—'}</b></div><div class="ok-b"><span>Фоидаи соф</span><b>${money(netOf(r))}</b></div></div></div>`);
      put('profit',`<div class="card"><h3>Инвойс</h3><div class="small muted">Ҳисобнома барои муштарӣ — чоп, PDF ё фиристодан.</div><div><button class="btn" data-act="inv" data-id="${r.id}">🧾 Инвойсро кушодан</button></div></div>`);
      put('com',`<div class="card pricing"><h3>Музди коргар</h3>${!(+r.cost>0)?'<div class="small muted">Аввал нархи харидро ворид кунед — музд аз фоида ҳисоб мешавад.</div>':!cw?'<div class="small muted">Дар ин заказ коргар нест.</div>':`
        <div class="bal"><div><span>Фоидаи заказ</span><b>${money(profitOf(r))}</b></div><div><span>Коргар</span><b style="font-family:var(--body)">${esc(uname(cw))}</b></div><div class="${r.comPaid?'ok-b':hasCom(r)?'due-b':''}"><span>Ҳолат</span><b style="font-family:var(--body)">${r.comPaid?'Пардохт шуд':hasCom(r)?'Бояд диҳед':'Муайян нашуд'}</b></div></div>
        ${cands.length>1?`<label>Ба кадом коргар<select id="c-w-${r.id}">${cands.map(w=>`<option value="${w}" ${w===cw?'selected':''}>${esc(uname(w))}</option>`).join('')}</select></label>`:''}
        <div class="grid"><label>Фоиз аз фоида (%)<input id="c-pct-${r.id}" data-cpct="${r.id}" data-profit="${profitOf(r)}" type="number" min="0" max="100" step="0.5" value="${pct}"></label><label>Музд (${esc(C.cur)})<input id="c-amt-${r.id}" type="number" min="0" step="0.01" value="${amt}"></label></div>
        <div class="bar">${[5,10,15,20].map(p=>`<button class="chip" data-act="cpctq" data-id="${r.id}" data-v="${p}" style="height:32px">${p}%</button>`).join('')}</div>
        <div class="bar">${r.comPaid?`<span class="small">Пардохт шуд: <b>${money(r.com)}</b> · ${fmt(r.comPaidAt)}</span><button class="btn" data-act="unpaycom" data-id="${r.id}">Бекор кардани пардохт</button>`
          :`<button class="btn" data-act="setcom" data-id="${r.id}">Сабт кардан</button><button class="btn ok" data-act="paycom" data-id="${r.id}">Сабт ва пардохт кардам</button>`}</div>`}</div>`);
    }
    if(SOLD.includes(r.status)||r.status==='returned'){
      const pays=(r.payments||[]);
      put('pay',`<div class="card"><h3>Пардохт</h3><div class="bal"><div><span>Ҷамъ</span><b>${money(r.price)}</b></div><div class="ok-b"><span>Пардохт шуд</span><b>${money(paidOf(r))}</b></div><div class="${balOf(r)?'due-b':''}"><span>Боқимонда</span><b>${money(balOf(r))}</b></div></div>
        ${pays.length?`<div>${pays.map((p,pi)=>`<div class="pay"><span>${fmt(p.t)} · ${p.cur&&p.cur!==C.cur?num(p.orig)+' '+esc(p.cur)+' ÷ '+p.rate:''} ${esc(p.note||'')}</span><span class="bar"><b class="price">${money(p.a)}</b>${S.confirmPayDel===r.id+'-'+pi?`<button class="btn bad" style="height:30px" data-act="delpay" data-id="${r.id}" data-v="${pi}">Ҳа, нест</button>`:`<button class="itbtn" data-act="delpay" data-id="${r.id}" data-v="${pi}" aria-label="Нест кардан" title="Нест кардан">✕</button>`}</span></div>`).join('')}</div>`:''}
        ${paidOf(r)>(+r.price||0)+0.009?`<div class="alert bad-a">Зиёд пардохт шудааст: ${money(paidOf(r)-(+r.price||0))}. Пардохти такрориро бо ✕ нест кунед.</div>`:''}
        ${r.status!=='returned'&&balOf(r)<=0&&+r.price>0?`<div class="paid-full">✓ Пурра пардохт шуд</div>`:''}
        ${r.status!=='returned'&&balOf(r)>0?`<div class="grid"><label>Маблағ (то ${num(balOf(r))})<input id="p-amt-${r.id}" type="number" step="0.01" min="0" value="${balOf(r)||''}"></label><label>Асъор<select id="p-cur-${r.id}"><option value="${esc(C.cur)}">${esc(C.cur)}</option>${C.cur2?`<option value="${esc(C.cur2)}">${esc(C.cur2)}</option>`:''}</select></label>${C.cur2?`<label>Курс (${esc(C.cur2)} барои 1 ${esc(C.cur)})<input id="p-rate-${r.id}" type="number" step="0.01" min="0" value="${S.lastRate||C.rate2}"></label>`:''}<label>Эзоҳ<input id="p-note-${r.id}" placeholder="Нақд, корт, Алиф…"></label></div><div><button class="btn ok" data-act="addpay" data-id="${r.id}">Пардохтро сабт кардан</button></div>`:''}</div>`);
      if(r.status!=='returned')put('extra',`<details class="card dt" data-k="ret" ${S.det.ret?'open':''}><summary><h3>Расонидан ва бозгашт</h3></summary>
        ${r.status==='ordered'?`<div class="bar"><input id="t-trk-${r.id}" placeholder="Рақами пайгирӣ / ронанда" value="${esc(r.tracking||'')}" style="flex:1"><button class="btn" data-act="ship" data-id="${r.id}">Дар роҳ</button></div>`:''}
        ${['ordered','shipped'].includes(r.status)?`<div><button class="btn ok" data-act="deliver" data-id="${r.id}">Ба муштарӣ дода шуд</button></div>`:''}
        ${r.status==='delivered'?`<div class="small muted">Дода шуд: ${fmt(r.deliveredAt)}${r.warrantyDays?' · кафолат то '+fdate(r.deliveredAt+r.warrantyDays*864e5):''}</div>`:''}
        <div class="bar"><input id="ret-${r.id}" placeholder="Сабаби бозгашт (қисми нодуруст, вайрон…)" style="flex:1"><button class="btn bad" data-act="return" data-id="${r.id}">Баргашт</button></div></details>`);
    }
    put('extra2',`<details class="card dt" data-k="man" ${S.det.man?'open':''}><summary><h3>Тағйири дастӣ</h3></summary><div class="bar"><select id="d-status-${r.id}" style="width:auto;flex:1">${ORDER.map(s=>`<option value="${s}" ${r.status===s?'selected':''}>${ST[s].l}</option>`).join('')}</select><button class="btn" data-act="setstatus" data-id="${r.id}">Ҳолат</button></div>
      <div class="bar"><input id="d-cost-${r.id}" type="number" step="0.01" min="0" placeholder="Нархи харид ${esc(C.cur)}" value="${esc(r.cost??'')}" style="flex:1"><button class="btn" data-act="setcost" data-id="${r.id}">Нархи харид</button></div>
</details>
      <details class="card dt" data-k="del" ${S.det.del?'open':''}><summary><h3>Нест кардан</h3></summary><div class="small muted">Дархост аз ҳама ҷо нест мешавад — аз панели роҳбар, коргар ва муштарӣ. Инро баргардондан мумкин нест.</div>
      <div class="bar"><button class="btn bad" data-act="delreq" data-id="${r.id}">${S.confirmDel===r.id?'Ҳа, тамоман нест кун':'Дархостро нест кардан'}</button>${S.confirmDel===r.id?`<button class="btn" data-act="delno">Не</button>`:''}</div></details>`);
    if(r.status==='shipped'&&ph0){const gp=(r.photos||[]).filter(p=>p.k==='g');
      put('send',`<div class="card pricing"><h3>Ба муштарӣ фиристодан</h3>
        <div class="shipinfo"><div><span>Карго</span><b>${esc(r.cargo||'—')}</b></div><div><span>Рақами карго</span><b>${esc(r.tracking||'—')}</b></div><div><span>Вазн</span><b>${+r.weight?r.weight+' кг':'—'}</b></div><div><span>Рӯзи супоридан</span><b>${r.deliverBy?fdate(r.deliverBy):'—'}</b></div></div>
        ${gp.length?photosHtml({photos:gp}):'<div class="warn-note">Акси бор нест.</div>'}
        <details class="dt"><summary class="small" style="font-weight:700">Вазн ё санаро иваз кардан</summary><div class="grid"><label>Вазн (кг)<input id="a-kg-${r.id}" type="number" min="0" step="0.1" value="${r.weight||''}"></label><label>Рӯзи супоридан<input id="a-dd-${r.id}" type="date" value="${r.deliverBy?isoD(r.deliverBy):''}"></label></div><div><button class="btn" data-act="shipinfo" data-id="${r.id}">Сабт</button></div></details>
        <div class="small muted">Дар паём инвойс, карго, рақам, вазн, рӯзи супоридан ва пайванд ба сайт (акси бор ва инвойс) ҳаст. Барои акс: инвойсро кушоед → «Ба WhatsApp», ё аксро аз ин ҷо нигоҳ дошта фиристед.</div>
        <div class="bar"><a class="btn pri" data-act="sentcust" data-id="${r.id}" href="${waLink(ph0,custMsg(r))}" target="_blank" rel="noopener">📲 Ба муштарӣ фиристодан</a><button class="btn" data-act="inv" data-id="${r.id}">🧾 Инвойс</button></div>
        ${r.sentToCustAt?`<div class="small" style="color:var(--ok)">✓ Фиристода шуд: ${fmt(r.sentToCustAt)}</div>`:''}</div>`)}
    else if(r.status!=='offered')put('extra',msgCard);
    act=admSteps(r,SL);
  }
  if(v==='worker'){
    if(actIds().includes(r.orderWorkerId)&&['ordered','shipped'].includes(r.status)){const st=r.ordStage||'assigned';
      act+=`<div class="card pricing"><h3>Заказ: тайёр кардан ва ба карго</h3>
        <div class="bal"><div><span>Паставшик</span><b style="font-family:var(--body)">${esc(r.supplier||'—')}</b></div>${r.supplierPhone?`<div><span>Телефон</span><b><a class="link" href="${waLink(r.supplierPhone,'Салом! Барои заказ №'+r.code+':\n'+waText(r))}" target="_blank" rel="noopener">${esc(r.supplierPhone)}</a></b></div>`:''}${r.cost?`<div><span>Нархи харид</span><b>${money(r.cost)}</b></div>`:''}</div>
        <div class="small">Ҳолат: <b>${esc(r.status==='shipped'?OST.shipped:OST[st])}</b></div>
        ${r.status==='shipped'?`<div class="small">Карго: <b>${esc(r.cargo||'—')}</b>${r.tracking?' · '+esc(r.tracking):''}${+r.weight?' · '+r.weight+' кг':''}${r.deliverBy?' · то '+fdate(r.deliverBy):''}</div>${photosHtml({photos:(r.photos||[]).filter(p=>p.k==='g')})}<label class="upl">${ICON_CAM}Боз акс илова кардан<input type="file" accept="image/*" multiple data-up="${r.id}" data-kind="g"></label>`:''}
        ${r.status==='ordered'?`<div class="bar">${st==='assigned'?`<button class="btn pri" data-act="ostage" data-id="${r.id}" data-v="bought">Аз паставшик гирифтам</button>`:''}${st==='bought'?`<button class="btn pri" data-act="ostage" data-id="${r.id}" data-v="packed">Бастабандӣ шуд</button>`:''}</div>
        ${st==='packed'?`<div class="cargo-ph"><div class="small" style="font-weight:700">1. Акси бор дар карго ${(r.photos||[]).some(p=>p.k==='g')?'<span class="best">гузошта шуд ✓</span>':'<span class="warn-note">(ҳатмӣ)</span>'}</div>${photosHtml({photos:(r.photos||[]).filter(p=>p.k==='g')})}<label class="upl">${ICON_CAM}Акси бор / накладной<input type="file" accept="image/*" capture="environment" multiple data-up="${r.id}" data-kind="g"></label></div><div class="small" style="font-weight:700">2. Маълумоти карго</div><div class="grid"><label>Номи карго<input id="o-cargo-${r.id}" value="${esc(r.cargo||'')}" placeholder="Масалан: Cargo Dushanbe"></label><label>Рақами карго / накладной<input id="o-trk-${r.id}" value="${esc(r.tracking||'')}"></label><label>Вазни бор (кг)<input id="o-kg-${r.id}" type="number" min="0" step="0.1" inputmode="decimal" value="${r.weight||''}"></label><label>Рӯзи супоридан ба муштарӣ<input id="o-dd-${r.id}" type="date" value="${r.deliverBy?isoD(r.deliverBy):''}"></label></div><div><button class="btn ok" data-act="ocargo" data-id="${r.id}">Ба карго супоридам</button></div>`:''}`:''}</div>`;}
    if(r.status==='assigned'&&(!r.workerId||isMine))act+=`<div class="card"><h3>Кор</h3><div><button class="btn pri" data-act="take" data-id="${r.id}">Ба кор гирифтан</button></div></div>`;
    if(['searching','found'].includes(r.status)&&isMine){
      if((r.quotes||[]).length)act+=quotesHtml(r,v,'list');
      if(r.status==='searching'&&!(r.quotes||[]).length)act+=`<div class="card locked"><h3>🔒 Натиҷа</h3><div class="small muted">Аввал нархи паставшикро дар «Қисмҳо ва нарх» сабт кунед — баъд «Ёфт шуд» кушода мешавад.</div></div>`;
      else if(r.status==='searching')act+=`<div class="card"><h3>Натиҷа</h3><label>Эзоҳ ба роҳбар<input id="w-note-${r.id}" value="${esc(r.workerNote||'')}" placeholder="Сифат, мӯҳлат, оригинал/копия"></label>
        <div class="bar"><button class="btn ok" data-act="found" data-id="${r.id}" ${(r.quotes||[]).length?'':'disabled'}>Ёфт шуд</button><button class="btn bad" data-act="notfound" data-id="${r.id}">Ёфт нашуд</button></div>${(r.quotes||[]).length?'':'<div class="small muted">Барои «Ёфт шуд» камаш як нарх илова кунед.</div>'}</div>`;
      else act+=`<div class="note">Роҳбар нархро интихоб мекунад ва ба муштарӣ мефиристад.</div>`;
    }else if((r.quotes||[]).length&&isMine)act+=quotesHtml(r,v,false);
  }
  const wa=`<details class="card dt" data-k="wa" ${S.det.wa?'open':''}><summary><h3>Матн барои паставшик (WhatsApp)</h3></summary><div class="wa" id="wa-${r.id}">${esc(waText(r))}</div><div class="bar"><button class="btn" data-act="copy" data-id="${r.id}">Нусха гирифтан</button><a class="btn" href="https://wa.me/?text=${encodeURIComponent(waText(r))}" target="_blank" rel="noopener">WhatsApp кушодан</a></div></details>`;
  const logs=r.log.concat(r.plog).sort((a,b)=>b.t-a.t);
  const log=`<details class="card dt" data-k="log" ${S.det.log?'open':''}><summary><h3>Таърих</h3></summary><ul class="log">${logs.map(l=>`<li><time>${fmt(l.t)}</time><span>${esc(l.s)} <span class="muted">· ${esc(uname(l.by))}</span></span></li>`).join('')}</ul></details>`;
  return`<div class="sheet-bg" data-act="close"><div class="sheet" role="dialog" aria-modal="true" data-stop="1"><div class="sheet-h"><span class="tag">${esc(r.code)}</span>${pill(r.status)}<span class="urg ${r.urgency||'d3'}">${URG[r.urgency||'d3'].l}</span><button class="x" data-act="close" aria-label="Пӯшидан">×</button><div class="ttl">${esc(titleOf(r))}</div></div>
    <div class="card">${info}</div>${v==='worker'?wStepsHtml(r,isMine):''}${wPriceMode?`<div class="card pricing"><h3>Қисмҳо ва нарх</h3>${quoteForm(r,false)}</div>`:`<div class="card"><h3>Қисмҳо</h3>${itemsBox}${mg}</div>`}<div class="card"><h3>Аксҳо</h3>${photos}</div>${act}${wa}${log}</div></div>`;
}

function invoiceView(){
  if(!S.inv)return'';const r=S.reqs.find(x=>x.id===S.inv);if(!r)return'';
  const its=itemsOf(r).filter(i=>!i.off),d=new Date(r.orderedAt||r.offeredAt||r.createdAt);
  const no='INV-'+r.code;const ph=custPhone(r);
  const rows=its.map((it,k)=>`<tr><td>${k+1}</td><td><b>${esc(it.code||'')}</b>${it.code&&it.n&&it.n!==it.code?'<br>':''}${it.n&&it.n!==it.code?esc(it.n):''}</td><td class="c">${it.q||1}</td><td class="m">${it.price?num(it.price):'—'}</td></tr>`).join('');
  const txt=`${C.name}\nИнвойс ${no} · ${p2(d.getDate())}.${p2(d.getMonth()+1)}.${d.getFullYear()}\n${its.map((it,k)=>(k+1)+') '+inm(it)+(it.q>1?' × '+it.q:'')+(it.price?' — '+money(it.price):'')).join('\n')}\nҶамъ: ${money(r.price)}\nПардохт шуд: ${money(paidOf(r))}\nБоқимонда: ${money(balOf(r))}`;
  return`<div class="invwrap"><button class="inv-x" data-act="invclose" aria-label="Пӯшидан">✕</button><div class="inv" id="inv">
    <div class="inv-h"><div class="inv-co">${logoHtml()}<div><b>${esc(C.name)}</b><small>${esc(C.tagline||'')}${C.phone?' · '+esc(C.phone):''}</small></div></div><div class="inv-no"><b>ИНВОЙС</b><span>${no}</span><span>${p2(d.getDate())}.${p2(d.getMonth()+1)}.${d.getFullYear()}</span></div></div>
    <div class="inv-to"><div><span>Муштарӣ</span><b>${esc(custName(r)||'—')}</b>${ph?`<small>${esc(ph)}</small>`:''}</div><div><span>${esc(C.f1s||'Мошин')}</span><b>${r.car&&r.car!=='—'?esc(r.car+' '+(r.year||'')):'—'}</b>${r.vin?`<small>${esc(C.f3)}: ${esc(r.vin)}</small>`:''}</div></div>
    <table class="inv-t"><thead><tr><th>#</th><th>Қисм</th><th class="c">Миқдор</th><th class="m">Нарх (${esc(C.cur)})</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="inv-sum"><div><span>Ҷамъ</span><b>${money(r.price)}</b></div><div><span>Пардохт шуд</span><b>${money(paidOf(r))}</b></div><div class="due"><span>Боқимонда</span><b>${money(balOf(r))}</b></div></div>
    ${r.warrantyDays?`<div class="inv-note">Кафолат: ${r.warrantyDays} рӯз${r.deliveredAt?' (то '+fdate(r.deliveredAt+r.warrantyDays*864e5)+')':''}</div>`:''}
    <div class="inv-foot">Ташаккур барои харид! · ${esc(C.name)}</div></div>
    <div class="bar inv-act"><button class="btn pri" data-act="invprint">Чоп / PDF</button>${ph?`<a class="btn" href="${waLink(ph,txt)}" target="_blank" rel="noopener">Ба WhatsApp</a>`:''}<button class="btn" data-act="invclose">Пӯшидан</button></div></div>`;
}
function body(){
  if(S.denied)return`<div class="login"><div class="card"><h2>Дастрасӣ нест</h2><p class="muted" style="margin:0">${esc(S.denied)}</p><div><button class="btn" data-act="logout">Баромадан</button></div></div></div>`;
  if(!S.authReady||!S.ready)return`<div class="empty"><b>${S.slow?'Пайвастшавӣ суст аст':'Бор шуда истодааст…'}</b>${S.slow?'<span class="small">Интернетро санҷед; саҳифа худаш боз кӯшиш мекунад.</span>':''}</div>`;
  return{admin:adminView,worker:workerView,customer:customerView,onboard:onboardView}[view()]();
}
if(typeof window!=='undefined')window.addEventListener('popstate',()=>{if(S._ign){S._ign--;return}
  const d=(S.open?1:0)+(S.inv?1:0)+(S.pick?1:0)+(S.lb?1:0);if(!d)return;
  if(S.lb)S.lb=null;else if(S.inv)S.inv=null;else if(S.pick)S.pick=null;else if(S.open){S.open=null;S.confirmDel=null;S.editIt=null;S.qEdit=null}
  S._fromPop=true;S._depth=d-1;render()});
function render(){
  const keep={};app.querySelectorAll('input[id],select[id],textarea[id]').forEach(e=>{if(['q','fg','aw'].includes(e.id)||(S.skipQ&&e.id.startsWith('q-'))||e.type==='file'||e.tagName==='TEXTAREA'&&e.hidden)return;keep[e.id]=e.type==='radio'||e.type==='checkbox'?e.checked:e.value});
  S.skipQ=false;
  const files=document.getElementById('n-photo')?.files||null;
  const f=document.activeElement&&document.activeElement.id;
  const sc=app.querySelector('.sheet')?.scrollTop||0;
  const opn=[...app.querySelectorAll('details[id]')].filter(d=>d.open).map(d=>d.id);
  app.innerHTML=header()+`<main class="wrap">${body()}</main>`+sheet()+(S.lb?`<div class="lb" data-act="lbclose"><img data-pid="${esc(S.lb)}" src="${S.ph[S.lb]||PH_PLACE}" alt="Акс"></div>`:'')+invoiceView()+pickerView()+(S.toast?`<div class="toast" role="status">${esc(S.toast)}</div>`:'');
  for(const id in keep){const e=document.getElementById(id);if(!e)continue;if(e.type==='radio'||e.type==='checkbox')e.checked=keep[id];else e.value=keep[id]}
  if(files&&files.length){const e=document.getElementById('n-photo');if(e){try{e.files=files}catch(_){}const n=document.getElementById('n-photo-n');if(n)n.textContent=files.length+' акс интихоб шуд'}}
  const sh=app.querySelector('.sheet');if(sh)sh.scrollTop=sc;
  opn.forEach(id=>{const d=document.getElementById(id);if(d)d.open=true});
  codesList();
  try{const d=(S.open?1:0)+(S.inv?1:0)+(S.pick?1:0)+(S.lb?1:0),pd=S._depth||0;
    if(d>pd)for(let i=pd;i<d;i++)history.pushState({ov:i+1},'');
    else if(d<pd&&!S._fromPop){S._ign=(S._ign||0)+(pd-d);history.go(-(pd-d))}
    S._depth=d;S._fromPop=false}catch(_){}
  app.querySelectorAll('[id^="q-tot-"]').forEach(e=>qTotals(e.id.slice(6)));
  app.querySelectorAll('.pipe-wrap').forEach(w=>{const on=w.querySelector('.st.on');if(!on)return;const a=on.getBoundingClientRect(),b=w.getBoundingClientRect();if(a.right>b.right)w.scrollLeft+=a.right-b.right+8;else if(a.left<b.left)w.scrollLeft-=b.left-a.left+8});
  if(S.open)calcPP(S.open);
  fillPhotos();
  if(f){const e=document.getElementById(f);if(e){e.focus();if(e.id==='q'){const n=e.value.length;try{e.setSelectionRange(n,n)}catch(_){}}}}
}

/* ===== writes ===== */
const qd={};
function queued(id,fn){qd[id]=(qd[id]||Promise.resolve()).then(fn,fn);return qd[id]}
async function upd(id,patch,txt,silent){
  if(patch&&patch.status&&view()==='worker')S.lastMoved={id,st:patch.status,t:Date.now()};
  const r=S.reqs.find(x=>x.id===id);if(!r)return false;
  const pub={},priv={};for(const k in patch)(PRIV_KEYS.includes(k)?priv:pub)[k]=patch[k];
  const entry={t:Date.now(),by:actor(),s:txt};
  const hasPriv=Object.keys(priv).length>0;
  try{
    await queued(id,async()=>{
      if(Object.keys(pub).length||!hasPriv){pub.updatedAt=Date.now();if(!hasPriv)pub.log=(r.log||[]).concat([entry]).slice(-50);await updateDoc(doc(db,'requests',id),pub)}
      if(hasPriv){priv.workerId=('workerId' in pub?pub.workerId:r.workerId)||null;priv.log=(r.plog||[]).concat([entry]).slice(-50);await setDoc(doc(db,'priv',id),priv,{merge:true})}
    });
    if(!silent)toast(txt);return true;
  }catch(e){toast('Сабт нашуд: '+errTxt(e));return false}
}
const val=id=>{const e=document.getElementById(id);return e?e.value.trim():''};
const fnum=id=>{const v=parseFloat(val(id));return isFinite(v)?v:null};
function calcPP(id){
  const r=S.reqs.find(x=>x.id===id);const pt=document.getElementById('pt-'+id),pp=document.getElementById('pp-'+id);if(!r||!pt)return;
  let sum=0,any=false;document.querySelectorAll('[data-pp="'+id+'"]').forEach(el=>{const v=parseFloat(el.value);if(isFinite(v)){sum+=v;any=true}});
  pt.textContent=any?money(sum):'—';
  if(pp){if(any&&r.cost){const p=sum-r.cost;pp.textContent=money(Math.round(p*100)/100)+(sum?' · '+Math.round(p/sum*100)+'%':'');pp.style.color=p<0?'var(--bad)':''}else pp.textContent='—'}
}

document.addEventListener('input',e=>{if(e.target.id==='n-codes'){codesList();return}if(e.target.id==='cq2'||e.target.id==='iq'){S[e.target.id]=e.target.value;const p=e.target.selectionStart;render();const x=document.getElementById(e.target.id);if(x){x.focus();try{x.setSelectionRange(p,p)}catch(_){}}return}if(e.target.dataset&&e.target.dataset.qsum){const id=e.target.dataset.qsum;qTotals(id);return}if(e.target.dataset&&e.target.dataset.cpct){const id=e.target.dataset.cpct,p=parseFloat(e.target.value)||0,pr=+e.target.dataset.profit||0;const a=document.getElementById('c-amt-'+id);if(a)a.value=Math.round(Math.max(0,pr)*p/100*100)/100;return}if(e.target.classList&&e.target.classList.contains('cqin')){S.cq=S.cq||{};S.cq[e.target.dataset.code]=Math.max(1,parseInt(e.target.value)||1);return}});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-cq]');if(!b)return;e.preventDefault();const inp=b.parentNode.querySelector('.cqin');const v=Math.max(1,(parseInt(inp.value)||1)+(+b.dataset.cq));inp.value=v;S.cq=S.cq||{};S.cq[b.dataset.code]=v},true);
document.addEventListener('input',e=>{if(e.target.id==='q'){S.q=e.target.value;render()}else if(e.target.dataset&&e.target.dataset.pp)calcPP(e.target.dataset.pp)});
document.addEventListener('submit',async e=>{
  e.preventDefault();const fid=e.target.id;
  if(fid==='f-clogin'){
    const name=val('o-name'),dg=digits(val('o-phone'));
    if(!name){S.loginErr='Номатонро нависед.';render();return}
    if(dg.length<7||dg.length>15){S.loginErr='Рақами WhatsApp-ро пурра бо коди кишвар нависед (масалан +971 50 123 4567).';render();return}
    const id='c-'+dg;S.busy=true;S.loginErr='';render();
    try{
      const cred=auth.currentUser&&auth.currentUser.isAnonymous?{user:auth.currentUser}:await signInAnonymously(auth);
      await setDoc(doc(db,'sessions',cred.user.uid),{cid:id,t:Date.now()});
      const cs=await getDoc(doc(db,'customers',id));
      if(!cs.exists())await setDoc(doc(db,'customers',id),{name,phone:'+'+dg,createdAt:Date.now()});
      S.busy=false;await startCustomer(id);S.custLogged=true;startPresence('login');toast('Хуш омадед, '+((cs.exists()&&cs.data().name)||name));
    }catch(err){S.busy=false;S.loginErr='Ворид шуда нашуд ('+errTxt(err)+'). Интернетро санҷед ва боз кӯшиш кунед.';render()}
    return;
  }
  if(fid==='f-login'){
    const lg=cleanLogin(val('l-login')),pw=document.getElementById('l-pass').value;if(!lg||!pw)return;
    S.busy=true;S.loginErr='';render();
    try{S.justLogged=true;await signInWithEmailAndPassword(auth,lg+'@'+WORKER_DOMAIN,pw);S.busy=false;const x=document.getElementById('l-pass');if(x)x.value=''}
    catch(err){S.busy=false;const c=err.code||'';S.loginErr=c.includes('too-many')?'Бисёр кӯшиш шуд. Чанд дақиқа интизор шавед.':c.includes('network')?'Интернет нест.':'Логин ё парол нодуруст аст.';render()}
    return;
  }
  if(fid==='f-addw'||fid==='f-cred'){
    const isNew=fid==='f-addw';
    const lg=cleanLogin(val(isNew?'aw-login':'c-login')),pw=document.getElementById(isNew?'aw-pass':'c-pass').value;
    if(lg.length<3){toast('Логин бояд камаш 3 ҳарфи лотинӣ бошад');return}
    if(pw.length<6){toast('Парол бояд камаш 6 рамз бошад');return}
    if(Object.values(S.workers).some(w=>w.login===lg)){toast('Ин логин банд аст. Логини дигар нависед.');return}
    const name=isNew?val('aw-name'):'';if(isNew&&!name){toast('Номи коргарро нависед');return}
    S.busy=true;render();
    try{
      const sa=secondaryAuth();const cr=await createUserWithEmailAndPassword(sa,lg+'@'+WORKER_DOMAIN,pw);const uid=cr.user.uid;await signOut(sa);
      if(isNew){const wid='w-'+(translit(name)||'w')+'-'+Date.now().toString(36).slice(-4);
        await setDoc(doc(db,'workers',wid),{name,phone:val('aw-phone'),group:val('aw-group')||'all',login:lg,uid,active:true,createdAt:Date.now()});
        await setDoc(doc(db,'staff',uid),{wid});
        ['aw-name','aw-phone','aw-login','aw-pass'].forEach(i=>{const x=document.getElementById(i);if(x)x.value=''});
        S.busy=false;toast('Коргар илова шуд. Логин: '+lg+' · Парол: '+pw);
      }else{const wid=e.target.dataset.id,w=S.workers[wid]||{};
        if(w.uid)await deleteDoc(doc(db,'staff',w.uid)).catch(()=>{});
        await setDoc(doc(db,'staff',uid),{wid});await updateDoc(doc(db,'workers',wid),{login:lg,uid});
        S.credFor=null;S.busy=false;toast('Сабт шуд. Логин: '+lg+' · Парол: '+pw);
      }
    }catch(err){S.busy=false;const c=err.code||'';toast(c.includes('email-already-in-use')?'Ин логин аллакай истифода шудааст. Логини дигар нависед.':c.includes('weak-password')?'Парол суст аст (камаш 6 рамз).':'Сабт нашуд: '+errTxt(err))}
    return;
  }
  if(fid==='f-adm'){
    const em=val('ad-email').toLowerCase(),nm=val('ad-name');
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){toast('Почтаро дуруст нависед');return}
    if(ADMIN_EMAILS.includes(em)||(S.admins||{})[em]){toast('Ин почта аллакай роҳбар аст');return}
    try{await setDoc(doc(db,'admins',em),{name:nm,email:em,addedAt:Date.now()});['ad-email','ad-name'].forEach(i=>{const x=document.getElementById(i);if(x)x.value=''});toast('Роҳбари нав илова шуд: '+em)}catch(err){toast('Илова нашуд: '+errTxt(err))}
    return;
  }
  if(fid==='f-set'){
    const g=k=>val('s-'+k);const d={name:g('name')||CFG_DEFAULT.name,tagline:g('tagline'),phone:g('phone'),industry:g('industry')||'general',
      f1:g('f1'),f1s:g('f1s')||g('f1'),f1ph:g('f1ph'),f2:g('f2'),f2ph:g('f2ph'),f3:g('f3'),f3ph:g('f3ph'),f3len:Math.max(0,parseInt(g('f3len'))||0),itemPh:g('itemPh'),refHint:g('refHint'),
      needRef:!!document.getElementById('s-needRef')?.checked,g1:g('g1')||'Нав',g2:g('g2')||'Кӯҳна',cur:(g('cur')||'AED').toUpperCase(),cur2:g('cur2').toUpperCase(),rate2:parseFloat(g('rate2'))||0,vat:Math.max(0,parseFloat(g('vat'))||0),logo:C.logo||'',updatedAt:Date.now()};
    S.busy=true;render();
    try{await setDoc(doc(db,'settings','app'),d);S.busy=false;toast('Танзимот сабт шуд')}catch(err){S.busy=false;toast('Сабт нашуд: '+errTxt(err))}
    return;
  }
  if(fid==='f-alogin'){const em=val('a-email').toLowerCase(),pw=document.getElementById('a-pass').value;S.busy=true;S.loginErr='';S.aPw=true;render();
    try{S.justLogged=true;await signInWithEmailAndPassword(auth,em,pw)}catch(err){const c=err.code||'';S.loginErr=c.includes('invalid')||c.includes('wrong')||c.includes('not-found')?'Gmail ё парол нодуруст. Паролро аввал дар Chrome дар ⚙ Танзимот созед.':c.includes('too-many')?'Кӯшиш зиёд шуд. Каме интизор шавед.':'Ворид шуда нашуд: '+(c||'хато')}
    S.busy=false;render();return}
  if(fid==='f-apw'){const p1=document.getElementById('ap-1').value,p2v=document.getElementById('ap-2').value;if(p1.length<6){toast('Парол камаш 6 рамз');return}if(p1!==p2v){toast('Паролҳо якхел нестанд');return}
    const u=auth.currentUser;if(!u||!u.email){toast('Аввал бо Google ворид шавед');return}
    try{if(u.providerData.some(p=>p.providerId==='password'))await updatePassword(u,p1);else await linkWithCredential(u,EmailAuthProvider.credential(u.email,p1));S.hasPw=true;toast('Парол сабт шуд. Дар барнома бо '+u.email+' ворид шавед.');render()}
    catch(err){const c=err.code||'';toast(c.includes('requires-recent-login')?'Барои амният аз сайт бароед, бо Google дубора ворид шавед ва боз кӯшиш кунед.':'Сабт нашуд: '+(c||err.message))}return}
  if(fid==='f-new'){
    const forAdmin=view()==='admin';
    const codesMode=S.fMode==='codes';
    const car=val('n-car')||(codesMode?'—':'');if(!car)return;
    const items=[];for(let i=0;i<S.nItems;i++){const n=val('n-it-'+i),code=val('n-ic-'+i).toUpperCase().replace(/\s+/g,' ').trim();if(n||code){const it={n:n||code,q:Math.max(1,parseInt(val('n-iq-'+i))||1),price:null,off:false};if(code)it.code=code;items.push(it)}}
    const bt=document.getElementById('n-codes');
    let extraNote='';
    if(bt&&bt.value.trim()){const pc=parseCodes(bt.value);pc.items.forEach(it=>items.push({n:it.n||it.code,code:it.code,q:Math.max(1,parseInt((S.cq||{})[it.code])||it.q),price:null,off:false}));extraNote=pc.notes.join(' · ')}
    if(!items.length){toast(codesMode?'Камаш як кодро гузоред':'Номи қисм ё кодашро нависед');return}
    const vin=val('n-vin').toUpperCase().replace(/\s/g,'');
    const fileEl=document.getElementById('n-photo');const files=fileEl?fileEl.files:null;
        const cond=(document.querySelector('input[name="n-cond"]:checked')||{}).value||'any';
    const urg=(document.querySelector('input[name="n-urg"]:checked')||{}).value||'d3';
    S.busy=true;render();
    const ref=doc(collection(db,'requests'));const now=Date.now();
    let custId=forAdmin?null:S.cid,cname='',cphone='';
    if(forAdmin){cname=val('n-cname');const dg=digits(val('n-cphone'));cphone=dg?'+'+dg:'';
      if(dg.length>=7){custId='c-'+dg;if(!S.customers[custId]){try{await setDoc(doc(db,'customers',custId),{name:cname,phone:cphone,createdAt:now})}catch(_){}}}}
    const photos=await uploadFiles(files,forAdmin?'w':'c',ref.id,custId);
    const d={code:String(now).slice(-6),car,year:val('n-year'),items,parts:items.map(i=>inm(i)).join(', '),vin,condition:cond,urgency:urg,note:[val('n-note'),extraNote].filter(Boolean).join(' · '),photos,
      status:'new',group:cond==='any'?null:cond,workerId:null,customerId:custId,customerName:cname,customerPhone:cphone,createdAt:now,updatedAt:now,log:[{t:now,by:actor(),s:'Дархост сохта шуд'}]};
    let priv=null;
    if(forAdmin){const man=document.getElementById('n-man');
      if(man&&man.checked){const cost=fnum('n-cost'),price=fnum('n-price'),sup=val('n-sup');
        if(!(price>0)){S.busy=false;render();toast('Барои закази фаврӣ нархи фурӯшро нависед');return}
        const qid='q'+now.toString(36);
        d.items=items.map((it,i)=>({...it,price:i===0?price:0}));d.status='ordered';d.orderedAt=now;d.offeredAt=now;d.manual=true;d.log.push({t:now,by:actor(),s:'Заказ бе ҷустуҷӯ: '+money(price)});
        priv={quotes:sup||cost?[{id:qid,sup:sup||'—',cost:cost||0,kind:cond==='used'?'used':'orig',by:actor(),t:now}]:[],chosenQ:sup||cost?qid:null,cost:cost||null,supplier:sup,workerId:null,log:[]}}}
    try{await setDoc(ref,d);if(priv)await setDoc(doc(db,'priv',ref.id),priv);
      S.newReq=false;S.nItems=1;S.bulk=false;S.cq={};
      app.querySelectorAll('#f-new input:not([type=radio]):not([type=checkbox]),#f-new textarea').forEach(x=>{if(x.type==='file'){x.value='';return}x.value=x.type==='number'&&x.id.startsWith('n-iq')?'1':''});
      S.busy=false;if(!forAdmin)S.cTab='list';toast('Дархост фиристода шуд')}
    catch(err){S.busy=false;toast('Фиристода нашуд: '+errTxt(err))}
  }
});

document.addEventListener('change',async e=>{
  const t=e.target,a=t.dataset.act;
  if(t.type==='checkbox'&&t.dataset.qsum){qTotals(t.dataset.qsum);return}
  if(t.id==='n-photo'){const n=document.getElementById('n-photo-n');if(n)n.textContent=t.files.length?t.files.length+' акс интихоб шуд':'';return}
  if(t.dataset.up){const id=t.dataset.up,r=S.reqs.find(x=>x.id===id);if(!r||!t.files.length)return;toast('Акс бор шуда истодааст…');
    const kd=t.dataset.kind||(view()==='customer'?'c':'w');const add=await uploadFiles(t.files,kd,id,r.customerId||null);if(add.length)await upd(id,{photos:(r.photos||[]).concat(add)},kd==='g'?'Акси бор дар карго: '+add.length:add.length+' акс илова шуд');return}
  if(t.id==='s-logo'){const fl=t.files&&t.files[0];if(!fl)return;try{const d=await logoData(fl);await setDoc(doc(db,'settings','app'),{logo:d},{merge:true});toast('Логотип сабт шуд')}catch(err){toast('Логотип сабт нашуд: '+errTxt(err))}return}
  if(a==='industry'){const p=PRESETS[t.value];if(p)for(const k of['f1','f1s','f1ph','f2','f2ph','f3','f3ph','f3len','itemPh','refHint','g1','g2']){const x=document.getElementById('s-'+k);if(x)x.value=p[k]??''}const nr=document.getElementById('s-needRef');if(nr&&p)nr.checked=!!p.needRef;return}
  if(a==='fgsel'){S.fGroup=t.value;render();return}
  if(a==='fwsel'){S.fWorker=t.value;render();return}
  if(a==='awsel'){S.asWorker=t.value;S.open=null;render();return}
  if(t.dataset&&t.dataset.wpct){const v=parseFloat(t.value);if(!(v>=0&&v<=100)){toast('Фоиз аз 0 то 100');return}try{await updateDoc(doc(db,'workers',t.dataset.wpct),{comPct:v});toast('Фоизи музд: '+v+'%')}catch(err){toast('Сабт нашуд: '+errTxt(err))}return}
  if(a==='wgroup'){const wid=t.dataset.id,w=S.workers[wid]||{};
    try{if(t.value==='removed'){await updateDoc(doc(db,'workers',wid),{active:false});if(w.uid)await deleteDoc(doc(db,'staff',w.uid));toast('Коргар хориҷ шуд: '+w.name)}
      else{await updateDoc(doc(db,'workers',wid),{group:t.value});toast('Гурӯҳ иваз шуд')}}catch(err){toast('Сабт нашуд: '+errTxt(err))}return}
});

document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b||b.tagName==='SELECT')return;
  if(b.classList.contains('sheet-bg')&&e.target.closest('[data-stop]'))return;
  const a=b.dataset.act,id=b.dataset.id,r=id&&S.reqs.find(x=>x.id===id);
  switch(a){
    case'view':S.view=b.dataset.v;S.open=null;S.newReq=false;break;
    case'gotoset':S.view='admin';S.open=null;S.newReq=false;S.adminTab=S.adminTab==='set'?'req':'set';render();scrollTo(0,0);return;
    case'atab':S.adminTab=b.dataset.v;render();scrollTo(0,0);return;
    case'rtab':S.repTab=b.dataset.v;break;
    case'fs':S.fStatus=b.dataset.v;break;
    case'wt':S.wTab=b.dataset.v;S.wTabSet=true;break;
    case'open':S.open=id;S.confirmDel=null;break;
    case'close':S.open=null;S.qOpen=null;break;
    case'ctab':S.cTab=b.dataset.v;render();scrollTo(0,0);return;
    case'qopen':S.qOpen=id;render();setTimeout(()=>{const x=document.getElementById('q-sup-'+id);if(x)x.focus()},20);return;
    case'qclose':S.qOpen=null;break;
    case'lb':S.lb=b.dataset.v;break;
    case'lbclose':S.lb=null;break;
    case'itedit':S.editIt={id,i:+b.dataset.v};render();setTimeout(()=>{const x=document.getElementById('ie-code');if(x){x.focus();x.select()}},30);return;
    case'itcancel':S.editIt=null;render();return;
    case'itsave':{if(!r)return;const i=+b.dataset.v;const src=S.rawReqs[id]||(S.extra||{})[id]||(S.extraO||{})[id]||r;const raw=itemsOf(src).map(x=>({...x}));const it=raw[i];if(!it)return;
      const code=val('ie-code').toUpperCase().replace(/\s+/g,' ').trim(),name=val('ie-name'),q=Math.max(1,parseInt(val('ie-q'))||1);
      if(!code&&!name){toast('Код ё номро нависед');return}
      const before=inm(it)+(it.q>1?' × '+it.q:'');
      if(code&&it.code&&code!==it.code&&!it.oldCode)it.oldCode=it.code;
      if(code)it.code=code;else delete it.code;if(it.oldCode===it.code)delete it.oldCode;
      it.n=name||code;it.q=q;
      const after=inm(it)+(q>1?' × '+q:'');S.editIt=null;
      if(before===after){render();return}
      await upd(id,{items:raw,parts:raw.map(x=>inm(x)).join(', ')},'Қисм иваз шуд: '+before+' → '+after);return}
    case'inv':S.inv=b.dataset.id;render();return;
    case'backup':{try{const data={app:'auto-peshsaf',at:new Date().toISOString(),settings:C,requests:S.rawReqs,priv:S.privs,customers:S.customers,workers:S.workers||{},users:S.users||{},admins:S.admins||{}};
      const blob=new Blob([JSON.stringify(data,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);const d=new Date();a.download='backup-'+(C.name||'app').replace(/\W+/g,'_')+'-'+d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);S.lastBackup=Date.now();toast('Файл нигоҳ дошта шуд: '+a.download)}catch(err){toast('Хато: '+err.message)}break}
    case'sentcust':if(r)upd(id,{sentToCustAt:Date.now()},'Ба муштарӣ фиристода шуд (WhatsApp)',true);return;
    case'shipinfo':{if(!r)return;const kg=fnum('a-kg-'+id),dd=val('a-dd-'+id);await upd(id,{weight:kg||0,deliverBy:dd?new Date(dd+'T12:00').getTime():null},'Карго: '+(kg||0)+' кг'+(dd?' · то '+dd:''));return}
    case'custseg':S.custSeg=b.dataset.v;break;
    case'custopen':S.custOpen=S.custOpen===b.dataset.v?null:b.dataset.v;break;
    case'invf':S.invF=b.dataset.v;break;
    case'pick':S.pick=b.dataset.v;render();return;
    case'pickclose':S.pick=null;render();return;
    case'pickv':S[b.dataset.k]=b.dataset.v;S.pick=null;render();return;
    case'invclose':S.inv=null;render();return;
    case'invprint':window.print();return;
    case'cpctq':{const el=document.getElementById('c-pct-'+b.dataset.id);if(el){el.value=b.dataset.v;el.dispatchEvent(new Event('input',{bubbles:true}))}return}
    case'setcom':case'paycom':{if(!r)return;const pct=fnum('c-pct-'+id),amt=fnum('c-amt-'+id);const sel=document.getElementById('c-w-'+id);const w=sel?sel.value:comWorker(r);
      if(amt===null||amt<0){toast('Маблағи муздро нависед');return}
      const p={com:amt,comPct:pct??null,comW:w};if(a==='paycom'){p.comPaid=true;p.comPaidAt=Date.now()}else p.comPaid=false;
      await upd(id,p,(a==='paycom'?'Музд пардохт шуд: ':'Музди коргар: ')+money(amt)+' · '+uname(w));return}
    case'unpaycom':if(r)await upd(id,{comPaid:false,comPaidAt:null},'Пардохти музд бекор шуд');return;
    case'payall':{const w=b.dataset.v;const l=S.reqs.filter(x=>hasCom(x)&&!x.comPaid&&comWorker(x)===w);if(!l.length)return;
      if(S.confirmPay!==w){S.confirmPay=w;render();return}S.confirmPay=null;
      for(const x of l)await upd(x.id,{comPaid:true,comPaidAt:Date.now()},'Музд пардохт шуд: '+money(x.com),true);toast(l.length+' музд пардохт шуд — '+uname(w));return}
    case'fmode':S.fMode=b.dataset.v;render();return;
    case'bulk':S.bulk=!S.bulk;render();setTimeout(()=>{const x=document.getElementById('n-codes');if(x)x.focus()},20);return;
    case'additem':S.nItems=Math.min(12,S.nItems+1);render();setTimeout(()=>{const x=document.getElementById('n-it-'+(S.nItems-1));if(x)x.focus()},20);return;
    case'newreq':if(view()==='admin'){S.adminTab='req';S.open=null}S.newReq=true;render();setTimeout(()=>{const f=document.getElementById('f-new');if(f){f.scrollIntoView({behavior:'smooth',block:'start'});const i=document.getElementById(view()==='admin'?'n-cname':'n-car');if(i)i.focus({preventScroll:true})}},30);return;
    case'closenew':S.newReq=false;S.nItems=1;break;
    case'etab':S.entryTab=b.dataset.v;S.loginErr='';break;
    case'showpw':S.showPw=!S.showPw;break;
    case'google':{S.busy=true;S.loginErr='';render();const prov=new GoogleAuthProvider();
      try{S.justLogged=true;await signInWithPopup(auth,prov)}catch(err){const c=err.code||'';
        S.loginErr=c.includes('unauthorized-domain')?'Ин суроға дар Firebase иҷозат надорад (Authorized domains).':c.includes('popup-closed')?'Равзана пӯшида шуд. Боз кӯшиш кунед.':c.includes('popup-blocked')||c.includes('operation-not-supported')?'Ин браузер равзанаи Google-ро намекушояд. Сайтро дар Chrome кушоед ё бо Gmail ва парол ворид шавед.':'Ворид шуда нашуд: '+(c||'хато')}S.aPw=false;
      S.busy=false;render();return}
    case'logout':{await logAct('logout');clearInterval(beat);S.custLogged=false;const wasW=!!S.wid;S.open=null;S.newReq=false;S.denied=null;S.entryTab=wasW?'worker':S.isAdmin?'admin':'customer';await signOut(auth).catch(()=>{});return}
    case'cred':S.credFor=b.dataset.v||null;break;
    case'fw':S.fWorker=b.dataset.v;S.fStatus=S.fWorker!=='all'?'all':'active';break;
    case'wopen':S.fWorker=b.dataset.v;S.fStatus='all';S.adminTab='req';scrollTo(0,0);break;
    case'period':S.period=b.dataset.v;break;
    case'actrole':S.actRole=b.dataset.v;break;
    case'kpi':{const k=b.dataset.v;if(k==='profit'){S.adminTab='rep';S.repTab='o';render();scrollTo(0,0);return}
      S.fStatus=k;S.fWorker='all';S.fGroup='all';S.q='';render();setTimeout(()=>{const x=document.getElementById('list-anchor');if(x)x.scrollIntoView({behavior:'smooth',block:'start'})},30);return}
    case'markup':{if(!r||!r.cost)return;const ic=chosenIC(r);if(ic){itemsOf(r).forEach((it,i)=>{const el=document.getElementById('d-ip-'+id+'-'+i);if(el&&!it.off&&ic[i]!=null)el.value=Math.ceil(ic[i]*(1+(+b.dataset.v)/100))});calcPP(id);return}const i=itemsOf(r).findIndex(x=>!x.off);const el=document.getElementById('d-ip-'+id+'-'+i);if(el){el.value=Math.ceil(r.cost*(1+(+b.dataset.v)/100));calcPP(id)}return}
    case'copy':case'copytxt':{const t=a==='copy'?waText(r):(document.getElementById(b.dataset.v)||{}).value||'';try{await navigator.clipboard.writeText(t);toast('Нусха гирифта шуд')}catch(_){toast('Нусха нашуд — матнро дастӣ интихоб кунед')}return}
    case'assign':{const g=val('d-group-'+id);if(!g)return;await upd(id,{group:g,workerId:null,assignedAt:r.assignedAt||Date.now(),status:['new','assigned','notfound'].includes(r.status)?'assigned':r.status},'Ба гурӯҳ фиристода шуд: '+GRP[g]);
      if(S.privs[id])setDoc(doc(db,'priv',id),{workerId:null},{merge:true}).catch(()=>{});return}
    case'assignto':{const w=b.dataset.v,u=S.users[w];if(!u||r.workerId===w)return;const grp=u.group&&u.group!=='all'?u.group:(r.group||(r.condition==='used'?'used':'new'));
      if(await upd(id,{workerId:w,group:grp,assignedAt:Date.now(),status:['new','assigned','notfound'].includes(r.status)?'assigned':r.status},'Масъул: '+u.name))
        setDoc(doc(db,'priv',id),{workerId:w},{merge:true}).catch(()=>{});return}
    case'take':{const w=S.wid||actWorker();if(!w)return;
      if(await upd(id,{workerId:w,status:'searching',assignedAt:r.assignedAt||Date.now()},'Ба кор гирифт: '+uname(w)))
        setDoc(doc(db,'priv',id),{workerId:w},{merge:true}).catch(()=>{});return}
    case'qedit':S.qEdit={rid:id,qid:b.dataset.q};S.skipQ=true;if(view()==='admin')S.qOpen=id;render();setTimeout(()=>{const x=document.getElementById('q-sup-'+id);if(x){x.scrollIntoView({block:'center',behavior:'smooth'});qTotals(id)}},40);return;
    case'qeditx':S.qEdit=null;S.skipQ=true;S.qOpen=null;render();return;
    case'qnc':S.qNc=S.qNc||{};S.qNc[id+'-'+b.dataset.v]=1;render();setTimeout(()=>{const x=document.getElementById('q-nc-'+id+'-'+b.dataset.v);if(x){x.focus();x.select()}},30);return;
    case'addq':{const sup=val('q-sup-'+id);const its0=itemsOf(r);const ic=its0.map((it,i)=>{if(it.off)return null;const v=fnum('q-ip-'+id+'-'+i);return v>0?v:null});
      const vb=document.getElementById('q-vat-'+id),vat=!!(vb&&vb.checked)&&+C.vat>0?+C.vat:0;
      if(vat)ic.forEach((v,i)=>{if(v!=null)ic[i]=Math.round(v*(100+vat))/100});
      const cost=Math.round(ic.reduce((a,v)=>a+(v||0),0)*100)/100;
      if(!sup||!(cost>0)){toast('Номи паставшик ва камаш як нархро нависед');return}
      if(r.status==='assigned'&&view()==='worker'){const w=S.wid||actWorker();if(!w)return;if(!await upd(id,{workerId:w,status:'searching',assignedAt:r.assignedAt||Date.now()},'Ба кор гирифт: '+uname(w)))return;await setDoc(doc(db,'priv',id),{workerId:w},{merge:true}).catch(()=>{})}
      const src=S.rawReqs[id]||(S.extra||{})[id]||(S.extraO||{})[id]||r;const raw=itemsOf(src).map(x=>({...x}));const chg=[];
      raw.forEach((it,i)=>{const el=document.getElementById('q-nc-'+id+'-'+i);if(!el)return;const nc=el.value.toUpperCase().replace(/\s+/g,' ').trim();if(nc&&nc!==(it.code||'')){chg.push((it.code||it.n)+' → '+nc);if(it.code&&!it.oldCode)it.oldCode=it.code;if(!it.n||it.n===it.code)it.n=nc;it.code=nc;if(it.oldCode===it.code)delete it.oldCode}});
      if(chg.length)await upd(id,{items:raw,parts:raw.map(x=>inm(x)).join(', ')},'Код иваз шуд: '+chg.join(', '),true);
      S.qNc={};
      const q={id:'q'+Date.now().toString(36),sup,cost,vat:vat||0,itemCosts:its0.length>1?ic:null,kind:val('q-kind-'+id)||'orig',eta:val('q-eta-'+id),ph:val('q-ph-'+id),note:val('q-note-'+id),by:actor(),t:Date.now()};
      const eqid=S.qEdit&&S.qEdit.rid===id?S.qEdit.qid:null;if(eqid){q.id=eqid;const old=(r.quotes||[]).find(x=>x.id===eqid);if(old){q.by=old.by||q.by}}
      const nq=eqid?(r.quotes||[]).map(x=>x.id===eqid?q:x):(r.quotes||[]).concat([q]);const extra=eqid&&r.chosenQ===eqid?{cost:q.cost,supplier:q.sup,supplierPhone:q.ph||''}:{};S.qEdit=null;
      if(await upd(id,{quotes:nq,...extra},(eqid?'Нарх иваз шуд: ':'')+'Нарх: '+sup+' · '+money(cost))&&!(S.qOpen=null)){app.querySelectorAll('[id^="q-"]').forEach(x=>{if(x.tagName==='INPUT')x.value=''});render()}return}
    case'delq':{const qid=b.dataset.q;const patch={quotes:(r.quotes||[]).filter(q=>q.id!==qid)};if(r.chosenQ===qid)patch.chosenQ=null;await upd(id,patch,'Нарх нест карда шуд');return}
    case'chooseq':{const q=(r.quotes||[]).find(x=>x.id===b.dataset.q);if(!q)return;await upd(id,{chosenQ:q.id,cost:q.cost,supplier:q.sup,supplierPhone:q.ph||''},'Интихоб: '+q.sup+' · '+money(q.cost));return}
    case'found':{if(!(r.quotes||[]).length){toast('Камаш як нарх илова кунед');return}const best=r.quotes.slice().sort((x,y)=>x.cost-y.cost)[0];
      if(await upd(id,{status:'found',foundAt:Date.now()},'Ёфт шуд · '+r.quotes.length+' нарх',true))
        await upd(id,{workerNote:val('w-note-'+id),chosenQ:r.chosenQ||best.id,cost:r.chosenQ?r.cost:best.cost,supplier:r.chosenQ?r.supplier:best.sup},'Нархи беҳтарин: '+(r.chosenQ?r.supplier:best.sup)+' · '+money(r.chosenQ?r.cost:best.cost));return}
    case'notfound':{const note=val('w-note-'+id);if(await upd(id,{status:'notfound'},'Ёфт нашуд'))if(note)upd(id,{workerNote:note},'Эзоҳ: '+note,true);return}
    case'offer':{const its=itemsOf(r).map((it,i)=>it.off?it:{...it,price:fnum('d-ip-'+id+'-'+i)});
      if(its.some(it=>!it.off&&!(it.price>0))){toast('Нархи ҳар қисмро нависед');return}
      const total=its.filter(i=>!i.off).reduce((a,i)=>a+i.price,0),again=r.status==='offered';
      if(await upd(id,{items:its,custOff:[],price:total,offerNote:val('d-onote-'+id),warrantyDays:parseInt(val('d-war-'+id))||0,status:'offered',offeredAt:r.offeredAt||Date.now()},(again?'Нархи нав ба муштарӣ: ':'Нарх ба муштарӣ: ')+money(total),true))
        toast((again?'Нархи нав':'Нарх')+' фиристода шуд: '+money(total)+'. Акнун «Дар WhatsApp фиристодан»-ро пахш кунед.');return}
    case'item-off':{const i=+b.dataset.i,off=new Set((S.rawReqs[id]||{}).custOff||[]);off.has(i)?off.delete(i):off.add(i);
      const its=itemsOf(S.rawReqs[id]||r);if(its.every((x,k)=>x.off||off.has(k))){toast('Камаш як қисм бояд монад. Ё «Лозим нест»-ро пахш кунед.');return}
      await upd(id,{custOff:[...off]},(off.has(i)?'Лозим нест: ':'Баргардонд: ')+its[i].n);return}
    case'delpay':{if(!r)return;const k=id+'-'+b.dataset.v;if(S.confirmPayDel!==k){S.confirmPayDel=k;break}S.confirmPayDel=null;const ps=(r.payments||[]).slice();const rm=ps.splice(+b.dataset.v,1)[0];if(!rm)return;await upd(id,{payments:ps},'Пардохт нест карда шуд: '+money(rm.a));return}
    case'addpay':{if(S.payBusy)return;const amt=fnum('p-amt-'+id),cur=val('p-cur-'+id)||C.cur,rate=fnum('p-rate-'+id)||S.lastRate||C.rate2;if(!(amt>0)){toast('Маблағро нависед');return}
      const x2=cur!==C.cur;const a2=x2?Math.round(amt/rate*100)/100:amt;if(x2)S.lastRate=rate;
      const bal=balOf(r);if(bal<=0){toast('Ин инвойс пурра пардохт шудааст');return}
      if(a2>bal+(x2?0.5:0.009)){toast('Маблағ аз боқимонда зиёд аст. Боқимонда: '+money(bal));return}
      S.payBusy=true;setTimeout(()=>S.payBusy=false,3000);
      const p={a:Math.min(a2,bal),cur,orig:amt,rate:x2?rate:1,note:val('p-note-'+id),t:Date.now(),by:actor()};
      const ok=await upd(id,{payments:(r.payments||[]).concat([p])},'Пардохт: '+money(a2)+(x2?' ('+num(amt)+' '+cur+')':''));S.payBusy=false;if(ok)toast(balOf({...r,payments:(r.payments||[]).concat([p])})<=0?'Пурра пардохт шуд ✓':'Пардохт сабт шуд');return}
    case'ship':await upd(id,{status:'shipped',tracking:val('t-trk-'+id),shippedAt:Date.now()},'Дар роҳ'+(val('t-trk-'+id)?': '+val('t-trk-'+id):''));return;
    case'deliver':await upd(id,{status:'delivered',deliveredAt:Date.now()},'Ба муштарӣ дода шуд');return;
    case'return':{const why=val('ret-'+id);if(!why){toast('Сабаби бозгаштро нависед');return}await upd(id,{status:'returned',returnReason:why,returnedAt:Date.now()},'Баргашт: '+why);return}
    case'setstatus':{const s=val('d-status-'+id);if(s===r.status)return;await upd(id,{status:s},'Ҳолат: '+ST[s].l);return}
    case'setcost':{const c=fnum('d-cost-'+id);await upd(id,{cost:c},'Нархи харид: '+money(c));return}
    case'logodel':try{await setDoc(doc(db,'settings','app'),{logo:''},{merge:true});toast('Логотип нест шуд')}catch(err){toast('Нашуд: '+errTxt(err))}return;
    case'assignord':{const w=b.dataset.v,u=S.users[w];if(!u||r.orderWorkerId===w)return;
      if(await upd(id,{orderWorkerId:w,ordStage:r.ordStage||'assigned'},'Масъули заказ: '+u.name))setDoc(doc(db,'priv',id),{orderWorkerId:w},{merge:true}).catch(()=>{});return}
    case'ostage':{const s=b.dataset.v;await upd(id,{ordStage:s},'Заказ: '+OST[s]);return}
    case'ocargo':{const cg=val('o-cargo-'+id),tk=val('o-trk-'+id);if(!(r.photos||[]).some(p=>p.k==='g')){toast('Аввал акси борро дар карго гузоред');return}if(!cg){toast('Номи каргоро нависед');return}
      const kg=fnum('o-kg-'+id),dd=val('o-dd-'+id);if(!(kg>0)){toast('Вазни борро (кг) нависед');return}if(!dd){toast('Рӯзи супоридан ба муштариро интихоб кунед');return}
      await upd(id,{status:'shipped',ordStage:'shipped',cargo:cg,tracking:tk,weight:kg,deliverBy:new Date(dd+'T12:00').getTime(),shippedAt:Date.now()},'Ба карго дода шуд: '+cg+(tk?' · '+tk:'')+' · '+kg+' кг · то '+dd);return}
    case'admno':S.confirmAdm=null;break;
    case'admdel':{const em=b.dataset.v;if(S.confirmAdm!==em){S.confirmAdm=em;break}try{await deleteDoc(doc(db,'admins',em));S.confirmAdm=null;toast('Хориҷ шуд: '+em)}catch(err){toast('Нашуд: '+errTxt(err))}return}
    case'delno':S.confirmDel=null;break;
    case'delreq':{if(S.confirmDel!==id){S.confirmDel=id;break}
      try{await deleteDoc(doc(db,'requests',id));await deleteDoc(doc(db,'priv',id)).catch(()=>{});for(const p of (r.photos||[]))deleteDoc(doc(db,'photos',p.id)).catch(()=>{});S.open=null;S.confirmDel=null;toast('Дархост №'+r.code+' нест карда шуд')}catch(err){toast('Нест нашуд: '+errTxt(err))}return}
    case'adm-accept':if(r)await upd(id,{status:'ordered',orderedAt:Date.now()},'Роҳбар аз номи муштарӣ тасдиқ кард: заказ');return;
    case'adm-decline':if(r)await upd(id,{status:'cancelled'},'Роҳбар қайд кард: муштарӣ рад кард');return;
    case'cust-accept':await upd(id,{status:'ordered',orderedAt:Date.now()},'Муштарӣ заказ дод');return;
    case'cust-decline':await upd(id,{status:'cancelled'},'Муштарӣ рад кард');return;
    case'cust-cancel':await upd(id,{status:'cancelled'},'Муштарӣ бекор кард');return;
  }
  render();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(S.lb)S.lb=null;else if(S.open)S.open=null;else return;render()}});
setInterval(()=>{const ae=document.activeElement;if(!ae||ae===document.body)render()},60000);

/* ===== activity: who entered / left and when ===== */
const ROLE_L={admin:'Роҳбар',worker:'Коргар',customer:'Муштарӣ'};
const ACT_L={login:'Ворид шуд',open:'Кушод',close:'Пӯшид',logout:'Баромад'};
function meInfo(){if(S.isAdmin)return{id:'adm:'+(S.email||'admin'),role:'admin',name:(S.admins&&S.admins[S.email]&&S.admins[S.email].name)||(S.isOwner?'Соҳиб':S.email||'Роҳбар')};
  if(S.wid)return{id:S.wid,role:'worker',name:uname(S.wid)};if(S.cid)return{id:S.cid,role:'customer',name:uname(S.cid)};return null}
let lastOpen=0,hiddenAt=0,beat=null;
function logAct(type){const m=meInfo();if(!m)return Promise.resolve();
  const dev=/Android/i.test(navigator.userAgent)?'Android':/iPhone|iPad/i.test(navigator.userAgent)?'iPhone':'Компютер';
  const p1=setDoc(doc(collection(db,'activity')),{who:m.id,role:m.role,name:m.name||'',type,t:Date.now(),dev}).catch(()=>{});
  const p2=setDoc(doc(db,'presence',m.id.replace(/[\/]/g,'_')),{who:m.id,role:m.role,name:m.name||'',lastSeen:Date.now(),online:type!=='close'&&type!=='logout'},{merge:true}).catch(()=>{});
  return Promise.all([p1,p2])}
function startPresence(type){lastOpen=Date.now();setTimeout(()=>logAct(type||'open'),1500);clearInterval(beat);
  beat=setInterval(()=>{if(document.visibilityState==='visible'){const m=meInfo();if(m)setDoc(doc(db,'presence',m.id.replace(/[\/]/g,'_')),{lastSeen:Date.now(),online:true},{merge:true}).catch(()=>{})}},60000)}
document.addEventListener('visibilitychange',()=>{if(!meInfo())return;
  if(document.visibilityState==='hidden'){hiddenAt=Date.now();logAct('close')}
  else if(hiddenAt&&Date.now()-hiddenAt>60000){logAct('open')}else if(hiddenAt){const m=meInfo();setDoc(doc(db,'presence',m.id.replace(/[\/]/g,'_')),{lastSeen:Date.now(),online:true},{merge:true}).catch(()=>{})}});

/* ===== data subscriptions ===== */
function stopAll(){unsubs.forEach(u=>{try{u()}catch(_){}});unsubs=[];S.rawReqs={};S.extra={};S.extraO={};S.privsO={};S.privs={};S.workers={};S.customers={}}
function sub(q,fn,label){unsubs.push(onSnapshot(q,fn,err=>{console.warn(label,err);if(fn.fail)fn.fail();if(!sub.warned){sub.warned=true;toast('Қисме аз маълумот бор нашуд ('+errTxt(err)+'). Қоидаҳои Firebase-ро санҷед.')}}))}
function waitAll(n){let left=n;S.ready=false;const t=setTimeout(()=>{S.slow=true;render()},10000);return()=>{if(--left<=0){clearTimeout(t);S.ready=true;S.slow=false}rebuild();render()}}
function startAdmin(){
  stopAll();const done=waitAll(5);
  const firstOnce=f=>{let first=true;const h=s=>{f(s);if(first){first=false;done()}else{rebuild();render()}};h.fail=()=>{if(first){first=false;done()}};return h};
  sub(query(collection(db,'requests'),orderBy('createdAt','desc'),limit(1500)),firstOnce(s=>{S.rawReqs={};s.forEach(d=>S.rawReqs[d.id]=d.data())}),'requests');
  sub(collection(db,'priv'),firstOnce(s=>{S.privs={};s.forEach(d=>S.privs[d.id]=d.data())}),'priv');
  sub(collection(db,'workers'),firstOnce(s=>{S.workers={};s.forEach(d=>S.workers[d.id]=d.data())}),'workers');
  sub(collection(db,'customers'),firstOnce(s=>{S.customers={};s.forEach(d=>S.customers[d.id]=d.data())}),'customers');
  sub(collection(db,'admins'),firstOnce(s=>{S.admins={};s.forEach(d=>S.admins[d.id]=d.data())}),'admins');
  unsubs.push(onSnapshot(query(collection(db,'activity'),orderBy('t','desc'),limit(600)),s=>{S.acts=[];s.forEach(d=>S.acts.push(d.data()));if(S.repTab==='a'||S.adminTab==='users')render()},()=>{}));
  unsubs.push(onSnapshot(collection(db,'presence'),s=>{S.pres={};s.forEach(d=>{const x=d.data();S.pres[x.who||d.id]=x});if(S.repTab==='a'||S.adminTab==='users')render()},()=>{}));
}
function startWorker(wid){
  stopAll();S.wid=wid;const done=waitAll(6);
  const firstOnce=f=>{let first=true;const h=s=>{f(s);if(first){first=false;done()}else{rebuild();render()}};h.fail=()=>{if(first){first=false;done()}};return h};
  sub(query(collection(db,'requests'),where('workerId','==',wid)),firstOnce(s=>{S.rawReqs={};s.forEach(d=>S.rawReqs[d.id]=d.data())}),'my requests');
  sub(query(collection(db,'requests'),where('status','==','assigned'),where('workerId','==',null)),firstOnce(s=>{S.extra={};s.forEach(d=>S.extra[d.id]=d.data())}),'open requests');
  sub(query(collection(db,'priv'),where('workerId','==',wid)),firstOnce(s=>{S.privs={};s.forEach(d=>S.privs[d.id]=d.data())}),'priv');
  sub(collection(db,'workers'),firstOnce(s=>{S.workers={};s.forEach(d=>S.workers[d.id]=d.data())}),'workers');
  sub(query(collection(db,'requests'),where('orderWorkerId','==',wid)),firstOnce(s=>{S.extraO={};s.forEach(d=>S.extraO[d.id]=d.data())}),'my orders');
  sub(query(collection(db,'priv'),where('orderWorkerId','==',wid)),firstOnce(s=>{S.privsO={};s.forEach(d=>S.privsO[d.id]=d.data())}),'order priv');
}
async function startCustomer(cidv){
  stopAll();S.cid=cidv;const done=waitAll(2);
  const firstOnce=f=>{let first=true;const h=s=>{f(s);if(first){first=false;done()}else{rebuild();render()}};h.fail=()=>{if(first){first=false;done()}};return h};
  sub(query(collection(db,'requests'),where('customerId','==',cidv)),firstOnce(s=>{S.rawReqs={};s.forEach(d=>S.rawReqs[d.id]=d.data())}),'my requests');
  sub(doc(db,'customers',cidv),firstOnce(s=>{S.customers={};if(s.exists())S.customers[cidv]=s.data()}),'me');
}

/* ===== auth ===== */
render();
onSnapshot(doc(db,'settings','app'),s=>{applyCfg(s.exists()?s.data():null);render()},()=>{});

onAuthStateChanged(auth,async user=>{
  S.isAdmin=false;S.isOwner=false;S.wid=null;S.cid=null;S.denied=null;S.view=null;
  if(!user){stopAll();S.authReady=true;S.ready=true;rebuild();render();return}
  S.authReady=true;S.ready=false;render();
  try{
    const email=(user.email||'').toLowerCase();
    S.email=email;S.justLogged=S.justLogged||false;
    if(!user.isAnonymous&&ADMIN_EMAILS.includes(email)){S.isAdmin=true;S.isOwner=true;startAdmin();startPresence(S.justLogged?'login':'open');S.justLogged=false;return}
    if(!user.isAnonymous&&user.emailVerified&&!email.endsWith('@'+WORKER_DOMAIN)){const ad=await getDoc(doc(db,'admins',email)).catch(()=>null);if(ad&&ad.exists()){S.isAdmin=true;startAdmin();startPresence(S.justLogged?'login':'open');S.justLogged=false;return}}
    if(email.endsWith('@'+WORKER_DOMAIN)){
      const st=await getDoc(doc(db,'staff',user.uid));
      if(!st.exists()){S.denied='Ин логин дигар фаъол нест. Аз роҳбар логини нав гиред.';S.ready=true;render();return}
      startWorker(st.data().wid);startPresence(S.justLogged?'login':'open');S.justLogged=false;return}
    if(user.isAnonymous){
      const ss=await getDoc(doc(db,'sessions',user.uid));
      if(ss.exists()&&ss.data().cid){await startCustomer(ss.data().cid);if(!S.custLogged)startPresence('open');return}
      S.ready=true;render();return}
    S.denied='Почтаи '+email+' роҳбар нест. Агар муштарӣ бошед, бароед ва бо рақами WhatsApp ворид шавед.';S.ready=true;render();
  }catch(err){S.denied='Маълумот бор нашуд ('+errTxt(err)+').';S.ready=true;render()}
});
