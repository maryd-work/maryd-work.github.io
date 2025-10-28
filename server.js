const express = require('express');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const axios = require('axios');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.'));

if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.error('❌ OPENAI_API_KEY가 설정되지 않았습니다!');
    console.error('📝 .env 파일을 생성하고 OPENAI_API_KEY=your_actual_api_key를 추가해주세요.');
    console.error('🔗 OpenAI API 키는 https://platform.openai.com/api-keys 에서 발급받을 수 있습니다.');
}

// --- Initialize OpenAI Client ---
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// --- Free Image Generation Function using Pollinations (no API key required) ---
async function generateFreeImage(prompt) {
    console.log("Generating image via Pollinations...");
    const seed = Math.floor(Math.random() * 1_000_000);
    const width = 1024;
    const height = 1024;
    // Pollinations will generate an image from this URL directly
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
    return url;
}

function buildKoreanDescription(q1, q2, q3, q4, q5) {
    return `${q2} 소재의 ${q1}로, ${q3}를 중심 포인트로 한 ${q4} 디자인입니다. '${q5}'에서 영감을 받아 조형과 디테일을 정교하게 다듬었으며, 일상과 특별한 순간 모두에 어울리는 고급스러운 분위기를 연출합니다.`;
}

app.post('/generate-image', async (req, res) => {
    console.log("Received request to generate an image with DALL-E.");
    
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
        console.error("API key not configured");
        return res.status(500).json({ 
            error: 'OpenAI API 키가 설정되지 않았습니다. 서버 관리자에게 문의해주세요.',
            details: 'OPENAI_API_KEY 환경변수가 설정되지 않았습니다.'
        });
    }
    
    try {
        const { q1, q2, q3, q4, q5 } = req.body;

        // Validate input
        if (!q1 || !q2 || !q3 || !q4 || !q5) {
            return res.status(400).json({ 
                error: '모든 질문에 답변해주세요.',
                details: '필수 입력 필드가 누락되었습니다.'
            });
        }

        // --- Create a detailed prompt for DALL-E 3 ---
        const prompt = `A professional studio photograph of a single piece of jewelry: a ${q4} style ${q1} made of ${q2}, with a ${q3} centerpiece. The design is inspired by '${q5}'. The background is a clean, solid light color.`;

        console.log("Sending prompt to DALL-E 3:", prompt);

        let imageUrl;
        let description;
        let usedFreeAPI = false;

        try {
            // --- Try DALL-E 3 API first ---
            const response = await openai.images.generate({
                model: "dall-e-2",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                quality: "standard",
            });

            console.log("Received response from DALL-E 3.");
            imageUrl = response.data[0].url;
            description = buildKoreanDescription(q1, q2, q3, q4, q5);
            
        } catch (openaiError) {
            console.log("DALL-E 3 failed, trying free API...");
            
            // If OpenAI fails due to billing or other issues, try free API
            if (openaiError.code === 'billing_hard_limit_reached' || 
                openaiError.status === 429 || 
                openaiError.status === 401) {
                
                try {
                    // Simplified prompt for free API
                    const freePrompt = `A beautiful ${q1} made of ${q2} featuring ${q3}, ${q4} style, inspired by ${q5}, professional jewelry photography`;
                    
                    imageUrl = await generateFreeImage(freePrompt);
                    description = buildKoreanDescription(q1, q2, q3, q4, q5);
                    usedFreeAPI = true;
                    
                } catch (freeError) {
                    console.error("Both OpenAI and free API failed");
                    throw new Error('모든 이미지 생성 서비스에 실패했습니다. 잠시 후 다시 시도해주세요.');
                }
            } else {
                throw openaiError;
            }
        }

        res.json({ 
            imageUrl: imageUrl,
            description: description,
            usedFreeAPI: usedFreeAPI
        });

    } catch (error) {
        console.error("\n--- ERROR IN DALL-E 3 API CALL ---");
        console.error("Error details:", error);
        
        let errorMessage = '디자인 생성에 실패했습니다.';
        let errorDetails = '알 수 없는 오류가 발생했습니다.';
        
        if (error instanceof OpenAI.APIError) {
            console.error("Status:", error.status);
            console.error("Message:", error.message);
            console.error("Code:", error.code);
            console.error("Type:", error.type);
            
            // Provide more specific error messages
            if (error.status === 401) {
                errorMessage = 'OpenAI API 키가 유효하지 않습니다.';
                errorDetails = 'API 키를 확인해주세요.';
            } else if (error.status === 429) {
                errorMessage = 'API 요청 한도를 초과했습니다.';
                errorDetails = '잠시 후 다시 시도해주세요.';
            } else if (error.status === 400) {
                if (error.code === 'billing_hard_limit_reached') {
                    errorMessage = 'OpenAI API 결제 한도에 도달했습니다.';
                    errorDetails = 'OpenAI 계정의 결제 설정을 확인하거나 새로운 API 키를 사용해주세요.';
                } else {
                    errorMessage = '잘못된 요청입니다.';
                    errorDetails = error.message || '입력 내용을 확인해주세요.';
                }
            } else {
                errorDetails = error.message || 'OpenAI API 오류가 발생했습니다.';
            }
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = '네트워크 연결에 실패했습니다.';
            errorDetails = '인터넷 연결을 확인해주세요.';
        }
        
        console.error("--- END ERROR ---\n");
        res.status(500).json({ 
            error: errorMessage,
            details: errorDetails
        });
    }
});

