<!-- Logo placeholder: Add basedclaw-logo.png when available -->
<!-- ![BasedClaw](./basedclaw-logo.png) -->

# BasedClaw

A 3-tier intelligence routing plugin for openclaw. Routes tasks to appropriate model tiers based on complexity detection.

## Overview

BasedClaw implements a "wit-tier" system that classifies tasks into three complexity levels:

| Tier | Use Case | Dispatch |
|------|----------|----------|
| sub-wit | Trivial tasks (typos, simple lookups) | Internal, direct answer |
| mid-wit | Moderate tasks (feature implementation) | Internal agent session |
| big-wit | Complex tasks (architecture, debugging) | External gateway dispatch |

Detection works via keyword matching in prompts, with explicit overrides for forcing specific agents.

## Installation

```bash
npm install basedclaw
```

Or clone and install locally:

```bash
git clone https://github.com/Nomadcxx/BasedClaw.git
cd BasedClaw
npm install
npm run build
```

## Configuration

Add to your `openclaw.json`:

```json
{
  "plugins": {
    "allow": ["basedclaw"],
    "basedclaw": {
      "enabled": true,
      "config": {
        "gateway_url": "http://localhost:18789",
        "default_big_wit_agent": "opencode",
        "model_routing": {
          "sub-wit": ["haiku-4.5", "gpt-5-mini"],
          "mid-wit": ["sonnet-4.6", "kimi-k2.5"],
          "big-wit": ["opus-4.6", "gpt-5.3-codex"]
        }
      }
    }
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gateway_url` | string | `http://localhost:18789` | URL for big-wit gateway dispatch |
| `default_big_wit_agent` | string | `opencode` | Default agent for big-wit tasks |
| `model_routing` | object | See below | Per-tier model preferences |

## Usage

### Keyword Detection

Include tier keywords in your prompts for automatic classification:

**sub-wit triggers:** `sub-wit`, `trivial`, `simple`, `quick`

**mid-wit triggers:** `mid-wit`, `moderate`, `careful`, `focused`

**big-wit triggers:** `big-wit`, `hard`, `complex`, `deep`, `architect`

Example:
```
This is a big-wit task - help me architect a distributed system
```

### Explicit Overrides

Force a specific agent with override commands:

| Command | Effect |
|---------|--------|
| `!codex` | Route to Codex agent (big-wit) |
| `!cursor` | Route to Cursor agent (big-wit) |
| `!opencode` | Route to OpenCode agent (big-wit) |

Example:
```
!codex help me debug this complex memory leak
```

### Tools

BasedClaw registers four tools:

#### oc_delegate

Manually delegate a task to a specific tier:

```
oc_delegate(tier="big-wit", task_description="Architect a new API", agent="codex")
```

Parameters:
- `tier` (required): `sub-wit`, `mid-wit`, or `big-wit`
- `task_description` (required): Task to delegate
- `agent` (optional): Override agent selection
- `model` (optional): Override model selection

#### oc_metrics

View tier detection and dispatch metrics:

```
oc_metrics(action="summary")  # Default: human-readable summary
oc_metrics(action="json")     # Full metrics as JSON
oc_metrics(action="reset")    # Reset all counters
```

#### oc_config

View and validate configuration:

```
oc_config(action="show")      # Current effective config
oc_config(action="validate")  # Validate config for errors
oc_config(action="template")  # Get config template
```

#### oc_feedback

Record feedback on tier detection accuracy:

```
oc_feedback(action="record", prompt="fix typo", correct_tier="sub-wit")
oc_feedback(action="stats")       # View accuracy statistics
oc_feedback(action="suggestions") # Get improvement suggestions
oc_feedback(action="history")     # View recent feedback
```

## API

### Programmatic Access

```typescript
import { metrics, feedback, validateConfig, getEffectiveConfig } from 'basedclaw';

// Get current metrics
const stats = metrics.getMetrics();
console.log(`Detections: ${stats.detections['big-wit']}`);

// Record feedback
feedback.record({
  originalPrompt: 'simple task',
  detectedTier: 'big-wit',
  correctedTier: 'sub-wit',
});

// Validate config
const validation = validateConfig(myConfig);
if (!validation.valid) {
  console.error(validation.errors);
}
```

### Types

```typescript
interface TierMetrics {
  detections: { 'sub-wit': number; 'mid-wit': number; 'big-wit': number };
  overrides: { codex: number; 'cursor-agent': number; opencode: number };
  dispatches: { internal: number; gateway: number };
  lastReset: string;
}

interface FeedbackEntry {
  id: string;
  timestamp: string;
  originalPrompt: string;
  detectedTier: 'sub-wit' | 'mid-wit' | 'big-wit' | null;
  correctedTier: 'sub-wit' | 'mid-wit' | 'big-wit';
  reason?: string;
}

interface ConfigValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
}
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run test:watch
```

### Project Structure

```
src/
  index.ts          # Plugin entry, tool registration
  constants.ts      # Tier definitions, patterns, defaults
  config.ts         # Config validation and helpers
  metrics.ts        # Metrics collector
  feedback.ts       # Feedback loop system
  hooks/
    wit-detector.ts # Hook for tier detection
  tools/
    oc-delegate.ts  # Delegation tool
tests/
  *.test.ts         # Unit tests
  e2e/              # End-to-end tests
```

## How It Works

1. **Hook Registration**: `wit-detector` hook fires on `before_prompt_build` event
2. **Detection**: Prompts are scanned for tier keywords (code blocks stripped first)
3. **Context Injection**: Detected tier info is prepended to context via `prependContext`
4. **Dispatch**: `oc_delegate` tool routes to appropriate handler based on tier

### Detection Priority

1. Explicit overrides (`!codex`, `!cursor`, `!opencode`) - highest priority
2. big-wit keywords
3. mid-wit keywords
4. sub-wit keywords
5. No detection (no tier context added)

## License

MIT
