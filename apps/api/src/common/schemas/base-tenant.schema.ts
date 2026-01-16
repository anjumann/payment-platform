import { Prop, Schema } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * BaseTenantDocument
 * 
 * All tenant-owned entities should extend this class.
 * Provides automatic tenantId tracking and soft delete support.
 * 
 * Why extend this?
 * - Ensures every tenant document has a tenantId
 * - Provides consistent timestamp handling
 * - Enables soft delete across all entities
 * - Works with TenantAwareRepository for automatic filtering
 * 
 * Usage:
 * ```typescript
 * @Schema({ timestamps: true })
 * export class Payment extends BaseTenantDocument {
 *   @Prop({ required: true })
 *   amount: number;
 * }
 * ```
 */
@Schema({ timestamps: true })
export abstract class BaseTenantDocument extends Document {
  /**
   * Reference to the owning tenant
   * Indexed for efficient querying
   * Required on all tenant-owned documents
   */
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  /**
   * Soft delete timestamp
   * When set, document is considered deleted
   * Filtered out by default in TenantAwareRepository
   */
  @Prop({ type: Date, default: null, index: true })
  deletedAt: Date | null;

  /**
   * User who deleted the document
   * Useful for audit trails
   */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  deletedBy?: Types.ObjectId;

  /**
   * Automatic timestamp: Document creation date
   */
  @Prop()
  createdAt: Date;

  /**
   * Automatic timestamp: Last update date
   */
  @Prop()
  updatedAt: Date;

  /**
   * Check if document is soft deleted
   */
  isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}
