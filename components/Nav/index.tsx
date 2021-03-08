import Delimit from '../Delimit';
import Stick from '../Stick';

const Nav = () => (
	<nav>
		<Delimit with={Stick}>
			<span className="test">link 1</span>
			<span>link 2</span>
			<span>link 3</span>
		</Delimit>
	</nav>
);

export default Nav;