import './styles.module.scss';
import Nav from 'components/Nav';
import WealthDungeon from 'components/WealthDungeon';
import FlashyTitle from 'components/FlashyTitle';
import Link from 'components/Link';

export type HeaderProps = {
	/** Whether the flashy title should render at the top of the page. */
	flashyTitle?: boolean
};

const Header = ({ flashyTitle }: HeaderProps) => (
	<>
		<header className="front">
			<div className="mspface-container">
				<Link className="mspface left" href="/" title="MSPFA Home" tabIndex={-1} draggable={false} />
				<WealthDungeon />
				<Link className="mspface right" href="/" title="MSPFA Home" tabIndex={-1} draggable={false} />
			</div>
			{flashyTitle && <FlashyTitle />}
		</header>
		<Nav />
	</>
);

export default Header;