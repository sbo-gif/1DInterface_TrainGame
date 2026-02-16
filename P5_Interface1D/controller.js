
// This is where your state machines and game logic lives


class Controller {

    // This is the state we start with.
    constructor() {
        this.gameState = "PLAY";
       
    }
    
    // This is called from draw() in sketch.js with every frame
    update() {

        // STATE MACHINE ////////////////////////////////////////////////
        // This is where your game logic lives
        /////////////////////////////////////////////////////////////////
        switch(this.gameState) {

            // This is the main game state, where the playing actually happens
            case "PLAY":

                // clear screen at frame rate so we always start fresh      
                display.clear();
            
                // show all players in the right place, by adding them to display buffer
                display.setPixel(playerOne.position, playerOne.playerColor);
                display.setPixel(playerTwo.position, playerTwo.playerColor);
                

                // now add the target
                display.setPixel(target.position, target.playerColor);

                
                // check if player has caught target
                if (playerOne.position == target.position)  {
                    playerOne.score++;              // increment score
                    this.gameState = "COLLISION";   // go to COLLISION state
                }
                
                // check if other player has caught target        
                if (playerTwo.position == target.position)  {
                    playerTwo.score++;              // increment their score
                    this.gameState = "COLLISION";   // go to COLLISION state
                }

                break;

            // This state is used to play an animation, after a target has been caught by a player 
            case "COLLISION":
                
                 // clear screen at frame rate so we always start fresh      
                 display.clear();

                // play explosion animation one frame at a time.
                // first figure out what frame to show
                let frameToShow = collisionAnimation.currentFrame();    // this grabs number of current frame and increments it 
                
                // then grab every pixel of frame and put it into the display buffer
                for(let i = 0; i < collisionAnimation.pixels; i++) {
                    display.setPixel(i,collisionAnimation.animation[frameToShow][i]);                    
                }

                //check if animation is done and we should move on to another state
                if (frameToShow == collisionAnimation.animation.length-1)  {
                    
                    // We've hit score max, this player wins
                    if (playerOne.score >= score.max) {
                        score.winner = playerOne.playerColor;   // store winning color in score.winner
                        this.gameState = "SCORE";               // go to state that displays score
                    
                    // We've hit score max, this player wins
                    } else if (playerTwo.score >= score.max) {
                        score.winner = playerTwo.playerColor;   // store winning color in score.winner
                        this.gameState = "SCORE";               // go to state that displays score

                    // We haven't hit the max score yet, keep playing    
                    } else {
                        target.position = parseInt(random(0,displaySize));  // move the target to a new random position
                        this.gameState = "PLAY";    // back to play state
                    }
                } 

                break;

            // Game is over. Show winner and clean everything up so we can start a new game.
            case "SCORE":       
            
                // reset everyone's score
                playerOne.score = 0;
                playerTwo.score = 0;

                // put the target somewhere else, so we don't restart the game with player and target in the same place
                target.position = parseInt(random(1,displaySize));

                //light up w/ winner color by populating all pixels in buffer with their color
                display.setAllPixels(score.winner);                    

                break;

            // Not used, it's here just for code compliance
            default:
                break;
        }
    }
}




// This function gets called when a key on the keyboard is pressed
function keyPressed() {

    // Move player one to the left if letter A is pressed
    if (key == 'A' || key == 'a') {
        playerOne.move(-1);
      }
    
    // And so on...
    if (key == 'D' || key == 'd') {
    playerOne.move(1);
    }    

    if (key == 'J' || key == 'j') {
    playerTwo.move(-1);
    }
    
    if (key == 'L' || key == 'l') {
    playerTwo.move(1);
    }
    
    // When you press the letter R, the game resets back to the play state
    if (key == 'R' || key == 'r') {
    controller.gameState = "PLAY";
    }
  }
// controller.js

// ===== EASY TOGGLES (seconds / frames) =====
let JUMP_TOP_SECONDS = 1.0;

