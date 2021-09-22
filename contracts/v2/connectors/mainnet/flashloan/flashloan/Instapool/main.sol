pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "hardhat/console.sol";
import { Helper } from "./helpers.sol";

import {
  IndexInterface,
  ListInterface,
  TokenInterface,
  Account,
  Actions,
  Types,
  ISoloMargin,
  ICallee,
  DSAInterface
} from "./interfaces.sol";

import { DydxFlashloanBase } from "./dydxBase.sol";

contract DydxFlashloaner is Helper, ICallee, DydxFlashloanBase {
  using SafeERC20 for IERC20;


  event LogFlashLoan(
    address indexed dsa,
    address token,
    uint256 amount,
    uint route
  );

  event LogWhitelistSig(bytes4 indexed sig, bool whitelist);

  /**
   * @dev Check if sig is whitelisted
   * @param _sig bytes4
   */
  function checkWhitelisted(bytes4 _sig) public view returns(bool) {
    return whitelistedSigs[_sig];
  }


  /**
   * @dev Whitelists / Blacklists a given sig
   * @param _sigs list of sigs
   * @param _whitelist list of bools indicate whitelist/blacklist
   */
  function whitelistSigs(bytes4[] memory _sigs, bool[] memory _whitelist) public isMaster {
    require(_sigs.length == _whitelist.length, "arr-lengths-unequal");
    for (uint i = 0; i < _sigs.length; i++) {
      require(!whitelistedSigs[_sigs[i]], "already-enabled");
      whitelistedSigs[_sigs[i]] = _whitelist[i];
      emit LogWhitelistSig(_sigs[i], _whitelist[i]);
    }
  }

  function updateMakerConnect(address _makerConnect) external isMaster {
    require(_makerConnect != address(0), "not-valid-address");
    makerConnect = _makerConnect;
  }

  function updateAaveV2Connect(address _aaveV2Connect) external isMaster {
    require(_aaveV2Connect != address(0), "not-valid-address");
    aaveV2Connect = _aaveV2Connect;
  }

  function updateCompoundConnect(address _compoundConnect) external isMaster {
    require(_compoundConnect != address(0), "not-valid-address");
    compoundConnect = _compoundConnect;
  }

  function callFunction(
    address sender,
    Account.Info memory account,
    bytes memory data
  ) public override {
    require(sender == address(this), "not-same-sender");
    require(msg.sender == soloAddr, "not-solo-dydx-sender");
    CastData memory cd;
    (cd.dsa, cd.route, cd.token, cd.amount, cd.callData) = abi.decode(
      data,
      (address, uint256, address, uint256, bytes)
    );
    uint value0;
    uint value1;
    bool isWeth = (cd.route != 0 && cd.token != wethAddr) || cd.token == ethAddr;
    if(cd.token==ethAddr){
      value0 = wethContract.balanceOf(address(this));
    }else{
      value0 = IERC20(cd.token).balanceOf(address(this));
    }
    if (isWeth) {
      uint value = wethContract.balanceOf(address(this));
      console.log('swap %s amount of weth to eth', value);
      wethContract.withdraw(value);
    }

    console.log("Select borrow %s amount of %s using route: %s", cd.amount, cd.token, cd.route);
    selectBorrow(cd.route, cd.token, cd.amount);

    if (cd.token == ethAddr) {
      payable(cd.dsa).transfer(cd.amount);
    } else {
      IERC20(cd.token).safeTransfer(cd.dsa, cd.amount);
    }

    Address.functionCall(cd.dsa, cd.callData, "DSA-flashloan-fallback-failed");

    console.log("Select payback");
    selectPayback(cd.route, cd.token);

    if (isWeth) {
      uint value = address(this).balance;
      console.log('swap %s amount of eth back to weth', value);
      wethContract.deposit{value: value}();
    }

  if(cd.token==ethAddr){
      value1 = wethContract.balanceOf(address(this));
    }else{
      value1 = IERC20(cd.token).balanceOf(address(this));
    }
    uint loss;
    if(value0>value1){
     loss = sub(value0, value1);
    }else{
     loss = sub(value1, value0);
    }
    console.log('%s loss amount during flashloan in eth', loss);
  }

  function routeDydx(address token, uint256 amount, uint256 route, bytes memory data) internal {
    uint256 _amount = amount;

    address _token = token == ethAddr ? wethAddr : token;
    if (route != 0) {
      uint256 dydxWEthAmt = wethContract.balanceOf(soloAddr);
      _amount = sub(dydxWEthAmt, 10000);
      _token = wethAddr;
    }

    IERC20 _tokenContract = IERC20(_token);
    uint256 _marketId = _getMarketIdFromTokenAddress(soloAddr, _token);

    _tokenContract.approve(soloAddr, _amount + 2);

    Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

    operations[0] = _getWithdrawAction(_marketId, _amount);
    operations[1] = _getCallAction(encodeDsaCastData(msg.sender, route, token, amount, data));
    operations[2] = _getDepositAction(_marketId, _amount + 2);

    Account.Info[] memory accountInfos = new Account.Info[](1);
    accountInfos[0] = _getAccountInfo();

    uint256 initialBal = add(_tokenContract.balanceOf(address(this)), address(this).balance);
    console.log('solo operation start with balance: .', initialBal);

    solo.operate(accountInfos, operations);

    uint256 finalBal = add(_tokenContract.balanceOf(address(this)), address(this).balance);
    console.log('solo operation end with balance.', finalBal);

    if (_token == wethAddr) {
      uint256 _dif = wmul(_amount, 10000000000); // Taking margin of 0.00000001%
      require(sub(initialBal, finalBal) <= _dif, "eth-amount-paid-less");
    } else {
      uint256 _decimals = TokenInterface(token).decimals();
      uint _dif = wmul(convertTo18(_amount, _decimals), 200000000000); // Taking margin of 0.0000002%
      require(convertTo18(sub(initialBal, finalBal), _decimals) <= _dif, "token-amount-paid-less");
    }

    emit LogFlashLoan(
      msg.sender,
      token,
      amount,
      route
    );

  }

  function initiateFlashLoan(
    address token,
    uint256 amount,
    uint256 route,
    bytes calldata data
  ) external isDSA isWhitelisted(data) {
    routeDydx(token, amount, route, data);
  }
}

contract InstaPoolV2Implementation is DydxFlashloaner {
  function initialize(
    uint256 _vaultId,
    address _makerConnect,
    address _aaveV2Connect,
    address _instaIndex,
    address _instaList
  ) public {
    require(vaultId == 0 && makerConnect == address(0) && aaveV2Connect == address(0) &&
            address(instaIndex) == address(0) && address(instaList) == address(0), "already-Initialized");
    wethContract.approve(wethAddr, uint256(-1));
    vaultId = _vaultId;
    makerConnect = _makerConnect;
    aaveV2Connect = _aaveV2Connect;

    instaIndex = IndexInterface(_instaIndex);
    instaList = ListInterface(_instaList);
  }

  receive() external payable {}
}
