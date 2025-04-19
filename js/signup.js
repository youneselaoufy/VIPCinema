document.getElementById('signup-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        const BASE_API_URL = isLocal ? 'http://localhost:5000/VIPCinema/api' : '/VIPCinema/api';




        const response = await fetch(`${BASE_API_URL}/register`, {


            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message);
            window.location.href = 'index.html'; // Redirect on success
        } else {
            alert(data.message); // Show error message
        }
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        alert('Une erreur est survenue. Veuillez réessayer.');
    }
});
