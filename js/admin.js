// js/admin.js
window.addEventListener('DOMContentLoaded', () => {
  try {
    // 0) Firebase 초기화 가드
    const cfg = window.__FIREBASE_CONFIG__;
    if (!cfg) throw new Error('Missing __FIREBASE_CONFIG__');
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(cfg);
    }

    const auth = firebase.auth();
    const db   = firebase.firestore();
    const $    = (s) => document.querySelector(s);
    const provider = new firebase.auth.GoogleAuthProvider();

    // 1) 로그인 버튼: 팝업 → (막히면) 리다이렉트 폴백
    const safeSignIn = async () => {
      try {
        await auth.signInWithPopup(provider);
      } catch (e) {
        if (e?.code === 'auth/popup-blocked' ||
            e?.code === 'auth/operation-not-supported-in-this-environment') {
          await auth.signInWithRedirect(provider);
        } else {
          console.error('[AUTH ERROR]', e);
          alert('로그인 오류: ' + (e?.message || e));
        }
      }
    };

    $('#btnSignIn')?.addEventListener('click', safeSignIn);
    $('#btnSignOut')?.addEventListener('click', () => auth.signOut());

    auth.onAuthStateChanged(u => {
      console.log('[ADMIN AUTH] user:', u?.email || null);
      if ($('#btnSignIn'))  $('#btnSignIn').style.display  = u ? 'none' : 'inline-block';
      if ($('#btnSignOut')) $('#btnSignOut').style.display = u ? 'inline-block' : 'none';
    });

    // 2) 카드 HTML
    function itemHTML(id, d){
      let media = '';
      if (d.fileType === 'image') media = `<img src="${d.fileURL}" alt="">`;
      else if (d.fileType === 'video') media = `<video src="${d.fileURL}" controls muted></video>`;
      return `<div class="item"><div class="meta">
        <div><strong>${d.title||'(제목 없음)'}</strong></div>
        <div>${d.author||'학생'} · ${d.email||''}</div>
        <div style="margin:6px 0">${d.content||''}</div>
        <div class="row">
          <button class="btn" data-approve="${id}">승인</button>
          <button class="btn" data-reject="${id}">삭제</button>
        </div>
      </div>${media}</div>`;
    }

    // 3) 목록 렌더러
    function renderList(rootSel, snap){
      const root = $(rootSel);
      root.innerHTML = '';
      snap.forEach(doc => root.insertAdjacentHTML('beforeend', itemHTML(doc.id, doc.data())));
    }

    // 4) 실시간 구독 (에러 보이기)
    db.collection('posts')
      .where('approved','==', false)
      .orderBy('createdAt','desc')
      .onSnapshot(
        snap => renderList('#pending', snap),
        err  => { console.error('[ADMIN] PENDING_QUERY_ERR', err); alert('대기목록 오류: ' + (err?.message || err)); }
      );

    db.collection('posts')
      .orderBy('createdAt','desc')
      .limit(50)
      .onSnapshot(
        snap => renderList('#all', snap),
        err  => { console.error('[ADMIN] ALL_QUERY_ERR', err); alert('전체목록 오류: ' + (err?.message || err)); }
      );

    // 5) 이벤트 위임(항상 살아있는 클릭 핸들러)
    document.addEventListener('click', async (e) => {
      // 승인
      const approveBtn = e.target.closest('button[data-approve]');
      if (approveBtn) {
        const id = approveBtn.getAttribute('data-approve');
        approveBtn.disabled = true;
        try {
          await db.collection('posts').doc(id).set({ approved: true }, { merge: true }); // 병합 쓰기
          console.log('[ADMIN] APPROVE_OK', id);
        } catch (err) {
          console.error('[ADMIN] APPROVE_ERR', err);
          alert('승인 오류: ' + (err?.message || err));
        } finally {
          approveBtn.disabled = false;
        }
        return;
      }

      // 삭제
      const rejectBtn = e.target.closest('button[data-reject]');
      if (rejectBtn) {
        const id = rejectBtn.getAttribute('data-reject');
        rejectBtn.disabled = true;
        try {
          await db.collection('posts').doc(id).delete();
          console.log('[ADMIN] DELETE_OK', id);
        } catch (err) {
          console.error('[ADMIN] DELETE_ERR', err);
          alert('삭제 오류: ' + (err?.message || err));
        } finally {
          rejectBtn.disabled = false;
        }
      }
    });

  } catch (e) {
    console.error('[BOOT ERROR]', e);
    alert('관리자 페이지 초기화 오류: ' + (e?.message || e));
  }
});
