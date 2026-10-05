require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const ROLE_DEFS = [
  ["All Alerts", "🔥"],
  ["Amazon Alerts", "🟠"],
  ["Target Alerts", "🎯"],
  ["Walmart Alerts", "🟦"],
  ["Meijer Alerts", "🟢"],
  ["Local Alerts", "📍"],
  ["Deals", "💰"],
  ["Announcements", "📣"],
];

const START_CATEGORY = "👋 START HERE";
const NETWORK_CATEGORY = "🌐 POKÉDAÉ NETWORK";

const START_CHANNELS = [
  {
    name: "👋-welcome",
    topic: "Start here for the PokéDaé Discord.",
    message: `# 👋 WELCOME TO POKÉDAÉ

Welcome, Trainers. 🫡

PokéDaé is the real-time home for restock alerts, market information, release dates, collecting resources, store reports, community finds, PokéDaé tools and more.

🚨 **LIVE RESTOCK ALERTS**
📈 **MARKET + MSRP INFO**
🗓️ **RELEASE CALENDARS**
🌐 **POKÉDAÉ TOOLS + RESOURCES**
🛒 **DEALS + ONLINE FINDS**
📍 **LOCAL SIGHTINGS**
💬 **COLLECTOR COMMUNITY**

### START HERE
1. Read **#📜-rules**
2. Visit **#🔔-choose-your-alerts**
3. Check out **#🌐-pokedae-links**
4. Say hey in **#💬-general-chat**

**Community over cardboard.**
**Collect. Connect. Invest. Inspire.**`,
  },
  {
    name: "📜-rules",
    topic: "PokéDaé community rules.",
    message: `# 📜 POKÉDAÉ COMMUNITY RULES

**1. Don't be a jerk.**
Treat collectors, families, beginners and members with respect.

**2. No harassment or witch hunts.**
Discuss the hobby and the market without targeting people.

**3. No scams, fake listings or knowingly false stock reports.**
If you post a sighting or deal, make sure it is legitimate.

**4. Keep buying, selling and trading in the proper channels.**
PokéDaé is not responsible for private transactions between members.

**5. No spam or unsolicited promotion.**
Ask staff before advertising businesses, groups, affiliate links or services.

**6. Protect personal information.**
Do not post somebody else's private information.

**7. Use common sense.**
Help each other and keep this a community people actually want to be part of.

**People over profits. Community over cardboard.**`,
  },
  {
    name: "🔔-choose-your-alerts",
    topic: "Choose which PokéDaé alerts you want to receive.",
    roleMenu: true,
  },
  {
    name: "🌐-pokedae-links",
    topic: "Official PokéDaé sites, tools and community links.",
    message: `# 🌐 THE POKÉDAÉ NETWORK

Discord is one piece of the PokéDaé ecosystem.

🌎 **PokéDaé.com**
https://pokedae.com

📊 **Market HQ**
Pricing, MSRP information and collector market resources.

🚨 **PokéDaé Intelligence**
Real-time product and restock intelligence.

📱 **Pokémon GO Resources**
Events, updates and resources for GO players.

👥 **Pokémon Family Community**
The community side of what started all of this.

**One community. One network. A whole lot more coming. 👀**`,
  },
];

const NETWORK_CHANNELS = [
  {
    name: "🌎-pokedae-com",
    topic: "PokéDaé.com updates, tools and featured resources.",
    message: `# 🌎 POKÉDAÉ.COM

The main hub for PokéDaé tools, calendars, market information and resources.

https://pokedae.com

This channel will be used for major site updates and new features.`,
  },
  {
    name: "🛠-site-updates",
    topic: "New PokéDaé site features, tools and updates.",
    message: `# 🛠 SITE UPDATES

New tools, fixes, calendars, pages and major PokéDaé.com updates will be posted here.`,
  },
  {
    name: "🛒-amazon-finds",
    topic:
      "Hand-picked Amazon Pokémon, TCG, collectibles and family finds. As an Amazon Associate, PokéDaé earns from qualifying purchases.",
    message: `# 🛒 AMAZON FINDS

This is where PokéDaé will post Amazon drops, restocks, supplies, collectibles and other finds that are actually worth checking.

If something is overpriced or a bad buy, we'll say that too.

**Disclosure:** As an Amazon Associate, PokéDaé earns from qualifying purchases. Using these links may support PokéDaé at no additional cost to you.`,
  },
  {
    name: "🔗-community-links",
    topic: "Official PokéDaé community links and partner resources.",
    message: `# 🔗 COMMUNITY LINKS

Official PokéDaé community links, resources and partner destinations will live here.

More coming as the network grows. 👀`,
  },
];

function getTargetGuild() {
  const guildId = process.env.GUILD_ID;

  if (guildId) {
    return client.guilds.cache.get(guildId);
  }

  if (client.guilds.cache.size === 1) {
    return client.guilds.cache.first();
  }

  return null;
}

