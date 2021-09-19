const TokenInterface = artifacts.require("TokenInterface");
const { buildDSAv2, encodeFlashcastData, encodeSpells, impersonateAndTransfer, formatUnits } = require('./utils/helpers');
const { TOKEN_ADDR } = require('./utils/constants');

contract('Mainnet', async wallets=>{
  const address_zero = "0x0000000000000000000000000000000000000000"
  const ethAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
  const daiAddr = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
  const usdcAddr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  const cEthAddr = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5"
  const cDaiAddr = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"
  const maxValue = "115792089237316195423570985008687907853269984665640564039457584007913129639935"

  let dsaWallet0;
  const [wallet0, wallet1, wallet2, wallet3] = wallets

  before(async()=>{
    dsaWallet0 = await buildDSAv2(wallet0);
    await web3.eth.sendTransaction({
      from: wallet0,
      to: dsaWallet0.address,
      value: web3.utils.toWei("10", "ether")
    });
  });

  describe("Connector - Compound", function () {
    const connectorName= 'COMPOUND-A';

    it("Should deposit ETH in Compound", async function () {
      const amount = web3.utils.toWei("1", "ether") // 1 ETH
      const spells = [
        {
          connector: connectorName,
          method: "deposit",
          args: ["ETH-A", amount, 0, 0]
        }
      ]

      await dsaWallet0.cast(...encodeSpells(spells), wallet1, {from: wallet0})
      expect(Number(await web3.eth.getBalance(dsaWallet0.address))).to.be.lte(Number(web3.utils.toWei("9", "ether")));
    });

    it("Should borrow and payback DAI from Compound", async function () {
      const amount = web3.utils.toWei("100", "ether") // 100 DAI
      const setId = "83478237"
      const spells = [
        {
          connector: connectorName,
          method: "borrow",
          args: ["DAI-A", amount, 0, setId]
        },
        {
          connector: connectorName,
          method: "payback",
          args: ["DAI-A", 0, setId, 0]
        }
      ]

      await dsaWallet0.cast(...encodeSpells(spells), wallet1, {from: wallet0})
      expect(Number(await web3.eth.getBalance(dsaWallet0.address))).to.be.lte(Number(web3.utils.toWei("9", "ether")));
    });

    it("Should deposit all ETH in Compound", async function () {
      const spells = [
        {
          connector: connectorName,
          method: "deposit",
          args: ["ETH-A", maxValue, 0, 0]
        }
      ]

      await dsaWallet0.cast(...encodeSpells(spells), wallet1, {from: wallet0})
      expect(Number(await web3.eth.getBalance(dsaWallet0.address))).to.be.lte(Number(web3.utils.toWei("0", "ether")));
    });

    it("Should withdraw all ETH from Compound", async function () {
      const spells = [
        {
          connector: connectorName,
          method: "withdraw",
          args: ["ETH-A", maxValue, 0, 0]
        }
      ]

      await dsaWallet0.cast(...encodeSpells(spells), wallet1, {from: wallet0})
      expect(Number(await web3.eth.getBalance(dsaWallet0.address))).to.be.gte(Number(web3.utils.toWei("10", "ether")));
    });

  });

  describe("Connector - Uniswap", function () {
    const connectorName= 'UNISWAP-A';

    it("Should deposit ETH to wallet", async function () {
      const spells = {
        connector: "BASIC-A",
        method: "deposit",
        args: [
          ethAddr,
          web3.utils.toWei("5.0", "ether"),
          0,
          0
        ]
      }
      await dsaWallet0.cast(
        ...encodeSpells([spells]),
        wallet3,
        { from: wallet0, value: web3.utils.toWei("5.0", "ether") }
      );
    })

    it("Should swap ETH to DAI", async function () {
      const spells = {
        connector: connectorName,
        method: "sell",
        args: [
          daiAddr,
          ethAddr,
          web3.utils.toWei("0.5", "ether"),
          0,
          0,
          0
        ]
      }

      const daiContract = await TokenInterface.at(daiAddr);

      expect((await daiContract.balanceOf(dsaWallet0.address)).toNumber()).to.equal(0)

      await dsaWallet0.cast(
        ...encodeSpells([spells]),
        wallet3,
        {from: wallet0}
      )
      expect(await daiContract.balanceOf(dsaWallet0.address)).to.not.equal(0)
    });
  });
});
