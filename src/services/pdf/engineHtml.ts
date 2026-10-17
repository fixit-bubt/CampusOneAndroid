// The engine page. Written into engineDir() at startup next to the vendored
// pdf.js files, then loaded over file:// so it can fetch the document the
// native side dropped beside it. Nothing crosses the bridge on the way in.
import { TEXT_SAMPLE_PAGES } from './presets';

export function buildEngineHtml(): string {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- The page parses untrusted PDFs, and Android needs
     allowUniversalAccessFromFileURLs for its module imports, which removes the
     same-origin barrier. Refusing navigation is not enough on its own: an image
     src, a beacon or an XHR would still reach the network without ever being a
     navigation. This policy is enforced by the engine itself, so it holds
     whatever the file-origin flags say. -->
<!-- The file: scheme is listed explicitly beside 'self': a file:// document can be an
     opaque origin, in which case 'self' matches nothing and the engine's own
     module and worker would be blocked. No http, https or wss source appears
     anywhere, which is what closes the exfiltration routes. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' file: 'unsafe-inline' blob:; worker-src 'self' file: blob:; child-src 'self' file: blob:; img-src 'self' file: data: blob:; style-src 'unsafe-inline'; connect-src 'self' file: data: blob:; form-action 'none'; base-uri 'none'">
<style>html,body{margin:0;background:#fff}</style>
</head><body>
<script type="module">
import * as pdfjs from './pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';

var doc = null;

function send(m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
function fail(id, code, detail) { send({ id: id, type: 'error', code: code, detail: detail }); }

// Read a local file as bytes. XHR rather than fetch: the Fetch API rejects the
// file: scheme outright, while allowFileAccessFromFileURLs exists precisely to
// let XHR read a sibling file.
function readLocal(path) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', path, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function () {
      if (xhr.response) resolve(xhr.response);
      else reject(new Error('empty'));
    };
    xhr.onerror = function () { reject(new Error('read failed')); };
    xhr.send();
  });
}

// Render one page to a JPEG. The page is flattened onto white first: PDF
// pages are transparent and JPEG has no alpha channel.
async function toJpeg(page, scale, quality) {
  var viewport = page.getViewport({ scale: scale });
  var canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  var ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: viewport }).promise;
  var url = canvas.toDataURL('image/jpeg', quality);
  canvas.width = 0; canvas.height = 0;
  return url.slice(url.indexOf(',') + 1);
}

function loadBlobImage(path) {
  return readLocal(path).then(function (buf) {
    return new Promise(function (resolve, reject) {
      var blob = new Blob([new Uint8Array(buf)]);
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('bad image'));
      };
      img.src = url;
    });
  });
}

function drawOrientedSource(img, rotate, maxDim, splitHalf) {
  var rot = ((rotate || 0) % 360 + 360) % 360;
  var rawW = img.naturalWidth || img.width || 1;
  var rawH = img.naturalHeight || img.height || 1;
  var orientW = (rot === 90 || rot === 270) ? rawH : rawW;
  var orientH = (rot === 90 || rot === 270) ? rawW : rawH;
  var scale = Math.min(1, (maxDim || 3000) / Math.max(orientW, orientH, 1));
  var fullW = Math.max(16, Math.round(orientW * scale));
  var fullH = Math.max(16, Math.round(orientH * scale));

  var c = document.createElement('canvas');
  c.width = fullW;
  c.height = fullH;
  var ctx = c.getContext('2d', { alpha: false });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, fullW, fullH);
  ctx.save();
  if (rot === 90) {
    ctx.translate(fullW, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, 0, 0, fullH, fullW);
  } else if (rot === 180) {
    ctx.translate(fullW, fullH);
    ctx.rotate(Math.PI);
    ctx.drawImage(img, 0, 0, fullW, fullH);
  } else if (rot === 270) {
    ctx.translate(0, fullH);
    ctx.rotate((3 * Math.PI) / 2);
    ctx.drawImage(img, 0, 0, fullH, fullW);
  } else {
    ctx.drawImage(img, 0, 0, fullW, fullH);
  }
  ctx.restore();

  if (splitHalf === 'left' || splitHalf === 'right') {
    var sc = document.createElement('canvas');
    if (fullW >= fullH) {
      var halfW = Math.max(8, Math.floor(fullW / 2));
      var sx = splitHalf === 'right' ? halfW : 0;
      sc.width = fullW - sx > 0 ? (splitHalf === 'right' ? fullW - halfW : halfW) : halfW;
      sc.height = fullH;
      sc.getContext('2d', { alpha: false }).drawImage(c, sx, 0, sc.width, fullH, 0, 0, sc.width, fullH);
    } else {
      var halfH = Math.max(8, Math.floor(fullH / 2));
      var sy = splitHalf === 'right' ? halfH : 0;
      sc.width = fullW;
      sc.height = splitHalf === 'right' ? fullH - halfH : halfH;
      sc.getContext('2d', { alpha: false }).drawImage(c, 0, sy, fullW, sc.height, 0, 0, fullW, sc.height);
    }
    c.width = 0; c.height = 0;
    return sc;
  }
  return c;
}

function medianOf(arr) {
  if (!arr.length) return 0;
  var copy = arr.slice().sort(function (a, b) { return a - b; });
  return copy[copy.length >> 1];
}

