import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { 
    BeamToken,
    BeamToken__factory,
    TokenBurner,
    TokenBurner__factory
} from "../typechain";
import hre from "hardhat";
import TimeTraveler from "../utils/TimeTraveler";
import { parseEther } from "@ethersproject/units";


const NAME = "NAME";
const SYMBOL = "SYMBOL";
const INITIAL_SUPPLY = parseEther("10000");
const BURN_AMOUNT = parseEther("100");

describe("TokenBurner", function() {

    this.timeout(200000);

    let beamToken: BeamToken;
    let tokenBurner: TokenBurner;
    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];
    const timeTraveler = new TimeTraveler(hre.network.provider);

    before(async() => {
        [deployer, ...accounts] = await hre.ethers.getSigners();
        beamToken = await (new BeamToken__factory(deployer)).deploy(NAME, SYMBOL, INITIAL_SUPPLY);

        const MINTER_ROLE = await beamToken.MINTER_ROLE();
        const BURNER_ROLE = await beamToken.BURNER_ROLE();

        tokenBurner = await (new TokenBurner__factory(deployer)).deploy(beamToken.address);

        // allow tokenBurner to burn tokens
        await beamToken.grantRole(BURNER_ROLE, tokenBurner.address);

        await timeTraveler.snapshot();
    });

    beforeEach(async() => {
        await timeTraveler.revertSnapshot();
    });

    it("Burn should work", async() => {
        // Transfer some tokens into the burner
        beamToken.transfer(tokenBurner.address, BURN_AMOUNT);

        const totalSupplyBefore = await beamToken.totalSupply();
        await tokenBurner.burn();
        const totalSupplyAfter = await beamToken.totalSupply();
        const burnerBalance = await beamToken.balanceOf(tokenBurner.address);

        expect(totalSupplyAfter).to.eq(totalSupplyBefore.sub(BURN_AMOUNT));
        expect(burnerBalance).to.eq(0);
    });

});