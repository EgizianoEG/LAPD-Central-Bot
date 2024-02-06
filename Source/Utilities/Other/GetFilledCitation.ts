import { createCanvas, loadImage } from "@napi-rs/canvas/index.js";
import { GetDirName } from "./Paths.js";
import { Citations } from "@Typings/Utilities/Generic.js";
import { Other } from "@Config/Secrets.js";

import Path from "node:path";
import Axios from "axios";
import FileSystem from "node:fs/promises";
import GetPlaceholderImgURL from "./GetPlaceholderImg.js";

export enum CitationImgDimensions {
  Height = 1120,
  Width = 700,
}

const TFCTemplateImgBuffer = await FileSystem.readFile(
  Path.join(GetDirName(import.meta.url), "..", "..", "Resources", "Imgs", "TFCTemplate.jpg")
);
const TWCTemplateImgBuffer = await FileSystem.readFile(
  Path.join(GetDirName(import.meta.url), "..", "..", "Resources", "Imgs", "TWCTemplate.jpg")
);

const FineTemplate = await loadImage(TFCTemplateImgBuffer);
const WarnTemplate = await loadImage(TWCTemplateImgBuffer);

export async function GetFilledCitation<
  Type extends "Warning" | "Fine",
  AsURL extends boolean | undefined = undefined,
>(
  CitType: Type,
  CitData: Type extends "Warning" ? Citations.WarningCitationData : Citations.FineCitationData,
  ReturnAsURL?: boolean
): Promise<
  AsURL extends true ? string : AsURL extends false | undefined ? Buffer : Buffer | string
