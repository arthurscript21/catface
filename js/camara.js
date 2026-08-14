// ---- Referencias a los elementos del HTML ----
const videoEl = document.getElementById('video');
const canvasEl = document.getElementById('overlay');
const ctx = canvasEl.getContext('2d');
const statusEl = document.getElementById('status');
const stageEl = document.querySelector('.stage');

function resizeCanvas() {
  canvasEl.width = videoEl.clientWidth;
  canvasEl.height = videoEl.clientHeight;
}

// Calcula el tamaño del recuadro (.stage) usando la proporción REAL
// de tu cámara (videoWidth x videoHeight), en vez de una fija.
// Así entra completa, sin recortarse, en cualquier pantalla.
function fitStage() {
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  if (!vw || !vh) return; // la cámara todavía no informó su tamaño real

  const maxW = Math.min(window.innerWidth * 0.92, 1100);
  const maxH = window.innerHeight * 0.8;

  // escala más grande que quepa manteniendo la proporción de la cámara
  const scale = Math.min(maxW / vw, maxH / vh);

  stageEl.style.width = `${vw * scale}px`;
  stageEl.style.height = `${vh * scale}px`;

  resizeCanvas();
}

videoEl.addEventListener('loadedmetadata', fitStage);
window.addEventListener('resize', fitStage);

// ---- Imagen que aparece cuando detectamos un puño ----
const memeImg = new Image();
memeImg.src = '../image/memegato1.jpg';

// Distancia entre dos landmarks (en coordenadas normalizadas 0–1)
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Heurística simple de "puño cerrado": si la punta de cada dedo está
// más cerca de la muñeca que su nudillo base, ese dedo está doblado.
// Con al menos 3 de los 4 dedos doblados, lo contamos como puño.
function isFist(landmarks) {
  const wrist = landmarks[0];
  const dedos = [
    { tip: 8, mcp: 5 },   // índice
    { tip: 12, mcp: 9 },  // medio
    { tip: 16, mcp: 13 }, // anular
    { tip: 20, mcp: 17 }  // meñique
  ];
  let dobladosCount = 0;
  for (const d of dedos) {
    if (dist(landmarks[d.tip], wrist) < dist(landmarks[d.mcp], wrist)) {
      dobladosCount++;
    }
  }
  return dobladosCount >= 3;
}

// Los 21 puntos que detecta MediaPipe en una mano, y qué puntos
// se conectan entre sí para dibujar el "esqueleto".
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],       // pulgar
  [0,5],[5,6],[6,7],[7,8],       // índice
  [0,9],[9,10],[10,11],[11,12],  // medio
  [0,13],[13,14],[14,15],[15,16],// anular
  [0,17],[17,18],[18,19],[19,20],// meñique
  [5,9],[9,13],[13,17]           // palma
];

// Esta función se llama automáticamente en cada frame de la cámara
function onResults(results) {
  resizeCanvas();
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    statusEl.textContent = 'mano detectada';

    for (const landmarks of results.multiHandLandmarks) {
      // líneas del esqueleto
      ctx.strokeStyle = '#39ff6a';
      ctx.lineWidth = 2;
      for (const [a, b] of HAND_CONNECTIONS) {
        const p1 = landmarks[a];
        const p2 = landmarks[b];
        ctx.beginPath();
        ctx.moveTo(p1.x * canvasEl.width, p1.y * canvasEl.height);
        ctx.lineTo(p2.x * canvasEl.width, p2.y * canvasEl.height);
        ctx.stroke();
      }
      // puntos (articulaciones)
      ctx.fillStyle = '#39ff6a';
      for (const p of landmarks) {
        ctx.beginPath();
        ctx.arc(p.x * canvasEl.width, p.y * canvasEl.height, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // si la mano está en forma de puño, dibuja la imagen al lado
      if (isFist(landmarks) && memeImg.complete) {
        const centro = landmarks[9]; // aprox. centro de la palma
        const cx = centro.x * canvasEl.width;
        const cy = centro.y * canvasEl.height;

        const memeSize = canvasEl.width * 0.3;
        const offsetX = memeSize * 0.9; // qué tan "al lado" aparece

        ctx.save();
        // usamos -offsetX porque el canvas está espejado por CSS:
        // así la imagen aparece a la DERECHA de tu puño tal como
        // TÚ lo ves en pantalla. Si prefieres que salga a la
        // izquierda, cambia el signo a +offsetX.
        ctx.translate(cx - offsetX, cy);
        ctx.scale(-1, 1); // des-espeja el dibujo (si no, saldría al revés)
        ctx.drawImage(memeImg, -memeSize / 2, -memeSize / 2, memeSize, memeSize);
        ctx.restore();
      }
    }
  } else {
    statusEl.textContent = 'buscando mano…';
  }
}

// ---- Configuración de MediaPipe Hands ----
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

// ---- Encender la cámara y mandarle cada frame a MediaPipe ----
const camera = new Camera(videoEl, {
  onFrame: async () => { await hands.send({ image: videoEl }); },
  width: 1280,   // resolución "ideal": el navegador ajusta a lo más
  height: 720    // cercano que tu cámara soporte, sin forzar un recorte
});
camera.start().catch(() => {
  statusEl.textContent = 'no se pudo acceder a la cámara';
});