import { APIResponses, APITypes } from "@Typings/Utilities/Roblox.js";
import Axios from "axios";

const EndpointMapping = {
  body: { endpoint: "avatar" },
  bust: { endpoint: "avatar-bust" },
  headshot: { endpoint: "avatar-headshot" },
};

type ThumbImgFormat<ImgFormat, CType> = CType extends "bust" ? "png" : ImgFormat;
type ThumbImgSizes<CType extends keyof typeof EndpointMapping> = CType extends "body" | undefined
  ? APITypes.Thumbnails.ThumbSizes["body"][number]
  : CType extends "bust"
  ? APITypes.Thumbnails.ThumbSizes["bust"][number]
  : CType extends "headshot"
  ? APITypes.Thumbnails.ThumbSizes["headshot"][number]
  : "";

/**
 * **Retrieves and returns desired user thumbnail(s)**.
 * @notice
 * 1. This function could return a placeholder thumbnail as a result of an error that is not related to the API request itself.
 * 2.
 *
 * @param UserIds - A single user id or an array of user ids to fetch the thumbnail(s) for.
 * If an array, it must be a maximum of `100` user ids and a minimum of `1` user id.
 * @param Size - The size of the thumbnail to be returned.
 * @param Format - The image format to be returned (image extension); defaults to `png`.
 * @param IsCircular - Whether the thumbnail should be in a circular shape; defaults to `false`.
 * @param CropType - The desired crop type of the thumbnail (body, bust, or head-shot); defaults to `body`.
 * @returns A promise that resolves to a single thumbnail URL or an array of thumbnail URLs if `UserIds` is an array.
 *
 * @template UserIdsType - The type of `UserIds` parameter.
 * @template ImageFormat - The image format type of the thumbnail to be returned
 * @template ThumbCropType - The desired crop type of the thumbnail.
 *
 * @example
 * const BodyThumb = await GetUserThumbnail(1, "352x352");
 * const BodyThumb = await GetUserThumbnail(156, "110x110", "jpeg");
 * const BustThumb = await GetUserThumbnail(156, "100x100", "png", "bust");
 * const CircHeadshotThumbs = await GetUserThumbnail([156, 157, 1], "180x180", "png", "headshot", true);
 */
export default async function GetUserThumbnail<
  UserIdsType extends number | number[],
  ImageFormat extends APITypes.Thumbnails.ImageFormat | undefined = "png",
  ThumbCropType extends keyof typeof EndpointMapping = "body",
>(
  UserIds: UserIdsType,
  Size: ThumbImgSizes<ThumbCropType>,
  Format: ThumbImgFormat<ImageFormat, ThumbCropType> = "png" as any,
  CropType: ImageFormat extends "jpeg" ? Exclude<ThumbCropType, "bust"> : ThumbCropType = "body" as any,
  IsCircular: boolean = false
): Promise<UserIdsType extends number[] ? string[] : string> {
  const Endpoint = EndpointMapping[CropType].endpoint;
  const UserIdsArray = Array.isArray(UserIds) ? [...new Set(UserIds)] : [UserIds];

  if (UserIdsArray.length > 100 || UserIdsArray.length === 0) {
    throw new RangeError(`UserIds parameter must be between 1 and 100 entries; received ${UserIdsArray.length}.`);
  }

  const Thumbnails = await Axios.request<APIResponses.Thumbnails.ThumbnailResponse>({
    url: `/v1/users/${Endpoint}`,
    baseURL: "https://thumbnails.roblox.com",
    params: {
      size: Size,
      format: Format,
      userIds: UserIdsArray.join(),
      isCircular: IsCircular,
    },
  }).then((Resp) => {
    return Resp.data.data.map((ThumbData) => {
      return ThumbData.state === "Completed"
        ? ThumbData.imageUrl
        : `https://placehold.co/${Size}/F7F8F9/202428/${Format}?text=%3F`;
    });
  });

  if (Array.isArray(UserIds)) {
    return Thumbnails as any;
  } else {
    return Thumbnails[0] as any;
  }
}