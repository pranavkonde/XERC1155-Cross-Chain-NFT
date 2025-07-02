# XERC1155 Cross-Chain NFT Example

## Project Overview

The **XERC1155** project is a cross-chain compatible ERC-1155 NFT smart contract that leverages the Router Protocol for seamless interoperability between different blockchain networks. Built on the secure foundation of Rootstock, this contract allows developers to create, transfer, and manage NFTs across multiple chains, enhancing liquidity and user experience in the decentralized application (dApp) ecosystem.

## Setup and Deployment Steps on RSK & BSC Testnets

### Prerequisites

- **MetaMask Wallet**: Ensure you have MetaMask installed and set up.
- **Testnet Tokens**: Obtain testnet tokens for RSK and BSC.

### MetaMask Configuration

1. Visit [chainlist.org](https://chainlist.org).
2. Connect your MetaMask wallet.
3. Enable "Include testnets".
4. Add the following networks:
   - **RSK Testnet** (Chain ID: 31)
   - **BNB Smart Chain Testnet** (Chain ID: 97)

### Obtain Testnet Tokens

- **For RSK Testnet**: Visit the [RSK Testnet Faucet](https://faucet.rsk.co) and enter your MetaMask address to receive tRBTC.
- **For BSC Testnet**: Visit the [BNB Smart Chain Testnet Faucet](https://testnet.binance.org/faucet-smart) and enter your MetaMask address to receive tBNB.
- **Router Protocol Testnet ROUTE Tokens**: Go to the [Router Protocol Faucet](https://faucet.routerprotocol.com) to request test ROUTE tokens.

### Compile Your Contract using Remix IDE

1. Navigate to [Remix Ethereum IDE](https://remix.ethereum.org).
2. Create a new workspace (select the Blank template).
3. Create a new file named `XERC1155.sol`.
4. Copy and paste the XERC1155 smart contract code into this file.
5. Go to the Solidity compiler tab and ensure the compiler version (0.8.0 to 0.9.0) matches your pragma statement.
6. Click **Compile XERC1155.sol**.

### Deploy the Contract on Both Chains

You will deploy the same XERC1155 contract independently on both the RSK Testnet and the BSC Testnet.

#### Deploy on RSK Testnet

1. Switch your MetaMask network to RSK Testnet.
2. In Remix, select the XERC1155 contract from the dropdown.
3. Click the **Deploy** button. A MetaMask pop-up will appear asking for constructor arguments:
   - **_uri**: Provide a base URI for your NFTs (e.g., `https://yournftproject.com/metadata/{id}.json`).
   - **gatewayAddress**: Use the Router Protocol Gateway address for RSK Testnet (verify the latest address).
   - **feePayerAddress**: Your MetaMask wallet address.
4. Confirm the transaction in MetaMask and save the deployed contract address (e.g., `XERC1155_RSK_ADDRESS`).

#### Deploy on BNB Smart Chain Testnet

1. Switch your MetaMask network to BNB Smart Chain Testnet.
2. In Remix, ensure XERC1155 is still selected.
3. Click the **Deploy** button again with the same constructor parameters as before.
4. Confirm the transaction in MetaMask and save this deployed contract address (e.g., `XERC1155_BSC_ADDRESS`).

### Post-Deployment Configuration

1. **Approve Fee-Payer Requests**: Go to the Router Protocol Explorer and connect your MetaMask wallet to approve any pending requests for your newly deployed contracts.
   
2. **Configure Cross-Chain Contract Recognition**:
   - On your RSK Testnet `XERC1155_RSK_ADDRESS` contract, call `setContractOnChain` with:
     - `chainId`: "97" (BSC Testnet's Chain ID).
     - `contractAddress`: `XERC1155_BSC_ADDRESS`.
   - On your BSC Testnet `XERC1155_BSC_ADDRESS` contract, call `setContractOnChain` with:
     - `chainId`: "31" (RSK Testnet's Chain ID).
     - `contractAddress`: `XERC1155_RSK_ADDRESS`.

## Usage Instructions for Transferring NFTs

1. **Generate Request Metadata**:
   - Call the `getRequestMetadata` function on the RSK Testnet contract to obtain the necessary metadata for the transfer.

2. **Initiate the Cross-Chain Transfer**:
   - Call the `transferCrossChain` function on the RSK Testnet contract with the following parameters:
     - `destChainId`: "97" (BSC Testnet ID).
     - `transferParams`: Include the NFT IDs, amounts, and recipient address.
     - `requestMetadata`: The metadata obtained from the previous step.
     - **Value**: Input the relayer fees amount.

3. **Verify the Transfer**:
   - Check the balance of the recipient address on the BSC Testnet to confirm the NFTs were successfully minted.

## Contract Addresses and Environment Requirements

- **RSK Testnet Gateway Address**: `0xRSK_ROUTER_GATEWAY_ADDRESS_HERE` (verify the latest address).
- **BSC Testnet Gateway Address**: `0xBSC_ROUTER_GATEWAY_ADDRESS_HERE` (verify the latest address).
- **Environment Requirements**: MetaMask wallet, testnet tokens for RSK and BSC, and Router Protocol test tokens.


