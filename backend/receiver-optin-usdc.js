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

const USDC_ASA_ID = 10458941;

const ALGOD_URL =
  "https://testnet-api.algonode.cloud";

const EXPECTED_RECEIVER =
  "VQF5PIPVPWL23YPIJHCDTFB6FWLTHRN4GW7FDKLTCGBE4FINYD4TE5O2E4";

async function getRootKey() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const mnemonic = await new Promise((resolve) => {
    rl.question(
      "Enter receiver's 24-word Pera recovery phrase: ",
      resolve
    );
  });

  rl.close();

  const cleanMnemonic = mnemonic.trim();

  if (!bip39.validateMnemonic(cleanMnemonic)) {
    throw new Error("Invalid BIP39 recovery phrase.");
  }

  console.log("\n✅ BIP39 recovery phrase is valid.");

  const seed = await bip39.mnemonicToSeed(
    cleanMnemonic
  );

  return fromSeed(seed);
}

async function main() {
  const algod = new algosdk.Algodv2(
    "",
    ALGOD_URL,
    ""
  );

  // ----------------------------------------
  // 1. Get receiver root key
  // ----------------------------------------

  const rootKey = await getRootKey();

  const xhd = new XHDWalletAPI();

  // ----------------------------------------
  // 2. Derive Pera public key
  // ----------------------------------------

  console.log(
    "\nGenerating receiver key using Pera Peikert..."
  );

  const publicKey = await xhd.keyGen(
    rootKey,
    KeyContext.Address,
    0,
    0,
    BIP32DerivationType.Peikert
  );

  const derivedAddress =
    algosdk.encodeAddress(
      Buffer.from(publicKey)
    );

  console.log("\nExpected receiver:");
  console.log(EXPECTED_RECEIVER);

  console.log("\nDerived receiver:");
  console.log(derivedAddress);

  // ----------------------------------------
  // 3. Verify address
  // ----------------------------------------

  if (derivedAddress !== EXPECTED_RECEIVER) {
    throw new Error(
      `Receiver address mismatch.\n\nExpected: ${EXPECTED_RECEIVER}\nDerived: ${derivedAddress}`
    );
  }

  console.log(
    "\n✅ Receiver address verified."
  );

  // ----------------------------------------
  // 4. Check USDC opt-in
  // ----------------------------------------

  console.log(
    "\nChecking Testnet USDC opt-in status..."
  );

  const accountInfo =
    await algod
      .accountInformation(EXPECTED_RECEIVER)
      .do();

  const existingAsset =
    (accountInfo.assets || []).find(
      (asset) =>
        String(asset.assetId) ===
        String(USDC_ASA_ID)
    );

  if (existingAsset) {
    console.log(
      "\n✅ Receiver is already opted into Testnet USDC."
    );

    console.log(
      "USDC balance:",
      existingAsset.amount
    );

    return;
  }

  console.log(
    "\nReceiver is NOT opted into Testnet USDC."
  );

  // ----------------------------------------
  // 5. Create opt-in transaction
  // ----------------------------------------

  console.log(
    "\nCreating USDC opt-in transaction..."
  );

  const params =
    await algod
      .getTransactionParams()
      .do();

  const txn =
    algosdk
      .makeAssetTransferTxnWithSuggestedParamsFromObject(
        {
          sender: EXPECTED_RECEIVER,
          receiver: EXPECTED_RECEIVER,
          amount: 0,
          assetIndex: USDC_ASA_ID,
          suggestedParams: params,
        }
      );

  // ----------------------------------------
  // 6. Create canonical signing bytes
  // ----------------------------------------

  console.log(
    "\nPreparing canonical Algorand signing bytes..."
  );
  const signingBytes =
  new Uint8Array(txn.bytesToSign());
   
  // ----------------------------------------
  // 7. Sign with the SAME method as payer
  // ----------------------------------------

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

  // ----------------------------------------
  // 8. Verify signature locally
  // ----------------------------------------

  const signatureValid =
    algosdk.verifyBytes(
      signingBytes,
      signature,
      algosdk.decodeAddress(
        EXPECTED_RECEIVER
      ).publicKey
    );

  console.log(
    "Signature verification:",
    signatureValid
  );

  if (!signatureValid) {
    throw new Error(
      "Signature verification failed locally."
    );
  }

  console.log(
    "✅ Signature verified locally."
  );

  // ----------------------------------------
  // 9. Create signed transaction
  // ----------------------------------------

  const signedTxn =
    new algosdk.SignedTransaction({
      txn,
      sig: signature,
    });

  // ----------------------------------------
  // 10. Correct MsgPack encoding
  // ----------------------------------------

  const prepared =
    signedTxn
      .getEncodingSchema()
      .prepareMsgpack(
        signedTxn.toEncodingData()
      );

  const signedBytes =
    algosdk.msgpackRawEncode(
      prepared
    );

  console.log(
    "\nSigned transaction created."
  );

  console.log(
    "Signed transaction size:",
    signedBytes.length
  );

  // ----------------------------------------
  // 11. Submit
  // ----------------------------------------

  console.log(
    "\nSubmitting receiver opt-in transaction..."
  );

  const result =
    await algod
      .sendRawTransaction(
        signedBytes
      )
      .do();

  console.log(
    "Transaction ID:",
    result.txid
  );

  // ----------------------------------------
  // 12. Confirm
  // ----------------------------------------

  console.log(
    "Waiting for confirmation..."
  );

  await algosdk.waitForConfirmation(
    algod,
    result.txid,
    4
  );

  console.log(
    "\n✅ SUCCESS — receiver opted into Testnet USDC."
  );

  console.log(
    "Receiver:",
    EXPECTED_RECEIVER
  );

  console.log(
    "USDC ASA:",
    USDC_ASA_ID
  );

  console.log(
    "Transaction ID:",
    result.txid
  );
}

main().catch((error) => {
  console.error(
    "\nERROR:",
    error.message
  );

  process.exit(1);
});
