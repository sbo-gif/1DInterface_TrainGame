# 🔊 Guía de Efectos de Sonido - Train Surfing Game

## ¿Qué hemos añadido?

He preparado tu juego para que tenga efectos de sonido tanto para el ambiente como para las acciones del jugador. El código ya está listo, solo necesitas añadir los archivos de audio.

## 🎵 Sonidos que necesitas

### 🌍 Sonidos de Ambiente (5)

1. **soundTrainMoving** - Sonido del tren en movimiento (se repite en bucle)
2. **soundTunnelWarning** - Advertencia de túnel aproximándose
3. **soundFireWarning** - Advertencia de fuego aproximándose
4. **soundPlayerDeath** - Sonido cuando el jugador muere
5. **soundVictory** - Sonido de victoria al llegar a la estación final

### 🎮 Sonidos de Acciones del Jugador (4)

6. **soundPlayerMove** - Movimiento lateral (A/D o J/L)
7. **soundPlayerJump** - Salto (W o I)
8. **soundPlayerDuck** - Agacharse/bajar a las vías (S o K)
9. **soundPlayerLand** - Aterrizar después de saltar

## 📁 Cómo añadir los archivos de sonido

### Paso 1: Crear carpeta de sonidos
Crea una carpeta llamada `sounds` dentro de `P5_Interface1D/`:
```
P5_Interface1D/
  ├── sounds/          ← Nueva carpeta
  ├── sketch.js
  ├── controller.js
  └── ...
```

### Paso 2: Conseguir archivos de sonido

Puedes conseguir sonidos gratis de estos sitios:

- **Freesound.org** - Sonidos gratis con cuenta
- **Zapsplat.com** - Efectos de sonido gratis
- **Mixkit.co** - Efectos de sonido sin registro
- **OpenGameArt.org** - Sonidos para juegos
- **Bfxr.net** - Genera sonidos retro/pixelados (ideal para este juego)

**Busca estos tipos de sonidos:**

#### Sonidos de Ambiente:
- `train.mp3` → "train moving", "railway", "locomotive"
- `warning.mp3` → "warning beep", "alert", "danger"
- `fire.mp3` → "fire warning", "fire alarm"
- `death.mp3` → "game over", "lose", "death"
- `victory.mp3` → "victory", "win", "success"

#### Sonidos de Jugador:
- `move.mp3` → "step", "footstep", "walk" (sonido corto)
- `jump.mp3` → "jump", "hop", "leap" (sonido ascendente)
- `duck.mp3` → "swoosh", "slide", "drop" (sonido descendente)
- `land.mp3` → "thud", "land", "impact" (sonido seco y corto)

### Paso 3: Activar los sonidos en el código

Una vez tengas los archivos, abre `sketch.js` y busca la función `preload()`. 

**Descomenta estas líneas** (quita los `//` al inicio):

```javascript
function preload() {
  // Sonidos de ambiente - quita los //
  soundTrainMoving = loadSound('sounds/train.mp3');
  soundTunnelWarning = loadSound('sounds/warning.mp3');
  soundFireWarning = loadSound('sounds/fire.mp3');
  soundPlayerDeath = loadSound('sounds/death.mp3');
  soundVictory = loadSound('sounds/victory.mp3');
  
  // Sonidos del jugador - quita los //
  soundPlayerMove = loadSound('sounds/move.mp3');
  soundPlayerJump = loadSound('sounds/jump.mp3');
  soundPlayerDuck = loadSound('sounds/duck.mp3');
  soundPlayerLand = loadSound('sounds/land.mp3');
}
```

## 🎮 Cuándo se reproducen los sonidos

### 🌍 Sonidos de Ambiente

| Momento del juego | Sonido | Tipo |
|------------------|--------|------|
| El tren empieza a moverse | `soundTrainMoving` | Loop (se repite) |
| 2 segundos antes del túnel | `soundTunnelWarning` | Una vez |
| 2 segundos antes del fuego | `soundFireWarning` | Una vez |
| El jugador muere | `soundPlayerDeath` | Una vez |
| Llegada a la estación final | `soundVictory` | Una vez |

### 🎮 Sonidos de Acciones del Jugador

| Acción del jugador | Teclas | Sonido | Cuándo |
|-------------------|--------|--------|---------|
| Mover izquierda/derecha | A/D o J/L | `soundPlayerMove` | Cada movimiento lateral |
| Saltar | W o I | `soundPlayerJump` | Al presionar saltar |
| Agacharse/Bajar | S o K | `soundPlayerDuck` | Al bajar a las vías |
| Aterrizar | (automático) | `soundPlayerLand` | Al terminar el salto |

## 🛠️ Personalización avanzada

### Cambiar el volumen de sonidos específicos
```javascript
function preload() {
  soundTrainMoving = loadSound('sounds/train.mp3');
  soundTrainMoving.setVolume(0.5); // 50% volumen para el tren
  
  soundPlayerMove = loadSound('sounds/move.mp3');
  soundPlayerMove.setVolume(0.3); // 30% para movimientos (más suave)
  
  soundPlayerJump = loadSound('sounds/jump.mp3');
  soundPlayerJump.setVolume(0.7); // 70% para saltos (más fuerte)
}
```

