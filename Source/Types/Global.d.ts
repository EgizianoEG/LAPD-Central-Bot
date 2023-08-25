declare interface CommandObject {
  data: SlashCommandBuilder;
  callback: (arg0: Client, arg1: CommandInteraction) => any;
  autocomplete?: (arg0: AutocompleteInteraction) => any;
  options?: {
    deleted: boolean;
    forceUpdate: boolean;
    devOnly: boolean;
    cooldown: number;
    userPerms: DiscordPermissionResolvable[];
    botPerms: DiscordPermissionResolvable[];
  };
}
type DiscordPermissionResolvable = import("discord.js").PermissionResolvable[];

declare interface GuildShiftType {
  name: string;
  permissible_roles: string[];
}

declare type SlashCommandInteraction = import("discord.js").ChatInputCommandInteraction;

declare type DiscordClient = import("discord.js").Client;

type MessageReplyOptions =
  | string
  | import("discord.js").MessagePayload
  | import("discord.js").InteractionReplyOptions;

type RepliableInteraction =
  | import("discord.js").ChatInputCommandInteraction
  | ((class | object) & {
      replied: boolean;
      followUp(options: MessageReplyOptions): any;
    })
  | ((class | object) & {
      replied: boolean;
      reply(options: MessageReplyOptions): any;
    });
