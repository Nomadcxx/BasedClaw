import { describe, it, expect, beforeEach } from 'vitest';
import { feedback } from '../src/feedback';

describe('Feedback Collector', () => {
  beforeEach(() => {
    feedback.clear();
  });

  describe('record', () => {
    it('should record feedback entry', () => {
      const entry = feedback.record({
        originalPrompt: 'fix a typo',
        detectedTier: 'big-wit',
        correctedTier: 'sub-wit',
        reason: 'Too simple for big-wit',
      });

      expect(entry.id).toMatch(/^fb_/);
      expect(entry.timestamp).toBeDefined();
      expect(entry.originalPrompt).toBe('fix a typo');
      expect(entry.detectedTier).toBe('big-wit');
      expect(entry.correctedTier).toBe('sub-wit');
      expect(entry.reason).toBe('Too simple for big-wit');
    });

    it('should handle null detected tier', () => {
      const entry = feedback.record({
        originalPrompt: 'complex task',
        detectedTier: null,
        correctedTier: 'big-wit',
      });

      expect(entry.detectedTier).toBeNull();
      expect(entry.correctedTier).toBe('big-wit');
    });
  });

  describe('getStats', () => {
    it('should return empty stats initially', () => {
      const stats = feedback.getStats();

      expect(stats.totalFeedback).toBe(0);
      expect(stats.accuracyRate).toBe(1);
    });

    it('should calculate accuracy rate', () => {
      feedback.record({ originalPrompt: 'a', detectedTier: 'sub-wit', correctedTier: 'sub-wit' });
      feedback.record({ originalPrompt: 'b', detectedTier: 'sub-wit', correctedTier: 'big-wit' });
      feedback.record({ originalPrompt: 'c', detectedTier: 'big-wit', correctedTier: 'big-wit' });
      feedback.record({ originalPrompt: 'd', detectedTier: 'mid-wit', correctedTier: 'sub-wit' });

      const stats = feedback.getStats();

      expect(stats.totalFeedback).toBe(4);
      expect(stats.accuracyRate).toBe(0.5);
    });

    it('should count corrections by tier', () => {
      feedback.record({ originalPrompt: 'a', detectedTier: null, correctedTier: 'sub-wit' });
      feedback.record({ originalPrompt: 'b', detectedTier: null, correctedTier: 'sub-wit' });
      feedback.record({ originalPrompt: 'c', detectedTier: null, correctedTier: 'big-wit' });

      const stats = feedback.getStats();

      expect(stats.correctionsByTier['sub-wit']).toBe(2);
      expect(stats.correctionsByTier['mid-wit']).toBe(0);
      expect(stats.correctionsByTier['big-wit']).toBe(1);
    });
  });

  describe('getSuggestions', () => {
    it('should return "not enough data" for few entries', () => {
      feedback.record({ originalPrompt: 'a', detectedTier: null, correctedTier: 'sub-wit' });

      const suggestions = feedback.getSuggestions();

      expect(suggestions[0]).toContain('Not enough feedback');
    });

    it('should suggest pattern review for low accuracy', () => {
      for (let i = 0; i < 10; i++) {
        feedback.record({
          originalPrompt: `prompt ${i}`,
          detectedTier: 'big-wit',
          correctedTier: 'sub-wit',
        });
      }

      const suggestions = feedback.getSuggestions();

      expect(suggestions.some((s) => s.includes('accuracy'))).toBe(true);
    });

    it('should detect overclassification pattern', () => {
      for (let i = 0; i < 5; i++) {
        feedback.record({
          originalPrompt: `simple task ${i}`,
          detectedTier: 'big-wit',
          correctedTier: 'sub-wit',
        });
      }

      const suggestions = feedback.getSuggestions();

      expect(suggestions.some((s) => s.includes('downgraded'))).toBe(true);
    });
  });

  describe('getHistory', () => {
    it('should return recent entries', () => {
      feedback.record({ originalPrompt: 'first', detectedTier: null, correctedTier: 'sub-wit' });
      feedback.record({ originalPrompt: 'second', detectedTier: null, correctedTier: 'mid-wit' });

      const history = feedback.getHistory(10);

      expect(history).toHaveLength(2);
      expect(history[0].originalPrompt).toBe('second');
      expect(history[1].originalPrompt).toBe('first');
    });

    it('should respect limit', () => {
      for (let i = 0; i < 10; i++) {
        feedback.record({ originalPrompt: `prompt ${i}`, detectedTier: null, correctedTier: 'sub-wit' });
      }

      const history = feedback.getHistory(3);

      expect(history).toHaveLength(3);
    });
  });

  describe('export/import', () => {
    it('should export to JSON', () => {
      feedback.record({ originalPrompt: 'test', detectedTier: 'big-wit', correctedTier: 'sub-wit' });

      const exported = feedback.export();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].originalPrompt).toBe('test');
    });

    it('should import from JSON', () => {
      const data = JSON.stringify([
        {
          id: 'fb_imported_1',
          timestamp: '2025-01-01T00:00:00Z',
          originalPrompt: 'imported',
          detectedTier: 'sub-wit',
          correctedTier: 'big-wit',
        },
      ]);

      const count = feedback.import(data);

      expect(count).toBe(1);
      expect(feedback.getHistory()[0].originalPrompt).toBe('imported');
    });

    it('should reject invalid entries', () => {
      const data = JSON.stringify([
        { invalid: 'entry' },
        {
          id: 'fb_valid',
          timestamp: '2025-01-01T00:00:00Z',
          originalPrompt: 'valid',
          correctedTier: 'sub-wit',
        },
      ]);

      const count = feedback.import(data);

      expect(count).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all feedback', () => {
      feedback.record({ originalPrompt: 'test', detectedTier: null, correctedTier: 'sub-wit' });
      feedback.clear();

      expect(feedback.getStats().totalFeedback).toBe(0);
    });
  });
});
