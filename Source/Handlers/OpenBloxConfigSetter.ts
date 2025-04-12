import { Roblox } from "@Config/Secrets.js";
import { setConfig } from "openblox/config";

export default function OpenBloxConfigSetter() {
  setConfig({
    cloudKey: Roblox.CloudKey,
    cookie: Roblox.Cookie as any,
  });
}
