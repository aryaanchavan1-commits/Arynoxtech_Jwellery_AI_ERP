export function toGrayscale(pixels) {
  const len = pixels.length;
  const gray = new Float32Array(len / 4);
  for (let i = 0; i < len; i += 4) {
    gray[i / 4] = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
  }
  return gray;
}

export function sobelEdges(gray, width, height) {
  const magnitude = new Float32Array(gray.length);
  const gx = new Float32Array(gray.length);
  const gy = new Float32Array(gray.length);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      gx[idx] =
        -gray[idx - width - 1] + gray[idx - width + 1]
        - 2 * gray[idx - 1] + 2 * gray[idx + 1]
        - gray[idx + width - 1] + gray[idx + width + 1];
      gy[idx] =
        -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1]
        + gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1];
      magnitude[idx] = Math.sqrt(gx[idx] * gx[idx] + gy[idx] * gy[idx]);
    }
  }
  return { magnitude, gx, gy };
}

export function nonMaxSuppression(magnitude, gx, gy, width, height) {
  const suppressed = new Float32Array(magnitude.length);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const angle = Math.atan2(gy[idx], gx[idx]) * (180 / Math.PI);
      const mag = magnitude[idx];
      let neighbor1 = 0, neighbor2 = 0;

      if ((angle >= -22.5 && angle <= 22.5) || (angle >= 157.5 || angle <= -157.5)) {
        neighbor1 = magnitude[idx - 1];
        neighbor2 = magnitude[idx + 1];
      } else if ((angle >= 22.5 && angle <= 67.5) || (angle >= -157.5 && angle <= -112.5)) {
        neighbor1 = magnitude[idx - width - 1];
        neighbor2 = magnitude[idx + width + 1];
      } else if ((angle >= 67.5 && angle <= 112.5) || (angle >= -112.5 && angle <= -67.5)) {
        neighbor1 = magnitude[idx - width];
        neighbor2 = magnitude[idx + width];
      } else {
        neighbor1 = magnitude[idx - width + 1];
        neighbor2 = magnitude[idx + width - 1];
      }

      if (mag >= neighbor1 && mag >= neighbor2) {
        suppressed[idx] = mag;
      }
    }
  }
  return suppressed;
}

export function hysteresisThreshold(edges, low, high, width) {
  const result = new Float32Array(edges.length);
  const visited = new Uint8Array(edges.length);
  const queue = [];

  for (let i = 0; i < edges.length; i++) {
    if (edges[i] >= high) {
      result[i] = 255;
      queue.push(i);
      visited[i] = 1;
    }
  }

  while (queue.length > 0) {
    const idx = queue.pop();
    const y = Math.floor(idx / width);
    const x = idx % width;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ni = (y + dy) * width + (x + dx);
        if (ni >= 0 && ni < edges.length && !visited[ni] && edges[ni] >= low) {
          result[ni] = 255;
          visited[ni] = 1;
          queue.push(ni);
        }
      }
    }
  }
  return result;
}

function lineLength(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function findCornersFromEdges(edges, width, height) {
  const points = [];
  for (let y = 10; y < height - 10; y++) {
    for (let x = 10; x < width - 10; x++) {
      if (edges[y * width + x] > 0) {
        points.push({ x, y, score: 0 });
      }
    }
  }
  if (points.length < 100) return null;

  for (const p of points) {
    const px = p.x, py = p.y;
    let sum = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const ni = (py + dy) * width + (px + dx);
        if (edges[ni] > 0) sum++;
      }
    }
    p.score = sum;
  }

  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

  const quadrants = [
    points.filter(p => p.x <= cx && p.y <= cy),
    points.filter(p => p.x > cx && p.y <= cy),
    points.filter(p => p.x <= cx && p.y > cy),
    points.filter(p => p.x > cx && p.y > cy),
  ];

  const corners = quadrants.map(q => {
    if (q.length === 0) return null;
    q.sort((a, b) => b.score - a.score);
    let best = q[0];
    let bestDist = 0;
    for (const p of q.slice(0, Math.min(20, q.length))) {
      const dist = (p.x - cx) ** 2 + (p.y - cy) ** 2;
      if (dist > bestDist) {
        bestDist = dist;
        best = p;
      }
    }
    return { x: best.x, y: best.y };
  });

  if (corners.some(c => !c)) return null;
  return corners;
}

export function detectPaperCorners(imageData, width, height) {
  const gray = toGrayscale(imageData);
  const { magnitude, gx, gy } = sobelEdges(gray, width, height);
  const nms = nonMaxSuppression(magnitude, gx, gy, width, height);
  const edges = hysteresisThreshold(nms, 25, 50, width);
  const corners = findCornersFromEdges(edges, width, height);
  return corners;
}

export function drawCorners(ctx, corners, width, height) {
  if (!corners) return;
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  for (const c of corners) {
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function getPaperDimensions(corners) {
  if (!corners || corners.length < 4) return null;
  const w1 = lineLength(corners[0].x, corners[0].y, corners[1].x, corners[1].y);
  const w2 = lineLength(corners[3].x, corners[3].y, corners[2].x, corners[2].y);
  const h1 = lineLength(corners[0].x, corners[0].y, corners[3].x, corners[3].y);
  const h2 = lineLength(corners[1].x, corners[1].y, corners[2].x, corners[2].y);
  return {
    widthPx: (w1 + w2) / 2,
    heightPx: (h1 + h2) / 2,
    aspectRatio: (w1 + w2) / (h1 + h2 + 0.001),
  };
}
