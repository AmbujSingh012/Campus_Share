
import { PeraWalletConnect } from "@perawallet/connect";
import algosdk from "algosdk";

const peraWallet = new PeraWalletConnect();

let connectedAddress = null;

export async function connectPeraWallet() {
  try {
    // Reuse an existing Pera session if one exists
    if (peraWallet.isConnected) {
      const accounts = await peraWallet.reconnectSession();

      if (accounts.length > 0) {
        connectedAddress = accounts[0];

        console.log(
          "Pera Wallet reconnected:",
          connectedAddress
        );

        return connectedAddress;
      }
    }

    const accounts = await peraWallet.connect();

    connectedAddress = accounts[0];

    console.log(
      "Pera Wallet connected:",
      connectedAddress
    );

    return connectedAddress;
  } catch (error) {
    console.error(
      "Pera Wallet connection failed:",
      error
    );

    throw error;
  }
}

export async function disconnectPeraWallet() {
  try {
    await peraWallet.disconnect();

    connectedAddress = null;

    console.log("Pera Wallet disconnected");
  } catch (error) {
    console.error(
      "Pera Wallet disconnect failed:",
      error
    );
  }
}

export function getPeraAddress() {
  return connectedAddress;
}

export function createPeraX402Signer() {
  if (!connectedAddress) {
    throw new Error(
      "Pera Wallet is not connected"
    );
  }

  return {
    address: connectedAddress,

    signTransactions: async (
      txns,
      indexesToSign
    ) => {
      console.log(
        "x402 transactions received:",
        txns.length
      );

      /*
       * x402 gives us unsigned Algorand
       * transactions as Uint8Array bytes.
       *
       * Pera expects Algorand transaction
       * objects inside SignerTransaction.
       */

      const txnGroup = txns.map(
        (txnBytes, index) => {
          const txn =
            algosdk.decodeUnsignedTransaction(
              txnBytes
            );

          return {
            txn,
            signers:
              indexesToSign &&
              !indexesToSign.includes(index)
                ? []
                : [connectedAddress],
          };
        }
      );

      console.log(
        "Sending transactions to Pera..."
      );

      const signedTxns =
        await peraWallet.signTransaction(
          [txnGroup]
        );

      let signedIndex = 0;

      return txns.map(
        (_, index) => {
          /*
           * x402 may ask the wallet to sign
           * only specific transaction indexes.
           */
          if (
            indexesToSign &&
            !indexesToSign.includes(index)
          ) {
            return null;
          }

          return (
            signedTxns[signedIndex++] ??
            null
          );
        }
      );
    },
  };
}