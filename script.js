// --- Firebase 설정 및 초기화 ---
const firebaseConfig = {
    apiKey: "AIzaSyCBdwACtUbVMq88XQO2DGWxtGeFXeyDNdc",
    authDomain: "lasbookad.firebaseapp.com",
    projectId: "lasbookad",
    storageBucket: "lasbookad.firebasestorage.app",
    messagingSenderId: "491653333875",
    appId: "1:491653333875:web:a161d9475689f46f6b3b06",
    measurementId: "G-FW3VBW6G5T"
};

firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// 페이지 방문 시 자동으로 방문 기록(Page View)이 구글 애널리틱스로 전송됩니다.

// --- 모달 요소 ---
const windowDataStore = {}; // 상세 보기 모달을 위해 데이터 저장
const loginModal = document.getElementById('loginModal');
const uploadModal = document.getElementById('uploadModal');
const editModal = document.getElementById('editModal');
const openLoginBtn = document.getElementById('openLoginBtn');
const openUploadBtn = document.getElementById('openUploadBtn');
const logoutBtn = document.getElementById('logoutBtn');
const closeLoginBtn = document.getElementById('closeLoginBtn');
const closeUploadBtn = document.getElementById('closeUploadBtn');
const closeEditBtn = document.getElementById('closeEditBtn');

openLoginBtn.addEventListener('click', (e) => { e.preventDefault(); loginModal.style.display = 'flex'; });
openUploadBtn.addEventListener('click', () => { uploadModal.style.display = 'flex'; });
closeLoginBtn.addEventListener('click', () => { loginModal.style.display = 'none'; });
closeUploadBtn.addEventListener('click', () => { uploadModal.style.display = 'none'; });
closeEditBtn.addEventListener('click', () => { editModal.style.display = 'none'; });
window.addEventListener('click', (e) => {
    if (e.target == loginModal) loginModal.style.display = 'none';
    if (e.target == uploadModal) uploadModal.style.display = 'none';
    if (e.target == editModal) editModal.style.display = 'none';
});

// --- 인증 (로그인/로그아웃) ---
auth.onAuthStateChanged(user => {
    if (user) {
        openUploadBtn.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        openLoginBtn.classList.add('hidden');
    } else {
        openUploadBtn.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        openLoginBtn.classList.remove('hidden');
    }
});

document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const errObj = document.getElementById('loginError');
    try {
        await auth.signInWithEmailAndPassword(email, password);
        loginModal.style.display = 'none';
        errObj.innerText = '';
    } catch (error) {
        errObj.innerText = '로그인 실패: ' + error.message;
    }
});

logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// --- 자료 업로드 ---
document.getElementById('submitUploadBtn').addEventListener('click', async () => {
    const title = document.getElementById('uploadTitle').value;
    const desc = document.getElementById('uploadDesc').value;
    const files = document.getElementById('uploadFile').files;
    const thumbnailFile = document.getElementById('uploadThumbnail').files[0];
    const link = document.getElementById('uploadLink').value;
    const isHidden = document.getElementById('uploadIsHidden').checked;
    const status = document.getElementById('uploadStatus');

    const tagCheckboxes = document.querySelectorAll('input[name="uploadTags"]:checked');
    let tags = [];
    tagCheckboxes.forEach(cb => tags.push(cb.value));

    if (!title) { status.innerText = "제목을 입력해주세요."; return; }
    if (files.length === 0 && !link) { status.innerText = "파일을 첨부하거나 링크를 입력해주세요."; return; }

    status.innerText = "업로드 준비 중...";
    try {
        let finalUrl = link;
        let mediaArray = [];
        let thumbnailUrl = null;

        if (thumbnailFile) {
            status.innerText = `썸네일 이미지 업로드 중...`;
            const thumbRef = storage.ref(`gallery/thumb_${Date.now()}_${thumbnailFile.name}`);
            await thumbRef.put(thumbnailFile);
            thumbnailUrl = await thumbRef.getDownloadURL();
        }
        
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileRef = storage.ref(`gallery/${Date.now()}_${file.name}`);
                const uploadTask = fileRef.put(file);
                
                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        status.innerText = `[${i+1}/${files.length}] 열심히 서버로 전송 중입니다... ${progress}%`;
                    }
                );
                
                await uploadTask;
                const url = await fileRef.getDownloadURL();
                
                let fileType = 'image';
                if (file.type.startsWith('video/')) fileType = 'video';
                else if (file.type.startsWith('audio/')) fileType = 'audio';
                else if (file.type.startsWith('application/pdf') || file.type.includes('doc') || file.type.includes('xls') || file.type.includes('ppt') || file.type.includes('zip')) fileType = 'doc';
                
                mediaArray.push({ url: url, type: fileType });
            }
        } else if (link) {
            mediaArray.push({ url: link, type: tags.length > 0 ? tags[0] : 'link' });
        }

        await db.collection('gallery').add({
            tags: tags,
            title: title,
            desc: desc,
            url: finalUrl,
            mediaArray: mediaArray,
            thumbnailUrl: thumbnailUrl,
            isHidden: isHidden,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        status.innerText = "업로드 완료!";
        setTimeout(() => {
            uploadModal.style.display = 'none';
            status.innerText = "";
            document.getElementById('uploadTitle').value = "";
            document.getElementById('uploadDesc').value = "";
            document.getElementById('uploadFile').value = "";
            document.getElementById('uploadThumbnail').value = "";
            document.getElementById('uploadLink').value = "";
            document.getElementById('uploadIsHidden').checked = false;
            document.querySelectorAll('input[name="uploadTags"]').forEach(cb => cb.checked = false);
        }, 1000);
    } catch (error) {
        status.innerText = "오류 발생: " + error.message;
        console.error(error);
    }
});

// --- 수정 기능 처리 ---
document.getElementById('submitEditBtn').addEventListener('click', async () => {
    const docId = document.getElementById('editDocId').value;
    const title = document.getElementById('editTitle').value;
    const desc = document.getElementById('editDesc').value;
    const isHidden = document.getElementById('editIsHidden').checked;
    const status = document.getElementById('editStatus');
    
    if (!title) { status.innerText = "제목을 입력해주세요."; return; }
    
    const tagCheckboxes = document.querySelectorAll('input[name="editTags"]:checked');
    let tags = [];
    tagCheckboxes.forEach(cb => tags.push(cb.value));
    
    status.innerText = "수정 중...";
    try {
        await db.collection('gallery').doc(docId).update({
            title: title,
            desc: desc,
            tags: tags,
            isHidden: isHidden
        });
        status.innerText = "수정 완료!";
        setTimeout(() => {
            document.getElementById('editModal').style.display = 'none';
            status.innerText = "";
        }, 1000);
    } catch (error) {
        status.innerText = "오류 발생: " + error.message;
    }
});

// --- 자료 불러오기 및 렌더링 ---
const gridVideo = document.getElementById('grid-video');
const gridAudio = document.getElementById('grid-audio');
const gridImage = document.getElementById('grid-image');
const gridDoc = document.getElementById('grid-doc');
const gridLink = document.getElementById('grid-link');
const loadingText = document.getElementById('loadingText');

function formatDate(timestamp) {
    if (!timestamp) return "방금 전";
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "오늘";
    if (diffDays === 1) return "1일 전";
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays/7)}주 전`;
    return `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
}

function getCardBadge(tags) {
    if(tags.includes('video')) return "VIDEO";
    if(tags.includes('audio')) return "AUDIO";
    if(tags.includes('image')) return "IMAGE";
    if(tags.includes('doc')) return "DOC";
    if(tags.includes('poster')) return "POSTER";
    if(tags.includes('link')) return "LINK";
    return "MEDIA";
}

