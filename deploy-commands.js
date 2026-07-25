require("dotenv").config();

const {
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("alert")
    .setDescription("Post an official PokéDaé retail alert.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)

    .addStringOption((option) =>
      option
        .setName("store")
        .setDescription("Choose the retailer")
        .setRequired(true)
        .addChoices(
            { name: "Amazon", value: "amazon" },
  { name: "Walmart", value: "walmart" },
  { name: "Target", value: "target" },
  { name: "GameStop", value: "gamestop" },
  { name: "Pokémon Center", value: "pokemon-center" },
  { name: "Best Buy", value: "best-buy" },
  { name: "Barnes & Noble", value: "barnes-noble" },
  { name: "Sam's Club", value: "sams-club" },
  { name: "Costco", value: "costco" },
  { name: "Other", value: "other" }
)
    )

    .addStringOption((option) =>
      option
        .setName("product")
        .setDescription("Product name")
        .setRequired(true)
    )

    .addStringOption((option) =>
      option
        .setName("price")
        .setDescription("Price or MSRP, such as $54.98")
        .setRequired(true)
    )

    .addStringOption((option) =>
      option
        .setName("location")
        .setDescription("Online or store location")
        .setRequired(true)
    )

    .addStringOption((option) =>
      option
        .setName("stock")
        .setDescription("In Stock, Limited, 12+, etc.")
        .setRequired(true)
    )

    .addStringOption((option) =>
      option
        .setName("link")
        .setDescription("Direct product link")
        .setRequired(false)
    )

    .addStringOption((option) =>
      option
        .setName("take")
        .setDescription("Your PokéDaé recommendation")
        .setRequired(false)
    )

    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(
  process.env.DISCORD_TOKEN
);

async function deployCommands() {
  try {
    console.log("Registering /alert...");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("✅ /alert registered successfully.");
  } catch (error) {
    console.error("❌ Registration failed:", error);
  }
}

deployCommands();