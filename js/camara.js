// ---- Referencias a los elementos del HTML ----
const videoEl = document.getElementById('video');
const canvasEl = document.getElementById('overlay');
const ctx = canvasEl.getContext('2d');
const statusEl = document.getElementById('status');
const stageEl = document.querySelector('.stage');
const memeEl = document.getElementById('meme');

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

// ---- Imagenes para cada gesto ----
const memeFistImg = new Image();
const memeHandsUpImg = new Image();

memeFistImg.onload = () => {
  if (memeEl.classList.contains('visible-fist')) {
    memeEl.src = memeFistImg.src;
  }
};

memeHandsUpImg.onload = () => {
  if (memeEl.classList.contains('visible-hands-up')) {
    memeEl.src = memeHandsUpImg.src;
  }
};

memeFistImg.src = 'image/memegato1.jpg';
memeHandsUpImg.src = 'image/memegato2.jpg';

const memeThumbsUpImg = new Image();
const memeMiddleFingerImg = new Image();

memeThumbsUpImg.onload = () => {
  if (memeEl.classList.contains('visible-thumbs-up')) {
    memeEl.src = memeThumbsUpImg.src;
  }
};

memeMiddleFingerImg.onload = () => {
  if (memeEl.classList.contains('visible-middle-finger')) {
    memeEl.src = memeMiddleFingerImg.src;
  }
};

memeThumbsUpImg.src = 'image/memegato3.jpg';
memeMiddleFingerImg.src = 'image/memegato4.jpg';

const memeIndexFingersImg = new Image();

memeIndexFingersImg.onload = () => {
  if (memeEl.classList.contains('visible-index-fingers')) {
    memeEl.src = memeIndexFingersImg.src;
  }
};

memeIndexFingersImg.src = 'image/memegato5.jpg';

const memePointingImg = new Image();

memePointingImg.onload = () => {
  if (memeEl.classList.contains('visible-pointing')) {
    memeEl.src = memePointingImg.src;
  }
};

memePointingImg.src = 'image/memegato7.jpg';

// Distancia entre dos landmarks (en coordenadas normalizadas 0–1)
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Heurística flexible de "puño cerrado": sigue exigiendo que los 4 dedos
// estén doblados, pero con un margen más suave para que no sea tan rígida.
// Si solo se dobla 3 dedos, no lo cuenta como puño completo.
function isFist(landmarks) {
  const wrist = landmarks[0];
  const palmCenter = landmarks[9];

  const dedos = [
    { tip: 8, mcp: 5 },   // índice
    { tip: 12, mcp: 9 },  // medio
    { tip: 16, mcp: 13 }, // anular
    { tip: 20, mcp: 17 }  // meñique
  ];

  const thumbClosed = dist(landmarks[4], wrist) < dist(landmarks[2], wrist) * 1.05;

  const todosLosDedosDobgados = dedos.every(({ tip, mcp }) => {
    const tipToWrist = dist(landmarks[tip], wrist);
    const mcpToWrist = dist(landmarks[mcp], wrist);
    const tipToPalm = dist(landmarks[tip], palmCenter);

    return tipToWrist < mcpToWrist * 1.1 && tipToPalm < 0.28;
  });

  return thumbClosed && todosLosDedosDobgados;
}

