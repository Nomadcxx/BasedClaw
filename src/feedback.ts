import { WitTier, WIT_TIERS } from './constants';

export interface FeedbackEntry {
  id: string;
  timestamp: string;
  originalPrompt: string;
  detectedTier: WitTier | null;
  correctedTier: WitTier;
  reason?: string;
}

export interface FeedbackStats {
  totalFeedback: number;
  correctionsByTier: Record<WitTier, number>;
  accuracyRate: number;
  recentFeedback: FeedbackEntry[];
}

class FeedbackCollector {
  private feedback: FeedbackEntry[] = [];
  private maxHistory = 100;

  record(entry: Omit<FeedbackEntry, 'id' | 'timestamp'>): FeedbackEntry {
    const newEntry: FeedbackEntry = {
      ...entry,
      id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };

    this.feedback.unshift(newEntry);

    if (this.feedback.length > this.maxHistory) {
      this.feedback = this.feedback.slice(0, this.maxHistory);
    }

    return newEntry;
  }

  getStats(): FeedbackStats {
    const correctionsByTier: Record<WitTier, number> = {
      'sub-wit': 0,
      'mid-wit': 0,
      'big-wit': 0,
    };

    let correctDetections = 0;

    for (const entry of this.feedback) {
      correctionsByTier[entry.correctedTier]++;
      if (entry.detectedTier === entry.correctedTier) {
        correctDetections++;
      }
    }

    return {
      totalFeedback: this.feedback.length,
      correctionsByTier,
      accuracyRate: this.feedback.length > 0 ? correctDetections / this.feedback.length : 1,
      recentFeedback: this.feedback.slice(0, 10),
    };
  }

  getSuggestions(): string[] {
    const suggestions: string[] = [];
    const stats = this.getStats();

    if (stats.totalFeedback < 5) {
      return ['Not enough feedback data to generate suggestions.'];
    }

    if (stats.accuracyRate < 0.7) {
      suggestions.push(
        `Detection accuracy is ${(stats.accuracyRate * 100).toFixed(0)}%. Consider reviewing keyword patterns.`
      );
    }

    const mostCorrected = Object.entries(stats.correctionsByTier).sort((a, b) => b[1] - a[1])[0];
    if (mostCorrected[1] > stats.totalFeedback * 0.5) {
      suggestions.push(
        `${mostCorrected[0]} receives ${mostCorrected[1]} corrections (${((mostCorrected[1] / stats.totalFeedback) * 100).toFixed(0)}%). May need pattern refinement.`
      );
    }

    const overclassified = this.feedback.filter(
      (f) =>
        f.detectedTier === 'big-wit' && (f.correctedTier === 'sub-wit' || f.correctedTier === 'mid-wit')
    );
    if (overclassified.length > 3) {
      suggestions.push(
        `${overclassified.length} tasks were downgraded from big-wit. Consider tightening big-wit patterns.`
      );
    }

    const underclassified = this.feedback.filter(
      (f) =>
        (f.detectedTier === 'sub-wit' || f.detectedTier === 'mid-wit') && f.correctedTier === 'big-wit'
    );
    if (underclassified.length > 3) {
      suggestions.push(
        `${underclassified.length} tasks were upgraded to big-wit. Consider adding more big-wit keywords.`
      );
    }

    return suggestions.length > 0 ? suggestions : ['Detection patterns appear well-calibrated.'];
  }

  getHistory(limit = 20): FeedbackEntry[] {
    return this.feedback.slice(0, limit);
  }

  clear(): void {
    this.feedback = [];
  }

  export(): string {
    return JSON.stringify(this.feedback, null, 2);
  }

  import(data: string): number {
    try {
      const entries = JSON.parse(data) as FeedbackEntry[];
      let imported = 0;
      for (const entry of entries) {
        if (this.isValidEntry(entry)) {
          this.feedback.push(entry);
          imported++;
        }
      }
      this.feedback.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (this.feedback.length > this.maxHistory) {
        this.feedback = this.feedback.slice(0, this.maxHistory);
      }
      return imported;
    } catch {
      return 0;
    }
  }

  private isValidEntry(entry: any): entry is FeedbackEntry {
    return (
      typeof entry === 'object' &&
      typeof entry.id === 'string' &&
      typeof entry.timestamp === 'string' &&
      typeof entry.originalPrompt === 'string' &&
      WIT_TIERS.includes(entry.correctedTier)
    );
  }
}

export const feedback = new FeedbackCollector();
