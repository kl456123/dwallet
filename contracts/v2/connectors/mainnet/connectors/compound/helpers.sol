pragma solidity ^0.7.0;

import { DSMath } from "../../common/math.sol";
import { Basic } from "../../common/basic.sol";
import { ComptrollerInterface, CompoundMappingInterface } from "./interface.sol";

abstract contract Helpers is DSMath, Basic {
    /**
     * @dev Compound Comptroller
     */
    ComptrollerInterface internal constant troller = ComptrollerInterface(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B);

    /**
     * @dev Compound Mapping
     */
    function getCompMapping()internal view returns(CompoundMappingInterface _instaMapping){
      _instaMapping = CompoundMappingInterface(getMemory().getBroadcastAddr(uint(keccak256("COMPMAPPING"))));
      require(address(_instaMapping)!=address(0), "COMPMAPPING address is unkown!");
    }

    /**
     * @dev enter compound market
     */
    function enterMarket(address cToken) internal {
        address[] memory markets = troller.getAssetsIn(address(this));
        bool isEntered = false;
        for (uint i = 0; i < markets.length; i++) {
            if (markets[i] == cToken) {
                isEntered = true;
            }
        }
        if (!isEntered) {
            address[] memory toEnter = new address[](1);
            toEnter[0] = cToken;
            troller.enterMarkets(toEnter);
        }
    }
}
