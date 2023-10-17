// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./interfaces/IBeamToken.sol";

contract Migrator {
    IBeamToken public immutable source;
    IBeamToken public immutable destination;
    uint256 public immutable migrationRate;
    uint256 private constant DECIMAL_PRECISION = 1e18;

    error NoSourceZeroAddress();
    error NoDestinationZeroAddress();
    error NoZeroRate();
    
    event Migrated(address indexed migrant, uint256 indexed destinationAmount);

    constructor(IBeamToken _source, IBeamToken _destination, uint256 _migrationRate) {
        if(address(_source) == address(0)) {
            revert NoSourceZeroAddress();
        }
        if(address(_destination) == address(0)) {
            revert NoDestinationZeroAddress();
        }
        if(_migrationRate == 0) {
            revert NoZeroRate();
        }
        source = _source;
        destination = _destination;
        migrationRate = _migrationRate;
    }

    function migrate(uint256 _sourceAmount) external {
        uint256 destinationAmount = _sourceAmount * migrationRate / DECIMAL_PRECISION;
        source.burn(msg.sender, _sourceAmount);
        destination.mint(msg.sender, destinationAmount);
        emit Migrated(msg.sender, destinationAmount);
    }
}