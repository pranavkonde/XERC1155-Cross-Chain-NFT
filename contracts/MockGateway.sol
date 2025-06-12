// SPDX-License-Identifier: Unlicensed
pragma solidity >=0.8.0 <0.9.0;

import "@routerprotocol/evm-gateway-contracts/contracts/IGateway.sol";

contract MockGateway is IGateway {
    function iSend(
        uint256,
        uint256,
        string calldata,
        string calldata,
        bytes calldata,
        bytes calldata
    ) external payable override returns (uint256) {
        return 1;
    }

    function setDappMetadata(
        string memory
    ) external payable override returns (uint256) {
        return 1;
    }

    function currentVersion() external view override returns (uint256) {
        return 1;
    }
} 