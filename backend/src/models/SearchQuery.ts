import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface SearchQueryAttributes {
  id: string;
  query: string;
  searchType: 'keyword' | 'semantic' | 'hybrid';
  resultsCount: number;
  clickedResultId: string | null;
  clickPosition: number | null;
  responseTimeMs: number | null;
  precisionAtK: number | null;
  mrr: number | null;
  ndcg: number | null;
  userId: string | null;
  sessionId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SearchQueryCreationAttributes extends Optional<SearchQueryAttributes, 'id' | 'clickedResultId' | 'clickPosition' | 'responseTimeMs' | 'precisionAtK' | 'mrr' | 'ndcg' | 'userId' | 'sessionId' | 'createdAt' | 'updatedAt'> {}

class SearchQuery extends Model<SearchQueryAttributes, SearchQueryCreationAttributes> implements SearchQueryAttributes {
  public id!: string;
  public query!: string;
  public searchType!: 'keyword' | 'semantic' | 'hybrid';
  public resultsCount!: number;
  public clickedResultId!: string | null;
  public clickPosition!: number | null;
  public responseTimeMs!: number | null;
  public precisionAtK!: number | null;
  public mrr!: number | null;
  public ndcg!: number | null;
  public userId!: string | null;
  public sessionId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SearchQuery.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    query: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    searchType: {
      type: DataTypes.ENUM('keyword', 'semantic', 'hybrid'),
      allowNull: false,
    },
    resultsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    clickedResultId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    clickPosition: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    responseTimeMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    precisionAtK: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    mrr: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    ndcg: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'SearchQueries',
    timestamps: true,
    underscored: false,
  }
);

export default SearchQuery;
