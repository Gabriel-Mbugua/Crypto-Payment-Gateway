const HDWalletProvider = require("@truffle/hdwallet-provider");
const hdkey = require('hdkey');
const path = require('path');
const bip39 = require('bip39'); 
require('dotenv').config({
    path: path.join(__dirname, '../', './.env'),
});

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
    derivePrivateKey
}