let TRACK_TAP_WINDOW = 0.5;
let TRACK_DEATH_AFTER = 5.0;
let RESPAWN_AFTER = 5.0;

let BLINK_PERIOD_NORMAL = 20;
let BLINK_PERIOD_PANIC_MIN = 4;

let STARTING_LIVES = 3;

let ASSUMED_FPS = 60;

// ===== TUNNEL TOGGLES =====
let TIME_UNTIL_TUNNEL = 10.0;
let TUNNEL_WARNING_SECONDS = 2.0;
let TUNNEL_WIDTH_PIXELS = 5;

// Tunnel speed (columns per second), moving RIGHT -> LEFT
let TUNNEL_SPEED_COLS_PER_SEC = 8.0;

class Controller {
  constructor() {
    // NEW: Start screen state
    this.gameState = "START"; // START -> PLAY -> GAME_OVER

    // Train layout parameters (in 1D pixels)
    this.wagonLength = 7;
    this.gapLength = 2;
    this.numWagons = 3;

    this.wagonGrey = color(180);

    // Computed each frame
    this.wagonMask = new Array(displaySize).fill(false);
    this.leftEdge = new Array(displaySize).fill(false);
    this.rightEdge = new Array(displaySize).fill(false);

    // Timing in frames
    this.jumpFrames = max(1, floor(JUMP_TOP_SECONDS * ASSUMED_FPS));
    this.tapWindowFrames = max(1, floor(TRACK_TAP_WINDOW * ASSUMED_FPS));
    this.deathAfterFrames = max(1, floor(TRACK_DEATH_AFTER * ASSUMED_FPS));
    this.respawnFrames = max(1, floor(RESPAWN_AFTER * ASSUMED_FPS));

    // Tunnel state (scheduled on startGame())
    this.resetTunnelSchedule();
  }

  resetTunnelSchedule() {
    this.tunnelStartFrame = Infinity;
    this.tunnelWarnFrame = Infinity;

    this.tunnelActive = false;
    this.tunnelDone = false;

    // Spawn off-screen right
    this.tunnelXFloat = displaySize;
    this.tunnelX = floor(this.tunnelXFloat);

    this.tunnelSpeedColsPerFrame = TUNNEL_SPEED_COLS_PER_SEC / ASSUMED_FPS;
  }

  startGame() {
    this.gameState = "PLAY";

    // Reset lives + states
    playerOne.lives = STARTING_LIVES;
    playerTwo.lives = STARTING_LIVES;

    // Ensure layout exists
    this.computeTrainLayout();

    // Spawn on wagons
    this.spawnPlayerOnWagon(playerOne);
    this.spawnPlayerOnWagon(playerTwo, playerOne.position);

    // Start tunnel timer relative to NOW
    this.tunnelDone = false;
    this.tunnelActive = false;
    this.tunnelStartFrame = frameCount + floor(TIME_UNTIL_TUNNEL * ASSUMED_FPS);
    this.tunnelWarnFrame = this.tunnelStartFrame - floor(TUNNEL_WARNING_SECONDS * ASSUMED_FPS);
    this.tunnelXFloat = displaySize;
    this.tunnelX = floor(this.tunnelXFloat);
  }

  computeTrainLayout() {
    this.wagonMask.fill(false);
    this.leftEdge.fill(false);
    this.rightEdge.fill(false);

    const trainLength =
      this.numWagons * this.wagonLength +
      (this.numWagons - 1) * this.gapLength;

    const leftPadding = max(0, floor((displaySize - trainLength) / 2));

    for (let w = 0; w < this.numWagons; w++) {
      const start = leftPadding + w * (this.wagonLength + this.gapLength);
      const end = start + this.wagonLength - 1;

      if (start >= 0 && start < displaySize) this.leftEdge[start] = true;
      if (end >= 0 && end < displaySize) this.rightEdge[end] = true;

      for (let i = start; i <= end; i++) {
        if (i >= 0 && i < displaySize) this.wagonMask[i] = true;
      }
    }
  }

