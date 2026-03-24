export interface LockdownViolation {
  type: string;
  timestamp: number;
}

type ViolationCallback = (type: string) => void;

const BLOCKED_KEYS: Record<string, boolean> = {
  c: true, v: true, x: true, p: true, a: true,
  s: true, f: true, n: true, t: true, w: true,
  r: true, l: true,
};

const BLOCKED_SHIFT_KEYS: Record<string, boolean> = {
  I: true, J: true,
};

const VM_USER_AGENT_SIGNATURES = [
  "VirtualBox", "VMware", "Parallels", "QEMU",
  "Virtual", "Hyper-V", "Xen",
];

const VM_GPU_SIGNATURES = [
  "VirtualBox", "VMware", "Parallels", "QEMU",
  "llvmpipe", "swiftshader", "Microsoft Basic Render",
  "Chromium", "Google SwiftShader",
];

const VM_SCREEN_RESOLUTIONS = [
  [800, 600], [1024, 768], [1280, 800],
];

export class BrowserLockdown {
  private violations: LockdownViolation[] = [];
  private listeners = new Map<string, { target: EventTarget; handler: EventListener }>();
  private active = false;
  private onViolation: ViolationCallback;
  private originalWindowOpen: typeof window.open | null = null;
  private styleElement: HTMLStyleElement | null = null;

  constructor(onViolation: ViolationCallback) {
    this.onViolation = onViolation;
  }

  activate(): void {
    if (this.active) return;
    this.active = true;

    this.requestFullscreen();
    this.attachFullscreenListener();
    this.attachVisibilityListener();
    this.attachBlurListener();
    this.attachKeydownListener();
    this.attachContextMenuListener();
    this.attachBeforeUnloadListener();
    this.attachClipboardListeners();
    this.attachDragListener();
    this.disableTextSelection();
    this.blockWindowOpen();
    this.detectVirtualMachine();
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;

    this.listeners.forEach(({ target, handler }, key) => {
      target.removeEventListener(key, handler);
    });
    this.listeners.clear();

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    if (this.originalWindowOpen) {
      window.open = this.originalWindowOpen;
      this.originalWindowOpen = null;
    }
  }

  getViolationLog(): LockdownViolation[] {
    return [...this.violations];
  }

  isActive(): boolean {
    return this.active;
  }

  requestFullscreen(): void {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  // ── Private helpers ──────────────────────────────────────────────

  private logViolation(type: string): void {
    const entry: LockdownViolation = { type, timestamp: Date.now() };
    this.violations.push(entry);
    this.onViolation(type);
  }

  private addListener(key: string, target: EventTarget, event: string, handler: EventListener, options?: AddEventListenerOptions): void {
    target.addEventListener(event, handler, options);
    this.listeners.set(key, { target, handler });
  }

  private attachFullscreenListener(): void {
    const handler = () => {
      if (!document.fullscreenElement && this.active) {
        this.logViolation("fullscreen_exit");
        this.requestFullscreen();
      }
    };
    this.addListener("fullscreenchange", document, "fullscreenchange", handler);
  }

  private attachVisibilityListener(): void {
    const handler = () => {
      if (document.hidden && this.active) {
        this.logViolation("visibility_hidden");
      }
    };
    this.addListener("visibilitychange", document, "visibilitychange", handler);
  }

  private attachBlurListener(): void {
    const handler = () => {
      if (this.active) {
        this.logViolation("window_blur");
      }
    };
    this.addListener("blur", window, "blur", handler);
  }

  private attachKeydownListener(): void {
    const handler = (e: Event) => {
      const ke = e as KeyboardEvent;

      if (ke.key >= "F1" && ke.key <= "F12") {
        ke.preventDefault();
        this.logViolation(`blocked_key_${ke.key}`);
        return;
      }

      if (ke.key === "PrintScreen") {
        ke.preventDefault();
        this.logViolation("blocked_key_PrintScreen");
        return;
      }

      if (ke.altKey && (ke.key === "Tab" || ke.key === "F4")) {
        ke.preventDefault();
        this.logViolation(`blocked_key_Alt+${ke.key}`);
        return;
      }

      if ((ke.ctrlKey || ke.metaKey) && ke.shiftKey && BLOCKED_SHIFT_KEYS[ke.key]) {
        ke.preventDefault();
        this.logViolation(`blocked_key_Ctrl+Shift+${ke.key}`);
        return;
      }

      if ((ke.ctrlKey || ke.metaKey) && BLOCKED_KEYS[ke.key.toLowerCase()]) {
        ke.preventDefault();
        this.logViolation(`blocked_key_Ctrl+${ke.key.toUpperCase()}`);
        return;
      }

      if (ke.metaKey) {
        ke.preventDefault();
        this.logViolation("blocked_key_Meta");
        return;
      }
    };
    this.addListener("keydown", document, "keydown", handler);
  }

  private attachContextMenuListener(): void {
    const handler = (e: Event) => {
      e.preventDefault();
      this.logViolation("context_menu");
    };
    this.addListener("contextmenu", document, "contextmenu", handler);
  }

  private attachBeforeUnloadListener(): void {
    const handler = (e: Event) => {
      e.preventDefault();
      (e as BeforeUnloadEvent).returnValue = "";
    };
    this.addListener("beforeunload", window, "beforeunload", handler);
  }

  private attachClipboardListeners(): void {
    const makeHandler = (type: string) => (e: Event) => {
      e.preventDefault();
      this.logViolation(type);
    };
    this.addListener("copy", document, "copy", makeHandler("clipboard_copy"));
    this.addListener("cut", document, "cut", makeHandler("clipboard_cut"));
    this.addListener("paste", document, "paste", makeHandler("clipboard_paste"));
  }

  private attachDragListener(): void {
    const handler = (e: Event) => {
      e.preventDefault();
    };
    this.addListener("dragstart", document, "dragstart", handler);
  }

  private disableTextSelection(): void {
    const style = document.createElement("style");
    style.textContent = "body, body * { user-select: none !important; -webkit-user-select: none !important; }";
    document.head.appendChild(style);
    this.styleElement = style;
  }

  private blockWindowOpen(): void {
    this.originalWindowOpen = window.open;
    window.open = (..._args: Parameters<typeof window.open>) => {
      this.logViolation("blocked_window_open");
      return null;
    };
  }

  private detectVirtualMachine(): void {
    if (typeof navigator === "undefined") return;

    const ua = navigator.userAgent;
    for (const sig of VM_USER_AGENT_SIGNATURES) {
      if (ua.includes(sig)) {
        this.logViolation("vm_detected");
        return;
      }
    }

    const { width, height } = screen;
    for (const [w, h] of VM_SCREEN_RESOLUTIONS) {
      if (width === w && height === h) {
        this.logViolation("vm_detected");
        return;
      }
    }

    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl && gl instanceof WebGLRenderingContext) {
        const debugExt = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugExt) {
          const renderer = gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) as string;
          for (const sig of VM_GPU_SIGNATURES) {
            if (renderer.toLowerCase().includes(sig.toLowerCase())) {
              this.logViolation("vm_detected");
              return;
            }
          }
        }
      }
    } catch {
      // WebGL unavailable — skip GPU check
    }
  }
}
