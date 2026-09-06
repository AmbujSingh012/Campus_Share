const readline = require("readline");
const bip39 = require("bip39");
const algosdk = require("algosdk");

const {
  fromSeed,
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

rl.question("Enter phrase: ", async (phrase) => {
  try {
    phrase = phrase.trim();

    if (!bip39.validateMnemonic(phrase)) {
      throw new Error("Invalid BIP39 phrase");
    }

    const seed = bip39.mnemonicToSeedSync(phrase);
    const rootKey = fromSeed(seed);
    const wallet = new XHDWalletAPI();

    const publicKey = await wallet.keyGen(
      rootKey,
      KeyContext.Address,
      0,
      0,
      BIP32DerivationType.Peikert
    );

    const address = algosdk.encodeAddress(Buffer.from(publicKey));

    console.log("\nDerived address:");
    console.log(address);

    console.log("\nMatches payer:");
    console.log(address === EXPECTED);

  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    rl.close();
  }
});
