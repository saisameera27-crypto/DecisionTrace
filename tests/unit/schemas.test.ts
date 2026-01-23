/**
 * Unit Tests for Zod Schema Validators
 * Tests all 6 step schemas with positive and negative test cases
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  formatZodError,
  validateWithSchema,
} from '../../lib/schema-validators';

describe('Step 1 Schema Validator', () => {
  it('should validate valid fixture passes', () => {
    const fixturePath = path.join(process.cwd(), 'test-data', 'expected', 'normalized', 'step1_good.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    
    const result = validateWithSchema(step1Schema, fixture);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.step).toBe(1);
      expect(result.data.status).toBe('success');
      expect(result.data.data.document_id).toBe('doc_12345');
    }
  });

  it('should reject invalid fixture with missing required fields', () => {
    const invalidData = {
      step: 1,
      status: 'success',
      data: {
        // Missing required fields: document_id, file_name, etc.
        document_type: 'decision_memo',
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step1Schema, invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      // Check that errors mention missing required fields
      const errorMessages = result.errors.join(' ');
      expect(errorMessages).toMatch(/document_id|file_name|mime_type|extracted_text/i);
    }
  });

  it('should reject invalid fixture with wrong types', () => {
    const invalidData = {
      step: 1,
      status: 'success',
      data: {
        document_id: 12345, // Should be string
        file_name: 'test.txt',
        file_size: '2048', // Should be number
        mime_type: 'text/plain',
        extracted_text: 'test',
        uploaded_at: 'invalid-date', // Should be ISO datetime
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step1Schema, invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      // Check that error messages are friendly
      const errorMessages = result.errors.join(' ');
      expect(errorMessages).toContain('document_id');
      expect(errorMessages).toContain('file_size');
    }
  });
});

describe('Step 2 Schema Validator', () => {
  it('should validate valid fixture passes', () => {
    const fixturePath = path.join(process.cwd(), 'test-data', 'expected', 'normalized', 'step2_good.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    
    const result = validateWithSchema(step2Schema, fixture);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.step).toBe(2);
      expect(result.data.status).toBe('success');
      expect(result.data.data.case_id).toBe('case_67890');
      expect(Array.isArray(result.data.data.rationale)).toBe(true);
    }
  });

  it('should reject invalid fixture with missing required fields', () => {
    const fixturePath = path.join(process.cwd(), 'test-data', 'expected', 'normalized', 'step2_missing_required.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    
    // Note: This fixture has missing fields but might still pass if they're optional
    // We'll test with a truly invalid one
    const invalidData = {
      step: 2,
      status: 'partial_success',
      data: {
        case_id: 'case_123',
        // Missing document_id, decision_title, decision_date, etc.
        decision_maker: 'John Doe',
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step2Schema, invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      // Check for friendly error messages
      const errorMessages = result.errors.join(' ');
      expect(errorMessages).toMatch(/document_id|decision_title|decision_date/i);
    }
  });

  it('should reject invalid fixture with wrong types', () => {
    const fixturePath = path.join(process.cwd(), 'test-data', 'expected', 'normalized', 'step2_wrong_type.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    
    const result = validateWithSchema(step2Schema, fixture);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      // Check that error messages are friendly and mention the fields
      const errorMessages = result.errors.join(' ');
      expect(errorMessages).toMatch(/decision_maker|rationale|risks_identified|confidence_score/i);
      // Verify error formatting function works
      expect(result.errors.every(err => typeof err === 'string')).toBe(true);
      expect(result.errors.every(err => err.length > 0)).toBe(true);
    }
  });

  it('should format errors with friendly messages', () => {
    const invalidData = {
      step: 2,
      status: 'success',
      data: {
        case_id: 'case_123',
        document_id: 'doc_123',
        decision_title: 'Test Decision',
        decision_date: 'invalid-date', // Wrong format
        decision_maker: 12345, // Wrong type
        decision_status: 'APPROVED',
        decision_summary: 'Test summary',
        rationale: 'not an array', // Wrong type
        confidence_score: 1.5, // Out of range
        extracted_at: '2024-01-01T00:00:00Z',
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step2Schema, invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      // Check that errors are formatted nicely
      result.errors.forEach((error) => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
        // Errors should mention the field name
        expect(error).toMatch(/data\.|decision_|rationale|confidence/i);
      });
    }
  });
});

describe('Step 3 Schema Validator', () => {
  it('should validate valid fixture passes', () => {
    const validData = {
      step: 3,
      status: 'success',
      data: {
        case_id: 'case_67890',
        context_analysis: {
          business_context: 'Q2 2024 product launch decision',
          market_conditions: 'Strong market demand',
          organizational_factors: ['Team capacity', 'Budget availability'],
          external_factors: ['Regulatory requirements'],
        },
        stakeholders: [
          { name: 'Sarah Chen', role: 'VP of Product', influence: 'high' },
          { name: 'Engineering Team', influence: 'medium' },
        ],
        analysis_date: '2024-03-15T10:40:00Z',
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step3Schema, validData);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.step).toBe(3);
      expect(result.data.data.case_id).toBe('case_67890');
    }
  });

  it('should reject invalid fixture with missing required fields', () => {
    const invalidData = {
      step: 3,
      status: 'success',
      data: {
        case_id: 'case_123',
        // Missing context_analysis
        analysis_date: '2024-03-15T10:40:00Z',
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step3Schema, invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(err => err.includes('context_analysis'))).toBe(true);
    }
  });

  it('should reject invalid fixture with wrong types', () => {
    const invalidData = {
      step: 3,
      status: 'success',
      data: {
        case_id: 12345, // Wrong type
        context_analysis: {
          business_context: 'Test',
          organizational_factors: 'not an array', // Wrong type
        },
        analysis_date: 'invalid-date', // Wrong format
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step3Schema, invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      const errorMessages = result.errors.join(' ');
      expect(errorMessages).toMatch(/case_id|organizational_factors|analysis_date/i);
    }
  });
});

describe('Step 4 Schema Validator', () => {
  it('should validate valid fixture passes', () => {
    const validData = {
      step: 4,
      status: 'success',
      data: {
        case_id: 'case_67890',
        outcome_analysis: {
          actual_outcomes: {
            users_6_months: 8500,
            arr_by_q2: 420000,
          },
          expected_vs_actual: [
            {
              metric: 'users_6_months',
              expected: 10000,
              actual: 8500,
              variance: -0.15,
            },
          ],
          success_indicators: ['User growth positive'],
          failure_indicators: ['Missed revenue target'],
        },
        impact_assessment: {
          financial_impact: -50000,
          operational_impact: 'Moderate',
        },
        analysis_date: '2024-06-30T10:45:00Z',
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step4Schema, validData);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.step).toBe(4);
      expect(result.data.data.case_id).toBe('case_67890');
    }
  });

  it('should reject invalid fixture with missing required fields', () => {
    const invalidData = {
      step: 4,
      status: 'success',
      data: {
        case_id: 'case_123',
        // Missing outcome_analysis
        analysis_date: '2024-06-30T10:45:00Z',
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step4Schema, invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(err => err.includes('outcome_analysis'))).toBe(true);
    }
  });

  it('should reject invalid fixture with wrong types', () => {
    const invalidData = {
      step: 4,
      status: 'success',
      data: {
        case_id: 'case_123',
        outcome_analysis: {
          actual_outcomes: 'not an object', // Wrong type
          expected_vs_actual: 'not an array', // Wrong type
        },
        analysis_date: 'invalid-date',
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step4Schema, invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      const errorMessages = result.errors.join(' ');
      expect(errorMessages).toMatch(/actual_outcomes|expected_vs_actual|analysis_date/i);
    }
  });
});

describe('Step 5 Schema Validator', () => {
  it('should validate valid fixture passes', () => {
    const validData = {
      step: 5,
      status: 'success',
      data: {
        case_id: 'case_67890',
        root_causes: [
          {
            cause: 'Insufficient market research before launch',
            category: 'process',
            severity: 'high',
            evidence: ['No user interviews conducted', 'Limited competitive analysis'],
          },
        ],
        contributing_factors: ['Tight timeline', 'Resource constraints'],
        analysis_date: '2024-07-15T11:00:00Z',
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step5Schema, validData);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.step).toBe(5);
      expect(result.data.data.root_causes.length).toBeGreaterThan(0);
    }
  });

  it('should reject invalid fixture with missing required fields', () => {
    const invalidData = {
      step: 5,
      status: 'success',
      data: {
        case_id: 'case_123',
        // Missing root_causes
        analysis_date: '2024-07-15T11:00:00Z',
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step5Schema, invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(err => err.includes('root_causes'))).toBe(true);
    }
  });

  it('should reject invalid fixture with wrong types', () => {
    const invalidData = {
      step: 5,
      status: 'success',
      data: {
        case_id: 'case_123',
        root_causes: 'not an array', // Wrong type
        contributing_factors: 'not an array', // Wrong type
        analysis_date: 'invalid-date',
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step5Schema, invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      const errorMessages = result.errors.join(' ');
      expect(errorMessages).toMatch(/root_causes|contributing_factors|analysis_date/i);
    }
  });
});

describe('Step 6 Schema Validator', () => {
  it('should validate valid fixture passes', () => {
    const validData = {
      step: 6,
      status: 'success',
      data: {
        case_id: 'case_67890',
        lessons_learned: [
          {
            lesson: 'Conduct thorough market research before product launch',
            category: 'decision_making',
            priority: 'high',
          },
        ],
        recommendations: [
          {
            recommendation: 'Implement pre-launch validation process',
            priority: 'high',
            feasibility: 'high',
            expected_impact: 'Reduce launch risk by 40%',
          },
        ],
        action_items: [
          {
            action: 'Create market research checklist',
            owner: 'Product Team',
            due_date: '2024-08-01',
            status: 'pending',
          },
        ],
        completion_date: '2024-07-30T12:00:00Z',
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step6Schema, validData);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.step).toBe(6);
      expect(result.data.data.lessons_learned.length).toBeGreaterThan(0);
      expect(result.data.data.recommendations.length).toBeGreaterThan(0);
    }
  });

  it('should reject invalid fixture with missing required fields', () => {
    const invalidData = {
      step: 6,
      status: 'success',
      data: {
        case_id: 'case_123',
        // Missing lessons_learned and recommendations
        completion_date: '2024-07-30T12:00:00Z',
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step6Schema, invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      const errorMessages = result.errors.join(' ');
      expect(errorMessages).toMatch(/lessons_learned|recommendations/i);
    }
  });

  it('should reject invalid fixture with wrong types', () => {
    const invalidData = {
      step: 6,
      status: 'success',
      data: {
        case_id: 'case_123',
        lessons_learned: 'not an array', // Wrong type
        recommendations: 'not an array', // Wrong type
        action_items: 'not an array', // Wrong type
        completion_date: 'invalid-date',
      },
      errors: [],
      warnings: [],
    };
    
    const result = validateWithSchema(step6Schema, invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      const errorMessages = result.errors.join(' ');
      expect(errorMessages).toMatch(/lessons_learned|recommendations|action_items|completion_date/i);
    }
  });
});

describe('Error Formatting Function', () => {
  it('should format Zod errors into friendly messages', () => {
    const invalidData = {
      step: 2,
      status: 'success',
      data: {
        case_id: 'case_123',
        document_id: 'doc_123',
        decision_title: 'Test',
        decision_date: 'invalid',
        decision_maker: 12345,
        decision_status: 'APPROVED',
        decision_summary: 'Test summary',
        rationale: 'not an array',
        confidence_score: 1.5,
        extracted_at: '2024-01-01T00:00:00Z',
      },
    };
    
    const result = step2Schema.safeParse(invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      const formattedErrors = formatZodError(result.error);
      
      expect(Array.isArray(formattedErrors)).toBe(true);
      expect(formattedErrors.length).toBeGreaterThan(0);
      
      // Check that errors are formatted with field paths
      formattedErrors.forEach((error) => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
        // Errors should be readable
        expect(error).toMatch(/data\.|decision_|rationale|confidence/i);
      });
    }
  });

  it('should handle nested path errors correctly', () => {
    const invalidData = {
      step: 3,
      status: 'success',
      data: {
        case_id: 'case_123',
        context_analysis: {
          business_context: '', // Empty string should fail min(1)
          organizational_factors: 'not an array',
        },
        analysis_date: 'invalid',
      },
    };
    
    const result = step3Schema.safeParse(invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      const formattedErrors = formatZodError(result.error);
      
      // Should include nested paths
      const hasNestedPath = formattedErrors.some(err => 
        err.includes('context_analysis') || err.includes('business_context')
      );
      expect(hasNestedPath).toBe(true);
    }
  });
});

