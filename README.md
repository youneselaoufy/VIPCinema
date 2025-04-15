# VIP CINEMA — Movie Rental Streaming Platform

**VIP CINEMA** is a web-based movie rental platform that mimics the experience of an online cinema. It allows users to browse, preview, rent, and return movies using a clean, responsive interface. All movies are fetched from **TMDb**'s public API, filtered to only show those with valid trailers and descriptions.

> This is an academic project built using Vanilla JavaScript, HTML, CSS, Node.js (Express), and SQLite.

---

## Features

- User Authentication (Register/Login via JWT)
- Profile Management (update name/email/password + upload profile picture)
- Browse Real Movies (fetched from [TMDb](https://www.themoviedb.org/))
- Preview Trailers in modals (YouTube embedded)
- Rent & Return Movies with tracking
- Mobile-Responsive Design
- Loading Spinner while trailers load

---

## Tech Stack

| Frontend                  | Backend                     |
|--------------------------|-----------------------------|
| HTML5, CSS3, Vanilla JS  | Node.js (Express.js)        |
| Responsive Design (Flex) | SQLite for local storage    |
| TMDb API Integration     | Multer for image uploads    |

---

## Screenshots

| Homepage – Movie Cards                           | Modal Preview with Trailer                      |
|--------------------------------------------------|-------------------------------------------------|
| ![Home](media/screenshot_home.png)              | ![Modal](media/screenshot_modal.png)            |

---

## Installation & Usage

1. **Clone the repository**:

```bash
git clone https://github.com/youneselaoufy/VIPCinema.git
cd VIPCinema
