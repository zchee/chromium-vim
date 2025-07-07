/// <reference types="chrome"/>

// Content Script Entry Point for cVim Chrome Extension
// NOTE: This file is no longer used for bundling individual content scripts
// Each TypeScript file is now compiled individually to match the manifest structure
// The cvimrc_parser.js is loaded separately by the manifest to maintain global scope

// This file is kept for reference but content scripts are loaded individually:
// 1. cvimrc_parser.js (JavaScript, loaded first to expose RCParser globally)
// 2. session.js
// 3. utils.js  
// 4. dom.js
// 5. hints.js
// 6. bookmarks.js
// 7. command.js
// 8. keys.js
// 9. clipboard.js
// 10. complete.js
// 11. mappings.js
// 12. find.js
// 13. cursor.js
// 14. status.js
// 15. hud.js
// 16. visual.js
// 17. scroll.js
// 18. search.js
// 19. frames.js
// 20. messenger.js