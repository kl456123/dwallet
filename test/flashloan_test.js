const TokenInterface = artifacts.require("TokenInterface");
const { buildDSAv2, encodeFlashcastData, encodeSpells, impersonateAndTransfer, formatUnits } = require('./utils/helpers');
const { TOKEN_ADDR } = require('./utils/constants');

contract('Instapool', async wallets=>{
  const address_zero = "0x0000000000000000000000000000000000000000"
  const ethAddr = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
  const daiAddr = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
  const usdcAddr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  const cEthAddr = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5"
  const cDaiAddr = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"
  const maxValue = "115792089237316195423570985008687907853269984665640564039457584007913129639935"

  let dsaWallet0;
  const [wallet0, wallet1, wallet2, wallet3] = wallets
  const connectorName = "COMPOUND-A";

  before(async()=>{
    dsaWallet0 = await buildDSAv2(wallet0);
    await web3.eth.sendTransaction({
      from: wallet0,
      to: dsaWallet0.address,
      value: web3.utils.toWei("10", "ether")
    });

    await impersonateAndTransfer(formatUnits(2000, TOKEN_ADDR.DAI.decimals), TOKEN_ADDR.DAI, dsaWallet0.address);
    await impersonateAndTransfer(formatUnits(2000, TOKEN_ADDR.USDC.decimals), TOKEN_ADDR.USDC, dsaWallet0.address);
    await impersonateAndTransfer(formatUnits(200, TOKEN_ADDR.WETH.decimals), TOKEN_ADDR.WETH, dsaWallet0.address);
    await impersonateAndTransfer(formatUnits(2000, TOKEN_ADDR.USDT.decimals), TOKEN_ADDR.USDT, dsaWallet0.address);
  });

  it("Buy 600 USDC of ETH using margin_ratio=3", async function () {
    const ratio = 3;
    const cash = formatUnits(200, TOKEN_ADDR.USDC.decimals);
    const total = formatUnits(200 * ratio, TOKEN_ADDR.USDC.decimals);
    const loan = formatUnits(200 * (ratio-1), TOKEN_ADDR.USDC.decimals);

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
          0, // route
          calldata,
        ],
      }
    ]
    const usdcContract = await TokenInterface.at(usdcAddr);
    const usdcBefore = await usdcContract.balanceOf(dsaWallet0.address);

    await dsaWallet0.cast(...encodeSpells(spells2), wallet1, {from: wallet0});
    const usdcAfter = await usdcContract.balanceOf(dsaWallet0.address);

    expect(Number(usdcAfter)).to.be.eq(Number(usdcBefore)-Number(cash));
  });

  it("Sell ETH collatered in Compound for USDC", async function () {
    const ratio = 3;
    const loan = formatUnits(200 * (ratio-1) + 20, TOKEN_ADDR.USDC.decimals);
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

    await dsaWallet0.cast(...encodeSpells(spells2), wallet1, {from: wallet0});
  });
});
