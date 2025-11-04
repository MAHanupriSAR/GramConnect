document.addEventListener('DOMContentLoaded', () => {
    const takePhotoButton = document.getElementById('take-photo-btn');
    const cameraModal = document.getElementById('camera-modal');
    const closeModalButton = document.getElementById('close-modal-btn');
    const cameraFeed = document.getElementById('camera-feed');
    const captureButton = document.getElementById('capture-btn');
    const previewContainer = document.getElementById('photo-preview-container');
    const capturedImageDataInput = document.getElementById('captured-image-data');
    const galleryInput = document.getElementById('gallery-upload');

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
            alert("Could not access the camera. Please ensure you have a camera connected and have granted permission.");
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

    // --- Voice Recorder Logic ---
    startRecordBtn.addEventListener('click', async () => {
        // 1. Discard previous recording before starting a new one
        resetRecorder(); 

        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(audioStream);

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                // 2. Check the reset flag before creating playback
                if (isResetting) {
                    isResetting = false; // Reset the flag
                    return; // Stop execution to prevent saving
                }
                
                if (audioChunks.length === 0) return;

                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const audioPlayer = new Audio(audioUrl);
                audioPlayer.controls = true;
                audioPlaybackContainer.innerHTML = '';
                audioPlaybackContainer.appendChild(audioPlayer);
            };

            mediaRecorder.start();
            startTimer();
            recorderInitialState.style.display = 'none';
            recorderActiveState.style.display = 'flex';
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access the microphone. Please grant permission and try again.");
        }
    });

    pauseRecordBtn.addEventListener('click', () => {
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
            stopTimer();
            pauseRecordBtn.textContent = 'Resume';
        } else if (mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
            startTimer();
            pauseRecordBtn.textContent = 'Pause';
        }
    });

    doneRecordBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        stopTimer();
        recorderActiveState.style.display = 'none';
        recorderInitialState.style.display = 'block';
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
});