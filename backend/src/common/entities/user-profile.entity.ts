// ===========================================
// User Profile Entity
// ===========================================

import { ObjectId } from 'mongodb';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_profiles')
export class UserProfile {
  @ObjectIdColumn()
  _id: ObjectId;

  @Index('userId_1', { unique: true })
  @Column()
  userId: ObjectId;

  @Column({ nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  occupation: string;

  @Column({ nullable: true })
  income: number;

  @Column({
    nullable: true,
  })
  preferences: {
    propertyTypes?: string[];
    minBudget?: number;
    maxBudget?: number;
    preferredLocations?: string[];
  };

  @Column({
    type: 'array',
    nullable: true,
  })
  documents: Array<{
    type: string; // id_card, passport, proof_of_income, etc.
    url: string;
    verified: boolean;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
