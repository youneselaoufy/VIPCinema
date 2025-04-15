const genreMap = {
  28: "Action",
  12: "Aventure",
  16: "Animation",
  35: "Comédie",
  80: "Crime",
  99: "Documentaire",
  18: "Drame",
  10751: "Famille",
  14: "Fantastique",
  36: "Histoire",
  27: "Horreur",
  10402: "Musique",
  9648: "Mystère",
  10749: "Romance",
  878: "Science-Fiction",
  10770: "Téléfilm",
  53: "Thriller",
  10752: "Guerre",
  37: "Western"
};

document.addEventListener('DOMContentLoaded', async () => {
  const filmsContainer = document.getElementById('films-container');
  const modal = document.getElementById('film-modal');
  const closeButton = document.querySelector('.close-button');
  const rentButton = document.getElementById('rent-button');
  const returnButton = document.getElementById('return-button');

  const filmTitle = document.getElementById('film-title');
  const filmDescription = document.getElementById('film-description');
  const filmGenre = document.getElementById('film-genre');
  const filmYear = document.getElementById('film-year');
  const trailerFrame = document.getElementById('trailer-frame');

  const token = sessionStorage.getItem('token');
  if (!token) {
      alert("You must be logged in to access this page.");
      window.location.href = 'index.html';
      return;
  }

  const API_KEY = '17f97fb3319b9e6f62ffe6a5eb45087a';
  const TMDB_API_URL = `https://api.themoviedb.org/3/movie/popular?language=fr-FR&page=1&api_key=${API_KEY}`;
  const GENRE_API_URL = `https://api.themoviedb.org/3/genre/movie/list?language=fr-FR&api_key=${API_KEY}`;

  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const BASE_API_URL = isLocal ? 'http://localhost:5000/VIPcinema/api' : '/VIPcinema/api';
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
  

  let genreMap = {};

  const fetchGenres = async () => {
    try {
      const genreResponse = await fetch(GENRE_API_URL);
      if (genreResponse.ok) {
        const genreData = await genreResponse.json();
        genreData.genres.forEach(genre => {
          genreMap[genre.id] = genre.name;
        });
      } else {
        console.warn("Échec du chargement des genres.");
      }
    } catch (error) {
      console.error("Erreur genre TMDb :", error);
    }
  };
  
  const loadFilms = async (searchTerm = '') => {
    try {
      // 1. Fetch multiple pages to get more films
      const allFilms = await fetchMultiplePages(5); // fetch 5 pages
  
      // 2. Filter by search term
      const filteredBySearch = allFilms.filter(film =>
        film.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        film.overview.toLowerCase().includes(searchTerm.toLowerCase())
      );
  
      // 3. Filter out movies with no description or trailer
      const filmsWithDetails = [];
  
      for (const film of filteredBySearch) {
        if (!film.overview || film.overview.trim() === '') continue;
  
        const trailerRes = await fetch(`https://api.themoviedb.org/3/movie/${film.id}/videos?api_key=${API_KEY}&language=fr-FR`);
        const trailerData = await trailerRes.json();
        const trailer = trailerData.results.find(
          video => video.type === 'Trailer' && video.site === 'YouTube'
        );
  
        if (!trailer) continue;
  
        film.trailerKey = trailer.key;
        filmsWithDetails.push(film);
      }
  
      // 4. Render movies
      if (filmsWithDetails.length > 0) {
        filmsContainer.innerHTML = filmsWithDetails.map(film => {
          const title = film.title || "Titre inconnu";
          const poster = film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : 'media/placeholder.png';
          const year = film.release_date ? film.release_date.slice(0, 4) : 'N/A';
          const description = film.overview;
          const genre = film.genre_ids?.length ? genreMap[film.genre_ids[0]] || "Genre inconnu" : "Genre inconnu";
  
          return `
            <div class="film-card" 
                data-id="${film.id}" 
                data-description="${description}" 
                data-trailer="${film.trailerKey}">
              <img src="${poster}" alt="${title}" class="film-image">
              <div class="film-card-content">
                <h3>${title}</h3>
                <p><strong>Genre:</strong> ${genre}</p>
                <p><strong>Year:</strong> ${year}</p>
                <button class="details-button">View Details</button>
              </div>
            </div>
          `;
        }).join('');
      } else {
        filmsContainer.innerHTML = '<p>Aucun film avec description et trailer trouvé.</p>';
      }
  
      // 5. Handle View Details
      document.querySelectorAll('.details-button').forEach(button => {
        button.addEventListener('click', async (e) => {
          const filmCard = e.target.closest('.film-card');
          filmTitle.textContent = filmCard.querySelector('h3').textContent;
          filmDescription.innerHTML = filmCard.dataset.description;
          filmGenre.textContent = filmCard.querySelector('p:nth-of-type(1)').textContent.split(': ')[1];
          filmYear.textContent = filmCard.querySelector('p:nth-of-type(2)').textContent.split(': ')[1];
          rentButton.dataset.filmId = filmCard.dataset.id;
  
          const spinner = document.getElementById('trailer-loader');
          spinner.style.display = 'block';
          trailerFrame.style.display = 'none';
          trailerFrame.src = '';
  
          setTimeout(() => {
            trailerFrame.src = `https://www.youtube.com/embed/${filmCard.dataset.trailer}`;
            trailerFrame.classList.add('visible');
            trailerFrame.style.display = 'block';
            spinner.style.display = 'none';
          }, 100);
  
          modal.classList.add('show');
          modal.style.display = 'flex';
        });
      });
  
    } catch (error) {
      console.error('Error loading movies:', error);
      filmsContainer.innerHTML = '<p>Unable to load movies. Please try again later.</p>';
    }
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
      if (response.ok) {
        alert(data.message);
        modal.style.display = 'none';
        loadFilms();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error renting movie:', error);
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
      if (response.ok) {
        alert(data.message);
        modal.style.display = 'none';
        loadFilms();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error returning movie:', error);
    }
  });

  document.getElementById('search').addEventListener('input', (e) => {
    loadFilms(e.target.value);
  });

  await fetchGenres();
  await loadFilms();
});

function logout() {
  sessionStorage.removeItem('token');
  window.location.href = 'index.html';
}
