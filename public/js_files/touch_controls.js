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

// Up and down appear on both pads, so a direction can be held by more than one button at
// once. Counting how many are down stops the release of one copy cancelling a direction
// the other copy is still holding - otherwise letting go of the left pad's up button
// would cut the throttle even with the right pad's up button still pressed.
const heldCount = { left: 0, right: 0, up: 0, down: 0 };

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
        heldCount[direction] = 0;
    });

    document.querySelectorAll(".touch-btn").forEach(btn => btn.classList.remove("pressed"));
}

// Lights up every button for a direction, so both copies of up and down look the same
// whichever one is actually being touched.
function paintDirection(direction, isHeld) {
    document.querySelectorAll('.touch-btn[data-dir="' + direction + '"]').forEach(btn => {
        btn.classList.toggle("pressed", isHeld);
    });
}

document.querySelectorAll(".touch-btn").forEach(btn => {
    const direction = btn.dataset.dir;

    // Guards against a second pointerdown on a button already being held, which would
    // otherwise push the count up without a matching release and stick the direction on.
    let heldByThisButton = false;

    function press(e) {
        // Stops the browser treating the touch as a scroll, a text selection or a
        // double-tap zoom, all of which make the controls feel broken.
        e.preventDefault();
        if (heldByThisButton) return;

        heldByThisButton = true;
        heldCount[direction]++;
        touchState[direction] = true;
        paintDirection(direction, true);
    }

    function release(e) {
        e.preventDefault();
        if (!heldByThisButton) return;

        heldByThisButton = false;
        heldCount[direction] = Math.max(0, heldCount[direction] - 1);

        // Only actually release the direction once no button is holding it any more.
        touchState[direction] = heldCount[direction] > 0;
        paintDirection(direction, touchState[direction]);
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

// The controls are fixed to the screen, which means that without this they would sit on
// top of the lap times table, the how-to-play text and the footer whenever the player
// scrolled down to read them. Fading them out once the track leaves the screen keeps the
// rest of the page usable, and brings them straight back when the track returns.
const gameContainer = document.getElementById("game-container");

if (touchControls && gameContainer && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                touchControls.classList.remove("out-of-view");
            } else {
                touchControls.classList.add("out-of-view");
                // A direction held as the controls disappear would otherwise stay held.
                releaseAllTouchDirections();
            }
        });
    }, {
        // Counts as visible while any part of the track is on screen.
        threshold: 0
    });

    observer.observe(gameContainer);
}
