/* 

    State:

    To derive a Data account, we need to use the #[account] attribute to let 
    anchor know that this is a data account.

    >> The #[account] attribute sets the owner of that data to the ID of the 
    program is used in. The Account type can then check for you that the AccountInfo 
    passed into your instruction has its owner field set to the correct program.

*/

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

/*

    Space:

    Initializing a PDA, means giving it enough lamports to be rent exempt. 
    How do we know how many lamports we need? The init macro will take care of
    that for us, but to work, we need to supply the SPACE occupied by the
    account. We can do that by implementing the Space trait for our struct.

    
    NOTE: impl Space for Escrow >> INIT_SPACE (we always need to implement it 
    using the INIT_SPACE constant or anchor is going to yeall at us)

    impl Space for Escrow {
        const INIT_SPACE: usize = 
            8 +                     // Discriminator (for anchor is always 8 bytes)
            8 +                     // Seed (u64 == 8 bytes)
            32 +                    // mint_x (Pubkey == 32 bytes)
            32 +                    // mint_y (Pubkey == 32 bytes)
            8 +                     // amount (u64 == 8 bytes)
            1;                      // bump (u8 == 1 byte)
    }

    If you forgot the space for the different variable, you can reference it here:
    https://book.anchor-lang.com/anchor_references/space.html

*/

impl Space for Escrow {
    const INIT_SPACE: usize = 8 + 8 + 32 + 32 + 8 + 1;
}