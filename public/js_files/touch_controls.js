// On-screen driving controls for phones and tablets.
//
// A touchscreen has no arrow keys, so the game was unplayable on a phone. These four
// buttons sit over the bottom of the canvas and feed into the same movement code the
// keyboard uses, rather than being a separate control path - so anything that works with
// the arrow keys, including holding two directions at once, works by touch too.
//
// Loaded before game.js so that touchState exists by the time the game starts reading it.

// Which directions are currently being held. game.js merges this with the arrow keys.
const touchState = { left: false, right: false, up: false, down: false };
window.touchState = touchState;

const touchControls = document.getElementById("touch-controls");

// Only shown on devices that can actually be touched. A laptop with a mouse gets nothing,
// since the arrow keys are there and the buttons would only cover part of the track.
// A touchscreen laptop gets them, which is harmless - the keyboard still works.
const hasTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;

if (touchControls && hasTouch) {
    touchControls.classList.add("visible");
}

// Releases every direction at once.
// Used when the page is hidden or loses focus, because a button held at that moment would
// otherwise never receive its "released" event and the car would drive off on its own.
function releaseAllTouchDirections() {
    Object.keys(touchState).forEach(direction => {
        touchState[direction] = false;
    });

    document.querySelectorAll(".touch-btn").forEach(btn => btn.classList.remove("pressed"));
}

document.querySelectorAll(".touch-btn").forEach(btn => {
    const direction = btn.dataset.dir;

    function press(e) {
        // Stops the browser treating the touch as a scroll, a text selection or a
        // double-tap zoom, all of which make the controls feel broken.
        e.preventDefault();
        touchState[direction] = true;
        btn.classList.add("pressed");
    }

    function release(e) {
        e.preventDefault();
        touchState[direction] = false;
        btn.classList.remove("pressed");
    }

    // Pointer events cover touch, pen and mouse in one set of handlers, and handle several
    // fingers at once without any extra work - which is what makes diagonals possible.
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);

    // pointercancel fires when the browser takes the touch away, for example when a call
    // comes in. Without this the direction would stay stuck on.
    btn.addEventListener("pointercancel", release);

    // Long-pressing a button on Android otherwise opens the context menu mid-corner.
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
});

// Backgrounding the tab or switching apps releases everything.
window.addEventListener("blur", releaseAllTouchDirections);
document.addEventListener("visibilitychange", () => {
    if (document.hidden) releaseAllTouchDirections();
});
