# oh-my-openclaw Production Testing Plan

## Test Categories

### 1. Plugin Loading Tests
- [ ] Plugin appears in `openclaw plugins list` as "loaded"
- [ ] Plugin info shows correct metadata
- [ ] Tool `oc_delegate` is registered
- [ ] No errors in plugin doctor output

### 2. Tool Functionality Tests
- [ ] `oc_delegate` can be invoked with tier="sub-wit"
- [ ] `oc_delegate` can be invoked with tier="mid-wit"  
- [ ] `oc_delegate` can be invoked with tier="big-wit"
- [ ] `oc_delegate` returns correct dispatch instructions per tier
- [ ] `oc_delegate` respects agent parameter override
- [ ] `oc_delegate` respects model parameter override

### 3. Keyword Detection Tests (Hook)
- [ ] "sub-wit" keyword detected in message
- [ ] "trivial" keyword detected → sub-wit
- [ ] "mid-wit" keyword detected
- [ ] "careful" keyword detected → mid-wit
- [ ] "big-wit" keyword detected
- [ ] "complex" keyword detected → big-wit
- [ ] Keywords inside code blocks are ignored

### 4. Explicit Override Tests
- [ ] "!codex" prefix triggers big-wit with codex agent
- [ ] "!cursor" prefix triggers big-wit with cursor-agent
- [ ] "!opencode" prefix triggers big-wit with opencode agent

### 5. Config Override Tests
- [ ] Custom model_routing in config overrides defaults
- [ ] Custom gateway_url in config is used
- [ ] Custom default_big_wit_agent in config is used

### 6. Edge Cases
- [ ] Empty task_description is rejected
- [ ] Invalid tier is rejected
- [ ] Very long task_description (>10000 chars) is rejected
- [ ] No keyword match → hook returns null (no modification)

## Test Execution

### Manual CLI Tests
```bash
# Test tool directly
openclaw tools run oc_delegate --tier sub-wit --task_description "What is 2+2?"
openclaw tools run oc_delegate --tier mid-wit --task_description "Write a test"
openclaw tools run oc_delegate --tier big-wit --task_description "Refactor module"
```

### Automated Test Script
See `tests/production.test.ts` for automated production tests.

## Success Criteria
- All unit tests pass (50/50)
- All integration tests pass
- Plugin loads without errors
- Tool executes correctly for all tiers
- Hook patterns match expected keywords
