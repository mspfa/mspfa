import Link from 'components/Link';
import './styles.module.scss';

const flashyTitleColors = [
	'#de3535',
	'#dd8137',
	'#f3ff5b',
	'#63d606',
	'#4193c4',
	'#953ddb'
];

/** Returns a random item of `flashyTitleColors`. */
const getFlashyTitleColor = () => flashyTitleColors[Math.floor(Math.random() * flashyTitleColors.length)];

const FlashyTitle = () => (
	<div id="flashy-title-container" className="front">
		<style jsx global>{`
			#flashy-title {
				background-color: ${getFlashyTitleColor()};
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

export default FlashyTitle;