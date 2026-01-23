/**
 * Sanity Test - Verifies test infrastructure is working
 * This test reads fixture files and asserts they load correctly
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Test Infrastructure Sanity Check', () => {
  it('should load positive test document fixtures', () => {
    const fixtures = [
      'test-data/docs/positive/01_launch_decision_memo.txt',
      'test-data/docs/positive/02_email_thread_hiring.txt',
      'test-data/docs/positive/03_incident_postmortem.txt',
      'test-data/docs/positive/04_policy_llm_training.txt',
      'test-data/docs/positive/05_kpi_snapshot.txt'
    ];

    fixtures.forEach((fixturePath) => {
      const fullPath = path.join(process.cwd(), fixturePath);
      expect(fs.existsSync(fullPath)).toBe(true);
      
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
    });
  });

  it('should load negative test document fixtures', () => {
    const fixtures = [
      'test-data/docs/negative/01_tiny_note.txt',
      'test-data/docs/negative/02_blank.txt',
      'test-data/docs/negative/03_two_decisions_conflict.txt'
    ];

    fixtures.forEach((fixturePath) => {
      const fullPath = path.join(process.cwd(), fixturePath);
      expect(fs.existsSync(fullPath)).toBe(true);
      
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content).toBeDefined();
      // Note: blank.txt may be empty, which is expected
    });
  });

  it('should load edge case test document fixtures', () => {
    const fixturePath = 'test-data/docs/edge/01_giant_repetitive.txt';
    const fullPath = path.join(process.cwd(), fixturePath);
    
    expect(fs.existsSync(fullPath)).toBe(true);
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(10000); // Should be large (200 paragraphs)
  });

  it('should load expected normalized JSON fixtures', () => {
    const fixtures = [
      'test-data/expected/normalized/step1_good.json',
      'test-data/expected/normalized/step2_good.json',
      'test-data/expected/normalized/step2_missing_required.json',
      'test-data/expected/normalized/step2_wrong_type.json',
      'test-data/expected/normalized/step2_snake_case_variation.json',
      'test-data/expected/normalized/step2_camelCase_variation.json'
    ];

    fixtures.forEach((fixturePath) => {
      const fullPath = path.join(process.cwd(), fixturePath);
      expect(fs.existsSync(fullPath)).toBe(true);
      
      const content = fs.readFileSync(fullPath, 'utf-8');
      const parsed = JSON.parse(content);
      
      expect(parsed).toBeDefined();
      expect(parsed.step).toBeDefined();
      expect(typeof parsed.step).toBe('number');
    });
  });

  it('should load API payload JSON fixtures', () => {
    const fixtures = [
      'test-data/api/payloads/create_case.json',
      'test-data/api/payloads/run_resume_step4.json',
      'test-data/api/payloads/share_create.json'
    ];

    fixtures.forEach((fixturePath) => {
      const fullPath = path.join(process.cwd(), fixturePath);
      expect(fs.existsSync(fullPath)).toBe(true);
      
      const content = fs.readFileSync(fullPath, 'utf-8');
      const parsed = JSON.parse(content);
      
      expect(parsed).toBeDefined();
      expect(parsed.method).toBeDefined();
      expect(parsed.endpoint).toBeDefined();
    });
  });

  it('should load recorded Gemini response fixture', () => {
    const fixturePath = 'test-data/gemini/recorded/default.json';
    const fullPath = path.join(process.cwd(), fixturePath);
    
    expect(fs.existsSync(fullPath)).toBe(true);
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    const parsed = JSON.parse(content);
    
    expect(parsed).toBeDefined();
    expect(parsed.candidates).toBeDefined();
    expect(Array.isArray(parsed.candidates)).toBe(true);
  });

  it('should use global test utilities', () => {
    // Test global.loadTestData utility
    const step1Data = global.loadTestData('expected/normalized/step1_good.json');
    expect(step1Data).toBeDefined();
    expect(step1Data.step).toBe(1);

    // Test global.loadRecordedGeminiResponse utility
    const geminiResponse = global.loadRecordedGeminiResponse('default.json');
    expect(geminiResponse).toBeDefined();
    expect(geminiResponse.candidates).toBeDefined();
  });

  it('should have fetch available (Node 18+)', () => {
    expect(typeof globalThis.fetch).toBe('function');
  });
});

