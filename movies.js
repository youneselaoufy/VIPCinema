document.addEventListener('DOMContentLoaded', async () => {
    const filmsContainer = document.getElementById('films-container');
    const modal = document.getElementById('film-modal');
    const closeButton = document.querySelector('.close-button');
    const rentButton = document.getElementById('rent-button');
    const trailerLink = document.getElementById('trailer-link');
    
    const filmTitle = document.getElementById('film-title');
    const filmDescription = document.getElementById('film-description');
    const filmGenre = document.getElementById('film-genre');
    const filmYear = document.getElementById('film-year');
    const returnButton = document.getElementById('return-button');


    const token = sessionStorage.getItem('token');
    if (!token) {
        alert("Vous devez être connecté pour accéder à cette page.");
        window.location.href = 'index.html';
        return;
    }

    const loadFilms = async (searchTerm = '') => {
        try {
            const response = await fetch('http://localhost:5000/movies', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des films.');
            }

            const films = await response.json();

            const filteredFilms = films.filter(film =>
                film.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                film.genre.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (filteredFilms.length > 0) {
                filmsContainer.innerHTML = filteredFilms
                    .map(film => `
                        <div class="film-card" data-id="${film.id}" data-description="${film.description}" data-trailer="${film.trailer}">
                            <img src="${film.imgPath}" alt="${film.title}" class="film-image">
                            <h3>${film.title}</h3>
                            <p><strong>Genre :</strong> ${film.genre}</p>
                            <p><strong>Année :</strong> ${film.annee_sortie}</p>
                            <button class="details-button">Voir les détails</button>
                        </div>
                    `)
                    .join('');
            } else {
                filmsContainer.innerHTML = '<p>Aucun film ne correspond à votre recherche.</p>';
            }

            document.querySelectorAll('.details-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    const filmCard = e.target.closest('.film-card');
                    filmTitle.textContent = filmCard.querySelector('h3').textContent;
                    filmDescription.textContent = filmCard.dataset.description || 'Pas de description disponible.';
                    filmGenre.textContent = filmCard.querySelector('p:nth-of-type(1)').textContent.split(': ')[1];
                    filmYear.textContent = filmCard.querySelector('p:nth-of-type(2)').textContent.split(': ')[1];
                    trailerLink.href = filmCard.dataset.trailer || '#';
                    rentButton.dataset.filmId = filmCard.dataset.id;
                    modal.style.display = 'flex';
                });
            });
        } catch (error) {
            console.error('Erreur lors du chargement des films:', error);
            filmsContainer.innerHTML = '<p>Erreur lors du chargement des films. Veuillez réessayer plus tard.</p>';
        }
    };

    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Louer un film
rentButton.addEventListener('click', async () => {
    const filmId = rentButton.dataset.filmId;
    try {
        const response = await fetch('http://localhost:5000/rent', {
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
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Erreur lors de la location du film:', error);
    }
});
// Retourner un film
returnButton.addEventListener('click', async () => {
    const filmId = rentButton.dataset.filmId;
    try {
        const response = await fetch('http://localhost:5000/return', {
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
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Erreur lors du retour du film:', error);
    }
});



    loadFilms();

    document.getElementById('search').addEventListener('input', (e) => {
        loadFilms(e.target.value);
    });
});
