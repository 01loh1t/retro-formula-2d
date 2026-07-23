// All JavaScript code here is used only in index.html

// Smooth scrolling effect for dynamically added links inside the playNote paragraph
// Scrolls to the sign up/log in or log out buttons
document.getElementById("playNote").addEventListener("click", (e) =>{
    const href = e.target.closest("a")?.getAttribute("href");

    if(href && href.startsWith("#")){
        e.preventDefault();
        document.querySelector(href).scrollIntoView({behavior: "smooth"});
    }
})

// Review cards that rotates automatically to the next card
const slides = document.querySelectorAll('.review-slide');
let current = 0;

setInterval(() => {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
}, 5000);

// PLAY NOW button opens track modal if logged in and shows error if not
// currentUser is set by checkLoginStatus() in registration_login.js
document.getElementById("playNow").addEventListener("click", () =>{

    if(currentUser){
        document.getElementById("trackModal").classList.add("active");
    }else{
        showFieldError("playMsg", "Please sign in to play!");
        setTimeout(()=>{
            clearFieldError("playMsg");
        }, 5000);
    }
})

// updates the sign up/sign in cards on page load (function found in registration_login.js)
checkLoginStatus();

// Track card listeners (saves selected track and shows team selection)
// The track and team are kept in sessionStorage only so the game page knows what to load.
// Nothing here can be cheated by editing it - the server decides what counts as a lap.
document.querySelectorAll(".track-card").forEach(card => {
    card.addEventListener("click", () =>{
        const selectedTrack = card.id;
        sessionStorage.setItem("selectedTrack", selectedTrack);

        document.getElementById("trackSelection").style.display = "none";
        document.getElementById("teamSelection").style.display = "block";
    })
})

// Team card listeners (saves the team on the account, then loads the game)
document.querySelectorAll(".team-card").forEach(card => {
    card.addEventListener("click", async () => {
        const selectedTeam = card.id;
        sessionStorage.setItem("selectedTeam", selectedTeam);

        // The team is saved to the account so it shows next to the player in the rankings.
        // If this request fails the player still gets to race - only the rankings label
        // would be out of date, which is not worth blocking on.
        try{
            await API.patch("/api/auth/me/team", { team: selectedTeam });
        }catch(error){
            console.warn("Could not save team selection:", error.message);
        }

        document.getElementById("trackModal").classList.remove("active");

        // navigates to game page after choosing track and team
        window.location.href = "/game.html";
        
    })
})

// closes the modal and reset back to trackSelection for next time
document.getElementById("closeTrack").addEventListener("click", () =>{
    document.getElementById("trackModal").classList.remove("active")
    document.getElementById("trackSelection").style.display= "block";
    document.getElementById("teamSelection").style.display= "none";
})
