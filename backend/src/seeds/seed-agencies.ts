// ===========================================
// SmartProperty - Agency Seed Script
// ===========================================

import { ObjectId } from 'mongodb';
import { DataSource } from 'typeorm';
import {
  Agency,
  AgencyMember,
} from '../modules/agencies/entities/agency.entity';
import {
  User,
  UserRole,
  UserStatus,
} from '../modules/users/entities/user.entity';

type AgencyTemplate = {
  name: string;
  slug: string;
  region: string;
  description: string;
  phone: string;
  contactEmail: string;
  establishedAt: Date;
  branchManagerIndex: number;
};

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://smartproperty_user:smartproperty_pass_2024@localhost:27017/smartproperty?authSource=admin';

const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'smartproperty';

const agencyTemplates: AgencyTemplate[] = [
  {
    name: 'North Capital Realty',
    slug: 'north-capital-realty',
    region: 'Tunis & Ariana',
    description: 'Urban residential and premium portfolio in the capital area.',
    phone: '+21670001001',
    contactEmail: 'contact@northcapital-realty.tn',
    establishedAt: new Date('2023-01-15T00:00:00.000Z'),
    branchManagerIndex: 0,
  },
  {
    name: 'Coastal Living Agency',
    slug: 'coastal-living-agency',
    region: 'Sousse, Hammamet & Monastir',
    description: 'Coastal rentals, holiday homes, and managed villas.',
    phone: '+21670001002',
    contactEmail: 'contact@coastalliving-agency.tn',
    establishedAt: new Date('2023-07-20T00:00:00.000Z'),
    branchManagerIndex: 1,
  },
];

const normalizeUserId = (user: User): string =>
  user.id || user._id?.toHexString?.() || '';

const pickByIndex = <T>(items: T[], index: number): T | null => {
  if (!items.length) {
    return null;
  }

  return items[index % items.length];
};

const toMember = (user: User): AgencyMember => ({
  userId: normalizeUserId(user),
  role: user.role,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  createdAt: user.createdAt || new Date(),
});

