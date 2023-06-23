const express = require('express');
const cors = require('cors');
const Web3 = require('web3');
const bodyParser = require('body-parser');
const { polygonGenerateWallet, sendERC20Token } = require('./modules/polygon');
const { derivePrivateKey } = require('./modules/tools');
const { listenForTransaction, listenToAccount } = require('./modules/listener');
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


const generateWallet = async ({network, amount, sandbox = true}) => {
  try{
    network =  network.toUpperCase();

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

      // listenForTransaction({
      //   expectedAmount: amount,
      //   address,
      //   providerUrl: response.data.providerUrl,
      // })
      listenToAccount({
        address,
        providerUrl: response.data.providerUrl,
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

// generateWallet({
//   network: "polygon",
//    amount: "0.5",
// })

const getCoinData = async (symbol) => {
  try {
      const coinId = await coinGeckoGetCoinId(symbol);
      if(!coinId.success) throw new Error("Failed to get coin id.")

      const coinInfo = await coinGeckoGetCoinInfo(coinId.data.id);
      if(!coinInfo.success) throw new Error("Failed to get coin info")
      coinInfo.data.image = coinId.data.image

      const abi = await etherScanGetTokenAbi({
        contract_address: coinInfo.data.contract_address
      });
      if(!abi.success) throw new Error("Failed to get coin id.")

      const obj = {
        info: coinInfo.data,
        abi: abi.data
      }

      console.log({
        success: true,
        data: obj
      })

      return {
        success: true,
        data: obj
      }
  } catch (err) {
      console.error(err);

      return {
        success: false,
        data: err.message,
      }
  }
};

// getCoinData("usdc")

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
