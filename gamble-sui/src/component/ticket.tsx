import { ApolloClient, gql, InMemoryCache } from "@apollo/client";
import { useState } from "react";

export default function Ticket() {
  const [ticket, setTicket] = useState(null);
  return (
    <>
      <div className="buy-ticket h-screen w-screen flex flex-col items-center justify-center gap-4 p-4">
        <div className="flex items-center mb-12 flex-col">
          <h1 className="text-3xl font-bold ">Gamble Sui</h1>
          <p className="mb-12">
            Enter the Price Sui would be in the corresponding pool, and grab a
            ticket for results!
          </p>
          <span className="">View pools</span>
        </div>
          {/* <PoolList /> */}
      </div>
    </>
  );
}