// Pulgar arriba: los otros 4 dedos doblados (igual que en isFist)
// pero el pulgar extendido y apuntando hacia arriba.
function isThumbsUp(landmarks) {
  const wrist = landmarks[0];
  const palmCenter = landmarks[9];

  const dedos = [
    { tip: 8, mcp: 5 },
    { tip: 12, mcp: 9 },
    { tip: 16, mcp: 13 },
    { tip: 20, mcp: 17 }
  ];

  const todosLosDedosDobgados = dedos.every(({ tip, mcp }) => {
    const tipToWrist = dist(landmarks[tip], wrist);
    const mcpToWrist = dist(landmarks[mcp], wrist);
    const tipToPalm = dist(landmarks[tip], palmCenter);
    return tipToWrist < mcpToWrist * 1.1 && tipToPalm < 0.28;
  });

  const thumbTip = landmarks[4];
  const thumbBase = landmarks[2];

  // el pulgar extendido (lejos de la muñeca, no metido como en el puño)
  const thumbExtended = dist(thumbTip, wrist) > dist(thumbBase, wrist) * 1.2;

  // y apuntando hacia arriba: su punta más "arriba" que su base
  // (en coordenadas de imagen, Y crece hacia abajo, por eso el <)
  const thumbPointingUp = thumbTip.y < thumbBase.y - 0.05;

  return todosLosDedosDobgados && thumbExtended && thumbPointingUp;
}

// Dedo medio solo: índice, anular y meñique doblados, medio extendido.
// No exigimos nada del pulgar porque en este gesto varía mucho de persona a persona.
function isMiddleFingerUp(landmarks) {
  const wrist = landmarks[0];
  const palmCenter = landmarks[9];

  const otrosDedos = [
    { tip: 8, mcp: 5 },   // índice
    { tip: 16, mcp: 13 }, // anular
    { tip: 20, mcp: 17 }  // meñique
  ];

  const otrosDoblados = otrosDedos.every(({ tip, mcp }) => {
    const tipToWrist = dist(landmarks[tip], wrist);
    const mcpToWrist = dist(landmarks[mcp], wrist);
    const tipToPalm = dist(landmarks[tip], palmCenter);
    return tipToWrist < mcpToWrist * 1.1 && tipToPalm < 0.28;
  });

  const middleTip = landmarks[12];
  const middleMcp = landmarks[9];
  const middleExtended = dist(middleTip, wrist) > dist(middleMcp, wrist) * 1.3;

  return otrosDoblados && middleExtended;
}

// Detecta cuando los dos dedos índices de ambas manos se juntan
function isIndexFingersJoined(handLandmarks) {
  if (!handLandmarks || handLandmarks.length < 2) return false;

  const indexTips = handLandmarks.map(landmarks => landmarks[8]); // punto 8 es la punta del índice
  
  if (indexTips.length < 2) return false;
  
  // Calcula la distancia entre las puntas de los dos índices
  const indexDistance = dist(indexTips[0], indexTips[1]);
  
  // Si están a menos de 0.08 unidades de distancia (normalizadas), están juntos
  return indexDistance < 0.08;
}

// Detecta cuando el dedo índice está extendido apuntando (hacia la cámara)
// y los otros dedos están doblados
function isIndexPointingForward(landmarks) {
  const wrist = landmarks[0];
  const palmCenter = landmarks[9];

  // Dedos que deben estar doblados: pulgar, medio, anular, meñique
  const otrosDedos = [
    { tip: 4, mcp: 2 },   // pulgar
    { tip: 12, mcp: 9 },  // medio
    { tip: 16, mcp: 13 }, // anular
    { tip: 20, mcp: 17 }  // meñique
  ];

  const otrosDoblados = otrosDedos.every(({ tip, mcp }) => {
    const tipToWrist = dist(landmarks[tip], wrist);
    const mcpToWrist = dist(landmarks[mcp], wrist);
    const tipToPalm = dist(landmarks[tip], palmCenter);
    return tipToWrist < mcpToWrist * 1.1 && tipToPalm < 0.28;
  });

  // Índice extendido
  const indexTip = landmarks[8];
  const indexMcp = landmarks[5];
  const indexExtended = dist(indexTip, wrist) > dist(indexMcp, wrist) * 1.3;

  return otrosDoblados && indexExtended;
}

