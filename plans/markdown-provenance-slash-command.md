# feat: /markdown-provenance Claude Code Slash Command

**Type:** Enhancement
**Date:** 2025-01-15
**Complexity:** Medium

---

## Overview

Create a Claude Code slash command `/markdown-provenance` that uploads markdown files to Arweave permanent storage with proper metadata tags, returning the block explorer URL and logging transactions locally.

## Problem Statement / Motivation

Users want to permanently archive markdown content on Arweave's decentralized storage network directly from Claude Code. This enables:
- Permanent, immutable documentation storage
- Attestations and proof-of-existence for markdown content
- Integration with the permaweb ecosystem
- Content-addressable storage with IPFS CID tagging

## Proposed Solution

Create a Claude Code slash command at `/Users/rickmanelius/git/rickmanelius/markdown-provenance/` with:
1. **commands/markdown-provenance.md** - Slash command definition (explicit invocation only)
2. **SKILL.md** - Core instructions and workflow (NO auto-trigger phrases)
3. **scripts/upload-to-arweave.ts** - TypeScript upload script using @ardrive/turbo-sdk
4. **README.md** - Setup instructions including wallet generation

### Security: Explicit Invocation Only

**This command will ONLY run when explicitly invoked via `/markdown-provenance`.**

It will NOT auto-trigger based on conversation context (e.g., mentioning "arweave", "permanent storage", etc.) to prevent accidental uploads of private content.

### Command Interface

```bash
/markdown-provenance <file-path>
```

**Example:**
```bash
/markdown-provenance ./docs/attestation.md
```

### Default Tags Applied

| Tag | Value | Source |
|-----|-------|--------|
| App-Name | Markdown Provenance | Static |
| App-Version | 0.0.1 | Static |
| Author | User-provided | `MP_AUTHOR` env var |
| IPFS-CID | Calculated | SHA-256 hash of content |
| Content-Type | text/markdown | Static |
| Type | Attestation | Static |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MP_WALLET_PATH` | Yes | Path to wallet.json file |
| `MP_AUTHOR` | No | Author name for Author tag (omitted if not set) |

## Technical Approach

### SDK Selection: @ardrive/turbo-sdk

**Rationale:**
- Free uploads for files under 100KB
- Instant uploads with guaranteed finalization
- Handles chunked uploads automatically
- More reliable than raw arweave-js for production use

### IPFS CID Generation

Using `multiformats` library:
- **Version:** CIDv1
- **Hash:** SHA-256
- **Codec:** raw

```typescript
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import * as raw from 'multiformats/codecs/raw';

async function generateCID(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const hash = await sha256.digest(bytes);
  return CID.create(1, raw.code, hash).toString();
}
```

### Transaction Logging

**Location:** `~/.markdown-provenance/transactions.jsonl`
**Format:** JSON Lines (one JSON object per line)

```json
{"timestamp":"2025-01-15T12:00:00Z","file":"attestation.md","txId":"abc123...","url":"https://viewblock.io/arweave/tx/abc123...","cid":"bafkrei...","size":1234}
```

### Directory Structure

```
markdown-provenance/
├── commands/
│   └── markdown-provenance.md           # Slash command (explicit invocation only)
├── SKILL.md                             # Skill instructions (NO auto-trigger)
├── scripts/
│   └── upload-to-arweave.ts             # Main upload script
├── README.md                            # Setup and usage documentation
├── package.json                         # Dependencies
├── tsconfig.json                        # TypeScript configuration
└── plans/
    └── markdown-provenance-slash-command.md  # This plan
```

## Acceptance Criteria

### Functional Requirements

- [ ] `/markdown-provenance path/to/file.md` uploads file to Arweave
- [ ] Returns viewblock.io transaction URL on success
- [ ] Applies all six required tags (App-Name, App-Version, Author, IPFS-CID, Content-Type, Type)
- [ ] Logs transaction to `~/.markdown-provenance/transactions.jsonl`
- [ ] Log file excluded from git via documentation in README

### Security Requirements

- [ ] Skill ONLY invocable via explicit `/markdown-provenance` command
- [ ] SKILL.md description contains NO auto-trigger phrases
- [ ] Separate slash command file (`commands/markdown-provenance.md`) handles invocation
- [ ] No accidental uploads from conversation context mentioning "arweave", "permanent", etc.

### Error Handling Requirements

- [ ] Missing wallet: Display setup instructions with wallet generation guide
- [ ] Invalid wallet JSON: Display parsing error with troubleshooting steps
- [ ] File not found: Display clear error with provided path
- [ ] Non-markdown file: Warn but allow upload (user may have valid use case)
- [ ] Network error: Display retry suggestion
- [ ] Insufficient funds (>100KB): Display funding instructions

### Documentation Requirements

- [ ] README includes wallet generation instructions (using arweave-js)
- [ ] README includes environment variable setup for both bash and zsh
- [ ] README includes example usage
- [ ] README includes security best practices for wallet storage

## Success Metrics

- Successful upload returns viewblock.io URL
- Transaction visible on block explorer within minutes
- Markdown renders correctly when accessed via `arweave.net/{txId}`
- Transaction logged to local file

## Dependencies & Risks

### Dependencies

- Node.js 18+
- npm packages: @ardrive/turbo-sdk, multiformats, tsx
- Valid Arweave wallet with funds (for files >100KB)

### Risks

| Risk | Mitigation |
|------|------------|
| Turbo SDK API changes | Pin version in package.json |
| Network outages | Include retry guidance in error messages |
| Wallet security | Document best practices in README |
| Cost for large files | Clear documentation about 100KB free tier |

## References & Research

### Internal References
- Example transaction: https://viewblock.io/arweave/tx/nu-nv3Nyl0S8D4zxjDV7Nae8VLSQe6483eyt1tLZJfQ

### External References
- [ArDrive Turbo SDK](https://github.com/ardriveapp/turbo-sdk)
- [arweave-js SDK](https://github.com/ArweaveTeam/arweave-js)
- [Arweave Tag Standards BP-105](https://github.com/ArweaveTeam/arweave-standards/blob/master/best-practices/BP-105.md)
- [multiformats npm](https://www.npmjs.com/package/multiformats)
- [Permaweb Cookbook](https://cookbook.arweave.net/)

### Claude Code Skill References
- Skill structure guide: `~/.claude/plugins/marketplaces/every-marketplace/plugins/compound-engineering/skills/create-agent-skills/`
