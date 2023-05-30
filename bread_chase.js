/*/NOTES//
Main Features:

Entity tracking player location
Collision and knockback against player and other entities.
Difficulty progression by calculating points gained
Death Animation
Game Over screen
Music and sound effects
Geese

Cheats:

Godmode: "0" to toggle invincibility
Stop geese: "9" to toggle stopping geese.
Restore Health: "8" to regain all health.
Toggle Knockback: "7" to toggle knockback.
Freeze: "6" to freeze game.
+points: "=" to increase points.
-points: "-" to decrease points.

///*/

//start up canvas and context variables
let canvas;
let context;
let weatherEffectsCanvas;
let WeatherContext;

//allow knockback to occur
let AllowKnockback = true;
//movex or y.
let moveX;
let moveY;

// coords for points display of text
let DrawPointsX;
let DrawPointsY;
let points_TextMetric;//gets object containing text information

//hacky way of changing levels
let NoLevelChange = true;
let currentLevel;

//particles for weather. snow
let particles=[];

//allow abiliy to restart game
let ableRestart = true;
let gameover;

//music continuation of playing
//play or stop music
let continueMusic = false;
let levelCompleted = false;

//godmode
let GodMode = false;
//pause enemies
let PauseAllEnemies = false;

//for stopping drawing
let request_id;

//throttling fps
let fpsInterval = 1000 / 30; //denominator is frames per second
let now;
let then = Date.now();

//ctrl + 8 opens
//ctrl + 9 closes
//#region Entities
    class Player {
        constructor() {
            this.x = 0;
            this.y = 0;
            this.width = 32;
            this.height = 32;
            this.frameX = 1;
            this.frameY = 0;
            //with velocity set up,
            //will reach 0 as getting multiplied by fraction
            //speedStat allows addition and subtraction of X/Ychange so velocity isn't disturbed
            this.speedStat = 5;
            this.xChange = 0;
            this.yChange = 0;

            this.moveAble = true;
            this.player = true;
            this.health = 5;
            this.maxHealth = 5;
        }
        get xCentre() {
            return (this.x + this.width)/2;
        }

        get yCentre() {
            return (this.y + this.height)/2;
        }

        get rectRadius() {
            return (Math.sqrt(this.width**2 + this.height**2))/2

        }
    }

    class Item {
        constructor(name) {
            this.name = name;
            this.x = 0;
            this.y = 0;
            this.width = 16;
            this.height = 16;
            this.frameX = 1;
            this.frameY = 1;
            this.xChange = 0;
            this.yChange = 0;
            this.moveAble = false;
            this.pickup = true;
            this.points = 1; //score or points
        }

        get xCentre() {
            return (this.x + this.width)/2;
        }

        get yCentre() {
            return (this.y + this.height)/2;
        }

        get rectRadius() {
            return (Math.sqrt(this.width**2 + this.height**2))/2
        }
    }

    class Explosion {
        constructor() {
            this.x = 0;
            this.y = 0; //change player.y and x if needed
            this.width = 64;
            this.height=64;
            this.FrameLimitX = 3;
            this.FrameLimitY = 4;
            this.frameDelay = 3; //delay each frame being played
            this.frameX=0;
            this.frameY=0;
            this.totalFrames=16; //idk if i need this
            this.InGameFrames = 1;  //tracks number of game frames. works with frame delay
        }
    }

let explosion = new Explosion()
function explosionAnimation(explosionObj) {
    //allow increment of frameX until limit reached, as it is the end of the animation
    if (!(explosionObj.frameY - explosionObj.FrameLimitY === 0)) { //if animation done, hit else
        //draw animation
        // context.fillRect(player.x, player.y, explosionObj.width, explosionObj.height)
        context.drawImage(IMAGES.explosion,
            explosionObj.frameX*explosionObj.width, explosionObj.frameY*explosionObj.height, explosionObj.width, explosionObj.height, //sprite coords
            player.x-player.width/2, player.y-player.height/2, explosionObj.width, explosionObj.height //sprite location coords
        );
        explosionObj.InGameFrames++;

        if (explosionObj.InGameFrames % explosionObj.frameDelay === 0) {  //delay frame animation  
            if (explosionObj.frameX - explosionObj.FrameLimitX === 0 ) { //if reached end of row,
                explosionObj.frameX = 0; //reset row frames
                explosionObj.frameY ++; //move to next row of animation
            } else {
                explosionObj.frameX++; //increment animation
            }
        }

    } else {
        //clear previous weather
        WeatherContext.clearRect(0,0, weatherEffectsCanvas.width, weatherEffectsCanvas.height)

        GameOver() //play gameover after animation ends
    }
}
    class Enemy1 {
        //geese
        constructor() {
            let randomInteger = randint(1,9);
            this.speedStat = randomInteger/10;
            this.x = 0;
            this.y = 0;
            this.width = 32;
            this.height = 32;
            this.frameX = 1;
            this.frameY = 3;
            // this.xChange = randomInteger;
            // this.yChange = randomInteger;
            this.xChange = 0;
            this.yChange = 0;
            this.moveAble = true;
            this.pickup = false;
            this.player = false;
            this.knockback = true;
            this.knockbackX = 0;
            this.knockbackY = 0;
        }
        
    
        //for making circle detection radius
        get xCentre() {
            return (this.x + this.width)/2;
        }

        get yCentre() {
            return (this.y + this.height)/2;
        }

        get rectRadius() {
            return (Math.sqrt(this.width**2 + this.height**2)/2)
        }


    }
    let player = new Player();
