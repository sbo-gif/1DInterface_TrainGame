#include <Keyboard.h>

// Configuración basada en tu conexión física
const int pinX = A1; // Cable Verde
const int pinY = A0; // Cable Amarillo
const int pinSW = 7; // Cable Morado

// Zona muerta: Ignora valores entre 450 y 570 para evitar deriva (drift)
const int CENTRO = 512;
const int TOLERANCIA = 80; 

void setup() {
  Keyboard.begin(); //
  pinMode(pinSW, INPUT_PULLUP); // Activa resistencia interna para el botón
}

void loop() {
  int valorX = analogRead(pinX); //
  int valorY = analogReadaw(pinY); //

  // --- LÓGICA EJE Y (W / S) ---
  if (valorY < (CENTRO - TOLERANCIA)) {
    Keyboard.press('w'); //
  } else if (valorY > (CENTRO + TOLERANCIA)) {
    Keyboard.press('s'); //
  } else {
    Keyboard.release('w'); //
    Keyboard.release('s'); //
  }

  // --- LÓGICA EJE X (A / D) ---
  if (valorX < (CENTRO - TOLERANCIA)) {
    Keyboard.press('a'); //
  } else if (valorX > (CENTRO + TOLERANCIA)) {
    Keyboard.press('d'); //
  } else {
    Keyboard.release('a'); //
    Keyboard.release('d'); //
  }

  // --- LÓGICA BOTÓN (ESPACIO) ---
  if (digitalRead(pinSW) == LOW) { //
    Keyboard.press(' '); //
  } else {
    Keyboard.release(' '); //
  }

  delay(15); //
}