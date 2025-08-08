const express = require('express');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const axios = require('axios');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.'));

// --- Check if OpenAI API key is configured ---
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
        const prompt = `
        Create a photorealistic, high-quality product shot of a piece of jewelry.
        The image should be in a clean, professional studio setting with soft, elegant lighting.
        
        **Jewelry Details:**
        - **Type:** A beautiful ${q1}.
        - **Main Material:** Crafted from polished ${q2}.
        - **Key Feature:** Featuring a stunning ${q3} as the centerpiece.
        - **Style:** The overall design is ${q4}.
        - **Inspiration:** Inspired by the theme of '${q5}'.
        
        The final image should look like a professional photograph for a luxury brand catalog. Do not include any text or logos.
        `;

        console.log("Sending prompt to DALL-E 3:", prompt);

        let imageUrl;
        let description;
        let usedFreeAPI = false;

        try {
            // --- Try DALL-E 3 API first ---
            const response = await openai.images.generate({
                model: "dall-e-3",
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

app.listen(port, () => {
    console.log(`🚀 Server is running at http://localhost:${port}`);
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
        console.log('⚠️  OpenAI API 키가 설정되지 않았습니다. 이미지 생성 기능이 작동하지 않습니다.');
    } else {
        console.log('✅ OpenAI API 키가 설정되었습니다.');
    }
});