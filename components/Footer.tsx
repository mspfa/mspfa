import useSWR from 'swr';

const Footer = () => {
	const footer = useSWR('/api/footer').data;
	return (
		<footer>
			<div className="mspface-container">
				<div className="mspface" style={footer && { backgroundImage: `url(/images/footers/${footer.name})` }} />
				<div className="wealth-spawner-container" />
			</div>
		</footer>
	);
};
export default Footer;