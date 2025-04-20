import { type Canvas, createCanvas, loadImage } from "@napi-rs/canvas/index.js";
import { Embeds } from "@Config/Shared.js";
import { format } from "date-fns";
import UploadToImgBB from "./ImgBBUpload.js";

let BgCanvas: Canvas | null = null;
const ImgWidth = 420;
const ImgHeight = 420;

export interface GetBookingMugshotOptions {
  user_thumb_url: string;
  booking_num: string | number;
  /** Whether to upload the mugshot on ImgBB and return it's direct URL; defaults to `false` */
  return_url?: boolean;
  /** For choosing the appropriate fallback thumbnail if the user thumbnail image could not be retrieved */
  user_gender?: "Male" | "Female" | "M" | "F";
  /** Optional booking date; defaults to current date */
  booking_date?: Date;
  /** Person's height in inches (e.g. 5'10" = 70 inches) or as a string (e.g. "5'10") */
  height?: number | string;
  /** Percentage from top where the head is located (0-100). Default is 15%. Used for height positioning if somehow a worn hat's height is known a bit. */
  head_position?: number;
}

/**
 * Returns a mugshot image (JPEG) with 180x180 dimensions.
 * @param Options - Just options for more accurate control.
 * @returns A JPEG Buffer or an ImgBB direct image URL.
 */
export default async function GetBookingMugshot<AsURL extends boolean | undefined = undefined>(
  Options: GetBookingMugshotOptions
): Promise<AsURL extends true ? string : AsURL extends false ? Buffer : Buffer | string> {
  const ImgCanvas = createCanvas(ImgWidth, ImgHeight);
  const ImgCTX = ImgCanvas.getContext("2d");
  const ThumbImage = await loadImage(Options.user_thumb_url).catch(() => {
    if (Options.user_gender) {
      if (typeof Options.user_gender === "string") {
        Options.user_gender = Options.user_gender.match(/^M(?:ale)?$/) ? "Male" : "Female";
      } else if (typeof Options.user_gender === "number") {
        Options.user_gender = Options.user_gender === 1 ? "Male" : "Female";
      }
    } else {
      Options.user_gender = "Male";
    }

    const FallbackImg = Embeds.Thumbs[`RobloxAvatar${Options.user_gender}`];
    return loadImage(FallbackImg);
  });

  // Calculate height positioning
  const PersonHeight = Options.height ? ParseHeight(Options.height) : 70;
  const HeadPosition = Options.head_position || 15;

  // Calculate board offset based on height
  const BoardOffset = CalculateBoardOffset(PersonHeight, HeadPosition);

  // Draw the background with calculated offset
  ImgCTX.drawImage(CreateHeightBackgroundCanvas(BoardOffset), 0, 0);

  // Create a separate canvas for the thumbnail with shadow
  const ThumbCanvas = createCanvas(ImgHeight, ImgHeight);
  const ThumbCTX = ThumbCanvas.getContext("2d");
  ThumbCTX.clearRect(0, 0, ImgHeight, ImgHeight);

  // Configure shadow
  ThumbCTX.shadowColor = "rgba(0, 0, 0, 0.5)";
  ThumbCTX.shadowBlur = RelSize(3);
  ThumbCTX.shadowOffsetX = RelSize(3);
  ThumbCTX.shadowOffsetY = RelSize(3);

  ThumbCTX.drawImage(ThumbImage, 0, 0, ImgHeight, ImgHeight);
  ImgCTX.drawImage(ThumbCanvas, 0, 0);

  // Create information box for department, date and booking number
  const InfoBoxX = RelX(2.5); // 2.5% from left
  const InfoBoxY = RelY(2.5); // 2.5% from top
  const InfoBoxWidth = RelX(60); // 60% of canvas width
  const InfoBoxHeight = RelY(10); // 10% of canvas height

  ImgCTX.fillStyle = "rgba(235, 235, 235, 0.85)";
  ImgCTX.fillRect(InfoBoxX, InfoBoxY, InfoBoxWidth, InfoBoxHeight);
  ImgCTX.lineWidth = RelSize(0.25);
  ImgCTX.strokeStyle = "#252525";
  ImgCTX.strokeRect(InfoBoxX, InfoBoxY, InfoBoxWidth, InfoBoxHeight);

  // Add LAPD Wilshire Division identifier
  ImgCTX.font = RelBoldFont(3.5);
  ImgCTX.fillStyle = "#000000";
  ImgCTX.textAlign = "left";
  ImgCTX.fillText("LAPD WILSHIRE DIV.", InfoBoxX + RelX(1), InfoBoxY + RelY(4.5));

  // Add date and booking number on the same line
  const BookingDate = Options.booking_date || new Date();
  const DateStr = format(BookingDate, "MM/dd/yyyy");
  ImgCTX.font = RelFont(3);
  ImgCTX.fillText(`DATE: ${DateStr}`, InfoBoxX + RelX(1), InfoBoxY + RelY(8));

  // Add booking number on the same line as date, but right-aligned
  ImgCTX.font = RelFont(3);
  ImgCTX.textAlign = "right";
  ImgCTX.fillText(
    `BOOKING #${Options.booking_num}`,
    InfoBoxX + InfoBoxWidth - RelX(1),
    InfoBoxY + RelY(8)
  );

  const ImgBuffer = ImgCanvas.toBuffer("image/jpeg", 100);
  if (Options.return_url) {
    const UploadedImgURL = await UploadToImgBB(
      ImgBuffer,
      `booking_mugshot_#${Options.booking_num}`
    );

    return (UploadedImgURL || Embeds.Thumbs.UnknownImage) as any;
  } else {
    return ImgBuffer as any;
  }
}

