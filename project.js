let video;
let handPose;
let hands = [];
let mode = 'hand'; // 'hand' or 'sequencer'
let audioStarted = false;
let previousFingers = 0;
let gestureStartTime = 0;
let lastToggleTime = 0;
let hasToggledForCurrentGesture = false;

let previousLeftFingers = 0;
let leftGestureStartTime = 0;
let hasSwitchedScaleForCurrentGesture = false;
let previousRightFingers = 0;
let rightGestureStartTime = 0;
let hasToggledSequencerForCurrentGesture = false;
let leftExtendedFingers = 0;
let rightExtendedFingers = 0;

const GESTURE_DELAY = 300; // ms
let previousWristY = 0;
const TEMPO_THRESHOLD = 25; // pixels

// Sequencer variables
let oscs = [];
let envs = [];
let sequencers = [];
let currentSequencer = 0;
let activeSequencers = [true, false, false, false]; // Which sequencers are playing
const ROWS = 8;
let COLS = 16;
const MIN_COLS = 4;
const MAX_COLS = 128;
let tempo = 80;
let tempoSlider;
let currentStep = 0;
let lastStepTime = 0;
let isPlaying = false;
let CELL_SIZE;
let MARGIN;
let gridX, gridY;
let visibleCols = 0;
let scrollCol = 0;
let colIncButton, colDecButton, colDisplay;
let scrollSlider;
let oscTypeSelect;
let t1Button, t2Button, t3Button, t4Button;
const frequenciesOptions = {
  'C Major': [130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63], // C3 to C4
  'A Minor': [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00], // A3 to A4
  'E Major': [164.81, 185.00, 207.65, 220.00, 246.94, 277.18, 311.13, 329.63] // E3 to E4
};
let frequencies = frequenciesOptions['C Major'];
let oscTypes = ['sine', 'sine', 'sine', 'sine'];


// Add scale options and current scale
let scaleSelect;
let currentScale = 'C Major';

function countExtendedFingersLeft(hand) {
  let count = 0;
  // Thumb: For left hand, tip (4) is to the right of IP joint (3)
  if (hand.keypoints[4].x > hand.keypoints[3].x) count++;
  // Index: Tip (8) above PIP (6)
  if (hand.keypoints[8].y < hand.keypoints[6].y) count++;
  // Middle: Tip (12) above PIP (10)
  if (hand.keypoints[12].y < hand.keypoints[10].y) count++;
  // Ring: Tip (16) above PIP (14)
  if (hand.keypoints[16].y < hand.keypoints[14].y) count++;
  // Pinky: Tip (20) above PIP (18)
  if (hand.keypoints[20].y < hand.keypoints[18].y) count++;
  return count;
}

function countExtendedFingersRight(hand) {
  let count = 0;
  // Thumb: For right hand, tip (4) is to the left of IP joint (3)
  if (hand.keypoints[4].x < hand.keypoints[3].x) count++;
  // Index: Tip (8) above PIP (6)
  if (hand.keypoints[8].y < hand.keypoints[6].y) count++;
  // Middle: Tip (12) above PIP (10)
  if (hand.keypoints[12].y < hand.keypoints[10].y) count++;
  // Ring: Tip (16) above PIP (14)
  if (hand.keypoints[16].y < hand.keypoints[14].y) count++;
  // Pinky: Tip (20) above PIP (18)
  if (hand.keypoints[20].y < hand.keypoints[18].y) count++;
  return count;
}

function mousePressed() {
  if (!audioStarted) {
    userStartAudio();
    audioStarted = true;
  }
  if (mode === 'hand') {
    console.log(hands);
  } else {
    // Sequencer mouse handling
    const startCol = scrollCol;
    const endCol = min(COLS, scrollCol + visibleCols);
    if (mouseX > gridX && mouseX < gridX + (endCol - startCol) * CELL_SIZE &&
        mouseY > gridY && mouseY < gridY + ROWS * CELL_SIZE) {
      const col = floor((mouseX - gridX) / CELL_SIZE) + scrollCol;
      const row = floor((mouseY - gridY) / CELL_SIZE);
      if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
        sequencers[currentSequencer][row][col] = !sequencers[currentSequencer][row][col];
      }
      return false;
    }
  }
}