//#endregion

//#region ui
    class HeartCanister{
        //hearts
        constructor() {
            this.x = 0;
            this.width = 32;
            this.height = 32;
            this.frameX = 0;
            this.frameY = 0; //no rows
            this.xGap = 5; //gap between canvas.width at 0 (left side) and hearts
        }
        get y(){ //positioned at bottom
            return canvas.height - this.height;
        }
    }

//#endregion

//#region sound
//sound code taken and modified from https://www.w3schools.com/graphics/game_sound.asp

//music/sfx
class Sound {
    constructor(src) {
        this.sound = document.createElement("audio");
        this.sound.src = src;

        this.sound.setAttribute("preload", "auto");
        this.sound.setAttribute("controls", "none");
        this.sound.style.display = "none";

        document.body.appendChild(this.sound);
        this.play = function () {
            this.sound.play();
        };
        this.pause = function () {
            this.sound.pause();
        };
    }
}

let bgm;
let bgm1 = new Sound("sounds/goose.mp3");
let bgm2  = new Sound("sounds/goosecold.mp3");

let itemGetSFX = new Sound("sounds/ding.mp3")
let clearStageSFX = new Sound("sounds/eventgoose.mp3")
let deathSFX = new Sound("sounds/explosion.mp3")
//#endregion


//enemy1: list and object
let enemy1=[];
let bread=[];
//counters
let points;
let difficulty;
let PointsIncreaseRequirement;

//stops dawning of items
let stopDrawingItems = false;

let tilesPerRow = 6; //images per row of tileset
let tileSize = 16;
let IMAGES = {
            player: "images/Q_Bot2_32x32.png",
            npc: "images/goose32x32.png",
            item: "images/Foods16x16.png",
            heart: "images/health_canister32x32.png",
            explosion: "images/exp2_0_64x64.png",
            level_1: "images/level_1.16x16_576x320.png",
            level_2: "images/level_2.16x16_576x320.png",
            };


//let IMAGES;

// let floor;

//player: movement
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;

//function runs when we page loads
document.addEventListener("DOMContentLoaded", init, false);
let reload = document.querySelector("#reload");
let music = document.querySelector("#music");
let instructions = document.querySelector("#instructions")

//reloads page. instead want to restart gamestate
reload.addEventListener('click', reloadWindow, false);
//toggle music
music.addEventListener('click', PlayPauseMusic, false);
//toggle instructions
instructions.addEventListener('click', displayInstructions, false);
   


//add event listeners for keyboard
window.addEventListener("keydown", activate, false);
window.addEventListener("keyup", deactivate, false);

let called = false;
function init() {
    canvas = document.querySelector("#game");
    context = canvas.getContext("2d");

    //allow for weather to be drawn
    weatherEffectsCanvas = document.querySelector("#weather_effects");
    WeatherContext = weatherEffectsCanvas.getContext("2d");
    weatherEffectsCanvas.width = canvas.width;
    weatherEffectsCanvas.height = canvas.height;

    bgm = bgm1;
    //ensures promise doesn't break
    //create unmute/mute button of some kind
    if (continueMusic === false){ //continues music after game over if button pressed
        bgm.sound.muted = true; //initially muted
    }

    if (bgm.sound.muted === false || continueMusic === true){
        bgm.sound.play()
    }

    //reset difficulty every time init is called
    difficulty=0; //sets difficulty, usually for the geese
    points=0; //player points
    PointsIncreaseRequirement=4; //points needed to increase difficulty

    //player: place player
    player.x = (canvas.width/2) - (player.width/2);
    player.y = (canvas.height/2) - (player.height/2);

    //load images so src isn't needed
    if (called === false) {
        load_images(draw);
        called = true;
    //once images are loaded, call draw regularly
    } else {
        draw();
    }
}