// Stage 1A: Detect 4 corners of the notebook page on a downsampled analysis grid.
// Combines center-outward paper chrominance/luminance density with inward gradient
// peaks so both wooden desks and adjacent notebook spiral creases are detected.
function detectDocumentQuad(srcCanvas) {
  var sw = srcCanvas.width;
  var sh = srcCanvas.height;
  var maxSide = 300;
  var scale = Math.min(1, maxSide / Math.max(sw, sh, 1));
  var dw = Math.max(48, Math.round(sw * scale));
  var dh = Math.max(48, Math.round(sh * scale));

  var ac = document.createElement('canvas');
  ac.width = dw;
  ac.height = dh;
  var actx = ac.getContext('2d', { alpha: false });
  actx.drawImage(srcCanvas, 0, 0, dw, dh);
  var rgba = actx.getImageData(0, 0, dw, dh).data;
  ac.width = 0; ac.height = 0;

  var L = new Uint8Array(dw * dh);
  var RB = new Int16Array(dw * dh);
  var RG = new Int16Array(dw * dh);
  var centerL = [];
  var centerRB = [];

  var cx0 = Math.floor(dw * 0.28), cx1 = Math.ceil(dw * 0.72);
  var cy0 = Math.floor(dh * 0.24), cy1 = Math.ceil(dh * 0.76);

  for (var y = 0; y < dh; y++) {
    var rowOff = y * dw;
    var inCy = y >= cy0 && y <= cy1;
    for (var x = 0; x < dw; x++) {
      var i = rowOff + x;
      var p = i << 2;
      var r = rgba[p], g = rgba[p + 1], b = rgba[p + 2];
      var lum = (38 * r + 75 * g + 15 * b) >> 7;
      var rb = r - b;
      L[i] = lum;
      RB[i] = rb;
      RG[i] = r - g;
      if (inCy && x >= cx0 && x <= cx1 && ((x + y) & 1) === 0) {
        centerL.push(lum);
        centerRB.push(rb);
      }
    }
  }

  centerL.sort(function (a, b) { return a - b; });
  centerRB.sort(function (a, b) { return a - b; });
  var baseRb = Math.max(0, centerRB.length ? centerRB[centerRB.length >> 1] : 8);
  var paperL70 = centerL.length ? centerL[Math.floor(centerL.length * 0.70)] : 175;
  var minPaperL = Math.max(86, Math.min(142, Math.round(paperL70 * 0.54)));

  var mask = new Uint8Array(dw * dh);
  for (var k = 0; k < dw * dh; k++) {
    if (L[k] >= minPaperL && RB[k] <= baseRb + 22 && RG[k] <= 34) {
      mask[k] = 100;
    }
  }

  // 7x7 box filter for local paper density [0..100]
  var tmp = new Int32Array(dw * dh);
  var density = new Uint8Array(dw * dh);
  var rad = 3;
  for (var ry = 0; ry < dh; ry++) {
    var ro = ry * dw;
    for (var rx = 0; rx < dw; rx++) {
      var s = 0, cnt = 0;
      for (var dx = -rad; dx <= rad; dx++) {
        var nx = rx + dx;
        if (nx >= 0 && nx < dw) { s += mask[ro + nx]; cnt++; }
      }
      tmp[ro + rx] = (s / cnt) | 0;
    }
  }
  for (var cx = 0; cx < dw; cx++) {
    for (var cy = 0; cy < dh; cy++) {
      var s2 = 0, cnt2 = 0;
      for (var dy = -rad; dy <= rad; dy++) {
        var ny = cy + dy;
        if (ny >= 0 && ny < dh) { s2 += tmp[ny * dw + cx]; cnt2++; }
      }
      density[cy * dw + cx] = (s2 / cnt2) | 0;
    }
  }

  var yStart = Math.floor(dh * 0.14), yEnd = Math.floor(dh * 0.86), yMid = (yStart + yEnd) >> 1;
  var leftTopArr = [], leftBotArr = [], rightTopArr = [], rightBotArr = [];
  var maxLeftSearch = Math.floor(dw * 0.36);
  var minRightSearch = Math.ceil(dw * 0.64);

  for (var sy = yStart; sy <= yEnd; sy += 2) {
    var rOff = sy * dw;
    var lx = 0;
    for (var x1 = 0; x1 < maxLeftSearch; x1++) {
      if (density[rOff + x1] >= 60 && density[rOff + Math.min(dw - 1, x1 + 4)] >= 68) {
        lx = x1;
        break;
      }
    }
    var rx2 = dw - 1;
    for (var x2 = dw - 1; x2 > minRightSearch; x2--) {
      if (density[rOff + x2] >= 60 && density[rOff + Math.max(0, x2 - 4)] >= 68) {
        rx2 = x2;
        break;
      }
    }
    if (sy < yMid) { leftTopArr.push(lx); rightTopArr.push(rx2); }
    else { leftBotArr.push(lx); rightBotArr.push(rx2); }
  }

  var xStart = Math.floor(dw * 0.14), xEnd = Math.floor(dw * 0.86), xMid = (xStart + xEnd) >> 1;
  var topLeftArr = [], topRightArr = [], botLeftArr = [], botRightArr = [];
  var maxTopSearch = Math.floor(dh * 0.32);
  var minBotSearch = Math.ceil(dh * 0.68);

  for (var sx = xStart; sx <= xEnd; sx += 2) {
    var ty = 0;
    for (var y1 = 0; y1 < maxTopSearch; y1++) {
      if (density[y1 * dw + sx] >= 60 && density[Math.min(dh - 1, y1 + 4) * dw + sx] >= 68) {
        ty = y1;
        break;
      }
    }
    var by = dh - 1;
    for (var y2 = dh - 1; y2 > minBotSearch; y2--) {
      if (density[y2 * dw + sx] >= 60 && density[Math.max(0, y2 - 4) * dw + sx] >= 68) {
        by = y2;
        break;
      }
    }
    if (sx < xMid) { topLeftArr.push(ty); botLeftArr.push(by); }
    else { topRightArr.push(ty); botRightArr.push(by); }
  }

  var lTop = medianOf(leftTopArr), lBot = medianOf(leftBotArr);
  var rTop = medianOf(rightTopArr), rBot = medianOf(rightBotArr);
  var tLeft = medianOf(topLeftArr), tRight = medianOf(topRightArr);
  var bLeft = medianOf(botLeftArr), bRight = medianOf(botRightArr);

  // Check for vertical spiral/crease gutter line in outer 12% on left/right
  var gy0 = Math.floor(dh * 0.18), gy1 = Math.floor(dh * 0.82);
  var gCount = Math.max(1, gy1 - gy0);
  var maxCreaseL = Math.floor(dw * 0.125);
  var bestLeftCrease = -1, bestLeftScore = 11.5;
  for (var gx = Math.max(2, Math.min(lTop, lBot)); gx < maxCreaseL; gx++) {
    var sumScore = 0;
    for (var gy = gy0; gy < gy1; gy += 2) {
      var baseIdx = gy * dw + gx;
      var step = Math.abs(L[baseIdx + 2] - L[baseIdx - 2]);
      var dip = Math.max(0, L[baseIdx + 4] - L[baseIdx]);
      sumScore += step + dip;
    }
    var avgScore = (sumScore * 2) / gCount;
    if (avgScore > bestLeftScore) {
      bestLeftScore = avgScore;
      bestLeftCrease = gx + 2;
    }
  }
  if (bestLeftCrease > 0) {
    lTop = Math.max(lTop, bestLeftCrease);
    lBot = Math.max(lBot, bestLeftCrease);
  }

  var minCreaseR = Math.ceil(dw * 0.875);
  var bestRightCrease = -1, bestRightScore = 11.5;
  for (var gxR = Math.min(dw - 3, Math.max(rTop, rBot)); gxR > minCreaseR; gxR--) {
    var sumScoreR = 0;
    for (var gyR = gy0; gyR < gy1; gyR += 2) {
      var baseIdxR = gyR * dw + gxR;
      var stepR = Math.abs(L[baseIdxR + 2] - L[baseIdxR - 2]);
      var dipR = Math.max(0, L[baseIdxR - 4] - L[baseIdxR]);
      sumScoreR += stepR + dipR;
    }
    var avgScoreR = (sumScoreR * 2) / gCount;
    if (avgScoreR > bestRightScore) {
      bestRightScore = avgScoreR;
      bestRightCrease = gxR - 2;
    }
  }
  if (bestRightCrease > 0) {
    rTop = Math.min(rTop, bestRightCrease);
    rBot = Math.min(rBot, bestRightCrease);
  }

  // Local Sobel gradient absorption (+-4px) to snap each corner segment onto sharpest edge
  function absorbX(xVal, y0S, y1S, isLeft) {
    var bestX = xVal, bestGrad = -1;
    var minX = Math.max(2, xVal - 4), maxX = Math.min(dw - 3, xVal + 4);
    for (var cx = minX; cx <= maxX; cx++) {
      var gSum = 0;
      for (var cy = y0S; cy < y1S; cy += 3) {
        var idx = cy * dw + cx;
        var diff = isLeft ? (L[idx + 1] - L[idx - 1]) : (L[idx - 1] - L[idx + 1]);
        if (diff > 0) gSum += diff;
      }
      if (gSum > bestGrad) { bestGrad = gSum; bestX = cx; }
    }
    return bestX;
  }

  function absorbY(yVal, x0S, x1S, isTop) {
    var bestY = yVal, bestGrad = -1;
    var minY = Math.max(2, yVal - 4), maxY = Math.min(dh - 3, yVal + 4);
    for (var cy = minY; cy <= maxY; cy++) {
      var gSum = 0;
      for (var cx = x0S; cx < x1S; cx += 3) {
        var idx = cy * dw + cx;
        var diff = isTop ? (L[idx + dw] - L[idx - dw]) : (L[idx - dw] - L[idx + dw]);
        if (diff > 0) gSum += diff;
      }
      if (gSum > bestGrad) { bestGrad = gSum; bestY = cy; }
    }
    return bestY;
  }

  lTop = absorbX(lTop, yStart, yMid, true);
  lBot = absorbX(lBot, yMid, yEnd, true);
  rTop = absorbX(rTop, yStart, yMid, false);
  rBot = absorbX(rBot, yMid, yEnd, false);
  tLeft = absorbY(tLeft, xStart, xMid, true);
  tRight = absorbY(tRight, xMid, xEnd, true);
  bLeft = absorbY(bLeft, xStart, xMid, false);
  bRight = absorbY(bRight, xMid, xEnd, false);

  // Convert fitted edge medians into 4 corner coordinates with micro-inset
  var insetX = 0.004;
  var insetY = 0.004;
  var tlx = Math.min(0.35, Math.max(0, lTop / dw + insetX));
  var blx = Math.min(0.35, Math.max(0, lBot / dw + insetX));
  var trx = Math.max(0.65, Math.min(1, rTop / dw - insetX));
  var brx = Math.max(0.65, Math.min(1, rBot / dw - insetX));
  var tly = Math.min(0.30, Math.max(0, tLeft / dh + insetY));
  var try_ = Math.min(0.30, Math.max(0, tRight / dh + insetY));
  var bly = Math.max(0.70, Math.min(1, bLeft / dh - insetY));
  var bry = Math.max(0.70, Math.min(1, bRight / dh - insetY));

  // Validate interior quad angles lie within [45 deg (0.7854 rad), 135 deg (2.3562 rad)]
  var pts = [
    { x: tlx * dw, y: tly * dh },
    { x: trx * dw, y: try_ * dh },
    { x: brx * dw, y: bry * dh },
    { x: blx * dw, y: bly * dh }
  ];
  var validAngles = true;
  for (var vi = 0; vi < 4; vi++) {
    var prev = pts[(vi + 3) & 3];
    var curr = pts[vi];
    var next = pts[(vi + 1) & 3];
    var ux = prev.x - curr.x, uy = prev.y - curr.y;
    var vx = next.x - curr.x, vy = next.y - curr.y;
    var lenU = Math.hypot(ux, uy), lenV = Math.hypot(vx, vy);
    if (lenU < 8 || lenV < 8) { validAngles = false; break; }
    var cosA = (ux * vx + uy * vy) / (lenU * lenV);
    var ang = Math.acos(Math.max(-1, Math.min(1, cosA)));
    if (ang < 0.785398 || ang > 2.356194) { validAngles = false; break; }
  }
  if (!validAngles) {
    var avgLx = (tlx + blx) * 0.5, avgRx = (trx + brx) * 0.5;
    var avgTy = (tly + try_) * 0.5, avgBy = (bly + bry) * 0.5;
    tlx = blx = avgLx; trx = brx = avgRx;
    tly = try_ = avgTy; bly = bry = avgBy;
  }

  var wSpan = Math.min(trx - tlx, brx - blx);
  var hSpan = Math.min(bly - tly, bry - try_);
  if (wSpan < 0.42 || hSpan < 0.42) {
    return [
      { x: 0.005, y: 0.005 },
      { x: 0.995, y: 0.005 },
      { x: 0.995, y: 0.995 },
      { x: 0.005, y: 0.995 }
    ];
  }

  return [
    { x: Number(tlx.toFixed(4)), y: Number(tly.toFixed(4)) },
    { x: Number(trx.toFixed(4)), y: Number(try_.toFixed(4)) },
    { x: Number(brx.toFixed(4)), y: Number(bry.toFixed(4)) },
    { x: Number(blx.toFixed(4)), y: Number(bly.toFixed(4)) }
  ];
}

