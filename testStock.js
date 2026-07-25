const StockEngine = require("./services/stockEngine");
const products = require("./data/products.json");

async function run() {
    const engine = new StockEngine();

    for (const product of products) {
        console.log(`\n🔍 Checking ${product.name}...`);

        const result = await engine.checkProduct(product);

        console.log(result);
    }
}

run();