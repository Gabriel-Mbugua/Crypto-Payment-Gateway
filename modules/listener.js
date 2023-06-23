const { Web3 } = require('web3');
const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '../', './.env'),
});
const webSocket = process.env.POLYGON_TESTNET_WEBSOCKET
const web3 = new Web3(new Web3.providers.WebsocketProvider(webSocket));


const listenForTransaction = async ({providerUrl, address, expectedAmount, tokenContractAddresses}) => {
    try{
        console.log('listening...')
        console.log({providerUrl, address, expectedAmount, tokenContractAddresses})
        const web3 = new Web3(providerUrl);
        
        // Convert the tokenContractAddresses to lowercase for easier comparison
        const lowercaseTokenContractAddresses = tokenContractAddresses.map(addr => addr.toLowerCase());
        
        const subscription = web3.eth.subscribe('newBlockHeaders', async (error, blockHeader) => {
            if (error) {
                // TODO: fetch all address transaction in the event of a failure
                console.error(error);
                return;
            }
    
            // Get the full block data
            const block = await web3.eth.getBlock(blockHeader.number, true);
    
            // Check the transactions
            block.transactions.forEach((tx) => {
                console.log(tx)
                // Check if it's a token transfer
                if (tx.to && lowercaseTokenContractAddresses.includes(tx.to.toLowerCase()) && tx.input.startsWith('0xa9059cbb')) {
                    const recipientAddress = `0x${tx.input.slice(34,74)}`;
                    const amount = web3.utils.hexToNumberString(`0x${tx.input.slice(74)}`);
                    
                    if (recipientAddress.toLowerCase() === address.toLowerCase() && amount === expectedAmount) {
                        console.log('Received token payment:', tx);
    
                        // Unsubscribe and close the WebSocket connection
                        subscription.unsubscribe((error, success) => {
                            if (error) {
                                return console.error(error);
                            }
    
                            console.log('Successfully unsubscribed:', success);
                        });
                    }
                }
            });
        }).on("error", console.error); 
    }catch(err){
        console.error(err);
        return {
            success: false,
            data: err?.response?.data ?? err.message
        }
    }
}

const listenToAccount = async ({address}) => {
    try{
        console.log(`listening to ${address}.`)

        let subId
        
        let options = {
            address
        };
        
        // Subscribe to logs
        const subscription = await web3.eth.subscribe('newPendingTransactions')
        
        subscription.on('connected', async id => {
            console.log('Subscription id: ', id);
        });

        subscription.on('data', async transactionHash => {
            try{
                const transaction = await web3.eth.getTransaction(transactionHash);
                console.log(`TransctionHash: ${transactionHash} to: ${transaction.to}`);
                if (transaction && transaction.to && transaction?.to.toLowerCase() === address.toLowerCase()) {
                console.log('New pending transaction for address:', transaction);
                }
            }catch(err){
                console.error('Error when fetching transaction:', err);
            }
        });
        subscription.on('error', error =>
            console.log('Error when subscribing to New block header: ', error),
        );
    }catch(err){
        console.log(err);
        return {
            success: false,
            data: err?.response?.data ?? err.message
        }
    }
}
  

module.exports = {
    listenForTransaction,
    listenToAccount
}