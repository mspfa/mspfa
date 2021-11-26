import './styles.module.scss';
import IconImage from 'components/IconImage';
import Link from 'components/Link';
import type { PublicUser } from 'lib/client/users';
import BBCode from 'components/BBCode';

export type UserListingProps = {
	children: PublicUser
};

const UserListing = ({ children: publicUser }: UserListingProps) => (
	<div className="listing">
		<Link
			className="listing-icon-container"
			href={`/users/${publicUser.id}`}
			title={publicUser.name}
		>
			<IconImage
				className="listing-icon"
				src={publicUser.icon}
				alt={`${publicUser.name}'s Icon`}
			/>
		</Link>
		<div className="listing-info">
			<Link
				className="listing-title translucent"
				href={`/users/${publicUser.id}`}
				title={publicUser.name}
			>
				{publicUser.name}
			</Link>
			{publicUser.description && (
				<div className="listing-section listing-description translucent">
					<BBCode removeBBTags>
						{publicUser.description}
					</BBCode>
				</div>
			)}
		</div>
	</div>
);

UserListing.listClassName = 'user-list';

export default UserListing;