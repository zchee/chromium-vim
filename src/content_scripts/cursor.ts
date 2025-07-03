interface CursorInterface {
  overlay: HTMLDivElement | null;
  wiggleWindow(): void;
  init(): void;
}

declare global {
  interface Window {
    Cursor: CursorInterface;
  }
}

export const Cursor: CursorInterface = {
  overlay: null,

  wiggleWindow(): void {
    if (!document.body || !document.documentElement || !document.scrollingElement) {
      return;
    }

    document.body.style.minHeight = document.documentElement.clientHeight + 2 + 'px';

    const jiggleDirection = +(
      document.scrollingElement.scrollTop !== 0 &&
      document.body.scrollHeight -
      document.scrollingElement.scrollTop -
      document.documentElement.clientHeight === 0
    );

    document.scrollingElement.scrollTop -= jiggleDirection;
    document.scrollingElement.scrollTop += jiggleDirection;
    document.body.style.minHeight = '';
  },

  init(): void {
    if (!document.body) {
      return;
    }

    this.overlay = document.createElement('div');
    this.overlay.id = 'cVim-cursor';
    document.body.appendChild(this.overlay);

    let oldX: number | undefined;
    let oldY: number | undefined;

    this.overlay.style.display = 'block';
    Cursor.wiggleWindow();
    this.overlay.style.display = 'none';

    document.addEventListener('mousemove', (e: MouseEvent): void => {
      if (!e.isTrusted) {
        return;
      }

      if (oldX !== e.x || oldY !== e.y) {
        if (Cursor.overlay) {
          Cursor.overlay.style.display = 'none';
        }
      }

      oldX = e.x;
      oldY = e.y;
    });
  }
};

window.Cursor = Cursor;
