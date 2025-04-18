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
}

/**
 * Returns a mugshot image (JPEG) with 180x180 dimensions.
 * @param Options - Just options.
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

    const FallbackImg = Embeds.Thumbs[`Avatar${Options.user_gender}`];
    return loadImage(FallbackImg);
  });

  // Draw the background height board
  ImgCTX.drawImage(CreateHeightBackgroundCanvas(), 0, 0);

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
  const InfoBoxX = RelX(2.5);
  const InfoBoxY = RelY(2.5);
  const InfoBoxWidth = RelX(60);
  const InfoBoxHeight = RelY(10);

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
  ImgCTX.font = RelFont(3); // 3% of canvas size
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
 * @returns The background canvas.
 */
function CreateHeightBackgroundCanvas() {
  if (BgCanvas) return BgCanvas;
  BgCanvas = createCanvas(ImgWidth, ImgHeight);
  const BgCTX = BgCanvas.getContext("2d");

  // Base color first
  BgCTX.fillStyle = "#EBEBEB";
  BgCTX.fillRect(0, 0, ImgWidth, ImgHeight);

  const MinHeightInches = 48; // 4 feet
  const MaxHeightInches = 74; // 6'1"
  const TotalInchesInRange = MaxHeightInches - MinHeightInches;
  const PixelsPerInch = ImgHeight / TotalInchesInRange;

  // Draw alternating background colors
  for (let Foot = 4; Foot <= 6; Foot++) {
    const InchesFromBottom = Foot * 12 - MinHeightInches;
    if (InchesFromBottom < 0) continue;

    const InchesInView = Math.min(12, MaxHeightInches - Foot * 12);
    if (InchesInView <= 0) continue;

    const startY = ImgHeight - InchesFromBottom * PixelsPerInch;
    const height = InchesInView * PixelsPerInch;

    BgCTX.fillStyle = Foot % 2 === 0 ? "#DEDEDE" : "#EBEBEB";
    BgCTX.fillRect(0, startY - height, ImgWidth, height);
  }

  // Draw the inch markers for the entire range
  for (let AbsoluteInch = MinHeightInches; AbsoluteInch <= MaxHeightInches; AbsoluteInch++) {
    const y = ImgHeight - (AbsoluteInch - MinHeightInches) * PixelsPerInch;
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
    BgCTX.moveTo(0, y);
    BgCTX.lineTo(LineEndX, y);
    BgCTX.stroke();

    const Feet = Math.floor(AbsoluteInch / 12);
    const Inches = AbsoluteInch % 12;

    if (IsFoot) {
      BgCTX.fillStyle = "#000000";
      BgCTX.font = RelBoldFont(3.5);
      BgCTX.textAlign = "right";
      BgCTX.fillText(`${Feet}'0"`, ImgWidth - RelX(2.5), y - RelY(1));
    } else if (IsQuarterFoot) {
      BgCTX.fillStyle = "#000000";
      BgCTX.font = RelFont(3);
      BgCTX.textAlign = "right";
      BgCTX.fillText(`${Feet}'${Inches}"`, ImgWidth - RelX(2.5), y - RelY(0.75));
    }
  }

  return BgCanvas;
}

// ---------------------------------------------------------------------------------------
// Helper functions for relative positioning:
// ------------------------------------------
function RelX(x: number): number {
  return (x / 100) * ImgWidth;
}

function RelY(y: number): number {
  return (y / 100) * ImgHeight;
}

function RelSize(size: number): number {
  return (size / 100) * Math.min(ImgWidth, ImgHeight);
}

function RelFont(size: number): string {
  const FontSize = Math.max(8, Math.floor(RelSize(size)));
  return `${FontSize}px Arial`;
}

function RelBoldFont(size: number): string {
  const FontSize = Math.max(8, Math.floor(RelSize(size)));
  return `bold ${FontSize}px Arial`;
}
