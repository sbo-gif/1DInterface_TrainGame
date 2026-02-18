/*

This is a simple example that allows you to connect 4 buttons and a rotary encoder to your Arduino.
The Arduino acts as a keyboard by outputting button presses.

You will need this table to figure the code for the characters you are trying to output.
http://www.asciitable.com/

*/

#include <Keyboard.h>      // include library that let's Arduino act as a keyboard


// some useful values
#define OFF 0
#define ON 1

// Direction buttons (wired as INPUT_PULLUP: pressed = LOW, released = HIGH)
const int UP_PIN    = 14; // W
const int DOWN_PIN  = 8;  // S
const int LEFT_PIN  = 7;  // A
const int RIGHT_PIN = 16; // D

bool upLatched    = OFF;
bool downLatched  = OFF;
bool leftLatched  = OFF;
bool rightLatched = OFF;



void setup()
{

  // connect to serial port for debugging
  Serial.begin(57600);

  pinMode(UP_PIN, INPUT_PULLUP);
  pinMode(DOWN_PIN, INPUT_PULLUP);
  pinMode(LEFT_PIN, INPUT_PULLUP);
  pinMode(RIGHT_PIN, INPUT_PULLUP);

  // start the keyboard
  Keyboard.begin();
}

void loop()
{


  // All the key presses happen here (pressed = LOW with INPUT_PULLUP)
  //////////////////////////////////////////////////////////////

  // UP -> W
  if (digitalRead(UP_PIN) == LOW && upLatched == OFF) {
    upLatched = ON;
    Keyboard.write('W');   // or 'w' if your game checks lowercase
  }
  if (digitalRead(UP_PIN) == HIGH) {
    upLatched = OFF;
  }

  // DOWN -> S
  if (digitalRead(DOWN_PIN) == LOW && downLatched == OFF) {
    downLatched = ON;
    Keyboard.write('S');
  }
  if (digitalRead(DOWN_PIN) == HIGH) {
    downLatched = OFF;
  }

  // LEFT -> A
  if (digitalRead(LEFT_PIN) == LOW && leftLatched == OFF) {
    leftLatched = ON;
    Keyboard.write('A');
  }
  if (digitalRead(LEFT_PIN) == HIGH) {
    leftLatched = OFF;
  }

  // RIGHT -> D
  if (digitalRead(RIGHT_PIN) == LOW && rightLatched == OFF) {
    rightLatched = ON;
    Keyboard.write('D');
  }
  if (digitalRead(RIGHT_PIN) == HIGH) {
    rightLatched = OFF;
  }

  delay(5); // tiny debounce helper

  
}