function getCardMediaHtml(data, isVideo, isAudio, docId) {
    if (isAudio) {
        let audioUrl = data.thumbnailUrl;
        if (!audioUrl && data.mediaArray && data.mediaArray.length > 0) {
            audioUrl = data.mediaArray[0].url;
        }
        if (!audioUrl) audioUrl = data.url;
        
        if (data.thumbnailUrl) {
            return `
                <img class="real-img" src="${data.thumbnailUrl}" />
                <div class="wave" style="position:absolute; inset:0; height:100%; width:100%; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); z-index:2;">
                    <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
                </div>
            `;
        } else {
            return `<div class="wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>`;
        }
    }
    
    // 단일 미디어 또는 옛날 데이터 (mediaArray 없음)
    if (!data.mediaArray || data.mediaArray.length <= 1) {
        let url = data.thumbnailUrl;
        if (data.mediaArray && data.mediaArray.length === 1 && !url) {
            url = data.mediaArray[0].url;
        } else if (!url) {
            url = data.url;
        }

        if (url) {
            if (isVideo || (url.match(/\.(mp4|webm)/i))) {
                 if (data.thumbnailUrl) return `<img class="real-img" src="${data.thumbnailUrl}" />`;
                 return `<video class="real-video" src="${url}" preload="metadata"></video>`;
            } else if (url.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
                 return `<img class="real-img" src="${url}" />`;
            }
        }
        return `<img class="real-img" src="assets/seal.png" style="object-fit:contain; padding:20px;"/>`;
    }

    // 다중 미디어 (메인화면에서는 대표 이미지만 표시하고 우측 상단에 장수 표시)
    let displayUrl = data.thumbnailUrl || data.mediaArray[0].url;
    let html = '';
    if (data.mediaArray[0].type === 'video' || (displayUrl && displayUrl.match(/\.(mp4|webm)/i))) {
        if (data.thumbnailUrl) {
            html = `<img class="real-img" src="${data.thumbnailUrl}" />`;
        } else {
            html = `<video class="real-video" src="${data.mediaArray[0].url}" preload="metadata"></video>`;
        }
    } else {
        html = `<img class="real-img" src="${displayUrl}" />`;
    }
    html += `<div class="multi-badge" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); color:white; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold; z-index:10;">${data.mediaArray.length}장</div>`;
    return html;
}

function createCard(doc, data) {
    windowDataStore[doc.id] = data; // 저장해두고 모달에서 사용
    
    const isVideo = data.tags && data.tags.includes('video');
    const isAudio = data.tags && data.tags.includes('audio');
    const isLink = data.tags && data.tags.includes('link');
    const badgeText = getCardBadge(data.tags || []);
    const dateText = formatDate(data.createdAt);
    const mediaHtml = getCardMediaHtml(data, isVideo, isAudio, doc.id);
    
    let adminControls = `
        <div class="admin-controls hidden">
            <button class="toggle-hide-btn" data-id="${doc.id}" data-hidden="${data.isHidden ? 'true' : 'false'}" onclick="event.stopPropagation();" style="background:${data.isHidden ? 'var(--orange-soft)' : '#e5e7eb'}; color:${data.isHidden ? '#cc6f1c' : '#4b5563'}; padding: 4px 8px; font-size: 11px; border-radius: 4px; border: none; font-weight: bold;">
                ${data.isHidden ? '👁️ 보이기' : '🙈 숨기기'}
            </button>
            <button class="edit-btn" data-id="${doc.id}" onclick="event.stopPropagation();">수정</button>
            <button class="delete-btn" data-id="${doc.id}" onclick="event.stopPropagation();">삭제</button>
        </div>
    `;

    let targetUrl = data.url;
    if (!targetUrl && data.mediaArray && data.mediaArray.length > 0) {
        targetUrl = data.mediaArray[0].url;
    }
    let clickHandler = isLink ? `window.open('${targetUrl}', '_blank')` : `openDetailModal('${doc.id}')`;
    
    let hiddenClass = data.isHidden ? 'is-hidden-doc' : '';

    return `
      <article class="card ${hiddenClass}" data-title="${(data.title||'').toLowerCase()}" data-desc="${(data.desc||'').toLowerCase()}" onclick="${clickHandler}" style="cursor:pointer;">
        <div class="thumb">
          <span class="badge" style="z-index:10;">
            ${isVideo?'<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>':''}
            ${isAudio?'<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="18" cy="16" r="3" fill="currentColor"/></svg>':''}
            ${!isVideo && !isAudio?'<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><polyline points="21 15 16 10 5 21"/></svg>':''}
            ${badgeText}
          </span>
          ${mediaHtml}
        </div>
        <div class="card-body">
          <div class="card-title">${data.title}</div>
          <div class="card-desc">${data.desc || ''}</div>
          <div class="card-meta" style="display:flex; align-items:center;">
            <span>${dateText}</span>
            <button class="share-btn" onclick="shareItem(event, '${doc.id}')" style="margin-left:auto; color:var(--ink-3); padding:4px; border-radius:4px; transition:color 0.2s;" title="이 자료만 공유하기">
                <svg style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
            ${adminControls}
          </div>
        </div>
      </article>`;
}

