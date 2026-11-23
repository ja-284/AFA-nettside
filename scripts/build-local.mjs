// Bygger siden for lokal testing med Turnstile-testnøkkelen (ekte nøkler virker bare på det ekte domenet).
// Kjør: npm run build:local   (deretter npm run preview)
import { execSync } from 'node:child_process';

process.env.PUBLIC_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
execSync('npm run build', { stdio: 'inherit', env: process.env });
