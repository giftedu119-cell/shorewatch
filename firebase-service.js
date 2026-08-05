import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithRedirect, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

function shrinkPhoto(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 640 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    image.onerror = reject;
    image.src = dataUrl;
  });
}

const config = window.APP_CONFIG?.firebaseConfig;
if (!config) {
  window.firebaseService = { ready: false };
  window.dispatchEvent(new Event('firebase-service-ready'));
} else {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  const guides = (uid) => collection(db, 'users', uid, 'guides');
  const hazards = () => collection(db, 'hazards');

  window.firebaseService = {
    ready: true,
    auth,
    // 앱 내 브라우저에서 팝업이 차단되는 문제를 피하기 위해 리디렉션 로그인 사용
    login: () => signInWithRedirect(auth, provider),
    logout: () => signOut(auth),
    onUser: (callback) => onAuthStateChanged(auth, callback),
    async saveGuide(uid, entry) {
      const { image, ...details } = entry;
      const compactImage = await shrinkPhoto(image);
      await setDoc(doc(guides(uid), entry.id), { ...details, image: compactImage, createdAt: serverTimestamp() });
    },
    deleteGuide: (uid, entry) => deleteDoc(doc(guides(uid), entry.id)),
    listenGuides(uid, callback) {
      return onSnapshot(query(guides(uid), orderBy('createdAt', 'desc')), (snapshot) => {
        callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      });
    },
    saveHazard: (entry) => setDoc(doc(hazards(), entry.id), { ...entry, createdAt: serverTimestamp() }),
    deleteHazard: (id) => deleteDoc(doc(hazards(), id)),
    listenHazards(callback) {
      return onSnapshot(query(hazards(), orderBy('createdAt', 'desc')), (snapshot) => {
        callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      });
    }
  };
  window.dispatchEvent(new Event('firebase-service-ready'));
}
