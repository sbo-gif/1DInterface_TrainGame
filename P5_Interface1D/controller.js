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

// FPS assumption
let ASSUMED_FPS = 60;

// ===== TUNNEL TOGGLES =====
let TIME_UNTIL_TUNNEL = 10.0;
let TUNNEL_WARNING_SECONDS = 2.0;
let TUNNEL_WIDTH_PIXELS = 5;

// Tunnel speed (columns per second), moving RIGHT -> LEFT
let TUNNEL_SPEED_COLS_PER_SEC = 4.0; // Reducido a la mitad (antes era 8.0)

class Controller {
  constructor() {
    this.gameState = "START"; // START -> PLAY -> GAME_OVER

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

    playerOne.lives = STARTING_LIVES;
    playerTwo.lives = STARTING_LIVES;

    this.computeTrainLayout();
    this.spawnPlayerOnWagon(playerOne);
    this.spawnPlayerOnWagon(playerTwo, playerOne.position);

    // Schedule tunnel from now
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

  spawnPlayerOnWagon(player, avoidIndex = null, specificPosition = null) {
    // Si se especifica una posición, usarla; si no, elegir aleatoria
    if (specificPosition !== null && controller.wagonMask[specificPosition]) {
      player.position = specificPosition;
    } else {
      player.position = this.randomWagonIndex(avoidIndex);
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

  update() {
    // Always draw wagons row (even on START/GAME_OVER)
    this.computeTrainLayout();
    display.setAllPixels(null);
    for (let i = 0; i < displaySize; i++) {
      if (this.wagonMask[i]) display.setPixel(i, this.wagonGrey);
    }

    if (this.gameState !== "PLAY") return;

    // Gameplay only in PLAY
    this.updateTunnel();
    
    // Check continuous key presses for joystick support
    checkContinuousKeys();

    tickJumpTimer(playerOne);
    tickJumpTimer(playerTwo);

    tickTrackSurvival(playerOne);
    tickTrackSurvival(playerTwo);

    applyTunnelHazard(playerOne);
    applyTunnelHazard(playerTwo);
    
    // Todos los árboles son obstáculos
    applyTreeHazard(playerOne);
    applyTreeHazard(playerTwo);
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
  
  const playerName = (player === playerOne) ? "Player 1 (Red)" : "Player 2 (Blue)";
  console.log(`💀 ${playerName} DIED at frame ${frameCount}, position ${player.position}, mode ${player.mode}`);
  
  // Guardar la posición donde murió
  player.deathPosition = player.position;

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

  // Jump on top of wagon (invisible)
  if (player.mode === "WAGON") {
    player.isAirborne = true;
    player.airborneFramesLeft = controller.jumpFrames;
  }
}

/* ---------------- Keyboard Controls ---------------- */

// Track which keys were pressed in previous frame (to detect new presses)
let prevKeysDown = {
  a: false, d: false, s: false, w: false,
  j: false, l: false, k: false, i: false
};

// Check continuous key presses (for joystick support)
function checkContinuousKeys() {
  if (controller.gameState !== "PLAY") return;
  
  // Player 1 - Movement (A/D) needs to be triggered once per press
  if (keyIsDown(65)) { // A
    if (!prevKeysDown.a) tryMoveSide(playerOne, -1);
    prevKeysDown.a = true;
  } else {
    prevKeysDown.a = false;
  }
  
  if (keyIsDown(68)) { // D
    if (!prevKeysDown.d) tryMoveSide(playerOne, 1);
    prevKeysDown.d = true;
  } else {
    prevKeysDown.d = false;
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
  
  // Player 2 - Movement (J/L) needs to be triggered once per press
  if (keyIsDown(74)) { // J
    if (!prevKeysDown.j) tryMoveSide(playerTwo, -1);
    prevKeysDown.j = true;
  } else {
    prevKeysDown.j = false;
  }
  
  if (keyIsDown(76)) { // L
    if (!prevKeysDown.l) tryMoveSide(playerTwo, 1);
    prevKeysDown.l = true;
  } else {
    prevKeysDown.l = false;
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
  if (controller.gameState === "GAME_OVER") {
    if (key === 'R' || key === 'r') {
      controller.gameState = "START";
      controller.resetTunnelSchedule();
    }
    return;
  }

  // Player 1
  if (key === 'A' || key === 'a') tryMoveSide(playerOne, -1);
  if (key === 'D' || key === 'd') tryMoveSide(playerOne, 1);
  if (key === 'S' || key === 's') handleDownPress(playerOne);
  if (key === 'W' || key === 'w') tryJump(playerOne);

  // Player 2
  if (key === 'J' || key === 'j') tryMoveSide(playerTwo, -1);
  if (key === 'L' || key === 'l') tryMoveSide(playerTwo, 1);
  if (key === 'K' || key === 'k') handleDownPress(playerTwo);
  if (key === 'I' || key === 'i') tryJump(playerTwo);
}
