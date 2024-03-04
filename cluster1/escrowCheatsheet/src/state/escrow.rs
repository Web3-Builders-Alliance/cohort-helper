use anchor_lang::prelude::*;

#[account]
pub struct Escrow {
    pub seed: u64, // So that a user can have more then one escrow account. It will be used to derive the PDA
    pub mint_x: Pubkey, // Token that the user is depositing
    pub mint_y: Pubkey, // Token that the user is expecting to receive
    pub amount: u64, // Amount of token y that the user is expecting to receive
    pub bump: u8, // Bump seed from our escrow PDA
}

impl Space for Escrow {
    const INIT_SPACE: usize = 8 + 8 + 32 + 32 + 8 + 1;
}