const { network } = require("hardhat");

const impersonate = async (accounts) => {
  // const signers = [];
  for (const account of accounts) {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [account],
    });
  }
};

module.exports = async function (){
  const signers = await impersonate([
    '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8',
    '0xc564ee9f21ed8a2d8e7e76c085740d5e4c5fafbe',
    '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503',
    '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503'
  ]);
}
