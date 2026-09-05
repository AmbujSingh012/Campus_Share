# CampusShare — Member 3 — Day 1
## Algorand Testnet / LoRA Setup

This repository contains the complete, reproducible Day 1 implementation for Member 3.

### Day 1 requirement
- Understand Algorand Testnet / LoRA.
- Create a Testnet payer account.
- Create a Testnet receiver account.
- Arrange Testnet funds.
- Verify the accounts and record the funding transaction.

### Important
Blockchain account addresses, balances and transaction IDs are live values. They must be generated/funded on the Algorand Testnet and must not be fabricated.

This package therefore provides the complete implementation and verification workflow without storing private keys or pretending that a live transaction occurred.

## Project structure

```text
CampusShare_Member3_Day1/
├── README.md
├── requirements.txt
├── .env.example
├── src/
│   ├── create_accounts.py
│   ├── verify_accounts.py
│   └── send_test_transaction.py
└── docs/
    └── evidence.md
```

## Setup

### 1. Install dependencies

```bash
python -m pip install -r requirements.txt
```

### 2. Create two Testnet accounts

```bash
python src/create_accounts.py
```

The script prints the payer and receiver public addresses and writes a local `.env` file containing only public addresses.

**Never commit a mnemonic/private key to GitHub.**

### 3. Fund the payer account

Use an Algorand Testnet dispenser/faucet to send Testnet ALGO to the payer address printed by the script.

Record:
- payer address
- amount funded
- funding transaction ID
- date/time
- payer balance

### 4. Verify both accounts

```bash
python src/verify_accounts.py
```

The script checks that both addresses exist on Testnet and prints their balances.

### 5. Send a small Testnet transaction

After the payer has sufficient Testnet ALGO:

```bash
python src/send_test_transaction.py
```

The script sends a small amount from payer to receiver and prints the transaction ID.

### 6. Final verification

Run:

```bash
python src/verify_accounts.py
```

Confirm that the payer balance decreased by the transfer plus fee and the receiver balance increased.

## Security

- Do not commit `.env`.
- Do not commit mnemonics.
- Do not commit private keys.
- Only public blockchain addresses and transaction IDs may be placed in `docs/evidence.md`.

## Day 1 completion standard

Day 1 is genuinely complete when:
- [x] Algorand/Testnet concepts are documented.
- [x] Reproducible account-generation code is present.
- [x] Reproducible account-verification code is present.
- [x] Reproducible Testnet transfer code is present.
- [ ] A real Testnet funding transaction has been performed.
- [ ] The real funding transaction ID has been recorded.
- [ ] Live balances have been verified.

The final three items require an actual live Testnet interaction and cannot honestly be pre-filled with invented blockchain data.
