/**
 * Admin Database Initialization Endpoint
 * 
 * SECURE ADMIN-ONLY ENDPOINT: POST /api/admin/init-db
 * 
 * Purpose:
 * Initialize production database after deployment by:
 * 1. Running Prisma migrations
 * 2. Seeding demo sample case
 * 
 * Security:
 * - Requires ADMIN_INIT_TOKEN environment variable
 * - Validates x-admin-token header
 * - NOT exposed in UI (admin-only)
 * - Single-use for hackathon deployments
 * 
 * Usage:
 * 
 * 1. Set environment variable in Vercel:
 *    ADMIN_INIT_TOKEN=your-secure-random-token-here
 * 
 * 2. Call endpoint once after deployment:
 *    curl -X POST https://your-app.vercel.app/api/admin/init-db \
 *      -H "x-admin-token: your-secure-random-token-here"
 * 
 * 3. Expected response:
 *    { "ok": true }
 * 
 * Error Responses:
 * - 401 Unauthorized: Invalid or missing token
 * - 500 Internal Server Error: Migration or seeding failed
 * 
 * Important Notes:
 * - This endpoint runs migrations and seeds data
 * - Should only be called ONCE after initial deployment
 * - Keep ADMIN_INIT_TOKEN secret (never commit to git)
 * - After initialization, consider rotating or removing the token
 * 
 * For Hackathon:
 * - Set ADMIN_INIT_TOKEN in Vercel environment variables
 * - Call endpoint once after first deployment
 * - Endpoint is safe to call multiple times (idempotent)
 */

