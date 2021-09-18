const { TOKEN_ADDR } = require('../test/utils/constants');

const IERC20 = artifacts.require('IERC20');
const InstaIndex = artifacts.require('InstaIndex'); // dsa manager
const InstaImplementationM1 = artifacts.require('InstaImplementationM1'); // dsa api
const CTokenInterface = artifacts.require('CTokenInterface');

// abis
const IERC20Json = require('../build/contracts/IERC20.json');
const CTokenInterfaceJson = require('../build/contracts/CTokenInterface.json');
const InstaIndexJson = require('../build/contracts/InstaIndex.json');
const InstaImplementationM1Json = require('../build/contracts/InstaImplementationM1.json');


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

const maxValue = "115792089237316195423570985008687907853269984665640564039457584007913129639935"
const cUsdcAddr = "0x39aa39c021dfbae8fac545936693ac917d5e7563";

// const web3 = new Web3('http://localhost:9545');
// mainnet addresses
// const INSTA_INDEX_ADDR = '';

const erc20Tokens = [];
const debtsTokens = [];
const erc20Address = [TOKEN_ADDR.DAI.contract, TOKEN_ADDR.USDC.contract, TOKEN_ADDR.WETH.contract];


async function checkAccount(name, account){
  // eth
  console.log(name, ': ', await web3.eth.getBalance(account));
  // asset tokens
  // erc20Tokens.map(async token=>{
    // const balance = await token.balanceOf(account);
    // const name = await token.name();
    // console.log(name, ': ', balance);
  // });


  // // debt tokens
  // debtsTokens.map(async (tokenContract)=>{
    // const borrowBalance = await tokenContract.borrowBalanceStored(account);
    // const name = await tokenContract.name();
    // console.log(name, ': ', borrowBalance.toString());
  // });
}

async function loadAbi(contractName){
   const ContractJson = require(contractName);
    return contract(ContractJson).abi;

}

// create dsa from user
async function buildDSAv2(owner) {
  const instaIndex = await InstaIndex.deployed();
  const receipt = await instaIndex.build(owner, 1, owner);
  const event = receipt.logs[0]
  return await InstaImplementationM1.at(event.args.account);
};

// get tokens for test
async function impersonateAndTransfer(amt, token, toAddr) {
  const contract = await IERC20.at(token.contract);
  await contract.transfer(toAddr, amt, {from: token.holder});
}

function formatUnits(amount, decimals){
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

  await impersonateAndTransfer(formatUnits(2000, TOKEN_ADDR.DAI.decimals), TOKEN_ADDR.DAI, dsaWallet.address);
  await impersonateAndTransfer(formatUnits(2000, TOKEN_ADDR.USDC.decimals), TOKEN_ADDR.USDC, dsaWallet.address);
  await impersonateAndTransfer(formatUnits(200, TOKEN_ADDR.WETH.decimals), TOKEN_ADDR.WETH, dsaWallet.address);
  await impersonateAndTransfer(formatUnits(2000, TOKEN_ADDR.USDT.decimals), TOKEN_ADDR.USDT, dsaWallet.address);


  cUsdcContract = await CTokenInterface.at(cUsdcAddr);

  // debtsTokens.push(cUsdcContract);

  // erc20Address.map(async (addr)=>{
    // erc20Tokens.push(await IERC20.at(cUsdcAddr));
  // });


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
    const abis = loadAbi(connectMapping[a.connector]);

    const abi = abis.find(b => {
      return b.name === functionName
    });
    if (!abi) throw new Error("Couldn't find function")
    return web3.eth.abi.encodeFunctionCall(abi, a.args)
  })
  return [targets, calldatas];
}

async function buy(cash, ratio, dsaWallet, wallet){
    const total = formatUnits(200 * ratio, TOKEN_ADDR.USDC.decimals);
    const loan = formatUnits(200 * (ratio-1), TOKEN_ADDR.USDC.decimals);

    const IdOne = "2878734423"
    const IdTwo = "783243246"

    const spells = [
      {
        connector: "UNISWAP-A",
        method: "sell",
        args: [ethAddr, usdcAddr, total, 1, 0, IdOne],// margin trade
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
          0, // route
          calldata,
        ],
      }
    ]

    await dsaWallet.cast(...encodeSpells(spells2), wallet, {from: wallet});
}


async function sell(debt, dsaWallet, wallet){
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
        args: [usdcAddr, ethAddr, 0, 1, IdTwo, 0],// sell all
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
          debt,
          0, // route
          calldata,
        ],
      }
    ]

    await dsaWallet.cast(...encodeSpells(spells2), wallet1, {from: wallet});
}

module.exports = async function main(callback){
  // accounts
  const accounts = await web3.eth.getAccounts();
  const alice = accounts[1];
  const bob = accounts[2];

  // init dsa
  const dsaWallet = await init(alice);
  console.log(dsaWallet.address);
  await checkAccount('alice', dsaWallet.address);

  // buy with flashloan(InstaPool)
  // 500 USDC(alice) + 1500USDC(InstaPool)  => Uniswap => ETH
  const ratio = 3;
  const cash = formatUnits(200, TOKEN_ADDR.USDC.decimals);
  const debt = formatUnits(200 * (ratio-1), TOKEN_ADDR.USDC.decimals);
  await buy(cash, ratio, dsaWallet, alice);

  // sell all collatered eth for usdc
  await sell(debt, dsaWallet, alice);
  await callback();
}
