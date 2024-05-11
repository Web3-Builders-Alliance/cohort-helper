# Bonus Lesson - Anchor Overview

In this lesson, we are going to learn how anchor works under the hood.

We'll analyze some of the macros that make Anchor intuitive and easy to use like:
- Accounts
- Constraints
- Macros
- State
- Space 


## Accounts

### Account Types

Anchor supports several account types, each designed for specific use cases:

- **Signer**: Validates that the account signed the transaction without performing other ownership or type checks.
  - **Note**: Access to the underlying account data is not recommended when using this type.

- **Account**: A wrapper around `AccountInfo` that verifies program ownership and deserializes the underlying data into a Rust type.

- **UncheckedAccount**: A clear and explicit wrapper for `AccountInfo` types, emphasizing that no checks are performed.
  - **Note**: Always prefer using `UncheckedAccount` over `AccountInfo` for clarity.

- **Program**: Validates that the account is the specified program.

- **InterfaceAccount**: Validates that the account is one of a specified set of programs.

### Advanced Types

- **Box**: Helps manage accounts that are too large for the stack, which can lead to stack violations.
  - **Example**: `Box<Account<'info, MyBigAccount>>`

- **Option**: Used for optional accounts within the instruction.
  - **Example**: `Option<Account<'info, Escrow>>`
  - **Note**: Pass a null in TypeScript if no account is provided.

### Notes

- **AccountInfo** and **UncheckedAccount** do not implement any checks on the account being passed. Anchor implements safety checks and requires additional documentation for any omissions of checks.
  - Use `/// CHECK: <description>` to describe potential security implications, or the instruction will fail to compile.

## Constraints

Account types simplify many operations but might not cover all security checks needed for a secure program. This is where constraints come in handy.

### Types of Constraints

- **seeds**: Checks that the given account is a PDA derived from the currently executing program, the seeds, and, if provided, the bump.
  - **Syntax**:
    ```rust
    #[account(
        seeds = <seeds>,
        bump or bump = <bump>,
        [?] seeds::program = <programId>
    )]
    ```

- **has_one**: Ensures the target account field on the account matches the key of the same field in the Accounts struct.
  - **Syntax**: `#[account(has_one = <target_account>)]`

- **address**: Checks the account key matches the specified pubkey.
  - **Syntax**: `#[account(address = <expr>)]`

- **owner**: Verifies the account owner matches a given expression.
  - **Syntax**: `#[account(owner = <expr>)]`

### SPL Constraints

- **token**: Used for a token account to check the given token account mint address, authority, and program.
  - **Syntax**:
    ```rust
    #[account(
        token::mint = <target_account>,
        token::authority = <target_account>,
        token::program = <target_account>
    )]
    ```

- **mint**: Used for a mint to check the given mint authority, freeze authority, and decimals.
  - **Syntax**:
    ```rust
    #[account(
        mint::authority = <target_account>,
        mint::decimals = <expr>,
        mint::freeze_authority = <target_account>
    )]
    ```

## Macros

Macros help manage account behaviors and life cycles in an efficient way.

### Key Macros

- **init**: Creates and initializes the account via a CPI to the system program.
  - **Requirements**:
    - Marks the account as mutable.
    - Makes the account rent-exempt unless specified with `rent_exempt = skip`.
    - Requires the `payer` and `space` constraints on the account.
  - **Syntax**: `#[account(init, payer = payer, space = INIT_SPACE)]`

- **init_if_needed**: Similar to `init` but only initializes the account if it does not exist yet.
  - **Note**: Include checks to protect against re-initialization attacks.
  - **Syntax**: `#[account(init_if_needed, payer = payer, space = INIT_SPACE)]`

- **close**: Marks the account as closed at the end of the instruction’s execution and transfers its lamports to the specified account.
  - **Note**: Prevents account revival attacks by setting a special discriminator.
  - **Syntax**: `#[account(mut, close = closer)]`

- **realloc**: Reallocates program account space at the beginning of an instruction.
  - **Note**: Adjusts lamports based on the change in account data length to maintain rent exemption.
  - **Syntax**: `#[account(mut, realloc = <Space>, realloc::payer = <payer>, realloc::zero = <bool>)]`

## State

To define a Data account, use the `#[account]` attribute to specify the owner of the data as the ID of the program. This lets the Account type check that the `AccountInfo` passed into your instruction has its owner field set correctly.

**Example**: `#[account]`

## Space

When initializing a PDA, ensure it has enough lamports to be rent-exempt. The `init` macro handles this, but you must supply the SPACE occupied by the account.

### Implementing Space Trait

Implement the Space trait for your struct using the `INIT_SPACE` constant.

**Example**:

```rust
impl Space for Escrow {
    const INIT_SPACE: usize = 
        8 +  // Discriminator (always 8 bytes for Anchor)
        8 +  // Seed (u64 == 8 bytes)
        32 + // mint_x (Pubkey == 32 bytes)
        32 + // mint_y (Pubkey == 32 bytes)
        8 +  // amount (u64 == 8 bytes)
        1;   // bump (u8 == 1 byte)
}