  randomWagonIndex(avoidIndex = null) {
    const candidates = [];
    for (let i = 0; i < displaySize; i++) {
      if (this.wagonMask[i] && i !== avoidIndex) candidates.push(i);
    }
    if (candidates.length === 0) return 0;
    return candidates[floor(random(0, candidates.length))];
  }

  spawnPlayerOnWagon(player, avoidIndex = null) {
    player.position = this.randomWagonIndex(avoidIndex);
    player.mode = "WAGON";

    player.isAirborne = false;
    player.airborneFramesLeft = 0;

    player.isDead = false;
    player.deadFramesLeft = 0;

    player.lastDownFrame = frameCount;
  }

  isTunnelWarning() {
    return (
      this.gameState === "PLAY" &&
      !this.tunnelDone &&
      frameCount >= this.tunnelWarnFrame &&
      frameCount < this.tunnelStartFrame
    );
  }

  updateTunnel() {
    if (this.gameState !== "PLAY") return;
    if (this.tunnelDone) return;

    this.tunnelSpeedColsPerFrame = TUNNEL_SPEED_COLS_PER_SEC / ASSUMED_FPS;

    if (!this.tunnelActive) {
      if (frameCount >= this.tunnelStartFrame) {
        this.tunnelActive = true;
        this.tunnelXFloat = displaySize; // off-screen right
        this.tunnelX = floor(this.tunnelXFloat);
      } else {
        return;
      }
    }

    // Move LEFT
    this.tunnelXFloat -= this.tunnelSpeedColsPerFrame;
    this.tunnelX = floor(this.tunnelXFloat);

    // Done when fully past left edge
    if ((this.tunnelX + TUNNEL_WIDTH_PIXELS) < 0) {
      this.tunnelActive = false;
      this.tunnelDone = true;
    }
  }

  tunnelCoversIndex(idx) {
    if (!this.tunnelActive) return false;
    return idx >= this.tunnelX && idx < (this.tunnelX + TUNNEL_WIDTH_PIXELS);
  }

  update() {
    // Always draw wagons row (even on START/GAME_OVER)
    this.computeTrainLayout();
    display.setAllPixels(null);
    for (let i = 0; i < displaySize; i++) {
      if (this.wagonMask[i]) display.setPixel(i, this.wagonGrey);
    }

    if (this.gameState !== "PLAY") return;

    // Gameplay ticking only in PLAY
    this.updateTunnel();

    tickJumpTimer(playerOne);
    tickJumpTimer(playerTwo);

    tickTrackSurvival(playerOne);
    tickTrackSurvival(playerTwo);

    applyTunnelHazard(playerOne);
    applyTunnelHazard(playerTwo);
  }
}

/* ---------------- Timers / Survival ---------------- */

function tickJumpTimer(player) {
  if (player.isAirborne) {
    player.airborneFramesLeft--;
    if (player.airborneFramesLeft <= 0) {
      player.isAirborne = false;
      player.airborneFramesLeft = 0;
    }
  }
}

function killPlayerAndConsumeLife(player) {
  if (player.isDead) return;

  player.lives = max(0, player.lives - 1);

  player.isDead = true;
  player.deadFramesLeft = controller.respawnFrames;

  player.isAirborne = false;
  player.airborneFramesLeft = 0;

  if (player.lives <= 0) {
    controller.gameState = "GAME_OVER";
  }
}

function tickTrackSurvival(player) {
  if (controller.gameState !== "PLAY") return;

  if (player.isDead) {
    player.deadFramesLeft--;
    if (player.deadFramesLeft <= 0) {
      if (player.lives > 0) {
        const avoid = (player === playerOne) ? playerTwo.position : playerOne.position;
        controller.spawnPlayerOnWagon(player, avoid);
      }
    }
    return;
  }

  if (player.mode !== "TRACK") return;

  const framesSinceDown = frameCount - (player.lastDownFrame ?? 0);
  if (framesSinceDown >= controller.deathAfterFrames) {
    killPlayerAndConsumeLife(player);
  }
}

