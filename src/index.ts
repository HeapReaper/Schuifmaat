import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Options,
  Partials,
  type Interaction,
} from "discord.js";
import cron from "node-cron";
import type { Command, Component, ComponentInteraction } from "../src/types/index.ts";
import {
  loadApiRoutes,
  loadCommands,
  loadComponents,
  loadEvents,
  loadTasks,
} from "./lib/handlers.ts";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.AutoModerationExecution,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember,
  ],
});

// Commands
const commands = new Map<string, Command<any>>();

for (const { file, value } of await loadCommands()) {
  if (commands.has(value.data.name)) {
    console.warn(`Duplicate command "${value.data.name}" in ${file}, ignoring it`);
    continue;
  }
  commands.set(value.data.name, value);
}

// Buttons, select menus and modals
const components: Component[] = (await loadComponents()).map(({ value }) => value);

function findComponent(customId: string): Component | undefined {
  return components.find((component) =>
    typeof component.customId === "string"
      ? component.customId === customId
      : component.customId.test(customId),
  );
}

// Events
const events = await loadEvents();

// Several features listen to the same event (messageCreate has over ten), which
// is by design. Raise the limit to exactly what is registered, so the warning
// still fires if listeners ever start piling up at runtime.
const listenersPerEvent = new Map<string, number>();
for (const { value: event } of events) {
  listenersPerEvent.set(event.name, (listenersPerEvent.get(event.name) ?? 0) + 1);
}
client.setMaxListeners(Math.max(10, ...listenersPerEvent.values()) + 2);

for (const { file, value: event } of events) {
  // Every handler is wrapped, so a throwing handler is logged with its file
  // instead of surfacing as an anonymous unhandled rejection.
  const listener = async (...args: unknown[]) => {
    try {
      await (event.execute as (...args: unknown[]) => unknown)(...args);
    } catch (error) {
      console.error(
        `Event ${event.name} (${file}) failed: ${error instanceof Error ? error.stack : error}`,
      );
    }
  };

  if (event.once) client.once(event.name, listener);
  else client.on(event.name, listener);
}

// Interaction routing
async function replyWithError(interaction: Interaction): Promise<void> {
  if (!interaction.isRepliable()) return;

  const payload = {
    content: "There was an error while executing this interaction!",
    flags: MessageFlags.Ephemeral,
  } as const;

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(payload).catch(() => null);
  } else {
    await interaction.reply(payload).catch(() => null);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) {
        console.warn(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      await command.execute(interaction);
      return;
    }

    if (interaction.isAutocomplete()) {
      await commands.get(interaction.commandName)?.autocomplete?.(interaction);
      return;
    }

    if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
      // No match is fine: collectors on a message handle their own components.
      await findComponent(interaction.customId)?.execute(interaction as ComponentInteraction);
    }
  } catch (error) {
    const label =
      "commandName" in interaction
        ? interaction.commandName
        : "customId" in interaction
          ? interaction.customId
          : "unknown";

    console.error(`Interaction ${label} failed: ${error instanceof Error ? error.stack : error}`);
    await replyWithError(interaction);
  }
});

// Startup that needs a ready client: tasks, the API and the presence rotation
client.once(Events.ClientReady, async (readyClient) => {
  for (const { file, value: task } of await loadTasks()) {
    const run = async () => {
      console.log(`Running task ${task.name}`);

      try {
        await task.execute(readyClient);
      } catch (error) {
        console.error(
          `Task ${task.name} (${file}) failed: ${error instanceof Error ? error.stack : error}`,
        );
      }
    };

    // noOverlap: a slow run is skipped instead of piling up concurrent runs
    cron.schedule(task.schedule, run, {
      name: task.name,
      noOverlap: true,
      ...(task.timezone ? { timezone: task.timezone } : {}),
    });
    if (task.runOnStart) void run();

    console.log(`Loaded task: ${task.name} (${task.schedule})`);
  }

  readyClient.user.setActivity({ name: "Voor Modelbouw NL/BE", type: ActivityType.Listening });
});

await client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error(`Could not log in: ${error}`);
  process.exit(1);
});