// Stage 1B: 4-Point Perspective Homography Warp with Foreshortening Aspect Recovery.
function warpQuadToCanvas(srcCanvas, quad, maxDim) {
  var sw = srcCanvas.width;
  var sh = srcCanvas.height;
  var q = quad && quad.length === 4 ? quad : [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }
  ];

  var x0 = Math.max(0, Math.min(sw - 1, q[0].x * sw));
  var y0 = Math.max(0, Math.min(sh - 1, q[0].y * sh));
  var x1 = Math.max(0, Math.min(sw - 1, q[1].x * sw));
  var y1 = Math.max(0, Math.min(sh - 1, q[1].y * sh));
  var x2 = Math.max(0, Math.min(sw - 1, q[2].x * sw));
  var y2 = Math.max(0, Math.min(sh - 1, q[2].y * sh));
  var x3 = Math.max(0, Math.min(sw - 1, q[3].x * sw));
  var y3 = Math.max(0, Math.min(sh - 1, q[3].y * sh));

  var wTop = Math.hypot(x1 - x0, y1 - y0);
  var wBot = Math.hypot(x2 - x3, y2 - y3);
  var hLeft = Math.hypot(x3 - x0, y3 - y0);
  var hRight = Math.hypot(x2 - x1, y2 - y1);

  var skew = Math.abs(y0 - y1) + Math.abs(y2 - y3) + Math.abs(x0 - x3) + Math.abs(x1 - x2);
  var foreshorten = 1.0;
  if (skew >= 4.5) {
    var wMax = Math.max(wTop, wBot), wMin = Math.max(1, Math.min(wTop, wBot));
    foreshorten = Math.min(1.16, Math.sqrt(wMax / wMin));
  }

  var outW = Math.max(32, Math.round((wTop + wBot) * 0.5));
  var outH = Math.max(32, Math.round((hLeft + hRight) * 0.5 * foreshorten));
  var cap = maxDim || 3000;
  if (Math.max(outW, outH) > cap) {
    var r = cap / Math.max(outW, outH);
    outW = Math.max(32, Math.round(outW * r));
    outH = Math.max(32, Math.round(outH * r));
  }

  var dstCanvas = document.createElement('canvas');
  dstCanvas.width = outW;
  dstCanvas.height = outH;
  var dstCtx = dstCanvas.getContext('2d', { alpha: false });

  // Fast path if quad is nearly axis-aligned rectangle
  if (skew < 4.5) {
    var rx = Math.min(x0, x3);
    var ry = Math.min(y0, y1);
    var rw = Math.max(16, Math.max(x1, x2) - rx);
    var rh = Math.max(16, Math.max(y2, y3) - ry);
    dstCtx.fillStyle = '#ffffff';
    dstCtx.fillRect(0, 0, outW, outH);
    dstCtx.drawImage(srcCanvas, rx, ry, rw, rh, 0, 0, outW, outH);
    return dstCanvas;
  }

  // Full 8-parameter projective homography from unit square [0,1]^2 to source quad
  var dx1 = x1 - x2, dx2 = x3 - x2, sumX = x0 - x1 + x2 - x3;
  var dy1 = y1 - y2, dy2 = y3 - y2, sumY = y0 - y1 + y2 - y3;
  var det = dx1 * dy2 - dx2 * dy1;
  var g = Math.abs(det) > 1e-6 ? (sumX * dy2 - dx2 * sumY) / det : 0;
  var h = Math.abs(det) > 1e-6 ? (dx1 * sumY - sumX * dy1) / det : 0;
  var a = x1 - x0 + g * x1;
  var b = x3 - x0 + h * x3;
  var c = x0;
  var d = y1 - y0 + g * y1;
  var e = y3 - y0 + h * y3;
  var f = y0;

  var srcData = srcCanvas.getContext('2d', { alpha: false }).getImageData(0, 0, sw, sh).data;
  var dstImg = dstCtx.createImageData(outW, outH);
  var dstData = dstImg.data;
  var invW = 1 / Math.max(1, outW - 1);
  var invH = 1 / Math.max(1, outH - 1);
  var swMax = sw - 2;
  var shMax = sh - 2;

  for (var py = 0; py < outH; py++) {
    var v = py * invH;
    var rowNumX = b * v + c;
    var rowNumY = e * v + f;
    var rowDen = h * v + 1;
    var stepX = a * invW;
    var stepY = d * invW;
    var stepD = g * invW;
    var dOff = py * outW * 4;

    for (var px = 0; px < outW; px++) {
      var invD = 1 / rowDen;
      var sx = rowNumX * invD;
      var sy = rowNumY * invD;
      rowNumX += stepX;
      rowNumY += stepY;
      rowDen += stepD;

      if (sx < 0) sx = 0; else if (sx > swMax) sx = swMax;
      if (sy < 0) sy = 0; else if (sy > shMax) sy = shMax;
      var ix = sx | 0;
      var iy = sy | 0;
      var fx = sx - ix;
      var fy = sy - iy;
      var w00 = (1 - fx) * (1 - fy);
      var w10 = fx * (1 - fy);
      var w01 = (1 - fx) * fy;
      var w11 = fx * fy;

      var idx00 = (iy * sw + ix) << 2;
      var idx10 = idx00 + 4;
      var idx01 = idx00 + (sw << 2);
      var idx11 = idx01 + 4;

      dstData[dOff]     = (srcData[idx00] * w00 + srcData[idx10] * w10 + srcData[idx01] * w01 + srcData[idx11] * w11) | 0;
      dstData[dOff + 1] = (srcData[idx00 + 1] * w00 + srcData[idx10 + 1] * w10 + srcData[idx01 + 1] * w01 + srcData[idx11 + 1] * w11) | 0;
      dstData[dOff + 2] = (srcData[idx00 + 2] * w00 + srcData[idx10 + 2] * w10 + srcData[idx01 + 2] * w01 + srcData[idx11 + 2] * w11) | 0;
      dstData[dOff + 3] = 255;
      dOff += 4;
    }
  }
  dstCtx.putImageData(dstImg, 0, 0);
  return dstCanvas;
}

