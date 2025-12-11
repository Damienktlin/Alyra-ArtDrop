import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ArtdropModule", (m) => {
  const Artdrop = m.contract("Artdrop",["0x0cb3B91C26A7D589D7218E5a8cD61c6Aa5338A30"]);


  return { Artdrop };
});
