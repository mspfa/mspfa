import Link from 'components/Link';
import { useState } from 'react';
import './styles.module.scss';

const flashyTitleColors = [
	'#de3535',
	'#dd8137',
	'#f3ff5b',
	'#63d606',
	'#4193c4',
	'#953ddb'
] as const;

const FlashyTitle = () => {
	// This is mysteriously necessary so the `style` tag below re-renders when this component re-renders.
	useState();

	return (
		<div id="flashy-title-container" className="front">
			<style jsx global>{`
				#flashy-title {
					background-color: ${flashyTitleColors[Math.floor(Math.random() * flashyTitleColors.length)]};
				}
			`}</style>
			<Link
				id="flashy-title"
				href="/"
				title="MSPFA Home"
				tabIndex={-1}
				draggable={false}
			/>
		</div>
	);
};

export default FlashyTitle;