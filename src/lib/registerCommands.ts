import { REST, Routes } from "discord.js";
import { loadCommands } from "./handlers";

export async function registerCommands(guildId?: string): Promise<number> {
  const commands = (await loadCommands()).map(({ value }) => value.data.toJSON());

  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
  const route = guildId
    ? Routes.applicationGuildCommands(process.env.CLIENT_ID!, guildId)
    : Routes.applicationCommands(process.env.CLIENT_ID!);

  const data = (await rest.put(route, { body: commands })) as unknown[];
  return data.length;
}
