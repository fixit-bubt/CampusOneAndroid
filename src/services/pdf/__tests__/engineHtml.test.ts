import { buildEngineHtml } from '../engineHtml';
import { TEXT_SAMPLE_PAGES } from '../presets';

// The engine page is a template literal, so a stray backtick or an accidental
// interpolation breaks it silently. These assertions pin the parts of the
// contract the native side depends on.
describe('buildEngineHtml', () => {
  const html = buildEngineHtml();

  it('loads the vendored runtime by the names the engine folder uses', () => {
    expect(html).toContain("import * as pdfjs from './pdf.min.mjs'");
    expect(html).toContain("workerSrc = './pdf.worker.min.mjs'");
  });

  it('reads local files with XHR, never fetch, which refuses the file scheme', () => {
    expect(html).toContain('new XMLHttpRequest()');
    expect(html).not.toContain('fetch(');
  });

  it('reports its own failures so a dead page cannot hang the native side', () => {
    expect(html).toContain('window.onerror');
    expect(html).toContain('unhandledrejection');
    expect(html).toContain("type: 'fatal'");
    expect(html).toContain("type: 'ready'");
  });

  it('carries a policy that allows no outside origin', () => {
    const csp = /content="(default-src[^"]+)"/.exec(html)?.[1];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'none'");
    // The exfiltration routes a navigation guard cannot see.
    expect(csp).not.toMatch(/https?:/);
    expect(csp).not.toContain('ws');
    expect(csp).not.toContain('*');
  });

  it('interpolates the sample size rather than leaving the expression in', () => {
    expect(html).toContain(`Math.min(${TEXT_SAMPLE_PAGES}, doc.numPages)`);
    expect(html).not.toContain('${');
  });
});
