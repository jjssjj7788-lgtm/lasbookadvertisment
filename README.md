# 라스북(Rasbook) - 회사 소개 웹사이트

라스북 회사를 소개하고 다양한 자료를 공유할 수 있는 현대적이고 아름다운 웹사이트입니다.

## 📁 프로젝트 구조

```
라스 선물세트/
├── index.html          # 메인 HTML 파일
├── styles.css          # CSS 스타일시트
├── script.js           # JavaScript 파일
├── README.md           # 이 파일
└── 캐릭터 이미지/       # 캐릭터 이미지 폴더
    ├── KakaoTalk_20260514_141531581.png
    ├── KakaoTalk_20260514_142043102.png
    └── ... (기타 이미지들)
```

## 🎨 주요 기능

### 1. 헤더 & 네비게이션
- 고정된 상단 네비게이션
- 부드러운 스크롤 링크
- 반응형 디자인

### 2. 히어로 섹션
- 캐릭터 이미지 표시
- 회사 소개 문구
- 애니메이션 효과

### 3. 회사 소개 섹션
- 4개의 카드로 회사 가치 표현
- 호버 애니메이션
- 깔끔한 레이아웃

### 4. 자료실 섹션
- 6가지 자료 타입 제공:
  - 🖼️ 이미지
  - 🎥 영상
  - 📋 포스터
  - 🌐 홈페이지 링크
  - 🎙️ 팟캐스트
  - 📄 문서
- 각 자료별 맞춤형 배경색

### 5. 캐릭터 소개
- 캐릭터 이미지 갤러리
- 확대 호버 효과

### 6. 연락처 & 소셜
- 연락처 정보 표시
- 소셜 미디어 링크

## 🎨 색상 팔레트

| 색상 | HEX 코드 | 용도 |
|------|---------|------|
| Primary Pink | #FF6B9D | 주요 색상 |
| Teal | #4ECDC4 | 부분 색상 |
| Yellow | #FFE66D | 악센트 색상 |
| Dark | #2C3E50 | 텍스트 |
| Light | #F7F7F7 | 배경 |

## 🛠️ 커스터마이징 가이드

### 1. 회사 정보 수정
`index.html` 파일을 열어서 다음 부분을 수정하세요:

```html
<!-- 헤더 수정 -->
<div class="logo">
    <h1>라스북</h1>
    <p class="tagline">Rasbook - 우리의 이야기를 나누다</p>
</div>

<!-- 연락처 정보 수정 -->
<div class="contact-card">
    <h4>📧 이메일</h4>
    <p>info@rasbook.com</p>
</div>
```

### 2. 색상 변경
`styles.css` 파일의 `:root` 섹션에서 색상을 변경하세요:

```css
:root {
    --primary-color: #FF6B9D;      /* 메인 색상 */
    --secondary-color: #4ECDC4;    /* 서브 색상 */
    --accent-color: #FFE66D;       /* 포인트 색상 */
}
```

### 3. 캐릭터 이미지 교체
```html
<!-- 캐릭터 이미지 경로 수정 -->
<img src="캐릭터 이미지/새_이미지.png" alt="캐릭터">
```

### 4. 실제 미디어 링크 추가
자료실 섹션의 버튼에 실제 링크를 추가하세요:

```html
<a href="이미지_폴더_링크" class="btn btn-primary">보기</a>
<a href="영상_링크" class="btn btn-primary">보기</a>
<a href="홈페이지_링크" class="btn btn-secondary">방문</a>
```

## 📱 반응형 디자인

웹사이트는 모든 기기에서 완벽하게 작동합니다:
- 📱 모바일 (480px 이하)
- 📱 태블릿 (768px 이하)
- 💻 데스크톱 (1200px 이상)

## 🚀 사용 방법

1. `index.html` 파일을 웹 브라우저에서 열기
2. 필요에 따라 내용 수정
3. 웹 서버에 업로드

## 💡 팁

1. **캐릭터 이미지**: 캐릭터 이미지들은 브라우저 캐시로 인해 스타일링되지 않을 수 있으므로, 필요시 이미지 이름을 변경해주세요.

2. **SEO 최적화**: 더 좋은 검색 엔진 최적화를 위해 `<meta>` 태그 추가:
```html
<meta name="description" content="라스북 회사 소개">
<meta name="keywords" content="라스북, 회사소개, 자료">
```

3. **Google Analytics**: 트래킹을 원하면 `</head>` 태그 앞에 추가:
```html
<!-- Google Analytics 코드 -->
```

4. **폼 추가**: 연락처 폼이 필요하면 Contact 섹션에 추가:
```html
<form action="서버_주소" method="POST">
    <input type="email" name="email" required>
    <input type="submit" value="보내기">
</form>
```

## 📞 문의

웹사이트 관리 및 수정에 대한 문의는 라스북 담당자에게 연락주세요.

---

**제작일**: 2026년 5월 22일  
**버전**: 1.0  
**라이센스**: 라스북 내부용
