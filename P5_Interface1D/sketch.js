// sketch.js

let displaySize = 30;
// pixelSize is computed in setup() to fill the window
let pixelSize = 25;

let playerOne;
let playerTwo;

let display;
let controller;

// Sound effects - Environment
let soundTrainMoving;
let soundTunnelWarning;
let soundFireWarning;
let soundPlayerDeath;
let soundVictory;

// Sound effects - Player actions
let soundPlayerMove;
let soundPlayerJump;
let soundPlayerDuck;
let soundPlayerLand;
let soundsLoaded = false;

// Choose to be a 1- or 2-player game
let player2Enabled = false;  // 🔁 CHANGE TO false for 1-player mode

// Track animation (runs even on START screen)
let sleeperOffset = 0;
let sleeperSpeed = 1.5; // Reducido a la mitad (antes era 3)

// Mini-map progress (fictitious distance)
let mapProgress = 0; // 0 to 1 (0 = start station, 1 = end station)
let mapProgressSpeed = 0.00048; // Speed adjusted for ~35 second game

// Station building positions
let stationBuildingX = 0; // Start station X (starts centered, scrolls left)
let endStationX = 0;      // End station scroll offset (scrolls in from right)
// endStationAppearProgress is computed in setup() so the station
// arrives centered on screen exactly when mapProgress reaches 1.0
let endStationAppearProgress = 0.90;
// Start station: same width as end station, begins centered
let startStationCenterX = 0; // computed in setup()

// Game start countdown (train waits at station)
let gameStartCountdown = 3.0; // seconds to wait before train starts moving
let isTrainMoving = false;

// Toggles
let showCenterTrack = true;
let playerIconShape = "square"; // "square" or "circle"

// Bridge shadow: percent of screen (centered) where shadow is invisible
let SHADOW_INVISIBLE_PERCENT = 10; // e.g. 10 => invisible in center ±5%

// Track colors
let TRACK_COLORS = {
  rail: null,
  sleeper: null,
  background: null
};

let TRACK_STYLE = {
  railThicknessPx: null,
  sleeperWidthPx: null,
  sleeperOverhangPx: null,
  sleeperStridePx: null
};

// Árboles/vegetación
let trees = [];
let treeOffset = 0;

// Preload function to load sound files
function preload() {
  // Environment sounds - ✅ AVAILABLE NOW
  soundFireWarning = loadSound('sounds/fire.mp3');       // ✅ You have this!
  soundPlayerDeath = loadSound('sounds/pixel-die.mp3');  // ✅ You have this!
  
  // Player action sounds - ✅ AVAILABLE NOW
  soundPlayerJump = loadSound('sounds/pixel-jump.mp3');  // ✅ You have this!
  
  // Environment sounds - ⏳ TO DO LATER
  // soundTrainMoving = loadSound('sounds/train.mp3');
  // soundTunnelWarning = loadSound('sounds/warning.mp3');
  // soundVictory = loadSound('sounds/victory.mp3');
  
  // Player action sounds - ⏳ TO DO LATER
  // soundPlayerMove = loadSound('sounds/move.mp3');      // Lateral movement
  // soundPlayerDuck = loadSound('sounds/duck.mp3');      // Drop to tracks
  // soundPlayerLand = loadSound('sounds/land.mp3');      // Land from jump
}

// Helper functions to play sounds safely
function playSoundSafe(sound) {
  if (sound && sound.isLoaded()) {
    sound.play();
  }
}

function playSoundSafeLooped(sound) {
  if (sound && sound.isLoaded() && !sound.isPlaying()) {
    sound.loop();
  }
}

function stopSoundSafe(sound) {
  if (sound && sound.isLoaded() && sound.isPlaying()) {
    sound.stop();
  }
}

function setup() {
  // Fill the window while maintaining aspect ratio (displaySize : 20 = 3:2)
  const aspectRatio = displaySize / 20;
  if (windowWidth / windowHeight > aspectRatio) {
    // Window is wider — fit to height
    pixelSize = floor(windowHeight / 20);
  } else {
    // Window is taller — fit to width
    pixelSize = floor(windowWidth / displaySize);
  }
  createCanvas(displaySize * pixelSize, pixelSize * 20);

  display = new Display(displaySize, pixelSize);

  playerOne = new Player(color(255, 0, 0), 0, displaySize);
  playerTwo = new Player(color(0, 0, 255), 0, displaySize);

  controller = new Controller();

  // Track colors
  TRACK_COLORS.rail = color(0);
  TRACK_COLORS.sleeper = color(120, 90, 20); // Marrón original
  TRACK_COLORS.background = color(40, 70, 45); // Verde bosque oscuro

  // Track geometry
  TRACK_STYLE.railThicknessPx = max(3, pixelSize * 0.12);
  TRACK_STYLE.sleeperWidthPx = pixelSize * 0.95;
  TRACK_STYLE.sleeperOverhangPx = pixelSize * 0.55;
  TRACK_STYLE.sleeperStridePx = pixelSize * 2;

  // Inicializar árboles
  initializeTrees();

  // Start station begins centered on screen
  const stationW = width * 0.5;
  startStationCenterX = (width - stationW) / 2; // centered
  stationBuildingX = startStationCenterX; // set initial position

  // Calculate when end station should appear so it arrives centered at mapProgress=1.0
  // Station starts at (width + pixelSize*2), needs to reach startStationCenterX (centered)
  const stationScrollDist = (width + pixelSize * 2) - startStationCenterX;
  const framesNeeded = stationScrollDist / sleeperSpeed;
  const progressNeeded = framesNeeded * mapProgressSpeed;
  endStationAppearProgress = max(0.5, 1.0 - progressNeeded);

  // Ensure layout exists for drawing wagons row even on START
  controller.computeTrainLayout();
}

function windowResized() {
  const aspectRatio = displaySize / 20;
  if (windowWidth / windowHeight > aspectRatio) {
    pixelSize = floor(windowHeight / 20);
  } else {
    pixelSize = floor(windowWidth / displaySize);
  }
  resizeCanvas(displaySize * pixelSize, pixelSize * 20);

  // Update display's cached pixelSize
  display.pixelSize = pixelSize;

  // Recalculate track geometry
  TRACK_STYLE.railThicknessPx = max(3, pixelSize * 0.12);
  TRACK_STYLE.sleeperWidthPx = pixelSize * 0.95;
  TRACK_STYLE.sleeperOverhangPx = pixelSize * 0.55;
  TRACK_STYLE.sleeperStridePx = pixelSize * 2;

  // Recalculate station positions
  const stationW = width * 0.5;
  startStationCenterX = (width - stationW) / 2;
  const stationScrollDist = (width + pixelSize * 2) - startStationCenterX;
  const framesNeeded = stationScrollDist / sleeperSpeed;
  const progressNeeded = framesNeeded * mapProgressSpeed;
  endStationAppearProgress = max(0.5, 1.0 - progressNeeded);

  // Reinitialize trees for new dimensions
  initializeTrees();
}

