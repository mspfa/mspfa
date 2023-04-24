const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
	webpack: (config, { isServer }) => {
		for (const { oneOf } of config.module.rules) {
			if (!Array.isArray(oneOf)) {
				continue;
			}

			for (const rule of oneOf) {
				if (!Array.isArray(rule.use)) {
					continue;
				}

				for (const entry of rule.use) {
					if (!(
						entry.options instanceof Object
						&& entry.options.modules instanceof Object
						&& entry.loader.includes(`${path.sep}css-loader${path.sep}`)
					)) {
						continue;
					}

					// Let global styles be used in style modules.
					entry.options.modules.mode = 'global';

					// Undo the default hashing of style module class names.
					entry.options.modules.getLocalIdent = (_, __, localName) => localName;
				}
			}
		}

		// Here are some stupid workarounds with comments above each to explain what they are trying to work around.
		// If you're editing these, try to avoid replacements causing line numbers to change.
		config.module.rules.push({
			test: /\.[jt]sx?$/,
			loader: 'string-replace-loader',
			options: {
				multiple: [
					// Some scripts which run on both the client and the server contain code which should only run on the client or the server rather than both.
					{
						search: (
							isServer
								? /^[^\n]+ \/\/ @client-only$|\/\/ @client-only {$.*?\/\/ @client-only }$|\/\* @client-only { \*\/.*?\/\* @client-only } \*\//gms
								: /^[^\n]+ \/\/ @server-only$|\/\/ @server-only {$.*?\/\/ @server-only }$|\/\* @server-only { \*\/.*?\/\* @server-only } \*\//gms
						),
						replace: ''
					},
					// Normally, the minifier thinks `import`ed style modules which have nothing `import`ed `from` them are unused, so it omits them from the production build.
					{
						search: /^import '(.+\.module\.(?:s?css|sass))';$/gm,
						replace: (match, matchedPath) => {
							const variableName = `__styles_${matchedPath.replace(/[^\w]/g, '_')}`;
							return `import ${variableName} from '${matchedPath}'; ${variableName};`;
						}
					}
				]
			}
		});

		return config;
	},
	poweredByHeader: false,
	redirects: async () => [{
		source: '/discord',
		destination: 'https://discord.gg/EC5acgG',
		permanent: true
	}]
};

module.exports = nextConfig;
