import { Commitment, Connection, Keypair, PublicKey } from "@solana/web3.js"
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";

import wallet from "./../wallet.json";

// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const connection = new Connection("https://api.devnet.solana.com", {commitment: "confirmed"});

// Mint address
const mint = new PublicKey("<mint address>");

// Recipient address
const to = new PublicKey("<receiver address>");

(async () => {
        
    const from_ata = await getOrCreateAssociatedTokenAccount(
        connection,
        keypair,
        mint,
        keypair.publicKey,
    );

    const to_ata = await getOrCreateAssociatedTokenAccount(
        connection,
        keypair,
        mint,
        to,
    );

    const tx = transfer(
        connection,
        keypair,
        from_ata.address,
        to_ata.address,
        keypair.publicKey,
        1000
    );

    console.log(`Succesfully Minted!. Transaction Here: https://explorer.solana.com/tx/${tx}?cluster=devnet`)

    /*
        transfer: Transfer tokens from one account to another

        transfer(
            connection: Connection,                             Connection to use    
            payer: Signer,                                      Payer of the transaction fees
            source: PublicKey,                                  Source account
            destination: PublicKey,                             Destination account
            owner: Signer | PublicKey,                          Owner of the source account
            amount: number | bigint,                            Number of tokens to transfer
            multiSigners: Signer[] = [],                        [?] Signing accounts if `owner` is a multisig
            confirmOptions?: ConfirmOptions,                    [?] Options for confirming the transaction
            programId = TOKEN_PROGRAM_ID                        [?] SPL Token program account
        ): Promise<TransactionSignature>                        => Signature of the confirmed transaction

    */
        
})();