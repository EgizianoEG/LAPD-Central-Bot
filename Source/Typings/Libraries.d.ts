import type { ChatInputCommandInteraction, Collection } from "discord.js";
import type { TupleMinMax } from "./Global.js";

export declare module "discord.js" {
  export interface Client {
    commands: Collection<string, SlashCommandObject>;
    cooldowns: Collection<string, Collection<string, number>>;
  }
}

export declare module "utility-types" {
  export type NonEmptyArray<T> = [T, ...T[]];
  export type RangedArray<T, Min extends number, Max extends number> = TupleMinMax<T, Min, Max>;
}

declare global {
  // A workaround until the actual usage of Object/Map.groupBy types in TS
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
