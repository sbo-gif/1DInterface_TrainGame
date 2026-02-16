// sketch.js

let displaySize = 30;
let pixelSize = 25;

let playerOne;
let playerTwo;

let display;
let controller;

// Track animation (runs even on START screen)
let sleeperOffset = 0;
let sleeperSpeed = 3;

// Toggles
let showCenterTrack = true;
let playerIconShape = "square"; // "square" or "circle"

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

function setup() {
  // Taller canvas to fit instructions comfortably
  createCanvas(displaySize * pixelSize, pixelSize * 20);

  display = new Display(displaySize, pixelSize);

  playerOne = new Player(color(255, 0, 0), 0, displaySize);
  playerTwo = new Player(color(0, 0, 255), 0, displaySize);

  controller = new Controller();

  // Track colors
  TRACK_COLORS.rail = color(0);
  TRACK_COLORS.sleeper = color(120, 90, 0);
  TRACK_COLORS.background = color(255);

  // Track geometry
  TRACK_STYLE.railThicknessPx = max(3, pixelSize * 0.12);
  TRACK_STYLE.sleeperWidthPx = pixelSize * 0.95;
  TRACK_STYLE.sleeperOverhangPx = pixelSize * 0.55;
  TRACK_STYLE.sleeperStridePx = pixelSize * 2;

  // Ensure layout exists for drawing wagons row even on START
  controller.computeTrainLayout();
}

function draw() {
  background(TRACK_COLORS.background);

  // Track animation always running
  sleeperOffset = (sleeperOffset + sleeperSpeed) % (pixelSize * 2);

  // Place the track/train row higher to leave room for instructions
  const yCenter = height * 0.5;
  const yPlayable = yCenter - pixelSize / 2;

  if (showCenterTrack) drawFatCenterTrackBand(yCenter, sleeperOffset);

  // Controller draws wagons row (and gameplay if in PLAY)
  controller.update();
  display.show(yPlayable);

  if (controller.gameState === "PLAY") {
    drawPlayerIcon(playerOne, yPlayable);
    drawPlayerIcon(playerTwo, yPlayable);

    if (controller.tunnelActive) drawTunnelOverlay();
    if (controller.isTunnelWarning()) drawWarningText();

    drawLivesUI();
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

function drawPlayerIcon(player, yPlayable) {
  if (player.isDead || player.isAirborne) return;

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

function drawTunnelOverlay() {
  const x = controller.tunnelX * pixelSize;
  const w = TUNNEL_WIDTH_PIXELS * pixelSize;

  noStroke();
  fill(0);
  rect(x, 0, w, height);
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
  drawLifeRow(width - pad - totalWidth, pad, playerTwo.playerColor, playerTwo.lives);
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
