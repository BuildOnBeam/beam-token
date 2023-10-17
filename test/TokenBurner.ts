import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BeamToken, BeamToken__factory, TokenBurner, TokenBurner__factory } from "../typechain";
import hre from "hardhat";
import TimeTraveler from "../utils/TimeTraveler";
import { parseEther } from "@ethersproject/units";

const NAME = "NAME";
const SYMBOL = "SYMBOL";
const INITIAL_SUPPLY = parseEther("10000");
const BURN_AMOUNT = parseEther("100");

describe("TokenBurner", function () {
  this.timeout(200000);

  let beamToken: BeamToken;
  let tokenBurner: TokenBurner;
  let deployer: SignerWithAddress;
  let accounts: SignerWithAddress[];
  const timeTraveler = new TimeTraveler(hre.network.provider);

  before(async () => {
    [deployer, ...accounts] = await hre.ethers.getSigners();
    beamToken = await new BeamToken__factory(deployer).deploy(NAME, SYMBOL);

    const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
    const BURNER_ROLE = "0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848";

    tokenBurner = await new TokenBurner__factory(deployer).deploy(beamToken.address);

    // allow tokenBurner to burn tokens
    await beamToken.grantRole(BURNER_ROLE, tokenBurner.address);
    await beamToken.grantRole(MINTER_ROLE, deployer.address);

    await beamToken.connect(deployer).mint(deployer.address, INITIAL_SUPPLY);
    await timeTraveler.snapshot();
  });

  beforeEach(async () => {
    await timeTraveler.revertSnapshot();
  });

  it("Burn should work", async () => {
    // Transfer some tokens into the burner
    await beamToken.transfer(tokenBurner.address, BURN_AMOUNT);

    const totalSupplyBefore = await beamToken.totalSupply();
    await tokenBurner.burn();
    const totalSupplyAfter = await beamToken.totalSupply();
    const burnerBalance = await beamToken.balanceOf(tokenBurner.address);

    expect(totalSupplyAfter).to.eq(totalSupplyBefore.sub(BURN_AMOUNT));
    expect(burnerBalance).to.eq(0);
  });
});
