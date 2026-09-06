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

const {
  bytesForSigning,
} = require("@algorandfoundation/algokit-utils/transact");
const USDC_ASA_ID = 10458941;

const EXPECTED_ADDRESS =
  "46FHLYQHVYYBE7MU4V4LX4PTRRYHT36GFGSDUH6VOP46UY363FZWXPJZ7M";

const algod = new algosdk.Algodv2(
  "",
  "https://testnet-api.algonode.cloud",
  ""
);

async function getRootKey() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const mnemonic = await new Promise((resolve) => {
    rl.question("Enter your 24-word Pera recovery phrase: ", resolve);
  });

  rl.close();

  if (!bip39.validateMnemonic(mnemonic.trim())) {
    throw new Error("Invalid BIP39 recovery phrase.");
  }

  const seed = await bip39.mnemonicToSeed(mnemonic.trim());

  return fromSeed(seed);
}

async function main() {
  const rootKey = await getRootKey();

  const xhd = new XHDWalletAPI();

  const publicKey = await xhd.keyGen(
    rootKey,
    KeyContext.Address,
    0,
    0,
    BIP32DerivationType.Peikert
  );

  const address = algosdk.encodeAddress(Buffer.from(publicKey));

  console.log("\nPayer address:", address);

  if (address !== EXPECTED_ADDRESS) {
    throw new Error("Payer address mismatch — STOP.");
  }

  const account = await algod.accountInformation(address).do();

  const alreadyOptedIn = account.assets?.some(
    (asset) => Number(asset["asset-id"]) === USDC_ASA_ID
  );

  if (alreadyOptedIn) {
    console.log("Already opted into USDC.");
    return;
  }

  console.log("Creating USDC opt-in transaction...");

  const params = await algod.getTransactionParams().do();

  const txn =
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: address,
      receiver: address,
      amount: 0,
      assetIndex: USDC_ASA_ID,
      suggestedParams: params,
    });

  console.log("Preparing canonical Algorand signing bytes...");

 const signingBytes = txn.bytesToSign();
  console.log("Signing with Pera/XHD Peikert signer...");

  const signature = await xhd.signAlgoTransaction(
    rootKey,
    KeyContext.Address,
    0,
    0,
    signingBytes,
    BIP32DerivationType.Peikert
  );

const signedTxn = new algosdk.SignedTransaction({
  txn,
  sig: signature,
});

const prepared =
  signedTxn
    .getEncodingSchema()
    .prepareMsgpack(signedTxn.toEncodingData());

const signedBytes = algosdk.msgpackRawEncode(prepared);
console.log("Signed transaction created.");
console.log("Signed transaction size:", signedBytes.length);


console.log("Submitting opt-in transaction...");

const result = await algod
  .sendRawTransaction(signedBytes)
  .do();
  console.log("Transaction ID:", result.txid);
  console.log("Waiting for confirmation...");

  await algosdk.waitForConfirmation(
    algod,
    result.txid,
    4
  );

  console.log("\n✅ SUCCESS — payer opted into Testnet USDC.");
}

main().catch((error) => {
  console.error("\nERROR:", error.message);
  process.exit(1);
});
