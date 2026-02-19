// This holds some player information, like color and position.
// It also has some player methods for managing how a player moves.


class Player {
  
    constructor(_color, _position, _displaySize) {
        this.playerColor = _color;
        this.position = _position;
        this.score = 0;
        this.displaySize = _displaySize;
        this.fallen = false;
        this.onTrain = true;   // starts on train (since you spawn on a wagon)
        this.wagonId = null;   // will be set at spawn
        this.seat = 0;         // position within wagon: 0..wagonSize-1
        
        // Initialize game state properties
        this.mode = "WAGON";   // "WAGON" or "TRACK"
        this.isDead = false;
        this.isAirborne = false;
        this.airborneFramesLeft = 0;
        this.deadFramesLeft = 0;
        this.lastDownFrame = 0;
        this.lives = 3;
        this.invulnerableUntil = 0; // Frame number until which player is invulnerable
        this.deathPosition = 0;     // Position where player died (for respawn)

    }



    // Move player based on keyboard input
    move(_direction) {

        // increments or decrements player position
        this.position = this.position + _direction;
      
        // if player hits the edge of display, loop around
        if (this.position == -1) {
            this.position = this.displaySize - 1;
        } else if (this.position == this.displaySize) {
            this.position = 0;
        } 
         
    } 
  }