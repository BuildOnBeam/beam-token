import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { 
    Migrator__factory
} from "../../typechain";
import { constants } from "ethers/lib/ethers";
import { parseEther } from "ethers/lib/utils";
import sleep from "../../utils/sleep";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const VERIFY_DELAY = 100000;

task("deploy-migrator")
    .addParam("source")
    .addParam("destination")
    .addParam("rate")
    .addFlag("verify")
    .setAction(async(taskArgs, { ethers, run }) => {
        const signers = await ethers.getSigners();

        console.log("Deploying migrator");
        const migrator = await new Migrator__factory(signers[0]).deploy(taskArgs.source, taskArgs.destination, taskArgs.rate);
        console.log(`Migrator deployed at: ${migrator.address}`);

        if(taskArgs.verify) {
            console.log("Verifying Migrator, can take some time")
            await migrator.deployed();
            await sleep(VERIFY_DELAY);
            await run("verify:verify", {
                address: migrator.address,
                constructorArguments: [
                    taskArgs.source,
                    taskArgs.destination,
                    taskArgs.rate,
                ]
            })
        }

        console.log("done");
});