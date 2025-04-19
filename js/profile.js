// ========== GLOBAL SETUP ==========
const token = sessionStorage.getItem('token');
const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const BASE_API_URL = isLocal ? 'http://localhost:5000/VIPCinema/api' : '/VIPCinema/api';

const STATIC_URL = isLocal ? 'http://localhost:5000' : '';

// ========== GLOBAL FUNCTIONS ==========
function watchTrailer(trailerKey) {
  if (!trailerKey) return alert("Aucune bande-annonce disponible.");
  window.open(`https://www.youtube.com/watch?v=${trailerKey}`, '_blank');
}

async function returnMovie(filmId) {
  const confirmReturn = confirm("Confirmer le retour de ce film ?");
  if (!confirmReturn) return;

  try {
    const response = await fetch(`${BASE_API_URL}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ filmId })
    });

    const data = await response.json();
    if (response.ok) {
      alert("Film retourné !");
      await loadRentedMovies();
    } else {
      alert(data.message || "Erreur lors du retour.");
    }
  } catch (err) {
    console.error(err);
    alert("Erreur réseau.");
  }
}

// ========== MAIN LOGIC ==========
document.addEventListener('DOMContentLoaded', async () => {
  if (!token) {
    alert("Vous devez être connecté.");
    window.location.href = 'index.html';
    return;
  }

  const profileImg = document.getElementById('current-profile-picture');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');
  const fileInput = document.getElementById('profilePicture');
const fileNameDisplay = document.getElementById('file-name');

fileInput.addEventListener('change', () => {
  fileNameDisplay.textContent = fileInput.files[0]?.name || 'Choisissez une image';
});

  async function loadProfile() {
    try {
      const res = await fetch(`${BASE_API_URL}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Échec de la récupération du profil.");
      const user = await res.json();

      userName.textContent = user.name;
      userEmail.textContent = user.email;

      if (user.profile_picture) {
        const url = `${STATIC_URL}${user.profile_picture}?t=${Date.now()}`;
        profileImg.src = url;
        profileImg.style.display = 'block';
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de chargement du profil.");
    }
  }

  async function loadRentedMovies() {
    const list = document.getElementById('rented-movies-list');
    list.innerHTML = '';

    try {
      const response = await fetch(`${BASE_API_URL}/rented-movies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Erreur récupération films loués");
      const movies = await response.json();

      if (movies.length === 0) {
        list.innerHTML = '<li>Aucun film actuellement loué.</li>';
        return;
      }

      for (const movie of movies) {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.film_id}/videos?api_key=17f97fb3319b9e6f62ffe6a5eb45087a&language=fr-FR`);
        const tmdbVideo = await tmdbRes.json();
        const trailer = tmdbVideo.results.find(v => v.type === "Trailer" && v.site === "YouTube");

        const infoRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.film_id}?api_key=17f97fb3319b9e6f62ffe6a5eb45087a&language=fr-FR`);
        const info = await infoRes.json();

        const li = document.createElement('li');
        li.classList.add('rented-movie');
        li.innerHTML = `
          <div class="rented-movie-content">
  <strong>${info.title}</strong> (${info.release_date?.slice(0, 4) || 'N/A'})<br>
  <em>Loué le : ${new Date(movie.rental_date).toLocaleDateString()}</em>
  ${trailer ? `
    <div class="iframe-wrapper">
      <iframe 
        src="https://www.youtube.com/embed/${trailer.key}" 
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        width="100%"
        height="215">
      </iframe>
    </div>` : `<div><em>Bande-annonce non disponible.</em></div>`}
</div>

          <button onclick="returnMovie('${movie.film_id}')">Retourner</button>
        `;
        list.appendChild(li);
      }
    } catch (err) {
      console.error(err);
      list.innerHTML = '<li>Erreur lors du chargement des films loués.</li>';
    }
  }

  await loadProfile();
  await loadRentedMovies();

  document.getElementById('logout-button').addEventListener('click', () => {
    sessionStorage.removeItem('token');
    window.location.href = 'index.html';
  });

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
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
  
      const data = await response.json();
      
      if (response.ok) {
        alert("Photo de profil mise à jour !");
        
        // Only try to update preview if path exists
        if (data.path) {
          const imgUrl = `${STATIC_URL}${data.path}?t=${Date.now()}`;
          profileImg.src = imgUrl;
          profileImg.style.display = 'block';
          if (previewImg) {
            previewImg.src = imgUrl;
            previewImg.style.display = 'block';
          }
        }
      } else {
        alert(data.message || "Échec de l’upload.");
      }
  
    } catch (err) {
      console.error("Erreur d’upload :", err);
      alert("Erreur pendant l’upload.");
    }
  });
});