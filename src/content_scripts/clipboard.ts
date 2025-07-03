declare const RUNTIME: (action: string, data?: any, callback?: (response: any) => void) => void;
declare const Complete: {
  getEngine(name: string): { requestUrl: string } | null;
};
declare const settings: {
  defaultengine: string;
};

interface ClipboardType {
  store: string;
  copy(text: string, store?: boolean): void;
  paste(tabbed: boolean): void;
}

export const Clipboard: ClipboardType = {
  store: '',

  copy(text: string, store?: boolean): void {
    if (!store) {
      this.store = text;
    } else {
      this.store += (this.store.length ? '\n' : '') + text;
    }
    RUNTIME('copy', { text: this.store });
  },

  paste(tabbed: boolean): void {
    let engineUrl = Complete.getEngine(settings.defaultengine);
    const finalUrl = engineUrl ? engineUrl.requestUrl :
      Complete.getEngine('google')!.requestUrl;

    RUNTIME(tabbed ? 'openPasteTab' : 'openPaste', {
      engineUrl: finalUrl
    });
  }
};