// Detecta dos manos con la palma abierta a los lados de la cabeza,
// como en tu referencia: una mano a la izquierda y otra a la derecha,
// con los dedos extendidos y la palma en altura media/alta.
function isOpenPalmsNearHead(handLandmarks) {
  if (!handLandmarks || handLandmarks.length < 2) return false;

  const openHands = handLandmarks.filter((landmarks) => {
    const wrist = landmarks[0];
    const palmCenter = landmarks[9];
    const dedos = [
      { tip: 8, mcp: 5 },
      { tip: 12, mcp: 9 },
      { tip: 16, mcp: 13 },
      { tip: 20, mcp: 17 }
    ];

    const dedosAbiertos = dedos.filter(({ tip, mcp }) => {
      const tipToWrist = dist(landmarks[tip], wrist);
      const mcpToWrist = dist(landmarks[mcp], wrist);
      return tipToWrist > mcpToWrist * 1.18;
    }).length;

    const palmOpen = dedosAbiertos >= 3;
    const bodyHeight = palmCenter.y > 0.08 && palmCenter.y < 0.7;
    const sideOfHead = palmCenter.x < 0.38 || palmCenter.x > 0.62;

    return palmOpen && bodyHeight && sideOfHead;
  });

  if (openHands.length < 2) return false;

  const leftHand = openHands.reduce((min, hand) => hand[9].x < min[9].x ? hand : min, openHands[0]);
  const rightHand = openHands.reduce((max, hand) => hand[9].x > max[9].x ? hand : max, openHands[0]);

  const separation = Math.abs(leftHand[9].x - rightHand[9].x);
  const verticalMatch = Math.abs(leftHand[9].y - rightHand[9].y) < 0.25;
  const leftIsLeft = leftHand[9].x < 0.45;
  const rightIsRight = rightHand[9].x > 0.55;

  return separation > 0.22 && verticalMatch && leftIsLeft && rightIsRight;
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

  let fistDetected = false;
  let thumbsUpDetected = false;
  let middleFingerDetected = false;
  let openPalmsHeadDetected = false;
  let indexFingersJoined = false;
  let indexPointingForward = false;

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

      if (isFist(landmarks)) {
        fistDetected = true;
      }
      if (isThumbsUp(landmarks)) {
        thumbsUpDetected = true;
      }
      if (isMiddleFingerUp(landmarks)) {
        middleFingerDetected = true;
      }
      if (isIndexPointingForward(landmarks)) {
        indexPointingForward = true;
      }
    }

    openPalmsHeadDetected = isOpenPalmsNearHead(results.multiHandLandmarks);
    indexFingersJoined = isIndexFingersJoined(results.multiHandLandmarks);

    memeEl.classList.remove(
      'visible', 'visible-fist', 'visible-hands-up',
      'visible-thumbs-up', 'visible-middle-finger', 'visible-index-fingers', 'visible-pointing'
    );

    if (fistDetected) {
      memeEl.classList.add('visible', 'visible-fist');
      memeEl.src = memeFistImg.src;
    } else if (thumbsUpDetected) {
      memeEl.classList.add('visible', 'visible-thumbs-up');
      memeEl.src = memeThumbsUpImg.src;
    } else if (middleFingerDetected) {
      memeEl.classList.add('visible', 'visible-middle-finger');
      memeEl.src = memeMiddleFingerImg.src;
    } else if (indexFingersJoined) {
      memeEl.classList.add('visible', 'visible-index-fingers');
      memeEl.src = memeIndexFingersImg.src;
    } else if (indexPointingForward) {
      memeEl.classList.add('visible', 'visible-pointing');
      memeEl.src = memePointingImg.src;
    } else if (openPalmsHeadDetected) {
      memeEl.classList.add('visible', 'visible-hands-up');
      memeEl.src = memeHandsUpImg.src;
    }
  } else {
    statusEl.textContent = 'buscando mano…';
    memeEl.classList.remove(
      'visible', 'visible-fist', 'visible-hands-up',
      'visible-thumbs-up', 'visible-middle-finger', 'visible-index-fingers', 'visible-pointing'
    );
    memeEl.src = '';
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