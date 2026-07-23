// All JavaScript code here is used only in game.html

// Gets selected track and team from sessionStorage (saved when the user made their
// selections on index.html). These are display choices only - the server never trusts
// them for anything that affects a lap time.
let selectedTrack = sessionStorage.getItem("selectedTrack");
let selectedTeam = sessionStorage.getItem("selectedTeam");

// Track information consisting of title and details for each track
const trackInfo = {
    monza:{
        title:"MONZA CIRCUIT",
        details:"The Autodromo Nazionale Monza is a 5.793km race track in Italy. It consists of long straights, simple chicanes and fewer technical corners overall."
    },

    silverstone:{
        title:"SILVERSTONE CIRCUIT",
        details:"The Silverstone Circuit is a 5.891km race circuit in England. It is a fast flowing circuit with high-speed corners and consists of tricky sections like Maggotts/Becketts."
    },

    monaco:{
        title:"MONACO CIRCUIT",
        details:"Circuit de Monaco, also referred as Monte Carlo, is a 3.337km circuit in Monaco. It is a tight street circuit consisting of sharp corners and barriers close to track edges."
    }
}

// Someone can land on /game.html directly, from a bookmark or by typing the address.
// Without a track chosen there is nothing to load, so send them back to pick one
// rather than letting the page break.
if(!trackInfo[selectedTrack]){
    window.location.replace("/");
}

// Default the team if it is missing, so the car sprite always has something to load.
if(!selectedTeam){
    selectedTeam = "ferrari";
    sessionStorage.setItem("selectedTeam", selectedTeam);
}

// Update track title and track details based on selected track
document.getElementById("track-title").textContent = trackInfo[selectedTrack].title;
document.getElementById("startBtn").textContent = "START RACE ▶"
document.getElementById("track-details").textContent = trackInfo[selectedTrack].details;

// Scroll to start button smoothly on page load
document.getElementById("startBtn").scrollIntoView({behavior:"smooth"});

//--------------------------------------------------------------------------------------------

// Loads the personal best and the 5 most recent lap times for this track from the server.
// This also doubles as the login check for the page: if the request comes back saying
// "not logged in", there is nowhere to save laps to, so the player goes back to sign in.
async function loadPersonalStats(){
    const personalBest = document.getElementById("personal-best");
    personalBest.textContent = "Loading...";

    try{
        const stats = await API.get("/api/laps/me?track=" + encodeURIComponent(selectedTrack));

        personalBest.textContent = stats.bestLapTime !== null
            ? formatLapTime(stats.bestLapTime)
            : "No lap yet";

        updateLapTable(stats.recentLapTimes);

    }catch(error){
        if(error.status === 401){
            // Not logged in - the game page is no use without an account to save laps to.
            window.location.replace("/");
            return;
        }

        personalBest.textContent = "Unavailable";
        console.warn("Could not load personal stats:", error.message);
    }
}

loadPersonalStats();

// Updates the small lap times table with the last 5 laps for the current track
// Takes a plain array of lap times, oldest first.
function updateLapTable(lapTimes){
    const tbody = document.getElementById("laptimes-body");
    tbody.innerHTML = ""

    if(!lapTimes || lapTimes.length === 0) return;

    lapTimes.forEach((time, index) =>{
        const row = document.createElement("tr");

        // Built with createElement and textContent rather than innerHTML. These values come
        // back from the server, and text inserted as HTML would be executed as HTML.
        const lapCell = document.createElement("td");
        lapCell.textContent = index + 1;

        const timeCell = document.createElement("td");
        timeCell.textContent = formatLapTime(time);

        row.appendChild(lapCell);
        row.appendChild(timeCell);
        tbody.appendChild(row);
    })
}

//--------------------------------------------------------------------------------------------

// Resize listener updates the Phaser canvas size when browser window is resized
window.addEventListener("resize", () => {
    // game is created in game.js. Guard in case a resize fires before it exists.
    if(typeof game === "undefined" || !game.scale) return;

    const newWidth = document.getElementById("game-container").offsetWidth;
    game.scale.resize(newWidth, 600);
    game.scene.scenes[0].cameras.main.setBounds(0, 0, 1536, 1024);
})

// The SWITCH TRACK button is similar to the PLAY NOW button on the main page
// It opens the track modal and resets to track selection
document.querySelector(".switch-track-button").addEventListener("click", () =>{
    document.getElementById("trackModal").classList.add("active");

    document.getElementById("trackSelection").style.display = "block";
    document.getElementById("teamSelection").style.display = "none";
})

// Track card listeners (saves selected track and shows team selection)
document.querySelectorAll(".track-card").forEach(card => {
    card.addEventListener("click", () =>{
        sessionStorage.setItem("selectedTrack", card.id);

        document.getElementById("trackSelection").style.display = "none";
        document.getElementById("teamSelection").style.display = "block";
    })
})

// Team card listeners (saves the team on the account, then reloads with the new choices)
document.querySelectorAll(".team-card").forEach(card => {
    card.addEventListener("click", async () => {
        const newTeam = card.id;
        sessionStorage.setItem("selectedTeam", newTeam);

        try{
            await API.patch("/api/auth/me/team", { team: newTeam });
        }catch(error){
            console.warn("Could not save team selection:", error.message);
        }

        document.getElementById("trackModal").classList.remove("active");
        location.reload()
    })
})

// closes the modal and reset back to trackSelection for next time
document.getElementById("closeTrack").addEventListener("click", () =>{
    document.getElementById("trackModal").classList.remove("active")
    document.getElementById("trackSelection").style.display= "block";
    document.getElementById("teamSelection").style.display= "none";
})
