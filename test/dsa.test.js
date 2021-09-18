const InstaIndex = artifacts.require('InstaIndex');
const InstaImplementationM1 = artifacts.require('InstaImplementationM1');
const InstaDefaultImplementation = artifacts.require('InstaDefaultImplementation');
const InstaImplementations = artifacts.require('InstaImplementations');
const InstaAccountV2 = artifacts.require('InstaAccountV2');
const InstaConnectorsV2 = artifacts.require('InstaConnectorsV2');
// test contracts
const InstaImplementationM2 = artifacts.require('InstaImplementationM2');
const InstaDefaultImplementationV2 = artifacts.require('InstaDefaultImplementationV2');
const { createDSA, deployConnector, encodeSpells } = require('./utils/helpers.js');

contract('Mainnet', async accounts=>{
  const address_zero = "0x0000000000000000000000000000000000000000"
  const ethAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
  const daiAddr = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
  const usdcAddr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  const cEthAddr = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5"
  const cDaiAddr = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"
  const maxValue = "115792089237316195423570985008687907853269984665640564039457584007913129639935"

  const owner = accounts[0];
  let [wallet0, wallet1, wallet2, wallet3] = accounts.slice(1);

  let instaIndex;
  let instaAccountV2;
  let instaConnectorsV2;
  let instaAccountV2DefaultImpl;
  let instaAccountV2DefaultImplV2;
  let implementationsMapping;
  let instaAccountV2ImplM1;
  let instaAccountV2ImplM2;
  let abis = {};

  const instaAccountV2DefaultImplSigsV2 = [
    "enable(address)",
    "disable(address)",
    "isAuth(address)",
    "switchShield(bool",
    "shield()"
  ].map((a) => web3.utils.keccak256(a).slice(0, 10));

  const instaAccountV2ImplM2Sigs = [
    "castWithFlashloan(string[],bytes[],address)"
  ].map((a)=>web3.utils.keccak256(a).slice(0, 10));// including "0x" prefix

  let acountV2DsaM1Wallet0;
  let acountV2DsaM2Wallet0;
  let acountV2DsaDefaultWallet0;
  let acountV2DsaDefaultWalletM2;

  before(async()=>{
    instaIndex = await InstaIndex.deployed();
    instaConnectorsV2 = await InstaConnectorsV2.deployed();
    // default impl
    instaAccountV2DefaultImpl = await InstaDefaultImplementation.deployed();
    // m1 impl
    instaAccountV2ImplM1 = await InstaImplementationM1.deployed();
    // dsa proxy
    instaAccountV2 = await InstaAccountV2.deployed();
    // implementations manager
    implementationsMapping = await InstaImplementations.deployed();

    // deploy test contracts
    // m2
    instaAccountV2ImplM2 = await InstaImplementationM2.new(instaIndex.address, instaConnectorsV2.address);
    instaAccountV2DefaultImplV2 = await InstaDefaultImplementationV2.new(instaIndex.address);
  });

  describe('Implementations', async()=>{
    it('Should add instaAccountV2ImplM2 sigs to mapping.', async ()=>{
      await implementationsMapping.addImplementation(instaAccountV2ImplM2.address, instaAccountV2ImplM2Sigs, {from: owner});
      expect(await implementationsMapping.getSigImplementation(instaAccountV2ImplM2Sigs[0])).to.be.equal(instaAccountV2ImplM2.address);
      (await implementationsMapping.getImplementationSigs(instaAccountV2ImplM2.address)).forEach((a, i)=>{
        expect(a).to.be.equal(instaAccountV2ImplM2Sigs[i]);
      });
    });

    it("Should remove instaAccountV2ImplM2 sigs to mapping.", async function () {
      await implementationsMapping.removeImplementation(instaAccountV2ImplM2.address, {from: owner});
      expect(await implementationsMapping.getSigImplementation(instaAccountV2ImplM2Sigs[0])).to.be.equal(address_zero);
      expect((await implementationsMapping.getImplementationSigs(instaAccountV2ImplM2.address)).length).to.be.equal(0);
    });

    it("Should add InstaDefaultImplementationV2 sigs to mapping.", async function () {
      await implementationsMapping.addImplementation(instaAccountV2DefaultImplV2.address, instaAccountV2DefaultImplSigsV2, {from: owner});
      expect(await implementationsMapping.getSigImplementation(instaAccountV2DefaultImplSigsV2[0])).to.be.equal(instaAccountV2DefaultImplV2.address);
      (await implementationsMapping.getImplementationSigs(instaAccountV2DefaultImplV2.address)).forEach((a, i) => {
        expect(a).to.be.eq(instaAccountV2DefaultImplSigsV2[i])
      })
    });

    it("Should remove InstaDefaultImplementationV2 sigs to mapping.", async function () {
      await implementationsMapping.removeImplementation(instaAccountV2DefaultImplV2.address, {from: owner});
      expect(await implementationsMapping.getSigImplementation(instaAccountV2DefaultImplSigsV2[0])).to.be.equal(address_zero);
      expect((await implementationsMapping.getImplementationSigs(instaAccountV2DefaultImplV2.address)).length).to.be.equal(0);
    });

    it("Should return default imp.", async function () {
      expect(await implementationsMapping.getImplementation(instaAccountV2ImplM2Sigs[0])).to.be.equal(instaAccountV2DefaultImpl.address);
    });

    after(async () => {
      await implementationsMapping.addImplementation(instaAccountV2ImplM2.address, instaAccountV2ImplM2Sigs, {from: owner});
    });

  });

  describe('Auth', async()=>{
    it("Should build DSA v2", async function () {
      const receipt = await instaIndex.build(wallet0, 1, wallet0)
      const dsaWalletAddress = receipt.logs[0].args.account;
      acountV2DsaM1Wallet0 = await InstaImplementationM1.at(dsaWalletAddress);
      acountV2DsaM2Wallet0 = await InstaImplementationM2.at(dsaWalletAddress);
      acountV2DsaDefaultWallet0 = await InstaDefaultImplementation.at(dsaWalletAddress);
      acountV2DsaDefaultWalletM2 = await InstaDefaultImplementationV2.at(dsaWalletAddress);
    });

    it("Should deploy Auth connector", async function () {
      const connectorInstanace = await deployConnector({
        connectorName: "authV2",
        contract: "ConnectV2AuthTest",
      });
      await instaConnectorsV2.addConnectors(["authV2"], [connectorInstanace.address], {from: owner});
    });

    it("Should deploy EmitEvent connector", async function () {
      const connectorInstanace = await deployConnector({
        connectorName: "emitEvent",
        contract: "ConnectV2EmitEvent",
      });
      await instaConnectorsV2.addConnectors(["emitEvent"], [connectorInstanace.address], {from: owner});
    });

    it("Should add wallet1 as auth", async function () {
      const spells = {
        connector: "authV2",
        method: "add",
        args: [wallet1]
      }
      await acountV2DsaM1Wallet0.cast(...encodeSpells([spells]), wallet1, {from: wallet0})
    });

    it("Should add wallet2 as auth", async function () {
      const spells = {
        connector: "authV2",
        method: "add",
        args: [wallet2]
      }
      await acountV2DsaM2Wallet0.castWithFlashloan(...encodeSpells([spells]), wallet1, {from: wallet1})
    });

    it("Should remove wallet1 as auth", async function () {
      const spells = {
        connector: "authV2",
        method: "remove",
        args: [wallet1]
      }
      await acountV2DsaM1Wallet0.cast(...encodeSpells([spells]), wallet2, {from: wallet2})
    });
  });

  describe('Events', async()=>{
    before(async function () {
      const receipt = await instaIndex.build(wallet1, 1, wallet1, {from: wallet0})
      const dsaWalletAddress = receipt.logs[0].args.account;

      acountV2DsaM1Wallet0 = await InstaImplementationM1.at(dsaWalletAddress);
      acountV2DsaM2Wallet0 = await InstaImplementationM2.at(dsaWalletAddress);
      acountV2DsaDefaultWallet0 = await InstaDefaultImplementation.at(dsaWalletAddress);
    });

    it("Should new connector", async function () {
      const connectorInstanace = await deployConnector({
        connectorName: "authV1",
        contract: "ConnectV2Auth",
      });
      await instaConnectorsV2.addConnectors(["authV1"], [connectorInstanace.address], {from: owner})
    });
  });
});
