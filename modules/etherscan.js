const Web3 = require('web3');
const path = require('path');
const axios = require('axios');
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

const getTokenAbi = async ({contract_address}) => {
    try {
        const options = {
            method: 'GET',
            url: `${baseUrl}?module=contract&action=getabi&address=${contract_address}&apikey=${apiKey}`,
        }
        const response = await axios(options)

        if(response.data.status !== '1') throw new Error('Failed to get contract ABI')

        return {
            success: true,
            data: response.data.result,
        }
    }catch(err){
        console.log(err)
        return {
            success: false,
            message: err.message
        }
    }
}

 module.exports = {
    etherScanGetTokenAbi: getTokenAbi
 }