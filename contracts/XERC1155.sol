// SPDX-License-Identifier: Unlicensed
pragma solidity >=0.8.0 <0.9.0;

import "@routerprotocol/evm-gateway-contracts/contracts/IDapp.sol";
import "@routerprotocol/evm-gateway-contracts/contracts/IGateway.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/// @title XERC1155
/// @notice A cross-chain ERC-1155 smart contract to demonstrate how one can create
/// cross-chain NFT contracts using Router CrossTalk.
contract XERC1155 is ERC1155, IDapp {
  address public owner; // Owner of the contract
  IGateway public gatewayContract; // Address of the Router Protocol Gateway contract

  // Mapping to store the addresses of our contract on other chains for access control
  mapping(string => string) public ourContractOnChains;

  // Struct to define the parameters for an NFT transfer
  struct TransferParams {
    uint256[] nftIds; // Array of NFT IDs to transfer
    uint256[] nftAmounts; // Array of corresponding amounts for each NFT ID
    bytes nftData; // Additional data for the NFT (e.g., metadata updates)
    bytes recipient; // Encoded address of the recipient on the destination chain
  }

  // Constructor: Initializes the ERC-1155 URI, sets the Gateway, owner, and mints initial NFTs
  constructor(
    string memory _uri,
    address payable gatewayAddress,
    string memory feePayerAddress // Router Chain fee payer (can be any EVM address or Router wallet address)
  ) ERC1155(_uri) {
    gatewayContract = IGateway(gatewayAddress);
    owner = msg.sender;

    // Minting initial NFTs for testing purposes
    _mint(msg.sender, 1, 10, "");

    // Set dapp metadata on the Gateway contract, typically for fee payment configuration
    gatewayContract.setDappMetadata(feePayerAddress);
  }

  /// @notice Function to set the fee payer address on Router Chain.
  /// @param feePayerAddress address of the fee payer on Router Chain.
  function setDappMetadata(string memory feePayerAddress) external {
    require(msg.sender == owner, "only owner");
    gatewayContract.setDappMetadata(feePayerAddress);
  }

  /// @notice Function to update the Router Gateway Contract address.
  /// @param gateway address of the new Gateway contract.
  function setGateway(address gateway) external {
    require(msg.sender == owner, "only owner");
    gatewayContract = IGateway(gateway);
  }

  /// @notice Function to mint new NFTs (only callable by the owner).
  /// @param account The address to mint NFTs to.
  /// @param nftIds An array of NFT IDs to mint.
  /// @param amounts An array of corresponding amounts for each NFT ID.
  /// @param nftData Additional data for the NFTs.
  function mint(
    address account,
    uint256[] memory nftIds,
    uint256[] memory amounts,
    bytes memory nftData
  ) external {
    require(msg.sender == owner, "only owner");
    _mintBatch(account, nftIds, amounts, nftData);
  }

  /// @notice Function to set the address of our NFT contracts on different chains.
  /// This is crucial for access control and verification when a cross-chain request is received.
  /// @param chainId Chain ID of the destination chain in string format (e.g., "31" for RSK).
  /// @param contractAddress Address of the NFT contract on the destination chain in string format.
  function setContractOnChain(
    string calldata chainId,
    string calldata contractAddress
  ) external {
    require(msg.sender == owner, "only owner");
    ourContractOnChains[chainId] = contractAddress;
  }

  /// @notice Function to generate a cross-chain NFT transfer request.
  /// This function burns NFTs on the source chain and initiates a request to mint them on the destination.
  /// @param destChainId Chain ID of the destination chain in string.
  /// @param transferParams Struct containing NFT IDs, amounts, data, and recipient address.
  /// @param requestMetadata abi-encoded metadata according to source and destination chains (gas limits, relayer fees, etc.)
  function transferCrossChain(
    string calldata destChainId,
    TransferParams calldata transferParams,
    bytes calldata requestMetadata
  ) public payable {
    // Ensure the contract address on the destination chain is set for verification
    require(
      keccak256(abi.encodePacked(ourContractOnChains[destChainId])) !=
        keccak256(abi.encodePacked("")),
      "contract on dest not set"
    );

    // Burn the NFTs from the user's address on the SOURCE chain.
    // This prevents double-spending and secures the transfer.
    _burnBatch(msg.sender, transferParams.nftIds, transferParams.nftAmounts);

    // Encode the TransferParams struct into a packet for the destination chain.
    bytes memory packet = abi.encode(transferParams);
    // Encode the destination contract address and the packet into the final requestPacket.
    bytes memory requestPacket = abi.encode(
      ourContractOnChains[destChainId], // The address of our XERC1155 contract on the destination chain
      packet
    );

    // Call Router Gateway's iSend function to initiate the cross-chain request.
    // 'value' is for relayer fees.
    gatewayContract.iSend{ value: msg.value }(
      1, // Type: 1 for cross-chain execution request
      0, // Route type (0 for default)
      string(""), // Request sender (empty for now)
      destChainId, // Destination chain ID
      requestMetadata, // Encoded metadata (gas limits, fees, etc.)
      requestPacket // The actual payload to be sent
    );
  }

  /// @notice Function to get the request metadata to be used while initiating a cross-chain request.
  /// This helps in calculating and encoding the necessary parameters for the cross-chain call.
  /// @return requestMetadata abi-encoded metadata according to source and destination chains
  function getRequestMetadata(
    uint64 destGasLimit, // Gas limit for execution on the destination chain
    uint64 destGasPrice, // Gas price for execution on the destination chain
    uint64 ackGasLimit,  // Gas limit for acknowledgment on the source chain
    uint64 ackGasPrice,  // Gas price for acknowledgment on the source chain
    uint128 relayerFees, // Fees for the Router Protocol relayer network
    uint8 ackType,       // Acknowledgment type (e.g., 0 for no ack, 1 for basic ack)
    bool isReadCall,     // True if the call is a read-only operation (doesn't change state)
    bytes memory asmAddress // Address for Additional Security Module (advanced use case)
  ) public pure returns (bytes memory) {
    bytes memory requestMetadata = abi.encodePacked(
      destGasLimit,
      destGasPrice,
      ackGasLimit,
      ackGasPrice,
      relayerFees,
      ackType,
      isReadCall,
      asmAddress
    );
    return requestMetadata;
  }

  /// @notice Function to handle the cross-chain request received from some other chain.
  /// This function is called by the Router Gateway contract on the destination chain.
  /// @param packet The payload sent by the source chain contract when the request was created.
  /// @param srcChainId Chain ID of the source chain in string.
  function iReceive(
    string memory /* requestSender */, // Sender of the request (ignored in this example)
    bytes memory packet,
    string memory srcChainId
  ) external override returns (bytes memory) {
    // IMPORTANT: Only the Router Gateway contract should be able to call this function.
    require(msg.sender == address(gatewayContract), "only gateway");

    // Decode our payload (the TransferParams struct).
    TransferParams memory transferParams = abi.decode(packet, (TransferParams));

    // Mint the NFTs to the specified recipient on the DESTINATION chain.
    _mintBatch(
      toAddress(transferParams.recipient), // Convert bytes to address
      transferParams.nftIds,
      transferParams.nftAmounts,
      transferParams.nftData
    );

    return abi.encode(srcChainId); // Return source chain ID as acknowledgment data
  }

  /// @notice Function to handle the acknowledgment received from the destination chain
  /// back on the source chain. This function is typically used for tracking purposes.
  /// @param requestIdentifier Event nonce which is received when we create a cross-chain request.
  /// @param execFlag A boolean value suggesting whether the call was successfully
  /// executed on the destination chain.
  /// @param execData Returning the data returned from the iReceive function of the destination chain.
  function iAck(
    uint256 requestIdentifier,
    bool execFlag,
    bytes memory execData
  ) external override {
    // This function can be implemented to update local state based on acknowledgment.
    // For this basic NFT transfer, we don't need complex logic here.
  }

  /// @notice Helper function to convert bytes to an address.
  /// @param _bytes Bytes to be converted.
  /// @return addr Address pertaining to the bytes.
  function toAddress(bytes memory _bytes) internal pure returns (address addr) {
    bytes20 srcTokenAddress;
    assembly {
      srcTokenAddress := mload(add(_bytes, 0x20))
    }
    addr = address(srcTokenAddress);
  }
} 