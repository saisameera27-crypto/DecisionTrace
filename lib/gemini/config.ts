/**
 * Gemini 3 Configuration
 * 
 * STRICT ENFORCEMENT: Only "gemini-3" model is allowed.
 * All other models (gemini-1.x, gemini-1.5, gemini-2.x, etc.) are blocked.
 */

/**
 * The ONLY allowed Gemini model
 * This is the single source of truth for model selection
 */
export const GEMINI_MODEL = 'gemini-3';

/**
 * Allowed model variants (all must be Gemini 3)
 * These are the only valid model names
 */
export const ALLOWED_MODELS = [
  'gemini-3',
  'gemini-3-flash',
  'gemini-3-flash-preview',
  'gemini-3-pro',
  'gemini-3-pro-preview',
] as const;

/**
 * Blocked/legacy models that should NEVER be used
 */
export const BLOCKED_MODELS = [
  // Gemini 1.x (legacy)
  'gemini-1.0',
  'gemini-1.5',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash-8b',
  // Gemini 2.x (if any)
  'gemini-2.0',
  'gemini-2.5',
  // Experimental/other
  'gemini-experimental',
  'gemini-ultra',
] as const;

/**
 * Validate that a model is Gemini 3
 * 
 * @param model - Model name to validate
 * @returns true if model is Gemini 3, false otherwise
 */
export function isGemini3Model(model: string): boolean {
  // Must start with "gemini-3"
  return model.startsWith('gemini-3');
}

/**
 * Validate and normalize model name
 * 
 * @param model - Model name to validate
 * @returns Normalized model name if valid
 * @throws Error if model is not Gemini 3
 */
export function validateGemini3Model(model: string): string {
  // Handle empty/falsy model - return default
  if (!model || model.trim() === '') {
    return GEMINI_MODEL;
  }
  
  // Check if it's a blocked model
  if (BLOCKED_MODELS.some(blocked => model.includes(blocked))) {
    throw new Error(
      `Model "${model}" is not allowed. Only Gemini 3 models are supported. ` +
      `Please use "gemini-3" or a Gemini 3 variant.`
    );
  }
  
  // Check if it's a Gemini 3 model
  if (!isGemini3Model(model)) {
    throw new Error(
      `Model "${model}" is not a Gemini 3 model. ` +
      `Only Gemini 3 models are supported. Please use "gemini-3" or a Gemini 3 variant.`
    );
  }
  
  // Return the validated model
  return model;
}

/**
 * Get the default Gemini 3 model
 * This is the model used when no model is specified
 */
export function getDefaultGemini3Model(): string {
  return GEMINI_MODEL;
}

/**
 * Check if a model is explicitly blocked
 */
export function isBlockedModel(model: string): boolean {
  return BLOCKED_MODELS.some(blocked => 
    model.toLowerCase().includes(blocked.toLowerCase())
  );
}

