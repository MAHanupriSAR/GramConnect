document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.querySelector('.registration-form');
    const locationBtn = document.getElementById('get-location-btn');
    const locationStatus = document.getElementById('location-status');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');

    // --- Geolocation Logic ---
    if (locationBtn) {
        locationBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                locationStatus.textContent = 'Geolocation is not supported by your browser.';
                return;
            }

            locationStatus.textContent = 'Fetching location...';
            locationBtn.disabled = true;

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    latitudeInput.value = latitude;
                    longitudeInput.value = longitude;
                    locationStatus.textContent = `Location captured successfully.`;
                    locationStatus.style.color = '#38d9a9';
                    locationBtn.style.display = 'none';
                },
                () => {
                    locationStatus.textContent = 'Unable to retrieve location. Please enable location services.';
                    locationStatus.style.color = '#d93838';
                    locationBtn.disabled = false;
                }
            );
        });
    }

    // --- Form Submission Logic ---
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default browser submission

            // Get form values
            const fullName = document.getElementById('full-name').value;
            const mobileNumber = document.getElementById('mobile-number').value;
            const aadhaarNumber = document.getElementById('aadhaar-number').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const terms = document.getElementById('terms').checked;
            const latitude = latitudeInput.value;
            const longitude = longitudeInput.value;

            // --- Comprehensive Client-side Validation ---
            const errors = [];
            if (!fullName.trim()) errors.push('Full Name is required.');
            if (!mobileNumber.trim()) errors.push('Mobile Number is required.');
            if (!aadhaarNumber.trim()) errors.push('Aadhaar Number is required.');
            if (!password) errors.push('Password is required.');
            if (password !== confirmPassword) errors.push('Passwords do not match.');
            if (!latitude || !longitude) errors.push('Please fetch your location before registering.');
            if (!terms) errors.push('You must agree to the Terms & Conditions.');

            if (errors.length > 0) {
                alert('Please fix the following errors:\n\n- ' + errors.join('\n- '));
                return; // Stop the submission
            }

            // Prepare data for sending
            const formData = {
                fullName,
                mobileNumber,
                latitude,
                longitude,
                aadhaarNumber,
                password,
                terms
            };

            try {
                // Send data to the backend server
                const response = await fetch('http://localhost:3000/register/villager', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                });

                const result = await response.json();

                if (response.ok) {
                    alert(result.message);
                    window.location.href = 'login.html'; // Redirect to login page on success
                } else {
                    alert(`Error: ${result.message}`);
                }
            } catch (error) {
                console.error('Submission failed:', error);
                alert('Registration failed. Please check your connection and try again.');
            }
        });
    }
});