#include <RotaryEncoder.h>
#include <Keyboard.h>      // include library that let's Arduino act as a keyboard


RotaryEncoder encoder(16, 15);
const int POT_PIN = A1;
const int THRESHOLD = 300;      // how big a change counts as "big" (out of 1023)
const int WINDOW_MS = 200;      // time window to detect the change
const int END_LOW = 800;        // "bottom" zone
const int END_HIGH = 1010;      // "top" zone

int history = 512;
unsigned long lastSample = 0;

void setup() {
  Serial.begin(9600);
  while (!Serial);  // Pro Micro needs this to wait for USB serial
  Serial.println("Ready");
  Keyboard.begin();

}

void loop() {
  encoder.tick();
  static int pos = 0;
  int newPos = encoder.getPosition();
  if (pos != newPos) {
    Serial.println(newPos);
    if (pos < newPos) {
      Keyboard.write('D');
    } 
    if (pos > newPos) {
      Keyboard.write('A');
    } 
    // else {
    //   Keyboard.write('D');
    // }
    pos = newPos;

  }

  // int val = analogRead(A1); // returns 0–1023
  // Serial.println(val);

    int current = analogRead(POT_PIN);
  unsigned long now = millis();

  if (now - lastSample >= WINDOW_MS) {
    // int delta = abs(current - history);

    Serial.println(current);
    // if (delta >= THRESHOLD) {
    //   if (current <= END_LOW) {
    //     Serial.println("SLAMMED TO BOTTOM");
    //   } else if (current >= END_HIGH) {
    //     Serial.println("SLAMMED TO TOP");
    //   }
    // }

      if (current <= END_LOW) {
        Keyboard.write('S');
      } else if (current >= END_HIGH) {
        Keyboard.write('W');
      }

    history = current;
    lastSample = now;
  }

//   Serial.print(digitalRead(2));
// Serial.println(digitalRead(3));
// delay(100);
}