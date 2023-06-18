const Web3 = require('web3');
const path = require('path');
const bip39 = require('bip39'); 
require('dotenv').config({
    path: path.join(__dirname, '../', './.env'),
});

const listenForTransaction = async ({provider, address, expectedAmount, tokenContractAddresses}) => {
    try{
      const web3 = new Web3(provider);
      
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
                          provider.engine.stop();  // Close the connection
                      });
                  }
              }
          });
      }).on("error", console.error); 
    }catch(err){
      return {
          success: false,
          data: err?.response?.data ?? err.message
      }
    }
}
  

module.exports = {
    listenForTransaction
}