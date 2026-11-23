import type { Env } from '../_lib/http';
import { injectReviews } from '../_lib/reviews';

/** Vurderingssiden: statisk HTML + godkjente vurderinger, snitt og AggregateRating. */
export const onRequestGet: PagesFunction<Env> = async (ctx) => injectReviews(ctx.env, await ctx.next(), 'page');
