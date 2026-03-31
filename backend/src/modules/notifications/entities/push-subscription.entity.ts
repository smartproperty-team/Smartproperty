// ===========================================
// SmartProperty - Push Subscription Entity
// ===========================================

import { ObjectId } from 'mongodb';
import { Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';

@Entity('push_subscriptions')
export class PushSubscription {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  userId: ObjectId;

  @Column()
  endpoint: string;

  @Column()
  keys: {
    p256dh: string;
    auth: string;
  };

  @Column({ nullable: true })
  expirationTime?: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
