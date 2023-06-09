import { Account, assertEquals, Clarinet, Chain } from "../../utils/deps.ts";
import { constructAndPassProposal, passProposal, PROPOSALS } from "../../utils/common.ts";
import { CCD003UserRegistry } from "../../models/extensions/ccd003-user-registry.model.ts";

// PUBLIC FUNCTIONS

Clarinet.test({
  name: "ccd003-user-registry: is-dao-or-extension() fails when called directly",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd003userRegistry = new CCD003UserRegistry(chain, sender, "ccd003-user-registry");

    // assert
    ccd003userRegistry.isDaoOrExtension().result.expectErr().expectUint(CCD003UserRegistry.ErrCode.ERR_UNAUTHORIZED);
  },
});

Clarinet.test({
  name: "ccd003-user-registry: callback() succeeds when called directly",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd003userRegistry = new CCD003UserRegistry(chain, sender, "ccd003-user-registry");

    // act
    const { receipts } = chain.mineBlock([ccd003userRegistry.callback(sender, "test")]);

    // assert
    assertEquals(receipts.length, 1);
    receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "ccd003-user-registry: get-or-create-user-id() fails when called directly",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd003userRegistry = new CCD003UserRegistry(chain, sender, "ccd003-user-registry");

    // act
    const { receipts } = chain.mineBlock([ccd003userRegistry.getOrCreateUserId(sender, sender.address)]);

    // assert
    assertEquals(receipts.length, 1);
    receipts[0].result.expectErr().expectUint(CCD003UserRegistry.ErrCode.ERR_UNAUTHORIZED);
  },
});

Clarinet.test({
  name: "ccd003-user-registry: get-or-create-user-id() succeeds when called by the base dao or valid extension",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const approver1 = accounts.get("wallet_1")!;
    const ccd003userRegistry = new CCD003UserRegistry(chain, sender, "ccd003-user-registry");

    // act
    constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD003_USER_REGISTRY_002);
    const { receipts } = passProposal(chain, accounts, PROPOSALS.TEST_CCD003_USER_REGISTRY_001);

    // assert
    assertEquals(receipts.length, 3);
    receipts[2].result.expectOk().expectUint(3); // numb signals - not the result of execution!
    ccd003userRegistry.getUser(1).result.expectSome().expectPrincipal(approver1.address);
    ccd003userRegistry.getUserId(approver1.address).result.expectSome().expectUint(1);
  },
});

Clarinet.test({
  name: "ccd003-user-registry: get-or-create-user-id() succeeds and increments the user id nonce",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const approver1 = accounts.get("wallet_1")!;
    const approver2 = accounts.get("wallet_2")!;
    const approver3 = accounts.get("wallet_3")!;
    const ccd003userRegistry = new CCD003UserRegistry(chain, sender, "ccd003-user-registry");

    // act
    const { receipts } = constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD003_USER_REGISTRY_003);

    // assert
    assertEquals(receipts.length, 4);
    receipts[3].result.expectOk().expectUint(3); // numb signals - not the result of execution!
    ccd003userRegistry.getUser(1).result.expectSome().expectPrincipal(approver1.address);
    ccd003userRegistry.getUserId(approver1.address).result.expectSome().expectUint(1);
    ccd003userRegistry.getUser(2).result.expectSome().expectPrincipal(approver2.address);
    ccd003userRegistry.getUserId(approver2.address).result.expectSome().expectUint(2);
    ccd003userRegistry.getUser(3).result.expectSome().expectPrincipal(approver3.address);
    ccd003userRegistry.getUserId(approver3.address).result.expectSome().expectUint(3);
  },
});

Clarinet.test({
  name: "ccd003-user-registry: get-or-create-user-id() succeeds and creates three user entries",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const approver1 = accounts.get("wallet_1")!;
    const approver2 = accounts.get("wallet_2")!;
    const approver3 = accounts.get("wallet_3")!;
    const ccd003userRegistry = new CCD003UserRegistry(chain, sender, "ccd003-user-registry");

    // act
    const { receipts } = constructAndPassProposal(chain, accounts, PROPOSALS.TEST_CCD003_USER_REGISTRY_001);

    // assert
    assertEquals(receipts.length, 4);
    receipts[3].result.expectOk().expectUint(3); // numb signals - not the result of execution!
    // check that each user is known to the contract
    ccd003userRegistry.getUser(1).result.expectSome().expectPrincipal(approver1.address);
    ccd003userRegistry.getUserId(approver1.address).result.expectSome().expectUint(1);
    ccd003userRegistry.getUser(2).result.expectSome().expectPrincipal(approver2.address);
    ccd003userRegistry.getUserId(approver2.address).result.expectSome().expectUint(2);
    ccd003userRegistry.getUser(3).result.expectSome().expectPrincipal(approver3.address);
    ccd003userRegistry.getUserId(approver3.address).result.expectSome().expectUint(3);
    // check that next user is unknown
    ccd003userRegistry.getUser(4).result.expectNone();
  },
});

// READ ONLY FUNCTIONS

Clarinet.test({
  name: "ccd003-user-registry: get-user-id() succeeds and returns none if user is not in map",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd003userRegistry = new CCD003UserRegistry(chain, sender, "ccd003-user-registry");

    // assert
    ccd003userRegistry.getUserId(sender.address).result.expectNone();
  },
});

Clarinet.test({
  name: "ccd003-user-registry: get-user() succeeds and returns none if user is not in map",
  fn(chain: Chain, accounts: Map<string, Account>) {
    // arrange
    const sender = accounts.get("deployer")!;
    const ccd003userRegistry = new CCD003UserRegistry(chain, sender, "ccd003-user-registry");

    // assert
    ccd003userRegistry.getUser(10).result.expectNone();
  },
});
