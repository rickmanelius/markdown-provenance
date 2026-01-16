import { ArweaveSigner, TurboFactory } from '@ardrive/turbo-sdk';
import { createData, ArweaveSigner as ArbundlesSigner } from 'arbundles';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import * as raw from 'multiformats/codecs/raw';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface UploadResult {
  transactionId: string;
  viewblockUrl: string;
  arweaveUrl: string;
  ipfsCid: string;
  fileSize: number;
  alreadyExists: boolean;
  source?: 'local' | 'arweave';
}

async function generateIPFSCID(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const hash = await sha256.digest(bytes);
  return CID.create(1, raw.code, hash).toString();
}

interface LogEntry {
  timestamp: string;
  file: string;
  txId: string;
  url: string;
  cid: string;
  size: number;
}

function checkLocalLog(ipfsCid: string): LogEntry | null {
  const logFile = path.join(os.homedir(), '.markdown-provenance', 'transactions.jsonl');

  if (!fs.existsSync(logFile)) {
    return null;
  }

  const lines = fs.readFileSync(logFile, 'utf-8').trim().split('\n');

  for (const line of lines) {
    if (!line) continue;
    try {
      const entry: LogEntry = JSON.parse(line);
      if (entry.cid === ipfsCid) {
        return entry;
      }
    } catch {
      // Skip malformed lines
    }
  }

  return null;
}

interface ArweaveGraphQLResponse {
  data: {
    transactions: {
      edges: Array<{
        node: {
          id: string;
          tags: Array<{ name: string; value: string }>;
        };
      }>;
    };
  };
}

async function checkArweaveForCID(ipfsCid: string): Promise<{ txId: string } | null> {
  const query = `
    query {
      transactions(
        tags: [
          { name: "IPFS-CID", values: ["${ipfsCid}"] }
        ]
        first: 1
      ) {
        edges {
          node {
            id
            tags {
              name
              value
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://arweave.net/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.warn('Warning: Could not query Arweave GraphQL endpoint');
      return null;
    }

    const result = await response.json() as ArweaveGraphQLResponse;
    const edges = result.data?.transactions?.edges;

    if (edges && edges.length > 0) {
      return { txId: edges[0].node.id };
    }

    return null;
  } catch (error) {
    console.warn('Warning: Error querying Arweave:', (error as Error).message);
    return null;
  }
}

function getWallet(): any {
  const walletPath = process.env.MP_WALLET_PATH;
  if (!walletPath) {
    throw new Error(
      'MP_WALLET_PATH environment variable not set.\n\n' +
      'To set up your Arweave wallet:\n' +
      '1. Generate a wallet: npx -y arweave wallet generate > wallet.json\n' +
      '2. Set the environment variable:\n' +
      '   export MP_WALLET_PATH="/path/to/wallet.json"\n' +
      '3. Add to ~/.zshrc or ~/.bashrc for persistence'
    );
  }

  if (!fs.existsSync(walletPath)) {
    throw new Error(`Wallet file not found at: ${walletPath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  } catch (e) {
    throw new Error(`Failed to parse wallet JSON: ${(e as Error).message}`);
  }
}

function logTransaction(result: UploadResult, fileName: string): void {
  const logDir = path.join(os.homedir(), '.markdown-provenance');
  const logFile = path.join(logDir, 'transactions.jsonl');

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    file: fileName,
    txId: result.transactionId,
    url: result.viewblockUrl,
    cid: result.ipfsCid,
    size: result.fileSize,
  };

  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

interface UploadOptions {
  authorOverride?: string;
}

