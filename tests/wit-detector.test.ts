import { describe, it, expect } from 'vitest';
import {
  stripCodeBlocks,
  detectWitTier,
  buildContextMessage,
  WitDetection,
} from '../src/hooks/wit-detector';

describe('wit-detector', () => {
  describe('stripCodeBlocks', () => {
    it('should remove triple-backtick code blocks', () => {
      const text = 'Here is some text ```code here``` more text';
      const result = stripCodeBlocks(text);
      expect(result).not.toContain('code here');
      expect(result).toContain('Here is some text');
      expect(result).toContain('more text');
    });

    it('should remove multi-line code blocks', () => {
      const text = 'Text\n```\nline1\nline2\n```\nmore';
      const result = stripCodeBlocks(text);
      expect(result).not.toContain('line1');
      expect(result).toContain('Text');
      expect(result).toContain('more');
    });

    it('should handle text without code blocks', () => {
      const text = 'Just plain text';
      const result = stripCodeBlocks(text);
      expect(result).toBe(text);
    });
  });

  describe('detectWitTier', () => {
    it('should detect big-wit keyword', () => {
      const result = detectWitTier('give this to a big-wit');
      expect(result).toEqual({ tier: 'big-wit', agent: null });
    });

    it('should detect sub-wit keyword', () => {
      const result = detectWitTier('this is trivial');
      expect(result).toEqual({ tier: 'sub-wit', agent: null });
    });

    it('should detect mid-wit keyword', () => {
      const result = detectWitTier('this needs careful attention');
      expect(result).toEqual({ tier: 'mid-wit', agent: null });
    });

    it('should detect !codex override', () => {
      const result = detectWitTier('!codex fix the auth bug');
      expect(result).toEqual({ tier: 'big-wit', agent: 'codex' });
    });

    it('should detect !cursor override', () => {
      const result = detectWitTier('!cursor refactor this');
      expect(result).toEqual({ tier: 'big-wit', agent: 'cursor-agent' });
    });

    it('should detect !opencode override', () => {
      const result = detectWitTier('!opencode implement feature');
      expect(result).toEqual({ tier: 'big-wit', agent: 'opencode' });
    });

    it('should return null when no keyword matches', () => {
      const result = detectWitTier('just do it normally');
      expect(result).toBeNull();
    });

    it('should ignore keywords inside code blocks', () => {
      const result = detectWitTier('Some text ```big-wit``` but not really');
      expect(result).toBeNull();
    });

    it('should prioritize explicit overrides over wit keywords', () => {
      const result = detectWitTier('!codex this is also big-wit');
      expect(result).toEqual({ tier: 'big-wit', agent: 'codex' });
    });
  });

  describe('buildContextMessage', () => {
    it('should build context message for big-wit without agent', () => {
      const detection: WitDetection = { tier: 'big-wit', agent: null };
      const message = buildContextMessage(detection);
      expect(message).toContain('big-wit');
      expect(message).toContain('oc_delegate');
    });

    it('should build context message for big-wit with codex agent', () => {
      const detection: WitDetection = { tier: 'big-wit', agent: 'codex' };
      const message = buildContextMessage(detection);
      expect(message).toContain('big-wit');
      expect(message).toContain('codex');
    });

    it('should build context message for sub-wit', () => {
      const detection: WitDetection = { tier: 'sub-wit', agent: null };
      const message = buildContextMessage(detection);
      expect(message).toContain('sub-wit');
    });

    it('should instruct not to solve directly for big-wit', () => {
      const detection: WitDetection = { tier: 'big-wit', agent: null };
      const message = buildContextMessage(detection);
      expect(message.toLowerCase()).toContain('do not');
    });
  });
});