function gotHands(results) {
  hands = results;
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Hand mode setup
  video = createCapture(VIDEO);
  video.hide();
  
  // Define the modelReady callback
  function modelReady() {
    console.log("Hand pose model loaded");
    handPose.detectStart(video, gotHands);
  }
  
  // Pass the callback to ml5.handPose
  handPose = ml5.handPose(video, { flipped: true }, modelReady);

  // Remove the immediate detectStart call here, as it's now inside modelReady
  // handPose.detectStart(video, gotHands); // <-- Remove this line

  // Sequencer setup
  for (let i = 0; i < 4; i++) {
    oscs[i] = new p5.Oscillator('sine');
    oscs[i].start();
    oscs[i].amp(0);
    envs[i] = new p5.Envelope();
    envs[i].setADSR(0.02, 0.1, 0.8, 0.1);
    envs[i].setRange(1.0, 0);
  }
  for (let s = 0; s < 4; s++) {
    sequencers[s] = [];
    for (let i = 0; i < ROWS; i++) {
      sequencers[s][i] = [];
      for (let j = 0; j < COLS; j++) {
        sequencers[s][i][j] = false;
      }
    }
  }

  tempoSlider = createSlider(40, 240, tempo, 1);
  tempoSlider.style('width', '150px');

  colDecButton = createButton('−');
  colIncButton = createButton('+');
  colDisplay = createDiv('Cols: ' + COLS);
  [colDecButton, colIncButton].forEach(b => {
    b.style('font-family', 'Arial, sans-serif');
    b.style('font-size', '14px');
    b.style('padding', '4px 8px');
    b.style('margin', '0 4px');
  });
  colDecButton.mousePressed(decreaseCols);
  colIncButton.mousePressed(increaseCols);
  colDisplay.style('color', '#fff');
  colDisplay.style('font-family', 'Arial, sans-serif');
  colDisplay.style('font-size', '13px');

  scrollSlider = createSlider(0, 0, 0, 1);
  scrollSlider.style('width', '200px');
  scrollSlider.input(() => {
    scrollCol = int(scrollSlider.value());
  });

  oscTypeSelect = createSelect();
  oscTypeSelect.option('sine');
  oscTypeSelect.option('square');
  oscTypeSelect.option('triangle');
  oscTypeSelect.option('sawtooth');
  oscTypeSelect.selected('sine');
  oscTypeSelect.changed(() => {
    oscTypes[currentSequencer] = oscTypeSelect.value();
    oscs[currentSequencer].setType(oscTypes[currentSequencer]);
  });

  // Add scale selector
  scaleSelect = createSelect();
  scaleSelect.option('C Major');
  scaleSelect.option('A Minor');
  scaleSelect.option('E Major');
  scaleSelect.selected('C Major');
  scaleSelect.changed(() => {
    currentScale = scaleSelect.value();
    frequencies = frequenciesOptions[currentScale];
  });

  t1Button = createButton('T1');
  t2Button = createButton('T2');
  t3Button = createButton('T3');
  t4Button = createButton('T4');
  [t1Button, t2Button, t3Button, t4Button].forEach(b => {
    b.style('font-family', 'Arial, sans-serif');
    b.style('font-size', '14px');
    b.style('padding', '4px 8px');
    b.style('margin', '0 4px');
  });
  t1Button.mousePressed(() => { currentSequencer = 0; activeSequencers[0] = !activeSequencers[0]; });
  t2Button.mousePressed(() => { currentSequencer = 1; activeSequencers[1] = !activeSequencers[1]; });
  t3Button.mousePressed(() => { currentSequencer = 2; activeSequencers[2] = !activeSequencers[2]; });
  t4Button.mousePressed(() => { currentSequencer = 3; activeSequencers[3] = !activeSequencers[3]; });

  calculateDimensions();
}

