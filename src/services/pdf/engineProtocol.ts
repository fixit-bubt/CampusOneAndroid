// The engine's request/response bookkeeping, kept apart from the WebView that
// carries it. This half is pure, so it can be tested without a device.
import { PdfError, type PdfErrorCode, type ScanQuad } from './presets';

export interface PendingJob { resolve: (v: any) => void; reject: (e: any) => void }

export type EngineMessage =
  | { id: number; type: 'ready' }
  | { id: number; type: 'fatal' }
  | { id: number; type: 'opened'; pages: number; textChars: number }
  | { id: number; type: 'thumb'; page: number; base64: string }
  | { id: number; type: 'page'; page: number; base64: string; wPt: number; hPt: number }
  | { id: number; type: 'scanned'; base64: string; width: number; height: number; quad?: ScanQuad }
  | { id: number; type: 'quad'; quad: ScanQuad }
  | { id: number; type: 'signature'; base64: string; width: number; height: number }
  | { id: number; type: 'error'; code: string; detail?: string };

export function reduceEngineMessage(pending: Map<number, PendingJob>, msg: EngineMessage): void {
  if (msg.type === 'ready') return;
  if (msg.type === 'fatal') {
    // A dead engine cannot be tied to one job, so fail them all rather than
    // leaving the UI waiting on an answer that will never come.
    for (const [, job] of pending) job.reject(new PdfError('engine-failed'));
    pending.clear();
    return;
  }
  const job = pending.get(msg.id);
  if (!job) return;
  pending.delete(msg.id);
  if (msg.type === 'error') job.reject(new PdfError(msg.code as PdfErrorCode, msg.detail));
  else if (msg.type === 'opened') job.resolve({ pages: msg.pages, textChars: msg.textChars });
  else if (msg.type === 'thumb') job.resolve(msg.base64);
  else if (msg.type === 'scanned') job.resolve({ base64: msg.base64, width: msg.width, height: msg.height, quad: msg.quad });
  else if (msg.type === 'quad') job.resolve({ quad: msg.quad });
  else if (msg.type === 'signature') job.resolve({ base64: msg.base64, width: msg.width, height: msg.height });
  else job.resolve({ base64: msg.base64, wPt: msg.wPt, hPt: msg.hPt });
}

