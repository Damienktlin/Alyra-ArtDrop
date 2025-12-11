// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import './Campaign.sol';

contract Artdrop is Ownable {
    address public usdc;
    uint32 public campaignCount;
    uint32 multiplier = 10 ** 6; // USDC a 6 décimales

    struct CampaignDetails {
        string name;
        address campaignContract;
    }

    mapping (uint32 => CampaignDetails) campaigns;

    event CampaignCreated(uint32 campaignId, string name, address campaignAddress);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = _usdc;
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
        Campaign campaignContract = new Campaign(usdc, _name, _description, _artist, _fundsGoal, _deadline, _initialSupply, msg.sender);
        campaigns[_id] = CampaignDetails({
            name: _name,
            campaignContract: address(campaignContract)
        });
        emit CampaignCreated(_id, _name, address(campaignContract));
    }
    // ------ GETTERS -------//
 
    function getCampaign(uint32 _id) external view returns (CampaignDetails memory) {
        return campaigns[_id];
    }
}
