// Self-contained HTML for the in-app PDF viewer.
// Runs locally in a WebView over file:// next to the vendored pdf.js runtime.
// Supports direct memory base64 loading and local XHR fallback.
// No external network requests, zero Google Docs dependency, 100% offline-ready.

export function buildViewerHtml(isDark: boolean = true): string {
  const bg = isDark ? '#000000' : '#f1f5f9';
  const paperBg = '#ffffff';
  const shadowColor = isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.12)';
  const textColor = isDark ? '#a1a1aa' : '#64748b';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <!-- Content Security Policy: strictly local file execution, no external phone-home -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' file: 'unsafe-inline' blob:; worker-src 'self' file: blob:; child-src 'self' file: blob:; img-src 'self' file: data: blob:; style-src 'unsafe-inline'; connect-src 'self' file: data: blob:;">
  <style>
    * {
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100%;
      background-color: ${bg};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow-x: hidden;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    #viewer-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 14px 10px 96px 10px;
      gap: 16px;
      width: 100%;
      min-height: 100%;
    }
    .page-card {
      position: relative;
      background-color: ${paperBg};
      border-radius: 4px;
      box-shadow: 0 4px 20px ${shadowColor};
      overflow: hidden;
      width: calc(100% - 4px);
      max-width: 650px;
      aspect-ratio: 1 / 1.414; /* Standard A4 paper proportion */
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 auto;
      transition: opacity 0.2s ease-out;
    }
    .page-card canvas {
      display: block;
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
    }
    .page-placeholder {
      width: 100%;
      height: 100%;
      aspect-ratio: 1 / 1.414;
      background-color: ${paperBg};
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .page-placeholder::after {
      content: '';
      width: 28px;
      height: 28px;
      border: 3px solid rgba(91, 133, 247, 0.2);
      border-top-color: #5b85f7;
      border-radius: 50%;
      animation: phSpin 0.75s linear infinite;
    }
    @keyframes phSpin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div id="viewer-container"></div>

  <script>
    // Global fallback error reporter
    window.addEventListener('error', function(e) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: (e && e.message) ? e.message : 'Viewer runtime initialization error'
        }));
      }
    }, true);
  </script>

  <script type="module">
    import * as pdfjs from './pdf.min.mjs';
    pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';

    function send(data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    let pdfDoc = null;
    let totalPages = 0;
    const renderedPages = new Set();
    const renderingPages = new Set();
    const container = document.getElementById('viewer-container');

    // Read a local sibling file as bytes over XHR with relative fallback
    function readLocalBytes(path) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', path, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          if (xhr.response) resolve(xhr.response);
          else reject(new Error('Empty response'));
        };
        xhr.onerror = function() {
          // Fallback to relative path if absolute file:/// had issues
          const relXhr = new XMLHttpRequest();
          relXhr.open('GET', './active_viewer_doc.pdf', true);
          relXhr.responseType = 'arraybuffer';
          relXhr.onload = function() {
            if (relXhr.response) resolve(relXhr.response);
            else reject(new Error('Empty fallback response'));
          };
          relXhr.onerror = function() {
            reject(new Error('Failed to read document'));
          };
          relXhr.send();
        };
        xhr.send();
      });
    }

    let currentLoadId = 0;
    async function initPdfWithBytes(bytes) {
      const loadId = ++currentLoadId;
      try {
        if (pdfDoc) {
          try { await pdfDoc.destroy(); } catch (e) {}
          pdfDoc = null;
        }
        renderedPages.clear();
        renderingPages.clear();
        container.innerHTML = '';
        window.scrollTo(0, 0);

        const loadingTask = pdfjs.getDocument({
          data: bytes,
          useSystemFonts: true
        });
        const doc = await loadingTask.promise;
        if (loadId !== currentLoadId) {
          try { doc.destroy(); } catch (e) {}
          return;
        }
        pdfDoc = doc;

        totalPages = pdfDoc.numPages;
        send({ type: 'rendering', total: totalPages });

        // Guaranteed single cleanup of container before creating exact page count cards
        container.innerHTML = '';
        renderedPages.clear();
        renderingPages.clear();

        // Create page placeholders with full A4 proportion
        for (let i = 1; i <= totalPages; i++) {
          const card = document.createElement('div');
          card.className = 'page-card';
          card.id = 'page-' + i;
          card.dataset.pageNumber = i;

          const ph = document.createElement('div');
          ph.className = 'page-placeholder';
          ph.id = 'ph-' + i;
          card.appendChild(ph);

          container.appendChild(card);
        }

        // Render page 1 first BEFORE telling React Native to reveal the viewer
        await renderPage(1);

        setupIntersectionObservers();
        setupDoubleTapZoom();

        // Signal React Native that Page 1 is fully rendered on screen!
        send({ type: 'docOpened', totalPages: totalPages });

        // Progressive background rendering queue for all remaining pages
        let bgPage = 2;
        function pumpBgRenderQueue() {
          if (!pdfDoc || loadId !== currentLoadId || bgPage > totalPages) return;
          const p = bgPage++;
          renderPage(p).finally(() => {
            if (loadId === currentLoadId && bgPage <= totalPages) {
              if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(pumpBgRenderQueue, { timeout: 150 });
              } else {
                setTimeout(pumpBgRenderQueue, 40);
              }
            }
          });
        }
        if (totalPages > 1) {
          pumpBgRenderQueue();
        }

      } catch (err) {
        send({ type: 'error', message: String(err && err.message ? err.message : err) });
      }
    }

    // Direct memory loading via base64: eliminates XHR, CORS, and file path issues entirely
    window.loadPdfData = async function(base64Data) {
      try {
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        await initPdfWithBytes(bytes);
      } catch (e) {
        send({ type: 'error', message: 'Decode error: ' + (e && e.message ? e.message : e) });
      }
    };

    // File path loading via XHR
    window.loadPdfDoc = async function(filePath) {
      try {
        const buffer = await readLocalBytes(filePath);
        await initPdfWithBytes(new Uint8Array(buffer));
      } catch (err) {
        send({ type: 'error', message: String(err && err.message ? err.message : err) });
      }
    };

    async function renderPage(num) {
      if (!pdfDoc || renderedPages.has(num) || renderingPages.has(num)) return;
      renderingPages.add(num);

      const card = document.getElementById('page-' + num);
      if (!card) {
        renderingPages.delete(num);
        return;
      }

      try {
        const page = await pdfDoc.getPage(num);
        const unscaledViewport = page.getViewport({ scale: 1 });

        // Calculate responsive scale to fit viewport width with comfortable margins
        const screenWidth = window.innerWidth || document.documentElement.clientWidth;
        const targetWidth = Math.max(screenWidth - 20, 280); // 10px margin on each side
        const fitScale = targetWidth / unscaledViewport.width;

        // Supersample for crisp AMOLED retina display
        const dpr = Math.min(window.devicePixelRatio || 2, 2.5);
        const renderScale = fitScale * dpr;
        const viewport = page.getViewport({ scale: renderScale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = Math.floor(viewport.width / dpr) + 'px';
        canvas.style.height = Math.floor(viewport.height / dpr) + 'px';

        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        const ph = document.getElementById('ph-' + num);
        if (ph && ph.parentNode === card) {
          card.removeChild(ph);
        }
        // Let the rendered canvas control card height naturally
        card.style.aspectRatio = 'auto';
        card.style.height = 'auto';
        card.style.minHeight = 'auto';

        card.appendChild(canvas);
        renderedPages.add(num);
      } catch (err) {
        console.error('Error rendering page ' + num, err);
      } finally {
        renderingPages.delete(num);
      }
    }

    function setupIntersectionObservers() {
      // Observer 1: Lazy load pages as they come near the viewport
      const renderObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.dataset.pageNumber, 10);
            renderPage(pageNum);
            if (pageNum < totalPages) renderPage(pageNum + 1);
            if (pageNum > 1) renderPage(pageNum - 1);
          }
        });
      }, { rootMargin: '300px 0px 300px 0px', threshold: 0.05 });

      // Observer 2: Track active visible page
      const visibleObserver = new IntersectionObserver((entries) => {
        let bestRatio = 0;
        let activePage = 1;
        entries.forEach((entry) => {
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            activePage = parseInt(entry.target.dataset.pageNumber, 10);
          }
        });
        if (bestRatio > 0.15) {
          send({ type: 'pageChange', page: activePage, total: totalPages });
        }
      }, { threshold: [0.15, 0.5, 0.85] });

      for (let i = 1; i <= totalPages; i++) {
        const card = document.getElementById('page-' + i);
        if (card) {
          renderObserver.observe(card);
          visibleObserver.observe(card);
        }
      }

      // Fallback scroll listener: guarantees visible pages render even if IntersectionObserver is starved on Android WebView
      function checkViewportPages() {
        if (!pdfDoc) return;
        const vTop = window.scrollY || window.pageYOffset || 0;
        const vBot = vTop + (window.innerHeight || document.documentElement.clientHeight || 800);
        for (let i = 1; i <= totalPages; i++) {
          if (!renderedPages.has(i) && !renderingPages.has(i)) {
            const card = document.getElementById('page-' + i);
            if (card) {
              const top = card.offsetTop;
              const bottom = top + card.offsetHeight;
              if (bottom >= vTop - 500 && top <= vBot + 500) {
                renderPage(i);
              }
            }
          }
        }
      }
      window.addEventListener('scroll', checkViewportPages, { passive: true });
    }

    window.scrollToPage = function(num) {
      const card = document.getElementById('page-' + num);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        renderPage(num);
      }
    };

    window.findSectionPage = async function(query) {
      if (!pdfDoc) return -1;
      const q = (query || '').toLowerCase().trim();
      if (!q) return -1;
      const rawTokens = q.split(/[\s,·/_ -]+/).filter(function(t) { return t.length > 0; });
      const pageTexts = [];
      for (let i = 1; i <= totalPages; i++) {
        try {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const str = textContent.items.map(function(it) { return it.str; }).join(' ').toLowerCase();
          pageTexts.push({ pageNum: i, text: str });
        } catch (e) {
          pageTexts.push({ pageNum: i, text: '' });
        }
      }

      // Pass 1: Strict match (all tokens present)
      for (let idx = 0; idx < pageTexts.length; idx++) {
        const item = pageTexts[idx];
        const allMatch = rawTokens.every(function(t) { return item.text.indexOf(t) !== -1; });
        if (allMatch) {
          window.scrollToPage(item.pageNum);
          send({ type: 'pageMatched', page: item.pageNum, query: query, totalPages: totalPages });
          return item.pageNum;
        }
      }

      // Pass 2: Look for digits (e.g. intake "51" and section "2")
      const digits = rawTokens.filter(function(t) { return /^\d+$/.test(t); });
      if (digits.length >= 2) {
        for (let idx = 0; idx < pageTexts.length; idx++) {
          const item = pageTexts[idx];
          const hasAllDigits = digits.every(function(d) { return item.text.indexOf(d) !== -1; });
          if (hasAllDigits) {
            window.scrollToPage(item.pageNum);
            send({ type: 'pageMatched', page: item.pageNum, query: query, totalPages: totalPages });
            return item.pageNum;
          }
        }
      }

      send({ type: 'pageMatched', page: -1, query: query, totalPages: totalPages });
      return -1;
    };

    function setupDoubleTapZoom() {
      let lastTap = 0;
      let isZoomed = false;
      document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTap < 300 && e.changedTouches && e.changedTouches.length) {
          e.preventDefault();
          isZoomed = !isZoomed;
          if (isZoomed) {
            const touch = e.changedTouches[0];
            container.style.transformOrigin = touch.clientX + 'px ' + touch.clientY + 'px';
            container.style.transition = 'transform 0.24s cubic-bezier(0.2, 0, 0, 1)';
            container.style.transform = 'scale(2.2)';
          } else {
            container.style.transition = 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)';
            container.style.transform = 'scale(1.0)';
          }
        }
        lastTap = now;
      });
    }

    // Tell React Native the viewer shell is ready
    window.__viewerShellReady = true;
    send({ type: 'viewerReady' });
  </script>
</body>
</html>`;
}
