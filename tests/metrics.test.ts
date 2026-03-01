import { describe, it, expect, beforeEach } from 'vitest';
import { metrics, TierMetrics } from '../src/metrics';

describe('Metrics Collector', () => {
  beforeEach(() => {
    metrics.reset();
  });

  describe('recordDetection', () => {
    it('should increment sub-wit detections', () => {
      metrics.recordDetection('sub-wit');
      metrics.recordDetection('sub-wit');

      const m = metrics.getMetrics();
      expect(m.detections['sub-wit']).toBe(2);
      expect(m.detections['mid-wit']).toBe(0);
      expect(m.detections['big-wit']).toBe(0);
    });

    it('should increment mid-wit detections', () => {
      metrics.recordDetection('mid-wit');

      const m = metrics.getMetrics();
      expect(m.detections['mid-wit']).toBe(1);
    });

    it('should increment big-wit detections', () => {
      metrics.recordDetection('big-wit');
      metrics.recordDetection('big-wit');
      metrics.recordDetection('big-wit');

      const m = metrics.getMetrics();
      expect(m.detections['big-wit']).toBe(3);
    });
  });

  describe('recordOverride', () => {
    it('should increment codex overrides', () => {
      metrics.recordOverride('codex');

      const m = metrics.getMetrics();
      expect(m.overrides.codex).toBe(1);
    });

    it('should increment cursor-agent overrides', () => {
      metrics.recordOverride('cursor-agent');
      metrics.recordOverride('cursor-agent');

      const m = metrics.getMetrics();
      expect(m.overrides['cursor-agent']).toBe(2);
    });

    it('should increment opencode overrides', () => {
      metrics.recordOverride('opencode');

      const m = metrics.getMetrics();
      expect(m.overrides.opencode).toBe(1);
    });
  });

  describe('recordDispatch', () => {
    it('should increment internal dispatches', () => {
      metrics.recordDispatch('internal');
      metrics.recordDispatch('internal');

      const m = metrics.getMetrics();
      expect(m.dispatches.internal).toBe(2);
      expect(m.dispatches.gateway).toBe(0);
    });

    it('should increment gateway dispatches', () => {
      metrics.recordDispatch('gateway');

      const m = metrics.getMetrics();
      expect(m.dispatches.gateway).toBe(1);
    });
  });

  describe('getMetrics', () => {
    it('should return a copy of metrics', () => {
      metrics.recordDetection('sub-wit');
      const m1 = metrics.getMetrics();
      const m2 = metrics.getMetrics();

      expect(m1).toEqual(m2);
      expect(m1).not.toBe(m2);
    });
  });

  describe('reset', () => {
    it('should reset all counters to zero', () => {
      metrics.recordDetection('sub-wit');
      metrics.recordDetection('mid-wit');
      metrics.recordDetection('big-wit');
      metrics.recordOverride('codex');
      metrics.recordDispatch('gateway');

      metrics.reset();

      const m = metrics.getMetrics();
      expect(m.detections['sub-wit']).toBe(0);
      expect(m.detections['mid-wit']).toBe(0);
      expect(m.detections['big-wit']).toBe(0);
      expect(m.overrides.codex).toBe(0);
      expect(m.dispatches.gateway).toBe(0);
    });

    it('should update lastReset timestamp', () => {
      const before = metrics.getMetrics().lastReset;

      setTimeout(() => {
        metrics.reset();
        const after = metrics.getMetrics().lastReset;
        expect(after).not.toBe(before);
      }, 10);
    });
  });

  describe('getSummary', () => {
    it('should return formatted summary string', () => {
      metrics.recordDetection('sub-wit');
      metrics.recordDetection('big-wit');
      metrics.recordDetection('big-wit');
      metrics.recordOverride('codex');
      metrics.recordDispatch('gateway');
      metrics.recordDispatch('internal');

      const summary = metrics.getSummary();

      expect(summary).toContain('Detections: 3');
      expect(summary).toContain('sub: 1');
      expect(summary).toContain('big: 2');
      expect(summary).toContain('Overrides: 1');
      expect(summary).toContain('codex: 1');
      expect(summary).toContain('Dispatches: 2');
      expect(summary).toContain('gateway: 1');
      expect(summary).toContain('internal: 1');
      expect(summary).toContain('Since:');
    });
  });
});
