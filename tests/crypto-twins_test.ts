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
    const amountStacked = 2200000000000;
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
    passProposal(chain, accounts, PROPOSALS.TEST_CCD007_CITY_STACKING_009);
    // 010 adds the token contract to the treasury allow list
    passProposal(chain, accounts, PROPOSALS.TEST_CCD007_CITY_STACKING_010);
    gt.getBalance(user1.address).result.expectOk().expectUint(4000000000000);
    gt.getBalance(EXTENSIONS.CCD002_TREASURY_MIA_STACKING).result.expectOk().expectUint(0);

    const block = chain.mineBlock([ccd007CityStacking.stack(user1, miaCityName, amountStacked, lockPeriod)]);

    // assert
    block.receipts[0].result.expectOk().expectBool(true);
    gt.getBalance(user1.address).result.expectOk().expectUint(1800000000000); //4m-2.2m
    gt.getBalance(EXTENSIONS.CCD002_TREASURY_MIA_STACKING).result.expectOk().expectUint(amountStacked);
    const expected = `{amountStacked: ${types.uint(amountStacked)}, cityId: u1, cityName: "mia", cityTreasury: ${sender.address}.${miaTreasuryName}, event: "stacking", firstCycle: ${types.uint(1)}, lastCycle: ${types.uint(targetCycle + lockPeriod - 1)}, lockPeriod: ${types.uint(lockPeriod)}, userId: ${types.uint(1)}}`;
    block.receipts[0].events.expectPrintEvent(`${sender.address}.ccd007-citycoin-stacking`, expected);
    assertEquals(ccd007CityStacking.getStacker(cityId, targetCycle, userId).result.expectTuple(), { claimable: types.uint(0), stacked: types.uint(amountStacked) });
    // console.log("getStacker........", block.receipts[0].events);

    const block2 = chain.mineBlock([]);

    // // get the current block height
    // const currentHeight = await clarity.rpc.getBlockHeight();

    // // advance the chain tip by 2101 blocks
    // // because when you stack in u0 cycle it only starts to be stacked in u1?!?!?!
    // await clarity.rpc.advancedToBlock(currentHeight + 2101);


    // okay now user1 has stacked 2m MIA for 10 cycles, let's print a crypto-twin to user1
    let block3 = chain.mineBlock([
        // Tx.contractCall(`${sender.address}.crypto-twins`, "mint", [`${user1.address}`], user1.address) 
        // I don't know how to write this string inside parameter in typescript, so just hardcode it and it worked!
        Tx.contractCall(`${sender.address}.crypto-twins`, "mint", [types.principal(user1.address)], user1.address) 
        // Tx.contractCall(`${sender.address}.crypto-twins`, "mint", ["'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5"], user1.address)
          ]);
    // now let's verify that user 1 has a gold crypto-twin
    console.log("get me a CC NFT, and a gold one please........", block3.receipts[0].events);
        
  },
});