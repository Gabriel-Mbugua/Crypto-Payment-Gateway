const axios = require('axios');

const supportedTokens = {
    'eth': 'ethereum',
    'btc': 'bitcoin',
    'usdc': 'usd-coin',
    'usdt': 'tether',
    'matic': 'matic-network',
};


const getCoinId = async (symbol) => {
    try {
        const coinId = supportedTokens[symbol.toLowerCase()];
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}`
        const response = await axios.get(url);
        if (response.data.length < 1) throw new Error(`No coin found with symbol: ${symbol}`);
        return {
            success: true,
            data: {
                id: response.data[0].id,
                symbol: response.data[0].symbol,
                name: response.data[0].name,
                image: response.data[0].image,
            }
        }
    } catch (err) {
        return {
            success: false,
            data: err.message
        }
    }
};

const getCoinInfo = async (coinId) => {
    try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`);
        return {
            success: true,
            data: {
                id: response.data.id,
                symbol: response.data.symbol,
                name: response.data.name,
                platforms: response.data.platforms,
                contract_address: response.data.platforms['ethereum'], // if it's an Ethereum token
            }
        };
    } catch (err) {
        return {
            success: false,
            data: err.message
        }
    }
};

module.exports = {
    coinGeckoGetCoinId: getCoinId,
    coinGeckoGetCoinInfo: getCoinInfo
};