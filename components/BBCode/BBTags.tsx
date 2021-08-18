import './styles.module.scss';
import Link from 'components/Link';
import type { ReactNode } from 'react';
import sanitizeURL from 'lib/client/sanitizeURL';
import withBlock from 'components/BBCode/withBlock';
import Spoiler from 'components/Spoiler';
import dynamic from 'next/dynamic';

const Flash = dynamic(() => import('components/Flash'), {
	ssr: false
});

export const hashlessColorCodeTest = /^([0-9a-f]{3}(?:[0-9a-f]{3}(?:[0-9a-f]{2})?)?)$/i;
export const youTubeVideoIDTest = /^(?:https?:)?\/\/(?:(?:www|m)\.)?(?:youtube\.com|youtu\.be)\/.*(?:v=|\/)([\w-]+).*$/i;

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
	b: ({ children }) => <b>{children}</b>,
	i: ({ children }) => <i>{children}</i>,
	u: ({ children }) => <u>{children}</u>,
	s: ({ children }) => <s>{children}</s>,
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
	left: withBlock(({ children }) => (
		<div className="left">{children}</div>
	)),
	center: withBlock(({ children }) => (
		<div className="center">{children}</div>
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
	spoiler: withBlock(({ attributes, children }) => (
		<Spoiler
			name={typeof attributes === 'string' ? attributes : undefined}
			show={attributes instanceof Object ? attributes.show : undefined}
			hide={attributes instanceof Object ? attributes.hide : undefined}
		>
			{children}
		</Spoiler>
	)),
	chat: withBlock(({ children }) => (
		<div className="chat">{children}</div>
	)),
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
				alt=""
				width={attributes?.width}
				height={attributes?.height}
			/>
		);
	},
	video: ({ attributes, children }) => {
		if (typeof attributes === 'string') {
			attributes = getWidthAndHeight(attributes);
		}

		let width: string | undefined;
		let height: string | undefined;

		if (attributes) {
			({ width, height, ...attributes } = attributes);
		}

		let youtubeVideoID: string | undefined;

		if (typeof children === 'string') {
			youtubeVideoID = children.match(youTubeVideoIDTest)?.[1];
		}

		const controls = !(
			attributes instanceof Object
			&& attributes.controls === '0'
		);

		return youtubeVideoID ? (
			<iframe
				src={
					`https://www.youtube.com/embed/${youtubeVideoID}?${new URLSearchParams({
						// By default, disable showing related videos from channels other than the owner of the embedded video.
						rel: '0',
						...attributes instanceof Object && (
							attributes as Record<string, string>
						)
					})}`
				}
				// YouTube requires embedded players to have a viewport that is at least 200x200 pixels.
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
				allowFullScreen
			/>
		) : (
			<video
				src={
					typeof children === 'string'
						? children
						: undefined
				}
				width={width}
				height={height}
				autoPlay={
					attributes instanceof Object && !(
						attributes.autoplay === undefined
						|| attributes.autoplay === '0'
					)
				}
				controls={controls}
				controlsList={
					controls
						? (
							attributes instanceof Object
								? attributes.controlslist
								: undefined
						) ?? 'nodownload'
						: undefined
				}
				loop={
					attributes instanceof Object && !(
						attributes.loop === undefined
						|| attributes.loop === '0'
					)
				}
			/>
		);
	},
	iframe: ({ attributes, children }) => {
		let width: string | undefined;
		let height: string | undefined;

		if (typeof attributes === 'string') {
			({ width, height } = getWidthAndHeight(attributes));
		}

		return (
			<iframe
				src={(
					typeof children === 'string'
						? children
						: undefined
				)}
				width={width || undefined}
				height={height || undefined}
			/>
		);
	},
	flash: ({ attributes, children }) => {
		let width: string | undefined;
		let height: string | undefined;

		if (typeof attributes === 'string') {
			({ width, height } = getWidthAndHeight(attributes));
		}

		return (
			<Flash
				src={(
					typeof children === 'string'
						? children
						: undefined
				)}
				width={width ? +width : undefined}
				height={height ? +height : undefined}
			/>
		);
	}
	// TODO: user
};

export default BBTags;