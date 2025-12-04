import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

async function setUpSmartContract() {
  const [owner, artist, addr2, addr3, addr4] = await ethers.getSigners();  
  const USDC = await ethers.deployContract("MockUSDC");
  const Artdrop = await ethers.deployContract("Artdrop", [USDC.target]);
  console.log("Artdrop deployed to:", Artdrop.target);
  return { Artdrop, USDC, owner, artist, addr2, addr3, addr4};
}

async function mintUSDC(USDC: any, to: any, amount: bigint) {
  await USDC.mint(to.address, amount);
}

async function newCampaign() {
  const { Artdrop,USDC, owner, artist, addr2, addr3, addr4 } = await setUpSmartContract();
  await Artdrop.connect(owner).createCampaign("Art Campaign", "ART",artist.address,1000000,200, 1000000);
  return { Artdrop,USDC, owner, artist, addr2, addr3, addr4 };
}

async function startCampaign() {
    const { Artdrop,USDC, owner, artist, addr2, addr3, addr4 } = await newCampaign();
    await Artdrop.connect(owner).startCampaign(1);
    return { Artdrop,USDC, owner, artist, addr2, addr3, addr4 };
}

async function fullyContributeCampaign() {
    const multiplier = BigInt(10 ** 6);
    const { Artdrop,USDC, owner, artist, addr2, addr3, addr4 } = await startCampaign();
    await mintUSDC(USDC, addr2, 500000n * multiplier);
    await mintUSDC(USDC, addr3, 300000n * multiplier);
    await mintUSDC(USDC, addr4, 200000n * multiplier);
    await USDC.connect(addr2).approve(Artdrop.target, 500000n * multiplier);
    await USDC.connect(addr3).approve(Artdrop.target, 300000n * multiplier);
    await USDC.connect(addr4).approve(Artdrop.target, 200000n * multiplier);
    await Artdrop.connect(addr2).contribute(1, 500000n);
    await Artdrop.connect(addr3).contribute(1, 300000n);
    await Artdrop.connect(addr4).contribute(1, 200000n);
    return { Artdrop,USDC, owner, artist, addr2, addr3, addr4 };
}

async function increaseTimeToDeadline() {
    await networkHelpers.time.increase(201);
}

async function notFullyContributeCampaign() {
    const multiplier = BigInt(10 ** 6);
    const { Artdrop,USDC, owner, artist, addr2, addr3, addr4 } = await startCampaign();
    await mintUSDC(USDC, addr2, 400000n * multiplier);
    await USDC.connect(addr2).approve(Artdrop.target, 400000n * multiplier);
    await Artdrop.connect(addr2).contribute(1, 400000n);
    return { Artdrop,USDC, owner, artist, addr2, addr3, addr4 };
}

