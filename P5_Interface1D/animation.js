
// Explosion effect
class Animation {


    constructor() {
 
        this.numberOfFrames = 30;    // how many frames the animation has 
        this.pixels = 30;            // how wide the animation is
        
        // Multidimensional arrays in javascript are a bit silly
        // I recommend you watch this to understand what is happening next: https://www.youtube.com/watch?v=OTNpiLUSiB4
        this.animation = new Array(this.numberOfFrames);
       
        this.currentFrameCount = -1;       // this tracks what frame we are currently reading

        // The animation mimics an explosion and this variable tracks where the wave is in the display
        let k = 0;

        // Build up the array in this for loop
        for (let i = 0; i < this.numberOfFrames; i++) {
            
            // since javascript can't initialize a 2D array, we need to do this
            this.animation[i] = new Array(this.pixels);     
            
            // populate array with empty/black pixels
            for (let j = 0; j < this.pixels; j++) {
                this.animation[i][j] = color(0, 0, 0);
            }
        
        // Then populate array with animation
        
        // Start from the center
        let center = parseInt(this.pixels/2);
        
        // Animate to the right
        this.animation[i][k+center] = color(255, 255, 0);

        // Animate to the left
        this.animation[i][center-k] = color(255, 255, 0);
        
        // Increment animation pixel
        k = k+1;
    }

    }

    // This function advances animation to next frame and returns current frame number
    currentFrame() {

        this.currentFrameCount = this.currentFrameCount + 1;

        if (this.currentFrameCount >= this.numberOfFrames) {
            this.currentFrameCount = 0;
        }

        return this.currentFrameCount;
    }

    // Returns one pixel at a time
    grabPixel(_index) {

        return this.animation[this.currentFrameCount][_index];
    }

}

// Add new class for Train Background
class TrainBackground {
    constructor(_pixels, _wagonSize = 2, _gapSize = 1, _speedFrames = 2, _wagonColor = null)  
    {
    this.pixels = _pixels;
    this.wagonSize = max(1, _wagonSize); // how many pixels each wagon occupies
    this.gapSize = max(0, _gapSize); // how many pixels of empty space between wagons


    // Move 1 pixel every `_speedFrames` draw frames.
    // Example: 2 => half-speed (moves every other frame)
    this.speedFrames = max(1, _speedFrames);


    this.offset = 0; // how many pixels the pattern has shifted


    this.wagonColor = _wagonColor || color(120, 120, 120); // grey
    this.emptyColor = color(0, 0, 0); // black


    // 2 grey pixels then 1 black pixel
    this.patternLen = this.wagonSize + this.gapSize;
    }

    update() {
    let advanced = false;

    if (frameCount % this.speedFrames === 0) {
        this.offset = (this.offset + 1) % this.pixels;
        advanced = true;
    }

    return advanced;
    }

    patternIndexAt(i) {
    let idx = (i - this.offset) % this.patternLen;
    if (idx < 0) idx += this.patternLen; // JS remainder can be negative
    return idx;
    }

    isWagon(i) {
    return this.patternIndexAt(i) < this.wagonSize;
    }

    wagonIdAt(i) {
    // Convert screen pixel i into a stable “world” coordinate where the pattern is anchored
    let world = i - this.offset;

    // wrap world into [0, this.pixels)
    world = ((world % this.pixels) + this.pixels) % this.pixels;

    return Math.floor(world / this.patternLen);
    }

    getPixel(i) {
    const idx = this.patternIndexAt(i);
    if (idx < this.wagonSize) return this.wagonColor;
    return this.emptyColor;
    }

}

