//    Use DSA, you can do anything you want in defi in a very easy and convenient way.
// For example, alice want to buy 600usd value eth, but she has only 200 usdc, so she
// can borrow 400 usdc from pool to buy eth, then deposit eth to lending protocol(Compound
// or Aave) to borrow 400 usdc to payback to pool.
// 200 usdc(alice) + 400 usdc(borrowed from pool) ==swap==> 600usd valued eth ==deposit=>
// compound ==borrow==> 400usdc(borrowed from compound) ==payback==>pool
// now alice make success to use 200 usdc to buy 600 usd valued eth deposited in compound.
// then she can get back if 400 usdc valued debt is cleared
//
const { TOKEN_ADDR } = require('../test/utils/constants');

const IERC20 = artifacts.require('IERC20');
const InstaIndex = artifacts.require('InstaIndex'); // dsa manager
const InstaImplementationM1 = artifacts.require('InstaImplementationM1'); // dsa api
const CTokenInterface = artifacts.require('OnlyCTokenInterface');

// mapping
const connectMapping = {
  '1INCH-A': 'ConnectV2OneInch',
  '1INCH-B': 'ConnectV2OneProto',
  'AAVE-V1-A': 'ConnectV2AaveV1',
  'AAVE-V2-A': 'ConnectV2AaveV2',
  'AUTHORITY-A': 'ConnectV2Auth',
  'BASIC-A': 'ConnectV2Basic',
  'COMP-A': 'ConnectV2COMP',
  'COMPOUND-A': 'ConnectV2Compound',
  'DYDX-A': 'ConnectV2Dydx',
  'FEE-A': 'ConnectV2Fee',
  'GELATO-A': 'ConnectV2Gelato',
  'INSTAPOOL-A': 'ConnectV2InstaPool',
  'UNISWAP-A': 'ConnectV2UniswapV2'
};

const cUsdcAddr = "0x39aa39c021dfbae8fac545936693ac917d5e7563";
const address_zero = "0x0000000000000000000000000000000000000000"
const ethAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
const daiAddr = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const usdcAddr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const cEthAddr = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5"
const cDaiAddr = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"
const maxValue = "115792089237316195423570985008687907853269984665640564039457584007913129639935"

const erc20Tokens = [];
const debtsTokens = [];
const erc20Address = [TOKEN_ADDR.USDC.contract];
const erc20Names = ['USDC'];
const erc20Decimals = [TOKEN_ADDR.USDC.decimals];
const debtsNames = ['cUSDC', 'cETH'];
const debtsDecimals = [8, 8];

function decodeEvent(receipt, abi, eventName, eventArgs, castEvents) {
  const requiredEventABI = abi.filter(a => a.type === "event").find(a => a.name === eventName)
  if (!requiredEventABI) throw new Error(`${eventName} not found`)
  const eventHash = web3.utils.keccak256(`${requiredEventABI.name}(${requiredEventABI.inputs.map(
    a => a.type).toString()})`);
  // console.log(receipt.logs);
  const requiredEvent = receipt.logs.find(a => a.topics[0] === eventHash);
  if(!requiredEvent)throw new Error(`event of hash: ${eventHash} not found`);
  const decodedEvent = web3.eth.abi.decodeLog(requiredEventABI.inputs,
    requiredEvent.data, requiredEvent.topics);
  return decodedEvent;
};

async function advanceBlock(){
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_mine",
      id: new Date().getTime()
    }, (err, result) => {
      if (err) { return reject(err); }
      const newBlockHash = web3.eth.getBlock('latest').hash;

      return resolve(newBlockHash)
    });
  });
}