> {
  const Width = CitationImgDimensions.Width;
  const Height = CitationImgDimensions.Height;
  const CitCanvas = createCanvas(Width, Height);
  const CitCTX = CitCanvas.getContext("2d");

  // Draw the citation template.
  CitCTX.drawImage(CitType === "Fine" ? FineTemplate : WarnTemplate, 0, 0);

  // Citation Number
  CitCTX.font = "400 2.4em Bahnschrift";
  CitCTX.fillStyle = "rgba(0, 0, 0, 0.7)";
  CitCTX.fillText(CitData.num, Width / 1.268, Height / 12.727);

  // Change Configuration
  CitCTX.font = "300 1.32em Bahnschrift";
  CitCTX.fillStyle = "black";
  CitCTX.globalAlpha = 0.9;

  // Date of Violation or Citation
  CitCTX.fillText(CitData.dov, Width / 41.176, Height / 4.786);

  // Time of Violation or Citation
  fillTextWithSpacing(CitCTX, CitData.tov, Width / 3.382, Height / 4.786, 2);

  // Period of The Day (AM or PM)
  if (CitData.ampm === "AM") {
    CitCTX.fillText("X", Width / 2.071, Height / 5.271);
  } else {
    CitCTX.fillText("X", Width / 2.071, Height / 4.902);
  }

  // Day of Week
  CitCTX.beginPath();
  const DOWCircleY = Height / 4.902;
  switch (Number(CitData.dow)) {
    case 1:
      CitCTX.arc(Width / 1.7565, DOWCircleY, 10, 0, 2 * Math.PI);
      break;
    case 2:
      CitCTX.arc(Width / 1.6279, DOWCircleY, 10, 0, 2 * Math.PI);
      break;
    case 3:
      CitCTX.arc(Width / 1.5184, DOWCircleY, 10, 0, 2 * Math.PI);
      break;
    case 4:
      CitCTX.arc(Width / 1.4227, DOWCircleY, 10, 0, 2 * Math.PI);
      break;
    case 5:
      CitCTX.arc(Width / 1.3384, DOWCircleY, 10, 0, 2 * Math.PI);
      break;
    case 6:
      CitCTX.arc(Width / 1.2681, DOWCircleY, 10, 0, 2 * Math.PI);
      break;
    case 7:
    default:
      CitCTX.arc(Width / 1.2027, DOWCircleY, 10, 0, 2 * Math.PI);
      break;
  }

  CitCTX.stroke();

  // Violator's Name
  CitCTX.fillText(CitData.violator.name, Width / 42, Height / 3.945);

  // Violator's Residence Address
  CitCTX.fillText(CitData.violator.address, Width / 41.176, Height / 3.325);

  // Violator's Residence City
  CitCTX.fillText(CitData.violator.city, Width / 42, Height / 2.91);

  // Violator's Driver License Number
  fillTextWithSpacing(CitCTX, CitData.violator.lic_num, Width / 41.176, Height / 2.575, 2);

  // Violator's Driver License Class
  CitCTX.fillText(CitData.violator.lic_class, Width / 2.24, Height / 2.575);

  // Commercial Driver License Check
  if (CitData.violator.lic_is_comm) {
    CitCTX.fillText("X", Width / 1.926, Height / 2.565);
  } else {
    CitCTX.fillText("X", Width / 1.65, Height / 2.565);
  }

  // Violator's Age Group
  CitCTX.fillText(CitData.violator.age, Width / 1.448, Height / 2.575);

  // Violator's Gender
  CitCTX.fillText(CitData.violator.gender, Width / 42, Height / 2.305);

  // Violator's Hair Color
  CitCTX.fillText(CitData.violator.hair_color, Width / 6.25, Height / 2.305);

  // Violator's Eyes Color
  CitCTX.fillText(CitData.violator.eye_color, Width / 3.91, Height / 2.305);

  // Violator's Height
  CitCTX.fillText(CitData.violator.height, Width / 2.74, Height / 2.305);

  // Violator's Weight
  CitCTX.fillText(CitData.violator.weight.toString(), Width / 2.07, Height / 2.305);

  // Vehicle License Number
  fillTextWithSpacing(CitCTX, CitData.vehicle.lic_num, Width / 42, Height / 2.09, 3);

  // Vehicle Year of Manufacture
  fillTextWithSpacing(CitCTX, CitData.vehicle.year, Width / 42, Height / 1.912, 1);

  // Vehicle Make
  CitCTX.fillText(CitData.vehicle.make, Width / 5.08, Height / 1.918);

  // Vehicle Model
  CitCTX.fillText(CitData.vehicle.model, Width / 44, Height / 1.765);

  // Vehicle Body Style
  CitCTX.fillText(CitData.vehicle.body_style, Width / 1.838, Height / 1.76);

  // Vehicle Color
  CitCTX.fillText(CitData.vehicle.color, Width / 1.412, Height / 1.76);

  // ------------------------------------------------------------------------------------------------
  // Violations
  for (let i = 0; i < CitData.violations.length; i++) {
    let ViolationText = "";
    let ViolationYAxis = Height / 1.58;
    const MaxLength = 58;
    const Violation = CitData.violations[i];

    CitCTX.font = "300 1.165em Bahnschrift";
    CitCTX.fillStyle = "black";

    if (typeof Violation === "string") {
      if (Violation.slice(0, MaxLength) === Violation) {
        ViolationText = Violation;
      } else {
        ViolationText = Violation.slice(0, MaxLength) + "-";
      }
    } else if (Violation.violation.slice(0, MaxLength) === Violation.violation) {
      ViolationText = Violation.violation;
    } else {
      ViolationText = Violation.violation.slice(0, MaxLength) + "-";
    }

    switch (i) {
      case 1:
        ViolationYAxis = Height / 1.502;
        break;
      case 2:
        ViolationYAxis = Height / 1.43;
        break;
      case 3:
        ViolationYAxis = Height / 1.366;
        break;
      case 0:
      default:
        break;
    }

    if (typeof Violation === "object") {
      if (typeof Violation.correctable === "boolean") {
        CitCTX.fillText("X", Violation.correctable ? Width / 23 : Width / 10.7, ViolationYAxis + 6);
      }
      if (typeof Violation.type === "string") {
        CitCTX.beginPath();
        CitCTX.arc(
          Violation.type === "M" ? Width / 1.164 : Width / 1.088,
          ViolationYAxis - 8,
          9,
          0,
          2 * Math.PI
        );
        CitCTX.stroke();
      }
    }

    CitCTX.fillText(ViolationText, Width / 7.25, ViolationYAxis);

    // ------------------------------------------------------------------------------------------------
    // Location of Violation(s)
    CitCTX.font = "300 1.32em Bahnschrift";
    CitCTX.fillStyle = "black";
    CitCTX.fillText(CitData.violation_loc, Width / 42, Height / 1.27);

    // Fine Amount
    if (CitType === "Fine") {
      CitCTX.fillText(
        `${(CitData as Citations.FineCitationData).fine_amount}$`,
        Width / 1.24,
        Height / 1.27
      );
    }

    // Citing Officer
    CitCTX.fillText(
      `${CitData.citing_officer.display_name} (@${CitData.citing_officer.name})`,
      Width / 42,
      Height / 1.136
    );

    // Officer Signature
    CitCTX.font = "300 2em Mistral";
    CitCTX.fillStyle = "black";
    fillTextWithSpacing(
      CitCTX,
      CitData.citing_officer.display_name,
      Width / 2.5,
      Height / 1.0725,
      2
    );
  }

  const ImgBuffer = CitCanvas.toBuffer("image/jpeg", 100);
  if (ReturnAsURL) {
    const Payload = new FormData();
    Payload.append("image", ImgBuffer.toString("base64"));

    const Resp = await Axios.post("https://api.imgbb.com/1/upload", Payload, {
      params: {
        key: Other.ImgBB_API_Key,
        name: `traffic_citation_#${CitData.num}`,
      },
    }).catch(() => null);

    return Resp?.data?.data?.display_url ?? GetPlaceholderImgURL(`${Width}x${Height}`, "?");
  } else {
    return ImgBuffer as any;
  }
}

function fillTextWithSpacing(CTX, Text, X, Y, Spacing, TextAlign?: "center" | "right") {
  const TotalWidth = CTX.measureText(Text).width + Spacing * (Text.length - 1);
  switch (TextAlign) {
    case "right":
      X -= TotalWidth;
      break;
    case "center":
      X -= TotalWidth / 2;
      break;
    default:
      break;
  }
  for (let i = 0; i < Text.length; i++) {
    const Char = Text.charAt(i);
    CTX.fillText(Char, X, Y);
    X += CTX.measureText(Char).width + Spacing;
  }
}