// createDocRow 함수는 삭제 (문서도 createCard로 통합)

let currentSnapshot = null;

function renderGallery(snapshot) {
    if (!snapshot) return;
    
    loadingText.style.display = 'none';
    gridVideo.innerHTML = '';
    gridAudio.innerHTML = '';
    gridImage.innerHTML = '';
    gridDoc.innerHTML = '';
    gridLink.innerHTML = '';

    let cntVideo = 0, cntAudio = 0, cntImage = 0, cntDoc = 0, cntLink = 0;
    const user = auth.currentUser;

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const tags = data.tags || [];
        
        // 숨김 파일은 일반 사용자에게는 보이지 않고 카운트도 안됨
        if (data.isHidden && !user) return;
        
        if (tags.includes('video')) {
            gridVideo.innerHTML += createCard(docSnap, data);
            cntVideo++;
        } else if (tags.includes('audio')) {
            gridAudio.innerHTML += createCard(docSnap, data);
            cntAudio++;
        } else if (tags.includes('image') || tags.includes('poster')) {
            gridImage.innerHTML += createCard(docSnap, data);
            cntImage++;
        } else if (tags.includes('link')) {
            gridLink.innerHTML += createCard(docSnap, data);
            cntLink++;
        } else {
            gridDoc.innerHTML += createCard(docSnap, data);
            cntDoc++;
        }
    });

    // 화면 섹션 보이기/숨기기
    document.querySelector('[data-section="video"]').style.display = cntVideo > 0 ? 'flex' : 'none';
    gridVideo.style.display = cntVideo > 0 ? 'grid' : 'none';
    
    document.querySelector('[data-section="audio"]').style.display = cntAudio > 0 ? 'flex' : 'none';
    gridAudio.style.display = cntAudio > 0 ? 'grid' : 'none';
    
    document.querySelector('[data-section="image"]').style.display = cntImage > 0 ? 'flex' : 'none';
    gridImage.style.display = cntImage > 0 ? 'grid' : 'none';
    
    document.querySelector('[data-section="doc"]').style.display = cntDoc > 0 ? 'flex' : 'none';
    gridDoc.style.display = cntDoc > 0 ? 'grid' : 'none';

    document.querySelector('[data-section="link"]').style.display = cntLink > 0 ? 'flex' : 'none';
    gridLink.style.display = cntLink > 0 ? 'grid' : 'none';

    if (cntVideo + cntAudio + cntImage + cntDoc + cntLink === 0) {
        loadingText.innerText = "아직 업로드된 자료가 없습니다.";
        loadingText.style.display = 'block';
    }

    // Stats 업데이트
    document.getElementById('stat-video').innerText = cntVideo;
    document.getElementById('stat-audio').innerText = cntAudio;
    document.getElementById('stat-image').innerText = cntImage;
    document.getElementById('stat-doc').innerText = cntDoc;
    document.getElementById('stat-link').innerText = cntLink;
    
    document.getElementById('chip-video').innerText = cntVideo;
    document.getElementById('chip-audio').innerText = cntAudio;
    document.getElementById('chip-image').innerText = cntImage;
    document.getElementById('chip-doc').innerText = cntDoc;
    document.getElementById('chip-link').innerText = cntLink;
    document.getElementById('chip-all').innerText = cntVideo + cntAudio + cntImage + cntDoc + cntLink;

    updateAdminButtons();
}