/**
 * Returns a canvas for the background of the mugshot.
 * @param YOffset Vertical offset to apply to the board (positive moves board down).
 * @returns The background canvas.
 */
function CreateHeightBackgroundCanvas(YOffset: number = 0) {
  // Don't use cached canvas if we have a custom offset
  if (YOffset !== 0 && BgCanvas) {
    BgCanvas = null;
  }

  if (BgCanvas) return BgCanvas;
  BgCanvas = createCanvas(ImgWidth, ImgHeight);
  const BgCTX = BgCanvas.getContext("2d");

  // Base color first
  BgCTX.fillStyle = "#EBEBEB";
  BgCTX.fillRect(0, 0, ImgWidth, ImgHeight);

  const VisibleMinInches = 48; // 4 feet
  const VisibleMaxInches = 74; // 6'1"

  // Extended range to account for offsets
  const ExtendedMinInches = VisibleMinInches - 12; // 1 foot lower
  const ExtendedMaxInches = VisibleMaxInches + 12; // 1 foot higher
  const TotalInchesInRange = VisibleMaxInches - VisibleMinInches;
  const PixelsPerInch = ImgHeight / TotalInchesInRange;

  BgCTX.save();
  BgCTX.translate(0, YOffset);

  for (
    let Foot = Math.floor(ExtendedMinInches / 12);
    Foot <= Math.ceil(ExtendedMaxInches / 12);
    Foot++
  ) {
    const FootStartInch = Foot * 12;
    const FootEndInch = (Foot + 1) * 12;

    const VisibleStart = Math.max(FootStartInch, VisibleMinInches);
    const VisibleEnd = Math.min(FootEndInch, VisibleMaxInches);
    if (VisibleEnd <= VisibleStart) continue;

    const VisibleStartPos = ImgHeight - (VisibleStart - VisibleMinInches) * PixelsPerInch;
    const VisibleEndPos = ImgHeight - (VisibleEnd - VisibleMinInches) * PixelsPerInch;
    const Height = VisibleStartPos - VisibleEndPos;

    // Draw background stripes
    BgCTX.fillStyle = Foot % 2 === 0 ? "#DEDEDE" : "#EBEBEB";
    BgCTX.fillRect(0, VisibleEndPos, ImgWidth, Height);
  }

  for (let AbsoluteInch = ExtendedMinInches; AbsoluteInch <= ExtendedMaxInches; AbsoluteInch++) {
    if (AbsoluteInch < VisibleMinInches - 12 || AbsoluteInch > VisibleMaxInches + 12) continue;
    const Y = ImgHeight - (AbsoluteInch - VisibleMinInches) * PixelsPerInch;
    const IsFoot = AbsoluteInch % 12 === 0;
    const IsQuarterFoot = AbsoluteInch % 3 === 0; // Every 3 inches
    const LineEndX = IsFoot
      ? RelX(95) // Foot markers extend to 95% of width
      : IsQuarterFoot
        ? RelX(92) // Quarter foot markers (3,6,9 inches) extend to 92%
        : RelX(90); // Regular inch markers

    BgCTX.lineWidth = IsFoot ? RelSize(0.75) : RelSize(0.25);
    BgCTX.strokeStyle = "#252525";

    BgCTX.beginPath();
    BgCTX.moveTo(0, Y);
    BgCTX.lineTo(LineEndX, Y);
    BgCTX.stroke();

    const Feet = Math.floor(AbsoluteInch / 12);
    const Inches = AbsoluteInch % 12;

    if (IsFoot) {
      BgCTX.fillStyle = "#000000";
      BgCTX.font = RelBoldFont(3.5);
      BgCTX.textAlign = "right";
      BgCTX.fillText(`${Feet}'0"`, ImgWidth - RelX(2.5), Y - RelY(1));
    } else if (IsQuarterFoot) {
      BgCTX.fillStyle = "#000000";
      BgCTX.font = RelFont(3);
      BgCTX.textAlign = "right";
      BgCTX.fillText(`${Feet}'${Inches}"`, ImgWidth - RelX(2.5), Y - RelY(0.75));
    }
  }

  BgCTX.restore();
  return BgCanvas;
}

