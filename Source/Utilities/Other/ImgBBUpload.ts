import { Other } from "@Config/Secrets.js";
import Axios from "axios";

/**
 * Uploads an image to ImgBB.
 * @param Img - The image buffer to upload.
 * @param ImgName - Optional name for the image.
 * @returns The direct URL of the uploaded image, or `null` if the upload fails.
 */
export default async function UploadToImgBB(Img: Buffer, ImgName?: string): Promise<string | null> {
  const Payload = new FormData();
  Payload.append("image", Img.toString("base64"));

  return Axios.post("https://api.imgbb.com/1/upload", Payload, {
    params: {
      key: Other.ImgBB_API_Key,
      name: ImgName,
    },
  })
    .then((Resp) => Resp.data?.data?.display_url)
    .catch(() => null);
}
