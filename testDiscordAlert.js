require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

function findChannel(guild, channelName) {
  return guild.channels.cache.find(
    (channel) =>
      channel.isTextBased() &&
      channel.name.toLowerCase() === channelName.toLowerCase()
  );
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`🚀 Logged in as ${readyClient.user.tag}`);

  try {
    for (const guild of readyClient.guilds.cache.values()) {
      const amazonChannel = findChannel(
        guild,
        "🟠-amazon-alerts"
      );

      const allAlertsChannel = findChannel(
        guild,
        "🔥-all-alerts"
      );

      if (!amazonChannel) {
        console.error(
          `❌ Could not find #🟠-amazon-alerts in ${guild.name}`
        );
        continue;
      }

      if (!allAlertsChannel) {
        console.error(
          `❌ Could not find #🔥-all-alerts in ${guild.name}`
        );
        continue;
      }

      const embed = new EmbedBuilder()
        .setTitle("🧪 POKÉDAÉ TEST ALERT")
        .setDescription(
          "## 🟠 Amazon\n" +
          "### Pokémon TCG: Mega Evolution—Pitch Black Booster Display Box\n\n" +
          "This is a test of the automated stock-alert system."
        )
        .addFields(
          {
            name: "💵 Current Price",
            value: "$209.94",
            inline: true,
          },
          {
            name: "📦 Stock",
            value: "✅ IN STOCK",
            inline: true,
          },
          {
            name: "📋 Availability",
            value: "Only 1 left in stock — order soon.",
            inline: false,
          },
          {
            name: "🔗 Product Link",
            value:
              "[Open Amazon product page](https://www.amazon.com/dp/B0GZ9S9KDR)",
            inline: false,
          }
        )
        .setFooter({
          text: "PokéDaé Intelligence • Automated alert test",
        })
        .setTimestamp();

      await amazonChannel.send({
        embeds: [embed],
      });

      if (allAlertsChannel.id !== amazonChannel.id) {
        await allAlertsChannel.send({
          embeds: [embed],
        });
      }

      console.log(
        `✅ Test alert posted in #${amazonChannel.name} and #${allAlertsChannel.name}`
      );
    }
  } catch (error) {
    console.error("❌ Test alert failed:", error);
  } finally {
    client.destroy();
    console.log("✅ Test finished.");
  }
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error("❌ Discord login failed:", error);
  process.exitCode = 1;
});