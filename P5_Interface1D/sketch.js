// sketch.js

let displaySize = 30;
let pixelSize = 25;

let playerOne;
let playerTwo;

let display;
let controller;

// Choose to be a 1- or 2-player game
let player2Enabled = false;  // 🔁 CHANGE TO false for 1-player mode

// Track animation (runs even on START screen)
let sleeperOffset = 0;
let sleeperSpeed = 1.5; // Reducido a la mitad (antes era 3)

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

function setup() {
  // Taller canvas to fit instructions comfortably
  createCanvas(displaySize * pixelSize, pixelSize * 20);

  display = new Display(displaySize, pixelSize);

  playerOne = new Player(color(255, 0, 0), 0, displaySize);
  playerTwo = new Player(color(0, 0, 255), 0, displaySize);

  controller = new Controller();

  // Track colors
  TRACK_COLORS.rail = color(0);
  TRACK_COLORS.sleeper = color(120, 90, 20); // Marrón original
  TRACK_COLORS.background = color(120, 160, 100); // Verde césped pixel art

  // Track geometry
  TRACK_STYLE.railThicknessPx = max(3, pixelSize * 0.12);
  TRACK_STYLE.sleeperWidthPx = pixelSize * 0.95;
  TRACK_STYLE.sleeperOverhangPx = pixelSize * 0.55;
  TRACK_STYLE.sleeperStridePx = pixelSize * 2;

  // Inicializar árboles
  initializeTrees();

  // Ensure layout exists for drawing wagons row even on START
  controller.computeTrainLayout();
}

function draw() {
  background(TRACK_COLORS.background);

  // Track animation always running
  sleeperOffset = (sleeperOffset + sleeperSpeed) % (pixelSize * 2);
  treeOffset = treeOffset + sleeperSpeed; // Árboles se mueven continuamente SIN módulo

  // Place the track/train row higher to leave room for instructions
  const yCenter = height * 0.5;
  const yPlayable = yCenter - pixelSize / 2;

  // Background trees (visual only)
  drawTreeLayer(yCenter, 'far', 0.25, 0.25);
  drawTreeLayer(yCenter, 'mid', 0.45, 0.45);
  drawTreeLayer(yCenter, 'close', 0.70, 0.70);

  if (showCenterTrack) drawFatCenterTrackBand(yCenter, sleeperOffset);

  // Controller draws wagons row (and gameplay if in PLAY)
  controller.update();
  
  // NO dibujar árboles en píxeles 1D - solo visuales grandes
  // drawTreePixels(); // COMENTADO - los árboles son solo visuales
  
  display.show(yPlayable);

  if (controller.gameState === "PLAY") {
    drawPlayerIcon(playerOne, yPlayable);
    if (player2Enabled){
      drawPlayerIcon(playerTwo, yPlayable);
    }

     // Dibujar árboles grandes DESPUÉS del tren (primer plano) - cubren las vías
    drawTreeLayer(yCenter, 'foreground', 1.0, 1.0); // Primer plano - 100% velocidad, opacidad total

    if (controller.tunnelActive) drawTunnelOverlay(yCenter);
    if (controller.isTunnelWarning()) drawWarningText();

    drawLivesUI();
    
    // Mostrar mensaje de respawn
    if (playerOne.isDead && playerOne.lives > 0) {
      drawRespawnMessage(playerOne, "Player 1");
    }
    if (playerTwo.isDead && playerTwo.lives > 0) {
      drawRespawnMessage(playerTwo, "Player 2");
    }
  }

 

  if (controller.gameState === "START") {
    drawStartScreenOverlay();
  }

  if (controller.gameState === "GAME_OVER") {
    drawLivesUI();
    drawGameOver();
  }
}

/* ---------------- Start screen ---------------- */

