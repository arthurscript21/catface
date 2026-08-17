// ============================================================
// catface - deteccion de gestos con MediaPipe Hands
// ============================================================

// ---- elementos del DOM ----
const videoEl = document.getElementById('video');
const canvasEl = document.getElementById('overlay');
const ctx = canvasEl.getContext('2d');
const statusEl = document.getElementById('status');
const stageEl = document.querySelector('.stage');
const memeEl = document.getElementById('meme');
const memePlaceholder = document.getElementById('meme-placeholder');
const gestureLabelEl = document.getElementById('gesture-label');
const loadingOverlay = document.getElementById('loading-overlay');

// ---- catalogo de gestos y sus memes ----
const GESTURES = {
  fist:          { img: 'image/memegato1.jpg', label: 'punho',        emoji: '?' },
  'thumbs-up':   { img: 'image/memegato3.jpg', label: 'pulgar arriba', emoji: '👍' },
  'middle-finger':{ img: 'image/memegato4.jpg', label: 'dedo medio',   emoji: '🖕' },
  'index-fingers':{ img: 'image/memegato5.jpg', label: 'indices juntos', emoji: ' Index' },
  pointing:      { img: 'image/memegato7.jpg', label: 'apuntando',    emoji: '👉' },
  'hands-up':    { img: 'image/memegato2.jpg', label: 'manos arriba', emoji: '   ' },
};

// ---- pre-cargar todas las imagenes ----
const imageCache = {};
let imagesLoaded = 0;
const totalImages = Object.keys(GESTURES).length;

Object.entries(GESTURES).forEach(([key, { img }]) => {
  const image = new Image();
  image.onload = () => {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
      loadingOverlay.classList.add('hidden');
    }
  };
  image.onerror = () => {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
      loadingOverlay.classList.add('hidden');
    }
  };
  image.src = img;
  imageCache[key] = image;
});

// ---- canvas resize ----
function resizeCanvas() {
  canvasEl.width = videoEl.clientWidth;
  canvasEl.height = videoEl.clientHeight;
}

// ---- ajustar tamano del stage segun la camara ----
function fitStage() {
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  if (!vw || !vh) return;

  const maxW = Math.min(window.innerWidth * 0.92, 1100);
  const maxH = window.innerHeight * 0.75;
  const scale = Math.min(maxW / vw, maxH / vh);

  stageEl.style.width  = `${vw * scale}px`;
  stageEl.style.height = `${vh * scale}px`;
  resizeCanvas();
}

videoEl.addEventListener('loadedmetadata', fitStage);
window.addEventListener('resize', fitStage);

// ---- utilidad: distancia entre landmarks ----
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ============================================================
// detectores de gestos (1 mano)
// ============================================================

function isFist(landmarks) {
  const wrist = landmarks[0];
  const palmCenter = landmarks[9];
  const thumbClosed = dist(landmarks[4], wrist) < dist(landmarks[2], wrist) * 1.05;

  const todosDoblados = [
    { tip: 8, mcp: 5 }, { tip: 12, mcp: 9 },
    { tip: 16, mcp: 13 }, { tip: 20, mcp: 17 }
  ].every(({ tip, mcp }) => {
    return dist(landmarks[tip], wrist) < dist(landmarks[mcp], wrist) * 1.1
        && dist(landmarks[tip], palmCenter) < 0.28;
  });

  return thumbClosed && todosDoblados;
}

function isThumbsUp(landmarks) {
  const wrist = landmarks[0];
  const palmCenter = landmarks[9];

  const todosDoblados = [
    { tip: 8, mcp: 5 }, { tip: 12, mcp: 9 },
    { tip: 16, mcp: 13 }, { tip: 20, mcp: 17 }
  ].every(({ tip, mcp }) => {
    return dist(landmarks[tip], wrist) < dist(landmarks[mcp], wrist) * 1.1
        && dist(landmarks[tip], palmCenter) < 0.28;
  });

  const thumbTip = landmarks[4];
  const thumbBase = landmarks[2];
  const thumbExtended = dist(thumbTip, wrist) > dist(thumbBase, wrist) * 1.2;
  const thumbPointingUp = thumbTip.y < thumbBase.y - 0.05;

  return todosDoblados && thumbExtended && thumbPointingUp;
}

function isMiddleFingerUp(landmarks) {
  const wrist = landmarks[0];
  const palmCenter = landmarks[9];

  const otrosDoblados = [
    { tip: 8, mcp: 5 }, { tip: 16, mcp: 13 }, { tip: 20, mcp: 17 }
  ].every(({ tip, mcp }) => {
    return dist(landmarks[tip], wrist) < dist(landmarks[mcp], wrist) * 1.1
        && dist(landmarks[tip], palmCenter) < 0.28;
  });

  const middleExtended = dist(landmarks[12], wrist) > dist(landmarks[9], wrist) * 1.3;
  return otrosDoblados && middleExtended;
}

function isIndexPointingForward(landmarks) {
  const wrist = landmarks[0];
  const palmCenter = landmarks[9];

  const otrosDoblados = [
    { tip: 4, mcp: 2 }, { tip: 12, mcp: 9 },
    { tip: 16, mcp: 13 }, { tip: 20, mcp: 17 }
  ].every(({ tip, mcp }) => {
    return dist(landmarks[tip], wrist) < dist(landmarks[mcp], wrist) * 1.1
        && dist(landmarks[tip], palmCenter) < 0.28;
  });

  const indexExtended = dist(landmarks[8], wrist) > dist(landmarks[5], wrist) * 1.3;
  return otrosDoblados && indexExtended;
}

