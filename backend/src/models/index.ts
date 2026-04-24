import sequelize from '../config/database';
import User from './User';
import Molecule from './Molecule';
import AssayResult from './AssayResult';
import Document from './Document';
import KnowledgeNode from './KnowledgeNode';
import KnowledgeEdge from './KnowledgeEdge';
import Entity from './Entity';
import Pipeline from './Pipeline';
import Instrument from './Instrument';
import SearchQuery from './SearchQuery';
import Embedding from './Embedding';
import AuditLog from './AuditLog';
import Tenant from './Tenant';
import Role from './Role';

// Associations

// User belongsTo Tenant
User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'users' });

// AssayResult belongsTo Molecule
AssayResult.belongsTo(Molecule, { foreignKey: 'moleculeId', as: 'molecule' });
Molecule.hasMany(AssayResult, { foreignKey: 'moleculeId', as: 'assayResults' });

// KnowledgeEdge belongsTo KnowledgeNode (source and target)
KnowledgeEdge.belongsTo(KnowledgeNode, { foreignKey: 'sourceNodeId', as: 'sourceNode' });
KnowledgeEdge.belongsTo(KnowledgeNode, { foreignKey: 'targetNodeId', as: 'targetNode' });
KnowledgeNode.hasMany(KnowledgeEdge, { foreignKey: 'sourceNodeId', as: 'outgoingEdges' });
KnowledgeNode.hasMany(KnowledgeEdge, { foreignKey: 'targetNodeId', as: 'incomingEdges' });

// Pipeline belongsTo Tenant
Pipeline.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Tenant.hasMany(Pipeline, { foreignKey: 'tenantId', as: 'pipelines' });

// Instrument belongsTo Tenant
Instrument.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Tenant.hasMany(Instrument, { foreignKey: 'tenantId', as: 'instruments' });

// Document belongsTo Tenant
Document.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Tenant.hasMany(Document, { foreignKey: 'tenantId', as: 'documents' });

// AuditLog belongsTo User
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });

// Role belongsTo Tenant
Role.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Tenant.hasMany(Role, { foreignKey: 'tenantId', as: 'roles' });

export {
  sequelize,
  User,
  Molecule,
  AssayResult,
  Document,
  KnowledgeNode,
  KnowledgeEdge,
  Entity,
  Pipeline,
  Instrument,
  SearchQuery,
  Embedding,
  AuditLog,
  Tenant,
  Role,
};

export default sequelize;
