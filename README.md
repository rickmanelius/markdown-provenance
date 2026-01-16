# Markdown Provenance

A Claude Code slash command for uploading markdown files to Arweave permanent storage.

## Security Note

This command is **explicit invocation only**. It will NOT automatically trigger when you mention "arweave" or "permanent storage" in conversation. You must explicitly run `/markdown-provenance` to upload anything.

## Quick Start

1. Set up your Arweave wallet (see below)
2. Register with Claude Code (see below)
3. Run: `/markdown-provenance path/to/file.md`
4. Receive your permanent viewblock.io URL

## Installation

```bash
cd /path/to/markdown-provenance
npm install
```

## Wallet Setup

### Generate a New Wallet

```bash
npx -y arweave wallet generate > wallet.json
```

**IMPORTANT: Keep this file secure and never commit it to git!**

### Set Environment Variables

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
export MP_WALLET_PATH="/path/to/your/wallet.json"
export MP_AUTHOR="Your Name"  # Optional - adds Author tag to uploads
```

Then reload your shell:

```bash
source ~/.zshrc  # or source ~/.bashrc
```

### Fund Your Wallet (for files >100KB)

Files under 100KB are **FREE** via Turbo.

For larger files, you need AR tokens:

1. Get your wallet address:
   ```bash
   npx arweave wallet address wallet.json
   ```

2. Purchase AR from an exchange (Binance, Gate.io, etc.)

3. Send AR to your wallet address

## Registering with Claude Code

To make `/markdown-provenance` available in Claude Code, you have several options:

### Option 1: Symlink to plugins directory (Recommended)

```bash
ln -s /path/to/markdown-provenance ~/.claude/plugins/markdown-provenance
```

### Option 2: Add to existing plugin

If you have an existing plugin, copy the `commands/` and `SKILL.md` to that plugin.

### Option 3: Reference in CLAUDE.md

Add to your global or project CLAUDE.md:

```markdown
## Available Commands

- `/markdown-provenance <file>` - Upload markdown to Arweave permanent storage
  Location: /path/to/markdown-provenance
```

## Usage

### Via Claude Code

```
/markdown-provenance ./my-document.md
```

### Via Command Line

```bash
cd /path/to/markdown-provenance
npm run upload ./my-document.md
```

Or directly:

```bash
npx tsx /path/to/markdown-provenance/scripts/upload-to-arweave.ts ./my-document.md
```

## Output

On success, you'll receive:

- **ViewBlock URL**: `https://viewblock.io/arweave/tx/abc123...` (block explorer)
- **Direct Arweave URL**: `https://arweave.net/abc123...` (raw content)
- **IPFS CID**: Content identifier for the uploaded file

All transactions are logged to `~/.markdown-provenance/transactions.jsonl`

## Tags Applied

Each upload includes these metadata tags:

| Tag | Value |
|-----|-------|
| App-Name | Markdown Provenance |
| App-Version | 0.0.1 |
| Author | From `MP_AUTHOR` env var (if set) |
| IPFS-CID | Calculated from file content (CIDv1, SHA-256) |
| Content-Type | text/markdown |
| Type | Attestation |

## Security Best Practices

- **Never commit wallet.json to version control**
- Store wallet in a secure location outside your project (e.g., `~/.arweave/wallet.json`)
- Back up wallet.json to multiple secure locations
- Consider using a hardware wallet for large holdings
- The `MP_WALLET_PATH` environment variable should point to this secure location

## Troubleshooting

### "MP_WALLET_PATH not set"

Set the environment variable pointing to your wallet.json file:

```bash
export MP_WALLET_PATH="/path/to/wallet.json"
```

### "Wallet file not found"

Check that the path in `MP_WALLET_PATH` is correct and the file exists:

```bash
ls -la $MP_WALLET_PATH
```

### "Insufficient funds"

Files over 100KB require AR tokens. Fund your wallet address with AR:

```bash
# Get your wallet address
npx arweave wallet address $MP_WALLET_PATH
```

### Network errors

Check your internet connection and retry. Arweave uploads may take a moment.

### "/markdown-provenance not found"

Make sure you've registered the skill with Claude Code (see "Registering with Claude Code" section above).

## Transaction Log

All uploads are logged to `~/.markdown-provenance/transactions.jsonl`:

```json
{"timestamp":"2025-01-15T12:00:00Z","file":"doc.md","txId":"abc...","url":"https://viewblock.io/arweave/tx/abc...","cid":"bafkrei...","size":1234}
```

You can view your transaction history:

```bash
cat ~/.markdown-provenance/transactions.jsonl
```

Or get a count:

```bash
wc -l ~/.markdown-provenance/transactions.jsonl
```

## How It Works

1. **File Reading**: The script reads your markdown file
2. **CID Generation**: Calculates an IPFS-compatible CID (CIDv1, SHA-256, raw codec)
3. **Transaction Creation**: Creates an Arweave transaction with proper tags
4. **Upload**: Uses ArDrive Turbo SDK for reliable, fast uploads
5. **Logging**: Records the transaction in your local log file

## References

- [Arweave](https://arweave.org) - Permanent data storage
- [ArDrive Turbo SDK](https://github.com/ardriveapp/turbo-sdk) - Upload library
- [ViewBlock](https://viewblock.io/arweave) - Arweave block explorer
- [Permaweb Cookbook](https://cookbook.arweave.net/) - Developer resources

## License

MIT
