# Markdown Provenance

A Claude Code plugin that provides the `/markdown-provenance` slash command for uploading markdown files to Arweave permanent storage.

## Tech Stack

- TypeScript with ESM modules
- Node.js 18+
- ArDrive Turbo SDK for Arweave uploads
- Arbundles for data item signing
- Multiformats for IPFS CID generation

## Project Structure

```
commands/           # Claude Code slash command definitions
scripts/            # TypeScript implementation
  upload-to-arweave.ts  # Main upload logic
plans/              # Development planning docs
SKILL.md            # Skill definition for Claude Code
```

## Development Commands

```bash
npm install                    # Install dependencies
npm run upload <file.md>       # Upload a markdown file
```

## Environment Variables

Required:
- `MP_WALLET_PATH` - Path to Arweave wallet.json file

Optional:
- `MP_AUTHOR` - Author name added as metadata tag

## Key Implementation Details

- Files under 100KB upload free via Turbo
- Each upload generates an IPFS-compatible CID (CIDv1, SHA-256, raw codec)
- Transactions logged to `~/.markdown-provenance/transactions.jsonl`
- Tags applied: Content-Type, App-Name, App-Version, Type, IPFS-CID, Author (if set)

## Security Notes

- Never commit wallet.json to git
- The slash command only triggers on explicit `/markdown-provenance` invocation, never automatically
