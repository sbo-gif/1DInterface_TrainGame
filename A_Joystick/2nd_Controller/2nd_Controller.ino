const int POT_PIN = A0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  Serial.println(analogRead(POT_PIN));
  delay(100);
}