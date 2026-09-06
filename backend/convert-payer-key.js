const algosdk = require("algosdk");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter your NEW payer 24-word mnemonic: ", (mnemonic) => {
  try {
    const words = mnemonic.trim().split(/\s+/);

    if (words.length !== 25 && words.length !== 24) {
      throw new Error(`Expected a wallet recovery phrase, got ${words.length} words`);
    }

    const account = algosdk.mnemonicToSecretKey(mnemonic.trim());

    console.log("\nDerived address:");
    console.log(account.addr);

    console.log("\nSecret key length:");
    console.log(account.sk.length);

    const base64Key = Buffer.from(account.sk).toString("base64");

    console.log("\nBase64 key generated successfully.");
    console.log("DO NOT paste this key into chat.");

    if (account.sk.length !== 64) {
      throw new Error(`Unexpected secret-key length: ${account.sk.length}`);
    }

    console.log("\nYour derived address should match:");
    console.log("WCYMR2WSEYORRTHHLIVZZPHUC5M736FH2LVHNQWCH677GCW5GYJO47JSCA");

    if (
      account.addr !==
      "WCYMR2WSEYORRTHHLIVZZPHUC5M736FH2LVHNQWCH677GCW5GYJO47JSCA"
    ) {
      throw new Error("ADDRESS MISMATCH — STOP. This is not the expected payer wallet.");
    }

    const fs = require("fs");
    const envPath = ".env";

    let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

    env = env.replace(/^AVM_PRIVATE_KEY=.*$/m, "");

    env = env.trimEnd() + `\nAVM_PRIVATE_KEY=${base64Key}\n`;

    fs.writeFileSync(envPath, env, { mode: 0o600 });

    console.log("\nAVM_PRIVATE_KEY saved to backend/.env");
    console.log("The mnemonic was NOT saved.");
  } catch (error) {
    console.error("\nERROR:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
});