// ============================================================
// detectores de gestos (2 manos)
// ============================================================

function isIndexFingersJoined(handLandmarks) {
  if (!handLandmarks || handLandmarks.length < 2) return false;
  const tips = handLandmarks.map(lm => lm[8]);
  return dist(tips[0], tips[1]) < 0.08;
}

function isOpenPalmsNearHead(handLandmarks) {
  if (!handLandmarks || handLandmarks.length < 2) return false;

  const openHands = handLandmarks.filter((landmarks) => {
    const wrist = landmarks[0];
    const palmCenter = landmarks[9];
    const dedosAbiertos = [
      { tip: 8, mcp: 5 }, { tip: 12, mcp: 9 },
      { tip: 16, mcp: 13 }, { tip: 20, mcp: 17 }
    ].filter(({ tip, mcp }) => dist(landmarks[tip], wrist) > dist(landmarks[mcp], wrist) * 1.18).length;

    return dedosAbiertos >= 3
        && palmCenter.y > 0.08 && palmCenter.y < 0.7
        && (palmCenter.x < 0.38 || palmCenter.x > 0.62);
  });

  if (openHands.length < 2) return false;

  const left  = openHands.reduce((m, h) => h[9].x < m[9].x ? h : m, openHands[0]);
  const right = openHands.reduce((m, h) => h[9].x > m[9].x ? h : m, openHands[0]);

  return Math.abs(left[9].x - right[9].x) > 0.22
      && Math.abs(left[9].y - right[9].y) < 0.25
      && left[9].x < 0.45
      && right[9].x > 0.55;
}

// ============================================================
// estabilidad: evitar parpadeo entre gestos
// ============================================================

let currentGesture = null;
let gestureHoldFrames = 0;
const HOLD_THRESHOLD = 4; // frames consecutivos para confirmar

function stabilizeGesture(detected) {
  if (detected === currentGesture) {
    gestureHoldFrames++;
    return gestureHoldFrames >= HOLD_THRESHOLD ? currentGesture : null;
  }
  currentGesture = detected;
  gestureHoldFrames = 1;
  return null;
}

// ============================================================
// actualizar UI segun el gesto detectado
// ============================================================

function setActiveGesture(gestureKey) {
  memeEl.classList.remove('visible');
  gestureLabelEl.classList.remove('visible');
  stageEl.classList.remove('active');

  // quitar activo de la guia
  document.querySelectorAll('.gesture-item').forEach(el => el.classList.remove('active'));

  if (gestureKey && GESTURES[gestureKey]) {
    const { label, emoji } = GESTURES[gestureKey];

    memeEl.src = imageCache[gestureKey].src;
    memeEl.classList.add('visible');
    memePlaceholder.classList.add('hidden');

    gestureLabelEl.textContent = `${emoji} ${label}`;
    gestureLabelEl.classList.add('visible');
    stageEl.classList.add('active');

    const guideItem = document.querySelector(`[data-gesture="${gestureKey}"]`);
    if (guideItem) guideItem.classList.add('active');
  } else {
    memeEl.src = '';
    memePlaceholder.classList.remove('hidden');
  }
}

// ============================================================
// esqueleto de la mano
// ============================================================

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17]
];

function drawHand(landmarks) {
  const w = canvasEl.width;
  const h = canvasEl.height;

  ctx.strokeStyle = '#39ff6a';
  ctx.lineWidth = 2;
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
    ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
    ctx.stroke();
  }

  ctx.fillStyle = '#39ff6a';
  for (const p of landmarks) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================
// callback principal de MediaPipe
// ============================================================

function onResults(results) {
  resizeCanvas();
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    statusEl.textContent = 'buscando mano...';
    statusEl.classList.remove('error');
    gestureHoldFrames = 0;
    currentGesture = null;
    setActiveGesture(null);
    return;
  }

  statusEl.textContent = 'mano detectada';

  for (const landmarks of results.multiHandLandmarks) {
    drawHand(landmarks);
  }

  // detectar todos los gestos
  let rawGesture = null;

  for (const landmarks of results.multiHandLandmarks) {
    if (isFist(landmarks))            { rawGesture = 'fist'; break; }
    if (isThumbsUp(landmarks))        { rawGesture = 'thumbs-up'; break; }
    if (isMiddleFingerUp(landmarks))  { rawGesture = 'middle-finger'; break; }
    if (isIndexPointingForward(landmarks)) { rawGesture = 'pointing'; break; }
  }

  if (!rawGesture) {
    rawGesture = isIndexFingersJoined(results.multiHandLandmarks) ? 'index-fingers' : null;
  }
  if (!rawGesture) {
    rawGesture = isOpenPalmsNearHead(results.multiHandLandmarks) ? 'hands-up' : null;
  }

  const confirmed = stabilizeGesture(rawGesture);
  setActiveGesture(confirmed);
}

// ============================================================
// inicializar MediaPipe + camara
// ============================================================

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});
hands.onResults(onResults);

const camera = new Camera(videoEl, {
  onFrame: async () => { await hands.send({ image: videoEl }); },
  width: 1280,
  height: 720
});
camera.start().catch(() => {
  statusEl.textContent = 'no se pudo acceder a la camara';
  statusEl.classList.add('error');
  loadingOverlay.classList.add('hidden');
});