function shareItem(e, docId) {
    e.stopPropagation();
    const url = window.location.origin + window.location.pathname + '?id=' + docId;
    navigator.clipboard.writeText(url).then(() => {
        alert("이 자료의 링크가 복사되었습니다! 원하는 곳에 붙여넣기 하세요.");
    });
}

let isFirstLoad = true;

db.collection('gallery').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    currentSnapshot = snapshot;
    renderGallery(snapshot);
    
    // 첫 로딩 시 URL에 id 파라미터가 있으면 해당 자료 바로 열기
    if (isFirstLoad) {
        isFirstLoad = false;
        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('id');
        if (targetId && windowDataStore[targetId]) {
            const data = windowDataStore[targetId];
            if (data.tags && data.tags.includes('link')) {
                let targetUrl = data.url;
                if (!targetUrl && data.mediaArray && data.mediaArray.length > 0) targetUrl = data.mediaArray[0].url;
                if (targetUrl) window.location.href = targetUrl;
            } else {
                document.body.classList.add('shared-view');
                openDetailModal(targetId);
            }
        }
    }
});

function updateAdminButtons() {
    const user = auth.currentUser;
    if (user) {
        document.querySelectorAll('.admin-controls').forEach(div => div.classList.remove('hidden'));
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm("정말 이 자료를 삭제하시겠습니까?")) {
                    await db.collection('gallery').doc(btn.getAttribute('data-id')).delete();
                }
            };
        });
        document.querySelectorAll('.toggle-hide-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const docId = btn.getAttribute('data-id');
                const isHidden = btn.getAttribute('data-hidden') === 'true';
                await db.collection('gallery').doc(docId).update({
                    isHidden: !isHidden
                });
            };
        });
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const docId = btn.getAttribute('data-id');
                const docRef = await db.collection('gallery').doc(docId).get();
                const docData = docRef.data();
                
                document.getElementById('editDocId').value = docId;
                document.getElementById('editTitle').value = docData.title || '';
                document.getElementById('editDesc').value = docData.desc || '';
                document.getElementById('editIsHidden').checked = !!docData.isHidden;
                
                document.querySelectorAll('input[name="editTags"]').forEach(cb => {
                    cb.checked = (docData.tags && docData.tags.includes(cb.value));
                });
                
                document.getElementById('editModal').style.display = 'flex';
            };
        });
    }
}
auth.onAuthStateChanged(() => {
    renderGallery(currentSnapshot);
    updateAdminButtons();
});

// ============ INTERACTION ============
const chips = document.querySelectorAll(".chip");
const navLinks = document.querySelectorAll(".nav-link-item");

function applyCategoryFilter(cat) {
    chips.forEach(x => x.classList.remove("active"));
    navLinks.forEach(x => x.classList.remove("active"));
    
    document.querySelector(`.chip[data-cat="${cat}"]`)?.classList.add("active");
    document.querySelector(`.nav-link-item[data-cat="${cat}"]`)?.classList.add("active");

    document.querySelectorAll(".section-head").forEach(h => {
        const sectionId = h.dataset.section;
        const grid = document.getElementById(`grid-${sectionId}`);
        const show = (cat==="all" || sectionId===cat) && grid.children.length > 0;
        
        h.style.display = show ? "flex" : "none";
        grid.style.display = show ? "grid" : "none";
    });
}

chips.forEach(c => c.addEventListener("click", () => applyCategoryFilter(c.dataset.cat)));
navLinks.forEach(c => c.addEventListener("click", (e) => { e.preventDefault(); applyCategoryFilter(c.dataset.cat); }));

// 검색 기능
const input = document.getElementById("searchInput");

// 강제 자동완성 방지 (크롬 등 브라우저가 멋대로 이메일을 채워넣는 것을 0.1초 뒤에 강제로 지워버림)
setTimeout(() => {
    if (input && input.value.includes('@')) {
        input.value = '';
    }
}, 100);
setTimeout(() => {
    if (input && input.value.includes('@')) {
        input.value = '';
    }
}, 500);

input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll(".card, .doc-row").forEach(el => {
        const t = el.getAttribute('data-title') || '';
        const d = el.getAttribute('data-desc') || '';
        if (!q || t.includes(q) || d.includes(q)) {
            el.style.display = "";
        } else {
            el.style.display = "none";
        }
    });
});

