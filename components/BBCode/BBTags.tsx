// This ESLint comment is necessary because otherwise it thinks the values of `BBTags` are not React components due to being lowercase.
/* eslint-disable react-hooks/rules-of-hooks */

import './styles.module.scss';
import Link from 'components/Link';
import { defaultSettings, useUser, getUser } from 'modules/client/users';
import type { ReactNode } from 'react';
import { useEffect, useCallback, useState } from 'react';
import { sanitizeURL, shouldIgnoreControl } from 'modules/client/utilities';
import withBlock from 'components/BBCode/withBlock';

export const hashlessColorCodeTest = /^([0-9a-f]{3}(?:[0-9a-f]{3}(?:[0-9a-f]{2})?)?)$/i;
export const videoIDTest = /^(?:(?:https?:\/\/)?(?:www\.)?(?:youtu\.be|youtube\.com)\/(?:.+\/)?(?:(?:.*[?&])v=)?)?([\w-]+)(?:&.+)?$/i;

/** Gets `width` and `height` attributes from a string that looks like `${width}x${height}`. */
const getWidthAndHeight = (attributes: string) => {
	const xIndex = attributes.indexOf('x');

	if (xIndex === -1) {
		return {
			width: attributes,
			height: undefined
		};
	}

	return {
		width: attributes.slice(0, xIndex) || undefined,
		height: attributes.slice(xIndex + 1) || undefined
	};
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

export type BBTag = (
	((props: BBTagProps) => JSX.Element)
	& {
		/** Whether the `BBTag` is wrapped by `withBlock`. */
		readonly withBlock?: boolean
	}
);

const BBTags: Partial<Record<string, BBTag>> = {
	html: ({ children }) => <span className="html">{children}</span>,
	b: ({ children }) => <b>{children}</b>,
	i: ({ children }) => <i>{children}</i>,
	u: ({ children }) => <u>{children}</u>,
	s: ({ children }) => <s>{children}</s>,
	size: ({ attributes, children }) => (
		<span
			style={
				typeof attributes === 'string'
					? { fontSize: +attributes ? `${attributes}%` : attributes }
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
		if (typeof attributes === 'string') {
			attributes = getWidthAndHeight(attributes);
		}

		return (
			<img
				src={
					typeof children === 'string'
						? sanitizeURL(children)
						: undefined
				}
				width={attributes?.width}
				height={attributes?.height}
			/>
		);
	},
	spoiler: withBlock(({ attributes, children }) => {
		const user = useUser();
		const [open, setOpen] = useState(user?.settings.autoOpenSpoilers ?? defaultSettings.autoOpenSpoilers);
		const [everOpened, setEverOpened] = useState(open);

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

		if (open && !everOpened) {
			setEverOpened(true);
		}

		return (
			<div
				className={`spoiler${open ? ' open' : ' closed'}`}
			>
				<div className="spoiler-heading">
					<button
						type="button"
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
				{everOpened && (
				<div className="spoiler-content">
					{children}
				</div>
				)}
			</div>
		);
	}),
	chat: withBlock(({ children }) => (
		<div className="chat">{children}</div>
	)),
	youtube: ({ attributes, children }) => {
		if (typeof attributes === 'string') {
			attributes = getWidthAndHeight(attributes);
		}

		let width: string | undefined;
		let height: string | undefined;

		if (attributes) {
			({ width, height, ...attributes } = attributes);
		}

		let videoID: string | undefined;

		if (typeof children === 'string') {
			videoID = children.match(videoIDTest)?.[1];
		}

		return (
			<iframe
				src={
					videoID
						? `https://www.youtube.com/embed/${videoID}${
							attributes
								? `?${new URLSearchParams(attributes as Record<string, string>)}`
								: ''
						}`
						: undefined
				}
				// YouTube requires embedded players to have a viewport that is at least 200x200.
				// Source: https://developers.google.com/youtube/iframe_api_reference#Requirements
				width={
					width
						? Math.max(200, +width || 0)
						: 650
				}
				height={
					height
						? Math.max(200, +height || 0)
						: 450
				}
			/>
		);
	}
	// flash,
	// user
};

export default BBTags;