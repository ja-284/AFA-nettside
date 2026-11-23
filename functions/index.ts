import type { Env } from './_lib/http';
import { injectReviews } from './_lib/reviews';

/** Forsiden: statisk HTML + godkjente vurderinger satt inn på serveren. */
export const onRequestGet: PagesFunction<Env> = async (ctx) => injectReviews(ctx.env, await ctx.next(), 'home');
