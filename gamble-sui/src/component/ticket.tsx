import { ApolloClient, gql, InMemoryCache } from '@apollo/client';
import { useState } from 'react';
const client = new ApolloClient({
  uri: 'https://sui-testnet.mystenlabs.com/graphql', // or mainnet endpoint
  cache: new InMemoryCache(),
});

export default function Ticket(){
    const [ticket, setTicket] = useState(null);
    setTicket(gql`
        
        `)
    
}