function draw() {
  if (mode === 'hand') {
    background(22);
    isPlaying = true;
    if (isPlaying) {
      updateSequencer();
    }
    if (hands.length > 0) {
      for (hand of hands) {
        if (hand.confidence > 0.1) {
          if (hand.handedness === 'Left') {
            fill(255, 0, 0);
          } else {
            fill(0, 255, 0);
          }
          for (let i = 0; i < hand.keypoints.length; i++) {
            let keypoint = hand.keypoints[i];
            noStroke();
            ellipse(keypoint.x, keypoint.y, 10, 10);
          }
          let connections = [
            [0,1],[1,2],[2,3],[3,4],
            [0,5],[5,6],[6,7],[7,8],
            [0,9],[9,10],[10,11],[11,12],
            [0,13],[13,14],[14,15],[15,16],
            [0,17],[17,18],[18,19],[19,20]
          ];
          stroke(0, 255, 0);
          noFill();
          for (let connection of connections) {
            let start = hand.keypoints[connection[0]];
            let end = hand.keypoints[connection[1]];
            line(start.x, start.y, end.x, end.y);
          }
          
          // Gesture-based control
          if (hand.handedness === 'Left') {
            leftExtendedFingers = countExtendedFingersLeft(hand);
          } else {
            rightExtendedFingers = countExtendedFingersRight(hand);
          }
          
          // Tempo control only for left hand with exactly one extended finger
          if (hand.handedness === 'Left' && leftExtendedFingers >= 4) {
            let wristY = hand.keypoints[0].y;
            if (wristY < previousWristY - TEMPO_THRESHOLD) {
              tempo = min(tempo + 10, 240);
              previousWristY = wristY;
            } else if (wristY > previousWristY + TEMPO_THRESHOLD) {
              tempo = max(tempo - 10, 40);
              previousWristY = wristY;
            }
            tempoSlider.value(tempo);
          }
          
          // Update gesture timing for right hand sequencer toggle
          if (rightExtendedFingers !== previousRightFingers) {
            gestureStartTime = millis();
            hasToggledForCurrentGesture = false;
            previousRightFingers = rightExtendedFingers;
          }
          
          // Toggle active sequencer after delay, only once per gesture, only for right hand
          if (hand.handedness === 'Right' && rightExtendedFingers >= 1 && rightExtendedFingers <= 4 && 
              millis() - gestureStartTime > GESTURE_DELAY && 
              !hasToggledForCurrentGesture) {
            activeSequencers[rightExtendedFingers - 1] = !activeSequencers[rightExtendedFingers - 1];
            lastToggleTime = millis();
            hasToggledForCurrentGesture = true;
          }
          
          // Scale switching for left hand with 1, 2, 3, or 4 extended fingers
          if (hand.handedness === 'Left') {
            if (leftExtendedFingers !== previousLeftFingers) {
              leftGestureStartTime = millis();
              hasSwitchedScaleForCurrentGesture = false;
              previousLeftFingers = leftExtendedFingers;
            }
            if (leftExtendedFingers >= 1 && leftExtendedFingers <= 3 && 
                millis() - leftGestureStartTime > GESTURE_DELAY && 
                !hasSwitchedScaleForCurrentGesture) {
              let scaleIndex = leftExtendedFingers - 1; // 0 for 1 finger, 1 for 2, 2 for 3
              let scaleNames = ['C Major', 'A Minor', 'E Major'];
              currentScale = scaleNames[scaleIndex];
              frequencies = frequenciesOptions[currentScale];
              scaleSelect.selected(currentScale); // Update the UI dropdown
              hasSwitchedScaleForCurrentGesture = true;
            }
          }
        }
      }
    }
    // Display current settings
    fill(255);
    textSize(14);
    text('Sequencer Tempo: ' + tempo.toFixed(0) + ' BPM', 10, height - 80);
    text('Current Scale: ' + currentScale, 10, height - 60);
    text('Oscillator: ' + oscTypeSelect.value(), 10, height - 40);
    let activeList = [];
    for (let i = 0; i < 4; i++) if (activeSequencers[i]) activeList.push('T' + (i + 1));
    text('Active Sequencers: ' + (activeList.length > 0 ? activeList.join(', ') : 'None'), 10, height - 20);
    // Instruction to switch modes
    textSize(12);
    fill(200);
    text("Press 'M' to switch to Sequencer mode", 10, 20);
    
    // Hide sequencer UI in hand mode
    tempoSlider.position(-1000, -1000);
    colDecButton.position(-1000, -1000);
    colIncButton.position(-1000, -1000);
    colDisplay.position(-1000, -1000);
    oscTypeSelect.position(-1000, -1000);
    scrollSlider.position(-1000, -1000);
    t1Button.position(-1000, -1000);
    t2Button.position(-1000, -1000);
    t3Button.position(-1000, -1000);
    t4Button.position(-1000, -1000);
    scaleSelect.position(-1000, -1000);
  } else {
    // Sequencer mode
    background(30);
    if (isPlaying) {
      updateSequencer();
    }
    colorMode(RGB, 255);
    fill(255);
    textSize(14);
    text('Tempo (BPM):', 10, 38);
    tempo = tempoSlider.value();
    text(tempo, 120, 38);
    tempoSlider.position(200, 20);
    const colCtrlX = 380;
    colDecButton.position(colCtrlX, 15);
    colIncButton.position(colCtrlX + 36, 15);
    colDisplay.position(colCtrlX + 80, 22);
    colDisplay.html('Cols: ' + COLS);

    oscTypeSelect.position(colCtrlX + 135, 22);
    
    scaleSelect.position(colCtrlX + 210, 22); // Position next to oscillator select

    t1Button.position(colCtrlX + 300, 15);
    t2Button.position(colCtrlX + 336, 15);
    t3Button.position(colCtrlX + 372, 15);
    t4Button.position(colCtrlX + 408, 15);

    // Update visual indicator for T buttons: active = green, inactive = dark.
    updateSequencerButtonsUI();
    fill(150);
    textSize(12);
    text('Click cells to toggle | SPACE play/pause | R reset | Left/Right scroll columns | Up/Down change tempo | M switch mode', 10, 60);
    drawGrid();
    const sliderX = gridX;
    const sliderY = gridY + ROWS * CELL_SIZE + 8;
    const sliderPixelWidth = visibleCols * CELL_SIZE;
    if (sliderPixelWidth > 0) {
      scrollSlider.position(sliderX, sliderY);
      scrollSlider.style('width', sliderPixelWidth + 'px');
      const maxScroll = max(0, COLS - visibleCols);
      scrollSlider.elt.max = maxScroll;
      scrollSlider.value(constrain(scrollCol, 0, maxScroll));
      fill(180);
      textSize(12);
      textAlign(LEFT);
      text('Scroll: ' + (scrollCol + 1) + ' - ' + min(COLS, scrollCol + visibleCols), sliderX + sliderPixelWidth - 50, sliderY + 50);
      textAlign(LEFT);
    } else {
      scrollSlider.position(-1000, -1000);
    }
    fill(100);
    text('Step: ' + (currentStep + 1) + ' / ' + COLS + (isPlaying ? ' [PLAYING]' : ' [STOPPED]'), 10, height - 20);
  }
}

