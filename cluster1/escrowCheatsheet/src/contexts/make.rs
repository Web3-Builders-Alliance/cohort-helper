use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenInterface, Mint, TokenAccount, TransferChecked, transfer_checked};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::Escrow;

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Make<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    #[account(
        init,
        payer = maker,
        seeds = [b"escrow", maker.key().as_ref(), seed.to_le_bytes().as_ref()],
        space = Escrow::INIT_SPACE,
        bump,
    )]
    pub escrow: Account<'info, Escrow>,
    pub mint_x: InterfaceAccount<'info, Mint>,
    pub mint_y: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = maker,
        associated_token::mint = mint_x,
        associated_token::authority = escrow
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut, // We will not initialize it, because if the user is depositing this token, it already exists
        associated_token::mint = mint_x,
        associated_token::authority = maker,
    )]
    pub maker_ata_x: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed, // We don't know if the user has already has an ATA for this token
        payer = maker,
        associated_token::mint = mint_y,
        associated_token::authority = maker,
    )]
    // InterfaceAccount is used to interact with the accounts from the token Interface
    // Token interface will actually look for both the token program and the token 2022 program
    // By using it, you can pass tokens from both programs
    pub maker_ata_y: InterfaceAccount<'info, TokenAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>, 
}

impl<'info> Make<'info> {
    pub fn make(&mut self, seed: u64, amount: u64, bumps: &MakeBumps, deposit: u64) -> Result<()> {
        // First step is to Initialize escrow account
        self.escrow.set_inner( Escrow { //Sets the inner value of our struct
            seed,
            mint_x: self.mint_x.to_account_info().key(),
            mint_y: self.mint_y.to_account_info().key(),
            amount,
            bump: bumps.escrow,
        });

        // Transfer deposit amount to vault
        self.transfer(deposit)
    }

    pub fn transfer(&mut self, deposit: u64) -> Result<()> {
        // Create CPI context
        let cpi_accounts = TransferChecked {
            from: self.maker_ata_x.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.maker.to_account_info(),
            mint: self.mint_x.to_account_info(),
        };

        // Fetch CPI program
        let cpi_program = self.token_program.to_account_info();

        // Create CPI context
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // Transfer deposit amount to vault by invoking transfer_checked
        transfer_checked(cpi_ctx, deposit, self.mint_x.decimals)
    }
}