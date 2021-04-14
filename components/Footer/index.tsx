import useSWR from 'swr';
import Stick from 'components/Stick';
import Link from 'components/Link';
import WealthDungeon from 'components/WealthDungeon';
import './styles.module.scss';

type FooterAPIResponse = NonNullable<typeof import('pages/api/images/footer').default['Response']>['body'];

const Footer = () => {
	const footer: FooterAPIResponse | undefined = useSWR('/api/images/footer').data;

	return (
		<>
			<footer>
				<div className="mspface-container">
					{footer && (
						<style jsx global>{`
							footer .mspface {
								background-image: url(/images/footers/${footer.name});
							}
						`}</style>
					)}
					<div className="mspface front" />
					<WealthDungeon />
				</div>
			</footer>
			<div id="legal">
				<span id="copyright">© MS Paint Fan Adventures 2010-{new Date().getFullYear()}</span>
				<Stick nix />
				<Link href="/privacy" target="_blank">Privacy Policy</Link>
				<Stick />
				<Link href="/terms" target="_blank">Terms of Service</Link>
			</div>
		</>
	);
};

export default Footer;