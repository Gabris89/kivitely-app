// Turbopack resolveAlias target for the "canvas" package, which Konva only
// needs for server-side (Node.js) rendering. The measurement tool only runs
// client-side, so this empty module stands in for it to avoid a bundling
// error under Turbopack. See next.config.ts.
module.exports = {};
