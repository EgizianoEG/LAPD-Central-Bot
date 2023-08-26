// types.d.ts

/**
 * Type for the ListCharges function.
 */
declare function ListCharges(Input: string, RAsArray?: false): string;

declare function ListCharges(Input: string, RAsArray: true): [string[], boolean];
