/**
 * Usage Tracking for Free Tier
 * Tracks global daily usage of real Gemini API calls
 */

import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

try {
  prisma = new PrismaClient();
} catch {
  // Prisma not available - use in-memory fallback
}

interface UsageTracking {
  realRunsToday: number;
  resetAt: Date;
}

const inMemoryUsage: UsageTracking = {
  realRunsToday: 0,
  resetAt: new Date(),
};

/**
 * Get today's usage tracking
 */
export async function getTodayUsage(): Promise<UsageTracking> {
  if (!prisma) {
    // In-memory fallback
    const now = new Date();
    if (inMemoryUsage.resetAt < now) {
      inMemoryUsage.realRunsToday = 0;
      inMemoryUsage.resetAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }
    return { ...inMemoryUsage };
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let usage = await prisma.usageTracking.findUnique({
      where: { date: today },
    });

    if (!usage) {
      // Create new entry for today
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      usage = await prisma.usageTracking.create({
        data: {
          date: today,
          realRunsToday: 0,
          resetAt: tomorrow,
        },
      });
    }

    // Reset if past reset time
    if (usage.resetAt < new Date()) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      usage = await prisma.usageTracking.update({
        where: { id: usage.id },
        data: {
          realRunsToday: 0,
          resetAt: tomorrow,
        },
      });
    }

    return {
      realRunsToday: usage.realRunsToday,
      resetAt: usage.resetAt,
    };
  } catch (error) {
    // Fallback to in-memory
    return getTodayUsage();
  }
}

/**
 * Increment real runs counter
 */
export async function incrementRealRuns(): Promise<void> {
  if (!prisma) {
    inMemoryUsage.realRunsToday++;
    return;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const usage = await prisma.usageTracking.upsert({
      where: { date: today },
      update: {
        realRunsToday: { increment: 1 },
      },
      create: {
        date: today,
        realRunsToday: 1,
        resetAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      },
    });
  } catch (error) {
    // Fallback to in-memory
    inMemoryUsage.realRunsToday++;
  }
}

/**
 * Check if real run is allowed (global daily limit)
 */
export async function canMakeRealRun(): Promise<{ allowed: boolean; reason?: string; resetAt?: Date }> {
  const usage = await getTodayUsage();
  const maxRuns = process.env.FREE_MODE === 'true' ? 1 : Infinity;
  
  if (usage.realRunsToday >= maxRuns) {
    return {
      allowed: false,
      reason: `Global daily limit reached: ${maxRuns} real run(s) per day`,
      resetAt: usage.resetAt,
    };
  }

  return { allowed: true, resetAt: usage.resetAt };
}

/**
 * Reset usage (admin function)
 */
export async function resetUsage(): Promise<void> {
  if (!prisma) {
    inMemoryUsage.realRunsToday = 0;
    inMemoryUsage.resetAt = new Date();
    return;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await prisma.usageTracking.updateMany({
      where: { date: today },
      data: { realRunsToday: 0 },
    });
  } catch (error) {
    // Fallback
    inMemoryUsage.realRunsToday = 0;
  }
}

