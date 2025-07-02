const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying MockGateway...");

  // Get the ContractFactory and Signers here.
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy MockGateway
  const MockGateway = await ethers.getContractFactory("MockGateway");
  const mockGateway = await MockGateway.deploy();
  await mockGateway.deployed();

  console.log("MockGateway deployed to:", mockGateway.address);
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    mockGateway: {
      address: mockGateway.address,
      deployer: deployer.address,
      blockNumber: await ethers.provider.getBlockNumber(),
      timestamp: new Date().toISOString()
    }
  };

  console.log("Deployment completed:", deploymentInfo);
  return mockGateway.address;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

module.exports = main;

// scripts/deploy-xerc1155.js
const { ethers } = require("hardhat");

async function deployXERC1155(mockGatewayAddress) {
  console.log("Deploying XERC1155...");

  // Get the ContractFactory and Signers here.
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy XERC1155
  const XERC1155 = await ethers.getContractFactory("XERC1155");
  
  // Constructor parameters
  const uri = "https://api.example.com/metadata/{id}.json"; // Replace with your metadata URI
  const gatewayAddress = mockGatewayAddress;
  const feePayerAddress = deployer.address; // Using deployer as fee payer

  const xerc1155 = await XERC1155.deploy(
    uri,
    gatewayAddress,
    feePayerAddress
  );
  
  await xerc1155.deployed();

  console.log("XERC1155 deployed to:", xerc1155.address);
  console.log("Constructor parameters:");
  console.log("- URI:", uri);
  console.log("- Gateway Address:", gatewayAddress);
  console.log("- Fee Payer Address:", feePayerAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    xerc1155: {
      address: xerc1155.address,
      deployer: deployer.address,
      gatewayAddress: gatewayAddress,
      uri: uri,
      feePayerAddress: feePayerAddress,
      blockNumber: await ethers.provider.getBlockNumber(),
      timestamp: new Date().toISOString()
    }
  };

  console.log("Deployment completed:", deploymentInfo);
  return xerc1155.address;
}

async function main() {
  // First deploy MockGateway (or use existing address)
  let mockGatewayAddress;
  
  // Check if MockGateway address is provided as argument
  if (process.argv.length > 2) {
    mockGatewayAddress = process.argv[2];
    console.log("Using existing MockGateway at:", mockGatewayAddress);
  } else {
    // Deploy MockGateway first
    const deployMockGateway = require('./deploy-mock-gateway');
    mockGatewayAddress = await deployMockGateway();
  }

  // Deploy XERC1155
  const xerc1155Address = await deployXERC1155(mockGatewayAddress);

  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("MockGateway:", mockGatewayAddress);
  console.log("XERC1155:", xerc1155Address);
}

// Run deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deployXERC1155, main };

// scripts/deploy-complete.js
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("=== COMPLETE DEPLOYMENT SCRIPT ===");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const networkName = hre.network.name;
  console.log("Network:", networkName);

  // Step 1: Deploy MockGateway
  console.log("\n1. Deploying MockGateway...");
  const MockGateway = await ethers.getContractFactory("MockGateway");
  const mockGateway = await MockGateway.deploy();
  await mockGateway.deployed();
  console.log("✅ MockGateway deployed to:", mockGateway.address);

  // Step 2: Deploy XERC1155
  console.log("\n2. Deploying XERC1155...");
  const XERC1155 = await ethers.getContractFactory("XERC1155");
  
  const uri = "https://api.example.com/metadata/{id}.json";
  const feePayerAddress = deployer.address;

  const xerc1155 = await XERC1155.deploy(
    uri,
    mockGateway.address,
    feePayerAddress
  );
  await xerc1155.deployed();
  console.log("✅ XERC1155 deployed to:", xerc1155.address);

  // Step 3: Verification setup (optional)
  console.log("\n3. Setting up contract configurations...");
  
  // Example: Set contract addresses for cross-chain (you can modify chain IDs as needed)
  const chainIds = ["1", "56", "137"]; // Ethereum, BSC, Polygon
  const contractAddresses = [xerc1155.address, xerc1155.address, xerc1155.address];
  
  for (let i = 0; i < chainIds.length; i++) {
    try {
      const tx = await xerc1155.setContractOnChain(chainIds[i], contractAddresses[i]);
      await tx.wait();
      console.log(`✅ Contract address set for chain ${chainIds[i]}`);
    } catch (error) {
      console.log(`⚠️  Could not set contract for chain ${chainIds[i]}:`, error.message);
    }
  }

  // Step 4: Save deployment information
  const deploymentData = {
    network: networkName,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    contracts: {
      MockGateway: {
        address: mockGateway.address,
        contractName: "MockGateway"
      },
      XERC1155: {
        address: xerc1155.address,
        contractName: "XERC1155",
        constructorArgs: {
          uri: uri,
          gatewayAddress: mockGateway.address,
          feePayerAddress: feePayerAddress
        }
      }
    }
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment data
  const deploymentFile = path.join(deploymentsDir, `${networkName}-deployment.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

  console.log("\n=== DEPLOYMENT COMPLETED ===");
  console.log("📄 Deployment info saved to:", deploymentFile);
  console.log("📋 Contract Addresses:");
  console.log("   MockGateway:", mockGateway.address);
  console.log("   XERC1155:", xerc1155.address);
  
  // Verification commands (you can run these manually)
  console.log("\n🔍 Verification Commands:");
  console.log(`npx hardhat verify --network ${networkName} ${mockGateway.address}`);
  console.log(`npx hardhat verify --network ${networkName} ${xerc1155.address} "${uri}" "${mockGateway.address}" "${feePayerAddress}"`);

  return {
    mockGateway: mockGateway.address,
    xerc1155: xerc1155.address
  };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
