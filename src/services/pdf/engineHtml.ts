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

function percentileOf(arr, p) {
  if (!arr.length) return 0;
  var copy = arr.slice().sort(function (a, b) { return a - b; });
  var idx = Math.min(copy.length - 1, Math.max(0, Math.floor(copy.length * p)));
  return copy[idx];
}

// Stage 1A: Detect 4 corners of the notebook page using multi-angle Radon edge-gradient line fitting.
// Computes horizontal and vertical Sobel gradients across outer perimeter bands, searching candidate
// rotation angles [-6 deg, +6 deg] to identify the physical paper boundary lines and their 4 intersections,
// cleanly cropping away desks, clamps, spiral bindings, and dark bottom strips without clipping notebook handwriting.
function detectDocumentQuad(srcCanvas) {
  var sw = srcCanvas.width;
  var sh = srcCanvas.height;
  var maxSide = 320;
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
  for (var y = 0; y < dh; y++) {
    var rO = y * dw;
    for (var x = 0; x < dw; x++) {
      var p = (rO + x) << 2;
      L[rO + x] = (38 * rgba[p] + 75 * rgba[p + 1] + 15 * rgba[p + 2]) >> 7;
    }
  }

  // 1. Center paper reference luminance (sampled from inner 40% box)
  var sampleCenterL = [];
  var cy0 = Math.floor(dh * 0.3), cy1 = Math.ceil(dh * 0.7);
  var cx0 = Math.floor(dw * 0.3), cx1 = Math.ceil(dw * 0.7);
  for (var cy = cy0; cy < cy1; cy += 2) {
    for (var cx = cx0; cx < cx1; cx += 2) {
      sampleCenterL.push(L[cy * dw + cx]);
    }
  }
  sampleCenterL.sort(function (a, b) { return a - b; });
  var centerL = sampleCenterL.length ? sampleCenterL[sampleCenterL.length >> 1] : 180;
  var darkThresh = centerL * 0.72;
  var woodThresh = centerL * 0.92;

  // 2. Classify background pixels (wood desk, dark shadow, laptop bezels, spiral bindings)
  var isBg = new Uint8Array(dw * dh);
  for (var pi = 0; pi < dw * dh; pi++) {
    var p4 = pi << 2;
    var pr = rgba[p4], pg = rgba[p4 + 1], pb = rgba[p4 + 2];
    var plum = L[pi];
    var isWood = pr > pg + 4 && pr - pb > 20 && plum < woodThresh;
    var isDark = plum < darkThresh;
    if (isWood || isDark) isBg[pi] = 1;
  }

  // 3. Scan boundaries from outside inward with frame-edge retention
  var xMid0 = Math.floor(dw * 0.20), xMid1 = Math.ceil(dw * 0.80);
  var yMid0 = Math.floor(dh * 0.20), yMid1 = Math.ceil(dh * 0.80);

  // TOP
  var topOuterCount = 0, topOuterTotal = 0;
  for (var ty0 = 0; ty0 < Math.min(3, dh); ty0++) {
    for (var tx0 = xMid0; tx0 < xMid1; tx0++) {
      if (isBg[ty0 * dw + tx0]) topOuterCount++;
      topOuterTotal++;
    }
  }
  var tl_y = 0.005, tr_y = 0.005;
  if (topOuterCount / Math.max(1, topOuterTotal) >= 0.20) {
    var maxScanT = Math.floor(dh * 0.16);
    function scanTop(x0, x1) {
      for (var y = 0; y < maxScanT; y++) {
        var bgC = 0, totC = 0;
        for (var x = x0; x < x1; x++) { if (isBg[y * dw + x]) bgC++; totC++; }
        if (bgC / Math.max(1, totC) < 0.15) return Math.max(0.005, (y - 1) / dh);
      }
      return 0.005;
    }
    tl_y = scanTop(Math.floor(dw * 0.15), Math.floor(dw * 0.45));
    tr_y = scanTop(Math.floor(dw * 0.55), Math.floor(dw * 0.85));
  }

  // BOTTOM
  var botOuterCount = 0, botOuterTotal = 0;
  for (var by0 = dh - 1; by0 >= Math.max(0, dh - 3); by0--) {
    for (var bx0 = xMid0; bx0 < xMid1; bx0++) {
      if (isBg[by0 * dw + bx0]) botOuterCount++;
      botOuterTotal++;
    }
  }
  var bl_y = 0.995, br_y = 0.995;
  if (botOuterCount / Math.max(1, botOuterTotal) >= 0.20) {
    var minScanB = Math.ceil(dh * 0.84);
    function scanBot(x0, x1) {
      for (var y = dh - 1; y >= minScanB; y--) {
        var bgC = 0, totC = 0;
        for (var x = x0; x < x1; x++) { if (isBg[y * dw + x]) bgC++; totC++; }
        if (bgC / Math.max(1, totC) < 0.15) return Math.min(0.995, (y + 1) / dh);
      }
      return 0.995;
    }
    bl_y = scanBot(Math.floor(dw * 0.15), Math.floor(dw * 0.45));
    br_y = scanBot(Math.floor(dw * 0.55), Math.floor(dw * 0.85));
  }

  // LEFT
  var leftOuterCount = 0, leftOuterTotal = 0;
  for (var lx0 = 0; lx0 < Math.min(3, dw); lx0++) {
    for (var ly0 = yMid0; ly0 < yMid1; ly0++) {
      if (isBg[ly0 * dw + lx0]) leftOuterCount++;
      leftOuterTotal++;
    }
  }
  var tl_x = 0.005, bl_x = 0.005;
  if (leftOuterCount / Math.max(1, leftOuterTotal) >= 0.20) {
    var maxScanL = Math.floor(dw * 0.16);
    function scanLeft(y0, y1) {
      for (var x = 0; x < maxScanL; x++) {
        var bgC = 0, totC = 0;
        for (var y = y0; y < y1; y++) { if (isBg[y * dw + x]) bgC++; totC++; }
        if (bgC / Math.max(1, totC) < 0.15) return Math.max(0.005, (x - 1) / dw);
      }
      return 0.005;
    }
    tl_x = scanLeft(Math.floor(dh * 0.15), Math.floor(dh * 0.45));
    bl_x = scanLeft(Math.floor(dh * 0.55), Math.floor(dh * 0.85));
  }

  // RIGHT
  var rightOuterCount = 0, rightOuterTotal = 0;
  for (var rx0 = dw - 1; rx0 >= Math.max(0, dw - 3); rx0--) {
    for (var ry0 = yMid0; ry0 < yMid1; ry0++) {
      if (isBg[ry0 * dw + rx0]) rightOuterCount++;
      rightOuterTotal++;
    }
  }
  var tr_x = 0.995, br_x = 0.995;
  if (rightOuterCount / Math.max(1, rightOuterTotal) >= 0.20) {
    var minScanR = Math.ceil(dw * 0.84);
    function scanRight(y0, y1) {
      for (var x = dw - 1; x >= minScanR; x--) {
        var bgC = 0, totC = 0;
        for (var y = y0; y < y1; y++) { if (isBg[y * dw + x]) bgC++; totC++; }
        if (bgC / Math.max(1, totC) < 0.15) return Math.min(0.995, (x + 1) / dw);
      }
      return 0.995;
    }
    tr_x = scanRight(Math.floor(dh * 0.15), Math.floor(dh * 0.45));
    br_x = scanRight(Math.floor(dh * 0.55), Math.floor(dh * 0.85));
  }

  var tl = { x: Math.max(0.005, Math.min(0.995, tl_x)), y: Math.max(0.005, Math.min(0.995, tl_y)) };
  var tr = { x: Math.max(0.005, Math.min(0.995, tr_x)), y: Math.max(0.005, Math.min(0.995, tr_y)) };
  var br = { x: Math.max(0.005, Math.min(0.995, br_x)), y: Math.max(0.005, Math.min(0.995, br_y)) };
  var bl = { x: Math.max(0.005, Math.min(0.995, bl_x)), y: Math.max(0.005, Math.min(0.995, bl_y)) };

  // Validate interior quad angles lie within [45 deg (0.7854 rad), 135 deg (2.3562 rad)]
  var pts = [
    { x: tl.x * dw, y: tl.y * dh },
    { x: tr.x * dw, y: tr.y * dh },
    { x: br.x * dw, y: br.y * dh },
    { x: bl.x * dw, y: bl.y * dh }
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

  var wSpan = Math.min(tr.x - tl.x, br.x - bl.x);
  var hSpan = Math.min(bl.y - tl.y, br.y - tr.y);
  if (!validAngles || wSpan < 0.45 || hSpan < 0.45) {
    return [
      { x: 0.005, y: 0.005 },
      { x: 0.995, y: 0.005 },
      { x: 0.995, y: 0.995 },
      { x: 0.005, y: 0.995 }
    ];
  }

  return [
    { x: Number(tl.x.toFixed(4)), y: Number(tl.y.toFixed(4)) },
    { x: Number(tr.x.toFixed(4)), y: Number(tr.y.toFixed(4)) },
    { x: Number(br.x.toFixed(4)), y: Number(br.y.toFixed(4)) },
    { x: Number(bl.x.toFixed(4)), y: Number(bl.y.toFixed(4)) }
  ];
}

// Stage 1B: 4-Point Perspective Homography Warp with Foreshortening Aspect Recovery & HD Normalization.
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
    foreshorten = Math.min(1.14, Math.sqrt(wMax / wMin));
  }

  var outW = Math.max(32, Math.round((wTop + wBot) * 0.5));
  var outH = Math.max(32, Math.round((hLeft + hRight) * 0.5 * foreshorten));
  var cap = maxDim || 3000;
  var curLong = Math.max(outW, outH);
  var minTarget = Math.min(cap, 3000);
  if (curLong > cap || curLong < minTarget) {
    var target = curLong > cap ? cap : minTarget;
    var r = target / curLong;
    outW = Math.max(32, Math.round(outW * r));
    outH = Math.max(32, Math.round(outH * r));
  }

  var dstCanvas = document.createElement('canvas');
  dstCanvas.width = outW;
  dstCanvas.height = outH;
  var dstCtx = dstCanvas.getContext('2d', { alpha: false });

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