async function checkAccount(account){
  // print block number for timestamp
  console.log('block number: ', await web3.eth.getBlockNumber());
  // eth
  console.log('ETH 现金账户: ', formatUnits(await web3.eth.getBalance(account), 18).toString());
  // asset tokens
  await Promise.all(erc20Tokens.map(async (token, id)=>{
    const balance = await token.balanceOf(account);
    console.log(erc20Names[id], ' 现金账户: ', formatUnits(balance, erc20Decimals[id]).toString());
  }));


  // debt tokens
  await Promise.all(debtsTokens.map(async (tokenContract, id)=>{
    const collateredBalance = await tokenContract.balanceOf(account);
    const borrowBalance = await tokenContract.borrowBalanceStored(account);
    console.log(debtsNames[id], ' ctoken质押账户: ', formatUnits(collateredBalance, debtsDecimals[id]).toString());
    console.log(debtsNames[id], ' token贷款账户: ', formatUnits(borrowBalance, debtsDecimals[id]).toString());
  }));
}

// create dsa from user
async function buildDSAv2(owner) {
  const instaIndex = await InstaIndex.deployed();
  const receipt = await instaIndex.build(owner, 1, owner);
  const event = receipt.logs[0]
  if(!event)throw new Error('no event found in tx');
  return await InstaImplementationM1.at(event.args.account);
};

// get tokens for test
async function impersonateAndTransfer(amt, token, toAddr) {
  const contract = await IERC20.at(token.contract);
  await contract.transfer(toAddr, amt, {from: token.holder});
  const balance = await contract.balanceOf(toAddr);
}

function formatUnits(amount, decimals){
  return amount;
  // const toBN = web3.utils.toBN;
  // return toBN(amount).div(toBN(10).pow(toBN(decimals)));
}

function parseUnits(amount, decimals){
  const toBN = web3.utils.toBN;
  return toBN(amount).mul(toBN(10).pow(toBN(decimals)));
}

async function init(wallet){
  const dsaWallet = await buildDSAv2(wallet);
  await web3.eth.sendTransaction({
    from: wallet,
    to: dsaWallet.address,
    value: web3.utils.toWei("10", "ether")
  });

  await impersonateAndTransfer(parseUnits(2000, TOKEN_ADDR.DAI.decimals), TOKEN_ADDR.DAI, dsaWallet.address);
  await impersonateAndTransfer(parseUnits(2000, TOKEN_ADDR.USDC.decimals), TOKEN_ADDR.USDC, dsaWallet.address);
  await impersonateAndTransfer(parseUnits(200, TOKEN_ADDR.WETH.decimals), TOKEN_ADDR.WETH, dsaWallet.address);
  await impersonateAndTransfer(parseUnits(2000, TOKEN_ADDR.USDT.decimals), TOKEN_ADDR.USDT, dsaWallet.address);

  cUsdcContract = await CTokenInterface.at(cUsdcAddr);
  cEthContract = await CTokenInterface.at(cEthAddr);
  debtsTokens.push(cUsdcContract);
  debtsTokens.push(cEthContract);

  await Promise.all(erc20Address.map(async addr=>{
    erc20Tokens.push(await IERC20.at(addr));
  }));


  return dsaWallet;
}

function encodeFlashcastData(spells) {
  const encodeSpellsData = encodeSpells(spells);
  const targetType = "string[]";
  let argTypes = [targetType, "bytes[]"];
  return web3.eth.abi.encodeParameters(argTypes, [
    encodeSpellsData[0],
    encodeSpellsData[1],
  ]);
}

function encodeSpells(spells){
  const targets = spells.map(a => a.connector)
  const calldatas = spells.map(a => {
    const functionName = a.method;
    const abis = artifacts.require(connectMapping[a.connector]).abi;

    const abi = abis.find(b => {
      return b.name === functionName
    });
    if (!abi) throw new Error("Couldn't find function")
    return web3.eth.abi.encodeFunctionCall(abi, a.args)
  })
  return [targets, calldatas];
}

/**
 * @param route, flashloan source route. (0: dYdX(ETH,DAI,USDC only),
 *      1: MakerDAO(DAI only), 2: Compound(All borrowable tokens in Compound),
 *      3: AaveV2(All borrowable tokens in AaveV2))
 * @param cash token owned by user
 * @param dsaWallet dsa account owned by user
 * @param wallet user account address
 * @param ratio equals to (cash + loan)/ cash
 */
