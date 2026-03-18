// ===========================================
// SmartProperty - Property Entity
// ===========================================

import { ObjectId } from 'mongodb';
import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

// ===========================================
// Enums
// ===========================================

export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  CONDO = 'condo',
  STUDIO = 'studio',
  VILLA = 'villa',
  LAND = 'land',
}

export enum PropertyStatus {
  AVAILABLE = 'available',
  RENTED = 'rented',
  MAINTENANCE = 'maintenance',
  UNLISTED = 'unlisted',
}

// ===========================================
// Property Entity
// ===========================================

@Entity('properties')
export class Property {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: PropertyType,
  })
  type!: PropertyType;

  @Column({
    type: 'enum',
    enum: PropertyStatus,
    default: PropertyStatus.AVAILABLE,
  })
  status!: PropertyStatus;

  @Column()
  price!: number;

  @Column({ default: 'USD' })
  currency!: string;

  @Column('simple-json')
  address!: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  @Column('simple-json', { nullable: true })
  features?: {
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    parkingSpaces?: number;
    furnished?: boolean;
    petFriendly?: boolean;
    amenities?: string[];
    availabilityCalendar?: {
      availableFrom?: string;
      availableTo?: string;
    };
  };

  @Column('simple-json', { nullable: true })
  images?: Array<{
    url: string;
    key?: string; // MinIO storage key
    caption?: string;
    isPrimary?: boolean;
    order?: number;
    uploadedAt?: Date;
  }>;

  @Column({ nullable: true })
  virtualTour?: string;

  @Column()
  ownerId!: string;

  @Column({ nullable: true })
  managerId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  deletedAt?: Date;

  // ===========================================
  // Virtual Properties
  // ===========================================

  get id(): string {
    return this._id.toHexString();
  }

  // ===========================================
  // Serialization
  // ===========================================

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      type: this.type,
      status: this.status,
      price: this.price,
      currency: this.currency,
      address: this.address,
      features: this.features,
      images: this.images,
      virtualTour: this.virtualTour,
      ownerId: this.ownerId,
      managerId: this.managerId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
