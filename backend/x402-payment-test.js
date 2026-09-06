const { ExactAvmScheme } = require("@x402/avm");
const { x402Client } = require("@x402/fetch");
const { wrapFetchWithPayment } = require("@x402/fetch");
const ALGORAND_TESTNET_CAIP2 =
  "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";
const { createPeraXhdSigner } = require("./pera-x402-signer");

async function main() {
  console.log("Creating Pera/XHD signer...");
  const signer = await createPeraXhdSigner();

  console.log("Payer:", signer.address);

  const avmScheme = new ExactAvmScheme(signer);

  const client = new x402Client();

  client.register(ALGORAND_TESTNET_CAIP2, avmScheme);

  const paidFetch = wrapFetchWithPayment(fetch, client);

  console.log("Calling premium API...");
  
  const response = await paidFetch(
    "http://localhost:3000/api/premium"
  );

  console.log("HTTP status:", response.status);

  const body = await response.text();
  console.log("Response:", body);
console.log("PAYMENT-REQUIRED:", response.headers.get("PAYMENT-REQUIRED"));
console.log("PAYMENT-RESPONSE:", response.headers.get("PAYMENT-RESPONSE"));
  const paymentResponse = response.headers.get("PAYMENT-RESPONSE");

  if (paymentResponse) {
    console.log("Payment response received.");
  }
}

main().catch((error) => {
  console.error("\nERROR:", error);
  process.exit(1);
});
