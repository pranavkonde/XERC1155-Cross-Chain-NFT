const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("XERC1155 Cross-Chain Tests", function () {
  let xerc1155;
  let mockGateway;
  let owner;
  let user1;
  let user2;
  let recipient;

  // Test constants
  const NFT_ID_1 = 1;
  const NFT_ID_2 = 2;
  const NFT_AMOUNT_1 = 10;
  const NFT_AMOUNT_2 = 5;
  const TEST_URI = "https://api.example.com/metadata/{id}.json";
  const DEST_CHAIN_ID = "137"; 
  const SRC_CHAIN_ID = "1";

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, recipient] = await ethers.getSigners();

    // Deploy MockGateway
    const MockGateway = await ethers.getContractFactory("MockGateway");
    mockGateway = await MockGateway.deploy();
    await mockGateway.deployed();

    // Deploy XERC1155
    const XERC1155 = await ethers.getContractFactory("XERC1155");
    xerc1155 = await XERC1155.deploy(
      TEST_URI,
      mockGateway.address,
      owner.address
    );
    await xerc1155.deployed();

    // Set up cross-chain contract addresses
    await xerc1155.setContractOnChain(DEST_CHAIN_ID, xerc1155.address);
    await xerc1155.setContractOnChain(SRC_CHAIN_ID, xerc1155.address);

    // Mint some NFTs for testing
    await xerc1155.mint(
      user1.address,
      [NFT_ID_1, NFT_ID_2],
      [NFT_AMOUNT_1, NFT_AMOUNT_2],
      "0x"
    );
  });

  describe("Contract Initialization", function () {
    it("Should set the correct owner", async function () {
      expect(await xerc1155.owner()).to.equal(owner.address);
    });

    it("Should set the correct gateway contract", async function () {
      expect(await xerc1155.gatewayContract()).to.equal(mockGateway.address);
    });

    it("Should mint initial NFTs to owner", async function () {
      expect(await xerc1155.balanceOf(owner.address, 1)).to.equal(10);
    });

    it("Should set the correct URI", async function () {
      expect(await xerc1155.uri(1)).to.equal(TEST_URI);
    });
  });

  describe("Cross-Chain Contract Management", function () {
    it("Should set contract address on chain", async function () {
      const testChainId = "56";
      const testAddress = "0x1234567890123456789012345678901234567890";
      
      await xerc1155.setContractOnChain(testChainId, testAddress);
      expect(await xerc1155.ourContractOnChains(testChainId)).to.equal(testAddress);
    });

    it("Should only allow owner to set contract on chain", async function () {
      await expect(
        xerc1155.connect(user1).setContractOnChain("56", xerc1155.address)
      ).to.be.revertedWith("only owner");
    });
  });

  describe("Request Metadata Generation", function () {
    it("Should generate correct request metadata", async function () {
      const destGasLimit = 1000000;
      const destGasPrice = 20000000000; // 20 gwei
      const ackGasLimit = 500000;
      const ackGasPrice = 15000000000; // 15 gwei
      const relayerFees = ethers.utils.parseEther("0.01");
      const ackType = 1;
      const isReadCall = false;
      const asmAddress = "0x";

      const metadata = await xerc1155.getRequestMetadata(
        destGasLimit,
        destGasPrice,
        ackGasLimit,
        ackGasPrice,
        relayerFees,
        ackType,
        isReadCall,
        asmAddress
      );

      expect(metadata).to.be.a("string");
      expect(metadata).to.not.equal("0x");
    });
  });

  describe("Cross-Chain Transfer Functions", function () {
    it("Should successfully execute transferCrossChain", async function () {
      // Check initial balances
      const initialBalance1 = await xerc1155.balanceOf(user1.address, NFT_ID_1);
      const initialBalance2 = await xerc1155.balanceOf(user1.address, NFT_ID_2);
      
      expect(initialBalance1).to.equal(NFT_AMOUNT_1);
      expect(initialBalance2).to.equal(NFT_AMOUNT_2);

      // Prepare transfer parameters
      const transferParams = {
        nftIds: [NFT_ID_1, NFT_ID_2],
        nftAmounts: [5, 3], // Transfer partial amounts
        nftData: "0x",
        recipient: ethers.utils.defaultAbiCoder.encode(["address"], [recipient.address])
      };

      // Generate request metadata
      const requestMetadata = await xerc1155.getRequestMetadata(
        1000000, // destGasLimit
        20000000000, // destGasPrice (20 gwei)
        500000, // ackGasLimit
        15000000000, // ackGasPrice (15 gwei)
        ethers.utils.parseEther("0.01"), // relayerFees
        1, // ackType
        false, // isReadCall
        "0x" // asmAddress
      );

      // Execute cross-chain transfer
      const tx = await xerc1155.connect(user1).transferCrossChain(
        DEST_CHAIN_ID,
        transferParams,
        requestMetadata,
        { value: ethers.utils.parseEther("0.01") }
      );

      await tx.wait();

      // Check that NFTs were burned from user1
      const finalBalance1 = await xerc1155.balanceOf(user1.address, NFT_ID_1);
      const finalBalance2 = await xerc1155.balanceOf(user1.address, NFT_ID_2);
      
      expect(finalBalance1).to.equal(NFT_AMOUNT_1 - 5);
      expect(finalBalance2).to.equal(NFT_AMOUNT_2 - 3);
    });

    it("Should fail transferCrossChain if contract on destination not set", async function () {
      const unknownChainId = "999";
      
      const transferParams = {
        nftIds: [NFT_ID_1],
        nftAmounts: [1],
        nftData: "0x",
        recipient: ethers.utils.defaultAbiCoder.encode(["address"], [recipient.address])
      };

      const requestMetadata = await xerc1155.getRequestMetadata(
        1000000, 20000000000, 500000, 15000000000,
        ethers.utils.parseEther("0.01"), 1, false, "0x"
      );

      await expect(
        xerc1155.connect(user1).transferCrossChain(
          unknownChainId,
          transferParams,
          requestMetadata,
          { value: ethers.utils.parseEther("0.01") }
        )
      ).to.be.revertedWith("contract on dest not set");
    });

    it("Should fail transferCrossChain if insufficient balance", async function () {
      const transferParams = {
        nftIds: [NFT_ID_1],
        nftAmounts: [NFT_AMOUNT_1 + 1], // More than available
        nftData: "0x",
        recipient: ethers.utils.defaultAbiCoder.encode(["address"], [recipient.address])
      };

      const requestMetadata = await xerc1155.getRequestMetadata(
        1000000, 20000000000, 500000, 15000000000,
        ethers.utils.parseEther("0.01"), 1, false, "0x"
      );

      await expect(
        xerc1155.connect(user1).transferCrossChain(
          DEST_CHAIN_ID,
          transferParams,
          requestMetadata,
          { value: ethers.utils.parseEther("0.01") }
        )
      ).to.be.revertedWith("ERC1155: burn amount exceeds balance");
    });
  });

  describe("Cross-Chain Receive Functions", function () {
    it("Should successfully execute iReceive and mint NFTs", async function () {
      // Check initial balance of recipient
      const initialBalance1 = await xerc1155.balanceOf(recipient.address, NFT_ID_1);
      const initialBalance2 = await xerc1155.balanceOf(recipient.address, NFT_ID_2);
      
      expect(initialBalance1).to.equal(0);
      expect(initialBalance2).to.equal(0);

      // Prepare transfer parameters for iReceive
      const transferParams = {
        nftIds: [NFT_ID_1, NFT_ID_2],
        nftAmounts: [7, 4],
        nftData: "0x",
        recipient: ethers.utils.defaultAbiCoder.encode(["address"], [recipient.address])
      };

      // Encode the packet as it would be sent from source chain
      const packet = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint256[],uint256[],bytes,bytes)"],
        [[transferParams.nftIds, transferParams.nftAmounts, transferParams.nftData, transferParams.recipient]]
      );

      // Call iReceive from gateway (simulate cross-chain message)
      const tx = await xerc1155.connect(mockGateway.address).iReceive(
        "", // requestSender (empty)
        packet,
        SRC_CHAIN_ID
      );

      const receipt = await tx.wait();

      // Check that NFTs were minted to recipient
      const finalBalance1 = await xerc1155.balanceOf(recipient.address, NFT_ID_1);
      const finalBalance2 = await xerc1155.balanceOf(recipient.address, NFT_ID_2);
      
      expect(finalBalance1).to.equal(7);
      expect(finalBalance2).to.equal(4);
    });

    it("Should fail iReceive if not called by gateway", async function () {
      const transferParams = {
        nftIds: [NFT_ID_1],
        nftAmounts: [1],
        nftData: "0x",
        recipient: ethers.utils.defaultAbiCoder.encode(["address"], [recipient.address])
      };

      const packet = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint256[],uint256[],bytes,bytes)"],
        [[transferParams.nftIds, transferParams.nftAmounts, transferParams.nftData, transferParams.recipient]]
      );

      await expect(
        xerc1155.connect(user1).iReceive("", packet, SRC_CHAIN_ID)
      ).to.be.revertedWith("only gateway");
    });

    it("Should return correct acknowledgment data from iReceive", async function () {
      const transferParams = {
        nftIds: [NFT_ID_1],
        nftAmounts: [1],
        nftData: "0x",
        recipient: ethers.utils.defaultAbiCoder.encode(["address"], [recipient.address])
      };

      const packet = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint256[],uint256[],bytes,bytes)"],
        [[transferParams.nftIds, transferParams.nftAmounts, transferParams.nftData, transferParams.recipient]]
      );

      // Use callStatic to get the return value without executing the transaction
      const returnData = await xerc1155.connect(mockGateway.address).callStatic.iReceive(
        "",
        packet,
        SRC_CHAIN_ID
      );

      // Decode the return data
      const decodedReturn = ethers.utils.defaultAbiCoder.decode(["string"], returnData);
      expect(decodedReturn[0]).to.equal(SRC_CHAIN_ID);
    });
  });

  describe("Complete Cross-Chain Flow", function () {
    it("Should complete full cross-chain transfer flow", async function () {
      // Step 1: Initial setup - user1 has NFTs
      let user1Balance1 = await xerc1155.balanceOf(user1.address, NFT_ID_1);
      let recipientBalance1 = await xerc1155.balanceOf(recipient.address, NFT_ID_1);
      
      expect(user1Balance1).to.equal(NFT_AMOUNT_1);
      expect(recipientBalance1).to.equal(0);

      // Step 2: Execute transferCrossChain (burns NFTs on source)
      const transferAmount = 6;
      const transferParams = {
        nftIds: [NFT_ID_1],
        nftAmounts: [transferAmount],
        nftData: "0x",
        recipient: ethers.utils.defaultAbiCoder.encode(["address"], [recipient.address])
      };

      const requestMetadata = await xerc1155.getRequestMetadata(
        1000000, 20000000000, 500000, 15000000000,
        ethers.utils.parseEther("0.01"), 1, false, "0x"
      );

      await xerc1155.connect(user1).transferCrossChain(
        DEST_CHAIN_ID,
        transferParams,
        requestMetadata,
        { value: ethers.utils.parseEther("0.01") }
      );

      // Verify NFTs were burned from user1
      user1Balance1 = await xerc1155.balanceOf(user1.address, NFT_ID_1);
      expect(user1Balance1).to.equal(NFT_AMOUNT_1 - transferAmount);

      // Step 3: Simulate receiving on destination chain via iReceive
      const packet = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint256[],uint256[],bytes,bytes)"],
        [[transferParams.nftIds, transferParams.nftAmounts, transferParams.nftData, transferParams.recipient]]
      );

      await xerc1155.connect(mockGateway.address).iReceive(
        "",
        packet,
        SRC_CHAIN_ID
      );

      // Verify NFTs were minted to recipient
      recipientBalance1 = await xerc1155.balanceOf(recipient.address, NFT_ID_1);
      expect(recipientBalance1).to.equal(transferAmount);
    });

    it("Should handle multiple NFT IDs in cross-chain transfer", async function () {
      const transferAmounts = [3, 2];
      const transferParams = {
        nftIds: [NFT_ID_1, NFT_ID_2],
        nftAmounts: transferAmounts,
        nftData: "0x",
        recipient: ethers.utils.defaultAbiCoder.encode(["address"], [recipient.address])
      };

      // Check initial state
      expect(await xerc1155.balanceOf(user1.address, NFT_ID_1)).to.equal(NFT_AMOUNT_1);
      expect(await xerc1155.balanceOf(user1.address, NFT_ID_2)).to.equal(NFT_AMOUNT_2);
      expect(await xerc1155.balanceOf(recipient.address, NFT_ID_1)).to.equal(0);
      expect(await xerc1155.balanceOf(recipient.address, NFT_ID_2)).to.equal(0);

      // Execute cross-chain transfer
      const requestMetadata = await xerc1155.getRequestMetadata(
        1000000, 20000000000, 500000, 15000000000,
        ethers.utils.parseEther("0.01"), 1, false, "0x"
      );

      await xerc1155.connect(user1).transferCrossChain(
        DEST_CHAIN_ID,
        transferParams,
        requestMetadata,
        { value: ethers.utils.parseEther("0.01") }
      );

      // Simulate receiving on destination
      const packet = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint256[],uint256[],bytes,bytes)"],
        [[transferParams.nftIds, transferParams.nftAmounts, transferParams.nftData, transferParams.recipient]]
      );

      await xerc1155.connect(mockGateway.address).iReceive("", packet, SRC_CHAIN_ID);

      // Verify final state
      expect(await xerc1155.balanceOf(user1.address, NFT_ID_1)).to.equal(NFT_AMOUNT_1 - transferAmounts[0]);
      expect(await xerc1155.balanceOf(user1.address, NFT_ID_2)).to.equal(NFT_AMOUNT_2 - transferAmounts[1]);
      expect(await xerc1155.balanceOf(recipient.address, NFT_ID_1)).to.equal(transferAmounts[0]);
      expect(await xerc1155.balanceOf(recipient.address, NFT_ID_2)).to.equal(transferAmounts[1]);
    });
  });

  describe("Helper Functions", function () {
    it("Should correctly convert bytes to address", async function () {
      // This tests the internal toAddress function indirectly through iReceive
      const testAddress = user2.address;
      const encodedAddress = ethers.utils.defaultAbiCoder.encode(["address"], [testAddress]);
      
      const transferParams = {
        nftIds: [NFT_ID_1],
        nftAmounts: [1],
        nftData: "0x",
        recipient: encodedAddress
      };

      const packet = ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint256[],uint256[],bytes,bytes)"],
        [[transferParams.nftIds, transferParams.nftAmounts, transferParams.nftData, transferParams.recipient]]
      );

      await xerc1155.connect(mockGateway.address).iReceive("", packet, SRC_CHAIN_ID);

      // Verify the NFT was minted to the correct address
      expect(await xerc1155.balanceOf(testAddress, NFT_ID_1)).to.equal(1);
    });
  });

  describe("Access Control", function () {
    it("Should only allow owner to mint NFTs", async function () {
      await expect(
        xerc1155.connect(user1).mint(user1.address, [3], [5], "0x")
      ).to.be.revertedWith("only owner");
    });

    it("Should only allow owner to set gateway", async function () {
      const newGateway = user2.address;
      await expect(
        xerc1155.connect(user1).setGateway(newGateway)
      ).to.be.revertedWith("only owner");
    });

    it("Should only allow owner to set dapp metadata", async function () {
      await expect(
        xerc1155.connect(user1).setDappMetadata(user1.address)
      ).to.be.revertedWith("only owner");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero amount transfers", async function () {
      const transferParams = {
        nftIds: [NFT_ID_1],
        nftAmounts: [0],
        nftData: "0x",
        recipient: ethers.utils.defaultAbiCoder.encode(["address"], [recipient.address])
      };

      const requestMetadata = await xerc1155.getRequestMetadata(
        1000000, 20000000000, 500000, 15000000000,
        ethers.utils.parseEther("0.01"), 1, false, "0x"
      );

      // This should not fail but also not change balances
      await xerc1155.connect(user1).transferCrossChain(
        DEST_CHAIN_ID,
        transferParams,
        requestMetadata,
        { value: ethers.utils.parseEther("0.01") }
      );

      // Balances should remain unchanged
      expect(await xerc1155.balanceOf(user1.address, NFT_ID_1)).to.equal(NFT_AMOUNT_1);
    });

    it("Should handle empty arrays", async function () {
      const transferParams = {
        nftIds: [],
        nftAmounts: [],
        nftData: "0x",
        recipient: ethers.utils.defaultAbiCoder.encode(["address"], [recipient.address])
      };

      const requestMetadata = await xerc1155.getRequestMetadata(
        1000000, 20000000000, 500000, 15000000000,
        ethers.utils.parseEther("0.01"), 1, false, "0x"
      );

      await xerc1155.connect(user1).transferCrossChain(
        DEST_CHAIN_ID,
        transferParams,
        requestMetadata,
        { value: ethers.utils.parseEther("0.01") }
      );

      // Should complete without error
    });
  });
});

