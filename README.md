# MARYD - AI Custom Jewelry Design

AI 기반 맞춤 주얼리 디자인 생성 웹 애플리케이션입니다.

## 🚀 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. OpenAI API 키 설정
1. [OpenAI Platform](https://platform.openai.com/api-keys)에서 API 키를 발급받으세요.
2. 프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:
```env
OPENAI_API_KEY=your_actual_api_key_here
PORT=3000
```

### 3. 서버 실행
```bash
node server.js
```

서버가 `http://localhost:3000`에서 실행됩니다.

## 📁 프로젝트 구조

```
maryd/
├── index.html          # 메인 페이지
├── request.html        # AI 디자인 요청 페이지
├── server.js           # Express 서버
├── package.json        # 프로젝트 의존성
├── .env               # 환경 변수 (API 키 등)
└── images/            # 이미지 파일들
    ├── logo.png
    └── ...
```

## 🔧 주요 기능

- **AI 주얼리 디자인 생성**: DALL-E 3를 사용한 맞춤 주얼리 이미지 생성
- **사용자 친화적 인터페이스**: 직관적인 질문 기반 디자인 요청
- **실시간 에러 처리**: 명확한 에러 메시지와 해결 방법 안내

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **AI**: OpenAI DALL-E 3 API
- **Styling**: Custom CSS with responsive design

## ❗ 문제 해결

### "OpenAI API 키가 설정되지 않았습니다" 에러
1. `.env` 파일이 프로젝트 루트에 있는지 확인
2. `OPENAI_API_KEY=your_actual_api_key_here`에서 `your_actual_api_key_here`를 실제 API 키로 교체
3. 서버를 재시작

### "API 요청 한도를 초과했습니다" 에러
- OpenAI API 사용량 한도에 도달했습니다
- 잠시 후 다시 시도하거나 새로운 API 키를 사용하세요

### "OpenAI API 결제 한도에 도달했습니다" 에러
- OpenAI 계정의 결제 한도에 도달했습니다
- [OpenAI Platform](https://platform.openai.com/account/billing)에서 결제 설정을 확인하세요
- 새로운 API 키를 발급받거나 결제 한도를 늘려주세요

### "네트워크 연결에 실패했습니다" 에러
- 인터넷 연결을 확인하세요
- 방화벽 설정을 확인하세요

## 📝 사용 방법

1. `http://localhost:3000`에 접속
2. "AI Custom Jewelry Design" 페이지로 이동
3. 5가지 질문에 답변:
   - 액세서리 종류 (반지, 목걸이, 귀걸이 등)
   - 주된 재료 (금, 은, 원석 등)
   - 핵심 포인트 (탄생석, 특정 문양 등)
   - 전체적인 스타일 (심플, 화려, 빈티지 등)
   - 디자인 영감 (좋아하는 영화, 특정 장소 등)
4. "디자인 생성하기" 버튼 클릭
5. AI가 생성한 맞춤 주얼리 디자인 확인

## 🔒 보안 주의사항

- `.env` 파일을 Git에 커밋하지 마세요
- API 키를 공개 저장소에 노출하지 마세요
- `.gitignore`에 `.env`를 추가하는 것을 권장합니다

## 📞 지원

문제가 발생하면 서버 로그를 확인하거나 GitHub Issues를 통해 문의해주세요. 