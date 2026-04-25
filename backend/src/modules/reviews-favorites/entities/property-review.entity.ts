import { ObjectId } from 'mongodb';
import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PropertyReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  HIDDEN = 'hidden',
}

export interface PropertyReviewResponse {
  message: string;
  respondedBy: string;
  respondedAt: Date;
}

@Entity('property_reviews')
export class PropertyReview {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  propertyId!: string;

  @Column()
  authorId!: string;

  @Column()
  rating!: number;

  @Column({ nullable: true })
  title?: string;

  @Column()
  comment!: string;

  @Column({
    type: 'enum',
    enum: PropertyReviewStatus,
    default: PropertyReviewStatus.PENDING,
  })
  status!: PropertyReviewStatus;

  @Column({ nullable: true })
  moderationReason?: string;

  @Column({ nullable: true })
  moderatedBy?: string;

  @Column({ nullable: true })
  moderatedAt?: Date;

  @Column('simple-json', { nullable: true })
  ownerResponse?: PropertyReviewResponse;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  deletedAt?: Date;

  get id(): string {
    return this._id.toHexString();
  }
}
