
import { PeraWalletConnect } from "@perawallet/connect";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm";
import algosdk from "algosdk";
const ALGORAND_TESTNET_CAIP2 =
  "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";

const peraWallet = new PeraWalletConnect({
  chainId: 416002,
});

let connectedAddress = null;

export async function connectPeraWallet() {
  const accounts = await peraWallet.connect();

  if (!accounts || accounts.length === 0) {
    throw new Error("No Pera Wallet account connected");
  }

  connectedAddress = accounts[0];

  return connectedAddress;
}

export async function reconnectPeraWallet() {
  try {
    const accounts =
      await peraWallet.reconnectSession();

    if (accounts && accounts.length > 0) {
      connectedAddress = accounts[0];
      return accounts[0];
    }

    return null;
  } catch (error) {
    console.error(
      "Pera reconnect error:",
      error
    );

    return null;
  }
}

export function getPeraAddress() {
  return connectedAddress;
}

export async function disconnectPeraWallet() {
  try {
    await peraWallet.disconnect();
    connectedAddress = null;
  } catch (error) {
    console.error(
      "Pera disconnect error:",
      error
    );
  }
}

export async function createX402PaidFetch() {
  if (!connectedAddress) {
    await reconnectPeraWallet();
  }

  if (!connectedAddress) {
    throw new Error(
      "Please connect Pera Wallet first"
    );
  }

  const signer = {
    address: connectedAddress,

    signTransactions: async (
      txns,
      indexesToSign
    ) => {
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

    const signerTransactions = txns.map(
  (txnBytes, index) => ({
    txn:
      algosdk.decodeUnsignedTransaction(
        txnBytes
      ),
    signers: indexes.includes(index)
      ? [connectedAddress]
      : [],
  })
);

      const signedTxns =
        await peraWallet.signTransaction([
          signerTransactions,
        ]);

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

  const client = new x402Client();

  const avmScheme =
    new ExactAvmScheme(signer);

  client.register(
    ALGORAND_TESTNET_CAIP2,
    avmScheme
  );

  return wrapFetchWithPayment(
    fetch,
    client
  );
}

export { peraWallet };