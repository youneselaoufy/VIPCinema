document.addEventListener("DOMContentLoaded", function () {
    const video = document.getElementById("background-video");
    const videoContainer = document.querySelector(".video-container");
    const fadeOverlay = document.querySelector(".fade-overlay");
    const loginContainer = document.querySelector(".login-container");

    // Event listener for when the video ends
    video.addEventListener("ended", function () {
        console.log("Video ended");

        // Activate the fade-to-black overlay
        fadeOverlay.classList.add("active");

        // Wait for the fade-to-black to complete
        setTimeout(() => {
            console.log("Transition started");

            // Hide the video container
            videoContainer.classList.add("hidden");

            // Set the background image
            document.body.style.backgroundImage = "url('media/profile.png')";
            document.body.style.backgroundSize = "cover";
            document.body.style.backgroundPosition = "center";

            // Make the login container visible
            loginContainer.classList.add("visible");
            console.log("Login container displayed");

            // Remove the fade overlay
            fadeOverlay.classList.remove("active");
        }, 1500); // Match the fade duration in CSS
    });
});
