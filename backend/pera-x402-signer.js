const readline = require("readline");
const bip39 = require("bip39");
const algosdk = require("algosdk");

const {
  XHDWalletAPI,
  KeyContext,
  BIP32DerivationType,
} = require("@algorandfoundation/xhd-wallet-api");

const { fromSeed } =
  require("@algorandfoundation/xhd-wallet-api/dist/bip32-ed25519.js");

// Expected Pera wallet address
const EXPECTED_ADDRESS =
  "46FHLYQHVYYBE7MU4V4LX4PTRRYHT36GFGSDUH6VOP46UY363FZWXPJZ7M";

async function getRootKey() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const mnemonic = await new Promise((resolve) => {
    rl.question("Enter your 24-word Pera recovery phrase: ", resolve);
  });

  rl.close();

  const cleanMnemonic = mnemonic.trim();

  if (!bip39.validateMnemonic(cleanMnemonic)) {
    throw new Error("Invalid BIP39 recovery phrase.");
  }

  const seed = await bip39.mnemonicToSeed(cleanMnemonic);

  return fromSeed(seed);
}

async function createPeraXhdSigner() {
  const rootKey = await getRootKey();

  const xhd = new XHDWalletAPI();

  // Pera uses Peikert BIP32 derivation
  const publicKey = await xhd.keyGen(
    rootKey,
    KeyContext.Address,
    0,
    0,
    BIP32DerivationType.Peikert
  );

  const address = algosdk.encodeAddress(Buffer.from(publicKey));

  // Safety check
  if (address !== EXPECTED_ADDRESS) {
    throw new Error(
      `Pera address mismatch — STOP.\nExpected: ${EXPECTED_ADDRESS}\nGot: ${address}`
    );
  }

  console.log("\n✅ Pera address verified:");
  console.log(address);

  return {
    address,

    signTransactions: async (txns, indexesToSign) => {
      const indexes =
        indexesToSign ??
        txns.map((_, index) => index);

      return Promise.all(
        txns.map(async (txnBytes, index) => {
          // Fee-payer transaction remains unsigned
          if (!indexes.includes(index)) {
            return null;
          }
          const txn =
            algosdk.decodeUnsignedTransaction(txnBytes);
          console.log("Transaction sender:", txn.sender.toString());
console.log("Signer address:", address);
     const txToSign = txn.bytesToSign();

const signature =
  await xhd.signAlgoTransaction(
    rootKey,
    KeyContext.Address,
    0,
    0,
    txToSign,
    BIP32DerivationType.Peikert
  );
          console.log(
            `Signing transaction index ${index}: ` +
              `${txnBytes.length} bytes, ` +
              `signature ${signature.length} bytes`
          );

          // IMPORTANT:
          // attachSignature requires the signer address
          // as the first argument.
          const signedTxn =
            txn.attachSignature(address, signature);

          return new Uint8Array(signedTxn);
        })
      );
    },
  };
}

async function main() {
  try {
    const signer = await createPeraXhdSigner();

    console.log("\nSigner address:", signer.address);
    console.log(
      "Custom Pera/XHD signer created successfully."
    );
    console.log("Ready for x402 transaction signing.");
  } catch (error) {
    console.error("\nERROR:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  createPeraXhdSigner,
};
