import Link from 'components/Link';
import FlashyTitle from 'components/FlashyTitle';
import Nav from 'components/Nav';
import './styles.module.scss';

export type HeaderProps = { noFlashyTitle?: boolean };

const Header = ({ noFlashyTitle }: HeaderProps) => (
	<header>
		<div className="mspface-container">
			<Link className="mspface" href="/" title="MSPFA Home" tabIndex={-1} draggable={false} />
			<div className="wealth-spawner-container" />
		</div>
		{!noFlashyTitle && <FlashyTitle />}
		<Nav />
	</header>
);

export default Header;