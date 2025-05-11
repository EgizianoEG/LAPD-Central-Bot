import { type Canvas, createCanvas, loadImage } from "@napi-rs/canvas/index.js";
import { Thumbs } from "@Config/Shared.js";
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
  const BkgNumPadded = Options.booking_num.toString().padStart(3, "0");
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

    const FallbackImg = Thumbs[`RobloxAvatar${Options.user_gender}`];
    return loadImage(FallbackImg);
  });

  // Calculate height positioning
  const PersonHeight = Options.height ? ParseHeight(Options.height) : 70;
  const HeadPosition = Options.head_position || 15;
  const BoardOffset = CalculateBoardOffset(PersonHeight, HeadPosition);

  // Draw the background with calculated offset (draw a slice of the board)
  const BoardCanvas = CreateHeightBackgroundCanvas();
  ImgCTX.drawImage(BoardCanvas, 0, BoardOffset, ImgWidth, ImgHeight, 0, 0, ImgWidth, ImgHeight);

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
    `BOOKING #${BkgNumPadded}`,
    InfoBoxX + InfoBoxWidth - RelX(1),
    InfoBoxY + RelY(8)
  );

  const ImgBuffer = ImgCanvas.toBuffer("image/jpeg", 100);
  if (Options.return_url) {
    const UploadedImgURL = await UploadToImgBB(ImgBuffer, `booking_mugshot_#${BkgNumPadded}`);
    return (UploadedImgURL || Thumbs.UnknownImage) as any;
  } else {
    return ImgBuffer as any;
  }
}

/**
 * Returns a canvas for the full background board (1'0" to 7'11").
 * @returns The full background canvas.
 */
function CreateHeightBackgroundCanvas() {
  if (BgCanvas) return BgCanvas;
  BgCanvas = createCanvas(ImgWidth, ImgHeight * 4);
  const BgCTX = BgCanvas.getContext("2d");
  BgCTX.fillStyle = "#EBEBEB";
  BgCTX.fillRect(0, 0, ImgWidth, BgCanvas.height);

  // Fixed board range: 1'0" (12) to 7'11" (95)
  const BoardMinInches = 12;
  const BoardMaxInches = 95;
  const TotalBoardInches = BoardMaxInches - BoardMinInches;
  const PixelsPerInch = BgCanvas.height / TotalBoardInches;

  // Draw stripes for each foot in the board range
  for (let Foot = Math.floor(BoardMinInches / 12); Foot <= Math.ceil(BoardMaxInches / 12); Foot++) {
    const FootStartInch = Foot * 12;
    const FootEndInch = (Foot + 1) * 12;

    const VisibleStart = Math.max(FootStartInch, BoardMinInches);
    const VisibleEnd = Math.min(FootEndInch, BoardMaxInches);
    if (VisibleEnd <= VisibleStart) continue;

    const VisibleStartPos = BgCanvas.height - (VisibleStart - BoardMinInches) * PixelsPerInch;
    const VisibleEndPos = BgCanvas.height - (VisibleEnd - BoardMinInches) * PixelsPerInch;
    const Height = VisibleStartPos - VisibleEndPos;

    BgCTX.fillStyle = Foot % 2 === 0 ? "#DEDEDE" : "#EBEBEB";
    BgCTX.fillRect(0, VisibleEndPos, ImgWidth, Height);
  }

  // Draw inch and foot markers
  for (let AbsoluteInch = BoardMinInches; AbsoluteInch <= BoardMaxInches; AbsoluteInch++) {
    const Y = BgCanvas.height - (AbsoluteInch - BoardMinInches) * PixelsPerInch;
    const IsFoot = AbsoluteInch % 12 === 0;
    const IsQuarterFoot = AbsoluteInch % 3 === 0;
    const LineEndX = IsFoot ? RelX(95) : IsQuarterFoot ? RelX(92) : RelX(90);

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

  return BgCanvas;
}

/**
 * Calculate the source Y offset (in pixels) for the visible window of the board.
 * @param PersonHeight Height in inches.
 * @param HeadPosition Percentage from top where head should align.
 * @returns Source Y offset in pixels for the board image.
 */
function CalculateBoardOffset(PersonHeight: number, HeadPosition: number): number {
  const BoardMinInches = 12; // 1'0"
  const BoardMaxInches = 95; // 7'11"
  const TotalBoardInches = BoardMaxInches - BoardMinInches;

  const VisibleRangeInches = 25; // 2'1"
  const BoardCanvasHeight = ImgHeight * 4;
  const PixelsPerInch = BoardCanvasHeight / TotalBoardInches;

  let VisibleTopInches = PersonHeight + (HeadPosition / 100) * VisibleRangeInches;
  let VisibleBottomInches = VisibleTopInches - VisibleRangeInches;

  if (VisibleTopInches > BoardMaxInches) {
    VisibleTopInches = BoardMaxInches;
    VisibleBottomInches = BoardMaxInches - VisibleRangeInches;
  }
  if (VisibleBottomInches < BoardMinInches) {
    VisibleTopInches = BoardMinInches + VisibleRangeInches;
  }

  // The offset is how many pixels from the top of the board canvas to start copying
  const OffsetInches = BoardMaxInches - VisibleTopInches;
  return OffsetInches * PixelsPerInch;
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
  const FeetInchesMatch = HeightStr.match(/(\d{1,3})'(\d{1,3})/);
  if (FeetInchesMatch) {
    return parseInt(FeetInchesMatch[1]) * 12 + parseInt(FeetInchesMatch[2]);
  }

  // Try ft/in format:
  const FtInMatch = HeightStr.match(
    /(\d{1,3})(?:\s*ft|\s*feet)(?:\s+|-)(\d{1,3})(?:\s*in|\s*inches)?/i
  );
  if (FtInMatch) {
    return parseInt(FtInMatch[1]) * 12 + parseInt(FtInMatch[2]);
  }

  // Try cm format and convert to inches:
  const CmMatch = HeightStr.match(/(\d{1,3})(?:\s*cm|\s*centimeters)/i);
  if (CmMatch) {
    return Math.round(parseInt(CmMatch[1]) / 2.54);
  }

  return 70;
}
