const { ExactAvmScheme } = require("@x402/avm");
const { x402Client, wrapFetchWithPayment } = require("@x402/fetch");
const { createPeraXhdSigner } = require("./pera-x402-signer");

const ALGORAND_TESTNET_CAIP2 =
  "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";

async function main() {
  console.log("Creating Pera/XHD signer...");

  const signer = await createPeraXhdSigner();

  console.log("Payer:", signer.address);

  const avmScheme = new ExactAvmScheme(signer);

  const client = new x402Client();

  client.register(ALGORAND_TESTNET_CAIP2, avmScheme);

  const paidFetch = wrapFetchWithPayment(fetch, client);

  console.log("Calling paid task acceptance API...");

  const response = await paidFetch(
    "http://localhost:3000/api/tasks/10/accept",
    {
      method: "POST",
      headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.CAMPUS_TOKEN}`,
},
    }
  );

  console.log("HTTP status:", response.status);

  const body = await response.text();

  console.log("Response:", body);

  console.log(
    "PAYMENT-REQUIRED:",
    response.headers.get("PAYMENT-REQUIRED")
  );

  console.log(
    "PAYMENT-RESPONSE:",
    response.headers.get("PAYMENT-RESPONSE")
  );
}

main().catch((error) => {
  console.error("\nERROR:", error);
  process.exit(1);
});
