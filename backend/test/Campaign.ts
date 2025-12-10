import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

async function setUpSmartContract() {
  const [owner, artist, addr2, addr3, addr4] = await ethers.getSigners();  
  const USDC = await ethers.deployContract("MockUSDC");
  const Campaign = await ethers.deployContract("Campaign", [USDC.target,"name","description",artist.address,1000000,200,1000000, owner.address]);
  console.log("Campaign deployed to:", Campaign.target);
  return { Campaign, USDC, owner, artist, addr2, addr3, addr4};
}

async function mintUSDC(USDC: any, to: any, amount: bigint) {
  await USDC.mint(to.address, amount);
}


async function startCampaign() {
    const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await setUpSmartContract();
    await Campaign.connect(owner).startCampaign();
    return { Campaign,USDC, owner, artist, addr2, addr3, addr4 };
}

async function fullyContributeCampaign() {
    const multiplier = BigInt(10 ** 6);
    const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await startCampaign();
    await mintUSDC(USDC, addr2, 500000n * multiplier);
    await mintUSDC(USDC, addr3, 300000n * multiplier);
    await mintUSDC(USDC, addr4, 200000n * multiplier);
    await USDC.connect(addr2).approve(Campaign.target, 500000n * multiplier);
    await USDC.connect(addr3).approve(Campaign.target, 300000n * multiplier);
    await USDC.connect(addr4).approve(Campaign.target, 200000n * multiplier);
    await Campaign.connect(addr2).contribute(500000n);
    await Campaign.connect(addr3).contribute(300000n);
    await Campaign.connect(addr4).contribute(200000n);
    return { Campaign,USDC, owner, artist, addr2, addr3, addr4,multiplier };
}

async function increaseTimeToDeadline() {
    await networkHelpers.time.increase(201);
}

async function notFullyContributeCampaign() {
    const multiplier = BigInt(10 ** 6);
    const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await startCampaign();
    await mintUSDC(USDC, addr2, 400000n * multiplier);
    await USDC.connect(addr2).approve(Campaign.target, 400000n * multiplier);
    await Campaign.connect(addr2).contribute(400000n);
    return { Campaign,USDC, owner, artist, addr2, addr3, addr4 };
}

