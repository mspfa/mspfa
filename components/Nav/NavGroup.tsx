import Delimit from 'components/Delimit';
import Stick from 'components/Stick';

export type NavGroupProps = {
	children: JSX.Element | JSX.Element[],
	id: string
};

const NavGroup = ({ children, id }: NavGroupProps) => (
	<div id={`nav-group-${id}`} className="nav-group">
		<Delimit with={<Stick />}>
			{children}
		</Delimit>
	</div>
);

export default NavGroup;