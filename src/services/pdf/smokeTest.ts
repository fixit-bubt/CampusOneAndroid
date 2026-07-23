// Dev-only proof that pdf-lib runs under Hermes. Wired to a __DEV__ row on
// the PDF Maker landing screen. If this fails on a device, PDF assembly has
// to move into the WebView engine and the four tools change shape.
import { PDFDocument } from 'pdf-lib';
import { savePdfBytes } from './pdfFiles';

// A tiny JPEG, base64. Small enough to inline, real enough that embedJpg has
// to parse a genuine SOF marker.
const TINY_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAADAAMBAREA/8QAHwAAAQUBAQEB' +
  'AQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1Fh' +
  'ByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZ' +
  'WmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXG' +
  'x8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+v//Z';

export async function smokeTestPdfLib(): Promise<number> {
  const pdf = await PDFDocument.create();
  const jpg = await pdf.embedJpg(TINY_JPEG_B64);
  const page = pdf.addPage([200, 200]);
  page.drawImage(jpg, { x: 20, y: 20, width: 160, height: 160 });
  const bytes = await pdf.save();
  const saved = await savePdfBytes(bytes, 'pdf-lib-smoke-test.pdf');
  return saved.bytes;
}