// test/integration/CrossChainIntegration.test.js
describe("Cross-Chain Integration Tests", function () {
  let sourceChainContract;
  let destChainContract;
  let mockGateway;
  let owner;
  let user;
  let recipient;

  const NFT_ID = 1;
  const NFT_AMOUNT = 10;
  const TRANSFER_AMOUNT = 5;
  const SOURCE_CHAIN_ID = "1";
  const DEST_CHAIN_ID = "137";

  beforeEach(async function () {
    [owner, user, recipient] = await ethers.getSigners();

    // Deploy mock gateway
    const MockGateway = await ethers.getContractFactory("MockGateway");
    mockGateway = await MockGateway.deploy();

    // Deploy contracts for both chains
    const XERC1155 = await ethers.getContractFactory("XERC1155");
    
    sourceChainContract = await XERC1155.deploy(
      "https://source.com/{id}.json",
      mockGateway.address,
      owner.address
    );

    destChainContract = await XERC1155.deploy(
      "https://dest.com/{id}.json",
      mockGateway.address,
      owner.address
    );

    // Set up cross-chain mappings
    await sourceChainContract.setContractOnChain(DEST_CHAIN_ID, destChainContract.address);
    await destChainContract.setContractOnChain(SOURCE_CHAIN_ID, sourceChainContract.address);

    // Mint NFTs on source chain
    await sourceChainContract.mint(user.address, [NFT_ID], [NFT_AMOUNT], "0x");
  });

  it("Should complete end-to-end cross-chain transfer", async function () {
    // Initial state
    expect(await sourceChainContract.balanceOf(user.address, NFT_ID)).to.equal(NFT_AMOUNT);
    expect(await destChainContract.balanceOf(recipient.address, NFT_ID)).to.equal(0);

    // Step 1: Transfer from source chain
    const transferParams = {
      nftIds: [NFT_ID],
      nftAmounts: [TRANSFER_AMOUNT],
      nftData: "0x",
      recipient: ethers.utils.defaultAbiCoder.encode(["address"], [recipient.address])
    };

    const requestMetadata = await sourceChainContract.getRequestMetadata(
      1000000, 20000000000, 500000, 15000000000,
      ethers.utils.parseEther("0.01"), 1, false, "0x"
    );

    await sourceChainContract.connect(user).transferCrossChain(
      DEST_CHAIN_ID,
      transferParams,
      requestMetadata,
      { value: ethers.utils.parseEther("0.01") }
    );

    // Step 2: Verify burn on source chain
    expect(await sourceChainContract.balanceOf(user.address, NFT_ID)).to.equal(NFT_AMOUNT - TRANSFER_AMOUNT);

    // Step 3: Simulate receive on destination chain
    const packet = ethers.utils.defaultAbiCoder.encode(
      ["tuple(uint256[],uint256[],bytes,bytes)"],
      [[transferParams.nftIds, transferParams.nftAmounts, transferParams.nftData, transferParams.recipient]]
    );

    await destChainContract.connect(mockGateway.address).iReceive("", packet, SOURCE_CHAIN_ID);

    // Step 4: Verify mint on destination chain
    expect(await destChainContract.balanceOf(recipient.address, NFT_ID)).to.equal(TRANSFER_AMOUNT);

    // Final state verification
    expect(await sourceChainContract.balanceOf(user.address, NFT_ID)).to.equal(NFT_AMOUNT - TRANSFER_AMOUNT);
    expect(await destChainContract.balanceOf(recipient.address, NFT_ID)).to.equal(TRANSFER_AMOUNT);
  });
});
