// previewDom.ts

export type ScanDocumentOptions = {
  html: string;
  lang: string;
  themeStylesheetUrl?: string;
  globalStylesCss?: string;
};

/**
 * Creates a hidden iframe sized appropriately for layout/visual checks.
 *
 * The iframe is not yet attached to the DOM.
 *
 * @since 1.0.0
 *
 * @return {HTMLIFrameElement} A configured iframe element.
 */
export const createScanIframe = (): HTMLIFrameElement => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-10000px';
  iframe.style.top = 'auto';
  iframe.style.width = '1200px';
  iframe.style.height = '800px';
  iframe.style.overflow = 'hidden';
  iframe.style.border = 'none';
  return iframe;
};

/**
 * Builds a full HTML document string for the scan iframe, including
 * theme styles and global styles when provided.
 *
 * @since 1.0.0
 *
 * @param {ScanDocumentOptions} options Document options.
 * @return {string} Complete HTML document markup.
 */
export const buildScanDocumentHtml = (options: ScanDocumentOptions): string => {
  const { html, lang, themeStylesheetUrl, globalStylesCss } = options;

  const headBits: string[] = ['<meta charset="utf-8" />'];

  if (globalStylesCss) {
    headBits.push(`<style>${globalStylesCss}</style>`);
  }

  if (themeStylesheetUrl) {
    headBits.push(`<link rel="stylesheet" href="${themeStylesheetUrl}" />`);
  }

  const headHtml = headBits.join('\n');

  return `
    <!doctype html>
    <html lang="${lang}">
      <head>${headHtml}</head>
      <body>
        <main class="wpav-scan-preview">
          ${html}
        </main>
      </body>
    </html>
  `;
};

/**
 * Waits for the iframe to finish loading or rejects on timeout or error.
 *
 * @since 1.0.0
 *
 * @param {HTMLIFrameElement} iframe The iframe to observe.
 * @return {Promise<void>} Resolves when the iframe has loaded.
 */
export const waitForIframeLoad = (iframe: HTMLIFrameElement): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      iframe.onload = null;
      iframe.onerror = null;
      reject(new Error('Preview page load timeout'));
    }, 15000);

    iframe.onload = () => {
      clearTimeout(timeoutId);
      resolve();
    };

    iframe.onerror = (e) => {
      clearTimeout(timeoutId);
      console.error('Preview iframe failed to load:', e);
      reject(new Error('Failed to load preview page'));
    };
  });