function drawStartScreenOverlay() {
  noStroke();
  fill(255, 235);
  rect(pixelSize * 0.8, pixelSize * 0.6, width - pixelSize * 1.6, height - pixelSize * 1.2, pixelSize * 0.35);

  fill(0);
  textAlign(CENTER, TOP);

  textSize(pixelSize * 1.05);
  text("Surviving MBTA", width / 2, pixelSize * 0.95);

  textSize(pixelSize * 0.70);
  text("Press SPACE to start", width / 2, pixelSize * 2.15);

  textAlign(LEFT, TOP);
  textSize(pixelSize * 0.50);

  const leftX = pixelSize * 1.4;
  let y = pixelSize * 3.0;
  const line = pixelSize * 0.75;

  text("Player 1 (Red):", leftX, y); y += line;
  text("A / D  = move left / right (on wagon)", leftX, y); y += line;
  text("S      = duck into track at wagon edge; tap to survive", leftX, y); y += line;
  text("W      = jump up to wagon (if on track) OR jump on top (if on wagon)", leftX, y); y += line;

  y += line * 0.5;
  text("Player 2 (Blue):", leftX, y); y += line;
  text("J / L  = move left / right (on wagon)", leftX, y); y += line;
  text("K      = duck into track at wagon edge; tap to survive", leftX, y); y += line;
  text("I      = jump up to wagon (if on track) OR jump on top (if on wagon)", leftX, y); y += line;

  y += line * 0.6;
  text("Rules:", leftX, y); y += line;
  text("- You spawn on wagons only.", leftX, y); y += line;
  text("- If you are on the track, keep tapping DOWN (S/K) to survive.", leftX, y); y += line;
  text("- A tunnel arrives after a warning. Duck + keep tapping DOWN to survive.", leftX, y); y += line;
  text("- If you are on a wagon when the tunnel hits you, you die.", leftX, y); y += line;
  text("- Losing all lives ends the game.", leftX, y); y += line;

  textAlign(CENTER, BOTTOM);
  textSize(pixelSize * 0.42);
  text("Tip: If you stop tapping DOWN on track, your blink speeds up until death.", width / 2, height - pixelSize * 1.0);
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

  // Highway proportions
  const shoulderW = max(6, floor(w * 0.1)); // red/white curb width
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

  // Shadow band (inner side)
  const shadowW = pixelSize * 1.2;
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

  // ✅ DRAW shadow (you were missing this)
  if (shadowAlpha > 0.001 && sw > 0.5) {
    noStroke();
    fill(60, 90, 60, 140 * shadowAlpha); // dark green w/ alpha
    rect(sx, 0, sw, height);
  }

  // 1) Road deck (grey asphalt)
  noStroke();
  fill(130);
  rect(roadX, 0, roadW, height);

  // 2) Subtle inner edges (guardrail)
  fill(90);
  const railW = max(2, floor(roadW * 0.04));
  rect(roadX, 0, railW, height);
  rect(roadX + roadW - railW, 0, railW, height);

  // 3) Shoulders base red
  fill(200, 40, 40);
  rect(x, 0, shoulderW, height);
  rect(x + w - shoulderW, 0, shoulderW, height);

  // 4) Alternating white blocks on shoulders
  const blockH = pixelSize * 1.4;
  const gapH = pixelSize * 0.4;
  const stride = blockH + gapH;

  for (let yy = 0; yy < height + stride; yy += stride) {
    fill(245);
    rect(x, yy + blockH * 0.35, shoulderW, blockH * 0.55);
    rect(x + w - shoulderW, yy + blockH * 0.35, shoulderW, blockH * 0.55);
  }

  // 5) Dashed center line
  const dashW = max(2, floor(roadW * 0.12));
  const dashX = roadX + roadW / 2 - dashW / 2;
  const dashH = pixelSize * 1.2;
  const dashGap = pixelSize * 0.8;

  fill(245);
  for (let yy = 0; yy < height + dashH; yy += dashH + dashGap) {
    rect(dashX, yy, dashW, dashH);
  }

  // Optional: tiny highlight at the top to make the deck feel "raised"
  fill(255, 18);
  rect(roadX, 0, roadW, pixelSize * 0.35);

  // ✅ Pillars as HORIZONTAL brackets:
  // long when near edge (shadowAlpha ~ 1), short as approaching center (shadowAlpha -> 0)
  if (shadowAlpha > 0.001) {
    const dir = showInnerRightEdge ? 1 : -1;

    // Base anchor at the inner edge of the road deck (right next to the shadow band)
    const edgeX = showInnerRightEdge ? (x + w) : x;

    // Horizontal length of bracket in pixels:
    // - long at edge, shrinks toward center
    const maxLen = pixelSize * 2.0;         // adjust if you want longer
    const minLen = pixelSize * 0.8;         // small nub before disappearing
    const bracketLen = lerp(minLen, maxLen, shadowAlpha);

    // Vertical thickness of bracket
    const bracketH = pixelSize * 0.55;

    // ✅ Keep pillars out of the playable corridor with a clearance (same strategy as background trees)
    const pillarClearance = pixelSize * 3.5;

    // For TOP brackets: y is the top of the rect, so subtract bracketH to keep the whole bracket above (trackTop - clearance)
    const baseTopY = (trackTop - pillarClearance) - bracketH;

    // For BOTTOM brackets: y is the top of the rect, so start below (trackBottom + clearance)
    const baseBotY = (trackBottom + pillarClearance);

    // Keep the stack tighter so it never creeps into the corridor
    const offsets = [-pixelSize * 2.0, 0, pixelSize * 2.0];

    for (const dy of offsets) {
      // Top bracket
      drawBridgePillar(edgeX, baseTopY + dy, bracketLen, bracketH, shadowAlpha, showInnerRightEdge);

      // Bottom bracket
      drawBridgePillar(edgeX, baseBotY + dy, bracketLen, bracketH, shadowAlpha, showInnerRightEdge);
    }
  }
}

