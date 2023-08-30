import type { ChatInputCommandInteraction, Collection } from "discord.js";

export declare module "discord.js" {
  export interface Client {
    commands: Collection<string, SlashCommandObject>;
    cooldowns: Collection<string, Collection<string, number>>;
  }
}
