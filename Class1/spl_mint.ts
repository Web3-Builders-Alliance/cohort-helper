import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token"

import wallet from "./../wallet.json";

//Connect our WBA Wallet
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection to devnet SOL tokens
const connection = new Connection("https://api.devnet.solana.com", {commitment: "confirmed"});

(async () => {

  const mint = new PublicKey("E6gV5iGu3NjJ58qdRYr6AshB1zhXhx3Yq29bXLjy9oLt")

  // Get the token account of the wallet address, and if it does not exist, create it
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    mint,
    keypair.publicKey
  );

  console.log(`This is your ATA: ${ata.address}!`)

  /*
    
    getOrCreateAssociatedTokenAccount: Retrieve the associated token account, or create it if it doesn't exist

    getOrCreateAssociatedTokenAccount(
      connection: Connection,                                     Connection to use
      payer: Signer,                                              Payer of the transaction and initialization fees
      mint: PublicKey,                                            Mint associated with the account to set or verify
      owner: PublicKey,                                           Owner of the account to set or verify
      allowOwnerOffCurve = false,                                 [?] Allow the owner account to be a PDA (Program Derived Address)
      commitment?: Commitment,                                    [?] Desired level of commitment for querying the state
      confirmOptions?: ConfirmOptions,                            [?] Options for confirming the transaction
      programId = TOKEN_PROGRAM_ID,                               [?] SPL Token program account
      associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID      [?] SPL Associated Token program account
    ): Promise<Account>                                           => Return Address of the new associated token account
  
    export interface Account {
      address: PublicKey;                                          Address of the account
      mint: PublicKey;                                             Mint of this account
      owner: PublicKey;                                            Owner of this account
      amount: bigint;                                              Number of tokens this account holds
      delegate: null | PublicKey;                                  The optional delegate for this account
      delegatedAmount: bigint;                                     The amount of tokens delegated
      isInitialized: boolean;                                      Whether this account is initialized
      isFrozen: boolean;                                           Whether this account is frozen
      isNative: null;                                              If this account is associated with the native mint
    }

  */

  // let keypairAta = getAssociatedTokenAddressSync(mint, keypair.publicKey);

  // const transaction = new Transaction().add(
  //   createAssociatedTokenAccountIdempotentInstruction(
  //     keypair.publicKey,
  //     keypairAta,
  //     keypair.publicKey,
  //     mint,
  //   ),
  // );

  // const txSig = await sendAndConfirmTransaction(connection, transaction, [keypair]);

  // Mint new token to your wallet
  let tx = await mintTo(
    connection,
    keypair,
    mint,
    ata.address,
    keypair.publicKey,
    100000000,
  );

  console.log(`Succesfully Minted!. Transaction Here: https://explorer.solana.com/tx/${tx}?cluster=devnet`)

  /* 

    mintTo: Mint tokens to an account

    mintTo(
      connection: Connection,                                   Connection to use
      payer: Signer,                                            Payer of the transaction fees
      mint: PublicKey,                                          Mint for the account
      destination: PublicKey,                                   Address of the account to mint to
      authority: Signer | PublicKey,                            Minting authority
      amount: number | bigint,                                  Amount to mint
      multiSigners: Signer[] = [],                              Signing accounts if `authority` is a multisig
      confirmOptions?: ConfirmOptions,                          Options for confirming the transaction
      programId = TOKEN_PROGRAM_ID                               SPL Token program account
    ): Promise<TransactionSignature>                            => Return Signature of the confirmed transaction

  */

})();
  