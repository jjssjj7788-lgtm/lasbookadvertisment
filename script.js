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
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

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
            tags: tags
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
            if (isVideo || (url.match(/\.(mp4|webm)$/i))) {
                 if (data.thumbnailUrl) return `<img class="real-img" src="${data.thumbnailUrl}" />`;
                 return `<video class="real-video" src="${url}" preload="metadata"></video>`;
            } else if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
                 return `<img class="real-img" src="${url}" />`;
            }
        }
        return `<img class="real-img" src="assets/seal.png" style="object-fit:contain; padding:20px;"/>`;
    }

    // 다중 미디어 (메인화면에서는 대표 이미지만 표시하고 우측 상단에 장수 표시)
    let displayUrl = data.thumbnailUrl || data.mediaArray[0].url;
    let html = '';
    if (data.mediaArray[0].type === 'video' || (displayUrl && displayUrl.match(/\.(mp4|webm)$/i))) {
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
    const badgeText = getCardBadge(data.tags || []);
    const dateText = formatDate(data.createdAt);
    const mediaHtml = getCardMediaHtml(data, isVideo, isAudio, doc.id);
    
    let adminControls = `
        <div class="admin-controls hidden">
            <button class="edit-btn" data-id="${doc.id}" onclick="event.stopPropagation()">수정</button>
            <button class="delete-btn" data-id="${doc.id}" onclick="event.stopPropagation()">삭제</button>
        </div>
    `;

    return `
      <article class="card" data-title="${(data.title||'').toLowerCase()}" data-desc="${(data.desc||'').toLowerCase()}" onclick="openDetailModal('${doc.id}')" style="cursor:pointer;">
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
          <div class="card-meta">
            <span>${dateText}</span>
            ${adminControls}
          </div>
        </div>
      </article>`;
}

function createDocRow(doc, data) {
    const dateText = formatDate(data.createdAt);
    let url = data.mediaArray && data.mediaArray.length > 0 ? data.mediaArray[0].url : data.url;
    let ext = 'DOCX';
    if(url.includes('.pdf')) ext = 'PDF';
    else if(url.includes('.xls')) ext = 'XLSX';
    else if(url.includes('.ppt')) ext = 'PPTX';
    else if(url.includes('.zip')) ext = 'ZIP';

    let adminControls = `
        <div class="admin-controls hidden" style="margin-left:auto;">
            <button class="edit-btn" data-id="${doc.id}">수정</button>
            <button class="delete-btn" data-id="${doc.id}">삭제</button>
        </div>
    `;

    return `
      <div class="doc-row card" data-title="${(data.title||'').toLowerCase()}" data-desc="${(data.desc||'').toLowerCase()}">
        <div class="doc-icon ${ext.toLowerCase()}">${ext}</div>
        <div class="doc-info">
          <div class="t">${data.title}</div>
          <div class="s">${data.desc || ''}</div>
        </div>
        <div class="doc-meta">${dateText}</div>
        ${adminControls}
        <button class="doc-btn" title="열기" onclick="window.open('${url}', '_blank')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>`;
}

db.collection('gallery').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    loadingText.style.display = 'none';
    gridVideo.innerHTML = '';
    gridAudio.innerHTML = '';
    gridImage.innerHTML = '';
    gridDoc.innerHTML = '';

    let cntVideo = 0, cntAudio = 0, cntImage = 0, cntDoc = 0;

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const tags = data.tags || [];
        
        if (tags.includes('video')) {
            gridVideo.innerHTML += createCard(docSnap, data);
            cntVideo++;
        } else if (tags.includes('audio')) {
            gridAudio.innerHTML += createCard(docSnap, data);
            cntAudio++;
        } else if (tags.includes('image') || tags.includes('poster')) {
            gridImage.innerHTML += createCard(docSnap, data);
            cntImage++;
        } else {
            gridDoc.innerHTML += createDocRow(docSnap, data);
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
    gridDoc.style.display = cntDoc > 0 ? 'flex' : 'none';

    if (cntVideo + cntAudio + cntImage + cntDoc === 0) {
        loadingText.innerText = "아직 업로드된 자료가 없습니다.";
        loadingText.style.display = 'block';
    }

    // Stats 업데이트
    document.getElementById('stat-video').innerText = cntVideo;
    document.getElementById('stat-audio').innerText = cntAudio;
    document.getElementById('stat-image').innerText = cntImage;
    document.getElementById('stat-doc').innerText = cntDoc;
    
    document.getElementById('chip-video').innerText = cntVideo;
    document.getElementById('chip-audio').innerText = cntAudio;
    document.getElementById('chip-image').innerText = cntImage;
    document.getElementById('chip-doc').innerText = cntDoc;
    document.getElementById('chip-all').innerText = cntVideo + cntAudio + cntImage + cntDoc;

    updateAdminButtons();
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
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const docId = btn.getAttribute('data-id');
                const docRef = await db.collection('gallery').doc(docId).get();
                const docData = docRef.data();
                
                document.getElementById('editDocId').value = docId;
                document.getElementById('editTitle').value = docData.title || '';
                document.getElementById('editDesc').value = docData.desc || '';
                
                document.querySelectorAll('input[name="editTags"]').forEach(cb => {
                    cb.checked = (docData.tags && docData.tags.includes(cb.value));
                });
                
                document.getElementById('editModal').style.display = 'flex';
            };
        });
    }
}
auth.onAuthStateChanged(() => updateAdminButtons());

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
        grid.style.display = show ? (sectionId === 'doc' ? 'flex' : 'grid') : "none";
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
        let isVideoItem = media.type === 'video' || (media.url && media.url.match(/\.(mp4|webm)$/i));
        let isAudioItem = media.type === 'audio' || (media.url && media.url.match(/\.(mp3|wav|ogg|m4a)$/i));
        let isImageItem = media.type === 'image' || (media.url && media.url.match(/\.(jpeg|jpg|gif|png)$/i));

        // URL이나 type으로 확인이 안 되면 태그 기반으로 추측 (단, 이미지가 확실한 경우 우선순위)
        if (!isVideoItem && !isAudioItem && !isImageItem) {
            if (data.tags && data.tags.includes('video')) isVideoItem = true;
            else if (data.tags && data.tags.includes('audio')) isAudioItem = true;
            else isImageItem = true; // 기본적으로 알 수 없는 링크는 이미지로 시도하거나 iframe? 우선 이미지/텍스트로 처리
        }

        // 음성 파일인 경우
        if (isAudioItem) {
            let thumbUrl = data.thumbnailUrl;
            // 썸네일이 없고 미디어가 여러 개일 때 이미지가 있다면 그걸 썸네일로 활용
            if (!thumbUrl && items.length > 1) {
                const imgMedia = items.find(i => i.type === 'image' || (i.url && i.url.match(/\.(jpeg|jpg|gif|png)$/i)));
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
                    <audio src="${media.url}" controls ${idx === 0 ? 'autoplay' : ''} style="width:100%; height:60px; z-index:10; border-radius:0; background:#f1f3f5; padding:10px; box-sizing:border-box;"></audio>
                </div>
            `;
        } 
        // 영상 파일인 경우
        else if (isVideoItem) {
            return `<video src="${media.url}" controls ${idx === 0 ? 'autoplay' : ''} style="width:100%; height:100%; object-fit:contain;"></video>`;
        } 
        // 이미지 및 기타인 경우
        else {
            return `<img src="${media.url}" style="width:100%; height:100%; object-fit:contain; cursor:pointer;" onclick="window.open('${media.url}', '_blank')" title="클릭하여 원본 보기"/>`;
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
