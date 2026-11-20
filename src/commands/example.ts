import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/index.ts";
export default {
  data: new SlashCommandBuilder().setName("example").setDescription("Example command"),
  async execute(interaction) {
    await interaction.reply("Hi!");
  },
} satisfies Command;