//draws entities
function draw() {
    //gamestate: allows animations of sprites
    // window.requestAnimationFrame(draw);
    request_id = window.requestAnimationFrame(draw);

    //framerate: throttles framerate for higher end machines
    let now = Date.now();
    let elapsed = now - then;
    if (elapsed <= fpsInterval) {
        return;
    }

    then = now - (elapsed % fpsInterval);

    //render pixel are better
    context.imageSmoothingEnabled = false;

    //unloaded state
    context.fillStyle = "black";

    if (NoLevelChange === true) { //hacky way of level change
        currentLevel = IMAGES.level_1;
    }
    GenerateBackgroundImage(currentLevel, canvas.width, canvas.height);
    if (bread.length < 1 && stopDrawingItems === true){
        //make border green to notify that player can progress
            context.shadowColor = 'green';
            context.shadowBlur = 10;
            context.strokeStyle = "green";
            context.lineWidth = 15;
            context.strokeRect(0, 0, canvas.width, canvas.height);
            context.lineWidth = 0;
            context.shadowColor = "none";
            context.shadowBlur = 0;
        } 
    //player: update coords but not actual sprite
    playerMovement();
    
    //player: update player location
    //constant movement
    moveEntity(player);
    
    //draw health
    displayPlayerHealth();

    //empty bread and enemy array once off border
    if (EntityOffBorder(player) === true) {
        clearStageSFX.sound.pause();
        clearStageSFX.sound.currentTime = 0;
        enemy1=[];
        bread=[];
        stopDrawingItems = false;
        //for some reason, switching bgm to point to bgm 2, cause sound.muted to become false
        //solution: if else handling
        if (points>30 && currentLevel === IMAGES.level_1) {
            bgm.sound.pause();
            let muteBgm;
            if (bgm.sound.muted === true) {
                muteBgm = true;
            } else {
                muteBgm = false;
            }
            bgm = bgm2
            if (muteBgm === false){
                // console.log(bgm.sound.muted, "bgm mute status") 
                bgm.sound.play();
                bgm.sound.loop = true;
            } else {
                bgm.sound.muted = true;
            }
            currentLevel = IMAGES.level_2; //2nd level. you are not meant to survive
            PointsIncreaseRequirement = 1;
            NoLevelChange = false;
        }
    }
    if (currentLevel === IMAGES.level_2) {
        weather(1);//call snowstorm to be generated
    }
//#region spawning entities against player
    //enemy1: generate from border
    generateNPCenemy(enemy1, difficulty, new Enemy1());
    spawnRandItems(bread, 3, 30, new Item("bread"));


    //enemy1: check if npc collides with player
    playerCollidingWith(enemy1);
    if (player.moveAble === false && player.xChange < 1 && player.yChange < 1){
        RemoveCollisionStun(player);
    };
    
    //bread: check for bread
    playerCollidingWith(bread);

    //enemy1: looping placement and movement
    for (let npc of enemy1) {
        if (npc.moveAble === false && npc.xChange < 1 && npc.yChange < 1 && PauseAllEnemies === false){
            RemoveCollisionStun(npc);
        } else if (PauseAllEnemies === true) {
            npc.moveAble = false;
        }   

        trackPlayer(npc);
        moveEntity(npc);
        friction(npc, 0.7);
        speedCap(npc, 3);
    }

    
//#endregion

    //add and draw points/score
    context.font = '30px arial';
    context.fillStyle = "black";
    DrawPointsX = 10;
    DrawPointsY = 35;
    points_TextMetric = context.measureText(String(points));

    //draw if player health is above. if not, not drawn
    if (player.health>0) {
        context.fillText(points, DrawPointsX, DrawPointsY);
    }
    //gameover if health is 0
    if (player.health < 1) {
        PauseAllEnemies = true;
        player.moveAble = false;
        player.frameX = 10;//remove drawn player sprite
        friction(player, 0) //stop player from skating
        bgm.sound.pause(); //stop bgm
        bgm.sound.currentTime = 0;
        deathSFX.play();
        explosionAnimation(explosion);
    }                    
}
//randint
function randint(min, max) {
    return Math.round(Math.random() * (max - min)) + min;
}
//#region keyboard inputs

