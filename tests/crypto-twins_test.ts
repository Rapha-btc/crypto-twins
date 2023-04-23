import { Tx } from 'https://deno.land/x/clarinet@v1.4.2/index.ts'
// import { ClarityAbi } from '@blockstack/clarity';
/**
 * Test class is structured;
 * 0. AUTHORIZATION CHECKS
 * 1. stack
 * 2. claim-stacking-reward
 * 3. stacking-status
 */
import { Account, assertEquals, Clarinet, Chain, types } from "../utils/deps.ts";
import { constructAndPassProposal, EXTENSIONS, passProposal, PROPOSALS } from "../utils/common.ts";
import { CCD002Treasury } from "../models/extensions/ccd002-treasury.model.ts";
import { CCD007CityStacking } from "../models/extensions/ccd007-citycoin-stacking.model.ts";
import { CCD011StackingPayouts } from "../models/extensions/ccd011-stacking-payouts.model.ts";
import { CCEXTGovernanceToken } from "../models/external/test-ccext-governance-token.model.ts";
// =============================
// INTERNAL DATA / FUNCTIONS
// =============================
const lockPeriod = 10;
const lockingPeriod = 32;
const miaCityName = "mia";
const miaCityId = 1;
const miaTreasuryName = "ccd002-treasury-mia-stacking";
const nycCityName = "nyc";
const nycCityId = 2;