// Smart Background-Aware Eraser & Privacy Mosaic Redaction Brush
function paintWhiteoutStrokes(canvas, strokes, filterMode) {
  if (!strokes || !strokes.length) return;
  var ctx = canvas.getContext('2d', { alpha: false });
  var w = canvas.width;
  var h = canvas.height;
  var shortSide = Math.min(w, h);

  // Determine smart background erase color (matches paper tint in original/grayscale, #ffffff in enhanced modes)
  var eraseColor = '#ffffff';
  if (filterMode === 'original' || filterMode === 'grayscale') {
    var sampleData = ctx.getImageData((w * 0.25) | 0, (h * 0.25) | 0, Math.max(8, (w * 0.5) | 0), Math.max(8, (h * 0.5) | 0)).data;
    var rArr = [], gArr = [], bArr = [];
    for (var si = 0; si < sampleData.length; si += 64) {
      var sr = sampleData[si], sg = sampleData[si + 1], sb = sampleData[si + 2];
      var slum = (38 * sr + 75 * sg + 15 * sb) >> 7;
      if (slum > 120) { rArr.push(sr); gArr.push(sg); bArr.push(sb); }
    }
    if (rArr.length > 4) {
      var mr = medianOf(rArr), mg = medianOf(gArr), mb = medianOf(bArr);
      eraseColor = 'rgb(' + mr + ',' + mg + ',' + mb + ')';
    }
  }

  var hasMosaic = false;
  ctx.save();
  ctx.strokeStyle = eraseColor;
  ctx.fillStyle = eraseColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (var i = 0; i < strokes.length; i++) {
    var st = strokes[i];
    if (!st || !st.points || !st.points.length) continue;
    if (st.mode === 'mosaic') { hasMosaic = true; continue; }
    var lw = Math.max(6, (st.size || 0.04) * shortSide);
    ctx.lineWidth = lw;
    var pts = st.points;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x * w, pts[0].y * h, lw * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(pts[0].x * w, pts[0].y * h);
      for (var j = 1; j < pts.length; j++) {
        ctx.lineTo(pts[j].x * w, pts[j].y * h);
      }
      ctx.stroke();
    }
  }
  ctx.restore();

  if (hasMosaic) {
    var maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    var mctx = maskCanvas.getContext('2d');
    mctx.strokeStyle = '#ffffff';
    mctx.fillStyle = '#ffffff';
    mctx.lineCap = 'round';
    mctx.lineJoin = 'round';
    for (var mi = 0; mi < strokes.length; mi++) {
      var mst = strokes[mi];
      if (!mst || mst.mode !== 'mosaic' || !mst.points || !mst.points.length) continue;
      var mlw = Math.max(10, (mst.size || 0.04) * shortSide);
      mctx.lineWidth = mlw;
      var mpts = mst.points;
      if (mpts.length === 1) {
        mctx.beginPath();
        mctx.arc(mpts[0].x * w, mpts[0].y * h, mlw * 0.5, 0, Math.PI * 2);
        mctx.fill();
      } else {
        mctx.beginPath();
        mctx.moveTo(mpts[0].x * w, mpts[0].y * h);
        for (var mj = 1; mj < mpts.length; mj++) {
          mctx.lineTo(mpts[mj].x * w, mpts[mj].y * h);
        }
        mctx.stroke();
      }
    }
    var maskBytes = mctx.getImageData(0, 0, w, h).data;
    maskCanvas.width = 0; maskCanvas.height = 0;
    var fullImg = ctx.getImageData(0, 0, w, h);
    var fullData = fullImg.data;
    var block = Math.max(14, Math.round(shortSide * 0.018));
    for (var by = 0; by < h; by += block) {
      var bh = Math.min(block, h - by);
      for (var bx = 0; bx < w; bx += block) {
        var bw = Math.min(block, w - bx);
        var centerM = ((by + (bh >> 1)) * w + (bx + (bw >> 1))) << 2;
        var anyMasked = maskBytes[centerM + 3] > 32;
        if (!anyMasked) {
          var cornerM = (by * w + bx) << 2;
          anyMasked = maskBytes[cornerM + 3] > 32;
        }
        if (!anyMasked) continue;
        var sumR = 0, sumG = 0, sumB = 0, cnt = 0;
        for (var py = by; py < by + bh; py += 2) {
          for (var px = bx; px < bx + bw; px += 2) {
            var pOff = (py * w + px) << 2;
            sumR += fullData[pOff];
            sumG += fullData[pOff + 1];
            sumB += fullData[pOff + 2];
            cnt++;
          }
        }
        var avgR = cnt ? ((sumR / cnt) | 0) : 180;
        var avgG = cnt ? ((sumG / cnt) | 0) : 180;
        var avgB = cnt ? ((sumB / cnt) | 0) : 180;
        var checker = (((bx / block) | 0) + ((by / block) | 0)) & 1 ? 12 : -12;
        var cr = Math.max(30, Math.min(235, avgR + checker));
        var cg = Math.max(30, Math.min(235, avgG + checker));
        var cb = Math.max(30, Math.min(235, avgB + checker));
        for (var py2 = by; py2 < by + bh; py2++) {
          for (var px2 = bx; px2 < bx + bw; px2++) {
            var mIdx = (py2 * w + px2) << 2;
            if (maskBytes[mIdx + 3] > 32) {
              fullData[mIdx] = cr;
              fullData[mIdx + 1] = cg;
              fullData[mIdx + 2] = cb;
            }
          }
        }
      }
    }
    ctx.putImageData(fullImg, 0, 0);
  }
}

