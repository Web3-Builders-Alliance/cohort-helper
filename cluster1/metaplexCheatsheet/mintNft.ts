import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createSignerFromKeypair, signerIdentity, generateSigner, percentAmount } from "@metaplex-foundation/umi"
import { createNft, createProgrammableNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { base58 } from "@metaplex-foundation/umi/serializers";

import wallet from "../wallet/wba-wallet.json"

const RPC_ENDPOINT = "https://api.devnet.solana.com";
const umi = createUmi(RPC_ENDPOINT);

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const myKeypairSigner = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(myKeypairSigner));
umi.use(mplTokenMetadata())

const name = "Nft-Name";
const uri = "Uri"
const mint = generateSigner(umi);
const sellerFeeBasisPoints = percentAmount(0, 2);

(async () => {

    /*
        createNft: Create a new NFT

        createNft(
            context: umi,                                         
            input: CreateV1InstructionAccounts & CreateV1InstructionArgs
        ): TransactionBuilder                                         => TransactionBuilder

        export type CreateV1InstructionArgs = {
            metadata: PublicKey | Pda;                             [?] Unallocated metadata account with address as pda of ['metadata', program id, mint id]
            masterEdition: PublicKey | Pda;                        [?] Unallocated edition account with address as pda of ['metadata', program id, mint, 'edition']
            mint: PublicKey | Pda | Signer;                        [?] Mint of token asset
            authority: Signer;                                     [?] Mint authority
            payer: Signer;                                         [?] Payer
            updateAuthority: PublicKey | Pda | Signer;             [?] Update authority for the metadata account
            systemProgram: PublicKey | Pda;                        [?] System program
            sysvarInstructions: PublicKey | Pda;                   [?] Instructions sysvar account
            splTokenProgram: PublicKey | Pda;                      [?] SPL Token program
        };

        export type CreateV1InstructionArgs => CreateV1InstructionDataArgs + CreateV1InstructionExtraArgs

        export type CreateV1InstructionDataArgs = {
            name: string;
            symbol?: string;
            uri: string;
            sellerFeeBasisPoints: Amount<'%', 2>;
            creators: OptionOrNullable<Array<CreatorArgs>>;
            primarySaleHappened?: boolean;
            isMutable?: boolean;
            tokenStandard: TokenStandardArgs;
            collection?: OptionOrNullable<CollectionArgs>;
            uses?: OptionOrNullable<UsesArgs>;
            collectionDetails?: OptionOrNullable<CollectionDetailsArgs>;
            ruleSet?: OptionOrNullable<PublicKey>;
            decimals?: OptionOrNullable<number>;
            printSupply?: OptionOrNullable<PrintSupplyArgs>;
        };

        export type CreateV1InstructionExtraArgs = {
            isCollection: boolean;
        };

    */
    let tx = createNft(
        umi, 
        {
          mint,
          name,
          uri,
          sellerFeeBasisPoints,
        },
    )

    let result = await tx.sendAndConfirm(umi);
    const signature = base58.deserialize(result.signature);
    
    console.log(`Succesfully Minted!. Transaction Here: https://solana.fm/tx/${signature[0]}?cluster=devnet`)
})();