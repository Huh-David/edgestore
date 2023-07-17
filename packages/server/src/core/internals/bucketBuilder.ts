import { z } from 'zod';
import { KeysOfUnion, MaybePromise, Simplify } from '../../types';
import { createPathParamProxy } from './createPathParamProxy';

type Merge<TType, TWith> = {
  [TKey in keyof TType | keyof TWith]?: TKey extends keyof TType
    ? TKey extends keyof TWith
      ? TType[TKey] & TWith[TKey]
      : TType[TKey]
    : TWith[TKey & keyof TWith];
};

type OverwriteIfDefined<TType, TWith> = UnsetMarker extends TType
  ? TWith
  : Simplify<TType & TWith>;

type ConvertStringToFunction<TType> = {
  [K in keyof TType]: TType[K] extends object
    ? Simplify<ConvertStringToFunction<TType[K]>>
    : () => string;
};

type UnionToIntersection<TType> = (
  TType extends any ? (k: TType) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type InferBucketPathKeys<TBucket extends Builder<any, AnyDef>> =
  KeysOfUnion<TBucket['_def']['path'][number]>;

type InferBucketPathKeysFromDef<TDef extends AnyDef> = KeysOfUnion<
  TDef['path'][number]
>;

export type InferMetadataObject<TBucket extends Builder<any, AnyDef>> =
  TBucket['_def']['metadata'] extends (...args: any) => any
    ? Awaited<ReturnType<TBucket['_def']['metadata']>>
    : TBucket['_def']['metadata'] extends ((...args: any) => any) | undefined
    ? any
    : never;

type InferMetadataObjectFromDef<TDef extends AnyDef> =
  TDef['metadata'] extends (...args: any) => any
    ? Awaited<ReturnType<TDef['metadata']>>
    : TDef['metadata'] extends ((...args: any) => any) | undefined
    ? any
    : never;

export type AnyContext = Record<string, string | undefined | null>;

export type AnyInput = z.AnyZodObject;

export type AnyPath = Record<string, () => string>[];

type PathParam<TPath extends AnyPath> = {
  path: keyof UnionToIntersection<TPath[number]>;
};

const unsetMarker = Symbol('unsetMarker');

type UnsetMarker = typeof unsetMarker;

type Conditions<TPath extends AnyPath> = {
  eq?: string | PathParam<TPath>;
  lt?: string | PathParam<TPath>;
  lte?: string | PathParam<TPath>;
  gt?: string | PathParam<TPath>;
  gte?: string | PathParam<TPath>;
  contains?: string | PathParam<TPath>;
  in?: string | PathParam<TPath> | (string | PathParam<TPath>)[];
  not?: string | PathParam<TPath> | Conditions<TPath>;
};

export type AccessControlSchema<TCtx, TDef extends AnyDef> = Merge<
  {
    [TKey in keyof TCtx]?:
      | string
      | PathParam<TDef['path']>
      | Conditions<TDef['path']>;
  },
  {
    OR?: AccessControlSchema<TCtx, TDef>[];
    AND?: AccessControlSchema<TCtx, TDef>[];
    NOT?: AccessControlSchema<TCtx, TDef>[];
  }
>;

type FileInfo = {
  size: number;
  extension: string;
  replaceTargetUrl?: string;
};

type BeforeUploadFn<TCtx, TDef extends AnyDef> = (params: {
  ctx: TCtx;
  input: z.infer<TDef['input']>;
  fileInfo: FileInfo;
}) => MaybePromise<boolean>;

type BeforeDeleteFn<TCtx, TDef extends AnyDef> = (params: {
  ctx: TCtx;
  file: {
    url: string;
    size: number;
    uploadedAt: Date;
    path: {
      [TKey in InferBucketPathKeysFromDef<TDef>]: string;
    };
    metadata: InferMetadataObjectFromDef<TDef>;
  };
}) => MaybePromise<boolean>;

type AnyMetadata = Record<string, string | undefined | null>;

type MetadataFn<
  TCtx,
  TDef extends AnyDef,
  TMetadata extends AnyMetadata,
> = (params: {
  ctx: TCtx;
  input: z.infer<TDef['input']>;
}) => MaybePromise<TMetadata>;

type BucketType = 'IMAGE' | 'FILE';

type Def<TInput extends AnyInput, TPath extends AnyPath> = {
  type: any;
  input: TInput;
  path: TPath;
  metadata?: MetadataFn<any, any, any>;
  accessControl?: AccessControlSchema<any, any>;
  beforeUpload?: BeforeUploadFn<any, any>;
  beforeDelete?: BeforeDeleteFn<any, any>;
};

type AnyDef = Def<any, any>;

type Builder<TCtx, TDef extends AnyDef> = {
  /** only used for types */
  $config: {
    ctx: TCtx;
  };
  /**
   * @internal
   */
  _def: TDef;
  input<TInput extends AnyInput>(
    input: TInput,
  ): Builder<
    TCtx,
    {
      type: TDef['type'];
      input: OverwriteIfDefined<TDef['input'], TInput>;
      path: TDef['path'];
      metadata: TDef['metadata'];
      accessControl: TDef['accessControl'];
      beforeUpload: TDef['beforeUpload'];
      beforeDelete: TDef['beforeDelete'];
    }
  >;
  path<TParams extends AnyPath>(
    pathResolver: (params: {
      ctx: Simplify<ConvertStringToFunction<TCtx>>;
      input: Simplify<ConvertStringToFunction<z.infer<TDef['input']>>>;
    }) => [...TParams],
  ): Builder<
    TCtx,
    {
      type: TDef['type'];
      input: TDef['input'];
      path: TParams;
      metadata: TDef['metadata'];
      accessControl: TDef['accessControl'];
      beforeUpload: TDef['beforeUpload'];
      beforeDelete: TDef['beforeDelete'];
    }
  >;
  metadata<TMetadata extends AnyMetadata>(
    metadata: MetadataFn<TCtx, TDef, TMetadata>,
  ): Builder<
    TCtx,
    {
      type: TDef['type'];
      input: TDef['input'];
      path: TDef['path'];
      metadata: MetadataFn<any, any, TMetadata>;
      accessControl: TDef['accessControl'];
      beforeUpload: TDef['beforeUpload'];
      beforeDelete: TDef['beforeDelete'];
    }
  >;
  accessControl(accessControl: AccessControlSchema<TCtx, TDef>): Builder<
    TCtx,
    {
      type: TDef['type'];
      input: TDef['input'];
      path: TDef['path'];
      metadata: TDef['metadata'];
      accessControl: AccessControlSchema<any, any>;
      beforeUpload: TDef['beforeUpload'];
      beforeDelete: TDef['beforeDelete'];
    }
  >;
  beforeUpload(beforeUpload: BeforeUploadFn<TCtx, TDef>): Builder<
    TCtx,
    {
      type: TDef['type'];
      input: TDef['input'];
      path: TDef['path'];
      metadata: TDef['metadata'];
      accessControl: TDef['accessControl'];
      beforeUpload: BeforeUploadFn<any, any>;
      beforeDelete: TDef['beforeDelete'];
    }
  >;
  beforeDelete(beforeDelete: BeforeDeleteFn<TCtx, TDef>): Builder<
    TCtx,
    {
      type: TDef['type'];
      input: TDef['input'];
      path: TDef['path'];
      metadata: TDef['metadata'];
      accessControl: TDef['accessControl'];
      beforeUpload: TDef['beforeUpload'];
      beforeDelete: BeforeDeleteFn<any, any>;
    }
  >;
};

export type AnyBuilder = Builder<any, AnyDef>;

const createNewBuilder = (initDef: AnyDef, newDef: Partial<AnyDef>) => {
  const mergedDef = {
    ...initDef,
    ...newDef,
  };
  return createBuilder(
    {
      type: mergedDef.type,
    },
    mergedDef,
  );
};

function createBuilder<TCtx, TType extends BucketType>(
  opts: { type: TType },
  initDef?: Partial<AnyDef>,
): Builder<
  TCtx,
  {
    type: TType;
    input: UnsetMarker;
    path: UnsetMarker;
    metadata?: MetadataFn<any, any, any>;
    accessControl?: AccessControlSchema<any, any>;
    beforeUpload?: BeforeUploadFn<any, any>;
    beforeDelete?: BeforeDeleteFn<any, any>;
  }
> {
  const _def: AnyDef = {
    type: opts.type,
    input: z.never(),
    path: [],
    ...initDef,
  };

  return {
    $config: {
      ctx: undefined as TCtx,
    },
    _def,
    input(input) {
      return createNewBuilder(_def, {
        input,
      }) as any;
    },
    path(pathResolver) {
      // TODO: Should throw a runtime error in the followin cases:
      // 1. in case of multiple keys in one object
      // 2. in case of duplicate keys
      const pathParamProxy = createPathParamProxy();
      const params = pathResolver(pathParamProxy);
      return createNewBuilder(_def, {
        path: params,
      }) as any;
    },
    metadata(metadata) {
      return createNewBuilder(_def, {
        metadata,
      }) as any;
    },
    accessControl(accessControl) {
      return createNewBuilder(_def, {
        accessControl: accessControl,
      }) as any;
    },
    beforeUpload(beforeUpload) {
      return createNewBuilder(_def, {
        beforeUpload,
      }) as any;
    },
    beforeDelete(beforeDelete) {
      return createNewBuilder(_def, {
        beforeDelete,
      }) as any;
    },
  };
}

class EdgeStoreBuilder<TCtx = object> {
  context<TNewContext extends AnyContext>() {
    return new EdgeStoreBuilder<TNewContext>();
  }

  create() {
    return createEdgeStoreInner<TCtx>()();
  }
}

export type EdgeStoreRouter<TCtx> = {
  /**
   * Only used for types
   * @internal
   */
  $config: {
    ctx: TCtx;
  };
  buckets: Record<string, Builder<TCtx, AnyDef>>;
};

function createRouterFactory<TCtx>() {
  return function createRouterInner<
    TBuckets extends EdgeStoreRouter<TCtx>['buckets'],
  >(buckets: TBuckets) {
    return {
      $config: {
        ctx: undefined as TCtx,
      },
      buckets,
    } satisfies EdgeStoreRouter<TCtx>;
  };
}

function createEdgeStoreInner<TCtx>() {
  return function initEdgeStoreInner() {
    return {
      /**
       * Builder object for creating an image bucket
       */
      imageBucket: createBuilder<TCtx, 'IMAGE'>({ type: 'IMAGE' }),
      /**
       * Builder object for creating a file bucket
       */
      fileBucket: createBuilder<TCtx, 'FILE'>({ type: 'FILE' }),
      /**
       * Create a router
       */
      router: createRouterFactory<TCtx>(),
    };
  };
}

/**
 * Initialize EdgeStore - be done exactly once per backend
 */
export const initEdgeStore = new EdgeStoreBuilder();

// ↓↓↓ TYPE TESTS ↓↓↓

// type Context = {
//   userId: string;
//   userRole: 'admin' | 'visitor';
// };

// const es = initEdgeStore.context<Context>().create();

// const imagesBucket = es.imageBucket
//   .input(
//     z.object({
//       type: z.enum(['profile', 'post']),
//       extension: z.string().optional(),
//     }),
//   )
//   .path(({ ctx, input }) => [{ author: ctx.userId }, { type: input.type }])
//   .metadata(({ ctx, input }) => ({
//     extension: input.extension,
//     role: ctx.userRole,
//   }))
//   .beforeUpload(() => {
//     return true;
//   });
// const a = es.imageBucket
//   .input(z.object({ type: z.string(), someMeta: z.string().optional() }))
//   .path(({ ctx, input }) => [{ author: ctx.userId }, { type: input.type }])
//   .metadata(({ ctx, input }) => ({
//     role: ctx.userRole,
//     someMeta: input.someMeta,
//   }))
//   .accessControl({
//     OR: [
//       {
//         userId: { path: 'author' }, // this will check if the userId is the same as the author in the path parameter
//       },
//       {
//         userRole: 'admin', // this is the same as { userRole: { eq: "admin" } }
//       },
//     ],
//   })
//   .beforeUpload(({ ctx, input }) => {
//     return true;
//   })
//   .beforeDelete(({ ctx, file }) => {
//     return true;
//   });

// const b = es.imageBucket.path(({ ctx }) => [{ author: ctx.userId }]);

// const router = es.router({
//   original: imagesBucket,
//   imageBucket: a,
//   imageBucket2: b,
// });

// export { router };

// type ListFilesResponse<TBucket extends AnyRouter['buckets'][string]> = {
//   data: {
//     // url: string;
//     // size: number;
//     // uploadedAt: Date;
//     // metadata: InferMetadataObject<TBucket>;
//     path: InferBucketPathKeys<TBucket> extends string ? {
//       [key: string]: string;
//     } :{
//       [TKey in InferBucketPathKeys<TBucket>]: string;
//     };
//   }[];
//   pagination: {
//     currentPage: number;
//     totalPages: number;
//     totalCount: number;
//   };
// };

// type TPathKeys = 'author' | 'type';
// type TPathKeys2 = InferBucketPathKeys<AnyBuilder>;

// type ObjectWithKeys<TKeys extends string> = {
//   [TKey in TKeys]: string;
// };

// type Test1 = ObjectWithKeys<TPathKeys>;
// type Test2 = ObjectWithKeys<TPathKeys2>;
// type PathKeys = InferBucketPathKeys<typeof router.buckets.imageBucket>;

// type MetadataKeys = InferMetadataObject<typeof router.buckets.imageBucket>;

// type MyEdgeStoreRouter = typeof router;

// type MyAccessControl = AccessControlSchema<Context, AnyDef>;