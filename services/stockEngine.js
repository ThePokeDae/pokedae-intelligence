const checkAmazonStock = require("./amazon");

class StockEngine {
    constructor() {
        this.lastStatus = new Map();
    }

    async checkProduct(product) {
        console.log(`🔍 Checking ${product.name}...`);

        let stockResult;

        switch (product.retailer.toLowerCase()) {
            case "amazon":
                stockResult = await checkAmazonStock(product);
                break;

            default:
                stockResult = {
                    status: "unsupported",
                    inStock: false,
                    reason: `Retailer "${product.retailer}" is not supported yet.`,
                    price: null,
                    availability: null
                };
        }

        return {
            id: product.id,
            name: product.name,
            retailer: product.retailer,
            url: product.url,
            checkedAt: new Date().toISOString(),
            ...stockResult
        };
    }
}

module.exports = StockEngine;