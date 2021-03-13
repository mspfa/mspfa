import Header from 'components/Header';
import type { HeaderProps } from 'components/Header';
import type { ReactNode } from 'react';
import Footer from 'components/Footer';
import Dialogs from 'components/Dialog/Dialogs';
import './styles.module.scss';

export type PageProps = HeaderProps & { children: ReactNode };

const Page = (props: PageProps) => (
	<>
		<div id="page">
			<Header noFlashyTitle={props.noFlashyTitle} />
			<main>
				{props.children}
			</main>
			<Footer />
		</div>
		<Dialogs />
	</>
);

export default Page;