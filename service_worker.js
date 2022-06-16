try {
    importScripts(
      "content_scripts/utils.js",
      "content_scripts/cvimrc_parser.js",
      "background_scripts/clipboard.js",
      "background_scripts/bookmarks.js",
      "background_scripts/sites.js",
      "background_scripts/files.js",
      "background_scripts/links.js",
      "background_scripts/history.js",
      "background_scripts/actions.js",
      "background_scripts/main.js",
      "background_scripts/options.js",
      "background_scripts/sessions.js",
      "background_scripts/popup.js",
      "background_scripts/update.js",
      "background_scripts/tab_creation_order.js",
      "background_scripts/frames.js"
    );
} catch (e) {
    console.log(e);
}
