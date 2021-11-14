import './styles.module.scss';
import Nav from 'components/Nav';
import HorizontalWealthDungeon from 'components/HorizontalWealthDungeon';
import FlashyTitle from 'components/FlashyTitle';
import Link from 'components/Link';

export type HeaderProps = {
	/** Whether the flashy title should render at the top of the page. */
	withFlashyTitle?: boolean
};

const Header = ({ withFlashyTitle }: HeaderProps) => (
	<>
		<header className="front">
			<div className="mspface-container">
				<Link className="mspface left" href="/" title="MSPFA Home" tabIndex={-1} draggable={false} />
				<HorizontalWealthDungeon />
				<Link className="mspface right" href="/" title="MSPFA Home" tabIndex={-1} draggable={false} />
			</div>
			{withFlashyTitle && <FlashyTitle />}
		</header>
		{/* The only reason the `Nav` is outside the `header` element is so `position: sticky` works on it correctly. */}
		<Nav />
	</>
);

export default Header;