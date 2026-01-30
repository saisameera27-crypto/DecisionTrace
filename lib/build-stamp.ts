/**
 * Build stamp constant for deployment verification
 * Reads from NEXT_PUBLIC_BUILD_STAMP environment variable or defaults to 'local'
 */
export const BUILD_STAMP = process.env.NEXT_PUBLIC_BUILD_STAMP ?? 'local';

