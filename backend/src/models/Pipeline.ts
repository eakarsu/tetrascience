import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface PipelineAttributes {
  id: string;
  name: string;
  pipelineType: 'ingestion' | 'transformation' | 'export' | 'validation';
  source: string;
  destination: string;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'queued';
  recordsProcessed: number;
  recordsTotal: number;
  startTime: Date | null;
  endTime: Date | null;
  errorMessage: string | null;
  schedule: string | null;
  lastRunDuration: number | null;
  tenantId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PipelineCreationAttributes extends Optional<PipelineAttributes, 'id' | 'recordsProcessed' | 'recordsTotal' | 'startTime' | 'endTime' | 'errorMessage' | 'schedule' | 'lastRunDuration' | 'tenantId' | 'createdAt' | 'updatedAt'> {}

class Pipeline extends Model<PipelineAttributes, PipelineCreationAttributes> implements PipelineAttributes {
  public id!: string;
  public name!: string;
  public pipelineType!: 'ingestion' | 'transformation' | 'export' | 'validation';
  public source!: string;
  public destination!: string;
  public status!: 'running' | 'completed' | 'failed' | 'paused' | 'queued';
  public recordsProcessed!: number;
  public recordsTotal!: number;
  public startTime!: Date | null;
  public endTime!: Date | null;
  public errorMessage!: string | null;
  public schedule!: string | null;
  public lastRunDuration!: number | null;
  public tenantId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Pipeline.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pipelineType: {
      type: DataTypes.ENUM('ingestion', 'transformation', 'export', 'validation'),
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    destination: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('running', 'completed', 'failed', 'paused', 'queued'),
      allowNull: false,
    },
    recordsProcessed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    recordsTotal: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    schedule: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastRunDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'Pipelines',
    timestamps: true,
    underscored: false,
  }
);

export default Pipeline;
