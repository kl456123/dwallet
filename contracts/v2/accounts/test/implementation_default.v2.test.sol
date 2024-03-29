// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

pragma experimental ABIEncoderV2;

interface IndexInterface {
    function list() external view returns (address);
}

interface CheckInterface {
    function isOk() external view returns (bool);
}

interface ListInterface {
    function addAuth(address user) external;
    function removeAuth(address user) external;
}

contract CommonSetup {
    uint public constant implementationVersion = 2;
    // InstaIndex Address.
    address public immutable instaIndex;
    // The Account Module Version.
    uint public constant version = 2;
    // Auth Module(Address of Auth => bool).
    mapping (address => bool) internal auth;
    // Is shield true/false.
    bool public shield;
    // Auth Module(Address of Auth => bool).
    mapping (address => bool) internal checkMapping;

    constructor(address _instaIndex) {
        instaIndex = _instaIndex;
    }
}

contract Record is CommonSetup {
    constructor(address _instaIndex) CommonSetup(_instaIndex) {}

    event LogEnableUser(address indexed user);
    event LogDisableUser(address indexed user);
    event LogSwitchShield(bool _shield);
    event LogCheckMapping(address user, bool check);

    /**
     * @dev Check for Auth if enabled.
     * @param user address/user/owner.
     */
    function isAuth(address user) public view returns (bool) {
        return auth[user];
    }

    /**
     * @dev Change Shield State.
    */
    function switchShield(bool _shield) external {
        require(auth[msg.sender], "not-self");
        require(shield != _shield, "shield is set");
        shield = _shield;
        emit LogSwitchShield(shield);
    }

    function editCheckMapping(address user, bool _bool) public {
        require(msg.sender == address(this), "not-self-index");
        require(user != address(0), "not-valid");
        checkMapping[user] = _bool;
        emit LogCheckMapping(user, _bool);
    }

    /**
     * @dev Enable New User.
     * @param user Owner of the Smart Account.
    */
    function enable(address user) public {
        require(msg.sender == address(this) || msg.sender == instaIndex || isAuth(msg.sender), "not-self-index");
        require(user != address(0), "not-valid");
        require(!auth[user], "already-enabled");
        auth[user] = true;
        ListInterface(IndexInterface(instaIndex).list()).addAuth(user);
        emit LogEnableUser(user);
    }

    /**
     * @dev Disable User.
     * @param user Owner of the Smart Account.
    */
    function disable(address user) public {
        require(msg.sender == address(this) || isAuth(msg.sender), "not-self");
        require(user != address(0), "not-valid");
        require(auth[user], "already-disabled");
        delete auth[user];
        ListInterface(IndexInterface(instaIndex).list()).removeAuth(user);
        emit LogDisableUser(user);
    }

}

contract InstaDefaultImplementationV2 is Record {
    constructor(address _instaIndex) Record(_instaIndex) {}

    receive() external payable {}
}
