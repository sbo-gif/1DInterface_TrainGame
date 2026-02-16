// display.js
// Aggregates visual info before drawing it.
// Supports "transparent" pixels via null (so track can show through gaps).

class Display {
  constructor(_displaySize, _pixelSize) {
    this.displaySize = _displaySize;
    this.pixelSize = _pixelSize;
    this.initColor = color(0, 0, 0); // black
    this.displayBuffer = new Array(this.displaySize).fill(this.initColor);
  }

  setPixel(_index, _color) {
    if (_index < 0 || _index >= this.displaySize) return;
    this.displayBuffer[_index] = _color; // may be null for transparency
  }

  setAllPixels(_color) {
    for (let i = 0; i < this.displaySize; i++) {
      this.setPixel(i, _color);
    }
  }

  // yOffset lets the 1D row be drawn anywhere vertically
  show(yOffset = 0) {
    for (let i = 0; i < this.displaySize; i++) {
      const c = this.displayBuffer[i];
      if (c === null || c === undefined) continue; // transparent
      fill(c);
      rect(i * this.pixelSize, yOffset, this.pixelSize, this.pixelSize);
    }
  }

  clear() {
    for (let i = 0; i < this.displaySize; i++) {
      this.displayBuffer[i] = this.initColor;
    }
  }
}
