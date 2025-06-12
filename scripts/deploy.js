const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log(
    "Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );

  // Deploy a mock gateway for local testing.
  const mockGateway = await ethers.deployContract("MockGateway");
  await mockGateway.waitForDeployment();
  const gatewayAddress = await mockGateway.getAddress();
  console.log("MockGateway deployed to:", gatewayAddress);

  // Deploy XERC1155
  const xerc1155 = await ethers.deployContract("XERC1155", [
    "ipfs://my-nft-uri/", // _uri
    gatewayAddress, // gatewayAddress
    "router1..._fee_payer_address", // feePayerAddress (a router chain address)
  ]);

  await xerc1155.waitForDeployment();

  console.log("XERC1155 deployed to:", await xerc1155.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 