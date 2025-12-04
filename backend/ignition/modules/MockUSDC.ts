import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MockUSDCModule", (m) => {
  const MockUSDC = m.contract("MockUSDC");


  return { MockUSDC };
});
