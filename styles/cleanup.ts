import fs from 'fs-extra';
import { exec } from 'child_process';
const run = (command: string) => new Promise(resolve => {
	const childProcess = exec(command);
	childProcess.stdout?.pipe(process.stdout);
	childProcess.stderr?.pipe(process.stderr);
	childProcess.once('exit', resolve);
});
fs.watch('styles', { recursive: true }, async (evt, filename) => {
	const path = `styles/${filename}`;
	if (path.endsWith('.module.scss')) {
		const declarationPath = `${path}.d.ts`;
		if (fs.existsSync(path)) {
			await run(`npx tsm ${path}`);
			await run(`npx eslint --fix ${declarationPath}`);
		} else if (fs.existsSync(declarationPath)) {
			await fs.unlink(declarationPath);
		}
	}
});