// Stages 2-5: 5-stage document scanner pipeline:
// Stage 2: Contrast-weighted morphological illumination envelope (16x grid + 9x9 MaxFilter + BoxBlur)
// Stage 3: Dynamic histogram percentile auto-levels & gamma = 5/6 (0.8333333) power LUT
// Stage 4: 1.5x integer luma-preserving chroma boost: C_out = (3*C - L) >> 1
// Stage 5: Asymmetric 3-zone 15x15 unsharp mask (0.5x paper, 1.0x edge, 2.0x ink core)
function enhanceDocumentCanvas(canvas, filterMode) {
  var mode = filterMode || 'magic';
  if (mode === 'original') return;

  var W = canvas.width;
  var H = canvas.height;
  var ctx = canvas.getContext('2d', { alpha: false });
  var imgData = ctx.getImageData(0, 0, W, H);
  var data = imgData.data;

  // Estimate baseline paper warmth in center so outer border cleanup can strip residual wood/skin
  var sampleRB = [];
  var cx0 = (W * 0.3) | 0, cx1 = (W * 0.7) | 0;
  var cy0 = (H * 0.3) | 0, cy1 = (H * 0.7) | 0;
  var stepS = Math.max(4, (Math.min(W, H) / 40) | 0);
  for (var sy = cy0; sy < cy1; sy += stepS) {
    for (var sx = cx0; sx < cx1; sx += stepS) {
      var sp = ((sy * W + sx) << 2);
      sampleRB.push(data[sp] - data[sp + 2]);
    }
  }
  var baseRb = Math.max(0, medianOf(sampleRB));

  // Outer 5% border cleanup: strip residual warm wood desk, dark frame border, or thumb skin intrusion
  var mLeft = (W * 0.05) | 0, mRight = (W * 0.95) | 0;
  var mTop = (H * 0.04) | 0, mBot = (H * 0.96) | 0;
  var edgeLeft = (W * 0.018) | 0, edgeRight = (W * 0.982) | 0;
  var edgeTop = (H * 0.015) | 0, edgeBot = (H * 0.985) | 0;
  for (var by = 0; by < H; by++) {
    var inYMargin = by < mTop || by > mBot;
    var inYEdge = by < edgeTop || by > edgeBot;
    var rOff = by * W;
    for (var bx = 0; bx < W; bx++) {
      if (!inYMargin && bx >= mLeft && bx <= mRight) {
        bx = mRight;
        continue;
      }
      var bpIdx = (rOff + bx) << 2;
      var br = data[bpIdx], bg = data[bpIdx + 1], bb = data[bpIdx + 2];
      var blum = (38 * br + 75 * bg + 15 * bb) >> 7;
      var isWarmDesk = (br - bb) > (baseRb + 23) && blum < 195;
      var isThumbSkin = (bx < mLeft || bx > mRight) && br > 95 && bg > 40 && bb > 20 && (br - bg) > 15 && (br - bb) > (baseRb + 18) && blum < 210;
      var isDarkEdge = (inYEdge || bx < edgeLeft || bx > edgeRight) && blum < 105;
      if (isWarmDesk || isThumbSkin || isDarkEdge) {
        data[bpIdx] = 248;
        data[bpIdx + 1] = 248;
        data[bpIdx + 2] = 248;
      }
    }
  }

  // Stage 2: Build 16x downsampled contrast-weighted background illumination map (gw x gh)
  var cell = 16;
  var gw = Math.max(8, Math.ceil(W / cell));
  var gh = Math.max(8, Math.ceil(H / cell));
  var gridCount = gw * gh;
  var bgR = new Uint8Array(gridCount);
  var bgG = new Uint8Array(gridCount);
  var bgB = new Uint8Array(gridCount);
  var minGridR = new Uint8Array(gridCount);
  var minGridG = new Uint8Array(gridCount);
  var minGridB = new Uint8Array(gridCount);

  for (var gy = 0; gy < gh; gy++) {
    var y0 = gy * cell;
    var y1 = Math.min(H, y0 + cell);
    for (var gx = 0; gx < gw; gx++) {
      var x0 = gx * cell;
      var x1 = Math.min(W, x0 + cell);
      var maxL = 0, minL = 255;
      var mr = 235, mg = 235, mb = 235;
      var nrMin = 200, ngMin = 200, nbMin = 200;
      for (var py = y0; py < y1; py += 2) {
        var pOff = (py * W + x0) << 2;
        for (var px = x0; px < x1; px += 2) {
          var r0 = data[pOff], g0 = data[pOff + 1], b0 = data[pOff + 2];
          var l0 = (38 * r0 + 75 * g0 + 15 * b0) >> 7;
          if (l0 > maxL) {
            maxL = l0; mr = r0; mg = g0; mb = b0;
          }
          if (l0 < minL) {
            minL = l0; nrMin = r0; ngMin = g0; nbMin = b0;
          }
          pOff += 8;
        }
      }
      var gi = gy * gw + gx;
      bgR[gi] = Math.max(80, mr);
      bgG[gi] = Math.max(80, mg);
      bgB[gi] = Math.max(80, mb);
      minGridR[gi] = Math.max(40, nrMin);
      minGridG[gi] = Math.max(40, ngMin);
      minGridB[gi] = Math.max(40, nbMin);
    }
  }

  // Separable MaxFilter (radius 4 on 16x grid = 144x144 dilation) + contrast-weighted envelope blend
  var tmpR = new Uint8Array(gridCount);
  var tmpG = new Uint8Array(gridCount);
  var tmpB = new Uint8Array(gridCount);
  var mRad = 4;
  for (var my = 0; my < gh; my++) {
    var mOff = my * gw;
    for (var mx = 0; mx < gw; mx++) {
      var mr1 = 0, mg1 = 0, mb1 = 0;
      for (var mdx = -mRad; mdx <= mRad; mdx++) {
        var mnx = Math.min(gw - 1, Math.max(0, mx + mdx));
        var mi = mOff + mnx;
        if (bgR[mi] > mr1) mr1 = bgR[mi];
        if (bgG[mi] > mg1) mg1 = bgG[mi];
        if (bgB[mi] > mb1) mb1 = bgB[mi];
      }
      tmpR[mOff + mx] = mr1;
      tmpG[mOff + mx] = mg1;
      tmpB[mOff + mx] = mb1;
    }
  }
  for (var mx2 = 0; mx2 < gw; mx2++) {
    for (var my2 = 0; my2 < gh; my2++) {
      var mr2 = 0, mg2 = 0, mb2 = 0;
      for (var mdy = -mRad; mdy <= mRad; mdy++) {
        var mny = Math.min(gh - 1, Math.max(0, my2 + mdy));
        var mi2 = mny * gw + mx2;
        if (tmpR[mi2] > mr2) mr2 = tmpR[mi2];
        if (tmpG[mi2] > mg2) mg2 = tmpG[mi2];
        if (tmpB[mi2] > mb2) mb2 = tmpB[mi2];
      }
      var mo = my2 * gw + mx2;
      // Contrast-weighted blend: alpha = (Imax - Imin) / Imax; Ibg = alpha*Imax + (1-alpha)*Imin
      var minR0 = minGridR[mo], minG0 = minGridG[mo], minB0 = minGridB[mo];
      var aR = mr2 > 0 ? (mr2 - minR0) / mr2 : 1;
      var aG = mg2 > 0 ? (mg2 - minG0) / mg2 : 1;
      var aB = mb2 > 0 ? (mb2 - minB0) / mb2 : 1;
      // Boost alpha so pen strokes always weight toward Imax while low-contrast paper stays smooth
      aR = Math.min(1, aR * 1.65);
      aG = Math.min(1, aG * 1.65);
      aB = Math.min(1, aB * 1.65);
      bgR[mo] = Math.round(aR * mr2 + (1 - aR) * minR0);
      bgG[mo] = Math.round(aG * mg2 + (1 - aG) * minG0);
      bgB[mo] = Math.round(aB * mb2 + (1 - aB) * minB0);
    }
  }

  // 2 passes of separable BoxBlur (radius 4) on the 16x illumination grid
  var bRad = 4;
  for (var pass = 0; pass < 2; pass++) {
    for (var by1 = 0; by1 < gh; by1++) {
      var bOff = by1 * gw;
      for (var bx1 = 0; bx1 < gw; bx1++) {
        var sr = 0, sg = 0, sb = 0, sc = 0;
        for (var bdx = -bRad; bdx <= bRad; bdx++) {
          var bnx = Math.min(gw - 1, Math.max(0, bx1 + bdx));
          var bi = bOff + bnx;
          sr += bgR[bi]; sg += bgG[bi]; sb += bgB[bi]; sc++;
        }
        tmpR[bOff + bx1] = (sr / sc) | 0;
        tmpG[bOff + bx1] = (sg / sc) | 0;
        tmpB[bOff + bx1] = (sb / sc) | 0;
      }
    }
    for (var bx2 = 0; bx2 < gw; bx2++) {
      for (var by2 = 0; by2 < gh; by2++) {
        var sr2 = 0, sg2 = 0, sb2 = 0, sc2 = 0;
        for (var bdy = -bRad; bdy <= bRad; bdy++) {
          var bny = Math.min(gh - 1, Math.max(0, by2 + bdy));
          var bi2 = bny * gw + bx2;
          sr2 += tmpR[bi2]; sg2 += tmpG[bi2]; sb2 += tmpB[bi2]; sc2++;
        }
        var bo = by2 * gw + bx2;
        bgR[bo] = (sr2 / sc2) | 0;
        bgG[bo] = (sg2 / sc2) | 0;
        bgB[bo] = (sb2 / sc2) | 0;
      }
    }
  }

  // Stage 3: Dynamic 256-bin histogram percentile auto-levels + gamma = 5/6 (0.8333333) power LUT
  var normHist = new Int32Array(256);
  var histSamples = 0;
  var hStepY = Math.max(2, (H / 90) | 0);
  var hStepX = Math.max(2, (W / 90) | 0);
  for (var hyS = (H * 0.08) | 0; hyS < ((H * 0.92) | 0); hyS += hStepY) {
    var hGy = Math.min(gh - 1, (hyS / cell) | 0) * gw;
    var hRow = hyS * W;
    for (var hxS = (W * 0.08) | 0; hxS < ((W * 0.92) | 0); hxS += hStepX) {
      var hGi = hGy + Math.min(gw - 1, (hxS / cell) | 0);
      var hPi = (hRow + hxS) << 2;
      var nrS = Math.min(255, ((data[hPi] * 255) / bgR[hGi]) | 0);
      var ngS = Math.min(255, ((data[hPi + 1] * 255) / bgG[hGi]) | 0);
      var nbS = Math.min(255, ((data[hPi + 2] * 255) / bgB[hGi]) | 0);
      var nLum = (38 * nrS + 75 * ngS + 15 * nbS) >> 7;
      normHist[nLum]++;
      histSamples++;
    }
  }

  var peakBin = 240, peakCount = 0;
  for (var hb = 180; hb <= 255; hb++) {
    if (normHist[hb] > peakCount) {
      peakCount = normHist[hb];
      peakBin = hb;
    }
  }
  // 1/32 of peak paper bin count threshold for dynamic white-point floor
  var wpThresh = Math.max(2, peakCount >> 5);
  var dynWp = peakBin;
  while (dynWp > 195 && normHist[dynWp] >= wpThresh) {
    dynWp--;
  }
  // 0.45% cumulative dark ink threshold for dynamic black-point anchor
  var bpTarget = Math.max(2, Math.round(histSamples * 0.0045));
  var cumDark = 0, dynBp = 48;
  for (var dbBin = 0; dbBin < 120; dbBin++) {
    cumDark += normHist[dbBin];
    if (cumDark >= bpTarget) {
      dynBp = dbBin;
      break;
    }
  }

  var bp = Math.max(44, Math.min(60, dynBp));
  var wp = Math.max(216, Math.min(230, dynWp));
  var gamma = 0.8333333002196431;
  if (mode === 'bleed_erase') { bp = Math.max(56, bp + 8); wp = Math.max(204, wp - 12); }
  else if (mode === 'whiteboard') { bp = Math.max(32, bp - 12); wp = Math.min(236, wp + 6); gamma = 0.88; }
  else if (mode === 'grayscale') { bp = Math.max(42, bp - 2); wp = Math.max(218, wp); }
  else if (mode === 'bw') { bp = 45; wp = 226; }

  var lut = new Uint8Array(256);
  var span = Math.max(1, wp - bp);
  for (var li = 0; li < 256; li++) {
    if (li <= bp) lut[li] = 0;
    else if (li >= wp) lut[li] = 255;
    else lut[li] = Math.min(255, Math.floor(Math.pow((li - bp) / span, gamma) * 253.0 + 1.5));
  }

  var totalPx = W * H;
  var lumaBuf = new Uint8Array(totalPx);
  var isColor = mode === 'magic' || mode === 'bleed_erase' || mode === 'whiteboard';
  var isBleedErase = mode === 'bleed_erase';
  var invCell = 1 / cell;

  // Apply Illumination Division + Gamma LUT + 1.5x Luma-Preserving Chroma Boost
  for (var y = 0; y < H; y++) {
    var gyF = y * invCell;
    var gy0I = Math.min(gh - 1, gyF | 0);
    var gy1I = Math.min(gh - 1, gy0I + 1);
    var fy = gyF - gy0I;
    var rowG0 = gy0I * gw;
    var rowG1 = gy1I * gw;
    var rowPx = y * W;

    for (var x = 0; x < W; x++) {
      var gxF = x * invCell;
      var gx0I = Math.min(gw - 1, gxF | 0);
      var gx1I = Math.min(gw - 1, gx0I + 1);
      var fx = gxF - gx0I;

      var w00 = (1 - fx) * (1 - fy);
      var w10 = fx * (1 - fy);
      var w01 = (1 - fx) * fy;
      var w11 = fx * fy;

      var i00 = rowG0 + gx0I, i10 = rowG0 + gx1I;
      var i01 = rowG1 + gx0I, i11 = rowG1 + gx1I;

      var illR = bgR[i00] * w00 + bgR[i10] * w10 + bgR[i01] * w01 + bgR[i11] * w11;
      var illG = bgG[i00] * w00 + bgG[i10] * w10 + bgG[i01] * w01 + bgG[i11] * w11;
      var illB = bgB[i00] * w00 + bgB[i10] * w10 + bgB[i01] * w01 + bgB[i11] * w11;

      var pIdx = rowPx + x;
      var dIdx = pIdx << 2;

      var dr = Math.min(255, ((data[dIdx] * 255) / illR) | 0);
      var dg = Math.min(255, ((data[dIdx + 1] * 255) / illG) | 0);
      var db = Math.min(255, ((data[dIdx + 2] * 255) / illB) | 0);

      var nr = lut[dr];
      var ng = lut[dg];
      var nb = lut[db];

      if (isBleedErase && nr > 184 && ng > 184 && nb > 184 && Math.abs(nr - nb) < 28) {
        nr = 255; ng = 255; nb = 255;
      }

      var lum = (38 * nr + 75 * ng + 15 * nb) >> 7;
      if (isColor) {
        nr = (3 * nr - lum) >> 1;
        ng = (3 * ng - lum) >> 1;
        nb = (3 * nb - lum) >> 1;
        if (nr < 0) nr = 0; else if (nr > 255) nr = 255;
        if (ng < 0) ng = 0; else if (ng > 255) ng = 255;
        if (nb < 0) nb = 0; else if (nb > 255) nb = 255;
      } else {
        nr = lum; ng = lum; nb = lum;
      }

      data[dIdx] = nr;
      data[dIdx + 1] = ng;
      data[dIdx + 2] = nb;
      lumaBuf[pIdx] = lum;
    }
  }

  // Stage 5: Separable 15x15 O(1) sliding-window box blur on luminance + 3-zone asymmetric unsharp mask
  var hBlur = new Uint8Array(totalPx);
  var blur15 = new Uint8Array(totalPx);
  var sRad = 7;
  var winLen = 15;

  for (var hy = 0; hy < H; hy++) {
    var hOff = hy * W;
    var sumH = lumaBuf[hOff] * (sRad + 1);
    for (var hxInit = 1; hxInit <= sRad; hxInit++) {
      sumH += lumaBuf[hOff + Math.min(W - 1, hxInit)];
    }
    for (var hx = 0; hx < W; hx++) {
      hBlur[hOff + hx] = (sumH / winLen) | 0;
      var subX = Math.max(0, hx - sRad);
      var addX = Math.min(W - 1, hx + sRad + 1);
      sumH += lumaBuf[hOff + addX] - lumaBuf[hOff + subX];
    }
  }

  for (var vx = 0; vx < W; vx++) {
    var sumV = hBlur[vx] * (sRad + 1);
    for (var vyInit = 1; vyInit <= sRad; vyInit++) {
      sumV += hBlur[Math.min(H - 1, vyInit) * W + vx];
    }
    for (var vy = 0; vy < H; vy++) {
      blur15[vy * W + vx] = (sumV / winLen) | 0;
      var subY = Math.max(0, vy - sRad);
      var addY = Math.min(H - 1, vy + sRad + 1);
      sumV += hBlur[addY * W + vx] - hBlur[subY * W + vx];
    }
  }

  var isBw = mode === 'bw';
  for (var p = 0; p < totalPx; p++) {
    var curL = lumaBuf[p];
    var meanL = blur15[p];
    var diff = curL - meanL;
    var qIdx = p << 2;

    if (isBw) {
      var bwVal;
      if (curL > 228 || diff > -9) bwVal = 255;
      else if (diff < -26 || curL < 92) bwVal = 0;
      else bwVal = Math.max(0, Math.min(255, (((diff + 26) * 255) / 17) | 0));
      data[qIdx] = bwVal;
      data[qIdx + 1] = bwVal;
      data[qIdx + 2] = bwVal;
    } else {
      // 3-zone piecewise unsharp mask:
      // diff > -10 => 0.5x (suppresses paper grain)
      // diff < -20 => 2.0x (crushes ink cores to deep black/blue)
      // -20 <= diff <= -10 => 1.0x (smooth stroke anti-aliasing)
      var delta = diff > -10 ? (diff >> 1) : (diff < -20 ? (diff << 1) : diff);
      var fr = data[qIdx] + delta;
      var fg = data[qIdx + 1] + delta;
      var fb = data[qIdx + 2] + delta;
      if (fr >= 247 && fg >= 247 && fb >= 247 && diff >= -6) {
        data[qIdx] = 255; data[qIdx + 1] = 255; data[qIdx + 2] = 255;
      } else {
        data[qIdx]     = fr < 0 ? 0 : (fr > 255 ? 255 : fr);
        data[qIdx + 1] = fg < 0 ? 0 : (fg > 255 ? 255 : fg);
        data[qIdx + 2] = fb < 0 ? 0 : (fb > 255 ? 255 : fb);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// Extracts handwritten ink signature onto a transparent PNG with auto-cropped bounds
function extractSignaturePng(img) {
  var c = drawOrientedSource(img, 0, 900, null);
  var W = c.width, H = c.height;
  var ctx = c.getContext('2d');
  var imgData = ctx.getImageData(0, 0, W, H);
  var d = imgData.data;

  var lumArr = [];
  for (var i = 0; i < d.length; i += 16) {
    lumArr.push((38 * d[i] + 75 * d[i + 1] + 15 * d[i + 2]) >> 7);
  }
  lumArr.sort(function (a, b) { return a - b; });
  var bgL = Math.max(120, lumArr[Math.floor(lumArr.length * 0.85)] || 220);

  var minX = W, minY = H, maxX = 0, maxY = 0, found = false;
  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      var p = (y * W + x) << 2;
      var r = d[p], g = d[p + 1], b = d[p + 2];
      var l = (38 * r + 75 * g + 15 * b) >> 7;
      var normL = Math.min(255, ((l * 255) / bgL) | 0);
      if (normL > 192) {
        d[p + 3] = 0;
      } else {
        var alpha = Math.min(255, Math.max(0, ((192 - normL) * 2.5) | 0));
        d[p]     = (r * 0.35) | 0;
        d[p + 1] = (g * 0.35) | 0;
        d[p + 2] = Math.min(255, (b * 0.55) | 0);
        d[p + 3] = alpha;
        if (alpha > 45) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);

  if (!found) {
    var fullUrl = c.toDataURL('image/png');
    c.width = 0; c.height = 0;
    return { base64: fullUrl.slice(fullUrl.indexOf(',') + 1), width: W, height: H };
  }

  var pad = 10;
  var cx = Math.max(0, minX - pad);
  var cy = Math.max(0, minY - pad);
  var cw = Math.min(W - cx, (maxX - minX) + pad * 2);
  var ch = Math.min(H - cy, (maxY - minY) + pad * 2);

  var out = document.createElement('canvas');
  out.width = Math.max(16, cw);
  out.height = Math.max(16, ch);
  out.getContext('2d').drawImage(c, cx, cy, cw, ch, 0, 0, out.width, out.height);
  var pngUrl = out.toDataURL('image/png');
  c.width = 0; c.height = 0;
  out.width = 0; out.height = 0;
  return { base64: pngUrl.slice(pngUrl.indexOf(',') + 1), width: cw, height: ch };
}

async function handle(msg) {
  var id = msg.id;
  var op = msg.op;
  try {
    if (op === 'close') { if (doc) { await doc.destroy(); doc = null; } return; }

    if (op === 'detectQuad') {
      var imgD = await loadBlobImage(msg.path);
      var srcD = drawOrientedSource(imgD, msg.rotate || 0, 480, null);
      var detected = detectDocumentQuad(srcD);
      srcD.width = 0; srcD.height = 0;
      return send({ id: id, type: 'quad', quad: detected });
    }

    if (op === 'extractSignature') {
      var imgS = await loadBlobImage(msg.path);
      var sig = extractSignaturePng(imgS);
      return send({ id: id, type: 'signature', base64: sig.base64, width: sig.width, height: sig.height });
    }

    if (op === 'scanPhoto') {
      var imgP = await loadBlobImage(msg.path);
      var maxDim = msg.maxDim || 3000;
      var srcP = drawOrientedSource(imgP, msg.rotate || 0, maxDim, msg.splitHalf || null);
      var quad = msg.quad;
      if (!quad && msg.autoCrop) {
        quad = detectDocumentQuad(srcP);
      }
      var warped = quad ? warpQuadToCanvas(srcP, quad, maxDim) : srcP;
      if (warped !== srcP) { srcP.width = 0; srcP.height = 0; }
      var activeFilter = msg.filter || 'magic';
      if (msg.whiteoutStrokes && msg.whiteoutStrokes.length) {
        paintWhiteoutStrokes(warped, msg.whiteoutStrokes, activeFilter);
      }
      enhanceDocumentCanvas(warped, activeFilter);
      var outW = warped.width;
      var outH = warped.height;
      var jpgUrl = warped.toDataURL('image/jpeg', msg.quality || 0.88);
      warped.width = 0; warped.height = 0;
      return send({
        id: id,
        type: 'scanned',
        base64: jpgUrl.slice(jpgUrl.indexOf(',') + 1),
        width: outW,
        height: outH,
        quad: quad
      });
    }

    if (op === 'open') {
      if (doc) { await doc.destroy(); doc = null; }
      var buf = await readLocal(msg.path);
      try {
        doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
      } catch (e) {
        return fail(id, String(e && e.name) === 'PasswordException' ? 'encrypted' : 'corrupt');
      }
      // Average characters of real text per page, sampled across the file.
      // Drives the "mostly text" warning: rasterising a text page costs far
      // more bytes than the vector text it replaces.
      var sample = Math.min(${TEXT_SAMPLE_PAGES}, doc.numPages);
      var step = Math.max(1, Math.floor(doc.numPages / sample));
      var chars = 0, seen = 0;
      for (var n = 1; n <= doc.numPages && seen < sample; n += step) {
        var p = await doc.getPage(n);
        var c = await p.getTextContent();
        for (var i = 0; i < c.items.length; i++) {
          chars += c.items[i].str ? c.items[i].str.length : 0;
        }
        p.cleanup(); seen++;
      }
      return send({ id: id, type: 'opened', pages: doc.numPages, textChars: seen ? chars / seen : 0 });
    }

    if (!doc) return fail(id, 'unknown');

    var page = await doc.getPage(msg.page);
    try {
      // Size in POINTS comes from the unscaled viewport, not the MediaBox, so
      // a page carrying /Rotate 90 keeps the orientation a reader shows.
      var base = page.getViewport({ scale: 1 });
      var longest = Math.max(base.width, base.height);

      if (op === 'thumb') {
        var thumb = await toJpeg(page, Math.max(msg.maxDim / longest, 0.05), 0.6);
        return send({ id: id, type: 'thumb', page: msg.page, base64: thumb });
      }
      if (op === 'render') {
        var scale = Math.min(Math.max(msg.longEdge / longest, 0.1), 3);
        var raster = await toJpeg(page, scale, msg.quality);
        return send({ id: id, type: 'page', page: msg.page, base64: raster, wPt: base.width, hPt: base.height });
      }
      return fail(id, 'unknown');
    } finally {
      page.cleanup();
    }
  } catch (e) {
    fail(id, 'unknown', String(e && e.message));
  }
}

window.__pdfEngine = function (json) { handle(JSON.parse(json)); };
if (window.__pdfEngineBooted) window.__pdfEngineBooted();
send({ id: 0, type: 'ready' });
</script>
<script>
// Classic script, so it still runs if the module above fails to load at all.
// Without this a broken runtime is silent and the native side waits forever.
var booted = false;
function reportFatal() {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ id: 0, type: 'fatal' }));
  }
}
// Capture phase, because a script that fails to load dispatches a
// non-bubbling error event at the element itself, which never reaches
// window.onerror. That is the exact failure this exists to catch: the runtime
// not being there.
window.addEventListener('error', reportFatal, true);
window.onerror = reportFatal;
// A rejection that escapes is only fatal before the page has announced itself.
// Afterwards it is far more likely to be pdf.js tidying up a destroyed
// document, and killing a working engine over that is worse than ignoring it.
window.addEventListener('unhandledrejection', function () {
  if (!booted) reportFatal();
});
window.__pdfEngineBooted = function () { booted = true; };
</script>
</body></html>`;
}

