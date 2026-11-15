import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Only build-time page shells are cached. Visit data and API results are not
// stored in Cloudflare R2/KV/D1. No ISR or on-demand revalidation is used.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  // Cache interception is incompatible with Partial Prerendering.
  enableCacheInterception: false,
});
