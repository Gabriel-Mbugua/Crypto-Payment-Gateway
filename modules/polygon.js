const { Web3 } = require('web3')
const path = require('path');
const bip39 = require('bip39'); 
const { getTokenContractAddress } = require('./tools');
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


const deprecatedGenerateWallet = async ({sandbox = true}) => {
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
                providerUrl
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

const generateWallet = async ({sandbox = true}) => {
    try{     
        const providerUrl = sandbox
            ? polygonTestnetRpc
            : polygonMainnetRpc

        const web3 = new Web3(providerUrl);
            
        const account = web3.eth.accounts.create(); // This creates a new account

        let privateKey = account.privateKey.substr(2); // Get the private key
        let publicKey = account.address; // Get the address

        console.log({
            publicKey,
            privateKey,
            providerUrl
        })

        return {
            success: true,
            data: {
                publicKey,
                privateKey,
                providerUrl
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

const sendToken = async ({from, to, amount, token, senderPrivateKey, sandbox = true}) => {
    try{
        const providerUrl = sandbox
            ? polygonTestnetRpc
            : polygonMainnetRpc

        const web3 = new Web3(providerUrl);

        const gasPrice = await web3.eth.getGasPrice();

        const tokenAmount = web3.utils.toWei(amount.toString(), 'ether');

        const transactionObject = {
            from,
            to: to,
            value: tokenAmount,
            gasPrice: gasPrice,
        };

        transactionObject.gas = await web3.eth.estimateGas(transactionObject);

        console.log(transactionObject);

        const signedTransaction = await web3.eth.accounts.signTransaction(
            transactionObject,
            senderPrivateKey
        );

        const rawTransaction = signedTransaction.rawTransaction;

        if(rawTransaction) throw new Error('Failed to send transaction.')

        const receipt = await web3.eth.sendSignedTransaction(rawTransaction);

        if(receipt?.transactionHash) throw new Error('Failed to send transaction.')

        console.log('Transaction successful:', receipt);

        return {
            success: true,
            data: receipt
        }
    }catch(err){
        console.log(err)
        return {
            success: false,
            data: err.message
        }
    }
}

// sendToken({
//     from: '0x69B110057dB59C3E8A9b4268C3eB894e8a1bC04b',
//     to: '0xCB33b913dCe7379D5B409CA236d4e3fb79f01F71',
//     amount: '0.1',
//     senderPrivateKey: 'c3080f148f464cfbb52436ae032c2954b0d6b5a673c6692af89e3a10f30ecb55',
//     token: 'MATIC',
// }) 

const sendERC20Token = async ({from, to, amount, token, senderPrivateKey, sandbox = true}) => {
    try{
        console.log({from, to, amount, token, senderPrivateKey})
        const providerUrl = sandbox
            ? polygonTestnetRpc
            : polygonMainnetRpc

        const web3 = new Web3(providerUrl);

        const gasPrice = await web3.eth.getGasPrice();

        // Fetch the token contract address
        const tokenContractAddress = getTokenContractAddress(token)

        if(!tokenContractAddress) throw new Error('Token not supported')

        // Generate the transfer function signature
        const transferFunctionSignature = web3.eth.abi.encodeFunctionSignature('transfer(address,uint256)');

        const tokenDecimals = 18; // replace with the actual number of decimals of the token
        const amountInDecimal = parseFloat(amount); // Convert to a decimal number
        const amountInSmallestUnit = amountInDecimal * (10 ** tokenDecimals); // Convert to the smallest unit

        // Now, convert to a BigInt
        const smallestUnitAmount = BigInt(Math.floor(amountInSmallestUnit)); // Use Math.floor to round down to the nearest whole number

         // Generate the data field for the transaction
        const data = transferFunctionSignature + web3.eth.abi.encodeParameters(['address', 'uint256'], [to, smallestUnitAmount]).slice(2);

        
        const transactionObject = {
            from,
            to: tokenContractAddress,
            value: '0',
            gasPrice: gasPrice,
            data: data,
        };
        transactionObject.gas = await web3.eth.estimateGas(transactionObject);

        console.log(transactionObject);

        const signedTransaction = await web3.eth.accounts.signTransaction(
            transactionObject,
            senderPrivateKey
        );

        const rawTransaction = signedTransaction.rawTransaction;

        const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
        console.log('Transaction successful:', receipt);
    }catch(err){
        console.log(err)
        return {
            success: false,
            data: err.message
        }
    }
}

// sendERC20Token({
//     from: '0x69B110057dB59C3E8A9b4268C3eB894e8a1bC04b',
//     to: '0xCB33b913dCe7379D5B409CA236d4e3fb79f01F71',
//     amount: '0.1',
//     senderPrivateKey: 'c3080f148f464cfbb52436ae032c2954b0d6b5a673c6692af89e3a10f30ecb55',
//     token: 'LINK',
// })  

module.exports = {
    polygonGenerateWallet: generateWallet,
    sendERC20Token,
}
