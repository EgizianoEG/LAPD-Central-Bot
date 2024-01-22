import { type Canvas, createCanvas, loadImage } from "@napi-rs/canvas/index.js";
import { Embeds } from "@Config/Shared.js";
import { ImgBB } from "@Config/Secrets.js";
import Axios from "axios";
export interface GetBookingMugshotOptions {
  UserThumbURL: string;
  BookingNum: string | number;
  /** Whether to upload the mugshot on ImgBB and return it's direct URL; defaults to `false` */
  ReturnURL?: boolean;
  /** For choosing the appropriate fallback thumbnail if the user thumbnail image could not be retrieved */
  UserGender?: "Male" | "Female" | 1 | 2;
}

let BgCanvas: Canvas | null = null;

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
  const ThumbImage = await loadImage(Options.UserThumbURL).catch(() => {
    if (Options.UserGender) {
      Options.UserGender = (
        typeof Options.UserGender === "string"
          ? typeof Options.UserGender === "number"
          : Options.UserGender === 1
            ? "Male"
            : "Female"
      ) as any;
    } else {
      Options.UserGender = "Male";
    }
    return Embeds.Thumbs[`Avatar${Options.UserGender}`];
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
  ImgCTX.font = "bold 10px Consolas";
  ImgCTX.fillStyle = "#141414";
  ImgCTX.fillText(`#${Options.BookingNum}`, ImgCanvas.width / 1.245, ImgCanvas.height / 1.019);

  const ImgBuffer = ImgCanvas.toBuffer("image/jpeg", 100);
  if (Options.ReturnURL) {
    const Payload = new FormData();
    Payload.append("image", ImgBuffer.toString("base64"));

    const Resp = await Axios.post("https://api.imgbb.com/1/upload", Payload, {
      params: {
        key: ImgBB.API_Key,
        name: `booking_mugshot_#${Options.BookingNum}`,
      },
    });

    return Resp.data?.data?.display_url ?? Embeds.Thumbs.UnknownImage;
  } else {
    return ImgBuffer as any;
  }
}
