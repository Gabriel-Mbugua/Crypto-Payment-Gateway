const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require('web3');
const path = require('path');
const bip39 = require('bip39'); 
require('dotenv').config({
    path: path.join(__dirname, '../', './.env'),
});

const polygonTestnetRpc = process.env.POLYGON_TESTNET_RPC
const polygonMainnetRpc = process.env.POLYGON_TESTNET_RPC

const generateMnemonic = async () => {
    // Generate a 12-word mnemonic
    const mnemonic = bip39.generateMnemonic();
    return mnemonic;
}

const generateWallet = async ({sandbox = true}) => {
    try{     
        const mnemonic = await generateMnemonic();

        const providerUrl = sandbox
            ? polygonTestnetRpc
            : polygonMainnetRpc
            
        const provider = new HDWalletProvider({
            mnemonic: {
              phrase: mnemonic
            },
            providerOrUrl: providerUrl
        });
    

        return {
            success: true,
            data: {
                mnemonic,
                provider,
            }
        }
    }catch(err){
        console.log(err)
        return {
            success: false,
            data: err?.response?.data?.message ?? err.message
        }
    }
}
// generateWallet({})

module.exports = {
    polygonGenerateWallet: generateWallet
}
