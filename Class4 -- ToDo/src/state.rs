use anchor_lang::prelude::*;

#[account]

/* 

    Escrow State:

    pub struct Escrow {
        pub seed: u64,                                                  [?] We can supply a random number to derive the PDA, so that a user can create more then one escrow account
        pub mint_x: Pubkey,                                             We need to know the Pubkey of the mint that the user is depositing
        pub mint_y: Pubkey,                                             We need to know the Pubkey of the mint that the user is expecting to receive
        pub amount_x: u64,                                              [?] We can supply the amount of mint_x token the user is depositing, but we can know it by checking the vault account
        pub amount_y: u64,                                              We need to supply the amount of mint_y token that the user is expecting to receive
        pub bump: u8,                                                   [?] We can supply the bump to save CU in our program. Note: the bump can go as low as 0, so if the bump is very low it will take a lot of CU to be calculated!
    }

*/

pub struct Escrow {
    pub seed: u64, 
    pub mint_x: Pubkey, 
    pub mint_y: Pubkey, 
    pub amount: u64, 
    pub bump: u8, 
}

impl Space for Escrow {
    const INIT_SPACE: usize = 8 + 8 + 32 + 32 + 8 + 1;
}