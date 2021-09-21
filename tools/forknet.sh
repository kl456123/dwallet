#!/bin/bash

NETWORK_URL="https://mainnet.infura.io/v3/d9054056af514990a01542c57b706abe";
GASLIMIT=10000000000000;

ganache-cli -l ${GASLIMIT} -f ${NETWORK_URL} \
  -u 0xbe0eb53f46cd790cd13851d5eff43d12404d33e8 \
  -u 0xc564ee9f21ed8a2d8e7e76c085740d5e4c5fafbe \
  -u 0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503 \
  -u 0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503 \
  -g 1000 \
  --max-old-space-size=8192
