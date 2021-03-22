import { createGenerator } from 'ts-json-schema-generator';
import fs from 'fs-extra';
import { exec } from 'child_process';

const run = (command: string) => new Promise(resolve => {
	const childProcess = exec(command);
	childProcess.stdout?.pipe(process.stdout);
	childProcess.stderr?.pipe(process.stderr);
	childProcess.once('exit', resolve);
});

const updated: Record<string, number> = {};

fs.watch('pages/api', { recursive: true }, async (evt, filename) => {
	const path = `pages/api/${filename}`;
	if (path.endsWith('.ts') && !path.endsWith('.validate.ts')) {
		const outputPath = `${path.slice(0, -3)}.validate.ts`;
		const outputExists = fs.existsSync(outputPath);
		if (fs.existsSync(path)) {
			if (!(path in updated) || Date.now() - updated[path] > 1000) {
				updated[path] = Date.now();
				try {
					const schemaString = JSON.stringify(
						createGenerator({
							path,
							tsconfig: 'tsconfig.json'
						}).createSchema('Request'),
						null,
						'\t'
					);
					if (!outputExists) {
						await fs.createFile(outputPath);
					}
					// This is awful. But that's okay because it's funny. Oh, and also useful.
					await fs.writeFile(
						outputPath,
						`import { createValidator } from 'modules/server/api';\n\nexport default createValidator(${schemaString});`
					);
					await run(`npx eslint --fix ${outputPath}`);
				} catch (error) {
					console.error(error);
				}
				if (!fs.existsSync(path)) {
					await fs.unlink(outputPath);
				}
			}
		} else if (outputExists) {
			await fs.unlink(outputPath);
		}
	}
});