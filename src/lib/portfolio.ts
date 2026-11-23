import { getCollection } from 'astro:content';
import { site } from '../config/site';

export async function getPortfolio() {
  const items = await getCollection('portfolio');
  return items.sort((a, b) => Number(b.data.featured) - Number(a.data.featured) || b.data.date.getTime() - a.data.date.getTime());
}

export const categoryName = (id: string) => site.industries.find((i) => i.id === id)?.name ?? 'Annet';
export const categoryShort = (id: string) => site.industries.find((i) => i.id === id)?.short ?? 'Annet';
