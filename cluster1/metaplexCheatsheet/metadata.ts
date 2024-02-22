import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { 
    createMetadataAccountV3, 
    CreateMetadataAccountV3InstructionAccounts, 
    CreateMetadataAccountV3InstructionArgs,
    DataV2Args
} from "@metaplex-foundation/mpl-token-metadata";
import { createSignerFromKeypair, signerIdentity, publicKey } from "@metaplex-foundation/umi";
import { publicKey as publicKeySerializer, string } from '@metaplex-foundation/umi/serializers';

import wallet from "your-wallet-path.json";

/*

    Want to learn more about Umi? Check out the documentation here: 
    https://github.com/metaplex-foundation/umi/blob/main/README.md
    
*/

const RPC_ENDPOINT = "https://api.devnet.solana.com";

/* 

    Connecting with an RPC - Umi provides a RpcInterface that helps us do just that.

    When creating a new Umi instance via the default bundle, you must pass the RPC's 
    endpoint or an instance of @solana/web3.js's Connection class as the first argument. 
    Going forward, this is the endpoint or Connection that will be used every time you 
    call a method on the RPC interface.

    // You can use an explicit Connection instance from web3.js.
    const umi = createUmi(new Connection(RPC_ENDPOINT));

*/

// Or just pass in Pass in your RPC endpoint
const umi = createUmi(RPC_ENDPOINT);

/* 

    The EdDSA interface is used to create keypairs, find PDAs and sign/verify messages 
    using the EdDSA algorithm. We can either use this interface directly and/or use helper 
    methods that delegate to this interface to provide a better developer experience.

    Whilst Umi only relies on the Signer interface to request signatures from a wallet, it also 
    defines a Keypair type and a KeypairSigner type that are explicitly aware of their secret key.

    We can generate new Keypair object with 3 different methods:

    - Generate a new random keypair.
    const myKeypair = umi.eddsa.generateKeypair();

    - Restore a keypair using a seed.
    const myKeypair = umi.eddsa.createKeypairFromSeed(mySeed);

*/

// Restore a keypair using its secret key.
const myKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));

/*

    In order to use these keypairs as signers throughout your application, you can use the 
    createSignerFromKeypair helper method.

    This method will return an instance of KeypairSigner to ensure that we can access the 
    secret key when needed.

*/
const signerKeypair = createSignerFromKeypair(umi, myKeypair);

/*

    The Umi interface stores two instances of Signer: 
    - The identity using the app  
    - The payer paying for transaction and storage fees. 
    
    Umi provides plugins to quickly assign new signers to these attributes. 

    - umi.use(signerIdentity(mySigner)); == [umi.identity = mySigner && umi.payer = mySigner]
    - umi.use(signerIdentity(mySigner, false)) == [umi.identity = mySigner]
    - umi.use(signerPayer(mySigner)) == [umi.payer = mySigner]

*/

// The signerIdentity method will also update the payer attribute since, in most cases, the identity is also the payer.
umi.use(signerIdentity(signerKeypair));

/*

    In Umi, a public key is a simple base58 string representing a 32-byte array. We use an opaque 
    type to tell TypeScript that the given public key has been verified and is valid. We also use 
    a type parameter to offer more granular type safety.

    We can generate a new valid public key with 3 different methods:

    - From a 32-byte buffer.
    publicKey(new Uint8Array(32));

    - From a PublicKey or Signer type.
    publicKey(someWallet as PublicKey | Signer);
    
    [Note: if the provided input cannot be converted to a valid public key, an error will be thrown]

*/

// From a base58 string.
const mint =  publicKey('BvrY7utmPBGFwQQhdJkKHfziorchVm82GYTrSxoVjfjz')
const tokenMetadataProgramId = publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

/*

    A PDA — or Program-Derived Address — is a public key that is derived from a program ID and an array of 
    predefined seeds. A bump number ranging from 0 to 255 is required to ensure the PDA does not live on the 
    EdDSA elliptic curve and therefore does not conflict with cryptographically generated public keys.

    In Umi, PDAs are represented as a tuple composed of the derived public key and the bump number.
    Similarly to public keys, it uses opaque types and type parameters.

    [Note: publicKeySerializer is in reality publicKey from '@metaplex-foundation/umi/serializers']

*/

// Each seed must be serialized as a Uint8Array
const seeds = [string({ size: 'variable' }).serialize('metadata'),
  publicKeySerializer().serialize(tokenMetadataProgramId),
  publicKeySerializer().serialize(mint),
];

