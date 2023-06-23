const hdkey = require('hdkey');
const path = require('path');
const bip39 = require('bip39'); 
require('dotenv').config({
    path: path.join(__dirname, '../', './.env'),
});

const tokenContractAddresses = {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH contract address
    MATIC: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', // MATIC contract address
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA'
    // Add more token symbols and contract addresses as needed
};

const getTokenContractAddress = (symbol) => {
    try{
        const tokenSymbol = symbol.toUpperCase();
        return tokenContractAddresses[tokenSymbol] || null;
    }catch(e){
        return null;
    }
};

const derivePrivateKey = async ({mnemonic}) => {
    try{  
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        const root = hdkey.fromMasterSeed(seed);
        const masterPrivateKey = root.privateKey.toString('hex');

        if(!masterPrivateKey) return {
            success: false,
            data: "Failed to get private key."
        }

        return {
            success: true,
            data: masterPrivateKey
        }
    }catch(err){
        return {
            success: false,
            message: err?.response?.data ?? err.message
        }
    }
}

module.exports = {
    derivePrivateKey,
    getTokenContractAddress
}