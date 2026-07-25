const path = require("path");
const { chromium } = require("playwright");

function cleanText(value) {
    if (!value) return null;

    return value
        .replace(/\s+/g, " ")
        .trim();
}

async function getText(page, selector, timeout = 4000) {
    return page
        .locator(selector)
        .first()
        .textContent({ timeout })
        .then(cleanText)
        .catch(() => null);
}

async function getCount(page, selector) {
    return page
        .locator(selector)
        .count()
        .catch(() => 0);
}

function emptyResult(status, reason) {
    return {
        status,
        inStock: false,
        reason,
        price: null,
        availability: null,
        title: null,
        merchant: null,
        shipsFrom: null,
        soldBy: null
    };
}

async function checkAmazonStock(product) {
    let context;

    try {
        console.log("🟠 Launching Amazon checker...");

        const profileDirectory = path.join(
            __dirname,
            "..",
            "browser-profile"
        );

        context = await chromium.launchPersistentContext(
            profileDirectory,
            {
                headless: false,
                viewport: {
                    width: 1600,
                    height: 1000
                },
                locale: "en-US",
                args: [
                    "--disable-blink-features=AutomationControlled"
                ]
            }
        );

        context.setDefaultTimeout(5000);
        context.setDefaultNavigationTimeout(60000);

        const existingPages = context.pages();

        const page =
            existingPages.length > 0
                ? existingPages[0]
                : await context.newPage();

        const separator = product.url.includes("?") ? "&" : "?";
        const productUrl = `${product.url}${separator}th=1`;

        console.log("🌐 Opening Amazon product page...");

        await page.goto(productUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        await page.waitForTimeout(5000);

        const currentUrl = page.url();
        const pageTitle = await page.title();

        console.log(`📍 Loaded: ${pageTitle}`);
        console.log(`🔗 URL: ${currentUrl}`);

        if (
            !product.asin ||
            !currentUrl
                .toUpperCase()
                .includes(product.asin.toUpperCase())
        ) {
            return emptyResult(
                "wrong_page",
                "Amazon redirected away from the expected ASIN. No alert will be sent."
            );
        }

        const productTitle = await getText(
            page,
            "#productTitle"
        );

        const price =
            (await getText(
                page,
                "#corePrice_feature_div .a-offscreen"
            )) ||
            (await getText(
                page,
                "#corePriceDisplay_desktop_feature_div .a-offscreen"
            )) ||
            (await getText(
                page,
                "#apex_desktop .a-price .a-offscreen"
            )) ||
            (await getText(
                page,
                ".a-price .a-offscreen"
            ));

        const availability = await getText(
            page,
            "#availability"
        );

        const merchant =
            (await getText(page, "#merchant-info")) ||
            (await getText(
                page,
                "#sellerProfileTriggerId"
            ));

        const shipsFrom = await getText(
            page,
            "#tabular-buybox-truncate-0"
        );

        const soldBy = await getText(
            page,
            "#tabular-buybox-truncate-1"
        );

        const addToCartCount = await getCount(
            page,
            "#add-to-cart-button"
        );

        const buyNowCount = await getCount(
            page,
            "#buy-now-button"
        );

        const bodyText = await page
            .locator("body")
            .innerText({ timeout: 10000 })
            .catch(() => "");

        const normalizedBody = bodyText
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

        const normalizedTitle = (productTitle || "")
            .toUpperCase()
            .replace(/[—–-]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const blocked =
            normalizedBody.includes(
                "enter the characters you see below"
            ) ||
            normalizedBody.includes(
                "sorry, we just need to make sure you're not a robot"
            ) ||
            normalizedBody.includes(
                "type the characters you see in this image"
            );

        const unavailable =
            normalizedBody.includes(
                "currently unavailable"
            ) ||
            normalizedBody.includes(
                "temporarily out of stock"
            ) ||
            normalizedBody.includes(
                "we don't know when or if this item will be back in stock"
            ) ||
            normalizedBody.includes(
                "no featured offers available"
            );

        const correctProduct =
            normalizedTitle.includes("POK") &&
            normalizedTitle.includes("PITCH BLACK") &&
            normalizedTitle.includes("BOOSTER") &&
            normalizedTitle.includes("DISPLAY");

        const verifiedPurchaseButton =
            addToCartCount > 0 ||
            buyNowCount > 0;

        const baseData = {
            price,
            availability,
            title: productTitle,
            merchant,
            shipsFrom,
            soldBy
        };

        if (blocked) {
            return {
                status: "blocked",
                inStock: false,
                reason:
                    "Amazon displayed a robot-check page. No alert will be sent.",
                ...baseData
            };
        }

        if (!productTitle || !correctProduct) {
            return {
                status: "wrong_page",
                inStock: false,
                reason:
                    "The expected product title was not confirmed. No alert will be sent.",
                ...baseData
            };
        }

        if (unavailable) {
            return {
                status: "out_of_stock",
                inStock: false,
                reason:
                    "Amazon displayed a confirmed unavailable message.",
                ...baseData
            };
        }

        if (
            correctProduct &&
            price &&
            verifiedPurchaseButton
        ) {
            return {
                status: "in_stock",
                inStock: true,
                reason:
                    "Correct product, price, and purchase button were confirmed.",
                ...baseData
            };
        }

        if (
            correctProduct &&
            verifiedPurchaseButton &&
            !price
        ) {
            return {
                status: "possible_stock",
                inStock: false,
                reason:
                    "A purchase button was found, but the price was not confirmed. No alert will be sent.",
                ...baseData
            };
        }

        return {
            status: "unknown",
            inStock: false,
            reason:
                "The product page loaded, but the required stock signals were incomplete. No alert will be sent.",
            ...baseData
        };
    } catch (error) {
        return emptyResult(
            "error",
            error.message
        );
    } finally {
        if (context) {
            await context.close().catch(() => {});
        }

        console.log("✅ Amazon checker finished.");
    }
}

module.exports = checkAmazonStock;