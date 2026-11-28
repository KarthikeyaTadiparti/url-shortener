import AppError from "../../utils/AppError.js";
import encodeShortCode from "../../utils/encodeShortCode.js";
import UrlRepository from "./urls.repository.js";

class UrlService {
    async createUrl(originalUrl: string) {
        //get the id
        const id = await UrlRepository.getNextId();

        //generate code
        const shortcode = encodeShortCode(id);

        //insert url
        const createdUrl = await UrlRepository.insertUrl(id, originalUrl, shortcode);

        return createdUrl;
    }

    async fetchOriginalUrl(shortcode: string) {
        const originalUrl = await UrlRepository.getOriginalUrl(shortcode);

        if (!originalUrl) {
            throw new AppError("Short URL not found", 404);
        }

        return originalUrl;
    }
}

export default new UrlService();