### Evitar que el sonido de movimiento se solape
Si el jugador se mueve muy rápido, el código ya controla que cada sonido termine antes de reproducirse de nuevo. No necesitas hacer nada extra.

### Velocidad de reproducción (pitch)
```javascript
soundPlayerJump.rate(1.2); // 20% más rápido (más agudo)
soundPlayerDuck.rate(0.8); // 20% más lento (más grave)
```

### Usar diferentes formatos de audio
p5.sound soporta: `.mp3`, `.wav`, `.ogg`, `.m4a`

Recomendado: **MP3** para compatibilidad con todos los navegadores.

## 🎨 Crear tus propios sonidos

### Opción 1: Grabarte a ti mismo
- Usa tu teléfono o micrófono
- Edita con **Audacity** (gratis)
- Exporta como MP3

### Opción 2: Sintetizadores online (¡RECOMENDADO para sonidos de jugador!)
- **Bfxr.net** - Efectos de sonido retro/pixelados (PERFECTO para este juego)
  - Para `move.mp3`: Preset "Blip/Select"
  - Para `jump.mp3`: Preset "Jump" o "Powerup"
  - Para `duck.mp3`: Preset "Hit/Hurt" (suave)
  - Para `land.mp3`: Preset "Hit/Hurt"
- **ChipTone** - Sonidos estilo 8-bit
- **Sfxr** - Generador de efectos de juegos

### Opción 3: Text-to-Speech (para advertencias)
Para advertencias ("Warning: Tunnel!"):
- **Google Translate** (botón de altavoz)
- **TTSFree.com**
- **Natural Readers**

### Tips para sonidos de jugador:
- **Move**: Sonido muy corto (0.1-0.2 seg), como "pip" o "blip"
- **Jump**: Sonido ascendente (0.2-0.4 seg), tono subiendo
- **Duck**: Sonido descendente (0.2-0.3 seg), tono bajando
- **Land**: Sonido seco y corto (0.1-0.2 seg), como "thud"

## ⚠️ Solución de problemas

### Los sonidos no se reproducen
1. Verifica que los archivos estén en `sounds/`
2. Verifica los nombres de archivo (mayúsculas/minúsculas)
3. Abre la consola del navegador (F12) para ver errores
4. Algunos navegadores bloquean sonido automático - haz clic primero

### Sonido distorsionado o muy fuerte
```javascript
// Reducir volumen de todos los sonidos de jugador
soundPlayerMove.setVolume(0.2);
soundPlayerJump.setVolume(0.3);
soundPlayerDuck.setVolume(0.3);
soundPlayerLand.setVolume(0.3);
```

### Los sonidos de movimiento se solapan mucho
Esto es normal si te mueves rápido. Para reducirlo:
```javascript
// En preload(), después de cargar el sonido:
soundPlayerMove.setVolume(0.2); // Hacer más suave
```

O usa sonidos MUY cortos (menos de 0.2 segundos).

### Quiero que el tren suene todo el tiempo
El sonido del tren ya está configurado para hacer loop automáticamente cuando el tren se mueve.

## 📝 Notas técnicas

El código usa tres funciones helper para manejar sonidos de forma segura:

1. `playSoundSafe(sound)` - Reproduce un sonido una vez
2. `playSoundSafeLooped(sound)` - Reproduce un sonido en bucle
3. `stopSoundSafe(sound)` - Detiene un sonido

Estas funciones verifican que el sonido esté cargado antes de reproducirlo, evitando errores.

## 🎯 Próximos pasos

1. ✅ La biblioteca p5.sound ya está activada
2. ✅ Las variables de sonido están declaradas (9 sonidos en total)
3. ✅ Las funciones helper están listas
4. ✅ Los eventos de sonido están conectados (ambiente + jugador)
5. ⏳ **PENDIENTE: Descargar archivos de sonido**
6. ⏳ **PENDIENTE: Descomentar líneas en preload()**

### Archivos de sonido necesarios:
```
sounds/
  ├── train.mp3       (ambiente)
  ├── warning.mp3     (ambiente)
  ├── fire.mp3        (ambiente)
  ├── death.mp3       (ambiente)
  ├── victory.mp3     (ambiente)
  ├── move.mp3        (jugador)
  ├── jump.mp3        (jugador)
  ├── duck.mp3        (jugador)
  └── land.mp3        (jugador)
```

Una vez completes los pasos 5 y 6, tu juego tendrá efectos de sonido completos para el ambiente Y para todas las acciones del jugador!

## 🎵 Ejemplo rápido con Bfxr.net

1. Ve a **https://www.bfxr.net/**
2. Para `jump.mp3`: Click en "Jump" → Ajusta al gusto → "Export WAV"
3. Convierte WAV a MP3 con **online-convert.com** o usa el WAV directamente
4. Repite para move, duck, land con los presets correspondientes

---

**¿Necesitas ayuda?** Los efectos de sonido son opcionales - tu juego funciona perfectamente sin ellos. Solo añádelos cuando estés listo.
