const bip39 = require("bip39");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Enter phrase: ", (phrase) => {
  const words = phrase.trim().toLowerCase().split(/\s+/);

  console.log("Word count:", words.length);

  const invalidPositions = [];

  words.forEach((word, index) => {
    if (bip39.wordlists.english.indexOf(word) === -1) {
      invalidPositions.push(index + 1);
    }
  });

  console.log("Invalid word position(s):", invalidPositions);
  console.log("BIP39 valid:", bip39.validateMnemonic(phrase.trim()));

  rl.close();
});