function draw() {
  // Fondo degradado de bosque pixelado
  drawForestBackground();

  // Track animation always running (but paused during countdown)
  if (controller.gameState === "PLAY" && isTrainMoving) {
    sleeperOffset = (sleeperOffset + sleeperSpeed) % (pixelSize * 2);
    treeOffset = treeOffset + sleeperSpeed;
  }

  // Place the track/train row higher to leave room for instructions
  const yCenter = height * 0.5;
  const yPlayable = yCenter - pixelSize / 2;

  // Background trees (visual only) - todos a la misma velocidad
  drawTreeLayer(yCenter, 'far', 1.0, 0.35);     // Misma velocidad, más transparentes
  drawTreeLayer(yCenter, 'mid', 1.0, 0.55);     // Misma velocidad, opacidad media
  drawTreeLayer(yCenter, 'close', 1.0, 0.75);   // Misma velocidad, más opacos

  if (showCenterTrack) drawFatCenterTrackBand(yCenter, sleeperOffset);

  // Draw station buildings (background scenery, above the track)
  // Visible on START (centered), PLAY (scrolling), and VICTORY
  drawStationBuilding(yCenter);
  drawEndStationBuilding(yCenter);

  // Controller draws wagons row (and gameplay if in PLAY)
  controller.update();

  // Fire glow overlay (behind the 1D pixel strip, only during play)
  if (controller.gameState === "PLAY") {
    drawFireOverlay(yPlayable);
  }

  display.show(yPlayable);

  if (controller.gameState === "PLAY") {
    drawPlayerIcon(playerOne, yPlayable);
    if (player2Enabled){
      drawPlayerIcon(playerTwo, yPlayable);
    }

     // Dibujar árboles grandes DESPUÉS del tren (primer plano) - cubren las vías
    drawTreeLayer(yCenter, 'foreground', 1.0, 1.0); // Primer plano - 100% velocidad, opacidad total

    if (controller.tunnelActive) drawTunnelOverlay(yCenter);
    if (controller.isTunnelWarning()) {
      drawWarningText();
      // Play tunnel warning sound (only once)
      if (frameCount === controller.tunnelWarnFrame) {
        playSoundSafe(soundTunnelWarning);
      }
    }
    if (controller.isFireWarning()) {
      drawFireWarningText();
      // Play fire warning sound (only once)
      const fireWarnFrame = controller.fireStartFrame - floor(TUNNEL_WARNING_SECONDS * ASSUMED_FPS);
      if (frameCount === fireWarnFrame) {
        playSoundSafe(soundFireWarning);
      }
    }

    drawLivesUI();
    
    // Mostrar mensaje de respawn
    if (playerOne.isDead && playerOne.lives > 0) {
      drawRespawnMessage(playerOne, "Player 1");
    }
    if (playerTwo.isDead && playerTwo.lives > 0) {
      drawRespawnMessage(playerTwo, "Player 2");
    }
    
    // Check countdown (dibujado AL FINAL para estar encima de todo)
    if (!isTrainMoving) {
      const elapsedSeconds = (frameCount - controller.gameStartFrame) / 60;
      if (elapsedSeconds >= gameStartCountdown) {
        isTrainMoving = true;
        // Give fresh 3-second invulnerability now that hazards are live
        // (spawn-time invulnerability has already expired during the countdown)
        playerOne.invulnerableUntil = frameCount + 180;
        if (player2Enabled) playerTwo.invulnerableUntil = frameCount + 180;
        // Play train moving sound when train starts
        playSoundSafeLooped(soundTrainMoving);
      } else {
        // Draw countdown message
        drawCountdownMessage(gameStartCountdown - elapsedSeconds);
      }
    }
  }

 

  if (controller.gameState === "START") {
    drawStartScreenOverlay();
  }

  if (controller.gameState === "GAME_OVER") {
    drawLivesUI();
    drawMiniMap(); // Show progress even after game over
    drawGameOver();
  }

  // Draw mini-map (always visible during play)
  if (controller.gameState === "PLAY") {
    // Only progress if train is moving
    if (isTrainMoving) {
      mapProgress += mapProgressSpeed;
      // Move station building to the left (same speed as sleepers/track)
      stationBuildingX -= sleeperSpeed;
      
      // Move end station from right to left (same speed as trees)
      // Only start scrolling once the station should appear
      if (mapProgress >= endStationAppearProgress) {
        endStationX -= sleeperSpeed;
      }
    }
    
    // Check if reached the end
    if (mapProgress >= 1.0) {
      controller.gameState = "VICTORY";
      mapProgress = 1.0;
      // Play victory sound
      stopSoundSafe(soundTrainMoving);
      playSoundSafe(soundVictory);
    }
    
    drawMiniMap();
  }
  
  if (controller.gameState === "VICTORY") {
    drawMiniMap();
    drawVictoryScreen();
  }
}

/* ---------------- Start screen ---------------- */

function drawStartScreenOverlay() {
  // Fondo degradado dramático (amarillo/naranja/rojo como el póster)
  noStroke();
  const numBands = 40;
  const bandHeight = height / numBands;
  
  for (let i = 0; i < numBands; i++) {
    const t = i / numBands;
    let r, g, b;
    
    if (t < 0.3) {
      // Parte superior: amarillo brillante
      r = lerp(255, 255, t / 0.3);
      g = lerp(220, 180, t / 0.3);
      b = lerp(50, 20, t / 0.3);
    } else if (t < 0.7) {
      // Parte media: naranja
      const tMid = (t - 0.3) / 0.4;
      r = lerp(255, 220, tMid);
      g = lerp(180, 100, tMid);
      b = lerp(20, 10, tMid);
    } else {
      // Parte inferior: rojo oscuro
      const tBot = (t - 0.7) / 0.3;
      r = lerp(220, 140, tBot);
      g = lerp(100, 40, tBot);
      b = lerp(10, 10, tBot);
    }
    
    fill(r, g, b);
    rect(0, i * bandHeight, width, bandHeight);
  }
  
  // Resplandor circular con gradiente (como la imagen de referencia)
  const glowCenterX = width / 2;
  const glowCenterY = height * 0.5;
  const maxRadius = height * 0.45;
  const numCircles = 30;
  
  for (let i = numCircles; i > 0; i--) {
    const t = i / numCircles;
    const radius = maxRadius * t;
    
    // Gradiente: amarillo brillante en el centro → naranja en el exterior
    let r, g, b, a;
    if (t < 0.3) {
      // Centro: amarillo muy brillante
      r = 255;
      g = 250;
      b = 150;
      a = 80;
    } else if (t < 0.6) {
      // Medio: amarillo a naranja
      const tMid = (t - 0.3) / 0.3;
      r = 255;
      g = lerp(250, 180, tMid);
      b = lerp(150, 60, tMid);
      a = lerp(80, 50, tMid);
    } else {
      // Exterior: naranja oscuro
      const tOut = (t - 0.6) / 0.4;
      r = lerp(255, 220, tOut);
      g = lerp(180, 120, tOut);
      b = lerp(60, 30, tOut);
      a = lerp(50, 20, tOut);
    }
    
    fill(r, g, b, a);
    ellipse(glowCenterX, glowCenterY, radius * 2, radius * 2);
  }
  
  // Silueta de persona cayendo (MÁS PEQUEÑA Y MÁS TORCIDA, DE LADO)
  fill(0);
  const centerX = width / 2;
  const centerY = height * 0.5;
  const ps = pixelSize * 0.4; // Mucho más pequeño
  
  // Persona más horizontal/de lado (como cayendo de lado)
  
  // CABEZA (más hacia la izquierda y arriba)
  rect(centerX - ps * 4, centerY - ps * 2.5, ps * 2.5, ps * 2.5);
  
  // CUELLO (horizontal)
  rect(centerX - ps * 1.8, centerY - ps * 2, ps * 1, ps * 0.8);
  
  // TORSO (horizontal/diagonal)
  rect(centerX - ps * 1.2, centerY - ps * 2.5, ps * 4.5, ps * 3);
  
  // BRAZO IZQUIERDO (arriba, doblado hacia atrás)
  rect(centerX - ps * 1.5, centerY - ps * 4.5, ps * 1.4, ps * 2);
  rect(centerX - ps * 2.5, centerY - ps * 6, ps * 1.3, ps * 1.8);
  rect(centerX - ps * 3.5, centerY - ps * 7.2, ps * 1.5, ps * 1.5);
  
  // BRAZO DERECHO (extendido hacia adelante/derecha)
  rect(centerX + ps * 3.3, centerY - ps * 2, ps * 2, ps * 1.3);
  rect(centerX + ps * 5, centerY - ps * 1.5, ps * 2, ps * 1.2);
  rect(centerX + ps * 6.8, centerY - ps * 1.2, ps * 1.5, ps * 1.4);
  
  // PIERNA IZQUIERDA (doblada hacia atrás/arriba)
  rect(centerX + ps * 0.5, centerY + ps * 0.5, ps * 1.6, ps * 2);
  rect(centerX + ps * 0.2, centerY + ps * 2.2, ps * 1.4, ps * 2);
  rect(centerX - ps * 0.5, centerY + ps * 3.8, ps * 1.8, ps * 1.2);
  
  // PIERNA DERECHA (extendida hacia adelante/abajo)
  rect(centerX + ps * 2.5, centerY + ps * 0.2, ps * 1.6, ps * 2.5);
  rect(centerX + ps * 3.5, centerY + ps * 2.5, ps * 1.4, ps * 2.2);
  rect(centerX + ps * 4.2, centerY + ps * 4.5, ps * 1.8, ps * 1.2);
  
  // Texto principal estilo póster
  fill(255, 220, 0); // Amarillo brillante
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  
  textSize(pixelSize * 1.6);
  text("Train surfing", width / 2, height * 0.12);
  textSize(pixelSize * 1.8);
  text("kills.", width / 2, height * 0.19);
  
  // Instrucción para empezar
  fill(255, 255, 255, 200);
  textSize(pixelSize * 0.55);
  text("Press SPACE to start", width / 2, height * 0.86);
  
  // TRES VAGONES con diseño profesional
  const wagonCount = 3;
  const totalGaps = wagonCount - 1;
  const availableWidth = width * 0.7;
  const gapSize = pixelSize * 0.8;
  const wagonWidth = (availableWidth - (totalGaps * gapSize)) / wagonCount;
  const wagonHeight = pixelSize * 2.2;
  const wagonY = height * 0.905;
  const startX = (width - availableWidth) / 2;
  
  for (let i = 0; i < wagonCount; i++) {
    const wagonX = startX + i * (wagonWidth + gapSize);
    
    // Cuerpo principal del vagón (gris oscuro metálico)
    fill(75, 75, 80);
    rect(wagonX, wagonY, wagonWidth, wagonHeight);
    
    // Techo del vagón (más oscuro)
    fill(60, 60, 65);
    rect(wagonX, wagonY - pixelSize * 0.4, wagonWidth, pixelSize * 0.4);
    
    // Base/ruedas del vagón (más oscuro)
    fill(55, 55, 60);
    rect(wagonX, wagonY + wagonHeight - pixelSize * 0.35, wagonWidth, pixelSize * 0.35);
    
    // Ventanas (3 por vagón, bien espaciadas)
    fill(45, 50, 55);
    const windowWidth = wagonWidth * 0.22;
    const windowHeight = wagonHeight * 0.5;
    const windowY = wagonY + wagonHeight * 0.25;
    const windowSpacing = (wagonWidth - (3 * windowWidth)) / 4;
    
    for (let w = 0; w < 3; w++) {
      const windowX = wagonX + windowSpacing + w * (windowWidth + windowSpacing);
      rect(windowX, windowY, windowWidth, windowHeight);
      
      // Reflejos en ventanas (detalles sutiles)
      fill(70, 75, 80, 100);
      rect(windowX, windowY, windowWidth * 0.3, windowHeight * 0.3);
    }
    
    // Líneas de detalle (bandas metálicas)
    fill(85, 85, 90);
    rect(wagonX, wagonY + wagonHeight * 0.15, wagonWidth, pixelSize * 0.15);
    rect(wagonX, wagonY + wagonHeight * 0.78, wagonWidth, pixelSize * 0.15);
    
    // Puerta (en el centro, diferente textura)
    fill(68, 68, 73);
    const doorWidth = wagonWidth * 0.28;
    const doorX = wagonX + (wagonWidth - doorWidth) / 2;
    rect(doorX, wagonY + wagonHeight * 0.2, doorWidth, wagonHeight * 0.65);
    
    // Detalle de puerta (línea central)
    fill(58, 58, 63);
    rect(doorX + doorWidth * 0.48, wagonY + wagonHeight * 0.2, pixelSize * 0.12, wagonHeight * 0.65);
    
    // Ruedas visibles
    fill(40, 40, 45);
    const wheelSize = pixelSize * 0.4;
    rect(wagonX + wagonWidth * 0.15, wagonY + wagonHeight - pixelSize * 0.2, wheelSize, wheelSize);
    rect(wagonX + wagonWidth * 0.75, wagonY + wagonHeight - pixelSize * 0.2, wheelSize, wheelSize);
  }
  
  textStyle(NORMAL);
}

