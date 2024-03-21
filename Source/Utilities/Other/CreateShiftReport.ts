import { SheetsAPI, DriveAPI } from "@Handlers/GoogleAPIs.js";
import { GoogleAPI } from "@Config/Secrets.js";
import { format } from "date-fns";

import Util from "node:util";
import GetActivityReportData from "@Utilities/Database/GetActivityReportData.js";

export default async function CreateShiftReport(
  Opts: Parameters<typeof GetActivityReportData>[0]
): Promise<string> {
  const ReportData = await GetActivityReportData(Opts);
  const Copy = await GetARSTemplateCopy();

  // Set the data for the report
  const SpreadsheetTitle = "LAPD Central — Activity Report";
  const SheetOneTableTitle = Util.format(
    "%s\nActivity Report%s",
    Opts.guild.name,
    typeof Opts.shift_type === "string" ? ` — ${Opts.shift_type}` : ""
  );

  const FirstSheetName = GetFirstSheetName(new Date(), Opts.after);
  const CSpreadsheet = await SheetsAPI.spreadsheets.get({
    spreadsheetId: Copy.data.id!,
  });

  await SheetsAPI.spreadsheets.batchUpdate({
    spreadsheetId: Copy.data.id!,
    requestBody: {
      requests: [
        // Sheet 1: Detailed Report
        // 1. Set guild name and thumbnail into the report:
        {
          updateCells: {
            fields: "userEnteredValue",
            range: {
              sheetId: CSpreadsheet.data.sheets![0].properties!.sheetId,
              startRowIndex: 1, // Refers to row 4
              endRowIndex: 2, // Up to row 5
              startColumnIndex: 2, // Column 'C'
              endColumnIndex: 3, // Up to column 'E'
            },
            rows: [
              {
                values: [
                  {
                    userEnteredValue: {
                      stringValue: SheetOneTableTitle,
                    },
                  },
                ],
              },
            ],
          },
        },

        // 2. Add necessary rows to insert data properly:
        {
          insertDimension: {
            inheritFromBefore: true,
            range: {
              sheetId: CSpreadsheet.data.sheets![0].properties!.sheetId,
              dimension: "ROWS",
              startIndex: 11, // Insert after the 11th row (0-based index)
              endIndex: ReportData.records.length === 1 ? 13 : ReportData.records.length + 10,
            },
          },
        },

        // 3. Set the data for the report:
        {
          updateCells: {
            rows: ReportData.records,
            fields: "userEnteredValue",
            start: {
              sheetId: CSpreadsheet.data.sheets![0].properties!.sheetId,
              rowIndex: 10,
              columnIndex: 1,
            },
          },
        },

        {
          updateSpreadsheetProperties: {
            fields: "title",
            properties: {
              title: SpreadsheetTitle,
            },
          },
        },
        {
          updateSheetProperties: {
            fields: "title",
            properties: {
              sheetId: CSpreadsheet.data.sheets![0].properties!.sheetId,
              title: FirstSheetName,
            },
          },
        },

        // Sheet 2: Statistics
        {
          updateCells: {
            fields: "userEnteredValue",
            range: {
              sheetId: CSpreadsheet.data.sheets![1].properties!.sheetId,
              startRowIndex: 3, // Refers to row 4
              endRowIndex: 5, // Up to row 5
              startColumnIndex: 2, // Column 'C'
              endColumnIndex: 5, // Up to column 'E'
            },
            rows: [
              {
                values: [
                  {
                    userEnteredValue: {
                      stringValue: ReportData.statistics.total_time,
                    },
                  },
                ],
              },
            ],
          },
        },
        {
          updateCells: {
            fields: "userEnteredValue",
            range: {
              sheetId: CSpreadsheet.data.sheets![1].properties!.sheetId,
              startRowIndex: 3, // Refers to row 4
              endRowIndex: 5, // Refers to up to row 5
              startColumnIndex: 1, // Refers to column B
              endColumnIndex: 2, // Up to column B
            },
            rows: [
              {
                values: [
                  {
                    userEnteredValue: {
                      numberValue: ReportData.statistics.total_shifts,
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  });

  // Set the permissions for public access and editing
  await DriveAPI.permissions.create({
    fileId: Copy.data.id!,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return (
    CSpreadsheet.data.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${Copy.data.id}`
  );
}

/**
 * Copies the activity report spreadsheet template from Google Drive.
 * @returns
 */
async function GetARSTemplateCopy() {
  return DriveAPI.files.copy({
    fileId: GoogleAPI.ActivityReportTempSpreadsheetID,
  });
}

/**
 * Returns the name for the first sheet in a report based on the start and end dates.
 * @param EndDate - The end date of the report.
 * @param StartDate - The start date of data in the report.
 * @returns a formmatted string for the first sheet name.
 */
function GetFirstSheetName(EndDate: Date, StartDate?: Date | null): string {
  if (!StartDate) {
    const SPortion = format(EndDate, "MMMM do");
    return `Report: Until ${SPortion}`;
  }

  const IsDifferentYear = StartDate.getFullYear() !== EndDate.getFullYear();
  const FPortion = format(StartDate, `MMMM do${IsDifferentYear ? ", yyyy" : ""}`);
  const SPortion = format(EndDate, "MMMM do");
  return `Report: ${FPortion} — ${SPortion}`;
}
