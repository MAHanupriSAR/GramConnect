document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Stop the form from submitting the default way

            const mobileNumber = document.getElementById('credentials').value;
            const password = document.getElementById('password').value;

            if (!mobileNumber || !password) {
                alert('Please enter both your mobile number and password.');
                return;
            }

            const formData = {
                mobileNumber,
                password
            };

            try {
                const response = await fetch('http://localhost:3000/login/villager', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                });

                const result = await response.json();

                if (response.ok) {
                    alert(result.message);
                    
                    // Store the villager ID in local storage
                    if (result.villagerId) {
                        localStorage.setItem('villagerId', result.villagerId);
                    }

                    // Redirect to the dashboard on successful login
                    window.location.href = 'villagerDashboard.html';
                } else {
                    alert(`Login failed: ${result.message}`);
                }

            } catch (error) {
                console.error('Login request failed:', error);
                alert('An error occurred. Please check your connection and try again.');
            }
        });
    }
});