//inputs
//function allows movement
function activate(event) {
    let key = event.key;
    if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown"){
        event.preventDefault() //prevent scrolling with arrow keys
    }

    if (key === "ArrowLeft" || key === "a") {
    moveLeft = true;
    } else if (key === "ArrowRight" || key === "d") {
        moveRight = true;
    } else if (key === "ArrowUp" || key === "w") {
        moveUp = true;
    } else if (key === "ArrowDown" || key === "s") {
        moveDown = true;
    } else if (key === "0") {
        if (GodMode === false){
            GodMode = true;
        } else {
            GodMode = false;
        }
    } else if (key === "6") { //stop program
        bgm.sound.pause();
        stop();
    } else if (key === "9") { //pause/freeze/release enemy entities
        if (PauseAllEnemies === false){
            PauseAllEnemies = true;
        } else {
            PauseAllEnemies = false;
        }
    } else if (key === "8") { //restore all health
        if (player.health < player.maxHealth){
            player.health = player.maxHealth
        }
    } else if (key === "7") { //toggle knockback
        if (AllowKnockback === true) {
            AllowKnockback = false;
        } else {
            AllowKnockback = true;
        }
    } else if (key === "="){
        points++;//increment points
    } else if (key === "-"){
        points--;//subtract points
    } else if (key === "m") { //Play music
        PlayPauseMusic();
    } else if (key === "r") { //reload page
        reloadWindow();
    } 

    //allow restart in gameover and during game
    if (key === "q" && player.health < 1 && gameover === true) {
        restartGame();
        //window.location.reload(true);
    }
}
//function allows keys to stop working
function deactivate(event) {
    //movement
    let key = event.key;
    if (key === "ArrowLeft" || key === "a") {
        //player.xChange=0;
        //set to zero, brake immediately
        //for using acceleration/deceleration, comment out
        moveLeft = false;
    } else if (key === "ArrowRight" || key === "d") {
        moveRight = false;
        //player.xChange=0;
    } else if (key === "ArrowUp" || key === "w") {
        moveUp = false;
        //player.yChange=0;
    } else if (key === "ArrowDown" || key === "s") {
        moveDown = false;
        //player.yChange=0;
    }

}
//#endregion

//call restartGame 
function restartGame() {
    //alow for restart of game
    //reset many variables
    gameover = false;
    explosion = new Explosion();

    player.health = player.maxHealth;
    player.frameX = 1;
    player.frameY = 0;
    player.xChange = 0;
    player.yChange = 0;

    //clear arrays
    enemy1.length = 0;
    bread.length = 0;
    //enemies dont move upon restart
    PauseAllEnemies = false;
    //bread doesn't redraw on restart
    stopDrawingItems = false;
    points = 0;
    NoLevelChange = true;

    init();   
}
//death process for player game over
function deathAnimation(){
    deathSFX.play();

}

function stop() {
    window.cancelAnimationFrame(request_id);
}
    
//load images faster to prevent problems if not loaded
function load_images(callback) {
    let num_images = Object.keys(IMAGES).length;
    let loaded = function() {
        num_images = num_images -1;
        if (num_images === 0) {
            callback();
        }
    };
    for (let name of Object.keys(IMAGES)) {
        let img = new Image(); //turns values of keys into Image objects
        img.addEventListener("load", loaded, false);
        img.src = IMAGES[name];
        IMAGES[name] = img;
    }
}

//speed cap in input parameter
function speedCap(entity, spdCap) {
    //right and left
    if (entity.xChange > spdCap) {
        entity.xChange = spdCap; //two different xChanges, going left(-) and going right(+)
    } else if (entity.xChange < -spdCap) {
        entity.xChange = -spdCap;
    }

    //down and up
    if (entity.yChange > spdCap) {
        entity.yChange = spdCap;
    } else if (entity.yChange < -spdCap) {
        entity.yChange = -spdCap;
    }
}

//map: generate map through tileset array
function GenerateBackgroundArray(background, tileset) {
    for (let row = 0, n=background.length; row < n; row +=1 ) { //20 length
        //for column in range(32). length of row
        for (let column = 0, n=background[row].length; column < n; column +=1) { //32 length
            //obtain specified tile from tileset
            let tile = background[row][column];
            if (tile >=0) {
                //tileRow represents row coordinate
                //tileCol represents column coordinate

                //floor division on row
                let tileRow = Math.floor(tile / tilesPerRow);

                //modulus gets remainder and floors it
                let tileCol = Math.floor(tile % tilesPerRow);

                context.drawImage(tileset,
                    tileCol * tileSize, tileRow * tileSize, tileSize, tileSize,
                    column * tileSize, row * tileSize, tileSize, tileSize);
            }
        }
    }
}

//map: generate map through png
function GenerateBackgroundImage(backgroundImage, backgroundWidth, backgroundHeight) {
    context.drawImage(backgroundImage,
        0, 0, backgroundWidth, backgroundHeight,
        0, 0, backgroundWidth, backgroundHeight);
    }
    