/* ---------------- Tunnel hazard ---------------- */

function applyTunnelHazard(player) {
  if (controller.gameState !== "PLAY") return;
  if (!controller.tunnelActive) return;
  if (player.isDead) return;

  if (!controller.tunnelCoversIndex(player.position)) return;

  // On wagon => die (even if airborne/invisible)
  if (player.mode === "WAGON") {
    killPlayerAndConsumeLife(player);
    return;
  }

  // On track => must have pressed DOWN recently
  const framesSinceDown = frameCount - (player.lastDownFrame ?? 999999);
  if (framesSinceDown > controller.tapWindowFrames) {
    killPlayerAndConsumeLife(player);
  }
}

/* ---------------- Movement Helpers ---------------- */

function wrapIndex(i) {
  if (i < 0) return displaySize - 1;
  if (i >= displaySize) return 0;
  return i;
}

function isLocked(player) {
  return (
    controller.gameState !== "PLAY" ||
    player.isDead === true ||
    player.isAirborne === true
  );
}

function tryMoveSide(player, dir) {
  if (isLocked(player)) return;

  const pos = player.position;

  if (player.mode === "WAGON") {
    if (dir === -1 && controller.leftEdge[pos]) return;
    if (dir ===  1 && controller.rightEdge[pos]) return;

    const next = wrapIndex(pos + dir);
    if (controller.wagonMask[next]) player.position = next;
    return;
  }

  if (player.mode === "TRACK") {
    const next = wrapIndex(pos + dir);
    if (!controller.wagonMask[next]) player.position = next;
  }
}

function handleDownPress(player) {
  if (isLocked(player)) return;

  if (player.mode === "TRACK") {
    player.lastDownFrame = frameCount; // survival tap
    return;
  }

  const pos = player.position;

  let dropTo = null;
  if (controller.leftEdge[pos]) dropTo = wrapIndex(pos - 1);
  if (controller.rightEdge[pos]) dropTo = wrapIndex(pos + 1);
  if (dropTo === null) return;

  if (!controller.wagonMask[dropTo]) {
    player.position = dropTo;
    player.mode = "TRACK";
    player.lastDownFrame = frameCount;
  }
}

function tryJump(player) {
  if (isLocked(player)) return;

  if (player.mode === "TRACK") {
    const pos = player.position;
    const left = wrapIndex(pos - 1);
    const right = wrapIndex(pos + 1);

    if (controller.wagonMask[left]) {
      player.position = left;
      player.mode = "WAGON";
      return;
    }
    if (controller.wagonMask[right]) {
      player.position = right;
      player.mode = "WAGON";
      return;
    }
    return;
  }

  if (player.mode === "WAGON") {
    player.isAirborne = true;
    player.airborneFramesLeft = controller.jumpFrames;
  }
}

/* ---------------- Keyboard Controls ---------------- */

function keyPressed() {
  // SPACE starts the game from START screen
  if (controller.gameState === "START") {
    if (key === ' ' ) controller.startGame();
    return;
  }

  // allow restart from GAME OVER
  if (controller.gameState === "GAME_OVER") {
    if (key === 'R' || key === 'r') {
      controller.gameState = "START"; // back to start page
      controller.resetTunnelSchedule();
    }
    return;
  }

  // Player 1
  if (key === 'A' || key === 'a') tryMoveSide(playerOne, -1);
  if (key === 'D' || key === 'd') tryMoveSide(playerOne,  1);
  if (key === 'S' || key === 's') handleDownPress(playerOne);
  if (key === 'W' || key === 'w') tryJump(playerOne);

  // Player 2
  if (key === 'J' || key === 'j') tryMoveSide(playerTwo, -1);
  if (key === 'L' || key === 'l') tryMoveSide(playerTwo,  1);
  if (key === 'K' || key === 'k') handleDownPress(playerTwo);
  if (key === 'I' || key === 'i') tryJump(playerTwo);
}
