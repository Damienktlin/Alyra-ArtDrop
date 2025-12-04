import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ArtdropModule", (m) => {
  const Artdrop = m.contract("ArtdropV2",["0x5FbDB2315678afecb367f032d93F642f64180aa3"]);


  return { Artdrop };
});