async function buy(cash, ratio, dsaWallet, wallet, route=0){
  const total = parseUnits(200 * ratio, TOKEN_ADDR.USDC.decimals);
  const loan = parseUnits(200 * (ratio-1), TOKEN_ADDR.USDC.decimals);

  const IdOne = "2878734423"
  const IdTwo = "783243246"

  const spells = [
    {
      connector: "UNISWAP-A",
      method: "sell",
      args: [ethAddr, usdcAddr, total, 0, 0, IdOne],// margin trade
    },
    {
      connector: "COMPOUND-A",
      method: "deposit",
      args: ["ETH-A", 0, IdOne, 0]
    },
    {
      connector: "COMPOUND-A",
      method: "borrow",
      args: ["USDC-A", loan, 0, 0], // borrow usdt, note use token id here
    },
    {
      connector: "INSTAPOOL-A",
      method: "flashPayback",
      args: [usdcAddr, loan, 0, 0],
    }
  ]

  const calldata = encodeFlashcastData(spells);

  const spells2 = [
    {
      connector: "INSTAPOOL-A",
      method: "flashBorrowAndCast",
      args: [
        usdcAddr,
        loan,
        route, // route
        calldata,
      ],
    }
  ]

  await dsaWallet.cast(...encodeSpells(spells2), wallet, {from: wallet});
}


async function sell(debt, dsaWallet, wallet, route=0){
  const IdOne = "12515";
  const IdTwo = "12122";
  const spells = [
    {
      connector: "COMPOUND-A",
      method: "payback",
      args: ["USDC-A", maxValue, 0, IdOne]
    },
    {
      connector: "COMPOUND-A",
      method: "withdraw",
      args: ["ETH-A", maxValue, 0, IdTwo]
    },
    {
      connector: "UNISWAP-A",
      method: "sell",
      args: [usdcAddr, ethAddr, 0, 0, IdTwo, 0],// sell all
    },
    {
      connector: "INSTAPOOL-A",
      method: "flashPayback",
      args: [usdcAddr, debt, 0, 0],
    }
  ]

  const calldata = encodeFlashcastData(spells);

  const spells2 = [
    {
      connector: "INSTAPOOL-A",
      method: "flashBorrowAndCast",
      args: [
        usdcAddr,
        debt,
        route, // route
        calldata,
      ],
    }
  ]

  await dsaWallet.cast(...encodeSpells(spells2), wallet, {from: wallet});
}

async function swap(amt, dsaWallet, wallet){
  const spells = [
    {
      connector: "UNISWAP-A",
      method: "sell",
      args: [
        ethAddr,
        usdcAddr,
        parseUnits(amt, TOKEN_ADDR.USDC.decimals),
        0,
        0,
        0
      ]
    }
  ];
  await dsaWallet.cast(...encodeSpells(spells), wallet, {from: wallet});
}

async function payback(amt, dsaWallet, wallet){
  let _amt;
  if (amt == -1){
    _amt = maxValue;
  }else{
    _amt = parseUnits(amt, TOKEN_ADDR.USDC.decimals);
  }
  const spells = [
    {
      connector: "COMPOUND-A",
      method: "payback",
      args: ["USDC-A", _amt, 0, 0]
    }
  ];
  await dsaWallet.cast(...encodeSpells(spells), wallet, {from: wallet});
}

async function withdraw(amt, dsaWallet, wallet){
  let _amt;
  if (amt == -1){
    _amt = maxValue;
  }else{
    _amt = parseUnits(amt, TOKEN_ADDR.USDC.decimals);
  }
  const spells = [
    {
      connector: "COMPOUND-A",
      method: "withdraw",
      args: ["ETH-A", _amt, 0, 0]
    }
  ];
  await dsaWallet.cast(...encodeSpells(spells), wallet, {from: wallet});
}

