import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface DocumentAttributes {
  id: string;
  title: string;
  documentType: 'protocol' | 'SOP' | 'report' | 'publication' | 'regulatory' | 'patent';
  content: string;
  abstract: string | null;
  authors: string | null;
  department: string | null;
  tags: string | null;
  version: string | null;
  status: 'published' | 'draft' | 'archived' | 'under_review';
  fileSize: number | null;
  format: string | null;
  tenantId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DocumentCreationAttributes extends Optional<DocumentAttributes, 'id' | 'abstract' | 'authors' | 'department' | 'tags' | 'version' | 'fileSize' | 'format' | 'tenantId' | 'createdAt' | 'updatedAt'> {}

class Document extends Model<DocumentAttributes, DocumentCreationAttributes> implements DocumentAttributes {
  public id!: string;
  public title!: string;
  public documentType!: 'protocol' | 'SOP' | 'report' | 'publication' | 'regulatory' | 'patent';
  public content!: string;
  public abstract!: string | null;
  public authors!: string | null;
  public department!: string | null;
  public tags!: string | null;
  public version!: string | null;
  public status!: 'published' | 'draft' | 'archived' | 'under_review';
  public fileSize!: number | null;
  public format!: string | null;
  public tenantId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Document.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    documentType: {
      type: DataTypes.ENUM('protocol', 'SOP', 'report', 'publication', 'regulatory', 'patent'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    abstract: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    authors: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tags: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    version: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('published', 'draft', 'archived', 'under_review'),
      allowNull: false,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    format: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'Documents',
    timestamps: true,
    underscored: false,
  }
);

export default Document;
