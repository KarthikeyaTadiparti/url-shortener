import { BASE62_CHARS } from "./constants.js";

function decodeShortCode(code: string): number {
    let id = 0;
    let power = 0;

    // Loop backward from the rightmost character to the leftmost
    for (let i = code.length - 1; i >= 0; i--) {
        const char = code.charAt(i); 
        const value = BASE62_CHARS.indexOf(char);

        if (value === -1) {
            throw new Error("Invalid short code");
        }

        // Multiply value by 62 raised to the current position's power
        id = id + value * Math.pow(62, power);
        power++;
    }

    return id;
}

