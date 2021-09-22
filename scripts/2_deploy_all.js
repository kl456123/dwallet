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


module.exports = async function (accounts) {
  const deployerAddress = accounts[0];

  web3.eth.defaultAccount = deployerAddress;

  // account index
  const instaIndex = await InstaIndex.new();
  InstaIndex.setAsDeployed(instaIndex);

  console.log("instaIndex deployed: ", instaIndex.address);

  // account linked list
  const instaList = await InstaList.new(instaIndex.address);
  InstaList.setAsDeployed(instaList);

  console.log("instaList deployed: ", instaList.address);

  const instaMemory = await OwnedInstaMemory.new();
  OwnedInstaMemory.setAsDeployed(instaMemory);

  console.log("instaMemory deployed: ", instaMemory.address);

  // connectors
  const instaConnectorsV2 = await InstaConnectorsV2.new(instaIndex.address);
  InstaConnectorsV2.setAsDeployed(instaConnectorsV2);

  console.log("InstaConnectorsV2 deployed: ", instaConnectorsV2.address);

  // InstaImplementations mapping
  const implementationsMapping = await InstaImplementations.new(instaIndex.address);
  InstaImplementations.setAsDeployed(implementationsMapping);

  console.log("InstaImplementations deployed: ", implementationsMapping.address);

  const instaAccountV2 = await InstaAccountV2.new(implementationsMapping.address);
  InstaAccountV2.setAsDeployed(instaAccountV2);

  console.log("InstaAccountV2 deployed: ", instaAccountV2.address);

  const instaDefaultImplementation = await InstaDefaultImplementation.new(instaIndex.address);
  InstaDefaultImplementation.setAsDeployed(instaDefaultImplementation);

  console.log("InstaDefaultImplementation deployed: ", instaDefaultImplementation.address);

  const instaImplementationM1 = await InstaImplementationM1.new(instaIndex.address, instaConnectorsV2.address, instaMemory.address);
  InstaImplementationM1.setAsDeployed(instaImplementationM1);

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