/* ---------------- Player icon ---------------- */

function drawRespawnMessage(player, playerName) {
  const secondsLeft = (player.deadFramesLeft / 60).toFixed(1);
  
  fill(player.playerColor);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(pixelSize * 0.5);
  
  const yPos = playerName === "Player 1" ? pixelSize * 1.5 : pixelSize * 2.2;
  text(`${playerName} respawning in ${secondsLeft}s`, width / 2, yPos);
}

function drawPlayerIcon(player, yPlayable) {
  // Debug info
  if (frameCount % 60 === 0) {
    const playerName = (player === playerOne) ? "Player 1 (Red)" : "Player 2 (Blue)";
    console.log(playerName, {
      position: player.position,
      mode: player.mode,
      isDead: player.isDead,
      deadFramesLeft: player.deadFramesLeft,
      isAirborne: player.isAirborne,
      lives: player.lives,
      invulnerable: frameCount < player.invulnerableUntil,
      gameState: controller.gameState
    });
  }
  
  if (player.isDead || player.isAirborne) return;
  
  // Parpadeo durante invulnerabilidad
  if (frameCount < player.invulnerableUntil) {
    const blinkOn = (frameCount % 10) < 5; // Parpadeo rápido
    if (!blinkOn) return;
  }

  // Track survival blinking speeds up toward death
  if (player.mode === "TRACK") {
    const framesSinceDown = frameCount - (player.lastDownFrame ?? 0);
    const tapWindow = controller.tapWindowFrames;
    const deathAt = controller.deathAfterFrames;

    let period = BLINK_PERIOD_NORMAL;
    if (framesSinceDown > tapWindow) {
      const prog = constrain((framesSinceDown - tapWindow) / max(1, (deathAt - tapWindow)), 0, 1);
      period = floor(BLINK_PERIOD_NORMAL - prog * (BLINK_PERIOD_NORMAL - BLINK_PERIOD_PANIC_MIN));
      period = max(BLINK_PERIOD_PANIC_MIN, period);
    }

    const on = (frameCount % period) < (period / 2);
    if (!on) return;
  }

  const x0 = player.position * pixelSize;
  const y0 = yPlayable;

  noStroke();
  fill(player.playerColor);

  if (playerIconShape === "circle") {
    ellipse(x0 + pixelSize / 2, y0 + pixelSize / 2, pixelSize * 0.78, pixelSize * 0.78);
  } else {
    rect(x0, y0, pixelSize, pixelSize);
  }
}

/* ---------------- Tunnel overlay + warning ---------------- */
/* ---------------- Tunnel overlay + warning ---------------- */

function drawTunnelOverlay(yCenter) {
  const x = controller.tunnelX * pixelSize;
  const w = TUNNEL_WIDTH_PIXELS * pixelSize;

  // Track band references (so pillars avoid the playable area)
  const yPlayable = yCenter - pixelSize / 2;
  const trackTop = yPlayable - TRACK_STYLE.sleeperOverhangPx;
  const trackBottom = yPlayable + pixelSize + TRACK_STYLE.sleeperOverhangPx;

  // Highway proportions - más discreto
  const shoulderW = max(4, floor(w * 0.08)); // Bordes más delgados
  const roadX = x + shoulderW;
  const roadW = w - 2 * shoulderW;

  // --- VISIBILITY based on how off-center the bridge is ---
  const cx = x + w / 2;
  const distFromCenter = abs(cx - width / 2);

  // Pillars only near edges
  const start = width * 0.28;
  const end = width * 0.46;
  let pillarAlpha = (distFromCenter - start) / (end - start);
  pillarAlpha = constrain(pillarAlpha, 0, 1);

  // Inner side faces screen center
  const showInnerRightEdge = (cx < width / 2);

  // Shadow band (inner side) - más sutil
  const shadowW = pixelSize * 0.8; // Sombra más delgada
  const shadowX = showInnerRightEdge ? (x + w) : (x - shadowW);

  // clamp shadow so it doesn’t draw off-canvas
  const sx = constrain(shadowX, 0, width);
  const sw = constrain(shadowW, 0, width - sx);

  // --- shadow visibility toggle around center ---
  const invisibleHalfW = width * (SHADOW_INVISIBLE_PERCENT / 100) * 0.5;

  let shadowAlpha = pillarAlpha;
  if (distFromCenter < invisibleHalfW) {
    shadowAlpha = 0;
  } else {
    const start2 = invisibleHalfW;
    const end2 = width * 0.46;
    shadowAlpha = (distFromCenter - start2) / (end2 - start2);
    shadowAlpha = constrain(shadowAlpha, 0, 1);
  }

  // Sombra más discreta
  if (shadowAlpha > 0.001 && sw > 0.5) {
    noStroke();
    fill(40, 55, 45, 90 * shadowAlpha); // Sombra más sutil
    rect(sx, 0, sw, height);
  }

  // 1) Road deck - colores más apagados
  noStroke();
  fill(95, 95, 90); // Gris más apagado y verdoso
  rect(roadX, 0, roadW, height);

  // 2) Bordes muy sutiles
  fill(70, 70, 68); // Bordes apenas visibles
  const railW = max(2, floor(roadW * 0.03));
  rect(roadX, 0, railW, height);
  rect(roadX + roadW - railW, 0, railW, height);

  // 3) Bordes laterales - tonos tierra apagados (en lugar de rojo brillante)
  fill(85, 75, 65); // Marrón grisáceo
  rect(x, 0, shoulderW, height);
  rect(x + w - shoulderW, 0, shoulderW, height);

  // 4) Marcas sutiles en bordes (en lugar de bloques blancos brillantes)
  const blockH = pixelSize * 1.2;
  const gapH = pixelSize * 0.6;
  const stride = blockH + gapH;

  for (let yy = 0; yy < height + stride; yy += stride) {
    fill(105, 100, 92, 180); // Color crema muy apagado, semi-transparente
    rect(x + shoulderW * 0.2, yy + blockH * 0.4, shoulderW * 0.6, blockH * 0.4);
    rect(x + w - shoulderW * 0.8, yy + blockH * 0.4, shoulderW * 0.6, blockH * 0.4);
  }

  // 5) Línea central muy sutil (casi invisible)
  const dashW = max(2, floor(roadW * 0.08));
  const dashX = roadX + roadW / 2 - dashW / 2;
  const dashH = pixelSize * 1.0;
  const dashGap = pixelSize * 1.2;

  fill(115, 115, 110, 120); // Línea muy sutil y semi-transparente
  for (let yy = 0; yy < height + dashH; yy += dashH + dashGap) {
    rect(dashX, yy, dashW, dashH);
  }

  // Highlight muy sutil
  fill(105, 105, 100, 15);
  rect(roadX, 0, roadW, pixelSize * 0.25);

  // Pilares más discretos
  if (shadowAlpha > 0.001) {
    const dir = showInnerRightEdge ? 1 : -1;

    const edgeX = showInnerRightEdge ? (x + w) : x;

    const maxLen = pixelSize * 1.5;         // Más cortos
    const minLen = pixelSize * 0.6;
    const bracketLen = lerp(minLen, maxLen, shadowAlpha);

    const bracketH = pixelSize * 0.45; // Más delgados

    const pillarClearance = pixelSize * 3.5;

    const baseTopY = (trackTop - pillarClearance) - bracketH;
    const baseBotY = (trackBottom + pillarClearance);

    const offsets = [-pixelSize * 2.0, 0, pixelSize * 2.0];

    for (const dy of offsets) {
      drawBridgePillar(edgeX, baseTopY + dy, bracketLen, bracketH, shadowAlpha * 0.6, showInnerRightEdge); // Reducida opacidad
      drawBridgePillar(edgeX, baseBotY + dy, bracketLen, bracketH, shadowAlpha * 0.6, showInnerRightEdge);
    }
  }
}

