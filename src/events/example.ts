import { Events, Client } from "discord.js";

export default {
  name: Events.ClientReady,
  execute(client: Client) {
    console.log(`Client logged in as ${client.user.tag}`);
  },
};
