const hdkey = require('hdkey');
const path = require('path');
const bip39 = require('bip39'); 
const { Web3 } = require('web3');
const { coinGeckoGetCoinId, coinGeckoGetCoinInfo } = require('./coingecko');
const { etherScanGetTokenAbi } = require('./etherscan');
require('dotenv').config({
    path: path.join(__dirname, '../', './.env'),
});

/* -------------------------------- HTTPS URL ------------------------------- */
const ethereumTestnetRpc = process.env.ETHEREUM_TESTNET_RPC
const ethereumMainnetRpc = process.env.ETHEREUM_TESTNET_RPC
const polygonTestnetRpc = process.env.POLYGON_TESTNET_RPC
const polygonMainnetRpc = process.env.POLYGON_TESTNET_RPC

/* ----------------------------- WEBSOCKET URLS ----------------------------- */
const polygonMainnetWebsocket = process.env.POLYGON_MAINNET_WEBSOCKET
const polygonTestnetWebsocket = process.env.POLYGON_TESTNET_WEBSOCKET

/* ------------------------ Token contract addresses ------------------------ */
const tokenContractAddresses = {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', 
    MATIC: '0x0000000000000000000000000000000000001010',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    LINK: '0x326C977E6efc84E512bB9C30f76E30c160eD06FB' // 
    // Add more token symbols and contract addresses as needed
};

const sandboxTokenContractAddresses = {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', 
    MATIC: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
    USDT: '0x4A90D5aE01F03B650cdc8D3A94358F364D98d096',
    USDC: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23',
    LINK: '0x326C977E6efc84E512bB9C30f76E30c160eD06FB' // 
    // Add more token symbols and contract addresses as needed
};

/* - maps networks to the respesctive uniswap swapRouter contract addresses - */
const UNISWAP_V3_SWAP_ROUTER_ADDRESSES = {
    eth: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    goerli: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    polygon: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    arbitrum: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    optimism: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    celo: "0x5615CDAb10dc425a742d643d949a7F474C01abc4",
    bsc: "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
}

const getProviderUrl = async ({network, sandbox = true}) => {
    try{
        let providerUrl;
        switch(network.toLowerCase()) {
            case 'ethereum':
                providerUrl = sandbox
                    ? ethereumTestnetRpc
                    : ethereumMainnetRpc
                break;
            case 'polygon':
                providerUrl = sandbox
                    ? polygonTestnetRpc
                    : polygonTestnetRpc
                break;
            default:
                providerUrl = undefined
        }
        return providerUrl;
    }catch(err){
        return undefined
    }
}

const getWebsocketUrl = async ({network, sandbox = true}) => {
    try{
        let websocketUrl;
        switch(network.toLowerCase()) {
            case 'ethereum':
                websocketUrl = sandbox
                    ? ethereumTestnetRpc
                    : ethereumMainnetRpc
                break;
            case 'polygon':
                websocketUrl = sandbox
                    ? polygonTestnetWebsocket
                    : polygonMainnetWebsocket
                break;
            default:
                websocketUrl = undefined
                break
        }
        return websocketUrl;
    }catch(err){
        return undefined
    }
}

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

// getCoinData("link")

const decodeTransferLog = async ({symbol, providerUrl, log}) => {
    try{
        const web3 = new Web3(providerUrl);

        const tokenInfo = await getCoinData(symbol)

        if(!tokenInfo.success) throw new Error(tokenInfo.data)

        const contractAbiJson = tokenInfo.data.abi
        const contractAbi = JSON.parse(contractAbiJson)

        // Find the Transfer event in the contract ABI
        const transferEventAbi = contractAbi.find(
            (abi) => abi.name === 'Transfer' && abi.type === 'event'
        );
    
        // If the Transfer event isn't in the ABI, return null
        if (!transferEventAbi) {
            return null;
        }
    
        // Hash the Transfer event signature
        const eventSignature = web3.eth.abi.encodeEventSignature(transferEventAbi);
    
        // If the log's topics[0] doesn't match the event signature, return null
        if (log.topics[0] !== eventSignature) throw new Error("Does not match event signature")
    
        
        // Decode the log data
        const decoded = web3.eth.abi.decodeLog(
            transferEventAbi.inputs,
            log.data,
            log.topics.slice(1) // remove the event signature from the topics
        );

        console.log("Decoded:",decoded)
    
        return decoded;
    }catch(err){
        console.log(err);
        return {
            success: false,
            data: err.message
        }
    }
}

const getTokenDecimals = async ({providerUrl, contractAddress}) => {
    try{
        const web3 = new Web3(providerUrl);
        const minABI = [
            // decimals
            {
                "constant":true,
                "inputs":[],
                "name":"decimals",
                "outputs":[{"name":"","type":"uint8"}],
                "type":"function"
            }
        ];
        const contract = new web3.eth.Contract(minABI, contractAddress);
        const decimals = await contract.methods.decimals().call();
        return {
            success: true,
            data: decimals
        }
    }catch(err){
        console.log(err);
        return {
            success: false,
            data: err.message
        }
    }
};


const sleep = (ms) => {
    console.log('\nSleep: ', ms, 'milliseconds.\n');
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

module.exports = {
    sleep,
    getCoinData,
    getProviderUrl,
    getTokenDecimals,
    derivePrivateKey,
    decodeTransferLog,
    getTokenContractAddress,
    UNISWAP_V3_SWAP_ROUTER_ADDRESSES
}