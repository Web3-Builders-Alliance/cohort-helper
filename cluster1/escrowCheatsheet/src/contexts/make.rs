use anchor_lang::prelude::*;

use anchor_spl::{
    token_interface::{TokenInterface, Mint, TokenAccount, TransferChecked, transfer_checked},
    associated_token::AssociatedToken
};

use crate::state::Escrow;

/*

    Accounts:

    Type of accounts that can be used in anchor:
    - Signer: Type validating that the account signed the transaction. No other ownership or type checks are done. 
    Note: If this is used, one should not try to access the underlying account data.

    - Account: Wrapper around AccountInfo that verifies program ownership and deserializes underlying data into a Rust type.

    - UncheckedAccount: Explicit wrapper for AccountInfo types to emphasize that no checks are performed.
    Note: we should always use this Type instead of AccountInfo cause it's more clear that no checks are performed.

    - Program: Type validating that the account is the given Program.

    - InterfaceAccount: Type validating that the account is one of a set of given Programs.

    [Advanced Type]
    - Box: Boxing accounts can help with accounts that are too large for the stack, leading to stack violations.
    Example: Box<Account<'info, MyBigAccount>>

    - Option: it's used to pass in optional accounts inside the instruction. Example: Option<Account<'info, Escrow>>
    Note: if you don't pass any account, you need to pass a null on typescript.


    NOTE: Two of the Anchor account types, AccountInfo and UncheckedAccount do not implement any checks on the account being passed. 
    Anchor implements safety checks that encourage additional documentation describing why additional checks are not necesssary.
    So we need to use /// CHECK: <description the potential security implication> or the instruction will fail to compile.

*/

/*

    Constraints:

    Account types can do a lot of work for you but they're not dynamic enough to handle all the security checks a secure program requires.
    That's why we use contraint: #[account(constraint = <target_account.key() == Pubkey, ...> @ MyError::MyErrorType)]. That's the most basic
    way to create a constraint, with this stuff we can add a personalized error message to the constraint.

    Type of constraints that can be used in anchor:
    - seeds: Checks that given account is a PDA derived from the currently executing program, the seeds, and if provided, the bump. 
    If not provided, anchor uses the canonical bump. Add seeds::program = <expr> to derive the PDA from a different program than 
    the currently executing one.
    >>  #[account(
            seeds = <seeds>, 
            bump or bump = <bump>,
            [?] seeds::program = <programId>
        )]
    
    - has_one: Checks the target_account field on the account matches the key of the target_account field in the Accounts struct.
    >> #[account(has_one = <target_account>)]

    - address: Checks the account key matches the pubkey.
    >> #[account(address = <expr>)]

    - owner: Checks the account owner matches expression.
    >> #[account(owner = <expr>)]

    [SPL Constraints]
    - token: Can be used for a token account to check the given token account mint address, authority and program.
    >>  #[account(
            token::mint = <target_account>, 
            token::authority = <target_account>, 
            token::program = <target_account>)]
        )]

    - mint: Can be used for a mint to check the given mint authority, freeze authoriry and decimals.
    >>  #[account(
            mint::authority = <target_account>, 
            mint::decimals = <expr>, 
            mint::freeze_authority = <target_account>
        )]

*/

