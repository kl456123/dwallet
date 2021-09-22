const InstaConnectorsV2 = artifacts.require('InstaConnectorsV2');
const InstaPoolV2 = artifacts.require('InstaPoolV2');

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
  'MAKERDAO-A': 'ConnectV2MakerDAO',// out of gas when deploying
  'UNISWAP-A': 'ConnectV2UniswapV2'
};

module.exports = async function (accounts) {
  const deployerAddress = accounts[0];
  web3.eth.defaultAccount = deployerAddress;

  const addressMapping = {}

  // deploy no-constructor contract
  for (const key in connectMapping) {
    const ConnectorInstance = artifacts.require(connectMapping[key]);
    const connector = await ConnectorInstance.new();
    ConnectorInstance.setAsDeployed(connector);
    addressMapping[key] = connector.address;
  }

  // add connectors to instaConnectorsV2
  const instaConnectorsV2 = await InstaConnectorsV2.deployed();
  await instaConnectorsV2.addConnectors(
    Object.keys(addressMapping),
    Object.values(addressMapping),
    {from: deployerAddress});
}
