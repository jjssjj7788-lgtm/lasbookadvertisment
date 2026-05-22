// 부드러운 스크롤 네비게이션
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// 소셜 링크 클릭
document.querySelectorAll('.social-icon').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const platform = this.textContent;
        alert(`${platform} 페이지로 이동합니다.`);
    });
});

// 페이지 로드 시 애니메이션 효과
window.addEventListener('load', function() {
    const items = document.querySelectorAll('.gallery-item, .about-card, .character-card');
    items.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.animation = `fadeInUp 0.6s ease forwards`;
        item.style.animationDelay = `${index * 0.1}s`;
    });
});

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// 헤더 스크롤 효과
let lastScrollTop = 0;
const header = document.querySelector('.header');

window.addEventListener('scroll', function() {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 100) {
        header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    } else {
        header.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
    }
});

// 반응형 메뉴 토글 (필요시)
function toggleMenu() {
    const nav = document.querySelector('.nav');
    nav.classList.toggle('active');
}

console.log('라스북 웹사이트에 오신 것을 환영합니다!');

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
const loginModal = document.getElementById('loginModal');
const uploadModal = document.getElementById('uploadModal');
const openLoginBtn = document.getElementById('openLoginBtn');
const openUploadBtn = document.getElementById('openUploadBtn');
const logoutBtn = document.getElementById('logoutBtn');
const closeLoginBtn = document.getElementById('closeLoginBtn');
const closeUploadBtn = document.getElementById('closeUploadBtn');

// 모달 열기/닫기
openLoginBtn.addEventListener('click', (e) => { e.preventDefault(); loginModal.style.display = 'flex'; });
openUploadBtn.addEventListener('click', () => { uploadModal.style.display = 'flex'; });
closeLoginBtn.addEventListener('click', () => { loginModal.style.display = 'none'; });
closeUploadBtn.addEventListener('click', () => { uploadModal.style.display = 'none'; });
window.addEventListener('click', (e) => {
    if (e.target == loginModal) loginModal.style.display = 'none';
    if (e.target == uploadModal) uploadModal.style.display = 'none';
});

