document.addEventListener('DOMContentLoaded', () => {
    const takePhotoButton = document.getElementById('take-photo-btn');
    const cameraModal = document.getElementById('camera-modal');
    const closeModalButton = document.getElementById('close-modal-btn');
    const cameraFeed = document.getElementById('camera-feed');
    const captureButton = document.getElementById('capture-btn');
    const previewContainer = document.getElementById('photo-preview-container');
    const capturedImageDataInput = document.getElementById('captured-image-data');
    const galleryInput = document.getElementById('gallery-upload');

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
});