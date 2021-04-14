import Link from 'components/Link';
import './styles.module.scss';

const flashyTitleColors = [
	'#de3535',
	'#dd8137',
	'#f3ff5b',
	'#63d606',
	'#4193c4',
	'#953ddb'
] as const;
// The above type assertion is necessary because removing it mysteriously results in this component never re-rendering its JSX `style`. This must be a bug.

const FlashyTitle = () => (
	<div id="flashy-title-container" className="front">
		{process.browser && (
			<style jsx global>{`
				#flashy-title {
					background-color: ${flashyTitleColors[Math.floor(Math.random() * flashyTitleColors.length)]};
				}
			`}</style>
		)}
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