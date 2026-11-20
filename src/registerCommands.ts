import { REST, Routes } from "discord.js";
import { loadCommands } from "../src/lib/handlers.ts";

const guildId = process.env.DISCORD_GUILD_ID;

export async function registerCommands(guildId?: string): Promise<number> {
  const commands = (await loadCommands()).map(({ value }) => value.data.toJSON());

  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
  const route = guildId
    ? Routes.applicationGuildCommands(process.env.CLIENT_ID!, guildId)
    : Routes.applicationCommands(process.env.CLIENT_ID!);

  const data = (await rest.put(route, { body: commands })) as unknown[];
  return data.length;
}

try {
  const count = await registerCommands(guildId);

  console.log(
    `Successfully reloaded ${count} ${guildId ? `guild (${guildId})` : "global"} application (/) commands.`,
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
