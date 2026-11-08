const app={querySelectorAll:()=>[],innerHTML:'',querySelector:()=>null};
global.navigator={userAgent:'Android'};global.document={title:'',visibilityState:'visible',getElementById:id=>id==='app'?app:null,addEventListener(){},activeElement:null,querySelectorAll:()=>[]};
global.location={origin:'https://x.github.io',pathname:'/auto-peshsaf/'};global.setInterval=()=>0;global.setTimeout=()=>0;
let src=require('fs').readFileSync('fb.js','utf8').replace(/^import .*$/mg,'')
 .replace(/\/\* ===== auth ===== \*\/[\s\S]*$/,'');
const stubs=`const initializeApp=()=>({}),getAuth=()=>({}),getFirestore=()=>({}),onAuthStateChanged=()=>{},signInAnonymously=0,signInWithEmailAndPassword=0,createUserWithEmailAndPassword=0,signInWithPopup=0,signInWithRedirect=0,getRedirectResult=()=>Promise.resolve(),GoogleAuthProvider=function(){},signOut=0,collection=0,doc=0,getDoc=0,setDoc=0,updateDoc=0,deleteDoc=0,onSnapshot=0,query=0,where=0,orderBy=0,limit=0;`;
src=stubs+src+`
const now=Date.now();
S.authReady=S.ready=true;
S.workers={'w-salmon':{name:'Салмон',group:'all',login:'salmon',createdAt:1}};
S.customers={'c-971501':{name:'Али',phone:'+971501'}};
S.rawReqs={r1:{code:'111',car:'Toyota',year:'2015',parts:'Фар',status:'new',createdAt:now-100*3600e3,customerId:'c-971501'},
r2:{code:'222',car:'Camry',items:[{n:'Бампер',q:1,price:300},{n:'Фар',q:2,price:200}],custOff:[1],status:'offered',urgency:'h24',workerId:'w-salmon',createdAt:now,customerId:'c-971501',photos:[{id:'p1',k:'c'}]},
r3:{code:'333',car:'Lexus',items:[{n:'Мотор',q:1,price:1000}],status:'delivered',workerId:'w-salmon',assignedAt:now-5*3600e3,foundAt:now-2*3600e3,deliveredAt:now,warrantyDays:30,payments:[{a:400,cur:'AED',t:now}],customerId:'c-971501',createdAt:now-3600e3}};
S.privs={r2:{quotes:[{id:'qa',sup:'Ali',cost:150,by:'w-salmon',t:now}],chosenQ:'qa',cost:150,supplier:'Ali',log:[{t:now,by:'w-salmon',s:'Нарх'}]},r3:{cost:700}};
rebuild();
if(S.reqs.find(r=>r.id==='r2').price!==300)throw new Error('price '+S.reqs.find(r=>r.id==='r2').price);
S.isAdmin=true;for(const t of['req','debt','rep','users']){S.adminTab=t;for(const rt of['o','w','s']){S.repTab=rt;render()}}
S.adminTab='set';render();applyCfg({industry:'computers',name:'PC Market'});render();S.adminTab='req';S.newReq=true;render();for(const id of['r1','r2','r3']){S.open=id;render()}
S.view='worker';S.open='r2';render();S.view='customer';render();
S.isAdmin=false;S.view=null;S.wid='w-salmon';for(const t of['new','work','done','all']){S.wTab=t;render()}S.open='r2';render();
S.wid=null;S.cid='c-971501';S.open=null;render();S.cid=null;for(const t of['customer','worker','admin']){S.entryTab=t;render()}
S.isAdmin=true;S.view='admin';S.wid=null;S.cid=null;S.rawReqs.r3.status='ordered';S.rawReqs.r3.orderWorkerId='w-salmon';S.rawReqs.r3.ordStage='bought';rebuild();S.adminTab='req';S.fStatus='all';render();S.open='r3';render();
S.isAdmin=false;S.view=null;S.wid='w-salmon';S.wTab='ord';render();S.open='r3';render();if(!app.innerHTML.includes('Бастабандӣ шуд'))throw new Error('no stage btn');S.isAdmin=true;S.isOwner=true;S.wid=null;S.view='admin';S.admins={'a@gmail.com':{name:'Фирӯз'}};S.adminTab='users';render();if(!app.innerHTML.includes('Илова кардани роҳбар'))throw new Error('x');S.acts=[{who:'w-salmon',role:'worker',name:'Салмон',type:'login',t:Date.now(),dev:'Android'}];S.pres={'w-salmon':{who:'w-salmon',role:'worker',name:'Салмон',lastSeen:Date.now(),online:true}};S.adminTab='rep';S.repTab='a';render();if(!app.innerHTML.includes('Ҳозир дар барнома'))throw new Error('y');console.log('OK4');`;
eval(src);
