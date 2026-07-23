// Small helper that every page uses to talk to the server.
//
// It exists so the rest of the JavaScript never has to repeat the fetch boilerplate,
// and so a failed request always arrives as a thrown Error with a readable message
// instead of each page inventing its own way of handling failures.

const API = {

    // Sends a request and returns the parsed JSON body.
    // Throws an Error on failure, with .status and .fields attached where the server
    // provided them (.fields maps a form field id to the message for that field).
    async request(path, options = {}) {
        let response;

        try {
            response = await fetch(path, {
                credentials: "same-origin", // send the login cookie
                headers: { "Content-Type": "application/json" },
                ...options
            });
        } catch (networkError) {
            // No connection at all - the server is down or the player is offline.
            throw Object.assign(
                new Error("Could not reach the server. Check your connection and try again."),
                { status: 0, offline: true }
            );
        }

        let body = null;
        try {
            body = await response.json();
        } catch (parseError) {
            body = null;
        }

        if (!response.ok) {
            const error = new Error((body && body.error) || "Something went wrong. Please try again.");
            error.status = response.status;
            error.fields = (body && body.errors) || {};
            error.body = body;
            throw error;
        }

        return body;
    },

    get(path) {
        return this.request(path);
    },

    post(path, body) {
        return this.request(path, { method: "POST", body: JSON.stringify(body || {}) });
    },

    patch(path, body) {
        return this.request(path, { method: "PATCH", body: JSON.stringify(body || {}) });
    }
};

// Formats a lap time the same way everywhere on the site.
function formatLapTime(seconds) {
    return Number(seconds).toFixed(2) + "s";
}