async function uploadMarkdown(filePath: string, options: UploadOptions = {}): Promise<UploadResult> {
  // Resolve to absolute path
  const absolutePath = path.resolve(filePath);

  // Validate file exists
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  // Read file content
  const content = fs.readFileSync(absolutePath, 'utf-8');
  const fileSize = Buffer.byteLength(content, 'utf-8');
  const fileName = path.basename(absolutePath);

  // Warn if not markdown extension
  const ext = path.extname(absolutePath).toLowerCase();
  if (ext !== '.md' && ext !== '.markdown') {
    console.warn(`Warning: File extension "${ext}" is not .md or .markdown`);
  }

  // Generate IPFS CID
  console.log('Calculating IPFS CID...');
  const ipfsCid = await generateIPFSCID(content);
  console.log(`IPFS CID: ${ipfsCid}`);

  // Check if this content was already uploaded (local log first, then Arweave)
  console.log('\nChecking for existing upload...');

  // Check local log first (faster)
  const localEntry = checkLocalLog(ipfsCid);
  if (localEntry) {
    console.log('Found existing upload in local log.');
    return {
      transactionId: localEntry.txId,
      viewblockUrl: localEntry.url,
      arweaveUrl: `https://arweave.net/${localEntry.txId}`,
      ipfsCid: localEntry.cid,
      fileSize: localEntry.size,
      alreadyExists: true,
      source: 'local',
    };
  }

  // Check Arweave GraphQL
  const arweaveEntry = await checkArweaveForCID(ipfsCid);
  if (arweaveEntry) {
    console.log('Found existing upload on Arweave.');
    return {
      transactionId: arweaveEntry.txId,
      viewblockUrl: `https://viewblock.io/arweave/tx/${arweaveEntry.txId}`,
      arweaveUrl: `https://arweave.net/${arweaveEntry.txId}`,
      ipfsCid,
      fileSize,
      alreadyExists: true,
      source: 'arweave',
    };
  }

  console.log('No existing upload found. Proceeding with new upload...');

  // Get wallet
  const jwk = getWallet();

  // Initialize Turbo
  const signer = new ArweaveSigner(jwk);
  const turbo = TurboFactory.authenticated({ signer });

  // Build tags
  const tags = [
    { name: 'Content-Type', value: 'text/markdown' },
    { name: 'App-Name', value: 'Markdown Provenance' },
    { name: 'App-Version', value: '0.0.1' },
    { name: 'Type', value: 'Attestation' },
    { name: 'IPFS-CID', value: ipfsCid },
  ];

  // Add author if provided (--author flag overrides MP_AUTHOR env var)
  const author = options.authorOverride || process.env.MP_AUTHOR;
  if (author) {
    tags.push({ name: 'Author', value: author });
  }

  console.log(`\nUploading ${fileName} (${fileSize} bytes)...`);
  console.log('Tags:', tags.map(t => `${t.name}: ${t.value}`).join(', '));

  // Create and sign a data item using arbundles
  const arbundlesSigner = new ArbundlesSigner(jwk);
  const dataItem = createData(content, arbundlesSigner, { tags });
  await dataItem.sign(arbundlesSigner);

  // Upload the signed data item
  const result = await turbo.uploadSignedDataItem({
    dataItemStreamFactory: () => dataItem.getRaw(),
    dataItemSizeFactory: () => dataItem.getRaw().length,
    signal: AbortSignal.timeout(60000),
  });

  const uploadResult: UploadResult = {
    transactionId: result.id,
    viewblockUrl: `https://viewblock.io/arweave/tx/${result.id}`,
    arweaveUrl: `https://arweave.net/${result.id}`,
    ipfsCid,
    fileSize,
    alreadyExists: false,
  };

  // Log transaction
  logTransaction(uploadResult, fileName);

  return uploadResult;
}

// Parse command line arguments
function parseArgs(): { filePath: string; author?: string } {
  const args = process.argv.slice(2);
  let filePath = '';
  let author: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--author' && args[i + 1]) {
      author = args[i + 1];
      i++; // Skip the next arg since it's the author value
    } else if (!args[i].startsWith('--')) {
      filePath = args[i];
    }
  }

  return { filePath, author };
}

// Main execution
const { filePath, author: authorOverride } = parseArgs();
if (!filePath) {
  console.error('Usage: npm run upload <file-path> [--author "Author Name"]');
  console.error('       npx tsx scripts/upload-to-arweave.ts <file-path> [--author "Author Name"]');
  console.error('\nOptions:');
  console.error('  --author    Override MP_AUTHOR environment variable');
  process.exit(1);
}

uploadMarkdown(filePath, { authorOverride })
  .then((result) => {
    if (result.alreadyExists) {
      const sourceMsg = result.source === 'local' ? 'local log' : 'Arweave network';
      console.log(`\n✅ Content already exists on Arweave (found in ${sourceMsg})!\n`);
      console.log('This exact content was previously uploaded. No new upload needed.');
    } else {
      console.log('\n✅ Upload successful!\n');
      console.log(`Transaction logged to ~/.markdown-provenance/transactions.jsonl`);
    }
    console.log(`\nTransaction ID: ${result.transactionId}`);
    console.log(`View on ViewBlock: ${result.viewblockUrl}`);
    console.log(`Direct Arweave URL: ${result.arweaveUrl}`);
    console.log(`IPFS CID: ${result.ipfsCid}`);
    console.log(`File size: ${result.fileSize} bytes`);
  })
  .catch((error) => {
    console.error('\n❌ Upload failed:\n');
    console.error(error.message);

    // Provide helpful context for common errors
    if (error.message.includes('insufficient funds') || error.message.includes('Insufficient')) {
      console.error('\nHint: Files over 100KB require AR tokens. Fund your wallet.');
    } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
      console.error('\nHint: Check your internet connection and try again.');
    }

    process.exit(1);
  });
