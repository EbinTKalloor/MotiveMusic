# Hand-Controlled Audio Sequencer 🎵✋

An interactive browser-based audio sequencer controlled using hand gestures and a webcam.

## Demo
Live demo: https://ebintkalloor.github.io/MotiveMusic/

## Features
- Real-time hand tracking
- Gesture-based audio triggering
- Visual feedback using p5.js
- Runs fully in the browser

## Technologies
- JavaScript
- p5.js
- HandPose model

## How It Works
The application operates in two primary modes: Sequencer Mode and Hand Detection Mode.

1. Sequencer Mode
Users can design rhythmic patterns across four independent tracks. Each track can be configured individually and played either separately or together to create layered sequences.
Press M to toggle between Sequencer Mode and Hand Detection Mode.
Users can preview and test their sequences before switching to gesture control.

2. Hand Detection Mode
In this mode, the application uses the HandPose model and webcam input to detect hand landmarks and interpret gestures. These gestures are mapped to musical controls such as track selection, scale changes, and tempo adjustment.

Gesture Controls

Right Hand — Track Selection
The number of upright fingers determines which track is toggled on or off.
Right Hand - Track Control
1 finger: Toggle Track 1
2 fingers: Toggle Track 2
3 fingers: Toggle Track 3
4 fingers: Toggle Track 4

Left Hand — Scale & Tempo Control
1 finger: Select Scale 1
2 fingers: Select Scale 2
3 fingers: Select Scale 3
4 fingers or open hand: Control tempo
When using the tempo gesture, vertical movement of the left hand adjusts the overall beats per minute (BPM) of the sequencer.

## How to Run Locally
1. Clone the repository
2. Open `index.html` in a modern web browser
3. Allow camera and audio permissions

## Architecture
1. Webcam input is captured through browser APIs.
2. The HandPose model detects hand landmarks in real time.
3. Gesture recognition logic interprets finger positions.
4. Detected gestures trigger sequencer controls such as track toggling, scale selection, and tempo adjustments.
5. Audio playback and visualization are handled using p5.js.

## Notes
- Requires a webcam
- Best experienced in Chromium-based browsers.
