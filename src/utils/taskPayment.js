import { PeraWalletConnect } from "@perawallet/connect";
import algosdk from "algosdk";

const ALGOD_SERVER = "https://testnet-api.algonode.cloud";
const ALGOD_PORT = "";
const ALGOD_TOKEN = "";

const USDC_ASSET_ID = 10458941;
const USDC_DECIMALS = 6;

const peraWallet = new PeraWalletConnect({
  chainId: 416002,
});

const algodClient = new algosdk.Algodv2(
  ALGOD_TOKEN,
  ALGOD_SERVER,
  ALGOD_PORT
);

let connectedAddress = null;

export async function connectTaskPaymentWallet() {
  try {
    let accounts = [];

    try {
      accounts = await peraWallet.reconnectSession();
    } catch (error) {
      console.log("No existing Pera session.");
    }

    if (!accounts || accounts.length === 0) {
      accounts = await peraWallet.connect();
    }

    if (!accounts || accounts.length === 0) {
      throw new Error("No Pera Wallet account connected.");
    }

    connectedAddress = accounts[0];

    console.log(
      "Payment wallet connected:",
      connectedAddress
    );

    return connectedAddress;
  } catch (error) {
    console.error(
      "Payment wallet connection error:",
      error
    );

    throw error;
  }
}

export function getTaskPaymentWalletAddress() {
  return connectedAddress;
}

export async function payHelper({
  ownerAddress,
  helperAddress,
  reward,
}) {
  console.log("========== PAYMENT DEBUG ==========");

  console.log("Owner address:", ownerAddress);
  console.log("Helper address:", helperAddress);
  console.log("Reward:", reward);
  console.log(
    "Connected wallet:",
    connectedAddress
  );

  if (!ownerAddress) {
    throw new Error(
      "Task owner wallet address is missing."
    );
  }

  if (!helperAddress) {
    throw new Error(
      "Helper wallet address is missing."
    );
  }

  if (!reward || Number(reward) <= 0) {
    throw new Error("Invalid task reward.");
  }

  // Make sure owner's wallet is connected.
  if (connectedAddress !== ownerAddress) {
    await connectTaskPaymentWallet();
  }

  if (connectedAddress !== ownerAddress) {
    throw new Error(
      "Please connect the task owner's Pera Wallet."
    );
  }

  // Validate addresses before creating transaction.
  try {
    algosdk.decodeAddress(ownerAddress);
    algosdk.decodeAddress(helperAddress);
  } catch (error) {
    console.error(
      "Wallet address validation error:",
      error
    );

    throw new Error(
      "Owner or helper wallet address is invalid."
    );
  }

  const amount = Math.round(
    Number(reward) * 10 ** USDC_DECIMALS
  );

  if (amount <= 0) {
    throw new Error(
      "Payment amount must be greater than zero."
    );
  }

  console.log("USDC asset ID:", USDC_ASSET_ID);
  console.log("USDC base-unit amount:", amount);

  // Get Algorand Testnet transaction parameters.
  const suggestedParams =
    await algodClient
      .getTransactionParams()
      .do();

  console.log(
    "Suggested transaction parameters received."
  );

  // IMPORTANT:
  // Algorand SDK expects sender and receiver.
  const txn =
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(
      {
        sender: ownerAddress,
        receiver: helperAddress,
        amount: amount,
        assetIndex: USDC_ASSET_ID,
        suggestedParams: suggestedParams,
      }
    );

  console.log(
    "USDC transaction created successfully."
  );

  console.log(
    "Opening Pera Wallet for signing..."
  );

  const signedTransactions =
    await peraWallet.signTransaction([
      [
        {
          txn: txn,
          signers: [ownerAddress],
        },
      ],
    ]);

  if (
    !signedTransactions ||
    signedTransactions.length === 0 ||
    !signedTransactions[0]
  ) {
    throw new Error(
      "Transaction was not signed."
    );
  }

  console.log(
    "Transaction signed successfully."
  );

  const response =
    await algodClient
      .sendRawTransaction(
        signedTransactions[0]
      )
      .do();

  const transactionId = response.txid;

  console.log(
    "Transaction submitted:",
    transactionId
  );

  await algosdk.waitForConfirmation(
    algodClient,
    transactionId,
    4
  );

  console.log(
    "Transaction confirmed:",
    transactionId
  );

  return {
    transactionId: transactionId,
    amount: Number(reward),
    assetId: USDC_ASSET_ID,
    network: "Algorand Testnet",
    from: ownerAddress,
    to: helperAddress,
  };
}