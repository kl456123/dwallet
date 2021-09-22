/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomiclabs/hardhat-truffle5");

module.exports = {
  networks:{
    hardhat:{
      allowUnlimitedContractSize:true,
      timeot: 4000000,
      forking:{
        timeout: 4000000,
        url: "https://eth-mainnet.alchemyapi.io/v2/OkZHitwpruYSM2KflCfd9sXNMNOsuIwJ",
      }
    }
  },
  solidity: {
    compilers: [
      {
        version:"0.7.6",
        // settings: {          // See the solidity docs for advice about optimization and evmVersion
          // optimizer: {
            // enabled: false,
            // runs: 200
          // },
          // evmVersion: "byzantium"
        // }
      }
    ],
  },
};
