import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface InstrumentAttributes {
  id: string;
  name: string;
  instrumentType: 'mass_spec' | 'hplc' | 'nmr' | 'plate_reader' | 'flow_cytometer' | 'sequencer' | 'microscope';
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string | null;
  status: 'online' | 'offline' | 'maintenance' | 'calibrating';
  lastCalibration: Date | null;
  nextCalibration: Date | null;
  dataFormat: string | null;
  integrationStatus: 'connected' | 'disconnected' | 'pending';
  throughputPerDay: number | null;
  tenantId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface InstrumentCreationAttributes extends Optional<InstrumentAttributes, 'id' | 'location' | 'lastCalibration' | 'nextCalibration' | 'dataFormat' | 'throughputPerDay' | 'tenantId' | 'createdAt' | 'updatedAt'> {}

class Instrument extends Model<InstrumentAttributes, InstrumentCreationAttributes> implements InstrumentAttributes {
  public id!: string;
  public name!: string;
  public instrumentType!: 'mass_spec' | 'hplc' | 'nmr' | 'plate_reader' | 'flow_cytometer' | 'sequencer' | 'microscope';
  public manufacturer!: string;
  public model!: string;
  public serialNumber!: string;
  public location!: string | null;
  public status!: 'online' | 'offline' | 'maintenance' | 'calibrating';
  public lastCalibration!: Date | null;
  public nextCalibration!: Date | null;
  public dataFormat!: string | null;
  public integrationStatus!: 'connected' | 'disconnected' | 'pending';
  public throughputPerDay!: number | null;
  public tenantId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Instrument.init(
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
    instrumentType: {
      type: DataTypes.ENUM('mass_spec', 'hplc', 'nmr', 'plate_reader', 'flow_cytometer', 'sequencer', 'microscope'),
      allowNull: false,
    },
    manufacturer: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    serialNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('online', 'offline', 'maintenance', 'calibrating'),
      allowNull: false,
    },
    lastCalibration: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    nextCalibration: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dataFormat: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    integrationStatus: {
      type: DataTypes.ENUM('connected', 'disconnected', 'pending'),
      allowNull: false,
    },
    throughputPerDay: {
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
    tableName: 'Instruments',
    timestamps: true,
    underscored: false,
  }
);

export default Instrument;