function drawBridgePillar(edgeX, y, lenX, thickY, alpha01, innerRightEdge) {
  const dir = innerRightEdge ? 1 : -1;
  const px = innerRightEdge ? edgeX : (edgeX - lenX);

  noStroke();

  // Sombra más sutil
  fill(0, 20 * alpha01);
  rect(px + dir * (pixelSize * 0.1), y + thickY * 0.5, lenX, thickY * 0.5, 1);

  // Pilar color concreto apagado
  fill(120, 120, 115, 255 * alpha01); // Gris verdoso apagado
  rect(px, y, lenX, thickY, 1);

  // Sombra inferior sutil
  fill(95, 95, 90, 255 * alpha01);
  rect(px, y + thickY * 0.6, lenX, thickY * 0.4, 1);
}

function drawWarningText() {
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(pixelSize * 0.65);
  text("warning: tunnel", width / 2, pixelSize * 0.9);
}

function drawFireWarningText() {
  fill(255, 100, 0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(pixelSize * 0.65);
  text("warning: fire approaching", width / 2, pixelSize * 1.6);
}

function drawFireOverlay(yPlayable) {
  for (let i = 0; i < displaySize; i++) {
    if (controller.fireMask[i]) {
      const flicker = sin(frameCount * 0.1 + i * 1.3);
      const alpha = map(flicker, -1, 1, 30, 80);
      noStroke();
      fill(255, 120, 0, alpha);
      rect(i * pixelSize - pixelSize * 0.2, yPlayable - pixelSize * 0.3, pixelSize * 1.4, pixelSize * 1.6);
    }
  }
}

/* ---------------- Lives UI + game over ---------------- */

function drawLivesUI() {
  const pad = pixelSize * 0.6;
  const box = pixelSize * 0.55;
  const gap = pixelSize * 0.25;

  drawLifeRow(pad, pad, playerOne.playerColor, playerOne.lives);

  const totalWidth = STARTING_LIVES * box + (STARTING_LIVES - 1) * gap;
  if (player2Enabled) {
    drawLifeRow(width - pad - totalWidth, pad, playerTwo.playerColor, playerTwo.lives);
  }
}

function drawLifeRow(x, y, c, livesLeft) {
  const box = pixelSize * 0.55;
  const gap = pixelSize * 0.25;

  noStroke();
  fill(230);
  for (let i = 0; i < STARTING_LIVES; i++) rect(x + i * (box + gap), y, box, box);

  fill(c);
  for (let i = 0; i < livesLeft; i++) rect(x + i * (box + gap), y, box, box);
}

function drawGameOver() {
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(pixelSize * 0.7);
  text("GAME OVER (press R)", width / 2, pixelSize * 1.4);
}

function drawVictoryScreen() {
  // Semi-transparent overlay so station shows through
  fill(0, 0, 0, 120);
  rect(0, 0, width, height);

  // Victory message
  fill(255, 220, 50); // Gold
  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(pixelSize * 1.2);
  text("YOU ARRIVED!", width / 2, height * 0.4);

  // Sub message
  fill(255, 255, 255);
  textSize(pixelSize * 0.6);
  text("You reached the destination station", width / 2, height * 0.5);

  // Restart instruction
  fill(255, 255, 255, 200);
  textSize(pixelSize * 0.5);
  text("Press R to restart", width / 2, height * 0.65);

  textStyle(NORMAL);
}

function drawCountdownMessage(secondsLeft) {
  // Semi-transparent overlay
  fill(0, 0, 0, 120);
  noStroke();
  rect(0, 0, width, height);
  
  // Countdown number
  fill(255, 220, 50); // Gold
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(pixelSize * 2);
  text(ceil(secondsLeft), width / 2, height * 0.4);
  
  // Message
  fill(255, 255, 255);
  textSize(pixelSize * 0.65);
  text("Train departing...", width / 2, height * 0.55);
  
  textStyle(NORMAL);
}

/* ---------------- Fondo de bosque pixelado ---------------- */

function drawForestBackground() {
  noStroke();
  
  // Crear un degradado vertical con bandas de colores del bosque
  // Colores inspirados en bosques pixelados: verdes oscuros, marrones, tonos naturales
  const numBands = 30;
  const bandHeight = height / numBands;
  
  for (let i = 0; i < numBands; i++) {
    const t = i / numBands;
    
    // Degradado de arriba (más claro) a abajo (más oscuro)
    // Top: Verde claro del follaje alto
    // Middle: Verde medio del bosque
    // Bottom: Verde muy oscuro/marrón del suelo del bosque
    let r, g, b;
    
    if (t < 0.3) {
      // Parte superior: verde follaje claro
      r = lerp(50, 45, t / 0.3);
      g = lerp(85, 75, t / 0.3);
      b = lerp(50, 45, t / 0.3);
    } else if (t < 0.7) {
      // Parte media: verde bosque medio
      const tMid = (t - 0.3) / 0.4;
      r = lerp(45, 35, tMid);
      g = lerp(75, 60, tMid);
      b = lerp(45, 40, tMid);
    } else {
      // Parte inferior: verde muy oscuro/suelo
      const tBot = (t - 0.7) / 0.3;
      r = lerp(35, 25, tBot);
      g = lerp(60, 45, tBot);
      b = lerp(40, 30, tBot);
    }
    
    // Agregar variación sutil para textura pixelada
    const noise = sin(i * 0.5 + frameCount * 0.01) * 3;
    
    fill(r + noise, g + noise, b + noise);
    rect(0, i * bandHeight, width, bandHeight);
  }
  
  // Agregar "manchas" de vegetación para textura
  drawForestTexture();
}

function drawForestTexture() {
  noStroke();
  
  // Manchas moderadas para textura - SOLO cerca de obstáculos
  randomSeed(42);
  
  // Manchas oscuras (moderadas)
  for (let i = 0; i < 50; i++) {
    const baseX = random(width * 2);
    const y = random(height);
    const size = random(pixelSize * 0.4, pixelSize * 1.5);
    
    let x = (baseX - treeOffset) % (width * 2);
    if (x < -pixelSize * 4) x += width * 2;
    
    // NUEVO: Solo dibujar si está cerca de un obstáculo
    if (!checkIfNearObstacle(baseX, treeOffset)) continue;
    
    const variant = floor(random(3));
    if (variant === 0) {
      fill(20, 40, 25, 50);
    } else if (variant === 1) {
      fill(15, 35, 30, 45);
    } else {
      fill(25, 45, 28, 48);
    }
    
    rect(x, y, size, size);
  }
  
  // Manchas de tono medio
  for (let i = 0; i < 35; i++) {
    const baseX = random(width * 2);
    const y = random(height);
    const size = random(pixelSize * 0.3, pixelSize * 1.0);
    
    let x = (baseX - treeOffset) % (width * 2);
    if (x < -pixelSize * 4) x += width * 2;
    
    // NUEVO: Solo dibujar si está cerca de un obstáculo
    if (!checkIfNearObstacle(baseX, treeOffset)) continue;
    
    const variant = floor(random(3));
    if (variant === 0) {
      fill(40, 75, 45, 40);
    } else if (variant === 1) {
      fill(35, 70, 50, 38);
    } else {
      fill(45, 80, 48, 42);
    }
    
    rect(x, y, size, size);
  }
  
  // Manchas claras brillantes (luz del sol)
  for (let i = 0; i < 25; i++) {
    const baseX = random(width * 2.5);
    const y = random(height * 0.5);
    const size = random(pixelSize * 0.3, pixelSize * 1.0);
    
    let x = (baseX - treeOffset) % (width * 2.5);
    if (x < -pixelSize * 4) x += width * 2.5;
    
    // NUEVO: Solo dibujar si está cerca de un obstáculo
    if (!checkIfNearObstacle(baseX, treeOffset)) continue;
    
    const variant = floor(random(4));
    if (variant === 0) {
      fill(80, 130, 75, 35);
    } else if (variant === 1) {
      fill(100, 150, 90, 30);
    } else if (variant === 2) {
      fill(120, 170, 110, 28);
    } else {
      fill(70, 115, 70, 38);
    }
    
    rect(x, y, size, size);
  }
  
  // Manchas pequeñas para textura fina
  for (let i = 0; i < 40; i++) {
    const baseX = random(width * 2);
    const y = random(height);
    const size = random(pixelSize * 0.2, pixelSize * 0.5);
    
    let x = (baseX - treeOffset) % (width * 2);
    if (x < -pixelSize * 4) x += width * 2;
    
    // NUEVO: Solo dibujar si está cerca de un obstáculo
    if (!checkIfNearObstacle(baseX, treeOffset)) continue;
    
    fill(random(20, 50), random(40, 90), random(30, 60), random(25, 45));
    rect(x, y, size, size);
  }
}

/* ---------------- Track band (sleepers behind, rails on top) ---------------- */

function drawFatCenterTrackBand(yCenter, offsetPx) {
  const yPlayable = yCenter - pixelSize / 2;

  const railT = TRACK_STYLE.railThicknessPx;
  const railTopY = yPlayable;
  const railBottomY = yPlayable + pixelSize - railT;

  const sleeperTop = yPlayable - TRACK_STYLE.sleeperOverhangPx;
  const sleeperH = pixelSize + 2 * TRACK_STYLE.sleeperOverhangPx;

  // Sleepers
  noStroke();
  fill(TRACK_COLORS.sleeper);
  const stride = TRACK_STYLE.sleeperStridePx;
  for (let x = -stride * 3; x < width + stride * 3; x += stride) {
    const sx = x - offsetPx;
    rect(sx, sleeperTop, TRACK_STYLE.sleeperWidthPx, sleeperH);
  }

  // Rails on top
  fill(TRACK_COLORS.rail);
  rect(0, railTopY, width, railT);
  rect(0, railBottomY, width, railT);
}

/* ---------------- Árboles/Vegetación ---------------- */

function initializeTrees() {
  trees = [];

  // PRIMERO: Crear árboles OBSTÁCULO sobre las vías (middle)
  // Reducido a 2 obstáculos, espaciados uniformemente para evitar agrupamiento
  const numMiddleTrees = 2;
  const obstaclePositions = []; // Guardar posiciones para crear clusters

  for (let i = 0; i < numMiddleTrees; i++) {
    let layer = 'foreground';
    let scale = random(2.0, 3.5);
    // Evenly spaced with jitter so trees are never too close together
    let baseX = width * 2 * (i + 1) / (numMiddleTrees + 1);
    let xPos = baseX + random(-width * 0.15, width * 0.15);

    trees.push({
      x: xPos,
      type: floor(random(6)),
      scale: scale,
      layer: layer,
      yPosition: 'middle',
      yOffset: 0, // Sin offset para obstáculos
      colorVariant: floor(random(4))
    });

    // Guardar posición del obstáculo
    obstaclePositions.push(xPos);
  }

  // SEGUNDO: Crear CLUSTERS de árboles alrededor de cada obstáculo
  for (let obstacleX of obstaclePositions) {
    // Radio del cluster alrededor del obstáculo
    const clusterRadius = pixelSize * 8;

    // Crear árboles en la capa FAR (fondo lejano) - MUY LEJOS de las vías
    const numFarInCluster = 4;
    for (let i = 0; i < numFarInCluster; i++) {
      let xOffset = random(-clusterRadius, clusterRadius);
      let yPos = (random() < 0.5) ? 'top' : 'bottom';
      let yOffset = random(pixelSize * 4, pixelSize * 10); // Lejos de las vías

      trees.push({
        x: obstacleX + xOffset,
        type: floor(random(6)),
        scale: random(0.5, 1.0),
        layer: 'far',
        yPosition: yPos,
        yOffset: yOffset,
        colorVariant: floor(random(4))
      });
    }

    // Crear árboles en la capa MID (medio) - DISTANCIA MEDIA
    const numMidInCluster = 3;
    for (let i = 0; i < numMidInCluster; i++) {
      let xOffset = random(-clusterRadius * 0.8, clusterRadius * 0.8);
      let yPos = (random() < 0.5) ? 'top' : 'bottom';
      let yOffset = random(pixelSize * 2, pixelSize * 6); // Distancia media

      trees.push({
        x: obstacleX + xOffset,
        type: floor(random(6)),
        scale: random(1.0, 1.6),
        layer: 'mid',
        yPosition: yPos,
        yOffset: yOffset,
        colorVariant: floor(random(4))
      });
    }

    // Crear árboles en la capa CLOSE (cercanos) - CERCA de las vías
    const numCloseInCluster = 2;
    for (let i = 0; i < numCloseInCluster; i++) {
      let xOffset = random(-clusterRadius * 0.6, clusterRadius * 0.6);
      let yPos = (random() < 0.5) ? 'top' : 'bottom';
      let yOffset = random(pixelSize * 0.5, pixelSize * 3); // Cerca de las vías

      trees.push({
        x: obstacleX + xOffset,
        type: floor(random(6)),
        scale: random(1.6, 2.3),
        layer: 'close',
        yPosition: yPos,
        yOffset: yOffset,
        colorVariant: floor(random(4))
      });
    }

    // Crear árboles en FOREGROUND (primer plano) - solo 1 por obstáculo
    const numForegroundInCluster = 1;
    for (let i = 0; i < numForegroundInCluster; i++) {
      let xOffset = random(-clusterRadius * 0.5, clusterRadius * 0.5);
      let yPos = (random() < 0.5) ? 'top' : 'bottom';
      let yOffset = random(pixelSize * 0.3, pixelSize * 5); // Variado

      trees.push({
        x: obstacleX + xOffset,
        type: floor(random(6)),
        scale: random(2.5, 3.8),
        layer: 'foreground',
        yPosition: yPos,
        yOffset: yOffset,
        colorVariant: floor(random(4))
      });
    }
  }

  // TERCERO: Añadir algunos árboles de relleno dispersos con variación vertical
  const numFillerFar = 5;
  for (let i = 0; i < numFillerFar; i++) {
    trees.push({
      x: random(width * 4),
      type: floor(random(6)),
      scale: random(0.5, 1.0),
      layer: 'far',
      yPosition: (random() < 0.5) ? 'top' : 'bottom',
      yOffset: random(pixelSize * 4, pixelSize * 12),
      colorVariant: floor(random(4))
    });
  }

  const numFillerMid = 4;
  for (let i = 0; i < numFillerMid; i++) {
    trees.push({
      x: random(width * 3),
      type: floor(random(6)),
      scale: random(1.0, 1.5),
      layer: 'mid',
      yPosition: (random() < 0.5) ? 'top' : 'bottom',
      yOffset: random(pixelSize * 2, pixelSize * 7),
      colorVariant: floor(random(4))
    });
  }
}

/* ---------------- Dibujar capa de árboles con parallax ---------------- */

function drawTreeLayer(yCenter, layerName, speedMultiplier, opacityMultiplier) {
  const yPlayable = yCenter - pixelSize / 2;
  const trackTop = yPlayable - TRACK_STYLE.sleeperOverhangPx;
  const trackBottom = yPlayable + pixelSize + TRACK_STYLE.sleeperOverhangPx;
  const clearance = pixelSize * 1.5; // Clearance base

  noStroke();
  
  // Progressive difficulty: fewer trees at the start
  let treeChance = 1.0; // Default: show all trees
  if (controller.gameState === "PLAY" && isTrainMoving) {
    const gameTime = (frameCount - controller.gameStartFrame) / 60;
    if (gameTime < 5) {
      // First 5 seconds: only 20% of trees
      treeChance = 0.2;
    } else if (gameTime < 10) {
      // 5-10 seconds: 50% of trees
      treeChance = 0.5;
    } else if (gameTime < 15) {
      // 10-15 seconds: 75% of trees
      treeChance = 0.75;
    }
    // After 15 seconds: 100% of trees
  }
  
  for (let tree of trees) {
    // Filtrar por capa
    if (tree.layer !== layerName) continue;
    // never draw middle trees for background layers
    if (layerName !== 'foreground' && tree.yPosition === 'middle') continue;
    
    // Progressive difficulty filter
    if (treeChance < 1.0) {
      // Use tree's position as a seed for consistent filtering
      randomSeed(tree.x * 1000);
      if (random() > treeChance) {
        randomSeed(frameCount); // Reset seed
        continue;
      }
      randomSeed(frameCount); // Reset seed
    }
    
    // Efecto parallax - cada capa se mueve a diferente velocidad
    let x = (tree.x - treeOffset * speedMultiplier) % (width * 2);
    if (x < -pixelSize * 4) x += width * 2;
    
    const s = pixelSize * tree.scale;
    
    // Obtener offset vertical del árbol (si existe)
    const yOffset = tree.yOffset || 0;
    
    // Indicar si es obstáculo (middle position)
    const isObstacle = (tree.yPosition === 'middle');
    
    // NUEVO: Si es árbol de fondo (no obstáculo), verificar si está cerca de un obstáculo
    if (!isObstacle) {
      // Calcular si este árbol está cerca de algún obstáculo
      const isNearObstacle = checkIfNearObstacle(tree.x, treeOffset);
      
      // Si no está cerca de ningún obstáculo, no dibujar (mostrar césped)
      if (!isNearObstacle) continue;
    }
    
    // Dibujar árbol según su posición vertical asignada CON offset personalizado
    if (tree.yPosition === 'top') {
      // Arriba de las vías - offset negativo (más lejos = más arriba)
      drawTree(x, (trackTop - clearance - yOffset) - s * 2, s, tree.type, opacityMultiplier, tree.colorVariant, isObstacle);
    } else if (tree.yPosition === 'middle') {
      // Árbol metido en las vías - centrado en la línea del tren
      drawTree(x, yPlayable - s * 0.3, s, tree.type, opacityMultiplier, tree.colorVariant, isObstacle);
    } else {
      // Abajo de las vías - offset positivo (más lejos = más abajo)
      drawTree(x, (trackBottom + clearance + yOffset) + s * 0.5, s, tree.type, opacityMultiplier, tree.colorVariant, isObstacle);
    }
  }
}

// Verificar si un árbol de fondo está cerca de algún obstáculo
function checkIfNearObstacle(treeX, currentOffset) {
  // Radio de influencia del bosque alrededor de cada obstáculo
  const forestRadius = pixelSize * 8; // Tighter clusters, less clutter
  
  // Verificar distancia a cada obstáculo
  for (let tree of trees) {
    if (tree.yPosition !== 'middle') continue; // Solo obstáculos
    
    // Calcular posición del obstáculo en el mundo
    let obstacleX = tree.x;
    
    // Calcular distancia considerando el wrapping del mundo
    let dist = abs(treeX - obstacleX);
    
    // Considerar wrapping (el mundo es cíclico)
    const worldWidth = width * 2;
    if (dist > worldWidth / 2) {
      dist = worldWidth - dist;
    }
    
    // Si está dentro del radio, hay bosque aquí
    if (dist < forestRadius) {
      return true;
    }
  }
  
  return false; // No hay obstáculos cerca = césped
}

function drawTree(x, y, size, type, opacity, colorVariant = 0, isObstacle = false) {
  push();
  noStroke();
  
  // Si es obstáculo, hacer el árbol más estrecho
  const widthMultiplier = isObstacle ? 0.6 : 1.0;
  
  // Paleta de colores inspirada en la imagen - tonalidades variadas de verde
  const colorPalettes = [
    // Variante 0: Verde oscuro profundo
    { dark: [25, 60, 30], mid: [35, 75, 40], light: [45, 90, 50], highlight: [55, 105, 60] },
    // Variante 1: Verde medio
    { dark: [35, 75, 40], mid: [50, 95, 55], light: [70, 120, 70], highlight: [90, 140, 85] },
    // Variante 2: Verde claro brillante
    { dark: [60, 110, 60], mid: [80, 135, 75], light: [110, 165, 100], highlight: [140, 190, 120] },
    // Variante 3: Verde azulado oscuro
    { dark: [20, 55, 45], mid: [30, 70, 55], light: [40, 85, 65], highlight: [50, 100, 75] }
  ];
  
  const palette = colorPalettes[colorVariant % 4];
  
  // Árboles con forma más orgánica y manchada (inspirados en la imagen de referencia)
  if (type === 0) {
    // Árbol tipo 1: Copa irregular con capas superpuestas
    // Base oscura grande
    fill(palette.dark[0], palette.dark[1], palette.dark[2], 255 * opacity);
    rect(x - size * 0.5 * widthMultiplier, y + size * 0.3, size * widthMultiplier, size * 0.5);
    rect(x - size * 0.4 * widthMultiplier, y + size * 0.2, size * 0.8 * widthMultiplier, size * 0.2);
    rect(x - size * 0.3 * widthMultiplier, y + size * 0.15, size * 0.6 * widthMultiplier, size * 0.05);
    
    // Capas medias irregulares
    fill(palette.mid[0], palette.mid[1], palette.mid[2], 255 * opacity);
    rect(x - size * 0.45 * widthMultiplier, y + size * 0.35, size * 0.6 * widthMultiplier, size * 0.4);
    rect(x - size * 0.2 * widthMultiplier, y + size * 0.25, size * 0.5 * widthMultiplier, size * 0.3);
    
    // Manchas claras superpuestas
    fill(palette.light[0], palette.light[1], palette.light[2], 240 * opacity);
    rect(x - size * 0.35 * widthMultiplier, y + size * 0.4, size * 0.4 * widthMultiplier, size * 0.25);
    rect(x - size * 0.15 * widthMultiplier, y + size * 0.3, size * 0.35 * widthMultiplier, size * 0.2);
    
    // Highlights brillantes
    fill(palette.highlight[0], palette.highlight[1], palette.highlight[2], 200 * opacity);
    rect(x - size * 0.25 * widthMultiplier, y + size * 0.45, size * 0.25 * widthMultiplier, size * 0.15);
    rect(x, y + size * 0.35, size * 0.2 * widthMultiplier, size * 0.12);
    
    // Tronco
    fill(70, 50, 30, 255 * opacity);
    rect(x - size * 0.1 * widthMultiplier, y + size * 0.75, size * 0.2 * widthMultiplier, size * 0.3);
    
  } else if (type === 1) {
    // Árbol tipo 2: Forma redondeada con muchas manchas
    fill(palette.dark[0], palette.dark[1], palette.dark[2], 255 * opacity);
    rect(x - size * 0.45 * widthMultiplier, y + size * 0.25, size * 0.9 * widthMultiplier, size * 0.6);
    rect(x - size * 0.35 * widthMultiplier, y + size * 0.15, size * 0.4 * widthMultiplier, size * 0.1);
    rect(x - size * 0.1 * widthMultiplier, y + size * 0.18, size * 0.45 * widthMultiplier, size * 0.12);
    
    fill(palette.mid[0], palette.mid[1], palette.mid[2], 255 * opacity);
    rect(x - size * 0.4 * widthMultiplier, y + size * 0.3, size * 0.5 * widthMultiplier, size * 0.45);
    rect(x - size * 0.1 * widthMultiplier, y + size * 0.35, size * 0.45 * widthMultiplier, size * 0.35);
    
    fill(palette.light[0], palette.light[1], palette.light[2], 240 * opacity);
    rect(x - size * 0.3 * widthMultiplier, y + size * 0.38, size * 0.35 * widthMultiplier, size * 0.3);
    rect(x + size * 0.05 * widthMultiplier, y + size * 0.42, size * 0.25 * widthMultiplier, size * 0.22);
    
    fill(palette.highlight[0], palette.highlight[1], palette.highlight[2], 200 * opacity);
    rect(x - size * 0.22 * widthMultiplier, y + size * 0.45, size * 0.2 * widthMultiplier, size * 0.18);
    
    // Tronco
    fill(75, 55, 35, 255 * opacity);
    rect(x - size * 0.09 * widthMultiplier, y + size * 0.78, size * 0.18 * widthMultiplier, size * 0.25);
    
  } else if (type === 2) {
    // Árbol tipo 3: Pino con capas irregulares
    fill(palette.dark[0], palette.dark[1], palette.dark[2], 255 * opacity);
    rect(x - size * 0.4 * widthMultiplier, y + size * 0.55, size * 0.8 * widthMultiplier, size * 0.2);
    rect(x - size * 0.35 * widthMultiplier, y + size * 0.4, size * 0.7 * widthMultiplier, size * 0.18);
    rect(x - size * 0.28 * widthMultiplier, y + size * 0.28, size * 0.56 * widthMultiplier, size * 0.15);
    rect(x - size * 0.2 * widthMultiplier, y + size * 0.18, size * 0.4 * widthMultiplier, size * 0.12);
    
    fill(palette.mid[0], palette.mid[1], palette.mid[2], 255 * opacity);
    rect(x - size * 0.3 * widthMultiplier, y + size * 0.45, size * 0.6 * widthMultiplier, size * 0.15);
    rect(x - size * 0.22 * widthMultiplier, y + size * 0.32, size * 0.44 * widthMultiplier, size * 0.12);
    
    fill(palette.light[0], palette.light[1], palette.light[2], 220 * opacity);
    rect(x - size * 0.18 * widthMultiplier, y + size * 0.48, size * 0.36 * widthMultiplier, size * 0.1);
    rect(x - size * 0.12 * widthMultiplier, y + size * 0.35, size * 0.24 * widthMultiplier, size * 0.08);
    
    // Tronco
    fill(65, 45, 25, 255 * opacity);
    rect(x - size * 0.08 * widthMultiplier, y + size * 0.72, size * 0.16 * widthMultiplier, size * 0.3);
    
  } else if (type === 3) {
    // Árbol tipo 4: Arbusto bajo y ancho con textura irregular
    fill(palette.dark[0], palette.dark[1], palette.dark[2], 255 * opacity);
    rect(x - size * 0.55 * widthMultiplier, y + size * 0.45, size * 1.1 * widthMultiplier, size * 0.45);
    rect(x - size * 0.35 * widthMultiplier, y + size * 0.35, size * 0.7 * widthMultiplier, size * 0.15);
    
    fill(palette.mid[0], palette.mid[1], palette.mid[2], 255 * opacity);
    rect(x - size * 0.45 * widthMultiplier, y + size * 0.5, size * 0.6 * widthMultiplier, size * 0.35);
    rect(x - size * 0.15 * widthMultiplier, y + size * 0.48, size * 0.5 * widthMultiplier, size * 0.32);
    
    fill(palette.light[0], palette.light[1], palette.light[2], 240 * opacity);
    rect(x - size * 0.35 * widthMultiplier, y + size * 0.55, size * 0.4 * widthMultiplier, size * 0.25);
    rect(x + size * 0.05 * widthMultiplier, y + size * 0.53, size * 0.25 * widthMultiplier, size * 0.22);
    
    fill(palette.highlight[0], palette.highlight[1], palette.highlight[2], 200 * opacity);
    rect(x - size * 0.25 * widthMultiplier, y + size * 0.6, size * 0.3 * widthMultiplier, size * 0.15);
    
    // Tronco
    fill(72, 52, 32, 255 * opacity);
    rect(x - size * 0.1 * widthMultiplier, y + size * 0.83, size * 0.2 * widthMultiplier, size * 0.2);
    
  } else if (type === 4) {
    // Árbol tipo 5: Copa alta con manchas irregulares
    fill(palette.dark[0], palette.dark[1], palette.dark[2], 255 * opacity);
    rect(x - size * 0.35 * widthMultiplier, y + size * 0.2, size * 0.7 * widthMultiplier, size * 0.65);
    rect(x - size * 0.25 * widthMultiplier, y + size * 0.12, size * 0.5 * widthMultiplier, size * 0.08);
    
    fill(palette.mid[0], palette.mid[1], palette.mid[2], 255 * opacity);
    rect(x - size * 0.3 * widthMultiplier, y + size * 0.25, size * 0.4 * widthMultiplier, size * 0.5);
    rect(x - size * 0.15 * widthMultiplier, y + size * 0.3, size * 0.4 * widthMultiplier, size * 0.4);
    
    fill(palette.light[0], palette.light[1], palette.light[2], 240 * opacity);
    rect(x - size * 0.25 * widthMultiplier, y + size * 0.35, size * 0.3 * widthMultiplier, size * 0.35);
    rect(x - size * 0.08 * widthMultiplier, y + size * 0.38, size * 0.25 * widthMultiplier, size * 0.28);
    
    fill(palette.highlight[0], palette.highlight[1], palette.highlight[2], 200 * opacity);
    rect(x - size * 0.18 * widthMultiplier, y + size * 0.42, size * 0.22 * widthMultiplier, size * 0.22);
    
    // Tronco
    fill(68, 48, 28, 255 * opacity);
    rect(x - size * 0.09 * widthMultiplier, y + size * 0.8, size * 0.18 * widthMultiplier, size * 0.25);
    
  } else {
    // Árbol tipo 6: Forma compacta con muchas manchas superpuestas
    fill(palette.dark[0], palette.dark[1], palette.dark[2], 255 * opacity);
    rect(x - size * 0.42 * widthMultiplier, y + size * 0.4, size * 0.84 * widthMultiplier, size * 0.5);
    rect(x - size * 0.32 * widthMultiplier, y + size * 0.32, size * 0.64 * widthMultiplier, size * 0.15);
    
    fill(palette.mid[0], palette.mid[1], palette.mid[2], 255 * opacity);
    rect(x - size * 0.38 * widthMultiplier, y + size * 0.45, size * 0.5 * widthMultiplier, size * 0.4);
    rect(x - size * 0.12 * widthMultiplier, y + size * 0.42, size * 0.48 * widthMultiplier, size * 0.38);
    
    fill(palette.light[0], palette.light[1], palette.light[2], 240 * opacity);
    rect(x - size * 0.28 * widthMultiplier, y + size * 0.52, size * 0.35 * widthMultiplier, size * 0.28);
    rect(x - size * 0.05 * widthMultiplier, y + size * 0.48, size * 0.32 * widthMultiplier, size * 0.25);
    
    fill(palette.highlight[0], palette.highlight[1], palette.highlight[2], 200 * opacity);
    rect(x - size * 0.2 * widthMultiplier, y + size * 0.58, size * 0.25 * widthMultiplier, size * 0.18);
    rect(x + size * 0.05 * widthMultiplier, y + size * 0.55, size * 0.18 * widthMultiplier, size * 0.15);
    
    // Tronco
    fill(70, 50, 30, 255 * opacity);
    rect(x - size * 0.08 * widthMultiplier, y + size * 0.82, size * 0.16 * widthMultiplier, size * 0.2);
  }
  
  pop();
}

/* ---------------- Árboles como píxeles 1D ---------------- */

function drawTreePixels() {
  // Los árboles en posición 'middle' dibujan píxeles verdes en la línea 1D
  for (let tree of trees) {
    // Solo los árboles que cruzan las vías (middle)
    if (tree.yPosition !== 'middle') continue;
    
    // Calcular posición X con scroll
    let worldX = tree.x - treeOffset;
    const loopWidth = width * 2;
    worldX = ((worldX % loopWidth) + loopWidth) % loopWidth;
    
    // Convertir posición X a índice de píxel 1D
    const pixelIndex = floor(worldX / (width / displaySize));
    
    // Dibujar píxel verde si está dentro del rango
    if (pixelIndex >= 0 && pixelIndex < displaySize) {
      display.setPixel(pixelIndex, color(46, 139, 50)); // Verde árbol
    }
  }
}

function treeCoversIndex(idx) {
  // Only trees that are BOTH:
  // 1) on the playable row ("middle")
  // 2) in the foreground layer (the only layer currently drawn)
  // 3) currently visible (respecting the progressive difficulty filter)

  // Apply the same progressive difficulty filter used in drawTreeLayer
  let treeChance = 1.0;
  if (controller.gameState === "PLAY" && isTrainMoving) {
    const gameTime = (frameCount - controller.gameStartFrame) / 60;
    if (gameTime < 5) {
      treeChance = 0.2;
    } else if (gameTime < 10) {
      treeChance = 0.5;
    } else if (gameTime < 15) {
      treeChance = 0.75;
    }
  }

  for (let tree of trees) {
    if (tree.yPosition !== 'middle') continue;
    if (tree.layer !== 'foreground') continue;

    // Skip trees hidden by progressive difficulty (same logic as drawTreeLayer)
    if (treeChance < 1.0) {
      randomSeed(tree.x * 1000);
      const visible = random() <= treeChance;
      randomSeed(frameCount);
      if (!visible) continue;
    }

    let worldX = tree.x - treeOffset;
    const loopWidth = width * 2;
    worldX = ((worldX % loopWidth) + loopWidth) % loopWidth;

    const pixelIndex = floor(worldX / (width / displaySize));
    if (pixelIndex === idx) return true;
  }
  return false;
}
/* ---------------- Mini-map (bottom left) ---------------- */

function drawMiniMap() {
  // Map dimensions
  const mapX = pixelSize * 0.8;
  const mapY = height - pixelSize * 2.5;
  const mapWidth = pixelSize * 8;
  
  // Two brown boxes (stations)
  const boxSize = pixelSize * 0.6;
  noStroke();
  fill(120, 90, 50); // Brown
  
  // Station 1 (left)
  rect(mapX, mapY - boxSize / 2, boxSize, boxSize);
  
  // Station 2 (right)
  rect(mapX + mapWidth - boxSize, mapY - boxSize / 2, boxSize, boxSize);
  
  // Line between them
  stroke(120, 90, 50); // Brown
  strokeWeight(pixelSize * 0.1);
  line(mapX + boxSize, mapY, mapX + mapWidth - boxSize, mapY);
  noStroke();
  
  // Moving dot (progress indicator)
  const dotX = mapX + boxSize + mapProgress * (mapWidth - 2 * boxSize);
  const dotY = mapY;
  
  fill(255, 0, 0); // Red dot (player color)
  const dotSize = pixelSize * 0.3;
  ellipse(dotX, dotY, dotSize, dotSize);
}

/* ---------------- MBTA-style Station — TOP-DOWN / bird's eye (pixely) ----------- */

function drawMBTAStation(xLeft, yCenter) {
  const yPlayable = yCenter - pixelSize / 2;
  const trackTop = yPlayable - TRACK_STYLE.sleeperOverhangPx;

  const stW = width * 0.5;
  if (xLeft > width + stW || xLeft + stW < -stW) return;

  noStroke();

  // Bird's eye: station sits above (north of) the track.
  const platBottom = trackTop - pixelSize * 0.08;

  // ── 1. PLATFORM (sunlit concrete) ──
  const platH = pixelSize * 2.5;
  const platTop = platBottom - platH;

  fill(195, 188, 175);
  rect(xLeft, platTop, stW, platH);

  // Chunky paver grid — thick visible lines
  fill(175, 168, 155);
  const paverCols = floor(stW / (pixelSize * 2));
  for (let i = 1; i < paverCols; i++) {
    rect(xLeft + stW * i / paverCols, platTop, pixelSize * 0.1, platH);
  }
  // Two horizontal grooves
  rect(xLeft, platTop + platH * 0.33, stW, pixelSize * 0.08);
  rect(xLeft, platTop + platH * 0.66, stW, pixelSize * 0.08);

  // Far curb (thick)
  fill(155, 148, 138);
  rect(xLeft, platTop, stW, pixelSize * 0.25);

  // ── 2. CANOPY SHADOW ──
  const canopyH = pixelSize * 1.6;
  const overhang = pixelSize * 0.4;
  const canopyTop = platTop + pixelSize * 0.35;
  const canopyLeft = xLeft - overhang;
  const canopyW = stW + overhang * 2;

  fill(0, 0, 0, 45);
  rect(canopyLeft + pixelSize * 0.15, canopyTop + pixelSize * 0.15, canopyW, canopyH);

  // ── 3. CANOPY ROOF (dark corrugated metal) ──
  fill(58, 55, 50);
  rect(canopyLeft, canopyTop, canopyW, canopyH);

  // Bold corrugation — 3 thick alternating bands
  const bandH = canopyH / 3;
  fill(68, 64, 56);
  rect(canopyLeft, canopyTop, canopyW, bandH);
  fill(50, 47, 42);
  rect(canopyLeft, canopyTop + bandH, canopyW, bandH);
  fill(62, 58, 52);
  rect(canopyLeft, canopyTop + bandH * 2, canopyW, bandH);

  // Panel seams — thick vertical dividers
  fill(42, 40, 36);
  const numSeams = 5;
  for (let i = 1; i < numSeams; i++) {
    rect(canopyLeft + canopyW * i / numSeams, canopyTop, pixelSize * 0.15, canopyH);
  }

  // Ridge cap — bold center stripe
  fill(88, 82, 72);
  rect(canopyLeft, canopyTop + canopyH * 0.45, canopyW, pixelSize * 0.2);

  // Top eave
  fill(78, 72, 64);
  rect(canopyLeft, canopyTop, canopyW, pixelSize * 0.15);

  // Bottom eave (lighter, catches light)
  fill(98, 92, 82);
  rect(canopyLeft, canopyTop + canopyH - pixelSize * 0.15, canopyW, pixelSize * 0.15);

  // ── 4. PILLAR SQUARES (chunky pixel columns from above) ──
  const numPillars = 5;
  const pSize = pixelSize * 0.3;
  const pY = canopyTop + canopyH - pSize - pixelSize * 0.15;
  for (let i = 0; i < numPillars; i++) {
    const px = xLeft + stW * (i + 0.5) / numPillars - pSize / 2;
    // Shadow
    fill(0, 0, 0, 35);
    rect(px + pixelSize * 0.08, pY + pixelSize * 0.08, pSize, pSize);
    // Pillar
    fill(150, 150, 155);
    rect(px, pY, pSize, pSize);
    // Highlight corner
    fill(185, 185, 190);
    rect(px, pY, pSize * 0.4, pSize * 0.4);
  }

  // ── 5. YELLOW SAFETY LINE (thick strip) ──
  const safetyH = pixelSize * 0.3;
  fill(235, 195, 45);
  rect(xLeft, platBottom - safetyH, stW, safetyH);
  // Bold tactile dots
  fill(210, 170, 30);
  const numBumps = floor(stW / (pixelSize * 1.5));
  for (let i = 0; i < numBumps; i++) {
    const bx = xLeft + pixelSize * 0.5 + i * (stW - pixelSize) / max(1, numBumps - 1);
    rect(bx - pixelSize * 0.1, platBottom - safetyH * 0.75, pixelSize * 0.2, pixelSize * 0.15);
  }

  // ── 6. MAROON SIGN BAND (MBTA fascia) ──
  const signH = pixelSize * 0.45;
  const signTop = canopyTop + canopyH;
  fill(140, 35, 70);
  rect(xLeft, signTop, stW, signH);
  // Lighter accent strip
  fill(175, 50, 85);
  rect(xLeft, signTop, stW, pixelSize * 0.08);

  // Sign text — big and bold
  fill(255, 255, 255);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(pixelSize * 0.32);
  text("STATION", xLeft + stW / 2, signTop + signH / 2);
  textStyle(NORMAL);

  // ── 7. BENCHES (chunky rectangles) ──
  const benchW = pixelSize * 0.8;
  const benchD = pixelSize * 0.2;
  const benchY = signTop + signH + pixelSize * 0.12;
  fill(95, 78, 55);
  rect(xLeft + stW * 0.25 - benchW / 2, benchY, benchW, benchD);
  rect(xLeft + stW * 0.75 - benchW / 2, benchY, benchW, benchD);
}

/* ---------------- Start Station (begins centered, scrolls left) ---------------- */

function drawStationBuilding(yCenter) {
  drawMBTAStation(stationBuildingX, yCenter);
}

/* ---------------- End Station (scrolls in from right, arrives centered) ---------------- */

function drawEndStationBuilding(yCenter) {
  if (mapProgress < endStationAppearProgress) return;
  const buildingX = width + pixelSize * 2 + endStationX;
  drawMBTAStation(buildingX, yCenter);
}

/* ---------------- Station Tunnel (simple brown box) ---------------- */

function drawStationTunnel(yCenter) {
  const yPlayable = yCenter - pixelSize / 2;
  
  // Tunnel dimensions - simple rectangular tunnel
  const tunnelX = 0; // Left edge of screen
  const tunnelWidth = pixelSize * 3;
  const tunnelTop = yPlayable - pixelSize * 2;
  const tunnelHeight = pixelSize * 5;
  
  noStroke();
  
  // Dark brown tunnel (matches mini-map color)
  fill(90, 70, 40);
  rect(tunnelX, tunnelTop, tunnelWidth, tunnelHeight);
  
  // Darker inner shadow
  fill(60, 45, 25);
  rect(tunnelX + tunnelWidth * 0.7, tunnelTop, tunnelWidth * 0.3, tunnelHeight);
  
  // Top edge darker
  fill(70, 55, 30);
  rect(tunnelX, tunnelTop, tunnelWidth, pixelSize * 0.3);
  
  // Bottom edge darker
  fill(70, 55, 30);
  rect(tunnelX, tunnelTop + tunnelHeight - pixelSize * 0.3, tunnelWidth, pixelSize * 0.3);
}

/* ---------------- Station Portal/Arch ---------------- */

function drawStationPortal(yCenter, stationType) {
  const yPlayable = yCenter - pixelSize / 2;
  
  // Portal position based on type
  let portalX;
  if (stationType === 'start') {
    // Start station portal - left side of screen
    portalX = pixelSize * 2;
  } else {
    // End station portal - right side of screen (when player progresses far enough)
    portalX = width - pixelSize * 3;
  }
  
  // Portal dimensions
  const pillarWidth = pixelSize * 1.2;
  const pillarHeight = pixelSize * 4;
  const archWidth = pixelSize * 4;
  const archThickness = pixelSize * 0.8;
  
  // Track references
  const trackTop = yPlayable - TRACK_STYLE.sleeperOverhangPx;
  const trackBottom = yPlayable + pixelSize + TRACK_STYLE.sleeperOverhangPx;
  
  noStroke();
  
  // Color scheme - stone/brick
  const stoneBase = color(110, 105, 100);
  const stoneDark = color(80, 75, 70);
  const stoneLight = color(140, 135, 130);
  
  // LEFT PILLAR
  const leftPillarX = portalX - archWidth / 2;
  
  // Pillar base (darker)
  fill(stoneDark);
  rect(leftPillarX, trackTop - pillarHeight, pillarWidth, pillarHeight);
  
  // Pillar main body
  fill(stoneBase);
  rect(leftPillarX + pillarWidth * 0.15, trackTop - pillarHeight, pillarWidth * 0.7, pillarHeight);
  
  // Pillar highlights (lighter)
  fill(stoneLight);
  rect(leftPillarX + pillarWidth * 0.2, trackTop - pillarHeight, pillarWidth * 0.2, pillarHeight * 0.3);
  
  // Pillar capital (top decoration)
  fill(stoneDark);
  rect(leftPillarX - pillarWidth * 0.1, trackTop - pillarHeight - pixelSize * 0.4, pillarWidth * 1.2, pixelSize * 0.4);
  
  // RIGHT PILLAR
  const rightPillarX = portalX + archWidth / 2 - pillarWidth;
  
  // Pillar base (darker)
  fill(stoneDark);
  rect(rightPillarX, trackTop - pillarHeight, pillarWidth, pillarHeight);
  
  // Pillar main body
  fill(stoneBase);
  rect(rightPillarX + pillarWidth * 0.15, trackTop - pillarHeight, pillarWidth * 0.7, pillarHeight);
  
  // Pillar highlights (lighter)
  fill(stoneLight);
  rect(rightPillarX + pillarWidth * 0.6, trackTop - pillarHeight, pillarWidth * 0.2, pillarHeight * 0.3);
  
  // Pillar capital (top decoration)
  fill(stoneDark);
  rect(rightPillarX - pillarWidth * 0.1, trackTop - pillarHeight - pixelSize * 0.4, pillarWidth * 1.2, pixelSize * 0.4);
  
  // ARCH/BEAM connecting the pillars
  const beamY = trackTop - pillarHeight - pixelSize * 0.4;
  const beamX = leftPillarX;
  const beamWidth = archWidth;
  
  // Beam base
  fill(stoneDark);
  rect(beamX, beamY, beamWidth, archThickness);
  
  // Beam highlight
  fill(stoneLight);
  rect(beamX, beamY, beamWidth, archThickness * 0.3);
  
  // Beam decoration (horizontal lines)
  fill(stoneDark);
  rect(beamX, beamY + archThickness * 0.5, beamWidth, pixelSize * 0.15);
  
  // Station sign on the arch (optional)
  fill(255, 255, 255, 200);
  textAlign(CENTER, CENTER);
  textSize(pixelSize * 0.35);
  const signText = stationType === 'start' ? 'START' : 'END';
  text(signText, portalX, beamY + archThickness / 2);
}

/* ---------------- Prevenir zoom del navegador ---------------- */

// Prevenir zoom con rueda del ratón + Ctrl/Cmd
document.addEventListener('wheel', function(e) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
  }
}, { passive: false });

// Prevenir zoom con atajos de teclado (Ctrl/Cmd + '+', '-', '=', '0')
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && 
      (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
    e.preventDefault();
  }
}, false);

// Prevenir gesto de pellizcar para zoom en trackpad
document.addEventListener('gesturestart', function(e) {
  e.preventDefault();
}, false);
