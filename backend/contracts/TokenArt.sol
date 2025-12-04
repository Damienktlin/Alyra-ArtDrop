// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenArt is ERC20, Ownable {
    uint public rate;// en pourcentage
    address artistAddress;
    uint256 public initialSupply;

    //création du token avec pour owner le contrat parent (ArtDrop). 
    //Pas de mint initial, le mint se fait par le contrat parent vers le contributeur à la valeur de l'investissement * rate
    constructor(string memory _name, string memory _symbol, uint256 _initialSupply, uint _rate, address _artistAddr
        ) ERC20(_name, _symbol) Ownable(msg.sender) {
            //_mint(msg.sender, _initialSupply);
            //transferOwnership(msg.sender);
            //mint un certain pourcentage (ex : 10-51%) à l'artiste? et redistribuer le reste aux contributeurs?
            rate = _rate;
            artistAddress = _artistAddr;
            initialSupply = _initialSupply;
    }

     function decimals() public pure override returns (uint8) {
        return 6; // 6 decimal en USDC
    }

    function mintTokens(address _to, uint256 _invest) external onlyOwner {
        require(totalSupply() + (_invest * rate / 100) < initialSupply, "Exceeds initial supply");
        uint256 tokensToMint = _invest * rate / 100;
        _mint(_to, tokensToMint);
    }

//function de transfert de la propriété du contrat TokenArt à l'artiste une fois la campagne terminée avec succès
    //function transferOwnershipToArtist() external onlyOwner {
        //transferOwnership(artistAddress);
    //}

}