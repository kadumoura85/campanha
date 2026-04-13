import path from "path";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const uploadsRoot = path.resolve(currentDir, "..", "..", "..", "..", "uploads");
