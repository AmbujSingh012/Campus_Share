
import { PeraWalletConnect } from "@perawallet/connect";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm";
import algosdk from "algosdk";

const ALGORAND_TESTNET_CAIP2 =
  "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";

// Pera Wallet - Algorand Testnet
const peraWallet = new PeraWalletConnect({
  chainId: 416002,
});

let connectedAddress = null;

/*
=========================================
CONNECT PERA WALLET
=========================================
*/
export async function connectPeraWallet() {
  try {
    const accounts = await peraWallet.connect();

    if (!accounts || accounts.length === 0) {
      throw new Error("No Pera Wallet account connected");
    }

    connectedAddress = accounts[0];

    console.log("Pera Wallet connected:");
    console.log(connectedAddress);

    return connectedAddress;
  } catch (error) {
    console.error("Pera Wallet connection error:", error);
    throw error;
  }
}

/*
=========================================
RECONNECT PERA WALLET
=========================================
*/
export async function reconnectPeraWallet() {
  try {
    const accounts = await peraWallet.reconnectSession();

    if (accounts && accounts.length > 0) {
      connectedAddress = accounts[0];

      console.log("Pera Wallet reconnected:");
      console.log(connectedAddress);

      return accounts[0];
    }

    return null;
  } catch (error) {
    console.error("Pera reconnect error:", error);
    return null;
  }
}

/*
=========================================
GET CONNECTED WALLET ADDRESS
=========================================
*/
export function getPeraAddress() {
  return connectedAddress;
}

/*
=========================================
DISCONNECT PERA WALLET
=========================================
*/
export async function disconnectPeraWallet() {
  try {
    await peraWallet.disconnect();
    connectedAddress = null;

    console.log("Pera Wallet disconnected");
  } catch (error) {
    console.error("Pera disconnect error:", error);
  }
}

/*
=========================================
CREATE X402 PAID FETCH
=========================================
*/
export async function createX402PaidFetch() {
  // Try to reconnect if address isn't available
  if (!connectedAddress) {
    await reconnectPeraWallet();
  }

  if (!connectedAddress) {
    throw new Error("Please connect Pera Wallet first");
  }

  /*
  =========================================
  X402 SIGNER
  =========================================
  */
  const signer = {
    address: connectedAddress,

    signTransactions: async (txns, indexesToSign) => {
      const indexes =
        indexesToSign ??
        txns.map((_, index) => index);

      console.log(
        "x402 transactions:",
        txns.length
      );

      console.log(
        "x402 indexes to sign:",
        indexes
      );

      /*
      Convert x402 transaction bytes into
      Algorand unsigned transactions.
      */
      const signerTransactions = txns.map(
        (txnBytes, index) => ({
          txn: algosdk.decodeUnsignedTransaction(
            txnBytes
          ),

          signers: indexes.includes(index)
            ? [connectedAddress]
            : [],
        })
      );

      /*
      Ask Pera Wallet to sign.
      */
      const signedTxns =
        await peraWallet.signTransaction([
          signerTransactions,
        ]);

      /*
      Return signatures in the same order.
      */
      let signedIndex = 0;

      return txns.map((_, index) => {
        if (!indexes.includes(index)) {
          return null;
        }

        const signed =
          signedTxns[signedIndex];

        signedIndex++;

        return signed ?? null;
      });
    },
  };

  /*
  =========================================
  CREATE X402 CLIENT
  =========================================
  */
  const client = new x402Client();

  const avmScheme =
    new ExactAvmScheme(signer);

  client.register(
    ALGORAND_TESTNET_CAIP2,
    avmScheme
  );

  /*
  =========================================
  RETURN PAYMENT-ENABLED FETCH
  =========================================
  */
  return wrapFetchWithPayment(
    fetch,
    client
  );
}

/*
=========================================
EXPORT PERA WALLET INSTANCE
=========================================
*/
export { peraWallet };