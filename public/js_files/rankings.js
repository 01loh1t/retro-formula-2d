// Rankings page.
//
// The leaderboard is now fetched from the server, which sorts and filters it in the
// database. That means the page shows every player's laps, not just the ones set on this
// computer, and it stays fast no matter how many players sign up.

// Track dropdown selector element
const trackSelect = document.querySelector(".track-select");
const searchInput = document.querySelector(".search-username");
const tableBody = document.getElementById("table-body");

// Shows a single centred message across the table, used for loading and empty states.
function showTableMessage(message, colour){
    tableBody.innerHTML = "";

    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.style.textAlign = "center";
    if(colour) cell.style.color = colour;
    cell.textContent = message;

    row.appendChild(cell);
    tableBody.appendChild(row);
}

// Asks the server for the rankings on a track.
// searchValue is optional (defaults to empty string which returns all players).
async function fetchRankings(selectedTrack, searchValue = ""){
    const params = new URLSearchParams({ track: selectedTrack, search: searchValue });
    const result = await API.get("/api/rankings?" + params.toString());
    return result.rankings;
}

// Draws the rankings into the table.
function populateTable(rankings){
    tableBody.innerHTML = "";

    if(rankings.length === 0){
        showTableMessage("No lap times set on this track yet");
        return;
    }

    // Rows are built with createElement and textContent rather than innerHTML.
    // Usernames are written by other players, and inserting them as HTML would let one
    // player put working markup into everyone else's rankings page.
    rankings.forEach((entry, index) => {
        const row = document.createElement("tr");

        const values = [
            index + 1,
            entry.username,
            entry.team || "No Team",
            entry.bestLapTime.toFixed(2) + "s"
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });
}

// Loads and draws the rankings, handling the loading and failure states.
async function refreshTable(selectedTrack, searchValue = ""){
    showTableMessage("Loading rankings...");

    try{
        const rankings = await fetchRankings(selectedTrack, searchValue);
        populateTable(rankings);
        return rankings;
    }catch(error){
        showTableMessage(error.message, "#ff6b6b");
        return null;
    }
}

// Track dropdown change repopulates table when a different track is selected
trackSelect.addEventListener("change", () =>{
    const selectedTrack = trackSelect.value;
    if(selectedTrack === "") return;
    refreshTable(selectedTrack, searchInput.value.trim());
})

// Search button finds and highlights a specific username in the table
document.querySelector(".search-button").addEventListener("click", async () => {
    const selectedTrack = trackSelect.value;
    if(selectedTrack === "") return;

    const searchValue = searchInput.value.trim();

    // Repopulate table with all players first so the full table is visible
    const rankings = await refreshTable(selectedTrack);
    if(rankings === null) return; // the request failed, message is already showing

    const rows = document.querySelectorAll("#table-body tr");

    // Highlights matching rows if username is found and scrolls to them
    let found = false;
    rows.forEach(row => {
        if(!row.cells[1]) return; // the "no lap times yet" message row

        if(row.cells[1].textContent.toLowerCase().includes(searchValue.toLowerCase())){
            found = true;
            row.classList.add("highlight");
            row.scrollIntoView({behavior: "smooth", block: "center"});
            setTimeout(() => row.classList.remove("highlight"), 3000);
            setTimeout(() => searchInput.value = "", 3000);
        }
    });

    // Error message shown when no matching username is found
    // Table is restored after 3 seconds
    if(!found){
        showTableMessage("No user found with that username", "#ff6b6b");

        setTimeout(() => {
            refreshTable(selectedTrack, "");
            searchInput.value = "";
        }, 3000);
    }
});

// Pressing Enter in the search box does the same thing as clicking SEARCH.
searchInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
        e.preventDefault();
        document.querySelector(".search-button").click();
    }
});
