# DSA based defi Wallet

## Introduce
Anyone can access defi world without any knowledge about blockchain or defi protocol api or something else.
And the more importance is in that you can do anything using only one transaction.


## Install


## Demo
```js
const spells = [
    {"connector": "Compound-A", method: "deposit", args:[amt1]},
    {"connector": "Compound-A", method: "borrow", args:[amt2]}
];
await dsa.cast(...encodeSpells(spells), {from: user});
```

## Demo
```bash
# fork from etherum mainnet
bash ./tools/forknet.sh

truffe migrate

truffle exec ./scripts/demo.js

```

## Test
```bash
bash ./tools/forknet.sh

truffle test
```



## Develop
1. add connector to support other defi protocols
2. register connector
