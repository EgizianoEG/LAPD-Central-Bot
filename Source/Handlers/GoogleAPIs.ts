import { drive_v3, google, sheets_v4 } from "googleapis";
import { GoogleAuth, Compute } from "google-auth-library";
import { JSONClient } from "google-auth-library/build/src/auth/googleauth.js";
import AppLogger from "@Utilities/Classes/AppLogger.js";
import Secrets from "@Config/Secrets.js";

export let Client: JSONClient | Compute;
export let GAuth: GoogleAuth<JSONClient>;
export let SheetsAPI: sheets_v4.Sheets;
export let DriveAPI: drive_v3.Drive;

/**
 * Initializes the Google API client.
 * @returns A promise that resolves once the client is initialized.
 */
export default async function InitializeGoogleAPI(): Promise<void> {
  try {
    GAuth = new google.auth.GoogleAuth({
      scopes: Secrets.GoogleAPI.APIScopes,
      credentials: {
        client_email: Secrets.GoogleAPI.ServiceAccountEmail,
        private_key: Secrets.GoogleAPI.PrivateKey,
        scopes: Secrets.GoogleAPI.APIScopes,
        forceRefreshOnFailure: true,
      },
    });

    Client = await GAuth.getClient();
    SheetsAPI = google.sheets({ version: "v4", auth: Client as unknown as GoogleAuth<JSONClient> });
    DriveAPI = google.drive({ version: "v3", auth: Client as unknown as GoogleAuth<JSONClient> });
  } catch (Err: any) {
    AppLogger.error({
      label: "Handlers:GoogleAPI",
      message: "Failed to initialize Google API client and some features may not work.",
      stack: Err.stack,
      error: Err,
    });
  }
}

/**
 * Retrieves the Google API client.
 * If the client is not initialized, it will be initialized before returning.
 * @returns A promise that resolves to the Google API client.
 */
export async function GetClient(): Promise<JSONClient> {
  if (!Client) await InitializeGoogleAPI();
  return Client as any;
}
