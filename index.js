require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

const StockMonitor = require("./services/stockMonitor");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const stores = {
  amazon: {
    name: "Amazon",
    emoji: "🟠",
    channel: "🟠-amazon-alerts",
  },
  walmart: {
    name: "Walmart",
    emoji: "🟦",
    channel: "🟦-walmart-alerts",
  },
  target: {
    name: "Target",
    emoji: "🎯",
    channel: "🎯-target-alerts",
  },
  gamestop: {
    name: "GameStop",
    emoji: "🔴",
    channel: "🔴-gamestop-alerts",
  },
  "pokemon-center": {
    name: "Pokémon Center",
    emoji: "🟢",
    channel: "🟢-pokemon-center",
  },
  "best-buy": {
    name: "Best Buy",
    emoji: "🟡",
    channel: "🟡-best-buy-alerts",
  },
  "barnes-noble": {
    name: "Barnes & Noble",
    emoji: "📚",
    channel: "📚-barnes-noble",
  },
  "sams-club": {
    name: "Sam's Club",
    emoji: "🟣",
    channel: "🟣-sams-club",
  },
  costco: {
    name: "Costco",
    emoji: "🔵",
    channel: "🔵-costco-alerts",
  },
  other: {
    name: "Retail Alert",
    emoji: "🚨",
    channel: "🔥-all-alerts",
  },
};

function findTextChannel(guild, channelName) {
  return guild.channels.cache.find(
    (channel) =>
      channel.isTextBased() &&
      channel.name.toLowerCase() === channelName.toLowerCase()
  );
}

function cleanValue(value, fallback = "Not available") {
  if (!value) return fallback;

  return String(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1024);
}

function getAutomatedAlertDetails(changeType) {
  switch (changeType) {
    case "back_in_stock":
      return {
        title: "🚨 AMAZON RESTOCK ALERT",
        stockText: "✅ IN STOCK",
        description: "Amazon just showed verified purchasing signals.",
      };

    case "price_changed":
      return {
        title: "💵 AMAZON PRICE CHANGE",
        stockText: "✅ STILL IN STOCK",
        description: "The live Amazon price changed while the item remained available.",
      };

    case "out_of_stock":
      return {
        title: "📦 AMAZON STOCK UPDATE",
        stockText: "❌ OUT OF STOCK",
        description: "Amazon is now showing a confirmed unavailable status.",
      };

    default:
      return {
        title: "🚨 POKÉDAÉ STOCK UPDATE",
        stockText: "Stock updated",
        description: "A verified product status change was detected.",
      };
  }
}

