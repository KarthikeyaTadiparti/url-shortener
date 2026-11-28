import AppError from "../../utils/appError.js";
import encodeShortCode from "../../utils/encodeShortCode.js";
import UrlRepository from "./urls.repository.js";
import type { createUrlType } from "./urls.types.js";

class UrlService {
    async createUrl(body: createUrlType) {
        const originalUrl = body.originalUrl;

        //get the id
        const id = await UrlRepository.getNextId();

        //generate code
        const shortCode = encodeShortCode(id);

        //insert url
        const createdUrl = await UrlRepository.insertUrl(id, originalUrl, shortCode);

        return createdUrl;
    }

    async fetchOriginalUrl(shortCode: string) {
        const originalUrl = await UrlRepository.getOriginalUrl(shortCode);

        if (!originalUrl) {
            throw new AppError("Short URL not found", 404);
        }

        return originalUrl;
    }
}

export default new UrlService();
