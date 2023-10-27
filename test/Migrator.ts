

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BeamToken, BeamToken__factory, Migrator, Migrator__factory } from "../typechain";
import hre, { ethers } from "hardhat";
import TimeTraveler from "../utils/TimeTraveler";
import { parseEther } from "@ethersproject/units";
import { AddressZero } from "@ethersproject/constants";
import BEP20 from "../abi/BEP20.json";

const NAME = "NAME";
const SYMBOL = "SYMBOL";
// const INITIAL_SUPPLY = parseEther("10000");
const MIGRATION_RATE = parseEther("100");
const MIGRATION_AMOUNT = parseEther("600");

const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD"
const MC_BSC = "0x949D48EcA67b17269629c7194F4b727d4Ef9E5d6"
const BINANCE_HOLDER = "0x5a52E96BAcdaBb82fd05763E25335261B270Efcb"

describe("Migrator", function() {

    this.timeout(200000);

    let beamToken: BeamToken;
    let meritToken: any;
    let migrator: Migrator;
    let deployer: SignerWithAddress;
    let migrant: SignerWithAddress;
    let accounts: SignerWithAddress[];
    const timeTraveler = new TimeTraveler(hre.network.provider);

    before(async() => {
        [deployer, migrant, ...accounts] = await hre.ethers.getSigners();
        beamToken = await (new BeamToken__factory(deployer)).deploy(NAME, SYMBOL);
        meritToken = new hre.ethers.Contract(MC_BSC, BEP20, hre.ethers.provider);
        
        const owner = await meritToken.getOwner();

        migrator = await (new Migrator__factory(deployer)).deploy(meritToken.address, beamToken.address, MIGRATION_RATE);

        const MINTER_ROLE = await beamToken.MINTER_ROLE();

        await beamToken.grantRole(MINTER_ROLE, migrator.address);

        await timeTraveler.snapshot();
    });

    beforeEach(async() => {
        await timeTraveler.revertSnapshot();
    });

    describe("contructor", async() => {
        it("Constructor args should be used", async() => {
            const source = await migrator.source();
            const destination = await migrator.destination();
            const migrationRate = await migrator.migrationRate();

            expect(source).to.eq(meritToken.address);
            expect(destination).to.eq(beamToken.address);
            expect(migrationRate).to.eq(MIGRATION_RATE);
        });
        it("Should revert if setting source, destination or migration rate to zero", async() => {
            await expect((new Migrator__factory(deployer)).deploy(AddressZero, beamToken.address, MIGRATION_RATE)).to.revertedWith("Source cannot be zero address");
            await expect((new Migrator__factory(deployer)).deploy(meritToken.address, AddressZero, MIGRATION_RATE)).to.revertedWith("Destination cannot be zero address");
            await expect((new Migrator__factory(deployer)).deploy(meritToken.address, beamToken.address, 0)).to.revertedWith("Migration rate cannot be zero");
        });
    });
    describe("migrate", async() => {
        it("Should work when called by a token owner and Migrator has Minter and Burner role", async() => {            
            const meritTotalSupply = await meritToken.totalSupply();
            const beamTotalSupply = await beamToken.totalSupply();
            
            const meritBalance = await meritToken.balanceOf(BINANCE_HOLDER);
            const beamBalance = await beamToken.balanceOf(BINANCE_HOLDER);
            expect(meritBalance).to.not.eq(0);
            expect(beamBalance).to.eq(0);
            
            const burnAddressBalance = await meritToken.balanceOf(BURN_ADDRESS);
            expect(burnAddressBalance).to.eq(0);

            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [BINANCE_HOLDER],
            });
            
            const binanceHolderSigner = await hre.ethers.getSigner(BINANCE_HOLDER)

            const approveTx = await meritToken.connect(binanceHolderSigner).populateTransaction.approve(migrator.address ,MIGRATION_AMOUNT);
            await binanceHolderSigner.sendTransaction(approveTx)

            const migrateTx = await migrator.connect(binanceHolderSigner).populateTransaction.migrate(MIGRATION_AMOUNT);
            await binanceHolderSigner.sendTransaction(migrateTx)

            const meritBalanceFinal = await meritToken.balanceOf(BINANCE_HOLDER);
            const beamBalanceFinal = await beamToken.balanceOf(BINANCE_HOLDER);

            const burnAddressBalanceFinal = await meritToken.balanceOf(BURN_ADDRESS);

            const meritTotalSupplyFinal = await meritToken.totalSupply();
            const beamTotalSupplyFinal = await beamToken.totalSupply();

            // As we are not per se burning, total supply will not decrease
            expect(meritTotalSupply).to.eq(meritTotalSupplyFinal);
            expect(beamTotalSupply).to.eq(beamTotalSupplyFinal.sub(MIGRATION_AMOUNT.mul(MIGRATION_RATE).div(parseEther("1"))));
            expect(meritBalance).to.eq(meritBalanceFinal.add(MIGRATION_AMOUNT));
            expect(beamBalance).to.eq(beamBalanceFinal.sub(MIGRATION_AMOUNT.mul(MIGRATION_RATE).div(parseEther("1"))));
            expect(burnAddressBalanceFinal).to.eq(MIGRATION_AMOUNT);            
        });
        it("Migrating should emit the correct event", async() => {
            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [BINANCE_HOLDER],
            });
            
            const binanceHolderSigner = await hre.ethers.getSigner(BINANCE_HOLDER)

            const approveTx = await meritToken.connect(binanceHolderSigner).populateTransaction.approve(migrator.address ,MIGRATION_AMOUNT);
            await binanceHolderSigner.sendTransaction(approveTx)

            const migrateTx = await migrator.connect(binanceHolderSigner).populateTransaction.migrate(MIGRATION_AMOUNT);

            await expect(binanceHolderSigner.sendTransaction(migrateTx))
                .to.emit(migrator, "Migrated")
                .withArgs(binanceHolderSigner.address, MIGRATION_AMOUNT.mul(MIGRATION_RATE).div(parseEther("1")));
        });
        it("Should revert when called by a token owner without the amount", async() => {
            const balance = await meritToken.balanceOf(BINANCE_HOLDER);

            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [BINANCE_HOLDER],
            });
            
            const binanceHolderSigner = await hre.ethers.getSigner(BINANCE_HOLDER)

            const approveTx = await meritToken.connect(binanceHolderSigner).populateTransaction.approve(migrator.address ,MIGRATION_AMOUNT);
            await binanceHolderSigner.sendTransaction(approveTx)

            const migrateTx = await migrator.connect(binanceHolderSigner).populateTransaction.migrate(MIGRATION_AMOUNT);
            await binanceHolderSigner.sendTransaction(migrateTx)

            await expect(migrator.connect(migrant).migrate(balance.add(parseEther("1")))).to.revertedWith("BEP20: transfer amount exceeds balance");
        });
        it("Should revert when called by a token owner without the approval", async() => {
            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [BINANCE_HOLDER],
            });
            
            const binanceHolderSigner = await hre.ethers.getSigner(BINANCE_HOLDER)

            const migrateTx = await migrator.connect(binanceHolderSigner).populateTransaction.migrate(MIGRATION_AMOUNT);

            await expect(binanceHolderSigner.sendTransaction(migrateTx)).to.revertedWith("BEP20: transfer amount exceeds allowance");
        });
        it("Should revert when Migrator contract does not have minter role in destination token", async() => {
            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [BINANCE_HOLDER],
            });
            
            const binanceHolderSigner = await hre.ethers.getSigner(BINANCE_HOLDER)

            const approveTx = await meritToken.connect(binanceHolderSigner).populateTransaction.approve(migrator.address ,MIGRATION_AMOUNT);
            await binanceHolderSigner.sendTransaction(approveTx)

            const migrateTx = await migrator.connect(binanceHolderSigner).populateTransaction.migrate(MIGRATION_AMOUNT);

            const MINTER_ROLE = await beamToken.MINTER_ROLE();
            await beamToken.revokeRole(MINTER_ROLE, migrator.address);

            await expect(binanceHolderSigner.sendTransaction(migrateTx)).to.revertedWith("BeamToken.onlyHasRole: msg.sender does not have role");
        });
    });
});
