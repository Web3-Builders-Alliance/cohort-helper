import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { readFile } from 'fs/promises'

/* 
    Umi plugins

    Whilst Umi is a small zero-dependency framework, it is designed to be extended with 
    plugins. Plugins allow us to not only interact with its interfaces or swap out its 
    interface implementations but also to add new features to Umi itself.

    To install a Umi plugin, you may simply call the use method on the Umi instance.

    To stay consistent, the plugins provided by Umi always follow this pattern even if they 
    don't require any arguments. Here are some examples:

    >> import { web3JsRpc } from '@metaplex-foundation/umi-rpc-web3js';

    >> umi.use(web3JsRpc('https://api.mainnet-beta.solana.com'))

    Want to learn more about Umi plugins? Here you can find all the plugins available:
    https://github.com/metaplex-foundation/umi/tree/main/packages


    For uploading files, we have 3 default plugins available:

    - AWS: import { createAwsUploader } from "@metaplex-foundation/umi-uploader-aws"
    
    - NFT.storage: import { createNftStorageUploader } from "@metaplex-foundation/umi-uploader-nft.storage"
    
    - [Bundlr] now Irys:

*/
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";

import wallet from "./../wallet.json"

// Create a devnet connection
const umi = createUmi('https://api.devnet.solana.com');

/* 

    There is another way to upload files using the Irys uploader.
    
    - Import:
    >> import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"

    - Use the Irys uploader:
    >> umi.use(irysUploader());

    - Upload the files:
    >> const [myUri] = await umi.uploader.upload([image]);

*/
umi.use(irysUploader());

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const myKeypairSigner = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(myKeypairSigner));

(async () => {
    try {

    /* 

        We start by using the readFile function to read the image file from the filesystem
        and transfor it to a buffer that we can use to create a generic file later.

        After having our file as buffer, we can use the createGenericFile function to create
        a Generfile object that we can use to upload the file.

        export type GenericFile = {
            readonly buffer: Uint8Array;
            readonly fileName: string;
            readonly displayName: string;
            readonly uniqueName: string;
            readonly contentType: string | null;
            readonly extension: string | null;
            readonly tags: GenericFileTag[];
        };

        Ater that, we can use the uploader to upload the file and get the URI.

    */

        // Use the absolute path
        const image = await readFile('./images/generug.png');
        const nft_image = createGenericFile(image, "generug")

        const [myUri] = await umi.uploader.upload([nft_image]);

        console.log(myUri);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();