---
description: Upload a markdown file to Arweave permanent storage
argument-hint: <file-path>
allowed-tools: Bash(npm:*), Bash(npx:*), Bash(cd:*), Bash(echo:*), Read
---

Upload the specified markdown file to Arweave permanent storage.

**File to upload:** $ARGUMENTS

## Process

1. First, verify the file exists at the specified path
2. Check that MP_WALLET_PATH environment variable is set
3. Run the upload script from the markdown-provenance directory
4. Report the ViewBlock URL and IPFS CID to the user

## Commands

```bash
# Navigate to the skill directory and run upload
cd /Users/rickmanelius/git/rickmanelius/markdown-provenance && npm run upload "$ARGUMENTS"
```

## On Success

Report to user:
- ViewBlock transaction URL
- Direct Arweave URL
- IPFS CID of the content
- Confirmation that transaction was logged

## On Error

If MP_WALLET_PATH not set, show setup instructions from README.md.
If file not found, show the path that was attempted.
If upload fails, show the error message with troubleshooting hints.
