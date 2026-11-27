import type { encode } from "node:punycode";
import { BASE62_CHARS } from "./constants.js";

const encodeShortCode = (id: number): string => {
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("ID must be a positive safe integer");
    }

    let code = "";
    let num = id;

    while (num > 0) {
        const remainder = num % 62;

        code = BASE62_CHARS[remainder] + code;

        num = Math.floor(num / 62);
    }

    return code;
};

export default encodeShortCode;