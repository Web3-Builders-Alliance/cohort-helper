use anchor_lang::prelude::*;

use anchor_spl::{
    token_interface::{TokenInterface, Mint, TokenAccount, TransferChecked, transfer_checked},
    associated_token::AssociatedToken
};

use crate::state::Escrow;

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