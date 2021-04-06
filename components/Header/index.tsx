import Link from 'components/Link';
import FlashyTitle from 'components/FlashyTitle';
import Nav from 'components/Nav';
import './styles.module.scss';

const Header = () => (
	<>
		<header>
			<div className="mspface-container">
				<Link className="mspface layer-front" href="/" title="MSPFA Home" tabIndex={-1} draggable={false} />
				<div className="wealth-spawner-container" />
			</div>
			<FlashyTitle />
		</header>
		<Nav />
	</>
);

export default Header;