app.post('/describe-image', async (req, res) => {
    try {
        const { imageUrl, q1, q2, q3, q4, q5 } = req.body || {};
        if (!imageUrl) {
            return res.status(400).json({ error: 'imageUrl이 필요합니다.' });
        }
        // If API key not configured, return fallback description
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
            return res.status(200).json({
                description: `${q2 || ''} 소재의 ${q1 || ''}에 ${q3 || ''} 포인트를 더해 ${q4 || ''} 무드로 완성했습니다. '${q5 || ''}'에서 영감을 받아 형태와 광택을 세심하게 다듬어, 일상과 특별한 순간 모두에 조화롭게 어울립니다.`.trim()
            });
        }

        // Use GPT-4o-mini to describe the image with context
        const prompt = `다음 이미지는 맞춤 주얼리 제품 사진입니다. 사용자가 입력한 컨텍스트를 반영해 한국어로 2문장 이내의 세련된 상품 설명을 작성하세요. 과장된 표현은 피하고, 소재/포인트/무드를 자연스럽게 녹여주세요.
- 종류: ${q1}
- 소재: ${q2}
- 포인트: ${q3}
- 스타일: ${q4}
- 영감: ${q5}
출력은 문장만 주세요.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.6,
            messages: [
                { role: 'system', content: '당신은 럭셔리 주얼리 카피라이터입니다.' },
                { role: 'user', content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: imageUrl } }
                ]}
            ]
        });

        const description = completion.choices?.[0]?.message?.content?.trim();
        if (!description) throw new Error('No description');

        return res.json({ description });
    } catch (error) {
        console.error('describe-image error:', error);
        return res.status(200).json({
            description: '세련된 광택과 균형 잡힌 비율로 완성된 디자인으로, 일상과 특별한 순간 모두에 자연스럽게 어울립니다.'
        });
    }
});

app.post('/send-request', async (req, res) => {
    try {
        const { contact, notes, imageUrl, q1, q2, q3, q4, q5 } = req.body;
        if (!contact || !imageUrl) {
            return res.status(400).json({ error: '연락처와 이미지가 필요합니다.' });
        }

        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return res.status(500).json({
                error: '메일 전송 실패',
                details: '서버에 메일 설정이 되어있지 않습니다. 관리자에게 문의하세요.'
            });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: (Number(process.env.SMTP_PORT) === 465),
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });

        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
        console.log(`Attempting to send email from: ${fromEmail}`);

        const subject = `[MARYD 요청] ${contact}님의 커스텀 디자인 요청`;
        const html = `
            <h2>커스텀 디자인 요청</h2>
            <p><strong>연락처:</strong> ${contact}</p>
            <p><strong>추가 요청사항:</strong><br>${(notes || '').replace(/\n/g,'<br>')}</p>
            <p><strong>디자인 입력:</strong><br>
            - q1: ${q1 || ''}<br>
            - q2: ${q2 || ''}<br>
            - q3: ${q3 || ''}<br>
            - q4: ${q4 || ''}<br>
            - q5: ${q5 || ''}</p>
            <p><strong>생성 이미지:</strong></p>
            <p><img src="${imageUrl}" style="max-width:600px;border-radius:8px" /></p>
            <p>이미지 링크: <a href="${imageUrl}">${imageUrl}</a></p>
        `;

        await transporter.sendMail({
            from: fromEmail,
            to: 'maryd.co.kr@gmail.com',
            subject,
            html
        });

        res.json({ ok: true });
    } catch (e) {
        console.error('send-request error:', e);
        let details = e.message;
        if (e.message && e.message.toLowerCase().includes("pattern")) {
            details = `메일 주소 형식 오류: 전송에 사용된 이메일 주소(환경 변수 SMTP_USER 또는 SMTP_FROM 값: '${process.env.SMTP_FROM || process.env.SMTP_USER}')가 유효한 형식이 아닙니다. 실제 존재하는 이메일 주소(예: user@example.com)인지 확인해주세요. 상세 에러: ${e.message}`;
        }
        res.status(500).json({ error: '요청 전송에 실패했습니다.', details: details });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server is running at http://localhost:${port}`);
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
        console.log('⚠️  OpenAI API 키가 설정되지 않았습니다. 이미지 생성 기능이 작동하지 않습니다.');
    } else {
        console.log('✅ OpenAI API 키가 설정되었습니다.');
    }
});