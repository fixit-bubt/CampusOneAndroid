import { useCallback, useState } from 'react';
import { CampusPdfViewerModal } from './CampusPdfViewerModal';

interface PdfDoc { url: string; title: string; category?: string }

// open(url, title) shows the in-app viewer; render `viewer` once in the screen.
export function usePdfViewer() {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const open = useCallback((url: string, title: string, category = 'Document') => setDoc({ url, title, category }), []);
  const viewer = (
    <CampusPdfViewerModal
      visible={!!doc}
      onClose={() => setDoc(null)}
      title={doc?.title ?? ''}
      category={doc?.category}
      fileUrl={doc?.url ?? ''}
      fileName={`${(doc?.title ?? 'document').replace(/[^\w\- ]+/g, '').trim() || 'document'}.pdf`}
    />
  );
  return { open, viewer };
}
