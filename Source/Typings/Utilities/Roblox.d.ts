export namespace RobloxAPI.Users {
  interface GetUserResponse {
    /** The user's bio/description. */
    description: string;

    /** The date string showing the user's registration date (RFC 3339). */
    created: string;

    /** Whether or not the user is banned. */
    isBanned: boolean;

    /** The display name in an external app. Unused, legacy attribute.
     * For now always `null` to avoid disrupting existing client code that may rely on it.
     * */
    externalAppDisplayName: string | null;

    /** The user's verified badge status. */
    hasVerifiedBadge: boolean;

    /** The unique identifier for the user. */
    id: number;

    /** The username of the user. */
    name: string;

    /** The display name of the user. */
    displayName: string;
  }

  /** The API response for a user search by keyword using {@link https://www.roblox.com/search/users/results /search/users/results} Roblox endpoint */
  interface UserSearchQueryResponse {
    /** The search keyword. This field can be filtered and replaced with hashtags by Roblox and would be `null` if there wasn't a keyword parameter in the query. */
    Keyword: string | null;

    /** The maximum number of rows (search results) returned. Mirrors the original request parameter `maxRows`. */
    MaxRows: number;

    /** The starting index of the search results. Mirrors the original request parameter `startIndex`. */
    StartIndex: number;

    /** The total number of search results. Maximum of 500 results. */
    TotalResults: number;

    /** Users discovered through the api request. If no people were found using the current keyword, this value would be 'null'. */
    UserSearchResults: Users.UserSearchResult[] | null;
  }

  /** An object representing a user search result for the endpoint "https://www.roblox.com/search/users/results" */
  interface UserSearchResult {
    /** The id of the user. */
    UserId: number;

    /** The username of the user. */
    Name: string;

    /** The display name of the user. */
    DisplayName: string;

    /** The bio/description of the user. */
    Blurb: string;

    /** A comma-separated stringified list of the user's previous usernames e.g. "roblox, roblox2, roblox3" */
    PreviousUserNamesCsv: string;

    /** Whether the user is online. This property is not recommended to be used and depend on. */
    IsOnline: boolean;

    /** The user's last known location. This property is not recommended to be used and depend on. */
    LastLocation: string | null;

    /** The URL of the user's profile page. e.g. "/users/000000/profile" */
    UserProfilePageUrl: string;

    /** The user's last seen date. */
    LastSeenDate: string | null;

    /** The user's primary group. An empty string if the user has no primary group. */
    PrimaryGroup: string;

    /** The URL of the user's primary group if applicable. */
    PrimaryGroupUrl: string;

    /** Whether the user has a verified badge. Not recommended to be used. */
    HasVerifiedBadge: boolean;
  }

  interface MultiGetByNameResponse {
    data: [
      {
        id: number;
        name: string;
        displayName: string;
        hasVerifiedBadge: boolean;
        requestedUsername: string;
      },
    ];
  }
}

export namespace RobloxAPI.Presence {
  interface UserPresencesResponse {
    userPresences: [
      {
        /** The Id of the user. */
        userId: number;

        /** User presence Type.
         * Enums: ['Offline': `0`, 'Online': `1`, 'InGame': `2`, 'InStudio': `3`, 'Invisible': `4`]
         * */
        userPresenceType: 0 | 1 | 2 | 3 | 4;

        /** The user's last location if applicable. Could be an empty string (`""`). */
        lastLocation: string;

        /** The Id of the current place. Available if the user status is `2` (In Game). */
        placeId: number | null;

        /** The Id of the root place. Available if the user status is `2` (In Game). */
        rootPlaceId: number | null;

        /** The Id of the game as a UUID string. Available if the user status is `2` (In Game). */
        gameId: string | null;

        /** The Id of the universe. Available if the user status is `2` (In Game). */
        universeId: number | null;

        /** The last seen date string. Can be convert to normal Date object. */
        lastOnline: string;

        // Unknown presence:
        // invisibleModeExpiry: string;
      },
    ];
  }
}

declare global {
  namespace Utilities.Roblox {
    type UserPresence = RobloxAPI.Presence.UserPresence;
    type UserSearchResult = RobloxAPI.Users.UserSearchResult;
    type UserProfileDetails = RobloxAPI.Users.GetUserResponse;
  }
}
