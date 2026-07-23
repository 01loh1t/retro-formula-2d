// The Car class groups all car related properties and methods together
class Car{

    // Creates the car sprite at the given position and angle
    constructor(scene, x, y, texture, scale, angle){
        this.sprite = scene.physics.add.image(x, y, texture).setScale(scale);
        this.sprite.rotation = angle;
        this.sprite.setCollideWorldBounds(true);
        this.vx = 0;
        this.vy = 0;
    }

    // Handles arrow key input, speed limiting, velocity and friction every frame
    move(cursors, acceleration, maxSpeed){

        // ACCELERATION (adds to velocity when key is held)
        if(cursors.left.isDown) this.vx -= acceleration;
        if(cursors.right.isDown) this.vx += acceleration;
        if(cursors.up.isDown) this.vy -= acceleration;
        if(cursors.down.isDown) this.vy += acceleration;

        // LIMIT SPEED (clamp velocity to maximum speed in both directions)
        this.vx = Phaser.Math.Clamp(this.vx, -maxSpeed, maxSpeed);
        this.vy = Phaser.Math.Clamp(this.vy, -maxSpeed, maxSpeed);

        // MOVE CAR - multiply by 60 to convert to pixels per second
        this.sprite.setVelocity(this.vx * 60, this.vy * 60);

        // FRICTION - gradually slows car down each frame when keys are released
        this.vx *= 0.94;
        this.vy *= 0.94;
    }

    // Controls engine sound pitch based on current speed
    updateSound(engineSound, maxSpeed){
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

        if(currentSpeed > 0.1){
            if(!engineSound.isPlaying) engineSound.play();
            const rate = 0.8 + (currentSpeed/maxSpeed) * 0.8;
            engineSound.setRate(rate);
        }else{
            const currentRate = engineSound.rate || 1.0;
            engineSound.setRate(Math.max(0.8, currentRate - 0.05));
            if(Math.abs(this.vx) < 0.1 && Math.abs(this.vy) < 0.1){
                engineSound.stop();
            }
        }
    }

    // Resets the car to starting position, velocity and angle
    reset(x, y, angle){
        this.sprite.x = x;
        this.sprite.y = y;
        this.vx = 0;
        this.vy = 0;
        this.sprite.setVelocity(0, 0);
        this.sprite.rotation = angle;
    }

    // Returns current speed in km/h for display on screen
    getSpeed(){
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        return Math.round(currentSpeed * 60);
    }

}

//--------------------------------------------------------------------------------------------
// the line above is a section divider for clear viewing
// GLOBAL VARIABLES

// Movement variables vx and vy synced with playerCar after each frame
let vx = 0;
let vy = 0;
let acceleration = 0.25;
let maxSpeed = 5;

// Phaser game objects
let playerCar;
let car;
let cursors;
let flag;

// Lap timing variables
let canTrigger = true;
let timerRunning = false;
let startTime = 0;
let finalTime = 0;
let stationaryTime = 0;

// The server issues one of these each time a lap starts, and it is handed back when the
// lap is submitted. It is what lets the server time the lap on its own clock instead of
// taking the browser's word for it. Null means there is no lap in progress to submit.
let lapSessionId = null;

// Fastest lap that will even be sent to the server. The server enforces its own limit too -
// this one just gives instant feedback instead of a round trip.
const MINIMUM_LAP_TIME = 10;

// Previous position used for wrong direction detection at finish line
let previousX;
let previousY;

// UI text objects displayed on screen
let scoreText;
let bestLapText;
let speedText;

// Game state and audio
let engineSound;
let gameStarted = false;

// Off-screen canvas context used for pixel-based track limit detection
let offCtx;

//--------------------------------------------------------------------------------------------
// PHASER CONFIGURATION

const config = {
    type: Phaser.AUTO,
    width: document.getElementById("game-container").offsetWidth,
    height: 600,
    backgroundColor: "#00a78b",
    parent:"game-container",
    scene:{
        preload:preload,
        create:create,
        update:update
    },
    physics:{
        default:"arcade",
        arcade:{
            debug: false
        }
    }
};

const game = new Phaser.Game(config);

//--------------------------------------------------------------------------------------------
// TRACK AND WALL CONFIGURATIONS

// Starting position, flag position and starting angle for each track
const trackConfig = {
    silverstone:{carX:145, carY:400, flagX:151, flagY:310, startAngle: 0},
    monza:{carX:1000, carY:830, flagX:800, flagY:826, startAngle: -1.57},
    monaco:{carX:120, carY:700, flagX:128, flagY:600, startAngle: 0}
}

