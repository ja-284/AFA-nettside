import { listRows } from '../../../_lib/admin';
import type { Env } from '../../../_lib/http';

export const onRequestGet: PagesFunction<Env> = ({ env, request }) => listRows(env, 'orders', request);
