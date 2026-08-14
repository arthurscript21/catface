// ---- Referencias a los elementos del HTML ----
const videoEl = document.getElementById('video');
const canvasEl = document.getElementById('overlay');
const ctx = canvasEl.getContext('2d');
const statusEl = document.getElementById('status');

function resizeCanvas() {
  canvasEl.width = videoEl.clientWidth;
  canvasEl.height = videoEl.clientHeight;
}
window.addEventListener('resize', resizeCanvas);

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
  width: 500,
  height: 500
});
camera.start().catch(() => {
  statusEl.textContent = 'no se pudo acceder a la cámara';
});