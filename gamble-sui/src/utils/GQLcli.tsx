import { getFullnodeUrl } from "@mysten/sui/client";

interface GraphQLFetcherParams {
  query: string;
  variables?: Record<string, any>;
}

// This function can be defined once in a utility file and imported where needed.
export async function graphQLFetcher({ query, variables }: GraphQLFetcherParams) {
  const response = await fetch("https://sui-testnet.mystenlabs.com/graphql", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  const { data, errors } = await response.json();
  if (errors) {
    // You can handle GraphQL-specific errors here
    throw new Error(errors.map((e: any) => e.message).join('\n'));
  }

  return data;
}