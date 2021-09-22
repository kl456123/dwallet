const deployDSA = require('./2_deploy_all');
const deployConnectors = require('./3_deploy_connectors');
const deployFlashloan = require('./4_deploy_instapool');
const impersonate  = require('./impersonate');


async function main() {
  // get accounts
  const accounts = await web3.eth.getAccounts();

  // unlock some other accounts
  await impersonate();

  // deploy dsa system
  await deployDSA(accounts);

  // deploy all connectors
  await deployConnectors(accounts);

  // deploy flashloan
  await deployFlashloan(accounts);
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