// --- 인증 (로그인/로그아웃) ---
auth.onAuthStateChanged(user => {
    if (user) {
        // 관리자 로그인 됨
        openUploadBtn.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        openLoginBtn.style.display = 'none';
    } else {
        // 비로그인
        openUploadBtn.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        openLoginBtn.style.display = 'inline';
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
    const type = document.getElementById('uploadType').value;
    const title = document.getElementById('uploadTitle').value;
    const desc = document.getElementById('uploadDesc').value;
    const file = document.getElementById('uploadFile').files[0];
    const link = document.getElementById('uploadLink').value;
    const status = document.getElementById('uploadStatus');

    if (!title) { status.innerText = "제목을 입력해주세요."; return; }
    if (!file && !link) { status.innerText = "파일을 첨부하거나 링크를 입력해주세요."; return; }

    status.innerText = "업로드 중...";
    try {
        let finalUrl = link;
        
        // 파일이 첨부된 경우 Storage에 업로드
        if (file) {
            const fileRef = storage.ref(`gallery/${Date.now()}_${file.name}`);
            const uploadTask = fileRef.put(file);
            
            // 업로드 진행률 표시
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    status.innerText = `열심히 서버로 전송 중입니다... ${progress}%`;
                }
            );
            
            await uploadTask;
            finalUrl = await fileRef.getDownloadURL();
        }

        // Firestore에 데이터 저장
        await db.collection('gallery').add({
            type: type,
            title: title,
            desc: desc,
            url: finalUrl,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        status.innerText = "업로드 완료!";
        setTimeout(() => {
            uploadModal.style.display = 'none';
            status.innerText = "";
            document.getElementById('uploadTitle').value = "";
            document.getElementById('uploadDesc').value = "";
            document.getElementById('uploadFile').value = "";
            document.getElementById('uploadLink').value = "";
        }, 1000);
    } catch (error) {
        status.innerText = "오류 발생: " + error.message;
        console.error(error);
    }
});

// --- 자료 불러오기 ---
const galleryContainer = document.getElementById('dynamicGallery');

const typeInfo = {
    'image': { icon: '🖼️', label: '이미지', class: 'image-item', btn: '보기' },
    'video': { icon: '🎥', label: '영상', class: 'video-item', btn: '보기' },
    'poster': { icon: '📋', label: '포스터', class: 'poster-item', btn: '보기' },
    'link': { icon: '🌐', label: '홈페이지', class: 'link-item', btn: '방문' },
    'audio': { icon: '🎙️', label: '음성 강좌', class: 'audio-item', btn: '듣기' },
    'doc': { icon: '📄', label: '문서', class: 'doc-item', btn: '다운로드' }
};

db.collection('gallery').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    galleryContainer.innerHTML = ''; // 초기화
    if (snapshot.empty) {
        galleryContainer.innerHTML = '<p style="text-align:center; grid-column: 1 / -1; color:#999; padding: 40px;">아직 업로드된 자료가 없습니다.</p>';
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        const info = typeInfo[data.type] || typeInfo['link'];
        
        let mediaHtml = `<a href="${data.url}" class="btn btn-primary" target="_blank" style="margin-top:10px; display:inline-block;">${info.btn}</a>`;
        
        if (data.type === 'video') {
            if (data.url.includes('drive.google.com')) {
                const previewUrl = data.url.replace(/\/view.*/, '/preview');
                mediaHtml = `<iframe src="${previewUrl}" width="100%" height="200" style="border:none; border-radius:10px; margin-top:10px;" allowfullscreen></iframe>`;
            } else if (data.url.includes('youtube.com') || data.url.includes('youtu.be')) {
                let videoId = "";
                if (data.url.includes('v=')) videoId = data.url.split('v=')[1].split('&')[0];
                else if (data.url.includes('youtu.be/')) videoId = data.url.split('youtu.be/')[1].split('?')[0];
                if (videoId) mediaHtml = `<iframe src="https://www.youtube.com/embed/${videoId}" width="100%" height="200" style="border:none; border-radius:10px; margin-top:10px;" allowfullscreen></iframe>`;
            } else {
                mediaHtml = `<video src="${data.url}" controls width="100%" style="border-radius:10px; margin-top:10px; max-height:200px; background:#000;"></video>`;
            }
        } else if (data.type === 'image') {
            mediaHtml = `<img src="${data.url}" width="100%" style="border-radius:10px; margin-top:10px; max-height:200px; object-fit:contain; background:#f9f9f9;">`;
        } else if (data.type === 'audio') {
            mediaHtml = `<audio src="${data.url}" controls style="width:100%; margin-top:10px;"></audio>`;
        }
        
        const itemHtml = `
            <div class="gallery-item" style="animation: fadeInUp 0.6s ease forwards;">
                <div class="gallery-content ${info.class}">
                    <div class="media-icon">${info.icon}</div>
                    <h4>${info.label}</h4>
                </div>
                <h5 style="text-align:center; margin-top:15px; color:var(--primary-color);">${data.title}</h5>
                <p>${data.desc}</p>
                ${mediaHtml}
                <button class="delete-btn btn btn-secondary hidden" style="margin: 10px 20px 20px; font-size:12px; padding: 5px 10px; background:#ff4444;" data-id="${doc.id}">삭제</button>
            </div>
        `;
        galleryContainer.innerHTML += itemHtml;
    });

    // 관리자일 경우 삭제 버튼 표시
    auth.onAuthStateChanged(user => {
        if (user) {
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.classList.remove('hidden');
                btn.onclick = async () => {
                    if (confirm("정말 이 자료를 삭제하시겠습니까?")) {
                        await db.collection('gallery').doc(btn.getAttribute('data-id')).delete();
                    }
                };
            });
        }
    });
});
