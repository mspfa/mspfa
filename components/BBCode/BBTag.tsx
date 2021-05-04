import type { ReactNode } from 'react';

export type BBTagProps = {
	/**
	 * Example:
	 * * The BBCode `[xyz=123]` would cause this to equal `"xyz"`.
	 */
	tagName: string,
	/**
	 * Examples:
	 * * The BBCode `[xyz]` would cause this to equal `undefined`.
	 * * The BBCode `[xyz=123]` would cause this to equal `"123"`.
	 * * The BBCode `[xyz a=1 b="2"]` would cause this to equal `{ a: "1", b: "2" }`.
	 */
	attributes: undefined | string | Partial<Record<string, string>>,
	children?: ReactNode
};

const BBTag = ({ tagName, attributes, children }: BBTagProps) => <>{JSON.stringify({ tagName, attributes })}{children}</>;

export default BBTag;