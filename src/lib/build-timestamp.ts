// This file provides the build timestamp for sitemaps
// __BUILD_DATE__ is injected by Vite at build time (see astro.config.mjs)
// This ensures the date is truly from build time, not runtime

declare const __BUILD_DATE__: string;

export const BUILD_DATE: string = __BUILD_DATE__;
