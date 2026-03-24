import { ObjectId } from 'mongodb';
import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../users/entities/user.entity';

export interface AgencyMember {
  userId: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

@Entity('agencies')
export class Agency {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column({ unique: true })
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column()
  region!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  contactEmail?: string;

  @Column({ nullable: true })
  establishedAt?: Date;

  @Column()
  createdBy!: string;

  @Column('simple-json', { nullable: true })
  members?: AgencyMember[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  deletedAt?: Date;

  get id(): string {
    return this._id.toHexString();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      region: this.region,
      description: this.description,
      phone: this.phone,
      contactEmail: this.contactEmail,
      establishedAt: this.establishedAt,
      createdBy: this.createdBy,
      members: this.members || [],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
