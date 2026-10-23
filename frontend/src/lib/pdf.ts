import type { PDFDocumentProxy } from 'pdfjs-dist';
import { squashWithMap } from './slideMap.js';

/**
 * Browser-side PDF rendering for the slide view. pdf.js is ~400KB, so it's
 * loaded on first use rather than shipped in the main bundle — teachers who
 * only ever paste text never download it.
 */

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

function loadPdfjs() {
  pdfjsPromise ??= Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return pdfjsPromise;
}

const documents = new WeakMap<File, Promise<PDFDocumentProxy>>();

export function openPdf(file: File): Promise<PDFDocumentProxy> {
  let doc = documents.get(file);
  if (!doc) {
    doc = Promise.all([loadPdfjs(), file.arrayBuffer()]).then(
      ([pdfjs, data]) => pdfjs.getDocument({ data: new Uint8Array(data) }).promise,
    );
    documents.set(file, doc);
  }
  return doc;
}

/** A rectangle in page space, as fractions (0-1) of the page's width/height. */
export interface PageBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RenderedPage {
  /** Height / width, so the overlay container can reserve the right space. */
  aspect: number;
  /** For each requested quote (by index), the boxes covering it — empty when it couldn't be found. */
  quoteBoxes: PageBox[][];
}

/**
 * Draws one page into `canvas` at `cssWidth` CSS pixels wide, and locates
 * each quote among the page's positioned text items so pins and highlights
 * can sit on the real words.
 */
export async function renderPdfPage(
  file: File,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  cssWidth: number,
  quotes: string[],
): Promise<RenderedPage> {
  const [pdfjs, doc] = await Promise.all([loadPdfjs(), openPdf(file)]);
  const page = await doc.getPage(pageIndex + 1);
  const base = page.getViewport({ scale: 1 });
  const scale = cssWidth / base.width;
  const dpr = window.devicePixelRatio || 1;
  const viewport = page.getViewport({ scale: scale * dpr });

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvas, viewport }).promise;

  // Locate quotes on the page using a unit-scale viewport, then express
  // boxes as fractions so they survive any CSS resize of the canvas.
  const content = await page.getTextContent();
  const items = content.items.filter((it): it is Extract<typeof it, { str: string }> => 'str' in it);

  // Squash the concatenated item text, remembering which item (and which
  // character within it) every squashed character came from.
  let joined = '';
  const owner: Array<{ item: number; char: number }> = [];
  items.forEach((it, i) => {
    for (let c = 0; c < it.str.length; c++) owner.push({ item: i, char: c });
    joined += it.str;
  });
  const { squashed, map } = squashWithMap(joined);

  // A text item is usually a whole line, but a quote may cover only part of
  // it. Splitting the item's width by character count is visibly off in a
  // proportional font, so measure the substrings in the item's font family.
  const measure = document.createElement('canvas').getContext('2d');
  function fraction(it: (typeof items)[number], chars: number): number {
    if (chars <= 0) return 0;
    if (chars >= it.str.length) return 1;
    if (!measure) return chars / it.str.length;
    measure.font = `100px ${content.styles[it.fontName]?.fontFamily ?? 'sans-serif'}`;
    const whole = measure.measureText(it.str).width;
    return whole > 0 ? measure.measureText(it.str.slice(0, chars)).width / whole : chars / it.str.length;
  }

  function itemBox(i: number, fromChar: number, toChar: number): PageBox {
    const it = items[i]!;
    const tx = pdfjs.Util.transform(base.transform, it.transform);
    const fontHeight = Math.hypot(tx[2], tx[3]) || it.height || 10;
    const from = fraction(it, fromChar);
    const left = tx[4] + it.width * from;
    const width = it.width * (fraction(it, toChar) - from);
    // tx[5] is the baseline; cover ascenders above it and descenders below.
    return {
      left: left / base.width,
      top: (tx[5] - fontHeight * 0.9) / base.height,
      width: width / base.width,
      height: (fontHeight * 1.15) / base.height,
    };
  }

  const quoteBoxes = quotes.map((quote) => {
    const q = squashWithMap(quote).squashed;
    if (q.length < 8) return [];
    const at = squashed.indexOf(q);
    if (at < 0) return [];
    const start = owner[map[at]!]!;
    const end = owner[map[at + q.length - 1]!]!;
    const boxes: PageBox[] = [];
    for (let i = start.item; i <= end.item; i++) {
      const from = i === start.item ? start.char : 0;
      const to = i === end.item ? end.char + 1 : items[i]!.str.length;
      if (items[i]!.str.trim()) boxes.push(itemBox(i, from, to));
    }
    return boxes;
  });

  return { aspect: base.height / base.width, quoteBoxes };
}