// Invisible walls placed at shortcut areas to prevent cheating
// Each wall has x, y, width and height
const wallConfig = {
    silverstone: [
        {x: 102, y: 396, w: 10, h: 500},
        {x: 197, y: 450, w: 10, h: 400},

        {x: 410, y: 250, w: 400, h: 10},
        {x: 513, y: 230, w: 10, h: 50},
        {x: 713, y: 200, w: 400, h: 10},

        {x: 669, y: 650, w: 10, h: 700},
        {x: 913, y: 470, w: 10, h: 550},

        {x: 240, y: 660, w: 60, h: 20},
        {x: 270, y: 680, w: 50, h: 20},
        {x: 290, y: 700, w: 50, h: 20},
        {x: 330, y: 720, w: 60, h: 20},
        {x: 350, y: 740, w: 60, h: 20},
        {x: 400, y: 750, w: 50, h: 20}
    ],
    monza: [
        {x: 950, y: 714, w: 800, h: 70},
        {x: 336, y: 490, w: 10, h: 555},
        {x: 403, y: 686, w: 300, h: 10},
    ],
    monaco: [
        {x: 80, y: 640, w: 10, h: 615},
        {x: 290, y: 570, w: 10, h: 590},
        {x: 513, y: 332, w: 500, h: 10},
        {x: 760, y: 365, w: 10, h: 60},
        {x: 1000, y: 400, w: 500, h: 10},
        {x: 1170, y: 287, w: 10, h: 240},
        {x: 1290, y: 170, w: 10, h: 150},
        {x: 1370, y: 250, w: 10, h: 50},
        {x: 1350, y: 290, w: 10, h: 50},
        {x: 1360, y: 260, w: 10, h: 50},
        {x: 1260, y: 320, w: 180, h: 10},
        
    ]
};

//--------------------------------------------------------------------------------------------
// SERVER COMMUNICATION FOR LAP TIMING

// Called when the car crosses the line to BEGIN a lap.
// Asks the server to start its own timer and remember the id it gives back.
function startLapOnServer(){
    lapSessionId = null;

    API.post("/api/laps/start", { track: selectedTrack })
        .then(result => {
            lapSessionId = result.sessionId;
        })
        .catch(error => {
            lapSessionId = null;

            if(error.status === 401){
                scoreText.setText("SESSION EXPIRED\nPLEASE LOG IN AGAIN");
                return;
            }

            scoreText.setText("LAP IN PROGRESS\nWARNING: NOT CONNECTED, LAP WILL NOT SAVE");
        });
}

// Called when the car crosses the line to FINISH a lap.
// Sends the time to the server, which decides whether it counts.
function submitLapToServer(scene, lapTime){

    // No session means the lap never registered with the server, usually because the
    // connection dropped when it started. Nothing to submit against.
    if(!lapSessionId){
        scoreText.setText("LAP TIME: " + lapTime.toFixed(2) + "s\nNOT SAVED - LAP WAS NOT STARTED ONLINE");
        return;
    }

    const sessionId = lapSessionId;
    lapSessionId = null; // one submission per session

    scoreText.setText("LAP TIME: " + lapTime.toFixed(2) + "s\nSAVING...");

    API.post("/api/laps", { sessionId, lapTime })
        .then(result => {

            // The lap table and personal best are redrawn from what the server stored,
            // not from what the browser thinks happened, so the page always matches
            // the rankings other players see.
            updateLapTable(result.recentLapTimes);
            document.getElementById("personal-best").textContent = formatLapTime(result.bestLapTime);

            if(result.isPersonalBest){
                bestLapText.setStyle({fill: '#00c864'});
                bestLapText.setText("🏆 NEW PERSONAL BEST: " + result.lapTime.toFixed(2) + "s!");
                scene.time.delayedCall(5000, () => { bestLapText.setText("")});
            }

            scoreText.setText("LAP TIME: "+ result.lapTime.toFixed(2)+ "s"+ "\nCOOLDOWN/NEXT LAP READY");
        })
        .catch(error => {
            if(error.status === 401){
                scoreText.setText("LAP NOT SAVED\nPLEASE LOG IN AGAIN");
                return;
            }

            // The server rejected the lap (timing did not add up, too fast for the track,
            // already submitted) or the connection failed.
            scoreText.setText("LAP NOT SAVED\n" + error.message.toUpperCase());
        });
}

//--------------------------------------------------------------------------------------------
// PHASER SCENE FUNCTIONS