async function withdrawAndSwap(dsaWallet, wallet){
  const IdOne = "12515";
  const spells = [
    {
      connector: "COMPOUND-A",
      method: "withdraw",
      args: ["ETH-A", maxValue, 0, IdOne]
    },
    {
      connector: "UNISWAP-A",
      method: "sell",
      args: [usdcAddr, ethAddr, 0, 0, IdOne, 0],// sell all
    },
  ];
  await dsaWallet.cast(...encodeSpells(spells), wallet, {from: wallet});
}

async function main(){
  // accounts
  const accounts = await web3.eth.getAccounts();
  const alice = accounts[2];
  const bob = accounts[4];

  // init dsa
  const dsaWallet = await init(alice);
  console.log('\n--------------场景一---------------------------------------');
  console.log('alice 初始账户资金');
  await checkAccount(dsaWallet.address);

  // buy with flashloan(InstaPool)
  // 200 USDC(alice) + 600USDC(InstaPool)  => Uniswap => ETH
  const ratio0 = 3;
  const cash0 = parseUnits(200, TOKEN_ADDR.USDC.decimals);
  const debt0 = parseUnits(200 * (ratio0-1), TOKEN_ADDR.USDC.decimals);
  await buy(cash0, ratio0, dsaWallet, alice, 3);
  console.log('\n---------------------------------------------------------');
  console.log('alice使用三倍杠杆交易');
  console.log('1. alice向闪电贷借入400USDC');
  console.log('2. 花费自有资金200USDC和借入的400USDC购买价值600USDC的ETH');
  console.log('3. 质押所有ETH借入400USDC偿还闪电贷');
  console.log('alice 三倍杠杆交易后账户资金');
  await checkAccount(dsaWallet.address);

  // for(let i=0; i<100; i++){
    // await advanceBlock();
  // }
  // console.log('---------------advance 100 block------------------');
  // await checkAccount(dsaWallet.address);

  // sell all collatered eth for usdc
  await sell(debt0, dsaWallet, alice, 3);
  console.log('\n---------------------------------------------------------');
  console.log('alice平仓杠杆头寸');
  console.log('1. 向闪电贷借入400USDC');
  console.log('2. 偿还借款赎回价值600USDC的ETH');
  console.log('3. 卖出所有ETH获得600USDC并偿还闪电贷的400USDC');
  console.log('alice 平仓后账户资金(资金损耗主要为uniswap千三手续费)');
  await checkAccount(dsaWallet.address);

  console.log('\n--------------场景二---------------------------------------');
  console.log('alice 初始账户资金');
  await checkAccount(dsaWallet.address);

  const ratio1 = 2;
  const cash1 = parseUnits(200, TOKEN_ADDR.USDC.decimals);
  const debt1 = parseUnits(200 * (ratio1-1), TOKEN_ADDR.USDC.decimals);
  await buy(cash1, ratio1, dsaWallet, alice, 3);
  console.log('\n---------------------------------------------------------');
  console.log('alice使用两倍杠杆交易');
  console.log('1. alice向闪电贷借入200USDC');
  console.log('2. 花费自有资金200USDC和借入的200USDC购买价值400USDC的ETH');
  console.log('3. 质押所有ETH借入200USDC偿还闪电贷');
  console.log('alice 两倍杠杆交易后账户资金');
  await checkAccount(dsaWallet.address);
  // swap 600 usdc for eth
  // note that little loss of 0.3% protocol fee in uniswap
  // await swap(600, dsaWallet, alice);
  // console.log('---------------swap-------------------');
  // await checkAccount(dsaWallet.address);

  // payback all, including 400 usdc + its interest
  await payback(-1, dsaWallet, alice);
  console.log('\n---------------------------------------------------------');
  console.log('alice使用自有200USDC偿还所有贷款');
  await checkAccount(dsaWallet.address);

  console.log('\n---------------------------------------------------------');
  console.log('alice取出所有质押的价值400USDC的ETH');
  await withdraw(-1, dsaWallet, alice);
  await checkAccount(dsaWallet.address);

  // await withdrawAndSwap(dsaWallet, alice);
  // console.log('---------------withdraw and swap-------------------');
  // await checkAccount(dsaWallet.address);
}

module.exports = function(callback){
  main().then(callback).catch(callback);
}
