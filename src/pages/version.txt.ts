import { BUILD_ID } from '@lib/build.ts';
import type { APIRoute } from 'astro';

export const GET: APIRoute = () => new Response(BUILD_ID);
