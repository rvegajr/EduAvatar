export const FOCUS_RING_CLASSES =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Traps keyboard focus within a container element. Returns a cleanup function
 * that removes the event listener when called.
 */
export function trapFocus(container: HTMLElement): () => void {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    const focusableElements = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => el.offsetParent !== null);

    if (focusableElements.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown);

  const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  firstFocusable?.focus();

  return () => container.removeEventListener('keydown', handleKeyDown);
}

/**
 * Announces a message to screen readers via an ARIA live region. The region
 * is automatically removed after the message has been consumed.
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
): void {
  const region = document.createElement('div');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', priority);
  region.setAttribute('aria-atomic', 'true');
  Object.assign(region.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: '0',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  });

  document.body.appendChild(region);

  // Small delay so the live region is registered before content is set
  requestAnimationFrame(() => {
    region.textContent = message;
  });

  setTimeout(() => {
    region.remove();
  }, 3000);
}

/**
 * Returns true when the user has enabled the `prefers-reduced-motion: reduce`
 * OS-level accessibility preference.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Parses a hex color string (#RGB or #RRGGBB) to linear-light sRGB values.
 */
function hexToLinearRgb(hex: string): [number, number, number] {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;

  return [r, g, b];
}

/**
 * Computes the relative luminance of a color per WCAG 2.1.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const linearize = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Calculates the WCAG 2.1 contrast ratio between two hex colors.
 * Returns a value between 1 (identical) and 21 (black on white).
 * WCAG AA requires at least 4.5:1 for normal text, 3:1 for large text.
 */
export function getContrastRatio(fg: string, bg: string): number {
  const lum1 = relativeLuminance(hexToLinearRgb(fg));
  const lum2 = relativeLuminance(hexToLinearRgb(bg));

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}
