import { describe, it, expect, beforeAll } from "vitest";
import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { registerFormats } from "../../src/utils/formats";
import {
  createErrorDetail,
  isValidationFailedError,
  pathToField,
} from "../../src/utils/validators/validation-errors";
import {
  validateAllSchemas,
  validateSchemaOrThrow,
} from "../../src/utils/validators/validators";

function firstError(schema: ReturnType<typeof Type.Object>, data: unknown) {
  const compiler = TypeCompiler.Compile(schema);
  const error = [...compiler.Errors(data)][0];
  if (!error) throw new Error("expected validation error");
  return error;
}

describe("validation-errors", () => {
  beforeAll(() => {
    registerFormats();
  });

  describe("pathToField", () => {
    it("顶层、嵌套、数组下标", () => {
      expect(pathToField("/email")).toBe("email");
      expect(pathToField("/receiver/name")).toBe("receiver.name");
      expect(pathToField("/orderIds/1")).toBe("orderIds.1");
    });
  });

  describe("createErrorDetail", () => {
    it("透传 TypeBox 原始 message", () => {
      const schema = Type.Object({ email: Type.String({ format: "email" }) });
      const error = firstError(schema, { email: "2212" });
      const detail = createErrorDetail("body", error);

      expect(detail).toMatchObject({
        location: "body",
        path: "/email",
        field: "email",
        message: error.message,
        value: "2212",
      });
      expect(detail.message).toContain("email");
      expect(detail.message).not.toMatch(/[\u4e00-\u9fff]/);
    });
  });
});

describe("嵌套 schema 校验", () => {
  beforeAll(() => {
    registerFormats();
  });

  const InvoiceBodySchema = Type.Object({
    invoiceType: Type.String(),
    email: Type.String({ format: "email" }),
    receiver: Type.Object({
      name: Type.String({ minLength: 1 }),
    }),
    orderIds: Type.Array(Type.String({ minLength: 24 })),
  });

  it("validateSchemaOrThrow 含嵌套 path 与原始 message", () => {
    try {
      validateSchemaOrThrow(InvoiceBodySchema, {
        invoiceType: "personal",
        email: "2212",
        receiver: { name: "" },
        orderIds: ["ok"],
      }, "body");
      expect.fail("应抛出校验错误");
    } catch (err) {
      expect(isValidationFailedError(err)).toBe(true);
      if (!isValidationFailedError(err)) return;

      const emailDetail = err.details.find((d) => d.path === "/email");
      expect(emailDetail?.field).toBe("email");
      expect(emailDetail?.message).toContain("email");

      const nameDetail = err.details.find((d) => d.path === "/receiver/name");
      expect(nameDetail?.field).toBe("receiver.name");

      const orderDetail = err.details.find((d) => d.path === "/orderIds/0");
      expect(orderDetail?.field).toBe("orderIds.0");
    }
  });

  it("validateAllSchemas 合并 body 与 query", () => {
    try {
      validateAllSchemas(
        {
          body: Type.Object({ email: Type.String({ format: "email" }) }),
          query: Type.Object({ page: Type.Number({ minimum: 1 }) }),
        },
        {
          body: { email: "bad" },
          query: { page: 0 },
          params: {},
          headers: {},
          cookies: {},
        },
      );
      expect.fail("应抛出校验错误");
    } catch (err) {
      expect(isValidationFailedError(err)).toBe(true);
      if (!isValidationFailedError(err)) return;

      expect(err.details.some((d) => d.location === "body" && d.field === "email")).toBe(true);
      expect(err.details.some((d) => d.location === "query" && d.field === "page")).toBe(true);
    }
  });
});
