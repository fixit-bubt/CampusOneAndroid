import { buildViewerHtml } from '../viewerHtml';

describe('buildViewerHtml', () => {
  const darkHtml = buildViewerHtml(true);
  const lightHtml = buildViewerHtml(false);

  it('imports the local vendored pdfjs runtime', () => {
    expect(darkHtml).toContain("import * as pdfjs from './pdf.min.mjs'");
    expect(darkHtml).toContain("workerSrc = './pdf.worker.min.mjs'");
  });

  it('reads local files with XHR rather than fetch to support file:// scheme', () => {
    expect(darkHtml).toContain('new XMLHttpRequest()');
    expect(darkHtml).not.toContain('fetch(');
  });

  it('notifies React Native via ReactNativeWebView.postMessage', () => {
    expect(darkHtml).toContain('window.ReactNativeWebView.postMessage');
    expect(darkHtml).toContain("type: 'viewerReady'");
    expect(darkHtml).toContain("type: 'docOpened'");
    expect(darkHtml).toContain("type: 'pageChange'");
  });

  it('supports dark mode and light mode backgrounds', () => {
    expect(darkHtml).toContain('background-color: #000000');
    expect(lightHtml).toContain('background-color: #f1f5f9');
  });

  it('has responsive scale calculation and supersampling for retina displays', () => {
    expect(darkHtml).toContain('window.devicePixelRatio');
    expect(darkHtml).toContain('page.getViewport');
    expect(darkHtml).toContain('page.render');
  });

  it('contains double tap to zoom and page jump functionality', () => {
    expect(darkHtml).toContain('window.scrollToPage');
    expect(darkHtml).toContain('setupDoubleTapZoom');
  });
});