Clarinet.test({
  name: "ccd007-citycoin-stacking: stack (2m) succeeds and stacks for 10 cycle",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd007CityStacking = new CCD007CityStacking(chain, sender, "ccd007-citycoin-stacking");
    const gt = new CCEXTGovernanceToken(chain, sender, "test-ccext-governance-token-mia");
    const user1 = accounts.get("wallet_1")!;
    const user2 = accounts.get("wallet_2")!;
    const amountStacked = 2000000000000;
    const targetCycle = 1;
    const cityId = 1;
    const userId = 1;
    gt.getBalance(user1.address).result.expectOk().expectUint(0);
    gt.getBalance(EXTENSIONS.CCD002_TREASURY_MIA_STACKING).result.expectOk().expectUint(0);
    // progress the chain to avoid underflow in
    // stacking reward cycle calculation
    chain.mineEmptyBlockUntil(CCD007CityStacking.FIRST_STACKING_BLOCK);

    // act
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD004_CITY_REGISTRY_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_001);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD005_CITY_DATA_002);
    passProposal(chain, accounts, PROPOSALS.TEST_CCD007_CITY_STACKING_007);
    // 009 mints mia to user1 and user2 - and I propose to mint 4m!
    passProposal(chain, accounts, PROPOSALS.TEST_CCD007_CITY_STACKING_009); // mint some MIA for sender but only 1m please (updated)

    // 010 adds the token contract to the treasury allow list
    passProposal(chain, accounts, PROPOSALS.TEST_CCD007_CITY_STACKING_010);
    gt.getBalance(user1.address).result.expectOk().expectUint(4000000000000);
    gt.getBalance(EXTENSIONS.CCD002_TREASURY_MIA_STACKING).result.expectOk().expectUint(0);

    const block = chain.mineBlock([ccd007CityStacking.stack(user1, miaCityName, amountStacked, lockPeriod)]);

    // assert
    block.receipts[0].result.expectOk().expectBool(true);
    gt.getBalance(user1.address).result.expectOk().expectUint(2000000000000); //4m-2.2m
    gt.getBalance(EXTENSIONS.CCD002_TREASURY_MIA_STACKING).result.expectOk().expectUint(amountStacked);
    const expected = `{amountStacked: ${types.uint(amountStacked)}, cityId: u1, cityName: "mia", cityTreasury: ${sender.address}.${miaTreasuryName}, event: "stacking", firstCycle: ${types.uint(1)}, lastCycle: ${types.uint(targetCycle + lockPeriod - 1)}, lockPeriod: ${types.uint(lockPeriod)}, userId: ${types.uint(1)}}`;
    block.receipts[0].events.expectPrintEvent(`${sender.address}.ccd007-citycoin-stacking`, expected);
    assertEquals(ccd007CityStacking.getStacker(cityId, targetCycle, userId).result.expectTuple(), { claimable: types.uint(0), stacked: types.uint(amountStacked) });
    // console.log("getStacker........", block.receipts[0].events);

    const block2 = chain.mineBlock([]);

    const blockSender = chain.mineBlock([ccd007CityStacking.stack(sender, miaCityName, 500000000000, lockPeriod)]); // same for sender stacked
    // change the line above to 1000000000000 to get err u303 a.k.a "Stacking amount must be greater than 2M"

    // // get the current block height
    // const currentHeight = await clarity.rpc.getBlockHeight();

    // // advance the chain tip by 2 cycles!
    chain.mineEmptyBlock(CCD007CityStacking.REWARD_CYCLE_LENGTH * 2 + 10);


    // okay now user1 has stacked 2m MIA for 10 cycles, let's print a crypto-twin to user1
    let block3 = chain.mineBlock([
        // Tx.contractCall(`${sender.address}.crypto-twins`, "mint", [`${user1.address}`], user1.address) 
        // I don't know how to write this string inside parameter in typescript, so just hardcode it and it worked!
        Tx.contractCall(`${sender.address}.crypto-twins`, "mint", [types.principal(user1.address)], user1.address) 
        // Tx.contractCall(`${sender.address}.crypto-twins`, "mint", ["'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5"], user1.address)
          ]);
    // now let's verify that user 1 has a gold crypto-twin 
    console.log("get me a CC NFT, and a BTC tier one please........", block3.receipts[0].events);
    console.log("get me a CC NFT please........", block3.receipts[0].result);
    // it's green, it's a free mint but I still don't know how to advance chain tip by 2100 blocks in typescript

    // now let's try to transfer it to a receiver that doesn't have enough tokens
    let block4 = chain.mineBlock([
        Tx.contractCall(`${sender.address}.crypto-twins`, "transfer", [types.uint(1), types.principal(user1.address), types.principal(sender.address)], user1.address) 
          ]);
        
    console.log("cannot send it to receiver if receiver is not a stacker.......but stacker is.", block4.receipts[0].events); // this throws u300 because sender doesn't have a userId and needs to interact with contract first!
    // console.log("isn't it?", block4.receipts[0].result);
    // console.log("yes it is...", block4.receipts);
    console.log("detail 00000... userId ", block4.receipts[0].events[0]);
    console.log("details 11111... NFT tier ", block4.receipts[0].events[1]);
    console.log("details 22222...crypto-twin Id ", block4.receipts[0].events[2]);
    
    // now let's try to mint a 2nd one and it should fail for user1 because he already has minted one
    let block5 = chain.mineBlock([
      Tx.contractCall(`${sender.address}.crypto-twins`, "mint", [types.principal(user1.address)], user1.address) 
        ]);
    console.log("good try but you already minted one, why did you transfer it?! that won't game the limited edition... ", block5.receipts[0].result); // I don't know how to log the err u304
    // block5.receipts[0].result.expectOk().expectBool(false)
    block5.receipts[0].result.expectErr().expectUint(304); // good try but you already minted one, why did you transfer it?! that won't game the limited edition

    // now let's try to mint a 2nd one and it should fail for user1 because he already has minted one
    let block6 = chain.mineBlock([
    Tx.contractCall(`${sender.address}.crypto-twins`, "mint", [types.principal(sender.address)], sender.address) 
            ]);

    // let's check that the deployer minted u2 now
    console.log("deployer was transfered u1 and now mints u2... ", block6.receipts[0].result); 

    // let's try for user1 to mint again
    let block7 = chain.mineBlock([
      Tx.contractCall(`${sender.address}.crypto-twins`, "mint", [types.principal(sender.address)], user1.address) 
              ]);
      block5.receipts[0].result.expectErr().expectUint(304);
    
    // let's send u1 and u2 to user1 from deployer
    let block8 = chain.mineBlock([
      Tx.contractCall(`${sender.address}.crypto-twins`, "transfer", [types.uint(1), types.principal(sender.address), types.principal(user1.address)], sender.address),
      Tx.contractCall(`${sender.address}.crypto-twins`, "transfer", [types.uint(2), types.principal(sender.address), types.principal(user1.address)], sender.address) 
        ]);
        console.log("Sender is CC sends back u1 to user1 who is BTC tier...", block8.receipts[0].events); // this throws u300 because sender doesn't have a userId and needs to interact with contract first!
        console.log("Sender is CC sends back u2 to user1 who is BTC tier...", block8.receipts[1].events); 
        
    // now the deployer wants to mint one again   
    let block9 = chain.mineBlock([     
      Tx.contractCall(`${sender.address}.crypto-twins`, "mint", [types.principal(sender.address)], sender.address) 
        ]);
        block9.receipts[0].result.expectErr().expectUint(304);
    
    // now we want deplyer to send to user1 what he deosnt have anymore
    let block10 = chain.mineBlock([
      Tx.contractCall(`${sender.address}.crypto-twins`, "transfer", [types.uint(1), types.principal(sender.address), types.principal(user1.address)], sender.address)
        ]);
        // console.log("user1 doesn't have u1 anymore...", block10.receipts[0].events); // this trows err u1 because user1 doesn't have u1 anymore
        block10.receipts[0].result.expectErr().expectUint(1);
    // now we want to send to user3 but user3 is not a stacker
    let block11 = chain.mineBlock([
      Tx.contractCall(`${sender.address}.crypto-twins`, "transfer", [types.uint(1), types.principal(user1.address), types.principal(user2.address)], user1.address)
        ]);
        // console.log("user2 is not a stacker...", block11.receipts[0].events); // this throws u300 because sender doesn't have a userId and needs to interact with contract first!
        block11.receipts[0].result.expectErr().expectUint(300);
// test by changing the amounts to have all branches of CC, STX, BTC in transfer and mint = done and it works


  },
});