/*

    Macros:

    * init: Creates the account via a CPI to the system program and initializes it (sets its account discriminator).
        - Marks the account as mutable and is mutually exclusive with mut.
        - Makes the account rent exempt unless skipped with rent_exempt = skip.
        - Use #[account(zero)] for accounts larger than 10 Kibibyte.
        - Requires the payer constraint to also be on the account.
        - Requires the system program to exist on the struct and be called system_program.
        - Requires that the space constraint is specified. 

    >> #[account(init, payer = payer, space = INIT_SPACE)]

    * init_if_needed: Exact same functionality as the init constraint but only runs if the account does not exist yet.
    Note: When using init_if_needed, you need to make sure you properly protect yourself against re-initialization attacks. 
    You need to include checks in your code that check that the initialized account cannot be reset to its initial settings 
    after the first time it was initialized

    >> #[account(init_if_needed, payer = payer, space = INIT_SPACE)]

    * close: Marks the account as closed at the end of the instruction’s execution (sets its discriminator to the 
    CLOSED_ACCOUNT_DISCRIMINATOR) and sends its lamports to the specified account.
        - Requires mut to exist on the account.
    Note: Setting the discriminator to a special variant makes account revival attacks (where a subsequent instruction 
    adds the rent exemption lamports again) impossible.

    >> #[account(mut, close = closer)]

    * realloc: Used to realloc program account space at the beginning of an instruction.
        - The account must be marked as mut and applied to either Account or AccountLoader types.
    If the change in account data length is additive, lamports will be transferred from the realloc::payer into the program 
    account in order to maintain rent exemption. Likewise, if the change is subtractive, lamports will be transferred from 
    the program account back into the realloc::payer.

    >> #[account(mut, realloc = <Space>, realloc::payer = <payer>, realloc::zero = <bool>)]

*/

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Make<'info> {
    // Signer and Account Section:
    #[account(mut)]
    pub maker: Signer<'info>,
    #[account(
        init,
        payer = maker,
        space = Escrow::INIT_SPACE,
        seeds = [b"escrow", maker.key().as_ref(), seed.to_le_bytes().as_ref()],
        bump,
    )]
    pub escrow: Account<'info, Escrow>,

    // Mint and TokenAccount Section:

    // We need to pass both mint_x and mint_y cause we need to save them in the escrow account
    // or use it to create the different ATA accounts
    pub mint_x: InterfaceAccount<'info, Mint>,
    pub mint_y: InterfaceAccount<'info, Mint>,
    // We need to initialize the vault account with the associated_token_program, it doesn't exist cause
    // we just created the escrow account from where is derived (since it's the authority of the ATA account)
    #[account(
        init,
        payer = maker,
        associated_token::mint = mint_x,
        associated_token::authority = escrow
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    // We already know that this is initialized cause we'll transfer token from it. An ATA cannot be closed
    // if there are still token in that. Needs to be mut since we're going to change the amount of token in it
    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = maker,
    )]
    pub maker_ata_x: InterfaceAccount<'info, TokenAccount>,

    // Program Section:

    // We need to pass the associated_token_program cause we're initializing an ATA (vault_account)
    pub associated_token_program: Program<'info, AssociatedToken>,
    // We need to pass the token_program cause we're using it in the CPI to transfer the deposit amount to the vault 
    pub token_program: Interface<'info, TokenInterface>,
    // We need to pass the system_program cause we're initializing a new account (escrow)
    pub system_program: Program<'info, System>, 
}

impl<'info> Make<'info> {
    fn populate_escrow(&mut self, seed: u64, amount: u64, bumps: &MakeBumps) -> Result<()> {
        
        // We're going to use the set_inner macro just because it's convenient and it's going to add some
        // sanity check to make sure we intiialize all the fields of the escrow account
        self.escrow.set_inner( 
            Escrow { 
                seed,
                mint_x: self.mint_x.to_account_info().key(),
                mint_y: self.mint_y.to_account_info().key(),
                amount,
                bump: bumps.escrow,
            }
        );
    }

    pub fn deposit(&mut self, deposit: u64) -> Result<()> {
        
        // prepare the transfer_checked accounts for CPI
        let cpi_accounts = TransferChecked {
            from: self.maker_ata_x.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.maker.to_account_info(),
            mint: self.mint_x.to_account_info(),
        };

        // prepare the program needed for the CPI
        let cpi_program = self.token_program.to_account_info();

        // create the context for the CPI
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // execute the CPI
        transfer_checked(cpi_ctx, deposit, self.mint_x.decimals)
    }
}

pub fn handler(ctx: Context<Make>, seed: u64, amount: u64, bumps: &MakeBumps, deposit: u64) -> Result<()> {
    // 1. Populate the Escrow Data
    ctx.accounts.populate_escrow(seed, amount, bumps)?;
    // 2. Deposit the amount into the vault
    ctx.accounts.transfer(deposit)?;

    Ok(())
}