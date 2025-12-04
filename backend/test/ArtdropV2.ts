import { expect } from "chai";
import { network } from "hardhat";

const { ethers} = await network.connect();

async function setUpSmartContract() {
  const [owner, artist] = await ethers.getSigners();  
  const USDC = await ethers.deployContract("MockUSDC");
  //console.log("Mock USDC deployed to:", USDC.target);
  const Artdrop = await ethers.deployContract("ArtdropV2", [USDC.target]);
  //console.log("Artdrop deployed to:", Artdrop.target);
  return { Artdrop,owner, artist};
}

describe("ArtdropV2", function () {
    let Artdrop: any;
    let owner: any;
    let artist: any;
    beforeEach(async () => {({Artdrop, owner, artist} = await setUpSmartContract());});
  it("Should create a campaign", async function () {
    await Artdrop.connect(owner).createCampaign("Campaign 1", "Description 1", artist.address, 10000, 200, 10000);
    const campaignDetails = await Artdrop.getCampaign(1);
    const CampaignContract = await ethers.getContractAt("Campaign", campaignDetails.campaignContract);
    console.log("Campaign 1 deployed to:", CampaignContract.target, "by owner:", await CampaignContract.owner());
    expect(campaignDetails.name).to.equal("Campaign 1");
    expect(campaignDetails.campaignContract).to.equal(CampaignContract.target);
    expect(await CampaignContract.owner()).to.equal(owner.address);
  });
  it("Should fail to create a campaign by non-owner", async function () {
    await expect(Artdrop.connect(artist).createCampaign("Campaign 1", "Description 1", artist.address, 10000, 200, 10000))
      .to.be.revertedWithCustomError(Artdrop, "OwnableUnauthorizedAccount");
  });
  it("Should fail to create a campaign with empty name", async function () {
    await expect(Artdrop.connect(owner).createCampaign("", "Description 1", artist.address, 10000, 200, 10000))
      .to.be.revertedWith("Name cannot be empty");
  });
  it("Should fail to create a campaign with empty description", async function () {
    await expect(Artdrop.connect(owner).createCampaign("Campaign 1", "", artist.address, 10000, 200, 10000))
      .to.be.revertedWith("Description cannot be empty");
  });
  it("Should fail to create a campaign with invalid artist address", async function () {
    await expect(Artdrop.connect(owner).createCampaign("Campaign 1", "Description 1", ethers.ZeroAddress, 10000, 200, 10000))
      .to.be.revertedWith("Invalid artist address");
  });
  it("Should fail to create a campaign with zero initial supply", async function () {
    await expect(Artdrop.connect(owner).createCampaign("Campaign 1", "Description 1", artist.address, 10000, 200, 0))
      .to.be.revertedWith("Initial supply must be greater than 0");
  });
  it("Should emit CampaignCreated event on campaign creation", async function () {
    await expect(Artdrop.connect(owner).createCampaign("Campaign 1", "Description 1", artist.address, 10000, 200, 10000))
      .to.emit(Artdrop, "CampaignCreated")
  });
});