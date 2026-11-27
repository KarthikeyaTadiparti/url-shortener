import z from "zod";
import { createUrlSchema } from "./url-creation.valiation.js";

export type createUrlType = z.infer<typeof createUrlSchema>;
