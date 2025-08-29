import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const buyTicket = (pool, in_coin, pPrice) => {
    const tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::suipredict::buy_ticket`,
        arguments: [
            tx.object(pool),
            tx.object(in_coin),
            tx.pure.u64(pPrice), // need to change type in contract
        ]
    });
    return tx;
};