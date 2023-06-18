const express = require('express');
const cors = require('cors');
const Web3 = require('web3');
const bodyParser = require('body-parser');
const { polygonGenerateWallet } = require('./modules/polygon');
const { derivePrivateKey } = require('./modules/tools');
const { listenForTransaction } = require('./modules/listener');
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
      
      const provider = response.data.provider
      const address = await provider.getAddresses()[0]
      // const privateKey = provider.wallets[address].privateKey.toString('hex')

      const privateKeyRef = await derivePrivateKey({mnemonic: response.data.mnemonic})

      if(!privateKeyRef.success) return privateKeyRef

      const privateKey = privateKeyRef.data

      const walletObj = {
        address,
        privateKey,
        mnemonic: response.data.mnemonic,
      }

      listenForTransaction({provider, address, amount})

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

// generateWallet({
//   network: "polygon",
//    amount: "0.5",
// })

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
