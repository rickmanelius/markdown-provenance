---
name: markdown-provenance
description: Internal skill for uploading markdown to Arweave. Invoked only via /markdown-provenance command.
---

<objective>
Upload markdown content to Arweave's permanent, decentralized storage network with proper metadata tags. Returns a viewblock.io transaction URL and logs all uploads locally.

SECURITY: This skill should ONLY be invoked via the explicit /markdown-provenance slash command, never automatically based on conversation context.
</objective>

<quick_start>
1. Ensure MP_WALLET_PATH environment variable points to wallet.json
2. Run the upload script with the markdown file path

```bash
cd /Users/rickmanelius/git/rickmanelius/markdown-provenance
npm run upload path/to/file.md
```
</quick_start>

<process>
## Step 1: Confirm User Intent

Before uploading, confirm the user explicitly requested this via /markdown-provenance command. Never auto-trigger based on conversation about Arweave or permanent storage.

## Step 2: Check Environment

Verify MP_WALLET_PATH is set:

```bash
echo $MP_WALLET_PATH
```

If not set, guide user through wallet setup:

```bash
# Generate wallet
npx -y arweave wallet generate > wallet.json

# Set environment variable (add to ~/.zshrc or ~/.bashrc)
export MP_WALLET_PATH="/path/to/wallet.json"
export MP_AUTHOR="Your Name"  # Optional
```

## Step 3: Upload File

Execute the upload script:

```bash
cd /Users/rickmanelius/git/rickmanelius/markdown-provenance
npm run upload <file-path>
```

## Step 4: Report Results

Share with user:
- ViewBlock URL for the transaction
- Direct Arweave URL
- IPFS CID of the content
- Confirmation that transaction was logged to ~/.markdown-provenance/transactions.jsonl
</process>

<tags_applied>
The following tags are automatically added to each upload:

| Tag | Value |
|-----|-------|
| Content-Type | text/markdown |
| App-Name | Markdown Provenance |
| App-Version | 0.0.1 |
| Type | Attestation |
| IPFS-CID | (calculated from content) |
| Author | (from MP_AUTHOR env var, if set) |
</tags_applied>

<success_criteria>
- Transaction ID returned from Arweave
- viewblock.io URL displayed to user
- Transaction logged to ~/.markdown-provenance/transactions.jsonl
- All required tags applied (App-Name, App-Version, Content-Type, Type, IPFS-CID)
</success_criteria>

<error_handling>
If MP_WALLET_PATH not set:
- Direct user to README.md wallet setup section
- Provide quick setup commands shown above

If wallet file not found:
- Verify path is correct
- Check file permissions

If upload fails with network error:
- Suggest retry
- Check internet connection

If upload fails with insufficient funds (files >100KB):
- Files under 100KB are FREE via Turbo
- For larger files, direct user to fund wallet with AR tokens
- Get wallet address: `npx arweave wallet address wallet.json`
</error_handling>
