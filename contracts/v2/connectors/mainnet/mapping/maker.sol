pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

interface CTokenInterface {
    function underlying() external view returns (address);
}

interface GemJoinInterface {
    function ilk() external view returns (bytes32);
}

interface ConnectorsInterface {
    function chief(address) external view returns (bool);
}

interface IndexInterface {
    function master() external view returns (address);
}


contract Helpers {
    address public immutable connectors;
    address public immutable instaIndex;
    uint public version = 1;

    mapping (address => address) public cTokenMapping;
    mapping (bytes32 => address) public gemJoinMapping;

    event LogAddCTokenMapping(address[] cTokens);
    event LogAddGemJoinMapping(address[] gemJoin);

    constructor(address _instaIndex, address _connectors) {
        connectors = _connectors;
        instaIndex = _instaIndex;
    }

    modifier isChief {
        require(
            ConnectorsInterface(connectors).chief(msg.sender) ||
            IndexInterface(instaIndex).master() == msg.sender, "not-Chief");
        _;
    }
    function addCtknMapping(address[] memory cTkn) public isChief {
        require(cTkn.length > 0, "No-CToken-Address");
        for (uint i = 0; i < cTkn.length; i++) {
            address cErc20 = cTkn[i];
            address erc20 = CTokenInterface(cErc20).underlying();
            require(cTokenMapping[erc20] == address(0), "Token-Already-Added");
            cTokenMapping[erc20] = cErc20;
        }
        emit LogAddCTokenMapping(cTkn);
    }


    function addGemJoinMapping(address[] memory gemJoins) public isChief {
        require(gemJoins.length > 0, "No-GemJoin-Address");
        for (uint i = 0; i < gemJoins.length; i++) {
            address gemJoin = gemJoins[i];
            bytes32 ilk = GemJoinInterface(gemJoin).ilk();
            require(gemJoinMapping[ilk] == address(0), "GemJoin-Already-Added");
            gemJoinMapping[ilk] = gemJoin;
        }
        emit LogAddGemJoinMapping(gemJoins);
    }
}


contract InstaMapping is Helpers {
    string constant public name = "Compound-And-Maker-Mapping-v1";
    constructor(address _instaIndex, address _connectors) Helpers(_instaIndex, _connectors) {
        address ethAddress = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
        address cEth = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;
        cTokenMapping[ethAddress] = cEth;
    }
}