async function ensureRole(guild, name) {
  let role = guild.roles.cache.find((r) => r.name === name);

  if (!role) {
    role = await guild.roles.create({
      name,
      reason: "PokéDaé launch setup",
      mentionable: true,
    });
    console.log(`✅ Created role: ${name}`);
  } else {
    console.log(`↪ Role exists: ${name}`);
  }

  return role;
}

async function ensureCategory(guild, name, position) {
  let category = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === name
  );

  if (!category) {
    category = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory,
      reason: "PokéDaé launch setup",
    });
    console.log(`✅ Created category: ${name}`);
  } else {
    console.log(`↪ Category exists: ${name}`);
  }

  if (typeof position === "number") {
    try {
      await category.setPosition(position);
    } catch (error) {
      console.warn(`⚠️ Could not reposition ${name}: ${error.message}`);
    }
  }

  return category;
}

async function ensureTextChannel(guild, category, def) {
  let channel = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildText && c.name === def.name
  );

  let created = false;

  if (!channel) {
    channel = await guild.channels.create({
      name: def.name,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: def.topic,
      reason: "PokéDaé launch setup",
    });

    created = true;
    console.log(`✅ Created channel: #${def.name}`);
  } else {
    console.log(`↪ Channel exists: #${def.name}`);

    if (channel.parentId !== category.id) {
      await channel.setParent(category.id, { lockPermissions: false });
    }

    if (def.topic && channel.topic !== def.topic) {
      await channel.setTopic(def.topic);
    }
  }

  return { channel, created };
}

function buildRoleRows() {
  const buttons = ROLE_DEFS.map(([name, emoji]) =>
    new ButtonBuilder()
      .setCustomId(`role:${name}`)
      .setLabel(name)
      .setEmoji(emoji)
      .setStyle(ButtonStyle.Secondary)
  );

  return [
    new ActionRowBuilder().addComponents(buttons.slice(0, 5)),
    new ActionRowBuilder().addComponents(buttons.slice(5)),
  ];
}

async function seedChannel(channel, def, created) {
  if (!created) return;

  if (def.roleMenu) {
    await channel.send({
      content: `# 🔔 CHOOSE YOUR ALERTS

Pick the notifications you actually want. Click a button to add or remove that role.

You can change these anytime — no notification overload required. 😂`,
      components: buildRoleRows(),
    });
    return;
  }

  if (def.message) {
    await channel.send(def.message);
  }
}

async function updateExistingChannelTopics(guild) {
  const topicUpdates = {
    "🔥-all-alerts":
      "Every verified PokéDaé Intelligence restock alert in one feed.",
    "🟠-amazon-alerts":
      "Verified Amazon stock alerts from PokéDaé Intelligence. Some product links may be affiliate links.",
    "🏙-local-sightings":
      "Community-reported local store sightings. Verify before making a trip.",
  };

  for (const [name, topic] of Object.entries(topicUpdates)) {
    const channel = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildText && c.name === name
    );

    if (!channel) continue;

    try {
      await channel.setTopic(topic);
      console.log(`✅ Updated topic: #${name}`);
    } catch (error) {
      console.warn(`⚠️ Could not update #${name}: ${error.message}`);
    }
  }
}

client.once("ready", async () => {
  try {
    const guild = getTargetGuild();

    if (!guild) {
      throw new Error(
        "Could not determine which Discord server to configure. Set GUILD_ID in .env."
      );
    }

    console.log(`🚀 Preparing ${guild.name} for launch...`);

    const me = await guild.members.fetchMe();
    const required = [
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ViewChannel,
    ];

    const missing = required.filter((perm) => !me.permissions.has(perm));

    if (missing.length) {
      throw new Error(
        "The bot is missing one or more required permissions: Manage Channels, Manage Roles, Send Messages, View Channels."
      );
    }

    for (const [roleName] of ROLE_DEFS) {
      await ensureRole(guild, roleName);
    }

    const startCategory = await ensureCategory(guild, START_CATEGORY, 0);

    for (const def of START_CHANNELS) {
      const result = await ensureTextChannel(guild, startCategory, def);
      await seedChannel(result.channel, def, result.created);
    }

    const networkCategory = await ensureCategory(guild, NETWORK_CATEGORY, 3);

    for (const def of NETWORK_CHANNELS) {
      const result = await ensureTextChannel(guild, networkCategory, def);
      await seedChannel(result.channel, def, result.created);
    }

    await updateExistingChannelTopics(guild);

    console.log("");
    console.log("✅ PokéDaé launch setup complete.");
    console.log("✅ No existing channels were deleted.");
    console.log("✅ Existing retailer alert channel names were preserved.");
    console.log("");
    console.log("NEXT:");
    console.log("1. Keep the main bot online so alert-role buttons work.");
    console.log("2. Review the new channels in Discord.");
    console.log("3. Create your invite and launch.");
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error("❌ Discord login failed:", error);
  process.exitCode = 1;
});
