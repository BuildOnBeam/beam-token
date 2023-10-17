import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BeamToken, BeamToken__factory } from "../typechain";
import hre from "hardhat";
import TimeTraveler from "../utils/TimeTraveler";
import { parseEther } from "@ethersproject/units";
import { keccak256 } from "ethers/lib/utils";

const NAME = "NAME";
const SYMBOL = "SYMBOL";
const INITIAL_SUPPLY = parseEther("0");

describe("BeamToken", function () {
  this.timeout(200000);

  let beamToken: BeamToken;
  let deployer: SignerWithAddress;
  let minter: SignerWithAddress;
  let burner: SignerWithAddress;
  let accounts: SignerWithAddress[];
  const timeTraveler = new TimeTraveler(hre.network.provider);

  before(async () => {
    [deployer, minter, burner, ...accounts] = await hre.ethers.getSigners();
    beamToken = await new BeamToken__factory(deployer).deploy(NAME, SYMBOL);

    // bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");
    // bytes32 private constant BURNER_ROLE = keccak256("BURNER_ROLE");
    const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
    const BURNER_ROLE = "0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848";

    await beamToken.grantRole(MINTER_ROLE, minter.address);
    await beamToken.grantRole(BURNER_ROLE, burner.address);

    await timeTraveler.snapshot();
  });

  beforeEach(async () => {
    await timeTraveler.revertSnapshot();
  });

  describe("constructor", async () => {
    it("Constructor args should be used", async () => {
      const name = await beamToken.name();
      const symbol = await beamToken.symbol();
      const totalSupply = await beamToken.totalSupply();
      const deployerBalance = await beamToken.balanceOf(deployer.address);

      expect(name).to.eq(NAME);
      expect(symbol).to.eq(SYMBOL);
      expect(totalSupply).to.eq(INITIAL_SUPPLY);
      expect(deployerBalance).to.eq(INITIAL_SUPPLY);
    });
    it("Should assign DEFAULT_ADMIN_ROLE to deployer", async () => {
      const DEFAULT_ADMIN_ROLE = await beamToken.DEFAULT_ADMIN_ROLE();
      const hasRole = await beamToken.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
      expect(hasRole).to.eq(true);
    });
  });
  describe("mint", async () => {
    it("Should work when calling from address which has MINTER_ROLE", async () => {
      const MINT_AMOUNT = parseEther("10");
      await beamToken.connect(minter).mint(accounts[0].address, MINT_AMOUNT);

      const totalSupply = await beamToken.totalSupply();
      const accountBalance = await beamToken.balanceOf(accounts[0].address);

      expect(totalSupply).to.eq(INITIAL_SUPPLY.add(MINT_AMOUNT));
      expect(accountBalance).to.eq(MINT_AMOUNT);
    });
    it("Should revert when called from address without MINTER_ROLE", async () => {
      await expect(beamToken.mint(accounts[0].address, parseEther("1"))).to.be.revertedWith("NoRole()");
    });
    it("Should revert when minting tokens to itself", async () => {
      await expect(beamToken.connect(minter).mint(beamToken.address, parseEther("1"))).to.be.revertedWith(
        "NoSelfMinting()",
      );
    });
  });
  describe("burn", async () => {
    it("Should work when calling from address which has BURNER_ROLE", async () => {
      const MINT_AMOUNT = parseEther("10000");
      await beamToken.connect(minter).mint(accounts[0].address, MINT_AMOUNT);

      const BURN_AMOUNT = parseEther("1");
      await beamToken.connect(burner).burn(accounts[0].address, BURN_AMOUNT);

      const totalSupply = await beamToken.totalSupply();
      const accountBalance = await beamToken.balanceOf(accounts[0].address);

      expect(totalSupply).to.eq(INITIAL_SUPPLY.add(MINT_AMOUNT).sub(BURN_AMOUNT));
      expect(accountBalance).to.eq(INITIAL_SUPPLY.add(MINT_AMOUNT).sub(BURN_AMOUNT));
    });
    it("Should revert when called from address without BURNER_ROLE", async () => {
      await expect(beamToken.burn(accounts[0].address, parseEther("1"))).to.revertedWith("NoRole()");
    });
  });

  describe("transfer", async () => {
    it("transfer to token contract should fail", async () => {
      await expect(beamToken.transfer(beamToken.address, parseEther("1"))).to.be.revertedWith("NoTransferToSelf()");
    });
    it("transfer should work normally", async () => {
      const MINT_AMOUNT = parseEther("10000");
      await beamToken.connect(minter).mint(deployer.address, MINT_AMOUNT);

      const TRANSFER_AMOUNT = parseEther("1");
      await beamToken.transfer(accounts[0].address, TRANSFER_AMOUNT);

      const fromBalance = await beamToken.balanceOf(deployer.address);
      const toBalance = await beamToken.balanceOf(accounts[0].address);

      expect(fromBalance).to.eq(INITIAL_SUPPLY.add(MINT_AMOUNT).sub(TRANSFER_AMOUNT));
      expect(toBalance).to.eq(TRANSFER_AMOUNT);
    });
  });
});
