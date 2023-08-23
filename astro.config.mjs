import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://coiggahou2002.github.io/rory-blog',
	integrations: [mdx(), sitemap()],
});