//To derive a new PDA, we can use the findPda method of the EdDSA interface.
const metadata_pda = umi.eddsa.findPda(tokenMetadataProgramId, seeds);

(async () => {

    /*

        createMetadataAccountV3: This method is used to create a new metadata account for a given mint.

        createMetadataAccountV3(
            context: umi
            input: {
                CreateMetadataAccountV3InstructionAccounts 
                CreateMetadataAccountV3InstructionArgs [== CreateMetadataAccountV3InstructionDataArgs]
            }
        )

        export type CreateMetadataAccountV3InstructionAccounts = {
            metadata?: PublicKey | Pda;                                 [?] Metadata key (pda of ['metadata', program id, mint id])
            mint: PublicKey | Pda;                                      Mint of token asset           
            mintAuthority: Signer;                                      Mint authority
            payer?: Signer;                                             [?] Payer - we need to pass it in only if we want a different payer/we didn't use the signerIdentity method
            updateAuthority?: PublicKey | Pda | Signer;                 [?] Update authority info
            systemProgram?: PublicKey | Pda;                            [?] System program
            rent?: PublicKey | Pda;                                     [?] Rent info
        }

        export type CreateMetadataAccountV3InstructionDataArgs = {
            data: DataV2Args;
            isMutable: boolean;
            collectionDetails: OptionOrNullable<CollectionDetailsArgs>;
        };

        export type DataV2 = {
            name: string;
            symbol: string;
            uri: string;
            sellerFeeBasisPoints: number;
            creators: Option<Array<Creator>>;
            collection: Option<Collection>;
            uses: Option<Uses>;
        };

    */

    // Compatct Version
    let tx = createMetadataAccountV3(
        umi,
        {
            mint: mint,
            mintAuthority: signerKeypair,
            data: {
                name: "LEO",
                symbol: "TST",
                uri: "https://arweave.net/euAlBrhc3NQJ5Q-oJnP10vsQFjTV7E9CgHZcVm8cogo",
                sellerFeeBasisPoints: 1000,
                creators: [
                    {address: myKeypair.publicKey, verified: true, share: 100 }
                ],
                collection: null,
                uses: null,
            },
            isMutable: true,
            collectionDetails: null,
        }
    );


    // // Expanded Version
    // let accounts: CreateMetadataAccountV3InstructionAccounts = {
    //     mint,
    //     mintAuthority: signerKeypair
    // }

    // let data: DataV2Args = {
    //     name: "Test",
    //     symbol: "TST",
    //     uri: "",
    //     sellerFeeBasisPoints: 0,
    //     creators: null,
    //     collection: null,
    //     uses: null
    // }

    // let args: CreateMetadataAccountV3InstructionArgs = {
    //     data,
    //     isMutable: true,
    //     collectionDetails: null
    // }

    // let tx = createMetadataAccountV3(
    //     umi,
    //     {
    //         ...accounts,
    //         ...args
    //     }
    // )

    /*

        One way to send Transactio is to use the sendTransaction and confirmTransaction methods of the RpcInterface. 
        When confirming the transaction, we have to provide a confirm strategy which can be of type blockhash or durableNonce, 
        each of them requiring a different set of parameters. Here's how we would send and confirm a transaction using the blockhash strategy.

        const signedTransaction = await builder.buildAndSign(umi);
        const signature = await umi.rpc.sendTransaction(signedTransaction);
        const confirmResult = await umi.rpc.confirmTransaction(signature, {
            strategy: { type: 'blockhash', ...(await umi.rpc.getLatestBlockhash()) }
        });

        Since this is a very common task, Umi provides helper methods on the transaction builder to do this for us. 
        That way, the code above can be rewritten as follows:

        const confirmResult = await builder.sendAndConfirm(umi);

    */

    let result = await tx.sendAndConfirm(umi);

    /*

        The transaction factory interface can also be used to serialize and deserialize transactions and their messages.

        const mySerializedTransaction = umi.transactions.serialize(myTransaction);
        const myTransaction = umi.transactions.deserialize(mySerializedTransaction);
        const mySerializedMessage = umi.transactions.serializeMessage(myMessage);
        const myMessage = umi.transactions.deserializeMessage(mySerializedMessage);

    */
    const signature = umi.transactions.deserialize(result.signature);
    console.log(`Succesfully Minted!. Transaction Here: https://explorer.solana.com/tx/${tx}?cluster=devnet`)

})();