function drawBridgePillar(edgeX, y, lenX, thickY, alpha01, innerRightEdge) {
  // Draw a horizontal bracket extending from the inner road edge into the shadow band
  const dir = innerRightEdge ? 1 : -1;

  // If inner side is right, bracket starts at road edge and extends right.
  // If inner side is left, bracket ends at road edge and extends left.
  const px = innerRightEdge ? edgeX : (edgeX - lenX);

  noStroke();

  // subtle drop shadow under the bracket
  fill(0, 35 * alpha01);
  rect(px + dir * (pixelSize * 0.15), y + thickY * 0.55, lenX, thickY * 0.55, 2);

  // main bracket (light concrete)
  fill(210, 210, 210, 255 * alpha01);
  rect(px, y, lenX, thickY, 2);

  // underside shade for quick 3D cue
  fill(170, 170, 170, 255 * alpha01);
  rect(px, y + thickY * 0.55, lenX, thickY * 0.45, 2);
}

function drawWarningText() {
  fill(0);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(pixelSize * 0.65);
  text("warning: tunnel", width / 2, pixelSize * 0.9);
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
  
  // PRIMERO: Crear algunos árboles ESPECÍFICAMENTE sobre las vías (middle)
  const numMiddleTrees = 4; // Árboles garantizados sobre las vías
  for (let i = 0; i < numMiddleTrees; i++) {
    // Estos árboles SIEMPRE estarán en posición 'middle' (sobre las vías)
    let layer = 'foreground'; 
    let scale = (layer === 'foreground') ? random(2.0, 3.0) : random(1.4, 2.0);
    
    trees.push({
      x: random(width * 2),
      type: floor(random(3)),
      scale: scale,
      layer: layer,
      yPosition: 'middle' // SIEMPRE sobre las vías
    });
  }
  
  // SEGUNDO: Crear árboles adicionales en posiciones aleatorias
  const numRandomTrees = 4; // Árboles en posiciones aleatorias
  for (let i = 0; i < numRandomTrees; i++) {
    // Posición vertical: top, middle, o bottom (aleatorio)
    let yPos;
    const rand = random();
    if (rand < 0.3) {
      yPos = 'top';
    } else if (rand < 0.6) {
      yPos = 'middle';
    } else {
      yPos = 'bottom';
    }
    
    // Asignar capa de profundidad: far, mid, close, foreground
    let layer;
    let layerRand = random();
    if (layerRand < 0.25) {
      layer = 'far';      // Más lejos - más pequeño
    } else if (layerRand < 0.5) {
      layer = 'mid';      // Medio
    } else if (layerRand < 0.75) {
      layer = 'close';    // Cerca
    } else {
      layer = 'foreground'; // Primer plano - más grande
    }
    
    // Escala según la capa
    let scale;
    if (layer === 'far') {
      scale = random(0.5, 0.9);  // Muy pequeños (fondo)
    } else if (layer === 'mid') {
      scale = random(0.9, 1.4);  // Medianos
    } else if (layer === 'close') {
      scale = random(1.4, 2.0);  // Grandes
    } else {
      scale = random(2.0, 3.0);  // Muy grandes (primer plano)
    }

    // prevent background trees from appearing on the track corridor
    if (layer !== 'foreground' && yPos === 'middle') {
      yPos = (random() < 0.5) ? 'top' : 'bottom';
    }

    
    trees.push({
      x: random(width * 2),
      type: floor(random(3)),
      scale: scale,
      layer: layer,
      yPosition: yPos
    });
  }
}