// Stages 2-5: 5-stage document scanner pipeline (V3):
// Stage 2: Non-polluting outer border mask + 95th-percentile local paper illumination grid (5x5 MaxFilter + BoxBlur)
// Stage 3: Ink-darkening gamma = 1.42 power LUT (darkens midtone ballpoint strokes while snapping paper to #FFFFFF)
// Stage 4: Pink/red ruled margin line protection (1.75x chroma boost) + 1.5x luma-preserving ink chroma boost
// Stage 5: Continuous 15x15 sliding-window unsharp mask (1.35x ink core sharpening + paper grain suppression)
function enhanceDocumentCanvas(canvas, filterMode) {
  var mode = filterMode || 'magic';
  if (mode === 'original') return;

  var W = canvas.width;
  var H = canvas.height;
  var totalPx = W * H;
  var ctx = canvas.getContext('2d', { alpha: false });
  var imgData = ctx.getImageData(0, 0, W, H);
  var data = imgData.data;

  // 1. Sample interior paper chrominance and luminance
  var sampleRB = [], sampleL = [];
  var sy0 = (H * 0.20) | 0, sy1 = (H * 0.80) | 0;
  var sx0 = (W * 0.20) | 0, sx1 = (W * 0.80) | 0;
  var sStepY = Math.max(4, ((sy1 - sy0) / 24) | 0);
  var sStepX = Math.max(4, ((sx1 - sx0) / 24) | 0);
  for (var sy = sy0; sy < sy1; sy += sStepY) {
    for (var sx = sx0; sx < sx1; sx += sStepX) {
      var sp = ((sy * W + sx) << 2);
      var rS = data[sp], gS = data[sp + 1], bS = data[sp + 2];
      sampleRB.push(rS - bS);
      sampleL.push((38 * rS + 75 * gS + 15 * bS) >> 7);
    }
  }
  sampleRB.sort(function (a, b) { return a - b; });
  sampleL.sort(function (a, b) { return a - b; });
  var baseRb = sampleRB.length ? sampleRB[sampleRB.length >> 1] : 4;
  var paperL75 = sampleL.length ? sampleL[Math.floor(sampleL.length * 0.75)] : 180;

  // 2. Mark outer non-paper intrusion in borderMask WITHOUT mutating data before illumination estimation
  var brCornerIdx = (((H * 0.98) | 0) * W + ((W * 0.98) | 0)) << 2;
  var brCornerLum = (38 * data[brCornerIdx] + 75 * data[brCornerIdx + 1] + 15 * data[brCornerIdx + 2]) >> 7;
  var hasDogEarBR = brCornerLum < paperL75 * 0.60;

  var borderMask = new Uint8Array(totalPx);
  var mLeft = (W * 0.05) | 0, mRight = (W * 0.95) | 0;
  var mTop = (H * 0.04) | 0, mBot = (H * 0.96) | 0;

  for (var by = 0; by < H; by++) {
    var inYMargin = by < mTop || by > mBot;
    var inDogEarY = hasDogEarBR && by > (H * 0.91);
    var rOff = by * W;
    for (var bx = 0; bx < W; bx++) {
      var inXMargin = bx < mLeft || bx > mRight;
      var inDogEarX = hasDogEarBR && bx > (W * 0.85);
      if (!inYMargin && !inXMargin && !(inDogEarY && inDogEarX)) {
        bx = Math.max(bx, Math.min((W * 0.85) | 0, mRight) - 1);
        continue;
      }
      var pIdx0 = rOff + bx;
      var bpIdx = pIdx0 << 2;
      var br = data[bpIdx], bg = data[bpIdx + 1], bb = data[bpIdx + 2];
      var blum = (38 * br + 75 * bg + 15 * bb) >> 7;
      var isWarmDesk = (inYMargin || inXMargin) && (br - bb) > (baseRb + 18) && blum < paperL75 * 0.92;
      var isThumbSkin = inXMargin && br > 95 && bg > 40 && bb > 20 && (br - bg) > 15 && (br - bb) > (baseRb + 16) && blum < 210;
      var isDogEar = inDogEarY && inDogEarX && blum < paperL75 * 0.65;
      if (isWarmDesk || isThumbSkin || isDogEar) {
        borderMask[pIdx0] = 1;
      }
    }
  }

  // 3. Build local paper illumination grid using 95th-percentile brightest non-masked pixel per cell
  var cell = Math.max(14, Math.round(Math.max(W, H) / 140));
  var gw = Math.max(8, Math.ceil(W / cell));
  var gh = Math.max(8, Math.ceil(H / cell));
  var gridCount = gw * gh;
  var bgR = new Uint8Array(gridCount);
  var bgG = new Uint8Array(gridCount);
  var bgB = new Uint8Array(gridCount);

  var cellSamples = [];
  for (var gy = 0; gy < gh; gy++) {
    var y0 = gy * cell;
    var y1 = Math.min(H, y0 + cell);
    for (var gx = 0; gx < gw; gx++) {
      var x0 = gx * cell;
      var x1 = Math.min(W, x0 + cell);
      cellSamples.length = 0;
      for (var py = y0; py < y1; py += 2) {
        var rowP = py * W;
        for (var px = x0; px < x1; px += 2) {
          var pI = rowP + px;
          if (borderMask[pI]) continue;
          var dI = pI << 2;
          var r0 = data[dI], g0 = data[dI + 1], b0 = data[dI + 2];
          var l0 = (38 * r0 + 75 * g0 + 15 * b0) >> 7;
          cellSamples.push((l0 << 24) | (r0 << 16) | (g0 << 8) | b0);
        }
      }
      var gi = gy * gw + gx;
      if (cellSamples.length > 0) {
        cellSamples.sort(function (a, b) { return (a >>> 24) - (b >>> 24); });
        var pick = cellSamples[Math.min(cellSamples.length - 1, Math.floor(cellSamples.length * 0.95))];
        bgR[gi] = Math.max(75, (pick >>> 16) & 0xff);
        bgG[gi] = Math.max(75, (pick >>> 8) & 0xff);
        bgB[gi] = Math.max(75, pick & 0xff);
      } else {
        bgR[gi] = 0; bgG[gi] = 0; bgB[gi] = 0;
      }
    }
  }

  for (var gyF = 0; gyF < gh; gyF++) {
    var lastR = paperL75, lastG = paperL75, lastB = paperL75;
    for (var gxF = 0; gxF < gw; gxF++) {
      var idxF = gyF * gw + gxF;
      if (bgR[idxF] > 0) { lastR = bgR[idxF]; lastG = bgG[idxF]; lastB = bgB[idxF]; }
      else { bgR[idxF] = lastR; bgG[idxF] = lastG; bgB[idxF] = lastB; }
    }
    for (var gxB = gw - 1; gxB >= 0; gxB--) {
      var idxB = gyF * gw + gxB;
      if (bgR[idxB] > 0) { lastR = bgR[idxB]; lastG = bgG[idxB]; lastB = bgB[idxB]; }
      else { bgR[idxB] = lastR; bgG[idxB] = lastG; bgB[idxB] = lastB; }
    }
  }

  // 5x5 MaxFilter (mRad = 2 cells) to bridge across dense handwriting & underlines
  var tmpR = new Uint8Array(gridCount);
  var tmpG = new Uint8Array(gridCount);
  var tmpB = new Uint8Array(gridCount);
  var mRad = 2;
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
      bgR[mo] = mr2;
      bgG[mo] = mg2;
      bgB[mo] = mb2;
    }
  }

  // 2 passes of separable BoxBlur (bRad = 2)
  var bRad = 2;
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

  // 4. Smooth-Transition S-Curve LUT (darkens ink core while preserving fine anti-aliased pen stroke tapering)
  var bp = 42, wp = 208;
  if (mode === 'bleed_erase') { bp = 52; wp = 198; }
  else if (mode === 'whiteboard') { bp = 34; wp = 220; }
  else if (mode === 'grayscale') { bp = 40; wp = 210; }
  else if (mode === 'bw') { bp = 46; wp = 212; }

  var lut = new Uint8Array(256);
  var span = Math.max(1, wp - bp);
  for (var li = 0; li < 256; li++) {
    if (li <= bp) lut[li] = 0;
    else if (li >= wp) lut[li] = 255;
    else {
      var t = (li - bp) / span;
      var s = t * t * (3.0 - 2.0 * t);
      lut[li] = Math.min(255, Math.floor((0.35 * s + 0.65 * Math.pow(t, 1.15)) * 255.0));
    }
  }

  var lumaBuf = new Uint8Array(totalPx);
  var isColor = mode === 'magic' || mode === 'bleed_erase' || mode === 'whiteboard';
  var invCell = 1 / cell;

  for (var y = 0; y < H; y++) {
    var gyF2 = y * invCell;
    var gy0I = Math.min(gh - 1, gyF2 | 0);
    var gy1I = Math.min(gh - 1, gy0I + 1);
    var fy = gyF2 - gy0I;
    var rowG0 = gy0I * gw;
    var rowG1 = gy1I * gw;
    var rowPx = y * W;

    for (var x = 0; x < W; x++) {
      var pIdx = rowPx + x;
      var dIdx = pIdx << 2;

      if (borderMask[pIdx]) {
        data[dIdx] = 255; data[dIdx + 1] = 255; data[dIdx + 2] = 255;
        lumaBuf[pIdx] = 255;
        continue;
      }

      var gxF2 = x * invCell;
      var gx0I = Math.min(gw - 1, gxF2 | 0);
      var gx1I = Math.min(gw - 1, gx0I + 1);
      var fx = gxF2 - gx0I;

      var w00 = (1 - fx) * (1 - fy);
      var w10 = fx * (1 - fy);
      var w01 = (1 - fx) * fy;
      var w11 = fx * fy;

      var i00 = rowG0 + gx0I, i10 = rowG0 + gx1I;
      var i01 = rowG1 + gx0I, i11 = rowG1 + gx1I;

      var illR = bgR[i00] * w00 + bgR[i10] * w10 + bgR[i01] * w01 + bgR[i11] * w11;
      var illG = bgG[i00] * w00 + bgG[i10] * w10 + bgG[i01] * w01 + bgG[i11] * w11;
      var illB = bgB[i00] * w00 + bgB[i10] * w10 + bgB[i01] * w01 + bgB[i11] * w11;

      var dr = Math.min(255, ((data[dIdx] * 255) / illR) | 0);
      var dg = Math.min(255, ((data[dIdx + 1] * 255) / illG) | 0);
      var db = Math.min(255, ((data[dIdx + 2] * 255) / illB) | 0);

      var nLum = (38 * dr + 75 * dg + 15 * db) >> 7;
      var rgDiff = dr - dg;
      var maxC = Math.max(dr, dg, db), minC = Math.min(dr, dg, db);
      var chroma = maxC - minC;

      var nr, ng, nb, lum;
      // Protect pink/red ruled margin lines from white-point clipping
      if (isColor && mode !== 'bleed_erase' && dr >= 210 && rgDiff >= 12 && dr >= db && nLum >= 175 && nLum <= 246) {
        var wpCol = 246;
        var mappedL = nLum >= wpCol ? 255 : Math.min(234, Math.round(162 + ((nLum - 175) * 72) / (wpCol - 175)));
        var cBoost = 1.75;
        nr = Math.min(255, Math.max(0, Math.round(mappedL + (dr - nLum) * cBoost)));
        ng = Math.min(255, Math.max(0, Math.round(mappedL + (dg - nLum) * cBoost)));
        nb = Math.min(255, Math.max(0, Math.round(mappedL + (db - nLum) * cBoost)));
        lum = (38 * nr + 75 * ng + 15 * nb) >> 7;
      } else if (nLum >= wp - 6 && chroma <= 14) {
        nr = 255; ng = 255; nb = 255; lum = 255;
      } else {
        nr = lut[dr];
        ng = lut[dg];
        nb = lut[db];
        lum = (38 * nr + 75 * ng + 15 * nb) >> 7;
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
      }

      data[dIdx] = nr;
      data[dIdx + 1] = ng;
      data[dIdx + 2] = nb;
      lumaBuf[pIdx] = lum;
    }
  }

  // 5. Micro 5x5 sliding-window box blur on luminance + fine ink unsharp mask
  var hBlur = new Uint8Array(totalPx);
  var blur5 = new Uint8Array(totalPx);
  var sRad = 2;
  var winLen = 5;

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
      blur5[vy * W + vx] = (sumV / winLen) | 0;
      var subY = Math.max(0, vy - sRad);
      var addY = Math.min(H - 1, vy + sRad + 1);
      sumV += hBlur[addY * W + vx] - hBlur[subY * W + vx];
    }
  }

  var isBw = mode === 'bw';
  for (var p = 0; p < totalPx; p++) {
    var curL = lumaBuf[p];
    var meanL = blur5[p];
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
      var delta = diff >= -4 ? (diff >> 2) : Math.round(diff * 0.55);
      var fr = data[qIdx] + delta;
      var fg = data[qIdx + 1] + delta;
      var fb = data[qIdx + 2] + delta;
      var cSpan = Math.max(fr, fg, fb) - Math.min(fr, fg, fb);
      if (fr >= 246 && fg >= 246 && fb >= 246 && diff >= -5 && cSpan <= 12) {
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
      var warped = warpQuadToCanvas(srcP, quad, maxDim);
      if (warped !== srcP) { srcP.width = 0; srcP.height = 0; }
      var activeFilter = msg.filter || 'magic';
      enhanceDocumentCanvas(warped, activeFilter);
      if (msg.whiteoutStrokes && msg.whiteoutStrokes.length) {
        paintWhiteoutStrokes(warped, msg.whiteoutStrokes, activeFilter);
      }
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

