import wallet from "../wba-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"

// Create a devnet connection
const umi = createUmi('https://api.devnet.solana.com');

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader()).use(signerIdentity(signer));

(async () => {

    /* 

        To display off-chain metadata of tokens, the on-chain struct needs to contain a URI as described above, 
        which will allow wallets to find it: https://docs.metaplex.com/programs/token-metadata/changelog/v1.0#uri-json-schema

    */
   
    const metadata = {
        name: "name",
        symbol: "SYMM",
        description: "description",
        image: "image-uri",
        attributes: [
            {trait_type: 'trait', value: 'value'},
            {trait_type: 'trait', value: 'value'},
            {trait_type: 'trait', value: 'value'},
        ],
        properties: {
            files: [
                {
                    type: "image/png",
                    uri: "image-uri",
                },
            ],
            creators: [
                {
                    address: keypair.publicKey,
                    share: 100
                }
            ]
        },
        creators: [
            {
                address: keypair.publicKey,
                share: 100
            }
        ]
    };
    const myUri = await umi.uploader.uploadJson(metadata);
    console.log("Your image URI: ", myUri);
})();