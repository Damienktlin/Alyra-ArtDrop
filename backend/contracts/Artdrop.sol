// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TokenArt.sol";

contract Artdrop is Ownable {
    IERC20 public immutable usdc;
    uint32 public campaignCount;
    uint32 multiplier = 10 ** 6; // USDC a 6 décimales

    struct Campaign {
        string name;
        string description;
        address artist;
        uint256 fundsGoal; // en USDC
        uint256 fundsRaised; // en USDC
        uint256 deadline;
        uint256 startTime;
        bool isCompleted;
        uint256 initialSupply;
        bool campaignExists;
    }
    struct Tokenart {
        string name;
        string symbol;
        uint256 initialSupply;
        uint256 rate;
        address Address;
    }
    struct Contribution {
        uint256 amount;
        address contributor;
    }

    mapping (uint32 => Campaign) campaigns;
    mapping (uint32 => Contribution[]) contributions;
    mapping (uint32 => Tokenart) tokenArts;

    event CampaignCreated(uint32 campaignId, string name, address artist, uint256 fundsGoal, uint256 deadline);
    event CampaignStarted(uint32 campaignId, uint256 startTime);
    event ContributionDone(address contributor, uint32 campaignId, uint256 amount);
    event CampaignFinishedAndFundsWithdrawn(uint32 campaignId, uint256 amount);
    event WithdrawIncompleteCampaign(uint32 campaignId);
    event TokenArtCreated(uint32 campaignId, address tokenArtAddress);
    event TokensDistributed(uint32 campaignId);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    modifier campaignExists(uint32 _id) {
        require(campaigns[_id].campaignExists, "Campaign does not exist");
        _;
    }

    // campaign number 0 does not exist
    function createCampaign(string memory _name, string memory _description, address _artist, uint256 _fundsGoal, uint256 _deadline, uint256 _initialSupply) public onlyOwner {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_artist != address(0), "Invalid artist address");
        require(_fundsGoal > 0, "Funds goal must be greater than 0");
        require(_deadline > 0, "Deadline must be greater than 0");
        require(_initialSupply > 0, "Initial supply must be greater than 0");
        campaignCount++;
        uint32 _id = campaignCount;
        campaigns[_id] = Campaign({
            name: _name,
            description: _description,
            artist: _artist,
            fundsGoal: _fundsGoal,
            fundsRaised: 0,
            deadline: _deadline,
            startTime: 0,
            isCompleted: false,
            initialSupply: _initialSupply,
            campaignExists: true
        });
        emit CampaignCreated(_id, _name, _artist, _fundsGoal, _deadline);
    }
    // ------ GETTERS -------//
    //view? pure? frais de gas?
    function getRemainingTime(uint32 _id) external view campaignExists(_id) returns (uint256) {
        Campaign storage campaign = campaigns[_id];
        require(campaign.startTime != 0, "Campaign has not started yet");
        uint256 endTime = campaign.startTime + campaign.deadline;
        if (block.timestamp >= endTime) {
            return 0;
        } else {
            return endTime - block.timestamp;
        }
    }
    function getCampaign(uint32 _id) external view campaignExists(_id) returns (Campaign memory) {
        return campaigns[_id];
    }
    function getContributions(uint32 _id) external view campaignExists(_id) returns (Contribution[] memory) {
        return contributions[_id];
    }
    function getTokenArt(uint32 _id) external view returns (Tokenart memory) {
        require(tokenArts[_id].Address != address(0), "TokenArt not created");
        return tokenArts[_id];
    }
    //------------------------------//
    // ------ MAIN FUNCTIONS -------//
    function startCampaign(uint32 _id) external onlyOwner campaignExists(_id) {
        require(campaigns[_id].startTime == 0, "Campaign has already started");
        campaigns[_id].startTime = block.timestamp;
        emit CampaignStarted(_id, block.timestamp);
    }

    function contribute(uint32 _id, uint256 _amount) external campaignExists(_id) {
        Campaign storage campaign = campaigns[_id];
        require(campaign.startTime != 0, "Campaign has not started yet");
        require(block.timestamp <= campaign.startTime + campaign.deadline, "Campaign has ended");//time 
        require(_amount > 0, "Contribution must be greater than 0");//minimum?
        require(usdc.transferFrom(msg.sender, address(this), _amount * multiplier), "USDC transfer failed");
        campaign.fundsRaised += _amount;
        contributions[_id].push(Contribution({
            amount: _amount,
            contributor: msg.sender
        }));
        if (campaign.fundsRaised >= campaign.fundsGoal) {
            campaign.isCompleted = true;
        }
        emit ContributionDone(msg.sender, _id, _amount);
    }

    function withdrawFunds(uint32 _id) external onlyOwner campaignExists(_id) returns (bool success) {
        Campaign storage campaign = campaigns[_id];
        require(block.timestamp > campaign.startTime + campaign.deadline, "Campaign is still ongoing");
        require(campaign.isCompleted, "Campaign is not completed");
        //require(msg.sender == campaign.artist, "Only the artist can withdraw funds");

        uint256 amount = campaign.fundsRaised;
        campaign.fundsRaised = 0;
        //usdc.approve(msg.sender, amount * multiplier);
        success = usdc.transfer(campaign.artist, amount * multiplier);
        
        emit CampaignFinishedAndFundsWithdrawn(_id, amount);
        return success;//type of success?
    }

    function withdrawIncompleteCampaign(uint32 _id) external onlyOwner campaignExists(_id) {
        Campaign storage campaign = campaigns[_id];
        require(campaign.startTime != 0, "Campaign has not started");
        require(block.timestamp > campaign.startTime + campaign.deadline, "Campaign is still ongoing");
        require(!campaign.isCompleted, "Campaign was successful, cannot withdraw");
        
        //Contribution[] storage contribs = contributions[_id];
        //contributions[_id] = new Contribution[](0); // Reset contributions before transferring to prevent re-entrancy
        for (uint256 i = 0; i < contributions[_id].length; i++) {
            usdc.transfer(contributions[_id][i].contributor, contributions[_id][i].amount * multiplier);
        }
        campaign.startTime = 0;
        emit WithdrawIncompleteCampaign(_id);

    }
    //inutile 
    /*function closeCampaign (uint256 _id) external onlyOwner {
        Campaign storage campaign = campaigns[_id];
        require(campaign.isCompleted, "Campaign is not completed");
        require(block.timestamp > campaign.startTime + campaign.deadline, "Campaign is still ongoing");

        tokenArts[_id].rate = campaign.fundsGoal * 100 / campaign.fundsRaised; // calcul du rate en pourcentage
        campaign.isActive = false;
    }*/
    function createTokenArt (uint32 _id, string memory _tokenName, string memory _tokenSymbol) external onlyOwner campaignExists(_id) {
        Campaign storage campaign = campaigns[_id];
        require(campaign.isCompleted, "Campaign is not completed");
        require(block.timestamp > campaign.startTime + campaign.deadline, "Campaign is still active");
        uint256 rate = campaign.fundsGoal * 100 / campaign.fundsRaised;
        TokenArt tokenArt = new TokenArt(_tokenName, _tokenSymbol, campaign.initialSupply, rate, campaign.artist);
        //tokenArt.transferOwnership(address(this));
        tokenArts[_id] = Tokenart({
            name: _tokenName,
            symbol: _tokenSymbol,
            initialSupply: campaign.initialSupply,
            rate: rate,
            Address: address(tokenArt)
        });
        emit TokenArtCreated(_id, address(tokenArt));
    }
    // a voir si je garde cette fonction et la mettre dans le createTokenArt
    function distributeTokens(uint32 _id) external onlyOwner {
        require(tokenArts[_id].Address != address(0), "TokenArt not created");

        TokenArt tokenArt = TokenArt(tokenArts[_id].Address);
        for (uint256 i = 0; i < contributions[_id].length; i++) {
            tokenArt.mintTokens(contributions[_id][i].contributor, contributions[_id][i].amount * multiplier);
        }
        emit TokensDistributed(_id);
    }

}
