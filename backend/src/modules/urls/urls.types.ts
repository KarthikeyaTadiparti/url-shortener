import z from "zod";
import { createUrlSchema } from "./urls.valiation.js";

export type createUrlType = z.infer<typeof createUrlSchema>;
