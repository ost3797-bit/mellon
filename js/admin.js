// js/admin.js — 관리자 페이지 전용 스크립트(전체 교체본)
window.addEventListener('DOMContentLoaded', () => {
  try {
    // 0) Firebase 초기화 가드
    const cfg = window.__FIREBASE_CONFIG__;
    if (!cfg) throw new Error('Missing __FIREBASE_CONFIG__');
    if (!firebase.apps || firebase.apps.length === 0) firebase.initializeApp(cfg);

    const auth = firebase.auth();
    const db   = firebase.firestore();
    const $    = (s) => document.querySelector(s);
    const provider = new firebase.auth.GoogleAuthProvider();

    // 진단: 프로젝트 확인
    try {
      console.log('[ADMIN] projectId =', firebase.app().options?.projectId || '(unknown)');
    } catch (_) {}

    // 1) 로그인: 팝업 → (막히면) 리다이렉트 폴백
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

    // 2) 로그인/로그아웃 UI 토글
    const updateAuthUI = (u) => {
      const signInBtn  = $('#btnSignIn')  || document.querySelector('[data-action="signin"]');
      const signOutBtn = $('#btnSignOut') || document.querySelector('[data-action="signout"]');
      if (signInBtn)  signInBtn.style.display  = u ? 'none' : 'inline-block';
      if (signOutBtn) signOutBtn.style.display = u ? 'inline-block' : 'none';
    };

    auth.onAuthStateChanged(u => {
      console.log('[ADMIN AUTH] user:', u?.email || null);
      updateAuthUI(u);
    });

    // 3) 카드 HTML
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

    // 4) 목록 렌더러
    function renderList(rootSel, snap){
      const root = $(rootSel);
      root.innerHTML = '';
      snap.forEach(doc => root.insertAdjacentHTML('beforeend', itemHTML(doc.id, doc.data())));
    }

    // 5) 실시간 구독(+에러 표시)
    db.collection('posts')
      .where('approved','==', false)
      .orderBy('createdAt','desc')
      .onSnapshot(
        snap => renderList('#pending', snap),
        err  => { console.error('[ADMIN] PENDING_QUERY_ERR', err);
                  alert('대기목록 오류: ' + (err?.message || err) + '\n\n※ 인덱스 필요 시 콘솔 링크로 생성하세요.'); }
      );

    db.collection('posts')
      .orderBy('createdAt','desc')
      .limit(50)
      .onSnapshot(
        snap => renderList('#all', snap),
        err  => { console.error('[ADMIN] ALL_QUERY_ERR', err);
                  alert('전체목록 오류: ' + (err?.message || err)); }
      );

    // 6) 이벤트 위임: 로그인/승인/삭제 단일 핸들러
    document.addEventListener('click', async (e) => {
      // 로그인 (id 또는 data-action 지원)
      if (e.target.closest('#btnSignIn, [data-action="signin"]')) {
        await safeSignIn();
        return;
      }
      // 로그아웃
      if (e.target.closest('#btnSignOut, [data-action="signout"]')) {
        await auth.signOut();
        return;
      }

      // 승인
      const approveBtn = e.target.closest('button[data-approve]');
      if (approveBtn) {
        const id = approveBtn.getAttribute('data-approve');
        approveBtn.disabled = true;
        try {
          const ref = db.collection('posts').doc(id);

          // 병합 쓰기(안전)로 승인 처리
          await ref.set({ approved: true }, { merge: true });

          // 서버 재확인(디버그)
          const snap = await ref.get();
          const approvedNow = snap.exists ? snap.data().approved : '(문서없음)';
          console.log('[ADMIN] APPROVE_OK id=', id, 'approvedNow=', approvedNow);
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
