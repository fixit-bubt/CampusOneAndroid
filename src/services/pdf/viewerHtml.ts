// Self-contained HTML for the in-app PDF viewer.
// Runs locally in a WebView over file:// next to the vendored pdf.js runtime.
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
      max-width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: transform 0.2s ease-out;
    }
    .page-card canvas {
      display: block;
      max-width: 100%;
      height: auto;
    }
    .page-placeholder {
      width: 100%;
      height: 480px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: ${paperBg};
      color: #94a3b8;
      font-size: 13px;
      gap: 8px;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    #init-loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding-top: 60px;
      color: ${textColor};
      font-size: 14px;
      gap: 12px;
    }
  </style>
</head>
<body>
  <div id="viewer-container">
    <div id="init-loader">
      <div class="spinner"></div>
      <div>Preparing notice…</div>
    </div>
  </div>

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
    const initLoader = document.getElementById('init-loader');

    // Read a local sibling file as bytes over XHR
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
          reject(new Error('Failed to read document'));
        };
        xhr.send();
      });
    }

    window.loadPdfDoc = async function(filePath) {
      try {
        const buffer = await readLocalBytes(filePath);
        pdfDoc = await pdfjs.getDocument({
          data: new Uint8Array(buffer),
          useSystemFonts: true
        }).promise;

        totalPages = pdfDoc.numPages;
        if (initLoader) initLoader.style.display = 'none';

        send({ type: 'docOpened', totalPages: totalPages });

        // Create page placeholders
        for (let i = 1; i <= totalPages; i++) {
          const card = document.createElement('div');
          card.className = 'page-card';
          card.id = 'page-' + i;
          card.dataset.pageNumber = i;

          const ph = document.createElement('div');
          ph.className = 'page-placeholder';
          ph.id = 'ph-' + i;
          ph.innerHTML = '<div class="spinner"></div><div>Page ' + i + '</div>';
          card.appendChild(ph);

          container.appendChild(card);
        }

        // Render page 1 immediately
        await renderPage(1);

        // Pre-render page 2 if it exists
        if (totalPages > 1) {
          renderPage(2);
        }

        setupIntersectionObservers();
        setupDoubleTapZoom();

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
    }

    window.scrollToPage = function(num) {
      const card = document.getElementById('page-' + num);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        renderPage(num);
      }
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
    send({ type: 'viewerReady' });
  </script>
</body>
</html>`;
}

