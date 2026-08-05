import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, setPersistence, indexedDBLocalPersistence, browserLocalPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const MODEL_URL='https://teachablemachine.withgoogle.com/models/wOauaqodm/';
const BEACHES={'해운대':[35.1587,129.1604],'광안리':[35.1532,129.1186],'송도':[35.0767,129.0168],'다대포':[35.0485,128.9677]};
const SPECIES={
  '군부':{poison:'해당 없음',summary:'바위에 붙어 사는 연체동물입니다. 관찰만 하고 서식 환경을 훼손하지 마세요.'},'파란고리문어':{level:'danger',poison:'테트로도톡신',summary:'푸른 고리무늬가 특징인 작은 문어입니다. 강한 신경독이 있으므로 절대 만지지 마세요.'},'군소':{poison:'방어 분비물',summary:'부드러운 몸을 가진 해양 복족류입니다. 관찰 후 제자리에 두는 것이 좋습니다.'},'개량조개':{poison:'해당 없음',summary:'모래에 사는 조개류입니다. 살아 있는 개체는 서식 장소에 남겨 주세요.'},'방게':{poison:'해당 없음',summary:'바위틈에서 자주 보이는 작은 게입니다. 집게에 물릴 수 있어 손으로 잡지 않습니다.'},'따개비':{poison:'해당 없음',summary:'바위나 구조물에 단단히 붙어 사는 갑각류입니다. 날카로운 껍질에 베이지 않도록 주의합니다.'},'보라성게':{poison:'가시 자극',summary:'보라색 가시가 난 성게입니다. 가시가 피부에 박힐 수 있으므로 밟거나 만지지 마세요.'},'말똥성게':{poison:'가시 자극',summary:'둥근 형태의 성게입니다. 가시는 상처와 통증을 유발할 수 있어 관찰만 권합니다.'},'소라게':{poison:'해당 없음',summary:'빈 조개껍데기를 집으로 쓰는 갑각류입니다. 껍데기를 빼앗지 말고 관찰하세요.'},'별불가사리':{poison:'해당 없음',summary:'별 모양의 극피동물입니다. 살아 있는 해양생물은 되도록 물가에 돌려보내 주세요.'},'아무르불가사리':{poison:'해당 없음',summary:'여러 팔을 가진 불가사리입니다. 맨손으로 오래 만지지 않고 관찰만 합니다.'},'거미불가사리':{poison:'해당 없음',summary:'가늘고 긴 팔을 가진 불가사리류입니다. 쉽게 손상될 수 있어 만지지 않는 것이 좋습니다.'},'보름달물해파리':{level:'caution',poison:'약한 자포 독',summary:'반투명한 몸과 네 개의 고리 모양 생식소가 보입니다. 자극은 약하지만 접촉은 피하세요.'},'노무라입깃해파리':{level:'danger',poison:'강한 자포 독',summary:'큰 몸집의 해파리입니다. 촉수에 강한 독침이 있어 피부 통증을 일으킬 수 있습니다.'},'작은부레관해파리':{level:'danger',poison:'강한 자포 독',summary:'부레 모양의 몸과 긴 촉수를 가집니다. 해변에 떠밀려 와도 독성이 남을 수 있습니다.'},'말미잘':{poison:'자포 독',summary:'바위에 붙어 촉수를 펼치는 자포동물입니다. 접촉하면 자극을 받을 수 있어 거리를 둡니다.'},'문어':{poison:'해당 없음',summary:'여덟 팔을 가진 두족류입니다. 야생 개체를 붙잡거나 자극하지 마세요.'}
};
const $=s=>document.querySelector(s); const guestKey='aqua-guest-guide'; const hazardKey='aqua-guest-hazards';
const firebaseConfig=window.APP_CONFIG?.firebaseConfig; const fbApp=initializeApp(firebaseConfig); const auth=getAuth(fbApp); const db=getFirestore(fbApp);
let model,current,imageData='',photoGps=null,user=null,guides=[],hazards=[],stopGuides=null,stopHazards=null;
let confirmedUser=null, explicitLogout=false;
const esc=s=>{const d=document.createElement('div');d.textContent=s;return d.innerHTML}; const normal=label=>Object.keys(SPECIES).find(n=>label.includes(n))||'문어';
function guestGuides(){try{return JSON.parse(sessionStorage.getItem(guestKey)||'[]')}catch{return[]}} function guestHazards(){try{return JSON.parse(sessionStorage.getItem(hazardKey)||'[]')}catch{return[]}}
function memberKey(kind){return `aqua-${kind}-${user?.uid||'guest'}`}
function saveMemberFallback(kind,data){localStorage.setItem(memberKey(kind),JSON.stringify(data))}
function updateAccount(){
  const status=$('#profileName'),button=$('#profileButton');
  if(user){const name=user.displayName||user.email||'회원';status.textContent=`회원 · ${name}`;button.textContent='프로필 관리';button.setAttribute('aria-label',`${name} 계정 프로필 관리`);$('#guideMessage').textContent=`${name}의 동기화 도감`}
  else{status.textContent='비회원';button.textContent='로그인';button.setAttribute('aria-label','이메일 계정 로그인');$('#guideMessage').textContent='비회원 도감 · 종료 시 삭제'}
}
function renderGuide(){const out=$('#guideList');if(!guides.length){out.innerHTML='<p class="empty">아직 저장한 생물이 없어요. 사진을 분석한 뒤 도감에 저장해 보세요.</p>';return}out.innerHTML=guides.map(x=>`<article class="guide-card"><img src="${x.image}" data-id="${x.id}" alt="${esc(x.name)}"><div><h3>${esc(x.name)}</h3><p>${esc(x.beach)} · ${esc(x.date)}</p><p>${x.lat.toFixed(5)}, ${x.lng.toFixed(5)}</p><button class="delete-guide" data-id="${x.id}">도감에서 삭제</button></div></article>`).join('');document.querySelectorAll('.guide-card img').forEach(el=>el.onclick=()=>showDetail(guides.find(x=>x.id===el.dataset.id)));document.querySelectorAll('.delete-guide').forEach(el=>el.onclick=()=>removeGuide(el.dataset.id));}
function renderHazards(){ $('#hazardCount').textContent=`위험 표시 ${hazards.length}건`;const out=$('#hazardList');out.innerHTML=hazards.length?hazards.map(x=>{const isOwner=user&&(x.reporterId===user.uid||x.reporterEmail===user.email);return `<div class="hazard"><span>⚠ <b>${esc(x.species)}</b> · ${esc(x.beach)}<small>${x.lat.toFixed(5)}, ${x.lng.toFixed(5)} · ${esc(x.date)}</small></span>${isOwner?`<button data-id="${x.id}" class="delete-hazard">삭제하기</button>`:''}</div>`}).join(''):'<p class="empty">현재 위험 표시는 0건입니다.</p>';document.querySelectorAll('.delete-hazard').forEach(el=>el.onclick=()=>removeHazard(el.dataset.id));}
function map(beach){const [lat,lng]=BEACHES[beach];$('#mapFrame').innerHTML=`<iframe title="${beach} 지도" src="https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed" loading="lazy"></iframe>`}
async function getModel(){if(!model)model=await tmImage.load(MODEL_URL+'model.json',MODEL_URL+'metadata.json');return model}
function makeEntry(){const [lat,lng]=BEACHES[$('#beach').value];const pos=photoGps||{lat,lng};return{id:crypto.randomUUID(),name:current.name,image:imageData,beach:$('#beach').value,date:new Date().toLocaleDateString('ko-KR'),lat:pos.lat,lng:pos.lng,summary:current.info.summary,poison:current.info.poison,createdAt:Date.now()}}
function showDetail(x){$('#detailDialog').innerHTML=`<form method="dialog"><button class="close">×</button><h2>${esc(x.name)}</h2><img src="${x.image}" alt="${esc(x.name)}"><p><b>생물 요약</b><br>${esc(x.summary)}</p><p><b>독성 정보</b><br>${esc(x.poison)}</p><p><b>발견 기록</b><br>${esc(x.beach)} · ${esc(x.date)}<br>${x.lat.toFixed(5)}, ${x.lng.toFixed(5)}</p></form>`;$('#detailDialog').showModal()}
function showResult(){const ranks=current.ranking.map((p,i)=>`<span>${i+1}위 ${normal(p.className)} ${Math.round(p.probability*100)}%</span>`).join('');const level=current.info.level||'safe';const title=level==='danger'?'위험종':level==='caution'?'주의종':'일반 관찰종';const notice=level==='danger'?'<div class="alert danger-alert">⚠ 독성이 강한 위험종입니다. 절대 만지지 말고 119 또는 122 신고를 고려하세요.</div>':level==='caution'?'<div class="alert caution-alert">주의종입니다. 약한 독성·자극이 있을 수 있으니 접근을 보류하세요.</div>':'';$('#result').innerHTML=`<div class="result-top"><div><p class="eyebrow">ANALYSIS RESULT</p><h3>${current.name}</h3><div class="ranking">${ranks}</div></div><b class="risk ${level}">${title}</b></div><div class="info-boxes"><div><b>생물 요약</b><br>${current.info.summary}</div><div><b>독성 정보</b><br>${current.info.poison}</div></div>${notice}<button id="saveGuide" class="primary">내 도감에 저장</button>${level==='danger'?'<button id="addHazard" class="secondary">공유 위험 표시 추가</button>':''}`;$('#result').classList.remove('hidden');$('#saveGuide').onclick=saveGuide;const add=$('#addHazard');if(add)add.onclick=addHazard}
function showLensFallback(score){$('#modelStatus').textContent=`최고 유사도 ${Math.round(score*100)}%: 학습한 17종 외 생물로 판단했습니다.`;$('#result').innerHTML='<div class="alert caution-alert"><b>17종 도감에 없는 생물일 수 있습니다.</b><br>아래 확인 창에서 Google Lens를 열거나, 생물 정보를 직접 기록해 도감에 저장할 수 있습니다.</div>';$('#result').classList.remove('hidden');$('#lensDialog')?.showModal()}
async function resizeImage(file){const url=URL.createObjectURL(file);const image=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url});const scale=Math.min(1,900/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);return canvas.toDataURL('image/jpeg',.72)}
async function saveGuide(){const item=makeEntry();guides=[item,...guides.filter(x=>x.id!==item.id)];if(user)saveMemberFallback('guides',guides);else sessionStorage.setItem(guestKey,JSON.stringify(guides));renderGuide();location.hash='guide';try{if(user){if(item.image.length>850000)return alert('사진 용량이 커서 이 기기에만 저장했습니다.');await setDoc(doc(db,'users',user.uid,'guides',item.id),item)}alert('도감에 저장했습니다.')}catch(err){alert('도감은 이 기기에 저장되었고 서버 동기화는 나중에 다시 시도됩니다.')}}
async function removeGuide(id){guides=guides.filter(x=>x.id!==id);if(user){saveMemberFallback('guides',guides);renderGuide();try{await deleteDoc(doc(db,'users',user.uid,'guides',id))}catch{alert('서버 삭제는 나중에 다시 시도됩니다.')}}else{sessionStorage.setItem(guestKey,JSON.stringify(guides));renderGuide()}}
async function addHazard(){if(!user){alert('공유 위험 표시는 로그인 후 추가할 수 있습니다.');$('#profileDialog').showModal();return}const item={...makeEntry(),species:current.name,reporterId:user.uid,reporterEmail:user.email||''};hazards=[item,...hazards.filter(x=>x.id!==item.id)];saveMemberFallback('hazards',hazards);renderHazards();location.hash='map';try{await setDoc(doc(db,'hazards',item.id),item);alert('공유 위험 표시에 추가했습니다.')}catch(err){alert('위험 표시는 이 기기에 추가되었고 서버 동기화는 나중에 다시 시도됩니다.')}}
async function removeHazard(id){const target=hazards.find(x=>x.id===id);const isOwner=user&&target&&(target.reporterId===user.uid||target.reporterEmail===user.email);if(!isOwner)return;hazards=hazards.filter(x=>x.id!==id);saveMemberFallback('hazards',hazards);renderHazards();try{await deleteDoc(doc(db,'hazards',id));alert('위험 표시를 삭제했습니다.')}catch{alert('화면에서는 삭제했지만 서버 삭제는 나중에 다시 시도됩니다.')}}
const mergeEntries=(remote,local)=>[...remote,...local.filter(x=>!remote.some(y=>y.id===x.id))];
function startSync(){if(stopGuides){stopGuides();stopGuides=null}if(stopHazards){stopHazards();stopHazards=null}if(user){guides=JSON.parse(localStorage.getItem(memberKey('guides'))||'[]');renderGuide();stopGuides=onSnapshot(query(collection(db,'users',user.uid,'guides'),orderBy('createdAt','desc')),snap=>{guides=mergeEntries(snap.docs.map(d=>d.data()),guides);saveMemberFallback('guides',guides);renderGuide()},()=>renderGuide())}else{guides=guestGuides();renderGuide()}hazards=[];renderHazards();stopHazards=onSnapshot(query(collection(db,'hazards'),orderBy('createdAt','desc')),snap=>{hazards=snap.docs.map(d=>d.data());if(user)saveMemberFallback('hazards',hazards);renderHazards()},()=>{hazards=[];renderHazards()})}
$('#photoInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{imageData=await resizeImage(file)}catch{imageData=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(file)})}$('#preview').src=imageData;$('#preview').style.display='block';$('#uploadPrompt').style.display='none';try{const g=await exifr.gps(file);photoGps=g?{lat:g.latitude,lng:g.longitude}:null}catch{photoGps=null}$('#gpsStatus').textContent=photoGps?`사진 GPS: ${photoGps.lat.toFixed(6)}, ${photoGps.lng.toFixed(6)}`:'사진 GPS가 없습니다. 선택한 해수욕장 중심 위치로 저장합니다.'};
$('#analyzeButton').onclick=async()=>{if(!imageData)return alert('먼저 생물 사진을 올려주세요.');try{$('#modelStatus').textContent='17종 사진 특징을 비교 분석 중입니다…';const p=await(await getModel()).predict($('#preview'));p.sort((a,b)=>b.probability-a.probability);if(p[0].probability<=.6){showLensFallback(p[0].probability);return}const name=normal(p[0].className);current={name,info:SPECIES[name],ranking:p.slice(0,3)};$('#modelStatus').textContent='분석이 완료되었습니다.';showResult()}catch{$('#modelStatus').textContent='분석 모델 연결에 실패했습니다. 인터넷 연결 후 다시 시도해 주세요.'}};
// 일부 브라우저에서 대화상자가 늦게 만들어지는 경우에도 앱이 멈추지 않도록 안전하게 연결합니다.
function bindAccountControls(){
  $('#profileButton')?.addEventListener('click',()=>$('#profileDialog')?.showModal());
  const credentials=()=>[$('#emailInput')?.value.trim(),$('#passwordInput')?.value];
  $('#emailLogin')?.addEventListener('click',async()=>{const [email,password]=credentials();try{await enablePersistentLogin();await signInWithEmailAndPassword(auth,email,password)}catch(err){alert(`로그인에 실패했습니다: ${err.code||err.message}`)}});
  $('#emailSignup')?.addEventListener('click',async()=>{const [email,password]=credentials();try{await enablePersistentLogin();await createUserWithEmailAndPassword(auth,email,password)}catch(err){alert(`계정 생성에 실패했습니다: ${err.code||err.message}`)}});
  $('#logoutButton')?.addEventListener('click',()=>{explicitLogout=true;confirmedUser=null;signOut(auth)});
  $('#saveManualSpecies')?.addEventListener('click',()=>{const name=$('#manualSpeciesName')?.value.trim();const summary=$('#manualSpeciesInfo')?.value.trim();const poison=$('#manualSpeciesPoison')?.value.trim()||'확인 필요';if(!name||!summary)return alert('생물 이름과 설명을 입력해 주세요.');current={name,info:{summary,poison},ranking:[]};$('#lensDialog')?.close();saveGuide()});
  $('#orb')?.addEventListener('click',()=>$('#quickMenu')?.classList.toggle('open'));
  document.querySelectorAll('[data-beach]').forEach(b=>b.addEventListener('click',()=>map(b.dataset.beach)));
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bindAccountControls,{once:true}); else bindAccountControls();
// 로그인 정보는 IndexedDB에 영구 보관합니다. 브라우저를 닫거나 새로고침해도
// signOut()을 직접 호출하기 전까지 지우지 않습니다.
async function enablePersistentLogin(){
  try { await setPersistence(auth,indexedDBLocalPersistence); }
  catch { await setPersistence(auth,browserLocalPersistence); }
}
$('#profileName').textContent='로그인 확인 중';
// Firebase가 IndexedDB에 저장된 로그인 정보를 복원할 때까지 기다립니다.
// 이 순서가 없으면 새로고침 순간 비회원 상태가 먼저 화면에 표시될 수 있습니다.
function applyAuthenticatedUser(nextUser){
  // 로그인에 성공한 사용자는 로그아웃을 누르기 전까지 화면에서 유지합니다.
  if(nextUser){ confirmedUser=nextUser; explicitLogout=false; }
  if(!nextUser && confirmedUser && !explicitLogout) nextUser=confirmedUser;
  user=nextUser||null;
  updateAccount();
  startSync();
  if(user) $('#profileDialog').close();
}
// 인증 복원이 끝난 뒤 한 번만 초기 화면을 그립니다.
enablePersistentLogin().then(async()=>{
  await auth.authStateReady();
  applyAuthenticatedUser(auth.currentUser);
  onAuthStateChanged(auth,applyAuthenticatedUser);
}).catch(err=>{console.error('auth-init',err);applyAuthenticatedUser(null)});
map('해운대');getModel().then(()=>$('#modelStatus').textContent='17종 비교 분석 모델이 준비되었습니다.').catch(()=>$('#modelStatus').textContent='모델은 분석 버튼을 눌렀을 때 다시 연결합니다.');