//#region General non-player Entity Functions
    //gives npc speed remember to stop or will forever accelerate. give spd cap
    //already done in move Entity and tracking
    function NPCspeed(entity, accel) {

        let yAccel = accel;
        let xAccel = accel
        if (entity.xChange<0){
            xAccel=-xAccel
        }
        if (entity.yChange<0){
            yAccel=-yAccel
        }

        entity.xChange = entity.xChange + xAccel;
        
        entity.yChange = entity.yChange + yAccel;
    }

    //radius detection
    //unused, currently
    //code taken and modified from http://cgp.wikidot.com/circle-to-circle-collision-detection
    //Returns true if the circles are touching, or false if they are not
    function circlesColliding( x1, y1, radius1, x2, y2, radius2) {
        //compare the distance to combined radii
        let dx = x2 - x1;
        let dy = y2 - y1;
        let radii = radius1 + radius2;
        if ( ( (dx **2)+(dy **2) ) < (radii**2) ) {
            return true;
        } else {
            return false;
        }
    }

    //to prevent bobbing when entity around player y
    function change_yChange(entity) {
        //if within certain y of player, dont yChange
        let distance=10;
        if (entity.y < player.y - distance|| //entity above
            entity.y > player.y + distance) //entity below
            {
            return true;
        } else {
            return false;
            }
    }

    //to prevent bobbing when entity around player y
    function change_xChange(entity) {
        //if within certain y of player, dont yChange
        let distance=25;
        if (entity.x < player.x - distance|| //entity left
            entity.x > player.x + distance) //entity right
            {
            return true;
        } else {
            return false;
            }
    }

    //stop frame movement if at certain x, y range, for tracking
    function change_xChange_frame(entity) {
        
        //if within certain x of player, dont change frame
        let distance=25;
        if (entity.x + entity.width < player.x + distance|| //left side
            entity.x > player.x + player.width + distance)  //right side
            {
            return true;
        } else {
            return false;
            }
    }

    //enemy1: track/chase player
    function trackPlayer(entity) {


    //allow entity to track player
    // if (!(entity.x === player.x || entity.y === player.y)) {
            // moveX = true;
            // moveY = true;
            if (entity.moveAble === true) {
                if (entity.x + Math.abs(entity.xChange) < player.x) { //moving right
                    entity.xChange += entity.speedStat;
                    if (change_xChange_frame(entity)) {
                        entity.frameY = 2; //right facing frames
                    }
                } else if (entity.x + Math.abs(entity.xChange) > player.x + player.width) { //moving left
                    entity.xChange -= entity.speedStat;
                    if (change_xChange_frame(entity)) {
                        entity.frameY = 3; //left facing frames
                    } 
                }
    
                if (entity.y < player.y + (player.height-entity.height)) { //chasing player, who is below entity
                    entity.yChange += entity.speedStat;
                } else if (entity.y > player.y+(player.height-entity.height)) { //chasing player, who is above entity
                    entity.yChange -= entity.speedStat;
                }
                entity.frameX = (entity.frameX + 1) % 4;

            }
    }

    //allow friction
    function friction(entity, num) {

        //friction along x axis
        entity.xChange = entity.xChange * num;

        //friction along y axis
        entity.yChange = entity.yChange * num;

    }
    
    //movement: no acceleration
    function moveEntity(entity, moveX, moveY) {
        //if (entity.moveAble === true) {
           
            if (entity.player === true){
                entity.x = entity.x + entity.xChange;
                entity.y = entity.y + entity.yChange;
            } else {
                if (change_xChange(entity)) {
                    entity.x = entity.x + entity.xChange;
                    entity.knockbackX = entity.xChange;

                }  else {
                    entity.knockbackX = 0;
                }
                if (change_yChange(entity)) {
                    entity.y = entity.y + entity.yChange;
                    entity.knockbackY = entity.yChange;

                } else {
                    entity.knockbackY = 0;
                }

            }
        //}
    }

//#endregion

