import type { ChatInputCommandInteraction, Collection } from "discord.js";

declare module "discord.js" {
  export interface Client {
    commands: Collection<string, CommandObject>;
    cooldowns: Collection<string, Collection<string, number>>;
  }
}
