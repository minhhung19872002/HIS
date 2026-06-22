/**
 * Shared helper for the repeated "open a blank popup, write print HTML, close, (focus/print)"
 * pattern that was duplicated across many print call sites (#215). Behavior-preserving extraction:
 * each call site passes its exact prior options (window size, focus, print trigger), so the rendered
 * output and print timing stay identical — only the boilerplate (window.open + document.write +
 * document.close + popup-blocked guard) is centralized here.
 */

/** How (and whether) to trigger printing after the HTML is written. */
export type PrintTrigger =
  | false                  // do not auto-print (e.g. the HTML embeds its own "In" button)
  | 'immediate'            // call print() right after document.close()
  | 'onload'               // print() on window load
  | { delayMs: number };   // print() after a setTimeout delay

export interface PrintWindowOptions {
  /** window.open features string, e.g. 'width=800,height=600'. Default: none. */
  features?: string;
  /** call window.focus() after writing (default false). */
  focus?: boolean;
  /** print trigger (default false — no auto-print). */
  print?: PrintTrigger;
  /** invoked when the popup is blocked (window.open returned null). */
  onBlocked?: () => void;
}

/**
 * Opens a blank popup window, writes `html`, closes the document, then optionally focuses and
 * prints according to `opts`. Returns the opened window, or `null` if the popup was blocked.
 */
export function openPrintWindow(html: string, opts: PrintWindowOptions = {}): Window | null {
  const { features, focus = false, print = false, onBlocked } = opts;
  const win = window.open('', '_blank', features);
  if (!win) {
    onBlocked?.();
    return null;
  }
  win.document.write(html);
  win.document.close();
  if (focus) win.focus();
  if (print === 'immediate') {
    win.print();
  } else if (print === 'onload') {
    win.onload = () => win.print();
  } else if (print && typeof print === 'object') {
    setTimeout(() => win.print(), print.delayMs);
  }
  return win;
}
