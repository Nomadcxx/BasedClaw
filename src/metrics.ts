export interface TierMetrics {
  detections: {
    'sub-wit': number;
    'mid-wit': number;
    'big-wit': number;
  };
  overrides: {
    codex: number;
    'cursor-agent': number;
    opencode: number;
  };
  dispatches: {
    internal: number;
    gateway: number;
  };
  lastReset: string;
}

class MetricsCollector {
  private metrics: TierMetrics = {
    detections: { 'sub-wit': 0, 'mid-wit': 0, 'big-wit': 0 },
    overrides: { codex: 0, 'cursor-agent': 0, opencode: 0 },
    dispatches: { internal: 0, gateway: 0 },
    lastReset: new Date().toISOString(),
  };

  recordDetection(tier: 'sub-wit' | 'mid-wit' | 'big-wit'): void {
    this.metrics.detections[tier]++;
  }

  recordOverride(agent: 'codex' | 'cursor-agent' | 'opencode'): void {
    this.metrics.overrides[agent]++;
  }

  recordDispatch(type: 'internal' | 'gateway'): void {
    this.metrics.dispatches[type]++;
  }

  getMetrics(): TierMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      detections: { 'sub-wit': 0, 'mid-wit': 0, 'big-wit': 0 },
      overrides: { codex: 0, 'cursor-agent': 0, opencode: 0 },
      dispatches: { internal: 0, gateway: 0 },
      lastReset: new Date().toISOString(),
    };
  }

  getSummary(): string {
    const { detections, overrides, dispatches } = this.metrics;
    const totalDetections = Object.values(detections).reduce((a, b) => a + b, 0);
    const totalOverrides = Object.values(overrides).reduce((a, b) => a + b, 0);
    const totalDispatches = Object.values(dispatches).reduce((a, b) => a + b, 0);

    return [
      `Detections: ${totalDetections} (sub: ${detections['sub-wit']}, mid: ${detections['mid-wit']}, big: ${detections['big-wit']})`,
      `Overrides: ${totalOverrides} (codex: ${overrides.codex}, cursor: ${overrides['cursor-agent']}, opencode: ${overrides.opencode})`,
      `Dispatches: ${totalDispatches} (internal: ${dispatches.internal}, gateway: ${dispatches.gateway})`,
      `Since: ${this.metrics.lastReset}`,
    ].join('\n');
  }
}

export const metrics = new MetricsCollector();
