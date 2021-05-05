import type { ReactNode } from 'react';
import Link from 'components/Link';

const colorCodeTest = /^#?([0-9a-f]{3}(?:[0-9a-f]{3})?)$/i;

export const BBTags: Record<string, (props: BBTagProps) => JSX.Element> = {
	b: ({ children }) => <b>{children}</b>,
	i: ({ children }) => <i>{children}</i>,
	u: ({ children }) => <u>{children}</u>,
	s: ({ children }) => <s>{children}</s>,
	size: ({ attributes, children }) => (
		<span
			style={
				typeof attributes === 'string'
					? { fontSize: `${attributes}px` }
					: undefined
			}
		>
			{children}
		</span>
	),
	color: ({ attributes, children }) => (
		<span
			style={
				typeof attributes === 'string'
					? { color: attributes.replace(colorCodeTest, '#$1') }
					: undefined
			}
		>
			{children}
		</span>
	),
	background: ({ attributes, children }) => (
		<span
			style={
				typeof attributes === 'string'
					? { backgroundColor: attributes.replace(colorCodeTest, '#$1') }
					: undefined
			}
		>
			{children}
		</span>
	),
	font: ({ attributes, children }) => (
		<span
			style={
				typeof attributes === 'string'
					? { fontFamily: attributes }
					: undefined
			}
		>
			{children}
		</span>
	),
	center: ({ children }) => <div className="center">{children}</div>,
	left: ({ children }) => <div className="left">{children}</div>,
	right: ({ children }) => <div className="right">{children}</div>,
	justify: ({ children }) => <div className="justify">{children}</div>,
	url: ({ attributes, children }) => (
		<Link
			href={
				typeof attributes === 'string'
					? attributes
					: typeof children === 'string'
						? children
						: undefined
			}
		>
			{children}
		</Link>
	),
	alt: ({ attributes, children }) => (
		<span
			title={
				typeof attributes === 'string'
					? attributes
					: undefined
			}
		>
			{children}
		</span>
	),
	img: ({ attributes, children }) => (
		<img
			src={
				typeof children === 'string'
					? children
					: undefined
			}
			width={
				attributes instanceof Object && 'width' in attributes
					? attributes.width
					: undefined
			}
			height={
				attributes instanceof Object && 'height' in attributes
					? attributes.height
					: undefined
			}
		/>
	)
	// spoiler,
	// flash,
	// youtube,
	// user
};

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

const BBTag = (props: BBTagProps) => {
	if (props.tagName in BBTags) {
		const ThisBBTag = BBTags[props.tagName];

		return <ThisBBTag {...props} />;
	}

	return <>{props.children}</>;
};

export default BBTag;