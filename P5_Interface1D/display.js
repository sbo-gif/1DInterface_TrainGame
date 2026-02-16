// display.js

class Display {
  constructor(_displaySize, _pixelSize) {
    this.displaySize = _displaySize;
    this.pixelSize = _pixelSize;

    // IMPORTANT: null = transparent pixel (we won't draw a rect there)
    this.displayBuffer = new Array(this.displaySize).fill(null);
  }

  setPixel(_index, _colorOrNull) {
    this.displayBuffer[_index] = _colorOrNull; // can be a p5 color OR null
  }

  setAllPixels(_colorOrNull) {
    for (let i = 0; i < this.displaySize; i++) {
      this.setPixel(i, _colorOrNull);
    }
  }

  show(yOffset = 0) {
    noStroke();
    for (let i = 0; i < this.displaySize; i++) {
      const c = this.displayBuffer[i];
      if (c === null) continue;         // <-- transparent pixel, don't draw
      fill(c);
      rect(i * this.pixelSize, yOffset, this.pixelSize, this.pixelSize);
    }
  }

  clear() {
    for (let i = 0; i < this.displaySize; i++) {
      this.displayBuffer[i] = null;
    }
  }
}
