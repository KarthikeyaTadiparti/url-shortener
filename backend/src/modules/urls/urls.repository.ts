import { eq, sql } from "drizzle-orm";
import { db } from "../../config/database.js";
import { urlsTable } from "../../schema/urls.js";
import AppError from "../../utils/AppError.js";

class UrlRepository {
    async getNextId(): Promise<number> {
        const result = await db.execute(sql`SELECT nextval('urls_id_seq') AS id`);

        return Number(result.rows[0].id);
    }

    async insertUrl(id: number, url: string, shortCode: string) {
        const [createdUrl] = await db
            .insert(urlsTable)
            .values({
                id,
                original_url: url,
                short_code: shortCode,
            })
            .returning();

        if (!createdUrl) {
            throw new AppError("Failed to create URL", 500);
        }

        return createdUrl;
    }

    async getOriginalUrl(shortCode: string): Promise<string | undefined> {
        const [result] = await db
            .select({ originalUrl: urlsTable.original_url })
            .from(urlsTable)
            .where(eq(urlsTable.short_code, shortCode));

        return result?.originalUrl;
    }
}

export default new UrlRepository();
