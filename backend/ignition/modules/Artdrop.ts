import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ArtdropModule", (m) => {
  const Artdrop = m.contract("Artdrop",["0x67d269191c92Caf3cD7723F116c85e6E9bf55933"]);


  return { Artdrop };
});
