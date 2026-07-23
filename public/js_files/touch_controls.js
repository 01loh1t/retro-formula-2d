// Analogue thumbstick for phones and tablets.
//
// A touchscreen has no arrow keys, so the game was unplayable on a phone. This reports a
// direction vector rather than four on/off buttons, which means how far the knob is pushed
// decides how hard the car accelerates - a small nudge gives a gentle correction, a full
// push gives everything the car has. game.js merges it with the keyboard, so both inputs
// drive exactly the same movement code.
//
// Loaded before game.js so the stick exists by the time the game reads it.

// Current stick position, each between -1 and 1. Read every frame by game.js.
// x is negative left / positive right, y is negative up / positive down, matching the
// screen coordinates the game already uses.
const stickInput = { x: 0, y: 0 };
window.touchState = stickInput;

const joystick = document.getElementById("joystick");
const joystickBase = document.getElementById("joystick-base");
const joystickKnob = document.getElementById("joystick-knob");

// How far the thumb must move before the car responds at all. Without this the car drifts
// from the tiny movements a resting thumb always makes.
const DEAD_ZONE = 0.12;

// Which finger is currently driving. Tracking the id means a second finger elsewhere on
// the screen cannot hijack the stick halfway through a corner.
let activePointerId = null;

// Only shown on devices that can actually be touched. A laptop with a mouse gets nothing,
// since the arrow keys are there and the stick would only cover part of the track.
// A touchscreen laptop gets it, which is harmless - the keyboard still works.
const hasTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;

if (joystick && hasTouch) {
    joystick.classList.add("visible");
}

// Furthest the knob can travel from the centre, in pixels.
function knobTravel() {
    return (joystickBase.offsetWidth - joystickKnob.offsetWidth) / 2;
}

// Returns the stick to centre and stops the car accelerating.
function releaseStick() {
    activePointerId = null;
    stickInput.x = 0;
    stickInput.y = 0;

    if (joystickKnob) joystickKnob.style.transform = "translate(0px, 0px)";
    if (joystick) joystick.classList.remove("active");
}

// Works out where the knob should sit and what that means for the car.
function updateStick(event) {
    const bounds = joystickBase.getBoundingClientRect();
    const centreX = bounds.left + bounds.width / 2;
    const centreY = bounds.top + bounds.height / 2;

    const dx = event.clientX - centreX;
    const dy = event.clientY - centreY;

    const distance = Math.hypot(dx, dy);
    const travel = knobTravel();

    if (distance === 0 || travel === 0) {
        stickInput.x = 0;
        stickInput.y = 0;
        joystickKnob.style.transform = "translate(0px, 0px)";
        return;
    }

    // The knob stops at the edge of the base however far the thumb slides past it.
    const clamped = Math.min(distance, travel);

    // Unit vector pointing the way the thumb is pushing.
    const unitX = dx / distance;
    const unitY = dy / distance;

    joystickKnob.style.transform =
        "translate(" + (unitX * clamped) + "px, " + (unitY * clamped) + "px)";

    // How far out the thumb is, from 0 at the centre to 1 at the edge.
    let push = clamped / travel;

    if (push < DEAD_ZONE) {
        stickInput.x = 0;
        stickInput.y = 0;
        return;
    }

    // Rescale so the car pulls away smoothly from just outside the dead zone, rather than
    // jumping straight to 12% throttle the moment it is crossed.
    push = (push - DEAD_ZONE) / (1 - DEAD_ZONE);

    // Map the round stick onto the square range the keyboard produces. Holding two arrow
    // keys gives x = 1 and y = 1 at the same time, so without this a fully pushed diagonal
    // would accelerate about 40% slower than the same diagonal on a keyboard - which would
    // put phone players at a real disadvantage on a shared leaderboard.
    const squareScale = 1 / Math.max(Math.abs(unitX), Math.abs(unitY));

    stickInput.x = unitX * squareScale * push;
    stickInput.y = unitY * squareScale * push;
}

if (joystickBase) {

    joystickBase.addEventListener("pointerdown", (e) => {
        // Stops the browser treating the drag as a scroll, a text selection or a
        // double-tap zoom, all of which make the stick feel broken.
        e.preventDefault();
        if (activePointerId !== null) return;

        activePointerId = e.pointerId;

        // Keeps this finger reporting to the stick even once it slides outside the base,
        // which is what lets the thumb push past the edge and hold full lock.
        joystickBase.setPointerCapture(e.pointerId);

        joystick.classList.add("active");
        updateStick(e);
    });

    joystickBase.addEventListener("pointermove", (e) => {
        if (e.pointerId !== activePointerId) return;
        e.preventDefault();
        updateStick(e);
    });

    const endPointer = (e) => {
        if (e.pointerId !== activePointerId) return;
        e.preventDefault();
        releaseStick();
    };

    joystickBase.addEventListener("pointerup", endPointer);

    // pointercancel fires when the browser takes the touch away, for example when a call
    // comes in. Without this the car would keep accelerating on its own.
    joystickBase.addEventListener("pointercancel", endPointer);

    // Long-pressing otherwise opens the context menu mid-corner.
    joystickBase.addEventListener("contextmenu", (e) => e.preventDefault());
}

// Backgrounding the tab or switching apps lets go of the stick.
window.addEventListener("blur", releaseStick);
document.addEventListener("visibilitychange", () => {
    if (document.hidden) releaseStick();
});

// The stick is fixed to the screen, which means that without this it would sit on top of
// the lap times table, the how-to-play text and the footer whenever the player scrolled
// down to read them. Fading it out once the track leaves the screen keeps the rest of the
// page usable, and brings it back when the track returns.
const gameContainer = document.getElementById("game-container");

if (joystick && gameContainer && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                joystick.classList.remove("out-of-view");
            } else {
                joystick.classList.add("out-of-view");
                // A stick held as it disappears would otherwise stay held.
                releaseStick();
            }
        });
    }, { threshold: 0 });

    observer.observe(gameContainer);
}
