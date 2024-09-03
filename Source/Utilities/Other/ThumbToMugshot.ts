import { type Canvas, createCanvas, loadImage } from "@napi-rs/canvas/index.js";
import { Embeds } from "@Config/Shared.js";
import UploadToImgBB from "./ImgBBUpload.js";

let BgCanvas: Canvas | null = null;
export interface GetBookingMugshotOptions {
  user_thumb_url: string;
  booking_num: string | number;
  /** Whether to upload the mugshot on ImgBB and return it's direct URL; defaults to `false` */
  return_url?: boolean;
  /** For choosing the appropriate fallback thumbnail if the user thumbnail image could not be retrieved */
  user_gender?: "Male" | "Female" | "M" | "F";
}

/**
 * Returns a mugshot image (JPEG) with 180x180 dimensions.
 * @param Options - Just options.
 * @returns A JPEG Buffer or an ImgBB direct image URL.
 */
export default async function GetBookingMugshot<AsURL extends boolean | undefined = undefined>(
  Options: GetBookingMugshotOptions
): Promise<AsURL extends true ? string : AsURL extends false ? Buffer : Buffer | string> {
  const ImgCanvas = createCanvas(180, 180);
  const ImgCTX = ImgCanvas.getContext("2d");
  const ThumbImage = await loadImage(Options.user_thumb_url).catch(() => {
    if (Options.user_gender) {
      Options.user_gender = (
        typeof Options.user_gender === "string"
          ? typeof Options.user_gender === "number"
          : Options.user_gender === 1
            ? "Male"
            : "Female"
      ) as any;
    } else {
      Options.user_gender = "Male";
    }
    return Embeds.Thumbs[`Avatar${Options.user_gender}`];
  });

  // Draw the background & received user thumbnail
  ImgCTX.drawImage(GetBackgroundCanvas(), 0, 0);
  ImgCTX.drawImage(ThumbImage, 0, 0, 180, 180);

  // Draw the rectangle for the booking number
  ImgCTX.fillStyle = "#EBEBEB";
  ImgCTX.lineWidth = 0.8;
  ImgCTX.fillRect(ImgCanvas.width / 1.333333, ImgCanvas.height / 1.090909, 45, 15);
  ImgCTX.strokeRect(ImgCanvas.width / 1.333333, ImgCanvas.height / 1.090909, 46, 16);

  // Draw the booking number text
  ImgCTX.font = "bold 10px Bahnschrift";
  ImgCTX.fillStyle = "#141414";
  ImgCTX.fillText(`#${Options.booking_num}`, ImgCanvas.width / 1.245, ImgCanvas.height / 1.019);

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
function GetBackgroundCanvas() {
  if (BgCanvas) return BgCanvas;
  BgCanvas = createCanvas(180, 180);
  const BgCTX = BgCanvas.getContext("2d");

  const StripeCount = 18;
  const StripeWidth = BgCanvas.width;
  const StripeHeight = BgCanvas.height / StripeCount;

  for (let i = 0; i < StripeCount; i++) {
    BgCTX.fillStyle = i % 2 === 0 ? "#2D2D2D" : "#6E6E6E";
    BgCTX.fillRect(0, i * StripeHeight + 1, StripeWidth, StripeHeight);
    if (i % 2 === 0) {
      BgCTX.fillStyle = "#6E6E6E";
      BgCTX.fillRect(0, i * StripeHeight, StripeWidth, StripeHeight);
      BgCTX.fillStyle = "#EBEBEB";
      BgCTX.fillRect(0, i * StripeHeight + 1, StripeWidth, StripeHeight);
    } else {
      BgCTX.fillStyle = "#EBEBEB";
      BgCTX.fillRect(0, i * StripeHeight, StripeWidth, StripeHeight);
      BgCTX.fillStyle = "#2D2D2D";
      BgCTX.fillRect(0, i * StripeHeight - 1, StripeWidth, StripeHeight / 3);
    }
  }

  return BgCanvas;
}
