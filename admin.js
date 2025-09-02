(function(){
const cfg = window.__FIREBASE_CONFIG__;
firebase.initializeApp(cfg);
const auth = firebase.auth();
const db = firebase.firestore();


const $ = (s)=>document.querySelector(s);
const provider = new firebase.auth.GoogleAuthProvider();
$('#btnSignIn').onclick = ()=> auth.signInWithPopup(provider);
$('#btnSignOut').onclick = ()=> auth.signOut();
auth.onAuthStateChanged(u=>{
$('#btnSignIn').style.display = u? 'none':'inline-block';
$('#btnSignOut').style.display = u? 'inline-block':'none';
});

function itemHTML(id,d){
let media='';
if(d.fileType==='image') media = `<img src="${d.fileURL}" alt="">`;
else if(d.fileType==='video') media = `<video src="${d.fileURL}" controls muted></video>`;
return `<div class="item"><div class="meta"><div><strong>${d.title||'(제목 없음)'}</strong></div>
<div>${d.author||'학생'} · ${d.email||''}</div>
<div style="margin:6px 0">${d.content||''}</div>
<div class="row">
<button class="btn" data-approve="${id}">승인</button>
<button class="btn" data-reject="${id}">삭제</button>
</div></div>${media}</div>`;
}


function bindActions(root){
root.querySelectorAll('[data-approve]').forEach(b=> b.onclick = async ()=>{
const id = b.getAttribute('data-approve');
await db.collection('posts').doc(id).update({approved:true});
});
root.querySelectorAll('[data-reject]').forEach(b=> b.onclick = async ()=>{
const id = b.getAttribute('data-reject');
await db.collection('posts').doc(id).delete();
});
}


// 승인 대기
db.collection('posts').where('approved','==',false).orderBy('createdAt','desc').onSnapshot(s=>{
const root = $('#pending');
root.innerHTML='';
s.forEach(doc=> root.insertAdjacentHTML('beforeend', itemHTML(doc.id, doc.data())));
bindActions(root);
});


// 전체
db.collection('posts').orderBy('createdAt','desc').limit(50).onSnapshot(s=>{
const root = $('#all');
root.innerHTML='';
s.forEach(doc=> root.insertAdjacentHTML('beforeend', itemHTML(doc.id, doc.data())));
bindActions(root);
});
})();