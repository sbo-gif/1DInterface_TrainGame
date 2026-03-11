// controller.js

// ===== EASY TOGGLES (seconds / frames) =====
let JUMP_TOP_SECONDS = 1.0;

let TRACK_TAP_WINDOW = 0.5;   // must press DOWN at least this often
let TRACK_DEATH_AFTER = 5.0;  // die after this long without DOWN
let RESPAWN_AFTER = 1.0;      // respawn delay (reducido de 5 a 1 segundo)

// Blink behavior (frames)
let BLINK_PERIOD_NORMAL = 20;
let BLINK_PERIOD_PANIC_MIN = 4;

// Lives
let STARTING_LIVES = 3;

// Movement repeat delay (frames) – lower = faster side-to-side movement
let MOVE_REPEAT_FRAMES = 8;

// FPS assumption
let ASSUMED_FPS = 60;

// ===== FIRE TOGGLES =====
let TIME_UNTIL_FIRE = 25.0;                    // seconds before fire starts
let FIRE_SPREAD_INTERVAL_SECONDS = 2.0;        // seconds between each pixel igniting (outer wagons)
let FIRE_PHASE2_DELAY_SECONDS = 5.0;           // pause after outer wagons burn before middle starts
let FIRE_PHASE2_SPREAD_INTERVAL_SECONDS = 6.0; // slow spread on middle wagon

// ===== TUNNEL TOGGLES =====
let TIME_UNTIL_TUNNEL = 10.0; // First tunnel at 10 seconds
let TUNNEL_WARNING_SECONDS = 2.0;
let TUNNEL_WIDTH_PIXELS = 5;

// Tunnel speed (columns per second), moving RIGHT -> LEFT
let TUNNEL_SPEED_COLS_PER_SEC = 4.0; // Reducido a la mitad (antes era 8.0)

class Controller {
  constructor() {
    this.gameState = "START"; // START -> PLAY -> GAME_OVER or VICTORY

    // Train layout parameters (1D pixels)
    this.wagonLength = 7;
    this.gapLength = 2;
    this.numWagons = 3;

    this.wagonGrey = color(180);

    this.wagonMask = new Array(displaySize).fill(false);
    this.leftEdge = new Array(displaySize).fill(false);
    this.rightEdge = new Array(displaySize).fill(false);

    this.jumpFrames = max(1, floor(JUMP_TOP_SECONDS * ASSUMED_FPS));
    this.tapWindowFrames = max(1, floor(TRACK_TAP_WINDOW * ASSUMED_FPS));
    this.deathAfterFrames = max(1, floor(TRACK_DEATH_AFTER * ASSUMED_FPS));
    this.respawnFrames = max(1, floor(RESPAWN_AFTER * ASSUMED_FPS));

    // Fire state
    this.fireMask = new Array(displaySize).fill(false);
    this.fireStartFrame = Infinity;
    this.fireLastSpreadFrame = 0;
    this.fireSpreadIntervalFrames = max(1, floor(FIRE_SPREAD_INTERVAL_SECONDS * ASSUMED_FPS));
    this.fireLeftPixel = -1;
    this.fireRightPixel = -1;
    this.fireFullyEngulfed = false;
    this.firePhase2StartFrame = Infinity;
    this.firePhase2Left = -1;
    this.firePhase2Right = -1;
    this.firePhase2IntervalFrames = max(1, floor(FIRE_PHASE2_SPREAD_INTERVAL_SECONDS * ASSUMED_FPS));
    this.firePhase2LastSpreadFrame = 0;
    this.firePhase2Done = false;

    this.resetTunnelSchedule();
  }

  resetTunnelSchedule() {
    this.tunnelStartFrame = Infinity;
    this.tunnelWarnFrame = Infinity;

    this.tunnelActive = false;
    this.tunnelDone = false;

    this.tunnelXFloat = displaySize;
    this.tunnelX = floor(this.tunnelXFloat);

    this.tunnelSpeedColsPerFrame = TUNNEL_SPEED_COLS_PER_SEC / ASSUMED_FPS;
  }