async function seedAgencies() {
  console.log('Starting agency seeding...');

  const dataSource = new DataSource({
    type: 'mongodb',
    url: MONGODB_URI,
    database: MONGODB_DATABASE,
    entities: [Agency, User],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected');

    const agenciesRepository = dataSource.getMongoRepository(Agency);
    const usersRepository = dataSource.getMongoRepository(User);

    const [
      branchManagers,
      realEstateAgents,
      rentalManagers,
      accountants,
      serviceProviders,
      owners,
    ] = await Promise.all([
      usersRepository.find({
        where: {
          role: UserRole.BRANCH_MANAGER,
          status: UserStatus.ACTIVE,
          deletedAt: null as any,
        },
        order: { createdAt: 'ASC' },
      }),
      usersRepository.find({
        where: {
          role: UserRole.REAL_ESTATE_AGENT,
          status: UserStatus.ACTIVE,
          deletedAt: null as any,
        },
        order: { createdAt: 'ASC' },
      }),
      usersRepository.find({
        where: {
          role: UserRole.RENTAL_MANAGER,
          status: UserStatus.ACTIVE,
          deletedAt: null as any,
        },
        order: { createdAt: 'ASC' },
      }),
      usersRepository.find({
        where: {
          role: UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
          status: UserStatus.ACTIVE,
          deletedAt: null as any,
        },
        order: { createdAt: 'ASC' },
      }),
      usersRepository.find({
        where: {
          role: UserRole.SERVICE_PROVIDER,
          status: UserStatus.ACTIVE,
          deletedAt: null as any,
        },
        order: { createdAt: 'ASC' },
      }),
      usersRepository.find({
        where: {
          role: UserRole.OWNER,
          status: UserStatus.ACTIVE,
          deletedAt: null as any,
        },
        order: { createdAt: 'ASC' },
      }),
    ]);

    if (!branchManagers.length) {
      console.log('No active branch managers found. Run seed:users first.');
      await dataSource.destroy();
      return;
    }

    const upsertedAgencyIds: string[] = [];
    const upsertedMemberUserIds = new Set<string>();

    for (const [index, template] of agencyTemplates.entries()) {
      const creator =
        pickByIndex(branchManagers, template.branchManagerIndex) ||
        branchManagers[0];

      const candidateMembers = [
        pickByIndex(realEstateAgents, index),
        pickByIndex(rentalManagers, index),
        pickByIndex(accountants, index),
        pickByIndex(serviceProviders, index),
      ].filter((value): value is User => !!value);

      const membersMap = new Map<string, AgencyMember>();
      candidateMembers.forEach((memberUser) => {
        const member = toMember(memberUser);
        membersMap.set(member.userId, member);
      });

      const now = new Date();
      const existingAgency = await agenciesRepository.findOne({
        where: { slug: template.slug },
      });

      const agencyPayload: Partial<Agency> = {
        name: template.name,
        slug: template.slug,
        region: template.region,
        description: template.description,
        phone: template.phone,
        contactEmail: template.contactEmail,
        establishedAt: template.establishedAt,
        createdBy: normalizeUserId(creator),
        members: Array.from(membersMap.values()),
        updatedAt: now,
      };

      let savedAgency: Agency;
      if (existingAgency) {
        savedAgency = await agenciesRepository.save({
          ...existingAgency,
          ...agencyPayload,
          _id: existingAgency._id,
          createdAt: existingAgency.createdAt || now,
        } as Agency);
      } else {
        savedAgency = await agenciesRepository.save({
          ...agencyPayload,
          _id: new ObjectId(),
          createdAt: now,
        } as Agency);
      }

      upsertedAgencyIds.push(savedAgency.id);
      (savedAgency.members || []).forEach((member) => {
        upsertedMemberUserIds.add(member.userId);
      });
    }

    if (upsertedAgencyIds.length > 0) {
      // Reset owner and operational role agency links, then relink based on seeded agencies.
      await usersRepository.updateMany(
        {
          role: {
            $in: [
              UserRole.OWNER,
              UserRole.REAL_ESTATE_AGENT,
              UserRole.RENTAL_MANAGER,
              UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
              UserRole.SERVICE_PROVIDER,
            ],
          } as any,
        } as any,
        {
          $unset: { agencyId: '' },
          $set: { updatedAt: new Date() },
        } as any,
      );

      const agencyObjectIds = upsertedAgencyIds
        .filter((id) => ObjectId.isValid(id))
        .map((id) => new ObjectId(id));

      const seededAgencies = await agenciesRepository.find({
        where: {
          _id: { $in: agencyObjectIds } as any,
        } as any,
      });

      for (const agency of seededAgencies) {
        const memberIds = (agency.members || []).map((member) => member.userId);

        if (memberIds.length > 0) {
          await usersRepository.updateMany(
            {
              _id: {
                $in: memberIds
                  .filter((id) => ObjectId.isValid(id))
                  .map((id) => new ObjectId(id)),
              } as any,
            } as any,
            {
              $set: {
                agencyId: agency.id,
                updatedAt: new Date(),
              },
            } as any,
          );
        }
      }

      if (owners.length > 0) {
        for (const [index, owner] of owners.entries()) {
          const assignedAgencyId =
            upsertedAgencyIds[index % upsertedAgencyIds.length];
          await usersRepository.updateOne({ _id: owner._id }, {
            $set: {
              agencyId: assignedAgencyId,
              updatedAt: new Date(),
            },
          } as any);
        }
      }
    }

    console.log(
      `Agency seed complete. Upserted agencies: ${upsertedAgencyIds.length}, linked members: ${upsertedMemberUserIds.size}, linked owners: ${owners.length}`,
    );

    await dataSource.destroy();
    console.log('Seeding completed');
  } catch (error) {
    console.error('Error seeding agencies:', error);
    process.exit(1);
  }
}

void seedAgencies();
