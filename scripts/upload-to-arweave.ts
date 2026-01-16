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
}

async function generateIPFSCID(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const hash = await sha256.digest(bytes);
  return CID.create(1, raw.code, hash).toString();
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

async function uploadMarkdown(filePath: string): Promise<UploadResult> {
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

  // Add author if provided
  const author = process.env.MP_AUTHOR;
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
  };

  // Log transaction
  logTransaction(uploadResult, fileName);

  return uploadResult;
}

// Main execution
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: npm run upload <file-path>');
  console.error('       npx tsx scripts/upload-to-arweave.ts <file-path>');
  process.exit(1);
}

uploadMarkdown(filePath)
  .then((result) => {
    console.log('\n✅ Upload successful!\n');
    console.log(`Transaction ID: ${result.transactionId}`);
    console.log(`View on ViewBlock: ${result.viewblockUrl}`);
    console.log(`Direct Arweave URL: ${result.arweaveUrl}`);
    console.log(`IPFS CID: ${result.ipfsCid}`);
    console.log(`File size: ${result.fileSize} bytes`);
    console.log(`\nTransaction logged to ~/.markdown-provenance/transactions.jsonl`);
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
