import './styles.module.scss';
import Link from 'components/Link';
import type { ReactNode } from 'react';
import sanitizeURL from 'lib/client/sanitizeURL';
import withBlock from 'components/BBCode/withBlock';
import Spoiler from 'components/Spoiler';
import dynamic from 'next/dynamic';
import { IFRAME_SANDBOX } from 'lib/client/parseBBCode/sanitizeBBCode';
import Loading from 'components/LoadingIndicator/Loading';
import addHashToColor from 'lib/client/addHashToColor';

const Flash = dynamic(() => import('components/Flash'), { loading: Loading });

export const youTubeVideoIDTest = /^(?:https?:)?\/\/(?:(?:www|m)\.)?(?:youtube\.com|youtu\.be)\/.*(?:v=|\/)([\w-]+).*$/i;

export type BBTagProps = {
	/**
	 * Examples:
	 * * The BBCode `[xyz]` would cause this to equal `undefined`.
	 * * The BBCode `[xyz=123]` would cause this to equal `"123"`.
	 * * The BBCode `[xyz a=1 b="2"]` would cause this to equal `{ a: "1", b: "2" }`.
	 */
	attributes: undefined | string | Record<string, string>,
	children?: ReactNode
};

/** Gets a `width` and a `height` from any `attributes`. */
const getWidthAndHeight = (attributes: BBTagProps['attributes']) => {
	if (attributes === undefined) {
		return {
			width: undefined,
			height: undefined
		};
	}

	if (typeof attributes === 'string') {
		const xIndex = attributes.indexOf('x');

		if (xIndex === -1) {
			return {
				width: +attributes,
				height: undefined
			};
		}

		return {
			width: +attributes.slice(0, xIndex) || undefined,
			height: +attributes.slice(xIndex + 1) || undefined
		};
	}

	// If this point is reached, `attributes instanceof Object`.

	return {
		width: attributes.width ? +attributes.width : undefined,
		height: attributes.height ? +attributes.height : undefined
	};
};

export type BBTag = (
	((props: BBTagProps) => JSX.Element)
	& {
		/** Whether the `BBTag` is wrapped by `withBlock`. */
		readonly withBlock?: boolean
	}
);

/** A mapping from lowercase BB tag names to their corresponding React components. */
const BBTags: Partial<Record<string, BBTag>> = {
	b: ({ children }) => <b>{children}</b>,
	i: ({ children }) => <i>{children}</i>,
	u: ({ children }) => <u>{children}</u>,
	s: ({ children }) => <s>{children}</s>,
	color: ({ attributes, children }) => (
		<span
			style={
				typeof attributes === 'string'
					? { color: addHashToColor(attributes) }
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
					? { backgroundColor: addHashToColor(attributes) }
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
			listenToControl
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
		const { width, height } = getWidthAndHeight(attributes);

		return (
			<img
				src={
					typeof children === 'string'
						? sanitizeURL(children)
						: undefined
				}
				alt=""
				width={width}
				height={height}
			/>
		);
	},
	video: ({ attributes, children }) => {
		const { width, height } = getWidthAndHeight(attributes);

		let controls = true;

		if (attributes instanceof Object) {
			// Delete the `width` and `height` now that they have been destructured so they aren't spread to the YouTube embed params.
			delete attributes.width;
			delete attributes.height;

			if (attributes.controls === '0') {
				controls = false;
			}
		}

		let youtubeVideoID: string | undefined;

		if (typeof children === 'string') {
			youtubeVideoID = children.match(youTubeVideoIDTest)?.[1];
		}

		return youtubeVideoID ? (
			<iframe
				src={
					`https://www.youtube.com/embed/${youtubeVideoID}?${new URLSearchParams({
						// By default, disable showing related videos from channels other than the owner of the embedded video.
						rel: '0',
						...attributes instanceof Object && attributes
					})}`
				}
				// YouTube requires embedded players to have a viewport that is at least 200x200 pixels.
				// Source: https://developers.google.com/youtube/iframe_api_reference#Requirements
				width={
					width
						? Math.max(200, width || 0)
						: 650
				}
				height={
					height
						? Math.max(200, height || 0)
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
						'autoplay' in attributes
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
						'loop' in attributes
						|| attributes.loop === '0'
					)
				}
			/>
		);
	},
	iframe: ({ attributes, children }) => {
		const { width, height } = getWidthAndHeight(attributes);

		return (
			<iframe
				src={(
					typeof children === 'string'
						? children
						: undefined
				)}
				width={width || undefined}
				height={height || undefined}
				// Allow media to go full-screen.
				allowFullScreen
				sandbox={IFRAME_SANDBOX}
			/>
		);
	},
	flash: ({ attributes, children }) => {
		const { width, height } = getWidthAndHeight(attributes);

		return (
			<Flash
				src={(
					typeof children === 'string'
						? children
						: undefined
				)}
				width={width}
				height={height}
			/>
		);
	},
	hscroll: withBlock(({ children }) => (
		<div className="hscroll">{children}</div>
	))
	// TODO: user
};

export default BBTags;