//#region player: functions relating mostly to player
//player: movement
//also draw player
        function playerMovement() {
            context.drawImage(IMAGES.player,
                player.frameX*player.width, player.frameY*player.height, player.width, player.height, //sprite coords
                player.x, player.y, player.width, player.height //player coords
            );

            //player: acceleration and movement
            if (player.moveAble === true) {
                if (moveLeft) {
                    //player.xChange = -2;
                    player.xChange = player.xChange - player.speedStat; //velocity
                    // player.xChange = -5;    //static speed
                    player.frameY = 2;
            
                }
                if (moveRight) {
                    //player.xChange = 2;
                    player.xChange = player.xChange + player.speedStat; //velocity
                    // player.xChange = 5; //static speed
                    player.frameY =1;
                }
            
                //moving upward
                if (moveUp) {
                    player.yChange = player.yChange - player.speedStat; //velocity
                    // player.yChange = -5 //static speed
                    player.frameY = 3;
            
                }
            
                //moving downward
                if (moveDown) {
                    player.yChange = player.yChange + player.speedStat; //velocity
                    // player.yChange =  5; //static speed
                    player.frameY = 0;

                }

            }

            //ensure animations occur hen lft/rght and up/dwn not pressed at same time
            if ((moveRight || moveLeft || moveUp || moveDown) && !((moveRight && moveLeft))){
                player.frameX = (player.frameX + 1) % 3 //loop through frames with limit of 3rd frame

            } else {
                player.frameX = 1;}
                
            friction(player, 0.7);
            speedCap(player, 10);
        }

        //checks if anything collides with player
        function player_collides(entity) {
            if (player.x + player.width < entity.x || //player touching right of npc
                entity.x + entity.width < player.x ||  //player touching left of npc
                player.y > entity.y + entity.height||  //player touching bottom of npc
                entity.y > player.y + player.height) { //player touching top of npc
                return false;
            } else {
                return true;
                }
        }

        //works by checking if no collisions
        function playerCollidingWith(array){
            for (let entity of array) {
                //check occurs on collision with any entity that has collision code
                if (player_collides(entity)) {
                    if (entity.pickup == false && entity.knockback === true) {
                        //velocity at 0 if not moving
                        //base off of entity for c and y change as player
                        //can stop moving during collision
                        if (GodMode === false){
                            player.health-=1;
                        }

                        if (AllowKnockback === true) {
                            //lock keyboard from movement
                            player.moveAble = false;
                            entity.moveAble = false;
    
                            player.xChange+=(entity.knockbackX*(player.width));
                            player.yChange+=(entity.knockbackY*(player.height));
                            
                            entity.xChange-=(entity.knockbackX*5);
                            entity.yChange-=(entity.knockbackY*5);
    
                            entity.knockback=false;
                        }
                    }
                    //stop();
                    if (entity.pickup === true) {
                        //allow for playing sound multiple times
                        itemGetSFX.sound.cloneNode(true).play();
                        let index = array.indexOf(entity);
                        if (array.length === 1){
                            clearStageSFX.sound.play();
                        }
                        array.splice(index, 1);
                        points+= entity.points;
                        
                        //increase difficulty according to points
                        if (points%PointsIncreaseRequirement===0) {
                            difficulty++;
                        }
                    }
                    
                return true;
                }
            }
        }

        //free/unlock entity from collision stun
        function RemoveCollisionStun(entity) {
            if (Math.abs(entity.xChange) < 0.1) {
                entity.moveAble = true;
                //want to show hearts going empty
                entity.knockback = true;
            }
        }
        
        //player health: draw
        //global variable
        let hearts=[];
        function displayPlayerHealth() {
            if (hearts.length<player.health){
                hearts.push(new HeartCanister())                    
            }
            //ui: get a healthbar
            for (let i of hearts) {
                //ensure game over if healthDifference is equal to maxHealth
                let healthDifference = player.maxHealth-player.health
                let MaxHealthIndex = player.maxHealth - healthDifference;

                //if no health subtracted, draw as normal
                if (MaxHealthIndex<=player.maxHealth){
                    if (hearts.indexOf(i)>=MaxHealthIndex){
                        context.drawImage(IMAGES.heart,
                            //draw full heart
                            i.frameX+1*i.width, i.frameY*i.height, i.width, i.height, //sprite coords
                            i.xGap+i.width*hearts.indexOf(i), canvas.height-i.height, i.width, i.height //sprite location coords
                        );
                    } else {
                        context.drawImage(IMAGES.heart,
                            //draw empty heart
                            i.frameX*i.width, i.frameY*i.height, i.width, i.height, //sprite coords
                            i.xGap+i.width*hearts.indexOf(i), canvas.height-i.height, i.width, i.height //sprite location coords
                        );
                    }
                }
            }
        }
        //generate weather
        function weather(type) {
            //generate appropriate weather
            if (type === 1){
                WeatherContext.fillStyle = "white";  
                // context.fillRect(0,0, canvas.width, canvas.height)  
                if (particles.length < 40) {
                    let p = {
                        x : randint(-weatherEffectsCanvas.width, weatherEffectsCanvas.width),
                        y : -weatherEffectsCanvas.height,
                        size : randint(2,5),
                        //direction and speed
                        xChange : 0.05,
                        //gravity
                        yChange : randint(0.3,0.5),
                    
                    }; 
                    particles.push(p);
                }
                
                WeatherContext.clearRect(0,0, weatherEffectsCanvas.width, weatherEffectsCanvas.height);   
                
                for (let p of particles) {
                    WeatherContext.fillRect(p.x,p.y,p.size,p.size);
            
                    for (let p of particles) {
                        p.x+=p.xChange;
                        p.y+=p.yChange;
                        // p.yChange +=1;
                        if (p.x+p.size>weatherEffectsCanvas.width || p.y>weatherEffectsCanvas.height){
                            // p.xChange*=-1;
                            // particles.pop(p);
                            p.y = 0
                            p.x = randint(-weatherEffectsCanvas.width, weatherEffectsCanvas.width)
                        } 
                        
                    };  
                };  
            };
        };
        
        function GameOver() {
            //occurs when function calls for game over
            //clear points
            //no need as points stop drawing after player health depletes
            //context.clearRect(DrawPointsX, DrawPointsY, points_TextMetric.width,-30)
            gameover = true;
            //fill screen with black and display "Game Over"
            context.fillStyle ="black"
            context.fillRect(
                0,0,canvas.width,canvas.height
            )
            context.font = '50px impact';
            context.fillStyle = "white";
            let ctx_TextMetric=context.measureText("Game Over")
            //measureText returns an object
            context.fillText("Game Over", canvas.width/2-ctx_TextMetric.width/2, canvas.height/2);
            
            //draw score
            context.font = '25px impact';
            context.fillStyle = "white";
            let displayScore = "Your Score: ".concat(String(points));
            ctx_TextMetric=context.measureText(displayScore);
            context.fillText(displayScore,
                canvas.width/2-ctx_TextMetric.width/2, canvas.height/2+50
            );
            
            //draw instructions to retry
            
            context.font = '25px impact';
            context.fillStyle = "white";
            context.fillText("Press 'Q' to try again!",
                DrawPointsX,25
            );

            stop()
        }

