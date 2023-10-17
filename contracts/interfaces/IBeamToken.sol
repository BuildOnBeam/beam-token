// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBeamToken is IERC20, IERC20Permit {
    /// @notice Mint function
    /// @param _to Destination of the tokens
    /// @param _amount Quantity of tokens minted
    function mint(address _to, uint256 _amount) external;

    /// @notice Burn function
    /// @param _from Source of the tokens
    /// @param _amount Quantity of tokens burned
    function burn(address _from, uint256 _amount) external;
}