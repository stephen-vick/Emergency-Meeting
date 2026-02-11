import { imageSize } from "image-size";
import path from "path";
const base = path.join(
  "assets",
  "among us",
  "among-us-assets-main",
  "among-us-assets-main",
  "Maps"
);
const files = [
  "Hull-sharedassets0.assets-159.png",
  "Cafeteria/cafeteriaWalls-sharedassets0.assets-152.png",
  "compLabGreenHouseAdminWalls-sharedassets0.assets-67.png",
  "LifeSupport-sharedassets0.assets-119.png",
  "room_weapon-sharedassets0.assets-80.png",
  "room_tunnel2-sharedassets0.assets-138.png",
  "dropshipTop-sharedassets0.assets-134.png",
  "ramp-sharedassets0.assets-166.png",
  "bridge_sab-sharedassets0.assets-151.png",
  "Animations-sharedassets0.assets-165.png",
  "Doors-sharedassets0.assets-104.png",
];
for (const f of files) {
  try {
    const s = imageSize(path.join(base, f))!;
    console.log(f + ": " + s.width + "x" + s.height);
  } catch (e) {
    console.log(f + ": ERROR");
  }
}