/* ---------------- Dibujar capa de árboles con parallax ---------------- */

function drawTreeLayer(yCenter, layerName, speedMultiplier, opacityMultiplier) {
  const yPlayable = yCenter - pixelSize / 2;
  const trackTop = yPlayable - TRACK_STYLE.sleeperOverhangPx;
  const trackBottom = yPlayable + pixelSize + TRACK_STYLE.sleeperOverhangPx;
  const clearance = pixelSize * 1.5; //  keeps trees away from track

  noStroke();
  
  for (let tree of trees) {
    // Filtrar por capa
    if (tree.layer !== layerName) continue;
    // never draw middle trees for background layers
    if (layerName !== 'foreground' && tree.yPosition === 'middle') continue;
    
    // Efecto parallax - cada capa se mueve a diferente velocidad
    let x = (tree.x - treeOffset * speedMultiplier) % (width * 2);
    if (x < -pixelSize * 4) x += width * 2;
    
    const s = pixelSize * tree.scale;
    
    // Dibujar árbol según su posición vertical asignada
    if (tree.yPosition === 'top') {
      drawTree(x, (trackTop - clearance) - s * 2, s, tree.type, opacityMultiplier);
    } else if (tree.yPosition === 'middle') {
      // Árbol metido en las vías - centrado en la línea del tren
      drawTree(x, yPlayable - s * 0.3, s, tree.type, opacityMultiplier);
    } else {
      drawTree(x, (trackBottom + clearance) + s * 0.5, s, tree.type, opacityMultiplier);
    }
  }
}

function drawTree(x, y, size, type, opacity) {
  push();
  noStroke();
  
  // Árboles delicados y minimalistas - diseño elegante para 
  if (type === 0) {
    // Árbol tipo 1: Copa circular pequeña y delicada
    fill(34, 100, 34, 255 * opacity); // Verde oscuro exterior
    rect(x - size * 0.35, y + size * 0.3, size * 0.7, size * 0.5);
    rect(x - size * 0.25, y + size * 0.2, size * 0.5, size * 0.1);
    rect(x - size * 0.25, y + size * 0.8, size * 0.5, size * 0.1);
    
    fill(45, 85, 40, 255 * opacity); // Verde oscuro interior - elegante
    rect(x - size * 0.2, y + size * 0.4, size * 0.4, size * 0.3);
    
    // Tronco muy pequeño
    fill(80, 55, 30, 255 * opacity); // Marrón más oscuro
    rect(x - size * 0.08, y + size * 0.85, size * 0.16, size * 0.2);
    
  } else if (type === 1) {
    // Árbol tipo 2: Pino pequeño y delicado
    fill(34, 100, 34, 255 * opacity); // Verde oscuro
    // Forma triangular simple
    rect(x - size * 0.3, y + size * 0.6, size * 0.6, size * 0.15);
    rect(x - size * 0.25, y + size * 0.45, size * 0.5, size * 0.15);
    rect(x - size * 0.2, y + size * 0.3, size * 0.4, size * 0.15);
    rect(x - size * 0.1, y + size * 0.2, size * 0.2, size * 0.1);
    
    // Tronco muy pequeño
    fill(80, 55, 30, 255 * opacity); // Marrón más oscuro
    rect(x - size * 0.08, y + size * 0.75, size * 0.16, size * 0.25);
    
  } else {
    // Árbol tipo 3: Arbusto pequeño y compacto
    fill(34, 100, 34, 255 * opacity); // Verde oscuro
    rect(x - size * 0.3, y + size * 0.35, size * 0.6, size * 0.5);
    
    fill(45, 85, 40, 255 * opacity); // Verde oscuro interior - elegante
    rect(x - size * 0.2, y + size * 0.45, size * 0.4, size * 0.3);
    
    // Tronco muy pequeño
    fill(80, 55, 30, 255 * opacity); // Marrón más oscuro
    rect(x - size * 0.08, y + size * 0.8, size * 0.16, size * 0.2);
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
  for (let tree of trees) {
    if (tree.yPosition !== 'middle') continue;
    if (tree.layer !== 'foreground') continue; // ✅ NEW: ignore invisible layers

    let worldX = tree.x - treeOffset;
    const loopWidth = width * 2;
    worldX = ((worldX % loopWidth) + loopWidth) % loopWidth;

    const pixelIndex = floor(worldX / (width / displaySize));
    if (pixelIndex === idx) return true;
  }
  return false;
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
