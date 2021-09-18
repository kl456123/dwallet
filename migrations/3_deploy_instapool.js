const InstaPoolV2Implementation = artifacts.require('InstaPoolV2Implementation');
const InstaPoolV2 = artifacts.require('InstaPoolV2');
const InstaIndex = artifacts.require('InstaIndex');
const InstaList = artifacts.require('InstaList');
const InstaPoolCompoundMapping = artifacts.require('InstaPoolCompoundMapping');

// internal pools
const ConnectMaker = artifacts.require('ConnectMaker');
const ConnectAave = artifacts.require('ConnectAave');
const ConnectCompound = artifacts.require('ConnectCompound');

const { whitelistSig, impersonateAndTransfer } = require('../test/utils/helpers');
const { TOKEN_ADDR } = require('../test/utils/constants');

module.exports = async function (deployer, network, accounts) {
  const MAKER_VAULT_ID = 24024;
  const deployerAddress = accounts[0];
  const adminAddress = accounts[2];
  web3.eth.defaultAccount = deployerAddress;

  const instaIndex = await InstaIndex.deployed();
  const instaList = await InstaList.deployed();

  const ctokenMapping = {
    // "ETH-A": "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5",
    "BAT-A": "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e",
    "COMP-A": "0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4",
    "DAI-A": "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643",
    "REP-A": "0x158079ee67fce2f58472a96584a73c7ab9ac95c1",
    "UNI-A": "0x35a18000230da775cac24873d00ff85bccded550",
    "USDC-A": "0x39aa39c021dfbae8fac545936693ac917d5e7563",
    "USDT-A": "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9",
    "WBTC-A": "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4",
    "ZRX-A": "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407",
    "TUSD-A": "0x12392F67bdf24faE0AF363c24aC620a2f67DAd86",
    "LINK-A": "0xFAce851a4921ce59e912d19329929CE6da6EB0c7"
  }

  await deployer.deploy(InstaPoolCompoundMapping, Object.values(ctokenMapping));
  const instaPoolCompoundMapping = await InstaPoolCompoundMapping.deployed();

  console.log("instaPoolCompoundMapping deployed: ", instaPoolCompoundMapping.address);

  await deployer.deploy(ConnectMaker);
  const makerConnector = await ConnectMaker.deployed();

  console.log("MakerConnector deployed: ", makerConnector.address);

  await deployer.deploy(ConnectAave);
  const connectAave = await ConnectAave.deployed();

  console.log("ConnectAave deployed: ", connectAave.address);

  await deployer.deploy(ConnectCompound);
  const connectCompound = await ConnectCompound.deployed();

  console.log("ConnectCompound deployed: ", connectCompound.address);

  await deployer.deploy(InstaPoolV2Implementation);
  const instaPoolV2Implementation = await InstaPoolV2Implementation.deployed();

  console.log("InstaPoolV2Implementation deployed: ", instaPoolV2Implementation.address);

  // proxy
  await deployer.deploy(InstaPoolV2, instaPoolV2Implementation.address, adminAddress, "0x");
  const instaPoolV2 = await InstaPoolV2.deployed();

  console.log("InstaPoolV2 deployed: ", instaPoolV2.address);

  // set aave and maker
  const InstaPoolV2Proxy = await InstaPoolV2Implementation.at(instaPoolV2.address);
  // const InstaPoolV2Proxy = instaPoolV2Implementation;
  // anybody can initialize it other than admin.
  await InstaPoolV2Proxy.initialize(MAKER_VAULT_ID, makerConnector.address,
    connectAave.address, instaIndex.address, instaList.address, {from: deployerAddress});

  // allow callback
  const sig = web3.utils.keccak256("cast(string[],bytes[],address)").slice(0, 10);
  await InstaPoolV2Proxy.whitelistSigs([sig], [true], {from: deployerAddress});

  // update compound
  await InstaPoolV2Proxy.updateCompoundConnect(connectCompound.address, {from: deployerAddress});// master only

  // add liquidity to instapool to pay protocol fee, it is very little
  await impersonateAndTransfer(1000, TOKEN_ADDR.DAI,  InstaPoolV2Proxy.address);
  await impersonateAndTransfer(1000, TOKEN_ADDR.USDC, InstaPoolV2Proxy.address);
  await impersonateAndTransfer(1000, TOKEN_ADDR.WETH, InstaPoolV2Proxy.address);
  await impersonateAndTransfer(1000, TOKEN_ADDR.USDT, InstaPoolV2Proxy.address);
}