function calculateDimensions() {
  const topMargin = 90;
  const bottomMargin = 80;
  const leftMargin = 80;
  const rightMargin = 20;
  const availableWidth = width - leftMargin - rightMargin;
  const availableHeight = height - topMargin - bottomMargin;
  const cellSizeByHeight = availableHeight / ROWS;
  const MAX_CELL = 120;
  const MIN_CELL = 20;
  CELL_SIZE = round(constrain(cellSizeByHeight, MIN_CELL, MAX_CELL));
  visibleCols = max(1, floor(availableWidth / CELL_SIZE));
  gridX = leftMargin;
  gridY = topMargin;
  scrollCol = constrain(scrollCol, 0, max(0, COLS - visibleCols));
}

function drawGrid() {
  const startCol = scrollCol;
  const endCol = min(COLS, scrollCol + visibleCols);
  for (let row = 0; row < ROWS; row++) {
    for (let col = startCol; col < endCol; col++) {
      const x = gridX + (col - startCol) * CELL_SIZE;
      const y = gridY + row * CELL_SIZE;
      if (col === currentStep) {
        fill(80, 150, 200, 180);
      } else if (sequencers[currentSequencer][row][col]) {
        fill(100, 200, 100);
      } else {
        if (isPlaying) {
          fill(50, 50, 50, 200);
        } else {
          fill(50, 50, 50);
        }
      }
      stroke(100);
      strokeWeight(1);
      rect(x, y, CELL_SIZE, CELL_SIZE);
      if (col === startCol) {
        fill(180);
        textSize(max(9, round(CELL_SIZE * 0.25)));
        textAlign(RIGHT);
        text(frequencies[row].toFixed(0), gridX - 10, y + CELL_SIZE / 2 + 4);
        textAlign(LEFT);
      }
    }
  }
  for (let i = 0; i < (endCol - startCol); i++) {
    const col = startCol + i;
    const x = gridX + i * CELL_SIZE;
    fill(150);
    textSize(max(9, round(CELL_SIZE * 0.23)));
    textAlign(CENTER);
    text(col + 1, x + CELL_SIZE / 2, gridY - 10);
  }
  textAlign(LEFT);
}

function updateSequencer() {
  const msPerStep = (60000 / tempo) / 4;
  if (millis() - lastStepTime > msPerStep) {
    lastStepTime = millis();
    currentStep = (currentStep + 1) % COLS;
    ensureStepVisible(currentStep);
    triggerStep(currentStep);
  }
}

