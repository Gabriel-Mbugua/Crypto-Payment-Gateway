const { Web3 } = require('web3');
const path = require('path');
const axios = require('axios');
const bip39 = require('bip39'); 
const { getProviderUrl, getTokenContractAddress } = require('./tools');
const { uniswapSwapRouter02Abi } = require('./abis');
const baseUrl = "https://api.etherscan.io/api"
require('dotenv').config({
    path: path.join(__dirname, '../', './.env'),
});

const getPoolPrices = async ({ network, token, sandbox = true}) => {
    try{
        const uniswapPoolAbi = uniswapSwapRouter02Abi // Uniswap pool contract ABI

        const providerUrl = await getProviderUrl({
            network,
            sandbox
          })
      
        if(!providerUrl) throw new Error("Unsupported provider")

        const tokenContractAddress = getTokenContractAddress(token)

        const web3 = new Web3(providerUrl);

        const uniswapPool = new web3.eth.Contract(uniswapPoolAbi, tokenContractAddress);

        // Fetch the current price from the Uniswap V3 pool
        let currentPrice = await uniswapPool.methods.getSpotPrice().call();

        console.log(currentPrice)
    }catch(err){
        return {
            success: false,
            data: err.message
        }
    }
}