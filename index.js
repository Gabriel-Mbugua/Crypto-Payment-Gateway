const express = require('express');
const cors = require('cors');
const { Web3 } = require('web3');
const bodyParser = require('body-parser');
const { polygonGenerateWallet } = require('./modules/polygon');
const { derivePrivateKey, decodeTransferLog, getProviderUrl, getTokenContractAddress, sleep } = require('./modules/tools');
const { listenForTransaction, listenToAccount, listenToTokenTransfers } = require('./modules/listener');
const { coinGeckoGetCoinId, coinGeckoGetCoinInfo } = require('./modules/coingecko');
const { etherScanGetTokenAbi } = require('./modules/etherscan');
const app = express();
const port = 3002;


app.use(
  cors({
    origin: true,
  }));

  // for parsing application/json
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
); 


app.get('/', (req, res) => {
  res.send('Hello World!');
});


const generateWallet = async ({network, expectedAmount, sandbox = true}) => {
  try{
    network =  network.toUpperCase();

    const providerUrl = await getProviderUrl({
      network,
      sandbox
    })

    if(network === "POLYGON"){
      const response = await polygonGenerateWallet({sandbox})
      if(!response.success) return response
      
      const address = response.data.publicKey
      const privateKey = response.data.privateKey

      const walletObj = {
        address,
        privateKey,
        sandbox,
      }

      listenToTokenTransfers({
        address,
        expectedAmount
      })

      // listenToAccount({
      //   address,
      // })

      // sleep(10000)

      sendERC20Token({
          from: '0x69B110057dB59C3E8A9b4268C3eB894e8a1bC04b',
          to: address,
          amount: expectedAmount,
          senderPrivateKey: 'c3080f148f464cfbb52436ae032c2954b0d6b5a673c6692af89e3a10f30ecb55',
          token: 'LINK',
          network: 'POLYGON',
      })

      console.log(walletObj)

      return {
        success: true,
        data: walletObj
      }
    }else{
      return {
        success: false,
        data: "Unsupported network."
      }
    }
  }catch(err){
    console.log(err)
    return {
      success: false,
      message: err?.response?.data ?? err.message
    }
  }
}

const getTokenContractAddresses = async () => {
  try{
    return {
      success: true,
    }
  }catch(err){
    return {
      success: false,
      data: err?.response?.data ?? err.message
    }
  }
}

// publicKey: '0x69B110057dB59C3E8A9b4268C3eB894e8a1bC04b', //sender
// privateKey: 'c3080f148f464cfbb52436ae032c2954b0d6b5a673c6692af89e3a10f30ecb55',

// publicKey: '0xCB33b913dCe7379D5B409CA236d4e3fb79f01F71', // receiver
// privateKey: '3cea67814b3bc20e7807419e928fb98a3966c6eef1f1541cc7e8e030f0167d32',


const sendERC20Token = async ({network ,from, to, amount, token, senderPrivateKey, sandbox = true}) => {
  try{
    console.log({network ,from, to, amount, token, senderPrivateKey, sandbox})
      const providerUrl = await getProviderUrl({
        network,
        sandbox
      })

      if(!providerUrl) throw new Error("Unsupported provider")

      const web3 = new Web3(providerUrl);

      const gasPrice = await web3.eth.getGasPrice();

      // Fetch the token contract address
      const tokenContractAddress = getTokenContractAddress(token)

      if(!tokenContractAddress) throw new Error('Token not supported')

      // Generate the transfer function signature
      const transferFunctionSignature = web3.eth.abi.encodeFunctionSignature('transfer(address,uint256)');

      // const tokenDecimalsData = await getTokenDecimals({
      //     providerUrl: providerUrl,
      //     contractAddress: tokenContractAddress
      // })

      // if(!tokenDecimalsData.success) throw new Error("Failed to fetch token decimals.")

      // console.log(tokenDecimalsData)

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

// module.exports = {
//   sendERC20Token
// }

// generateWallet({
//   network: "polygon",
//   expectedAmount: "0.001",
// })

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
