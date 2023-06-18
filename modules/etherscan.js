const Web3 = require('web3');
const path = require('path');
const bip39 = require('bip39'); 
const baseUrl = "https://api.etherscan.io/api"
require('dotenv').config({
    path: path.join(__dirname, '../', './.env'),
});
const apiKey = process.env.ETHERSCAN_API_KEY

const getTokenContractAddresses = async ({address}) => {
    try{
        const options = {
            method: 'GET',
            url: `${baseUrl}?module=contract
            &action=getabi
            &address=${address}
            &apikey=${apiKey}`
        }
    }catch(err){
        return {
            success: false,
            data: err?.response?.data ?? err.message
        }
    }
}