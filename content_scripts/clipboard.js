var Clipboard = {
  store: '',
  copy: function(text, store) {
    if (!store) {
      this.store = text;
    } else {
      this.store += (this.store.length ? '\n' : '') + text;
    }
    if (window.portDestroyed) {
      return;
    }
    if (typeof window.RUNTIME === 'function') {
      RUNTIME('copy', {text: this.store});
    }
  },
  paste: function(tabbed) {
    var engineUrl = Complete.getEngine(settings.defaultengine);
    engineUrl = engineUrl ? engineUrl.requestUrl :
      Complete.getEngine('google').requestUrl;
    if (window.portDestroyed) {
      return;
    }
    if (typeof window.RUNTIME === 'function') {
      RUNTIME(tabbed ? 'openPasteTab' : 'openPaste', {
        engineUrl: engineUrl
      });
    }
  }
};
