import { graphQLFetcher } from './GQLcli';
import { package_addr } from './package';

const POOL_TYPE = `${package_addr}::suipredict::Pool`;

export interface PoolOnChain {
  objectId: string;
  json: Record<string, any>;
  previousTransaction: string | null;
}

const POOLS_QUERY = `
  query FetchPools($type: String!) {
    objects(filter: { type: $type }, first: 50) {
      nodes {
        address
        asMoveObject {
          contents {
            json
          }
        }
        previousTransaction {
          digest
        }
      }
    }
  }
`;

export async function fetchPoolsFromChain(): Promise<PoolOnChain[]> {
  const data = await graphQLFetcher({
    query: POOLS_QUERY,
    variables: { type: POOL_TYPE },
  });

  const nodes: any[] = data?.objects?.nodes ?? [];
  return nodes
    .map((node: any) => ({
      objectId: node.address as string,
      json: (node.asMoveObject?.contents?.json ?? {}) as Record<string, any>,
      previousTransaction: (node.previousTransaction?.digest ?? null) as string | null,
    }))
    .filter((p) => Boolean(p.objectId));
}
