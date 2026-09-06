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

// --------------------------------------------------
// CONFIG
// --------------------------------------------------

const EXPECTED_RECEIVER =
  "VQF5PIPVPWL23YPIJHCDTFB6FWLTHRN4GW7FDKLTCGBE4FINYD4TE5O2E4";

const USDC_ASA_ID = 10458941;

const ALGOD_SERVER = "https://testnet-api.algonode.cloud";
const ALGOD_PORT = "";
const ALGOD_TOKEN = "";

const algod = new algosdk.Algodv2(
  ALGOD_TOKEN,
  ALGOD_SERVER,
  ALGOD_PORT
);

// --------------------------------------------------
// GET RECOVERY PHRASE
// --------------------------------------------------

async function getRootKey() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const mnemonic = await new Promise((resolve) => {
    rl.question(
      "Enter your 24-word Pera recovery phrase: ",
      resolve
    );
  });

  rl.close();

  const phrase = mnemonic.trim();

  if (!bip39.validateMnemonic(phrase)) {
    throw new Error("Invalid BIP39 recovery phrase.");
  }

  console.log("✅ BIP39 recovery phrase is valid.");

  const seed = await bip39.mnemonicToSeed(phrase);

  return fromSeed(seed);
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {
  console.log("\nGenerating receiver key using Pera Peikert...\n");

  const rootKey = await getRootKey();

  const xhd = new XHDWalletAPI();

  // Generate Pera public key using Peikert derivation
  const publicKey = await xhd.keyGen(
    rootKey,
    KeyContext.Address,
    0,
    0,
    BIP32DerivationType.Peikert
  );

  const receiverAddress = algosdk.encodeAddress(
    Buffer.from(publicKey)
  );

  console.log("\nExpected receiver:");
  console.log(EXPECTED_RECEIVER);

  console.log("\nDerived receiver:");
  console.log(receiverAddress);

  // ------------------------------------------------
  // VERIFY ADDRESS
  // ------------------------------------------------

  if (receiverAddress !== EXPECTED_RECEIVER) {
    throw new Error(
      "Receiver address mismatch — STOP."
    );
  }

  console.log("\n✅ Receiver address verified.");

  // ------------------------------------------------
  // CHECK USDC OPT-IN
  // ------------------------------------------------

  console.log("\nChecking Testnet USDC opt-in status...");

  const accountInfo = await algod
    .accountInformation(receiverAddress)
    .do();

  const existingAsset = (accountInfo.assets || []).find(
    (asset) =>
      String(asset.assetId) === String(USDC_ASA_ID)
  );

  if (existingAsset) {
    console.log(
      "\n✅ Receiver is already opted into Testnet USDC."
    );

    console.log(
      "USDC balance:",
      existingAsset.amount.toString()
    );

    return;
  }

  console.log(
    "\nReceiver is NOT opted into Testnet USDC."
  );

  // ------------------------------------------------
  // GET SUGGESTED PARAMETERS
  // ------------------------------------------------

  const suggestedParams = await algod
    .getTransactionParams()
    .do();

  // ------------------------------------------------
  // CREATE OPT-IN TRANSACTION
  // ------------------------------------------------

  console.log("\nCreating USDC opt-in transaction...");

  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(
    {
      sender: receiverAddress,
      receiver: receiverAddress,
      assetIndex: USDC_ASA_ID,
      amount: 0,
      suggestedParams,
    }
  );

  // ------------------------------------------------
  // SIGN
  // ------------------------------------------------

  console.log(
    "\nPreparing canonical Algorand signing bytes..."
  );

  // IMPORTANT:
  // rawSign() uses Buffer.concat(), so data MUST
  // be a Node.js Buffer.
  const signingBytes = Buffer.from(
    txn.bytesToSign()
  );

  console.log(
    "Signing with Pera/XHD Peikert signer..."
  );

  const signature =
    await xhd.signAlgoTransaction(
      rootKey,
      KeyContext.Address,
      0,
      0,
      signingBytes,
      BIP32DerivationType.Peikert
    );

  // ------------------------------------------------
  // VERIFY SIGNATURE LOCALLY
  // ------------------------------------------------

console.log("✅ XHD signature created successfully.");
  // ------------------------------------------------
  // CREATE SIGNED TRANSACTION
  // ------------------------------------------------

  const signedTxn =
    new algosdk.SignedTransaction({
      txn,
      sig: signature,
    });

  // IMPORTANT:
  // Do NOT use:
  //
  // algosdk.encodeObj(signedTxn.toEncodingData())
  //
  // because it can produce a malformed transaction.
  //
  // Use the SDK's encoding schema.

  const prepared =
    signedTxn
      .getEncodingSchema()
      .prepareMsgpack(
        signedTxn.toEncodingData()
      );

  const encodedSignedTxn =
    algosdk.msgpackRawEncode(prepared);

  console.log(
    "\nSigned transaction size:",
    encodedSignedTxn.length
  );

  // ------------------------------------------------
  // SUBMIT
  // ------------------------------------------------

  console.log(
    "\nSubmitting receiver USDC opt-in transaction..."
  );

  const txId =
    await algod.sendRawTransaction(
      encodedSignedTxn
    ).do();

  console.log("\nTransaction ID:");
  console.log(txId.txid);

  // ------------------------------------------------
  // WAIT FOR CONFIRMATION
  // ------------------------------------------------

  console.log(
    "\nWaiting for confirmation..."
  );

  const confirmed =
    await algosdk.waitForConfirmation(
      algod,
      txId.txid,
      4
    );

  console.log(
    "\n✅ SUCCESS — receiver opted into Testnet USDC."
  );

  console.log(
    "Confirmed round:",
    confirmed.confirmedRound?.toString()
  );
}

// --------------------------------------------------
// ERROR HANDLER
// --------------------------------------------------

main().catch((error) => {
  console.error("\nERROR:", error.message);
  console.error("\nFULL STACK:");
  console.error(error.stack);
  process.exit(1);
});
