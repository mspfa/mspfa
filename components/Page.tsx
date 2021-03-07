import Header from './Header';
import Footer from './Footer';
import './styles/Page.module.scss';

export type PageProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;

const Page = (props: PageProps) => (
	<div id="page">
		<Header />
		<main {...props} />
		<Footer />
	</div>
);
export default Page;