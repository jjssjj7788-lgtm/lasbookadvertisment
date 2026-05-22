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
