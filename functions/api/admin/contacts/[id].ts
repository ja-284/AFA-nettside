import { deleteRow, updateRow } from '../../../_lib/admin';
import type { Env } from '../../../_lib/http';

export const onRequestPatch: PagesFunction<Env, 'id'> = ({ env, request, params }) => updateRow(env, 'contacts', params.id, request);
export const onRequestDelete: PagesFunction<Env, 'id'> = ({ env, params }) => deleteRow(env, 'contacts', params.id);
