const express = require('express');
const cors = require('cors');
const Joi = require("joi");
const { Web3 } = require('web3');
const bodyParser = require('body-parser');
const { polygonGenerateWallet } = require('./modules/polygon');
const { derivePrivateKey, decodeTransferLog, getProviderUrl, getTokenContractAddress, sleep } = require('./modules/tools');
const { listenForTransaction, listenToAccount, listenToTokenTransfers } = require('./modules/listener');
const { coinGeckoGetCoinId, coinGeckoGetCoinInfo } = require('./modules/coingecko');
const { etherScanGetTokenAbi } = require('./modules/etherscan');
const app = express();
const port = 3002;

var dotenv = require("dotenv").config({
  path: __dirname + "/.env",
});


/* ---------------------------- Firestore imports --------------------------- */
const admin = require('firebase-admin');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');
const serviceAccount = require('./modules/firestore/serviceAccount.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(
  cors({
    origin: true,
  }));

app.use(bodyParser.json());

  // for parsing application/json
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
); 


app.get('/', (req, res) => {
  res.send('Hello World!');
});

/* -------------------------------------------------------------------------- */
/*                               FIRESTORE START                              */
/* -------------------------------------------------------------------------- */

const addFirestoreDoc = async ({collection, documentId, data}) => {
  try {
    if ((collection !== undefined && collection !== null) && (documentId !== undefined && documentId !== null) && (data !== undefined && data !== null)) {
      let createDoc = await admin.firestore().collection(collection).doc(documentId).set(data);
      return {
        success: true,
        message: "Doc created successfully!",
        payload: data
      }

    } else {
      const message = `L56: A particular property is undefined. collection: ${collection} id: ${documentId} data: ${JSON.stringify(data)}`
      console.log(message)
      return {
        success: false,
        message: message,
        payload: data
      }
    }
  } catch (error) {
    const message = `L65: Add Firestore Doc Encountered an Error: ${JSON.stringify(error?.response?.data ?? error.message)}, ${JSON.stringify({collection, documentId, data})}`;
    console.log(message)
    return {
      success: false,
      message: message,
      payload: data
    }
  }
}

const getFirestoreDoc = async ({collection, id}) => {
  try{
    console.log(collection, id)
    let collectionRef = admin.firestore().collection(`${collection}`).doc(`${id}`);
    let docReq = await collectionRef.get();
    let docData = docReq.data();

    return {
      success: true,
      message: "Data Fetched Successfully!",
      payload: docData
    }
  }catch(err){
    console.log(err);
    return {
      success: false,
      payload: undefined
    }
  }
}

// Helper function to handle failed operations
const updateFailedOperations = async (collection, documentId, data, message) => {
  await admin.firestore().collection('failed_operations').doc(documentId).set({
      data,
      id: documentId,
      error: message,
      collection
  });
}

const isObjectValid = (object) => Object.values(object).every(value => value !== undefined && value !== null);

const updateFirestoreDoc = async ({collection, documentId, data}) => {
  try {
      if (collection && documentId && data && typeof data === 'object' && typeof documentId === 'string' && typeof collection === 'string') {
          if (!isObjectValid(data)) {
            await updateFailedOperations(collection, documentId, data, "One of the data key/value pairs is undefined");
            return {
              success: false,
              data: data
            }
          }
          const ref = await admin.firestore().collection(collection).doc(documentId).get()
          if(!ref.exists) {
            await updateFailedOperations(collection, documentId, data, `${documentId} missing in ${collection}`);
            return {
              success: false,
              message: `${documentId} missing in ${collection}`
            }
          }
          const updateRef = await ref.update(data);
          return {
              success: true,
              message: updateRef
          }
      } else {
          await updateFailedOperations(collection, documentId, data, "Value could not be updated due to being invalid");
          return {
              success: false,
              message: 'Missing value in update operation'
          }
      }
  } catch (err) {
      await updateFailedOperations(collection, documentId, data, err.message);
      return {
          success: false,
          message: err.message
      }
  }
}


/* -------------------------------------------------------------------------- */
/*                                FIRESTORE END                               */
/* -------------------------------------------------------------------------- */

const _generateCryptoWalletSchema = async function (req, res, next) {
  // define base schema rules
  try {
    const schema = Joi.object({
      network: Joi.string().required(),
      sandbox: Joi.boolean().default(true),
      expectedAmount: Joi.number().required(),
    });

    // schema options
    const options = {
      abortEarly: true, // include all errors
      allowUnknown: false, // ignore unknown props
      stripUnknown: true, // remove unknown props
    };

    // validate request body against schema
    const {
      error,
      value
    } = schema.validate(req.body, options);

    if (error) {
      // on fail return comma separated errors
      // next(`Validation error: ${error.details.map(x => x.message).join(', ')}`);
      res.status(400).json({
        success: false,
        message: `Please enter a valid ${error.details[0].context.label}.`,
        error: `Validation error: ${error.details
          .map((x) => x.message)
          .join(", ")}`,
        payload: req.body,
      });
      // throw new Error(error);
    } else {
      // on success replace req.body with validated value and trigger next middleware function
      req.body = value;
      return next();
    }
  } catch (err) {
    console.error(`[E190] ${err.message}`);
    res.status(400).json({
      success: false,
      message: `[E190] ${err.message}`,
      payload: req.body,
    });
  }
};

app.post('/crypto/generate-wallet', _generateCryptoWalletSchema, async(req, res) => {
  try{
    const body = req.body
    console.log("L202",JSON.stringify(body))

    const network = body.network
    const expectedAmount = body.expectedAmount
    const sandbox = body.sandbox

    const serviceRef = await getFirestoreDoc({
      collection: 'services',
      id: "generateService",
    });
    const service = serviceRef.payload

    console.log(service)

    if(!service.active) throw new Error('Service is currently unavailable.')
  
    const providerUrl = await getProviderUrl({
      network,
      sandbox
    })

    if(!providerUrl) throw new Error('Failed to fetch provider.')

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

      // sendERC20Token({
      //     from: '0x69B110057dB59C3E8A9b4268C3eB894e8a1bC04b',
      //     to: address,
      //     amount: expectedAmount,
      //     senderPrivateKey: 'c3080f148f464cfbb52436ae032c2954b0d6b5a673c6692af89e3a10f30ecb55',
      //     token: 'LINK',
      //     network: 'POLYGON',
      // })

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
    res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

const generateWallet = async ({network, expectedAmount, sandbox = true}) => {
  
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
