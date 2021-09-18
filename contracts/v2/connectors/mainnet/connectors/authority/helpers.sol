pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import { DSMath } from "../../common/math.sol";
import { Basic } from "../../common/basic.sol";
import { ListInterface, AccountInterface, InstaIndexInterface } from "./interface.sol";

abstract contract Helpers is DSMath, Basic {

    function getListAddr() internal view returns (address) {
        address index = AccountInterface(address(this)).instaIndex();
        return InstaIndexInterface(index).list();
    }

    function checkAuthCount() internal view returns (uint count) {
        ListInterface listContract = ListInterface(getListAddr());
        uint64 accountId = listContract.accountID(address(this));
        count = listContract.accountLink(accountId).count;
    }
}