async function sendAutomatedStockAlert({
  product,
  previous,
  current,
  changeType,
}) {
  const store = stores[product.channelKey] || stores[product.retailer] || stores.other;
  const alertDetails = getAutomatedAlertDetails(changeType);

  const embed = new EmbedBuilder()
    .setTitle(alertDetails.title)
    .setDescription(
      `## ${store.emoji} ${store.name}\n` +
      `### ${cleanValue(current.title || product.name)}\n\n` +
      alertDetails.description
    )
    .addFields(
      {
        name: "💵 Current Price",
        value: cleanValue(current.price),
        inline: true,
      },
      {
        name: "📦 Stock",
        value: alertDetails.stockText,
        inline: true,
      },
      {
        name: "📋 Availability",
        value: cleanValue(current.availability),
        inline: false,
      }
    )
    .setFooter({
      text: "PokéDaé Intelligence • Verified automated alert",
    })
    .setTimestamp();

  if (
    changeType === "price_changed" &&
    previous?.price &&
    current?.price
  ) {
    embed.addFields({
      name: "📊 Price Change",
      value: `${cleanValue(previous.price)} → ${cleanValue(current.price)}`,
      inline: false,
    });
  }

  if (current.merchant || current.shipsFrom || current.soldBy) {
    embed.addFields({
      name: "🏪 Seller Information",
      value: [
        current.merchant
          ? `Merchant: ${cleanValue(current.merchant)}`
          : null,
        current.shipsFrom
          ? `Ships from: ${cleanValue(current.shipsFrom)}`
          : null,
        current.soldBy
          ? `Sold by: ${cleanValue(current.soldBy)}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 1024),
      inline: false,
    });
  }

  if (product.url) {
    embed.addFields({
      name: "🔗 Product Link",
      value: `[Open Amazon product page](${product.url})`,
      inline: false,
    });
  }

  for (const guild of client.guilds.cache.values()) {
    const retailerChannel = findTextChannel(guild, store.channel);
    const allAlertsChannel = findTextChannel(guild, "🔥-all-alerts");

    if (!retailerChannel) {
      console.error(
        `❌ Could not find #${store.channel} in ${guild.name}.`
      );
      continue;
    }

    try {
      await retailerChannel.send({
        embeds: [embed],
      });

      if (
        allAlertsChannel &&
        allAlertsChannel.id !== retailerChannel.id
      ) {
        await allAlertsChannel.send({
          embeds: [embed],
        });
      }

      console.log(
        `📣 Automated ${changeType} alert posted for ${product.name}.`
      );
    } catch (error) {
      console.error(
        `❌ Automated alert failed in ${guild.name}:`,
        error
      );
    }
  }
}

const stockMonitor = new StockMonitor({
  intervalMs: 60_000,

  onStockChange: async (change) => {
    await sendAutomatedStockAlert(change);
  },

  onCheck: async (result) => {
    console.log(
      `🔎 Checked ${result.name}: ${result.status}` +
      `${result.price ? ` at ${result.price}` : ""}`
    );
  },

  onError: async ({ product, error }) => {
    console.error(
      `❌ Monitor error for ${product.name}:`,
      error.message
    );
  },
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`🚀 Online as ${readyClient.user.tag}`);
  console.log(
    `📡 Connected to ${readyClient.guilds.cache.size} server(s)`
  );

  try {
    await stockMonitor.start();
  } catch (error) {
    console.error("❌ Stock monitor failed to start:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "alert") return;

  const storeKey = interaction.options.getString("store", true);
  const product = interaction.options.getString("product", true);
  const price = interaction.options.getString("price", true);
  const location = interaction.options.getString("location", true);
  const stock = interaction.options.getString("stock", true);
  const link = interaction.options.getString("link");

  const take =
    interaction.options.getString("take") ||
    "Check the details, move quickly, and collect responsibly.";

  const store = stores[storeKey] || stores.other;

  const retailerChannel = findTextChannel(
    interaction.guild,
    store.channel
  );

  const allAlertsChannel = findTextChannel(
    interaction.guild,
    "🔥-all-alerts"
  );

  if (!retailerChannel) {
    await interaction.reply({
      content: `❌ I could not find \`#${store.channel}\`. Check the Discord channel name.`,
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  if (!allAlertsChannel) {
    await interaction.reply({
      content: "❌ I could not find `#🔥-all-alerts`.",
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const displayName =
    interaction.member?.displayName ||
    interaction.user.globalName ||
    interaction.user.username;

  const alertEmbed = new EmbedBuilder()
    .setTitle("🚨 POKÉDAÉ ALERT")
    .setDescription(
      `## ${store.emoji} ${store.name}\n### ${product}`
    )
    .addFields(
      {
        name: "💵 Price / MSRP",
        value: price,
        inline: true,
      },
      {
        name: "📦 Stock",
        value: stock,
        inline: true,
      },
      {
        name: "📍 Location",
        value: location,
        inline: false,
      },
      {
        name: "🧠 PokéDaé Take",
        value: take,
        inline: false,
      }
    )
    .setFooter({
      text: `Posted by ${displayName} • Collect smarter.`,
    })
    .setTimestamp();

  if (link) {
    alertEmbed.addFields({
      name: "🔗 Product Link",
      value: `[Open product page](${link})`,
      inline: false,
    });
  }

  try {
    await retailerChannel.send({
      embeds: [alertEmbed],
    });

    if (retailerChannel.id !== allAlertsChannel.id) {
      await allAlertsChannel.send({
        embeds: [alertEmbed],
      });
    }

    await interaction.reply({
      content:
        retailerChannel.id === allAlertsChannel.id
          ? `✅ Alert posted in ${allAlertsChannel}.`
          : `✅ Alert posted in ${retailerChannel} and ${allAlertsChannel}.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error("❌ Alert posting error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content:
          "❌ The channels were found, but the bot could not post. Check its channel permissions.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

async function shutDown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down...`);

  stockMonitor.stop();
  client.destroy();

  process.exit(0);
}

process.on("SIGINT", () => shutDown("SIGINT"));
process.on("SIGTERM", () => shutDown("SIGTERM"));

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error("❌ Login failed:", error);
  process.exitCode = 1;
});