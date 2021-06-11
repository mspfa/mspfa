import './styles.module.scss';

const Stick = ({ nix }: {
	/** Whether this stick is nix's favorite. */
	nix?: boolean
}) => (
	<span
		className="stick"
		title={nix ? 'nix\'s favorite verticle bar as of october 17th, 2018' : undefined}
	/>
);

export default Stick;