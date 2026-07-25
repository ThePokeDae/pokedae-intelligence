const StockEngine = require("./stockEngine");
const products = require("../data/products.json");

class StockMonitor {
    constructor(options = {}) {
        this.engine = new StockEngine();

        this.intervalMs =
            options.intervalMs || 60_000;

        this.onStockChange =
            options.onStockChange || (async () => {});

        this.onCheck =
            options.onCheck || (async () => {});

        this.onError =
            options.onError || (async () => {});

        this.previousResults = new Map();

        this.timer = null;
        this.isRunning = false;
        this.isChecking = false;
    }

    async checkAllProducts() {
        if (this.isChecking) {
            console.log(
                "⏭️ Previous stock scan is still running. Skipping this cycle."
            );
            return;
        }

        this.isChecking = true;

        console.log("\n======================================");
        console.log(
            `🧠 PokéDaé stock scan started: ${new Date().toLocaleString()}`
        );
        console.log("======================================");

        try {
            const enabledProducts = products.filter(
                (product) => product.enabled
            );

            for (const product of enabledProducts) {
                try {
                    const result =
                        await this.engine.checkProduct(product);

                    await this.onCheck(result);

                    const previous =
                        this.previousResults.get(product.id);

                    console.log(
                        `📦 ${product.name}: ${result.status}` +
                        `${result.price ? ` — ${result.price}` : ""}`
                    );

                    if (!previous) {
                        this.previousResults.set(
                            product.id,
                            result
                        );

                        console.log(
                            "📝 Initial status recorded. No Discord alert sent."
                        );

                        continue;
                    }

                    const becameAvailable =
                        previous.inStock !== true &&
                        result.inStock === true;

                    const becameUnavailable =
                        previous.inStock === true &&
                        result.inStock === false &&
                        result.status === "out_of_stock";

                    const priceChanged =
                        result.inStock === true &&
                        previous.price &&
                        result.price &&
                        previous.price !== result.price;

                    if (
                        becameAvailable ||
                        becameUnavailable ||
                        priceChanged
                    ) {
                        await this.onStockChange({
                            product,
                            previous,
                            current: result,
                            changeType: becameAvailable
                                ? "back_in_stock"
                                : becameUnavailable
                                    ? "out_of_stock"
                                    : "price_changed"
                        });
                    } else {
                        console.log(
                            "🔕 No meaningful stock change. No alert sent."
                        );
                    }

                    this.previousResults.set(
                        product.id,
                        result
                    );
                } catch (error) {
                    console.error(
                        `❌ Product check failed for ${product.name}:`,
                        error.message
                    );

                    await this.onError({
                        product,
                        error
                    });
                }
            }
        } finally {
            this.isChecking = false;

            console.log("======================================");
            console.log("✅ PokéDaé stock scan finished.");
            console.log("======================================\n");
        }
    }

    async start() {
        if (this.isRunning) {
            console.log(
                "⚠️ Stock monitor is already running."
            );
            return;
        }

        this.isRunning = true;

        console.log(
            `🚀 Stock monitor started. Checking every ${
                this.intervalMs / 1000
            } seconds.`
        );

        await this.checkAllProducts();

        this.timer = setInterval(async () => {
            await this.checkAllProducts();
        }, this.intervalMs);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.isRunning = false;

        console.log("🛑 Stock monitor stopped.");
    }
}

module.exports = StockMonitor;