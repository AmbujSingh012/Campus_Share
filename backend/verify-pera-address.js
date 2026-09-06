const readline = require("readline");
const bip39 = require("bip39");
const { fromSeed } = require("@algorandfoundation/xhd-wallet-api");
const {
  XHDWalletAPI,
  KeyContext,
  BIP32DerivationType,
} = require("@algorandfoundation/xhd-wallet-api");

const EXPECTED =
  "46FHLYQHVYYBE7MU4V4LX4PTRRYHT36GFGSDUH6VOP46UY363FZWXPJZ7M";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter your 24-word Pera recovery phrase: ", async (mnemonic) => {
  try {
    if (!bip39.validateMnemonic(mnemonic.trim())) {
      throw new Error("Invalid BIP39 mnemonic.");
    }

    const seed = await bip39.mnemonicToSeed(mnemonic.trim());
    const rootKey = fromSeed(seed);

    const xhd = new XHDWalletAPI();

    const publicKey = await xhd.keyGen(
      rootKey,
      KeyContext.Address,
      0,
      0,
      BIP32DerivationType.Peikert
    );

    const algosdk = require("algosdk");
    const address = algosdk.encodeAddress(Buffer.from(publicKey));

    console.log("\nDerived address:");
    console.log(address);

    console.log("\nExpected payer:");
    console.log(EXPECTED);

    console.log("\nMatches payer:", address === EXPECTED);
  } catch (error) {
    console.error("\nERROR:", error.message);
  } finally {
    rl.close();
  }
});
