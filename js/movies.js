const genreMap = {
  28: "Action", 12: "Aventure", 16: "Animation", 35: "Comédie", 80: "Crime", 99: "Documentaire",
  18: "Drame", 10751: "Famille", 14: "Fantastique", 36: "Histoire", 27: "Horreur", 10402: "Musique",
  9648: "Mystère", 10749: "Romance", 878: "Science-Fiction", 10770: "Téléfilm",
  53: "Thriller", 10752: "Guerre", 37: "Western"
};

const filmsPerPage = 10;
let currentPage = 1;
let allValidFilms = [];

document.addEventListener('DOMContentLoaded', async () => {
  const filmsContainer = document.getElementById('films-container');
  const paginationControls = document.getElementById('pagination-controls');
  const modal = document.getElementById('film-modal');
  const closeButton = document.querySelector('.close-button');
  const rentButton = document.getElementById('rent-button');
  const returnButton = document.getElementById('return-button');
  const filmTitle = document.getElementById('film-title');
  const filmDescription = document.getElementById('film-description');
  const filmGenre = document.getElementById('film-genre');
  const filmYear = document.getElementById('film-year');
  const trailerFrame = document.getElementById('trailer-frame');
  const spinner = document.getElementById('trailer-loader');

  const token = sessionStorage.getItem('token');
  if (!token) {
    alert("You must be logged in to access this page.");
    window.location.href = 'index.html';
    return;
  }

  const API_KEY = '17f97fb3319b9e6f62ffe6a5eb45087a';
  const GENRE_API_URL = `https://api.themoviedb.org/3/genre/movie/list?language=fr-FR&api_key=${API_KEY}`;
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const BASE_API_URL = isLocal ? 'http://localhost:5000/VIPCinema/api' : '/VIPCinema/api';

  const fetchMultiplePages = async (pageCount = 5) => {
    let results = [];
    for (let page = 1; page <= pageCount; page++) {
      const res = await fetch(`https://api.themoviedb.org/3/movie/popular?language=fr-FR&page=${page}&api_key=${API_KEY}`);
      if (res.ok) {
        const data = await res.json();
        results = results.concat(data.results);
      }
    }
    return results;
  };

  const fetchGenres = async () => {
    try {
      const res = await fetch(GENRE_API_URL);
      if (res.ok) {
        const data = await res.json();
        data.genres.forEach(g => genreMap[g.id] = g.name);
      }
    } catch (err) {
      console.warn("Genre loading failed:", err);
    }
  };

  const renderFilmsPage = (films, page = 1) => {
    const start = (page - 1) * filmsPerPage;
    const end = start + filmsPerPage;
    const filmsToRender = films.slice(start, end);

    if (filmsToRender.length === 0) {
      filmsContainer.innerHTML = '<p>Aucun film à afficher.</p>';
      paginationControls.innerHTML = '';
      return;
    }

    filmsContainer.innerHTML = filmsToRender.map(film => {
      const title = film.title || "Titre inconnu";
      const poster = film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : 'media/placeholder.png';
      const year = film.release_date ? film.release_date.slice(0, 4) : 'N/A';
      const description = film.overview;
      const genre = film.genre_ids?.length ? genreMap[film.genre_ids[0]] || "Genre inconnu" : "Genre inconnu";

      return `
        <div class="film-card" data-id="${film.id}" data-description="${description}" data-trailer="${film.trailerKey}">
          <img src="${poster}" alt="${title}" class="film-image" />
          <div class="film-card-content">
            <h3>${title}</h3>
            <p><strong>Genre:</strong> ${genre}</p>
            <p><strong>Year:</strong> ${year}</p>
            <button class="details-button">View Details</button>
          </div>
        </div>
      `;
    }).join('');

    paginationControls.innerHTML = '';
    const totalPages = Math.ceil(films.length / filmsPerPage);
    for (let i = 1; i <= totalPages; i++) {
      paginationControls.innerHTML += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    document.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        renderFilmsPage(allValidFilms, currentPage);
      });
    });

    bindDetailsListeners();
  };

  const bindDetailsListeners = () => {
    document.querySelectorAll('.details-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const card = e.target.closest('.film-card');
        filmTitle.textContent = card.querySelector('h3').textContent;
        filmDescription.innerHTML = card.dataset.description;
        filmGenre.textContent = card.querySelector('p:nth-of-type(1)').textContent.split(': ')[1];
        filmYear.textContent = card.querySelector('p:nth-of-type(2)').textContent.split(': ')[1];
        rentButton.dataset.filmId = card.dataset.id;

        spinner.style.display = 'block';
        trailerFrame.style.display = 'none';
        trailerFrame.src = '';

        setTimeout(() => {
          trailerFrame.src = `https://www.youtube.com/embed/${card.dataset.trailer}`;
          trailerFrame.style.display = 'block';
          spinner.style.display = 'none';
        }, 100);

        modal.classList.add('show');
        modal.style.display = 'flex';
      });
    });
  };

  const loadFilms = async (searchTerm = '') => {
    const allFilms = await fetchMultiplePages(5);
    const filtered = allFilms.filter(f =>
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      f.overview && f.overview.trim() !== ''
    );

    const validFilms = [];
    for (const film of filtered) {
      const trailerRes = await fetch(`https://api.themoviedb.org/3/movie/${film.id}/videos?api_key=${API_KEY}&language=fr-FR`);
      const trailerData = await trailerRes.json();
      const trailer = trailerData.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
      if (trailer) {
        film.trailerKey = trailer.key;
        validFilms.push(film);
      }
    }

    allValidFilms = validFilms;
    renderFilmsPage(allValidFilms, currentPage);
  };

  closeButton.addEventListener('click', () => {
    modal.classList.remove('show');
    modal.style.display = 'none';
    trailerFrame.src = '';
    trailerFrame.style.display = 'none';
  });

  rentButton.addEventListener('click', async () => {
    const filmId = rentButton.dataset.filmId;
    try {
      const response = await fetch(`${BASE_API_URL}/rent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ filmId })
      });
      const data = await response.json();
      alert(data.message);
      if (response.ok) modal.style.display = 'none';
    } catch (err) {
      console.error('Erreur location:', err);
    }
  });

  returnButton.addEventListener('click', async () => {
    const filmId = rentButton.dataset.filmId;
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
      alert(data.message);
      if (response.ok) modal.style.display = 'none';
    } catch (err) {
      console.error('Erreur retour:', err);
    }
  });

  document.getElementById('search').addEventListener('input', (e) => {
    currentPage = 1;
    loadFilms(e.target.value);
  });

  await fetchGenres();
  await loadFilms();
  
});

function logout() {
  sessionStorage.removeItem('token');
  window.location.href = 'index.html';
}
