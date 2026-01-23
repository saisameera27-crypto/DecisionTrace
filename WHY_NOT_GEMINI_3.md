# Using Gemini 3 Flash Preview

## Current Model: `gemini-3-flash-preview`

**Decision Trace now uses Gemini 3!**

### Model Selection

We're using **Gemini 3 Flash Preview** for the following reasons:

- ✅ **Latest Technology**: Gemini 3 offers significant improvements over Gemini 1.5
- ✅ **Better Performance**: 35% jump in coding accuracy, superior multimodal understanding
- ✅ **Free Tier Compatible**: Flash model is optimized for speed and cost-effectiveness
- ✅ **Preview Available**: Gemini 3 is now available via the API

### Available Gemini 3 Models

- ✅ **gemini-3-flash-preview** (current - fast, cost-effective)
- ✅ **gemini-3-pro-preview** (more capable, higher cost)
- ✅ **gemini-3-pro-image-preview** (specialized for image generation)

**Status**: Gemini 3 Flash Preview is the current model used in Decision Trace.

---

## Why Gemini 3 Flash Preview?

### 1. **Performance Improvements**

Gemini 3 offers significant improvements over Gemini 1.5:
- **35% jump in coding accuracy**
- **Superior multimodal understanding** (72.7% on ScreenSpot vs single digits for competitors)
- **Better performance on complex reasoning tasks**
- **Agentic coding capabilities**

### 2. **Free Tier Compatibility**

Decision Trace has a **strict requirement** to run on free tiers:

- **Gemini 3 Flash Preview**: 
  - ✅ Available via API
  - ✅ Fast responses
  - ✅ Cost-effective
  - ✅ Sufficient for structured extraction

### 3. **Use Case Fit**

**Decision Trace needs**:
- Structured JSON output (Gemini 3 Flash handles this well)
- Fast responses (Flash is optimized for speed)
- Cost-effective (Flash is cheapest)
- Reliable extraction (Gemini 3 is proven)

---

## Model Configuration

### Default Model

**File**: `lib/gemini.ts` (line 233)
```typescript
let model = options.model || 'gemini-3-flash-preview';
```

### Free Mode Model

**File**: `lib/free-tier-limits.ts` (line 44)
```typescript
FREE_MODEL: 'gemini-3-flash-preview', // Use Gemini 3 Flash
```

### Environment Variable Override

You can override the model using an environment variable:
```typescript
// In lib/gemini.ts
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
let model = options.model || DEFAULT_MODEL;
```

**Then set in environment**:
```bash
GEMINI_MODEL=gemini-3-pro-preview npm run dev
```

---

## Current Model Benefits

**Why `gemini-3-flash-preview` is perfect for Decision Trace:**

1. **Latest Technology**: Uses the newest Gemini 3 model
2. **Fast**: Responds quickly (great for demos)
3. **Cost-Effective**: Optimized for cost
4. **Reliable**: Proven stable API
5. **Sufficient**: Handles structured extraction perfectly
6. **Free Tier**: Works with Google's free tier

---

## Model Comparison

| Feature | Gemini 3 Flash Preview | Gemini 3 Pro Preview | Gemini 1.5 Flash |
|---------|------------------------|----------------------|-------------------|
| **Speed** | ⚡ Very Fast | 🐢 Slower | ⚡ Fast |
| **Cost** | 💰 Low | 💰💰 Higher | 💰 Low |
| **Free Tier** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Use Case** | Structured extraction | Complex reasoning | Structured extraction |
| **Technology** | ✅ Latest (Gemini 3) | ✅ Latest (Gemini 3) | ⚠️ Previous gen |
| **Coding Accuracy** | ✅ 35% better | ✅ 35% better | Baseline |
| **Multimodal** | ✅ Superior | ✅ Superior | Good |

---

## Recommendation

**For Decision Trace**: **Using `gemini-3-flash-preview`** ✅

**Reasons**:
1. ✅ Latest Gemini 3 technology
2. ✅ Free tier compatible
3. ✅ Fast enough for demos
4. ✅ Sufficient for your use case
5. ✅ Better performance than Gemini 1.5

---

## Quick Answer

**Why Gemini 3 Flash Preview?**
- **Gemini 3 is now available** via the API
- **Gemini 3 Flash Preview** is the current stable, free-tier-compatible model
- **Perfect for your use case** (structured extraction, fast, cost-effective)
- **Better performance** than Gemini 1.5

**For Decision Trace**: Gemini 3 Flash Preview is the right choice! ✅
