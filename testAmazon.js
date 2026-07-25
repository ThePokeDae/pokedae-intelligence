const { chromium } = require("playwright");

(async () => {
    const browser = await chromium.launch({
        headless: false,
        slowMo: 50
    });

    const page = await browser.newPage({
        viewport: {
            width: 1600,
            height: 1000
        },
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/138.0.0.0 Safari/537.36"
    });

    try {
        console.log("Opening Amazon...");

        await page.goto(
            "https://www.amazon.com/dp/B0GZ9S9KDR?th=1",
            {
                waitUntil: "domcontentloaded",
                timeout: 60000
            }
        );

        await page.waitForTimeout(5000);

        const currentUrl = page.url();
        const pageTitle = await page.title();

        console.log("\nTITLE:");
        console.log(pageTitle);

        console.log("\nCURRENT URL:");
        console.log(currentUrl);

        if (!currentUrl.toUpperCase().includes("B0GZ9S9KDR")) {
            console.log("\n❌ Amazon redirected away from the product.");
            console.log("No stock decision will be made.");
            return;
        }

        const bodyText = await page
            .locator("body")
            .innerText({ timeout: 15000 })
            .catch(() => "");

        const normalizedBody = bodyText
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

        const productTitle = await page
            .locator("#productTitle")
            .first()
            .textContent({ timeout: 3000 })
            .catch(() => null);

        const price =
            (await page
                .locator("#corePrice_feature_div .a-offscreen")
                .first()
                .textContent({ timeout: 3000 })
                .catch(() => null)) ||
            (await page
                .locator(".a-price .a-offscreen")
                .first()
                .textContent({ timeout: 3000 })
                .catch(() => null));

        const availability = await page
            .locator("#availability")
            .first()
            .textContent({ timeout: 3000 })
            .catch(() => null);

        const merchant = await page
            .locator("#merchant-info")
            .first()
            .textContent({ timeout: 3000 })
            .catch(() => null);

        const shipsFrom = await page
            .locator("#tabular-buybox-truncate-0")
            .first()
            .textContent({ timeout: 3000 })
            .catch(() => null);

        const soldBy = await page
            .locator("#tabular-buybox-truncate-1")
            .first()
            .textContent({ timeout: 3000 })
            .catch(() => null);

        const addToCartCount = await page
            .locator("#add-to-cart-button")
            .count();

        const buyNowCount = await page
            .locator("#buy-now-button")
            .count();

        const blocked =
            normalizedBody.includes("enter the characters you see below") ||
            normalizedBody.includes(
                "sorry, we just need to make sure you're not a robot"
            ) ||
            normalizedBody.includes(
                "type the characters you see in this image"
            );

        const unavailable =
            normalizedBody.includes("currently unavailable") ||
            normalizedBody.includes("temporarily out of stock") ||
            normalizedBody.includes(
                "we don't know when or if this item will be back in stock"
            ) ||
            normalizedBody.includes("no featured offers available");

        const correctProduct =
            Boolean(productTitle) &&
            productTitle.toUpperCase().includes("PITCH BLACK");

        const verifiedPurchaseButton =
            addToCartCount > 0 || buyNowCount > 0;

        let status = "unknown";
        let inStock = false;
        let reason = "No reliable stock decision could be made.";

        if (blocked) {
            status = "blocked";
            reason = "Amazon displayed a robot-check page.";
        } else if (!correctProduct) {
            status = "wrong_page";
            reason =
                "The expected product title was not found. No alert should be sent.";
        } else if (unavailable) {
            status = "out_of_stock";
            reason = "Amazon displayed an unavailable message.";
        } else if (verifiedPurchaseButton && price) {
            status = "in_stock";
            inStock = true;
            reason =
                "Correct product, price, and a verified purchase button were detected.";
        } else if (verifiedPurchaseButton && !price) {
            status = "possible_stock";
            reason =
                "A purchase button was found, but no price was confirmed. No alert should be sent.";
        }

        console.log("\nPRODUCT TITLE:");
        console.log(productTitle?.replace(/\s+/g, " ").trim() || "Not found");

        console.log("\nPRICE:");
        console.log(price?.trim() || "Not found");

        console.log("\nAVAILABILITY:");
        console.log(
            availability?.replace(/\s+/g, " ").trim() || "Not found"
        );

        console.log("\nMERCHANT:");
        console.log(merchant?.replace(/\s+/g, " ").trim() || "Not found");

        console.log("\nSHIPS FROM:");
        console.log(shipsFrom?.replace(/\s+/g, " ").trim() || "Not found");

        console.log("\nSOLD BY:");
        console.log(soldBy?.replace(/\s+/g, " ").trim() || "Not found");

        console.log("\nADD TO CART BUTTONS:");
        console.log(addToCartCount);

        console.log("\nBUY NOW BUTTONS:");
        console.log(buyNowCount);

        console.log("\nFINAL STATUS:");
        console.log(status);

        console.log("\nIN STOCK:");
        console.log(inStock);

        console.log("\nREASON:");
        console.log(reason);

        await page.screenshot({
            path: "amazon-test.png",
            fullPage: true
        });

        console.log("\nScreenshot saved as amazon-test.png");
        console.log("Waiting 10 seconds before closing...");

        await page.waitForTimeout(10000);
    } catch (error) {
        console.error("\n❌ Amazon test failed:");
        console.error(error.message);
    } finally {
        await browser.close();
        console.log("\n✅ Test complete.");
    }
})();