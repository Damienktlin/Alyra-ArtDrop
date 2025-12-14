// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TokenArt.sol";

contract Campaign is Ownable {
    uint32 multiplier = 10 ** 6; // USDC a 6 décimales
    IERC20 public immutable usdc;
    Tokenart tokenArt;
    

    struct CampaignDetails {
        string name;
        string description;
        address artist;
        uint256 fundsGoal; // en USDC
        uint256 fundsRaised; // en USDC
        uint256 deadline;
        uint256 startTime;
        bool isCompleted;
        uint256 initialSupply;
    }
    struct Contribution {
        uint256 amount;
        address contributor;
    }

    struct Tokenart {
        string name;
        string symbol;
        uint256 initialSupply;
        uint256 rate;
        address Address;
    }
    CampaignDetails campaignDetails;
    Contribution[] contributions;
    
    event CampaignStarted(uint256 startTime);
    event ContributionDone(address contributor, uint256 amount);
    event CampaignFinishedAndFundsWithdrawn(uint256 amount);
    event WithdrawIncompleteCampaign();
    event TokenArtCreated(address tokenArtAddress);
    event TokensDistributed(address tokenArtAddress);

    constructor(
        address _usdc,
        string memory _name,
        string memory _description,
        address _artist,
        uint256 _fundsGoal,
        uint256 _deadline,
        uint256 _initialSupply,
        address _owner
    ) Ownable(_owner) {
        usdc = IERC20(_usdc);
        campaignDetails.name = _name;
        campaignDetails.description = _description;
        campaignDetails.artist = _artist;
        campaignDetails.fundsGoal = _fundsGoal;
        campaignDetails.deadline = _deadline;
        campaignDetails.isCompleted = false;
        campaignDetails.startTime = 0;
        campaignDetails.fundsRaised = 0;
        campaignDetails.initialSupply = _initialSupply;
    }

    // ------ GETTERS -------//

    function getCampaignDetails() external view returns (CampaignDetails memory) {
        return campaignDetails;
    }
    function getTokenArt() external view returns (Tokenart memory) {
        return tokenArt;
    }
    function getContributions() external view returns (Contribution[] memory) {
        return contributions;
    }
    //------------------------------//
    // ------ MAIN FUNCTIONS -------//
    function startCampaign() external onlyOwner {
        require(campaignDetails.startTime == 0, "Campaign has already started");
        campaignDetails.startTime = block.timestamp;
        emit CampaignStarted(block.timestamp);
    }

    function contribute(uint256 _amount) external {
        require(campaignDetails.startTime > 0, "Campaign has not started yet");
        require(block.timestamp <= campaignDetails.startTime + campaignDetails.deadline, "Campaign deadline has passed");
        require(_amount >= 10, "Contribution must be greater than 10");
        require(usdc.transferFrom(msg.sender, address(this), _amount * multiplier), "USDC transfer failed");
        campaignDetails.fundsRaised += _amount;
        contributions.push(Contribution({
            amount: _amount,
            contributor: msg.sender
        }));
        tokenArt.rate = campaignDetails.fundsGoal * 100 / campaignDetails.fundsRaised;
        if (campaignDetails.fundsRaised >= campaignDetails.fundsGoal) {
            campaignDetails.isCompleted = true;
        }
        emit ContributionDone(msg.sender, _amount);
    }
    function withdrawFunds() external onlyOwner returns (bool success) {
        require(campaignDetails.startTime != 0, "Campaign has not started");
        require(block.timestamp > campaignDetails.startTime + campaignDetails.deadline, "Campaign is still ongoing");
        require(campaignDetails.isCompleted, "Campaign is not completed");
        uint256 amount = campaignDetails.fundsRaised;
        campaignDetails.fundsRaised = 0;
        success = usdc.transfer(campaignDetails.artist, amount * multiplier);
        
        emit CampaignFinishedAndFundsWithdrawn(amount);
        return success;
    }

    function withdrawIncompleteCampaign() external onlyOwner {
        require(campaignDetails.startTime != 0, "Campaign has not started");
        require(block.timestamp > campaignDetails.startTime + campaignDetails.deadline, "Campaign is still ongoing");
        require(!campaignDetails.isCompleted, "Campaign was successful, cannot withdraw");
        
        for (uint256 i = 0; i < contributions.length; i++) {
            usdc.transfer(contributions[i].contributor, contributions[i].amount * multiplier);
        }
        campaignDetails.startTime = 0;
        emit WithdrawIncompleteCampaign();

    }
    
    function createTokenArt (string memory _tokenName, string memory _tokenSymbol) external onlyOwner {
        require(bytes(_tokenName).length > 0 && bytes(_tokenSymbol).length > 0, "Token name and symbol cannot be empty");
        require(tokenArt.Address == address(0), "TokenArt already created");
        require(campaignDetails.isCompleted, "Campaign is not completed");
        require(block.timestamp > campaignDetails.startTime + campaignDetails.deadline, "Campaign is still active");
        
        TokenArt tokenArtERC20 = new TokenArt(_tokenName, _tokenSymbol, campaignDetails.initialSupply * multiplier, tokenArt.rate, campaignDetails.artist);
       
        tokenArt.name = _tokenName;
        tokenArt.symbol = _tokenSymbol;
        tokenArt.initialSupply = campaignDetails.initialSupply;
        tokenArt.Address = address(tokenArtERC20);
        emit TokenArtCreated(address(tokenArtERC20));
    }
    
    function distributeTokens() external onlyOwner {
        require(tokenArt.Address != address(0), "TokenArt not created");
        TokenArt tokenArtInstance = TokenArt(tokenArt.Address);
        for (uint256 i = 0; i < contributions.length; i++) {
            tokenArtInstance.mintTokens(contributions[i].contributor, contributions[i].amount * multiplier);
        }
        emit TokensDistributed(tokenArt.Address);
    }
}