// ============ 상세 보기 모달 (유튜브 스타일) ============
const detailModal = document.getElementById("detailModal");
const detailCloseBtn = document.getElementById("detailCloseBtn");
const detailMediaArea = document.getElementById("detailMediaArea");
const detailTags = document.getElementById("detailTags");
const detailTitle = document.getElementById("detailTitle");
const detailMeta = document.getElementById("detailMeta");
const detailDesc = document.getElementById("detailDesc");

function openDetailModal(docId) {
    if (!detailModal) {
        alert("업데이트가 진행 중입니다. 잠시 후 강력 새로고침(Ctrl + F5)을 해주세요!");
        return;
    }
    
    const data = windowDataStore[docId];
    if (!data) return;

    // 1. 텍스트 세팅
    if (detailTitle) detailTitle.textContent = data.title || '제목 없음';
    if (detailDesc) detailDesc.textContent = data.desc || '';
    if (detailMeta) detailMeta.textContent = formatDate(data.createdAt);
    
    const modalShareBtn = document.getElementById("modalShareBtn");
    if (modalShareBtn) {
        modalShareBtn.onclick = (e) => shareItem(e, docId);
    }
    if (detailMeta) detailMeta.textContent = formatDate(data.createdAt);
    if (detailTags) detailTags.innerHTML = '';
    if (data.tags && data.tags.length > 0 && detailTags) {
        data.tags.forEach(t => {
            const span = document.createElement("span");
            span.className = "badge";
            let label = t;
            if (t === 'video') label = '영상';
            if (t === 'audio') label = '음성';
            if (t === 'image') label = '이미지';
            if (t === 'doc') label = '문서';
            span.textContent = '#' + label;
            detailTags.appendChild(span);
        });
    }

    // 2. 미디어 세팅
    if (!detailMediaArea) return;
    detailMediaArea.innerHTML = '';
    
    let items = [];
    if (data.mediaArray && data.mediaArray.length > 0) {
        items = data.mediaArray;
    } else if (data.url) {
        items = [{ url: data.url }];
    }

    function renderMediaItem(media, isOnlyItem, idx) {
        // 정확한 파일 타입 유추
        let isVideoItem = media.type === 'video' || (media.url && media.url.match(/\.(mp4|webm)/i));
        let isAudioItem = media.type === 'audio' || (media.url && media.url.match(/\.(mp3|wav|ogg|m4a)/i));
        let isImageItem = media.type === 'image' || (media.url && media.url.match(/\.(jpeg|jpg|gif|png|webp)/i));
        let isDocItem = media.type === 'doc' || (media.url && media.url.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip)/i));

        // URL이나 type으로 확인이 안 되면 태그 기반으로 추측 (단, 이미지가 확실한 경우 우선순위)
        if (!isVideoItem && !isAudioItem && !isImageItem && !isDocItem) {
            if (data.tags && data.tags.includes('video')) isVideoItem = true;
            else if (data.tags && data.tags.includes('audio')) isAudioItem = true;
            else if (data.tags && data.tags.includes('doc')) isDocItem = true;
            else isImageItem = true; // 기본적으로 알 수 없는 링크는 이미지로 시도하거나 iframe? 우선 이미지/텍스트로 처리
        }

        // 음성 파일인 경우
        if (isAudioItem) {
            let thumbUrl = data.thumbnailUrl;
            // 썸네일이 없고 미디어가 여러 개일 때 이미지가 있다면 그걸 썸네일로 활용
            if (!thumbUrl && items.length > 1) {
                const imgMedia = items.find(i => i.type === 'image' || (i.url && i.url.match(/\.(jpeg|jpg|gif|png|webp)/i)));
                if (imgMedia) thumbUrl = imgMedia.url;
            }

            let thumbHtml = thumbUrl ? 
                `<img src="${thumbUrl}" style="width:100%; height:80%; object-fit:contain; position:absolute; top:0; padding:20px; box-sizing:border-box;" />` : 
                `<div style="height:100%; width:100%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg, #2b2b2b, #111);">
                    <div style="display:flex; gap:6px;">
                        <i style="width:6px;height:30px;background:#fff;border-radius:3px;animation:wave 1s infinite ease-in-out;"></i>
                        <i style="width:6px;height:45px;background:#fff;border-radius:3px;animation:wave 1s infinite ease-in-out 0.1s;"></i>
                        <i style="width:6px;height:25px;background:#fff;border-radius:3px;animation:wave 1s infinite ease-in-out 0.2s;"></i>
                        <i style="width:6px;height:50px;background:#fff;border-radius:3px;animation:wave 1s infinite ease-in-out 0.3s;"></i>
                        <i style="width:6px;height:35px;background:#fff;border-radius:3px;animation:wave 1s infinite ease-in-out 0.4s;"></i>
                    </div>
                </div>`;

            return `
                <div style="position:relative; width:100%; height:100%; display:flex; flex-direction:column; justify-content:flex-end;">
                    ${thumbHtml}
                    <audio src="${media.url}" controls controlsList="nodownload" ${idx === 0 ? 'autoplay' : ''} style="width:100%; height:60px; z-index:10; border-radius:0; background:#f1f3f5; padding:10px; box-sizing:border-box;"></audio>
                </div>
            `;
        } 
        // 영상 파일인 경우 (controlsList 추가하여 다운로드 버튼 숨김, 우클릭 차단)
        else if (isVideoItem) {
            return `<video src="${media.url}" controls controlsList="nodownload" oncontextmenu="return false;" ${idx === 0 ? 'autoplay' : ''} style="width:100%; height:100%; object-fit:contain;"></video>`;
        } 
        // 문서 파일인 경우 (다운로드 방지 및 풀스크린 뷰어)
        else if (isDocItem) {
            let thumbUrl = data.thumbnailUrl || '';
            if (!thumbUrl && items.length > 1) {
                const imgMedia = items.find(i => i.type === 'image' || (i.url && i.url.match(/\.(jpeg|jpg|gif|png|webp)/i)));
                if (imgMedia) thumbUrl = imgMedia.url;
            }
            
            let displayHtml = thumbUrl ? 
                `<img src="${thumbUrl}" style="max-height:60%; max-width:80%; object-fit:contain; margin-bottom:20px; box-shadow:0 4px 12px rgba(0,0,0,0.1);" />` : 
                `<div style="font-size:64px; margin-bottom:20px;">📄</div>`;

            // 모바일 브라우저 강제 다운로드 방지를 위해 모든 문서를 Google Docs Viewer로 처리
            let viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(media.url)}&embedded=true`;

            return `
                <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8f9fa;">
                    ${displayHtml}
                    <button onclick="openFullscreenViewer('${viewerUrl}')" style="background:var(--blue); color:white; padding:14px 28px; border-radius:30px; border:none; font-weight:bold; font-size:16px; box-shadow:0 4px 12px rgba(0,0,0,0.15); cursor:pointer; transition:transform 0.2s;">
                        📖 전체 화면으로 넓게 읽기
                    </button>
                    <p style="margin-top:14px; font-size:13px; color:#777; font-weight:600;">보안 문서는 다운로드할 수 없습니다.</p>
                </div>
            `;
        }
        // 순수 링크인 경우 (외부 링크 이동 버튼 제공)
        else if (data.tags && data.tags.includes('link')) {
            return `
                <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f1f3f5;">
                    <div style="font-size:64px; margin-bottom:20px;">🌐</div>
                    <h3 style="margin-bottom:20px; color:#333; text-align:center;">외부 링크 자료입니다</h3>
                    <a href="${media.url}" target="_blank" style="background:var(--mint); color:white; padding:14px 28px; border-radius:30px; text-decoration:none; font-weight:bold; font-size:16px; box-shadow:0 4px 12px rgba(0,0,0,0.15); transition:transform 0.2s;">
                        새 창에서 링크 열기
                    </a>
                </div>
            `;
        }
        // 이미지 및 기타인 경우 (새 창 열기 클릭 이벤트 제거, 드래그 차단)
        else {
            return `<img src="${media.url}" oncontextmenu="return false;" draggable="false" style="width:100%; height:100%; object-fit:contain; pointer-events:none;" />`;
        }
    }

    if (items.length === 0) {
        detailMediaArea.innerHTML = `<img src="assets/seal.png" style="padding:20px; object-fit:contain;"/>`;
    } else if (items.length === 1) {
        detailMediaArea.innerHTML = renderMediaItem(items[0], true, 0);
    } else {
        // 다중 슬라이더 처리
        let sliderId = 'detailSlider_' + docId;
        let sliderHtml = `<div class="detail-slider" id="${sliderId}">`;
        items.forEach((media, idx) => {
            sliderHtml += `
                <div class="detail-slide-item">
                    ${renderMediaItem(media, false, idx)}
                </div>`;
        });
        sliderHtml += `</div>
            <button class="detail-slider-btn left" onclick="document.getElementById('${sliderId}').scrollBy({left:-500, behavior:'smooth'})">◀</button>
            <button class="detail-slider-btn right" onclick="document.getElementById('${sliderId}').scrollBy({left:500, behavior:'smooth'})">▶</button>
        `;
        detailMediaArea.innerHTML = sliderHtml;
    }

    detailModal.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // 스크롤 방지
}

if (detailCloseBtn) {
    detailCloseBtn.addEventListener("click", () => {
        detailModal.classList.add("hidden");
        document.body.style.overflow = "";
        detailMediaArea.innerHTML = ""; // 모달 닫을 때 미디어(영상/음성) 재생 중지
    });
}

if (detailModal) {
    detailModal.addEventListener("click", (e) => {
        if (e.target === detailModal) {
            detailModal.classList.add("hidden");
            document.body.style.overflow = "";
            detailMediaArea.innerHTML = "";
        }
    });
}

// ============ 풀스크린 문서 뷰어 ============
function openFullscreenViewer(url) {
    let viewer = document.getElementById('fullscreenViewer');
    if (!viewer) {
        viewer = document.createElement('div');
        viewer.id = 'fullscreenViewer';
        // flex-grow 시 모바일 브라우저 주소창 높이 변화로 인해 구글 문서 뷰어가 무한 리사이즈(가로/세로 변경)되는 버그 방지
        viewer.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:999999; background:#fff; overflow:hidden;';
        viewer.innerHTML = `
            <div style="position:absolute; top:0; left:0; width:100%; height:60px; background:#212529; color:white; display:flex; justify-content:space-between; align-items:center; padding:0 20px; box-sizing:border-box;">
                <span style="font-weight:bold; font-size:16px;">📄 보안 문서 읽기 모드</span>
                <button onclick="document.getElementById('fullscreenViewer').style.display='none'" style="background:none; border:none; color:white; font-size:32px; cursor:pointer; line-height:1;">&times;</button>
            </div>
            <div style="position:absolute; top:60px; left:0; right:0; bottom:0; overflow:hidden;">
                <iframe id="fullscreenIframe" style="width:100%; height:100%; border:none; display:block;" oncontextmenu="return false;"></iframe>
            </div>
        `;
        document.body.appendChild(viewer);
    }
    
    // 로딩 시마다 iframe src 업데이트
    document.getElementById('fullscreenIframe').src = url;
    viewer.style.display = 'block';
}

// ============ 보안 설정 (다운로드 및 캡처 방지) ============
// 우클릭 차단
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// 키보드 단축키 차단 (F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J, Ctrl+U 등)
document.addEventListener('keydown', function(e) {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
    }
    
    // Ctrl 관련 단축키 (Mac의 경우 Cmd 지원을 위해 metaKey 추가 고려)
    if (e.ctrlKey || e.metaKey) {
        const key = e.key ? e.key.toLowerCase() : String.fromCharCode(e.keyCode).toLowerCase();
        
        // 개발자 도구 (I, C, J), 소스보기 (U), 저장 (S), 인쇄 (P)
        if (['i', 'c', 'j', 'u', 's', 'p'].includes(key) || (e.shiftKey && ['i', 'c', 'j'].includes(key))) {
            e.preventDefault();
        }
    }
});