function ensureStepVisible(step) {
  const maxScroll = max(0, COLS - visibleCols);
  if (step < scrollCol || step >= scrollCol + visibleCols) {
    const centerOffset = floor(visibleCols / 2);
    let target = step - centerOffset;
    target = constrain(target, 0, maxScroll);
    scrollCol = target;
    if (scrollSlider) {
      scrollSlider.value(scrollCol);
      scrollSlider.elt.max = maxScroll;
    }
  }
}

function triggerStep(step) {
  for (let s = 0; s < 4; s++) {
    if (activeSequencers[s]) {
      for (let row = 0; row < ROWS; row++) {
        if (sequencers[s][row][step]) {
          oscs[s].freq(frequencies[row]);
          envs[s].play(oscs[s], 0, 0.2);
        }
      }
    }
  }
}

function keyPressed() {
  if (!audioStarted) {
    userStartAudio();
    audioStarted = true;
  }
  if (key === 'm' || key === 'M') {
    mode = mode === 'hand' ? 'sequencer' : 'hand';
    return false;
  }
  if (mode === 'sequencer') {
    if (keyCode === LEFT_ARROW) {
      scrollCol = max(scrollCol - 1, 0);
      if (scrollSlider) scrollSlider.value(scrollCol);
      return false;
    }
    if (keyCode === RIGHT_ARROW) {
      const maxScroll = max(0, COLS - visibleCols);
      scrollCol = min(scrollCol + 1, maxScroll);
      if (scrollSlider) scrollSlider.value(scrollCol);
      return false;
    }
    if (keyCode === UP_ARROW) {
      tempo = min(tempo + 10, 240);
      tempoSlider.value(tempo);
      return false;
    }
    if (keyCode === DOWN_ARROW) {
      tempo = max(tempo - 10, 40);
      tempoSlider.value(tempo);
      return false;
    }
    if (key === '+' || key === '=') {
      increaseCols();
      return false;
    }
    if (key === '-') {
      decreaseCols();
      return false;
    }
    if (key === ' ') {
      isPlaying = !isPlaying;
      if (isPlaying) lastStepTime = millis();
      return false;
    }
    if (key === 'r' || key === 'R') {
      for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) sequencers[currentSequencer][i][j] = false;
      }
      currentStep = 0;
      isPlaying = false;
      return false;
    }
  }
}

//d
function increaseCols() {
  if (COLS >= MAX_COLS) return;
  const oldCols = COLS;
  COLS = min(COLS + 10, MAX_COLS);
  if (COLS <= oldCols) COLS = min(oldCols + 1, MAX_COLS);
  for (let s = 0; s < 4; s++) {
    for (let r = 0; r < ROWS; r++) {
      while (sequencers[s][r].length < COLS) sequencers[s][r].push(false);
    }
  }
  calculateDimensions();
}

//decrease columns and trim sequencer data if necessary
function decreaseCols() { 
  if (COLS <= MIN_COLS) return;
  const oldCols = COLS;
  COLS = max(floor(COLS - 10), MIN_COLS);
  if (COLS >= oldCols) COLS = max(oldCols - 1, MIN_COLS);
  for (let s = 0; s < 4; s++) {
    for (let r = 0; r < ROWS; r++) {
      if (sequencers[s][r].length > COLS) sequencers[s][r].length = COLS;
    }
  }
  currentStep = currentStep % COLS;
  scrollCol = constrain(scrollCol, 0, max(0, COLS - visibleCols));
  calculateDimensions();
}

function windowResized() {  
  resizeCanvas(windowWidth, windowHeight);
  calculateDimensions();
}

// Button Styles and Visual Feedback for Active Sequencers
function updateSequencerButtonsUI() {
  const buttons = [t1Button, t2Button, t3Button, t4Button];
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i];
    if (!b) continue;
    if (mode === 'sequencer') {
      if (activeSequencers[i]) {
        b.style('background-color', '#2ecc71');
        b.style('color', '#001');
      } else {
        b.style('background-color', '#333');
        b.style('color', '#fff');
      }
      if (currentSequencer === i) {
        b.style('box-shadow', '0 0 8px #f3eedd');
      } else {
        b.style('box-shadow', 'none');
      }
    } else {
      // reset to defaults when not in sequencer mode
      b.style('background-color', '');
      b.style('color', '');
      b.style('box-shadow', 'none');
    }
  }
}