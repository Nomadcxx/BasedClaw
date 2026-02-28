# BasedClaw

> **WIP** - Work in Progress

3-tier intelligence routing plugin for OpenClaw.

## What It Does

Routes tasks to the appropriate intelligence tier:

| Tier | Use Case | Action |
|------|----------|--------|
| **sub-wit** | Trivial tasks | Answer directly |
| **mid-wit** | Moderate tasks | Spawn agent |
| **big-wit** | Complex tasks | Gateway dispatch |

## Keywords

- `sub-wit`, `trivial`, `simple`, `quick`
- `mid-wit`, `moderate`, `careful`, `focused`  
- `big-wit`, `hard`, `complex`, `deep`, `architect`

## Explicit Overrides

```
!codex [task]    → dispatch to codex
!cursor [task]   → dispatch to cursor-agent
!opencode [task] → dispatch to opencode
```

## Install

```bash
git clone https://github.com/Nomadcxx/BasedClaw.git
cd BasedClaw
npm install && npm run build
cp -r . ~/.openclaw/extensions/basedclaw
openclaw plugins enable basedclaw
```

## Status

- [x] Core routing logic
- [x] Keyword detection hook
- [x] `oc_delegate` tool
- [x] 88 tests passing
- [ ] Config schema validation
- [ ] Production hardening

## License

MIT
