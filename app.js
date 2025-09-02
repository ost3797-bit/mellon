(function(){
const cfg = window.__FIREBASE_CONFIG__;
firebase.initializeApp(cfg);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const $ = (sel)=>document.querySelector(sel);
const btnSignIn = $('#btnSignIn');
const btnSignOut = $('#btnSignOut');
const uploadCard = $('#uploadCard');
const title = $('#title');
const content = $('#content');
const file = $('#file');
const feed = $('#feed');
const empty = $('#empty');
const status = $('#uploadStatus');

const provider = new firebase.auth.GoogleAuthProvider();

auth.onAuthStateChanged(user=>{
if(user){
btnSignIn.style.display='none';
btnSignOut.style.display='inline-block';
uploadCard.style.display='block';
}else{
btnSignIn.style.display='inline-block';
btnSignOut.style.display='none';
uploadCard.style.display='none';
}
});

btnSignIn.onclick = ()=> auth.signInWithPopup(provider);
btnSignOut.onclick = ()=> auth.signOut();

async function uploadFileIfAny(uid){
if(!file.files[0]) return {url:null,type:null,name:null};
const f = file.files[0];
const ext = f.name.split('.').pop().toLowerCase();
const path = `uploads/${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
const ref = storage.ref().child(path);
await ref.put(f);
const url = await ref.getDownloadURL();
const type = f.type.startsWith('video')? 'video' : (f.type.startsWith('image')? 'image' : 'file');
return {url,type,name:f.name,path};
}

async function createPost(){
const user = auth.currentUser;
if(!user) return alert('로그인이 필요합니다.');
const t = title.value.trim();
const c = content.value.trim();
if(!t && !file.files[0] && !c){
return alert('제목 또는 파일 또는 내용을 하나 이상 입력해주세요.');
}
status.textContent = '업로드 중...';
try{
const f = await uploadFileIfAny(user.uid);
await db.collection('posts').add({
uid: user.uid,
author: user.displayName || '학생',
email: user.email || null,
title: t || null,
content: c || null,
fileURL: f.url,
fileType: f.type,
fileName: f.name,
storagePath: f.path || null,
approved: false,
createdAt: firebase.firestore.FieldValue.serverTimestamp()
});
title.value=''; content.value=''; file.value='';
status.textContent = '업로드 완료! (교사 승인 후 공개됩니다)';
setTimeout(()=> status.textContent = '', 2500);
}catch(e){
console.error(e);
alert('업로드 중 오류가 발생했습니다.');
status.textContent='';
}
}


$('#btnUpload').onclick = createPost;


function renderItem(doc){
const d = doc.data();
const el = document.createElement('div');
el.className='item';
let media='';
if(d.fileType==='image') media = `<img src="${d.fileURL}" alt="${d.title||''}">`;
else if(d.fileType==='video') media = `<video src="${d.fileURL}" controls muted playsinline></video>`;
const txt = [d.title?`<strong>${d.title}</strong>`:'' , d.content?`<div>${d.content}</div>`:'' ].join('');
el.innerHTML = `${media}<div class="meta">${txt}<div style="margin-top:6px">작성자: ${d.author||'학생'} · ${d.createdAt? d.createdAt.toDate().toLocaleString():''}</div></div>`;
return el;
}


// 승인된 글만 최신순
db.collection('posts').where('approved','==',true).orderBy('createdAt','desc').onSnapshot(snap=>{
feed.innerHTML='';
if(snap.empty){ empty.style.display='block'; return; }
empty.style.display='none';
snap.forEach(doc=> feed.appendChild(renderItem(doc)));
});
})();