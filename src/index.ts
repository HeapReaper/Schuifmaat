import { Client, Events, GatewayIntentBits } from "discord.js";

const token = process.env.DISCORD_TOKEN;

if (!token) throw new Error("DISCORD_TOKEN missing in .env");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.login(token);
