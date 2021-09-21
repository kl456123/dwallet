const InstaIndex = artifacts.require('InstaIndex');
const InstaList = artifacts.require('InstaList');
const InstaAccountV2 = artifacts.require('InstaAccountV2');
const OwnedInstaMemory = artifacts.require('OwnedInstaMemory');
// connectors
const InstaConnectorsV2 = artifacts.require('InstaConnectorsV2');
// const InstaConnectorsV2Impl = artifacts.require('InstaConnectorsV2Impl');
// const InstaConnectorsV2Proxy = artifacts.require('InstaConnectorsV2Proxy');
// impl
const InstaImplementations = artifacts.require('InstaImplementations');
const InstaDefaultImplementation = artifacts.require('InstaDefaultImplementation');
const InstaImplementationM1 = artifacts.require('InstaImplementationM1');


module.exports = async function (deployer, network, accounts) {
  const deployerAddress = accounts[0];

  web3.eth.defaultAccount = deployerAddress;

  // account index
  await deployer.deploy(InstaIndex);
  const instaIndex = await InstaIndex.deployed();

  console.log("instaIndex deployed: ", instaIndex.address);

  // account linked list
  await deployer.deploy(InstaList, instaIndex.address);
  const instaList = await InstaList.deployed();

  console.log("instaList deployed: ", instaList.address);

  await deployer.deploy(OwnedInstaMemory);
  const instaMemory = await OwnedInstaMemory.deployed();

  console.log("instaMemory deployed: ", instaMemory.address);

  // connectors
  await deployer.deploy(InstaConnectorsV2, instaIndex.address);
  const instaConnectorsV2 = await InstaConnectorsV2.deployed();

  console.log("InstaConnectorsV2 deployed: ", instaConnectorsV2.address);

  //////////////////////////////////////////////////
  // to be removed
  // await deployer.deploy(InstaConnectorsV2Impl);
  // const instaConnectorsV2Impl = await InstaConnectorsV2Impl.deployed();
  // // connectors proxy
  // await deployer.deploy(InstaConnectorsV2Proxy, instaConnectorsV2Impl.address, deployerAddress, "0x");
  //////////////////////////////////////////////////

  // InstaImplementations mapping
  await deployer.deploy(InstaImplementations, instaIndex.address);
  const implementationsMapping = await InstaImplementations.deployed();

  console.log("InstaImplementations deployed: ", implementationsMapping.address);

  await deployer.deploy(InstaAccountV2, implementationsMapping.address);
  const instaAccountV2 = await InstaAccountV2.deployed();

  console.log("InstaAccountV2 deployed: ", instaAccountV2.address);

  await deployer.deploy(InstaDefaultImplementation, instaIndex.address);
  const instaDefaultImplementation = await InstaDefaultImplementation.deployed();

  console.log("InstaDefaultImplementation deployed: ", instaDefaultImplementation.address);

  await deployer.deploy(InstaImplementationM1, instaIndex.address, instaConnectorsV2.address, instaMemory.address);
  const instaImplementationM1 = await InstaImplementationM1.deployed();

  console.log("InstaImplementationM1 deployed: ", instaImplementationM1.address);

  // // init index
  // // 1. set basics for index
  const setBasicsArgs = [deployerAddress, instaList.address, instaAccountV2.address, instaConnectorsV2.address];
  await instaIndex.setBasics(...setBasicsArgs);

  // 2. init mapping
  const implementationV1Args = [
    instaImplementationM1.address,
    [
      "cast(string[],bytes[],address)",
      "connectorsM1Memory()"
    ].map((a) => web3.utils.keccak256(a).slice(0, 10))
  ]
  await implementationsMapping.setDefaultImplementation(instaDefaultImplementation.address, {from: deployerAddress});
  await implementationsMapping.addImplementation(...implementationV1Args, {from: deployerAddress});
}
