# Solana Cluster 1 - Umi Module Overview

In this lesson, we are going to learn how to use @metaplex-foundation/umi for Solana blockchain interactions. 

Umi is a modular framework for building and using JavaScript clients for Solana programs. It provides a zero-dependency library that defines a set of core interfaces that libraries can rely on without being tied to a specific implementation.

Further insights and resources are available at the Umi GitHub repository: [Explore Umi on GitHub](https://github.com/metaplex-foundation/umi).

### Umi's Interfaces:

The framework introduces several core interfaces, each designed to interact with the Solana blockchain:

- **Signer**: An interface representing a wallet that can sign transactions and messages.
- **EddsaInterface**: An interface to create keypairs, find PDAs and sign/verify messages using the EdDSA algorithm.
- **RpcInterface**: An interface representing a Solana RPC client.
- **TransactionFactoryInterface**: An interface allowing us to create and serialize transactions.
- **UploaderInterface**: An interface allowing us to upload files and get a URI to access them.
- **DownloaderInterface**: An interface allowing us to download files from a given URI.
- **HttpInterface**: An interface allowing us to send HTTP requests.
- **ProgramRepositoryInterface**: An interface for registering and retrieving programs

The interfaces above are all defined in a `Context` interface that can be used to inject them in your code. The `Context` type is defined as follows:

```ts
interface Context {
  downloader: DownloaderInterface;
  eddsa: EddsaInterface;
  http: HttpInterface;
  identity: Signer;
  payer: Signer;
  programs: ProgramRepositoryInterface;
  rpc: RpcInterface;
  transactions: TransactionFactoryInterface;
  uploader: UploaderInterface;
};
```

Key aspects of the `Context` include:

- `identity` which is the signer using your app.
- `payer` which is the signer paying for things like transaction fees and storage fees. Usually this will be the same signer as the `identity` but separating them offers more flexibility for apps – e.g. in case they wish to abstract some costs from their users to improve the user experience.

The `Umi` interface is built on top of this `Context` interface and simply adds a `use` method which enables end-users to register plugins. It is defined as follows:

```ts
interface Umi extends Context {
  use(plugin: UmiPlugin): Umi;
}
```

### Publickeys and Signers:

Umi uses the EdDSA interface to create keypairs, find PDAs and sign/verify messages using the EdDSA algorithm. We can either use this interface directly and/or use helper methods that delegate to this interface to provide a better developer experience.

**Publickey**
We can create a new valid public key from a variety of inputs using the `publicKey` helper method. If the provided input cannot be converted to a valid public key, an error will be thrown.

```ts
// From a base58 string.
publicKey('LEoisCg1FTs89a32VSrFskYDgiRbNQzct1WxyZb7nuA');

// From a 32-byte buffer.
publicKey(new Uint8Array(32));

// From a PublicKey or Signer type.
publicKey(someWallet as PublicKey | Signer);
```

**PDAs**
In Umi, `PDAs` are represented as a tuple composed of the derived public key and the bump number. Similarly to public keys, it uses opaque types and type parameters.

To derive a new PDA, we can use the `findPda` method of the EdDSA interface.

```ts
const pda = umi.eddsa.findPda(programId, seeds);
```

Each seed must be serialized as a `Uint8Array`. Here is a quick example showing how to find the metadata PDA of a given mint address.

```ts
const tokenMetadataProgramId = publicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const metadata = umi.eddsa.findPda(tokenMetadataProgramId, [
  string({ size: 'variable' }).serialize('metadata'),
  publicKeySerializer().serialize(tokenMetadataProgramId),
  publicKeySerializer().serialize(mint),
]);
```

**Signers**

You may generate a new signer cryptographically using the `generateSigner` helper method. Under the hood, this method uses the `generateKeypair` method of the EdDSA interface as described in the next section.

```ts
const mySigner = generateSigner(umi);
```

As mentioned before, `Umi` interface stores two instances of `Signer`: The `identity` using the app and the `payer` paying for transaction and storage fees. Umi provides plugins to quickly assign new signers to these attributes. 

Note that, by default, the `signerIdentity` method will also update the `payer` attribute since, in most cases, the identity is also the payer.

```ts
umi.use(signerIdentity(mySigner));
// Is equivalent to:
umi.identity = mySigner;
umi.payer = mySigner;

umi.use(signerIdentity(mySigner, false));
// Is equivalent to:
umi.identity = mySigner;

umi.use(signerPayer(mySigner));
// Is equivalent to:
umi.payer = mySigner;
```

You may also use the `generatedSignerIdentity` and `generatedSignerPayer` plugins to generate a new signer and immediately assign it to the `identity` and/or `payer` attributes.

```ts
umi.use(generatedSignerIdentity());
umi.use(generatedSignerPayer());
```

Whilst Umi only relies on the `Signer` interface to request signatures from a wallet, it also defines a `Keypair` type and a `KeypairSigner` type that are explicitly aware of their secret key.

The `generateKeypair`, `createKeypairFromSeed` and `createKeypairFromSecretKey` methods of the EdDSA interface can be used to generate new `Keypair` objects.

```ts
// Generate a new random keypair.
const myKeypair = umi.eddsa.generateKeypair();

// Restore a keypair using a seed.
const myKeypair = umi.eddsa.createKeypairFromSeed(mySeed);

// Restore a keypair using its secret key.
const myKeypair = umi.eddsa.createKeypairFromSecretKey(mySecretKey);
```

In order to use these keypairs as signers throughout your application, you can use the `createSignerFromKeypair` helper method. This method will return an instance of `KeypairSigner` to ensure that we can access the secret key when needed.

```ts
const myKeypair = umi.eddsa.generateKeypair();
const myKeypairSigner = createSignerFromKeypair(umi, myKeypair);
```

### Sending Transaction

One way to do this is to use the `sendTransaction` and `confirmTransaction` methods of the `RpcInterface` like so. When confirming the transaction, we have to provide a confirm strategy which can be of type `blockhash` or `durableNonce`, each of them requiring a different set of parameters. Here's how we would send and confirm a transaction using the `blockhash` strategy.

```ts
const signedTransaction = await builder.buildAndSign(umi);
const signature = await umi.rpc.sendTransaction(signedTransaction);
const confirmResult = await umi.rpc.confirmTransaction(signature, {
  strategy: { type: 'blockhash', ...(await umi.rpc.getLatestBlockhash()) }
});
```

Since this is a very common task, Umi provides helper methods on the transaction builder to do this for us. That way, the code above can be rewritten as follows.

```ts
const confirmResult = await builder.sendAndConfirm(umi);
```

This will build and sign the transaction using the `buildAndSign` method before sending and confirming the transaction using the `blockhash` strategy by default. It will reuse the transaction blockhash for the confirm strategy to avoid the extra Http request when applicable. That being said, you may still explicitly provide a confirm strategy or set any options like so.

```ts
const confirmResult = await builder.sendAndConfirm(umi, {
  // Send options.
  send: {
    skipPreflight: true,
  },

  // Confirm options.
  confirm: {
    strategy: { type: 'durableNonce', minContextSlot, nonceAccountPubkey, nonceValue },
  }
});
```

Also note that you may send a transaction without waiting for it to be confirmed via the `send` method of the transaction builder.

```ts
const signature = await builder.send(umi);
```

### Uploading Assets

**Generic files**
Because the definition of a file varies between libraries and whether we are in the browser or a Node server, Umi defines a type called `GenericFile` so we can agree on a common type for files.

```ts
type GenericFile = {
  readonly buffer: Uint8Array;
  readonly fileName: string;
  readonly displayName: string;
  readonly uniqueName: string;
  readonly contentType: string | null;
  readonly extension: string | null;
  readonly tags: GenericFileTag[];
};
```

As you can see, its content is stored as a `Uint8Array` buffer and it includes some metadata such as its filename, its display name, its content type, etc. It also includes a simple key-value storage to store any additional data as tags. These can also be used to pass additional information about the file to the uploader.

You can use the `createGenericFile` helper function to create a new `GenericFile` instance from its content and filename. To help us convert a file from a specific environment to and from a `GenericFile`, Umi also provides some additional helper methods.

```ts
// Create a generic file directly.
createGenericFile('some content', 'my-file.txt');

// Parse a generic file to and from a browser file.
await createGenericFileFromBrowserFile(myBrowserFile);
createBrowserFileFromGenericFile(myGenericFile);

// Parse a generic file to and from a JSON object.
createGenericFileFromJson(myJson);
parseJsonFromGenericFile(myGenericFile);
```

**The uploader interface**
First and foremost, the `UploaderInterface` provides an `upload` method that can be used to upload one or several files at once. It returns an array of URIs that represent the uploaded files in the order in which they were passed.

```ts
const [myUri, myOtherUri] = await umi.uploader.upload([myFile, myOtherFile]);
```

The `UploaderInterface` also provides a `uploadJson` method that converts a JSON object into a file and uploads it.

```ts
const myUri = await umi.uploader.uploadJson({ name: 'John', age: 42 });
```

Finally, if an uploader charges an amount to store a set of files, you may find out how much it will cost by using the `getUploadPrice` method. It will return a custom `Amount` object which can be in any currency and unit.

```ts
const price = await umi.uploader.getUploadPrice(myFiles);
```