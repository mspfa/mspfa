// This ESLint comment is necessary because otherwise it thinks the values of `BBTags` are not React components due to being lowercase.
/* eslint-disable react-hooks/rules-of-hooks */

import './styles.module.scss';
import Link from 'components/Link';
import { defaultSettings, useUser, getUser } from 'modules/client/users';
import type { ReactNode } from 'react';
import { useEffect, useCallback, useState } from 'react';
import { shouldIgnoreControl } from 'modules/client/utilities';
import withBlock from './withBlock';

const hashlessColorCodeTest = /^([0-9a-f]{3}(?:[0-9a-f]{3}(?:[0-9a-f]{2})?)?)$/i;

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

export type BBTag = (
	((props: BBTagProps) => JSX.Element)
	& {
		/** Whether the `BBTag` is wrapped by `withBlock`. */
		withBlock?: boolean
	}
);

const BBTags: Partial<Record<string, BBTag>> = {
	b: ({ children }) => <b>{children}</b>,
	i: ({ children }) => <i>{children}</i>,
	u: ({ children }) => <u>{children}</u>,
	s: ({ children }) => <s>{children}</s>,
	size: ({ attributes, children }) => (
		<span
			style={
				typeof attributes === 'string'
					? { fontSize: +attributes ? `${attributes}px` : attributes }
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
					? { color: attributes.replace(hashlessColorCodeTest, '#$1') }
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
					? { backgroundColor: attributes.replace(hashlessColorCodeTest, '#$1') }
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
	center: withBlock(({ children }) => (
		<div className="center">{children}</div>
	)),
	left: withBlock(({ children }) => (
		<div className="left">{children}</div>
	)),
	right: withBlock(({ children }) => (
		<div className="right">{children}</div>
	)),
	justify: withBlock(({ children }) => (
		<div className="justify">{children}</div>
	)),
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
	img: ({ attributes, children }) => {
		let width: string | undefined;
		let height: string | undefined;

		if (typeof attributes === 'string') {
			const xIndex = attributes.indexOf('x');

			if (xIndex === -1) {
				width = attributes;
			} else {
				width = attributes.slice(0, xIndex);
				height = attributes.slice(xIndex + 1);
			}
		} else if (attributes instanceof Object) {
			width = attributes.width;
			height = attributes.height;
		}

		return (
			<img
				src={
					typeof children === 'string'
						? children
						: undefined
				}
				width={width}
				height={height}
			/>
		);
	},
	spoiler: withBlock(({ attributes, children }) => {
		const user = useUser();
		const [open, setOpen] = useState(user?.settings.autoOpenSpoilers ?? defaultSettings.autoOpenSpoilers);

		useEffect(() => {
			const onKeyDown = (event: KeyboardEvent) => {
				if (shouldIgnoreControl()) {
					return;
				}

				if (event.code === (getUser()?.settings.controls.toggleSpoilers ?? defaultSettings.controls.toggleSpoilers)) {
					event.preventDefault();

					setOpen(open => !open);
				}
			};

			document.addEventListener('keydown', onKeyDown);

			return () => {
				document.removeEventListener('keydown', onKeyDown);
			};
		}, []);

		return (
			<div
				className={`spoiler${open ? ' open' : ' closed'}`}
			>
				<div className="spoiler-heading">
					<button
						onClick={
							useCallback(() => {
								setOpen(open => !open);
							}, [])
						}
					>
						{(open
							? (attributes instanceof Object && attributes.close) || 'Hide'
							: (attributes instanceof Object && attributes.open) || 'Show'
						)}
					</button>
				</div>
				<div className="spoiler-content">
					{children}
				</div>
			</div>
		);
	})
	// flash,
	// youtube,
	// user
};

export default BBTags;