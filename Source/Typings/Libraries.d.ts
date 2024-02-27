import type { ChatInputCommandInteraction, Collection } from "discord.js";
import type { TupleMinMax } from "./Global.js";

export declare module "utility-types" {
  export { NonEmptyArray, RangedArray, UnPartial, TupleMinMax };

  /** Converts properties to strings in an object excluding any specified properties. */
  export type PropertiesToString<T, Exclude extends keyof T> = {
    [K in keyof T]: K extends Exclude ? T[K] : string;
  };
}

export declare module "discord.js" {
  export interface InteractionCollector {
    public on(event: string, listener: (...args: any[]) => Awaitable<any>): this;
    public on(
      event: 'end',
      listener: (collected: Collection<Snowflake, Interaction>, reason: string) => Awaitable<any>,
    ): this;
    public on(
      event: "collect" | "dispose" | "ignore",
      listener: (interaction: Interaction) => Awaitable<any>
    ): this;
  }

  export interface Client {
    commands: Collection<string, SlashCommandObject>;
    cooldowns: Collection<string, Collection<string, number>>;
    modalListeners: Collection<string, (ModalSubmission: ModalSubmitInteraction) => any>;

    /**
     * A collection of button listeners for a specific button custom id;
     * the value could be either a function or a boolean which indicates
     * if the button is actually being listened for.
     */
    buttonListeners: Collection<string, ((ButtonInteract: ButtonInteraction) => any) | boolean>;
  }
}

declare global {
  // A workaround until type definitions for Object/Map.groupBy are included in compiling.
  interface MapConstructor {
    groupBy<Item, Key>(
      items: Iterable<Item>,
      keySelector: (item: Item, index: number) => Key
    ): Map<Key, Item[]>;
  }

  interface Object {
    /**
     * Returns an object that groups the iterable of the iterable object into arrays, using the return value of the callback function as the key.
     * @param iterable An iterable object
     * @param callbackfn A function that accepts up to two arguments. The map method calls the callbackfn function one time for each element in `iterable`.
     */
    groupBy<T, K extends PropertyKey>(
      iterable: Iterable<T>,
      callbackfn: (value: T, index: number) => K
    ): Record<K, T[]>;

    /**
     * Returns an object that groups the iterable of the iterable object into arrays, using the return value of the callback function as the key.
     * @param iterable An iterable object
     * @param callbackfn A function that accepts up to two arguments. The map method calls the callbackfn function one time for each element in `iterable`.
     */
    groupBy(
      iterable: Iterable<any>,
      callbackfn: (value: any, index: number) => PropertyKey
    ): Record<PropertyKey, any[]>;
  }
}
