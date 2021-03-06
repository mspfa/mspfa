import Link from './Link';

const Header = () => (
	<header>
		<div className="mspface-container">
			<Link href="/" title="MSPFA Home" tabIndex={-1}>
				<div className="mspface" />
			</Link>
			<div className="wealth-spawner-container" />
		</div>
	</header>
);
export default Header;