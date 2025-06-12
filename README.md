# XERC1155 Cross-Chain NFT Example

This project provides a demonstration of a cross-chain ERC-1155 non-fungible token (NFT) smart contract using the [Router Protocol's](https://www.routerprotocol.com/) CrossTalk library. The `XERC1155` contract allows for the minting, burning, and transferring of ERC-1155 tokens across different blockchain networks.

## Project Structure

The project is organized as a standard Hardhat development environment:

-   `/contracts`: Contains the Solidity smart contracts.
    -   `XERC1155.sol`: The core cross-chain ERC-1155 contract.
    -   `MockGateway.sol`: A mock contract that simulates the Router Protocol Gateway for local testing.
-   `/scripts`: Contains deployment scripts.
    -   `deploy.js`: A Hardhat script to deploy the contracts to a local network.
-   `/node_modules`: Stores the project's dependencies, including `@openzeppelin/contracts` and `@routerprotocol/evm-gateway-contracts`.
-   `hardhat.config.js`: The Hardhat configuration file.
-   `package.json`: Defines the project's dependencies and scripts.

## Setup and Installation

1.  **Clone the repository (if applicable) or ensure you have the project files.**

2.  **Install the necessary dependencies using npm:**
    ```bash
    npm install
    ```

## Compilation

To compile the smart contracts, run the following Hardhat command. This will generate the necessary ABI and bytecode in the `/artifacts` directory.

```bash
npx hardhat compile
```

## Local Deployment and Testing

To deploy and test the contracts on a local development network, follow these steps:

1.  **Start a local Hardhat node:**
    Open a new terminal window and run the following command. This will start a local blockchain instance for testing.

    ```bash
    npx hardhat node
    ```
    Keep this terminal window running.

2.  **Deploy the contracts:**
    In your original terminal window, run the deployment script. This script will deploy the `MockGateway` and then the `XERC1155` contract to the local Hardhat node.

    ```bash
    npx hardhat run scripts/deploy.js --network localhost
    ```

You should see output indicating the successful deployment of both contracts, along with their addresses on the local network.

### Example Deployment Output:

```
Deploying contracts with the account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Account balance: 10000000000000000000000
MockGateway deployed to: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
XERC1155 deployed to: 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
```

## Contract Overview: `XERC1155.sol`

-   **`constructor`**: Initializes the contract, setting the ERC-1155 token URI, the Router Gateway address, and minting some initial tokens for the contract deployer.
-   **`transferCrossChain(...)`**: The core function for initiating a cross-chain transfer. It burns the specified NFTs on the source chain and sends a request via the Router Gateway to mint them on the destination chain.
-   **`iReceive(...)`**: The handler function that is called by the Router Gateway on the destination chain. It receives the payload from the source chain, decodes it, and mints the new NFTs for the recipient.
-   **`setContractOnChain(...)`**: Allows the owner to register the contract's address on other chains, which is used for authentication during cross-chain requests.
-   **`mint(...)`**: An owner-only function to mint new NFTs on the same chain.
