import './styles.module.scss';
import Link from 'components/Link';
import Nav from 'components/Nav';
import WealthDungeon from 'components/WealthDungeon';
import FlashyTitle from 'components/FlashyTitle';

export type HeaderProps = {
	/** Whether the flashy title should render at the top of the page. */
	flashyTitle?: boolean
};

const Header = ({ flashyTitle }: HeaderProps) => (
	<>
		<header>
			<div className="mspface-container">
				<Link className="mspface front" href="/" title="MSPFA Home" tabIndex={-1} draggable={false} />
				<WealthDungeon />
			</div>
			{flashyTitle && <FlashyTitle />}
		</header>
		<Nav />
	</>
);

export default Header;