// ---------------------------------------------------------------------------------------
// Helper Functions:
// -----------------
/**
 * Convert a percentage of canvas width to actual pixels.
 * @param X Percentage value (0-100).
 * @returns Pixel value.
 */
function RelX(X: number): number {
  return (X / 100) * ImgWidth;
}

/**
 * Convert a percentage of canvas height to actual pixels.
 * @param Y Percentage value (0-100).
 * @returns Pixel value.
 */
function RelY(Y: number): number {
  return (Y / 100) * ImgHeight;
}

/**
 * Convert a percentage to a size value based on the smaller canvas dimension.
 * @param Size Percentage value (0-100).
 * @returns Size in pixels.
 */
function RelSize(Size: number): number {
  return (Size / 100) * Math.min(ImgWidth, ImgHeight);
}

/**
 * Create a font string with the given relative size.
 * @param Size Percentage value (0-100).
 * @returns Font string.
 */
function RelFont(Size: number): string {
  const FontSize = Math.max(8, Math.floor(RelSize(Size)));
  return `${FontSize}px Arial`;
}

/**
 * Create a bold font string with the given relative size.
 * @param Size Percentage value (0-100).
 * @returns Bold font string.
 */
function RelBoldFont(Size: number): string {
  const FontSize = Math.max(8, Math.floor(RelSize(Size)));
  return `bold ${FontSize}px Arial`;
}

/**
 * Parse a height string like "5'10" or "5ft 10in" into inches number.
 * @param HeightStr Height string.
 * @returns Total height in inches. If the format is unrecognized, defaults to 70 inches (5'10").
 */
function ParseHeight(HeightStr: string | number): number {
  if (typeof HeightStr === "number") return HeightStr;

  // Extract feet and inches using regex:
  const FeetInchesMatch = HeightStr.match(/(\d+)'(\d+)/);
  if (FeetInchesMatch) {
    return parseInt(FeetInchesMatch[1]) * 12 + parseInt(FeetInchesMatch[2]);
  }

  // Try ft/in format:
  const FtInMatch = HeightStr.match(/(\d+)(?:\s*ft|\s*feet)(?:\s+|-)(\d+)(?:\s*in|\s*inches)?/i);
  if (FtInMatch) {
    return parseInt(FtInMatch[1]) * 12 + parseInt(FtInMatch[2]);
  }

  // Try cm format and convert to inches:
  const CmMatch = HeightStr.match(/(\d+)(?:\s*cm|\s*centimeters)/i);
  if (CmMatch) {
    return Math.round(parseInt(CmMatch[1]) / 2.54);
  }

  return 70;
}

/**
 * Calculate the vertical offset needed for the height board.
 * @param PersonHeight Height in inches.
 * @param HeadPosition Percentage from top where head should align.
 * @returns Offset in pixels to apply to the background board.
 */
function CalculateBoardOffset(PersonHeight: number, HeadPosition: number): number {
  // Constants for the board - these will be recalculated based on height
  const DefaultMinHeightInches = 48; // 4 feet
  const DefaultMaxHeightInches = 74; // 6'1"

  const MinHeightInches = Math.min(DefaultMinHeightInches, PersonHeight - 6);
  const MaxHeightInches = Math.max(DefaultMaxHeightInches, PersonHeight + 6);
  const TotalInchesInRange = MaxHeightInches - MinHeightInches;
  const PixelsPerInch = ImgHeight / TotalInchesInRange;

  const HeightFromBottom = PersonHeight - MinHeightInches;
  const HeightPosition = ImgHeight - HeightFromBottom * PixelsPerInch;

  const DesiredHeadY = (HeadPosition / 100) * ImgHeight;
  return DesiredHeadY - HeightPosition;
}
