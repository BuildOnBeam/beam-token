// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "./interfaces/IBeamToken.sol";

contract BeamToken is AccessControlEnumerable, ERC20Votes, IBeamToken {
    bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 private constant BURNER_ROLE = keccak256("BURNER_ROLE");

    error NoRole();
    error NoSelfMinting();
    error NoTransferToSelf();

    modifier onlyHasRole(bytes32 _role) {
        if (!hasRole(_role, msg.sender)) {
            revert NoRole();
        }
        _;
    }

    constructor(string memory _name, string memory _symbol) ERC20Permit(_name) ERC20(_name, _symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address _to, uint256 _amount) external override onlyHasRole(MINTER_ROLE) {
        if (_to == address(this)) {
            revert NoSelfMinting();
        }
        _mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) external override onlyHasRole(BURNER_ROLE) {
        _burn(_from, _amount);
    }

    function _transfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal override {
        if (_to == address(this)) {
            revert NoTransferToSelf();
        }
        super._transfer(_from, _to, _amount);
    }
}
