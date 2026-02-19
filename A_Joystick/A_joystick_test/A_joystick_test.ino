// CÓDIGO DE PRUEBA - NO EMULA TECLADO
// Usa el Serial Monitor para ver los valores del joystick

const int pinX = A1; // Cable Verde
const int pinY = A0; // Cable Amarillo
const int pinSW = 7; // Cable Morado

const int CENTRO = 512;
const int TOLERANCIA = 80; 

void setup() {
  Serial.begin(9600);
  pinMode(pinSW, INPUT_PULLUP);
  
  Serial.println("=== TEST JOYSTICK ===");
  Serial.println("Mueve el joystick y presiona el botón");
  Serial.println("");
}

void loop() {
  int valorX = analogRead(pinX);
  int valorY = analogRead(pinY);
  int boton = digitalRead(pinSW);
  
  // Imprimir valores
  Serial.print("X: ");
  Serial.print(valorX);
  Serial.print(" | Y: ");
  Serial.print(valorY);
  Serial.print(" | Botón: ");
  Serial.print(boton == LOW ? "PRESIONADO" : "LIBRE");
  
  // Detectar dirección
  Serial.print(" | Dirección: ");
  
  if (valorY < (CENTRO - TOLERANCIA)) {
    Serial.print("ARRIBA(W) ");
  } else if (valorY > (CENTRO + TOLERANCIA)) {
    Serial.print("ABAJO(S) ");
  }
  
  if (valorX < (CENTRO - TOLERANCIA)) {
    Serial.print("IZQUIERDA(A) ");
  } else if (valorX > (CENTRO + TOLERANCIA)) {
    Serial.print("DERECHA(D) ");
  }
  
  Serial.println();
  
  delay(200);
}

