namespace Utilities.Roblox {
  declare interface UserProfileDetails {
    /** The about/description of the user. */
    description: string;

    /** The timestamp when the user profile was created (RFC 3339). */
    created: string;

    /** Indicates whether the user is banned or not. */
    isBanned: boolean;

    /** The display name in an external app, if available. */
    externalAppDisplayName?: string | null;

    /** Indicates if the user has a verified badge. */
    hasVerifiedBadge: boolean;

    /** The unique identifier for the user. */
    id: number;

    /** The username of the user. */
    name: string;

    /** The display name of the user. */
    displayName: string;
  }

  interface UserPresence {
    /**
     * The user presence type. Possible values: 0 = Offline, 1 = Online, 2 = InGame, 3 = InStudio, 4 = Invisible.
     */
    userPresenceType: 0 | 1 | 2 | 3 | 4;
    /**
     * The user's last location.
     */
    lastLocation: string | "";
    /**
     * The ID of the current place.
     */
    placeId: number | null;
    /**
     * The ID of the root place.
     */
    rootPlaceId: number | null;
    /**
     * The ID of the game. (Format: UUID)
     */
    gameId: string | null;
    /**
     * The ID of the universe.
     */
    universeId: number | null;
    /**
     * The ID of the user.
     */
    userId: number;
    /**
     * The timestamp indicating the last online time. (Format: Date-Time)
     */
    lastOnline: string;
  }
}
