/**
 * 测试用 Schema 定义
 */

import { Type } from "@sinclair/typebox";

// ============================================
// 基础 Schema
// ============================================

/** 用户基础信息 Schema */
export const UserSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  email: Type.String(),
  age: Type.Optional(Type.Number({ minimum: 0, maximum: 150 })),
});

/** 用户创建 Schema */
export const CreateUserSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  email: Type.String({ pattern: "^[^@]+@[^@]+\\.[^@]+$" }),
  age: Type.Optional(Type.Number({ minimum: 0, maximum: 150 })),
  tags: Type.Optional(Type.Array(Type.String())),
});

/** 用户更新 Schema */
export const UpdateUserSchema = Type.Partial(CreateUserSchema);

// ============================================
// 查询参数 Schema
// ============================================

/** 分页查询 Schema */
export const PaginationSchema = Type.Object({
  page: Type.Optional(Type.String()),
  limit: Type.Optional(Type.String()),
  sort: Type.Optional(Type.String()),
  order: Type.Optional(Type.Union([Type.Literal("asc"), Type.Literal("desc")])),
});

/** 搜索查询 Schema */
export const SearchSchema = Type.Object({
  q: Type.Optional(Type.String()),
  fields: Type.Optional(Type.String()),
  filter: Type.Optional(Type.String()),
});

// ============================================
// 路径参数 Schema
// ============================================

/** ID 参数 Schema */
export const IdParamSchema = Type.Object({
  id: Type.String(),
});

/** 多 ID 参数 Schema */
export const MultiIdParamSchema = Type.Object({
  userId: Type.String(),
  postId: Type.String(),
});

// ============================================
// 请求头 Schema
// ============================================

/** 认证头 Schema */
export const AuthHeadersSchema = Type.Object({
  authorization: Type.String(),
  "x-api-key": Type.Optional(Type.String()),
});

/** 通用请求头 Schema */
export const CommonHeadersSchema = Type.Object({
  "user-agent": Type.Optional(Type.String()),
  "content-type": Type.Optional(Type.String()),
  accept: Type.Optional(Type.String()),
});

// ============================================
// 复杂业务 Schema
// ============================================

/** 订单项 Schema */
export const OrderItemSchema = Type.Object({
  productId: Type.String(),
  quantity: Type.Number({ minimum: 1 }),
  price: Type.Number({ minimum: 0 }),
});

/** 订单 Schema */
export const OrderSchema = Type.Object({
  id: Type.Optional(Type.String()),
  userId: Type.String(),
  items: Type.Array(OrderItemSchema),
  totalAmount: Type.Number({ minimum: 0 }),
  status: Type.Union([
    Type.Literal("pending"),
    Type.Literal("processing"),
    Type.Literal("shipped"),
    Type.Literal("delivered"),
    Type.Literal("cancelled"),
  ]),
  createdAt: Type.Optional(Type.String()),
});

/** 批量处理 Schema */
export const BatchProcessSchema = Type.Object({
  items: Type.Array(
    Type.Object({
      id: Type.Number(),
      value: Type.Number(),
      name: Type.String(),
    })
  ),
  operation: Type.Union([
    Type.Literal("sum"),
    Type.Literal("average"),
    Type.Literal("count"),
  ]),
});

// ============================================
// 嵌套对象 Schema
// ============================================

/** 地址 Schema */
export const AddressSchema = Type.Object({
  street: Type.String(),
  city: Type.String(),
  state: Type.String(),
  zipCode: Type.String(),
  country: Type.String(),
});

/** 用户详情 Schema (包含嵌套) */
export const UserDetailSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  email: Type.String(),
  profile: Type.Object({
    bio: Type.Optional(Type.String()),
    avatar: Type.Optional(Type.String()),
    website: Type.Optional(Type.String()),
  }),
  address: Type.Optional(AddressSchema),
  settings: Type.Object({
    theme: Type.Union([Type.Literal("light"), Type.Literal("dark")]),
    notifications: Type.Boolean(),
    language: Type.String(),
  }),
});

// ============================================
// 导出所有 Schema
// ============================================

export const Schemas = {
  // 基础
  User: UserSchema,
  CreateUser: CreateUserSchema,
  UpdateUser: UpdateUserSchema,

  // 查询
  Pagination: PaginationSchema,
  Search: SearchSchema,

  // 参数
  IdParam: IdParamSchema,
  MultiIdParam: MultiIdParamSchema,

  // 请求头
  AuthHeaders: AuthHeadersSchema,
  CommonHeaders: CommonHeadersSchema,

  // 业务
  Order: OrderSchema,
  OrderItem: OrderItemSchema,
  BatchProcess: BatchProcessSchema,

  // 嵌套
  Address: AddressSchema,
  UserDetail: UserDetailSchema,
};