  startGame() {
    this.gameState = "PLAY";
    this.gameStartFrame = frameCount; // Track when game started

    playerOne.lives = STARTING_LIVES;
    if (player2Enabled) {
      playerTwo.lives = STARTING_LIVES;
    }   

    // Reset map progress
    mapProgress = 0;
    stationBuildingX = startStationCenterX; // Start station begins centered
    endStationX = 0; // Reset end station position
    isTrainMoving = false; // Reset train movement flag

    this.computeTrainLayout();
    this.spawnPlayerOnWagon(playerOne);

    if (player2Enabled) {
      this.spawnPlayerOnWagon(playerTwo, playerOne.position);
    }  
    // Schedule tunnel from now
    this.tunnelDone = false;
    this.tunnelActive = false;
    this.tunnelStartFrame = frameCount + floor(TIME_UNTIL_TUNNEL * ASSUMED_FPS);
    this.tunnelWarnFrame = this.tunnelStartFrame - floor(TUNNEL_WARNING_SECONDS * ASSUMED_FPS);
    this.tunnelXFloat = displaySize;
    this.tunnelX = floor(this.tunnelXFloat);

    // Schedule fire
    this.resetFireState();
    this.fireStartFrame = frameCount + floor(TIME_UNTIL_FIRE * ASSUMED_FPS);
    this.fireLeftPixel = this.getWagonStart(0);
    this.fireRightPixel = this.getWagonEnd(2);
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

  getWagonStart(wagonIndex) {
    const trainLength = this.numWagons * this.wagonLength + (this.numWagons - 1) * this.gapLength;
    const leftPadding = max(0, floor((displaySize - trainLength) / 2));
    return leftPadding + wagonIndex * (this.wagonLength + this.gapLength);
  }

  getWagonEnd(wagonIndex) {
    return this.getWagonStart(wagonIndex) + this.wagonLength - 1;
  }

  getFireColor(pixelIndex) {
    const flicker = sin(frameCount * 0.15 + pixelIndex * 2.7);
    const t = (flicker + 1) * 0.5;
    const r = 255;
    const g = floor(lerp(80, 220, t));
    const b = 0;
    return color(r, g, b);
  }

  isFireWarning() {
    return (
      this.gameState === "PLAY" &&
      !this.fireFullyEngulfed &&
      this.fireStartFrame !== Infinity &&
      frameCount >= this.fireStartFrame - floor(TUNNEL_WARNING_SECONDS * ASSUMED_FPS) &&
      frameCount < this.fireStartFrame
    );
  }

  resetFireState() {
    this.fireMask.fill(false);
    this.fireStartFrame = Infinity;
    this.fireLastSpreadFrame = 0;
    this.fireFullyEngulfed = false;
    this.fireLeftPixel = -1;
    this.fireRightPixel = -1;
    this.firePhase2StartFrame = Infinity;
    this.firePhase2Left = -1;
    this.firePhase2Right = -1;
    this.firePhase2LastSpreadFrame = 0;
    this.firePhase2Done = false;
  }

  randomWagonIndex(avoidIndex = null) {
    const candidates = [];
    for (let i = 0; i < displaySize; i++) {
      if (this.wagonMask[i] && i !== avoidIndex && !this.fireMask[i]) candidates.push(i);
    }
    if (candidates.length === 0) return -1;
    return candidates[floor(random(0, candidates.length))];
  }

  spawnPlayerOnWagon(player, avoidIndex = null, specificPosition = null) {
    // Si se especifica una posición, usarla; si no, usar el primer vagón (izquierda)
    if (specificPosition !== null && this.wagonMask[specificPosition] && !this.fireMask[specificPosition]) {
      player.position = specificPosition;
    } else {
      // Spawn en el primer pixel del primer vagón (más a la izquierda)
      const firstWagonStart = this.getWagonStart(0);
      if (this.wagonMask[firstWagonStart] && !this.fireMask[firstWagonStart]) {
        player.position = firstWagonStart;
      } else {
        // Fallback: posición aleatoria si el primer vagón no está disponible
        player.position = this.randomWagonIndex(avoidIndex);
      }
    }
    
    player.mode = "WAGON";

    player.isAirborne = false;
    player.airborneFramesLeft = 0;

    player.isDead = false;
    player.deadFramesLeft = 0;

    player.lastDownFrame = frameCount;
    
    // Dar inmunidad temporal al jugador (3 segundos para dar tiempo)
    player.invulnerableUntil = frameCount + 180; // 180 frames = 3 segundos a 60fps
    
    console.log("Player spawned at position", player.position, "with invulnerability until frame", player.invulnerableUntil);
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

    // Move RIGHT -> LEFT
    this.tunnelXFloat -= this.tunnelSpeedColsPerFrame;
    this.tunnelX = floor(this.tunnelXFloat);

    // Done when fully past left edge
    if ((this.tunnelX + TUNNEL_WIDTH_PIXELS) < 0) {
      this.tunnelActive = false;
      this.tunnelDone = true;

      // 🔁 Schedule next tunnel 10 seconds later
      const delay = floor(TIME_UNTIL_TUNNEL * ASSUMED_FPS);

      this.tunnelStartFrame = frameCount + delay;
      this.tunnelWarnFrame =
        this.tunnelStartFrame - floor(TUNNEL_WARNING_SECONDS * ASSUMED_FPS);

      this.tunnelDone = false;   // allow next tunnel
    }
  }

  tunnelCoversIndex(idx) {
    if (!this.tunnelActive) return false;
    return idx >= this.tunnelX && idx < (this.tunnelX + TUNNEL_WIDTH_PIXELS);
  }

  updateFire() {
    if (this.gameState !== "PLAY") return;
    if (this.firePhase2Done) return;
    if (frameCount < this.fireStartFrame) return;

    // Phase 1: Spread fire on outer wagons
    if (!this.fireFullyEngulfed) {
      if (frameCount - this.fireLastSpreadFrame < this.fireSpreadIntervalFrames) return;

      let spread = false;
      const wagon0End = this.getWagonEnd(0);
      if (this.fireLeftPixel >= 0 && this.fireLeftPixel <= wagon0End) {
        this.fireMask[this.fireLeftPixel] = true;
        this.fireLeftPixel++;
        spread = true;
      }

      const wagon2Start = this.getWagonStart(2);
      if (this.fireRightPixel >= wagon2Start && this.fireRightPixel <= this.getWagonEnd(2)) {
        this.fireMask[this.fireRightPixel] = true;
        this.fireRightPixel--;
        spread = true;
      }

      if (spread) {
        this.fireLastSpreadFrame = frameCount;
      }

      if (this.fireLeftPixel > wagon0End && this.fireRightPixel < wagon2Start) {
        this.fireFullyEngulfed = true;
        this.firePhase2StartFrame = frameCount + floor(FIRE_PHASE2_DELAY_SECONDS * ASSUMED_FPS);
        this.firePhase2Left = this.getWagonStart(1);
        this.firePhase2Right = this.getWagonEnd(1);
        this.firePhase2LastSpreadFrame = 0;
      }
      return;
    }

    // Phase 2: Slow creep into middle wagon
    if (frameCount < this.firePhase2StartFrame) return;
    if (frameCount - this.firePhase2LastSpreadFrame < this.firePhase2IntervalFrames) return;

    let spread2 = false;
    const wagon1Start = this.getWagonStart(1);
    const wagon1End = this.getWagonEnd(1);

    if (this.firePhase2Left <= this.firePhase2Right) {
      this.fireMask[this.firePhase2Left] = true;
      this.firePhase2Left++;
      spread2 = true;
    }

    if (this.firePhase2Right >= wagon1Start && this.firePhase2Right >= this.firePhase2Left) {
      this.fireMask[this.firePhase2Right] = true;
      this.firePhase2Right--;
      spread2 = true;
    }

    if (spread2) {
      this.firePhase2LastSpreadFrame = frameCount;
    }

    if (this.firePhase2Left > wagon1End) {
      this.firePhase2Done = true;
    }
  }

  update() {
    // Always draw wagons row (even on START/GAME_OVER)
    this.computeTrainLayout();
    display.setAllPixels(null);
    for (let i = 0; i < displaySize; i++) {
      if (this.wagonMask[i]) {
        if (this.fireMask[i]) {
          display.setPixel(i, this.getFireColor(i));
        } else {
          display.setPixel(i, this.wagonGrey);
        }
      }
    }

    if (this.gameState !== "PLAY") return;
    
    // Don't update hazards until train is moving
    if (!isTrainMoving) return;

    // Gameplay only in PLAY after countdown
    this.updateTunnel();
    this.updateFire();

    // Check continuous key presses for joystick support
    checkContinuousKeys();

    tickJumpTimer(playerOne);

    tickTrackSurvival(playerOne);

    applyTunnelHazard(playerOne);
    applyTreeHazard(playerOne);
    applyFireHazard(playerOne);

    if (player2Enabled) {
      tickJumpTimer(playerTwo);
      tickTrackSurvival(playerTwo);
      applyTunnelHazard(playerTwo);
      applyTreeHazard(playerTwo);
      applyFireHazard(playerTwo);
    }
  }
}

/* ---------------- Timers / Survival ---------------- */

function tickJumpTimer(player) {
  if (player.isAirborne) {
    player.airborneFramesLeft--;
    if (player.airborneFramesLeft <= 0) {
      player.isAirborne = false;
      player.airborneFramesLeft = 0;
      // Play landing sound
      if (typeof playSoundSafe === 'function' && typeof soundPlayerLand !== 'undefined') {
        playSoundSafe(soundPlayerLand);
      }
    }
  }
}

function killPlayerAndConsumeLife(player) {
  if (player.isDead) return;
  
  const playerName = (player === playerOne) ? "Player 1 (Red)" : "Player 2 (Blue)";
  console.log(`💀 ${playerName} DIED at frame ${frameCount}, position ${player.position}, mode ${player.mode}`);
  
  // Play death sound
  if (typeof playSoundSafe === 'function' && typeof soundPlayerDeath !== 'undefined') {
    playSoundSafe(soundPlayerDeath);
  }
  
  // Guardar la posición donde murió
  player.deathPosition = player.position;

  player.lives = max(0, player.lives - 1);

  player.isDead = true;
  player.deadFramesLeft = controller.respawnFrames;

  player.isAirborne = false;
  player.airborneFramesLeft = 0;

  if (player.lives <= 0) {
    controller.gameState = "GAME_OVER";
    // Stop train sound on game over
    if (typeof stopSoundSafe === 'function' && typeof soundTrainMoving !== 'undefined') {
      stopSoundSafe(soundTrainMoving);
    }
  }
}

function tickTrackSurvival(player) {
  if (controller.gameState !== "PLAY") return;

  if (player.isDead) {
    player.deadFramesLeft--;
    if (player.deadFramesLeft <= 0) {
      if (player.lives > 0) {
        // Check if any safe wagon pixel exists before respawning
        if (controller.randomWagonIndex(null) === -1) {
          controller.gameState = "GAME_OVER";
          return;
        }
        // Respawnear en la posición donde murió si es posible
        controller.spawnPlayerOnWagon(player, null, player.deathPosition);
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
  
  // Check invulnerability
  if (frameCount < player.invulnerableUntil) return;

  if (!controller.tunnelCoversIndex(player.position)) return;

  // LÓGICA DEL TÚNEL:
  // - Si estás en un VAGÓN → MUERES (el túnel te golpea)
  // - Si estás en TRACK (vías/gap) → SOBREVIVES (estás agachado, el túnel pasa por encima)
  
  if (player.mode === "WAGON") {
    killPlayerAndConsumeLife(player);
    return;
  }
  
  // Si estás en TRACK (incluyendo gaps), sobrevives automáticamente
  // NO necesitas presionar DOWN porque ya estás agachado por estar en las vías
}

/* ---------------- Tree hazard (similar to tunnel) ---------------- */

function applyTreeHazard(player) {
  if (controller.gameState !== "PLAY") return;
  if (player.isDead) return;
  
  // if you're jumping, you should not collide with trees
  if (player.isAirborne) return;

  // Check invulnerability
  if (frameCount < player.invulnerableUntil) return;

  // Verificar si el jugador está en un píxel con árbol
  if (!treeCoversIndex(player.position)) return;
  
  const playerName = (player === playerOne) ? "Player 1" : "Player 2";
  console.log(`🌲 ${playerName} hit by tree at position ${player.position}`);

  // Si está en un vagón (WAGON), pierde vida
  if (player.mode === "WAGON") {
    killPlayerAndConsumeLife(player);
    return;
  }

  // Si está en la vía (TRACK), debe estar presionando DOWN para sobrevivir
  const framesSinceDown = frameCount - (player.lastDownFrame ?? 999999);
  if (framesSinceDown > controller.tapWindowFrames) {
    killPlayerAndConsumeLife(player);
  }
}

/* ---------------- Fire hazard ---------------- */

function applyFireHazard(player) {
  if (controller.gameState !== "PLAY") return;
  if (player.isDead) return;
  if (player.isAirborne) return;
  if (frameCount < player.invulnerableUntil) return;
  if (!controller.fireMask[player.position]) return;

  killPlayerAndConsumeLife(player);
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
    if (dir === 1 && controller.rightEdge[pos]) return;

    const next = wrapIndex(pos + dir);
    if (controller.wagonMask[next]) {
      player.position = next;
      // Play movement sound
      if (typeof playSoundSafe === 'function' && typeof soundPlayerMove !== 'undefined') {
        playSoundSafe(soundPlayerMove);
      }
    }
    return;
  }

  if (player.mode === "TRACK") {
    const next = wrapIndex(pos + dir);
    if (!controller.wagonMask[next]) {
      player.position = next;
      // Play movement sound
      if (typeof playSoundSafe === 'function' && typeof soundPlayerMove !== 'undefined') {
        playSoundSafe(soundPlayerMove);
      }
    }
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
    // Play duck/drop sound
    if (typeof playSoundSafe === 'function' && typeof soundPlayerDuck !== 'undefined') {
      playSoundSafe(soundPlayerDuck);
    }
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
      // Play jump sound (jump from track to wagon)
      if (typeof playSoundSafe === 'function' && typeof soundPlayerJump !== 'undefined') {
        playSoundSafe(soundPlayerJump);
      }
      return;
    }
    if (controller.wagonMask[right]) {
      player.position = right;
      player.mode = "WAGON";
      // Play jump sound (jump from track to wagon)
      if (typeof playSoundSafe === 'function' && typeof soundPlayerJump !== 'undefined') {
        playSoundSafe(soundPlayerJump);
      }
      return;
    }
    return;
  }

  // Jump on top of wagon (invisible)
  if (player.mode === "WAGON") {
    player.isAirborne = true;
    player.airborneFramesLeft = controller.jumpFrames;
    // Play jump sound (jump on top of wagon)
    if (typeof playSoundSafe === 'function' && typeof soundPlayerJump !== 'undefined') {
      playSoundSafe(soundPlayerJump);
    }
  }
}

/* ---------------- Keyboard Controls ---------------- */

// Track which keys were pressed in previous frame (to detect new presses)
let prevKeysDown = {
  a: false, d: false, s: false, w: false,
  j: false, l: false, k: false, i: false
};

// Frame counters for movement repeat debounce
let moveHeldFrames = { a: 0, d: 0, j: 0, l: 0 };

// Check continuous key presses (for joystick support)
function checkContinuousKeys() {
  if (controller.gameState !== "PLAY") return;
  
  // Player 1 - Movement (A/D) fires on first press, then repeats every MOVE_REPEAT_FRAMES
  if (keyIsDown(65)) { // A
    if (moveHeldFrames.a === 0) tryMoveSide(playerOne, -1);
    moveHeldFrames.a = (moveHeldFrames.a + 1) % MOVE_REPEAT_FRAMES;
  } else {
    moveHeldFrames.a = 0;
  }

  if (keyIsDown(68)) { // D
    if (moveHeldFrames.d === 0) tryMoveSide(playerOne, 1);
    moveHeldFrames.d = (moveHeldFrames.d + 1) % MOVE_REPEAT_FRAMES;
  } else {
    moveHeldFrames.d = 0;
  }
  
  // S needs to be called every frame while held (for survival)
  if (keyIsDown(83)) { // S
    handleDownPress(playerOne);
  }
  
  // W needs to be triggered once per press
  if (keyIsDown(87)) { // W
    if (!prevKeysDown.w) tryJump(playerOne);
    prevKeysDown.w = true;
  } else {
    prevKeysDown.w = false;
  }
  
  // Player 2 - Movement (J/L) fires on first press, then repeats every MOVE_REPEAT_FRAMES
  if (keyIsDown(74)) { // J
    if (moveHeldFrames.j === 0) tryMoveSide(playerTwo, -1);
    moveHeldFrames.j = (moveHeldFrames.j + 1) % MOVE_REPEAT_FRAMES;
  } else {
    moveHeldFrames.j = 0;
  }

  if (keyIsDown(76)) { // L
    if (moveHeldFrames.l === 0) tryMoveSide(playerTwo, 1);
    moveHeldFrames.l = (moveHeldFrames.l + 1) % MOVE_REPEAT_FRAMES;
  } else {
    moveHeldFrames.l = 0;
  }
  
  // K needs to be called every frame while held (for survival)
  if (keyIsDown(75)) { // K
    handleDownPress(playerTwo);
  }
  
  // I needs to be triggered once per press
  if (keyIsDown(73)) { // I
    if (!prevKeysDown.i) tryJump(playerTwo);
    prevKeysDown.i = true;
  } else {
    prevKeysDown.i = false;
  }
}

function keyPressed() {
  // SPACE starts game
  if (controller.gameState === "START") {
    if (key === ' ') controller.startGame();
    return;
  }

  // Game over -> back to start
  if (controller.gameState === "GAME_OVER" || controller.gameState === "VICTORY") {
    if (key === 'R' || key === 'r') {
      controller.gameState = "START";
      controller.resetTunnelSchedule();
      controller.resetFireState();
    }
    return;
  }

  // Movement is handled entirely by checkContinuousKeys() in the game loop
  // to avoid double-firing (keyPressed + checkContinuousKeys on the same frame)
}