// Preload loads all game assets before the scene starts
function preload(){
    this.load.image("track", "/assets/tracks/"+selectedTrack+"-game.png");
    this.load.image("car", "/assets/cars/"+selectedTeam+".png")
    this.load.image("flag", "/assets/flag.jpg")
    this.load.image("flag2", "/assets/flag2.jpg")
    this.load.audio("engine", "/assets/f1_v10.mp3")
}

// Create sets up the game scene and runs once at the start
function create(){

    this.physics.world.setBounds(0, 0, 1536, 1024);
    this.cameras.main.setBounds(0, 0, 1536, 1024);

    const width = this.sys.game.config.width;
    const height = this.sys.game.config.height;

    // Track image added at full size starting from top left
    const track = this.add.image(0, 0, "track").setOrigin(0, 0);

    // Track is drawn onto an off-screen canvas for pixel colour detection (track limits)
    const renderTexture = this.textures.get("track").getSourceImage();
    const offscreen = document.createElement("canvas");
    offscreen.width = 1536;
    offscreen.height = 1024;
    offCtx = offscreen.getContext("2d", { willReadFrequently: true });
    offCtx.drawImage(renderTexture, 0, 0);

    // Create a car using the Car class at track starting position
    const tc = trackConfig[selectedTrack];
    playerCar = new Car(this, tc.carX, tc.carY, "car", 0.055, tc.startAngle);
    car = playerCar.sprite;

    // Flag image is loaded correctly depending on track
    if(selectedTrack === "monza"){
        flag = this.physics.add.staticSprite(tc.flagX, tc.flagY, "flag2").setScale(0.12).refreshBody();
    }else{
        flag = this.physics.add.staticSprite(tc.flagX, tc.flagY, "flag").setScale(0.13).refreshBody();
    }

    // A camera follows the car with zoom
    this.cameras.main.startFollow(car);
    this.cameras.main.setZoom(2.5);

    // Looping engine sound while car is moving
    engineSound = this.sound.add("engine", {loop: true, volume: 0.5});

    // Arrow key input
    cursors = this.input.keyboard.createCursorKeys();

    // Prevents the browser from scrolling page when arrow keys are pressed
    this.input.keyboard.on("keydown", (e) =>{
        if(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
            e.preventDefault();
    });

    // UI text objects shown on screen via uiCamera
    scoreText = this.add.text(10, 10, "LAP TIME: 0.00", {
        fontSize: "20px",
        fontFamily: "Courier",
        fill: "#fff",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: {x:8, y:5}
    });

    speedText = this.add.text(10, 50, "SPEED: 0 km/h", {
        fontSize: "20px",
        fontFamily: "Courier",
        fill: "#fff",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: {x:8, y:5}
    });

    bestLapText = this.add.text(10, 90, "", {
        fontSize: "20px",
        fontFamily: "Courier",
        fill: "#fff",
        padding: {x:8, y:5}
    });

    
    // uiCamera shows only UI text
    const uiCamera = this.cameras.add(0, 0, width, height);
    uiCamera.ignore(track);
    uiCamera.ignore(car);
    uiCamera.ignore(flag);

    // The main camera ignores UI text to prevent double rendering
    this.cameras.main.ignore([scoreText, bestLapText, speedText]);

    // Invisible static walls created to block shortcut areas
    const walls = this.physics.add.staticGroup();
    wallConfig[selectedTrack].forEach(w => {
        const wall = this.add.rectangle(w.x, w.y, w.w, w.h, 0xff0000, 0);
        this.physics.add.existing(wall, true);
        walls.add(wall);
        uiCamera.ignore(wall);
    })

    this.physics.add.collider(car, walls);

    // Finish line overlap handles lap timing and wrong direction detection
    this.physics.add.overlap(car, flag, () =>{

        // Wrong direction check (monza goes left to right, others go downward to upward)
        if(selectedTrack === "monza" && previousX < flag.x && car.x >= flag.x){
            canTrigger = false;
            timerRunning = false;
            startTime = 0;
            lapSessionId = null;
            scoreText.setText("WRONG DIRECTION!\nLAP CANCELLED, PRESS RESTART")
            this.time.delayedCall(500, () => {canTrigger = true;});
            return;
        }

        if((selectedTrack === "monaco" || selectedTrack === "silverstone") && previousY < flag.y && car.y >= flag.y){
            canTrigger = false;
            timerRunning = false;
            startTime = 0;
            lapSessionId = null;
            scoreText.setText("WRONG DIRECTION!\nLAP CANCELLED, PRESS RESTART")
            this.time.delayedCall(500, () => {canTrigger = true;});
            return;
        }


        // canTrigger is reset to true after 500ms
        // This prevents the lap from being saved multiple times if the car stays on the flag
        if(!canTrigger) return;
        canTrigger = false;


        if(timerRunning){
            timerRunning = false;
            finalTime = (Date.now() - startTime) / 1000;

            // Reject lap if completed too quickly (likely a cheat or error)
            if(finalTime < MINIMUM_LAP_TIME){
                scoreText.setText("INVALID LAP!\nPRESS RESTART");
                timerRunning = false;
                lapSessionId = null;
                this.time.delayedCall(500, () => {canTrigger = true;});
                return;
            }

            // The lap goes to the server, which checks it against its own clock before
            // saving it. Everything shown afterwards comes back from that response.
            submitLapToServer(this, finalTime);

        } else{
            // Starts the lap timer when the car first crosses the line
            startTime = Date.now();
            timerRunning = true;
            startLapOnServer();
        }

        this.time.delayedCall(500, () =>{
            canTrigger = true;
        });

    });

    // Countdown text shown before race starts
    const countText = this.add.text(width/2, height/2, "PRESS START BUTTON",{
        fontSize: "60px",
        fontFamily: "Courier",
        fill: "#7dd3fc",
        stroke: "#000",
        strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.cameras.main.ignore(countText);

    // Start/Restart button listener
    document.getElementById("startBtn").addEventListener("click", () =>{
        const btn = document.getElementById("startBtn");

        if(!gameStarted){

            // First click hides the button and start countdown
            btn.style.visibility = "hidden";
            btn.blur();
            let countdown = 3;
            countText.setText("3");

            this.time.addEvent({
                delay: 1000,
                repeat: 3,
                callback: () => {
                    countdown--;
                    if(countdown > 0){
                        countText.setText(countdown.toString());
                    } else if(countdown === 0){
                        countText.setText("GO!");
                    } else{
                        countText.destroy();
                        gameStarted = true;
                        btn.textContent = "↺ RESTART LAP";
                        btn.style.visibility = "visible";
                    }
                }
            });
        } else{

            // Subsequent clicks reset the car to starting position
            timerRunning = false;
            startTime = 0;
            lapSessionId = null;
            const tc = trackConfig[selectedTrack];
            playerCar.reset(tc.carX, tc.carY, tc.startAngle);
            vx = 0;
            vy = 0;
            scoreText.setText("CROSS THE LINE TO RESTART LAP")
        }
    })

}

// Update runs every frame while the game is active
function update(){
    if(!gameStarted) return;

    // Update lap timer display and check for stationary car
    if(timerRunning){
        let currentTime = (Date.now() - startTime) / 1000;
        scoreText.setText("LAP TIME: " + currentTime.toFixed(2) +"s" + "\nLAP IN PROGRESS");

        // Cancel lap if car is stationary for more than 5 seconds
        const speed = Math.sqrt(vx*vx + vy*vy);
        if(speed<0.1){
            stationaryTime += 1/60;
            if(stationaryTime>5){
                timerRunning = false;
                startTime = 0;
                stationaryTime = 0;
                lapSessionId = null;
                scoreText.setText("LAP CANCELLED\nMUST KEEP MOVING, PRESS RESTART")
            }
        }else{
            stationaryTime = 0;
        }
    }
    

    // Previous position saved for wrong direction detection
    previousX = car.x;
    previousY = car.y;

    // The car is moved using the Car class method
    playerCar.move(cursors, acceleration, maxSpeed);

    // Global vx/vy synced with class values for stationary and off-track checks
    vx = playerCar.vx;
    vy = playerCar.vy;

    // Rotation is only updated when car is actually moving
    if(Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01){
        car.rotation = Math.atan2(vy, vx) + Math.PI / 2;
    }

    // Engine sound pitch updated based on speed
    playerCar.updateSound(engineSound, maxSpeed);

    // TRACK LIMITS (the car is slowed down and tinted red if it is off the grey track surface)
    if(!isOnTrack(car.x, car.y)){
        vx *= 0.5;
        vy *= 0.5;
        playerCar.vx = vx;
        playerCar.vy = vy;
        car.setTint(0xff0000);
    }else{
        car.clearTint();
    }

    // Speed display is updated
    speedText.setText("SPEED: " + playerCar.getSpeed() + " km/h");

}

// Pixel brightness detection is used to check if the car is on the grey track surface
// Track is grey (brightness 25-150), background is dark (below 25), white edges are above 150
function isOnTrack(x, y){
    if(!offCtx) return true;
    const pixel = offCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
    return brightness > 25 && brightness < 150;
}