//#endregion

//#region enemy: general enemy related functions

    //enemy1: generate
    function generateNPCenemy(array, limit, enemyObj) {
        //enemy1: draw enemy1
        //immediately draw
        for (let npc of array) {
            //context.fillRect(npc.x,npc.y,npc.size,npc.size);
            context.drawImage(IMAGES.npc,
                npc.frameX*npc.width, npc.frameY*npc.height, npc.width, npc.height, //sprite coords
                npc.x, npc.y, npc.width, npc.height //npc coords
            );
        }
        if (array.length < limit) {
            let npc = enemyObj;
            let spawnCoords=DetermineNpcSpawn(npc);
            //add spawn coords
            npc.x = spawnCoords[0];
            npc.y = spawnCoords[1];
            enemy1.push(npc);
        }
    }



    //check if entity has gone off the border
    function EntityOffBorder(entity){
        //if entity goes off border, place on other side of canvas
        //distance used for increasing distance from borders
        let distanceX=entity.width/3;
        let distanceY=entity.height/3;
        let BlockOffBorder = false;
        //check for if moved out of bounds
        let MovedOutOfBorder = false;
        //right and left border
        if (entity === player && bread.length>0){
            distanceX = -entity.width/2;
            distanceY = -entity.height/2;
            BlockOffBorder = true;
        }

        if (entity.x > canvas.width + distanceX) { //right side
            if (BlockOffBorder === true){
                //ensure player doesn't get stuck beyond borders
                if (entity.x > canvas.width){
                    entity.x -= entity.width;
                }
                entity.x -= entity.xChange;
                
            } else {
                entity.x = 0 + distanceX;
                entity.y = canvas.height-player.height-entity.y;
                MovedOutOfBorder = true;
            }
        } else if (entity.x + entity.width + distanceX < 0) { //left side
            if (BlockOffBorder === true){
                if (entity.x < -entity.width){
                    entity.x += entity.width;
                }
                entity.x-=entity.xChange;
            } else {
                entity.x = canvas.width - distanceX;
                entity.y = canvas.height-player.height-entity.y;
                MovedOutOfBorder = true;
            }
        }
    

        //down and up border
        if (entity.y > canvas.height + distanceY) { //down
            if (BlockOffBorder === true){
                if (entity.y > canvas.height){
                    entity.y -= entity.height;
                }
                entity.y-=entity.yChange;
            } else {
                entity.y = 0 - entity.height + distanceY;
                MovedOutOfBorder = true;
            }
        } else if (entity.y + entity.height + distanceY < 0) { //up
            if (BlockOffBorder === true){
                if (entity.y + entity.height < -entity.height){
                    entity.y +=entity.height;
                }
                entity.y-=entity.yChange;
            } else {
                entity.y = canvas.height -distanceY;
                MovedOutOfBorder = true;
            }
        }
        if (MovedOutOfBorder === true){
            return true;
        }

    }

    function DetermineNpcSpawn(entity) {
        /*check if player x is closer or farther than border
        if closer, spawn npc on opposite side
        if farther, spawn npc on side
        designate border as canvas.width and canvas.height. represents right side.

        //if player is smack in middle, just set to all borders for spawn
        */

        let NPCxSpawn=[randint(0,canvas.width-1), canvas.width];//locations for spawn. either across canvas or at edge
        //let a=0; //a represents which array is being looked at
        let random = Math.floor(Math.random() * NPCxSpawn.length); //generate random number for index
        let  chosenWidth = NPCxSpawn[random]; //choose a width
        //if npc's move off of border
        //PLAYER AT TOP//
        if (player.y<(canvas.height/2)) {

            //player at top left
            if (player.x<(canvas.width/2)) {
                if (chosenWidth < canvas.width) { //NPC spawn at bottom if width not at canvas edge
                    return [chosenWidth, canvas.height+(entity.height/1.5)]
                } else {
                    return [canvas.width, randint(0, canvas.height)] //spawn on right canvas edge
                }
            //player at top right
            } else if (player.x>(canvas.width/2)) {
                if (chosenWidth < canvas.width) { //NPC spawn at bottom if width not at canvas edge
                    return [chosenWidth, canvas.height+(entity.height/1.5)]
                } else {
                    return [-entity.width, randint(0, canvas.height)] //spawn on left
                }
            }

        }

        //PLAYER AT BOTTOM//
        if (player.y>(canvas.height/2)) {

            //player at bottom left
            if (player.x<(canvas.width/2)) {
                if (chosenWidth < canvas.width) { //NPC spawn at top if width not at canvas edge
                    return [chosenWidth, -entity.height/1]
                } else {
                    return [chosenWidth, randint(0, canvas.height)] //spawn on edge
                }
            //player at bottom right
            } else if (player.x>(canvas.height/2)) {
                if (chosenWidth < canvas.width) { //NPC spawn at bottom if width not at canvas edge
                    return [chosenWidth, -entity.height/1]
                } else {
                    return [-entity.width, randint(-100, canvas.height)] //spawn on left
                }
            }

        }
        //if none of these positions occur, place at random of canvas
        return [randint(0, canvas.width), randint(0, canvas.height)]
    }