describe("Artdrop Smart Contract", function () {
    let Campaign: any;
    let USDC: any;
    let owner: any;
    let artist: any;
    let addr2: any;
    let addr3: any;
    let addr4: any;
    describe("main function tests", function () {
        it("Should deploy with the right parameters", async function () {
            const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await setUpSmartContract();
            const campaign = await Campaign.getCampaignDetails();
            expect(campaign.name).to.equal("name");
            expect(campaign.description).to.equal("description");
            expect(campaign.initialSupply).to.equal(1000000);
            expect(campaign.artist).to.equal(artist.address);
            expect(campaign.startTime).to.equal(0);
            expect(campaign.isCompleted).to.equal(false);
            expect(campaign.fundsGoal).to.equal(1000000);
            expect(campaign.fundsRaised).to.equal(0);
            expect(campaign.deadline).to.equal(200);
        });

        it ("Should deploy TokenArt when campaign is completed", async function () {
            const { Campaign,USDC, owner, artist, addr2, addr3, addr4, multiplier } = await fullyContributeCampaign();
            //increase time to pass deadline
            await networkHelpers.time.increase(201);

            await Campaign.connect(owner).createTokenArt("TokenArt", "ART");
            const campaign = await Campaign.getCampaignDetails();
            const tokenArt = await Campaign.getTokenArt();
            expect(campaign.isCompleted).to.equal(true);
            console.log("TokenArt Address:", tokenArt.Address);
            const contractAddress = await ethers.getContractAt("TokenArt", tokenArt.Address);
            expect(tokenArt.Address).to.equal(contractAddress.target);
            await Campaign.connect(owner).distributeTokens();
            expect(await contractAddress.balanceOf(addr2.address)).to.equal(500000n*multiplier);
            expect(await contractAddress.balanceOf(addr3.address)).to.equal(300000n*multiplier);
            expect(await contractAddress.balanceOf(addr4.address)).to.equal(200000n*multiplier);
        });

        it("should transfer funds to artist when campaign is completed", async function () {
            const multiplier = BigInt(10 ** 6);
            const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await setUpSmartContract();
            await Campaign.connect(owner).startCampaign();
            await mintUSDC(USDC, addr2, 1000000n * multiplier);
            await USDC.connect(addr2).approve(Campaign.target, 1000000n * multiplier);
            await Campaign.connect(addr2).contribute(1000000n);
            //increase time to pass deadline
            await networkHelpers.time.increase(201);
            const artistBalanceBefore = await USDC.balanceOf(artist.address);
            const transferSuccess = await Campaign.connect(owner).withdrawFunds();
            
            const artistBalanceAfter = await USDC.balanceOf(artist.address);
            //console.log(transferSuccess);
            expect((await Campaign.getTokenArt()).rate).to.be.equal(100n);
            expect(transferSuccess.value).to.be.equal(0n);
            expect(artistBalanceAfter - artistBalanceBefore).to.equal(1000000n * multiplier);
        });
    });

    describe("Check tests, require errors", function () {
        describe("require onlyOwner", function () {
            beforeEach(async () => {({Campaign,USDC, owner, artist, addr2, addr3, addr4} = await setUpSmartContract());});
            it("Should fail to start campaign if not owner", async function () {
                await expect(Campaign.connect(addr2).startCampaign()).to.be.revertedWithCustomError(Campaign, "OwnableUnauthorizedAccount");
            });
            it("should fail to withdraw funds if not owner", async function () {
                await expect(Campaign.connect(addr2).withdrawFunds()).to.be.revertedWithCustomError(Campaign, "OwnableUnauthorizedAccount");
            });
            it("should fail to withdraw incomplete campaign if not owner", async function () {
                await expect(Campaign.connect(addr2).withdrawIncompleteCampaign()).to.be.revertedWithCustomError(Campaign, "OwnableUnauthorizedAccount");
            });
            it("should fail to create TokenArt if not owner", async function () {
                await expect(Campaign.connect(addr2).createTokenArt( "TokenArt", "ART")).to.be.revertedWithCustomError(Campaign, "OwnableUnauthorizedAccount");
            });
            it("should fail to distribute tokens if not owner", async function () {
                await expect(Campaign.connect(addr2).distributeTokens()).to.be.revertedWithCustomError(Campaign, "OwnableUnauthorizedAccount");
            });
        });
        
        describe("require startCampaign conditions", function () {
            it("Should fail to start campaign already started", async function () {
                const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await startCampaign();
                await expect(Campaign.connect(owner).startCampaign()).to.be.revertedWith("Campaign has already started");
            });
        });
        describe("require contribute conditions", function () {
            beforeEach(async () => {({Campaign,USDC, owner, artist, addr2, addr3, addr4} = await setUpSmartContract());});
            it("Should fail to contribute to non-started campaign", async function () {
                await expect(Campaign.connect(addr2).contribute(100n)).to.be.revertedWith("Campaign has not started yet");
            });
            it("Should fail to contribute after deadline", async function () {
                await Campaign.connect(owner).startCampaign();
                await networkHelpers.time.increase(201);
                await expect(Campaign.connect(addr2).contribute(100n)).to.be.revertedWith("Campaign deadline has passed");
            });
            it("Should fail to contribute zero amount", async function () {
                await Campaign.connect(owner).startCampaign();
                await expect(Campaign.connect(addr2).contribute(0n)).to.be.revertedWith("Contribution must be greater than 0");
            });
            /*it("Should fail to transfer USDC failure", async function () {
                await Campaign.connect(owner).startCampaign();
                await expect(Campaign.connect(addr2).contribute(100n)).to.be.revertedWithCustomError(Campaign, `ERC20InsufficientAllowance("${Campaign.target}", 0, 100000000)`);
            });*/
        });

        describe("require withdrawFunds conditions", function () {
            it("Should fail to withdraw funds if campaign not started", async function () {
                const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await setUpSmartContract();
                await expect(Campaign.connect(owner).withdrawFunds()).to.be.revertedWith("Campaign has not started");
            });
            it("Should fail to withdraw funds before deadline", async function () {
                const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await fullyContributeCampaign();
                await expect(Campaign.connect(owner).withdrawFunds()).to.be.revertedWith("Campaign is still ongoing");
            });
            it("Should fail to withdraw funds if campaign not successful", async function () {
                const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await notFullyContributeCampaign();
                await increaseTimeToDeadline();
                await expect(Campaign.connect(owner).withdrawFunds()).to.be.revertedWith("Campaign is not completed");
            });
        });
        
        describe("require withdrawIncompleteCampaign conditions", function () {
            it("Should fail to withdraw incomplete campaign if campaign not started", async function () {
                const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await setUpSmartContract();
                await expect(Campaign.connect(owner).withdrawIncompleteCampaign()).to.be.revertedWith("Campaign has not started");
            });
            it("Should fail to withdraw incomplete campaign before deadline", async function () {
                const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await notFullyContributeCampaign();
                await expect(Campaign.connect(owner).withdrawIncompleteCampaign()).to.be.revertedWith("Campaign is still ongoing");
            });
            it("Should fail to withdraw incomplete campaign if campaign is successful", async function () {
                const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await fullyContributeCampaign();
                await increaseTimeToDeadline();
                await expect(Campaign.connect(owner).withdrawIncompleteCampaign()).to.be.revertedWith("Campaign was successful, cannot withdraw");
            });
        });

        describe("require createTokenArt conditions", function () {
            it("Should fail to create TokenArt if name is empty", async function () {
                const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await fullyContributeCampaign();
                await increaseTimeToDeadline();
                await expect(Campaign.connect(owner).createTokenArt("", "ART")).to.be.revertedWith("Token name and symbol cannot be empty");
            });
            it("Should fail to create TokenArt if symbol is empty", async function () {
                const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await fullyContributeCampaign();
                await increaseTimeToDeadline();
                await expect(Campaign.connect(owner).createTokenArt("TokenArt", "")).to.be.revertedWith("Token name and symbol cannot be empty");
            });
            it("Should fail to create TokenArt if already created", async function () {
                const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await fullyContributeCampaign();
                await increaseTimeToDeadline();
                await Campaign.connect(owner).createTokenArt("TokenArt", "ART");
                await expect(Campaign.connect(owner).createTokenArt("TokenArt", "ART")).to.be.revertedWith("TokenArt already created");
            });
            it("Should fail to create TokenArt before campaign completion", async function () {
                const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await startCampaign();
                await expect(Campaign.connect(owner).createTokenArt("TokenArt", "ART")).to.be.revertedWith("Campaign is not completed");
            });
            it("Should fail to create TokenArt before deadline", async function () {
                const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await fullyContributeCampaign();
                await expect(Campaign.connect(owner).createTokenArt("TokenArt", "ART")).to.be.revertedWith("Campaign is still active");
            });
        });
        describe("require distributeTokens conditions", function () {
            it("Should fail to distribute tokens before TokenArt creation", async function () {
                const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await fullyContributeCampaign();
                await increaseTimeToDeadline();
                await expect(Campaign.connect(owner).distributeTokens()).to.be.revertedWith("TokenArt not created");
            });
        });
    });

    describe("Event tests", function () {
        it("Should emit CampaignStarted event on campaign start", async function () {
            const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await setUpSmartContract();
            await expect(Campaign.connect(owner).startCampaign()).to.emit(Campaign, "CampaignStarted")
                .withArgs((await networkHelpers.time.latest())+1);
        });
        it("Should emit ContributionDone event on contribution", async function () {
            const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await setUpSmartContract();
            await Campaign.connect(owner).startCampaign();
            await mintUSDC(USDC, addr2, 1000n * BigInt(10 ** 6));
            await USDC.connect(addr2).approve(Campaign.target, 1000n * BigInt(10 ** 6));
            await expect(Campaign.connect(addr2).contribute(1000n)).to.emit(Campaign, "ContributionDone")
                .withArgs(addr2.address, 1000n);
        });
        it("Should emit FundsWithdrawn event on funds withdrawal", async function () {
            const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await fullyContributeCampaign();
            await increaseTimeToDeadline();
            await expect(Campaign.connect(owner).withdrawFunds()).to.emit(Campaign, "CampaignFinishedAndFundsWithdrawn")
                .withArgs(1000000n);
        });
        it("Should emit WithdrawIncompleteCampaign event on incomplete campaign withdrawal", async function () {
            const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await notFullyContributeCampaign();
            await increaseTimeToDeadline();
            await expect(Campaign.connect(owner).withdrawIncompleteCampaign()).to.emit(Campaign, "WithdrawIncompleteCampaign");
        });
        it("Should emit TokenArtCreated event on TokenArt creation", async function () {
            const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await fullyContributeCampaign();
            await increaseTimeToDeadline();
            await expect(Campaign.connect(owner).createTokenArt("TokenArt", "ART")).to.emit(Campaign, "TokenArtCreated");
        });
        it("Should emit TokensDistributed event on token distribution", async function () {
            const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await fullyContributeCampaign();
            await increaseTimeToDeadline();
            await Campaign.connect(owner).createTokenArt("TokenArt", "ART");
            const tokenArt = await Campaign.getTokenArt();
            await expect(Campaign.connect(owner).distributeTokens()).to.emit(Campaign, "TokensDistributed")
            .withArgs(tokenArt.Address);
        });
    });

    describe("Getter tests", function () {
        it("Should return TokenArt details", async function () {
            const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await fullyContributeCampaign();
            await increaseTimeToDeadline();
            await Campaign.connect(owner).createTokenArt("TokenArt", "ART");
            const tokenArt = await Campaign.getTokenArt();
            const contractAddress = await ethers.getContractAt("TokenArt", tokenArt.Address);
            expect(tokenArt.Address).to.equal(contractAddress.target);
            expect(tokenArt.name).to.equal("TokenArt");
            expect(tokenArt.symbol).to.equal("ART");
            expect(tokenArt.initialSupply).to.equal(1000000n);
            expect(tokenArt.rate).to.equal(100n);
        });
        it("Should return the contributions correctly", async function () {
            const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await fullyContributeCampaign();
            const Contributions = await Campaign.getContributions();
            expect(Contributions[0].amount).to.equal(500000n);
            expect(Contributions[1].amount).to.equal(300000n);
            expect(Contributions[2].amount).to.equal(200000n);  
        });
        it("Should return the decimals of Art Token", async function () {
            const { Campaign,USDC, owner, artist, addr2, addr3, addr4 } = await fullyContributeCampaign();
            await increaseTimeToDeadline();
            await Campaign.connect(owner).createTokenArt("TokenArt", "ART");
            const tokenArt = await Campaign.getTokenArt();
            const contractAddress = await ethers.getContractAt("TokenArt", tokenArt.Address);
            expect(await contractAddress.decimals()).to.equal(6n);
        });
    });
});