document.addEventListener('DOMContentLoaded', async () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
        alert("Vous devez être connecté.");
        window.location.href = 'index.html';
        return;
    }

    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const BASE_API_URL = isLocal ? 'http://localhost:5000/VIPcinema/api' : '/VIPcinema/api';
    const STATIC_URL = isLocal ? 'http://localhost:5000' : '';

    const profileImg = document.getElementById('current-profile-picture');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');

    async function loadProfile() {
        try {
            const response = await fetch(`${BASE_API_URL}/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error("Échec de la récupération du profil.");
            const user = await response.json();
            userName.textContent = user.name;
            userEmail.textContent = user.email;

            if (user.profile_picture) {
                const imgUrl = `${STATIC_URL}${user.profile_picture}?t=${Date.now()}`;
                profileImg.src = imgUrl;
                profileImg.style.display = 'block';
            }
        } catch (err) {
            console.error(err);
            alert("Erreur de chargement du profil.");
        }
    }

    await loadProfile();

    // Déconnexion
    document.getElementById('logout-button').addEventListener('click', () => {
        sessionStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    // Formulaire de mise à jour
    document.getElementById('updateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newName').value;
        const email = document.getElementById('newEmail').value;
        const password = document.getElementById('newPassword').value;

        const body = { name, email };
        if (password) body.password = password;

        try {
            const response = await fetch(`${BASE_API_URL}/update-profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const result = await response.json();
            if (response.ok) {
                alert("Informations mises à jour !");
                userName.textContent = name;
                userEmail.textContent = email;
            } else {
                alert(result.message || "Erreur lors de la mise à jour.");
            }
        } catch (err) {
            console.error(err);
            alert("Erreur réseau.");
        }
    });

    // Upload de la photo
    const profileInput = document.getElementById('profilePicture');
    const previewImg = document.getElementById('profile-preview');
    const uploadBtn = document.getElementById('uploadBtn');

    profileInput.addEventListener('change', () => {
        const file = profileInput.files[0];
        if (file) {
            previewImg.src = URL.createObjectURL(file);
            previewImg.style.display = 'block';
        }
    });

    uploadBtn.addEventListener('click', async () => {
        const file = profileInput.files[0];
        if (!file) return alert("Veuillez choisir une image.");

        const formData = new FormData();
        formData.append('profilePicture', file);

        try {
            const response = await fetch(`${BASE_API_URL}/upload-profile-picture`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            if (response.ok && data.path) {
                alert("Photo de profil mise à jour !");
                const imgUrl = `${STATIC_URL}${data.path}?t=${Date.now()}`;
                profileImg.src = imgUrl;
                profileImg.style.display = 'block';
                previewImg.src = imgUrl;
                previewImg.style.display = 'block';
            } else {
                alert(data.message || "Échec de l’upload.");
            }
        } catch (err) {
            console.error("Erreur d’upload :", err);
            alert("Erreur pendant l’upload.");
        }
    });
});
