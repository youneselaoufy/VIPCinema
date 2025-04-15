document.addEventListener("DOMContentLoaded", function () {
    const video = document.getElementById("background-video");
    const videoContainer = document.querySelector(".video-container");
    const fadeOverlay = document.querySelector(".fade-overlay");
    const loginContainer = document.querySelector(".login-container");

    if (!video) {
        console.warn("Background video element not found.");
        return;
    }

    video.addEventListener("ended", function () {
        console.log("Video ended");

        // Fade to black
        fadeOverlay.classList.add("active");

        // Wait for fade to complete (match CSS duration)
        setTimeout(() => {
            console.log("Transition started");

            // Hide the video container
            videoContainer.classList.add("hidden");

            // Set the John Wick image as background
            document.body.style.backgroundImage = "url('media/profile.png')";
            document.body.style.backgroundSize = "cover";
            document.body.style.backgroundPosition = "center";
            document.body.style.backgroundRepeat = "no-repeat";

            // Show the login form
            loginContainer.classList.add("visible");

            // Remove the black overlay
            fadeOverlay.classList.remove("active");

            console.log("Login container displayed");
        }, 1500); // Make sure this matches your CSS fade time
    });
});
