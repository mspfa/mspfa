import Link from 'components/Link';
import FlashyTitle from 'components/FlashyTitle';
import Nav from 'components/Nav';
import WealthDungeon from 'components/WealthDungeon';
import './styles.module.scss';

const Header = () => (
	<>
		<header>
			<div className="mspface-container">
				<Link className="mspface front" href="/" title="MSPFA Home" tabIndex={-1} draggable={false} />
				<WealthDungeon />
			</div>
			<FlashyTitle />
		</header>
		<Nav />
	</>
);

export default Header;