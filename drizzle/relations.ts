import { relations } from "drizzle-orm/relations";
import { trades, tradeMedia } from "./schema";

export const tradeMediaRelations = relations(tradeMedia, ({one}) => ({
	trade: one(trades, {
		fields: [tradeMedia.tradeId],
		references: [trades.id]
	}),
}));

export const tradesRelations = relations(trades, ({many}) => ({
	tradeMedias: many(tradeMedia),
}));