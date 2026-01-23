/**
 * Unit Tests for Report Normalizer
 * Tests normalization of snake_case and camelCase variations to consistent view models
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  normalizeDecisionData,
  normalizeStep2Response,
  NormalizedDecisionView,
} from '../../lib/report-normalizer';

describe('Report Normalizer', () => {
  describe('snake_case normalization', () => {
    it('should normalize snake_case input to camelCase view model', () => {
      const fixturePath = path.join(
        process.cwd(),
        'test-data',
        'expected',
        'normalized',
        'step2_snake_case_variation.json'
      );
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      
      const normalized = normalizeStep2Response(fixture);
      
      // Verify all fields are in camelCase
      expect(normalized.caseId).toBe('case_67893');
      expect(normalized.documentId).toBe('doc_12348');
      expect(normalized.decisionTitle).toBe('Production Database Incident Response');
      expect(normalized.decisionDate).toBe('2024-01-22');
      expect(normalized.decisionMaker).toBe('David Kim');
      expect(normalized.decisionMakerRole).toBe('CTO');
      expect(normalized.decisionStatus).toBe('RESOLVED');
      expect(normalized.decisionSummary).toBe('Response to production database outage incident');
      expect(Array.isArray(normalized.rationale)).toBe(true);
      expect(Array.isArray(normalized.risksIdentified)).toBe(true);
      expect(Array.isArray(normalized.mitigationStrategies)).toBe(true);
      expect(typeof normalized.confidenceScore).toBe('number');
      expect(normalized.confidenceScore).toBe(0.88);
    });

    it('should match snapshot for snake_case normalization', () => {
      const fixturePath = path.join(
        process.cwd(),
        'test-data',
        'expected',
        'normalized',
        'step2_snake_case_variation.json'
      );
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      
      const normalized = normalizeStep2Response(fixture);
      
      expect(normalized).toMatchSnapshot();
    });
  });

  describe('camelCase normalization', () => {
    it('should normalize camelCase input to camelCase view model', () => {
      const fixturePath = path.join(
        process.cwd(),
        'test-data',
        'expected',
        'normalized',
        'step2_camelCase_variation.json'
      );
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      
      const normalized = normalizeStep2Response(fixture);
      
      // Verify all fields are in camelCase
      expect(normalized.caseId).toBe('case_67894');
      expect(normalized.documentId).toBe('doc_12349');
      expect(normalized.decisionTitle).toBe('LLM Training Data Usage Policy');
      expect(normalized.decisionDate).toBe('2024-03-01');
      expect(normalized.decisionMaker).toBe('Dr. Emily Chen');
      expect(normalized.decisionMakerRole).toBe('AI Ethics Committee Chair');
      expect(normalized.decisionStatus).toBe('APPROVED');
      expect(Array.isArray(normalized.rationale)).toBe(true);
      expect(Array.isArray(normalized.risksIdentified)).toBe(true);
      expect(Array.isArray(normalized.mitigationStrategies)).toBe(true);
      expect(typeof normalized.confidenceScore).toBe('number');
      expect(normalized.confidenceScore).toBe(0.95);
    });

    it('should match snapshot for camelCase normalization', () => {
      const fixturePath = path.join(
        process.cwd(),
        'test-data',
        'expected',
        'normalized',
        'step2_camelCase_variation.json'
      );
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      
      const normalized = normalizeStep2Response(fixture);
      
      expect(normalized).toMatchSnapshot();
    });
  });

  describe('format consistency', () => {
    it('should normalize snake_case and camelCase to identical view models', () => {
      const snakeCasePath = path.join(
        process.cwd(),
        'test-data',
        'expected',
        'normalized',
        'step2_snake_case_variation.json'
      );
      const camelCasePath = path.join(
        process.cwd(),
        'test-data',
        'expected',
        'normalized',
        'step2_camelCase_variation.json'
      );
      
      const snakeCaseFixture = JSON.parse(fs.readFileSync(snakeCasePath, 'utf-8'));
      const camelCaseFixture = JSON.parse(fs.readFileSync(camelCasePath, 'utf-8'));
      
      const snakeCaseNormalized = normalizeStep2Response(snakeCaseFixture);
      const camelCaseNormalized = normalizeStep2Response(camelCaseFixture);
      
      // Both should have the same structure (camelCase keys)
      expect(Object.keys(snakeCaseNormalized)).toEqual(Object.keys(camelCaseNormalized));
      
      // Verify structure matches
      expect(snakeCaseNormalized).toHaveProperty('caseId');
      expect(snakeCaseNormalized).toHaveProperty('documentId');
      expect(snakeCaseNormalized).toHaveProperty('decisionTitle');
      expect(snakeCaseNormalized).toHaveProperty('decisionDate');
      expect(snakeCaseNormalized).toHaveProperty('decisionMaker');
      expect(snakeCaseNormalized).toHaveProperty('decisionMakerRole');
      expect(snakeCaseNormalized).toHaveProperty('decisionStatus');
      expect(snakeCaseNormalized).toHaveProperty('decisionSummary');
      expect(snakeCaseNormalized).toHaveProperty('context');
      expect(snakeCaseNormalized).toHaveProperty('rationale');
      expect(snakeCaseNormalized).toHaveProperty('risksIdentified');
      expect(snakeCaseNormalized).toHaveProperty('mitigationStrategies');
      expect(snakeCaseNormalized).toHaveProperty('expectedOutcomes');
      expect(snakeCaseNormalized).toHaveProperty('confidenceScore');
      expect(snakeCaseNormalized).toHaveProperty('extractedAt');
      
      // camelCase should also have the same structure
      expect(camelCaseNormalized).toHaveProperty('caseId');
      expect(camelCaseNormalized).toHaveProperty('documentId');
      expect(camelCaseNormalized).toHaveProperty('decisionTitle');
    });
  });

  describe('missing optional fields', () => {
    it('should return safe defaults for missing optional fields without throwing', () => {
      const fixturePath = path.join(
        process.cwd(),
        'test-data',
        'expected',
        'normalized',
        'step2_missing_required.json'
      );
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      
      // Should not throw even with missing optional fields
      expect(() => {
        const normalized = normalizeStep2Response(fixture);
        
        // Verify safe defaults are returned
        expect(normalized).toBeDefined();
        expect(normalized.caseId).toBe('case_67891');
        expect(normalized.documentId).toBe('doc_12346');
        
        // Optional fields should have safe defaults
        expect(normalized.decisionMakerRole).toBeNull(); // null is acceptable
        expect(Array.isArray(normalized.risksIdentified)).toBe(true);
        expect(Array.isArray(normalized.mitigationStrategies)).toBe(true);
        expect(normalized.expectedOutcomes).toBeNull(); // null is acceptable
        expect(typeof normalized.confidenceScore).toBe('number');
      }).not.toThrow();
    });

    it('should handle completely missing optional fields', () => {
      const minimalData = {
        step: 2,
        status: 'success',
        data: {
          case_id: 'case_123',
          document_id: 'doc_123',
          decision_title: 'Test Decision',
          decision_date: '2024-01-01',
          decision_maker: 'John Doe',
          decision_status: 'APPROVED',
          decision_summary: 'Test summary',
          rationale: ['Reason 1'],
          confidence_score: 0.8,
          extracted_at: '2024-01-01T00:00:00Z',
          // Missing: decision_maker_role, risks_identified, mitigation_strategies, expected_outcomes
        },
      };
      
      expect(() => {
        const normalized = normalizeStep2Response(minimalData);
        
        // Should have safe defaults
        expect(normalized.decisionMakerRole).toBeNull();
        expect(Array.isArray(normalized.risksIdentified)).toBe(true);
        expect(normalized.risksIdentified.length).toBe(0);
        expect(Array.isArray(normalized.mitigationStrategies)).toBe(true);
        expect(normalized.mitigationStrategies.length).toBe(0);
        expect(normalized.expectedOutcomes).toBeNull();
        expect(normalized.context).toEqual({});
      }).not.toThrow();
    });

    it('should handle null values gracefully', () => {
      const dataWithNulls = {
        step: 2,
        status: 'success',
        data: {
          case_id: 'case_123',
          document_id: 'doc_123',
          decision_title: null,
          decision_date: '2024-01-01',
          decision_maker: 'John Doe',
          decision_maker_role: null,
          decision_status: 'APPROVED',
          decision_summary: null,
          rationale: ['Reason 1'],
          risks_identified: null, // Should default to empty array
          mitigation_strategies: null, // Should default to empty array
          expected_outcomes: null,
          confidence_score: 0.8,
          extracted_at: '2024-01-01T00:00:00Z',
        },
      };
      
      expect(() => {
        const normalized = normalizeStep2Response(dataWithNulls);
        
        expect(normalized.decisionTitle).toBeNull();
        expect(normalized.decisionMakerRole).toBeNull();
        expect(normalized.decisionSummary).toBeNull();
        expect(Array.isArray(normalized.risksIdentified)).toBe(true);
        expect(normalized.risksIdentified.length).toBe(0);
        expect(Array.isArray(normalized.mitigationStrategies)).toBe(true);
        expect(normalized.mitigationStrategies.length).toBe(0);
        expect(normalized.expectedOutcomes).toBeNull();
      }).not.toThrow();
    });
  });

  describe('snapshot tests', () => {
    it('should match snapshot for normalized snake_case output', () => {
      const fixturePath = path.join(
        process.cwd(),
        'test-data',
        'expected',
        'normalized',
        'step2_snake_case_variation.json'
      );
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      
      const normalized = normalizeStep2Response(fixture);
      
      // Vitest snapshot will be stored in __snapshots__ directory
      expect(normalized).toMatchSnapshot('snake_case_normalized');
    });

    it('should match snapshot for normalized camelCase output', () => {
      const fixturePath = path.join(
        process.cwd(),
        'test-data',
        'expected',
        'normalized',
        'step2_camelCase_variation.json'
      );
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      
      const normalized = normalizeStep2Response(fixture);
      
      // Vitest snapshot will be stored in __snapshots__ directory
      expect(normalized).toMatchSnapshot('camelCase_normalized');
    });

    it('should match snapshot for normalized output with missing fields', () => {
      const fixturePath = path.join(
        process.cwd(),
        'test-data',
        'expected',
        'normalized',
        'step2_missing_required.json'
      );
      const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
      
      const normalized = normalizeStep2Response(fixture);
      
      // Vitest snapshot will be stored in __snapshots__ directory
      expect(normalized).toMatchSnapshot('missing_fields_normalized');
    });
  });

  describe('edge cases', () => {
    it('should handle empty arrays', () => {
      const dataWithEmptyArrays = {
        step: 2,
        status: 'success',
        data: {
          case_id: 'case_123',
          document_id: 'doc_123',
          decision_title: 'Test',
          decision_date: '2024-01-01',
          decision_maker: 'John Doe',
          decision_status: 'APPROVED',
          decision_summary: 'Test',
          rationale: [],
          risks_identified: [],
          mitigation_strategies: [],
          confidence_score: 0.8,
          extracted_at: '2024-01-01T00:00:00Z',
        },
      };
      
      const normalized = normalizeStep2Response(dataWithEmptyArrays);
      
      expect(Array.isArray(normalized.rationale)).toBe(true);
      expect(normalized.rationale.length).toBe(0);
      expect(Array.isArray(normalized.risksIdentified)).toBe(true);
      expect(normalized.risksIdentified.length).toBe(0);
      expect(Array.isArray(normalized.mitigationStrategies)).toBe(true);
      expect(normalized.mitigationStrategies.length).toBe(0);
    });

    it('should handle nested context objects', () => {
      const dataWithNestedContext = {
        step: 2,
        status: 'success',
        data: {
          case_id: 'case_123',
          document_id: 'doc_123',
          decision_title: 'Test',
          decision_date: '2024-01-01',
          decision_maker: 'John Doe',
          decision_status: 'APPROVED',
          decision_summary: 'Test',
          context: {
            nested_key: 'value',
            another_nested_key: {
              deep_nested: 'deep_value',
            },
          },
          rationale: ['Reason 1'],
          confidence_score: 0.8,
          extracted_at: '2024-01-01T00:00:00Z',
        },
      };
      
      const normalized = normalizeStep2Response(dataWithNestedContext);
      
      expect(normalized.context).toHaveProperty('nestedKey');
      expect(normalized.context.nestedKey).toBe('value');
      expect(normalized.context).toHaveProperty('anotherNestedKey');
      expect((normalized.context.anotherNestedKey as any).deepNested).toBe('deep_value');
    });
  });
});

