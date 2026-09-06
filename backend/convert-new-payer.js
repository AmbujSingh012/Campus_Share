const fs = require("fs");
const readline = require("readline");
const bip39 = require("bip39");
const algosdk = require("algosdk");

const {
  fromSeed,
  XHDWalletAPI,
  KeyContext,
  BIP32DerivationType,
} = require("@algorandfoundation/xhd-wallet-api");

const EXPECTED_PAYER =
  "46FHLYQHVYYBE7MU4V4LX4PTRRYHT36GFGSDUH6VOP46UY363FZWXPJZ7M";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter NEW payer 24-word phrase: ", async (mnemonic) => {
  try {
    mnemonic = mnemonic.trim();

    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error("Invalid BIP39 recovery phrase");
    }

    console.log("Deriving payer wallet locally...");

    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const rootKey = fromSeed(seed);
    const wallet = new XHDWalletAPI();

    const extendedPrivateKey = await wallet.deriveKey(
      rootKey,
      [
        0x80000000 + 44,
        0x80000000 + 283,
        0x80000000 + 0,
        0,
        0,
      ],
      true,
      BIP32DerivationType.Peikert
    );

    const seed32 = Buffer.from(extendedPrivateKey.slice(0, 32));

    const publicKey = Buffer.from(
      await wallet.keyGen(
        rootKey,
        KeyContext.Address,
        0,
        0,
        BIP32DerivationType.Peikert
      )
    );

    const secretKey64 = Buffer.concat([seed32, publicKey]);

    if (secretKey64.length !== 64) {
      throw new Error(`Unexpected key length: ${secretKey64.length}`);
    }

    const derivedAddress = algosdk.encodeAddress(publicKey);

    console.log("Derived payer address:");
    console.log(derivedAddress);

    if (derivedAddress !== EXPECTED_PAYER) {
      throw new Error("ADDRESS MISMATCH — STOP");
    }

    const base64Key = secretKey64.toString("base64");

    let env = fs.existsSync(".env")
      ? fs.readFileSync(".env", "utf8")
      : "";

    env = env
      .split("\n")
      .filter((line) => !line.startsWith("AVM_PRIVATE_KEY="))
      .join("\n")
      .trimEnd();

    env += `\nAVM_PRIVATE_KEY=${base64Key}\n`;

    fs.writeFileSync(".env", env, { mode: 0o600 });

    console.log("\nSUCCESS");
    console.log("AVM_PRIVATE_KEY saved to .env");
    console.log("Recovery phrase was NOT saved.");
  } catch (error) {
    console.error("\nERROR:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
});
