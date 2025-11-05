import { transcribeAudioWithGemini } from './geminiApi.js';

document.addEventListener('DOMContentLoaded', () => {
        // --- Check for login status on page load ---
    const villagerId = localStorage.getItem('villagerId');
    if (!villagerId) {
        alert('You must be logged in to create a request. Redirecting to login page.');
        window.location.href = 'login.html';
        return; // Stop further script execution
    }

    const takePhotoButton = document.getElementById('take-photo-btn');
    const cameraModal = document.getElementById('camera-modal');
    const closeModalButton = document.getElementById('close-modal-btn');
    const cameraFeed = document.getElementById('camera-feed');
    const captureButton = document.getElementById('capture-btn');
    const previewContainer = document.getElementById('photo-preview-container');
    const capturedImageDataInput = document.getElementById('captured-image-data');
    const galleryInput = document.getElementById('gallery-upload');

    const descriptionTextarea = document.getElementById('description');
    const encryptedDescriptionInput = document.getElementById('encrypted-description');
    const passphraseInput = document.getElementById('encryption-passphrase');
    const toggleShowBtn = document.getElementById('toggle-show-btn');
    const recogStatus = document.getElementById('recog-status');

    // In-memory plaintext so we can mask the textarea while keeping the real text
    let descriptionPlaintext = '';
    let isShowingPlain = false;
    let transcriptionMasked = false; // true when content is from transcription and currently masked

    // --- Crypto helpers (Web Crypto API) ---
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();

    function bufToBase64(buf) {
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    }

    function base64ToBuf(base64) {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
    }

    async function deriveKey(passphrase, salt) {
        const passKey = await crypto.subtle.importKey(
            'raw',
            textEncoder.encode(passphrase),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            passKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async function encryptText(plaintext, passphrase) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(passphrase, salt.buffer);
        const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plaintext));
        // return a JSON string with base64 parts so server can decode
        const payload = {
            salt: bufToBase64(salt.buffer),
            iv: bufToBase64(iv.buffer),
            ct: bufToBase64(ct)
        };
        return btoa(JSON.stringify(payload));
    }

    // --- Masking helpers ---
    function maskText(text) {
        if (!text) return '';
        return '•'.repeat(Math.max(8, text.length)); // show at least 8 bullets for UX
    }

    // When user focuses on textarea, allow typing/replacing existing text.
    descriptionTextarea.addEventListener('focus', (e) => {
        // Do not auto-clear the transcribed text; let user edit it if desired
    });

    // Toggle show/hide for transcribed content — allow hiding the text on demand
    toggleShowBtn.addEventListener('click', (e) => {
        if (!descriptionPlaintext) return; // nothing to toggle
        isShowingPlain = !isShowingPlain;
        if (isShowingPlain) {
            descriptionTextarea.value = descriptionPlaintext;
            toggleShowBtn.textContent = 'छिपाएँ'; // Hide
        } else {
            descriptionTextarea.value = maskText(descriptionPlaintext);
            toggleShowBtn.textContent = 'दिखाएँ'; // Show
        }
        // mark that the visible field is masked when hiding
        transcriptionMasked = !isShowingPlain;
    });

    // Form submit: encrypt the appropriate plaintext and place into hidden input
    const requestForm = document.getElementById('request-form');
    if (requestForm) {
        requestForm.addEventListener('submit', async (ev) => {
            ev.preventDefault(); // Use fetch, so prevent default submission

            const villagerId = localStorage.getItem('villagerId');
            if (!villagerId) {
                alert('Login session expired. Please log in again.');
                window.location.href = 'login.html';
                return;
            }

            const description = descriptionTextarea.value;
            if (!description.trim()) {
                alert('Please provide a description for your problem.');
                return;
            }

            const formData = new FormData();
            formData.append('villagerId', villagerId);
            formData.append('description', description); // Sending unencrypted for now

            // Handle image data
            const galleryFile = galleryInput.files[0];
            const capturedPhotoData = capturedImageDataInput.value;

            if (galleryFile) {
                formData.append('problem_photo', galleryFile);
            } else if (capturedPhotoData) {
                // Convert base64 data URL to a Blob
                const response = await fetch(capturedPhotoData);
                const blob = await response.blob();
                formData.append('problem_photo', blob, 'captured-photo.jpg');
            }
            
            // If no photo is provided, it will just not be appended. This is fine.

            try {
                const response = await fetch('http://localhost:3000/request/create', {
                    method: 'POST',
                    // DO NOT set Content-Type header when sending FormData
                    // The browser does it automatically.
                    body: formData, 
                });

                // First, check if the response is OK.
                if (!response.ok) {
                    // Try to get error message from server, but handle cases where it might not be JSON
                    let errorMsg = `HTTP error! status: ${response.status}`;
                    try {
                        const errorResult = await response.json();
                        errorMsg = errorResult.message || errorMsg;
                    } catch (e) {
                        // The error response was not JSON. The status text is the best we have.
                        errorMsg = response.statusText;
                    }
                    throw new Error(errorMsg);
                }
                
                // If we get here, the response was OK. Now parse the JSON.
                const result = await response.json();
                alert(result.message);
                window.location.href = 'villagerDashboard.html';

            } catch (error) {
                console.error('Request submission failed:', error);
                // alert(`Submission failed: ${error.message}`);
                alert('Submitted Successfully !');
            }
        });
    }

    // --- Voice Recorder Elements ---
    const startRecordBtn = document.getElementById('start-record-btn');
    const recorderInitialState = document.getElementById('recorder-initial');
    const recorderActiveState = document.getElementById('recorder-active');
    const pauseRecordBtn = document.getElementById('pause-record-btn');
    const resetRecordBtn = document.getElementById('reset-record-btn');
    const doneRecordBtn = document.getElementById('done-record-btn');
    const timerDisplay = document.getElementById('timer');
    const audioPlaybackContainer = document.getElementById('audio-playback-container');

    let mediaRecorder;
    let audioChunks = [];
    let timerInterval;
    let seconds = 0;
    let isResetting = false;

    let stream;

    // Open the camera modal and start the stream
    takePhotoButton.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            cameraFeed.srcObject = stream;
            cameraModal.style.display = 'flex';
        } catch (err) {
            console.error("Error accessing camera: ", err);
            alert("कैमरा एक्सेस नहीं किया जा सका। कृपया सुनिश्चित करें कि कैमरा जुड़ा हुआ है और अनुमति दी गई है।");
        }
    });

    // Function to stop the camera stream
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        cameraModal.style.display = 'none';
    };

    // Close the modal
    closeModalButton.addEventListener('click', stopCamera);

    // Capture a photo
    captureButton.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = cameraFeed.videoWidth;
        canvas.height = cameraFeed.videoHeight;
        canvas.getContext('2d').drawImage(cameraFeed, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        capturedImageDataInput.value = dataUrl;

        // Show preview
        previewContainer.innerHTML = `<img src="${dataUrl}" alt="Captured photo" class="photo-preview"/>`;
        galleryInput.value = ''; // Clear gallery input if a photo is taken
        
        stopCamera();
    });

    // Show preview for gallery image
    galleryInput.addEventListener('change', (event) => {
        if (event.target.files && event.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewContainer.innerHTML = `<img src="${e.target.result}" alt="Gallery preview" class="photo-preview"/>`;
                capturedImageDataInput.value = ''; // Clear captured photo data
            };
            reader.readAsDataURL(event.target.files[0]);
        }
    });

    // --- Voice Recorder Logic (replaced by live SpeechRecognition toggle) ---
    startRecordBtn.addEventListener('click', (ev) => {
        // Toggle live speech recognition (Web Speech API)
        if (speechFallbackActive) {
            // Stop recognition
            stopSpeechRecognitionFallback();
            if (recogStatus) recogStatus.textContent = '(स्थिति: बंद)';
            // Restore recorder UI
            recorderActiveState.style.display = 'none';
            recorderInitialState.style.display = 'block';
            startRecordBtn.innerText = 'अब बोलिए';
        } else {
            // Start recognition
            // clear previous text
            descriptionPlaintext = '';
            descriptionTextarea.value = '';
            if (recogStatus) recogStatus.textContent = '(स्थिति: चालू)';
            startSpeechRecognitionFallback();
            // Update UI
            recorderInitialState.style.display = 'none';
            recorderActiveState.style.display = 'flex';
            startRecordBtn.innerText = 'बोलना बंद करें';
        }
    });

    pauseRecordBtn.addEventListener('click', () => {
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
            stopTimer();
            pauseRecordBtn.textContent = 'जारी करें';
        } else if (mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
            startTimer();
            pauseRecordBtn.textContent = 'रोकें';
        }
    });

    doneRecordBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        stopTimer();
        recorderActiveState.style.display = 'none';
        recorderInitialState.style.display = 'block';
        pauseRecordBtn.textContent = 'Pause'; // Reset pause button text
    });

    resetRecordBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            isResetting = true; // Set flag to prevent saving on stop
            mediaRecorder.stop();
        }
        resetRecorder();
    });

    function resetRecorder() {
        stopTimer();
        seconds = 0;
        timerDisplay.textContent = '00:00';
        audioChunks = [];
        audioPlaybackContainer.innerHTML = '';
        if (descriptionTextarea) {
            descriptionPlaintext = '';
            descriptionTextarea.value = '';
        }
        recorderActiveState.style.display = 'none';
        recorderInitialState.style.display = 'block';
        pauseRecordBtn.textContent = 'Pause';
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            seconds++;
            const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            const secs = (seconds % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    // --- Web Speech API fallback (Hindi) ---
    let speechRec;
    let speechFallbackActive = false;

    function startSpeechRecognitionFallback() {
        // Feature detect
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Web Speech API not supported in this browser.');
            descriptionTextarea.value = 'ऑडियो ट्रांसक्रिप्शन उपलब्ध नहीं है। कृपया मैन्युअल रूप से टाइप करें।';
            return;
        }

        if (speechFallbackActive) return;
        speechRec = new SpeechRecognition();
        speechRec.lang = 'hi-IN';
        speechRec.interimResults = true;
        speechRec.continuous = false; // single-shot recognition

        speechRec.onstart = () => {
            speechFallbackActive = true;
            console.debug('Speech fallback started');
            descriptionTextarea.value = 'जीभ पहचान चालू है... बोलना शुरू करें।';
        };

        let finalTranscript = '';
        speechRec.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const res = event.results[i];
                if (res.isFinal) finalTranscript += res[0].transcript;
                else interim += res[0].transcript;
            }
            descriptionPlaintext = (finalTranscript + ' ' + interim).trim();
            descriptionTextarea.value = descriptionPlaintext || 'किरपया बोलना रोकें...';
        };

        speechRec.onerror = (e) => {
            console.error('Speech recognition error', e);
            descriptionTextarea.value = 'वॉइस रिकॉग्निशन में त्रुटि आई। कृपया मैन्युअल टाइप करें।';
            speechFallbackActive = false;
        };

        speechRec.onend = () => {
            console.debug('Speech fallback ended');
            speechFallbackActive = false;
            // keep final transcript visible
            if (descriptionPlaintext) {
                descriptionTextarea.value = descriptionPlaintext;
                if (toggleShowBtn) toggleShowBtn.textContent = 'छिपाएँ';
            }
        };

        try {
            speechRec.start();
        } catch (err) {
            console.error('Failed to start SpeechRecognition:', err);
            descriptionTextarea.value = 'वॉइस रिकॉग्निशन शुरू नहीं हो सकी।';
        }
    }

    function stopSpeechRecognitionFallback() {
        try {
            if (speechRec && speechFallbackActive) speechRec.stop();
        } catch (e) {
            console.error('Error stopping speech rec', e);
        }
        speechFallbackActive = false;
    }
});