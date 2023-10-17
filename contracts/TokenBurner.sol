// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./interfaces/IBeamToken.sol";

contract TokenBurner {
    IBeamToken public immutable token;

    error NoZeroAddressToken();
    event Burn(address indexed burner, uint256 amount);

    constructor(IBeamToken _token) {
        if (address(_token) == address(0)) {
            revert NoZeroAddressToken();
        }
        token = _token;
    }

    function burn() external {
        uint256 burnAmount = token.balanceOf(address(this));
        token.burn(address(this), burnAmount);
        emit Burn(msg.sender, burnAmount);
    }
}