//#endregion

//Items: spawns in items. gets coords and draws them
function spawnRandItems(array, limit, distance, itemObj) {
    //immediately draw
    for (let item of array) {
        context.drawImage(IMAGES.item,
            item.frameX*item.width, item.frameY*item.height, item.width, item.height, //sprite coords
            item.x, item.y, item.width, item.height //item coords
        );
    }
    //distance from canvas borders

    //will add objects if limit is set.
    //if objects popped, new ones generated
    if (array.length < limit && stopDrawingItems === false) {
        let item = itemObj;
        //distance is distance from border
        let minXlimit = 0 + distance;
        let maxXlimit = canvas.width - distance;
        let minYlimit = 0 + distance;
        let maxYlimit = canvas.height - distance;
        
        item.x = randint(minXlimit, maxXlimit);
        item.y = randint(minYlimit, maxYlimit);
        if (!circlesColliding(
            player.x, player.y, player.height+10, 
            item.x, item.y, item.height)) {
                array.push(itemObj)
            }

    } else {
        stopDrawingItems = true;
    }
}

//reload page
function reloadWindow() {
    window.location.reload(true);
}

function PlayPauseMusic() {
    if (!(gameover === true)){
        if (bgm.sound.muted === true) {
            // console.log("music on")
            bgm.sound.muted = false;
            bgm.sound.currentTime = 0;
            bgm.play(); 
            bgm.sound.loop = true;
            music.innerHTML = "&#x1F50A Music";
            continueMusic = true;
        } else if (bgm.sound.muted === false) {
            bgm.sound.muted = true; 
            // console.log("music off");
            music.innerHTML = "&#x1f507 Music";
            continueMusic = false;
        }
    }
}
//display instructions
let instructionsVisible = true;
function displayInstructions() {
    let hidden_instructions = document.querySelector("#hidden_instructions");
    if (instructionsVisible === true) {
        hidden_instructions.style.visibility = "hidden";
        hidden_instructions.style.maxHeight = "0";
        instructionsVisible = false;
        instructions.innerHTML = "Show Controls"
    } else {
        hidden_instructions.style.visibility = "visible";
        hidden_instructions.style.maxHeight = "100%";
        instructionsVisible = true;
        instructions.innerHTML = "Hide Controls"
    }
}


