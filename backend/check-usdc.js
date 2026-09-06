const algosdk = require("algosdk");

const client = new algosdk.Algodv2(
  "",
  "https://testnet-api.algonode.cloud",
  ""
);

const payer =
  "46FHLYQHVYYBE7MU4V4LX4PTRRYHT36GFGSDUH6VOP46UY363FZWXPJZ7M";

const USDC = 10458941;

client
  .accountInformation(payer)
  .do()
  .then((account) => {
    const asset = account.assets?.find(
  (a) => Number(a.assetId) === USDC
);

    console.log("USDC opted in:", !!asset);
    console.log(
  "USDC raw balance:",
  asset ? Number(asset.amount) : 0
);
  })
  .catch((error) => {
    console.error("ERROR:", error.message);
  });
