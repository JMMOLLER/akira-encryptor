import { exit } from "process";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  ENCODING: z
    .custom<BufferEncoding>(
      (val) => {
        if (typeof val !== "string") return false;
        return Buffer.isEncoding(val);
      },
      { message: "Invalid value encoding" }
    )
    .default("base64"),
  LIBRARY_PATH: z.string().default("./library.json"),
  PASSWORD: z.string()
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  exit(1);
}

export const env = parsed.data;
