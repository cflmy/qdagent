// A local PDF preview plugin.
// The bundled third-party PDF integration fails inside the isolated reader and
// emits no diagnostics, so this module renders pages with pdf.js directly.
// The frame is sandboxed without allow-same-origin: only classic blob workers
// can be created there, so the worker is inlined and injected as a port.
import {GlobalWorkerOptions, getDocument, type PDFDocumentProxy} from 'pdfjs-dist/legacy/build/pdf.mjs';
import InlineWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?worker&inline';

export interface PagePluginContext {
  viewport: HTMLElement;
  file: {blob?: Blob; mimeType: string; extension: string; name: string};
  setLoading: (loading: boolean) => void;
}

export function localPdfPlugin() {
  return {
    name: 'local-pdf-pages',
    match: (file: {mimeType: string; extension: string}) =>
      file.mimeType === 'application/pdf' || file.extension === 'pdf',
    async render(ctx: PagePluginContext) {
      const blob = ctx.file.blob;
      if (!blob) throw new Error('PDF 内容不可用');
      ctx.setLoading(true);
      try {
        GlobalWorkerOptions.workerPort = new InlineWorker();
        const data = new Uint8Array(await blob.arrayBuffer());
        const document = await getDocument({data}).promise;
        const host = window.document.createElement('div');
        host.className = 'pdf-pages';
        ctx.viewport.appendChild(host);
        return await paint(document, host);
      } finally {
        ctx.setLoading(false);
      }
    },
  };
}

async function paint(pdf: PDFDocumentProxy, host: HTMLElement) {
  const scale = 1.5;
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number);
    const viewport = page.getViewport({scale});
    const canvas = window.document.createElement('canvas');
    canvas.className = 'pdf-page';
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    host.appendChild(canvas);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PDF 画布不可用');
    await page.render({canvasContext: context, viewport, canvas} as never).promise;
  }
  return {
    destroy() {
      void pdf.destroy();
      host.remove();
    },
  };
}