describe("Artdrop Smart Contract", function () {
    let Artdrop: any;
    let USDC: any;
    let owner: any;
    let artist: any;
    let addr2: any;
    let addr3: any;
    let addr4: any;
    describe("main function tests", function () {
        it("Should create a campaign", async function () {
            const { Artdrop,USDC, owner, artist, addr2, addr3, addr4 } = await setUpSmartContract();
            await Artdrop.connect(owner).createCampaign("Art Campaign", "ART",artist.address,1000000,200, 1000000);
            const campaign = await Artdrop.getCampaign(1);
            expect(campaign.name).to.equal("Art Campaign");
            expect(campaign.description).to.equal("ART");
            expect(campaign.initialSupply).to.equal(1000000);
            expect(campaign.artist).to.equal(artist.address);
            expect(campaign.startTime).to.equal(0);
            expect(campaign.isCompleted).to.equal(false);
            expect(campaign.fundsGoal).to.equal(1000000);
            expect(campaign.fundsRaised).to.equal(0);
            expect(campaign.deadline).to.equal(200);
            expect(campaign.campaignExists).to.equal(true);
        });

        it ("Should deploy TokenArt when campaign is completed", async function () {
            const multiplier = BigInt(10 ** 6);
            const { Artdrop,USDC, owner, artist, addr2, addr3, addr4 } = await setUpSmartContract();
            await Artdrop.connect(owner).createCampaign("Art Campaign", "ART",artist.address,1000000,200, 1000000);
            await Artdrop.connect(owner).startCampaign(1); // set rate to 10 USDC per TokenArt
            await mintUSDC(USDC, addr2, 500000n * multiplier);
            await mintUSDC(USDC, addr3, 300000n * multiplier);
            await mintUSDC(USDC, addr4, 200000n * multiplier);
            await USDC.connect(addr2).approve(Artdrop.target, 500000n * multiplier);
            await USDC.connect(addr3).approve(Artdrop.target, 300000n * multiplier);
            await USDC.connect(addr4).approve(Artdrop.target, 200000n * multiplier);
            await Artdrop.connect(addr2).contribute(1, 500000n);
            await Artdrop.connect(addr3).contribute(1, 300000n);
            await Artdrop.connect(addr4).contribute(1, 200000n);
            console.log("Funds raised:", (await Artdrop.getCampaign(1)).fundsRaised);
            //increase time to pass deadline
            await networkHelpers.time.increase(201);

            await Artdrop.connect(owner).createTokenArt(1, "TokenArt", "ART");
            const campaign = await Artdrop.getCampaign(1);
            const tokenArt = await Artdrop.getTokenArt(1);
            expect(campaign.isCompleted).to.equal(true);
            console.log("TokenArt Address:", tokenArt.Address);
            console.log("name of tokenArt:", await ethers.getContractAt("TokenArt", tokenArt.Address).then((contract:any) => contract.name()));
            expect(tokenArt.Address).to.not.equal("0x0000000000000000000000000000000000000000");
            await Artdrop.connect(owner).distributeTokens(1);
            console.log("Balance of addr2:", await ethers.getContractAt("TokenArt", tokenArt.Address).then((contract:any) => contract.balanceOf(addr2.address)));
            console.log("Balance of addr3:", await ethers.getContractAt("TokenArt", tokenArt.Address).then((contract:any) => contract.balanceOf(addr3.address)));
            console.log("Balance of addr4:", await ethers.getContractAt("TokenArt", tokenArt.Address).then((contract:any) => contract.balanceOf(addr4.address)));
            expect(await ethers.getContractAt("TokenArt", tokenArt.Address).then((contract:any) => contract.balanceOf(addr2.address))).to.equal(500000n*multiplier);
            expect(await ethers.getContractAt("TokenArt", tokenArt.Address).then((contract:any) => contract.balanceOf(addr3.address))).to.equal(300000n*multiplier);
            expect(await ethers.getContractAt("TokenArt", tokenArt.Address).then((contract:any) => contract.balanceOf(addr4.address))).to.equal(200000n*multiplier);
        });

        it("should transfer funds to artist when campaign is completed", async function () {
            const multiplier = BigInt(10 ** 6);
            const { Artdrop,USDC, owner, artist, addr2, addr3, addr4 } = await setUpSmartContract();
            await Artdrop.connect(owner).createCampaign("Art Campaign", "ART",artist.address,1000000,200, 1000000);
            await Artdrop.connect(owner).startCampaign(1);
            await mintUSDC(USDC, addr2, 1000000n * multiplier);
            await USDC.connect(addr2).approve(Artdrop.target, 1000000n * multiplier);
            await Artdrop.connect(addr2).contribute(1, 1000000n);
            //increase time to pass deadline
            await networkHelpers.time.increase(201);
            const artistBalanceBefore = await USDC.balanceOf(artist.address);
            const transferSuccess = await Artdrop.connect(owner).withdrawFunds(1);
            
            const artistBalanceAfter = await USDC.balanceOf(artist.address);
            console.log("Artist balance after:", artistBalanceAfter);
            //console.log(transferSuccess);
            expect(transferSuccess.value).to.be.equal(0n);
            expect(artistBalanceAfter - artistBalanceBefore).to.equal(1000000n * multiplier);
        });
    });

    describe("Check tests, require errors", function () {
        describe("require onlyOwner", function () {
            beforeEach(async () => {({Artdrop,USDC, owner, artist, addr2, addr3, addr4} = await setUpSmartContract());});
            it("Should fail to create campaign if not owner", async function () {
                await expect(Artdrop.connect(addr2).createCampaign("Art Campaign", "ART",artist.address,1000000,200, 1000000)
                ).to.be.revertedWithCustomError(Artdrop, "OwnableUnauthorizedAccount");
            });
            it("Should fail to start campaign if not owner", async function () {
                await expect(Artdrop.connect(addr2).startCampaign(1)).to.be.revertedWithCustomError(Artdrop, "OwnableUnauthorizedAccount");
            });
            it("should fail to withdraw funds if not owner", async function () {
                await expect(Artdrop.connect(addr2).withdrawFunds(1)).to.be.revertedWithCustomError(Artdrop, "OwnableUnauthorizedAccount");
            });
            it("should fail to withdraw incomplete campaign if not owner", async function () {
                await expect(Artdrop.connect(addr2).withdrawIncompleteCampaign(1)).to.be.revertedWithCustomError(Artdrop, "OwnableUnauthorizedAccount");
            });
            it("should fail to create TokenArt if not owner", async function () {
                await expect(Artdrop.connect(addr2).createTokenArt(1, "TokenArt", "ART")).to.be.revertedWithCustomError(Artdrop, "OwnableUnauthorizedAccount");
            });
            it("should fail to distribute tokens if not owner", async function () {
                await expect(Artdrop.connect(addr2).distributeTokens(1)).to.be.revertedWithCustomError(Artdrop, "OwnableUnauthorizedAccount");
            });
        });
        describe("require campaignExists", function () {
            beforeEach(async () => {({Artdrop,USDC, owner, artist, addr2, addr3, addr4} = await setUpSmartContract());});
            it("Should fail to start non-existing campaign", async function () {
                await expect(Artdrop.connect(owner).startCampaign(1)).to.be.revertedWith("Campaign does not exist");
            });
            it("should fail to contribute to non-existing campaign", async function () {
                await expect(Artdrop.connect(addr2).contribute(1, 100n)).to.be.revertedWith("Campaign does not exist");
            });
            it("should fail to withdraw funds from non-existing campaign", async function () {
                await expect(Artdrop.connect(owner).withdrawFunds(1)).to.be.revertedWith("Campaign does not exist");
            });
            it("should fail to withdraw incomplete non-existing campaign", async function () {
                await expect(Artdrop.connect(owner).withdrawIncompleteCampaign(1)).to.be.revertedWith("Campaign does not exist");
            });
            it("should fail to create TokenArt for non-existing campaign", async function () {
                await expect(Artdrop.connect(owner).createTokenArt(1, "TokenArt", "ART")).to.be.revertedWith("Campaign does not exist");
            });
            it("should fail to get remaining time for non-existing campaign", async function () {
                await expect(Artdrop.getRemainingTime(1)).to.be.revertedWith("Campaign does not exist");
            });
            it("should fail to get campaign info for non-existing campaign", async function () {
                await expect(Artdrop.getCampaign(1)).to.be.revertedWith("Campaign does not exist");
            });
        });
        describe("require startCampaign conditions", function () {
            it("Should fail to start campaign already started", async function () {
                const { Artdrop,USDC, owner, artist, addr2, addr3, addr4 } = await startCampaign();
                await expect(Artdrop.connect(owner).startCampaign(1)).to.be.revertedWith("Campaign has already started");
            });
        });
        describe("require contribute conditions", function () {
            beforeEach(async () => {({Artdrop,USDC, owner, artist, addr2, addr3, addr4} = await startCampaign());});
            it("Should fail to contribute to non-started campaign", async function () {
                await Artdrop.connect(owner).createCampaign("Art Campaign 2", "ART2",artist.address,500000,100, 500000);
                await expect(Artdrop.connect(addr2).contribute(2, 100n)).to.be.revertedWith("Campaign has not started yet");
            });
            it("Should fail to contribute after deadline", async function () {
                await networkHelpers.time.increase(201);
                await expect(Artdrop.connect(addr2).contribute(1, 100n)).to.be.revertedWith("Campaign has ended");
            });
            it("Should fail to contribute zero amount", async function () {
                await expect(Artdrop.connect(addr2).contribute(1, 0n)).to.be.revertedWith("Contribution must be greater than 0");
            });
            it("Should fail to transfer USDC failure", async function () {
                const zero = BigInt(0);
                const amount = BigInt(100000000);
                await expect(Artdrop.connect(addr2).contribute(1, 100n)).to.be.revertedWithCustomError(Artdrop, `ERC20InsufficientAllowance(${Artdrop.target}, ${zero}, ${amount})`);
            });
        });
    });
});