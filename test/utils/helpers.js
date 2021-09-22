const addresses = require('./addresses');
const InstaIndex = artifacts.require('InstaIndex');
const ManagerLike = artifacts.require('contracts/v2/connectors/mainnet/connectors/makerdao/interface.sol:ManagerLike');
const InstaImplementationM1 = artifacts.require('InstaImplementationM1');
const IERC20 = artifacts.require('IERC20');

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
  // 'MAKERDAO-A': 'ConnectV2MakerDAO',// out of gas when deploying
  'UNISWAP-A': 'ConnectV2UniswapV2'
};

async function createDSA(indexContract, owner){
  const receipt = await indexContract.build(owner, 1, owner);
  const addr = receipt.logs[0].args.account;
  return addr;
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

async function buildDSAv2(owner) {
  const instaIndex = await InstaIndex.deployed();

  const receipt = await instaIndex.build(owner, 1, owner);
  const event = receipt.logs[0]
  return await InstaImplementationM1.at(event.args.account);
};

async function deployConnector({connectorName, contract, deployer}){
  const ConnectorInstance = artifacts.require(contract);
  let connectorInstance;
  if(deployer){
    await deployer.deploy(ConnectorInstance);
    connectorInstance = await ConnectorInstance.deployed();
  }else{
    connectorInstance = await ConnectorInstance.new();
  }

  // check if anything overrides exists
  // if (connectorName in abis.connectors){
    // throw new Error('duplicated connectors exist');
  // }
  connectMapping[connectorName] = contract;
  addresses.connectors[connectorName] = connectorInstance.address;
  return connectorInstance;
}

async function getConnector(connectorName){
  const ConnectorInstance = artifacts.require(connectorName);
  return await ConnectorInstance.deployed();
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

// MAKER SPECIFIC Functions
async function getMakerContract(signer) {
  const MAKER_ADDR = "0x5ef30b9986345249bc32d8928B7ee64DE9435E39";
  return await ManagerLike.at(MAKER_ADDR, {from: signer});
}

async function openMakerVault(signer) {
  const maker = await getMakerContract(signer);

  const ilk = "ETH-A";
  await maker.open(ilk, signer);

  const lastVaultId = await maker.last(signer);

  return lastVaultId;
}

async function impersonateAndTransfer(amt, token, toAddr) {

  const contract = await IERC20.at(token.contract);

  await contract.transfer(toAddr, amt, {from: token.holder});
}

function formatUnits(amount, decimals){
  const toBN = web3.utils.toBN;
  return toBN(amount).mul(toBN(10).pow(toBN(decimals)));
}


module.exports = {
  createDSA,
  deployConnector,
  encodeSpells,
  buildDSAv2,
  encodeFlashcastData,
  getConnector,
  impersonateAndTransfer,
  formatUnits
};
