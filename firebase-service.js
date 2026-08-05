import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {getFirestore,collection,doc,setDoc,deleteDoc,onSnapshot,query,orderBy,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Firebase Storage는 결제 계정이 필요하므로 사용하지 않습니다.
// 사진은 Firestore 문서 한도(1MiB)에 맞게 작은 JPEG로 줄여 함께 저장합니다.
function shrinkPhoto(dataUrl){
 return new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>{
   const longest=Math.max(image.width,image.height),scale=Math.min(1,640/longest);
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
   canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
   resolve(canvas.toDataURL('image/jpeg',0.7));
  };
  image.onerror=reject;image.src=dataUrl;
 });
}

const config=window.APP_CONFIG?.firebaseConfig;
if(!config){window.firebaseService={ready:false};window.dispatchEvent(new Event('firebase-service-ready'));}
else{
 const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();
 const guides=uid=>collection(db,'users',uid,'guides'),hazards=collection(db,'hazards');
 window.firebaseService={ready:true,auth,async login(){return signInWithPopup(auth,provider)},logout(){return signOut(auth)},onUser(cb){return onAuthStateChanged(auth,cb)},
  async saveGuide(uid,entry){const {image,...data}=entry;const compactImage=await shrinkPhoto(image);await setDoc(doc(guides(uid),entry.id),{...data,image:compactImage,createdAt:serverTimestamp()})},
  async deleteGuide(uid,entry){await deleteDoc(doc(guides(uid),entry.id))},
  listenGuides(uid,cb){return onSnapshot(query(guides(uid),orderBy('createdAt','desc')),s=>cb(s.docs.map(d=>({id:d.id,...d.data()})))},
  async saveHazard(entry){await setDoc(doc(hazards(),entry.id),{...entry,createdAt:serverTimestamp()})},
  deleteHazard(id){return deleteDoc(doc(hazards(),id))},
  listenHazards(cb){return onSnapshot(query(hazards(),orderBy('createdAt','desc')),s=>cb(s.docs.map(d=>({id:d.id,...d.data()})))}}
 window.dispatchEvent(new Event('firebase-service-ready'));
}
