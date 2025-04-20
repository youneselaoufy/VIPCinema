// ========== GLOBAL SETUP ==========
const token     = sessionStorage.getItem('token');
const isLocal   = ['localhost', '127.0.0.1'].includes(location.hostname);
const BASE_API_URL = isLocal
  ? 'http://localhost:5000/VIPCinema/api'
  : '/VIPCinema/api';

// For serving uploaded images under /VIPCinema/uploads
const STATIC_URL = isLocal
  ? 'http://localhost:5000/VIPCinema'
  : '/VIPCinema';

// Hoist loadRentedMovies so returnMovie can see it
let loadRentedMovies;

// ========== GLOBAL FUNCTIONS ==========

/**
 * Open a YouTube trailer in a new tab
 */
function watchTrailer(key) {
  if (!key) return alert("Aucune bande‑annonce disponible.");
  window.open(`https://www.youtube.com/watch?v=${key}`, '_blank');
}

/**
 * Return a rented movie and refresh the list
 */
async function returnMovie(filmId) {
  if (!confirm("Confirmer le retour de ce film ?")) return;
  try {
    const res = await fetch(`${BASE_API_URL}/return`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ filmId })
    });
    const data = await res.json();

    if (!res.ok) {
      return alert(data.message || "Erreur lors du retour.");
    }

    alert("Film retourné !");
    await loadRentedMovies();  // ← Now defined in outer scope
  } catch (err) {
    console.error(err);
    alert("Erreur réseau.");
  }
}

// ========== MAIN LOGIC ==========
document.addEventListener('DOMContentLoaded', async () => {
  // ➡️ Redirect to login if no token
  if (!token) {
    alert("Vous devez être connecté.");
    return window.location.href = 'index.html';
  }

  // Element references
  const profileImg     = document.getElementById('current-profile-picture');
  const userName       = document.getElementById('user-name');
  const userEmail      = document.getElementById('user-email');
  const fileInput      = document.getElementById('profilePicture');
  const fileNameDisplay= document.getElementById('file-name');
  const previewImg     = document.getElementById('profile-preview');
  const uploadBtn      = document.getElementById('uploadBtn');

  // Show selected filename
  fileInput.addEventListener('change', () => {
    fileNameDisplay.textContent = fileInput.files[0]?.name || 'Choisissez une image';
    if (fileInput.files[0]) {
      previewImg.src = URL.createObjectURL(fileInput.files[0]);
      previewImg.style.display = 'block';
    }
  });

  // ─── Load user profile ─────────────────────────────────────────────
  async function loadProfile() {
    try {
      const res = await fetch(`${BASE_API_URL}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Échec de la récupération du profil.");
      const user = await res.json();

      userName.textContent  = user.name;
      userEmail.textContent = user.email;

      if (user.profile_picture) {
        profileImg.src = `${STATIC_URL}${user.profile_picture}?t=${Date.now()}`;
        profileImg.style.display = 'block';
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de chargement du profil.");
    }
  }

  // ─── Load rented movies ────────────────────────────────────────────
  loadRentedMovies = async () => {
    const list = document.getElementById('rented-movies-list');
    list.innerHTML = '';

    try {
      const res = await fetch(`${BASE_API_URL}/rented-movies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Erreur récupération films loués.");

      const movies = await res.json();
      if (movies.length === 0) {
        return list.innerHTML = '<li>Aucun film actuellement loué.</li>';
      }

      for (const { film_id, rental_date } of movies) {
        const [ videosRes, infoRes ] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${film_id}/videos?api_key=17f97fb3319b9e6f62ffe6a5eb45087a&language=fr-FR`),
          fetch(`https://api.themoviedb.org/3/movie/${film_id}?api_key=17f97fb3319b9e6f62ffe6a5eb45087a&language=fr-FR`)
        ]);
        const videos = await videosRes.json();
        const info   = await infoRes.json();

        const trailer = (videos.results||[]).find(v => v.type === "Trailer" && v.site === "YouTube");

        const li = document.createElement('li');
        li.className = 'rented-movie';
        li.innerHTML = `
          <div class="rented-movie-content">
            <strong>${info.title}</strong> (${info.release_date?.slice(0,4)||'N/A'})<br>
            <em>Loué le : ${new Date(rental_date).toLocaleDateString()}</em>
            ${ trailer
              ? `<div class="iframe-wrapper">
                  <iframe
                    src="https://www.youtube.com/embed/${trailer.key}"
                    frameborder="0"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    width="100%" height="215">
                  </iframe>
                </div>`
              : `<div><em>Bande-annonce non disponible.</em></div>`
            }
          </div>
          <button onclick="returnMovie('${film_id}')">Retourner</button>
        `;
        list.appendChild(li);
      }
    } catch (err) {
      console.error(err);
      document.getElementById('rented-movies-list').innerHTML =
        '<li>Erreur lors du chargement des films loués.</li>';
    }
  };

  // ─── Wire up logout ─────────────────────────────────────────────────
  document.getElementById('logout-button')
    .addEventListener('click', () => {
      sessionStorage.removeItem('token');
      window.location.href = 'index.html';
    });

  // ─── Handle profile picture upload ─────────────────────────────────
  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return alert("Veuillez choisir une image.");

    const form = new FormData();
    form.append('profilePicture', file);

    try {
      const res  = await fetch(`${BASE_API_URL}/upload-profile-picture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      const data = await res.json();

      if (!res.ok) {
        return alert(data.message || "Échec de l’upload.");
      }

      alert("Photo de profil mise à jour !");
      const imgUrl = `${STATIC_URL}${data.path}?t=${Date.now()}`;
      profileImg.src   = imgUrl;
      previewImg.src   = imgUrl;
      previewImg.style.display = profileImg.style.display = 'block';
    } catch (err) {
      console.error("Erreur d’upload :", err);
      alert("Erreur pendant l’upload.");
    }
  });

  // ─── Handle profile update form ─────────────────────────────────────
  document.getElementById('updateForm')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const name     = document.getElementById('newName').value;
      const email    = document.getElementById('newEmail').value;
      const password = document.getElementById('newPassword').value;

      const body = { name, email };
      if (password) body.password = password;

      try {
        const res  = await fetch(`${BASE_API_URL}/update-profile`, {
          method: 'PUT',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });
        const out = await res.json();
        if (!res.ok) throw new Error(out.message || "Erreur lors de la mise à jour.");
        alert("Informations mises à jour !");
        userName.textContent  = name;
        userEmail.textContent = email;
      } catch (err) {
        console.error(err);
        alert(err.message || "Erreur réseau.");
      }
    });

  // ─── INITIAL LOAD ───────────────────────────────────────────────────
  await loadProfile();
  await loadRentedMovies();
});
