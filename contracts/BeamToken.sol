// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "./interfaces/IBeamToken.sol";

contract BeamToken is Context, AccessControlEnumerable, ERC20Votes, IBeamToken {
    bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 private constant BURNER_ROLE = keccak256("BURNER_ROLE");

    error NoRole();
    error EmptyName();
    error EmptySymbol();
    error NoSelfMinting();
    error NoTransferToSelf();

    modifier onlyHasRole(bytes32 _role) {
        if(!hasRole(_role, msg.sender)) { 
            revert NoRole();
        }
        _;
    }

    constructor(string memory _name, string memory _symbol) ERC20Permit(_name) ERC20(_name, _symbol) {
        if(bytes(_name).length == 0) { 
            revert EmptyName();
        }
        if(bytes(_symbol).length == 0) { 
            revert EmptySymbol();
        }
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);  
    }

    function mint(address _to, uint256 _amount) onlyHasRole(MINTER_ROLE) override external {
        if(_to ==address(this)) {
            revert NoSelfMinting();
        }
        _mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) onlyHasRole(BURNER_ROLE) override external {
        _burn(_from, _amount);
    }

    function _transfer(address _from, address _to, uint256 _amount) internal override {
        if(_to == address(this)) {
            revert NoTransferToSelf();
        }
        super._transfer(_from, _to, _amount);
    }
    
}