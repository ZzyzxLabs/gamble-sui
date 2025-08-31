import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const redeem = (ticket, pool) => {
    const tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::suipredict::redeem`,
        arguments: [
            tx.object(ticket),
            tx.object(pool)
        ]
    });
    return tx;
};