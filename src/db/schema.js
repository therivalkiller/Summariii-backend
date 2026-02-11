import { DataTypes } from "sequelize";

/**
 * Define database models
 */
export function defineModels(sequelize) {
  // User model (synced with Clerk)
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      clerkUserId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        field: "clerk_user_id",
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isPaidUser: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_paid_user",
      },
      stripeCustomerId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
        field: "stripe_customer_id",
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
      },
    },
    {
      tableName: "users",
      timestamps: true,
      underscored: true,
    },
  );

  // Feature Unlock model
  const FeatureUnlock = sequelize.define(
    "FeatureUnlock",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        field: "user_id",
      },
      customAIProvider: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "custom_ai_provider",
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
      },
    },
    {
      tableName: "feature_unlocks",
      timestamps: true,
      underscored: true,
    },
  );

  // AI Provider Settings model
  const AIProviderSetting = sequelize.define(
    "AIProviderSetting",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        field: "user_id",
      },
      provider: {
        type: DataTypes.ENUM("gemini", "claude"),
        allowNull: false,
      },
      model: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null, // e.g. 'gemini-1.5-pro'
      },
      encryptedApiKey: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "encrypted_api_key",
      },
      isUserProvided: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_user_provided",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
      },
    },
    {
      tableName: "ai_provider_settings",
      timestamps: true,
      underscored: true,
    },
  );

  // Document model
  const Document = sequelize.define(
    "Document",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        field: "user_id",
      },
      filename: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      originalName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "original_name",
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "file_size",
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "mime_type",
      },
      filePath: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "file_path",
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      chunkCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "chunk_count",
      },
      embeddingProvider: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "embedding_provider",
      },
      status: {
        type: DataTypes.ENUM("processing", "completed", "failed"),
        defaultValue: "processing",
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
      },
    },
    {
      tableName: "documents",
      timestamps: true,
      underscored: true,
    },
  );

  // Payment model
  const Payment = sequelize.define(
    "Payment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        field: "user_id",
      },
      stripePaymentId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        field: "stripe_payment_id",
      },
      stripeSessionId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
        field: "stripe_session_id",
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING,
        defaultValue: "usd",
      },
      status: {
        type: DataTypes.ENUM("pending", "succeeded", "failed"),
        defaultValue: "pending",
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
      },
    },
    {
      tableName: "payments",
      timestamps: true,
      underscored: true,
    },
  );

  // ChatMessage model
const ChatMessage = sequelize.define(
  "ChatMessage",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "documents",
        key: "id",
      },
      field: "document_id",
      onDelete: 'CASCADE', // Delete messages when document is deleted
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      field: "user_id",
    },
    role: {
      type: DataTypes.ENUM("user", "assistant"),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sources: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    confidence: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    error: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
  },
  {
    tableName: "chat_messages",
    timestamps: true,
    underscored: true,
    updatedAt: false, // We don't need updatedAt for chat messages
  }
);

  // Define associations
  User.hasOne(FeatureUnlock, { foreignKey: "userId", as: "features" });
  FeatureUnlock.belongsTo(User, { foreignKey: "userId" });

  User.hasMany(AIProviderSetting, { foreignKey: "userId", as: "aiSettings" });
  AIProviderSetting.belongsTo(User, { foreignKey: "userId" });

  User.hasMany(Document, { foreignKey: "userId", as: "documents" });
  Document.belongsTo(User, { foreignKey: "userId" });

  User.hasMany(Payment, { foreignKey: "userId", as: "payments" });
  Payment.belongsTo(User, { foreignKey: "userId" });

  // Add to existing associations section
Document.hasMany(ChatMessage, { foreignKey: "documentId", as: "chatMessages" });
ChatMessage.belongsTo(Document, { foreignKey: "documentId" });

User.hasMany(ChatMessage, { foreignKey: "userId", as: "messages" });
ChatMessage.belongsTo(User, { foreignKey: "userId" });

  return {
    User,
    FeatureUnlock,
    AIProviderSetting,
    Document,
    Payment,
    ChatMessage,

  };
}

export default defineModels;
