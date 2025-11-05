/**
 * Transcribes audio using the Gemini API.
 * @param {string} audioBase64 The base64 encoded audio data.
 * @param {string} mimeType The MIME type of the audio (e.g., 'audio/wav').
 * @returns {Promise<string>} The transcribed text.
 */
export async function transcribeAudioWithGemini(base64Audio) {
    // SECURITY WARNING: Your API key is exposed on the client side.
    // For production, move this logic to a backend server to keep your key secret.
    const API_KEY = 'AIzaSyCX1_xYxI8E0bFfNLxejtwD0OCk6Y9vcqw';
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

    const requestBody = {
        "contents": [
            {
                "parts": [
                    { "text": "Transcribe the following audio and return the transcription in Hindi (हिन्दी) using Devanagari script. Only output the transcription text without any extra commentary:" },
                    {
                        "inline_data": {
                            "mime_type": "audio/webm",
                            "data": base64Audio
                        }
                    }
                ]
            }
        ]
    };

    console.debug('Gemini request:', API_URL, requestBody);
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });

    // Log non-OK responses (with body) to help debugging
    if (!response.ok) {
        let errText = '';
        try {
            errText = await response.text();
        } catch (e) {
            errText = '<no body>'; 
        }
        console.error('Gemini API HTTP error', response.status, errText);
        throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.debug('Gemini response data:', data);
    // Extract the text from the response
    const transcribedText = data.candidates[0].content.parts[0].text;
    let text = transcribedText.trim();

    // If the returned text doesn't contain Devanagari (Hindi) characters, ask the model to translate to Hindi.
    if (!containsDevanagari(text)) {
        const translateBody = {
            "contents": [
                {
                    "parts": [
                        { "text": `Translate the following text to Hindi (Devanagari). Return only the translated text:\n\n${text}` }
                    ]
                }
            ]
        };

        console.debug('Gemini translate request:', API_URL, translateBody);
        const translateResp = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(translateBody)
        });

        if (translateResp.ok) {
            const translateData = await translateResp.json();
            console.debug('Gemini translate response:', translateData);
            const translated = translateData.candidates[0].content.parts[0].text;
            text = translated.trim();
        } else {
            let errText = '';
            try { errText = await translateResp.text(); } catch(e){ errText = '<no body>'; }
            console.warn('Translation fallback failed', translateResp.status, errText, '— returning original transcription.');
        }
    }

    return text;
}

// Helper: detect Devanagari characters in a string
function containsDevanagari(s) {
    return /[\u0900-\u097F]/.test(s);
}