use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenInterface, Mint, TokenAccount, TransferChecked, CloseAccount, transfer_checked, close_account};
use crate::state::Escrow;

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,
    #[account(
        mut,
        has_one = mint_x,
        has_one = mint_y,
        close = maker,
        seeds = [b"escrow", maker.key().as_ref(), escrow.seed.to_le_bytes().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,

    pub mint_x: InterfaceAccount<'info, Mint>,
    pub mint_y: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = maker
    )]
    pub maker_ata_x: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = escrow.mint_x,
        associated_token::authority = escrow,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

impl<'info> Refund<'info> {
    fn empty_vault(&mut self) -> Result<()> {
        
        // Create the seeds for the escrow account since it's the authority of the vault account
        let seeds: &[&[u8]; 4] = &[
            b"escrow", 
            self.maker.to_account_info().key.as_ref(), 
            &self.escrow.seed.to_le_bytes()[..],
            &[self.escrow.bump]
        ];
        let signer_seeds = &[&seeds[..]];

        // Create the transfer CPI
        transfer_checked(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(), 
                TransferChecked {
                    from: self.vault.to_account_info(),
                    to: self.maker_ata_x.to_account_info(),
                    authority: self.escrow.to_account_info(),
                    mint: self.mint_x.to_account_info(),
                }, 
                &signer_seeds
            ), 
            self.vault.amount, 
            self.mint_x.decimals
        )?;
    }

    fn close_vault(&mut self) -> Result<()> {

        // Create the seeds for the escrow account since it's the authority of the vault account
        let seeds: &[&[u8]; 4] = &[
            b"escrow", 
            self.maker.to_account_info().key.as_ref(), 
            &self.escrow.seed.to_le_bytes()[..],
            &[self.escrow.bump]
        ];
        let signer_seeds = &[&seeds[..]];


        // Create the close CPI
        close_account(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(), 
                CloseAccount {
                    account: self.vault.to_account_info(),
                    destination: self.maker.to_account_info(),
                    authority: self.escrow.to_account_info(),
                },
                &signer_seeds
            ), 
        )?;
    }
}

pub fn handler(ctx: Context<Refund>) -> Result<()> {
    // 1. Give back all the lamports in the vault to the maker
    ctx.accounts.empty_vault()?;
    // 2. Close the vault ATA
    ctx.accounts.close_vault()?;

    Ok(())
}