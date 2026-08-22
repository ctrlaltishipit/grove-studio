// =============================================================================
// Vercel serverless entry — the entire studio sidecar as one function.
//
// vercel.json rewrites every /api/* request here; the Express app's routes
// already carry their full /api/... paths, so it handles them unchanged. The
// same env vars the sidecar reads locally (.env.local) come from the Vercel
// project's Environment Variables in production.
// =============================================================================

import app from '../server/index.mjs';

export default app;
